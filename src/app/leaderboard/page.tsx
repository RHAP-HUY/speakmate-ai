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
  NovaCompanion,
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FBF9F5]">
        <NovaCompanion mood="proud" className="h-11 w-11" />
        <Loader2 className="h-5 w-5 animate-spin text-[#78716C]" />
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
      {/* Open Editorial League Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-[#E7E2D8] pb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#E7E2D8] bg-white">
            <LeagueTrophySvg tier={league.tier} className="h-10 w-10" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#78716C]">
              Xếp hạng học viên tuần này · {board?.weekLabel || 'Đang diễn ra'}
            </p>
            <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] mt-1">
              {league.nameVi}
            </h1>
            <p className="text-sm text-[#57534E] mt-1 tabular-nums">
              {board?.currentUserRank
                ? `Vị trí hiện tại của bạn: #${board.currentUserRank} · Nhóm 3 học viên dẫn đầu thăng hạng vào tuần sau.`
                : 'Hoàn thành bài thực hành để ghi tên trên bảng tổng kết tuần.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
          {boostActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-3.5 py-2.5 text-xs font-semibold text-[#9A3412]">
              <Zap className="h-4 w-4 text-[#C2410C]" />
              Đang nhân đôi XP ({boostMins}p)
            </span>
          ) : (
            <button
              type="button"
              disabled={buyingBoost}
              onClick={() => void handleBuyXpBoost()}
              className="btn-duo btn-duo-white px-4 py-2.5 text-xs"
            >
              <Zap className="h-3.5 w-3.5 text-[#C2410C]" />
              {buyingBoost ? 'Đang kích hoạt...' : 'Bật 2x XP (50 Ngọc)'}
            </button>
          )}
          <Link
            href="/play"
            onClick={() => playTapSound()}
            className="btn-duo btn-duo-green px-4 py-2.5 text-xs"
          >
            Luyện bài mới
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {boostErr && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {boostErr}
        </div>
      )}

      {/* 5-Tier League Progression Strip */}
      <section className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-3.5 tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif-display text-lg font-semibold text-[#1C1917]">
            Lộ trình 5 bậc giải đấu
          </h2>
          <span className="text-xs font-medium text-[#57534E]">
            {league.nextXp
              ? `Còn ${Math.max(0, league.nextXp - profile.xp)} XP để lên bậc tiếp theo`
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
                className={`flex flex-col items-center rounded-xl border p-3.5 text-center transition ${
                  isCurrent
                    ? 'border-[#14532D] bg-[#F3EFE6]/70 ring-1 ring-[#14532D]'
                    : unlocked
                      ? 'border-[#E7E2D8] bg-white'
                      : 'border-[#E7E2D8] bg-[#FBF9F5] opacity-55'
                }`}
              >
                <LeagueTrophySvg tier={t.tier} className="h-8 w-8" />
                <div className="mt-1.5 text-xs font-semibold text-[#1C1917] leading-tight">
                  {t.nameVi.replace('Giải ', '')}
                </div>
                <div className="font-mono text-[10px] text-[#78716C] mt-0.5">
                  {t.minXp}+ XP
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top 3 Podium Showcase */}
      {top3.length >= 3 && (
        <section className="grid grid-cols-3 gap-3 items-end tabular-nums">
          {[
            { entry: top3[1], rank: 2, cardStyle: 'border-[#E7E2D8] bg-white' },
            {
              entry: top3[0],
              rank: 1,
              cardStyle: 'border-[#FDBA74] bg-[#FFF7ED]/70',
            },
            { entry: top3[2], rank: 3, cardStyle: 'border-[#E7E2D8] bg-white' },
          ].map(({ entry, rank, cardStyle }) => (
            <div
              key={entry.id}
              className={`rounded-2xl border p-4 sm:p-5 text-center space-y-2 ${cardStyle}`}
            >
              <div className="flex items-center justify-center">
                {rank === 1 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEDD5] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#9A3412]">
                    <Crown className="h-3.5 w-3.5 text-[#C2410C]" />
                    #1
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-[#F3EFE6] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#57534E]">
                    #{rank}
                  </span>
                )}
              </div>
              <div
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${
                  entry.isCurrentUser
                    ? 'bg-[#14532D]'
                    : rank === 1
                      ? 'bg-[#C2410C]'
                      : 'bg-[#1C1917]'
                }`}
              >
                {entry.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[#1C1917] truncate">
                {entry.displayName}
                {entry.isCurrentUser ? ' (Bạn)' : ''}
              </div>
              <div className="font-serif-display text-base font-semibold text-[#1C1917]">
                {entry.xp} XP
              </div>
              <div className="inline-flex items-center justify-center gap-1 text-[11px] text-[#78716C]">
                <StreakFlameSvg active={entry.streakDays > 0} className="h-3.5 w-3.5" />
                {entry.streakDays} ngày
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Full League Standings Sheet */}
      <section className="rounded-2xl border border-[#E7E2D8] bg-white overflow-hidden tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E2D8] px-5 py-4">
          <div className="flex items-center gap-2 font-serif-display text-lg font-semibold text-[#1C1917]">
            <Users className="h-4 w-4 text-[#78716C]" />
            Bảng điểm chi tiết trong tuần
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#57534E]">
            <GemSvg className="h-4 w-4" />
            Ngọc hiện có: <strong className="text-[#1C1917]">{profile.gems}</strong>
          </div>
        </div>

        <div className="divide-y divide-[#EFECE4]">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const inPromoZone = rank <= 3;

            return (
              <div key={entry.id}>
                <div
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 transition ${
                    entry.isCurrentUser
                      ? 'bg-[#ECFDF5]/65'
                      : 'bg-white hover:bg-[#FBF9F5]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`font-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                        rank === 1
                          ? 'bg-[#FFEDD5] text-[#9A3412]'
                          : rank === 2
                            ? 'bg-[#F3EFE6] text-[#1C1917]'
                            : rank === 3
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : 'text-[#78716C]'
                      }`}
                    >
                      {rank}
                    </span>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        entry.isCurrentUser ? 'bg-[#14532D]' : 'bg-[#1C1917]'
                      }`}
                    >
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1C1917] truncate">
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="rounded-full bg-[#14532D] px-2 py-0.5 text-[10px] font-semibold text-white">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#78716C]">
                        Trình độ {entry.englishLevel}
                        {!entry.isBot && !entry.isCurrentUser && ' · Học viên thực'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-[#57534E]">
                      <StreakFlameSvg
                        active={entry.streakDays > 0}
                        className="h-3.5 w-3.5"
                      />
                      {entry.streakDays}d
                    </span>
                    <span className="min-w-20 text-right font-serif-display text-base font-semibold text-[#1C1917]">
                      {entry.xp} XP
                    </span>
                  </div>
                </div>

                {inPromoZone && rank === 3 && entries.length > 3 && (
                  <div className="flex items-center justify-center gap-2 bg-[#ECFDF5] border-y border-[#A7F3D0] py-1.5 text-[11px] font-semibold text-[#14532D]">
                    <ArrowUp className="h-3.5 w-3.5" />
                    Nhóm 3 học viên dẫn đầu thăng hạng tuần này
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Note */}
      <div className="rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/75 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-[#57534E]">
          Mỗi bài thực hành hoàn thành cộng từ <strong className="text-[#1C1917]">+65 đến +130 XP</strong> (nhân đôi khi đang bật chế độ 2x XP).
        </div>
        <Link
          href="/play"
          className="btn-duo btn-duo-primary shrink-0 px-5 py-2.5 text-xs"
        >
          Thực hành tích lũy XP
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
