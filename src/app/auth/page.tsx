'use client';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { NovaCompanion, TutorAvatar } from '@/components/BrandArt';
import { getAuthSessionInfo } from '@/lib/data-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthSessionInfo } from '@/types';

type AuthMode = 'login' | 'signup' | 'magic';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('google_not_configured')) {
    return 'Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trên máy chủ.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa chính xác.';
  }
  if (lower.includes('user already registered')) {
    return 'Email này đã được đăng ký. Mời bạn chuyển sang mục Đăng nhập.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư đến.';
  }
  return message;
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const callbackError = searchParams.get('error');

  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loadingProvider, setLoadingProvider] = useState<
    'google' | 'apple' | 'email' | null
  >(null);
  const [error, setError] = useState<string | null>(
    callbackError ? translateAuthError(callbackError) : null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [setupHint, setSetupHint] = useState<'Google' | 'Apple' | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const info = await getAuthSessionInfo(true);
      if (!active) return;
      setSessionInfo(info);
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const googleDirectReady = Boolean(sessionInfo?.googleConfigured);
  const supabaseReady = Boolean(sessionInfo?.supabaseConfigured);
  const googleAuthHref = `/api/auth/google?next=${encodeURIComponent(nextPath)}`;

  async function handleGoogleFallbackSignIn() {
    setError(null);
    setNotice(null);
    setSetupHint(null);

    if (supabaseReady) {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      setLoadingProvider('google');
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextPath
          )}`,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      });
      if (oauthErr) {
        setError(translateAuthError(oauthErr.message));
        setLoadingProvider(null);
      }
      return;
    }

    setSetupHint('Google');
  }

  async function handleAppleSignIn() {
    setError(null);
    setNotice(null);
    setSetupHint(null);

    if (supabaseReady) {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;
      setLoadingProvider('apple');
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextPath
          )}`,
        },
      });
      if (oauthErr) {
        setError(translateAuthError(oauthErr.message));
        setLoadingProvider(null);
      }
      return;
    }

    setSetupHint('Apple');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push('/onboarding');
      return;
    }

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }

    setLoadingProvider('email');
    try {
      if (mode === 'magic') {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath
            )}`,
          },
        });
        if (otpErr) throw otpErr;
        setNotice(
          'Đã gửi liên kết đăng nhập vào hộp thư của bạn. Vui lòng mở email để tiếp tục.'
        );
        return;
      }

      if (password.length < 6) {
        setError('Mật khẩu cần tối thiểu 6 ký tự.');
        return;
      }

      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Vui lòng nhập tên gọi của bạn.');
          return;
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (signUpErr) throw signUpErr;
        if (data.session) {
          router.push('/onboarding');
          router.refresh();
          return;
        }
        setNotice(
          'Đăng ký thành công. Vui lòng xác nhận qua email rồi đăng nhập.'
        );
        setMode('login');
        return;
      }

      const { data: loginData, error: loginErr } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (loginErr) throw loginErr;

      if (loginData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', loginData.user.id)
          .maybeSingle();

        router.push(!profile || !profile.onboarding_completed ? '/onboarding' : nextPath);
        router.refresh();
      }
    } catch (err) {
      setError(
        translateAuthError(
          err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.'
        )
      );
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Split Lifestyle Photo Panel (Airbnb / Preply Craft) */}
      <aside className="hidden lg:relative lg:flex lg:w-[48%] xl:w-[50%] flex-col justify-between overflow-hidden bg-gray-900 p-10 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/auth-lifestyle.jpg"
          alt="Không gian học tiếng Anh buổi sáng với tai nghe và sổ tay"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/30" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <NovaCompanion className="h-9 w-9 shadow-md" />
            <span className="font-display text-xl font-bold tracking-tight text-white">
              SpeakMate
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <blockquote className="font-display text-2xl font-semibold leading-snug text-white">
            &ldquo;Chỉ 10 phút mỗi sáng nghe giọng bản xứ và mở lời nói theo tình huống thật đã thay đổi hoàn toàn sự tự tin khi họp tiếng Anh của mình.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TutorAvatar personaId="emma-us" className="h-9 w-9 ring-2 ring-white/80" />
              <TutorAvatar personaId="sonia-uk" className="h-9 w-9 ring-2 ring-white/80" />
              <TutorAvatar personaId="andrew-us" className="h-9 w-9 ring-2 ring-white/80" />
            </div>
            <div className="text-xs text-white/85">
              <div className="font-semibold text-white">6 người hướng dẫn bản xứ</div>
              <div>Đồng bộ tự động trên Google Drive của riêng bạn</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Sign-In Column */}
      <div className="flex-1 flex flex-col justify-between px-5 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 lg:invisible">
            <NovaCompanion className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-gray-900">
              SpeakMate
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại trang chủ
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[400px] my-10 space-y-7">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
              Chào mừng trở lại
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Đăng nhập để đồng bộ chuỗi ngày học, lịch ôn từ vựng SRS và sổ nhận xét hội thoại trên mọi thiết bị.
            </p>
          </div>

          <div className="space-y-5">
            {sessionInfo?.authenticated && sessionInfo.user && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-900">
                  <div className="font-semibold">
                    Đang đăng nhập: {sessionInfo.user.name}
                  </div>
                  <div className="text-gray-600 mt-0.5">
                    {sessionInfo.user.email}
                  </div>
                </div>
                <Link
                  href="/"
                  className="btn-duo btn-duo-primary px-4 py-2 text-xs"
                >
                  Vào học →
                </Link>
              </div>
            )}

            <div className="space-y-3">
              {googleDirectReady ? (
                <a
                  href={googleAuthHref}
                  onClick={() => setLoadingProvider('google')}
                  className="btn-duo btn-duo-white w-full px-5 py-3.5 text-sm shadow-xs"
                >
                  {loadingProvider === 'google' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                  )}
                  <span>Tiếp tục với tài khoản Google</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleGoogleFallbackSignIn()}
                  disabled={loadingProvider !== null}
                  className="btn-duo btn-duo-white w-full px-5 py-3.5 text-sm shadow-xs"
                >
                  {loadingProvider === 'google' && (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  )}
                  <span>Tiếp tục với tài khoản Google</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleAppleSignIn()}
                disabled={loadingProvider !== null}
                className="btn-duo btn-duo-primary w-full px-5 py-3.5 text-sm"
              >
                {loadingProvider === 'apple' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <svg
                    className="h-4 w-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43Zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45Z" />
                  </svg>
                )}
                <span>Tiếp tục với Apple</span>
              </button>
            </div>

            {setupHint === 'Apple' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed">
                Tính năng đăng nhập Apple cần chứng chỉ Apple Developer riêng. Bạn có thể chọn{' '}
                <strong>Tiếp tục với tài khoản Google</strong> ở trên để sử dụng ngay và đồng bộ Google Drive.
              </div>
            )}

            {!googleDirectReady && !supabaseReady && (
              <Link
                href="/onboarding"
                className="btn-duo btn-duo-coral w-full py-3.5 text-sm"
              >
                Thiết lập hồ sơ học tập
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {supabaseReady && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <button
                    type="button"
                    onClick={() => setShowEmailForm((v) => !v)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    {showEmailForm ? 'Ẩn đăng nhập email' : 'Hoặc dùng email'}
                  </button>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                {showEmailForm && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1">
                      {(
                        [
                          { id: 'login', label: 'Đăng nhập' },
                          { id: 'signup', label: 'Đăng ký' },
                          { id: 'magic', label: 'Liên kết' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setMode(tab.id);
                            setError(null);
                            setNotice(null);
                          }}
                          className={`rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
                            mode === tab.id
                              ? 'bg-white text-gray-900 shadow-2xs'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                      {mode === 'signup' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Tên gọi của bạn
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="Ví dụ: Minh, Thảo..."
                              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ban@example.com"
                            required
                            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none"
                          />
                        </div>
                      </div>

                      {mode !== 'magic' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Mật khẩu
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Tối thiểu 6 ký tự"
                              required
                              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-gray-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loadingProvider !== null}
                        className="btn-duo btn-duo-coral w-full py-3 text-sm"
                      >
                        {loadingProvider === 'email' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            {mode === 'login' && 'Đăng nhập'}
                            {mode === 'signup' && 'Tạo tài khoản'}
                            {mode === 'magic' && 'Gửi liên kết qua email'}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                {error}
              </div>
            )}

            {notice && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{notice}</span>
              </div>
            )}
          </div>
        </main>

        <footer className="text-center text-xs text-gray-500 space-y-1.5">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-gray-900 underline">
              Chính sách quyền riêng tư
            </Link>
            <Link href="/terms" className="hover:text-gray-900 underline">
              Điều khoản sử dụng
            </Link>
            <Link href="/placement" className="hover:text-gray-900 underline">
              Kiểm tra CEFR 2 phút
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
