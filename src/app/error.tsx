'use client';

import { RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm space-y-5">
        <div className="flex justify-center">
          <NovaCompanion className="h-11 w-11" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Đã có gián đoạn nhỏ
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {error?.message || 'Trang tạm thời chưa thể hiển thị. Dữ liệu học tập của bạn vẫn được giữ nguyên.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-duo btn-duo-coral px-5 py-2.5 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại trang
          </button>
          <Link href="/" className="btn-duo btn-duo-white px-5 py-2.5 text-sm">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
