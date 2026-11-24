import { type Part } from '@google/genai';
import { NextResponse, type NextRequest } from 'next/server';
import {
  generateGeminiJson,
  resolveTutorRequestAuth,
  TutorHttpError,
} from '@/lib/gemini-client';
import { checkSlidingWindowRateLimit } from '@/lib/rate-limit';
import { AI_PERSONAS, SCENARIOS } from '@/lib/scenarios';
import { extractClientIp } from '@/lib/security';
import {
  buildConversationTurnPrompt,
  buildInstantScenarioOpening,
  buildTutorSystemInstruction,
  parseTutorTurnOutput,
  sanitizePromptField,
  TUTOR_RESPONSE_SCHEMA,
  TUTOR_TEXT_RESPONSE_SCHEMA,
  type TutorTurnOutput,
} from '@/lib/tutor-prompt';
import { synthesizeEdgeTtsMp3 } from '@/lib/tts-server';
import type { TutorMessage, UserProfile } from '@/types';

export const maxDuration = 30;

interface TurnPayload {
  scenarioId: string;
  personaId: string;
  customTopic?: string;
  isStart?: boolean;
  userText?: string;
  clientTranscript?: string;
  speed?: number;
  includeAudio?: boolean;
  history: Pick<TutorMessage, 'role' | 'englishText'>[];
  profileOverride?: Partial<
    Pick<UserProfile, 'displayName' | 'englishLevel' | 'jobField' | 'hobbies'>
  >;
}

async function attachOptionalInlineAudio(params: {
  includeAudio?: boolean;
  text: string;
  voice: string;
  speed?: number;
}): Promise<string | null> {
  if (params.includeAudio === false || !params.text.trim()) return null;
  try {
    const tts = await synthesizeEdgeTtsMp3({
      text: params.text,
      voice: params.voice,
      speed: params.speed ?? 0.85,
      connectionTimeoutMs: 2_200,
      synthesisTimeoutMs: 2_800,
    });
    return tts.buffer.toString('base64');
  } catch {
    // Non-blocking: client will seamlessly fall back to /api/tts or browser voice
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkSlidingWindowRateLimit({
      namespace: 'tutor-turn',
      key: extractClientIp(request.headers),
      limit: 40,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Bạn gửi lượt nói quá nhanh. Hãy nghỉ vài giây rồi tiếp tục nhé!' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

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
      try {
        payload = JSON.parse(rawJson) as TurnPayload;
      } catch {
        return NextResponse.json(
          { error: 'Dữ liệu hội thoại JSON không hợp lệ.' },
          { status: 400 }
        );
      }
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
      try {
        payload = (await request.json()) as TurnPayload;
      } catch {
        return NextResponse.json(
          { error: 'Dữ liệu hội thoại JSON không hợp lệ.' },
          { status: 400 }
        );
      }
    }

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { error: 'Thiếu dữ liệu phiên hội thoại.' },
        { status: 400 }
      );
    }
    const safeHistory = Array.isArray(payload.history)
      ? payload.history.slice(-40)
      : [];

    const { userId, userPersonalKey, profile } = await resolveTutorRequestAuth(
      request,
      payload.profileOverride
    );

    const baseScenario =
      SCENARIOS.find((s) => s.id === payload.scenarioId) ?? SCENARIOS[0];
    const cleanCustomTopic = sanitizePromptField(payload.customTopic, 140);
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

    // Fast-path (<1ms AI latency): instant natural native opening for built-in scenarios
    if (payload.isStart && !cleanCustomTopic) {
      const opening = buildInstantScenarioOpening({
        scenario,
        persona,
        displayName: profile.displayName,
        englishLevel: profile.englishLevel,
        hobbies: profile.hobbies,
        jobField: profile.jobField,
      });
      const aiAudioBase64 = await attachOptionalInlineAudio({
        includeAudio: payload.includeAudio,
        text: opening.aiReplyEn,
        voice: persona.edgeVoice,
        speed: payload.speed,
      });

      return NextResponse.json({
        ...opening,
        aiAudioBase64,
        meta: {
          keySource: 'instant',
          modelUsed: 'instant-opening',
          latencyMs: 0,
          fallback: false,
        },
      });
    }

    const systemInstruction = buildTutorSystemInstruction({
      profile,
      persona,
      scenario,
    });

    const cleanClientTranscript = sanitizePromptField(
      payload.clientTranscript,
      320
    );

    const promptText = buildConversationTurnPrompt({
      history: safeHistory,
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
        responseSchema: audioBase64
          ? TUTOR_RESPONSE_SCHEMA
          : TUTOR_TEXT_RESPONSE_SCHEMA,
        temperature: 0.65,
        maxOutputTokens: audioBase64 ? 780 : 480,
        speedMode: 'realtime',
        timeoutMs: audioBase64 ? 13_000 : 10_000,
      });

      const parsed = parseTutorTurnOutput(result.rawText);
      const aiAudioBase64 = await attachOptionalInlineAudio({
        includeAudio: payload.includeAudio,
        text: parsed.aiReplyEn,
        voice: persona.edgeVoice,
        speed: payload.speed,
      });

      return NextResponse.json({
        ...parsed,
        pronunciation: audioBase64 ? parsed.pronunciation ?? null : null,
        aiAudioBase64,
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

      // Voice rescue: if audio multimodal call hit upstream 503 wave, retry once with lightweight clientTranscript text
      if (audioBase64 && cleanClientTranscript) {
        try {
          const textPrompt = buildConversationTurnPrompt({
            history: safeHistory,
            userText: cleanClientTranscript,
            isStart: false,
            isAudio: false,
            displayName: profile.displayName,
          });
          const rescueRes = await generateGeminiJson({
            userId,
            userPersonalKey,
            parts: [{ text: textPrompt }],
            systemInstruction,
            responseSchema: TUTOR_TEXT_RESPONSE_SCHEMA,
            temperature: 0.65,
            maxOutputTokens: 450,
            speedMode: 'realtime',
            timeoutMs: 7_500,
          });
          const parsedRescue = parseTutorTurnOutput(rescueRes.rawText);
          const aiAudioBase64 = await attachOptionalInlineAudio({
            includeAudio: payload.includeAudio,
            text: parsedRescue.aiReplyEn,
            voice: persona.edgeVoice,
            speed: payload.speed,
          });
          return NextResponse.json({
            ...parsedRescue,
            userTranscript: cleanClientTranscript,
            pronunciation: null,
            aiAudioBase64,
            meta: {
              keySource: rescueRes.keySource,
              modelUsed: `${rescueRes.modelUsed}-rescue`,
              latencyMs: rescueRes.latencyMs,
              fallback: false,
            },
          });
        } catch {
          // Fall through to graceful conversational fallback below
        }
      }

      // Graceful conversational fallback for text, start, OR voice with clientTranscript during upstream waves
      const userSaid = (payload.userText || cleanClientTranscript || '').trim();
      if (!audioBase64 || userSaid) {
        const learnerName = profile.displayName?.trim() || 'bạn';
        const isStart = Boolean(payload.isStart);
        const fallbackTurn: TutorTurnOutput = isStart
          ? buildInstantScenarioOpening({
              scenario,
              persona,
              displayName: profile.displayName,
              englishLevel: profile.englishLevel,
              hobbies: profile.hobbies,
              jobField: profile.jobField,
            })
          : {
              userTranscript: userSaid,
              naturalRewrite: null,
              coachingTip: `${persona.name} đã giữ nhịp hội thoại giúp bạn trong lúc kết nối cao điểm — hãy tiếp tục trả lời tự nhiên nhé!`,
              aiReplyEn: `Got it, ${learnerName === 'Bạn' || learnerName === 'bạn' ? 'my friend' : learnerName}! That makes total sense. Tell me a bit more — what would you like to do next?`,
              aiReplyVi: `Rõ rồi ${learnerName} ơi! Nghe rất hợp lý. Bạn chia sẻ thêm chút nữa nhé — tiếp theo bạn muốn làm gì nào?`,
              replyHints: [
                {
                  en: 'Sure! What do you recommend?',
                  vi: 'Chắc chắn rồi! Bạn gợi ý gì nào?',
                  phonetic: 'sua! uắt đu du re-cơ-men?',
                },
                {
                  en: "Let's keep going — I'd love to hear your thoughts.",
                  vi: 'Tiếp tục nhé — mình muốn nghe ý kiến của bạn.',
                  phonetic: 'lét-s kíp gâu-inh — aid lav tu hia do thót-s',
                },
                {
                  en: 'Sounds good to me! Could we try another question?',
                  vi: 'Nghe hợp lý đấy! Bạn hỏi thêm câu nữa nhé?',
                  phonetic: 'sao-z gút tu mi! cút uy t-rai ơ-ná-đơ quét-chần?',
                },
              ],
              pronunciation: null,
            };

        const aiAudioBase64 = await attachOptionalInlineAudio({
          includeAudio: payload.includeAudio,
          text: fallbackTurn.aiReplyEn,
          voice: persona.edgeVoice,
          speed: payload.speed,
        });

        return NextResponse.json({
          ...fallbackTurn,
          pronunciation: null,
          aiAudioBase64,
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
