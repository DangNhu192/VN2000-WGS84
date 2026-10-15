const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ ĐỘNG CƠ PIXOPTIMIZER CLIENT-SIDE (PIXOPTIMIZER.JS) ===', () => {
    const pixPath = path.join(ROOT_DIR, 'pixoptimizer.js');
    assert.ok(fs.existsSync(pixPath), 'Tệp pixoptimizer.js phải tồn tại trong thư mục gốc');

    const PixOptimizer = require(pixPath);
    assert.ok(PixOptimizer, 'PixOptimizer module phải export thành công');
    assert.equal(typeof PixOptimizer.init, 'function', 'Phải có hàm init()');
    assert.equal(typeof PixOptimizer.saveSettings, 'function', 'Phải có hàm saveSettings()');
    assert.equal(typeof PixOptimizer.compressCanvas, 'function', 'Phải có hàm compressCanvas()');
    assert.equal(typeof PixOptimizer.getTileLayerOptions, 'function', 'Phải có hàm getTileLayerOptions()');

    // Kiểm tra các mức chất lượng
    assert.equal(PixOptimizer.getQualityFloat('high'), 0.90, 'Mức high phải là 0.90');
    assert.equal(PixOptimizer.getQualityFloat('balanced'), 0.80, 'Mức balanced phải là 0.80');
    assert.equal(PixOptimizer.getQualityFloat('light'), 0.65, 'Mức light phải là 0.65');

    // Kiểm tra định dạng MIME & Extension
    assert.equal(PixOptimizer.getMimeType('webp'), 'image/webp');
    assert.equal(PixOptimizer.getMimeType('jpeg'), 'image/jpeg');
    assert.equal(PixOptimizer.getMimeType('png'), 'image/png');
    assert.equal(PixOptimizer.getFileExtension('webp'), 'webp');
    assert.equal(PixOptimizer.getFileExtension('jpeg'), 'jpg');
    assert.equal(PixOptimizer.getFileExtension('png'), 'png');

    // Kiểm tra định dạng byte thân thiện
    assert.equal(PixOptimizer.formatBytes(512), '512 B');
    assert.equal(PixOptimizer.formatBytes(1024 * 350), '350 KB');
    assert.equal(PixOptimizer.formatBytes(1024 * 1024 * 2.5), '2.5 MB');

    // Kiểm tra tùy chọn Leaflet mượt mà chống giật lag
    const tileOpts = PixOptimizer.getTileLayerOptions();
    assert.equal(tileOpts.updateWhenIdle, true, 'updateWhenIdle phải là true để không giật lag khi pan');
    assert.equal(tileOpts.updateWhenZooming, false, 'updateWhenZooming phải là false');
    assert.equal(tileOpts.keepBuffer, 3, 'keepBuffer phải giảm xuống 3 để tiết kiệm 75% RAM');
    assert.equal(tileOpts.maxZoom, 24);
    assert.ok(tileOpts.maxNativeZoom >= 20, 'maxNativeZoom phải nâng lên 20 để tải ảnh gốc native từ Google Maps chống vỡ hạt');
});

test('=== 2. KIỂM THỬ TÍCH HỢP GIAO DIỆN INDEX.HTML (SETTINGS & MINICAD EXPORT) ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Thẻ script nạp pixoptimizer.js
    assert.ok(html.includes('<script src="pixoptimizer.js"></script>'), 'index.html phải nạp script pixoptimizer.js');

    // 2. Tab Cài đặt PixOptimizer trong modalSettings
    assert.ok(html.includes('id="btnTabOptimizer"'), 'Phải có nút tab btnTabOptimizer trong modal cài đặt');
    assert.ok(html.includes('id="settingsTabContentOptimizer"'), 'Phải có vùng nội dung settingsTabContentOptimizer');
    assert.ok(html.includes('id="selOptimizerFormat"'), 'Phải có dropdown chọn định dạng selOptimizerFormat');
    assert.ok(html.includes('id="selOptimizerQuality"'), 'Phải có dropdown chọn chất lượng selOptimizerQuality');
    assert.ok(html.includes('id="selOptimizerMaxEdge"'), 'Phải có dropdown chọn giới hạn maxEdge');
    assert.ok(html.includes('id="chkOptimizerSmoothMap"'), 'Phải có checkbox chkOptimizerSmoothMap');
    assert.ok(html.includes('appModal.saveOptimizerSettings()'), 'Phải có nút gọi appModal.saveOptimizerSettings()');
    assert.ok(html.includes('appModal.clearTileCacheNow()'), 'Phải có nút gọi appModal.clearTileCacheNow()');

    // 3. Tùy chọn Xuất ảnh tối ưu trong modal xuất MiniCAD (modalCadExportConfig)
    assert.ok(html.includes('id="cadExportImgFormat"'), 'Modal MiniCAD phải có dropdown cadExportImgFormat');
    assert.ok(html.includes('id="cadExportImgQuality"'), 'Modal MiniCAD phải có dropdown cadExportImgQuality');
    assert.ok(html.includes('id="btnCadExportOptimizedImg"'), 'Phải có nút bấm btnCadExportOptimizedImg');
    assert.ok(html.includes('appCadTool.exportOptimizedImage()'), 'Nút tối ưu phải gọi appCadTool.exportOptimizedImage()');
});

test('=== 3. KIỂM THỬ LOGIC JAVASCRIPT APP.JS & MINICAD & CAMERA ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    // 1. Modal settings logic
    assert.ok(appJs.includes("'optimizer'"), 'tabList trong appModal.switchSettingsTab phải có optimizer');
    assert.ok(appJs.includes('initOptimizerSettingsUI'), 'appModal phải có hàm initOptimizerSettingsUI');
    assert.ok(appJs.includes('saveOptimizerSettings'), 'appModal phải có hàm saveOptimizerSettings');
    assert.ok(appJs.includes('clearTileCacheNow'), 'appModal phải có hàm clearTileCacheNow');

    // 2. MiniCAD exportOptimizedImage & exportPng
    assert.ok(appJs.includes('exportOptimizedImage(customOpts = {})'), 'appCadTool phải có hàm exportOptimizedImage');
    assert.ok(appJs.includes('exportPng()'), 'appCadTool vẫn giữ hàm exportPng tương thích ngược');
    assert.ok(appJs.includes('onExportImgSettingChange'), 'appCadTool phải có hàm onExportImgSettingChange');
    assert.ok(appJs.includes('PixOptimizer.compressCanvas'), 'appCadTool phải dùng PixOptimizer.compressCanvas');

    // 3. Tối ưu ảnh camera
    assert.ok(appJs.includes('maxEdge = (typeof window !== \'undefined\' && window.PixOptimizer)'), 'appCamera phải tự động clamp maxEdge để chống crash RAM');

    // 4. Tối ưu Leaflet map tileLayer options chống giật lag
    assert.ok(appJs.includes('window.PixOptimizer.getTileLayerOptions()'), 'Các lớp bản đồ Leaflet phải gọi getTileLayerOptions()');
});

test('=== 4. KIỂM THỬ SERVICE WORKER (SW.JS) OFFLINE ASSETS ===', () => {
    const swPath = path.join(ROOT_DIR, 'sw.js');
    const swContent = fs.readFileSync(swPath, 'utf8');

    assert.ok(swContent.includes("'./pixoptimizer.js'"), 'ASSETS_TO_CACHE trong sw.js phải chứa pixoptimizer.js');
});
