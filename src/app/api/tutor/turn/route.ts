import { GoogleGenAI, type Part } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import { decryptSecret, isServerEncryptionAvailable } from '@/lib/crypto';
import {
  buildCandidateKeys,
  checkSharedPoolRateLimit,
  isRetryableGeminiKeyError,
  markKeyCooldown,
} from '@/lib/gemini-keys';
import { AI_PERSONAS, SCENARIOS } from '@/lib/scenarios';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  buildConversationTurnPrompt,
  buildTutorSystemInstruction,
  parseTutorTurnOutput,
  TUTOR_RESPONSE_SCHEMA,
} from '@/lib/tutor-prompt';
import type { EnglishLevel, TutorMessage, UserProfile } from '@/types';

interface TurnPayload {
  scenarioId: string;
  personaId: string;
  isStart?: boolean;
  userText?: string;
  history: Pick<TutorMessage, 'role' | 'englishText'>[];
  profileOverride?: Partial<
    Pick<UserProfile, 'displayName' | 'englishLevel' | 'jobField' | 'hobbies'>
  >;
}

function getFallbackModels(): string[] {
  const primary =
    process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';
  const list = [
    primary,
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
  ];
  return Array.from(new Set(list));
}

export async function POST(request: NextRequest) {
  try {
    let payload: TurnPayload;
    let audioBase64: string | null = null;
    let audioMimeType = 'audio/webm';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const rawJson = formData.get('payload');
      if (typeof rawJson !== 'string') {
        return NextResponse.json(
          { error: 'Thiếu dữ liệu payload.' },
          { status: 400 }
        );
      }
      payload = JSON.parse(rawJson) as TurnPayload;
      const audioFile = formData.get('audio');
      if (audioFile instanceof Blob && audioFile.size > 0) {
        if (audioFile.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: 'Đoạn ghi âm quá dài (tối đa 10MB).' },
            { status: 413 }
          );
        }
        const arrayBuf = await audioFile.arrayBuffer();
        audioBase64 = Buffer.from(arrayBuf).toString('base64');
        audioMimeType = audioFile.type || 'audio/webm';
      }
    } else {
      payload = (await request.json()) as TurnPayload;
    }

    let userId = 'local-demo-user';
    let userPersonalKey: string | null =
      request.headers.get('x-user-gemini-key')?.trim() || null;

    let profile: Pick<
      UserProfile,
      'displayName' | 'englishLevel' | 'jobField' | 'hobbies'
    > = {
      displayName: payload.profileOverride?.displayName ?? 'Bạn',
      englishLevel:
        (payload.profileOverride?.englishLevel as EnglishLevel) ?? 'A0-A1',
      jobField: payload.profileOverride?.jobField ?? '',
      hobbies: payload.profileOverride?.hobbies ?? [],
    };

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        return NextResponse.json(
          { error: 'Không thể kết nối Supabase.' },
          { status: 500 }
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Vui lòng đăng nhập để sử dụng AI Tutor.' },
          { status: 401 }
        );
      }

      userId = user.id;

      const { data: dbProfile } = await supabase
        .from('profiles')
        .select(
          'display_name, english_level, job_field, hobbies, api_key_mode'
        )
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

    const candidates = buildCandidateKeys(userPersonalKey);
    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            'Chưa có Gemini API Key. Hãy cấu hình GEMINI_API_KEYS trên server hoặc nhập API Key cá nhân trong mục Cài đặt.',
        },
        { status: 503 }
      );
    }

    if (candidates[0].source === 'shared') {
      const limitCheck = checkSharedPoolRateLimit(userId);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error:
              'Bạn đã đạt giới hạn lượt gọi AI dùng chung trong giờ này. Hãy thử lại sau hoặc nhập Gemini API Key cá nhân miễn phí trong Cài đặt để nói không giới hạn!',
          },
          { status: 429 }
        );
      }
    }

    const scenario =
      SCENARIOS.find((s) => s.id === payload.scenarioId) ?? SCENARIOS[0];
    const persona =
      AI_PERSONAS.find((p) => p.id === payload.personaId) ?? AI_PERSONAS[0];

    const systemInstruction = buildTutorSystemInstruction({
      profile,
      persona,
      scenario,
    });

    const promptText = buildConversationTurnPrompt({
      history: payload.history ?? [],
      userText: payload.userText,
      isStart: payload.isStart,
      isAudio: Boolean(audioBase64),
      displayName: profile.displayName,
    });

    const parts: Part[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: audioBase64,
        },
      });
    }
    parts.push({ text: promptText });

    const models = getFallbackModels();
    let lastError: unknown = null;

    for (const candidate of candidates) {
      const ai = new GoogleGenAI({ apiKey: candidate.key });

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: TUTOR_RESPONSE_SCHEMA,
              temperature: 0.7,
            },
          });

          const rawText = response.text;
          if (!rawText) {
            throw new Error('Gemini trả về nội dung trống.');
          }

          const parsed = parseTutorTurnOutput(rawText);
          return NextResponse.json({
            ...parsed,
            meta: {
              keySource: candidate.source,
              modelUsed: model,
            },
          });
        } catch (err) {
          lastError = err;
          if (isRetryableGeminiKeyError(err)) {
            if (candidate.source === 'shared') {
              markKeyCooldown(candidate.key);
            }
            // Break inner model loop to switch to next API key in pool
            break;
          }
          // Non-key error (e.g. model name unavailable) -> try fallback model
        }
      }
    }

    const message =
      lastError instanceof Error
        ? lastError.message
        : 'Không thể nhận phản hồi từ Gemini.';
    return NextResponse.json(
      {
        error: `Lỗi kết nối AI: ${message}`,
      },
      { status: 502 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Lỗi máy chủ khi xử lý hội thoại.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
