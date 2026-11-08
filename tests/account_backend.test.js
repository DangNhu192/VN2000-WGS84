// WP-O: máy chủ tài khoản (backend/TaiKhoan.gs) chạy với dịch vụ Apps Script giả lập.
const test = require('node:test');
const assert = require('node:assert');
const { loadBackend, OWNER } = require('./helpers/gas_mock');

const login = (b, email, name) => b.api({ action: 'login', idToken: `ok|${email}|${name || email}` });

test('sign-in verifies the Google token and creates the account, a session and one visit', () => {
    const b = loadBackend();
    const r = login(b, 'An@Example.com', 'Nguyễn An');
    assert.strictEqual(r.status, 'ok');
    assert.ok(r.session && r.session.length >= 32, 'trả về mã phiên');
    assert.deepStrictEqual(r.user, { email: 'an@example.com', name: 'Nguyễn An', picture: 'https://example.com/a.png', role: 'user', status: 'active' });
    const users = b._sheets['Tài khoản']._rows.slice(1);
    assert.strictEqual(users.length, 1);
    const visits = b._sheets['Lượt truy cập']._rows.slice(1);
    assert.strictEqual(visits.length, 1);
    assert.strictEqual(visits[0][3], 'dang_nhap');
    // Phiên chỉ lưu mã băm, không lưu mã gốc
    const sessions = b._sheets['Phiên']._rows.slice(1);
    assert.notStrictEqual(sessions[0][0], r.session);
    assert.strictEqual(b.api({ action: 'me', session: r.session }).user.email, 'an@example.com');
});

test('tokens for another app, expired tokens and garbage are rejected', () => {
    const b = loadBackend();
    assert.strictEqual(b.api({ action: 'login', idToken: 'wrongaud|x@example.com' }).code, 'bad_token');
    assert.strictEqual(b.api({ action: 'login', idToken: 'expired|x@example.com' }).code, 'bad_token');
    assert.strictEqual(b.api({ action: 'login', idToken: 'garbage' }).code, 'bad_token');
    assert.strictEqual(b.api({ action: 'login' }).code, 'no_token');
    assert.strictEqual(b.api({ action: 'me', session: 'nope' }).code, 'no_session');
});

test('the script owner and ADMIN_EMAILS are admins; others are not', () => {
    const b = loadBackend({ props: { ADMIN_EMAILS: 'boss@example.com, Second@Example.com' } });
    assert.strictEqual(login(b, OWNER).user.role, 'admin');
    assert.strictEqual(login(b, 'second@example.com').user.role, 'admin');
    assert.strictEqual(login(b, 'user@example.com').user.role, 'user');
});

test('opening the app records one visit: signed-in users by name, guests only as a daily count', () => {
    const b = loadBackend();
    const s = login(b, 'u@example.com').session;
    assert.strictEqual(b.api({ action: 'visit', session: s }).signedIn, true);
    assert.strictEqual(b.api({ action: 'visit' }).signedIn, false);
    assert.strictEqual(b.api({ action: 'visit', session: 'expired-or-fake' }).signedIn, false);
    const visits = b._sheets['Lượt truy cập']._rows.slice(1);
    assert.deepStrictEqual(visits.map((v) => v[3]), ['dang_nhap', 'mo_ung_dung']);
    const guests = b._sheets['Khách']._rows.slice(1);
    assert.strictEqual(guests.length, 1, 'một dòng cho mỗi ngày');
    assert.strictEqual(guests[0][1], 2);
    assert.strictEqual(b._sheets['Tài khoản']._rows[1][7], 2, 'đếm lượt của người dùng');
});

test('privacy: visit log keeps only time, email, name and visit type — no user actions', () => {
    const b = loadBackend();
    const s = login(b, 'u@example.com').session;
    b.api({ action: 'saveProject', session: s, name: 'A', data: { format: 'vn2000-pro-project', points: [{ x: 1, y: 2 }] } });
    b.api({ action: 'listProjects', session: s });
    const header = b._sheets['Lượt truy cập']._rows[0];
    assert.deepStrictEqual([...header], ['Thời điểm', 'Email', 'Tên', 'Loại']);
    assert.strictEqual(b._sheets['Lượt truy cập']._rows.length, 2, 'lưu/xem dự án không tạo thêm dòng nhật ký');
});

test('projects round-trip per account and stay private to their owner', () => {
    const b = loadBackend();
    const a = login(b, 'a@example.com').session;
    const c = login(b, 'c@example.com').session;
    const data = { format: 'vn2000-pro-project', version: 1, name: 'Khu A.csv', points: [{ name: 'M1', x: 1144058.623, y: 539624.574 }], cad: { savedShapes: [{ id: 1 }] } };
    assert.strictEqual(b.api({ action: 'saveProject', session: a, name: 'Khu A.csv', data }).status, 'ok');
    const list = b.api({ action: 'listProjects', session: a }).projects;
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'Khu A.csv');
    assert.strictEqual(list[0].points, 1);
    assert.strictEqual(list[0].shapes, 1);
    assert.deepStrictEqual(b.api({ action: 'loadProject', session: a, name: 'Khu A.csv' }).data, data);
    assert.strictEqual(b.api({ action: 'listProjects', session: c }).projects.length, 0, 'người khác không thấy dự án');
    assert.strictEqual(b.api({ action: 'loadProject', session: c, name: 'Khu A.csv' }).code, 'not_found');
    // Lưu lại ghi đè, không nhân bản
    b.api({ action: 'saveProject', session: a, name: 'Khu A.csv', data: Object.assign({}, data, { points: [] }) });
    assert.strictEqual(b.api({ action: 'listProjects', session: a }).projects.length, 1);
    b.api({ action: 'deleteProject', session: a, name: 'Khu A.csv' });
    assert.strictEqual(b.api({ action: 'listProjects', session: a }).projects.length, 0);
});

test('bad project names and oversized projects are refused', () => {
    const b = loadBackend();
    const s = login(b, 'a@example.com').session;
    assert.strictEqual(b.api({ action: 'saveProject', session: s, name: '', data: {} }).code, 'bad_name');
    const big = { points: [{ note: 'x'.repeat(5 * 1024 * 1024) }] };
    assert.strictEqual(b.api({ action: 'saveProject', session: s, name: 'big', data: big }).code, 'too_large');
    assert.strictEqual(b.api({ action: 'saveProject', session: s, name: 'a/b:c', data: { points: [] } }).name, 'a_b_c', 'ký tự cấm trong tên tệp được thay');
});

test('admin endpoints are refused for normal users', () => {
    const b = loadBackend();
    const s = login(b, 'user@example.com').session;
    for (const action of ['adminStats', 'adminUsers', 'adminVisits', 'adminSetStatus', 'adminSetRole', 'adminDeleteUser']) {
        assert.strictEqual(b.api({ action, session: s, email: 'user@example.com' }).code, 'forbidden', action);
    }
});

test('admin sees accounts, visit counts and who visited', () => {
    const b = loadBackend();
    const admin = login(b, OWNER).session;
    const u = login(b, 'u@example.com', 'Người dùng').session;
    b.api({ action: 'visit', session: u });
    b.api({ action: 'visit' });
    const stats = b.api({ action: 'adminStats', session: admin });
    assert.strictEqual(stats.users.total, 2);
    assert.strictEqual(stats.visits.visits, 3, '2 lần đăng nhập + 1 lần mở ứng dụng');
    assert.strictEqual(stats.visits.guests, 1);
    assert.strictEqual(stats.visits.today, 4);
    assert.strictEqual(stats.daily.length, 30);
    const today = stats.daily[29];
    assert.strictEqual(today.people, 2);
    const users = b.api({ action: 'adminUsers', session: admin }).users;
    assert.strictEqual(users.find((x) => x.email === 'u@example.com').visits, 2);
    assert.strictEqual(users.find((x) => x.email === OWNER).owner, true);
    const visits = b.api({ action: 'adminVisits', session: admin, email: 'u@example.com' }).visits;
    assert.deepStrictEqual(visits.map((v) => v.kind), ['mo_ung_dung', 'dang_nhap'], 'mới nhất trước');
    assert.strictEqual(visits[0].name, 'Người dùng');
});

test('blocking signs the user out everywhere and stops new sign-ins; unblocking restores access', () => {
    const b = loadBackend();
    const admin = login(b, OWNER).session;
    const u = login(b, 'u@example.com').session;
    assert.strictEqual(b.api({ action: 'adminSetStatus', session: admin, email: 'u@example.com', status: 'blocked' }).user.status, 'blocked');
    assert.strictEqual(b.api({ action: 'me', session: u }).code, 'no_session');
    assert.strictEqual(login(b, 'u@example.com').code, 'blocked');
    b.api({ action: 'adminSetStatus', session: admin, email: 'u@example.com', status: 'active' });
    assert.strictEqual(login(b, 'u@example.com').status, 'ok');
});

test('admins cannot lock themselves or the owner out, and roles can be granted', () => {
    const b = loadBackend();
    const owner = login(b, OWNER).session;
    login(b, 'helper@example.com');
    assert.strictEqual(b.api({ action: 'adminSetStatus', session: owner, email: OWNER, status: 'blocked' }).code, 'forbidden');
    assert.strictEqual(b.api({ action: 'adminDeleteUser', session: owner, email: OWNER }).code, 'forbidden');
    assert.strictEqual(b.api({ action: 'adminSetRole', session: owner, email: 'helper@example.com', role: 'admin' }).user.role, 'admin');
    const helper = login(b, 'helper@example.com').session;
    assert.strictEqual(b.api({ action: 'adminStats', session: helper }).status, 'ok', 'quản trị viên mới dùng được trang quản trị');
    assert.strictEqual(b.api({ action: 'adminSetRole', session: helper, email: OWNER, role: 'user' }).code, 'forbidden');
});

test('deleting an account removes its row, sessions and visits, and trashes its projects', () => {
    const b = loadBackend();
    const admin = login(b, OWNER).session;
    const u = login(b, 'gone@example.com').session;
    b.api({ action: 'saveProject', session: u, name: 'P', data: { points: [] } });
    assert.strictEqual(b.api({ action: 'adminDeleteUser', session: admin, email: 'gone@example.com' }).deleted, 'gone@example.com');
    assert.ok(!b._sheets['Tài khoản']._rows.some((r) => r[0] === 'gone@example.com'));
    assert.ok(!b._sheets['Lượt truy cập']._rows.some((r) => r[1] === 'gone@example.com'));
    assert.ok(!b._sheets['Phiên']._rows.some((r) => r[1] === 'gone@example.com'));
    assert.strictEqual(b.api({ action: 'me', session: u }).code, 'no_session');
    const relogin = login(b, 'gone@example.com').session;
    assert.strictEqual(b.api({ action: 'listProjects', session: relogin }).projects.length, 0, 'dự án cũ đã vào thùng rác');
});
