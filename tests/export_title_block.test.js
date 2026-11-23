// v2.8.54: thông tin khung tên (đơn vị, chủ sử dụng, địa chỉ, số tờ/thửa, mã bản vẽ, người kiểm tra, ghi chú)
// do người dùng nhập được in vào mọi tệp xuất; không còn tự chèn "TRUNG TÂM KHẢO SÁT & ĐO ĐẠC ĐỊA CHÍNH" hay
// "Trung tâm Trắc địa Bản đồ" khi để trống; sửa ở hộp Xuất dữ liệu hay Studio MiniCAD thì hộp kia cũng nhận.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

const store = {};
global.document = global.document || { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = global.window || { addEventListener() {} };
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
const { shareTitleBlock, titleBlockLines } = require('../app.js');

test('sửa ở hộp này thì hộp kia nhận (đơn vị, chủ SD, địa chỉ, thửa, mã, người đo/kiểm tra)', () => {
    store.vn2k_cad_meta_saved = JSON.stringify({ paper: 'A3', organization: 'CŨ' });
    shareTitleBlock({ org: 'Công ty Đo đạc ABC', owner: 'Ông A', address: 'Xã B', parcelNo: 'Thửa 5, tờ 12', drawingCode: 'HS-9', surveyor: 'KS. C', checker: 'KS. D', drawingTitle: 'TRÍCH ĐO' }, 'data');
    const cad = JSON.parse(store.vn2k_cad_meta_saved);
    assert.equal(cad.organization, 'Công ty Đo đạc ABC');
    assert.equal(cad.drawingName, 'TRÍCH ĐO');
    assert.equal(cad.paper, 'A3', 'giữ các cài đặt riêng của MiniCAD');
    shareTitleBlock({ organization: '', checker: 'KS. E' }, 'cad');
    const data = JSON.parse(store.vn2k_export_title_block);
    assert.equal(data.org, '', 'xóa trắng đơn vị cũng được chuyển sang');
    assert.equal(data.checker, 'KS. E');
});

test('dòng khung tên chỉ in mục có nhập; đơn vị trống thì không in tên mặc định', () => {
    const a = titleBlockLines({ projectName: 'Khu A', owner: 'Ông A', address: 'Xã B', parcelNo: '5/12', drawingCode: 'HS-9', organization: 'Cty ABC' });
    assert.equal(a.org, 'CTY ABC');
    assert.ok(a.proj.includes('DỰ ÁN: KHU A') && a.proj.includes('Chủ sử dụng: Ông A') && a.proj.includes('Địa chỉ: Xã B'));
    assert.ok(a.parcel.includes('Số tờ/thửa: 5/12') && a.parcel.includes('Mã BV: HS-9'));
    const b = titleBlockLines({ projectName: 'Khu A' });
    assert.equal(b.org, '');
    assert.equal(b.proj, 'DỰ ÁN: KHU A');
});

test('không còn tên đơn vị gán cứng trong bộ xuất; các bộ xuất dùng thông tin khung tên', () => {
    assert.ok(!/\|\| 'TRUNG TÂM (KHẢO SÁT|QUẢN LÝ)/.test(app) && !app.includes("|| 'TRUNG TAM KHAO SAT"));
    assert.ok(!app.includes('orgInput.value = "Trung tâm Trắc địa Bản đồ"'));
    assert.equal((app.match(/titleBlockLines\(meta\)/g) || []).length >= 4, true, 'PDF, SVG, ảnh, DXF của MiniCAD');
    assert.ok(app.includes("shareTitleBlock(data, 'data')") && app.includes("shareTitleBlock(data, 'cad')"));
    assert.ok(app.includes('${extraRows}') && app.includes("tbM.checker ? esc(tbM.checker) : 'Chủ nhiệm dự án'"), 'báo cáo PDF của Xuất dữ liệu');
    assert.ok(app.includes("'CHU SU DUNG: ' + ascii(tbM.owner)"), 'DXF của Xuất dữ liệu');
});
