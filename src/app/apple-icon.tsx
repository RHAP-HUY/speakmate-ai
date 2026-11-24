import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 40,
          position: 'relative',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            color: '#FBF9F5',
            fontSize: 98,
            fontWeight: 700,
            letterSpacing: '-0.04em',
          }}
        >
          <span>S</span>
          <span style={{ color: '#EA580C', fontSize: 108 }}>.</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
