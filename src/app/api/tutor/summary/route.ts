import { NextResponse, type NextRequest } from 'next/server';
import {
  generateGeminiJson,
  resolveTutorRequestAuth,
  TutorHttpError,
} from '@/lib/gemini-client';
import { AI_PERSONAS, SCENARIOS } from '@/lib/scenarios';
import {
  buildConversationReportPrompt,
  buildFallbackConversationReport,
  CONVERSATION_REPORT_SCHEMA,
  parseConversationReportOutput,
} from '@/lib/tutor-prompt';
import type { TutorMessage, UserProfile } from '@/types';

export const maxDuration = 30;

interface SummaryPayload {
  scenarioId: string;
  personaId: string;
  durationSeconds: number;
  messages: Pick<
    TutorMessage,
    'role' | 'englishText' | 'naturalRewrite' | 'pronunciation'
  >[];
  profileOverride?: Partial<
    Pick<UserProfile, 'displayName' | 'englishLevel' | 'jobField' | 'hobbies'>
  >;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SummaryPayload;
    const { userId, userPersonalKey, profile } = await resolveTutorRequestAuth(
      request,
      payload.profileOverride
    );

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const userTurns = messages.filter((m) => m.role === 'user').length;

    if (userTurns === 0) {
      const report = buildFallbackConversationReport({
        displayName: profile.displayName,
        englishLevel: profile.englishLevel,
        userTurns: 0,
      });
      return NextResponse.json({
        report,
        meta: {
          keySource: 'fallback',
          modelUsed: 'none',
          latencyMs: 0,
        },
      });
    }

    const scenario =
      SCENARIOS.find((s) => s.id === payload.scenarioId) ?? SCENARIOS[0];
    const persona =
      AI_PERSONAS.find((p) => p.id === payload.personaId) ?? AI_PERSONAS[0];

    const promptText = buildConversationReportPrompt({
      profile,
      scenario,
      persona,
      durationSeconds: Math.max(0, Math.round(payload.durationSeconds || 0)),
      messages,
    });

    const result = await generateGeminiJson({
      userId,
      userPersonalKey,
      parts: [{ text: promptText }],
      responseSchema: CONVERSATION_REPORT_SCHEMA,
      temperature: 0.45,
      maxOutputTokens: 1050,
      speedMode: 'report',
      timeoutMs: 18_000,
    });

    const report = parseConversationReportOutput(result.rawText);

    return NextResponse.json({
      report,
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
        : 'Không thể tạo báo cáo tổng kết cuộc gọi.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
