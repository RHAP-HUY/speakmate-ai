import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeakMate AI — Vừa Học Vừa Chơi Tiếng Anh',
    short_name: 'SpeakMate',
    description:
      'Ứng dụng học nói tiếng Anh kiểu Vừa Học Vừa Chơi cùng trợ lý giọng nói AI Nova, chấm phát âm từng từ, lịch giữ chuỗi nhận quà và đồng bộ Google Drive 5TB.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F6FB',
    theme_color: '#4F46E5',
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
