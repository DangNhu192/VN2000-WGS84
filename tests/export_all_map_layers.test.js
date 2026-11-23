// v2.8.50: hộp xuất bản đồ (Xuất dữ liệu + Studio xuất MiniCAD) cho chọn ĐỦ các lớp của "Lớp bản đồ":
// 6 nền + Sentinel-2, lớp phủ ô ảnh (Esri giao thông, Google đường/nhãn, Google giao thông, nguồn tự thêm XYZ/WMS)
// và lớp ranh giới (34 tỉnh, xã Đồng Tháp). PDF/PNG của "Xuất dữ liệu" nay cũng vẽ nền + lớp phủ.
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
const geo = require('../geodesy.js');
const M = require('../app.js');

const KTT = 105.75, K0 = 0.9999;
const toLatLng = (e, n) => geo.convertVn2kToWgs(n, e, KTT, K0);
const toVn2k = (lat, lng) => { const v = geo.convertWgsToVn2k(lat, lng, KTT, K0); return { e: v.Y, n: v.X }; };
const c = toVn2k(10.46, 105.64);
const frame = { e0: c.e - 400, e1: c.e + 400, n0: c.n - 300, n1: c.n + 300 };

test('mọi nền in được của "Lớp bản đồ" đều có trong danh mục xuất (kèm tên cũ street/satellite)', () => {
    const printable = M.MAP_BASES.filter(b => b.id !== 'none').map(b => b.id);
    const cat = M.exportLayerCatalog();
    printable.forEach(id => assert.ok(cat.bases.some(b => b.id === id), `thiếu nền ${id}`));
    assert.ok(cat.bases.some(b => b.id === 'sentinel2'));
    assert.equal(M.exportMapSource('street'), M.EXPORT_BASEMAPS.osm_streets, 'cấu hình cũ "street" vẫn chạy');
    assert.ok(M.exportMapSource('satellite'));
    assert.equal(M.exportMapSource('none'), null);
    assert.equal(M.exportMapSource('khong_co'), null);
});

test('lớp phủ: Esri giao thông, Google đường & nhãn, Google giao thông, ranh 34 tỉnh, xã Đồng Tháp', () => {
    const ids = M.exportLayerCatalog().overlays.map(o => o.id);
    ['esri_transport', 'google_roads', 'google_traffic', 'prov34', 'dongthap'].forEach(id => assert.ok(ids.includes(id), id));
});

test('ô ảnh Google dùng tên miền con {s} và đủ z/x/y; nền Google in được ở mức thu phóng cao', () => {
    const pl = M.planExportBasemap('google_hybrid', frame, 2, toLatLng, 40);
    assert.ok(pl && pl.tiles.length > 0 && pl.z >= 15);
    pl.tiles.forEach(t => {
        assert.match(t.url, /^https:\/\/mt[0-3]\.google\.com\/vt\/lyrs=y&x=\d+&y=\d+&z=\d+$/);
    });
    const tr = M.planExportBasemap('esri_transport', frame, 2, toLatLng, 40);
    assert.match(tr.tiles[0].url, /World_Transportation\/MapServer\/tile\/\d+\/\d+\/\d+$/);
});

test('nguồn tự thêm XYZ / WMS in được: WMS tính BBOX EPSG:3857 theo từng ô', () => {
    const st = M.appMapLayers.load();
    st.custom = [
        { id: 'c_wms', type: 'wms', name: 'Địa chính WMS', url: 'https://wms.example.vn/geoserver/wms', layers: 'dc:thua', attribution: 'Sở TN&MT', opacity: 0.7, on: true },
        { id: 'c_xyz', type: 'xyz', name: 'Ảnh tự thêm', url: 'https://tiles.example.vn/{z}/{x}/{y}.png', attribution: '<b>Tôi</b>', opacity: 0.5, on: false }
    ];
    const ids = M.exportLayerCatalog().overlays;
    assert.ok(ids.some(o => o.id === 'custom:c_wms' && o.on === true));
    assert.ok(ids.some(o => o.id === 'custom:c_xyz' && o.on === false));
    const w = M.planExportBasemap('custom:c_wms', frame, 1, toLatLng, 30);
    assert.match(w.tiles[0].url, /SERVICE=WMS&REQUEST=GetMap.*LAYERS=dc%3Athua.*SRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX=-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$/);
    assert.equal(w.alpha, 0.7);
    const x = M.exportMapSource('custom:c_xyz');
    assert.equal(x.credit, 'Tôi', 'bỏ thẻ HTML khỏi dòng nguồn in trên ảnh');
    st.custom = [];
});

test('ranh giới GeoJSON: vẽ đối tượng trong khung, bỏ qua đối tượng ngoài khung', () => {
    const ring = (lat, lng, d) => [[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]];
    const geoJson = { features: [
        { properties: { ten_xa: 'Trong' }, geometry: { type: 'Polygon', coordinates: [ring(10.46, 105.64, 0.001)] } },
        { properties: { ten_xa: 'Xa' }, geometry: { type: 'MultiPolygon', coordinates: [[ring(21.0, 105.8, 0.01)]] } }
    ] };
    const calls = { stroke: 0, text: [] };
    const ctx = new Proxy({}, { get: (t, k) => {
        if (k === 'stroke') return () => { calls.stroke++; };
        if (k === 'fillText') return (s) => calls.text.push(s);
        if (k === 'measureText') return () => ({ width: 10 });
        return t[k] !== undefined ? t[k] : () => {};
    }, set: (t, k, v) => { t[k] = v; return true; } });
    const rect = { x: 0, y: 0, w: 800, h: 600 };
    const toCanvas = (e, n) => ({ x: e - frame.e0, y: frame.n1 - n });
    const box = M.exportFrameLatLngBox(frame, toLatLng);
    const n = M.drawExportVector(ctx, geoJson, rect, toCanvas, toVn2k, box, M.EXPORT_VECTOR_OVERLAYS.dongthap);
    assert.equal(n, 1);
    assert.equal(calls.stroke, 1);
    assert.deepEqual(calls.text, ['Trong']);
});

test('hai hộp xuất có danh sách lớp phủ; PDF/PNG của "Xuất dữ liệu" nay vẽ các lớp đã chọn', () => {
    assert.ok(html.includes('id="cadExportOverlayList"') && html.includes('id="selExportOverlayList"'));
    assert.ok(app.includes("fillExportBaseSelect('cadExportBasemap'") && app.includes("fillExportBaseSelect('selExportBasemap'"));
    assert.ok(app.includes("readExportOverlayChoice('cadExportOverlayList')") && app.includes("readExportOverlayChoice('selExportOverlayList')"));
    assert.ok(!app.includes("['street', 'satellite', 'sentinel2'].includes(basemapVal)"), 'bỏ danh sách 3 nền cố định');
    const pdf = app.slice(app.indexOf('    exportPdfFile(loadedLayers) {'), app.indexOf('    exportPngImage(loadedLayers) {'));
    const png = app.slice(app.indexOf('    exportPngImage(loadedLayers) {'), app.indexOf('    exportPngImage(loadedLayers) {') + 9000);
    assert.ok(pdf.includes('appCadTool.drawExportMapLayers(') && pdf.includes('_prepareExportBasemap('));
    assert.ok(png.includes('appCadTool.drawExportMapLayers(') && png.includes('_prepareExportBasemap('));
    assert.ok(pdf.indexOf("window.open('', '_blank')") < pdf.indexOf('_prepareExportBasemap('), 'mở cửa sổ in trước khi chờ tải ảnh (tránh bị chặn popup)');
    assert.equal((app.match(/this\.drawExportMapLayers\(ctx, /g) || []).length, 2, 'PDF + ảnh của MiniCAD dùng chung bộ vẽ lớp');
});
