import { NextResponse, type NextRequest } from 'next/server';
import { readGoogleSession } from '@/lib/google-auth';
import { readOwnerLeaderboardRoster } from '@/lib/google-drive-store';
import { buildWeeklyLeaderboard } from '@/lib/leaderboard';

export const maxDuration = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await readGoogleSession();
    const realUsers = await readOwnerLeaderboardRoster();

    const qXp = Number(request.nextUrl.searchParams.get('xp') ?? '');
    const qStreak = Number(request.nextUrl.searchParams.get('streak') ?? '');
    const qName = request.nextUrl.searchParams.get('name') ?? '';
    const qLevel = request.nextUrl.searchParams.get('level') ?? 'A0-A1';

    const currentUserId = session?.userId ?? (qName ? 'local-current-user' : null);

    const { entries, currentUserRank, totalRealUsers } = buildWeeklyLeaderboard({
      realUsers,
      currentUserId,
      currentUserFallback: currentUserId
        ? {
            displayName: qName || session?.name || 'Bạn',
            englishLevel: qLevel,
            streakDays: Number.isFinite(qStreak) ? qStreak : 0,
            xp: Number.isFinite(qXp) ? qXp : 0,
          }
        : null,
    });

    const now = new Date();
    const weekLabel = `Tuần ${Math.ceil(now.getDate() / 7)} · Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

    return NextResponse.json({
      ok: true,
      weekLabel,
      totalRealUsers,
      currentUserRank,
      entries,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Không thể tải Bảng Xếp Hạng lúc này.',
      },
      { status: 500 }
    );
  }
}
