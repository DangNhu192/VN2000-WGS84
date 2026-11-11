# Tổng hợp chức năng & cấu trúc giao diện — VN2000 PRO

Cập nhật 2026-11-11. Tài liệu này là "bản đồ" của ứng dụng: có những chức năng gì, nằm ở đâu, và các quy tắc giao diện dùng chung. Không chức năng nào bị bỏ khi tái cấu trúc.

## 1. Cấu trúc điều hướng (giống nhau ở mọi màn hình)

| Thành phần | Vị trí | Nội dung |
|---|---|---|
| Thanh tiêu đề | Trên cùng | ☰ Menu · ◀ Quay lại · 📍 KTT/múi đang dùng (chạm để đổi) · Sáng/Tối · GPS · ⚙ Cài đặt · ? Hướng dẫn màn hình hiện tại |
| Thanh ngữ cảnh | Ngay dưới tiêu đề (điện thoại) | **Tên màn hình đang mở** · 📁 dự án hiện hành (chạm để mở Sổ đo) |
| Nội dung | Giữa | Thẻ → tab (nếu có) → ô nhập → nút hành động chính |
| Thanh dưới | Dưới cùng | Trang chủ + 3 chức năng tự chọn + Sổ đo |

Mọi chức năng đều mở được bằng **3 đường**: bảng "Tất cả chức năng" ở Trang chủ, menu ☰, và (với chức năng đã ghim) thanh dưới / ô "Truy cập nhanh". Bảng ở Trang chủ được dựng trực tiếp từ menu ☰ (`app-shell.js`) nên hai nơi không bao giờ lệch nhau.

## 2. Danh mục chức năng (5 nhóm theo trình tự công việc)

### Nhóm 1 — Chuyển đổi tọa độ
| Chức năng | Làm gì |
|---|---|
| Chuyển đổi 2 chiều đơn điểm | WGS-84 ⇄ VN-2000 (7 tham số), DD/DMS/DMM, lưu vào sổ đo, xem trên bản đồ |
| Chuyển đổi hàng loạt & Nhập file | Dán bảng, nhập CSV/Excel, quét ảnh OCR, chấm trên bản đồ; xuất kết quả |
| Đổi KTT / Múi chiếu VN-2000 | VN-2000 ⇄ VN-2000 giữa các KTT, múi 3°/6° (34 tỉnh mới, 63 tỉnh cũ) |
| Bản đồ chuyển đổi & Chấm điểm | Chấm lấy tọa độ, xem vị trí điểm đã chuyển |
| Chuyển đổi nhanh (Trang chủ) | Một điểm, hai ô nhập, kết quả tức thì |

### Nhóm 2 — Bản đồ & Thực địa
| Chức năng | Làm gì |
|---|---|
| Bản đồ dự án & Mốc | Nền vệ tinh/đường, mốc dự án, ranh 34 tỉnh, đo cự ly/góc, bản đồ ngoại tuyến |
| Cắm mốc thực địa | La bàn 360°, radar dẫn hướng, cự ly/góc lệch, bíp đích |
| Camera đóng dấu | Ảnh/video có dấu VN-2000, WGS-84, sai số GPS, hướng, thời gian, **địa chỉ sau sáp nhập**; thư viện, chia sẻ |
| GPS | Bật/tắt, sai số ±m, tọa độ VN-2000 tại chỗ |
| RTK ngoài | Rover GNSS qua Web Bluetooth (NMEA) |
| Lộ trình & Chỉ đường | Tối ưu thứ tự điểm (xe máy / ô tô / 16 chỗ), chỉ dẫn giọng nói, mở Google Maps |

### Nhóm 3 — Sổ đo & Dữ liệu dự án
| Chức năng | Làm gì |
|---|---|
| Sổ đo & Quản lý dự án | Bảng mốc, sửa/xóa, chọn nhiều, thùng rác 30 ngày, đổi tên/tạo dự án |
| Nhập dữ liệu | CSV/TXT/Excel có **xem trước & chọn cột, KTT của file**; GeoJSON/KML/GPX/WKT; dán tay |
| Xuất dữ liệu | CSV, Excel, TXT máy đo, DXF/DWG, KML, GeoJSON, GPX, WKT, SVG, PDF, PNG; chia sẻ |
| Google Sheets | Đồng bộ tự động/thủ công |

### Nhóm 4 — Tính toán & Đồ họa kỹ thuật
| Chức năng | Làm gì |
|---|---|
| Bài toán trắc địa | Cự ly & phương vị, diện tích & chu vi đa giác |
| Giao hội | Bù tọa độ trạm đo từ 2 mốc khi mất GPS |
| Trắc dọc & Đào đắp | Mặt cắt tự nhiên/thiết kế, khối lượng m³, hố đào móng TCVN 4447 |
| MiniCAD | Đa giác, tuyến, điểm, khối nhà, bán kính; snap/ortho/dóng góc; tách/hợp/xén/kéo dài/offset; lớp; nhãn, mũi tên, tem; bảng kê; xuất DXF/PDF/SVG/Excel |
| Cao độ Geoid | Quy đổi H = h − ζ (trong Cài đặt) |

### Nhóm 5 — Hệ thống & Trợ giúp
| Chức năng | Làm gì |
|---|---|
| KTT & Múi chiếu | Chọn tỉnh (34 mới / 63 cũ), nhập tay, **chọn theo vị trí GPS** |
| Cài đặt chung | Ngôn ngữ Việt/Anh, Sáng/Tối, chế độ Thực địa (tương phản cao), định dạng số, rung |
| Ngày giờ | Tự động / chỉnh tay |
| Cẩm nang & Hướng dẫn | Sổ tay đầy đủ; nút ? theo từng màn hình; thẻ "Bắt đầu trong 3 bước" |
| Thông tin, Ủng hộ tác giả | Phiên bản, cơ sở pháp lý, cài PWA |

## 3. Quy tắc giao diện dùng chung (`ui-unified.css`, nạp sau cùng)

| Thành phần | Quy tắc |
|---|---|
| Tên màn hình | Chữ thường có dấu, không đánh số, không biểu tượng; luôn ở thanh ngữ cảnh |
| Thẻ | Nền bề mặt, viền mảnh, bo 14px, không đổ bóng/chuyển màu |
| Tiêu đề thẻ | 15px đậm, màu chữ chính, không in hoa |
| Nút thường (`.btn-sm`) | Bo 10px, 13px; **4 vai trò màu**: chính (xanh dương), thành công (xanh lục), nguy hiểm (đỏ nhạt viền đỏ), trung tính |
| Nút hành động chính (`.btn-convert`) | Cao 48px, bo 12px, một màu phẳng |
| Tab | Một kiểu "segmented control" cuộn ngang: Chuyển đổi, Camera, Trắc dọc, Thông tin |
| Ô nhập / ô chọn | Cao 44px, bo 10px, viền nét khi focus |
| Ô chức năng (Trang chủ) | Biểu tượng 36px + tên + một dòng mô tả; ô ghim "Truy cập nhanh" cùng hình thức |

Chế độ **Thực địa** giữ bộ quy tắc tương phản cao riêng (nền đen, chữ vàng/trắng, vùng chạm 48px) và không bị lớp thống nhất ghi đè.
