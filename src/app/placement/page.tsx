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
import { WorkspacePageSkeleton } from '@/components/PageSkeleton';
import {
  playNaturalVoice,
  preloadNaturalVoice,
  stopVoicePlayback,
} from '@/lib/audio';
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

  // Preload upcoming listening question audio so transitions feel instantaneous
  useEffect(() => {
    if (loading || evaluation) return;
    for (let i = stepIdx + 1; i < PLACEMENT_QUESTIONS.length; i++) {
      const upcoming = PLACEMENT_QUESTIONS[i];
      if (upcoming?.spokenAudioEn) {
        const persona =
          AI_PERSONAS.find((p) => p.id === upcoming.voiceId) ?? AI_PERSONAS[0];
        void preloadNaturalVoice({
          text: upcoming.spokenAudioEn,
          voice: persona.edgeVoice,
          speed: 0.92,
        });
        break;
      }
    }
  }, [loading, evaluation, stepIdx]);

  const handleSelectOption = useCallback(
    (optId: string) => {
      if (pickedOption !== null || !currentQ) return;
      setPickedOption(optId);
      if (optId === currentQ.correctOptionId) {
        playCorrectSound();
      } else {
        playWrongSound();
      }
      setAnswers((prev) => ({ ...prev, [currentQ.id]: optId }));
    },
    [pickedOption, currentQ]
  );

  const handleNextQuestion = useCallback(() => {
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
  }, [answers, currentQ, pickedOption, stepIdx]);

  // Keyboard shortcuts: 1-4 / A-D to answer, Enter/Space to advance, R to replay audio
  useEffect(() => {
    if (loading || evaluation || !currentQ) return;
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'r' && currentQ.spokenAudioEn) {
        e.preventDefault();
        playQuestionAudio(0.92);
        return;
      }
      if (pickedOption === null) {
        const numIdx = Number(e.key) - 1;
        const charIdx = 'abcd'.indexOf(e.key.toLowerCase());
        const idx = numIdx >= 0 ? numIdx : charIdx;
        if (idx >= 0 && idx < currentQ.options.length) {
          e.preventDefault();
          handleSelectOption(currentQ.options[idx].id);
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNextQuestion();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    loading,
    evaluation,
    currentQ,
    pickedOption,
    handleSelectOption,
    handleNextQuestion,
    playQuestionAudio,
  ]);

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
    return <WorkspacePageSkeleton title="Kiểm tra trình độ CEFR" />;
  }

  const progressPct = evaluation
    ? 100
    : ((stepIdx + (pickedOption ? 1 : 0)) / PLACEMENT_QUESTIONS.length) * 100;

  const activeSpeaker =
    AI_PERSONAS.find((p) => p.id === currentQ?.voiceId) ?? AI_PERSONAS[0];

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col text-gray-900">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link
            href="/"
            onClick={() => stopVoicePlayback()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Trang chủ</span>
          </Link>

          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#E5483F] transition-all duration-300"
              style={{ width: `${Math.max(8, progressPct)}%` }}
            />
          </div>

          <span className="font-mono text-xs font-semibold text-gray-500 tabular-nums shrink-0">
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
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-900 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                  CEFR {currentQ.cefrTarget}
                </span>
                <span>{currentQ.contextVi}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
                {currentQ.promptVi}
              </h1>
            </div>

            {currentQ.kind === 'listening' && currentQ.spokenAudioEn && (
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <TutorAvatar
                    personaId={activeSpeaker.id}
                    className="h-12 w-12 shrink-0"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Headphones className="h-4 w-4 text-[#E5483F]" />
                      {activeSpeaker.name} · {activeSpeaker.accentLabel}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Nghe ngữ điệu tự nhiên để nắm bắt ý chính của người nói.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => playQuestionAudio(0.92)}
                    className="btn-duo btn-duo-coral px-4 py-2 text-xs"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Nghe lại
                  </button>
                  <button
                    type="button"
                    onClick={() => playQuestionAudio(0.75)}
                    className="btn-duo btn-duo-white px-3.5 py-2 text-xs"
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
                  'border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:shadow-xs';

                if (pickedOption !== null) {
                  if (isCorrect) {
                    cls = 'border-emerald-500 bg-emerald-50 text-emerald-900';
                  } else if (isPicked && !isCorrect) {
                    cls = 'border-rose-400 bg-rose-50 text-rose-800';
                  } else {
                    cls = 'border-gray-200 bg-gray-50 text-gray-400 opacity-70';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={pickedOption !== null}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition cursor-pointer ${cls}`}
                  >
                    <span className="flex items-baseline gap-3.5">
                      <span className="font-mono text-xs text-gray-400 shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm sm:text-base font-semibold">
                        {opt.label}
                      </span>
                    </span>
                    {pickedOption !== null && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    )}
                    {pickedOption !== null && isPicked && !isCorrect && (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                    )}
                  </button>
                );
              })}
            </div>

            {pickedOption !== null && (
              <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-700">
                    Giải thích nhanh
                  </div>
                  {currentQ.spokenAudioEn && (
                    <p className="text-sm font-semibold text-gray-900">
                      &ldquo;{currentQ.spokenAudioEn}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentQ.explanationVi}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="btn-duo btn-duo-primary shrink-0 px-6 py-3 text-sm"
                >
                  {stepIdx + 1 >= PLACEMENT_QUESTIONS.length
                    ? 'Xem kết quả'
                    : 'Câu tiếp theo'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ) : evaluation ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#E5483F]">
                  Kết quả định vị trình độ CEFR
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                  {evaluation.titleVi}
                </h1>
                <p className="text-xs text-gray-500 tabular-nums">
                  Trả lời đúng {evaluation.correctCount}/{evaluation.totalQuestions} câu · Điểm quy đổi {evaluation.scorePct}/100
                </p>
              </div>

              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-gray-900 text-white">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  CEFR
                </span>
                <span className="font-display text-3xl font-extrabold leading-none mt-0.5">
                  {evaluation.cefrBand}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {evaluation.summaryVi}
            </p>

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
                  className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{s.label}</span>
                    <strong className="text-gray-900">{s.pct}%</strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(8, s.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <NovaCompanion className="h-5 w-5" />
                <span>Thiết lập lộ trình đề xuất cho bạn:</span>
              </div>
              <ul className="space-y-1 text-gray-600 pl-1">
                <li>
                  · Trình độ:{' '}
                  <strong className="text-gray-900">
                    {evaluation.recommendedLevel}
                  </strong>{' '}
                  · Tốc độ giọng đọc:{' '}
                  <strong className="text-gray-900">
                    {evaluation.recommendedSpeed}x
                  </strong>
                </li>
                <li>
                  · Chặng bắt đầu:{' '}
                  <strong className="text-[#E5483F]">
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
                className="btn-duo btn-duo-coral flex-1 py-3 text-sm"
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
