// Mục lục chức năng — phương án A "danh sách gọn": dùng chung cho menu ☰ và "Tất cả chức năng" ở Trang chủ.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'ui-unified.css'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const S = require('../app-shell.js');

// Menu ☰ thật trong index.html → dữ liệu thô như readMenu() đọc trong trình duyệt.
function menuFromHtml() {
    const drawer = html.slice(html.indexOf('id="navTreeDrawer"'));
    return [...drawer.matchAll(/<div class="drawer-folder" id="(drawerFolder\d)">([\s\S]*?)(?=<div class="drawer-folder" id=|<\/aside>)/g)].map(m => ({
        id: m[1],
        name: '',
        items: [...m[2].matchAll(/<div class="drawer-leaf-item" id="(drawerItem_\w+)"([^>]*)>[\s\S]*?drawer-leaf-title"[^>]*>([^<]*)<\/div>\s*<div class="drawer-leaf-sub"[^>]*>([^<]*)</g)]
            .filter(x => !/display:\s*none/.test(x[2]))
            .map(x => ({ id: x[1], name: x[3].trim(), sub: x[4].trim() }))
    }));
}

test('mọi mục menu ☰ có tên gọn, mô tả, biểu tượng nét (vi + en); 5 nhóm có tên và màu', () => {
    const raw = menuFromHtml();
    assert.equal(raw.length, 5);
    const ids = raw.flatMap(g => g.items.map(it => it.id));
    assert.equal(ids.length, 21);
    for (const id of ids) {
        const m = S.ITEM_META[id];
        assert.ok(m, `Thiếu tên gọn cho ${id}`);
        assert.ok(m[0] && m[1] && m[2] && m[3] && S.ICON[m[4]], id);
        assert.ok(!/^\d+\.\d+/.test(m[0]), `Không đánh số: ${m[0]}`);
    }
    for (const g of raw) assert.ok(S.GROUP_META[g.id], g.id);
});

test('mô hình mục lục: ★ cho chức năng trên Trang chủ, mục đang mở, tên tiếng Anh', () => {
    const raw = menuFromHtml();
    raw[1].items[1].current = true; // Cắm mốc đang mở
    const vi = S.indexModel(raw, ['drawerItem_transform', 'drawerItem_map'], false);
    const all = vi.flatMap(g => g.items);
    assert.deepEqual(all.filter(it => it.pinned).map(it => it.name), ['Chuyển đổi đơn điểm', 'Bản đồ dự án']);
    assert.deepEqual(all.filter(it => it.current).map(it => it.name), ['Cắm mốc']);
    assert.deepEqual(vi.map(g => g.chip), ['Chuyển đổi', 'Thực địa', 'Dữ liệu', 'Tính toán', 'Hệ thống']);
    const en = S.indexModel(raw, [], true);
    assert.equal(en[1].items[1].name, 'Stakeout');
    assert.equal(en[0].name, 'Coordinate conversion');
});

test('tìm không dấu theo tên mới, tên cũ, mô tả và từ khóa; lọc theo nhóm', () => {
    const model = S.indexModel(menuFromHtml(), [], false);
    const names = (q, g) => S.filterModel(model, q, g).flatMap(x => x.items.map(it => it.name));
    assert.deepEqual(names('dwg'), ['Sổ đo & dự án', 'MiniCAD']);
    assert.deepEqual(names('cam moc'), ['Cắm mốc']);
    assert.ok(names('stakeout').includes('Cắm mốc'), 'Tìm được theo tên tiếng Anh');
    assert.ok(names('radar stakeout').includes('Cắm mốc'), 'Tìm được theo tên cũ "(Radar Stakeout)"');
    assert.equal(names('', 'drawerFolder2').length, 6);
    assert.deepEqual(names('dwg', 'drawerFolder4'), ['MiniCAD']);
    assert.deepEqual(names('khong co gi ca'), []);
});

test('menu ☰: đầu gọn (không còn 3 chấm macOS), một ô tìm có nhãn, chỗ cho mục lục; menu cũ ẩn', () => {
    const drawer = html.slice(html.indexOf('<aside id="navTreeDrawer"'), html.indexOf('<!-- Tree Body -->'));
    assert.ok(!drawer.includes('mac-traffic'), 'Bỏ 3 chấm macOS trong menu ☰');
    assert.ok(drawer.includes('class="fi-close"') && drawer.includes('aria-label="Đóng mục lục"'));
    assert.match(drawer, /<label for="txtDrawerSearch"[^>]*>Tìm chức năng<\/label>/);
    assert.ok(drawer.includes('<div id="drawerFeatureIndex" class="fi"></div>'));
    assert.ok(html.includes('<div id="homeFeatureHubList" class="fi"></div>'));
    assert.ok(css.includes('#navTreeDrawer :is(.drawer-tree-body, #drawerStatusInfo) { display: none !important; }'));
    assert.ok(app.includes("document.dispatchEvent(new CustomEvent('vn2000:draweropen'));"), 'Mở menu → vẽ lại mục lục');
    assert.ok(app.includes("document.dispatchEvent(new CustomEvent('vn2000:homechange'));"), 'Đổi chức năng Trang chủ → cập nhật ★');
});

test('kiểu dáng: vùng chạm ≥ 44px, màu nhóm cho cả giao diện Sáng, chế độ Thực địa', () => {
    assert.match(css, /\.fi-row \{[^}]*min-height: 56px/);
    assert.match(css, /\.fi-close \{[^}]*width: 44px; height: 44px/);
    assert.match(css, /\.fi-chip::after \{[^}]*height: 44px/);
    for (const c of ['sky', 'green', 'violet', 'amber', 'slate']) {
        assert.ok(css.includes(`.fi-group[data-fi-color="${c}"]`), c);
        assert.ok(css.includes(`[data-theme="light"] .fi-group[data-fi-color="${c}"]`), 'Sáng ' + c);
    }
    assert.ok(css.includes('body.field-mode .fi-chip[aria-pressed="true"]'));
});
