// Kiểm thử tính năng tùy chỉnh thông tin đóng dấu Camera (tự nhập / sửa / ẩn hiện / thêm trường mới)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const polishCss = fs.readFileSync(path.join(ROOT, 'ui-polish.css'), 'utf8');

function extractMethod(sig) {
    const i = appJs.indexOf(sig);
    assert.ok(i >= 0, `Không tìm thấy ${sig}`);
    let d = 0, j = appJs.indexOf('{', i + sig.length - 1);
    for (; j < appJs.length; j++) {
        if (appJs[j] === '{') d++;
        else if (appJs[j] === '}' && --d === 0) break;
    }
    return appJs.slice(i, j + 1);
}

test('1. Giao diện Camera có đủ các ô tùy chỉnh trường thông tin như hình mẫu và nút thêm trường mới', () => {
    const requiredIds = [
        'btnToggleCamStampEditor',
        'panelCameraStampCustomizer',
        'cameraStampPreviewCanvas',
        'txtCamStampHeader',
        'chkCamStampMarkProj', 'txtCamStampMark', 'txtCamStampProject',
        'chkCamStampVn2000', 'txtCamStampX', 'txtCamStampY', 'txtCamStampKtt',
        'chkCamStampWgs84', 'txtCamStampLat', 'txtCamStampLng',
        'chkCamStampFieldLine', 'chkCamStampAcc', 'txtCamStampAcc',
        'chkCamStampHeading', 'txtCamStampHeading', 'txtCamStampMiddle',
        'chkCamStampTime', 'txtCamStampTime', 'chkCamStampUseFieldOnUpload',
        'chkCamStampAddress', 'txtCamStampAddress',
        'btnAddCamStampField', 'cameraStampCustomFieldsList'
    ];
    for (const id of requiredIds) {
        assert.ok(html.includes(`id="${id}"`), `index.html phải có phần tử #${id}`);
    }
    // Bảo toàn kiểm thử cũ: không khôi phục boxCameraTagPreview
    assert.ok(!html.includes('id="boxCameraTagPreview"'));
    // CSS hỗ trợ Dark, Light, Field Mode và cân bằng ngoặc
    assert.ok(polishCss.includes('.cam-stamp-panel') && polishCss.includes('[data-theme="light"] .cam-stamp-panel') && polishCss.includes('body.field-mode .cam-stamp-panel'));
    const opens = (polishCss.match(/\{/g) || []).length;
    const closes = (polishCss.match(/\}/g) || []).length;
    assert.strictEqual(opens, closes, 'ui-polish.css phải cân bằng dấu ngoặc nhọn');
});

test('2. Logic getWatermarkData dựng đúng 5 dòng chuẩn như hình mẫu và cho phép tự nhập / thêm / ẩn hiện trường', () => {
    const getDef = extractMethod('    getDefaultStampConfig() {');
    const getData = extractMethod('    getWatermarkData(opts = {}) {');
    const factory = new Function('AppState', 'appStakeout', 'VnAdmin2025', 'window', 'convertWgsToVn2k', `
        const obj = {
            selectedPoint: { name: 'M1', x: 1142489.578, y: 581980.464, lat: 10.330361, lng: 105.750340 },
            stampConfig: null,
            ${getDef},
            getStampConfig() { if (!this.stampConfig) this.stampConfig = this.getDefaultStampConfig(); return this.stampConfig; },
            ${getData}
        };
        return obj;
    `);

    const fixedDate = new Date(2026, 10, 1, 11, 35, 22);
    const cam = factory(
        { currentProject: 'BC_VSV_UD_MT.csv', kttDeg: 105, kttMin: 0, muiVal: 3, lastGps: { lat: 10.330361, lng: 105.750340, accuracy: 2.2 } },
        { compassHeading: 125 },
        { cachedAddress: () => 'Phường Sa Đéc, Tỉnh Đồng Tháp' },
        { getAppEffectiveDate: () => fixedDate },
        () => ({ X: 1142489.578, Y: 581980.464 })
    );

    // 2.1 Mặc định: không hiện "Hướng" trừ khi người dùng bật, khớp hình mẫu
    const d0 = cam.getWatermarkData();
    assert.equal(d0.headerTitle, 'HỆ VN-2000 | ẢNH NGHIỆM THU HIỆN TRƯỜNG');
    assert.deepEqual(d0.lines, [
        '📍 MỐC: M1 | DỰ ÁN: BC_VSV_UD_MT',
        "• VN-2000: X = 1142489.578 m | Y = 581980.464 m (KTT 105°00' Múi 3°)",
        '• WGS-84:  Lat = 10.330361° | Lng = 105.750340°',
        '• THỰC ĐỊA: Sai số: ±2.2m | Thời gian: 01/11/2026 11:35:22',
        '• ĐỊA CHỈ: Phường Sa Đéc, Tỉnh Đồng Tháp'
    ]);

    // 2.2 Tự nhập toàn bộ các trường giống hệt hình mẫu + thêm 2 dòng tùy biến + bật/tắt
    cam.stampConfig = Object.assign(cam.getDefaultStampConfig(), {
        headerTitle: 'HỆ VN-2000 | ẢNH NGHIỆM THU HIỆN TRƯỜNG',
        markName: 'Cổng công ty Emivest Feedmill',
        projectName: 'BC_VSV_UD_MT',
        x: '1142489.578',
        y: '581980.464',
        kttText: "KTT 105°00' Múi 3°",
        lat: '10.330361',
        lng: '105.750340',
        accuracy: '±2.2m',
        timeText: '01/11/2026 11:35:22',
        address: 'Phường Sa Đéc, Tỉnh Đồng Tháp',
        customFields: [
            { id: 'c1', label: 'HẠNG MỤC', value: 'Nghiệm thu cổng chính', color: '#fde047', enabled: true },
            { id: 'c2', label: 'ẨN ĐI', value: 'Không hiện', color: '#f1f5f9', enabled: false },
            { id: 'c3', label: 'NGƯỜI ĐO', value: 'KS. Nguyễn Văn A', color: '#38bdf8', enabled: true }
        ]
    });

    const d1 = cam.getWatermarkData();
    assert.equal(d1.lines[0], '📍 MỐC: Cổng công ty Emivest Feedmill | DỰ ÁN: BC_VSV_UD_MT');
    assert.equal(d1.lines[1], "• VN-2000: X = 1142489.578 m | Y = 581980.464 m (KTT 105°00' Múi 3°)");
    assert.equal(d1.lines[2], '• WGS-84:  Lat = 10.330361° | Lng = 105.750340°');
    assert.equal(d1.lines[3], '• THỰC ĐỊA: Sai số: ±2.2m | Thời gian: 01/11/2026 11:35:22');
    assert.equal(d1.lines[4], '• ĐỊA CHỈ: Phường Sa Đéc, Tỉnh Đồng Tháp');
    assert.equal(d1.lines[5], '• HẠNG MỤC: Nghiệm thu cổng chính');
    assert.equal(d1.lines[6], '• NGƯỜI ĐO: KS. Nguyễn Văn A');
    assert.equal(d1.lines.length, 7, 'Dòng custom đã tắt không được hiển thị');

    // 2.3 Bật Hướng + mục giữa + ẩn WGS-84
    cam.stampConfig.showHeading = true;
    cam.stampConfig.middleNote = 'Cao độ Z: 3.45m';
    cam.stampConfig.showWgs84 = false;
    const d2 = cam.getWatermarkData();
    assert.ok(!d2.lines.some(l => l.includes('WGS-84')), 'Ẩn dòng WGS-84 thành công');
    assert.ok(d2.lines.some(l => l === '• THỰC ĐỊA: Sai số: ±2.2m | Hướng: 125° | Cao độ Z: 3.45m | Thời gian: 01/11/2026 11:35:22'));

    // 2.4 Tab Đóng dấu ảnh từ máy (postStamp): mặc định trung thực ghi ĐÓNG DẤU SAU; khi người dùng tự nhập vẫn tôn trọng
    cam.stampConfig = cam.getDefaultStampConfig();
    const dPostAuto = cam.getWatermarkData({ postStamp: true, captureDate: fixedDate });
    assert.equal(dPostAuto.postStamp, true);
    assert.ok(dPostAuto.lines.some(l => l.includes('ĐÓNG DẤU SAU') && l.includes('Sai số: không đo')));

    cam.stampConfig.useFieldFormatOnUpload = true;
    cam.stampConfig.accuracy = '±2.2m';
    cam.stampConfig.timeText = '01/11/2026 11:35:22';
    const dPostCustom = cam.getWatermarkData({ postStamp: true, captureDate: fixedDate });
    assert.equal(dPostCustom.headerTitle, 'HỆ VN-2000 | ẢNH NGHIỆM THU HIỆN TRƯỜNG');
    assert.ok(dPostCustom.lines.some(l => l === '• THỰC ĐỊA: Sai số: ±2.2m | Thời gian: 01/11/2026 11:35:22'));
});
