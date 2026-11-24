import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeakMate — Luyện nói tiếng Anh thực tế',
    short_name: 'SpeakMate',
    description:
      'Luyện giao tiếp tiếng Anh qua hội thoại thực tế, nghe hiểu bản xứ, phân tích phát âm IPA và đồng bộ trên Google Drive.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBF9F5',
    theme_color: '#14532D',
    orientation: 'portrait-primary',
    lang: 'vi',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
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
