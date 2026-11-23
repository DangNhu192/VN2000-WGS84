// Ký hiệu MiniCAD: nằm đúng tọa độ, chữ trong/ngoài ký hiệu (vị trí, cỡ, màu), icon mốc dự án tùy chỉnh.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');
const styleCss = fs.readFileSync('style.css', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Tách một method của object literal trong app.js (đếm ngoặc, bỏ qua chuỗi đơn giản)
function extractMethod(name) {
  const start = appJs.indexOf('\n    ' + name + '(');
  if (start < 0) throw new Error('Không tìm thấy method: ' + name);
  let p = 0, close = -1;
  for (let j = appJs.indexOf('(', start); j < appJs.length; j++) {
    if (appJs[j] === '(') p++; else if (appJs[j] === ')') { p--; if (p === 0) { close = j; break; } }
  }
  const open = appJs.indexOf('{', close);
  let d = 0;
  for (let j = open; j < appJs.length; j++) {
    if (appJs[j] === '{') d++; else if (appJs[j] === '}') { d--; if (d === 0) return appJs.slice(start + 1, j + 1); }
  }
  throw new Error('Không cân bằng ngoặc: ' + name);
}
const escapeHtml = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const api = new Function('escapeHtml', 'L', `return ({ ${['normalizeLabelField', 'getLabelStyleFor', 'symbolPx', 'glyphHtml', 'buildGlyphIcon'].map(extractMethod).join(', ')} });`)(
  escapeHtml, { divIcon: o => ({ options: o }) });
const ctx = Object.assign(Object.create(api), {
  labelPositions: ['inside', 'right', 'top', 'bottom', 'left', 'none'].map(id => ({ id, label: id })),
  getGlyphLayerOf: shape => shape && shape._layer
});

test('Ký hiệu đặt trong khung tâm 0×0 (đúng tọa độ), CSS khớp', () => {
  const html = ctx.glyphHtml({ style: 'circle', color: '#22c55e', size: 'md', name: 'M1', label: { pos: 'inside' }, expanded: true, dot: true });
  assert.ok(html.startsWith('<div class="cad-vglyph"'), 'Có khung tâm');
  assert.ok(/\.cad-vglyph \{\s*position: absolute;\s*left: 50%;\s*top: 50%;\s*width: 0;\s*height: 0;/.test(styleCss), 'Khung tâm nằm giữa ô icon');
  assert.ok(styleCss.includes('.cad-vglyph > .cad-vertex-badge.expanded') && styleCss.includes('width: max-content !important;'), 'Tên dài không bị cắt');
  const icon = ctx.buildGlyphIcon({ style: 'circle', color: '#000000', size: 'lg', name: 'A' });
  assert.deepStrictEqual(icon.options.iconAnchor, [14, 14], 'Neo đúng tâm ô icon');
});

test('Chữ trong ký hiệu: viên thuốc có tên, cỡ chữ tự chọn qua lớp lsz', () => {
  const html = ctx.glyphHtml({ style: 'square', color: '#ef4444', size: 'md', name: 'GPS-12', label: { pos: 'inside', px: 16, color: '#fde047' }, expanded: true, dot: false });
  assert.ok(html.includes('expanded') && html.includes(' lsz') && html.includes('>GPS-12</div>'));
  assert.ok(html.includes('--lbl-size:16px;') && html.includes('--lbl-color:#fde047;'));
  assert.ok(!html.includes('cad-vlabel'), 'Không có chữ ngoài');
});

test('Chữ ngoài ký hiệu: giữ hình ký hiệu, chữ ở phải/trên/dưới/trái; "Ẩn chữ" không sinh chữ', () => {
  for (const pos of ['right', 'top', 'bottom', 'left']) {
    const html = ctx.glyphHtml({ style: 'diamond', color: '#ef4444', size: 'sm', name: 'M<2>', label: { pos }, expanded: true, dot: false });
    assert.ok(html.includes('lbl-out') && html.includes('dot-visible') && !/\bexpanded\b/.test(html.split('cad-vlabel')[0]), pos);
    assert.ok(html.includes(`class="cad-vlabel lp-${pos} is-on">M&lt;2&gt;</span>`), 'Chữ đúng vị trí, đã escape');
    assert.ok(styleCss.includes(`.cad-vlabel.lp-${pos} {`), 'CSS cho vị trí ' + pos);
  }
  const off = ctx.glyphHtml({ style: 'x', color: '#ef4444', size: 'md', name: 'M3', label: { pos: 'right' }, expanded: false, dot: true });
  assert.ok(off.includes('class="cad-vlabel lp-right">'), 'Tắt nhãn: chữ ẩn, chỉ hiện khi rê chuột');
  const none = ctx.glyphHtml({ style: 'x', color: '#ef4444', size: 'md', name: 'M3', label: { pos: 'none' }, expanded: true, dot: true });
  assert.ok(!none.includes('cad-vlabel') && none.includes('lbl-out'));
  assert.ok(styleCss.includes('.cad-vertex-badge:not(.lbl-out):hover'), 'Rê chuột không biến ký hiệu chữ-ngoài thành viên thuốc');
});

test('Ưu tiên chữ: đỉnh → khối → lớp CAD → mặc định; giá trị rác bị loại', () => {
  const layer = { lPos: 'top', lSize: 13, lColor: '#ffffff' };
  const shape = { _layer: layer, lPos: 'left' };
  assert.deepStrictEqual(ctx.getLabelStyleFor(shape, { lSize: 18 }), { pos: 'left', px: 18, color: '#ffffff' });
  assert.deepStrictEqual(ctx.getLabelStyleFor({ _layer: layer }, {}), { pos: 'top', px: 13, color: '#ffffff' });
  assert.deepStrictEqual(ctx.getLabelStyleFor({}, { lPos: 'xien', lSize: 99, lColor: 'red' }), { pos: 'inside', px: 0, color: '' });
  assert.strictEqual(ctx.normalizeLabelField('lPos', ''), null, 'Ô trống = theo lớp');
  assert.strictEqual(ctx.normalizeLabelField('lPos', 'abc'), undefined);
  assert.strictEqual(ctx.normalizeLabelField('lSize', '14'), 14);
  assert.strictEqual(ctx.normalizeLabelField('lSize', '3'), undefined);
  assert.strictEqual(ctx.normalizeLabelField('lColor', '#ABCDEF'), '#ABCDEF');
});

test('Chỉnh được ở ba cấp: lớp CAD (bảng 🎨), từng đỉnh và cả khối (thẻ nhanh), có đặt lại', () => {
  for (const id of ['cadSymLPos_', 'cadSymLSize_', 'cadSymLColor_']) assert.ok(appJs.includes(`id="${id}\${id}"`), id);
  for (const id of ['cadQuickLPos', 'cadQuickLSize', 'cadQuickLColor']) assert.ok(appJs.includes(`id="${id}"`), id);
  const setV = extractMethod('setVertexGlyph'), setS = extractMethod('setShapeVerticesGlyph');
  assert.ok(setV.includes("field === 'lPos' || field === 'lSize' || field === 'lColor'") && setS.includes("field === 'lPos' || field === 'lSize' || field === 'lColor'"));
  assert.ok(extractMethod('resetVertexGlyph').includes('delete v.lPos;') && extractMethod('resetLayerGlyph').includes('delete ly.lPos;'));
  assert.ok(extractMethod('countVertexGlyphOverrides').includes('v.lPos'));
});

test('Icon mốc tọa độ dự án: hình, màu, cỡ, nội dung chữ, vị trí và cỡ chữ', () => {
  ['getLandmarkStyle', 'setLandmarkStyle', 'resetLandmarkStyle', 'landmarkIcon', 'landmarkText'].forEach(n => assert.ok(appJs.includes(`\n    ${n}(`), n));
  const lm = new Function('localStorage', 'appCadTool', `return ({ LANDMARK_DEFAULTS: { shape: 'pin', color: '#ef4444', size: 'md', text: 'index', pos: 'inside', px: 0, lColor: '' }, LANDMARK_KEY: 'k', ${extractMethod('getLandmarkStyle')}, ${extractMethod('landmarkText')} });`);
  const store = { k: JSON.stringify({ shape: 'target', color: '#123456', size: 'xl', text: 'both', pos: 'top', px: 14, lColor: 'bad' }) };
  const a = lm({ getItem: k => store[k] || null }, { pointStyles: [{ id: 'target' }, { id: 'circle' }] });
  assert.deepStrictEqual(a.getLandmarkStyle(), { shape: 'target', color: '#123456', size: 'xl', text: 'both', pos: 'top', px: 14, lColor: '' });
  assert.strictEqual(a.landmarkText({ name: 'GPS-1' }, 4, { text: 'both' }), '5. GPS-1');
  const b = lm({ getItem: () => '{"shape":"khong-co"}' }, { pointStyles: [] });
  assert.strictEqual(b.getLandmarkStyle().shape, 'pin', 'Kiểu lạ → ghim mặc định');
  assert.ok(appJs.includes('extraHtml = \'\',') && appJs.includes('</svg>${extraHtml}'), 'Ghim có chữ bên ngoài');
  assert.ok(styleCss.includes('.cad-vlabel.lmk-pin.lp-right'), 'CSS chữ quanh đầu ghim');
  assert.ok(indexHtml.includes('id="cadLandmarkStyleBox"') && appJs.includes('renderLandmarkStylePanel()'));
});

test('Bản vẽ xuất (DXF, PDF, SVG, PNG) đặt chữ theo cùng cài đặt vị trí + cỡ chữ', () => {
  const anchor = new Function(`return ({ ${extractMethod('exportLabelAnchor')} });`)();
  const mk = lb => Object.assign(Object.create(anchor), { getLabelStyleFor: () => lb });
  assert.strictEqual(mk({ pos: 'none', px: 0 }).exportLabelAnchor({}, {}, 0, 0, 1, 2, true), null, 'Ẩn chữ thì không xuất chữ');
  assert.deepStrictEqual(mk({ pos: 'inside', px: 18 }).exportLabelAnchor({}, {}, 0, 0, 1, 2, true), { legacy: true, h: 3 }, 'Trong ký hiệu: giữ chỗ cũ, cỡ theo tỉ lệ');
  const right = mk({ pos: 'right', px: 0 }).exportLabelAnchor({}, {}, 10, 20, 1, 2, true);
  assert.ok(right.x > 11 && right.y === 20 && right.align === 'left' && right.base === 'middle');
  const topUp = mk({ pos: 'top', px: 0 }).exportLabelAnchor({}, {}, 10, 20, 1, 2, true);
  const topDown = mk({ pos: 'top', px: 0 }).exportLabelAnchor({}, {}, 10, 20, 1, 2, false);
  assert.ok(topUp.y > 20 && topDown.y < 20 && topUp.align === 'center', 'Trên: theo chiều trục Y của từng bộ xuất');
  assert.strictEqual((appJs.match(/this\.exportLabelAnchor\(shape, p, /g) || []).length, 4, 'Cả 4 bộ xuất dùng chung cài đặt chữ');
  assert.ok(appJs.includes('72\\r\\n${hj}\\r\\n11\\r\\n') && appJs.includes('100\\r\\nAcDbText\\r\\n73\\r\\n${vj}'), 'DXF căn lề chữ bằng nhóm 72/73');
});
