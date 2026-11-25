import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  lookupEnglishWord,
  normalizeLookupWord,
  tokenizeInteractiveSentence,
} from '@/lib/word-lookup';

describe('word-lookup utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes punctuation around English words cleanly', () => {
    expect(normalizeLookupWord(' "Schedule!" ')).toBe('schedule');
    expect(normalizeLookupWord("I'd")).toBe("i'd");
  });

  it('tokenizes sentences while preserving exact whitespace and punctuation', () => {
    const original = "Hi! Would you like an iced latte, or a croissant?";
    const tokens = tokenizeInteractiveSentence(original);
    expect(tokens.map((t) => t.raw).join('')).toBe(original);

    const wordsOnly = tokens
      .map((t) => t.cleanWord)
      .filter((w): w is string => Boolean(w));
    expect(wordsOnly).toContain('latte');
    expect(wordsOnly).toContain('croissant');
    // Single-letter 'a' is not marked interactive
    expect(wordsOnly).not.toContain('a');
  });

  it('returns instant local Vietnamese glossary entry even when remote fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('offline network'))
    );

    const entry = await lookupEnglishWord('Reservation.');
    expect(entry.word).toBe('reservation');
    expect(entry.phonetic).toBe('ˌrezərˈveɪʃn');
    expect(entry.meaningVi).toContain('đặt trước');
  });
});
