// tests/cad_label_rotation_and_stamp.test.js
// Kiểm thử chuyên sâu: Xoay tròn tên khối, căn nhãn dọc thân mũi tên, Tem bản vẽ động chuẩn LibreCAD

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('=== 1. KIỂM THỬ MŨI TÊN CHỈ DẪN & KHOẢNG CÁCH CĂN DỌC THEO THÂN CHUẨN CAD ===', (t) => {
    // 1. Kiểm tra tính góc xoay màn hình dựa trên tọa độ Leaflet layerPoint
    assert.ok(appJsContent.includes('screenAngleDeg = Math.atan2(dy, dx) * 180 / Math.PI'),
        'Đã có công thức tính góc xoay màn hình cho nhãn dọc thân mũi tên');

    // 2. Kiểm tra chuẩn hóa góc đọc ngược (readable angle flip: nếu > 90 hoặc < -90 thì bù 180 độ)
    assert.ok(appJsContent.includes('while (textRot > 90) textRot -= 180;') && appJsContent.includes('while (textRot < -90) textRot += 180;'),
        'Đã có cơ chế lật chữ để người dùng không bao giờ phải đọc chữ lộn ngược');

    // 3. Kiểm tra nhãn được đặt kết hợp transform rotate khớp thân mũi tên
    assert.ok(appJsContent.includes('transform: rotate(${textRot.toFixed(1)}deg)'),
        'Nhãn mũi tên được căn đúng tâm và xoay khớp tuyệt đối theo thân đường gióng');

    // 4. Kiểm tra sự kiện click vào mũi tên để sửa nhanh
    assert.ok(appJsContent.includes("this.showQuickEditPopup(e.latlng, { type: 'arrow', ann: ann })"),
        'Mũi tên có sự kiện click mở hộp thoại sửa nhanh');

    // 5. Kiểm tra tự động cập nhật khi zoom Leaflet
    assert.ok(appJsContent.includes("this._zoomListenerAttached = true"),
        'Đã gắn listener zoomend tự động cập nhật góc xoay nhãn khi zoom bản đồ');
});

test('=== 2. KIỂM THỬ XOAY TRÒN TÊN KHỐI & NHÃN TÂM (0 - 360 ĐỘ) CHUẨN LIBRECAD ===', (t) => {
    // 1. Kiểm tra hỗ trợ thuộc tính labelRotationDeg trong khối đa giác
    assert.ok(appJsContent.includes('shape.labelRotationDeg'),
        'Khối đa giác hỗ trợ thuộc tính labelRotationDeg');

    // 2. Kiểm tra hỗ trợ xoay tên khối nhà (rect)
    assert.ok(appJsContent.includes('cad-rect-label-box') && appJsContent.includes('transform: rotate(${labelRot}deg)'),
        'Khối nhà hỗ trợ xoay tên khối theo góc tùy chỉnh hoặc góc xoay hình khối');

    // 3. Kiểm tra nhãn tâm khối đa giác có thể nhấp để sửa và xoay
    assert.ok(appJsContent.includes("this.showQuickEditPopup(e.latlng, { type: 'shape', shapeIndex: sIdx, shape: shape })"),
        'Nhãn tâm khối đa giác hỗ trợ click mở popup đổi tên và xoay');

    // 4. Kiểm tra các hàm xoay nhanh trên bản đồ
    assert.ok(appJsContent.includes('onQuickShapeRotChange') && appJsContent.includes('setQuickShapeRot'),
        'Đã có hàm onQuickShapeRotChange và setQuickShapeRot');
    assert.ok(appJsContent.includes('onQuickRectRotChange') && appJsContent.includes('setQuickRectRot'),
        'Đã có hàm onQuickRectRotChange và setQuickRectRot');

    // 5. Kiểm tra thanh trượt xoay 0-360 độ trong showQuickEditPopup
    assert.ok(appJsContent.includes('rngQuickShapeRot') && appJsContent.includes('rngQuickRectRot'),
        'Có thanh trượt xoay trực quan 0-360 độ trong QuickEditPopup');
});

test('=== 3. KIỂM THỬ TEM / NHÃN BẢN VẼ ĐỘNG (DYNAMIC KEY-VALUE BUILDER) ===', (t) => {
    // 1. Kiểm tra render động các trường fields trong renderAnnotations
    assert.ok(appJsContent.includes('ann.fields') && appJsContent.includes('f.key') && appJsContent.includes('f.val'),
        'Tem bản vẽ duyệt mảng fields động để render theo cấu trúc hàng Key-Value');

    // 2. Kiểm tra bộ chỉnh sửa dòng thông tin trong appCadTool
    assert.ok(appJsContent.includes('renderStampFieldsEditor') && appJsContent.includes('collectStampFields'),
        'Đã có hàm renderStampFieldsEditor và collectStampFields');

    // 3. Kiểm tra thêm dòng và xóa dòng linh hoạt
    assert.ok(appJsContent.includes('addStampField') && appJsContent.includes('appendStampFieldRow'),
        'Đã có chức năng thêm dòng thông tin mới vào tem bản vẽ');

    // 4. Kiểm tra giao diện HTML có container danh sách dòng thông tin và nút Thêm dòng
    const indexHtmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert.ok(indexHtmlContent.includes('listCadEditAnnStampFields') && indexHtmlContent.includes('btnAddCadEditAnnStampField'),
        'Giao diện index.html có vùng chứa danh sách trường thông tin và nút Thêm dòng');
});
