'use client';

import { Check, Sparkles, X } from 'lucide-react';
import { GemSvg, NovaCompanion, ShieldFreezeSvg } from '@/components/BrandArt';

export interface CelebrationPayload {
  title: string;
  subtitle: string;
  xp?: number;
  gems?: number;
  freezes?: number;
  badgeLabel?: string;
}

const CONFETTI_COLORS = [
  '#4F46E5',
  '#06B6D4',
  '#F97316',
  '#FBBF24',
  '#EC4899',
  '#10B981',
];

const CONFETTI_PIECES = Array.from({ length: 28 }).map((_, i) => ({
  id: i,
  left: `${(i * 3.6 + (i % 3) * 2) % 98}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  dur: `${1.6 + (i % 5) * 0.25}s`,
  delay: `${(i % 7) * 0.07}s`,
  size: i % 2 === 0 ? 10 : 8,
}));

export function CelebrationModal({
  payload,
  onClose,
}: {
  payload: CelebrationPayload | null;
  onClose: () => void;
}) {
  if (!payload) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {CONFETTI_PIECES.map((p) => (
          <span
            key={p.id}
            className="confetti-piece absolute top-0 rounded-xs"
            style={
              {
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size * 1.4}px`,
                backgroundColor: p.color,
                '--fall-dur': p.dur,
                '--fall-delay': p.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="animate-pop-in relative w-full max-w-md rounded-3xl border border-indigo-200/90 bg-white p-6 sm:p-7 text-center shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 via-violet-50 to-amber-50 border border-indigo-200/80 shadow-inner">
          <NovaCompanion mood="proud" className="h-20 w-20 animate-gentle-float" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            Mở rương thành công!
          </span>
          <h2 className="mt-2.5 text-2xl font-black text-slate-900">
            {payload.title}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {payload.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {Boolean(payload.xp) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="text-xl font-black text-amber-600">
                +{payload.xp} XP
              </div>
              <div className="text-[11px] font-bold text-amber-800">
                Kinh nghiệm
              </div>
            </div>
          )}
          {Boolean(payload.gems) && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 flex flex-col items-center">
              <div className="flex items-center gap-1 text-xl font-black text-sky-600">
                +{payload.gems}
                <GemSvg className="h-5 w-5" />
              </div>
              <div className="text-[11px] font-bold text-sky-800">
                Ngọc đổi quà
              </div>
            </div>
          )}
          {Boolean(payload.freezes) && (
            <div className="col-span-2 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-3 flex items-center justify-center gap-2">
              <ShieldFreezeSvg className="h-6 w-6" />
              <span className="text-sm font-black text-cyan-800">
                +{payload.freezes} Khiên Bảo Vệ Chuỗi
              </span>
            </div>
          )}
          {payload.badgeLabel && (
            <div className="col-span-2 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-extrabold text-indigo-800">
              🏅 Huy hiệu mới mở khóa: {payload.badgeLabel}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-duo btn-duo-primary w-full py-3.5 text-sm uppercase tracking-wide"
        >
          <Check className="h-4 w-4 stroke-[3]" />
          Tuyệt vời! Tiếp tục học
        </button>
      </div>
    </div>
  );
}
