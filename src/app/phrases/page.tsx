'use client';

import {
  BookmarkPlus,
  Check,
  Clock,
  Download,
  Loader2,
  Mic,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TutorAvatar } from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import {
  PronunciationPracticeModal,
  type PronunciationPracticeTarget,
} from '@/components/PronunciationPracticeModal';
import { playNaturalVoice } from '@/lib/audio';
import {
  deletePhrase,
  getCurrentProfile,
  listSavedPhrases,
  recordLessonProgress,
  reviewSavedPhrase,
  savePhrase,
  updatePhraseMastery,
} from '@/lib/data-store';
import { AI_PERSONAS, STARTER_PHRASES } from '@/lib/scenarios';
import {
  playChestOpenSound,
  playCorrectSound,
  playTapSound,
} from '@/lib/sound-fx';
import {
  exportPhrasesToTsv,
  formatRelativeDueVi,
  getPhraseReviewSummary,
  isPhraseDue,
  previewGradeIntervalsVi,
  sortPhrasesForReview,
} from '@/lib/spaced-repetition';
import type { SavedPhrase, SrsReviewGrade, UserProfile } from '@/types';

const MASTERY_LABELS: Record<0 | 1 | 2 | 3, { label: string; color: string }> =
  {
    0: {
      label: 'Mới lưu',
      color: 'bg-gray-100 text-gray-600 border-gray-200',
    },
    1: {
      label: 'Đang ôn',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    2: {
      label: 'Khá quen',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    3: {
      label: 'Đã thuộc',
      color: 'bg-emerald-600 text-white border-emerald-600',
    },
  };

const SRS_REWARD_TARGET = 5;

export default function PhrasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);

  const [tab, setTab] = useState<'notebook' | 'starter' | 'flashcards'>(
    'notebook'
  );
  const [notebookFilter, setNotebookFilter] = useState<
    'all' | 'due' | 'learning' | 'mastered'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [starterFilter, setStarterFilter] = useState<
    'all' | 'daily' | 'business' | 'travel'
  >('all');
  const [voiceAccent, setVoiceAccent] = useState<string>('emma-us');

  const [newEn, setNewEn] = useState('');
  const [newVi, setNewVi] = useState('');
  const [adding, setAdding] = useState(false);

  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState(0);
  const [sessionRewarded, setSessionRewarded] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(
    null
  );

  const [practiceTarget, setPracticeTarget] =
    useState<PronunciationPracticeTarget | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { profile: prof, authenticated: isAuth } = await getCurrentProfile();
      if (!active) return;
      if (!isAuth) {
        router.replace('/auth?next=/phrases');
        return;
      }
      setProfile(prof);
      setAuthenticated(true);
      const list = await listSavedPhrases();
      if (!active) return;
      setPhrases(list);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  const activePersona =
    AI_PERSONAS.find((p) => p.id === voiceAccent) ?? AI_PERSONAS[0];

  const speakText = useCallback(
    (text: string, speed = 0.85) => {
      void playNaturalVoice({
        text,
        voice: activePersona.edgeVoice,
        browserLang: activePersona.browserLang,
        speed,
      });
    },
    [activePersona]
  );

  const summary = useMemo(() => getPhraseReviewSummary(phrases), [phrases]);
  const flashcardDeck = useMemo(() => sortPhrasesForReview(phrases), [phrases]);
  const currentCard =
    flashcardDeck[cardIndex % Math.max(1, flashcardDeck.length)];

  const handleGradeCard = useCallback(
    async (grade: SrsReviewGrade) => {
      if (!currentCard) return;
      if (grade === 'again') {
        playTapSound();
      } else {
        playCorrectSound();
      }

      const updated = await reviewSavedPhrase(currentCard.id, grade);
      if (updated) {
        setPhrases((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      }

      const nextReviewed = reviewedInSession + 1;
      setReviewedInSession(nextReviewed);
      setFlipped(false);
      setCardIndex((prev) => (prev + 1) % Math.max(1, flashcardDeck.length));

      const targetCards = Math.min(
        SRS_REWARD_TARGET,
        Math.max(3, phrases.length)
      );
      if (!sessionRewarded && nextReviewed >= targetCards) {
        setSessionRewarded(true);
        const reward = await recordLessonProgress({
          durationSeconds: nextReviewed * 18,
          userMessagesSent: 0,
          completedLesson: true,
          xpEarned: 55,
          gemsEarned: 15,
          sessionsDelta: 1,
        });
        const refreshed = await getCurrentProfile();
        if (refreshed.profile) setProfile(refreshed.profile);
        playChestOpenSound();
        setCelebration({
          title: 'Hoàn thành phiên ôn tập SRS',
          subtitle: `Đã ghi nhận lịch lặp lại ngắt quãng cho ${nextReviewed} mẫu câu và tính giữ chuỗi ngày học.`,
          xp: reward.xpEarned,
          gems: reward.gemsEarned,
        });
      }
    },
    [currentCard, flashcardDeck.length, phrases.length, reviewedInSession, sessionRewarded]
  );

  useEffect(() => {
    if (tab !== 'flashcards' || !currentCard || practiceTarget) return;

    function onKeyDown(ev: KeyboardEvent) {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (ev.code === 'Space') {
        ev.preventDefault();
        playTapSound();
        setFlipped((f) => !f);
        return;
      }
      if (ev.key.toLowerCase() === 'r' && flipped) {
        ev.preventDefault();
        speakText(currentCard.englishPhrase, 0.88);
        return;
      }
      if (flipped) {
        if (ev.key === '1') void handleGradeCard('again');
        else if (ev.key === '2') void handleGradeCard('hard');
        else if (ev.key === '3') void handleGradeCard('good');
        else if (ev.key === '4') void handleGradeCard('easy');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tab, currentCard, flipped, practiceTarget, speakText, handleGradeCard]);

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!newEn.trim() || !newVi.trim()) return;
    setAdding(true);
    try {
      const saved = await savePhrase({
        englishPhrase: newEn.trim(),
        vietnameseMeaning: newVi.trim(),
        accent: activePersona.accent,
      });
      setPhrases((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists ? prev : [saved, ...prev];
      });
      playCorrectSound();
      setNewEn('');
      setNewVi('');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveStarter(item: (typeof STARTER_PHRASES)[number]) {
    const saved = await savePhrase({
      englishPhrase: item.english,
      vietnameseMeaning: item.vietnamese,
      phonetic: item.phonetic,
      exampleSentence: item.example,
      category: item.category,
      accent: activePersona.accent,
    });
    setPhrases((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev : [saved, ...prev];
    });
    playCorrectSound();
  }

  async function handleCycleMastery(item: SavedPhrase) {
    playTapSound();
    const next = ((item.masteryLevel + 1) % 4) as 0 | 1 | 2 | 3;
    setPhrases((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, masteryLevel: next } : p))
    );
    await updatePhraseMastery(item.id, next);
  }

  async function handleDelete(id: string) {
    setPhrases((prev) => prev.filter((p) => p.id !== id));
    await deletePhrase(id);
  }

  function handleExportTsv() {
    if (phrases.length === 0) return;
    playTapSound();
    const tsv = exportPhrasesToTsv(phrases);
    const blob = new Blob(['\uFEFF' + tsv], {
      type: 'text/tab-separated-values;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speakmate-phrases-${new Date().toISOString().slice(0, 10)}.tsv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const filteredNotebook = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return phrases.filter((p) => {
      if (notebookFilter === 'due' && !isPhraseDue(p)) return false;
      if (notebookFilter === 'learning' && (p.masteryLevel === 0 || p.masteryLevel >= 3)) {
        return false;
      }
      if (notebookFilter === 'mastered' && p.masteryLevel < 3) return false;
      if (!q) return true;
      return (
        p.englishPhrase.toLowerCase().includes(q) ||
        p.vietnameseMeaning.toLowerCase().includes(q) ||
        (p.phonetic || '').toLowerCase().includes(q)
      );
    });
  }, [phrases, notebookFilter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const savedSet = new Set(phrases.map((p) => p.englishPhrase.toLowerCase()));
  const filteredStarter =
    starterFilter === 'all'
      ? STARTER_PHRASES
      : STARTER_PHRASES.filter((s) => s.category === starterFilter);

  const gradeIntervals = currentCard
    ? previewGradeIntervalsVi(currentCard)
    : null;

  return (
    <AppShell profile={profile} authenticated={authenticated}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Sổ mẫu câu &amp; Ôn tập ngắt quãng
          </h1>
          <p className="text-sm text-gray-500">
            Lưu cụm từ bản xứ từ các buổi hội thoại, ôn theo đường cong trí nhớ SM-2 và xuất sang Anki / Excel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white pl-1.5 pr-4 py-1 shadow-xs shrink-0">
          <TutorAvatar personaId={activePersona.id} className="h-9 w-9" />
          <div className="text-xs">
            <span className="block text-[10px] text-gray-400">Giọng đọc mẫu</span>
            <select
              value={voiceAccent}
              onChange={(e) => setVoiceAccent(e.target.value)}
              className="bg-transparent font-semibold text-gray-900 focus:outline-none cursor-pointer"
            >
              {AI_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.accentLabel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SRS Summary Strip */}
      {phrases.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <dt className="text-xs text-gray-500">Tổng số mẫu câu</dt>
            <dd className="font-display text-2xl font-bold text-gray-900 mt-1">
              {summary.total}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <dt className="text-xs text-gray-500">Đến hạn ôn hôm nay</dt>
            <dd className="font-display text-2xl font-bold text-[#E5483F] mt-1">
              {summary.dueCount}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <dt className="text-xs text-gray-500">Đang ghi nhớ</dt>
            <dd className="font-display text-2xl font-bold text-amber-600 mt-1">
              {summary.learningCount}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs">
            <dt className="text-xs text-gray-500">Đã thành thạo</dt>
            <dd className="font-display text-2xl font-bold text-emerald-600 mt-1">
              {summary.masteredCount}
            </dd>
          </div>
        </dl>
      )}

      {/* Pill Tabs + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'notebook', label: `Sổ của bạn (${phrases.length})` },
            {
              id: 'flashcards',
              label: `Ôn thẻ SRS${
                summary.dueCount > 0 ? ` (${summary.dueCount})` : ''
              }`,
            },
            {
              id: 'starter',
              label: `Tuyển tập mẫu câu (${STARTER_PHRASES.length})`,
            },
          ].map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setTab(t.id as 'notebook' | 'flashcards' | 'starter');
                  if (t.id === 'flashcards') {
                    setCardIndex(0);
                    setFlipped(false);
                  }
                }}
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {phrases.length > 0 && (
          <button
            type="button"
            onClick={handleExportTsv}
            className="btn-duo btn-duo-white px-4 py-2 text-xs"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            Xuất TSV (Anki / Excel)
          </button>
        )}
      </div>

      {/* Notebook Tab */}
      {tab === 'notebook' && (
        <div className="space-y-5">
          <form
            onSubmit={handleAddCustom}
            className="rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="text"
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              placeholder="Cụm câu tiếng Anh (ví dụ: Let's catch up soon!)"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-900 focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              value={newVi}
              onChange={(e) => setNewVi(e.target.value)}
              placeholder="Nghĩa tiếng Việt tương ứng"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-900 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding || !newEn.trim() || !newVi.trim()}
              className="btn-duo btn-duo-coral px-5 py-2.5 text-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              Lưu câu
            </button>
          </form>

          {phrases.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm nhanh mẫu câu hoặc nghĩa tiếng Việt..."
                  className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs text-gray-900 focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'due', label: `Đến hạn (${summary.dueCount})` },
                    { id: 'learning', label: 'Đang ôn' },
                    { id: 'mastered', label: 'Đã thuộc' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setNotebookFilter(f.id);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                      notebookFilter === f.id
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phrases.length === 0 ? (
            <div className="rounded-3xl border border-gray-200/80 bg-white p-10 text-center shadow-xs space-y-3">
              <p className="font-display text-lg font-bold text-gray-900">
                Sổ mẫu câu của bạn đang trống
              </p>
              <p className="text-sm text-gray-500">
                Lưu câu hay khi đang hội thoại hoặc chọn ngay từ Tuyển tập mẫu câu bản xứ.
              </p>
              <button
                type="button"
                onClick={() => setTab('starter')}
                className="btn-duo btn-duo-coral px-5 py-2.5 text-xs"
              >
                Xem tuyển tập mẫu câu
              </button>
            </div>
          ) : filteredNotebook.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
              Không tìm thấy mẫu câu nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredNotebook.map((item) => {
                const badge = MASTERY_LABELS[item.masteryLevel];
                const dueNow = isPhraseDue(item);
                return (
                  <div
                    key={item.id}
                    className="card-duo-elevated p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg font-bold text-gray-900 leading-snug">
                          {item.englishPhrase}
                        </h3>
                        <button
                          type="button"
                          onClick={() => speakText(item.englishPhrase, 0.88)}
                          className="shrink-0 rounded-full border border-gray-200 bg-gray-50 p-2 text-gray-800 hover:bg-gray-900 hover:text-white transition cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.phonetic && (
                        <p className="font-mono text-xs text-gray-400 mt-1">
                          /{item.phonetic}/
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-600">
                        {item.vietnameseMeaning}
                      </p>
                      {item.exampleSentence && (
                        <p className="mt-2.5 border-l-2 border-gray-200 pl-3 text-xs text-gray-500">
                          &ldquo;{item.exampleSentence}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCycleMastery(item)}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer ${badge.color}`}
                        >
                          {badge.label}
                        </button>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            dueNow
                              ? 'font-semibold text-[#E5483F]'
                              : 'text-gray-400'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {formatRelativeDueVi(item)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setPracticeTarget({
                              sentence: item.englishPhrase,
                              vietnamese: item.vietnameseMeaning,
                              phonetic: item.phonetic,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          Chấm âm
                        </button>
                        <button
                          type="button"
                          onClick={() => speakText(item.englishPhrase, 0.72)}
                          className="text-xs font-medium text-gray-500 hover:text-gray-900 cursor-pointer"
                        >
                          Chậm
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          title="Xóa"
                          className="text-gray-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Spaced Repetition Flashcard Session Tab */}
      {tab === 'flashcards' && (
        <div className="mx-auto max-w-xl">
          {phrases.length === 0 ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-xs space-y-3">
              <p className="text-sm font-medium text-gray-600">
                Hãy lưu ít nhất 1 mẫu câu vào sổ trước khi bắt đầu phiên ôn tập ngắt quãng.
              </p>
              <button
                type="button"
                onClick={() => setTab('starter')}
                className="btn-duo btn-duo-coral px-5 py-2.5 text-xs"
              >
                Chọn từ tuyển tập mẫu câu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-500 tabular-nums">
                <span>
                  Thẻ {(cardIndex % flashcardDeck.length) + 1} / {flashcardDeck.length} ·{' '}
                  <strong className="text-gray-900">
                    {formatRelativeDueVi(currentCard)}
                  </strong>
                </span>
                <span>
                  Phiên này:{' '}
                  <strong className="text-emerald-600">
                    {reviewedInSession}/{Math.min(SRS_REWARD_TARGET, Math.max(3, phrases.length))}
                  </strong>{' '}
                  {sessionRewarded ? '(Đã cộng +55 XP)' : 'để giữ chuỗi'}
                </span>
              </div>

              <div
                onClick={() => {
                  playTapSound();
                  setFlipped((f) => !f);
                }}
                className="rounded-3xl border border-gray-200 bg-white shadow-sm min-h-76 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:shadow-md transition"
              >
                {!flipped ? (
                  <>
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-[#E5483F] mb-4">
                      Thử nói thành tiếng bằng tiếng Anh
                    </span>
                    <p className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                      {currentCard.vietnameseMeaning}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <RotateCw className="h-3.5 w-3.5" />
                      Chạm vào thẻ (hoặc phím Space) để xem đáp án
                    </span>
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 mb-4">
                      Cách người bản xứ diễn đạt
                    </span>
                    <p className="font-display text-2xl sm:text-3xl font-bold text-gray-900">
                      {currentCard.englishPhrase}
                    </p>
                    {currentCard.phonetic && (
                      <p className="mt-2 font-mono text-xs text-gray-500">
                        /{currentCard.phonetic}/
                      </p>
                    )}
                    {currentCard.exampleSentence && (
                      <p className="mt-3 max-w-md text-sm text-gray-600">
                        &ldquo;{currentCard.exampleSentence}&rdquo;
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(currentCard.englishPhrase, 0.88);
                        }}
                        className="btn-duo btn-duo-white px-4 py-2 text-xs"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Nghe ({activePersona.accent})
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPracticeTarget({
                            sentence: currentCard.englishPhrase,
                            vietnamese: currentCard.vietnameseMeaning,
                            phonetic: currentCard.phonetic,
                          });
                        }}
                        className="btn-duo btn-duo-primary px-4 py-2 text-xs"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        Đọc thử &amp; Chấm điểm
                      </button>
                    </div>
                  </>
                )}
              </div>

              {!flipped ? (
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setFlipped(true);
                  }}
                  className="btn-duo btn-duo-primary w-full py-3.5 text-sm"
                >
                  Hiện câu tiếng Anh để tự đánh giá
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-center text-xs text-gray-500">
                    Đánh giá độ nhớ để hệ thống tự lên lịch ôn tiếp theo:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                    {(
                      [
                        {
                          grade: 'again',
                          keyHint: '1',
                          label: 'Chưa nhớ',
                          cls: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
                        },
                        {
                          grade: 'hard',
                          keyHint: '2',
                          label: 'Ngập ngừng',
                          cls: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
                        },
                        {
                          grade: 'good',
                          keyHint: '3',
                          label: 'Nhớ đúng',
                          cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                        },
                        {
                          grade: 'easy',
                          keyHint: '4',
                          label: 'Bật ra ngay',
                          cls: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
                        },
                      ] as const
                    ).map((btn) => (
                      <button
                        key={btn.grade}
                        type="button"
                        onClick={() => void handleGradeCard(btn.grade)}
                        className={`flex flex-col items-center justify-center rounded-2xl border px-3 py-2.5 transition cursor-pointer ${btn.cls}`}
                      >
                        <span className="text-xs font-bold">
                          {btn.keyHint}. {btn.label}
                        </span>
                        <span className="text-[11px] opacity-80 mt-0.5">
                          {gradeIntervals?.[btn.grade]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Starter Pack Tab */}
      {tab === 'starter' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tất cả chủ đề' },
              { id: 'daily', label: 'Đời sống' },
              { id: 'business', label: 'Công sở' },
              { id: 'travel', label: 'Du lịch' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setStarterFilter(
                    cat.id as 'all' | 'daily' | 'business' | 'travel'
                  );
                }}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold cursor-pointer transition ${
                  starterFilter === cat.id
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {filteredStarter.map((item) => {
              const alreadySaved = savedSet.has(item.english.toLowerCase());
              return (
                <div
                  key={item.id}
                  className="card-duo-elevated p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-bold text-gray-900 leading-snug">
                        {item.english}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakText(item.english, 0.88)}
                        className="shrink-0 rounded-full border border-gray-200 bg-gray-50 p-2 text-gray-800 hover:bg-gray-900 hover:text-white transition cursor-pointer"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="font-mono text-xs text-gray-400 mt-1">
                      /{item.phonetic}/
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {item.vietnamese}
                    </p>
                    <p className="mt-2.5 border-l-2 border-gray-200 pl-3 text-xs text-gray-500">
                      &ldquo;{item.example}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => speakText(item.example, 0.88)}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-900 underline cursor-pointer"
                      >
                        Nghe câu ví dụ
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPracticeTarget({
                            sentence: item.english,
                            vietnamese: item.vietnamese,
                            phonetic: item.phonetic,
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        Chấm âm
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={alreadySaved}
                      onClick={() => void handleSaveStarter(item)}
                      className={`btn-duo px-3.5 py-1.5 text-xs ${
                        alreadySaved ? 'btn-duo-white' : 'btn-duo-primary'
                      }`}
                    >
                      {alreadySaved ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Đã lưu
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          Lưu vào sổ
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PronunciationPracticeModal
        target={practiceTarget}
        persona={activePersona}
        profile={profile}
        onClose={() => setPracticeTarget(null)}
      />

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
