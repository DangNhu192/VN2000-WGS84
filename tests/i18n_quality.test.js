// WP-N: chất lượng ngôn ngữ — bản dịch tiếng Anh không còn dạng "tiếng Việt bỏ dấu", nhãn tiếng Việt viết hoa đầu câu.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function loadI18n() {
    const a = appJs.indexOf('const appI18n = {');
    const b = appJs.indexOf('\n};', a) + 3;
    const ctx = {};
    vm.runInNewContext(appJs.slice(a, b).replace('const appI18n =', 'this.T ='), ctx);
    ctx.T.currentLang = 'en';
    return ctx.T;
}

test('English translations of common labels are real English', () => {
    const T = loadI18n();
    const cases = {
        '📋 Đã sao chép vào bộ nhớ tạm!': '📋 Copied to clipboard!',
        'Không tự động hiện lại chức năng này': "Don't show this automatically again",
        '💾 Lưu các điểm đã chuyển đổi vào dự án': '💾 Save converted points to project',
        '1.2 Chuyển đổi hàng loạt & nhập file': '1.2 Batch conversion & file import',
        '2.2 Cắm mốc thực địa (Radar Stakeout)': '2.2 Field stakeout (Radar Stakeout)',
        'TRANG CHỦ (BẢNG ĐIỀU KHIỂN)': 'HOME (DASHBOARD)',
        '⚠️ Vui lòng chọn mốc trước!': '⚠️ Choose a point first!'
    };
    for (const [vi, en] of Object.entries(cases)) assert.strictEqual(T.translateString(vi), en, vi);
});

test('lookup ignores letter case so sentence-case Vietnamese still finds the English entry', () => {
    const T = loadI18n();
    assert.strictEqual(T.translateString('Chuyển đổi tọa độ'), T.translateString('Chuyển Đổi Tọa Độ'));
    assert.ok(!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(T.translateString('Chuyển đổi tọa độ')));
});

test('no garbled half-Vietnamese values remain in the phrase table', () => {
    const T = loadI18n();
    const bad = /\b(andO|tat ca|da select|not yet co|paste text nhanh|save the diem|Bam nut|Tu dong|Chon tinh)\b/i;
    const hits = Object.entries(T.phraseMap).filter(([, v]) => bad.test(String(v)));
    assert.deepStrictEqual(hits.map(h => h[0]).slice(0, 5), [], 'không còn bản dịch kiểu "save andO project DA select"');
});

test('Vietnamese navigation labels use sentence case, proper nouns kept', () => {
    assert.ok(appJs.includes("const homeLabel = isEn ? 'Home' : 'Trang chủ';"));
    assert.ok(appJs.includes("dock: 'Chuyển đổi'") && appJs.includes("dock: 'Cắm mốc'"));
    assert.ok(html.includes('📍 Chuyển đổi đơn điểm'), 'tab Chuyển đổi viết hoa đầu câu');
    assert.ok(!html.includes('Chuyển Đổi Đơn Điểm'));
    assert.ok(/Sổ Đo Tọa\s+Độ/.test(html), 'tên tab Google Sheet "Sổ Đo Tọa Độ" (Apps Script dùng) giữ nguyên');
    assert.ok(/Bộ Tài nguyên và Môi trường/.test(html), 'tên cơ quan giữ nguyên');
    assert.ok(!/δh/.test(html), 'ký hiệu Δh không bị đổi thành chữ thường');
});
