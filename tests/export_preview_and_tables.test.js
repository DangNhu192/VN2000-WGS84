// v2.8.54: (1) ô xem trước Studio xuất MiniCAD vẽ đúng khối (trước đây vẽ (x=Bắc, y=Đông) vào khung (Đông, Bắc)
// nên khối nằm ngoài khung, ô xem trước trống) và hiện các ô ảnh nền / lớp phủ đã chọn;
// (2) tùy chọn "Bảng in kèm bản vẽ": tổng hợp diện tích, tổng hợp các điểm, hoặc cả hai (PDF, ảnh, SVG, DXF).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

global.document = global.document || { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = global.window || { addEventListener() {} };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
global.ParcelLinks = require('../src/core/parcel_links.js');
const M = require('../app.js');

test('ô xem trước MiniCAD: đỉnh vẽ theo (Đông = y, Bắc = x) và có lớp bản đồ đã chọn', () => {
    const start = app.indexOf('    renderExportPreview() {');
    const body = app.slice(start, app.indexOf('    saveTitleBlockInfo(showToastMsg = false) {', start));
    assert.ok(body.includes('toSvgX(v.y).toFixed(1)},${toSvgY(v.x).toFixed(1)}'), 'đa giác theo (Đông, Bắc)');
    assert.ok(body.includes('const sx = toSvgX(v.y);') && body.includes('const sy = toSvgY(v.x);'), 'điểm đỉnh theo (Đông, Bắc)');
    assert.ok(body.includes('exportPreviewLayersSvg(meta,') && body.includes('IN KÈM:'), 'nền + huy hiệu lớp in kèm');
    assert.ok(app.includes('svgHtml += exportPreviewLayersSvg(Object.assign({ gulandOpacity: 0.6 }, opts)'), 'xem trước của Xuất dữ liệu');
});

test('bảng in kèm: chọn được diện tích / các điểm / cả hai', () => {
    assert.ok(html.includes('id="cadExportSummaryTables"'));
    ['area', 'points', 'both'].forEach(v => assert.ok(html.includes(`<option value="${v}"`)));
    assert.deepEqual(M.summaryTablesMode({}), { area: true, points: false }, 'mặc định như cũ: bảng diện tích');
    assert.deepEqual(M.summaryTablesMode({ summaryTables: 'points' }), { area: false, points: true });
    assert.deepEqual(M.summaryTablesMode({ summaryTables: 'both' }), { area: true, points: true });
    assert.ok((app.match(/const tblMode = summaryTablesMode\(meta\);/g) || []).length >= 4, 'PDF, ảnh, SVG, DXF');
    assert.ok(app.includes('"BẢNG TỔNG HỢP CÁC ĐIỂM"') && app.includes('BẢNG TỔNG HỢP CÁC ĐIỂM (${ptRows.length} điểm)') && app.includes('"BANG TONG HOP CAC DIEM"'));
});

test('bảng tổng hợp các điểm: mỗi mốc một dòng, đỉnh chung không lặp', () => {
    const P = (name, x, y) => ({ name, x, y });
    const A = P('M1', 1191900, 603700), B = P('M2', 1191930, 603700), C = P('M3', 1191930, 603740), D = P('M4', 1191900, 603740), E = P('M5', 1191960, 603700);
    const rows = M.exportPointRows([{ name: 'Thửa 1', mode: 'polygon', vertices: [A, B, C, D] }, { name: 'Thửa 2', mode: 'polygon', vertices: [B, E, C] }]);
    assert.deepEqual(rows.map(r => r.name), ['M1', 'M2', 'M3', 'M4', 'M5']);
    assert.equal(rows[1].shapes, 'Thửa 1, Thửa 2');
    assert.equal(rows[0].x, 1191900);
});
