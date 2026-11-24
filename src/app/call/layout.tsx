import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Phòng hội thoại trực tiếp',
  description:
    'Trò chuyện trực tiếp bằng giọng nói cùng 6 người hướng dẫn bản xứ Mỹ, Anh, Úc, Canada và nhận phân tích phát âm chi tiết.',
};

export default function CallLayout({ children }: { children: ReactNode }) {
  return children;
}
