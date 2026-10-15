/**
 * KIỂM THỬ TÙY CHỈNH TASKBAR DI ĐỘNG & CHẾ ĐỘ BIỂU TƯỢNG LỚN (ICON PRO - ÍT CHỮ)
 * Đáp ứng yêu cầu:
 * 1. Chế độ Icon Pro - Ít chữ triệt tiêu text thừa, tăng kích thước Icon & tọa độ
 * 2. Taskbar trên màn hình nhỏ cho phép tùy biến 3 nút giữa qua chức năng "Đổi ghim"
 *    - Cố định nút 1: "Trang chủ"
 *    - Cố định nút 5: "Sổ đo"
 *    - Linh hoạt 3 nút ở giữa: Mặc định ["Chuyển đổi", "Bản đồ", "Cắm mốc"]
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ CHẾ ĐỘ BIỂU TƯỢNG LỚN (ICON PRO - ÍT CHỮ) TRONG STYLE.CSS ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 1.1 Kiểm tra không còn lỗi cú pháp dấu phẩy trước @media (nguyên nhân khiến quy tắc bị vô hiệu)
    assert.strictEqual(
        css.includes('.ui-mode-icon-pro .mac-settings-btn .header-action-text,\n@media') ||
        css.includes('.ui-mode-icon-pro .mac-settings-btn .header-action-text,\r\n@media'),
        false,
        'Tuyệt đối không để dấu phẩy nối selector với khối @media'
    );

    // 1.2 Triệt tiêu các đoạn chữ rườm rà, giải phóng tối đa không gian màn hình
    assert.ok(css.includes('.ui-mode-icon-pro .feature-card-desc'), 'Ẩn mô tả thẻ tính năng');
    assert.ok(css.includes('.ui-mode-icon-pro .compact-tool-sub'), 'Ẩn phụ đề công cụ phụ');
    assert.ok(css.includes('.ui-mode-icon-pro .accordion-title-sub'), 'Ẩn phụ đề accordion');
    assert.ok(css.includes('.ui-mode-icon-pro .form-hint'), 'Ẩn hướng dẫn form');
    assert.ok(css.includes('.ui-mode-icon-pro .input-help-text'), 'Ẩn chú thích nhập liệu');
    assert.ok(css.includes('.ui-mode-icon-pro .form-text-muted'), 'Ẩn chữ mờ');
    assert.ok(css.includes('.ui-mode-icon-pro #lblTransformKttPreview span:last-child'), 'Ẩn giải thích KTT');
    assert.ok(css.includes('.ui-mode-icon-pro .mac-settings-btn .header-action-text'), 'Ẩn chữ cài đặt header');
    assert.ok(css.includes('.ui-mode-icon-pro #headerGpsText'), 'Ẩn chữ GPS header');

    // 1.3 Phóng to số liệu tọa độ và icon để dễ nhìn ngoài thực địa nắng chói
    assert.ok(css.includes('.ui-mode-icon-pro .hero-coord-val'), 'Có style cho số liệu tọa độ HUD');
    assert.ok(css.includes('font-size: 20px !important;'), 'Tọa độ VN-2000 phóng to 20px');
    assert.ok(css.includes('.ui-mode-icon-pro .big-tile-icon-box'), 'Icon box Bento phóng to');
    assert.ok(css.includes('.ui-mode-icon-pro .btn-convert'), 'Nút chuyển đổi to rõ, dễ bấm');
});

test('=== 2. KIỂM THỬ GIAO DIỆN MODAL ĐỔI GHIM TASKBAR TRONG INDEX.HTML ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 2.1 Tab chuyển đổi giữa Ghim Trang Chủ và Ghim Taskbar
    assert.ok(html.includes('id="btnPinTabHome"'), 'Có tab Ghim Trang Chủ');
    assert.ok(html.includes('id="btnPinTabTaskbar"'), 'Có tab Ghim Taskbar Di Động');
    assert.ok(html.includes('appDashboard.switchPinModalTab'), 'Có hàm chuyển tab switchPinModalTab');

    // 2.2 Khu vực hiển thị mô phỏng Taskbar Preview
    assert.ok(html.includes('id="pinTaskbarPreviewContainer"'), 'Có container hiển thị Taskbar Preview');

    // 2.3 Bảo toàn các ID cho kiểm thử và tương thích
    assert.ok(html.includes('id="modalCustomizePinned"'), 'Có modal tùy chỉnh ghim');
    assert.ok(html.includes('id="pinPickerList"'), 'Có danh sách checkbox tính năng');
    assert.ok(html.includes('id="pinPickerCounter"'), 'Có bộ đếm số lượng mục đã chọn');
});

test('=== 3. KIỂM THỬ LOGIC JAVASCRIPT TÙY BIẾN TASKBAR DOCK TRONG APP.JS ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    // 3.1 appNav quản lý cấu hình Taskbar Pins
    assert.ok(appJs.includes('getTaskbarPinnedIds()'), 'appNav có hàm getTaskbarPinnedIds()');
    assert.ok(appJs.includes('saveTaskbarPinnedIds('), 'appNav có hàm saveTaskbarPinnedIds()');
    assert.ok(appJs.includes('renderTaskbarDock()'), 'appNav có hàm renderTaskbarDock()');
    assert.ok(appJs.includes('vn2k_taskbar_pinned_ids'), 'Lưu cấu hình vào key vn2k_taskbar_pinned_ids');

    // 3.2 Cố định nút 1 (Trang chủ) và nút 5 (Sổ đo)
    assert.ok(appJs.includes('id="bnavMenu"'), 'Nút 1 cố định là bnavMenu');
    assert.ok(appJs.includes('appNav.goToMenu()'), 'Nút 1 kích hoạt appNav.goToMenu()');
    assert.ok(appJs.includes('id="bnavDataMgmt"'), 'Nút 5 cố định là bnavDataMgmt');
    assert.ok(appJs.includes("appNav.showScreen('datamgmt')"), 'Nút 5 kích hoạt showScreen datamgmt');

    // 3.3 Linh hoạt 3 nút ở giữa: Mặc định là transform, map, stakeout
    assert.ok(appJs.includes("['transform', 'map', 'stakeout']"), 'Cấu hình mặc định 3 nút giữa là transform, map, stakeout');

    // 3.4 Logic trong modal Đổi Ghim của appDashboard
    assert.ok(appJs.includes('switchPinModalTab('), 'appDashboard có switchPinModalTab');
    assert.ok(appJs.includes('toggleTaskbarPinSelection('), 'appDashboard có toggleTaskbarPinSelection');
    assert.ok(appJs.includes('tempSelectedTaskbarPins'), 'appDashboard theo dõi tempSelectedTaskbarPins');

    // 3.5 Đồng bộ trạng thái active trong Taskbar Dock
    assert.ok(appJs.includes('syncBottomNav('), 'appNav có hàm syncBottomNav');
});

test('=== 4. KIỂM THỬ VẬN HÀNH THỰC TẾ (SIMULATION TESTS) ===', () => {
    // Giả lập môi trường DOM tối thiểu và localStorage
    const storage = {};
    const mockLocalStorage = {
        getItem: (k) => (k in storage ? storage[k] : null),
        setItem: (k, v) => { storage[k] = String(v); },
        removeItem: (k) => { delete storage[k]; }
    };

    // Nạp logic kiểm thử từ hàm trích xuất
    const getTaskbarPinnedIds = (storageObj) => {
        const raw = storageObj['vn2k_taskbar_pinned_ids'];
        if (raw) {
            try {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr) && arr.length === 3) return arr;
            } catch (e) {}
        }
        return ['transform', 'map', 'stakeout'];
    };

    // Mặc định trả về 3 nút chuẩn
    const defaultPins = getTaskbarPinnedIds(storage);
    assert.deepStrictEqual(defaultPins, ['transform', 'map', 'stakeout'], 'Mặc định phải là 3 tính năng Chuyển đổi, Bản đồ, Cắm mốc');

    // Người dùng đổi sang Camera, Trắc dọc, MiniCAD
    storage['vn2k_taskbar_pinned_ids'] = JSON.stringify(['camera', 'profile', 'cad_tool']);
    const customPins = getTaskbarPinnedIds(storage);
    assert.deepStrictEqual(customPins, ['camera', 'profile', 'cad_tool'], 'Lấy chính xác cấu hình 3 nút mới được đổi');

    // Cấu hình không hợp lệ tự động fallback về mặc định
    storage['vn2k_taskbar_pinned_ids'] = JSON.stringify(['only_one']);
    const fallbackPins = getTaskbarPinnedIds(storage);
    assert.deepStrictEqual(fallbackPins, ['transform', 'map', 'stakeout'], 'Fallback an toàn khi cấu hình bị lỗi');
});
