/**
 * KIỂM THỬ TOÀN DIỆN:
 * 1. TỐI ƯU LỘ TRÌNH & CHỈ ĐƯỜNG:
 *    - Bỏ tự động chọn/thêm điểm không có trong lộ trình (chế độ Chấm điểm mặc định tắt, chặn lan click Leaflet,
 *      modal Sổ đo mặc định KHÔNG tích sẵn toàn bộ mốc & đánh dấu mốc đã có)
 *    - Giao diện tối ưu Dark / Light / Field Mode / Mobile, kéo thả sắp xếp thứ tự chặng & kéo đổi chiều cao sheet
 * 2. TOÀN BỘ NÚT KÉO THẺ / DRAG HANDLES TRONG TOÀN ỨNG DỤNG ĐỀU HOẠT ĐỘNG THẬT
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const uiPolishCss = fs.readFileSync(path.join(ROOT, 'ui-polish.css'), 'utf8');
const uiUnifiedCss = fs.readFileSync(path.join(ROOT, 'ui-unified.css'), 'utf8');
const uiMapFirstCss = fs.readFileSync(path.join(ROOT, 'ui-mapfirst.css'), 'utf8');

function extractAppRouting(overrides = {}) {
    const startIdx = appJs.indexOf('const appRouting = {');
    const endIdx = appJs.indexOf('// ================= 11. KHỞI TẠO ỨNG DỤNG', startIdx);
    const code = appJs.slice(startIdx, endIdx);
    const fn = new Function('L', 'geodesy', 'AppState', 'showToast', 'triggerHaptic', 'appData', 'document', 'window', `
        ${code}
        return appRouting;
    `);
    return fn(
        overrides.L,
        overrides.geodesy,
        overrides.AppState || { kttDeg: 105, kttMin: 45, muiVal: 3, currentProject: 'DuAn.csv' },
        overrides.showToast || (() => {}),
        overrides.triggerHaptic || (() => {}),
        overrides.appData,
        overrides.document,
        overrides.window
    );
}

test('1. Lộ trình không tự thêm điểm khi chạm bản đồ (pinMode mặc định tắt) và chặn lan sự kiện Leaflet', () => {
    let mapClickHandler = null;
    const disabledClickIds = [];
    const disabledScrollIds = [];
    const mockEls = {
        'leaflet-routing-map': { classList: { toggle() {} } },
        'routingMapFloatingTools': { id: 'routingMapFloatingTools' },
        'routingNavHud': { id: 'routingNavHud' },
        'routingPointsSheet': { id: 'routingPointsSheet' },
        'btnRoutingPinMode': { classList: { toggle() {} }, textContent: '' },
        'routingPinModeBanner': { style: {} }
    };
    const mockMap = {
        setView() { return this; },
        on(ev, cb) { if (ev === 'click') mapClickHandler = cb; },
        removeLayer() {},
        invalidateSize() {}
    };
    const mockL = {
        map: () => mockMap,
        tileLayer: () => ({ addTo() { return this; } }),
        layerGroup: () => ({ addTo() { return this; }, clearLayers() {}, addLayer() {} }),
        divIcon: () => ({}),
        marker: () => ({ bindPopup() { return this; } }),
        DomEvent: {
            disableClickPropagation: (el) => disabledClickIds.push(el.id),
            disableScrollPropagation: (el) => disabledScrollIds.push(el.id)
        }
    };
    const mockDoc = {
        getElementById: (id) => mockEls[id] || null
    };

    const rt = extractAppRouting({ L: mockL, document: mockDoc, window: { addEventListener() {} } });
    assert.equal(rt.pinMode, false, 'Chế độ chấm điểm trên bản đồ phải mặc định TẮT');
    rt.ensureMap();
    assert.ok(typeof mapClickHandler === 'function', 'Bản đồ phải đăng ký handler click');
    assert.ok(disabledClickIds.includes('routingNavHud'), 'Phải chặn click lan xuống Leaflet từ #routingNavHud');
    assert.ok(disabledClickIds.includes('routingPointsSheet'), 'Phải chặn click lan xuống Leaflet từ #routingPointsSheet');
    assert.ok(disabledScrollIds.includes('routingPointsSheet'), 'Phải chặn cuộn lan xuống Leaflet từ #routingPointsSheet');

    // Chạm bản đồ khi pinMode = false -> KHÔNG ĐƯỢC tự thêm điểm
    mapClickHandler({ latlng: { lat: 10.51, lng: 106.11 } });
    assert.equal(rt.points.length, 0, 'Chạm bản đồ khi chưa bật Chấm điểm KHÔNG được tự thêm điểm vào lộ trình');

    // Chủ động bật Chấm điểm -> chạm bản đồ mới thêm đúng 1 điểm
    rt.togglePinMode(true);
    assert.equal(rt.pinMode, true);
    mapClickHandler({ latlng: { lat: 10.51, lng: 106.11 } });
    assert.equal(rt.points.length, 1, 'Khi đã bật Chấm điểm thì chạm bản đồ thêm đúng 1 điểm');

    // Tắt Chấm điểm -> chạm bản đồ lại không thêm điểm
    rt.togglePinMode(false);
    mapClickHandler({ latlng: { lat: 10.52, lng: 106.12 } });
    assert.equal(rt.points.length, 1, 'Sau khi tắt Chấm điểm, chạm bản đồ không được thêm điểm thừa');
});

test('2. Modal Thêm điểm từ Sổ đo KHÔNG tự tích chọn sẵn các mốc và đánh dấu mốc đã có trong lộ trình', () => {
    const listEl = { innerHTML: '' };
    const mockDoc = {
        getElementById: (id) => (id === 'routingSurveyPointsList' ? listEl : null),
        querySelectorAll: () => []
    };
    const mockSurvey = [
        { id: 'pt1', name: 'Mốc 1', lat: 10.51, lng: 106.11, x: 1162000, y: 589000 },
        { id: 'pt2', name: 'Mốc 2', lat: 10.52, lng: 106.12, x: 1163000, y: 590000 },
        { id: 'pt3', name: 'Mốc 3', lat: 10.53, lng: 106.13, x: 1164000, y: 591000 }
    ];
    const rt = extractAppRouting({
        document: mockDoc,
        appData: { getPoints: () => mockSurvey }
    });

    // Giả sử Mốc 1 đã có trong lộ trình
    rt.addPoint(10.51, 106.11, 'Mốc 1', 1162000, 589000, '', 'rt_surv_pt1');
    rt.populateSurveyPointsModal();

    assert.ok(!listEl.innerHTML.includes(' checked'), 'Danh sách mốc trong modal KHÔNG được tự tích sẵn thuộc tính checked');
    assert.ok(listEl.innerHTML.includes('✓ Đã có'), 'Mốc đã tồn tại trong lộ trình phải có nhãn ✓ Đã có');
    assert.ok(listEl.innerHTML.includes('data-already-in-route="1"'), 'Mốc đã có trong lộ trình phải bị khóa để tránh trùng lặp');
});

test('3. Đổi thứ tự chặng (reorderPoints) và dọn sạch routeCasing/routeDone khi xóa điểm', () => {
    const removedLayers = [];
    const rt = extractAppRouting();
    rt.map = { removeLayer: (l) => removedLayers.push(l) };
    rt.routePolyline = { tag: 'poly' };
    rt.routeCasing = { tag: 'casing' };
    rt.routeDone = { tag: 'done' };

    rt.addPoint(10.51, 106.11, 'A');
    rt.addPoint(10.52, 106.12, 'B');
    rt.addPoint(10.53, 106.13, 'C');

    assert.equal(rt.reorderPoints(2, 0), true);
    assert.deepEqual(rt.points.map(p => p.name), ['C', 'A', 'B'], 'reorderPoints phải đưa C lên đầu đúng thứ tự');
    assert.equal(removedLayers.length, 3, 'Phải gỡ sạch cả routePolyline, routeCasing và routeDone');
    assert.equal(rt.routeCasing, null);
    assert.equal(rt.routeDone, null);
});

test('4. Kiểm tra toàn bộ nút kéo thẻ (Drag Handles) trong toàn ứng dụng đều có chức năng kéo thả thật', () => {
    // 4.1 Routing bottom sheet handle (#routingSheetDragHandle) & stop reorder grip (.routing-point-drag-handle)
    assert.ok(indexHtml.includes('id="routingSheetDragHandle"'), 'Sheet lộ trình phải có #routingSheetDragHandle');
    assert.ok(!indexHtml.includes('class="sheet-drag-handle" onclick="appRouting.togglePointsListSheet()"'), 'Không để nút kéo sheet lộ trình chỉ gắn onclick rỗng');
    assert.ok(appJs.includes('initSheetDrag()') && appJs.includes('initPointsReorderDrag()'), 'appRouting phải khởi tạo cả kéo đổi chiều cao sheet lẫn kéo sắp xếp chặng');
    assert.ok(appJs.includes('class="routing-point-drag-handle"'), 'Mỗi dòng chặng trong lộ trình phải có tay cầm kéo sắp xếp');

    // 4.2 Bảng kê khối & mốc dự án (#pmbHeader) — trước đây chỉ có cursor:grab mà chưa gắn kéo
    assert.ok(indexHtml.includes('id="pmbHeader"'), 'Phải có #pmbHeader');
    assert.ok(appJs.includes('initProjectBlocksPanelDrag()'), 'appMap phải có initProjectBlocksPanelDrag() gắn sự kiện kéo cho #pmbHeader');
    assert.ok(appJs.includes("this.initProjectBlocksPanelDrag();"), 'renderProjectMarksBlocksPanel phải kích hoạt kéo thả cho #pmbHeader');

    // 4.3 Thanh kéo (pull pill) của MiniCAD toolbar trên di động
    assert.ok(appJs.includes('initToolbarSheetDrag()'), 'appCadTool phải có initToolbarSheetDrag() cho thanh kéo #mapCadToolbar');

    // 4.4 Thanh kéo Bottom Sheet bản đồ Chuyển đổi (.transform-sheet-drag-handle) — sửa lỗi lặp 3 lần / đảo ngược sau khi kéo
    assert.ok(!indexHtml.includes('class="transform-sheet-drag-handle" onclick="appTransformMap.toggleBottomSheet()"'), 'Bỏ inline onclick trùng lặp trên .transform-sheet-drag-handle');
    assert.ok(appJs.includes('suppressClickUntil'), 'initSheetDrag phải có suppressClickUntil chống đảo ngược sau khi kéo xong');

    // 4.5 Thanh chia tỉ lệ Form/Bản đồ (#transformLayoutResizer)
    assert.ok(appJs.includes('resizer._hasResizerInit = true'), 'initResizer phải chống gắn trùng listener');
    assert.ok(appJs.includes("resizer.style.touchAction = 'none'"), 'initResizer phải đặt touchAction = none cho vuốt di động mượt');

    // 4.6 Cột nút bản đồ phải (#dragHandleRightControls) — chống nhảy tọa độ & tôn trọng trạng thái is-dragged
    assert.ok(uiMapFirstCss.includes('.map-right-controls:not(.is-dragged)'), 'ui-mapfirst.css phải tôn trọng .map-right-controls.is-dragged');

    // 4.7 Bảng khối MiniCAD (#cadBlocksPanelHeader) & Thanh lệnh nổi (#cadFloatingCmdHeader) — tính tọa độ theo offsetParent
    assert.ok(appJs.includes('panel.offsetParent ? panel.offsetParent.getBoundingClientRect()'), 'initDraggablePanel phải tính tọa độ tương đối theo offsetParent');
    assert.ok(appJs.includes('bar.offsetParent ? bar.offsetParent.getBoundingClientRect()'), 'initFloatingCmdBarDrag phải tính tọa độ tương đối theo offsetParent');

    // 4.8 Thanh mở rộng Dock (#dockExpandHandle) hỗ trợ vuốt lên
    assert.ok(appJs.includes('initDockExpandDrag()'), 'appNav phải hỗ trợ kéo/vuốt lên trên #dockExpandHandle');

    // 4.9 CSS hỗ trợ đầy đủ Dark / Light / Field Mode cho Lộ trình v2
    assert.ok(uiPolishCss.includes('.routing-points-sheet.is-dragging'));
    assert.ok(uiPolishCss.includes('.routing-point-drag-handle'));
    assert.ok(uiPolishCss.includes('body[data-theme="light"] .routing-top-toolbar'));
    assert.ok(uiPolishCss.includes('body.field-mode .routing-top-toolbar'));
    assert.ok(uiUnifiedCss.includes('#screen-routing #btnRoutingPinMode.is-pin-active'));
});
