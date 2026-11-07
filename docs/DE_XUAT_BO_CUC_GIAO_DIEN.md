# Đề xuất chỉnh trang giao diện, phân nhóm chức năng và bố cục — VN2000 PRO

Cập nhật: 2026-11-07 (WP-L: đã làm toàn bộ mục ⏳ của bản 06/11). Các mục **✅ Đã làm** nằm trong nhánh `claude/optimize-ui-user-experience-3bwdmr`; mục **⏳ Đề xuất** cần chủ dự án quyết định trước khi làm.

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
- ✅ **Bỏ công tắc Đơn giản/Nâng cao**: một trang chủ duy nhất = khung chuyển đổi nhanh ở trên, 4 ô chức năng ở giữa, "Công cụ khác" ở dưới.
- ✅ Khối GPS lớn chỉ hiện khi GPS đang bật; khi tắt thay bằng một nút "Bật GPS".
- ✅ Một tên cho một màn hình: "Bản đồ dự án & Mốc".

## 3. Thanh tiêu đề & điều hướng

- ✅ Chừa vùng tai thỏ / Dynamic Island; nút Quay lại chỉ còn ◀ trên máy hẹp; ẩn ở Trang chủ.
- ✅ Chip KTT/múi trên thanh tiêu đề ở **mọi** màn hình điện thoại (chạm để đổi).
- ✅ Nút GPS có nhãn "GPS" đổi màu theo trạng thái.

## 4. MiniCAD

- ✅ Đỉnh giữ nguyên X/Y khi lưu khối (trước đây trôi tới ~5 mm).
- ✅ Màn ngang: đầu thanh công cụ một hàng chỉ biểu tượng, thanh lệnh mở ở dạng thu gọn → không còn đè nhau.
- ✅ Một nơi bấm lệnh (thanh công cụ); thanh lệnh CLI chỉ còn ô gõ lệnh + 5 nút trợ vẽ.
- ✅ Điện thoại dọc: thanh công cụ là bottom sheet ở đáy, thanh lệnh thu gọn ở trên; vùng vẽ ~250 → ~370 px.

## 5. Nhập / xuất dữ liệu

- ✅ Một bộ chuẩn hóa chung cho mọi định dạng xuất (CSV, Excel, KML, GeoJSON, GPX, WKT, DXF, TXT).
- ✅ Đọc lại được chính file ứng dụng xuất (CSV/TXT/Excel có tiêu đề); nhận mọi kiểu xuống dòng.
- ✅ Nhập file có xem trước: chọn file → xem vài dòng đầu → chọn cột → chọn KTT/múi của file → nạp.
- ✅ Chọn KTT/múi của file khi nhập và đổi sang KTT hiện hành (engine "Đổi KTT / Múi").

## 6. Cần xác minh số liệu

- ⚠️ **KTT tỉnh Bình Thuận (cũ)** trong bảng 63 tỉnh vẫn là 107°45' — chưa đối chiếu được Thông tư 973/2001. Từ 01/07/2025 Bình Thuận thuộc Lâm Đồng (107°45').
- ✅ Bảng KTT **34 tỉnh từ 01/07/2025** (Thông tư 24/2025/TT-BNNMT) + nút chọn KTT theo vị trí GPS. ⚠️ Lai Châu, Phú Thọ, Ninh Bình: các bảng công bố chưa thống nhất — cần đối chiếu văn bản gốc.
- ✅ Dấu ảnh/video camera ghi **địa chỉ xã/phường, tỉnh sau sáp nhập** (tra ngoại tuyến 3.321 xã/phường).
