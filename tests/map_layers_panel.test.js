// Lớp bản đồ: chọn nền (Google, Esri, OSM, không nền), bật/tắt lớp phủ hạ tầng (Giao thông, Đường & Nhãn, Luồng thủy), nguồn tự thêm WMS/XYZ có ghi nguồn + xác nhận được phép.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const app = read('app.js');
const html = read('index.html');

const store = {};
const els = {};
global.document = { getElementById: id => els[id] || null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = { addEventListener() {} };
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.confirm = () => true;

// Leaflet tối giản đủ cho appMapLayers
const made = [];
function fakeLayer(url, opt, wms) {
    const l = { _url: url, options: opt, wms, opacity: opt.opacity, onMap: false,
        addTo(m) { m._layers.add(this); return this; }, setOpacity(o) { this.opacity = o; }, setUrl(u) { this._url = u; },
        bringToBack() {}, once() {} };
    made.push(l);
    return l;
}
global.L = {
    tileLayer: Object.assign((url, opt) => fakeLayer(url, opt, false), { wms: (url, opt) => fakeLayer(url, opt, true) }),
    control: { attribution: () => ({ addTo() { return this; }, addAttribution() {}, removeAttribution() {} }) }
};
const classes = new Set();
const map = {
    _layers: new Set(), panes: {},
    hasLayer(l) { return this._layers.has(l); }, removeLayer(l) { this._layers.delete(l); },
    getCenter() { return { lat: 10.46, lng: 105.63 }; }, getZoom() { return 13; },
    getPane(n) { return this.panes[n]; }, createPane(n) { return (this.panes[n] = { style: {} }); },
    getContainer() { return { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } }; }
};

const { appMapLayers, MAP_BASES, AppState, EXPORT_BASEMAPS } = require('../app.js');
AppState.leafletMap = map;
const google = fakeLayer('https://google/{z}', { opacity: 1 });
AppState.baseLayers = { google_hybrid: google, esri_satellite: fakeLayer('https://esri/{z}', {}), osm_streets: fakeLayer('https://osm/{z}', {}) };
google.addTo(map);
global.appSettings = { save() {} };

test('nền: danh sách lựa chọn chất lượng cao tại VN, Google Streets / OpenTopoMap tạo khi cần, "Không nền" gỡ hết', () => {
    assert.ok(['google_hybrid', 'esri_satellite', 'google_streets', 'opentopomap', 'google_terrain', 'osm_streets', 'none'].every(id => MAP_BASES.some(b => b.id === id)));
    assert.ok(!MAP_BASES.some(b => b.id === 's2_2016'), 'Sentinel-2 2016 độ phân giải thấp đã được gỡ khỏi danh sách nền');
    const gs = MAP_BASES.find(b => b.id === 'google_streets');
    assert.match(gs.url, /lyrs=m/);
    assert.match(gs.attribution, /Google/);
    assert.equal(gs.maxNativeZoom, 20);
    appMapLayers.setBase('google_streets', true);
    assert.equal(AppState.activeBaseLayerId, 'google_streets');
    assert.ok(!map.hasLayer(google), 'nền Google Hybrid cũ được gỡ');
    assert.ok(map.hasLayer(AppState.baseLayers.google_streets));
    assert.equal(AppState.baseLayers.google_streets.options.maxNativeZoom, 20);
    appMapLayers.setBase('s2_2016', true);
    assert.equal(AppState.activeBaseLayerId, 'google_hybrid', 's2_2016 cũ tự động fallback về google_hybrid');
    appMapLayers.setBase('none', true);
    assert.equal([...map._layers].length, 0);
    assert.ok(classes.has('map-base-none'));
    appMapLayers.setBase('khong-co', true);
    assert.equal(AppState.activeBaseLayerId, 'google_hybrid', 'mã lạ → nền mặc định');
    assert.ok(google.options.attribution, 'nền có ghi nguồn');
});

test('lớp phủ giao thông & thủy văn: bật/tắt, độ rõ, lưu lại', () => {
    appMapLayers.setOverlay('esri_transport', true);
    const et = appMapLayers.layers.esri_transport;
    assert.match(et._url, /World_Transportation/);
    assert.equal(et.options.pane, 'refOverlayPane');
    assert.equal(map.panes.refOverlayPane.style.zIndex, 240);
    assert.match(et.options.attribution, /Esri/);
    appMapLayers.setOpacity('esri_transport', 0.85);
    assert.equal(et.opacity, 0.85);

    appMapLayers.setOverlay('google_roads', true);
    const gr = appMapLayers.layers.google_roads;
    assert.match(gr._url, /lyrs=h/);
    assert.equal(gr.options.maxNativeZoom, 20);

    const saved = JSON.parse(store.vn2k_map_overlays_v1);
    assert.equal(saved.esri_transport.on, true);
    assert.equal(saved.esri_transport.opacity, 0.85);
    assert.equal(saved.google_roads.on, true);
    appMapLayers.setOverlay('esri_transport', false);
    assert.ok(!appMapLayers.layers.esri_transport && !map.hasLayer(et));
});

test('nguồn tự thêm: bắt buộc https, ghi nguồn và xác nhận được phép', () => {
    const set = (vals) => { Object.keys(els).forEach(k => delete els[k]); Object.entries(vals).forEach(([k, v]) => { els[k] = typeof v === 'boolean' ? { checked: v } : { value: v }; }); };
    const n0 = appMapLayers.state.custom.length;
    set({ mlNewType: 'xyz', mlNewName: 'Guland', mlNewUrl: 'https://tiles.example/{z}/{x}/{y}.png', mlNewAttr: '© Đơn vị', mlNewLicensed: false });
    assert.equal(appMapLayers.addCustomFromForm(), false, 'chưa xác nhận được phép');
    set({ mlNewType: 'xyz', mlNewName: 'A', mlNewUrl: 'http://tiles.example/{z}/{x}/{y}.png', mlNewAttr: '© A', mlNewLicensed: true });
    assert.equal(appMapLayers.addCustomFromForm(), false, 'không nhận http');
    set({ mlNewType: 'xyz', mlNewName: 'A', mlNewUrl: 'https://tiles.example/{z}/{x}/{y}.png', mlNewAttr: '', mlNewLicensed: true });
    assert.equal(appMapLayers.addCustomFromForm(), false, 'thiếu ghi nguồn');
    set({ mlNewType: 'wms', mlNewName: 'Sở', mlNewUrl: 'https://gis.example/wms', mlNewLayers: '', mlNewAttr: '© Sở', mlNewLicensed: true });
    assert.equal(appMapLayers.addCustomFromForm(), false, 'WMS cần tên lớp');
    set({ mlNewType: 'wms', mlNewName: 'Sở', mlNewUrl: 'https://gis.example/wms', mlNewLayers: 'qhsdd', mlNewAttr: '© Sở', mlNewLicensed: true });
    assert.equal(appMapLayers.addCustomFromForm(), true);
    assert.equal(appMapLayers.state.custom.length, n0 + 1);
    const c = appMapLayers.state.custom[n0];
    const layer = appMapLayers.layers[c.id];
    assert.equal(layer.wms, true);
    assert.equal(layer.options.layers, 'qhsdd');
    assert.equal(layer.options.transparent, true);
    appMapLayers.removeCustom(c.id);
    assert.ok(!appMapLayers.layers[c.id]);
});

test('giao diện: nút lớp mở bảng; cài đặt nhận nền mới; ghi nguồn bật lại trên bản đồ chính', () => {
    assert.match(html, /id="btnMapFabLayer"[^>]*onclick="appMapLayers\.open\(\)"/);
    assert.match(html, /id="modalMapLayers"[\s\S]{0,600}id="mapLayersBody"/);
    assert.match(app, /\[.*'google_hybrid'.*'esri_satellite'.*'google_streets'.*'none'.*\]\.includes\(s\.activeBaseLayerId\)/);
    assert.match(app, /if \(typeof appMapLayers !== 'undefined'\) appMapLayers\.applyToMap\(map\);/);
    assert.match(app, /map\.attributionControl = this\._attr;/);
    assert.match(read('ui-unified.css'), /#mapLayersBody \.ml-switch/);
});

test('xuất bản vẽ: nền bản đồ kỹ thuật và Sentinel-2', () => {
    assert.match(EXPORT_BASEMAPS.sentinel2.url, /s2cloudless_3857/);
    assert.equal(EXPORT_BASEMAPS.sentinel2.maxZoom, 14);
    const sel = html.match(/<select id="cadExportBasemap"[\s\S]*?<\/select>/)[0];
    assert.match(sel, /value="sentinel2"/);
    // v2.8.50: nhận mọi nền của danh mục (không còn danh sách 3 nền cố định)
    assert.match(app, /const basemap = exportMapSource\(basemapVal\) \? basemapVal : 'none';/);
});
