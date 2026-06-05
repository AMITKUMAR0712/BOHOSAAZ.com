import { NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { POST as razorpayCreate } from "../razorpay/create/route";
import { POST as codCreate } from "../cod/route";
import { POST as walletCreate } from "../wallet/route";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeMethod(input: unknown): "RAZORPAY" | "COD" | "WALLET" {
  const raw = typeof input === "string" ? input : "";
  const upper = raw.trim().toUpperCase();
  if (upper === "COD") return "COD";
  if (upper === "WALLET") return "WALLET";
  return "RAZORPAY";
}

function forwardAsNextRequest(original: NextRequest, body: unknown): NextRequest {
  const headers = new Headers(original.headers);
  // Ensure the body can be re-read by the downstream handler.
  headers.delete("content-length");
  if (!headers.get("content-type")) headers.set("content-type", "application/json");

  return new NextRequest(original.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const paymentMethod = isRecord(body) ? (body.paymentMethod ?? body.method) : undefined;
    const method = normalizeMethod(paymentMethod);

    if (method === "RAZORPAY") {
      const token = req.cookies.get("token")?.value;
      if (!token) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      let payload: JwtPayload;
      try {
        payload = verifyToken(token);
      } catch {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const order = await prisma.order.findFirst({
        where: { userId: payload.sub, status: "PENDING" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!order?.items.length) {
        return Response.json({ error: "Cart is empty" }, { status: 400 });
      }
    }

    const forwardReq = forwardAsNextRequest(req, body);

    switch (method) {
      case "COD":
        return await codCreate(forwardReq);
      case "WALLET":
        return await walletCreate(forwardReq);
      case "RAZORPAY":
      default:
        return await razorpayCreate(forwardReq);
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    console.error("/api/checkout/create error", e);
    return Response.json({ error: message }, { status: 500 });
  }
}
