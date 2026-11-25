'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  Loader2,
  Plus,
  Volume2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NovaCompanion, TutorAvatar } from '@/components/BrandArt';
import { WorkspacePageSkeleton } from '@/components/PageSkeleton';
import { playNaturalVoice, stopVoicePlayback } from '@/lib/audio';
import { getCurrentProfile, saveProfile } from '@/lib/data-store';
import { PLACEMENT_RESULT_STORAGE_KEY } from '@/lib/placement-test';
import {
  AI_PERSONAS,
  HOBBY_SUGGESTIONS,
  JOB_SUGGESTIONS,
} from '@/lib/scenarios';
import { playCorrectSound, playTapSound } from '@/lib/sound-fx';
import type {
  AccentPreference,
  EnglishLevel,
  NativeLanguage,
  StorageBackendMode,
  UserProfile,
} from '@/types';

const NATIVE_LANGUAGES: {
  value: NativeLanguage;
  label: string;
  code: string;
  sub: string;
}[] = [
  { value: 'vi', label: 'Tiếng Việt', code: 'VI', sub: 'Phụ đề & giải thích bằng tiếng Việt' },
  { value: 'en', label: 'English', code: 'EN', sub: '100% English immersion coaching' },
  { value: 'ja', label: '日本語', code: 'JA', sub: 'Japanese-friendly notes' },
  { value: 'ko', label: '한국어', code: 'KO', sub: 'Korean-friendly notes' },
  { value: 'zh', label: '中文', code: 'ZH', sub: 'Chinese-friendly notes' },
];

const TARGET_ACCENTS: {
  value: AccentPreference;
  label: string;
  code: string;
  desc: string;
  personaId: string;
  sampleEn: string;
}[] = [
  {
    value: 'US',
    label: 'Tiếng Anh Mỹ (US)',
    code: 'US',
    desc: 'Tự nhiên, phổ biến toàn cầu',
    personaId: 'emma-us',
    sampleEn: "Hey there! Let's practice natural everyday American English together.",
  },
  {
    value: 'UK',
    label: 'Tiếng Anh Anh (UK)',
    code: 'UK',
    desc: 'Lịch sự, chuẩn British',
    personaId: 'sonia-uk',
    sampleEn: "Hello! Lovely to meet you — let's have a chat in British English.",
  },
  {
    value: 'AU',
    label: 'Tiếng Anh Úc (AU)',
    code: 'AU',
    desc: 'Cởi mở, gần gũi thực tế',
    personaId: 'natasha-au',
    sampleEn: "G'day! No worries at all, we'll take it step by step today.",
  },
  {
    value: 'CA',
    label: 'Tiếng Anh Canada (CA)',
    code: 'CA',
    desc: 'Êm ái, dễ nghe cho người mới',
    personaId: 'clara-ca',
    sampleEn: "Hi there! Let's build your speaking confidence at a comfortable pace.",
  },
  {
    value: 'MIXED',
    label: 'Đa dạng giọng đọc',
    code: 'ALL',
    desc: 'Luân phiên 6 người hướng dẫn',
    personaId: 'andrew-us',
    sampleEn: "Awesome! Practicing with multiple accents makes your listening super sharp.",
  },
];

const LEVELS: { value: EnglishLevel; title: string; badge: string; desc: string }[] = [
  {
    value: 'A0-A1',
    title: 'Mới bắt đầu',
    badge: 'A0–A1',
    desc: 'Tốc độ 0.85x, phụ đề song ngữ và gợi ý câu trả lời kèm phiên âm.',
  },
  {
    value: 'A2-B1',
    title: 'Cơ bản – Trung cấp',
    badge: 'A2–B1',
    desc: 'Tốc độ tự nhiên hơn, tập trung sửa cách diễn đạt giống người bản xứ.',
  },
  {
    value: 'B2+',
    title: 'Khá – Giỏi',
    badge: 'B2+',
    desc: 'Tốc độ 1.0x, nhiều cụm từ tự nhiên, phản xạ như đồng nghiệp quốc tế.',
  },
];

const STEP_HEADINGS: Record<1 | 2 | 3, { title: string; sub: string }> = {
  1: {
    title: 'Thiết lập ngôn ngữ & giọng đọc ưu tiên',
    sub: 'Chọn giọng bản xứ và trình độ hiện tại để giáo trình điều chỉnh tốc độ nói phù hợp.',
  },
  2: {
    title: 'Chủ đề quan tâm & lĩnh vực công việc',
    sub: 'Giúp biên soạn tình huống hội thoại và câu hỏi phản xạ sát với thực tế của bạn.',
  },
  3: {
    title: 'Tên hiển thị & mục tiêu mỗi ngày',
    sub: 'Mọi thiết lập và tiến trình sẽ tự động lưu trữ an toàn trên Google Drive.',
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storageMode, setStorageMode] = useState<StorageBackendMode>('local');

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage>('vi');
  const [preferredAccent, setPreferredAccent] = useState<AccentPreference>('US');
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>('A0-A1');
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [customHobby, setCustomHobby] = useState('');
  const [jobField, setJobField] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [preferredSpeed, setPreferredSpeed] = useState<number>(0.85);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(15);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await getCurrentProfile();
      if (!active) return;
      if (!res.authenticated || !res.profile) {
        router.replace('/auth?next=/onboarding');
        return;
      }
      const p: UserProfile = res.profile;
      setStorageMode(res.storageMode);
      setNativeLanguage(p.nativeLanguage || 'vi');
      setPreferredAccent(p.preferredAccent || 'US');
      let initLevel: EnglishLevel = p.englishLevel || 'A0-A1';
      let initSpeed: number = p.preferredSpeed || 0.85;
      if (!p.onboardingCompleted) {
        try {
          const rawPlacement = window.localStorage.getItem(
            PLACEMENT_RESULT_STORAGE_KEY
          );
          if (rawPlacement) {
            const parsed = JSON.parse(rawPlacement) as {
              recommendedLevel?: EnglishLevel;
              recommendedSpeed?: number;
            };
            if (
              parsed.recommendedLevel === 'A0-A1' ||
              parsed.recommendedLevel === 'A2-B1' ||
              parsed.recommendedLevel === 'B2+'
            ) {
              initLevel = parsed.recommendedLevel;
            }
            if (typeof parsed.recommendedSpeed === 'number') {
              initSpeed = parsed.recommendedSpeed;
            }
          }
        } catch {
          // ignore invalid cached placement
        }
      }
      setEnglishLevel(initLevel);
      setHobbies(p.hobbies || []);
      setJobField(p.jobField || '');
      setDisplayName(p.displayName || '');
      setPreferredSpeed(initSpeed);
      setDailyGoalMinutes(p.dailyGoalMinutes || 15);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
      stopVoicePlayback();
    };
  }, [router]);

  function previewAccentVoice(personaId: string, sampleEn: string) {
    const persona =
      AI_PERSONAS.find((p) => p.id === personaId) ?? AI_PERSONAS[0];
    void playNaturalVoice({
      text: sampleEn,
      voice: persona.edgeVoice,
      browserLang: persona.browserLang,
      speed: 0.9,
    });
  }

  function toggleHobby(hobby: string) {
    playTapSound();
    setHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  }

  function addCustomHobby() {
    const clean = customHobby.trim();
    if (!clean) return;
    playTapSound();
    if (!hobbies.includes(clean)) {
      setHobbies((prev) => [...prev, clean]);
    }
    setCustomHobby('');
  }

  async function handleFinish() {
    setError(null);
    if (!displayName.trim()) {
      setError('Vui lòng nhập tên bạn muốn hiển thị trong các buổi hội thoại.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        displayName: displayName.trim(),
        nativeLanguage,
        preferredAccent,
        englishLevel,
        hobbies,
        jobField: jobField.trim(),
        preferredSpeed,
        dailyGoalMinutes,
        onboardingCompleted: true,
      });
      playCorrectSound();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu hồ sơ lúc này, vui lòng thử lại.'
      );
      setSaving(false);
    }
  }

  if (loading) {
    return <WorkspacePageSkeleton title="Thiết lập lộ trình cá nhân" />;
  }

  const isDrive =
    storageMode === 'google-drive-owner' || storageMode === 'google-drive-user';
  const progressPct = step === 1 ? 34 : step === 2 ? 68 : 100;

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col text-gray-900">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="mx-auto max-w-2xl px-4 h-16 flex items-center gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setStep((s) => (s === 3 ? 2 : 1));
              }}
              aria-label="Bước trước"
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <NovaCompanion className="h-7 w-7" />
              <span className="font-display text-base font-bold text-gray-900">
                SpeakMate
              </span>
            </div>
          )}

          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#E5483F] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <span className="text-xs font-semibold text-gray-500 tabular-nums shrink-0">
            Bước {step}/3
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-10 space-y-6">
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            {STEP_HEADINGS[step].title}
          </h1>
          <p className="text-sm text-gray-500">{STEP_HEADINGS[step].sub}</p>
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2.5">
                Ngôn ngữ giải thích
              </label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {NATIVE_LANGUAGES.map((lang) => {
                  const selected = nativeLanguage === lang.value;
                  return (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setNativeLanguage(lang.value);
                      }}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                        selected
                          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="font-mono text-xs font-bold rounded-lg bg-gray-100 px-2 py-1 text-gray-700">
                        {lang.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900">
                          {lang.label}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {lang.sub}
                        </div>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2.5">
                Giọng tiếng Anh bản xứ ưu tiên
              </label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {TARGET_ACCENTS.map((acc) => {
                  const selected = preferredAccent === acc.value;
                  return (
                    <div
                      key={acc.value}
                      onClick={() => {
                        playTapSound();
                        setPreferredAccent(acc.value);
                      }}
                      className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                        selected
                          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <TutorAvatar
                        personaId={acc.personaId}
                        className="h-10 w-10 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-gray-900">
                          {acc.label}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {acc.desc}
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Nghe thử giọng"
                        aria-label={`Nghe thử ${acc.label}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreferredAccent(acc.value);
                          previewAccentVoice(acc.personaId, acc.sampleEn);
                        }}
                        className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 hover:border-gray-300 hover:text-[#E5483F] shrink-0 cursor-pointer"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                      {selected && (
                        <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
                <label className="block text-xs font-bold text-gray-700">
                  Trình độ tiếng Anh hiện tại
                </label>
                <Link
                  href="/placement"
                  className="text-xs font-semibold text-[#E5483F] hover:underline"
                >
                  Chưa chắc trình độ? Kiểm tra CEFR 2 phút →
                </Link>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {LEVELS.map((lvl) => {
                  const selected = englishLevel === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setEnglishLevel(lvl.value);
                        setPreferredSpeed(
                          lvl.value === 'A0-A1'
                            ? 0.85
                            : lvl.value === 'A2-B1'
                              ? 0.95
                              : 1.0
                        );
                      }}
                      className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                        selected
                          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="font-mono inline-block rounded-md bg-gray-900 px-2 py-0.5 text-[10px] font-bold text-white mb-1.5">
                        {lvl.badge}
                      </span>
                      <div className="text-xs font-bold text-gray-900">
                        {lvl.title}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        {lvl.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playTapSound();
                setStep(2);
              }}
              className="btn-duo btn-duo-coral w-full py-3.5 text-sm"
            >
              Tiếp tục
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2.5">
                Chủ đề quan tâm (có thể chọn nhiều mục)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {HOBBY_SUGGESTIONS.map((hobby) => {
                  const selected = hobbies.includes(hobby);
                  return (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                        selected
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="truncate">{hobby}</span>
                      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {hobbies.filter((h) => !HOBBY_SUGGESTIONS.includes(h)).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {hobbies
                    .filter((h) => !HOBBY_SUGGESTIONS.includes(h))
                    .map((custom) => (
                      <span
                        key={custom}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white"
                      >
                        {custom}
                        <button
                          type="button"
                          onClick={() => toggleHobby(custom)}
                          className="hover:opacity-75 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customHobby}
                  onChange={(e) => setCustomHobby(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomHobby();
                    }
                  }}
                  placeholder="Thêm chủ đề khác (ví dụ: Kiến trúc, Chạy bộ...)"
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomHobby}
                  className="btn-duo btn-duo-white px-4 py-2 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Thêm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Công việc / Ngành học (tùy chọn)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {JOB_SUGGESTIONS.map((job) => {
                  const active = jobField === job;
                  return (
                    <button
                      key={job}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setJobField(active ? '' : job);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                        active
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {job}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={jobField}
                onChange={(e) => setJobField(e.target.value)}
                placeholder="Hoặc nhập lĩnh vực công việc của bạn..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                playTapSound();
                setStep(3);
              }}
              className="btn-duo btn-duo-coral w-full py-3.5 text-sm"
            >
              Tiếp tục
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-6 sm:p-7 shadow-xs space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Tên gọi của bạn <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Huy, Minh, Thảo..."
                maxLength={40}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-base font-semibold text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 tabular-nums">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Tốc độ giọng đọc
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 0.75, label: '0.75x Chậm' },
                    { val: 0.85, label: '0.85x Vừa' },
                    { val: 1.0, label: '1.0x Chuẩn' },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setPreferredSpeed(s.val);
                      }}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition cursor-pointer ${
                        Math.abs(preferredSpeed - s.val) < 0.04
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Mục tiêu mỗi ngày
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setDailyGoalMinutes(m);
                      }}
                      className={`rounded-xl border py-2.5 text-xs font-semibold transition cursor-pointer ${
                        dailyGoalMinutes === m
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {m}p
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-4 text-xs space-y-1.5">
              <div className="font-bold text-gray-900">
                Tóm tắt thiết lập cho {displayName.trim() || 'bạn'}
              </div>
              <div className="text-gray-600">
                Ngôn ngữ:{' '}
                <strong className="text-gray-900">
                  {NATIVE_LANGUAGES.find((l) => l.value === nativeLanguage)?.label}
                </strong>{' '}
                · Giọng ưu tiên: <strong className="text-gray-900">{preferredAccent}</strong> · Trình độ:{' '}
                <strong className="text-gray-900">{englishLevel}</strong>
              </div>
              <div className="text-gray-600">
                Chủ đề:{' '}
                <strong className="text-gray-900">
                  {hobbies.length > 0 ? hobbies.join(', ') : 'Giao tiếp hàng ngày'}
                </strong>
              </div>
              <div className="text-emerald-700 font-semibold pt-1 flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" />
                {isDrive
                  ? 'Tự động đồng bộ trên Google Drive.'
                  : 'Sẵn sàng lưu hồ sơ học tập.'}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleFinish()}
              className="btn-duo btn-duo-coral w-full py-3.5 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu thiết lập...
                </>
              ) : (
                <>
                  Hoàn tất &amp; Bắt đầu học
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
