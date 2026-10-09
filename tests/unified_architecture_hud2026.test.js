const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.resolve(__dirname, '../index.html');
const appJsPath = path.resolve(__dirname, '../app.js');

const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

test('=== 1. ĐỒNG BỘ CẤU TRÚC: SIDE DRAWER & BOTTOM NAV (5 PHÂN HỆ CỐT LÕI) ===', () => {
    // 1. Kiểm tra Bottom Nav 5 nút
    assert.ok(htmlContent.includes('id="bnavMenu"'), 'Có nút bnavMenu (Trang Chủ)');
    assert.ok(htmlContent.includes('id="bnavTransform"'), 'Có nút bnavTransform (Chuyển Đổi)');
    assert.ok(htmlContent.includes('id="bnavMap"'), 'Có nút bnavMap (Bản Đồ)');
    assert.ok(htmlContent.includes('id="bnavStakeout"'), 'Có nút bnavStakeout (Cắm Mốc)');
    assert.ok(htmlContent.includes('id="bnavDataMgmt"'), 'Có nút bnavDataMgmt (Sổ Đo)');
    assert.ok(!htmlContent.includes('id="bnavCad"'), 'MiniCAD hoàn toàn không xuất hiện trên Bottom Navigation Bar');

    // 2. Kiểm tra Side Drawer 5 Folders chuẩn hóa
    assert.ok(htmlContent.includes('id="drawerItem_home"'), 'Có mục Trang Chủ trong Side Drawer');
    assert.ok(htmlContent.includes('id="drawerFolder1"'), 'Có nhóm 1 Chuyển Đổi Tọa Độ');
    assert.ok(htmlContent.includes('id="drawerFolder2"'), 'Có nhóm 2 Bản Đồ & Cắm Mốc Thực Địa');
    assert.ok(htmlContent.includes('id="drawerFolder3"'), 'Có nhóm 3 Sổ Đo & Quản Lý Dự Án');
    assert.ok(htmlContent.includes('id="drawerFolder4"'), 'Có nhóm 4 Tiện Ích Nghiệp Vụ Mở Rộng');
    assert.ok(htmlContent.includes('id="drawerFolder5"'), 'Có nhóm 5 Hệ Thống & Cài Đặt');

    // 3. Tiện ích phụ trợ MiniCAD nằm trong nhóm 4 độc lập
    assert.ok(htmlContent.includes('id="drawerItem_cad_tool"'), 'Có mục tiện ích phụ trợ CAD Mini trong nhóm 4');
});

test('=== 2. THIẾT KẾ BENTO SURVEY HUD 2026 & HERO LIVE HUD CARD ===', () => {
    // 1. Hero Live HUD Card
    assert.ok(htmlContent.includes('id="heroLiveHudCard"'), 'Có thẻ Hero Live HUD Card trên Trang Chủ');
    assert.ok(htmlContent.includes('id="heroHudCoordX"'), 'Có ô hiển thị tọa độ X (Bắc) VN-2000');
    assert.ok(htmlContent.includes('id="heroHudCoordY"'), 'Có ô hiển thị tọa độ Y (Đông) VN-2000');
    assert.ok(htmlContent.includes('id="heroHudCoordH"'), 'Có ô hiển thị Cao độ H');
    assert.ok(htmlContent.includes('appDashboard.copyLiveGpsCoords()'), 'Có nút sao chép nhanh tọa độ thực địa');
    assert.ok(htmlContent.includes('appNav.openProjectMap({ focusGps: true })'), 'Có nút Xem trên Map từ Hero HUD Card');

    // 2. Kiểm tra hàm hỗ trợ trong app.js
    assert.ok(appJsContent.includes('copyLiveGpsCoords()'), 'appDashboard có hàm copyLiveGpsCoords');
    assert.ok(appJsContent.includes('heroHudCoordX'), 'updateGpsMiniCard tự động cập nhật heroHudCoordX');
    assert.ok(appJsContent.includes('heroHudCoordY'), 'updateGpsMiniCard tự động cập nhật heroHudCoordY');
});

test('=== 3. HIỆU ỨNG 60FPS SPRING TRANSITIONS & TƯƠNG TÁC 3D ===', () => {
    // 1. Tokens HUD 2026
    assert.ok(htmlContent.includes('--hud-bg-glass'), 'Đã tích hợp design token --hud-bg-glass');
    assert.ok(htmlContent.includes('--hud-border'), 'Đã tích hợp design token --hud-border');
    assert.ok(htmlContent.includes('--spring-easing'), 'Đã tích hợp design token --spring-easing');

    // 2. Spring Physics Transition
    assert.ok(htmlContent.includes('var(--spring-easing)'), 'screen-view sử dụng var(--spring-easing)');
    assert.ok(htmlContent.includes('keyframes hudPulse'), 'Có animation nhịp thở vệ tinh hudPulse');
    assert.ok(htmlContent.includes('.hero-live-hud-card:active'), 'Có hiệu ứng Card Press xúc giác cho HUD Card');
});

test('=== 4. PHÂN HỆ CHUYỂN ĐỔI: NÚT 1-CHẠM LƯU VÀO SỔ ĐO ===', () => {
    // 1. Nút Lưu vào sổ đo trong index.html
    assert.ok(htmlContent.includes('appTransform.saveConvertedToProject()'), 'Có nút Lưu vào sổ đo trong khung kết quả chuyển đổi');

    // 2. Hàm saveConvertedToProject trong app.js
    assert.ok(appJsContent.includes('saveConvertedToProject()'), 'appTransform có hàm saveConvertedToProject');
});
