/**
 * KIỂM THỬ:
 * 1. Thanh CADCraft 2D CLI: Bung rộng đầy đủ chức năng / Thu gọn chỉ hiển thị Icon
 * 2. Lưới tất cả công cụ CAD (Drawer / Popover Shortcuts Grid)
 * 3. Thực thi lệnh chính xác: đồng bộ tab con MiniCAD, con trỏ vẽ và hỗ trợ lệnh phím tắt/tiếng Việt
 * 4. Autocomplete thông minh và hỗ trợ phím mũi tên/Tab/Enter
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
const js = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');

test('=== 1. KIỂM THỬ GIAO DIỆN BUNG RỘNG / THU GỌN VÀ LƯỚI CÔNG CỤ CLI ===', () => {
    // 1.1 Header CLI có nút lưới công cụ và nút chuyển đổi chế độ bung rộng/thu gọn
    assert.ok(html.includes('id="btnCadCmdToolsGrid"'), 'Header phải có nút bật/tắt lưới công cụ 🎛️');
    assert.ok(html.includes('id="btnCadCmdExpandToggle"'), 'Header phải có nút bung rộng/thu gọn ⤢');

    // 1.2 Có popup lưới tất cả công cụ CAD (#cadCmdAllToolsGrid)
    assert.ok(html.includes('id="cadCmdAllToolsGrid"'), 'Phải có bảng lưới tất cả công cụ CAD');
    assert.ok(html.includes('📐 VẼ ĐỐI TƯỢNG (DRAW)'), 'Lưới có nhóm Vẽ đối tượng');
    assert.ok(html.includes('✂️ BIÊN TẬP & NHÃN (EDIT & MARKUP)'), 'Lưới có nhóm Biên tập & Nhãn');
    assert.ok(html.includes('📊 TIỆN ÍCH & TRỢ VẼ (AIDS & DATA)'), 'Lưới có nhóm Tiện ích & Trợ vẽ');

    // 1.3 Thanh ribbon có đầy đủ các nút cốt lõi
    assert.ok(html.includes('id="btnCadRibbonPoly"'), 'Ribbon có nút Đa giác [P]');
    assert.ok(html.includes('id="btnCadRibbonLine"'), 'Ribbon có nút Tuyến [L]');
    assert.ok(html.includes('id="btnCadRibbonRect"'), 'Ribbon có nút Nhà [REC]');
    assert.ok(html.includes('id="btnCadRibbonSelect"'), 'Ribbon có nút Chọn [V]');
    assert.ok(html.includes('id="btnCadRibbonOsnap"'), 'Ribbon có nút Snap [F3]');
    assert.ok(html.includes('id="btnCadRibbonOrtho"'), 'Ribbon có nút Ortho [F8]');
    assert.ok(html.includes('id="btnCadRibbonSnapLine"'), 'Ribbon có nút Bắt cạnh [B]');
    assert.ok(html.includes('id="btnCadRibbonDyn"'), 'Ribbon có nút Thước [DYN]');
});

test('=== 2. KIỂM THỬ CSS CHẾ ĐỘ EXPANDED RIBBON & COMPACT ICON MODE ===', () => {
    // 2.1 Có quy tắc CSS cho lưới công cụ popover
    assert.ok(css.includes('.cad-cmd-all-tools-grid'), 'Có CSS cho .cad-cmd-all-tools-grid');
    assert.ok(css.includes('.cad-tool-grid-btn'), 'Có CSS cho .cad-tool-grid-btn');

    // 2.2 Chế độ expanded-ribbon: mở rộng bề ngang và hiển thị text
    assert.ok(css.includes('.cad-floating-cmd-bar.expanded-ribbon'), 'Có CSS cho chế độ expanded-ribbon');
    assert.match(
        css,
        /\.cad-floating-cmd-bar\.expanded-ribbon\s+\.cad-ribbon-btn\s+\.ribbon-btn-text\s*\{\s*display:\s*inline\s*!important;/,
        'Chế độ expanded-ribbon phải hiển thị đầy đủ tên nút'
    );

    // 2.3 Chế độ compact-icon-mode: thu gọn và chỉ hiện icon
    assert.ok(css.includes('.cad-floating-cmd-bar.compact-icon-mode'), 'Có CSS cho chế độ compact-icon-mode');
    assert.match(
        css,
        /\.cad-floating-cmd-bar\.compact-icon-mode\s+\.cad-ribbon-btn\s+\.ribbon-btn-text\s*\{\s*display:\s*none\s*!important;/,
        'Chế độ compact-icon-mode phải ẩn text chỉ hiện Icon'
    );
});

test('=== 3. KIỂM THỬ THỰC THI LỆNH CADCRAFT CLI VÀ ĐỒNG BỘ TAB MINICAD ===', () => {
    // 3.1 appCadTool có các hàm toggle và quickExecCmd
    assert.ok(js.includes('toggleCmdToolsGrid()'), 'appCadTool có hàm toggleCmdToolsGrid');
    assert.ok(js.includes('toggleCmdRibbonExpand()'), 'appCadTool có hàm toggleCmdRibbonExpand');
    assert.ok(js.includes('quickExecCmd('), 'appCadTool có hàm quickExecCmd');
    assert.ok(js.includes('updateCmdRibbonActiveStates()'), 'appCadTool có hàm updateCmdRibbonActiveStates');

    // 3.2 executeCommandLine tự động kích hoạt toolbar nếu chưa mở
    assert.ok(
        js.includes('if (!this.isActive) {\n            this.openToolbar();\n        }'),
        'executeCommandLine phải tự động mở Toolbar MiniCAD nếu chưa mở'
    );

    // 3.3 Lệnh L/P phải kích hoạt switchToolTab("draw")
    assert.ok(
        js.includes("this.setMode('polyline');\n                this.switchToolTab('draw');") ||
        js.includes("this.setMode('polyline');\r\n                this.switchToolTab('draw');"),
        'Lệnh L/Line phải gọi setMode(polyline) và switchToolTab(draw)'
    );
    assert.ok(
        js.includes("this.setMode('polygon');\n                this.switchToolTab('draw');") ||
        js.includes("this.setMode('polygon');\r\n                this.switchToolTab('draw');"),
        'Lệnh P/Polygon phải gọi setMode(polygon) và switchToolTab(draw)'
    );

    // 3.4 Lệnh REC/C/DIM/T phải kích hoạt switchToolTab("markup")
    assert.ok(
        js.includes("this.setMarkupMode('rect');\n                this.switchToolTab('markup');") ||
        js.includes("this.setMarkupMode('rect');\r\n                this.switchToolTab('markup');"),
        'Lệnh REC phải gọi setMarkupMode(rect) và switchToolTab(markup)'
    );

    // 3.5 Lệnh V/CHON phải kích hoạt switchToolTab("select")
    assert.ok(
        js.includes("this.setMode('select');\n                this.switchToolTab('select');") ||
        js.includes("this.setMode('select');\r\n                this.switchToolTab('select');"),
        'Lệnh V phải gọi setMode(select) và switchToolTab(select)'
    );
});

test('=== 4. KIỂM THỬ AUTOCOMPLETE & ĐIỀU HƯỚNG BẰNG PHÍM MŨI TÊN ===', () => {
    // 4.1 handleCmdKeyDown xử lý phím mũi tên ArrowDown/ArrowUp cho autocomplete
    assert.ok(js.includes("if (e.key === 'ArrowDown')"), 'Có xử lý ArrowDown');
    assert.ok(js.includes("if (e.key === 'ArrowUp')"), 'Có xử lý ArrowUp');
    assert.ok(js.includes("this.cadCmdSuggestIndex"), 'Có biến cadCmdSuggestIndex theo dõi item gợi ý');

    // 4.2 Hỗ trợ phím Tab và Enter chọn gợi ý
    assert.ok(js.includes("} else if (e.key === 'Tab')"), 'Có xử lý phím Tab chọn gợi ý autocomplete');
    assert.ok(js.includes("} else if (e.key === 'Enter')"), 'Có xử lý phím Enter chọn gợi ý và thực thi');
});
