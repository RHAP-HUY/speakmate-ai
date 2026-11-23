import { getLeagueInfo } from '@/lib/gamification';
import type { PublicLeaderboardRosterItem } from '@/lib/google-drive-store';
import type { LeaderboardEntry } from '@/types';

const COMMUNITY_PEERS: {
  id: string;
  displayName: string;
  englishLevel: string;
  baseXp: number;
  baseStreak: number;
}[] = [
  { id: 'peer-linh', displayName: 'Minh Linh', englishLevel: 'B2+', baseXp: 1420, baseStreak: 18 },
  { id: 'peer-khang', displayName: 'Gia Khang', englishLevel: 'A2-B1', baseXp: 980, baseStreak: 12 },
  { id: 'peer-vy', displayName: 'Thảo Vy', englishLevel: 'A2-B1', baseXp: 760, baseStreak: 9 },
  { id: 'peer-nam', displayName: 'Hoàng Nam', englishLevel: 'A0-A1', baseXp: 510, baseStreak: 6 },
  { id: 'peer-anh', displayName: 'Tú Anh', englishLevel: 'A2-B1', baseXp: 365, baseStreak: 5 },
  { id: 'peer-duc', displayName: 'Minh Đức', englishLevel: 'A0-A1', baseXp: 240, baseStreak: 4 },
  { id: 'peer-nhi', displayName: 'Yến Nhi', englishLevel: 'A0-A1', baseXp: 155, baseStreak: 2 },
  { id: 'peer-khoa', displayName: 'Đăng Khoa', englishLevel: 'A0-A1', baseXp: 90, baseStreak: 1 },
];

export function sanitizeDisplayName(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'Học viên SpeakMate';
  // Never expose an email address verbatim on public leaderboard
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0].slice(0, 24) || 'Học viên SpeakMate';
  }
  return trimmed.slice(0, 32);
}

export function buildWeeklyLeaderboard(params: {
  realUsers: PublicLeaderboardRosterItem[];
  currentUserId?: string | null;
  currentUserFallback?: {
    displayName: string;
    englishLevel: string;
    streakDays: number;
    xp: number;
  } | null;
  weekSeed?: number;
}): {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  totalRealUsers: number;
} {
  const seed = params.weekSeed ?? Math.floor(Date.now() / (7 * 86_400_000));
  const map = new Map<string, LeaderboardEntry>();

  for (const u of params.realUsers) {
    const xp = Math.max(0, Math.floor(Number(u.xp) || 0));
    map.set(u.accountId, {
      id: u.accountId,
      displayName: sanitizeDisplayName(u.displayName),
      englishLevel: u.englishLevel || 'A0-A1',
      streakDays: Math.max(0, Math.floor(Number(u.streakDays) || 0)),
      xp,
      isCurrentUser: Boolean(params.currentUserId && u.accountId === params.currentUserId),
      isBot: false,
      leagueTier: getLeagueInfo(xp).tier,
    });
  }

  // Ensure current user always appears even if not yet written to accounts_index
  if (
    params.currentUserId &&
    !map.has(params.currentUserId) &&
    params.currentUserFallback
  ) {
    const xp = Math.max(0, Math.floor(params.currentUserFallback.xp || 0));
    map.set(params.currentUserId, {
      id: params.currentUserId,
      displayName: sanitizeDisplayName(params.currentUserFallback.displayName),
      englishLevel: params.currentUserFallback.englishLevel || 'A0-A1',
      streakDays: Math.max(0, Math.floor(params.currentUserFallback.streakDays || 0)),
      xp,
      isCurrentUser: true,
      isBot: false,
      leagueTier: getLeagueInfo(xp).tier,
    });
  }

  const totalRealUsers = map.size;

  // Fill with lively community peers when real roster < 10 so the league always feels energetic
  if (map.size < 10) {
    for (let i = 0; i < COMMUNITY_PEERS.length && map.size < 10; i++) {
      const p = COMMUNITY_PEERS[i];
      const jitter = ((seed * (i + 3) * 37) % 90) - 30;
      const xp = Math.max(40, p.baseXp + jitter);
      map.set(p.id, {
        id: p.id,
        displayName: p.displayName,
        englishLevel: p.englishLevel,
        streakDays: p.baseStreak,
        xp,
        isCurrentUser: false,
        isBot: true,
        leagueTier: getLeagueInfo(xp).tier,
      });
    }
  }

  const entries = Array.from(map.values()).sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.streakDays !== a.streakDays) return b.streakDays - a.streakDays;
    return a.displayName.localeCompare(b.displayName, 'vi');
  });

  const idx = entries.findIndex((e) => e.isCurrentUser);
  return {
    entries: entries.slice(0, 30),
    currentUserRank: idx >= 0 ? idx + 1 : null,
    totalRealUsers,
  };
}
