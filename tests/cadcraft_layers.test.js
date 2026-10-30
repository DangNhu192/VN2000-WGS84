/**
 * BỘ KIỂM THỬ: QUẢN LÝ LỚP (LAYER) MINICAD
 * 1. Khối mới được gán lớp hiện hành + màu theo lớp
 * 2. Đổi màu lớp áp cho mọi khối thuộc lớp, không đụng khối khác
 * 3. Lớp khóa chặn xóa / tách thửa / hợp thửa
 * 4. Xuất DXF khai báo lớp động và ghi đường ranh vào đúng lớp của khối
 * Chạy với: node tests/cadcraft_layers.test.js
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
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

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

const LAYER_METHODS = [
    'getLayerById', 'getShapeLayerId', 'isShapeLayerLocked', 'cadLayerColorToAci',
    'sanitizeLayerId', 'collectExportLayers', 'setLayerColor'
];

function makeLayerApi() {
    const body = LAYER_METHODS.map(extractMethod).join(',\n');
    return new Function('showToast', 'AppState', `return ({ ${body} });`)(() => {}, { currentProject: 'Test.csv' });
}

function makeCtx() {
    const ctx = Object.assign(makeLayerApi(), {
        layersTable: [
            { id: 'RANH_THUA', name: 'Ranh thửa đất', color: '#ef4444', visible: true, locked: false },
            { id: 'MOC_TOADO', name: 'Mốc tọa độ & Đỉnh', color: '#22c55e', visible: true, locked: false },
            { id: 'TIM_DUONG', name: 'Tim & Mép đường', color: '#eab308', visible: true, locked: true }
        ],
        savedShapes: [
            { name: 'Thửa A', layer: 'TIM_DUONG', color: '#eab308' },
            { name: 'Thửa B', layer: 'RANH_THUA', color: '#ef4444' },
            { name: 'Thửa C', color: '#06b6d4' }
        ],
        history: [],
        counters: { table: 0, saved: 0, persisted: 0, rendered: 0, blocks: 0, list: 0, badge: 0 },
        pushHistoryState(msg) { this.history.push(msg); },
        saveLayersTable() { this.counters.table++; },
        saveShapesForProject() { this.counters.saved++; },
        persistSession() { this.counters.persisted++; },
        renderGeometry() { this.counters.rendered++; },
        renderBlocksPanel() { this.counters.blocks++; },
        renderLayersList() { this.counters.list++; },
        updateCurrentLayerBadge() { this.counters.badge++; }
    });
    return ctx;
}

console.log('========================================================================');
console.log('🧪 KIỂM THỬ: LAYER MANAGER MINICAD (GÁN LỚP, MÀU, KHÓA, XUẤT DXF)');
console.log('========================================================================\n');

// --- NHÓM 1: MÔ HÌNH LỚP & CHUẨN HÓA MÃ LỚP ---
console.log('--- NHÓM 1: MÔ HÌNH LỚP & CHUẨN HÓA MÃ LỚP ---');
{
    assert(/layersTable: \[/.test(appJs), 'appCadTool có bảng layersTable');
    ['RANH_THUA', 'MOC_TOADO', 'TIM_DUONG', 'NHA_CONGTRINH', 'QUY_HOACH', 'DIA_VAT', 'GHI_CHU'].forEach(id => {
        assert(appJs.includes(`{ id: '${id}'`), `Bảng lớp mặc định có lớp ${id}`);
    });

    const ctx = makeCtx();
    assert(ctx.getShapeLayerId({}) === 'RANH_THUA', 'Khối không có layer được coi là RANH_THUA');
    assert(ctx.getShapeLayerId({ layer: 'TIM_DUONG' }) === 'TIM_DUONG', 'getShapeLayerId() trả đúng lớp đã gán');
    assert(ctx.isShapeLayerLocked({ layer: 'TIM_DUONG' }) === true, 'Lớp đang khóa được nhận diện');
    assert(ctx.isShapeLayerLocked({ layer: 'RANH_THUA' }) === false, 'Lớp thường không bị coi là khóa');

    assert(ctx.sanitizeLayerId('ranh_thua') === 'RANH_THUA', 'sanitizeLayerId() viết hoa mã lớp');
    assert(ctx.sanitizeLayerId('Đường điện') === 'DUONG_DIEN', 'sanitizeLayerId() bỏ dấu tiếng Việt cho DXF');
    assert(ctx.sanitizeLayerId('  ') === 'RANH_THUA', 'sanitizeLayerId() trả lớp mặc định khi rỗng');
    assert(ctx.sanitizeLayerId('Tim--Đường') === 'TIM_DUONG', 'sanitizeLayerId() gộp ký tự đặc biệt thành 1 gạch dưới');

    // Thêm lớp mới: người dùng gõ tên có dấu vẫn ra mã lớp ASCII chuẩn CAD
    const addSrc = extractMethod('promptAddNewLayer');
    const answers = ['Đường điện', 'Đường điện nội bộ'];
    const toasts = [];
    const addCtx = new Function('prompt', 'showToast', `return ({ ${addSrc} });`)(
        () => answers.shift(), (m) => toasts.push(String(m)));
    addCtx.layersTable = [];
    addCtx.palette = ['#06b6d4'];
    addCtx.saveLayersTable = () => {};
    addCtx.renderLayersList = () => {};
    addCtx.sanitizeLayerId = ctx.sanitizeLayerId;
    addCtx.promptAddNewLayer();
    assert(addCtx.layersTable.length === 1 && addCtx.layersTable[0].id === 'DUONG_DIEN',
        'Lớp mới gõ tiếng Việt có dấu vẫn được cấp mã ASCII (DUONG_DIEN)');
    assert(addCtx.layersTable[0].name === 'Đường điện nội bộ', 'Tên tiếng Việt của lớp được giữ nguyên để hiển thị');
}

// --- NHÓM 2: MÀU LỚP SANG CHỈ SỐ MÀU AUTOCAD (ACI) ---
console.log('\n--- NHÓM 2: QUY ĐỔI MÀU LỚP SANG ACI ---');
{
    const ctx = makeCtx();
    const cases = [['#ff0000', 1, 'đỏ'], ['#ffff00', 2, 'vàng'], ['#00ff00', 3, 'lục'], ['#00ffff', 4, 'lam lơ'],
        ['#0000ff', 5, 'lam'], ['#ff00ff', 6, 'tím'], ['#ffffff', 7, 'trắng'], ['#808080', 8, 'xám']];
    cases.forEach(([hex, aci, name]) => {
        assert(ctx.cadLayerColorToAci(hex) === aci, `Màu ${name} ${hex} → ACI ${aci}`);
    });
    assert(ctx.cadLayerColorToAci('#ef4444') === 1, 'Màu ranh thửa #ef4444 → ACI đỏ');
    assert(ctx.cadLayerColorToAci('#22c55e') === 3, 'Màu mốc #22c55e → ACI lục');
    assert(ctx.cadLayerColorToAci('không-phải-màu') === 7, 'Màu không hợp lệ → ACI trắng mặc định');
}

// --- NHÓM 3: ĐỔI MÀU LỚP ÁP CHO MỌI KHỐI THUỘC LỚP ---
console.log('\n--- NHÓM 3: ĐỔI MÀU LỚP (BYLAYER) ---');
{
    const ctx = makeCtx();
    ctx.setLayerColor('RANH_THUA', '#0000ff');
    assert(ctx.layersTable[0].color === '#0000ff', 'Màu lớp RANH_THUA được cập nhật');
    assert(ctx.savedShapes[1].color === '#0000ff', 'Khối thuộc lớp RANH_THUA đổi theo màu lớp');
    assert(ctx.savedShapes[0].color === '#eab308', 'Khối thuộc lớp khác giữ nguyên màu');
    assert(ctx.savedShapes[2].color === '#06b6d4', 'Khối không gán lớp giữ nguyên màu riêng');
    assert(ctx.counters.table === 1 && ctx.counters.saved === 1 && ctx.counters.persisted === 1,
        'Đổi màu lớp được lưu vào localStorage + dự án + phiên');
    assert(ctx.counters.rendered === 1 && ctx.counters.blocks === 1 && ctx.counters.list === 1 && ctx.counters.badge === 1,
        'Đổi màu lớp vẽ lại bản đồ, bảng khối, danh sách lớp và huy hiệu lớp');
    assert(ctx.history.length === 0, 'Đổi màu lớp không tạo mốc lịch sử vẽ (giống ẩn/khóa lớp)');

    const before = ctx.layersTable[0].color;
    ctx.setLayerColor('RANH_THUA', 'xanh');
    assert(ctx.layersTable[0].color === before && ctx.history.length === 0, 'Mã màu sai bị bỏ qua, không đổi gì');
}

// --- NHÓM 4: KHỐI MỚI GÁN LỚP HIỆN HÀNH ---
console.log('\n--- NHÓM 4: GÁN LỚP KHI TẠO KHỐI ---');
{
    const finishSrc = extractMethod('saveAndStartNewShape');
    assert(finishSrc.includes('const shapeLayer = this.getLayerById(this.currentLayer'), 'saveAndStartNewShape() đọc lớp hiện hành khi lưu khối');
    assert(finishSrc.includes('layer: (shapeLayer && shapeLayer.id)'), 'Khối mới được gán mã lớp hiện hành');
    assert(finishSrc.includes('color: (shapeLayer && shapeLayer.color)'), 'Khối mới lấy màu theo lớp (BYLAYER)');

    const pointSrc = extractMethod('createPointLayer');
    assert(pointSrc.includes("layer: 'MOC_TOADO'"), 'Lớp điểm mới thuộc lớp MOC_TOADO');

    const offsetSrc = extractMethod('promptOffset');
    assert(offsetSrc.includes('layer: sourceShape.layer'), 'Khối Offset kế thừa lớp của khối gốc');

    ['deleteShape', 'startSplitTool', 'startMergeTool'].forEach(name => {
        assert(extractMethod(name).includes('isShapeLayerLocked'), `${name}() chặn thao tác trên lớp đang khóa`);
    });

    [['confirmLoadProjectAsBlocks', 'nạp khối từ dự án'], ['confirmLoadProjectAsShape', 'nạp ranh từ dự án'],
        ['_applyImportedShapes', 'nhập từ Excel/CSV']].forEach(([name, label]) => {
        assert(extractMethod(name).includes('layer:'), `${name}() gán lớp cho khối ${label}`);
    });

    assert(/type="color"[^>]*onchange="appCadTool\.setLayerColor\('/.test(appJs.replace(/\n/g, ' ')),
        'Layer Manager có ô chọn màu lớp gọi setLayerColor()');
}

// --- NHÓM 5: XUẤT DXF THEO LỚP ---
console.log('\n--- NHÓM 5: XUẤT DXF KHAI BÁO LỚP ĐỘNG ---');
{
    const ctx = makeCtx();
    const base = [{ name: '0', color: 7 }, { name: 'RANH_THUA', color: 5 }];
    const shapes = [
        { name: 'Thửa 1', layer: 'RANH_THUA' },
        { name: 'Tuyến 1', layer: 'TIM_DUONG' },
        { name: 'Thửa 2', layer: 'Đường điện' },
        { name: 'Thửa 3' }
    ];
    const layers = ctx.collectExportLayers(base, shapes);
    const names = layers.map(l => l.name);
    assert(names.filter(n => n === 'RANH_THUA').length === 1, 'Lớp RANH_THUA không bị khai báo trùng');
    assert(names.includes('TIM_DUONG'), 'Lớp TIM_DUONG của khối được khai báo trong bảng LAYER');
    assert(names.includes('DUONG_DIEN'), 'Lớp tiếng Việt được bỏ dấu khi khai báo (DUONG_DIEN)');
    assert(layers.find(l => l.name === 'TIM_DUONG').color === 2, 'Lớp TIM_DUONG mang đúng ACI theo màu #eab308');
    assert(layers.find(l => l.name === 'DUONG_DIEN').color === 7, 'Lớp lạ không có màu → ACI trắng mặc định');
    assert(layers[0].name === '0' && layers[1].name === 'RANH_THUA', 'Bảng lớp cố định của khung bản vẽ được giữ nguyên thứ tự');

    const exportSrc = extractMethod('exportDwg');
    const allSrc = extractMethod('_getAllExportShapes');
    assert(allSrc.includes('layer: s.layer ||') && allSrc.includes('layer: this.currentLayer ||'),
        '_getAllExportShapes() giữ thông tin lớp của khối đã lưu và nét vẽ dở');
    assert(exportSrc.includes('this.collectExportLayers(cadLayers, selectedShapes)'),
        'exportDwg() gộp lớp động vào bảng LAYER');
    assert(exportSrc.includes('addLwPolyline(this.sanitizeLayerId(this.getShapeLayerId(shape))'),
        'exportDwg() ghi đường ranh vào đúng lớp của khối');
    assert(!/addLwPolyline\("RANH_THUA", pts\.map/.test(exportSrc), 'Không còn hard-code mọi đường ranh vào RANH_THUA');

    assert(indexHtml.includes('cadLayersTableBody'), 'Layer Manager có bảng hiển thị danh sách lớp');
    assert(appJs.includes('onclick="appCadTool.promptAssignLayer()"') || indexHtml.includes('appCadTool.promptAssignLayer()'),
        'Có nút gán lớp cho khối đang chọn');
}

console.log('\n========================================================================');
if (failedTests === 0) {
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (100%)`);
    console.log('🎉 LAYER MANAGER ĐÃ GẮN THẬT VỚI KHỐI VẼ VÀ XUẤT DXF!');
} else {
    console.error(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} THÀNH CÔNG — ${failedTests} THẤT BẠI`);
}
console.log('========================================================================');
process.exit(failedTests === 0 ? 0 : 1);
