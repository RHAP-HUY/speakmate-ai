'use client';

import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Cloud,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  Headphones,
  Loader2,
  Mic,
  PhoneCall,
  Play,
  Puzzle,
  Shield,
  Sparkles,
  Star,
  Wand2,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import {
  GemSvg,
  LeagueTrophySvg,
  NovaCompanion,
  ShieldFreezeSvg,
  StreakFlameSvg,
  TreasureChestSvg,
} from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import {
  applyStreakFreezeForYesterday,
  claimDailyQuestReward,
  claimStreakMilestone,
  getAuthSessionInfo,
  getCurrentProfile,
  getDailyStats,
  getTodayLocalDate,
} from '@/lib/data-store';
import {
  computeStrictStreak,
  DAILY_QUEST_DEFS,
  getClaimableMilestones,
  getLeagueInfo,
  getLevelInfo,
  getXpBoostRemainingMinutes,
  isXpBoostActive,
  shiftDateString,
  STREAK_MILESTONES,
} from '@/lib/gamification';
import { AI_PERSONAS, pickPersona, SCENARIOS } from '@/lib/scenarios';
import { playChestOpenSound, playTapSound } from '@/lib/sound-fx';
import type {
  AuthSessionInfo,
  DailyStat,
  TopicCategory,
  UserProfile,
} from '@/types';

type PathStationKind =
  | 'speed'
  | 'build'
  | 'listen'
  | 'ai-quiz'
  | 'call'
  | 'pronounce'
  | 'chest'
  | 'boss';

interface PathStation {
  id: string;
  kind: PathStationKind;
  titleVi: string;
  subtitleVi: string;
  xpLabel: string;
  gemsLabel: string;
  href?: string;
  scenarioId?: string;
  offsetPx: number;
}

interface LearningUnit {
  id: string;
  sectionLabel: string;
  titleVi: string;
  subtitleVi: string;
  category: TopicCategory;
  bannerBg: string;
  bannerLip: string;
  nodeBg: string;
  nodeShadow: string;
  accentText: string;
  mascotTipVi: string;
  stations: PathStation[];
}

const LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-daily',
    sectionLabel: 'CHẶNG 1 · ĐỜI SỐNG',
    titleVi: 'Phản xạ Quán Cà Phê & Kết bạn',
    subtitleVi:
      'Vừa chơi game vừa luyện nghe – nói tự nhiên như người bản xứ chỉ 2 phút/màn',
    category: 'daily',
    bannerBg: 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500',
    bannerLip: 'border-b-4 border-indigo-900/35',
    nodeBg: 'bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500',
    nodeShadow: 'shadow-[0_7px_0_#3730A3,0_16px_28px_-6px_rgba(79,70,229,0.5)]',
    accentText: 'text-indigo-700',
    mascotTipVi:
      'Nova sẵn sàng rồi! Chơi xong chỉ 1 trạm là thắp lửa giữ chuỗi hôm nay & mở quà Nhiệm vụ! 🔥',
    stations: [
      {
        id: 'u1-1',
        kind: 'speed',
        titleVi: 'Game Phản xạ Nhanh',
        subtitleVi: 'Chọn câu nói bản xứ trong 15s, giữ Combo x5!',
        xpLabel: '+85 XP',
        gemsLabel: '+20 💎',
        href: '/play?mode=speed&category=daily',
        offsetPx: 0,
      },
      {
        id: 'u1-2',
        kind: 'listen',
        titleVi: 'Nghe Hiểu Bản Xứ',
        subtitleVi: 'Nghe giọng thật ở quán cà phê & đoán đúng ý người nói',
        xpLabel: '+90 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=listen&category=daily',
        offsetPx: -54,
      },
      {
        id: 'u1-3',
        kind: 'build',
        titleVi: 'Nghe & Ghép Câu',
        subtitleVi: 'Xếp thẻ từ siêu vui để nhớ chắc cấu trúc bản xứ',
        xpLabel: '+95 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=build&category=daily',
        offsetPx: -76,
      },
      {
        id: 'u1-4',
        kind: 'call',
        titleVi: 'Nhập vai Quán Cà Phê',
        subtitleVi: 'Gọi ly iced latte & tám chuyện trực tiếp cùng Barista AI',
        xpLabel: '+60 XP',
        gemsLabel: '+15 💎',
        scenarioId: 'daily-coffee-shop',
        offsetPx: -26,
      },
      {
        id: 'u1-5',
        kind: 'chest',
        titleVi: 'Rương Thưởng Chuỗi',
        subtitleVi: 'Mở rương nhận Ngọc 💎, XP, Khiên 🧊 & Huy hiệu',
        xpLabel: 'Quà mốc ngày',
        gemsLabel: '💎 + 🧊',
        offsetPx: 50,
      },
      {
        id: 'u1-6',
        kind: 'boss',
        titleVi: 'Boss: Small Talk Sở thích',
        subtitleVi: 'Trò chuyện tự nhiên xoay quanh chính sở thích của bạn',
        xpLabel: '+80 XP',
        gemsLabel: '+25 💎',
        scenarioId: 'daily-small-talk',
        offsetPx: 6,
      },
    ],
  },
  {
    id: 'unit-business',
    sectionLabel: 'CHẶNG 2 · CÔNG SỞ',
    titleVi: 'Tự tin Họp hành & Phỏng vấn',
    subtitleVi:
      'Luyện phản xạ tiếng Anh công việc chuẩn quốc tế qua game, nghe hiểu & nhập vai',
    category: 'business',
    bannerBg: 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600',
    bannerLip: 'border-b-4 border-violet-950/35',
    nodeBg: 'bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600',
    nodeShadow: 'shadow-[0_7px_0_#5B21B6,0_16px_28px_-6px_rgba(124,58,237,0.5)]',
    accentText: 'text-violet-700',
    mascotTipVi:
      'Cụm "heads-up", "circle back" & "get back to you" dùng cực chuyên nghiệp ở công ty!',
    stations: [
      {
        id: 'u2-1',
        kind: 'speed',
        titleVi: 'Game Phản xạ Công sở',
        subtitleVi: 'Xử lý tình huống họp & email cực tự nhiên',
        xpLabel: '+85 XP',
        gemsLabel: '+20 💎',
        href: '/play?mode=speed&category=business',
        offsetPx: 0,
      },
      {
        id: 'u2-2',
        kind: 'listen',
        titleVi: 'Nghe Hiểu Họp Zoom',
        subtitleVi: 'Nghe thông báo deadline, dời lịch họp & phản xạ nhanh',
        xpLabel: '+90 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=listen&category=business',
        offsetPx: -54,
      },
      {
        id: 'u2-3',
        kind: 'build',
        titleVi: 'Ghép câu Công việc',
        subtitleVi: 'Xếp cấu trúc câu chuyên nghiệp không dịch từng chữ',
        xpLabel: '+95 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=build&category=business',
        offsetPx: -76,
      },
      {
        id: 'u2-4',
        kind: 'pronounce',
        titleVi: 'Phát âm Chuẩn Quốc tế',
        subtitleVi: 'AI chấm điểm trọng âm & nối âm câu công sở',
        xpLabel: '+110 XP',
        gemsLabel: '+30 💎',
        href: '/play?mode=pronounce&category=business',
        offsetPx: -26,
      },
      {
        id: 'u2-5',
        kind: 'chest',
        titleVi: 'Rương Thưởng Kiên trì',
        subtitleVi: 'Kiểm tra và mở quà khi đạt mốc chuỗi học tập!',
        xpLabel: 'Quà mốc ngày',
        gemsLabel: '💎 + 🧊',
        offsetPx: 50,
      },
      {
        id: 'u2-6',
        kind: 'boss',
        titleVi: 'Boss: Phỏng vấn Xin việc',
        subtitleVi: 'Trả lời câu hỏi nhà tuyển dụng nước ngoài tự tin',
        xpLabel: '+90 XP',
        gemsLabel: '+30 💎',
        scenarioId: 'business-interview',
        offsetPx: 6,
      },
    ],
  },
  {
    id: 'unit-travel',
    sectionLabel: 'CHẶNG 3 · DU LỊCH',
    titleVi: 'Du lịch Quốc tế Không Ngại Giao Tiếp',
    subtitleVi:
      'Sân bay, nhà hàng, khách sạn — chơi vui là thuộc lòng câu bản xứ',
    category: 'travel',
    bannerBg: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500',
    bannerLip: 'border-b-4 border-emerald-900/35',
    nodeBg: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
    nodeShadow: 'shadow-[0_7px_0_#047857,0_16px_28px_-6px_rgba(16,185,129,0.5)]',
    accentText: 'text-emerald-700',
    mascotTipVi:
      'Chinh phục xong chặng này đi du lịch nước ngoài tự tin check-in & gọi món ngay! ✈️',
    stations: [
      {
        id: 'u3-1',
        kind: 'speed',
        titleVi: 'Game Phản xạ Sân bay',
        subtitleVi: 'Trả lời hải quan, hỏi đường & thanh toán chuẩn Tây',
        xpLabel: '+85 XP',
        gemsLabel: '+20 💎',
        href: '/play?mode=speed&category=travel',
        offsetPx: 0,
      },
      {
        id: 'u3-2',
        kind: 'listen',
        titleVi: 'Nghe Loa Sân bay & Chỉ đường',
        subtitleVi: 'Luyện nghe thông báo đổi cổng bay, bữa sáng & đường đi',
        xpLabel: '+90 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=listen&category=travel',
        offsetPx: -54,
      },
      {
        id: 'u3-3',
        kind: 'call',
        titleVi: 'Check-in Sân bay & Hải quan',
        subtitleVi: 'Nhập vai trò chuyện trực tiếp cùng nhân viên sân bay',
        xpLabel: '+60 XP',
        gemsLabel: '+15 💎',
        scenarioId: 'travel-airport',
        offsetPx: -76,
      },
      {
        id: 'u3-4',
        kind: 'pronounce',
        titleVi: 'Đấu trường Phát âm Du lịch',
        subtitleVi: 'Đọc rõ âm cuối để người bản xứ hiểu ngay lần đầu',
        xpLabel: '+110 XP',
        gemsLabel: '+30 💎',
        href: '/play?mode=pronounce&category=travel',
        offsetPx: -26,
      },
      {
        id: 'u3-5',
        kind: 'chest',
        titleVi: 'Rương Kho Báu Bản Xứ',
        subtitleVi: 'Thu thập phần thưởng khi giữ vững chuỗi ngày học!',
        xpLabel: 'Quà mốc ngày',
        gemsLabel: '💎 + 🧊',
        offsetPx: 50,
      },
      {
        id: 'u3-6',
        kind: 'boss',
        titleVi: 'Boss: Gọi món Nhà hàng',
        subtitleVi: 'Đặt bàn, hỏi món gợi ý & thanh toán trôi chảy',
        xpLabel: '+90 XP',
        gemsLabel: '+30 💎',
        scenarioId: 'travel-restaurant',
        offsetPx: 6,
      },
    ],
  },
  {
    id: 'unit-ai-infinite',
    sectionLabel: 'CHẶNG 4 · AI CÁ NHÂN HÓA',
    titleVi: 'Đấu trường Vô Tận Theo Sở Thích Của Bạn',
    subtitleVi:
      'AI tạo màn chơi mới không bao giờ trùng lặp theo đúng nghề nghiệp & sở thích bạn chọn',
    category: 'freetalk',
    bannerBg: 'bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600',
    bannerLip: 'border-b-4 border-rose-900/35',
    nodeBg: 'bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600',
    nodeShadow: 'shadow-[0_7px_0_#BE123C,0_16px_28px_-6px_rgba(244,63,94,0.48)]',
    accentText: 'text-rose-600',
    mascotTipVi:
      'Mỗi lần bấm "AI Tạo Màn Chơi" là một bộ 5 câu mới toanh đúng gu của riêng bạn! ✨',
    stations: [
      {
        id: 'u4-1',
        kind: 'ai-quiz',
        titleVi: 'AI Tạo Màn Chơi Theo Gu',
        subtitleVi: 'Gemini tự chế 5 câu phản xạ mới toanh từ sở thích của bạn',
        xpLabel: '+100 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=ai-quiz',
        offsetPx: 0,
      },
      {
        id: 'u4-2',
        kind: 'listen',
        titleVi: 'Siêu Nghe Hiểu Hỗn Hợp',
        subtitleVi: 'Tổng hợp câu nói tự nhiên từ Đời sống, Công sở & Du lịch',
        xpLabel: '+95 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=listen',
        offsetPx: -54,
      },
      {
        id: 'u4-3',
        kind: 'pronounce',
        titleVi: 'Đấu trường Phát âm Chuyên sâu',
        subtitleVi: 'Phá kỷ lục 90/100 điểm phát âm cùng AI chấm từng từ',
        xpLabel: '+120 XP',
        gemsLabel: '+30 💎',
        href: '/play?mode=pronounce',
        offsetPx: -76,
      },
      {
        id: 'u4-4',
        kind: 'speed',
        titleVi: 'Tốc độ Tổng hợp 15s',
        subtitleVi: 'Trộn toàn bộ kho câu bản xứ 30+ tình huống thực tế',
        xpLabel: '+100 XP',
        gemsLabel: '+25 💎',
        href: '/play?mode=speed',
        offsetPx: -26,
      },
      {
        id: 'u4-5',
        kind: 'chest',
        titleVi: 'Rương Huyền Thoại 60–100 Ngày',
        subtitleVi: 'Chinh phục rương lớn nhất cộng đồng SpeakMate AI!',
        xpLabel: 'Siêu thưởng',
        gemsLabel: '💎 + 👑',
        offsetPx: 50,
      },
      {
        id: 'u4-6',
        kind: 'boss',
        titleVi: 'Boss: Trò chuyện Tự do AI',
        subtitleVi: 'Gọi điện tám chuyện không giới hạn như bạn thân nước ngoài',
        xpLabel: '+100 XP',
        gemsLabel: '+30 💎',
        scenarioId: 'free-talk-custom',
        offsetPx: 6,
      },
    ],
  },
];

const CUSTOM_ROLEPLAY_PRESETS = [
  'Phỏng vấn lập trình viên bằng tiếng Anh',
  'Mặc cả mua quà lưu niệm khi đi du lịch',
  'Trò chuyện về phim ảnh & game với bạn mới',
  'Đặt lịch khám bệnh & mô tả triệu chứng',
];

function getStationIcon(kind: PathStationKind) {
  switch (kind) {
    case 'speed':
      return Zap;
    case 'build':
      return Puzzle;
    case 'listen':
      return Headphones;
    case 'ai-quiz':
      return Wand2;
    case 'call':
      return PhoneCall;
    case 'pronounce':
      return Mic;
    case 'boss':
      return Crown;
    default:
      return Gift;
  }
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);

  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('auto');
  const [showScenarioDrawer, setShowScenarioDrawer] = useState(false);
  const [customRoleplayInput, setCustomRoleplayInput] = useState('');
  const [claimingDays, setClaimingDays] = useState<number | null>(null);
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [{ profile: prof, authenticated: isAuth }, sInfo] =
        await Promise.all([getCurrentProfile(), getAuthSessionInfo()]);
      if (!active) return;

      setAuthenticated(isAuth);
      setProfile(prof);
      setSessionInfo(sInfo);

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

    void load();
    return () => {
      active = false;
    };
  }, [router]);

  function startCall(scenarioId: string, customTopic?: string) {
    playTapSound();
    const resolvedPersona =
      selectedPersonaId === 'auto'
        ? pickPersona(profile?.preferredAccent ?? 'US').id
        : selectedPersonaId;
    const params = new URLSearchParams({
      scenario: scenarioId,
      persona: resolvedPersona,
    });
    if (customTopic?.trim()) {
      params.set('customTopic', customTopic.trim());
    }
    router.push(`/call?${params.toString()}`);
  }

  async function handleClaimStreakReward(days: number) {
    const milestone = STREAK_MILESTONES.find((m) => m.days === days);
    if (!milestone) return;
    setClaimingDays(days);
    try {
      const updated = await claimStreakMilestone(days);
      setProfile(updated);
      playChestOpenSound();
      setCelebration({
        title: `Mốc Chuỗi ${milestone.days} Ngày: ${milestone.titleVi}!`,
        subtitle: milestone.subtitleVi,
        xp: milestone.rewardXp,
        gems: milestone.rewardGems,
        freezes: milestone.rewardFreezes,
        badgeLabel: milestone.badgeLabel,
      });
    } finally {
      setClaimingDays(null);
    }
  }

  async function handleClaimDailyQuest(questId: string, questTitle: string) {
    setClaimingQuestId(questId);
    try {
      const res = await claimDailyQuestReward(questId);
      setProfile(res.profile);
      if (res.gemsEarned > 0 || res.xpEarned > 0) {
        playChestOpenSound();
        setCelebration({
          title: 'Hoàn thành Nhiệm Vụ Hôm Nay! 🎁',
          subtitle: questTitle,
          xp: res.xpEarned,
          gems: res.gemsEarned,
        });
      }
    } finally {
      setClaimingQuestId(null);
    }
  }

  async function handleQuickFreeze() {
    setFreezing(true);
    try {
      const res = await applyStreakFreezeForYesterday();
      setProfile(res.profile);
      setStats(res.stats);
      playChestOpenSound();
      setCelebration({
        title: 'Đã cứu chuỗi thành công! 🧊',
        subtitle: `Khiên Bảo Vệ đã giữ nguyên chuỗi ${res.profile.streakDays} ngày cho bạn.`,
      });
    } finally {
      setFreezing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mesh-light">
        <NovaCompanion mood="happy" className="h-18 w-18 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  // PUBLIC FLAGSHIP LANDING PAGE (Aurora Studio Split Hero)
  if (!authenticated || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-mesh-light">
        <AppNav profile={null} authenticated={false} variant="landing" />

        <main className="flex-1">
          <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20 grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="aurora-studio-card relative w-full max-w-md rounded-[2rem] border border-white/15 p-7 shadow-2xl shadow-indigo-950/25">
                {/* Floating Glass Badges */}
                <div className="absolute -top-4 -right-3 flex items-center gap-1.5 rounded-2xl border border-orange-300/60 bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-lg animate-gentle-float">
                  <StreakFlameSvg active className="h-5 w-5" />
                  <span className="text-xs font-black text-orange-600">
                    7 ngày liên tiếp!
                  </span>
                </div>

                <div className="absolute top-16 -left-4 hidden sm:flex items-center gap-1.5 rounded-2xl border border-emerald-300/60 bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-lg">
                  <Mic className="h-4 w-4 text-emerald-600" />
                  <span className="text-[11px] font-black text-emerald-700">
                    94/100 Phát âm
                  </span>
                </div>

                <div className="absolute -bottom-4 -left-3 flex items-center gap-1.5 rounded-2xl border border-sky-300/60 bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-lg">
                  <GemSvg className="h-5 w-5" />
                  <span className="text-xs font-black text-indigo-700">
                    +130 Ngọc · Mở rương quà
                  </span>
                </div>

                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative flex flex-col items-center">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/25 blur-2xl scale-125 pointer-events-none" />
                    <NovaCompanion
                      mood="excited"
                      className="relative h-36 w-36 animate-gentle-float drop-shadow-[0_14px_24px_rgba(79,70,229,0.55)]"
                    />
                    {/* Live Voice Equalizer Strip */}
                    <div className="mt-1 flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 backdrop-blur-md">
                      <span className="h-2 w-1 rounded-full bg-cyan-300 animate-pulse" />
                      <span className="h-4 w-1 rounded-full bg-indigo-300 animate-pulse" />
                      <span className="h-5 w-1 rounded-full bg-cyan-300 animate-pulse" />
                      <span className="h-3 w-1 rounded-full bg-violet-300 animate-pulse" />
                      <span className="h-4 w-1 rounded-full bg-cyan-300 animate-pulse" />
                      <span className="ml-1.5 text-[11px] font-extrabold text-cyan-200">
                        Nova AI · Trực tuyến 24/7
                      </span>
                    </div>
                  </div>

                  <div className="w-full rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 text-left space-y-2.5 text-white">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-indigo-200">
                      <span>⚡ MINI-GAME PHẢN XẠ</span>
                      <span className="text-amber-300">COMBO x4 🔥</span>
                    </div>
                    <div className="text-sm font-black text-white">
                      “Gọi một ly latte đá cỡ vừa cực tự nhiên?”
                    </div>
                    <div className="rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-extrabold text-emerald-200 flex items-center justify-between">
                      <span>Can I get a medium iced latte, please?</span>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-3.5 py-1.5 text-xs font-extrabold text-indigo-700 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                Nova AI Voice Studio · Vừa Học Vừa Chơi · Google Drive 5TB
              </span>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.13]">
                Cách luyện nói tiếng Anh{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
                  đẹp, cuốn và dễ nghiện
                </span>{' '}
                mỗi ngày!
              </h1>

              <p className="text-base sm:text-lg font-medium text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Đồng hành cùng trợ lý giọng nói AI <strong>Nova</strong> qua 4 chặng lộ trình phát sáng, 5 chế độ mini-game phản xạ (kể cả AI tự tạo màn theo sở thích), gọi thoại nhập vai chấm phát âm từng từ và đồng bộ trọn đời trên Google Drive 5TB.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 max-w-md mx-auto lg:mx-0">
                <Link
                  href="/auth"
                  className="btn-duo btn-duo-primary flex-1 px-7 py-4 text-sm uppercase tracking-wide"
                >
                  Bắt đầu cùng Nova AI
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </Link>
                <Link
                  href="/auth"
                  className="btn-duo btn-duo-white px-6 py-4 text-sm uppercase tracking-wide text-indigo-700"
                >
                  Đăng nhập Google
                </Link>
              </div>
            </div>
          </section>

          <section className="border-t border-slate-200/80 bg-white/75 backdrop-blur-sm py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Gamepad2,
                  bg: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25',
                  title: '5 Chế độ Chơi & Học AI',
                  desc: 'Phản xạ 15s, Nghe hiểu bản xứ, Ghép câu, Đấu trường Phát âm & AI tạo màn vô tận.',
                },
                {
                  icon: Flame,
                  bg: 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25',
                  title: 'Lịch Chuỗi & Rương Thưởng',
                  desc: 'Mốc thưởng 1–100 ngày, Nhiệm vụ mở rương mỗi ngày, Bình 2x XP & Khiên bảo vệ.',
                },
                {
                  icon: Crown,
                  bg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25',
                  title: 'Bảng Xếp Hạng 5 Hạng Giải',
                  desc: 'Đua Top 3 thăng hạng mỗi tuần từ Giải Đồng lên Giải Kim Cương cùng cộng đồng.',
                },
                {
                  icon: Cloud,
                  bg: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25',
                  title: 'Đồng bộ Google Drive 5TB',
                  desc: 'Cài đặt lên màn hình điện thoại như app thật — đổi máy khôi phục 100% dữ liệu.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="card-duo-elevated p-5 space-y-3 hover:-translate-y-1 transition"
                  >
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg}`}
                    >
                      <Icon className="h-6 w-6 stroke-[2.3]" />
                    </div>
                    <h2 className="text-base font-black text-slate-900">
                      {item.title}
                    </h2>
                    <p className="text-xs font-medium leading-relaxed text-slate-600">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    );
  }

  // AUTHENTICATED PLAY-FIRST DUOLINGO EXPERIENCE
  const todayStr = getTodayLocalDate();
  const statByDate = new Map(stats.map((s) => [s.practiceDate, s]));
  const todayStats = statByDate.get(todayStr) ?? null;
  const strict = computeStrictStreak(stats, todayStr);
  const levelInfo = getLevelInfo(profile.xp);
  const league = getLeagueInfo(profile.xp);
  const boostActive = isXpBoostActive(profile.xpBoostUntil);
  const boostMins = getXpBoostRemainingMinutes(profile.xpBoostUntil);

  const claimableMilestones = getClaimableMilestones(
    profile.streakDays,
    profile.longestStreak,
    profile.claimedMilestones
  );
  const bestStreak = Math.max(profile.streakDays, profile.longestStreak);
  const nextMilestone =
    claimableMilestones[0] ??
    STREAK_MILESTONES.find((m) => m.days > bestStreak) ??
    STREAK_MILESTONES[STREAK_MILESTONES.length - 1];

  const practicedMinutes = Math.round((todayStats?.secondsPracticed ?? 0) / 60);
  const todayLessons = todayStats?.lessonsCompleted ?? 0;
  const todayXp = todayStats?.xpEarned ?? 0;
  const claimedQuestsToday = profile.claimedDailyQuests?.[todayStr] ?? [];

  const currentUnit = LEARNING_UNITS[activeUnitIdx] ?? LEARNING_UNITS[0];
  const completedInUnit = Math.min(
    currentUnit.stations.length,
    Math.max(0, profile.totalLessonsCompleted - activeUnitIdx * 5)
  );
  const activeStationIndex = Math.min(
    currentUnit.stations.length - 1,
    completedInUnit
  );

  const miniWeek = Array.from({ length: 7 }).map((_, idx) => {
    const dateStr = shiftDateString(todayStr, idx - 6);
    const st = statByDate.get(dateStr);
    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(yyyy, (mm || 1) - 1, dd || 1).getDay();
    const shortLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return {
      dateStr,
      label: idx === 6 ? 'Nay' : shortLabels[dayOfWeek],
      studied: (st?.lessonsCompleted ?? 0) >= 1,
      frozen: Boolean(st?.freezeUsed),
      isToday: idx === 6,
    };
  });

  const isDriveActive =
    sessionInfo?.storageMode === 'google-drive-owner' ||
    sessionInfo?.storageMode === 'google-drive-user';

  function handleLaunchStation(station: PathStation) {
    playTapSound();
    if (station.kind === 'chest') {
      if (claimableMilestones.length > 0) {
        void handleClaimStreakReward(claimableMilestones[0].days);
      } else {
        router.push('/history#rewards');
      }
      return;
    }
    if (station.href) {
      router.push(station.href);
      return;
    }
    if (station.scenarioId) {
      startCall(station.scenarioId);
    }
  }

  // RIGHT STICKY GAMIFICATION RAIL
  const rightRail = (
    <>
      {/* 1. Top Live Stats Bar (Desktop) */}
      <div className="hidden xl:grid grid-cols-3 gap-2">
        <Link
          href="/history"
          className="card-duo flex items-center justify-center gap-1.5 py-2.5 px-2 hover:border-orange-300 transition"
          title="Chuỗi ngày học liên tiếp"
        >
          <StreakFlameSvg active={profile.streakDays > 0} className="h-6 w-6" />
          <span className="text-base font-black text-[#FF9600]">
            {profile.streakDays}
          </span>
        </Link>
        <Link
          href="/history#rewards"
          className="card-duo flex items-center justify-center gap-1.5 py-2.5 px-2 hover:border-sky-300 transition"
          title="Ngọc đổi quà"
        >
          <GemSvg className="h-5 w-5" />
          <span className="text-base font-black text-[#1899D6]">
            {profile.gems}
          </span>
        </Link>
        <Link
          href="/history"
          className="card-duo flex items-center justify-center gap-1.5 py-2.5 px-2 hover:border-cyan-300 transition"
          title="Khiên Bảo Vệ Chuỗi"
        >
          <ShieldFreezeSvg className="h-5 w-5" />
          <span className="text-base font-black text-cyan-600">
            {profile.streakFreezes}
          </span>
        </Link>
      </div>

      {/* Active 2x XP Boost Pill */}
      {boostActive && (
        <div className="rounded-2xl border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black text-violet-800">
            <Zap className="h-4 w-4 fill-[#FFC800] text-[#FF9600]" />
            Đang nhân đôi 2x toàn bộ XP!
          </div>
          <span className="rounded-xl bg-violet-600 px-2.5 py-1 text-[11px] font-black text-white">
            Còn {boostMins}p
          </span>
        </div>
      )}

      {/* 2. CLAIMABLE STREAK REWARD CHEST CARD */}
      <section
        className={`rounded-3xl border-2 p-5 space-y-4 transition ${
          claimableMilestones.length > 0
            ? 'border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50/70 to-orange-50 shadow-md shadow-amber-500/10'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={
                claimableMilestones.length > 0 ? 'animate-chest-wiggle' : ''
              }
            >
              <TreasureChestSvg
                state={
                  claimableMilestones.length > 0
                    ? 'ready'
                    : profile.claimedMilestones.length >= STREAK_MILESTONES.length
                      ? 'opened'
                      : 'locked'
                }
                className="h-12 w-12"
              />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                Phần thưởng Chuỗi
              </div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">
                {claimableMilestones.length > 0
                  ? `Có ${claimableMilestones.length} rương quà chờ mở!`
                  : `Mốc ${nextMilestone.days} ngày: ${nextMilestone.titleVi}`}
              </h2>
            </div>
          </div>
          <Link
            href="/history#rewards"
            className="text-xs font-extrabold text-[#1899D6] hover:underline shrink-0"
          >
            Kho quà
          </Link>
        </div>

        {/* All 7 Milestone Pips (1 · 3 · 7 · 14 · 30 · 60 · 100 days) */}
        <div className="grid grid-cols-7 gap-1">
          {STREAK_MILESTONES.map((m) => {
            const claimed = profile.claimedMilestones.includes(m.days);
            const ready = bestStreak >= m.days && !claimed;
            return (
              <div
                key={m.days}
                className={`flex flex-col items-center rounded-xl border-2 py-1.5 px-0.5 text-center ${
                  ready
                    ? 'border-amber-400 bg-amber-100 text-amber-900'
                    : claimed
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                <span className="text-xs leading-none">
                  {claimed ? '✅' : ready ? '🎁' : m.emoji}
                </span>
                <span className="mt-1 text-[9px] font-black leading-none">
                  {m.days}d
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px] font-extrabold">
          <span className="rounded-lg bg-amber-100/90 px-2 py-1 text-amber-800">
            +{nextMilestone.rewardXp} XP
          </span>
          <span className="rounded-lg bg-sky-100/90 px-2 py-1 text-sky-800">
            +{nextMilestone.rewardGems} 💎
          </span>
          {nextMilestone.rewardFreezes > 0 && (
            <span className="rounded-lg bg-cyan-100/90 px-2 py-1 text-cyan-800">
              +{nextMilestone.rewardFreezes} 🧊
            </span>
          )}
          <span className="rounded-lg bg-indigo-100/80 px-2 py-1 text-indigo-800">
            {nextMilestone.badgeLabel}
          </span>
        </div>

        {claimableMilestones.length > 0 ? (
          <button
            type="button"
            disabled={claimingDays !== null}
            onClick={() => void handleClaimStreakReward(claimableMilestones[0].days)}
            className="btn-duo btn-duo-orange w-full py-3 text-xs uppercase tracking-wide"
          >
            <Gift className="h-4 w-4" />
            {claimingDays !== null
              ? 'Đang mở rương...'
              : `Mở rương mốc ${claimableMilestones[0].days} ngày ngay!`}
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500">
              <span>Tiến độ mở rương tiếp theo</span>
              <span className="text-amber-600">
                {Math.min(bestStreak, nextMilestone.days)}/{nextMilestone.days}{' '}
                ngày
              </span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="progress-gloss h-full rounded-full bg-gradient-to-r from-[#FF9600] to-[#FFC800] transition-all duration-500"
                style={{
                  width: `${Math.max(
                    8,
                    Math.min(100, Math.round((bestStreak / nextMilestone.days) * 100))
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 3. NHIỆM VỤ HÔM NAY CÓ RƯƠNG MỞ TRỰC TIẾP (Claimable Daily Quests!) */}
      <section className="card-duo p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800">
            Nhiệm vụ hôm nay
          </h2>
          <span className="text-[11px] font-black text-amber-600">
            {claimedQuestsToday.length}/{DAILY_QUEST_DEFS.length} rương
          </span>
        </div>

        <div className="space-y-3.5">
          {DAILY_QUEST_DEFS.map((q) => {
            const current =
              q.id === 'lesson_1'
                ? Math.min(1, todayLessons)
                : q.id === 'xp_60'
                  ? Math.min(60, todayXp)
                  : Math.min(profile.dailyGoalMinutes, practicedMinutes);
            const target =
              q.id === 'lesson_1'
                ? 1
                : q.id === 'xp_60'
                  ? 60
                  : Math.max(1, profile.dailyGoalMinutes);
            const unit =
              q.id === 'lesson_1' ? 'bài' : q.id === 'xp_60' ? 'XP' : 'phút';
            const title =
              q.id === 'minutes_goal'
                ? `Luyện tập ${profile.dailyGoalMinutes} phút`
                : q.titleVi;
            const pct = Math.min(100, Math.round((current / target) * 100));
            const done = current >= target;
            const claimed = claimedQuestsToday.includes(q.id);

            return (
              <div key={q.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="text-slate-700 truncate">
                    {q.icon} {title}
                  </span>
                  {claimed ? (
                    <span className="text-emerald-600 shrink-0">✓ Đã nhận</span>
                  ) : done ? (
                    <button
                      type="button"
                      disabled={claimingQuestId === q.id}
                      onClick={() => void handleClaimDailyQuest(q.id, title)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[10px] font-black text-white shadow-[0_2px_0_#C2410C] hover:brightness-105 animate-chest-wiggle cursor-pointer"
                    >
                      🎁 +{q.rewardGems} 💎
                    </button>
                  ) : (
                    <span className="text-slate-400 shrink-0">
                      {current}/{target} {unit}
                    </span>
                  )}
                </div>
                <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`progress-gloss h-full rounded-full transition-all duration-500 ${q.barColor}`}
                    style={{ width: `${Math.max(done ? 100 : 6, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. LỊCH CHUỖI 7 NGÀY */}
      <section className="card-duo p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StreakFlameSvg active={strict.studiedToday} className="h-9 w-9" />
            <div>
              <div className="text-base font-black text-slate-900 leading-none">
                Chuỗi {profile.streakDays} ngày
              </div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">
                {strict.studiedToday
                  ? 'Tuyệt vời! Hôm nay đã thắp lửa 🔥'
                  : 'Xong 1 bài bất kỳ để giữ chuỗi hôm nay'}
              </div>
            </div>
          </div>
          <Link
            href="/history"
            className="text-xs font-extrabold text-[#1899D6] hover:underline shrink-0"
          >
            Lịch tháng
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {miniWeek.map((d) => (
            <div key={d.dateStr} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 text-xs font-black transition ${
                  d.studied
                    ? 'border-orange-400 bg-orange-50 text-orange-600'
                    : d.frozen
                      ? 'border-sky-400 bg-sky-50 text-sky-600'
                      : d.isToday
                        ? 'border-dashed border-indigo-400 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
                }`}
              >
                {d.studied ? '🔥' : d.frozen ? '🧊' : d.isToday ? '⚡' : '·'}
              </div>
              <span
                className={`text-[10px] font-extrabold ${
                  d.isToday ? 'text-indigo-700' : 'text-slate-400'
                }`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>

        {strict.canFreezeYesterday && profile.streakFreezes > 0 && (
          <button
            type="button"
            disabled={freezing}
            onClick={() => void handleQuickFreeze()}
            className="btn-duo btn-duo-blue w-full py-2.5 text-xs"
          >
            <Shield className="h-4 w-4" />
            {freezing ? 'Đang kích hoạt...' : '🧊 Dùng 1 Khiên cứu chuỗi hôm qua'}
          </button>
        )}
      </section>

      {/* 5. GIẢI ĐẤU TUẦN & BẢNG XẾP HẠNG */}
      <section className="card-duo p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <LeagueTrophySvg tier={league.tier} className="h-12 w-12 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                {league.nameVi}
              </div>
              <div className="text-sm font-black text-slate-900 truncate">
                Lv.{levelInfo.level} · {levelInfo.titleVi}
              </div>
              <div className="text-[11px] font-bold text-slate-500">
                {profile.xp} XP ·{' '}
                {league.nextXp
                  ? `Còn ${Math.max(0, league.nextXp - profile.xp)} XP lên giải`
                  : 'Hạng cao nhất 👑'}
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/leaderboard"
          onClick={() => playTapSound()}
          className="btn-duo btn-duo-white w-full py-2.5 text-xs uppercase text-amber-700"
        >
          <Crown className="h-4 w-4 text-[#FFC800] fill-[#FFC800]" />
          Xem Bảng Xếp Hạng Tuần →
        </Link>

        <div className="pt-2 border-t-2 border-slate-100 flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-slate-500">
            <Cloud className="h-3.5 w-3.5 text-emerald-600" />
            {isDriveActive ? 'Google Drive 5TB đang bật' : 'Chưa nối Cloud'}
          </span>
          <Link
            href="/settings"
            className="font-extrabold text-[#1899D6] hover:underline"
          >
            Chi tiết
          </Link>
        </div>
      </section>
    </>
  );

  return (
    <AppShell profile={profile} authenticated={authenticated} rightRail={rightRail}>
      {/* Top Unit Selector (4 Chapters!) + Accent Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {LEARNING_UNITS.map((u, idx) => {
            const active = idx === activeUnitIdx;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setActiveUnitIdx(idx);
                  setSelectedStationId(null);
                }}
                className={`rounded-2xl border px-3.5 py-2 text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                  active
                    ? 'border-indigo-600 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                    : 'border-slate-200 bg-white/90 text-slate-600 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {idx === 3 ? '✨ AI Gu' : `Chặng ${idx + 1}`}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-2xs">
          <Headphones className="h-3.5 w-3.5 text-indigo-600" />
          <select
            aria-label="Chọn giọng bản xứ"
            value={selectedPersonaId}
            onChange={(e) => setSelectedPersonaId(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="auto">
              Giọng {profile.preferredAccent} (Tự động)
            </option>
            {AI_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.flag} {p.name} ({p.accent})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Claimable Milestone Alert Strip */}
      {claimableMilestones.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="animate-chest-wiggle">
              <TreasureChestSvg state="ready" className="h-11 w-11" />
            </div>
            <div>
              <div className="text-sm font-black text-amber-950">
                🎉 Bạn đã đạt mốc chuỗi {claimableMilestones[0].days} ngày!
              </div>
              <div className="text-xs font-semibold text-amber-800">
                Mở rương nhận +{claimableMilestones[0].rewardXp} XP, +
                {claimableMilestones[0].rewardGems} 💎 &amp; huy hiệu{' '}
                {claimableMilestones[0].badgeLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={claimingDays !== null}
            onClick={() => void handleClaimStreakReward(claimableMilestones[0].days)}
            className="btn-duo btn-duo-orange px-4 py-2.5 text-xs uppercase tracking-wide"
          >
            <Gift className="h-4 w-4" />
            Mở rương ngay
          </button>
        </div>
      )}

      {/* AURORA STUDIO UNIT HEADER BANNER */}
      <section
        className={`relative overflow-hidden rounded-3xl ${currentUnit.bannerBg} ${currentUnit.bannerLip} p-5 sm:p-6 text-white shadow-lg shadow-indigo-950/10`}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-14 h-36 w-36 rounded-full bg-cyan-200/20 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-black uppercase tracking-widest text-white/85">
              {currentUnit.sectionLabel} · MẶC ĐỊNH VỪA HỌC VỪA CHƠI
            </div>
            <h1 className="text-xl sm:text-2xl font-black leading-tight">
              {currentUnit.titleVi}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-white/90">
              {currentUnit.subtitleVi}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              handleLaunchStation(
                currentUnit.stations[activeStationIndex] ?? currentUnit.stations[0]
              )
            }
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/35 bg-white/15 hover:bg-white/25 px-4 py-3 text-xs font-black uppercase tracking-wide text-white backdrop-blur-md shadow-xs transition cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Chơi bài tiếp theo
          </button>
        </div>
      </section>

      {/* INTERACTIVE AURORA GLOWING S-CURVE WINDING LEARNING PATH */}
      <section className="card-duo relative overflow-hidden px-4 sm:px-8 py-9">
        {/* Ambient Studio Soft Radial Glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-8 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

        {/* Floating Original Nova Voice Companion */}
        <div className="hidden sm:flex flex-col items-center gap-2.5 absolute right-5 top-1/2 -translate-y-1/2 w-48 pointer-events-none select-none z-10">
          <div className="rounded-2xl border border-indigo-200/80 bg-white/95 backdrop-blur-md px-3.5 py-2.5 text-[11px] font-extrabold text-slate-700 shadow-md shadow-indigo-950/5 text-center leading-snug">
            <span className="block text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-0.5">
              ✨ Nova đồng hành
            </span>
            {strict.studiedToday
              ? `Đỉnh quá ${profile.displayName || 'bạn'} ơi! Chuỗi ${profile.streakDays} ngày đang rực lửa! 🔥`
              : currentUnit.mascotTipVi}
          </div>
          <NovaCompanion
            mood={strict.studiedToday ? 'fire' : 'excited'}
            className="h-30 w-30 animate-gentle-float drop-shadow-[0_12px_20px_rgba(79,70,229,0.22)]"
          />
        </div>

        <div className="relative mx-auto flex max-w-md sm:mr-52 flex-col items-center gap-7">
          {/* Glowing SVG S-Curve Connector Ribbon Behind Nodes */}
          <svg
            viewBox="0 0 360 760"
            fill="none"
            preserveAspectRatio="none"
            className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 h-[calc(100%-24px)] w-[360px] z-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="aurora-path-grad"
                x1="180"
                y1="20"
                x2="180"
                y2="740"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="40%" stopColor="#8B5CF6" />
                <stop offset="72%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#F43F5E" />
              </linearGradient>
            </defs>
            <path
              d="M 180 42 C 180 104, 126 112, 126 176 C 126 240, 104 246, 104 310 C 104 374, 154 380, 154 444 C 154 508, 230 514, 230 578 C 230 642, 186 650, 186 712"
              stroke="url(#aurora-path-grad)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeOpacity="0.12"
            />
            <path
              d="M 180 42 C 180 104, 126 112, 126 176 C 126 240, 104 246, 104 310 C 104 374, 154 380, 154 444 C 154 508, 230 514, 230 578 C 230 642, 186 650, 186 712"
              stroke="url(#aurora-path-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="7 10"
              strokeOpacity="0.48"
            />
          </svg>

          {currentUnit.stations.map((station, idx) => {
            const Icon = getStationIcon(station.kind);
            const isChest = station.kind === 'chest';
            const isDone = !isChest && idx < completedInUnit;
            const isActive = idx === activeStationIndex;
            const isSelected = selectedStationId === station.id;
            const chestReady = isChest && claimableMilestones.length > 0;

            return (
              <div
                key={station.id}
                className="relative z-10 flex flex-col items-center"
                style={{
                  transform: `translateX(${station.offsetPx}px)`,
                }}
              >
                {(isActive || chestReady) && !isSelected && (
                  <div className="mb-2.5 animate-gentle-float">
                    <div
                      className={`relative rounded-xl border-2 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-md ${
                        chestReady
                          ? 'border-amber-300 bg-white text-amber-600'
                          : `border-indigo-200 bg-white ${currentUnit.accentText}`
                      }`}
                    >
                      {chestReady ? '🎁 MỞ QUÀ!' : 'CHƠI NGAY!'}
                      <span className="absolute left-1/2 -bottom-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-inherit bg-white" />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setSelectedStationId(isSelected ? null : station.id);
                  }}
                  aria-label={station.titleVi}
                  className={`path-node-3d relative flex h-[76px] w-[76px] items-center justify-center rounded-full cursor-pointer ${
                    isChest
                      ? chestReady
                        ? 'bg-gradient-to-br from-amber-300 to-orange-500 text-amber-950 shadow-[0_7px_0_#C2410C] ring-4 ring-amber-200 animate-chest-wiggle'
                        : 'bg-amber-50 text-amber-700 border-2 border-amber-300 shadow-[0_6px_0_#F59E0B]'
                      : isDone
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_7px_0_#D97706]'
                        : isActive
                          ? `${currentUnit.nodeBg} text-white ${currentUnit.nodeShadow} ring-4 ring-indigo-300/60 animate-orb-halo`
                          : 'bg-white text-slate-700 border-2 border-slate-200 shadow-[0_6px_0_#CBD5E1] hover:border-indigo-300 hover:text-indigo-700'
                  }`}
                >
                  {isChest ? (
                    <TreasureChestSvg
                      state={chestReady ? 'ready' : 'locked'}
                      className="h-11 w-11"
                    />
                  ) : isDone ? (
                    <div className="relative flex items-center justify-center">
                      <Star className="h-8 w-8 fill-white text-white" />
                      <span className="absolute -right-2 -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-white text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                      </span>
                    </div>
                  ) : (
                    <Icon className="h-8 w-8 stroke-[2.5]" />
                  )}
                </button>

                <div className="mt-2.5 text-center max-w-[184px] rounded-xl bg-white/80 backdrop-blur-xs px-2 py-0.5">
                  <div className="text-xs font-black text-slate-800 leading-tight">
                    {station.titleVi}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {station.xpLabel} · {station.gemsLabel}
                  </div>
                </div>

                {isSelected && (
                  <div className="animate-pop-in mt-3 w-72 rounded-2xl border-2 border-indigo-200/80 bg-white p-4 shadow-2xl shadow-indigo-950/15 z-20 space-y-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">
                          Trạm {idx + 1}/{currentUnit.stations.length}
                        </span>
                        <h3 className="mt-1 text-sm font-black text-slate-900">
                          {station.titleVi}
                        </h3>
                      </div>
                      <span className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-black text-amber-700 shrink-0">
                        {station.xpLabel}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                      {station.subtitleVi}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleLaunchStation(station)}
                      className={`btn-duo w-full py-3 text-xs uppercase tracking-wide ${
                        isChest
                          ? 'btn-duo-orange'
                          : station.kind === 'call' || station.kind === 'boss'
                            ? 'btn-duo-blue'
                            : station.kind === 'ai-quiz'
                              ? 'btn-duo-purple'
                              : 'btn-duo-primary'
                      }`}
                    >
                      {isChest
                        ? chestReady
                          ? '🎁 Mở rương thưởng ngay'
                          : 'Xem mốc thưởng chuỗi'
                        : station.kind === 'call' || station.kind === 'boss'
                          ? 'Bắt đầu gọi AI ngay'
                          : station.kind === 'ai-quiz'
                            ? '✨ AI Tạo Màn Ngay'
                            : 'Chơi ngay (2 phút)'}
                      <ArrowRight className="h-4 w-4 stroke-[3]" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* QUICK PLAY ARCADE STRIP (4 + AI Infinite!) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-orange-500" />
            Đấu trường 5 Chế độ Chơi Nhanh
          </h2>
          <Link
            href="/play"
            className="text-xs font-extrabold text-indigo-600 hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Phản xạ 15s',
              sub: 'Chọn câu chuẩn Tây',
              badge: '+85 XP · 🔥',
              href: '/play?mode=speed',
              icon: Zap,
              accent: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm',
            },
            {
              title: 'Nghe Hiểu Bản Xứ',
              sub: 'Đoán ý qua giọng thật',
              badge: '+90 XP · 🔥',
              href: '/play?mode=listen',
              icon: Headphones,
              accent: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm',
            },
            {
              title: 'Nghe & Ghép câu',
              sub: 'Xếp thẻ từ siêu cuốn',
              badge: '+95 XP · 🔥',
              href: '/play?mode=build',
              icon: Puzzle,
              accent: 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm',
            },
            {
              title: 'AI Tạo Màn Theo Gu',
              sub: 'Mới 100% theo sở thích',
              badge: '✨ Vô tận · 🔥',
              href: '/play?mode=ai-quiz',
              icon: Wand2,
              accent: 'bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-sm',
            },
          ].map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.title}
                href={g.href}
                onClick={() => playTapSound()}
                className="card-duo-elevated p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${g.accent}`}
                >
                  <Icon className="h-5 w-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-900 truncate">
                    {g.title}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 truncate">
                    {g.sub}
                  </div>
                  <div className="text-[10px] font-black text-amber-600 mt-0.5">
                    {g.badge}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CUSTOM AI VOICE ROLEPLAY BUILDER */}
      <section className="card-duo-elevated p-5 space-y-4">
        <div>
          <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700">
            <Sparkles className="h-3 w-3" />
            Tính năng Pro AI
          </span>
          <h2 className="mt-1.5 text-base font-black text-slate-900">
            Tạo Tình Huống Gọi Thoại AI Bất Kỳ Bạn Muốn
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Gõ bất kỳ bối cảnh thực tế nào — Nova &amp; Gia sư AI sẽ nhập vai nói chuyện trực tiếp cùng bạn ngay lập tức!
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!customRoleplayInput.trim()) return;
            startCall('free-talk-custom', customRoleplayInput.trim());
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={customRoleplayInput}
            onChange={(e) => setCustomRoleplayInput(e.target.value)}
            maxLength={140}
            placeholder="Ví dụ: Phỏng vấn xin việc React, Trả giá ở chợ đêm, Hỏi đường ở London..."
            className="flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customRoleplayInput.trim()}
            className="btn-duo btn-duo-primary px-5 py-3 text-xs uppercase shrink-0"
          >
            <PhoneCall className="h-4 w-4" />
            Gọi nhập vai ngay
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {CUSTOM_ROLEPLAY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => startCall('free-talk-custom', preset)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
            >
              ✨ {preset}
            </button>
          ))}
        </div>
      </section>

      {/* VOICE CALL SCENARIOS LIBRARY */}
      <section className="card-duo p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-indigo-600" />
              Thư viện Gọi Thoại AI Có Sẵn ({SCENARIOS.length} tình huống)
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Hoàn thành ≥ 3 lượt thoại để giữ chuỗi 🔥 &amp; nhận báo cáo đánh giá 4 kỹ năng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              setShowScenarioDrawer((v) => !v);
            }}
            className="btn-duo btn-duo-white px-4 py-2 text-xs"
          >
            {showScenarioDrawer ? 'Thu gọn' : 'Xem tất cả 11 tình huống'}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(showScenarioDrawer ? SCENARIOS : SCENARIOS.slice(0, 4)).map(
            (scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => startCall(scenario.id)}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/75 p-3.5 text-left hover:border-indigo-300 hover:bg-indigo-50/60 transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-xl shadow-2xs">
                    {scenario.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate group-hover:text-indigo-700">
                      {scenario.titleVi}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                      {scenario.recommendedLevel} · +60 XP · +15 💎
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-indigo-600" />
              </button>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <Link
            href="/phrases"
            className="inline-flex items-center gap-1.5 font-extrabold text-slate-600 hover:text-indigo-700"
          >
            <BookOpen className="h-4 w-4 text-violet-600" />
            Ôn Flashcard thông minh (SRS) →
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 font-extrabold text-amber-600 hover:underline"
          >
            <Crown className="h-4 w-4" />
            Đua Top Bảng Xếp Hạng →
          </Link>
        </div>
      </section>

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
