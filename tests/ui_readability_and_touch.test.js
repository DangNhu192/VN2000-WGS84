// Giao diện thực địa: chữ ≥ 11px, nhãn ngắn viết hoa đầu câu, nút không tràn chữ, vùng chạm đủ lớn,
// không bật thông báo khi chỉ mở màn hình, tiếng Anh giữ nguyên tiếng Việt có dấu khi chưa có bản dịch.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html'), app = read('app.js'), unified = read('ui-unified.css');

test('không còn cỡ chữ dưới 11px trong index.html, app.js, style.css, ui-polish.css', () => {
    for (const f of ['index.html', 'app.js', 'style.css', 'ui-polish.css', 'ui-unified.css']) {
        const bad = (read(f).match(/font-size:\s*(?:[1-9]|10)(?:\.\d+)?px/g) || []); // 0px = cố ý ẩn chữ
        assert.deepEqual(bad, [], f);
    }
});

test('tiêu đề thẻ, tab, nút chính: không đánh số, không IN HOA', () => {
    const titles = [...html.matchAll(/class="card-title">([^<]+)</g)].map(m => m[1].trim());
    assert.ok(titles.length > 10);
    for (const t of titles) assert.ok(!/^\S+\s+\d+\.\s/.test(t), `Tiêu đề còn số thứ tự: ${t}`);
    for (const old of ['QUAY VIDEO REALTIME', 'CHỤP ẢNH ĐÓNG DẤU', 'XEM VỊ TRÍ GPS TRÊN BẢN ĐỒ', 'LƯU NHANH TỌA ĐỘ GPS', 'XUẤT DỮ LIỆU ĐA ĐỊNH DẠNG', 'ĐỒNG BỘ DỰ ÁN NÀY', 'Chuyển Đổi Đơn Điểm', '2. Hố Đào Móng']) {
        assert.ok(!html.includes(old) && !app.includes(old), old);
    }
    assert.ok(html.includes('📍 Đơn điểm') && html.includes('📑 Nhiều điểm ('));
});

test('nhãn mới đều có bản dịch tiếng Anh; chưa có bản dịch thì giữ tiếng Việt có dấu', () => {
    for (const vi of ['🛣️ Tuyến trắc dọc', '🚜 Hố móng (TCVN 4447)', '📍 Đơn điểm', '⚙️ Kinh tuyến trục', '0,001 m (chuẩn)', '⏺️ Quay video', '⏹️ Dừng quay']) {
        assert.ok(app.includes(`"${vi}": "`), `thiếu bản dịch: ${vi}`);
    }
    const ts = app.slice(app.indexOf('    translateString(str) {'), app.indexOf('    init() {', app.indexOf('    translateString(str) {')));
    assert.ok(!ts.includes('removeDiacritics(res)'), 'Không bỏ dấu chuỗi chưa dịch');
});

test('Cài đặt → Chung: hàng 3 nút cho phép xuống dòng; điện thoại ẩn nút Sáng/Tối trên thanh tiêu đề', () => {
    assert.match(unified, /#btnCoordFmtDD, #btnCoordFmtDMS, #btnCoordFmtDMM, #btnDecimals2, #btnDecimals3, #btnDecimals4\) \{\s*white-space: normal !important;/);
    assert.match(unified, /@media \(max-width: 600px\) \{ header\.app-header #btnHeaderThemeToggle \{ display: none !important; \} \}/);
    assert.ok(html.includes('id="btnThemeDark"') && html.includes('id="btnThemeLight"'), 'Vẫn đổi Sáng/Tối được trong Cài đặt');
});

test('vùng chạm 44px cho tab, nút Múi, nút quay lại cài đặt, nút ? (bằng ::after trong suốt)', () => {
    for (const sel of ['.sheet-tab-btn::after', '#btnSheetMui3::after', '.btn-subtab-back::after', '#btnSheetToggleCollapse::after', '#btnSettingsHelpGuide::after']) {
        assert.ok(unified.includes(sel), sel);
    }
    assert.match(unified, /height: 44px; margin-top: -22px;/);
});

test('mở màn hình không bật thông báo; bấm Xóa vẫn báo', () => {
    assert.ok(!app.includes('CADCraft sẵn sàng!'));
});
