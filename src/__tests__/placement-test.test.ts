import { describe, expect, it } from 'vitest';
import {
  evaluatePlacementTest,
  PLACEMENT_QUESTIONS,
} from '@/lib/placement-test';

describe('placement-test (CEFR A1 -> C1 adaptive evaluation)', () => {
  it('maintains a valid 8-question bank with unique IDs and valid correct options', () => {
    expect(PLACEMENT_QUESTIONS).toHaveLength(8);
    const ids = new Set(PLACEMENT_QUESTIONS.map((q) => q.id));
    expect(ids.size).toBe(8);

    for (const q of PLACEMENT_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(4);
      const hasCorrect = q.options.some((o) => o.id === q.correctOptionId);
      expect(hasCorrect).toBe(true);
      if (q.kind === 'listening') {
        expect(Boolean(q.spokenAudioEn && q.spokenAudioEn.length > 10)).toBe(true);
      }
    }
  });

  it('places a beginner with 0 correct answers at CEFR A1 (A0-A1, 0.8x speed)', () => {
    const res = evaluatePlacementTest({});
    expect(res.cefrBand).toBe('A1');
    expect(res.recommendedLevel).toBe('A0-A1');
    expect(res.recommendedSpeed).toBe(0.8);
    expect(res.recommendedUnitIndex).toBe(0);
    expect(res.scorePct).toBe(0);
  });

  it('places an elementary learner answering A1-A2 items at CEFR A2', () => {
    const answers: Record<string, string> = {
      'p1-a1-order': 'a',
      'p2-a2-listen': 'b',
      'p3-a2-schedule': 'b',
    };
    const res = evaluatePlacementTest(answers);
    expect(res.cefrBand).toBe('A2');
    expect(res.recommendedLevel).toBe('A2-B1');
    expect(res.recommendedSpeed).toBe(0.85);
  });

  it('places a solid intermediate learner at CEFR B1', () => {
    const answers: Record<string, string> = {
      'p1-a1-order': 'a',
      'p2-a2-listen': 'b',
      'p3-a2-schedule': 'b',
      'p4-b1-meeting': 'c',
      'p5-b1-listen': 'c',
    };
    const res = evaluatePlacementTest(answers);
    expect(res.cefrBand).toBe('B1');
    expect(res.recommendedLevel).toBe('A2-B1');
    expect(res.recommendedSpeed).toBe(0.95);
    expect(res.recommendedUnitIndex).toBe(1);
  });

  it('places an upper-intermediate learner at CEFR B2 (B2+, 1.0x)', () => {
    const answers: Record<string, string> = {
      'p1-a1-order': 'a',
      'p2-a2-listen': 'b',
      'p3-a2-schedule': 'b',
      'p4-b1-meeting': 'c',
      'p5-b1-listen': 'c',
      'p6-b1-collocation': 'a',
    };
    const res = evaluatePlacementTest(answers);
    expect(res.cefrBand).toBe('B2');
    expect(res.recommendedLevel).toBe('B2+');
    expect(res.recommendedSpeed).toBe(1.0);
  });

  it('places an advanced speaker answering all 8 questions accurately at CEFR C1', () => {
    const allCorrect = Object.fromEntries(
      PLACEMENT_QUESTIONS.map((q) => [q.id, q.correctOptionId])
    );
    const res = evaluatePlacementTest(allCorrect);
    expect(res.cefrBand).toBe('C1');
    expect(res.recommendedLevel).toBe('B2+');
    expect(res.scorePct).toBe(100);
    expect(res.skillBreakdown).toEqual({
      phrasingPct: 100,
      listeningPct: 100,
      registerPct: 100,
    });
  });
});
