import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist_Mono, Newsreader } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

const newsreader = Newsreader({
  variable: '--font-serif-editorial',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#14532D',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://speakmate-ai-nu.vercel.app'),
  title: 'SpeakMate — Luyện nói tiếng Anh tự nhiên qua hội thoại thực tế',
  description:
    'Rèn phản xạ giao tiếp tiếng Anh mỗi ngày cùng 6 giọng đọc bản xứ, phân tích phát âm IPA từng âm tiết, sổ mẫu câu và đồng bộ Google Drive.',
  applicationName: 'SpeakMate',
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpeakMate',
  },
  openGraph: {
    title: 'SpeakMate — Luyện nói tiếng Anh tự nhiên qua hội thoại thực tế',
    description:
      'Bài tập phản xạ ngắn 2 phút, hội thoại nhập vai cùng 6 giọng bản xứ, phân tích phát âm từng âm tiết và đồng bộ tự động trên Google Drive.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'SpeakMate',
    url: 'https://speakmate-ai-nu.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpeakMate — Luyện nói tiếng Anh tự nhiên qua hội thoại thực tế',
    description:
      'Luyện nghe hiểu, phản xạ câu bản xứ, hội thoại chấm phát âm IPA từng từ và đồng bộ Google Drive.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${newsreader.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-[#1C1917] flex flex-col selection:bg-[#14532D]/15 selection:text-[#14532D]">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
