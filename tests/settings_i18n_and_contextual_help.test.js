const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

// Giả lập môi trường trình duyệt nhẹ cho Node.js
if (typeof global.localStorage === 'undefined') {
    const store = {};
    global.localStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };
}

if (typeof global.document === 'undefined') {
    global.document = {
        documentElement: {
            setAttribute: (k, v) => {},
            getAttribute: (k) => null
        },
        querySelectorAll: (selector) => [],
        getElementById: (id) => ({
            classList: { toggle: () => {}, add: () => {}, remove: () => {} },
            style: {},
            textContent: '',
            value: ''
        })
    };
}

if (typeof global.window === 'undefined') {
    global.window = {
        addEventListener: () => {},
        location: { search: '' }
    };
}

const { appI18n, appGuide, appModal } = require('../app.js');

test('=== 1. KIỂM THỬ TAB 7 CHUNG (GENERAL) VÀ PHÂN LOẠI TAB CÀI ĐẶT ===', () => {
    // 1.1 Kiểm tra sự tồn tại của Tab 7 trong index.html
    assert(indexHtml.includes('id="btnTabGeneral"'), "Phải có nút tab btnTabGeneral trong index.html");
    assert(indexHtml.includes('id="settingsTabContentGeneral"'), "Phải có nội dung settingsTabContentGeneral trong index.html");
    
    // 1.2 Kiểm tra 7 tabs trong HTML
    const expectedTabs = ['General', 'Storage', 'Ktt', 'Datetime', 'Rtk', 'Resection', 'Optimizer'];
    expectedTabs.forEach(tab => {
        assert(indexHtml.includes(`id="btnTab${tab}"`), `Nút tab btnTab${tab} phải tồn tại`);
        assert(indexHtml.includes(`id="settingsTabContent${tab}"`), `Nội dung settingsTabContent${tab} phải tồn tại`);
    });

    // 1.3 Kiểm tra giao diện scroll ngang của thanh tab trong style.css
    assert(styleCss.includes('overflow-x: auto'), "style.css phải hỗ trợ cuộn ngang cho thanh tab cài đặt");
    assert(styleCss.includes('.settings-tab-btn'), "style.css phải có class định dạng cho từng tab nút bấm");

    // 1.4 Kiểm tra logic trong app.js
    assert(typeof appModal.switchSettingsTab === 'function', "appModal phải có hàm switchSettingsTab");
    assert(typeof appModal.updateGeneralSettingsUI === 'function', "appModal phải có hàm updateGeneralSettingsUI");
    assert(typeof appModal.setCoordFormat === 'function', "appModal phải có hàm setCoordFormat");
    assert(typeof appModal.setCoordDecimals === 'function', "appModal phải có hàm setCoordDecimals");
    assert(typeof appModal.toggleHaptic === 'function', "appModal phải có hàm toggleHaptic");
    assert(typeof appModal.clearAppCache === 'function', "appModal phải có hàm clearAppCache");
    assert(typeof appModal.resetAppSettings === 'function', "appModal phải có hàm resetAppSettings");
});

test('=== 2. KIỂM THỬ MODULE SONG NGỮ APPI18N (VIỆT NAM & ENGLISH) ===', () => {
    assert(appI18n, "Module appI18n phải được khởi tạo và export");
    assert(appI18n.dict && appI18n.dict.vi && appI18n.dict.en, "appI18n phải có đủ từ điển vi và en");

    // 2.1 Kiểm tra chuyển sang tiếng Anh
    appI18n.setLanguage('en', false);
    assert.strictEqual(appI18n.currentLang, 'en', "Ngôn ngữ hiện tại phải là 'en'");
    assert.strictEqual(global.localStorage.getItem('app_language'), 'en', "localStorage phải lưu 'en'");
    assert.strictEqual(appI18n.t('settings.tab.general'), '🌐 General', "Bản dịch tiếng Anh của tab General phải chính xác");
    assert.strictEqual(appI18n.t('header.back'), '◀ Back', "Bản dịch tiếng Anh của nút Back phải chính xác");

    // 2.2 Kiểm tra chuyển sang tiếng Việt
    appI18n.setLanguage('vi', false);
    assert.strictEqual(appI18n.currentLang, 'vi', "Ngôn ngữ hiện tại phải là 'vi'");
    assert.strictEqual(global.localStorage.getItem('app_language'), 'vi', "localStorage phải lưu 'vi'");
    assert.strictEqual(appI18n.t('settings.tab.general'), '🌐 Chung', "Bản dịch tiếng Việt của tab General phải chính xác");
    assert.strictEqual(appI18n.t('header.back'), '◀ Quay lại', "Bản dịch tiếng Việt của nút Quay lại phải chính xác");
});

test('=== 3. KIỂM THỬ HỆ THỐNG NÚT ? VÀ HƯỚNG DẪN NGỮ CẢNH RIÊNG CHO TỪNG CHỨC NĂNG ===', () => {
    // 3.1 Nút ? trên Header Cài đặt
    assert(indexHtml.includes('id="btnSettingsHelpGuide"'), "Header Cài đặt phải có nút ? id btnSettingsHelpGuide");

    // 3.2 Nút ? trên các chức năng chính trong index.html
    assert(indexHtml.includes('id="btnTransformHelpGuide"'), "Chuyển đổi tọa độ phải có nút ? btnTransformHelpGuide");
    assert(indexHtml.includes('id="btnDatamgmtHelpGuide"'), "Sổ đo & Dự án phải có nút ? btnDatamgmtHelpGuide");
    assert(indexHtml.includes('id="btnCadHelpGuide"'), "MiniCAD toolbar phải có nút ? btnCadHelpGuide");
    assert(indexHtml.includes('id="btnCadTableHelpGuide"'), "MiniCAD 5 bảng kê modal phải có nút ? btnCadTableHelpGuide");
    assert(indexHtml.includes('id="btnStakeoutHelpGuide"'), "Cắm mốc thực địa phải có nút ? btnStakeoutHelpGuide");
    assert(indexHtml.includes('id="btnGeodesyHelpGuide"'), "Tiện ích trắc địa phải có nút ? btnGeodesyHelpGuide");

    // 3.3 Modal hướng dẫn chuyên sâu #modalFeatureHelpGuide
    assert(indexHtml.includes('id="modalFeatureHelpGuide"'), "Phải có modal #modalFeatureHelpGuide trong DOM");
    assert(indexHtml.includes('id="guideModalBody"'), "Modal phải có vùng nội dung guideModalBody");

    // 3.4 Module appGuide có đầy đủ 14 hướng dẫn chuyên sâu
    assert(appGuide, "Module appGuide phải được khởi tạo và export");
    const requiredGuideKeys = [
        'settings_general', 'settings_storage', 'settings_ktt', 'settings_datetime',
        'settings_rtk', 'settings_resection', 'settings_optimizer',
        'transform', 'datamgmt', 'gps_map', 'cad', 'cad_tables', 'stakeout', 'geodesy'
    ];

    requiredGuideKeys.forEach(k => {
        assert(appGuide.guides[k], `Hướng dẫn cho chức năng ${k} phải tồn tại`);
        assert(appGuide.guides[k].title, `Hướng dẫn ${k} phải có tiêu đề song ngữ`);
        assert(appGuide.guides[k].purpose, `Hướng dẫn ${k} phải có mục đích nghiệp vụ`);
        assert(Array.isArray(appGuide.guides[k].steps) && appGuide.guides[k].steps.length >= 2, `Hướng dẫn ${k} phải có ít nhất 2 bước thực hiện 1-2-3`);
    });

    // 3.5 Kiểm thử mở hướng dẫn theo Tab Cài đặt đang active
    appModal.currentSettingsTab = 'ktt';
    appGuide.openSettingsTabGuide();
    assert.strictEqual(appGuide.activeGuideKey, 'settings_ktt', "openSettingsTabGuide phải mở đúng hướng dẫn KTT");

    appModal.currentSettingsTab = 'general';
    appGuide.openSettingsTabGuide();
    assert.strictEqual(appGuide.activeGuideKey, 'settings_general', "openSettingsTabGuide phải mở đúng hướng dẫn General");

    // 3.6 Kiểm thử cờ không tự động hiện lại
    appGuide.onDontShowAgainToggle(true);
    assert.strictEqual(global.localStorage.getItem('guide_dont_show_settings_general'), 'true', "Phải lưu cờ không hiển thị lại vào localStorage");
    
    appGuide.onDontShowAgainToggle(false);
    assert.strictEqual(global.localStorage.getItem('guide_dont_show_settings_general'), 'false', "Phải cập nhật cờ khi bỏ chọn");
});

test('=== 4. KIỂM THỬ KHỬ RÁC TEXT TRONG CÁC TAB CŨ (DE-CLUTTERING TEXT) ===', () => {
    // 4.1 Tab Storage không còn khối văn bản 3 bước cồng kềnh choán màn hình
    assert(!indexHtml.includes('3. Dán mã kịch bản bên dưới ➔ Bấm <b>Triển khai (Deploy)'), "Đã gỡ bỏ khối text 3 bước dài dòng khỏi tab Storage");
    assert(indexHtml.includes("appGuide.openGuide('settings_storage')"), "Tab Storage có nút xem hướng dẫn chi tiết qua appGuide");

    // 4.2 Tab KTT có nút xem hướng dẫn chi tiết qua appGuide
    assert(indexHtml.includes("appGuide.openGuide('settings_ktt')"), "Tab KTT có nút liên kết tới hướng dẫn quy đổi KTT");
});
