import { z } from "zod";

function nonEmpty(v: unknown) {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

function warnOnce(message: string) {
  if (process.env.NODE_ENV === "production") return;
  const key = `__bohosaaz_env_warn__:${message}`;
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[key]) return;
  g[key] = true;
  console.warn(message);
}

const EnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    NEXT_PHASE: z.string().optional(),

    // Core
    DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().optional(),

    // Upstash (optional in dev; required in production)
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Secrets (optional in dev; required in production)
    CRON_SECRET: z.string().optional(),
    COURIER_WEBHOOK_SECRET: z.string().optional(),

    // Payments
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

    // existing app keys (used by the app)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    PAYOUT_DELAY_DAYS: z.string().optional(),
    REFUND_REMINDER_DAYS: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const isProd = v.NODE_ENV === "production";
    const isBuildPhase = v.NEXT_PHASE === "phase-production-build";
    const shouldValidateStrictly = isProd && !isBuildPhase;

    // Core is always required (dev + prod). We do not provide any hardcoded fallbacks.
    if (!nonEmpty(v.DATABASE_URL)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "DATABASE_URL is required" });
    }

    if (!nonEmpty(v.JWT_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "JWT_SECRET is required" });
    }

    if (!nonEmpty(v.NEXT_PUBLIC_APP_URL)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "NEXT_PUBLIC_APP_URL is required" });
    }

    // In production we fail-fast on operational integrations.
    if (!shouldValidateStrictly) return;

    if (!nonEmpty(v.UPSTASH_REDIS_REST_URL) || !nonEmpty(v.UPSTASH_REDIS_REST_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Upstash Redis is required in production (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)",
      });
    }

    if (!nonEmpty(v.CRON_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CRON_SECRET is required in production" });
    }

    if (!nonEmpty(v.COURIER_WEBHOOK_SECRET)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "COURIER_WEBHOOK_SECRET is required in production" });
    }

    if (!nonEmpty(v.RAZORPAY_KEY_ID) || !nonEmpty(v.RAZORPAY_KEY_SECRET) || !nonEmpty(v.NEXT_PUBLIC_RAZORPAY_KEY_ID)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Razorpay is required in production (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID)",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  const isProd = process.env.NODE_ENV === "production";
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  void isBuildPhase;

  if (!parsed.success) {
    // Core env must be present even in dev.
    throw new Error(
      `Invalid environment variables:\n${parsed.error.issues.map((i) => `- ${i.message}`).join("\n")}`
    );
  }

  // Dev-mode warnings for optional integrations (not fatal).
  if (!isProd) {
    const optionalKeys = [
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "CRON_SECRET",
      "COURIER_WEBHOOK_SECRET",
      "RAZORPAY_KEY_ID",
      "RAZORPAY_KEY_SECRET",
      "NEXT_PUBLIC_RAZORPAY_KEY_ID",
    ];

    const missing = optionalKeys.filter((k) => !nonEmpty((process.env as Record<string, unknown>)[k]));
    if (missing.length) warnOnce(`⚠️  [env] Optional integrations not configured: ${missing.join(", ")}`);
  }

  cached = parsed.data;
  return cached;
}

export const env = getEnv();

export const isProd = env.NODE_ENV === "production";

export function getJwtSecret(): string {
  if (nonEmpty(env.JWT_SECRET)) return env.JWT_SECRET!.trim();
  throw new Error("JWT_SECRET missing");
}

export function hasUpstash(): boolean {
  return nonEmpty(env.UPSTASH_REDIS_REST_URL) && nonEmpty(env.UPSTASH_REDIS_REST_TOKEN);
}

export function hasRazorpay(): boolean {
  return nonEmpty(env.RAZORPAY_KEY_ID) && nonEmpty(env.RAZORPAY_KEY_SECRET) && nonEmpty(env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
}

export function requireRazorpay() {
  if (!hasRazorpay()) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID"
    );
  }
  return {
    keyId: env.RAZORPAY_KEY_ID!.trim(),
    keySecret: env.RAZORPAY_KEY_SECRET!.trim(),
    publicKeyId: env.NEXT_PUBLIC_RAZORPAY_KEY_ID!.trim(),
    webhookSecret: nonEmpty(env.RAZORPAY_WEBHOOK_SECRET) ? env.RAZORPAY_WEBHOOK_SECRET!.trim() : null,
  };
}
