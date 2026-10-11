import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Upstash Redis — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in env.
// Falls back to in-memory sliding window when not configured or on error (dev / no Redis).

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = Redis.fromEnv();
  } catch {
    redis = null;
  }
}

// In-memory fallback (single instance only)
const hits = new Map<string, number[]>();
let gcScheduled = false;
function scheduleGC() {
  if (gcScheduled) return;
  gcScheduled = true;
  setTimeout(() => {
    gcScheduled = false;
    const now = Date.now();
    for (const [k, arr] of hits) {
      const filtered = arr.filter((t) => now - t < 600_000);
      if (filtered.length === 0) hits.delete(k);
      else hits.set(k, filtered);
    }
  }, 300_000).unref?.();
}
function limitedMemory(key: string, max: number, windowMs: number): boolean {
  scheduleGC();
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

// Cache Ratelimit instances by (max, window)
const limiters = new Map<string, Ratelimit>();
function getLimiter(max: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${max}:${windowMs}`;
  const cached = limiters.get(cacheKey);
  if (cached) return cached;
  // Upstash expects window as e.g. "60 s", "10 s"
  const secs = Math.max(1, Math.ceil(windowMs / 1000));
  const windowStr = `${secs} s` as `${number} s`;
  const limiter = new Ratelimit({
    redis: redis!,
    limiter: Ratelimit.slidingWindow(max, windowStr),
    analytics: true,
    prefix: "ratelimit",
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

/** Returns true if the key is rate-limited (blocked), false if allowed. */
export async function limited(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  if (redis) {
    try {
      const limiter = getLimiter(max, windowMs);
      if (limiter) {
        const { success } = await limiter.limit(key);
        return !success;
      }
    } catch (e) {
      console.error("[rate] upstash error, falling back to memory", e);
    }
  }
  return limitedMemory(key, max, windowMs);
}

/** Extract client IP - trusts first x-forwarded-for entry (configure trusted proxy at edge) */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || "anon";
  return req.headers.get("x-real-ip")?.trim() || "anon";
}
