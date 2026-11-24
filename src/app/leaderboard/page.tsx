'use client';

import {
  ArrowRight,
  ArrowUp,
  Crown,
  Gamepad2,
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
          'Toàn bộ bài luyện tập và cuộc gọi trong 15 phút tới sẽ được nhân đôi điểm kinh nghiệm.',
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAF9F6]">
        <NovaCompanion mood="proud" className="h-12 w-12" />
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
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
      {/* Editorial League Header */}
      <section className="card-duo-elevated p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-[#FAF9F6]">
              <LeagueTrophySvg tier={league.tier} className="h-10 w-10" />
            </div>
            <div>
              <div className="font-mono text-[11px] font-semibold tracking-wider text-amber-700">
                BẢNG XẾP HẠNG TUẦN · {board?.weekLabel || 'ĐANG DIỄN RA'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 mt-0.5">
                {league.nameVi}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5 tabular-nums">
                {board?.currentUserRank
                  ? `Hạng hiện tại của bạn: #${board.currentUserRank} · Top 3 thăng hạng tuần kế tiếp.`
                  : 'Hoàn thành bài luyện tập để ghi tên trên bảng xếp hạng tuần.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 tabular-nums">
            {boostActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
                <Zap className="h-4 w-4 text-amber-600" />
                Đang nhân đôi XP ({boostMins}p)
              </span>
            ) : (
              <button
                type="button"
                disabled={buyingBoost}
                onClick={() => void handleBuyXpBoost()}
                className="btn-duo btn-duo-white px-4 py-2.5 text-xs"
              >
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                {buyingBoost ? 'Đang kích hoạt...' : 'Bật 2x XP (50 Ngọc)'}
              </button>
            )}
            <Link
              href="/play"
              onClick={() => playTapSound()}
              className="btn-duo btn-duo-primary px-4 py-2.5 text-xs"
            >
              <Gamepad2 className="h-4 w-4" />
              Tích lũy thêm XP
            </Link>
          </div>
        </div>
      </section>

      {boostErr && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {boostErr}
        </div>
      )}

      {/* 5-Tier League Progression Strip */}
      <section className="card-duo p-5 space-y-3 tabular-nums">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Hệ thống 5 hạng giải đấu
          </h2>
          <span className="text-xs font-semibold text-zinc-700">
            {league.nextXp
              ? `Còn ${Math.max(0, league.nextXp - profile.xp)} XP lên hạng tiếp theo`
              : 'Đã đạt hạng cao nhất'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {LEAGUE_TIERS.map((t) => {
            const isCurrent = t.tier === league.tier;
            const unlocked = profile.xp >= t.minXp;
            return (
              <div
                key={t.tier}
                className={`flex flex-col items-center rounded-xl border p-3 text-center transition ${
                  isCurrent
                    ? 'border-zinc-900 bg-[#FAF9F6]'
                    : unlocked
                      ? 'border-zinc-200 bg-white'
                      : 'border-zinc-200/70 bg-[#FAF9F6] opacity-55'
                }`}
              >
                <LeagueTrophySvg tier={t.tier} className="h-8 w-8" />
                <div className="mt-1.5 text-xs font-bold text-zinc-900 leading-tight">
                  {t.nameVi.replace('Giải ', '')}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
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
            { entry: top3[1], rank: 2, border: 'border-zinc-200 bg-white' },
            { entry: top3[0], rank: 1, border: 'border-amber-300 bg-amber-50/40' },
            { entry: top3[2], rank: 3, border: 'border-zinc-200 bg-white' },
          ].map(({ entry, rank, border }) => (
            <div
              key={entry.id}
              className={`rounded-2xl border p-4 text-center space-y-2 ${border}`}
            >
              <div className="flex items-center justify-center">
                {rank === 1 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900">
                    <Crown className="h-3.5 w-3.5 text-amber-600" />
                    #1
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-bold text-zinc-700">
                    #{rank}
                  </span>
                )}
              </div>
              <div
                className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white ${
                  entry.isCurrentUser
                    ? 'bg-blue-700'
                    : rank === 1
                      ? 'bg-amber-600'
                      : 'bg-zinc-800'
                }`}
              >
                {entry.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm font-bold text-zinc-950 truncate">
                {entry.displayName}
                {entry.isCurrentUser ? ' (Bạn)' : ''}
              </div>
              <div className="text-xs font-bold text-zinc-900">
                {entry.xp} XP
              </div>
              <div className="inline-flex items-center justify-center gap-1 text-[11px] text-zinc-500">
                <StreakFlameSvg active={entry.streakDays > 0} className="h-3.5 w-3.5" />
                {entry.streakDays} ngày
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Full League Standings Table */}
      <section className="card-duo-elevated overflow-hidden tabular-nums">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-950">
            <Users className="h-4 w-4 text-zinc-500" />
            Danh sách học viên trong tuần
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <GemSvg className="h-4 w-4" />
            Ngọc tích lũy: <strong className="text-zinc-950">{profile.gems}</strong>
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const inPromoZone = rank <= 3;

            return (
              <div key={entry.id}>
                <div
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 transition ${
                    entry.isCurrentUser
                      ? 'bg-blue-50/50'
                      : 'bg-white hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`font-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        rank === 1
                          ? 'bg-amber-100 text-amber-900'
                          : rank === 2
                            ? 'bg-zinc-200 text-zinc-800'
                            : rank === 3
                              ? 'bg-orange-100 text-orange-900'
                              : 'text-zinc-400'
                      }`}
                    >
                      {rank}
                    </span>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                        entry.isCurrentUser ? 'bg-blue-700' : 'bg-zinc-800'
                      }`}
                    >
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-950 truncate">
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Bạn
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Trình độ {entry.englishLevel}
                        {!entry.isBot && !entry.isCurrentUser && ' · Học viên thực'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-zinc-600">
                      <StreakFlameSvg
                        active={entry.streakDays > 0}
                        className="h-3.5 w-3.5"
                      />
                      {entry.streakDays}d
                    </span>
                    <span className="min-w-20 text-right text-sm font-bold text-zinc-900">
                      {entry.xp} XP
                    </span>
                  </div>
                </div>

                {inPromoZone && rank === 3 && entries.length > 3 && (
                  <div className="flex items-center justify-center gap-2 bg-emerald-50/70 border-y border-emerald-200/80 py-1.5 text-[11px] font-semibold text-emerald-800">
                    <ArrowUp className="h-3.5 w-3.5" />
                    Nhóm Top 3 thăng hạng tuần này
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="card-duo p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-zinc-600">
          Mỗi bài luyện tập hoàn thành ghi nhận từ <strong>+65 đến +130 XP</strong> (nhân đôi khi bật chế độ 2x XP).
        </div>
        <Link
          href="/play"
          className="btn-duo btn-duo-primary shrink-0 px-5 py-2.5 text-xs"
        >
          Luyện tập tích lũy XP
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
