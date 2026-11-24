import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const rawSize = Number(request.nextUrl.searchParams.get('size') || '192');
  const dim = rawSize === 120 || rawSize === 512 ? rawSize : 192;
  const radius = Math.round(dim * 0.22);
  const fontSize = Math.round(dim * 0.54);
  const dotSize = Math.round(dim * 0.6);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#14532D',
          borderRadius: radius,
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            color: '#FBF9F5',
            fontSize,
            fontWeight: 700,
            letterSpacing: '-0.04em',
          }}
        >
          <span>S</span>
          <span style={{ color: '#EA580C', fontSize: dotSize }}>.</span>
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
