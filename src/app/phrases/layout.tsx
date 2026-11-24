import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sổ mẫu câu & Ôn tập SRS',
  description:
    'Lưu trữ cụm từ bản xứ, ôn thẻ lật theo đường cong trí nhớ SM-2 và xuất bảng TSV cho Anki / Excel.',
};

export default function PhrasesLayout({ children }: { children: ReactNode }) {
  return children;
}
