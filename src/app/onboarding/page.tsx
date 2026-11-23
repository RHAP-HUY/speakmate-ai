'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  Globe2,
  Heart,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentProfile, saveProfile } from '@/lib/data-store';
import { HOBBY_SUGGESTIONS, JOB_SUGGESTIONS } from '@/lib/scenarios';
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
  flag: string;
  sub: string;
}[] = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', sub: 'Phụ đề & mẹo giải thích bằng tiếng Việt' },
  { value: 'en', label: 'English', flag: '🇺🇸', sub: '100% English immersion coaching' },
  { value: 'ja', label: '日本語', flag: '🇯🇵', sub: 'Japanese-friendly notes' },
  { value: 'ko', label: '한국어', flag: '🇰🇷', sub: 'Korean-friendly notes' },
  { value: 'zh', label: '中文', flag: '🇨🇳', sub: 'Chinese-friendly notes' },
];

const TARGET_ACCENTS: {
  value: AccentPreference;
  label: string;
  flag: string;
  desc: string;
}[] = [
  { value: 'US', label: 'Tiếng Anh Mỹ (US)', flag: '🇺🇸', desc: 'Tự nhiên, phổ biến toàn cầu' },
  { value: 'UK', label: 'Tiếng Anh Anh (UK)', flag: '🇬🇧', desc: 'Lịch sự, chuẩn giọng British' },
  { value: 'AU', label: 'Tiếng Anh Úc (AU)', flag: '🇦🇺', desc: 'Cởi mở, gần gũi thực tế' },
  { value: 'CA', label: 'Tiếng Anh Canada (CA)', flag: '🇨🇦', desc: 'Êm ái, dễ nghe cho người mới' },
  { value: 'MIXED', label: 'Đa dạng Accent', flag: '🌍', desc: 'Luyện phản xạ nhiều giọng' },
];

const LEVELS: { value: EnglishLevel; title: string; badge: string; desc: string }[] = [
  {
    value: 'A0-A1',
    title: 'Mất gốc / Mới bắt đầu',
    badge: 'A0–A1',
    desc: 'Nói chậm 0.85x, phụ đề song ngữ và 3 gợi ý câu trả lời kèm phiên âm.',
  },
  {
    value: 'A2-B1',
    title: 'Cơ bản / Trung cấp',
    badge: 'A2–B1',
    desc: 'Tốc độ tự nhiên hơn, tập trung sửa cách diễn đạt giống bản xứ.',
  },
  {
    value: 'B2+',
    title: 'Khá – Giỏi',
    badge: 'B2+',
    desc: 'Tốc độ 1.0x, nhiều idioms, phản xạ tự do như đồng nghiệp nước ngoài.',
  },
];

const HOBBY_EMOJI: Record<string, string> = {
  'Du lịch': '✈️',
  'Công nghệ & AI': '🤖',
  'Phim ảnh': '🎬',
  'Âm nhạc': '🎵',
  'Cà phê & Ẩm thực': '☕',
  'Thể thao & Gym': '🏋️',
  'Chơi game': '🎮',
  'Đọc sách': '📚',
  'Kinh doanh': '💼',
  'Chụp ảnh / Video': '🎥',
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
      setEnglishLevel(p.englishLevel || 'A0-A1');
      setHobbies(p.hobbies || []);
      setJobField(p.jobField || '');
      setDisplayName(p.displayName || '');
      setPreferredSpeed(p.preferredSpeed || 0.85);
      setDailyGoalMinutes(p.dailyGoalMinutes || 15);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  function toggleHobby(hobby: string) {
    setHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  }

  function addCustomHobby() {
    const clean = customHobby.trim();
    if (!clean) return;
    if (!hobbies.includes(clean)) {
      setHobbies((prev) => [...prev, clean]);
    }
    setCustomHobby('');
  }

  async function handleFinish() {
    setError(null);
    if (!displayName.trim()) {
      setError('Hãy nhập tên bạn muốn AI gọi bạn nhé (ví dụ: Huy, Minh, Alex...)');
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-light">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isDrive =
    storageMode === 'google-drive-owner' || storageMode === 'google-drive-user';

  return (
    <div className="min-h-screen bg-mesh-light py-6 sm:py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Top Brand + 3-Step Indicator */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200/80 px-4 py-2 shadow-xs">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              SpeakMate AI
            </span>
            {isDrive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                <Cloud className="h-3 w-3" />
                Google Drive
              </span>
            )}
          </div>

          {/* Stepper Bar */}
          <div className="mx-auto max-w-md flex items-center justify-between gap-2">
            {[
              { id: 1 as const, label: '1. Ngôn ngữ', icon: Globe2 },
              { id: 2 as const, label: '2. Sở thích', icon: Heart },
              { id: 3 as const, label: '3. Mục tiêu', icon: UserCheck },
            ].map((s) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-2xl border py-2 px-2 text-xs font-extrabold transition cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Wizard Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-slate-200/60 space-y-6">
          {/* STEP 1: LANGUAGE, ACCENT & LEVEL */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Bước 1: Chọn Ngôn ngữ & Giọng tiếng Anh
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Tùy chỉnh ngôn ngữ giải thích và giọng bản xứ bạn muốn luyện phản xạ hàng ngày.
                </p>
              </div>

              {/* Native / Coaching Language */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                  Ngôn ngữ mẹ đẻ / giải thích
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {NATIVE_LANGUAGES.map((lang) => {
                    const selected = nativeLanguage === lang.value;
                    return (
                      <button
                        key={lang.value}
                        type="button"
                        onClick={() => setNativeLanguage(lang.value)}
                        className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition cursor-pointer ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-2xl">{lang.flag}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900">
                            {lang.label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {lang.sub}
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target English Accent */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                  Giọng tiếng Anh bản xứ ưu tiên
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TARGET_ACCENTS.map((acc) => {
                    const selected = preferredAccent === acc.value;
                    return (
                      <button
                        key={acc.value}
                        type="button"
                        onClick={() => setPreferredAccent(acc.value)}
                        className={`flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left transition cursor-pointer ${
                          selected
                            ? 'border-cyan-600 bg-cyan-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xl">{acc.flag}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-extrabold text-slate-900">
                            {acc.label}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {acc.desc}
                          </div>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 text-cyan-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current English Level */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                  Trình độ tiếng Anh hiện tại
                </label>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {LEVELS.map((lvl) => {
                    const selected = englishLevel === lvl.value;
                    return (
                      <button
                        key={lvl.value}
                        type="button"
                        onClick={() => {
                          setEnglishLevel(lvl.value);
                          setPreferredSpeed(
                            lvl.value === 'A0-A1'
                              ? 0.85
                              : lvl.value === 'A2-B1'
                                ? 0.95
                                : 1.0
                          );
                        }}
                        className={`rounded-2xl border-2 p-3.5 text-left transition cursor-pointer ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="inline-block rounded-lg bg-indigo-600 px-2 py-0.5 text-[10px] font-extrabold text-white mb-1.5">
                          {lvl.badge}
                        </span>
                        <div className="text-xs font-extrabold text-slate-900">
                          {lvl.title}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {lvl.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-cyan-700 transition cursor-pointer"
              >
                Tiếp theo: Chọn Sở thích
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* STEP 2: HOBBIES & JOB FIELD */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Bước 2: Chọn Sở thích & Chủ đề yêu thích
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  AI sẽ dựa vào sở thích & nghề nghiệp của bạn để trò chuyện và tạo tình huống đúng gu, học không bao giờ chán!
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                  Sở thích của bạn (chọn bao nhiêu cũng được)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {HOBBY_SUGGESTIONS.map((hobby) => {
                    const selected = hobbies.includes(hobby);
                    return (
                      <button
                        key={hobby}
                        type="button"
                        onClick={() => toggleHobby(hobby)}
                        className={`flex items-center gap-2 rounded-2xl border-2 px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                          selected
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-base">
                          {HOBBY_EMOJI[hobby] || '✨'}
                        </span>
                        <span className="truncate flex-1 text-left">
                          {hobby}
                        </span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom hobbies */}
                {hobbies.filter((h) => !HOBBY_SUGGESTIONS.includes(h)).length >
                  0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hobbies
                      .filter((h) => !HOBBY_SUGGESTIONS.includes(h))
                      .map((custom) => (
                        <span
                          key={custom}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white"
                        >
                          ✨ {custom}
                          <button
                            type="button"
                            onClick={() => toggleHobby(custom)}
                            className="hover:text-indigo-200 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
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
                    placeholder="Thêm sở thích riêng (vd: Nuôi mèo, Bóng đá, Nhiếp ảnh...)"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addCustomHobby}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm
                  </button>
                </div>
              </div>

              {/* Job / Field */}
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Công việc / Chuyên ngành (tùy chọn)
                </label>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {JOB_SUGGESTIONS.map((job) => {
                    const active = jobField === job;
                    return (
                      <button
                        key={job}
                        type="button"
                        onClick={() => setJobField(active ? '' : job)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                  placeholder="Hoặc nhập nghề nghiệp / ngành học của bạn..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-cyan-700 transition cursor-pointer"
                >
                  Tiếp theo: Tên gọi & Mục tiêu
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DISPLAY NAME, SPEED & GOAL */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Bước 3: Hoàn tất hồ sơ học tập
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Đặt tên AI sẽ gọi bạn và mục tiêu mỗi ngày — mọi thiết lập sẽ được đồng bộ tự động!
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Bạn muốn AI gọi bạn bằng tên gì? <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Huy, Minh, Alex..."
                  maxLength={40}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                    Tốc độ AI nói
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
                        onClick={() => setPreferredSpeed(s.val)}
                        className={`rounded-xl border-2 py-2.5 text-xs font-bold transition cursor-pointer ${
                          Math.abs(preferredSpeed - s.val) < 0.04
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                    Mục tiêu mỗi ngày
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 15, 20, 30].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDailyGoalMinutes(m)}
                        className={`rounded-xl border-2 py-2.5 text-xs font-bold transition cursor-pointer ${
                          dailyGoalMinutes === m
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        {m}p
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Preview */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-cyan-50/50 p-4 text-xs space-y-1.5">
                <div className="font-extrabold text-indigo-900">
                  ✨ Tóm tắt hồ sơ của {displayName.trim() || 'bạn'}:
                </div>
                <div className="text-slate-700">
                  • Ngôn ngữ: <strong>{NATIVE_LANGUAGES.find((l) => l.value === nativeLanguage)?.label}</strong> · Giọng luyện: <strong>{preferredAccent}</strong> · Trình độ: <strong>{englishLevel}</strong>
                </div>
                <div className="text-slate-700">
                  • Sở thích:{' '}
                  <strong>
                    {hobbies.length > 0 ? hobbies.join(', ') : 'Giao tiếp đời sống'}
                  </strong>
                </div>
                <div className="text-emerald-700 font-semibold pt-1 flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5" />
                  {isDrive
                    ? 'Hồ sơ và toàn bộ dữ liệu học sẽ tự động lưu lên Google Drive 5TB của bạn!'
                    : 'Hồ sơ sẽ đồng bộ trên thiết bị này (có thể nối Google Drive bất cứ lúc nào trong Cài đặt).'}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleFinish()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 disabled:opacity-60 transition cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu hồ sơ & đồng bộ...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Hoàn tất & Bắt đầu học ngay!
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
