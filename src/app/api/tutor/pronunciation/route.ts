import { type Part } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import {
  generateGeminiJson,
  resolveTutorRequestAuth,
  TutorHttpError,
} from '@/lib/gemini-client';
import { AI_PERSONAS } from '@/lib/scenarios';
import {
  buildPronunciationPracticePrompt,
  parsePronunciationPracticeOutput,
  PRONUNCIATION_PRACTICE_SCHEMA,
} from '@/lib/tutor-prompt';
import type { EnglishLevel, UserProfile } from '@/types';

export const maxDuration = 30;

interface PronunciationPayload {
  targetSentence: string;
  personaId?: string;
  accentLabel?: string;
  englishLevel?: EnglishLevel;
  profileOverride?: Partial<
    Pick<UserProfile, 'displayName' | 'englishLevel' | 'jobField' | 'hobbies'>
  >;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Cần gửi tệp âm thanh micro để chấm điểm phát âm.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const rawJson = formData.get('payload');
    const audioFile = formData.get('audio');

    if (typeof rawJson !== 'string') {
      return NextResponse.json(
        { error: 'Thiếu dữ liệu câu mẫu cần chấm điểm.' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawJson) as PronunciationPayload;
    const targetSentence = payload.targetSentence?.trim() ?? '';
    if (!targetSentence) {
      return NextResponse.json(
        { error: 'Câu mẫu không được để trống.' },
        { status: 400 }
      );
    }

    if (!(audioFile instanceof Blob) || audioFile.size === 0) {
      return NextResponse.json(
        { error: 'Chưa nhận được âm thanh ghi âm.' },
        { status: 400 }
      );
    }

    if (audioFile.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Đoạn ghi âm quá dài (tối đa 8MB).' },
        { status: 413 }
      );
    }

    const { userId, userPersonalKey, profile } = await resolveTutorRequestAuth(
      request,
      payload.profileOverride
    );

    const persona =
      AI_PERSONAS.find((p) => p.id === payload.personaId) ?? AI_PERSONAS[0];
    const accentLabel = payload.accentLabel?.trim() || persona.accentLabel;
    const englishLevel = payload.englishLevel || profile.englishLevel;

    const arrayBuf = await audioFile.arrayBuffer();
    const audioBase64 = Buffer.from(arrayBuf).toString('base64');
    const audioMimeType = audioFile.type || 'audio/webm';

    const promptText = buildPronunciationPracticePrompt({
      targetSentence,
      accentLabel,
      englishLevel,
    });

    const parts: Part[] = [
      {
        inlineData: {
          mimeType: audioMimeType,
          data: audioBase64,
        },
      },
      { text: promptText },
    ];

    const result = await generateGeminiJson({
      userId,
      userPersonalKey,
      parts,
      responseSchema: PRONUNCIATION_PRACTICE_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 750,
      speedMode: 'realtime',
      timeoutMs: 15_000,
    });

    const assessment = parsePronunciationPracticeOutput(
      result.rawText,
      targetSentence
    );

    return NextResponse.json({
      assessment,
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
        : 'Không thể chấm điểm phát âm lúc này.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
