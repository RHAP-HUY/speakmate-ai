# Ngữ cảnh Dự án SpeakMate AI (`d:\AI Tiếng Anh`)

Tài liệu này giúp AI nắm ngay toàn bộ yêu cầu và kiến trúc khi bạn mở thư mục `d:\AI Tiếng Anh` trong một cuộc trò chuyện mới. Xem bản ghi đầy đủ cuộc trò chuyện khởi tạo tại `CONVERSATION_HISTORY.md`.

## 1. Mục tiêu & Yêu cầu cốt lõi từ người dùng
- **Tên ứng dụng:** SpeakMate AI — Web App học giao tiếp tiếng Anh như người bản xứ, chạy tốt trên cả PC & điện thoại (chuẩn bị sẵn để deploy miễn phí lên Vercel / Render).
- **Đối tượng & Trình độ trọng tâm:** Hỗ trợ nhiều người dùng; tối ưu đặc biệt cho người **mới bắt đầu / mất gốc (A0–A1)** (và nâng được lên A2–B1, B2+): nói chậm rãi (0.75x–1.0x), phụ đề song ngữ Anh–Việt, 3 gợi ý câu trả lời kèm phiên âm dễ đọc, và sửa câu tự nhiên kiểu bản xứ.
- **Chủ đề & Giọng nói:** Giao tiếp đời sống & Small talk, Business English (công việc, họp, phỏng vấn, thuyết trình), Du lịch nước ngoài, Tự do; hỗ trợ nhiều accent (Mỹ US, Anh UK, Úc AU, Canada CA, Mixed).
- **Đăng nhập, Đăng ký & Đồng bộ đa thiết bị (Supabase):**
  - Nhiều phương án đăng nhập: Email + Mật khẩu (có nhập **Tên AI gọi bạn** khi đăng ký), **Google OAuth**, **Magic Link Email**.
  - Sau đăng nhập/đăng ký lần đầu (`/onboarding`): hỏi **Tên AI gọi**, **Trình độ**, **Công việc / Lĩnh vực**, **Sở thích**, **Accent & Mục tiêu phút/ngày**; lưu đồng bộ trên **Supabase PostgreSQL** (`supabase/schema.sql`) với Row Level Security (RLS).
  - Nếu chưa cấu hình biến môi trường Supabase, ứng dụng tự chạy ở chế độ dùng thử cục bộ (`localStorage`) để test UI mà không bị lỗi sập trang.
- **Công nghệ AI & Giọng nói (Chi phí thấp / miễn phí):**
  - Gửi trực tiếp audio micro (tối ưu bitrate 32kbps) lên **Google Gemini (`gemini-3.5-flash-lite` + fallback thông minh có sticky health routing & `thinkingConfig` tối ưu độ trễ)** qua `/api/tutor/turn`, `/api/tutor/pronunciation` và `/api/tutor/summary`.
  - **Chấm điểm phát âm từng câu:** Tự động chấm điểm phát âm (`overallScore`, độ rõ âm, trôi chảy, ngữ điệu, phân tích từng từ + mẹo tiếng Việt) ngay trên từng lượt nói, kèm modal **"Đọc thử & Chấm điểm"** cho câu mẫu AI, câu sửa tự nhiên, gợi ý trả lời và Sổ tay cụm từ.
  - **Báo cáo đánh giá sau cuộc gọi:** Tự động phân tích 4 kỹ năng (Phát âm, Trôi chảy, Ngữ pháp, Từ vựng), ước lượng CEFR, điểm mạnh/cần cải thiện, 3 câu sửa tiêu biểu và cụm từ nên lưu, đồng bộ lưu vào `conversations.summary_vi` và hiển thị lại trong `/history`.
  - Quản lý API Key linh hoạt: Hỗ trợ **Shared Key Pool** xoay vòng & dự phòng nhiều key trên server (`GEMINI_API_KEYS`) **kèm tùy chọn BYOK** cho phép từng tài khoản nhập Gemini API Key cá nhân trong `/settings` (mã hóa AES-256-GCM khi có `APP_ENCRYPTION_SECRET`).
  - Đọc phản hồi bằng giọng Neural bản xứ qua **Microsoft Edge TTS (`msedge-tts`)** tại `/api/tts` (có cache client & tự động fallback sang `window.speechSynthesis` nếu cần).

## 2. Cấu trúc chính
- `supabase/schema.sql` — Schema Postgres + RLS + Trigger `handle_new_user` (đã thêm cột `messages.pronunciation jsonb`).
- `src/proxy.ts` — Next.js 16 Proxy làm mới session Supabase & bảo vệ route.
- `src/lib/gemini-models.ts`, `src/lib/gemini-client.ts`, `src/lib/gemini-keys.ts`, `src/lib/crypto.ts`, `src/lib/tutor-prompt.ts`, `src/lib/tts-utils.ts` — Sticky model routing & `thinkingConfig` độ trễ thấp, shared Gemini client caching/timeout, key pool rotation, AES-256-GCM, prompt hội thoại/phát âm/báo cáo, helper TTS.
- `src/components/` — `AppNav.tsx`, `ProfileForm.tsx`, `PronunciationBadge.tsx`, `PronunciationPracticeModal.tsx`, `CallReportView.tsx`.
- `src/lib/scenarios.ts`, `src/lib/data-store.ts`, `src/lib/audio.ts` — Tình huống, nhân vật AI, 15 câu cửa miệng mẫu, data layer Supabase/localStorage, audio recorder (32kbps) & player.
- `src/app/` — `/`, `/auth`, `/auth/callback`, `/onboarding`, `/call`, `/phrases`, `/history`, `/settings`, `/api/tutor/turn`, `/api/tutor/pronunciation`, `/api/tutor/summary`, `/api/tts`, `/api/user-key`, `/api/health`.
- `src/__tests__/` — Unit tests Vitest (`npm test`).

## 3. Quy ước làm việc (Bắt buộc)
- Trả lời người dùng bằng tiếng Việt tự nhiên, rõ ràng.
- Luôn chạy kiểm thử đầy đủ (`npm test`, `npm run lint`, `npm run build` và kiểm tra trực tiếp bản chạy/link web thực tế) để đảm bảo chạy được 100% trước khi bàn giao cho người dùng.
- Nếu phát sinh lỗi: chủ động sửa lỗi; nếu sau **3 lần sửa không được** thì **tạm dừng ngay** và báo cáo chi tiết cho người dùng.
