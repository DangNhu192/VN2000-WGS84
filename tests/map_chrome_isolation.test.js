/**
 * BỘ KIỂM THỬ: CÁCH LY THANH/CỬA SỔ NỔI TRÊN BẢN ĐỒ DÙNG CHUNG
 * Theo AGENTS.md §2, mỗi phân hệ mở bản đồ chỉ được hiển thị thanh công cụ của
 * chính nó; không kế thừa thanh dự án / thanh chấm điểm / HUD MiniCAD của phân
 * hệ trước, và không bật Bottom Sheet Nạp/Lưu mốc khi chỉ xem vị trí GPS.
 *
 * Chạy với: node tests/map_chrome_isolation.test.js
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        console.error(`  ❌ FAIL: ${message}`);
    }
}

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractMethod(name, from = 0) {
    const start = appJs.indexOf('\n    ' + name + '(', from);
    if (start < 0) throw new Error('Không tìm thấy method: ' + name);

    let parenDepth = 0;
    let parenClose = -1;
    for (let j = appJs.indexOf('(', start); j < appJs.length; j++) {
        if (appJs[j] === '(') parenDepth++;
        else if (appJs[j] === ')') {
            parenDepth--;
            if (parenDepth === 0) { parenClose = j; break; }
        }
    }
    if (parenClose < 0) throw new Error('Không cân bằng ngoặc tham số: ' + name);

    const open = appJs.indexOf('{', parenClose);
    let depth = 0;
    for (let j = open; j < appJs.length; j++) {
        if (appJs[j] === '{') depth++;
        else if (appJs[j] === '}') {
            depth--;
            if (depth === 0) return appJs.slice(start + 1, j + 1);
        }
    }
    throw new Error('Ngoặc nhọn không cân bằng: ' + name);
}

const CHROME_IDS = [
    'mapProjectBar', 'barCoordPicker', 'mapCadToolbar', 'mapDistanceHud',
    'cadStatusHud', 'cadFloatingCmdBar', 'cadThumbActionBar', 'cadTouchLoupe',
    'cadBlocksStatsPanel', 'cadBlocksPanel', 'projectMarksBlocksPanel',
    'mapBottomSheet', 'mapPointMeasureBox'
];

// =====================================================================
// 1. resetMapChrome(): ẩn đủ mọi thanh/cửa sổ nổi của bản đồ dùng chung
// =====================================================================
console.log('\n— resetMapChrome: dọn sạch chrome bản đồ dùng chung —');
{
    const elements = {};
    CHROME_IDS.forEach(id => {
        elements[id] = { style: { display: id === 'mapCadToolbar' ? 'flex' : 'block' } };
    });

    const documentStub = { getElementById: id => elements[id] || null };
    const api = new Function('document',
        `return ({ ${extractMethod('resetMapChrome')} });`)(documentStub);

    api.resetMapChrome();

    assert(CHROME_IDS.every(id => elements[id].style.display === 'none'),
        `Ẩn đủ ${CHROME_IDS.length} thanh/cửa sổ nổi (dự án, chấm điểm, CAD, Bottom Sheet, đo khoảng cách)`);
}

// =====================================================================
// 2. Mọi lối vào bản đồ dùng chung phải reset chrome trước khi hiển thị
// =====================================================================
console.log('\n— Các hàm mở bản đồ gọi resetMapChrome trước khi bật thanh riêng —');
{
    const pickerBody = extractMethod('openCoordPickerMap');
    assert(pickerBody.includes('this.resetMapChrome()'), 'openCoordPickerMap dọn chrome trước khi mở thanh chấm điểm');
    assert(pickerBody.indexOf('this.resetMapChrome()') < pickerBody.indexOf("getElementById('barCoordPicker')"),
        'openCoordPickerMap reset trước rồi mới bật #barCoordPicker');

    const projectBody = extractMethod('openProjectMap');
    assert(projectBody.includes('this.resetMapChrome()'), 'openProjectMap dọn chrome trước khi mở thanh dự án');
    assert(projectBody.indexOf('this.resetMapChrome()') < projectBody.indexOf("getElementById('mapProjectBar')"),
        'openProjectMap reset trước rồi mới bật #mapProjectBar');

    const cadBody = extractMethod('openCadMap');
    assert(cadBody.includes('this.resetMapChrome()'), 'openCadMap dọn chrome trước khi mở MiniCAD');
    assert(cadBody.indexOf('this.resetMapChrome()') < cadBody.indexOf('appCadTool.openToolbar()'),
        'openCadMap reset trước rồi mới gọi appCadTool.openToolbar()');

    const convertedBody = extractMethod('openConvertedMap');
    assert(convertedBody.includes('this.resetMapChrome()'), 'openConvertedMap dọn chrome của phân hệ trước');

    const gpsBody = extractMethod('openLiveGpsMap');
    assert(gpsBody.includes('this.resetMapChrome()'), 'openLiveGpsMap dọn chrome của phân hệ trước');
}

// =====================================================================
// 3. GPS thực địa: chế độ riêng, tắt MiniCAD, không lẫn thanh dự án
// =====================================================================
console.log('\n— openLiveGpsMap: không gian GPS độc lập —');
{
    const gpsBody = extractMethod('openLiveGpsMap');
    assert(gpsBody.includes("AppState.mapMode = 'live_gps'"),
        "openLiveGpsMap gán mapMode = 'live_gps' (không kế thừa mode cũ)");
    assert(gpsBody.includes('appCadTool.closeToolbar()') && gpsBody.includes('appCadTool.clearCadOverlays'),
        'openLiveGpsMap tắt MiniCAD và gỡ hình khối CAD còn sót');
    assert(gpsBody.includes("mapView.classList.remove('cad-active-map')"),
        'openLiveGpsMap gỡ class cad-active-map khỏi khung bản đồ');
    assert(gpsBody.includes("appMap.updateFabControlsVisibility('live_gps')"),
        'openLiveGpsMap đồng bộ nút FAB theo chế độ live_gps');
}

// =====================================================================
// 4. FAB: chế độ live_gps không hiện công cụ dự án / điểm chuyển đổi
// =====================================================================
console.log('\n— FAB theo chế độ: live_gps chỉ xem vị trí —');
{
    const ids = ['btnMap34Prov', 'btnMapDtCommunes', 'btnFitBothPoints', 'btnFitProjectBounds'];
    const elements = {};
    ids.forEach(id => { elements[id] = { style: { display: 'flex' } }; });

    const documentStub = { getElementById: id => elements[id] || null };
    const api = new Function('document',
        `return ({ ${extractMethod('updateFabControlsVisibility')} });`)(documentStub);

    api.updateFabControlsVisibility('live_gps');
    assert(ids.every(id => elements[id].style.display === 'none'),
        'Chế độ live_gps ẩn toàn bộ FAB dự án và FAB điểm chuyển đổi');
}

// =====================================================================
// 5. onMapClick: live_gps / điểm chuyển đổi chỉ xem, không bật Bottom Sheet
// =====================================================================
console.log('\n— onMapClick: không bật Bottom Sheet ở chế độ chỉ xem vị trí —');
{
    const throwingDocument = {
        getElementById() { throw new Error('Không được mở Bottom Sheet ở chế độ chỉ xem vị trí'); }
    };

    ['live_gps', 'view_converted', 'converted_point'].forEach(mode => {
        const api = new Function('AppState', 'document', 'triggerHaptic', 'appCoordPicker', 'convertWgsToVn2k',
            `return ({ ${extractMethod('onMapClick')} });`)({ mapMode: mode }, throwingDocument, () => {}, {}, () => ({}));
        let threw = false;
        try { api.onMapClick(10.5, 106.5); } catch (e) { threw = true; }
        assert(!threw, `onMapClick bỏ qua hoàn toàn khi mapMode = '${mode}'`);
    });
}

// =====================================================================
// 6. Bottom Sheet chỉ hiển thị thông tin, không có hành động chéo phân hệ
// =====================================================================
console.log('\n— Bottom Sheet bản đồ: chỉ hiển thị, không ghi mốc dự án —');
{
    const sheetStart = indexHtml.indexOf('id="mapBottomSheet"');
    const sheetEnd = indexHtml.indexOf('</div>', indexHtml.indexOf('map-sheet-actions', sheetStart));
    const sheetHtml = indexHtml.slice(sheetStart, sheetEnd);
    assert(!sheetHtml.includes('appMap.savePickedPoint'),
        'Bottom Sheet không còn nút "Lưu mốc" ghi vào dự án từ phân hệ khác');
    assert(!sheetHtml.includes('appMap.loadSelectedToMain'),
        'Bottom Sheet không còn nút nạp tọa độ dùng pickedCoord cũ');
    assert(!appJs.includes('savePickedPoint() {') && !appJs.includes('loadSelectedToMain() {'),
        'Đã xóa hai method chéo phân hệ savePickedPoint/loadSelectedToMain');
    assert(sheetHtml.includes('appMap.closeBottomSheet'),
        'Bottom Sheet vẫn có nút đóng');
}

// =====================================================================
// TỔNG KẾT
// =====================================================================
console.log('\n' + '='.repeat(60));
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} test PASS`);
if (passedTests !== totalTests) {
    console.error(`❌ CÓ ${totalTests - passedTests} TEST THẤT BẠI`);
    process.exit(1);
}
console.log('✅ TẤT CẢ TEST CÁCH LY CHROME BẢN ĐỒ ĐỀU PASS');
process.exit(0);
