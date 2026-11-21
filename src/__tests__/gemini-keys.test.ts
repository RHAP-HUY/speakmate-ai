import { afterEach, describe, expect, it } from 'vitest';
import {
  buildCandidateKeys,
  checkSharedPoolRateLimit,
  clearKeyCooldowns,
  isRetryableGeminiKeyError,
  markKeyCooldown,
  parseGeminiKeyPool,
  resetRateLimitsForTest,
} from '@/lib/gemini-keys';

describe('gemini-keys pool & rotation', () => {
  afterEach(() => {
    clearKeyCooldowns();
    resetRateLimitsForTest();
  });

  it('parses and deduplicates keys from GEMINI_API_KEYS and GEMINI_API_KEY', () => {
    const pool = parseGeminiKeyPool({
      GEMINI_API_KEYS: 'AIzaSyFirstKey123, AIzaSySecondKey456;AIzaSyFirstKey123',
      GEMINI_API_KEY: 'AIzaSyThirdKey789',
    });

    expect(pool).toEqual([
      'AIzaSyFirstKey123',
      'AIzaSySecondKey456',
      'AIzaSyThirdKey789',
    ]);
  });

  it('prefers personal key exclusively when provided', () => {
    const candidates = buildCandidateKeys('AIzaSyPersonalUserKey12345', {
      GEMINI_API_KEYS: 'AIzaSyPoolKeyOne123,AIzaSyPoolKeyTwo456',
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].source).toBe('personal');
    expect(candidates[0].key).toBe('AIzaSyPersonalUserKey12345');
  });

  it('rotates pool keys round-robin and demotes cooled-down keys', () => {
    const env = {
      GEMINI_API_KEYS: 'AIzaSyKeyOne11111,AIzaSyKeyTwo22222,AIzaSyKeyThree333',
    };

    markKeyCooldown('AIzaSyKeyOne11111', 60_000);
    const firstBatch = buildCandidateKeys(null, env);
    expect(firstBatch).toHaveLength(3);
    expect(firstBatch[2].key).toBe('AIzaSyKeyOne11111');
  });

  it('recognizes retryable quota and invalid key errors', () => {
    expect(isRetryableGeminiKeyError(new Error('429 RESOURCE_EXHAUSTED'))).toBe(
      true
    );
    expect(isRetryableGeminiKeyError(new Error('API_KEY_INVALID'))).toBe(true);
    expect(isRetryableGeminiKeyError(new Error('Bad JSON syntax'))).toBe(false);
  });

  it('enforces per-user hourly limit on shared pool', () => {
    expect(checkSharedPoolRateLimit('user-1', 2)).toEqual({
      allowed: true,
      remaining: 1,
    });
    expect(checkSharedPoolRateLimit('user-1', 2)).toEqual({
      allowed: true,
      remaining: 0,
    });
    expect(checkSharedPoolRateLimit('user-1', 2)).toEqual({
      allowed: false,
      remaining: 0,
    });
    // Another user has an independent quota
    expect(checkSharedPoolRateLimit('user-2', 2).allowed).toBe(true);
  });
});
