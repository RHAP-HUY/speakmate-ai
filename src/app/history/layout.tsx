import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Nhật ký & Chuỗi học tập',
  description:
    'Xem lịch học theo tháng, mở khóa 6 cột mốc phần thưởng chuỗi ngày và đọc lại báo cáo nhận xét từng buổi hội thoại.',
};

export default function HistoryLayout({ children }: { children: ReactNode }) {
  return children;
}
