import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

type ChatbotRequest = { message: string; page?: string; stream?: boolean };

type ChatbotResponse = { answer: string; sources?: string[] };

function clampMessage(raw: unknown) {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v.length === 0) return { ok: false as const, error: "Message is required" };
  if (v.length > 1200) return { ok: false as const, error: "Message is too long" };
  return { ok: true as const, value: v };
}

function wantsStream(req: NextRequest, body: ChatbotRequest) {
  if (body.stream === true) return true;
  const accept = req.headers.get("accept") || "";
  return accept.includes("text/event-stream");
}

function chunkText(text: string) {
  const out: string[] = [];
  const normalized = text.replace(/\r\n/g, "\n");
  // Chunk by ~40 chars keeping words together when possible.
  const parts = normalized.split(/(\s+)/);
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > 40 && buf.trim().length > 0) {
      out.push(buf);
      buf = p;
    } else {
      buf += p;
    }
  }
  if (buf.length) out.push(buf);
  return out;
}

function toSseEvent(event: string, data: unknown) {
  const payload = JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

function sseResponse({ answer, sources }: ChatbotResponse) {
  const encoder = new TextEncoder();
  const chunks = chunkText(answer);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(toSseEvent("meta", { sources: sources ?? [] })));
      for (const delta of chunks) {
        controller.enqueue(encoder.encode(toSseEvent("delta", { delta })));
      }
      controller.enqueue(encoder.encode(toSseEvent("done", {})));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function clientIp(req: NextRequest) {
  // Best-effort. Behind proxies/CDNs, x-forwarded-for may contain a list.
  const xf = req.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

function wantsPersonalOrderInfo(s: string) {
  return /(my\s+order|track\s+my\s+order|where\s+is\s+my\s+order|my\s+return|my\s+refund)/i.test(s);
}

function extractLikelyId(s: string) {
  // Order IDs are cuid() strings in this project; this is a safe-ish heuristic.
  const m = /\b[a-z0-9]{20,40}\b/i.exec(s);
  return m?.[0] ?? null;
}

function extractPriceHints(s: string): { max?: number; min?: number } {
  const t = s.replace(/,/g, "");
  const under = /(?:under|below|less\s+than)\s*(?:₹|rs\.?\s*)?(\d{2,7})/i.exec(t);
  if (under) return { max: Number(under[1]) };
  const above = /(?:above|over|more\s+than)\s*(?:₹|rs\.?\s*)?(\d{2,7})/i.exec(t);
  if (above) return { min: Number(above[1]) };
  const between = /between\s*(?:₹|rs\.?\s*)?(\d{2,7})\s*(?:and|to)\s*(?:₹|rs\.?\s*)?(\d{2,7})/i.exec(t);
  if (between) return { min: Number(between[1]), max: Number(between[2]) };
  return {};
}

function extractKeywords(s: string) {
  const stop = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "for",
    "with",
    "in",
    "on",
    "at",
    "is",
    "are",
    "was",
    "were",
    "i",
    "me",
    "my",
    "you",
    "your",
    "about",
    "need",
    "help",
    "please",
    "can",
    "could",
    "do",
    "does",
    "it",
    "this",
    "that",
    "what",
    "how",
    "where",
    "when",
  ]);

  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t))
    .slice(0, 6);
}

let cachedHelp: { text: string; sections: Record<string, string> } | null = null;

async function loadHelp() {
  if (cachedHelp) return cachedHelp;

  const fullPath = path.join(process.cwd(), "src", "content", "help.md");
  const text = await readFile(fullPath, "utf8");

  const sections: Record<string, string> = {};
  let current = "";
  for (const line of text.split(/\r?\n/)) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      current = m[1].trim();
      sections[current] = "";
      continue;
    }
    if (current) sections[current] += line + "\n";
  }

  cachedHelp = { text, sections };
  return cachedHelp;
}

function pickHelpSection(help: Awaited<ReturnType<typeof loadHelp>>, intent: string) {
  const map: Record<string, string> = {
    shipping: "Shipping",
    returns: "Returns & Refunds",
    refunds: "Returns & Refunds",
    coupons: "Coupons",
    vendor: "Vendor Apply & KYC",
    contact: "Contact & Support",
    tracking: "Orders & Tracking",
    troubleshooting: "Troubleshooting",
  };
  const key = map[intent];
  if (!key) return null;
  const body = help.sections[key];
  if (!body) return null;
  return { title: key, body: body.trim() };
}

function detectIntent(s: string) {
  const t = normalize(s);
  if (/(track|tracking)\b.*\border\b/.test(t)) return "tracking";
  if (/(return|refund|exchange)\b/.test(t)) return "returns";
  if (/(ship|shipping|delivery|dispatch)\b/.test(t)) return "shipping";
  if (/(coupon|promo|discount|offer)\b/.test(t)) return "coupons";
  if (/(vendor|seller|kyc|apply)\b/.test(t)) return "vendor";
  if (/(contact|support|ticket|helpdesk|complaint)\b/.test(t)) return "contact";
  if (/(login|password|otp|checkout|cart|payment)\b/.test(t)) return "troubleshooting";
  if (/(product|price|category|categories|brand)\b/.test(t)) return "products";
  if (/(privacy|terms|policy|policies)\b/.test(t)) return "policies";
  return "general";
}

function formatMoneyInr(value: number) {
  if (!Number.isFinite(value)) return "";
  return `₹${value.toFixed(2)}`;
}

function formatMoney(currency: string, value: number) {
  if (!Number.isFinite(value)) return "";
  if (currency === "USD") return `$${value.toFixed(2)}`;
  return formatMoneyInr(value);
}

async function getGrounding({ message, userId }: { message: string; userId?: string | null }) {
  const intent = detectIntent(message);
  const keywords = extractKeywords(message);
  const priceHints = extractPriceHints(message);
  const likelyId = extractLikelyId(message);

  const sources: string[] = [];

  const help = await loadHelp();
  const helpSection = pickHelpSection(help, intent);
  if (helpSection) sources.push(`help.md: ${helpSection.title}`);

  const [categories, coupons] = await Promise.all([
    prisma.category.findMany({
      where: { isHidden: false },
      select: { id: true, name: true, slug: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take: 20,
    }),
    prisma.coupon.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: new Date() } }] },
          { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
        ],
      },
      select: { code: true, type: true, value: true, minOrderAmount: true, maxDiscountAmount: true },
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const cmsPages = await prisma.cmsPage.findMany({
    where: {
      OR: [
        ...(keywords.length
          ? keywords.map((k) => ({
              OR: [{ slug: { contains: k } }, { title: { contains: k } }],
            }))
          : []),
        ...(intent === "policies" || intent === "returns" || intent === "shipping"
          ? [{ slug: { in: ["privacy", "terms", "return", "returns", "refund", "shipping", "contact"] } }]
          : []),
      ],
    },
    select: { slug: true, title: true, content: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  const contentPages = await prisma.contentPage.findMany({
    where: {
      OR: keywords.length
        ? keywords.map((k) => ({
            OR: [{ slug: { contains: k } }, { title: { contains: k } }],
          }))
        : undefined,
    },
    select: { slug: true, title: true, body: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  if (cmsPages.length) sources.push("DB: CmsPage");
  if (contentPages.length) sources.push("DB: ContentPage");

  // Category-aware product search: if user mentions a category name, prefer that.
  const normalized = normalize(message);
  const matchedCategory = categories.find((c) => normalized.includes(normalize(c.name)));
  const matchedCategoryId = matchedCategory?.id;

  const products = keywords.length || matchedCategoryId || priceHints.min != null || priceHints.max != null
    ? await prisma.product.findMany({
        where: {
          isActive: true,
          ...(matchedCategoryId ? { categoryId: matchedCategoryId } : {}),
          ...(keywords.length
            ? {
                OR: keywords.map((k) => ({
                  title: { contains: k },
                })),
              }
            : {}),
          ...(priceHints.min != null || priceHints.max != null
            ? {
                price: {
                  ...(priceHints.min != null ? { gte: priceHints.min } : {}),
                  ...(priceHints.max != null ? { lte: priceHints.max } : {}),
                },
              }
            : {}),
        },
        select: {
          title: true,
          slug: true,
          currency: true,
          price: true,
          salePrice: true,
          categoryId: true,
        },
        take: 6,
        orderBy: { updatedAt: "desc" },
      })
    : [];

  if (categories.length) sources.push("DB: Category");
  if (coupons.length) sources.push("DB: Coupon");
  if (products.length) sources.push("DB: Product");

  let userContext: {
    ordersCount?: number;
    lastOrder?: { id: string; status: string; createdAt: Date } | null;
    orderById?: {
      id: string;
      status: string;
      createdAt: Date;
      total: number;
      itemsCount: number;
      returnRequestsCount: number;
    } | null;
    activeReturnsCount?: number;
  } | null = null;

  if (userId) {
    const [ordersCount, lastOrder, activeReturnsCount, orderById] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.findFirst({
        where: { userId },
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.returnRequest.count({ where: { userId, status: { in: ["REQUESTED", "APPROVED", "PICKED", "PICKUP_SCHEDULED"] } } }),
      likelyId
        ? prisma.order
            .findFirst({
              where: { id: likelyId, userId },
              select: {
                id: true,
                status: true,
                createdAt: true,
                total: true,
                _count: { select: { items: true, returnRequests: true } },
              },
            })
            .then((o) =>
              o
                ? {
                    id: o.id,
                    status: String(o.status),
                    createdAt: o.createdAt,
                    total: Number(o.total),
                    itemsCount: o._count.items,
                    returnRequestsCount: o._count.returnRequests,
                  }
                : null,
            )
        : Promise.resolve(null),
    ]);
    userContext = { ordersCount, lastOrder, activeReturnsCount, orderById };
    sources.push("DB: Order (self)");
    sources.push("DB: ReturnRequest (self)");
  }

  return { intent, keywords, helpSection, categories, coupons, products, cmsPages, contentPages, userContext, sources, priceHints, matchedCategory };
}

function deterministicAnswer(args: Awaited<ReturnType<typeof getGrounding>> & { message: string; isLoggedIn: boolean }) {
  const { intent, helpSection, categories, coupons, products, cmsPages, contentPages, userContext, message, isLoggedIn, matchedCategory } = args;

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name] as const));

  if (wantsPersonalOrderInfo(message) && !isLoggedIn) {
    return {
      answer:
        "To help with your personal order/return details, please log in first. Once logged in, go to Account → Orders to track status, or tell me what you need help with (shipping/returns/coupons) for general guidance.",
      sources: helpSection ? [`help.md: ${helpSection.title}`] : undefined,
    };
  }

  if (intent === "tracking") {
    if (!isLoggedIn) {
      return {
        answer:
          "You can track an order from Account → Orders after logging in. If you’re not logged in, I can still explain shipping and tracking timelines, but I can’t access personal order status.",
        sources: helpSection ? [`help.md: ${helpSection.title}`] : undefined,
      };
    }

    const last = userContext?.lastOrder;
    const byId = userContext?.orderById;
    const count = userContext?.ordersCount ?? 0;
    const returns = userContext?.activeReturnsCount ?? 0;

    const lines = [
      `You have ${count} order(s) on Bohosaaz.`,
      byId
        ? `Order ${byId.id}: status=${byId.status}, total=${formatMoneyInr(byId.total)}, items=${byId.itemsCount}, returnRequests=${byId.returnRequestsCount}.`
        : null,
      last ? `Your latest order is ${last.id} with status: ${String(last.status)}.` : "I couldn’t find a recent order in your account.",
      returns ? `You also have ${returns} active return request(s).` : "You have no active return requests right now.",
      "For full tracking details, open Account → Orders and select the order to view shipment updates.",
    ].filter(Boolean) as string[];

    return { answer: lines.join("\n"), sources: args.sources };
  }

  if (intent === "returns" || intent === "shipping" || intent === "coupons" || intent === "vendor" || intent === "contact" || intent === "troubleshooting" || intent === "policies") {
    const body = helpSection?.body;
    const cms = cmsPages?.[0];
    const content = contentPages?.[0];
    const extra = (() => {
      if (intent === "coupons" && coupons.length) {
        const top = coupons.slice(0, 5).map((c) => {
          const type = String(c.type);
          const v = type === "PERCENT" ? `${c.value}%` : formatMoneyInr(Number(c.value));
          const min = c.minOrderAmount != null ? ` (min ${formatMoneyInr(Number(c.minOrderAmount))})` : "";
          return `- ${c.code}: ${v}${min}`;
        });
        return `\n\nActive coupons (subject to validity/limits):\n${top.join("\n")}`;
      }
      return "";
    })();

    const pageHint = (() => {
      const picked = cms
        ? { title: cms.title, slug: cms.slug, text: cms.content }
        : content
          ? { title: content.title, slug: content.slug, text: content.body }
          : null;
      if (!picked) return "";
      const snippet = picked.text
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 420);
      return `\n\nFrom “${picked.title}” (/ ${picked.slug}):\n${snippet}${picked.text.length > snippet.length ? "…" : ""}`;
    })();

    return {
      answer: body ? `${body.trim()}${extra}${pageHint}` : `I can help—what exactly do you want to know?${pageHint}`,
      sources: args.sources,
    };
  }

  if (intent === "products") {
    const lines: string[] = [];

    if (products.length) {
      lines.push(
        matchedCategory ? `Here are a few products in “${matchedCategory.name}”:` : "Here are a few matching products:",
      );
      for (const p of products.slice(0, 5)) {
        const price = p.salePrice ?? p.price;
        const catName = categoryNameById.get(p.categoryId) ?? "Category";
        lines.push(`- ${p.title} (${catName}) — from ${formatMoney(String(p.currency), Number(price))} — /p/${p.slug}`);
      }
    } else {
      lines.push(
        "Tell me what you’re looking for (name, category, price range). I can search products by title/category keywords.",
      );
    }

    if (categories.length) {
      lines.push("\nPopular categories:");
      lines.push(categories.slice(0, 10).map((c) => `- ${c.name} — /${c.slug}`).join("\n"));
    }

    return { answer: lines.join("\n"), sources: args.sources };
  }

  // General fallback
  return {
    answer:
      "I can help with products, shipping, returns/refunds, coupons, vendor onboarding, and basic troubleshooting. What would you like to know?",
    sources: args.sources,
  };
}

async function openAiAnswer({
  message,
  page,
  grounding,
}: {
  message: string;
  page?: string;
  grounding: Awaited<ReturnType<typeof getGrounding>>;
}): Promise<ChatbotResponse | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const categoryNameById = new Map(grounding.categories.map((c) => [c.id, c.name] as const));

  const helpBlock = grounding.helpSection
    ? `Help (${grounding.helpSection.title}):\n${grounding.helpSection.body}\n`
    : "";

  const cmsBlock = grounding.cmsPages?.length
    ? `CMS Pages (snippets):\n${grounding.cmsPages
        .map((p) => `- ${p.title} | slug=${p.slug} | content=${p.content.replace(/\s+/g, " ").trim().slice(0, 400)}${p.content.length > 400 ? "…" : ""}`)
        .join("\n")}\n`
    : "";

  const contentPagesBlock = grounding.contentPages?.length
    ? `Content Pages (snippets):\n${grounding.contentPages
        .map((p) => `- ${p.title} | slug=${p.slug} | body=${p.body.replace(/\s+/g, " ").trim().slice(0, 400)}${p.body.length > 400 ? "…" : ""}`)
        .join("\n")}\n`
    : "";

  const productsBlock = grounding.products.length
    ? `Products (top matches):\n${grounding.products
        .slice(0, 6)
        .map((p) =>
          `- ${p.title} | slug=${p.slug} | category=${categoryNameById.get(p.categoryId) ?? ""} | currency=${String(p.currency)} | price=${p.price} | salePrice=${p.salePrice ?? ""}`,
        )
        .join("\n")}\n`
    : "";

  const couponsBlock = grounding.coupons.length
    ? `Coupons (active):\n${grounding.coupons
        .slice(0, 8)
        .map((c) => `- ${c.code} | type=${String(c.type)} | value=${c.value} | min=${c.minOrderAmount ?? ""} | maxDiscount=${c.maxDiscountAmount ?? ""}`)
        .join("\n")}\n`
    : "";

  const categoriesBlock = grounding.categories.length
    ? `Categories:\n${grounding.categories
        .slice(0, 20)
        .map((c) => `- ${c.name} | slug=${c.slug}`)
        .join("\n")}\n`
    : "";

  const userBlock = grounding.userContext
    ? `UserContext (safe): ordersCount=${grounding.userContext.ordersCount ?? 0}, lastOrder=${
        grounding.userContext.lastOrder ? `${grounding.userContext.lastOrder.id}:${grounding.userContext.lastOrder.status}` : "none"
      }, activeReturnsCount=${grounding.userContext.activeReturnsCount ?? 0}, orderById=${
        grounding.userContext.orderById ? `${grounding.userContext.orderById.id}:${grounding.userContext.orderById.status}` : "none"
      }`
    : "UserContext: not logged in";

  const context = [helpBlock, categoriesBlock, productsBlock, couponsBlock, cmsBlock, contentPagesBlock, userBlock]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "You are Bohosaaz's website assistant. Answer concisely and helpfully using ONLY the provided context. If the user asks for personal order/return/refund details and UserContext indicates not logged in, tell them to log in; do not guess. Never reveal secrets or other users' data.",
        },
        {
          role: "user",
          content: `Page: ${page || "/"}\nUser message: ${message}\n\nContext:\n${context}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  return { answer: content, sources: grounding.sources };
}

async function openAiStreamResponse({
  message,
  page,
  grounding,
}: {
  message: string;
  page?: string;
  grounding: Awaited<ReturnType<typeof getGrounding>>;
}): Promise<Response | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const categoryNameById = new Map(grounding.categories.map((c) => [c.id, c.name] as const));

  const helpBlock = grounding.helpSection
    ? `Help (${grounding.helpSection.title}):\n${grounding.helpSection.body}\n`
    : "";

  const productsBlock = grounding.products.length
    ? `Products (top matches):\n${grounding.products
        .slice(0, 6)
        .map(
          (p) =>
            `- ${p.title} | slug=${p.slug} | category=${categoryNameById.get(p.categoryId) ?? ""} | currency=${String(p.currency)} | price=${p.price} | salePrice=${p.salePrice ?? ""}`,
        )
        .join("\n")}\n`
    : "";

  const couponsBlock = grounding.coupons.length
    ? `Coupons (active):\n${grounding.coupons
        .slice(0, 8)
        .map(
          (c) =>
            `- ${c.code} | type=${String(c.type)} | value=${c.value} | min=${c.minOrderAmount ?? ""} | maxDiscount=${c.maxDiscountAmount ?? ""}`,
        )
        .join("\n")}\n`
    : "";

  const categoriesBlock = grounding.categories.length
    ? `Categories:\n${grounding.categories
        .slice(0, 20)
        .map((c) => `- ${c.name} | slug=${c.slug}`)
        .join("\n")}\n`
    : "";

  const cmsBlock = grounding.cmsPages?.length
    ? `CMS Pages (snippets):\n${grounding.cmsPages
        .map(
          (p) =>
            `- ${p.title} | slug=${p.slug} | content=${p.content.replace(/\s+/g, " ").trim().slice(0, 400)}${p.content.length > 400 ? "…" : ""}`,
        )
        .join("\n")}\n`
    : "";

  const contentPagesBlock = grounding.contentPages?.length
    ? `Content Pages (snippets):\n${grounding.contentPages
        .map(
          (p) =>
            `- ${p.title} | slug=${p.slug} | body=${p.body.replace(/\s+/g, " ").trim().slice(0, 400)}${p.body.length > 400 ? "…" : ""}`,
        )
        .join("\n")}\n`
    : "";

  const userBlock = grounding.userContext
    ? `UserContext (safe): ordersCount=${grounding.userContext.ordersCount ?? 0}, lastOrder=${
        grounding.userContext.lastOrder ? `${grounding.userContext.lastOrder.id}:${grounding.userContext.lastOrder.status}` : "none"
      }, activeReturnsCount=${grounding.userContext.activeReturnsCount ?? 0}, orderById=${
        grounding.userContext.orderById ? `${grounding.userContext.orderById.id}:${grounding.userContext.orderById.status}` : "none"
      }`
    : "UserContext: not logged in";

  const context = [helpBlock, categoriesBlock, productsBlock, couponsBlock, cmsBlock, contentPagesBlock, userBlock]
    .filter(Boolean)
    .join("\n");

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 450,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are Bohosaaz's website assistant. Answer concisely and helpfully using ONLY the provided context. If the user asks for personal order/return/refund details and UserContext indicates not logged in, tell them to log in; do not guess. Never reveal secrets or other users' data.",
        },
        {
          role: "user",
          content: `Page: ${page || "/"}\nUser message: ${message}\n\nContext:\n${context}`,
        },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) return null;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit sources upfront.
      controller.enqueue(encoder.encode(toSseEvent("meta", { sources: grounding.sources ?? [] })));

      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // OpenAI stream is SSE with lines like: data: {...}\n\n
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);

            const lines = frame.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice("data:".length).trim();
              if (!data) continue;
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode(toSseEvent("done", {})));
                controller.close();
                return;
              }

              try {
                const payload: unknown = JSON.parse(data);
                const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
                const choices = Array.isArray(obj?.choices) ? (obj!.choices as unknown[]) : [];
                const first = choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>) : null;
                const deltaObj = first?.delta && typeof first.delta === "object" ? (first.delta as Record<string, unknown>) : null;
                const delta = typeof deltaObj?.content === "string" ? deltaObj.content : "";
                if (delta) controller.enqueue(encoder.encode(toSseEvent("delta", { delta })));
              } catch {
                // ignore malformed upstream chunks
              }
            }
          }
        }

        controller.enqueue(encoder.encode(toSseEvent("done", {})));
        controller.close();
      } catch {
        controller.enqueue(encoder.encode(toSseEvent("done", {})));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit(`chatbot:${ip}`);
  if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: ChatbotRequest;
  try {
    body = (await req.json()) as ChatbotRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const m = clampMessage(body.message);
  if (!m.ok) return NextResponse.json({ error: m.error }, { status: 400 });

  const user = await requireUser();
  const userId = user?.id ?? null;

  const grounding = await getGrounding({ message: m.value, userId });

  // Stream directly from OpenAI (token streaming) when enabled.
  if (wantsStream(req, body) && process.env.OPENAI_API_KEY) {
    const streamed = await openAiStreamResponse({ message: m.value, page: body.page, grounding });
    if (streamed) return streamed;
  }

  // If OpenAI is configured, use it for better phrasing while still grounding.
  const ai = await openAiAnswer({ message: m.value, page: body.page, grounding });
  if (ai) {
    const payload = ai satisfies ChatbotResponse;
    return wantsStream(req, body) ? sseResponse(payload) : NextResponse.json(payload);
  }

  const det = deterministicAnswer({ ...grounding, message: m.value, isLoggedIn: !!userId });
  const payload = det satisfies ChatbotResponse;
  return wantsStream(req, body) ? sseResponse(payload) : NextResponse.json(payload);
}
