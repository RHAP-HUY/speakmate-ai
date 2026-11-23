import { NextResponse } from 'next/server';
import { clearGoogleSessionCookie } from '@/lib/google-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearGoogleSessionCookie(response);
  return response;
}
