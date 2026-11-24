// v2.8.59 — Menu xổ xuống (<select>) và các chi tiết giao diện liên quan.
// Kiểm tra tĩnh trên CSS/HTML/JS: lỗi cũ là danh sách xổ chữ trắng trên nền trắng ở giao diện tối,
// iPhone tự phóng to khi chạm ô chọn chữ 15 px, và các ô chọn quá thấp khó bấm.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('ui-unified.css');
const html = read('index.html');
const app = read('app.js');

test('danh sách xổ có màu nền + chữ riêng cho giao diện tối, sáng và chế độ thực địa', () => {
    assert.match(css, /html:not\(\[data-theme="light"\]\) select \{ color-scheme: dark; \}/);
    assert.match(css, /html\[data-theme="light"\] select \{ color-scheme: light; \}/);
    assert.match(css, /html:not\(\[data-theme="light"\]\) select optgroup \{ background-color: #24211e; color: #f2eee7; \}/);
    assert.match(css, /html\[data-theme="light"\] select optgroup \{ background-color: #ffffff; color: #1c1a18; \}/);
    assert.match(css, /body\.field-mode select optgroup \{ background-color: #000000; color: #ffd84a; \}/);
});

test('màn cảm ứng: ô chọn tối thiểu 16 px và quy tắc đủ mạnh để thắng các quy tắc 15px !important', () => {
    const m = css.match(/@media \(pointer: coarse\) \{\s*([^{]+)\{ font-size: max\(16px, 1em\) !important; \}/);
    assert.ok(m, 'thiếu quy tắc 16px cho select trên màn cảm ứng');
    assert.match(m[1], /select:not\(\[multiple\]\):not\(#[\w-]+\):not\(#[\w-]+\)/, 'cần độ ưu tiên có id để thắng :is(.screen-view, .modal-overlay) select.app-select');
});

test('các ô chọn của thanh vẽ đỉnh và hộp Nối điểm cao ≥ 32 px', () => {
    for (const id of ['cadDrawVertexStyle', 'cadDrawVertexSize', 'cadConnectSourceSelect', 'cadConnectModeSelect', 'cadConnectOrderSelect', 'cadConnectLayerSelect']) {
        const tag = html.match(new RegExp(`<select id="${id}"[^>]*>`, 's'));
        assert.ok(tag, id);
        const h = +((tag[0].match(/height:\s*(\d+)px/) || [])[1] || 0);
        assert.ok(h >= 32, `${id} cao ${h}px`);
    }
});

test('ô chọn tỉnh của lớp quy hoạch dùng lớp app-select theo giao diện, có nhãn', () => {
    const tags = app.match(/<select id="mlGulandProvSelect"[^>]*>/g) || [];
    assert.ok(tags.length >= 1);
    for (const t of tags) {
        assert.match(t, /class="app-select"/);
        assert.match(t, /aria-label="/);
        assert.doesNotMatch(t, /background:\s*#|color:\s*#/);
    }
});

test('hộp Quy hoạch PDF nạp sẵn danh sách KTT khi mở (không để ô chọn trống)', () => {
    const open = app.slice(app.indexOf('const appPlanOverlay'));
    const from = open.indexOf('async open()');
    const body = open.slice(from, open.indexOf('\n    close()', from));
    assert.match(body, /fillKttSelect\(kttSel\)/);
});

test('chip KTT trên thanh tiêu đề tách múi chiếu, ẩn múi khi chip hẹp thay vì cắt số KTT', () => {
    assert.match(app, /<span class="hk-cm">\$\{escapeHtml\(dmsStr\)\}<\/span><span class="hk-zone">/);
    assert.match(css, /\.header-ktt-chip \{ container-type: inline-size;/);
    assert.match(css, /@container \(max-width: \d+px\) \{ header\.app-header \.header-ktt-chip \.hk-zone \{ display: none; \} \}/);
});

test('logo nhỏ dùng icon-128.webp (icon.png 244 KB chỉ còn cho manifest)', () => {
    assert.ok(fs.existsSync(path.join(root, 'icon-128.webp')));
    assert.ok(fs.statSync(path.join(root, 'icon-128.webp')).size < 20000);
    assert.doesNotMatch(html, /<img src="icon\.png"/);
    assert.doesNotMatch(app, /<img src="icon\.png"/);
    assert.match(read('sw.js'), /'\.\/icon-128\.webp'/);
});
