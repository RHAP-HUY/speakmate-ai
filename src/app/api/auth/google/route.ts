import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  buildGoogleAuthUrl,
  GOOGLE_STATE_COOKIE,
  isGoogleAuthConfigured,
  isOwnerDriveConfigured,
  verifyOwnerSetupKey,
} from '@/lib/google-auth';
import { sanitizeInternalRedirectPath } from '@/lib/security';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const nextPath = request.nextUrl.searchParams.get('next') || '/';
  const mode = request.nextUrl.searchParams.get('mode') || 'login';
  const setupKey = request.nextUrl.searchParams.get('setup_key');

  if (!isGoogleAuthConfigured()) {
    const fallbackUrl = new URL('/auth', origin);
    fallbackUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(fallbackUrl);
  }

  const isOwnerSetup = mode === 'owner-setup';
  if (isOwnerSetup) {
    if (isOwnerDriveConfigured()) {
      return NextResponse.json(
        { error: 'Kho Google Drive 5TB trung tâm đã được kích hoạt sẵn.' },
        { status: 403 }
      );
    }
    if (!verifyOwnerSetupKey(setupKey)) {
      return NextResponse.json(
        { error: 'Mã kích hoạt chủ kho Drive không hợp lệ.' },
        { status: 403 }
      );
    }
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const stateMode = isOwnerSetup ? 'owner-setup' : 'login';
  const statePayload = JSON.stringify({
    nonce,
    next: sanitizeInternalRedirectPath(nextPath, '/'),
    mode: stateMode,
  });
  const encodedState = Buffer.from(statePayload, 'utf8').toString('base64url');

  const googleUrl = buildGoogleAuthUrl({
    origin,
    state: encodedState,
    requestDriveScope: isOwnerSetup ? true : undefined,
  });

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, `${stateMode}:${nonce}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return response;
}
