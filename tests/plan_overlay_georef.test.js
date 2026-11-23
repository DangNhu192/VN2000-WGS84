// Ảnh nền bản đồ quy hoạch trong MiniCAD (v2.8.38): gắn tọa độ ảnh/PDF theo VN-2000 bằng tệp
// .jgw/.pgw/.tfw hoặc điểm khống chế, phủ lên bản đồ MiniCAD và in làm nền khi xuất PDF/PNG.
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
const Georef = require('../src/core/georef.js');
const geo = require('../geodesy.js');
global.Georef = Georef;
global.convertVn2kToWgs = geo.convertVn2kToWgs;
global.convertWgsToVn2k = geo.convertWgsToVn2k;
const { appPlanOverlay, AppState } = require('../app.js');

// Ảnh 0.5 m/điểm ảnh, xoay 2°, góc trên-trái tại Đông 586000, Bắc 1159000
const th = 2 * Math.PI / 180, k = 0.5;
const TRUTH = { a: k * Math.cos(th), b: k * Math.sin(th), c: 586000, d: k * Math.sin(th), e: -k * Math.cos(th), f: 1159000 };
const near = (x, y, tol, msg) => assert.ok(Math.abs(x - y) <= tol, `${msg || ''} ${x} ≠ ${y}`);
const cp = (u, v) => ({ u, v, ...Georef.applyAffine(TRUTH, u, v) });

test('tệp tọa độ (world file): đọc, quy về góc điểm ảnh, ghi lại khớp', () => {
    const C = TRUTH.c + 0.5 * TRUTH.a + 0.5 * TRUTH.b, F = TRUTH.f + 0.5 * TRUTH.d + 0.5 * TRUTH.e;
    const wf = Georef.parseWorldFile([TRUTH.a, TRUTH.d, TRUTH.b, TRUTH.e, C, F].join('\r\n'));
    const m = Georef.worldFileToAffine(wf);
    for (const key of Object.keys(TRUTH)) near(m[key], TRUTH[key], 1e-9, key);
    const back = Georef.worldFileToAffine(Georef.parseWorldFile(Georef.affineToWorldFile(m)));
    for (const key of Object.keys(TRUTH)) near(back[key], TRUTH[key], 1e-6, key);
    assert.equal(Georef.parseWorldFile('1\n0\n0\n-1\nabc\n5'), null);
    assert.equal(Georef.parseWorldFile('1\n0\n0'), null);
});

test('tệp tọa độ ghi (X Bắc, Y Đông) được tự đảo về (Đông, Bắc)', () => {
    const wf = Georef.parseWorldFile('0\n0.5\n-0.5\n0\n1159000\n586000');
    assert.equal(wf.swapped, true);
    assert.equal(wf.C, 586000);
    assert.equal(wf.F, 1159000);
});

test('2 điểm khống chế: dời + xoay + tỉ lệ đều, khớp tuyệt đối với ảnh không méo', () => {
    const r = Georef.fitAffine([cp(100, 1200), cp(2000, 600)]);
    assert.equal(r.method, 'similarity');
    assert.equal(r.rms, null, '2 điểm chưa kiểm tra được sai số');
    for (const key of Object.keys(TRUTH)) near(r.affine[key], TRUTH[key], 1e-6, key);
    near(r.scale, 0.5, 1e-9);
});

test('≥ 3 điểm: affine bình phương tối thiểu, sai số từng điểm', () => {
    const pts = [cp(150, 1200), cp(1950, 1270), cp(1980, 670), cp(180, 600)];
    const exact = Georef.fitAffine(pts);
    assert.equal(exact.method, 'affine');
    near(exact.rms, 0, 1e-6);
    pts[3].e += 1;   // nhập sai 1 m ở điểm 4
    const noisy = Georef.fitAffine(pts);
    assert.ok(noisy.rms > 0.2 && noisy.rms < 0.3, String(noisy.rms));
    assert.equal(noisy.residuals.length, 4);
    assert.equal(Georef.fitAffine([cp(0, 0), cp(10, 10), cp(20, 20)]).error, 'DIEM_THANG_HANG');
    assert.equal(Georef.fitAffine([cp(5, 5), cp(5, 5)]).error, 'DIEM_TRUNG_NHAU');
    assert.equal(Georef.fitAffine([cp(5, 5)]).error, 'CAN_IT_NHAT_2_DIEM');
    const inv = Georef.invertAffine(TRUTH);
    const g = Georef.applyAffine(TRUTH, 321, 654), back = Georef.applyAffine(inv, g.e, g.n);
    near(back.e, 321, 1e-6); near(back.n, 654, 1e-6);
});

test('nhận diện tệp tọa độ đi kèm ảnh theo tên', () => {
    for (const n of ['a.jgw', 'B.PGW', 'c.tfw', 'd.wld', 'e.jpgw', 'f.pngw']) assert.ok(Georef.isWorldFileName(n), n);
    assert.ok(!Georef.isWorldFileName('a.jpg'));
    assert.equal(Georef.baseName('To_12.JPG'), Georef.baseName('to_12.jgw'));
});

const item = { w: 2400, h: 1600, affine: TRUTH, ktt: 105.75, k0: 0.9999, opacity: 0.6, visible: true, img: { complete: true, naturalWidth: 2400 } };

test('in ảnh nền: ma trận đặt ảnh khớp tọa độ bản vẽ, cắt theo khung', () => {
    AppState.kttVal = 105.75; AppState.scaleFactor = 0.9999;
    const toCanvas = (e, n) => ({ x: (e - 586000) * 4, y: (1159000 - n) * 4 });
    const m = appPlanOverlay.matrixFrom(item, (u, v) => { const g = appPlanOverlay.pixelToProjectEN(item, u, v); return toCanvas(g.e, g.n); });
    const at = (u, v) => ({ x: m[0] * u + m[2] * v + m[4], y: m[1] * u + m[3] * v + m[5] });
    const g = Georef.applyAffine(TRUTH, 1500, 900), want = toCanvas(g.e, g.n), got = at(1500, 900);
    near(got.x, want.x, 1e-6); near(got.y, want.y, 1e-6);

    const calls = [];
    const ctx = new Proxy({}, { get: (t, k) => (...a) => calls.push([k, ...a]), set: (t, k, v) => { calls.push(['set:' + String(k), v]); return true; } });
    appPlanOverlay.items = [item, { ...item, visible: false }];
    assert.equal(appPlanOverlay.drawForExport(ctx, { x: 10, y: 20, w: 300, h: 200 }, toCanvas), 1, 'ảnh đang ẩn không in');
    assert.deepEqual(calls.find(c => c[0] === 'rect'), ['rect', 10, 20, 300, 200]);
    assert.ok(calls.some(c => c[0] === 'clip'));
    assert.deepEqual(calls.find(c => c[0] === 'set:globalAlpha'), ['set:globalAlpha', 0.6]);
    assert.equal(calls.filter(c => c[0] === 'drawImage').length, 1);
    appPlanOverlay.items = [];
});

test('ảnh gắn theo KTT khác KTT bản vẽ được quy đổi qua kinh độ/vĩ độ', () => {
    AppState.kttVal = 105.0; AppState.scaleFactor = 0.9999;
    const g = appPlanOverlay.pixelToProjectEN(item, 0, 0);
    const w = geo.convertVn2kToWgs(1159000, 586000, 105.75, 0.9999);
    const p = geo.convertWgsToVn2k(w.lat, w.lng, 105.0, 0.9999);
    near(g.e, p.Y, 1e-6); near(g.n, p.X, 1e-6);
    assert.ok(Math.abs(g.e - 586000) > 1000, 'KTT khác → tọa độ khác');
    AppState.kttVal = 105.75;
});

test('giao diện: nút trong MiniCAD, hộp thoại chấm điểm, tùy chọn in khi xuất', () => {
    assert.match(html, /onclick="appPlanOverlay\.open\(\)"[\s\S]{0,200}Ảnh nền quy hoạch/);
    const modal = html.slice(html.indexOf('id="modalPlanOverlay"'), html.indexOf('id="modalCadGisImport"'));
    for (const id of ['planOvFile', 'planOvKtt', 'planOvList', 'planOvViewer', 'planOvPoints', 'planOvFitInfo', 'planOvApply', 'planOvPage'])
        assert.match(modal, new RegExp(`id="${id}"`), id);
    assert.match(modal, /accept="[^"]*\.pdf[^"]*\.jgw[^"]*\.tfw/);
    assert.match(html, /id="cadExportPlanOverlay" checked/);
    assert.match(html, /<script src="src\/core\/georef\.js\?v=[\d.]+"><\/script>/);
    assert.match(read('sw.js'), /'\.\/src\/core\/georef\.js'/);
});

test('ảnh chỉ hiện trong MiniCAD, dưới nét vẽ, không bắt chạm; lưu IndexedDB', () => {
    assert.match(app, /if \(typeof appPlanOverlay !== 'undefined'\) appPlanOverlay\.onMapModeChange\(mode\);/);
    assert.match(app, /pane\.style\.zIndex = 250;/);
    assert.match(app, /pane\.style\.pointerEvents = 'none';/);
    assert.match(app, /className = 'plan-overlay-img leaflet-zoom-hide'/);
    assert.match(app, /DB_NAME: 'VN2000_PlanOverlayDB'/);
    // PDF: dựng ảnh bằng pdf.js tự lưu trữ; tệp tọa độ không áp cho PDF
    assert.match(app, /pdfjs: \{ src: 'vendor\/pdfjs\/pdf\.min\.js'/);
    assert.ok(fs.existsSync(path.join(root, 'vendor/pdfjs/pdf.min.js')) && fs.existsSync(path.join(root, 'vendor/pdfjs/pdf.worker.min.js')));
    assert.ok(fs.existsSync(path.join(root, 'vendor/pdfjs/LICENSE')));
    assert.match(app, /if \(wf && \/\\\.pdf\$\/i\.test\(file\.name\)\)/);
    // In: ảnh nền nằm sau nền bản đồ, trước khung/lưới
    const pdf = app.slice(app.indexOf('    exportPdf(opts = {}) {'));
    // (v2.8.50: vẽ qua bộ vẽ lớp chung drawExportMapLayers — ảnh nền PDF/ảnh là lớp cuối của nó)
    const layersFn = app.slice(app.indexOf('    drawExportMapLayers(ctx, loaded'), app.indexOf('    _getExportMeta() {'));
    assert.ok(layersFn.includes('appPlanOverlay.drawForExport(') && layersFn.indexOf('drawExportBasemap(') < layersFn.indexOf('appPlanOverlay.drawForExport('));
    assert.ok(pdf.indexOf('this.drawExportMapLayers(') > 0 && pdf.indexOf('this.drawExportMapLayers(') < pdf.indexOf('// 2. Khung Ngoài'));
    // Ảnh nén / PNG / SVG đi qua cùng bộ vẽ khổ giấy nên cũng có ảnh nền
    assert.match(app, /exportOptimizedImage\(customOpts = \{\}\) \{\s*return this\.exportPdf\(/);
});

test('bật/tắt lớp bản đồ PDF: toggleAll, isMasterVisible, checkboxes UI và lệnh CAD Craft', () => {
    // 1. Kiểm tra API master toggle trong appPlanOverlay
    assert.equal(typeof appPlanOverlay.toggleAll, 'function');
    assert.equal(typeof appPlanOverlay.isMasterVisible, 'function');
    assert.equal(appPlanOverlay.isMasterVisible(), true);
    appPlanOverlay.toggleAll(false, true);
    assert.equal(appPlanOverlay.isMasterVisible(), false);
    appPlanOverlay.toggleAll(true, true);
    assert.equal(appPlanOverlay.isMasterVisible(), true);

    // 2. Checkbox trong MiniCAD Tab 4 (cadPanelLayers)
    assert.match(html, /id="cadCheckShowPlanOverlay"/);
    assert.match(html, /onchange="appCadTool\.toggleDisplayOption\('showPlanOverlay', this\.checked\)"/);

    // 3. Nút bật/tắt nhanh trong MiniCAD Tab 3 (cadPanelStorage)
    assert.match(html, /id="btnCadTogglePlanOverlay"/);
    assert.match(html, /onclick="appPlanOverlay\.toggleAll\(\)"/);

    // 4. Nút bật tất cả / tắt tất cả trong modalPlanOverlay
    assert.match(html, /onclick="appPlanOverlay\.setAllItemsVisible\(true\)"/);
    assert.match(html, /onclick="appPlanOverlay\.setAllItemsVisible\(false\)"/);

    // 5. Công tắc master trong modalMapLayers
    assert.match(app, /mlPlanOverlayMaster/);
    assert.match(app, /appPlanOverlay\.toggleAll\(this\.checked\)/);

    // 6. Lệnh CADCraft CLI hỗ trợ 'PDF' và 'PLAN'
    assert.match(app, /case 'PDF':/);
    assert.match(app, /case 'PLAN':/);
});
