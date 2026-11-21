import { AI_PERSONAS } from '@/lib/scenarios';

const ALLOWED_VOICES = new Set(AI_PERSONAS.map((p) => p.edgeVoice));

export function resolveEdgeVoice(requestedVoice?: string | null): string {
  if (requestedVoice && ALLOWED_VOICES.has(requestedVoice)) {
    return requestedVoice;
  }
  return AI_PERSONAS[0].edgeVoice;
}

export function speedToEdgeRate(speed?: number | null): string {
  const numeric = typeof speed === 'number' && Number.isFinite(speed) ? speed : 0.9;
  const clamped = Math.min(1.35, Math.max(0.65, numeric));
  const deltaPercent = Math.round((clamped - 1) * 100);
  return deltaPercent >= 0 ? `+${deltaPercent}%` : `${deltaPercent}%`;
}

export function sanitizeTextForTts(text: string): string {
  return text
    .replace(/[*_`#<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);
}
