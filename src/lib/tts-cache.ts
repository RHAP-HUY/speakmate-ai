interface TtsCacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

const MAX_ENTRIES = 64;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024; // 2 MB cap
const TTL_MS = 30 * 60_000; // 30 minutes

const cache = new Map<string, TtsCacheEntry>();
let totalBytes = 0;
let hits = 0;
let misses = 0;

export function buildTtsCacheKey(
  voice: string,
  rate: string,
  text: string
): string {
  return `${voice}|${rate}|${text}`;
}

export function getCachedTtsAudio(key: string): Buffer | null {
  const entry = cache.get(key);
  if (!entry) {
    misses += 1;
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    totalBytes = Math.max(0, totalBytes - entry.buffer.length);
    cache.delete(key);
    misses += 1;
    return null;
  }
  // Refresh LRU recency
  cache.delete(key);
  cache.set(key, entry);
  hits += 1;
  return entry.buffer;
}

export function setCachedTtsAudio(key: string, buffer: Buffer): void {
  if (buffer.length === 0 || buffer.length > 256 * 1024) {
    return;
  }

  const existing = cache.get(key);
  if (existing) {
    totalBytes = Math.max(0, totalBytes - existing.buffer.length);
    cache.delete(key);
  }

  while (
    (cache.size >= MAX_ENTRIES || totalBytes + buffer.length > MAX_TOTAL_BYTES) &&
    cache.size > 0
  ) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    const oldEntry = cache.get(oldestKey);
    if (oldEntry) {
      totalBytes = Math.max(0, totalBytes - oldEntry.buffer.length);
    }
    cache.delete(oldestKey);
  }

  cache.set(key, {
    buffer,
    expiresAt: Date.now() + TTL_MS,
  });
  totalBytes += buffer.length;
}

export function getTtsCacheStats(): {
  entries: number;
  bytes: number;
  hits: number;
  misses: number;
} {
  return {
    entries: cache.size,
    bytes: totalBytes,
    hits,
    misses,
  };
}

export function clearTtsCacheForTest(): void {
  cache.clear();
  totalBytes = 0;
  hits = 0;
  misses = 0;
}
