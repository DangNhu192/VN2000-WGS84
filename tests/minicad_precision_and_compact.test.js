// MiniCAD: X/Y đỉnh không trôi khi lưu khối; giao diện gọn trên màn ngang thấp.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const g = require('../geodesy.js');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const polish = fs.readFileSync(path.join(__dirname, '..', 'ui-polish.css'), 'utf8');

function extractNormalizeVertex() {
    const start = appJs.indexOf('    _normalizeVertex(v, idx = 0, forceSyncVn2k = false) {');
    assert.ok(start > 0);
    let depth = 0, i = appJs.indexOf('{', start);
    for (; i < appJs.length; i++) { if (appJs[i] === '{') depth++; else if (appJs[i] === '}' && --depth === 0) break; }
    const body = appJs.slice(start, i + 1).replace(/^\s*_normalizeVertex/, 'function _normalizeVertex');
    const AppState = { kttVal: 105.75, scaleFactor: 0.9999 };
    return new Function('AppState', 'convertWgsToVn2k', 'convertVn2kToWgs', body + '\nreturn _normalizeVertex;')(AppState, g.convertWgsToVn2k, g.convertVn2kToWgs);
}

test('lưu khối (forceSync) giữ nguyên X/Y khi lat/lng chỉ lệch do làm tròn 7 số lẻ', () => {
    const norm = extractNormalizeVertex();
    const w = g.convertVn2kToWgs(1191900, 603800, 105.75, 0.9999);
    const v = { x: 1191900, y: 603800, lat: +w.lat.toFixed(7), lng: +w.lng.toFixed(7) };
    const out = norm.call({}, v, 0, true);
    assert.equal(out.x, 1191900);
    assert.equal(out.y, 603800);
});

test('kéo đỉnh (lat/lng dời > 1 cm) vẫn cập nhật X/Y theo vị trí mới', () => {
    const norm = extractNormalizeVertex();
    const moved = g.convertVn2kToWgs(1191900.5, 603800.5, 105.75, 0.9999);
    const out = norm.call({}, { x: 1191900, y: 603800, lat: moved.lat, lng: moved.lng }, 0, true);
    assert.ok(Math.abs(out.x - 1191900.5) < 0.001 && Math.abs(out.y - 603800.5) < 0.001);
});

test('màn ngang thấp: thanh lệnh thu về dòng tiêu đề, đầu thanh công cụ một hàng chỉ biểu tượng', () => {
    assert.ok(appJs.includes('if (this.isCompactCadViewport()) this.setCmdBarCollapsed(true);'));
    assert.ok(appJs.includes("matchMedia('(orientation: landscape) and (max-height: 620px)').matches"));
    assert.match(polish, /#mapCadToolbarHeader \{ flex-wrap: nowrap !important;/);
    assert.match(polish, /#mapCadToolbarHeader #cadTabGroup \.cad-tab-text \{ display: none !important; \}/);
});
