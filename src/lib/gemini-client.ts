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
  const baseAttemptTimeoutMs =
    params.timeoutMs ?? (speedMode === 'report' ? 14_000 : 8_000);
  const totalBudgetMs = speedMode === 'report' ? 24_000 : 21_000;
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const ai = getCachedClient(candidate.key);

    for (const model of models) {
      const elapsed = Date.now() - startedAt;
      const remainingBudget = totalBudgetMs - elapsed;
      if (remainingBudget < 2_500) {
        break;
      }
      const attemptTimeoutMs = Math.min(baseAttemptTimeoutMs, remainingBudget);

      try {
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

        markModelHealthy(model);

        return {
          rawText,
          keySource: candidate.source,
          modelUsed: model,
          latencyMs: Date.now() - startedAt,
        };
      } catch (err) {
        lastError = err;

        // Invalid/revoked API key -> cool down this key immediately and move to next key
        if (isFatalGeminiKeyAuthError(err)) {
          if (candidate.source === 'shared') {
            markKeyCooldown(candidate.key, 5 * 60_000);
          }
          break;
        }

        // Per-model 429 quota -> cool down ONLY this model (each Gemini model has its own RPM quota!)
        if (isRetryableGeminiKeyError(err)) {
          markModelCooldown(model, 45_000);
          continue;
        }

        if (isUnsupportedOrMissingModelError(err)) {
          // Avoid retrying missing/unsupported models for 5 minutes
          markModelCooldown(model, 5 * 60_000);
        } else {
          // 503 UNAVAILABLE / timeout / transient spike -> cool down briefly and try next model
          markModelCooldown(model, 30_000);
        }
      }
    }

    // All models failed on this shared key -> briefly cool down key if multiple keys exist
    if (candidate.source === 'shared' && candidates.length > 1) {
      markKeyCooldown(candidate.key, 30_000);
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : 'Không thể nhận phản hồi từ Gemini.';
  throw new TutorHttpError(`Lỗi kết nối AI: ${message}`, 502);
}
