'use client';

import {
  ArrowRight,
  ArrowUp,
  Crown,
  Loader2,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  GemSvg,
  LeagueTrophySvg,
  StreakFlameSvg,
} from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import { getCurrentProfile, purchaseShopReward } from '@/lib/data-store';
import {
  getLeagueInfo,
  getXpBoostRemainingMinutes,
  isXpBoostActive,
  LEAGUE_TIERS,
} from '@/lib/gamification';
import { playChestOpenSound, playTapSound } from '@/lib/sound-fx';
import type { LeaderboardEntry, UserProfile } from '@/types';

interface LeaderboardPayload {
  ok: boolean;
  weekLabel: string;
  totalRealUsers: number;
  currentUserRank: number | null;
  entries: LeaderboardEntry[];
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const [buyingBoost, setBuyingBoost] = useState(false);
  const [boostErr, setBoostErr] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { profile: prof, authenticated: isAuth } = await getCurrentProfile();
      if (!active) return;
      if (!isAuth || !prof) {
        router.replace('/auth?next=/leaderboard');
        return;
      }
      setProfile(prof);
      setAuthenticated(true);

      try {
        const params = new URLSearchParams({
          xp: String(prof.xp),
          streak: String(prof.streakDays),
          name: prof.displayName || 'Bạn',
          level: prof.englishLevel || 'A0-A1',
        });
        const res = await fetch(`/api/leaderboard?${params.toString()}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = (await res.json()) as LeaderboardPayload;
          if (active) setBoard(data);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  async function handleBuyXpBoost() {
    setBoostErr(null);
    setBuyingBoost(true);
    try {
      const updated = await purchaseShopReward('xp-boost-15m');
      setProfile(updated);
      playChestOpenSound();
      setCelebration({
        title: 'Đã kích hoạt nhân đôi XP',
        subtitle:
          'Toàn bộ bài thực hành và buổi hội thoại trong 15 phút tới sẽ được nhân đôi điểm kinh nghiệm.',
      });
    } catch (err) {
      setBoostErr(
        err instanceof Error ? err.message : 'Không đủ 50 Ngọc để kích hoạt nhân đôi XP.'
      );
    } finally {
      setBuyingBoost(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const league = getLeagueInfo(profile.xp);
  const boostActive = isXpBoostActive(profile.xpBoostUntil);
  const boostMins = getXpBoostRemainingMinutes(profile.xpBoostUntil);
  const entries = board?.entries ?? [];
  const top3 = entries.slice(0, 3);

  return (
    <AppShell profile={profile} authenticated={authenticated}>
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <LeagueTrophySvg tier={league.tier} className="h-14 w-14" />
          <div>
            <p className="text-xs font-medium text-gray-500">
              Bảng xếp hạng tuần · {board?.weekLabel || 'Đang diễn ra'}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mt-0.5">
              {league.nameVi}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5 tabular-nums">
              {board?.currentUserRank
                ? `Hạng hiện tại: #${board.currentUserRank} · Nhóm Top 3 thăng hạng tuần sau.`
                : 'Hoàn thành bài thực hành để ghi tên trên bảng tổng kết tuần.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
          {boostActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
              <Zap className="h-3.5 w-3.5 text-amber-600" />
              Đang bật 2x XP ({boostMins}p)
            </span>
          ) : (
            <button
              type="button"
              disabled={buyingBoost}
              onClick={() => void handleBuyXpBoost()}
              className="btn-duo btn-duo-white px-4 py-2.5 text-xs"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              {buyingBoost ? 'Đang kích hoạt...' : 'Bật 2x XP (50 Ngọc)'}
            </button>
          )}
          <Link
            href="/play"
            onClick={() => playTapSound()}
            className="btn-duo btn-duo-coral px-5 py-2.5 text-xs"
          >
            Luyện bài tích XP
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {boostErr && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {boostErr}
        </div>
      )}

      {/* 5-Tier League Progression */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-gray-900">
            5 bậc giải đấu SpeakMate
          </h2>
          <span className="text-xs font-medium text-gray-500">
            {league.nextXp
              ? `Còn ${Math.max(0, league.nextXp - profile.xp)} XP lên bậc tiếp theo`
              : 'Đã đạt bậc cao nhất'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {LEAGUE_TIERS.map((t) => {
            const isCurrent = t.tier === league.tier;
            const unlocked = profile.xp >= t.minXp;
            return (
              <div
                key={t.tier}
                className={`flex flex-col items-center rounded-2xl border p-3.5 text-center transition ${
                  isCurrent
                    ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                    : unlocked
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-100 bg-gray-50/70 opacity-55'
                }`}
              >
                <LeagueTrophySvg tier={t.tier} className="h-9 w-9" />
                <div className="mt-2 text-xs font-bold text-gray-900 leading-tight">
                  {t.nameVi.replace('Giải ', '')}
                </div>
                <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                  {t.minXp}+ XP
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <section className="grid grid-cols-3 gap-3 sm:gap-4 items-end tabular-nums">
          {[
            { entry: top3[1], rank: 2, cardStyle: 'border-gray-200/80 bg-white' },
            {
              entry: top3[0],
              rank: 1,
              cardStyle: 'border-amber-300 bg-amber-50/50 shadow-sm',
            },
            { entry: top3[2], rank: 3, cardStyle: 'border-gray-200/80 bg-white' },
          ].map(({ entry, rank, cardStyle }) => (
            <div
              key={entry.id}
              className={`rounded-3xl border p-4 sm:p-5 text-center space-y-2 ${cardStyle}`}
            >
              <div className="flex items-center justify-center">
                {rank === 1 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-800">
                    <Crown className="h-3.5 w-3.5 text-amber-600" />
                    #1
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs font-bold text-gray-600">
                    #{rank}
                  </span>
                )}
              </div>
              <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${
                  entry.isCurrentUser
                    ? 'bg-[#E5483F]'
                    : rank === 1
                      ? 'bg-amber-500'
                      : 'bg-gray-900'
                }`}
              >
                {entry.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                {entry.displayName}
                {entry.isCurrentUser ? ' (Bạn)' : ''}
              </div>
              <div className="font-display text-base font-bold text-gray-900">
                {entry.xp} XP
              </div>
              <div className="inline-flex items-center justify-center gap-1 text-[11px] text-gray-500">
                <StreakFlameSvg active={entry.streakDays > 0} className="h-3.5 w-3.5" />
                {entry.streakDays} ngày
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Standings Sheet */}
      <section className="rounded-3xl border border-gray-200/80 bg-white shadow-xs overflow-hidden tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2 font-display text-base font-bold text-gray-900">
            <Users className="h-4 w-4 text-gray-400" />
            Bảng điểm chi tiết tuần này
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <GemSvg className="h-4 w-4" />
            Ngọc hiện có: <strong className="text-gray-900">{profile.gems}</strong>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const inPromoZone = rank <= 3;

            return (
              <div key={entry.id}>
                <div
                  className={`flex items-center justify-between gap-3 px-6 py-3.5 transition ${
                    entry.isCurrentUser
                      ? 'bg-rose-50/50'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`font-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        rank === 1
                          ? 'bg-amber-100 text-amber-800'
                          : rank === 2
                            ? 'bg-gray-200 text-gray-800'
                            : rank === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'text-gray-400'
                      }`}
                    >
                      {rank}
                    </span>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        entry.isCurrentUser ? 'bg-[#E5483F]' : 'bg-gray-900'
                      }`}
                    >
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="rounded-full bg-[#E5483F] px-2 py-0.5 text-[10px] font-bold text-white">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Trình độ {entry.englishLevel}
                        {!entry.isBot && !entry.isCurrentUser && ' · Học viên thực'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                      <StreakFlameSvg
                        active={entry.streakDays > 0}
                        className="h-3.5 w-3.5"
                      />
                      {entry.streakDays}d
                    </span>
                    <span className="min-w-20 text-right font-display text-base font-bold text-gray-900">
                      {entry.xp} XP
                    </span>
                  </div>
                </div>

                {inPromoZone && rank === 3 && entries.length > 3 && (
                  <div className="flex items-center justify-center gap-2 bg-emerald-50 border-y border-emerald-200 py-1.5 text-[11px] font-bold text-emerald-700">
                    <ArrowUp className="h-3.5 w-3.5" />
                    Nhóm Top 3 thăng hạng tuần này
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
