import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chính sách Quyền riêng tư — SpeakMate',
  description:
    'Chính sách bảo vệ quyền riêng tư, phạm vi sử dụng Google OAuth / Google Drive và quyền kiểm soát dữ liệu của người học trên SpeakMate.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#1C1917] flex flex-col">
      <header className="border-b border-[#E7E2D8] bg-[#FBF9F5]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="font-serif-display text-2xl font-bold text-[#1C1917]">
              SpeakMate
            </span>
            <span className="font-serif-display text-2xl font-bold text-[#C2410C]">
              .
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-[#57534E] hover:text-[#1C1917]"
          >
            ← Quay lại trang chủ
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-16 space-y-8">
        <div className="space-y-2 border-b border-[#E7E2D8] pb-6">
          <p className="font-serif-display italic text-sm text-[#C2410C]">
            Cập nhật hiệu lực: Tháng 11/2026
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            Chính sách Quyền riêng tư &amp; Bảo vệ Dữ liệu
          </h1>
          <p className="text-sm text-[#57534E] leading-relaxed">
            SpeakMate cam kết thu thập tối thiểu, minh bạch mục đích lưu trữ và trao toàn quyền kiểm soát dữ liệu học tập cho người dùng.
          </p>
        </div>

        <article className="space-y-6 text-sm text-[#44403C] leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
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
            <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
              2. Tuân thủ Chính sách Dữ liệu Người dùng của Dịch vụ Google API
            </h2>
            <p>
              Việc sử dụng và chuyển giao thông tin nhận được từ các Google API của SpeakMate tuân thủ nghiêm ngặt{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#14532D] underline"
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
            <h2 className="font-serif-display text-xl font-semibold text-[#1C1917]">
              3. Quyền xuất, khôi phục và xóa dữ liệu của bạn
            </h2>
            <p>
              Tại trang <Link href="/settings" className="text-[#14532D] underline">Cài đặt &amp; Hồ sơ</Link>, bạn có thể tải toàn bộ dữ liệu học tập của mình dưới định dạng JSON tiêu chuẩn hoặc xuất sổ từ vựng dưới định dạng TSV bất cứ lúc nào. Bạn cũng có thể ngắt kết nối ứng dụng khỏi tài khoản Google tại trang Quản lý Quyền truy cập của Google.
            </p>
          </section>

          <section className="rounded-2xl border border-[#E7E2D8] bg-white p-5 space-y-2 text-xs text-[#57534E]">
            <h2 className="font-serif-display text-base font-semibold text-[#1C1917]">
              English Summary (Google OAuth &amp; API Limited Use Disclosure)
            </h2>
            <p>
              SpeakMate (`https://speakmate-ai-nu.vercel.app`) uses Google Sign-In solely to authenticate learners and synchronize their SpeakMate learning progress bundle (streak calendar, saved English phrases, and session summaries). SpeakMate&apos;s use and transfer to any other app of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. We never access unrelated files in a user&apos;s Google Drive, never sell user data, and never use user data for advertising.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-[#E7E2D8] py-6 text-center text-xs text-[#78716C]">
        <div className="mx-auto max-w-3xl px-4 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} SpeakMate.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-[#1C1917] underline">
              Điều khoản sử dụng
            </Link>
            <Link href="/" className="hover:text-[#1C1917] underline">
              Trang chủ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
