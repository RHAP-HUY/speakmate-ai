'use client';

import { useId } from 'react';

interface CompanionProps {
  mood?: 'happy' | 'excited' | 'fire' | 'proud';
  className?: string;
}

/**
 * "Nova" — Original SpeakMate AI Luminous Voice Companion.
 * A sleek futuristic floating holographic crystal orb with expressive LED visor eyes
 * and subtle acoustic waves — 100% original, modern Apple/Pixar-inspired identity.
 */
export function NovaCompanion({
  mood = 'happy',
  className = 'h-16 w-16',
}: CompanionProps) {
  const uid = useId().replace(/:/g, '');
  const shellId = `nova-shell-${uid}`;
  const visorId = `nova-visor-${uid}`;
  const glowId = `nova-glow-${uid}`;

  const palette =
    mood === 'fire'
      ? {
          stop1: '#FF9A3D',
          stop2: '#F97316',
          stop3: '#E11D48',
          eye: '#FDE047',
          wave: '#FB923C',
          halo: '#F59E0B',
        }
      : mood === 'proud'
        ? {
            stop1: '#A78BFA',
            stop2: '#6366F1',
            stop3: '#EC4899',
            eye: '#67E8F9',
            wave: '#C084FC',
            halo: '#FBBF24',
          }
        : mood === 'excited'
          ? {
              stop1: '#38BDF8',
              stop2: '#6366F1',
              stop3: '#8B5CF6',
              eye: '#5EEAD4',
              wave: '#38BDF8',
              halo: '#22D3EE',
            }
          : {
              stop1: '#60A5FA',
              stop2: '#4F46E5',
              stop3: '#7C3AED',
              eye: '#38BDF8',
              wave: '#818CF8',
              halo: '#38BDF8',
            };

  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={shellId}
          x1="20"
          y1="16"
          x2="108"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={palette.stop1} />
          <stop offset="52%" stopColor={palette.stop2} />
          <stop offset="100%" stopColor={palette.stop3} />
        </linearGradient>
        <linearGradient
          id={visorId}
          x1="34"
          y1="44"
          x2="94"
          y2="86"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palette.stop1} stopOpacity="0.34" />
          <stop offset="100%" stopColor={palette.stop2} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient luminous aura behind orb */}
      <circle cx="64" cy="62" r="54" fill={`url(#${glowId})`} />

      {/* Ground floating shadow */}
      <ellipse cx="64" cy="116" rx="28" ry="5" fill="#0F172A" fillOpacity="0.14" />

      {/* Floating Crown Halo for Proud / Victory mood */}
      {mood === 'proud' ? (
        <path
          d="M46 21L52 10L60 17L64 7L68 17L76 10L82 21H46Z"
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      ) : (
        /* Sleek Floating Acoustic Halo Ring */
        <ellipse
          cx="64"
          cy="17"
          rx="22"
          ry="4.8"
          stroke={palette.halo}
          strokeWidth="3"
          strokeOpacity="0.85"
        />
      )}

      {/* Subtle Side Voice Soundwaves */}
      <path
        d="M15 51C11.5 56 11.5 68 15 73"
        stroke={palette.wave}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.78"
      />
      <path
        d="M8.5 56C6.5 59.5 6.5 64.5 8.5 68"
        stroke={palette.wave}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />
      <path
        d="M113 51C116.5 56 116.5 68 113 73"
        stroke={palette.wave}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.78"
      />
      <path
        d="M119.5 56C121.5 59.5 121.5 64.5 119.5 68"
        stroke={palette.wave}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />

      {/* Sleek Crystal-Glass Orb Chassis */}
      <rect
        x="23"
        y="25"
        width="82"
        height="78"
        rx="39"
        fill={`url(#${shellId})`}
      />

      {/* Top-left Apple-style glass specular reflection */}
      <path
        d="M37 37C44 30 57 27 72 29"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
      />

      {/* Side acoustic pods */}
      <rect
        x="19"
        y="53"
        width="8"
        height="20"
        rx="4"
        fill="#FFFFFF"
        fillOpacity="0.92"
      />
      <rect
        x="101"
        y="53"
        width="8"
        height="20"
        rx="4"
        fill="#FFFFFF"
        fillOpacity="0.92"
      />

      {/* Deep Glossy Midnight Face Visor */}
      <rect
        x="33"
        y="42"
        width="62"
        height="42"
        rx="21"
        fill={`url(#${visorId})`}
        stroke="#FFFFFF"
        strokeOpacity="0.22"
        strokeWidth="2"
      />

      {/* Expressive Glowing LED Eyes */}
      {mood === 'excited' || mood === 'proud' ? (
        <>
          <path
            d="M45 62C47.5 56 54.5 56 57 62"
            stroke={palette.eye}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M71 62C73.5 56 80.5 56 83 62"
            stroke={palette.eye}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect x="46" y="53" width="11" height="16" rx="5.5" fill={palette.eye} />
          <rect x="71" y="53" width="11" height="16" rx="5.5" fill={palette.eye} />
          <circle cx="53" cy="57" r="2.2" fill="#FFFFFF" />
          <circle cx="78" cy="57" r="2.2" fill="#FFFFFF" />
        </>
      )}

      {/* Friendly LED Voice Smile / Mini Equalizer */}
      <path
        d="M57 72C60 76 68 76 71 72"
        stroke={palette.eye}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />

      {/* Bottom Rim Glow */}
      <path
        d="M46 95C54 99 74 99 82 95"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.35"
      />
    </svg>
  );
}

export function StreakFlameSvg({
  active = true,
  className = 'h-7 w-7',
}: {
  active?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`flame-o-${uid}`}
          x1="24"
          y1="4"
          x2="24"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
        <linearGradient
          id={`flame-i-${uid}`}
          x1="24"
          y1="16"
          x2="24"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <path
        d="M25.5 4C25.5 4 37 13.5 37 26.5C37 35.2 31.2 42 23.5 42C15.5 42 10 35.8 10 27.5C10 21.5 13.4 16.4 16.5 13.5C16.2 17.2 18.2 19.6 20 20.5C18.8 14.2 21.6 8.2 25.5 4Z"
        fill={active ? `url(#flame-o-${uid})` : '#CBD5E1'}
      />
      <path
        d="M24 17C24 17 31 23 31 30.2C31 35.6 27.6 39.5 23.5 39.5C19.2 39.5 16 35.9 16 31C16 26.8 18.4 23.7 20.2 22C20.2 24.4 21.5 25.6 22.6 26.1C21.9 22.5 22.8 19.2 24 17Z"
        fill={active ? `url(#flame-i-${uid})` : '#E2E8F0'}
      />
      <ellipse
        cx="23.5"
        cy="34.5"
        rx="3.8"
        ry="4.2"
        fill={active ? '#FFFBEB' : '#F8FAFC'}
      />
    </svg>
  );
}

export function GemSvg({ className = 'h-6 w-6' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`gem-g-${uid}`}
          x1="8"
          y1="8"
          x2="40"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <path d="M13 8H35L44 19L24 42L4 19L13 8Z" fill={`url(#gem-g-${uid})`} />
      <path d="M13 8H35L31 19H17L13 8Z" fill="#BAE6FD" fillOpacity="0.85" />
      <path d="M17 19H31L24 42L17 19Z" fill="#38BDF8" fillOpacity="0.75" />
      <path d="M4 19H17L24 42L4 19Z" fill="#2563EB" fillOpacity="0.45" />
    </svg>
  );
}

export function ShieldFreezeSvg({
  className = 'h-6 w-6',
}: {
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`sh-g-${uid}`}
          x1="10"
          y1="6"
          x2="38"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="55%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path
        d="M24 5L40 11.5V23.5C40 33.4 33.2 40.6 24 44C14.8 40.6 8 33.4 8 23.5V11.5L24 5Z"
        fill={`url(#sh-g-${uid})`}
        stroke="#0369A1"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 9.5L35.5 14.2V23.2C35.5 30.7 30.4 36.2 24 39V9.5Z"
        fill="#FFFFFF"
        fillOpacity="0.22"
      />
      <path
        d="M24 15V31M17 19L31 27M31 19L17 27"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TreasureChestSvg({
  state = 'locked',
  className = 'h-12 w-12',
}: {
  state?: 'locked' | 'ready' | 'opened';
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const gradStops =
    state === 'ready'
      ? ['#FDE047', '#F59E0B', '#D97706']
      : state === 'opened'
        ? ['#6EE7B7', '#10B981', '#047857']
        : ['#CBD5E1', '#94A3B8', '#64748B'];
  const strokeCol =
    state === 'ready' ? '#B45309' : state === 'opened' ? '#047857' : '#475569';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`chest-g-${uid}`}
          x1="12"
          y1="14"
          x2="52"
          y2="54"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={gradStops[0]} />
          <stop offset="50%" stopColor={gradStops[1]} />
          <stop offset="100%" stopColor={gradStops[2]} />
        </linearGradient>
      </defs>
      {state === 'ready' && (
        <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round">
          <path d="M32 4V10" />
          <path d="M13 10L17 14" />
          <path d="M51 10L47 14" />
        </g>
      )}
      <path
        d="M10 28C10 20 17 15 32 15C47 15 54 20 54 28V31H10V28Z"
        fill={gradStops[0]}
        stroke={strokeCol}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect
        x="11"
        y="31"
        width="42"
        height="23"
        rx="6"
        fill={`url(#chest-g-${uid})`}
        stroke={strokeCol}
        strokeWidth="2.5"
      />
      <rect
        x="19"
        y="17"
        width="5"
        height="36"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
      <rect
        x="40"
        y="17"
        width="5"
        height="36"
        fill="#FFFFFF"
        fillOpacity="0.45"
      />
      <rect
        x="26"
        y="26"
        width="12"
        height="13"
        rx="4"
        fill={state === 'ready' ? '#FEF08A' : '#FFFFFF'}
        stroke={strokeCol}
        strokeWidth="2.2"
      />
      <circle cx="32" cy="32.5" r="2.2" fill={strokeCol} />
    </svg>
  );
}

export function LeagueTrophySvg({
  tier,
  className = 'h-10 w-10',
}: {
  tier: 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const palette: Record<
    typeof tier,
    { c1: string; c2: string; stroke: string }
  > = {
    bronze: { c1: '#FBBF24', c2: '#B45309', stroke: '#92400E' },
    silver: { c1: '#F1F5F9', c2: '#64748B', stroke: '#475569' },
    gold: { c1: '#FDE047', c2: '#EA580C', stroke: '#B45309' },
    emerald: { c1: '#6EE7B7', c2: '#059669', stroke: '#047857' },
    diamond: { c1: '#67E8F9', c2: '#4F46E5', stroke: '#3730A3' },
  };
  const c = palette[tier];

  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`lg-g-${uid}`}
          x1="10"
          y1="6"
          x2="46"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={c.c1} />
          <stop offset="100%" stopColor={c.c2} />
        </linearGradient>
      </defs>
      <path
        d="M28 5L47 13V27C47 38.5 39 46.5 28 51C17 46.5 9 38.5 9 27V13L28 5Z"
        fill={`url(#lg-g-${uid})`}
        stroke={c.stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M28 10L42 16V26.5C42 35.3 36.2 41.7 28 45.5V10Z"
        fill="#FFFFFF"
        fillOpacity="0.22"
      />
      <path
        d="M28 17L31.1 23.3L38 24.3L33 29.2L34.2 36L28 32.8L21.8 36L23 29.2L18 24.3L24.9 23.3L28 17Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
