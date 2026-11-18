/**
 * Test Suite: Khổ giấy lớn (A0, A1, A2) và Tỉ lệ bản đồ tùy chỉnh / nhập tay
 * Chống tràn bộ nhớ Canvas, xuất bản vẽ quy hoạch & đánh giá diện rộng
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// 1. Kiểm tra cấu trúc HTML trong index.html
test('1. Kiểm tra tùy chọn Khổ giấy lớn và Nhập tay tỉ lệ trong index.html', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

    // MiniCAD: Khổ giấy lớn A0, A1, A2
    assert.ok(html.includes('value="A0"'), 'MiniCAD phải có khổ A0');
    assert.ok(html.includes('value="A0-P"'), 'MiniCAD phải có khổ A0-P');
    assert.ok(html.includes('value="A1"'), 'MiniCAD phải có khổ A1');
    assert.ok(html.includes('value="A1-P"'), 'MiniCAD phải có khổ A1-P');
    assert.ok(html.includes('value="A2"'), 'MiniCAD phải có khổ A2');
    assert.ok(html.includes('value="A2-P"'), 'MiniCAD phải có khổ A2-P');

    // MiniCAD: Tỉ lệ bản đồ lớn & Nhập tay
    assert.ok(html.includes('id="cadExportScale"'), 'Phải có dropdown cadExportScale');
    assert.ok(html.includes('value="25000"'), 'Phải có nấc tỉ lệ 1:25.000');
    assert.ok(html.includes('value="50000"'), 'Phải có nấc tỉ lệ 1:50.000');
    assert.ok(html.includes('value="100000"'), 'Phải có nấc tỉ lệ 1:100.000');
    assert.ok(html.includes('value="custom"'), 'Phải có tùy chọn custom scale');
    assert.ok(html.includes('id="cadExportCustomScaleWrap"'), 'Phải có wrapper cadExportCustomScaleWrap');
    assert.ok(html.includes('id="cadExportCustomScaleInput"'), 'Phải có ô nhập số cadExportCustomScaleInput');

    // Bản đồ Dự án / Sổ đo: Khổ giấy lớn A0-L, A1-L, A2-L
    assert.ok(html.includes('value="A0-L"'), 'Dự án phải có khổ A0-L');
    assert.ok(html.includes('value="A0-P"'), 'Dự án phải có khổ A0-P');
    assert.ok(html.includes('value="A1-L"'), 'Dự án phải có khổ A1-L');
    assert.ok(html.includes('value="A1-P"'), 'Dự án phải có khổ A1-P');
    assert.ok(html.includes('value="A2-L"'), 'Dự án phải có khổ A2-L');
    assert.ok(html.includes('value="A2-P"'), 'Dự án phải có khổ A2-P');

    // Bản đồ Dự án: Tùy chỉnh tỉ lệ
    assert.ok(html.includes('id="selExportCustomScaleWrap"'), 'Phải có wrapper selExportCustomScaleWrap');
    assert.ok(html.includes('id="selExportCustomScaleInput"'), 'Phải có ô nhập selExportCustomScaleInput');
});

// 2. Kiểm tra logic xử lý trong app.js
test('2. Kiểm tra tính toán tỉ lệ và kích thước khổ giấy trong app.js', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

    // Kiểm tra bảng kích thước giấy A0, A1, A2
    assert.ok(appJs.includes("'A0':   { w: 1189, h: 841"), 'Bảng kích thước phải có A0 (1189x841)');
    assert.ok(appJs.includes("'A0-P': { w: 841, h: 1189"), 'Bảng kích thước phải có A0-P (841x1189)');
    assert.ok(appJs.includes("'A1':   { w: 841, h: 594"), 'Bảng kích thước phải có A1 (841x594)');
    assert.ok(appJs.includes("'A2':   { w: 594, h: 420"), 'Bảng kích thước phải có A2 (594x420)');

    // Kiểm tra tính toán bước lưới cho tỉ lệ lớn
    assert.ok(appJs.includes('scaleVal >= 50000) gridInterval = 5000'), 'Tỉ lệ >= 50.000 bước lưới phải là 5000m');
    assert.ok(appJs.includes('scaleVal >= 25000) gridInterval = 2500'), 'Tỉ lệ >= 25.000 bước lưới phải là 2500m');
    assert.ok(appJs.includes('scaleVal >= 10000) gridInterval = 1000'), 'Tỉ lệ >= 10.000 bước lưới phải là 1000m');

    // Kiểm tra điều chỉnh pxPerMm chống tràn bộ nhớ Canvas
    assert.ok(appJs.includes('maxPaperMm >= 1100) pxPerMm = 3.5'), 'Khổ A0 (>=1100mm) phải dùng 3.5 px/mm');
    assert.ok(appJs.includes('maxPaperMm >= 800) pxPerMm = 4.5'), 'Khổ A1 (>=800mm) phải dùng 4.5 px/mm');
    assert.ok(appJs.includes('maxPaperMm >= 550) pxPerMm = 6.0'), 'Khổ A2 (>=550mm) phải dùng 6.0 px/mm');

    // Kiểm tra jsPDF truyền mảng kích thước mm tự do
    assert.ok(appJs.includes('format: [meta.paperW, meta.paperH]'), 'jsPDF phải nhận khổ giấy tự do [paperW, paperH]');
});

// 3. Giả lập tính toán bố cục khổ giấy và tỉ lệ nhập tay
test('3. Giả lập tính toán bố cục MiniCAD và Sổ đo', () => {
    // Mock dữ liệu
    const paperDimensions = {
        'A0':   { w: 1189, h: 841, label: 'A0 (Ngang)' },
        'A0-P': { w: 841, h: 1189, label: 'A0 (Đứng)' },
        'A1':   { w: 841, h: 594, label: 'A1 (Ngang)' },
        'A1-P': { w: 594, h: 841, label: 'A1 (Đứng)' },
        'A2':   { w: 594, h: 420, label: 'A2 (Ngang)' },
        'A2-P': { w: 420, h: 594, label: 'A2 (Đứng)' },
        'A3':   { w: 420, h: 297, label: 'A3 (Ngang)' },
        'A4':   { w: 297, h: 210, label: 'A4 (Ngang)' }
    };

    // Kiểm tra A0
    const a0 = paperDimensions['A0'];
    assert.strictEqual(a0.w, 1189);
    assert.strictEqual(a0.h, 841);

    // Bố cục khung tên A0: chiều rộng panel
    const maxPaperDimA0 = Math.max(a0.w, a0.h);
    const W_panel_mm_A0 = (maxPaperDimA0 >= 841) ? 90.0 : ((maxPaperDimA0 >= 420) ? 75.0 : 60.0);
    assert.strictEqual(W_panel_mm_A0, 90.0, 'Khổ A0 panel phải là 90mm');

    // Bố cục khung tên A3: chiều rộng panel
    const a3 = paperDimensions['A3'];
    const maxPaperDimA3 = Math.max(a3.w, a3.h);
    const W_panel_mm_A3 = (maxPaperDimA3 >= 841) ? 90.0 : ((maxPaperDimA3 >= 420) ? 75.0 : 60.0);
    assert.strictEqual(W_panel_mm_A3, 75.0, 'Khổ A3 panel phải là 75mm');

    // Tỉ lệ nhập tay 1:25.000: kiểm tra bước lưới
    const customScale = 25000;
    let gridInterval = 50;
    if (customScale >= 50000) gridInterval = 5000;
    else if (customScale >= 25000) gridInterval = 2500;
    else if (customScale >= 10000) gridInterval = 1000;
    assert.strictEqual(gridInterval, 2500, 'Tỉ lệ 1:25.000 bước lưới phải là 2500m (2.5 km)');

    // Tỉ lệ lớn 1:50.000: kiểm tra bước lưới
    const scale50k = 50000;
    let gridInterval50k = 50;
    if (scale50k >= 50000) gridInterval50k = 5000;
    assert.strictEqual(gridInterval50k, 5000, 'Tỉ lệ 1:50.000 bước lưới phải là 5000m (5 km)');
});
