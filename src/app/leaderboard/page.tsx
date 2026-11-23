'use client';

import {
  ArrowRight,
  ArrowUp,
  Crown,
  Gamepad2,
  Loader2,
  Sparkles,
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
  MascotOwl,
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
        title: 'Đã kích hoạt Bình Nhân Đôi XP! ⚡',
        subtitle:
          'Mọi game & cuộc gọi AI trong 15 phút tới sẽ nhân đôi toàn bộ XP để bạn bứt tốc lên Top 3!',
      });
    } catch (err) {
      setBoostErr(
        err instanceof Error ? err.message : 'Không đủ 50 💎 để mua Bình 2x XP.'
      );
    } finally {
      setBuyingBoost(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F7F9FC]">
        <MascotOwl mood="proud" className="h-16 w-16 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-[#FFC800]" />
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
      {/* League Header Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-[#FFC800] via-[#FFB200] to-[#FF9600] border-b-4 border-[#D97706] p-6 text-amber-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
              <LeagueTrophySvg tier={league.tier} className="h-12 w-12" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-amber-900/80">
                BẢNG XẾP HẠNG TUẦN · {board?.weekLabel || 'ĐANG DIỄN RA'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                {league.nameVi}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-amber-950/85 mt-0.5">
                {board?.currentUserRank
                  ? `Bạn đang giữ hạng #${board.currentUserRank} · Top 3 sẽ thăng hạng giải đấu tiếp theo!`
                  : 'Chơi game & gọi AI để ghi danh vào Top 3 thăng hạng!'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {boostActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-white/60 bg-white px-4 py-2.5 text-xs font-black text-[#6D28D9] shadow-xs">
                <Zap className="h-4 w-4 fill-[#FFC800] text-[#FF9600]" />
                Đang bật 2x XP ({boostMins}p)
              </span>
            ) : (
              <button
                type="button"
                disabled={buyingBoost}
                onClick={() => void handleBuyXpBoost()}
                className="btn-duo btn-duo-purple px-4 py-3 text-xs uppercase"
              >
                <Zap className="h-4 w-4" />
                {buyingBoost ? 'Đang kích hoạt...' : 'Bật 2x XP (50 💎)'}
              </button>
            )}
            <Link
              href="/play"
              onClick={() => playTapSound()}
              className="btn-duo btn-duo-white px-4 py-3 text-xs uppercase text-amber-900"
            >
              <Gamepad2 className="h-4 w-4" />
              Cày XP ngay
            </Link>
          </div>
        </div>
      </section>

      {boostErr && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-xs font-extrabold text-rose-700">
          {boostErr}
        </div>
      )}

      {/* 5-Tier League Progression Strip (Duolingo Signature Shield Bar) */}
      <section className="card-duo p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Hệ thống 5 Hạng Giải Đấu SpeakMate
          </h2>
          <span className="text-xs font-extrabold text-[#1899D6]">
            {league.nextXp
              ? `Còn ${Math.max(0, league.nextXp - profile.xp)} XP lên hạng tiếp theo`
              : '👑 Đã đạt giải cao nhất!'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {LEAGUE_TIERS.map((t) => {
            const isCurrent = t.tier === league.tier;
            const unlocked = profile.xp >= t.minXp;
            return (
              <div
                key={t.tier}
                className={`flex flex-col items-center rounded-2xl border-2 p-2.5 text-center transition ${
                  isCurrent
                    ? 'border-[#FFC800] bg-amber-50 scale-[1.03] shadow-xs'
                    : unlocked
                      ? 'border-emerald-200 bg-[#F1FDE8]/50'
                      : 'border-slate-200 bg-slate-50 opacity-55'
                }`}
              >
                <LeagueTrophySvg tier={t.tier} className="h-9 w-9 sm:h-11 sm:w-11" />
                <div className="mt-1.5 text-[10px] sm:text-xs font-black text-slate-800 leading-tight">
                  {t.nameVi.replace('Giải ', '')}
                </div>
                <div className="text-[9px] font-bold text-slate-400">
                  {t.minXp}+ XP
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top 3 Podium Showcase */}
      {top3.length >= 3 && (
        <section className="grid grid-cols-3 gap-3 items-end pt-2">
          {[
            { entry: top3[1], rank: 2, medal: '🥈', height: 'pt-4', border: 'border-slate-300 bg-slate-50' },
            { entry: top3[0], rank: 1, medal: '🥇', height: 'pt-6', border: 'border-[#FFC800] bg-gradient-to-b from-amber-50 to-white shadow-md' },
            { entry: top3[2], rank: 3, medal: '🥉', height: 'pt-3', border: 'border-orange-200 bg-orange-50/50' },
          ].map(({ entry, rank, medal, height, border }) => (
            <div
              key={entry.id}
              className={`rounded-3xl border-2 p-4 text-center space-y-2 ${height} ${border}`}
            >
              <div className="text-2xl leading-none">
                {rank === 1 ? (
                  <Crown className="h-7 w-7 mx-auto text-[#FFC800] fill-[#FFC800]" />
                ) : (
                  medal
                )}
              </div>
              <div
                className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-base font-black text-white ${
                  entry.isCurrentUser
                    ? 'bg-[#58CC02]'
                    : rank === 1
                      ? 'bg-[#FF9600]'
                      : 'bg-[#1CB0F6]'
                }`}
              >
                {entry.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {entry.displayName}
                {entry.isCurrentUser ? ' (Bạn)' : ''}
              </div>
              <div className="text-xs font-black text-[#FF9600]">
                {entry.xp} XP
              </div>
              <div className="text-[10px] font-bold text-slate-500">
                🔥 {entry.streakDays} ngày
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Full League Standings Table */}
      <section className="card-duo-elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Users className="h-4 w-4 text-[#1CB0F6]" />
            Bảng Xếp Hạng Chi Tiết
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <GemSvg className="h-4 w-4" />
            Ngọc của bạn: <strong className="text-[#1899D6]">{profile.gems}</strong>
          </div>
        </div>

        <div className="divide-y-2 divide-slate-100">
          {entries.map((entry, idx) => {
            const rank = idx + 1;
            const inPromoZone = rank <= 3;

            return (
              <div key={entry.id}>
                <div
                  className={`flex items-center justify-between gap-3 px-5 py-3.5 transition ${
                    entry.isCurrentUser
                      ? 'bg-[#DDF4FF]/70'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                        rank === 1
                          ? 'bg-[#FFC800] text-amber-950'
                          : rank === 2
                            ? 'bg-slate-200 text-slate-700'
                            : rank === 3
                              ? 'bg-orange-200 text-orange-900'
                              : 'text-slate-400'
                      }`}
                    >
                      {rank}
                    </span>

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white ${
                        entry.isCurrentUser
                          ? 'bg-[#58CC02]'
                          : 'bg-gradient-to-br from-[#1CB0F6] to-[#6366F1]'
                      }`}
                    >
                      {entry.displayName.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900 truncate">
                          {entry.displayName}
                        </span>
                        {entry.isCurrentUser && (
                          <span className="rounded-md bg-[#58CC02] px-1.5 py-0.5 text-[10px] font-black text-white">
                            BẠN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400">
                        Trình độ {entry.englishLevel}
                        {!entry.isBot && !entry.isCurrentUser && ' · Học viên thực'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-extrabold text-[#FF9600]">
                      <StreakFlameSvg
                        active={entry.streakDays > 0}
                        className="h-4 w-4"
                      />
                      {entry.streakDays}d
                    </span>
                    <span className="min-w-20 text-right text-sm font-black text-slate-800">
                      {entry.xp} XP
                    </span>
                  </div>
                </div>

                {/* Duolingo Green Promotion Zone Divider right after #3 */}
                {inPromoZone && rank === 3 && entries.length > 3 && (
                  <div className="flex items-center justify-center gap-2 bg-[#F1FDE8] border-y-2 border-[#B8F28B] py-2 text-[11px] font-black uppercase tracking-wider text-[#3B8702]">
                    <ArrowUp className="h-3.5 w-3.5 stroke-[3]" />
                    Vùng Thăng Hạng (Top 3)
                    <ArrowUp className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="card-duo p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-[#FF9600] shrink-0" />
          <div className="text-xs font-bold text-slate-600">
            Mỗi màn chơi game thưởng <strong>+65~130 XP</strong> (lên tới{' '}
            <strong>+260 XP</strong> khi bật Bình Nhân Đôi XP ⚡)!
          </div>
        </div>
        <Link
          href="/play"
          className="btn-duo btn-duo-green shrink-0 px-5 py-3 text-xs uppercase"
        >
          Chơi game leo hạng ngay
          <ArrowRight className="h-4 w-4 stroke-[3]" />
        </Link>
      </div>

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
