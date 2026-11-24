'use client';

import {
  Award,
  Bookmark,
  Check,
  CheckCircle2,
  Compass,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react';
import type { ConversationReport, ReportKeyPhrase } from '@/types';
import { getScoreTone } from './PronunciationBadge';

interface CallReportViewProps {
  report: ConversationReport;
  theme?: 'dark' | 'light';
  savedKeys?: Set<string>;
  onSpeak?: (text: string) => void;
  onSavePhrase?: (phrase: ReportKeyPhrase) => void;
}

export function CallReportView({
  report,
  theme = 'dark',
  savedKeys,
  onSpeak,
  onSavePhrase,
}: CallReportViewProps) {
  const isDark = theme === 'dark';
  const tone = getScoreTone(report.overallScore);

  const skillItems = [
    { label: 'Phát âm', value: report.scores.pronunciation },
    { label: 'Trôi chảy', value: report.scores.fluency },
    { label: 'Ngữ pháp', value: report.scores.grammar },
    { label: 'Từ vựng', value: report.scores.vocabulary },
  ];

  return (
    <div className="space-y-4 text-left">
      {/* Headline & Overall Score */}
      <div
        className={`rounded-2xl border p-4 ${isDark
            ? 'border-white/10 bg-[#181B22] text-white'
            : 'border-gray-200 bg-[#F6F7F9] text-[#111827]'
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${isDark
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                  : 'border-zinc-200 bg-white text-zinc-700'
                  }`}
              >
                <Award className="h-3 w-3" />
                Ước lượng: {report.cefrEstimate}
              </span>
              {report.overallScore > 0 && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${isDark ? tone.pillDark : tone.pillLight
                    }`}
                >
                  {tone.label}
                </span>
              )}
            </div>
            <h3 className="text-sm sm:text-base font-bold leading-snug">
              {report.headlineVi}
            </h3>
          </div>

          {report.overallScore > 0 && (
            <div
              className={`shrink-0 flex h-14 w-14 flex-col items-center justify-center rounded-2xl border font-bold ${isDark ? tone.pillDark : tone.pillLight
                }`}
            >
              <span className="text-xl leading-none">{report.overallScore}</span>
              <span className="text-[10px] opacity-80">/100</span>
            </div>
          )}
        </div>

        <p
          className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
        >
          {report.overviewVi}
        </p>

        {/* 4 Skill Bars */}
        {report.overallScore > 0 && (
          <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {skillItems.map((s) => (
              <div
                key={s.label}
                className={`rounded-xl p-2.5 ${isDark
                  ? 'bg-slate-900/80 border border-slate-700/70'
                  : 'bg-white border border-slate-200/80'
                  }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                    {s.label}
                  </span>
                  <span className="font-bold">{s.value}</span>
                </div>
                <div
                  className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'
                    }`}
                >
                  <div
                    className={`h-full rounded-full ${getScoreTone(s.value).bar}`}
                    style={{ width: `${s.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strengths & Improvements */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-3.5 ${isDark
            ? 'border-emerald-500/25 bg-emerald-950/35'
            : 'border-emerald-200 bg-emerald-50/60'
            }`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs font-bold mb-2 ${isDark ? 'text-emerald-300' : 'text-emerald-800'
              }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Điểm làm tốt
          </div>
          <ul
            className={`space-y-1.5 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
          >
            {report.strengthsVi.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={`rounded-2xl border p-3.5 ${isDark
            ? 'border-amber-500/25 bg-amber-950/35'
            : 'border-amber-200 bg-amber-50/60'
            }`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs font-bold mb-2 ${isDark ? 'text-amber-300' : 'text-amber-800'
              }`}
          >
            <Target className="h-3.5 w-3.5" />
            Ưu tiên cải thiện
          </div>
          <ul
            className={`space-y-1.5 text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
          >
            {report.improvementsVi.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Top Corrections */}
      {report.topCorrections.length > 0 && (
        <div
          className={`rounded-2xl border p-3.5 space-y-2.5 ${isDark
              ? 'border-white/10 bg-[#181B22]'
              : 'border-gray-200 bg-white'
            }`}
        >
          <div
            className={`flex items-center gap-1.5 text-xs font-bold ${
              isDark ? 'text-amber-300' : 'text-[#111827]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#E5483F]" />
            Câu tiêu biểu nên nâng cấp giống bản xứ
          </div>
          <div className="space-y-2">
            {report.topCorrections.map((c, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-2.5 text-xs space-y-1 ${isDark ? 'bg-[#111318]' : 'bg-[#F6F7F9]'
                  }`}
              >
                <div
                  className={
                    isDark
                      ? 'text-gray-400 line-through'
                      : 'text-gray-500 line-through'
                  }
                >
                  {c.original}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-700'
                      }`}
                  >
                    → {c.better}
                  </div>
                  {onSpeak && (
                    <button
                      type="button"
                      onClick={() => onSpeak(c.better)}
                      title="Nghe mẫu"
                      className={`shrink-0 rounded-lg p-1.5 cursor-pointer transition-colors ${isDark
                          ? 'bg-white/10 text-gray-200 hover:bg-white/15'
                          : 'bg-white border border-gray-200 text-[#111827] hover:bg-gray-50'
                        }`}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                  {c.explanationVi}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Phrases */}
      {report.recommendedPhrases.length > 0 && (
        <div
          className={`rounded-2xl border p-3.5 space-y-2.5 ${isDark
              ? 'border-white/10 bg-[#181B22]'
              : 'border-gray-200 bg-white'
            }`}
        >
          <div
            className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#111827]'
              }`}
          >
            Cụm từ nên lưu vào sổ mẫu câu
          </div>
          <div className="space-y-2">
            {report.recommendedPhrases.map((p, idx) => {
              const isSaved = savedKeys?.has(p.en.toLowerCase());
              return (
                <div
                  key={`${p.en}-${idx}`}
                  className={`flex items-start justify-between gap-2 rounded-xl p-2.5 text-xs ${isDark ? 'bg-[#111318]' : 'bg-[#F6F7F9]'
                    }`}
                >
                  <div>
                    <div
                      className={`font-bold ${isDark ? 'text-white' : 'text-[#111827]'
                        }`}
                    >
                      {p.en}
                    </div>
                    {p.phonetic && (
                      <div
                        className={`text-[11px] font-mono ${
                          isDark ? 'text-amber-300/90' : 'text-gray-500'
                        }`}
                      >
                        /{p.phonetic}/
                      </div>
                    )}
                    <div className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                      {p.vi}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {onSpeak && (
                      <button
                        type="button"
                        onClick={() => onSpeak(p.en)}
                        title="Nghe mẫu"
                        className={`rounded-lg p-1.5 cursor-pointer transition-colors ${isDark
                            ? 'bg-white/10 text-gray-200 hover:bg-white/15'
                            : 'bg-white border border-gray-200 text-[#111827] hover:bg-gray-50'
                          }`}
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onSavePhrase && (
                      <button
                        type="button"
                        disabled={isSaved}
                        onClick={() => onSavePhrase(p)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${isSaved
                            ? isDark
                              ? 'bg-emerald-900/60 text-emerald-300'
                              : 'bg-emerald-50 text-emerald-700'
                            : 'bg-[#E5483F] text-white hover:bg-[#cf3a31]'
                          }`}
                      >
                        {isSaved ? (
                          <>
                            <Check className="h-3 w-3" />
                            Đã lưu
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-3 w-3" />
                            Lưu
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Step */}
      <div
        className={`flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-xs ${isDark
            ? 'border-white/10 bg-[#181B22] text-gray-200'
            : 'border-gray-200 bg-[#F6F7F9] text-[#111827]'
          }`}
      >
        <Compass className="h-4 w-4 shrink-0 mt-0.5 text-[#E5483F]" />
        <span>
          <strong>Bước tiếp theo:</strong> {report.nextStepVi}
        </span>
      </div>
    </div>
  );
}
