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
import { AppShell } from '@/components/AppShell';
import { NovaCompanion } from '@/components/BrandArt';
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
    0: { label: 'Mới lưu', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    1: { label: 'Đang ôn', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    2: { label: 'Khá quen', color: 'bg-sky-50 text-sky-800 border-sky-200' },
    3: { label: 'Đã thuộc ✓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
        <NovaCompanion mood="happy" className="h-18 w-18 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const savedSet = new Set(phrases.map((p) => p.englishPhrase.toLowerCase()));
  const filteredStarter =
    starterFilter === 'all'
      ? STARTER_PHRASES
      : STARTER_PHRASES.filter((s) => s.category === starterFilter);

  // Smart SRS Flashcard deck: prioritize phrases not yet mastered (masteryLevel 0 -> 1 -> 2 -> 3)
  const dueCount = phrases.filter((p) => p.masteryLevel < 3).length;
  const flashcardDeck = [...phrases].sort(
    (a, b) => a.masteryLevel - b.masteryLevel
  );
  const currentCard =
    flashcardDeck[cardIndex % Math.max(1, flashcardDeck.length)];

  return (
    <AppShell profile={profile} authenticated={authenticated}>
      {/* Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 border-b-4 border-indigo-900/35 p-6 text-white shadow-lg shadow-indigo-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="relative">
          <div className="text-[11px] font-black uppercase tracking-widest text-white/85">
            SỔ TAY &amp; FLASHCARD BẢN XỨ
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-0.5">
            Kho Cụm Câu Giao Tiếp Tự Nhiên
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-white/90 mt-1">
            Lưu câu hay từ cuộc gọi AI, nghe giọng bản xứ &amp; luyện chấm phát âm từng câu.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-white/15 border-2 border-white/25 px-3 py-2 shrink-0">
          <span className="text-xs font-extrabold">Giọng:</span>
          <select
            value={voiceAccent}
            onChange={(e) => setVoiceAccent(e.target.value)}
            className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer [&>option]:text-slate-900"
          >
            {AI_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.flag} {p.name} ({p.accent})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Tactile Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setTab('notebook');
          }}
          className={`btn-duo px-4 py-2.5 text-xs uppercase ${
            tab === 'notebook' ? 'btn-duo-purple' : 'btn-duo-white'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Sổ tay ({phrases.length})
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            setTab('flashcards');
            setCardIndex(0);
            setFlipped(false);
          }}
          className={`btn-duo px-4 py-2.5 text-xs uppercase ${
            tab === 'flashcards' ? 'btn-duo-purple' : 'btn-duo-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          Ôn Flashcard SRS {dueCount > 0 ? `(${dueCount} cần ôn)` : ''}
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            setTab('starter');
          }}
          className={`btn-duo px-4 py-2.5 text-xs uppercase ${
            tab === 'starter' ? 'btn-duo-purple' : 'btn-duo-white'
          }`}
        >
          <BookmarkPlus className="h-4 w-4" />
          Kho câu mẫu ({STARTER_PHRASES.length})
        </button>
      </div>

      {/* Notebook Tab */}
      {tab === 'notebook' && (
        <div className="space-y-5">
          <form
            onSubmit={handleAddCustom}
            className="card-duo p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={newEn}
              onChange={(e) => setNewEn(e.target.value)}
              placeholder="Cụm tiếng Anh muốn nhớ (vd: Let's catch up soon!)"
              className="flex-1 rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:border-[#8B5CF6] focus:outline-none"
            />
            <input
              type="text"
              value={newVi}
              onChange={(e) => setNewVi(e.target.value)}
              placeholder="Nghĩa tiếng Việt (vd: Hôm nào gặp nhau nhé!)"
              className="flex-1 rounded-xl border-2 border-slate-200 px-3.5 py-2.5 text-sm font-semibold focus:border-[#8B5CF6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding || !newEn.trim() || !newVi.trim()}
              className="btn-duo btn-duo-green px-4 py-2.5 text-xs uppercase"
            >
              <Plus className="h-4 w-4" />
              Thêm câu
            </button>
          </form>

          {phrases.length === 0 ? (
            <div className="card-duo border-dashed p-10 text-center space-y-3">
              <p className="text-sm font-black text-slate-800">
                Sổ tay của bạn chưa có câu nào
              </p>
              <p className="text-xs font-medium text-slate-500">
                Bấm lưu câu hay khi gọi AI hoặc chọn ngay từ Kho câu cửa miệng bản xứ!
              </p>
              <button
                type="button"
                onClick={() => setTab('starter')}
                className="btn-duo btn-duo-purple px-5 py-2.5 text-xs uppercase"
              >
                Mở Kho câu mẫu
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              {phrases.map((item) => {
                const badge = MASTERY_LABELS[item.masteryLevel];
                return (
                  <div
                    key={item.id}
                    className="card-duo-elevated p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-black text-slate-900">
                          {item.englishPhrase}
                        </h3>
                        <button
                          type="button"
                          onClick={() => speakText(item.englishPhrase, 0.85)}
                          className="shrink-0 rounded-xl border-2 border-sky-200 bg-[#DDF4FF] p-2 text-[#1899D6] hover:bg-sky-100 cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.phonetic && (
                        <p className="text-xs font-bold text-[#1899D6] mt-0.5">
                          /{item.phonetic}/
                        </p>
                      )}
                      <p className="mt-1.5 text-sm font-semibold text-slate-700">
                        {item.vietnameseMeaning}
                      </p>
                      {item.exampleSentence && (
                        <p className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 italic">
                          “{item.exampleSentence}”
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t-2 border-slate-100">
                      <button
                        type="button"
                        onClick={() => void handleCycleMastery(item)}
                        className={`rounded-xl border px-3 py-1 text-[11px] font-extrabold cursor-pointer ${badge.color}`}
                      >
                        {badge.label}
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
                          className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-[#F1FDE8] px-2.5 py-1 text-xs font-extrabold text-[#3B8702] hover:bg-emerald-100 cursor-pointer"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          Chấm âm
                        </button>
                        <button
                          type="button"
                          onClick={() => speakText(item.englishPhrase, 0.72)}
                          className="text-xs font-bold text-slate-500 hover:text-[#1899D6] cursor-pointer"
                        >
                          Chậm
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
            <div className="card-duo p-8 text-center">
              <p className="text-sm font-black text-slate-700">
                Hãy lưu ít nhất 1 câu vào Sổ tay trước khi ôn Flashcard nhé!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-xs font-black uppercase tracking-wider text-slate-400">
                Thẻ {(cardIndex % phrases.length) + 1} / {phrases.length}
              </div>

              <div
                onClick={() => {
                  playTapSound();
                  setFlipped((f) => !f);
                }}
                className="card-duo-elevated min-h-72 flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-[#8B5CF6] transition"
              >
                {!flipped ? (
                  <>
                    <span className="text-xs font-black uppercase tracking-wider text-[#8B5CF6] mb-3">
                      Nghĩa tiếng Việt — Thử nói bằng tiếng Anh
                    </span>
                    <p className="text-2xl font-black text-slate-900">
                      {currentCard.vietnameseMeaning}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
                      <RotateCw className="h-3.5 w-3.5" />
                      Chạm vào thẻ để lật đáp án bản xứ
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 mb-3">
                      Cách người bản xứ nói
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">
                      {currentCard.englishPhrase}
                    </p>
                    {currentCard.phonetic && (
                      <p className="mt-1.5 text-sm font-extrabold text-[#1899D6]">
                        /{currentCard.phonetic}/
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(currentCard.englishPhrase, 0.85);
                        }}
                        className="btn-duo btn-duo-blue px-4 py-2.5 text-xs"
                      >
                        <Volume2 className="h-4 w-4" />
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
                        className="btn-duo btn-duo-green px-4 py-2.5 text-xs"
                      >
                        <Mic className="h-4 w-4" />
                        Đọc thử &amp; Chấm điểm
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setFlipped(false);
                    setCardIndex((i) => (i === 0 ? phrases.length - 1 : i - 1));
                  }}
                  className="btn-duo btn-duo-white flex-1 py-3 text-xs uppercase"
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
                  className="btn-duo btn-duo-green flex-1 py-3 text-xs uppercase"
                >
                  Đã thuộc ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setFlipped(false);
                    setCardIndex((i) => (i + 1) % phrases.length);
                  }}
                  className="btn-duo btn-duo-white flex-1 py-3 text-xs uppercase"
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
                onClick={() => {
                  playTapSound();
                  setStarterFilter(
                    cat.id as 'all' | 'daily' | 'business' | 'travel'
                  );
                }}
                className={`rounded-xl border-2 px-3.5 py-1.5 text-xs font-extrabold cursor-pointer transition ${
                  starterFilter === cat.id
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredStarter.map((item) => {
              const alreadySaved = savedSet.has(item.english.toLowerCase());
              return (
                <div
                  key={item.id}
                  className="card-duo-elevated p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-black text-slate-900">
                        {item.english}
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakText(item.english, 0.85)}
                        className="shrink-0 rounded-xl border-2 border-sky-200 bg-[#DDF4FF] p-2 text-[#1899D6] hover:bg-sky-100 cursor-pointer"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs font-bold text-[#1899D6] mt-0.5">
                      /{item.phonetic}/
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700">
                      {item.vietnamese}
                    </p>
                    <p className="mt-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 italic">
                      Ví dụ: “{item.example}”
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t-2 border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => speakText(item.example, 0.85)}
                        className="text-xs font-extrabold text-[#1899D6] hover:underline cursor-pointer"
                      >
                        Nghe ví dụ
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
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-[#F1FDE8] px-2.5 py-1 text-xs font-extrabold text-[#3B8702] hover:bg-emerald-100 cursor-pointer"
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
                        alreadySaved ? 'btn-duo-white' : 'btn-duo-purple'
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

      <PronunciationPracticeModal
        target={practiceTarget}
        persona={activePersona}
        profile={profile}
        onClose={() => setPracticeTarget(null)}
      />
    </AppShell>
  );
}
