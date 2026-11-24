'use client';

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  Headphones,
  Loader2,
  Mic,
  Pause,
  PhoneCall,
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
  LeagueTrophySvg,
  ShieldFreezeSvg,
  TreasureChestSvg,
  TutorAvatar,
} from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import { playNaturalVoice, stopVoicePlayback } from '@/lib/audio';
import {
  applyStreakFreezeForYesterday,
  claimDailyQuestReward,
  claimStreakMilestone,
  getAuthSessionInfo,
  getCurrentProfile,
  getDailyStats,
  getTodayLocalDate,
  listSavedPhrases,
} from '@/lib/data-store';
import { getPhraseReviewSummary } from '@/lib/spaced-repetition';
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
import {
  playChestOpenSound,
  playCorrectSound,
  playTapSound,
  playWrongSound,
} from '@/lib/sound-fx';
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
  roman: string;
  tabLabel: string;
  titleVi: string;
  subtitleVi: string;
  category: TopicCategory;
  stations: PathStation[];
}

const LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-daily',
    roman: 'Chương I',
    tabLabel: 'I · Đời sống',
    titleVi: 'Quán cà phê, làm quen & trò chuyện thường nhật',
    subtitleVi:
      'Làm quen với tốc độ nối âm thực tế và các mẫu câu ngắn gọn người bản xứ dùng hàng ngày.',
    category: 'daily',
    stations: [
      {
        id: 'u1-1',
        kind: 'speed',
        modeLabel: 'Phản xạ câu',
        titleVi: 'Chọn cách nói tự nhiên trong 15 giây',
        subtitleVi: 'Tránh thói quen dịch từng từ từ tiếng Việt sang tiếng Anh.',
        xpValue: 85,
        gemsValue: 20,
        durationVi: '2 phút',
        href: '/play?mode=speed&category=daily',
      },
      {
        id: 'u1-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe hội thoại tại quán cà phê buổi sáng',
        subtitleVi: 'Bắt ý chính qua tốc độ nói và ngữ điệu đời thường.',
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
        subtitleVi: 'Ghi nhớ cấu trúc câu thông dụng qua thao tác ghép từ.',
        xpValue: 95,
        gemsValue: 25,
        durationVi: '3 phút',
        href: '/play?mode=build&category=daily',
      },
      {
        id: 'u1-4',
        kind: 'call',
        modeLabel: 'Hội thoại trực tiếp',
        titleVi: 'Thực hành gọi đồ uống cùng Emma',
        subtitleVi: 'Mở lời bằng giọng nói, nhận phân tích IPA từng âm tiết.',
        xpValue: 60,
        gemsValue: 15,
        durationVi: '4 phút',
        scenarioId: 'daily-coffee-shop',
      },
      {
        id: 'u1-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Phần thưởng duy trì chuỗi ngày học',
        subtitleVi: 'Mở khóa điểm thưởng, Khiên bảo vệ chuỗi và danh hiệu.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u1-6',
        kind: 'boss',
        modeLabel: 'Tổng hợp chương',
        titleVi: 'Trò chuyện Small Talk xoay quanh sở thích',
        subtitleVi: 'Kết nối câu chuyện tự nhiên với người mới quen.',
        xpValue: 80,
        gemsValue: 25,
        durationVi: '4 phút',
        scenarioId: 'daily-small-talk',
      },
    ],
  },
  {
    id: 'unit-business',
    roman: 'Chương II',
    tabLabel: 'II · Công sở',
    titleVi: 'Họp nhóm, trao đổi tiến độ & phỏng vấn tuyển dụng',
    subtitleVi:
      'Diễn đạt gãy gọn, lịch thiệp khi làm việc cùng đồng nghiệp và đối tác nước ngoài.',
    category: 'business',
    stations: [
      {
        id: 'u2-1',
        kind: 'speed',
        modeLabel: 'Phản xạ câu',
        titleVi: 'Phản hồi khéo léo trong cuộc họp',
        subtitleVi: 'Các cụm từ lịch sự khi xin thêm thời gian hoặc góp ý.',
        xpValue: 85,
        gemsValue: 20,
        durationVi: '2 phút',
        href: '/play?mode=speed&category=business',
      },
      {
        id: 'u2-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe cập nhật tiến độ & thay đổi lịch họp',
        subtitleVi: 'Nắm bắt thông tin thời hạn và người phụ trách.',
        xpValue: 90,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen&category=business',
      },
      {
        id: 'u2-3',
        kind: 'build',
        modeLabel: 'Cấu trúc câu',
        titleVi: 'Sắp xếp câu giao tiếp nơi công sở',
        subtitleVi: 'Rèn văn phong rõ ràng, chuyên nghiệp.',
        xpValue: 95,
        gemsValue: 25,
        durationVi: '3 phút',
        href: '/play?mode=build&category=business',
      },
      {
        id: 'u2-4',
        kind: 'pronounce',
        modeLabel: 'Phát âm IPA',
        titleVi: 'Trọng âm & nối âm trong câu công việc',
        subtitleVi: 'Đọc to 3 câu mẫu và xem nhận xét chi tiết từng từ.',
        xpValue: 110,
        gemsValue: 30,
        durationVi: '3 phút',
        href: '/play?mode=pronounce&category=business',
      },
      {
        id: 'u2-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Phần thưởng duy trì thói quen',
        subtitleVi: 'Nhận thêm điểm thưởng và Khiên bảo vệ chuỗi.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u2-6',
        kind: 'boss',
        modeLabel: 'Tổng hợp chương',
        titleVi: 'Mô phỏng buổi phỏng vấn trực tiếp',
        subtitleVi: 'Trình bày kinh nghiệm, thế mạnh và mục tiêu nghề nghiệp.',
        xpValue: 90,
        gemsValue: 30,
        durationVi: '5 phút',
        scenarioId: 'business-interview',
      },
    ],
  },
  {
    id: 'unit-travel',
    roman: 'Chương III',
    tabLabel: 'III · Du lịch',
    titleVi: 'Sân bay, khách sạn, hỏi đường & dùng bữa',
    subtitleVi:
      'Xử lý trôi chảy các tình huống thực tế khi đi công tác hoặc du lịch tự túc nước ngoài.',
    category: 'travel',
    stations: [
      {
        id: 'u3-1',
        kind: 'speed',
        modeLabel: 'Phản xạ câu',
        titleVi: 'Giao tiếp tại quầy thủ tục & hỏi đường',
        subtitleVi: 'Đặt câu hỏi ngắn, lịch sự khi cần hỗ trợ.',
        xpValue: 85,
        gemsValue: 20,
        durationVi: '2 phút',
        href: '/play?mode=speed&category=travel',
      },
      {
        id: 'u3-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe thông báo sân bay & hướng dẫn di chuyển',
        subtitleVi: 'Nghe giờ lên máy bay, đổi cổng và chỉ dẫn phương tiện.',
        xpValue: 90,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen&category=travel',
      },
      {
        id: 'u3-3',
        kind: 'call',
        modeLabel: 'Hội thoại trực tiếp',
        titleVi: 'Làm thủ tục sân bay & qua cửa nhập cảnh',
        subtitleVi: 'Trả lời trực tiếp câu hỏi về lịch trình và lưu trú.',
        xpValue: 60,
        gemsValue: 15,
        durationVi: '4 phút',
        scenarioId: 'travel-airport',
      },
      {
        id: 'u3-4',
        kind: 'pronounce',
        modeLabel: 'Phát âm IPA',
        titleVi: 'Luyện phát âm rõ âm cuối khi đi du lịch',
        subtitleVi: 'Giúp người bản xứ nghe hiểu ngay từ lần đầu.',
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
        subtitleVi: 'Theo dõi tiến trình mốc 14, 30 và 60 ngày.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u3-6',
        kind: 'boss',
        modeLabel: 'Tổng hợp chương',
        titleVi: 'Đặt bàn, gọi món & thanh toán tại nhà hàng',
        subtitleVi: 'Hỏi món đặc trưng, ghi chú khẩu vị và xin hóa đơn.',
        xpValue: 90,
        gemsValue: 30,
        durationVi: '4 phút',
        scenarioId: 'travel-restaurant',
      },
    ],
  },
  {
    id: 'unit-ai-infinite',
    roman: 'Chương IV',
    tabLabel: 'IV · Cá nhân hóa',
    titleVi: 'Tình huống biên soạn theo công việc & mối quan tâm riêng',
    subtitleVi:
      'Luyện tập các chủ đề chuyên biệt sát với lĩnh vực bạn đang làm việc và yêu thích.',
    category: 'freetalk',
    stations: [
      {
        id: 'u4-1',
        kind: 'ai-quiz',
        modeLabel: 'Bài tập riêng',
        titleVi: 'Bộ 5 câu hỏi phản xạ từ sở thích của bạn',
        subtitleVi: 'Tự động biên soạn mới mỗi lần mở bài.',
        xpValue: 100,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=ai-quiz',
      },
      {
        id: 'u4-2',
        kind: 'listen',
        modeLabel: 'Nghe hiểu',
        titleVi: 'Nghe hiểu tổng hợp nhiều giọng đọc',
        subtitleVi: 'Kết hợp ngữ cảnh đời sống, công sở và du lịch.',
        xpValue: 95,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=listen',
      },
      {
        id: 'u4-3',
        kind: 'pronounce',
        modeLabel: 'Phát âm IPA',
        titleVi: 'Hoàn thiện nhịp điệu & trọng âm câu dài',
        subtitleVi: 'Hướng tới ngưỡng 85+ điểm phát âm tự nhiên.',
        xpValue: 120,
        gemsValue: 30,
        durationVi: '3 phút',
        href: '/play?mode=pronounce',
      },
      {
        id: 'u4-4',
        kind: 'speed',
        modeLabel: 'Phản xạ câu',
        titleVi: 'Ôn tập ngẫu nhiên đa tình huống',
        subtitleVi: 'Kiểm tra tốc độ phản xạ trên toàn bộ ngân hàng câu.',
        xpValue: 100,
        gemsValue: 25,
        durationVi: '2 phút',
        href: '/play?mode=speed',
      },
      {
        id: 'u4-5',
        kind: 'chest',
        modeLabel: 'Cột mốc chuỗi',
        titleVi: 'Cột mốc 60–100 ngày kiên trì',
        subtitleVi: 'Mở khóa danh hiệu cao nhất trên bảng thành tích.',
        xpValue: null,
        gemsValue: null,
        durationVi: 'Mốc ngày',
      },
      {
        id: 'u4-6',
        kind: 'boss',
        modeLabel: 'Hội thoại mở',
        titleVi: 'Trò chuyện tự do theo chủ đề bạn chọn',
        subtitleVi: 'Trao đổi sâu bằng tiếng Anh không giới hạn kịch bản.',
        xpValue: 100,
        gemsValue: 30,
        durationVi: '5 phút',
        scenarioId: 'free-talk-custom',
      },
    ],
  },
];

const LANDING_VOICE_SAMPLES = [
  {
    personaId: 'emma-us',
    name: 'Emma',
    origin: 'Seattle · Giọng Mỹ',
    role: 'Giao tiếp hàng ngày & Quán cà phê',
    sampleEn: 'Morning! Could I get a medium iced oat latte started for you?',
    sampleVi: 'Chào buổi sáng! Mình làm cho bạn một ly latte yến mạch đá cỡ vừa nhé?',
    edgeVoice: 'en-US-EmmaMultilingualNeural',
    browserLang: 'en-US',
  },
  {
    personaId: 'sonia-uk',
    name: 'Olivia',
    origin: 'London · Giọng Anh',
    role: 'Tiếng Anh công sở & Thuyết trình',
    sampleEn: 'Lovely to meet you. Shall we walk through the project timeline together?',
    sampleVi: 'Rất vui được gặp bạn. Chúng ta cùng điểm qua tiến độ dự án nhé?',
    edgeVoice: 'en-GB-SoniaNeural',
    browserLang: 'en-GB',
  },
  {
    personaId: 'natasha-au',
    name: 'Charlotte',
    origin: 'Melbourne · Giọng Úc',
    role: 'Du lịch & Đời sống thực tế',
    sampleEn: 'No worries at all! The train to the city centre leaves from platform two.',
    sampleVi: 'Đừng lo nhé! Chuyến tàu vào trung tâm thành phố khởi hành ở sân ga số 2.',
    edgeVoice: 'en-AU-NatashaNeural',
    browserLang: 'en-AU',
  },
  {
    personaId: 'andrew-us',
    name: 'Andrew',
    origin: 'Chicago · Giọng Mỹ',
    role: 'Phỏng vấn & Họp nhóm kỹ thuật',
    sampleEn: 'Thanks for the heads-up. Let us circle back on this tomorrow morning.',
    sampleVi: 'Cảm ơn bạn đã báo trước. Sáng mai chúng ta bàn tiếp việc này nhé.',
    edgeVoice: 'en-US-AndrewMultilingualNeural',
    browserLang: 'en-US',
  },
];

const DEMO_QUESTION = {
  contextVi: 'Tình huống công sở · Nhờ đồng nghiệp xem giúp tài liệu',
  promptVi:
    'Khi muốn nhờ đồng nghiệp xem lướt qua bản kế hoạch trước buổi họp một cách lịch sự, người bản xứ thường nói câu nào?',
  options: [
    {
      en: 'Could you take a quick look at this draft before two?',
      isCorrect: true,
      noteVi:
        'Tự nhiên nhất! Cụm "take a quick look" nhẹ nhàng, lịch sự và rất phổ biến nơi công sở Anh – Mỹ.',
    },
    {
      en: 'Please see my plan fast before the meeting.',
      isCorrect: false,
      noteVi:
        'Câu này dịch sát từng chữ từ tiếng Việt ("xem nhanh"), nghe hơi cứng và giống mệnh lệnh.',
    },
    {
      en: 'You check this document for me now, okay?',
      isCorrect: false,
      noteVi:
        'Thiếu cấu trúc nhờ vả lịch sự ("Could you..."), dễ gây cảm giác thúc ép người nghe.',
    },
  ],
  phonetic: 'kʊd juː teɪk ə kwɪk lʊk æt ðɪs dræft bɪˈfɔːr tuː',
};

const CUSTOM_ROLEPLAY_PRESETS = [
  'Phỏng vấn vị trí kỹ sư phần mềm bằng tiếng Anh',
  'Hỏi thông tin phòng khách sạn và giờ nhận phòng sớm',
  'Trò chuyện cuối tuần về sách, phim và âm nhạc',
  'Báo cáo tiến độ công việc trong buổi họp đầu tuần',
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
    case 'boss':
      return PhoneCall;
    case 'pronounce':
      return Mic;
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

  // Landing interactive state
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [demoPicked, setDemoPicked] = useState<string | null>(null);

  // Authenticated state
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const [duePhraseCount, setDuePhraseCount] = useState(0);
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
        const [daily, savedPhrases] = await Promise.all([
          getDailyStats(90),
          listSavedPhrases(),
        ]);
        if (!active) return;
        setStats(daily);
        setDuePhraseCount(getPhraseReviewSummary(savedPhrases).dueCount);
      }

      setLoading(false);
    }

    void load();
    return () => {
      active = false;
      stopVoicePlayback();
    };
  }, [router]);

  function handlePlayLandingVoice(sample: (typeof LANDING_VOICE_SAMPLES)[number]) {
    if (playingSampleId === sample.personaId) {
      stopVoicePlayback();
      setPlayingSampleId(null);
      return;
    }
    setPlayingSampleId(sample.personaId);
    void playNaturalVoice({
      text: sample.sampleEn,
      voice: sample.edgeVoice,
      browserLang: sample.browserLang,
      speed: 0.92,
      onEnd: () => setPlayingSampleId((cur) => (cur === sample.personaId ? null : cur)),
    });
  }

  function handlePickDemoOption(optEn: string, isCorrect: boolean) {
    setDemoPicked(optEn);
    if (isCorrect) {
      playCorrectSound();
    } else {
      playWrongSound();
    }
    void playNaturalVoice({
      text: DEMO_QUESTION.options[0].en,
      voice: 'en-US-EmmaMultilingualNeural',
      browserLang: 'en-US',
      speed: 0.9,
    });
  }

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
        title: 'Đã giữ nguyên chuỗi ngày học',
        subtitle: `Khiên bảo vệ đã nối lại chuỗi ${res.profile.streakDays} ngày liên tiếp cho bạn.`,
      });
    } finally {
      setFreezing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#FBF9F5]">
        <Loader2 className="h-5 w-5 animate-spin text-[#78716C]" />
      </div>
    );
  }

  // ============================================================================
  // PUBLIC HUMAN-CRAFTED EDITORIAL WEBSITE (Babbel / Cambly / NYT Games Craft)
  // ============================================================================
  if (!authenticated || !profile) {
    const selectedDemoObj = DEMO_QUESTION.options.find(
      (o) => o.en === demoPicked
    );

    return (
      <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
        <AppNav profile={null} authenticated={false} variant="landing" />

        <main className="flex-1">
          {/* 1. EDITORIAL HERO + REAL LIVE AUDIO ROSTER */}
          <section className="border-b border-[#E7E2D8]">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 grid gap-12 lg:grid-cols-12 items-start">
              {/* Left Column: Literary Serif Headline & Clear Proposition */}
              <div className="lg:col-span-7 space-y-6 pt-2">
                <p className="font-serif-display italic text-base sm:text-lg text-[#C2410C]">
                  Thực hành giao tiếp tiếng Anh mỗi ngày
                </p>

                <h1 className="font-serif-display text-4xl sm:text-[54px] font-semibold tracking-[-0.02em] text-[#1C1917] leading-[1.08]">
                  Mở lời nói tiếng Anh tự nhiên như đang trò chuyện thật.
                </h1>

                <p className="text-base sm:text-[17px] text-[#57534E] leading-[1.7] max-w-xl">
                  Thay vì học thuộc lòng từ rời rạc, bạn dành 10–15 phút mỗi ngày nghe ngữ điệu người bản xứ, tập phản xạ trong ngữ cảnh quán cà phê, cuộc họp hay sân bay và nhận góp ý phát âm chi tiết đến từng âm tiết.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/auth"
                    className="btn-duo btn-duo-primary px-6 py-3.5 text-sm"
                  >
                    Bắt đầu học miễn phí
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/placement"
                    className="btn-duo btn-duo-white px-5 py-3.5 text-sm"
                  >
                    Kiểm tra trình độ CEFR (2 phút)
                  </Link>
                  <a
                    href="#bai-hoc-thu"
                    className="text-sm font-medium text-[#57534E] hover:text-[#1C1917] underline px-2 py-2"
                  >
                    Làm thử 1 câu ↓
                  </a>
                </div>

                <dl className="pt-8 mt-4 border-t border-[#E7E2D8] grid grid-cols-3 gap-6">
                  <div>
                    <dt className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                      6 người hướng dẫn
                    </dt>
                    <dd className="text-xs text-[#78716C] mt-1">
                      Giọng Mỹ, Anh, Úc &amp; Canada
                    </dd>
                  </div>
                  <div>
                    <dt className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                      Phân tích IPA
                    </dt>
                    <dd className="text-xs text-[#78716C] mt-1">
                      Chỉ rõ âm cuối, trọng âm &amp; nối âm
                    </dd>
                  </div>
                  <div>
                    <dt className="font-serif-display text-2xl font-semibold text-[#1C1917]">
                      Lưu trữ tự động
                    </dt>
                    <dd className="text-xs text-[#78716C] mt-1">
                      Đồng bộ qua Google Drive cá nhân
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Right Column: Real Click-to-Hear Voice Tutors */}
              <div
                id="nghe-thu"
                className="lg:col-span-5 rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/75 p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-baseline justify-between border-b border-[#E7E2D8] pb-3">
                  <div>
                    <h2 className="font-serif-display text-lg font-semibold text-[#1C1917]">
                      Nghe thử giọng người hướng dẫn
                    </h2>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      Bấm vào từng người để nghe câu chào mẫu thực tế
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {LANDING_VOICE_SAMPLES.map((item) => {
                    const isPlaying = playingSampleId === item.personaId;
                    return (
                      <button
                        key={item.personaId}
                        type="button"
                        onClick={() => handlePlayLandingVoice(item)}
                        className={`w-full rounded-xl border p-3.5 text-left transition cursor-pointer ${
                          isPlaying
                            ? 'border-[#14532D] bg-white shadow-xs'
                            : 'border-[#E7E2D8] bg-white/85 hover:bg-white hover:border-[#D6CFC2]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <TutorAvatar
                              personaId={item.personaId}
                              className="h-11 w-11"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#1C1917]">
                                  {item.name}
                                </span>
                                <span className="text-xs text-[#78716C]">
                                  · {item.origin}
                                </span>
                              </div>
                              <div className="text-xs text-[#57534E] truncate">
                                {item.role}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                              isPlaying
                                ? 'border-[#C2410C] bg-[#C2410C] text-white'
                                : 'border-[#D6CFC2] bg-[#FBF9F5] text-[#1C1917]'
                            }`}
                          >
                            {isPlaying ? (
                              <Pause className="h-3.5 w-3.5 fill-current" />
                            ) : (
                              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                            )}
                          </span>
                        </div>

                        <p className="mt-2.5 font-serif-display italic text-[14px] text-[#1C1917] leading-snug">
                          &ldquo;{item.sampleEn}&rdquo;
                        </p>
                        {isPlaying && (
                          <p className="mt-1 text-xs text-[#57534E]">
                            {item.sampleVi}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 2. INTERACTIVE 30-SECOND LESSON TRYOUT RIGHT ON LANDING PAGE */}
          <section
            id="bai-hoc-thu"
            className="border-b border-[#E7E2D8] bg-white py-16 sm:py-20"
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-8">
              <div className="max-w-2xl space-y-2">
                <p className="font-serif-display italic text-base text-[#14532D]">
                  Trải nghiệm trực tiếp · Không cần tạo tài khoản
                </p>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
                  Khác biệt giữa &ldquo;dịch từng chữ&rdquo; và cách người bản xứ thực sự nói
                </h2>
                <p className="text-sm text-[#57534E]">
                  Chọn thử đáp án bạn nghĩ tự nhiên nhất bên dưới để nghe phát âm mẫu và giải thích:
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7E2D8] bg-[#FBF9F5] p-5 sm:p-8 space-y-5">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#78716C]">
                    {DEMO_QUESTION.contextVi}
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-[#1C1917] leading-snug">
                    {DEMO_QUESTION.promptVi}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {DEMO_QUESTION.options.map((opt, idx) => {
                    const picked = demoPicked === opt.en;
                    const showState = demoPicked !== null;
                    let cls =
                      'border-[#D6CFC2] bg-white text-[#1C1917] hover:border-[#1C1917]';
                    if (showState) {
                      if (opt.isCorrect) {
                        cls =
                          'border-[#14532D] bg-[#14532D]/[0.06] text-[#14532D]';
                      } else if (picked) {
                        cls = 'border-[#C2410C] bg-[#C2410C]/[0.06] text-[#9A3412]';
                      } else {
                        cls = 'border-[#E7E2D8] bg-white/60 text-[#78716C]';
                      }
                    }

                    return (
                      <button
                        key={opt.en}
                        type="button"
                        onClick={() => handlePickDemoOption(opt.en, opt.isCorrect)}
                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition cursor-pointer ${cls}`}
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-mono text-xs text-[#78716C]">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <span className="font-serif-display text-base sm:text-[17px] font-medium">
                            {opt.en}
                          </span>
                        </span>
                        {showState && opt.isCorrect && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#14532D]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedDemoObj && (
                  <div className="rounded-xl border border-[#E7E2D8] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            selectedDemoObj.isCorrect
                              ? 'text-[#14532D]'
                              : 'text-[#C2410C]'
                          }`}
                        >
                          {selectedDemoObj.isCorrect
                            ? 'Chính xác — Diễn đạt rất tự nhiên'
                            : 'Gợi ý chỉnh lại cho tự nhiên hơn'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void playNaturalVoice({
                              text: DEMO_QUESTION.options[0].en,
                              voice: 'en-US-EmmaMultilingualNeural',
                              browserLang: 'en-US',
                              speed: 0.88,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#1C1917] underline cursor-pointer"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Nghe lại
                        </button>
                      </div>
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        {selectedDemoObj.noteVi}
                      </p>
                      <p className="font-mono text-[11px] text-[#78716C]">
                        /{DEMO_QUESTION.phonetic}/
                      </p>
                    </div>

                    <Link
                      href="/auth"
                      className="btn-duo btn-duo-primary shrink-0 px-5 py-2.5 text-xs"
                    >
                      Học tiếp trọn bộ lộ trình
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. EDITORIAL CURRICULUM INDEX (Book Table-of-Contents Layout) */}
          <section id="lo-trinh" className="py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E7E2D8] pb-6">
                <div className="space-y-1.5 max-w-xl">
                  <p className="font-serif-display italic text-base text-[#C2410C]">
                    Cấu trúc chương trình
                  </p>
                  <h2 className="font-serif-display text-2xl sm:text-4xl font-semibold text-[#1C1917]">
                    Bốn chặng thực hành từ đời sống đến công việc quốc tế
                  </h2>
                </div>
                <Link
                  href="/placement"
                  className="text-sm font-semibold text-[#14532D] hover:underline shrink-0"
                >
                  Định vị trình độ CEFR để chọn chặng phù hợp →
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                {LEARNING_UNITS.map((unit) => (
                  <div
                    key={unit.id}
                    className="border-b border-[#E7E2D8] pb-7 space-y-2.5"
                  >
                    <div className="font-serif-display italic text-sm text-[#78716C]">
                      {unit.roman}
                    </div>
                    <h3 className="font-serif-display text-xl font-semibold text-[#1C1917]">
                      {unit.titleVi}
                    </h3>
                    <p className="text-sm text-[#57534E] leading-relaxed">
                      {unit.subtitleVi}
                    </p>
                    <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#78716C]">
                      {unit.stations
                        .filter((s) => s.kind !== 'chest')
                        .slice(0, 3)
                        .map((s) => (
                          <span key={s.id}>· {s.titleVi}</span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* 4. PROPER HUMAN-CRAFTED EDITORIAL FOOTER */}
        <footer className="border-t border-[#E7E2D8] bg-[#F3EFE6]/70 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-8 sm:grid-cols-12">
            <div className="sm:col-span-5 space-y-3">
              <div className="flex items-baseline gap-0.5">
                <span className="font-serif-display text-xl font-bold text-[#1C1917]">
                  SpeakMate
                </span>
                <span className="font-serif-display text-xl font-bold text-[#C2410C]">
                  .
                </span>
              </div>
              <p className="text-xs text-[#57534E] leading-relaxed max-w-sm">
                Không gian rèn phản xạ nghe – nói tiếng Anh dành cho người học Việt Nam. Tập trung vào câu chữ thực tế, duy trì thói quen đều đặn mỗi ngày và lưu trữ dữ liệu minh bạch.
              </p>
            </div>

            <div className="sm:col-span-3 space-y-2 text-xs">
              <div className="font-semibold text-[#1C1917]">Kỹ năng rèn luyện</div>
              <ul className="space-y-1.5 text-[#57534E]">
                <li>
                  <Link href="/auth" className="hover:text-[#1C1917]">
                    Phản xạ câu 15 giây
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="hover:text-[#1C1917]">
                    Nghe hiểu ngữ cảnh bản xứ
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="hover:text-[#1C1917]">
                    Hội thoại &amp; chấm điểm IPA
                  </Link>
                </li>
              </ul>
            </div>

            <div className="sm:col-span-4 space-y-2 text-xs">
              <div className="font-semibold text-[#1C1917]">Tài khoản &amp; Pháp lý</div>
              <ul className="space-y-1.5 text-[#57534E]">
                <li>
                  <Link href="/placement" className="hover:text-[#1C1917]">
                    Kiểm tra định vị trình độ CEFR (A1–C1)
                  </Link>
                </li>
                <li>
                  <Link href="/auth" className="hover:text-[#1C1917]">
                    Đăng nhập &amp; đồng bộ Google Drive
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[#1C1917]">
                    Chính sách quyền riêng tư
                  </Link>
                  {' · '}
                  <Link href="/terms" className="hover:text-[#1C1917]">
                    Điều khoản sử dụng
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-10 pt-6 border-t border-[#E7E2D8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#78716C]">
            <span>© {new Date().getFullYear()} SpeakMate. Thiết kế cho việc học thực chất mỗi ngày.</span>
            <span>US · UK · AU · CA Spoken English</span>
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED CURRICULUM STUDIO (Open Editorial Layout — Zero Box Soup)
  // ============================================================================
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

  const activeTutor =
    selectedPersonaId === 'auto'
      ? pickPersona(profile.preferredAccent)
      : AI_PERSONAS.find((p) => p.id === selectedPersonaId) ?? AI_PERSONAS[0];

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

  // CALM RIGHT EDITORIAL NOTEBOOK RAIL (Single Cohesive Linen Sheet Instead of 6 Separate Shadow Cards)
  const rightRail = (
    <div className="rounded-2xl border border-[#E7E2D8] bg-[#F3EFE6]/65 p-5 space-y-6">
      {/* 1. Streak & 7-Day Rhythm */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs text-[#78716C]">Nhịp độ học tập</div>
            <div className="font-serif-display text-2xl font-semibold text-[#1C1917] tabular-nums">
              Chuỗi {profile.streakDays} ngày
            </div>
          </div>
          <Link
            href="/history"
            className="text-xs font-medium text-[#14532D] hover:underline"
          >
            Lịch tháng →
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5 tabular-nums pt-1">
          {miniWeek.map((d) => (
            <div key={d.dateStr} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                  d.studied
                    ? 'border-[#14532D] bg-[#14532D] text-white'
                    : d.frozen
                      ? 'border-slate-500 bg-slate-500 text-white'
                      : d.isToday
                        ? 'border-dashed border-[#C2410C] bg-white text-[#C2410C]'
                        : 'border-[#E7E2D8] bg-white/70 text-[#A8A29E]'
                }`}
              >
                {d.studied ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : d.frozen ? (
                  <Shield className="h-3 w-3" />
                ) : (
                  <span className="text-[10px]">
                    {d.isToday ? '•' : ''}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  d.isToday
                    ? 'font-semibold text-[#1C1917]'
                    : 'text-[#78716C]'
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
            className="btn-duo btn-duo-white w-full py-2 text-xs"
          >
            <ShieldFreezeSvg className="h-3.5 w-3.5" />
            {freezing ? 'Đang kích hoạt...' : 'Dùng 1 Khiên cho ngày hôm qua'}
          </button>
        )}
      </div>

      {/* 2. Daily Goals */}
      <div className="border-t border-[#E7E2D8] pt-5 space-y-3 tabular-nums">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold text-[#1C1917]">
            Mục tiêu hôm nay
          </h2>
          <span className="text-[11px] text-[#78716C]">
            {claimedQuestsToday.length}/{DAILY_QUEST_DEFS.length} hoàn thành
          </span>
        </div>

        <div className="space-y-3">
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
              <div key={q.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[#1C1917] truncate">{title}</span>
                  {claimed ? (
                    <span className="text-[#14532D] font-medium shrink-0">
                      Đã nhận
                    </span>
                  ) : done ? (
                    <button
                      type="button"
                      disabled={claimingQuestId === q.id}
                      onClick={() => void handleClaimDailyQuest(q.id, title)}
                      className="shrink-0 rounded bg-[#C2410C] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#9A3412] cursor-pointer"
                    >
                      Nhận +{q.rewardGems}
                    </button>
                  ) : (
                    <span className="text-[#78716C] shrink-0 text-[11px]">
                      {current}/{target} {unit}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#E7E2D8] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#14532D] transition-all duration-300"
                    style={{ width: `${Math.max(done ? 100 : 3, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Streak Milestone Reward */}
      <div className="border-t border-[#E7E2D8] pt-5 space-y-3 tabular-nums">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <TreasureChestSvg
              state={claimableMilestones.length > 0 ? 'ready' : 'locked'}
              className="h-7 w-7"
            />
            <div>
              <div className="text-xs font-semibold text-[#1C1917]">
                {claimableMilestones.length > 0
                  ? `Mở thưởng mốc ${claimableMilestones[0].days} ngày`
                  : `Cột mốc kế tiếp: ${nextMilestone.days} ngày`}
              </div>
              <div className="text-[11px] text-[#78716C]">
                +{nextMilestone.rewardXp} XP · +{nextMilestone.rewardGems} điểm thưởng
              </div>
            </div>
          </div>
          <Link
            href="/history#rewards"
            className="text-xs font-medium text-[#14532D] hover:underline shrink-0"
          >
            Kho quà
          </Link>
        </div>

        {claimableMilestones.length > 0 && (
          <button
            type="button"
            disabled={claimingDays !== null}
            onClick={() =>
              void handleClaimStreakReward(claimableMilestones[0].days)
            }
            className="btn-duo btn-duo-orange w-full py-2 text-xs"
          >
            <Gift className="h-3.5 w-3.5" />
            {claimingDays !== null
              ? 'Đang mở...'
              : `Nhận thưởng mốc ${claimableMilestones[0].days} ngày`}
          </button>
        )}
      </div>

      {/* 3.5 Spaced Repetition Due Reminder */}
      {duePhraseCount > 0 && (
        <div className="border-t border-[#E7E2D8] pt-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[#1C1917]">
              Ôn tập ngắt quãng (SRS)
            </div>
            <div className="text-[11px] text-[#57534E] mt-0.5 tabular-nums">
              Có <strong className="text-[#C2410C]">{duePhraseCount}</strong> mẫu câu đến lịch ôn hôm nay
            </div>
          </div>
          <Link
            href="/phrases"
            className="text-xs font-semibold text-[#14532D] hover:underline shrink-0"
          >
            Ôn ngay →
          </Link>
        </div>
      )}

      {/* 4. League & Cloud Footer */}
      <div className="border-t border-[#E7E2D8] pt-5 space-y-3 tabular-nums">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <LeagueTrophySvg tier={league.tier} className="h-7 w-7 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1C1917] truncate">
                {league.nameVi} · Cấp {levelInfo.level} ({profile.englishLevel})
              </div>
              <div className="text-[11px] text-[#78716C]">
                {profile.xp} XP tích lũy
                {boostActive ? ` · 2x XP (${boostMins}p)` : ''}
              </div>
            </div>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs font-medium text-[#14532D] hover:underline shrink-0"
          >
            Xếp hạng →
          </Link>
        </div>

        <div className="text-[11px] text-[#78716C] flex items-center justify-between pt-1">
          <span>
            {isDriveActive
              ? 'Đã kết nối lưu trữ Google Drive'
              : 'Đang lưu cục bộ trên trình duyệt'}
          </span>
          <div className="flex items-center gap-2.5">
            <Link href="/placement" className="underline hover:text-[#1C1917]">
              Đo CEFR
            </Link>
            <Link href="/settings" className="underline hover:text-[#1C1917]">
              Thiết lập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell profile={profile} authenticated={authenticated} rightRail={rightRail}>
      {/* Open Editorial Greeting & Tutor Picker (No Card Box!) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E7E2D8]">
        <div className="space-y-1">
          <p className="text-xs text-[#78716C]">
            {strict.studiedToday
              ? 'Bạn đã hoàn thành mục tiêu giữ chuỗi hôm nay.'
              : 'Hoàn thành 1 bài luyện tập bên dưới để duy trì chuỗi ngày học.'}
          </p>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
            Chào {profile.displayName || 'bạn'}, hôm nay mình luyện chủ đề nào?
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <TutorAvatar personaId={activeTutor.id} className="h-9 w-9" />
          <div className="text-xs">
            <label htmlFor="home-tutor-select" className="block text-[11px] text-[#78716C]">
              Người hướng dẫn
            </label>
            <select
              id="home-tutor-select"
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="bg-transparent font-semibold text-[#1C1917] focus:outline-none cursor-pointer"
            >
              <option value="auto">
                {activeTutor.name} ({profile.preferredAccent} mặc định)
              </option>
              {AI_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.accentLabel}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chapter Navigation Tabs — Clean Editorial Underlines */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-6 border-b border-[#E7E2D8]">
          {LEARNING_UNITS.map((u, idx) => {
            const active = idx === activeUnitIdx;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setActiveUnitIdx(idx);
                }}
                className={`relative pb-3 text-sm transition cursor-pointer ${
                  active
                    ? 'font-semibold text-[#14532D]'
                    : 'font-medium text-[#78716C] hover:text-[#1C1917]'
                }`}
              >
                {u.tabLabel}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#14532D]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Chapter Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="font-serif-display italic text-sm text-[#C2410C]">
              {currentUnit.roman} · Đã hoàn thành {completedInUnit}/{currentUnit.stations.length} mục
            </div>
            <h2 className="font-serif-display text-xl sm:text-2xl font-semibold text-[#1C1917]">
              {currentUnit.titleVi}
            </h2>
            <p className="text-xs sm:text-sm text-[#57534E]">
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
            Học bài tiếp theo
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Single Clean Curriculum Sheet */}
        <section className="card-duo overflow-hidden divide-y divide-[#E7E2D8]">
          {currentUnit.stations.map((station, idx) => {
            const Icon = getStationIcon(station.kind);
            const isChest = station.kind === 'chest';
            const isDone = !isChest && idx < completedInUnit;
            const isActive = idx === activeStationIndex;
            const chestReady = isChest && claimableMilestones.length > 0;

            return (
              <div
                key={station.id}
                onClick={() => handleLaunchStation(station)}
                className={`group flex items-center justify-between gap-4 px-5 py-4 transition cursor-pointer ${
                  isActive
                    ? 'bg-[#14532D]/[0.04]'
                    : chestReady
                      ? 'bg-[#C2410C]/[0.05]'
                      : 'bg-white hover:bg-[#FBF9F5]'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <span
                    className={`font-serif-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm ${
                      isDone
                        ? 'border-[#14532D] bg-[#14532D] text-white'
                        : isActive
                          ? 'border-[#C2410C] bg-[#C2410C] text-white font-semibold'
                          : 'border-[#D6CFC2] bg-[#FBF9F5] text-[#57534E]'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : isChest ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
                      <span className="inline-flex items-center gap-1 font-medium text-[#57534E]">
                        <Icon className="h-3.5 w-3.5" />
                        {station.modeLabel}
                      </span>
                      <span>·</span>
                      <span>{station.durationVi}</span>
                    </div>
                    <h3 className="mt-0.5 text-sm sm:text-[15px] font-semibold text-[#1C1917] group-hover:text-[#14532D] transition">
                      {station.titleVi}
                    </h3>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      {station.subtitleVi}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 tabular-nums">
                  {station.xpValue !== null && (
                    <span className="hidden sm:inline text-xs text-[#78716C]">
                      +{station.xpValue} XP
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      isActive || chestReady
                        ? 'text-[#C2410C]'
                        : 'text-[#57534E] group-hover:text-[#1C1917]'
                    }`}
                  >
                    {isChest
                      ? chestReady
                        ? 'Mở quà →'
                        : 'Xem mốc →'
                      : isDone
                        ? 'Ôn lại →'
                        : 'Bắt đầu →'}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {/* CUSTOM ROLEPLAY & SCENARIO INDEX — Open Editorial Section */}
      <section className="pt-4 border-t border-[#E7E2D8] space-y-6">
        <div className="space-y-3">
          <div>
            <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
              Thực hành hội thoại theo tình huống riêng
            </h2>
            <p className="text-xs sm:text-sm text-[#57534E] mt-0.5">
              Nhập một bối cảnh bạn sắp gặp ngoài đời thực để trò chuyện trực tiếp cùng {activeTutor.name}.
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
              placeholder="Ví dụ: Họp báo cáo tiến độ dự án, đặt phòng khách sạn ở Tokyo..."
              className="flex-1 rounded-xl border border-[#D6CFC2] bg-white px-4 py-2.5 text-sm text-[#1C1917] focus:border-[#14532D] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customRoleplayInput.trim()}
              className="btn-duo btn-duo-primary px-5 py-2.5 text-sm shrink-0"
            >
              <PhoneCall className="h-4 w-4" />
              Bắt đầu trò chuyện
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {CUSTOM_ROLEPLAY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => startCall('free-talk-custom', preset)}
                className="rounded-full border border-[#E7E2D8] bg-white px-3.5 py-1.5 text-xs text-[#57534E] hover:border-[#1C1917] hover:text-[#1C1917] transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Clean Scenario List with Hairlines */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-[#1C1917]">
              Thư viện tình huống có sẵn ({SCENARIOS.length} chủ đề)
            </h3>
            <button
              type="button"
              onClick={() => setShowScenarioDrawer((v) => !v)}
              className="text-xs font-semibold text-[#14532D] hover:underline cursor-pointer"
            >
              {showScenarioDrawer
                ? 'Thu gọn'
                : `Xem đầy đủ ${SCENARIOS.length} chủ đề`}
            </button>
          </div>

          <div className="divide-y divide-[#E7E2D8] border-y border-[#E7E2D8]">
            {(showScenarioDrawer ? SCENARIOS : SCENARIOS.slice(0, 4)).map(
              (scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => startCall(scenario.id)}
                  className="group w-full flex items-center justify-between gap-4 py-3.5 text-left hover:bg-[#F3EFE6]/50 px-2 transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1917] group-hover:text-[#14532D] transition">
                      {scenario.titleVi}
                    </div>
                    <div className="text-xs text-[#78716C] truncate mt-0.5">
                      {scenario.descriptionVi}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-[#78716C] group-hover:text-[#1C1917] flex items-center gap-1">
                    {scenario.recommendedLevel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </section>

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
