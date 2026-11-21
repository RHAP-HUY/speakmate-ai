import { describe, expect, it } from 'vitest';
import { AI_PERSONAS, SCENARIOS } from '@/lib/scenarios';
import {
  buildConversationTurnPrompt,
  buildTutorSystemInstruction,
  parseTutorTurnOutput,
} from '@/lib/tutor-prompt';

describe('tutor-prompt', () => {
  it('personalizes system instruction with learner name, job, hobbies, and A0-A1 guidance', () => {
    const instruction = buildTutorSystemInstruction({
      profile: {
        displayName: 'Minh',
        englishLevel: 'A0-A1',
        jobField: 'IT / Lập trình',
        hobbies: ['Du lịch', 'Cà phê & Ẩm thực'],
      },
      persona: AI_PERSONAS[0],
      scenario: SCENARIOS[0],
    });

    expect(instruction).toContain('Minh');
    expect(instruction).toContain('IT / Lập trình');
    expect(instruction).toContain('Du lịch, Cà phê & Ẩm thực');
    expect(instruction).toContain('A0-A1');
    expect(instruction).toContain('Emma');
  });

  it('builds start and audio turn prompts clearly', () => {
    const startPrompt = buildConversationTurnPrompt({
      history: [],
      isStart: true,
      displayName: 'Lan',
    });
    expect(startPrompt).toContain('Lan');
    expect(startPrompt).toContain('[Bắt đầu cuộc gọi]');

    const audioPrompt = buildConversationTurnPrompt({
      history: [{ role: 'assistant', englishText: 'Hi! How is your day?' }],
      isAudio: true,
    });
    expect(audioPrompt).toContain('Hi! How is your day?');
    expect(audioPrompt).toContain('attached audio');
  });

  it('parses JSON wrapped in markdown fences and supplies fallback hints if empty', () => {
    const raw = `\`\`\`json
    {
      "userTranscript": "Hello, hôm nay I go coffee",
      "naturalRewrite": "Hi! I went to get coffee today.",
      "coachingTip": "Dùng 'went to get coffee' sẽ tự nhiên hơn nhé!",
      "aiReplyEn": "Nice! What kind of coffee do you like?",
      "aiReplyVi": "Tuyệt! Bạn thích uống loại cà phê nào?",
      "replyHints": [
        { "en": "I like iced milk coffee.", "vi": "Mình thích cà phê sữa đá.", "phonetic": "ai lai ai-st miu có-phi" }
      ]
    }
    \`\`\``;

    const parsed = parseTutorTurnOutput(raw);
    expect(parsed.userTranscript).toBe('Hello, hôm nay I go coffee');
    expect(parsed.naturalRewrite).toBe('Hi! I went to get coffee today.');
    expect(parsed.replyHints).toHaveLength(1);
    expect(parsed.aiReplyEn).toBe('Nice! What kind of coffee do you like?');
  });
});
