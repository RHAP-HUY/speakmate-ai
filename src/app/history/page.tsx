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
      <div className="min-h-screen flex items-center justify-center bg-[#FBF9F5]">
        <Loader2 className="h-5 w-5 animate-spin text-[#78716C]" />
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
      {/* Open Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E2D8]">
        <div className="space-y-1">
          <p className="font-serif-display italic text-sm text-[#C2410C]">
            Nhật ký rèn luyện &amp; Thành tựu
          </p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
            Lịch chuỗi ngày học, phần thưởng &amp; lưu trữ hội thoại
          </h1>
        </div>

        <Link
          href="/play"
          className="btn-duo btn-duo-primary shrink-0 px-5 py-2.5 text-xs"
        >
          Thực hành bài hôm nay →
        </Link>
      </div>

      {/* Editorial Metrics Ledger (Divided by Hairlines, Not 4 Separate Boxes) */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-2 border-b border-[#E7E2D8] pb-6 tabular-nums">
        <div>
          <dt className="text-xs text-[#78716C]">Chuỗi ngày hiện tại</dt>
          <dd className="font-serif-display text-3xl font-semibold text-[#1C1917] mt-1">
            {profile.streakDays} ngày
          </dd>
          <div className="text-[11px] text-[#78716C] mt-0.5">
            Kỷ lục: {Math.max(profile.streakDays, profile.longestStreak)} ngày
          </div>
        </div>

        <div>
          <dt className="text-xs text-[#78716C]">Cấp độ &amp; Kinh nghiệm</dt>
          <dd className="font-serif-display text-3xl font-semibold text-[#1C1917] mt-1">
            Cấp {levelInfo.level}
          </dd>
          <div className="text-[11px] text-[#78716C] mt-0.5">
            {profile.xp} XP · {profile.totalLessonsCompleted} bài hoàn thành
          </div>
        </div>

        <div>
          <dt className="text-xs text-[#78716C]">Điểm thưởng &amp; Khiên</dt>
          <dd className="font-serif-display text-3xl font-semibold text-[#1C1917] mt-1">
            {profile.gems}
          </dd>
          <div className="text-[11px] text-[#78716C] mt-0.5">
            {profile.streakFreezes} Khiên bảo vệ chuỗi
          </div>
        </div>

        <div>
          <dt className="text-xs text-[#78716C]">Tổng thời lượng nói</dt>
          <dd className="font-serif-display text-3xl font-semibold text-[#1C1917] mt-1">
            {totalMinutesAll} phút
          </dd>
          <div className="text-[11px] text-[#78716C] mt-0.5">
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
      <section className="card-duo p-5 sm:p-6 space-y-4 tabular-nums">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif-display text-lg font-semibold text-[#1C1917]">
            Thời lượng 7 ngày gần nhất
          </h2>
          <span className="text-xs text-[#78716C]">
            Mục tiêu: {goalMinutes} phút/ngày
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3 items-end h-32 pt-2">
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
                <span className="text-[11px] font-medium text-[#57534E]">
                  {mins}p
                </span>
                <div className="w-full max-w-10 flex-1 flex items-end bg-[#F3EFE6] rounded-md overflow-hidden">
                  <div
                    className={`w-full rounded-md transition-all ${
                      metGoal
                        ? 'bg-[#14532D]'
                        : mins > 0
                          ? 'bg-[#C2410C]'
                          : 'bg-[#E7E2D8]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-[#78716C]">
                  {d.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Conversation List & Reports */}
      <section className="space-y-4">
        <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
          Lưu trữ các buổi hội thoại &amp; Báo cáo đánh giá
        </h2>

        {conversations.length === 0 ? (
          <div className="rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/50 p-10 text-center space-y-3">
            <p className="font-serif-display text-lg font-semibold text-[#1C1917]">
              Chưa có buổi hội thoại nào được ghi nhận
            </p>
            <p className="text-xs text-[#57534E]">
              Hoàn thành một cuộc trò chuyện từ 3 lượt nói trở lên để nhận bản phân tích 4 kỹ năng.
            </p>
            <Link
              href="/call"
              className="btn-duo btn-duo-primary px-5 py-2.5 text-xs"
            >
              Mở phòng hội thoại
            </Link>
          </div>
        ) : (
          <div className="card-duo overflow-hidden divide-y divide-[#E7E2D8]">
            {conversations.map((conv) => {
              const isOpen = expandedId === conv.id;
              const msgs = detailCache[conv.id] ?? [];
              const parsedReport = parseConversationReport(conv.summaryVi);
              const scoreTone =
                parsedReport && parsedReport.overallScore > 0
                  ? getScoreTone(parsedReport.overallScore)
                  : null;

              return (
                <div key={conv.id}>
                  <button
                    type="button"
                    onClick={() => void toggleConversation(conv)}
                    className="flex w-full items-center justify-between p-4 sm:px-5 text-left hover:bg-[#FBF9F5] transition cursor-pointer"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#1C1917]">
                          {conv.scenarioTitle}
                        </span>
                        <span className="rounded-full bg-[#F3EFE6] px-2.5 py-0.5 text-[11px] font-medium text-[#57534E]">
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
                      <div className="mt-1 flex items-center gap-3 text-xs text-[#78716C] tabular-nums">
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
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#78716C]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#78716C]" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="border-t border-[#E7E2D8] bg-[#FBF9F5] p-4 sm:p-5 space-y-5">
                      {parsedReport && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-[#14532D]">
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
                        <div className="text-xs font-semibold text-[#57534E]">
                          Bản ghi chi tiết lời thoại
                        </div>

                        {loadingDetail === conv.id ? (
                          <div className="flex items-center gap-2 text-xs text-[#78716C]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải nội dung...
                          </div>
                        ) : msgs.length === 0 ? (
                          <p className="text-xs text-[#78716C]">
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
                                className={`w-full sm:max-w-[85%] rounded-xl p-3.5 text-sm ${
                                  m.role === 'user'
                                    ? 'bg-[#14532D] text-white'
                                    : 'bg-white border border-[#E7E2D8] text-[#1C1917]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-serif-display text-[15px] leading-relaxed">
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
                                        : 'bg-[#F3EFE6] text-[#1C1917] hover:bg-[#E7E2D8]'
                                    }`}
                                  >
                                    <Volume2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {m.vietnameseTranslation && (
                                  <p
                                    className={`mt-1 text-xs ${
                                      m.role === 'user'
                                        ? 'text-white/85'
                                        : 'text-[#57534E]'
                                    }`}
                                  >
                                    {m.vietnameseTranslation}
                                  </p>
                                )}

                                {m.naturalRewrite && (
                                  <div className="mt-2 rounded-lg bg-black/15 px-3 py-1.5 text-xs text-white">
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
