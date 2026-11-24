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
  '#E5483F',
  '#059669',
  '#F59E0B',
  '#111827',
  '#0EA5E9',
  '#FB7185',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
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
        className="animate-pop-in relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 sm:p-7 text-center shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center">
          <NovaCompanion mood="proud" className="h-12 w-12" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-800">
            <Award className="h-3.5 w-3.5" />
            Ghi nhận thành tích
          </span>
          <h2 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-gray-900">
            {payload.title}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{payload.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 tabular-nums">
          {Boolean(payload.xp) && (
            <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-3">
              <div className="font-display text-lg font-bold text-[#E5483F]">
                +{payload.xp} XP
              </div>
              <div className="text-[11px] font-medium text-gray-500">
                Điểm kinh nghiệm
              </div>
            </div>
          )}
          {Boolean(payload.gems) && (
            <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-3 flex flex-col items-center">
              <div className="flex items-center gap-1 font-display text-lg font-bold text-emerald-600">
                +{payload.gems}
                <GemSvg className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-medium text-gray-500">
                Ngọc tích lũy
              </div>
            </div>
          )}
          {Boolean(payload.freezes) && (
            <div className="col-span-2 rounded-2xl border border-sky-200 bg-sky-50 p-3 flex items-center justify-center gap-2">
              <ShieldFreezeSvg className="h-5 w-5" />
              <span className="text-sm font-bold text-sky-900">
                +{payload.freezes} Khiên bảo vệ chuỗi
              </span>
            </div>
          )}
          {payload.badgeLabel && (
            <div className="col-span-2 rounded-2xl border border-gray-200 bg-[#F6F7F9] px-4 py-2.5 text-xs font-bold text-gray-900 flex items-center justify-center gap-1.5">
              <Award className="h-4 w-4 text-[#E5483F]" />
              Danh hiệu mới: {payload.badgeLabel}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-duo btn-duo-coral w-full py-3 text-sm"
        >
          <Check className="h-4 w-4" />
          Tiếp tục học tập
        </button>
      </div>
    </div>
  );
}
