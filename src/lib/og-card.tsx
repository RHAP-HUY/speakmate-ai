import { ImageResponse } from 'next/og';

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
};

export function renderSpeakMateOgCard() {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        color: '#111827',
        padding: '60px 72px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <div style={{ width: 5, height: 14, borderRadius: 3, backgroundColor: '#E5483F' }} />
            <div style={{ width: 5, height: 22, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
            <div style={{ width: 5, height: 11, borderRadius: 3, backgroundColor: '#E5483F' }} />
          </div>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em' }}>
            SpeakMate
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            padding: '8px 18px',
            borderRadius: 999,
            backgroundColor: '#F6F7F9',
            border: '1px solid #E5E7EB',
            fontSize: 18,
            fontWeight: 600,
            color: '#4B5563',
          }}
        >
          US · UK · AU · CA Spoken English
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 940 }}>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: '#111827',
          }}
        >
          Nói tiếng Anh tự nhiên mỗi ngày cùng 6 người hướng dẫn bản xứ.
        </div>
        <div style={{ fontSize: 24, lineHeight: 1.45, color: '#4B5563' }}>
          Hội thoại thực tế · Phân tích phát âm IPA · Lặp lại ngắt quãng SRS · Kiểm tra CEFR 2 phút.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #E5E7EB',
          paddingTop: 24,
          fontSize: 19,
          color: '#6B7280',
        }}
      >
        <span style={{ color: '#E5483F', fontWeight: 700 }}>
          speakmate-ai-nu.vercel.app
        </span>
        <span>Miễn phí trải nghiệm · Đồng bộ Google Drive</span>
      </div>
    </div>
  );
}

export function createSpeakMateOgImage() {
  return new ImageResponse(renderSpeakMateOgCard(), {
    ...OG_IMAGE_SIZE,
  });
}
