import { Type, type Schema } from '@google/genai';
import type {
  AiPersona,
  EnglishLevel,
  ReplyHint,
  Scenario,
  TutorMessage,
  UserProfile,
} from '@/types';

export interface TutorTurnOutput {
  userTranscript: string;
  naturalRewrite: string | null;
  coachingTip: string | null;
  aiReplyEn: string;
  aiReplyVi: string;
  replyHints: ReplyHint[];
  highlightPhrase?: {
    en: string;
    vi: string;
    phonetic: string;
  } | null;
}

export const TUTOR_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    userTranscript: {
      type: Type.STRING,
      description:
        'Exact transcription of what the user said (or typed). If audio was silent/unclear, write a short polite note in brackets.',
    },
    naturalRewrite: {
      type: Type.STRING,
      nullable: true,
      description:
        'How a native speaker would express the user’s exact thought naturally. Null if user’s sentence is already completely natural or on conversation start.',
    },
    coachingTip: {
      type: Type.STRING,
      nullable: true,
      description:
        'Short, encouraging tip in Vietnamese (1-2 sentences) explaining a grammar fix, natural expression, or pronunciation/linking tip. Null on start.',
    },
    aiReplyEn: {
      type: Type.STRING,
      description:
        'The AI persona’s natural conversational response in English tailored to the user’s level and accent.',
    },
    aiReplyVi: {
      type: Type.STRING,
      description: 'Natural Vietnamese translation of aiReplyEn.',
    },
    replyHints: {
      type: Type.ARRAY,
      description:
        'Exactly 3 helpful suggested replies the user can say next, ordered from easiest to slightly more expressive.',
      items: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING },
          vi: { type: Type.STRING },
          phonetic: {
            type: Type.STRING,
            description:
              'Easy Vietnamese-style phonetic guide to help an A0-A1 learner pronounce it comfortably.',
          },
        },
        required: ['en', 'vi', 'phonetic'],
      },
    },
    highlightPhrase: {
      type: Type.OBJECT,
      nullable: true,
      description: 'One useful native phrase from this turn worth saving.',
      properties: {
        en: { type: Type.STRING },
        vi: { type: Type.STRING },
        phonetic: { type: Type.STRING },
      },
      required: ['en', 'vi', 'phonetic'],
    },
  },
  required: [
    'userTranscript',
    'aiReplyEn',
    'aiReplyVi',
    'replyHints',
  ],
};

function getLevelGuideline(level: EnglishLevel): string {
  switch (level) {
    case 'A0-A1':
      return [
        'Learner level is A0-A1 (Complete Beginner / Mất gốc).',
        'Use short, warm, crystal-clear everyday sentences (6 to 14 words per sentence, max 2 short sentences).',
        'Avoid complex clauses or obscure vocabulary.',
        'If the user speaks broken English, mixes Vietnamese words into English (Vietlish), or hesitates, ALWAYS understand their true intention kindly, transcribe faithfully in userTranscript, provide an easy natural English version in naturalRewrite, and encourage them warmly in Vietnamese in coachingTip.',
        'All 3 replyHints MUST be super approachable for an A0-A1 learner, including easy Vietnamese-friendly pronunciation guides in phonetic.',
      ].join(' ');
    case 'A2-B1':
      return [
        'Learner level is A2-B1 (Elementary to Intermediate).',
        'Speak naturally in 2-3 conversational sentences, introducing 1 useful everyday phrasal verb or natural transition.',
        'Correct Chinglish/Vietlish literal translations into natural native phrasing in naturalRewrite and explain briefly in Vietnamese.',
      ].join(' ');
    case 'B2+':
      return [
        'Learner level is B2+ (Upper-Intermediate to Advanced).',
        'Speak like a real native friend or colleague with natural idioms, contractions, fillers ("you know", "honestly", "by the way"), and connected speech.',
        'Refine nuance, tone, and collocations in naturalRewrite and coachingTip.',
      ].join(' ');
  }
}

function getAccentFlavor(accent: AiPersona['accent']): string {
  switch (accent) {
    case 'US':
      return 'Use natural American English spelling and expressions (e.g., "awesome", "hang out", "check", "subway").';
    case 'UK':
      return 'Use natural British English phrasing politely (e.g., "lovely", "cheers", "have a go", "underground", "bill").';
    case 'AU':
      return 'Use friendly Australian English warmth (e.g., "no worries", "sounds great, mate", "arvo" when casual).';
    case 'CA':
      return 'Use warm, clear Canadian English expressions.';
  }
}

export function buildTutorSystemInstruction(params: {
  profile: Pick<
    UserProfile,
    'displayName' | 'englishLevel' | 'jobField' | 'hobbies'
  >;
  persona: AiPersona;
  scenario: Scenario;
}): string {
  const { profile, persona, scenario } = params;
  const userName = profile.displayName.trim() || 'bạn';
  const jobInfo = profile.jobField.trim()
    ? `User's job/field: ${profile.jobField}.`
    : 'User has not specified a job yet.';
  const hobbiesInfo =
    profile.hobbies.length > 0
      ? `User's hobbies/favorite topics: ${profile.hobbies.join(', ')}.`
      : 'User enjoys everyday lifestyle topics.';

  return [
    `You are ${persona.name}, a warm, patient native English speaker from ${persona.accentLabel} having a live voice call with a Vietnamese learner named "${userName}".`,
    `Scenario: "${scenario.titleEn}" (${scenario.category}). Role context: ${scenario.starterContext}`,
    `${jobInfo} ${hobbiesInfo}`,
    getLevelGuideline(profile.englishLevel),
    getAccentFlavor(persona.accent),
    'Always keep the conversation moving naturally by ending your reply with ONE friendly, easy-to-answer question (unless wrapping up).',
    'Never output markdown, asterisks, or emojis inside aiReplyEn so TTS reads it cleanly as natural spoken speech.',
    'Always return valid JSON matching the schema.',
  ].join('\n');
}

export function buildConversationTurnPrompt(params: {
  history: Pick<TutorMessage, 'role' | 'englishText'>[];
  userText?: string;
  isStart?: boolean;
  isAudio?: boolean;
  displayName?: string;
}): string {
  const { history, userText, isStart, isAudio, displayName } = params;
  const recentHistory = history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'AI'}: ${m.englishText}`)
    .join('\n');

  if (isStart) {
    return [
      `Start the voice call right now by greeting ${displayName?.trim() || 'the learner'} warmly by name, setting the scene briefly in 1-2 short sentences, and asking your first easy opening question.`,
      'Set userTranscript to "[Bắt đầu cuộc gọi]", naturalRewrite to null, and coachingTip to a quick Vietnamese welcome tip telling them they can speak slowly or even mix Vietnamese if stuck.',
    ].join('\n');
  }

  const parts: string[] = [];
  if (recentHistory) {
    parts.push(`Recent conversation:\n${recentHistory}`);
  }

  if (isAudio) {
    parts.push(
      'Listen carefully to the attached audio from the learner. Transcribe what they said (even if pronunciation is imperfect or mixes Vietnamese words), gently offer a natural native rewrite + brief Vietnamese coaching tip, reply naturally in character, translate to Vietnamese, and provide 3 helpful replyHints for what they can say next.'
    );
  } else {
    parts.push(`Learner just said/typed: "${userText ?? ''}"`);
    parts.push(
      'Respond naturally in character, give naturalRewrite + brief Vietnamese coachingTip if their phrasing can sound more native, translate your reply to Vietnamese, and provide 3 helpful replyHints.'
    );
  }

  return parts.join('\n\n');
}

export function parseTutorTurnOutput(rawText: string): TutorTurnOutput {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned) as Partial<TutorTurnOutput>;

  if (!parsed.aiReplyEn || typeof parsed.aiReplyEn !== 'string') {
    throw new Error('Phản hồi AI thiếu nội dung tiếng Anh.');
  }

  const hints: ReplyHint[] = Array.isArray(parsed.replyHints)
    ? parsed.replyHints
        .filter((h) => h && typeof h.en === 'string' && typeof h.vi === 'string')
        .slice(0, 3)
        .map((h) => ({
          en: h.en.trim(),
          vi: h.vi.trim(),
          phonetic: typeof h.phonetic === 'string' ? h.phonetic.trim() : '',
        }))
    : [];

  return {
    userTranscript:
      typeof parsed.userTranscript === 'string' && parsed.userTranscript.trim()
        ? parsed.userTranscript.trim()
        : '[Audio input]',
    naturalRewrite:
      typeof parsed.naturalRewrite === 'string' && parsed.naturalRewrite.trim()
        ? parsed.naturalRewrite.trim()
        : null,
    coachingTip:
      typeof parsed.coachingTip === 'string' && parsed.coachingTip.trim()
        ? parsed.coachingTip.trim()
        : null,
    aiReplyEn: parsed.aiReplyEn.trim(),
    aiReplyVi:
      typeof parsed.aiReplyVi === 'string'
        ? parsed.aiReplyVi.trim()
        : 'Hãy nghe lại câu tiếng Anh ở trên nhé.',
    replyHints:
      hints.length > 0
        ? hints
        : [
            {
              en: 'Yes, I agree with you.',
              vi: 'Vâng, mình đồng ý với bạn.',
              phonetic: 'yes, ai ơ-gờ-ri uýt du',
            },
            {
              en: 'Could you say that again, please?',
              vi: 'Bạn nói lại câu đó giúp mình được không?',
              phonetic: 'cút du sây đát ơ-gen, p-li-z',
            },
            {
              en: "I'm not sure, let me think.",
              vi: 'Mình chưa chắc lắm, để mình nghĩ chút nhé.',
              phonetic: 'am nót sua, lét mi thinh',
            },
          ],
    highlightPhrase:
      parsed.highlightPhrase &&
      typeof parsed.highlightPhrase.en === 'string' &&
      typeof parsed.highlightPhrase.vi === 'string'
        ? {
            en: parsed.highlightPhrase.en.trim(),
            vi: parsed.highlightPhrase.vi.trim(),
            phonetic:
              typeof parsed.highlightPhrase.phonetic === 'string'
                ? parsed.highlightPhrase.phonetic.trim()
                : '',
          }
        : null,
  };
}
