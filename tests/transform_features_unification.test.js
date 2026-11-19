const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const rezoneJs = fs.readFileSync(path.join(__dirname, '..', 'vn2000-rezone.js'), 'utf8');

test('=== 1. ĐỒNG BỘ NÚT VÀ HOẠT ĐỘNG PHÂN HỆ ĐƠN ĐIỂM (SINGLE) ===', () => {
    // 1.1 Thanh nút kết quả
    assert.ok(indexHtml.includes('appTransform.viewConvertedOnMap()'), 'Đơn điểm có nút Xem trên bản đồ');
    assert.ok(indexHtml.includes('appTransform.saveConvertedToProject()'), 'Đơn điểm có nút Lưu vào sổ đo');
    assert.ok(indexHtml.includes('appTransform.copyCadResult()'), 'Đơn điểm có chip sao chép tọa độ CAD');
    assert.ok(indexHtml.includes('appTransform.openExportSingleModal()'), 'Đơn điểm có chip Xuất File');

    // 1.2 Modal Đặt tên & Lưu điểm Đơn điểm
    assert.ok(indexHtml.includes('id="modalSingleSavePoints"'), 'Có modal #modalSingleSavePoints');
    assert.ok(indexHtml.includes('id="singleSaveProject"'), 'Có dropdown chọn dự án #singleSaveProject');
    assert.ok(indexHtml.includes('id="singleSaveNewProject"'), 'Có ô nhập dự án mới #singleSaveNewProject');
    assert.ok(indexHtml.includes('id="singleSavePointName"'), 'Có ô nhập tên mốc #singleSavePointName');
    assert.ok(indexHtml.includes('id="singleSavePointNote"'), 'Có ô nhập ghi chú #singleSavePointNote');
    assert.ok(indexHtml.includes('id="singleSavePreviewBody"'), 'Có bảng xem trước thông số #singleSavePreviewBody');
    assert.ok(indexHtml.includes('id="singleConfirmSave"'), 'Có nút xác nhận lưu #singleConfirmSave');

    // 1.3 Hàm xử lý trong app.js
    assert.ok(appJs.includes('openExportSingleModal()'), 'app.js có hàm openExportSingleModal');
    assert.ok(appJs.includes('openSaveSingleModal()'), 'app.js có hàm openSaveSingleModal');
    assert.ok(appJs.includes('closeSaveSingleModal()'), 'app.js có hàm closeSaveSingleModal');
    assert.ok(appJs.includes('onSaveSingleProjectChange('), 'app.js có hàm onSaveSingleProjectChange');
    assert.ok(appJs.includes('confirmSaveSingle()'), 'app.js có hàm confirmSaveSingle');
});

test('=== 2. ĐỒNG BỘ NÚT VÀ HOẠT ĐỘNG PHÂN HỆ NHIỀU ĐIỂM (MULTI) ===', () => {
    // 2.1 Thanh nút kết quả
    assert.ok(indexHtml.includes('appTransform.viewMultiConvertedOnMap()'), 'Đa điểm có nút Xem Bản Đồ');
    assert.ok(indexHtml.includes('appTransform.openSaveMultiModal()'), 'Đa điểm có nút Lưu Điểm mở modal');
    assert.ok(indexHtml.includes('appTransform.copyMultiCadResult()'), 'Đa điểm có nút sao chép CAD');
    assert.ok(indexHtml.includes('appTransform.exportMultiResultCsv()'), 'Đa điểm có nút Xuất CSV');
    assert.ok(indexHtml.includes('appTransform.openExportModal()'), 'Đa điểm có nút Xuất File');

    // 2.2 Modal Đặt tên & Lưu điểm Đa điểm
    assert.ok(indexHtml.includes('id="modalMultiSavePoints"'), 'Có modal #modalMultiSavePoints');
    assert.ok(indexHtml.includes('id="multiSaveProject"'), 'Có dropdown chọn dự án #multiSaveProject');
    assert.ok(indexHtml.includes('id="multiSaveNewProject"'), 'Có ô nhập dự án mới #multiSaveNewProject');
    assert.ok(indexHtml.includes('id="multiSaveNamingStrategy"'), 'Có chọn quy tắc đặt tên #multiSaveNamingStrategy');
    assert.ok(indexHtml.includes('id="multiSavePrefix"'), 'Có ô nhập tiền tố #multiSavePrefix');
    assert.ok(indexHtml.includes('id="multiSaveTableBody"'), 'Có bảng xem trước danh sách mốc #multiSaveTableBody');
    assert.ok(indexHtml.includes('id="multiConfirmSave"'), 'Có nút xác nhận lưu #multiConfirmSave');

    // 2.3 Hàm xử lý trong app.js
    assert.ok(appJs.includes('copyMultiCadResult()'), 'app.js có hàm copyMultiCadResult');
    assert.ok(appJs.includes('openSaveMultiModal()'), 'app.js có hàm openSaveMultiModal');
    assert.ok(appJs.includes('closeSaveMultiModal()'), 'app.js có hàm closeSaveMultiModal');
    assert.ok(appJs.includes('onSaveMultiProjectChange('), 'app.js có hàm onSaveMultiProjectChange');
    assert.ok(appJs.includes('onSaveMultiNamingChange('), 'app.js có hàm onSaveMultiNamingChange');
    assert.ok(appJs.includes('applyMultiNaming()'), 'app.js có hàm applyMultiNaming');
    assert.ok(appJs.includes('confirmSaveMulti()'), 'app.js có hàm confirmSaveMulti');
});

test('=== 3. ĐỒNG BỘ NÚT VÀ HOẠT ĐỘNG PHÂN HỆ ĐỔI KTT / MÚI (REZONE) ===', () => {
    // 3.1 Thanh nút kết quả
    assert.ok(indexHtml.includes('id="rzViewMap"'), 'Đổi KTT có nút Xem Bản Đồ #rzViewMap');
    assert.ok(indexHtml.includes('id="rzSave"'), 'Đổi KTT có nút Lưu Điểm #rzSave');
    assert.ok(indexHtml.includes('id="rzCopy"'), 'Đổi KTT có nút Chép #rzCopy');
    assert.ok(indexHtml.includes('id="rzCopyCad"'), 'Đổi KTT có nút CAD #rzCopyCad');
    assert.ok(indexHtml.includes('id="rzCsv"'), 'Đổi KTT có nút CSV #rzCsv');
    assert.ok(indexHtml.includes('id="rzExport"'), 'Đổi KTT có nút Xuất File #rzExport');

    // 3.2 Modal Đặt tên & Lưu điểm Đổi KTT
    assert.ok(indexHtml.includes('id="modalRzSavePoints"'), 'Có modal #modalRzSavePoints');
    assert.ok(indexHtml.includes('id="rzSaveProject"'), 'Có dropdown chọn dự án #rzSaveProject');
    assert.ok(indexHtml.includes('id="rzSaveNewProject"'), 'Có ô nhập dự án mới #rzSaveNewProject');
    assert.ok(indexHtml.includes('id="rzSaveNamingStrategy"'), 'Có chọn quy tắc đặt tên #rzSaveNamingStrategy');
    assert.ok(indexHtml.includes('id="rzSavePrefix"'), 'Có ô nhập tiền tố #rzSavePrefix');
    assert.ok(indexHtml.includes('id="rzSaveTableBody"'), 'Có bảng xem trước danh sách mốc #rzSaveTableBody');
    assert.ok(indexHtml.includes('id="rzConfirmSave"'), 'Có nút xác nhận lưu #rzConfirmSave');

    // 3.3 Hàm xử lý trong vn2000-rezone.js
    assert.ok(rezoneJs.includes('copyCad'), 'vn2000-rezone.js có hàm copyCad');
    assert.ok(rezoneJs.includes('openExportModal'), 'vn2000-rezone.js có hàm openExportModal');
    assert.ok(rezoneJs.includes('openSaveModal'), 'vn2000-rezone.js có hàm openSaveModal');
    assert.ok(rezoneJs.includes('confirmSave'), 'vn2000-rezone.js có hàm confirmSave');
});
