import type { PronunciationInsightsSummary } from '@/lib/pronunciation-insights';
import type { UserProfile } from '@/types';

export type SmartFocusKind = 'weak-word' | 'srs-due' | 'keep-streak' | 'roleplay-up';

export interface SmartFocusRecommendation {
  kind: SmartFocusKind;
  badgeVi: string;
  titleVi: string;
  reasonVi: string;
  ctaLabelVi: string;
  href?: string;
  weakWordTarget?: {
    word: string;
    ipa: string | null;
    tipVi: string | null;
    sampleSentence: string;
  };
}

/**
 * Computes the single highest-leverage 2-minute action for the learner right now,
 * combining pronunciation error history, SM-2 spaced repetition due queue, and streak state.
 */
export function buildDailySmartFocus(params: {
  profile: UserProfile;
  studiedToday: boolean;
  duePhraseCount: number;
  pronInsights?: PronunciationInsightsSummary | null;
}): SmartFocusRecommendation {
  const { profile, studiedToday, duePhraseCount, pronInsights } = params;

  const topWeak = pronInsights?.weakWords?.[0];
  if (topWeak && topWeak.count >= 1) {
    return {
      kind: 'weak-word',
      badgeVi: 'Ưu tiên phát âm cá nhân',
      titleVi: `Chỉnh chuẩn từ "${topWeak.word}"${topWeak.ipa ? ` (/${topWeak.ipa.replace(/^\/|\/$/g, '')}/)` : ''}`,
      reasonVi: topWeak.tipVi
        ? `Hệ thống ghi nhận bạn cần lưu ý ở từ này: ${topWeak.tipVi}. Luyện đọc lại 30 giây để sửa dứt điểm.`
        : `Từ "${topWeak.word}" xuất hiện trong nhóm cần cải thiện âm vị gần đây của bạn.`,
      ctaLabelVi: 'Luyện đọc 30 giây',
      weakWordTarget: topWeak,
    };
  }

  if (duePhraseCount > 0) {
    return {
      kind: 'srs-due',
      badgeVi: 'Đúng điểm rơi trí nhớ SM-2',
      titleVi: `Ôn nhanh ${duePhraseCount} mẫu câu đến hạn hôm nay`,
      reasonVi:
        'Ôn lại đúng thời điểm chuẩn bị quên giúp ghi nhớ cụm câu bản xứ lâu gấp 4 lần và tính giữ chuỗi ngày học.',
      ctaLabelVi: 'Lật thẻ SRS ngay',
      href: '/phrases',
    };
  }

  if (!studiedToday) {
    const isBusiness = Boolean(profile.jobField?.trim());
    return {
      kind: 'keep-streak',
      badgeVi: 'Khởi động 2 phút giữ chuỗi',
      titleVi: isBusiness
        ? `Bài phản xạ nhanh cho lĩnh vực ${profile.jobField}`
        : 'Hoàn thành 5 câu phản xạ 15 giây để giữ lửa hôm nay',
      reasonVi:
        profile.streakDays > 0
          ? `Bạn đang có chuỗi ${profile.streakDays} ngày liên tiếp. Chỉ mất 2 phút để bảo toàn nhịp học hôm nay.`
          : 'Bắt đầu ngày đầu tiên của chuỗi học tập chỉ với một bài phản xạ ngắn 2 phút.',
      ctaLabelVi: 'Khởi động 2 phút',
      href: isBusiness
        ? '/play?mode=speed&category=business'
        : '/play?mode=speed&category=daily',
    };
  }

  const nextScenario =
    profile.englishLevel === 'B2+'
      ? '/call?scenario=business-presentation'
      : profile.englishLevel === 'A2-B1'
        ? '/call?scenario=business-standup'
        : '/call?scenario=daily-coffee-shop';

  return {
    kind: 'roleplay-up',
    badgeVi: 'Bứt phá phản xạ nghe nói',
    titleVi: 'Thử thách 3 lượt hội thoại thực tế không nhìn gợi ý',
    reasonVi:
      'Bạn đã hoàn thành mục tiêu nền tảng hôm nay. Mở một cuộc gọi ngắn để rèn phản xạ nối âm tự nhiên.',
    ctaLabelVi: 'Vào hội thoại ngay',
    href: nextScenario,
  };
}
