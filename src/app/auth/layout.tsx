import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description:
    'Đăng nhập SpeakMate để đồng bộ chuỗi ngày học, sổ mẫu câu SRS và báo cáo hội thoại tự động trên Google Drive.',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
