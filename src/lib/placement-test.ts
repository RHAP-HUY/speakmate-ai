import type { EnglishLevel } from '@/types';

export type CefrBand = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type PlacementSkillDimension = 'phrasing' | 'listening' | 'register';

export interface PlacementQuestion {
  id: string;
  cefrTarget: CefrBand;
  dimension: PlacementSkillDimension;
  weight: number;
  kind: 'choice' | 'listening';
  contextVi: string;
  promptVi: string;
  spokenAudioEn?: string;
  voiceId?: 'emma-us' | 'sonia-uk' | 'andrew-us';
  options: {
    id: string;
    label: string;
  }[];
  correctOptionId: string;
  explanationVi: string;
}

export interface PlacementEvaluation {
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  cefrBand: CefrBand;
  recommendedLevel: EnglishLevel;
  recommendedSpeed: number;
  recommendedUnitIndex: number;
  recommendedUnitTitleVi: string;
  titleVi: string;
  summaryVi: string;
  nextAdviceVi: string;
  skillBreakdown: {
    phrasingPct: number;
    listeningPct: number;
    registerPct: number;
  };
}

export const PLACEMENT_RESULT_STORAGE_KEY = 'speakmate_last_placement_v1';

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    id: 'p1-a1-order',
    cefrTarget: 'A1',
    dimension: 'phrasing',
    weight: 10,
    kind: 'choice',
    contextVi: 'Tại quầy cà phê buổi sáng',
    promptVi:
      'Bạn muốn gọi một ly latte đá mang đi một cách lịch sự, tự nhiên. Câu nào chuẩn nhất?',
    options: [
      { id: 'a', label: 'Could I get an iced latte to go, please?' },
      { id: 'b', label: 'Give me one ice latte take away now.' },
      { id: 'c', label: 'I want drink iced latte go home.' },
      { id: 'd', label: 'Make for me iced latte please.' },
    ],
    correctOptionId: 'a',
    explanationVi:
      '“Could I get ... to go, please?” là mẫu câu gọi đồ uống lịch sự, tự nhiên nhất trong giao tiếp hàng ngày.',
  },
  {
    id: 'p2-a2-listen',
    cefrTarget: 'A2',
    dimension: 'listening',
    weight: 11,
    kind: 'listening',
    contextVi: 'Nghe câu nói của đồng nghiệp trước giờ ăn trưa',
    promptVi: 'Bấm nghe câu tiếng Anh và chọn đúng ý người nói đang rủ bạn:',
    spokenAudioEn:
      "Hey, a few of us are grabbing lunch downstairs around noon. Want to tag along?",
    voiceId: 'emma-us',
    options: [
      { id: 'a', label: 'Hỏi bạn đã gửi báo cáo buổi trưa chưa' },
      { id: 'b', label: 'Rủ bạn đi ăn trưa cùng nhóm ở tầng dưới lúc 12 giờ' },
      { id: 'c', label: 'Nhờ bạn đặt bàn ăn tối cho cả phòng' },
      { id: 'd', label: 'Báo rằng quán ăn tầng dưới hôm nay đóng cửa' },
    ],
    correctOptionId: 'b',
    explanationVi:
      '“grabbing lunch downstairs around noon” = đi ăn trưa nhanh ở tầng dưới khoảng 12h; “tag along” = đi cùng.',
  },
  {
    id: 'p3-a2-schedule',
    cefrTarget: 'A2',
    dimension: 'phrasing',
    weight: 11,
    kind: 'choice',
    contextVi: 'Nhắn tin hẹn giờ gặp bạn bè',
    promptVi:
      'Bạn đến trễ khoảng 10 phút vì kẹt xe. Người bản xứ thường nói gọn thế nào?',
    options: [
      { id: 'a', label: 'I go late ten minutes because street many cars.' },
      { id: 'b', label: "I'm running about ten minutes late — stuck in traffic." },
      { id: 'c', label: 'My time is late ten minutes by traffic jam.' },
      { id: 'd', label: 'Wait me ten minutes I am on crowded road.' },
    ],
    correctOptionId: 'b',
    explanationVi:
      'Cụm “running [time] late” và “stuck in traffic” là hai cụm cố định cực kỳ phổ biến ngoài đời thực.',
  },
  {
    id: 'p4-b1-meeting',
    cefrTarget: 'B1',
    dimension: 'register',
    weight: 13,
    kind: 'choice',
    contextVi: 'Trong cuộc họp trực tuyến với đối tác nước ngoài',
    promptVi:
      'Đường truyền bị giật khiến bạn không nghe rõ ý vừa rồi. Cách hỏi lại nào chuyên nghiệp nhất?',
    options: [
      { id: 'a', label: 'Repeat again please, your internet is bad.' },
      { id: 'b', label: 'What did you say? I cannot hear anything.' },
      {
        id: 'c',
        label: 'Sorry, you cut out for a second there — could you repeat that last part?',
      },
      { id: 'd', label: 'Speak louder please, sound is broken.' },
    ],
    correctOptionId: 'c',
    explanationVi:
      '“You cut out for a second” diễn đạt đúng hiện tượng mất tiếng khi họp online mà không đổ lỗi nặng nề cho người nói.',
  },
  {
    id: 'p5-b1-listen',
    cefrTarget: 'B1',
    dimension: 'listening',
    weight: 13,
    kind: 'listening',
    contextVi: 'Nghe thông báo tại quầy lễ tân khách sạn (giọng Anh – British)',
    promptVi: 'Nhân viên lễ tân đang đề xuất giải pháp gì cho phòng của bạn?',
    spokenAudioEn:
      "Your room isn't quite ready yet, I'm afraid, but we'd be happy to store your luggage while you grab a coffee.",
    voiceId: 'sonia-uk',
    options: [
      { id: 'a', label: 'Đổi sang khách sạn khác vì đã hết phòng trống' },
      { id: 'b', label: 'Tính thêm phí nhận phòng sớm ngay lập tức' },
      {
        id: 'c',
        label: 'Phòng chưa dọn xong nhưng khách sạn nhận giữ hộ hành lý trong lúc bạn uống cà phê',
      },
      { id: 'd', label: 'Yêu cầu bạn tự mang hành lý lên tầng 4' },
    ],
    correctOptionId: 'c',
    explanationVi:
      '“isn’t quite ready yet” = chưa sẵn sàng hẳn; “store your luggage” = giữ hộ hành lý.',
  },
  {
    id: 'p6-b1-collocation',
    cefrTarget: 'B1',
    dimension: 'phrasing',
    weight: 13,
    kind: 'choice',
    contextVi: 'Trao đổi tiến độ công việc',
    promptVi:
      'Bạn muốn nói: “Để tôi kiểm tra lại với nhóm kỹ thuật rồi báo lại cho bạn chiều nay.”',
    options: [
      {
        id: 'a',
        label: 'Let me double-check with the engineering team and get back to you this afternoon.',
      },
      {
        id: 'b',
        label: 'Let me ask again technical group and answer you afternoon today.',
      },
      {
        id: 'c',
        label: 'I will see engineering people and return words to you this afternoon.',
      },
      {
        id: 'd',
        label: 'Wait me check technical team then talk back afternoon.',
      },
    ],
    correctOptionId: 'a',
    explanationVi:
      '“double-check with...” kết hợp “get back to you” là cặp cụm động từ chuẩn xác trong giao tiếp công sở quốc tế.',
  },
  {
    id: 'p7-b2-diplomatic',
    cefrTarget: 'B2',
    dimension: 'register',
    weight: 14,
    kind: 'choice',
    contextVi: 'Thảo luận chiến lược sản phẩm',
    promptVi:
      'Bạn hiểu ý của đồng nghiệp nhưng muốn nêu rủi ro về thời gian một cách khéo léo, tôn trọng:',
    options: [
      {
        id: 'a',
        label: 'Your idea is wrong because we have no time for it.',
      },
      {
        id: 'b',
        label:
          "I see where you're coming from, though I'm slightly concerned about how that might affect our timeline.",
      },
      {
        id: 'c',
        label: 'I disagree with you completely about the schedule.',
      },
      {
        id: 'd',
        label: 'No, we cannot do that plan in this month.',
      },
    ],
    correctOptionId: 'b',
    explanationVi:
      '“I see where you’re coming from, though I’m slightly concerned about...” giúp phản biện thuyết phục mà vẫn giữ thiện chí.',
  },
  {
    id: 'p8-c1-listen',
    cefrTarget: 'C1',
    dimension: 'listening',
    weight: 15,
    kind: 'listening',
    contextVi: 'Nghe chia sẻ nhanh trong cuộc họp điều hành (giọng Mỹ tự nhiên)',
    promptVi: 'Người quản lý quyết định xử lý tính năng mới theo hướng nào?',
    spokenAudioEn:
      "Rather than rushing a half-baked feature out the door on Friday, let's push the release to next Tuesday and get the edge cases ironed out.",
    voiceId: 'andrew-us',
    options: [
      {
        id: 'a',
        label: 'Ra mắt ngay vào thứ Sáu và sửa lỗi vào tuần sau',
      },
      {
        id: 'b',
        label: 'Hủy bỏ hoàn toàn tính năng vì vượt ngân sách',
      },
      {
        id: 'c',
        label:
          'Dời lịch phát hành sang thứ Ba tuần tới để xử lý triệt để các trường hợp ngoại lệ',
      },
      {
        id: 'd',
        label: 'Chuyển giao tính năng cho một nhóm khác phụ trách',
      },
    ],
    correctOptionId: 'c',
    explanationVi:
      '“half-baked” = làm chưa chín; “push the release to next Tuesday” = dời ngày phát hành sang thứ Ba tới; “iron out edge cases” = xử lý mượt các ca biên.',
  },
];

function computeDimensionScore(
  dimension: PlacementSkillDimension,
  answers: Record<string, string>
): number {
  const items = PLACEMENT_QUESTIONS.filter((q) => q.dimension === dimension);
  const totalWeight = items.reduce((acc, q) => acc + q.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = items.reduce(
    (acc, q) => acc + (answers[q.id] === q.correctOptionId ? q.weight : 0),
    0
  );
  return Math.round((earned / totalWeight) * 100);
}

export function evaluatePlacementTest(
  answers: Record<string, string>
): PlacementEvaluation {
  const totalWeight = PLACEMENT_QUESTIONS.reduce((acc, q) => acc + q.weight, 0);
  let earnedWeight = 0;
  let correctCount = 0;

  for (const q of PLACEMENT_QUESTIONS) {
    if (answers[q.id] === q.correctOptionId) {
      earnedWeight += q.weight;
      correctCount += 1;
    }
  }

  const scorePct =
    totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  const skillBreakdown = {
    phrasingPct: computeDimensionScore('phrasing', answers),
    listeningPct: computeDimensionScore('listening', answers),
    registerPct: computeDimensionScore('register', answers),
  };

  if (scorePct >= 88) {
    return {
      scorePct,
      correctCount,
      totalQuestions: PLACEMENT_QUESTIONS.length,
      cefrBand: 'C1',
      recommendedLevel: 'B2+',
      recommendedSpeed: 1.0,
      recommendedUnitIndex: 3,
      recommendedUnitTitleVi: 'Chương IV · Mở rộng & Phản biện tự nhiên',
      titleVi: 'Trình độ C1 — Phản xạ tự nhiên & sắc thái tinh tế',
      summaryVi:
        'Bạn nắm vững các cụm động từ bản xứ, nghe hiểu tốc độ nói thực tế và biết cách điều chỉnh sắc thái lịch thiệp trong công việc quốc tế.',
      nextAdviceVi:
        'Nên luyện ở tốc độ 1.0x–1.1x với các tình huống tranh luận mở hoặc đàm phán chuyên sâu để mài sắc ngữ điệu.',
      skillBreakdown,
    };
  }

  if (scorePct >= 70) {
    return {
      scorePct,
      correctCount,
      totalQuestions: PLACEMENT_QUESTIONS.length,
      cefrBand: 'B2',
      recommendedLevel: 'B2+',
      recommendedSpeed: 1.0,
      recommendedUnitIndex: 1,
      recommendedUnitTitleVi: 'Chương II · Giao tiếp Công sở & Họp quốc tế',
      titleVi: 'Trình độ B2 — Giao tiếp độc lập, tự tin trong công việc',
      summaryVi:
        'Bạn hiểu tốt ý chính trong môi trường công sở và du lịch, đồng thời phân biệt được cách diễn đạt tự nhiên với lối dịch từng từ.',
      nextAdviceVi:
        'Tập trung thực hành hội thoại trực tiếp ở tốc độ chuẩn 1.0x để tăng độ trôi chảy và vốn thành ngữ thông dụng.',
      skillBreakdown,
    };
  }

  if (scorePct >= 48) {
    return {
      scorePct,
      correctCount,
      totalQuestions: PLACEMENT_QUESTIONS.length,
      cefrBand: 'B1',
      recommendedLevel: 'A2-B1',
      recommendedSpeed: 0.95,
      recommendedUnitIndex: 1,
      recommendedUnitTitleVi: 'Chương II · Tình huống Công sở & Đời sống mở rộng',
      titleVi: 'Trình độ B1 — Nền tảng giao tiếp trung cấp vững vàng',
      summaryVi:
        'Bạn xử lý tốt các tình huống quen thuộc hàng ngày nhưng đôi khi còn ngập ngừng trước tốc độ nối âm nhanh hoặc cụm từ gián tiếp nơi công sở.',
      nextAdviceVi:
        'Bắt đầu với tốc độ 0.95x, kết hợp luyện Nghe hiểu ngữ cảnh và Hội thoại có gợi ý nâng cấp câu bản xứ.',
      skillBreakdown,
    };
  }

  if (scorePct >= 25) {
    return {
      scorePct,
      correctCount,
      totalQuestions: PLACEMENT_QUESTIONS.length,
      cefrBand: 'A2',
      recommendedLevel: 'A2-B1',
      recommendedSpeed: 0.85,
      recommendedUnitIndex: 0,
      recommendedUnitTitleVi: 'Chương I · Quán cà phê, làm quen & trò chuyện thường nhật',
      titleVi: 'Trình độ A2 — Giao tiếp sơ cấp, sẵn sàng bứt phá phản xạ',
      summaryVi:
        'Bạn đã nhận diện được các mẫu câu đời thường cốt lõi. Bước tiếp theo là giảm thói quen dịch từng chữ tiếng Việt khi mở lời.',
      nextAdviceVi:
        'Luyện đều đặn mỗi ngày 10–15 phút ở tốc độ 0.85x từ Chương I và lưu các cụm câu mẫu vào sổ ôn tập SRS.',
      skillBreakdown,
    };
  }

  return {
    scorePct,
    correctCount,
    totalQuestions: PLACEMENT_QUESTIONS.length,
    cefrBand: 'A1',
    recommendedLevel: 'A0-A1',
    recommendedSpeed: 0.8,
    recommendedUnitIndex: 0,
    recommendedUnitTitleVi: 'Chương I · Nền tảng giao tiếp hàng ngày',
    titleVi: 'Trình độ A1 — Khởi đầu bài bản từ những câu thực tế nhất',
    summaryVi:
      'Giáo trình sẽ bật sẵn phụ đề song ngữ, gợi ý câu trả lời kèm phiên âm IPA và điều chỉnh tốc độ giọng đọc chậm rãi để bạn tự tin mở lời.',
    nextAdviceVi:
      'Bắt đầu từ Bài 1 của Chương I ở tốc độ 0.80x–0.85x; chỉ cần 2 phút mỗi bài để hình thành phản xạ.',
    skillBreakdown,
  };
}
