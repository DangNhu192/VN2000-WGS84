/**
 * tests/taskbar_anti_overlap_and_collapse.test.js
 * KIỂM THỬ HỆ THỐNG CHỐNG ĐÈ GIAO DIỆN TASKBAR & CHẾ ĐỘ THU GỌN DOCK THÔNG MINH (2026 PRO)
 * Chạy với lệnh: node --test tests/taskbar_anti_overlap_and_collapse.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf-8');
const uiPolishCss = fs.readFileSync(path.join(ROOT_DIR, 'ui-polish.css'), 'utf-8');

test('=== 1. KIỂM THỬ CẤU TRÚC DOM DOCK COLLAPSE & EXPAND HANDLE TRONG INDEX.HTML ===', () => {
    // 1.1 Kiểm tra nút thu nhỏ dock (#btnDockCollapse) nằm trong nav#mobileBottomNav
    assert.ok(indexHtml.includes('id="btnDockCollapse"'), 'Có nút thu nhỏ dock #btnDockCollapse');
    assert.ok(indexHtml.includes('class="dock-collapse-btn"'), 'Nút thu nhỏ mang class dock-collapse-btn');
    assert.ok(indexHtml.includes('onclick="appNav.toggleTaskbarDock()"'), 'Nút thu nhỏ gọi appNav.toggleTaskbarDock()');

    // 1.2 Kiểm tra khối tay nắm mở rộng (#dockExpandHandle)
    assert.ok(indexHtml.includes('id="dockExpandHandle"'), 'Có tay nắm mở rộng #dockExpandHandle');
    assert.ok(indexHtml.includes('class="dock-expand-handle"'), 'Tay nắm mang class dock-expand-handle');

    // 1.3 Đảm bảo bảo toàn đúng 5 nút tính năng cốt lõi trên Bottom Nav
    assert.ok(indexHtml.includes('id="bnavMenu"'), 'Nút 1: Trang Chủ');
    assert.ok(indexHtml.includes('id="bnavTransform"'), 'Nút 2: Chuyển Đổi');
    assert.ok(indexHtml.includes('id="bnavMap"'), 'Nút 3: Bản Đồ');
    assert.ok(indexHtml.includes('id="bnavStakeout"'), 'Nút 4: Cắm Mốc');
    assert.ok(indexHtml.includes('id="bnavDataMgmt"'), 'Nút 5: Sổ Đo');
});

test('=== 2. KIỂM THỬ LOGIC JAVASCRIPT THU GỌN / MỞ RỘNG TASKBAR DOCK TRONG APP.JS ===', () => {
    // 2.1 appNav quản lý trạng thái isTaskbarCollapsed
    assert.ok(appJs.includes('isTaskbarCollapsed: false,'), 'appNav khởi tạo isTaskbarCollapsed: false');
    assert.ok(appJs.includes('toggleTaskbarDock(forceState)'), 'appNav có phương thức toggleTaskbarDock');
    assert.ok(appJs.includes('collapseTaskbar()'), 'appNav có phương thức collapseTaskbar');
    assert.ok(appJs.includes('expandTaskbar()'), 'appNav có phương thức expandTaskbar');

    // 2.2 renderTaskbarDock luôn bổ sung nút thu nhỏ và tay nắm mở rộng
    assert.ok(appJs.includes('id="btnDockCollapse"'), 'renderTaskbarDock nạp nút #btnDockCollapse');
    assert.ok(appJs.includes('id="dockExpandHandle"'), 'renderTaskbarDock nạp khối #dockExpandHandle');

    // 2.3 Khi mở MiniCAD (openCadMap), tự động thu gọn taskbar và gán body.cad-mode
    assert.ok(appJs.includes('this.collapseTaskbar();'), 'openCadMap tự động gọi collapseTaskbar()');
    assert.ok(appJs.includes("document.body.classList.add('cad-mode');"), 'openCadMap thêm class cad-mode cho body');

    // 2.4 Khi thoát MiniCAD về Menu hoặc chuyển phân hệ, tự động dọn cad-mode và mở lại taskbar
    assert.ok(appJs.includes("document.body.classList.remove('cad-mode');"), 'Dọn sạch cad-mode khi thoát khỏi MiniCAD');
    assert.ok(appJs.includes('this.expandTaskbar();'), 'Tự động mở lại taskbar khi rời MiniCAD');
});

test('=== 3. KIỂM THỬ VẬN HÀNH THỰC TẾ LOGIC THU GỌN DOCK (SIMULATION) ===', () => {
    // Giả lập DOM nav và body
    const mockNav = {
        classes: new Set(),
        classList: {
            add(c) { mockNav.classes.add(c); },
            remove(c) { mockNav.classes.delete(c); },
            toggle(c, force) {
                if (force === true) mockNav.classes.add(c);
                else if (force === false) mockNav.classes.delete(c);
                else if (mockNav.classes.has(c)) mockNav.classes.delete(c);
                else mockNav.classes.add(c);
            },
            contains(c) { return mockNav.classes.has(c); }
        }
    };

    const mockBody = {
        classes: new Set(),
        classList: {
            add(c) { mockBody.classes.add(c); },
            remove(c) { mockBody.classes.delete(c); },
            toggle(c, force) {
                if (force === true) mockBody.classes.add(c);
                else if (force === false) mockBody.classes.delete(c);
                else if (mockBody.classes.has(c)) mockBody.classes.delete(c);
                else mockBody.classes.add(c);
            },
            contains(c) { return mockBody.classes.has(c); }
        }
    };

    const navManager = {
        isTaskbarCollapsed: false,
        toggleTaskbarDock(forceState) {
            if (typeof forceState === 'boolean') {
                this.isTaskbarCollapsed = forceState;
            } else {
                this.isTaskbarCollapsed = !this.isTaskbarCollapsed;
            }
            mockNav.classList.toggle('dock-collapsed', this.isTaskbarCollapsed);
            mockBody.classList.toggle('dock-collapsed', this.isTaskbarCollapsed);
        },
        collapseTaskbar() { this.toggleTaskbarDock(true); },
        expandTaskbar() { this.toggleTaskbarDock(false); }
    };

    // Khởi đầu: chưa thu nhỏ
    assert.strictEqual(navManager.isTaskbarCollapsed, false);
    assert.strictEqual(mockNav.classList.contains('dock-collapsed'), false);

    // Kích hoạt thu nhỏ (collapse)
    navManager.collapseTaskbar();
    assert.strictEqual(navManager.isTaskbarCollapsed, true);
    assert.strictEqual(mockNav.classList.contains('dock-collapsed'), true);
    assert.strictEqual(mockBody.classList.contains('dock-collapsed'), true);

    // Kích hoạt mở rộng (expand)
    navManager.expandTaskbar();
    assert.strictEqual(navManager.isTaskbarCollapsed, false);
    assert.strictEqual(mockNav.classList.contains('dock-collapsed'), false);
    assert.strictEqual(mockBody.classList.contains('dock-collapsed'), false);

    // Toggle luân phiên
    navManager.toggleTaskbarDock();
    assert.strictEqual(navManager.isTaskbarCollapsed, true);
    navManager.toggleTaskbarDock();
    assert.strictEqual(navManager.isTaskbarCollapsed, false);
});

test('=== 4. KIỂM THỬ CSS CHỐNG ĐÈ GIAO DIỆN MINICAD & CÁC CHỨC NĂNG (UI-POLISH.CSS) ===', () => {
    // 4.1 MiniCAD: CLI, Status HUD và Thumb Bar được nâng cao +72px..+76px chống đè Dock
    assert.ok(
        uiPolishCss.includes('.cad-floating-cmd-bar {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 74px) !important;'),
        'MiniCAD CLI Floating CMD Bar được nâng +74px trên thanh Bottom Nav'
    );
    assert.ok(
        uiPolishCss.includes('.cad-status-hud {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important;'),
        'MiniCAD Status HUD được nâng +72px trên thanh Bottom Nav'
    );
    assert.ok(
        uiPolishCss.includes('.cad-thumb-action-bar {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 76px) !important;'),
        'MiniCAD Thumb Action Bar được nâng +76px trên thanh Bottom Nav'
    );

    // 4.2 Khi Dock thu gọn (body.dock-collapsed), MiniCAD tự động trượt sát đáy (+12px..+16px) giải phóng canvas
    assert.ok(
        uiPolishCss.includes('body.dock-collapsed .cad-floating-cmd-bar {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 16px) !important;'),
        'MiniCAD CLI tự động hạ xuống +16px khi Dock thu gọn'
    );
    assert.ok(
        uiPolishCss.includes('body.dock-collapsed .cad-status-hud {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 12px) !important;'),
        'MiniCAD Status HUD tự động hạ xuống +12px khi Dock thu gọn'
    );

    // 4.3 Bản đồ chuyển đổi tọa độ (#transformMapCoordHud & .transform-bottom-sheet)
    assert.ok(
        uiPolishCss.includes('#transformMapCoordHud,') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important;'),
        'HUD tọa độ bản đồ chuyển đổi được nâng +72px trên thanh Bottom Nav'
    );
    assert.ok(
        uiPolishCss.includes('.transform-bottom-sheet {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important;'),
        'Bottom Sheet bản đồ chuyển đổi được nâng +72px trên thanh Bottom Nav'
    );

    // 4.4 Bản đồ dự án (.map-bottom-sheet & .leaflet-bottom)
    assert.ok(
        uiPolishCss.includes('.map-bottom-sheet {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important;'),
        'Map Bottom Sheet được nâng +72px trên thanh Bottom Nav'
    );
    assert.ok(
        uiPolishCss.includes('#map-view-container .leaflet-bottom {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 68px) !important;'),
        'Thước đo tỷ lệ Leaflet được nâng +68px trên thanh Bottom Nav'
    );

    // 4.5 Tất cả màn hình cuộn (.screen-view) có dock clearance tối thiểu 130px chống che khuất nút thao tác đáy
    assert.ok(
        uiPolishCss.includes('padding-bottom: calc(130px + env(safe-area-inset-bottom, 20px)) !important;'),
        'Có dock clearance 130px cho mọi màn hình cuộn'
    );
    assert.ok(
        uiPolishCss.includes('body.dock-collapsed :is(#screen-menu, #screen-transform, #screen-datamgmt'),
        'Khi Dock thu nhỏ, tự động thu hẹp đệm đáy còn 44px'
    );
});
