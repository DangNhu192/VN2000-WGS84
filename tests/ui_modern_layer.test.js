// WP-M: lớp giao diện hiện đại hóa (ui-modern.css) — chống cắt chữ / tràn nút, vùng chạm, nạp đúng thứ tự.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const css = read('ui-modern.css');
const html = read('index.html');
const sw = read('sw.js');
const appJs = read('app.js');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('ui-modern.css is loaded last, after ui-polish.css, and cached by the service worker', () => {
    const polishAt = html.indexOf('ui-polish.css?v=');
    const modernAt = html.indexOf('ui-modern.css?v=');
    assert.ok(polishAt > 0 && modernAt > polishAt, 'ui-modern.css nạp sau ui-polish.css để thắng các luật cũ');
    assert.ok(sw.includes("'./ui-modern.css'"), 'sw.js lưu ui-modern.css cho chế độ ngoại tuyến');
    const htmlVer = (html.match(/ui-modern\.css\?v=([\d.]+)/) || [])[1];
    const swVer = (sw.match(/CACHE_NAME = 'vn2000-pro-v([\d.]+)'/) || [])[1];
    assert.strictEqual(htmlVer, swVer, 'phiên bản tài nguyên khớp CACHE_NAME');
});

test('ui-modern.css uses tokens only: no raw vh units', () => {
    assert.ok(!/[0-9]+vh\b/.test(stripComments(css)), 'không dùng đơn vị vh thô (đi qua --app-vh / --ui-avail-h)');
});

test('header KTT chip is split into parts so CSS drops extras, never the KTT value', () => {
    assert.ok(/headChip\.innerHTML = `<span class="hk-ico"[^`]*<span class="hk-ktt">/.test(appJs), 'chip KTT gồm các phần hk-ico / hk-ktt / hk-zone / hk-prov');
    assert.ok(/hk-zone/.test(appJs) && /hk-prov/.test(appJs), 'có phần múi và tên tỉnh');
    assert.ok(/container-name:\s*kttchip/.test(css), 'chip là container để ẩn dần phần phụ theo bề rộng thật');
    for (const part of ['hk-prov', 'hk-ico', 'hk-zone']) {
        assert.ok(new RegExp(`@container kttchip \\(max-width: \\d+px\\) \\{ \\.header-ktt-chip \\.${part} \\{ display: none; \\} \\}`).test(css), `ẩn ${part} khi chip hẹp`);
    }
    assert.ok(!/@container[^{]*\{[^}]*\.hk-ktt\s*\{\s*display:\s*none/.test(css), 'không bao giờ ẩn giá trị KTT');
    assert.ok(/\.header-ktt-chip[\s\S]*?text-overflow: clip/.test(css), 'chip không cắt chữ bằng dấu …');
    assert.ok(/String\(v\)\.replace\(\/\[&<>"\]\/g/.test(appJs), 'thoát ký tự HTML trong tên tỉnh trước khi chèn innerHTML');
});

test('function names in the ☰ drawer wrap instead of being truncated with an ellipsis', () => {
    const rule = (css.match(/#navTreeDrawer \.drawer-leaf-title \{[^}]*\}/) || [''])[0];
    assert.ok(/white-space: normal !important/.test(rule), 'tên chức năng xuống dòng');
    assert.ok(/text-overflow: clip !important/.test(rule), 'không còn dấu …');
    assert.ok(/#navTreeDrawer \.mac-traffic-lights \{ display: none !important; \}/.test(css), 'bỏ 3 chấm trang trí không có chức năng');
    assert.ok(html.includes('placeholder="Tìm chức năng…"'), 'gợi ý ô tìm kiếm ngắn, không bị cắt');
});

test('transform sub-tabs form an even 2×2 grid and never split "(0 mốc)" letter by letter', () => {
    assert.ok(/grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\) 40px/.test(css), 'lưới 2 cột đều + cột nút ?');
    const btn = (css.match(/#screen-transform \.transform-subtabs \.btn-subtab \{[^}]*\}/) || [''])[0];
    assert.ok(/display: block !important/.test(btn), 'nút tab là block (flex tách số đếm thành mục riêng)');
    assert.ok(/white-space: normal !important/.test(btn), 'nhãn tab xuống dòng');
});

test('card titles wrap, including the stakeout / data screens that forced one line', () => {
    assert.ok(/:is\(#screen-stakeout, #screen-datamgmt\) \.app-card \.card-header \.card-title \{[^}]*white-space: normal !important/.test(css));
    assert.ok(/\.app-card \.card-header \.card-title \{[^}]*text-overflow: clip !important/.test(css));
});

test('small controls are raised to usable touch sizes', () => {
    const size = (sel) => {
        const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&') + '[^{]*\\{([^}]*)\\}'));
        return m ? parseInt((m[1].match(/(?:^|[\s;])width: (\d+)px/) || [])[1], 10) : 0;
    };
    assert.ok(size('nav#mobileBottomNav.mobile-bottom-nav .dock-collapse-btn') >= 28, 'nút thu dock ≥ 28 px (vùng chạm 44 px qua ::after)');
    assert.ok(size('#btnResizerQuickToggle') >= 34, 'nút thu/giãn bản đồ ≥ 34 px');
    assert.ok(size('#btnSettingsHelpGuide') >= 36, 'nút ? trong Cài đặt ≥ 36 px');
    assert.ok(size('#navTreeDrawer .btn-drawer-clear') >= 30, 'nút xóa tìm kiếm ≥ 30 px');
    assert.ok(/\.btn-subtab-back \{[^}]*min-height: 36px/.test(css), 'nút quay lại trong Cài đặt ≥ 36 px');
});

test('MiniCAD header row keeps Close on screen: fixed-size buttons, stats pill flexes and wraps', () => {
    assert.ok(/#mapCadToolbarHeader > div:last-child > \* \{ flex: 0 0 auto !important; \}/.test(css), 'nút không bị giãn/ép');
    assert.ok(/#mapCadToolbarHeader > div:last-child > #cadStatsPill \{[^}]*flex: 1 1 0% !important;[^}]*white-space: normal !important/.test(css), 'ô số liệu lấp chỗ trống và xuống dòng');
});

test('accessibility basics from the ui-ux-pro-max checklist', () => {
    assert.ok(/:focus-visible \{\s*outline: 2px solid var\(--m-focus\)/.test(css), 'viền focus nhìn thấy được');
    assert.ok(/@media \(prefers-reduced-motion: reduce\)/.test(css), 'tôn trọng giảm chuyển động');
    assert.ok(/touch-action: manipulation/.test(css), 'bỏ trễ chạm 300 ms');
});

test('wide screens show the home screen in two columns so the main tiles are above the fold', () => {
    assert.ok(/@media \(min-width: 1200px\) \{\s*#screen-menu\.screen-view\.active \{\s*display: grid !important;/.test(css));
    assert.ok(/#screen-menu > #fieldWorkspace \{ grid-column: 1;/.test(css) && /#screen-menu > #dashboardModernHub \{ grid-column: 2;/.test(css));
});
