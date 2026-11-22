# SpeakMate AI — Ứng dụng Luyện Giao Tiếp Tiếng Anh Như Người Bản Xứ

Ứng dụng Web đa người dùng giúp người Việt (đặc biệt từ mất gốc **A0–A1** đến **B2+**) luyện phản xạ nghe – nói tiếng Anh tự nhiên như đang gọi điện cho người nước ngoài, hỗ trợ đồng bộ trên cả máy tính và điện thoại.

## Tính năng chính

- **Đăng nhập / Đăng ký đa phương thức (Supabase Auth):**
  - Email + Mật khẩu (nhập tên bạn muốn AI gọi ngay khi đăng ký)
  - Đăng nhập nhanh bằng **Google**
  - Đăng nhập qua **Magic Link Email** không cần mật khẩu
- **Hồ sơ cá nhân hóa (Onboarding) & Đồng bộ đa thiết bị:**
  - Lưu tên gọi, trình độ (`A0–A1`, `A2–B1`, `B2+`), công việc/lĩnh vực, sở thích, accent ưu tiên và mục tiêu phút/ngày lên **Supabase PostgreSQL** (Row Level Security theo từng người dùng).
- **Cuộc gọi thoại AI thời gian thực (Gemini Audio + Edge Neural TTS):**
  - Gửi trực tiếp âm thanh micro (nén 32kbps tối ưu tốc độ) lên **Google Gemini (`gemini-3.5-flash-lite` với `thinkingConfig` độ trễ thấp + sticky model fallback)** — hiểu tốt cả giọng người Việt mới học hoặc lúc chêm tiếng Việt khi bí từ.
  - Hỗ trợ **2 chế độ Micro**: *Chạm để nói* (hoặc nhấn `Space`, phù hợp người mới A0–A1) và *Tự động rảnh tay (Hands-free)* tự ngắt khi ngừng nói.
  - Đọc phản hồi bằng giọng bản xứ **Mỹ (US), Anh (UK), Úc (AU), Canada (CA)** qua Microsoft Edge Neural TTS, tùy chỉnh tốc độ **0.75x – 1.1x** (tự động dự phòng bằng giọng trình duyệt nếu mất kết nối TTS).
  - **Phụ đề song ngữ Anh–Việt**, thẻ **"✨ Cách người bản xứ nói tự nhiên hơn"**, mẹo phát âm/ngữ pháp tiếng Việt và **3 gợi ý câu trả lời** kèm phiên âm dễ đọc.
- **Chấm điểm phát âm từng câu & Chế độ luyện đọc nhại lại (Shadowing):**
  - Tự động chấm điểm phát âm (`0–100`: Độ rõ âm, Trôi chảy, Ngữ điệu + phân tích từng từ kèm IPA & mẹo tiếng Việt) ngay sau mỗi lượt nói bằng micro.
  - Tích hợp nút **"Đọc thử & Chấm điểm"** trên câu AI nói, câu sửa bản xứ, gợi ý trả lời và toàn bộ Sổ tay/Flashcard (kèm nút nghe lại chính giọng mình để so sánh).
- **Báo cáo đánh giá sau cuộc gọi:**
  - Tự động chấm 4 kỹ năng (*Phát âm, Trôi chảy, Ngữ pháp, Từ vựng*), ước lượng CEFR, tóm tắt điểm mạnh/điểm cần cải thiện, 3 câu sửa tiêu biểu và cụm từ nên lưu 1 chạm; lưu đồng bộ vào Lịch sử cuộc gọi.
- **Linh hoạt API Key (Pool dùng chung + Key cá nhân theo từng tài khoản):**
  - Server hỗ trợ nhập **1 hoặc nhiều Gemini API Key** (`GEMINI_API_KEYS=key1,key2,...`) tự động xoay vòng & dự phòng khi chạm giới hạn lượt gọi miễn phí.
  - Mỗi người dùng có thể tự nhập **Gemini API Key cá nhân** trong mục **Cài đặt** (được mã hóa **AES-256-GCM** trước khi lưu vào Supabase).
- **Sổ tay cụm từ, Flashcard & Lịch sử 7 ngày:**
  - Lưu câu hay ngay trong cuộc gọi, ôn tập bằng Flashcard kèm giọng đọc bản xứ và kho 15+ câu cửa miệng thông dụng cho người mới.

---

## Hướng dẫn cài đặt (Chạy Local & Deploy miễn phí lên Vercel / Render)

### Bước 1: Tạo Database & Đăng nhập miễn phí trên Supabase
1. Truy cập [supabase.com](https://supabase.com) và tạo một Project mới (gói Free).
2. Vào **SQL Editor** → **New query**, dán toàn bộ nội dung file [`supabase/schema.sql`](./supabase/schema.sql) và bấm **Run**.
3. Vào **Project Settings → API**, lấy 2 giá trị:
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public key` (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. *(Tùy chọn bật đăng nhập Google)*: Vào **Authentication → Providers → Google**, bật lên và cấu hình Client ID / Secret từ Google Cloud Console; đồng thời thêm Redirect URL:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://<ten-mien-cua-ban>.vercel.app/auth/callback`
5. *(Tùy chọn đăng ký không cần chờ xác nhận email khi test)*: Trong **Authentication → Providers → Email**, có thể tắt tạm **Confirm email** nếu muốn tài khoản mới vào thẳng app ngay sau khi đăng ký.

### Bước 2: Lấy Google Gemini API Key miễn phí
1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey) để tạo 1 hoặc nhiều API Key miễn phí.

### Bước 3: Cấu hình biến môi trường
Sao chép `.env.example` thành `.env.local`:

```bash
cp .env.example .env.local
```

Điền thông tin vào `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEYS=AIzaKey1,AIzaKey2
APP_ENCRYPTION_SECRET=mot-chuoi-bi-mat-bat-ky-dai-it-nhat-32-ky-tu
```

*(Có thể tạo nhanh `APP_ENCRYPTION_SECRET` bằng lệnh: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*.

### Bước 4: Chạy trên máy tính
```bash
npm install
npm run dev
```
Mở trình duyệt tại [http://localhost:3000](http://localhost:3000).
*(Lưu ý: Trên điện thoại, trình duyệt yêu cầu **HTTPS** để cấp quyền Micro khi truy cập qua mạng, trừ `localhost`. Vì vậy để dùng Micro trên điện thoại ổn định nhất, hãy deploy lên Vercel ở Bước 5).*

### Bước 5: Đưa lên mạng miễn phí (Vercel) để dùng trên cả PC & Điện thoại 4G/Wi-Fi
1. Đẩy thư mục dự án `AI Tiếng Anh` lên GitHub.
2. Vào [vercel.com](https://vercel.com) → **Add New Project** → chọn repo GitHub của bạn (giữ **Root Directory** mặc định `./`).
3. Thêm đầy đủ các biến môi trường ở Bước 3 vào phần **Environment Variables** trên Vercel.
4. Bấm **Deploy** — sau ~1 phút bạn sẽ có link `https://...vercel.app` để mở trên cả máy tính lẫn điện thoại mọi lúc mọi nơi!

---

## Kiểm thử (Tests & Build)
```bash
npm test       # Chạy unit tests (Vitest)
npm run lint   # Kiểm tra ESLint
npm run build  # Kiểm tra TypeScript & build production
```
