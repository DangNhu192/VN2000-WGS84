// v2.8.51: mã liên kết thửa ↔ đỉnh khi xuất điểm ra tệp (CSV / Excel / TXT) — nhập lại tự dựng thửa đúng thứ tự,
// đỉnh chung của nhiều thửa chỉ là một mốc. Quy ước: T1.3 = đỉnh 3 của thửa 1; D = tuyến; P = điểm rời; nối "+".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

global.document = global.document || { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = global.window || { addEventListener() {} };
global.localStorage = global.localStorage || { getItem: () => null, setItem() {}, removeItem() {} };
const geo = require('../geodesy.js');
global.csvCell = global.csvCell || geo.csvCell;
const PL = global.ParcelLinks = require('../src/core/parcel_links.js');
const IP = require('../import-preview.js');
const { appData } = require('../app.js');

const P = (name, x, y) => ({ name, x, y, h: 0 });
const A = P('M1', 1191900, 603700), B = P('M2', 1191930, 603700), C = P('M3', 1191930, 603740), D = P('M4', 1191900, 603740),
    E = P('M5', 1191960, 603700), F = P('M6', 1191960, 603740);
const SHAPES = [
    { name: 'Thửa 12', mode: 'polygon', vertices: [A, B, C, D] },
    { name: 'Thửa 13', mode: 'polygon', vertices: [B, E, F, C] },
    { name: 'Đường đi', mode: 'polyline', vertices: [D, C, F] }
];
const describe = shapes => shapes.map(s => `${s.name}[${s.mode}]:${s.vertices.map(v => v.name).join('-')}`);

test('mã liên kết: đọc/ghi, chấp nhận cách gõ tay', () => {
    assert.equal(PL.formatLinks([{ type: 'T', index: 1, order: 3 }, { type: 'T', index: 2, order: 1 }]), 'T1.3+T2.1');
    assert.deepEqual(PL.parseLinks('t1:3 ; T2-1, d4/2'), [{ type: 'T', index: 1, order: 3 }, { type: 'T', index: 2, order: 1 }, { type: 'D', index: 4, order: 2 }]);
    assert.equal(PL.looksLikeLinkCell('T1.3+T2.1'), true);
    assert.equal(PL.looksLikeLinkCell('Thửa 12'), false);
    assert.equal(PL.looksLikeLinkCell('1191900.5'), false);
});

test('xuất: đỉnh chung chỉ một dòng, mang mã của mọi thửa/tuyến đi qua nó', () => {
    const { rows, legend } = PL.buildLinkedRows(SHAPES, [P('GPS1', 1192000, 603800)]);
    assert.deepEqual(rows.map(r => `${r.name}:${r.lk}`), ['M1:T1.1', 'M2:T1.2+T2.1', 'M3:T1.3+T2.4+D1.2', 'M4:T1.4+D1.1', 'M5:T2.2', 'M6:T2.3+D1.3', 'GPS1:']);
    assert.equal(rows[2].lkNames, 'Thửa 12 | Thửa 13 | Đường đi');
    assert.deepEqual(legend.map(l => l.key), ['T1', 'T2', 'D1']);
});

test('nhập: dựng lại đúng thứ tự đỉnh dù các dòng bị xáo trộn; mốc lẻ giữ riêng', () => {
    const { rows } = PL.buildLinkedRows(SHAPES, [P('GPS1', 1192000, 603800)]);
    const shuffled = [rows[5], rows[0], rows[6], rows[3], rows[1], rows[4], rows[2]].map(r => ({ name: r.name, x: r.x, y: r.y, lk: r.lk, lkNames: r.lkNames }));
    const rb = PL.rebuildShapes(shuffled);
    assert.deepEqual(describe(rb.shapes), ['Thửa 12[polygon]:M1-M2-M3-M4', 'Thửa 13[polygon]:M2-M5-M6-M3', 'Đường đi[polyline]:M4-M3-M6']);
    assert.deepEqual(rb.loose.map(p => p.name), ['GPS1']);
    assert.equal(rb.shapes[0].vertices[1], rb.shapes[1].vertices[0], 'đỉnh chung là cùng một mốc');
});

test('nhập: thiếu tên thì đặt tên mặc định; thửa < 3 đỉnh thành tuyến và có cảnh báo; chỉ có cột tên thì gom theo tên', () => {
    const rb = PL.rebuildShapes([{ name: 'a', lk: 'T5.2' }, { name: 'b', lk: 'T5.1' }]);
    assert.equal(rb.shapes[0].name, 'Thửa 5');
    assert.equal(rb.shapes[0].mode, 'polyline');
    assert.deepEqual(rb.shapes[0].vertices.map(v => v.name), ['b', 'a']);
    assert.ok(rb.warnings[0].includes('2 đỉnh'));
    const byName = PL.rebuildShapes([{ name: 'p1', lkNames: 'Ao' }, { name: 'p2', lkNames: 'Ao' }, { name: 'p3', lkNames: 'Ao' }, { name: 'q', lkNames: '' }]);
    assert.deepEqual(describe(byName.shapes), ['Ao[polygon]:p1-p2-p3']);
    assert.equal(byName.loose.length, 1);
});

test('vòng xuất CSV của Sổ đo → xem trước nhập → dựng lại thửa (mốc gắn thẻ như MiniCAD lưu)', () => {
    const tagged = [];
    SHAPES.forEach((s, si) => s.vertices.forEach((v, i) => tagged.push({ ...v, shapeId: 'id' + si, shapeName: s.name, shapeMode: s.mode, shapeOrder: i + 1, mui: 3, ktt: "105°45'" })));
    tagged.push({ ...P('GPS1', 1192000, 603800), mui: 3, ktt: "105°45'" });
    const csv = appData._buildCsvText(tagged);
    assert.ok(csv.split('\r\n')[0].includes('"Mã liên kết","Thửa / khối"'));
    assert.equal(csv.split('\r\n').length, 1 + 7, '12 lần là đỉnh → 6 mốc + 1 mốc lẻ');
    const rows = IP.textToRows(csv);
    const m = IP.guessMapping(rows);
    assert.ok(m.cols.lk !== undefined && m.cols.shape !== undefined);
    const res = IP.buildPoints(rows, { headerRow: m.headerRow, cols: m.cols, type: 'vn2000', src: { ktt: 105.75, mui: 3 }, dst: null });
    const exp = PL.expandToTaggedPoints(res.points, { idPrefix: 't' });
    assert.equal(exp.points.length, 12, '11 lần là đỉnh, mỗi lần một dòng gắn thẻ + 1 mốc lẻ');
    assert.deepEqual(describe(exp.shapes), ['Thửa 12[polygon]:M1-M2-M3-M4', 'Thửa 13[polygon]:M2-M5-M6-M3', 'Đường đi[polyline]:M4-M3-M6']);
    const back = PL.shapesFromTaggedPoints(exp.points);
    assert.deepEqual(describe(back.shapes), describe(exp.shapes));
    // Sổ đo không có thửa: CSV giữ nguyên như cũ
    assert.ok(!appData._buildCsvText([P('K1', 1191000, 603000)]).includes('Mã liên kết'));
});

test('TXT tab có ô chữ chứa số không bị tách theo khoảng trắng; cột mã nhận theo nội dung khi không có tiêu đề', () => {
    const txt = 'M1\t1191900.000\t603700.000\t0.000\tĐỉnh ranh Thửa 12\tT1.1\tThửa 12\nM2\t1191930.000\t603700.000\t0.000\tĐỉnh ranh Thửa 12\tT1.2+T2.1\tThửa 12 | Thửa 13\nM3\t1191930.000\t603740.000\t0.000\tĐỉnh ranh Thửa 12\tT1.3\tThửa 12';
    const rows = IP.textToRows(txt);
    assert.equal(rows[0].length, 7);
    const m = IP.guessMapping(rows);
    assert.equal(m.cols.lk, 5);
});

test('tiêu đề cột: "Mã liên kết", "MA_LK", "Thửa / khối", "Tên Khối / Thửa" không bị nhận nhầm là tên điểm', () => {
    assert.deepEqual(geo.mapHeaderColumns(['TEN_DIEM', 'X(BAC)', 'Y(DONG)', 'CAO_DO_H', 'GHI_CHU', 'MA_LK', 'THUA_KHOI']),
        { name: 0, x: 1, y: 2, h: 3, note: 4, lk: 5, shape: 6 });
    assert.deepEqual(geo.mapHeaderColumns(['STT', 'Tên Khối / Thửa', 'Tên Đỉnh', 'Tọa độ X (Bắc) [m]', 'Tọa độ Y (Đông) [m]']),
        { name: 2, shape: 1, x: 3, y: 4 });
});

test('nối dây: các bộ xuất/nhập dùng mã liên kết; module được nạp và lưu ngoại tuyến', () => {
    assert.ok(html.includes('src/core/parcel_links.js') && sw.includes("'./src/core/parcel_links.js'"));
    assert.ok(app.includes('this._linkedExportRows(pts)'), 'CSV / Excel / TXT của Xuất dữ liệu');
    assert.equal((app.match(/this\._linkedExportRows\(pts\)/g) || []).length, 3);
    assert.ok(app.includes('ParcelLinks.buildLinkedRows(selectedShapes, [])'), 'TXT toàn đạc của MiniCAD');
    assert.ok(app.includes('ParcelLinks.expandToTaggedPoints(parsedPoints)'), 'nạp vào Sổ đo');
    assert.ok(app.includes('// --- CHIẾN LƯỢC 0: Bảng điểm có "Mã liên kết"'), 'nạp thẳng vào MiniCAD');
    assert.ok(app.includes("HuongDan_MaLienKet"), 'Excel kèm trang hướng dẫn đọc mã');
});
