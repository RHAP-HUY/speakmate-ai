'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Headphones,
  Loader2,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { NovaCompanion, TutorAvatar } from '@/components/BrandArt';
import { playNaturalVoice, stopVoicePlayback } from '@/lib/audio';
import { getCurrentProfile, saveProfile } from '@/lib/data-store';
import {
  evaluatePlacementTest,
  PLACEMENT_QUESTIONS,
  PLACEMENT_RESULT_STORAGE_KEY,
  type PlacementEvaluation,
} from '@/lib/placement-test';
import { AI_PERSONAS } from '@/lib/scenarios';
import {
  playCorrectSound,
  playTapSound,
  playVictoryFanfare,
  playWrongSound,
} from '@/lib/sound-fx';
import type { UserProfile } from '@/types';

export default function PlacementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<PlacementEvaluation | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await getCurrentProfile();
      if (!active) return;
      setAuthenticated(res.authenticated);
      setProfile(res.profile);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
      stopVoicePlayback();
    };
  }, []);

  const currentQ = PLACEMENT_QUESTIONS[stepIdx];

  const playQuestionAudio = useCallback(
    (speed = 0.92) => {
      if (!currentQ?.spokenAudioEn) return;
      const persona =
        AI_PERSONAS.find((p) => p.id === currentQ.voiceId) ?? AI_PERSONAS[0];
      void playNaturalVoice({
        text: currentQ.spokenAudioEn,
        voice: persona.edgeVoice,
        browserLang: persona.browserLang,
        speed,
      });
    },
    [currentQ]
  );

  useEffect(() => {
    if (!loading && !evaluation && currentQ?.kind === 'listening') {
      const timer = window.setTimeout(() => {
        playQuestionAudio(0.92);
      }, 220);
      return () => window.clearTimeout(timer);
    }
  }, [loading, evaluation, currentQ, playQuestionAudio]);

  function handleSelectOption(optId: string) {
    if (pickedOption !== null || !currentQ) return;
    setPickedOption(optId);
    const isCorrect = optId === currentQ.correctOptionId;
    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
    setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
  }

  function handleNextQuestion() {
    if (!currentQ || pickedOption === null) return;
    playTapSound();
    stopVoicePlayback();

    if (stepIdx + 1 >= PLACEMENT_QUESTIONS.length) {
      const finalAnswers = { ...answers, [currentQ.id]: pickedOption };
      const result = evaluatePlacementTest(finalAnswers);
      setEvaluation(result);
      playVictoryFanfare();
      try {
        window.localStorage.setItem(
          PLACEMENT_RESULT_STORAGE_KEY,
          JSON.stringify({
            ...result,
            evaluatedAt: new Date().toISOString(),
          })
        );
      } catch {
        // ignore storage quota
      }
      return;
    }

    setPickedOption(null);
    setStepIdx((i) => i + 1);
  }

  async function handleApplyLevel() {
    if (!evaluation) return;
    setApplying(true);
    playTapSound();

    try {
      if (authenticated && profile) {
        await saveProfile({
          englishLevel: evaluation.recommendedLevel,
          preferredSpeed: evaluation.recommendedSpeed,
        });
        router.push('/');
        router.refresh();
        return;
      }
      router.push('/auth?next=/onboarding');
    } finally {
      setApplying(false);
    }
  }

  function handleRetake() {
    playTapSound();
    stopVoicePlayback();
    setAnswers({});
    setPickedOption(null);
    setEvaluation(null);
    setStepIdx(0);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <Loader2 className="h-5 w-5 animate-spin text-[#78716C]" />
      </div>
    );
  }

  const progressPct = evaluation
    ? 100
    : ((stepIdx + (pickedOption ? 1 : 0)) / PLACEMENT_QUESTIONS.length) * 100;

  const activeSpeaker =
    AI_PERSONAS.find((p) => p.id === currentQ?.voiceId) ?? AI_PERSONAS[0];

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col text-[#1C1917]">
      <header className="sticky top-0 z-20 border-b border-[#E7E2D8] bg-[#FBF9F5]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link
            href={authenticated ? '/' : '/'}
            onClick={() => stopVoicePlayback()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Trang chủ</span>
          </Link>

          <div className="flex-1 h-2 rounded-full bg-[#E7E2D8] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#14532D] transition-all duration-300"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>

          <span className="font-mono text-xs font-semibold text-[#57534E] tabular-nums shrink-0">
            {evaluation
              ? 'Hoàn tất'
              : `Câu ${stepIdx + 1}/${PLACEMENT_QUESTIONS.length}`}
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        {!evaluation && currentQ ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                <span className="rounded-md border border-[#E7E2D8] bg-white px-2 py-0.5 font-mono font-semibold text-[#14532D]">
                  Mức {currentQ.cefrTarget}
                </span>
                <span>·</span>
                <span>{currentQ.contextVi}</span>
              </div>
              <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917] leading-snug">
                {currentQ.promptVi}
              </h1>
            </div>

            {currentQ.kind === 'listening' && currentQ.spokenAudioEn && (
              <div className="rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/75 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <TutorAvatar
                    personaId={activeSpeaker.id}
                    className="h-11 w-11 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#1C1917] flex items-center gap-1.5">
                      <Headphones className="h-4 w-4 text-[#14532D]" />
                      Giọng đọc {activeSpeaker.name} ({activeSpeaker.accentLabel})
                    </div>
                    <p className="text-xs text-[#57534E] mt-0.5">
                      Hãy nghe ngữ điệu tự nhiên để nắm bắt ý chính của người nói.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => playQuestionAudio(0.92)}
                    className="btn-duo btn-duo-green px-4 py-2 text-xs"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Nghe lại
                  </button>
                  <button
                    type="button"
                    onClick={() => playQuestionAudio(0.75)}
                    className="btn-duo btn-duo-white px-3 py-2 text-xs"
                  >
                    0.75x
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                const isPicked = pickedOption === opt.id;
                const isCorrect = opt.id === currentQ.correctOptionId;
                let cls =
                  'border-[#E7E2D8] bg-white text-[#1C1917] hover:border-[#A8A29E]';

                if (pickedOption !== null) {
                  if (isCorrect) {
                    cls = 'border-[#14532D] bg-[#ECFDF5] text-[#14532D]';
                  } else if (isPicked && !isCorrect) {
                    cls = 'border-rose-400 bg-rose-50 text-rose-800';
                  } else {
                    cls = 'border-[#E7E2D8] bg-[#FBF9F5] text-[#A8A29E] opacity-70';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={pickedOption !== null}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left transition cursor-pointer ${cls}`}
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-[#78716C] shrink-0">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span
                        className={
                          currentQ.kind === 'choice'
                            ? 'font-serif-display text-base sm:text-lg font-medium'
                            : 'text-sm sm:text-base font-medium'
                        }
                      >
                        {opt.label}
                      </span>
                    </span>
                    {pickedOption !== null && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#14532D]" />
                    )}
                    {pickedOption !== null && isPicked && !isCorrect && (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {pickedOption !== null && (
              <div className="rounded-2xl border border-[#E7E2D8] bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-[#14532D]">
                    Giải thích ngắn gọn
                  </div>
                  {currentQ.spokenAudioEn && (
                    <p className="font-serif-display italic text-sm text-[#1C1917]">
                      &ldquo;{currentQ.spokenAudioEn}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    {currentQ.explanationVi}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="btn-duo btn-duo-green shrink-0 px-6 py-3 text-sm"
                >
                  {stepIdx + 1 >= PLACEMENT_QUESTIONS.length
                    ? 'Xem kết quả định vị'
                    : 'Câu tiếp theo'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ) : evaluation ? (
          <div className="rounded-2xl border border-[#E7E2D8] bg-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7E2D8] pb-5">
              <div className="space-y-1">
                <p className="font-serif-display italic text-sm text-[#C2410C]">
                  Kết quả định vị năng lực giao tiếp CEFR
                </p>
                <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  {evaluation.titleVi}
                </h1>
                <p className="text-xs text-[#78716C] tabular-nums">
                  Trả lời đúng {evaluation.correctCount}/{evaluation.totalQuestions} câu trọng số · Điểm quy đổi {evaluation.scorePct}/100
                </p>
              </div>

              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-[#14532D] bg-[#ECFDF5] text-[#14532D]">
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  CEFR
                </span>
                <span className="font-serif-display text-3xl font-bold leading-none mt-0.5">
                  {evaluation.cefrBand}
                </span>
              </div>
            </div>

            <p className="text-sm text-[#44403C] leading-relaxed">
              {evaluation.summaryVi}
            </p>

            {/* 3 Skill Breakdown Bars */}
            <div className="grid gap-3 sm:grid-cols-3 tabular-nums">
              {[
                {
                  label: 'Diễn đạt tự nhiên',
                  pct: evaluation.skillBreakdown.phrasingPct,
                },
                {
                  label: 'Nghe hiểu bản xứ',
                  pct: evaluation.skillBreakdown.listeningPct,
                },
                {
                  label: 'Sắc thái giao tiếp',
                  pct: evaluation.skillBreakdown.registerPct,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-[#E7E2D8] bg-[#FBF9F5] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#57534E]">{s.label}</span>
                    <strong className="text-[#1C1917]">{s.pct}%</strong>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#E7E2D8] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#14532D]"
                      style={{ width: `${Math.max(8, s.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Recommended Curriculum Calibration */}
            <div className="rounded-xl border border-[#E7E2D8] bg-[#F3EFE6]/70 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#1C1917]">
                <NovaCompanion className="h-5 w-5" />
                <span>Thiết lập lộ trình đề xuất cho riêng bạn:</span>
              </div>
              <ul className="space-y-1 text-[#57534E] pl-1">
                <li>
                  · Nhóm trình độ trên hệ thống:{' '}
                  <strong className="text-[#1C1917]">
                    {evaluation.recommendedLevel}
                  </strong>{' '}
                  · Tốc độ giọng đọc khởi điểm:{' '}
                  <strong className="text-[#1C1917]">
                    {evaluation.recommendedSpeed}x
                  </strong>
                </li>
                <li>
                  · Điểm xuất phát phù hợp:{' '}
                  <strong className="text-[#14532D]">
                    {evaluation.recommendedUnitTitleVi}
                  </strong>
                </li>
                <li>· Gợi ý: {evaluation.nextAdviceVi}</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleRetake}
                className="btn-duo btn-duo-white px-5 py-3 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Làm lại bài kiểm tra
              </button>
              <button
                type="button"
                disabled={applying}
                onClick={() => void handleApplyLevel()}
                className="btn-duo btn-duo-green flex-1 py-3 text-sm"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang áp dụng...
                  </>
                ) : authenticated ? (
                  <>
                    <Check className="h-4 w-4" />
                    Áp dụng trình độ {evaluation.recommendedLevel} &amp; Vào học ngay
                  </>
                ) : (
                  <>
                    Lưu kết quả {evaluation.cefrBand} &amp; Tạo hồ sơ học tập
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
