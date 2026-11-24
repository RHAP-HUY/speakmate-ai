'use client';

import { ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { useState } from 'react';
import type { PronunciationAssessment, PronunciationWordFeedback } from '@/types';

interface PronunciationBadgeProps {
  assessment: PronunciationAssessment;
  theme?: 'dark' | 'light';
  defaultExpanded?: boolean;
}

export function getScoreTone(score: number): {
  pillDark: string;
  pillLight: string;
  bar: string;
  textDark: string;
  textLight: string;
  label: string;
} {
  if (score >= 82) {
    return {
      pillDark: 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300',
      pillLight: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      bar: 'bg-emerald-500',
      textDark: 'text-emerald-300',
      textLight: 'text-emerald-700',
      label: 'Tốt',
    };
  }
  if (score >= 65) {
    return {
      pillDark: 'border-amber-500/40 bg-amber-950/70 text-amber-300',
      pillLight: 'border-amber-200 bg-amber-50 text-amber-800',
      bar: 'bg-amber-500',
      textDark: 'text-amber-300',
      textLight: 'text-amber-700',
      label: 'Khá',
    };
  }
  return {
    pillDark: 'border-rose-500/40 bg-rose-950/70 text-rose-300',
    pillLight: 'border-rose-200 bg-rose-50 text-rose-700',
    bar: 'bg-rose-500',
    textDark: 'text-rose-300',
    textLight: 'text-rose-700',
    label: 'Cần luyện thêm',
  };
}

function getWordChipClass(
  status: PronunciationWordFeedback['status'],
  isDark: boolean
): string {
  if (status === 'good') {
    return isDark
      ? 'border-emerald-500/30 bg-emerald-950/60 text-emerald-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (status === 'improve') {
    return isDark
      ? 'border-amber-400/50 bg-amber-950/70 text-amber-200'
      : 'border-amber-300 bg-amber-50 text-amber-900';
  }
  return isDark
    ? 'border-rose-500/50 bg-rose-950/70 text-rose-200 line-through'
    : 'border-rose-300 bg-rose-50 text-rose-800 line-through';
}

export function PronunciationBadge({
  assessment,
  theme = 'dark',
  defaultExpanded = false,
}: PronunciationBadgeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isDark = theme === 'dark';
  const tone = getScoreTone(assessment.overallScore);
  const improveWords = assessment.wordFeedback.filter(
    (w) => w.status !== 'good' && (w.tipVi || w.ipa)
  );

  return (
    <div
      className={`mt-1.5 max-w-[92%] sm:max-w-[82%] rounded-2xl border px-3.5 py-2 text-xs ${
        isDark
          ? 'border-[#38312C] bg-[#26221E] text-[#E7E2D8]'
          : 'border-[#E7E2D8] bg-white text-[#1C1917]'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-bold ${
              isDark ? tone.pillDark : tone.pillLight
            }`}
          >
            <Mic className="h-3 w-3" />
            Phát âm: {assessment.overallScore}/100
          </span>
          <span
            className={`text-[11px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Rõ âm {assessment.accuracyScore} · Trôi chảy {assessment.fluencyScore} · Ngữ điệu {assessment.intonationScore}
          </span>
        </div>
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {expanded && (
        <div
          className={`mt-2.5 space-y-2.5 border-t pt-2.5 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          {/* 3 mini bars */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Độ rõ âm', val: assessment.accuracyScore },
              { label: 'Trôi chảy', val: assessment.fluencyScore },
              { label: 'Ngữ điệu', val: assessment.intonationScore },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    {item.label}
                  </span>
                  <span className="font-bold">{item.val}</span>
                </div>
                <div
                  className={`h-1.5 w-full overflow-hidden rounded-full ${
                    isDark ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${getScoreTone(item.val).bar}`}
                    style={{ width: `${item.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Word chips */}
          {assessment.wordFeedback.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {assessment.wordFeedback.map((wf, idx) => (
                <span
                  key={`${wf.word}-${idx}`}
                  title={wf.tipVi || (wf.status === 'good' ? 'Phát âm rõ' : 'Cần luyện thêm')}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${getWordChipClass(
                    wf.status,
                    isDark
                  )}`}
                >
                  <span>{wf.word}</span>
                  {wf.status === 'improve' && (
                    <span className="text-[10px] opacity-80">•</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Specific tips for words needing improvement */}
          {improveWords.length > 0 && (
            <div
              className={`space-y-1 rounded-xl px-2.5 py-2 text-[11px] ${
                isDark
                  ? 'bg-slate-950/80 text-slate-300'
                  : 'bg-slate-50 text-slate-700'
              }`}
            >
              {improveWords.slice(0, 4).map((w, idx) => (
                <div key={`${w.word}-tip-${idx}`} className="flex flex-wrap items-baseline gap-1.5">
                  <span
                    className={`font-bold ${
                      w.status === 'missing'
                        ? isDark
                          ? 'text-rose-300'
                          : 'text-rose-700'
                        : isDark
                          ? 'text-amber-300'
                          : 'text-amber-700'
                    }`}
                  >
                    {w.word}
                  </span>
                  {w.ipa && (
                    <span className={isDark ? 'text-amber-200' : 'text-[#14532D]'}>
                      /{w.ipa.replace(/^\/|\/$/g, '')}/
                    </span>
                  )}
                  {w.tipVi && <span>→ {w.tipVi}</span>}
                </div>
              ))}
            </div>
          )}

          <p
            className={`text-[11px] leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {assessment.summaryVi}
          </p>
        </div>
      )}
    </div>
  );
}
