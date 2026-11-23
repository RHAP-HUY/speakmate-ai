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
  MascotOwl,
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
    bannerBg: 'bg-[#58CC02]',
    bannerLip: 'border-b-4 border-[#46A302]',
    nodeBg: 'bg-[#58CC02]',
    nodeShadow: 'shadow-[0_7px_0_#46A302]',
    accentText: 'text-[#46A302]',
    mascotTipVi:
      'Chơi xong chỉ 1 trạm là thắp lửa giữ chuỗi hôm nay & mở quà Nhiệm vụ! 🔥',
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
    bannerBg: 'bg-[#1CB0F6]',
    bannerLip: 'border-b-4 border-[#1899D6]',
    nodeBg: 'bg-[#1CB0F6]',
    nodeShadow: 'shadow-[0_7px_0_#1899D6]',
    accentText: 'text-[#1899D6]',
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
    bannerBg: 'bg-[#8B5CF6]',
    bannerLip: 'border-b-4 border-[#6D28D9]',
    nodeBg: 'bg-[#8B5CF6]',
    nodeShadow: 'shadow-[0_7px_0_#6D28D9]',
    accentText: 'text-[#6D28D9]',
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
    bannerBg: 'bg-gradient-to-r from-[#FF9600] to-[#F43F5E]',
    bannerLip: 'border-b-4 border-[#BE123C]',
    nodeBg: 'bg-[#FF9600]',
    nodeShadow: 'shadow-[0_7px_0_#D97706]',
    accentText: 'text-[#EA580C]',
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F7F9FC]">
        <MascotOwl mood="happy" className="h-16 w-16 animate-gentle-float" />
        <Loader2 className="h-6 w-6 animate-spin text-[#58CC02]" />
      </div>
    );
  }

  // PUBLIC FLAGSHIP LANDING PAGE (Duolingo-inspired Split Hero)
  if (!authenticated || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <AppNav profile={null} authenticated={false} variant="landing" />

        <main className="flex-1">
          <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20 grid gap-10 lg:grid-cols-12 items-center">
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="relative w-full max-w-md rounded-3xl border-2 border-slate-200 bg-[#F7F9FC] p-7 shadow-sm">
                <div className="absolute -top-4 -right-3 flex items-center gap-1.5 rounded-2xl border-2 border-orange-300 bg-white px-3.5 py-2 shadow-md animate-gentle-float">
                  <StreakFlameSvg active className="h-5 w-5" />
                  <span className="text-xs font-black text-[#FF9600]">
                    7 ngày liên tiếp!
                  </span>
                </div>

                <div className="absolute -bottom-4 -left-3 flex items-center gap-1.5 rounded-2xl border-2 border-sky-300 bg-white px-3.5 py-2 shadow-md">
                  <GemSvg className="h-5 w-5" />
                  <span className="text-xs font-black text-[#1899D6]">
                    +130 Ngọc · Mở rương quà
                  </span>
                </div>

                <div className="flex flex-col items-center text-center space-y-4">
                  <MascotOwl mood="excited" className="h-36 w-36" />
                  <div className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-left space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400">
                      <span>⚡ MINI-GAME PHẢN XẠ</span>
                      <span className="text-[#58CC02]">COMBO x4 🔥</span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      “Gọi một ly latte đá cỡ vừa cực tự nhiên?”
                    </div>
                    <div className="rounded-xl border-2 border-[#58CC02] bg-[#D7FFB8]/60 px-3 py-2 text-xs font-extrabold text-[#3B8702] flex items-center justify-between">
                      <span>Can I get a medium iced latte, please?</span>
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-extrabold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Vừa học vừa chơi · Bảng Xếp Hạng · Gọi AI · Lưu Drive 5TB
              </span>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-[1.15]">
                Cách học nói tiếng Anh{' '}
                <span className="text-[#58CC02]">vừa vui, vừa nghiện</span> mỗi
                ngày!
              </h1>

              <p className="text-base sm:text-lg font-medium text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Chinh phục 4 Chặng lộ trình 5 chế độ game (kể cả AI tự tạo màn theo sở thích), gọi thoại nhập vai chấm phát âm từng từ, leo Bảng Xếp Hạng tuần, mở Rương Thưởng Chuỗi và đồng bộ trọn đời qua Google!
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 max-w-md mx-auto lg:mx-0">
                <Link
                  href="/auth"
                  className="btn-duo btn-duo-green flex-1 px-7 py-4 text-sm uppercase tracking-wide"
                >
                  Bắt đầu Chơi &amp; Học
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </Link>
                <Link
                  href="/auth"
                  className="btn-duo btn-duo-white px-6 py-4 text-sm uppercase tracking-wide text-[#1899D6]"
                >
                  Đăng nhập Google
                </Link>
              </div>
            </div>
          </section>

          <section className="border-t-2 border-slate-100 bg-[#F7F9FC] py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Gamepad2,
                  bg: 'bg-[#58CC02] text-white',
                  title: '5 Chế độ Chơi & Học AI',
                  desc: 'Phản xạ 15s, Nghe hiểu bản xứ, Ghép câu, Đấu trường Phát âm & AI tạo màn vô tận.',
                },
                {
                  icon: Flame,
                  bg: 'bg-[#FF9600] text-white',
                  title: 'Lịch Chuỗi & Rương Thưởng',
                  desc: 'Mốc thưởng 1–100 ngày, Nhiệm vụ mở rương mỗi ngày, Bình 2x XP & Khiên bảo vệ.',
                },
                {
                  icon: Crown,
                  bg: 'bg-[#FFC800] text-amber-950',
                  title: 'Bảng Xếp Hạng 5 Hạng Giải',
                  desc: 'Đua Top 3 thăng hạng mỗi tuần từ Giải Đồng lên Giải Kim Cương cùng cộng đồng.',
                },
                {
                  icon: Cloud,
                  bg: 'bg-[#1CB0F6] text-white',
                  title: 'Đồng bộ Google Drive 5TB',
                  desc: 'Cài đặt lên màn hình điện thoại như app thật — đổi máy khôi phục 100% dữ liệu.',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="card-duo-elevated p-5 space-y-3 hover:-translate-y-0.5 transition"
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
                    <span className="text-[#58CC02] shrink-0">✓ Đã nhận</span>
                  ) : done ? (
                    <button
                      type="button"
                      disabled={claimingQuestId === q.id}
                      onClick={() => void handleClaimDailyQuest(q.id, title)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#FF9600] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_2px_0_#D97706] hover:bg-[#FFA21A] animate-chest-wiggle cursor-pointer"
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
                    ? 'border-[#FF9600] bg-[#FFF4E0] text-[#FF9600]'
                    : d.frozen
                      ? 'border-[#1CB0F6] bg-[#E0F5FF] text-[#1899D6]'
                      : d.isToday
                        ? 'border-dashed border-[#58CC02] bg-[#F1FDE8] text-[#46A302]'
                        : 'border-slate-200 bg-slate-50 text-slate-300'
                }`}
              >
                {d.studied ? '🔥' : d.frozen ? '🧊' : d.isToday ? '⚡' : '·'}
              </div>
              <span
                className={`text-[10px] font-extrabold ${
                  d.isToday ? 'text-[#46A302]' : 'text-slate-400'
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
                className={`rounded-2xl border-2 px-3 py-2 text-xs font-black uppercase tracking-wide transition cursor-pointer ${
                  active
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                {idx === 3 ? '✨ AI Gu' : `Chặng ${idx + 1}`}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border-2 border-slate-200 bg-white px-3 py-1.5">
          <Headphones className="h-3.5 w-3.5 text-[#1CB0F6]" />
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

      {/* DUOLINGO-STYLE UNIT HEADER BANNER */}
      <section
        className={`rounded-3xl ${currentUnit.bannerBg} ${currentUnit.bannerLip} p-5 sm:p-6 text-white shadow-sm`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/15 hover:bg-white/25 px-4 py-3 text-xs font-black uppercase tracking-wide text-white backdrop-blur-xs transition cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            Chơi bài tiếp theo
          </button>
        </div>
      </section>

      {/* INTERACTIVE DUOLINGO S-CURVE WINDING LEARNING PATH */}
      <section className="card-duo relative overflow-hidden px-4 sm:px-8 py-8">
        <div className="hidden sm:flex flex-col items-center gap-2 absolute right-5 top-1/2 -translate-y-1/2 w-44 pointer-events-none select-none">
          <div className="rounded-2xl border-2 border-slate-200 bg-white px-3.5 py-2.5 text-[11px] font-extrabold text-slate-700 shadow-xs text-center leading-snug">
            {strict.studiedToday
              ? `Đỉnh quá ${profile.displayName || 'bạn'} ơi! Chuỗi ${profile.streakDays} ngày đang rực lửa! 🔥`
              : currentUnit.mascotTipVi}
          </div>
          <MascotOwl
            mood={strict.studiedToday ? 'fire' : 'excited'}
            className="h-28 w-28 animate-gentle-float"
          />
        </div>

        <div className="relative mx-auto flex max-w-md sm:mr-48 flex-col items-center gap-7">
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
                className="relative flex flex-col items-center"
                style={{
                  transform: `translateX(${station.offsetPx}px)`,
                }}
              >
                {(isActive || chestReady) && !isSelected && (
                  <div className="mb-2.5 animate-gentle-float">
                    <div
                      className={`relative rounded-xl border-2 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-sm ${
                        chestReady
                          ? 'border-amber-300 bg-white text-amber-600'
                          : `border-slate-200 bg-white ${currentUnit.accentText}`
                      }`}
                    >
                      {chestReady ? '🎁 MỞ QUÀ!' : 'BẮT ĐẦU!'}
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
                  className={`path-node-3d relative flex h-[74px] w-[74px] items-center justify-center rounded-full cursor-pointer ${
                    isChest
                      ? chestReady
                        ? 'bg-[#FFC800] text-amber-950 shadow-[0_7px_0_#D9A400] ring-4 ring-amber-200 animate-chest-wiggle'
                        : 'bg-amber-100 text-amber-700 border-2 border-amber-300 shadow-[0_6px_0_#F59E0B]'
                      : isDone
                        ? 'bg-[#FFC800] text-white shadow-[0_7px_0_#D9A400]'
                        : isActive
                          ? `${currentUnit.nodeBg} text-white ${currentUnit.nodeShadow} ring-8 ring-[#58CC02]/20`
                          : 'bg-white text-slate-700 border-2 border-slate-200 shadow-[0_6px_0_#CBD5E1] hover:border-slate-300'
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
                      <span className="absolute -right-2 -bottom-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#58CC02] border-2 border-white text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                      </span>
                    </div>
                  ) : (
                    <Icon className="h-8 w-8 stroke-[2.5]" />
                  )}
                </button>

                <div className="mt-2.5 text-center max-w-[180px]">
                  <div className="text-xs font-black text-slate-800 leading-tight">
                    {station.titleVi}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {station.xpLabel} · {station.gemsLabel}
                  </div>
                </div>

                {isSelected && (
                  <div className="animate-pop-in mt-3 w-72 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-xl z-20 space-y-3 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
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
                              : 'btn-duo-green'
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
            <Gamepad2 className="h-4 w-4 text-[#FF9600]" />
            Đấu trường 5 Chế độ Chơi Nhanh
          </h2>
          <Link
            href="/play"
            className="text-xs font-extrabold text-[#1899D6] hover:underline"
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
              accent: 'bg-[#FF9600] text-white',
            },
            {
              title: 'Nghe Hiểu Bản Xứ',
              sub: 'Đoán ý qua giọng thật',
              badge: '+90 XP · 🔥',
              href: '/play?mode=listen',
              icon: Headphones,
              accent: 'bg-[#1CB0F6] text-white',
            },
            {
              title: 'Nghe & Ghép câu',
              sub: 'Xếp thẻ từ siêu cuốn',
              badge: '+95 XP · 🔥',
              href: '/play?mode=build',
              icon: Puzzle,
              accent: 'bg-[#8B5CF6] text-white',
            },
            {
              title: 'AI Tạo Màn Theo Gu',
              sub: 'Mới 100% theo sở thích',
              badge: '✨ Vô tận · 🔥',
              href: '/play?mode=ai-quiz',
              icon: Wand2,
              accent: 'bg-gradient-to-br from-[#F43F5E] to-[#FF9600] text-white',
            },
          ].map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.title}
                href={g.href}
                onClick={() => playTapSound()}
                className="card-duo-elevated p-3.5 flex items-center gap-3 hover:-translate-y-0.5 hover:border-slate-300 transition"
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
          <span className="inline-flex items-center gap-1 rounded-xl bg-[#DDF4FF] px-2.5 py-1 text-[10px] font-black uppercase text-[#1899D6]">
            <Sparkles className="h-3 w-3" />
            Tính năng Pro AI
          </span>
          <h2 className="mt-1.5 text-base font-black text-slate-900">
            Tạo Tình Huống Gọi Thoại AI Bất Kỳ Bạn Muốn
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Gõ bất kỳ bối cảnh thực tế nào — Gia sư AI sẽ nhập vai nói chuyện trực tiếp cùng bạn ngay lập tức!
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
            className="flex-1 rounded-2xl border-2 border-slate-200 bg-[#F7F9FC] px-4 py-3 text-sm font-semibold text-slate-800 focus:border-[#1CB0F6] focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customRoleplayInput.trim()}
            className="btn-duo btn-duo-blue px-5 py-3 text-xs uppercase shrink-0"
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
              className="rounded-xl border border-slate-200 bg-[#F7F9FC] px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-[#1CB0F6] hover:bg-[#DDF4FF]/50 hover:text-[#1899D6] transition cursor-pointer"
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
              <PhoneCall className="h-4 w-4 text-[#1CB0F6]" />
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
                className="group flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-[#F7F9FC] p-3.5 text-left hover:border-[#1CB0F6] hover:bg-[#F0FAFF] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-xl">
                    {scenario.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate group-hover:text-[#1899D6]">
                      {scenario.titleVi}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                      {scenario.recommendedLevel} · +60 XP · +15 💎
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#1899D6]" />
              </button>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-slate-100 text-xs">
          <Link
            href="/phrases"
            className="inline-flex items-center gap-1.5 font-extrabold text-slate-600 hover:text-[#1899D6]"
          >
            <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
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
