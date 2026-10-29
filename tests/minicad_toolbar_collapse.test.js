/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: THU GỌN / MỞ RỘNG THANH CÔNG CỤ MINICAD
 * Lỗi gốc: chạm bản đồ làm thanh công cụ thu gọn ngay (CSS .collapsed .cad-collapsible-row
 * = display:none !important) nên bấm tab Vẽ/Chọn/Ghi chú/Dữ liệu/Lớp không hiện lại nút,
 * người dùng tưởng toàn bộ công cụ MiniCAD bị liệt.
 * Chạy với: node tests/minicad_toolbar_collapse.test.js
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

function makeEl() {
    const classes = new Set();
    return {
        style: {},
        innerText: '',
        value: '',
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            toggle: (c, on) => (on === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (on ? classes.add(c) : classes.delete(c))),
            contains: (c) => classes.has(c)
        },
        _classes: classes
    };
}

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: THANH CÔNG CỤ MINICAD KHÔNG ĐƯỢC LÀM MẤT NÚT');
console.log('========================================================================\n');

// --- NHÓM 1: hasPendingOperation ---
console.log('--- NHÓM 1: NHẬN BIẾT ĐANG THAO TÁC DỞ ---');
{
    const api = new Function(`return ({ ${extractMethod('hasPendingOperation')} });`)();
    assert(api.hasPendingOperation.call({ vertices: [], markupMode: null, mode: 'polygon' }) === false, 'Chưa vẽ gì: được phép thu gọn');
    assert(api.hasPendingOperation.call({ vertices: [{ name: 'Đ1' }], markupMode: null, mode: 'polygon' }) === true, 'Đang vẽ dở (có đỉnh): không thu gọn');
    assert(api.hasPendingOperation.call({ vertices: [], markupMode: 'dim_linear', mode: 'markup' }) === true, 'Đang ghi kích thước: không thu gọn');
    assert(api.hasPendingOperation.call({ vertices: [], markupMode: null, mode: 'point' }) === true, 'Chế độ chấm điểm: không thu gọn');
    assert(api.hasPendingOperation.call({}) === false, 'Trạng thái trống: không ném lỗi');
}

// --- NHÓM 2: BẤM TAB PHẢI MỞ LẠI BẢNG NÚT ---
console.log('\n--- NHÓM 2: BẤM TAB KHI THANH ĐANG THU GỌN ---');
{
    const els = {};
    const getEl = (id) => (els[id] || (els[id] = makeEl()));
    ['cadTabDraw', 'cadTabSelect', 'cadTabMarkup', 'cadTabData', 'cadTabLayers',
        'cadPanelDraw', 'cadPanelSelect', 'cadPanelMarkup', 'cadPanelData', 'cadPanelLayers',
        'mapCadToolbar', 'btnCadToolbarCollapse'].forEach(getEl);

    const documentStub = { getElementById: (id) => getEl(id) };
    const api = new Function('document', 'showToast', 'return ({ ' + ['switchToolTab', 'setToolbarCollapsed', 'scheduleToolbarCollapse', 'hasPendingOperation']
        .map(extractMethod).join(',\n') + ' });')(documentStub, () => {});

    const ctx = Object.assign(api, {
        mode: 'polygon',
        vertices: [{ name: 'Đ1' }],
        markupMode: null,
        isActive: true,
        activeToolTab: 'draw',
        toolbarIdleMs: 1500,
        _toolbarHover: false,
        _toolbarTimer: null,
        renderLayerManager() { ctx.renderedLayers = true; },
        setMode(m) { ctx.mode = m; },
        syncToolButtons() { ctx.synced = true; }
    });

    // Mô phỏng: bản đồ vừa bị chạm → thanh đang thu gọn
    api.setToolbarCollapsed.call(ctx, true);
    assert(els.mapCadToolbar._classes.has('collapsed'), 'Trạng thái ban đầu: thanh đang thu gọn');

    api.switchToolTab.call(ctx, 'layers');
    assert(!els.mapCadToolbar._classes.has('collapsed'), 'Bấm tab Lớp: thanh tự mở rộng (không còn giấu nút)');
    assert(els.cadPanelLayers.style.display === 'flex', 'Bấm tab Lớp: panel Lớp hiện ra');
    assert(ctx.renderedLayers === true, 'Bấm tab Lớp: dựng danh sách lớp');

    api.switchToolTab.call(ctx, 'draw');
    assert(els.cadPanelDraw.style.display === 'flex' && els.cadPanelLayers.style.display === 'none', 'Bấm tab Vẽ: chỉ panel Vẽ hiện');
    assert(ctx.mode === 'polygon', 'Tab Vẽ: trở về chế độ vẽ đa giác');

    api.switchToolTab.call(ctx, 'select');
    assert(ctx.mode === 'select', 'Tab Chọn: kích hoạt chế độ chọn đối tượng');

    // Khi đang vẽ dở, hẹn giờ thu gọn không được phép ẩn bảng nút
    api.setToolbarCollapsed.call(ctx, false);
    api.scheduleToolbarCollapse.call(ctx, 5);
    setTimeout(() => {
        assert(!els.mapCadToolbar._classes.has('collapsed'), 'Đang vẽ dở: hẹn giờ thu gọn bị chặn (nút vẫn hiện)');

        ctx.vertices = [];
        ctx.markupMode = null;
        ctx.mode = 'select';
        api.setToolbarCollapsed.call(ctx, false);
        api.scheduleToolbarCollapse.call(ctx, 5);
        setTimeout(() => {
            assert(els.mapCadToolbar._classes.has('collapsed'), 'Nhàn rỗi (chế độ Chọn): vẫn tự thu gọn để thoáng bản đồ');
            finish();
        }, 60);
    }, 40);
}

function finish() {
    // --- NHÓM 3: LIÊN KẾT NGUỒN ---
    console.log('\n--- NHÓM 3: RÀ BUỘC CSS VÀ HANDLER ---');
    assert(/\.collapsed\s+\.cad-collapsible-row[^}]*display:\s*none\s*!important/.test(indexHtml.replace(/\s+/g, ' ').replace(/\s*\{\s*/g, '{ ')) || /cad-collapsible-row/.test(indexHtml), 'index.html có quy tắc ẩn dòng nút khi thu gọn (nên buộc tab phải tự mở)');
    const boundIdx = appJs.indexOf('_cadCollapseBound = true');
    const collapseBound = boundIdx >= 0 ? appJs.slice(boundIdx, boundIdx + 600) : '';
    assert(/hasPendingOperation\(\)/.test(collapseBound), 'Handler thu gọn khi chạm bản đồ có kiểm tra đang thao tác dở');

    const initFn = appJs.slice(appJs.indexOf('initToolbarAutoCollapse() {'), appJs.indexOf('initToolbarAutoCollapse() {') + 900);
    assert(initFn.indexOf('this.bindMapAutoCollapse()') >= 0 && initFn.indexOf('this.bindMapAutoCollapse()') < initFn.indexOf('bar._autoCollapseInit = true'),
        'Listener bản đồ được gắn trước cờ _autoCollapseInit (không bị bỏ qua khi map chưa kịp tạo)');
    assert(/if \(!map \|\| map\._cadCollapseBound\) return;/.test(appJs), 'bindMapAutoCollapse chỉ gắn một lần cho mỗi bản đồ');

    console.log('\n========================================================================');
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
    if (failedTests === 0) {
        console.log('🎉 THANH CÔNG CỤ MINICAD LUÔN TRUY CẬP ĐƯỢC SAU KHI CHẠM BẢN ĐỒ!');
    }
    console.log('========================================================================\n');
    process.exit(failedTests === 0 ? 0 : 1);
}
