const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ CẤU TRÚC GIAO DIỆN CỬA SỔ CHỜ DONATE (INDEX.HTML) ===', () => {
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

    // 3. Kiểm tra các thành phần thông tin tài khoản và VietQR
    assert.ok(html.includes('id="imgDonateVietQR"'), 'Phải có ảnh mã QR VietQR Napas');
    assert.ok(html.includes('id="txtDonateBankName"'), 'Phải có trường tên ngân hàng');
    assert.ok(html.includes('id="txtDonateAccountNo"'), 'Phải có trường số tài khoản');
    assert.ok(html.includes('id="txtDonateAccountName"'), 'Phải có trường chủ tài khoản');
    assert.ok(html.includes('id="txtDonateMemo"'), 'Phải có trường nội dung chuyển khoản');
    assert.ok(html.includes('appDonate.copyAccountNumber()'), 'Phải có nút gọi sao chép STK');
    assert.ok(html.includes('appDonate.closeModal()'), 'Nút vào app phải gọi appDonate.closeModal()');
});

test('=== 2. KIỂM THỬ HIỆU ỨNG CSS LOVABLE (STYLE.CSS) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('#btnDonateEnterApp.btn-ready'), 'style.css phải định nghĩa trạng thái btn-ready khi đếm đủ 30s');
    assert.ok(css.includes('pulse-donate-ready'), 'Phải có animation nhấp nháy thu hút sau khi mở khóa');
});

test('=== 3. KIỂM THỬ LOGIC MODULE APPDONATE (APP.JS) ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    assert.ok(appJs.includes('const appDonate = {'), 'Phải có đối tượng appDonate');
    assert.ok(appJs.includes('COUNTDOWN_SECONDS: 30'), 'Thời gian đếm ngược phải là 30 giây');
    assert.ok(appJs.includes('checkDailyTrigger()'), 'Phải có hàm kiểm tra kích hoạt 1 lần/ngày');
    assert.ok(appJs.includes('copyAccountNumber()'), 'Phải có hàm sao chép STK 1-chạm');
    assert.ok(appJs.includes('updateAuthorAccount'), 'Phải có hàm cập nhật thông tin tài khoản tác giả');
    assert.ok(appJs.includes('if (typeof appDonate !== \'undefined\') appDonate.init();'), 'Phải khởi tạo appDonate khi app nạp');
});

test('=== 4. KIỂM THỬ LOGIC 1 LẦN/NGÀY & ĐẾM NGƯỢC 30S TRONG MÔI TRƯỜNG GIẢ LẬP ===', () => {
    // Giả lập mock DOM, window và localStorage cho Node.js
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
    assert.ok(appDonate, 'Phải export được appDonate');
    assert.equal(appDonate.COUNTDOWN_SECONDS, 30, 'Cấu hình đếm ngược đúng 30 giây');

    // Kiểm tra cấu hình mặc định
    assert.equal(typeof appDonate.config.accountNumber, 'string');
    assert.equal(typeof appDonate.config.accountName, 'string');
    assert.equal(typeof appDonate.config.bankName, 'string');

    // Cập nhật thông tin tài khoản tác giả
    appDonate.updateAuthorAccount('VCB', 'Vietcombank', '001100223344', 'DANG NHU', 'Ung ho VN2000 Pro');
    assert.equal(appDonate.config.bankCode, 'VCB');
    assert.equal(appDonate.config.accountNumber, '001100223344');

    // Kiểm tra logic 1 lần / ngày
    const today = new Date().toLocaleDateString('en-CA');
    // Trước khi chạy, key chưa có
    assert.equal(mockStorage[appDonate.STORAGE_KEY], undefined);

    let modalOpened = false;
    appDonate.openModal = () => { modalOpened = true; };

    // Lần đầu tiên trong ngày: checkDailyTrigger sẽ đánh dấu ngày hôm nay
    appDonate.checkDailyTrigger();
    assert.equal(mockStorage[appDonate.STORAGE_KEY], today, 'Phải lưu ngày hôm nay vào localStorage');

    // Lần thứ 2 trong cùng ngày: checkDailyTrigger sẽ KHÔNG mở modal nữa
    modalOpened = false;
    appDonate.checkDailyTrigger();
    assert.equal(modalOpened, false, 'Lần thứ hai trong ngày tuyệt đối không kích hoạt lại');
});
