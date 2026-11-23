import { ThinkingLevel, type ThinkingConfig } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export type GeminiSpeedMode = 'realtime' | 'report';

const MODEL_COOLDOWN_MAP = new Map<string, number>();
let lastHealthyModel: string | null = null;

/**
 * Returns the ordered candidate models optimized for low latency.
 * Prioritizes:
 * 1. Last known fast/healthy model (sticky routing)
 * 2. Configured GEMINI_MODEL env var (default: gemini-3.5-flash-lite)
 * 3. Active low-latency Flash-Lite & Flash fallbacks
 * Cooled-down models (404 / timeout / unsupported) are pushed to the end.
 */
export function getOrderedGeminiModels(
  env: Record<string, string | undefined> = process.env
): string[] {
  const configured = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  const baseList = [
    ...(lastHealthyModel ? [lastHealthyModel] : []),
    configured,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
  ];

  const unique = Array.from(new Set(baseList.filter(Boolean)));
  const now = Date.now();

  const healthy = unique.filter((m) => (MODEL_COOLDOWN_MAP.get(m) ?? 0) <= now);
  const cooling = unique.filter((m) => (MODEL_COOLDOWN_MAP.get(m) ?? 0) > now);

  return [...healthy, ...cooling];
}

export function markModelHealthy(model: string): void {
  lastHealthyModel = model;
  MODEL_COOLDOWN_MAP.delete(model);
}

export function markModelCooldown(model: string, durationMs = 60_000): void {
  MODEL_COOLDOWN_MAP.set(model, Date.now() + durationMs);
  if (lastHealthyModel === model) {
    lastHealthyModel = null;
  }
}

export function getLastHealthyModel(): string | null {
  return lastHealthyModel;
}

export function resetModelHealthForTest(): void {
  MODEL_COOLDOWN_MAP.clear();
  lastHealthyModel = null;
}

export function isUnsupportedOrMissingModelError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? '');
  const lower = message.toLowerCase();

  return (
    lower.includes('404') ||
    lower.includes('not_found') ||
    lower.includes('no longer available') ||
    lower.includes('not supported for generatecontent') ||
    lower.includes('thinking level') ||
    lower.includes('invalid_argument')
  );
}

export function isTransientOverloadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? '');
  const lower = message.toLowerCase();

  return (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('502') ||
    lower.includes('504') ||
    lower.includes('econnreset')
  );
}

/**
 * Selects the fastest valid thinkingConfig supported by each Gemini model family.
 * - gemini-3.5-flash-lite & gemini-flash-lite-latest support MINIMAL thinking (fastest, ~0 thoughts).
 * - gemini-3.1-flash-lite defaults to 0 thoughts without needing thinkingConfig.
 * - gemini-2.5-* legacy models use thinkingBudget: 0.
 * - gemini-3.7/3.8/flash-latest reject MINIMAL (400), so they use LOW.
 */
export function getThinkingConfigForModel(
  model: string,
  mode: GeminiSpeedMode = 'realtime'
): ThinkingConfig | undefined {
  const m = model.toLowerCase();

  if (m.startsWith('gemini-2.5-')) {
    return { thinkingBudget: mode === 'report' ? 512 : 0 };
  }

  if (m.includes('3.1-flash-lite')) {
    return undefined;
  }

  if (m.includes('flash-lite')) {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }

  if (
    m.startsWith('gemini-3') ||
    m.includes('flash-latest') ||
    m.startsWith('gemini-4')
  ) {
    return { thinkingLevel: ThinkingLevel.LOW };
  }

  return undefined;
}
