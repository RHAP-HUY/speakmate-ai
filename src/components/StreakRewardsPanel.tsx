'use client';

import {
  Check,
  Gift,
  Lock,
  Shield,
  ShoppingBag,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import {
  BADGE_DIRECTORY,
  SHOP_REWARDS,
  STREAK_MILESTONES,
} from '@/lib/gamification';
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

  const bestStreak = Math.max(profile.streakDays, profile.longestStreak);

  async function handleClaim(days: number, titleVi: string) {
    setBusyId(`m-${days}`);
    setFeedback(null);
    try {
      await onClaimMilestone(days);
      setFeedback({
        type: 'success',
        text: `🎉 Đã nhận thưởng mốc "${titleVi}"! XP, Ngọc 💎 và Huy hiệu đã được cộng vào tài khoản.`,
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

  async function handleBuy(itemId: string, titleVi: string) {
    setBusyId(`shop-${itemId}`);
    setFeedback(null);
    try {
      await onPurchaseItem(itemId);
      setFeedback({
        type: 'success',
        text: `✨ Đổi thành công "${titleVi}"!`,
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
          className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Streak Milestone Rewards */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xs">
                <Trophy className="h-4 w-4" />
              </span>
              Phần Thưởng Mốc Giữ Chuỗi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Giữ chuỗi liên tiếp đạt từng cột mốc để mở khóa Ngọc 💎, XP, Khiên Bảo Vệ 🧊 và Huy hiệu độc quyền!
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-orange-700">
              🔥 Hiện tại: {profile.streakDays} ngày
            </span>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-indigo-700">
              🏅 Kỷ lục: {bestStreak} ngày
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STREAK_MILESTONES.map((m) => {
            const unlocked = bestStreak >= m.days;
            const claimed = profile.claimedMilestones.includes(m.days);
            const pct = Math.min(100, Math.round((bestStreak / m.days) * 100));
            const remaining = Math.max(0, m.days - bestStreak);

            return (
              <div
                key={m.days}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 transition ${
                  unlocked && !claimed
                    ? 'border-amber-400 bg-gradient-to-br from-amber-50/90 to-orange-50/70 shadow-md shadow-amber-500/15'
                    : claimed
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.gradient} text-xl shadow-sm`}
                    >
                      {m.emoji}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        claimed
                          ? 'bg-emerald-100 text-emerald-700'
                          : unlocked
                            ? 'bg-amber-400 text-amber-950 animate-pulse'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Mốc {m.days} ngày
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900">
                    {m.titleVi}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {m.subtitleVi}
                  </p>

                  {/* Rewards pill list */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="rounded-lg bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 text-indigo-700">
                      +{m.rewardXp} XP
                    </span>
                    <span className="rounded-lg bg-cyan-50 border border-cyan-200/80 px-2 py-0.5 text-cyan-700">
                      +{m.rewardGems} 💎
                    </span>
                    {m.rewardFreezes > 0 && (
                      <span className="rounded-lg bg-sky-50 border border-sky-200/80 px-2 py-0.5 text-sky-700">
                        +{m.rewardFreezes} 🧊 Khiên
                      </span>
                    )}
                    <span className="rounded-lg bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-amber-800">
                      {m.badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {claimed ? (
                    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100/80 py-2 text-xs font-bold text-emerald-800">
                      <Check className="h-3.5 w-3.5" />
                      Đã nhận phần thưởng
                    </div>
                  ) : unlocked ? (
                    <button
                      type="button"
                      disabled={busyId === `m-${m.days}`}
                      onClick={() => void handleClaim(m.days, m.titleVi)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-extrabold text-white shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 cursor-pointer"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      {busyId === `m-${m.days}` ? 'Đang mở quà...' : '🎁 Nhận thưởng ngay'}
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          Còn {remaining} ngày nữa
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${m.gradient}`}
                          style={{ width: `${pct}%` }}
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

      {/* Reward Shop & Unlocked Badges */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-xs">
                <ShoppingBag className="h-4 w-4" />
              </span>
              Kho Đổi Quà Bằng Ngọc 💎
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hoàn thành bài học và giữ chuỗi để tích Ngọc 💎 đổi Khiên Bảo Vệ Chuỗi & Danh hiệu!
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <span className="rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1.5 text-cyan-700">
              💎 {profile.gems} Ngọc
            </span>
            <span className="rounded-full bg-sky-50 border border-sky-200 px-3 py-1.5 text-sky-700 inline-flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              {profile.streakFreezes} Khiên
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SHOP_REWARDS.map((item) => {
            const ownedBadge =
              item.type === 'badge' &&
              item.badgeId &&
              profile.unlockedBadges.includes(item.badgeId);
            const isEquipped =
              item.badgeId && profile.activeBadge === item.badgeId;
            const canAfford = profile.gems >= item.costGems;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
              >
                <div>
                  <div className="text-2xl mb-2">{item.emoji}</div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {item.titleVi}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {item.descVi}
                  </p>
                </div>

                <div className="mt-4">
                  {ownedBadge ? (
                    <button
                      type="button"
                      disabled={busyId === `badge-${item.badgeId}`}
                      onClick={() => void handleEquip(item.badgeId!)}
                      className={`w-full rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                        isEquipped
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      {isEquipped ? '✓ Đang đeo danh hiệu' : 'Đeo danh hiệu này'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford || busyId === `shop-${item.id}`}
                      onClick={() => void handleBuy(item.id, item.titleVi)}
                      className={`w-full rounded-xl py-2 text-xs font-extrabold transition cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white hover:from-indigo-700 hover:to-cyan-700 shadow-xs'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {busyId === `shop-${item.id}`
                        ? 'Đang đổi...'
                        : `Đổi với ${item.costGems} 💎`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Owned Badges Locker */}
        {profile.unlockedBadges.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Huy hiệu của bạn (chạm để đeo hiển thị trên thanh hồ sơ):
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.unlockedBadges.map((bid) => {
                const active = profile.activeBadge === bid;
                return (
                  <button
                    key={bid}
                    type="button"
                    onClick={() => void handleEquip(bid)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
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
    </div>
  );
}
