const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const uiPolishCss = fs.readFileSync(path.join(ROOT_DIR, 'ui-polish.css'), 'utf-8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf-8');

test('=== 1. KIỂM THỬ KHẮC PHỤC KẸT VUỐT VÀ CHE KHUẤT TRÊN SIDE DRAWER MENU ===', () => {
    // 1. Kiểm tra z-index Drawer và Backdrop phải cao hơn Header (2500) và Bottom Dock (2400)
    assert.ok(
        uiPolishCss.includes('.nav-tree-drawer {') && uiPolishCss.includes('z-index: 9999 !important;'),
        'Side Drawer phải có z-index: 9999 !important để nổi hoàn toàn lên trên màn hình'
    );
    assert.ok(
        uiPolishCss.includes('.nav-tree-backdrop {') && uiPolishCss.includes('z-index: 9998 !important;'),
        'Backdrop Drawer phải có z-index: 9998 !important để che mờ header và dock'
    );

    // 2. Không được có touch-action: none trên body.drawer-open làm tê liệt cuộn cảm ứng di động
    assert.ok(
        !uiPolishCss.includes('body.drawer-open {\n  overflow: hidden !important;\n  touch-action: none !important;'),
        'Tuyệt đối không được gán touch-action: none trên body.drawer-open'
    );
    assert.ok(
        uiPolishCss.includes('body.drawer-open {') && uiPolishCss.includes('touch-action: pan-y !important;'),
        'body.drawer-open phải cho phép touch-action: pan-y !important'
    );

    // 3. Ẩn hoàn toàn Bottom Dock khi mở Drawer trong CSS
    assert.ok(
        uiPolishCss.includes('body.drawer-open nav#mobileBottomNav.mobile-bottom-nav') ||
        uiPolishCss.includes('body.drawer-open #mobileBottomNav'),
        'CSS phải ẩn thanh Bottom Navigation khi body có class drawer-open'
    );

    // 4. Kiểm tra logic JS trong openTreeMenu và closeTreeMenu
    assert.ok(
        appJs.includes("const bnav = document.getElementById('mobileBottomNav');") &&
        appJs.includes("bnav.style.setProperty('display', 'none', 'important');"),
        'appNav.openTreeMenu() phải ẩn mobileBottomNav'
    );
    assert.ok(
        appJs.includes("bnav.style.removeProperty('display');"),
        'appNav.closeTreeMenu() phải phục hồi mobileBottomNav'
    );
});

test('=== 2. KIỂM THỬ KHOẢNG ĐỆM ĐÁY (DOCK CLEARANCE) CHO TRANG CHỦ & CÁC MÀN HÌNH ===', () => {
    // Kiểm tra padding-bottom tối thiểu 130px cho #screen-menu để không bị Bottom Dock che khuất chức năng
    assert.ok(
        uiPolishCss.includes('#screen-menu') &&
        uiPolishCss.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 20px)) !important;'),
        '#screen-menu phải có padding-bottom tối thiểu 130px + safe area'
    );
});

test('=== 3. KIỂM THỬ BOTTOM SHEET BẢN ĐỒ CHUYỂN ĐỔI: 1 CHẠM TOGGLE VÀ VUỐT NHẠY ===', () => {
    // 1. Kiểm tra initSheetDrag có hỗ trợ 1 chạm toggle
    assert.ok(
        appJs.includes("handle.addEventListener('click',"),
        'Handle thanh kéo Bottom Sheet phải có sự kiện click để 1 chạm toggle'
    );

    // 2. Kiểm tra ngưỡng vuốt nhạy (15px thay vì 35px cứng nhắc)
    assert.ok(
        appJs.includes("currentTranslate < -15") && appJs.includes("currentTranslate > 15"),
        'Ngưỡng vuốt mở rộng / thu gọn Bottom Sheet phải đạt độ nhạy 15px'
    );
});
