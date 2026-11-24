import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import {
  buildTtsCacheKey,
  getCachedTtsAudio,
  setCachedTtsAudio,
} from '@/lib/tts-cache';
import {
  resolveEdgeVoice,
  sanitizeTextForTts,
  speedToEdgeRate,
} from '@/lib/tts-utils';

export interface SynthesizeTtsResult {
  buffer: Buffer;
  cacheHit: boolean;
  voice: string;
}

/**
 * Synthesizes crisp natural MP3 speech via Microsoft Edge Neural TTS with
 * in-memory LRU caching and strict connection/synthesis timeouts.
 */
export async function synthesizeEdgeTtsMp3(params: {
  text: string;
  voice?: string;
  speed?: number;
  connectionTimeoutMs?: number;
  synthesisTimeoutMs?: number;
}): Promise<SynthesizeTtsResult> {
  const cleanedText = sanitizeTextForTts(params.text);
  if (!cleanedText) {
    throw new Error('Thiếu nội dung văn bản để đọc.');
  }

  const voice = resolveEdgeVoice(params.voice);
  const rate = speedToEdgeRate(params.speed);
  const cacheKey = buildTtsCacheKey(voice, rate, cleanedText);

  const cached = getCachedTtsAudio(cacheKey);
  if (cached) {
    return { buffer: cached, cacheHit: true, voice };
  }

  const connectionTimeoutMs = params.connectionTimeoutMs ?? 5_000;
  const synthesisTimeoutMs = params.synthesisTimeoutMs ?? 8_000;
  let tts: MsEdgeTTS | null = null;

  try {
    tts = new MsEdgeTTS({
      connectionTimeoutMs,
      synthesisTimeoutMs,
    });

    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanedText, { rate });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const hardTimer = setTimeout(() => {
        reject(new Error('Edge TTS timeout'));
      }, synthesisTimeoutMs + 1_000);

      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on('end', () => {
        clearTimeout(hardTimer);
        resolve();
      });
      audioStream.on('error', (err) => {
        clearTimeout(hardTimer);
        reject(err);
      });
    });

    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length === 0) {
      throw new Error('Không nhận được dữ liệu âm thanh từ Edge TTS.');
    }

    setCachedTtsAudio(cacheKey, audioBuffer);
    return { buffer: audioBuffer, cacheHit: false, voice };
  } finally {
    if (tts) {
      try {
        tts.close();
      } catch {
        // Ignore close cleanup errors
      }
    }
  }
}
