import type {
  AiPersona,
  ConcreteAccent,
  Scenario,
  StarterPhrase,
  UserProfile,
} from '@/types';

export const AI_PERSONAS: AiPersona[] = [
  {
    id: 'emma-us',
    name: 'Emma',
    accent: 'US',
    accentLabel: 'Mỹ (American)',
    flag: '🇺🇸',
    edgeVoice: 'en-US-EmmaMultilingualNeural',
    browserLang: 'en-US',
    gender: 'female',
    taglineVi: 'Giọng Mỹ ấm áp, phát âm tròn vành rõ chữ, rất kiên nhẫn với người mới',
    gradient: 'from-indigo-500 to-cyan-500',
  },
  {
    id: 'andrew-us',
    name: 'Andrew',
    accent: 'US',
    accentLabel: 'Mỹ (American)',
    flag: '🇺🇸',
    edgeVoice: 'en-US-AndrewMultilingualNeural',
    browserLang: 'en-US',
    gender: 'male',
    taglineVi: 'Giọng nam Mỹ tự nhiên, thân thiện như đồng nghiệp hoặc bạn bè',
    gradient: 'from-blue-600 to-indigo-500',
  },
  {
    id: 'sonia-uk',
    name: 'Olivia',
    accent: 'UK',
    accentLabel: 'Anh - Anh (British)',
    flag: '🇬🇧',
    edgeVoice: 'en-GB-SoniaNeural',
    browserLang: 'en-GB',
    gender: 'female',
    taglineVi: 'Giọng Anh lịch sự, tinh tế, phù hợp luyện nghe giọng Anh chuẩn',
    gradient: 'from-rose-500 to-amber-500',
  },
  {
    id: 'ryan-uk',
    name: 'Oliver',
    accent: 'UK',
    accentLabel: 'Anh - Anh (British)',
    flag: '🇬🇧',
    edgeVoice: 'en-GB-RyanNeural',
    browserLang: 'en-GB',
    gender: 'male',
    taglineVi: 'Giọng nam Anh trầm ấm, chuyên nghiệp cho công việc & du lịch',
    gradient: 'from-purple-600 to-rose-500',
  },
  {
    id: 'natasha-au',
    name: 'Charlotte',
    accent: 'AU',
    accentLabel: 'Úc (Australian)',
    flag: '🇦🇺',
    edgeVoice: 'en-AU-NatashaNeural',
    browserLang: 'en-AU',
    gender: 'female',
    taglineVi: 'Giọng Úc cởi mở, vui vẻ — tập làm quen ngữ điệu Úc ngoài đời thực',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'clara-ca',
    name: 'Clara',
    accent: 'CA',
    accentLabel: 'Canada (Canadian)',
    flag: '🇨🇦',
    edgeVoice: 'en-CA-ClaraNeural',
    browserLang: 'en-CA',
    gender: 'female',
    taglineVi: 'Giọng Canada êm ái, tốc độ tự nhiên và rất dễ nghe',
    gradient: 'from-red-500 to-orange-500',
  },
];

export const SCENARIOS: Scenario[] = [
  // Daily & Small Talk
  {
    id: 'daily-small-talk',
    titleVi: 'Kết bạn & Small Talk theo sở thích',
    titleEn: 'Friendly Small Talk',
    descriptionVi: 'Tám chuyện nhẹ nhàng về ngày hôm nay và những sở thích của chính bạn.',
    category: 'daily',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You just bumped into the user at a friendly community meetup or co-working lounge. Start casual small talk, ask about their day and connect around their personal hobbies.',
    emoji: '☕',
  },
  {
    id: 'daily-coffee-shop',
    titleVi: 'Gọi đồ uống & nói chuyện ở quán cà phê',
    titleEn: 'At the Coffee Shop',
    descriptionVi: 'Thực hành gọi món, chọn size/đá/đường và trò chuyện nhanh với nhân viên.',
    category: 'daily',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are a warm barista at a cozy coffee shop. Greet the user, help them order a drink and maybe a pastry, and ask one friendly casual question.',
    emoji: '🥐',
  },
  {
    id: 'daily-weekend',
    titleVi: 'Kế hoạch cuối tuần & Phim / Nhạc',
    titleEn: 'Weekend Plans & Entertainment',
    descriptionVi: 'Học cách hỏi và kể về cuối tuần, phim mới xem hoặc quán ăn ngon.',
    category: 'daily',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are the user’s English-speaking friend chatting on Friday afternoon about weekend plans, favorite movies, music, or relaxing activities.',
    emoji: '🎬',
  },
  // Business English
  {
    id: 'business-intro',
    titleVi: 'Giới thiệu bản thân & Công việc của bạn',
    titleEn: 'Introduce Yourself & Your Work',
    descriptionVi: 'Luyện nói trôi chảy bạn làm nghề gì, công việc hàng ngày ra sao theo ngành của bạn.',
    category: 'business',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are an international colleague or partner meeting the user for the first time on a video call. Ask them to introduce themselves and talk simply about their job/field.',
    emoji: '💼',
  },
  {
    id: 'business-standup',
    titleVi: 'Họp nhanh đầu ngày (Daily Meeting)',
    titleEn: 'Quick Team Check-in',
    descriptionVi: 'Nói ngắn gọn hôm qua làm gì, hôm nay làm gì và cần hỗ trợ gì.',
    category: 'business',
    recommendedLevel: 'A2-B1',
    starterContext:
      'You are a friendly team lead running a quick 1-on-1 check-in. Ask what the user worked on yesterday, what they are doing today, and if anything is blocking them.',
    emoji: '📊',
  },
  {
    id: 'business-interview',
    titleVi: 'Phỏng vấn xin việc thân thiện',
    titleEn: 'Friendly Job Interview',
    descriptionVi: 'Tập trả lời các câu hỏi phỏng vấn phổ biến: điểm mạnh, kinh nghiệm, lý do ứng tuyển.',
    category: 'business',
    recommendedLevel: 'A2-B1',
    starterContext:
      'You are a welcoming hiring manager conducting an introductory interview. Ask one simple question at a time about the user’s background, strengths, and career goals.',
    emoji: '🤝',
  },
  {
    id: 'business-presentation',
    titleVi: 'Thuyết trình ngắn & Góp ý ý tưởng',
    titleEn: 'Mini Presentation & Pitch',
    descriptionVi: 'Tập trình bày một ý tưởng đơn giản trong 2-3 câu và trả lời câu hỏi.',
    category: 'business',
    recommendedLevel: 'A2-B1',
    starterContext:
      'You are a supportive colleague listening to the user pitch a small idea or update related to their field. Ask encouraging follow-up questions.',
    emoji: '🎤',
  },
  // Travel
  {
    id: 'travel-airport',
    titleVi: 'Check-in sân bay & Hải quan',
    titleEn: 'Airport & Immigration',
    descriptionVi: 'Trả lời câu hỏi ở quầy vé, chọn ghế ngồi và qua cửa nhập cảnh tự tin.',
    category: 'travel',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are a polite airport check-in agent / immigration officer. Ask simple questions about destination, passport, luggage, or length of stay.',
    emoji: '✈️',
  },
  {
    id: 'travel-restaurant',
    titleVi: 'Gọi món & thanh toán tại nhà hàng',
    titleEn: 'Ordering at a Restaurant',
    descriptionVi: 'Đặt bàn, hỏi món gợi ý, yêu cầu không cay và xin hóa đơn tự nhiên.',
    category: 'travel',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are a friendly restaurant server. Welcome the user, recommend a popular dish, take their order, and ask about allergies or drinks.',
    emoji: '🍽️',
  },
  {
    id: 'travel-hotel',
    titleVi: 'Nhận phòng khách sạn & hỏi đường',
    titleEn: 'Hotel Check-in & Directions',
    descriptionVi: 'Check-in phòng, hỏi mật khẩu Wi-Fi, giờ ăn sáng và đường đi xung quanh.',
    category: 'travel',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are a helpful hotel receptionist checking in the user and giving simple directions around the neighborhood.',
    emoji: '🏨',
  },
  // Free talk
  {
    id: 'free-talk-custom',
    titleVi: 'Trò chuyện tự do (Nói gì cũng được)',
    titleEn: 'Free Talk with AI Friend',
    descriptionVi: 'Thoải mái nói chuyện bất kỳ chủ đề nào như gọi điện cho người bạn nước ngoài.',
    category: 'freetalk',
    recommendedLevel: 'A0-A1',
    starterContext:
      'You are the user’s close native-speaking friend calling just to catch up. Keep the vibe warm, natural, and adapt immediately to whatever topic the user brings up.',
    emoji: '🌟',
  },
];

export const JOB_SUGGESTIONS = [
  'IT / Lập trình',
  'Kinh doanh / Bán hàng',
  'Marketing / Content',
  'Thiết kế / Sáng tạo',
  'Tài chính / Kế toán',
  'Sinh viên',
  'Kỹ thuật / Sản xuất',
  'Giáo dục / Y tế',
];

export const HOBBY_SUGGESTIONS = [
  'Du lịch',
  'Công nghệ & AI',
  'Phim ảnh',
  'Âm nhạc',
  'Cà phê & Ẩm thực',
  'Thể thao & Gym',
  'Chơi game',
  'Đọc sách',
  'Kinh doanh',
  'Chụp ảnh / Video',
];

export const STARTER_PHRASES: StarterPhrase[] = [
  {
    id: 'p1',
    english: "How's it going?",
    vietnamese: 'Dạo này sao rồi? / Mọi chuyện ổn chứ? (tự nhiên hơn How are you)',
    phonetic: 'hao-zít gâu-ing',
    example: "Hey! How's it going today?",
    category: 'daily',
  },
  {
    id: 'p2',
    english: "I'm doing pretty well, thanks!",
    vietnamese: 'Mình khá ổn, cảm ơn bạn nhé!',
    phonetic: 'am đu-ing pờ-rít-ti ueo, thenks',
    example: "I'm doing pretty well, thanks! How about you?",
    category: 'daily',
  },
  {
    id: 'p3',
    english: 'Could you speak a bit slower, please?',
    vietnamese: 'Bạn nói chậm lại một chút được không?',
    phonetic: 'cút du s-píc ơ bít s-lâu-ơ, p-li-z',
    example: "Sorry, I didn't catch that. Could you speak a bit slower, please?",
    category: 'daily',
  },
  {
    id: 'p4',
    english: 'What do you mean by that?',
    vietnamese: 'Ý bạn nói vậy là sao? (hỏi lại cực tự nhiên)',
    phonetic: 'uắt đu du min bai đát',
    example: "Sorry, I'm still learning English. What do you mean by that?",
    category: 'daily',
  },
  {
    id: 'p5',
    english: 'Sounds good to me!',
    vietnamese: 'Nghe hợp lý đấy! / Chốt nhé!',
    phonetic: 'sao-z gút tu mi',
    example: "Let's grab coffee at 3 PM. — Sounds good to me!",
    category: 'daily',
  },
  {
    id: 'p6',
    english: 'To be honest, I really enjoy...',
    vietnamese: 'Thành thật mà nói, mình rất thích...',
    phonetic: 'tu bi ó-nìst, ai ría-li in-doi',
    example: 'To be honest, I really enjoy watching movies on weekends.',
    category: 'daily',
  },
  {
    id: 'p7',
    english: 'No worries at all!',
    vietnamese: 'Không sao đâu / Đừng ngại nhé!',
    phonetic: 'nâu uơ-ri-z ét o',
    example: 'Thanks for waiting! — No worries at all!',
    category: 'daily',
  },
  {
    id: 'p8',
    english: "I'm currently working as a...",
    vietnamese: 'Hiện tại mình đang làm công việc...',
    phonetic: 'am cơ-rơnt-li uơ-king ez ơ',
    example: "I'm currently working as a software developer in Vietnam.",
    category: 'business',
  },
  {
    id: 'p9',
    english: 'Let me double-check and get back to you.',
    vietnamese: 'Để mình kiểm tra lại rồi phản hồi bạn nhé.',
    phonetic: 'lét mi đắp-bồ chéc en gét béc tu du',
    example: "I'm not 100% sure right now. Let me double-check and get back to you.",
    category: 'business',
  },
  {
    id: 'p10',
    english: 'Could we schedule a quick call?',
    vietnamese: 'Chúng ta hẹn một cuộc gọi nhanh được không?',
    phonetic: 'cút uy s-ke-đuồ ơ quýc co',
    example: 'Could we schedule a quick call tomorrow morning?',
    category: 'business',
  },
  {
    id: 'p11',
    english: "I'm responsible for...",
    vietnamese: 'Mình phụ trách mảng...',
    phonetic: 'am ri-s-pón-sơ-bồ pho',
    example: "I'm responsible for managing our online marketing campaigns.",
    category: 'business',
  },
  {
    id: 'p12',
    english: 'Can I get an iced latte, please?',
    vietnamese: 'Cho mình gọi một ly latte đá nhé?',
    phonetic: 'ken ai gét ân ai-st lá-tê, p-li-z',
    example: 'Hi there! Can I get a medium iced latte, please?',
    category: 'travel',
  },
  {
    id: 'p13',
    english: 'Where can I find the nearest...? ',
    vietnamese: 'Mình có thể tìm ... gần nhất ở đâu nhỉ?',
    phonetic: 'ue ken ai phai đơ nía-rìst',
    example: 'Excuse me, where can I find the nearest train station?',
    category: 'travel',
  },
  {
    id: 'p14',
    english: "I'm here on vacation for five days.",
    vietnamese: 'Tôi đến đây du lịch trong 5 ngày.',
    phonetic: 'am hia on vơ-kây-shần pho phai đây-z',
    example: "I'm here on vacation for five days and staying downtown.",
    category: 'travel',
  },
  {
    id: 'p15',
    english: 'Could I have the bill, please?',
    vietnamese: 'Làm ơn cho mình xin hóa đơn tính tiền nhé?',
    phonetic: 'cút ai hév đơ biu, p-li-z',
    example: "Everything was delicious! Could I have the bill, please?",
    category: 'travel',
  },
];

export function pickPersona(
  accentPref: UserProfile['preferredAccent'],
  personaId?: string
): AiPersona {
  if (personaId) {
    const exact = AI_PERSONAS.find((p) => p.id === personaId);
    if (exact) return exact;
  }

  if (accentPref === 'MIXED') {
    const idx = Math.floor(Math.random() * AI_PERSONAS.length);
    return AI_PERSONAS[idx];
  }

  const byAccent = AI_PERSONAS.find((p) => p.accent === accentPref);
  return byAccent ?? AI_PERSONAS[0];
}

export function resolveConcreteAccent(
  accent: UserProfile['preferredAccent']
): ConcreteAccent {
  if (accent === 'MIXED') {
    const options: ConcreteAccent[] = ['US', 'UK', 'AU', 'CA'];
    return options[Math.floor(Math.random() * options.length)];
  }
  return accent;
}
