'use client';

import { useId } from 'react';

interface CompanionProps {
  mood?: 'happy' | 'excited' | 'fire' | 'proud';
  className?: string;
}

/**
 * Precision Acoustic Studio Mark — SpeakMate Studio Emblem.
 * Inspired by Braun / Apple Voice Memos / Speak.com industrial geometry:
 * clean squircle chassis + calibrated 5-bar harmonic soundwave, zero cartoon faces.
 */
export function NovaCompanion({
  mood = 'happy',
  className = 'h-12 w-12',
}: CompanionProps) {
  const uid = useId().replace(/:/g, '');
  const bgId = `sm-mark-${uid}`;

  const palette =
    mood === 'fire'
      ? {
          bg1: '#27272A',
          bg2: '#18181B',
          accent: '#F59E0B',
          ring: '#D97706',
        }
      : mood === 'proud'
        ? {
            bg1: '#1E293B',
            bg2: '#0F172A',
            accent: '#34D399',
            ring: '#10B981',
          }
        : mood === 'excited'
          ? {
              bg1: '#1E3A8A',
              bg2: '#172554',
              accent: '#60A5FA',
              ring: '#3B82F6',
            }
          : {
              bg1: '#27272A',
              bg2: '#141413',
              accent: '#60A5FA',
              ring: '#3F3F46',
            };

  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={bgId}
          x1="12"
          y1="10"
          x2="84"
          y2="86"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.bg1} />
          <stop offset="100%" stopColor={palette.bg2} />
        </linearGradient>
      </defs>

      {/* Precision Squircle Chassis */}
      <rect
        x="8"
        y="8"
        width="80"
        height="80"
        rx="22"
        fill={`url(#${bgId})`}
        stroke={palette.ring}
        strokeWidth="1.5"
      />

      {/* Subtle inner acoustic ring */}
      <circle
        cx="48"
        cy="48"
        r="28"
        stroke="#FFFFFF"
        strokeOpacity="0.08"
        strokeWidth="1.25"
      />

      {/* 5-bar calibrated harmonic voice waveform */}
      <rect x="27" y="41" width="5" height="14" rx="2.5" fill="#FFFFFF" fillOpacity="0.7" />
      <rect x="36" y="32" width="5" height="32" rx="2.5" fill="#FFFFFF" />
      <rect x="45.5" y="25" width="5" height="46" rx="2.5" fill={palette.accent} />
      <rect x="55" y="34" width="5" height="28" rx="2.5" fill="#FFFFFF" />
      <rect x="64" y="42" width="5" height="12" rx="2.5" fill="#FFFFFF" fillOpacity="0.7" />
    </svg>
  );
}

export function StreakFlameSvg({
  active = true,
  className = 'h-5 w-5',
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12.8 2.4C12.8 2.4 18.5 7 18.5 13.2C18.5 17.5 15.6 21 11.8 21C7.9 21 5.2 17.9 5.2 13.8C5.2 10.8 6.9 8.3 8.4 6.9C8.3 8.7 9.2 9.9 10.1 10.4C9.5 7.3 10.9 4.4 12.8 2.4Z"
        fill={active ? '#D97706' : '#D4D4D8'}
      />
      <path
        d="M12 9.2C12 9.2 15.2 12 15.2 15.3C15.2 17.8 13.6 19.6 11.8 19.6C9.8 19.6 8.3 17.9 8.3 15.7C8.3 13.8 9.8 12.2 12 9.2Z"
        fill={active ? '#FBBF24' : '#E4E4E7'}
      />
    </svg>
  );
}

export function GemSvg({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6.5 4H17.5L21.5 9.5L12 20.5L2.5 9.5L6.5 4Z"
        fill="#1D4ED8"
      />
      <path
        d="M6.5 4H17.5L15.5 9.5H8.5L6.5 4Z"
        fill="#93C5FD"
        fillOpacity="0.85"
      />
      <path
        d="M8.5 9.5H15.5L12 20.5L8.5 9.5Z"
        fill="#3B82F6"
      />
    </svg>
  );
}

export function ShieldFreezeSvg({
  className = 'h-5 w-5',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5L20 5.8V11.8C20 16.7 16.6 20.3 12 22C7.4 20.3 4 16.7 4 11.8V5.8L12 2.5Z"
        fill="#0284C7"
      />
      <path
        d="M12 7.5V16.5M8.5 9.5L15.5 14.5M15.5 9.5L8.5 14.5"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TreasureChestSvg({
  state = 'locked',
  className = 'h-10 w-10',
}: {
  state?: 'locked' | 'ready' | 'opened';
  className?: string;
}) {
  const fillBody =
    state === 'ready'
      ? '#D97706'
      : state === 'opened'
        ? '#059669'
        : '#A1A1AA';
  const fillLid =
    state === 'ready'
      ? '#F59E0B'
      : state === 'opened'
        ? '#34D399'
        : '#D4D4D8';
  const strokeCol =
    state === 'ready' ? '#92400E' : state === 'opened' ? '#047857' : '#71717A';

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 21C8 15.5 13 12 24 12C35 12 40 15.5 40 21V23.5H8V21Z"
        fill={fillLid}
        stroke={strokeCol}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="23.5"
        width="30"
        height="16.5"
        rx="4"
        fill={fillBody}
        stroke={strokeCol}
        strokeWidth="1.75"
      />
      <rect
        x="20"
        y="20"
        width="8"
        height="9"
        rx="2.5"
        fill="#FFFFFF"
        stroke={strokeCol}
        strokeWidth="1.5"
      />
      <circle cx="24" cy="24.5" r="1.4" fill={strokeCol} />
    </svg>
  );
}

export function LeagueTrophySvg({
  tier,
  className = 'h-9 w-9',
}: {
  tier: 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';
  className?: string;
}) {
  const palette: Record<
    typeof tier,
    { fill: string; stroke: string }
  > = {
    bronze: { fill: '#B45309', stroke: '#78350F' },
    silver: { fill: '#64748B', stroke: '#334155' },
    gold: { fill: '#D97706', stroke: '#92400E' },
    emerald: { fill: '#059669', stroke: '#065F46' },
    diamond: { fill: '#1D4ED8', stroke: '#1E3A8A' },
  };
  const c = palette[tier];

  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 4L33 9.5V19.5C33 27.6 27.5 33.4 20 36.5C12.5 33.4 7 27.6 7 19.5V9.5L20 4Z"
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 12.5L22.2 17L27.2 17.7L23.6 21.2L24.5 26.1L20 23.7L15.5 26.1L16.4 21.2L12.8 17.7L17.8 17L20 12.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
