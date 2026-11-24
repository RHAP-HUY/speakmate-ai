import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6">
      <div className="card-duo-elevated max-w-md w-full p-8 space-y-5">
        <div className="space-y-2">
          <p className="font-mono text-xs text-[#78716C]">404</p>
          <h1 className="font-serif-display text-2xl font-bold text-[#1C1917]">
            Không tìm thấy trang bạn yêu cầu.
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            Liên kết có thể đã thay đổi hoặc không còn tồn tại. Mời bạn quay lại lộ trình học chính.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href="/"
            className="btn-duo btn-duo-primary flex-1 py-2.5 text-sm"
          >
            Về lộ trình học
          </Link>
          <Link
            href="/play"
            className="btn-duo btn-duo-white flex-1 py-2.5 text-sm"
          >
            Sang mục luyện tập
          </Link>
        </div>
      </div>
    </div>
  );
}
