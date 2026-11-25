import {
  BADGE_DIRECTORY,
  getLeagueInfo,
  getLevelInfo,
} from '@/lib/gamification';
import type { UserProfile } from '@/types';

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates and downloads a crisp 1080x1080 Luminous Consumer Craft PNG achievement card
 * summarizing the learner's speaking streak, level, XP, and active title.
 */
export function downloadStreakShareCardPng(profile: UserProfile): boolean {
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const levelInfo = getLevelInfo(profile.xp);
  const league = getLeagueInfo(profile.xp);
  const activeTitle =
    (profile.activeBadge && BADGE_DIRECTORY[profile.activeBadge]) ||
    league.nameVi;
  const displayName = (profile.displayName || 'Học viên SpeakMate').slice(0, 32);
  const bestStreak = Math.max(profile.streakDays, profile.longestStreak);

  // Outer warm studio canvas
  ctx.fillStyle = '#F6F7F9';
  ctx.fillRect(0, 0, 1080, 1080);

  // Subtle decorative coral glow top-right
  const glow = ctx.createRadialGradient(880, 180, 20, 880, 180, 340);
  glow.addColorStop(0, 'rgba(229, 72, 63, 0.14)');
  glow.addColorStop(1, 'rgba(229, 72, 63, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1080);

  // Main white studio card
  drawRoundedRect(ctx, 64, 64, 952, 952, 48);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E5E7EB';
  ctx.stroke();

  // Brand mark pill top-left
  drawRoundedRect(ctx, 128, 124, 52, 52, 16);
  ctx.fillStyle = '#E5483F';
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('S', 154, 160);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.fillText('SpeakMate', 196, 158);

  // Date stamp top-right
  const todayFormatted = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6B7280';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Chứng nhận ngày ${todayFormatted}`, 952, 156);

  // Active badge pill
  ctx.textAlign = 'left';
  drawRoundedRect(ctx, 128, 224, 420, 48, 24);
  ctx.fillStyle = '#FFF1F0';
  ctx.fill();
  ctx.fillStyle = '#E5483F';
  ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Danh hiệu: ${activeTitle}`, 152, 256);

  // Learner Name
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
  ctx.fillText(displayName, 128, 344);

  ctx.fillStyle = '#6B7280';
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(
    `Luyện phản xạ giao tiếp tiếng Anh thực tế · Trình độ ${profile.englishLevel}`,
    128,
    392
  );

  // Center Streak Showcase Box
  drawRoundedRect(ctx, 128, 444, 824, 260, 36);
  ctx.fillStyle = '#111827';
  ctx.fill();

  ctx.fillStyle = '#FCA5A5';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('CHUỖI NGÀY LUYỆN NÓI LIÊN TIẾP', 176, 506);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 116px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${profile.streakDays}`, 176, 632);

  const streakDigitsWidth = ctx.measureText(`${profile.streakDays}`).width;
  ctx.fillStyle = '#E5483F';
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.fillText('ngày bền bỉ', 176 + streakDigitsWidth + 24, 624);

  ctx.fillStyle = '#9CA3AF';
  ctx.font = '500 22px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Kỷ lục cá nhân: ${bestStreak} ngày`, 176, 676);

  // 3 Bottom Metric Tiles
  const metrics = [
    {
      label: 'Cấp độ hiện tại',
      value: `Cấp ${levelInfo.level}`,
      accent: '#059669',
    },
    {
      label: 'Điểm kinh nghiệm',
      value: `${profile.xp.toLocaleString('vi-VN')} XP`,
      accent: '#111827',
    },
    {
      label: 'Bài hoàn thành',
      value: `${profile.totalLessonsCompleted} bài`,
      accent: '#111827',
    },
  ];

  metrics.forEach((m, idx) => {
    const boxW = 256;
    const gap = 28;
    const x = 128 + idx * (boxW + gap);
    const y = 744;

    drawRoundedRect(ctx, x, y, boxW, 152, 28);
    ctx.fillStyle = '#F6F7F9';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#E5E7EB';
    ctx.stroke();

    ctx.fillStyle = '#6B7280';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(m.label, x + 28, y + 50);

    ctx.fillStyle = m.accent;
    ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
    ctx.fillText(m.value, x + 28, y + 112);
  });

  // Footer URL
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '500 21px system-ui, -apple-system, sans-serif';
  ctx.fillText('speakmate-ai-nu.vercel.app · Luyện nói tiếng Anh 1-kèm-1', 128, 964);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `speakmate-streak-${profile.streakDays}d.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}
