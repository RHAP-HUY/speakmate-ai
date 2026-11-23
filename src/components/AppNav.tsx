'use client';

import {
  BookOpen,
  Cloud,
  Compass,
  Crown,
  Gamepad2,
  LogIn,
  LogOut,
  PhoneCall,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  GemSvg,
  NovaCompanion,
  StreakFlameSvg,
} from '@/components/BrandArt';
import { stopVoicePlayback } from '@/lib/audio';
import {
  DATA_UPDATED_EVENT,
  getAuthSessionInfo,
  getDriveSyncStatus,
  signOutAccount,
  SYNC_STATUS_EVENT,
  type DriveSyncStatus,
} from '@/lib/data-store';
import {
  BADGE_DIRECTORY,
  getClaimableMilestones,
  getLevelInfo,
  getXpBoostRemainingMinutes,
  isXpBoostActive,
} from '@/lib/gamification';
import { isSoundMuted, playTapSound, setSoundMuted } from '@/lib/sound-fx';
import type { AuthSessionInfo, UserProfile } from '@/types';

interface AppNavProps {
  profile: UserProfile | null;
  authenticated: boolean;
  variant?: 'app' | 'landing';
}

const SIDEBAR_ITEMS = [
  {
    href: '/',
    label: 'Học & Chơi',
    shortLabel: 'Học',
    icon: Compass,
    iconBg: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white',
  },
  {
    href: '/play',
    label: 'Đấu trường Game',
    shortLabel: 'Game',
    icon: Gamepad2,
    iconBg: 'bg-gradient-to-br from-orange-500 to-rose-500 text-white',
  },
  {
    href: '/call',
    label: 'Gọi Gia sư AI',
    shortLabel: 'Gọi AI',
    icon: PhoneCall,
    iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
  },
  {
    href: '/history',
    label: 'Chuỗi & Quà',
    shortLabel: 'Chuỗi',
    icon: Trophy,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  },
  {
    href: '/leaderboard',
    label: 'Bảng Xếp Hạng',
    shortLabel: 'Xếp hạng',
    icon: Crown,
    iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-500 text-white',
  },
  {
    href: '/phrases',
    label: 'Sổ Từ Vựng',
    shortLabel: 'Sổ tay',
    icon: BookOpen,
    iconBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white',
  },
  {
    href: '/settings',
    label: 'Hồ sơ & Cài đặt',
    shortLabel: 'Cài đặt',
    icon: Settings,
    iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900 text-white',
  },
];

const MOBILE_TABS = SIDEBAR_ITEMS.filter(
  (i) => i.href !== '/phrases' && i.href !== '/settings'
);

export function AppNav({ profile, authenticated, variant }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(profile);
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);
  const [muted, setMuted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<DriveSyncStatus>(() =>
    getDriveSyncStatus()
  );

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const info = await getAuthSessionInfo();
      if (active) {
        setSessionInfo(info);
        setMuted(isSoundMuted());
      }
    }
    void loadSession();

    function onDataUpdated(ev: Event) {
      const customEv = ev as CustomEvent<{ profile?: UserProfile | null }>;
      if (customEv.detail && 'profile' in customEv.detail) {
        setLiveProfile(customEv.detail.profile ?? null);
      }
    }
    function onSyncStatus(ev: Event) {
      const customEv = ev as CustomEvent<{ status?: DriveSyncStatus }>;
      if (customEv.detail?.status) {
        setSyncStatus(customEv.detail.status);
      }
    }
    window.addEventListener(DATA_UPDATED_EVENT, onDataUpdated);
    window.addEventListener(SYNC_STATUS_EVENT, onSyncStatus);
    return () => {
      active = false;
      window.removeEventListener(DATA_UPDATED_EVENT, onDataUpdated);
      window.removeEventListener(SYNC_STATUS_EVENT, onSyncStatus);
    };
  }, []);

  const currentProfile =
    profile && liveProfile && profile.id === liveProfile.id
      ? liveProfile.xp >= profile.xp &&
        liveProfile.gems === profile.gems &&
        liveProfile.displayName === profile.displayName &&
        liveProfile.claimedMilestones.length === profile.claimedMilestones.length
        ? profile
        : liveProfile
      : liveProfile ?? profile;

  const resolvedVariant = variant ?? (authenticated ? 'app' : 'landing');
  const levelInfo = currentProfile ? getLevelInfo(currentProfile.xp) : null;
  const activeBadgeLabel = currentProfile?.activeBadge
    ? BADGE_DIRECTORY[currentProfile.activeBadge]
    : null;
  const claimableCount = currentProfile
    ? getClaimableMilestones(
        currentProfile.streakDays,
        currentProfile.longestStreak,
        currentProfile.claimedMilestones
      ).length
    : 0;
  const xpBoostOn = currentProfile
    ? isXpBoostActive(currentProfile.xpBoostUntil)
    : false;
  const xpBoostMins = currentProfile
    ? getXpBoostRemainingMinutes(currentProfile.xpBoostUntil)
    : 0;

  const isCloudLoggedIn = Boolean(
    sessionInfo?.authenticated && sessionInfo.provider !== 'local'
  );
  const isDriveActive =
    sessionInfo?.storageMode === 'google-drive-owner' ||
    sessionInfo?.storageMode === 'google-drive-user';

  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
    if (!next) playTapSound();
  }

  async function handleSignOut() {
    stopVoicePlayback();
    await signOutAccount();
    router.push('/auth');
    router.refresh();
  }

  // PUBLIC LANDING HEADER (Aurora Studio Glass Top Bar)
  if (resolvedVariant === 'landing') {
    return (
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <NovaCompanion
              mood="happy"
              className="h-10 w-10 transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent leading-none">
                SpeakMate AI
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">
                Aurora Voice Studio
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-xs font-extrabold text-indigo-700">
              <Cloud className="h-3.5 w-3.5 text-cyan-600" />
              Đồng bộ Google Drive 5TB
            </span>
            <Link
              href="/auth"
              className="btn-duo btn-duo-primary px-5 py-2.5 text-xs uppercase tracking-wide"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // AUTHENTICATED APP NAVIGATION: Aurora Glass Left Sidebar (Desktop) + Top HUD & Bottom Bar (Mobile)
  return (
    <>
      {/* Desktop Fixed Left Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col justify-between border-r border-slate-200/80 bg-white/92 backdrop-blur-xl px-4 py-5">
        <div className="space-y-6">
          {/* Brand Wordmark */}
          <Link
            href="/"
            onClick={() => playTapSound()}
            className="flex items-center gap-2.5 px-2 group"
          >
            <NovaCompanion
              mood={currentProfile && currentProfile.streakDays >= 3 ? 'fire' : 'happy'}
              className="h-11 w-11 shrink-0 transition-transform group-hover:scale-105"
            />
            <div>
              <div className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent leading-none">
                SpeakMate
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                Học &amp; Chơi cùng Nova
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Điều hướng chính">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              const showBadge = item.href === '/history' && claimableCount > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => playTapSound()}
                  className={`group flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-extrabold uppercase tracking-wide transition ${
                    active
                      ? 'bg-gradient-to-r from-indigo-50 via-violet-50/75 to-cyan-50/60 border border-indigo-200 text-indigo-700 shadow-xs'
                      : 'border border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${item.iconBg}`}
                    >
                      <Icon className="h-4 w-4 stroke-[2.5]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {showBadge && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-1.5 text-[10px] font-black text-white shadow-xs animate-bounce">
                      {claimableCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: 2x XP Status + Sound Toggle + Cloud Identity Card */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          {xpBoostOn && (
            <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-3 py-2 text-xs font-black text-violet-700">
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 fill-amber-400 text-orange-500" />
                Đang bật 2x XP
              </span>
              <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                {xpBoostMins}p
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSound}
            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {muted ? (
                <VolumeX className="h-4 w-4 text-slate-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-indigo-600" />
              )}
              Âm thanh hiệu ứng
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                muted
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {muted ? 'TẮT' : 'BẬT'}
            </span>
          </button>

          {currentProfile && levelInfo && (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/75 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 text-sm font-black text-white shadow-xs">
                    {(currentProfile.displayName || 'H').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-600">
                      {currentProfile.displayName || 'Học viên'}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 truncate">
                      Lv.{levelInfo.level} · {currentProfile.englishLevel}
                    </div>
                  </div>
                </Link>

                {isCloudLoggedIn && (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    title="Đăng xuất"
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>

              {activeBadgeLabel && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[10px] font-extrabold text-amber-800 truncate">
                  {activeBadgeLabel}
                </div>
              )}

              {isDriveActive ? (
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-extrabold ${
                    syncStatus === 'offline' || syncStatus === 'pending'
                      ? 'text-amber-700'
                      : syncStatus === 'syncing'
                        ? 'text-indigo-700'
                        : 'text-emerald-700'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      syncStatus === 'offline' || syncStatus === 'pending'
                        ? 'bg-amber-500'
                        : syncStatus === 'syncing'
                          ? 'bg-indigo-500 animate-ping'
                          : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                  <Cloud className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {syncStatus === 'syncing'
                      ? 'Đang đồng bộ Drive 5TB...'
                      : syncStatus === 'offline'
                        ? 'Ngoại tuyến · Tự đồng bộ khi có mạng'
                        : syncStatus === 'pending'
                          ? 'Chờ đồng bộ lại lên Drive 5TB'
                          : 'Đã đồng bộ Google Drive 5TB'}
                  </span>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 py-1.5 text-[11px] font-extrabold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Kết nối Google Drive 5TB
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile / Tablet Top Sticky Gamification HUD */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <NovaCompanion mood="happy" className="h-8 w-8" />
            <span className="text-base font-black tracking-tight bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
              SpeakMate
            </span>
          </Link>

          {currentProfile && (
            <div className="flex items-center gap-1.5">
              {xpBoostOn && (
                <span className="inline-flex items-center gap-0.5 rounded-xl border border-violet-300 bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">
                  ⚡2x
                </span>
              )}
              <Link
                href="/history"
                className="inline-flex items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-black text-orange-600"
              >
                <StreakFlameSvg
                  active={currentProfile.streakDays > 0}
                  className="h-4 w-4"
                />
                <span>{currentProfile.streakDays}</span>
              </Link>

              <Link
                href="/history#rewards"
                className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-black text-sky-700"
              >
                <GemSvg className="h-4 w-4" />
                <span>{currentProfile.gems}</span>
              </Link>

              <Link
                href="/settings"
                aria-label="Hồ sơ & Cài đặt"
                className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-600"
              >
                <Settings className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={toggleSound}
                aria-label="Bật tắt âm thanh"
                className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-600 cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile / Tablet Bottom 5-Tab Navigation Bar */}
      <nav
        aria-label="Menu di động"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1 px-2 py-1.5">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const showBadge = item.href === '/history' && claimableCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => playTapSound()}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-extrabold transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-5 w-5 stroke-[2.3]" />
                <span className="truncate">{item.shortLabel}</span>
                {showBadge && (
                  <span className="absolute right-2.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-1 text-[9px] font-black text-white">
                    {claimableCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
