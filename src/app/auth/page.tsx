'use client';

import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

type AuthMode = 'login' | 'signup' | 'magic';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.';
  }
  if (lower.includes('user already registered')) {
    return 'Email này đã được đăng ký. Hãy chuyển sang tab Đăng nhập nhé!';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư đến (hoặc Spam) để bấm link xác nhận.';
  }
  if (lower.includes('password should be at least')) {
    return 'Mật khẩu cần có ít nhất 6 ký tự.';
  }
  return message;
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';
  const callbackError = searchParams.get('error');

  const cloudEnabled = isSupabaseConfigured();

  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackError ? 'Đăng nhập Google/Email không thành công, vui lòng thử lại.' : null
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    setError(null);
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          nextPath
        )}`,
      },
    });
    if (oauthErr) {
      setError(translateAuthError(oauthErr.message));
      setLoading(false);
    }
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

    setLoading(true);
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
          'Đã gửi link đăng nhập nhanh vào email của bạn! Hãy mở hộp thư và bấm vào link để vào học.'
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
            data: {
              display_name: displayName.trim(),
            },
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

      // Login
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

        if (!profile || !profile.onboarding_completed) {
          router.push('/onboarding');
        } else {
          router.push(nextPath);
        }
        router.refresh();
      }
    } catch (err) {
      setError(
        translateAuthError(
          err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.'
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-cyan-50/40 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 shadow-sm border border-slate-200/80 mb-4"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-bold text-slate-900">SpeakMate AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Luyện nói tiếng Anh như người bản xứ
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Đăng nhập để đồng bộ cuộc gọi, từ vựng & tiến độ trên cả máy tính và điện thoại.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/50">
          {!cloudEnabled ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold mb-1">
                  Supabase chưa được cấu hình trên server này
                </p>
                <p className="text-xs leading-relaxed text-amber-800">
                  Để bật đăng nhập nhiều tài khoản & đồng bộ đa thiết bị, hãy điền{' '}
                  <code className="font-mono font-semibold">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
                  và{' '}
                  <code className="font-mono font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
                  vào <code className="font-mono">.env.local</code> rồi chạy script{' '}
                  <code className="font-mono">supabase/schema.sql</code>.
                </p>
              </div>
              <Link
                href="/onboarding"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition"
              >
                Vào dùng thử ngay trên máy này
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="grid grid-cols-3 rounded-2xl bg-slate-100 p-1 mb-5">
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

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 transition cursor-pointer"
              >
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
                Tiếp tục với Google
              </button>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-medium text-slate-400">
                  hoặc bằng Email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Bạn muốn AI gọi bạn bằng tên gì?
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ví dụ: Minh, Linh, Alex..."
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                      className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{notice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-60 transition cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' && 'Đăng nhập'}
                      {mode === 'signup' && 'Tạo tài khoản & Thiết lập hồ sơ'}
                      {mode === 'magic' && 'Gửi link đăng nhập qua Email'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
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
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
