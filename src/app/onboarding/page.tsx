'use client';

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  Loader2,
  Plus,
  Rocket,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NovaCompanion } from '@/components/BrandArt';
import { getCurrentProfile, saveProfile } from '@/lib/data-store';
import { HOBBY_SUGGESTIONS, JOB_SUGGESTIONS } from '@/lib/scenarios';
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
  flag: string;
  sub: string;
}[] = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', sub: 'Phụ đề & giải thích bằng tiếng Việt' },
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
  { value: 'UK', label: 'Tiếng Anh Anh (UK)', flag: '🇬🇧', desc: 'Lịch sự, chuẩn British' },
  { value: 'AU', label: 'Tiếng Anh Úc (AU)', flag: '🇦🇺', desc: 'Cởi mở, gần gũi thực tế' },
  { value: 'CA', label: 'Tiếng Anh Canada (CA)', flag: '🇨🇦', desc: 'Êm ái, dễ nghe cho người mới' },
  { value: 'MIXED', label: 'Đa dạng Accent', flag: '🌍', desc: 'Luyện phản xạ nhiều giọng' },
];

const LEVELS: { value: EnglishLevel; title: string; badge: string; desc: string }[] = [
  {
    value: 'A0-A1',
    title: 'Mất gốc / Mới bắt đầu',
    badge: 'A0–A1',
    desc: 'Nói chậm 0.85x, phụ đề song ngữ và gợi ý câu trả lời có phiên âm.',
  },
  {
    value: 'A2-B1',
    title: 'Cơ bản / Trung cấp',
    badge: 'A2–B1',
    desc: 'Tốc độ tự nhiên hơn, tập trung sửa cách nói giống người bản xứ.',
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

const MASCOT_PROMPTS: Record<1 | 2 | 3, string> = {
  1: 'Chào bạn mới! Chọn ngôn ngữ & giọng tiếng Anh bạn yêu thích để Nova chuẩn bị lộ trình nhé!',
  2: 'Bạn thích chủ đề nào? Nova sẽ thiết kế game và cuộc gọi đúng sở thích để học không bao giờ chán!',
  3: 'Bước cuối rồi! Đặt tên gọi & mục tiêu mỗi ngày — mọi thứ sẽ lưu trọn đời trên Google Drive 5TB!',
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
        <NovaCompanion mood="excited" className="h-18 w-18 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const isDrive =
    storageMode === 'google-drive-owner' || storageMode === 'google-drive-user';
  const progressPct = step === 1 ? 34 : step === 2 ? 68 : 100;

  return (
    <div className="min-h-screen bg-mesh-light flex flex-col">
      {/* Aurora Studio Top Progress Bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-4">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setStep((s) => (s === 3 ? 2 : 1));
              }}
              aria-label="Bước trước"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 stroke-[2.6]" />
            </button>
          ) : (
            <span className="text-sm font-black bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
              SpeakMate AI
            </span>
          )}

          <div className="flex-1 h-4 rounded-full bg-slate-200/90 overflow-hidden">
            <div
              className="progress-gloss h-full rounded-full bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <span className="text-xs font-black text-indigo-600">
            {step}/3
          </span>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 space-y-6">
        {/* Companion Nova Speech Bubble */}
        <div className="flex items-center gap-4">
          <NovaCompanion
            mood={step === 3 ? 'proud' : 'excited'}
            className="h-20 w-20 shrink-0 animate-gentle-float drop-shadow-[0_10px_18px_rgba(79,70,229,0.22)]"
          />
          <div className="flex-1 rounded-2xl border border-indigo-200/80 bg-white/95 backdrop-blur-md px-4 py-3 text-sm font-extrabold text-slate-800 leading-snug shadow-sm">
            {MASCOT_PROMPTS[step]}
          </div>
        </div>

        {/* STEP 1: LANGUAGE, ACCENT & LEVEL */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
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
                      className={`flex items-center gap-3 rounded-2xl border-2 border-b-4 p-3.5 text-left transition cursor-pointer ${
                        selected
                          ? 'border-[#1CB0F6] bg-[#DDF4FF]/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900">
                          {lang.label}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate">
                          {lang.sub}
                        </div>
                      </div>
                      {selected && (
                        <Check className="h-5 w-5 text-[#1899D6] stroke-[3] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
                Giọng tiếng Anh bản xứ ưu tiên
              </label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {TARGET_ACCENTS.map((acc) => {
                  const selected = preferredAccent === acc.value;
                  return (
                    <button
                      key={acc.value}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setPreferredAccent(acc.value);
                      }}
                      className={`flex items-center gap-2.5 rounded-2xl border-2 border-b-4 p-3 text-left transition cursor-pointer ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50/80'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xl">{acc.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-slate-900">
                          {acc.label}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500 truncate">
                          {acc.desc}
                        </div>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 text-indigo-600 stroke-[3] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
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
                      className={`rounded-2xl border-2 border-b-4 p-3.5 text-left transition cursor-pointer ${
                        selected
                          ? 'border-[#8B5CF6] bg-violet-50/70'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="inline-block rounded-lg bg-[#8B5CF6] px-2 py-0.5 text-[10px] font-black text-white mb-1.5">
                        {lvl.badge}
                      </span>
                      <div className="text-xs font-black text-slate-900">
                        {lvl.title}
                      </div>
                      <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
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
              className="btn-duo btn-duo-primary w-full py-4 text-sm uppercase tracking-wide"
            >
              Tiếp theo: Chọn Sở thích
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        )}

        {/* STEP 2: HOBBIES & JOB */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
                Sở thích của bạn (chọn nhiều chủ đề)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {HOBBY_SUGGESTIONS.map((hobby) => {
                  const selected = hobbies.includes(hobby);
                  return (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      className={`flex items-center gap-2 rounded-2xl border-2 border-b-4 px-3.5 py-3 text-xs font-extrabold transition cursor-pointer ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50/80 text-indigo-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">
                        {HOBBY_EMOJI[hobby] || '✨'}
                      </span>
                      <span className="truncate flex-1 text-left">{hobby}</span>
                      {selected && (
                        <Check className="h-4 w-4 text-indigo-600 stroke-[3] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {hobbies.filter((h) => !HOBBY_SUGGESTIONS.includes(h)).length >
                0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {hobbies
                    .filter((h) => !HOBBY_SUGGESTIONS.includes(h))
                    .map((custom) => (
                      <span
                        key={custom}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-black text-white"
                      >
                        ✨ {custom}
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
                  placeholder="Thêm sở thích riêng (vd: Nuôi mèo, Bóng đá...)"
                  className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomHobby}
                  className="btn-duo btn-duo-white px-4 py-2.5 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Thêm
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Công việc / Ngành học (tùy chọn)
              </label>
              <div className="flex flex-wrap gap-2 mb-2.5">
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
                      className={`rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                        active
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                placeholder="Hoặc nhập nghề nghiệp của bạn..."
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                playTapSound();
                setStep(3);
              }}
              className="btn-duo btn-duo-primary w-full py-4 text-sm uppercase tracking-wide"
            >
              Tiếp theo: Tên gọi &amp; Mục tiêu
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </button>
          </div>
        )}

        {/* STEP 3: NAME & DAILY GOAL */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Bạn muốn AI gọi bạn bằng tên gì? <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Huy, Minh, Alex..."
                maxLength={40}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base font-black text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
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
                      onClick={() => {
                        playTapSound();
                        setPreferredSpeed(s.val);
                      }}
                      className={`rounded-xl border-2 border-b-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                        Math.abs(preferredSpeed - s.val) < 0.04
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
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
                      className={`rounded-xl border-2 border-b-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
                        dailyGoalMinutes === m
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
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
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/70 p-4 text-xs space-y-1.5">
              <div className="font-black text-indigo-900">
                ✨ Hồ sơ học tập của {displayName.trim() || 'bạn'}:
              </div>
              <div className="font-semibold text-slate-700">
                • Ngôn ngữ:{' '}
                <strong>
                  {NATIVE_LANGUAGES.find((l) => l.value === nativeLanguage)?.label}
                </strong>{' '}
                · Giọng: <strong>{preferredAccent}</strong> · Trình độ:{' '}
                <strong>{englishLevel}</strong>
              </div>
              <div className="font-semibold text-slate-700">
                • Sở thích:{' '}
                <strong>
                  {hobbies.length > 0 ? hobbies.join(', ') : 'Giao tiếp đời sống'}
                </strong>
              </div>
              <div className="text-emerald-700 font-extrabold pt-1 flex items-center gap-1.5">
                <Cloud className="h-4 w-4" />
                {isDrive
                  ? 'Tự động lưu & khôi phục trọn đời trên Google Drive 5TB!'
                  : 'Đã sẵn sàng đồng bộ hồ sơ của bạn.'}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-xs font-extrabold text-rose-700">
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleFinish()}
              className="btn-duo btn-duo-primary w-full py-4 text-sm uppercase tracking-wide"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang lưu hồ sơ &amp; đồng bộ...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5" />
                  Hoàn tất &amp; Bắt đầu Chơi &amp; Học!
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
