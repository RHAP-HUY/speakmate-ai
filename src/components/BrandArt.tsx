'use client';

interface MascotProps {
  mood?: 'happy' | 'excited' | 'fire' | 'proud';
  className?: string;
}

/**
 * "Milo" — Bespoke SpeakMate AI friendly owl-companion vector mascot.
 * Designed with crisp geometric shapes and high-contrast Duolingo-grade charm.
 */
export function MascotOwl({ mood = 'happy', className = 'h-16 w-16' }: MascotProps) {
  const bellyColor =
    mood === 'fire' ? '#FFE4B5' : mood === 'proud' ? '#FEF3C7' : '#DCFCE7';
  const bodyMain =
    mood === 'fire' ? '#FF9600' : mood === 'proud' ? '#6366F1' : '#58CC02';
  const bodyShade =
    mood === 'fire' ? '#EA580C' : mood === 'proud' ? '#4F46E5' : '#46A302';

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Subtle ground shadow */}
      <ellipse cx="60" cy="111" rx="34" ry="6" fill="#0F172A" fillOpacity="0.1" />

      {/* Crown when proud */}
      {mood === 'proud' && (
        <path
          d="M40 22L46 8L55 16L60 5L65 16L74 8L80 22H40Z"
          fill="#FFC800"
          stroke="#D97706"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}

      {/* Ear tufts */}
      <path d="M27 33L18 16L42 25Z" fill={bodyShade} />
      <path d="M93 33L102 16L78 25Z" fill={bodyShade} />

      {/* Main rounded body */}
      <rect x="20" y="22" width="80" height="84" rx="40" fill={bodyMain} />
      <path
        d="M20 66C20 88.0914 37.9086 106 60 106C82.0914 106 100 88.0914 100 66V62C100 81 82 96 60 96C38 96 20 81 20 62V66Z"
        fill={bodyShade}
        fillOpacity="0.45"
      />

      {/* Wings */}
      <ellipse
        cx="19"
        cy="68"
        rx="10"
        ry="20"
        transform={mood === 'excited' ? 'rotate(-28 19 68)' : 'rotate(10 19 68)'}
        fill={bodyShade}
      />
      <ellipse
        cx="101"
        cy="68"
        rx="10"
        ry="20"
        transform={mood === 'excited' ? 'rotate(28 101 68)' : 'rotate(-10 101 68)'}
        fill={bodyShade}
      />

      {/* Belly patch */}
      <ellipse cx="60" cy="80" rx="24" ry="20" fill={bellyColor} />
      <path
        d="M48 76C51 79 54 79 57 76M63 76C66 79 69 79 72 76M55 86C58 89 62 89 65 86"
        stroke={bodyMain}
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />

      {/* Headset band for AI speaking buddy feel */}
      <path
        d="M21 53C21 31 38 16 60 16C82 16 99 31 99 53"
        stroke="#1CB0F6"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="13" y="47" width="11" height="20" rx="5.5" fill="#1899D6" />
      <rect x="96" y="47" width="11" height="20" rx="5.5" fill="#1899D6" />

      {/* Big expressive eyes */}
      <circle cx="44" cy="52" r="15" fill="#FFFFFF" />
      <circle cx="76" cy="52" r="15" fill="#FFFFFF" />

      {/* Pupils */}
      <circle cx="46" cy="52" r="7.5" fill="#0F172A" />
      <circle cx="74" cy="52" r="7.5" fill="#0F172A" />

      {/* Eye sparkles */}
      <circle cx="49" cy="48.5" r="2.8" fill="#FFFFFF" />
      <circle cx="77" cy="48.5" r="2.8" fill="#FFFFFF" />
      <circle cx="43" cy="55" r="1.4" fill="#FFFFFF" />
      <circle cx="71" cy="55" r="1.4" fill="#FFFFFF" />

      {/* Rosy cheeks */}
      <ellipse cx="32" cy="65" rx="5" ry="3" fill="#FB7185" fillOpacity="0.45" />
      <ellipse cx="88" cy="65" rx="5" ry="3" fill="#FB7185" fillOpacity="0.45" />

      {/* Beak */}
      <path
        d="M53 62C53 59 67 59 67 62L60 72L53 62Z"
        fill="#FFB800"
        stroke="#D97706"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Feet */}
      <ellipse cx="47" cy="106" rx="8" ry="4.5" fill="#F59E0B" />
      <ellipse cx="73" cy="106" rx="8" ry="4.5" fill="#F59E0B" />
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
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M25.5 4C25.5 4 37 13.5 37 26.5C37 35.2 31.2 42 23.5 42C15.5 42 10 35.8 10 27.5C10 21.5 13.4 16.4 16.5 13.5C16.2 17.2 18.2 19.6 20 20.5C18.8 14.2 21.6 8.2 25.5 4Z"
        fill={active ? '#FF9600' : '#CBD5E1'}
      />
      <path
        d="M24 17C24 17 31 23 31 30.2C31 35.6 27.6 39.5 23.5 39.5C19.2 39.5 16 35.9 16 31C16 26.8 18.4 23.7 20.2 22C20.2 24.4 21.5 25.6 22.6 26.1C21.9 22.5 22.8 19.2 24 17Z"
        fill={active ? '#FFC800' : '#E2E8F0'}
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
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 8H35L44 19L24 42L4 19L13 8Z" fill="#1CB0F6" />
      <path d="M13 8H35L31 19H17L13 8Z" fill="#7DD3FC" />
      <path d="M17 19H31L24 42L17 19Z" fill="#38BDF8" />
      <path d="M4 19H17L24 42L4 19Z" fill="#0284C7" />
      <path d="M31 19H44L24 42L31 19Z" fill="#0EA5E9" />
    </svg>
  );
}

export function ShieldFreezeSvg({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M24 5L40 11.5V23.5C40 33.4 33.2 40.6 24 44C14.8 40.6 8 33.4 8 23.5V11.5L24 5Z"
        fill="#38BDF8"
        stroke="#0284C7"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 9.5L35.5 14.2V23.2C35.5 30.7 30.4 36.2 24 39V9.5Z"
        fill="#7DD3FC"
        fillOpacity="0.6"
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
  const bodyFill =
    state === 'ready' ? '#F59E0B' : state === 'opened' ? '#10B981' : '#94A3B8';
  const lidFill =
    state === 'ready' ? '#FBBF24' : state === 'opened' ? '#34D399' : '#CBD5E1';
  const trimFill =
    state === 'ready' ? '#FFFBEB' : state === 'opened' ? '#D1FAE5' : '#E2E8F0';
  const strokeCol =
    state === 'ready' ? '#B45309' : state === 'opened' ? '#047857' : '#64748B';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Glow rays when ready */}
      {state === 'ready' && (
        <g stroke="#FBBF24" strokeWidth="3" strokeLinecap="round">
          <path d="M32 4V10" />
          <path d="M13 10L17 14" />
          <path d="M51 10L47 14" />
        </g>
      )}
      {/* Chest lid */}
      <path
        d="M10 28C10 20 17 15 32 15C47 15 54 20 54 28V31H10V28Z"
        fill={lidFill}
        stroke={strokeCol}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Chest body */}
      <rect
        x="11"
        y="31"
        width="42"
        height="23"
        rx="5"
        fill={bodyFill}
        stroke={strokeCol}
        strokeWidth="3"
      />
      {/* Vertical bands */}
      <rect x="19" y="17" width="5" height="36" fill={trimFill} fillOpacity="0.65" />
      <rect x="40" y="17" width="5" height="36" fill={trimFill} fillOpacity="0.65" />
      {/* Center lock buckle */}
      <rect
        x="26"
        y="26"
        width="12"
        height="13"
        rx="3.5"
        fill={state === 'ready' ? '#FEF08A' : '#FFFFFF'}
        stroke={strokeCol}
        strokeWidth="2.5"
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
  const palette: Record<
    typeof tier,
    { main: string; light: string; stroke: string }
  > = {
    bronze: { main: '#D97706', light: '#FBBF24', stroke: '#92400E' },
    silver: { main: '#94A3B8', light: '#E2E8F0', stroke: '#475569' },
    gold: { main: '#F59E0B', light: '#FDE047', stroke: '#B45309' },
    emerald: { main: '#10B981', light: '#6EE7B7', stroke: '#047857' },
    diamond: { main: '#0EA5E9', light: '#7DD3FC', stroke: '#0369A1' },
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
      <path
        d="M28 5L47 13V27C47 38.5 39 46.5 28 51C17 46.5 9 38.5 9 27V13L28 5Z"
        fill={c.main}
        stroke={c.stroke}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M28 10L42 16V26.5C42 35.3 36.2 41.7 28 45.5V10Z"
        fill={c.light}
        fillOpacity="0.45"
      />
      <path
        d="M28 17L31.1 23.3L38 24.3L33 29.2L34.2 36L28 32.8L21.8 36L23 29.2L18 24.3L24.9 23.3L28 17Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
