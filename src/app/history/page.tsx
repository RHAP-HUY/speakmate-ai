'use client';

import {
  Award,
  ChevronDown,
  ChevronUp,
  Loader2,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TutorAvatar } from '@/components/BrandArt';
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
      <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Nhật ký học tập &amp; Phần thưởng
          </h1>
          <p className="text-sm text-gray-500">
            Theo dõi lịch chuỗi ngày học, mở mốc quà tặng và xem lại báo cáo phân tích từng buổi hội thoại.
          </p>
        </div>

        <Link
          href="/play"
          className="btn-duo btn-duo-coral shrink-0 px-5 py-2.5 text-sm"
        >
          Thực hành bài hôm nay →
        </Link>
      </div>

      {/* Crisp Metrics Strip */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <dt className="text-xs font-medium text-gray-500">Chuỗi ngày hiện tại</dt>
          <dd className="font-display text-3xl font-bold text-[#E5483F] mt-1">
            {profile.streakDays} ngày
          </dd>
          <div className="text-[11px] text-gray-400 mt-1">
            Kỷ lục: {Math.max(profile.streakDays, profile.longestStreak)} ngày
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <dt className="text-xs font-medium text-gray-500">Cấp độ &amp; Kinh nghiệm</dt>
          <dd className="font-display text-3xl font-bold text-gray-900 mt-1">
            Cấp {levelInfo.level}
          </dd>
          <div className="text-[11px] text-gray-400 mt-1">
            {profile.xp} XP · {profile.totalLessonsCompleted} bài xong
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <dt className="text-xs font-medium text-gray-500">Ngọc &amp; Khiên chuỗi</dt>
          <dd className="font-display text-3xl font-bold text-emerald-600 mt-1">
            {profile.gems}
          </dd>
          <div className="text-[11px] text-gray-400 mt-1">
            {profile.streakFreezes} Khiên bảo vệ chuỗi
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-xs">
          <dt className="text-xs font-medium text-gray-500">Tổng thời lượng nói</dt>
          <dd className="font-display text-3xl font-bold text-gray-900 mt-1">
            {totalMinutesAll} phút
          </dd>
          <div className="text-[11px] text-gray-400 mt-1">
            {conversations.length} buổi hội thoại đã lưu
          </div>
        </div>
      </dl>

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

      {/* Streak Milestone Rewards & Shop */}
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

      {/* 7-day Practice Bar Chart */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-4 tabular-nums">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-bold text-gray-900">
            Thời lượng thực hành 7 ngày gần nhất
          </h2>
          <span className="text-xs font-medium text-gray-500">
            Mục tiêu: {goalMinutes} phút/ngày
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3 items-end h-36 pt-2">
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
                <span className="text-[11px] font-semibold text-gray-600">
                  {mins}p
                </span>
                <div className="w-full max-w-10 flex-1 flex items-end bg-gray-100 rounded-xl overflow-hidden">
                  <div
                    className={`w-full rounded-xl transition-all ${
                      metGoal
                        ? 'bg-emerald-500'
                        : mins > 0
                          ? 'bg-[#E5483F]'
                          : 'bg-gray-200'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-gray-500">
                  {d.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Conversation Archive & Reports */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-gray-900">
          Lịch sử hội thoại &amp; Báo cáo đánh giá
        </h2>

        {conversations.length === 0 ? (
          <div className="rounded-3xl border border-gray-200/80 bg-white p-10 text-center shadow-xs space-y-3">
            <p className="font-display text-lg font-bold text-gray-900">
              Chưa có buổi hội thoại nào được ghi nhận
            </p>
            <p className="text-sm text-gray-500">
              Hoàn thành một cuộc trò chuyện từ 3 lượt nói trở lên để nhận bản phân tích 4 kỹ năng chi tiết.
            </p>
            <Link
              href="/call"
              className="btn-duo btn-duo-coral px-6 py-2.5 text-sm"
            >
              Mở phòng hội thoại
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200/80 bg-white shadow-xs overflow-hidden divide-y divide-gray-100">
            {conversations.map((conv) => {
              const isOpen = expandedId === conv.id;
              const msgs = detailCache[conv.id] ?? [];
              const parsedReport = parseConversationReport(conv.summaryVi);
              const scoreTone =
                parsedReport && parsedReport.overallScore > 0
                  ? getScoreTone(parsedReport.overallScore)
                  : null;
              const matchedPersona =
                AI_PERSONAS.find(
                  (p) =>
                    p.name.toLowerCase() === (conv.aiPersona || '').toLowerCase() ||
                    p.accent === conv.accent
                ) ?? AI_PERSONAS[0];

              return (
                <div key={conv.id}>
                  <button
                    type="button"
                    onClick={() => void toggleConversation(conv)}
                    className="flex w-full items-center justify-between gap-4 p-4 sm:px-6 text-left hover:bg-gray-50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <TutorAvatar
                        personaId={matchedPersona.id}
                        className="h-11 w-11 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 truncate">
                            {conv.scenarioTitle}
                          </span>
                          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">
                            {conv.aiPersona} · {conv.accent}
                          </span>
                          {parsedReport && scoreTone && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${scoreTone.pillLight}`}
                            >
                              <Award className="h-3 w-3" />
                              {parsedReport.overallScore}/100 ·{' '}
                              {parsedReport.cefrEstimate}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-gray-500 tabular-nums">
                          <span>
                            {new Date(conv.startedAt).toLocaleString('vi-VN')}
                          </span>
                          <span>·</span>
                          <span>
                            {Math.max(1, Math.round(conv.durationSeconds / 60))} phút
                          </span>
                          <span>·</span>
                          <span>{conv.messageCount} lượt trao đổi</span>
                        </div>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-[#F6F7F9] p-4 sm:p-6 space-y-5">
                      {parsedReport && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-gray-900">
                            Báo cáo tổng kết buổi hội thoại
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
                        <div className="text-xs font-bold text-gray-700">
                          Bản ghi chi tiết lời thoại
                        </div>

                        {loadingDetail === conv.id ? (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải nội dung...
                          </div>
                        ) : msgs.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            Chưa có bản ghi chi tiết cho buổi này.
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
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white border border-gray-200 text-gray-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm sm:text-[15px] font-medium leading-relaxed">
                                    {m.englishText}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      speakSentence(
                                        m.naturalRewrite || m.englishText,
                                        conv.accent
                                      )
                                    }
                                    className={`shrink-0 rounded-full p-1.5 cursor-pointer ${
                                      m.role === 'user'
                                        ? 'bg-white/15 text-white hover:bg-white/25'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    <Volume2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {m.vietnameseTranslation && (
                                  <p
                                    className={`mt-1 text-xs ${
                                      m.role === 'user'
                                        ? 'text-white/80'
                                        : 'text-gray-500'
                                    }`}
                                  >
                                    {m.vietnameseTranslation}
                                  </p>
                                )}

                                {m.naturalRewrite && (
                                  <div className="mt-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white">
                                    Cách diễn đạt tự nhiên hơn:{' '}
                                    <strong>{m.naturalRewrite}</strong>
                                  </div>
                                )}

                                {m.coachingTip && (
                                  <p className="mt-1.5 text-xs opacity-90">
                                    Góp ý: {m.coachingTip}
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
