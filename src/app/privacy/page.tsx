import type { Metadata } from 'next';
import Link from 'next/link';
import { NovaCompanion } from '@/components/BrandArt';

export const metadata: Metadata = {
  title: 'Chính sách Quyền riêng tư — SpeakMate',
  description:
    'Chính sách bảo vệ quyền riêng tư, phạm vi sử dụng Google OAuth / Google Drive và quyền kiểm soát dữ liệu của người học trên SpeakMate.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPolicyPage() {
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
            Chính sách Quyền riêng tư &amp; Bảo vệ Dữ liệu
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            SpeakMate cam kết thu thập tối thiểu, minh bạch mục đích lưu trữ và trao toàn quyền kiểm soát dữ liệu học tập cho người dùng.
          </p>
        </div>

        <article className="space-y-6 text-sm text-gray-600 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-gray-900">
              1. Thông tin được thu thập khi bạn sử dụng ứng dụng
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Thông tin định danh tài khoản cơ bản:</strong> Khi bạn đăng nhập bằng Google OAuth, hệ thống chỉ nhận mã định danh tài khoản (`sub`), địa chỉ email, tên hiển thị và ảnh đại diện công khai để khởi tạo hồ sơ học viên.
              </li>
              <li>
                <strong>Dữ liệu tiến trình học tập:</strong> Chuỗi ngày học (Streak), điểm kinh nghiệm (XP), các mẫu câu bạn chủ động lưu vào sổ tay và tóm tắt nhận xét sau buổi hội thoại.
              </li>
              <li>
                <strong>Dữ liệu giọng nói trong bài luyện phát âm:</strong> Đoạn âm thanh ngắn khi bạn bấm nút Micro chỉ được gửi qua kết nối mã hóa HTTPS tới dịch vụ phân tích ngữ âm để trả về điểm số và góp ý IPA ngay trong phiên học; hệ thống không lưu trữ tệp ghi âm thô lâu dài và không bán cho bất kỳ bên thứ ba nào.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-gray-900">
              2. Tuân thủ Chính sách Dữ liệu Người dùng của Dịch vụ Google API
            </h2>
            <p>
              Việc sử dụng và chuyển giao thông tin nhận được từ các Google API của SpeakMate tuân thủ nghiêm ngặt{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#E5483F] underline"
              >
                Google API Services User Data Policy
              </a>
              , bao gồm các yêu cầu Sử dụng Giới hạn (Limited Use requirements):
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Ứng dụng <strong>chỉ truy cập tệp dữ liệu học tập riêng của SpeakMate</strong> (phạm vi `drive.file` hoặc thư mục lưu trữ chuyên biệt của ứng dụng), tuyệt đối không đọc, sửa hay xóa bất kỳ tệp tài liệu cá nhân nào khác trên Google Drive của bạn.
              </li>
              <li>
                Không sử dụng dữ liệu Google của bạn cho mục đích quảng cáo, tiếp thị lại hoặc chuyển giao cho bên môi giới dữ liệu.
              </li>
              <li>
                Khóa API cá nhân (nếu bạn tự cấu hình trong mục Cài đặt) được mã hóa chuẩn <strong>AES-256-GCM</strong> trước khi lưu trữ.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-gray-900">
              3. Quyền xuất, khôi phục và xóa dữ liệu của bạn
            </h2>
            <p>
              Tại trang <Link href="/settings" className="font-semibold text-gray-900 underline">Cài đặt &amp; Hồ sơ</Link>, bạn có thể tải toàn bộ dữ liệu học tập của mình dưới định dạng JSON tiêu chuẩn hoặc xuất sổ từ vựng dưới định dạng TSV bất cứ lúc nào. Bạn cũng có thể ngắt kết nối ứng dụng khỏi tài khoản Google tại trang Quản lý Quyền truy cập của Google.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-[#F6F7F9] p-5 space-y-2 text-xs text-gray-600">
            <h2 className="font-display text-sm font-bold text-gray-900">
              English Summary (Google OAuth &amp; API Limited Use Disclosure)
            </h2>
            <p>
              SpeakMate (`https://speakmate-ai-nu.vercel.app`) uses Google Sign-In solely to authenticate learners and synchronize their SpeakMate learning progress bundle (streak calendar, saved English phrases, and session summaries). SpeakMate&apos;s use and transfer to any other app of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. We never access unrelated files in a user&apos;s Google Drive, never sell user data, and never use user data for advertising.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-500">
        <div className="mx-auto max-w-3xl px-4 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} SpeakMate.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-gray-900 underline">
              Điều khoản sử dụng
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
