import { describe, expect, it } from 'vitest';
import { analyzePronunciationInsights } from '@/lib/pronunciation-insights';
import type { TutorMessage } from '@/types';

function makeAssessedMsg(params: {
  id: string;
  createdAt: string;
  score: number;
  englishText: string;
  words: { word: string; status: 'good' | 'improve' | 'missing'; ipa?: string; tipVi?: string }[];
}): TutorMessage {
  return {
    id: params.id,
    role: 'user',
    englishText: params.englishText,
    createdAt: params.createdAt,
    pronunciation: {
      overallScore: params.score,
      accuracyScore: params.score - 2,
      fluencyScore: params.score + 1,
      intonationScore: params.score,
      summaryVi: 'Tốt',
      wordFeedback: params.words,
    },
  };
}

describe('analyzePronunciationInsights', () => {
  it('returns empty summary when no assessed user turns exist', () => {
    const res = analyzePronunciationInsights([
      {
        id: '1',
        role: 'assistant',
        englishText: 'Hello!',
        createdAt: '2026-11-20T10:00:00Z',
      },
    ]);
    expect(res.totalAssessedTurns).toBe(0);
    expect(res.weakWords).toEqual([]);
    expect(res.trendDelta).toBeNull();
  });

  it('aggregates averages, positive trendDelta, and top recurring weak words', () => {
    const msgs: TutorMessage[] = [
      makeAssessedMsg({
        id: 'm1',
        createdAt: '2026-11-20T10:00:00Z',
        score: 70,
        englishText: 'I think this schedule works.',
        words: [
          { word: 'think', status: 'improve', ipa: 'θɪŋk', tipVi: 'Đặt đầu lưỡi giữa hai hàm răng âm /θ/' },
          { word: 'schedule', status: 'improve', ipa: 'ˈskedʒuːl', tipVi: 'Nhấn âm tiết đầu' },
        ],
      }),
      makeAssessedMsg({
        id: 'm2',
        createdAt: '2026-11-21T10:00:00Z',
        score: 72,
        englishText: 'Let me think about it.',
        words: [
          { word: 'think.', status: 'improve', ipa: 'θɪŋk' },
          { word: 'about', status: 'good' },
        ],
      }),
      makeAssessedMsg({
        id: 'm3',
        createdAt: '2026-11-23T10:00:00Z',
        score: 84,
        englishText: 'I think that sounds great!',
        words: [{ word: 'think', status: 'missing' }],
      }),
      makeAssessedMsg({
        id: 'm4',
        createdAt: '2026-11-24T10:00:00Z',
        score: 86,
        englishText: 'Everything is clear.',
        words: [{ word: 'Everything', status: 'good' }],
      }),
    ];

    const summary = analyzePronunciationInsights(msgs);
    expect(summary.totalAssessedTurns).toBe(4);
    expect(summary.avgOverall).toBe(78);
    expect(summary.trendDelta).toBe(14); // (85 - 71)
    expect(summary.weakWords[0]).toMatchObject({
      word: 'think',
      count: 3,
      ipa: 'θɪŋk',
    });
    expect(summary.weakWords[1]?.word).toBe('schedule');
  });
});
