// Bảng KTT 63 tỉnh phải khớp Thông tư 973/2001/TT-TCĐC (đối chiếu các hệ EPSG "VN-2000 / TM-3" theo tỉnh, vd. EPSG:9218 108-30).
// Mọi file JS/CSS của ứng dụng phải mang cùng số phiên bản với bộ nhớ đệm, và geodesy.js không được cache "immutable".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const g = require('../geodesy.js');

const OFFICIAL_973 = [
    ["TP. Hồ Chí Minh", "105°45'"],
    ["TP. Hà Nội", "105°00'"],
    ["TP. Đà Nẵng", "107°45'"],
    ["TP. Cần Thơ", "105°00'"],
    ["TP. Hải Phòng", "105°45'"],
    ["An Giang", "104°45'"],
    ["Bà Rịa – Vũng Tàu", "107°45'"],
    ["Bắc Cạn", "106°30'"],
    ["Bắc Giang", "107°00'"],
    ["Bạc Liêu", "105°00'"],
    ["Bắc Ninh", "105°30'"],
    ["Bến Tre", "105°45'"],
    ["Bình Định", "108°15'"],
    ["Bình Dương", "105°45'"],
    ["Bình Phước", "106°15'"],
    ["Bình Thuận", "108°30'"],
    ["Cà Mau", "104°30'"],
    ["Cao Bằng", "105°45'"],
    ["Đắc Nông", "108°30'"],
    ["Đắk Lắk", "108°30'"],
    ["Điện Biên", "103°00'"],
    ["Đồng Nai", "107°45'"],
    ["Đồng Tháp", "105°00'"],
    ["Gia Lai", "108°30'"],
    ["Hà Giang", "105°30'"],
    ["Hà Nam", "105°00'"],
    ["Hà Tĩnh", "105°30'"],
    ["Hải Dương", "105°30'"],
    ["Hậu Giang", "105°00'"],
    ["Hoà Bình", "106°00'"],
    ["Huế", "107°00'"],
    ["Hưng Yên", "105°30'"],
    ["Khánh Hoà", "108°15'"],
    ["Kiên Giang", "104°30'"],
    ["Kon Tum", "107°30'"],
    ["Lai Châu", "103°00'"],
    ["Lâm Đồng", "107°45'"],
    ["Lạng Sơn", "107°15'"],
    ["Lào Cai", "104°45'"],
    ["Long An", "105°45'"],
    ["Nam Định", "105°30'"],
    ["Nghệ An", "104°45'"],
    ["Ninh Bình", "105°00'"],
    ["Ninh Thuận", "108°15'"],
    ["Phú Thọ", "104°45'"],
    ["Phú Yên", "108°30'"],
    ["Quảng Bình", "106°00'"],
    ["Quảng Nam", "107°45'"],
    ["Quảng Ngãi", "108°00'"],
    ["Quảng Ninh", "107°45'"],
    ["Quảng Trị", "106°15'"],
    ["Sóc Trăng", "105°30'"],
    ["Sơn La", "104°00'"],
    ["Tây Ninh", "105°30'"],
    ["Thái Bình", "105°30'"],
    ["Thái Nguyên", "106°30'"],
    ["Thanh Hoá", "105°00'"],
    ["Tiền Giang", "105°45'"],
    ["Trà Vinh", "105°30'"],
    ["Tuyên Quang", "106°00'"],
    ["Vĩnh Long", "105°30'"],
    ["Vĩnh Phúc", "105°00'"],
    ["Yên Bái", "104°45'"]
];

test('KTT 63 tỉnh (trước 01/07/2025) khớp Thông tư 973/2001 — gồm Bình Thuận 108°30\'', () => {
    const old = g.VN_PROVINCES.slice(0, 63);
    assert.equal(old.length, OFFICIAL_973.length);
    for (const [name, ktt] of OFFICIAL_973) {
        const p = old.find(x => x.name === name);
        assert.ok(p, name);
        const got = `${p.deg}°${String(p.min).padStart(2, '0')}'`;
        assert.equal(got, ktt, name);
        assert.ok(Math.abs(p.ktt - (p.deg + p.min / 60)) < 1e-9, `${name}: ktt thập phân khớp độ-phút`);
    }
});

test('người đang lưu Bình Thuận với KTT cũ 107°45\' được hỏi một lần, không tự đổi số liệu', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    assert.ok(app.includes("AppState.kttFixBinhThuan = (AppState.provinceName === 'Bình Thuận' && AppState.kttDeg === 107 && AppState.kttMin === 45);"));
    assert.ok(app.includes('appSettings.checkKttCorrections();'));
    assert.ok(app.includes("appModal.setKttFromPreset(108, 30, 'Bình Thuận');"));
});

test('mọi file JS/CSS của ứng dụng trong index.html cùng ?v= với CACHE_NAME của service worker', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    const ver = sw.match(/CACHE_NAME = 'vn2000-pro-v([0-9.]+)'/)[1];
    const tagged = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))\?v=([0-9.]+)"/g)];
    assert.ok(tagged.length >= 10);
    for (const [, file, v] of tagged) assert.equal(v, ver, file);
    for (const own of ['geodesy.js', 'app.js', 'src/core/cad_geometry.js', 'src/core/gis_io.js', 'style.css', 'ui-unified.css']) {
        assert.ok(tagged.some(([, f]) => f === own), `${own} phải có ?v=`);
    }
});

test('geodesy.js không bị cache "immutable" (file thay đổi theo phiên bản)', () => {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const h = v.headers.find(x => x.source === '/geodesy.js');
    const cc = h ? h.headers.find(x => x.key === 'Cache-Control').value : '';
    assert.ok(!/immutable/.test(cc), cc);
});
