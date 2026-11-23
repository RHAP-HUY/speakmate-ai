'use client';

import {
  BookOpen,
  CalendarDays,
  Cloud,
  Flame,
  Gamepad2,
  Home,
  LogIn,
  LogOut,
  PhoneCall,
  Settings,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { stopVoicePlayback } from '@/lib/audio';
import {
  DATA_UPDATED_EVENT,
  getAuthSessionInfo,
  signOutAccount,
} from '@/lib/data-store';
import { BADGE_DIRECTORY, getLevelInfo } from '@/lib/gamification';
import type { AuthSessionInfo, UserProfile } from '@/types';

interface AppNavProps {
  profile: UserProfile | null;
  authenticated: boolean;
}

const NAV_ITEMS = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/play', label: 'Chơi & Học', icon: Gamepad2 },
  { href: '/call', label: 'Gọi AI', icon: PhoneCall },
  { href: '/history', label: 'Lịch chuỗi', icon: CalendarDays },
  { href: '/phrases', label: 'Sổ tay', icon: BookOpen },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export function AppNav({ profile, authenticated }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(profile);
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);

  const displayedProfile = liveProfile ?? profile;

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const info = await getAuthSessionInfo();
      if (active) setSessionInfo(info);
    }
    void loadSession();

    function onDataUpdated(ev: Event) {
      const customEv = ev as CustomEvent<{ profile?: UserProfile | null }>;
      if (customEv.detail && 'profile' in customEv.detail) {
        setLiveProfile(customEv.detail.profile ?? null);
      }
    }
    window.addEventListener(DATA_UPDATED_EVENT, onDataUpdated);
    return () => {
      active = false;
      window.removeEventListener(DATA_UPDATED_EVENT, onDataUpdated);
    };
  }, []);

  const currentProfile =
    profile && liveProfile && profile.id === liveProfile.id
      ? liveProfile.xp >= profile.xp &&
        liveProfile.gems === profile.gems &&
        liveProfile.displayName === profile.displayName
        ? profile
        : liveProfile
      : displayedProfile;

  const levelInfo = currentProfile ? getLevelInfo(currentProfile.xp) : null;
  const activeBadgeLabel = currentProfile?.activeBadge
    ? BADGE_DIRECTORY[currentProfile.activeBadge]
    : null;
  const isCloudLoggedIn = Boolean(
    sessionInfo?.authenticated && sessionInfo.provider !== 'local'
  );
  const isDriveActive =
    sessionInfo?.storageMode === 'google-drive-owner' ||
    sessionInfo?.storageMode === 'google-drive-user';

  async function handleSignOut() {
    stopVoicePlayback();
    await signOutAccount();
    router.push('/auth');
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                SpeakMate AI
              </span>
              {activeBadgeLabel ? (
                <span className="hidden sm:inline-block ml-2 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  {activeBadgeLabel}
                </span>
              ) : isDriveActive ? (
                <span className="hidden sm:inline-flex items-center gap-1 ml-2 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Cloud className="h-3 w-3" />
                  Drive Sync
                </span>
              ) : (
                <span className="hidden sm:inline-block ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  Chơi để học
                </span>
              )}
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
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
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {authenticated && currentProfile && levelInfo ? (
              <>
                {/* Live Streak & Gems HUD */}
                <Link
                  href="/history"
                  title="Xem Lịch chuỗi & Phần thưởng"
                  className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-600 hover:bg-orange-100 transition"
                >
                  <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
                  <span>{currentProfile.streakDays}</span>
                </Link>

                <Link
                  href="/history#rewards"
                  title="Ngọc đổi quà"
                  className="hidden sm:inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-extrabold text-cyan-700 hover:bg-cyan-100 transition"
                >
                  <span>💎</span>
                  <span>{currentProfile.gems}</span>
                </Link>

                <Link
                  href="/settings"
                  className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    Lv.{levelInfo.level}
                  </span>
                  <span className="max-w-20 truncate">
                    {currentProfile.displayName || 'Học viên'}
                  </span>
                </Link>

                {isCloudLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    title="Đăng xuất"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    title="Đăng nhập Google để lưu lên Google Drive 5TB"
                    className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">Google Drive</span>
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-indigo-700 hover:to-cyan-700 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/90 bg-white/95 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-6 py-1.5 px-1">
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
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold transition ${
                  active ? 'text-indigo-600 bg-indigo-50/70' : 'text-slate-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
