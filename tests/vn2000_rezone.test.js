// Đổi tọa độ VN-2000 giữa các KTT / múi chiếu.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const g = require('../geodesy.js');
const rz = require('../vn2000-rezone.js');

const mm = (a, b) => Math.abs(a - b) * 1000;

test('đổi KTT khớp với chuyển trực tiếp từ WGS-84 (sai khác < 0.1 mm)', () => {
    for (const [lat, lng, src, dst, ks, kd] of [
        [10.77, 106.70, 105.75, 107.75, 0.9999, 0.9999],
        [21.03, 105.85, 105.0, 105.5, 0.9999, 0.9999],
        [16.05, 108.20, 107.75, 108.0, 0.9999, 0.9999],
        [10.77, 106.70, 105.75, 105.0, 0.9999, 0.9996]
    ]) {
        const a = g.convertWgsToVn2k(lat, lng, src, ks);
        const b = g.convertWgsToVn2k(lat, lng, dst, kd);
        const r = g.convertVn2kToVn2k(a.X, a.Y, src, ks, dst, kd);
        assert.ok(mm(r.X, b.X) < 0.1 && mm(r.Y, b.Y) < 0.1, `${src}→${dst}: ${mm(r.X, b.X)} / ${mm(r.Y, b.Y)} mm`);
        const back = g.convertVn2kToVn2k(r.X, r.Y, dst, kd, src, ks);
        assert.ok(mm(back.X, a.X) < 0.2 && mm(back.Y, a.Y) < 0.2, 'Đổi đi đổi lại phải về đúng điểm cũ');
    }
});

test('cùng KTT và múi thì giữ nguyên tọa độ; đầu vào sai trả về null', () => {
    const r = g.convertVn2kToVn2k(1191900.123, 603800.456, 105.75, 0.9999, 105.75, 0.9999);
    assert.ok(mm(r.X, 1191900.123) < 0.1 && mm(r.Y, 603800.456) < 0.1);
    assert.equal(g.convertVn2kToVn2k(NaN, 1, 105, 0.9999, 106, 0.9999), null);
    assert.equal(g.convertVn2kToVn2k(1, 1, 105, 0, 106, 0.9999), null);
});

test('đọc dữ liệu dán: tab/khoảng trắng/chấm phẩy/phẩy, dấu phẩy thập phân, STT, đảo X⇄Y', () => {
    const { points, errors } = rz.parseLines([
        'M1\t1191900.123\t603800.456',
        'M2 1191900,5 603800,25',
        'M3;1.191.900,123;603.800,456',
        'M4,1191900.1,603800.2',
        '7 1191900.1 603800.2',
        '603800.2 1191900.1',
        '# ghi chú',
        'dòng hỏng'
    ].join('\n'));
    assert.deepEqual(points.map(p => [p.name, p.x, p.y]), [
        ['M1', 1191900.123, 603800.456], ['M2', 1191900.5, 603800.25], ['M3', 1191900.123, 603800.456],
        ['M4', 1191900.1, 603800.2], ['7', 1191900.1, 603800.2], ['Đ6', 1191900.1, 603800.2]
    ]);
    assert.equal(points[5].swapped, true);
    assert.equal(errors.length, 1);
});

test('kết quả: cảnh báo khi xa KTT, CSV có BOM, 3 số lẻ và thoát dấu ngoặc kép', () => {
    const src = { ktt: 105.75, zone: 3 }, dst = { ktt: 108.5, zone: 3 };
    const a = g.convertWgsToVn2k(10.77, 106.70, 105.75, 0.9999);
    const res = rz.convertAll([{ name: 'Mốc "A"', x: a.X, y: a.Y }], src, dst, g.convertVn2kToVn2k);
    assert.equal(res[0].ok, true);
    assert.equal(res[0].far, false);
    const far = rz.convertAll([{ name: 'B', x: a.X, y: a.Y }], src, { ktt: 102, zone: 3 }, g.convertVn2kToVn2k);
    assert.equal(far[0].far, true);
    const csv = rz.toCsv(res, src, dst);
    assert.ok(csv.startsWith('﻿"Tên Điểm"'));
    assert.match(csv, /"Mốc ""A"""/);
    assert.match(csv, /"\d+\.\d{3}","\d+\.\d{3}","\d+\.\d{3}","\d+\.\d{3}","105°45'","3°","108°30'"/);
});

test('danh sách KTT gom theo tỉnh từ bảng 63 tỉnh, không trùng', () => {
    const opts = rz.kttOptions(g.VN_PROVINCES);
    assert.equal(new Set(opts.map(o => o.ktt)).size, opts.length);
    assert.ok(opts.find(o => o.ktt === 105.75).label.includes('Hồ Chí Minh'));
    assert.equal(rz.kttLabel(104.75), "104°45'");
});

test('giao diện: tab nằm trong màn Chuyển đổi, không gọi bản đồ dự án; script được nạp và precache', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    const src = fs.readFileSync(path.join(__dirname, '..', 'vn2000-rezone.js'), 'utf8');
    const tf = html.slice(html.indexOf('id="screen-transform"'), html.indexOf('id="screen-transform-map"'));
    assert.ok(tf.includes('id="tabTransRezone"') && tf.includes('id="panelTransRezone"'));
    assert.ok(html.includes('src="vn2000-rezone.js'));
    assert.ok(sw.includes("'./vn2000-rezone.js'"));
    assert.ok(!/openProjectMap|mapProjectBar|appCadTool/.test(src), 'Không gọi chéo phân hệ khác');
});

test('mốc KTT nhanh khớp đúng bảng 63 tỉnh (không gắn nhầm tỉnh)', () => {
    const norm = n => n.replace(/^TP\.\s*/, '').replace('Hồ Chí Minh', 'TP.HCM');
    for (const p of g.VN_PROVINCES) {
        const preset = g.COMMON_KTT_PRESETS.find(k => k.decimal === p.ktt);
        assert.ok(preset && preset.provinces.split(', ').includes(norm(p.name)), `${p.name} phải nằm ở mốc ${p.ktt}`);
    }
    for (const k of g.COMMON_KTT_PRESETS) {
        assert.equal(k.deg + k.min / 60, k.decimal);
    }
});

test('menu: mục 1.3 Đổi KTT / Múi mở đúng tab trong màn Chuyển đổi', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    assert.match(html, /id="drawerItem_rezone" onclick="appNav\.navigateTo\('rezone'\)"/);
    assert.ok(app.includes("appNav.openTransformCoordScreen('rezone');"));
});
