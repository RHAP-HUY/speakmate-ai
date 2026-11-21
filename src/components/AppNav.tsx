'use client';

import {
  BookOpen,
  History,
  Home,
  LogIn,
  LogOut,
  PhoneCall,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { stopVoicePlayback } from '@/lib/audio';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { UserProfile } from '@/types';

interface AppNavProps {
  profile: UserProfile | null;
  authenticated: boolean;
}

const NAV_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/call', label: 'Gọi AI', icon: PhoneCall },
  { href: '/phrases', label: 'Sổ tay', icon: BookOpen },
  { href: '/history', label: 'Tiến độ', icon: History },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export function AppNav({ profile, authenticated }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const cloudEnabled = isSupabaseConfigured();

  async function handleSignOut() {
    stopVoicePlayback();
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/auth');
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">
                SpeakMate AI
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                Giao tiếp bản xứ
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!cloudEnabled && (
              <span className="hidden lg:inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                Chế độ trên máy (Chưa nối Supabase)
              </span>
            )}

            {authenticated && profile ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{profile.displayName || 'Học viên'}</span>
                  <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-700">
                    {profile.englishLevel}
                  </span>
                </Link>
                {cloudEnabled && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Đăng xuất"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5 py-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
                  active ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
