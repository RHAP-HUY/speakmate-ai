'use client';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Shield,
  Sparkles,
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
    <section className="card-duo-elevated p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF9600] text-white shadow-[0_4px_0_#D97706]">
            <CalendarDays className="h-5 w-5 stroke-[2.4]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Lịch Chuỗi Học Tập Hàng Tháng
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Chỉ tính <strong>giữ chuỗi 🔥</strong> khi hoàn thành trọn vẹn ≥{' '}
              <strong>1 bài học</strong> trong ngày.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="Tháng trước"
            className="btn-duo btn-duo-white p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-32 text-center text-sm font-black text-slate-900 px-2">
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
            className="btn-duo btn-duo-blue ml-1 px-3 py-2 text-xs"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Month Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border-2 border-orange-200 bg-[#FFF7E6] px-3.5 py-3">
          <div className="text-[11px] font-extrabold uppercase text-orange-700">
            Ngày đã học
          </div>
          <div className="mt-0.5 text-xl font-black text-[#FF9600]">
            {studiedDaysInMonth} ngày 🔥
          </div>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 px-3.5 py-3">
          <div className="text-[11px] font-extrabold uppercase text-slate-500">
            Ngày nghỉ
          </div>
          <div className="mt-0.5 text-xl font-black text-slate-700">
            {missedDaysInMonth} ngày
          </div>
        </div>
        <div className="rounded-2xl border-2 border-emerald-200 bg-[#F1FDE8] px-3.5 py-3">
          <div className="text-[11px] font-extrabold uppercase text-[#3B8702]">
            Bài hoàn thành
          </div>
          <div className="mt-0.5 text-xl font-black text-[#46A302]">
            {totalLessonsInMonth} bài
          </div>
        </div>
      </div>

      {/* Freeze Yesterday Rescue Banner */}
      {strict.canFreezeYesterday && onApplyYesterdayFreeze && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border-2 border-[#84D8FF] bg-[#E8F8FF] px-4 py-3.5">
          <div className="flex items-center gap-3">
            <ShieldFreezeSvg className="h-9 w-9 shrink-0" />
            <div className="text-xs text-sky-950">
              <div className="font-black">
                Hôm qua ({strict.yesterdayStr.split('-').reverse().join('/')}) bạn chưa kịp học!
              </div>
              <p className="text-sky-800 font-medium mt-0.5">
                {streakFreezes > 0
                  ? `Đang có ${streakFreezes} Khiên Bảo Vệ Chuỗi. Kích hoạt ngay để nối lại chuỗi không bị mất!`
                  : 'Đổi thêm Khiên Bảo Vệ Chuỗi bằng Ngọc 💎 ở Kho Quà ngay bên dưới nhé!'}
              </p>
            </div>
          </div>
          {streakFreezes > 0 && (
            <button
              type="button"
              disabled={freezing}
              onClick={() => void handleFreezeClick()}
              className="btn-duo btn-duo-blue shrink-0 px-4 py-2.5 text-xs uppercase"
            >
              <Shield className="h-4 w-4" />
              {freezing ? 'Đang kích hoạt...' : 'Dùng 1 Khiên cứu chuỗi'}
            </button>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-black uppercase tracking-wider text-slate-400 py-1"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, idx) => {
            if (cell.status === 'empty' || !cell.dateStr) {
              return <div key={`empty-${idx}`} className="h-12 sm:h-14" />;
            }

            const isSelected = cell.dateStr === selectedCell?.dateStr;

            let cellStyle =
              'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100';
            if (cell.status === 'studied') {
              cellStyle =
                'bg-[#FF9600] border-[#E07B00] border-b-4 text-white';
            } else if (cell.status === 'today-done') {
              cellStyle =
                'bg-[#58CC02] border-[#46A302] border-b-4 text-white';
            } else if (cell.status === 'today-pending') {
              cellStyle =
                'bg-[#F1FDE8] border-2 border-dashed border-[#58CC02] text-[#3B8702]';
            } else if (cell.status === 'frozen') {
              cellStyle =
                'bg-[#1CB0F6] border-[#1899D6] border-b-4 text-white';
            } else if (cell.status === 'future') {
              cellStyle = 'bg-white border-slate-100 text-slate-300';
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => {
                  playTapSound();
                  setSelectedDate(cell.dateStr!);
                }}
                className={`relative flex h-12 sm:h-14 flex-col items-center justify-center rounded-2xl border-2 transition cursor-pointer ${cellStyle} ${
                  isSelected ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                }`}
              >
                <span className="text-xs sm:text-sm font-black leading-none">
                  {cell.dayNumber}
                </span>
                <span className="mt-1 text-[10px] font-extrabold leading-none">
                  {(cell.status === 'studied' ||
                    cell.status === 'today-done') && (
                    <span>
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-500 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-[#FF9600]" />
          Đã xong ≥ 1 bài (Giữ chuỗi)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-[#58CC02]" />
          Hôm nay đã xong
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md border-2 border-dashed border-[#58CC02] bg-[#F1FDE8]" />
          Hôm nay (chưa xong)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-md bg-[#1CB0F6]" />
          Khiên bảo vệ ({frozenDaysInMonth})
        </span>
      </div>

      {/* Selected Day Detail Card */}
      {selectedCell && selectedCell.dateStr && (
        <div className="rounded-2xl border-2 border-slate-200 bg-[#F7F9FC] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {selectedCell.status === 'studied' ||
            selectedCell.status === 'today-done' ? (
              <StreakFlameSvg active className="h-9 w-9 shrink-0" />
            ) : selectedCell.status === 'frozen' ? (
              <ShieldFreezeSvg className="h-9 w-9 shrink-0" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                <Sparkles className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="text-xs font-black text-slate-900">
                Ngày {selectedCell.dateStr.split('-').reverse().join('/')}
                {selectedCell.dateStr === todayStr && (
                  <span className="ml-1.5 rounded-full bg-[#DDF4FF] px-2 py-0.5 text-[10px] font-black text-[#1899D6]">
                    Hôm nay
                  </span>
                )}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-0.5">
                {selectedCell.status === 'studied' ||
                selectedCell.status === 'today-done'
                  ? `Đã hoàn thành ${selectedCell.lessonsCompleted} bài học · Giữ chuỗi thành công!`
                  : selectedCell.status === 'frozen'
                    ? 'Đã dùng Khiên Bảo Vệ để giữ chuỗi ngày này.'
                    : selectedCell.status === 'today-pending'
                      ? 'Chưa hoàn thành bài nào hôm nay — chơi 1 màn 2 phút để thắp lửa 🔥!'
                      : selectedCell.status === 'future'
                        ? 'Ngày sắp tới — hãy đặt mục tiêu giữ chuỗi nhé!'
                        : 'Không học bài nào trong ngày này.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <span className="rounded-xl bg-white border-2 border-slate-200 px-3 py-1">
              ⏱ {Math.round(selectedCell.secondsPracticed / 60)} phút
            </span>
            <span className="rounded-xl bg-white border-2 border-amber-200 px-3 py-1 text-amber-600">
              ⚡ +{selectedCell.xpEarned} XP
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
