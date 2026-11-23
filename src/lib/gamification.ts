import type { DailyStat, ShopRewardItem, StreakMilestone } from '@/types';

/**
 * Strict rule: A voice call only counts as completing 1 lesson (and keeping the daily streak)
 * when the learner actively speaks or replies at least 3 turns.
 */
export const MIN_CALL_TURNS_FOR_LESSON = 3;

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 1,
    titleVi: 'Khởi động lửa',
    subtitleVi: 'Hoàn thành trọn vẹn bài học đầu tiên',
    emoji: '✨',
    rewardXp: 50,
    rewardGems: 25,
    rewardFreezes: 0,
    badgeId: 'spark-1',
    badgeLabel: '✨ Tia Lửa Đầu Tiên',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    days: 3,
    titleVi: 'Bền bỉ 3 ngày',
    subtitleVi: 'Giữ chuỗi 3 ngày liên tiếp không nghỉ',
    emoji: '🔥',
    rewardXp: 120,
    rewardGems: 60,
    rewardFreezes: 1,
    badgeId: 'flame-3',
    badgeLabel: '🔥 Ngọn Lửa Bền Bỉ',
    gradient: 'from-orange-500 to-rose-500',
  },
  {
    days: 7,
    titleVi: 'Chiến binh 7 ngày',
    subtitleVi: 'Trọn vẹn 1 tuần luyện tiếng Anh mỗi ngày',
    emoji: '🏆',
    rewardXp: 300,
    rewardGems: 130,
    rewardFreezes: 1,
    badgeId: 'warrior-7',
    badgeLabel: '🏆 Chiến Binh 7 Ngày',
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    days: 14,
    titleVi: 'Bứt phá 2 tuần',
    subtitleVi: 'Thói quen phản xạ tiếng Anh đã hình thành',
    emoji: '⚡',
    rewardXp: 600,
    rewardGems: 260,
    rewardFreezes: 2,
    badgeId: 'torch-14',
    badgeLabel: '⚡ Ngọn Đuốc 14 Ngày',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    days: 30,
    titleVi: 'Huyền thoại 30 ngày',
    subtitleVi: 'Kỷ luật thép — tự tin giao tiếp như người bản xứ',
    emoji: '👑',
    rewardXp: 1500,
    rewardGems: 600,
    rewardFreezes: 3,
    badgeId: 'legend-30',
    badgeLabel: '👑 Huyền Thoại Bản Xứ',
    gradient: 'from-amber-400 via-yellow-500 to-rose-500',
  },
];

export const SHOP_REWARDS: ShopRewardItem[] = [
  {
    id: 'streak-freeze',
    type: 'freeze',
    titleVi: 'Khiên Bảo Vệ Chuỗi',
    descVi: 'Cứu chuỗi ngay lập tức nếu hôm qua bạn bận không kịp học 1 bài.',
    emoji: '🧊',
    costGems: 80,
  },
  {
    id: 'badge-speedster',
    type: 'badge',
    titleVi: 'Danh hiệu Tia Chớp Phản Xạ',
    descVi: 'Hiển thị huy hiệu ⚡ Tia Chớp ngay cạnh tên của bạn.',
    emoji: '⚡',
    costGems: 100,
    badgeId: 'speedster',
    badgeLabel: '⚡ Tia Chớp Phản Xạ',
  },
  {
    id: 'badge-native-star',
    type: 'badge',
    titleVi: 'Danh hiệu Ngôi Sao Bản Xứ',
    descVi: 'Mở khóa huy hiệu 🌟 Ngôi Sao Bản Xứ siêu nổi bật.',
    emoji: '🌟',
    costGems: 160,
    badgeId: 'native-star',
    badgeLabel: '🌟 Ngôi Sao Bản Xứ',
  },
  {
    id: 'badge-crown',
    type: 'badge',
    titleVi: 'Vương Miện Giao Tiếp',
    descVi: 'Khẳng định đẳng cấp với huy hiệu 👑 Vương Miện Giao Tiếp.',
    emoji: '👑',
    costGems: 260,
    badgeId: 'comm-crown',
    badgeLabel: '👑 Vương Miện Giao Tiếp',
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
  'Huyền Thoại Bản Xứ 👑',
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
