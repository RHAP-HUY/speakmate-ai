import { describe, expect, it } from 'vitest';
import { sanitizeGeneratedQuizQuestions } from '@/app/api/tutor/generate-quiz/route';

describe('AI custom quiz sanitizer', () => {
  it('validates well-formed AI quiz questions and drops malformed ones', () => {
    const raw = [
      {
        promptVi: 'Hỏi đồng nghiệp xem họ có rảnh họp nhanh không',
        contextVi: 'Trong văn phòng IT',
        correctEn: 'Do you have a quick minute to sync?',
        phonetic: 'đu du hév ơ quýc mi-nít tu sinh-c',
        wrongOptions: [
          'Do you free fast meeting?',
          'Can we open fast mouth talk?',
          'Are you have quick minute?',
        ],
        tipVi: '"quick minute to sync" cực chuẩn trong môi trường công nghệ!',
      },
      {
        // Invalid: duplicate wrong option equal to correctEn -> only 2 valid distractors
        promptVi: 'Invalid item',
        contextVi: 'Test',
        correctEn: 'Sounds good!',
        phonetic: 'sao-z gút',
        wrongOptions: ['Sounds good!', 'Bad one', 'Bad two'],
        tipVi: 'Tip',
      },
      {
        // Invalid: missing promptVi
        promptVi: '',
        correctEn: 'No worries!',
        wrongOptions: ['A', 'B', 'C'],
      },
    ];

    const sanitized = sanitizeGeneratedQuizQuestions(raw);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].correctEn).toBe('Do you have a quick minute to sync?');
    expect(sanitized[0].options).toHaveLength(4);
    expect(sanitized[0].options).toContain('Do you have a quick minute to sync?');
  });

  it('returns empty array for non-array input', () => {
    expect(sanitizeGeneratedQuizQuestions(null)).toEqual([]);
    expect(sanitizeGeneratedQuizQuestions({})).toEqual([]);
  });
});
