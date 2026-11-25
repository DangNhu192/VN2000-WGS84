// v2.8.60 — Bảng kê MiniCAD là bảng nổi trên bản đồ, không còn là cửa sổ phủ kín chặn thao tác bản đồ.
// Kiểm thử trình duyệt đầy đủ (kéo bản đồ, vẽ khi bảng mở, kéo/đổi cỡ/thu gọn, tấm trượt điện thoại) nằm ở
// scripts Playwright; ở đây giữ các điểm mấu chốt để không bị sửa ngược.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('ui-unified.css');
const app = read('app.js');

test('lớp phủ bảng kê trong suốt, không nhận chạm; chỉ khung bảng nhận chạm', () => {
    const ov = html.match(/<div id="modalCadAreaTable"[^>]*>/)[0];
    assert.match(ov, /class="modal-overlay cad-float-table"/);
    assert.match(ov, /aria-modal="false"/);
    assert.doesNotMatch(ov, /onclick=/, 'chạm ra ngoài bảng là thao tác bản đồ, không được đóng bảng');
    assert.match(css, /#modalCadAreaTable\.cad-float-table\.active \{\s*background: transparent !important;[\s\S]*?pointer-events: none;/);
    assert.match(css, /#modalCadAreaTable\.cad-float-table > \.modal-box \{\s*pointer-events: auto;\s*position: fixed;/);
});

test('thanh tiêu đề kéo được, có nút thu gọn; điện thoại là tấm trượt đáy', () => {
    assert.match(html, /<div class="modal-title cad-ft-head" id="cadAreaTableHead"/);
    assert.match(html, /id="btnCadTableMinimize"[^>]*onclick="appCadTool\.toggleMinimizeAreaTable\(\)"/);
    assert.match(css, /#modalCadAreaTable\.cft-min > \.modal-box > :not\(\.cad-ft-head\) \{ display: none !important; \}/);
    assert.match(css, /@media \(max-width: 768px\) \{\s*html body #modalCadAreaTable\.cad-float-table > \.modal-box \{[^}]*bottom: var\(--cft-bottom, 0px\);[^}]*height: var\(--cft-sheet-h, 46vh\);/);
    assert.match(app, /\['mapCadToolbar', 'cadStatusHud', 'mobileBottomNav'\]/, 'tấm trượt phải đậu trên thanh công cụ MiniCAD');
});

test('kiểm tra "bảng đang mở" theo lớp active (trước dùng style.display nên tự bật bảng)', () => {
    assert.doesNotMatch(app, /getElementById\('modalCadAreaTable'\)\?\.style\.display !== 'none'/);
    assert.match(app, /_isAreaTableOpen\(\) \{[\s\S]{0,200}classList\.contains\('active'\)/);
    // mở Bảng điểm phải đóng hẳn bảng kê (trước chỉ đặt display none, lớp active vẫn giữ bảng hiện)
    assert.doesNotMatch(app, /const areaModal = document\.getElementById\('modalCadAreaTable'\);\s*if \(areaModal\) areaModal\.style\.display = 'none';/);
});

test('bản vẽ đổi → bảng nổi tự làm mới, nhưng kéo/thu phóng bản đồ thì không dựng lại bảng', () => {
    assert.match(app, /renderGeometry\(opts = \{\}\) \{\s*if \(opts\.persist !== false\) \{ this\.persistSession\(\); this\._refreshFloatTableSoon\?\.\(\); \}/);
    assert.match(app, /if \(this\._cftSignature\(\) === this\._cftSig\) return;/);
    const open = app.slice(app.indexOf('    openAreaTableModal(action = null) {'));
    assert.match(open.slice(0, 600), /const wasOpen = document\.getElementById\('modalCadAreaTable'\)\?\.classList\?\.contains\('active'\);/);
    assert.match(open, /if \(!wasOpen\) try \{/, 'làm mới không được ghi đè thông tin khung tên đang sửa');
});

test('phím E bật/tắt bảng; Esc đóng bảng sau khi đã hủy lệnh vẽ / bỏ chọn', () => {
    assert.match(app, /key === 'E'\) \{\s*e\.preventDefault\(\);\s*if \(document\.getElementById\('modalCadAreaTable'\)\?\.classList\?\.contains\('active'\)\) this\.closeAreaTableModal\(\);\s*else this\.openAreaTableModal\(\);/);
    assert.match(app, /this\.deselectCurrent\(\);\s*showToast\('Đã bỏ chọn đối tượng \[Esc\]'\);\s*\} else if \(document\.getElementById\('modalCadAreaTable'\)\?\.classList\?\.contains\('active'\)\) \{\s*this\.closeAreaTableModal\(\);/);
});

test('bấm dòng đỉnh / nút Xem → thu phóng bản đồ, chừa phần bị bảng che', () => {
    assert.match(app, /class="cft-vrow" data-lat="\$\{vLat\}" data-lng="\$\{vLng\}" onclick="appCadTool\.focusTableVertex\(event, this\)"/);
    assert.match(app, /appCadTool\.focusTableShape\(\$\{shapeIdx\}\)/);
    assert.match(app, /fitBounds\(L\.latLngBounds\(ll, ll\), Object\.assign\(\{ maxZoom: zoom, animate: true \}, this\._tableFitPadding\(\)\)\)/);
});
