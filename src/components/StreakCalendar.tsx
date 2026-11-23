'use client';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import {
  buildMonthCalendarGrid,
  computeStrictStreak,
  type CalendarCell,
} from '@/lib/gamification';
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
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
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
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-xs">
              <CalendarDays className="h-4 w-4" />
            </span>
            Lịch Chuỗi Học Tập
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chỉ tính <strong>giữ chuỗi 🔥</strong> khi hoàn thành trọn vẹn ít nhất <strong>1 bài học</strong> trong ngày.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Tháng trước"
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-32 text-center text-sm font-bold text-slate-900 px-2">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="Tháng sau"
            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Month Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/70 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-orange-700">
            Ngày đã học
          </div>
          <div className="text-lg font-extrabold text-orange-600">
            {studiedDaysInMonth} ngày 🔥
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-slate-500">
            Ngày bỏ lỡ
          </div>
          <div className="text-lg font-extrabold text-slate-700">
            {missedDaysInMonth} ngày
          </div>
        </div>
        <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/70 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-indigo-700">
            Bài hoàn thành
          </div>
          <div className="text-lg font-extrabold text-indigo-700">
            {totalLessonsInMonth} bài
          </div>
        </div>
      </div>

      {/* Freeze Yesterday Rescue Banner */}
      {strict.canFreezeYesterday && onApplyYesterdayFreeze && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Shield className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
            <div className="text-xs text-cyan-950">
              <div className="font-bold">
                Hôm qua ({strict.yesterdayStr.split('-').reverse().join('/')}) bạn quên chưa học!
              </div>
              <p className="text-cyan-800 mt-0.5">
                {streakFreezes > 0
                  ? `Bạn đang có ${streakFreezes} 🧊 Khiên Bảo Vệ Chuỗi. Dùng ngay để nối lại chuỗi không bị mất!`
                  : 'Hãy đổi thêm 🧊 Khiên Bảo Vệ Chuỗi bằng Ngọc 💎 ở mục Kho quà bên dưới.'}
              </p>
            </div>
          </div>
          {streakFreezes > 0 && (
            <button
              type="button"
              disabled={freezing}
              onClick={() => void handleFreezeClick()}
              className="shrink-0 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-cyan-700 disabled:opacity-50 cursor-pointer"
            >
              {freezing ? 'Đang kích hoạt...' : '🧊 Dùng 1 Khiên cứu chuỗi'}
            </button>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((cell, idx) => {
            if (cell.status === 'empty' || !cell.dateStr) {
              return <div key={`empty-${idx}`} className="h-12 sm:h-14" />;
            }

            const isSelected = cell.dateStr === selectedCell?.dateStr;

            let cellStyle =
              'bg-slate-50 border-slate-200/80 text-slate-400 hover:bg-slate-100';
            if (cell.status === 'studied') {
              cellStyle =
                'bg-gradient-to-br from-amber-400 to-orange-500 border-orange-400 text-white shadow-sm shadow-orange-500/20';
            } else if (cell.status === 'today-done') {
              cellStyle =
                'bg-gradient-to-br from-orange-500 to-rose-500 border-rose-400 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-300';
            } else if (cell.status === 'today-pending') {
              cellStyle =
                'bg-indigo-50/90 border-2 border-dashed border-indigo-500 text-indigo-700';
            } else if (cell.status === 'frozen') {
              cellStyle =
                'bg-gradient-to-br from-sky-400 to-cyan-500 border-cyan-400 text-white shadow-xs';
            } else if (cell.status === 'future') {
              cellStyle = 'bg-white border-slate-100 text-slate-300';
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => setSelectedDate(cell.dateStr!)}
                className={`relative flex h-12 sm:h-14 flex-col items-center justify-center rounded-2xl border transition cursor-pointer ${cellStyle} ${
                  isSelected ? 'ring-2 ring-indigo-600 ring-offset-1' : ''
                }`}
              >
                <span className="text-xs sm:text-sm font-bold leading-none">
                  {cell.dayNumber}
                </span>
                <span className="mt-1 text-[10px] leading-none">
                  {(cell.status === 'studied' ||
                    cell.status === 'today-done') && (
                    <span className="inline-flex items-center gap-0.5 font-bold">
                      🔥{cell.lessonsCompleted > 1 ? cell.lessonsCompleted : ''}
                    </span>
                  )}
                  {cell.status === 'frozen' && '🧊'}
                  {cell.status === 'today-pending' && '⏳'}
                  {cell.status === 'missed' && '·'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-gradient-to-br from-amber-400 to-orange-500" />
          Đã xong ≥ 1 bài (Giữ chuỗi)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md border-2 border-dashed border-indigo-500 bg-indigo-50" />
          Hôm nay (chưa xong bài)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-gradient-to-br from-sky-400 to-cyan-500" />
          Khiên bảo vệ ({frozenDaysInMonth})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-md bg-slate-100 border border-slate-200" />
          Ngày không học
        </span>
      </div>

      {/* Selected Day Detail Card */}
      {selectedCell && selectedCell.dateStr && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                selectedCell.status === 'studied' ||
                selectedCell.status === 'today-done'
                  ? 'bg-orange-100 text-orange-600'
                  : selectedCell.status === 'frozen'
                    ? 'bg-cyan-100 text-cyan-600'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              {selectedCell.status === 'studied' ||
              selectedCell.status === 'today-done' ? (
                <Flame className="h-5 w-5" />
              ) : selectedCell.status === 'frozen' ? (
                <Shield className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                Ngày {selectedCell.dateStr.split('-').reverse().join('/')}
                {selectedCell.dateStr === todayStr && (
                  <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    Hôm nay
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {selectedCell.status === 'studied' ||
                selectedCell.status === 'today-done'
                  ? `Đã hoàn thành ${selectedCell.lessonsCompleted} bài học · Giữ chuỗi thành công!`
                  : selectedCell.status === 'frozen'
                    ? 'Đã dùng Khiên Bảo Vệ để giữ chuỗi ngày này.'
                    : selectedCell.status === 'today-pending'
                      ? 'Chưa hoàn thành bài nào hôm nay — học xong 1 bài để thắp lửa 🔥!'
                      : selectedCell.status === 'future'
                        ? 'Ngày sắp tới — hãy đặt mục tiêu giữ chuỗi nhé!'
                        : 'Không học bài nào trong ngày này.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
            <span className="rounded-xl bg-white border border-slate-200 px-2.5 py-1">
              ⏱ {Math.round(selectedCell.secondsPracticed / 60)} phút
            </span>
            <span className="rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-indigo-700">
              ⚡ +{selectedCell.xpEarned} XP
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
