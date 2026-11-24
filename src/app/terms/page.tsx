import type { Metadata } from 'next';
import Link from 'next/link';
import { NovaCompanion } from '@/components/BrandArt';

export const metadata: Metadata = {
  title: 'Điều khoản Sử dụng — SpeakMate',
  description:
    'Điều khoản sử dụng dịch vụ rèn luyện giao tiếp tiếng Anh trực tuyến SpeakMate.',
  alternates: { canonical: '/terms' },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <NovaCompanion className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-gray-900">
              SpeakMate
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        <div className="space-y-2 border-b border-gray-200 pb-6">
          <p className="text-xs font-semibold text-gray-400">
            Cập nhật hiệu lực: Tháng 11/2026
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            Điều khoản Sử dụng Dịch vụ
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Các quy định cơ bản nhằm đảm bảo môi trường học tập văn minh, an toàn và ổn định cho mọi học viên trên SpeakMate.
          </p>
        </div>

        <article className="space-y-6 text-sm text-gray-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-gray-900">
              1. Mục đích của nền tảng
            </h2>
            <p>
              SpeakMate cung cấp công cụ rèn luyện kỹ năng nghe hiểu, phản xạ câu, chấm điểm phát âm tiếng Anh và quản lý sổ từ vựng cá nhân theo phương pháp lặp lại ngắt quãng. Các nhận xét phát âm và đánh giá trình độ CEFR trên nền tảng mang tính chất hỗ trợ học tập, không thay thế chứng chỉ khảo thí quốc tế chính thức.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-gray-900">
              2. Quy tắc sử dụng hợp lý
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Người dùng cam kết không gửi nội dung vi phạm pháp luật, mã độc hoặc thực hiện các truy vấn tự động hàng loạt gây quá tải hệ thống.
              </li>
              <li>
                Hệ thống áp dụng giới hạn tần suất hợp lý (Rate Limiting) trên mỗi phiên nhằm đảm bảo tốc độ phản hồi ổn định cho tất cả người học.
              </li>
              <li>
                Nếu bạn tùy chọn nhập khóa Gemini API cá nhân, bạn hoàn toàn làm chủ hạn mức sử dụng của khóa đó và có thể gỡ bỏ bất cứ lúc nào.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-gray-900">
              3. Quyền sở hữu nội dung cá nhân
            </h2>
            <p>
              Bạn giữ toàn quyền sở hữu đối với danh sách mẫu câu tự thêm, ghi chú học tập và hồ sơ tiến trình của mình. Bạn có thể xuất toàn bộ dữ liệu ra tệp JSON hoặc TSV bất kỳ lúc nào mà không chịu bất kỳ ràng buộc khóa dữ liệu nào.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-3xl px-4 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} SpeakMate.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-900 underline">
              Chính sách quyền riêng tư
            </Link>
            <Link href="/" className="hover:text-gray-900 underline">
              Trang chủ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
