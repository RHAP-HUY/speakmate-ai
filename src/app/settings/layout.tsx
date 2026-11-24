import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Hồ sơ & Cài đặt',
  description:
    'Tùy chỉnh giọng đọc bản xứ ưu tiên, tốc độ nói, khóa API cá nhân và sao lưu dữ liệu học tập trên Google Drive.',
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
