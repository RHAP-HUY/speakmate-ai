import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Bảng xếp hạng tuần',
  description:
    'Theo dõi thứ hạng XP, chuỗi ngày học và thăng hạng qua 5 bậc giải đấu cùng cộng đồng học viên SpeakMate.',
};

export default function LeaderboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
