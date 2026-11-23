'use client';

import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Flame,
  Gamepad2,
  Gift,
  Globe2,
  Headphones,
  Loader2,
  Mic,
  PhoneCall,
  Shield,
  Sparkles,
  Trophy,
  Zap,
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
import {
  BADGE_DIRECTORY,
  computeStrictStreak,
  getClaimableMilestones,
  getLevelInfo,
  shiftDateString,
  STREAK_MILESTONES,
} from '@/lib/gamification';
import { AI_PERSONAS, pickPersona, SCENARIOS } from '@/lib/scenarios';
import type { DailyStat, TopicCategory, UserProfile } from '@/types';

const CATEGORY_TABS: {
  id: 'all' | TopicCategory;
  label: string;
}[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'daily', label: '☕ Đời sống' },
  { id: 'business', label: '💼 Công việc' },
  { id: 'travel', label: '✈️ Du lịch' },
  { id: 'freetalk', label: '🌟 Tự do' },
];

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DailyStat[]>([]);

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
        const daily = await getDailyStats(90);
        if (!active) return;
        setStats(daily);
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
      <div className="min-h-screen flex items-center justify-center bg-mesh-light">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Public landing screen when not signed in (multi-user Supabase active)
  if (!authenticated || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-mesh-light">
        <AppNav profile={null} authenticated={false} />
        <main className="flex-1 mx-auto max-w-5xl px-4 py-12 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-4 py-1.5 text-xs font-extrabold text-indigo-700 mb-5 shadow-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Học tiếng Anh kiểu Chơi Game · Đồng bộ Google & Apple
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Chơi để học — Nói tiếng Anh như{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                người bạn bản xứ
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              Vừa chơi minigame phản xạ, vừa gọi thoại AI chấm phát âm từng từ, giữ chuỗi trên Lịch tháng để nhận quà và đồng bộ mọi máy qua Google hoặc Apple!
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 px-8 py-4 text-sm font-extrabold text-white shadow-xl shadow-indigo-500/25 hover:opacity-95 transition"
              >
                Đăng nhập với Google / Apple
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Gamepad2,
                color: 'bg-amber-50 text-amber-600',
                title: 'Chơi để học không chán',
                desc: 'Đấu tốc độ phản xạ, ghép câu bản xứ & đấu trường phát âm kiếm XP leo cấp.',
              },
              {
                icon: Flame,
                color: 'bg-orange-50 text-orange-600',
                title: 'Lịch chuỗi & Quà mốc ngày',
                desc: 'Hoàn thành 1 bài học để thắp lửa giữ chuỗi, mở khóa Khiên & danh hiệu.',
              },
              {
                icon: Mic,
                color: 'bg-emerald-50 text-emerald-600',
                title: 'Gọi AI & Chấm phát âm',
                desc: 'Chấm điểm từng từ theo giọng Mỹ/Anh/Úc/Canada kèm báo cáo 4 kỹ năng.',
              },
              {
                icon: Globe2,
                color: 'bg-indigo-50 text-indigo-600',
                title: 'Khôi phục mọi thiết bị',
                desc: 'Đăng nhập Google hoặc Apple trên máy khác là khôi phục ngay 100% dữ liệu.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm hover:-translate-y-1 hover:shadow-lg transition"
                >
                  <div
                    className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-sm font-extrabold text-slate-900">
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

  const todayStr = getTodayLocalDate();
  const statByDate = new Map(stats.map((s) => [s.practiceDate, s]));
  const todayStats = statByDate.get(todayStr) ?? null;
  const strict = computeStrictStreak(stats, todayStr);
  const levelInfo = getLevelInfo(profile.xp);
  const claimableMilestones = getClaimableMilestones(
    profile.streakDays,
    profile.longestStreak,
    profile.claimedMilestones
  );
  const nextMilestone = STREAK_MILESTONES.find(
    (m) => m.days > Math.max(profile.streakDays, profile.longestStreak)
  );
  const activeBadgeLabel = profile.activeBadge
    ? BADGE_DIRECTORY[profile.activeBadge]
    : null;

  const practicedMinutes = Math.round((todayStats?.secondsPracticed ?? 0) / 60);
  const todayLessons = todayStats?.lessonsCompleted ?? 0;

  // Mini 7-day strip (past 6 days + today)
  const miniWeek = Array.from({ length: 7 }).map((_, idx) => {
    const dateStr = shiftDateString(todayStr, idx - 6);
    const st = statByDate.get(dateStr);
    const [, mm, dd] = dateStr.split('-');
    const studied = (st?.lessonsCompleted ?? 0) >= 1;
    const frozen = Boolean(st?.freezeUsed);
    return {
      dateStr,
      label: idx === 6 ? 'Nay' : `${dd}/${mm}`,
      studied,
      frozen,
      isToday: idx === 6,
    };
  });

  const filteredScenarios =
    selectedCategory === 'all'
      ? SCENARIOS
      : SCENARIOS.filter((s) => s.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col bg-mesh-light pb-24 lg:pb-12">
      <AppNav profile={profile} authenticated={authenticated} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-7">
        {/* Claimable Milestone Alert Banner */}
        {claimableMilestones.length > 0 && (
          <Link
            href="/history#rewards"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-100 via-orange-100 to-amber-50 px-5 py-3.5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-amber-950">
                  🎉 Bạn có {claimableMilestones.length} rương thưởng mốc giữ chuỗi chưa mở!
                </div>
                <div className="text-xs text-amber-800">
                  Bấm để nhận ngay +{claimableMilestones[0].rewardXp} XP, +{claimableMilestones[0].rewardGems} 💎 & Huy hiệu {claimableMilestones[0].badgeLabel}.
                </div>
              </div>
            </div>
            <span className="rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-extrabold text-white">
              Nhận quà ngay →
            </span>
          </Link>
        )}

        {/* Elevated Gamified Hero Card */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-6 sm:p-8 text-white shadow-2xl shadow-indigo-500/20">
          <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-12 items-center">
            {/* Left Greeting + Level + Mini Streak Strip */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold backdrop-blur-xs">
                  <Trophy className="h-3.5 w-3.5 text-amber-300" />
                  Lv.{levelInfo.level} · {levelInfo.titleVi}
                </span>
                {activeBadgeLabel && (
                  <span className="inline-flex items-center rounded-full bg-amber-400/25 border border-amber-200/40 px-3 py-1 text-xs font-bold text-amber-100">
                    {activeBadgeLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  Trình độ {profile.englishLevel}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  Chào {profile.displayName || 'bạn'}! Sẵn sàng thắp lửa hôm nay chưa?
                </h1>
                <p className="mt-1.5 text-sm text-indigo-100 leading-relaxed">
                  {strict.studiedToday
                    ? `🔥 Xuất sắc! Hôm nay bạn đã hoàn thành ${todayLessons} bài học và giữ vững chuỗi ${profile.streakDays} ngày.`
                    : '⏳ Hôm nay bạn chưa hoàn thành bài nào — chơi 1 màn 2 phút hoặc gọi AI 3 lượt để giữ chuỗi ngày học nhé!'}
                </p>
              </div>

              {/* XP Bar */}
              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-100">
                  <span>
                    ⚡ {levelInfo.xpInLevel} / {levelInfo.xpForNextLevel} XP lên Cấp {levelInfo.level + 1}
                  </span>
                  <span>
                    💎 {profile.gems} Ngọc · 🧊 {profile.streakFreezes} Khiên
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-300 transition-all duration-500"
                    style={{ width: `${levelInfo.progressPct}%` }}
                  />
                </div>
              </div>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/play"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-500/30 hover:from-amber-500 hover:to-orange-600 transition"
                >
                  <Gamepad2 className="h-4 w-4" />
                  Chơi để Học (2 phút)
                </Link>
                <button
                  type="button"
                  onClick={() => startCall('daily-small-talk')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-indigo-700 shadow-lg hover:bg-indigo-50 transition cursor-pointer"
                >
                  <PhoneCall className="h-4 w-4" />
                  Gọi AI ngay
                </button>
              </div>
            </div>

            {/* Right Interactive 7-day Streak Card */}
            <div className="lg:col-span-5 rounded-3xl bg-white/15 border border-white/20 backdrop-blur-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-xl shadow-md">
                    🔥
                  </div>
                  <div>
                    <div className="text-xl font-extrabold leading-none">
                      {profile.streakDays} ngày
                    </div>
                    <div className="text-[11px] text-indigo-100 mt-0.5">
                      {nextMilestone
                        ? `Còn ${nextMilestone.days - Math.max(profile.streakDays, profile.longestStreak)} ngày tới mốc ${nextMilestone.titleVi}`
                        : 'Bạn đã chinh phục mọi mốc chuỗi! 👑'}
                    </div>
                  </div>
                </div>
                <Link
                  href="/history"
                  className="rounded-xl bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/30 transition"
                >
                  Lịch tháng →
                </Link>
              </div>

              {/* 7-day mini dots */}
              <div className="grid grid-cols-7 gap-1.5">
                {miniWeek.map((d) => (
                  <div
                    key={d.dateStr}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition ${
                        d.studied
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm'
                          : d.frozen
                            ? 'bg-cyan-400/90 text-white'
                            : d.isToday
                              ? 'border-2 border-dashed border-amber-300 bg-white/15 text-amber-200'
                              : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {d.studied ? '🔥' : d.frozen ? '🧊' : d.isToday ? '⏳' : '·'}
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-100">
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-indigo-100 border-t border-white/15 pt-2.5">
                <span>⏱ Hôm nay: {practicedMinutes}/{profile.dailyGoalMinutes} phút</span>
                <span className="font-bold">
                  {strict.studiedToday ? '✓ Đã giữ chuỗi' : 'Chưa xong 1 bài'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Quests Row */}
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: 'Hoàn thành 1 bài học giữ chuỗi',
              desc: 'Chơi xong 1 màn /play hoặc nói ≥ 3 lượt ở /call',
              done: todayLessons >= 1,
              progress: `${Math.min(1, todayLessons)}/1 bài`,
              reward: '🔥 Giữ chuỗi',
              href: '/play',
            },
            {
              title: `Đạt mục tiêu ${profile.dailyGoalMinutes} phút hôm nay`,
              desc: 'Luyện nghe – nói đều đặn mỗi ngày',
              done: practicedMinutes >= profile.dailyGoalMinutes,
              progress: `${practicedMinutes}/${profile.dailyGoalMinutes} phút`,
              reward: '+60 XP',
              href: '/call',
            },
            {
              title: 'Săn mốc chuỗi & Mở rương thưởng',
              desc: 'Kiểm tra Lịch chuỗi tháng & đổi Ngọc 💎',
              done: claimableMilestones.length === 0 && profile.claimedMilestones.length > 0,
              progress: `${profile.claimedMilestones.length}/${STREAK_MILESTONES.length} mốc`,
              reward: '💎 + 🧊 Khiên',
              href: '/history',
            },
          ].map((q) => (
            <Link
              key={q.title}
              href={q.href}
              className={`group flex items-start justify-between gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
                q.done
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-slate-200/80 bg-white'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  {q.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs font-extrabold text-slate-900">
                    {q.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{q.desc}</p>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-bold">
                  <span className="text-indigo-700">{q.progress}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-amber-700">{q.reward}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600 mt-0.5" />
            </Link>
          ))}
        </section>

        {/* Choose AI Persona & Accent */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Headphones className="h-4 w-4 text-indigo-600" />
              1. Chọn người bạn AI & Giọng nói (Accent)
            </h2>
            <p className="text-xs text-slate-500">
              Đổi giọng Mỹ, Anh, Úc, Canada bất cứ lúc nào để luyện phản xạ đa giọng.
            </p>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
            <button
              type="button"
              onClick={() => setSelectedPersonaId('auto')}
              className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                selectedPersonaId === 'auto'
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              <div className="text-xl mb-1.5">🎲</div>
              <div className="text-xs font-extrabold text-slate-900">
                Tự động
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
                  className={`rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xl">{persona.flag}</span>
                    {active && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="text-xs font-extrabold text-slate-900">
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

        {/* Scenario Quests Library */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                2. Chọn Bài Học Gọi Thoại AI (Hoàn thành ≥ 3 lượt để giữ chuỗi 🔥)
              </h2>
              <p className="text-xs text-slate-500">
                Có phụ đề song ngữ, chấm điểm phát âm từng từ, báo cáo 4 kỹ năng & thưởng +60 XP +15 💎.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
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
                className="group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-2xl">
                      {scenario.emoji}
                    </span>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      {scenario.recommendedLevel}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-700 transition">
                    {scenario.titleVi}
                  </h3>
                  <p className="text-[11px] font-semibold text-indigo-500 mt-0.5">
                    {scenario.titleEn}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {scenario.descriptionVi}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700">
                      +60 XP
                    </span>
                    <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-cyan-700">
                      +15 💎
                    </span>
                    <span className="rounded-md bg-orange-50 px-2 py-0.5 text-orange-700">
                      🔥 Giữ chuỗi
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startCall(scenario.id)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2.5 text-xs font-extrabold text-indigo-700 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-cyan-600 group-hover:text-white transition cursor-pointer"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Bắt đầu bài học
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Shortcut Cards */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/play"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-amber-300 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Chơi để Học
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  3 minigame vui cực nhanh
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/history"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Lịch Chuỗi & Kho Quà
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xem ngày học & mở thưởng
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/phrases"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 hover:border-cyan-300 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Sổ tay & Flashcard
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ôn câu bản xứ & chấm âm
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </section>

        {/* Cross-device sync hint */}
        <section className="rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-600">
            <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              Muốn đăng nhập <strong>Google / Apple</strong> để giữ dữ liệu khi đổi điện thoại hoặc máy tính?
            </span>
          </div>
          <Link
            href="/auth"
            className="text-xs font-extrabold text-indigo-600 hover:underline"
          >
            Quản lý đồng bộ tài khoản →
          </Link>
        </section>
      </main>
    </div>
  );
}
