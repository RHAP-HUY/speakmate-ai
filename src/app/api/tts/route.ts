import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { NextResponse, type NextRequest } from 'next/server';
import { checkSlidingWindowRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/security';
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

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  let tts: MsEdgeTTS | null = null;

  try {
    const rl = checkSlidingWindowRateLimit({
      namespace: 'tts',
      key: extractClientIp(request.headers),
      limit: 60,
      windowMs: 60_000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Bạn gửi yêu cầu đọc giọng quá nhanh. Vui lòng thử lại sau giây lát.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSeconds) },
        }
      );
    }

    let body: {
      text?: unknown;
      voice?: unknown;
      speed?: unknown;
    };
    try {
      body = (await request.json()) as {
        text?: unknown;
        voice?: unknown;
        speed?: unknown;
      };
    } catch {
      return NextResponse.json(
        { error: 'Dữ liệu yêu cầu đọc giọng không hợp lệ.' },
        { status: 400 }
      );
    }

    const rawText = typeof body?.text === 'string' ? body.text : '';
    const cleanedText = sanitizeTextForTts(rawText);
    if (!cleanedText) {
      return NextResponse.json(
        { error: 'Thiếu nội dung văn bản để đọc.' },
        { status: 400 }
      );
    }

    const voice = resolveEdgeVoice(
      typeof body?.voice === 'string' ? body.voice : undefined
    );
    const rate = speedToEdgeRate(
      typeof body?.speed === 'number' ? body.speed : undefined
    );
    const cacheKey = buildTtsCacheKey(voice, rate, cleanedText);

    const cached = getCachedTtsAudio(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(cached.length),
          'Cache-Control': 'private, max-age=3600',
          'X-TTS-Cache': 'HIT',
        },
      });
    }

    tts = new MsEdgeTTS({
      connectionTimeoutMs: 7000,
      synthesisTimeoutMs: 12000,
    });

    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(cleanedText, { rate });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      audioStream.on('end', () => resolve());
      audioStream.on('error', (err) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length === 0) {
      throw new Error('Không nhận được dữ liệu âm thanh từ Edge TTS.');
    }

    setCachedTtsAudio(cacheKey, audioBuffer);

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'private, max-age=3600',
        'X-TTS-Cache': 'MISS',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Edge TTS không khả dụng.';
    return NextResponse.json({ error: message }, { status: 502 });
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
