/**
 * @file tests/transform_interactive_sheet_and_map.test.js
 * @description Kiểm thử giao diện Chuyển đổi tọa độ tích hợp Bản đồ tương tác + Floating Panel / Bottom Sheet
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = (fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '')).replace(/\r\n/g, '\n');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8').replace(/\r\n/g, '\n');

test('=== 1. KIỂM THỬ GIAO DIỆN FORM FLOATING PANEL / BOTTOM SHEET TRÊN BẢN ĐỒ CHUYỂN ĐỔI ===', () => {
    // 1. Phải có container Floating Panel / Bottom Sheet
    assert.ok(indexHtml.includes('id="transformBottomSheet"'), 'Có container transformBottomSheet trên bản đồ chuyển đổi');
    assert.ok(indexHtml.includes('class="transform-sheet-drag-handle"'), 'Có thanh vuốt / kéo trượt Drag Handle');
    assert.ok(indexHtml.includes('id="btnSheetPickToggle"'), 'Có nút Chấm bản đồ thu gọn bảng điều khiển');
    
    // 2. Tab Đơn điểm và Tab Đa điểm
    assert.ok(indexHtml.includes('id="sheetTabSingle"'), 'Có tab Đơn điểm');
    assert.ok(indexHtml.includes('id="sheetTabMulti"'), 'Có tab Đa điểm');
    assert.ok(indexHtml.includes('id="sheetPanelSingle"'), 'Có panel nội dung Đơn điểm');
    assert.ok(indexHtml.includes('id="sheetPanelMulti"'), 'Có panel nội dung Đa điểm');

    // 3. Các ô nhập liệu tọa độ
    assert.ok(indexHtml.includes('id="txtSheetWgsLat"'), 'Có ô nhập WGS-84 Vĩ độ Lat');
    assert.ok(indexHtml.includes('id="txtSheetWgsLng"'), 'Có ô nhập WGS-84 Kinh độ Lng');
    assert.ok(indexHtml.includes('id="txtSheetVn2kX"'), 'Có ô nhập VN-2000 X');
    assert.ok(indexHtml.includes('id="txtSheetVn2kY"'), 'Có ô nhập VN-2000 Y');

    // 4. Hộp kết quả chuyển đổi và Nút sao chép thông minh 1 chạm
    assert.ok(indexHtml.includes('id="sheetResultBox"'), 'Có Hộp kết quả chuyển đổi sheetResultBox');
    assert.ok(indexHtml.includes('id="btnSmartCopy"'), 'Có nút Sao chép thông minh 1 chạm btnSmartCopy');
    assert.ok(indexHtml.includes('id="menuCopyOptions"'), 'Có menu tùy chọn sao chép nâng cao');
    assert.ok(indexHtml.includes('class="btn-sheet-save-project"'), 'Có nút Lưu vào Sổ đo dự án');
});

test('=== 2. KIỂM THỬ ĐIỀU HƯỚNG TẬP TRUNG VÀO BẢN ĐỒ CHUYỂN ĐỔI TỌA ĐỘ ===', () => {
    // 1. showScreen('transform') mở thẳng openTransformMap
    assert.ok(appJs.includes("if (screenName === 'transform') {\n                appNav.openTransformMap();\n                return;"), 'showScreen("transform") mở thẳng openTransformMap()');
    
    // 2. navigateTo('transform') gọi openTransformMap
    assert.ok(appJs.includes("action === 'transform'") && appJs.includes("appNav.openTransformMap();"), 'navigateTo("transform") gọi appNav.openTransformMap()');
    
    // 3. openTransformMap đồng bộ Header và Menu active
    assert.ok(appJs.includes("1. CHUYỂN ĐỔI TỌA ĐỘ"), 'openTransformMap đặt tiêu đề 1. CHUYỂN ĐỔI TỌA ĐỘ');
});

test('=== 3. KIỂM THỬ CÁC HÀM XỬ LÝ LOGIC TRONG APPTRANSFORMMAP ===', () => {
    // 1. Các phương thức tương tác sheet
    assert.ok(appJs.includes('toggleBottomSheet()'), 'Có hàm toggleBottomSheet()');
    assert.ok(appJs.includes('triggerPickMode()'), 'Có hàm triggerPickMode()');
    assert.ok(appJs.includes('switchSheetTab('), 'Có hàm switchSheetTab()');
    
    // 2. Chuyển đổi và tính toán tức thời
    assert.ok(appJs.includes('executeSingleConvert()'), 'Có hàm executeSingleConvert()');
    assert.ok(appJs.includes('clearInputs()'), 'Có hàm clearInputs()');
    
    // 3. Sao chép thông minh và lưu dự án
    assert.ok(appJs.includes('smartCopyResult()'), 'Có hàm smartCopyResult()');
    assert.ok(appJs.includes('toggleCopyMenu('), 'Có hàm toggleCopyMenu()');
    assert.ok(appJs.includes('copyVn2kResult()'), 'Có hàm copyVn2kResult()');
    assert.ok(appJs.includes('copyWgsResult()'), 'Có hàm copyWgsResult()');
    assert.ok(appJs.includes('saveConvertedToProject()'), 'Có hàm saveConvertedToProject()');

    // 4. Đa điểm
    assert.ok(appJs.includes('pasteMultiFromClipboard()'), 'Có hàm pasteMultiFromClipboard()');
    assert.ok(appJs.includes('executeMultiConvert()'), 'Có hàm executeMultiConvert()');
});

test('=== 4. BẢO VỆ CÁC PHÂN HỆ KHÁC (MINICAD & DỰ ÁN) KHÔNG XUNG ĐỘT ===', () => {
    // 1. MiniCAD vẫn giữ vững cad-active-map và mở độc lập
    assert.ok(appJs.includes("action === 'cad_tool'") && appJs.includes("appNav.openCadMap()"), 'MiniCAD 4.4 mở độc lập');
    assert.ok(indexHtml.includes('#map-view-container.cad-active-map #mapCadToolbar'), 'MiniCAD toolbar có rule hiển thị chuyên biệt');
    
    // 2. Dự án 2.1 mở độc lập
    assert.ok(appJs.includes("action === 'map'") && appJs.includes("appNav.openProjectMap()"), 'Bản đồ dự án 2.1 mở độc lập');
});

test('=== 5. KIỂM THỬ XỬ LÝ NHẬP LIỆU & DÁN TỌA ĐỘ CLIPBOARD ĐƠN ĐIỂM ===', () => {
    // 1. Phương thức onInputChanged
    assert.ok(appJs.includes('onInputChanged(type)'), 'Có hàm onInputChanged() đồng bộ nhập liệu 2 chiều');
    
    // 2. Phương thức dán clipboard cho từng hệ tọa độ
    assert.ok(appJs.includes('pasteWgsFromClipboard()'), 'Có hàm pasteWgsFromClipboard()');
    assert.ok(appJs.includes('pasteVn2kFromClipboard()'), 'Có hàm pasteVn2kFromClipboard()');
    
    // 3. Export toàn cục an toàn
    assert.ok(appJs.includes('window.appTransformMap = appTransformMap;'), 'Export an toàn window.appTransformMap');
});

test('=== 6. KIỂM THỬ THẨM MỸ LOVABLE PRO: TƯƠNG PHẢN LIGHT & DARK THEME CHO BOTTOM SHEET ===', () => {
    // 1. Tương thích Light theme không bị mờ/chìm
    assert.ok(indexHtml.includes('[data-theme="light"] .transform-bottom-sheet'), 'Có style Light mode cho .transform-bottom-sheet');
    assert.ok(indexHtml.includes('[data-theme="light"] .sheet-main-title'), 'Có màu chữ đậm cho .sheet-main-title');
    assert.ok(indexHtml.includes('[data-theme="light"] .sheet-coord-card'), 'Có màu nền card sáng rõ cho .sheet-coord-card');
    assert.ok(indexHtml.includes('[data-theme="light"] .sheet-result-box'), 'Có hộp kết quả nền sáng viền xanh lá');
});

