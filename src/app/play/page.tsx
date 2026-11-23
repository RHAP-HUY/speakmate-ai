'use client';

import {
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  Gift,
  Headphones,
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
  Wand2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  GemSvg,
  NovaCompanion,
  StreakFlameSvg,
  TreasureChestSvg,
} from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import { getScoreTone } from '@/components/PronunciationBadge';
import {
  createSpeechRecorder,
  playNaturalVoice,
  stopVoicePlayback,
} from '@/lib/audio';
import {
  claimStreakMilestone,
  getCurrentProfile,
  getDailyStats,
  getLocalPersonalKey,
  getTodayLocalDate,
  recordLessonProgress,
} from '@/lib/data-store';
import {
  LISTENING_CHALLENGES,
  pickShuffledItems,
  PRONUNCIATION_CHALLENGES,
  SENTENCE_BUILD_QUESTIONS,
  SPEED_MATCH_QUESTIONS,
  type ListeningChallengeItem,
  type PronunciationChallengeItem,
  type SentenceBuildQuestion,
  type SpeedMatchQuestion,
} from '@/lib/game-data';
import {
  computeStrictStreak,
  getLevelInfo,
  getXpBoostRemainingMinutes,
  isXpBoostActive,
  STREAK_MILESTONES,
} from '@/lib/gamification';
import { AI_PERSONAS, pickPersona } from '@/lib/scenarios';
import {
  playChestOpenSound,
  playCorrectSound,
  playTapSound,
  playVictoryFanfare,
  playWrongSound,
} from '@/lib/sound-fx';
import type {
  AiPersona,
  LessonRewardSummary,
  PronunciationPracticeResult,
  TopicCategory,
  UserProfile,
} from '@/types';

type GameMode = 'lobby' | 'speed' | 'listen' | 'build' | 'pronounce' | 'victory';
type GameCategoryFilter = Exclude<TopicCategory, 'freetalk'> | null;

interface ShuffledSpeedItem extends SpeedMatchQuestion {
  shuffledOptions: string[];
}

interface ShuffledListeningItem extends ListeningChallengeItem {
  shuffledOptionsVi: string[];
}

interface WordTile {
  id: string;
  word: string;
}

function pickByCategory<T extends { category: Exclude<TopicCategory, 'freetalk'> }>(
  all: T[],
  count: number,
  category: GameCategoryFilter
): T[] {
  if (!category) return pickShuffledItems(all, count);
  const matching = pickShuffledItems(
    all.filter((item) => item.category === category),
    count
  );
  if (matching.length >= count) return matching;
  const matchedSet = new Set(matching);
  const extras = pickShuffledItems(
    all.filter((item) => !matchedSet.has(item)),
    count - matching.length
  );
  return [...matching, ...extras];
}

function PlayPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialModeParam = searchParams.get('mode');
  const initialCategoryParam = searchParams.get('category') as GameCategoryFilter;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [studiedToday, setStudiedToday] = useState(false);
  const [persona, setPersona] = useState<AiPersona>(AI_PERSONAS[0]);

  const [mode, setMode] = useState<GameMode>('lobby');
  const [roundStartTs, setRoundStartTs] = useState<number>(0);

  // Speed Match (+ AI Custom Quiz) state
  const [speedRoundTitle, setSpeedRoundTitle] = useState('⚡ Phản xạ Bản xứ');
  const [speedItems, setSpeedItems] = useState<ShuffledSpeedItem[]>([]);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hearts, setHearts] = useState(3);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);

  // AI Custom Quiz Generator state
  const [customQuizTopic, setCustomQuizTopic] = useState('');
  const [generatingAiQuiz, setGeneratingAiQuiz] = useState(false);
  const [aiQuizError, setAiQuizError] = useState<string | null>(null);

  // Listening Comprehension state
  const [listenItems, setListenItems] = useState<ShuffledListeningItem[]>([]);
  const [listenIdx, setListenIdx] = useState(0);
  const [listenSelected, setListenSelected] = useState<string | null>(null);
  const [showListenScript, setShowListenScript] = useState(false);

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

  // Victory & Celebration state
  const [victoryReward, setVictoryReward] = useState<LessonRewardSummary | null>(
    null
  );
  const [victoryMeta, setVictoryMeta] = useState<{
    gameTitle: string;
    scoreText: string;
    extraTip: string;
  } | null>(null);
  const [savingVictory, setSavingVictory] = useState(false);
  const [claimingDays, setClaimingDays] = useState<number | null>(null);
  const [claimedInVictory, setClaimedInVictory] = useState<number[]>([]);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const autoLaunchedRef = useRef(false);

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

  const speakText = useCallback(
    (text: string, speed = 0.88, customPersona?: AiPersona) => {
      const p = customPersona ?? persona;
      void playNaturalVoice({
        text,
        voice: p.edgeVoice,
        browserLang: p.browserLang,
        speed,
      });
    },
    [persona]
  );

  const setupBuildTiles = useCallback(
    (q: SentenceBuildQuestion, activePersona: AiPersona) => {
      const shuffled = pickShuffledItems(
        q.words.map((word, idx) => ({ id: `${q.id}-${idx}`, word })),
        q.words.length
      );
      setAvailableTiles(shuffled);
      setChosenTiles([]);
      setBuildChecked('idle');
      void playNaturalVoice({
        text: q.sentenceEn,
        voice: activePersona.edgeVoice,
        browserLang: activePersona.browserLang,
        speed: 0.85,
      });
    },
    []
  );

  const launchSpeedWithItems = useCallback(
    (rawItems: SpeedMatchQuestion[], title = '⚡ Phản xạ Bản xứ') => {
      stopVoicePlayback();
      const picked: ShuffledSpeedItem[] = rawItems.map((q) => ({
        ...q,
        shuffledOptions: pickShuffledItems(q.options, q.options.length),
      }));
      setSpeedRoundTitle(title);
      setSpeedItems(picked);
      setSpeedIdx(0);
      setSelectedOption(null);
      setHearts(3);
      setCombo(0);
      setBestCombo(0);
      setCorrectCount(0);
      setTimeLeft(15);
      setRoundStartTs(Date.now());
      setClaimedInVictory([]);
      setMode('speed');
    },
    []
  );

  const launchSpeedMatch = useCallback(
    (cat: GameCategoryFilter = null) => {
      const picked = pickByCategory(SPEED_MATCH_QUESTIONS, 5, cat);
      launchSpeedWithItems(picked, '⚡ Phản xạ Bản xứ');
    },
    [launchSpeedWithItems]
  );

  const launchListeningChallenge = useCallback(
    (activePersona: AiPersona, cat: GameCategoryFilter = null) => {
      stopVoicePlayback();
      const picked: ShuffledListeningItem[] = pickByCategory(
        LISTENING_CHALLENGES,
        5,
        cat
      ).map((item) => ({
        ...item,
        shuffledOptionsVi: pickShuffledItems(
          item.optionsVi,
          item.optionsVi.length
        ),
      }));
      setListenItems(picked);
      setListenIdx(0);
      setListenSelected(null);
      setShowListenScript(false);
      setCorrectCount(0);
      setCombo(0);
      setBestCombo(0);
      setRoundStartTs(Date.now());
      setClaimedInVictory([]);
      setMode('listen');
      if (picked[0]) {
        void playNaturalVoice({
          text: picked[0].spokenEn,
          voice: activePersona.edgeVoice,
          browserLang: activePersona.browserLang,
          speed: 0.88,
        });
      }
    },
    []
  );

  const launchSentenceBuild = useCallback(
    (activePersona: AiPersona, cat: GameCategoryFilter = null) => {
      stopVoicePlayback();
      const picked = pickByCategory(SENTENCE_BUILD_QUESTIONS, 5, cat);
      setBuildItems(picked);
      setBuildIdx(0);
      setCorrectCount(0);
      setCombo(0);
      setBestCombo(0);
      setRoundStartTs(Date.now());
      setClaimedInVictory([]);
      setMode('build');
      if (picked[0]) {
        setupBuildTiles(picked[0], activePersona);
      }
    },
    [setupBuildTiles]
  );

  const launchPronunciationArena = useCallback((cat: GameCategoryFilter = null) => {
    stopVoicePlayback();
    const picked = pickByCategory(PRONUNCIATION_CHALLENGES, 3, cat);
    setPronItems(picked);
    setPronIdx(0);
    setPronScores([]);
    setPronResult(null);
    setPronError(null);
    setPronStatus('idle');
    setRoundStartTs(Date.now());
    setClaimedInVictory([]);
    setMode('pronounce');
  }, []);

  const launchAiCustomQuiz = useCallback(
    async (prof: UserProfile | null, topicOverride?: string) => {
      setAiQuizError(null);
      setGeneratingAiQuiz(true);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        const personalKey = getLocalPersonalKey();
        if (personalKey && prof?.apiKeyMode === 'personal') {
          headers['x-user-gemini-key'] = personalKey;
        }
        const res = await fetch('/api/tutor/generate-quiz', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            hobbies: prof?.hobbies ?? [],
            jobField: prof?.jobField ?? '',
            englishLevel: prof?.englishLevel ?? 'A0-A1',
            customTopic: topicOverride?.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.questions) || data.questions.length < 3) {
          throw new Error(
            data.error || 'AI chưa tạo xong màn chơi. Bạn hãy bấm thử lại nhé!'
          );
        }
        launchSpeedWithItems(
          data.questions as SpeedMatchQuestion[],
          `✨ ${data.topicTitleVi || 'Màn chơi AI theo sở thích'}`
        );
      } catch (err) {
        setAiQuizError(
          err instanceof Error
            ? err.message
            : 'Không thể kết nối AI tạo màn chơi lúc này.'
        );
      } finally {
        setGeneratingAiQuiz(false);
      }
    },
    [launchSpeedWithItems]
  );

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
      const resolvedPersona = pickPersona(prof.preferredAccent);
      setProfile(prof);
      setAuthenticated(true);
      setStudiedToday(strict.studiedToday);
      setPersona(resolvedPersona);
      setLoading(false);

      if (!autoLaunchedRef.current && initialModeParam) {
        autoLaunchedRef.current = true;
        const validCat: GameCategoryFilter =
          initialCategoryParam === 'daily' ||
          initialCategoryParam === 'business' ||
          initialCategoryParam === 'travel'
            ? initialCategoryParam
            : null;
        if (initialModeParam === 'speed') {
          launchSpeedMatch(validCat);
        } else if (initialModeParam === 'listen') {
          launchListeningChallenge(resolvedPersona, validCat);
        } else if (initialModeParam === 'build') {
          launchSentenceBuild(resolvedPersona, validCat);
        } else if (initialModeParam === 'pronounce') {
          launchPronunciationArena(validCat);
        } else if (initialModeParam === 'ai-quiz') {
          void launchAiCustomQuiz(prof);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [
    router,
    initialModeParam,
    initialCategoryParam,
    launchSpeedMatch,
    launchListeningChallenge,
    launchSentenceBuild,
    launchPronunciationArena,
    launchAiCustomQuiz,
  ]);

  // Countdown timer for Speed Match
  useEffect(() => {
    if (mode !== 'speed' || selectedOption !== null) return;
    if (timeLeft <= 0) {
      const t = setTimeout(() => {
        playWrongSound();
        setSelectedOption('__TIMEOUT__');
        setCombo(0);
        setHearts((h) => Math.max(0, h - 1));
      }, 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [mode, selectedOption, timeLeft]);

  const finishGameRound = useCallback(
    async (params: {
      gameTitle: string;
      xpEarned: number;
      gemsEarned: number;
      scoreText: string;
      extraTip: string;
      completedLesson: boolean;
    }) => {
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
        if (reward.lessonCompleted) {
          playVictoryFanfare();
        }
        await refreshProgress();
      } finally {
        setSavingVictory(false);
      }
    },
    [roundStartTs, refreshProgress]
  );

  const handleSelectSpeedOption = useCallback(
    (opt: string) => {
      if (selectedOption !== null) return;
      const current = speedItems[speedIdx];
      if (!current) return;

      setSelectedOption(opt);
      const isCorrect = opt === current.correctEn;
      if (isCorrect) {
        playCorrectSound();
        setCorrectCount((c) => c + 1);
        setCombo((c) => {
          const next = c + 1;
          setBestCombo((b) => Math.max(b, next));
          return next;
        });
      } else {
        playWrongSound();
        setCombo(0);
        setHearts((h) => Math.max(0, h - 1));
      }
      speakText(current.correctEn, 0.9);
    },
    [selectedOption, speedItems, speedIdx, speakText]
  );

  const handleNextSpeedQuestion = useCallback(() => {
    playTapSound();
    stopVoicePlayback();
    if (speedIdx + 1 >= speedItems.length) {
      const bonusXp = bestCombo * 5 + correctCount * 8;
      const passed = correctCount >= 3;
      void finishGameRound({
        gameTitle: speedRoundTitle,
        xpEarned: passed ? 65 + bonusXp : 25,
        gemsEarned: passed ? 20 + Math.min(10, bestCombo * 2) : 5,
        scoreText: `${correctCount}/${speedItems.length} câu đúng · Combo cao nhất x${bestCombo}`,
        extraTip: passed
          ? 'Tuyệt vời! Bạn đã hoàn thành trọn vẹn 1 bài học và thắp lửa giữ chuỗi hôm nay!'
          : 'Bạn cần đúng ít nhất 3/5 câu để tính hoàn thành bài giữ chuỗi. Thử lại nhé!',
        completedLesson: passed,
      });
      return;
    }
    setSpeedIdx((i) => i + 1);
    setSelectedOption(null);
    setTimeLeft(15);
  }, [speedIdx, speedItems.length, bestCombo, correctCount, speedRoundTitle, finishGameRound]);

  const handleSelectListenOption = useCallback(
    (optVi: string) => {
      if (listenSelected !== null) return;
      const current = listenItems[listenIdx];
      if (!current) return;

      setListenSelected(optVi);
      setShowListenScript(true);
      const isCorrect = optVi === current.correctAnswerVi;
      if (isCorrect) {
        playCorrectSound();
        setCorrectCount((c) => c + 1);
        setCombo((c) => {
          const next = c + 1;
          setBestCombo((b) => Math.max(b, next));
          return next;
        });
      } else {
        playWrongSound();
        setCombo(0);
      }
    },
    [listenSelected, listenItems, listenIdx]
  );

  const handleNextListenQuestion = useCallback(() => {
    playTapSound();
    stopVoicePlayback();
    if (listenIdx + 1 >= listenItems.length) {
      const passed = correctCount >= 3;
      void finishGameRound({
        gameTitle: '🎧 Nghe Hiểu Bản Xứ',
        xpEarned: passed ? 70 + correctCount * 8 + bestCombo * 4 : 25,
        gemsEarned: passed ? 25 : 5,
        scoreText: `${correctCount}/${listenItems.length} tình huống nghe chuẩn`,
        extraTip: passed
          ? 'Đôi tai cực nhạy! Bạn đã nghe hiểu chính xác cách nói đời thực của người bản xứ và giữ chuỗi hôm nay!'
          : 'Bạn cần nghe đúng ít nhất 3/5 tình huống để giữ chuỗi. Bấm Nghe chậm 0.7x và thử lại nhé!',
        completedLesson: passed,
      });
      return;
    }
    const nextIdx = listenIdx + 1;
    setListenIdx(nextIdx);
    setListenSelected(null);
    setShowListenScript(false);
    const nextItem = listenItems[nextIdx];
    if (nextItem) {
      speakText(nextItem.spokenEn, 0.88);
    }
  }, [listenIdx, listenItems, correctCount, bestCombo, finishGameRound, speakText]);

  // Power-user keyboard shortcuts (1-4 to pick, Enter to continue, R to replay audio)
  useEffect(() => {
    if (mode !== 'speed' && mode !== 'listen') return;
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (mode === 'speed') {
        const cur = speedItems[speedIdx];
        if (!cur) return;
        if (selectedOption === null) {
          const idx = Number(e.key) - 1;
          if (idx >= 0 && idx < cur.shuffledOptions.length) {
            e.preventDefault();
            handleSelectSpeedOption(cur.shuffledOptions[idx]);
          }
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextSpeedQuestion();
        } else if (e.key.toLowerCase() === 'r') {
          speakText(cur.correctEn, 0.85);
        }
      } else if (mode === 'listen') {
        const cur = listenItems[listenIdx];
        if (!cur) return;
        if (e.key.toLowerCase() === 'r') {
          speakText(cur.spokenEn, 0.88);
          return;
        }
        if (listenSelected === null) {
          const idx = Number(e.key) - 1;
          if (idx >= 0 && idx < cur.shuffledOptionsVi.length) {
            e.preventDefault();
            handleSelectListenOption(cur.shuffledOptionsVi[idx]);
          }
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNextListenQuestion();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    mode,
    speedItems,
    speedIdx,
    selectedOption,
    listenItems,
    listenIdx,
    listenSelected,
    handleSelectSpeedOption,
    handleNextSpeedQuestion,
    handleSelectListenOption,
    handleNextListenQuestion,
    speakText,
  ]);

  async function handleClaimVictoryMilestone(days: number) {
    const m = STREAK_MILESTONES.find((item) => item.days === days);
    if (!m) return;
    setClaimingDays(days);
    try {
      const updated = await claimStreakMilestone(days);
      setProfile(updated);
      setClaimedInVictory((prev) => [...prev, days]);
      playChestOpenSound();
      setCelebration({
        title: `Mở Rương Mốc ${m.days} Ngày: ${m.titleVi}!`,
        subtitle: m.subtitleVi,
        xp: m.rewardXp,
        gems: m.rewardGems,
        freezes: m.rewardFreezes,
        badgeLabel: m.badgeLabel,
      });
    } finally {
      setClaimingDays(null);
    }
  }

  function handlePickWordTile(tile: WordTile) {
    if (buildChecked !== 'idle') return;
    playTapSound();
    setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setChosenTiles((prev) => [...prev, tile]);
  }

  function handleRemoveWordTile(tile: WordTile) {
    if (buildChecked !== 'idle') return;
    playTapSound();
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
      playCorrectSound();
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
    } else {
      playWrongSound();
      setCombo(0);
    }
    speakText(q.sentenceEn, 0.9);
  }

  function handleNextBuildQuestion() {
    playTapSound();
    stopVoicePlayback();
    if (buildIdx + 1 >= buildItems.length) {
      const passed = correctCount >= 3;
      void finishGameRound({
        gameTitle: '🧩 Nghe & Ghép câu Bản xứ',
        xpEarned: passed ? 75 + correctCount * 8 : 25,
        gemsEarned: passed ? 25 : 5,
        scoreText: `${correctCount}/${buildItems.length} câu ghép chuẩn`,
        extraTip: passed
          ? 'Xuất sắc! Phản xạ ghép cấu trúc câu bản xứ của bạn đang tiến bộ cực nhanh!'
          : 'Cần ghép đúng ít nhất 3/5 câu để tính hoàn thành bài giữ chuỗi. Chơi lại ngay nhé!',
        completedLesson: passed,
      });
      return;
    }
    const nextIdx = buildIdx + 1;
    setBuildIdx(nextIdx);
    setupBuildTiles(buildItems[nextIdx], persona);
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
      if (assessment.overallScore >= 65) {
        playCorrectSound();
      } else {
        playWrongSound();
      }
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
    playTapSound();
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
        <NovaCompanion mood="excited" className="h-18 w-18 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const levelInfo = getLevelInfo(profile.xp);
  const boostActive = isXpBoostActive(profile.xpBoostUntil);
  const boostMins = getXpBoostRemainingMinutes(profile.xpBoostUntil);
  const currentSpeed = speedItems[speedIdx];
  const currentListen = listenItems[listenIdx];
  const currentBuild = buildItems[buildIdx];
  const currentPron = pronItems[pronIdx];

  // ACTIVE DISTRACTION-FREE AURORA LESSON SCREEN
  if (
    mode === 'speed' ||
    mode === 'listen' ||
    mode === 'build' ||
    mode === 'pronounce'
  ) {
    const progressPct =
      mode === 'speed'
        ? ((speedIdx + (selectedOption ? 1 : 0)) / Math.max(1, speedItems.length)) *
          100
        : mode === 'listen'
          ? ((listenIdx + (listenSelected ? 1 : 0)) /
              Math.max(1, listenItems.length)) *
            100
          : mode === 'build'
            ? ((buildIdx + (buildChecked !== 'idle' ? 1 : 0)) /
                Math.max(1, buildItems.length)) *
              100
            : ((pronIdx + (pronResult ? 1 : 0)) / Math.max(1, pronItems.length)) *
              100;

    return (
      <div className="min-h-screen bg-mesh-light flex flex-col">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                stopVoicePlayback();
                stopMedia();
                setMode('lobby');
              }}
              aria-label="Thoát màn chơi"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="h-6 w-6 stroke-[2.6]" />
            </button>

            <div className="flex-1 h-4 rounded-full bg-slate-200/90 overflow-hidden">
              <div
                className="progress-gloss h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${Math.max(6, progressPct)}%` }}
              />
            </div>

            {boostActive && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
                ⚡ 2x XP
              </span>
            )}

            {mode === 'speed' && (
              <div className="flex items-center gap-2 text-xs font-black">
                {combo >= 2 && (
                  <span className="rounded-xl bg-amber-100 border border-amber-300 px-2.5 py-1 text-amber-800 animate-bounce">
                    🔥 x{combo}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-xl border-2 px-2.5 py-1 ${
                    timeLeft <= 5
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" />
                  {timeLeft}s
                </span>
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`h-5 w-5 ${
                        i < hearts
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-slate-200 fill-slate-200'
                      }`}
                    />
                  ))}
                </span>
              </div>
            )}

            {mode === 'listen' && (
              <div className="flex items-center gap-2 text-xs font-black">
                {combo >= 2 && (
                  <span className="rounded-xl bg-amber-100 border border-amber-300 px-2 py-0.5 text-amber-800">
                    🔥 x{combo}
                  </span>
                )}
                <span className="text-indigo-600">
                  {listenIdx + 1}/{listenItems.length}
                </span>
              </div>
            )}

            {mode === 'build' && (
              <span className="text-xs font-black text-violet-600">
                {buildIdx + 1}/{buildItems.length}
              </span>
            )}

            {mode === 'pronounce' && (
              <span className="text-xs font-black text-emerald-600">
                Câu {pronIdx + 1}/{pronItems.length}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center">
          {/* GAME 1 & 5: SPEED MATCH / AI CUSTOM QUIZ */}
          {mode === 'speed' && currentSpeed && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <NovaCompanion
                  mood={
                    selectedOption === currentSpeed.correctEn
                      ? 'excited'
                      : 'happy'
                  }
                  className="hidden sm:block h-20 w-20 shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-extrabold text-indigo-700">
                    {speedRoundTitle} · Câu {speedIdx + 1}/{speedItems.length} ·{' '}
                    {currentSpeed.contextVi}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {currentSpeed.promptVi}
                  </h1>
                </div>
              </div>

              <div className="space-y-3">
                {currentSpeed.shuffledOptions.map((opt, idx) => {
                  const isPicked = selectedOption === opt;
                  const isCorrectOpt = opt === currentSpeed.correctEn;
                  let cardCls =
                    'border-slate-200 border-b-4 bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-300 active:translate-y-[2px]';
                  if (selectedOption !== null) {
                    if (isCorrectOpt) {
                      cardCls =
                        'border-emerald-500 border-b-4 bg-emerald-50 text-emerald-900';
                    } else if (isPicked && !isCorrectOpt) {
                      cardCls =
                        'border-rose-500 border-b-4 bg-rose-50 text-rose-800';
                    } else {
                      cardCls =
                        'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleSelectSpeedOption(opt)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm sm:text-base font-extrabold transition cursor-pointer ${cardCls}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current/20 bg-white/80 text-xs font-black">
                          {idx + 1}
                        </span>
                        <span>{opt}</span>
                      </span>
                      {selectedOption !== null && isCorrectOpt && (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                      )}
                      {selectedOption !== null && isPicked && !isCorrectOpt && (
                        <XCircle className="h-6 w-6 shrink-0 text-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="hidden sm:block text-center text-[11px] font-bold text-slate-400">
                Mẹo bàn phím: nhấn <kbd className="rounded border px-1.5 py-0.5">1</kbd>–
                <kbd className="rounded border px-1.5 py-0.5">4</kbd> để chọn nhanh ·{' '}
                <kbd className="rounded border px-1.5 py-0.5">Enter</kbd> để sang câu tiếp
              </p>
            </div>
          )}

          {/* GAME 2 (NEW!): LISTENING COMPREHENSION */}
          {mode === 'listen' && currentListen && (
            <div className="space-y-6">
              <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/80 p-6 text-center space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-indigo-200 px-3.5 py-1 text-xs font-black text-indigo-700">
                  🎧 {currentListen.contextVi}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {currentListen.questionVi}
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => speakText(currentListen.spokenEn, 0.9)}
                    className="btn-duo btn-duo-primary px-6 py-3.5 text-sm uppercase"
                  >
                    <Volume2 className="h-5 w-5" />
                    Nghe giọng {persona.name} ({persona.accent})
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentListen.spokenEn, 0.7)}
                    className="btn-duo btn-duo-white px-4 py-3.5 text-xs uppercase"
                  >
                    🐢 Nghe chậm
                  </button>
                </div>

                {showListenScript ? (
                  <div className="rounded-2xl border border-indigo-200 bg-white p-3.5 text-left space-y-1">
                    <div className="text-sm font-black text-slate-900">
                      “{currentListen.spokenEn}”
                    </div>
                    <div className="text-xs font-bold text-indigo-600">
                      /{currentListen.phonetic}/
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowListenScript(true)}
                    className="text-xs font-extrabold text-indigo-600 hover:underline cursor-pointer"
                  >
                    👀 Gợi ý: Xem câu tiếng Anh
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {currentListen.shuffledOptionsVi.map((optVi, idx) => {
                  const isPicked = listenSelected === optVi;
                  const isCorrectOpt = optVi === currentListen.correctAnswerVi;
                  let cardCls =
                    'border-slate-200 border-b-4 bg-white text-slate-800 hover:bg-indigo-50/40 hover:border-indigo-300 active:translate-y-[2px]';
                  if (listenSelected !== null) {
                    if (isCorrectOpt) {
                      cardCls =
                        'border-emerald-500 border-b-4 bg-emerald-50 text-emerald-900';
                    } else if (isPicked && !isCorrectOpt) {
                      cardCls =
                        'border-rose-500 border-b-4 bg-rose-50 text-rose-800';
                    } else {
                      cardCls =
                        'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
                    }
                  }

                  return (
                    <button
                      key={optVi}
                      type="button"
                      disabled={listenSelected !== null}
                      onClick={() => handleSelectListenOption(optVi)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-4 py-4 text-left text-sm font-extrabold transition cursor-pointer ${cardCls}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current/20 bg-white/80 text-xs font-black">
                          {idx + 1}
                        </span>
                        <span>{optVi}</span>
                      </span>
                      {listenSelected !== null && isCorrectOpt && (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                      )}
                      {listenSelected !== null && isPicked && !isCorrectOpt && (
                        <XCircle className="h-6 w-6 shrink-0 text-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="hidden sm:block text-center text-[11px] font-bold text-slate-400">
                Phím tắt: <kbd className="rounded border px-1.5 py-0.5">R</kbd> nghe lại ·{' '}
                <kbd className="rounded border px-1.5 py-0.5">1</kbd>–
                <kbd className="rounded border px-1.5 py-0.5">4</kbd> chọn đáp án ·{' '}
                <kbd className="rounded border px-1.5 py-0.5">Enter</kbd> tiếp tục
              </p>
            </div>
          )}

          {/* GAME 3: SENTENCE BUILD */}
          {mode === 'build' && currentBuild && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <NovaCompanion mood="happy" className="h-20 w-20 shrink-0" />
                <div className="flex-1 rounded-2xl border border-indigo-200/80 bg-white/95 p-4 space-y-2.5 shadow-sm">
                  <div className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                    🧩 Nghe giọng {persona.name} ({persona.accent}) &amp; ghép câu
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-900">
                    “{currentBuild.meaningVi}”
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => speakText(currentBuild.sentenceEn, 0.88)}
                      className="btn-duo btn-duo-primary px-4 py-2 text-xs"
                    >
                      <Volume2 className="h-4 w-4" />
                      Nghe mẫu
                    </button>
                    <button
                      type="button"
                      onClick={() => speakText(currentBuild.sentenceEn, 0.7)}
                      className="btn-duo btn-duo-white px-3.5 py-2 text-xs"
                    >
                      🐢 Nghe chậm
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-24 rounded-2xl border-2 border-dashed border-indigo-200 bg-white/80 p-4 flex flex-wrap items-center gap-2.5">
                {chosenTiles.length === 0 ? (
                  <span className="w-full text-center text-xs font-bold text-slate-400">
                    Chạm vào các thẻ từ bên dưới để xếp thành câu chuẩn bản xứ...
                  </span>
                ) : (
                  chosenTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      disabled={buildChecked !== 'idle'}
                      onClick={() => handleRemoveWordTile(tile)}
                      className="rounded-xl border-2 border-indigo-300 border-b-4 bg-indigo-50 px-3.5 py-2 text-sm font-black text-indigo-700 active:translate-y-[2px] transition cursor-pointer"
                    >
                      {tile.word}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2.5">
                {availableTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={buildChecked !== 'idle'}
                    onClick={() => handlePickWordTile(tile)}
                    className="rounded-xl border-2 border-slate-200 border-b-4 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40 active:translate-y-[2px] transition cursor-pointer"
                  >
                    {tile.word}
                  </button>
                ))}
              </div>

              {buildChecked === 'idle' && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setupBuildTiles(currentBuild, persona)}
                    aria-label="Xếp lại"
                    className="btn-duo btn-duo-white px-4 py-3.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={chosenTiles.length === 0}
                    onClick={handleCheckBuildSentence}
                    className="btn-duo btn-duo-primary flex-1 py-3.5 text-sm uppercase tracking-wide"
                  >
                    Kiểm tra đáp án
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GAME 4: PRONUNCIATION ARENA */}
          {mode === 'pronounce' && currentPron && (
            <div className="space-y-6">
              <div className="rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/70 p-6 text-center space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-emerald-200 px-3.5 py-1 text-xs font-extrabold text-emerald-700">
                  🎙️ Đọc to câu sau theo giọng {persona.accent}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                  “{currentPron.sentence}”
                </h1>
                <p className="text-sm font-extrabold text-indigo-600">
                  /{currentPron.phonetic}/
                </p>
                <p className="text-sm font-semibold text-slate-600">
                  🇻🇳 {currentPron.vietnamese}
                </p>
                <p className="inline-block rounded-xl bg-white border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-800">
                  💡 {currentPron.focusTipVi}
                </p>

                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => speakText(currentPron.sentence, 0.88)}
                    className="btn-duo btn-duo-blue px-4 py-2.5 text-xs"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentPron.sentence, 0.7)}
                    className="btn-duo btn-duo-white px-4 py-2.5 text-xs"
                  >
                    🐢 Chậm 0.7x
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
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
                  className={`btn-duo px-8 py-4 text-sm uppercase tracking-wide ${
                    pronStatus === 'recording'
                      ? 'bg-[#FF4B4B] text-white border-2 border-[#FF4B4B] shadow-[0_4px_0_#D93636]'
                      : 'btn-duo-green'
                  }`}
                >
                  {pronStatus === 'scoring' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      AI đang chấm từng từ...
                    </>
                  ) : pronStatus === 'recording' ? (
                    <>
                      <MicOff className="h-5 w-5 animate-pulse" />
                      Dừng &amp; Chấm điểm
                      <span
                        className="ml-1 inline-block h-2.5 rounded-full bg-white/90"
                        style={{ width: `${Math.max(12, micLevel * 0.45)}px` }}
                      />
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      {pronResult ? 'Đọc lại phá kỷ lục' : 'Bấm Micro để đọc'}
                    </>
                  )}
                </button>
              </div>

              {pronError && (
                <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 text-center">
                  {pronError}
                </div>
              )}

              {pronResult && (
                <div className="card-duo p-5 space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl border-2 font-black ${
                        getScoreTone(pronResult.overallScore).pillLight
                      }`}
                    >
                      <span className="text-xl leading-none">
                        {pronResult.overallScore}
                      </span>
                      <span className="text-[10px]">/100</span>
                    </div>
                    <div>
                      <div className="text-base font-black text-slate-900">
                        {getScoreTone(pronResult.overallScore).label}
                      </div>
                      <div className="text-xs font-medium text-slate-600">
                        {pronResult.summaryVi}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pronResult.wordFeedback.map((w, i) => (
                      <span
                        key={`${w.word}-${i}`}
                        className={`rounded-xl border-2 px-3 py-1 text-xs font-extrabold ${
                          w.status === 'good'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
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
                    className="btn-duo btn-duo-green w-full py-3.5 text-sm uppercase tracking-wide"
                  >
                    {pronIdx + 1 >= pronItems.length
                      ? 'Hoàn thành & Nhận thưởng 🏆'
                      : 'Câu tiếp theo →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* SLIDE-UP BOTTOM FEEDBACK DRAWERS */}
        {mode === 'speed' && currentSpeed && selectedOption !== null && (
          <footer
            className={`sticky bottom-0 border-t-2 px-4 py-5 ${
              selectedOption === currentSpeed.correctEn
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-base font-black ${
                      selectedOption === currentSpeed.correctEn
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {selectedOption === currentSpeed.correctEn
                      ? '🎉 Chuẩn không cần chỉnh!'
                      : selectedOption === '__TIMEOUT__'
                        ? '⏰ Hết giờ rồi! Đáp án chuẩn:'
                        : '💡 Cách người bản xứ nói tự nhiên nhất:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(currentSpeed.correctEn, 0.85)}
                    className="inline-flex items-center gap-1 rounded-xl bg-white/95 border border-slate-200 px-2.5 py-1 text-xs font-extrabold text-indigo-700 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Nghe
                  </button>
                </div>
                <div className="text-xs font-bold text-slate-800">
                  /{currentSpeed.phonetic}/ — {currentSpeed.tipVi}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextSpeedQuestion}
                className={`btn-duo shrink-0 px-7 py-3.5 text-sm uppercase tracking-wide ${
                  selectedOption === currentSpeed.correctEn
                    ? 'btn-duo-green'
                    : 'bg-rose-500 text-white border border-rose-500 shadow-[0_4px_0_#BE123C]'
                }`}
              >
                {speedIdx + 1 >= speedItems.length ? 'Nhận thưởng 🎉' : 'Tiếp tục'}
              </button>
            </div>
          </footer>
        )}

        {mode === 'listen' && currentListen && listenSelected !== null && (
          <footer
            className={`sticky bottom-0 border-t-2 px-4 py-5 ${
              listenSelected === currentListen.correctAnswerVi
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div
                  className={`text-base font-black ${
                    listenSelected === currentListen.correctAnswerVi
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {listenSelected === currentListen.correctAnswerVi
                    ? '🎉 Nghe quá chuẩn bản xứ!'
                    : '💡 Ý đúng là: ' + currentListen.correctAnswerVi}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  💡 {currentListen.tipVi}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextListenQuestion}
                className={`btn-duo shrink-0 px-7 py-3.5 text-sm uppercase tracking-wide ${
                  listenSelected === currentListen.correctAnswerVi
                    ? 'btn-duo-green'
                    : 'bg-rose-500 text-white border border-rose-500 shadow-[0_4px_0_#BE123C]'
                }`}
              >
                {listenIdx + 1 >= listenItems.length ? 'Nhận thưởng 🎉' : 'Tiếp tục'}
              </button>
            </div>
          </footer>
        )}

        {mode === 'build' && currentBuild && buildChecked !== 'idle' && (
          <footer
            className={`sticky bottom-0 border-t-2 px-4 py-5 ${
              buildChecked === 'correct'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div
                  className={`text-base font-black ${
                    buildChecked === 'correct'
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {buildChecked === 'correct'
                    ? '🎉 Tuyệt đỉnh! Ghép chuẩn bản xứ!'
                    : `✨ Câu chuẩn: "${currentBuild.sentenceEn}"`}
                </div>
                <div className="text-xs font-bold text-slate-800">
                  /{currentBuild.phonetic}/ — 💡 {currentBuild.tipVi}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextBuildQuestion}
                className={`btn-duo shrink-0 px-7 py-3.5 text-sm uppercase tracking-wide ${
                  buildChecked === 'correct'
                    ? 'btn-duo-green'
                    : 'bg-rose-500 text-white border border-rose-500 shadow-[0_4px_0_#BE123C]'
                }`}
              >
                {buildIdx + 1 >= buildItems.length ? 'Nhận thưởng 🎉' : 'Tiếp tục'}
              </button>
            </div>
          </footer>
        )}
      </div>
    );
  }

  // LOBBY & VICTORY SCREEN inside AppShell
  return (
    <AppShell profile={profile} authenticated={authenticated}>
      {mode === 'lobby' && (
        <>
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 border-b-4 border-indigo-900/35 p-6 sm:p-7 text-white shadow-lg shadow-indigo-950/15">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -left-12 -bottom-16 h-40 w-40 rounded-full bg-cyan-200/20 blur-2xl" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <NovaCompanion
                  mood="excited"
                  className="hidden sm:block h-20 w-20 shrink-0 animate-gentle-float drop-shadow-[0_12px_20px_rgba(15,23,42,0.35)]"
                />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-[11px] font-black uppercase tracking-wider">
                      <Gamepad2 className="h-3.5 w-3.5" />
                      Đấu trường 5 Chế độ Chơi &amp; Học
                    </span>
                    {boostActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2.5 py-1 text-[11px] font-black text-amber-950">
                        ⚡ 2x XP ({boostMins}p)
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                    Chơi 2 phút — Thắp lửa giữ chuỗi!
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 max-w-xl">
                    {studiedToday
                      ? `🔥 Hôm nay bạn đã giữ vững chuỗi ${profile.streakDays} ngày! Chơi thêm để đua Top Bảng Xếp Hạng & gom Ngọc 💎.`
                      : '⏳ Hoàn thành trọn vẹn 1 màn chơi bất kỳ để thắp lửa giữ chuỗi hôm nay và mở rương thưởng!'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md p-4 min-w-56 space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>Lv.{levelInfo.level}</span>
                  <span>{profile.xp} XP</span>
                </div>
                <div className="h-3 w-full rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="progress-gloss h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400"
                    style={{ width: `${Math.max(8, levelInfo.progressPct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-black pt-0.5">
                  <span>🔥 {profile.streakDays}d</span>
                  <span>💎 {profile.gems}</span>
                  <span>🧊 {profile.streakFreezes}</span>
                </div>
              </div>
            </div>
          </section>

          {/* AI INFINITE PERSONALIZED QUIZ GENERATOR CARD */}
          <section className="rounded-3xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 via-amber-50/70 to-white p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F43F5E] to-[#FF9600] text-white shadow-[0_4px_0_#BE123C]">
                  <Wand2 className="h-6 w-6 stroke-[2.4]" />
                </div>
                <div>
                  <span className="inline-block rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700">
                    ✨ Chế độ AI Vô Tận (Mới!)
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Gemini Tự Tạo Màn Chơi Theo Sở Thích Hoặc Chủ Đề Bất Kỳ
                  </h2>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                playTapSound();
                void launchAiCustomQuiz(profile, customQuizTopic);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={customQuizTopic}
                onChange={(e) => setCustomQuizTopic(e.target.value)}
                maxLength={100}
                placeholder={`Để trống = dùng sở thích của bạn (${
                  profile.hobbies.slice(0, 2).join(', ') || 'Đời sống'
                }) hoặc gõ chủ đề bất kỳ...`}
                className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold focus:border-[#F43F5E] focus:outline-none"
              />
              <button
                type="submit"
                disabled={generatingAiQuiz}
                className="btn-duo btn-duo-orange px-6 py-3 text-xs uppercase shrink-0"
              >
                {generatingAiQuiz ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    AI đang tạo 5 câu...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Tạo &amp; Chơi ngay
                  </>
                )}
              </button>
            </form>

            {aiQuizError && (
              <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700">
                {aiQuizError}
              </div>
            )}
          </section>

          {/* Voice Persona Accent Bar */}
          <div className="card-duo px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-black text-slate-700">
              🎧 Giọng bản xứ trong game:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {AI_PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setPersona(p);
                  }}
                  className={`rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    persona.id === p.id
                      ? 'border-[#1CB0F6] bg-[#DDF4FF] text-[#1899D6]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {p.flag} {p.name} ({p.accent})
                </button>
              ))}
            </div>
          </div>

          {/* 4 Core Arcade Mode Cards */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Mode 1: Speed Match */}
            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF9600] text-white shadow-[0_4px_0_#D97706]">
                    <Zap className="h-7 w-7 stroke-[2.5]" />
                  </div>
                  <span className="rounded-xl bg-amber-50 border-2 border-amber-200 px-2.5 py-1 text-[11px] font-black text-amber-800">
                    ~2 phút · 5 câu
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  ⚡ Phản xạ Bản xứ 15s
                </h2>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Đấu tốc độ chọn cách nói chuẩn Tây (tránh dịch từng chữ Vietlish), giữ chuỗi Combo x5 và bảo toàn 3 trái tim ❤️!
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-amber-700">
                    +65~130 XP
                  </span>
                  <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-sky-700">
                    +20 💎
                  </span>
                  <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-orange-700">
                    🔥 Giữ chuỗi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchSpeedMatch();
                }}
                className="btn-duo btn-duo-orange w-full py-3.5 text-xs uppercase tracking-wide"
              >
                Chơi ngay
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            {/* Mode 2 (NEW!): Listening Comprehension */}
            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1CB0F6] text-white shadow-[0_4px_0_#1899D6]">
                    <Headphones className="h-7 w-7 stroke-[2.5]" />
                  </div>
                  <span className="rounded-xl bg-[#DDF4FF] border-2 border-[#84D8FF] px-2.5 py-1 text-[11px] font-black text-[#1899D6]">
                    MỚI · 5 tình huống
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  🎧 Nghe Hiểu Bản Xứ
                </h2>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Luyện đôi tai nghe hiểu câu nói thật ở quán cà phê, họp Zoom, loa sân bay &amp; nhà hàng (16 tình huống đời thực)!
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-[#1899D6]">
                    +70~130 XP
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
                onClick={() => {
                  playTapSound();
                  launchListeningChallenge(persona);
                }}
                className="btn-duo btn-duo-blue w-full py-3.5 text-xs uppercase tracking-wide"
              >
                Luyện nghe ngay
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            {/* Mode 3: Sentence Build */}
            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6] text-white shadow-[0_4px_0_#6D28D9]">
                    <Puzzle className="h-7 w-7 stroke-[2.5]" />
                  </div>
                  <span className="rounded-xl bg-violet-50 border-2 border-violet-200 px-2.5 py-1 text-[11px] font-black text-violet-800">
                    ~3 phút · 5 câu
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  🧩 Nghe &amp; Ghép câu
                </h2>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Nghe giọng bản xứ đọc rồi bấm xếp thẻ từ đúng trật tự — cách nhớ cấu trúc giao tiếp siêu cuốn và tự nhiên!
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-violet-700">
                    +75~115 XP
                  </span>
                  <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-sky-700">
                    +25 💎
                  </span>
                  <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-orange-700">
                    🔥 Giữ chuỗi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchSentenceBuild(persona);
                }}
                className="btn-duo btn-duo-purple w-full py-3.5 text-xs uppercase tracking-wide"
              >
                Chơi ngay
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>

            {/* Mode 4: Pronunciation Arena */}
            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_4px_0_#047857]">
                    <Mic className="h-7 w-7 stroke-[2.5]" />
                  </div>
                  <span className="rounded-xl bg-emerald-50 border-2 border-emerald-200 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                    AI Chấm âm · 3 câu
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  🎙️ Đấu trường Phát âm AI
                </h2>
                <p className="text-xs font-medium text-slate-600 leading-relaxed">
                  Đọc to 3 câu bản xứ thực tế! AI chấm điểm từng từ (0–100) kèm mẹo nối âm. Trung bình ≥ 60 để thắng &amp; nhận thưởng lớn!
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-emerald-700">
                    +90~130 XP
                  </span>
                  <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-sky-700">
                    +30 💎
                  </span>
                  <span className="rounded-lg bg-orange-50 px-2 py-0.5 text-orange-700">
                    🔥 Giữ chuỗi
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchPronunciationArena();
                }}
                className="btn-duo btn-duo-green w-full py-3.5 text-xs uppercase tracking-wide"
              >
                Vào đấu trường
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Voice Call Quest Banner */}
          <div className="card-duo p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1CB0F6] text-white shadow-[0_4px_0_#1899D6]">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Muốn gọi thoại trực tiếp nhập vai với Gia sư AI?
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Nói ≥ 3 lượt trong cuộc gọi AI cũng giữ chuỗi 🔥 và xuất báo cáo đánh giá 4 kỹ năng!
                </p>
              </div>
            </div>
            <Link
              href="/call"
              className="btn-duo btn-duo-blue shrink-0 px-5 py-3 text-xs uppercase tracking-wide"
            >
              Gọi AI ngay
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </Link>
          </div>
        </>
      )}

      {/* VICTORY CELEBRATION SCREEN */}
      {mode === 'victory' && (
        <div className="mx-auto max-w-lg card-duo-elevated p-6 sm:p-8 text-center space-y-5 animate-pop-in">
          {savingVictory ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <NovaCompanion mood="excited" className="h-20 w-20 animate-bounce" />
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-sm font-extrabold text-slate-600">
                Đang thắp lửa chuỗi &amp; đồng bộ Google Drive 5TB...
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 via-violet-50 to-amber-50 border border-indigo-200">
                <NovaCompanion
                  mood={victoryReward?.lessonCompleted ? 'proud' : 'happy'}
                  className="h-20 w-20 animate-gentle-float"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-black text-indigo-700">
                    {victoryMeta?.gameTitle}
                  </span>
                  {boostActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700">
                      ⚡ Đã nhân đôi 2x XP!
                    </span>
                  )}
                </div>
                <h2 className="mt-2.5 text-2xl font-black text-slate-900">
                  {victoryReward?.lessonCompleted
                    ? 'Hoàn thành xuất sắc! 🎉'
                    : 'Cố gắng thêm chút nữa nhé!'}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  {victoryMeta?.scoreText}
                </p>
              </div>

              {victoryReward && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-3">
                    <div className="text-xl font-black text-amber-600">
                      +{victoryReward.xpEarned}
                    </div>
                    <div className="text-[11px] font-extrabold text-amber-800">
                      XP
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-sky-200 bg-sky-50/70 p-3 flex flex-col items-center">
                    <div className="flex items-center gap-1 text-xl font-black text-indigo-700">
                      +{victoryReward.gemsEarned}
                      <GemSvg className="h-4 w-4" />
                    </div>
                    <div className="text-[11px] font-extrabold text-sky-800">
                      Ngọc
                    </div>
                  </div>
                  <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/70 p-3 flex flex-col items-center">
                    <div className="flex items-center gap-1 text-xl font-black text-orange-600">
                      <StreakFlameSvg active className="h-5 w-5" />
                      {victoryReward.streakDays}
                    </div>
                    <div className="text-[11px] font-extrabold text-orange-700">
                      Chuỗi ngày
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border-2 px-4 py-3 text-xs font-extrabold ${
                  victoryReward?.lessonCompleted
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {victoryMeta?.extraTip}
              </div>

              {victoryReward?.leveledUp && (
                <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 border-b-4 border-indigo-900/40 px-4 py-3 text-xs font-black text-white flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Chúc mừng thăng cấp lên Level {victoryReward.newLevel}!
                </div>
              )}

              {victoryReward &&
                victoryReward.newlyClaimableMilestones
                  .filter((d) => !claimedInVictory.includes(d))
                  .map((days) => (
                    <div
                      key={days}
                      className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-center gap-2.5">
                        <div className="animate-chest-wiggle">
                          <TreasureChestSvg state="ready" className="h-12 w-12" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-black text-amber-950">
                            Mở khóa Rương Chuỗi {days} Ngày!
                          </div>
                          <div className="text-xs font-bold text-amber-800">
                            Nhận ngay XP, Ngọc 💎, Khiên 🧊 &amp; Huy hiệu!
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={claimingDays === days}
                        onClick={() => void handleClaimVictoryMilestone(days)}
                        className="btn-duo btn-duo-orange w-full py-3 text-xs uppercase tracking-wide"
                      >
                        <Gift className="h-4 w-4" />
                        {claimingDays === days
                          ? 'Đang mở rương...'
                          : `🎁 Mở rương mốc ${days} ngày ngay!`}
                      </button>
                    </div>
                  ))}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setMode('lobby');
                  }}
                  className="btn-duo btn-duo-white flex-1 py-3.5 text-xs uppercase"
                >
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Chơi màn khác
                </button>
                <Link
                  href="/leaderboard"
                  className="btn-duo btn-duo-blue flex-1 py-3.5 text-xs uppercase"
                >
                  Bảng Xếp Hạng
                </Link>
                <Link
                  href="/"
                  className="btn-duo btn-duo-primary flex-1 py-3.5 text-xs uppercase"
                >
                  Về Lộ trình →
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
          <NovaCompanion mood="excited" className="h-18 w-18 animate-gentle-float" />
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <PlayPageInner />
    </Suspense>
  );
}
