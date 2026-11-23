import type { TopicCategory } from '@/types';

export interface SpeedMatchQuestion {
  id: string;
  category: Exclude<TopicCategory, 'freetalk'>;
  promptVi: string;
  contextVi: string;
  correctEn: string;
  phonetic: string;
  options: string[];
  tipVi: string;
}

export interface SentenceBuildQuestion {
  id: string;
  category: Exclude<TopicCategory, 'freetalk'>;
  meaningVi: string;
  phonetic: string;
  sentenceEn: string;
  words: string[];
  tipVi: string;
}

export interface PronunciationChallengeItem {
  id: string;
  category: Exclude<TopicCategory, 'freetalk'>;
  sentence: string;
  vietnamese: string;
  phonetic: string;
  focusTipVi: string;
}

export const SPEED_MATCH_QUESTIONS: SpeedMatchQuestion[] = [
  {
    id: 'sm-1',
    category: 'daily',
    promptVi: 'Hỏi thăm bạn bè cực tự nhiên kiểu người Mỹ (thay cho "How are you?")',
    contextVi: 'Gặp bạn quen ở quán cà phê',
    correctEn: "Hey! How's it going?",
    phonetic: 'hây! hao-zít gâu-ing',
    options: [
      "Hey! How's it going?",
      'Hello, how is your body?',
      'Hi, are you healthy today?',
      'Good morning, what are you doing health?',
    ],
    tipVi: 'Người bản xứ dùng "How\'s it going?" hoặc "How\'ve you been?" tự nhiên hơn nhiều so với sách giáo khoa.',
  },
  {
    id: 'sm-2',
    category: 'daily',
    promptVi: 'Nhờ người nước ngoài nói chậm lại một chút khi bạn nghe chưa kịp',
    contextVi: 'Đang trò chuyện với người mới quen',
    correctEn: 'Could you speak a bit slower, please?',
    phonetic: 'cút du s-píc ơ bít s-lâu-ơ, p-li-z',
    options: [
      'Could you speak a bit slower, please?',
      'Speak slow please, I cannot hear!',
      'You talk too fast, stop please.',
      'Please low your voice speed now.',
    ],
    tipVi: 'Dùng "Could you... please?" cực kỳ lịch sự và khiến người bản xứ rất vui vẻ hỗ trợ bạn.',
  },
  {
    id: 'sm-3',
    category: 'daily',
    promptVi: 'Đồng ý hẹn đi uống cà phê một cách tự nhiên ("Nghe hợp lý đấy / Chốt nhé!")',
    contextVi: 'Bạn rủ: "Want to grab coffee at 3 PM?"',
    correctEn: 'Sounds good to me!',
    phonetic: 'sao-z gút tu mi',
    options: [
      'Sounds good to me!',
      'I listen very good!',
      'Yes, it has good voice.',
      'I agree to drink coffee with you.',
    ],
    tipVi: '"Sounds good to me!" là câu cửa miệng dùng hàng ngày thay cho "Yes, I agree".',
  },
  {
    id: 'sm-4',
    category: 'daily',
    promptVi: 'Đáp lại lời xin lỗi hoặc cảm ơn thân thiện ("Không có gì / Đừng ngại nhé!")',
    contextVi: 'Bạn kia nói: "Sorry I am 5 minutes late!"',
    correctEn: 'No worries at all!',
    phonetic: 'nâu uơ-ri-z ét o',
    options: [
      'No worries at all!',
      'Do not have sad.',
      'No problem is big.',
      'Never mind you late.',
    ],
    tipVi: '"No worries at all!" rất ấm áp, dùng phổ biến ở cả Mỹ, Anh, Úc và Canada.',
  },
  {
    id: 'sm-5',
    category: 'daily',
    promptVi: 'Gọi một ly latte đá cỡ vừa tại quán cà phê',
    contextVi: 'Đứng trước quầy order ở Starbucks',
    correctEn: 'Can I get a medium iced latte, please?',
    phonetic: 'ken ai gét ơ mi-đi-ầm ai-st lá-tê, p-li-z',
    options: [
      'Can I get a medium iced latte, please?',
      'Give me one latte ice middle.',
      'I want buy a cold latte normal.',
      'Take for me iced latte medium.',
    ],
    tipVi: 'Khi gọi đồ ăn/uống ở nước ngoài, "Can I get..." tự nhiên hơn hẳn "I want...".',
  },
  {
    id: 'sm-6',
    category: 'daily',
    promptVi: 'Hỏi lại khi bạn chưa hiểu ý người kia muốn nói gì',
    contextVi: 'Nghe một cụm từ lạ trong câu chuyện',
    correctEn: 'What do you mean by that?',
    phonetic: 'uắt đu du min bai đát',
    options: [
      'What do you mean by that?',
      'What is your thinking word?',
      'Explain your mouth please.',
      'I do not know your mean.',
    ],
    tipVi: 'Hỏi "What do you mean by that?" giúp cuộc hội thoại trôi chảy mà không bị ngượng.',
  },
  {
    id: 'sm-7',
    category: 'business',
    promptVi: 'Hẹn trả lời sau khi kiểm tra lại thông tin công việc',
    contextVi: 'Trong cuộc họp với khách hàng nước ngoài',
    correctEn: 'Let me double-check and get back to you.',
    phonetic: 'lét mi đắp-bồ chéc en gét béc tu du',
    options: [
      'Let me double-check and get back to you.',
      'Wait me check two times and reply.',
      'I will see again and return you.',
      'Let me look again then talk back.',
    ],
    tipVi: '"get back to you" = phản hồi lại cho bạn — cụm cực chuẩn trong tiếng Anh công sở!',
  },
  {
    id: 'sm-8',
    category: 'business',
    promptVi: 'Đề nghị đặt một cuộc gọi nhanh để trao đổi công việc',
    contextVi: 'Nhắn tin hoặc họp với đồng nghiệp quốc tế',
    correctEn: 'Could we schedule a quick call?',
    phonetic: 'cút uy s-ke-đuồ ơ quýc co',
    options: [
      'Could we schedule a quick call?',
      'Can we make a fast phone?',
      'Let us open a short telephone.',
      'Do you want fast calling me?',
    ],
    tipVi: '"schedule a quick call" ngắn gọn, chuyên nghiệp và đúng văn phong công sở quốc tế.',
  },
  {
    id: 'sm-9',
    category: 'business',
    promptVi: 'Giới thiệu mảng công việc mình đang phụ trách',
    contextVi: 'Phỏng vấn hoặc họp giới thiệu thành viên mới',
    correctEn: "I'm responsible for managing our online campaigns.",
    phonetic: 'am ri-s-pón-sơ-bồ pho me-ni-ding ao-ơ on-lai kem-pên-z',
    options: [
      "I'm responsible for managing our online campaigns.",
      'I hold responsibility to manage campaign.',
      'My job is take care online marketing.',
      'I am duty for manage our campaigns.',
    ],
    tipVi: 'Cấu trúc "I\'m responsible for + V-ing" giúp bạn giới thiệu nghề nghiệp cực kỳ chuyên nghiệp.',
  },
  {
    id: 'sm-10',
    category: 'travel',
    promptVi: 'Xin hóa đơn tính tiền lịch sự tại nhà hàng nước ngoài',
    contextVi: 'Ăn xong và muốn thanh toán',
    correctEn: 'Could I have the bill, please?',
    phonetic: 'cút ai hév đơ biu, p-li-z',
    options: [
      'Could I have the bill, please?',
      'Give me money paper please.',
      'How much all food I eat?',
      'Calculate my table money now.',
    ],
    tipVi: 'Ở Mỹ hay nói "Could I get the check, please?", ở Anh/Úc hay nói "Could I have the bill, please?".',
  },
  {
    id: 'sm-11',
    category: 'travel',
    promptVi: 'Trả lời nhân viên hải quan: "Tôi đến đây du lịch trong 5 ngày"',
    contextVi: 'Làm thủ tục nhập cảnh tại sân bay quốc tế',
    correctEn: "I'm here on vacation for five days.",
    phonetic: 'am hia on vơ-kây-shần pho phai đây-z',
    options: [
      "I'm here on vacation for five days.",
      'I come travel here five day.',
      'My go is tourism in 5 days.',
      'I stay here for play five days.',
    ],
    tipVi: 'Nhớ cụm cố định "on vacation" (Mỹ) hoặc "on holiday" (Anh/Úc) + "for + số ngày".',
  },
  {
    id: 'sm-12',
    category: 'travel',
    promptVi: 'Hỏi đường đến ga tàu gần nhất',
    contextVi: 'Đang đi bộ ở trung tâm thành phố nước ngoài',
    correctEn: 'Excuse me, where can I find the nearest train station?',
    phonetic: 'ích-s-kiu-z mi, ue ken ai phai đơ nía-rìst trên s-tây-shần',
    options: [
      'Excuse me, where can I find the nearest train station?',
      'Sorry, train station stay at where?',
      'Tell me the close train house please.',
      'Where is near station of train?',
    ],
    tipVi: 'Luôn mở đầu bằng "Excuse me," khi hỏi đường người lạ để tạo thiện cảm ngay lập tức.',
  },
];

export const SENTENCE_BUILD_QUESTIONS: SentenceBuildQuestion[] = [
  {
    id: 'sb-1',
    category: 'daily',
    meaningVi: 'Bạn có thể nói chậm lại một chút được không?',
    phonetic: 'cút du s-píc ơ bít s-lâu-ơ, p-li-z',
    sentenceEn: 'Could you speak a bit slower please',
    words: ['Could', 'you', 'speak', 'a', 'bit', 'slower', 'please'],
    tipVi: 'Nối âm "speak a" thành "s-pí-cơ" để nghe tự nhiên hơn.',
  },
  {
    id: 'sb-2',
    category: 'daily',
    meaningVi: 'Cho mình gọi một ly latte đá nhé?',
    phonetic: 'ken ai gét ân ai-st lá-tê, p-li-z',
    sentenceEn: 'Can I get an iced latte please',
    words: ['Can', 'I', 'get', 'an', 'iced', 'latte', 'please'],
    tipVi: 'Nối "Can I" → "ke-nai" và "get an" → "gé-tân".',
  },
  {
    id: 'sb-3',
    category: 'daily',
    meaningVi: 'Thành thật mà nói, mình rất thích du lịch.',
    phonetic: 'tu bi ó-nìst, ai ría-li in-doi tre-vồ-ling',
    sentenceEn: 'To be honest I really enjoy traveling',
    words: ['To', 'be', 'honest', 'I', 'really', 'enjoy', 'traveling'],
    tipVi: 'Mở câu bằng "To be honest," giúp bạn có thêm 1 giây suy nghĩ cực tự nhiên!',
  },
  {
    id: 'sb-4',
    category: 'daily',
    meaningVi: 'Mình khá ổn, cảm ơn bạn! Còn bạn thì sao?',
    phonetic: 'am đu-ing pờ-rít-ti ueo, thenks, hao ơ-bao du',
    sentenceEn: "I'm doing pretty well thanks how about you",
    words: ["I'm", 'doing', 'pretty', 'well', 'thanks', 'how', 'about', 'you'],
    tipVi: 'Luôn hỏi ngược lại "How about you?" để duy trì cuộc nói chuyện hai chiều.',
  },
  {
    id: 'sb-5',
    category: 'business',
    meaningVi: 'Để mình kiểm tra lại rồi phản hồi bạn nhé.',
    phonetic: 'lét mi đắp-bồ chéc en gét béc tu du',
    sentenceEn: 'Let me double-check and get back to you',
    words: ['Let', 'me', 'double-check', 'and', 'get', 'back', 'to', 'you'],
    tipVi: 'Cụm "get back to you" cực thông dụng trong email và họp online.',
  },
  {
    id: 'sb-6',
    category: 'business',
    meaningVi: 'Chúng ta hẹn một cuộc gọi nhanh vào ngày mai được không?',
    phonetic: 'cút uy s-ke-đuồ ơ quýc co tu-mó-râu',
    sentenceEn: 'Could we schedule a quick call tomorrow',
    words: ['Could', 'we', 'schedule', 'a', 'quick', 'call', 'tomorrow'],
    tipVi: '"schedule" giọng Mỹ đọc là /ˈskedʒ.uːl/, giọng Anh đọc là /ˈʃed.juːl/.',
  },
  {
    id: 'sb-7',
    category: 'travel',
    meaningVi: 'Tôi đến đây du lịch trong năm ngày.',
    phonetic: 'am hia on vơ-kây-shần pho phai đây-z',
    sentenceEn: "I'm here on vacation for five days",
    words: ["I'm", 'here', 'on', 'vacation', 'for', 'five', 'days'],
    tipVi: 'Chú ý bật âm cuối /z/ ở từ "days" vì là số nhiều (5 ngày).',
  },
  {
    id: 'sb-8',
    category: 'travel',
    meaningVi: 'Làm ơn cho mình xin hóa đơn tính tiền nhé?',
    phonetic: 'cút ai hév đơ biu, p-li-z',
    sentenceEn: 'Could I have the bill please',
    words: ['Could', 'I', 'have', 'the', 'bill', 'please'],
    tipVi: 'Nối âm "Could I" thành "cút-đai" sẽ nghe rất mượt tai.',
  },
  {
    id: 'sb-9',
    category: 'daily',
    meaningVi: 'Hôm nào rảnh mình hẹn gặp nhau trò chuyện nhé!',
    phonetic: 'lét-s kétch ắp sun',
    sentenceEn: "Let's catch up sometime soon",
    words: ["Let's", 'catch', 'up', 'sometime', 'soon'],
    tipVi: '"catch up" = gặp gỡ hỏi han cập nhật tình hình sau thời gian dài.',
  },
  {
    id: 'sb-10',
    category: 'business',
    meaningVi: 'Cảm ơn bạn đã dành thời gian họp hôm nay.',
    phonetic: 'thenks pho méc-king tham tu mít tu-đây',
    sentenceEn: 'Thanks for making time to meet today',
    words: ['Thanks', 'for', 'making', 'time', 'to', 'meet', 'today'],
    tipVi: '"make time to..." nghe ấm áp và tự nhiên hơn "spend time".',
  },
];

export const PRONUNCIATION_CHALLENGES: PronunciationChallengeItem[] = [
  {
    id: 'pc-1',
    category: 'daily',
    sentence: "Hey! How's it going today?",
    vietnamese: 'Chào bạn! Hôm nay mọi chuyện ổn chứ?',
    phonetic: 'hây! hao-zít gâu-ing tu-đây',
    focusTipVi: 'Nối âm "How\'s it" thành "hao-zít" và lên giọng nhẹ ở cuối câu.',
  },
  {
    id: 'pc-2',
    category: 'daily',
    sentence: 'Can I get a medium iced latte, please?',
    vietnamese: 'Cho mình gọi một ly latte đá cỡ vừa nhé?',
    phonetic: 'ken ai gét ơ mi-đi-ầm ai-st lá-tê, p-li-z',
    focusTipVi: 'Chú ý bật nhẹ âm /st/ ở "iced" và kéo nhẹ âm /z/ ở "please".',
  },
  {
    id: 'pc-3',
    category: 'daily',
    sentence: 'Could you speak a bit slower, please?',
    vietnamese: 'Bạn nói chậm lại một chút được không?',
    phonetic: 'cút du s-píc ơ bít s-lâu-ơ, p-li-z',
    focusTipVi: 'Nhớ bật âm cuối /k/ ở "speak" và /t/ ở "bit".',
  },
  {
    id: 'pc-4',
    category: 'business',
    sentence: 'Let me double-check and get back to you.',
    vietnamese: 'Để mình kiểm tra lại rồi phản hồi bạn nhé.',
    phonetic: 'lét mi đắp-bồ chéc en gét béc tu du',
    focusTipVi: 'Nhấn mạnh vào "double-check" và "back" để giữ nhịp câu tự nhiên.',
  },
  {
    id: 'pc-5',
    category: 'business',
    sentence: 'Could we schedule a quick call tomorrow morning?',
    vietnamese: 'Chúng ta hẹn một cuộc gọi nhanh sáng mai được không?',
    phonetic: 'cút uy s-ke-đuồ ơ quýc co tu-mó-râu mo-ning',
    focusTipVi: 'Luyện rõ âm /kw/ ở từ "quick" và trọng âm âm tiết 2 ở "to-MOR-row".',
  },
  {
    id: 'pc-6',
    category: 'travel',
    sentence: "I'm here on vacation for five days.",
    vietnamese: 'Tôi đến đây du lịch trong 5 ngày.',
    phonetic: 'am hia on vơ-kây-shần pho phai đây-z',
    focusTipVi: 'Nhớ bật âm /v/ nhẹ ở "five" và âm đuôi /z/ ở "days".',
  },
  {
    id: 'pc-7',
    category: 'travel',
    sentence: 'Excuse me, where can I find the nearest train station?',
    vietnamese: 'Xin lỗi, tôi có thể tìm ga tàu gần nhất ở đâu nhỉ?',
    phonetic: 'ích-s-kiu-z mi, ue ken ai phai đơ nía-rìst trên s-tây-shần',
    focusTipVi: 'Chú ý âm /θ/ hoặc /ð/ ở "the" và âm cuối /st/ ở "nearest".',
  },
  {
    id: 'pc-8',
    category: 'daily',
    sentence: 'Sounds good to me! No worries at all.',
    vietnamese: 'Nghe hợp lý đấy! Không sao đâu nhé.',
    phonetic: 'sao-z gút tu mi! nâu uơ-ri-z ét o',
    focusTipVi: 'Bật rõ âm /z/ ở "Sounds" và nối âm "at all" → "é-tồ".',
  },
];

export function pickShuffledItems<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
