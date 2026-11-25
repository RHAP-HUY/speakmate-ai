import type { TutorMessage } from '@/types';

export interface WeakWordInsight {
  word: string;
  count: number;
  ipa: string | null;
  tipVi: string | null;
  sampleSentence: string;
}

export interface PronunciationInsightsSummary {
  totalAssessedTurns: number;
  avgOverall: number;
  avgAccuracy: number;
  avgFluency: number;
  avgIntonation: number;
  trendDelta: number | null;
  weakWords: WeakWordInsight[];
}

function normalizeWordKey(raw: string): string {
  return raw
    .trim()
    .replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, '')
    .toLowerCase();
}

/**
 * Aggregates spoken pronunciation assessments across recent conversations to surface:
 * 1. Average clarity / fluency / intonation scores & recent progress trend
 * 2. Recurring mispronounced or skipped words with IPA & actionable coaching tips
 */
export function analyzePronunciationInsights(
  messages: TutorMessage[]
): PronunciationInsightsSummary {
  const assessed = messages.filter(
    (m) =>
      m.role === 'user' &&
      m.pronunciation &&
      typeof m.pronunciation.overallScore === 'number' &&
      m.pronunciation.overallScore > 0
  );

  if (assessed.length === 0) {
    return {
      totalAssessedTurns: 0,
      avgOverall: 0,
      avgAccuracy: 0,
      avgFluency: 0,
      avgIntonation: 0,
      trendDelta: null,
      weakWords: [],
    };
  }

  let sumOverall = 0;
  let sumAcc = 0;
  let sumFlu = 0;
  let sumInt = 0;

  const wordMap = new Map<
    string,
    {
      displayWord: string;
      count: number;
      ipa: string | null;
      tipVi: string | null;
      sampleSentence: string;
    }
  >();

  for (const msg of assessed) {
    const p = msg.pronunciation!;
    sumOverall += p.overallScore;
    sumAcc += p.accuracyScore;
    sumFlu += p.fluencyScore;
    sumInt += p.intonationScore;

    const sentence =
      (msg.naturalRewrite || msg.englishText || '').trim() || '';

    for (const wf of p.wordFeedback ?? []) {
      if (wf.status !== 'improve' && wf.status !== 'missing') continue;
      const key = normalizeWordKey(wf.word);
      if (key.length < 2) continue;

      const existing = wordMap.get(key);
      if (!existing) {
        wordMap.set(key, {
          displayWord: key,
          count: 1,
          ipa: wf.ipa?.trim() || null,
          tipVi: wf.tipVi?.trim() || null,
          sampleSentence: sentence || wf.word,
        });
      } else {
        existing.count += 1;
        if (!existing.ipa && wf.ipa?.trim()) existing.ipa = wf.ipa.trim();
        if (!existing.tipVi && wf.tipVi?.trim()) existing.tipVi = wf.tipVi.trim();
        if (sentence) existing.sampleSentence = sentence;
      }
    }
  }

  const n = assessed.length;
  let trendDelta: number | null = null;
  if (n >= 4) {
    const sorted = [...assessed].sort(
      (a, b) => (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
    );
    const half = Math.max(2, Math.min(4, Math.floor(n / 2)));
    const earlyAvg =
      sorted
        .slice(0, half)
        .reduce((s, m) => s + m.pronunciation!.overallScore, 0) / half;
    const recentAvg =
      sorted
        .slice(-half)
        .reduce((s, m) => s + m.pronunciation!.overallScore, 0) / half;
    trendDelta = Math.round(recentAvg - earlyAvg);
  }

  const weakWords: WeakWordInsight[] = Array.from(wordMap.values())
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.displayWord.length - a.displayWord.length;
    })
    .slice(0, 8)
    .map((item) => ({
      word: item.displayWord,
      count: item.count,
      ipa: item.ipa,
      tipVi: item.tipVi,
      sampleSentence: item.sampleSentence,
    }));

  return {
    totalAssessedTurns: n,
    avgOverall: Math.round(sumOverall / n),
    avgAccuracy: Math.round(sumAcc / n),
    avgFluency: Math.round(sumFlu / n),
    avgIntonation: Math.round(sumInt / n),
    trendDelta,
    weakWords,
  };
}
