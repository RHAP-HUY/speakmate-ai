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
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://speakmate-ai-nu.vercel.app'),
  title: 'SpeakMate AI — Vừa Học Vừa Chơi, Nói Tiếng Anh Như Người Bản Xứ',
  description:
    'Học giao tiếp tiếng Anh tương tác Vừa Học Vừa Chơi cùng trợ lý AI Nova chấm phát âm từng từ, bảng xếp hạng tuần, lịch giữ chuỗi nhận quà và đồng bộ Google Drive 5TB.',
  applicationName: 'SpeakMate AI',
  alternates: {
    canonical: '/',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SpeakMate AI',
  },
  openGraph: {
    title: 'SpeakMate AI — Vừa Học Vừa Chơi, Nói Tiếng Anh Như Người Bản Xứ',
    description:
      'Lộ trình trò chơi phản xạ 2 phút, gọi thoại gia sư AI chấm phát âm từng từ, Bảng Xếp Hạng tuần & Rương Thưởng Chuỗi đồng bộ Google Drive 5TB.',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'SpeakMate AI',
    url: 'https://speakmate-ai-nu.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpeakMate AI — Vừa Học Vừa Chơi, Nói Tiếng Anh Như Người Bản Xứ',
    description:
      'Trợ lý AI Nova chấm phát âm từng từ, 5 chế độ game phản xạ, bảng xếp hạng tuần & đồng bộ Google Drive 5TB.',
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
      <body className="min-h-full text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-800">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
