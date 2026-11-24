'use client';

import {
  BookmarkPlus,
  Check,
  Loader2,
  Mic,
  Plus,
  RotateCw,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TutorAvatar } from '@/components/BrandArt';
import {
  PronunciationPracticeModal,
  type PronunciationPracticeTarget,
} from '@/components/PronunciationPracticeModal';
import { playNaturalVoice } from '@/lib/audio';
import {
  deletePhrase,
  getCurrentProfile,
  listSavedPhrases,
  savePhrase,
  updatePhraseMastery,
} from '@/lib/data-store';
import { AI_PERSONAS, STARTER_PHRASES } from '@/lib/scenarios';
import { playCorrectSound, playTapSound } from '@/lib/sound-fx';
import type { SavedPhrase, UserProfile } from '@/types';

const MASTERY_LABELS: Record<0 | 1 | 2 | 3, { label: string; color: string }> =
  {
    0: {
      label: 'Mới lưu',
      color: 'bg-[#F3EFE6] text-[#57534E] border-[#E7E2D8]',
    },
    1: {
      label: 'Đang ôn',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    2: {
      label: 'Khá quen',
      color: 'bg-[#14532D]/[0.06] text-[#14532D] border-[#14532D]/20',
    },
    3: {
      label: 'Đã thuộc',
      color: 'bg-[#14532D] text-white border-[#14532D]',
    },
  };

export default function PhrasesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);

  const [tab, setTab] = useState<'notebook' | 'starter' | 'flashcards'>(
    'notebook'
  );
  const [starterFilter, setStarterFilter] = useState<
    'all' | 'daily' | 'business' | 'travel'
  >('all');
  const [voiceAccent, setVoiceAccent] = useState<string>('emma-us');

  const [newEn, setNewEn] = useState('');
  const [newVi, setNewVi] = useState('');
  const [adding, setAdding] = useState(false);

  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

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

  function speakText(text: string, speed = 0.85) {
    void playNaturalVoice({
      text,
      voice: activePersona.edgeVoice,
      browserLang: activePersona.browserLang,
      speed,
    });
  }

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <Loader2 className="h-5 w-5 animate-spin text-[#78716C]" />
      </div>
    );
  }

  const savedSet = new Set(phrases.map((p) => p.englishPhrase.toLowerCase()));
  const filteredStarter =
    starterFilter === 'all'
      ? STARTER_PHRASES
      : STARTER_PHRASES.filter((s) => s.category === starterFilter);

  const dueCount = phrases.filter((p) => p.masteryLevel < 3).length;
  const flashcardDeck = [...phrases].sort(
    (a, b) => a.masteryLevel - b.masteryLevel
  );
  const currentCard =
    flashcardDeck[cardIndex % Math.max(1, flashcardDeck.length)];

  return (
    <AppShell profile={profile} authenticated={authenticated}>
      {/* Open Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E2D8]">
        <div className="space-y-1">
          <p className="font-serif-display italic text-sm text-[#C2410C]">
            Sổ tay ngôn ngữ cá nhân
          </p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
            Kho mẫu câu giao tiếp tự nhiên
          </h1>
          <p className="text-xs sm:text-sm text-[#57534E]">
            Lưu lại những cụm từ đắt giá từ các buổi hội thoại, nghe chuẩn ngữ điệu và ôn tập bằng thẻ lật.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <TutorAvatar personaId={activePersona.id} className="h-9 w-9" />
          <div className="text-xs">
            <span className="block text-[11px] text-[#78716C]">Giọng đọc mẫu</span>
            <select
              value={voiceAccent}
              onChange={(e) => setVoiceAccent(e.target.value)}
              className="bg-transparent font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
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

      {/* Clean Underline Tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-[#E7E2D8]">
        {[
          { id: 'notebook', label: `Sổ của bạn (${phrases.length})` },
          {
            id: 'flashcards',
            label: `Thẻ lật ôn tập${dueCount > 0 ? ` (${dueCount} cần ôn)` : ''}`,
          },
          { id: 'starter', label: `Tuyển tập mẫu câu (${STARTER_PHRASES.length})` },
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
              className={`relative pb-3 text-sm transition cursor-pointer ${
                active
                  ? 'font-semibold text-[#14532D]'
                  : 'font-medium text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#14532D]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Notebook Tab */}
      {tab === 'notebook' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddCustom}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="text"
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              placeholder="Cụm câu tiếng Anh (ví dụ: Let's catch up soon!)"
              className="flex-1 rounded-xl border border-[#D6CFC2] bg-white px-4 py-2.5 text-sm focus:border-[#14532D] focus:outline-none"
            />
            <input
              type="text"
              value={newVi}
              onChange={(e) => setNewVi(e.target.value)}
              placeholder="Nghĩa tiếng Việt tương ứng"
              className="flex-1 rounded-xl border border-[#D6CFC2] bg-white px-4 py-2.5 text-sm focus:border-[#14532D] focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding || !newEn.trim() || !newVi.trim()}
              className="btn-duo btn-duo-primary px-5 py-2.5 text-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              Lưu câu mới
            </button>
          </form>

          {phrases.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/50 p-10 text-center space-y-3">
              <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
                Sổ mẫu câu của bạn đang trống
              </p>
              <p className="text-xs text-[#57534E]">
                Bạn có thể lưu câu mới khi đang hội thoại hoặc chọn từ Tuyển tập mẫu câu bản xứ.
              </p>
              <button
                type="button"
                onClick={() => setTab('starter')}
                className="btn-duo btn-duo-primary px-5 py-2.5 text-xs"
              >
                Xem tuyển tập mẫu câu
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {phrases.map((item) => {
                const badge = MASTERY_LABELS[item.masteryLevel];
                return (
                  <div
                    key={item.id}
                    className="card-duo-elevated p-5 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif-display text-lg font-semibold text-[#1C1917] leading-snug">
                          {item.englishPhrase}
                        </h3>
                        <button
                          type="button"
                          onClick={() => speakText(item.englishPhrase, 0.88)}
                          className="shrink-0 rounded-full border border-[#D6CFC2] bg-[#FBF9F5] p-2 text-[#1C1917] hover:bg-[#F3EFE6] cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.phonetic && (
                        <p className="font-mono text-xs text-[#78716C] mt-1">
                          /{item.phonetic}/
                        </p>
                      )}
                      <p className="mt-2 text-sm text-[#57534E]">
                        {item.vietnameseMeaning}
                      </p>
                      {item.exampleSentence && (
                        <p className="mt-2.5 border-l-2 border-[#D6CFC2] pl-3 font-serif-display italic text-xs text-[#57534E]">
                          &ldquo;{item.exampleSentence}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#E7E2D8]">
                      <button
                        type="button"
                        onClick={() => void handleCycleMastery(item)}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium cursor-pointer ${badge.color}`}
                      >
                        {badge.label}
                      </button>

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
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532D] hover:underline cursor-pointer"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          Chấm âm
                        </button>
                        <button
                          type="button"
                          onClick={() => speakText(item.englishPhrase, 0.72)}
                          className="text-xs text-[#78716C] hover:text-[#1C1917] cursor-pointer"
                        >
                          Chậm
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          title="Xóa"
                          className="text-[#A8A29E] hover:text-rose-700 cursor-pointer"
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

      {/* Flashcard Tab */}
      {tab === 'flashcards' && (
        <div className="mx-auto max-w-xl">
          {phrases.length === 0 ? (
            <div className="rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/50 p-8 text-center">
              <p className="text-sm font-medium text-[#57534E]">
                Hãy lưu ít nhất 1 mẫu câu vào sổ trước khi ôn bằng thẻ lật.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center font-mono text-xs text-[#78716C] tabular-nums">
                Thẻ {(cardIndex % phrases.length) + 1} / {phrases.length}
              </div>

              <div
                onClick={() => {
                  playTapSound();
                  setFlipped((f) => !f);
                }}
                className="card-duo-elevated min-h-72 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
              >
                {!flipped ? (
                  <>
                    <span className="font-serif-display italic text-sm text-[#C2410C] mb-3">
                      Nghĩa tiếng Việt — Hãy thử diễn đạt bằng tiếng Anh
                    </span>
                    <p className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                      {currentCard.vietnameseMeaning}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#78716C]">
                      <RotateCw className="h-3.5 w-3.5" />
                      Chạm vào thẻ để xem câu bản xứ
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-serif-display italic text-sm text-[#14532D] mb-3">
                      Cách người bản xứ diễn đạt
                    </span>
                    <p className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                      {currentCard.englishPhrase}
                    </p>
                    {currentCard.phonetic && (
                      <p className="mt-2 font-mono text-xs text-[#78716C]">
                        /{currentCard.phonetic}/
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

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setFlipped(false);
                    setCardIndex((i) => (i === 0 ? phrases.length - 1 : i - 1));
                  }}
                  className="btn-duo btn-duo-white flex-1 py-2.5 text-xs"
                >
                  ← Thẻ trước
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    playCorrectSound();
                    await updatePhraseMastery(currentCard.id, 3);
                    setPhrases((prev) =>
                      prev.map((p) =>
                        p.id === currentCard.id ? { ...p, masteryLevel: 3 } : p
                      )
                    );
                    setFlipped(false);
                    setCardIndex((i) => (i + 1) % phrases.length);
                  }}
                  className="btn-duo btn-duo-primary flex-1 py-2.5 text-xs"
                >
                  Đánh dấu đã thuộc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setFlipped(false);
                    setCardIndex((i) => (i + 1) % phrases.length);
                  }}
                  className="btn-duo btn-duo-white flex-1 py-2.5 text-xs"
                >
                  Thẻ sau →
                </button>
              </div>
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
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                  starterFilter === cat.id
                    ? 'border-[#1C1917] bg-[#1C1917] text-white'
                    : 'border-[#D6CFC2] bg-white text-[#57534E] hover:border-[#1C1917]'
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
                      <h3 className="font-serif-display text-lg font-semibold text-[#1C1917] leading-snug">
                        {item.english}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakText(item.english, 0.88)}
                        className="shrink-0 rounded-full border border-[#D6CFC2] bg-[#FBF9F5] p-2 text-[#1C1917] hover:bg-[#F3EFE6] cursor-pointer"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="font-mono text-xs text-[#78716C] mt-1">
                      /{item.phonetic}/
                    </p>
                    <p className="mt-2 text-sm text-[#57534E]">
                      {item.vietnamese}
                    </p>
                    <p className="mt-2.5 border-l-2 border-[#D6CFC2] pl-3 font-serif-display italic text-xs text-[#57534E]">
                      &ldquo;{item.example}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E7E2D8]">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => speakText(item.example, 0.88)}
                        className="text-xs font-medium text-[#57534E] hover:text-[#1C1917] underline cursor-pointer"
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532D] hover:underline cursor-pointer"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        Chấm âm
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={alreadySaved}
                      onClick={() => void handleSaveStarter(item)}
                      className={`btn-duo px-3 py-1.5 text-xs ${
                        alreadySaved ? 'btn-duo-white' : 'btn-duo-primary'
                      }`}
                    >
                      {alreadySaved ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#14532D]" />
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
    </AppShell>
  );
}
