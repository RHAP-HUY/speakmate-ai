'use client';

import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  CheckCircle2,
  Cloud,
  Coffee,
  Crown,
  Gift,
  Headphones,
  Loader2,
  MessageSquare,
  Mic,
  PhoneCall,
  Plane,
  Play,
  Puzzle,
  Shield,
  Volume2,
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
  modeLabel: string;
  titleVi: string;
  subtitleVi: string;
  xpValue: number | null;
  gemsValue: number | null;
  durationVi: string;
  href?: string;
  scenarioId?: string;
}

interface LearningUnit {
  id: string;
  code: string;
  tabLabel: string;
  sectionLabel: string;
  titleVi: string;
  subtitleVi: string;
  category: TopicCategory;
  noteVi: string;
  stations: PathStation[];
}

const LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-daily',
    code: '01',
    tabLabel: '01 · Đời sống',
    sectionLabel: 'CHẶNG 01 · GIAO TIẾP HÀNG NGÀY',
    titleVi: 'Quán cà phê, làm quen & trò chuyện tự nhiên',
    subtitleVi:
      'Xây dựng phản xạ câu ngắn gọn, đúng ngữ điệu người bản xứ trong các tình huống quen thuộc.',
    category: 'daily',
    noteVi: 'Hoàn thành 1 bài bất kỳ trong ngày để duy trì chuỗi học tập.',
    stations: [
      {
        id: 'u1-1',
        kind: 'speed',
        modeLabel: 'Phản xạ 15s',
        titleVi: 'Chọn câu tự nhiên trong 15 giây',
        subtitleVi: 'Tránh lối dịch từng chữ từ tiếng Việt sang tiếng Anh.',
        xpValue: 85,
        gemsValue: 20,
        durationVi: '2 phút',
        href: '/play?mode=speed&category=daily',
      },
      {
        id: 'u1-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe hội thoại tại quán cà phê',
        subtitleVi: 'Nắm bắt ý chính qua tốc độ nói và nối âm thực tế.',
        xpValue: 90,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen&category=daily',
      },
      {
        id: 'u1-3',
        kind: 'build',
        modeLabel: 'Cấu trúc câu',
        titleVi: 'Nghe & sắp xếp trật tự câu bản xứ',
        subtitleVi: 'Ghi nhớ mẫu câu thông dụng qua thao tác ghép từ.',
        xpValue: 95,
        gemsValue: 25,
        durationVi: '3 phút',
        href: '/play?mode=build&category=daily',
      },
      {
        id: 'u1-4',
        kind: 'call',
        modeLabel: 'Hội thoại trực tiếp',
        titleVi: 'Thực hành gọi đồ uống cùng Barista',
        subtitleVi: 'Trò chuyện bằng giọng nói, nhận chấm điểm phát âm từng từ.',
        xpValue: 60,
        gemsValue: 15,
        durationVi: '3–5 phút',
        scenarioId: 'daily-coffee-shop',
      },
      {
        id: 'u1-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Kiểm tra cột mốc thưởng chuỗi học',
        subtitleVi: 'Nhận thêm Ngọc tích lũy, Khiên bảo vệ và danh hiệu.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u1-6',
        kind: 'boss',
        modeLabel: 'Tổng hợp chặng',
        titleVi: 'Trò chuyện Small Talk theo sở thích',
        subtitleVi: 'Kết nối câu chuyện tự nhiên xoay quanh sở thích cá nhân của bạn.',
        xpValue: 80,
        gemsValue: 25,
        durationVi: '4 phút',
        scenarioId: 'daily-small-talk',
      },
    ],
  },
  {
    id: 'unit-business',
    code: '02',
    tabLabel: '02 · Công sở',
    sectionLabel: 'CHẶNG 02 · TIẾNG ANH CÔNG VIỆC',
    titleVi: 'Họp nhóm, trao đổi tiến độ & phỏng vấn',
    subtitleVi:
      'Luyện cách diễn đạt lịch sự, gãy gọn khi làm việc với đồng nghiệp và đối tác quốc tế.',
    category: 'business',
    noteVi: 'Tập trung các cụm từ chuyên nghiệp như heads-up, follow up, circle back.',
    stations: [
      {
        id: 'u2-1',
        kind: 'speed',
        modeLabel: 'Phản xạ 15s',
        titleVi: 'Xử lý tình huống họp & trao đổi công việc',
        subtitleVi: 'Chọn cách phản hồi khéo léo, đúng văn phong công sở.',
        xpValue: 85,
        gemsValue: 20,
        durationVi: '2 phút',
        href: '/play?mode=speed&category=business',
      },
      {
        id: 'u2-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe cập nhật tiến độ & lịch họp',
        subtitleVi: 'Luyện bắt từ khóa về thời hạn và phân công công việc.',
        xpValue: 90,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen&category=business',
      },
      {
        id: 'u2-3',
        kind: 'build',
        modeLabel: 'Cấu trúc câu',
        titleVi: 'Ghép câu giao tiếp chuyên nghiệp',
        subtitleVi: 'Rèn cấu trúc trình bày ý kiến rõ ràng, mạch lạc.',
        xpValue: 95,
        gemsValue: 25,
        durationVi: '3 phút',
        href: '/play?mode=build&category=business',
      },
      {
        id: 'u2-4',
        kind: 'pronounce',
        modeLabel: 'Chấm phát âm',
        titleVi: 'Luyện trọng âm & nối âm câu công sở',
        subtitleVi: 'Đọc thành tiếng 3 câu mẫu và xem phân tích IPA từng âm tiết.',
        xpValue: 110,
        gemsValue: 30,
        durationVi: '3 phút',
        href: '/play?mode=pronounce&category=business',
      },
      {
        id: 'u2-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Mở phần thưởng duy trì thói quen',
        subtitleVi: 'Đổi Ngọc lấy Khiên bảo vệ chuỗi và nhân đôi XP.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u2-6',
        kind: 'boss',
        modeLabel: 'Tổng hợp chặng',
        titleVi: 'Mô phỏng phỏng vấn tuyển dụng',
        subtitleVi: 'Trả lời câu hỏi về kinh nghiệm, thế mạnh và định hướng nghề nghiệp.',
        xpValue: 90,
        gemsValue: 30,
        durationVi: '5 phút',
        scenarioId: 'business-interview',
      },
    ],
  },
  {
    id: 'unit-travel',
    code: '03',
    tabLabel: '03 · Du lịch',
    sectionLabel: 'CHẶNG 03 · DI CHUYỂN & DU LỊCH QUỐC TẾ',
    titleVi: 'Sân bay, khách sạn, hỏi đường & nhà hàng',
    subtitleVi:
      'Tự tin xử lý mọi tình huống thực tế khi đi công tác hoặc du lịch nước ngoài.',
    category: 'travel',
    noteVi: 'Luyện phát âm rõ âm cuối để người bản xứ hiểu ngay ở môi trường đông người.',
    stations: [
      {
        id: 'u3-1',
        kind: 'speed',
        modeLabel: 'Phản xạ 15s',
        titleVi: 'Phản xạ tại quầy thủ tục & hỏi đường',
        subtitleVi: 'Chọn câu hỏi lịch sự khi cần hỗ trợ ở sân bay, nhà ga.',
        xpValue: 85,
        gemsValue: 20,
        durationVi: '2 phút',
        href: '/play?mode=speed&category=travel',
      },
      {
        id: 'u3-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe thông báo cổng bay & hướng dẫn',
        subtitleVi: 'Luyện nghe thông tin giờ bay, đổi cổng và chỉ dẫn đường đi.',
        xpValue: 90,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen&category=travel',
      },
      {
        id: 'u3-3',
        kind: 'call',
        modeLabel: 'Hội thoại trực tiếp',
        titleVi: 'Thực hành thủ tục sân bay & nhập cảnh',
        subtitleVi: 'Trả lời câu hỏi về hành trình, hành lý và thời gian lưu trú.',
        xpValue: 60,
        gemsValue: 15,
        durationVi: '4 phút',
        scenarioId: 'travel-airport',
      },
      {
        id: 'u3-4',
        kind: 'pronounce',
        modeLabel: 'Chấm phát âm',
        titleVi: 'Luyện phát âm câu giao tiếp du lịch',
        subtitleVi: 'Chấm điểm độ rõ âm, tốc độ nói và ngữ điệu lên xuống.',
        xpValue: 110,
        gemsValue: 30,
        durationVi: '3 phút',
        href: '/play?mode=pronounce&category=travel',
      },
      {
        id: 'u3-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Kiểm tra cột mốc thưởng chuỗi học',
        subtitleVi: 'Theo dõi tiến trình chinh phục mốc 14, 30 và 60 ngày.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u3-6',
        kind: 'boss',
        modeLabel: 'Tổng hợp chặng',
        titleVi: 'Đặt bàn, gọi món & thanh toán nhà hàng',
        subtitleVi: 'Hỏi món đặc trưng, ghi chú khẩu vị và thanh toán tự nhiên.',
        xpValue: 90,
        gemsValue: 30,
        durationVi: '4 phút',
        scenarioId: 'travel-restaurant',
      },
    ],
  },
  {
    id: 'unit-ai-infinite',
    code: '04',
    tabLabel: '04 · Cá nhân hóa',
    sectionLabel: 'CHẶNG 04 · LỘ TRÌNH THEO NGÀNH NGHỀ & SỞ THÍCH',
    titleVi: 'Bài tập thích ứng theo hồ sơ riêng của bạn',
    subtitleVi:
      'Hệ thống tự biên soạn bộ câu hỏi và bối cảnh hội thoại sát với lĩnh vực công việc và mối quan tâm của bạn.',
    category: 'freetalk',
    noteVi: 'Mỗi lượt tạo bài là 5 tình huống mới phù hợp với trình độ hiện tại.',
    stations: [
      {
        id: 'u4-1',
        kind: 'ai-quiz',
        modeLabel: 'Bài tập thích ứng',
        titleVi: 'Tạo bộ câu phản xạ theo sở thích cá nhân',
        subtitleVi: 'Biên soạn tự động 5 câu hỏi mới từ hồ sơ nghề nghiệp của bạn.',
        xpValue: 100,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=ai-quiz',
      },
      {
        id: 'u4-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe hiểu tổng hợp đa chủ đề',
        subtitleVi: 'Kết hợp ngữ cảnh đời sống, công sở và du lịch.',
        xpValue: 95,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen',
      },
      {
        id: 'u4-3',
        kind: 'pronounce',
        modeLabel: 'Chấm phát âm',
        titleVi: 'Luyện phát âm nâng cao (mục tiêu 85+)',
        subtitleVi: 'Hoàn thiện âm cuối, trọng âm từ và nhịp điệu câu dài.',
        xpValue: 120,
        gemsValue: 30,
        durationVi: '3 phút',
        href: '/play?mode=pronounce',
      },
      {
        id: 'u4-4',
        kind: 'speed',
        modeLabel: 'Phản xạ 15s',
        titleVi: 'Thử thách tốc độ tổng hợp',
        subtitleVi: 'Ôn tập ngẫu nhiên từ ngân hàng hơn 30 ngữ cảnh thực tế.',
        xpValue: 100,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=speed',
      },
      {
        id: 'u4-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Cột mốc danh dự 60–100 ngày',
        subtitleVi: 'Mở khóa danh hiệu cao nhất trên bảng thành tích.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u4-6',
        kind: 'boss',
        modeLabel: 'Hội thoại mở',
        titleVi: 'Trò chuyện tự do không giới hạn chủ đề',
        subtitleVi: 'Trao đổi sâu bằng tiếng Anh như đang nói chuyện với đồng nghiệp.',
        xpValue: 100,
        gemsValue: 30,
        durationVi: '5 phút',
        scenarioId: 'free-talk-custom',
      },
    ],
  },
];

const CUSTOM_ROLEPLAY_PRESETS = [
  'Phỏng vấn vị trí kỹ sư phần mềm bằng tiếng Anh',
  'Thương lượng giá và hỏi thông tin sản phẩm',
  'Trò chuyện cuối tuần về sách, phim và âm nhạc',
  'Đặt lịch hẹn bác sĩ và mô tả triệu chứng',
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

function getScenarioCategoryIcon(category: TopicCategory) {
  switch (category) {
    case 'daily':
      return Coffee;
    case 'business':
      return Briefcase;
    case 'travel':
      return Plane;
    default:
      return MessageSquare;
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
        title: `Mốc chuỗi ${milestone.days} ngày: ${milestone.titleVi}`,
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
          title: 'Hoàn thành mục tiêu trong ngày',
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
        title: 'Đã kích hoạt Khiên bảo vệ chuỗi',
        subtitle: `Chuỗi ${res.profile.streakDays} ngày học liên tiếp của bạn đã được giữ nguyên.`,
      });
    } finally {
      setFreezing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FAF9F6]">
        <NovaCompanion mood="happy" className="h-12 w-12" />
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  // PUBLIC EDITORIAL LANDING PAGE — Human-Crafted (Stripe / Speak.com / Brilliant Aesthetic)
  if (!authenticated || !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
        <AppNav profile={null} authenticated={false} variant="landing" />

        <main className="flex-1">
          <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-16 sm:py-20 grid gap-12 lg:grid-cols-12 items-center">
            {/* Left Editorial Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Luyện giao tiếp thực tế · Chấm phát âm từng âm tiết
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-[-0.03em] text-zinc-950 leading-[1.12]">
                Nói tiếng Anh tự nhiên qua ngữ cảnh thực tế mỗi ngày.
              </h1>

              <p className="text-base sm:text-[17px] text-zinc-600 leading-relaxed max-w-xl">
                Kết hợp các bài luyện phản xạ 2 phút, hội thoại trực tiếp cùng 6 giọng đọc bản xứ và phân tích phát âm IPA từng từ. Toàn bộ tiến trình được lưu tự động trên Google Drive 5TB.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 max-w-md">
                <Link
                  href="/auth"
                  className="btn-duo btn-duo-primary px-6 py-3.5 text-sm"
                >
                  Bắt đầu miễn phí
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/auth"
                  className="btn-duo btn-duo-white px-6 py-3.5 text-sm"
                >
                  Đăng nhập bằng Google
                </Link>
              </div>

              <div className="pt-6 border-t border-zinc-200/90 grid grid-cols-3 gap-5 tabular-nums">
                <div>
                  <div className="text-sm font-bold text-zinc-950">
                    US · UK · AU · CA
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    6 giọng đọc tự nhiên
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-950">
                    Chấm điểm IPA
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Phân tích âm cuối &amp; nối âm
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-950">
                    Drive 5TB
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Đồng bộ đa thiết bị
                  </div>
                </div>
              </div>
            </div>

            {/* Right Authentic Product Studio Specimen */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-[0_20px_50px_-20px_rgba(24,24,27,0.12)] overflow-hidden">
                {/* Window Header */}
                <div className="flex items-center justify-between border-b border-zinc-100 bg-[#FAF9F6] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                    <span className="ml-2 text-xs font-semibold text-zinc-700">
                      Tình huống: Quán cà phê buổi sáng · Emma (US)
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 tabular-nums">
                    01:42
                  </span>
                </div>

                {/* Realistic Conversation Preview */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="rounded-xl border border-zinc-200/80 bg-[#FAF9F6] p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-500">
                        Emma · Giọng Mỹ
                      </span>
                      <Volume2 className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-900">
                      &ldquo;Morning! What can I get started for you today?&rdquo;
                    </p>
                    <p className="text-xs text-zinc-500">
                      Chào buổi sáng! Hôm nay mình có thể làm món gì cho bạn nhỉ?
                    </p>
                  </div>

                  <div className="ml-6 rounded-xl bg-zinc-900 text-white p-3.5 space-y-1">
                    <div className="text-[11px] text-zinc-400">
                      Câu bạn vừa nói
                    </div>
                    <p className="text-sm font-medium">
                      &ldquo;Can I get a medium iced oat latte, less sweet please?&rdquo;
                    </p>
                  </div>

                  {/* Word-level Pronunciation Breakdown */}
                  <div className="ml-6 rounded-xl border border-zinc-200 bg-white p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Điểm phát âm: 92/100 · Rõ ràng, tự nhiên
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        IPA
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {['Can I', 'get a', 'medium'].map((w) => (
                        <span
                          key={w}
                          className="rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 font-medium text-emerald-900"
                        >
                          {w}
                        </span>
                      ))}
                      <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
                        iced · /aɪst/
                      </span>
                      {['oat latte,', 'less sweet'].map((w) => (
                        <span
                          key={w}
                          className="rounded-md border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 font-medium text-emerald-900"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-zinc-600">
                      Góp ý: Âm nối &ldquo;Can I&rdquo; mượt; bật rõ âm cuối /t/ ở từ &ldquo;iced&rdquo; sẽ giống người bản xứ hơn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Below-the-fold Structured Architecture */}
          <section className="border-t border-zinc-200/90 bg-white py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
              <div className="max-w-2xl space-y-2">
                <div className="font-mono text-xs font-medium text-blue-700">
                  PHƯƠNG PHÁP LUYỆN TẬP
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
                  Thiết kế xoay quanh việc mở lời nói thực tế, không học vẹt lý thuyết.
                </h2>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80 border border-zinc-200/90 rounded-2xl bg-[#FAF9F6]">
                {[
                  {
                    num: '01',
                    title: '5 chế độ luyện phản xạ ngắn',
                    desc: 'Phản xạ 15 giây, nghe hiểu ngữ cảnh, sắp xếp cấu trúc câu, chấm phát âm và bài tập thích ứng theo sở thích.',
                  },
                  {
                    num: '02',
                    title: 'Hội thoại nhập vai trực tiếp',
                    desc: 'Thực hành nói qua 11 bối cảnh đời sống, công sở, du lịch hoặc tự đặt tình huống riêng cùng báo cáo 4 kỹ năng.',
                  },
                  {
                    num: '03',
                    title: 'Kỷ luật chuỗi ngày học thực chất',
                    desc: 'Chỉ tính giữ chuỗi khi hoàn thành trọn vẹn bài học, đi kèm cơ chế Khiên bảo vệ và cột mốc 1–100 ngày.',
                  },
                  {
                    num: '04',
                    title: 'Đồng bộ Google Drive 5TB',
                    desc: 'Hỗ trợ làm việc ngoại tuyến, tự hợp nhất dữ liệu không mất tiến trình khi chuyển đổi giữa điện thoại và máy tính.',
                  },
                ].map((item) => (
                  <div key={item.num} className="p-6 space-y-2.5">
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      {item.num}
                    </span>
                    <h3 className="text-base font-bold text-zinc-950">
                      {item.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-zinc-600">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // AUTHENTICATED STRUCTURED CURRICULUM EXPERIENCE
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

  // RIGHT STICKY PROGRESS RAIL — Clean Swiss Grid
  const rightRail = (
    <>
      {/* 1. Top Live Stats Strip */}
      <div className="hidden xl:grid grid-cols-3 gap-2 tabular-nums">
        <Link
          href="/history"
          className="card-duo flex items-center justify-center gap-1.5 py-2.5 px-2 hover:bg-zinc-50 transition"
          title="Chuỗi ngày học liên tiếp"
        >
          <StreakFlameSvg active={profile.streakDays > 0} className="h-4 w-4" />
          <span className="text-sm font-bold text-zinc-900">
            {profile.streakDays}
          </span>
        </Link>
        <Link
          href="/history#rewards"
          className="card-duo flex items-center justify-center gap-1.5 py-2.5 px-2 hover:bg-zinc-50 transition"
          title="Ngọc tích lũy"
        >
          <GemSvg className="h-4 w-4" />
          <span className="text-sm font-bold text-zinc-900">
            {profile.gems}
          </span>
        </Link>
        <Link
          href="/history"
          className="card-duo flex items-center justify-center gap-1.5 py-2.5 px-2 hover:bg-zinc-50 transition"
          title="Khiên bảo vệ chuỗi"
        >
          <ShieldFreezeSvg className="h-4 w-4" />
          <span className="text-sm font-bold text-zinc-900">
            {profile.streakFreezes}
          </span>
        </Link>
      </div>

      {boostActive && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 flex items-center justify-between gap-2 tabular-nums">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
            <Zap className="h-4 w-4 text-amber-600" />
            Đang bật nhân đôi XP
          </div>
          <span className="font-mono text-xs font-semibold text-amber-700">
            {boostMins} phút
          </span>
        </div>
      )}

      {/* 2. 7-Day Streak & Activity Card */}
      <section className="card-duo p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <StreakFlameSvg active={strict.studiedToday} className="h-6 w-6" />
            <div>
              <div className="text-sm font-bold text-zinc-950 leading-none tabular-nums">
                Chuỗi {profile.streakDays} ngày
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {strict.studiedToday
                  ? 'Hôm nay đã hoàn thành bài giữ chuỗi'
                  : 'Hoàn thành 1 bài để giữ chuỗi hôm nay'}
              </div>
            </div>
          </div>
          <Link
            href="/history"
            className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
          >
            Chi tiết
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5 tabular-nums">
          {miniWeek.map((d) => (
            <div key={d.dateStr} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold ${
                  d.studied
                    ? 'border-amber-500 bg-amber-500 text-white'
                    : d.frozen
                      ? 'border-sky-600 bg-sky-600 text-white'
                      : d.isToday
                        ? 'border-dashed border-blue-500 bg-blue-50/60 text-blue-700'
                        : 'border-zinc-200 bg-[#FAF9F6] text-zinc-300'
                }`}
              >
                {d.studied ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.6]" />
                ) : d.frozen ? (
                  <Shield className="h-3.5 w-3.5" />
                ) : d.isToday ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                ) : (
                  '·'
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  d.isToday ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
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
            className="btn-duo btn-duo-blue w-full py-2 text-xs"
          >
            <Shield className="h-3.5 w-3.5" />
            {freezing ? 'Đang kích hoạt...' : 'Dùng 1 Khiên cho ngày hôm qua'}
          </button>
        )}
      </section>

      {/* 3. Daily Goals */}
      <section className="card-duo p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Mục tiêu hôm nay
          </h2>
          <span className="tabular-nums font-mono text-[11px] text-zinc-500">
            {claimedQuestsToday.length}/{DAILY_QUEST_DEFS.length}
          </span>
        </div>

        <div className="space-y-3 tabular-nums">
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
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-zinc-800 truncate">
                    {title}
                  </span>
                  {claimed ? (
                    <span className="text-emerald-700 font-semibold shrink-0">
                      Đã nhận
                    </span>
                  ) : done ? (
                    <button
                      type="button"
                      disabled={claimingQuestId === q.id}
                      onClick={() => void handleClaimDailyQuest(q.id, title)}
                      className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-amber-700 cursor-pointer"
                    >
                      Nhận +{q.rewardGems} Ngọc
                    </button>
                  ) : (
                    <span className="text-zinc-400 shrink-0 font-mono text-[11px]">
                      {current}/{target} {unit}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${q.barColor}`}
                    style={{ width: `${Math.max(done ? 100 : 4, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Milestone Chest Progress */}
      <section
        className={`card-duo p-4 space-y-3.5 ${
          claimableMilestones.length > 0 ? 'ring-1 ring-amber-400 bg-amber-50/30' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <TreasureChestSvg
              state={
                claimableMilestones.length > 0
                  ? 'ready'
                  : profile.claimedMilestones.length >= STREAK_MILESTONES.length
                    ? 'opened'
                    : 'locked'
              }
              className="h-9 w-9"
            />
            <div>
              <div className="text-[11px] font-medium text-zinc-500">
                Cột mốc thưởng chuỗi
              </div>
              <h2 className="text-xs font-bold text-zinc-950 leading-snug">
                {claimableMilestones.length > 0
                  ? `${claimableMilestones.length} cột mốc sẵn sàng nhận`
                  : `Mốc ${nextMilestone.days} ngày · ${nextMilestone.titleVi}`}
              </h2>
            </div>
          </div>
          <Link
            href="/history#rewards"
            className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
          >
            Tất cả
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1 tabular-nums">
          {STREAK_MILESTONES.map((m) => {
            const claimed = profile.claimedMilestones.includes(m.days);
            const ready = bestStreak >= m.days && !claimed;
            return (
              <div
                key={m.days}
                className={`flex flex-col items-center rounded-lg border py-1.5 text-center ${
                  ready
                    ? 'border-amber-400 bg-amber-50 text-amber-900 font-semibold'
                    : claimed
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-800'
                      : 'border-zinc-200/80 bg-[#FAF9F6] text-zinc-400'
                }`}
              >
                <span className="text-[10px] font-mono leading-none">
                  {m.days}d
                </span>
              </div>
            );
          })}
        </div>

        {claimableMilestones.length > 0 ? (
          <button
            type="button"
            disabled={claimingDays !== null}
            onClick={() => void handleClaimStreakReward(claimableMilestones[0].days)}
            className="btn-duo btn-duo-orange w-full py-2 text-xs"
          >
            <Gift className="h-3.5 w-3.5" />
            {claimingDays !== null
              ? 'Đang nhận thưởng...'
              : `Nhận thưởng mốc ${claimableMilestones[0].days} ngày`}
          </button>
        ) : (
          <div className="space-y-1.5 tabular-nums">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Tiến độ mốc kế tiếp</span>
              <span className="font-mono font-medium text-zinc-700">
                {Math.min(bestStreak, nextMilestone.days)}/{nextMilestone.days} ngày
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    6,
                    Math.min(100, Math.round((bestStreak / nextMilestone.days) * 100))
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* 5. Weekly League & Sync Summary */}
      <section className="card-duo p-4 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <LeagueTrophySvg tier={league.tier} className="h-9 w-9 shrink-0" />
          <div className="min-w-0 tabular-nums">
            <div className="text-[11px] font-semibold text-zinc-500">
              {league.nameVi}
            </div>
            <div className="text-xs font-bold text-zinc-950 truncate">
              Cấp {levelInfo.level} · {levelInfo.titleVi}
            </div>
            <div className="text-[11px] text-zinc-500">
              {profile.xp} XP
              {league.nextXp
                ? ` · Còn ${Math.max(0, league.nextXp - profile.xp)} XP lên hạng`
                : ' · Hạng cao nhất'}
            </div>
          </div>
        </div>

        <Link
          href="/leaderboard"
          onClick={() => playTapSound()}
          className="btn-duo btn-duo-white w-full py-2 text-xs"
        >
          Xem bảng xếp hạng tuần
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Cloud className="h-3.5 w-3.5 text-emerald-600" />
            {isDriveActive ? 'Google Drive 5TB đã bật' : 'Lưu trên thiết bị'}
          </span>
          <Link
            href="/settings"
            className="font-semibold text-blue-700 hover:underline"
          >
            Cài đặt
          </Link>
        </div>
      </section>
    </>
  );

  return (
    <AppShell profile={profile} authenticated={authenticated} rightRail={rightRail}>
      {/* Segmented Chapter Tabs + Voice Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-zinc-200/60 p-1">
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
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {u.tabLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5">
          <Headphones className="h-3.5 w-3.5 text-zinc-500" />
          <select
            aria-label="Chọn giọng bản xứ"
            value={selectedPersonaId}
            onChange={(e) => setSelectedPersonaId(e.target.value)}
            className="bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer"
          >
            <option value="auto">
              Giọng {profile.preferredAccent} (Mặc định)
            </option>
            {AI_PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.accent}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Claimable Milestone Banner */}
      {claimableMilestones.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <TreasureChestSvg state="ready" className="h-9 w-9 shrink-0" />
            <div>
              <div className="text-sm font-bold text-zinc-950">
                Bạn đã đạt cột mốc chuỗi {claimableMilestones[0].days} ngày
              </div>
              <div className="text-xs text-zinc-600 tabular-nums">
                Phần thưởng: +{claimableMilestones[0].rewardXp} XP, +
                {claimableMilestones[0].rewardGems} Ngọc &amp; danh hiệu{' '}
                {claimableMilestones[0].badgeLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={claimingDays !== null}
            onClick={() => void handleClaimStreakReward(claimableMilestones[0].days)}
            className="btn-duo btn-duo-orange px-4 py-2 text-xs"
          >
            <Gift className="h-3.5 w-3.5" />
            Nhận thưởng ngay
          </button>
        </div>
      )}

      {/* EDITORIAL CHAPTER HEADER CARD */}
      <section className="card-duo-elevated p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="font-mono text-[11px] font-semibold tracking-wider text-blue-700">
              {currentUnit.sectionLabel}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950">
              {currentUnit.titleVi}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
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
            className="btn-duo btn-duo-primary shrink-0 px-5 py-2.5 text-sm"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Học bài tiếp theo
          </button>
        </div>

        <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 tabular-nums">
          <span>{currentUnit.noteVi}</span>
          <span className="font-medium text-zinc-700">
            Tiến độ chặng: {completedInUnit}/{currentUnit.stations.length} bài
          </span>
        </div>
      </section>

      {/* STRUCTURED CURRICULUM LESSON TRACK (Brilliant / Babbel Craft) */}
      <section className="card-duo overflow-hidden divide-y divide-zinc-100">
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
              className={`transition ${
                isActive
                  ? 'bg-blue-50/35'
                  : chestReady
                    ? 'bg-amber-50/40'
                    : 'bg-white hover:bg-[#FAF9F6]'
              }`}
            >
              <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setSelectedStationId(isSelected ? null : station.id);
                  }}
                  className="flex flex-1 items-start sm:items-center gap-3.5 text-left min-w-0 cursor-pointer"
                >
                  {/* Step Status Node */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                      isChest
                        ? chestReady
                          ? 'border-amber-400 bg-amber-100 text-amber-800'
                          : 'border-zinc-200 bg-[#FAF9F6] text-zinc-500'
                        : isDone
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : isActive
                            ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                            : 'border-zinc-200 bg-[#FAF9F6] text-zinc-600'
                    }`}
                  >
                    {isChest ? (
                      <TreasureChestSvg
                        state={chestReady ? 'ready' : 'locked'}
                        className="h-6 w-6"
                      />
                    ) : isDone ? (
                      <Check className="h-4 w-4 stroke-[2.6]" />
                    ) : (
                      <Icon className="h-4 w-4 stroke-[2]" />
                    )}
                  </div>

                  {/* Lesson Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-medium text-zinc-400 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                          isActive
                            ? 'bg-blue-100/80 text-blue-800'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {station.modeLabel}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        · {station.durationVi}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-bold text-zinc-950 truncate">
                      {station.titleVi}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                      {station.subtitleVi}
                    </p>
                  </div>
                </button>

                {/* Right Reward & Direct Launch Action */}
                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  {station.xpValue !== null && (
                    <div className="hidden sm:flex flex-col items-end text-right">
                      <span className="text-xs font-semibold text-zinc-800">
                        +{station.xpValue} XP
                      </span>
                      {station.gemsValue !== null && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          +{station.gemsValue}
                          <GemSvg className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleLaunchStation(station)}
                    className={`btn-duo px-3.5 py-2 text-xs ${
                      isChest && chestReady
                        ? 'btn-duo-orange'
                        : isActive
                          ? 'btn-duo-blue'
                          : 'btn-duo-white'
                    }`}
                  >
                    {isChest
                      ? chestReady
                        ? 'Nhận quà'
                        : 'Xem mốc'
                      : isDone
                        ? 'Ôn lại'
                        : 'Bắt đầu'}
                  </button>
                </div>
              </div>

              {isSelected && (
                <div className="border-t border-zinc-100 bg-[#FAF9F6] px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {station.subtitleVi}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLaunchStation(station)}
                    className="btn-duo btn-duo-primary shrink-0 px-4 py-2 text-xs"
                  >
                    {isChest
                      ? 'Mở bảng cột mốc chuỗi'
                      : station.kind === 'call' || station.kind === 'boss'
                        ? 'Vào phòng hội thoại'
                        : 'Bắt đầu bài luyện tập'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* QUICK PRACTICE MODES */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-tight text-zinc-900">
            Luyện nhanh theo kỹ năng
          </h2>
          <Link
            href="/play"
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            Mở toàn bộ chế độ →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Phản xạ 15 giây',
              sub: 'Chọn cách nói tự nhiên',
              meta: '+85 XP · 5 câu',
              href: '/play?mode=speed',
              icon: Zap,
            },
            {
              title: 'Nghe hiểu bản xứ',
              sub: 'Nắm ý chính qua hội thoại',
              meta: '+90 XP · 5 tình huống',
              href: '/play?mode=listen',
              icon: Headphones,
            },
            {
              title: 'Nghe & ghép câu',
              sub: 'Ghi nhớ cấu trúc câu',
              meta: '+95 XP · 5 câu',
              href: '/play?mode=build',
              icon: Puzzle,
            },
            {
              title: 'Bài tập theo sở thích',
              sub: 'Biên soạn riêng từ hồ sơ',
              meta: '+100 XP · Thích ứng',
              href: '/play?mode=ai-quiz',
              icon: Wand2,
            },
          ].map((g) => {
            const Icon = g.icon;
            return (
              <Link
                key={g.title}
                href={g.href}
                onClick={() => playTapSound()}
                className="card-duo-elevated p-4 flex items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-[#FAF9F6] text-zinc-800">
                  <Icon className="h-4 w-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-950 truncate">
                    {g.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {g.sub}
                  </div>
                  <div className="font-mono text-[10px] font-medium text-blue-700 mt-1.5 tabular-nums">
                    {g.meta}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CUSTOM VOICE ROLEPLAY BUILDER */}
      <section className="card-duo-elevated p-5 sm:p-6 space-y-4">
        <div>
          <div className="font-mono text-[11px] font-semibold text-blue-700">
            MÔ PHỎNG TÌNH HUỐNG TÙY CHỈNH
          </div>
          <h2 className="mt-1 text-base font-bold text-zinc-950">
            Tự đặt bối cảnh hội thoại tiếng Anh bạn sắp gặp ngoài đời thực
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Nhập bất kỳ tình huống công việc hoặc đời sống nào để luyện nói trực tiếp và nhận góp ý diễn đạt.
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
            placeholder="Ví dụ: Họp báo cáo tiến độ dự án, hỏi thuê căn hộ, trả lời phỏng vấn..."
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!customRoleplayInput.trim()}
            className="btn-duo btn-duo-primary px-5 py-2.5 text-sm shrink-0"
          >
            <PhoneCall className="h-4 w-4" />
            Bắt đầu hội thoại
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {CUSTOM_ROLEPLAY_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => startCall('free-talk-custom', preset)}
              className="rounded-lg border border-zinc-200 bg-[#FAF9F6] px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400 hover:bg-white transition cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      {/* VOICE CALL SCENARIOS LIBRARY */}
      <section className="card-duo p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-950">
              Thư viện tình huống hội thoại ({SCENARIOS.length} chủ đề)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Hoàn thành tối thiểu 3 lượt nói để được tính 1 bài giữ chuỗi và xuất báo cáo 4 kỹ năng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              setShowScenarioDrawer((v) => !v);
            }}
            className="btn-duo btn-duo-white px-3.5 py-1.5 text-xs"
          >
            {showScenarioDrawer ? 'Thu gọn' : `Xem tất cả ${SCENARIOS.length} chủ đề`}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(showScenarioDrawer ? SCENARIOS : SCENARIOS.slice(0, 4)).map(
            (scenario) => {
              const CatIcon = getScenarioCategoryIcon(scenario.category);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => startCall(scenario.id)}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-[#FAF9F6] p-3.5 text-left hover:border-zinc-400 hover:bg-white transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-700">
                      <CatIcon className="h-4 w-4 stroke-[1.9]" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-950 truncate group-hover:text-blue-700">
                        {scenario.titleVi}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500 truncate mt-0.5 tabular-nums">
                        {scenario.recommendedLevel} · +60 XP · +15 Ngọc
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-900" />
                </button>
              );
            }
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 text-xs">
          <Link
            href="/phrases"
            className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 hover:text-zinc-950"
          >
            <BookOpen className="h-4 w-4 text-zinc-500" />
            Ôn tập sổ mẫu câu &amp; Flashcard →
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline"
          >
            Bảng xếp hạng tuần →
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
