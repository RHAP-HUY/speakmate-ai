'use client';

import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Flame,
  Gamepad2,
  Heart,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  Puzzle,
  RotateCcw,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { getScoreTone } from '@/components/PronunciationBadge';
import {
  createSpeechRecorder,
  playNaturalVoice,
  stopVoicePlayback,
} from '@/lib/audio';
import {
  getCurrentProfile,
  getDailyStats,
  getLocalPersonalKey,
  getTodayLocalDate,
  recordLessonProgress,
} from '@/lib/data-store';
import {
  pickShuffledItems,
  PRONUNCIATION_CHALLENGES,
  SENTENCE_BUILD_QUESTIONS,
  SPEED_MATCH_QUESTIONS,
  type PronunciationChallengeItem,
  type SentenceBuildQuestion,
  type SpeedMatchQuestion,
} from '@/lib/game-data';
import { computeStrictStreak, getLevelInfo } from '@/lib/gamification';
import { AI_PERSONAS, pickPersona } from '@/lib/scenarios';
import type {
  AiPersona,
  LessonRewardSummary,
  PronunciationPracticeResult,
  UserProfile,
} from '@/types';

type GameMode = 'lobby' | 'speed' | 'build' | 'pronounce' | 'victory';

interface ShuffledSpeedItem extends SpeedMatchQuestion {
  shuffledOptions: string[];
}

interface WordTile {
  id: string;
  word: string;
}

export default function PlayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [studiedToday, setStudiedToday] = useState(false);
  const [persona, setPersona] = useState<AiPersona>(AI_PERSONAS[0]);

  const [mode, setMode] = useState<GameMode>('lobby');
  const [roundStartTs, setRoundStartTs] = useState<number>(0);

  // Speed Match state
  const [speedItems, setSpeedItems] = useState<ShuffledSpeedItem[]>([]);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  // Sentence Build state
  const [buildItems, setBuildItems] = useState<SentenceBuildQuestion[]>([]);
  const [buildIdx, setBuildIdx] = useState(0);
  const [availableTiles, setAvailableTiles] = useState<WordTile[]>([]);
  const [chosenTiles, setChosenTiles] = useState<WordTile[]>([]);
  const [buildChecked, setBuildChecked] = useState<'idle' | 'correct' | 'wrong'>(
    'idle'
  );

  // Pronunciation Arena state
  const [pronItems, setPronItems] = useState<PronunciationChallengeItem[]>([]);
  const [pronIdx, setPronIdx] = useState(0);
  const [pronScores, setPronScores] = useState<number[]>([]);
  const [pronStatus, setPronStatus] = useState<'idle' | 'recording' | 'scoring'>(
    'idle'
  );
  const [pronResult, setPronResult] =
    useState<PronunciationPracticeResult | null>(null);
  const [pronError, setPronError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  // Victory state
  const [victoryReward, setVictoryReward] = useState<LessonRewardSummary | null>(
    null
  );
  const [victoryMeta, setVictoryMeta] = useState<{
    gameTitle: string;
    scoreText: string;
    extraTip: string;
  } | null>(null);
  const [savingVictory, setSavingVictory] = useState(false);

  // Audio recording refs for Pronunciation Arena
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopMedia = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stopVoicePlayback();
      stopMedia();
    };
  }, [stopMedia]);

  const refreshProgress = useCallback(async () => {
    const [{ profile: prof }, stats] = await Promise.all([
      getCurrentProfile(),
      getDailyStats(90),
    ]);
    if (prof) {
      const strict = computeStrictStreak(stats, getTodayLocalDate());
      setProfile(prof);
      setStudiedToday(strict.studiedToday);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const { profile: prof, authenticated: isAuth } = await getCurrentProfile();
      if (!active) return;
      if (!isAuth || !prof) {
        router.replace('/auth?next=/play');
        return;
      }
      const stats = await getDailyStats(90);
      if (!active) return;
      const strict = computeStrictStreak(stats, getTodayLocalDate());
      setProfile(prof);
      setAuthenticated(true);
      setStudiedToday(strict.studiedToday);
      setPersona(pickPersona(prof.preferredAccent));
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  // Countdown timer for Speed Match
  useEffect(() => {
    if (mode !== 'speed' || selectedOption !== null) return;
    if (timeLeft <= 0) {
      const t = setTimeout(() => {
        setSelectedOption('__TIMEOUT__');
        setCombo(0);
        setHearts((h) => Math.max(0, h - 1));
      }, 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [mode, selectedOption, timeLeft]);

  function speakText(text: string, speed = 0.88) {
    void playNaturalVoice({
      text,
      voice: persona.edgeVoice,
      browserLang: persona.browserLang,
      speed,
    });
  }

  function setupBuildTiles(q: SentenceBuildQuestion) {
    const shuffled = pickShuffledItems(
      q.words.map((word, idx) => ({ id: `${q.id}-${idx}`, word })),
      q.words.length
    );
    setAvailableTiles(shuffled);
    setChosenTiles([]);
    setBuildChecked('idle');
    void playNaturalVoice({
      text: q.sentenceEn,
      voice: persona.edgeVoice,
      browserLang: persona.browserLang,
      speed: 0.85,
    });
  }

  function startSpeedMatch() {
    stopVoicePlayback();
    const picked: ShuffledSpeedItem[] = pickShuffledItems(
      SPEED_MATCH_QUESTIONS,
      5
    ).map((q) => ({
      ...q,
      shuffledOptions: pickShuffledItems(q.options, q.options.length),
    }));
    setSpeedItems(picked);
    setSpeedIdx(0);
    setSelectedOption(null);
    setHearts(3);
    setCombo(0);
    setBestCombo(0);
    setCorrectCount(0);
    setTimeLeft(15);
    setRoundStartTs(Date.now());
    setMode('speed');
  }

  function startSentenceBuild() {
    stopVoicePlayback();
    const picked = pickShuffledItems(SENTENCE_BUILD_QUESTIONS, 5);
    setBuildItems(picked);
    setBuildIdx(0);
    setCorrectCount(0);
    setCombo(0);
    setBestCombo(0);
    setRoundStartTs(Date.now());
    setMode('build');
    if (picked[0]) {
      setupBuildTiles(picked[0]);
    }
  }

  function startPronunciationArena() {
    stopVoicePlayback();
    const picked = pickShuffledItems(PRONUNCIATION_CHALLENGES, 3);
    setPronItems(picked);
    setPronIdx(0);
    setPronScores([]);
    setPronResult(null);
    setPronError(null);
    setPronStatus('idle');
    setRoundStartTs(Date.now());
    setMode('pronounce');
  }

  async function finishGameRound(params: {
    gameTitle: string;
    xpEarned: number;
    gemsEarned: number;
    scoreText: string;
    extraTip: string;
    completedLesson: boolean;
  }) {
    setSavingVictory(true);
    setMode('victory');
    setVictoryMeta({
      gameTitle: params.gameTitle,
      scoreText: params.scoreText,
      extraTip: params.extraTip,
    });

    const elapsedSec = Math.max(
      20,
      Math.round((Date.now() - roundStartTs) / 1000)
    );

    try {
      const reward = await recordLessonProgress({
        durationSeconds: elapsedSec,
        userMessagesSent: 5,
        completedLesson: params.completedLesson,
        xpEarned: params.xpEarned,
        gemsEarned: params.gemsEarned,
        sessionsDelta: 1,
      });
      setVictoryReward(reward);
      await refreshProgress();
    } finally {
      setSavingVictory(false);
    }
  }

  function handleSelectSpeedOption(opt: string) {
    if (selectedOption !== null) return;
    const current = speedItems[speedIdx];
    if (!current) return;

    setSelectedOption(opt);
    const isCorrect = opt === current.correctEn;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
    } else {
      setCombo(0);
      setHearts((h) => Math.max(0, h - 1));
    }
    speakText(current.correctEn, 0.9);
  }

  function handleNextSpeedQuestion() {
    stopVoicePlayback();
    if (speedIdx + 1 >= speedItems.length) {
      const bonusXp = bestCombo * 5 + correctCount * 8;
      const passed = correctCount >= 3;
      void finishGameRound({
        gameTitle: '⚡ Phản xạ Bản xứ',
        xpEarned: passed ? 65 + bonusXp : 25,
        gemsEarned: passed ? 20 + Math.min(10, bestCombo * 2) : 5,
        scoreText: `${correctCount}/${speedItems.length} câu đúng · Combo cao nhất x${bestCombo}`,
        extraTip: passed
          ? 'Bạn đã hoàn thành trọn vẹn 1 bài học và giữ chuỗi hôm nay!'
          : 'Bạn cần đúng ít nhất 3/5 câu để tính hoàn thành bài học giữ chuỗi. Thử lại nhé!',
        completedLesson: passed,
      });
      return;
    }
    setSpeedIdx((i) => i + 1);
    setSelectedOption(null);
    setTimeLeft(15);
  }

  function handlePickWordTile(tile: WordTile) {
    if (buildChecked !== 'idle') return;
    setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setChosenTiles((prev) => [...prev, tile]);
  }

  function handleRemoveWordTile(tile: WordTile) {
    if (buildChecked !== 'idle') return;
    setChosenTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setAvailableTiles((prev) => [...prev, tile]);
  }

  function handleCheckBuildSentence() {
    const q = buildItems[buildIdx];
    if (!q || chosenTiles.length === 0) return;
    const userSentence = chosenTiles.map((t) => t.word).join(' ').trim();
    const isCorrect =
      userSentence.toLowerCase() === q.sentenceEn.trim().toLowerCase();
    setBuildChecked(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
    } else {
      setCombo(0);
    }
    speakText(q.sentenceEn, 0.9);
  }

  function handleNextBuildQuestion() {
    stopVoicePlayback();
    if (buildIdx + 1 >= buildItems.length) {
      const passed = correctCount >= 3;
      void finishGameRound({
        gameTitle: '🧩 Nghe & Ghép câu Bản xứ',
        xpEarned: passed ? 75 + correctCount * 8 : 25,
        gemsEarned: passed ? 25 : 5,
        scoreText: `${correctCount}/${buildItems.length} câu ghép chuẩn`,
        extraTip: passed
          ? 'Tuyệt đỉnh! Phản xạ ghép cấu trúc câu bản xứ của bạn đang tiến bộ rất nhanh.'
          : 'Cần ghép đúng ít nhất 3/5 câu để tính hoàn thành bài giữ chuỗi. Chơi lại ngay nhé!',
        completedLesson: passed,
      });
      return;
    }
    const nextIdx = buildIdx + 1;
    setBuildIdx(nextIdx);
    setupBuildTiles(buildItems[nextIdx]);
  }

  async function submitPronArenaAudio(blob: Blob) {
    const current = pronItems[pronIdx];
    if (!current) return;
    setPronStatus('scoring');
    setPronError(null);

    try {
      const headers: Record<string, string> = {};
      const personalKey = getLocalPersonalKey();
      if (personalKey && profile?.apiKeyMode === 'personal') {
        headers['x-user-gemini-key'] = personalKey;
      }

      const fd = new FormData();
      fd.append(
        'payload',
        JSON.stringify({
          targetSentence: current.sentence,
          personaId: persona.id,
          accentLabel: persona.accentLabel,
          englishLevel: profile?.englishLevel ?? 'A0-A1',
          profileOverride: profile
            ? {
                displayName: profile.displayName,
                englishLevel: profile.englishLevel,
                jobField: profile.jobField,
                hobbies: profile.hobbies,
              }
            : undefined,
        })
      );
      fd.append('audio', blob, 'arena.webm');

      const res = await fetch('/api/tutor/pronunciation', {
        method: 'POST',
        headers,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể chấm điểm phát âm lúc này.');
      }
      const assessment = data.assessment as PronunciationPracticeResult;
      setPronResult(assessment);
      setPronScores((prev) => {
        const next = [...prev];
        next[pronIdx] = Math.max(next[pronIdx] ?? 0, assessment.overallScore);
        return next;
      });
    } catch (err) {
      setPronError(
        err instanceof Error ? err.message : 'Có lỗi khi chấm phát âm.'
      );
    } finally {
      setPronStatus('idle');
    }
  }

  async function startArenaRecording() {
    if (pronStatus === 'scoring') return;
    setPronError(null);
    stopVoicePlayback();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const recorder = createSpeechRecorder(stream);
      chunksRef.current = [];
      recordStartRef.current = Date.now();
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const duration = Date.now() - recordStartRef.current;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        stopMedia();

        if (duration < 400 || blob.size < 900) {
          setPronError('Đoạn ghi âm hơi ngắn. Bạn hãy đọc hết câu rồi bấm Dừng nhé!');
          setPronStatus('idle');
          return;
        }
        void submitPronArenaAudio(blob);
      };

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (
            !mediaRecorderRef.current ||
            mediaRecorderRef.current.state !== 'recording'
          ) {
            return;
          }
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const norm = (buf[i] - 128) / 128;
            sum += norm * norm;
          }
          setMicLevel(Math.min(100, Math.round(Math.sqrt(sum / buf.length) * 360)));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }

      recorder.start(200);
      setPronStatus('recording');
    } catch {
      stopMedia();
      setPronError('Không thể mở Micro. Hãy cấp quyền Micro trên trình duyệt nhé.');
      setPronStatus('idle');
    }
  }

  function stopArenaRecording() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  }

  function handleNextPronChallenge() {
    stopVoicePlayback();
    if (pronIdx + 1 >= pronItems.length) {
      const avg =
        pronScores.length > 0
          ? Math.round(
              pronScores.reduce((a, b) => a + b, 0) / pronScores.length
            )
          : 0;
      const passed = pronScores.length >= pronItems.length && avg >= 60;
      void finishGameRound({
        gameTitle: '🎙️ Đấu trường Phát âm',
        xpEarned: passed ? 90 + Math.round(avg * 0.4) : 30,
        gemsEarned: passed ? 30 : 10,
        scoreText: `Điểm phát âm trung bình: ${avg}/100 (${pronItems.length} câu)`,
        extraTip: passed
          ? 'Giọng nói rất tự tin! Bạn đã phá đảo Đấu trường và giữ chuỗi hôm nay!'
          : 'Hãy nghe mẫu chậm rồi đọc lại để đạt trung bình ≥ 60/100 nhé!',
        completedLesson: passed,
      });
      return;
    }
    setPronIdx((i) => i + 1);
    setPronResult(null);
    setPronError(null);
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-light">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const levelInfo = getLevelInfo(profile.xp);
  const currentSpeed = speedItems[speedIdx];
  const currentBuild = buildItems[buildIdx];
  const currentPron = pronItems[pronIdx];

  return (
    <div className="min-h-screen flex flex-col bg-mesh-light pb-24 md:pb-12">
      <AppNav profile={profile} authenticated={authenticated} />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        {/* LOBBY MODE */}
        {mode === 'lobby' && (
          <>
            {/* Playful Gamified Header */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/20">
              <div className="pointer-events-none absolute -top-20 -right-12 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-12 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-xs">
                      <Gamepad2 className="h-3.5 w-3.5 text-amber-300" />
                      Học kiểu Chơi Game · Không bao giờ chán
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${
                        studiedToday
                          ? 'bg-emerald-400/25 text-emerald-100 border border-emerald-300/40'
                          : 'bg-amber-400/25 text-amber-100 border border-amber-300/40'
                      }`}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      {studiedToday
                        ? `Đã thắp lửa hôm nay (${profile.streakDays} ngày)`
                        : 'Xong 1 màn bất kỳ để giữ chuỗi hôm nay!'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                    Đấu trường Phản xạ Tiếng Anh 🎮
                  </h1>
                  <p className="text-sm text-indigo-100 max-w-xl leading-relaxed">
                    Chọn một trò chơi nhanh 2–3 phút bên dưới. Hoàn thành trọn vẹn 1 màn chơi để tích <strong>XP leo cấp</strong>, kiếm <strong>Ngọc 💎 đổi quà</strong> và <strong>giữ chuỗi ngày học 🔥</strong>!
                  </p>
                </div>

                {/* Level & Currency Card */}
                <div className="shrink-0 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md p-4 min-w-64 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      Lv.{levelInfo.level} · {levelInfo.titleVi}
                    </span>
                    <span className="text-amber-200">{profile.xp} XP</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all"
                      style={{ width: `${levelInfo.progressPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold pt-1">
                    <span>🔥 {profile.streakDays} ngày</span>
                    <span>💎 {profile.gems} Ngọc</span>
                    <span>🧊 {profile.streakFreezes} Khiên</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Accent Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs">
              <div className="text-xs font-bold text-slate-700">
                🎧 Chọn giọng bản xứ đọc trong trò chơi:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AI_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      persona.id === p.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.flag} {p.name} ({p.accent})
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Game Mode Cards */}
            <div className="grid gap-5 md:grid-cols-3">
              {/* Game 1: Speed Match */}
              <div className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/10 transition">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-500/20">
                      <Zap className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                      ~2 phút · 5 câu
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    ⚡ Phản xạ Bản xứ
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Đấu tốc độ 15 giây/câu! Chọn cách nói tự nhiên nhất kiểu người bản xứ (tránh lỗi dịch từng chữ Vietlish), giữ Combo x5 & 3 trái tim ❤️.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700">
                      +65~130 XP
                    </span>
                    <span className="rounded-lg bg-cyan-50 px-2 py-0.5 text-cyan-700">
                      +20 💎
                    </span>
                    <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-orange-700">
                      🔥 Giữ chuỗi
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startSpeedMatch}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer"
                >
                  Chơi ngay
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Game 2: Sentence Build */}
              <div className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
                      <Puzzle className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-extrabold text-indigo-700">
                      ~3 phút · 5 câu
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    🧩 Nghe & Ghép câu
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Nghe giọng bản xứ đọc rồi bấm ghép các thẻ từ theo đúng trật tự câu. Cực hiệu quả để nhớ cấu trúc giao tiếp đời sống, công việc & du lịch!
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700">
                      +75~115 XP
                    </span>
                    <span className="rounded-lg bg-cyan-50 px-2 py-0.5 text-cyan-700">
                      +25 💎
                    </span>
                    <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-orange-700">
                      🔥 Giữ chuỗi
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startSentenceBuild}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-extrabold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-violet-700 transition cursor-pointer"
                >
                  Chơi ngay
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Game 3: Pronunciation Arena */}
              <div className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10 transition">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                      <Mic className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700">
                      AI Chấm âm · 3 câu
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    🎙️ Đấu trường Phát âm
                  </h2>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    Thử thách đọc to 3 câu bản xứ thực tế! AI chấm điểm từng từ (0–100) kèm mẹo nối âm. Đạt trung bình ≥ 60 để phá đảo & nhận thưởng lớn!
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-indigo-700">
                      +90~130 XP
                    </span>
                    <span className="rounded-lg bg-cyan-50 px-2 py-0.5 text-cyan-700">
                      +30 💎
                    </span>
                    <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-orange-700">
                      🔥 Giữ chuỗi
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startPronunciationArena}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-extrabold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-600 transition cursor-pointer"
                >
                  Vào đấu trường
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Call Quest Link */}
            <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-md">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Muốn nhập vai nói chuyện trực tiếp với người nước ngoài?
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Hoàn thành ít nhất <strong>3 lượt nói</strong> trong 1 cuộc gọi AI cũng sẽ giữ chuỗi ngày học 🔥 và nhận báo cáo 4 kỹ năng!
                  </p>
                </div>
              </div>
              <Link
                href="/call"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-600 transition"
              >
                Gọi AI ngay
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        )}

        {/* GAME 1: SPEED MATCH */}
        {mode === 'speed' && currentSpeed && (
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Top HUD */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  stopVoicePlayback();
                  setMode('lobby');
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Thoát
              </button>

              <div className="flex-1 mx-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                    style={{
                      width: `${((speedIdx + (selectedOption ? 1 : 0)) / speedItems.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs font-extrabold">
                {combo >= 2 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 animate-bounce">
                    🔥 x{combo}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
                    timeLeft <= 5
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" />
                  {timeLeft}s
                </span>
                <span className="inline-flex items-center gap-0.5 text-rose-500">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`h-4 w-4 ${
                        i < hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </span>
              </div>
            </div>

            {/* Question Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-bold text-indigo-700">
                  Câu {speedIdx + 1} / {speedItems.length} · {currentSpeed.contextVi}
                </span>
                <h2 className="mt-3 text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                  {currentSpeed.promptVi}
                </h2>
              </div>

              <div className="space-y-2.5">
                {currentSpeed.shuffledOptions.map((opt) => {
                  const isPicked = selectedOption === opt;
                  const isCorrectOpt = opt === currentSpeed.correctEn;
                  let btnClass =
                    'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/50';
                  if (selectedOption !== null) {
                    if (isCorrectOpt) {
                      btnClass =
                        'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200';
                    } else if (isPicked && !isCorrectOpt) {
                      btnClass =
                        'border-rose-400 bg-rose-50 text-rose-900';
                    } else {
                      btnClass = 'border-slate-100 bg-slate-50 text-slate-400 opacity-70';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleSelectSpeedOption(opt)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-bold transition cursor-pointer ${btnClass}`}
                    >
                      <span>{opt}</span>
                      {selectedOption !== null && isCorrectOpt && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                      {selectedOption !== null && isPicked && !isCorrectOpt && (
                        <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Drawer */}
              {selectedOption !== null && (
                <div
                  className={`rounded-2xl border p-4 space-y-2 ${
                    selectedOption === currentSpeed.correctEn
                      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                      : 'border-amber-200 bg-amber-50/90 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">
                      {selectedOption === currentSpeed.correctEn
                        ? '🎉 Chính xác! Quá chuẩn bản xứ!'
                        : selectedOption === '__TIMEOUT__'
                          ? '⏰ Hết giờ! Đáp án chuẩn bản xứ:'
                          : '💡 Gần đúng rồi! Cách bản xứ nói:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(currentSpeed.correctEn, 0.85)}
                      className="inline-flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Nghe lại
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-cyan-800">
                    /{currentSpeed.phonetic}/
                  </div>
                  <p className="text-xs leading-relaxed">
                    {currentSpeed.tipVi}
                  </p>
                  <button
                    type="button"
                    onClick={handleNextSpeedQuestion}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-600 transition cursor-pointer"
                  >
                    {speedIdx + 1 >= speedItems.length
                      ? 'Hoàn thành & Nhận thưởng 🎉'
                      : 'Câu tiếp theo →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GAME 2: SENTENCE BUILD */}
        {mode === 'build' && currentBuild && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  stopVoicePlayback();
                  setMode('lobby');
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Thoát
              </button>
              <div className="flex-1 mx-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                    style={{
                      width: `${((buildIdx + (buildChecked !== 'idle' ? 1 : 0)) / buildItems.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-extrabold text-indigo-700">
                Câu {buildIdx + 1}/{buildItems.length}
              </span>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
                  🧩 Nghe giọng {persona.name} ({persona.accent}) và ghép thành câu đúng
                </span>
                <p className="text-base sm:text-lg font-extrabold text-slate-900">
                  🇻🇳 “{currentBuild.meaningVi}”
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => speakText(currentBuild.sentenceEn, 0.88)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe câu mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentBuild.sentenceEn, 0.72)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    🐢 Nghe chậm
                  </button>
                </div>
              </div>

              {/* Answer Drop Zone */}
              <div className="min-h-20 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-3 flex flex-wrap items-center gap-2">
                {chosenTiles.length === 0 ? (
                  <span className="w-full text-center text-xs text-slate-400">
                    Chạm vào các thẻ từ bên dưới để ghép thành câu tiếng Anh hoàn chỉnh...
                  </span>
                ) : (
                  chosenTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      disabled={buildChecked !== 'idle'}
                      onClick={() => handleRemoveWordTile(tile)}
                      className="rounded-xl border border-indigo-300 bg-white px-3.5 py-2 text-sm font-bold text-indigo-900 shadow-xs hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
                    >
                      {tile.word}
                    </button>
                  ))
                )}
              </div>

              {/* Word Bank */}
              <div className="flex flex-wrap justify-center gap-2">
                {availableTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={buildChecked !== 'idle'}
                    onClick={() => handlePickWordTile(tile)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-xs hover:border-indigo-400 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    {tile.word}
                  </button>
                ))}
              </div>

              {buildChecked === 'idle' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setupBuildTiles(currentBuild)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={chosenTiles.length === 0}
                    onClick={handleCheckBuildSentence}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-extrabold text-white shadow-md disabled:opacity-40 hover:from-indigo-700 hover:to-violet-700 transition cursor-pointer"
                  >
                    Kiểm tra đáp án
                  </button>
                </div>
              ) : (
                <div
                  className={`rounded-2xl border p-4 space-y-2 ${
                    buildChecked === 'correct'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                      : 'border-rose-200 bg-rose-50 text-rose-950'
                  }`}
                >
                  <div className="text-sm font-extrabold">
                    {buildChecked === 'correct'
                      ? '🎉 Chuẩn không cần chỉnh!'
                      : `✨ Câu chuẩn: "${currentBuild.sentenceEn}"`}
                  </div>
                  <div className="text-xs text-cyan-800 font-semibold">
                    /{currentBuild.phonetic}/
                  </div>
                  <p className="text-xs leading-relaxed">
                    💡 {currentBuild.tipVi}
                  </p>
                  <button
                    type="button"
                    onClick={handleNextBuildQuestion}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-extrabold text-white hover:bg-indigo-600 transition cursor-pointer"
                  >
                    {buildIdx + 1 >= buildItems.length
                      ? 'Hoàn thành & Nhận thưởng 🎉'
                      : 'Câu tiếp theo →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GAME 3: PRONUNCIATION ARENA */}
        {mode === 'pronounce' && currentPron && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  stopVoicePlayback();
                  stopMedia();
                  setMode('lobby');
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Thoát
              </button>
              <div className="flex-1 mx-2">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                    style={{
                      width: `${((pronIdx + (pronResult ? 1 : 0)) / pronItems.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-extrabold text-emerald-700">
                Vòng {pronIdx + 1}/{pronItems.length}
              </span>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 p-5 text-center space-y-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  🎙️ Đọc to câu sau theo giọng {persona.accent}
                </span>
                <p className="text-xl font-extrabold text-slate-900">
                  “{currentPron.sentence}”
                </p>
                <p className="text-xs font-semibold text-cyan-700">
                  /{currentPron.phonetic}/
                </p>
                <p className="text-xs text-slate-600">
                  🇻🇳 {currentPron.vietnamese}
                </p>
                <p className="text-[11px] text-emerald-800 bg-white/80 rounded-xl px-3 py-1.5 inline-block">
                  💡 {currentPron.focusTipVi}
                </p>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => speakText(currentPron.sentence, 0.88)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Nghe mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentPron.sentence, 0.72)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    🐢 Chậm 0.72x
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  disabled={pronStatus === 'scoring'}
                  onClick={() => {
                    if (pronStatus === 'recording') {
                      stopArenaRecording();
                    } else {
                      void startArenaRecording();
                    }
                  }}
                  className={`inline-flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm font-extrabold text-white shadow-lg transition disabled:opacity-60 cursor-pointer ${
                    pronStatus === 'recording'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
                  }`}
                >
                  {pronStatus === 'scoring' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI đang chấm phát âm...
                    </>
                  ) : pronStatus === 'recording' ? (
                    <>
                      <MicOff className="h-4 w-4 animate-pulse" />
                      Dừng & Chấm điểm
                      <span
                        className="ml-1 inline-block h-2.5 rounded-full bg-white/90"
                        style={{ width: `${Math.max(10, micLevel * 0.45)}px` }}
                      />
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      {pronResult ? 'Đọc lại để phá kỷ lục' : 'Bấm Micro để đọc'}
                    </>
                  )}
                </button>
              </div>

              {pronError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  {pronError}
                </div>
              )}

              {pronResult && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-13 w-13 flex-col items-center justify-center rounded-2xl border font-extrabold ${
                          getScoreTone(pronResult.overallScore).pillLight
                        }`}
                      >
                        <span className="text-lg leading-none">
                          {pronResult.overallScore}
                        </span>
                        <span className="text-[10px]">/100</span>
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {getScoreTone(pronResult.overallScore).label}
                        </div>
                        <div className="text-xs text-slate-600">
                          {pronResult.summaryVi}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {pronResult.wordFeedback.map((w, i) => (
                      <span
                        key={`${w.word}-${i}`}
                        className={`rounded-xl border px-2.5 py-1 text-xs font-bold ${
                          w.status === 'good'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : w.status === 'improve'
                              ? 'border-amber-300 bg-amber-50 text-amber-900'
                              : 'border-rose-300 bg-rose-50 text-rose-800 line-through'
                        }`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNextPronChallenge}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-extrabold text-white hover:bg-emerald-600 transition cursor-pointer"
                  >
                    {pronIdx + 1 >= pronItems.length
                      ? 'Hoàn thành Đấu trường & Nhận thưởng 🏆'
                      : 'Sang câu tiếp theo →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VICTORY SCREEN */}
        {mode === 'victory' && (
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xl space-y-5">
            {savingVictory ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-600">
                  Đang cập nhật chuỗi học & cộng thưởng...
                </p>
              </div>
            ) : (
              <>
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 text-3xl shadow-lg shadow-orange-500/25">
                  {victoryReward?.lessonCompleted ? '🏆' : '💪'}
                </div>

                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {victoryMeta?.gameTitle}
                  </span>
                  <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                    {victoryReward?.lessonCompleted
                      ? 'Hoàn thành bài học xuất sắc!'
                      : 'Cố gắng thêm chút nữa nhé!'}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {victoryMeta?.scoreText}
                  </p>
                </div>

                {/* Reward Chips */}
                {victoryReward && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3">
                      <div className="text-lg font-extrabold text-indigo-700">
                        +{victoryReward.xpEarned}
                      </div>
                      <div className="text-[11px] font-semibold text-indigo-600">
                        XP kinh nghiệm
                      </div>
                    </div>
                    <div className="rounded-2xl bg-cyan-50 border border-cyan-100 p-3">
                      <div className="text-lg font-extrabold text-cyan-700">
                        +{victoryReward.gemsEarned} 💎
                      </div>
                      <div className="text-[11px] font-semibold text-cyan-600">
                        Ngọc đổi quà
                      </div>
                    </div>
                    <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3">
                      <div className="text-lg font-extrabold text-orange-600">
                        🔥 {victoryReward.streakDays}
                      </div>
                      <div className="text-[11px] font-semibold text-orange-600">
                        Chuỗi ngày
                      </div>
                    </div>
                  </div>
                )}

                {/* Strict streak status box */}
                <div
                  className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
                    victoryReward?.lessonCompleted
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {victoryMeta?.extraTip}
                </div>

                {victoryReward?.leveledUp && (
                  <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-extrabold text-white flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    Chúc mừng bạn vừa thăng lên Cấp {victoryReward.newLevel}!
                  </div>
                )}

                {victoryReward &&
                  victoryReward.newlyClaimableMilestones.length > 0 && (
                    <Link
                      href="/history#rewards"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600"
                    >
                      <Award className="h-4 w-4" />
                      🎁 Mở rương thưởng mốc {victoryReward.newlyClaimableMilestones[0]} ngày ngay!
                    </Link>
                  )}

                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('lobby')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-xs font-extrabold text-slate-800 hover:bg-slate-100 cursor-pointer"
                  >
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Chơi màn khác
                  </button>
                  <Link
                    href="/history"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-3 text-xs font-extrabold text-white hover:bg-indigo-700"
                  >
                    Xem Lịch chuỗi & Quà
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
