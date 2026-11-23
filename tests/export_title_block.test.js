// v2.8.54: thông tin khung tên trong tệp xuất do người dùng tự đặt — không cố định các mục.
// Mỗi dòng = tên mục + nội dung; đổi tên, thêm, xóa dòng; dòng "Đầu khung" in đậm ở đầu (vd. tên đơn vị).
// Mặc định gợi ý: Đơn vị đo vẽ, Chủ sử dụng, Địa chỉ, Số tờ/thửa, Mã hồ sơ, Người kiểm tra — đều sửa được.
// Không còn tự in "TRUNG TÂM KHẢO SÁT & ĐO ĐẠC ĐỊA CHÍNH" khi để trống; một danh sách dùng chung cho hai hộp xuất.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const store = {};
global.document = global.document || { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = global.window || { addEventListener() {} };
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const { appTitleRows, titleBlockLines, shareTitleBlock } = require('../app.js');

test('mục khung tên tự đặt: đổi tên, thêm, bớt; chỉ dòng có nội dung được in', () => {
    delete store[appTitleRows.KEY];
    store.vn2k_cad_meta_saved = JSON.stringify({ organization: 'Cty Cũ', checker: 'KS. Cũ' });
    const first = appTitleRows.load();
    assert.deepEqual(first.map(r => r.label), ['Đơn vị đo vẽ', 'Chủ sử dụng', 'Địa chỉ', 'Số tờ/thửa', 'Mã hồ sơ', 'Người kiểm tra']);
    assert.equal(first[0].value, 'Cty Cũ', 'lần đầu lấy lại nội dung đã nhập ở ô cố định cũ');
    assert.equal(first[5].value, 'KS. Cũ');
    appTitleRows.save([
        { label: 'Cơ quan', value: 'Văn phòng Đăng ký đất đai Đồng Tháp', head: true },
        { label: 'Người sử dụng đất', value: 'Bà Lê Thị B' },
        { label: 'Thửa / Tờ', value: '125 / 18' },
        { label: 'Xác nhận UBND xã', value: '' },
        { label: 'Số hợp đồng', value: 'HĐ-07/2026' }
    ]);
    const meta = { projectName: 'Khu A', titleRows: appTitleRows.forMeta() };
    assert.equal(meta.titleRows.length, 4, 'dòng trống không in');
    const t = titleBlockLines(meta);
    assert.equal(t.org, 'VĂN PHÒNG ĐĂNG KÝ ĐẤT ĐAI ĐỒNG THÁP');
    assert.equal(t.proj, 'DỰ ÁN: KHU A');
    assert.deepEqual(t.items, ['Người sử dụng đất: Bà Lê Thị B', 'Thửa / Tờ: 125 / 18', 'Số hợp đồng: HĐ-07/2026']);
    assert.equal(t.infoA, 'Người sử dụng đất: Bà Lê Thị B  ·  Thửa / Tờ: 125 / 18');
    assert.equal(t.infoB, 'Số hợp đồng: HĐ-07/2026');
});

test('để trống đơn vị thì không in tên đơn vị mặc định', () => {
    const t = titleBlockLines({ projectName: 'Khu A', titleRows: [] });
    assert.equal(t.org, '');
    assert.equal(t.info, '');
    assert.ok(!/\|\| 'TRUNG TÂM (KHẢO SÁT|QUẢN LÝ)/.test(app) && !app.includes("|| 'TRUNG TAM KHAO SAT"));
    assert.ok(!app.includes('"Trung tâm Trắc địa Bản đồ"'));
});

test('tên bản vẽ / người đo / ghi chú sửa ở hộp này thì hộp kia nhận', () => {
    store.vn2k_cad_meta_saved = JSON.stringify({ paper: 'A3' });
    shareTitleBlock({ drawingTitle: 'TRÍCH ĐO', surveyor: 'KS. C', notes: 'RTK' }, 'data');
    const cad = JSON.parse(store.vn2k_cad_meta_saved);
    assert.equal(cad.drawingName, 'TRÍCH ĐO');
    assert.equal(cad.surveyor, 'KS. C');
    assert.equal(cad.paper, 'A3');
});

test('hai hộp xuất dùng chung khung nhập dòng; mọi bộ xuất in theo các dòng', () => {
    assert.ok(html.includes('id="exportTitleRowsBox"') && html.includes('id="cadTitleRowsBox"'));
    ['txtExportOrg', 'txtExportOwner', 'cadExportOrganization', 'cadExportChecker'].forEach(id => assert.ok(!html.includes(`id="${id}"`), `bỏ ô cố định ${id}`));
    assert.ok(app.includes("appTitleRows.render('exportTitleRowsBox')") && app.includes("appTitleRows.render('cadTitleRowsBox')"));
    assert.equal((app.match(/titleRows: appTitleRows\.forMeta\(\)/g) || []).length, 2);
    assert.ok((app.match(/tbl\.infoA/g) || []).length >= 2, 'bộ vẽ khổ giấy dùng chung (PDF / PNG / SVG / ảnh) + DXF');
    assert.ok(app.includes('titleRows: o.meta.titleRows'), 'Xuất dữ liệu đưa các dòng khung tên vào bộ vẽ chung');
});
