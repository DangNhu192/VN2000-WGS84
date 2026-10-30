/**
 * BỘ KIỂM THỬ: CÔNG CỤ VẼ MINICAD HOẠT ĐỘNG ĐÚNG
 * 1. Động cơ hình học CadGeometryEngine được nạp thật trong trình duyệt (Tách/Hợp/Xén/Kéo dài)
 * 2. Gợi ý tên khối tự đổi theo chế độ vẽ (không còn đa giác tên "Tuyến N")
 * 3. Offset ở tab Chọn tạo khối song song từ khối đang chọn
 * 4. Chạy thật các thuật toán split/merge/trim/extend của động cơ hình học
 * Chạy với: node tests/draw_tools_runtime.test.js
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

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const CadGeometryEngine = require('../src/core/cad_geometry.js');

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

console.log('========================================================================');
console.log('🧪 KIỂM THỬ: CÔNG CỤ VẼ MINICAD (ĐỘNG CƠ HÌNH HỌC, TÊN KHỐI, OFFSET)');
console.log('========================================================================\n');

// --- NHÓM 1: ĐỘNG CƠ HÌNH HỌC ĐƯỢC NẠP TRONG TRÌNH DUYỆT ---
console.log('--- NHÓM 1: NẠP CadGeometryEngine (TÁCH / HỢP / XÉN / KÉO DÀI) ---');
{
    const geomTag = indexHtml.indexOf('src/core/cad_geometry.js');
    const appTag = indexHtml.indexOf('src="app.js');
    assert(geomTag > -1, 'index.html có thẻ <script> nạp src/core/cad_geometry.js');
    assert(geomTag > -1 && appTag > -1 && geomTag < appTag, 'cad_geometry.js được nạp TRƯỚC app.js');
    assert(fs.existsSync(path.join(ROOT, 'src/core/cad_geometry.js')), 'Tệp src/core/cad_geometry.js tồn tại trên đĩa');
    assert(swJs.includes("'./src/core/cad_geometry.js'"), 'Service Worker nạp sẵn cad_geometry.js để dùng offline');
    const cacheMatch = swJs.match(/const CACHE_NAME = 'vn2000-pro-(v[\d.]+)';/);
    assert(cacheMatch && cacheMatch[1] === 'v2.8.8', 'CACHE_NAME đã tăng lên v2.8.8 để buộc nạp lại tài nguyên mới');
    ['splitPolygon', 'mergePolygons', 'trimLine', 'extendLine', 'getPolarExtensionPoint'].forEach(fn => {
        assert(typeof CadGeometryEngine[fn] === 'function', `CadGeometryEngine.${fn}() tồn tại`);
    });
    assert(/window\.CadGeometryEngine = CadGeometryEngine/.test(fs.readFileSync(path.join(ROOT, 'src/core/cad_geometry.js'), 'utf8')),
        'cad_geometry.js gán window.CadGeometryEngine khi chạy trong trình duyệt');
}

// --- NHÓM 2: GỢI Ý TÊN KHỐI THEO CHẾ ĐỘ VẼ ---
console.log('\n--- NHÓM 2: GỢI Ý TÊN KHỐI THEO CHẾ ĐỘ VẼ ---');
{
    assert(/\n    syncShapeNameSuggestion\(\) \{/.test(appJs), 'appCadTool có method syncShapeNameSuggestion()');
    const setModeStart = appJs.indexOf('\n    setMode(');
    const setModeEnd = appJs.indexOf('\n    togglePercentRatio(', setModeStart);
    const setModeSrc = appJs.slice(setModeStart, setModeEnd);
    assert(setModeSrc.includes('this.syncShapeNameSuggestion()'), 'setMode() gọi syncShapeNameSuggestion() sau khi đổi chế độ');

    const body = extractMethod('syncShapeNameSuggestion');
    const makeRunner = () => {
        const input = { value: '', placeholder: '' };
        const document = { getElementById: (id) => (id === 'cadActiveShapeName' ? input : null) };
        const api = new Function('document', `return ({ ${body} });`)(document);
        return { input, run: api.syncShapeNameSuggestion };
    };

    let t = makeRunner();
    t.run.call({ mode: 'polygon', savedShapes: [{}, {}] });
    assert(t.input.value === 'Thửa 3', 'Chế độ Đa giác: gợi ý "Thửa 3" khi đã có 2 khối');

    t = makeRunner();
    t.run.call({ mode: 'polyline', savedShapes: [{}] });
    assert(t.input.value === 'Tuyến 2', 'Chế độ Tuyến: gợi ý "Tuyến 2"');

    t = makeRunner();
    t.input.value = 'Thửa 2';
    t.run.call({ mode: 'polyline', savedShapes: [{}] });
    assert(t.input.value === 'Tuyến 2', 'Tên tự động còn sót ("Thửa 2") được đổi theo chế độ mới');

    t = makeRunner();
    t.input.value = 'Lô C1 (nhà bà Lan)';
    t.run.call({ mode: 'polyline', savedShapes: [{}] });
    assert(t.input.value === 'Lô C1 (nhà bà Lan)', 'Tên người dùng tự đặt được giữ nguyên');

    t = makeRunner();
    t.run.call({ mode: 'polygon', savedShapes: [] });
    assert(t.input.placeholder.includes('Thửa 1'), 'Placeholder gợi ý đúng tên khối kế tiếp');
}

// --- NHÓM 3: OFFSET Ở TAB CHỌN ---
console.log('\n--- NHÓM 3: OFFSET TỪ KHỐI ĐANG CHỌN (TAB CHỌN) ---');
{
    const offsetSrc = extractMethod('promptOffset');
    assert(offsetSrc.includes("this.mode === 'select'") && offsetSrc.includes('this.selectedItem'),
        'promptOffset() lấy khối đang chọn khi ở tab Chọn');
    assert(offsetSrc.includes('this.savedShapes.push('), 'promptOffset() tạo khối mới đã lưu cho trường hợp khối đang chọn');
    assert(offsetSrc.includes('(Offset)'), 'Khối Offset mới có hậu tố tên rõ ràng');

    const body = offsetSrc;
    const shape = {
        name: 'Thửa A',
        mode: 'polygon',
        vertices: [
            { name: 'Đ1', x: 1000, y: 1000, lat: 21.0, lng: 105.0, h: 0 },
            { name: 'Đ2', x: 1000, y: 1020, lat: 21.0, lng: 105.0002, h: 0 },
            { name: 'Đ3', x: 1020, y: 1020, lat: 21.0002, lng: 105.0002, h: 0 },
            { name: 'Đ4', x: 1020, y: 1000, lat: 21.0002, lng: 105.0, h: 0 }
        ]
    };
    const ctx = {
        mode: 'select',
        selectedItem: { type: 'shape', index: 0 },
        selectedShape: null,
        vertices: [],
        savedShapes: [shape],
        palette: ['#06b6d4'],
        history: [],
        saved: 0,
        persisted: 0,
        rendered: 0,
        pushHistoryState(msg) { this.history.push(msg); },
        saveShapesForProject() { this.saved++; },
        persistSession() { this.persisted++; },
        renderGeometry() { this.rendered++; },
        updateUi() {},
        renderBlocksPanel() {},
        calculateAreaAndPerimeter(verts, mode) {
            return { area: verts.length * 100, perimeter: verts.length * 10, areaFormatted: '0.00', perimeterFormatted: '0.00', ha: 0, haFormatted: '0.0000', edges: [] };
        },
        layers: {}
    };
    const showToast = () => {};
    const prompt = () => '10';
    const convertVn2kToWgs = (x, y) => ({ lat: 21 + (x - 1000) * 0.00001, lng: 105 + (y - 1000) * 0.00001 });
    const L = { polygon: () => ({ addTo: () => ({}) }), polyline: () => ({ addTo: () => ({}) }) };

    const fn = new Function('showToast', 'prompt', 'convertVn2kToWgs', 'L', 'AppState', 'confirm', `return ({ ${body} });`);
    const run = fn(showToast, prompt, convertVn2kToWgs, L, { kttVal: 105.75, scaleFactor: 0.9999, currentProject: 'Test.csv' }, () => true).promptOffset;
    run.call(ctx);

    assert(ctx.savedShapes.length === 2, 'Offset tạo thêm 1 khối mới từ khối đang chọn');
    const created = ctx.savedShapes[1];
    assert(created && created.name === 'Thửa A (Offset)', 'Khối mới mang tên "Thửa A (Offset)"');
    assert(created && created.mode === 'polygon' && created.vertices.length === 4, 'Khối Offset giữ đúng chế độ đa giác và số đỉnh');
    assert(created && created.stats && created.stats.area > 0, 'Khối Offset được tính lại diện tích');
    const moved = created.vertices.every((v, i) => Math.abs(v.x - shape.vertices[i].x) > 1 || Math.abs(v.y - shape.vertices[i].y) > 1);
    assert(moved, 'Mọi đỉnh của khối Offset đều dịch ra khỏi đỉnh gốc');
    assert(JSON.stringify(shape.vertices.map(v => [v.x, v.y])) === JSON.stringify([[1000, 1000], [1000, 1020], [1020, 1020], [1020, 1000]]),
        'Khối gốc không bị thay đổi tọa độ');
    assert(ctx.saved === 1 && ctx.persisted === 1 && ctx.rendered === 1, 'Khối Offset được lưu dự án + phiên + vẽ lại bản đồ');
    assert(ctx.history.length === 1 && ctx.history[0].includes('Offset'), 'Offset ghi lịch sử để hoàn tác được');
}

// --- NHÓM 4: THUẬT TOÁN HÌNH HỌC CHẠY THẬT ---
console.log('\n--- NHÓM 4: THUẬT TOÁN TÁCH / HỢP / XÉN / KÉO DÀI ---');
{
    const square = [
        { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 0 }
    ];
    const split = CadGeometryEngine.splitPolygon(square, { x: 50, y: -10 }, { x: 50, y: 110 });
    assert(split && split.success, 'splitPolygon() cắt đôi hình vuông thành công');
    const areaA = CadGeometryEngine.calculateArea(split.polygonA);
    const areaB = CadGeometryEngine.calculateArea(split.polygonB);
    assert(Math.abs(areaA - 5000) < 1 && Math.abs(areaB - 5000) < 1, 'Diện tích 2 nửa đều 5.000 m²');
    assert(Math.abs(areaA + areaB - 10000) < 0.01, 'Tổng diện tích 2 nửa bằng hình gốc');

    const halfA = split.polygonA.map(p => ({ x: p.x, y: p.y }));
    const halfB = split.polygonB.map(p => ({ x: p.x, y: p.y }));
    const merged = CadGeometryEngine.mergePolygons(halfA, halfB, 0.25);
    assert(merged && merged.success, 'mergePolygons() hợp 2 nửa trở lại');
    assert(Math.abs(CadGeometryEngine.calculateArea(merged.mergedPolygon) - 10000) < 1, 'Diện tích hợp nhất bằng hình vuông gốc 10.000 m²');

    const trim = CadGeometryEngine.trimLine(
        [{ x: -50, y: 50 }, { x: 150, y: 50 }],
        square,
        { x: -50, y: 50 }
    );
    assert(trim && trim.success, 'trimLine() xén tuyến theo ranh khép kín');
    const trimLen = CadGeometryEngine.calculatePerimeter(trim.trimmedLine, false);
    assert(Math.abs(trimLen - 150) < 1, 'Tuyến sau khi xén bỏ đoạn phía điểm nhấp còn 150 m (từ x=0 tới x=150)');
    const trim2 = CadGeometryEngine.trimLine(
        [{ x: -50, y: 50 }, { x: 150, y: 50 }],
        square,
        { x: 150, y: 50 }
    );
    const trimLen2 = CadGeometryEngine.calculatePerimeter(trim2.trimmedLine, false);
    assert(Math.abs(trimLen2 - 50) < 1, 'Xén phía đối diện chỉ còn 50 m (từ x=-50 tới x=0)');

    const ext = CadGeometryEngine.extendLine(
        [{ x: -50, y: 50 }, { x: -10, y: 50 }],
        square,
        500
    );
    assert(ext && ext.success, 'extendLine() kéo dài tuyến tới ranh giới');
    const extLen = CadGeometryEngine.calculatePerimeter(ext.extendedLine, false);
    assert(Math.abs(extLen - 50) < 1, 'Tuyến sau khi kéo dài chạm ranh tại x=0 (dài 50 m)');
}

console.log('\n========================================================================');
if (failedTests === 0) {
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (100%)`);
    console.log('🎉 CÔNG CỤ VẼ MINICAD ĐÃ ĐƯỢC NẠP ĐẦY ĐỦ VÀ VẬN HÀNH ĐÚNG!');
} else {
    console.error(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} THÀNH CÔNG — ${failedTests} THẤT BẠI`);
}
console.log('========================================================================');
process.exit(failedTests === 0 ? 0 : 1);
