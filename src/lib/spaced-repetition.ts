import type { SavedPhrase, SrsReviewGrade } from '@/types';

export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 2.8;
const DAY_MS = 24 * 60 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

function clampEase(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_EASE_FACTOR;
  return Math.round(Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, value)) * 100) / 100;
}

function parseOptionalIso(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

export function isPhraseDue(phrase: SavedPhrase, nowMs = Date.now()): boolean {
  const nextMs = parseOptionalIso(phrase.nextReviewAt);
  if (nextMs !== null) {
    return nextMs <= nowMs;
  }
  // Legacy phrases without nextReviewAt: due unless already marked mastered (level 3)
  return phrase.masteryLevel < 3;
}

export interface PhraseReviewSummary {
  total: number;
  dueCount: number;
  learningCount: number;
  masteredCount: number;
}

export function getPhraseReviewSummary(
  phrases: SavedPhrase[],
  nowMs = Date.now()
): PhraseReviewSummary {
  let dueCount = 0;
  let learningCount = 0;
  let masteredCount = 0;

  for (const p of phrases) {
    if (isPhraseDue(p, nowMs)) {
      dueCount += 1;
    }
    if (p.masteryLevel >= 3) {
      masteredCount += 1;
    } else if (p.masteryLevel >= 1 || (p.reviewCount ?? 0) > 0) {
      learningCount += 1;
    }
  }

  return {
    total: phrases.length,
    dueCount,
    learningCount,
    masteredCount,
  };
}

export function sortPhrasesForReview(
  phrases: SavedPhrase[],
  nowMs = Date.now()
): SavedPhrase[] {
  return [...phrases].sort((a, b) => {
    const aDue = isPhraseDue(a, nowMs) ? 0 : 1;
    const bDue = isPhraseDue(b, nowMs) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;

    if (a.masteryLevel !== b.masteryLevel) {
      return a.masteryLevel - b.masteryLevel;
    }

    const aNext = parseOptionalIso(a.nextReviewAt) ?? 0;
    const bNext = parseOptionalIso(b.nextReviewAt) ?? 0;
    if (aNext !== bNext) return aNext - bNext;

    return a.englishPhrase.localeCompare(b.englishPhrase);
  });
}

function computeNextStep(
  phrase: SavedPhrase,
  grade: SrsReviewGrade
): {
  intervalDays: number;
  delayMs: number;
  easeFactor: number;
  masteryLevel: 0 | 1 | 2 | 3;
} {
  const prevInterval = Math.max(0, Math.round(phrase.intervalDays ?? 0));
  const prevEase = clampEase(phrase.easeFactor ?? DEFAULT_EASE_FACTOR);

  if (grade === 'again') {
    return {
      intervalDays: 0,
      delayMs: TEN_MINUTES_MS,
      easeFactor: clampEase(prevEase - 0.2),
      masteryLevel: 0,
    };
  }

  if (grade === 'hard') {
    const intervalDays =
      prevInterval <= 1 ? 1 : Math.max(1, Math.round(prevInterval * 1.2));
    return {
      intervalDays,
      delayMs: intervalDays * DAY_MS,
      easeFactor: clampEase(prevEase - 0.15),
      masteryLevel: 1,
    };
  }

  if (grade === 'good') {
    let intervalDays: number;
    if (prevInterval <= 0) {
      intervalDays = 1;
    } else if (prevInterval === 1) {
      intervalDays = 3;
    } else if (prevInterval < 7) {
      intervalDays = 7;
    } else {
      intervalDays = Math.min(90, Math.max(prevInterval + 1, Math.round(prevInterval * prevEase)));
    }
    const masteryLevel: 0 | 1 | 2 | 3 =
      intervalDays >= 7 ? 3 : intervalDays >= 3 ? 2 : 1;
    return {
      intervalDays,
      delayMs: intervalDays * DAY_MS,
      easeFactor: prevEase,
      masteryLevel,
    };
  }

  // grade === 'easy'
  let intervalDays: number;
  if (prevInterval <= 0) {
    intervalDays = 4;
  } else if (prevInterval <= 3) {
    intervalDays = 10;
  } else {
    intervalDays = Math.min(
      120,
      Math.max(prevInterval + 3, Math.round(prevInterval * prevEase * 1.3))
    );
  }
  const masteryLevel: 0 | 1 | 2 | 3 = intervalDays >= 7 ? 3 : 2;
  return {
    intervalDays,
    delayMs: intervalDays * DAY_MS,
    easeFactor: clampEase(prevEase + 0.15),
    masteryLevel,
  };
}

export function scheduleNextPhraseReview(
  phrase: SavedPhrase,
  grade: SrsReviewGrade,
  nowMs = Date.now()
): SavedPhrase {
  const step = computeNextStep(phrase, grade);
  const nextReviewAt = new Date(nowMs + step.delayMs).toISOString();
  const lastReviewedAt = new Date(nowMs).toISOString();

  return {
    ...phrase,
    masteryLevel: step.masteryLevel,
    intervalDays: step.intervalDays,
    easeFactor: step.easeFactor,
    reviewCount: Math.max(0, phrase.reviewCount ?? 0) + 1,
    lastReviewedAt,
    nextReviewAt,
  };
}

export function previewGradeIntervalsVi(
  phrase: SavedPhrase
): Record<SrsReviewGrade, string> {
  const grades: SrsReviewGrade[] = ['again', 'hard', 'good', 'easy'];
  const result = {} as Record<SrsReviewGrade, string>;

  for (const g of grades) {
    const step = computeNextStep(phrase, g);
    result[g] =
      step.intervalDays === 0 ? '10 phút' : `${step.intervalDays} ngày`;
  }

  return result;
}

export function formatRelativeDueVi(
  phrase: SavedPhrase,
  nowMs = Date.now()
): string {
  if (isPhraseDue(phrase, nowMs)) {
    return 'Đến hạn ôn';
  }
  const nextMs = parseOptionalIso(phrase.nextReviewAt);
  if (nextMs === null) {
    return 'Đã ghi nhớ';
  }
  const diffMs = Math.max(0, nextMs - nowMs);
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) {
    return `Ôn sau ${Math.max(1, mins)} phút`;
  }
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 24) {
    return `Ôn sau ${hours} giờ`;
  }
  const days = Math.max(1, Math.round(diffMs / DAY_MS));
  return `Ôn sau ${days} ngày`;
}

function sanitizeTsvCell(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/[\t\r\n]+/g, ' ').trim();
}

/**
 * Exports saved phrases as a clean UTF-8 TSV table ready for Anki, Quizlet, Excel, or Google Sheets.
 */
export function exportPhrasesToTsv(phrases: SavedPhrase[]): string {
  const header = [
    'English Phrase',
    'Vietnamese Meaning',
    'IPA Phonetic',
    'Example Sentence',
    'Category',
    'Mastery Level (0-3)',
    'Interval Days',
  ].join('\t');

  const rows = phrases.map((p) =>
    [
      sanitizeTsvCell(p.englishPhrase),
      sanitizeTsvCell(p.vietnameseMeaning),
      sanitizeTsvCell(p.phonetic),
      sanitizeTsvCell(p.exampleSentence),
      sanitizeTsvCell(String(p.category || 'daily')),
      String(p.masteryLevel ?? 0),
      String(p.intervalDays ?? 0),
    ].join('\t')
  );

  return [header, ...rows].join('\n');
}
