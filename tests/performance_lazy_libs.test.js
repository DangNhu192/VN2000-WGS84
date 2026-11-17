// Hiệu năng mở app: không nạp script trong <head>; xlsx, jspdf, ranh giới 34 tỉnh, xã Đồng Tháp chỉ nạp khi cần
// (service worker vẫn lưu sẵn để chạy ngoại tuyến); ảnh dùng WebP; một số phiên bản duy nhất.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html'), app = read('app.js'), sw = read('sw.js');

test('<head> không còn thẻ script chặn hiển thị; thư viện lớn không nạp lúc mở trang', () => {
    const head = html.slice(0, html.indexOf('<body'));
    assert.ok(!/<script\s+src=/.test(head), 'Không có <script src> trong <head>');
    for (const lib of ['xlsx.full.min.js', 'jspdf.umd.min.js', 'vietnam_34_tinh.js', 'dong_thap_communes.js']) {
        assert.ok(!html.includes(`<script src="${lib}"`), `${lib} không nạp sẵn`);
        assert.ok(sw.includes(`'./${lib}'`), `${lib} vẫn được service worker lưu sẵn (chạy ngoại tuyến)`);
    }
    const order = ['leaflet.js', 'geodesy.js', 'app.js'].map(f => html.indexOf(`<script src="${f}`));
    assert.ok(order.every(i => i > 0) && order[0] < order[1] && order[1] < order[2], 'leaflet → geodesy → app theo đúng thứ tự');
});

function loadHelpers(doc, win) {
    const i = app.indexOf('const LAZY_LIBS = {'), j = app.indexOf('// ================= HAPTIC');
    return new Function('document', 'window', 'showToast', app.slice(i, j) + '\nreturn { loadLib, needLib, LAZY_LIBS };')(doc, win, () => {});
}

test('needLib: chưa có → nạp rồi chạy lại; nạp lỗi → chạy nhánh dự phòng, không lặp vô hạn', async () => {
    const added = [];
    const win = {};
    const doc = { createElement: () => ({}), head: { appendChild: (s) => added.push(s) } };
    const { needLib } = loadHelpers(doc, win);
    let reruns = 0;
    assert.equal(needLib('jspdf', () => reruns++), true, 'Lần đầu: dừng để nạp');
    assert.equal(added.length, 1);
    win.jspdf = { jsPDF: function () {} }; added[0].onload();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(reruns, 1, 'Nạp xong thì gọi lại hàm');
    assert.equal(needLib('jspdf', () => reruns++), false, 'Đã có thư viện: chạy luôn');

    assert.equal(needLib('dongthap', () => reruns++), true);
    added[1].onerror();
    await new Promise(r => setTimeout(r, 0));
    assert.equal(reruns, 2, 'Lỗi vẫn gọi lại để chạy nhánh dự phòng');
    assert.equal(needLib('dongthap', () => reruns++), false, 'Không thử lại ngay (tránh lặp vô hạn khi mất mạng)');
});

test('mọi chỗ dùng Excel / PDF / ranh giới đều chờ thư viện', () => {
    for (const s of ["if (needLib('xlsx', () => this.exportExcelFile())) return;",
        "if (isExcel && needLib('xlsx', () => this.handleFileImport(event))) return;",
        "needLib('xlsx', () => this.importExcel(event))",
        "if (format === 'xlsx' && needLib('xlsx', () => this.exportAreaExcel(format))) return;",
        "if (needLib('jspdf', () => this.exportPdf())) return;",
        "loadLib('prov34').then(", "loadLib('dongthap').then("]) {
        assert.ok(app.includes(s), s);
    }
});

test('ảnh: logo và ảnh hướng dẫn dùng WebP nhẹ; một số phiên bản cho cả dự án', () => {
    assert.ok(html.includes('<img src="VN2k-WGS84.webp"') && sw.includes("'./VN2k-WGS84.webp'"));
    assert.ok(fs.statSync(path.join(ROOT, 'VN2k-WGS84.webp')).size < 100 * 1024);
    const ver = sw.match(/CACHE_NAME = 'vn2000-pro-v([0-9.]+)'/)[1];
    assert.equal(JSON.parse(read('package.json')).version, ver);
    assert.equal(JSON.parse(read('feature_list.json')).version, ver);
    assert.ok(!/v2\.7\.0|v2\.8\.2\b/.test(html), 'Màn Giới thiệu/Cài đặt hiện đúng phiên bản');
    assert.ok(!fs.existsSync(path.join(ROOT, 'modern-react')), 'Bỏ bản React thử nghiệm không dùng');
});
