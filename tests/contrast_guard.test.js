// v2.8.55: chữ / nền đủ tương phản ở mọi giao diện (Tối, Sáng, Thực địa)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const G = require('../src/ui/contrast_guard.js');
const { hex, ratio, mix } = G._test;

test('công thức tương phản WCAG', () => {
    assert.equal(ratio(hex('#000000'), hex('#ffffff')).toFixed(1), '21.0');
    assert.equal(ratio(hex('#ffffff'), hex('#ffffff')).toFixed(1), '1.0');
    assert.ok(ratio(hex('#a8a29e'), hex('#ffffff')) < 4.5, 'chữ xám nhạt trên nền trắng không đạt');
    const dark = mix(hex('#a8a29e'), [0, 0, 0, 1], 0.5);
    assert.ok(ratio(dark, hex('#ffffff')) >= 4.5, 'kéo về phía đen thì đạt');
});

test('được nạp, chạy khi mở app và lưu sẵn cho chế độ ngoại tuyến', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(html.indexOf('src/ui/contrast_guard.js') > 0 && html.indexOf('src/ui/contrast_guard.js') < html.indexOf('<script src="app.js'));
    assert.ok(app.includes('window.appContrast.start()'));
    assert.ok(sw.includes("'./src/ui/contrast_guard.js'"));
    const src = fs.readFileSync(path.join(root, 'src/ui/contrast_guard.js'), 'utf8');
    assert.ok(src.includes("attributeFilter: ['class', 'style', 'data-theme']"), 'đổi giao diện / nội dung mới thì kiểm lại');
    assert.ok(src.includes('data-cg-c') && src.includes('function restore('), 'hoàn nguyên được màu gốc');
});

test('giao diện Sáng: các khối nền tối viết sẵn đổi sang nền sáng', () => {
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    assert.ok(css.includes('[data-theme="light"] [style*="background: rgba(28, 26, 24"]'));
    assert.ok(css.includes('body.field-mode .btn-convert, body.field-mode .btn-convert * { color: #111111 !important; }'));
});
