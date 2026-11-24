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
    <section className="rounded-3xl border border-gray-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-gray-900">
            Lịch chuỗi học tập theo tháng
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
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
          <div className="min-w-28 text-center font-display text-sm font-bold text-gray-900 px-2">
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
            className="btn-duo btn-duo-white ml-1 px-3.5 py-1.5 text-xs"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Month Summary Strip */}
      <div className="grid grid-cols-3 gap-3 tabular-nums">
        <div className="rounded-2xl border border-gray-200/80 bg-[#F6F7F9] px-4 py-3">
          <div className="text-[11px] font-medium text-gray-500">Ngày đã học</div>
          <div className="mt-0.5 font-display text-xl font-bold text-[#E5483F]">
            {studiedDaysInMonth} ngày
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-[#F6F7F9] px-4 py-3">
          <div className="text-[11px] font-medium text-gray-500">Ngày nghỉ</div>
          <div className="mt-0.5 font-display text-xl font-bold text-gray-900">
            {missedDaysInMonth} ngày
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200/80 bg-[#F6F7F9] px-4 py-3">
          <div className="text-[11px] font-medium text-gray-500">Bài hoàn thành</div>
          <div className="mt-0.5 font-display text-xl font-bold text-emerald-600">
            {totalLessonsInMonth} bài
          </div>
        </div>
      </div>

      {/* Freeze Yesterday Rescue Banner */}
      {strict.canFreezeYesterday && onApplyYesterdayFreeze && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <ShieldFreezeSvg className="h-6 w-6 shrink-0" />
            <div className="text-xs text-sky-950">
              <div className="font-bold">
                Hôm qua ({strict.yesterdayStr.split('-').reverse().join('/')}) bạn chưa kịp hoàn thành bài học
              </div>
              <p className="text-sky-800 mt-0.5">
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
              className="btn-duo btn-duo-primary shrink-0 px-4 py-2 text-xs"
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
              className="text-center text-[11px] font-semibold text-gray-400 py-1"
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
              'bg-[#F6F7F9] border-gray-200/70 text-gray-500 hover:bg-gray-100';
            if (cell.status === 'studied') {
              cellStyle = 'bg-amber-500 border-amber-500 text-white';
            } else if (cell.status === 'today-done') {
              cellStyle = 'bg-emerald-600 border-emerald-600 text-white';
            } else if (cell.status === 'today-pending') {
              cellStyle =
                'bg-rose-50 border-dashed border-[#E5483F] text-[#E5483F]';
            } else if (cell.status === 'frozen') {
              cellStyle = 'bg-sky-600 border-sky-600 text-white';
            } else if (cell.status === 'future') {
              cellStyle = 'bg-white border-gray-100 text-gray-300';
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
                  isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''
                }`}
              >
                <span className="text-xs sm:text-sm font-bold leading-none">
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
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E5483F]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-gray-500 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-amber-500" />
          Đã giữ chuỗi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-emerald-600" />
          Hôm nay đã xong
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-dashed border-[#E5483F] bg-rose-50" />
          Hôm nay (chưa xong)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-sky-600" />
          Khiên bảo vệ ({frozenDaysInMonth})
        </span>
      </div>

      {/* Selected Day Detail Card */}
      {selectedCell && selectedCell.dateStr && (
        <div className="rounded-2xl border border-gray-200/80 bg-[#F6F7F9] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedCell.status === 'studied' ||
            selectedCell.status === 'today-done' ? (
              <StreakFlameSvg active className="h-6 w-6 shrink-0" />
            ) : selectedCell.status === 'frozen' ? (
              <ShieldFreezeSvg className="h-6 w-6 shrink-0" />
            ) : (
              <CalendarDays className="h-5 w-5 text-gray-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold text-gray-900">
                Ngày {selectedCell.dateStr.split('-').reverse().join('/')}
                {selectedCell.dateStr === todayStr && (
                  <span className="ml-2 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Hôm nay
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
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

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 tabular-nums">
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3 py-1">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {Math.round(selectedCell.secondsPracticed / 60)} phút
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-3 py-1 text-amber-700">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              +{selectedCell.xpEarned} XP
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
