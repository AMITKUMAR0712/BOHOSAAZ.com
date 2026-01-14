import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function isValidUpstashUrl(url: string | undefined) {
  if (!url) return false;
  if (url === "..." || url.includes("...")) return false;
  return url.startsWith("https://");
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const rl = isValidUpstashUrl(upstashUrl) && upstashToken
  ? new Ratelimit({
      redis: new Redis({ url: upstashUrl, token: upstashToken }),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
    })
  : null;

export async function rateLimit(key: string) {
  if (!rl) {
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    };
  }
  return rl.limit(key);
}
