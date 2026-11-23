import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SpeakMate AI — Vừa Học Vừa Chơi Tiếng Anh',
    short_name: 'SpeakMate',
    description:
      'Ứng dụng học nói tiếng Anh kiểu chơi game Duolingo kết hợp gọi thoại AI chấm phát âm từng từ, lịch giữ chuỗi nhận quà và đồng bộ Google Drive 5TB.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9FC',
    theme_color: '#58CC02',
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
