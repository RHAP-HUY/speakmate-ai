'use client';

import { Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6">
      <div className="card-duo-elevated max-w-md w-full p-8 space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#C2410C]">Gián đoạn tạm thời</p>
          <h1 className="font-serif-display text-2xl font-bold text-[#1C1917]">
            Trang này đang gặp sự cố tải dữ liệu.
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Tiến trình học tập và chuỗi ngày của bạn vẫn được giữ nguyên. Bạn có thể tải lại trang hoặc quay về lộ trình chính.
          </p>
          {error.message && (
            <p className="mt-2 rounded-lg bg-[#F3EFE6] px-3 py-2 text-[11px] font-mono text-[#57534E] break-words">
              {error.message.slice(0, 160)}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-duo btn-duo-primary flex-1 py-2.5 text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Tải lại trang
          </button>
          <Link
            href="/"
            className="btn-duo btn-duo-white flex-1 py-2.5 text-sm"
          >
            <Home className="h-4 w-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
