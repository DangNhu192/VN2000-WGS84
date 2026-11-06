# Đề xuất chỉnh trang giao diện, phân nhóm chức năng và bố cục — VN2000 PRO

Cập nhật: 2026-11-06. Các mục **✅ Đã làm** nằm trong nhánh `claude/optimize-ui-user-experience-3bwdmr`; mục **⏳ Đề xuất** cần chủ dự án quyết định trước khi làm.

## 1. Phân nhóm chức năng (menu ☰)

| Nhóm | Chức năng | Trạng thái |
|---|---|---|
| 1. Chuyển đổi tọa độ | 1.1 Đơn điểm · 1.2 Hàng loạt & nhập file · **1.3 Đổi KTT / Múi chiếu (mới)** · 1.4 Bản đồ chấm điểm | ✅ |
| 2. Bản đồ & Thực địa | 2.1 Bản đồ dự án & mốc · 2.2 Cắm mốc · 2.3 Camera đóng dấu · 2.4 GPS · 2.5 RTK ngoài | ✅ (Camera, GPS, RTK chuyển về đây) |
| 3. Sổ đo & Dữ liệu dự án | 3.1 Sổ đo & quản lý dự án · 3.2 Google Sheets | ✅ |
| 4. Tính toán & Đồ họa kỹ thuật | 4.1 Bài toán trắc địa · 4.2 Giao hội · 4.3 Trắc dọc & đào đắp · 4.4 MiniCAD | ✅ (Giao hội chuyển từ "Hệ thống") |
| 5. Hệ thống & Trợ giúp | 5.1 KTT · 5.2 Ngày giờ · 5.3 Cẩm nang · 5.4 Thông tin · 5.5 Ủng hộ tác giả | ✅ |

Nguyên tắc: nhóm theo **việc người dùng đang làm** (đổi số liệu → ra hiện trường → quản lý số liệu → tính toán/vẽ → cài đặt), không theo "cơ bản/nâng cao".

## 2. Trang chủ

- ✅ Thẻ "Bắt đầu trong 3 bước" cho người mới, dòng giải thích Đơn giản/Nâng cao, nút ? mở hướng dẫn Trang chủ.
- ⏳ **Bỏ công tắc Đơn giản/Nâng cao**: một trang chủ duy nhất = khung chuyển đổi nhanh ở trên, 4 ô chức năng ở giữa, "Công cụ khác" ở dưới. Hai chế độ hiện làm người dùng không biết các chức năng khác tồn tại.
- ⏳ Khối GPS lớn chỉ hiện khi GPS đang bật; khi tắt thay bằng một nút "Bật GPS".
- ⏳ Thống nhất một tên cho một màn hình: hiện "Bản đồ trắc địa", "Bản đồ dự án & Mốc", "Bản đồ khảo sát & vệ tinh" cùng chỉ một màn.

## 3. Thanh tiêu đề & điều hướng

- ✅ Chừa vùng tai thỏ / Dynamic Island; nút Quay lại chỉ còn ◀ trên máy hẹp; ẩn ở Trang chủ.
- ⏳ Đưa Tỉnh/KTT thành chip luôn hiện ngay dưới tiêu đề ở **mọi** màn hình (KTT sai là lỗi số liệu nghiêm trọng nhất).
- ⏳ Nút GPS trên tiêu đề cần nhãn ("GPS" / "Tắt") thay vì chỉ một chấm xám.

## 4. MiniCAD

- ✅ Đỉnh giữ nguyên X/Y khi lưu khối (trước đây trôi tới ~5 mm).
- ✅ Màn ngang: đầu thanh công cụ một hàng chỉ biểu tượng, thanh lệnh mở ở dạng thu gọn → không còn đè nhau.
- ⏳ Gộp hai nơi bấm lệnh (thanh tab trên + lưới lệnh trong CLI) thành **một** bảng lệnh theo nhóm Vẽ / Sửa / Nhãn / Trợ vẽ / Dữ liệu; CLI chỉ còn ô gõ lệnh cho người dùng quen AutoCAD.
- ⏳ Trên điện thoại dọc: thanh công cụ dạng "bottom sheet" kéo lên/xuống thay vì khung nổi cố định ở trên, để bản vẽ chiếm phần lớn màn hình.

## 5. Nhập / xuất dữ liệu

- ✅ Một bộ chuẩn hóa chung cho mọi định dạng xuất (CSV, Excel, KML, GeoJSON, GPX, WKT, DXF, TXT).
- ✅ Đọc lại được chính file ứng dụng xuất (CSV/TXT/Excel có tiêu đề); nhận mọi kiểu xuống dòng.
- ⏳ Màn "Nhập dữ liệu" thống nhất: chọn file → **xem trước 5 dòng + chọn cột X/Y/Tên/KTT** → nạp. Hiện mỗi phân hệ có nút nhập riêng với cách đoán cột khác nhau.
- ⏳ Cho chọn KTT/múi nguồn ngay khi nhập file (file của tỉnh khác) — dùng lại engine "Đổi KTT / Múi".

## 6. Cần xác minh số liệu

- ⚠️ **KTT tỉnh Bình Thuận** trong bảng 63 tỉnh là 107°45'. Cần đối chiếu với Phụ lục Thông tư 973/2001/TT-TCĐC (nhiều tài liệu ghi 108°30'). Chưa sửa vì không truy cập được văn bản gốc.
- ⏳ Bổ sung bảng KTT cho **34 tỉnh sau sáp nhập 2025** (dữ liệu ranh giới đã có trong `vietnam_34_tinh.js`), kèm gợi ý dùng "Đổi KTT / Múi" khi chuyển số liệu tỉnh cũ sang tỉnh mới.
