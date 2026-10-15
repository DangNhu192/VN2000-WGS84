const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { parseKttString, COMMON_KTT_PRESETS } = require('../geodesy.js');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('=== 1. KIỂM THỬ HÀM PARSER KTT LINH HOẠT (ĐỘ PHÚT ⇄ THẬP PHÂN) ===', () => {
    // 1.1 Dạng Độ - Phút chuẩn (105°45')
    const r1 = parseKttString("105°45'");
    assert(r1 && r1.isValid, "Phải parse được 105°45'");
    assert.strictEqual(r1.deg, 105);
    assert.strictEqual(r1.min, 45);
    assert.strictEqual(r1.decimal, 105.75);

    // 1.2 Dạng gõ chữ O thay cho ký hiệu độ (105O45 hoặc 105o45)
    const r2 = parseKttString("105O45'");
    assert(r2 && r2.isValid, "Phải parse được 105O45'");
    assert.strictEqual(r2.deg, 105);
    assert.strictEqual(r2.min, 45);
    assert.strictEqual(r2.decimal, 105.75);

    const r2b = parseKttString("105o45");
    assert(r2b && r2b.isValid, "Phải parse được 105o45");
    assert.strictEqual(r2b.decimal, 105.75);

    // 1.3 Dạng chữ d (105d45)
    const r3 = parseKttString("105d45");
    assert(r3 && r3.isValid, "Phải parse được 105d45");
    assert.strictEqual(r3.decimal, 105.75);

    // 1.4 Dạng số thập phân dấu chấm (105.75)
    const r4 = parseKttString("105.75");
    assert(r4 && r4.isValid, "Phải parse được 105.75");
    assert.strictEqual(r4.deg, 105);
    assert.strictEqual(r4.min, 45);
    assert.strictEqual(r4.decimal, 105.75);

    // 1.5 Dạng số thập phân dấu phẩy Việt Nam (105,75)
    const r5 = parseKttString("105,75");
    assert(r5 && r5.isValid, "Phải parse được 105,75");
    assert.strictEqual(r5.deg, 105);
    assert.strictEqual(r5.min, 45);
    assert.strictEqual(r5.decimal, 105.75);

    // 1.6 Dạng cách nhau dấu khoảng trắng hoặc gạch nối (105 30, 108-30)
    const r6 = parseKttString("105 30");
    assert(r6 && r6.isValid, "Phải parse được 105 30");
    assert.strictEqual(r6.deg, 105);
    assert.strictEqual(r6.min, 30);
    assert.strictEqual(r6.decimal, 105.5);

    const r7 = parseKttString("108-30");
    assert(r7 && r7.isValid, "Phải parse được 108-30");
    assert.strictEqual(r7.deg, 108);
    assert.strictEqual(r7.min, 30);
    assert.strictEqual(r7.decimal, 108.5);

    // 1.7 Giá trị không hợp lệ
    assert.strictEqual(parseKttString(""), null);
    assert.strictEqual(parseKttString("abc"), null);
    assert.strictEqual(parseKttString("50.0"), null, "KTT ngoài lãnh thổ Việt Nam phải bị từ chối");
    assert.strictEqual(parseKttString("150.0"), null, "KTT ngoài lãnh thổ Việt Nam phải bị từ chối");
});

test('=== 2. KIỂM THỬ DANH SÁCH MỐC KTT PHỔ BIẾN VIỆT NAM (COMMON_KTT_PRESETS) ===', () => {
    assert(Array.isArray(COMMON_KTT_PRESETS), "COMMON_KTT_PRESETS phải là mảng");
    assert(COMMON_KTT_PRESETS.length >= 8, "Phải có ít nhất 8 mốc KTT phổ biến");

    // Kiểm tra mốc TP.HCM
    const hcm = COMMON_KTT_PRESETS.find(p => p.deg === 105 && p.min === 45);
    assert(hcm, "Phải có mốc 105°45'");
    assert.strictEqual(hcm.decimal, 105.75);
    assert(hcm.provinces.includes("TP.HCM"), "Mốc 105°45' phải gắn với TP.HCM");

    // Kiểm tra mốc Đà Nẵng
    const dna = COMMON_KTT_PRESETS.find(p => p.deg === 108 && p.min === 30);
    assert(dna, "Phải có mốc 108°30'");
    assert.strictEqual(dna.decimal, 108.5);
});

test('=== 3. KIỂM THỬ GIAO DIỆN GHI CHÚ VÀ HƯỚNG DẪN QUY ĐỔI KTT (INDEX.HTML & APP.JS) ===', () => {
    // 3.1 Thẻ ghi chú và Live Preview trong modal cài đặt KTT (đã tinh gọn loại bỏ chips thừa)
    assert(indexHtml.includes('id="boxModalKttPreview"'), "Phải có boxModalKttPreview xem trước KTT");
    assert(indexHtml.includes('id="lblModalKttPreviewText"'), "Phải có lblModalKttPreviewText hiển thị quy đổi");
    assert(indexHtml.includes('id="txtModalKttQuick"'), "Phải có ô nhập nhanh txtModalKttQuick");
    assert(indexHtml.includes("105°45'"), "Phải có ví dụ 105°45'");
    assert(indexHtml.includes("105.75°"), "Phải có ví dụ 105.75°");

    // 3.2 Chip hiển thị quy đổi trên màn hình Chuyển đổi tọa độ
    assert(indexHtml.includes('id="lblTransformKttPreview"'), "Phải có lblTransformKttPreview trên màn hình chuyển đổi");
    assert(indexHtml.includes('id="tfKttDmsText"'), "Phải có tfKttDmsText");
    assert(indexHtml.includes('id="tfKttDecText"'), "Phải có tfKttDecText");

    // 3.3 Các phương thức trong app.js
    assert(appJs.includes('renderKttGuideAndPresets()'), "appModal phải có hàm renderKttGuideAndPresets");
    assert(appJs.includes('onQuickKttInput(val)'), "appModal phải có hàm onQuickKttInput");
    assert(appJs.includes('updateKttPreview('), "appModal phải có hàm updateKttPreview");
    assert(appJs.includes('setKttFromPreset('), "appModal phải có hàm setKttFromPreset");
});
