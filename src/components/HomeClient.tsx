'use client';

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  Headphones,
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
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { HubPageSkeleton } from '@/components/PageSkeleton';
import {
  LeagueTrophySvg,
  NovaCompanion,
  ShieldFreezeSvg,
  TreasureChestSvg,
  TutorAvatar,
} from '@/components/BrandArt';
import {
  CelebrationModal,
  type CelebrationPayload,
} from '@/components/CelebrationModal';
import {
  PronunciationPracticeModal,
  type PronunciationPracticeTarget,
} from '@/components/PronunciationPracticeModal';
import { buildDailySmartFocus } from '@/lib/adaptive-coach';
import { playNaturalVoice, stopVoicePlayback } from '@/lib/audio';
import {
  applyStreakFreezeForYesterday,
  claimDailyQuestReward,
  claimStreakMilestone,
  getAuthSessionInfo,
  getCurrentProfile,
  getDailyStats,
  getTodayLocalDate,
  listRecentAssessedMessages,
  listSavedPhrases,
} from '@/lib/data-store';
import {
  analyzePronunciationInsights,
  type PronunciationInsightsSummary,
} from '@/lib/pronunciation-insights';
import {
  BADGE_DIRECTORY,
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
import { getPhraseReviewSummary } from '@/lib/spaced-repetition';
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
  coverImage: string;
  coverAlt: string;
  titleVi: string;
  subtitleVi: string;
  category: TopicCategory;
  stations: PathStation[];
}

const LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-daily',
    roman: 'Chương 1',
    tabLabel: 'Đời sống',
    coverImage: '/images/chapter-daily.jpg',
    coverAlt: 'Trò chuyện sáng tại quán cà phê',
    titleVi: 'Quán cà phê, làm quen & trò chuyện thường nhật',
    subtitleVi:
      'Làm quen tốc độ nối âm thực tế và những câu nói ngắn gọn người bản xứ dùng mỗi ngày.',
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
    roman: 'Chương 2',
    tabLabel: 'Công sở',
    coverImage: '/images/chapter-business.jpg',
    coverAlt: 'Đồng nghiệp trao đổi công việc trong phòng họp sáng',
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
    roman: 'Chương 3',
    tabLabel: 'Du lịch',
    coverImage: '/images/chapter-travel.jpg',
    coverAlt: 'Quán cà phê ngoài trời tại châu Âu vào giờ vàng',
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
    roman: 'Chương 4',
    tabLabel: 'Cá nhân hóa',
    coverImage: '/images/chapter-freetalk.jpg',
    coverAlt: 'Không gian trò chuyện cởi mở trong hiệu sách ấm cúng',
    titleVi: 'Tình huống theo công việc & sở thích của riêng bạn',
    subtitleVi:
      'Luyện tập các chủ đề chuyên biệt sát với lĩnh vực bạn đang làm việc và quan tâm.',
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
    origin: 'Seattle · Mỹ',
    role: 'Giao tiếp hàng ngày & Quán cà phê',
    sampleEn: 'Morning! Could I get a medium iced oat latte started for you?',
    sampleVi: 'Chào buổi sáng! Mình làm cho bạn một ly latte yến mạch đá cỡ vừa nhé?',
    edgeVoice: 'en-US-EmmaMultilingualNeural',
    browserLang: 'en-US',
  },
  {
    personaId: 'sonia-uk',
    name: 'Olivia',
    origin: 'London · Anh',
    role: 'Công sở & Thuyết trình',
    sampleEn: 'Lovely to meet you. Shall we walk through the project timeline together?',
    sampleVi: 'Rất vui được gặp bạn. Chúng ta cùng điểm qua tiến độ dự án nhé?',
    edgeVoice: 'en-GB-SoniaNeural',
    browserLang: 'en-GB',
  },
  {
    personaId: 'andrew-us',
    name: 'Andrew',
    origin: 'Chicago · Mỹ',
    role: 'Phỏng vấn & Họp nhóm',
    sampleEn: 'Thanks for the heads-up. Let us circle back on this tomorrow morning.',
    sampleVi: 'Cảm ơn bạn đã báo trước. Sáng mai chúng ta bàn tiếp việc này nhé.',
    edgeVoice: 'en-US-AndrewMultilingualNeural',
    browserLang: 'en-US',
  },
  {
    personaId: 'natasha-au',
    name: 'Charlotte',
    origin: 'Melbourne · Úc',
    role: 'Du lịch & Đời sống thực tế',
    sampleEn: 'No worries at all! The train to the city centre leaves from platform two.',
    sampleVi: 'Đừng lo nhé! Chuyến tàu vào trung tâm khởi hành ở sân ga số 2.',
    edgeVoice: 'en-AU-NatashaNeural',
    browserLang: 'en-AU',
  },
  {
    personaId: 'ryan-uk',
    name: 'Oliver',
    origin: 'Oxford · Anh',
    role: 'Đàm phán & Du lịch công tác',
    sampleEn: 'That sounds like a solid plan. Would Tuesday afternoon work on your end?',
    sampleVi: 'Kế hoạch đó rất ổn. Chiều thứ Ba phía bạn có thuận tiện không?',
    edgeVoice: 'en-GB-RyanNeural',
    browserLang: 'en-GB',
  },
  {
    personaId: 'clara-ca',
    name: 'Clara',
    origin: 'Toronto · Canada',
    role: 'Luyện nghe rõ âm cho người mới',
    sampleEn: 'Take your time — there is no rush at all. Let us try that phrase once more.',
    sampleVi: 'Cứ từ từ, không việc gì phải vội. Mình cùng thử lại câu đó một lần nữa nhé.',
    edgeVoice: 'en-CA-ClaraNeural',
    browserLang: 'en-CA',
  },
];

const DEMO_QUESTION = {
  contextVi: 'Tình huống công sở · Nhờ đồng nghiệp xem giúp tài liệu',
  promptVi:
    'Khi muốn nhờ đồng nghiệp xem lướt qua bản kế hoạch trước buổi họp một cách lịch sự, người bản xứ nói thế nào?',
  options: [
    {
      en: 'Could you take a quick look at this draft before two?',
      isCorrect: true,
      noteVi:
        'Rất tự nhiên! Cụm "take a quick look" nhẹ nhàng, lịch sự và phổ biến trong môi trường làm việc Anh – Mỹ.',
    },
    {
      en: 'Please see my plan fast before the meeting.',
      isCorrect: false,
      noteVi:
        'Câu này dịch sát từng chữ từ tiếng Việt ("xem nhanh"), nghe khá cứng và thiếu tự nhiên.',
    },
    {
      en: 'You check this document for me now, okay?',
      isCorrect: false,
      noteVi:
        'Thiếu cấu trúc nhờ vả lịch sự ("Could you..."), dễ tạo cảm giác thúc ép người nghe.',
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

export function HomeClient({
  initialAuthenticated = false,
}: {
  initialAuthenticated?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(initialAuthenticated);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo | null>(null);

  // Landing interactive state
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [demoPicked, setDemoPicked] = useState<string | null>(null);

  // Authenticated state
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const [duePhraseCount, setDuePhraseCount] = useState(0);
  const [pronInsights, setPronInsights] =
    useState<PronunciationInsightsSummary | null>(null);
  const [smartPracticeTarget, setSmartPracticeTarget] =
    useState<PronunciationPracticeTarget | null>(null);
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
        const [daily, savedPhrases, recentAssessed] = await Promise.all([
          getDailyStats(90),
          listSavedPhrases(),
          listRecentAssessedMessages(20),
        ]);
        if (!active) return;
        setStats(daily);
        setDuePhraseCount(getPhraseReviewSummary(savedPhrases).dueCount);
        setPronInsights(analyzePronunciationInsights(recentAssessed));
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
      onEnd: () =>
        setPlayingSampleId((cur) => (cur === sample.personaId ? null : cur)),
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

  function startCall(
    scenarioId: string,
    customTopic?: string,
    stationId?: string
  ) {
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
    if (stationId) {
      params.set('station', stationId);
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

  if (loading && authenticated) {
    return <HubPageSkeleton />;
  }

  // ============================================================================
  // PUBLIC MODERN CONSUMER LANDING PAGE (Airbnb / Cambly / Speak.com Craft)
  // ============================================================================
  if (!authenticated || !profile) {
    const selectedDemoObj = DEMO_QUESTION.options.find(
      (o) => o.en === demoPicked
    );
    const heroTutor = LANDING_VOICE_SAMPLES[0];
    const heroPlaying = playingSampleId === heroTutor.personaId;

    return (
      <div className="min-h-screen flex flex-col bg-white text-gray-900">
        <AppNav profile={null} authenticated={false} variant="landing" />

        <main id="main-content" className="flex-1">
          {/* 1. LUMINOUS PHOTOGRAPHIC SPLIT HERO */}
          <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16 sm:pt-14 sm:pb-24">
            <div className="grid gap-10 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <h1 className="font-display text-4xl sm:text-[54px] font-extrabold tracking-[-0.032em] text-gray-900 leading-[1.07]">
                  Nói tiếng Anh tự nhiên như đang trò chuyện cùng bạn bè.
                </h1>

                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                  Dành 10–15 phút mỗi ngày trò chuyện trực tiếp cùng 6 người hướng dẫn bản xứ, nhận phân tích phát âm đến từng âm tiết và rèn thói quen nói trôi chảy qua bài tập 2 phút.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/auth"
                    className="btn-duo btn-duo-coral px-7 py-3.5 text-sm sm:text-[15px]"
                  >
                    Bắt đầu học miễn phí
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/placement"
                    className="btn-duo btn-duo-white px-6 py-3.5 text-sm sm:text-[15px]"
                  >
                    Kiểm tra trình độ CEFR
                  </Link>
                </div>

                {/* Human Tutor Stack Proof */}
                <div className="flex items-center gap-3.5 pt-4">
                  <div className="flex -space-x-2.5">
                    {LANDING_VOICE_SAMPLES.slice(0, 5).map((t) => (
                      <TutorAvatar
                        key={t.personaId}
                        personaId={t.personaId}
                        className="h-10 w-10 ring-2 ring-white"
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 leading-snug">
                    <div className="font-semibold text-gray-900">
                      6 người hướng dẫn bản xứ Mỹ · Anh · Úc · Canada
                    </div>
                    <div>
                      Đồng bộ tiến trình tự động trên Google Drive của riêng bạn
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Real Editorial Hero Photograph + Live Click-to-Hear Bar */}
              <div className="lg:col-span-6">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-gray-100 shadow-[0_24px_64px_-24px_rgba(17,24,39,0.28)]">
                  <Image
                    src="/images/hero-studio.jpg"
                    alt="Người học Việt Nam trò chuyện tiếng Anh tự nhiên tại quán cà phê ngập nắng"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/55 to-transparent" />

                  {/* Real Floating Audio Sample Bar */}
                  <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5">
                    <button
                      type="button"
                      aria-pressed={heroPlaying}
                      onClick={() => handlePlayLandingVoice(heroTutor)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white/95 backdrop-blur-md p-3 sm:p-3.5 text-left shadow-lg hover:bg-white transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <TutorAvatar
                          personaId={heroTutor.personaId}
                          className="h-11 w-11 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-gray-900">
                              {heroTutor.name}
                            </span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500">{heroTutor.origin}</span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-gray-800 truncate mt-0.5">
                            &ldquo;{heroTutor.sampleEn}&rdquo;
                          </p>
                        </div>
                      </div>

                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                          heroPlaying
                            ? 'bg-[#E5483F] text-white'
                            : 'bg-gray-900 text-white'
                        }`}
                      >
                        {heroPlaying ? (
                          <Pause className="h-4 w-4 fill-current" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. MEET THE 6 NATIVE TUTORS (Real Portraits + Live Click-to-Hear) */}
          <section
            id="nghe-thu"
            className="bg-[#F6F7F9] py-16 sm:py-24 border-y border-gray-100"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2 max-w-xl">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                    Nghe thử 6 giọng đọc bản xứ thực tế
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Chạm vào từng người hướng dẫn để nghe ngữ điệu thực tế của giọng Mỹ, Anh, Úc và Canada ngay trên trình duyệt.
                  </p>
                </div>
                <a
                  href="#bai-hoc-thu"
                  className="text-sm font-semibold text-[#E5483F] hover:underline shrink-0"
                >
                  Thử trả lời 1 tình huống ngay →
                </a>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {LANDING_VOICE_SAMPLES.map((item) => {
                  const isPlaying = playingSampleId === item.personaId;
                  return (
                    <button
                      key={item.personaId}
                      type="button"
                      aria-pressed={isPlaying}
                      onClick={() => handlePlayLandingVoice(item)}
                      className={`group flex flex-col justify-between rounded-2xl border p-5 text-left transition cursor-pointer ${
                        isPlaying
                          ? 'border-[#E5483F] bg-white shadow-[0_12px_32px_-12px_rgba(229,72,63,0.28)]'
                          : 'border-gray-200/80 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <TutorAvatar
                              personaId={item.personaId}
                              className="h-14 w-14 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-display text-base font-bold text-gray-900">
                                {item.name}
                              </div>
                              <div className="text-xs font-medium text-gray-500">
                                {item.origin}
                              </div>
                              <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                {item.role}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                              isPlaying
                                ? 'bg-[#E5483F] text-white'
                                : 'bg-gray-100 text-gray-800 group-hover:bg-gray-900 group-hover:text-white'
                            }`}
                          >
                            {isPlaying ? (
                              <span className="flex items-end gap-0.5 h-3.5">
                                <span className="w-0.5 h-full bg-white rounded-full animate-eq-1" />
                                <span className="w-0.5 h-full bg-white rounded-full animate-eq-2" />
                                <span className="w-0.5 h-full bg-white rounded-full animate-eq-3" />
                              </span>
                            ) : (
                              <Play className="h-4 w-4 fill-current ml-0.5" />
                            )}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                          &ldquo;{item.sampleEn}&rdquo;
                        </p>
                      </div>

                      <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        {item.sampleVi}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. HIGH-CONTRAST DARK INTERACTIVE 30-SECOND TRYOUT (Apple / Speak.com pacing) */}
          <section
            id="bai-hoc-thu"
            className="bg-[#111318] text-white py-16 sm:py-24"
          >
            <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-8">
              <div className="max-w-2xl space-y-2.5">
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Khác biệt giữa dịch từng chữ và cách người bản xứ nói thật
                </h2>
                <p className="text-sm sm:text-base text-gray-400">
                  Chọn thử đáp án tự nhiên nhất bên dưới để nghe phát âm mẫu và giải thích ngay — không cần đăng nhập.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#181B22] p-6 sm:p-8 space-y-5 shadow-2xl">
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-400">
                    {DEMO_QUESTION.contextVi}
                  </div>
                  <p className="font-display text-lg sm:text-xl font-semibold text-white leading-snug">
                    {DEMO_QUESTION.promptVi}
                  </p>
                </div>

                <div className="space-y-3">
                  {DEMO_QUESTION.options.map((opt, idx) => {
                    const picked = demoPicked === opt.en;
                    const showState = demoPicked !== null;
                    let cls =
                      'border-white/12 bg-white/[0.04] text-white hover:border-white/30 hover:bg-white/[0.08]';
                    if (showState) {
                      if (opt.isCorrect) {
                        cls =
                          'border-emerald-400/70 bg-emerald-500/15 text-emerald-100';
                      } else if (picked) {
                        cls = 'border-[#E5483F]/70 bg-[#E5483F]/15 text-rose-100';
                      } else {
                        cls = 'border-white/8 bg-white/[0.02] text-gray-500';
                      }
                    }

                    return (
                      <button
                        key={opt.en}
                        type="button"
                        onClick={() => handlePickDemoOption(opt.en, opt.isCorrect)}
                        className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition cursor-pointer ${cls}`}
                      >
                        <span className="flex items-baseline gap-3.5">
                          <span className="font-mono text-xs text-gray-400">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-sm sm:text-base font-semibold">
                            {opt.en}
                          </span>
                        </span>
                        {showState && opt.isCorrect && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedDemoObj && (
                  <div className="rounded-2xl border border-white/10 bg-[#111318] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs font-bold ${
                            selectedDemoObj.isCorrect
                              ? 'text-emerald-400'
                              : 'text-amber-300'
                          }`}
                        >
                          {selectedDemoObj.isCorrect
                            ? 'Chính xác — Diễn đạt tự nhiên'
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
                          className="inline-flex items-center gap-1 text-xs font-semibold text-white underline cursor-pointer"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Nghe lại
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                        {selectedDemoObj.noteVi}
                      </p>
                      <p className="font-mono text-xs text-gray-400">
                        /{DEMO_QUESTION.phonetic}/
                      </p>
                    </div>

                    <Link
                      href="/auth"
                      className="btn-duo btn-duo-coral shrink-0 px-5 py-3 text-xs sm:text-sm"
                    >
                      Học trọn bộ lộ trình
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 4. PHOTOGRAPHIC 4-CHAPTER CURRICULUM GALLERY (Airbnb Experiences / MasterClass style) */}
          <section id="lo-trinh" className="bg-white py-16 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2 max-w-xl">
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
                    Bốn chặng thực hành từ đời sống đến công việc quốc tế
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    Mỗi chặng kết hợp bài tập phản xạ 2 phút, luyện nghe, hội thoại trực tiếp và mốc quà thưởng duy trì chuỗi ngày học.
                  </p>
                </div>
                <Link
                  href="/placement"
                  className="text-sm font-semibold text-[#E5483F] hover:underline shrink-0"
                >
                  Chưa rõ bắt đầu từ đâu? Đo CEFR 2 phút →
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-7">
                {LEARNING_UNITS.map((unit) => (
                  <Link
                    key={unit.id}
                    href="/auth"
                    className="group overflow-hidden rounded-3xl border border-gray-200/80 bg-white shadow-xs hover:shadow-xl transition duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                      <Image
                        src={unit.coverImage}
                        alt={unit.coverAlt}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 text-white">
                        <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-semibold">
                          {unit.roman} · {unit.tabLabel}
                        </span>
                        <h3 className="font-display text-xl font-bold mt-2 leading-snug">
                          {unit.titleVi}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {unit.subtitleVi}
                      </p>
                      <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-500">
                        {unit.stations
                          .filter((s) => s.kind !== 'chest')
                          .slice(0, 3)
                          .map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2">
                              <span className="truncate font-medium text-gray-700">
                                {s.titleVi}
                              </span>
                              <span className="shrink-0 text-gray-400">
                                {s.durationVi}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* 5. CLEAN MODERN FOOTER */}
        <footer className="border-t border-gray-200 bg-[#F6F7F9] py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 grid gap-8 sm:grid-cols-12">
            <div className="sm:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <NovaCompanion className="h-7 w-7" />
                <span className="font-display text-lg font-bold text-gray-900">
                  SpeakMate
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                Nền tảng luyện giao tiếp tiếng Anh thực tế dành cho người Việt. Tập trung phản xạ tự nhiên, chấm phát âm IPA, lặp lại ngắt quãng SRS và lưu trữ minh bạch trên Google Drive.
              </p>
            </div>

            <div className="sm:col-span-3 space-y-2.5 text-xs">
              <div className="font-bold text-gray-900">Trải nghiệm học</div>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/placement" className="hover:text-gray-900">
                    Kiểm tra định vị trình độ CEFR
                  </Link>
                </li>
                <li>
                  <a href="#nghe-thu" className="hover:text-gray-900">
                    6 giọng đọc bản xứ
                  </a>
                </li>
                <li>
                  <a href="#bai-hoc-thu" className="hover:text-gray-900">
                    Bài học thử 30 giây
                  </a>
                </li>
              </ul>
            </div>

            <div className="sm:col-span-4 space-y-2.5 text-xs">
              <div className="font-bold text-gray-900">Tài khoản &amp; Pháp lý</div>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <Link href="/auth" className="hover:text-gray-900">
                    Đăng nhập &amp; đồng bộ Google Drive
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-gray-900">
                    Chính sách quyền riêng tư
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-gray-900">
                    Điều khoản sử dụng
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-10 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} SpeakMate.</span>
            <span>US · UK · AU · CA Spoken English</span>
          </div>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED MODERN CONSUMER LEARNING HUB
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
  const explicitCompletedSet = new Set(profile.completedStationIds ?? []);

  // Backward-compatible fallback for lessons finished before per-station IDs were tracked
  const allLearnableIds = LEARNING_UNITS.flatMap((u) =>
    u.stations.filter((s) => s.kind !== 'chest').map((s) => s.id)
  );
  const legacyInferredCount = Math.max(
    0,
    profile.totalLessonsCompleted - explicitCompletedSet.size
  );
  for (let i = 0; i < allLearnableIds.length && i < legacyInferredCount; i++) {
    explicitCompletedSet.add(allLearnableIds[i]);
  }

  const learnableStationsInUnit = currentUnit.stations.filter(
    (s) => s.kind !== 'chest'
  );
  const completedInUnit = learnableStationsInUnit.filter((s) =>
    explicitCompletedSet.has(s.id)
  ).length;
  const firstPendingIdx = currentUnit.stations.findIndex(
    (s) => s.kind !== 'chest' && !explicitCompletedSet.has(s.id)
  );
  const activeStationIndex =
    firstPendingIdx >= 0 ? firstPendingIdx : currentUnit.stations.length - 1;

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
      const sep = station.href.includes('?') ? '&' : '?';
      router.push(`${station.href}${sep}station=${encodeURIComponent(station.id)}`);
      return;
    }
    if (station.scenarioId) {
      startCall(station.scenarioId, undefined, station.id);
    }
  }

  // CLEAN WHITE RIGHT PROGRESS RAIL
  const rightRail = (
    <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs space-y-6">
      {/* 1. Streak & 7-Day Rhythm */}
      <div className="space-y-3.5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs font-medium text-gray-500">Chuỗi học tập</div>
            <div className="font-display text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
              {profile.streakDays} ngày liên tiếp
            </div>
          </div>
          <Link
            href="/history"
            className="text-xs font-semibold text-[#E5483F] hover:underline"
          >
            Lịch tháng →
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5 tabular-nums">
          {miniWeek.map((d) => (
            <div key={d.dateStr} className="flex flex-col items-center gap-1">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs transition ${
                  d.studied
                    ? 'border-[#059669] bg-[#059669] text-white'
                    : d.frozen
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : d.isToday
                        ? 'border-dashed border-[#E5483F] bg-rose-50/50 text-[#E5483F]'
                        : 'border-gray-200 bg-gray-50 text-gray-300'
                }`}
              >
                {d.studied ? (
                  <Check className="h-4 w-4 stroke-[2.5]" />
                ) : d.frozen ? (
                  <Shield className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[11px] font-bold">
                    {d.isToday ? '•' : ''}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  d.isToday
                    ? 'font-bold text-gray-900'
                    : 'font-medium text-gray-400'
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
      <div className="border-t border-gray-100 pt-5 space-y-3.5 tabular-nums">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-bold text-gray-900">Mục tiêu hôm nay</h2>
          <span className="text-[11px] text-gray-500">
            {claimedQuestsToday.length}/{DAILY_QUEST_DEFS.length} xong
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
              <div key={q.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-gray-700 truncate">{title}</span>
                  {claimed ? (
                    <span className="text-emerald-600 font-semibold shrink-0">
                      Đã nhận
                    </span>
                  ) : done ? (
                    <button
                      type="button"
                      disabled={claimingQuestId === q.id}
                      onClick={() => void handleClaimDailyQuest(q.id, title)}
                      className="shrink-0 rounded-full bg-[#E5483F] px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-[#cf3a31] cursor-pointer"
                    >
                      Nhận +{q.rewardGems}
                    </button>
                  ) : (
                    <span className="text-gray-400 shrink-0 text-[11px]">
                      {current}/{target} {unit}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      done ? 'bg-emerald-500' : 'bg-gray-900'
                    }`}
                    style={{ width: `${Math.max(done ? 100 : 4, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Streak Milestone Reward */}
      <div className="border-t border-gray-100 pt-5 space-y-3 tabular-nums">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <TreasureChestSvg
              state={claimableMilestones.length > 0 ? 'ready' : 'locked'}
              className="h-9 w-9"
            />
            <div>
              <div className="text-xs font-bold text-gray-900">
                {claimableMilestones.length > 0
                  ? `Quà mốc ${claimableMilestones[0].days} ngày sẵn sàng`
                  : `Mốc thưởng kế tiếp: ${nextMilestone.days} ngày`}
              </div>
              <div className="text-[11px] text-gray-500">
                +{nextMilestone.rewardXp} XP · +{nextMilestone.rewardGems} Ngọc
              </div>
            </div>
          </div>
          <Link
            href="/history#rewards"
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 shrink-0"
          >
            Xem
          </Link>
        </div>

        {claimableMilestones.length > 0 && (
          <button
            type="button"
            disabled={claimingDays !== null}
            onClick={() =>
              void handleClaimStreakReward(claimableMilestones[0].days)
            }
            className="btn-duo btn-duo-coral w-full py-2.5 text-xs"
          >
            <Gift className="h-3.5 w-3.5" />
            {claimingDays !== null
              ? 'Đang mở...'
              : `Nhận quà mốc ${claimableMilestones[0].days} ngày`}
          </button>
        )}
      </div>

      {/* 3.5 Spaced Repetition Due Reminder */}
      {duePhraseCount > 0 && (
        <div className="border-t border-gray-100 pt-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-gray-900">
              Ôn từ vựng ngắt quãng
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
              Có <strong className="text-[#E5483F]">{duePhraseCount}</strong> câu đến hạn ôn hôm nay
            </div>
          </div>
          <Link
            href="/phrases"
            className="text-xs font-semibold text-[#E5483F] hover:underline shrink-0"
          >
            Ôn ngay →
          </Link>
        </div>
      )}

      {/* 4. League & Cloud Footer */}
      <div className="border-t border-gray-100 pt-5 space-y-3 tabular-nums">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <LeagueTrophySvg tier={league.tier} className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">
                {league.nameVi} · Cấp {levelInfo.level}
              </div>
              <div className="text-[11px] text-gray-500">
                {profile.xp} XP · {profile.englishLevel}
                {boostActive ? ` · 2x (${boostMins}p)` : ''}
              </div>
            </div>
          </div>
          <Link
            href="/leaderboard"
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 shrink-0"
          >
            Xếp hạng →
          </Link>
        </div>

        <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
          <span>
            {isDriveActive ? 'Đã đồng bộ Google Drive' : 'Lưu cục bộ trên máy'}
          </span>
          <div className="flex items-center gap-3">
            <Link href="/placement" className="text-gray-600 hover:text-gray-900 font-medium">
              Đo CEFR
            </Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900 font-medium">
              Cài đặt
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const unitPct = Math.round(
    (completedInUnit / Math.max(1, learnableStationsInUnit.length)) * 100
  );
  const smartFocus = buildDailySmartFocus({
    profile,
    studiedToday: strict.studiedToday,
    duePhraseCount,
    pronInsights,
  });

  return (
    <AppShell profile={profile} authenticated={authenticated} rightRail={rightRail}>
      {/* Greeting + Visual Photo Tutor Picker */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            {profile.activeBadge && BADGE_DIRECTORY[profile.activeBadge] && (
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-[#FFF1F0] px-3 py-0.5 text-[11px] font-semibold text-[#E5483F]">
                <span>Danh hiệu: {BADGE_DIRECTORY[profile.activeBadge]}</span>
              </div>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Chào {profile.displayName || 'bạn'}, sẵn sàng luyện nói hôm nay?
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {strict.studiedToday
                ? 'Hôm nay bạn đã giữ vững chuỗi ngày học. Luyện thêm để bứt phá thứ hạng tuần này.'
                : 'Chỉ cần hoàn thành trọn vẹn 1 bài bên dưới để tính giữ chuỗi ngày hôm nay.'}
            </p>
          </div>
        </div>

        {/* Visual Circular Photo Tutor Picker Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {AI_PERSONAS.map((p) => {
            const isSelected = activeTutor.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  playTapSound();
                  setSelectedPersonaId(p.id);
                }}
                className={`inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3.5 py-1 text-xs font-semibold transition shrink-0 cursor-pointer ${
                  isSelected
                    ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <TutorAvatar personaId={p.id} className="h-7 w-7" />
                <span>{p.name}</span>
                <span className={isSelected ? 'text-gray-300' : 'text-gray-400'}>
                  {p.accent}
                </span>
              </button>
            );
          })}
        </div>

        {/* Smart Adaptive Coach Priority Card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1F0] px-2.5 py-0.5 text-[11px] font-semibold text-[#E5483F]">
              <Zap className="h-3 w-3" />
              {smartFocus.badgeVi}
            </span>
            <h2 className="font-display text-base sm:text-lg font-bold text-gray-900">
              {smartFocus.titleVi}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              {smartFocus.reasonVi}
            </p>
          </div>

          {smartFocus.kind === 'weak-word' && smartFocus.weakWordTarget ? (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setSmartPracticeTarget({
                  sentence: smartFocus.weakWordTarget!.sampleSentence,
                  phonetic: smartFocus.weakWordTarget!.ipa,
                });
              }}
              className="btn-duo btn-duo-coral shrink-0 px-4 py-2.5 text-xs sm:text-sm"
            >
              <Mic className="h-4 w-4" />
              {smartFocus.ctaLabelVi}
            </button>
          ) : (
            <Link
              href={smartFocus.href || '/play'}
              onClick={() => playTapSound()}
              className="btn-duo btn-duo-primary shrink-0 px-4 py-2.5 text-xs sm:text-sm"
            >
              {smartFocus.ctaLabelVi}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Chapter Pill Tabs + Photographic Chapter Hero Banner */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
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
                className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-[#E5483F] text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {u.roman} · {u.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Photographic Active Chapter Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 text-white shadow-md">
          <Image
            src={currentUnit.coverImage}
            alt={currentUnit.coverAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 760px"
            className="object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />

          <div className="relative z-10 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="space-y-2.5 max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold">
                <span>{currentUnit.roman}</span>
                <span>·</span>
                <span className="tabular-nums">
                  {completedInUnit}/{learnableStationsInUnit.length} bài đã xong ({unitPct}%)
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold leading-snug">
                {currentUnit.titleVi}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                {currentUnit.subtitleVi}
              </p>
              <div className="h-1.5 max-w-xs rounded-full bg-white/20 overflow-hidden pt-0">
                <div
                  className="h-full rounded-full bg-[#E5483F] transition-all duration-300"
                  style={{ width: `${Math.max(8, unitPct)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                handleLaunchStation(
                  currentUnit.stations[activeStationIndex] ?? currentUnit.stations[0]
                )
              }
              className="btn-duo btn-duo-coral shrink-0 px-6 py-3 text-sm"
            >
              Học bài tiếp theo
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Elevated White Lesson Track */}
        <section className="rounded-3xl border border-gray-200/80 bg-white shadow-xs overflow-hidden divide-y divide-gray-100">
          {currentUnit.stations.map((station, idx) => {
            const Icon = getStationIcon(station.kind);
            const isChest = station.kind === 'chest';
            const isDone = !isChest && explicitCompletedSet.has(station.id);
            const isActive = idx === activeStationIndex;
            const chestReady = isChest && claimableMilestones.length > 0;

            return (
              <div
                key={station.id}
                onClick={() => handleLaunchStation(station)}
                className={`group flex items-center justify-between gap-4 px-5 py-4 transition cursor-pointer ${
                  isActive
                    ? 'bg-rose-50/45'
                    : chestReady
                      ? 'bg-amber-50/50'
                      : 'bg-white hover:bg-gray-50/80'
                }`}
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition ${
                      isDone
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : isActive
                          ? 'border-[#E5483F] bg-[#E5483F] text-white shadow-sm'
                          : 'border-gray-200 bg-gray-50 text-gray-500 group-hover:border-gray-300'
                    }`}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4 stroke-[2.6]" />
                    ) : isChest ? (
                      <Gift className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                        <Icon className="h-3.5 w-3.5" />
                        {station.modeLabel}
                      </span>
                      <span>·</span>
                      <span>{station.durationVi}</span>
                    </div>
                    <h3 className="mt-0.5 text-sm sm:text-[15px] font-bold text-gray-900 group-hover:text-[#E5483F] transition">
                      {station.titleVi}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {station.subtitleVi}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  {station.xpValue !== null && (
                    <span className="hidden sm:inline rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                      +{station.xpValue} XP
                    </span>
                  )}
                  <span
                    className={`text-xs font-bold ${
                      isActive || chestReady
                        ? 'text-[#E5483F]'
                        : 'text-gray-500 group-hover:text-gray-900'
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

      {/* CUSTOM ROLEPLAY & 13-SCENARIO LIBRARY */}
      <section className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-xs space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <TutorAvatar personaId={activeTutor.id} className="h-11 w-11 shrink-0" />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-gray-900">
                Hội thoại theo tình huống riêng cùng {activeTutor.name}
              </h2>
              <p className="text-xs text-gray-500">
                Nhập bối cảnh bạn sắp gặp ngoài đời thực để trò chuyện trực tiếp bằng giọng nói.
              </p>
            </div>
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
              className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-900 focus:border-gray-900 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customRoleplayInput.trim()}
              className="btn-duo btn-duo-primary px-6 py-3 text-sm shrink-0"
            >
              <PhoneCall className="h-4 w-4" />
              Bắt đầu gọi
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {CUSTOM_ROLEPLAY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => startCall('free-talk-custom', preset)}
                className="rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-900 hover:bg-white hover:text-gray-900 transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              Thư viện tình huống có sẵn ({SCENARIOS.length} chủ đề)
            </h3>
            <button
              type="button"
              onClick={() => setShowScenarioDrawer((v) => !v)}
              className="text-xs font-semibold text-[#E5483F] hover:underline cursor-pointer"
            >
              {showScenarioDrawer
                ? 'Thu gọn'
                : `Xem tất cả ${SCENARIOS.length} chủ đề`}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {(showScenarioDrawer ? SCENARIOS : SCENARIOS.slice(0, 4)).map(
              (scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => startCall(scenario.id)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-[#F6F7F9]/60 p-4 text-left hover:border-gray-300 hover:bg-white hover:shadow-xs transition cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-[#E5483F] transition truncate">
                      {scenario.titleVi}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {scenario.descriptionVi}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white border border-gray-200 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    {scenario.recommendedLevel}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      </section>

      <PronunciationPracticeModal
        target={smartPracticeTarget}
        persona={activeTutor}
        profile={profile}
        onClose={() => setSmartPracticeTarget(null)}
      />

      <CelebrationModal
        payload={celebration}
        onClose={() => setCelebration(null)}
      />
    </AppShell>
  );
}
