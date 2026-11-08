# Hướng dẫn bật Đăng nhập Google & Trang quản trị (dành cho chủ ứng dụng)

Làm **một lần**. Người dùng sau đó chỉ cần bấm "Đăng nhập Google" trong ứng dụng.
Chưa làm các bước này thì ứng dụng vẫn chạy bình thường, chỉ hiện thông báo "Đăng nhập chưa được bật".

## Cách hoạt động

- Ứng dụng dùng **Google Identity Services** (nút "Đăng nhập bằng Google"). Google trả về một mã đăng nhập (ID token).
- Máy chủ tài khoản là **Google Apps Script** (`backend/TaiKhoan.gs`), chạy trên tài khoản Google của chủ ứng dụng:
  - kiểm tra mã đăng nhập đúng ứng dụng, email đã xác minh, còn hạn;
  - lưu danh sách tài khoản và lượt truy cập vào một Google Sheet;
  - lưu dự án của từng người vào thư mục Drive `VN2000 PRO - Du lieu tai khoan/<email>/`.
- **Không ghi thao tác của người dùng.** Chỉ ghi: email, tên, thời điểm đăng nhập / mở ứng dụng. Người chưa đăng nhập chỉ được đếm số lượt theo ngày, không định danh.

## Bước 1 — Tạo OAuth Client ID

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo dự án mới (vd. `VN2000 PRO`).
2. **APIs & Services → OAuth consent screen**: chọn *External*, điền tên ứng dụng, email hỗ trợ. Phạm vi (scopes): chỉ cần `openid`, `email`, `profile` (mặc định). Bấm *Publish app* để mọi người đăng nhập được.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → loại **Web application**.
4. Ở **Authorized JavaScript origins** thêm địa chỉ ứng dụng, ví dụ:
   - `https://ten-du-an.vercel.app`
   - `http://localhost:8080` (để thử trên máy)
5. Lưu lại **Client ID** dạng `1234567890-abc.apps.googleusercontent.com`.

## Bước 2 — Triển khai máy chủ tài khoản

1. Tạo một Google Sheet mới (vd. `VN2000 PRO - Tai khoan`). Sheet này chỉ chủ ứng dụng xem được.
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**. Xóa mã mẫu, dán toàn bộ nội dung `backend/TaiKhoan.gs`.
3. Trong hàm `caiDatLanDau()` thay `DAN_CLIENT_ID_VAO_DAY.apps.googleusercontent.com` bằng Client ID ở Bước 1, rồi chọn hàm `caiDatLanDau` → **Chạy** → cấp quyền khi Google hỏi.
   - Hàm này ghi `GOOGLE_CLIENT_ID` và `ADMIN_EMAILS` (email của bạn) vào *Thuộc tính tập lệnh* và tạo 4 tab: `Tài khoản`, `Lượt truy cập`, `Khách`, `Phiên`.
   - Muốn thêm quản trị viên cố định: *Cài đặt dự án → Thuộc tính tập lệnh → ADMIN_EMAILS*, các email cách nhau bằng dấu phẩy. (Hoặc cấp quyền ngay trong Trang quản trị.)
4. **Triển khai → Tùy chọn triển khai mới → Ứng dụng web**:
   - *Thực thi dưới dạng*: **Tôi** (chủ ứng dụng)
   - *Người có quyền truy cập*: **Bất kỳ ai**
5. Sao chép **URL ứng dụng web** dạng `https://script.google.com/macros/s/.../exec`.

> Mỗi lần sửa `TaiKhoan.gs`, chọn *Quản lý bản triển khai → Chỉnh sửa → Phiên bản mới* để URL giữ nguyên.

## Bước 3 — Điền cấu hình vào ứng dụng

Sửa tệp `account-config.js`:

```js
window.VN2K_ACCOUNT_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/XXXX/exec',
  clientId: '1234567890-abc.apps.googleusercontent.com'
};
```

Triển khai lại ứng dụng (Vercel). Tăng `CACHE_NAME` trong `sw.js` nếu muốn điện thoại nạp ngay bản mới.

## Sử dụng

- **Người dùng**: Menu ☰ → *Đăng nhập Google* (hoặc nút trên Trang chủ) → đăng nhập → *Lưu tất cả dự án lên tài khoản*. Trên máy khác đăng nhập cùng tài khoản → *Tải về*. Có thể bật *Tự động lưu dự án khi có thay đổi* (mặc định tắt).
- **Quản trị viên**: sau khi đăng nhập, Menu ☰ có thêm *Quản trị tài khoản*:
  - số tài khoản, lượt truy cập hôm nay / 7 ngày / khách, biểu đồ 30 ngày;
  - danh sách tài khoản: lần cuối truy cập, số lượt; **Khóa / Mở khóa**, **Cấp / Bỏ quản trị**, **Xóa** (xóa luôn lượt truy cập; dự án vào thùng rác Drive 30 ngày);
  - *Ai đã truy cập*: thời điểm, người dùng, loại (Đăng nhập / Mở ứng dụng); lọc theo từng người.
- Khóa tài khoản: người đó bị đăng xuất trên mọi máy và không đăng nhập lại được cho tới khi mở khóa. Dự án trên máy của họ không bị xóa.
- Không thể khóa / xóa / bỏ quyền chính mình hoặc quản trị viên cấu hình sẵn (chủ script, `ADMIN_EMAILS`).

## Giới hạn

- Mỗi dự án tối đa 5 MB khi lưu lên tài khoản.
- Apps Script có hạn mức theo ngày của tài khoản Google (đủ cho vài trăm người dùng / ngày). Nếu đông hơn, cân nhắc chuyển máy chủ sang Firebase / Cloud Run — giao thức JSON giữ nguyên.
- Phiên đăng nhập có hạn 30 ngày; hết hạn thì đăng nhập lại.

## Kiểm thử

`npm test` chạy `tests/account_backend.test.js` — chạy chính `backend/TaiKhoan.gs` với dịch vụ Apps Script giả lập (`tests/helpers/gas_mock.js`): xác minh mã đăng nhập, phiên, lượt truy cập, dự án theo tài khoản, quyền quản trị, khóa / xóa tài khoản.
