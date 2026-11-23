import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  buildGoogleAuthUrl,
  GOOGLE_STATE_COOKIE,
  isGoogleAuthConfigured,
} from '@/lib/google-auth';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const nextPath = request.nextUrl.searchParams.get('next') || '/';

  if (!isGoogleAuthConfigured()) {
    const fallbackUrl = new URL('/auth', origin);
    fallbackUrl.searchParams.set('error', 'google_not_configured');
    return NextResponse.redirect(fallbackUrl);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const statePayload = JSON.stringify({
    nonce,
    next: nextPath.startsWith('/') ? nextPath : '/',
  });
  const encodedState = Buffer.from(statePayload, 'utf8').toString('base64url');

  const googleUrl = buildGoogleAuthUrl({
    origin,
    state: encodedState,
  });

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return response;
}
