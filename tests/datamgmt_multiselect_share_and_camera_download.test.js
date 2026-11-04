/**
 * KIỂM THỬ TÍNH NĂNG MỚI:
 * 1. QUẢN LÝ DỮ LIỆU & SỔ ĐO: TÍCH CHỌN NHIỀU MỐC, CHIA SẺ (ZALO/SMS/FILE), XUẤT CHỌN LỌC & XÓA HÀNG LOẠT
 * 2. CAMERA ĐÓNG DẤU: TẢI ẢNH ĐÓNG DẤU BLOB AN TOÀN, NÚT CHIA SẺ ẢNH NHANH (ZALO/THIẾT BỊ)
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');
const uiPolishCss = fs.readFileSync(path.join(ROOT_DIR, 'ui-polish.css'), 'utf8');

test('=== 1. KIỂM THỬ GIAO DIỆN HTML (INDEX.HTML) CHO CHỌN NHIỀU MỐC & CHIA SẺ ===', () => {
    // 1.1 Checkbox chọn tất cả trên header bảng mốc
    assert.ok(
        indexHtml.includes('id="chkSelectAllPoints"'),
        'Bảng mốc phải có checkbox #chkSelectAllPoints trên header'
    );
    assert.ok(
        indexHtml.includes('appData.toggleSelectAllPoints(this.checked)'),
        'Checkbox #chkSelectAllPoints phải gắn sự kiện appData.toggleSelectAllPoints'
    );

    // 1.2 Nút chia sẻ trên thanh card-tools của Danh sách mốc
    assert.ok(
        indexHtml.includes('id="btnSharePointsSummary"'),
        'Phải có nút #btnSharePointsSummary'
    );
    assert.ok(
        indexHtml.includes('appData.shareSelectedPoints()'),
        'Nút chia sẻ phải gọi appData.shareSelectedPoints()'
    );

    // 1.3 Thanh tác vụ chọn nhiều mốc (Batch Actions Bar)
    assert.ok(
        indexHtml.includes('id="barBatchPointsActions"'),
        'Phải có thanh tác vụ #barBatchPointsActions'
    );
    assert.ok(
        indexHtml.includes('id="txtSelectedPointsCount"'),
        'Phải có phần tử hiển thị số lượng mốc đang chọn #txtSelectedPointsCount'
    );
    assert.ok(
        indexHtml.includes('appData.clearPointsSelection()'),
        'Phải có nút bỏ chọn gọi appData.clearPointsSelection()'
    );
    assert.ok(
        indexHtml.includes('appData.exportSelectedPoints()'),
        'Phải có nút xuất đã chọn gọi appData.exportSelectedPoints()'
    );
    assert.ok(
        indexHtml.includes('appData.copySelectedPointsText()'),
        'Phải có nút chép text gọi appData.copySelectedPointsText()'
    );
    assert.ok(
        indexHtml.includes('appData.deleteSelectedPoints()'),
        'Phải có nút xóa đã chọn gọi appData.deleteSelectedPoints()'
    );

    // 1.4 Nút chia sẻ ảnh trong modal xem chi tiết ảnh Camera (modalCameraMediaViewer)
    assert.ok(
        indexHtml.includes('id="btnCameraViewerShare"'),
        'Phải có nút #btnCameraViewerShare trong modalCameraMediaViewer'
    );
    assert.ok(
        indexHtml.includes('appCamera.shareCurrentViewerMedia()'),
        'Nút chia sẻ ảnh phải gọi appCamera.shareCurrentViewerMedia()'
    );
});

test('=== 2. KIỂM THỬ LOGIC APPDATA: CHỌN NHIỀU, CHIA SẺ & XUẤT CHỌN LỌC ===', () => {
    // 2.1 Quản lý tập hợp mốc được tích chọn
    assert.ok(
        appJs.includes('selectedPointIds: new Set()'),
        'appData phải khởi tạo selectedPointIds là Set'
    );
    assert.ok(
        appJs.includes('toggleSelectAllPoints(checked)'),
        'appData phải có hàm toggleSelectAllPoints'
    );
    assert.ok(
        appJs.includes('onPointCheckboxChange(id, checked)'),
        'appData phải có hàm onPointCheckboxChange'
    );
    assert.ok(
        appJs.includes('clearPointsSelection()'),
        'appData phải có hàm clearPointsSelection'
    );
    assert.ok(
        appJs.includes('updateBatchActionsBar()'),
        'appData phải có hàm updateBatchActionsBar'
    );

    // 2.2 Các hàm xử lý nghiệp vụ mốc đã chọn
    assert.ok(
        appJs.includes('getSelectedPoints()'),
        'appData phải có hàm getSelectedPoints'
    );
    assert.ok(
        appJs.includes('formatPointsToText(points)'),
        'appData phải có hàm formatPointsToText'
    );
    assert.ok(
        appJs.includes('shareSelectedPoints()'),
        'appData phải có hàm shareSelectedPoints'
    );
    assert.ok(
        appJs.includes('copySelectedPointsText('),
        'appData phải có hàm copySelectedPointsText'
    );
    assert.ok(
        appJs.includes('deleteSelectedPoints()'),
        'appData phải có hàm deleteSelectedPoints'
    );
    assert.ok(
        appJs.includes('exportSelectedPoints()'),
        'appData phải có hàm exportSelectedPoints'
    );

    // 2.3 getExportPoints hỗ trợ _customExportPoints
    assert.ok(
        appJs.includes('if (this._customExportPoints && Array.isArray(this._customExportPoints)'),
        'getExportPoints phải ưu tiên trả về _customExportPoints khi có xuất chọn lọc'
    );
    assert.ok(
        appJs.includes('this._customExportPoints = null;'),
        'closeExportModal phải dọn dẹp _customExportPoints'
    );

    // 2.4 refreshTable có tạo checkbox cho từng dòng mốc
    assert.ok(
        appJs.includes('class="chk-point-item"'),
        'refreshTable phải sinh checkbox class="chk-point-item" cho mỗi mốc'
    );
    assert.ok(
        appJs.includes('appData.onPointCheckboxChange'),
        'Mỗi checkbox dòng mốc phải gọi appData.onPointCheckboxChange'
    );
});

test('=== 3. KIỂM THỬ LOGIC APPCAMERA: TẢI ẢNH BLOB AN TOÀN & CHIA SẺ ẢNH ===', () => {
    // 3.1 Hàm chuyển đổi dataUrl sang Blob
    assert.ok(
        appJs.includes('dataUrlToBlob(dataUrl)'),
        'appCamera phải có hàm dataUrlToBlob'
    );

    // 3.2 downloadSingleMedia sử dụng Blob URL để tránh lỗi mất dấu trên mobile
    assert.ok(
        appJs.includes('const blob = this.dataUrlToBlob(item.dataUrl);'),
        'downloadSingleMedia phải chuyển item.dataUrl sang Blob'
    );
    assert.ok(
        appJs.includes('URL.createObjectURL(blob)'),
        'downloadSingleMedia phải tạo Blob URL để tải ảnh an toàn'
    );
    assert.ok(
        appJs.includes('URL.revokeObjectURL(blobUrl)'),
        'downloadSingleMedia phải thu hồi bộ nhớ qua revokeObjectURL'
    );

    // 3.3 downloadAllImages cũng dùng Blob URL
    assert.ok(
        appJs.includes('appCamera.dataUrlToBlob(item.dataUrl)'),
        'downloadAllImages phải sử dụng dataUrlToBlob'
    );

    // 3.4 Hàm shareSingleMedia & shareCurrentViewerMedia
    assert.ok(
        appJs.includes('async shareSingleMedia(id)'),
        'appCamera phải có hàm shareSingleMedia'
    );
    assert.ok(
        appJs.includes('shareCurrentViewerMedia()'),
        'appCamera phải có hàm shareCurrentViewerMedia'
    );

    // 3.5 Thẻ thư viện ảnh có nút chia sẻ 📤
    assert.ok(
        appJs.includes('appCamera.shareSingleMedia(${item.id})'),
        'Mỗi thẻ ảnh trong loadGalleryFromDb phải có nút chia sẻ gọi appCamera.shareSingleMedia'
    );
});

test('=== 4. KIỂM THỬ ĐỊNH KIỂU CSS CHO THANH TÁC VỤ VÀ NÚT CHIA SẺ ===', () => {
    assert.ok(
        uiPolishCss.includes('.batch-points-actions-bar'),
        'ui-polish.css phải định nghĩa class .batch-points-actions-bar'
    );
    assert.ok(
        uiPolishCss.includes('.camera-card-btn.btn-share'),
        'ui-polish.css phải định nghĩa hiệu ứng cho nút chia sẻ ảnh .camera-card-btn.btn-share'
    );
});
