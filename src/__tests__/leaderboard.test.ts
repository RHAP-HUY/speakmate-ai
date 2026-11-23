import { describe, expect, it } from 'vitest';
import {
  buildWeeklyLeaderboard,
  sanitizeDisplayName,
} from '@/lib/leaderboard';

describe('weekly leaderboard & privacy guarantees', () => {
  it('sanitizes display names and never exposes email addresses', () => {
    expect(sanitizeDisplayName('yenbinh598@gmail.com')).toBe('yenbinh598');
    expect(sanitizeDisplayName('  Minh Huy  ')).toBe('Minh Huy');
    expect(sanitizeDisplayName('')).toBe('Học viên SpeakMate');
    expect(sanitizeDisplayName(null)).toBe('Học viên SpeakMate');
  });

  it('merges real Drive users with community peers, ranks accurately, and flags current user', () => {
    const res = buildWeeklyLeaderboard({
      realUsers: [
        {
          accountId: 'google_1',
          displayName: 'alice@example.com',
          englishLevel: 'A2-B1',
          streakDays: 5,
          xp: 1200,
          updatedAt: '2026-11-23T00:00:00Z',
        },
        {
          accountId: 'google_2',
          displayName: 'Huy Pro',
          englishLevel: 'B2+',
          streakDays: 14,
          xp: 2450,
          updatedAt: '2026-11-23T00:00:00Z',
        },
      ],
      currentUserId: 'google_2',
      weekSeed: 42,
    });

    expect(res.totalRealUsers).toBe(2);
    expect(res.entries.length).toBe(10);
    expect(res.currentUserRank).toBe(1);
    expect(res.entries[0].id).toBe('google_2');
    expect(res.entries[0].isCurrentUser).toBe(true);
    expect(res.entries[0].leagueTier).toBe('diamond');

    // Privacy check: no entry displayName contains '@'
    for (const entry of res.entries) {
      expect(entry.displayName).not.toContain('@');
    }

    // Sorted descending by XP
    for (let i = 1; i < res.entries.length; i++) {
      expect(res.entries[i - 1].xp).toBeGreaterThanOrEqual(res.entries[i].xp);
    }
  });

  it('injects current user via fallback when not yet indexed on Drive', () => {
    const res = buildWeeklyLeaderboard({
      realUsers: [],
      currentUserId: 'local-current-user',
      currentUserFallback: {
        displayName: 'Tân Binh',
        englishLevel: 'A0-A1',
        streakDays: 1,
        xp: 90,
      },
      weekSeed: 7,
    });

    expect(res.currentUserRank).not.toBeNull();
    const me = res.entries.find((e) => e.isCurrentUser);
    expect(me?.displayName).toBe('Tân Binh');
    expect(me?.isBot).toBe(false);
  });
});
