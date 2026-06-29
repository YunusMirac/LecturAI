import { rateLimitResponse } from "@/lib/server/http-errors";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  if (bucket.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Returns a 429 response when limited, otherwise null. */
export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): ReturnType<typeof rateLimitResponse> | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${scope}:${ip}`, { limit, windowMs });
  if (!result.allowed) {
    return rateLimitResponse(result.retryAfterSec);
  }
  return null;
}

/** Test helper — resets in-memory buckets between tests. */
export function resetRateLimitStore() {
  store.clear();
}
