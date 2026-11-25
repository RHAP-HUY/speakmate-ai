import type {
  AccountCloudBundle,
  ConversationRecord,
  DailyStat,
  SavedPhrase,
  TutorMessage,
  UserProfile,
} from '@/types';

function parseIsoMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function mergeDailyStats(localStats: DailyStat[], remoteStats: DailyStat[]): DailyStat[] {
  const byDate = new Map<string, DailyStat>();

  for (const stat of [...remoteStats, ...localStats]) {
    if (!stat?.practiceDate) continue;
    const prev = byDate.get(stat.practiceDate);
    if (!prev) {
      byDate.set(stat.practiceDate, { ...stat });
      continue;
    }
    byDate.set(stat.practiceDate, {
      practiceDate: stat.practiceDate,
      secondsPracticed: Math.max(prev.secondsPracticed, stat.secondsPracticed),
      messagesSent: Math.max(prev.messagesSent, stat.messagesSent),
      sessionsCompleted: Math.max(prev.sessionsCompleted, stat.sessionsCompleted),
      lessonsCompleted: Math.max(prev.lessonsCompleted, stat.lessonsCompleted),
      xpEarned: Math.max(prev.xpEarned, stat.xpEarned),
      freezeUsed: Boolean(prev.freezeUsed || stat.freezeUsed),
    });
  }

  return Array.from(byDate.values()).sort((a, b) =>
    b.practiceDate.localeCompare(a.practiceDate)
  );
}

function mergePhrases(
  localPhrases: SavedPhrase[],
  remotePhrases: SavedPhrase[],
  deletedKeys: Set<string>
): SavedPhrase[] {
  const byKey = new Map<string, SavedPhrase>();

  for (const item of [...remotePhrases, ...localPhrases]) {
    const key = (item?.englishPhrase || '').trim().toLowerCase();
    if (!key || deletedKeys.has(key)) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...item });
      continue;
    }
    const itemRevMs = parseIsoMs(item.lastReviewedAt);
    const prevRevMs = parseIsoMs(prev.lastReviewedAt);
    const preferItemSrs =
      itemRevMs > prevRevMs ||
      (itemRevMs === prevRevMs && (item.reviewCount ?? 0) >= (prev.reviewCount ?? 0));
    const srsSource = preferItemSrs ? item : prev;

    byKey.set(key, {
      ...prev,
      ...item,
      id: prev.id || item.id,
      masteryLevel: Math.max(prev.masteryLevel, item.masteryLevel) as 0 | 1 | 2 | 3,
      phonetic: item.phonetic || prev.phonetic || null,
      exampleSentence: item.exampleSentence || prev.exampleSentence || null,
      createdAt:
        parseIsoMs(item.createdAt) >= parseIsoMs(prev.createdAt)
          ? item.createdAt
          : prev.createdAt,
      reviewCount: Math.max(prev.reviewCount ?? 0, item.reviewCount ?? 0),
      intervalDays: srsSource.intervalDays ?? prev.intervalDays ?? item.intervalDays,
      easeFactor: srsSource.easeFactor ?? prev.easeFactor ?? item.easeFactor,
      lastReviewedAt: srsSource.lastReviewedAt ?? prev.lastReviewedAt ?? item.lastReviewedAt ?? null,
      nextReviewAt: srsSource.nextReviewAt ?? prev.nextReviewAt ?? item.nextReviewAt ?? null,
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => parseIsoMs(b.createdAt) - parseIsoMs(a.createdAt)
  );
}

function mergeConversations(
  localConvs: ConversationRecord[],
  remoteConvs: ConversationRecord[]
): ConversationRecord[] {
  const byId = new Map<string, ConversationRecord>();

  for (const conv of [...remoteConvs, ...localConvs]) {
    if (!conv?.id) continue;
    const prev = byId.get(conv.id);
    if (!prev) {
      byId.set(conv.id, { ...conv });
      continue;
    }
    byId.set(conv.id, {
      ...prev,
      ...conv,
      durationSeconds: Math.max(prev.durationSeconds, conv.durationSeconds),
      messageCount: Math.max(prev.messageCount, conv.messageCount),
      summaryVi: conv.summaryVi || prev.summaryVi || null,
      endedAt: conv.endedAt || prev.endedAt || null,
    });
  }

  return Array.from(byId.values()).sort(
    (a, b) => parseIsoMs(b.startedAt) - parseIsoMs(a.startedAt)
  );
}

function mergeMessagesMap(
  localMap: Record<string, TutorMessage[]>,
  remoteMap: Record<string, TutorMessage[]>
): Record<string, TutorMessage[]> {
  const merged: Record<string, TutorMessage[]> = { ...remoteMap };
  for (const [convId, localMsgs] of Object.entries(localMap)) {
    const remoteMsgs = merged[convId] ?? [];
    if (!Array.isArray(localMsgs)) continue;
    if (localMsgs.length > remoteMsgs.length) {
      merged[convId] = localMsgs;
    } else if (localMsgs.length === remoteMsgs.length && localMsgs.length > 0) {
      const seen = new Set(remoteMsgs.map((m) => m.id));
      const extras = localMsgs.filter((m) => !seen.has(m.id));
      merged[convId] = extras.length > 0 ? [...remoteMsgs, ...extras] : remoteMsgs;
    }
  }
  return merged;
}

function mergeClaimedDailyQuests(
  a?: Record<string, string[]>,
  b?: Record<string, string[]>
): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  const dates = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const date of Array.from(dates).sort().slice(-14)) {
    merged[date] = Array.from(
      new Set([...(a?.[date] ?? []), ...(b?.[date] ?? [])])
    );
  }
  return merged;
}

/**
 * Conflict-free merger between local device mirror and Google Drive 5TB cloud bundle.
 * Guarantees that offline lessons, XP, unlocked badges, phrases, and daily stats
 * are NEVER silently overwritten by stale cloud snapshots.
 */
export function mergeAccountBundles(
  local: AccountCloudBundle,
  remote: AccountCloudBundle
): {
  merged: AccountCloudBundle;
  localHadNewerProgress: boolean;
} {
  const localTs = parseIsoMs(local.updatedAt);
  const remoteTs = parseIsoMs(remote.updatedAt);
  const localIsNewer = localTs > remoteTs;

  const prefPrimary: UserProfile = localIsNewer ? local.profile : remote.profile;
  const prefSecondary: UserProfile = localIsNewer ? remote.profile : local.profile;

  const mergedClaimedMilestones = Array.from(
    new Set([
      ...(remote.profile.claimedMilestones ?? []),
      ...(local.profile.claimedMilestones ?? []),
    ])
  ).sort((a, b) => a - b);

  const mergedUnlockedBadges = Array.from(
    new Set([
      ...(remote.profile.unlockedBadges ?? []),
      ...(local.profile.unlockedBadges ?? []),
    ])
  );

  const mergedCompletedStations = Array.from(
    new Set([
      ...(remote.profile.completedStationIds ?? []),
      ...(local.profile.completedStationIds ?? []),
    ])
  ).slice(0, 200);

  const localPhraseKeys = new Set(
    (local.phrases ?? [])
      .map((p) => (p?.englishPhrase || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const mergedDeletedPhraseKeys = Array.from(
    new Set([
      ...(remote.profile.deletedPhraseKeys ?? []),
      ...(local.profile.deletedPhraseKeys ?? []),
    ])
  )
    .map((k) => k.trim().toLowerCase())
    .filter((k) => Boolean(k) && (!localIsNewer || !localPhraseKeys.has(k)))
    .slice(-200);
  const deletedSet = new Set(mergedDeletedPhraseKeys);

  const mergedDailyQuests = mergeClaimedDailyQuests(
    remote.profile.claimedDailyQuests,
    local.profile.claimedDailyQuests
  );

  const localScore =
    (local.profile.xp ?? 0) +
    (local.profile.totalLessonsCompleted ?? 0) * 100 +
    (local.profile.claimedMilestones?.length ?? 0) * 50;
  const remoteScore =
    (remote.profile.xp ?? 0) +
    (remote.profile.totalLessonsCompleted ?? 0) * 100 +
    (remote.profile.claimedMilestones?.length ?? 0) * 50;
  const useLocalEconomy = localScore > remoteScore || (localScore === remoteScore && localIsNewer);

  const xpBoostUntil = Math.max(
    local.profile.xpBoostUntil ?? 0,
    remote.profile.xpBoostUntil ?? 0
  );

  const mergedProfile: UserProfile = {
    ...prefSecondary,
    ...prefPrimary,
    displayName: prefPrimary.displayName || prefSecondary.displayName,
    onboardingCompleted: Boolean(
      local.profile.onboardingCompleted || remote.profile.onboardingCompleted
    ),
    xp: Math.max(local.profile.xp ?? 0, remote.profile.xp ?? 0),
    longestStreak: Math.max(
      local.profile.longestStreak ?? 0,
      remote.profile.longestStreak ?? 0
    ),
    totalLessonsCompleted: Math.max(
      local.profile.totalLessonsCompleted ?? 0,
      remote.profile.totalLessonsCompleted ?? 0
    ),
    gems: useLocalEconomy ? local.profile.gems : remote.profile.gems,
    streakFreezes: useLocalEconomy
      ? local.profile.streakFreezes
      : remote.profile.streakFreezes,
    claimedMilestones: mergedClaimedMilestones,
    unlockedBadges: mergedUnlockedBadges,
    completedStationIds: mergedCompletedStations,
    deletedPhraseKeys: mergedDeletedPhraseKeys,
    claimedDailyQuests: mergedDailyQuests,
    xpBoostUntil: xpBoostUntil > 0 ? xpBoostUntil : null,
  };

  const mergedStats = mergeDailyStats(
    local.dailyStats ?? [],
    remote.dailyStats ?? []
  );
  const mergedPhrases = mergePhrases(
    local.phrases ?? [],
    remote.phrases ?? [],
    deletedSet
  );
  const mergedConversations = mergeConversations(
    local.conversations ?? [],
    remote.conversations ?? []
  );
  const mergedMessages = mergeMessagesMap(
    local.messagesByConversation ?? {},
    remote.messagesByConversation ?? {}
  );

  const localHadNewerProgress =
    mergedProfile.xp > (remote.profile.xp ?? 0) ||
    mergedProfile.totalLessonsCompleted > (remote.profile.totalLessonsCompleted ?? 0) ||
    mergedCompletedStations.length > (remote.profile.completedStationIds?.length ?? 0) ||
    mergedDeletedPhraseKeys.length > (remote.profile.deletedPhraseKeys?.length ?? 0) ||
    mergedClaimedMilestones.length > (remote.profile.claimedMilestones?.length ?? 0) ||
    mergedUnlockedBadges.length > (remote.profile.unlockedBadges?.length ?? 0) ||
    mergedStats.length > (remote.dailyStats?.length ?? 0) ||
    mergedPhrases.length > (remote.phrases?.length ?? 0) ||
    mergedConversations.length > (remote.conversations?.length ?? 0) ||
    (local.profile.onboardingCompleted && !remote.profile.onboardingCompleted);

  return {
    merged: {
      version: 3,
      accountId: remote.accountId || local.accountId,
      email: remote.email || local.email,
      provider: remote.provider === 'google' || local.provider === 'google' ? 'google' : 'local',
      updatedAt:
        localHadNewerProgress
          ? new Date().toISOString()
          : localIsNewer
            ? local.updatedAt
            : remote.updatedAt,
      profile: mergedProfile,
      dailyStats: mergedStats,
      phrases: mergedPhrases,
      conversations: mergedConversations,
      messagesByConversation: mergedMessages,
    },
    localHadNewerProgress,
  };
}
