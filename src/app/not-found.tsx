import Link from 'next/link';
import { NovaCompanion } from '@/components/BrandArt';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm space-y-5">
        <div className="flex justify-center">
          <NovaCompanion className="h-11 w-11" />
        </div>
        <div className="space-y-1.5">
          <p className="font-mono text-xs font-semibold text-[#E5483F]">404</p>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Không tìm thấy trang này
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Liên kết có thể đã thay đổi hoặc không tồn tại. Bạn có thể quay về trang chính để tiếp tục luyện tập.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link href="/" className="btn-duo btn-duo-primary px-6 py-2.5 text-sm">
            Về trang chủ
          </Link>
          <Link href="/placement" className="btn-duo btn-duo-white px-5 py-2.5 text-sm">
            Kiểm tra CEFR
          </Link>
        </div>
      </div>
    </div>
  );
}
