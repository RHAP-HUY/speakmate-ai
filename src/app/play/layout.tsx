import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Thực hành phản xạ 2 phút',
  description:
    'Rèn phản xạ 15 giây, nghe hiểu ngữ cảnh bản xứ, ghép cấu trúc câu và luyện chấm phát âm IPA từng từ.',
};

export default function PlayLayout({ children }: { children: ReactNode }) {
  return children;
}
