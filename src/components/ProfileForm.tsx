'use client';

import { Check, Loader2, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { HOBBY_SUGGESTIONS, JOB_SUGGESTIONS } from '@/lib/scenarios';
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
    title: 'A0–A1 · Mới bắt đầu',
    desc: 'Tốc độ chậm 0.85x, có phụ đề song ngữ Anh–Việt và 3 câu gợi ý sẵn.',
  },
  {
    value: 'A2-B1',
    title: 'A2–B1 · Cơ bản – Trung cấp',
    desc: 'Tốc độ vừa phải, tập trung sửa cách diễn đạt cho tự nhiên hơn.',
  },
  {
    value: 'B2+',
    title: 'B2+ · Khá – Giỏi',
    desc: 'Tốc độ bản xứ 1.0x, nhiều cụm từ tự nhiên và phản xạ linh hoạt.',
  },
];

const ACCENTS: { value: AccentPreference; label: string; code: string }[] = [
  { value: 'US', label: 'Mỹ (American)', code: 'US' },
  { value: 'UK', label: 'Anh (British)', code: 'UK' },
  { value: 'AU', label: 'Úc (Australian)', code: 'AU' },
  { value: 'CA', label: 'Canada', code: 'CA' },
  { value: 'MIXED', label: 'Đa dạng giọng', code: 'ALL' },
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
      setError('Vui lòng nhập tên gọi của bạn.');
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          Tên gọi trong buổi hội thoại <span className="text-[#E5483F]">*</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ví dụ: Minh, Thảo, Alex..."
          maxLength={40}
          className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Ngôn ngữ phụ đề &amp; giải thích
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { val: 'vi', code: 'VI', label: 'Tiếng Việt' },
              { val: 'en', code: 'EN', label: 'English' },
              { val: 'ja', code: 'JA', label: '日本語' },
              { val: 'ko', code: 'KO', label: '한국어' },
              { val: 'zh', code: 'ZH', label: '中文' },
            ] as const
          ).map((lang) => (
            <button
              key={lang.val}
              type="button"
              onClick={() => setNativeLanguage(lang.val)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                nativeLanguage === lang.val
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              <span className="font-mono text-[10px] opacity-75">{lang.code}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Trình độ tiếng Anh hiện tại
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
                className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                  selected
                    ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900">
                    {lvl.title}
                  </span>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  )}
                </div>
                <p className="text-xs leading-relaxed text-gray-500">
                  {lvl.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          Công việc / Lĩnh vực chuyên môn
        </label>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {JOB_SUGGESTIONS.map((job) => {
            const active = jobField === job;
            return (
              <button
                key={job}
                type="button"
                onClick={() => setJobField(active ? '' : job)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
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
          maxLength={80}
          className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1.5">
          Sở thích &amp; Chủ đề thường trò chuyện
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {HOBBY_SUGGESTIONS.map((hobby) => {
            const selected = hobbies.includes(hobby);
            return (
              <button
                key={hobby}
                type="button"
                onClick={() => toggleHobby(hobby)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                  selected
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
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
                className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white"
              >
                {custom}
                <button
                  type="button"
                  onClick={() => toggleHobby(custom)}
                  className="hover:opacity-75 cursor-pointer"
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
            placeholder="Thêm sở thích khác..."
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2 text-sm focus:border-gray-900 focus:bg-white focus:outline-none"
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

      <div className="grid gap-5 sm:grid-cols-2 tabular-nums">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Giọng đọc mặc định
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ACCENTS.map((acc) => {
              const selected = preferredAccent === acc.value;
              return (
                <button
                  key={acc.value}
                  type="button"
                  onClick={() => setPreferredAccent(acc.value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${
                      selected ? 'bg-white/15 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {acc.code}
                  </span>
                  <span className="truncate">{acc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Tốc độ giọng đọc
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
                  className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
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
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Mục tiêu luyện tập mỗi ngày
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDailyGoalMinutes(mins)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition cursor-pointer ${
                    dailyGoalMinutes === mins
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600'
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Đã lưu thay đổi hồ sơ học tập của bạn.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="btn-duo btn-duo-primary w-full px-6 py-3 text-sm"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang lưu...
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            {mode === 'onboarding'
              ? 'Hoàn tất thiết lập'
              : 'Lưu thay đổi hồ sơ'}
          </>
        )}
      </button>
    </form>
  );
}
