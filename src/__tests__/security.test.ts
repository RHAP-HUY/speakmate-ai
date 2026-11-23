import { describe, expect, it } from 'vitest';
import {
  extractClientIp,
  MAX_CLOUD_BUNDLE_BYTES,
  sanitizeInternalRedirectPath,
  validateCloudBundlePayload,
} from '@/lib/security';

describe('sanitizeInternalRedirectPath (OWASP Open Redirect protection)', () => {
  it('allows clean internal paths with query params and hashes', () => {
    expect(sanitizeInternalRedirectPath('/')).toBe('/');
    expect(sanitizeInternalRedirectPath('/play?mode=speed&category=daily')).toBe(
      '/play?mode=speed&category=daily'
    );
    expect(sanitizeInternalRedirectPath('/history#rewards')).toBe(
      '/history#rewards'
    );
    expect(sanitizeInternalRedirectPath('/call?scenario=daily-coffee-shop')).toBe(
      '/call?scenario=daily-coffee-shop'
    );
  });

  it('blocks protocol-relative, backslash, external URL, and javascript redirects', () => {
    expect(sanitizeInternalRedirectPath('//evil.com')).toBe('/');
    expect(sanitizeInternalRedirectPath('//evil.com/phish')).toBe('/');
    expect(sanitizeInternalRedirectPath('/\\evil.com')).toBe('/');
    expect(sanitizeInternalRedirectPath('/foo\\bar')).toBe('/');
    expect(sanitizeInternalRedirectPath('https://evil.com')).toBe('/');
    expect(sanitizeInternalRedirectPath('http://evil.com/auth')).toBe('/');
    expect(sanitizeInternalRedirectPath('javascript:alert(1)')).toBe('/');
    expect(sanitizeInternalRedirectPath('/play\r\nLocation: https://evil.com')).toBe(
      '/'
    );
    expect(sanitizeInternalRedirectPath('', '/play')).toBe('/play');
    expect(sanitizeInternalRedirectPath(null, '/auth')).toBe('/auth');
  });
});

describe('validateCloudBundlePayload', () => {
  it('accepts a valid bundle and bounds array sizes safely', () => {
    const res = validateCloudBundlePayload({
      version: 3,
      accountId: 'google_123',
      email: 'learner@example.com',
      provider: 'google',
      updatedAt: '2026-11-24T00:00:00.000Z',
      profile: {
        id: 'google_123',
        email: 'learner@example.com',
        displayName: 'Huy',
      },
      dailyStats: Array.from({ length: 800 }, (_, i) => ({
        practiceDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      })),
      phrases: [],
      conversations: [],
      messagesByConversation: {},
    });

    expect(res.valid).toBe(true);
    expect(res.sanitized?.dailyStats.length).toBe(730);
  });

  it('rejects missing profile or oversized payloads > 2MB', () => {
    expect(validateCloudBundlePayload(null).valid).toBe(false);
    expect(validateCloudBundlePayload({}).valid).toBe(false);
    expect(
      validateCloudBundlePayload(
        { profile: { id: '1' } },
        MAX_CLOUD_BUNDLE_BYTES + 1
      ).valid
    ).toBe(false);
  });
});

describe('extractClientIp', () => {
  it('extracts first IP from x-forwarded-for or falls back to x-real-ip', () => {
    const h1 = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' });
    expect(extractClientIp(h1)).toBe('203.0.113.10');

    const h2 = new Headers({ 'x-real-ip': '198.51.100.7' });
    expect(extractClientIp(h2)).toBe('198.51.100.7');

    expect(extractClientIp(new Headers())).toBe('unknown-client');
  });
});
