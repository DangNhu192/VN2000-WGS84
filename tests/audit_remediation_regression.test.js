const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const pwaDir = path.join(__dirname, '..');
const htmlContent = fs.readFileSync(path.join(pwaDir, 'index.html'), 'utf8');
const appJsContent = fs.readFileSync(path.join(pwaDir, 'app.js'), 'utf8');
const swContent = fs.readFileSync(path.join(pwaDir, 'sw.js'), 'utf8');
const featureList = JSON.parse(fs.readFileSync(path.join(pwaDir, 'feature_list.json'), 'utf8'));

test('=== 1. KIỂM THỬ VÒNG 1: PHÂN HỆ CHUYỂN ĐỔI TỌA ĐỘ F-002 HOÀN TẤT & ĐỘC LẬP ===', () => {
    // 1.1 F-002 trong feature_list.json phải có trạng thái done
    const f002 = featureList.features.find(f => f.id === 'F-002');
    assert.ok(f002, 'F-002 phải tồn tại trong feature_list.json');
    assert.strictEqual(f002.status, 'done', 'F-002 phải có status là done');

    // 1.2 Form chuyển đổi có đủ subtabs và các ID cốt lõi
    assert.ok(htmlContent.includes('id="screen-transform"'), 'Phải có id="screen-transform"');
    assert.ok(htmlContent.includes('id="panelTransSingle"'), 'Phải có id="panelTransSingle"');
    assert.ok(htmlContent.includes('id="panelTransMulti"'), 'Phải có id="panelTransMulti"');
    assert.ok(htmlContent.includes('id="boxPasteMultiText"'), 'Phải có id="boxPasteMultiText" để dán tọa độ nhanh');
    assert.ok(htmlContent.includes('id="txtMultiPasteArea"'), 'Phải có id="txtMultiPasteArea"');

    // 1.3 Màn hình bản đồ chuyển đổi độc lập và bottom sheet
    assert.ok(htmlContent.includes('id="screen-transform-map"'), 'Phải có id="screen-transform-map"');
    assert.ok(htmlContent.includes('id="leaflet-transform-map"'), 'Phải có id="leaflet-transform-map"');
    assert.ok(htmlContent.includes('id="transformBottomSheet"'), 'Phải có id="transformBottomSheet"');
    assert.ok(htmlContent.includes('id="barCoordPicker"'), 'Phải có id="barCoordPicker"');
});

test('=== 2. KIỂM THỬ VÒNG 2: CÔ LẬP SỰ KIỆN CLICK & BẢN ĐỒ MINICAD ===', () => {
    // 2.1 appMap.onMapClick không kích hoạt kép appCadTool.handleMapClick
    const onMapClickBody = appJsContent.substring(
        appJsContent.indexOf('onMapClick(lat, lng) {'),
        appJsContent.indexOf('viewProjectMarksAndBlocks() {')
    );
    assert.ok(onMapClickBody.includes("AppState.mapMode === 'cad'"), 'onMapClick phải kiểm tra mapMode === cad');
    assert.ok(
        onMapClickBody.includes("return;"),
        'onMapClick phải return ngay khi mapMode === cad để nhường sự kiện cho appCadTool độc lập'
    );
    // Không được gọi trực tiếp appCadTool.handleMapClick trong onMapClick vì appCadTool đã có listener riêng
    assert.strictEqual(
        onMapClickBody.includes('appCadTool.handleMapClick(lat, lng);'),
        false,
        'onMapClick không được gọi kép appCadTool.handleMapClick'
    );
});

test('=== 3. KIỂM THỬ VÒNG 3: TIỆN ÍCH LƯU TRỮ AN TOÀN SAFESTORAGE & SW CACHE ===', () => {
    // 3.1 safeStorage tồn tại và được định nghĩa an toàn
    assert.ok(appJsContent.includes('const safeStorage = {'), 'Phải có định nghĩa safeStorage trong app.js');
    assert.ok(appJsContent.includes('setItem(key, value) {'), 'safeStorage phải có hàm setItem');
    assert.ok(appJsContent.includes('getItem(key, defaultValue = null) {'), 'safeStorage phải có hàm getItem');
    assert.ok(appJsContent.includes('removeItem(key) {'), 'safeStorage phải có hàm removeItem');

    // 3.2 appData.savePoints sử dụng safeStorage.setItem
    assert.ok(
        appJsContent.includes('safeStorage.setItem(key, JSON.stringify(points))'),
        'appData.savePoints phải sử dụng safeStorage.setItem để chống tràn quota'
    );

    // 3.3 sw.js cache name được cập nhật lên v2.8.1
    assert.ok(swContent.includes("const CACHE_NAME = 'vn2000-pro-v2.8.1';"), 'sw.js CACHE_NAME phải là vn2000-pro-v2.8.1');

    // 3.4 Tất cả tệp trong ASSETS_TO_CACHE phải tồn tại thực tế trên ổ đĩa
    const assetsMatch = swContent.match(/const\s+ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(assetsMatch, 'sw.js phải có ASSETS_TO_CACHE');
    const assetList = assetsMatch[1]
        .split(',')
        .map(s => s.trim().replace(/['"]/g, ''))
        .filter(s => s && s !== './');

    assetList.forEach(asset => {
        const fullPath = path.join(pwaDir, asset.replace(/^\.\//, ''));
        assert.ok(fs.existsSync(fullPath), `Tệp cache trong sw.js phải tồn tại: ${asset}`);
    });
});

test('=== 4. KIỂM THỬ VÒNG 4: TOÀN BỘ 10 TÍNH NĂNG CỐT LÕI ĐẠT TRẠNG THÁI DONE ===', () => {
    const doneFeatures = featureList.features.filter(f => f.status === 'done');
    assert.strictEqual(
        doneFeatures.length,
        featureList.features.length,
        `Tất cả ${featureList.features.length} tính năng trong feature_list.json phải đạt trạng thái done`
    );
});

test('=== 5. KIỂM THỬ FIX LỖI: LƯU MỐC TỪ BẢN ĐỒ CHUYỂN ĐỔI ĐỒNG BỘ VÀO SỔ ĐO DỰ ÁN ===', () => {
    // 5.1 appTransformMap.saveConvertedToProject phải sử dụng appData.addPoint
    assert.ok(
        appJsContent.includes('appData.addPoint(curProj, newPt)'),
        'appTransformMap.saveConvertedToProject phải gọi appData.addPoint để đồng bộ sổ đo và Google Sheets'
    );
    // 5.2 Không dùng khóa sai vn2k_proj_
    const saveTransBody = appJsContent.substring(
        appJsContent.indexOf('saveConvertedToProject() {', 4000),
        appJsContent.indexOf('setMode(mode) {', 4000)
    );
    assert.strictEqual(
        saveTransBody.includes('vn2k_proj_'),
        false,
        'appTransformMap.saveConvertedToProject không được dùng tiền tố khóa sai vn2k_proj_'
    );
});

