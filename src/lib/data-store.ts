import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type {
  AccentPreference,
  ConcreteAccent,
  ConversationRecord,
  DailyStat,
  EnglishLevel,
  SavedPhrase,
  TopicCategory,
  TutorMessage,
  UserProfile,
} from '@/types';

const STORAGE_KEYS = {
  profile: 'speakmate_local_profile_v1',
  conversations: 'speakmate_local_conversations_v1',
  messagesPrefix: 'speakmate_local_messages_v1_',
  phrases: 'speakmate_local_phrases_v1',
  dailyStats: 'speakmate_local_stats_v1',
  personalApiKey: 'speakmate_personal_gemini_key_v1',
};

export function getTodayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

export function getLocalPersonalKey(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEYS.personalApiKey);
}

export function setLocalPersonalKey(key: string | null): void {
  if (typeof window === 'undefined') return;
  if (!key || !key.trim()) {
    window.localStorage.removeItem(STORAGE_KEYS.personalApiKey);
  } else {
    window.localStorage.setItem(STORAGE_KEYS.personalApiKey, key.trim());
  }
}

function defaultLocalProfile(): UserProfile {
  return {
    id: 'local-demo-user',
    email: 'demo@local',
    displayName: '',
    englishLevel: 'A0-A1',
    jobField: '',
    hobbies: [],
    preferredAccent: 'US',
    preferredSpeed: 0.85,
    dailyGoalMinutes: 15,
    streakDays: 0,
    lastPracticeDate: null,
    onboardingCompleted: false,
    apiKeyMode: 'system',
    personalKeyHint: null,
  };
}

function mapDbProfile(
  row: Record<string, unknown>,
  keyHint?: string | null
): UserProfile {
  return {
    id: String(row.id ?? ''),
    email: String(row.email ?? ''),
    displayName: String(row.display_name ?? ''),
    englishLevel: (row.english_level as EnglishLevel) || 'A0-A1',
    jobField: String(row.job_field ?? ''),
    hobbies: Array.isArray(row.hobbies) ? (row.hobbies as string[]) : [],
    preferredAccent: (row.preferred_accent as AccentPreference) || 'US',
    preferredSpeed: Number(row.preferred_speed ?? 0.85),
    dailyGoalMinutes: Number(row.daily_goal_minutes ?? 15),
    streakDays: Number(row.streak_days ?? 0),
    lastPracticeDate: row.last_practice_date
      ? String(row.last_practice_date)
      : null,
    onboardingCompleted: Boolean(row.onboarding_completed),
    apiKeyMode: row.api_key_mode === 'personal' ? 'personal' : 'system',
    personalKeyHint: keyHint ?? null,
  };
}

export async function getCurrentProfile(): Promise<{
  profile: UserProfile | null;
  isCloud: boolean;
  authenticated: boolean;
}> {
  if (!isSupabaseConfigured()) {
    const local = readLocalJson<UserProfile | null>(STORAGE_KEYS.profile, null);
    return {
      profile: local ?? defaultLocalProfile(),
      isCloud: false,
      authenticated: true,
    };
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { profile: null, isCloud: true, authenticated: false };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, isCloud: true, authenticated: false };
  }

  const [{ data: row }, { data: keyRow }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('user_api_keys')
      .select('key_hint')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (!row) {
    const fallbackName =
      String(user.user_metadata?.display_name ?? '') ||
      String(user.user_metadata?.full_name ?? '') ||
      '';
    const { data: inserted } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        display_name: fallbackName,
      })
      .select('*')
      .single();

    return {
      profile: inserted
        ? mapDbProfile(inserted, keyRow?.key_hint ?? null)
        : null,
      isCloud: true,
      authenticated: true,
    };
  }

  return {
    profile: mapDbProfile(row, keyRow?.key_hint ?? null),
    isCloud: true,
    authenticated: true,
  };
}

export async function saveProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!isSupabaseConfigured()) {
    const current = readLocalJson<UserProfile>(
      STORAGE_KEYS.profile,
      defaultLocalProfile()
    );
    const next = { ...current, ...updates };
    writeLocalJson(STORAGE_KEYS.profile, next);
    return next;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase client unavailable');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Bạn chưa đăng nhập.');
  }

  const dbPayload: Record<string, unknown> = { id: user.id };
  if (updates.displayName !== undefined)
    dbPayload.display_name = updates.displayName;
  if (updates.englishLevel !== undefined)
    dbPayload.english_level = updates.englishLevel;
  if (updates.jobField !== undefined) dbPayload.job_field = updates.jobField;
  if (updates.hobbies !== undefined) dbPayload.hobbies = updates.hobbies;
  if (updates.preferredAccent !== undefined)
    dbPayload.preferred_accent = updates.preferredAccent;
  if (updates.preferredSpeed !== undefined)
    dbPayload.preferred_speed = updates.preferredSpeed;
  if (updates.dailyGoalMinutes !== undefined)
    dbPayload.daily_goal_minutes = updates.dailyGoalMinutes;
  if (updates.onboardingCompleted !== undefined)
    dbPayload.onboarding_completed = updates.onboardingCompleted;
  if (updates.apiKeyMode !== undefined)
    dbPayload.api_key_mode = updates.apiKeyMode;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(dbPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return mapDbProfile(data);
}

export async function createConversationRecord(params: {
  scenarioId: string;
  scenarioTitle: string;
  topicCategory: TopicCategory;
  accent: ConcreteAccent;
  aiPersona: string;
  level: EnglishLevel;
}): Promise<ConversationRecord> {
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const record: ConversationRecord = {
      id: crypto.randomUUID(),
      scenarioId: params.scenarioId,
      scenarioTitle: params.scenarioTitle,
      topicCategory: params.topicCategory,
      accent: params.accent,
      aiPersona: params.aiPersona,
      level: params.level,
      durationSeconds: 0,
      messageCount: 0,
      summaryVi: null,
      startedAt: nowIso,
      endedAt: null,
    };
    const existing = readLocalJson<ConversationRecord[]>(
      STORAGE_KEYS.conversations,
      []
    );
    writeLocalJson(STORAGE_KEYS.conversations, [record, ...existing]);
    return record;
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      scenario_id: params.scenarioId,
      scenario_title: params.scenarioTitle,
      topic_category: params.topicCategory,
      accent: params.accent,
      ai_persona: params.aiPersona,
      level: params.level,
    })
    .select('*')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    scenarioId: data.scenario_id,
    scenarioTitle: data.scenario_title,
    topicCategory: data.topic_category as TopicCategory,
    accent: data.accent as ConcreteAccent,
    aiPersona: data.ai_persona,
    level: data.level as EnglishLevel,
    durationSeconds: data.duration_seconds,
    messageCount: data.message_count,
    summaryVi: data.summary_vi,
    startedAt: data.started_at,
    endedAt: data.ended_at,
  };
}

export async function appendConversationMessages(
  conversationId: string,
  messages: TutorMessage[]
): Promise<void> {
  if (messages.length === 0) return;

  if (!isSupabaseConfigured()) {
    const existing = readLocalJson<TutorMessage[]>(
      `${STORAGE_KEYS.messagesPrefix}${conversationId}`,
      []
    );
    writeLocalJson(`${STORAGE_KEYS.messagesPrefix}${conversationId}`, [
      ...existing,
      ...messages,
    ]);
    return;
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = messages.map((m) => ({
    conversation_id: conversationId,
    user_id: user.id,
    role: m.role,
    english_text: m.englishText,
    vietnamese_translation: m.vietnameseTranslation ?? null,
    natural_rewrite: m.naturalRewrite ?? null,
    coaching_tip: m.coachingTip ?? null,
    reply_hints: m.replyHints ?? [],
    pronunciation: m.pronunciation ?? null,
  }));

  const { error } = await supabase.from('messages').insert(rows);
  if (error && error.message?.toLowerCase().includes('pronunciation')) {
    // Graceful fallback if existing Supabase DB hasn't run the pronunciation column migration yet
    const legacyRows = rows.map((row) => ({
      conversation_id: row.conversation_id,
      user_id: row.user_id,
      role: row.role,
      english_text: row.english_text,
      vietnamese_translation: row.vietnamese_translation,
      natural_rewrite: row.natural_rewrite,
      coaching_tip: row.coaching_tip,
      reply_hints: row.reply_hints,
    }));
    await supabase.from('messages').insert(legacyRows);
  }
}

export async function finishConversationRecord(params: {
  conversationId: string;
  durationSeconds: number;
  messageCount: number;
  userMessagesSent: number;
  summaryVi?: string | null;
}): Promise<void> {
  const today = getTodayLocalDate();
  const yesterday = getYesterdayLocalDate();
  const safeDuration = Math.max(0, Math.round(params.durationSeconds));

  if (!isSupabaseConfigured()) {
    const convs = readLocalJson<ConversationRecord[]>(
      STORAGE_KEYS.conversations,
      []
    );
    writeLocalJson(
      STORAGE_KEYS.conversations,
      convs.map((c) =>
        c.id === params.conversationId
          ? {
              ...c,
              durationSeconds: safeDuration,
              messageCount: params.messageCount,
              summaryVi:
                params.summaryVi !== undefined ? params.summaryVi : c.summaryVi,
              endedAt: new Date().toISOString(),
            }
          : c
      )
    );

    const stats = readLocalJson<DailyStat[]>(STORAGE_KEYS.dailyStats, []);
    const existingToday = stats.find((s) => s.practiceDate === today);
    const updatedStats = existingToday
      ? stats.map((s) =>
          s.practiceDate === today
            ? {
                ...s,
                secondsPracticed: s.secondsPracticed + safeDuration,
                messagesSent: s.messagesSent + params.userMessagesSent,
                sessionsCompleted: s.sessionsCompleted + 1,
              }
            : s
        )
      : [
          {
            practiceDate: today,
            secondsPracticed: safeDuration,
            messagesSent: params.userMessagesSent,
            sessionsCompleted: 1,
          },
          ...stats,
        ];
    writeLocalJson(STORAGE_KEYS.dailyStats, updatedStats);

    const profile = readLocalJson<UserProfile>(
      STORAGE_KEYS.profile,
      defaultLocalProfile()
    );
    let nextStreak = profile.streakDays;
    if (profile.lastPracticeDate === yesterday) {
      nextStreak = profile.streakDays + 1;
    } else if (profile.lastPracticeDate !== today) {
      nextStreak = 1;
    }
    writeLocalJson(STORAGE_KEYS.profile, {
      ...profile,
      streakDays: nextStreak,
      lastPracticeDate: today,
    });
    return;
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updatePayload: Record<string, unknown> = {
    duration_seconds: safeDuration,
    message_count: params.messageCount,
    ended_at: new Date().toISOString(),
  };
  if (params.summaryVi !== undefined) {
    updatePayload.summary_vi = params.summaryVi;
  }

  await supabase
    .from('conversations')
    .update(updatePayload)
    .eq('id', params.conversationId)
    .eq('user_id', user.id);

  const { data: todayRow } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('practice_date', today)
    .maybeSingle();

  if (todayRow) {
    await supabase
      .from('daily_stats')
      .update({
        seconds_practiced: (todayRow.seconds_practiced ?? 0) + safeDuration,
        messages_sent: (todayRow.messages_sent ?? 0) + params.userMessagesSent,
        sessions_completed: (todayRow.sessions_completed ?? 0) + 1,
      })
      .eq('id', todayRow.id);
  } else {
    await supabase.from('daily_stats').insert({
      user_id: user.id,
      practice_date: today,
      seconds_practiced: safeDuration,
      messages_sent: params.userMessagesSent,
      sessions_completed: 1,
    });
  }

  const { data: prof } = await supabase
    .from('profiles')
    .select('streak_days, last_practice_date')
    .eq('id', user.id)
    .maybeSingle();

  if (prof) {
    let nextStreak = Number(prof.streak_days ?? 0);
    if (prof.last_practice_date === yesterday) {
      nextStreak += 1;
    } else if (prof.last_practice_date !== today) {
      nextStreak = 1;
    }
    await supabase
      .from('profiles')
      .update({
        streak_days: nextStreak,
        last_practice_date: today,
      })
      .eq('id', user.id);
  }
}

export async function updateConversationSummary(
  conversationId: string,
  summaryVi: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const convs = readLocalJson<ConversationRecord[]>(
      STORAGE_KEYS.conversations,
      []
    );
    writeLocalJson(
      STORAGE_KEYS.conversations,
      convs.map((c) => (c.id === conversationId ? { ...c, summaryVi } : c))
    );
    return;
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('conversations')
    .update({ summary_vi: summaryVi })
    .eq('id', conversationId)
    .eq('user_id', user.id);
}

export async function listConversations(): Promise<ConversationRecord[]> {
  if (!isSupabaseConfigured()) {
    return readLocalJson<ConversationRecord[]>(STORAGE_KEYS.conversations, []);
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(40);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    topicCategory: row.topic_category as TopicCategory,
    accent: row.accent as ConcreteAccent,
    aiPersona: row.ai_persona,
    level: row.level as EnglishLevel,
    durationSeconds: row.duration_seconds,
    messageCount: row.message_count,
    summaryVi: row.summary_vi,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }));
}

export async function getConversationDetail(conversationId: string): Promise<{
  conversation: ConversationRecord | null;
  messages: TutorMessage[];
}> {
  if (!isSupabaseConfigured()) {
    const convs = readLocalJson<ConversationRecord[]>(
      STORAGE_KEYS.conversations,
      []
    );
    const conversation = convs.find((c) => c.id === conversationId) ?? null;
    const messages = readLocalJson<TutorMessage[]>(
      `${STORAGE_KEYS.messagesPrefix}${conversationId}`,
      []
    );
    return { conversation, messages };
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { conversation: null, messages: [] };

  const [{ data: conv }, { data: msgs }] = await Promise.all([
    supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  if (!conv) return { conversation: null, messages: [] };

  return {
    conversation: {
      id: conv.id,
      scenarioId: conv.scenario_id,
      scenarioTitle: conv.scenario_title,
      topicCategory: conv.topic_category as TopicCategory,
      accent: conv.accent as ConcreteAccent,
      aiPersona: conv.ai_persona,
      level: conv.level as EnglishLevel,
      durationSeconds: conv.duration_seconds,
      messageCount: conv.message_count,
      summaryVi: conv.summary_vi,
      startedAt: conv.started_at,
      endedAt: conv.ended_at,
    },
    messages: (msgs ?? []).map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      englishText: m.english_text,
      vietnameseTranslation: m.vietnamese_translation,
      naturalRewrite: m.natural_rewrite,
      coachingTip: m.coaching_tip,
      replyHints: Array.isArray(m.reply_hints) ? m.reply_hints : [],
      pronunciation:
        m.pronunciation && typeof m.pronunciation === 'object'
          ? m.pronunciation
          : null,
      createdAt: m.created_at,
    })),
  };
}

export async function listSavedPhrases(): Promise<SavedPhrase[]> {
  if (!isSupabaseConfigured()) {
    return readLocalJson<SavedPhrase[]>(STORAGE_KEYS.phrases, []);
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_phrases')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    englishPhrase: row.english_phrase,
    vietnameseMeaning: row.vietnamese_meaning,
    phonetic: row.phonetic,
    exampleSentence: row.example_sentence,
    category: row.category,
    accent: row.accent as ConcreteAccent,
    masteryLevel: (row.mastery_level ?? 0) as 0 | 1 | 2 | 3,
    createdAt: row.created_at,
  }));
}

export async function savePhrase(input: {
  englishPhrase: string;
  vietnameseMeaning: string;
  phonetic?: string | null;
  exampleSentence?: string | null;
  category?: string;
  accent?: ConcreteAccent;
}): Promise<SavedPhrase> {
  const cleanEn = input.englishPhrase.trim();
  const cleanVi = input.vietnameseMeaning.trim();

  if (!isSupabaseConfigured()) {
    const existing = readLocalJson<SavedPhrase[]>(STORAGE_KEYS.phrases, []);
    const duplicate = existing.find(
      (p) => p.englishPhrase.toLowerCase() === cleanEn.toLowerCase()
    );
    if (duplicate) return duplicate;

    const item: SavedPhrase = {
      id: crypto.randomUUID(),
      englishPhrase: cleanEn,
      vietnameseMeaning: cleanVi,
      phonetic: input.phonetic ?? null,
      exampleSentence: input.exampleSentence ?? null,
      category: input.category ?? 'daily',
      accent: input.accent ?? 'US',
      masteryLevel: 0,
      createdAt: new Date().toISOString(),
    };
    writeLocalJson(STORAGE_KEYS.phrases, [item, ...existing]);
    return item;
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Vui lòng đăng nhập để lưu cụm từ.');

  const { data, error } = await supabase
    .from('saved_phrases')
    .upsert(
      {
        user_id: user.id,
        english_phrase: cleanEn,
        vietnamese_meaning: cleanVi,
        phonetic: input.phonetic ?? null,
        example_sentence: input.exampleSentence ?? null,
        category: input.category ?? 'daily',
        accent: input.accent ?? 'US',
      },
      { onConflict: 'user_id,english_phrase' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    englishPhrase: data.english_phrase,
    vietnameseMeaning: data.vietnamese_meaning,
    phonetic: data.phonetic,
    exampleSentence: data.example_sentence,
    category: data.category,
    accent: data.accent as ConcreteAccent,
    masteryLevel: (data.mastery_level ?? 0) as 0 | 1 | 2 | 3,
    createdAt: data.created_at,
  };
}

export async function updatePhraseMastery(
  id: string,
  masteryLevel: 0 | 1 | 2 | 3
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const existing = readLocalJson<SavedPhrase[]>(STORAGE_KEYS.phrases, []);
    writeLocalJson(
      STORAGE_KEYS.phrases,
      existing.map((p) => (p.id === id ? { ...p, masteryLevel } : p))
    );
    return;
  }

  const supabase = createSupabaseBrowserClient()!;
  await supabase
    .from('saved_phrases')
    .update({ mastery_level: masteryLevel })
    .eq('id', id);
}

export async function deletePhrase(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const existing = readLocalJson<SavedPhrase[]>(STORAGE_KEYS.phrases, []);
    writeLocalJson(
      STORAGE_KEYS.phrases,
      existing.filter((p) => p.id !== id)
    );
    return;
  }

  const supabase = createSupabaseBrowserClient()!;
  await supabase.from('saved_phrases').delete().eq('id', id);
}

export async function getDailyStats(limitDays = 7): Promise<DailyStat[]> {
  if (!isSupabaseConfigured()) {
    const all = readLocalJson<DailyStat[]>(STORAGE_KEYS.dailyStats, []);
    return all.slice(0, limitDays);
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .order('practice_date', { ascending: false })
    .limit(limitDays);

  return (data ?? []).map((row) => ({
    practiceDate: row.practice_date,
    secondsPracticed: row.seconds_practiced,
    messagesSent: row.messages_sent,
    sessionsCompleted: row.sessions_completed,
  }));
}
