import { describe, expect, it } from 'vitest';
import { buildDailySmartFocus } from '@/lib/adaptive-coach';
import type { UserProfile } from '@/types';

const baseProfile: UserProfile = {
  id: 'u1',
  email: 'minhanh@example.com',
  displayName: 'Minh Anh',
  nativeLanguage: 'vi',
  englishLevel: 'A2-B1',
  preferredAccent: 'US',
  preferredSpeed: 0.9,
  dailyGoalMinutes: 15,
  streakDays: 5,
  longestStreak: 12,
  lastPracticeDate: '2026-11-24',
  xp: 840,
  gems: 120,
  streakFreezes: 1,
  claimedMilestones: [],
  claimedDailyQuests: {},
  unlockedBadges: [],
  activeBadge: null,
  xpBoostUntil: null,
  totalLessonsCompleted: 9,
  completedStationIds: [],
  onboardingCompleted: true,
  jobField: 'Product Design',
  hobbies: ['Travel'],
  apiKeyMode: 'system',
};

describe('buildDailySmartFocus', () => {
  it('prioritizes recurring pronunciation weak words first', () => {
    const rec = buildDailySmartFocus({
      profile: baseProfile,
      studiedToday: false,
      duePhraseCount: 4,
      pronInsights: {
        totalAssessedTurns: 6,
        avgOverall: 76,
        avgAccuracy: 74,
        avgFluency: 78,
        avgIntonation: 77,
        trendDelta: 4,
        weakWords: [
          {
            word: 'schedule',
            count: 2,
            ipa: 'ˈskedʒuːl',
            tipVi: 'Nhấn rõ âm đầu /ske/',
            sampleSentence: 'Let us check our schedule for Friday.',
          },
        ],
      },
    });

    expect(rec.kind).toBe('weak-word');
    expect(rec.titleVi).toContain('schedule');
    expect(rec.weakWordTarget?.sampleSentence).toBe(
      'Let us check our schedule for Friday.'
    );
  });

  it('recommends SM-2 due phrases when no weak word exists', () => {
    const rec = buildDailySmartFocus({
      profile: baseProfile,
      studiedToday: false,
      duePhraseCount: 6,
      pronInsights: null,
    });

    expect(rec.kind).toBe('srs-due');
    expect(rec.href).toBe('/phrases');
    expect(rec.titleVi).toContain('6 mẫu câu');
  });

  it('recommends a 2-minute streak warm-up tailored to jobField when not studied today', () => {
    const rec = buildDailySmartFocus({
      profile: baseProfile,
      studiedToday: false,
      duePhraseCount: 0,
      pronInsights: null,
    });

    expect(rec.kind).toBe('keep-streak');
    expect(rec.titleVi).toContain('Product Design');
    expect(rec.href).toBe('/play?mode=speed&category=business');
  });

  it('recommends leveling up with a live scenario once daily study & SRS are complete', () => {
    const rec = buildDailySmartFocus({
      profile: baseProfile,
      studiedToday: true,
      duePhraseCount: 0,
      pronInsights: null,
    });

    expect(rec.kind).toBe('roleplay-up');
    expect(rec.href).toBe('/call?scenario=business-standup');
  });
});
