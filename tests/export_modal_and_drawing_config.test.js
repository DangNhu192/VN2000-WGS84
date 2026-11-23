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
    assert.ok(html.includes('id="txtExportNotes"'), 'Có trường Ghi chú kỹ thuật');
    assert.ok(html.includes('appData.saveTitleBlockInfo(true)'), 'Có nút lưu cấu hình');
    assert.ok(html.includes('appData.resetTitleBlockInfo()'), 'Có nút đặt lại mặc định');

    // 2. Kiểm tra bảng điều khiển trong #modalCadExportConfig (MiniCAD)
    assert.ok(html.includes('id="modalCadExportConfig"'), 'Phải có Modal #modalCadExportConfig');
    assert.ok(html.includes('id="exportTitleRowsBox"') && html.includes('id="cadTitleRowsBox"'), 'Hai hộp xuất có khung nhập dòng khung tên tùy chỉnh');

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

    // v2.8.54: đơn vị, chủ sử dụng, địa chỉ, số tờ/thửa, mã hồ sơ, người kiểm tra → dòng khung tên tùy chỉnh
    assert.ok(appJs.includes('titleRows: appTitleRows.forMeta()'), 'Các bộ xuất nhận các dòng khung tên');

    // Kiểm tra các hàm lưu & reset
    assert.ok(appJs.includes('saveTitleBlockInfo('), 'appData có hàm saveTitleBlockInfo');
    assert.ok(appJs.includes('resetTitleBlockInfo('), 'appData có hàm resetTitleBlockInfo');
});
