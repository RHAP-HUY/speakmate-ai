import { afterEach, describe, expect, it } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  isServerEncryptionAvailable,
  maskApiKey,
} from '@/lib/crypto';

describe('crypto helpers', () => {
  const originalSecret = process.env.APP_ENCRYPTION_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.APP_ENCRYPTION_SECRET;
    } else {
      process.env.APP_ENCRYPTION_SECRET = originalSecret;
    }
  });

  it('encrypts and decrypts personal API key round-trip', () => {
    process.env.APP_ENCRYPTION_SECRET = 'super-secret-32-char-test-key-1234';
    expect(isServerEncryptionAvailable()).toBe(true);

    const encrypted = encryptSecret('AIzaSyExampleSecretKey998877');
    expect(encrypted.split('.')).toHaveLength(3);
    expect(encrypted).not.toContain('AIzaSyExampleSecretKey998877');
    expect(decryptSecret(encrypted)).toBe('AIzaSyExampleSecretKey998877');
  });

  it('rejects encryption when APP_ENCRYPTION_SECRET is missing or too short', () => {
    process.env.APP_ENCRYPTION_SECRET = 'short';
    expect(isServerEncryptionAvailable()).toBe(false);
    expect(() => encryptSecret('AIzaSyTest123456')).toThrow();
  });

  it('masks API keys safely for display', () => {
    expect(maskApiKey('AIzaSyAbCdEfGhIj1234')).toBe('AIzaSy...1234');
    expect(maskApiKey('short')).toBe('****');
  });
});
