/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: LỊCH SỬ UNDO/REDO & CÁC LÕI CÒN LẠI CỦA TAB "VẼ" (MINICAD)
 * Chạy thật pushHistoryState/undo/redo/applyHistoryState/addVertex/saveAndStartNewShape/
 * clearDrawing/undoVertex để bắt các lỗi logic:
 *  - Ctrl+Z lùi thừa một thao tác (mất thêm 1 đỉnh ngoài ý muốn)
 *  - Xóa nét vẽ / Del đỉnh không ghi lịch sử -> không cứu được
 *  - Nút "Xóa hết" không ghi bộ nhớ -> tải lại trang khối cũ quay lại
 *  - Đường Offset bị xóa sạch mỗi lần vẽ lại
 *  - Hộp thoại Xuất ghi cờ thành phần của ảnh xuất vào cài đặt hiển thị -> ẩn sạch nét ranh,
 *    khiến "Vẽ đa giác / Tuyến" trông như không dùng được
 * Chạy với: node tests/minicad_draw_history.test.js
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

function extractMethod(name) {
    const start = appJs.indexOf('\n    ' + name + '(');
    if (start < 0) throw new Error('Không tìm thấy method: ' + name);
    const open = appJs.indexOf('{', start);
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

const METHODS = [
    'addVertex', 'undoVertex', 'clearDrawing', 'saveAndStartNewShape',
    'pushHistoryState', 'initHistory', '_snapshotHistory', 'undo', 'redo',
    'applyHistoryState', 'updateUndoRedoUi', 'pruneCadProjectPoints'
];

// --- STUB MÔI TRƯỜNG ---
const toasts = [];
let confirmAnswer = true;
let promptAnswer = 'Thử A';
const AppState = { kttVal: 105, scaleFactor: 0.9999, currentProject: 'DuAn Test', projectsList: ['DuAn Test'] };
const convertWgsToVn2k = (lat, lng) => ({ X: Math.round(lat * 100000) / 10, Y: Math.round(lng * 100000) / 10 });

const elements = {
    cadActiveShapeName: { value: 'Thử A' },
    cadBlocksStatsPanel: { style: { display: 'none' } },
    modalCadAreaTable: { style: { display: 'none' } },
    btnCadUndo: { disabled: false, style: {} },
    btnCadRedo: { disabled: false, style: {} }
};
const documentStub = { getElementById: (id) => elements[id] || null };

const makeApi = new Function('AppState', 'convertWgsToVn2k', 'showToast', 'triggerHaptic', 'confirm', 'prompt', 'document', 'appData',
    `return ({ ${METHODS.map(extractMethod).join(',\n')} });`);

let projectPoints = [];
const appDataStub = {
    getPoints: () => projectPoints,
    savePoints: (proj, pts) => { projectPoints = pts; }
};

const api = makeApi(AppState, convertWgsToVn2k, (m) => toasts.push(String(m)), () => {},
    () => confirmAnswer, () => promptAnswer, documentStub, appDataStub);

function makeCtx() {
    const ctx = Object.assign(Object.create(api), {
        vertices: [],
        savedShapes: [],
        annotations: [],
        mode: 'polygon',
        isActive: true,
        pointLayerId: null,
        palette: ['#10b981', '#38bdf8'],
        historyStack: [],
        historyIndex: -1,
        maxHistory: 50,
        isHistoryAction: false,
        layers: { group: { clearLayers() {}, addLayer() {}, removeLayer() {} }, offsetLayer: null },
        renderCount: 0,
        savedCount: 0,
        rendered() { return this.renderCount; }
    });
    ctx.renderGeometry = function () { this.renderCount++; };
    ctx.ensureLayers = () => {};
    ctx.setMode = (m) => { ctx.mode = m; };
    ctx.updateUi = () => {};
    ctx.renderBlocksPanel = () => {};
    ctx.syncToolButtons = () => {};
    ctx.renderAnnotations = () => {};
    ctx.saveAnnotations = () => {};
    ctx.clearDynamicHelpers = () => {};
    ctx.refreshPointLayerBar = () => {};
    ctx.deselectCurrent = () => {};
    ctx.openAreaTableModal = () => {};
    ctx.persistSession = () => {};
    ctx.saveShapesForProject = function () { this.savedCount++; };
    ctx.calculateAreaAndPerimeter = () => ({ area: 100, perimeter: 40, areaFormatted: '100,00', perimeterFormatted: '40,00' });
    ctx.getEffectiveStats = (s) => s.stats;
    return ctx;
}

const vertex = (dx) => [10 + dx, 106 + dx];

console.log('========================================================================');
console.log('🧪 KIỂM THỬ: UNDO/REDO VÀ CÁC LÕI CHỨC NĂNG TAB "VẼ"');
console.log('========================================================================\n');

// --- NHÓM 1: UNDO PHẢI LÙI ĐÚNG MỘT THAO TÁC ---
console.log('--- NHÓM 1: Ctrl+Z LÙI ĐÚNG 1 THAO TÁC, KHÔNG MẤT THÊM ĐỈNH ---');
{
    const ctx = makeCtx();
    ctx.addVertex(...vertex(0), 'Đ1');
    ctx.addVertex(...vertex(1), 'Đ2');
    ctx.addVertex(...vertex(2), 'Đ3');
    assert(ctx.vertices.length === 3, 'Vẽ 3 lần chạm bản đồ -> 3 đỉnh');
    assert(ctx.historyIndex === 3, 'Mỗi đỉnh thêm vào đúng 1 phần tử lịch sử (index=3)');

    elements.cadActiveShapeName.value = 'Thửa Undo';
    ctx.saveAndStartNewShape();
    assert(ctx.savedShapes.length === 1 && ctx.vertices.length === 0, 'Lưu khối: 1 khối đã lưu, nét vẽ được xóa');

    ctx.undo();
    assert(ctx.vertices.length === 3, 'Ctrl+Z ngay sau khi lưu: khôi phục ĐỦ 3 đỉnh (không bị lùi thừa)');
    assert(ctx.savedShapes.length === 0, 'Ctrl+Z ngay sau khi lưu: khối vừa lưu bị rút về nét vẽ dở');

    ctx.redo();
    assert(ctx.savedShapes.length === 1 && ctx.vertices.length === 0, 'Ctrl+Y: làm lại đúng thao tác lưu vừa lùi');

    // Lùi nhiều bước: mỗi lần chỉ mất 1 đỉnh
    ctx.undo();
    ctx.undo();
    assert(ctx.vertices.length === 2, 'Hai lần lùi liên tiếp chỉ xóa 2 đỉnh (còn 2 đỉnh)');
    ctx.undo();
    ctx.undo();
    ctx.undo();
    ctx.undo();
    assert(ctx.vertices.length === 0 && ctx.savedShapes.length === 0, 'Lùi hết lịch sử: bản vẽ trở về trống');
    ctx.undo();
    assert(toasts[toasts.length - 1].includes('Không còn thao tác'), 'Lùi quá giới hạn: cảnh báo đúng, không ném lỗi');
}

// --- NHÓM 2: DEL ĐỈNH + ESC + LƯU BỘ NHỚ ---
console.log('\n--- NHÓM 2: DEL ĐỈNH / ESC / XÓA HẾT PHẢI CỨU ĐƯỢC & GHI BỘ NHỚ ---');
{
    const ctx = makeCtx();
    ctx.addVertex(...vertex(0), 'Đ1');
    ctx.addVertex(...vertex(1), 'Đ2');
    ctx.undoVertex();
    assert(ctx.vertices.length === 1, 'Del: lùi đúng 1 đỉnh');
    ctx.undo();
    assert(ctx.vertices.length === 2, 'Ctrl+Z sau khi Del: khôi phục lại đỉnh vừa xóa (Del có ghi lịch sử)');

    // Esc hủy nét vẽ dở: phải hoàn tác được
    const escStart = appJs.indexOf("e.key === 'Escape'", appJs.indexOf('bindEvents()'));
    const escBlock = appJs.slice(escStart, escStart + 900);
    assert(/pushHistoryState\('Hủy nét vẽ đang dở'\)/.test(escBlock), 'Esc dọn nét vẽ có ghi lịch sử để Ctrl+Z cứu lại');

    // Xóa hết: bản vẽ trống thì không được ghi rác vào lịch sử
    const ctx3 = makeCtx();
    const idxBefore = ctx3.historyIndex;
    ctx3.clearDrawing();
    assert(ctx3.historyIndex === idxBefore && idxBefore === -1, 'Xóa hết khi bản vẽ trống: không tạo mốc lịch sử ảo');
    assert(!toasts[toasts.length - 1].includes('Dọn dẹp'), 'Xóa hết khi trống: báo "đang trống", không dọn gì');

    // Xóa hết khi có khối: phải ghi xuống bộ nhớ + dọn đỉnh Sổ đo
    const ctx4 = makeCtx();
    ctx4.addVertex(...vertex(0), 'Đ1');
    ctx4.addVertex(...vertex(1), 'Đ2');
    ctx4.addVertex(...vertex(2), 'Đ3');
    ctx4.saveAndStartNewShape();
    ctx4.vertices = [];
    projectPoints = [{ shapeId: ctx4.savedShapes[0].id, name: 'Đ1' }, { name: 'Điểm nhập tay' }];
    confirmAnswer = true;
    ctx4.savedCount = 0;
    ctx4.clearDrawing();
    assert(ctx4.savedShapes.length === 0 && ctx4.savedCount === 1, 'Xóa hết: ghi bộ nhớ (không cho khối cũ hồi sinh khi tải lại)');
    assert(projectPoints.length === 1 && !projectPoints[0].shapeId, 'Xóa hết: đỉnh "ma" của thửa đã xóa bị dọn khỏi Sổ đo, giữ điểm nhập tay');
    ctx4.undo();
    assert(ctx4.savedShapes.length === 1, 'Xóa hết: Ctrl+Z cứu lại được khối vừa xóa');
    assert(ctx4.savedShapes[0].vertices.length === 3, 'Xóa hết: khôi phục đủ 3 đỉnh của khối');
}

// --- NHÓM 3: offset, phím C, zoom ---
console.log('\n--- NHÓM 3: OFFSET / PHÍM C / SIÊU ZOOM ---');
{
    const grpStart = appJs.indexOf('renderGeometry() {');
    const grp = appJs.slice(grpStart, grpStart + 700);
    assert(/this\.layers\.group\.clearLayers\(\);[\s\S]{0,420}addLayer\(this\.layers\.offsetLayer\)/.test(grp),
        'renderGeometry vẽ lại đường Offset phụ (không bị clearLayers xóa trắng)');

    const cBranch = appJs.slice(appJs.indexOf("} else if (key === 'C') {"), appJs.indexOf("} else if (key === 'C') {") + 480);
    assert(/this\.vertices\.length >= 3 && \(this\.mode === 'polygon' \|\| this\.mode === 'polyline'\)/.test(cBranch),
        'Phím C khép góc cho cả Tuyến (polyline), không nhảy nhầm sang Circle');

    const zm = appJs.slice(appJs.indexOf('zoomMax() {'), appJs.indexOf('zoomMax() {') + 900);
    assert(/Math\.min\(23, map\.getMaxZoom\(\)\)/.test(zm), 'Siêu Zoom tôn trọng mức tối đa thực tế của lớp nền đang bật');
    assert(!/Phím tắt: Z">\s*\n?\s*🔍 Siêu Zoom \[Z\]/.test(indexHtml), 'Nút Siêu Zoom không còn quảng cáo phím [Z] (Z là Zoom Extents)');
}

console.log('\n--- NHÓM 4: CÀI ĐẶT HIỂN THỊ KHÔNG ĐƯỢC LÀM ẨN HẾT NÉT VẼ ---');
{
    // initDisplaySettings chạy thật với localStorage giả lập
    const runInit = (stored) => {
        const store = { 'vn2k_cad_display_settings_v3': stored === null ? null : JSON.stringify(stored) };
        const fakeLocal = {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = v; },
            dump: () => store['vn2k_cad_display_settings_v3']
        };
        const apiInit = new Function('localStorage', 'AppState', `return ({ ${extractMethod('initDisplaySettings')} });`)(
            fakeLocal, { savedCadSnapLine: true });
        const ctx = { annotations: [] };
        apiInit.initDisplaySettings.call(ctx);
        return { s: ctx.displaySettings, stored: JSON.parse(fakeLocal.dump()) };
    };

    const healed = runInit({ showVertices: false, showDistances: false, showCenterLabels: false, showAnnotations: false, showBoundaries: false });
    assert(healed.s.showBoundaries === true, 'Trạng thái "tắt sạch" do lỗi hộp thoại Xuất: bật lại nét ranh khi nạp');
    assert(healed.s.showCenterLabels === true && healed.s.showAnnotations === true, 'Khôi phục cả nhãn tâm và ghi chú');
    assert(healed.stored.showBoundaries === true, 'Kết quả khôi phục được ghi xuống localStorage');

    const manual = runInit({ showVertices: true, showDistances: true, showCenterLabels: true, showAnnotations: true, showBoundaries: false });
    assert(manual.s.showBoundaries === false, 'Người dùng tự tắt đúng 1 ô: app KHÔNG quyền bật lại');

    const fresh = runInit(null);
    assert(fresh.s.showBoundaries === true && fresh.s.showVertices === true && fresh.s.showDistances === true, 'Chưa có cài đặt: dùng mặc định hiển thị đầy đủ');

    // Hộp thoại Xuất không được ghi cờ ảnh xuất vào cài đặt hiển thị trên bản đồ
    // (mốc phải lấy từ hàm mở hộp thoại CAD, vì appData cũng có openExportModal trùng tên)
    const boxIdx = appJs.indexOf("setBox('cadExportCheckBoundaries'");
    const exportStart = appJs.lastIndexOf('openExportModal() {', boxIdx);
    const nextMethod = appJs.indexOf('\n    selectExportFormat', exportStart);
    const exportBlock = appJs.slice(exportStart, nextMethod > 0 ? nextMethod : boxIdx + 200);
    assert(!/this\.displaySettings\.show\w+ = savedMeta/.test(exportBlock), 'openExportModal thôi ghi cờ của meta vào displaySettings');
    assert(/setBox\('cadExportCheckBoundaries', savedMeta\.showBoundaries\)/.test(exportBlock), 'Hộp Xuất chỉ áp cờ thành phần cho checkbox của chính nó');

    // Nét vẽ đang chấm phải luôn nhìn thấy
    const draftStart = appJs.indexOf('// 1. Vẽ đường bao (Polyline hoặc Polygon)');
    const draftBlock = appJs.slice(draftStart, draftStart + 400);
    assert(/if \(n >= 2\) \{/.test(draftBlock) && !/showBoundaries && n >= 2/.test(draftBlock), 'Khung nét vẽ dở không còn bị chặn bởi cờ showBoundaries');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (passedTests === totalTests) {
    console.log('🎉 TAB "VẼ" HOẠT ĐỘNG ĐÚNG LOGIC UNDO/REDO & LƯU DỮ LIỆU!');
}
console.log('========================================================================\n');

process.exit(passedTests === totalTests ? 0 : 1);
