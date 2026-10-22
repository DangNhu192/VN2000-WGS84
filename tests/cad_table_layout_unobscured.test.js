/**
 * tests/cad_table_layout_unobscured.test.js
 * Kiểm thử toàn diện tính năng: Bảng kê MiniCAD không bị che khuất, phóng to toàn màn hình,
 * chuyển đổi 4 chế độ bố trí (Xem cả hai, Chỉ bảng khối, Chỉ bảng chi tiết, Song song 2 cột)
 * và Sticky Header chống trôi tiêu đề cột khi cuộn dữ liệu.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexHtmlPath = path.join(__dirname, '../index.html');
const appJsPath = path.join(__dirname, '../app.js');

test('=== 1. KIỂM THỬ GIAO DIỆN BẢNG KÊ MINICAD CHỐNG CHE KHUẤT (INDEX.HTML) ===', async (t) => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');

    await t.test('Có nút phóng to / thu nhỏ toàn màn hình #btnCadTableMaximize', () => {
        assert.ok(html.includes('id="btnCadTableMaximize"'), 'Phải có nút phóng to modal #btnCadTableMaximize');
        assert.ok(html.includes('onclick="appCadTool.toggleMaximizeAreaModal()"'), 'Nút phải gắn sự kiện toggleMaximizeAreaModal()');
        assert.ok(html.includes('id="lblCadTableMaximizeIcon"'), 'Phải có icon chuyển đổi trạng thái phóng to/thu nhỏ');
    });

    await t.test('Có thanh điều chỉnh bố trí bảng cad-table-view-controls với 4 chế độ', () => {
        assert.ok(html.includes('class="cad-table-view-controls"'), 'Phải có thanh điều chỉnh chế độ xem bảng');
        assert.ok(html.includes('id="btnCadViewBoth"'), 'Phải có nút Xem Cả Hai #btnCadViewBoth');
        assert.ok(html.includes('id="btnCadViewBlocksOnly"'), 'Phải có nút Chỉ Bảng Khối #btnCadViewBlocksOnly');
        assert.ok(html.includes('id="btnCadViewCoordsOnly"'), 'Phải có nút Chỉ Bảng Chi Tiết #btnCadViewCoordsOnly');
        assert.ok(html.includes('id="btnCadViewSplit"'), 'Phải có nút Song Song 2 Cột #btnCadViewSplit');
    });

    await t.test('Có các nút thu gọn / mở rộng nhanh từng bảng', () => {
        assert.ok(html.includes('id="btnToggleCollapseBlocks"'), 'Phải có nút thu gọn bảng khối #btnToggleCollapseBlocks');
        assert.ok(html.includes('id="btnToggleCollapseCoords"'), 'Phải có nút thu gọn bảng chi tiết #btnToggleCollapseCoords');
        assert.ok(html.includes('onclick="appCadTool.toggleSection(\'blocks\')"'), 'Bảng khối phải gắn toggleSection(\'blocks\')');
        assert.ok(html.includes('onclick="appCadTool.toggleSection(\'coords\')"'), 'Bảng chi tiết phải gắn toggleSection(\'coords\')');
    });

    await t.test('Phân chia container độc lập và bảng chi tiết có Sticky Header chống che khuất', () => {
        assert.ok(html.includes('id="cadTablesMainContainer"'), 'Phải có container bọc 2 bảng #cadTablesMainContainer');
        assert.ok(html.includes('id="cadBlockListSection"'), 'Phải có section bảng khối #cadBlockListSection');
        assert.ok(html.includes('id="cadCoordTableSection"'), 'Phải có section bảng chi tiết đỉnh #cadCoordTableSection');
        assert.ok(html.includes('class="cad-sticky-thead"'), 'Bảng chi tiết phải có class cad-sticky-thead');
        assert.ok(html.includes('position: sticky; top: 0;'), 'Tiêu đề thead phải cố định position: sticky để không bị che khuất khi cuộn');
    });
});

test('=== 2. KIỂM THỬ LOGIC JAVASCRIPT ĐIỀU KHIỂN BẢNG KÊ TRONG APP.JS ===', async (t) => {
    const js = fs.readFileSync(appJsPath, 'utf8');

    await t.test('appCadTool có đầy đủ các hàm xử lý bố trí bảng kê', () => {
        assert.ok(js.includes('toggleMaximizeAreaModal()'), 'Phải có hàm toggleMaximizeAreaModal()');
        assert.ok(js.includes('setAreaTableViewMode(mode)'), 'Phải có hàm setAreaTableViewMode(mode)');
        assert.ok(js.includes('toggleSection(sectionKey)'), 'Phải có hàm toggleSection(sectionKey)');
        assert.ok(js.includes('closeAreaTableModal()'), 'Phải có hàm closeAreaTableModal()');
    });

    await t.test('Hàm setAreaTableViewMode xử lý chuẩn xác 4 chế độ: both, blocks, coords, split', () => {
        assert.ok(js.includes("mode === 'blocks'"), 'Phải có nhánh xử lý chỉ hiển thị bảng khối');
        assert.ok(js.includes("mode === 'coords'"), 'Phải có nhánh xử lý chỉ hiển thị bảng chi tiết');
        assert.ok(js.includes("mode === 'split'"), 'Phải có nhánh xử lý bố trí song song 2 cột (split layout)');
        assert.ok(js.includes("vn2k_cad_table_view_mode"), 'Phải lưu cấu hình chế độ xem vào localStorage vn2k_cad_table_view_mode');
    });

    await t.test('Hàm toggleMaximizeAreaModal hỗ trợ lưu và khôi phục trạng thái toàn màn hình', () => {
        assert.ok(js.includes("vn2k_cad_table_maximized"), 'Phải lưu trạng thái phóng to vào localStorage vn2k_cad_table_maximized');
        assert.ok(js.includes("this.isAreaModalMaximized"), 'Phải quản lý cờ trạng thái isAreaModalMaximized');
    });

    await t.test('Hàm openAreaTableModal tự động khôi phục chế độ xem đã lưu của người dùng', () => {
        assert.ok(js.includes("localStorage.getItem('vn2k_cad_table_view_mode')"), 'openAreaTableModal phải khôi phục vn2k_cad_table_view_mode');
        assert.ok(js.includes("this.setAreaTableViewMode(savedMode)"), 'openAreaTableModal phải gọi setAreaTableViewMode');
    });
});
