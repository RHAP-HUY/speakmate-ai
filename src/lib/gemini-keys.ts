export interface KeyPoolEntry {
  key: string;
  label: string;
  source: 'personal' | 'shared';
}

const cooldownMap = new Map<string, number>();
const rateLimitMap = new Map<string, number[]>();
let roundRobinCursor = 0;

export function parseGeminiKeyPool(
  env: Record<string, string | undefined> = process.env
): string[] {
  const rawList = [env.GEMINI_API_KEYS ?? '', env.GEMINI_API_KEY ?? '']
    .join(',')
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 10);

  return Array.from(new Set(rawList));
}

export function buildCandidateKeys(
  personalKey?: string | null,
  env: Record<string, string | undefined> = process.env
): KeyPoolEntry[] {
  if (personalKey && personalKey.trim().length > 10) {
    return [
      {
        key: personalKey.trim(),
        label: 'personal-key',
        source: 'personal',
      },
    ];
  }

  const pool = parseGeminiKeyPool(env);
  if (pool.length === 0) return [];

  const now = Date.now();
  const start = roundRobinCursor % pool.length;
  roundRobinCursor = (roundRobinCursor + 1) % pool.length;

  const rotated: string[] = [];
  for (let i = 0; i < pool.length; i++) {
    rotated.push(pool[(start + i) % pool.length]);
  }

  // Prefer keys not currently on cooldown, keeping cooled-down ones at the end as last resort
  const active = rotated.filter((k) => (cooldownMap.get(k) ?? 0) <= now);
  const cooling = rotated.filter((k) => (cooldownMap.get(k) ?? 0) > now);

  return [...active, ...cooling].map((key, idx) => ({
    key,
    label: `shared-pool-${idx + 1}`,
    source: 'shared' as const,
  }));
}

export function markKeyCooldown(key: string, durationMs = 60_000): void {
  cooldownMap.set(key, Date.now() + durationMs);
}

export function clearKeyCooldowns(): void {
  cooldownMap.clear();
}

export function isRetryableGeminiKeyError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? '');
  const lower = message.toLowerCase();

  return (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('permission_denied') ||
    lower.includes('403') ||
    lower.includes('401')
  );
}

export function checkSharedPoolRateLimit(
  userId: string,
  limitPerHour = Number(process.env.SHARED_POOL_HOURLY_LIMIT || 60)
): { allowed: boolean; remaining: number } {
  if (!Number.isFinite(limitPerHour) || limitPerHour <= 0) {
    return { allowed: true, remaining: 999 };
  }

  const now = Date.now();
  const oneHourAgo = now - 3_600_000;
  const existing = (rateLimitMap.get(userId) ?? []).filter(
    (ts) => ts > oneHourAgo
  );

  if (existing.length >= limitPerHour) {
    rateLimitMap.set(userId, existing);
    return { allowed: false, remaining: 0 };
  }

  existing.push(now);
  rateLimitMap.set(userId, existing);
  return { allowed: true, remaining: Math.max(0, limitPerHour - existing.length) };
}

export function resetRateLimitsForTest(): void {
  rateLimitMap.clear();
  roundRobinCursor = 0;
}
