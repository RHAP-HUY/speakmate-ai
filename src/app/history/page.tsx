'use client';

import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Loader2,
  MessageSquare,
  Sparkles,
  Volume2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { playNaturalVoice } from '@/lib/audio';
import {
  getConversationDetail,
  getCurrentProfile,
  getDailyStats,
  listConversations,
} from '@/lib/data-store';
import { AI_PERSONAS } from '@/lib/scenarios';
import type {
  ConversationRecord,
  DailyStat,
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
      if (!isAuth) {
        router.replace('/auth?next=/history');
        return;
      }
      setProfile(prof);
      setAuthenticated(true);

      const [convs, daily] = await Promise.all([
        listConversations(),
        getDailyStats(7),
      ]);
      if (!active) return;
      setConversations(convs);
      setStats(daily);
      setLoading(false);
    }
    load();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const days = getLast7DaysLabels();
  const statByDate = new Map(stats.map((s) => [s.practiceDate, s]));
  const totalMinutesAll = Math.round(
    conversations.reduce((acc, c) => acc + c.durationSeconds, 0) / 60
  );
  const goalMinutes = profile?.dailyGoalMinutes ?? 15;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 md:pb-10">
      <AppNav profile={profile} authenticated={authenticated} />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tiến độ & Lịch sử Luyện nói
          </h1>
          <p className="text-sm text-slate-600">
            Theo dõi thời gian nói mỗi ngày và xem lại từng câu AI đã sửa cho bạn.
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid gap-3 grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Flame className="h-4 w-4 text-amber-500" />
              Chuỗi ngày học
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {profile?.streakDays ?? 0} ngày
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Clock className="h-4 w-4 text-indigo-600" />
              Tổng thời gian
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {totalMinutesAll} phút
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <MessageSquare className="h-4 w-4 text-cyan-600" />
              Số cuộc gọi
            </div>
            <div className="mt-1.5 text-2xl font-bold text-slate-900">
              {conversations.length}
            </div>
          </div>
        </div>

        {/* 7-day Progress Chart */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              7 ngày gần nhất (Mục tiêu: {goalMinutes} phút/ngày)
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
                  <span className="text-[11px] font-semibold text-slate-600">
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
          <h2 className="text-base font-bold text-slate-900">
            Các buổi trò chuyện gần đây
          </h2>

          {conversations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-slate-800">
                Chưa có lịch sử cuộc gọi nào
              </p>
              <p className="mt-1 text-xs text-slate-500 mb-4">
                Bắt đầu một cuộc gọi ngắn 3 phút để xem tiến trình của bạn tại đây nhé!
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

                return (
                  <div
                    key={conv.id}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
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
                      <div className="border-t border-slate-100 bg-slate-50/70 p-4 space-y-3">
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
                              className={`rounded-2xl p-3 text-sm ${
                                m.role === 'user'
                                  ? 'bg-indigo-600 text-white ml-6'
                                  : 'bg-white border border-slate-200 text-slate-900 mr-6'
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
                                    Tự nhiên hơn: <strong>{m.naturalRewrite}</strong>
                                  </span>
                                </div>
                              )}

                              {m.coachingTip && (
                                <p className="mt-1.5 text-xs opacity-90">
                                  💡 {m.coachingTip}
                                </p>
                              )}
                            </div>
                          ))
                        )}
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
