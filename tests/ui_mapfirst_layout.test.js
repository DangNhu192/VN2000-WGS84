// Bố cục ưu tiên bản đồ (ui-mapfirst.css + app-shell.js): mọi chức năng có bản đồ, mọi cỡ màn hình.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('ui-mapfirst.css', 'utf8');
const shell = fs.readFileSync('app-shell.js', 'utf8');
const appJs = fs.readFileSync('app.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

test('ui-mapfirst.css là stylesheet cuối cùng và được cache ngoại tuyến', () => {
  const links = [...html.matchAll(/<link rel="stylesheet" href="([^"?]+)/g)].map(m => m[1]);
  assert.strictEqual(links[links.length - 1], 'ui-mapfirst.css');
  assert.ok(sw.includes("'./ui-mapfirst.css'"));
});

test('app-shell đánh dấu màn hình và đo lớp phủ thật (dock, thanh MiniCAD, CLI)', () => {
  assert.ok(shell.includes('document.body.dataset.screen = scr'), 'Ghi <body data-screen>');
  assert.ok(shell.includes("setProperty('--mf-dock-clear'"), 'Đo khoảng chừa cho dock');
  assert.ok(shell.includes("'--mf-rc-top'") && shell.includes("'--mf-rc-bottom'"), 'Đo dải trống cho cột nút phải');
  assert.ok(shell.includes('getClientRects().length'), 'Dock position:fixed phải đo bằng hộp hiển thị, không dùng offsetParent');
  assert.ok(shell.includes('new ResizeObserver(relayout)'), 'Đo lại khi lớp phủ đổi kích thước');
});

test('Mỗi màn hình có bản đồ đều có quy tắc ưu tiên bản đồ', () => {
  for (const sel of ['#transformSplitLayout', '#transformMapToolbar', '.transform-bottom-sheet', '.map-right-controls',
    '#mapCadToolbarHeader', '#stakeoutLiveMap', '#routingTopToolbar']) {
    assert.ok(css.includes(sel), `Thiếu quy tắc cho ${sel}`);
  }
  assert.ok(css.includes('[data-screen="map"]') && css.includes('[data-screen="transform"]'));
  assert.ok(css.includes('(orientation: landscape) and (max-height: 620px)'), 'Có bố cục riêng cho máy ngang');
  assert.ok(css.includes('(max-width: 767px) and (orientation: portrait)'), 'Có bố cục riêng cho điện thoại dọc');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+(?={)/g).map(s => s.trim())
    .filter(s => s && !s.startsWith('@') && s !== '#stakeoutLiveMap');
  assert.deepStrictEqual(rules.filter(s => !s.includes(':not(.field-mode)')), [], 'Chế độ Thực địa không bị ảnh hưởng');
});

test('Mặc định ưu tiên bản đồ: tỉ lệ khung nhập 38–40%, chấm điểm trên điện thoại mở bảng dạng thanh mỏng', () => {
  assert.ok(/defaultSplitRatio\(\) \{\s*return isTransformSideBySide\(\) \? 38 : 40;/.test(appJs));
  assert.ok(appJs.includes('this._splitRatio = this.defaultSplitRatio();'));
  const init = appJs.slice(appJs.indexOf("    init(options = {}) {\n        const mode = options.mode || 'pick';"));
  assert.ok(init.slice(0, 2500).includes("window.innerWidth < 769") && init.slice(0, 2500).includes("sheet.classList.add('sheet-peek')"));
});

test('Bản đồ cắm mốc: phóng to bằng lớp CSS, không ghim chiều cao cứng', () => {
  const fn = appJs.slice(appJs.indexOf('toggleMiniMap() {'), appJs.indexOf('recenterMiniMap() {'));
  assert.ok(fn.includes("classList.toggle('is-expanded'"));
  assert.ok(!fn.includes("'340px'") && !fn.includes("'210px'"));
  assert.ok(css.includes('#stakeoutLiveMap.is-expanded'));
});
