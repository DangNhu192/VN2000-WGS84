// Trợ lý cục bộ: bộ định tuyến lệnh tiếng Việt (không AI), chuỗi lệnh, ràng buộc đầu ra của mô hình AI tùy chọn.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const C = require('../assistant-core.js');
const G = require('../geodesy.js');

const ctx = { provinces: G.VN_PROVINCES };
const R = t => C.route(t, ctx);

test('Đọc số kiểu Việt Nam: dấu phẩy thập phân, nhóm nghìn, độ-phút-giây', () => {
  assert.deepStrictEqual(C.extractNumbers('10,776889 106,700806'), [10.776889, 106.700806]);
  assert.deepStrictEqual(C.extractNumbers('10.77, 106.70'), [10.77, 106.7]);
  assert.deepStrictEqual(C.extractNumbers('1 191 234,567 602 345,123'), [1191234.567, 602345.123]);
  assert.deepStrictEqual(C.extractNumbers('1.191.234,567'), [1191234.567]);
  const dms = C.extractNumbers(`10°46'36.8" 106°42'03.2"`);
  assert.ok(Math.abs(dms[0] - 10.7768889) < 1e-6 && Math.abs(dms[1] - 106.7008889) < 1e-6);
});

test('Nhận diện chuyển đổi và khoảng cách từ số trong câu (mô hình AI không bao giờ được tính số)', () => {
  assert.strictEqual(R('10.7769 106.7009').intent, 'wgs2vn');
  assert.strictEqual(R('106.7009 10.7769').args.lat, 10.7769, 'Đảo thứ tự kinh/vĩ vẫn hiểu');
  assert.strictEqual(R('X 1191942,305 Y 603797,261').intent, 'vn2wgs');
  const d = R('khoảng cách 1191234 602345 1191300 602400');
  assert.strictEqual(d.intent, 'distance');
  assert.strictEqual(d.args.p2.Y, 602400);
});

test('Nhận diện lệnh điều hướng, KTT, GPS, dự án, kiểm thử bằng nhiều cách nói', () => {
  const cases = {
    'mở bản đồ': ['open', 'drawerItem_map'], 'Mở MiniCAD giúp tôi': ['open', 'drawerItem_cad_tool'], 'cắm mốc': ['open', 'drawerItem_stakeout'],
    'vào lộ trình': ['open', 'drawerItem_routing'], 'sổ đo': ['open', 'drawerItem_datamgmt'], 'trắc dọc': ['open', 'drawerItem_profile_volume'],
    'KTT đang dùng là gì': ['kttInfo'], 'dùng múi 6': ['setMui'], 'vị trí của tôi': ['whereAmI'], 'bật gps': ['gps'], 'tắt định vị': ['gps'],
    'có bao nhiêu mốc': ['project'], 'kiểm thử': ['selftest'], 'tự kiểm tra hệ thống': ['selftest'], 'giao diện sáng': ['theme'],
    'mấy giờ rồi': ['time'], 'hôm nay ngày mấy': ['date'], 'bạn làm được gì': ['help'], 'hôm nay trời đẹp quá': ['unknown']
  };
  for (const [q, [intent, target]] of Object.entries(cases)) {
    const r = R(q);
    assert.strictEqual(r.intent, intent, q);
    if (target) assert.strictEqual(r.args.target, target, q);
  }
});

test('Tỉnh và KTT: ưu tiên danh sách 34 tỉnh từ 01/07/2025, hỏi khác với đổi', () => {
  const set = R('đổi KTT sang Đồng Tháp');
  assert.strictEqual(set.intent, 'setProvince');
  assert.strictEqual(G.VN_PROVINCES[set.args.index].era, '2025');
  assert.strictEqual(R('KTT của Bà Rịa Vũng Tàu là bao nhiêu').intent, 'kttOf', 'Hỏi thì không được tự đổi KTT');
  assert.strictEqual(G.VN_PROVINCES[R('TP HCM').args.index].name, 'TP. Hồ Chí Minh');
});

test('Nối nhiều lệnh bằng "rồi" để điều phối', () => {
  assert.deepStrictEqual(C.splitChain('chuyển 10.77 106.70 rồi mở bản đồ'), ['chuyển 10.77 106.70', 'mở bản đồ']);
  assert.deepStrictEqual(C.splitChain('kiểm thử; vị trí của tôi'), ['kiểm thử', 'vị trí của tôi']);
});

test('Mô hình AI chỉ được chọn một lệnh trong danh sách, không có số, không đoán bừa', () => {
  assert.ok(C.CANONICAL.every(c => !/\d/.test(c)), 'Danh sách lệnh không chứa số');
  assert.ok(C.CANONICAL.every(c => R(c).intent !== 'unknown'), 'Mọi lệnh chuẩn đều đi được qua bộ định tuyến');
  assert.strictEqual(C.parseLlmCommand('mo ban do du an.'), 'mo ban do du an');
  assert.strictEqual(C.parseLlmCommand('khong ro'), null);
  assert.strictEqual(C.parseLlmCommand('X = 1191942'), null);
  const sys = C.buildLlmMessages('x')[0].content;
  assert.ok(sys.includes('Không giải thích, không tính toán'));
});

test('Giao diện trợ lý: nút trên thanh tiêu đề, tệp được cache ngoại tuyến, AI tải từ chính máy chủ app', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const sw = fs.readFileSync('sw.js', 'utf8');
  const js = fs.readFileSync('assistant.js', 'utf8');
  assert.ok(html.includes('id="btnHeaderAssistant"') && html.includes('appAssistant.toggle()'));
  assert.ok(html.indexOf('assistant-core.js') < html.indexOf('assistant.js?'), 'Nạp lõi trước giao diện');
  for (const f of ['assistant-core.js', 'assistant.js', 'ui-assistant.css']) assert.ok(sw.includes(`'./${f}'`), f);
  assert.ok(fs.existsSync('vendor/wllama/index.js') && fs.existsSync('vendor/wllama/wllama.wasm'), 'wllama nằm trong app (chạy ngoại tuyến)');
  assert.ok(js.includes("import(new URL('vendor/wllama/index.js'"), 'Chỉ nạp AI khi người dùng bật');
  assert.ok(js.includes("const grammar = 'root ::= '"), 'Khóa đầu ra mô hình bằng ngữ pháp');
  assert.ok(js.includes('LLM_IDLE_MS') && js.includes('this.unload()'), 'Gỡ mô hình khỏi bộ nhớ khi rảnh');
});

test('Điểm chuẩn trong tự kiểm thử khớp thuật toán hiện tại', () => {
  const js = fs.readFileSync('assistant.js', 'utf8');
  const m = js.match(/Math\.abs\(r\.X - ([\d.]+)\) < [\d.]+ && Math\.abs\(r\.Y - ([\d.]+)\)/);
  assert.ok(m, 'Có điểm chuẩn');
  const r = G.convertWgsToVn2k(10.7769, 106.7009, 105.75, 0.9999);
  assert.ok(Math.abs(r.X - +m[1]) < 0.005 && Math.abs(r.Y - +m[2]) < 0.005);
});
