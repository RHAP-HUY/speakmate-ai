import { Type, type Schema } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import {
  generateGeminiJson,
  resolveTutorRequestAuth,
  TutorHttpError,
} from '@/lib/gemini-client';
import { checkSlidingWindowRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/security';
import { sanitizePromptField } from '@/lib/tutor-prompt';
import {
  pickShuffledItems,
  SPEED_MATCH_QUESTIONS,
  type SpeedMatchQuestion,
} from '@/lib/game-data';

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
    const rl = checkSlidingWindowRateLimit({
      namespace: 'tutor-quiz',
      key: extractClientIp(request.headers),
      limit: 20,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Bạn tạo màn chơi AI quá nhanh. Vui lòng đợi vài giây nhé!' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    let body: {
      hobbies?: string[];
      jobField?: string;
      englishLevel?: string;
      customTopic?: string;
    };
    try {
      body = (await request.json()) as {
        hobbies?: string[];
        jobField?: string;
        englishLevel?: string;
        customTopic?: string;
      };
    } catch {
      return NextResponse.json(
        { error: 'Dữ liệu tạo bài tập JSON không hợp lệ.' },
        { status: 400 }
      );
    }

    const { userId, userPersonalKey, profile } = await resolveTutorRequestAuth(
      request,
      {
        englishLevel: (body.englishLevel as 'A0-A1' | 'A2-B1' | 'B2+') || undefined,
        jobField: body.jobField,
        hobbies: body.hobbies,
      }
    );

    const hobbiesText =
      sanitizePromptField(
        (body.hobbies && body.hobbies.length > 0
          ? body.hobbies
          : profile.hobbies
        ).join(', '),
        160
      ) || 'Du lịch, Cà phê, Công nghệ, Phim ảnh';
    const jobText =
      sanitizePromptField(body.jobField || profile.jobField, 80) ||
      'Nhân viên văn phòng / Sinh viên';
    const customTopic = sanitizePromptField(body.customTopic, 100);
    const level = body.englishLevel || profile.englishLevel || 'A0-A1';

    const prompt = customTopic
      ? `Generate 5 fun, practical spoken-English Speed Match quiz questions specifically about: "${customTopic}". Learner CEFR level: ${level}.`
      : `Generate 5 fun, practical spoken-English Speed Match quiz questions personalized for a Vietnamese learner whose hobbies are [${hobbiesText}], job/field is [${jobText}], and CEFR level is ${level}. Make every correct answer genuinely idiomatic spoken English, and make the 3 wrongOptions realistic Vietlish/word-for-word mistakes that learners often make.`;

    const result = await generateGeminiJson({
      userId,
      userPersonalKey,
      parts: [{ text: prompt }],
      systemInstruction:
        'You are SpeakMate, a dedicated interactive English speaking coach for Vietnamese learners. Always output crisp, natural spoken English and warm, concise Vietnamese prompts & phonetic reading guides.',
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
      const curatedFallback = pickShuffledItems(SPEED_MATCH_QUESTIONS, 5);
      return NextResponse.json({
        ok: true,
        topicTitleVi: customTopic
          ? `Luyện phản xạ nhanh · ${customTopic}`
          : 'Màn chơi Phản xạ Bản xứ tuyển chọn',
        questions: curatedFallback,
        meta: {
          modelUsed: 'curated-fallback',
          latencyMs: result.latencyMs,
          fallback: true,
        },
      });
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
        fallback: false,
      },
    });
  } catch (error) {
    if (error instanceof TutorHttpError && error.status < 500) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    // 99.99% uptime graceful fallback during upstream Gemini 503 traffic spikes
    const curatedFallback = pickShuffledItems(SPEED_MATCH_QUESTIONS, 5);
    return NextResponse.json({
      ok: true,
      topicTitleVi: 'Màn chơi Phản xạ Bản xứ tuyển chọn (Chế độ dự phòng nhanh)',
      questions: curatedFallback,
      meta: {
        modelUsed: 'curated-fallback',
        latencyMs: 0,
        fallback: true,
      },
    });
  }
}
