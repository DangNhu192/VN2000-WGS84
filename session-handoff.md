# Session Handoff — VN2000-PWA

## Phiên hiện tại — 2026-10-21: Chuyển Đổi Banner Treo Góc Trên Màn Hình & Bảo Vệ Cấp Quyền GPS
- **Đã hoàn tất**:
  1. **Chuyển đổi thành Thông Báo Treo Góc Trên Màn Hình & Tối Giản Văn Phong (Tự tin, Sang trọng)**:
     - Gỡ bỏ hoàn toàn backdrop mờ đen che kín toàn màn hình, chuyển thành Floating Toast Card treo góc trên bên phải (`top: 12px; right: 16px`), giao diện ứng dụng bên dưới nhìn thấy rõ ràng 100%.
     - Tối giản văn phong, cực kỳ ít chữ: Tiêu đề `Mời Tác Giả Ly Cà Phê ☕` - Thông điệp duy nhất: *"Ứng dụng phi lợi nhuận. Tùy tâm tiếp sức để cùng phát triển!"*.
     - Giữ nguyên cơ chế đếm ngược 20s (`COUNTDOWN_SECONDS: 20`) mở 1 lần / ngày (`checkDailyTrigger`), mở khóa xanh ngọc khi hết giờ, và mở thủ công tự do từ menu Drawer.
     - Bộ test `tests/donate_modal_30s.test.js` PASS 6/6 test. Toàn bộ dự án 229/229 test PASS.
  2. **Khắc phục lỗi chặn lớp phủ / chú giải (Tapjacking Protection) của Android**:
     - Tích hợp Lazy Permissions Check: chỉ kích hoạt GPS khi đã cấp quyền hoặc khi người dùng chạm ngón tay có chủ đích (`User Gesture`), không tự bung popup đột ngột khi tải trang.
     - Tích hợp Modal `#modalGpsPermissionGuide` giải thích nguyên nhân và hướng dẫn xử lý bong bóng chat Messenger/Zalo hoặc cấp quyền trực tiếp trong Chrome.
     - Cập nhật xử lý lỗi `PERMISSION_DENIED` trên toàn bộ các điểm gọi GPS (`appGps.init`, `appGps.startTracking`, `appTransform.getLiveGps`).
  2. **Hợp nhất 1 nút xuất dữ liệu duy nhất trong Sổ đo (`screen-datamgmt`)**:
     - Thay thế cụm 4 nút cũ bằng 1 nút duy nhất: `#btnOpenExportModal` (`[ 📤 XUẤT DỮ LIỆU SỔ ĐO ]`).
     - Tích hợp Cửa sổ Xuất Dữ Liệu Hợp Nhất `#modalExportData` cho phép lựa chọn linh hoạt 5 định dạng trắc địa: Excel (`.xlsx`), CSV (`.csv`), AutoCAD (`.dwg`), Google Earth (`.kml`), Chia sẻ Zalo/Mail (`share`).
     - Thêm các hàm `openExportModal()`, `closeExportModal()`, `selectExportFormat(format)`, `executeExport()` trong `appData`.
  2. **Nâng cấp Hệ thống Theme Toàn cục 3-in-1 (Dark ➔ Light ➔ Field ➔ Dark)**:
     - Nút Theme Header (`#btnHeaderThemeToggle`) điều khiển chu trình 3 chế độ: `🌙 Tối` ➔ `☀️ Sáng` ➔ `⚡ Thực địa` ➔ `🌙 Tối`.
     - Cho phép kích hoạt Chế độ Thực địa (đen/vàng siêu tương phản) ở bất kỳ màn hình nào trong toàn bộ ứng dụng.
     - Thay icon Mặt trời (`☼`) trên nút `#fwField` bằng icon Tia sét (`⚡`), triệt tiêu việc xuất hiện 2 biểu tượng mặt trời cùng lúc.
     - Đồng bộ hóa trạng thái 2 chiều: Khi Thực địa bật, nút Theme trên header chuyển thành `⚡`, kích hoạt viền phát quang cảnh báo `active-field-theme`.
     - Nút `#fwField` ở Toolbar trang chủ đóng vai trò Quick Outdoor Switch, đồng bộ 100% với Header, không còn kẹt màu nền đen `#000 !important`.
  2. **Tối ưu hiển thị đa kích thước màn hình (Mobile 360px - 420px, Tablet 768px, Desktop 1280px)**:
     - Header mobile siêu nhỏ (< 480px): Tự động ẩn subtitle thừa, co gọn nút Menu thành icon `☰`, nút Quay lại thành `◀`, giải phóng không gian cho tiêu đề không bị co cụt.
     - Tiêu đề thẻ Sổ đo (`screen-datamgmt`): Bọc số lượng mốc `#txtPointsCount` trong badge pill bo tròn sắc nét, căn chỉnh flexbox chống bẻ dấu ngoặc đơn `1 )` xuống dòng.
     - Bố cục Bento HUD và Bento Action Tiles đáp ứng tự nhiên từ 1 cột (Mobile) sang 4 cột (Tablet/Desktop), căn giữa tối đa 960px.
- **Kiểm thử tự động & Nghiệm thu**:
  - `node --test tests/*.test.js`: **227/227 tests PASS 100%**.
  - `powershell -ExecutionPolicy Bypass -File init.ps1`: Thành công 100%.
  - Đối soát Chrome DevTools qua các viewport: Mobile 360×740, Mobile 390×844, Tablet 768×1024, Desktop 1280×800.
  - Thao tác trực tiếp qua lại giữa các theme và phân hệ: 0 lỗi console, không tràn viền.
- **Trạng thái**: Hoàn thành tối ưu, sẵn sàng release.

## Phiên trước — 2026-10-20: Rà soát Toàn diện 578 Nút bấm & Tối ưu hóa Chức năng (Harness-Kit F-011)
- **Đã hoàn tất**:
  1. Rà soát 100% chi tiết 578 nút bấm và phần tử tương tác qua Chrome DevTools MCP.
  2. Bổ sung xuất toàn cục an toàn vào `window` cho: `appCoordPicker`, `appBluetoothRtk`, `appResection`, `appProfile`, `appTrenches`, `appGeoid`, `appProject`.
  3. Vá lỗi tiềm ẩn trong `appData.getPoints` và `appData.addPoint`: Xử lý phòng vệ trước đối số không phải chuỗi hoặc null, hỗ trợ gọi đa hình `addPoint(point)` và `addPoint(projectName, point)` loại trừ dứt điểm lỗi `TypeError: proj.endsWith is not a function`.
  4. Tối ưu hóa công thái học cảm ứng di động: Nút `.btn-customize-pins` đạt `min-height: 36px`, chip `.quick-chip-pill` đạt `min-height: 38px`.
  5. Tối ưu thanh Camera tabs (`📸 Chụp ảnh`, `🖼️ Đóng dấu`, `📂 Thư viện`) dàn đều `flex: 1 1 0; min-width: 0;` triệt tiêu tràn viền ngang.
  6. Khuyến cáo sai số GPS trắc địa (±3m - 10m) tại Live HUD và màn hình Cắm mốc; kích hoạt `preferCanvas: true` tăng tốc bản đồ Leaflet.
- **Kiểm thử tự động & Nghiệm thu**:
  - `node --test tests/*.test.js`: **225/225 tests PASS 100%**.
  - `powershell -ExecutionPolicy Bypass -File init.ps1`: Thành công 100%.
  - Mô phỏng tương tác Chrome DevTools 10 phân hệ nghiệp vụ: PASS toàn bộ.
  - Viewport 360×740: `overflowIssues: []` (0 lỗi), 0 lỗi console.
- **Trạng thái**: Hoàn thành F-011 (`done`), sẵn sàng release.

## Phiên trước — 2026-10-19: Trang chủ Đơn giản / Nâng cao và Thực địa
- **Đã hoàn tất**: Trang chủ chuyển đổi nhanh hai chiều; mặc định Đơn giản, Nâng cao giữ toàn bộ HUD/ghim/công cụ cũ. Thêm chế độ Thực địa tương phản cao, nút lớn, lưu lựa chọn bằng localStorage có xử lý lỗi. Cấu hình sáng/tối và chế độ sunlight riêng của MiniCAD không bị ghi đè.
- **Tệp**: `field-workspace.js`, `field-workspace.css`, `tests/field-workspace.test.js`; các điểm tích hợp nhỏ ở `index.html`, `app.js`, `sw.js`.
- **Sự kiện**: `appNav.updateBanner()` phát `vn2000:contextchange`; đổi ngôn ngữ phát `vn2000:languagechange`. Module cập nhật nhãn và xóa kết quả không còn phù hợp. Chuyển đổi dùng trực tiếp các hàm geodesy hiện có với KTT/scale hiện hành; kết quả ghi rõ đơn vị và thông số.
- **Cô lập**: Nút chấm tọa độ nhanh chỉ mở `screen-transform-map`. Đã xác nhận trên trình duyệt `mapProjectBar` và `mapCadToolbar` không hiện. Accordion mặc định đóng, không để công cụ ẩn nhận focus.
- **GPS/PWA**: Thông báo giới hạn GPS điện thoại tại HUD/cắm mốc. Cache tăng lên `vn2000-pro-v2.8.3`, có hai tài nguyên module mới với đường dẫn không version query.
- **Kiểm thử**: `node --test tests/*.test.js` đạt **216/216**; syntax và diff check đạt. Đã kiểm tra trực quan 390×844, 360×844, 1440×900; Thực địa đo nút header ≥48×48 px, không bị cắt hoặc tràn ngang. Đã thử form chuyển đổi dấu phẩy, chế độ sáng/tối, accordion và bản đồ chuyển đổi.
- **Giới hạn xác minh**: Chưa thử với phần cứng GNSS/RTK, tệp CAD dung lượng lớn hoặc PWA cài trên điện thoại thật; thay đổi này tập trung vào UI/UX, không thay thuật toán đo hoặc bộ tải CAD.
- **Quyền thực thi**: Sau lỗi/treo CLI Gemini, người dùng đã chọn “Cho Codex hoàn thiện trực tiếp”. Codex viết bản cuối và kiểm thử; không nhận bản đề xuất Gemini làm sản phẩm đã hoàn thành.
- **Bàn giao**: Thay đổi đang ở working tree, chưa commit/deploy. Nhật ký thử và đề xuất gốc trong `.scratch/ui-ux-20261019/`; không đưa scratch vào bản phát hành.

## Ngữ cảnh phiên trước — Kiểm tra tổng thể
- **Phiên làm việc**: Hoàn tất kiểm tra tổng thể 4 vòng (`/grill-me`), vá lỗ hổng QuotaExceededError, cô lập MiniCAD và nghiệm thu F-002.
- **Kết quả cốt lõi**:
  - Tách bạch 100% giao diện: Mỗi chức năng sở hữu giao diện/màn hình riêng biệt.
  - Phân hệ Chuyển đổi tọa độ (F-002) sở hữu Live Map độc lập (`screen-transform-map`) và Bottom Sheet draggable, hoàn tất 10/10 tính năng cốt lõi (`done`).
  - Đã tích hợp `safeStorage` chống tràn bộ nhớ và loại bỏ sự kiện click kép giữa `appMap` và `appCadTool`.
  - Cache Service Worker được nâng cấp lên `vn2000-pro-v2.8.1`.
- **Trạng thái bài test**: 74/74 tests pass (100%).
- **Branch**: `main`.


## 2026-10-19 — Sửa trả tọa độ bản đồ về chế độ Đơn giản
- Nguyên nhân: Apply chỉ cập nhật bottom sheet bản đồ, chưa có đường trả điểm về form nhanh.
- Thêm onApplyPoint theo từng lần mở bản đồ; reset khi mở lại và tiêu thụ một lần. Luồng bộ chuyển đổi đầy đủ/đa điểm giữ nguyên.
- Form nhanh nhận lat/lng, chọn WGS-84 → VN-2000, quay về trang chủ và chuyển đổi ngay bằng KTT/scale hiện hành. Focus về nút Chuyển đổi.
- Cache PWA tăng lên vn2000-pro-v2.8.4.
- Kiểm chứng: 218/218 tests PASS, node --check và git diff --check đạt. Thử UI localhost: chấm điểm và Áp dụng về Form trả đúng tọa độ, X/Y khớp bản đồ.
- Chưa commit/deploy. Người dùng đã cho phép Codex hoàn thiện trực tiếp.
