'use client';

import {
  BookOpen,
  Compass,
  Crown,
  Gamepad2,
  LogOut,
  PhoneCall,
  Search,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GemSvg, NovaCompanion, StreakFlameSvg } from '@/components/BrandArt';
import { QuickSearchModal } from '@/components/QuickSearchModal';
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
  isXpBoostActive,
} from '@/lib/gamification';
import { isSoundMuted, playTapSound, setSoundMuted } from '@/lib/sound-fx';
import type { AuthSessionInfo, UserProfile } from '@/types';

interface AppNavProps {
  profile: UserProfile | null;
  authenticated: boolean;
  variant?: 'app' | 'landing';
}

const NAV_ITEMS = [
  { href: '/', label: 'Lộ trình', icon: Compass },
  { href: '/play', label: 'Luyện tập', icon: Gamepad2 },
  { href: '/call', label: 'Hội thoại', icon: PhoneCall },
  { href: '/phrases', label: 'Sổ mẫu câu', icon: BookOpen },
  { href: '/leaderboard', label: 'Xếp hạng', icon: Crown },
  { href: '/history', label: 'Nhật ký', icon: Trophy },
];

const MOBILE_TABS = [
  { href: '/', label: 'Lộ trình', icon: Compass },
  { href: '/play', label: 'Luyện tập', icon: Gamepad2 },
  { href: '/call', label: 'Hội thoại', icon: PhoneCall },
  { href: '/phrases', label: 'Sổ câu', icon: BookOpen },
  { href: '/history', label: 'Nhật ký', icon: Trophy },
];

export function AppNav({ profile, authenticated, variant }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(profile);
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);
  const [muted, setMuted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<DriveSyncStatus>(() =>
    getDriveSyncStatus()
  );

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, []);

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

  const currentProfile = liveProfile ?? profile;
  const activeBadgeLabel =
    currentProfile?.activeBadge && BADGE_DIRECTORY[currentProfile.activeBadge]
      ? BADGE_DIRECTORY[currentProfile.activeBadge]
      : null;

  const resolvedVariant = variant ?? (authenticated ? 'app' : 'landing');
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

  // PUBLIC MODERN CONSUMER HEADER (Airbnb / Apple / Speak style)
  if (resolvedVariant === 'landing') {
    return (
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 h-[68px]">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <NovaCompanion className="h-8 w-8" />
            <span className="font-display text-lg font-bold tracking-tight text-gray-900">
              SpeakMate
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#nghe-thu" className="hover:text-gray-900 transition">
              Người hướng dẫn
            </a>
            <a href="#bai-hoc-thu" className="hover:text-gray-900 transition">
              Học thử ngay
            </a>
            <Link href="/placement" className="hover:text-gray-900 transition">
              Kiểm tra CEFR
            </Link>
            <a href="#lo-trinh" className="hover:text-gray-900 transition">
              Giáo trình 4 chương
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/auth"
              className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition px-3 py-2 rounded-full hover:bg-gray-100"
            >
              Đăng nhập
            </Link>
            <Link
              href="/auth"
              className="btn-duo btn-duo-coral px-5 py-2.5 text-sm"
            >
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // AUTHENTICATED CONSUMER TOP BAR
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 h-16">
          {/* Left: Clean Brand Emblem + Pill Tabs */}
          <div className="flex items-center gap-7">
            <Link
              href="/"
              onClick={() => playTapSound()}
              className="flex items-center gap-2.5 shrink-0"
            >
              <NovaCompanion className="h-8 w-8" />
              <span className="font-display text-[17px] font-bold tracking-tight text-gray-900">
                SpeakMate
              </span>
            </Link>

            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Điều hướng chính"
            >
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const showBadge =
                  item.href === '/history' && claimableCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => playTapSound()}
                    className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition ${
                      active
                        ? 'bg-gray-900 font-semibold text-white'
                        : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{item.label}</span>
                    {showBadge && (
                      <span className="tabular-nums inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E5483F] px-1 text-[10px] font-bold text-white">
                        {claimableCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Streak, Gems & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 tabular-nums">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setSearchOpen(true);
              }}
              title="Tìm nhanh bài học & tình huống (Ctrl+K)"
              aria-label="Tìm kiếm nhanh"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900 transition cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Tìm nhanh</span>
              <kbd className="hidden xl:inline font-mono text-[10px] text-gray-400">
                ⌘K
              </kbd>
            </button>

            {xpBoostOn && (
              <span className="hidden sm:inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                2x XP
              </span>
            )}

            {currentProfile && (
              <>
                <Link
                  href="/history"
                  title="Chuỗi ngày học liên tiếp"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:border-gray-300 transition"
                >
                  <StreakFlameSvg
                    active={currentProfile.streakDays > 0}
                    className="h-3.5 w-3.5"
                  />
                  <span>{currentProfile.streakDays}</span>
                </Link>

                <Link
                  href="/history#rewards"
                  title="Ngọc thưởng tích lũy"
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:border-gray-300 transition"
                >
                  <GemSvg className="h-3.5 w-3.5" />
                  <span>{currentProfile.gems}</span>
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={toggleSound}
              title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              aria-label="Bật tắt âm thanh"
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            {currentProfile && (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-gray-200">
                <Link
                  href="/settings"
                  title={
                    isDriveActive
                      ? syncStatus === 'syncing'
                        ? 'Đang đồng bộ Google Drive...'
                        : 'Hồ sơ & Cài đặt (Đã đồng bộ Drive)'
                      : 'Hồ sơ & Cài đặt'
                  }
                  className="inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-gray-100 transition"
                >
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white shrink-0">
                    {currentProfile.avatarUrl && !avatarFailed ? (
                      // External OAuth avatar URL (Google profile picture)
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={currentProfile.avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarFailed(true)}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      (currentProfile.displayName || 'H')
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                    {isDriveActive && (
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          syncStatus === 'offline' || syncStatus === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                    )}
                  </span>
                  <span className="hidden md:flex flex-col text-left leading-tight max-w-28">
                    <span className="text-xs font-semibold text-gray-900 truncate">
                      {currentProfile.displayName || 'Học viên'}
                    </span>
                    {activeBadgeLabel && (
                      <span className="text-[10px] font-medium text-[#E5483F] truncate">
                        {activeBadgeLabel}
                      </span>
                    )}
                  </span>
                  <Settings className="h-3.5 w-3.5 text-gray-500 md:hidden" />
                </Link>

                {isCloudLoggedIn && (
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    title="Đăng xuất"
                    className="hidden sm:inline-flex rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Menu di động"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md lg:hidden"
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
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[11px] transition ${
                  active
                    ? 'font-semibold text-[#E5483F]'
                    : 'font-medium text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4 stroke-[2]" />
                <span className="truncate">{item.label}</span>
                {showBadge && (
                  <span className="tabular-nums absolute right-2.5 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#E5483F] px-1 text-[9px] font-bold text-white">
                    {claimableCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
