// tests/cadcraft_cli_and_ortho.test.js
// Kiểm thử chức năng CADCraft 2D CLI, Ortho Mode, Unified Rotation Control và Bảng kê Tem/Nhãn

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const styleCssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

test('=== 1. KIỂM THỬ THANH LỆNH AUTOCAD CADCRAFT CLI & STATUS RIBBON ===', (t) => {
    // 1. Kiểm tra phần tử Floating Command Bar trong index.html
    assert.ok(indexHtmlContent.includes('id="cadFloatingCmdBar"'),
        'Đã có thanh lệnh nổi CADCraft CLI #cadFloatingCmdBar trong HTML');
    assert.ok(indexHtmlContent.includes('id="txtCadCommandLine"'),
        'Đã có ô nhập dòng lệnh #txtCadCommandLine');
    assert.ok(indexHtmlContent.includes('id="cadCmdAutocomplete"'),
        'Đã có hộp gợi ý lệnh tự động #cadCmdAutocomplete');
    assert.ok(indexHtmlContent.includes('id="cadCmdCoordsLive"'),
        'Đã có HUD tọa độ VN-2000 thời gian thực trên thanh lệnh #cadCmdCoordsLive');

    // 2. Kiểm tra danh mục lệnh CADCraft và hàm thực thi
    assert.ok(appJsContent.includes('executeCommandLine()'),
        'Có hàm executeCommandLine xử lý các lệnh AutoCAD L, P, REC, C, DIM, RO, O, E, EXP...');
    assert.ok(appJsContent.includes('cadCommandList:'),
        'Có danh mục lệnh cadCommandList với phím tắt chuẩn AutoCAD');
    assert.ok(appJsContent.includes('toggleOrthoMode'),
        'Có hàm chuyển đổi chế độ Ortho Mode');
    assert.ok(appJsContent.includes('initFloatingCmdBarDrag()'),
        'Có hàm hỗ trợ kéo thả thanh lệnh tự do trên màn hình');
});

test('=== 2. KIỂM THỬ KHÓA VẼ VUÔNG GÓC ORTHO MODE 90 ĐỘ [F8] ===', (t) => {
    // 1. Phím tắt F8 trong bindEvents
    assert.ok(appJsContent.includes("e.key === 'F8'"),
        'Phím tắt F8 đã được tích hợp trong bindEvents');
    assert.ok(appJsContent.includes('this.toggleOrthoMode()'),
        'Phím F8 kích hoạt toggleOrthoMode');

    // 2. Logic khóa trục X hoặc Y trong handleMapClick
    assert.ok(appJsContent.includes('if (this.orthoMode && this.vertices && this.vertices.length > 0)'),
        'handleMapClick kiểm tra điều kiện orthoMode');
    assert.ok(appJsContent.includes('curVn.Y = lastV.y') && appJsContent.includes('curVn.X = lastV.x'),
        'handleMapClick khóa ngang/dọc theo hiệu số dx và dy');
});

test('=== 3. KIỂM THỬ TIỆN ÍCH XOAY NHÃN THỐNG NHẤT 0 - 360 ĐỘ CHO TOÀN BỘ ĐỐI TƯỢNG ===', (t) => {
    // 1. Hàm renderUnifiedRotationControl
    assert.ok(appJsContent.includes('renderUnifiedRotationControl(rot, targetType, targetIdOrIdx)'),
        'Có hàm renderUnifiedRotationControl tạo slider xoay 0° - 360°');
    assert.ok(appJsContent.includes('setQuickLabelRotation(val, targetType, targetIdOrIdx)'),
        'Có hàm setQuickLabelRotation cập nhật góc xoay tức thời');

    // 2. Áp dụng góc xoay cho tất cả đối tượng: shape, rect, arrow, circle, stamp, text
    assert.ok(appJsContent.includes("this.renderUnifiedRotationControl(rot, 'shape'"),
        'Khối đa giác được tích hợp điều khiển xoay nhãn');
    assert.ok(appJsContent.includes("this.renderUnifiedRotationControl(rot, 'rect'"),
        'Khối nhà được tích hợp điều khiển xoay nhãn');
    assert.ok(appJsContent.includes("this.renderUnifiedRotationControl(rot, 'arrow'"),
        'Mũi tên CAD được tích hợp điều khiển xoay nhãn');
    assert.ok(appJsContent.includes("this.renderUnifiedRotationControl(rot, 'circle'"),
        'Bán kính được tích hợp điều khiển xoay nhãn');
    assert.ok(appJsContent.includes("this.renderUnifiedRotationControl(rot, 'stamp'"),
        'Tem nhãn được tích hợp điều khiển xoay');
    assert.ok(appJsContent.includes("this.renderUnifiedRotationControl(rot, 'text'"),
        'Chữ ghi chú được tích hợp điều khiển xoay');
});

test('=== 4. KIỂM THỬ TAB BẢNG KÊ TEM / NHÃN BẢN VẼ TRONG BẢNG KÊ CHI TIẾT ===', (t) => {
    // 1. Nút subtab tem nhãn
    assert.ok(indexHtmlContent.includes('id="tabBtnCadTableStamps"'),
        'Đã có nút Tab Bảng kê Tem & Nhãn #tabBtnCadTableStamps trong HTML');
    assert.ok(indexHtmlContent.includes('id="cadCountTabStamps"'),
        'Có badge số đếm tem nhãn #cadCountTabStamps');

    // 2. Khung bảng dữ liệu
    assert.ok(indexHtmlContent.includes('id="tabContentCadTableStamps"'),
        'Có khung bảng dữ liệu #tabContentCadTableStamps');
    assert.ok(indexHtmlContent.includes('id="cadTableBodyStamps"'),
        'Có tbody dữ liệu #cadTableBodyStamps');

    // 3. Hàm render trong JS
    assert.ok(appJsContent.includes('renderModalStampsTable()'),
        'Có hàm renderModalStampsTable sinh danh sách tem nhãn chi tiết');
});
