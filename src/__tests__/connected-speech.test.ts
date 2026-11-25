import { describe, expect, it } from 'vitest';
import { analyzeConnectedSpeech } from '@/lib/connected-speech';

describe('analyzeConnectedSpeech', () => {
  it('detects natural palatalization blend in Could you and consonant-to-vowel linking', () => {
    const guide = analyzeConnectedSpeech('Could you take a look at it?');
    expect(guide.linkedDisplay).toContain('Could‿you');
    expect(guide.linkedDisplay).toContain('take‿a');
    expect(guide.linkedDisplay).toContain('look‿at‿it?');
    expect(guide.coachNoteVi).toContain('/dʒuː/');
  });

  it('does not falsely link words ending in vowel sounds like latte or coffee', () => {
    const guide = analyzeConnectedSpeech('I would like an iced latte and a pastry.');
    expect(guide.linkedDisplay).toContain('like‿an‿iced');
    expect(guide.linkedDisplay).not.toContain('latte‿and');
    expect(guide.linkedDisplay).toContain('and‿a');
  });

  it('identifies meaningful stressed content words and skips function words', () => {
    const guide = analyzeConnectedSpeech(
      'Can we schedule a quick meeting for Friday?'
    );
    expect(guide.stressedWords).toEqual([
      'schedule',
      'quick',
      'meeting',
      'Friday',
    ]);
  });
});
