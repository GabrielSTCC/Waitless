/**
 * Rate limit compartilhado: Upstash Redis REST quando configurado; senão memória local.
 * Use chaves que incluam IP e, se possível, companyId (tenant).
 */

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

type Bucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

function getUpstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  if (!current || current.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true };
}

async function checkUpstashRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  config: { url: string; token: string },
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  try {
    const incrRes = await fetch(`${config.url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) {
      return checkMemoryRateLimit(key, limit, windowMs);
    }
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = typeof incrJson.result === "number" ? incrJson.result : 1;
    if (count === 1) {
      await fetch(
        `${config.url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`,
        {
          headers: { Authorization: `Bearer ${config.token}` },
          cache: "no-store",
        },
      );
    }
    if (count > limit) {
      return { ok: false, retryAfterSec: windowSec };
    }
    return { ok: true };
  } catch {
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}

/** Prefer async in API routes. Sync memory-only alias kept for tests. */
export function checkSimpleRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  return checkMemoryRateLimit(key, limit, windowMs);
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const upstash = getUpstashConfig();
  if (upstash) {
    return checkUpstashRateLimit(key, limit, windowMs, upstash);
  }
  return checkMemoryRateLimit(key, limit, windowMs);
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function rateLimitResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return {
    body: { error: "Muitas tentativas. Aguarde um momento." },
    init: {
      status: 429 as const,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  };
}
