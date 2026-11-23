import {
  computeStrictStreak,
  getClaimableMilestones,
  getLevelInfo,
  MIN_CALL_TURNS_FOR_LESSON,
  SHOP_REWARDS,
  STREAK_MILESTONES,
} from '@/lib/gamification';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type {
  AccentPreference,
  ConcreteAccent,
  ConversationRecord,
  DailyStat,
  EnglishLevel,
  LessonRewardSummary,
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
    longestStreak: 0,
    lastPracticeDate: null,
    onboardingCompleted: false,
    apiKeyMode: 'system',
    personalKeyHint: null,
    xp: 0,
    gems: 30,
    streakFreezes: 1,
    claimedMilestones: [],
    unlockedBadges: [],
    activeBadge: null,
    totalLessonsCompleted: 0,
  };
}

function normalizeProfile(raw: Partial<UserProfile> | null | undefined): UserProfile {
  const base = defaultLocalProfile();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    hobbies: Array.isArray(raw.hobbies) ? raw.hobbies : base.hobbies,
    xp: Number.isFinite(Number(raw.xp)) ? Math.max(0, Number(raw.xp)) : 0,
    gems: Number.isFinite(Number(raw.gems)) ? Math.max(0, Number(raw.gems)) : 30,
    streakFreezes: Number.isFinite(Number(raw.streakFreezes))
      ? Math.max(0, Number(raw.streakFreezes))
      : 1,
    streakDays: Number.isFinite(Number(raw.streakDays))
      ? Math.max(0, Number(raw.streakDays))
      : 0,
    longestStreak: Number.isFinite(Number(raw.longestStreak))
      ? Math.max(0, Number(raw.longestStreak))
      : Math.max(0, Number(raw.streakDays ?? 0)),
    claimedMilestones: Array.isArray(raw.claimedMilestones)
      ? raw.claimedMilestones.map(Number).filter(Number.isFinite)
      : [],
    unlockedBadges: Array.isArray(raw.unlockedBadges)
      ? raw.unlockedBadges.filter((b): b is string => typeof b === 'string')
      : [],
    activeBadge: typeof raw.activeBadge === 'string' ? raw.activeBadge : null,
    totalLessonsCompleted: Number.isFinite(Number(raw.totalLessonsCompleted))
      ? Math.max(0, Number(raw.totalLessonsCompleted))
      : 0,
  };
}

function normalizeDailyStat(raw: Partial<DailyStat>): DailyStat {
  return {
    practiceDate: String(raw.practiceDate ?? ''),
    secondsPracticed: Math.max(0, Number(raw.secondsPracticed ?? 0)),
    messagesSent: Math.max(0, Number(raw.messagesSent ?? 0)),
    sessionsCompleted: Math.max(0, Number(raw.sessionsCompleted ?? 0)),
    lessonsCompleted: Math.max(0, Number(raw.lessonsCompleted ?? 0)),
    xpEarned: Math.max(0, Number(raw.xpEarned ?? 0)),
    freezeUsed: Boolean(raw.freezeUsed),
  };
}

function mapDbProfile(
  row: Record<string, unknown>,
  keyHint?: string | null
): UserProfile {
  return normalizeProfile({
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
    longestStreak: Number(row.longest_streak ?? row.streak_days ?? 0),
    lastPracticeDate: row.last_practice_date
      ? String(row.last_practice_date)
      : null,
    onboardingCompleted: Boolean(row.onboarding_completed),
    apiKeyMode: row.api_key_mode === 'personal' ? 'personal' : 'system',
    personalKeyHint: keyHint ?? null,
    xp: Number(row.xp ?? 0),
    gems: row.gems !== undefined && row.gems !== null ? Number(row.gems) : 30,
    streakFreezes:
      row.streak_freezes !== undefined && row.streak_freezes !== null
        ? Number(row.streak_freezes)
        : 1,
    claimedMilestones: Array.isArray(row.claimed_milestones)
      ? (row.claimed_milestones as number[])
      : [],
    unlockedBadges: Array.isArray(row.unlocked_badges)
      ? (row.unlocked_badges as string[])
      : [],
    activeBadge: row.active_badge ? String(row.active_badge) : null,
    totalLessonsCompleted: Number(row.total_lessons_completed ?? 0),
  });
}

function readLocalStats(): DailyStat[] {
  const raw = readLocalJson<Partial<DailyStat>[]>(STORAGE_KEYS.dailyStats, []);
  return raw.map(normalizeDailyStat).filter((s) => Boolean(s.practiceDate));
}

export async function getCurrentProfile(): Promise<{
  profile: UserProfile | null;
  isCloud: boolean;
  authenticated: boolean;
}> {
  const today = getTodayLocalDate();

  if (!isSupabaseConfigured()) {
    const local = normalizeProfile(
      readLocalJson<Partial<UserProfile> | null>(STORAGE_KEYS.profile, null)
    );
    const stats = readLocalStats();
    const strict = computeStrictStreak(stats, today);
    const synced: UserProfile = {
      ...local,
      streakDays: strict.currentStreak,
      longestStreak: Math.max(local.longestStreak, strict.longestStreak),
    };
    return {
      profile: synced,
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

  const [{ data: row }, { data: keyRow }, { data: recentStats }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('user_api_keys')
        .select('key_hint')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('practice_date', { ascending: false })
        .limit(90),
    ]);

  const mappedStats: DailyStat[] = (recentStats ?? []).map((r) =>
    normalizeDailyStat({
      practiceDate: r.practice_date,
      secondsPracticed: r.seconds_practiced,
      messagesSent: r.messages_sent,
      sessionsCompleted: r.sessions_completed,
      lessonsCompleted: r.lessons_completed,
      xpEarned: r.xp_earned,
      freezeUsed: r.freeze_used,
    })
  );
  const strict = computeStrictStreak(mappedStats, today);

  if (!row) {
    const fallbackName =
      String(user.user_metadata?.display_name ?? '') ||
      String(user.user_metadata?.full_name ?? '') ||
      String(user.user_metadata?.name ?? '') ||
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

    const mapped = inserted
      ? mapDbProfile(inserted, keyRow?.key_hint ?? null)
      : null;

    return {
      profile: mapped
        ? {
            ...mapped,
            streakDays: strict.currentStreak,
            longestStreak: Math.max(mapped.longestStreak, strict.longestStreak),
          }
        : null,
      isCloud: true,
      authenticated: true,
    };
  }

  const mapped = mapDbProfile(row, keyRow?.key_hint ?? null);
  return {
    profile: {
      ...mapped,
      streakDays: strict.currentStreak,
      longestStreak: Math.max(mapped.longestStreak, strict.longestStreak),
    },
    isCloud: true,
    authenticated: true,
  };
}

export async function saveProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!isSupabaseConfigured()) {
    const current = normalizeProfile(
      readLocalJson<Partial<UserProfile> | null>(STORAGE_KEYS.profile, null)
    );
    const next = normalizeProfile({ ...current, ...updates });
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
  if (updates.streakDays !== undefined)
    dbPayload.streak_days = updates.streakDays;
  if (updates.longestStreak !== undefined)
    dbPayload.longest_streak = updates.longestStreak;
  if (updates.lastPracticeDate !== undefined)
    dbPayload.last_practice_date = updates.lastPracticeDate;
  if (updates.xp !== undefined) dbPayload.xp = updates.xp;
  if (updates.gems !== undefined) dbPayload.gems = updates.gems;
  if (updates.streakFreezes !== undefined)
    dbPayload.streak_freezes = updates.streakFreezes;
  if (updates.claimedMilestones !== undefined)
    dbPayload.claimed_milestones = updates.claimedMilestones;
  if (updates.unlockedBadges !== undefined)
    dbPayload.unlocked_badges = updates.unlockedBadges;
  if (updates.activeBadge !== undefined)
    dbPayload.active_badge = updates.activeBadge;
  if (updates.totalLessonsCompleted !== undefined)
    dbPayload.total_lessons_completed = updates.totalLessonsCompleted;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(dbPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    // Graceful fallback if existing Supabase DB hasn't run gamification columns migration
    const corePayload: Record<string, unknown> = { id: user.id };
    for (const k of [
      'display_name',
      'english_level',
      'job_field',
      'hobbies',
      'preferred_accent',
      'preferred_speed',
      'daily_goal_minutes',
      'onboarding_completed',
      'api_key_mode',
      'streak_days',
      'last_practice_date',
    ]) {
      if (dbPayload[k] !== undefined) corePayload[k] = dbPayload[k];
    }
    const { data: retryData, error: retryErr } = await supabase
      .from('profiles')
      .upsert(corePayload, { onConflict: 'id' })
      .select('*')
      .single();
    if (retryErr) throw retryErr;
    return mapDbProfile(retryData);
  }
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

/**
 * Core strict-streak + lesson reward recorder shared by Voice Calls (/call) and
 * Play-to-Learn lessons (/play).
 *
 * STRICT RULE: Streak ONLY counts a day when `completedLesson === true`
 * (which increments `daily_stats.lessons_completed >= 1`).
 */
export async function recordLessonProgress(params: {
  durationSeconds: number;
  userMessagesSent?: number;
  completedLesson: boolean;
  xpEarned: number;
  gemsEarned: number;
  sessionsDelta?: number;
}): Promise<LessonRewardSummary> {
  const today = getTodayLocalDate();
  const safeDuration = Math.max(0, Math.round(params.durationSeconds));
  const msgDelta = Math.max(0, Math.round(params.userMessagesSent ?? 0));
  const lessonDelta = params.completedLesson ? 1 : 0;
  const sessionDelta = params.sessionsDelta ?? 1;

  if (!isSupabaseConfigured()) {
    const stats = readLocalStats();
    const existingToday = stats.find((s) => s.practiceDate === today);
    const updatedStats: DailyStat[] = existingToday
      ? stats.map((s) =>
          s.practiceDate === today
            ? {
                ...s,
                secondsPracticed: s.secondsPracticed + safeDuration,
                messagesSent: s.messagesSent + msgDelta,
                sessionsCompleted: s.sessionsCompleted + sessionDelta,
                lessonsCompleted: s.lessonsCompleted + lessonDelta,
                xpEarned: s.xpEarned + params.xpEarned,
              }
            : s
        )
      : [
          {
            practiceDate: today,
            secondsPracticed: safeDuration,
            messagesSent: msgDelta,
            sessionsCompleted: sessionDelta,
            lessonsCompleted: lessonDelta,
            xpEarned: params.xpEarned,
            freezeUsed: false,
          },
          ...stats,
        ];
    writeLocalJson(STORAGE_KEYS.dailyStats, updatedStats);

    const profile = normalizeProfile(
      readLocalJson<Partial<UserProfile> | null>(STORAGE_KEYS.profile, null)
    );
    const prevLevel = getLevelInfo(profile.xp).level;
    const prevClaimableCount = getClaimableMilestones(
      profile.streakDays,
      profile.longestStreak,
      profile.claimedMilestones
    ).length;

    const strict = computeStrictStreak(updatedStats, today);
    const nextXp = profile.xp + params.xpEarned;
    const nextGems = profile.gems + params.gemsEarned;
    const nextLongest = Math.max(profile.longestStreak, strict.longestStreak);
    const nextLevel = getLevelInfo(nextXp).level;

    const nextProfile: UserProfile = {
      ...profile,
      xp: nextXp,
      gems: nextGems,
      streakDays: strict.currentStreak,
      longestStreak: nextLongest,
      lastPracticeDate: strict.studiedToday ? today : profile.lastPracticeDate,
      totalLessonsCompleted: profile.totalLessonsCompleted + lessonDelta,
    };
    writeLocalJson(STORAGE_KEYS.profile, nextProfile);

    const allClaimable = getClaimableMilestones(
      nextProfile.streakDays,
      nextProfile.longestStreak,
      nextProfile.claimedMilestones
    );

    return {
      lessonCompleted: params.completedLesson,
      streakKeptToday: strict.studiedToday,
      streakDays: nextProfile.streakDays,
      longestStreak: nextProfile.longestStreak,
      xpEarned: params.xpEarned,
      gemsEarned: params.gemsEarned,
      leveledUp: nextLevel > prevLevel,
      newLevel: nextLevel,
      newlyClaimableMilestones:
        allClaimable.length > prevClaimableCount
          ? allClaimable.map((m) => m.days)
          : [],
    };
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      lessonCompleted: params.completedLesson,
      streakKeptToday: false,
      streakDays: 0,
      longestStreak: 0,
      xpEarned: params.xpEarned,
      gemsEarned: params.gemsEarned,
      leveledUp: false,
      newLevel: 1,
      newlyClaimableMilestones: [],
    };
  }

  const { data: todayRow } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('practice_date', today)
    .maybeSingle();

  if (todayRow) {
    const { error: updErr } = await supabase
      .from('daily_stats')
      .update({
        seconds_practiced: (todayRow.seconds_practiced ?? 0) + safeDuration,
        messages_sent: (todayRow.messages_sent ?? 0) + msgDelta,
        sessions_completed: (todayRow.sessions_completed ?? 0) + sessionDelta,
        lessons_completed: (todayRow.lessons_completed ?? 0) + lessonDelta,
        xp_earned: (todayRow.xp_earned ?? 0) + params.xpEarned,
      })
      .eq('id', todayRow.id);

    if (updErr) {
      await supabase
        .from('daily_stats')
        .update({
          seconds_practiced: (todayRow.seconds_practiced ?? 0) + safeDuration,
          messages_sent: (todayRow.messages_sent ?? 0) + msgDelta,
          sessions_completed: (todayRow.sessions_completed ?? 0) + sessionDelta,
        })
        .eq('id', todayRow.id);
    }
  } else {
    const { error: insErr } = await supabase.from('daily_stats').insert({
      user_id: user.id,
      practice_date: today,
      seconds_practiced: safeDuration,
      messages_sent: msgDelta,
      sessions_completed: sessionDelta,
      lessons_completed: lessonDelta,
      xp_earned: params.xpEarned,
      freeze_used: false,
    });
    if (insErr) {
      await supabase.from('daily_stats').insert({
        user_id: user.id,
        practice_date: today,
        seconds_practiced: safeDuration,
        messages_sent: msgDelta,
        sessions_completed: sessionDelta,
      });
    }
  }

  const [{ data: allStats }, { data: profRow }] = await Promise.all([
    supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('practice_date', { ascending: false })
      .limit(120),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
  ]);

  const mappedStats = (allStats ?? []).map((r) =>
    normalizeDailyStat({
      practiceDate: r.practice_date,
      secondsPracticed: r.seconds_practiced,
      messagesSent: r.messages_sent,
      sessionsCompleted: r.sessions_completed,
      lessonsCompleted: r.lessons_completed,
      xpEarned: r.xp_earned,
      freezeUsed: r.freeze_used,
    })
  );

  const currentProfile = profRow ? mapDbProfile(profRow) : defaultLocalProfile();
  const prevLevel = getLevelInfo(currentProfile.xp).level;
  const prevClaimableCount = getClaimableMilestones(
    currentProfile.streakDays,
    currentProfile.longestStreak,
    currentProfile.claimedMilestones
  ).length;

  const strict = computeStrictStreak(mappedStats, today);
  const nextXp = currentProfile.xp + params.xpEarned;
  const nextGems = currentProfile.gems + params.gemsEarned;
  const nextLongest = Math.max(
    currentProfile.longestStreak,
    strict.longestStreak
  );
  const nextLevel = getLevelInfo(nextXp).level;

  await saveProfile({
    xp: nextXp,
    gems: nextGems,
    streakDays: strict.currentStreak,
    longestStreak: nextLongest,
    lastPracticeDate: strict.studiedToday
      ? today
      : currentProfile.lastPracticeDate,
    totalLessonsCompleted: currentProfile.totalLessonsCompleted + lessonDelta,
  });

  const allClaimable = getClaimableMilestones(
    strict.currentStreak,
    nextLongest,
    currentProfile.claimedMilestones
  );

  return {
    lessonCompleted: params.completedLesson,
    streakKeptToday: strict.studiedToday,
    streakDays: strict.currentStreak,
    longestStreak: nextLongest,
    xpEarned: params.xpEarned,
    gemsEarned: params.gemsEarned,
    leveledUp: nextLevel > prevLevel,
    newLevel: nextLevel,
    newlyClaimableMilestones:
      allClaimable.length > prevClaimableCount
        ? allClaimable.map((m) => m.days)
        : [],
  };
}

export async function finishConversationRecord(params: {
  conversationId: string;
  durationSeconds: number;
  messageCount: number;
  userMessagesSent: number;
  summaryVi?: string | null;
}): Promise<LessonRewardSummary> {
  const safeDuration = Math.max(0, Math.round(params.durationSeconds));
  const completedLesson = params.userMessagesSent >= MIN_CALL_TURNS_FOR_LESSON;
  const xpEarned = completedLesson
    ? 60 + Math.min(40, params.userMessagesSent * 5)
    : Math.min(15, params.userMessagesSent * 5);
  const gemsEarned = completedLesson ? 15 : 0;

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
  } else {
    const supabase = createSupabaseBrowserClient()!;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
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
    }
  }

  return recordLessonProgress({
    durationSeconds: safeDuration,
    userMessagesSent: params.userMessagesSent,
    completedLesson,
    xpEarned,
    gemsEarned,
    sessionsDelta: 1,
  });
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

export async function claimStreakMilestone(
  milestoneDays: number
): Promise<UserProfile> {
  const milestone = STREAK_MILESTONES.find((m) => m.days === milestoneDays);
  if (!milestone) {
    throw new Error('Không tìm thấy mốc phần thưởng này.');
  }

  const { profile } = await getCurrentProfile();
  if (!profile) throw new Error('Vui lòng đăng nhập để nhận thưởng.');

  const best = Math.max(profile.streakDays, profile.longestStreak);
  if (best < milestone.days) {
    throw new Error(`Bạn cần đạt chuỗi ${milestone.days} ngày để mở khóa phần thưởng này.`);
  }
  if (profile.claimedMilestones.includes(milestone.days)) {
    return profile;
  }

  const nextClaimed = [...profile.claimedMilestones, milestone.days];
  const nextBadges = profile.unlockedBadges.includes(milestone.badgeId)
    ? profile.unlockedBadges
    : [...profile.unlockedBadges, milestone.badgeId];

  return saveProfile({
    xp: profile.xp + milestone.rewardXp,
    gems: profile.gems + milestone.rewardGems,
    streakFreezes: profile.streakFreezes + milestone.rewardFreezes,
    claimedMilestones: nextClaimed,
    unlockedBadges: nextBadges,
    activeBadge: profile.activeBadge ?? milestone.badgeId,
  });
}

export async function purchaseShopReward(itemId: string): Promise<UserProfile> {
  const item = SHOP_REWARDS.find((r) => r.id === itemId);
  if (!item) throw new Error('Vật phẩm không tồn tại.');

  const { profile } = await getCurrentProfile();
  if (!profile) throw new Error('Vui lòng đăng nhập.');

  if (item.type === 'badge' && item.badgeId && profile.unlockedBadges.includes(item.badgeId)) {
    return saveProfile({ activeBadge: item.badgeId });
  }

  if (profile.gems < item.costGems) {
    throw new Error(`Bạn cần ${item.costGems} 💎 để đổi vật phẩm này.`);
  }

  if (item.type === 'freeze') {
    return saveProfile({
      gems: profile.gems - item.costGems,
      streakFreezes: profile.streakFreezes + 1,
    });
  }

  const nextBadges =
    item.badgeId && !profile.unlockedBadges.includes(item.badgeId)
      ? [...profile.unlockedBadges, item.badgeId]
      : profile.unlockedBadges;

  return saveProfile({
    gems: profile.gems - item.costGems,
    unlockedBadges: nextBadges,
    activeBadge: item.badgeId ?? profile.activeBadge,
  });
}

export async function equipBadge(badgeId: string | null): Promise<UserProfile> {
  return saveProfile({ activeBadge: badgeId });
}

export async function applyStreakFreezeForYesterday(): Promise<{
  profile: UserProfile;
  stats: DailyStat[];
}> {
  const today = getTodayLocalDate();
  const [{ profile }, stats] = await Promise.all([
    getCurrentProfile(),
    getDailyStats(120),
  ]);

  if (!profile) throw new Error('Vui lòng đăng nhập.');
  if (profile.streakFreezes < 1) {
    throw new Error('Bạn đã hết Khiên Bảo Vệ Chuỗi. Hãy đổi thêm trong Kho quà bằng Ngọc 💎!');
  }

  const strict = computeStrictStreak(stats, today);
  if (!strict.canFreezeYesterday) {
    throw new Error('Ngày hôm qua không cần hoặc không thể dùng Khiên Bảo Vệ.');
  }

  const yesterday = strict.yesterdayStr;

  if (!isSupabaseConfigured()) {
    const existing = stats.find((s) => s.practiceDate === yesterday);
    const updatedStats: DailyStat[] = existing
      ? stats.map((s) =>
          s.practiceDate === yesterday ? { ...s, freezeUsed: true } : s
        )
      : [
          {
            practiceDate: yesterday,
            secondsPracticed: 0,
            messagesSent: 0,
            sessionsCompleted: 0,
            lessonsCompleted: 0,
            xpEarned: 0,
            freezeUsed: true,
          },
          ...stats,
        ];
    writeLocalJson(STORAGE_KEYS.dailyStats, updatedStats);
    const nextStrict = computeStrictStreak(updatedStats, today);
    const updatedProfile = await saveProfile({
      streakFreezes: Math.max(0, profile.streakFreezes - 1),
      streakDays: nextStrict.currentStreak,
      longestStreak: Math.max(profile.longestStreak, nextStrict.longestStreak),
    });
    return { profile: updatedProfile, stats: updatedStats };
  }

  const supabase = createSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập.');

  await supabase.from('daily_stats').upsert(
    {
      user_id: user.id,
      practice_date: yesterday,
      freeze_used: true,
    },
    { onConflict: 'user_id,practice_date' }
  );

  const freshStats = await getDailyStats(120);
  const nextStrict = computeStrictStreak(freshStats, today);
  const updatedProfile = await saveProfile({
    streakFreezes: Math.max(0, profile.streakFreezes - 1),
    streakDays: nextStrict.currentStreak,
    longestStreak: Math.max(profile.longestStreak, nextStrict.longestStreak),
  });
  return { profile: updatedProfile, stats: freshStats };
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

export async function getDailyStats(limitDays = 120): Promise<DailyStat[]> {
  if (!isSupabaseConfigured()) {
    const all = readLocalStats().sort((a, b) =>
      b.practiceDate.localeCompare(a.practiceDate)
    );
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

  return (data ?? []).map((row) =>
    normalizeDailyStat({
      practiceDate: row.practice_date,
      secondsPracticed: row.seconds_practiced,
      messagesSent: row.messages_sent,
      sessionsCompleted: row.sessions_completed,
      lessonsCompleted: row.lessons_completed,
      xpEarned: row.xp_earned,
      freezeUsed: row.freeze_used,
    })
  );
}

/**
 * Exports local browser progress as a portable JSON backup string (helpful when
 * moving devices before cloud OAuth is linked).
 */
export function exportLocalProgressBackup(): string {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    profile: normalizeProfile(
      readLocalJson<Partial<UserProfile> | null>(STORAGE_KEYS.profile, null)
    ),
    dailyStats: readLocalStats(),
    phrases: readLocalJson<SavedPhrase[]>(STORAGE_KEYS.phrases, []),
    conversations: readLocalJson<ConversationRecord[]>(
      STORAGE_KEYS.conversations,
      []
    ),
  };
  return JSON.stringify(payload, null, 2);
}

export function importLocalProgressBackup(rawJson: string): void {
  const parsed = JSON.parse(rawJson) as {
    profile?: Partial<UserProfile>;
    dailyStats?: Partial<DailyStat>[];
    phrases?: SavedPhrase[];
    conversations?: ConversationRecord[];
  };

  if (parsed.profile) {
    writeLocalJson(STORAGE_KEYS.profile, normalizeProfile(parsed.profile));
  }
  if (Array.isArray(parsed.dailyStats)) {
    writeLocalJson(
      STORAGE_KEYS.dailyStats,
      parsed.dailyStats.map(normalizeDailyStat).filter((s) => Boolean(s.practiceDate))
    );
  }
  if (Array.isArray(parsed.phrases)) {
    writeLocalJson(STORAGE_KEYS.phrases, parsed.phrases);
  }
  if (Array.isArray(parsed.conversations)) {
    writeLocalJson(STORAGE_KEYS.conversations, parsed.conversations);
  }
}
