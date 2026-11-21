// Lớp giao diện Sylva (kính mờ, nền đen ấm, thanh bên gập thành dock trên máy tính).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('ui-sylva.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const appJs = fs.readFileSync('app.js', 'utf8');

test('ui-sylva.css nạp sau cùng và có trong bộ nhớ đệm ngoại tuyến', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g)].map(m => m[1]);
  assert.strictEqual(links[links.length - 1], 'ui-sylva.css', 'ui-sylva.css phải là stylesheet cuối cùng');
  assert.ok(sw.includes("'./ui-sylva.css'"), 'Service worker phải cache ui-sylva.css');
  assert.ok(html.includes('<meta name="theme-color" content="#171615">'), 'Thanh trạng thái theo nền #171615');
});

test('Có bộ token kính cho cả bản tối và bản sáng', () => {
  assert.ok(css.includes('--sy-bg: #171615;'), 'Nền tối là đen ấm #171615');
  assert.ok(/\[data-theme="light"\]\s*{[^}]*--sy-bg:/.test(css), 'Có token riêng cho bản sáng');
  assert.ok(css.includes('backdrop-filter: var(--sy-blur)'), 'Bề mặt dùng kính mờ');
});

test('Máy tính: thanh bên trái, gập thành dock đáy; chế độ Thực địa không bị ảnh hưởng', () => {
  assert.ok(css.includes('@media (min-width: 1024px) and (min-height: 621px)'), 'Thanh bên chỉ áp dụng cho màn hình lớn');
  assert.ok(css.includes('nav#mobileBottomNav.mobile-bottom-nav.dock-collapsed'), 'Có trạng thái gập thành dock');
  assert.ok(css.includes('body.dock-collapsed:not(.field-mode) main.app-viewport'), 'Vùng nội dung giãn ra khi gập');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?={)/g).map(s => s.trim()).filter(s => s && !s.startsWith('@') && !s.startsWith(':root') && !s.startsWith('[data-theme') && !/^(html|::selection)/.test(s));
  const unscoped = rules.filter(sel => !sel.includes(':not(.field-mode)'));
  assert.deepStrictEqual(unscoped, [], 'Mọi quy tắc giao diện phải loại trừ body.field-mode');
});

test('Gập/mở thanh bên báo Leaflet đo lại kích thước bản đồ', () => {
  const fn = appJs.slice(appJs.indexOf('toggleTaskbarDock(forceState) {'), appJs.indexOf('collapseTaskbar() {'));
  assert.ok(fn.includes("window.dispatchEvent(new Event('resize'))"), 'Phải phát sự kiện resize sau khi gập/mở');
});
