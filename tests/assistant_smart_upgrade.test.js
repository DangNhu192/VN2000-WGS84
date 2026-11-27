// Kiểm thử nâng cấp Trợ lý AI thông minh (v2.8.62):
// 11 công cụ mới thao tác trực tiếp các phân hệ app, tính diện tích đa giác, gợi ý thông minh khi gõ nhầm,
// ngữ pháp GBNF, kiểm định validateCall nghiêm ngặt và tuân thủ tách biệt giao diện (AGENTS.md §2).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../assistant-core.js');
const G = require('../geodesy.js');
const DATA = require('../assistant-dataset.js');

const root = path.join(__dirname, '..');
const ctx = { provinces: G.VN_PROVINCES };

test('Công cụ mới: tìm mốc, khoảng cách giữa 2 mốc có tên, lưu mốc, cắm mốc theo tên', () => {
    assert.deepEqual(C.route('tìm mốc M2', ctx), { intent: 'findPoint', args: { query: 'M2' } });
    assert.deepEqual(C.route('tọa độ mốc m1 là bao nhiêu', ctx), { intent: 'findPoint', args: { query: 'M1' } });
    assert.deepEqual(C.route('mốc G1 ở đâu', ctx), { intent: 'findPoint', args: { query: 'G1' } });

    assert.deepEqual(C.route('khoảng cách từ M1 đến M3', ctx), { intent: 'distancePoints', args: { from: 'M1', to: 'M3' } });
    assert.deepEqual(C.route('phương vị từ A1 tới A2', ctx), { intent: 'distancePoints', args: { from: 'A1', to: 'A2' } });
    assert.deepEqual(C.route('từ đây đến mốc M2 bao xa', ctx), { intent: 'distancePoints', args: { from: 'GPS', to: 'M2' } });
    assert.deepEqual(C.route('khoảng cách từ điểm vừa rồi đến M1', ctx), { intent: 'distancePoints', args: { from: 'LAST', to: 'M1' } });

    assert.deepEqual(C.route('lưu điểm vừa chuyển tên M5', ctx), { intent: 'savePoint', args: { name: 'M5' } });
    assert.deepEqual(C.route('lưu vị trí hiện tại thành mốc G1', ctx), { intent: 'savePoint', args: { name: 'G1', source: 'gps' } });
    assert.equal(C.route('lưu điểm đó tên A2 ghi chú góc nhà', ctx).args.note, 'góc nhà');

    assert.deepEqual(C.route('cắm mốc M2', ctx), { intent: 'stakeoutPoint', args: { name: 'M2' } });
    assert.deepEqual(C.route('dẫn đường tới mốc A3', ctx), { intent: 'stakeoutPoint', args: { name: 'A3' } });
    // Không cướp lệnh mở chung khi không chỉ định tên mốc
    assert.deepEqual(C.route('cắm mốc', ctx), { intent: 'open', args: { target: 'drawerItem_stakeout' } });
    assert.deepEqual(C.route('dẫn đường tới mốc', ctx), { intent: 'open', args: { target: 'drawerItem_stakeout' } });
});

test('Công cụ mới: thống kê & điều khiển MiniCAD, tính diện tích từ tọa độ dán', () => {
    assert.deepEqual(C.route('thống kê MiniCAD', ctx), { intent: 'cadSummary', args: {} });
    assert.deepEqual(C.route('diện tích thửa 1 bao nhiêu', ctx), { intent: 'cadSummary', args: { query: 'thửa 1' } });

    assert.deepEqual(C.route('mở bảng kê MiniCAD', ctx), { intent: 'cadAction', args: { action: 'table' } });
    assert.deepEqual(C.route('vẽ đa giác', ctx), { intent: 'cadAction', args: { action: 'polygon' } });
    assert.deepEqual(C.route('bật snap', ctx), { intent: 'cadAction', args: { action: 'snap' } });
    assert.deepEqual(C.route('khóa vuông góc', ctx), { intent: 'cadAction', args: { action: 'ortho' } });
    assert.deepEqual(C.route('hoàn tác', ctx), { intent: 'cadAction', args: { action: 'undo' } });
    assert.deepEqual(C.route('zoom toàn cảnh bản vẽ', ctx), { intent: 'cadAction', args: { action: 'zoom' } });
    assert.deepEqual(C.route('nối điểm MiniCAD', ctx), { intent: 'cadAction', args: { action: 'connect' } });

    const area = C.route('tính diện tích 1191800 603700 1191850 603700 1191850 603750 1191800 603750', ctx);
    assert.equal(area.intent, 'calcArea');
    assert.equal(area.args.points.length, 4);
});

test('Công cụ mới: lớp bản đồ, quy hoạch Guland 2030, lộ trình, đổi KTT, quản lý dự án, chế độ thực địa & ngôn ngữ', () => {
    assert.deepEqual(C.route('đổi nền vệ tinh Esri', ctx), { intent: 'mapLayer', args: { kind: 'basemap', value: 'esri_satellite' } });
    assert.deepEqual(C.route('đổi nền địa hình', ctx), { intent: 'mapLayer', args: { kind: 'basemap', value: 'opentopomap' } });
    assert.deepEqual(C.route('bật giao thông trực tiếp', ctx), { intent: 'mapLayer', args: { kind: 'overlay', value: 'google_traffic', on: true } });
    assert.deepEqual(C.route('bật ranh giới 34 tỉnh', ctx), { intent: 'mapLayer', args: { kind: 'overlay', value: 'prov34', on: true } });
    assert.deepEqual(C.route('bật quy hoạch Đồng Tháp', ctx), { intent: 'mapLayer', args: { kind: 'planning', value: 'Đồng Tháp', on: true } });
    assert.deepEqual(C.route('tắt quy hoạch', ctx), { intent: 'mapLayer', args: { kind: 'planning', value: 'current', on: false } });
    assert.deepEqual(C.route('độ mờ quy hoạch 60%', ctx), { intent: 'mapLayer', args: { kind: 'planning', value: 'current', on: true, opacity: 60 } });

    assert.deepEqual(C.route('tối ưu lộ trình xe máy', ctx), { intent: 'routeProject', args: { vehicle: 'bike' } });
    assert.deepEqual(C.route('tối ưu lộ trình ô tô 16 chỗ', ctx), { intent: 'routeProject', args: { vehicle: 'minibus' } });
    assert.deepEqual(C.route('tối ưu lộ trình từ vị trí hiện tại', ctx), { intent: 'routeProject', args: { vehicle: 'car', startFromGps: true } });

    const rz = C.route('quy đổi 1191942.305 603797.261 sang KTT Đồng Tháp', ctx);
    assert.equal(rz.intent, 'rezone');
    assert.equal(rz.args.X, 1191942.305);
    assert.equal(G.VN_PROVINCES[rz.args.index].name, 'Đồng Tháp');

    assert.deepEqual(C.route('danh sách dự án', ctx), { intent: 'switchProject', args: { action: 'list' } });
    assert.deepEqual(C.route('chuyển sang dự án KhuA', ctx), { intent: 'switchProject', args: { action: 'switch', name: 'KhuA' } });
    assert.deepEqual(C.route('tạo dự án mới DoDac2026', ctx), { intent: 'switchProject', args: { action: 'create', name: 'DoDac2026' } });

    assert.deepEqual(C.route('bật chế độ thực địa', ctx), { intent: 'appMode', args: { target: 'field', value: 'on' } });
    assert.deepEqual(C.route('tắt chế độ thực địa', ctx), { intent: 'appMode', args: { target: 'field', value: 'off' } });
    assert.deepEqual(C.route('đổi sang tiếng Anh', ctx), { intent: 'appMode', args: { target: 'lang', value: 'en' } });
    assert.deepEqual(C.route('chuyển ngôn ngữ tiếng Việt', ctx), { intent: 'appMode', args: { target: 'lang', value: 'vi' } });
});

test('validateCall chặn tham số sai và chấp nhận các công cụ mới hợp lệ', () => {
    assert.equal(C.validateCall({ tool: 'mapLayer', args: { kind: 'basemap', value: 'hacker_map' } }, ctx), null);
    assert.equal(C.validateCall({ tool: 'appMode', args: { target: 'field', value: 'vi' } }, ctx), null);
    assert.equal(C.validateCall({ tool: 'switchProject', args: { action: 'delete', name: 'A' } }, ctx), null);
    assert.equal(C.validateCall({ tool: 'switchProject', args: { action: 'switch' } }, ctx), null);
    assert.equal(C.validateCall({ tool: 'cadAction', args: { action: 'formatDisk' } }, ctx), null);
    assert.ok(C.validateCall({ tool: 'mapLayer', args: { kind: 'planning', value: 'Đồng Tháp', on: true, opacity: 65 } }, ctx));
    assert.ok(C.validateCall({ tool: 'rezone', args: { toProvince: 'Đồng Tháp', X: 1191942.3, Y: 603797.2 } }, ctx));
});

test('Gợi ý thông minh khi gõ nhầm chính tả (chống đoán bừa nhưng gợi ý chính xác)', () => {
    const s1 = C.suggestCommands('mo mincad', DATA, 3);
    assert.ok(s1.length >= 1 && s1.some(x => x.tool === 'open' && x.args.target === 'drawerItem_cad_tool'), 'Gợi ý mở MiniCAD khi gõ "mo mincad"');

    const s2 = C.suggestCommands('bat quy hoah dong thp', DATA, 3);
    assert.ok(s2.length >= 1 && s2.some(x => x.tool === 'mapLayer' && x.args.kind === 'planning'), 'Gợi ý quy hoạch khi gõ sai dấu/thiếu ký tự');

    const s3 = C.suggestCommands('xyz123 hoàn toàn vô nghĩa', DATA, 3);
    assert.equal(s3.length, 0, 'Không bịa gợi ý với câu vô nghĩa');
});

test('assistant.js giữ nguyên nguyên tắc tách biệt giao diện (AGENTS.md §2) và có bộ nhớ đa lượt + chip ngữ cảnh', () => {
    const js = fs.readFileSync(path.join(root, 'assistant.js'), 'utf8');
    assert.ok(js.includes('const session = {'), 'Có bộ nhớ hội thoại đa lượt');
    assert.ok(js.includes('function getContextChips()'), 'Có chip gợi ý theo ngữ cảnh màn hình');
    assert.ok(js.includes('function buildLiveSuggestions('), 'Có gợi ý trực tiếp khi đang gõ');
    assert.ok(js.includes("appNav.openTransformMap({ mode: 'view', singlePoint: { lat, lng, name } })"), 'Điểm chuyển đổi luôn mở Bản đồ Chuyển đổi (không gọi chéo Bản đồ dự án)');
    assert.ok(js.includes("if (S().mapMode !== 'cad' || S().currentScreen !== 'map') appNav.openCadMap();"), 'Thao tác MiniCAD chỉ chạy trong phân hệ MiniCAD');
});
