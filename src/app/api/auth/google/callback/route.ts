import { NextResponse, type NextRequest } from 'next/server';
import {
  attachGoogleSessionCookie,
  exchangeGoogleCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleOAuthConfig,
  GOOGLE_STATE_COOKIE,
  isGoogleAuthConfigured,
  isOwnerDriveConfigured,
  type GoogleSessionPayload,
} from '@/lib/google-auth';
import {
  loadAccountBundleFromDrive,
  saveAccountBundleToDrive,
} from '@/lib/google-drive-store';
import { sanitizeInternalRedirectPath } from '@/lib/security';
import type { AccountCloudBundle } from '@/types';

export const maxDuration = 30;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOwnerSetupHtml(params: {
  email: string;
  folderName: string;
  refreshToken: string;
  driveVerified: boolean;
  driveError?: string;
}): string {
  const safeEmail = escapeHtml(params.email);
  const safeFolder = escapeHtml(params.folderName);
  const safeToken = escapeHtml(params.refreshToken);
  const safeErr = params.driveError ? escapeHtml(params.driveError) : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Kích hoạt Kho Google Drive 5TB — SpeakMate AI</title>
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#f6f8fc;color:#0f172a;margin:0;padding:24px;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{max-width:620px;width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:24px;padding:28px;box-shadow:0 20px 50px rgba(15,23,42,.08)}
    .badge{display:inline-block;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
    h1{font-size:22px;margin:14px 0 8px}
    p{font-size:14px;color:#475569;line-height:1.6}
    .box{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:14px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;margin:14px 0}
    button{background:#4f46e5;color:#fff;border:0;border-radius:12px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer}
    button:hover{background:#4338ca}
    .warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:12px;padding:12px;font-size:13px;margin-top:12px}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">${params.driveVerified ? '✅ Đã kết nối Google Drive 5TB thành công' : '⚠️ Đã lấy Refresh Token'}</span>
    <h1>Kho Google Drive 5TB đã sẵn sàng!</h1>
    <p>Tài khoản chủ kho: <strong>${safeEmail}</strong><br/>Thư mục lưu dữ liệu trên Drive: <strong>${safeFolder}</strong></p>
    ${
      safeErr
        ? `<div class="warn">Lưu ý kiểm tra Drive API: ${safeErr}</div>`
        : ''
    }
    <p><strong>Bước cuối:</strong> Bấm nút bên dưới để sao chép <code>GOOGLE_DRIVE_OWNER_REFRESH_TOKEN</code> và gửi lại cho AI để gắn lên Vercel. Ngay khi gắn xong, trang kích hoạt này sẽ tự khóa vĩnh viễn và toàn bộ mọi tài khoản người dùng sẽ lưu tập trung vào Drive 5TB của bạn!</p>
    <div class="box" id="tok">${safeToken || 'KHÔNG CÓ REFRESH TOKEN — hãy vào myaccount.google.com/permissions gỡ quyền SpeakMate AI rồi mở lại link này'}</div>
    <button onclick="navigator.clipboard.writeText(document.getElementById('tok').innerText);this.innerText='✓ Đã sao chép! Hãy dán gửi cho AI';">📋 Sao chép Refresh Token</button>
  </div>
</body>
</html>`;
}

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
    const cookieState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;
    const decodedState = JSON.parse(
      Buffer.from(stateRaw, 'base64url').toString('utf8')
    ) as { nonce?: string; next?: string; mode?: 'login' | 'owner-setup' };

    const expectedCookieState = `${decodedState.mode === 'owner-setup' ? 'owner-setup' : 'login'}:${decodedState.nonce ?? ''}`;
    if (!cookieState || !decodedState.nonce || cookieState !== expectedCookieState) {
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

    // One-time Owner 5TB Drive setup flow (disabled automatically once owner token is configured)
    if (decodedState.mode === 'owner-setup' && !isOwnerDriveConfigured()) {
      const cfg = getGoogleOAuthConfig();
      let driveVerified = false;
      let driveError: string | undefined;

      try {
        // Test real read+write access into the owner's 5TB Google Drive without overwriting existing data
        const existing = await loadAccountBundleFromDrive(session);
        const testBundle: AccountCloudBundle = existing.bundle ?? {
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
        await saveAccountBundleToDrive(session, testBundle);
        driveVerified = true;
      } catch (err) {
        driveError =
          err instanceof Error
            ? err.message
            : 'Chưa bật Google Drive API trong Google Cloud Console.';
      }

      const html = renderOwnerSetupHtml({
        email: session.email,
        folderName: cfg.ownerFolderName,
        refreshToken: tokens.refreshToken ?? '',
        driveVerified,
        driveError,
      });

      const res = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, max-age=0',
          'Referrer-Policy': 'no-referrer',
        },
      });
      attachGoogleSessionCookie(res, session);
      res.cookies.set(GOOGLE_STATE_COOKIE, '', { path: '/', maxAge: 0 });
      return res;
    }

    // Standard Google login flow -> restore from Drive or send to 3-step /onboarding wizard
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
      // Allow login to proceed to onboarding smoothly
    }

    const safeNext = sanitizeInternalRedirectPath(decodedState.next, '/');
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
