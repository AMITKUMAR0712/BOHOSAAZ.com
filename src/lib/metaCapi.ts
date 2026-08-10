import crypto from "crypto";
import { env } from "@/lib/env";

const PIXEL_ID = "1625250369335809";
const API_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;

function hash(value: string | null | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  return crypto.createHash("sha256").update(v).digest("hex");
}

export function hasMetaCapi(): boolean {
  return Boolean(env.META_CAPI_TOKEN && env.META_CAPI_TOKEN.trim());
}

/** Splits a single "full name" field into first/last since Order only stores fullName. */
export function splitName(fullName?: string | null): { firstName?: string; lastName?: string } {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  return { firstName: parts[0], lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined };
}

type CapiUser = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  country?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

/** Sends a server-side Meta Conversions API event. No-ops (returns false) if META_CAPI_TOKEN isn't configured. */
export async function sendCapiEvent(input: {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  user: CapiUser;
  customData: Record<string, unknown>;
}): Promise<boolean> {
  if (!hasMetaCapi()) return false;

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: "website",
        user_data: {
          em: hash(input.user.email),
          ph: hash(input.user.phone?.replace(/\D/g, "")),
          fn: hash(input.user.firstName),
          ln: hash(input.user.lastName),
          ct: hash(input.user.city),
          country: hash(input.user.country || "in"),
          client_ip_address: input.user.ip || undefined,
          client_user_agent: input.user.userAgent || undefined,
          fbp: input.user.fbp || undefined,
          fbc: input.user.fbc || undefined,
        },
        custom_data: input.customData,
      },
    ],
    ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(`${API_URL}?access_token=${encodeURIComponent(env.META_CAPI_TOKEN!.trim())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[metaCapi] event failed:", input.eventName, await res.text().catch(() => ""));
    }
    return res.ok;
  } catch (e) {
    console.error("[metaCapi] request failed:", input.eventName, e);
    return false;
  }
}
