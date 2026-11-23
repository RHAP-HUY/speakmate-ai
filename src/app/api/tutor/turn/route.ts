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

    try {
      const result = await generateGeminiJson({
        userId,
        userPersonalKey,
        parts,
        systemInstruction,
        responseSchema: TUTOR_RESPONSE_SCHEMA,
        temperature: 0.65,
        maxOutputTokens: audioBase64 ? 950 : 650,
        speedMode: 'realtime',
        timeoutMs: audioBase64 ? 11_000 : 6_500,
      });

      const parsed = parseTutorTurnOutput(result.rawText);

      return NextResponse.json({
        ...parsed,
        pronunciation: audioBase64 ? parsed.pronunciation ?? null : null,
        meta: {
          keySource: result.keySource,
          modelUsed: result.modelUsed,
          latencyMs: result.latencyMs,
          fallback: false,
        },
      });
    } catch (aiErr) {
      if (aiErr instanceof TutorHttpError && aiErr.status < 500) {
        throw aiErr;
      }
      // Graceful conversational fallback for text/greeting turns during upstream Google 503 waves
      if (!audioBase64) {
        const learnerName = profile.displayName?.trim() || 'bạn';
        const isStart = Boolean(payload.isStart);
        const userSaid = (payload.userText || '').trim();
        const fallbackTurn = isStart
          ? {
              userTranscript: '',
              naturalRewrite: null,
              coachingTip:
                'Mẹo nhỏ: Hãy trả lời ngắn gọn, tự nhiên 1–2 câu như đang nói chuyện thật nhé!',
              aiReplyEn: `Hey ${learnerName}! Welcome to "${scenario.titleEn}". How's it going today — ready to jump right in?`,
              aiReplyVi: `Chào ${learnerName}! Chào mừng đến với tình huống "${scenario.titleVi}". Hôm nay bạn thế nào — sẵn sàng trò chuyện luôn nhé?`,
              replyHints: [
                {
                  en: "I'm doing great, thanks! Let's get started.",
                  vi: 'Mình khỏe lắm, cảm ơn bạn! Bắt đầu luôn nhé.',
                  phonetic: 'aim du-ing grayt, thanks! lets get star-tid',
                },
                {
                  en: "Pretty good! Could we start slow today?",
                  vi: 'Khá ổn! Hôm nay mình nói chậm một chút nhé?',
                  phonetic: 'pri-ti gud! kud wi start slou tu-day?',
                },
                {
                  en: "I'm excited to practice this topic with you!",
                  vi: 'Mình rất hào hứng luyện chủ đề này cùng bạn!',
                  phonetic: 'aim ik-sai-tid tu prak-tis this to-pik with yu!',
                },
              ],
            }
          : {
              userTranscript: userSaid,
              naturalRewrite: userSaid || null,
              coachingTip:
                'Cụm máy chủ Gemini đang cao điểm thoáng qua — Nova đã giữ nhịp hội thoại giúp bạn, hãy tiếp tục trả lời nhé!',
              aiReplyEn: `Got it, ${learnerName}! That sounds clear. Could you tell me a bit more about what you'd prefer next?`,
              aiReplyVi: `Rõ rồi ${learnerName} ơi! Nghe rất ổn. Bạn có thể chia sẻ thêm chút nữa điều bạn muốn tiếp theo không?`,
              replyHints: [
                {
                  en: 'Sure! What do you recommend?',
                  vi: 'Chắc chắn rồi! Bạn gợi ý gì nào?',
                  phonetic: 'shur! wat du yu re-ko-mend?',
                },
                {
                  en: "Let's keep going — I'd love to try something new.",
                  vi: 'Tiếp tục nhé — mình muốn thử điều mới mẻ.',
                  phonetic: 'lets kip gou-ing — aid lav tu trai sam-thing niu',
                },
                {
                  en: 'Sounds good to me! How much does it cost?',
                  vi: 'Nghe hợp lý đấy! Giá bao nhiêu vậy bạn?',
                  phonetic: 'saunz gud tu mi! hau mach daz it kost?',
                },
              ],
            };

        return NextResponse.json({
          ...fallbackTurn,
          pronunciation: null,
          meta: {
            keySource: 'fallback',
            modelUsed: 'conversational-fallback',
            latencyMs: 0,
            fallback: true,
          },
        });
      }
      throw aiErr;
    }
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
