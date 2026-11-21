import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Geist_Mono } from 'next/font/google';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SpeakMate AI — Luyện Giao Tiếp Tiếng Anh Như Người Bản Xứ',
  description:
    'Ứng dụng gọi thoại AI luyện phản xạ tiếng Anh mọi trình độ A0-C1 với phụ đề song ngữ, sửa câu tự nhiên và đồng bộ đa thiết bị.',
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
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
