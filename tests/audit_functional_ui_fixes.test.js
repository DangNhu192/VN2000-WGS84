const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const polishCss = fs.readFileSync(path.join(ROOT, 'ui-polish.css'), 'utf8');
const mapfirstCss = fs.readFileSync(path.join(ROOT, 'ui-mapfirst.css'), 'utf8');
const serverJs = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const tileProxyJs = fs.readFileSync(path.join(ROOT, 'api/tile-proxy.js'), 'utf8');

test('1. MiniCAD Quick Vertex Save đọc đúng #txtCadQuickRenameInput, có renameVertex() và Enter lưu trọn vẹn', () => {
    assert.ok(appJs.includes('renameVertex(sIdx, vIdx, newName)'), 'appCadTool phải định nghĩa phương thức renameVertex');
    const start = appJs.indexOf('submitQuickVertexSave(sIdx, vIdx)');
    const end = appJs.indexOf('submitQuickApplyToShape(', start);
    const fn = appJs.slice(start, end);
    assert.ok(fn.includes("getElementById('txtCadQuickRenameInput')"), 'submitQuickVertexSave phải đọc ô tên #txtCadQuickRenameInput');

    const rStart = appJs.indexOf('submitQuickRename() {');
    const rEnd = appJs.indexOf("else if (t.type === 'shape')", rStart);
    const rFn = appJs.slice(rStart, rEnd);
    assert.ok(rFn.includes('this.submitQuickVertexSave('), 'submitQuickRename với đỉnh phải ủy quyền cho submitQuickVertexSave để không mất style/color/size');
});

test('2. Bảng kê MiniCAD cập nhật số cạnh (#cadModalEdgeCount) và đếm badge các tab khi mở', () => {
    const start = appJs.indexOf('openAreaTableModal(action = null)');
    const end = appJs.indexOf("const tbody = document.getElementById('cadTableBody')", start);
    const fn = appJs.slice(start, end);
    assert.ok(fn.includes("getElementById('cadModalEdgeCount')"), 'Phải lấy phần tử #cadModalEdgeCount');
    assert.ok(fn.includes('`${selectedEdges} cạnh`'), 'Phải ghi số cạnh thật thay vì giữ mãi 0 cạnh');
    assert.ok(fn.includes('this.updateModalTableCounts()'), 'Phải gọi updateModalTableCounts() để cập nhật tab Bảng Kê Các Đỉnh');
});

test('3. OCR applyDetectedKtt cập nhật đúng AppState.muiVal, nút múi 3°/6°, header và lưu cài đặt', () => {
    const start = appJs.indexOf('applyDetectedKtt() {');
    const end = appJs.indexOf('renderOcrTable()', start);
    const fn = appJs.slice(start, end);
    assert.ok(fn.includes('AppState.muiVal = zoneVal;'), 'Phải cập nhật AppState.muiVal');
    assert.ok(!fn.includes('AppState.zone ='), 'Không được gán sai thuộc tính AppState.zone');
    assert.ok(fn.includes("getElementById('btnMui3')") && fn.includes("getElementById('btnMui6')"), 'Phải đồng bộ trạng thái nút Múi 3°/6°');
    assert.ok(fn.includes('appNav.updateBanner'), 'Phải cập nhật badge KTT trên header');
    assert.ok(fn.includes('appSettings.save'), 'Phải lưu cấu hình KTT sau khi áp dụng');
});

test('4. showScreen xử lý an toàn route settings và fallback về menu thay vì màn hình trắng', () => {
    const start = appJs.indexOf('showScreen(screenName) {');
    const end = appJs.indexOf('handleHeaderBack()', start);
    const fn = appJs.slice(start, end);
    assert.ok(fn.includes("if (screenName === 'settings')"), 'showScreen("settings") phải chuyển sang mở modal cài đặt');
    assert.ok(fn.includes('if (!targetScreen)'), 'Phải có fallback về screen-menu nếu screenName không tồn tại');
    assert.ok(fn.includes('appRouting.map.invalidateSize()'), 'Mở màn hình routing phải invalidateSize bản đồ ngay lập tức');
});

test('5. Proxy tile & /api/ai đồng bộ giữa server.js, api/tile-proxy.js và app.js', () => {
    for (const host of ['cmccloud.com.vn', 'guland.vn', 'opentopomap.org', 'google.com', 'googleapis.com']) {
        assert.ok(tileProxyJs.includes(host), `api/tile-proxy.js phải cho phép ${host}`);
    }
    const wrapStart = appJs.indexOf('function wrapTileProxyUrl(');
    const wrapEnd = appJs.indexOf('function planExportGuland(', wrapStart);
    const wrapFn = appJs.slice(wrapStart, wrapEnd);
    assert.ok(wrapFn.includes('cmccloud') && wrapFn.includes('guland'), 'wrapTileProxyUrl phải bọc cmccloud.com.vn và guland.vn');
    assert.ok(serverJs.includes("req.url === '/api/ai'"), 'server.js phải định tuyến /api/ai để không lỗi 404 cục bộ');
});

test('6. Giao diện Sáng (Light Theme), nút đóng Donate, nút GPS Desktop và Mobile layout', () => {
    // Cân bằng ngoặc ui-polish.css
    const opens = (polishCss.match(/\{/g) || []).length;
    const closes = (polishCss.match(/\}/g) || []).length;
    assert.strictEqual(opens, closes, 'ui-polish.css phải cân bằng dấu ngoặc nhọn');

    assert.ok(polishCss.includes('#modalDonateCountdown #btnDonateCloseTop'), 'Phải có style cho nút đóng #btnDonateCloseTop');
    assert.ok(polishCss.includes('[data-theme="light"] #modalDonateCountdown .modal-donate-box.support-modal'), 'Hộp Ủng hộ phải có nền sáng chữ đậm trong Light theme');
    assert.ok(polishCss.includes('[data-theme="light"] #modalExportData label'), 'Các checkbox trong #modalExportData phải đạt tương phản cao trong Light theme');
    assert.ok(polishCss.includes('[data-theme="light"] #screen-routing #routingNavHud'), 'HUD dẫn đường phải đạt tương phản cao trong Light theme');
    assert.ok(polishCss.includes('.ui-mode-icon-pro #btnHeaderGpsToggle::before'), 'Nút GPS trên Desktop Icon Pro phải hiển thị nhãn GPS rõ ràng');
    assert.ok(mapfirstCss.includes('.leaflet-bottom.leaflet-left'), 'Dòng ghi nguồn Leaflet trên mobile phải nằm trên thanh Bottom Nav');

    assert.ok(html.includes('id="cadDrawVertexStyle"') && html.includes('min-width: 96px;'), 'Ô chọn kiểu icon đỉnh MiniCAD không được bị ép xuống 22px trên mobile');
    assert.ok(html.includes('id="cadDrawVertexSize"') && html.includes('min-width: 84px;'), 'Ô chọn cỡ icon đỉnh MiniCAD không được bị ép xuống 22px trên mobile');
    assert.ok(html.includes('Bảng in kèm bản vẽ (PDF / PNG / SVG / DXF):'), 'Nhãn bảng in kèm phải dùng DXF chuẩn xác');
});

test('7. Bản dịch tiếng Anh trong appI18n.phraseMap không còn chuỗi dịch máy hỏng', () => {
    assert.ok(!appJs.includes('"📍 table Ke the Dinh ("'), 'Không còn dịch hỏng "table Ke the Dinh"');
    assert.ok(!appJs.includes('"Dang hoat Close"'), 'Không còn dịch hỏng "Dang hoat Close"');
    assert.ok(!appJs.includes('"0 dinh"'), 'Không còn dịch hỏng "0 dinh"');
    assert.ok(!appJs.includes('"name dinh"'), 'Không còn dịch hỏng "name dinh"');
    assert.ok(!appJs.includes('elevation di thuong Geoid dia phuong'), 'Không còn dịch hỏng Geoid');
    assert.ok(!appJs.includes('not yet co du lieu profile'), 'Không còn dịch hỏng Trắc dọc');
    assert.ok(!appJs.includes('Hien thi/An table thong ke'), 'Không còn dịch hỏng tooltip MiniCAD');
});

test('8. Chế độ Thực địa (Field Mode) sau Light Theme giữ nguyên nền đen chữ trắng/vàng siêu tương phản', () => {
    const styleCss = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
    const aiCss = fs.readFileSync(path.join(ROOT, 'ui-assistant.css'), 'utf8');
    assert.ok(polishCss.includes('body[data-theme="light"].field-mode header.app-header'), 'Header không bị Light theme ghi đè khi bật Thực địa');
    assert.ok(polishCss.includes('body[data-theme="light"].field-mode .dashboard-modern-hub .big-action-tile'), 'Các thẻ trang chủ giữ nền tối chữ trắng tương phản cao trong Thực địa');
    assert.ok(polishCss.includes('body[data-theme="light"].field-mode #fwQuick'), 'Khung chuyển đổi nhanh giữ nền đen chữ trắng trong Thực địa');
    assert.ok(aiCss.includes('body[data-theme="light"].field-mode .ai-input input'), 'Ô nhập lệnh trợ lý không bị nền trắng khi bật Thực địa sau Light theme');
    assert.ok(styleCss.includes('[data-theme="light"] .cad-center-badge .cad-center-area-val'), 'Nhãn diện tích tâm khối MiniCAD không bị chữ trắng trên nền trắng ở Light theme');
    assert.ok(appJs.includes('white-space: nowrap; font-variant-numeric: tabular-nums;">${(v.x || 0).toFixed(3)}'), 'Tọa độ X/Y trong bảng đỉnh MiniCAD không bị rớt dòng chữ số cuối');
    assert.ok(appJs.includes('AppState.leafletMap.stop()'), 'showScreen phải dừng animation Leaflet trước khi ẩn map để tránh lỗi Invalid LatLng (NaN, NaN)');
    const planningJs = fs.readFileSync(path.join(ROOT, 'src/core/planning_map.js'), 'utf8');
    assert.ok(planningJs.includes('sz && sz.x > 0 && sz.y > 0'), 'planning_map.js chỉ gọi flyTo khi khung bản đồ có kích thước dương');
});

