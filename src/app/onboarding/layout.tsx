import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Thiết lập lộ trình cá nhân',
  description:
    'Chọn trình độ, sở thích, giọng đọc bản xứ yêu thích và mục tiêu luyện nói mỗi ngày trên SpeakMate.',
};

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
