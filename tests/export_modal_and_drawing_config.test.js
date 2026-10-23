const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('=== 1. KIỂM THỬ NÚT BẤM XUẤT DỮ LIỆU & BẢNG CẤU HÌNH THÔNG TIN BẢN VẼ ===', (t) => {
    const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

    // 1. Kiểm tra bảng điều khiển "Cấu hình thông tin khác của bản vẽ" trong #modalExportData
    assert.ok(html.includes('id="modalExportData"'), 'Phải có Modal #modalExportData');
    assert.ok(html.includes('CẤU HÌNH THÔNG TIN KHÁC CỦA BẢN VẼ'), 'Có tiêu đề Bảng điều khiển cấu hình thông tin khác');
    assert.ok(html.includes('id="txtExportDrawingTitle"'), 'Có trường Tiêu đề bản vẽ');
    assert.ok(html.includes('id="txtExportOwner"'), 'Có trường Chủ sở hữu / Người sử dụng');
    assert.ok(html.includes('id="txtExportParcelNo"'), 'Có trường Số hiệu thửa đất / Tờ bản đồ');
    assert.ok(html.includes('id="txtExportAddress"'), 'Có trường Địa chỉ thửa đất / Vị trí');
    assert.ok(html.includes('id="txtExportChecker"'), 'Có trường Người kiểm tra / Phê duyệt');
    assert.ok(html.includes('id="txtExportDrawingCode"'), 'Có trường Ký hiệu bản vẽ / Mã hồ sơ');
    assert.ok(html.includes('id="txtExportNotes"'), 'Có trường Ghi chú kỹ thuật');
    assert.ok(html.includes('appData.saveTitleBlockInfo(true)'), 'Có nút lưu cấu hình');
    assert.ok(html.includes('appData.resetTitleBlockInfo()'), 'Có nút đặt lại mặc định');

    // 2. Kiểm tra bảng điều khiển trong #modalCadExportConfig (MiniCAD)
    assert.ok(html.includes('id="modalCadExportConfig"'), 'Phải có Modal #modalCadExportConfig');
    assert.ok(html.includes('id="cadExportOwner"'), 'MiniCAD có trường Chủ sở hữu');
    assert.ok(html.includes('id="cadExportParcelNo"'), 'MiniCAD có trường Số hiệu thửa đất');
    assert.ok(html.includes('id="cadExportAddress"'), 'MiniCAD có trường Địa chỉ thửa đất');
    assert.ok(html.includes('id="cadExportChecker"'), 'MiniCAD có trường Người kiểm tra');
    assert.ok(html.includes('id="cadExportDrawingCode"'), 'MiniCAD có trường Ký hiệu bản vẽ');

    // 3. Kiểm tra các hàm điều khiển trong appCadTool chống crash
    assert.ok(appJs.includes('openExportModal('), 'appCadTool có openExportModal');
    assert.ok(appJs.includes('closeExportModal('), 'appCadTool có closeExportModal');
    assert.ok(appJs.includes('selectExportFormat(fmt) {') || appJs.includes('selectExportFormat(format) {'), 'appCadTool có selectExportFormat');
    assert.ok(appJs.includes('executeExport() {'), 'appCadTool có executeExport');
    assert.ok(appJs.includes('exportDgn() {'), 'appCadTool có exportDgn');
    assert.ok(appJs.includes('exportKml() {'), 'appCadTool có exportKml');
    assert.ok(appJs.includes('exportGeoJson() {'), 'appCadTool có exportGeoJson');
    assert.ok(appJs.includes('exportTxt() {'), 'appCadTool có exportTxt');
    assert.ok(appJs.includes('shareExport() {'), 'appCadTool có shareExport');

    // 4. Kiểm tra modal bật tắt đúng display
    assert.ok(appJs.includes("modal.style.display = 'flex'"), 'Modal được bật display flex');
    assert.ok(appJs.includes("modal.style.display = 'none'"), 'Modal được tắt display none');
});

test('=== 2. KIỂM THỬ ĐỘNG CƠ XUẤT DWG VÀ CÁC THÔNG TIN KHÁC ĐƯỢC ĐỌC ===', (t) => {
    const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

    // Kiểm tra getExportOptions đọc các trường cấu hình thông tin bản vẽ
    assert.ok(appJs.includes('txtExportDrawingTitle'), 'Đọc txtExportDrawingTitle');
    assert.ok(appJs.includes('txtExportOwner'), 'Đọc txtExportOwner');
    assert.ok(appJs.includes('txtExportParcelNo'), 'Đọc txtExportParcelNo');
    assert.ok(appJs.includes('txtExportAddress'), 'Đọc txtExportAddress');
    assert.ok(appJs.includes('txtExportChecker'), 'Đọc txtExportChecker');
    assert.ok(appJs.includes('txtExportDrawingCode'), 'Đọc txtExportDrawingCode');

    // Kiểm tra các hàm lưu & reset
    assert.ok(appJs.includes('saveTitleBlockInfo('), 'appData có hàm saveTitleBlockInfo');
    assert.ok(appJs.includes('resetTitleBlockInfo('), 'appData có hàm resetTitleBlockInfo');
});
