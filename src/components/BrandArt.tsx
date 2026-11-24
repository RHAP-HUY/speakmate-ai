'use client';

interface CompanionProps {
  mood?: 'happy' | 'excited' | 'fire' | 'proud';
  className?: string;
}

/**
 * Editorial Dialogue Leaf & Open Book Monogram — SpeakMate Brand Mark.
 * Crafted in warm forest green & terracotta clay on cream paper — zero AI bot clichés.
 */
export function NovaCompanion({
  mood = 'happy',
  className = 'h-9 w-9',
}: CompanionProps) {
  const leafColor = mood === 'fire' ? '#C2410C' : '#14532D';
  const dotColor = mood === 'proud' ? '#D97706' : '#C2410C';

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="11"
        fill="#F3EFE6"
        stroke="#D6CFC2"
        strokeWidth="1.25"
      />
      {/* Open dialogue quote / book pages */}
      <path
        d="M13 16.5C13 14.567 14.567 13 16.5 13H23V31.5C23 31.5 19.5 29.5 16 29.5H14.5C13.672 29.5 13 28.828 13 28V16.5Z"
        fill={leafColor}
      />
      <path
        d="M35 16.5C35 14.567 33.433 13 31.5 13H25V31.5C25 31.5 28.5 29.5 32 29.5H33.5C34.328 29.5 35 28.828 35 28V16.5Z"
        fill={leafColor}
        fillOpacity="0.82"
      />
      {/* Terracotta accent dot */}
      <circle cx="24" cy="35.5" r="2.6" fill={dotColor} />
    </svg>
  );
}

/**
 * Hand-crafted warm editorial human tutor portraits (Monocle / Headspace / Cambly style).
 */
export function TutorAvatar({
  personaId,
  className = 'h-11 w-11',
}: {
  personaId: string;
  className?: string;
}) {
  const presets: Record<
    string,
    {
      bg: string;
      skin: string;
      hair: string;
      shirt: string;
      longHair?: boolean;
      glasses?: boolean;
    }
  > = {
    'emma-us': {
      bg: '#EDE5D8',
      skin: '#F3C6A5',
      hair: '#5C3A21',
      shirt: '#14532D',
      longHair: true,
    },
    'andrew-us': {
      bg: '#E4E9E2',
      skin: '#EAC09E',
      hair: '#292524',
      shirt: '#C2410C',
      glasses: true,
    },
    'sonia-uk': {
      bg: '#F2E4DC',
      skin: '#F6D2B8',
      hair: '#8C4A27',
      shirt: '#1C1917',
      longHair: true,
    },
    'ryan-uk': {
      bg: '#E6E4DD',
      skin: '#E5B895',
      hair: '#3F3A36',
      shirt: '#1E3A2F',
    },
    'natasha-au': {
      bg: '#EFE9DB',
      skin: '#F2C5A0',
      hair: '#B47B38',
      shirt: '#9A3412',
      longHair: true,
    },
    'clara-ca': {
      bg: '#E8ECE6',
      skin: '#F4CCB0',
      hair: '#3B2820',
      shirt: '#365314',
      longHair: true,
      glasses: true,
    },
  };

  const p = presets[personaId] ?? presets['emma-us'];

  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} rounded-full overflow-hidden shrink-0`}
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r="28" fill={p.bg} />
      {p.longHair && (
        <path
          d="M15 24C15 15.5 20.8 11 28 11C35.2 11 41 15.5 41 24V39H15V24Z"
          fill={p.hair}
        />
      )}
      {/* Shoulders / Collar */}
      <path
        d="M11 56C12.8 45.5 19.2 41 28 41C36.8 41 43.2 45.5 45 56H11Z"
        fill={p.shirt}
      />
      {/* Neck */}
      <rect x="24.5" y="33" width="7" height="10" rx="3.5" fill={p.skin} />
      {/* Head */}
      <rect x="18.5" y="15" width="19" height="22" rx="9.5" fill={p.skin} />
      {/* Hair Crown */}
      <path
        d="M18 23C18 16.2 22.4 12.5 28 12.5C33.6 12.5 38 16.2 38 23C35.5 19.8 31.8 18.5 28 18.5C24.2 18.5 20.5 19.8 18 23Z"
        fill={p.hair}
      />
      {/* Eyes */}
      <circle cx="24.5" cy="25.5" r="1.3" fill="#1C1917" />
      <circle cx="31.5" cy="25.5" r="1.3" fill="#1C1917" />
      {p.glasses && (
        <g stroke="#1C1917" strokeWidth="1.2">
          <circle cx="24.5" cy="25.5" r="3.2" />
          <circle cx="31.5" cy="25.5" r="3.2" />
          <path d="M27.7 25.5H28.3" />
        </g>
      )}
      {/* Warm subtle smile */}
      <path
        d="M25.5 30.8C26.8 32 29.2 32 30.5 30.8"
        stroke="#7C4A32"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
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
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12.8 2.4C12.8 2.4 18.5 7 18.5 13.2C18.5 17.5 15.6 21 11.8 21C7.9 21 5.2 17.9 5.2 13.8C5.2 10.8 6.9 8.3 8.4 6.9C8.3 8.7 9.2 9.9 10.1 10.4C9.5 7.3 10.9 4.4 12.8 2.4Z"
        fill={active ? '#C2410C' : '#D6CFC2'}
      />
      <path
        d="M12 9.2C12 9.2 15.2 12 15.2 15.3C15.2 17.8 13.6 19.6 11.8 19.6C9.8 19.6 8.3 17.9 8.3 15.7C8.3 13.8 9.8 12.2 12 9.2Z"
        fill={active ? '#F59E0B' : '#E7E2D8'}
      />
    </svg>
  );
}

export function GemSvg({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M6.5 4H17.5L21 9.5L12 20L3 9.5L6.5 4Z" fill="#14532D" />
      <path
        d="M6.5 4H17.5L15.2 9.5H8.8L6.5 4Z"
        fill="#86EFAC"
        fillOpacity="0.6"
      />
    </svg>
  );
}

export function ShieldFreezeSvg({
  className = 'h-4 w-4',
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
        fill="#475569"
      />
      <path
        d="M12 7.5V16.5M8.5 9.5L15.5 14.5M15.5 9.5L8.5 14.5"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TreasureChestSvg({
  state = 'locked',
  className = 'h-8 w-8',
}: {
  state?: 'locked' | 'ready' | 'opened';
  className?: string;
}) {
  const fillBody =
    state === 'ready'
      ? '#C2410C'
      : state === 'opened'
        ? '#14532D'
        : '#A8A29E';
  const fillLid =
    state === 'ready'
      ? '#EA580C'
      : state === 'opened'
        ? '#166534'
        : '#D6D3D1';
  const strokeCol =
    state === 'ready' ? '#7C2D12' : state === 'opened' ? '#0F3F22' : '#78716C';

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
        strokeWidth="1.6"
      />
      <rect
        x="9"
        y="23.5"
        width="30"
        height="16.5"
        rx="3.5"
        fill={fillBody}
        stroke={strokeCol}
        strokeWidth="1.6"
      />
      <rect
        x="20.5"
        y="20"
        width="7"
        height="8.5"
        rx="2"
        fill="#FBF9F5"
        stroke={strokeCol}
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function LeagueTrophySvg({
  tier,
  className = 'h-8 w-8',
}: {
  tier: 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';
  className?: string;
}) {
  const palette: Record<typeof tier, { fill: string; stroke: string }> = {
    bronze: { fill: '#9A3412', stroke: '#7C2D12' },
    silver: { fill: '#57534E', stroke: '#292524' },
    gold: { fill: '#B45309', stroke: '#78350F' },
    emerald: { fill: '#14532D', stroke: '#0F3F22' },
    diamond: { fill: '#1C1917', stroke: '#0C0A09' },
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
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 12.5L22.2 17L27.2 17.7L23.6 21.2L24.5 26.1L20 23.7L15.5 26.1L16.4 21.2L12.8 17.7L17.8 17L20 12.5Z"
        fill="#FBF9F5"
      />
    </svg>
  );
}
