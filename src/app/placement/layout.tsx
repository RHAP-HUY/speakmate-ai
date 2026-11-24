import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Kiểm tra trình độ CEFR (2 phút)',
  description:
    'Bài kiểm tra định vị trình độ giao tiếp tiếng Anh A1 đến C1 miễn phí qua nghe giọng bản xứ và tình huống thực tế.',
};

export default function PlacementLayout({ children }: { children: ReactNode }) {
  return children;
}
