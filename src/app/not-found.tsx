import { Compass, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { NovaCompanion } from '@/components/BrandArt';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mesh-light flex items-center justify-center p-6">
      <div className="card-duo-elevated max-w-md w-full p-8 text-center space-y-5">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-50 via-violet-50 to-cyan-50 border border-indigo-100">
          <NovaCompanion mood="excited" className="h-20 w-20 animate-gentle-float" />
        </div>
        <div>
          <span className="inline-block rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-black text-indigo-700">
            404 · KHÔNG TÌM THẤY TRANG
          </span>
          <h1 className="mt-2.5 text-2xl font-black text-slate-900">
            Nova không tìm thấy trạm học này!
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-600">
            Đường dẫn có thể đã thay đổi. Quay lại Lộ trình Học &amp; Chơi để giữ chuỗi hôm nay nhé!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/"
            className="btn-duo btn-duo-primary flex-1 py-3 text-xs uppercase"
          >
            <Compass className="h-4 w-4" />
            Về Lộ trình
          </Link>
          <Link
            href="/play"
            className="btn-duo btn-duo-orange flex-1 py-3 text-xs uppercase"
          >
            <Gamepad2 className="h-4 w-4" />
            Chơi Game ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
