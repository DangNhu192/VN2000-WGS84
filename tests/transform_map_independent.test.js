/**
 * @file tests/transform_map_independent.test.js
 * @description Kiểm thử tính độc lập của Bản đồ Chuyển đổi tọa độ (1.3) và sự nguyên vẹn của MiniCAD (4.4)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = (fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf8') : '')).replace(/\r\n/g, '\n');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8').replace(/\r\n/g, '\n');

test('=== 1. KIỂM THỬ GIAO DIỆN MÀN HÌNH BẢN ĐỒ CHUYỂN ĐỔI TỌA ĐỘ ĐỘC LẬP ===', () => {
    // 1. Phải có container màn hình độc lập screen-transform-map
    assert.ok(indexHtml.includes('id="screen-transform-map"'), 'Có màn hình screen-transform-map độc lập');
    assert.ok(indexHtml.includes('id="leaflet-transform-map"'), 'Có container bản đồ Leaflet riêng biệt cho chuyển đổi');
    assert.ok(indexHtml.includes('id="transformMapToolbar"'), 'Có thanh công cụ transformMapToolbar');
    assert.ok(indexHtml.includes('id="transformMapCoordHud"'), 'Có HUD hiển thị tọa độ thời gian thực');
    
    // 2. Có các nút chức năng cốt lõi: Chấm điểm, Xem kết quả, Đơn điểm, Đa điểm, Áp dụng
    assert.ok(indexHtml.includes('id="btnTfMapModePick"'), 'Có nút chuyển chế độ Chấm tọa độ');
    assert.ok(indexHtml.includes('id="btnTfMapModeView"'), 'Có nút chuyển chế độ Xem điểm chuyển đổi');
    assert.ok(indexHtml.includes('id="btnTfPickSingle"'), 'Có nút chọn chấm đơn điểm');
    assert.ok(indexHtml.includes('id="btnTfPickMulti"'), 'Có nút chọn chấm đa điểm');
    assert.ok(indexHtml.includes('id="btnTfApplyCoords"'), 'Có nút Áp dụng tọa độ về form');
    assert.ok(indexHtml.includes('id="drawerItem_transform_map"'), 'Menu drawer có mục 1.3 Bản đồ chuyển đổi tọa độ');
});

test('=== 2. KIỂM THỬ LOGIC JAVASCRIPT CỦA PHÂN HỆ APPTRANSFORMMAP ===', () => {
    // Phải có định nghĩa module appTransformMap độc lập
    assert.ok(appJs.includes('const appTransformMap = {'), 'Có module appTransformMap');
    assert.ok(appJs.includes('openTransformMap('), 'appNav có hàm openTransformMap');
    
    // Các phương thức cốt lõi của appTransformMap
    assert.ok(appJs.includes('ensureMap()'), 'appTransformMap có ensureMap');
    assert.ok(appJs.includes('setMode('), 'appTransformMap có setMode');
    assert.ok(appJs.includes('setPickSubMode('), 'appTransformMap có setPickSubMode');
    assert.ok(appJs.includes('setSinglePoint('), 'appTransformMap có setSinglePoint');
    assert.ok(appJs.includes('addMultiPoint('), 'appTransformMap có addMultiPoint');
    assert.ok(appJs.includes('applyToForm()'), 'appTransformMap có applyToForm');
    assert.ok(appJs.includes('renderConvertedPoints()'), 'appTransformMap có renderConvertedPoints');
    assert.ok(appJs.includes('toggleTileLayer()'), 'appTransformMap có toggleTileLayer');
});

test('=== 3. KIỂM THỬ ĐIỀU HƯỚNG TỪ FORM CHUYỂN ĐỔI SANG BẢN ĐỒ ĐỘC LẬP ===', () => {
    // openPickOnMap và openPickMultiOnMap phải gọi openTransformMap
    assert.ok(appJs.includes("appNav.openTransformMap({\n            mode: 'pick',\n            subMode: 'single'"), 'openPickOnMap mở bản đồ chuyển đổi độc lập');
    assert.ok(appJs.includes("appNav.openTransformMap({ mode: 'pick', subMode: 'multi' });"), 'openPickMultiOnMap mở bản đồ chuyển đổi đa điểm độc lập');
    assert.ok(appJs.includes("appNav.openTransformMap({ mode: 'view' });"), 'viewConvertedOnMap và viewMultiConvertedOnMap mở bản đồ xem độc lập');
});

test('=== 4. KIỂM THỬ TÍNH NGUYẸN VẸN CỦA TIỆN ÍCH 4.4 VẼ MINICAD ===', () => {
    // Drawer mục 4.4 gọi navigateTo('cad_tool')
    assert.ok(indexHtml.includes('onclick="appNav.navigateTo(\'cad_tool\')"'), 'Mục 4.4 gọi appNav.navigateTo("cad_tool")');
    assert.ok(appJs.includes("action === 'cad_tool'") && appJs.includes("appNav.openCadMap()"), 'Routing cad_tool gọi appNav.openCadMap()');
    assert.ok(appJs.includes("mapView.classList.add('active', 'cad-active-map');"), 'openCadMap kích hoạt tức thì cad-active-map');
    assert.ok(appJs.includes("if (mapContainer) mapContainer.classList.add('cad-active-map');"), 'openToolbar đảm bảo cad-active-map');
    assert.ok(indexHtml.includes('#map-view-container.cad-active-map #mapCadToolbar'), 'CSS ép buộc hiển thị thanh CAD toolbar khi cad-active-map kích hoạt');
});
