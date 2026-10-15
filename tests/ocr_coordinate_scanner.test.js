/**
 * KIỂM THỬ TÍNH NĂNG QUÉT ẢNH TỌA ĐỘ OCR & NHẬN DẠNG KTT / MÚI CHIẾU
 * Đáp ứng yêu cầu:
 * 1. Nhận dạng ảnh chụp màn hình (Sổ đỏ, bản vẽ AutoCAD, Excel, Zalo)
 * 2. Tự động bóc tách Kinh tuyến trục (KTT) và Múi chiếu (3° hoặc 6°)
 * 3. Bóc tách danh sách điểm mốc tọa độ (STT, Tên, X, Y)
 * 4. Dual-Pane modal đối soát trực quan trước khi nạp vào bảng chuyển đổi đa điểm
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock window and document for Node.js test environment
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {}
    }
};
global.document = {
    getElementById: (id) => null,
    addEventListener: () => {},
    body: { classList: { add: () => {}, remove: () => {} } }
};
global.localStorage = global.window.localStorage;

const { appOcr, AppState, appTransform } = require(path.join(ROOT_DIR, 'app.js'));

test('=== 1. KIỂM THỬ CẤU TRÚC GIAO DIỆN & MODAL OCR TRONG INDEX.HTML ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1.1 Nút Quét ảnh OCR trên thanh công cụ chuyển đổi đa điểm
    assert.ok(html.includes('appOcr.openOcrModal()'), 'Có nút mở modal OCR appOcr.openOcrModal()');
    assert.ok(html.includes('id="fileOcrImageInput"'), 'Có input file ẩn để chọn ảnh');

    // 1.2 Modal đối soát trực quan Dual-Pane
    assert.ok(html.includes('id="modalOcrCoordReview"'), 'Có modal modalOcrCoordReview');
    assert.ok(html.includes('id="boxOcrDetectedKtt"'), 'Có hộp thông báo phát hiện KTT');
    assert.ok(html.includes('id="lblOcrDetectedKttDesc"'), 'Có nhãn hiển thị thông tin KTT và Múi chiếu');
    assert.ok(html.includes('appOcr.applyDetectedKtt()'), 'Có nút áp dụng KTT vào hệ thống');

    // 1.3 Pane ảnh gốc
    assert.ok(html.includes('id="ocrPreviewImg"'), 'Có thẻ img xem trước ảnh gốc');
    assert.ok(html.includes('id="ocrEmptyPlaceholder"'), 'Có placeholder kéo thả / dán ảnh');
    assert.ok(html.includes('appOcr.zoomImage'), 'Có công cụ zoom ảnh');
    assert.ok(html.includes('appOcr.rotateImage'), 'Có công cụ xoay ảnh');
    assert.ok(html.includes('appOcr.toggleBinarize'), 'Có công cụ lọc nét tăng tương phản');

    // 1.4 Pane bảng số liệu đối soát
    assert.ok(html.includes('id="tblOcrPoints"'), 'Có bảng đối soát tblOcrPoints');
    assert.ok(html.includes('id="tblOcrPointsBody"'), 'Có tbody bảng tblOcrPointsBody');
    assert.ok(html.includes('id="btnConfirmOcrPoints"'), 'Có nút xác nhận nạp điểm vào chuyển đổi');
});

test('=== 2. KIỂM THỬ ĐỊNH KIỂU CSS CHO DUAL-PANE OCR (STYLE.CSS) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('.modal-ocr-box'), 'Có style cho .modal-ocr-box');
    assert.ok(css.includes('.ocr-dual-pane-container'), 'Có bố cục 2 cột cho .ocr-dual-pane-container');
    assert.ok(css.includes('.ocr-image-viewport'), 'Có khung cuộn ảnh .ocr-image-viewport');
    assert.ok(css.includes('.ocr-edit-cell'), 'Có style ô sửa trực tiếp .ocr-edit-cell');
    assert.ok(css.includes('.ocr-empty-dropzone'), 'Có khung kéo thả ảnh .ocr-empty-dropzone');
});

test('=== 3. KIỂM THỬ BÓC TÁCH KINH TUYẾN TRỤC & MÚI CHIẾU TỪ VĂN BẢN OCR ===', () => {
    // 3.1 Dạng KTT 105°45' Múi 3° (chuẩn miền Tây / TP.HCM)
    const textSample1 = `
        BẢNG TỌA ĐỘ GÓC RANH
        Hệ quy chiếu: VN-2000
        KTT: 105°45' - Múi chiếu: 3°
        Tỉnh: Đồng Tháp
        1   M1   1144058.623   539624.571
        2   M2   1144080.150   539650.220
    `;
    const res1 = appOcr.parseOcrText(textSample1);
    assert.ok(res1.detectedKtt, 'Phát hiện được KTT từ văn bản mẫu 1');
    assert.strictEqual(res1.detectedKtt.deg, 105);
    assert.strictEqual(res1.detectedKtt.min, 45);
    assert.strictEqual(res1.detectedKtt.val, 105.75);
    assert.strictEqual(res1.detectedKtt.mui, 3);
    assert.strictEqual(res1.points.length, 2);
    assert.strictEqual(res1.points[0].name, 'M1');
    assert.strictEqual(res1.points[0].c1, '1144058.623');
    assert.strictEqual(res1.points[0].c2, '539624.571');

    // 3.2 Dạng Kinh tuyến trục 106°00' Múi 6°
    const textSample2 = `
        BẢN VẼ HIỆN TRẠNG VỊ TRÍ
        Kinh tuyến trục: 106 00' - Múi 6
        Đ1  1185420.12  580123.45
        Đ2  1185450.34  580190.67
        Đ3  1185410.90  580210.15
    `;
    const res2 = appOcr.parseOcrText(textSample2);
    assert.ok(res2.detectedKtt, 'Phát hiện được KTT từ văn bản mẫu 2');
    assert.strictEqual(res2.detectedKtt.deg, 106);
    assert.strictEqual(res2.detectedKtt.min, 0);
    assert.strictEqual(res2.detectedKtt.mui, 6);
    assert.strictEqual(res2.points.length, 3);
    assert.strictEqual(res2.points[0].name, 'Đ1');
    assert.strictEqual(res2.points[1].name, 'Đ2');
    assert.strictEqual(res2.points[2].name, 'Đ3');
});

test('=== 4. KIỂM THỬ LÀM SẠCH KÝ TỰ NHIỄU OCR & CHUẨN HÓA DẤU PHẨY SỐ HỌC ===', () => {
    // Sửa chữ O nhầm thành số 0, chữ l/I nhầm thành số 1
    assert.strictEqual(appOcr.cleanNumStr('1144O58.62'), '1144058.62', 'Sửa chữ O thành 0');
    assert.strictEqual(appOcr.cleanNumStr('539624.57l'), '539624.571', 'Sửa chữ l thành 1');
    assert.strictEqual(appOcr.cleanNumStr('539624.57I'), '539624.571', 'Sửa chữ I thành 1');

    // Xử lý dấu phẩy thập phân và phân cách hàng nghìn
    assert.strictEqual(appOcr.cleanNumStr('1.144.058,623'), '1144058.623', 'Chuẩn hóa số có chấm phân cách nghìn và phẩy thập phân');
    assert.strictEqual(appOcr.cleanNumStr('539624,571'), '539624.571', 'Chuẩn hóa dấu phẩy thập phân Việt Nam');

    // Bóc tách bảng tọa độ từ ảnh có lỗi ký tự OCR
    const noisyText = `
        STT  Điểm    X(m)           Y(m)
        1    1       1.144.O58,62   539.624,57
        2    2       1.144.O8O,15   539.65O,22
    `;
    const res = appOcr.parseOcrText(noisyText);
    assert.strictEqual(res.points.length, 2, 'Nhận diện đủ 2 điểm dù có nhiễu OCR');
    assert.strictEqual(res.points[0].c1, '1144058.62');
    assert.strictEqual(res.points[0].c2, '539624.57');
    assert.strictEqual(res.points[1].c1, '1144080.15');
    assert.strictEqual(res.points[1].c2, '539650.22');
});

test('=== 5. KIỂM THỬ TÍCH HỢP NẠP ĐIỂM VÀO BẢNG CHUYỂN ĐỔI ĐA ĐIỂM ===', () => {
    // Reset multiPoints cho kiểm thử
    appTransform.multiPoints = [];

    // Áp dụng KTT đã phát hiện
    appOcr.detectedKtt = { deg: 107, min: 45, val: 107.75, mui: 3, raw: "107°45'" };
    appOcr.applyDetectedKtt();
    assert.strictEqual(AppState.kttDeg, 107, 'Cập nhật độ KTT thành công');
    assert.strictEqual(AppState.kttMin, 45, 'Cập nhật phút KTT thành công');
    assert.strictEqual(AppState.kttVal, 107.75, 'Cập nhật giá trị thập phân KTT thành công');

    // Nạp danh sách điểm đã đối soát vào appTransform
    appOcr.ocrPoints = [
        { name: 'M1', c1: '1144058.623', c2: '539624.571' },
        { name: 'M2', c1: '1144080.150', c2: '539650.220' }
    ];
    appOcr.confirmPointsToTransform();
    assert.strictEqual(appTransform.multiPoints.length, 2, 'Đã nạp 2 điểm vào appTransform.multiPoints');
    assert.strictEqual(appTransform.multiPoints[0].name, 'M1');
    assert.strictEqual(appTransform.multiPoints[0].x, '1144058.623');
    assert.strictEqual(appTransform.multiPoints[0].y, '539624.571');
});
