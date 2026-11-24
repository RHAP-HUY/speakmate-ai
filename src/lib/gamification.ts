import type { DailyStat, ShopRewardItem, StreakMilestone } from '@/types';

/**
 * Strict rule: A voice call only counts as completing 1 lesson (and keeping the daily streak)
 * when the learner actively speaks or replies at least 3 turns.
 */
export const MIN_CALL_TURNS_FOR_LESSON = 3;

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 1,
    titleVi: 'Khởi động chuỗi học',
    subtitleVi: 'Hoàn thành trọn vẹn bài học đầu tiên',
    emoji: '01',
    rewardXp: 50,
    rewardGems: 25,
    rewardFreezes: 0,
    badgeId: 'spark-1',
    badgeLabel: 'Khởi Đầu Bền Bỉ',
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    days: 3,
    titleVi: 'Nhịp độ 3 ngày',
    subtitleVi: 'Giữ chuỗi 3 ngày liên tiếp không nghỉ',
    emoji: '03',
    rewardXp: 120,
    rewardGems: 60,
    rewardFreezes: 1,
    badgeId: 'flame-3',
    badgeLabel: 'Nhịp Học 3 Ngày',
    gradient: 'from-amber-600 to-orange-600',
  },
  {
    days: 7,
    titleVi: 'Tuần lễ đầu tiên',
    subtitleVi: 'Trọn vẹn 1 tuần luyện tiếng Anh mỗi ngày',
    emoji: '07',
    rewardXp: 300,
    rewardGems: 130,
    rewardFreezes: 1,
    badgeId: 'warrior-7',
    badgeLabel: 'Kỷ Luật 7 Ngày',
    gradient: 'from-blue-600 to-blue-700',
  },
  {
    days: 14,
    titleVi: 'Bứt phá 2 tuần',
    subtitleVi: 'Thói quen phản xạ tiếng Anh đã hình thành',
    emoji: '14',
    rewardXp: 600,
    rewardGems: 260,
    rewardFreezes: 2,
    badgeId: 'torch-14',
    badgeLabel: 'Bền Bỉ 14 Ngày',
    gradient: 'from-sky-600 to-blue-700',
  },
  {
    days: 30,
    titleVi: 'Cột mốc 30 ngày',
    subtitleVi: 'Một tháng đều đặn giao tiếp như người bản xứ',
    emoji: '30',
    rewardXp: 1500,
    rewardGems: 600,
    rewardFreezes: 3,
    badgeId: 'legend-30',
    badgeLabel: 'Học Viên 30 Ngày',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    days: 60,
    titleVi: 'Chuyên sâu 60 ngày',
    subtitleVi: 'Hai tháng kiên trì — phản xạ tự nhiên',
    emoji: '60',
    rewardXp: 3000,
    rewardGems: 1200,
    rewardFreezes: 4,
    badgeId: 'master-60',
    badgeLabel: 'Bậc Thầy 60 Ngày',
    gradient: 'from-emerald-600 to-teal-700',
  },
  {
    days: 100,
    titleVi: 'Thành tựu 100 ngày',
    subtitleVi: 'Cột mốc danh giá nhất của cộng đồng SpeakMate',
    emoji: '100',
    rewardXp: 6000,
    rewardGems: 2500,
    rewardFreezes: 5,
    badgeId: 'immortal-100',
    badgeLabel: 'Danh Dự 100 Ngày',
    gradient: 'from-zinc-800 to-zinc-950',
  },
];

export const SHOP_REWARDS: ShopRewardItem[] = [
  {
    id: 'streak-freeze',
    type: 'freeze',
    titleVi: 'Khiên bảo vệ chuỗi',
    descVi: 'Giữ nguyên chuỗi học nếu hôm qua bạn bận không kịp hoàn thành bài.',
    emoji: 'SHIELD',
    costGems: 80,
  },
  {
    id: 'xp-boost-15m',
    type: 'xp_boost',
    titleVi: 'Nhân đôi XP (15 phút)',
    descVi: 'Nhận x2 toàn bộ XP từ bài luyện phản xạ và cuộc gọi trong 15 phút.',
    emoji: 'BOOST',
    costGems: 50,
    boostMinutes: 15,
  },
  {
    id: 'badge-speedster',
    type: 'badge',
    titleVi: 'Danh hiệu Phản Xạ Nhanh',
    descVi: 'Hiển thị danh hiệu Phản Xạ Nhanh trên thẻ hồ sơ của bạn.',
    emoji: 'BADGE',
    costGems: 100,
    badgeId: 'speedster',
    badgeLabel: 'Phản Xạ Nhanh',
  },
  {
    id: 'badge-native-star',
    type: 'badge',
    titleVi: 'Danh hiệu Phát Âm Chuẩn',
    descVi: 'Mở khóa danh hiệu Phát Âm Chuẩn trên hồ sơ học tập.',
    emoji: 'BADGE',
    costGems: 160,
    badgeId: 'native-star',
    badgeLabel: 'Phát Âm Chuẩn',
  },
  {
    id: 'badge-crown',
    type: 'badge',
    titleVi: 'Danh hiệu Giao Tiếp Tự Tin',
    descVi: 'Khẳng định dấu ấn với danh hiệu Giao Tiếp Tự Tin.',
    emoji: 'BADGE',
    costGems: 260,
    badgeId: 'comm-crown',
    badgeLabel: 'Giao Tiếp Tự Tin',
  },
];

export interface DailyQuestDef {
  id: 'lesson_1' | 'xp_60' | 'minutes_goal';
  titleVi: string;
  rewardGems: number;
  rewardXp: number;
  icon: string;
  barColor: string;
}

export const DAILY_QUEST_DEFS: DailyQuestDef[] = [
  {
    id: 'lesson_1',
    titleVi: 'Hoàn thành 1 bài luyện tập',
    rewardGems: 15,
    rewardXp: 20,
    icon: '01',
    barColor: 'bg-emerald-600',
  },
  {
    id: 'xp_60',
    titleVi: 'Đạt 60 XP trong ngày',
    rewardGems: 20,
    rewardXp: 25,
    icon: '02',
    barColor: 'bg-amber-500',
  },
  {
    id: 'minutes_goal',
    titleVi: 'Đạt mục tiêu thời lượng ngày',
    rewardGems: 25,
    rewardXp: 30,
    icon: '03',
    barColor: 'bg-blue-600',
  },
];

export const BADGE_DIRECTORY: Record<string, string> = {
  ...Object.fromEntries(STREAK_MILESTONES.map((m) => [m.badgeId, m.badgeLabel])),
  ...Object.fromEntries(
    SHOP_REWARDS.filter((i) => i.badgeId && i.badgeLabel).map((i) => [
      i.badgeId!,
      i.badgeLabel!,
    ])
  ),
};

const LEVEL_TITLES = [
  'Tân Binh Khởi Lửa',
  'Người Phá Băng',
  'Thợ Săn Từ Vựng',
  'Bạn Thân Quán Cà Phê',
  'Phản Xạ Tự Tin',
  'Du Khách Toàn Cầu',
  'Chuyên Gia Small Talk',
  'Đồng Nghiệp Quốc Tế',
  'Chiến Binh Phát Âm',
  'Bậc Thầy Giao Tiếp',
  'Thông Thạo Bản Xứ',
];

export interface LevelInfo {
  level: number;
  titleVi: string;
  currentXp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export function getLevelInfo(rawXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(rawXp || 0));
  let level = 1;
  let thresholdStart = 0;
  let step = 120;

  while (xp >= thresholdStart + step && level < 50) {
    thresholdStart += step;
    level += 1;
    step = 120 + (level - 1) * 45;
  }

  const xpInLevel = xp - thresholdStart;
  const progressPct = Math.min(100, Math.round((xpInLevel / step) * 100));
  const titleIdx = Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2));

  return {
    level,
    titleVi: LEVEL_TITLES[titleIdx],
    currentXp: xp,
    xpInLevel,
    xpForNextLevel: step,
    progressPct,
  };
}

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';

export interface LeagueInfo {
  tier: LeagueTier;
  nameVi: string;
  minXp: number;
  nextXp: number | null;
}

export const LEAGUE_TIERS: LeagueInfo[] = [
  { tier: 'bronze', nameVi: 'Giải Đồng', minXp: 0, nextXp: 200 },
  { tier: 'silver', nameVi: 'Giải Bạc', minXp: 200, nextXp: 550 },
  { tier: 'gold', nameVi: 'Giải Vàng', minXp: 550, nextXp: 1100 },
  { tier: 'emerald', nameVi: 'Giải Ngọc Lục Bảo', minXp: 1100, nextXp: 2000 },
  { tier: 'diamond', nameVi: 'Giải Kim Cương', minXp: 2000, nextXp: null },
];

export function getLeagueInfo(rawXp: number): LeagueInfo {
  const xp = Math.max(0, Math.floor(rawXp || 0));
  for (let i = LEAGUE_TIERS.length - 1; i >= 0; i--) {
    if (xp >= LEAGUE_TIERS[i].minXp) return LEAGUE_TIERS[i];
  }
  return LEAGUE_TIERS[0];
}

export function isXpBoostActive(
  xpBoostUntil?: number | null,
  nowMs = Date.now()
): boolean {
  return typeof xpBoostUntil === 'number' && xpBoostUntil > nowMs;
}

export function getXpBoostRemainingMinutes(
  xpBoostUntil?: number | null,
  nowMs = Date.now()
): number {
  if (!isXpBoostActive(xpBoostUntil, nowMs)) return 0;
  return Math.max(1, Math.ceil(((xpBoostUntil as number) - nowMs) / 60_000));
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return formatLocalDate(dt);
}

/**
 * Checks whether a DailyStat qualifies to keep the streak alive:
 * ONLY when lessonsCompleted >= 1 OR freezeUsed === true.
 */
export function isStreakQualifyingStat(stat?: DailyStat | null): boolean {
  if (!stat) return false;
  return stat.lessonsCompleted >= 1 || Boolean(stat.freezeUsed);
}

/**
 * Computes strict current streak, longest streak, and whether today has already
 * met the "complete 1 full lesson" requirement.
 */
export function computeStrictStreak(
  stats: DailyStat[],
  todayStr: string
): {
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  canFreezeYesterday: boolean;
  yesterdayStr: string;
} {
  const byDate = new Map<string, DailyStat>();
  for (const st of stats) {
    byDate.set(st.practiceDate, st);
  }

  const studiedToday = (byDate.get(todayStr)?.lessonsCompleted ?? 0) >= 1;
  const todayQualifies = isStreakQualifyingStat(byDate.get(todayStr));
  const yesterdayStr = shiftDateString(todayStr, -1);
  const yesterdayQualifies = isStreakQualifyingStat(byDate.get(yesterdayStr));
  const dayBeforeStr = shiftDateString(todayStr, -2);
  const dayBeforeQualifies = isStreakQualifyingStat(byDate.get(dayBeforeStr));

  let currentStreak = 0;
  let cursor = todayQualifies
    ? todayStr
    : yesterdayQualifies
      ? yesterdayStr
      : null;

  while (cursor && isStreakQualifyingStat(byDate.get(cursor))) {
    currentStreak += 1;
    cursor = shiftDateString(cursor, -1);
  }

  // Longest streak across all qualifying dates
  const qualifyingDates = Array.from(byDate.values())
    .filter((s) => isStreakQualifyingStat(s))
    .map((s) => s.practiceDate)
    .sort();

  let longestStreak = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const d of qualifyingDates) {
    if (prevDate && shiftDateString(prevDate, 1) === d) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevDate = d;
  }

  // Can freeze yesterday if user missed yesterday, had a streak on day before yesterday, and hasn't frozen yesterday yet
  const canFreezeYesterday = !yesterdayQualifies && dayBeforeQualifies;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    studiedToday,
    canFreezeYesterday,
    yesterdayStr,
  };
}

export type CalendarDayStatus =
  | 'empty'
  | 'studied'
  | 'frozen'
  | 'missed'
  | 'today-done'
  | 'today-pending'
  | 'future';

export interface CalendarCell {
  dateStr: string | null;
  dayNumber: number | null;
  status: CalendarDayStatus;
  lessonsCompleted: number;
  secondsPracticed: number;
  xpEarned: number;
  freezeUsed: boolean;
}

/**
 * Builds a Monday-first calendar grid (T2..CN) for a given year & month (0-11).
 */
export function buildMonthCalendarGrid(
  year: number,
  monthIndex: number,
  stats: DailyStat[],
  todayStr: string
): CalendarCell[] {
  const byDate = new Map(stats.map((s) => [s.practiceDate, s]));
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  // JS getDay(): 0=Sun, 1=Mon..6=Sat -> Monday-first offset (0=Mon..6=Sun)
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push({
      dateStr: null,
      dayNumber: null,
      status: 'empty',
      lessonsCompleted: 0,
      secondsPracticed: 0,
      xpEarned: 0,
      freezeUsed: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    const st = byDate.get(dateStr);
    const lessonsCompleted = st?.lessonsCompleted ?? 0;
    const secondsPracticed = st?.secondsPracticed ?? 0;
    const xpEarned = st?.xpEarned ?? 0;
    const freezeUsed = Boolean(st?.freezeUsed);

    let status: CalendarDayStatus;
    if (dateStr === todayStr) {
      status = lessonsCompleted >= 1 ? 'today-done' : 'today-pending';
    } else if (dateStr > todayStr) {
      status = 'future';
    } else if (lessonsCompleted >= 1) {
      status = 'studied';
    } else if (freezeUsed) {
      status = 'frozen';
    } else {
      status = 'missed';
    }

    cells.push({
      dateStr,
      dayNumber: day,
      status,
      lessonsCompleted,
      secondsPracticed,
      xpEarned,
      freezeUsed,
    });
  }

  // Pad trailing blanks to complete last week row
  while (cells.length % 7 !== 0) {
    cells.push({
      dateStr: null,
      dayNumber: null,
      status: 'empty',
      lessonsCompleted: 0,
      secondsPracticed: 0,
      xpEarned: 0,
      freezeUsed: false,
    });
  }

  return cells;
}

export function getClaimableMilestones(
  streakDays: number,
  longestStreak: number,
  claimedMilestones: number[]
): StreakMilestone[] {
  const best = Math.max(streakDays, longestStreak);
  const claimedSet = new Set(claimedMilestones);
  return STREAK_MILESTONES.filter((m) => best >= m.days && !claimedSet.has(m.days));
}
