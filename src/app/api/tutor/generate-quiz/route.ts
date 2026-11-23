import { Type, type Schema } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import {
  generateGeminiJson,
  resolveTutorRequestAuth,
  TutorHttpError,
} from '@/lib/gemini-client';
import type { SpeedMatchQuestion } from '@/lib/game-data';

export const maxDuration = 30;

const AI_QUIZ_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    topicTitleVi: {
      type: Type.STRING,
      description: 'Short catchy Vietnamese title for this custom quiz round.',
    },
    questions: {
      type: Type.ARRAY,
      description: 'Exactly 5 natural English speaking multiple-choice questions.',
      items: {
        type: Type.OBJECT,
        properties: {
          promptVi: {
            type: Type.STRING,
            description: 'Vietnamese speaking situation prompt (what the learner wants to say).',
          },
          contextVi: {
            type: Type.STRING,
            description: 'Short 3-6 word context in Vietnamese.',
          },
          correctEn: {
            type: Type.STRING,
            description: 'The most natural idiomatic native English sentence.',
          },
          phonetic: {
            type: Type.STRING,
            description: 'Easy Vietnamese-style phonetic guide for reading aloud.',
          },
          wrongOptions: {
            type: Type.ARRAY,
            description: 'Exactly 3 unnatural Vietlish or awkward English distractors.',
            items: { type: Type.STRING },
          },
          tipVi: {
            type: Type.STRING,
            description: 'One short memorable Vietnamese coaching tip.',
          },
        },
        required: [
          'promptVi',
          'contextVi',
          'correctEn',
          'phonetic',
          'wrongOptions',
          'tipVi',
        ],
      },
    },
  },
  required: ['topicTitleVi', 'questions'],
};

interface RawAiQuestion {
  promptVi?: string;
  contextVi?: string;
  correctEn?: string;
  phonetic?: string;
  wrongOptions?: string[];
  tipVi?: string;
}

export function sanitizeGeneratedQuizQuestions(
  rawList: unknown
): SpeedMatchQuestion[] {
  if (!Array.isArray(rawList)) return [];
  const valid: SpeedMatchQuestion[] = [];
  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i] as RawAiQuestion;
    const promptVi = (item?.promptVi || '').trim();
    const contextVi = (item?.contextVi || 'Tình huống thực tế').trim();
    const correctEn = (item?.correctEn || '').trim();
    const phonetic = (item?.phonetic || '').trim();
    const tipVi = (item?.tipVi || 'Cụm này người bản xứ dùng cực kỳ tự nhiên!').trim();
    const wrongs = Array.isArray(item?.wrongOptions)
      ? item.wrongOptions
          .map((w) => String(w || '').trim())
          .filter((w) => w.length > 0 && w.toLowerCase() !== correctEn.toLowerCase())
          .slice(0, 3)
      : [];

    if (!promptVi || !correctEn || wrongs.length < 3) continue;

    valid.push({
      id: `ai-q-${Date.now()}-${i}`,
      category: 'daily',
      promptVi,
      contextVi,
      correctEn,
      phonetic: phonetic || correctEn,
      options: [correctEn, ...wrongs],
      tipVi,
    });
  }
  return valid.slice(0, 5);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      hobbies?: string[];
      jobField?: string;
      englishLevel?: string;
      customTopic?: string;
    };

    const { userId, userPersonalKey, profile } = await resolveTutorRequestAuth(
      request,
      {
        englishLevel: (body.englishLevel as 'A0-A1' | 'A2-B1' | 'B2+') || undefined,
        jobField: body.jobField,
        hobbies: body.hobbies,
      }
    );

    const hobbiesText =
      (body.hobbies && body.hobbies.length > 0
        ? body.hobbies
        : profile.hobbies
      ).join(', ') || 'Du lịch, Cà phê, Công nghệ, Phim ảnh';
    const jobText = body.jobField?.trim() || profile.jobField || 'Nhân viên văn phòng / Sinh viên';
    const customTopic = body.customTopic?.trim();
    const level = body.englishLevel || profile.englishLevel || 'A0-A1';

    const prompt = customTopic
      ? `Generate 5 fun, practical spoken-English Speed Match quiz questions specifically about: "${customTopic}". Learner CEFR level: ${level}.`
      : `Generate 5 fun, practical spoken-English Speed Match quiz questions personalized for a Vietnamese learner whose hobbies are [${hobbiesText}], job/field is [${jobText}], and CEFR level is ${level}. Make every correct answer genuinely idiomatic spoken English, and make the 3 wrongOptions realistic Vietlish/word-for-word mistakes that learners often make.`;

    const result = await generateGeminiJson({
      userId,
      userPersonalKey,
      parts: [{ text: prompt }],
      systemInstruction:
        'You are SpeakMate AI, a world-class Duolingo-style English learning designer for Vietnamese learners. Always output crisp, natural spoken English and warm, concise Vietnamese prompts & phonetic reading guides.',
      responseSchema: AI_QUIZ_SCHEMA,
      temperature: 0.85,
      maxOutputTokens: 1100,
      speedMode: 'realtime',
      timeoutMs: 9_000,
    });

    const parsed = JSON.parse(result.rawText) as {
      topicTitleVi?: string;
      questions?: unknown;
    };
    const questions = sanitizeGeneratedQuizQuestions(parsed.questions);
    if (questions.length < 3) {
      return NextResponse.json(
        { error: 'AI chưa tạo đủ bộ câu hỏi. Vui lòng thử lại!' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      topicTitleVi:
        parsed.topicTitleVi?.trim() ||
        (customTopic ? `Chủ đề: ${customTopic}` : 'Màn chơi AI theo sở thích của bạn'),
      questions,
      meta: {
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Không thể tạo màn chơi AI lúc này.',
      },
      { status: 500 }
    );
  }
}
