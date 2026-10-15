const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');

test('=== 1. KIỂM THỬ THANH KÉO THẢ LINH HOẠT DIỆN TÍCH FORM VÀ BẢN ĐỒ (RESIZER SPLITTER) ===', () => {
    // 1.1 DOM element thanh kéo thả phân chia diện tích
    assert.match(indexHtml, /id="transformLayoutResizer"/, 'Phải có thanh kéo thả phân chia diện tích transformLayoutResizer');
    assert.match(indexHtml, /id="btnResizerQuickToggle"/, 'Phải có nút thu gọn / mở rộng nhanh btnResizerQuickToggle');

    // 1.2 CSS rules cho resizer splitter
    assert.match(indexHtml, /\.transform-layout-resizer/, 'Phải có CSS rule cho transform-layout-resizer');
    assert.match(indexHtml, /\.resizer-handle-pill/, 'Phải có CSS rule cho resizer-handle-pill');

    // 1.3 JavaScript logic điều khiển kéo thả diện tích
    assert.match(appJs, /initResizer\s*\(/, 'appTransform phải có hàm initResizer() để điều khiển kéo thả diện tích');
    assert.match(appJs, /applySplitRatio\s*\(/, 'appTransform phải có hàm applySplitRatio() áp dụng tỷ lệ');
    assert.match(appJs, /setTransformViewMode\s*\(\s*mode\s*\)\s*\{/, 'appTransform phải giữ tương thích hàm setTransformViewMode(mode)');
});

test('=== 2. KIỂM THỬ FLOATING HUD TỌA ĐỘ TRỰC QUAN TRÊN LIVE MAP ===', () => {
    // 2.1 DOM element HUD
    assert.match(indexHtml, /id="liveMapCoordHud"/, 'Phải có phần tử hiển thị tọa độ tức thời liveMapCoordHud');
    assert.match(indexHtml, /\.live-map-coord-hud/, 'Phải có CSS class live-map-coord-hud');

    // 2.2 JS Event wiring
    assert.match(appJs, /liveMapCoordHud/, 'appTransform phải đồng bộ tọa độ vào liveMapCoordHud');
    assert.match(appJs, /this\._liveMap\.on\('mousemove'/, 'Bản đồ Live Map phải có event mousemove cập nhật HUD');
    assert.match(appJs, /this\._liveMap\.on\('click'/, 'Bản đồ Live Map phải có event click chọn tọa độ');
});

test('=== 3. KIỂM THỬ CÔ LẬP TRIỆT ĐỂ MINICAD KHỎI BẢN ĐỒ DỰ ÁN VÀ MỐC ===', () => {
    // 3.1 CSS rule chặn toàn bộ công cụ MiniCAD khi không ở chế độ CAD
    assert.match(indexHtml, /#map-view-container:not\(\.cad-active-map\)\s*#mapCadToolbar/, 'CSS phải ẩn mapCadToolbar khi không ở cad-active-map');
    assert.match(indexHtml, /#map-view-container:not\(\.cad-active-map\)\s*#cadStatusHud/, 'CSS phải ẩn cadStatusHud khi không ở cad-active-map');
    assert.match(indexHtml, /#map-view-container:not\(\.cad-active-map\)\s*#cadThumbActionBar/, 'CSS phải ẩn cadThumbActionBar khi không ở cad-active-map');
});
