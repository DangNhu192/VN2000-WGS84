// tests/multi_point_inline_editing.test.js
// Kiểm thử phân hệ Chuyển đổi tọa độ: Nhập/sửa trực tiếp đa điểm và logic thống nhất 1.1, 1.2, 1.3

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const geodesy = require('../geodesy.js');

const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const styleCssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

test('=== 1. KIỂM THỬ PHÂN ĐỊNH ROUTING THỐNG NHẤT 1.1, 1.2, 1.3 ===', (t) => {
    // 1. Drawer và Tree Navigation có đủ 3 mục 1.1, 1.2, 1.3
    assert.ok(indexHtmlContent.includes('1.1 Chuyển đổi 2 chiều đơn điểm'), 'Có mục 1.1 Chuyển đổi 2 chiều đơn điểm');
    assert.ok(indexHtmlContent.includes('1.2 Chuyển đổi danh sách hàng loạt & Nhập file') || indexHtmlContent.includes('1.2 Chuyển đổi hàng loạt & Nhập file'), 'Có mục 1.2 Chuyển đổi hàng loạt');
    assert.ok(indexHtmlContent.includes('1.3 Bản đồ Chuyển đổi & Chấm điểm'), 'Có mục 1.3 Bản đồ Chuyển đổi & Chấm điểm');

    // 2. appNav có hàm openTransformCoordScreen phân định subtab
    assert.ok(appJsContent.includes("openTransformCoordScreen(tab = 'single')"), 'appNav có hàm openTransformCoordScreen');
    assert.ok(appJsContent.includes("action === 'transform'") && appJsContent.includes("openTransformCoordScreen('single')"), 'Mục 1.1 gọi openTransformCoordScreen("single")');
    assert.ok(appJsContent.includes("action === 'batch_import'") && appJsContent.includes("openTransformCoordScreen('multi')"), 'Mục 1.2 gọi openTransformCoordScreen("multi")');
    assert.ok(appJsContent.includes("action === 'transform_map'") && appJsContent.includes("openTransformMap("), 'Mục 1.3 gọi openTransformMap()');

    // 3. showScreen('transform') mở đúng screen-transform
    assert.ok(appJsContent.includes("targetScreen = document.getElementById('screen-transform');"), 'showScreen("transform") hiển thị đúng screen-transform');
});

test('=== 2. KIỂM THỬ BẢNG NHẬP & ĐIỀU CHỈNH TRỰC TIẾP TỌA ĐỘ ĐA ĐIỂM (1.2) ===', (t) => {
    // 1. HTML có các nút công cụ nhập liệu trực tiếp
    assert.ok(indexHtmlContent.includes('appTransform.addManualMultiPoint()'), 'Có nút Thêm mốc trực tiếp');
    assert.ok(indexHtmlContent.includes('appTransform.toggleMultiDirection()'), 'Có nút Đổi chiều hệ tọa độ nguồn');
    assert.ok(indexHtmlContent.includes('id="fileMultiBatchInput"'), 'Có input file ẩn để tải file CSV/Excel vào bảng');
    assert.ok(indexHtmlContent.includes('class="table-selectable table-editable-grid"'), 'Bảng mang class table-editable-grid');
    assert.ok(indexHtmlContent.includes('id="boxMultiAddRowBar"'), 'Có thanh thêm mốc nhanh dưới chân bảng');

    // 2. Logic JS trong appTransform
    assert.ok(appJsContent.includes('addManualMultiPoint('), 'appTransform có hàm addManualMultiPoint');
    assert.ok(appJsContent.includes('updatePointName('), 'appTransform có hàm updatePointName');
    assert.ok(appJsContent.includes('updatePointCoord('), 'appTransform có hàm updatePointCoord');
    assert.ok(appJsContent.includes('toggleMultiDirection()'), 'appTransform có hàm toggleMultiDirection');
    assert.ok(appJsContent.includes('handleFileInput('), 'appTransform có hàm handleFileInput');
    assert.ok(appJsContent.includes('sendSingleToMulti()'), 'appTransform có hàm sendSingleToMulti');
    assert.ok(appJsContent.includes('viewMultiPointOnMap('), 'appTransform có hàm viewMultiPointOnMap');

    // 3. CSS định nghĩa styling cho editable table và input
    assert.ok(styleCssContent.includes('.table-editable-grid'), 'CSS có style cho .table-editable-grid');
    assert.ok(styleCssContent.includes('.table-inline-input'), 'CSS có style cho .table-inline-input');
    assert.ok(styleCssContent.includes('[data-theme="light"] .table-inline-input'), 'CSS có style Light mode cho input bảng');
});

test('=== 3. KIỂM THỬ TÍNH TOÁN VÀ ĐỒNG BỘ DỮ LIỆU ĐA ĐIỂM ===', (t) => {
    // Mô phỏng logic tính toán live chuyển đổi
    const ktt = 105.75;
    const k0 = 0.9999;
    
    // Test WGS-84 -> VN2000
    const lat = 10.345211;
    const lng = 106.113617;
    const vnPt = geodesy.convertWgsToVn2k(lat, lng, ktt, k0);
    assert.ok(vnPt.X > 1000000, 'X VN2000 tính toán chuẩn (> 1,000,000m)');
    assert.ok(vnPt.Y > 500000, 'Y VN2000 tính toán chuẩn (> 500,000m)');

    // Test VN2000 -> WGS-84
    const wgsPt = geodesy.convertVn2kToWgs(vnPt.X, vnPt.Y, ktt, k0);
    assert.ok(Math.abs(wgsPt.lat - lat) < 0.0001, 'Vĩ độ Lat khôi phục chuẩn xác');
    assert.ok(Math.abs(wgsPt.lng - lng) < 0.0001, 'Kinh độ Lng khôi phục chuẩn xác');
});

test('=== 4. KIỂM THỬ SỬA TRỰC TIẾP TRÊN BOTTOM SHEET BẢN ĐỒ (1.3) ===', (t) => {
    assert.ok(appJsContent.includes('updateMultiPointCoord(i, field, val)'), 'appTransformMap có hàm updateMultiPointCoord');
    assert.ok(appJsContent.includes("oninput=\"appTransformMap.updateMultiPointCoord("), 'Ô tọa độ trên bottom sheet là input cho phép gõ sửa trực tiếp');
});
