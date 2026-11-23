'use client';

import { Check, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { JOB_SUGGESTIONS, HOBBY_SUGGESTIONS } from '@/lib/scenarios';
import type {
  AccentPreference,
  EnglishLevel,
  NativeLanguage,
  UserProfile,
} from '@/types';

interface ProfileFormProps {
  initialProfile: UserProfile;
  mode: 'onboarding' | 'settings';
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
}

const LEVELS: { value: EnglishLevel; title: string; desc: string }[] = [
  {
    value: 'A0-A1',
    title: 'A0–A1 (Mất gốc / Mới bắt đầu)',
    desc: 'Nói chậm rãi, có phụ đề song ngữ Anh–Việt và 3 gợi ý câu trả lời sẵn.',
  },
  {
    value: 'A2-B1',
    title: 'A2–B1 (Cơ bản / Trung cấp)',
    desc: 'Tốc độ vừa phải, tập trung sửa cách diễn đạt cho tự nhiên hơn.',
  },
  {
    value: 'B2+',
    title: 'B2+ (Khá – Giỏi)',
    desc: 'Nói tự nhiên như người bản xứ, dùng nhiều idioms, slang & phản xạ nhanh.',
  },
];

const ACCENTS: { value: AccentPreference; label: string; flag: string }[] = [
  { value: 'US', label: 'Mỹ (American)', flag: '🇺🇸' },
  { value: 'UK', label: 'Anh - Anh (British)', flag: '🇬🇧' },
  { value: 'AU', label: 'Úc (Australian)', flag: '🇦🇺' },
  { value: 'CA', label: 'Canada', flag: '🇨🇦' },
  { value: 'MIXED', label: 'Đa dạng Accent', flag: '🌍' },
];

export function ProfileForm({ initialProfile, mode, onSave }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [nativeLanguage, setNativeLanguage] = useState<NativeLanguage>(
    initialProfile.nativeLanguage || 'vi'
  );
  const [englishLevel, setEnglishLevel] = useState<EnglishLevel>(
    initialProfile.englishLevel
  );
  const [jobField, setJobField] = useState(initialProfile.jobField);
  const [hobbies, setHobbies] = useState<string[]>(initialProfile.hobbies);
  const [customHobby, setCustomHobby] = useState('');
  const [preferredAccent, setPreferredAccent] = useState<AccentPreference>(
    initialProfile.preferredAccent
  );
  const [preferredSpeed, setPreferredSpeed] = useState<number>(
    initialProfile.preferredSpeed
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(
    initialProfile.dailyGoalMinutes
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedNotice(false);

    if (!displayName.trim()) {
      setError('Hãy nhập tên bạn muốn AI gọi nhé (ví dụ: Minh, Nam, Alex...).');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        nativeLanguage,
        englishLevel,
        jobField: jobField.trim(),
        hobbies,
        preferredAccent,
        preferredSpeed,
        dailyGoalMinutes,
        onboardingCompleted: true,
      });
      setSavedNotice(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể lưu hồ sơ, vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
          Bạn muốn AI gọi bạn bằng tên gì? <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-slate-500 mb-2">
          AI sẽ chào và trò chuyện thân mật với bạn bằng tên này trong mỗi cuộc gọi.
        </p>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ví dụ: Minh, Thảo, Alex..."
          maxLength={40}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Native Language */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Ngôn ngữ mẹ đẻ / giải thích
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { val: 'vi', label: '🇻🇳 Tiếng Việt' },
              { val: 'en', label: '🇺🇸 English' },
              { val: 'ja', label: '🇯🇵 日本語' },
              { val: 'ko', label: '🇰🇷 한국어' },
              { val: 'zh', label: '🇨🇳 中文' },
            ] as const
          ).map((lang) => (
            <button
              key={lang.val}
              type="button"
              onClick={() => setNativeLanguage(lang.val)}
              className={`rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${nativeLanguage === lang.val
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* English Level */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-2">
          Trình độ tiếng Anh hiện tại của bạn
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((lvl) => {
            const selected = englishLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => {
                  setEnglishLevel(lvl.value);
                  if (mode === 'onboarding') {
                    setPreferredSpeed(
                      lvl.value === 'A0-A1'
                        ? 0.85
                        : lvl.value === 'A2-B1'
                          ? 0.95
                          : 1.0
                    );
                  }
                }}
                className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${selected
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900">
                    {lvl.title}
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-indigo-600" />
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  {lvl.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Job / Field */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
          Công việc / Lĩnh vực của bạn là gì?
        </label>
        <p className="text-xs text-slate-500 mb-2.5">
          Giúp AI thiết kế tình huống giao tiếp công sở (Business English) và giới thiệu bản thân sát nghề của bạn.
        </p>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {JOB_SUGGESTIONS.map((job) => {
            const active = jobField === job;
            return (
              <button
                key={job}
                type="button"
                onClick={() => setJobField(active ? '' : job)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${active
                    ? 'bg-indigo-600 text-white'
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
          placeholder="Hoặc tự nhập nghề nghiệp của bạn (vd: Chủ shop online, Kỹ sư xây dựng...)"
          maxLength={80}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Hobbies */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
          Sở thích & Chủ đề bạn hay nói chuyện
        </label>
        <p className="text-xs text-slate-500 mb-2.5">
          Chọn nhiều mục để AI gợi ý câu chuyện Small talk đúng gu của bạn.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {HOBBY_SUGGESTIONS.map((hobby) => {
            const selected = hobbies.includes(hobby);
            return (
              <button
                key={hobby}
                type="button"
                onClick={() => toggleHobby(hobby)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition cursor-pointer ${selected
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                {selected && <Check className="h-3 w-3" />}
                {hobby}
              </button>
            );
          })}
          {hobbies
            .filter((h) => !HOBBY_SUGGESTIONS.includes(h))
            .map((custom) => (
              <span
                key={custom}
                className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                {custom}
                <button
                  type="button"
                  onClick={() => toggleHobby(custom)}
                  className="hover:text-cyan-100 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
        </div>

        <div className="flex gap-2">
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
            placeholder="Thêm sở thích khác (vd: Nuôi mèo, Chạy bộ...)"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomHobby}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </div>
      </div>

      {/* Accent, Speed & Daily Goal */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">
            Giọng (Accent) mặc định muốn nghe
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ACCENTS.map((acc) => {
              const selected = preferredAccent === acc.value;
              return (
                <button
                  key={acc.value}
                  type="button"
                  onClick={() => setPreferredAccent(acc.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${selected
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span>{acc.flag}</span>
                  <span className="truncate">{acc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Tốc độ nói mặc định của AI
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0.75, label: '0.75x Chậm' },
                { val: 0.85, label: '0.85x Vừa' },
                { val: 1.0, label: '1.0x Bản xứ' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setPreferredSpeed(s.val)}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${Math.abs(preferredSpeed - s.val) < 0.04
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-2">
              Mục tiêu luyện mỗi ngày
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDailyGoalMinutes(mins)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition cursor-pointer ${dailyGoalMinutes === mins
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {mins} phút
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {savedNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Đã lưu hồ sơ học tập của bạn và đồng bộ thành công!
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-60 transition cursor-pointer"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang lưu hồ sơ...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {mode === 'onboarding'
              ? 'Hoàn tất & Bắt đầu nói tiếng Anh'
              : 'Lưu thay đổi hồ sơ'}
          </>
        )}
      </button>
    </form>
  );
}
