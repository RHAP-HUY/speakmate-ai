'use client';

import {
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Gamepad2,
  Loader2,
  MessageSquare,
  Sparkles,
  Trophy,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  GemSvg,
  NovaCompanion,
  ShieldFreezeSvg,
  StreakFlameSvg,
} from '@/components/BrandArt';
import { CallReportView } from '@/components/CallReportView';
import {
  PronunciationBadge,
  getScoreTone,
} from '@/components/PronunciationBadge';
import { StreakCalendar } from '@/components/StreakCalendar';
import { StreakRewardsPanel } from '@/components/StreakRewardsPanel';
import { playNaturalVoice } from '@/lib/audio';
import {
  applyStreakFreezeForYesterday,
  claimStreakMilestone,
  equipBadge,
  getConversationDetail,
  getCurrentProfile,
  getDailyStats,
  getTodayLocalDate,
  listConversations,
  purchaseShopReward,
  savePhrase,
} from '@/lib/data-store';
import { getLevelInfo } from '@/lib/gamification';
import { AI_PERSONAS } from '@/lib/scenarios';
import { parseConversationReport } from '@/lib/tutor-prompt';
import type {
  ConcreteAccent,
  ConversationRecord,
  DailyStat,
  ReportKeyPhrase,
  TutorMessage,
  UserProfile,
} from '@/types';

function getLast7DaysLabels(): { date: string; shortLabel: string }[] {
  const days: { date: string; shortLabel: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push({
      date: `${yyyy}-${mm}-${dd}`,
      shortLabel: `${dd}/${mm}`,
    });
  }
  return days;
}

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, TutorMessage[]>>(
    {}
  );
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const { profile: prof, authenticated: isAuth } = await getCurrentProfile();
      if (!active) return;
      if (!isAuth || !prof) {
        router.replace('/auth?next=/history');
        return;
      }
      setProfile(prof);
      setAuthenticated(true);

      const [convs, daily] = await Promise.all([
        listConversations(),
        getDailyStats(180),
      ]);
      if (!active) return;
      setConversations(convs);
      setStats(daily);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [router]);

  async function toggleConversation(conv: ConversationRecord) {
    if (expandedId === conv.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(conv.id);
    if (!detailCache[conv.id]) {
      setLoadingDetail(conv.id);
      const { messages } = await getConversationDetail(conv.id);
      setDetailCache((prev) => ({ ...prev, [conv.id]: messages }));
      setLoadingDetail(null);
    }
  }

  function speakSentence(text: string, accent: string) {
    const persona =
      AI_PERSONAS.find((p) => p.accent === accent) ?? AI_PERSONAS[0];
    void playNaturalVoice({
      text,
      voice: persona.edgeVoice,
      browserLang: persona.browserLang,
      speed: profile?.preferredSpeed ?? 0.85,
    });
  }

  async function handleSaveReportPhrase(
    phrase: ReportKeyPhrase,
    category: string,
    accent: ConcreteAccent
  ) {
    const key = phrase.en.toLowerCase();
    if (savedKeys.has(key)) return;
    await savePhrase({
      englishPhrase: phrase.en,
      vietnameseMeaning: phrase.vi,
      phonetic: phrase.phonetic ?? null,
      category,
      accent,
    });
    setSavedKeys((prev) => new Set(prev).add(key));
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
        <NovaCompanion mood="fire" className="h-18 w-18 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  const todayStr = getTodayLocalDate();
  const days = getLast7DaysLabels();
  const statByDate = new Map(stats.map((s) => [s.practiceDate, s]));
  const totalMinutesAll = Math.round(
    stats.reduce((acc, s) => acc + s.secondsPracticed, 0) / 60
  );
  const goalMinutes = profile.dailyGoalMinutes ?? 15;
  const levelInfo = getLevelInfo(profile.xp);

  return (
    <AppShell profile={profile} authenticated={authenticated}>
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 border-b-4 border-rose-900/35 p-6 text-white shadow-lg shadow-orange-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <NovaCompanion
            mood="fire"
            className="hidden sm:block h-18 w-18 shrink-0 animate-gentle-float drop-shadow-[0_10px_18px_rgba(124,45,18,0.35)]"
          />
          <div>
            <div className="text-[11px] font-black uppercase tracking-widest text-white/85">
              THÀNH TÍCH &amp; PHẦN THƯỞNG
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight mt-0.5">
              Lịch Chuỗi, Rương Quà &amp; Báo Cáo
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-white/90 mt-1">
              Theo dõi ngày học giữ chuỗi, mở rương mốc ngày, đổi Khiên bằng Ngọc và xem lại các buổi gọi AI.
            </p>
          </div>
        </div>

        <Link
          href="/play"
          className="btn-duo btn-duo-white shrink-0 px-5 py-3 text-xs uppercase text-[#D97706]"
        >
          <Gamepad2 className="h-4 w-4" />
          Chơi 1 bài giữ chuỗi
        </Link>
      </section>

      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="card-duo-elevated p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-orange-600">
            <StreakFlameSvg active={profile.streakDays > 0} className="h-5 w-5" />
            Chuỗi hiện tại
          </div>
          <div className="text-2xl font-black text-[#FF9600]">
            {profile.streakDays} ngày
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            Kỷ lục: {Math.max(profile.streakDays, profile.longestStreak)} ngày
          </div>
        </div>

        <div className="card-duo-elevated p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-[#6D28D9]">
            <Trophy className="h-4 w-4 text-[#8B5CF6]" />
            Cấp độ &amp; XP
          </div>
          <div className="text-2xl font-black text-slate-900">
            Lv.{levelInfo.level}
          </div>
          <div className="text-[11px] font-bold text-slate-500">
            {profile.xp} XP · {profile.totalLessonsCompleted} bài xong
          </div>
        </div>

        <div className="card-duo-elevated p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-[#1899D6]">
            <GemSvg className="h-4 w-4" />
            Ngọc &amp; Khiên
          </div>
          <div className="text-2xl font-black text-[#1899D6]">
            {profile.gems} 💎
          </div>
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <ShieldFreezeSvg className="h-3.5 w-3.5" />
            {profile.streakFreezes} Khiên bảo vệ
          </div>
        </div>

        <div className="card-duo-elevated p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-slate-500">
            <Clock className="h-4 w-4 text-emerald-500" />
            Tổng luyện tập
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalMinutesAll} phút
          </div>
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {conversations.length} cuộc gọi AI
          </div>
        </div>
      </div>

      {/* Monthly Interactive Streak Calendar */}
      <StreakCalendar
        stats={stats}
        todayStr={todayStr}
        streakFreezes={profile.streakFreezes}
        onApplyYesterdayFreeze={async () => {
          const res = await applyStreakFreezeForYesterday();
          setProfile(res.profile);
          setStats(res.stats);
        }}
      />

      {/* Streak Milestone Rewards & Gem Shop */}
      <div id="rewards">
        <StreakRewardsPanel
          profile={profile}
          onClaimMilestone={async (days) => {
            const updated = await claimStreakMilestone(days);
            setProfile(updated);
          }}
          onPurchaseItem={async (itemId) => {
            const updated = await purchaseShopReward(itemId);
            setProfile(updated);
          }}
          onEquipBadge={async (badgeId) => {
            const updated = await equipBadge(badgeId);
            setProfile(updated);
          }}
        />
      </div>

      {/* 7-day Progress Bar Chart */}
      <section className="card-duo-elevated p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1CB0F6]" />
            Thời lượng 7 ngày gần nhất (Mục tiêu: {goalMinutes} phút/ngày)
          </h2>
        </div>

        <div className="grid grid-cols-7 gap-2.5 items-end h-36 pt-4">
          {days.map((d) => {
            const st = statByDate.get(d.date);
            const mins = Math.round((st?.secondsPracticed ?? 0) / 60);
            const heightPct = Math.min(
              100,
              Math.max(8, Math.round((mins / Math.max(1, goalMinutes)) * 100))
            );
            const metGoal = mins >= goalMinutes;

            return (
              <div
                key={d.date}
                className="flex flex-col items-center justify-end h-full gap-1.5"
              >
                <span className="text-[11px] font-black text-slate-600">
                  {mins}p
                </span>
                <div className="w-full max-w-11 flex-1 flex items-end bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <div
                    className={`progress-gloss w-full rounded-xl transition-all ${
                      metGoal
                        ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                        : mins > 0
                          ? 'bg-gradient-to-t from-indigo-600 to-cyan-400'
                          : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-extrabold text-slate-400">
                  {d.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Conversation List & Reports */}
      <section className="space-y-3">
        <h2 className="text-base font-black uppercase tracking-wide text-slate-800">
          Lịch sử Cuộc gọi AI &amp; Báo cáo Đánh giá
        </h2>

        {conversations.length === 0 ? (
          <div className="card-duo border-dashed p-10 text-center space-y-3">
            <p className="text-sm font-black text-slate-800">
              Chưa có lịch sử cuộc gọi AI nào
            </p>
            <p className="text-xs font-medium text-slate-500">
              Hoàn thành 1 cuộc gọi 3 lượt với Gia sư AI để nhận báo cáo đánh giá 4 kỹ năng &amp; giữ chuỗi 🔥!
            </p>
            <Link
              href="/call"
              className="btn-duo btn-duo-blue px-5 py-2.5 text-xs uppercase"
            >
              Gọi Gia sư AI ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const isOpen = expandedId === conv.id;
              const msgs = detailCache[conv.id] ?? [];
              const parsedReport = parseConversationReport(conv.summaryVi);
              const scoreTone =
                parsedReport && parsedReport.overallScore > 0
                  ? getScoreTone(parsedReport.overallScore)
                  : null;

              return (
                <div key={conv.id} className="card-duo overflow-hidden">
                  <button
                    type="button"
                    onClick={() => void toggleConversation(conv)}
                    className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-slate-900">
                          {conv.scenarioTitle}
                        </span>
                        <span className="rounded-xl bg-[#DDF4FF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#1899D6]">
                          {conv.aiPersona} · {conv.accent}
                        </span>
                        {parsedReport && scoreTone && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[11px] font-extrabold ${scoreTone.pillLight}`}
                          >
                            <Award className="h-3 w-3" />
                            {parsedReport.overallScore}/100 ·{' '}
                            {parsedReport.cefrEstimate}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-500">
                        <span>
                          {new Date(conv.startedAt).toLocaleString('vi-VN')}
                        </span>
                        <span>•</span>
                        <span>
                          {Math.max(1, Math.round(conv.durationSeconds / 60))} phút
                        </span>
                        <span>•</span>
                        <span>{conv.messageCount} lượt thoại</span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t-2 border-slate-100 bg-[#F7F9FC] p-4 space-y-4">
                      {parsedReport && (
                        <div className="space-y-2">
                          <div className="text-xs font-black uppercase tracking-wider text-[#1899D6]">
                            Báo cáo đánh giá buổi gọi
                          </div>
                          <CallReportView
                            report={parsedReport}
                            theme="light"
                            savedKeys={savedKeys}
                            onSpeak={(text) => speakSentence(text, conv.accent)}
                            onSavePhrase={(p) =>
                              void handleSaveReportPhrase(
                                p,
                                conv.topicCategory,
                                conv.accent
                              )
                            }
                          />
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Nội dung hội thoại &amp; Chấm phát âm
                        </div>

                        {loadingDetail === conv.id ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải nội dung cuộc gọi...
                          </div>
                        ) : msgs.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            Không có tin nhắn chi tiết trong cuộc gọi này.
                          </p>
                        ) : (
                          msgs.map((m) => (
                            <div
                              key={m.id}
                              className={`flex flex-col ${
                                m.role === 'user' ? 'items-end' : 'items-start'
                              }`}
                            >
                              <div
                                className={`w-full sm:max-w-[85%] rounded-2xl p-3.5 text-sm ${
                                  m.role === 'user'
                                    ? 'bg-[#1CB0F6] text-white'
                                    : 'bg-white border-2 border-slate-200 text-slate-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-bold">{m.englishText}</p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      speakSentence(
                                        m.naturalRewrite || m.englishText,
                                        conv.accent
                                      )
                                    }
                                    className={`shrink-0 rounded-xl p-1.5 cursor-pointer ${
                                      m.role === 'user'
                                        ? 'bg-white/20 text-white hover:bg-white/30'
                                        : 'bg-slate-100 text-[#1899D6] hover:bg-slate-200'
                                    }`}
                                  >
                                    <Volume2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {m.vietnameseTranslation && (
                                  <p
                                    className={`mt-1 text-xs font-medium ${
                                      m.role === 'user'
                                        ? 'text-white/90'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    🇻🇳 {m.vietnameseTranslation}
                                  </p>
                                )}

                                {m.naturalRewrite && (
                                  <div className="mt-2 rounded-xl bg-black/15 px-2.5 py-1.5 text-xs text-white flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                    <span>
                                      Tự nhiên hơn:{' '}
                                      <strong>{m.naturalRewrite}</strong>
                                    </span>
                                  </div>
                                )}

                                {m.coachingTip && (
                                  <p className="mt-1.5 text-xs opacity-90">
                                    💡 {m.coachingTip}
                                  </p>
                                )}
                              </div>

                              {m.role === 'user' && m.pronunciation && (
                                <PronunciationBadge
                                  assessment={m.pronunciation}
                                  theme="light"
                                />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
