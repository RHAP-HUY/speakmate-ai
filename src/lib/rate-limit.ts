export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 2000;

/**
 * In-memory sliding-window rate limiter for API route protection.
 * Automatically evicts expired timestamps and bounds map cardinality.
 */
export function checkSlidingWindowRateLimit(params: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
  nowMs?: number;
}): RateLimitResult {
  const now = params.nowMs ?? Date.now();
  const limit = Math.max(1, Math.floor(params.limit));
  const windowMs = Math.max(1000, Math.floor(params.windowMs));
  const bucketKey = `${params.namespace}:${params.key}`;
  const cutoff = now - windowMs;

  if (buckets.size >= MAX_BUCKETS && !buckets.has(bucketKey)) {
    // Evict stale entries first, then oldest entry if still at capacity
    for (const [k, list] of buckets) {
      if (list.length === 0 || list[list.length - 1] <= cutoff) {
        buckets.delete(k);
      }
      if (buckets.size < MAX_BUCKETS) break;
    }
    if (buckets.size >= MAX_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
  }

  const timestamps = (buckets.get(bucketKey) ?? []).filter((ts) => ts > cutoff);

  if (timestamps.length >= limit) {
    buckets.set(bucketKey, timestamps);
    const oldestInWindow = timestamps[0] ?? now;
    const retryAfterMs = Math.max(1000, oldestInWindow + windowMs - now);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  timestamps.push(now);
  buckets.set(bucketKey, timestamps);

  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    retryAfterSeconds: 0,
  };
}

export function resetAllRateLimitBucketsForTest(): void {
  buckets.clear();
}
