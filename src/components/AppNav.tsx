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
    label: 'Lộ trình học',
    shortLabel: 'Lộ trình',
    icon: Compass,
  },
  {
    href: '/play',
    label: 'Luyện phản xạ',
    shortLabel: 'Phản xạ',
    icon: Gamepad2,
  },
  {
    href: '/call',
    label: 'Hội thoại cùng AI',
    shortLabel: 'Hội thoại',
    icon: PhoneCall,
  },
  {
    href: '/history',
    label: 'Tiến độ & Chuỗi',
    shortLabel: 'Tiến độ',
    icon: Trophy,
  },
  {
    href: '/leaderboard',
    label: 'Bảng xếp hạng',
    shortLabel: 'Xếp hạng',
    icon: Crown,
  },
  {
    href: '/phrases',
    label: 'Sổ mẫu câu',
    shortLabel: 'Sổ câu',
    icon: BookOpen,
  },
  {
    href: '/settings',
    label: 'Cài đặt',
    shortLabel: 'Cài đặt',
    icon: Settings,
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

  // PUBLIC LANDING HEADER — Clean Editorial Top Bar
  if (resolvedVariant === 'landing') {
    return (
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-[#FAF9F6]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <NovaCompanion mood="happy" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-zinc-900">
              SpeakMate
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="hidden sm:inline-flex text-sm font-medium text-zinc-600 hover:text-zinc-950 transition px-2 py-1.5"
            >
              Đăng nhập
            </Link>
            <Link
              href="/auth"
              className="btn-duo btn-duo-primary px-4 py-2 text-sm"
            >
              Bắt đầu học
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // AUTHENTICATED APP NAVIGATION — Linear / Notion Disciplined Left Rail
  return (
    <>
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col justify-between border-r border-zinc-200/90 bg-white px-3.5 py-5">
        <div className="space-y-6">
          {/* Brand Wordmark */}
          <Link
            href="/"
            onClick={() => playTapSound()}
            className="flex items-center gap-2.5 px-2.5"
          >
            <NovaCompanion
              mood={currentProfile && currentProfile.streakDays >= 3 ? 'fire' : 'happy'}
              className="h-8 w-8 shrink-0"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[17px] font-bold tracking-tight text-zinc-950">
                SpeakMate
              </span>
              <span className="font-mono text-[10px] font-medium text-zinc-400">
                v5
              </span>
            </div>
          </Link>

          {/* Navigation Links — Natural Sentence Case, Monochrome Vector Icons */}
          <nav className="space-y-0.5" aria-label="Điều hướng chính">
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
                  className={`group flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-zinc-900/[0.06] font-semibold text-zinc-950'
                      : 'font-medium text-zinc-600 hover:bg-zinc-900/[0.03] hover:text-zinc-950'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 stroke-[1.85] ${
                        active
                          ? 'text-zinc-950'
                          : 'text-zinc-400 group-hover:text-zinc-700'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {showBadge && (
                    <span className="tabular-nums flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                      {claimableCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2.5 pt-4 border-t border-zinc-200/80">
          {xpBoostOn && (
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs font-semibold text-amber-900">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                Nhân đôi XP
              </span>
              <span className="tabular-nums font-mono text-[11px] text-amber-700">
                {xpBoostMins}p
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSound}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {muted ? (
                <VolumeX className="h-4 w-4 text-zinc-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-zinc-700" />
              )}
              Âm thanh phản hồi
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              {muted ? 'Tắt' : 'Bật'}
            </span>
          </button>

          {currentProfile && levelInfo && (
            <div className="rounded-xl border border-zinc-200/90 bg-[#FAF9F6] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-white">
                    {(currentProfile.displayName || 'H').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-900 truncate group-hover:text-blue-700">
                      {currentProfile.displayName || 'Học viên'}
                    </div>
                    <div className="tabular-nums text-[11px] text-zinc-500 truncate">
                      Cấp {levelInfo.level} · {currentProfile.englishLevel}
                    </div>
                  </div>
                </Link>

                {isCloudLoggedIn && (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    title="Đăng xuất"
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-800 transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>

              {activeBadgeLabel && (
                <div className="rounded-md bg-white border border-zinc-200/80 px-2 py-1 text-[11px] font-medium text-zinc-700 truncate">
                  {activeBadgeLabel}
                </div>
              )}

              {isDriveActive ? (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      syncStatus === 'offline' || syncStatus === 'pending'
                        ? 'bg-amber-500'
                        : syncStatus === 'syncing'
                          ? 'bg-blue-600 animate-pulse'
                          : 'bg-emerald-600'
                    }`}
                  />
                  <Cloud className="h-3 w-3 shrink-0 text-zinc-400" />
                  <span className="truncate">
                    {syncStatus === 'syncing'
                      ? 'Đang đồng bộ Drive...'
                      : syncStatus === 'offline'
                        ? 'Ngoại tuyến · Chờ mạng'
                        : syncStatus === 'pending'
                          ? 'Chờ đồng bộ Drive'
                          : 'Đã đồng bộ Drive 5TB'}
                  </span>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Kết nối Google Drive
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile / Tablet Top Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 h-14">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <NovaCompanion mood="happy" className="h-7 w-7" />
            <span className="text-base font-bold tracking-tight text-zinc-950">
              SpeakMate
            </span>
          </Link>

          {currentProfile && (
            <div className="flex items-center gap-1.5 tabular-nums">
              {xpBoostOn && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                  <Zap className="h-3 w-3 text-amber-600" />
                  2x
                </span>
              )}
              <Link
                href="/history"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800"
              >
                <StreakFlameSvg
                  active={currentProfile.streakDays > 0}
                  className="h-4 w-4"
                />
                <span>{currentProfile.streakDays}</span>
              </Link>

              <Link
                href="/history#rewards"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-800"
              >
                <GemSvg className="h-4 w-4" />
                <span>{currentProfile.gems}</span>
              </Link>

              <Link
                href="/settings"
                aria-label="Hồ sơ & Cài đặt"
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 text-zinc-600"
              >
                <Settings className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={toggleSound}
                aria-label="Bật tắt âm thanh"
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 text-zinc-600 cursor-pointer"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 text-zinc-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-zinc-700" />
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile / Tablet Bottom 5-Tab Navigation Bar */}
      <nav
        aria-label="Menu di động"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200/90 bg-white/95 backdrop-blur-md lg:hidden"
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
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition ${
                  active
                    ? 'text-zinc-950 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Icon
                  className={`h-5 w-5 stroke-[1.9] ${
                    active ? 'text-blue-700' : 'text-zinc-400'
                  }`}
                />
                <span className="truncate">{item.shortLabel}</span>
                {showBadge && (
                  <span className="tabular-nums absolute right-2.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-semibold text-white">
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
