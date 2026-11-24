import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const rawSize = Number(request.nextUrl.searchParams.get('size') || '192');
  const dim = rawSize === 120 || rawSize === 512 ? rawSize : 192;
  const radius = Math.round(dim * 0.23);
  const bubbleW = Math.round(dim * 0.54);
  const bubbleH = Math.round(dim * 0.45);
  const barW = Math.max(8, Math.round(dim * 0.068));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111827',
          borderRadius: radius,
        }}
      >
        <div
          style={{
            width: bubbleW,
            height: bubbleH,
            borderRadius: Math.round(dim * 0.12),
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Math.max(6, Math.round(dim * 0.055)),
          }}
        >
          <div
            style={{
              width: barW,
              height: Math.round(dim * 0.15),
              borderRadius: barW,
              backgroundColor: '#E5483F',
            }}
          />
          <div
            style={{
              width: barW,
              height: Math.round(dim * 0.25),
              borderRadius: barW,
              backgroundColor: '#111827',
            }}
          />
          <div
            style={{
              width: barW,
              height: Math.round(dim * 0.12),
              borderRadius: barW,
              backgroundColor: '#E5483F',
            }}
          />
        </div>
      </div>
    ),
    {
      width: dim,
      height: dim,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
