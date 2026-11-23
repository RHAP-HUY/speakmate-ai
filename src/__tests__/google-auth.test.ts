import { afterEach, describe, expect, it } from 'vitest';
import {
  buildGoogleAuthUrl,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_SCOPES,
  sealSessionPayload,
  unsealSessionPayload,
  type GoogleSessionPayload,
} from '@/lib/google-auth';

describe('google-auth & encrypted Drive session', () => {
  const origClientId = process.env.GOOGLE_CLIENT_ID;
  const origSecret = process.env.APP_ENCRYPTION_SECRET;

  afterEach(() => {
    if (origClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = origClientId;
    if (origSecret === undefined) delete process.env.APP_ENCRYPTION_SECRET;
    else process.env.APP_ENCRYPTION_SECRET = origSecret;
  });

  it('detects direct Google OAuth and Owner 5TB Drive config accurately', () => {
    const unconfigured = getGoogleOAuthConfig({});
    expect(unconfigured.configured).toBe(false);
    expect(unconfigured.ownerDriveConfigured).toBe(false);

    const perUser = getGoogleOAuthConfig({
      GOOGLE_CLIENT_ID: '1234567890-abcdef.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'GOCSPX-secret123',
    });
    expect(perUser.configured).toBe(true);
    expect(perUser.ownerDriveConfigured).toBe(false);

    const centralOwner = getGoogleOAuthConfig({
      GOOGLE_CLIENT_ID: '1234567890-abcdef.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'GOCSPX-secret123',
      GOOGLE_DRIVE_OWNER_REFRESH_TOKEN: '1//0gExampleRefreshToken12345',
    });
    expect(centralOwner.configured).toBe(true);
    expect(centralOwner.ownerDriveConfigured).toBe(true);
  });

  it('builds Google OAuth URL requesting drive.file scope and offline refresh token', () => {
    process.env.GOOGLE_CLIENT_ID = '1234567890-test.apps.googleusercontent.com';
    const url = new URL(
      buildGoogleAuthUrl({
        origin: 'https://speakmate-ai-nu.vercel.app',
        state: 'abc123',
      })
    );
    expect(url.hostname).toBe('accounts.google.com');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://speakmate-ai-nu.vercel.app/api/auth/google/callback'
    );
    expect(url.searchParams.get('scope')).toBe(GOOGLE_OAUTH_SCOPES);
    expect(url.searchParams.get('access_type')).toBe('offline');
  });

  it('seals and unseals Google Drive session cookies with AES-256-GCM', () => {
    process.env.APP_ENCRYPTION_SECRET =
      'a-very-secure-secret-key-with-at-least-32-chars';
    const session: GoogleSessionPayload = {
      userId: 'google_11223344',
      email: 'student@gmail.com',
      name: 'Huy',
      picture: 'https://example.com/avatar.png',
      accessToken: 'ya29.example-access-token',
      refreshToken: '1//0gExampleRefresh',
      expiresAt: Date.now() + 3600_000,
    };

    const sealed = sealSessionPayload(session);
    expect(sealed).not.toContain('ya29.example-access-token');
    expect(sealed).not.toContain('student@gmail.com');

    const restored = unsealSessionPayload(sealed);
    expect(restored).toEqual(session);
    expect(unsealSessionPayload(`${sealed}tampered`)).toBeNull();
  });
});
