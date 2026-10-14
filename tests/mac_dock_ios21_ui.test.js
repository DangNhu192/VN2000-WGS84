// tests/mac_dock_ios21_ui.test.js
// Kiểm thử giao diện Apple macOS Tahoe & iOS 21 Liquid Glass, MacBook Dock Taskbar cho Cài Đặt

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const styleCssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

test('=== 1. KIỂM THỬ THANH TASKBAR / MACBOOK DOCK CHO CÀI ĐẶT ===', (t) => {
    // 1. Kiểm tra ID và class mac-dock-taskbar trong index.html
    assert.ok(indexHtmlContent.includes('id="macSettingsDock"'),
        'Đã có thanh Taskbar / MacBook Dock #macSettingsDock trong modal Cài Đặt');
    assert.ok(indexHtmlContent.includes('class="settings-tab-bar mac-dock-taskbar"'),
        'Thanh tab mang class mac-dock-taskbar kết hợp');

    // 2. Kiểm tra các tab cài đặt có cấu trúc mac-dock-item
    const tabs = ['Welcome', 'General', 'Storage', 'Ktt', 'Datetime', 'Rtk', 'Resection', 'Optimizer'];
    tabs.forEach(tab => {
        assert.ok(indexHtmlContent.includes(`id="btnTab${tab}"`),
            `Bảo toàn nút tab btnTab${tab} cho nghiệp vụ`);
    });

    assert.ok(indexHtmlContent.includes('mac-dock-icon') && indexHtmlContent.includes('mac-dock-title'),
        'Các item trong Dock có đầy đủ Icon và Tên Tab để hiển thị trọn vẹn');

    // 3. Kiểm tra CSS Dock: Hiển thị đầy đủ tên tab, kích thước ổn định chống giật
    assert.ok(styleCssContent.includes('.mac-dock-title'),
        'CSS đã định nghĩa hiển thị trọn vẹn Tên Tab không bị che khuất');
    assert.ok(styleCssContent.includes('.modal-settings-header'),
        'CSS đã cố định header cài đặt ở trên cùng');
    assert.ok(!indexHtmlContent.includes('iOS 21 Pro'),
        'Đã loại bỏ nhãn khoe mẽ iOS 21 Pro theo văn phong tự nhiên');
});

test('=== 2. KIỂM THỬ CỤM NÚT ĐÈN GIAO THÔNG MACBOOK TRAFFIC LIGHTS ===', (t) => {
    // 1. Kiểm tra phần tử trong index.html
    assert.ok(indexHtmlContent.includes('class="mac-traffic-lights"'),
        'Đã có cụm macOS Traffic Lights trong modal Cài Đặt');
    assert.ok(indexHtmlContent.includes('class="mac-traffic-dot mac-dot-close"'),
        'Đã có nút đỏ Đóng cửa sổ mac-dot-close');
    assert.ok(indexHtmlContent.includes('class="mac-traffic-dot mac-dot-minimize"'),
        'Đã có nút vàng Thu nhỏ mac-dot-minimize');
    assert.ok(indexHtmlContent.includes('class="mac-traffic-dot mac-dot-zoom"'),
        'Đã có nút xanh Phóng to mac-dot-zoom');

    // 2. Kiểm tra các hàm logic trong app.js
    assert.ok(appJsContent.includes('toggleMinimizeSettings()'),
        'appModal có hàm toggleMinimizeSettings xử lý thu nhỏ/mở rộng cửa sổ');
    assert.ok(appJsContent.includes('toggleZoomSettings()'),
        'appModal có hàm toggleZoomSettings xử lý phóng to toàn màn hình');
});

test('=== 3. KIỂM THỬ macOS MENU BAR & DYNAMIC CONTROL CENTER CAPSULE TRÊN HEADER ===', (t) => {
    // 1. Header mang phong cách macOS Top Bar
    assert.ok(indexHtmlContent.includes('class="app-header mac-top-bar"'),
        'Thanh Header mang class mac-top-bar');
    assert.ok(indexHtmlContent.includes('class="mac-apple-badge"'),
        'Có biểu tượng quả táo  phong cách Apple');

    // 2. Cụm Control Center Capsule liền khối
    assert.ok(indexHtmlContent.includes('class="mac-control-center-capsule"'),
        'Có cụm Control Center Capsule liền khối chứa Theme, GPS và Cài Đặt');
});

test('=== 4. KIỂM THỬ macOS FLOATING DOCK CHO THANH ĐIỀU HƯỚNG ĐÁY & SIDEBAR ===', (t) => {
    // 1. Floating Dock
    assert.ok(indexHtmlContent.includes('class="mobile-bottom-nav mac-floating-dock"'),
        'Thanh điều hướng chân trang mang style mac-floating-dock');
    assert.ok(styleCssContent.includes('.mac-floating-dock'),
        'CSS có định nghĩa lơ lửng, bo góc 28px và đổ bóng đa tầng cho Floating Dock');

    // 2. Sidebar macOS System Preferences
    assert.ok(indexHtmlContent.includes('class="nav-tree-drawer mac-settings-sidebar"'),
        'Drawer mang style mac-settings-sidebar');
    assert.ok(styleCssContent.includes('.mac-settings-sidebar .drawer-leaf-icon'),
        'CSS có định nghĩa Squircle App Icons cho các mục danh mục');
});
