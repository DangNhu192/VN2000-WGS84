/**
 * BỘ KIỂM THỬ: CÁCH LY CỬA SỔ GIỮA CÁC PHÂN HỆ (UI ISOLATION)
 * Theo AGENTS.md §2: "Phân hệ Bản đồ dự án chỉ phục vụ xem mốc dự án, không được chèn
 * các công cụ của chuyển đổi hay CAD" và thao tác ở Chuyển đổi tọa độ không được gọi
 * giao diện của Bản đồ dự án / MiniCAD.
 *
 * Bộ test chạy thật các guard + helper dọn dẹp để bắt lỗi tái phát:
 *  - Rời MiniCAD mà cửa sổ CAD (bảng kê, popup, sửa chú thích...) còn treo đè lên phân hệ khác
 *  - Bấm vào khối/đỉnh trên Bản đồ dự án lại mở popup sửa nhanh / modal chú thích của CAD
 *  - Kéo đỉnh hoặc chuột phải xóa đỉnh khi MiniCAD đang tắt
 *  - Bản đồ Chấm điểm / xem điểm chuyển đổi còn sót hình khối CAD
 *  - Modal tem mặc định / popup mở bản đồ chuyển đổi chỉ thêm class 'show' (không hiển thị)
 *
 * Chạy với: node tests/cad_ui_isolation.test.js
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
const cadStart = appJs.indexOf('const appCadTool = {');
if (cadStart < 0) throw new Error('Không tìm thấy appCadTool trong app.js');

/**
 * Cắt nguyên văn một method (kèm thân hàm) để chạy thật trong sandbox.
 * `from` cho phép chọn đúng định nghĩa khi tên method bị trùng giữa các phân hệ.
 */
function extractMethod(name, from = 0) {
    const start = appJs.indexOf('\n    ' + name + '(', from);
    if (start < 0) throw new Error('Không tìm thấy method: ' + name);

    // Bỏ qua object literal trong tham số mặc định, ví dụ options = { mode: 'pick' }
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

const CAD_MODAL_IDS = [
    'modalCadAreaTable', 'modalCadPointTable', 'modalCadExportConfig',
    'modalCadLoadProject', 'modalCadPolarInput', 'modalCadCoordInput',
    'modalCadLayers', 'modalCadEditAnnotation', 'modalCadCreateArrow',
    'modalCadGisImport', 'modalCadInquiry', 'modalCadQSelect', 'modalCadSymbols'
];

// =====================================================================
// 1. closeCadWindows(): đóng toàn bộ cửa sổ CAD khi rời phân hệ
// =====================================================================
console.log('\n— closeCadWindows: dọn cửa sổ CAD khi rời MiniCAD —');
{
    const elements = {};
    CAD_MODAL_IDS.forEach(id => {
        elements[id] = {
            style: { display: 'flex' },
            classList: {
                _set: new Set(['active', 'show']),
                remove(...names) { names.forEach(n => this._set.delete(n)); },
                contains(name) { return this._set.has(name); }
            }
        };
    });
    elements.cadBlocksStatsPanel = { style: { display: 'block' } };

    const documentStub = { getElementById: id => elements[id] || null };
    let popupClosed = false;
    const AppStateStub = { leafletMap: { closePopup() { popupClosed = true; } } };

    const api = new Function('AppState', 'document',
        `return ({ ${extractMethod('closeCadWindows', cadStart)} });`)(AppStateStub, documentStub);

    api.closeCadWindows();

    assert(popupClosed, 'Đóng popup Leaflet đang mở trên bản đồ dùng chung');
    assert(CAD_MODAL_IDS.every(id => elements[id].style.display === 'none'),
        `Ẩn đủ ${CAD_MODAL_IDS.length} cửa sổ CAD (bảng kê/điểm/xuất/nạp/cực/tọa độ/lớp/chú thích/mũi tên/GIS/trắc lượng/QSELECT/ký hiệu)`);
    assert(CAD_MODAL_IDS.every(id => !elements[id].classList.contains('active') && !elements[id].classList.contains('show')),
        'Gỡ cả class active lẫn show khỏi mọi cửa sổ CAD');
    assert(elements.cadBlocksStatsPanel.style.display === 'none', 'Ẩn bảng thống kê khối CAD nếu đang mở');
}

// =====================================================================
// 2. clearCadOverlays(): gỡ hình khối khỏi bản đồ dùng chung
// =====================================================================
console.log('\n— clearCadOverlays: gỡ hình khối CAD khỏi bản đồ —');
{
    let groupCleared = 0;
    let annoCleared = 0;
    let polarCleared = 0;
    let inqCleared = 0;
    const api = new Function(`return ({ ${extractMethod('clearCadOverlays', cadStart)} });`)();
    api.clearCadOverlays.call({
        layers: {
            group: { clearLayers() { groupCleared++; } },
            annotationsGroup: { clearLayers() { annoCleared++; } },
            polarGroup: { clearLayers() { polarCleared++; } },
            inquiryGroup: { clearLayers() { inqCleared++; } }
        }
    });
    assert(groupCleared === 1, 'Xóa toàn bộ khối/hình vẽ CAD khỏi lớp bản đồ');
    assert(annoCleared === 1, 'Xóa toàn bộ chú thích CAD khỏi lớp bản đồ');
    assert(polarCleared === 1 && inqCleared === 1,
        'Xóa cả tia dóng góc (F10) lẫn hình vẽ trắc lượng — không để sót trên bản đồ phân hệ khác');
}

// =====================================================================
// 3. Guard: thao tác trên Bản đồ dự án / Chuyển đổi không mở công cụ CAD
// =====================================================================
console.log('\n— Guard chống mở công cụ CAD khi MiniCAD đang tắt —');
{
    const throwingDocument = {
        getElementById() { throw new Error('Không được truy cập DOM khi MiniCAD đang tắt'); }
    };

    // selectItem
    const selectApi = new Function('document',
        `return ({ ${extractMethod('selectItem', cadStart)} });`)(throwingDocument);
    const selectCtx = { isActive: false, selectedItem: null };
    let selectThrew = false;
    try { selectApi.selectItem.call(selectCtx, { type: 'shape', shape: {} }); } catch (e) { selectThrew = true; }
    assert(!selectThrew && selectCtx.selectedItem === null,
        'selectItem bỏ qua khi MiniCAD tắt (xem khối ở Bản đồ dự án không mở thanh sửa CAD)');

    // showQuickEditPopup
    const quickApi = new Function('AppState', 'document',
        `return ({ ${extractMethod('showQuickEditPopup', cadStart)} });`)({}, throwingDocument);
    let quickThrew = false;
    try { quickApi.showQuickEditPopup.call({ isActive: false }, null, { type: 'shape' }); } catch (e) { quickThrew = true; }
    assert(!quickThrew, 'showQuickEditPopup bỏ qua khi MiniCAD tắt (không bật popup sửa nhanh CAD)');

    // openAnnotationModal
    const annApi = new Function('document',
        `return ({ ${extractMethod('openAnnotationModal', cadStart)} });`)(throwingDocument);
    let annThrew = false;
    try { annApi.openAnnotationModal.call({ isActive: false }, 'ann-1'); } catch (e) { annThrew = true; }
    assert(!annThrew, 'openAnnotationModal bỏ qua khi MiniCAD tắt (không mở cửa sổ sửa chú thích)');

    // handleMapClick (bản của appCadTool)
    const clickApi = new Function(`return ({ ${extractMethod('handleMapClick', cadStart)} });`)();
    let collapseRan = false;
    let clickThrew = false;
    try {
        clickApi.handleMapClick.call({
            isActive: false,
            scheduleToolbarCollapse() { collapseRan = true; }
        }, 10.5, 106.5);
    } catch (e) { clickThrew = true; }
    assert(!clickThrew && !collapseRan,
        'handleMapClick của CAD bỏ qua khi MiniCAD tắt (chạm bản đồ dự án không vẽ nhầm)');
}

// =====================================================================
// 4. Rời phân hệ: đóng thanh công cụ + dọn cửa sổ/hình khối CAD
// =====================================================================
console.log('\n— Rời MiniCAD: đóng toolbar, cửa sổ và hình khối —');
{
    const closeToolbarBody = extractMethod('closeToolbar', cadStart);
    assert(/this\.isActive\s*=\s*false/.test(closeToolbarBody), 'closeToolbar tắt cờ isActive');
    assert(closeToolbarBody.includes('this.closeCadWindows()'), 'closeToolbar đóng mọi cửa sổ CAD còn treo');

    [
        ['openCoordPickerMap', 'Bản đồ Chấm điểm tọa độ'],
        ['openConvertedMap', 'Bản đồ xem điểm chuyển đổi'],
        ['openProjectMap', 'Bản đồ dự án & mốc']
    ].forEach(([name, label]) => {
        const body = extractMethod(name);
        assert(body.includes('closeCadWindows'), `${label} gọi closeCadWindows trước khi hiển thị`);
        assert(body.includes('clearCadOverlays'), `${label} gọi clearCadOverlays (không lẫn hình khối CAD)`);
    });

    ['openTransformCoordScreen', 'openTransformMap'].forEach(name => {
        const body = extractMethod(name);
        assert(body.includes('appCadTool.closeToolbar()'), `${name} tắt MiniCAD nếu đang mở`);
    });

    const markerLine = appJs.match(/L\.marker\(\[v\.lat, v\.lng\][^\n]*\)/);
    assert(!!markerLine && markerLine[0].includes('draggable: !isLayerLocked && this.isActive'),
        'Đỉnh khối chỉ kéo được khi MiniCAD đang bật');

    assert(/marker\.on\('dragstart', \(e\) => \{\s*\n\s*(?:\/\/[^\n]*\n\s*)?if \(!this\.isActive\) return;/.test(appJs),
        'Sự kiện kéo đỉnh chặn khi MiniCAD tắt');
    assert(/marker\.on\('contextmenu', \(e\) => \{\s*\n\s*\/\/[^\n]*\n\s*if \(!this\.isActive\) return;/.test(appJs),
        'Sự kiện chuột phải xóa đỉnh chặn khi MiniCAD tắt');
}

// =====================================================================
// 5. Modal chỉ thêm class 'show' sẽ không hiển thị (thiếu 'active')
// =====================================================================
console.log('\n— Modal phải có class active mới hiển thị —');
{
    const stampBody = extractMethod('openDefaultStampSettingsModal', cadStart);
    assert(stampBody.includes("classList.add('active', 'show')"),
        'Mở cài đặt tem mặc định thêm đủ active + show');

    const promptBody = extractMethod('promptOpenConvertedMap');
    assert(promptBody.includes("classList.add('active', 'show')"),
        'Popup mở bản đồ điểm chuyển đổi thêm đủ active + show');

    const closePromptBody = extractMethod('closePromptMap');
    assert(closePromptBody.includes("classList.remove('active', 'show')"),
        'Đóng popup điểm chuyển đổi gỡ cả active + show');
}

// =====================================================================
// TỔNG KẾT
// =====================================================================
console.log('\n' + '='.repeat(60));
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} test PASS`);
if (passedTests !== totalTests) {
    console.error(`❌ CÓ ${totalTests - passedTests} TEST THẤT BẠI`);
    process.exit(1);
}
console.log('✅ TẤT CẢ TEST CÁCH LY GIAO DIỆN ĐỀU PASS');
process.exit(0);
