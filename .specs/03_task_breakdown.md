# DANH MỤC TÁC VỤ PHÂN RÃ (TASK BREAKDOWN)
## Dự án: VN2000-PRO Rebuilding & Deep Refactoring
### Chuẩn: Spec-Driven Development (Bộ Nhớ Spec-Kit)

---

## 📋 GIAI ĐOẠN 1: BẢO VỆ HIỆN TRẠNG & HỒ SƠ ĐẶC TẢ (SPECIFICATION PHASE)
- [x] **T01 — Khởi tạo Hiến pháp Dự án:** Tạo `.specs/00_constitution.md` quy định các nguyên tắc bất biến về trắc địa, offline-first và kiểm thử.
- [x] **T02 — Lập Đặc tả Nghiệp vụ Toàn Diện:** Tạo `.specs/01_specification.md` chi tiết 8 phân hệ cốt lõi.
- [x] **T03 — Thiết kế Kế hoạch Kiến trúc Mô-đun:** Tạo `.specs/02_architectural_plan.md` quy hoạch mô hình Clean 3-Tier và ranh giới an toàn.
- [x] **T04 — Lập Danh mục Tác vụ & Ma trận Nghiệm thu:** Tạo `.specs/03_task_breakdown.md`.

---

## 🛠️ GIAI ĐOẠN 2: TÁI CẤU TRÚC MÔ-ĐUN HÓA CORE DOMAIN ENGINES (MODULARIZATION)
- [x] **T05 — Tách Domain Engine Thuật toán Trắc địa (`src/core/geodesy_engine.js`):**
  - Đóng gói logic chuyển đổi tọa độ VN2000 $\longleftrightarrow$ WGS84, 7 tham số, kinh tuyến trục 63 tỉnh thành thành module tính toán thuần túy (không dính DOM).
- [x] **T06 — Tách Domain Engine Hình học MiniCAD (`src/core/cad_geometry.js`):**
  - Đóng gói tính toán diện tích Shoelace, chu vi, điểm trọng tâm (centroid), snap điểm và xuất chuỗi AutoCAD DXF.
- [x] **T07 — Tách Domain Engine Trắc dọc & Đào đắp (`src/core/volume_calc.js`):**
  - Đóng gói thuật toán tính toán chênh cao, khối lượng Đào / Đắp theo phương pháp diện tích trung bình mặt cắt và công thức TCVN 4447:2012.
- [x] **T08 — Tách Domain Engine Lưu trữ Dữ liệu (`src/core/data_store.js`):**
  - Đóng gói quản lý LocalStorage/IndexedDB, Thùng rác 30 ngày tự dọn dẹp, và hàng đợi offline queue.

---

## 🎨 GIAI ĐOẠN 3: HOÀN THIỆN GIAO DIỆN LOVABLE & ĐA CHỦ ĐỀ (LOVABLE POLISH)
- [x] **T09 — Kiểm định Giao diện Đa Chủ đề:** Kiểm tra hoạt động của nút `#btnHeaderThemeToggle` trên Header giữa Engineering Dark Pro và Clean Light Minimalist.
- [x] **T10 — Tinh chỉnh Responsive Floating Island Bottom Nav:** Kiểm tra hiển thị thanh điều hướng nổi trên mobile và desktop.
- [x] **T11 — Tinh chỉnh Bento Grid Dashboard:** Kiểm tra phản hồi 3D nhấc thẻ của 4 thẻ tác vụ lớn và thẻ tóm tắt dự án.

---

## 🧪 GIAI ĐOẠN 4: KHÓA KIỂM ĐỊNH HỒI QUY TOÀN TRÌNH (VERIFICATION GATE)
- [x] **T12 — Chạy toàn bộ 13 bộ kiểm thử tự động:**
  - `node --test tests/*.test.js` đạt tỷ lệ 100% Pass (toàn bộ 22 nhóm test).
- [x] **T13 — Kiểm thử tương thích ngược:** Đảm bảo `app.js` và `index.html` tải mượt mà không có bất kỳ lỗi JavaScript Console hay tham chiếu undefined nào.
