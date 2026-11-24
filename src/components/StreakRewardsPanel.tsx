'use client';

import {
  Award,
  Check,
  Gift,
  Lock,
  Shield,
  ShoppingBag,
  Trophy,
  Zap,
} from 'lucide-react';
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
        title: `Mốc ${m.days} ngày: ${m.titleVi}`,
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
        title: `Đã đổi ${item.titleVi}`,
        subtitle:
          item.type === 'xp_boost'
            ? `Nhân đôi XP trong ${item.boostMinutes ?? 15} phút tới đã được kích hoạt.`
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
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Streak Milestone Rewards */}
      <section className="card-duo-elevated p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
              <Trophy className="h-5 w-5 stroke-[1.9]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-zinc-950">
                Cột mốc phần thưởng chuỗi ngày học
              </h2>
              <p className="text-xs text-zinc-500">
                Nhận thêm XP, Ngọc tích lũy, Khiên bảo vệ và danh hiệu khi duy trì thói quen mỗi ngày.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-[#FAF9F6] px-2.5 py-1.5 text-zinc-800">
              <StreakFlameSvg active={profile.streakDays > 0} className="h-4 w-4" />
              Hiện tại: {profile.streakDays} ngày
            </span>
            <span className="rounded-lg border border-zinc-200 bg-[#FAF9F6] px-2.5 py-1.5 text-zinc-700">
              Kỷ lục: {bestStreak} ngày
            </span>
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {STREAK_MILESTONES.map((m) => {
            const unlocked = bestStreak >= m.days;
            const claimed = profile.claimedMilestones.includes(m.days);
            const pct = Math.min(100, Math.round((bestStreak / m.days) * 100));
            const remaining = Math.max(0, m.days - bestStreak);

            return (
              <div
                key={m.days}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  unlocked && !claimed
                    ? 'border-amber-400 bg-amber-50/50'
                    : claimed
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : 'border-zinc-200/90 bg-[#FAF9F6]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <TreasureChestSvg
                      state={claimed ? 'opened' : unlocked ? 'ready' : 'locked'}
                      className="h-9 w-9"
                    />
                    <span
                      className={`tabular-nums rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        claimed
                          ? 'bg-emerald-100 text-emerald-800'
                          : unlocked
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-200/80 text-zinc-600'
                      }`}
                    >
                      {m.days} ngày
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900">
                    {m.titleVi}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {m.subtitleVi}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold tabular-nums">
                    <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-amber-800">
                      +{m.rewardXp} XP
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-blue-800">
                      +{m.rewardGems}
                      <GemSvg className="h-3 w-3" />
                    </span>
                    {m.rewardFreezes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-sky-800">
                        +{m.rewardFreezes} Khiên
                      </span>
                    )}
                    <span className="rounded-md bg-white border border-zinc-200 px-2 py-0.5 text-zinc-700">
                      {m.badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {claimed ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-white py-2 text-xs font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                      Đã nhận thưởng
                    </div>
                  ) : unlocked ? (
                    <button
                      type="button"
                      disabled={busyId === `m-${m.days}`}
                      onClick={() => void handleClaim(m.days)}
                      className="btn-duo btn-duo-orange w-full py-2 text-xs"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      {busyId === `m-${m.days}` ? 'Đang mở...' : 'Nhận phần thưởng'}
                    </button>
                  ) : (
                    <div className="space-y-1.5 tabular-nums">
                      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Còn {remaining} ngày
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-amber-500"
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

      {/* Gem Reward Shop */}
      <section className="card-duo-elevated p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-[#FAF9F6] text-zinc-800">
              <ShoppingBag className="h-5 w-5 stroke-[1.9]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-zinc-950">
                Đổi vật phẩm hỗ trợ bằng Ngọc
              </h2>
              <p className="text-xs text-zinc-500">
                Sử dụng Ngọc tích lũy từ bài học để đổi Khiên bảo vệ chuỗi, nhân đôi XP và danh hiệu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-[#FAF9F6] px-2.5 py-1.5 text-zinc-800">
              <GemSvg className="h-4 w-4" />
              {profile.gems} Ngọc
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-[#FAF9F6] px-2.5 py-1.5 text-zinc-800">
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
                className={`flex flex-col justify-between rounded-xl border p-4 ${
                  boostActive
                    ? 'border-amber-300 bg-amber-50/40'
                    : 'border-zinc-200/90 bg-[#FAF9F6]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-800">
                      {item.type === 'freeze' ? (
                        <Shield className="h-4 w-4 text-sky-600" />
                      ) : item.type === 'xp_boost' ? (
                        <Zap className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Award className="h-4 w-4 text-blue-700" />
                      )}
                    </div>
                    {boostActive && (
                      <span className="tabular-nums rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Còn {boostMins}p
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {item.titleVi}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {item.descVi}
                  </p>
                </div>

                <div className="mt-4">
                  {ownedBadge ? (
                    <button
                      type="button"
                      disabled={busyId === `badge-${item.badgeId}`}
                      onClick={() => void handleEquip(item.badgeId!)}
                      className={`btn-duo w-full py-2 text-xs ${
                        isEquipped ? 'btn-duo-green' : 'btn-duo-white'
                      }`}
                    >
                      {isEquipped ? 'Đang hiển thị' : 'Hiển thị danh hiệu'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford || busyId === `shop-${item.id}`}
                      onClick={() => void handleBuy(item.id)}
                      className={`btn-duo w-full py-2 text-xs tabular-nums ${
                        canAfford ? 'btn-duo-primary' : 'btn-duo-white'
                      }`}
                    >
                      {busyId === `shop-${item.id}`
                        ? 'Đang đổi...'
                        : boostActive
                          ? `+15 phút (${item.costGems} Ngọc)`
                          : `Đổi ${item.costGems} Ngọc`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Owned Badges Locker */}
        {profile.unlockedBadges.length > 0 && (
          <div className="border-t border-zinc-200/80 pt-4">
            <div className="text-xs font-semibold text-zinc-700 mb-2.5 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-600" />
              Danh hiệu đã mở khóa (chạm để hiển thị trên hồ sơ):
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.unlockedBadges.map((bid) => {
                const active = profile.activeBadge === bid;
                return (
                  <button
                    key={bid}
                    type="button"
                    onClick={() => void handleEquip(bid)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    {BADGE_DIRECTORY[bid] || bid}
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
