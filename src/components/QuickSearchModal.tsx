'use client';

import {
  ArrowRight,
  BookOpen,
  Compass,
  Crown,
  Gamepad2,
  GraduationCap,
  PhoneCall,
  Search,
  Settings,
  Trophy,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { listSavedPhrases } from '@/lib/data-store';
import { SCENARIOS } from '@/lib/scenarios';
import { playTapSound } from '@/lib/sound-fx';
import type { SavedPhrase } from '@/types';

interface SearchEntry {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Compass;
}

const CORE_DESTINATIONS: SearchEntry[] = [
  {
    id: 'nav-home',
    group: 'Điều hướng',
    title: 'Lộ trình học 4 chương',
    subtitle: 'Giáo trình theo chặng Đời sống, Công sở, Du lịch & Mở rộng',
    href: '/',
    icon: Compass,
  },
  {
    id: 'nav-play',
    group: 'Điều hướng',
    title: 'Thực hành phản xạ ngắn (2 phút)',
    subtitle: 'Phản xạ 15 giây, Nghe hiểu bản xứ, Ghép câu & Chấm âm vị',
    href: '/play',
    icon: Gamepad2,
  },
  {
    id: 'nav-phrases',
    group: 'Điều hướng',
    title: 'Sổ mẫu câu & Ôn tập ngắt quãng (SRS)',
    subtitle: 'Thẻ lật SM-2, tìm kiếm câu đã lưu và xuất bảng TSV cho Anki',
    href: '/phrases',
    icon: BookOpen,
  },
  {
    id: 'nav-placement',
    group: 'Đánh giá năng lực',
    title: 'Kiểm tra định vị trình độ CEFR (2 phút)',
    subtitle: 'Đo năng lực A1 → C1 qua câu tình huống và bài nghe giọng bản xứ',
    href: '/placement',
    icon: GraduationCap,
  },
  {
    id: 'nav-history',
    group: 'Điều hướng',
    title: 'Nhật ký chuỗi ngày học & Mốc thưởng',
    subtitle: 'Lịch chuỗi theo tháng, Khiên bảo vệ và 6 cột mốc phần thưởng',
    href: '/history',
    icon: Trophy,
  },
  {
    id: 'nav-leaderboard',
    group: 'Điều hướng',
    title: 'Bảng xếp hạng học viên trong tuần',
    subtitle: 'Theo dõi thứ hạng XP qua 5 bậc giải đấu',
    href: '/leaderboard',
    icon: Crown,
  },
  {
    id: 'nav-settings',
    group: 'Điều hướng',
    title: 'Hồ sơ cá nhân & Sao lưu dữ liệu',
    subtitle: 'Chỉnh giọng đọc ưu tiên, tốc độ nói và xuất/nhập bản sao lưu JSON',
    href: '/settings',
    icon: Settings,
  },
];

interface QuickSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuickSearchModal({ open, onClose }: QuickSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void listSavedPhrases().then((items) => {
      if (active) setSavedPhrases(items.slice(0, 40));
    });
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open]);

  const allEntries = useMemo<SearchEntry[]>(() => {
    const scenarioEntries: SearchEntry[] = SCENARIOS.map((sc) => ({
      id: `sc-${sc.id}`,
      group: 'Tình huống hội thoại',
      title: sc.titleVi,
      subtitle: `${sc.recommendedLevel} · ${sc.descriptionVi}`,
      href: `/call?scenario=${encodeURIComponent(sc.id)}`,
      icon: PhoneCall,
    }));

    const phraseEntries: SearchEntry[] = savedPhrases.map((ph) => ({
      id: `ph-${ph.id}`,
      group: 'Sổ mẫu câu đã lưu',
      title: ph.englishPhrase,
      subtitle: ph.vietnameseMeaning,
      href: '/phrases',
      icon: BookOpen,
    }));

    return [...CORE_DESTINATIONS, ...scenarioEntries, ...phraseEntries];
  }, [savedPhrases]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries.slice(0, 10);
    return allEntries
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [allEntries, query]);

  const safeIndex =
    filtered.length > 0 ? Math.min(selectedIndex, filtered.length - 1) : 0;

  if (!open) return null;

  function go(entry: SearchEntry) {
    playTapSound();
    setQuery('');
    setSelectedIndex(0);
    onClose();
    router.push(entry.href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh bài học và tình huống"
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#1C1917]/55 backdrop-blur-xs px-4 pt-16 sm:pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#E7E2D8] bg-[#FBF9F5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#E7E2D8] bg-white px-4 py-3.5">
          <Search className="h-4 w-4 text-[#78716C] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) =>
                  filtered.length > 0 ? (i + 1) % filtered.length : 0
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) =>
                  filtered.length > 0
                    ? i === 0
                      ? filtered.length - 1
                      : i - 1
                    : 0
                );
              } else if (e.key === 'Enter' && filtered[safeIndex]) {
                e.preventDefault();
                go(filtered[safeIndex]);
              }
            }}
            placeholder="Tìm tình huống hội thoại, bài tập, mẫu câu đã lưu..."
            className="flex-1 bg-transparent text-sm text-[#1C1917] placeholder-[#78716C] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng tìm kiếm"
            className="rounded-lg p-1 text-[#78716C] hover:bg-[#F3EFE6] hover:text-[#1C1917] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-[#EFECE4] p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#78716C]">
              Không tìm thấy mục phù hợp với từ khóa &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === safeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => go(item)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition cursor-pointer ${
                    active ? 'bg-[#14532D]/[0.08]' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                        active
                          ? 'border-[#14532D] bg-[#14532D] text-white'
                          : 'border-[#E7E2D8] bg-white text-[#57534E]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#1C1917] truncate">
                          {item.title}
                        </span>
                        <span className="hidden sm:inline rounded bg-[#F3EFE6] px-1.5 py-0.5 text-[10px] font-medium text-[#78716C] shrink-0">
                          {item.group}
                        </span>
                      </div>
                      <p className="text-xs text-[#57534E] truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    className={`h-3.5 w-3.5 shrink-0 ${
                      active ? 'text-[#14532D]' : 'text-[#A8A29E]'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E7E2D8] bg-[#F3EFE6]/70 px-4 py-2 text-[11px] text-[#78716C]">
          <span>Dùng phím ↑↓ để di chuyển · Enter để mở</span>
          <span className="font-mono">Esc để đóng</span>
        </div>
      </div>
    </div>
  );
}
