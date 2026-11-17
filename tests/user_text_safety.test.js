// Tên điểm, ghi chú, tên khối/lớp từ file nhập (CSV, KML…) không được chạy thành mã HTML/JS ở bất kỳ màn hình nào.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }, clear: () => Object.keys(store).forEach(k => delete store[k])
};
const el = () => ({ classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, getAttribute: () => null, style: {}, querySelectorAll: () => [] });
global.document = { documentElement: el(), body: el(), readyState: 'complete', getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: el };
global.window = { addEventListener() {}, location: { search: '' } };
global.navigator = {};

const { appData, AppState, safeUserText, sanitizeUserFields, jsArg } = require('../app.js');
const geo = require('../geodesy.js');
const PAYLOAD = '<img src=x onerror=alert(1)>';

test('điểm nhập từ CSV có tên chứa thẻ HTML được lưu và đọc ra ở dạng vô hại', () => {
    const csv = `Tên điểm,X,Y,Ghi chú\r\n"${PAYLOAD}",1192534.12,602345.67,"<b onmouseover=x>ghi chú</b>"\r\n`;
    const { points } = geo.parseHeaderedTable(csv, { ktt: 105.75, k0: 0.9999 });
    AppState.projectsList = ['DuAnThu.csv'];
    appData.savePoints('DuAnThu.csv', points);
    const raw = localStorage.getItem('vn2k_pts_DuAnThu.csv');
    assert.ok(!raw.includes('<'), 'Không còn ký tự < trong dữ liệu đã lưu');
    const [p] = appData.getPoints('DuAnThu.csv');
    assert.equal(p.name, '‹img src=x onerror=alert(1)›');
    assert.equal(p.note, '‹b onmouseover=x›ghi chú‹/b›');
    assert.equal(p.x, 1192534.12, 'Tọa độ không đổi');
});

test('dữ liệu cũ đã lưu sẵn mã độc cũng được làm sạch khi đọc', () => {
    localStorage.setItem('vn2k_pts_Cu.csv', JSON.stringify([{ name: PAYLOAD, note: 'ok', shapeName: '<svg onload=1>', x: 1, y: 2 }]));
    const [p] = appData.getPoints('Cu.csv');
    assert.ok(!/[<>]/.test(p.name + p.shapeName));
    assert.equal(p.note, 'ok');
});

test('chỉ đổi < > ở các trường chữ của người dùng; trường khác giữ nguyên', () => {
    const o = sanitizeUserFields({ name: 'M1 <A>', svg: '<svg/>', x: 5, arrowText: '<i>', layer: 'L<1>' });
    assert.deepEqual(o, { name: 'M1 ‹A›', svg: '<svg/>', x: 5, arrowText: '‹i›', layer: 'L<1>' });
    assert.equal(safeUserText(7), 7);
});

test('chuỗi đặt trong onclick="…(\'…\')" được thoát cho cả JavaScript và HTML', () => {
    const v = jsArg(`O'Brien "x" <b>\\`);
    assert.equal(v, 'O\\&#39;Brien &quot;x&quot; &lt;b&gt;\\\\');
    // Trình duyệt giải mã thuộc tính trước: kết quả phải là một chuỗi JS hợp lệ, không thoát ra ngoài.
    const decoded = v.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.equal(new Function(`return '${decoded}'`)(), `O'Brien "x" <b>\\`);
});

test('tên dự án hiển thị qua escapeHtml; tên chú thích MiniCAD trong onclick qua jsArg', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(app.includes('<span>📁 ${escapeHtml(AppState.currentProject)}</span>'));
    assert.ok(app.includes('("${escapeHtml(curShort)}" - ${curPts.length} mốc)'));
    assert.ok(!/promptRenameAnnotation\('\$\{[a-z]+\.id\}', '\$\{(?!jsArg)/.test(app), 'Mọi tên chú thích trong onclick phải qua jsArg');
    assert.equal((app.match(/return sanitizeUserFields\(\{ \.\.\.s, vertices, stats \}\);/g) || []).length, 3, 'Khối MiniCAD làm sạch ở cả 3 chỗ nạp');
});

test('tên dự án mới (gõ tay hoặc lấy từ tên file nhập) bỏ ký tự có thể phá HTML/JS', () => {
    const { cleanProjectName } = require('../app.js');
    assert.equal(cleanProjectName(` Dự án <img onerror="x">'1'.csv `), 'Dự án img onerror=x1.csv');
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok((app.match(/cleanProjectName\(/g) || []).length >= 9, 'Mọi chỗ tạo/đổi tên dự án đều qua cleanProjectName');
});

test('khung tên trong xem trước xuất bản vẽ thoát tên dự án, người đo và nhãn khối', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(app.includes('${escapeHtml(rawProj.toUpperCase())}'));
    assert.ok(app.includes('Kỹ sư: ${escapeHtml(opts.meta.surveyor || "")}'));
    assert.ok(app.includes('font-family="sans-serif">${escapeHtml(name)}</text>`;'));
});
