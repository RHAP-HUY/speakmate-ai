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
    activeBadge?: string | null;
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

  // Ensure current user always appears with freshest local progress (even within 30s Drive cache TTL)
  if (params.currentUserId && params.currentUserFallback) {
    const existing = map.get(params.currentUserId);
    const rawFallbackXp = Math.max(0, Math.floor(params.currentUserFallback.xp || 0));
    // Cap unverified client query fallback XP unless backed by Drive roster within +2500 XP delta
    const safeClientXp = existing
      ? Math.min(existing.xp + 2_500, Math.max(existing.xp, rawFallbackXp))
      : Math.min(50_000, rawFallbackXp);
    const safeStreak = existing
      ? Math.min(existing.streakDays + 5, Math.max(existing.streakDays, Math.floor(params.currentUserFallback.streakDays || 0)))
      : Math.min(365, Math.max(0, Math.floor(params.currentUserFallback.streakDays || 0)));

    map.set(params.currentUserId, {
      id: params.currentUserId,
      displayName: sanitizeDisplayName(
        params.currentUserFallback.displayName || existing?.displayName
      ),
      englishLevel:
        params.currentUserFallback.englishLevel || existing?.englishLevel || 'A0-A1',
      streakDays: safeStreak,
      xp: safeClientXp,
      activeBadge: params.currentUserFallback.activeBadge ?? null,
      isCurrentUser: true,
      isBot: false,
      leagueTier: getLeagueInfo(safeClientXp).tier,
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
