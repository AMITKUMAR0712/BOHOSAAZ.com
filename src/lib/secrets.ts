import crypto from "crypto";
import { env, isProd } from "@/lib/env";

function nonEmpty(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

function warnOnce(message: string) {
  if (isProd) return;
  const key = `__bohosaaz_secret_warn__:${message}`;
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[key]) return;
  g[key] = true;
  console.warn(message);
}

function unauthorized(message = "Unauthorized") {
  return Response.json({ error: message }, { status: 401 });
}

export function requireCronSecret(req: Request): Response | null {
  const secret = env.CRON_SECRET;
  if (!nonEmpty(secret)) {
    if (isProd) return unauthorized("CRON_SECRET is not configured");
    warnOnce("⚠️  [secrets] CRON_SECRET missing; allowing cron request in dev.");
    return null;
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return unauthorized();
  return null;
}

function timingSafeEqualStr(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function normalizeCourierSignatureHeader(v: string) {
  const raw = v.trim();
  // common patterns: "sha256=<hex>", "<hex>", "<base64>"
  if (raw.startsWith("sha256=")) return raw.slice("sha256=".length);
  return raw;
}

function computeHmacSha256Hex(secret: string, body: string) {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/**
 * Verifies Courier webhook authentication.
 *
 * Supported:
 * - Backwards compatible Bearer auth: Authorization: Bearer <COURIER_WEBHOOK_SECRET>
 * - HMAC signature header: X-Courier-Signature: sha256=<hex>
 *
 * Dev behavior:
 * - If COURIER_WEBHOOK_SECRET is missing, allows the request and logs a warning.
 *
 * Prod behavior:
 * - Enforces secret presence and request auth.
 */
export async function verifyCourierSignature(req: Request): Promise<Response | null> {
  const secret = env.COURIER_WEBHOOK_SECRET;
  if (!nonEmpty(secret)) {
    if (isProd) return unauthorized("COURIER_WEBHOOK_SECRET is not configured");
    warnOnce("⚠️  [secrets] COURIER_WEBHOOK_SECRET missing; allowing courier webhook in dev.");
    return null;
  }

  const secretValue = secret!.trim();

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secretValue}`) return null;

  const signatureHeader =
    req.headers.get("x-courier-signature") ||
    req.headers.get("courier-signature") ||
    req.headers.get("x-signature") ||
    "";

  if (!signatureHeader) return unauthorized();

  const rawBody = await req.clone().text();
  const expectedHex = computeHmacSha256Hex(secretValue, rawBody);
  const got = normalizeCourierSignatureHeader(signatureHeader);

  // accept either hex or base64 of the hex digest
  const gotHex = /^[0-9a-fA-F]+$/.test(got) ? got.toLowerCase() : "";
  const gotFromBase64 = (() => {
    try {
      const buf = Buffer.from(got, "base64");
      const s = buf.toString("utf8");
      return /^[0-9a-fA-F]+$/.test(s) ? s.toLowerCase() : "";
    } catch {
      return "";
    }
  })();

  const ok =
    (gotHex && timingSafeEqualStr(gotHex, expectedHex)) ||
    (gotFromBase64 && timingSafeEqualStr(gotFromBase64, expectedHex));

  return ok ? null : unauthorized();
}
