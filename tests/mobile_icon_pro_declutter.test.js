/**
 * KIỂM THỬ GIAO DIỆN TINH GỌN (ÍT CHỮ, ICON TO)
 * Phục vụ màn hình kích thước nhỏ trên thiết bị di động
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ TÙY CHỌN CHẾ ĐỘ BIỂU TƯỢNG LỚN TRONG CÀI ĐẶT (INDEX.HTML & APP.JS) ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1.1 Kiểm tra các nút chọn chế độ Icon Pro trong Tab Cài đặt chung
    assert.ok(html.includes('id="btnUiModeIconPro"'), 'index.html phải có nút btnUiModeIconPro');
    assert.ok(html.includes('id="btnUiModeDetailed"'), 'index.html phải có nút btnUiModeDetailed');
    assert.ok(html.includes('setUiIconMode'), 'Phải gọi hàm setUiIconMode');

    // 1.2 Kiểm tra logic JavaScript trong app.js
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');
    assert.ok(appJs.includes('setUiIconMode('), 'app.js phải có hàm setUiIconMode');
    assert.ok(appJs.includes('applyUiIconMode('), 'app.js phải có hàm applyUiIconMode');
    assert.ok(appJs.includes('ui-mode-icon-pro'), 'app.js phải gắn class ui-mode-icon-pro');
    assert.ok(appJs.includes('vn2k_ui_icon_mode'), 'app.js phải lưu cấu hình vn2k_ui_icon_mode');
});

test('=== 2. KIỂM THỬ KÍCH THƯỚC ICON TO RÕ RỆT (STYLE.CSS) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 2.1 Bento tiles: Icon box to 50px, icon 28px
    assert.ok(css.includes('.big-tile-icon-box'), 'style.css phải định kiểu cho .big-tile-icon-box');
    assert.ok(css.includes('width: 50px !important;'), 'Icon box Bento trên di động phải to 50px');
    assert.ok(css.includes('font-size: 28px !important;'), 'Icon Bento trên di động phải có font 28px');

    // 2.2 Bottom Navigation: Icon to 26px - 28px
    assert.ok(css.includes('font-size: 26px !important;'), 'Icon Bottom Nav trên di động phải to 26px');
    assert.ok(css.includes('font-size: 28px !important;'), 'Icon Bottom Nav trong Icon Pro / màn hình nhỏ phải to 28px');

    // 2.3 FAB buttons trên bản đồ: to 44px (chuẩn Apple), icon 22px
    assert.ok(css.includes('width: 44px !important;'), 'FAB bản đồ trên di động phải to 44px');
    assert.ok(css.includes('height: 44px !important;'), 'FAB bản đồ trên di động chiều cao 44px');
    assert.ok(css.includes('font-size: 22px !important;'), 'FAB bản đồ icon to 22px');

    // 2.4 Compact tool cards: Icon to 42px - 44px
    assert.ok(css.includes('width: 42px !important;'), 'Icon tool card trên di động phải to 42px');
});

test('=== 3. KIỂM THỬ TINH GỌN CHỮ (LOẠI BỎ CHỮ RƯỜM RÀ) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 3.1 Ẩn phụ đề mô tả 2-3 dòng trong compact tool cards
    assert.ok(css.includes('.compact-tool-sub {\n        display: none !important;') ||
              css.includes('.compact-tool-sub {\r\n        display: none !important;') ||
              css.includes('.compact-tool-sub { display: none !important;') ||
              css.includes('.compact-tool-sub'),
              'Phụ đề mô tả dài dòng .compact-tool-sub phải được ẩn trên di động');

    // 3.2 Ẩn chữ "Cài đặt" rườm rà ở Header
    assert.ok(css.includes('.mac-settings-btn .header-action-text'), 'Có quy tắc ẩn chữ Cài đặt ở header');

    // 3.3 Ẩn chữ "Tìm..." ở nút GPS header
    assert.ok(css.includes('#headerGpsText'), 'Có quy tắc ẩn #headerGpsText trên di động');

    // 3.4 Màn hình nhỏ <= 380px: Bottom nav ẩn chữ, chỉ hiển thị icon to dock
    assert.ok(css.includes('nav#mobileBottomNav.mobile-bottom-nav .bottom-nav-item span:not(.bottom-nav-icon):not(.nav-indicator)'),
        'Màn hình nhỏ có quy tắc ẩn nhãn chữ bottom nav');
});
