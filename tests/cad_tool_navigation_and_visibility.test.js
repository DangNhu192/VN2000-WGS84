const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');

test('=== 1. KIỂM THỬ MENU 4.4 VẼ MINICAD & ĐIỀU HƯỚNG DRAWER ===', () => {
    // 1. Mục 4.4 trong Drawer Menu
    assert.match(indexHtml, /id="drawerItem_cad_tool"[^>]*onclick="appNav\.navigateTo\('cad_tool'\)"/, 
        'Drawer item 4.4 phải tồn tại và gắn hàm appNav.navigateTo("cad_tool")');

    // 2. appNav.navigateTo('cad_tool') kích hoạt openCadMap()
    assert.match(appJs, /action === 'cad_tool'[\s\S]*?appNav\.openCadMap\(\)/,
        'appNav.navigateTo("cad_tool") phải gọi appNav.openCadMap()');
});

test('=== 2. KIỂM THỬ KÍCH HOẠT CAD-ACTIVE-MAP & GỠ BỎ RÀO CHẮN CSS ===', () => {
    // 1. openCadMap() phải gắn class cad-active-map ngay lập tức
    assert.match(appJs, /openCadMap[\s\S]*?mapView\.classList\.add\('active',\s*'cad-active-map'\)/,
        'openCadMap() phải gắn ngay class cad-active-map vào #map-view-container');

    // 2. appCadTool.openToolbar() phải gắn class cad-active-map ở đầu hàm
    assert.match(appJs, /openToolbar\(\)\s*\{[\s\S]*?mapContainer\.classList\.add\('cad-active-map'\)/,
        'appCadTool.openToolbar() phải đảm bảo class cad-active-map được kích hoạt');

    // 3. CSS hiển thị ưu tiên khi ở cad-active-map
    assert.match(indexHtml, /#map-view-container\.cad-active-map\s+#mapCadToolbar\s*\{\s*display:\s*flex\s*!important;\s*\}/,
        'CSS phải có rule #map-view-container.cad-active-map #mapCadToolbar { display: flex !important; }');
    assert.match(indexHtml, /#map-view-container\.cad-active-map\s+#cadStatusHud\s*\{\s*display:\s*flex\s*!important;\s*\}/,
        'CSS phải có rule #map-view-container.cad-active-map #cadStatusHud { display: flex !important; }');
});

test('=== 3. KIỂM THỬ ĐỘC LẬP GIỮA BẢN ĐỒ DỰ ÁN VÀ MINICAD ===', () => {
    // 1. openProjectMap() phải xóa class cad-active-map
    assert.match(appJs, /openProjectMap[\s\S]*?mapView\.classList\.remove\('cad-active-map'\)/,
        'openProjectMap() phải gỡ bỏ class cad-active-map');

    // 2. openCoordPickerMap() phải xóa class cad-active-map
    assert.match(appJs, /openCoordPickerMap[\s\S]*?mapView\.classList\.remove\('cad-active-map'\)/,
        'openCoordPickerMap() phải gỡ bỏ class cad-active-map');

    // 3. CSS ẩn hoàn toàn MiniCAD khi không ở cad-active-map
    assert.match(indexHtml, /#map-view-container:not\(\.cad-active-map\)\s*#mapCadToolbar/,
        'CSS phải ẩn mapCadToolbar khi không ở cad-active-map');
});

test('=== 4. KIỂM THỬ KHỞI TẠO BẢN ĐỒ LEAFLET TRONG APPMAP.INITMAP ===', () => {
    // appMap.initMap phải trực tiếp tạo L.map('leaflet-map') mà không bị phụ thuộc vào initRightControlsDrag
    assert.match(appJs, /initMap\(\)\s*\{[\s\S]*?const map = L\.map\('leaflet-map'/,
        'appMap.initMap() phải chứa logic khởi tạo L.map("leaflet-map") chính quy');
});
