import { NextResponse, type NextRequest } from 'next/server';
import {
  attachGoogleSessionCookie,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
  GOOGLE_STATE_COOKIE,
  isGoogleAuthConfigured,
  type GoogleSessionPayload,
} from '@/lib/google-auth';
import {
  loadAccountBundleFromDrive,
  saveAccountBundleToDrive,
} from '@/lib/google-drive-store';
import type { AccountCloudBundle } from '@/types';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get('code');
  const stateRaw = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error');

  if (oauthError || !code || !stateRaw || !isGoogleAuthConfigured()) {
    const errUrl = new URL('/auth', origin);
    errUrl.searchParams.set('error', oauthError || 'google_callback_failed');
    return NextResponse.redirect(errUrl);
  }

  try {
    const cookieNonce = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
    const decodedState = JSON.parse(
      Buffer.from(stateRaw, 'base64url').toString('utf8')
    ) as { nonce?: string; next?: string };

    if (!cookieNonce || decodedState.nonce !== cookieNonce) {
      const errUrl = new URL('/auth', origin);
      errUrl.searchParams.set('error', 'invalid_state');
      return NextResponse.redirect(errUrl);
    }

    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokens = await exchangeGoogleCodeForTokens({ code, redirectUri });
    const userInfo = await fetchGoogleUserInfo(tokens.accessToken);

    const session: GoogleSessionPayload = {
      userId: `google_${userInfo.sub}`,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture ?? null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiresAt: Date.now() + Math.max(60, tokens.expiresIn - 120) * 1000,
    };

    // Check Google Drive for existing account data (restore seamlessly on any device)
    let onboardingDone = false;
    try {
      const { bundle } = await loadAccountBundleFromDrive(session);
      if (bundle?.profile) {
        onboardingDone = Boolean(bundle.profile.onboardingCompleted);
      } else {
        const initialBundle: AccountCloudBundle = {
          version: 3,
          accountId: session.userId,
          email: session.email,
          provider: 'google',
          updatedAt: new Date().toISOString(),
          profile: {
            id: session.userId,
            email: session.email,
            displayName: session.name,
            avatarUrl: session.picture ?? null,
            nativeLanguage: 'vi',
            englishLevel: 'A0-A1',
            jobField: '',
            hobbies: [],
            preferredAccent: 'US',
            preferredSpeed: 0.85,
            dailyGoalMinutes: 15,
            streakDays: 0,
            longestStreak: 0,
            lastPracticeDate: null,
            onboardingCompleted: false,
            apiKeyMode: 'system',
            personalKeyHint: null,
            xp: 0,
            gems: 30,
            streakFreezes: 1,
            claimedMilestones: [],
            unlockedBadges: [],
            activeBadge: null,
            totalLessonsCompleted: 0,
          },
          dailyStats: [],
          phrases: [],
          conversations: [],
          messagesByConversation: {},
        };
        await saveAccountBundleToDrive(session, initialBundle);
      }
    } catch {
      // Allow sign-in to proceed to onboarding even if initial Drive call hit transient latency
    }

    const safeNext =
      decodedState.next && decodedState.next.startsWith('/')
        ? decodedState.next
        : '/';
    const targetPath = onboardingDone ? safeNext : '/onboarding';

    const response = NextResponse.redirect(new URL(targetPath, origin));
    attachGoogleSessionCookie(response, session);
    response.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    const errUrl = new URL('/auth', origin);
    errUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'google_auth_error'
    );
    return NextResponse.redirect(errUrl);
  }
}
