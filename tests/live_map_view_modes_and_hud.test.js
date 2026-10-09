const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');

test('=== 1. KIỂM THỬ THANH ĐIỀU KHIỂN 3 CHẾ ĐỘ XEM LIVE MAP (DOMINANT, SPLIT, FORM-ONLY) ===', () => {
    // 1.1 Thanh điều khiển chế độ xem
    assert.match(indexHtml, /id="transformViewModeBar"/, 'Phải có thanh điều khiển chế độ xem transformViewModeBar');
    assert.match(indexHtml, /id="btnTfModeMapDominant"/, 'Phải có nút chọn Bản đồ lớn (65%)');
    assert.match(indexHtml, /id="btnTfModeSplit"/, 'Phải có nút chọn Chia đôi (50/50)');
    assert.match(indexHtml, /id="btnTfModeFormOnly"/, 'Phải có nút chọn Chỉ Form');

    // 1.2 CSS rules cho 3 chế độ xem
    assert.match(indexHtml, /\.transform-split-layout\.mode-map-dominant/, 'Phải có CSS rule cho mode-map-dominant');
    assert.match(indexHtml, /\.transform-split-layout\.mode-split/, 'Phải có CSS rule cho mode-split');
    assert.match(indexHtml, /\.transform-split-layout\.mode-form-only/, 'Phải có CSS rule cho mode-form-only');

    // 1.3 JavaScript logic điều khiển chế độ xem
    assert.match(appJs, /setTransformViewMode\s*\(\s*mode\s*\)\s*\{/, 'appTransform phải có hàm setTransformViewMode(mode)');
    assert.match(appJs, /mode-map-dominant/, 'setTransformViewMode phải quản lý class mode-map-dominant');
    assert.match(appJs, /mode-split/, 'setTransformViewMode phải quản lý class mode-split');
    assert.match(appJs, /mode-form-only/, 'setTransformViewMode phải quản lý class mode-form-only');
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
