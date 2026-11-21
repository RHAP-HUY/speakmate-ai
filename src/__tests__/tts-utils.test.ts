import { describe, expect, it } from 'vitest';
import {
  resolveEdgeVoice,
  sanitizeTextForTts,
  speedToEdgeRate,
} from '@/lib/tts-utils';

describe('tts-utils', () => {
  it('converts numeric speed to clamped Edge TTS rate percentages', () => {
    expect(speedToEdgeRate(0.85)).toBe('-15%');
    expect(speedToEdgeRate(1.0)).toBe('+0%');
    expect(speedToEdgeRate(1.1)).toBe('+10%');
    expect(speedToEdgeRate(0.2)).toBe('-35%');
    expect(speedToEdgeRate(2.0)).toBe('+35%');
  });

  it('allowlists only known persona voices', () => {
    expect(resolveEdgeVoice('en-GB-SoniaNeural')).toBe('en-GB-SoniaNeural');
    expect(resolveEdgeVoice('malicious-voice')).toBe(
      'en-US-EmmaMultilingualNeural'
    );
  });

  it('strips markdown symbols before speech synthesis', () => {
    expect(sanitizeTextForTts('Hello **Minh**!   `How` are you?')).toBe(
      'Hello Minh ! How are you?'
    );
  });
});
