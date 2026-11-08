/**
 * =========================================================================
 * MÁY CHỦ TÀI KHOẢN VN-2000 PRO (Google Apps Script) — đăng nhập Google, lưu dự án theo tài khoản, trang Admin.
 * Chủ ứng dụng triển khai MỘT lần (xem HUONG_DAN_DANG_NHAP_GOOGLE.md). Người dùng chỉ việc đăng nhập.
 *
 * Dữ liệu (trong Google Sheet gắn với script + thư mục Drive của chủ ứng dụng):
 *   - Tab "Tài khoản":   email, tên, ảnh, vai trò, trạng thái, lần đầu, lần cuối, số lượt truy cập
 *   - Tab "Lượt truy cập": thời điểm, email, tên, loại (dang_nhap | mo_ung_dung)
 *   - Tab "Khách":        ngày, số lượt mở ứng dụng khi CHƯA đăng nhập (chỉ đếm, không định danh)
 *   - Tab "Phiên":        mã băm phiên đăng nhập, email, hạn dùng
 *   - Thư mục Drive "VN2000 PRO - Du lieu tai khoan/<email>/<dự án>.json"
 * KHÔNG ghi nhận thao tác của người dùng (chuyển đổi, vẽ, xuất file...). Chỉ ghi: ai, lúc nào mở/đăng nhập.
 *
 * Cấu hình (Script Properties — Dự án > Cài đặt dự án > Thuộc tính tập lệnh), hoặc chạy hàm caiDatLanDau():
 *   GOOGLE_CLIENT_ID  — OAuth Client ID (loại Web) của ứng dụng
 *   ADMIN_EMAILS      — email quản trị, cách nhau bằng dấu phẩy (chủ script luôn là quản trị)
 * =========================================================================
 */

var SHEET_USERS = 'Tài khoản';
var SHEET_VISITS = 'Lượt truy cập';
var SHEET_GUESTS = 'Khách';
var SHEET_SESSIONS = 'Phiên';
var DATA_FOLDER_NAME = 'VN2000 PRO - Du lieu tai khoan';
var SESSION_DAYS = 30;
var MAX_PROJECT_BYTES = 5 * 1024 * 1024;
var USER_HEADER = ['Email', 'Tên', 'Ảnh', 'Vai trò', 'Trạng thái', 'Lần đầu', 'Lần cuối', 'Số lượt truy cập'];

/** Chạy một lần trong trình soạn thảo Apps Script để ghi cấu hình. */
function caiDatLanDau() {
  var clientId = 'DAN_CLIENT_ID_VAO_DAY.apps.googleusercontent.com';
  var adminEmails = Session.getEffectiveUser().getEmail();
  PropertiesService.getScriptProperties().setProperties({ GOOGLE_CLIENT_ID: clientId, ADMIN_EMAILS: adminEmails });
  ensureSheets_();
  return 'Đã lưu cấu hình. Quản trị: ' + adminEmails;
}

function doGet() {
  return json_({ status: 'ok', service: 'vn2000-account', version: 1 });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ status: 'error', code: 'bad_json', message: 'Dữ liệu gửi lên không hợp lệ.' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json_({ status: 'error', code: 'busy', message: 'Máy chủ đang bận, thử lại sau vài giây.' });
  try {
    return json_(handle_(req));
  } catch (err) {
    return json_({ status: 'error', code: err.code || 'server', message: err.message || String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Điều phối yêu cầu. Tách riêng để kiểm thử được. */
function handle_(req) {
  ensureSheets_();
  var action = String(req.action || '');
  if (action === 'login') return login_(req.idToken);
  if (action === 'visit') return visit_(req.session);

  var me = requireUser_(req.session);
  if (action === 'me') return ok_({ user: publicUser_(me) });
  if (action === 'logout') { deleteSession_(req.session); return ok_({}); }
  if (action === 'listProjects') return ok_({ projects: listProjects_(me.email) });
  if (action === 'saveProject') return ok_(saveProject_(me.email, req.name, req.data));
  if (action === 'loadProject') return ok_({ name: req.name, data: loadProject_(me.email, req.name) });
  if (action === 'deleteProject') { deleteProject_(me.email, req.name); return ok_({}); }

  if (action.indexOf('admin') === 0) {
    if (me.role !== 'admin') throw err_('forbidden', 'Chỉ quản trị viên mới dùng được chức năng này.');
    if (action === 'adminStats') return ok_(adminStats_());
    if (action === 'adminUsers') return ok_({ users: readUsers_().map(adminUserView_) });
    if (action === 'adminVisits') return ok_({ visits: readVisits_(req.email, Math.min(Number(req.limit) || 200, 1000)) });
    if (action === 'adminSetStatus') return ok_(adminSetStatus_(me, req.email, req.status));
    if (action === 'adminSetRole') return ok_(adminSetRole_(me, req.email, req.role));
    if (action === 'adminDeleteUser') return ok_(adminDeleteUser_(me, req.email));
  }
  throw err_('unknown_action', 'Yêu cầu không hợp lệ: ' + action);
}

// ---------------------------------------------------------------- Đăng nhập & phiên

function login_(idToken) {
  var claims = verifyIdToken_(idToken);
  var email = String(claims.email).toLowerCase();
  var now = new Date();
  var user = findUser_(email);
  if (user && user.status === 'blocked') throw err_('blocked', 'Tài khoản này đã bị quản trị viên khóa.');
  if (!user) {
    user = { email: email, name: claims.name || email, picture: claims.picture || '', role: isConfiguredAdmin_(email) ? 'admin' : 'user', status: 'active', firstSeen: now, lastSeen: now, visits: 0 };
  }
  user.name = claims.name || user.name;
  user.picture = claims.picture || user.picture;
  if (isConfiguredAdmin_(email)) user.role = 'admin';
  user.lastSeen = now;
  user.visits = (Number(user.visits) || 0) + 1;
  writeUser_(user);
  logVisit_(user, 'dang_nhap', now);
  var session = createSession_(email);
  return ok_({ session: session, user: publicUser_(user) });
}

/** Xác minh ID token Google: đúng ứng dụng (aud), đúng nhà phát hành, email đã xác minh, còn hạn. */
function verifyIdToken_(idToken) {
  if (!idToken) throw err_('no_token', 'Thiếu mã đăng nhập Google.');
  var clientId = prop_('GOOGLE_CLIENT_ID');
  if (!clientId) throw err_('not_configured', 'Máy chủ chưa cấu hình GOOGLE_CLIENT_ID.');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw err_('bad_token', 'Mã đăng nhập Google không hợp lệ hoặc đã hết hạn.');
  var c = JSON.parse(res.getContentText());
  var issOk = c.iss === 'accounts.google.com' || c.iss === 'https://accounts.google.com';
  var expOk = Number(c.exp) * 1000 > Date.now();
  if (c.aud !== clientId || !issOk || !expOk || String(c.email_verified) !== 'true' || !c.email) {
    throw err_('bad_token', 'Mã đăng nhập Google không dành cho ứng dụng này.');
  }
  return c;
}

function createSession_(email) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  sheet_(SHEET_SESSIONS).appendRow([hash_(token), email, expires, new Date()]);
  return token;
}

function sessionEmail_(token) {
  if (!token) return null;
  var h = hash_(token);
  var cache = CacheService.getScriptCache();
  var cached = cache.get('s_' + h);
  if (cached) return cached;
  var rows = sheet_(SHEET_SESSIONS).getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === h) {
      if (new Date(rows[i][2]).getTime() < Date.now()) return null;
      cache.put('s_' + h, rows[i][1], 600);
      return rows[i][1];
    }
  }
  return null;
}

function deleteSession_(token) {
  if (!token) return;
  var h = hash_(token);
  CacheService.getScriptCache().remove('s_' + h);
  deleteRowsWhere_(SHEET_SESSIONS, function (r) { return r[0] === h; });
}

function requireUser_(token) {
  var email = sessionEmail_(token);
  if (!email) throw err_('no_session', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  var user = findUser_(email);
  if (!user) throw err_('no_session', 'Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.');
  if (user.status === 'blocked') { deleteSession_(token); throw err_('blocked', 'Tài khoản này đã bị quản trị viên khóa.'); }
  if (isConfiguredAdmin_(user.email)) user.role = 'admin';
  return user;
}

// ---------------------------------------------------------------- Lượt truy cập (không lưu thao tác)

/** Mỗi lần mở ứng dụng gọi một lần: có phiên → ghi người dùng; không có → chỉ tăng bộ đếm khách theo ngày. */
function visit_(token) {
  var now = new Date();
  var email = sessionEmail_(token);
  var user = email ? findUser_(email) : null;
  if (user && user.status !== 'blocked') {
    user.lastSeen = now;
    user.visits = (Number(user.visits) || 0) + 1;
    writeUser_(user);
    logVisit_(user, 'mo_ung_dung', now);
    return ok_({ signedIn: true, user: publicUser_(user) });
  }
  var day = dayKey_(now);
  var sh = sheet_(SHEET_GUESTS);
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (dayKey_(rows[i][0]) === day) { sh.getRange(i + 1, 2).setValue((Number(rows[i][1]) || 0) + 1); return ok_({ signedIn: false }); }
  }
  sh.appendRow(["'" + day, 1]); // dấu ' giữ dạng chữ, tránh Sheets đổi sang ngày theo múi giờ khác
  return ok_({ signedIn: false });
}

function logVisit_(user, kind, when) {
  sheet_(SHEET_VISITS).appendRow([when, user.email, user.name, kind]);
}

// ---------------------------------------------------------------- Dự án theo tài khoản

function userFolder_(email, create) {
  var root;
  var it = DriveApp.getFoldersByName(DATA_FOLDER_NAME);
  if (it.hasNext()) root = it.next();
  else if (create) root = DriveApp.createFolder(DATA_FOLDER_NAME);
  else return null;
  var sub = root.getFoldersByName(email);
  if (sub.hasNext()) return sub.next();
  return create ? root.createFolder(email) : null;
}

function cleanProjectName_(name) {
  var n = String(name || '').replace(/[\\\/:*?"<>|]/g, '_').trim();
  if (!n || n.length > 120) throw err_('bad_name', 'Tên dự án không hợp lệ.');
  return n;
}

function listProjects_(email) {
  var folder = userFolder_(email, false);
  var out = [];
  if (!folder) return out;
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var name = f.getName();
    if (!/\.json$/i.test(name)) continue;
    var meta = {};
    try { meta = JSON.parse(f.getDescription() || '{}'); } catch (e) {}
    out.push({ name: name.replace(/\.json$/i, ''), updated: f.getLastUpdated().getTime(), size: f.getSize(), points: Number(meta.points) || 0, shapes: Number(meta.shapes) || 0 });
  }
  out.sort(function (a, b) { return b.updated - a.updated; });
  return out;
}

function saveProject_(email, name, data) {
  var n = cleanProjectName_(name);
  if (!data || typeof data !== 'object') throw err_('bad_data', 'Thiếu dữ liệu dự án.');
  var body = JSON.stringify(data);
  if (body.length > MAX_PROJECT_BYTES) throw err_('too_large', 'Dự án vượt quá 5 MB, không lưu được lên tài khoản.');
  var folder = userFolder_(email, true);
  var meta = JSON.stringify({ points: (data.points || []).length, shapes: ((data.cad && data.cad.savedShapes) || []).length });
  var it = folder.getFilesByName(n + '.json');
  var file;
  if (it.hasNext()) { file = it.next(); file.setContent(body); }
  else file = folder.createFile(n + '.json', body, 'application/json');
  file.setDescription(meta);
  return { name: n, updated: Date.now() };
}

function loadProject_(email, name) {
  var n = cleanProjectName_(name);
  var folder = userFolder_(email, false);
  var it = folder ? folder.getFilesByName(n + '.json') : null;
  if (!it || !it.hasNext()) throw err_('not_found', 'Không tìm thấy dự án "' + n + '" trên tài khoản.');
  return JSON.parse(it.next().getBlob().getDataAsString());
}

function deleteProject_(email, name) {
  var n = cleanProjectName_(name);
  var folder = userFolder_(email, false);
  var it = folder ? folder.getFilesByName(n + '.json') : null;
  if (it && it.hasNext()) it.next().setTrashed(true);
}

// ---------------------------------------------------------------- Quản trị

function adminStats_() {
  var users = readUsers_();
  var visits = sheet_(SHEET_VISITS).getDataRange().getValues().slice(1);
  var guests = sheet_(SHEET_GUESTS).getDataRange().getValues().slice(1);
  var now = Date.now();
  var days = {};
  for (var d = 29; d >= 0; d--) days[dayKey_(new Date(now - d * 86400000))] = { day: '', users: 0, guests: 0, people: {} };
  Object.keys(days).forEach(function (k) { days[k].day = k; });
  var total = { visits: visits.length, guests: 0, today: 0, last7: 0, last30: 0 };
  visits.forEach(function (r) {
    var k = dayKey_(r[0]);
    var age = now - new Date(r[0]).getTime();
    if (age <= 86400000 * 7) total.last7++;
    if (age <= 86400000 * 30) total.last30++;
    if (days[k]) { days[k].users++; days[k].people[r[1]] = 1; }
  });
  guests.forEach(function (r) {
    var k = dayKey_(r[0]);
    var n = Number(r[1]) || 0;
    total.guests += n;
    if (days[k]) days[k].guests += n;
  });
  var todayKey = dayKey_(new Date(now));
  total.today = days[todayKey] ? days[todayKey].users + days[todayKey].guests : 0;
  return {
    users: { total: users.length, active: users.filter(function (u) { return u.status !== 'blocked'; }).length, blocked: users.filter(function (u) { return u.status === 'blocked'; }).length, admins: users.filter(function (u) { return u.role === 'admin'; }).length },
    visits: total,
    daily: Object.keys(days).map(function (k) { return { day: k, users: days[k].users, people: Object.keys(days[k].people).length, guests: days[k].guests }; })
  };
}

function adminUserView_(u) {
  return { email: u.email, name: u.name, picture: u.picture, role: u.role, status: u.status, firstSeen: toMs_(u.firstSeen), lastSeen: toMs_(u.lastSeen), visits: Number(u.visits) || 0, owner: isConfiguredAdmin_(u.email) };
}

function adminSetStatus_(me, email, status) {
  var u = findUser_(String(email || '').toLowerCase());
  if (!u) throw err_('not_found', 'Không tìm thấy tài khoản.');
  if (status !== 'active' && status !== 'blocked') throw err_('bad_status', 'Trạng thái không hợp lệ.');
  if (status === 'blocked' && (u.email === me.email || isConfiguredAdmin_(u.email))) throw err_('forbidden', 'Không thể khóa chính bạn hoặc quản trị viên cấu hình sẵn.');
  u.status = status;
  writeUser_(u);
  if (status === 'blocked') deleteRowsWhere_(SHEET_SESSIONS, function (r) { return r[1] === u.email; });
  return { user: adminUserView_(u) };
}

function adminSetRole_(me, email, role) {
  var u = findUser_(String(email || '').toLowerCase());
  if (!u) throw err_('not_found', 'Không tìm thấy tài khoản.');
  if (role !== 'admin' && role !== 'user') throw err_('bad_role', 'Vai trò không hợp lệ.');
  if (role === 'user' && (u.email === me.email || isConfiguredAdmin_(u.email))) throw err_('forbidden', 'Không thể bỏ quyền của chính bạn hoặc quản trị viên cấu hình sẵn.');
  u.role = role;
  writeUser_(u);
  return { user: adminUserView_(u) };
}

/** Xóa tài khoản: bỏ dòng tài khoản, phiên, lượt truy cập và chuyển thư mục dự án vào thùng rác Drive (30 ngày). */
function adminDeleteUser_(me, email) {
  var e = String(email || '').toLowerCase();
  if (e === me.email || isConfiguredAdmin_(e)) throw err_('forbidden', 'Không thể xóa chính bạn hoặc quản trị viên cấu hình sẵn.');
  if (!findUser_(e)) throw err_('not_found', 'Không tìm thấy tài khoản.');
  deleteRowsWhere_(SHEET_USERS, function (r) { return String(r[0]).toLowerCase() === e; });
  deleteRowsWhere_(SHEET_SESSIONS, function (r) { return r[1] === e; });
  deleteRowsWhere_(SHEET_VISITS, function (r) { return String(r[1]).toLowerCase() === e; });
  var folder = userFolder_(e, false);
  if (folder) folder.setTrashed(true);
  return { deleted: e };
}

// ---------------------------------------------------------------- Bảng tính

function ensureSheets_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var spec = [[SHEET_USERS, USER_HEADER], [SHEET_VISITS, ['Thời điểm', 'Email', 'Tên', 'Loại']], [SHEET_GUESTS, ['Ngày', 'Số lượt khách']], [SHEET_SESSIONS, ['Mã băm phiên', 'Email', 'Hết hạn', 'Tạo lúc']]];
  spec.forEach(function (s) {
    var sh = ss.getSheetByName(s[0]);
    if (!sh) { sh = ss.insertSheet(s[0]); sh.appendRow(s[1]); sh.setFrozenRows(1); }
  });
}

function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function readUsers_() {
  return sheet_(SHEET_USERS).getDataRange().getValues().slice(1).filter(function (r) { return r[0]; }).map(rowToUser_);
}

function rowToUser_(r) {
  return { email: String(r[0]).toLowerCase(), name: r[1], picture: r[2], role: r[3] || 'user', status: r[4] || 'active', firstSeen: r[5], lastSeen: r[6], visits: r[7] };
}

function findUser_(email) {
  var rows = sheet_(SHEET_USERS).getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) if (String(rows[i][0]).toLowerCase() === email) return rowToUser_(rows[i]);
  return null;
}

function writeUser_(u) {
  var sh = sheet_(SHEET_USERS);
  var row = [u.email, u.name, u.picture, u.role, u.status, u.firstSeen, u.lastSeen, u.visits];
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === u.email) { sh.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
  }
  sh.appendRow(row);
}

function readVisits_(email, limit) {
  var rows = sheet_(SHEET_VISITS).getDataRange().getValues().slice(1);
  var e = email ? String(email).toLowerCase() : '';
  var out = [];
  for (var i = rows.length - 1; i >= 0 && out.length < limit; i--) {
    if (e && String(rows[i][1]).toLowerCase() !== e) continue;
    out.push({ time: toMs_(rows[i][0]), email: rows[i][1], name: rows[i][2], kind: rows[i][3] });
  }
  return out;
}

function deleteRowsWhere_(name, pred) {
  var sh = sheet_(name);
  var rows = sh.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) if (pred(rows[i])) sh.deleteRow(i + 1);
}

// ---------------------------------------------------------------- Tiện ích

function isConfiguredAdmin_(email) {
  var e = String(email || '').toLowerCase();
  var list = String(prop_('ADMIN_EMAILS') || '').toLowerCase().split(/[,;\s]+/).filter(String);
  var owner = '';
  try { owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (err) {}
  return !!e && (list.indexOf(e) >= 0 || e === owner);
}

function publicUser_(u) { return { email: u.email, name: u.name, picture: u.picture, role: u.role, status: u.status }; }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function hash_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s)).map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join(''); }
function dayKey_(d) { var x = new Date(d); return Utilities.formatDate(x, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'); }
function toMs_(d) { var t = new Date(d).getTime(); return isNaN(t) ? null : t; }
function ok_(o) { o = o || {}; o.status = 'ok'; return o; }
function err_(code, message) { var e = new Error(message); e.code = code; return e; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
