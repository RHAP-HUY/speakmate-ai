'use client';

import {
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Loader2,
  MessageSquare,
  Sparkles,
  Trophy,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
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
      <div className="min-h-screen flex items-center justify-center bg-mesh-light">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
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
    <div className="min-h-screen flex flex-col bg-mesh-light pb-24 lg:pb-12">
      <AppNav profile={profile} authenticated={authenticated} />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Lịch Chuỗi, Phần Thưởng & Lịch Sử
            </h1>
            <p className="text-sm text-slate-600">
              Theo dõi ngày nào đã học xong bài, ngày nào nghỉ, nhận quà mốc chuỗi và xem lại báo cáo đánh giá.
            </p>
          </div>
          <Link
            href="/play"
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-orange-500/20 hover:from-amber-600 hover:to-orange-600 transition"
          >
            🔥 Chơi 1 bài giữ chuỗi ngay
          </Link>
        </div>

        {/* Summary KPIs */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-amber-50 p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700">
              <Flame className="h-4 w-4 text-orange-500" />
              Chuỗi hiện tại
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-orange-600">
              {profile.streakDays} ngày
            </div>
            <div className="text-[11px] text-orange-700/80 mt-0.5">
              Kỷ lục: {Math.max(profile.streakDays, profile.longestStreak)} ngày
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
              <Trophy className="h-4 w-4 text-indigo-600" />
              Cấp độ & XP
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-slate-900">
              Lv.{levelInfo.level}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {profile.xp} XP · {profile.totalLessonsCompleted} bài xong
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700">
              <span>💎</span>
              Ngọc & Khiên
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-cyan-700">
              {profile.gems} 💎
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              🧊 {profile.streakFreezes} Khiên bảo vệ
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Clock className="h-4 w-4 text-slate-500" />
              Tổng luyện tập
            </div>
            <div className="mt-1.5 text-2xl font-extrabold text-slate-900">
              {totalMinutesAll} phút
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
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

        {/* 7-day Progress Chart */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              Thời lượng 7 ngày gần nhất (Mục tiêu: {goalMinutes} phút/ngày)
            </h2>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
            {days.map((d) => {
              const st = statByDate.get(d.date);
              const mins = Math.round((st?.secondsPracticed ?? 0) / 60);
              const heightPct = Math.min(
                100,
                Math.max(6, Math.round((mins / Math.max(1, goalMinutes)) * 100))
              );
              const metGoal = mins >= goalMinutes;

              return (
                <div
                  key={d.date}
                  className="flex flex-col items-center justify-end h-full gap-1.5"
                >
                  <span className="text-[11px] font-bold text-slate-600">
                    {mins}p
                  </span>
                  <div className="w-full max-w-10 flex-1 flex items-end bg-slate-100 rounded-xl overflow-hidden">
                    <div
                      className={`w-full rounded-xl transition-all ${
                        metGoal
                          ? 'bg-gradient-to-t from-emerald-500 to-cyan-400'
                          : mins > 0
                            ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                            : 'bg-slate-200'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {d.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Conversation List */}
        <section className="space-y-3">
          <h2 className="text-base font-extrabold text-slate-900">
            Lịch sử Cuộc gọi AI & Báo cáo Đánh giá
          </h2>

          {conversations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-bold text-slate-800">
                Chưa có lịch sử cuộc gọi nào
              </p>
              <p className="mt-1 text-xs text-slate-500 mb-4">
                Bắt đầu một cuộc gọi ngắn 3 lượt để nhận báo cáo đánh giá 4 kỹ năng và giữ chuỗi nhé!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Chọn tình huống gọi ngay
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
                  <div
                    key={conv.id}
                    className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => void toggleConversation(conv)}
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">
                            {conv.scenarioTitle}
                          </span>
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {conv.aiPersona} · {conv.accent}
                          </span>
                          {parsedReport && scoreTone && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${scoreTone.pillLight}`}
                            >
                              <Award className="h-3 w-3" />
                              {parsedReport.overallScore}/100 · {parsedReport.cefrEstimate}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
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
                      <div className="border-t border-slate-100 bg-slate-50/70 p-4 space-y-4">
                        {parsedReport && (
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                              Báo cáo đánh giá buổi gọi
                            </div>
                            <CallReportView
                              report={parsedReport}
                              theme="light"
                              savedKeys={savedKeys}
                              onSpeak={(text) =>
                                speakSentence(text, conv.accent)
                              }
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
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Nội dung hội thoại & Chấm phát âm
                          </div>

                          {loadingDetail === conv.id ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
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
                                  className={`w-full sm:max-w-[85%] rounded-2xl p-3 text-sm ${
                                    m.role === 'user'
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-white border border-slate-200 text-slate-900'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium">{m.englishText}</p>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        speakSentence(
                                          m.naturalRewrite || m.englishText,
                                          conv.accent
                                        )
                                      }
                                      className={`shrink-0 rounded-lg p-1.5 cursor-pointer ${
                                        m.role === 'user'
                                          ? 'bg-white/15 text-white hover:bg-white/25'
                                          : 'bg-slate-100 text-indigo-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      <Volume2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  {m.vietnameseTranslation && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      🇻🇳 {m.vietnameseTranslation}
                                    </p>
                                  )}

                                  {m.naturalRewrite && (
                                    <div className="mt-2 rounded-xl bg-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-100 flex items-center gap-1.5">
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
      </main>
    </div>
  );
}
