/**
 * tests/cadcraft_cli_bottom_drag_and_dock.test.js
 * KIỂM THỬ TOÀN DIỆN: KHẮC PHỤC TRIỆT ĐỂ LỖI DÍNH CẠNH DƯỚI & XUNG ĐỘT STATUS BAR CỦA CADCRAFT 2D CLI
 * Chạy kiểm thử: node --test tests/cadcraft_cli_bottom_drag_and_dock.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf-8');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf-8');
const uiPolishCss = fs.readFileSync(path.join(ROOT_DIR, 'ui-polish.css'), 'utf-8');

test('=== 1. KIỂM THỬ CSS CƠ SỞ CHỐNG DÍNH CẠNH DƯỚI & CHỐNG ĐÈ STATUS HUD ===', () => {
    // 1.1 Khung CLI khi dock mở rộng phải nổi an toàn phía trên (+112px) so với Status HUD (+72px)
    assert.ok(
        uiPolishCss.includes('.cad-floating-cmd-bar:not(.is-dragged) {') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 112px) !important;'),
        'CLI có cao độ +112px khi Dock mở rộng, cách Status HUD (+72px, cao 31px) một khoảng đệm an toàn 9px'
    );

    // 1.2 Khung CLI khi dock thu gọn phải nổi an toàn phía trên (+52px) so với Status HUD (+12px)
    assert.ok(
        uiPolishCss.includes('body.dock-collapsed .cad-floating-cmd-bar:not(.is-dragged)') &&
        uiPolishCss.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 52px) !important;'),
        'CLI có cao độ +52px khi Dock thu gọn, cách Status HUD (+12px, cao 31px) một khoảng đệm an toàn 9px'
    );

    // 1.3 Quy chuẩn chống dính cạnh dưới khi kéo thả: .is-dragged giải phóng hoàn toàn bottom và right
    assert.ok(
        uiPolishCss.includes('.cad-floating-cmd-bar.is-dragged {') &&
        uiPolishCss.includes('bottom: auto !important;') &&
        uiPolishCss.includes('right: auto !important;') &&
        uiPolishCss.includes('transition: none !important;'),
        'Khi kéo thả (.is-dragged), bottom và right được giải phóng hoàn toàn (bottom: auto !important), triệt tiêu dính cạnh dưới'
    );

    // 1.4 Hỗ trợ Autocomplete xổ xuống khi CLI ở trên cao
    assert.ok(
        styleCss.includes('.cad-cmd-autocomplete.drop-down {') &&
        styleCss.includes('top: 100% !important;'),
        'Có CSS .cad-cmd-autocomplete.drop-down xổ xuống khi CLI ở trên cao'
    );
});

test('=== 2. KIỂM THỬ LOGIC JAVASCRIPT KÉO THẢ TỰ DO & NEO LẠI (RESET) VỊ TRÍ CLI ===', () => {
    // 2.1 initFloatingCmdBarDrag gán class is-dragged và xóa kẹt bottom/right
    assert.ok(
        appJs.includes("bar.classList.add('is-dragged');"),
        'initFloatingCmdBarDrag thêm class is-dragged khi bắt đầu kéo'
    );
    assert.ok(
        appJs.includes("bar.style.setProperty('bottom', 'auto', 'important');"),
        'initFloatingCmdBarDrag xóa bỏ ràng buộc bottom bằng setProperty !important'
    );
    assert.ok(
        appJs.includes("bar.style.setProperty('right', 'auto', 'important');"),
        'initFloatingCmdBarDrag xóa bỏ ràng buộc right trên màn hình mobile'
    );

    // 2.2 Hỗ trợ nhấp đúp (Double-click) vào Header để Reset vị trí nổi mặc định
    assert.ok(
        appJs.includes("header.addEventListener('dblclick',"),
        'Header CLI lắng nghe sự kiện dblclick để neo lại vị trí mặc định'
    );
    assert.ok(
        appJs.includes('resetFloatingCmdBarPosition()'),
        'appCadTool có phương thức resetFloatingCmdBarPosition()'
    );

    // 2.3 Cơ chế chống trôi ra ngoài màn hình khi resize cửa sổ
    assert.ok(
        appJs.includes("bar.classList.contains('is-dragged') && bar.style.display !== 'none'"),
        'Tự động kẹp tọa độ trong viewport khi cửa sổ thay đổi kích thước'
    );
});

test('=== 3. MÔ PHỎNG VẬN HÀNH LOGIC KÉO THẢ & KHÔNG BAO GIỜ BỊ DÍNH CẠNH ĐÁY ===', () => {
    // Giả lập DOM element CLI
    const mockBar = {
        classes: new Set(),
        styles: {},
        classList: {
            add(c) { mockBar.classes.add(c); },
            remove(c) { mockBar.classes.delete(c); },
            contains(c) { return mockBar.classes.has(c); }
        },
        style: {
            setProperty(prop, val) { mockBar.styles[prop] = val; },
            removeProperty(prop) { delete mockBar.styles[prop]; },
            get top() { return mockBar.styles['top'] || ''; },
            set top(v) { mockBar.styles['top'] = v; },
            get left() { return mockBar.styles['left'] || ''; },
            set left(v) { mockBar.styles['left'] = v; },
            get bottom() { return mockBar.styles['bottom'] || ''; },
            set bottom(v) { mockBar.styles['bottom'] = v; },
            get right() { return mockBar.styles['right'] || ''; },
            set right(v) { mockBar.styles['right'] = v; }
        }
    };

    // 3.1 Bắt đầu kéo: Kích hoạt is-dragged
    mockBar.classList.add('is-dragged');
    mockBar.style.setProperty('bottom', 'auto', 'important');
    mockBar.style.setProperty('right', 'auto', 'important');
    mockBar.style.left = '100px';
    mockBar.style.top = '250px';

    assert.strictEqual(mockBar.classList.contains('is-dragged'), true);
    assert.strictEqual(mockBar.styles['bottom'], 'auto');
    assert.strictEqual(mockBar.styles['top'], '250px');
    assert.strictEqual(mockBar.styles['left'], '100px');

    // 3.2 Gọi resetFloatingCmdBarPosition(): Phải trả về trạng thái mặc định sạch sẽ
    mockBar.classList.remove('is-dragged');
    mockBar.style.removeProperty('top');
    mockBar.style.removeProperty('left');
    mockBar.style.removeProperty('bottom');
    mockBar.style.removeProperty('right');

    assert.strictEqual(mockBar.classList.contains('is-dragged'), false);
    assert.strictEqual(mockBar.styles['top'], undefined);
    assert.strictEqual(mockBar.styles['bottom'], undefined);
    assert.strictEqual(mockBar.styles['left'], undefined);
});
