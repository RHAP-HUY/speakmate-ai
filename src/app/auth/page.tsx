'use client';

import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Flame,
  Gamepad2,
  HardDrive,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { getAuthSessionInfo } from '@/lib/data-store';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { AuthSessionInfo } from '@/types';

type AuthMode = 'login' | 'signup' | 'magic';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('google_not_configured')) {
    return 'Server chưa gắn GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET. Hãy thêm 2 biến này trên Vercel để kích hoạt đăng nhập Google + lưu Google Drive 5TB!';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.';
  }
  if (lower.includes('user already registered')) {
    return 'Email này đã được đăng ký. Hãy chuyển sang tab Đăng nhập nhé!';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư đến (hoặc Spam).';
  }
  if (lower.includes('provider is not enabled')) {
    return 'Nhà cung cấp đăng nhập này chưa được bật trong bảng cấu hình Cloud.';
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
  const ownerDriveReady = Boolean(sessionInfo?.ownerDriveConfigured);
  const supabaseReady = Boolean(sessionInfo?.supabaseConfigured);

  async function handleGoogleSignIn() {
    setError(null);
    setNotice(null);
    setSetupHint(null);

    // 1. Direct Google OAuth 2.0 + Google Drive 5TB storage (preferred!)
    if (googleDirectReady) {
      setLoadingProvider('google');
      window.location.href = `/api/auth/google?next=${encodeURIComponent(nextPath)}`;
      return;
    }

    // 2. Supabase Google OAuth fallback if configured
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
      setError('Vui lòng nhập email.');
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
          'Đã gửi link đăng nhập nhanh vào email của bạn! Hãy mở hộp thư và bấm vào link.'
        );
        return;
      }

      if (password.length < 6) {
        setError('Mật khẩu cần tối thiểu 6 ký tự.');
        return;
      }

      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Hãy nhập tên bạn muốn AI gọi bạn nhé!');
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
          'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản rồi đăng nhập.'
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
    <div className="min-h-screen bg-mesh-light flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-12 items-stretch">
        {/* Left Feature Showcase */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-7 text-white shadow-2xl shadow-indigo-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

          <div className="relative space-y-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-2xl bg-white/15 backdrop-blur-md px-3.5 py-2 border border-white/20"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-extrabold tracking-tight">SpeakMate AI</span>
            </Link>

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Đăng nhập Google · Lưu thẳng vào Google Drive 5TB
              </h1>
              <p className="mt-2.5 text-sm text-indigo-100 leading-relaxed">
                Sau khi đăng nhập, bạn sẽ chọn <strong>Ngôn ngữ & Sở thích</strong> trong 30 giây. Mọi tài khoản, chuỗi học, XP, sổ tay & lịch sử gọi được lưu đồng bộ trên <strong>Google Drive</strong> để khôi phục 100% khi đổi máy!
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {[
                {
                  icon: HardDrive,
                  title: 'Lưu dữ liệu trực tiếp trên Google Drive',
                  desc: 'Tận dụng kho Drive 5TB siêu rộng — tự động khôi phục khi đăng nhập trên PC hay điện thoại mới.',
                },
                {
                  icon: Flame,
                  title: 'Lịch chuỗi & Phần thưởng mốc ngày',
                  desc: 'Hoàn thành ≥ 1 bài mỗi ngày để thắp lửa giữ chuỗi và mở rương quà.',
                },
                {
                  icon: Gamepad2,
                  title: 'Chơi để học + Gọi AI chấm phát âm',
                  desc: 'Minigame phản xạ 2 phút, ghép câu bản xứ & gọi thoại AI chấm từng từ.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 p-3 backdrop-blur-xs"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{item.title}</div>
                      <div className="text-[11px] text-indigo-100/90 mt-0.5 leading-snug">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mt-6 flex items-center gap-2 text-[11px] text-indigo-100/90">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Đồng bộ tức thì giữa iPhone, Android, Windows & macOS</span>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-slate-200/60 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
                  googleDirectReady || supabaseReady
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                }`}
              >
                {googleDirectReady ? (
                  <>
                    <Cloud className="h-3.5 w-3.5" />
                    {ownerDriveReady
                      ? 'Kho Google Drive 5TB Trung tâm đã sẵn sàng'
                      : 'Google Drive Cloud Sync đã sẵn sàng'}
                  </>
                ) : supabaseReady ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Đồng bộ đám mây đã sẵn sàng
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3.5 w-3.5" />
                    Chờ gắn khóa Google Cloud OAuth để bật lưu Drive 5TB
                  </>
                )}
              </span>
              <Link
                href="/"
                className="text-xs font-bold text-slate-500 hover:text-indigo-600"
              >
                ← Trang chủ
              </Link>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900">
              Đăng nhập & Thiết lập hồ sơ học
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Sau khi đăng nhập Google, bạn sẽ chọn <strong>Ngôn ngữ & Sở thích</strong> (3 bước nhanh) và toàn bộ dữ liệu sẽ tự đồng bộ lên Drive.
            </p>
          </div>

          {sessionInfo?.authenticated && sessionInfo.user && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <div className="font-extrabold">
                  ✓ Đang đăng nhập: {sessionInfo.user.name}
                </div>
                <div className="text-emerald-700 mt-0.5">
                  {sessionInfo.user.email} · Dữ liệu đang đồng bộ đám mây
                </div>
              </div>
              <Link
                href="/"
                className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
              >
                Vào học ngay →
              </Link>
            </div>
          )}

          {/* Primary OAuth Buttons: Google & Apple */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={loadingProvider !== null}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-extrabold text-slate-800 shadow-xs hover:border-indigo-400 hover:bg-indigo-50/40 hover:shadow-md disabled:opacity-60 transition cursor-pointer"
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
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
              <span>Tiếp tục với Google (Lưu Google Drive)</span>
            </button>

            <button
              type="button"
              onClick={() => void handleAppleSignIn()}
              disabled={loadingProvider !== null}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-900 bg-slate-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-sm hover:bg-slate-800 hover:shadow-md disabled:opacity-60 transition cursor-pointer"
            >
              {loadingProvider === 'apple' ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <svg
                  className="h-5 w-5 fill-current"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43Zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45Z" />
                </svg>
              )}
              <span>Tiếp tục với Apple</span>
            </button>
          </div>

          {/* Setup guide when Google OAuth credentials aren't attached on Vercel yet */}
          {!googleDirectReady && !supabaseReady && (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-950 space-y-1.5">
                <div className="font-extrabold text-amber-900">
                  {setupHint === 'Apple'
                    ? 'Kích hoạt đăng nhập Apple:'
                    : 'Chỉ cần thêm khóa Google Cloud OAuth để bật lưu trực tiếp lên Google Drive 5TB:'}
                </div>
                <p className="leading-relaxed text-amber-900/90">
                  {setupHint === 'Apple' ? (
                    <>
                      Đăng nhập Apple yêu cầu Apple Developer Services ID (hoặc bật Apple Provider trên Supabase). Trong khi đó, <strong>Google + Google Drive 5TB</strong> hoàn toàn miễn phí 100%!
                    </>
                  ) : (
                    <>
                      Thêm 2 biến môi trường{' '}
                      <code className="font-mono font-bold">GOOGLE_CLIENT_ID</code> và{' '}
                      <code className="font-mono font-bold">GOOGLE_CLIENT_SECRET</code>{' '}
                      (với Redirect URI{' '}
                      <code className="font-mono font-bold">
                        https://speakmate-ai-nu.vercel.app/api/auth/google/callback
                      </code>
                      ) trên Vercel là đăng nhập Google + tự lưu Drive 5TB hoạt động ngay!
                    </>
                  )}
                </p>
              </div>

              <Link
                href="/onboarding"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-cyan-700 transition"
              >
                Chọn Ngôn ngữ & Sở thích (3 bước) ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Optional Email fallback when Supabase is configured */}
          {supabaseReady && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <button
                  type="button"
                  onClick={() => setShowEmailForm((v) => !v)}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer"
                >
                  {showEmailForm
                    ? 'Ẩn đăng nhập Email'
                    : 'Hoặc dùng Email / Mật khẩu'}
                </button>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {showEmailForm && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1">
                    {(
                      [
                        { id: 'login', label: 'Đăng nhập' },
                        { id: 'signup', label: 'Đăng ký' },
                        { id: 'magic', label: 'Link Email' },
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
                        className={`rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                          mode === tab.id
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {mode === 'signup' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Tên bạn muốn AI gọi
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Ví dụ: Huy, Minh, Alex..."
                            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="ban@example.com"
                          required
                          className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {mode !== 'magic' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Mật khẩu
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ít nhất 6 ký tự"
                            required
                            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingProvider !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-60 transition cursor-pointer"
                    >
                      {loadingProvider === 'email' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' && 'Đăng nhập'}
                          {mode === 'signup' && 'Tạo tài khoản & Chọn sở thích'}
                          {mode === 'magic' && 'Gửi link đăng nhập qua Email'}
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
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-mesh-light">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
