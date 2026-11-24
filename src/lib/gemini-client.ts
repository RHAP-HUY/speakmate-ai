import { GoogleGenAI, type Part, type Schema } from '@google/genai';
import { type NextRequest } from 'next/server';
import { decryptSecret, isServerEncryptionAvailable } from '@/lib/crypto';
import {
  buildCandidateKeys,
  checkSharedPoolRateLimit,
  isFatalGeminiKeyAuthError,
  isRetryableGeminiKeyError,
  markKeyCooldown,
} from '@/lib/gemini-keys';
import {
  getOrderedGeminiModels,
  getThinkingConfigForModel,
  isTransientOverloadError,
  isUnsupportedOrMissingModelError,
  markModelCooldown,
  markModelHealthy,
  type GeminiSpeedMode,
} from '@/lib/gemini-models';
import { readGoogleSession } from '@/lib/google-auth';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EnglishLevel, UserProfile } from '@/types';

const clientCache = new Map<string, GoogleGenAI>();

function getCachedClient(apiKey: string): GoogleGenAI {
  let client = clientCache.get(apiKey);
  if (!client) {
    if (clientCache.size >= 32) {
      const oldest = clientCache.keys().next().value;
      if (oldest) clientCache.delete(oldest);
    }
    client = new GoogleGenAI({ apiKey });
    clientCache.set(apiKey, client);
  }
  return client;
}

export type RequestProfileContext = Pick<
  UserProfile,
  'displayName' | 'englishLevel' | 'jobField' | 'hobbies'
>;

export interface ResolvedTutorRequestAuth {
  userId: string;
  userPersonalKey: string | null;
  profile: RequestProfileContext;
}

export class TutorHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function resolveTutorRequestAuth(
  request: NextRequest,
  profileOverride?: Partial<RequestProfileContext>
): Promise<ResolvedTutorRequestAuth> {
  let userId = 'local-demo-user';
  let userPersonalKey: string | null =
    request.headers.get('x-user-gemini-key')?.trim() || null;

  let profile: RequestProfileContext = {
    displayName: profileOverride?.displayName ?? 'Bạn',
    englishLevel:
      (profileOverride?.englishLevel as EnglishLevel) ?? 'A0-A1',
    jobField: profileOverride?.jobField ?? '',
    hobbies: profileOverride?.hobbies ?? [],
  };

  // Recognize direct Google OAuth session first
  const googleSession = await readGoogleSession();
  if (googleSession) {
    userId = googleSession.userId;
    if (!profileOverride?.displayName && googleSession.name) {
      profile = { ...profile, displayName: googleSession.name };
    }
    return { userId, userPersonalKey, profile };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new TutorHttpError('Không thể kết nối Supabase.', 500);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new TutorHttpError('Vui lòng đăng nhập để sử dụng AI Tutor.', 401);
    }

    userId = user.id;

    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('display_name, english_level, job_field, hobbies, api_key_mode')
      .eq('id', user.id)
      .maybeSingle();

    if (dbProfile) {
      profile = {
        displayName: dbProfile.display_name || profile.displayName,
        englishLevel:
          (dbProfile.english_level as EnglishLevel) || profile.englishLevel,
        jobField: dbProfile.job_field || profile.jobField,
        hobbies: Array.isArray(dbProfile.hobbies)
          ? dbProfile.hobbies
          : profile.hobbies,
      };

      if (
        dbProfile.api_key_mode === 'personal' &&
        !userPersonalKey &&
        isServerEncryptionAvailable()
      ) {
        const { data: keyRow } = await supabase
          .from('user_api_keys')
          .select('encrypted_gemini_key')
          .eq('user_id', user.id)
          .maybeSingle();

        if (keyRow?.encrypted_gemini_key) {
          try {
            userPersonalKey = decryptSecret(keyRow.encrypted_gemini_key);
          } catch {
            // Ignore malformed stored secret and fallback cleanly
          }
        }
      } else if (dbProfile.api_key_mode === 'system') {
        userPersonalKey = null;
      }
    }
  }

  return { userId, userPersonalKey, profile };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout (${timeoutMs}ms) khi gọi ${label}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface StaggeredRaceResult<T> {
  value: T;
  model: string;
}

/**
 * Staggered Hedged Parallel Racing (Google "The Tail at Scale"):
 * - Fires model #0 immediately at t=0.
 * - If model #0 succeeds before hedgeDelayMs, zero extra requests are sent.
 * - If model #0 fails early (e.g. 503 high demand), launches the next cluster immediately at 0ms.
 * - If model #0 is still slow after hedgeDelayMs, launches a hedged backup cluster in parallel
 *   (up to maxConcurrent in-flight) and resolves with whichever cluster succeeds first.
 */
export async function runStaggeredHedgedRace<T>(params: {
  models: string[];
  hedgeDelayMs: number;
  maxConcurrent?: number;
  totalBudgetMs: number;
  attempt: (model: string, remainingBudgetMs: number) => Promise<T>;
  isFatalKeyError?: (error: unknown) => boolean;
  onModelError?: (model: string, error: unknown) => void;
}): Promise<StaggeredRaceResult<T>> {
  const {
    models,
    hedgeDelayMs,
    maxConcurrent = 3,
    totalBudgetMs,
    attempt,
    isFatalKeyError,
    onModelError,
  } = params;

  if (models.length === 0) {
    throw new Error('Không có model AI khả dụng.');
  }

  const startedAt = Date.now();

  return new Promise<StaggeredRaceResult<T>>((resolve, reject) => {
    let nextIndex = 0;
    let inFlight = 0;
    let settled = false;
    let lastError: unknown = null;
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;
    let budgetTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
      if (budgetTimer) {
        clearTimeout(budgetTimer);
        budgetTimer = null;
      }
    };

    const finishResolve = (result: StaggeredRaceResult<T>) => {
      if (settled) return;
      settled = true;
      clearTimers();
      resolve(result);
    };

    const finishReject = (err: unknown) => {
      if (settled) return;
      settled = true;
      clearTimers();
      reject(err);
    };

    const scheduleNextHedge = () => {
      if (settled || hedgeTimer) return;
      if (nextIndex >= models.length || inFlight >= maxConcurrent) return;
      const remaining = totalBudgetMs - (Date.now() - startedAt);
      if (remaining < 2_500) return;

      hedgeTimer = setTimeout(() => {
        hedgeTimer = null;
        launchNext();
      }, hedgeDelayMs);
    };

    const launchNext = () => {
      if (settled) return;
      if (nextIndex >= models.length || inFlight >= maxConcurrent) return;
      const remaining = totalBudgetMs - (Date.now() - startedAt);
      if (remaining < 2_000) {
        if (inFlight === 0) {
          finishReject(lastError ?? new Error('Hết thời gian chờ kết nối AI.'));
        }
        return;
      }

      const model = models[nextIndex++];
      inFlight += 1;

      if (nextIndex < models.length && inFlight < maxConcurrent) {
        scheduleNextHedge();
      }

      attempt(model, remaining).then(
        (value) => {
          inFlight -= 1;
          finishResolve({ value, model });
        },
        (err) => {
          inFlight -= 1;
          lastError = err;
          onModelError?.(model, err);

          if (settled) return;

          if (isFatalKeyError?.(err)) {
            finishReject(err);
            return;
          }

          // Current model failed -> cancel waiting timer and launch backup immediately!
          if (hedgeTimer) {
            clearTimeout(hedgeTimer);
            hedgeTimer = null;
          }

          const left = totalBudgetMs - (Date.now() - startedAt);
          if (nextIndex < models.length && left >= 2_000) {
            launchNext();
          } else if (inFlight === 0) {
            finishReject(lastError);
          }
        }
      );
    };

    budgetTimer = setTimeout(() => {
      finishReject(
        lastError ?? new Error(`Timeout (${totalBudgetMs}ms) khi kết nối cụm AI.`)
      );
    }, totalBudgetMs);

    launchNext();
  });
}

export interface GeminiJsonCallResult {
  rawText: string;
  keySource: 'personal' | 'shared';
  modelUsed: string;
  latencyMs: number;
}

export async function generateGeminiJson(params: {
  userId: string;
  userPersonalKey: string | null;
  parts: Part[];
  systemInstruction?: string;
  responseSchema?: Schema;
  temperature?: number;
  maxOutputTokens?: number;
  speedMode?: GeminiSpeedMode;
  timeoutMs?: number;
  skipRateLimit?: boolean;
}): Promise<GeminiJsonCallResult> {
  const candidates = buildCandidateKeys(params.userPersonalKey);
  if (candidates.length === 0) {
    throw new TutorHttpError(
      'Chưa có Gemini API Key. Hãy cấu hình GEMINI_API_KEYS trên server hoặc nhập API Key cá nhân trong mục Cài đặt.',
      503
    );
  }

  if (!params.skipRateLimit && candidates[0].source === 'shared') {
    const limitCheck = checkSharedPoolRateLimit(params.userId);
    if (!limitCheck.allowed) {
      throw new TutorHttpError(
        'Bạn đã đạt giới hạn lượt gọi AI dùng chung trong giờ này. Hãy thử lại sau hoặc nhập Gemini API Key cá nhân miễn phí trong Cài đặt để nói không giới hạn!',
        429
      );
    }
  }

  const models = getOrderedGeminiModels();
  const speedMode = params.speedMode ?? 'realtime';
  const hasInlineAudio = params.parts.some((p) => Boolean(p.inlineData));
  const attemptCapMs =
    params.timeoutMs ??
    (speedMode === 'report' ? 15_000 : hasInlineAudio ? 13_500 : 10_000);
  const totalBudgetMs = speedMode === 'report' ? 24_000 : 21_500;
  const hedgeDelayMs =
    speedMode === 'report' ? 3_500 : hasInlineAudio ? 2_200 : 1_450;

  const startedAt = Date.now();
  let lastError: unknown = null;

  const invokeModel = async (
    ai: GoogleGenAI,
    model: string,
    attemptTimeoutMs: number
  ) => {
    const thinkingConfig = getThinkingConfigForModel(model, speedMode);
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: params.parts }],
        config: {
          ...(params.systemInstruction
            ? { systemInstruction: params.systemInstruction }
            : {}),
          responseMimeType: 'application/json',
          ...(params.responseSchema
            ? { responseSchema: params.responseSchema }
            : {}),
          temperature: params.temperature ?? 0.6,
          ...(params.maxOutputTokens
            ? { maxOutputTokens: params.maxOutputTokens }
            : {}),
          ...(thinkingConfig ? { thinkingConfig } : {}),
        },
      }),
      attemptTimeoutMs,
      model
    );
    const rawText = response.text;
    if (!rawText) {
      throw new Error('Gemini trả về nội dung trống.');
    }
    return rawText;
  };

  for (const candidate of candidates) {
    const elapsedBeforeKey = Date.now() - startedAt;
    const remainingForKey = totalBudgetMs - elapsedBeforeKey;
    if (remainingForKey < 2_500) break;

    const ai = getCachedClient(candidate.key);

    try {
      const winner = await runStaggeredHedgedRace<string>({
        models,
        hedgeDelayMs,
        maxConcurrent: speedMode === 'report' ? 2 : 3,
        totalBudgetMs: remainingForKey,
        isFatalKeyError: isFatalGeminiKeyAuthError,
        onModelError: (model, err) => {
          if (isFatalGeminiKeyAuthError(err)) return;
          if (isRetryableGeminiKeyError(err)) {
            markModelCooldown(model, 45_000);
          } else if (isUnsupportedOrMissingModelError(err)) {
            markModelCooldown(model, 5 * 60_000);
          } else if (isTransientOverloadError(err)) {
            markModelCooldown(model, 15_000);
          } else {
            markModelCooldown(model, 20_000);
          }
        },
        attempt: (model, remaining) =>
          invokeModel(ai, model, Math.min(attemptCapMs, remaining)),
      });

      markModelHealthy(winner.model);
      return {
        rawText: winner.value,
        keySource: candidate.source,
        modelUsed: winner.model,
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      lastError = err;
      if (isFatalGeminiKeyAuthError(err)) {
        if (candidate.source === 'shared') {
          markKeyCooldown(candidate.key, 5 * 60_000);
        }
        continue;
      }
      if (candidate.source === 'shared' && candidates.length > 1) {
        markKeyCooldown(candidate.key, 25_000);
      }
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : 'Không thể nhận phản hồi từ Gemini.';
  throw new TutorHttpError(`Lỗi kết nối AI: ${message}`, 502);
}
