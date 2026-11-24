import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeakMate — Luyện phản xạ nói tiếng Anh',
    short_name: 'SpeakMate',
    description:
      'Nền tảng luyện giao tiếp tiếng Anh thực tế: phản xạ ngữ cảnh, hội thoại chấm phát âm từng âm tiết, sổ mẫu câu và đồng bộ Google Drive 5TB.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F6',
    theme_color: '#18181B',
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
