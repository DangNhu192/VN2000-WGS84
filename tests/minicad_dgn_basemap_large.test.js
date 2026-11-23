// MiniCAD v2.8.37: nạp bản đồ địa chính .dgn (MicroStation V7), bản vẽ lớn không làm treo trình duyệt,
// lớp ranh giới tỉnh / xã Đồng Tháp trong MiniCAD, và xuất PDF/PNG có nền bản đồ hoặc ảnh vệ tinh.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const app = read('app.js');
const html = read('index.html');

global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const GisIO = require('../src/core/gis_io.js');
const geo = require('../geodesy.js');
const { EXPORT_BASEMAPS, planExportBasemap, loadExportBasemap, exportTileTransform, drawExportBasemap } = require('../app.js');

const fixture = name => new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures', name))).buffer;
const KTT = 105.75, K0 = 0.9999;
const toLatLng = (e, n) => geo.convertVn2kToWgs(n, e, KTT, K0);
const toVn2k = (lat, lng) => { const v = geo.convertWgsToVn2k(lat, lng, KTT, K0); return { e: v.Y, n: v.X }; };

// ---------- DGN ----------
test('đọc DGN V7 2D có gốc tọa độ VN-2000: thửa, thửa phức (300 đỉnh), đường', () => {
    const r = GisIO.readDgn(fixture('vn2000_origin_2d.dgn'));
    assert.equal(r.ok, true);
    assert.equal(r.format, 'dgn');
    assert.deepEqual(r.counts, { points: 0, lines: 2, polygons: 2, vertices: 311 });
    assert.equal(r.meta.is3d, false);
    const [box, complex] = r.features;
    assert.equal(box.kind, 'polygon');
    assert.equal(box.crs, 'projected');
    // lng = Đông (Y VN-2000), lat = Bắc (X VN-2000), đơn vị mét
    assert.deepEqual(box.rings[0][1], { lng: 586025.5, lat: 1158000, h: 0 });
    assert.equal(complex.rings[0].length, 301, 'chuỗi 12/14 được ghép thành một thửa');
    assert.ok(Math.abs(complex.rings[0][1].lng - 586129.9934) < 1e-3);
    assert.equal(r.features[2].kind, 'line');
    assert.equal(box.note, 'Lớp 0');
});

test('đọc DGN V7 3D', () => {
    const r = GisIO.readDgn(fixture('vn2000_3d.dgn'));
    assert.equal(r.ok, true);
    assert.equal(r.meta.is3d, true);
    assert.equal(r.counts.polygons, 2);
    assert.deepEqual(r.features[0].rings[0][2], { lng: 586026, lat: 1158041, h: 0 });
});

test('DGN V8 (OLE) và tệp hỏng được báo lỗi rõ ràng, không ném ngoại lệ', () => {
    const v8 = new Uint8Array([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0, 0, 0, 0]).buffer;
    assert.equal(GisIO.readDgn(v8).error, 'DGN_V8_CHUA_HO_TRO');
    assert.equal(GisIO.readDgn(new Uint8Array(10).buffer).error, 'DGN_KHONG_HOP_LE');
    assert.match(app, /DGN_V8_CHUA_HO_TRO[^\n]*Save As/);
});

test('ô chọn tệp GIS của MiniCAD và Dự án nhận .dgn, đọc dạng nhị phân', () => {
    assert.match(app, /ACCEPT: '[^']*\.dgn/);
    for (const id of ['cadFileInputGis', 'fileInputProjectGis']) {
        const tag = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))[0];
        assert.match(tag, /\.dgn/, id);
    }
    assert.match(app, /isDgn \? GisIO\.readDgn\(e\.target\.result\)/);
    assert.match(app, /if \(isDgn\) reader\.readAsArrayBuffer\(file\)/);
});

// ---------- Bản vẽ lớn ----------
test('bản vẽ lớn: chỉ dựng đỉnh/nhãn cạnh cho vùng đang xem, vẽ lại khi kéo bản đồ', () => {
    assert.match(app, /DETAIL_VERTEX_LIMIT: 1500/);
    assert.match(app, /this\._largeDrawing = totalVerts > this\.DETAIL_VERTEX_LIMIT/);
    assert.match(app, /map\.on\('moveend'[\s\S]{0,200}renderGeometry\(\{ persist: false \}\)/);
    // vẽ lại khi kéo bản đồ không ghi lại phiên làm việc
    assert.match(app, /renderGeometry\(opts = \{\}\) \{\s+if \(opts\.persist !== false\) this\.persistSession\(\);/);
});

test('bản vẽ quá lớn không sao chép sang sổ điểm (tránh đầy bộ nhớ)', () => {
    assert.match(app, /POINT_SYNC_VERTEX_LIMIT: 5000/);
    assert.match(app, /if \(totalVerts > this\.POINT_SYNC_VERTEX_LIMIT\)/);
});

// ---------- Lớp ranh giới trong MiniCAD ----------
test('MiniCAD hiện nút lớp tỉnh và xã Đồng Tháp; lớp không bắt chạm khi đang vẽ', () => {
    const fn = app.slice(app.indexOf('updateFabControlsVisibility('), app.indexOf('setReferenceLayersInteractive(on) {'));
    assert.match(fn, /btnMap34Prov/);
    assert.match(fn, /btnMapDtCommunes/);
    assert.match(fn, /this\.setReferenceLayersInteractive\(mode !== 'cad'\)/);
    assert.equal((app.match(/interactive: AppState\.mapMode !== 'cad'/g) || []).length >= 2, true);
});

// ---------- Nền bản đồ khi xuất ----------
const center = geo.convertWgsToVn2k(10.46, 105.63, KTT, K0);
const frame = { e0: center.Y - 300, e1: center.Y + 300, n0: center.X - 200, n1: center.X + 200 };

test('nguồn nền cho phép đọc chéo: OpenStreetMap và Esri World Imagery', () => {
    assert.match(EXPORT_BASEMAPS.street.url, /^https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png$/);
    assert.match(EXPORT_BASEMAPS.satellite.url, /World_Imagery\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}$/);
    assert.match(EXPORT_BASEMAPS.street.credit, /OpenStreetMap/);
    assert.match(EXPORT_BASEMAPS.satellite.credit, /Esri/);
});

test('chọn mức thu phóng theo độ nét bản vẽ và giới hạn số ô ảnh', () => {
    const plan = planExportBasemap('satellite', frame, 8, toLatLng);
    assert.equal(plan.z, 18, 'ảnh vệ tinh tối đa mức 18');
    assert.ok(plan.tiles.length > 0 && plan.tiles.length <= 160);
    assert.match(plan.tiles[0].url, /\/tile\/18\/\d+\/\d+$/);
    const street = planExportBasemap('street', frame, 8, toLatLng);
    assert.equal(street.z, 19);
    // cả tỉnh: tự hạ mức thu phóng để không tải quá nhiều ô
    const province = { e0: center.Y - 40000, e1: center.Y + 40000, n0: center.X - 30000, n1: center.X + 30000 };
    const big = planExportBasemap('street', province, 0.5, toLatLng);
    assert.ok(big.tiles.length <= 160 && big.z < 19);
    assert.equal(planExportBasemap('google', frame, 8, toLatLng), null);
});

test('ô ảnh được đặt đúng vị trí VN-2000 (sai số < 0.01 điểm ảnh tại góc xa)', () => {
    const plan = planExportBasemap('street', frame, 8, toLatLng);
    const toCanvas = (e, n) => ({ x: (e - frame.e0) * 8, y: (frame.n1 - n) * 8 });
    const t = plan.tiles[Math.floor(plan.tiles.length / 2)];
    const m = exportTileTransform(t, plan.z, toCanvas, toVn2k);
    const nz = Math.pow(2, plan.z);
    const lng = (t.x + 1) / nz * 360 - 180;
    const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (t.y + 1) / nz))) * 180 / Math.PI;
    const v = toVn2k(lat, lng), exact = toCanvas(v.e, v.n);
    assert.ok(Math.abs(m[0] * 256 + m[2] * 256 + m[4] - exact.x) < 0.01);
    assert.ok(Math.abs(m[1] * 256 + m[3] * 256 + m[5] - exact.y) < 0.01);
    // ô ảnh 256 px ở mức 19 ≈ 0.28 m/px → khoảng 2.2 px bản vẽ (8 px/m)
    assert.ok(m[0] > 1.8 && m[0] < 2.6, String(m[0]));
});

test('tải ô ảnh với crossOrigin, ô lỗi bị bỏ qua', async () => {
    const plan = { tiles: [{ url: 'ok/1' }, { url: 'bad/2' }, { url: 'ok/3' }] };
    const seen = [];
    class FakeImage {
        set src(u) { seen.push([u, this.crossOrigin]); setTimeout(() => (u.startsWith('ok') ? this.onload() : this.onerror()), 1); }
    }
    const bm = await loadExportBasemap(plan, { Image: FakeImage, timeoutMs: 500 });
    assert.equal(bm.loaded, 2);
    assert.equal(bm.failed, 1);
    assert.ok(seen.every(([, co]) => co === 'anonymous'));
});

test('vẽ nền: cắt theo khung bản đồ, bỏ ô lỗi, ghi nguồn', () => {
    const calls = [];
    const ctx = new Proxy({ measureText: () => ({ width: 100 }) }, {
        get(t, k) { if (k in t) return t[k]; return (...a) => calls.push([k, ...a]); },
        set(t, k, v) { calls.push(['set:' + String(k), v]); return true; }
    });
    const plan = planExportBasemap('satellite', frame, 8, toLatLng);
    plan.tiles.forEach((t, i) => { if (i % 2 === 0) t.img = {}; });
    const toCanvas = (e, n) => ({ x: (e - frame.e0) * 8, y: (frame.n1 - n) * 8 });
    const drawn = drawExportBasemap(ctx, plan, { x: 0, y: 0, w: 4800, h: 3200 }, toCanvas, toVn2k);
    assert.equal(drawn, Math.ceil(plan.tiles.length / 2));
    assert.deepEqual(calls.find(c => c[0] === 'rect'), ['rect', 0, 0, 4800, 3200]);
    assert.ok(calls.some(c => c[0] === 'clip'));
    assert.equal(calls.filter(c => c[0] === 'drawImage').length, drawn);
    assert.ok(calls.some(c => c[0] === 'fillText' && /Esri/.test(c[1])));
});

test('hộp thoại xuất có lựa chọn nền; PDF và PNG tải nền trước khi kết xuất', () => {
    const sel = html.match(/<select id="cadExportBasemap"[\s\S]*?<\/select>/)[0];
    for (const v of ['none', 'street', 'satellite']) assert.match(sel, new RegExp(`value="${v}"`));
    assert.match(app, /exportPdf\(opts = \{\}\)/);
    // lớp đã tải chỉ dùng cho LẦN XUẤT NÀY, giữ nguyên định dạng đích (không lưu lại giữa các lần xuất)
    assert.match(app, /bm => this\.exportPdf\(Object\.assign\(\{\}, opts, \{ basemap: bm \|\| \{ none: true \} \}\)\)/);
    assert.ok(!app.includes('_lastExportPdfOpts'), 'không còn nhớ lớp bản đồ của lần xuất trước');
    assert.match(app, /exportOptimizedImage\(customOpts = \{\}\) \{\s*return this\.exportPdf\(Object\.assign\(\{\}, customOpts, \{ target: 'image' \}\)\);/);
    assert.match(app, /const basemapVal = document\.getElementById\('cadExportBasemap'\)/);
    // nền vẽ ngay sau nền giấy trắng, trước khung/lưới/nét vẽ
    const pdf = app.slice(app.indexOf('    exportPdf(opts = {}) {'));
    assert.ok(pdf.indexOf('drawExportBasemap(') < pdf.indexOf('// 2. Khung Ngoài'));
});
