import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeakMate — Luyện nói tiếng Anh thực tế',
    short_name: 'SpeakMate',
    description:
      'Luyện giao tiếp tiếng Anh qua hội thoại thực tế, nghe hiểu bản xứ, lặp lại ngắt quãng SRS, phân tích phát âm IPA và đồng bộ trên Google Drive.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#111827',
    orientation: 'portrait-primary',
    lang: 'vi',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/api/logo?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/api/logo?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
