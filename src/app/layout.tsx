import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'SpeakMate AI — Vừa Học Vừa Chơi, Nói Tiếng Anh Như Người Bản Xứ',
  description:
    'Học giao tiếp tiếng Anh kiểu chơi game giống Duolingo kết hợp gọi thoại AI chấm phát âm từng từ, lịch giữ chuỗi nhận quà và đồng bộ Google Drive 5TB.',
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
