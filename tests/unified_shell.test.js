// Vỏ giao diện thống nhất: tên màn hình gọn, bảng Tất cả chức năng dựng từ menu ☰, lớp CSS thống nhất nạp sau cùng.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../app-shell.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('tên màn hình: bỏ biểu tượng và số thứ tự, chữ thường có dấu', () => {
    assert.equal(S.cleanTitle('🗺️ 2. BẢN ĐỒ DỰ ÁN & MỐC', false), 'Bản đồ dự án & Mốc');
    assert.equal(S.cleanTitle('📐 3.5 VẼ MẶT BẰNG & BẢNG KÊ MINICAD', false), 'MiniCAD');
    assert.equal(S.cleanTitle('3. CẮM MỐC THỰC ĐỊA', true), 'Stakeout');
    assert.equal(S.stripNo('2.6 Tối ưu lộ trình & Chỉ đường'), 'Tối ưu lộ trình & Chỉ đường');
    assert.equal(S.fold('Đổi KTT'), 'doi ktt');
});

test('mọi tiêu đề màn hình trong app.js đều có tên gọn tương ứng', () => {
    const titles = [...app.matchAll(/titleText = "([^"]+)"/g), ...app.matchAll(/syncHeader\('([^']+)'/g)].map(m => m[1]);
    assert.ok(titles.length >= 15);
    for (const t of titles) {
        if (t === 'WGS-84 ⇄ VN-2000') continue;
        const key = t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+(\.\d+)?\.?\s+/, '').trim().toUpperCase();
        assert.ok(S.TITLES[key], `Thiếu tên gọn cho "${t}"`);
    }
});

test('thanh ngữ cảnh + bảng Tất cả chức năng có trong trang; Công cụ khác cũ được thay', () => {
    assert.ok(html.includes('id="appContextBar"') && html.includes('id="ctxScreenTitle"') && html.includes('id="ctxProject"'));
    assert.ok(html.includes('id="homeFeatureHub"') && html.includes('id="txtHubSearch"') && html.includes('id="homeFeatureHubList"'));
    assert.ok(app.includes("document.dispatchEvent(new CustomEvent('vn2000:screenchange', { detail }))"));
    const css = fs.readFileSync(path.join(root, 'ui-unified.css'), 'utf8');
    assert.ok(css.includes('.accordion-advanced-wrapper { display: none !important; }'));
    assert.ok(css.includes('body.field-mode .hub-tile'), 'Có kiểu tương phản cao cho chế độ Thực địa');
});

test('ui-unified.css nạp SAU ui-polish.css; script & css được precache', () => {
    assert.ok(html.indexOf('href="ui-unified.css') > html.indexOf('href="ui-polish.css'));
    assert.ok(html.includes('src="app-shell.js'));
    assert.ok(sw.includes("'./app-shell.js'") && sw.includes("'./ui-unified.css'"));
});

test('bộ dịch: không ghi lại chuỗi không đổi (tránh vòng lặp MutationObserver làm treo khi đổi ngôn ngữ)', () => {
    assert.ok(app.includes('if (translated !== node.nodeValue) node.nodeValue = translated;'));
});
