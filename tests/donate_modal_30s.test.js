const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ CẤU TRÚC GIAO DIỆN CỬA SỔ CHỜ DONATE & 4 KÊNH (INDEX.HTML) ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1. Kiểm tra tồn tại Modal Donate
    assert.ok(html.includes('id="modalDonateCountdown"'), 'Phải có modalDonateCountdown trong index.html');
    assert.ok(html.includes('MỜI TÁC GIẢ TÁCH CÀ PHÊ'), 'Phải có tiêu đề trang nhã mời cà phê');

    // 2. Kiểm tra các thành phần đếm ngược 30 giây
    assert.ok(html.includes('id="txtDonateCountdownSec"'), 'Phải có số đếm ngược txtDonateCountdownSec');
    assert.ok(html.includes('id="barDonateProgressFill"'), 'Phải có thanh tiến trình barDonateProgressFill');
    assert.ok(html.includes('id="btnDonateEnterApp"'), 'Phải có nút vào app btnDonateEnterApp');
    assert.ok(html.includes('id="badgeDonateStatus"'), 'Phải có huy hiệu trạng thái badgeDonateStatus');

    // 3. Kiểm tra 4 kênh thanh toán (VietinBank, BIDV, MoMo, ZaloPay)
    assert.ok(html.includes('data-channel="vietinbank"'), 'Phải có nút chọn VietinBank');
    assert.ok(html.includes('data-channel="bidv"'), 'Phải có nút chọn BIDV');
    assert.ok(html.includes('data-channel="momo"'), 'Phải có nút chọn MoMo');
    assert.ok(html.includes('data-channel="zalopay"'), 'Phải có nút chọn ZaloPay');

    // 4. Kiểm tra số tài khoản tác giả chính xác 0839656568
    assert.ok(html.includes('0839656568'), 'index.html phải hiển thị đúng số tài khoản 0839656568');
    assert.ok(html.includes('id="imgDonateVietQR"'), 'Phải có ảnh mã QR VietQR Napas');
    assert.ok(html.includes('appDonate.copyAccountNumber()'), 'Phải có nút gọi sao chép STK');
    assert.ok(html.includes('appDonate.closeModal()'), 'Nút vào app phải gọi appDonate.closeModal()');
});

test('=== 2. KIỂM THỬ HIỆU ỨNG CSS LOVABLE & CHANNEL PILLS (STYLE.CSS) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('#btnDonateEnterApp.btn-ready'), 'style.css phải định nghĩa trạng thái btn-ready khi đếm đủ 30s');
    assert.ok(css.includes('pulse-donate-ready'), 'Phải có animation nhấp nháy thu hút sau khi mở khóa');
    assert.ok(css.includes('.donate-channel-pill'), 'Phải có style cho bộ nút chọn kênh donate-channel-pill');
});

test('=== 3. KIỂM THỬ LOGIC MODULE APPDONATE & 4 KÊNH NHẬN TIỀN (APP.JS) ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    assert.ok(appJs.includes('const appDonate = {'), 'Phải có đối tượng appDonate');
    assert.ok(appJs.includes('0839656568'), 'app.js phải cấu hình số tài khoản 0839656568');
    assert.ok(appJs.includes("'vietinbank'"), 'appDonate phải có kênh vietinbank');
    assert.ok(appJs.includes("'bidv'"), 'appDonate phải có kênh bidv');
    assert.ok(appJs.includes("'momo'"), 'appDonate phải có kênh momo');
    assert.ok(appJs.includes("'zalopay'"), 'appDonate phải có kênh zalopay');
    assert.ok(appJs.includes('COUNTDOWN_SECONDS: 30'), 'Thời gian đếm ngược phải là 30 giây');
    assert.ok(appJs.includes('setChannel(ch)'), 'Phải có hàm chuyển kênh setChannel');
    assert.ok(appJs.includes('copyAccountNumber()'), 'Phải có hàm sao chép STK 1-chạm');
});

test('=== 4. KIỂM THỬ ĐỔI KÊNH & LOGIC 1 LẦN/NGÀY TRONG MÔI TRƯỜNG GIẢ LẬP ===', () => {
    const mockStorage = {};
    global.localStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); }
    };
    global.window = {
        addEventListener: () => {},
        location: { search: '' }
    };
    global.document = {
        addEventListener: () => {},
        getElementById: () => null,
        querySelectorAll: () => [],
        documentElement: { setAttribute: () => {} }
    };
    global.navigator = { clipboard: { writeText: async () => {} } };

    // Bóc tách đối tượng appDonate từ app.js để kiểm thử thuần túy
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');
    const startIdx = appJs.indexOf('const appDonate = {');
    const endIdx = appJs.indexOf('// ================= 11. KHỞI TẠO ỨNG DỤNG', startIdx);
    const codeSnippet = appJs.slice(startIdx, endIdx) + '\nreturn appDonate;';
    const appDonate = new Function('localStorage', 'document', 'window', 'navigator', codeSnippet)(global.localStorage, global.document, global.window, global.navigator);

    assert.ok(appDonate, 'Phải khởi tạo được appDonate');
    assert.equal(appDonate.COUNTDOWN_SECONDS, 30);

    // Mặc định kênh VietinBank
    assert.equal(appDonate.activeChannel, 'vietinbank');
    assert.equal(appDonate.config.accountNumber, '0839656568');
    assert.equal(appDonate.config.bankCode, 'ICB');

    // Chuyển sang kênh BIDV
    appDonate.setChannel('bidv');
    assert.equal(appDonate.activeChannel, 'bidv');
    assert.equal(appDonate.config.accountNumber, '0839656568');
    assert.equal(appDonate.config.bankCode, 'BIDV');

    // Chuyển sang kênh MoMo
    appDonate.setChannel('momo');
    assert.equal(appDonate.activeChannel, 'momo');
    assert.equal(appDonate.config.accountNumber, '0839656568');

    // Chuyển sang kênh ZaloPay
    appDonate.setChannel('zalopay');
    assert.equal(appDonate.activeChannel, 'zalopay');
    assert.equal(appDonate.config.accountNumber, '0839656568');

    // Kiểm tra logic 1 lần / ngày
    const today = new Date().toLocaleDateString('en-CA');
    assert.equal(mockStorage[appDonate.STORAGE_KEY], undefined);

    let modalOpened = false;
    appDonate.openModal = () => { modalOpened = true; };

    // Lần đầu tiên: lưu key
    appDonate.checkDailyTrigger();
    assert.equal(mockStorage[appDonate.STORAGE_KEY], today);

    // Lần thứ hai trong ngày: không mở nữa
    modalOpened = false;
    appDonate.checkDailyTrigger();
    assert.equal(modalOpened, false);
});
