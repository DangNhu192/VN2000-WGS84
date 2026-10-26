/**
 * KIỂM THỬ TÍNH NĂNG CHỐNG GIẬT LAG KHI PHÓNG TO BẢN ĐỒ LỚN HƠN 20X (ZOOM 21 - 24)
 * Đảm bảo trải nghiệm zoom mượt mà 60 FPS, không nghẽn CPU/VRAM do SVG Convolve Matrix
 * Căn cứ:
 * - Chromium GPU Compositing & Skia Software Filter Fallback Standards
 * - Leaflet High-DPI TileLayer Scaling Performance Guidelines
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ LOGIC CLASS ĐIỀU PHỐI ZOOM TRONG PIXOPTIMIZER.JS ===', () => {
    const PixOptimizer = require('../pixoptimizer.js');
    assert.equal(typeof PixOptimizer.applyMapEnhancement, 'function');

    let currentZoom = 18;
    const classList = new Set();
    const eventHandlers = {};

    const mockContainer = {
        classList: {
            add: (c) => classList.add(c),
            remove: (...args) => args.forEach(c => classList.delete(c)),
            contains: (c) => classList.has(c)
        }
    };

    const mockMap = {
        getContainer: () => mockContainer,
        getZoom: () => currentZoom,
        on: (ev, fn) => {
            eventHandlers[ev] = fn;
        }
    };

    PixOptimizer.applyMapEnhancement(mockMap);

    // 1.1 Kiểm tra đăng ký sự kiện
    assert.ok(typeof eventHandlers['zoomend'] === 'function', 'Phải đăng ký sự kiện zoomend');
    assert.ok(typeof eventHandlers['zoomstart'] === 'function', 'Phải đăng ký sự kiện zoomstart để triệt tiêu giật lag khi đang zoom');

    // 1.2 Ở mức zoom 18: Chưa vào deep zoom
    assert.ok(!classList.has('map-deep-zoom-enhanced'), 'Ở zoom 18 không có class map-deep-zoom-enhanced');
    assert.ok(!classList.has('map-zoom-above-20'), 'Ở zoom 18 không có class map-zoom-above-20');

    // 1.3 Ở mức zoom 20: Kích hoạt deep zoom native
    currentZoom = 20;
    eventHandlers['zoomend']();
    assert.ok(classList.has('map-deep-zoom-enhanced'), 'Ở zoom 20 phải có class map-deep-zoom-enhanced');
    assert.ok(!classList.has('map-zoom-above-20'), 'Ở zoom 20 chưa vượt mức 20x nên không có map-zoom-above-20');

    // 1.4 Ở mức zoom lớn hơn 20x (21, 22, 23, 24): Bắt buộc kích hoạt map-zoom-above-20
    currentZoom = 22;
    eventHandlers['zoomend']();
    assert.ok(classList.has('map-deep-zoom-enhanced'), 'Ở zoom 22 phải có map-deep-zoom-enhanced');
    assert.ok(classList.has('map-zoom-above-20'), 'Ở zoom 22 phải có map-zoom-above-20 để chuyển sang GPU filter');

    // 1.5 Kiểm tra cơ chế map-is-zooming trong lúc đang animation zoom
    eventHandlers['zoomstart']();
    assert.ok(classList.has('map-is-zooming'), 'Khi zoomstart phải gắn class map-is-zooming');

    eventHandlers['zoomend']();
    assert.ok(!classList.has('map-is-zooming'), 'Khi zoomend phải gỡ bỏ class map-is-zooming');

    // 1.6 Khi thu nhỏ lại dưới 20: Tự động gỡ map-zoom-above-20
    currentZoom = 16;
    eventHandlers['zoomend']();
    assert.ok(!classList.has('map-zoom-above-20'), 'Khi thu nhỏ về 16 phải gỡ bỏ class map-zoom-above-20');
    assert.ok(!classList.has('map-deep-zoom-enhanced'), 'Khi thu nhỏ về 16 phải gỡ bỏ class map-deep-zoom-enhanced');
});

test('=== 2. KIỂM THỬ QUY TẮC CSS CHỐNG GIẬT LAG KHI ZOOM > 20X (STYLE.CSS) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 2.1 Tắt filter khi đang có chuyển động phóng to/thu nhỏ
    assert.ok(css.includes('.leaflet-zoom-anim .leaflet-tile-container img.leaflet-tile'), 'Phải có CSS rule cho .leaflet-zoom-anim');
    assert.ok(css.includes('.map-is-zooming .leaflet-tile-container img.leaflet-tile'), 'Phải có CSS rule cho .map-is-zooming');
    assert.ok(css.includes('filter: none !important;'), 'Phải tắt filter hoàn toàn khi đang zoom để đạt 60 FPS');

    // 2.2 Quy tắc GPU Native Filter siêu tốc cho zoom lớn hơn 20x
    assert.ok(css.includes('.map-zoom-above-20'), 'Phải có class selector .map-zoom-above-20');
    assert.ok(css.includes('.map-ultra-zoom'), 'Phải có alias .map-ultra-zoom');

    // 2.3 Không đặt will-change: transform tràn lan trên từng img tile con
    const imgTileRuleRegex = /\.leaflet-tile-container img\.leaflet-tile\s*\{([^}]+)\}/;
    const match = css.match(imgTileRuleRegex);
    assert.ok(match, 'Phải tìm thấy rule .leaflet-tile-container img.leaflet-tile');
    assert.ok(!match[1].includes('will-change: transform;'), 'Tuyệt đối không để will-change: transform trên từng img tile con tránh tràn VRAM');
});

test('=== 3. KIỂM THỬ CHỐNG LAYOUT THRASHING TRONG APP.JS (APPMAPZOOMINDICATOR) ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    // 3.1 appMapZoomIndicator sử dụng requestAnimationFrame
    assert.ok(appJs.includes('requestAnimationFrame(renderBadge)'), 'appMapZoomIndicator phải dùng requestAnimationFrame');

    // 3.2 Cache kích thước tránh recalculate layout liên tục
    assert.ok(appJs.includes('cachedWidth'), 'appMapZoomIndicator phải cache width để chống layout thrashing');
    assert.ok(appJs.includes('cachedHeight'), 'appMapZoomIndicator phải cache height để chống layout thrashing');
});
