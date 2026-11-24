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

export const TUTOR_TEXT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    userTranscript: {
      type: Type.STRING,
      description: 'What the learner typed or said.',
    },
    naturalRewrite: {
      type: Type.STRING,
      nullable: true,
      description:
        'More natural native phrasing if needed; null if already natural or on start.',
    },
    coachingTip: {
      type: Type.STRING,
      nullable: true,
      description: 'One short encouraging Vietnamese tip (max 20 words); null on start.',
    },
    aiReplyEn: {
      type: Type.STRING,
      description: 'Short natural conversational reply in English (1-2 crisp sentences, max 32 words).',
    },
    aiReplyVi: {
      type: Type.STRING,
      description: 'Natural Vietnamese translation of aiReplyEn.',
    },
    replyHints: {
      type: Type.ARRAY,
      description: '3 short suggested replies from easiest to more expressive.',
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
  required: ['userTranscript', 'aiReplyEn', 'aiReplyVi', 'replyHints'],
};

export const TUTOR_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    ...(TUTOR_TEXT_RESPONSE_SCHEMA.properties ?? {}),
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

/**
 * Sanitizes user-supplied profile/topic strings interpolated into LLM prompts
 * to prevent prompt-injection control sequences, line breaks, and excessive length.
 */
export function sanitizePromptField(
  raw: string | null | undefined,
  maxLength = 120
): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/```+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
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
  const userName = sanitizePromptField(profile.displayName, 40) || 'bạn';
  const safeJob = sanitizePromptField(profile.jobField, 80);
  const safeHobbies = (profile.hobbies ?? [])
    .map((h) => sanitizePromptField(h, 40))
    .filter(Boolean)
    .slice(0, 8);
  const jobInfo = safeJob
    ? `User's job/field: ${safeJob}.`
    : 'User has not specified a job yet.';
  const hobbiesInfo =
    safeHobbies.length > 0
      ? `User's hobbies/favorite topics: ${safeHobbies.join(', ')}.`
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
    .slice(-6)
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
      'Listen to the attached audio. 1) Transcribe faithfully in userTranscript (if silent write "[Chưa nghe rõ tiếng]"). 2) Score spoken English in pronunciation (overallScore, accuracyScore, fluencyScore, intonationScore, short summaryVi, wordFeedback up to 12 key words noting ending sounds /s/ /t/ /d/ /k/ & stress; if silent score 0-15). 3) Give concise naturalRewrite + 1-sentence Vietnamese coachingTip. 4) Reply briefly (1-2 sentences) in aiReplyEn + aiReplyVi + 3 short replyHints.'
    );
  } else {
    parts.push(`Learner said: "${userText ?? ''}"`);
    parts.push(
      'Reply naturally in 1-2 crisp sentences (aiReplyEn + aiReplyVi), concise naturalRewrite + 1-sentence Vietnamese coachingTip if improvable, and 3 short replyHints.'
    );
  }

  return parts.join('\n\n');
}

/**
 * Generates an instant (<1ms) personalized, natural native opening turn for built-in scenarios
 * so learners never wait 5-8 seconds on an LLM round-trip just to hear the first greeting.
 */
export function buildInstantScenarioOpening(params: {
  scenario: Scenario;
  persona: AiPersona;
  displayName?: string;
  englishLevel?: EnglishLevel;
  hobbies?: string[];
  jobField?: string;
}): TutorTurnOutput {
  const name = sanitizePromptField(params.displayName, 30) || 'there';
  const greetingName = name === 'Bạn' || name === 'bạn' ? 'there' : name;
  const firstHobby = sanitizePromptField(params.hobbies?.[0], 30);
  const safeJob = sanitizePromptField(params.jobField, 40);
  const isUk = params.persona.accent === 'UK';
  const isAu = params.persona.accent === 'AU';
  const hello = isAu ? 'Hey' : isUk ? 'Hi' : 'Hey';

  const openings: Record<string, Omit<TutorTurnOutput, 'userTranscript' | 'naturalRewrite' | 'pronunciation'>> = {
    'daily-coffee-shop': {
      aiReplyEn: `${hello} ${greetingName}! Welcome in. What can I get started for you today — coffee or something cold?`,
      aiReplyVi: `Chào ${name}! Mời bạn vào quán. Hôm nay bạn muốn gọi gì nào — cà phê nóng hay đồ uống lạnh?`,
      coachingTip:
        'Mẹo nhỏ: Hãy trả lời tự nhiên 1 câu ngắn (hoặc bấm vào gợi ý bên dưới để tập đọc theo).',
      replyHints: [
        { en: 'Can I get an iced latte, please?', vi: 'Cho mình một ly latte đá nhé?', phonetic: 'ken ai gét ân ai-st lá-tê, p-li-z' },
        { en: "I'd love a hot americano, medium size.", vi: 'Mình muốn một ly americano nóng, cỡ vừa.', phonetic: 'aid lav ơ hót ơ-me-ri-ca-nô, mi-đi-ầm sai-z' },
        { en: 'What do you recommend today?', vi: 'Hôm nay quán có món gì ngon bạn gợi ý không?', phonetic: 'uắt đu du re-cơ-men tu-đây?' },
      ],
    },
    'daily-small-talk': {
      aiReplyEn: firstHobby
        ? `${hello} ${greetingName}! Nice to meet you — I'm ${params.persona.name}. How's your day going, still finding time for ${firstHobby}?`
        : `${hello} ${greetingName}! So nice to meet you — I'm ${params.persona.name}. How's your day going so far?`,
      aiReplyVi: firstHobby
        ? `Chào ${name}! Rất vui được gặp bạn — mình là ${params.persona.name}. Hôm nay của bạn thế nào, vẫn dành thời gian cho ${firstHobby} chứ?`
        : `Chào ${name}! Rất vui được gặp bạn — mình là ${params.persona.name}. Hôm nay của bạn thế nào rồi?`,
      coachingTip: 'Cứ nói thoải mái như trò chuyện cùng bạn bè, chậm một chút cũng hoàn toàn ổn nhé!',
      replyHints: [
        { en: "I'm doing great, thanks! How about you?", vi: 'Mình rất ổn, cảm ơn bạn! Còn bạn thì sao?', phonetic: 'am đu-ing g-rây-t, thenks! hao ơ-bao du?' },
        { en: 'Pretty busy today, honestly, but glad to chat!', vi: 'Hôm nay hơi bận chút nhưng rất vui được trò chuyện!', phonetic: 'pờ-rít-ti bí-di tu-đây, ó-nìst-li!' },
        { en: "It's been a chill day so far.", vi: 'Hôm nay khá nhẹ nhàng thư thái.', phonetic: 'ít-s bin ơ chiu đây sâu pha.' },
      ],
    },
    'daily-weekend': {
      aiReplyEn: `${hello} ${greetingName}! Happy almost-weekend! Got any fun plans or movies lined up?`,
      aiReplyVi: `Chào ${name}! Sắp đến cuối tuần rồi! Bạn có kế hoạch vui hay bộ phim nào định xem chưa?`,
      coachingTip: 'Dùng "I\'m planning to..." hoặc "I might..." nghe rất tự nhiên khi nói về dự định cuối tuần.',
      replyHints: [
        { en: "I'm planning to relax and watch a movie.", vi: 'Mình định nghỉ ngơi và xem một bộ phim.', phonetic: 'am p-len-ning tu ri-léc en uắt-ch ơ mu-vi' },
        { en: 'I might grab coffee with some friends.', vi: 'Chắc mình sẽ đi cà phê với vài người bạn.', phonetic: 'ai mai-t g-rép có-phi uýt săm ph-ren-z' },
        { en: 'Nothing big yet — what about you?', vi: 'Chưa có kế hoạch lớn nào — còn bạn thì sao?', phonetic: 'ná-thinh bích dét — uắt ơ-bao du?' },
      ],
    },
    'business-intro': {
      aiReplyEn: safeJob
        ? `${hello} ${greetingName}, great to connect! I'm ${params.persona.name}. I heard you work in ${safeJob} — what does your day-to-day look like?`
        : `${hello} ${greetingName}, great to meet you! I'm ${params.persona.name}. Could you tell me a bit about what you do?`,
      aiReplyVi: safeJob
        ? `Chào ${name}, rất vui được kết nối! Mình là ${params.persona.name}. Nghe nói bạn làm mảng ${safeJob} — công việc hàng ngày của bạn thế nào?`
        : `Chào ${name}, rất vui được gặp bạn! Mình là ${params.persona.name}. Bạn giới thiệu ngắn về công việc của mình nhé?`,
      coachingTip: 'Mở đầu công sở ngắn gọn bằng "I work as a..." hoặc "I\'m responsible for..." rất chuyên nghiệp.',
      replyHints: [
        { en: "Nice to meet you! I'm currently working in tech.", vi: 'Rất vui được gặp bạn! Hiện mình đang làm trong ngành công nghệ.', phonetic: 'nai-s tu mít du! am cơ-rơnt-li uơ-king in téc' },
        { en: "Thanks for having me! I focus mostly on daily operations.", vi: 'Cảm ơn bạn! Mình tập trung chính vào vận hành hàng ngày.', phonetic: 'thenks pho hé-vinh mi! ai phô-cớt mâu-s-li...' },
        { en: 'Great to connect! Let me give you a quick intro.', vi: 'Rất vui được kết nối! Để mình giới thiệu nhanh nhé.', phonetic: 'g-rây-t tu cơ-néc! lét mi gív du ơ quýc in-trô' },
      ],
    },
    'business-standup': {
      aiReplyEn: `Morning ${greetingName}! Ready for our quick standup? What did you wrap up yesterday, and what's on your plate today?`,
      aiReplyVi: `Chào buổi sáng ${name}! Sẵn sàng họp nhanh chưa? Hôm qua bạn hoàn thành gì và hôm nay ưu tiên việc nào?`,
      coachingTip: 'Cấu trúc họp Standup gọn nhất: "Yesterday I finished... Today I\'m working on..."',
      replyHints: [
        { en: "Yesterday I finished the report. Today I'm starting a new task.", vi: 'Hôm qua mình xong báo cáo. Hôm nay mình bắt đầu đầu việc mới.', phonetic: 'yét-tơ-đây ai phí-nít đơ ri-pót...' },
        { en: "I'm still working on the update, no blockers so far.", vi: 'Mình vẫn đang làm phần cập nhật, hiện không có vướng mắc gì.', phonetic: 'am s-tiu uơ-king on đơ áp-đết, nâu b-lóc-cơz' },
        { en: 'Everything is on track, just need a quick review later.', vi: 'Mọi thứ đúng tiến độ, lát nữa nhờ bạn xem nhanh giúp nhé.', phonetic: 'e-vri-thinh iz on t-réc...' },
      ],
    },
    'business-interview': {
      aiReplyEn: `Hi ${greetingName}, thanks so much for joining today! I'm ${params.persona.name}. To kick things off, could you tell me a little about yourself?`,
      aiReplyVi: `Chào ${name}, cảm ơn bạn đã tham gia hôm nay! Mình là ${params.persona.name}. Để mở đầu, bạn giới thiệu đôi nét về bản thân nhé?`,
      coachingTip: 'Trả lời phỏng vấn tự tin trong 2 câu: công việc/kinh nghiệm hiện tại + điều bạn hào hứng nhất.',
      replyHints: [
        { en: "Thank you for the opportunity! I have two years of experience.", vi: 'Cảm ơn anh/chị đã trao cơ hội! Mình có hai năm kinh nghiệm.', phonetic: 'thenk du pho đi óp-pơ-tiu-ni-ti!' },
        { en: "I'm excited to be here. I enjoy solving practical problems.", vi: 'Mình rất hào hứng có mặt hôm nay. Mình thích giải quyết bài toán thực tế.', phonetic: 'am íc-sai-tịt tu bi hia...' },
        { en: 'Sure! I currently work as a specialist and love learning fast.', vi: 'Chắc chắn rồi! Hiện mình đang làm chuyên viên và học hỏi rất nhanh.', phonetic: 'sua! ai cơ-rơnt-li uớc ez ơ s-pe-sơ-lít' },
      ],
    },
    'business-presentation': {
      aiReplyEn: `Hey ${greetingName}, thanks for setting this up! Whenever you're ready, walk me through your main idea in a couple of sentences.`,
      aiReplyVi: `Chào ${name}, cảm ơn bạn đã hẹn buổi này! Khi nào sẵn sàng, bạn trình bày nhanh ý tưởng chính trong vài câu nhé.`,
      coachingTip: 'Dùng "The main goal is to..." giúp người nghe nắm ngay trọng tâm thuyết trình.',
      replyHints: [
        { en: 'The main goal is to save our team time every week.', vi: 'Mục tiêu chính là tiết kiệm thời gian cho cả nhóm mỗi tuần.', phonetic: 'đơ mên gâu iz tu sê-v ao-ơ tim tai-m' },
        { en: 'I have a quick proposal to improve our workflow.', vi: 'Mình có một đề xuất nhỏ giúp cải thiện quy trình làm việc.', phonetic: 'ai hév ơ quýc p-rơ-pô-dồ...' },
        { en: 'Let me share two key points first.', vi: 'Để mình chia sẻ hai ý chính trước nhé.', phonetic: 'lét mi sea tu ki poi-nts phớt' },
      ],
    },
    'travel-airport': {
      aiReplyEn: `Hello! Welcome to the check-in counter. May I see your passport and where are you flying to today?`,
      aiReplyVi: `Xin chào! Chào mừng đến quầy làm thủ tục. Cho tôi xem hộ chiếu và hôm nay bạn bay đi đâu nhỉ?`,
      coachingTip: 'Ở sân bay chỉ cần trả lời ngắn rõ: điểm đến + loại ghế bạn muốn (window/aisle seat).',
      replyHints: [
        { en: "Here's my passport. I'm flying to Singapore today.", vi: 'Đây là hộ chiếu của tôi. Hôm nay tôi bay đi Singapore.', phonetic: 'hia-z mai pát-s-pót. am ph-lai-inh tu Sin-ga-po' },
        { en: 'Could I have a window seat, please?', vi: 'Cho tôi xin ghế gần cửa sổ được không?', phonetic: 'cút ai hév ơ uin-đâu sít, p-li-z?' },
        { en: 'I just have one carry-on bag.', vi: 'Tôi chỉ có một hành lý xách tay thôi.', phonetic: 'ai chớt hév uăn ke-ri-on béc' },
      ],
    },
    'travel-restaurant': {
      aiReplyEn: `Good evening! Welcome in — right this way. Would you like to start with something to drink while you look at the menu?`,
      aiReplyVi: `Chào buổi tối! Mời bạn vào bàn. Bạn có muốn gọi đồ uống trước trong lúc xem thực đơn không?`,
      coachingTip: 'Cụm "Could I get..." hoặc "Just water for now, please" dùng được ở mọi nhà hàng nước ngoài.',
      replyHints: [
        { en: 'Just still water for now, please.', vi: 'Tạm thời cho mình nước lọc trước nhé.', phonetic: 'chớt s-tiu uó-tơ pho nao, p-li-z' },
        { en: 'Could I get an orange juice, please?', vi: 'Cho mình một ly nước cam nhé?', phonetic: 'cút ai gét ân ó-rin-ch chu-s, p-li-z?' },
        { en: "What's your most popular dish here?", vi: 'Món nào nổi tiếng nhất ở nhà hàng mình vậy?', phonetic: 'uắt-s do mâu-st pó-piu-lơ đít hia?' },
      ],
    },
    'travel-hotel': {
      aiReplyEn: `Welcome to the hotel! Do you have a reservation under your name today?`,
      aiReplyVi: `Chào mừng quý khách đến khách sạn! Hôm nay bạn có đặt phòng trước theo tên không?`,
      coachingTip: 'Câu cửa miệng khi check-in khách sạn: "Yes, I have a reservation under..."',
      replyHints: [
        { en: `Yes, I have a reservation under ${greetingName}.`, vi: `Có, tôi có đặt phòng dưới tên ${name}.`, phonetic: 'yes, ai hév ơ re-dơ-vây-sần ăn-đơ...' },
        { en: 'Yes, for two nights. Is breakfast included?', vi: 'Có, mình đặt hai đêm. Đã bao gồm bữa sáng chưa nhỉ?', phonetic: 'yes, pho tu nai-ts. iz b-réc-phớt in-c-lu-địt?' },
        { en: 'Could I also get the Wi-Fi password?', vi: 'Cho mình xin luôn mật khẩu Wi-Fi nhé?', phonetic: 'cút ai o-sâu gét đơ uai-phai pát-uớt?' },
      ],
    },
    'free-talk-custom': {
      aiReplyEn: `${hello} ${greetingName}! Good to hear your voice. What's on your mind today — anything fun happening?`,
      aiReplyVi: `Chào ${name}! Rất vui được nghe giọng bạn. Hôm nay bạn muốn tâm sự hay bàn về chuyện gì nào?`,
      coachingTip: 'Chế độ tự do: bạn muốn nói chủ đề gì cũng được, cứ bấm Micro và nói tự nhiên nhé!',
      replyHints: [
        { en: 'I had an interesting day at work today.', vi: 'Hôm nay mình có một ngày đi làm khá thú vị.', phonetic: 'ai hét ân in-tơ-rét-tinh đây ét uớc' },
        { en: 'Let’s talk about travel and dream destinations!', vi: 'Mình nói chuyện về du lịch và điểm đến mơ ước nhé!', phonetic: 'lét-s tóc ơ-bao t-re-vồ!' },
        { en: 'Just wanted to practice speaking English for ten minutes.', vi: 'Mình chỉ muốn luyện nói tiếng Anh mười phút thôi.', phonetic: 'chớt uón-tịt tu p-réc-tít s-pí-kinh' },
      ],
    },
  };

  const picked = openings[params.scenario.id] ?? {
    aiReplyEn: `${hello} ${greetingName}! Welcome to "${params.scenario.titleEn}". Ready to jump right in?`,
    aiReplyVi: `Chào ${name}! Chào mừng đến tình huống "${params.scenario.titleVi}". Sẵn sàng bắt đầu luôn nhé?`,
    coachingTip: 'Hãy trả lời 1–2 câu ngắn tự nhiên hoặc bấm câu gợi ý bên dưới.',
    replyHints: [
      { en: "Yes, I'm ready! Let's get started.", vi: 'Vâng, mình sẵn sàng rồi! Bắt đầu nhé.', phonetic: 'yes, am re-đi! lét-s gét s-tá-tịt' },
      { en: 'Sure! Could we start a bit slow?', vi: 'Chắc chắn rồi! Mình nói chậm chút được không?', phonetic: 'sua! cút uy s-tát ơ bít s-lâu?' },
      { en: 'Sounds great — go ahead!', vi: 'Nghe hay đấy — mời bạn bắt đầu trước!', phonetic: 'sao-z g-rây-t — gâu ơ-hét!' },
    ],
  };

  return {
    userTranscript: '[Bắt đầu cuộc gọi]',
    naturalRewrite: null,
    pronunciation: null,
    ...picked,
  };
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
