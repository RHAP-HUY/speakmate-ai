import type { AccountCloudBundle } from '@/types';

/**
 * Strictly validates an internal relative redirect path to prevent
 * OWASP Open Redirect attacks (e.g., //evil.com, /\evil.com, https://evil.com,
 * /%2f/evil.com, or control characters).
 */
export function sanitizeInternalRedirectPath(
  candidate: string | null | undefined,
  fallback = '/'
): string {
  if (!candidate || typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!trimmed) return fallback;

  // Reject control characters (CR/LF/tabs/null bytes)
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  // Must start with a single forward slash, never "//" or "/\"
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return fallback;
  }

  // Reject any backslashes or scheme-like prefixes
  if (trimmed.includes('\\')) return fallback;

  try {
    const base = 'https://speakmate.internal';
    const parsed = new URL(trimmed, base);
    if (parsed.origin !== base) return fallback;
    if (parsed.pathname.startsWith('//')) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export const MAX_CLOUD_BUNDLE_BYTES = 2 * 1024 * 1024; // 2 MB strict ceiling

export interface BundleValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: AccountCloudBundle;
}

/**
 * Validates and bounds an incoming AccountCloudBundle before writing to
 * Google Drive 5TB storage, protecting against oversized/corrupt payloads.
 */
export function validateCloudBundlePayload(
  rawBundle: unknown,
  rawByteLength?: number
): BundleValidationResult {
  if (
    typeof rawByteLength === 'number' &&
    rawByteLength > MAX_CLOUD_BUNDLE_BYTES
  ) {
    return {
      valid: false,
      error: 'Gói dữ liệu đồng bộ vượt quá giới hạn an toàn 2MB.',
    };
  }

  if (!rawBundle || typeof rawBundle !== 'object' || Array.isArray(rawBundle)) {
    return { valid: false, error: 'Dữ liệu đồng bộ Google Drive không hợp lệ.' };
  }

  const candidate = rawBundle as Partial<AccountCloudBundle>;
  if (
    !candidate.profile ||
    typeof candidate.profile !== 'object' ||
    Array.isArray(candidate.profile)
  ) {
    return { valid: false, error: 'Thiếu hồ sơ học viên trong gói đồng bộ.' };
  }

  const dailyStats = Array.isArray(candidate.dailyStats)
    ? candidate.dailyStats.slice(0, 730)
    : [];
  const phrases = Array.isArray(candidate.phrases)
    ? candidate.phrases.slice(0, 1000)
    : [];
  const conversations = Array.isArray(candidate.conversations)
    ? candidate.conversations.slice(0, 200)
    : [];

  const boundedMessages: AccountCloudBundle['messagesByConversation'] = {};
  if (
    candidate.messagesByConversation &&
    typeof candidate.messagesByConversation === 'object' &&
    !Array.isArray(candidate.messagesByConversation)
  ) {
    const allowedConvIds = new Set(conversations.slice(0, 60).map((c) => c.id));
    for (const [convId, msgs] of Object.entries(
      candidate.messagesByConversation
    )) {
      if (!allowedConvIds.has(convId) && Object.keys(boundedMessages).length >= 60) {
        continue;
      }
      if (Array.isArray(msgs)) {
        boundedMessages[convId] = msgs.slice(0, 120);
      }
    }
  }

  const sanitized: AccountCloudBundle = {
    version: 3,
    accountId: String(candidate.accountId ?? ''),
    email: String(candidate.email ?? ''),
    provider: candidate.provider === 'google' ? 'google' : 'local',
    updatedAt:
      typeof candidate.updatedAt === 'string' && candidate.updatedAt
        ? candidate.updatedAt
        : new Date().toISOString(),
    profile: candidate.profile,
    dailyStats,
    phrases,
    conversations,
    messagesByConversation: boundedMessages,
  };

  const serializedBytes = Buffer.byteLength(JSON.stringify(sanitized), 'utf8');
  if (serializedBytes > MAX_CLOUD_BUNDLE_BYTES) {
    return {
      valid: false,
      error: 'Dữ liệu đồng bộ sau chuẩn hóa vượt quá giới hạn 2MB.',
    };
  }

  return { valid: true, sanitized };
}

/**
 * Extracts a normalized client identifier (IP) from standard reverse-proxy headers
 * (Vercel x-forwarded-for / x-real-ip) for per-client abuse rate limiting.
 */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp.slice(0, 64);
  return 'unknown-client';
}
