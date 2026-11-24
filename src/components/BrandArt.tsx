'use client';

import {
  Flame,
  Gem,
  Gift,
  Shield,
  Trophy,
} from 'lucide-react';

interface CompanionProps {
  mood?: 'happy' | 'excited' | 'fire' | 'proud';
  className?: string;
}

export const TUTOR_PHOTO_MAP: Record<string, { src: string; alt: string }> = {
  'emma-us': {
    src: '/images/tutor-emma.jpg',
    alt: 'Emma — Người hướng dẫn tiếng Anh Mỹ',
  },
  'andrew-us': {
    src: '/images/tutor-andrew.jpg',
    alt: 'Andrew — Người hướng dẫn tiếng Anh Mỹ',
  },
  'sonia-uk': {
    src: '/images/tutor-olivia.jpg',
    alt: 'Olivia — Người hướng dẫn tiếng Anh Anh',
  },
  'ryan-uk': {
    src: '/images/tutor-oliver.jpg',
    alt: 'Oliver — Người hướng dẫn tiếng Anh Anh',
  },
  'natasha-au': {
    src: '/images/tutor-charlotte.jpg',
    alt: 'Charlotte — Người hướng dẫn tiếng Anh Úc',
  },
  'clara-ca': {
    src: '/images/tutor-clara.jpg',
    alt: 'Clara — Người hướng dẫn tiếng Anh Canada',
  },
};

export const CHAPTER_COVER_MAP: Record<string, string> = {
  'unit-daily': '/images/chapter-daily.jpg',
  'unit-business': '/images/chapter-business.jpg',
  'unit-travel': '/images/chapter-travel.jpg',
  'unit-freetalk': '/images/chapter-freetalk.jpg',
};

/**
 * Clean Geometric SpeakMate App Emblem (Minimalist Speech Bubble & Pulse Arc).
 */
export function NovaCompanion({
  mood = 'happy',
  className = 'h-9 w-9',
}: CompanionProps) {
  const accent = mood === 'proud' ? '#059669' : '#E5483F';

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="#111827" />
      <path
        d="M12.5 14.5C12.5 12.567 14.067 11 16 11H24C25.933 11 27.5 12.567 27.5 14.5V21.5C27.5 23.433 25.933 25 24 25H18.8L14 28.8V25C13.172 25 12.5 24.328 12.5 23.5V14.5Z"
        fill="#FFFFFF"
      />
      <rect x="16.5" y="16" width="2.2" height="4.2" rx="1.1" fill={accent} />
      <rect x="20" y="14.2" width="2.2" height="7.6" rx="1.1" fill="#111827" />
      <rect x="23.5" y="16.5" width="2.2" height="3.2" rx="1.1" fill={accent} />
    </svg>
  );
}

/**
 * Real Studio-Lit Editorial Portrait for each Native Tutor.
 */
export function TutorAvatar({
  personaId,
  className = 'h-11 w-11',
}: {
  personaId: string;
  className?: string;
}) {
  const photo = TUTOR_PHOTO_MAP[personaId] ?? TUTOR_PHOTO_MAP['emma-us'];

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={photo.src}
      alt={photo.alt}
      loading="lazy"
      decoding="async"
      className={`${className} rounded-full object-cover object-top shrink-0 bg-[#F3F4F6] ring-1 ring-black/8`}
    />
  );
}

export function StreakFlameSvg({
  active = true,
  className = 'h-4 w-4',
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <Flame
      className={`${className} shrink-0 ${
        active
          ? 'text-[#E5483F] fill-[#F59E0B]'
          : 'text-gray-300 fill-gray-200'
      }`}
      aria-hidden="true"
    />
  );
}

export function GemSvg({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <Gem
      className={`${className} shrink-0 text-[#059669] fill-[#A7F3D0]`}
      aria-hidden="true"
    />
  );
}

export function ShieldFreezeSvg({
  className = 'h-4 w-4',
}: {
  className?: string;
}) {
  return (
    <Shield
      className={`${className} shrink-0 text-sky-600 fill-sky-100`}
      aria-hidden="true"
    />
  );
}

export function TreasureChestSvg({
  state = 'locked',
  className = 'h-8 w-8',
}: {
  state?: 'locked' | 'ready' | 'opened';
  className?: string;
}) {
  const tone =
    state === 'ready'
      ? 'bg-[#FFF1F0] text-[#E5483F] border-[#FECACA]'
      : state === 'opened'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-gray-100 text-gray-400 border-gray-200';

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl border ${tone}`}
      aria-hidden="true"
    >
      <Gift className="h-[52%] w-[52%] stroke-[2]" />
    </span>
  );
}

export function LeagueTrophySvg({
  tier,
  className = 'h-8 w-8',
}: {
  tier: 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';
  className?: string;
}) {
  const palette: Record<typeof tier, string> = {
    bronze: 'bg-orange-50 text-orange-700 border-orange-200',
    silver: 'bg-slate-100 text-slate-700 border-slate-200',
    gold: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    diamond: 'bg-gray-900 text-white border-gray-900',
  };

  return (
    <span
      className={`${className} inline-flex shrink-0 items-center justify-center rounded-xl border ${palette[tier]}`}
      aria-hidden="true"
    >
      <Trophy className="h-[52%] w-[52%] stroke-[2]" />
    </span>
  );
}
