import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildClientTtsCacheKey,
  clearClientTtsCache,
  getClientTtsCacheSize,
  pickSupportedAudioMimeType,
  playNaturalVoice,
  preloadNaturalVoice,
  stopVoicePlayback,
} from '@/lib/audio';

describe('Client Audio & TTS Engine', () => {
  const originalFetch = globalThis.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    clearClientTtsCache();
    stopVoicePlayback();
    URL.createObjectURL = vi.fn(() => 'blob:mock-tts-audio');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('builds deterministic normalized TTS cache keys', () => {
    expect(
      buildClientTtsCacheKey('en-US-EmmaMultilingualNeural', 0.9, '  Hello world!  ')
    ).toBe('en-US-EmmaMultilingualNeural|0.90|Hello world!');
  });

  it('aborts an in-flight TTS fetch immediately when stopVoicePlayback is called', async () => {
    let capturedSignal: AbortSignal | undefined;
    globalThis.fetch = vi.fn((_input, init) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;

    const playbackPromise = playNaturalVoice({
      text: 'How are you doing today?',
      voice: 'en-US-EmmaMultilingualNeural',
      browserLang: 'en-US',
      speed: 0.9,
    });

    stopVoicePlayback();
    await playbackPromise;

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('preloads audio into the client cache and deduplicates repeat calls', async () => {
    // Provide minimal window stub so preloadNaturalVoice runs in node test env
    const hadWindow = 'window' in globalThis;
    if (!hadWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: {
          setTimeout: globalThis.setTimeout.bind(globalThis),
          clearTimeout: globalThis.clearTimeout.bind(globalThis),
        },
        configurable: true,
        writable: true,
      });
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['fake-mp3-bytes'], { type: 'audio/mpeg' }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await preloadNaturalVoice({
        text: 'Could you take a quick look at this draft?',
        voice: 'en-US-EmmaMultilingualNeural',
        speed: 0.88,
      });
      expect(getClientTtsCacheSize()).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call for same text+voice+speed must hit cache without fetching again
      await preloadNaturalVoice({
        text: 'Could you take a quick look at this draft?',
        voice: 'en-US-EmmaMultilingualNeural',
        speed: 0.88,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      clearClientTtsCache();
      expect(getClientTtsCacheSize()).toBe(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-tts-audio');
    } finally {
      if (!hadWindow) {
        delete (globalThis as Record<string, unknown>).window;
      }
    }
  });

  it('ignores blank text cleanly and invokes onEnd', async () => {
    const onEnd = vi.fn();
    await playNaturalVoice({
      text: '   ',
      voice: 'en-US-EmmaMultilingualNeural',
      browserLang: 'en-US',
      speed: 0.9,
      onEnd,
    });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('falls back to audio/webm mime type when MediaRecorder is unavailable', () => {
    expect(pickSupportedAudioMimeType()).toBe('audio/webm');
  });
});
