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
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { NovaCompanion } from '@/components/BrandArt';
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
        {/* Left Aurora Studio Showcase with Glowing Nova */}
        <div className="lg:col-span-5 aurora-studio-card rounded-3xl border border-white/15 p-7 text-white flex flex-col justify-between shadow-2xl shadow-indigo-950/25">
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-xs">
                <NovaCompanion
                  mood="happy"
                  className="h-10 w-10 transition-transform group-hover:scale-105"
                />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight leading-none bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
                  SpeakMate AI
                </div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-200/90 mt-0.5">
                  Aurora Voice Studio
                </div>
              </div>
            </Link>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                Đăng nhập Google · Lưu trọn đời trên Drive 5TB
              </h1>
              <p className="mt-2.5 text-sm font-medium text-indigo-100/90 leading-relaxed">
                Chọn <strong>Ngôn ngữ &amp; Sở thích</strong> trong 30 giây cùng Nova AI. Mọi chuỗi ngày học, rương quà, XP &amp; sổ từ vựng tự động đồng bộ đa thiết bị!
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  icon: Gamepad2,
                  title: 'Mặc định Vừa Học Vừa Chơi',
                  desc: 'Lộ trình game phản xạ 2 phút + gọi thoại AI chấm từng từ.',
                },
                {
                  icon: Flame,
                  title: 'Lịch Chuỗi & Rương Phần Thưởng',
                  desc: 'Giữ chuỗi 1, 3, 7, 14, 30 ngày nhận XP, Ngọc 💎 & Khiên 🧊.',
                },
                {
                  icon: HardDrive,
                  title: 'Đồng bộ Google Drive 5TB',
                  desc: 'Đổi máy tính hay điện thoại chỉ cần đăng nhập Google là khôi phục 100%.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/80 to-cyan-400/80">
                      <Icon className="h-4 w-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-xs font-black">{item.title}</div>
                      <div className="text-[11px] font-medium text-indigo-100/85 mt-0.5 leading-snug">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-cyan-200/90">
            <Smartphone className="h-4 w-4 shrink-0" />
            <span>Đồng bộ mượt giữa iPhone, Android, Windows &amp; macOS</span>
          </div>
        </div>

        {/* Right Crisp Sign-In Card */}
        <div className="lg:col-span-7 card-duo-elevated p-6 sm:p-8 flex flex-col justify-center">
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[11px] font-black ${
                  googleDirectReady || supabaseReady
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700'
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
                    Sẵn sàng thiết lập hồ sơ
                  </>
                )}
              </span>
              <Link
                href="/"
                className="text-xs font-extrabold text-slate-400 hover:text-slate-800"
              >
                ← Trang chủ
              </Link>
            </div>

            <h2 className="text-2xl font-black text-slate-900">
              Chào mừng bạn đến SpeakMate!
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Đăng nhập bằng Google để chọn <strong>Ngôn ngữ &amp; Sở thích</strong> và lưu tiến độ vĩnh viễn.
            </p>
          </div>

          {sessionInfo?.authenticated && sessionInfo.user && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <div className="font-black">
                  ✓ Đang đăng nhập: {sessionInfo.user.name}
                </div>
                <div className="font-semibold mt-0.5">
                  {sessionInfo.user.email} · Dữ liệu đang đồng bộ Google Drive 5TB
                </div>
              </div>
              <Link
                href="/"
                className="btn-duo btn-duo-primary px-4 py-2 text-xs uppercase"
              >
                Vào học ngay →
              </Link>
            </div>
          )}

          {/* Primary 3D OAuth Buttons */}
          <div className="space-y-3">
            {googleDirectReady ? (
              <a
                href={googleAuthHref}
                onClick={() => setLoadingProvider('google')}
                className="btn-duo btn-duo-white w-full px-5 py-4 text-sm text-slate-800"
              >
                {loadingProvider === 'google' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#1CB0F6]" />
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
                <span>Tiếp tục với Google (Lưu Drive 5TB)</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => void handleGoogleFallbackSignIn()}
                disabled={loadingProvider !== null}
                className="btn-duo btn-duo-white w-full px-5 py-4 text-sm text-slate-800"
              >
                {loadingProvider === 'google' ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#1CB0F6]" />
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
                <span>Tiếp tục với Google (Lưu Drive 5TB)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleAppleSignIn()}
              disabled={loadingProvider !== null}
              className="btn-duo btn-duo-dark w-full px-5 py-4 text-sm"
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

          {setupHint === 'Apple' && (
            <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">
              Đăng nhập Apple cần Apple Developer Services ID (trả phí Apple). Bạn nên chọn{' '}
              <strong>Tiếp tục với Google</strong> ở trên — miễn phí 100% và tự lưu ngay vào Google Drive 5TB!
            </div>
          )}

          {!googleDirectReady && !supabaseReady && (
            <div className="mt-4">
              <Link
                href="/onboarding"
                className="btn-duo btn-duo-green w-full py-3.5 text-sm uppercase"
              >
                Chọn Ngôn ngữ &amp; Sở thích ngay
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </Link>
            </div>
          )}

          {supabaseReady && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <button
                  type="button"
                  onClick={() => setShowEmailForm((v) => !v)}
                  className="text-xs font-extrabold text-slate-500 hover:text-[#1899D6] cursor-pointer"
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
                        className={`rounded-xl py-2 text-xs font-extrabold transition cursor-pointer ${
                          mode === tab.id
                            ? 'bg-white text-[#1899D6] shadow-xs'
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
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                          Tên bạn muốn AI gọi
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Ví dụ: Huy, Minh, Alex..."
                            className="w-full rounded-xl border-2 border-slate-200 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-[#1CB0F6] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
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
                          className="w-full rounded-xl border-2 border-slate-200 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-[#1CB0F6] focus:outline-none"
                        />
                      </div>
                    </div>

                    {mode !== 'magic' && (
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
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
                            className="w-full rounded-xl border-2 border-slate-200 py-2.5 pl-10 pr-4 text-sm font-semibold focus:border-[#1CB0F6] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loadingProvider !== null}
                      className="btn-duo btn-duo-green w-full py-3.5 text-sm uppercase"
                    >
                      {loadingProvider === 'email' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {mode === 'login' && 'Đăng nhập'}
                          {mode === 'signup' && 'Tạo tài khoản & Chọn sở thích'}
                          {mode === 'magic' && 'Gửi link đăng nhập qua Email'}
                          <ArrowRight className="h-4 w-4 stroke-[3]" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-extrabold text-emerald-700">
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
