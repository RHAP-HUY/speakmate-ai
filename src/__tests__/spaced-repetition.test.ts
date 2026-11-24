import { describe, expect, it } from 'vitest';
import { mergeAccountBundles } from '@/lib/bundle-merge';
import {
  exportPhrasesToTsv,
  formatRelativeDueVi,
  getPhraseReviewSummary,
  isPhraseDue,
  previewGradeIntervalsVi,
  scheduleNextPhraseReview,
  sortPhrasesForReview,
} from '@/lib/spaced-repetition';
import type { AccountCloudBundle, SavedPhrase } from '@/types';

function makePhrase(overrides: Partial<SavedPhrase> = {}): SavedPhrase {
  return {
    id: 'ph-1',
    englishPhrase: "Let's catch up soon!",
    vietnameseMeaning: 'Hôm nào tụi mình gặp nói chuyện nhé!',
    phonetic: 'lets kætʃ ʌp suːn',
    exampleSentence: "It's been ages — let's catch up soon!",
    category: 'daily',
    accent: 'US',
    masteryLevel: 0,
    createdAt: '2026-11-20T08:00:00.000Z',
    ...overrides,
  };
}

describe('spaced-repetition (SM-2 scheduling & TSV export)', () => {
  const fixedNow = Date.parse('2026-11-24T08:00:00.000Z');

  it('treats newly saved unreviewed phrases as due immediately', () => {
    const p = makePhrase({ masteryLevel: 0 });
    expect(isPhraseDue(p, fixedNow)).toBe(true);
    expect(formatRelativeDueVi(p, fixedNow)).toBe('Đến hạn ôn');
  });

  it('schedules 10-minute short retry when graded again and clamps ease factor', () => {
    const p = makePhrase({ easeFactor: 1.35, masteryLevel: 2, intervalDays: 7 });
    const next = scheduleNextPhraseReview(p, 'again', fixedNow);
    expect(next.intervalDays).toBe(0);
    expect(next.masteryLevel).toBe(0);
    expect(next.easeFactor).toBe(1.3);
    expect(Date.parse(next.nextReviewAt!)).toBe(fixedNow + 10 * 60_000);
    expect(isPhraseDue(next, fixedNow + 5 * 60_000)).toBe(false);
    expect(isPhraseDue(next, fixedNow + 11 * 60_000)).toBe(true);
  });

  it('expands intervals progressively across consecutive good reviews (1d -> 3d -> 7d -> 18d)', () => {
    let card = makePhrase();
    card = scheduleNextPhraseReview(card, 'good', fixedNow);
    expect(card.intervalDays).toBe(1);
    expect(card.masteryLevel).toBe(1);

    card = scheduleNextPhraseReview(card, 'good', fixedNow + 86_400_000);
    expect(card.intervalDays).toBe(3);
    expect(card.masteryLevel).toBe(2);

    card = scheduleNextPhraseReview(card, 'good', fixedNow + 4 * 86_400_000);
    expect(card.intervalDays).toBe(7);
    expect(card.masteryLevel).toBe(3);

    card = scheduleNextPhraseReview(card, 'good', fixedNow + 11 * 86_400_000);
    expect(card.intervalDays).toBe(18);
    expect(card.reviewCount).toBe(4);
  });

  it('previews human-readable intervals for all 4 recall buttons', () => {
    const preview = previewGradeIntervalsVi(makePhrase({ intervalDays: 1 }));
    expect(preview).toEqual({
      again: '10 phút',
      hard: '1 ngày',
      good: '3 ngày',
      easy: '10 ngày',
    });
  });

  it('sorts due phrases ahead of future-scheduled phrases and summarizes counts', () => {
    const futureIso = new Date(fixedNow + 5 * 86_400_000).toISOString();
    const list: SavedPhrase[] = [
      makePhrase({
        id: 'future-mastered',
        englishPhrase: 'Sounds good to me',
        masteryLevel: 3,
        nextReviewAt: futureIso,
      }),
      makePhrase({
        id: 'due-new',
        englishPhrase: 'Could I grab the check?',
        masteryLevel: 0,
      }),
    ];

    const summary = getPhraseReviewSummary(list, fixedNow);
    expect(summary).toEqual({
      total: 2,
      dueCount: 1,
      learningCount: 0,
      masteredCount: 1,
    });

    const sorted = sortPhrasesForReview(list, fixedNow);
    expect(sorted[0].id).toBe('due-new');
    expect(sorted[1].id).toBe('future-mastered');
  });

  it('exports sanitized TSV rows compatible with Anki and spreadsheets', () => {
    const tsv = exportPhrasesToTsv([
      makePhrase({
        englishPhrase: 'Touch base\twith team',
        vietnameseMeaning: 'Trao đổi nhanh\nvới nhóm',
      }),
    ]);
    const lines = tsv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('English Phrase\tVietnamese Meaning');
    expect(lines[1]).toContain('Touch base with team\tTrao đổi nhanh với nhóm');
  });

  it('preserves newer SRS schedule metadata during Google Drive bundle merge', () => {
    const baseBundle: AccountCloudBundle = {
      version: 3,
      accountId: 'u1',
      email: 'u1@example.com',
      provider: 'google',
      updatedAt: '2026-11-24T08:00:00.000Z',
      profile: {
        id: 'u1',
        email: 'u1@example.com',
        displayName: 'Huy',
        nativeLanguage: 'vi',
        englishLevel: 'A2-B1',
        jobField: '',
        hobbies: [],
        preferredAccent: 'US',
        preferredSpeed: 0.9,
        dailyGoalMinutes: 15,
        streakDays: 3,
        longestStreak: 3,
        lastPracticeDate: '2026-11-24',
        onboardingCompleted: true,
        apiKeyMode: 'system',
        xp: 200,
        gems: 50,
        streakFreezes: 1,
        claimedMilestones: [],
        unlockedBadges: [],
        activeBadge: null,
        totalLessonsCompleted: 3,
      },
      dailyStats: [],
      phrases: [
        makePhrase({
          reviewCount: 3,
          intervalDays: 7,
          masteryLevel: 3,
          lastReviewedAt: '2026-11-24T08:00:00.000Z',
          nextReviewAt: '2026-12-01T08:00:00.000Z',
        }),
      ],
      conversations: [],
      messagesByConversation: {},
    };

    const staleRemote: AccountCloudBundle = {
      ...baseBundle,
      updatedAt: '2026-11-23T08:00:00.000Z',
      phrases: [makePhrase({ reviewCount: 0, masteryLevel: 0 })],
    };

    const { merged } = mergeAccountBundles(baseBundle, staleRemote);
    expect(merged.phrases[0].reviewCount).toBe(3);
    expect(merged.phrases[0].intervalDays).toBe(7);
    expect(merged.phrases[0].nextReviewAt).toBe('2026-12-01T08:00:00.000Z');
  });
});
