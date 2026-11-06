// Địa chỉ sau sáp nhập (01/07/2025) trên dấu camera: tra ngoại tuyến 34 tỉnh / 3.321 xã-phường.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const A = require('../vn-admin-2025.js');

const root = path.join(__dirname, '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data', 'vn_admin_2025.js'), 'utf8'), sandbox);
const data = sandbox.window.VN_ADMIN_2025;
const look = A.createLookup(data);

test('dữ liệu: đủ 34 tỉnh và 3.321 xã/phường/đặc khu, tên chuẩn NFC', () => {
    assert.equal(data.provinces.length, 34);
    assert.equal(data.wards.length, 3321);
    assert.ok(data.wards.every(w => w[0] === w[0].normalize('NFC')));
});

test('tra đúng xã/phường mới tại các địa điểm đã biết; ngoài biển trả về rỗng', () => {
    const cases = [
        [21.0287, 105.8524, 'Phường Hoàn Kiếm, Thành phố Hà Nội'],
        [10.7725, 106.6980, 'Phường Bến Thành, Thành phố Hồ Chí Minh'],
        [11.9429, 108.4377, 'Phường Xuân Hương - Đà Lạt, Tỉnh Lâm Đồng'],
        [10.2270, 103.9660, 'Đặc khu Phú Quốc, Tỉnh An Giang'],
        [10.4600, 105.6330, 'Phường Cao Lãnh, Tỉnh Đồng Tháp']
    ];
    for (const [lat, lng, want] of cases) assert.equal(A.formatAddress(look(lat, lng)), want);
    assert.equal(look(10.0, 108.0), null);
    assert.equal(look(NaN, 1), null);
});

test('dấu camera: dòng ĐỊA CHỈ dùng chung cho ảnh, video và khung xem; khung tự giãn; phông hiển thị đúng dấu', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(app.includes('VnAdmin2025.cachedAddress(parseFloat(latStr), parseFloat(lngStr))'));
    assert.ok(app.includes('if (address) lines.push(`• ĐỊA CHỈ: ${address}`);'));
    assert.ok(app.includes('Math.max(Math.round(520 * scale), Math.ceil(widest + padding * 2))'));
    assert.ok(app.includes('const STAMP_BODY_FONT'));
    assert.ok(html.includes('src="vn-admin-2025.js'));
    assert.ok(!html.includes('src="data/vn_admin_2025.js'), 'Dữ liệu 4 MB chỉ tải khi cần, không nạp lúc mở ứng dụng');
    assert.match(sw, /const DATA_CACHE = 'vn2000-data-admin-2025-07-01';/);
    assert.ok(sw.includes('key !== CACHE_NAME && key !== DATA_CACHE'), 'Nâng phiên bản không xóa dữ liệu địa giới');
});
