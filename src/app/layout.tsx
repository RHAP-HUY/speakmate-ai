import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-display-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#111827',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://speakmate-ai-nu.vercel.app'),
  title: {
    default: 'SpeakMate — Luyện nói tiếng Anh tự nhiên qua hội thoại thực tế',
    template: '%s · SpeakMate',
  },
  description:
    'Rèn phản xạ giao tiếp tiếng Anh mỗi ngày cùng 6 người hướng dẫn bản xứ, phân tích phát âm IPA từng âm tiết, lặp lại ngắt quãng SRS và đồng bộ Google Drive.',
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SpeakMate',
    url: 'https://speakmate-ai-nu.vercel.app',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, iOS, Android',
    inLanguage: ['vi', 'en'],
    description:
      'Nền tảng rèn phản xạ giao tiếp tiếng Anh qua hội thoại thực tế, kiểm tra định vị trình độ CEFR, phân tích phát âm IPA và ôn tập ngắt quãng SRS.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'VND',
    },
  };

  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${plusJakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-[#111827] flex flex-col selection:bg-[#E5483F]/15 selection:text-[#B91C1C]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-[#111827] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Chuyển tới nội dung chính
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
