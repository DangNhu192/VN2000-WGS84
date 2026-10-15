/**
 * KIỂM THỬ NÂNG CẤP CHẤT LƯỢNG HÌNH ẢNH BẢN ĐỒ KHI PHÓNG TO SÂU
 * Khắc phục hiện tượng vỡ hạt ô vuông pixel lớn, hình ảnh không rõ nét
 * Căn cứ tài liệu:
 * 1. lequocdien/XuLyHinhAnh (Chương 3: Xử lý miền không gian, Laplacian sharpening, Cân bằng tương phản s = T(r))
 * 2. jrvansuita/GaussianBlur (Khử nhiễu bậc thang pixel thô, làm mịn ô vuông pixelation)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ BỘ LỌC SVG SPATIAL & GAUSSIAN ENGINE (INDEX.HTML) ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1.1 Khung chứa filter SVG
    assert.ok(html.includes('id="mapFiltersDef"'), 'index.html phải có thẻ svg id="mapFiltersDef"');

    // 1.2 Bộ lọc mapTileEnhancer chuẩn kết hợp Gaussian Blur + Laplacian Kernel
    assert.ok(html.includes('id="mapTileEnhancer"'), 'Phải có filter id="mapTileEnhancer"');
    assert.ok(html.includes('feGaussianBlur'), 'Filter phải có feGaussianBlur để khử ô vuông pixel bậc thang');
    assert.ok(html.includes('stdDeviation="0.4"'), 'feGaussianBlur phải có stdDeviation hợp lý (0.4) chống mờ nhòe');
    assert.ok(html.includes('feConvolveMatrix'), 'Filter phải có feConvolveMatrix ma trận tích chập Laplacian');
    assert.ok(html.includes('feComponentTransfer'), 'Filter phải có feComponentTransfer để cân bằng dải màu tương phản');

    // 1.3 Bộ lọc mapTileHighContrast
    assert.ok(html.includes('id="mapTileHighContrast"'), 'Phải có filter tương phản cao id="mapTileHighContrast"');

    // 1.4 Giao diện điều khiển trong tab PixOptimizer
    assert.ok(html.includes('id="selOptimizerMapEnhance"'), 'Phải có dropdown chọn chế độ nâng cấp ảnh selOptimizerMapEnhance');
    assert.ok(html.includes('value="gaussian_hd"'), 'Dropdown phải có tùy chọn gaussian_hd');
    assert.ok(html.includes('value="contrast"'), 'Dropdown phải có tùy chọn contrast');
    assert.ok(html.includes('value="natural"'), 'Dropdown phải có tùy chọn natural');
    assert.ok(html.includes('id="chkOptimizerHiDpi"'), 'Phải có checkbox nạp tile Retina 2x chkOptimizerHiDpi');
});

test('=== 2. KIỂM THỬ KHẮC PHỤC VỠ HẠT Ô VUÔNG TRONG CSS (STYLE.CSS) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 2.1 Loại bỏ hoàn toàn crisp-edges (nearest-neighbor) gây ra các ô vuông pixel khổng lồ
    assert.ok(!css.includes('image-rendering: crisp-edges;'), 'Tuyệt đối không được chứa image-rendering: crisp-edges');

    // 2.2 Nội suy mượt mà từ GPU cho tile container
    assert.ok(css.includes('image-rendering: auto;'), 'Phải có image-rendering: auto để GPU nội suy bilinear/bicubic mượt mà');
    assert.ok(css.includes('transform: translateZ(0);'), 'Phải kích hoạt GPU acceleration bằng transform: translateZ(0)');

    // 2.3 Các class áp dụng hiệu ứng nâng cao
    assert.ok(css.includes('.map-deep-zoom-enhanced'), 'Phải có class .map-deep-zoom-enhanced khi zoom sâu >= 19');
    assert.ok(css.includes('.map-enhance-gaussian'), 'Phải có class .map-enhance-gaussian');
    assert.ok(css.includes('.map-enhance-contrast'), 'Phải có class .map-enhance-contrast');
    assert.ok(css.includes('.map-enhance-natural'), 'Phải có class .map-enhance-natural');
    assert.ok(css.includes('.map-enhance-none'), 'Phải có class .map-enhance-none');
    assert.ok(css.includes('url(#mapTileEnhancer)'), 'CSS phải tham chiếu bộ lọc filter: url(#mapTileEnhancer)');
});

test('=== 3. KIỂM THỬ ĐỘNG CƠ PIXOPTIMIZER NÂNG CẤP BẢN ĐỒ (PIXOPTIMIZER.JS) ===', () => {
    const PixOptimizer = require('../pixoptimizer.js');

    // 3.1 Cài đặt mặc định
    assert.equal(PixOptimizer.settings.mapEnhanceMode, 'gaussian_hd', 'Mặc định mapEnhanceMode phải là gaussian_hd');
    assert.equal(typeof PixOptimizer.settings.highResTiles, 'boolean', 'highResTiles phải là boolean');

    // 3.2 Tối ưu native zoom không bị vỡ hạt
    const tileOpts = PixOptimizer.getTileLayerOptions();
    assert.ok(tileOpts.maxNativeZoom >= 20, 'maxNativeZoom phải tối thiểu 20 để tải ảnh gốc từ Google Maps');
    assert.equal(tileOpts.maxZoom, 24, 'maxZoom hỗ trợ tới 24');

    // 3.3 Phương thức cấp URL ảnh vệ tinh Retina 2x
    assert.equal(typeof PixOptimizer.getSatelliteUrlTemplate, 'function', 'Phải có hàm getSatelliteUrlTemplate');
    const normalUrl = PixOptimizer.getSatelliteUrlTemplate();
    assert.ok(normalUrl.includes('google.com/vt'), 'URL template phải trỏ tới Google tile');

    // 3.4 Phương thức gắn bộ lọc động applyMapEnhancement
    assert.equal(typeof PixOptimizer.applyMapEnhancement, 'function', 'Phải có hàm applyMapEnhancement');
    assert.equal(typeof PixOptimizer.updateAllRegisteredMaps, 'function', 'Phải có hàm updateAllRegisteredMaps');

    // 3.5 Giả lập kiểm thử applyMapEnhancement trên Mock Map
    let attachedEvent = null;
    let eventHandler = null;
    let currentZoom = 20;
    const classList = new Set();
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
            attachedEvent = ev;
            eventHandler = fn;
        }
    };

    PixOptimizer.applyMapEnhancement(mockMap);
    assert.equal(attachedEvent, 'zoomend', 'Phải lắng nghe sự kiện zoomend trên map');
    assert.ok(classList.has('map-deep-zoom-enhanced'), 'Ở zoom 20, container phải có class map-deep-zoom-enhanced');
    assert.ok(classList.has('map-enhance-gaussian'), 'Container phải có class map-enhance-gaussian');

    // Giả lập zoom nhỏ lại mức 15
    currentZoom = 15;
    eventHandler();
    assert.ok(!classList.has('map-deep-zoom-enhanced'), 'Ở zoom 15, không được có class map-deep-zoom-enhanced');
});

test('=== 4. KIỂM THỬ TÍCH HỢP TOÀN BỘ PHÂN HỆ BẢN ĐỒ TRONG APP.JS ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    // 4.1 Quản trị modal cài đặt
    assert.ok(appJs.includes('selOptimizerMapEnhance'), 'app.js phải nạp giá trị selOptimizerMapEnhance');
    assert.ok(appJs.includes('chkOptimizerHiDpi'), 'app.js phải xử lý chkOptimizerHiDpi');
    assert.ok(appJs.includes('updateAllRegisteredMaps'), 'saveOptimizerSettings phải gọi updateAllRegisteredMaps');

    // 4.2 Áp dụng trên Bản đồ Live Map
    assert.ok(appJs.includes('applyMapEnhancement(this._liveMap)'), 'LiveMap phải được đăng ký applyMapEnhancement');

    // 4.3 Áp dụng trên Bản đồ Chuyển đổi Tọa độ
    assert.ok(appJs.includes('applyMapEnhancement(this.map)'), 'TransformMap phải được đăng ký applyMapEnhancement');

    // 4.4 Áp dụng trên Bản đồ Chính (Dự án & CAD)
    assert.ok(appJs.includes('applyMapEnhancement(map)'), 'Bản đồ chính AppState.leafletMap phải được đăng ký applyMapEnhancement');

    // 4.5 Áp dụng trên MiniMap Cắm mốc Stakeout
    assert.ok(appJs.includes('applyMapEnhancement(this.miniMap)'), 'MiniMap stakeout phải được đăng ký applyMapEnhancement');

    // 4.6 Áp dụng trên Kính lúp Loupe MiniCAD
    assert.ok(appJs.includes('applyMapEnhancement(loupe)'), 'Kính lúp CAD Loupe phải được đăng ký applyMapEnhancement');
});
