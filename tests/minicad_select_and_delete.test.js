/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: CÔNG CỤ CHỌN ĐỐI TƯỢNG + XÓA KHỐI (MINICAD)
 * - Chạm vào khối đa giác / cạnh / mốc ở chế độ Chọn phải chọn được khối.
 * - Xóa khối phải dọn luôn các đỉnh của khối đó khỏi danh sách Sổ đo Dự án.
 * Chạy với: node tests/minicad_select_and_delete.test.js
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

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

function blockAround(anchor, span = 1400) {
    const i = appJs.indexOf(anchor);
    if (i < 0) return '';
    return appJs.slice(i, i + span);
}

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: CHỌN ĐỐI TƯỢNG & XÓA KHỐI TRONG MINICAD');
console.log('========================================================================\n');

// --- NHÓM 1: CHẠM KHỐI Ở CHẾ ĐỘ CHỌN PHẢI CHỌN ĐƯỢC KHỐI ---
console.log('--- NHÓM 1: CHẠM KHỐI / CẠNH / MỐC Ở CHẾ ĐỘ CHỌN ---');
{
    const polyClick = blockAround("sShapeLayer.on('click'", 520);
    assert(/sShapeLayer\.on\('click'/.test(polyClick), 'Tìm thấy handler click của khối đa giác');
    assert(/this\.mode === 'select'/.test(polyClick), 'Click khối đa giác có nhánh xử lý chế độ Chọn');
    assert(/selectItem\(\{\s*type: 'shape',\s*index: sIdx/.test(polyClick), 'Click khối đa giác gọi selectItem cho đúng khối');

    // Handler hit-line của khối đã lưu (sau handler polygon trong renderGeometry)
    const polyAnchor = appJs.indexOf("sShapeLayer.on('click'");
    const hitAnchor = appJs.indexOf("hitLine.on('click'", polyAnchor);
    const hitLineClick = hitAnchor >= 0 ? appJs.slice(hitAnchor, hitAnchor + 700) : '';
    assert(hitAnchor >= 0, 'Tìm thấy handler click của đường bắt cạnh (hit-line)');
    assert(/this\.mode === 'select'/.test(hitLineClick), 'Click đường bắt cạnh (hit-line) có nhánh chế độ Chọn');
    assert(/selectItem\(\{\s*type: 'shape',\s*index: sIdx/.test(hitLineClick), 'Click cạnh chọn khối thay vì chỉ ghim nhãn cự ly');

    const markerClick = blockAround("marker.on('click', (e) => {\n                    if (isDragging) return;", 700);
    assert(/appCadTool\.mode === 'select'/.test(markerClick), 'Click mốc đỉnh có nhánh chế độ Chọn');
    assert(/appCadTool\.selectItem\(\{\s*type: 'shape',\s*index: sIdx/.test(markerClick), 'Click mốc đỉnh chọn đúng khối chứa mốc');
    const selectIdx = markerClick.indexOf("mode === 'select'");
    const pointIdx = markerClick.indexOf("mode === 'point'");
    assert(selectIdx >= 0 && (selectIdx < pointIdx || pointIdx < 0), 'Nhánh Chọn đứng trước nhánh Điểm (không bị chặn sớm)');
    assert(!/if \(appCadTool\.mode === 'point' \|\| appCadTool\.mode === 'select'\) return;/.test(markerClick), 'Không còn chặn chung Điểm/Chọn làm mất chức năng chọn');
}

// --- NHÓM 2: NHÃN MÔ TẢ ĐỐI TƯỢNG ĐANG CHỌN ---
console.log('\n--- NHÓM 2: NHÃN MÔ TẢ ĐỐI TƯỢNG ĐANG CHỌN ---');
{
    let nameElText = '';
    const nameEl = {
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        set innerText(v) { nameElText = v; },
        get innerText() { return nameElText; }
    };
    const stubEl = () => ({ style: {}, innerText: '', classList: { add() {}, remove() {}, toggle() {} } });
    const documentStub = { getElementById: (id) => (id === 'cadSelectedObjectName' ? nameEl : stubEl()) };

    const makeApi = new Function('document', 'showToast', 'triggerHaptic',
        `return ({ ${extractMethod('selectItem')} });`);
    const api = makeApi(documentStub, () => {}, () => {});

    const ctx = {
        savedShapes: [
            { id: 'p1', name: 'Mốc G1', shortName: 'G1', mode: 'point', vertices: [{ name: 'P1' }, { name: 'P2' }], stats: { areaFormatted: '0,00' } },
            { id: 's1', name: 'Thửa 1', shortName: 'T1', mode: 'polygon', vertices: [{}, {}, {}, {}], stats: { areaFormatted: '726,42' } }
        ],
        activeToolTab: 'select',
        switchToolTab() {},
        renderGeometry() {},
        renderAnnotations() {},
        deselectCurrent() { this.selectedItem = null; },
        calculateAreaAndPerimeter: () => ({ areaFormatted: '0,00' })
    };

    api.selectItem.call(ctx, { type: 'shape', index: 0, name: 'Mốc G1' });
    assert(ctx.selectedItem && ctx.selectedItem.index === 0, 'Chọn lớp điểm: selectedItem được ghi nhận');
    assert(/Lớp điểm \[Mốc G1\]/.test(nameElText), 'Lớp điểm hiển thị nhãn "Lớp điểm"');
    assert(/\(2 điểm\)/.test(nameElText), 'Lớp điểm hiển thị đúng số điểm');
    assert(!/S = /.test(nameElText), 'Lớp điểm không hiển thị diện tích vô nghĩa');

    api.selectItem.call(ctx, { type: 'shape', index: 1, name: 'Thửa 1' });
    assert(/Khối \[Thửa 1\]/.test(nameElText), 'Khối đa giác hiển thị nhãn "Khối"');
    assert(/S = 726,42 m²/.test(nameElText), 'Khối đa giác hiển thị diện tích');
    assert(/\(4 đỉnh\)/.test(nameElText), 'Khối đa giác hiển thị đúng số đỉnh');

    api.selectItem.call(ctx, null);
    assert(ctx.selectedItem === null, 'Chọn null: bỏ chọn đối tượng');
}

// --- NHÓM 3: XÓA KHỐI PHẢI DỌN ĐIỂM SỔ ĐO ---
console.log('\n--- NHÓM 3: XÓA KHỐI DỌN SẠCH ĐIỂM SỔ ĐO ---');
{
    const makeApi = new Function('document', 'showToast', 'appData', 'AppState',
        `return ({ ${extractMethod('deleteShape')},\n${extractMethod('pruneCadProjectPoints')} });`);

    let savedPoints = [];
    let savePointsCalls = 0;
    const appDataStub = {
        getPoints: () => savedPoints,
        savePoints: (proj, pts) => { savedPoints = pts; savePointsCalls++; }
    };

    const makeCtx = (shapes) => ({
        savedShapes: shapes,
        pointLayerId: null,
        isShapeLocked: () => false,
        pushHistoryState() {},
        saveShapesForProject() {},
        persistSession() {},
        deselectCurrent() {},
        renderGeometry() {},
        updateUi() {},
        renderBlocksPanel() {},
        refreshPointLayerBar() {},
        openAreaTableModal() {}
    });

    const shapes = [
        { id: 's1', name: 'Thửa 1', vertices: [{ name: 'A' }] },
        { id: 's2', name: 'Lớp điểm', mode: 'point', vertices: [{ name: 'P1' }] }
    ];
    savedPoints = [
        { shapeId: 's1', name: 'A' },
        { shapeId: 's2', name: 'P1' },
        { name: 'Điểm nhập tay' }
    ];

    const api = makeApi({ getElementById: () => ({ style: { display: 'none' } }) }, () => {}, appDataStub, { currentProject: 'Test' });
    // Nối method helper vào ctx qua prototype để deleteShape gọi được this.pruneCadProjectPoints thật
    const withApi = (o) => Object.assign(Object.create(api), o);
    const ctx = withApi(makeCtx(shapes));
    api.deleteShape.call(ctx, 0, true);
    assert(ctx.savedShapes.length === 1, 'Xóa khối: danh sách khối còn lại 1');
    assert(savePointsCalls === 1, 'Xóa khối: có ghi lại danh sách điểm Sổ đo');
    assert(savedPoints.every(p => p.shapeId !== 's1'), 'Điểm của khối đã xóa bị loại khỏi Sổ đo');
    assert(savedPoints.some(p => p.shapeId === 's2'), 'Điểm của khối còn lại được giữ nguyên');
    assert(savedPoints.some(p => !p.shapeId), 'Điểm nhập tay (không thuộc khối) được giữ nguyên');

    // Xóa khối cuối cùng: syncShapesToProjectPoints không chạy, vẫn phải dọn điểm
    savedPoints = [{ shapeId: 's9', name: 'Z' }, { name: 'Điểm nhập tay' }];
    savePointsCalls = 0;
    const ctx2 = withApi(makeCtx([{ id: 's9', name: 'Khối cuối', vertices: [] }]));
    api.deleteShape.call(ctx2, 0, true);
    assert(ctx2.savedShapes.length === 0, 'Xóa khối cuối cùng: danh sách khối rỗng');
    assert(savePointsCalls === 1, 'Xóa khối cuối cùng: vẫn ghi lại Sổ đo (không bị bỏ qua)');
    assert(!savedPoints.some(p => p.shapeId === 's9'), 'Xóa khối cuối cùng: điểm "ma" của khối đã xóa bị dọn');
    assert(savedPoints.length === 1 && savedPoints[0].name === 'Điểm nhập tay', 'Xóa khối cuối cùng: điểm nhập tay vẫn còn');

    // Khối bị khóa: không xóa, không đụng Sổ đo
    savedPoints = [{ shapeId: 's3', name: 'K' }];
    savePointsCalls = 0;
    const ctx3 = withApi(makeCtx([{ id: 's3', name: 'Khóa', locked: true, vertices: [] }]));
    ctx3.isShapeLocked = () => true;
    api.deleteShape.call(ctx3, 0, true);
    assert(ctx3.savedShapes.length === 1, 'Khối bị khóa: không xóa được');
    assert(savePointsCalls === 0, 'Khối bị khóa: không đụng tới Sổ đo');

    // Index không tồn tại: no-op
    const ctx4 = withApi(makeCtx([]));
    let threw = null;
    try { api.deleteShape.call(ctx4, 5, true); } catch (e) { threw = e; }
    assert(threw === null, 'Xóa index không tồn tại: không ném lỗi');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 CÔNG CỤ CHỌN & XÓA KHỐI HOẠT ĐỘNG ĐÚNG LOGIC!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
