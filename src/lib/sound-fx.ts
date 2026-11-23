'use client';

const SOUND_MUTED_KEY = 'speakmate_sfx_muted_v1';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (isSoundMuted()) return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_MUTED_KEY, muted ? '1' : '0');
  } catch {
    // ignore storage errors
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = 'sine',
  peakGain = 0.12
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Crisp rising 2-note Duolingo-style chime for correct answers */
export function playCorrectSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 587.33, 0, 0.14, 'triangle', 0.14); // D5
    playTone(ctx, 880.0, 0.09, 0.24, 'triangle', 0.16); // A5
  } catch {
    // ignore audio restrictions
  }
}

/** Gentle soft double-boop for incorrect answers */
export function playWrongSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 260, 0, 0.12, 'sine', 0.11);
    playTone(ctx, 200, 0.11, 0.18, 'sine', 0.1);
  } catch {
    // ignore
  }
}

/** Subtle tactile click for word tiles & buttons */
export function playTapSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 520, 0, 0.045, 'sine', 0.055);
  } catch {
    // ignore
  }
}

/** Sparkling ascending fanfare when opening a Streak Reward Chest */
export function playChestOpenSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      playTone(ctx, n, idx * 0.075, 0.24, 'triangle', 0.13);
    });
  } catch {
    // ignore
  }
}

/** Celebratory chord fanfare when finishing a lesson & keeping the streak */
export function playVictoryFanfare(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 523.25, 0, 0.16, 'triangle', 0.13); // C5
    playTone(ctx, 659.25, 0.1, 0.16, 'triangle', 0.13); // E5
    playTone(ctx, 783.99, 0.2, 0.18, 'triangle', 0.14); // G5
    playTone(ctx, 1046.5, 0.3, 0.42, 'triangle', 0.16); // C6
  } catch {
    // ignore
  }
}
