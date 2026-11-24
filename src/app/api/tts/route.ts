import { NextResponse, type NextRequest } from 'next/server';
import { checkSlidingWindowRateLimit } from '@/lib/rate-limit';
import { extractClientIp } from '@/lib/security';
import { synthesizeEdgeTtsMp3 } from '@/lib/tts-server';
import { sanitizeTextForTts } from '@/lib/tts-utils';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
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
    if (!sanitizeTextForTts(rawText)) {
      return NextResponse.json(
        { error: 'Thiếu nội dung văn bản để đọc.' },
        { status: 400 }
      );
    }

    const result = await synthesizeEdgeTtsMp3({
      text: rawText,
      voice: typeof body?.voice === 'string' ? body.voice : undefined,
      speed: typeof body?.speed === 'number' ? body.speed : undefined,
      connectionTimeoutMs: 5_000,
      synthesisTimeoutMs: 9_000,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(result.buffer.length),
        'Cache-Control': 'private, max-age=3600',
        'X-TTS-Cache': result.cacheHit ? 'HIT' : 'MISS',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Edge TTS không khả dụng.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
