# Progress Log — VN2000-PWA Harness

## Thông tin dự án
- **Dự án**: VN2000-PWA (WGS84 - VN2000 Pro Geodetic Survey App)
- **Kiến trúc Harness**: Harness-Kit + Antigravity-Harness (L3 Architecture Factory)
- **Cơ chế xác thực**: `init.ps1` (`node --test tests/*.test.js`) - Hiện tại: 216/216 bài test đạt 100%.

---

## Nhật ký tiến độ gần nhất

### [2026-10-21] Khắc Phục Lỗi Chặn Lớp Phủ Android / Bong Bóng Chat & Bảo Vệ Cấp Quyền GPS Thông Minh
- **Nguyên nhân**: Cơ chế Tapjacking Protection của Android chặn hộp thoại cấp quyền (Permission Dialog) của Chrome khi máy có bong bóng chat Messenger/Zalo, nút ảo hoặc app lọc màn hình đang nổi trong lúc webapp tự động dò GPS ngay lúc tải trang (`DOMContentLoaded`).
- **Triển khai khắc phục toàn diện**:
  1. **Lazy Permissions Checking trong `appGps.init()`**:
     - Sử dụng `navigator.permissions.query({ name: 'geolocation' })` để kiểm tra trước trạng thái cấp quyền.
     - Nếu đã cấp quyền (`granted`): Tự động bắt GPS an toàn mà không làm bung popup.
     - Nếu là thiết bị mới chưa cấp quyền (`prompt`): Đưa GPS về trạng thái Chờ (Standby / Click-to-activate), chỉ kích hoạt khi người dùng chạm ngón tay có chủ đích (`User Gesture`).
  2. **Tự động bắt lỗi Tapjacking & Chặn quyền**:
     - Trong `startTracking()` và `getLiveGps()`: Bắt mã lỗi `err.code === 1` (`PERMISSION_DENIED`).
     - Tự động hiển thị Toast cảnh báo chi tiết và kích hoạt Modal Hướng Dẫn Khắc Phục.
  3. **Tích hợp Cửa Sổ Trợ Giúp Cấp Quyền `#modalGpsPermissionGuide`**:
     - Giải thích rõ ràng nguyên nhân lớp phủ Android và hướng dẫn 2 cách khắc phục đơn giản:
       - Cách 1: Kéo đóng bong bóng chat Messenger / Zalo / tắt app lọc màn hình rồi bấm Thử lại.
       - Cách 2: Bấm vào biểu tượng Cài đặt trang web ⚙️ / 🔒 bên trái URL Chrome ➔ Quyền ➔ Bật Vị trí (Location).
     - Nút `[ 🛰️ Thử Lại Bắt GPS ]` cho phép kỹ sư kích hoạt lại ngay lập tức mà không cần F5 trang.
  4. **Kiểm thử tự động & Xác thực**:
     - Bổ sung **Test Suite 8** trong `tests/harness_button_audit_and_optimization.test.js`.
     - **229 / 229 bài test PASS 100%**.

### [2026-10-21] Hợp Nhất 1 Nút Xuất Dữ Liệu & Cửa Sổ Chọn Định Dạng Đa Năng (Lovable Pro 2026)
- **Tối ưu hóa Phân hệ Sổ đo (`screen-datamgmt`)**:
  - **Triệt tiêu cụm 4 nút xuất cồng kềnh**: Thay thế lưới 4 nút riêng lẻ (`Xuất CSV`, `Xuất CAD`, `Xuất KML`, `Chia sẻ`) bằng **ĐÚNG 1 NÚT DUY NHẤT**: `[ 📤 XUẤT DỮ LIỆU SỔ ĐO ]` (`#btnOpenExportModal`) rộng 100%, bo góc 12px, chuẩn công thái học di động.
  - **Cửa sổ Xuất & Chia sẻ Dữ liệu Hợp nhất (`#modalExportData`)**:
    - Hiển thị tóm tắt tên dự án hiện hành, số lượng mốc và badge thông số.
    - Cho phép kỹ sư chọn trực quan giữa 5 định dạng xuất hàng đầu ngành trắc địa:
      1. 📊 **Bảng Tính Excel (.xlsx)**: Đầy đủ 11 cột số liệu chuẩn + Sheet Chú thích hình khối MiniCAD.
      2. 📄 **File Văn Bản CSV (.csv)**: Mã hóa UTF-8 BOM, tương thích mọi thiết bị đo GPS RTK và phần mềm trắc địa.
      3. 📐 **Bản Vẽ AutoCAD (.dwg)**: Chuẩn Thông tư 25/2014/TT-BTNMT (Layer RANH_THUA, MOC_TOADO, chiều dài cạnh).
      4. 🌍 **Google Earth 3D (.kml)**: Xem vệ tinh 3D và ranh thửa đất trực quan.
      5. 💬 **Chia Sẻ Trực Tiếp (Zalo / Mail / App)**: Gửi file tức thì qua hộp thoại chia sẻ di động OS.
  - **Bổ sung các phương thức điều khiển**: `openExportModal()`, `closeExportModal()`, `selectExportFormat()`, `executeExport()` trong `appData`.
  - **Xác thực tự động**: Bổ sung Test Suite 7 trong `tests/harness_button_audit_and_optimization.test.js` — **228/228 bài test PASS 100%**.

### [2026-10-21] Khắc phục Xung đột "Thực địa vs Theme Sáng/Tối" & Tối ưu Giao diện Đa Màn Hình
- **Nâng cấp Hệ thống Theme Toàn cục 3-in-1 (Dark ➔ Light ➔ Field ➔ Dark)**:
  - Hợp nhất hoàn toàn Chế độ Thực địa vào nút Theme trên Header (`#btnHeaderThemeToggle`):
    - Chu trình 3 trạng thái: `🌙 Tối kỹ thuật` ➔ `☀️ Sáng ngọc trai` ➔ `⚡ Thực địa ngoài trời` ➔ `🌙 Tối kỹ thuật`.
    - Cho phép kỹ sư bật/tắt chế độ Thực địa ở **bất kỳ màn hình nào** (Bản đồ, Sổ đo, Cắm mốc...) ngay từ Header trên cùng.
  - Đồng bộ hóa 100% hai chiều với nút `#fwField` ở Toolbar trang chủ (hoạt động như một công tắc nhanh Quick Sunlight Switch ngoài nắng).
  - Khử trùng lặp thị giác: Dùng icon tia sét `⚡` thay cho biểu tượng mặt trời cũ, thêm viền phát quang cảnh báo `active-field-theme`.
- **Tối ưu hóa hiển thị và công thái học đa kích thước màn hình**:
  - **Mobile siêu nhỏ (360px - 420px)**:
    - Khắc phục lỗi tiêu đề Header bị co cụt ("W... Đồng") bằng cách tự động ẩn subtitle thừa trên mobile, thu gọn chữ "Menu" dài dòng thành icon `☰`, và co gọn nút Quay lại `◀`.
    - Khắc phục lỗi hiển thị tiêu đề thẻ Sổ đo (`screen-datamgmt`) bị ngắt dòng dấu ngoặc đơn `1 )`: chuyển số lượng mốc vào một badge pill bo tròn sắc nét `#txtPointsCount`, căn chỉnh flexbox chống bẻ dòng xấu xí.
    - Tối ưu thanh công cụ `#fwToolbar`: co giãn flex 50/50 đều đẹp cho `[ Đơn giản | Nâng cao ]` và căn phải nút `[ ⚡ Thực địa ]`.
  - **Tablet (768px - 1024px) & Desktop (1280px - 1920px)**:
    - Bố cục Bento HUD dàn đều 4 cột chuẩn tỷ lệ vàng.
    - Căn giữa toàn bộ giao diện làm việc, giữ khoảng đệm tối đa 960px thanh lịch, không bị kéo dãn dị dạng.
- **Xác thực toàn diện qua Chrome DevTools MCP & Node Test Runner**:
  - Chụp ảnh màn hình đối soát trực quan tại: Mobile 360×740, Mobile 390×844, Tablet 768×1024, Desktop 1280×800.
  - Thao tác thực tế qua lại giữa Chế độ Sáng (`Clean Pearl Light`), Tối (`Engineering Dark Pro`) và Thực địa (`High-Contrast Field Mode`).
  - Toàn bộ **227/227 bài test PASS 100%**.

### [2026-10-20] Kiểm thử chuyên sâu & Tối ưu hóa chức năng, thao tác toàn bộ ứng dụng (Harness-Kit & Vibe Design - F-011)
- **Kiểm thử chi tiết 578 nút bấm & thao tác**:
  - Dùng Chrome DevTools MCP tự động quét và phân tích 578 nút bấm và phần tử tương tác trên toàn bộ 11 phân hệ chức năng.
  - Phát hiện và bổ sung xuất toàn cục an toàn vào `window` cho: `appCoordPicker`, `appBluetoothRtk`, `appResection`, `appProfile`, `appTrenches`, `appGeoid`, `appProject`.
  - Phát hiện và vá lỗi tiềm ẩn trong `appData.getPoints` và `appData.addPoint`: Xử lý phòng vệ trước đối số không phải chuỗi hoặc null, hỗ trợ cú pháp gọi đa hình `addPoint(point)` và `addPoint(projectName, point)` triệt tiêu hoàn toàn nguy cơ `TypeError: proj.endsWith is not a function`.
- **Tối ưu hóa công thái học & Vùng cảm ứng (Touch Ergonomics)**:
  - Tăng chiều cao tối thiểu cho nút `.btn-customize-pins` (Đổi ghim) lên `min-height: 36px`.
  - Tăng chiều cao tối thiểu cho các chip trạng thái `.quick-chip-pill` lên `min-height: 38px`.
  - Tối ưu 3 tab chức năng Camera hiện trường (`📸 Chụp ảnh`, `🖼️ Đóng dấu`, `📂 Thư viện`) co giãn đều `flex: 1 1 0; min-width: 0;`.
- **Khuyến cáo sai số GPS & Tối ưu hóa Bản đồ Leaflet**:
  - Tích hợp banner khuyến cáo nghiệp vụ trắc địa pháp lý tại Live HUD và màn hình Cắm mốc.
  - Kích hoạt `preferCanvas: true` tăng tốc độ vẽ vector và khử lag khi tải nhiều mốc trên WebGIS.
- **Mô phỏng vận hành 10 phân hệ nghiệp vụ & Xác thực tự động**:
  - Chạy mô phỏng tương tác thành công 10/10 phân hệ: Chuyển đổi đơn/đa điểm, Bản đồ chuyển đổi, Bản đồ dự án (UI Isolation), Cắm mốc thực địa, Sổ đo, Trắc dọc & Hố đào TCVN 4447, Camera hiện trường, MiniCAD, Cài đặt & Trợ giúp.
  - Bổ sung bộ test hồi quy tự động: `tests/harness_button_audit_and_optimization.test.js` (5 bài test mới).
  - Kết quả xác thực qua `init.ps1` (`node --test tests/*.test.js`): **225/225 bài test PASS 100%**.
  - Đóng tính năng `F-011` trong `feature_list.json` với trạng thái `done`.

### [2026-10-19] Tinh gọn trang chủ và bổ sung chế độ Thực địa
- **Trang chủ**: Mặc định Đơn giản với form chuyển đổi nhanh WGS-84 ⇄ VN-2000, KTT/múi chiếu hiện hành, lối mở bản đồ chuyển đổi riêng và bộ chuyển đổi đầy đủ. Nâng cao giữ HUD, các ghim tùy chọn và công cụ hiện có; lựa chọn chế độ được lưu an toàn, không làm mất cấu hình kiểu menu cũ.
- **Nhập và kết quả**: Chấp nhận dấu phẩy thập phân, kiểm tra toàn bộ chuỗi số và giới hạn tọa độ, thông báo lỗi/focus đúng ô. Dùng động cơ trắc địa hiện có với đúng KTT và hệ số chiếu; xóa kết quả cũ khi sửa ô nhập, đổi chiều, đổi KTT hoặc ngôn ngữ. Có giao diện tiếng Việt/Anh.
- **Thực địa**: Tương phản đen/vàng, vùng bấm đầu trang tối thiểu 48×48 px, form và nút chính lớn. Giữ nguyên lựa chọn sáng/tối đã lưu và cài đặt nắng gắt của MiniCAD. Công cụ thu gọn dùng `hidden` và đồng bộ `aria-expanded` để không nhận focus khi đóng.
- **GPS**: Lưu ý giới hạn GPS điện thoại ở Live HUD và màn hình cắm mốc, giữ số liệu sai số hiện có; không đưa ra sai số cố định hoặc cam kết độ chính xác.
- **Cô lập/PWA**: Nút bản đồ nhanh gọi `openTransformMap({ mode: 'pick' })`, không mở Bản đồ dự án hoặc MiniCAD. Hai tài nguyên mới được thêm vào cache `vn2000-pro-v2.8.3` bằng URL không có query version.
- **Xác thực**: Baseline 209/209; sau thay đổi 216/216, gồm 7 test hành vi mới. `node --check` cho JS và `git diff --check` đạt. Đã thử chuyển đổi dấu phẩy trên trình duyệt; xem bố cục 390×844, 360×844 và 1440×900; kiểm tra sáng/tối/Thực địa, accordion và đường mở bản đồ độc lập. Không có tràn ngang trong các khung đã kiểm tra; các nút header Thực địa đo được ≥48×48 px.
- **Thực thi**: Đã gọi Gemini qua CLI chính thức nhưng kết quả không đạt điều kiện chấp nhận (quyền đọc lệnh bị từ chối ở lượt đầu; lượt sau trả nội dung không hợp lệ và không tự thoát thành công). Người dùng đã cho phép Codex hoàn thiện trực tiếp; mã cuối và việc kiểm thử do Codex thực hiện. Task/result và ảnh kiểm tra ở `.scratch/ui-ux-20261019/`.

### [2026-10-12] Kiểm tra Tổng thể 4 Vòng (/grill-me) & Khắc phục Lỗ hổng Ứng dụng
- **Phạm vi**: VN2000-PWA — Rà soát toàn diện 4 vòng: Chuyển đổi F-002, Cô lập 5 bản đồ, PWA & Bộ nhớ SafeStorage, Nghiệp vụ Kỹ sư thực địa.
- **Đã phát hiện & khắc phục**:
  1. **Bảo vệ Bộ nhớ (SafeStorage)**: Bổ sung module `safeStorage` (try/catch an toàn + toast cảnh báo người dùng) cho `savePoints` và các hàm lưu trữ dữ liệu, triệt tiêu nguy cơ sập script do `QuotaExceededError` khi nạp dữ liệu lớn.
  2. **Cô lập Click MiniCAD**: Chuẩn hóa `appMap.onMapClick` thoát ngay khi `AppState.mapMode === 'cad'`, loại bỏ lời gọi kép tới `appCadTool.handleMapClick()` vì `appCadTool` đã có event listener riêng biệt.
  3. **Đóng gói Phân hệ F-002**: Chuyển trạng thái F-002 từ `in_progress` sang `done` trong `feature_list.json` sau khi xác thực 100% tính độc lập của Form, Bottom Sheet và Bản đồ chuyển đổi riêng biệt.
  4. **Nâng cấp Cache Version**: Tăng `CACHE_NAME` trong `sw.js` lên `vn2000-pro-v2.8.1`, đảm bảo người dùng PWA trên di động tự động nhận bản vá mới nhất.
  5. **Bổ sung Bộ test hồi quy**: Thêm `tests/audit_remediation_regression.test.js` (4/4 test pass). Toàn bộ 74/74 bài test trong hệ thống đạt 100%.

### [2026-10-09] Sửa lỗi kích hoạt thanh công cụ 4.4 Vẽ MiniCAD
- **Vấn đề**: Khi bấm menu 4.4 trong Drawer, thanh công cụ MiniCAD không xuất hiện do CSS isolation `:not(.cad-active-map)` chặn `display: none !important` và `initMap()` bị gộp lỗi trong `initRightControlsDrag()`.
- **Đã chỉnh sửa**:
  1. `appNav.openCadMap()` thêm ngay lập tức class `cad-active-map`.
  2. `appCadTool.openToolbar()` đưa lệnh thêm `cad-active-map` lên ngay đầu hàm.
  3. `index.html` bổ sung luật CSS hiển thị `#map-view-container.cad-active-map #mapCadToolbar { display: flex !important; }`.
  4. Tách biệt `initMap()` khởi tạo Leaflet map chính xác, độc lập khỏi drag controls.
  5. Thêm test tự động `tests/cad_tool_navigation_and_visibility.test.js` (4/4 tests pass).
- **Trạng thái**: Đã push commit `592ca44` lên `origin/main`.

## 2026-10-19 — Sửa trả tọa độ bản đồ về chế độ Đơn giản
- Nguyên nhân: Apply chỉ cập nhật bottom sheet bản đồ, chưa có đường trả điểm về form nhanh.
- Thêm onApplyPoint theo từng lần mở bản đồ; reset khi mở lại và tiêu thụ một lần. Luồng bộ chuyển đổi đầy đủ/đa điểm giữ nguyên.
- Form nhanh nhận lat/lng, chọn WGS-84 → VN-2000, quay về trang chủ và chuyển đổi ngay bằng KTT/scale hiện hành. Focus về nút Chuyển đổi.
- Cache PWA tăng lên vn2000-pro-v2.8.4.
- Kiểm chứng: 218/218 tests PASS, node --check và git diff --check đạt. Thử UI localhost: chấm điểm và Áp dụng về Form trả đúng tọa độ, X/Y khớp bản đồ.
- Chưa commit/deploy. Người dùng đã cho phép Codex hoàn thiện trực tiếp.
