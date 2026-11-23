import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildTtsCacheKey,
  clearTtsCacheForTest,
  getCachedTtsAudio,
  getTtsCacheStats,
  setCachedTtsAudio,
} from '@/lib/tts-cache';

describe('tts-cache (Server-side LRU Audio Cache)', () => {
  beforeEach(() => {
    clearTtsCacheForTest();
  });

  it('tracks cache misses and hits accurately', () => {
    const key = buildTtsCacheKey('en-US-JennyNeural', '+0%', 'Hello Nova');
    expect(getCachedTtsAudio(key)).toBeNull();

    const buf = Buffer.from('fake-mp3-audio-payload');
    setCachedTtsAudio(key, buf);

    const hit = getCachedTtsAudio(key);
    expect(hit).not.toBeNull();
    expect(hit?.equals(buf)).toBe(true);

    const stats = getTtsCacheStats();
    expect(stats.entries).toBe(1);
    expect(stats.bytes).toBe(buf.length);
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);
  });

  it('ignores empty or oversized >256KB buffers', () => {
    const k1 = buildTtsCacheKey('en-US-JennyNeural', '+0%', 'empty');
    setCachedTtsAudio(k1, Buffer.alloc(0));
    expect(getCachedTtsAudio(k1)).toBeNull();

    const k2 = buildTtsCacheKey('en-US-JennyNeural', '+0%', 'huge');
    setCachedTtsAudio(k2, Buffer.alloc(300 * 1024));
    expect(getCachedTtsAudio(k2)).toBeNull();
  });

  it('evicts oldest entries when reaching LRU capacity', () => {
    for (let i = 0; i < 70; i++) {
      const k = buildTtsCacheKey('en-US-JennyNeural', '+0%', `phrase-${i}`);
      setCachedTtsAudio(k, Buffer.from(`audio-data-${i}`));
    }
    const stats = getTtsCacheStats();
    expect(stats.entries).toBeLessThanOrEqual(64);
    expect(
      getCachedTtsAudio(buildTtsCacheKey('en-US-JennyNeural', '+0%', 'phrase-0'))
    ).toBeNull();
    expect(
      getCachedTtsAudio(
        buildTtsCacheKey('en-US-JennyNeural', '+0%', 'phrase-69')
      )
    ).not.toBeNull();
  });
});
