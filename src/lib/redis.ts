import { Redis } from "@upstash/redis";
import { env, isProd } from "@/lib/env";

function nonEmpty(v: string | undefined) {
  return typeof v === "string" && v.trim().length > 0 && !v.includes("...");
}

function warnOnce(message: string) {
  if (isProd) return;
  const key = `__bohosaaz_redis_warn__:${message}`;
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[key]) return;
  g[key] = true;
  console.warn(message);
}

type StoredValue = { value: string; expiresAt?: number };

class MemoryStore {
  private store = new Map<string, StoredValue>();

  get(key: string): string | null {
    const v = this.store.get(key);
    if (!v) return null;
    if (typeof v.expiresAt === "number" && Date.now() > v.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return v.value;
  }

  set(key: string, value: string, ttlSeconds?: number) {
    const expiresAt = typeof ttlSeconds === "number" ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  del(key: string) {
    this.store.delete(key);
  }

  incr(key: string): number {
    const cur = Number(this.get(key) ?? "0");
    const next = Number.isFinite(cur) ? cur + 1 : 1;
    this.set(key, String(next));
    return next;
  }
}

export type Kv = {
  configured: boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ttlSeconds?: number }): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
};

let cachedKv: Kv | null = null;

export function getKv(): Kv {
  if (cachedKv) return cachedKv;

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  const hasUpstash = nonEmpty(url) && nonEmpty(token);

  if (!hasUpstash) {
    if (isProd) {
      // In prod this should already be enforced by env.ts, but keep a safe fallback.
      cachedKv = {
        configured: false,
        async get() {
          return null;
        },
        async set() {},
        async del() {},
        async incr() {
          return 0;
        },
      };
      return cachedKv;
    }

    warnOnce("⚠️  [redis] Upstash env vars missing; using in-memory fallback (dev only)");
    const mem = new MemoryStore();
    cachedKv = {
      configured: false,
      async get(key) {
        return mem.get(key);
      },
      async set(key, value, opts) {
        mem.set(key, value, opts?.ttlSeconds);
      },
      async del(key) {
        mem.del(key);
      },
      async incr(key) {
        return mem.incr(key);
      },
    };
    return cachedKv;
  }

  const redis = new Redis({ url: url!.trim(), token: token!.trim() });

  cachedKv = {
    configured: true,
    async get(key) {
      const v = await redis.get<string>(key);
      return typeof v === "string" ? v : v == null ? null : String(v);
    },
    async set(key, value, opts) {
      if (typeof opts?.ttlSeconds === "number") {
        await redis.set(key, value, { ex: opts.ttlSeconds });
        return;
      }
      await redis.set(key, value);
    },
    async del(key) {
      await redis.del(key);
    },
    async incr(key) {
      const n = await redis.incr(key);
      return Number(n);
    },
  };

  return cachedKv;
}

export const kv = getKv();
