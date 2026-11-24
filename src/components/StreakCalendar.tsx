'use client';

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { ShieldFreezeSvg, StreakFlameSvg } from '@/components/BrandArt';
import {
  buildMonthCalendarGrid,
  computeStrictStreak,
  type CalendarCell,
} from '@/lib/gamification';
import { playTapSound } from '@/lib/sound-fx';
import type { DailyStat } from '@/types';

interface StreakCalendarProps {
  stats: DailyStat[];
  todayStr: string;
  streakFreezes: number;
  onApplyYesterdayFreeze?: () => Promise<void>;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export function StreakCalendar({
  stats,
  todayStr,
  streakFreezes,
  onApplyYesterdayFreeze,
}: StreakCalendarProps) {
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);
  const [viewYear, setViewYear] = useState(todayYear || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(
    (todayMonth || new Date().getMonth() + 1) - 1
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [freezing, setFreezing] = useState(false);

  const cells = buildMonthCalendarGrid(viewYear, viewMonth, stats, todayStr);
  const strict = computeStrictStreak(stats, todayStr);

  const studiedDaysInMonth = cells.filter(
    (c) => c.status === 'studied' || c.status === 'today-done'
  ).length;
  const frozenDaysInMonth = cells.filter((c) => c.status === 'frozen').length;
  const missedDaysInMonth = cells.filter((c) => c.status === 'missed').length;
  const totalLessonsInMonth = cells.reduce(
    (acc, c) => acc + c.lessonsCompleted,
    0
  );

  const selectedCell: CalendarCell | null =
    cells.find((c) => c.dateStr === selectedDate) ??
    cells.find((c) => c.dateStr === todayStr) ??
    null;

  function goPrevMonth() {
    playTapSound();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    playTapSound();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    playTapSound();
    setViewYear(todayYear);
    setViewMonth(todayMonth - 1);
    setSelectedDate(todayStr);
  }

  async function handleFreezeClick() {
    if (!onApplyYesterdayFreeze) return;
    setFreezing(true);
    try {
      await onApplyYesterdayFreeze();
    } finally {
      setFreezing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#E7E2D8] bg-white p-5 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif-display text-xl font-semibold tracking-tight text-[#1C1917]">
            Lịch chuỗi học tập theo tháng
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Tính giữ chuỗi khi hoàn thành trọn vẹn ít nhất 1 bài học trong ngày.
          </p>
        </div>

        <div className="flex items-center gap-1.5 tabular-nums">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Tháng trước"
            className="btn-duo btn-duo-white p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-28 text-center font-serif-display text-base font-semibold text-[#1C1917] px-2">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Tháng sau"
            className="btn-duo btn-duo-white p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="btn-duo btn-duo-white ml-1 px-3 py-1.5 text-xs"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Month Summary Strip */}
      <div className="grid grid-cols-3 gap-3 tabular-nums">
        <div className="rounded-xl border border-[#E7E2D8] bg-[#FBF9F5] px-3.5 py-3">
          <div className="text-[11px] font-medium text-[#78716C]">
            Ngày đã học
          </div>
          <div className="mt-0.5 font-serif-display text-xl font-semibold text-[#C2410C]">
            {studiedDaysInMonth} ngày
          </div>
        </div>
        <div className="rounded-xl border border-[#E7E2D8] bg-[#FBF9F5] px-3.5 py-3">
          <div className="text-[11px] font-medium text-[#78716C]">
            Ngày nghỉ
          </div>
          <div className="mt-0.5 font-serif-display text-xl font-semibold text-[#1C1917]">
            {missedDaysInMonth} ngày
          </div>
        </div>
        <div className="rounded-xl border border-[#E7E2D8] bg-[#FBF9F5] px-3.5 py-3">
          <div className="text-[11px] font-medium text-[#78716C]">
            Bài hoàn thành
          </div>
          <div className="mt-0.5 font-serif-display text-xl font-semibold text-[#14532D]">
            {totalLessonsInMonth} bài
          </div>
        </div>
      </div>

      {/* Freeze Yesterday Rescue Banner */}
      {strict.canFreezeYesterday && onApplyYesterdayFreeze && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E7E2D8] bg-[#F3EFE6] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <ShieldFreezeSvg className="h-7 w-7 shrink-0" />
            <div className="text-xs text-[#1C1917]">
              <div className="font-semibold">
                Hôm qua ({strict.yesterdayStr.split('-').reverse().join('/')}) bạn chưa kịp hoàn thành bài học
              </div>
              <p className="text-[#57534E] mt-0.5">
                {streakFreezes > 0
                  ? `Bạn hiện có ${streakFreezes} Khiên bảo vệ chuỗi. Kích hoạt để giữ nguyên chuỗi học.`
                  : 'Bạn có thể đổi Khiên bảo vệ chuỗi bằng Ngọc tại mục phần thưởng bên dưới.'}
              </p>
            </div>
          </div>
          {streakFreezes > 0 && (
            <button
              type="button"
              disabled={freezing}
              onClick={() => void handleFreezeClick()}
              className="btn-duo btn-duo-green shrink-0 px-4 py-2 text-xs"
            >
              <Shield className="h-3.5 w-3.5" />
              {freezing ? 'Đang kích hoạt...' : 'Dùng 1 Khiên bảo vệ'}
            </button>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-semibold text-[#78716C] py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 tabular-nums">
          {cells.map((cell, idx) => {
            if (cell.status === 'empty' || !cell.dateStr) {
              return <div key={`empty-${idx}`} className="h-11 sm:h-12" />;
            }

            const isSelected = cell.dateStr === selectedCell?.dateStr;

            let cellStyle =
              'bg-[#FBF9F5] border-[#E7E2D8] text-[#57534E] hover:bg-[#F3EFE6]';
            if (cell.status === 'studied') {
              cellStyle = 'bg-[#C2410C] border-[#9A3412] text-white';
            } else if (cell.status === 'today-done') {
              cellStyle = 'bg-[#14532D] border-[#14532D] text-white';
            } else if (cell.status === 'today-pending') {
              cellStyle =
                'bg-[#FFF7ED] border-dashed border-[#C2410C] text-[#9A3412]';
            } else if (cell.status === 'frozen') {
              cellStyle = 'bg-[#57534E] border-[#44403C] text-white';
            } else if (cell.status === 'future') {
              cellStyle = 'bg-white border-[#EFECE4] text-[#D6D0C4]';
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  playTapSound();
                  setSelectedDate(cell.dateStr!);
                }}
                className={`relative flex h-11 sm:h-12 flex-col items-center justify-center rounded-xl border transition cursor-pointer ${cellStyle} ${
                  isSelected ? 'ring-2 ring-[#1C1917] ring-offset-1' : ''
                }`}
              >
                <span className="text-xs sm:text-sm font-semibold leading-none">
                  {cell.dayNumber}
                </span>
                <span className="mt-1 flex items-center justify-center text-[10px] leading-none">
                  {(cell.status === 'studied' ||
                    cell.status === 'today-done') && (
                      <Check className="h-3 w-3 stroke-[2.6]" />
                    )}
                  {cell.status === 'frozen' && (
                    <Shield className="h-3 w-3 stroke-[2.2]" />
                  )}
                  {cell.status === 'today-pending' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C2410C]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[#78716C] pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-[#C2410C]" />
          Đã giữ chuỗi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-[#14532D]" />
          Hôm nay đã xong
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-dashed border-[#C2410C] bg-[#FFF7ED]" />
          Hôm nay (chưa xong)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-[#57534E]" />
          Khiên bảo vệ ({frozenDaysInMonth})
        </span>
      </div>

      {/* Selected Day Detail Card */}
      {selectedCell && selectedCell.dateStr && (
        <div className="rounded-xl border border-[#E7E2D8] bg-[#FBF9F5] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedCell.status === 'studied' ||
              selectedCell.status === 'today-done' ? (
              <StreakFlameSvg active className="h-6 w-6 shrink-0" />
            ) : selectedCell.status === 'frozen' ? (
              <ShieldFreezeSvg className="h-6 w-6 shrink-0" />
            ) : (
              <CalendarDays className="h-5 w-5 text-[#A8A29E] shrink-0" />
            )}
            <div>
              <div className="text-xs font-semibold text-[#1C1917]">
                Ngày {selectedCell.dateStr.split('-').reverse().join('/')}
                {selectedCell.dateStr === todayStr && (
                  <span className="ml-2 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.5 text-[10px] font-semibold text-[#14532D]">
                    Hôm nay
                  </span>
                )}
              </div>
              <div className="text-xs text-[#57534E] mt-0.5">
                {selectedCell.status === 'studied' ||
                  selectedCell.status === 'today-done'
                  ? `Hoàn thành ${selectedCell.lessonsCompleted} bài học · Đã giữ chuỗi.`
                  : selectedCell.status === 'frozen'
                    ? 'Đã dùng Khiên bảo vệ chuỗi cho ngày này.'
                    : selectedCell.status === 'today-pending'
                      ? 'Chưa hoàn thành bài học nào trong hôm nay.'
                      : selectedCell.status === 'future'
                        ? 'Ngày sắp tới.'
                        : 'Chưa ghi nhận bài học trong ngày này.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#57534E] tabular-nums">
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#E7E2D8] px-2.5 py-1">
              <Clock className="h-3.5 w-3.5 text-[#78716C]" />
              {Math.round(selectedCell.secondsPracticed / 60)} phút
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-[#E7E2D8] px-2.5 py-1 text-[#9A3412]">
              <Zap className="h-3.5 w-3.5 text-[#C2410C]" />
              +{selectedCell.xpEarned} XP
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
