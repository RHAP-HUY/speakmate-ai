export type EnglishLevel = 'A0-A1' | 'A2-B1' | 'B2+';

export type ConcreteAccent = 'US' | 'UK' | 'AU' | 'CA';
export type AccentPreference = ConcreteAccent | 'MIXED';

export type TopicCategory = 'daily' | 'business' | 'travel' | 'freetalk';

export type ApiKeyMode = 'system' | 'personal';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  englishLevel: EnglishLevel;
  jobField: string;
  hobbies: string[];
  preferredAccent: AccentPreference;
  preferredSpeed: number;
  dailyGoalMinutes: number;
  streakDays: number;
  lastPracticeDate: string | null;
  onboardingCompleted: boolean;
  apiKeyMode: ApiKeyMode;
  personalKeyHint?: string | null;
}

export interface ReplyHint {
  en: string;
  vi: string;
  phonetic?: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  englishText: string;
  vietnameseTranslation?: string | null;
  naturalRewrite?: string | null;
  coachingTip?: string | null;
  replyHints?: ReplyHint[];
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  topicCategory: TopicCategory;
  accent: ConcreteAccent;
  aiPersona: string;
  level: EnglishLevel;
  durationSeconds: number;
  messageCount: number;
  summaryVi?: string | null;
  startedAt: string;
  endedAt?: string | null;
}

export interface SavedPhrase {
  id: string;
  englishPhrase: string;
  vietnameseMeaning: string;
  phonetic?: string | null;
  exampleSentence?: string | null;
  category: TopicCategory | string;
  accent: ConcreteAccent;
  masteryLevel: 0 | 1 | 2 | 3;
  createdAt: string;
}

export interface DailyStat {
  practiceDate: string;
  secondsPracticed: number;
  messagesSent: number;
  sessionsCompleted: number;
}

export interface Scenario {
  id: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  category: TopicCategory;
  recommendedLevel: EnglishLevel;
  starterContext: string;
  emoji: string;
}

export interface AiPersona {
  id: string;
  name: string;
  accent: ConcreteAccent;
  accentLabel: string;
  flag: string;
  edgeVoice: string;
  browserLang: string;
  gender: 'female' | 'male';
  taglineVi: string;
  gradient: string;
}

export interface StarterPhrase {
  id: string;
  english: string;
  vietnamese: string;
  phonetic: string;
  example: string;
  category: Exclude<TopicCategory, 'freetalk'>;
}
