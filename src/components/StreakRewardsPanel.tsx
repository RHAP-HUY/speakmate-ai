'use client';

import { Check, Gift, Lock, ShoppingBag, Sparkles, Trophy } from 'lucide-react';
import { useState } from 'react';
import {
  GemSvg,
  ShieldFreezeSvg,
  StreakFlameSvg,
  TreasureChestSvg,
} from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import {
  BADGE_DIRECTORY,
  getXpBoostRemainingMinutes,
  isXpBoostActive,
  SHOP_REWARDS,
  STREAK_MILESTONES,
} from '@/lib/gamification';
import { playChestOpenSound, playTapSound } from '@/lib/sound-fx';
import type { UserProfile } from '@/types';

interface StreakRewardsPanelProps {
  profile: UserProfile;
  onClaimMilestone: (days: number) => Promise<void>;
  onPurchaseItem: (itemId: string) => Promise<void>;
  onEquipBadge: (badgeId: string | null) => Promise<void>;
}

export function StreakRewardsPanel({
  profile,
  onClaimMilestone,
  onPurchaseItem,
  onEquipBadge,
}: StreakRewardsPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  const bestStreak = Math.max(profile.streakDays, profile.longestStreak);

  async function handleClaim(days: number) {
    const m = STREAK_MILESTONES.find((item) => item.days === days);
    if (!m) return;
    setBusyId(`m-${days}`);
    setFeedback(null);
    try {
      await onClaimMilestone(days);
      playChestOpenSound();
      setCelebration({
        title: `Mốc ${m.days} Ngày: ${m.titleVi}!`,
        subtitle: m.subtitleVi,
        xp: m.rewardXp,
        gems: m.rewardGems,
        freezes: m.rewardFreezes,
        badgeLabel: m.badgeLabel,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể nhận thưởng lúc này.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleBuy(itemId: string) {
    const item = SHOP_REWARDS.find((i) => i.id === itemId);
    if (!item) return;
    setBusyId(`shop-${itemId}`);
    setFeedback(null);
    try {
      await onPurchaseItem(itemId);
      playChestOpenSound();
      setCelebration({
        title: `Đổi thành công ${item.titleVi}!`,
        subtitle:
          item.type === 'xp_boost'
            ? `Đã bật nhân đôi 2x XP trong ${item.boostMinutes ?? 15} phút! Vào chơi game hoặc gọi AI ngay nhé!`
            : item.descVi,
        freezes: item.type === 'freeze' ? 1 : undefined,
        badgeLabel: item.badgeLabel,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể đổi vật phẩm.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(badgeId: string) {
    playTapSound();
    setBusyId(`badge-${badgeId}`);
    try {
      await onEquipBadge(profile.activeBadge === badgeId ? null : badgeId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-2xl border-2 px-4 py-3 text-xs font-extrabold ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-rose-300 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Streak Milestone Rewards Chests */}
      <section className="card-duo-elevated p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFC800] text-amber-950 shadow-[0_4px_0_#D9A400]">
              <Trophy className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Rương Phần Thưởng Mốc Giữ Chuỗi
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Giữ chuỗi liên tiếp đạt từng cột mốc để mở khóa Ngọc 💎, XP, Khiên 🧊 &amp; Huy hiệu độc quyền!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-black">
            <span className="inline-flex items-center gap-1 rounded-xl border-2 border-orange-200 bg-orange-50 px-3 py-1.5 text-[#FF9600]">
              <StreakFlameSvg active={profile.streakDays > 0} className="h-4 w-4" />
              Hiện tại: {profile.streakDays} ngày
            </span>
            <span className="rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
              🏅 Kỷ lục: {bestStreak} ngày
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STREAK_MILESTONES.map((m) => {
            const unlocked = bestStreak >= m.days;
            const claimed = profile.claimedMilestones.includes(m.days);
            const pct = Math.min(100, Math.round((bestStreak / m.days) * 100));
            const remaining = Math.max(0, m.days - bestStreak);

            return (
              <div
                key={m.days}
                className={`relative flex flex-col justify-between rounded-2xl border-2 p-4 transition ${
                  unlocked && !claimed
                    ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50/60 to-orange-50 shadow-md shadow-amber-500/10'
                    : claimed
                      ? 'border-emerald-200 bg-[#F1FDE8]/50'
                      : 'border-slate-200 bg-[#F7F9FC]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={
                        unlocked && !claimed ? 'animate-chest-wiggle' : ''
                      }
                    >
                      <TreasureChestSvg
                        state={
                          claimed ? 'opened' : unlocked ? 'ready' : 'locked'
                        }
                        className="h-12 w-12"
                      />
                    </div>
                    <span
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-black uppercase ${
                        claimed
                          ? 'bg-emerald-100 text-emerald-700'
                          : unlocked
                            ? 'bg-[#FF9600] text-white'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Mốc {m.days} ngày
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900">
                    {m.emoji} {m.titleVi}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    {m.subtitleVi}
                  </p>

                  {/* Rewards pill list */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                    <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-amber-800">
                      +{m.rewardXp} XP
                    </span>
                    <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-sky-800">
                      +{m.rewardGems} 💎
                    </span>
                    {m.rewardFreezes > 0 && (
                      <span className="rounded-lg bg-cyan-100 px-2 py-0.5 text-cyan-800">
                        +{m.rewardFreezes} 🧊 Khiên
                      </span>
                    )}
                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-indigo-800">
                      {m.badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {claimed ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-emerald-100/70 py-2.5 text-xs font-black text-emerald-800">
                      <Check className="h-4 w-4 stroke-[3]" />
                      Đã mở rương thưởng
                    </div>
                  ) : unlocked ? (
                    <button
                      type="button"
                      disabled={busyId === `m-${m.days}`}
                      onClick={() => void handleClaim(m.days)}
                      className="btn-duo btn-duo-orange w-full py-2.5 text-xs uppercase tracking-wide"
                    >
                      <Gift className="h-4 w-4" />
                      {busyId === `m-${m.days}`
                        ? 'Đang mở quà...'
                        : '🎁 Mở rương thưởng ngay'}
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Còn {remaining} ngày nữa
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="progress-gloss h-full rounded-full bg-gradient-to-r from-[#FF9600] to-[#FFC800]"
                          style={{ width: `${Math.max(6, pct)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gem Reward Shop & Unlocked Badges */}
      <section className="card-duo-elevated p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1CB0F6] text-white shadow-[0_4px_0_#1899D6]">
              <ShoppingBag className="h-5 w-5 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Cửa Hàng Đổi Quà Bằng Ngọc
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Dùng Ngọc 💎 kiếm được từ game &amp; chuỗi học để mua Khiên Bảo Vệ Chuỗi và Danh hiệu nổi bật!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-black">
            <span className="inline-flex items-center gap-1 rounded-xl border-2 border-sky-200 bg-sky-50 px-3 py-1.5 text-[#1899D6]">
              <GemSvg className="h-4 w-4" />
              {profile.gems} Ngọc
            </span>
            <span className="inline-flex items-center gap-1 rounded-xl border-2 border-cyan-200 bg-cyan-50 px-3 py-1.5 text-cyan-700">
              <ShieldFreezeSvg className="h-4 w-4" />
              {profile.streakFreezes} Khiên
            </span>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {SHOP_REWARDS.map((item) => {
            const ownedBadge =
              item.type === 'badge' &&
              item.badgeId &&
              profile.unlockedBadges.includes(item.badgeId);
            const isEquipped =
              item.badgeId && profile.activeBadge === item.badgeId;
            const canAfford = profile.gems >= item.costGems;
            const boostActive =
              item.type === 'xp_boost' && isXpBoostActive(profile.xpBoostUntil);
            const boostMins = boostActive
              ? getXpBoostRemainingMinutes(profile.xpBoostUntil)
              : 0;

            return (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-2xl border-2 p-4 ${
                  boostActive
                    ? 'border-violet-300 bg-violet-50/70'
                    : 'border-slate-200 bg-[#F7F9FC]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-3xl">{item.emoji}</span>
                    {boostActive && (
                      <span className="rounded-lg bg-violet-600 px-2 py-0.5 text-[10px] font-black text-white">
                        Đang bật ({boostMins}p)
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    {item.titleVi}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    {item.descVi}
                  </p>
                </div>

                <div className="mt-4">
                  {ownedBadge ? (
                    <button
                      type="button"
                      disabled={busyId === `badge-${item.badgeId}`}
                      onClick={() => void handleEquip(item.badgeId!)}
                      className={`btn-duo w-full py-2.5 text-xs ${
                        isEquipped ? 'btn-duo-green' : 'btn-duo-white'
                      }`}
                    >
                      {isEquipped ? '✓ Đang đeo' : 'Đeo danh hiệu'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford || busyId === `shop-${item.id}`}
                      onClick={() => void handleBuy(item.id)}
                      className={`btn-duo w-full py-2.5 text-xs ${
                        canAfford
                          ? item.type === 'xp_boost'
                            ? 'btn-duo-purple'
                            : 'btn-duo-blue'
                          : 'btn-duo-white'
                      }`}
                    >
                      {busyId === `shop-${item.id}`
                        ? 'Đang đổi...'
                        : boostActive
                          ? `Cộng thêm +15p (${item.costGems} 💎)`
                          : `Đổi ${item.costGems} 💎`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Owned Badges Locker */}
        {profile.unlockedBadges.length > 0 && (
          <div className="border-t-2 border-slate-100 pt-4">
            <div className="text-xs font-black text-slate-700 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Bộ sưu tập Huy hiệu của bạn (chạm để đeo lên thanh hồ sơ):
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.unlockedBadges.map((bid) => {
                const active = profile.activeBadge === bid;
                return (
                  <button
                    key={bid}
                    type="button"
                    onClick={() => void handleEquip(bid)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-extrabold border-2 transition cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-[0_3px_0_#3730A3]'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                    }`}
                  >
                    {BADGE_DIRECTORY[bid] || bid} {active ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </div>
  );
}
