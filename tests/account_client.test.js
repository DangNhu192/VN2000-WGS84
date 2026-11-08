// WP-O: phía ứng dụng của đăng nhập Google / trang quản trị.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const acc = read('account.js');
const cfg = read('account-config.js');
const sw = read('sw.js');
const appJs = read('app.js');

test('account scripts load after app.js, are cached offline, and Google sign-in is never cached', () => {
    const appAt = html.indexOf('app.js?v=');
    assert.ok(html.indexOf('account-config.js?v=') > appAt && html.indexOf('account.js?v=') > html.indexOf('account-config.js?v='));
    assert.ok(sw.includes("'./account.js'") && sw.includes("'./account-config.js'"));
    assert.ok(/accounts\\\.google\\\.com/.test(sw), 'service worker bỏ qua accounts.google.com');
    assert.ok(/script\\\.google\(usercontent\)\?\\\.com/.test(sw), 'service worker bỏ qua máy chủ Apps Script');
});

test('the shipped config is empty so a fresh copy works offline and shows "not configured"', () => {
    assert.ok(/apiUrl:\s*''/.test(cfg) && /clientId:\s*''/.test(cfg));
    assert.ok(acc.includes('isConfigured()') && acc.includes('Đăng nhập chưa được bật cho bản ứng dụng này.'));
});

test('UI isolation: account lives in its own modal, admin in its own screen', () => {
    assert.ok(html.includes('id="modalAccount" class="modal-overlay"'));
    assert.ok(html.includes('<section id="screen-admin" class="screen-view">'));
    assert.ok(appJs.includes("screenName === 'admin'") && appJs.includes("document.getElementById('screen-admin')"));
    assert.ok(!/openProjectMap|openCadMap|mapProjectBar/.test(acc), 'module tài khoản không gọi giao diện Bản đồ / MiniCAD');
    assert.ok(html.includes('id="drawerItem_admin" hidden'), 'mục Quản trị ẩn cho tới khi máy chủ xác nhận quyền');
    assert.ok(read('ui-modern.css').includes('#navTreeDrawer .drawer-leaf-item[hidden] { display: none !important; }'), 'CSS không được đè thuộc tính hidden');
});

test('privacy: the app only reports one visit per app open, never user actions', () => {
    const calls = [...acc.matchAll(/this\.call\('([a-zA-Z]+)'/g)].map((m) => m[1]);
    const allowed = new Set(['visit', 'login', 'listProjects', 'saveProject', 'loadProject', 'deleteProject', 'adminStats', 'adminUsers', 'adminVisits']);
    calls.forEach((c) => assert.ok(allowed.has(c), `lời gọi máy chủ ngoài danh sách cho phép: ${c}`));
    assert.ok(/sessionStorage\.getItem\(VISIT_FLAG\)/.test(acc), 'mỗi lần mở ứng dụng chỉ gửi một lượt');
    assert.ok(/navigator\.onLine === false\)+ return;/.test(acc), 'ngoại tuyến thì không gửi');
});

test('user-provided names are escaped before going into the page', () => {
    assert.ok(/const esc = \(v\) =>/.test(acc));
    for (const field of ['u.name || u.email', 'p.name', 'v.email', 'u.email']) {
        assert.ok(acc.includes('esc(' + field), `thoát HTML cho ${field}`);
    }
});

test('project bundles carry points and the MiniCAD drawing, and auto-save is opt-in', () => {
    assert.ok(/format: 'vn2000-pro-project', version: 1, name, savedAt: Date\.now\(\), points: .*, cad \}/.test(acc));
    assert.ok(acc.includes("'vn2k_cad_shapes_' + this.cadKey(name)"));
    assert.ok(/isAutoSync\(\) \{ try \{ return localStorage\.getItem\(AUTO_KEY\) === '1'/.test(acc), 'tự động lưu mặc định TẮT');
});

test('a setup guide for the owner exists and the backend is in the repo', () => {
    const guide = read('HUONG_DAN_DANG_NHAP_GOOGLE.md');
    assert.ok(/OAuth/.test(guide) && /account-config\.js/.test(guide) && /TaiKhoan\.gs/.test(guide));
    assert.ok(fs.existsSync(path.join(ROOT, 'backend', 'TaiKhoan.gs')));
});
