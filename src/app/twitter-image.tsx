import { ImageResponse } from 'next/og';
import { renderSpeakMateOgCard } from '@/lib/og-card';

export const alt = 'SpeakMate — Luyện phản xạ nói tiếng Anh thực tế mỗi ngày';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(renderSpeakMateOgCard(), {
    ...size,
  });
}
