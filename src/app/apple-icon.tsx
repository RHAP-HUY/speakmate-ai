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
          backgroundColor: '#111827',
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 96,
            height: 82,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <div style={{ width: 12, height: 26, borderRadius: 6, backgroundColor: '#E5483F' }} />
          <div style={{ width: 12, height: 46, borderRadius: 6, backgroundColor: '#111827' }} />
          <div style={{ width: 12, height: 20, borderRadius: 6, backgroundColor: '#E5483F' }} />
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
