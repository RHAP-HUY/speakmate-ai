import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkSlidingWindowRateLimit,
  resetAllRateLimitBucketsForTest,
} from '@/lib/rate-limit';

describe('checkSlidingWindowRateLimit', () => {
  beforeEach(() => {
    resetAllRateLimitBucketsForTest();
  });

  it('allows requests up to limit and blocks subsequent ones with retryAfter', () => {
    const t0 = 1_700_000_000_000;
    const r1 = checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: '1.2.3.4',
      limit: 2,
      windowMs: 60_000,
      nowMs: t0,
    });
    const r2 = checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: '1.2.3.4',
      limit: 2,
      windowMs: 60_000,
      nowMs: t0 + 1000,
    });
    const r3 = checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: '1.2.3.4',
      limit: 2,
      windowMs: 60_000,
      nowMs: t0 + 2000,
    });

    expect(r1).toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });
    expect(r2).toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterSeconds).toBe(58);
  });

  it('resets capacity once the sliding window passes and isolates keys', () => {
    const t0 = 1_700_000_000_000;
    checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: 'ip-a',
      limit: 1,
      windowMs: 10_000,
      nowMs: t0,
    });

    // Different IP is unaffected
    const otherIp = checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: 'ip-b',
      limit: 1,
      windowMs: 10_000,
      nowMs: t0 + 100,
    });
    expect(otherIp.allowed).toBe(true);

    // Same IP recovers after window expires
    const afterWindow = checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: 'ip-a',
      limit: 1,
      windowMs: 10_000,
      nowMs: t0 + 10_001,
    });
    expect(afterWindow.allowed).toBe(true);
  });
});
