import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { NextResponse, type NextRequest } from 'next/server';
import {
  resolveEdgeVoice,
  sanitizeTextForTts,
  speedToEdgeRate,
} from '@/lib/tts-utils';

export async function POST(request: NextRequest) {
  let tts: MsEdgeTTS | null = null;

  try {
    const body = (await request.json()) as {
      text?: string;
      voice?: string;
      speed?: number;
    };

    const cleanedText = sanitizeTextForTts(body.text ?? '');
    if (!cleanedText) {
      return NextResponse.json(
        { error: 'Thiếu nội dung văn bản để đọc.' },
        { status: 400 }
      );
    }

    const voice = resolveEdgeVoice(body.voice);
    const rate = speedToEdgeRate(body.speed);

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

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'private, max-age=3600',
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
