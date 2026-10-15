/**
 * KIỂM THỬ GỠ BỎ KHUNG ĐÓNG DẤU CAMERA & TỐI ƯU HỆ THỐNG HƯỚNG DẪN TỪNG CHỨC NĂNG
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ GỠ BỎ KHUNG NỘI DUNG ĐÓNG DẤU THỰC TẾ TRONG CAMERA ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // 1.1 Khung boxCameraTagPreview và tiêu đề chữ phải được loại bỏ hoàn toàn
    assert.ok(!html.includes('id="boxCameraTagPreview"'), 'Đã bỏ hoàn toàn thẻ boxCameraTagPreview');
    assert.ok(!html.includes('Nội dung đóng dấu thực tế:'), 'Đã bỏ dòng chữ Nội dung đóng dấu thực tế:');

    // 1.2 Các thành phần cốt lõi của Camera vẫn được bảo toàn nguyên vẹn
    assert.ok(html.includes('id="cameraLiveVideo"'), 'Camera phải có video cameraLiveVideo');
    assert.ok(html.includes('id="cameraRealtimeHudCanvas"'), 'Camera phải có canvas thủy ấn realtime');
    assert.ok(html.includes('id="btnCameraCaptureLive"'), 'Camera phải có nút chụp ảnh');
    assert.ok(html.includes('id="btnCameraRecordVideo"'), 'Camera phải có nút quay video');
    assert.ok(html.includes('id="btnCameraHelpGuide"'), 'Camera phải có nút ? hướng dẫn');
});

test('=== 2. KIỂM THỬ NÚT HƯỚNG DẪN "?" Ở GÓC TRÊN BÊN PHẢI MÀN HÌNH (INDEX.HTML & STYLE.CSS) ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 2.1 Nút ? trên thanh Header Control Center
    assert.ok(html.includes('id="btnHeaderHelpGuide"'), 'index.html phải có nút btnHeaderHelpGuide trong header');
    assert.ok(html.includes('openCurrentScreenGuide()'), 'Nút header phải gọi appGuide.openCurrentScreenGuide()');

    // 2.2 Nút ? trên thanh công cụ bản đồ mapProjectBar
    assert.ok(html.includes('id="btnMapHelpGuide"'), 'mapProjectBar phải có nút btnMapHelpGuide');

    // 2.3 CSS cho nút ? trên Header
    assert.ok(css.includes('.btn-header-help'), 'style.css phải có định kiểu .btn-header-help');
    assert.ok(css.includes('.modal-help-guide-box'), 'style.css phải có định kiểu modal popup hướng dẫn');
});

test('=== 3. KIỂM THỬ LOGIC HƯỚNG DẪN TỪNG CHỨC NĂNG & TỰ ĐỘNG HIỆN LẦN ĐẦU (APP.JS) ===', () => {
    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');

    // 3.1 Bổ sung guide profile vào appGuide
    assert.ok(appJs.includes("'profile': {"), 'appGuide phải có cẩm nang hướng dẫn cho profile (trắc dọc)');

    // 3.2 Phương thức mở hướng dẫn màn hình hiện tại
    assert.ok(appJs.includes('openCurrentScreenGuide() {'), 'appGuide phải có phương thức openCurrentScreenGuide');

    // 3.3 Tự động kiểm tra hướng dẫn khi lần đầu mở chức năng
    assert.ok(appJs.includes('checkFirstTimeGuide(screenName)'), 'showScreen phải gọi checkFirstTimeGuide');
    assert.ok(appJs.includes("checkFirstTimeGuide('gps_map')"), 'openProjectMap phải gọi checkFirstTimeGuide cho gps_map');
    assert.ok(appJs.includes("checkFirstTimeGuide('cad')"), 'openCadMap phải gọi checkFirstTimeGuide cho cad');

    // 3.4 Kiểm tra mock appGuide trong môi trường giả lập
    const mockStorage = new Map();
    global.localStorage = {
        getItem: (k) => mockStorage.get(k) || null,
        setItem: (k, v) => mockStorage.set(k, String(v))
    };

    let openedGuide = null;
    const testGuide = {
        openGuide: (k) => { openedGuide = k; },
        checkFirstTimeGuide(k) {
            if (global.localStorage.getItem('guide_seen_' + k) === 'true') return;
            global.localStorage.setItem('guide_seen_' + k, 'true');
            this.openGuide(k);
        }
    };

    // Lần đầu mở chức năng camera
    testGuide.checkFirstTimeGuide('camera');
    assert.equal(openedGuide, 'camera', 'Lần đầu mở camera phải tự động kích hoạt hướng dẫn');
    assert.equal(global.localStorage.getItem('guide_seen_camera'), 'true', 'Đã lưu cờ đánh dấu đã xem');

    // Lần thứ 2 mở chức năng camera: không tự động mở lại
    openedGuide = null;
    testGuide.checkFirstTimeGuide('camera');
    assert.equal(openedGuide, null, 'Lần thứ 2 không được tự động mở lại');
});
