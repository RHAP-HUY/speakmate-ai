'use client';

import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Headphones,
  Heart,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  Puzzle,
  RotateCcw,
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
  TutorAvatar,
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
  const [speedRoundTitle, setSpeedRoundTitle] = useState('Phản xạ 15 giây');
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
    (rawItems: SpeedMatchQuestion[], title = 'Phản xạ 15 giây') => {
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
      launchSpeedWithItems(picked, 'Phản xạ 15 giây');
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
          data.topicTitleVi || 'Bài tập thích ứng theo sở thích'
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
        gameTitle: 'Nghe hiểu ngữ cảnh bản xứ',
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
        gameTitle: 'Nghe & ghép cấu trúc câu',
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
        gameTitle: 'Chấm điểm phát âm câu',
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
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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

  // ACTIVE DISTRACTION-FREE PRACTICE SCREEN
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
      <div className="min-h-screen bg-[#F6F7F9] flex flex-col text-gray-900">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3.5 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                stopVoicePlayback();
                stopMedia();
                setMode('lobby');
              }}
              aria-label="Thoát bài tập"
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#E5483F] transition-all duration-300"
                style={{ width: `${Math.max(6, progressPct)}%` }}
              />
            </div>

            {boostActive && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                2x XP
              </span>
            )}

            {mode === 'speed' && (
              <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                {combo >= 2 && (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-amber-800">
                    Combo x{combo}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
                    timeLeft <= 5
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <Timer className="h-3.5 w-3.5" />
                  {timeLeft}s
                </span>
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`h-4 w-4 ${
                        i < hearts
                          ? 'fill-[#E5483F] text-[#E5483F]'
                          : 'text-gray-200 fill-gray-200'
                      }`}
                    />
                  ))}
                </span>
              </div>
            )}

            {mode === 'listen' && (
              <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                {combo >= 2 && (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-amber-800">
                    Combo x{combo}
                  </span>
                )}
                <span className="font-mono text-gray-600">
                  {listenIdx + 1}/{listenItems.length}
                </span>
              </div>
            )}

            {mode === 'build' && (
              <span className="font-mono text-xs font-semibold text-gray-600 tabular-nums">
                {buildIdx + 1}/{buildItems.length}
              </span>
            )}

            {mode === 'pronounce' && (
              <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                Câu {pronIdx + 1}/{pronItems.length}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center">
          {/* GAME 1 & 5: SPEED MATCH / ADAPTIVE CUSTOM QUIZ */}
          {mode === 'speed' && currentSpeed && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <TutorAvatar
                  personaId={persona.id}
                  className="hidden sm:block h-14 w-14 shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">
                    {speedRoundTitle} · Câu {speedIdx + 1}/{speedItems.length} ·{' '}
                    {currentSpeed.contextVi}
                  </p>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
                    {currentSpeed.promptVi}
                  </h1>
                </div>
              </div>

              <div className="space-y-2.5">
                {currentSpeed.shuffledOptions.map((opt, idx) => {
                  const isPicked = selectedOption === opt;
                  const isCorrectOpt = opt === currentSpeed.correctEn;
                  let cardCls =
                    'border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:shadow-xs';
                  if (selectedOption !== null) {
                    if (isCorrectOpt) {
                      cardCls =
                        'border-emerald-500 bg-emerald-50 text-emerald-900';
                    } else if (isPicked && !isCorrectOpt) {
                      cardCls =
                        'border-rose-400 bg-rose-50 text-rose-800';
                    } else {
                      cardCls =
                        'border-gray-200 bg-gray-50 text-gray-400 opacity-65';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleSelectSpeedOption(opt)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left transition cursor-pointer ${cardCls}`}
                    >
                      <span className="flex items-center gap-3.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/80 font-mono text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-sm sm:text-base font-semibold">
                          {opt}
                        </span>
                      </span>
                      {selectedOption !== null && isCorrectOpt && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                      {selectedOption !== null && isPicked && !isCorrectOpt && (
                        <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="hidden sm:block text-center text-[11px] text-gray-400">
                Phím tắt: nhấn <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">1</kbd>–
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">4</kbd> để chọn ·{' '}
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">Enter</kbd> để sang câu tiếp
              </p>
            </div>
          )}

          {/* GAME 2: LISTENING COMPREHENSION */}
          {mode === 'listen' && currentListen && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-xs space-y-4">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500">
                  <Headphones className="h-3.5 w-3.5 text-[#E5483F]" />
                  <span>{currentListen.contextVi}</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                  {currentListen.questionVi}
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => speakText(currentListen.spokenEn, 0.9)}
                    className="btn-duo btn-duo-coral px-6 py-3 text-sm"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe giọng {persona.name} ({persona.accent})
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentListen.spokenEn, 0.7)}
                    className="btn-duo btn-duo-white px-4 py-3 text-xs"
                  >
                    Nghe chậm 0.7x
                  </button>
                </div>

                {showListenScript ? (
                  <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-4 text-left space-y-1">
                    <div className="font-display text-base font-bold text-gray-900">
                      &ldquo;{currentListen.spokenEn}&rdquo;
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      /{currentListen.phonetic}/
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowListenScript(true)}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900 underline cursor-pointer"
                  >
                    Hiển thị nội dung câu tiếng Anh
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {currentListen.shuffledOptionsVi.map((optVi, idx) => {
                  const isPicked = listenSelected === optVi;
                  const isCorrectOpt = optVi === currentListen.correctAnswerVi;
                  let cardCls =
                    'border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:shadow-xs';
                  if (listenSelected !== null) {
                    if (isCorrectOpt) {
                      cardCls =
                        'border-emerald-500 bg-emerald-50 text-emerald-900';
                    } else if (isPicked && !isCorrectOpt) {
                      cardCls =
                        'border-rose-400 bg-rose-50 text-rose-800';
                    } else {
                      cardCls =
                        'border-gray-200 bg-gray-50 text-gray-400 opacity-65';
                    }
                  }

                  return (
                    <button
                      key={optVi}
                      type="button"
                      disabled={listenSelected !== null}
                      onClick={() => handleSelectListenOption(optVi)}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition cursor-pointer ${cardCls}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/80 font-mono text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span>{optVi}</span>
                      </span>
                      {listenSelected !== null && isCorrectOpt && (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                      )}
                      {listenSelected !== null && isPicked && !isCorrectOpt && (
                        <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="hidden sm:block text-center text-[11px] text-gray-400">
                Phím tắt: <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">R</kbd> nghe lại ·{' '}
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">1</kbd>–
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">4</kbd> chọn đáp án ·{' '}
                <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5">Enter</kbd> tiếp tục
              </p>
            </div>
          )}

          {/* GAME 3: SENTENCE BUILD */}
          {mode === 'build' && currentBuild && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-2.5">
                <div className="text-xs font-semibold text-gray-500">
                  Ghép cấu trúc câu · Giọng {persona.name} ({persona.accent})
                </div>
                <p className="font-display text-xl sm:text-2xl font-bold text-gray-900">
                  &ldquo;{currentBuild.meaningVi}&rdquo;
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => speakText(currentBuild.sentenceEn, 0.88)}
                    className="btn-duo btn-duo-coral px-4 py-2 text-xs"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentBuild.sentenceEn, 0.7)}
                    className="btn-duo btn-duo-white px-3.5 py-2 text-xs"
                  >
                    Nghe chậm 0.7x
                  </button>
                </div>
              </div>

              <div className="min-h-24 rounded-3xl border border-dashed border-gray-300 bg-white p-4 flex flex-wrap items-center gap-2">
                {chosenTiles.length === 0 ? (
                  <span className="w-full text-center text-xs text-gray-400">
                    Chạm vào các thẻ từ bên dưới để xếp thành câu chuẩn bản xứ...
                  </span>
                ) : (
                  chosenTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      disabled={buildChecked !== 'idle'}
                      onClick={() => handleRemoveWordTile(tile)}
                      className="rounded-xl border border-gray-900 bg-gray-900 px-3.5 py-2 text-sm font-semibold text-white transition cursor-pointer"
                    >
                      {tile.word}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {availableTiles.map((tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    disabled={buildChecked !== 'idle'}
                    onClick={() => handlePickWordTile(tile)}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:border-gray-900 hover:shadow-xs transition cursor-pointer"
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
                    className="btn-duo btn-duo-coral flex-1 py-3.5 text-sm"
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
              <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-xs space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-semibold text-emerald-700">
                  <Mic className="h-3.5 w-3.5" />
                  Đọc to câu mẫu · Giọng {persona.accent}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                  &ldquo;{currentPron.sentence}&rdquo;
                </h1>
                <p className="font-mono text-sm text-gray-500">
                  /{currentPron.phonetic}/
                </p>
                <p className="text-sm text-gray-600">
                  {currentPron.vietnamese}
                </p>
                <p className="inline-block rounded-full bg-[#F6F7F9] border border-gray-200 px-3.5 py-1.5 text-xs text-gray-600">
                  Lưu ý phát âm: {currentPron.focusTipVi}
                </p>

                <div className="flex items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => speakText(currentPron.sentence, 0.88)}
                    className="btn-duo btn-duo-primary px-4 py-2 text-xs"
                  >
                    <Volume2 className="h-4 w-4" />
                    Nghe mẫu
                  </button>
                  <button
                    type="button"
                    onClick={() => speakText(currentPron.sentence, 0.7)}
                    className="btn-duo btn-duo-white px-4 py-2 text-xs"
                  >
                    Nghe chậm 0.7x
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
                  className={`btn-duo px-8 py-4 text-sm ${
                    pronStatus === 'recording'
                      ? 'btn-duo-coral'
                      : 'btn-duo-green'
                  }`}
                >
                  {pronStatus === 'scoring' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang phân tích từng từ...
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
                      {pronResult ? 'Đọc lại để nâng điểm' : 'Bấm Micro để đọc'}
                    </>
                  )}
                </button>
              </div>

              {pronError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 text-center">
                  {pronError}
                </div>
              )}

              {pronResult && (
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-14 w-14 flex-col items-center justify-center rounded-2xl border font-bold ${
                        getScoreTone(pronResult.overallScore).pillLight
                      }`}
                    >
                      <span className="text-xl leading-none">
                        {pronResult.overallScore}
                      </span>
                      <span className="text-[10px]">/100</span>
                    </div>
                    <div>
                      <div className="font-display text-lg font-bold text-gray-900">
                        {getScoreTone(pronResult.overallScore).label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {pronResult.summaryVi}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pronResult.wordFeedback.map((w, i) => (
                      <span
                        key={`${w.word}-${i}`}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
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
                    className="btn-duo btn-duo-coral w-full py-3.5 text-sm"
                  >
                    {pronIdx + 1 >= pronItems.length
                      ? 'Hoàn thành & Xem kết quả'
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
            className={`sticky bottom-0 border-t px-4 py-5 ${
              selectedOption === currentSpeed.correctEn
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-display text-base font-bold ${
                      selectedOption === currentSpeed.correctEn
                        ? 'text-emerald-800'
                        : 'text-rose-800'
                    }`}
                  >
                    {selectedOption === currentSpeed.correctEn
                      ? 'Chính xác, diễn đạt tự nhiên'
                      : selectedOption === '__TIMEOUT__'
                        ? 'Hết thời gian — Câu trả lời tự nhiên:'
                        : 'Cách người bản xứ diễn đạt:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(currentSpeed.correctEn, 0.85)}
                    className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-900 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Nghe
                  </button>
                </div>
                <div className="text-xs text-gray-700">
                  /{currentSpeed.phonetic}/ — {currentSpeed.tipVi}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextSpeedQuestion}
                className={`btn-duo shrink-0 px-7 py-3 text-sm ${
                  selectedOption === currentSpeed.correctEn
                    ? 'btn-duo-green'
                    : 'btn-duo-primary'
                }`}
              >
                {speedIdx + 1 >= speedItems.length ? 'Xem kết quả' : 'Tiếp tục'}
              </button>
            </div>
          </footer>
        )}

        {mode === 'listen' && currentListen && listenSelected !== null && (
          <footer
            className={`sticky bottom-0 border-t px-4 py-5 ${
              listenSelected === currentListen.correctAnswerVi
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div
                  className={`font-display text-base font-bold ${
                    listenSelected === currentListen.correctAnswerVi
                      ? 'text-emerald-800'
                      : 'text-rose-800'
                  }`}
                >
                  {listenSelected === currentListen.correctAnswerVi
                    ? 'Nghe hiểu chính xác'
                    : 'Ý chính đúng là: ' + currentListen.correctAnswerVi}
                </div>
                <div className="text-xs text-gray-700">
                  {currentListen.tipVi}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextListenQuestion}
                className={`btn-duo shrink-0 px-7 py-3 text-sm ${
                  listenSelected === currentListen.correctAnswerVi
                    ? 'btn-duo-green'
                    : 'btn-duo-primary'
                }`}
              >
                {listenIdx + 1 >= listenItems.length ? 'Xem kết quả' : 'Tiếp tục'}
              </button>
            </div>
          </footer>
        )}

        {mode === 'build' && currentBuild && buildChecked !== 'idle' && (
          <footer
            className={`sticky bottom-0 border-t px-4 py-5 ${
              buildChecked === 'correct'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="mx-auto max-w-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div
                  className={`font-display text-base font-bold ${
                    buildChecked === 'correct'
                      ? 'text-emerald-800'
                      : 'text-rose-800'
                  }`}
                >
                  {buildChecked === 'correct'
                    ? 'Trật tự câu hoàn toàn chính xác'
                    : `Câu chuẩn: "${currentBuild.sentenceEn}"`}
                </div>
                <div className="text-xs text-gray-700">
                  /{currentBuild.phonetic}/ — {currentBuild.tipVi}
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextBuildQuestion}
                className={`btn-duo shrink-0 px-7 py-3 text-sm ${
                  buildChecked === 'correct'
                    ? 'btn-duo-green'
                    : 'btn-duo-primary'
                }`}
              >
                {buildIdx + 1 >= buildItems.length ? 'Xem kết quả' : 'Tiếp tục'}
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
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              {boostActive && (
                <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-xs font-bold text-amber-800 tabular-nums">
                  Đang bật 2x XP ({boostMins}p)
                </span>
              )}
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Rèn phản xạ nghe – nói trong 2 phút
              </h1>
              <p className="text-sm text-gray-500">
                {studiedToday
                  ? `Hôm nay bạn đã giữ chuỗi ${profile.streakDays} ngày liên tiếp. Luyện thêm để tích lũy XP và Ngọc thưởng.`
                  : 'Hoàn thành trọn vẹn 1 bài thực hành bất kỳ bên dưới để tính giữ chuỗi ngày học hôm nay.'}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl bg-white border border-gray-200/80 p-4 shadow-xs min-w-56 space-y-2 tabular-nums">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>Cấp {levelInfo.level}</span>
                <span>{profile.xp} XP</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#E5483F]"
                  style={{ width: `${Math.max(6, levelInfo.progressPct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <StreakFlameSvg active={profile.streakDays > 0} className="h-3.5 w-3.5" />
                  {profile.streakDays} ngày
                </span>
                <span className="inline-flex items-center gap-1">
                  <GemSvg className="h-3.5 w-3.5" />
                  {profile.gems} Ngọc
                </span>
              </div>
            </div>
          </section>

          {/* ADAPTIVE CUSTOM QUIZ CARD */}
          <section className="rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#E5483F]">
                <Wand2 className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Biên soạn 5 câu hỏi phản xạ theo chủ đề riêng của bạn
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tạo ngay bộ câu hỏi sát với công việc, buổi phỏng vấn hoặc sở thích cá nhân.
                </p>
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
                placeholder={`Để trống để dùng hồ sơ của bạn (${
                  profile.hobbies.slice(0, 2).join(', ') || 'Đời sống'
                }) hoặc nhập chủ đề...`}
                className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={generatingAiQuiz}
                className="btn-duo btn-duo-coral px-6 py-2.5 text-sm shrink-0"
              >
                {generatingAiQuiz ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tạo bài...
                  </>
                ) : (
                  <>
                    Tạo bài &amp; Bắt đầu
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {aiQuizError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700">
                {aiQuizError}
              </div>
            )}
          </section>

          {/* Voice Persona Accent Strip with Real Photos */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {AI_PERSONAS.map((p) => {
              const selected = persona.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setPersona(p);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3.5 py-1 text-xs font-semibold transition shrink-0 cursor-pointer ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TutorAvatar personaId={p.id} className="h-7 w-7" />
                  <span>{p.name}</span>
                  <span className={selected ? 'text-gray-300' : 'text-gray-400'}>
                    {p.accent}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 4 Core Practice Mode Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-[#E5483F]">
                    <Zap className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600 tabular-nums">
                    2 phút · 5 câu
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Phản xạ câu bản xứ 15 giây
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Chọn nhanh cách diễn đạt tự nhiên nhất theo ngữ cảnh giao tiếp, tránh thói quen dịch từng từ từ tiếng Việt.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-gray-500 tabular-nums">
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+65–130 XP</span>
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+20 Ngọc</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchSpeedMatch();
                }}
                className="btn-duo btn-duo-coral w-full py-3 text-sm"
              >
                Bắt đầu bài tập
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Headphones className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600 tabular-nums">
                    2 phút · 5 tình huống
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Nghe hiểu ngữ cảnh bản xứ
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Nghe câu nói thực tế tại quán cà phê, phòng họp, sân bay và nhà hàng để nắm bắt ý chính xác.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-gray-500 tabular-nums">
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+70–130 XP</span>
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+25 Ngọc</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchListeningChallenge(persona);
                }}
                className="btn-duo btn-duo-primary w-full py-3 text-sm"
              >
                Bắt đầu luyện nghe
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Puzzle className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600 tabular-nums">
                    3 phút · 5 câu
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Nghe &amp; sắp xếp cấu trúc câu
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Nghe câu mẫu rồi sắp xếp các từ theo đúng trật tự ngữ pháp tự nhiên của người bản xứ.
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-gray-500 tabular-nums">
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+75–115 XP</span>
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+25 Ngọc</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchSentenceBuild(persona);
                }}
                className="btn-duo btn-duo-primary w-full py-3 text-sm"
              >
                Bắt đầu ghép câu
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="card-duo-elevated p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Mic className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600 tabular-nums">
                    Chấm âm · 3 câu
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-gray-900">
                  Luyện phát âm &amp; nhận xét IPA
                </h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Đọc thành tiếng 3 câu giao tiếp thông dụng, nhận phân tích độ rõ âm, nối âm và trọng âm từ (0–100).
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-gray-500 tabular-nums">
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+90–130 XP</span>
                  <span className="rounded-full bg-[#F6F7F9] px-2.5 py-0.5">+30 Ngọc</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  launchPronunciationArena();
                }}
                className="btn-duo btn-duo-green w-full py-3 text-sm"
              >
                Bắt đầu luyện phát âm
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Voice Call Banner */}
          <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <TutorAvatar personaId={persona.id} className="h-12 w-12 shrink-0" />
              <div>
                <h3 className="font-display text-base font-bold text-gray-900">
                  Thực hành hội thoại hai chiều cùng {persona.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Trò chuyện trực tiếp từ 3 lượt nói trở lên để giữ chuỗi ngày học và nhận báo cáo 4 kỹ năng.
                </p>
              </div>
            </div>
            <Link
              href="/call"
              className="btn-duo btn-duo-white shrink-0 px-5 py-2.5 text-xs"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Mở phòng hội thoại
            </Link>
          </div>
        </>
      )}

      {/* VICTORY SUMMARY SCREEN */}
      {mode === 'victory' && (
        <div className="mx-auto max-w-lg rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-5 animate-pop-in">
          {savingVictory ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <NovaCompanion mood="excited" className="h-12 w-12" />
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <p className="text-sm font-medium text-gray-500">
                Đang lưu kết quả và đồng bộ lên Google Drive...
              </p>
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center">
                <NovaCompanion
                  mood={victoryReward?.lessonCompleted ? 'proud' : 'happy'}
                  className="h-14 w-14"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {victoryMeta?.gameTitle}
                  </span>
                  {boostActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800">
                      Đã áp dụng 2x XP
                    </span>
                  )}
                </div>
                <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  {victoryReward?.lessonCompleted
                    ? 'Hoàn thành bài thực hành'
                    : 'Chưa đạt ngưỡng hoàn thành bài'}
                </h2>
                <p className="mt-1 text-sm text-gray-500 tabular-nums">
                  {victoryMeta?.scoreText}
                </p>
              </div>

              {victoryReward && (
                <div className="grid grid-cols-3 gap-2.5 tabular-nums">
                  <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-3">
                    <div className="font-display text-lg font-bold text-[#E5483F]">
                      +{victoryReward.xpEarned}
                    </div>
                    <div className="text-[11px] font-medium text-gray-500">XP</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-3 flex flex-col items-center">
                    <div className="flex items-center gap-1 font-display text-lg font-bold text-emerald-600">
                      +{victoryReward.gemsEarned}
                      <GemSvg className="h-4 w-4" />
                    </div>
                    <div className="text-[11px] font-medium text-gray-500">Ngọc</div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-3 flex flex-col items-center">
                    <div className="flex items-center gap-1 font-display text-lg font-bold text-gray-900">
                      <StreakFlameSvg active className="h-4 w-4" />
                      {victoryReward.streakDays}
                    </div>
                    <div className="text-[11px] font-medium text-gray-500">Chuỗi ngày</div>
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border px-4 py-3 text-xs font-medium ${
                  victoryReward?.lessonCompleted
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {victoryMeta?.extraTip}
              </div>

              {victoryReward?.leveledUp && (
                <div className="rounded-2xl bg-gray-900 px-4 py-3 text-xs font-bold text-white flex items-center justify-center gap-2">
                  Chúc mừng bạn đã lên Cấp {victoryReward.newLevel}
                </div>
              )}

              {victoryReward &&
                victoryReward.newlyClaimableMilestones
                  .filter((d) => !claimedInVictory.includes(d))
                  .map((days) => (
                    <div
                      key={days}
                      className="rounded-2xl border border-[#FECACA] bg-[#FFF1F0] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-center gap-2.5">
                        <TreasureChestSvg state="ready" className="h-9 w-9" />
                        <div className="text-left">
                          <div className="font-display text-base font-bold text-gray-900">
                            Đạt cột mốc chuỗi {days} ngày
                          </div>
                          <div className="text-xs text-gray-600">
                            Nhận thêm XP, Ngọc tích lũy và danh hiệu mới.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={claimingDays === days}
                        onClick={() => void handleClaimVictoryMilestone(days)}
                        className="btn-duo btn-duo-coral w-full py-2.5 text-xs"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        {claimingDays === days
                          ? 'Đang nhận thưởng...'
                          : `Nhận phần thưởng mốc ${days} ngày`}
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
                  className="btn-duo btn-duo-white flex-1 py-3 text-xs"
                >
                  <Trophy className="h-4 w-4 text-gray-400" />
                  Bài tập khác
                </button>
                <Link
                  href="/leaderboard"
                  className="btn-duo btn-duo-white flex-1 py-3 text-xs"
                >
                  Xếp hạng
                </Link>
                <Link
                  href="/"
                  className="btn-duo btn-duo-coral flex-1 py-3 text-xs"
                >
                  Về lộ trình →
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
        <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      }
    >
      <PlayPageInner />
    </Suspense>
  );
}
