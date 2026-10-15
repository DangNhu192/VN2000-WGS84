/**
 * tests/responsive_icon_dock.test.js
 * Kiểm thử Giao diện Nút Bấm macOS Dock / Taskbar MacBook Responsive
 * Khắc phục triệt để vỡ layout, che nút, mất chữ trên màn hình nhỏ
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf-8');

test('=== 1. KIỂM THỬ BOTTOM NAVIGATION: macOS FLOATING DOCK & ACTIVE INDICATOR ===', async (t) => {
    await t.test('1.1 Cả 5 nút Bottom Nav đều có cấu trúc dock-active-dot chuẩn macOS', () => {
        const dotMatches = indexHtml.match(/<span class="dock-active-dot"><\/span>/g);
        assert.ok(dotMatches, 'Thiếu thẻ dock-active-dot trong index.html');
        assert.strictEqual(dotMatches.length, 5, 'Phải có đúng 5 dock-active-dot cho 5 nút điều hướng');
    });

    await t.test('1.2 Cả 5 nút Bottom Nav đều có class bottom-nav-text và bottom-nav-icon', () => {
        const textMatches = indexHtml.match(/class="bottom-nav-text"/g);
        const iconMatches = indexHtml.match(/class="bottom-nav-icon"/g);
        assert.strictEqual(textMatches.length, 5, 'Phải có 5 bottom-nav-text');
        assert.strictEqual(iconMatches.length, 5, 'Phải có 5 bottom-nav-icon');
    });

    await t.test('1.3 CSS có media query max-width: 480px ẩn chữ, hiển thị icon to và active dot', () => {
        assert.ok(styleCss.includes('@media (max-width: 480px)'), 'Thiếu media query max-width: 480px');
        assert.ok(styleCss.includes('nav#mobileBottomNav.mobile-bottom-nav .bottom-nav-text'), 'Thiếu selector bottom-nav-text');
        assert.ok(styleCss.includes('.dock-active-dot'), 'Thiếu style cho dock-active-dot');
    });
});

test('=== 2. KIỂM THỬ TOP HEADER: macOS MENU BAR CAPSULE TRÊN MOBILE ===', async (t) => {
    await t.test('2.1 Trên màn hình nhỏ <= 520px ẩn chữ Menu, Cài đặt và text GPS', () => {
        assert.ok(styleCss.includes('@media (max-width: 520px)'), 'Thiếu media query max-width: 520px');
        assert.ok(styleCss.includes('.tree-nav-label'), 'Thiếu rule ẩn tree-nav-label');
        assert.ok(styleCss.includes('.header-action-text'), 'Thiếu rule ẩn header-action-text');
        assert.ok(styleCss.includes('#headerGpsText'), 'Thiếu rule ẩn headerGpsText');
    });

    await t.test('2.2 Control Center Capsule có padding và button tròn gọn', () => {
        assert.ok(styleCss.includes('.mac-control-center-capsule'), 'Thiếu style mac-control-center-capsule');
        assert.ok(styleCss.includes('.mac-ctrl-btn'), 'Thiếu style mac-ctrl-btn');
    });
});

test('=== 3. KIỂM THỬ THANH CÔNG CỤ BẢN ĐỒ: macOS FLOATING TOOL CAPSULE ===', async (t) => {
    await t.test('3.1 mapProjectBar có class map-action-icon và btn-text cho tất cả các nút', () => {
        assert.ok(indexHtml.includes('class="map-action-icon"'), 'mapProjectBar thiếu map-action-icon');
        assert.ok(indexHtml.includes('<span class="map-action-icon">➕</span><span class="btn-text"> Dự án mới</span>'));
        assert.ok(indexHtml.includes('<span class="map-action-icon">📥</span><span class="btn-text"> Nhập File</span>'));
        assert.ok(indexHtml.includes('<span class="map-action-icon">📋</span><span class="btn-text"> Xem mốc</span>'));
        assert.ok(indexHtml.includes('<span class="map-action-icon">🔍</span><span class="btn-text"> Bao quát</span>'));
    });

    await t.test('3.2 Trên mobile <= 520px, mapProjectBar ẩn chữ btn-text và thu gọn nút 32x32px', () => {
        assert.ok(styleCss.includes('.map-project-bar .btn-map-action .btn-text'), 'Thiếu rule ẩn btn-text trong mapProjectBar');
        assert.ok(styleCss.includes('.map-project-bar .btn-map-action'), 'Thiếu style cho btn-map-action');
    });

    await t.test('3.3 barCoordPicker có icon to và ẩn chữ phụ trên màn hình nhỏ', () => {
        assert.ok(indexHtml.includes('picker-mode-icon'), 'Thiếu picker-mode-icon');
        assert.ok(styleCss.includes('.bar-coord-picker .btn-picker-mode .btn-text'), 'Thiếu rule ẩn btn-text trong barCoordPicker');
    });
});

test('=== 4. KIỂM THỬ MINICAD TOUCH BAR VÀ NÚT XUẤT FILE SỔ ĐO ===', async (t) => {
    await t.test('4.1 cadTabGroup có class cad-tab-icon và cad-tab-text', () => {
        assert.ok(indexHtml.includes('cad-tab-icon'), 'Thiếu cad-tab-icon');
        assert.ok(indexHtml.includes('cad-tab-text'), 'Thiếu cad-tab-text');
    });

    await t.test('4.2 cadTabGroup và cadActionsRow hỗ trợ cuộn ngang Touch Bar không thanh trượt', () => {
        assert.ok(styleCss.includes('.cad-tab-group::-webkit-scrollbar'), 'Thiếu ẩn thanh trượt cadTabGroup');
        assert.ok(styleCss.includes('.cad-actions-row::-webkit-scrollbar'), 'Thiếu ẩn thanh trượt cadActionsRow');
    });

    await t.test('4.3 export-actions-grid trên mobile tự động thành lưới 2x2 cân xứng', () => {
        assert.ok(styleCss.includes('.export-actions-grid'), 'Thiếu export-actions-grid style');
        assert.ok(styleCss.includes('grid-template-columns: repeat(2, 1fr)'), 'Thiếu bố cục grid 2 cột cho export-actions-grid');
    });
});
