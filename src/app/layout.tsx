import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist_Mono } from 'next/font/google';
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
  themeColor: '#58CC02',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'SpeakMate AI — Vừa Học Vừa Chơi, Nói Tiếng Anh Như Người Bản Xứ',
  description:
    'Học giao tiếp tiếng Anh kiểu chơi game giống Duolingo kết hợp gọi thoại AI chấm phát âm từng từ, bảng xếp hạng tuần, lịch giữ chuỗi nhận quà và đồng bộ Google Drive 5TB.',
  applicationName: 'SpeakMate AI',
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
      <body className="min-h-full bg-[#F7F9FC] text-[#1E293B] flex flex-col selection:bg-[#DDF4FF] selection:text-[#1899D6]">
        {children}
      </body>
    </html>
  );
}
