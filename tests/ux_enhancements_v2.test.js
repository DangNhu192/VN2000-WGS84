// tests/ux_enhancements_v2.test.js
// Bộ kiểm thử tự động toàn diện cho 4 tính năng nâng cấp UX / UI:
// 1. Chuyển đổi tọa độ: Màn hình lớn dual-pane kết hợp Live Map, màn hình nhỏ giữ nguyên.
// 2. 5.6 Cài đặt Ngày giờ hệ thống: Tự động/Thủ công, đồng bộ unified settings modal, getAppEffectiveDate.
// 3. Bản đồ dự án & mốc: Tách biệt hoàn toàn, view-only, cấm công cụ vẽ MiniCAD.
// 4. Bảng kê các khối đã vẽ: Kéo thả co giãn kích thước (resize: both), tên khối hiển thị trọn vẹn, không gãy nút.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');

test('=== 1. CHUYỂN ĐỔI TỌA ĐỘ: DUAL-PANE SPLIT TRÊN MÀN HÌNH LỚN & LIVE MAP ===', () => {
    // 1.1 CSS Breakpoint cho màn hình lớn (>= 1024px)
    assert.match(indexHtml, /@media\s*\(min-width:\s*1024px\)/, 'Phải có media query cho màn hình lớn >= 1024px');
    assert.match(indexHtml, /\.transform-split-layout/, 'Phải có class layout chia 2 cột cho màn hình chuyển đổi');
    assert.match(indexHtml, /\.transform-content-column/, 'Phải có cột nội dung form chuyển đổi');
    assert.match(indexHtml, /\.transform-map-column/, 'Phải có cột bản đồ Live Map');
    assert.match(indexHtml, /id="boxTransformLiveMapWrap"/, 'Phải có container bọc Live Map bên phải');
    assert.match(indexHtml, /id="transformLiveMap"/, 'Phải có thẻ div bản đồ Live Map');

    // 1.2 Màn hình nhỏ (< 1024px) ẩn map column để giữ nguyên giao diện gọn gàng
    assert.match(indexHtml, /\.transform-map-column\s*\{\s*display:\s*none;/, 'Màn hình nhỏ mặc định ẩn cột bản đồ');

    // 1.3 Logic JavaScript trong app.js
    assert.match(appJs, /initDesktopLiveMap\s*\(/, 'appTransform phải có hàm khởi tạo Live Map');
    assert.match(appJs, /syncSingleToLiveMap\s*\(/, 'appTransform phải có hàm đồng bộ kết quả chuyển đổi đơn lẻ lên Live Map');
    assert.match(appJs, /syncMultiToLiveMap\s*\(/, 'appTransform phải có hàm đồng bộ kết quả chuyển đổi hàng loạt lên Live Map');
    assert.match(appJs, /toggleLiveMapLayer\s*\(/, 'appTransform phải có hàm chuyển đổi lớp bản đồ vệ tinh / đường phố');
    assert.match(appJs, /fitLiveMapBounds\s*\(/, 'appTransform phải có hàm thu phóng bao quát Live Map');
});

test('=== 2. CÀI ĐẶT NGÀY GIỜ HỆ THỐNG & THỐNG NHẤT CÀI ĐẶT ỨNG DỤNG ===', () => {
    // 2.1 Tab Ngày & Giờ trong modal cài đặt thống nhất
    assert.match(indexHtml, /id="btnTabDatetime"/, 'Thanh tab cài đặt phải có nút tab Ngày & Giờ');
    assert.match(indexHtml, /id="settingsTabContentDatetime"/, 'Nội dung cài đặt phải có tab Ngày & Giờ');
    assert.match(indexHtml, /id="clockDatetimeDisplay"/, 'Phải có đồng hồ điện tử hiển thị thời gian');
    assert.match(indexHtml, /id="btnDatetimeModeAuto"/, 'Phải có nút chọn chế độ Tự động');
    assert.match(indexHtml, /id="btnDatetimeModeManual"/, 'Phải có nút chọn chế độ Thủ công');
    assert.match(indexHtml, /id="inputManualDatetimeLocal"/, 'Phải có input datetime-local cho chỉnh thủ công');
    assert.match(indexHtml, /id="selManualTimezoneOffset"/, 'Phải có danh sách chọn Múi giờ');

    // 2.2 JavaScript logic trong app.js
    assert.match(appJs, /tabList\s*=\s*\[.*'datetime'.*\]/, 'switchSettingsTab phải chứa tab datetime');
    assert.match(appJs, /const appDateTime\s*=\s*\{/, 'Phải có module appDateTime');
    assert.match(appJs, /window\.getAppEffectiveDate\s*=/, 'Phải có hàm toàn cục window.getAppEffectiveDate');
    assert.match(appJs, /openDateTimeSettings\(\)\s*\{[^}]*openUnifiedSettings\('datetime'\)/, 'openDateTimeSettings phải mở modal cài đặt thống nhất với tab datetime');
    assert.match(appJs, /window\.appDateTime\s*=\s*appDateTime/, 'appDateTime phải được export ra window');
});

test('=== 3. BẢN ĐỒ DỰ ÁN & MỐC TÁCH BIỆT HOÀN TOÀN KHÔNG CÓ MINICAD ===', () => {
    // 3.1 Giao diện bản đồ dự án chỉ có nạp file, danh sách mốc, bao quát
    assert.match(indexHtml, /id="mapProjectBar"/, 'Phải có thanh công cụ dự án độc lập');
    assert.match(indexHtml, /openImportProjectModal/, 'Thanh công cụ dự án có nút nạp file dự án');
    assert.match(indexHtml, /openPointsListModal/, 'Thanh công cụ dự án có nút xem bảng kê mốc và khối');
    assert.match(appJs, /viewProjectMarksAndBlocks/, 'appMap phải có hàm viewProjectMarksAndBlocks');

    // 3.2 Logic cách ly MiniCAD trong openProjectMap
    assert.match(appJs, /openProjectMap\(options\s*=\s*\{\}\)\s*\{[\s\S]*?AppState\.mapMode\s*=\s*'project'/, 'openProjectMap phải đặt mapMode là project');
    assert.match(appJs, /if\s*\(typeof appCadTool !== 'undefined' && appCadTool\.isActive\)\s*\{\s*appCadTool\.closeToolbar\(\);?\s*\}/, 'openProjectMap phải đóng thanh công cụ CAD');
    assert.match(appJs, /if\s*\(AppState\.mapMode === 'project'\)\s*\{\s*return;\s*\}/, 'onMapClick phải chặn tuyệt đối vẽ điểm khi đang ở chế độ project map');
});

test('=== 4. BẢNG KÊ CÁC KHỐI ĐÃ VẼ: CO GIÃN THU PHÓNG & HIỂN THỊ TRỌN VẸN TÊN KHỐI ===', () => {
    // 4.1 Khung có thuộc tính resize co giãn tự do cho người dùng
    assert.match(indexHtml, /\.cad-blocks-panel\s*\{[^}]*resize:\s*both;/s, 'Bảng kê các khối phải có CSS resize: both');
    assert.match(indexHtml, /\.cad-blocks-panel\s*\{[^}]*overflow:\s*hidden;/s, 'Bảng kê các khối phải có CSS overflow: hidden');
    assert.match(indexHtml, /\.cad-blocks-panel\s*\{[^}]*min-width:\s*320px;/s, 'Bảng kê các khối phải có min-width hợp lý');

    // 4.2 Các nút thao tác trên header không bị tràn hoặc gãy dòng
    assert.match(indexHtml, /white-space:\s*nowrap/s, 'Header nút bấm phải có white-space: nowrap');
    assert.match(indexHtml, /flex-shrink:\s*0/s, 'Header nút bấm phải có flex-shrink: 0');

    // 4.3 Ô nhập Tên khối / thửa đủ rộng để không bị che khuất
    assert.match(appJs, /min-width:\s*110px/, 'Ô nhập tên khối trong renderBlocksPanel phải có min-width >= 110px');
    assert.match(appJs, /max-width:\s*240px/, 'Ô nhập tên khối trong renderBlocksPanel phải có max-width đủ rộng');
});
