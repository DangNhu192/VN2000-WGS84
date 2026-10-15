/**
 * KIỂM THỬ:
 * 1. MiniCAD sub-tabs trên màn hình nhỏ: chỉ hiện tab con được chọn (active), ẩn hoàn toàn các tab con khác
 * 2. Thanh CADCraft 2D CLI: font chữ linh động, không in hoa toàn bộ, chống tràn chữ (1 thu nhỏ, 2 chỉ hiện icon)
 * 3. Chống tràn chữ trên thanh công cụ MiniCAD và bản đồ
 * 4. Xác minh không có nút chết / không tác dụng
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');

test('=== 1. KIỂM THỬ TAB CON MINICAD TRÊN MÀN HÌNH NHỎ (<= 600px) ===', () => {
    // 1.1 Kiểm tra rule CSS: chỉ hiển thị tab con active, không được ép tất cả cad-actions-row thành display:flex
    assert.ok(
        css.includes('.cad-actions-row.active'),
        'style.css phải định nghĩa .cad-actions-row.active để chỉ hiện tab được chọn'
    );
    assert.ok(
        css.includes('.cad-actions-row:not(.active)'),
        'style.css phải có rule .cad-actions-row:not(.active) để ẩn các tab con không chọn'
    );
    assert.match(
        css,
        /\.cad-actions-row:not\(\.active\)\s*\{\s*display:\s*none\s*!important;/,
        'Các tab con không active phải bị ẩn triệt để display: none !important'
    );

    // 1.2 appCadTool.openToolbar phải gọi switchToolTab để đồng bộ trạng thái ban đầu
    assert.ok(
        js.includes("this.switchToolTab(this.activeToolTab || 'draw')"),
        'openToolbar phải gọi switchToolTab để kích hoạt panel vẽ ban đầu'
    );
});

test('=== 2. KIỂM THỬ THANH CADCRAFT 2D CLI KHÔNG IN HOA & CHỐNG TRÀN CHỮ ===', () => {
    // 2.1 Các nút trong #cadCmdStatusRibbon không được in hoa toàn bộ
    assert.ok(!html.includes('🧲 OSNAP</button>'), 'Nút Osnap không được IN HOA toàn bộ');
    assert.ok(!html.includes('📐 ORTHO</button>'), 'Nút Ortho không được IN HOA toàn bộ');
    assert.ok(!html.includes('🔗 SNAP LINE</button>'), 'Nút Snap Line không được IN HOA toàn bộ');
    assert.ok(!html.includes('📏 DYN</button>'), 'Nút Dyn không được IN HOA toàn bộ');
    assert.ok(!html.includes('📊 BẢNG KÊ [E]</button>'), 'Nút Bảng kê không được IN HOA toàn bộ');
    assert.ok(!html.includes('📤 XUẤT [EXP]</button>'), 'Nút Xuất không được IN HOA toàn bộ');

    // 2.2 Các nút phải có cấu trúc ribbon-btn-icon và ribbon-btn-text
    assert.ok(html.includes('class="ribbon-btn-icon"'), 'Phải có span ribbon-btn-icon');
    assert.ok(html.includes('class="ribbon-btn-text"'), 'Phải có span ribbon-btn-text');

    // 2.3 CSS của .cad-ribbon-btn: font-size linh động, không in hoa, min-width 0
    assert.ok(css.includes('text-transform: none;'), 'CSS phải có text-transform: none để tránh in hoa');
    assert.ok(css.includes('.cad-ribbon-btn') && css.includes('min-width: 0;'), '.cad-ribbon-btn phải có min-width: 0');
    assert.ok(css.includes('font-size: clamp('), '.cad-ribbon-btn phải có font-size clamp linh động');

    // 2.4 Responsive: khi màn hình siêu nhỏ, ẩn ribbon-btn-text chỉ hiện Icon to
    assert.match(
        css,
        /\.cad-ribbon-btn\s+\.ribbon-btn-text\s*\{\s*display:\s*none\s*!important;/,
        'Khi màn hình quá chật hẹp, phải hỗ trợ phương án chỉ hiện Icon để chống tràn chữ'
    );
});

test('=== 3. KIỂM THỬ CHỐNG TRÀN CHỮ CHO CÁC NÚT ĐIỀU KHIỂN KHÁC ===', () => {
    // 3.1 Nút Undo và Redo có span icon & text
    assert.ok(html.includes('class="cad-btn-symbol">↩</span>'), 'Nút Undo có icon riêng');
    assert.ok(html.includes('class="cad-btn-symbol">↪</span>'), 'Nút Redo có icon riêng');
    assert.match(
        css,
        /\.cad-btn-icon\s+\.cad-btn-text\s*\{\s*display:\s*none\s*!important;/,
        'Khi màn hình nhỏ, nút Undo/Redo chỉ hiện icon chống tràn'
    );

    // 3.2 Tab MiniCAD trên màn hình siêu hẹp có thể ẩn chữ chỉ hiện icon
    assert.match(
        css,
        /\.cad-tab-btn\s+\.cad-tab-text\s*\{\s*display:\s*none\s*!important;/,
        'Khi màn hình siêu hẹp (<= 390px), tab MiniCAD chỉ hiện Icon Touch Bar'
    );
});

test('=== 4. KIỂM THỬ XÁC MINH CÁC NÚT CHẾT ĐÃ ĐƯỢC DỌN DẸP SẠCH SẼ ===', () => {
    assert.ok(!html.includes('id="btnFloatingQuickNav"'), 'Không còn nút chết btnFloatingQuickNav');
    assert.ok(!html.includes('id="btnUiModeIconPro"'), 'Không còn nút không tác dụng btnUiModeIconPro');
    assert.ok(!html.includes('id="btnUiModeDetailed"'), 'Không còn nút không tác dụng btnUiModeDetailed');
});
