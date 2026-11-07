// Nhập file có xem trước: tách cột, đoán cột, đổi KTT của file sang KTT hiện hành.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const g = require('../geodesy.js');
const I = require('../import-preview.js');

const pick = (text) => {
    const rows = I.textToRows(text);
    return { rows, ...I.guessMapping(rows) };
};

test('tách cột: chấm phẩy, tab, dấu phẩy, khoảng trắng; không tách nhầm dấu phẩy thập phân', () => {
    assert.deepEqual(I.textToRows('M1 1191900,5 603800,25 2,1')[0], ['M1', '1191900,5', '603800,25', '2,1']);
    assert.deepEqual(I.textToRows('Tên Điểm,X,Y\nA,1191900.5,603800.25')[1], ['A', '1191900.5', '603800.25']);
    assert.deepEqual(I.textToRows('A;1.191.900,5;603.800,25')[0], ['A', '1.191.900,5', '603.800,25']);
    assert.equal(I.num('1.191.900,5'), 1191900.5);
});

test('đoán cột theo tiêu đề và theo giá trị khi không có tiêu đề', () => {
    let m = pick('STT\tTên mốc\tY (Đông)\tX (Bắc)\tCao độ\n1\tK1\t603800.2\t1191900.1\t3');
    assert.deepEqual([m.cols.name, m.cols.x, m.cols.y, m.cols.h, m.type], [1, 3, 2, 4, 'vn2000']);
    m = pick('K1 603800.2 1191900.1 3.5\nK2 603850.2 1191950.1 3.6');
    assert.deepEqual([m.headerRow, m.cols.name, m.cols.x, m.cols.y, m.cols.h], [-1, 0, 2, 1, 3]);
    m = pick('P1 10.7769 106.7009\nP2 10.7801 106.7055');
    assert.equal(m.type, 'wgs84');
    assert.deepEqual([m.cols.lat, m.cols.lng], [1, 2]);
});

test('nạp: đổi X/Y từ KTT của file sang KTT hiện hành đúng như engine Đổi KTT; dòng hỏng bị bỏ và báo số dòng', () => {
    const m = pick('Tên;X;Y;H\nA;1191900,123;403800,456;5\nB;abc;;');
    const res = I.buildPoints(m.rows, { headerRow: m.headerRow, cols: m.cols, type: 'vn2000', src: { ktt: 107.75, mui: 3 }, dst: { ktt: 105.75, mui: 3 } });
    const ref = g.convertVn2kToVn2k(1191900.123, 403800.456, 107.75, 0.9999, 105.75, 0.9999);
    assert.equal(res.points.length, 1);
    assert.ok(Math.abs(res.points[0].x - ref.X) < 1e-6 && Math.abs(res.points[0].y - ref.Y) < 1e-6);
    assert.equal(res.points[0].ktt, "105°45'");
    assert.equal(res.points[0].h, 5);
    assert.deepEqual(res.skippedLines, [3]);
    // Không đổi: giữ nguyên X/Y và ghi KTT của file.
    const keep = I.buildPoints(m.rows, { headerRow: m.headerRow, cols: m.cols, type: 'vn2000', src: { ktt: 107.75, mui: 3 }, dst: null });
    assert.equal(keep.points[0].x, 1191900.123);
    assert.equal(keep.points[0].ktt, "107°45'");
});

test('giao diện: file bảng đi qua bước xem trước, thuộc phân hệ Sổ đo', () => {
    const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(app.includes('if (rows.length) return ImportPreview.open(rows, file.name);'));
    assert.ok(app.includes('if (appData.openImportPreviewFromWorkbook(wb, file.name)) return;'));
    const modal = html.slice(html.indexOf('id="modalImportProject"'), html.indexOf('NẠP TỆP GIS (.GEOJSON'));
    ['importPreviewBox', 'impPreviewTable', 'impMapping', 'impSrcKtt', 'impSrcMui', 'impConvert', 'btnImpConfirm'].forEach(id => assert.ok(modal.includes(`id="${id}"`), id));
    assert.ok(html.includes('src="import-preview.js'));
    assert.ok(!/openProjectMap|appCadTool/.test(fs.readFileSync(path.join(__dirname, '..', 'import-preview.js'), 'utf8')));
});
