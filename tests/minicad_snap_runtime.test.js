/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: SNAP BẮT CẠNH KHI CHẠM BẢN ĐỒ (MINICAD)
 * Chạy thật findSnapCandidate với bản đồ giả lập để bắt lỗi runtime
 * (ReferenceError do biến chưa khai báo khiến mọi cú chạm bản đồ không tạo được đỉnh).
 * Chạy với: node tests/minicad_snap_runtime.test.js
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

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: SNAP BẮT CẠNH — CHẠM BẢN ĐỒ PHẢI TẠO ĐƯỢC ĐỈNH');
console.log('========================================================================\n');

// --- HỆ QUY CHIẾU GIẢ LẬP: VN-2000 (x = Bắc, y = Đông) <-> WGS84, bản đồ 40 px/m ---
const PX_PER_M = 40;
const COS_LAT = Math.cos(10 * Math.PI / 180);
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LNG = 111320 * COS_LAT;

const toLat = (x, y) => 10 + x / M_PER_DEG_LAT;
const toLng = (x, y) => 106 + y / M_PER_DEG_LNG;

const fakeMap = {
    getZoom: () => 21,
    latLngToContainerPoint: (ll) => ({
        x: (ll[1] - 106) * M_PER_DEG_LNG * PX_PER_M,
        y: -((ll[0] - 10) * M_PER_DEG_LAT) * PX_PER_M
    }),
    distance: (a, b) => Math.hypot((b[0] - a[0]) * M_PER_DEG_LAT, (b[1] - a[1]) * M_PER_DEG_LNG)
};

function makeVertex(x, y, name) {
    return { id: name, name, lat: toLat(x, y), lng: toLng(x, y), x, y, h: 0 };
}

// Hình chữ nhật 10m x 10m, đỉnh theo chiều kim đồng hồ trong hệ (Bắc, Đông)
const rect = {
    id: 'shape_1',
    name: 'Thửa 1',
    shortName: 'Thửa 1',
    mode: 'polygon',
    vertices: [makeVertex(0, 0, 'A'), makeVertex(10, 0, 'B'), makeVertex(10, 10, 'C'), makeVertex(0, 10, 'D')]
};

const makeApi = new Function('AppState', 'appData', 'convertWgsToVn2k', 'convertVn2kToWgs',
    `return ({ ${extractMethod('findSnapCandidate')} });`);

const api = makeApi(
    { leafletMap: fakeMap, currentProject: 'Test', kttVal: 105, scaleFactor: 0.9999 },
    { getPoints: () => [] },
    (lat, lng) => ({ X: (lat - 10) * M_PER_DEG_LAT, Y: (lng - 106) * M_PER_DEG_LNG }),
    (x, y) => ({ lat: toLat(x, y), lng: toLng(x, y) })
);

function makeCtx() {
    return {
        snapThresholdPx: 24,
        snapLineEnabled: true,
        snapEnabled: true,
        mode: 'polygon',
        savedShapes: [rect],
        vertices: []
    };
}

// --- NHÓM 1: KHÔNG ĐƯỢC NÉM LỖI KHI QUÉT CẠNH ---
console.log('--- NHÓM 1: QUÉT CẠNH KHÔNG SINH LỖI RUNTIME ---');
{
    assert(!/segLenSq/.test(appJs), 'Không còn tham chiếu biến chưa khai báo segLenSq trong app.js');

    let threw = null;
    let result = null;
    try {
        result = api.findSnapCandidate.call(makeCtx(), toLat(3, -0.2), toLng(3, -0.2));
    } catch (e) {
        threw = e;
    }
    assert(threw === null, 'Chạm gần cạnh (trong ngưỡng) không ném ReferenceError' + (threw ? ': ' + threw.message : ''));
    assert(!!result, 'Chạm gần cạnh trả về điểm bắt (snap candidate)');
    if (result) {
        assert(result.snapType === 'edge', 'Loại bắt điểm là edge (chiếu vuông góc lên cạnh)');
        assert(Math.abs(result.x - 3) < 0.01, 'Điểm bắt nằm đúng trên cạnh: X ≈ 3.000 (nhận ' + result.x + ')');
        assert(Math.abs(result.y) < 0.01, 'Điểm bắt nằm đúng trên cạnh: Y ≈ 0.000 (nhận ' + result.y + ')');
        assert(/Cạnh/.test(result.source || ''), 'Nguồn bắt điểm ghi rõ cạnh đang bắt');
    }
}

// --- NHÓM 2: CÁC TRƯỜNG HỢP BIÊN ---
console.log('\n--- NHÓM 2: TRƯỜNG HỢP BIÊN ---');
{
    let threw = null;
    let res = 'unset';
    try {
        // Cách cạnh 2m (ngoài giới hạn thực địa 0.35m) nhưng vẫn trong bán kính pixel
        res = api.findSnapCandidate.call(makeCtx(), toLat(3, -2), toLng(3, -2));
    } catch (e) { threw = e; }
    assert(threw === null, 'Chạm xa cạnh (ngoài 0.35m thực địa) không ném lỗi');
    assert(res === null, 'Chạm xa cạnh trả về null thay vì bắt nhầm');

    threw = null;
    try {
        // Ngoài đoạn cạnh (t > 0.985) và cách đỉnh B hơn 0.6m: phải không bắt được
        res = api.findSnapCandidate.call(makeCtx(), toLat(11.2, -0.2), toLng(11.2, -0.2));
    } catch (e) { threw = e; }
    assert(threw === null && res === null, 'Chạm ngoài đầu mút cạnh không bắt nhầm điểm trên cạnh');

    // Không có khối nào: chỉ có lớp điểm thì vẫn không lỗi
    const emptyCtx = makeCtx();
    emptyCtx.savedShapes = [];
    threw = null;
    try { res = api.findSnapCandidate.call(emptyCtx, 10.5, 106.5); } catch (e) { threw = e; }
    assert(threw === null && res === null, 'Bản vẽ trống: chạm bản đồ trả về null, không lỗi');

    // Tắt bắt cạnh: bỏ qua bước quét cạnh
    const offCtx = makeCtx();
    offCtx.snapLineEnabled = false;
    threw = null;
    try { res = api.findSnapCandidate.call(offCtx, toLat(3, 0), toLng(3, 0)); } catch (e) { threw = e; }
    assert(threw === null && res === null, 'Tắt Snap line: không quét cạnh và không lỗi');
}

// --- NHÓM 3: BẮT ĐỈNH VẪN HOẠT ĐỘNG ---
console.log('\n--- NHÓM 3: BẮT ĐỈNH (VERTEX SNAP) ---');
{
    const res = api.findSnapCandidate.call(makeCtx(), toLat(0.05, 0.05), toLng(0.05, 0.05));
    assert(!!res && res.snapType === 'vertex', 'Chạm sát đỉnh A vẫn bắt đúng đỉnh (ưu tiên trước cạnh)');
    assert(!!res && res.name === 'A', 'Tên điểm bắt là đỉnh A');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 SNAP BẮT CẠNH HOẠT ĐỘNG ĐÚNG — CHẠM BẢN ĐỒ TẠO ĐƯỢC ĐỈNH!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
