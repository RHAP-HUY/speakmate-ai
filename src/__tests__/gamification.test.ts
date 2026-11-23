import { describe, expect, it } from 'vitest';
import {
  pickShuffledItems,
  PRONUNCIATION_CHALLENGES,
  SENTENCE_BUILD_QUESTIONS,
  SPEED_MATCH_QUESTIONS,
} from '@/lib/game-data';
import {
  buildMonthCalendarGrid,
  computeStrictStreak,
  getClaimableMilestones,
  getLevelInfo,
  isStreakQualifyingStat,
  MIN_CALL_TURNS_FOR_LESSON,
} from '@/lib/gamification';
import type { DailyStat } from '@/types';

describe('gamification & strict streak rules', () => {
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
        lessonsCompleted: 0, // Incomplete call today should NOT count!
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
    expect(res.currentStreak).toBe(3); // 20, 21 (freeze), 22
    expect(res.longestStreak).toBe(3);
    expect(res.canFreezeYesterday).toBe(false);

    // If yesterday (2026-11-22) was missed while 2026-11-21 was studied -> canFreezeYesterday is true
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

    // November 2026 (monthIndex = 10)
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

  it('calculates levels and claimable streak milestones accurately', () => {
    expect(getLevelInfo(0).level).toBe(1);
    expect(getLevelInfo(120).level).toBe(2);
    expect(getLevelInfo(500).level).toBeGreaterThanOrEqual(3);

    const claimable = getClaimableMilestones(7, 7, [1]);
    expect(claimable.map((m) => m.days)).toEqual([3, 7]);
  });

  it('provides valid play-to-learn game question banks', () => {
    expect(SPEED_MATCH_QUESTIONS.length).toBeGreaterThanOrEqual(10);
    for (const q of SPEED_MATCH_QUESTIONS) {
      expect(q.options).toContain(q.correctEn);
    }
    expect(SENTENCE_BUILD_QUESTIONS.length).toBeGreaterThanOrEqual(8);
    expect(PRONUNCIATION_CHALLENGES.length).toBeGreaterThanOrEqual(6);
    expect(pickShuffledItems(SPEED_MATCH_QUESTIONS, 5)).toHaveLength(5);
  });
});
