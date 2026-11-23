import { describe, expect, it } from 'vitest';
import {
  LISTENING_CHALLENGES,
  pickShuffledItems,
  PRONUNCIATION_CHALLENGES,
  SENTENCE_BUILD_QUESTIONS,
  SPEED_MATCH_QUESTIONS,
} from '@/lib/game-data';
import {
  buildMonthCalendarGrid,
  computeStrictStreak,
  DAILY_QUEST_DEFS,
  getClaimableMilestones,
  getLeagueInfo,
  getLevelInfo,
  getXpBoostRemainingMinutes,
  isStreakQualifyingStat,
  isXpBoostActive,
  MIN_CALL_TURNS_FOR_LESSON,
  STREAK_MILESTONES,
} from '@/lib/gamification';
import type { DailyStat } from '@/types';

describe('gamification, leagues, 2x XP boost & strict streak rules', () => {
  it('requires at least 1 completed lesson (or freeze) to qualify a day for streak', () => {
    expect(MIN_CALL_TURNS_FOR_LESSON).toBe(3);

    const incompleteDay: DailyStat = {
      practiceDate: '2026-11-23',
      secondsPracticed: 40,
      messagesSent: 1,
      sessionsCompleted: 1,
      lessonsCompleted: 0,
      xpEarned: 5,
      freezeUsed: false,
    };
    const completedDay: DailyStat = {
      ...incompleteDay,
      lessonsCompleted: 1,
    };
    const frozenDay: DailyStat = {
      ...incompleteDay,
      freezeUsed: true,
    };

    expect(isStreakQualifyingStat(incompleteDay)).toBe(false);
    expect(isStreakQualifyingStat(completedDay)).toBe(true);
    expect(isStreakQualifyingStat(frozenDay)).toBe(true);
  });

  it('computes strict current streak, longest streak, and yesterday freeze eligibility', () => {
    const stats: DailyStat[] = [
      {
        practiceDate: '2026-11-23',
        secondsPracticed: 30,
        messagesSent: 1,
        sessionsCompleted: 1,
        lessonsCompleted: 0,
        xpEarned: 5,
      },
      {
        practiceDate: '2026-11-22',
        secondsPracticed: 180,
        messagesSent: 5,
        sessionsCompleted: 1,
        lessonsCompleted: 1,
        xpEarned: 70,
      },
      {
        practiceDate: '2026-11-21',
        secondsPracticed: 0,
        messagesSent: 0,
        sessionsCompleted: 0,
        lessonsCompleted: 0,
        xpEarned: 0,
        freezeUsed: true,
      },
      {
        practiceDate: '2026-11-20',
        secondsPracticed: 210,
        messagesSent: 6,
        sessionsCompleted: 1,
        lessonsCompleted: 2,
        xpEarned: 130,
      },
    ];

    const res = computeStrictStreak(stats, '2026-11-23');
    expect(res.studiedToday).toBe(false);
    expect(res.currentStreak).toBe(3);
    expect(res.longestStreak).toBe(3);
    expect(res.canFreezeYesterday).toBe(false);

    const missedYesterday = stats.filter((s) => s.practiceDate !== '2026-11-22');
    const resMissed = computeStrictStreak(missedYesterday, '2026-11-23');
    expect(resMissed.currentStreak).toBe(0);
    expect(resMissed.canFreezeYesterday).toBe(true);
  });

  it('builds a Monday-first monthly calendar grid with exact day statuses', () => {
    const stats: DailyStat[] = [
      {
        practiceDate: '2026-11-20',
        secondsPracticed: 120,
        messagesSent: 4,
        sessionsCompleted: 1,
        lessonsCompleted: 1,
        xpEarned: 70,
      },
      {
        practiceDate: '2026-11-21',
        secondsPracticed: 0,
        messagesSent: 0,
        sessionsCompleted: 0,
        lessonsCompleted: 0,
        xpEarned: 0,
        freezeUsed: true,
      },
      {
        practiceDate: '2026-11-23',
        secondsPracticed: 150,
        messagesSent: 5,
        sessionsCompleted: 1,
        lessonsCompleted: 1,
        xpEarned: 80,
      },
    ];

    const grid = buildMonthCalendarGrid(2026, 10, stats, '2026-11-23');
    expect(grid.length % 7).toBe(0);

    const byDate = new Map(
      grid.filter((c) => c.dateStr).map((c) => [c.dateStr!, c])
    );
    expect(byDate.get('2026-11-20')?.status).toBe('studied');
    expect(byDate.get('2026-11-21')?.status).toBe('frozen');
    expect(byDate.get('2026-11-22')?.status).toBe('missed');
    expect(byDate.get('2026-11-23')?.status).toBe('today-done');
    expect(byDate.get('2026-11-24')?.status).toBe('future');
  });

  it('calculates levels, 5-tier leagues, 2x XP boost, and 1..100-day streak milestones', () => {
    expect(getLevelInfo(0).level).toBe(1);
    expect(getLevelInfo(120).level).toBe(2);
    expect(getLevelInfo(500).level).toBeGreaterThanOrEqual(3);

    expect(STREAK_MILESTONES.map((m) => m.days)).toEqual([
      1, 3, 7, 14, 30, 60, 100,
    ]);
    const claimable = getClaimableMilestones(100, 100, [1, 3, 7, 14, 30]);
    expect(claimable.map((m) => m.days)).toEqual([60, 100]);

    expect(getLeagueInfo(0).tier).toBe('bronze');
    expect(getLeagueInfo(250).tier).toBe('silver');
    expect(getLeagueInfo(600).tier).toBe('gold');
    expect(getLeagueInfo(1200).tier).toBe('emerald');
    expect(getLeagueInfo(2500).tier).toBe('diamond');

    const now = 1_700_000_000_000;
    expect(isXpBoostActive(null, now)).toBe(false);
    expect(isXpBoostActive(now - 1000, now)).toBe(false);
    expect(isXpBoostActive(now + 10 * 60_000, now)).toBe(true);
    expect(getXpBoostRemainingMinutes(now + 10 * 60_000, now)).toBe(10);

    expect(DAILY_QUEST_DEFS).toHaveLength(3);
  });

  it('provides valid expanded play-to-learn question banks including Listening Challenges', () => {
    expect(SPEED_MATCH_QUESTIONS.length).toBeGreaterThanOrEqual(24);
    for (const q of SPEED_MATCH_QUESTIONS) {
      expect(q.options).toContain(q.correctEn);
    }
    expect(SENTENCE_BUILD_QUESTIONS.length).toBeGreaterThanOrEqual(16);
    expect(PRONUNCIATION_CHALLENGES.length).toBeGreaterThanOrEqual(12);
    expect(LISTENING_CHALLENGES.length).toBeGreaterThanOrEqual(15);
    for (const item of LISTENING_CHALLENGES) {
      expect(item.spokenEn.length).toBeGreaterThan(8);
      expect(item.optionsVi).toContain(item.correctAnswerVi);
      expect(item.optionsVi.length).toBe(4);
    }
    expect(pickShuffledItems(SPEED_MATCH_QUESTIONS, 5)).toHaveLength(5);
  });
});
