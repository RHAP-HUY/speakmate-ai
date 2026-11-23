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
  longestStreak: number;
  lastPracticeDate: string | null;
  onboardingCompleted: boolean;
  apiKeyMode: ApiKeyMode;
  personalKeyHint?: string | null;
  // Gamification & Rewards
  xp: number;
  gems: number;
  streakFreezes: number;
  claimedMilestones: number[];
  unlockedBadges: string[];
  activeBadge: string | null;
  totalLessonsCompleted: number;
}

export interface ReplyHint {
  en: string;
  vi: string;
  phonetic?: string;
}

export type PronunciationWordStatus = 'good' | 'improve' | 'missing';

export interface PronunciationWordFeedback {
  word: string;
  status: PronunciationWordStatus;
  ipa?: string;
  tipVi?: string;
}

export interface PronunciationAssessment {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  intonationScore: number;
  summaryVi: string;
  wordFeedback: PronunciationWordFeedback[];
}

export interface PronunciationPracticeResult extends PronunciationAssessment {
  targetSentence: string;
  heardTranscript: string;
  linkingTipVi?: string | null;
}

export interface ReportMistakeItem {
  original: string;
  better: string;
  explanationVi: string;
}

export interface ReportKeyPhrase {
  en: string;
  vi: string;
  phonetic?: string;
}

export interface ConversationReport {
  overallScore: number;
  cefrEstimate: string;
  scores: {
    pronunciation: number;
    fluency: number;
    grammar: number;
    vocabulary: number;
  };
  headlineVi: string;
  overviewVi: string;
  strengthsVi: string[];
  improvementsVi: string[];
  topCorrections: ReportMistakeItem[];
  recommendedPhrases: ReportKeyPhrase[];
  nextStepVi: string;
  generatedAt: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  englishText: string;
  vietnameseTranslation?: string | null;
  naturalRewrite?: string | null;
  coachingTip?: string | null;
  replyHints?: ReplyHint[];
  pronunciation?: PronunciationAssessment | null;
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
  lessonsCompleted: number;
  xpEarned: number;
  freezeUsed?: boolean;
}

export interface StreakMilestone {
  days: number;
  titleVi: string;
  subtitleVi: string;
  emoji: string;
  rewardXp: number;
  rewardGems: number;
  rewardFreezes: number;
  badgeId: string;
  badgeLabel: string;
  gradient: string;
}

export interface ShopRewardItem {
  id: string;
  type: 'freeze' | 'badge';
  titleVi: string;
  descVi: string;
  emoji: string;
  costGems: number;
  badgeId?: string;
  badgeLabel?: string;
}

export interface LessonRewardSummary {
  lessonCompleted: boolean;
  streakKeptToday: boolean;
  streakDays: number;
  longestStreak: number;
  xpEarned: number;
  gemsEarned: number;
  leveledUp: boolean;
  newLevel: number;
  newlyClaimableMilestones: number[];
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
