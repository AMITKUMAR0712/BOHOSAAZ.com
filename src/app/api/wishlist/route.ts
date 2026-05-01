import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const bodySchema = z.object({
  productId: z.string().trim().min(1),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  const wantCount = url.searchParams.get("count") === "1";

  const user = await requireUser();
  if (!user) {
    if (productId) return Response.json({ wished: false });
    if (wantCount) return Response.json({ ok: true, count: 0 });
    return Response.json({ ok: true, items: [] });
  }

  try {
    if (productId) {
      const item = await prisma.wishlistItem.findUnique({
        where: { userId_productId: { userId: user.id, productId } },
        select: { id: true },
      });
      return Response.json({ wished: Boolean(item) });
    }

    if (wantCount) {
      const count = await prisma.wishlistItem.count({ where: { userId: user.id } });
      return Response.json({ ok: true, count });
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            images: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
            vendor: { select: { id: true, shopName: true, logoUrl: true } },
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return Response.json({ ok: true, items });
  } catch (e: unknown) {
    console.error("[api/wishlist] GET failed:", e);
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;

    // Prisma P2021: table does not exist
    if (code === "P2021") {
      if (productId) return Response.json({ wished: false });
      if (wantCount) return Response.json({ ok: true, count: 0 });
      return Response.json({ ok: true, items: [], warning: "Database tables missing." });
    }

    return Response.json({ error: "Internal server error", details: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) return Response.json({ error: "Product not found" }, { status: 404 });

  try {
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      create: { userId: user.id, productId: product.id },
      update: {},
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    if (code === "P2021") {
      return Response.json(
        { error: "Wishlist is not available until database migrations are applied." },
        { status: 503 },
      );
    }
    throw e;
  }

  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });

  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: user.id, productId: parsed.data.productId },
    });
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e && typeof (e as { code?: unknown }).code === "string"
        ? (e as { code: string }).code
        : undefined;
    if (code === "P2021") {
      return Response.json(
        { error: "Wishlist is not available until database migrations are applied." },
        { status: 503 },
      );
    }
    throw e;
  }

  return Response.json({ ok: true });
}
