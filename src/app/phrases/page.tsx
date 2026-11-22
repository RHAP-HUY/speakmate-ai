'use client';

import {
  BookmarkPlus,
  BookOpen,
  Check,
  Layers,
  Loader2,
  Mic,
  Plus,
  RotateCw,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
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
import type { SavedPhrase, UserProfile } from '@/types';

const MASTERY_LABELS: Record<0 | 1 | 2 | 3, { label: string; color: string }> =
  {
    0: { label: 'Mới lưu', color: 'bg-slate-100 text-slate-700' },
    1: { label: 'Đang ôn', color: 'bg-amber-100 text-amber-800' },
    2: { label: 'Khá quen', color: 'bg-cyan-100 text-cyan-800' },
    3: { label: 'Đã thuộc', color: 'bg-emerald-100 text-emerald-800' },
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

  // Add new phrase form
  const [newEn, setNewEn] = useState('');
  const [newVi, setNewVi] = useState('');
  const [adding, setAdding] = useState(false);

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Pronunciation practice modal state
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
    load();
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
  }

  async function handleCycleMastery(item: SavedPhrase) {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const savedSet = new Set(phrases.map((p) => p.englishPhrase.toLowerCase()));
  const filteredStarter =
    starterFilter === 'all'
      ? STARTER_PHRASES
      : STARTER_PHRASES.filter((s) => s.category === starterFilter);

  const currentCard = phrases[cardIndex % Math.max(1, phrases.length)];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 md:pb-10">
      <AppNav profile={profile} authenticated={authenticated} />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sổ tay Cụm câu Bản xứ
            </h1>
            <p className="text-sm text-slate-600">
              Lưu câu hay từ các cuộc gọi, nghe phát âm chuẩn và ôn tập bằng Flashcard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Giọng đọc:</span>
            <select
              value={voiceAccent}
              onChange={(e) => setVoiceAccent(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              {AI_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.flag} {p.name} ({p.accent})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('notebook')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              tab === 'notebook'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Sổ tay của bạn ({phrases.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('flashcards');
              setCardIndex(0);
              setFlipped(false);
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              tab === 'flashcards'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="h-4 w-4" />
            Ôn tập Flashcard
          </button>

          <button
            type="button"
            onClick={() => setTab('starter')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              tab === 'starter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <BookmarkPlus className="h-4 w-4" />
            Kho câu cửa miệng ({STARTER_PHRASES.length})
          </button>
        </div>

        {/* Notebook Tab */}
        {tab === 'notebook' && (
          <div className="space-y-5">
            <form
              onSubmit={handleAddCustom}
              className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                type="text"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder="Cụm tiếng Anh muốn nhớ (vd: Let's catch up soon!)"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                value={newVi}
                onChange={(e) => setNewVi(e.target.value)}
                placeholder="Nghĩa tiếng Việt (vd: Hôm nào gặp nhau nhé!)"
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={adding || !newEn.trim() || !newVi.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Thêm câu
              </button>
            </form>

            {phrases.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  Sổ tay của bạn chưa có câu nào
                </p>
                <p className="mt-1 text-xs text-slate-500 mb-4">
                  Hãy bấm lưu câu hay trong lúc gọi AI hoặc thêm nhanh từ Kho câu cửa miệng nhé!
                </p>
                <button
                  type="button"
                  onClick={() => setTab('starter')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                >
                  Xem Kho câu cửa miệng bản xứ
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {phrases.map((item) => {
                  const badge = MASTERY_LABELS[item.masteryLevel];
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-bold text-slate-900">
                            {item.englishPhrase}
                          </h3>
                          <button
                            type="button"
                            onClick={() => speakText(item.englishPhrase, 0.85)}
                            className="shrink-0 rounded-xl bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        </div>
                        {item.phonetic && (
                          <p className="text-xs text-cyan-700 mt-0.5">
                            /{item.phonetic}/
                          </p>
                        )}
                        <p className="mt-1.5 text-sm text-slate-700">
                          {item.vietnameseMeaning}
                        </p>
                        {item.exampleSentence && (
                          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 italic">
                            “{item.exampleSentence}”
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => void handleCycleMastery(item)}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer ${badge.color}`}
                        >
                          {badge.label} (bấm đổi)
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPracticeTarget({
                                sentence: item.englishPhrase,
                                vietnamese: item.vietnameseMeaning,
                                phonetic: item.phonetic,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                          >
                            <Mic className="h-3 w-3" />
                            Chấm phát âm
                          </button>
                          <button
                            type="button"
                            onClick={() => speakText(item.englishPhrase, 0.72)}
                            className="text-xs font-medium text-slate-500 hover:text-indigo-600 cursor-pointer"
                          >
                            Nghe chậm
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            title="Xóa"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
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
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Hãy lưu ít nhất 1 câu vào Sổ tay trước khi ôn Flashcard nhé!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center text-xs font-semibold text-slate-500">
                  Thẻ {(cardIndex % phrases.length) + 1} / {phrases.length}
                </div>

                <div
                  onClick={() => setFlipped((f) => !f)}
                  className="min-h-64 flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg cursor-pointer transition hover:border-indigo-300"
                >
                  {!flipped ? (
                    <>
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-3">
                        Nghĩa tiếng Việt — Hãy thử nói bằng tiếng Anh
                      </span>
                      <p className="text-xl font-bold text-slate-900">
                        {currentCard.vietnameseMeaning}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <RotateCw className="h-3.5 w-3.5" />
                        Chạm vào thẻ để xem đáp án tiếng Anh
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-3">
                        Cách người bản xứ nói
                      </span>
                      <p className="text-2xl font-bold text-slate-900">
                        {currentCard.englishPhrase}
                      </p>
                      {currentCard.phonetic && (
                        <p className="mt-1 text-sm text-cyan-700">
                          /{currentCard.phonetic}/
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakText(currentCard.englishPhrase, 0.85);
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                        >
                          <Volume2 className="h-4 w-4" />
                          Nghe phát âm ({activePersona.accent})
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
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          <Mic className="h-4 w-4" />
                          Đọc thử & Chấm điểm
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setCardIndex((i) =>
                        i === 0 ? phrases.length - 1 : i - 1
                      );
                    }}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    ← Thẻ trước
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await updatePhraseMastery(currentCard.id, 3);
                      setPhrases((prev) =>
                        prev.map((p) =>
                          p.id === currentCard.id
                            ? { ...p, masteryLevel: 3 }
                            : p
                        )
                      );
                      setFlipped(false);
                      setCardIndex((i) => (i + 1) % phrases.length);
                    }}
                    className="flex-1 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    Đã thuộc ✓ & Tiếp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlipped(false);
                      setCardIndex((i) => (i + 1) % phrases.length);
                    }}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'daily', label: '☕ Đời sống' },
                { id: 'business', label: '💼 Công việc' },
                { id: 'travel', label: '✈️ Du lịch' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setStarterFilter(
                      cat.id as 'all' | 'daily' | 'business' | 'travel'
                    )
                  }
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                    starterFilter === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredStarter.map((item) => {
                const alreadySaved = savedSet.has(item.english.toLowerCase());
                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {item.english}
                        </h3>
                        <button
                          type="button"
                          onClick={() => speakText(item.english, 0.85)}
                          className="shrink-0 rounded-xl bg-indigo-50 p-2 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-cyan-700 mt-0.5">
                        /{item.phonetic}/
                      </p>
                      <p className="mt-1.5 text-sm text-slate-700">
                        {item.vietnamese}
                      </p>
                      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 italic">
                        Ví dụ: “{item.example}”
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => speakText(item.example, 0.85)}
                          className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
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
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          <Mic className="h-3 w-3" />
                          Chấm phát âm
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={alreadySaved}
                        onClick={() => void handleSaveStarter(item)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          alreadySaved
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {alreadySaved ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Đã lưu
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="h-3.5 w-3.5" />
                            Lưu sổ tay
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
      </main>

      <PronunciationPracticeModal
        target={practiceTarget}
        persona={activePersona}
        profile={profile}
        onClose={() => setPracticeTarget(null)}
      />
    </div>
  );
}
