'use client';

import {
  Award,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  Trash2,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TutorAvatar } from '@/components/BrandArt';
import { CallReportView } from '@/components/CallReportView';
import { WorkspacePageSkeleton } from '@/components/PageSkeleton';
import {
  PronunciationBadge,
  getScoreTone,
} from '@/components/PronunciationBadge';
import {
  PronunciationPracticeModal,
  type PronunciationPracticeTarget,
} from '@/components/PronunciationPracticeModal';
import { StreakCalendar } from '@/components/StreakCalendar';
import { StreakRewardsPanel } from '@/components/StreakRewardsPanel';
import { playNaturalVoice, stopVoicePlayback } from '@/lib/audio';
import {
  applyStreakFreezeForYesterday,
  claimStreakMilestone,
  deleteConversationRecord,
  equipBadge,
  getConversationDetail,
  getCurrentProfile,
  getDailyStats,
  getTodayLocalDate,
  listConversations,
  listRecentAssessedMessages,
  purchaseShopReward,
  savePhrase,
} from '@/lib/data-store';
import { getLevelInfo } from '@/lib/gamification';
import { analyzePronunciationInsights } from '@/lib/pronunciation-insights';
import { AI_PERSONAS, pickPersona } from '@/lib/scenarios';
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
  const [assessedMsgs, setAssessedMsgs] = useState<TutorMessage[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [practiceTarget, setPracticeTarget] =
    useState<PronunciationPracticeTarget | null>(null);

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

      const [convs, daily, recentAssessed] = await Promise.all([
        listConversations(),
        getDailyStats(180),
        listRecentAssessedMessages(25),
      ]);
      if (!active) return;
      setConversations(convs);
      setStats(daily);
      setAssessedMsgs(recentAssessed);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
      stopVoicePlayback();
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

  async function handleDeleteConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (expandedId === id) setExpandedId(null);
    setConfirmDeleteId(null);
    await deleteConversationRecord(id);
    const refreshed = await listRecentAssessedMessages(25);
    setAssessedMsgs(refreshed);
  }

  const pronInsights = useMemo(
    () => analyzePronunciationInsights(assessedMsgs),
    [assessedMsgs]
  );

  if (loading || !profile) {
    return <WorkspacePageSkeleton title="Nhật ký học tập" />;
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

      {/* Personal Pronunciation Profile & Weak-Word Drill */}
      {pronInsights.totalAssessedTurns > 0 && (
        <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-5 tabular-nums">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900">
                Hồ sơ phát âm &amp; Từ cần luyện kỹ
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Tổng hợp từ {pronInsights.totalAssessedTurns} lượt nói có chấm âm vị gần đây — chạm vào từ để đọc lại và chấm điểm ngay.
              </p>
            </div>

            {pronInsights.trendDelta !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                  pronInsights.trendDelta >= 0
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {pronInsights.trendDelta >= 0
                  ? `+${pronInsights.trendDelta} điểm so với giai đoạn đầu`
                  : `${pronInsights.trendDelta} điểm · Hãy nói chậm rõ âm cuối`}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Điểm tổng thể', val: pronInsights.avgOverall },
              { label: 'Độ rõ âm vị', val: pronInsights.avgAccuracy },
              { label: 'Độ trôi chảy', val: pronInsights.avgFluency },
              { label: 'Ngữ điệu câu', val: pronInsights.avgIntonation },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-gray-200/80 bg-[#F6F7F9] px-4 py-3"
              >
                <div className="text-[11px] font-medium text-gray-500">
                  {item.label}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-gray-900">
                    {item.val}
                  </span>
                  <span className="text-xs text-gray-400">/100</span>
                </div>
              </div>
            ))}
          </div>

          {pronInsights.weakWords.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="text-xs font-bold text-gray-700">
                Các từ bạn hay phát âm thiếu âm cuối hoặc lệch trọng âm:
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {pronInsights.weakWords.map((w) => (
                  <div
                    key={w.word}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-[#F6F7F9] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {w.word}
                        </span>
                        {w.ipa && (
                          <span className="font-mono text-xs text-emerald-700">
                            /{w.ipa.replace(/^\/|\/$/g, '')}/
                          </span>
                        )}
                        {w.count > 1 && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-[#E5483F]">
                            {w.count} lần
                          </span>
                        )}
                      </div>
                      {w.tipVi && (
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {w.tipVi}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        stopVoicePlayback();
                        setPracticeTarget({
                          sentence: w.sampleSentence || w.word,
                          phonetic: w.ipa ?? undefined,
                          vietnamese: w.tipVi ? `Lưu ý: ${w.tipVi}` : undefined,
                        });
                      }}
                      className="btn-duo btn-duo-white shrink-0 px-3 py-1.5 text-xs"
                    >
                      <Mic className="h-3.5 w-3.5 text-[#E5483F]" />
                      Đọc lại
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-bold text-gray-700">
                          Bản ghi chi tiết lời thoại
                        </div>

                        {confirmDeleteId === conv.id ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-gray-500">Xóa buổi này?</span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteConversation(conv.id)
                              }
                              className="rounded-full bg-[#E5483F] px-3 py-1 font-semibold text-white hover:bg-[#cf3a31] cursor-pointer"
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(conv.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-medium text-gray-500 hover:border-rose-200 hover:text-[#E5483F] transition cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            Xóa nhật ký này
                          </button>
                        )}
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

      <PronunciationPracticeModal
        target={practiceTarget}
        persona={pickPersona(profile.preferredAccent)}
        profile={profile}
        onClose={() => setPracticeTarget(null)}
      />
    </AppShell>
  );
}
