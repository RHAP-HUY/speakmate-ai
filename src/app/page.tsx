'use client';

import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Flame,
  Globe2,
  Headphones,
  Loader2,
  Mic,
  PhoneCall,
  Plane,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import {
  getCurrentProfile,
  getDailyStats,
  getTodayLocalDate,
} from '@/lib/data-store';
import { AI_PERSONAS, pickPersona, SCENARIOS } from '@/lib/scenarios';
import type { DailyStat, TopicCategory, UserProfile } from '@/types';

const CATEGORY_TABS: {
  id: 'all' | TopicCategory;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'daily', label: '☕ Đời sống & Small talk' },
  { id: 'business', label: '💼 Công việc & Business' },
  { id: 'travel', label: '✈️ Du lịch & Nước ngoài' },
  { id: 'freetalk', label: '🌟 Tự do' },
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [todayStats, setTodayStats] = useState<DailyStat | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<
    'all' | TopicCategory
  >('all');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('auto');

  useEffect(() => {
    let active = true;
    async function load() {
      const { profile: prof, authenticated: isAuth } = await getCurrentProfile();
      if (!active) return;

      setAuthenticated(isAuth);
      setProfile(prof);

      if (isAuth && prof && !prof.onboardingCompleted) {
        router.replace('/onboarding');
        return;
      }

      if (isAuth) {
        const stats = await getDailyStats(7);
        if (!active) return;
        const today = getTodayLocalDate();
        setTodayStats(stats.find((s) => s.practiceDate === today) ?? null);
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  function startCall(scenarioId: string) {
    const resolvedPersona =
      selectedPersonaId === 'auto'
        ? pickPersona(profile?.preferredAccent ?? 'US').id
        : selectedPersonaId;
    router.push(
      `/call?scenario=${encodeURIComponent(scenarioId)}&persona=${encodeURIComponent(
        resolvedPersona
      )}`
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Public landing screen when not signed in (multi-user Supabase active)
  if (!authenticated || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-indigo-50/30 to-white">
        <AppNav profile={null} authenticated={false} />
        <main className="flex-1 mx-auto max-w-5xl px-4 py-12 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3.5 py-1 text-xs font-semibold text-indigo-700 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Dành riêng cho người Việt học giao tiếp từ mất gốc đến bản xứ
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Nói chuyện tiếng Anh tự nhiên như gọi điện cho{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                người bạn bản xứ
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Kể cả khi bạn mới bắt đầu (A0–A1) và còn ngập ngừng hoặc chêm tiếng Việt, SpeakMate AI vẫn hiểu ý, sửa câu cho giống người nước ngoài và gợi ý sẵn 3 cách đáp lại kèm phiên âm.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-cyan-700 transition"
              >
                Đăng nhập / Đăng ký miễn phí
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Mic,
                title: 'Hiểu giọng người Việt',
                desc: 'Nói chậm hoặc chêm tiếng Việt khi bí từ — AI vẫn hiểu và chỉ bạn cách nói chuẩn.',
              },
              {
                icon: Headphones,
                title: 'Đa dạng Accent Mỹ/Anh/Úc',
                desc: 'Chỉnh tốc độ chậm 0.75x cho người mới, tăng dần lên 1.0x chuẩn bản xứ.',
              },
              {
                icon: Briefcase,
                title: 'Đời sống, Du lịch & Công việc',
                desc: 'Cá nhân hóa tình huống theo đúng nghề nghiệp và sở thích bạn chọn khi đăng nhập.',
              },
              {
                icon: Globe2,
                title: 'Đồng bộ PC & Điện thoại',
                desc: 'Học tiếp mọi lúc mọi nơi với lịch sử gọi và sổ tay cụm từ lưu theo tài khoản.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  const practicedMinutes = Math.round((todayStats?.secondsPracticed ?? 0) / 60);
  const goalProgress = Math.min(
    100,
    Math.round((practicedMinutes / Math.max(1, profile.dailyGoalMinutes)) * 100)
  );

  const filteredScenarios =
    selectedCategory === 'all'
      ? SCENARIOS
      : SCENARIOS.filter((s) => s.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 md:pb-10">
      <AppNav profile={profile} authenticated={authenticated} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-7">
        {/* Personalized Greeting & Progress Hero */}
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 p-6 text-white shadow-xl shadow-indigo-500/15 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
                  <Flame className="h-3.5 w-3.5 text-amber-300" />
                  Chuỗi {profile.streakDays} ngày liên tiếp
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
                  <UserCheck className="h-3.5 w-3.5 text-cyan-200" />
                  Trình độ {profile.englishLevel}
                </span>
                {profile.jobField && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                    💼 {profile.jobField}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Chào {profile.displayName || 'bạn'}! Hôm nay mình trò chuyện chủ đề gì nào?
              </h1>
              <p className="max-w-2xl text-sm text-indigo-100 leading-relaxed">
                {profile.hobbies.length > 0
                  ? `AI đã ghi nhớ sở thích của bạn (${profile.hobbies
                      .slice(0, 3)
                      .join(', ')}) để dẫn dắt cuộc trò chuyện thật tự nhiên.`
                  : 'Chọn một tình huống bên dưới và bấm Gọi ngay — đừng ngại nói sai hay nói chậm nhé!'}
              </p>

              {/* Daily goal bar */}
              <div className="pt-1 max-w-md">
                <div className="flex items-center justify-between text-xs font-medium text-indigo-100 mb-1.5">
                  <span>Mục tiêu hôm nay</span>
                  <span>
                    {practicedMinutes} / {profile.dailyGoalMinutes} phút ({goalProgress}%)
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-all duration-500"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col shrink-0">
              <button
                type="button"
                onClick={() => startCall('daily-small-talk')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-indigo-700 shadow-lg hover:bg-indigo-50 transition cursor-pointer"
              >
                <PhoneCall className="h-4 w-4" />
                Gọi nhanh theo sở thích
              </button>
              <button
                type="button"
                onClick={() => startCall('business-intro')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
              >
                <Briefcase className="h-4 w-4" />
                Luyện nói về công việc
              </button>
            </div>
          </div>
        </section>

        {/* Choose AI Persona & Accent */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Chọn người bạn AI & Giọng nói (Accent)
              </h2>
              <p className="text-xs text-slate-500">
                Đổi giọng Mỹ, Anh, Úc, Canada bất cứ lúc nào để luyện phản xạ đa giọng.
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
            <button
              type="button"
              onClick={() => setSelectedPersonaId('auto')}
              className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                selectedPersonaId === 'auto'
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="text-xl mb-1">🎲</div>
              <div className="text-xs font-bold text-slate-900">
                Tự động / Đổi giọng
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Theo hồ sơ ({profile.preferredAccent})
              </div>
            </button>

            {AI_PERSONAS.map((persona) => {
              const active = selectedPersonaId === persona.id;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`rounded-2xl border p-3 text-left transition cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">{persona.flag}</span>
                    {active && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {persona.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {persona.accentLabel}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Scenario Library */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Chọn tình huống thực hành ngay
              </h2>
              <p className="text-xs text-slate-500">
                Đều có phụ đề song ngữ, nút nghe chậm và 3 gợi ý câu trả lời cho trình độ {profile.englishLevel}.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{scenario.emoji}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      Gợi ý: {scenario.recommendedLevel}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition">
                    {scenario.titleVi}
                  </h3>
                  <p className="text-[11px] font-medium text-indigo-600 mt-0.5">
                    {scenario.titleEn}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {scenario.descriptionVi}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => startCall(scenario.id)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition cursor-pointer"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Bắt đầu gọi
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Quick shortcut cards */}
        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/phrases"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-cyan-300 transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Sổ tay & 15+ Cụm câu cửa miệng bản xứ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nghe phát âm chuẩn và ôn tập Flashcard mỗi ngày
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/history"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300 transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Plane className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Xem lại lịch sử cuộc gọi & Tiến độ 7 ngày
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đọc lại câu AI đã sửa cho bạn và nghe lại từng lượt nói
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </section>
      </main>
    </div>
  );
}
