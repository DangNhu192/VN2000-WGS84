# HIẾN PHÁP DỰ ÁN VN2000-PRO (CONSTITUTION)
## Phiên bản: 2.0.0 — Ban hành: 2026-10-09
### Chuẩn: Spec-Driven Development (Bộ Nhớ Spec-Kit)

---

## 🏛️ ĐIỀU 1: NGUYÊN TẮC BẢO TOÀN SỐ HỌC TRẮC ĐỊA (GEODETIC ACCURACY)
1. **Sai số quy chuẩn:** Sai số chuyển đổi tọa độ giữa WGS-84 và VN-2000 phải đạt chuẩn dưới 0.001m (1 milimet) trên toàn bộ 63 tỉnh thành Việt Nam.
2. **Không tự ý làm tròn:** Mọi phép toán trung gian trong thuật toán Gauss-Kruger, 7 tham số Helmert/Bursa-Wolf và chuyển đổi Ellipsoid WGS-84/Krasovsky/WGS84-VN2000 phải giữ độ chính xác float 64-bit (`double precision`), chỉ định dạng hiển thị ở bước cuối cùng (3 chữ số thập phân cho tọa độ mét, 6-8 chữ số thập phân cho độ vĩ/kinh).
3. **Phòng chống đảo trục toạ độ:** Hệ thống bắt buộc có cơ chế tự động nhận diện và đảo trục Y-X thành X-Y đối với dữ liệu trắc địa Việt Nam (X > 1.000.000m, Y > 500.000m) để chống lệch vị trí hàng trăm kilomet.

---

## ⚡ ĐIỀU 2: NGUYÊN TẮC HOẠT ĐỘNG NGOẠI TUYẾN 100% (OFFLINE-FIRST)
1. **Không phụ thuộc Internet:** Mọi tính năng cốt lõi (Chuyển đổi, Bản đồ ranh giới tỉnh/xã offline, Vẽ MiniCAD, Cắm mốc Stakeout, Trắc dọc đào đắp) phải hoạt động trơn tru 100% ngoài thực địa không có sóng di động.
2. **Lưu trữ bền vững:** Dữ liệu dự án, danh sách mốc và cài đặt phải được lưu cục bộ an toàn trên thiết bị (LocalStorage / IndexedDB). Hàng đợi đồng bộ Google Sheets/Drive chỉ gửi khi thiết bị trực tuyến trở lại (`online event`).
3. **An toàn dữ liệu & Thùng rác:** Xóa dự án bắt buộc chuyển vào Thùng rác lưu trữ 30 ngày. RAM làm việc phải được cách ly tuyệt đối, không để mốc của dự án cũ tự động tràn sang dự án mới.

---

## 🎨 ĐIỀU 3: NGUYÊN TẮC THẨM MỸ LOVABLE & ĐA CHỦ ĐỀ (LOVABLE UX STANDARDS)
1. **Tiêu chuẩn thị giác cao cấp:** Giao diện phải tuân thủ chuẩn Lovable (Floating Glass Header, Island Bottom Navigation, Bento Grid Dashboard).
2. **Hỗ trợ tối ưu hai môi trường:**
   - **Engineering Dark Pro:** Bảng màu tối sâu (Slate-950/Zinc), viền kính mỏng bán trong suốt, tương phản kỹ thuật cao.
   - **Clean Light Minimalist:** Bảng màu sáng sạch sẽ, chống chói lóa mắt dưới ánh nắng mặt trời gắt ngoài công trường.
   - Nút chuyển đổi Theme tức thì trên Header, đồng bộ tức thì không giật lag.

---

## 🧪 ĐIỀU 4: KHÓA LIÊM CHÍNH KIỂM THỬ (REGRESSION INTEGRITY GATE)
1. **100% Test Pass:** Mọi thay đổi mã nguồn, tái cấu trúc hoặc thêm tính năng mới bắt buộc phải chạy qua bộ kiểm thử tự động và đạt tỷ lệ vượt qua 100%.
2. **Kiểm thử đa tầng:** Bộ kiểm thử phải bao quát: Thuật toán trắc địa, Chống lệch tọa độ, Thùng rác 30 ngày, Phân quyền Read-only bản đồ mốc, Vẽ MiniCAD, Trắc dọc TCVN 4447 và Theme Controller.
