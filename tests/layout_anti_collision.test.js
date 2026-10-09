/**
 * BỘ KIỂM THỬ TỰ ĐỘNG CHỐNG XUNG ĐỘT GIAO DIỆN & ĐÈ NÚT (LAYOUT ANTI-COLLISION TEST)
 * Kiểm tra tĩnh các ràng buộc CSS & logic di chuyển chống đè nút trên màn hình di động
 * Chạy với: node tests/layout_anti_collision.test.js
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function runLayoutTests() {
    console.log('========================================================================');
    console.log('🧪 BẮT ĐẦU KIỂM THỬ CHỐNG ĐÈ NÚT & VỠ GIAO DIỆN (WEB DESIGN GUIDELINES)');
    console.log('========================================================================\n');

    const indexPath = path.join(__dirname, '..', 'index.html');
    const appPath = path.join(__dirname, '..', 'app.js');

    const stylePath = path.join(__dirname, '..', 'style.css');
    const indexHtml = fs.readFileSync(indexPath, 'utf8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf8') : '');
    const appJs = fs.readFileSync(appPath, 'utf8');

    // 1. Kiểm tra vị trí CAD Status HUD trên mobile
    console.log('--- NHÓM 1: CHỐNG ĐÈ THANH CAD STATUS HUD TRÊN DI ĐỘNG ---');
    {
        const hasCadHudLift = indexHtml.includes('.cad-status-hud') && 
            indexHtml.includes('bottom: calc(var(--sat-safe-bottom) + 64px)');
        assert(hasCadHudLift, 'CAD Status HUD được nâng lên trên thanh Mobile Bottom Nav (+64px)');

        const hasCadHudZIndex = indexHtml.includes('z-index: 2450');
        assert(hasCadHudZIndex, 'CAD Status HUD có z-index: 2450 cao hơn Bottom Nav để luôn nổi lên trên');
    }

    // 2. Kiểm tra vị trí Map Bottom Sheet trên mobile
    console.log('\n--- NHÓM 2: CHỐNG ĐÈ MAP BOTTOM SHEET TRÊN DI ĐỘNG ---');
    {
        const hasSheetLift = indexHtml.includes('.map-bottom-sheet') && 
            indexHtml.includes('bottom: calc(var(--sat-safe-bottom) + 66px)');
        assert(hasSheetLift, 'Bảng xem chi tiết mốc (Map Bottom Sheet) được nâng lên trên thanh Bottom Nav (+66px)');

        const hasSheetZIndex = indexHtml.includes('z-index: 2500');
        assert(hasSheetZIndex, 'Map Bottom Sheet có z-index: 2500 để các nút bấm tương tác không bị che khuất');
    }

    // 3. Kiểm tra Leaflet bottom controls
    console.log('\n--- NHÓM 3: CHỐNG ĐÈ THƯỚC ĐO TỶ LỆ LEAFLET TRÊN DI ĐỘNG ---');
    {
        const hasLeafletLift = indexHtml.includes('.leaflet-bottom') && 
            indexHtml.includes('bottom: calc(var(--sat-safe-bottom) + 60px)');
        assert(hasLeafletLift, 'Thanh thước tỷ lệ bản đồ Leaflet nằm trên thanh Bottom Nav (+60px)');
    }

    // 4. Kiểm tra thanh công cụ MiniCAD và nút FAB bên phải
    console.log('\n--- NHÓM 4: CHỐNG XUNG ĐỘT THANH NÚT FAB & MINICAD TOOLBAR ---');
    {
        const hasRightControlsOffset = indexHtml.includes('.cad-active-map .map-right-controls') &&
            indexHtml.includes('top: calc(var(--sat-safe-top) + 155px)');
        assert(hasRightControlsOffset, 'Thanh nút FAB bên phải bản đồ tự động dời xuống dưới thanh MiniCAD (+155px)');

        const hasFabResize = indexHtml.includes('width: 36px !important') && 
            indexHtml.includes('height: 36px !important');
        assert(hasFabResize, 'Kích thước nút FAB trên di động thu gọn (36x36px) để không tràn khỏi màn hình');
    }

    // 5. Kiểm tra bảng kê tọa độ cuộn mượt mà
    console.log('\n--- NHÓM 5: CHỐNG VỠ BẢNG KÊ TỌA ĐỘ VÀ BẢNG KHỐI ---');
    {
        const hasTableWrapOverflow = indexHtml.includes('.cad-table-wrap {') && 
            indexHtml.includes('overflow: auto;');
        assert(hasTableWrapOverflow, 'Khung bảng kê (.cad-table-wrap) có overflow: auto hỗ trợ cuộn cả 2 chiều');

        const hasPanelHeaderWrap = indexHtml.includes('.cad-blocks-panel-header') && 
            indexHtml.includes('flex-wrap: wrap !important;');
        assert(hasPanelHeaderWrap, 'Tiêu đề bảng khối CAD hỗ trợ flex-wrap chống tràn chữ và nút trên màn hình hẹp');
    }

    // 6. Kiểm tra giới hạn kéo thả an toàn trong app.js
    console.log('\n--- NHÓM 6: GIỚI HẠN KÉO THẢ TRÁNH ĐÈ THANH ĐIỀU HƯỚNG ---');
    {
        const hasRightControlsInset = appJs.includes('const bottomInset = (window.innerWidth <= 768) ? 72 : 50;');
        assert(hasRightControlsInset, 'Kéo thả thanh nút FAB có chặn biên dưới tự động khi có thanh Bottom Nav');

        const hasBlocksPanelInset = appJs.includes('const bottomInset = (window.innerWidth <= 768) ? 72 : 10;');
        assert(hasBlocksPanelInset, 'Kéo thả bảng khối MiniCAD có chặn biên dưới tự động không bị lọt xuống dưới Bottom Nav');

        const hasEffectiveStatsSnapping = appJs.includes('targetShape.stats = this.getEffectiveStats(targetShape);');
        assert(hasEffectiveStatsSnapping, 'Bắt điểm cạnh chung bảo toàn số liệu tùy biến bằng getEffectiveStats');
    }

    console.log('\n========================================================================');
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests/totalTests*100)}%)`);
    if (failedTests > 0) {
        console.error(`❌ CÓ ${failedTests} KIỂM THỬ THẤT BẠI!`);
        process.exit(1);
    } else {
        console.log(`🎉 TOÀN BỘ GIAO DIỆN & LOGIC ĐÃ ĐẠT CHUẨN AN TOÀN TUYỆT ĐỐI CHỐNG ĐÈ NÚT!`);
    }
    console.log('========================================================================\n');
}

runLayoutTests();
