import { describe, expect, it } from 'vitest';
import { mergeAccountBundles } from '@/lib/bundle-merge';
import type { AccountCloudBundle, UserProfile } from '@/types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'google_1',
    email: 'user@example.com',
    displayName: 'Huy',
    avatarUrl: null,
    nativeLanguage: 'vi',
    englishLevel: 'A2-B1',
    jobField: 'Developer',
    hobbies: ['Công nghệ & AI'],
    preferredAccent: 'US',
    preferredSpeed: 0.9,
    dailyGoalMinutes: 15,
    streakDays: 3,
    longestStreak: 5,
    lastPracticeDate: '2026-11-24',
    onboardingCompleted: true,
    apiKeyMode: 'system',
    personalKeyHint: null,
    xp: 200,
    gems: 50,
    streakFreezes: 1,
    claimedMilestones: [1],
    unlockedBadges: ['spark_1'],
    activeBadge: 'spark_1',
    totalLessonsCompleted: 4,
    xpBoostUntil: null,
    claimedDailyQuests: { '2026-11-24': ['lesson_1'] },
    ...overrides,
  };
}

function makeBundle(overrides: Partial<AccountCloudBundle> = {}): AccountCloudBundle {
  return {
    version: 3,
    accountId: 'google_1',
    email: 'user@example.com',
    provider: 'google',
    updatedAt: '2026-11-24T01:00:00.000Z',
    profile: makeProfile(),
    dailyStats: [
      {
        practiceDate: '2026-11-24',
        secondsPracticed: 180,
        messagesSent: 5,
        sessionsCompleted: 1,
        lessonsCompleted: 1,
        xpEarned: 85,
        freezeUsed: false,
      },
    ],
    phrases: [
      {
        id: 'p1',
        englishPhrase: 'Can I get an iced latte?',
        vietnameseMeaning: 'Cho tôi 1 ly latte đá',
        phonetic: 'ken ai get...',
        exampleSentence: null,
        category: 'daily',
        accent: 'US',
        masteryLevel: 1,
        createdAt: '2026-11-23T10:00:00.000Z',
      },
    ],
    conversations: [],
    messagesByConversation: {},
    ...overrides,
  };
}

describe('mergeAccountBundles (Zero-data-loss offline/cloud sync)', () => {
  it('preserves offline lessons, XP, milestones, and daily stats when remote Drive is stale', () => {
    const remote = makeBundle({
      updatedAt: '2026-11-24T01:00:00.000Z',
      profile: makeProfile({
        xp: 200,
        gems: 50,
        totalLessonsCompleted: 4,
        claimedMilestones: [1],
        unlockedBadges: ['spark_1'],
      }),
    });

    const local = makeBundle({
      updatedAt: '2026-11-24T02:00:00.000Z',
      profile: makeProfile({
        xp: 370,
        gems: 75,
        totalLessonsCompleted: 5,
        claimedMilestones: [1, 3],
        unlockedBadges: ['spark_1', 'flame_3'],
        claimedDailyQuests: { '2026-11-24': ['lesson_1', 'xp_60'] },
      }),
      dailyStats: [
        {
          practiceDate: '2026-11-24',
          secondsPracticed: 360,
          messagesSent: 10,
          sessionsCompleted: 2,
          lessonsCompleted: 2,
          xpEarned: 255,
          freezeUsed: false,
        },
        {
          practiceDate: '2026-11-23',
          secondsPracticed: 0,
          messagesSent: 0,
          sessionsCompleted: 0,
          lessonsCompleted: 0,
          xpEarned: 0,
          freezeUsed: true,
        },
      ],
    });

    const { merged, localHadNewerProgress } = mergeAccountBundles(local, remote);
    expect(localHadNewerProgress).toBe(true);
    expect(merged.profile.xp).toBe(370);
    expect(merged.profile.gems).toBe(75);
    expect(merged.profile.totalLessonsCompleted).toBe(5);
    expect(merged.profile.claimedMilestones).toEqual([1, 3]);
    expect(merged.profile.unlockedBadges).toEqual(['spark_1', 'flame_3']);
    expect(merged.profile.claimedDailyQuests?.['2026-11-24']).toEqual([
      'lesson_1',
      'xp_60',
    ]);
    expect(merged.dailyStats).toHaveLength(2);
    expect(merged.dailyStats[0].lessonsCompleted).toBe(2);
    expect(merged.dailyStats[1].freezeUsed).toBe(true);
  });

  it('deduplicates saved phrases while keeping the highest mastery level', () => {
    const remote = makeBundle({
      phrases: [
        {
          id: 'p1',
          englishPhrase: 'Sounds good to me!',
          vietnameseMeaning: 'Nghe hợp lý đấy!',
          phonetic: null,
          exampleSentence: null,
          category: 'daily',
          accent: 'US',
          masteryLevel: 3,
          createdAt: '2026-11-23T10:00:00.000Z',
        },
      ],
    });
    const local = makeBundle({
      phrases: [
        {
          id: 'p1-local',
          englishPhrase: 'sounds good to me!',
          vietnameseMeaning: 'Nghe hợp lý đấy!',
          phonetic: 'saunz gʊd tu mi',
          exampleSentence: 'Let us meet at 7. — Sounds good to me!',
          category: 'daily',
          accent: 'US',
          masteryLevel: 1,
          createdAt: '2026-11-24T01:00:00.000Z',
        },
        {
          id: 'p2',
          englishPhrase: 'Circle back later',
          vietnameseMeaning: 'Trao đổi lại sau',
          phonetic: null,
          exampleSentence: null,
          category: 'business',
          accent: 'US',
          masteryLevel: 0,
          createdAt: '2026-11-24T01:30:00.000Z',
        },
      ],
    });

    const { merged, localHadNewerProgress } = mergeAccountBundles(local, remote);
    expect(localHadNewerProgress).toBe(true);
    expect(merged.phrases).toHaveLength(2);
    const soundsGood = merged.phrases.find(
      (p) => p.englishPhrase.toLowerCase() === 'sounds good to me!'
    );
    expect(soundsGood?.masteryLevel).toBe(3);
    expect(soundsGood?.phonetic).toBe('saunz gʊd tu mi');
  });

  it('flags localHadNewerProgress as false when remote is strictly ahead', () => {
    const remote = makeBundle({
      updatedAt: '2026-11-24T05:00:00.000Z',
      profile: makeProfile({ xp: 600, totalLessonsCompleted: 10 }),
    });
    const local = makeBundle({
      updatedAt: '2026-11-24T01:00:00.000Z',
      profile: makeProfile({ xp: 200, totalLessonsCompleted: 4 }),
    });

    const { merged, localHadNewerProgress } = mergeAccountBundles(local, remote);
    expect(localHadNewerProgress).toBe(false);
    expect(merged.profile.xp).toBe(600);
    expect(merged.profile.totalLessonsCompleted).toBe(10);
  });
});
