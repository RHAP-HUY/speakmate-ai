import { type Part } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import {
  generateGeminiJson,
  resolveTutorRequestAuth,
  TutorHttpError,
} from '@/lib/gemini-client';
import { AI_PERSONAS, SCENARIOS } from '@/lib/scenarios';
import {
  buildConversationTurnPrompt,
  buildTutorSystemInstruction,
  parseTutorTurnOutput,
  TUTOR_RESPONSE_SCHEMA,
} from '@/lib/tutor-prompt';
import type { TutorMessage, UserProfile } from '@/types';

export const maxDuration = 30;

interface TurnPayload {
  scenarioId: string;
  personaId: string;
  customTopic?: string;
  isStart?: boolean;
  userText?: string;
  history: Pick<TutorMessage, 'role' | 'englishText'>[];
  profileOverride?: Partial<
    Pick<UserProfile, 'displayName' | 'englishLevel' | 'jobField' | 'hobbies'>
  >;
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

    const { userId, userPersonalKey, profile } = await resolveTutorRequestAuth(
      request,
      payload.profileOverride
    );

    const baseScenario =
      SCENARIOS.find((s) => s.id === payload.scenarioId) ?? SCENARIOS[0];
    const cleanCustomTopic = payload.customTopic?.trim().slice(0, 140);
    const scenario = cleanCustomTopic
      ? {
          ...baseScenario,
          titleVi: cleanCustomTopic,
          titleEn: cleanCustomTopic,
          starterContext: `You are a friendly native English speaker roleplaying this custom real-life topic chosen by the learner: "${cleanCustomTopic}". Greet them warmly, jump right into the roleplay, and keep turns concise and natural.`,
        }
      : baseScenario;
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

    const result = await generateGeminiJson({
      userId,
      userPersonalKey,
      parts,
      systemInstruction,
      responseSchema: TUTOR_RESPONSE_SCHEMA,
      temperature: 0.65,
      maxOutputTokens: audioBase64 ? 950 : 650,
      speedMode: 'realtime',
      timeoutMs: audioBase64 ? 15_000 : 12_000,
    });

    const parsed = parseTutorTurnOutput(result.rawText);

    return NextResponse.json({
      ...parsed,
      pronunciation: audioBase64 ? parsed.pronunciation ?? null : null,
      meta: {
        keySource: result.keySource,
        modelUsed: result.modelUsed,
        latencyMs: result.latencyMs,
      },
    });
  } catch (error) {
    if (error instanceof TutorHttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : 'Lỗi máy chủ khi xử lý hội thoại.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
