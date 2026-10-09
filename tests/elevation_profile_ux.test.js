// tests/elevation_profile_ux.test.js
// Bộ kiểm thử tự động toàn diện cho Chức năng "8. Trắc dọc & đào đắp" (TCVN 4447 & TCVN 9436):
// 1. Bố cục Responsive Dual-Pane chống che khuất, bảng số liệu cuộn ngang mượt mà.
// 2. Chống trùng lấp nội dung trên Canvas Trắc dọc (Xoay chữ thẳng đứng khi cọc hẹp, giãn chiều rộng linh hoạt).
// 3. Tô màu phân biệt vùng Đào (Cut) và Đắp (Fill), hiển thị thước tỷ lệ Scale HUD.
// 4. Bản vẽ mặt bằng CAD Hố đào: Khung tên riêng biệt không đè lên đa giác, tích hợp sang CAD Mini.
// 5. Nạp nhanh dữ liệu mẫu thực tế cho kỹ sư (Sample Alignment & Sample Pit).

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');

test('=== 1. BỐ CỤC RESPONSIVE DUAL-PANE & CHỐNG CHE KHUẤT NỘI DUNG ===', () => {
    // 1.1 CSS classes cho bố cục 2 cột chuyên nghiệp
    assert.match(indexHtml, /\.profile-split-layout\s*\{/, 'Phải có CSS layout chia cột cho trắc dọc & đào đắp');
    assert.match(indexHtml, /\.profile-config-column\s*\{/, 'Phải có CSS cột cấu hình thông số');
    assert.match(indexHtml, /\.profile-visual-column\s*\{/, 'Phải có CSS cột hiển thị bản vẽ và bảng');

    // 1.2 Breakpoint cho màn hình lớn (>= 1024px)
    assert.match(indexHtml, /@media\s*\(min-width:\s*1024px\)\s*\{[\s\S]*?\.profile-split-layout/, 'Phải có media query kích hoạt bố cục 2 cột trên màn hình >= 1024px');
    assert.match(indexHtml, /@media\s*\(min-width:\s*1024px\)\s*\{[\s\S]*?\.profile-config-column/, 'Cột cấu hình phải có chiều rộng cố định và sticky trên màn hình lớn');

    // 1.3 Container cuộn ngang cho bảng số liệu chống ép cụt chữ trên di động
    assert.match(indexHtml, /\.profile-table-scroll\s*\{[^}]*overflow-x:\s*auto;/s, 'Bảng số liệu phải có overflow-x: auto để không bị ép cụt chữ');
    assert.match(indexHtml, /\.profile-table-scroll\s*\{[^}]*overflow-y:\s*auto;/s, 'Bảng số liệu phải có overflow-y: auto để cuộn êm');

    // 1.4 Khung cuộn Canvas
    assert.match(indexHtml, /id="profileCanvasScrollWrap"/, 'Phải có container bọc cuộn ngang cho Canvas Trắc dọc');
    assert.match(indexHtml, /id="pitCanvasScrollWrap"/, 'Phải có container bọc cuộn ngang cho Canvas CAD Hố đào');
});

test('=== 2. CHỐNG TRÙNG LẤP NỘI DUNG TRÊN CANVAS TRẮC DỌC (ANTI-COLLISION) ===', () => {
    // 2.1 Logic xoay chữ thẳng đứng -90° theo chuẩn TCVN khi cọc hẹp
    assert.match(appJs, /drawBandCell\s*\(/, 'appElevationProfile phải có hàm chuyên biệt drawBandCell để vẽ ô trích yếu');
    assert.match(appJs, /rotate\(-Math\.PI\s*\/\s*2\)/, 'Phải có logic xoay chữ -90° thẳng đứng khi khoảng cách cọc hẹp < 52px');
    assert.match(appJs, /isNarrow/, 'Phải phát hiện trạng thái cọc hẹp (isNarrow) dựa trên khoảng cách giữa các cọc liền kề');

    // 2.2 Tự động co giãn bề rộng Canvas theo số lượng cọc
    assert.match(appJs, /Math\.max\(800,\s*\(180\s*\+\s*items\.length/, 'Chiều rộng Canvas phải tự động co giãn theo số lượng cọc để không bị chen chúc');

    // 2.3 Phóng to / thu nhỏ bề rộng Canvas
    assert.match(appJs, /zoomCanvas\s*\(/, 'appElevationProfile phải có hàm zoomCanvas hỗ trợ kỹ sư soi chi tiết');
});

test('=== 3. TÔ MÀU PHÂN BIỆT ĐÀO / ĐẮP & THƯỚC ĐO TỶ LỆ KỸ THUẬT ===', () => {
    // 3.1 Tô màu vùng Đào (Cut) và Đắp (Fill)
    assert.match(appJs, /showCutFillShading/, 'Phải có biến trạng thái quản lý tô màu vùng Đào/Đắp');
    assert.match(appJs, /toggleCutFillShading\s*\(/, 'Phải có hàm toggleCutFillShading cho phép bật/tắt tô màu');
    assert.match(appJs, /rgba\(239,\s*68,\s*68/, 'Phải có màu đỏ cho vùng Đào');
    assert.match(appJs, /rgba\(56,\s*189,\s*248/, 'Phải có màu xanh cho vùng Đắp');

    // 3.2 Thước đo Tỷ lệ đứng / Tỷ lệ ngang
    assert.match(appJs, /TL Đứng: 1\//, 'Phải hiển thị tỷ lệ đứng trên đồ thị trắc dọc');
    assert.match(appJs, /TL Ngang: 1\//, 'Phải hiển thị tỷ lệ ngang trên đồ thị trắc dọc');
});

test('=== 4. BẢN VẼ MẶT BẰNG CAD HỐ ĐÀO: KHÔNG ĐÈ LÊN ĐA GIÁC & TÍCH HỢP CAD MINI ===', () => {
    // 4.1 Khung tên không đè lên đa giác hố đào
    assert.match(appJs, /padBottom\s*=\s*\(this\.showPitTitleBlock\s*!==\s*false\)\s*\?\s*115\s*:\s*45;/, 'Phải dành khoảng đệm riêng biệt padBottom cho Khung tên để không đè lên đa giác');
    assert.match(appJs, /togglePitTitleBlock\s*\(/, 'Phải có hàm togglePitTitleBlock cho phép bật/tắt khung tên');
    assert.match(appJs, /zoomPitCanvas\s*\(/, 'Phải có hàm zoomPitCanvas cho bản vẽ mặt bằng CAD');

    // 4.2 Chuyển sang CAD Mini mở đúng chế độ openCadMap
    assert.match(appJs, /sendPitToCadMini\(\)\s*\{[\s\S]*?appNav\.openCadMap\(\)/, 'sendPitToCadMini phải mở bằng openCadMap() để vào đúng chế độ vẽ MiniCAD');
});

test('=== 5. NẠP NHANH DỮ LIỆU MẪU THỰC TẾ CHO KỸ SƯ ===', () => {
    // 5.1 Nạp 5 cọc mẫu tuyến trắc dọc
    assert.match(appJs, /loadSampleAlignment\s*\(/, 'appElevationProfile phải có hàm loadSampleAlignment');
    assert.match(indexHtml, /loadSampleAlignment/, 'Giao diện phải có nút nạp tuyến mẫu');

    // 5.2 Nạp hố móng mẫu 4 đỉnh móng đơn
    assert.match(appJs, /loadSamplePit\s*\(/, 'appElevationProfile phải có hàm loadSamplePit');
    assert.match(indexHtml, /loadSamplePit/, 'Giao diện phải có nút nạp hố móng mẫu');

    // 5.3 Nút xóa cọc để làm việc mới
    assert.match(appJs, /clearAlignmentPoints\s*\(/, 'appElevationProfile phải có hàm clearAlignmentPoints');
});
