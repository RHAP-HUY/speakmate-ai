import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const GOOGLE_SESSION_COOKIE = 'speakmate_google_session';
export const GOOGLE_STATE_COOKIE = 'speakmate_google_oauth_state';

export const GOOGLE_BASIC_SCOPES = ['openid', 'email', 'profile'].join(' ');

export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

export interface GoogleSessionPayload {
  userId: string;
  email: string;
  name: string;
  picture?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number; // unix ms
}

export function getGoogleOAuthConfig(
  env: Record<string, string | undefined> = process.env
): {
  clientId: string;
  clientSecret: string;
  ownerRefreshToken: string;
  ownerFolderName: string;
  configured: boolean;
  ownerDriveConfigured: boolean;
} {
  const clientId = env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const ownerRefreshToken = env.GOOGLE_DRIVE_OWNER_REFRESH_TOKEN?.trim() ?? '';
  const ownerFolderName =
    env.GOOGLE_DRIVE_FOLDER_NAME?.trim() || 'SpeakMate AI Database';

  const configured = clientId.length > 10 && clientSecret.length > 6;
  const ownerDriveConfigured = configured && ownerRefreshToken.length > 10;

  return {
    clientId,
    clientSecret,
    ownerRefreshToken,
    ownerFolderName,
    configured,
    ownerDriveConfigured,
  };
}

export function isGoogleAuthConfigured(): boolean {
  return getGoogleOAuthConfig().configured;
}

export function isOwnerDriveConfigured(): boolean {
  return getGoogleOAuthConfig().ownerDriveConfigured;
}

/**
 * Computes a server-derived setup key used ONLY once before
 * GOOGLE_DRIVE_OWNER_REFRESH_TOKEN is configured, so only the project owner
 * can link their 5TB central Google Drive.
 */
export function getOwnerSetupKey(
  env: Record<string, string | undefined> = process.env
): string | null {
  const secret = env.APP_ENCRYPTION_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return crypto
    .createHmac('sha256', secret)
    .update('speakmate-owner-drive-setup-v1')
    .digest('hex')
    .slice(0, 32);
}

export function verifyOwnerSetupKey(
  candidate: string | null | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!candidate) return false;
  const expected = getOwnerSetupKey(env);
  if (!expected) return false;
  const a = Buffer.from(candidate.trim(), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildGoogleAuthUrl(params: {
  origin: string;
  state: string;
  requestDriveScope?: boolean;
}): string {
  const cfg = getGoogleOAuthConfig();
  const redirectUri = `${params.origin}/api/auth/google/callback`;
  // Once central 5TB owner Drive is active, regular learners only need basic login scopes
  const needsDriveScope =
    params.requestDriveScope !== undefined
      ? params.requestDriveScope
      : !cfg.ownerDriveConfigured;

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set(
    'scope',
    needsDriveScope ? GOOGLE_OAUTH_SCOPES : GOOGLE_BASIC_SCOPES
  );
  if (needsDriveScope) {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent select_account');
  } else {
    url.searchParams.set('prompt', 'select_account');
  }
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeGoogleCodeForTokens(params: {
  code: string;
  redirectUri: string;
}): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    code: params.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'Không thể xác thực mã Google OAuth.'
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in ?? 3500),
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'Không thể làm mới phiên Google Drive.'
    );
  }

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 3500) - 120) * 1000,
  };
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
  picture?: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };
  if (!res.ok || !data.sub) {
    throw new Error('Không thể đọc thông tin tài khoản Google.');
  }
  return {
    sub: data.sub,
    email: data.email || '',
    name: data.name || data.email?.split('@')[0] || 'Học viên',
    picture: data.picture,
  };
}

function getSessionCookieKey(): Buffer {
  const seed =
    process.env.APP_ENCRYPTION_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    'speakmate-ai-default-cookie-key-v1';
  return crypto.createHash('sha256').update(seed).digest();
}

export function sealSessionPayload(payload: GoogleSessionPayload): string {
  const json = JSON.stringify(payload);
  const key = getSessionCookieKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v2.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function unsealSessionPayload(raw: string): GoogleSessionPayload | null {
  try {
    if (!raw.startsWith('v2.')) return null;
    const parts = raw.slice(3).split('.');
    if (parts.length !== 3) return null;
    const [ivB64, tagB64, dataB64] = parts;
    if (
      !/^[A-Za-z0-9_-]+$/.test(ivB64) ||
      !/^[A-Za-z0-9_-]+$/.test(tagB64) ||
      !/^[A-Za-z0-9_-]+$/.test(dataB64)
    ) {
      return null;
    }
    const key = getSessionCookieKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plain) as GoogleSessionPayload;
  } catch {
    return null;
  }
}

export async function readGoogleSession(): Promise<GoogleSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return unsealSessionPayload(raw);
}

export function attachGoogleSessionCookie(
  response: NextResponse,
  session: GoogleSessionPayload
): void {
  const sealed = sealSessionPayload(session);
  response.cookies.set(GOOGLE_SESSION_COOKIE, sealed, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearGoogleSessionCookie(response: NextResponse): void {
  response.cookies.set(GOOGLE_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function ensureFreshSessionAccessToken(
  session: GoogleSessionPayload
): Promise<{ session: GoogleSessionPayload; refreshed: boolean }> {
  if (session.expiresAt > Date.now() + 60_000 && session.accessToken) {
    return { session, refreshed: false };
  }
  if (!session.refreshToken) {
    return { session, refreshed: false };
  }
  const fresh = await refreshGoogleAccessToken(session.refreshToken);
  return {
    session: {
      ...session,
      accessToken: fresh.accessToken,
      expiresAt: fresh.expiresAt,
    },
    refreshed: true,
  };
}
