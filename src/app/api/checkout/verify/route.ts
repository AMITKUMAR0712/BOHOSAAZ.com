import { POST as razorpayVerify } from "../razorpay/verify/route";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeMethod(input: unknown): "RAZORPAY" | "COD" | "WALLET" | null {
  if (input == null) return null;
  if (typeof input !== "string") return null;
  const upper = input.trim().toUpperCase();
  if (upper === "COD") return "COD";
  if (upper === "WALLET") return "WALLET";
  if (upper === "RAZORPAY") return "RAZORPAY";
  return null;
}

export async function POST(req: Request) {
  // Read from a clone so the original body remains available for Razorpay verify.
  const cloned = req.clone();
  const body = await cloned.json().catch(() => null);
  const paymentMethod = isRecord(body) ? (body.paymentMethod ?? body.method) : undefined;
  const method = normalizeMethod(paymentMethod);

  // For non-Razorpay methods, there is nothing to verify.
  if (method === "COD" || method === "WALLET") {
    return Response.json({ ok: true, skipped: true });
  }

  // Default: Razorpay verification
  return razorpayVerify(req);
}
