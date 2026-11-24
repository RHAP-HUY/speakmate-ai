import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist_Mono } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800', '900'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#18181B',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://speakmate-ai-nu.vercel.app'),
  title: 'SpeakMate — Luyện phản xạ nói tiếng Anh thực tế mỗi ngày',
  description:
    'Nền tảng luyện giao tiếp tiếng Anh thực chiến: phản xạ ngữ cảnh, hội thoại trực tiếp chấm phát âm từng âm tiết, sổ mẫu câu SRS và đồng bộ Google Drive 5TB.',
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
    title: 'SpeakMate — Luyện phản xạ nói tiếng Anh thực tế mỗi ngày',
    description:
      'Lộ trình luyện phản xạ 2 phút, hội thoại trực tiếp chấm phát âm IPA từng từ, lịch giữ chuỗi và đồng bộ tự động trên Google Drive 5TB.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'SpeakMate',
    url: 'https://speakmate-ai-nu.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpeakMate — Luyện phản xạ nói tiếng Anh thực tế mỗi ngày',
    description:
      'Luyện nghe hiểu, phản xạ câu bản xứ, hội thoại chấm phát âm từng từ và đồng bộ Google Drive 5TB.',
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
      className={`${beVietnamPro.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full text-zinc-900 flex flex-col selection:bg-blue-100 selection:text-blue-900">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
