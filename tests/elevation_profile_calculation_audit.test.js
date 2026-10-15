// tests/elevation_profile_calculation_audit.test.js
// Bộ kiểm thử tự động toàn diện kiểm toán công thức tính toán và xóa bỏ mốc mặc định ngầm trong "Trắc dọc & đào đắp"

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Mock DOM môi trường Node.js
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    }
};
global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { classList: { add: () => {}, remove: () => {} } },
    elements: {},
    getElementById(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                value: '',
                innerText: '',
                innerHTML: '',
                style: {},
                classList: {
                    contains: () => false,
                    add: () => {},
                    remove: () => {},
                    toggle: () => {}
                },
                getContext: () => ({
                    clearRect: () => {},
                    fillRect: () => {},
                    fillText: () => {},
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {},
                    fill: () => {},
                    save: () => {},
                    restore: () => {},
                    arc: () => {},
                    setLineDash: () => {},
                    strokeRect: () => {},
                    closePath: () => {}
                })
            };
        }
        return this.elements[id];
    },
    querySelectorAll: () => []
};

global.triggerHaptic = () => {};
global.showToast = () => {};
global.safeStorage = {
    setItem: () => {},
    getItem: () => null
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

const { appElevationProfile, AppState } = require(path.join(ROOT_DIR, 'app.js'));

test('=== 1. KIỂM THỬ XÓA BỎ DỮ LIỆU MẶC ĐỊNH NGẦM (ZERO HIDDEN FALLBACK) ===', () => {
    // Giả lập dự án có 10 mốc ranh giới tọa độ (nhưng không phải cọc trắc dọc)
    global.appData = {
        getPoints: () => [
            { id: 'R1', name: 'R1', x: 1144000.0, y: 585000.0, z: 0.0 },
            { id: 'R2', name: 'R2', x: 1144004.4, y: 585000.0, z: 0.0 }
        ]
    };

    // Khi người dùng chưa nạp cọc vào alignPoints (alignPoints = [])
    appElevationProfile.alignPoints = [];
    appElevationProfile.calculateAndRender();

    const tbody = document.getElementById('tableVolumeBody');
    assert.ok(tbody.innerHTML.includes('Chưa có đủ cọc tuyến'), 'Không được tự ý lấy mốc ngầm từ dự án khi cọc tuyến rỗng');

    const resCut = document.getElementById('resTotalCutVol');
    const resFill = document.getElementById('resTotalFillVol');
    assert.strictEqual(resCut.innerText, '0.0 m³', 'Khối lượng đào phải là 0.0 m³ khi chưa có cọc');
    assert.strictEqual(resFill.innerText, '0.0 m³', 'Khối lượng đắp phải là 0.0 m³ khi chưa có cọc');
});

test('=== 2. KIỂM THỬ TÍCH TOÁN CHÍNH XÁC KHI Z_THIẾT KẾ = Z_TỰ NHIÊN = 12M (KHÔNG CÒN LỖI 947.7 M³) ===', () => {
    // Tình huống người dùng phản ánh:
    // Tuyến dài 4.4m, Z thiết kế = 12.00m, Z tự nhiên = 12.00m
    appElevationProfile.alignPoints = [
        { id: 'C1', name: 'C1', x: 1144000.0, y: 585000.0, z: 12.00 },
        { id: 'C2', name: 'C2', x: 1144004.4, y: 585000.0, z: 12.00 }
    ];

    document.getElementById('txtProfileDesignZ0').value = '12.00';
    document.getElementById('txtProfileSlope').value = '0.00';
    document.getElementById('txtProfileWidthB').value = '6.00';
    document.getElementById('txtProfileTaluyM').value = '1.00';

    appElevationProfile.calculateAndRender();

    const items = appElevationProfile.profileData;
    assert.strictEqual(items.length, 2, 'Phải có 2 cọc');
    assert.strictEqual(items[0].deltaH, 0, 'Chênh cao cọc C1 phải bằng 0');
    assert.strictEqual(items[1].deltaH, 0, 'Chênh cao cọc C2 phải bằng 0');
    assert.strictEqual(items[0].area, 0, 'Diện tích mặt cắt C1 phải bằng 0');
    assert.strictEqual(items[1].area, 0, 'Diện tích mặt cắt C2 phải bằng 0');

    const resFill = document.getElementById('resTotalFillVol');
    const resCut = document.getElementById('resTotalCutVol');
    assert.strictEqual(resFill.innerText, '0.0 m³', 'Tổng đắp PHẢI là 0.0 m³ (Đã triệt tiêu hoàn toàn con số ảo giác 947.7 m³)');
    assert.strictEqual(resCut.innerText, '0.0 m³', 'Tổng đào PHẢI là 0.0 m³');
});

test('=== 3. KIỂM THỬ TÍNH TOÁN ĐẮP CHUẨN TCVN: B=6M, M=1.0, ĐẮP 1.0M TRÊN ĐOẠN 4.4M ===', () => {
    // 2 cọc cách nhau 4.4m, Z tự nhiên = 11.00m, Z thiết kế = 12.00m (chênh cao h = +1.0m)
    appElevationProfile.alignPoints = [
        { id: 'C1', name: 'C1', x: 1144000.0, y: 585000.0, z: 11.00 },
        { id: 'C2', name: 'C2', x: 1144004.4, y: 585000.0, z: 11.00 }
    ];

    document.getElementById('txtProfileDesignZ0').value = '12.00';
    document.getElementById('txtProfileSlope').value = '0.00';
    document.getElementById('txtProfileWidthB').value = '6.00';
    document.getElementById('txtProfileTaluyM').value = '1.00';

    appElevationProfile.calculateAndRender();

    const items = appElevationProfile.profileData;
    // F = B*h + m*h^2 = 6*1 + 1*(1^2) = 7 m2
    assert.strictEqual(items[0].area, 7.0, 'Diện tích F1 phải là 7.0 m²');
    assert.strictEqual(items[1].area, 7.0, 'Diện tích F2 phải là 7.0 m²');

    // Thể tích đắp V = F * L = 7 * 4.4 = 30.8 m3
    const resFill = document.getElementById('resTotalFillVol');
    assert.strictEqual(resFill.innerText, '30.8 m³', 'Thể tích đắp phải là 30.8 m³ chuẩn toán học TCVN');
});

test('=== 4. KIỂM THỬ THÊM CỌC THỦ CÔNG & BIÊN TẬP CAO ĐỘ TRỰC TIẾP TRÊN BẢNG ===', () => {
    appElevationProfile.alignPoints = [];
    appElevationProfile.addManualAlignPoint();
    assert.strictEqual(appElevationProfile.alignPoints.length, 1, 'Đã thêm 1 cọc');
    assert.strictEqual(appElevationProfile.alignPoints[0].name, 'C1');

    appElevationProfile.addManualAlignPoint();
    assert.strictEqual(appElevationProfile.alignPoints.length, 2, 'Đã thêm cọc thứ 2');
    assert.strictEqual(appElevationProfile.alignPoints[1].name, 'C2');

    // Cập nhật cao độ Z_TN trực tiếp từ bảng
    appElevationProfile.updateAlignPointZ(0, '12.50');
    assert.strictEqual(appElevationProfile.alignPoints[0].z, 12.50, 'Đã cập nhật Z cọc 1 thành 12.50m');

    // Xóa 1 cọc
    appElevationProfile.removeAlignPoint(1);
    assert.strictEqual(appElevationProfile.alignPoints.length, 1, 'Sau khi xóa còn 1 cọc');
});

test('=== 5. KIỂM THỬ DÁN NHANH CỌC TUYẾN (PARSE PASTE ALIGN TEXT) ===', () => {
    appElevationProfile.alignPoints = [];
    const ta = document.getElementById('txtPasteAlignArea');
    ta.value = `
Cọc1\t1144000.0\t585000.0\t11.50
Cọc2\t1144020.0\t585000.0\t12.00
Cọc3\t1144050.0\t585000.0\t12.80
`;

    appElevationProfile.parsePasteAlignText();
    assert.strictEqual(appElevationProfile.alignPoints.length, 3, 'Đã nạp thành công 3 cọc từ dữ liệu dán');
    assert.strictEqual(appElevationProfile.alignPoints[0].name, 'Cọc1');
    assert.strictEqual(appElevationProfile.alignPoints[0].z, 11.50);
    assert.strictEqual(appElevationProfile.alignPoints[1].name, 'Cọc2');
    assert.strictEqual(appElevationProfile.alignPoints[1].z, 12.00);
    assert.strictEqual(appElevationProfile.alignPoints[2].name, 'Cọc3');
    assert.strictEqual(appElevationProfile.alignPoints[2].z, 12.80);
});
