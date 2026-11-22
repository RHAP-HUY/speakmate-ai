import { Type, type Schema } from '@google/genai';
import type {
  AiPersona,
  ConversationReport,
  EnglishLevel,
  PronunciationAssessment,
  PronunciationPracticeResult,
  PronunciationWordFeedback,
  PronunciationWordStatus,
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
  pronunciation?: PronunciationAssessment | null;
}

const PRONUNCIATION_WORD_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    status: {
      type: Type.STRING,
      description: 'One of: good, improve, missing',
    },
    ipa: {
      type: Type.STRING,
      nullable: true,
      description: 'Short IPA for words needing improvement (optional).',
    },
    tipVi: {
      type: Type.STRING,
      nullable: true,
      description:
        'Very short Vietnamese tip (max 8 words) ONLY if status is improve or missing, e.g. "bật âm cuối /t/", "nhấn âm tiết 2". Null if good.',
    },
  },
  required: ['word', 'status'],
};

const PRONUNCIATION_ASSESSMENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  nullable: true,
  description:
    'Pronunciation score for spoken audio input. MUST be null when input is text or conversation start.',
  properties: {
    overallScore: {
      type: Type.INTEGER,
      description: 'Overall pronunciation score from 0 to 100.',
    },
    accuracyScore: {
      type: Type.INTEGER,
      description: 'Phoneme/sound clarity score from 0 to 100.',
    },
    fluencyScore: {
      type: Type.INTEGER,
      description: 'Pace, rhythm, and smoothness score from 0 to 100.',
    },
    intonationScore: {
      type: Type.INTEGER,
      description: 'Word stress and natural intonation score from 0 to 100.',
    },
    summaryVi: {
      type: Type.STRING,
      description:
        'One concise encouraging Vietnamese sentence highlighting pronunciation strength and 1 key fix.',
    },
    wordFeedback: {
      type: Type.ARRAY,
      description:
        'Word-by-word pronunciation status for the English words spoken (up to 18 words).',
      items: PRONUNCIATION_WORD_SCHEMA,
    },
  },
  required: [
    'overallScore',
    'accuracyScore',
    'fluencyScore',
    'intonationScore',
    'summaryVi',
    'wordFeedback',
  ],
};

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
              'Easy Vietnamese-style phonetic guide for A0-A1 learners (or concise IPA for B2+).',
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
    pronunciation: PRONUNCIATION_ASSESSMENT_SCHEMA,
  },
  required: ['userTranscript', 'aiReplyEn', 'aiReplyVi', 'replyHints'],
};

export const PRONUNCIATION_PRACTICE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    heardTranscript: {
      type: Type.STRING,
      description:
        'What the learner actually sounded like in the audio (faithful transcription).',
    },
    overallScore: { type: Type.INTEGER },
    accuracyScore: { type: Type.INTEGER },
    fluencyScore: { type: Type.INTEGER },
    intonationScore: { type: Type.INTEGER },
    summaryVi: {
      type: Type.STRING,
      description:
        'Encouraging, actionable Vietnamese feedback (1-2 short sentences) on how close they sounded to a native speaker.',
    },
    linkingTipVi: {
      type: Type.STRING,
      nullable: true,
      description:
        'One practical tip in Vietnamese on connected speech, linking sounds, or sentence stress for this target sentence.',
    },
    wordFeedback: {
      type: Type.ARRAY,
      description:
        'Every word in the target sentence in order, marked as good, improve, or missing, with IPA and short Vietnamese fix tip for improve/missing words.',
      items: PRONUNCIATION_WORD_SCHEMA,
    },
  },
  required: [
    'heardTranscript',
    'overallScore',
    'accuracyScore',
    'fluencyScore',
    'intonationScore',
    'summaryVi',
    'wordFeedback',
  ],
};

export const CONVERSATION_REPORT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER },
    cefrEstimate: {
      type: Type.STRING,
      description: 'Estimated spoken level during this call, e.g. A0, A1, A2, B1, B2, C1.',
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        pronunciation: { type: Type.INTEGER },
        fluency: { type: Type.INTEGER },
        grammar: { type: Type.INTEGER },
        vocabulary: { type: Type.INTEGER },
      },
      required: ['pronunciation', 'fluency', 'grammar', 'vocabulary'],
    },
    headlineVi: {
      type: Type.STRING,
      description: 'Short motivating Vietnamese headline summarizing the call (max 14 words).',
    },
    overviewVi: {
      type: Type.STRING,
      description: '2-3 encouraging Vietnamese sentences evaluating overall communication performance.',
    },
    strengthsVi: {
      type: Type.ARRAY,
      description: '2-3 specific strengths observed in this call (Vietnamese).',
      items: { type: Type.STRING },
    },
    improvementsVi: {
      type: Type.ARRAY,
      description: '2-3 prioritized areas to improve next (Vietnamese).',
      items: { type: Type.STRING },
    },
    topCorrections: {
      type: Type.ARRAY,
      description: 'Up to 3 most impactful corrections from the learner’s actual turns.',
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          better: { type: Type.STRING },
          explanationVi: { type: Type.STRING },
        },
        required: ['original', 'better', 'explanationVi'],
      },
    },
    recommendedPhrases: {
      type: Type.ARRAY,
      description: '2-3 native expressions from or suited to this call worth saving.',
      items: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING },
          vi: { type: Type.STRING },
          phonetic: { type: Type.STRING },
        },
        required: ['en', 'vi', 'phonetic'],
      },
    },
    nextStepVi: {
      type: Type.STRING,
      description: 'One concrete actionable practice suggestion for the next session (Vietnamese).',
    },
  },
  required: [
    'overallScore',
    'cefrEstimate',
    'scores',
    'headlineVi',
    'overviewVi',
    'strengthsVi',
    'improvementsVi',
    'topCorrections',
    'recommendedPhrases',
    'nextStepVi',
  ],
};

function clampScore(value: unknown, fallback = 75): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeWordStatus(status: unknown): PronunciationWordStatus {
  const s = String(status ?? '').toLowerCase().trim();
  if (s === 'good' || s === 'improve' || s === 'missing') return s;
  return 'good';
}

function normalizeWordFeedback(items: unknown): PronunciationWordFeedback[] {
  if (!Array.isArray(items)) return [];
  const result: PronunciationWordFeedback[] = [];
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as Record<string, unknown>;
    if (typeof item.word !== 'string' || !item.word.trim()) continue;
    result.push({
      word: item.word.trim(),
      status: normalizeWordStatus(item.status),
      ipa:
        typeof item.ipa === 'string' && item.ipa.trim()
          ? item.ipa.trim()
          : undefined,
      tipVi:
        typeof item.tipVi === 'string' && item.tipVi.trim()
          ? item.tipVi.trim()
          : undefined,
    });
    if (result.length >= 24) break;
  }
  return result;
}

function normalizePronunciationAssessment(
  raw: unknown
): PronunciationAssessment | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.overallScore === undefined && obj.accuracyScore === undefined) {
    return null;
  }

  const accuracyScore = clampScore(obj.accuracyScore, 75);
  const fluencyScore = clampScore(obj.fluencyScore, 75);
  const intonationScore = clampScore(obj.intonationScore, 75);
  const overallScore = clampScore(
    obj.overallScore,
    Math.round((accuracyScore + fluencyScore + intonationScore) / 3)
  );

  return {
    overallScore,
    accuracyScore,
    fluencyScore,
    intonationScore,
    summaryVi:
      typeof obj.summaryVi === 'string' && obj.summaryVi.trim()
        ? obj.summaryVi.trim()
        : 'Phát âm rõ ý, hãy chú ý thêm âm cuối và ngữ điệu tự nhiên nhé!',
    wordFeedback: normalizeWordFeedback(obj.wordFeedback),
  };
}

function cleanJsonFence(rawText: string): string {
  return rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

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
        'Correct Vietlish literal translations into natural native phrasing in naturalRewrite and explain briefly in Vietnamese.',
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
      return 'Use friendly Australian English warmth (e.g., "no worries", "sounds great, mate").';
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
    'Keep JSON fields concise for low latency. Return valid JSON matching the schema.',
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
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Learner' : 'AI'}: ${m.englishText}`)
    .join('\n');

  if (isStart) {
    return [
      `Start the voice call right now by greeting ${displayName?.trim() || 'the learner'} warmly by name, setting the scene briefly in 1-2 short sentences, and asking your first easy opening question.`,
      'Set userTranscript to "[Bắt đầu cuộc gọi]", naturalRewrite to null, pronunciation to null, and coachingTip to a quick Vietnamese welcome tip telling them they can speak slowly or even mix Vietnamese if stuck.',
    ].join('\n');
  }

  const parts: string[] = [];
  if (recentHistory) {
    parts.push(`Recent conversation:\n${recentHistory}`);
  }

  if (isAudio) {
    parts.push(
      'Listen carefully to the attached audio from the learner. 1) Transcribe faithfully in userTranscript (even if pronunciation is imperfect or mixes Vietnamese; if silent/noise-only write "[Chưa nghe rõ tiếng]"). 2) Score their actual spoken English honestly in pronunciation (overallScore, accuracyScore, fluencyScore, intonationScore, summaryVi, and wordFeedback for each English word spoken — noting final consonants /s/ /t/ /d/ /k/, /θ/ /ð/, word stress; if audio is silent or unintelligible noise, score 0-15). 3) Offer naturalRewrite + brief Vietnamese coachingTip. 4) Reply naturally in aiReplyEn + aiReplyVi + 3 replyHints.'
    );
  } else {
    parts.push(`Learner just typed: "${userText ?? ''}"`);
    parts.push(
      'Set pronunciation to null (no audio). Respond naturally in character, give naturalRewrite + brief Vietnamese coachingTip if their phrasing can sound more native, translate your reply to Vietnamese, and provide 3 helpful replyHints.'
    );
  }

  return parts.join('\n\n');
}

export function parseTutorTurnOutput(rawText: string): TutorTurnOutput {
  const cleaned = cleanJsonFence(rawText);
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
    pronunciation: normalizePronunciationAssessment(parsed.pronunciation),
  };
}

export function buildPronunciationPracticePrompt(params: {
  targetSentence: string;
  accentLabel: string;
  englishLevel: EnglishLevel;
}): string {
  return [
    `You are a friendly, precise English pronunciation coach evaluating a Vietnamese learner (level: ${params.englishLevel}) practicing ${params.accentLabel} pronunciation.`,
    `Target sentence to read aloud: "${params.targetSentence}"`,
    'Listen carefully to the attached audio recording and compare it word-by-word against the target sentence.',
    'Pay close attention to common Vietnamese-speaker pronunciation points: ending sounds (/s/, /z/, /t/, /d/, /k/, /ed/), /θ/ and /ð/ ("th"), /ʃ/ vs /s/, vowel length, word stress, and sentence rhythm.',
    'In wordFeedback, list EVERY word of the target sentence in order with status: "good" (pronounced clearly), "improve" (audible but needs clearer sound/stress — provide ipa and a very short tipVi), or "missing" (skipped or unintelligible).',
    'Be strictly honest based ONLY on the actual audio: if the audio is silent, noise-only, or contains no intelligible English speech, set heardTranscript to "[Chưa nghe rõ giọng nói]", score 0-15, mark every word as "missing", and politely remind them in Vietnamese to speak closer to the mic. For genuine understandable speech, score fairly (75-95 when clear for their level).',
    'Return strictly valid JSON matching the schema.',
  ].join('\n');
}

export function parsePronunciationPracticeOutput(
  rawText: string,
  targetSentence: string
): PronunciationPracticeResult {
  const cleaned = cleanJsonFence(rawText);
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const base = normalizePronunciationAssessment(parsed);

  const fallbackWords: PronunciationWordFeedback[] = targetSentence
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w, status: 'good' }));

  return {
    targetSentence,
    heardTranscript:
      typeof parsed.heardTranscript === 'string' && parsed.heardTranscript.trim()
        ? parsed.heardTranscript.trim()
        : targetSentence,
    overallScore: base?.overallScore ?? 75,
    accuracyScore: base?.accuracyScore ?? 75,
    fluencyScore: base?.fluencyScore ?? 75,
    intonationScore: base?.intonationScore ?? 75,
    summaryVi:
      base?.summaryVi ??
      'Bạn đọc khá rõ ràng! Hãy thử nhấn nhá thêm ngữ điệu để giống người bản xứ hơn nhé.',
    linkingTipVi:
      typeof parsed.linkingTipVi === 'string' && parsed.linkingTipVi.trim()
        ? parsed.linkingTipVi.trim()
        : null,
    wordFeedback:
      base && base.wordFeedback.length > 0 ? base.wordFeedback : fallbackWords,
  };
}

export function buildConversationReportPrompt(params: {
  profile: Pick<UserProfile, 'displayName' | 'englishLevel' | 'jobField'>;
  scenario: Scenario;
  persona: AiPersona;
  durationSeconds: number;
  messages: Pick<
    TutorMessage,
    'role' | 'englishText' | 'naturalRewrite' | 'pronunciation'
  >[];
}): string {
  const { profile, scenario, persona, durationSeconds, messages } = params;
  const userTurns = messages.filter((m) => m.role === 'user');
  const pronScores = userTurns
    .map((m) => m.pronunciation?.overallScore)
    .filter((s): s is number => typeof s === 'number');
  const avgPron =
    pronScores.length > 0
      ? Math.round(pronScores.reduce((a, b) => a + b, 0) / pronScores.length)
      : null;

  const transcriptLines = messages
    .slice(-24)
    .map((m, idx) => {
      const speaker = m.role === 'user' ? 'Learner' : persona.name;
      const rewrite = m.naturalRewrite
        ? ` [Native rewrite: ${m.naturalRewrite}]`
        : '';
      const pron = m.pronunciation
        ? ` [Pronunciation: ${m.pronunciation.overallScore}/100]`
        : '';
      return `${idx + 1}. ${speaker}: ${m.englishText}${rewrite}${pron}`;
    })
    .join('\n');

  return [
    `You are an encouraging, expert English speaking coach writing a post-call evaluation report in Vietnamese for "${profile.displayName || 'học viên'}" (target level: ${profile.englishLevel}, job: ${profile.jobField || 'N/A'}).`,
    `Call context: Scenario "${scenario.titleVi}" (${scenario.titleEn}) with ${persona.name} (${persona.accentLabel}), duration ${durationSeconds}s, ${userTurns.length} learner turns.`,
    avgPron !== null
      ? `Measured average audio pronunciation score across spoken turns: ${avgPron}/100. Anchor scores.pronunciation close to this measured score.`
      : 'Learner used text or did not have audio pronunciation scores; estimate scores.pronunciation realistically (around 70-80) and mention practicing aloud with the mic next time.',
    'Conversation transcript:',
    transcriptLines,
    'Provide honest, specific, motivating feedback in Vietnamese based strictly on what the learner actually said above. In topCorrections, pick up to 3 real learner sentences that improved the most. In recommendedPhrases, provide 2-3 high-value native phrases with easy phonetic guides. Return strictly valid JSON matching the schema.',
  ].join('\n');
}

export function parseConversationReportOutput(
  rawText: string
): ConversationReport {
  const cleaned = cleanJsonFence(rawText);
  const parsed = JSON.parse(cleaned) as Partial<ConversationReport>;

  const rawScores = parsed.scores ?? ({} as ConversationReport['scores']);
  const pronunciation = clampScore(rawScores.pronunciation, 75);
  const fluency = clampScore(rawScores.fluency, 75);
  const grammar = clampScore(rawScores.grammar, 75);
  const vocabulary = clampScore(rawScores.vocabulary, 75);

  const overallScore = clampScore(
    parsed.overallScore,
    Math.round((pronunciation + fluency + grammar + vocabulary) / 4)
  );

  return {
    overallScore,
    cefrEstimate:
      typeof parsed.cefrEstimate === 'string' && parsed.cefrEstimate.trim()
        ? parsed.cefrEstimate.trim().toUpperCase().slice(0, 6)
        : 'A1',
    scores: {
      pronunciation,
      fluency,
      grammar,
      vocabulary,
    },
    headlineVi:
      typeof parsed.headlineVi === 'string' && parsed.headlineVi.trim()
        ? parsed.headlineVi.trim()
        : 'Bạn đã hoàn thành buổi luyện nói rất tốt!',
    overviewVi:
      typeof parsed.overviewVi === 'string' && parsed.overviewVi.trim()
        ? parsed.overviewVi.trim()
        : 'Bạn đã duy trì cuộc trò chuyện đều đặn và phản hồi đúng trọng tâm câu hỏi.',
    strengthsVi: Array.isArray(parsed.strengthsVi)
      ? parsed.strengthsVi
          .filter((s) => typeof s === 'string' && s.trim())
          .slice(0, 3)
      : ['Mạnh dạn phản xạ giao tiếp tiếng Anh'],
    improvementsVi: Array.isArray(parsed.improvementsVi)
      ? parsed.improvementsVi
          .filter((s) => typeof s === 'string' && s.trim())
          .slice(0, 3)
      : ['Chú ý thêm âm cuối và ngữ điệu khi nói'],
    topCorrections: Array.isArray(parsed.topCorrections)
      ? parsed.topCorrections
          .filter(
            (c) =>
              c &&
              typeof c.original === 'string' &&
              typeof c.better === 'string' &&
              typeof c.explanationVi === 'string'
          )
          .slice(0, 3)
          .map((c) => ({
            original: c.original.trim(),
            better: c.better.trim(),
            explanationVi: c.explanationVi.trim(),
          }))
      : [],
    recommendedPhrases: Array.isArray(parsed.recommendedPhrases)
      ? parsed.recommendedPhrases
          .filter((p) => p && typeof p.en === 'string' && typeof p.vi === 'string')
          .slice(0, 3)
          .map((p) => ({
            en: p.en.trim(),
            vi: p.vi.trim(),
            phonetic: typeof p.phonetic === 'string' ? p.phonetic.trim() : '',
          }))
      : [],
    nextStepVi:
      typeof parsed.nextStepVi === 'string' && parsed.nextStepVi.trim()
        ? parsed.nextStepVi.trim()
        : 'Hãy ôn lại các cụm từ vừa lưu và thử gọi lại tình huống này thêm 1 lần nữa nhé!',
    generatedAt: new Date().toISOString(),
  };
}

export function serializeConversationReport(report: ConversationReport): string {
  return JSON.stringify(report);
}

export function parseConversationReport(
  summaryVi?: string | null
): ConversationReport | null {
  if (!summaryVi || !summaryVi.trim()) return null;
  const trimmed = summaryVi.trim();
  if (!trimmed.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(trimmed) as Partial<ConversationReport>;
    if (
      typeof parsed.overallScore === 'number' &&
      parsed.scores &&
      typeof parsed.headlineVi === 'string'
    ) {
      return parsed as ConversationReport;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildFallbackConversationReport(params: {
  displayName?: string;
  englishLevel: EnglishLevel;
  userTurns: number;
}): ConversationReport {
  const cefrMap: Record<EnglishLevel, string> = {
    'A0-A1': 'A1',
    'A2-B1': 'A2',
    'B2+': 'B2',
  };
  return {
    overallScore: params.userTurns > 0 ? 75 : 0,
    cefrEstimate: cefrMap[params.englishLevel] || 'A1',
    scores: {
      pronunciation: params.userTurns > 0 ? 74 : 0,
      fluency: params.userTurns > 0 ? 75 : 0,
      grammar: params.userTurns > 0 ? 75 : 0,
      vocabulary: params.userTurns > 0 ? 76 : 0,
    },
    headlineVi:
      params.userTurns > 0
        ? `Khởi đầu rất tốt, ${params.displayName || 'bạn'}!`
        : 'Bạn vừa nghe thử phần mở đầu cuộc gọi',
    overviewVi:
      params.userTurns > 0
        ? 'Bạn đã hoàn thành buổi luyện nói. Hãy tiếp tục duy trì thói quen nói 5–15 phút mỗi ngày để phản xạ tự nhiên hơn.'
        : 'Cuộc gọi kết thúc trước khi bạn trả lời lượt đầu tiên. Lần tới hãy bấm Micro hoặc chọn 1 câu gợi ý để trò chuyện cùng AI nhé!',
    strengthsVi:
      params.userTurns > 0
        ? ['Dám mở lời và hoàn thành buổi luyện tập']
        : ['Đã làm quen với giao diện cuộc gọi và giọng đọc bản xứ'],
    improvementsVi: [
      params.userTurns > 0
        ? 'Thử nói thêm 4–6 lượt mỗi cuộc gọi để AI đánh giá chi tiết hơn'
        : 'Hãy bấm nút Micro và thử đọc theo 1 trong 3 câu gợi ý sẵn ở cuối màn hình',
    ],
    topCorrections: [],
    recommendedPhrases: [],
    nextStepVi:
      'Bắt đầu lại tình huống này và nói ít nhất 3 câu bằng Micro để nhận điểm phát âm chi tiết.',
    generatedAt: new Date().toISOString(),
  };
}
