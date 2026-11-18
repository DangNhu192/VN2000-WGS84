// Xuất/nhập dữ liệu: chuẩn hóa chung cho mọi định dạng và đọc lại được chính file ứng dụng xuất ra.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const g = require('../geodesy.js');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const DEF = { ktt: 105.75, mui: 3 };
const ref = g.convertWgsToVn2k(10.7769, 106.7009, 105.75, 0.9999);

test('chuẩn hóa: bỏ dòng "Lỗi", bổ sung WGS-84 từ VN-2000 và ngược lại theo KTT/múi của từng điểm', () => {
    const out = g.normalizeSurveyPoints([
        { name: 'A', x: ref.X.toFixed(3), y: ref.Y.toFixed(3) },
        { name: 'B', lat: '10.7769', lng: '106,7009' },
        { name: 'C', x: 'Lỗi', y: 'Lỗi', lat: 'Lỗi', lng: 'Lỗi' },
        { name: 'D', lat: 0, lng: 0 },
        { name: 'E', x: ref.X, y: ref.Y, ktt: "TP. Hồ Chí Minh (105°45', Múi 3°)" }
    ], { ktt: 105, mui: 6 });
    assert.deepEqual(out.map(p => p.name), ['A', 'B', 'E']);
    // A dùng KTT mặc định 105° múi 6 → khác vị trí; E ghi rõ 105°45' múi 3 → đúng điểm gốc.
    assert.equal(out[0].ktt, "105°00'");
    assert.equal(out[0].mui, 6);
    assert.ok(Math.abs(out[2].lat - 10.7769) < 1e-8 && Math.abs(out[2].lng - 106.7009) < 1e-8);
    assert.equal(out[2].ktt, "105°45'");
    const b = g.convertWgsToVn2k(10.7769, 106.7009, 105, 0.9996);
    assert.ok(Math.abs(out[1].x - b.X) < 1e-6 && Math.abs(out[1].y - b.Y) < 1e-6);
});

test('đọc lại CSV 10 cột của ứng dụng (ngoặc kép, BOM, LF hoặc CRLF) đủ X, Y, H, KTT, ghi chú', () => {
    const csv = '﻿' + [
        ['Thời Gian', 'Tên Điểm', 'Tọa Độ Ngang X', 'Tọa Độ Đứng Y', 'Cao Độ H', 'Vĩ Độ (Lat)', 'Kinh Độ (Long)', 'Múi Chiếu', 'Kinh Tuyến Trục', 'Ghi Chú'],
        ['', 'M1', ref.X.toFixed(3), ref.Y.toFixed(3), '2.500', '10.77690000', '106.70090000', '3', "105°45'", 'mốc "góc", A&B']
    ].map(r => r.map(g.csvCell).join(',')).join('\n');
    for (const text of [csv, csv.replace(/\n/g, '\r\n')]) {
        const t = g.parseHeaderedTable(text, DEF);
        assert.equal(t.points.length, 1);
        const p = t.points[0];
        assert.equal(p.name, 'M1');
        assert.equal(p.x, Number(ref.X.toFixed(3)));
        assert.equal(p.h, 2.5);
        assert.equal(p.note, 'mốc "góc", A&B');
        assert.equal(p.ktt, "105°45'");
    }
});

test('đọc TXT máy đo (tiêu đề sau dấu #, tab) và bảng chấm phẩy dùng dấu phẩy thập phân', () => {
    const txt = '# SO LIEU\n# TEN_DIEM\tX(BAC)\tY(DONG)\tCAO_DO_H\tGHI_CHU\nM1\t1191942.305\t603797.261\t2.500\tok\n';
    assert.deepEqual(g.parseHeaderedTable(txt, DEF).points.map(p => [p.name, p.x, p.y, p.h]), [['M1', 1191942.305, 603797.261, 2.5]]);
    const semi = 'STT;Tên mốc;X;Y\n1;M9;1191942,305;603797,261\n';
    assert.deepEqual(g.parseHeaderedTable(semi, DEF).points.map(p => [p.name, p.x, p.y]), [['M9', 1191942.305, 603797.261]]);
    const wgs = 'name,lat,lon\nP,10.7769,106.7009\n';
    assert.ok(Math.abs(g.parseHeaderedTable(wgs, DEF).points[0].x - ref.X) < 1e-6);
    assert.equal(g.parseHeaderedTable('M1 1191942.305 603797.261', DEF), null, 'Không có tiêu đề → để bộ đọc từng dòng xử lý');
});

test('thoát ký tự: XML không vỡ khi tên có &, CSV nhân đôi ngoặc kép', () => {
    assert.equal(g.escapeXml('A&B <"x">'), 'A&amp;B &lt;&quot;x&quot;&gt;');
    assert.equal(g.csvCell('a "b"'), '"a ""b"""');
});

test('app.js: nhập chấp nhận mọi kiểu xuống dòng, mọi định dạng xuất qua bộ chuẩn hóa, CSV có cột H', () => {
    assert.ok(!appJs.includes('text.split(/\\r?\\r\\n/)'), 'Không còn regex chỉ nhận CRLF');
    assert.ok(appJs.includes("split(/\\r\\n|\\r|\\n/)"));
    assert.ok(appJs.includes('normalizeSurveyPoints(raw, { ktt: AppState.kttVal, mui: AppState.muiVal })'));
    assert.ok(appJs.includes('parseHeaderedTable(text,'));
    assert.match(appJs, /_buildCsvText\(pts\) \{\s*const headers = \["Thời Gian", "Tên Điểm", "Tọa Độ Ngang X", "Tọa Độ Đứng Y", "Cao Độ H"/);
    assert.equal((appJs.match(/this\._buildCsvText\(pts\)/g) || []).length, 2, 'Xuất và chia sẻ CSV dùng chung một định dạng');
    assert.ok(appJs.includes('<name>${escapeXml(projName)}</name>'));
});
