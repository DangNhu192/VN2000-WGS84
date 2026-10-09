# ĐẶC TẢ YÊU CẦU KỸ THUẬT & NGHIỆP VỤ (SPECIFICATION)
## Dự án: VN2000-PRO Geodesy & Surveying Suite v2.0
### Chuẩn: Spec-Driven Development (Bộ Nhớ Spec-Kit)

---

## 🎯 1. PHÂN HỆ 1: CHUYỂN ĐỔI TỌA ĐỘ HAI CHIỀU (COORDINATE TRANSFORMATION)
- **Đơn điểm (Single Point):**
  - Nhập WGS-84 (Vĩ độ $\phi$, Kinh độ $\lambda$, Cao độ $h$) $\longleftrightarrow$ VN-2000 (X Bắc, Y Đông, H).
  - Tự động gợi ý Kinh tuyến trục (KTT) và múi chiếu 3°/6° theo tỉnh thành được chọn.
  - Hỗ trợ nhập tọa độ phân cách dấu phẩy, dấu chấm, độ phút giây (DMS).
- **Hàng loạt (Multi-Point Batch Import):**
  - Hỗ trợ dán dữ liệu dạng bảng từ Excel, Google Sheets, CSV, Tab-delimited.
  - Thuật toán thông minh: Nhận diện dòng không có cột tên mốc (tự sinh M1, M2...), tự phát hiện và đảo trục Y-X thành X-Y, xử lý dấu phẩy số học Việt Nam (`1144058,623`).
- **Giao diện Dual-Pane:**
  - Trên màn hình $\ge 1024\text{px}$: Cột trái nhập liệu & danh sách kết quả, cột phải hiển thị Live Map định vị tức thời.

---

## 🗺️ 2. PHÂN HỆ 2 & 3.5: BẢN ĐỒ DỰ ÁN (READ-ONLY) & VẼ MẶT BẰNG MINICAD THỰC ĐỊA
- **Bản đồ Dự án (`screen-gps`):**
  - Chế độ **Read-Only** tuyệt đối: Chỉ hiển thị mốc và các khối ranh đất đã nạp, không chứa công cụ vẽ hoặc sửa để chống thao tác nhầm ngoài thực địa.
  - Bảng kê thông tin khối & mốc (`projectMarksBlocksPanel`): Hiển thị diện tích ($m^2$, ha), chu vi ($m$), tỷ lệ % từng thửa, danh sách tọa độ các đỉnh. Cho phép kéo giãn kích thước (`resize: both`).
- **Vẽ Mặt Bằng MiniCAD Thực Địa (`cad_tool`):**
  - Vẽ đa giác (Polygon), tuyến đo (Polyline), điểm đơn (Point).
  - Bắt điểm tự động (Object Snap: Đỉnh, Trung điểm, Điểm mốc GPS).
  - Quản lý Layer/Khối: Đặt tên thửa/khối, chọn màu sắc, độ dày nét.
  - Xuất dữ liệu: Xuất bản vẽ AutoCAD DXF R12/2000 chuẩn TCVN, xuất ảnh sơ đồ thửa đất PNG kèm khung tên pháp lý và bảng tổng hợp diện tích.

---

## 🎯 3. PHÂN HỆ 3: DẪN ĐƯỜNG CẮM MỐC THỰC ĐỊA (STAKEOUT COCKPIT)
- **La bàn số 360° & Phương vị:** Tính toán góc phương vị từ vị trí thực của kỹ sư tới mốc thiết kế cần cắm.
- **Radar Dẫn đường & Âm thanh:**
  - Chỉ báo cự ly $\Delta d$, độ lệch trái/phải ($\Delta L$), tiến/lùi ($\Delta F$).
  - Âm thanh bíp tần số tăng dần khi tiến gần mốc đích (< 0.1m tiếng bíp liên tục).
- **Lưu nhật ký cắm mốc:** Ghi lại sai số thực tế tại thời điểm cắm mốc.

---

## 📸 4. PHÂN HỆ 4: CAMERA KHẢO SÁT ĐÓNG DẤU THỦY ẤN (SURVEY CAMERA)
- **Kính ngắm Viewfinder:** Reticle 4 góc kỹ thuật sắc nét, hiển thị tâm ảnh.
- **Thủy ấn pháp lý:** Tự động in đè lên ảnh: Tọa độ VN-2000 (X, Y), WGS-84 (Lat, Lng), Cao độ H, Góc la bàn hướng chụp, Tên mốc khảo sát, Dự án, và Ngày giờ hiệu lực (`getAppEffectiveDate()`).

---

## 📁 5. PHÂN HỆ 5: QUẢN LÝ DỰ ÁN & SỔ ĐO (PROJECT & DATA MANAGEMENT)
- **Quản lý danh sách dự án:** Tạo mới, đổi tên, sao chép, xuất toàn bộ.
- **Thùng rác 30 ngày an toàn:** Bảo lưu dự án đã xóa trong 30 ngày, tự động xóa vĩnh viễn khi quá hạn, cho phép khôi phục toàn vẹn 100% mốc và khối CAD.
- **Xuất nhập đa định dạng:** AutoCAD DXF, KML Google Earth, CSV tọa độ, GeoJSON, Excel.
- **Đồng bộ Google Sheets/Drive:** Cấu hình Web App URL, tự động gửi dữ liệu khi có mạng, hàng đợi offline an toàn.

---

## 🛰️ 6. PHÂN HỆ 6 & 7: RTK ROVER BLUETOOTH & TRA CỨU TRẮC ĐỊA 63 TỈNH THÀNH
- **RTK Rover Ngoài:** Kết nối Bluetooth NMEA qua Web Bluetooth API, giải mã bản tin GGA, RMC, hiển thị trạng thái Fix/Float/Single, sai số RMS milimet.
- **Giao hội trắc địa:** Giao hội nghịch từ 2 hoặc 3 mốc chuẩn khi mất tín hiệu GPS (dưới hầm, tán cây rậm).
- **Bản đồ địa hình & Tra cứu:** Bảng tra cứu 63 tỉnh thành, kinh tuyến trục, múi chiếu, tham số 7 tham số từng địa phương.

---

## 📈 7. PHÂN HỆ 8: TRẮC DỌC ĐỊA HÌNH & TÍNH TOÁN ĐÀO ĐẮP (TCVN 4447)
- **Bố cục Dual-Pane:** Cột trái nhập cọc và cao trình thiết kế, cột phải hiển thị trực quan mặt cắt.
- **Đồ họa Trắc dọc Chống Đè Chữ:**
  - Nhận diện khoảng cách cọc hẹp (< 45px) để tự động xoay đứng chữ `-90°`.
  - Phân màu trực quan: Vùng đào tô màu vàng cam nhạt, vùng đắp tô màu xanh ngọc nhạt.
- **Mô hình Hố đào CAD TCVN 4447:**
  - Tự động vẽ mặt cắt trắc ngang hố móng có mái dốc taluy $1:m$ theo đúng tiêu chuẩn thi công đất TCVN 4447:2012.
  - Khung tên bản vẽ độc lập, không đè lên hình vẽ.
  - Nút chuyển nhanh sang MiniCAD (`openCadMap()`) để biên tập chi tiết.
