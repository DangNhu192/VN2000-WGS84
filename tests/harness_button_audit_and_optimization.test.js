const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'style.css'), 'utf8');
const featureList = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'feature_list.json'), 'utf8'));

test('=== 1. KIỂM THỬ XUẤT MODULE TOÀN CỤC CHO WINDOW (HARNESS RUNTIME EXPORTS) ===', () => {
    // 1.1 Kiểm tra các module mở rộng được xuất an toàn vào window
    assert.ok(appJs.includes("if (typeof appCoordPicker !== 'undefined') window.appCoordPicker = appCoordPicker;"),
        'appCoordPicker phải được xuất vào window');
    assert.ok(appJs.includes("if (typeof appBluetoothRtk !== 'undefined') window.appBluetoothRtk = appBluetoothRtk;"),
        'appBluetoothRtk phải được xuất vào window');
    assert.ok(appJs.includes("if (typeof appResection !== 'undefined') window.appResection = appResection;"),
        'appResection phải được xuất vào window');
    assert.ok(appJs.includes("if (typeof appProfile !== 'undefined') window.appProfile = appProfile;"),
        'appProfile phải được xuất vào window');
    assert.ok(appJs.includes("if (typeof appTrenches !== 'undefined') window.appTrenches = appTrenches;"),
        'appTrenches phải được xuất vào window');
    assert.ok(appJs.includes("if (typeof appProject !== 'undefined') window.appProject = appProject;"),
        'appProject phải được xuất vào window');
});

test('=== 2. KIỂM THỬ XỬ LÝ AN TOÀN ĐA HÌNH CHO APPDATA.GETPOINTS VÀ ADDPOINT ===', () => {
    // 2.1 getPoints phòng vệ trước đối số không phải chuỗi hoặc null
    assert.ok(appJs.includes("typeof projectName === 'string' && projectName.trim()"),
        'getPoints phải kiểm tra projectName là chuỗi hợp lệ trước khi gọi endsWith');
    assert.ok(appJs.includes("list.length === 0 && typeof proj === 'string'"),
        'getPoints chỉ kiểm tra endsWith khi proj là chuỗi hợp lệ');

    // 2.2 addPoint linh hoạt nhận (point) hoặc (projectName, point)
    assert.ok(appJs.includes("if (projectName && typeof projectName === 'object' && !point)"),
        'addPoint hỗ trợ gọi với cú pháp linh hoạt (point)');
});

test('=== 3. KIỂM THỬ KÍCH THƯỚC VÙNG CẢM ỨNG DI ĐỘNG (TOUCH TARGETS >= 36PX) ===', () => {
    // 3.1 Nút Đổi ghim taskbar
    assert.match(styleCss, /\.btn-customize-pins\s*\{[\s\S]*?min-height:\s*36px;/,
        'Nút .btn-customize-pins phải có min-height tối thiểu 36px');

    // 3.2 Quick chip pills (KTT và lưu trữ ngoại tuyến)
    assert.match(styleCss, /\.quick-chip-pill\s*\{[\s\S]*?min-height:\s*38px;/,
        'Pill .quick-chip-pill phải có min-height tối thiểu 38px');

    // 3.3 Camera Tab Buttons chia đều tỷ lệ trên di động
    assert.match(styleCss, /\.camera-tab-btn\s*\{[\s\S]*?flex:\s*1 1 0;[\s\S]*?min-width:\s*0;/,
        'Nút tab camera phải co giãn linh hoạt 1 1 0 và min-width: 0');
});

test('=== 4. KIỂM THỬ KHUYẾN CÁO SAI SỐ GPS VÀ HIỆU NĂNG VECTOR CANVAS LEAFLET ===', () => {
    // 4.1 Khuyến cáo sai số GPS pháp lý
    assert.ok(indexHtml.includes('surveyor-gps-disclaimer'),
        'Trang web phải có banner cảnh báo surveyor-gps-disclaimer');
    assert.ok(indexHtml.includes('GPS điện thoại chỉ có độ chính xác sơ bộ'),
        'Banner phải nêu rõ GPS điện thoại chỉ có độ chính xác sơ bộ');

    // 4.2 Tăng tốc Canvas cho bản đồ Leaflet
    assert.ok(appJs.includes('preferCanvas: true'),
        'Leaflet map phải bật preferCanvas: true để tối ưu hiệu năng vector render');
});

test('=== 5. KIỂM THỬ GOVERNANCE THEO CHUẨN HARNESS-KIT (FEATURE F-011) ===', () => {
    // 5.1 F-011 được khai báo và đạt trạng thái done
    const f011 = featureList.features.find(f => f.id === 'F-011');
    assert.ok(f011, 'Phải có tính năng F-011 trong feature_list.json');
    assert.strictEqual(f011.status, 'done', 'F-011 phải đạt trạng thái done');
});
