'use client';

import { Award, Check, X } from 'lucide-react';
import { useEffect } from 'react';
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
  '#1D4ED8',
  '#059669',
  '#D97706',
  '#F59E0B',
  '#18181B',
  '#0284C7',
];

const CONFETTI_PIECES = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  left: `${(i * 4.8 + (i % 3) * 2) % 96}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  dur: `${1.6 + (i % 5) * 0.22}s`,
  delay: `${(i % 6) * 0.06}s`,
  size: i % 2 === 0 ? 8 : 6,
}));

export function CelebrationModal({
  payload,
  onClose,
}: {
  payload: CelebrationPayload | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!payload) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [payload, onClose]);

  if (!payload) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={payload.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 backdrop-blur-xs p-4"
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
        className="animate-pop-in relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 sm:p-7 text-center shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <NovaCompanion mood="proud" className="h-16 w-16" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <Award className="h-3.5 w-3.5" />
            Phần thưởng mới
          </span>
          <h2 className="mt-2.5 text-xl font-bold tracking-tight text-zinc-950">
            {payload.title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{payload.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 tabular-nums">
          {Boolean(payload.xp) && (
            <div className="rounded-xl border border-zinc-200 bg-[#FAF9F6] p-3">
              <div className="text-lg font-bold text-amber-700">
                +{payload.xp} XP
              </div>
              <div className="text-[11px] font-medium text-zinc-500">
                Điểm kinh nghiệm
              </div>
            </div>
          )}
          {Boolean(payload.gems) && (
            <div className="rounded-xl border border-zinc-200 bg-[#FAF9F6] p-3 flex flex-col items-center">
              <div className="flex items-center gap-1 text-lg font-bold text-blue-700">
                +{payload.gems}
                <GemSvg className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-medium text-zinc-500">
                Ngọc tích lũy
              </div>
            </div>
          )}
          {Boolean(payload.freezes) && (
            <div className="col-span-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 flex items-center justify-center gap-2">
              <ShieldFreezeSvg className="h-5 w-5" />
              <span className="text-sm font-semibold text-sky-900">
                +{payload.freezes} Khiên bảo vệ chuỗi
              </span>
            </div>
          )}
          {payload.badgeLabel && (
            <div className="col-span-2 rounded-xl border border-zinc-200 bg-[#FAF9F6] px-4 py-2.5 text-xs font-semibold text-zinc-800 flex items-center justify-center gap-1.5">
              <Award className="h-4 w-4 text-amber-600" />
              Danh hiệu mới: {payload.badgeLabel}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-duo btn-duo-primary w-full py-3 text-sm"
        >
          <Check className="h-4 w-4" />
          Tiếp tục học tập
        </button>
      </div>
    </div>
  );
}
