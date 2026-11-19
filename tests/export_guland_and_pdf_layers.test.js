const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

// Nạp geodesy, georef và planning_map
const geo = require('../geodesy.js');
Object.assign(global, geo);
const Georef = require('../src/core/georef.js');
global.Georef = Georef;
require('../src/core/planning_map.js');
if (global.window && global.window.appPlanning) global.appPlanning = global.window.appPlanning;
const { planExportBasemap, planExportGuland, loadExportBasemap, wrapTileProxyUrl, appPlanOverlay, EXPORT_BASEMAPS, AppState } = require('../app.js');

test('1. index.html contains all necessary UI elements for Guland and PDF layers in both export modals', () => {
    // MiniCAD modal elements
    assert.ok(html.includes('id="cadExportBasemap"'), 'Should have cadExportBasemap');
    assert.ok(html.includes('id="cadExportCheckGuland"'), 'Should have cadExportCheckGuland');
    assert.ok(html.includes('id="cadExportGulandConfigWrap"'), 'Should have cadExportGulandConfigWrap');
    assert.ok(html.includes('id="cadExportGulandProvince"'), 'Should have cadExportGulandProvince');
    assert.ok(html.includes('id="cadExportGulandOpacity"'), 'Should have cadExportGulandOpacity');
    assert.ok(html.includes('id="cadExportGulandLand"'), 'Should have cadExportGulandLand');
    assert.ok(html.includes('id="cadExportPlanOverlay"'), 'Should have cadExportPlanOverlay');
    assert.ok(html.includes('id="cadExportPlanOverlayCountBadge"'), 'Should have cadExportPlanOverlayCountBadge');
    assert.ok(html.includes('id="cadExportPlanOverlayList"'), 'Should have cadExportPlanOverlayList');

    // Project Map / Survey export modal elements
    assert.ok(html.includes('id="selExportBasemap"'), 'Should have selExportBasemap');
    assert.ok(html.includes('id="chkExportGulandPlanning"'), 'Should have chkExportGulandPlanning');
    assert.ok(html.includes('id="selExportGulandProvince"'), 'Should have selExportGulandProvince');
    assert.ok(html.includes('id="chkExportGulandLand"'), 'Should have chkExportGulandLand');
    assert.ok(html.includes('id="chkExportPlanOverlay"'), 'Should have chkExportPlanOverlay');
    assert.ok(html.includes('id="selExportPlanOverlayCountBadge"'), 'Should have selExportPlanOverlayCountBadge');
    assert.ok(html.includes('id="selExportPlanOverlayList"'), 'Should have selExportPlanOverlayList');
});

test('2. planExportGuland generates planning and land tiles correctly with bounding frame', () => {
    assert.strictEqual(typeof planExportGuland, 'function', 'planExportGuland must be a function');

    // Frame giả định ở Đồng Tháp (Cao Lãnh)
    const frame = { e0: 580000, e1: 585000, n0: 1150000, n1: 1155000 };
    const pxPerMeter = 0.5; // Tỷ lệ ~ 1:2000
    const toLatLng = (e, n) => {
        // Giả lập chuyển đổi sang WGS84 gần Cao Lãnh Đồng Tháp
        return {
            lat: 10.45 + (n - 1150000) * 0.000009,
            lng: 105.63 + (e - 580000) * 0.000009
        };
    };

    const plan = planExportGuland('dong-thap', frame, pxPerMeter, toLatLng, 100, true, 0.75);
    assert.ok(plan, 'Plan must not be null');
    assert.strictEqual(plan.kind, 'guland', 'Plan kind should be guland');
    assert.strictEqual(plan.province.slug, 'dong-thap', 'Province slug should be dong-thap');
    assert.strictEqual(plan.alpha, 0.75, 'Alpha opacity should be 0.75');
    assert.ok(plan.tiles.length > 0, 'Plan should contain tiles');
    assert.ok(plan.tiles.length <= 100, 'Tiles count must not exceed maxTiles limit');

    // Kiểm tra ngói quy hoạch
    const qhTile = plan.tiles.find(t => !t.isLand);
    assert.ok(qhTile, 'Must have planning tiles');
    assert.ok(qhTile.url.includes('dong-thap-2030'), 'Planning URL must match Dong Thap URL');
    assert.ok(qhTile.fallbackUrl, 'Must have fallback URL');

    // Kiểm tra ngói thửa đất
    const landTile = plan.tiles.find(t => t.isLand);
    assert.ok(landTile, 'Must have land tiles when showLand=true');
    assert.ok(landTile.url.includes('/land/dong-thap/'), 'Land URL must match Dong Thap landUrl');
});

test('3. planExportGuland handles invalid inputs safely without throwing', () => {
    assert.strictEqual(planExportGuland(null, null, 0, null), null);
    assert.strictEqual(planExportGuland('dong-thap', null, 1, () => ({ lat: 10, lng: 105 })), null);
    assert.strictEqual(planExportGuland('dong-thap', { e0: 0, e1: 1, n0: 0, n1: 1 }, -5, () => ({ lat: 10, lng: 105 })), null);
    assert.strictEqual(planExportGuland('dong-thap', { e0: 0, e1: 1, n0: 0, n1: 1 }, 1, () => ({ lat: NaN, lng: 105 })), null);
    assert.strictEqual(planExportGuland('dong-thap', { e0: 0, e1: 1, n0: 0, n1: 1 }, 1, () => ({ lat: Infinity, lng: 105 })), null);
    assert.strictEqual(planExportGuland('dong-thap', { e0: NaN, e1: 1, n0: 0, n1: 1 }, 1, () => ({ lat: 10, lng: 105 })), null);
});

test('4. appPlanOverlay.renderExportFileList renders file list with checkboxes and action buttons', () => {
    // Giả lập DOM container
    const dummyContainer = {
        id: 'cadExportPlanOverlayList',
        innerHTML: '',
        querySelectorAll: (sel) => {
            if (sel === '.chk-export-plan-item:checked' || sel === '.chk-export-plan-item') {
                return [
                    { checked: true, getAttribute: (attr) => (attr === 'data-id' ? 'pdf_01' : null), addEventListener: () => {} },
                    { checked: false, getAttribute: (attr) => (attr === 'data-id' ? 'pdf_02' : null), addEventListener: () => {} }
                ];
            }
            return [];
        }
    };

    const origGetElementById = global.document.getElementById;
    global.document.getElementById = (id) => {
        if (id === 'cadExportPlanOverlayList') return dummyContainer;
        if (id === 'cadExportPlanOverlayCountBadge') return { textContent: '', innerHTML: '' };
        if (id === 'cadExportPlanOverlayList_btnSelectAll') return { addEventListener: () => {} };
        if (id === 'cadExportPlanOverlayList_btnUnselectAll') return { addEventListener: () => {} };
        return null;
    };

    appPlanOverlay.items = [
        { id: 'pdf_01', name: 'BanDoQuyHoach_2030.pdf', w: 2000, h: 1500, visible: true, opacity: 0.7, source: 'points', points: [{ u: 0, v: 0, x: 10, y: 105 }] },
        { id: 'pdf_02', name: 'Trích lục thửa đất.pdf', w: 1600, h: 1200, visible: false, opacity: 0.8, source: 'worldfile', rms: 0.15 }
    ];

    appPlanOverlay.renderExportFileList('cadExportPlanOverlayList');
    assert.ok(dummyContainer.innerHTML.includes('BanDoQuyHoach_2030.pdf'), 'Should render item 1 name');
    assert.ok(dummyContainer.innerHTML.includes('Trích lục thửa đất.pdf'), 'Should render item 2 name');
    assert.ok(dummyContainer.innerHTML.includes('data-id="pdf_01"'), 'Should render data-id attribute');

    global.document.getElementById = origGetElementById;
});

test('5. appPlanOverlay.getSelectedExportIds returns filtered IDs correctly', () => {
    const dummyContainer = {
        querySelectorAll: (sel) => {
            if (sel === '.chk-export-plan-item') {
                return [
                    { checked: true, getAttribute: () => 'pdf_01' },
                    { checked: false, getAttribute: () => 'pdf_02' },
                    { checked: true, getAttribute: () => 'pdf_03' }
                ];
            }
            if (sel === '.chk-export-plan-item:checked') {
                return [
                    { checked: true, getAttribute: () => 'pdf_01' },
                    { checked: true, getAttribute: () => 'pdf_03' }
                ];
            }
            return [];
        }
    };

    const origGetElementById = global.document.getElementById;
    global.document.getElementById = (id) => (id === 'testContainer' ? dummyContainer : null);

    const selected = appPlanOverlay.getSelectedExportIds('testContainer');
    assert.deepStrictEqual(selected, ['pdf_01', 'pdf_03'], 'Should return selected IDs [pdf_01, pdf_03]');

    global.document.getElementById = origGetElementById;
});

test('6. appPlanOverlay.drawForExport filters files by selectedIds without drawing unselected files', () => {
    let drawImageCalls = 0;
    const fakeCtx = {
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        rect: () => {},
        clip: () => {},
        transform: () => {},
        drawImage: () => { drawImageCalls++; },
        globalAlpha: 1
    };

    if (AppState) {
        AppState.kttVal = 105;
        AppState.scaleFactor = 0.9999;
    }

    appPlanOverlay.items = [
        { id: 'pdf_01', visible: true, img: { complete: true, naturalWidth: 100 }, w: 100, h: 100, affine: { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0 }, ktt: 105, k0: 0.9999 },
        { id: 'pdf_02', visible: true, img: { complete: true, naturalWidth: 100 }, w: 100, h: 100, affine: { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0 }, ktt: 105, k0: 0.9999 },
        { id: 'pdf_03', visible: true, img: { complete: true, naturalWidth: 100 }, w: 100, h: 100, affine: { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0 }, ktt: 105, k0: 0.9999 }
    ];

    // Xuất chỉ định [pdf_02]
    const drawn = appPlanOverlay.drawForExport(fakeCtx, { x: 0, y: 0, w: 500, h: 500 }, (e, n) => ({ x: e, y: n }), ['pdf_02']);
    assert.strictEqual(drawn, 1, 'Should only draw 1 selected image');
    assert.strictEqual(drawImageCalls, 1, 'drawImage should be called once');

    // Xuất mảng rỗng [] (người dùng bỏ chọn tất cả)
    drawImageCalls = 0;
    const drawnEmpty = appPlanOverlay.drawForExport(fakeCtx, { x: 0, y: 0, w: 500, h: 500 }, (e, n) => ({ x: e, y: n }), []);
    assert.strictEqual(drawnEmpty, 0, 'Should draw 0 images when selectedIds is empty');
    assert.strictEqual(drawImageCalls, 0, 'drawImage should not be called');
});

test('7. loadExportBasemap retries with fallbackUrl when primary tile fails', async () => {
    let attempts = [];
    class FakeImage {
        constructor() {
            this._src = '';
            this.onload = null;
            this.onerror = null;
        }
        set src(val) {
            this._src = val;
            attempts.push(val);
            setTimeout(() => {
                if (val.includes('primary.cloud')) {
                    // Giả lập lỗi primary
                    if (typeof this.onerror === 'function') this.onerror();
                } else if (val.includes('fallback.cloud')) {
                    // Thành công ở fallback
                    if (typeof this.onload === 'function') this.onload();
                }
            }, 10);
        }
        get src() {
            return this._src;
        }
    }

    const fakePlan = {
        tiles: [
            { x: 10, y: 20, url: 'https://primary.cloud/10/20.png', fallbackUrl: 'https://fallback.cloud/10/20.png' }
        ]
    };

    const res = await loadExportBasemap(fakePlan, { Image: FakeImage, timeoutMs: 1000 });
    assert.strictEqual(res.loaded, 1, 'Tile should load successfully via fallback');
    assert.strictEqual(res.failed, 0, 'No tile failure');
    assert.ok(attempts.includes('https://primary.cloud/10/20.png'), 'Should attempt primary URL first');
    assert.ok(attempts.includes('https://fallback.cloud/10/20.png'), 'Should attempt fallback URL second');
});

test('10. wrapTileProxyUrl and api/tile-proxy prevent tainted canvas and enforce CORS whitelist', async () => {
    assert.strictEqual(typeof wrapTileProxyUrl, 'function', 'wrapTileProxyUrl must be exported');
    
    const rawGulandUrl = 'https://r4gmiynxmeobj.vcdn.cloud/dong-thap-2030/13/6499/3855.png';
    const osmUrl = 'https://tile.openstreetmap.org/13/6499/3855.png';
    
    // Giả lập window.location cho browser
    global.window.location = { protocol: 'http:', host: 'localhost:8080' };
    
    const wrappedGuland = wrapTileProxyUrl(rawGulandUrl);
    assert.ok(wrappedGuland.startsWith('/api/tile-proxy?url='), 'Guland CDN URL should be wrapped via proxy');
    assert.ok(wrappedGuland.includes(encodeURIComponent(rawGulandUrl)), 'Proxy query should contain encoded URL');

    // Không bọc lại nếu đã bọc rồi
    assert.strictEqual(wrapTileProxyUrl(wrappedGuland), wrappedGuland, 'Should not re-wrap already proxied URL');

    // Không bọc OSM (đã có CORS)
    assert.strictEqual(wrapTileProxyUrl(osmUrl), osmUrl, 'OpenStreetMap URL should not be proxied');

    // Kiểm tra Vercel Serverless Function api/tile-proxy.js
    const proxyHandler = require('../api/tile-proxy.js');
    assert.strictEqual(typeof proxyHandler, 'function', 'api/tile-proxy.js must export a handler');

    // Test 400 khi thiếu URL
    let statusCode = 200, resHeaders = {}, ended = false;
    const mockRes400 = {
        setHeader(k, v) { resHeaders[k] = v; },
        set statusCode(val) { statusCode = val; },
        end(data) { ended = true; }
    };
    await proxyHandler({ method: 'GET', url: '/api/tile-proxy', query: {}, headers: { host: 'localhost' } }, mockRes400);
    assert.strictEqual(statusCode, 400, 'Missing url query should return 400');

    // Test 403 khi domain không nằm trong whitelist
    statusCode = 200;
    const mockRes403 = {
        setHeader(k, v) { resHeaders[k] = v; },
        set statusCode(val) { statusCode = val; },
        end(data) { ended = true; }
    };
    await proxyHandler({ method: 'GET', url: '/api/tile-proxy?url=https://evil-attacker.com/malicious.png', query: { url: 'https://evil-attacker.com/malicious.png' }, headers: { host: 'localhost' } }, mockRes403);
    assert.strictEqual(statusCode, 403, 'Non-whitelisted domain should return 403 Forbidden');
});
