'use client';

import {
  Award,
  Check,
  Gift,
  Lock,
  Shield,
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
              ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#14532D]'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Streak Milestone Rewards */}
      <section className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl font-semibold tracking-tight text-[#1C1917]">
              Cột mốc phần thưởng chuỗi ngày học
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Nhận thêm XP, Ngọc tích lũy, Khiên bảo vệ và danh hiệu khi duy trì thói quen mỗi ngày.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2D8] bg-[#FBF9F5] px-2.5 py-1.5 text-[#1C1917]">
              <StreakFlameSvg active={profile.streakDays > 0} className="h-4 w-4" />
              Hiện tại: {profile.streakDays} ngày
            </span>
            <span className="rounded-lg border border-[#E7E2D8] bg-[#FBF9F5] px-2.5 py-1.5 text-[#57534E]">
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
                    ? 'border-[#FDBA74] bg-[#FFF7ED]/70'
                    : claimed
                      ? 'border-[#A7F3D0] bg-[#ECFDF5]/40'
                      : 'border-[#E7E2D8] bg-[#FBF9F5]'
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
                          ? 'bg-[#D1FAE5] text-[#14532D]'
                          : unlocked
                            ? 'bg-[#C2410C] text-white'
                            : 'bg-[#E7E2D8] text-[#57534E]'
                      }`}
                    >
                      {m.days} ngày
                    </span>
                  </div>

                  <h3 className="font-serif-display text-base font-semibold text-[#1C1917]">
                    {m.titleVi}
                  </h3>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    {m.subtitleVi}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold tabular-nums">
                    <span className="rounded-md bg-white border border-[#E7E2D8] px-2 py-0.5 text-[#9A3412]">
                      +{m.rewardXp} XP
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#E7E2D8] px-2 py-0.5 text-[#14532D]">
                      +{m.rewardGems}
                      <GemSvg className="h-3 w-3" />
                    </span>
                    {m.rewardFreezes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#E7E2D8] px-2 py-0.5 text-[#57534E]">
                        +{m.rewardFreezes} Khiên
                      </span>
                    )}
                    <span className="rounded-md bg-white border border-[#E7E2D8] px-2 py-0.5 text-[#57534E]">
                      {m.badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {claimed ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-lg border border-[#A7F3D0] bg-white py-2 text-xs font-semibold text-[#14532D]">
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
                      <div className="flex items-center justify-between text-[11px] font-medium text-[#78716C]">
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Còn {remaining} ngày
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E7E2D8]">
                        <div
                          className="h-full rounded-full bg-[#C2410C]"
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
      <section className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl font-semibold tracking-tight text-[#1C1917]">
              Đổi vật phẩm hỗ trợ bằng Ngọc
            </h2>
            <p className="text-xs text-[#78716C] mt-0.5">
              Sử dụng Ngọc tích lũy từ bài học để đổi Khiên bảo vệ chuỗi, nhân đôi XP và danh hiệu.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2D8] bg-[#FBF9F5] px-2.5 py-1.5 text-[#1C1917]">
              <GemSvg className="h-4 w-4" />
              {profile.gems} Ngọc
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#E7E2D8] bg-[#FBF9F5] px-2.5 py-1.5 text-[#1C1917]">
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
                    ? 'border-[#FDBA74] bg-[#FFF7ED]/50'
                    : 'border-[#E7E2D8] bg-[#FBF9F5]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E7E2D8] bg-white text-[#1C1917]">
                      {item.type === 'freeze' ? (
                        <Shield className="h-4 w-4 text-[#14532D]" />
                      ) : item.type === 'xp_boost' ? (
                        <Zap className="h-4 w-4 text-[#C2410C]" />
                      ) : (
                        <Award className="h-4 w-4 text-[#B45309]" />
                      )}
                    </div>
                    {boostActive && (
                      <span className="tabular-nums rounded-md bg-[#C2410C] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Còn {boostMins}p
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-[#1C1917]">
                    {item.titleVi}
                  </h3>
                  <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
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
                        canAfford ? 'btn-duo-green' : 'btn-duo-white'
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
          <div className="border-t border-[#E7E2D8] pt-4">
            <div className="text-xs font-semibold text-[#57534E] mb-2.5 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#C2410C]" />
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
                        ? 'border-[#14532D] bg-[#14532D] text-white'
                        : 'border-[#E7E2D8] bg-white text-[#57534E] hover:border-[#A8A29E]'
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
