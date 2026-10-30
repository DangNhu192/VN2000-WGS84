/**
 * BỘ KIỂM THỬ: KIỂU/MÀU ĐIỂM RỜI + 3 NHÓM HIỂN THỊ TÁCH BIỆT (MINICAD)
 *
 * Kiểm chứng bằng cách CHẠY THẬT các helper/ hàm nghiệp vụ đã cắt ra từ app.js
 * (theo cùng cơ chế sandbox `new Function` mà tests/cad_ui_isolation.test.js dùng):
 *  - initDisplaySettings / syncDisplayCheckboxes / toggleDisplayOption với 3 nhóm cờ mới
 *  - resolveGroupVisibility: điểm rời ≠ đỉnh khối ≠ nhãn
 *  - getPointStyleFor / getPointColorFor: ưu tiên điểm → lớp → mặc định
 *  - updatePointField('style'|'color'), applyPointLayerStyle, resetPointStyleOverrides
 *  - drawPointGlyph / pointGlyphSvg / exportGlyphFlag cho DXF, PDF, SVG, PNG
 *  - Đồng bộ style/color xuống mốc dự án và dựng lại từ mốc dự án
 *  - WP-D: đỉnh của KHỐI/TUYẾN cũng mang kiểu + màu (đỉnh → khối → mặc định lớp CAD → mặc định hệ thống),
 *    setVertexGlyph/resetVertexGlyph, nhánh thao tác gộp "Hiển thị & Ký hiệu" và 4 exporter
 *
 * Chạy: node tests/point_styling_visibility.test.js
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
const styleCss = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

const cadStart = appJs.indexOf('const appCadTool = {');
if (cadStart < 0) throw new Error('Không tìm thấy appCadTool trong app.js');

/** Cắt nguyên văn một method (kèm thân hàm) để chạy thật trong sandbox. */
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

const STYLE_IDS = ['circle', 'square', 'diamond', 'triangle', 'cross', 'x', 'ring'];
const VIS_KEYS = ['showPoints', 'showVertices', 'showLabels', 'showDistances', 'showCenterLabels', 'showAnnotations', 'showBoundaries'];

// =====================================================================
// 1. Ba nhóm cờ hiển thị tách biệt trong displaySettings
// =====================================================================
console.log('\n— displaySettings: 3 nhóm Điểm rời / Đỉnh khối & tuyến / Nhãn —');
{
    const block = appJs.slice(cadStart);
    const ds = block.slice(block.indexOf('displaySettings: {'), block.indexOf('pointStyles: ['));
    assert(ds.includes('showPoints:') && ds.includes('showVertices:') && ds.includes('showLabels:'),
        'displaySettings có đủ 3 cờ showPoints / showVertices / showLabels riêng biệt');
    assert(/showPoints:\s*true/.test(ds) && /showLabels:\s*true/.test(ds),
        'Điểm rời và Nhãn bật mặc định (điểm rời ẩn hết thì bản vẽ trông như trống)');
}

// =====================================================================
// 2. initDisplaySettings chạy thật: nạp cờ mới + tự chữa trạng thái "tắt sạch"
// =====================================================================
console.log('\n— initDisplaySettings: nạp mặc định và tự chữa —');
{
    const runInit = (stored) => {
        const store = { 'vn2k_cad_display_settings_v3': stored === null ? null : JSON.stringify(stored) };
        const fakeLocal = {
            getItem: (k) => (k in store ? store[k] : null),
            setItem: (k, v) => { store[k] = v; },
            dump: () => store['vn2k_cad_display_settings_v3']
        };
        const api = new Function('localStorage', 'AppState', `return ({ ${extractMethod('initDisplaySettings')} });`)(
            fakeLocal, { savedCadSnapLine: true });
        const ctx = { annotations: [] };
        api.initDisplaySettings.call(ctx);
        return { s: ctx.displaySettings, stored: JSON.parse(fakeLocal.dump()) };
    };

    const fresh = runInit(null);
    assert(VIS_KEYS.every(k => fresh.s[k] === true), 'Chưa có cài đặt: bật đủ 7 thành phần hiển thị');

    // Blob cũ 5 khóa (trước khi tách nhóm) vẫn phải được nạp và bổ sung 2 khóa mới
    const legacy = runInit({ showVertices: true, showDistances: false, showCenterLabels: true, showAnnotations: true, showBoundaries: true });
    assert(legacy.s.showPoints === true && legacy.s.showLabels === true,
        'Cài đặt cũ (chưa có Điểm rời/Nhãn): mặc định BẬT 2 nhóm mới, không làm mất điểm');
    assert(legacy.s.showDistances === false, 'Cài đặt cũ vẫn được tôn trọng đúng từng khóa');

    // Người dùng tự tắt riêng lẻ: app không được quyền bật lại
    const offPoints = runInit({ showPoints: false, showVertices: true, showLabels: true, showDistances: true, showCenterLabels: true, showAnnotations: true, showBoundaries: true });
    assert(offPoints.s.showPoints === false, 'Người dùng tự tắt "Điểm rời": app KHÔNG bật lại');

    // Trạng thái lỗi "tắt sạch" (kể cả blob cũ 5 khóa) phải được khôi phục một lần
    const healedNew = runInit(VIS_KEYS.reduce((o, k) => (o[k] = false, o), {}));
    assert(healedNew.s.showPoints === true && healedNew.s.showLabels === true && healedNew.s.showBoundaries === true,
        'Tắt sạch 7 nhóm: khôi phục toàn bộ khi nạp');
    const healedLegacy = runInit({ showVertices: false, showDistances: false, showCenterLabels: false, showAnnotations: false, showBoundaries: false });
    assert(healedLegacy.s.showBoundaries === true && healedLegacy.stored.showBoundaries === true,
        'Tắt sạch ở blob cũ 5 khóa: vẫn nhận diện và ghi lại kết quả khôi phục');
}

// =====================================================================
// 3. syncDisplayCheckboxes + toggleDisplayOption cho 3 nhóm mới
// =====================================================================
console.log('\n— Đồng bộ checkbox và lưu tùy chọn —');
{
    const ids = {};
    const fakeDoc = { getElementById: (id) => (ids[id] || null) };
    ['cadCheckShowPoints', 'cadCheckShowVertices', 'cadCheckShowLabels',
        'cadExportCheckPoints', 'cadExportCheckVertices', 'cadExportCheckLabels',
        'cadCheckShowDistances', 'cadCheckShowCenterLabels', 'cadCheckShowAnnotations', 'cadCheckShowBoundaries',
        'cadExportCheckDistances', 'cadExportCheckCenterLabels', 'cadExportCheckAnnotations', 'cadExportCheckBoundaries',
        'cadCheckSnapLine', 'btnCadMarkupToggle'].forEach(id => { ids[id] = { style: {} }; });
    ids.btnCadMarkupToggle.innerHTML = '';
    ids.btnCadMarkupToggle.style = {};

    const store = {};
    const fakeLocal = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } };
    const src = `return ({ ${extractMethod('syncDisplayCheckboxes')}, ${extractMethod('toggleDisplayOption')}, ${extractMethod('updateSnapLineUi')}, ${extractMethod('initDisplaySettings')} });`;
    const api = new Function('document', 'localStorage', 'AppState', 'showToast', src)(
        fakeDoc, fakeLocal, { savedCadSnapLine: true }, () => {});

    const ctx = {
        annotations: [],
        renderGeometry() {},
        renderAnnotations() {},
        updateSnapLineUi: api.updateSnapLineUi
    };
    ctx.syncDisplayCheckboxes = () => api.syncDisplayCheckboxes.call(ctx);
    api.initDisplaySettings.call(ctx);
    api.syncDisplayCheckboxes.call(ctx);
    assert(ids.cadCheckShowPoints.checked === true && ids.cadExportCheckPoints.checked === true,
        'Nhóm "Điểm rời" được đồng bộ cả checkbox thanh công cụ lẫn hộp thoại Xuất');
    assert(ids.cadCheckShowLabels.checked === true && ids.cadExportCheckLabels.checked === true,
        'Nhóm "Nhãn tên" được đồng bộ cả hai nơi');

    api.toggleDisplayOption.call(ctx, 'showPoints', false);
    assert(ctx.displaySettings.showPoints === false, 'Tắt "Điểm rời" chỉ ảnh hưởng cờ của nhóm đó');
    assert(ctx.displaySettings.showVertices === true && ctx.displaySettings.showLabels === true,
        'Tắt "Điểm rời" không kéo theo Đỉnh hay Nhãn (tách nhóm, không gộp chung)');
    const saved = JSON.parse(store['vn2k_cad_display_settings_v3']);
    assert(saved.showPoints === false && saved.showLabels === true, 'Trạng thái tách nhóm được ghi xuống localStorage');
    assert(ids.cadCheckShowPoints.checked === false && ids.cadExportCheckPoints.checked === false,
        'Sau khi tắt, cả checkbox CAD và checkbox Xuất đều nhả tích');
}

// =====================================================================
// 4. resolveGroupVisibility: điểm rời ≠ đỉnh khối/tuyến ≠ nhãn
// =====================================================================
console.log('\n— resolveGroupVisibility: phân giải cờ theo nhóm và theo lớp —');
{
    const api = new Function(`return ({ ${extractMethod('resolveGroupVisibility')} });`)();
    const run = (settings, shape) =>
        api.resolveGroupVisibility.call({ displaySettings: settings, initDisplaySettings() {} }, shape);

    assert(run({ showPoints: false, showVertices: true, showLabels: true }, { mode: 'point' }).visible === false,
        'Điểm rời: theo đúng cờ showPoints (tắt là ẩn hẳn)');
    assert(run({ showPoints: true, showVertices: false, showLabels: true }, { mode: 'point' }).visible === true,
        'Điểm rời: không bị tắt theo cờ của đỉnh khối');
    assert(run({ showPoints: false, showVertices: true, showLabels: true }, { mode: 'polygon' }).visible === true,
        'Đỉnh khối: theo cờ showVertices, không liên quan điểm rời');
    assert(run({ showPoints: true, showVertices: undefined, showLabels: true }, { mode: 'polyline' }).visible === false,
        'Đỉnh tuyến: mặc định ẩn cho tới khi người dùng bật nhóm Đỉnh');

    assert(run({ showPoints: true, showVertices: true, showLabels: false }, { mode: 'point' }).labels === false,
        'Nhãn: tắt nhóm Nhãn thì chỉ còn ký hiệu hình, không có chữ');
    assert(run({ showPoints: true, showVertices: true, showLabels: true }, { mode: 'point', showLabels: false }).labels === false,
        'Nhãn: ghi đè theo từng lớp điểm thắng cờ toàn cục');
    assert(run({ showPoints: false, showVertices: false, showLabels: true }, { mode: 'point', showPoints: true }).visible === true,
        'Điểm rời: ghi đè theo lớp (shape.showPoints) thắng cờ toàn cục');
}

// =====================================================================
// 5. getPointStyleFor / getPointColorFor: điểm → lớp → mặc định
// =====================================================================
console.log('\n— Kiểu & màu ký hiệu: riêng từng điểm, mặc định theo lớp —');
{
    const api = new Function(`return ({ ${extractMethod('getGlyphLayerOf')}, ${extractMethod('getPointStyleFor')}, ${extractMethod('getPointColorFor')}, ${extractMethod('resolveGroupVisibility')} });`)();
    const ctx = { pointStyles: STYLE_IDS.map(id => ({ id, label: id })), getGlyphLayerOf: api.getGlyphLayerOf };
    const style = (shape, v) => api.getPointStyleFor.call(ctx, shape, v);
    const color = (shape, v) => api.getPointColorFor.call(ctx, shape, v);

    assert(style({}, {}) === 'circle', 'Điểm chưa đặt kiểu: dùng tròn mặc định');
    assert(style({ style: 'diamond' }, {}) === 'diamond', 'Điểm chưa đặt kiểu: lấy mặc định của lớp');
    assert(style({ style: 'diamond' }, { style: 'triangle' }) === 'triangle', 'Kiểu riêng của điểm thắng kiểu của lớp');
    assert(style({ style: 'bogus' }, { style: 'nope' }) === 'circle', 'Kiểu không hợp lệ bị loại, quay về tròn');

    assert(color({ color: '#ff0000' }, {}) === '#ff0000', 'Màu chưa đặt riêng: lấy màu lớp');
    assert(color({ color: '#ff0000' }, { color: '#00ff00' }) === '#00ff00', 'Màu riêng của điểm thắng màu lớp');
    assert(color({ color: 'red' }, { color: '#12' }) === '#10b981', 'Màu không hợp lệ (không phải #RRGGBB) bị loại');
}

// =====================================================================
// 6. Bảng điểm: ô kiểu + màu, hàm áp dụng hàng loạt
// =====================================================================
console.log('\n— Bảng điểm: cột kiểu/màu từng điểm và áp dụng cả lớp —');
{
    const layer = {
        id: 'pl1', name: 'Lớp điểm 1', mode: 'point', color: '#22c55e', style: 'circle',
        vertices: [
            { name: 'P1', x: 1000, y: 2000, lat: 10, lng: 106, h: 0, note: '' },
            { name: 'P2', x: 1001, y: 2001, lat: 10, lng: 106, h: 0, note: '', style: 'diamond', color: '#ff0000' }
        ]
    };
    const dom = {
        cadPtTableLayerSelect: { innerHTML: '' },
        cadPtTableBody: { innerHTML: '' },
        cadPtTableCount: { innerText: '' },
        cadPtBulkStyle: { value: 'triangle', disabled: true },
        cadPtBulkColor: { value: '#ffcc00', disabled: true },
        cadPtBulkLayerName: { innerText: '' }
    };
    const fakeDoc = { getElementById: id => (dom[id] || null) };
    const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const src = ['renderPointTable', 'syncPointStyleBulkControls', 'applyPointLayerStyle',
        'resetPointStyleOverrides', 'updatePointField', 'getGlyphLayerOf', 'getPointStyleFor', 'getPointColorFor']
        .map(n => extractMethod(n)).join(', ');
    const api = new Function('document', 'escapeHtml', 'showToast', 'AppState', `return ({ ${src} });`)(
        fakeDoc, escapeHtml, () => {}, { kttVal: 105.75, scaleFactor: 0.9999, currentProject: 'p' });

    const renders = [];
    const ctx = {
        pointStyles: STYLE_IDS.map(id => ({ id, label: id })),
        getPointLayers: () => [layer],
        getActivePointLayer: () => layer,
        pointLayerId: 'pl1',
        isShapeLocked: () => false,
        pushHistoryState: (t) => renders.push(t),
        saveShapesForProject: () => {},
        persistSession: () => {},
        renderGeometry: () => {},
        renderBlocksPanel: () => {},
        refreshPointLayerBar: () => {},
        renderPointTable: () => api.renderPointTable.call(ctx),
        syncPointStyleBulkControls: (l) => api.syncPointStyleBulkControls.call(ctx, l),
        getGlyphLayerOf: (s) => api.getGlyphLayerOf.call(ctx, s),
        getPointStyleFor: (s, v) => api.getPointStyleFor.call(ctx, s, v),
        getPointColorFor: (s, v) => api.getPointColorFor.call(ctx, s, v),
        calculateAreaAndPerimeter: () => ({})
    };
    api.renderPointTable.call(ctx);
    const rows = dom.cadPtTableBody.innerHTML;
    assert(rows.includes("updatePointField(0, 'style'") && rows.includes("updatePointField(0, 'color'"),
        'Mỗi dòng điểm có ô chọn kiểu và ô chọn màu riêng');
    assert(rows.includes('value="diamond" selected'), 'Dòng P2 hiển thị đúng kiểu riêng đang dùng (diamond)');
    assert(rows.includes('value="#ff0000"'), 'Dòng P2 hiển thị đúng màu riêng đang dùng');
    assert(dom.cadPtTableBody.innerHTML.includes('value="circle" selected'), 'Dòng P1 kế thừa kiểu mặc định của lớp');
    assert(dom.cadPtBulkStyle.value === 'circle' && dom.cadPtBulkStyle.disabled === false,
        'Thanh kiểu chung của lớp được nạp giá trị mặc định lớp và bật lại');

    // Sửa kiểu/màu riêng của điểm P1 qua bảng
    api.updatePointField.call(ctx, 0, 'style', 'ring');
    assert(layer.vertices[0].style === 'ring', 'updatePointField("style") lưu kiểu riêng vào điểm');
    api.updatePointField.call(ctx, 0, 'color', '#0000ff');
    assert(layer.vertices[0].color === '#0000ff', 'updatePointField("color") lưu màu riêng vào điểm');
    api.updatePointField.call(ctx, 1, 'style', 'khong-phai-kieu');
    assert(layer.vertices[1].style === 'diamond', 'Kiểu không hợp lệ bị từ chối, giữ giá trị cũ');
    api.updatePointField.call(ctx, 1, 'color', 'red');
    assert(layer.vertices[1].color === '#ff0000', 'Màu không hợp lệ bị từ chối, giữ giá trị cũ');

    // Áp dụng hàng loạt cho cả lớp
    dom.cadPtBulkStyle.value = 'triangle';
    dom.cadPtBulkColor.value = '#f59e0b';
    api.applyPointLayerStyle.call(ctx);
    assert(layer.style === 'triangle' && layer.color === '#f59e0b',
        '"Áp dụng cả lớp" ghi kiểu + màu mặc định của lớp');
    assert(layer.vertices.every(v => !v.style && !v.color),
        'Áp dụng cả lớp xóa các tùy chỉnh riêng để toàn bộ điểm dùng chung một kiểu');

    // Đặt lại tùy chỉnh riêng
    layer.vertices[0].style = 'x';
    api.resetPointStyleOverrides.call(ctx);
    assert(!layer.vertices[0].style, '"Đặt lại" gỡ tùy chỉnh riêng, điểm quay về mặc định lớp');
}

// =====================================================================
// 7. Bật/tắt hàng loạt phải ghi đúng cờ của từng DẠNG đối tượng
// =====================================================================
console.log('\n— Bật/tắt hàng loạt: tách dạng, không ghi nhầm cờ —');
{
    const shapes = [
        { mode: 'point', shortName: 'Lớp điểm', vertices: [] },
        { mode: 'polygon', shortName: 'Thửa 1', vertices: [] }
    ];
    const store = {};
    const fakeDoc = { getElementById: () => null };
    const api = new Function('document', 'localStorage', 'showToast', 'AppState',
        `return ({ ${extractMethod('toggleAllVerticesVisible')}, ${extractMethod('toggleShapeVerticesVisibility')} });`)(
            fakeDoc, { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } }, () => {}, { currentProject: 'p' });

    const ctx = {
        displaySettings: { showVertices: false, showPoints: true, showLabels: true },
        savedShapes: shapes,
        saveShapesForProject: () => {},
        persistSession: () => {},
        renderGeometry: () => {},
        renderModalVerticesTable: () => {},
        syncDisplayCheckboxes: () => {}
    };
    api.toggleAllVerticesVisible.call(ctx, false);
    assert(shapes[0].showPoints === false && shapes[0].showVertices === undefined,
        'Tắt hàng loạt: lớp điểm nhận cờ showPoints, không bị ghi cờ showVertices');
    assert(shapes[1].showVertices === false && shapes[1].showPoints === undefined,
        'Tắt hàng loạt: khối nhận cờ showVertices, không lẫn sang điểm rời');

    api.toggleShapeVerticesVisibility.call(ctx, 0, true);
    assert(shapes[0].showPoints === true, 'Bật/tắt theo từng dòng trong bảng đỉnh: điểm rời ghi đúng showPoints');
    api.toggleShapeVerticesVisibility.call(ctx, 1, true);
    assert(shapes[1].showVertices === true, 'Bật/tắt theo từng dòng: khối ghi đúng showVertices');
}

// =====================================================================
// 8. Render: ký hiệu điểm mang kiểu + màu, ẩn hẳn khi tắt nhóm Điểm rời
// =====================================================================
console.log('\n— renderGeometry: dựng ký hiệu theo kiểu/màu và theo nhóm —');
{
    const geomBody = appJs.slice(appJs.indexOf('renderGeometry() {'), appJs.indexOf('renderGeometry() {') + 26000);
    assert(geomBody.includes('if (isPointLayer && !groupVis.visible) return;'),
        'Điểm rời khi tắt nhóm: KHÔNG dựng marker (ẩn hẳn trên bản đồ, không chỉ mờ)');
    assert(geomBody.includes("'sty-' + ptStyle"),
        'Ký hiệu điểm mang class kiểu (sty-square / sty-diamond / ...)');
    assert(geomBody.includes('this.getPointColorFor(shape, v)') && geomBody.includes('background: ${ptColor}'),
        'Ký hiệu điểm dùng màu.resolve của riêng điểm hoặc lớp');
    assert(geomBody.includes('ptStyle === \'ring\'') && geomBody.includes('background: transparent'),
        'Kiểu vành khuyên chuyển nền trong suốt, viền mang màu điểm');
    assert(/const isExpanded = isPointLayer\s*\n?\s*\? \(groupVis\.labels === true\)/.test(geomBody) ||
        geomBody.includes('? (groupVis.labels === true)'),
        'Nhãn điểm chỉ bung khi nhóm "Nhãn tên" bật');
    assert(geomBody.includes('showLabels'), 'renderGeometry đọc nhóm Nhãn để quyết định chữ trên ký hiệu');
}

// =====================================================================
// 9. CSS ký hiệu điểm: đủ hình dạng, không phá viên thuốc khi bung nhãn
// =====================================================================
console.log('\n— CSS: hình dạng ký hiệu điểm —');
{
    ['square', 'diamond', 'triangle', 'cross', 'x'].forEach(st => {
        assert(new RegExp(`\\.cad-vertex-badge\\.sty-${st}:not\\(\\.expanded\\)`).test(styleCss),
            `Có quy định hình kiểu sty-${st} chỉ áp ở trạng thái ký hiệu nhỏ (không phá nhãn viên thuốc)`);
    });
    assert(styleCss.includes('.cad-vertex-badge[class*="sty-"].dot-visible:not(.expanded)'),
        'Điểm rời ở dạng ký hiệu nhỏ được hiển thị đầy đủ (không mờ như đỉnh khối)');
    assert(/\.cad-vertex-badge\.sty-(diamond|triangle|cross|x):not\(\.expanded\)[\s\S]{0,240}clip-path/.test(styleCss) ||
        /clip-path: polygon/.test(styleCss),
        'Các hình thoi/tam giác/chữ thập/X dùng clip-path (không cần ảnh icon)');
}

// =====================================================================
// 10. Xuất bản vẽ: tách cờ + ký hiệu theo kiểu
// =====================================================================
console.log('\n— DXF / PDF / SVG / PNG: tách cờ Điểm - Đỉnh - Nhãn —');
{
    const api = new Function(`return ({ ${extractMethod('exportGlyphFlag')}, ${extractMethod('pointGlyphSvg')}, ${extractMethod('drawPointGlyph')} });`)();

    assert(api.exportGlyphFlag({ showPoints: false, showVertices: true }, true) === false,
        'Xuất: điểm rời tắt theo showPoints, không bị showVertices chi phối');
    assert(api.exportGlyphFlag({ showPoints: false, showVertices: true }, false) === true,
        'Xuất: đỉnh khối vẫn bật khi điểm rời tắt');
    assert(api.exportGlyphFlag({ showPoints: true, showVertices: false }, true) === true,
        'Xuất: điểm rời vẫn ra mốc khi người dùng tắt nhóm đỉnh');
    assert(api.exportGlyphFlag({ showPoints: true }, true) === true && api.exportGlyphFlag({}, false) === true,
        'Xuất: thiếu cờ trong meta thì mặc định hiện (không âm thầm mất mốc như trước)');

    // SVG: mỗi kiểu một element, màu điểm nằm trong thuộc tính (không bị CSS lớp ghi đè)
    const svgSquare = api.pointGlyphSvg('square', 100, 200, 4, '#ff0000');
    assert(svgSquare.startsWith('<rect class="cad-pt-glyph"') && svgSquare.includes('fill="#ff0000"'),
        'SVG: kiểu vuông → <rect> mang màu điểm và class riêng .cad-pt-glyph');
    assert(api.pointGlyphSvg('diamond', 1, 2, 4, '#00ff00').includes('<polygon'), 'SVG: kiểu thoi/tam giác → <polygon>');
    assert(api.pointGlyphSvg('cross', 1, 2, 4, '#00ff00').includes('<path'), 'SVG: kiểu chữ thập/X → <path>');
    assert(api.pointGlyphSvg('ring', 1, 2, 4, '#00ff00').includes('fill="none"'), 'SVG: vành khuyên chỉ viền, không nền');
    assert(api.pointGlyphSvg('circle', 1, 2, 4, '#00ff00').includes('<circle'), 'SVG: tròn mặc định → <circle>');

    // Canvas: kiểm tra đúng lệnh vẽ được gọi cho từng kiểu
    const rec = [];
    const ctxStub = {
        save: () => rec.push('save'), restore: () => rec.push('restore'),
        beginPath: () => {}, closePath: () => rec.push('closePath'),
        moveTo: (x, y) => rec.push(`m${x},${y}`), lineTo: (x, y) => rec.push(`l${x},${y}`),
        rect: (x, y, w, h) => rec.push(`rect ${w}x${h}`),
        arc: (x, y, r) => rec.push(`arc r=${r}`),
        fill: () => rec.push('fill'), stroke: () => rec.push('stroke'),
        set fillStyle(v) { }, set strokeStyle(v) { }, set lineWidth(v) { }, set lineJoin(v) { }, set lineCap(v) { }
    };
    api.drawPointGlyph(ctxStub, 10, 20, 4, 'square', '#fff');
    assert(rec.includes('rect 8x8') && rec.includes('fill'), 'Canvas (PDF/PNG): kiểu vuông vẽ rect và tô màu');
    rec.length = 0;
    api.drawPointGlyph(ctxStub, 10, 20, 4, 'cross', '#fff');
    assert(rec.filter(s => s.startsWith('m')).length === 2 && rec.includes('stroke') && !rec.includes('fill'),
        'Canvas: kiểu chữ thập vẽ 2 nét và chỉ stroke (không tô khối)');
    rec.length = 0;
    api.drawPointGlyph(ctxStub, 10, 20, 4, 'ring', '#fff');
    assert(rec.includes('arc r=4') && rec.includes('stroke') && !rec.includes('fill'),
        'Canvas: vành khuyên chỉ viền');
    rec.length = 0;
    api.drawPointGlyph(ctxStub, 10, 20, 4, 'triangle', '#fff');
    assert(rec.includes('closePath') && rec.includes('fill'), 'Canvas: tam giác là đường khép kín tô màu');

    // 4 exporter phải dùng cờ tách nhóm, không còn `|| isPointLayer` cứng
    const residual = (appJs.match(/showVertices !== false \|\| isPointLayer/g) || []).length;
    assert(residual === 0, 'Không còn điều kiện gộp "showVertices || isPointLayer" trong exporter');
    const glyphSites = (appJs.match(/this\.exportGlyphFlag\(meta, isPointLayer\)/g) || []).length;
    assert(glyphSites === 4, `Cả 4 exporter (DXF/PDF/SVG/PNG) đều dùng exportGlyphFlag (hiện có ${glyphSites})`);
    const labelGuards = (appJs.match(/meta\.showLabels !== false/g) || []).length;
    assert(labelGuards >= 3, 'Nhãn tên trong bản vẽ xuất cũng chịu sự kiểm soát của nhóm Nhãn');
    assert(/if \(meta\.showLabels !== false\) \{\s*\n\s*const cleanName/.test(appJs),
        'DXF: TEN_MOC chỉ ghi khi nhóm Nhãn bật');
}

// =====================================================================
// 11. meta xuất: đọc 3 checkbox mới và không ghi ngược vào cài đặt hiển thị
// =====================================================================
console.log('\n— _getExportMeta: nhận cờ mới, cô lập khỏi cài đặt hiển thị —');
{
    const boxes = {
        cadExportCheckPoints: { checked: false },
        cadExportCheckVertices: { checked: true },
        cadExportCheckLabels: { checked: false },
        cadExportCheckDistances: { checked: true },
        cadExportCheckCenterLabels: { checked: true },
        cadExportCheckAnnotations: { checked: true },
        cadExportCheckBoundaries: { checked: true },
        cadExportCheckFullDetails: { checked: false }
    };
    const store = {};
    const api = new Function('document', 'localStorage', 'AppState',
        `return ({ ${extractMethod('_getExportMeta')} });`)(
            { getElementById: id => (boxes[id] || { value: '', checked: undefined }) },
            { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
            { currentProject: 'DuAn.csv', provinceName: 'TP.HCM', kttDeg: 105, kttMin: 45 });

    const ctx = { displaySettings: { showPoints: true, showVertices: true, showLabels: true } };
    const meta = api._getExportMeta.call(ctx);
    assert(meta.showPoints === false && meta.showLabels === false, 'Hộp thoại Xuất chuyển đúng cờ Điểm rời / Nhãn vào meta');
    assert(JSON.parse(store['vn2k_cad_meta_saved']).showPoints === false, 'Cấu hình xuất mới được lưu để lần sau dùng lại');
    assert(ctx.displaySettings.showPoints === true, '_getExportMeta không ghi ngược cờ ảnh xuất vào cài đặt hiển thị');

    const body = appJs.slice(appJs.indexOf('_getExportMeta() {'), appJs.indexOf('_getFontSizeForScale'));
    assert(!/this\.displaySettings\.show\w+ =[^=]/.test(body),
        '_getExportMeta chỉ đọc, không mutating displaySettings');
}

// =====================================================================
// 12. Vòng đời dữ liệu: kiểu/màu đi kèm mốc dự án và dựng lại được
// =====================================================================
console.log('\n— Đồng bộ mốc dự án: mang theo kiểu & màu điểm —');
{
    assert(/pointStyle: v\.style \|\| \(shape\.mode === 'point' \? \(shape\.style \|\| ''\) : ''\)/.test(appJs),
        'syncShapesToProjectPoints ghi pointStyle (riêng điểm, hoặc mặc định lớp) vào mốc dự án');
    assert(/pointColor: v\.color \|\| ''/.test(appJs),
        'syncShapesToProjectPoints ghi pointColor vào mốc dự án');
    assert(/style: v\.pointStyle \|\| undefined,/.test(appJs) && /color: v\.pointColor \|\| undefined,/.test(appJs),
        'reconstructShapesFromPoints khôi phục style/color từ mốc dự án về lại điểm CAD');
    assert(/validVerts\.length >= \(sObj\.mode === 'point' \? 1 : 2\)/.test(appJs),
        'Lớp điểm chỉ có 1 mốc vẫn dựng lại được (không bị lọc >= 2 như khối)');
}

// =====================================================================
// 13. Markup: checkbox trên CAD + hộp thoại Xuất + thanh kiểu của bảng điểm
// =====================================================================
console.log('\n— Markup: đủ ô điều khiển —');
{
    ['cadCheckShowPoints', 'cadCheckShowLabels', 'cadExportCheckPoints', 'cadExportCheckLabels',
        'cadPtBulkStyle', 'cadPtBulkColor', 'cadPtBulkLayerName'].forEach(id => {
        assert(indexHtml.includes(`id="${id}"`), `index.html có điều khiển #${id}`);
    });
    assert(indexHtml.includes("toggleDisplayOption('showPoints', this.checked)"),
        'Checkbox Điểm rời gọi thẳng toggleDisplayOption("showPoints")');
    assert(indexHtml.includes("toggleDisplayOption('showLabels', this.checked)"),
        'Checkbox Nhãn gọi toggleDisplayOption("showLabels")');
    assert(indexHtml.includes('appCadTool.applyPointLayerStyle()'),
        'Nút "Áp dụng cả lớp" nối vào applyPointLayerStyle');
    assert(indexHtml.includes('appCadTool.resetPointStyleOverrides()'),
        'Nút "Đặt lại" gỡ tùy chỉnh riêng của từng điểm');
    assert(/<th[^>]*>Kiểu<\/th>[\s\S]{0,220}<th[^>]*>Màu<\/th>/.test(indexHtml),
        'Bảng điểm có 2 cột Kiểu và Màu');
}

// =====================================================================
// 14. Đỉnh khối & tuyến: ký hiệu kế thừa mặc định của LỚP CAD (WP-D)
// =====================================================================
console.log('\n— Chuỗi ưu tiên ký hiệu: đỉnh → khối → lớp CAD → mặc định hệ thống —');
{
    const api = new Function(`return ({ ${['getGlyphLayerOf', 'getPointStyleFor', 'getPointColorFor']
        .map(n => extractMethod(n)).join(', ')} });`)();
    const layers = [
        { id: 'RANH_THUA', name: 'Ranh thửa', color: '#38bdf8', vStyle: 'diamond', vColor: '#ef4444' },
        { id: 'GIAO_THONG', name: 'Giao thông', color: '#f59e0b' },
        { id: 'MOCHIEU', name: 'Mốc chỉ giới', color: '#a78bfa', vStyle: 'bogus', vColor: 'red' }
    ];
    const ctx = {
        pointStyles: STYLE_IDS.map(id => ({ id, label: id })),
        getGlyphLayerOf: (s) => api.getGlyphLayerOf.call(ctx, s),
        getLayerById: (id) => layers.find(l => l.id === id) || null,
        getShapeLayerId: (s) => (s && s.layer) || 'RANH_THUA'
    };
    const style = (s, v) => api.getPointStyleFor.call(ctx, s, v);
    const color = (s, v) => api.getPointColorFor.call(ctx, s, v);

    assert(style({ mode: 'polygon', layer: 'RANH_THUA', color: '#38bdf8' }, {}) === 'diamond',
        'Đỉnh khối chưa tùy chỉnh: dùng hình mặc định của lớp CAD (không còn cứng "circle")');
    assert(color({ mode: 'polygon', layer: 'RANH_THUA', color: '#38bdf8' }, {}) === '#ef4444',
        'Đỉnh khối chưa tùy chỉnh: dùng màu mặc định của lớp CAD');
    assert(style({ mode: 'polygon', layer: 'RANH_THUA' }, { style: 'ring' }) === 'ring',
        'Kiểu riêng của từng đỉnh thắng mặc định lớp');
    assert(color({ mode: 'polyline', layer: 'GIAO_THONG', color: '#f59e0b' }, {}) === '#f59e0b',
        'Lớp chưa đặt màu mặc định: đỉnh lùi về màu vẽ của đối tượng');
    assert(style({ mode: 'polygon', layer: 'MOCHIEU' }, {}) === 'circle',
        'Mặc định lớp không hợp lệ bị loại, đỉnh quay về tròn');
    assert(color({ mode: 'polygon', layer: 'MOCHIEU', color: '#22c55e' }, {}) === '#22c55e',
        'Mặc định màu lớp không hợp lệ (không phải #RRGGBB) bị loại');

    const ptLayer = { mode: 'point', layer: 'RANH_THUA', color: '#22c55e', style: 'triangle' };
    assert(style(ptLayer, {}) === 'triangle',
        'Điểm rời: kiểu mặc định của chính lớp điểm vẫn trên mặc định lớp CAD');
    assert(color(ptLayer, {}) === '#22c55e',
        'Điểm rời: màu ký hiệu lấy theo màu lớp điểm, không lấy màu mặc định của lớp CAD');
    const bare = { pointStyles: STYLE_IDS.map(id => ({ id, label: id })), getGlyphLayerOf: api.getGlyphLayerOf };
    assert(api.getPointStyleFor.call(bare, { mode: 'polygon' }, {}) === 'circle' &&
        api.getPointColorFor.call(bare, { mode: 'polygon' }, {}) === '#10b981',
        'Bảng chưa tra được lớp CAD: vẫn an toàn về mặc định hệ thống (không ném lỗi)');
}

// =====================================================================
// 15. setVertexGlyph / resetVertexGlyph chạy thật (bảng Đỉnh)
// =====================================================================
console.log('\n— Đặt / đặt lại ký hiệu cho từng đỉnh khối —');
{
    const api = new Function('AppState', 'showToast', 'document',
        `return ({ ${['setVertexGlyph', 'resetVertexGlyph', 'countVertexGlyphOverrides', 'refreshSymbolPanelIfOpen']
            .map(n => extractMethod(n)).join(', ')} });`)(
            { currentProject: 'p.dangky' }, () => {}, { getElementById: () => ({ classList: { contains: () => true } }) });

    const mk = (locked) => {
        const calls = { hist: [], save: 0, persist: 0, geom: 0, blocks: 0, repaint: 0, symPanel: 0 };
        const ctx = {
            savedShapes: [{
                mode: 'polygon', layer: 'RANH_THUA', color: '#38bdf8',
                vertices: [{ name: 'Đ1' }, { name: 'Đ2', style: 'x', color: '#ff0000' }]
            }],
            pointStyles: STYLE_IDS.map(id => ({ id, label: id })),
            getPointStyleFor: () => 'circle',
            getPointColorFor: () => '#10b981',
            isShapeLocked: () => !!locked,
            pushHistoryState: (t) => calls.hist.push(t),
            saveShapesForProject: () => calls.save++,
            persistSession: () => calls.persist++,
            renderGeometry: () => calls.geom++,
            renderBlocksPanel: () => calls.blocks++,
            refreshAreaTableIfOpen: () => {},
            modalTableActiveTab: 'vertices',
            renderModalVerticesTable: () => calls.repaint++,
            renderSymbolPanel: () => calls.symPanel++,
            refreshSymbolPanelIfOpen: function () { return api.refreshSymbolPanelIfOpen.call(this); }
        };
        return { ctx, calls, v0: ctx.savedShapes[0].vertices[0], v1: ctx.savedShapes[0].vertices[1] };
    };

    const a = mk(false);
    api.setVertexGlyph.call(a.ctx, 0, 0, 'style', 'triangle');
    assert(a.v0.style === 'triangle', 'setVertexGlyph("style") ghi kiểu riêng vào đúng đỉnh');
    assert(a.calls.hist.length === 1 && a.calls.save === 1 && a.calls.persist === 1,
        'Đổi kiểu đỉnh: vào lịch sử hoàn tác + lưu dự án + lưu phiên');
    assert(a.calls.geom === 1 && a.calls.repaint === 1,
        'Đổi kiểu đỉnh: vẽ lại bản đồ và dựng lại bảng đỉnh (bảng đang mở tab Đỉnh)');
    assert(a.calls.symPanel === 1,
        'Nhánh gộp đang mở: bảng lớp + bộ đếm ký hiệu tùy chỉnh cập nhật ngay theo đỉnh vừa đổi');

    api.setVertexGlyph.call(a.ctx, 0, 0, 'style', 'khong-ton-tai');
    assert(a.v0.style === 'triangle' && a.calls.hist.length === 1,
        'Kiểu không có trong pointStyles bị từ chối, không thêm lịch sử');
    api.setVertexGlyph.call(a.ctx, 0, 0, 'color', 'red');
    assert(!a.v0.color && a.calls.hist.length === 1,
        'Màu không đúng dạng #RRGGBB bị từ chối');
    api.setVertexGlyph.call(a.ctx, 0, 0, 'style', 'circle');
    assert(a.calls.hist.length === 1,
        'Đỉnh đang có kiểu = kiểu vừa chọn: bỏ qua, không ghi lịch sử thừa');
    api.setVertexGlyph.call(a.ctx, 9, 0, 'style', 'square');
    assert(a.calls.hist.length === 1, 'Chỉ số ngoài danh sách đối tượng: không làm gì');

    const b = mk(true);
    api.setVertexGlyph.call(b.ctx, 0, 1, 'color', '#00ff00');
    assert(b.v1.color === '#ff0000' && b.calls.hist.length === 0,
        'Lớp bị khóa: không đổi được ký hiệu đỉnh');

    assert(api.countVertexGlyphOverrides.call(b.ctx) === 1,
        'countVertexGlyphOverrides đếm đúng số đỉnh đang tùy chỉnh riêng');
    api.resetVertexGlyph.call(b.ctx, 0, 1);
    assert(b.v1.color === '#ff0000' && b.calls.hist.length === 0,
        'Lớp bị khóa: nút "↺" đặt lại cũng bị chặn');
    const c = mk(false);
    api.resetVertexGlyph.call(c.ctx, 0, 1);
    assert(!c.v1.style && !c.v1.color && c.calls.hist.length === 1,
        'resetVertexGlyph gỡ cả kiểu lẫn màu, đỉnh quay về mặc định lớp');
    api.resetVertexGlyph.call(c.ctx, 0, 0);
    assert(c.calls.hist.length === 1, 'Đỉnh vốn không có tùy chỉnh: không ghi lịch sử');
}

// =====================================================================
// 16. Nhánh gộp "Hiển thị & Ký hiệu": mặc định theo lớp + đặt lại toàn bộ
// =====================================================================
console.log('\n— Nhánh gộp: bảng mặc định theo lớp CAD + đặt lại mọi đỉnh —');
{
    const src = ['renderSymbolPanel', 'applyLayerGlyph', 'resetLayerGlyph', 'clearAllVertexGlyphOverrides',
        'countVertexGlyphOverrides'].map(n => extractMethod(n)).join(', ');
    const store = {};
    const dom = {};
    const fakeDoc = { getElementById: (id) => dom[id] || null };
    const escapeHtml = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const api = new Function('document', 'escapeHtml', 'showToast', 'AppState', 'localStorage',
        `return ({ ${src} });`)(fakeDoc, escapeHtml, () => {}, { currentProject: 'p' },
        { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } });

    const mkCtx = () => {
        const calls = { hist: [], geom: 0, blocks: 0, repaint: 0, saved: 0 };
        return { ctx: {
            pointStyles: STYLE_IDS.map(id => ({ id, label: id })),
            layersTable: [{ id: 'RANH_THUA', name: 'Ranh thửa', color: '#38bdf8' }],
            getLayerById: () => null,
            savedShapes: [{ mode: 'polygon', vertices: [{ name: 'Đ1', style: 'x' }, { name: 'Đ2' }] }],
            saveLayersTable() { calls.saved++; store.layers = JSON.stringify(this.layersTable); },
            pushHistoryState: (t) => calls.hist.push(t),
            saveShapesForProject: () => {}, persistSession: () => {},
            renderGeometry: () => calls.geom++, renderBlocksPanel: () => calls.blocks++,
            refreshAreaTableIfOpen: () => {}, renderModalVerticesTable: () => calls.repaint++,
            renderSymbolPanel: () => {}, modalTableActiveTab: 'vertices',
            countVertexGlyphOverrides: function () { return api.countVertexGlyphOverrides.call(this); }
        }, calls };
    };

    // applyLayerGlyph đọc select + color input rồi ghi vào layersTable
    const m = mkCtx();
    m.ctx.getLayerById = (id) => m.ctx.layersTable.find(l => l.id === id);
    dom.cadSymStyle_RANH_THUA = { value: 'triangle' };
    dom.cadSymColor_RANH_THUA = { value: '#ef4444' };
    api.applyLayerGlyph.call(m.ctx, 'RANH_THUA');
    assert(m.ctx.layersTable[0].vStyle === 'triangle' && m.ctx.layersTable[0].vColor === '#ef4444',
        'applyLayerGlyph ghi hình + màu mặc định của lớp CAD từ nhánh gộp');
    assert(m.calls.saved === 1 && JSON.parse(store.layers)[0].vStyle === 'triangle',
        'Mặc định lớp được lưu vào localStorage (sống sau khi tải lại trang)');
    assert(m.calls.geom === 1, 'Đổi mặc định lớp: bản vẽ được dựng lại ngay');

    dom.cadSymStyle_RANH_THUA = { value: 'khong-phai-kieu' };
    api.applyLayerGlyph.call(m.ctx, 'RANH_THUA');
    assert(m.ctx.layersTable[0].vStyle === 'circle',
        'Giá trị kiểu không hợp lệ ở select bị chặn về "circle" (không ghi rác vào lớp)');

    const r = mkCtx();
    r.ctx.getLayerById = (id) => r.ctx.layersTable.find(l => l.id === id);
    r.ctx.layersTable[0].vStyle = 'diamond';
    api.resetLayerGlyph.call(r.ctx, 'RANH_THUA');
    assert(!r.ctx.layersTable[0].vStyle && !r.ctx.layersTable[0].vColor,
        'resetLayerGlyph xóa mặc định riêng của lớp để quay về ký hiệu hệ thống');

    const cl = mkCtx();
    api.clearAllVertexGlyphOverrides.call(cl.ctx);
    const vs = cl.ctx.savedShapes[0].vertices;
    assert(!vs[0].style && cl.calls.hist.length === 1 && cl.calls.geom === 1,
        '"↺ Đặt lại mọi đỉnh" gỡ tùy chỉnh riêng của từng đỉnh + vào lịch sử hoàn tác');
    const cl2 = mkCtx();
    cl2.ctx.savedShapes = [{ mode: 'polygon', vertices: [{ name: 'Đ1' }] }];
    api.clearAllVertexGlyphOverrides.call(cl2.ctx);
    assert(cl2.calls.hist.length === 0, 'Không có đỉnh tùy chỉnh nào: nút đặt lại không ghi lịch sử');

    // Bảng lớp trong nhánh gộp phải có đủ ô kiểu + màu + nút đặt lại cho từng lớp
    const rp = mkCtx();
    rp.ctx.getLayerById = (id) => rp.ctx.layersTable.find(l => l.id === id);
    dom.cadSymbolLayerRows = { innerHTML: '' };
    dom.cadSymOverrideCount = { innerText: '' };
    api.renderSymbolPanel.call(rp.ctx);
    const html = dom.cadSymbolLayerRows.innerHTML;
    assert(html.includes('id="cadSymStyle_RANH_THUA"') && html.includes('id="cadSymColor_RANH_THUA"'),
        'Nhánh gộp sinh ô kiểu + ô màu cho từng lớp CAD');
    assert(html.includes('applyLayerGlyph(') && html.includes('resetLayerGlyph('),
        'Mỗi dòng lớp nối vào applyLayerGlyph và có nút đặt lại mặc định lớp');
    assert(dom.cadSymOverrideCount.innerText === 1,
        'Bộ đếm "đang có N điểm/đỉnh tùy chỉnh riêng" tính đúng');
}

// =====================================================================
// 17. Xuất bản vẽ + giao diện: không còn cứng ký hiệu cho đỉnh khối
// =====================================================================
console.log('\n— Exporter / markup / CSS cho đỉnh khối —');
{
    assert(!/isPointLayer\s*\?\s*this\.getPoint(Style|Color)For/.test(appJs),
        'Không còn nhánh "đỉnh khối cứng circle/màu cố định" trong 4 exporter');
    assert(appJs.includes('const glyph = this.getPointStyleFor(shape, p);'),
        'DXF: hình đỉnh mốc lấy theo kiểu đã chọn cho cả khối và điểm');
    assert(/svgContent \+= `  \$\{this\.pointGlyphSvg\(this\.getPointStyleFor\(shape, p\)/.test(appJs),
        'SVG: mọi đỉnh xuất qua pointGlyphSvg (mang kiểu + màu thật)');
    const canvasGlyphCalls = (appJs.match(/this\.drawPointGlyph\(ctx, [^;]*this\.getPointStyleFor\(shape, p\)/g) || []).length;
    assert(canvasGlyphCalls === 2, 'PDF + PNG: cả hai canvas dùng kiểu/màu thật của đỉnh');

    ['modalCadSymbols', 'btnCadSymbols', 'cadSymShowPoints', 'cadSymShowVertices', 'cadSymShowLabels',
        'cadSymbolLayerRows', 'cadSymOverrideCount'].forEach(id => {
        assert(indexHtml.includes(`id="${id}"`), `index.html có #${id} trong nhánh gộp`);
    });
    assert(indexHtml.includes('appCadTool.openSymbolPanel()') && indexHtml.includes('appCadTool.closeSymbolPanel()'),
        'Nút 🎨 mở/đóng nhánh gộp qua openSymbolPanel/closeSymbolPanel');
    assert(/<th[^>]*>Ký hiệu<\/th>[\s\S]{0,200}<th[^>]*>Màu<\/th>/.test(indexHtml),
        'Bảng đỉnh có 2 cột Ký hiệu và Màu');
    assert(appJs.includes("setVal('cadSymShowVertices', s.showVertices)"),
        'syncDisplayCheckboxes nhân bản trạng thái 3 nhóm hiển thị sang nhánh gộp');
    assert(styleCss.includes('.cad-sym-section-title'),
        'style.css định dạng các khối của nhánh gộp');
    assert(appJs.includes("'modalCadSymbols'"),
        'closeCadWindows đăng ký modal nhánh gộp (AGENTS.md §2)');
}

// =====================================================================
// TỔNG KẾT
// =====================================================================
console.log('\n' + '='.repeat(64));
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} test PASS`);
if (passedTests !== totalTests) {
    console.error(`❌ CÓ ${totalTests - passedTests} TEST THẤT BẠI`);
    process.exit(1);
}
console.log('✅ KIỂU/MÀU ĐIỂM RỜI + 3 NHÓM HIỂN THỊ TÁCH BIỆT HOẠT ĐỘNG ĐÚNG');
process.exit(0);
