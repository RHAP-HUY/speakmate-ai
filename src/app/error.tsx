'use client';

import { Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { NovaCompanion } from '@/components/BrandArt';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-mesh-light flex items-center justify-center p-6">
      <div className="card-duo-elevated max-w-md w-full p-8 text-center space-y-5">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100">
          <NovaCompanion mood="happy" className="h-20 w-20" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Ối! Có chút trục trặc nhỏ
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 leading-relaxed">
            Dữ liệu học tập và chuỗi ngày của bạn vẫn an toàn tuyệt đối trên Google Drive 5TB. Hãy bấm tải lại trang để tiếp tục nhé!
          </p>
          {error.message && (
            <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-mono text-slate-500 break-words">
              {error.message.slice(0, 160)}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-duo btn-duo-primary flex-1 py-3 text-xs uppercase"
          >
            <RotateCcw className="h-4 w-4" />
            Thử lại ngay
          </button>
          <Link
            href="/"
            className="btn-duo btn-duo-white flex-1 py-3 text-xs uppercase"
          >
            <Home className="h-4 w-4" />
            Về Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
