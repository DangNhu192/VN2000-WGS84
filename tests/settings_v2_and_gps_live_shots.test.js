// Kiểm thử tối ưu hóa Cài đặt hệ thống v2, chức năng ẩn "Đóng dấu" và đổi tên thống nhất sang "GPS live shots"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const polishCss = fs.readFileSync(path.join(ROOT, 'ui-polish.css'), 'utf8');
const userGuide = fs.readFileSync(path.join(ROOT, 'user-guide.html'), 'utf8');
const shell = require('../app-shell.js');
const core = require('../assistant-core.js');

test('1. Giao diện Cài đặt hệ thống v2 được cấu trúc lại (Sidebar Desktop / Dock Mobile, tìm nhanh, trạng thái tổng quan, công tắc trượt thật)', () => {
    const requiredIds = [
        'modalSettings', 'macSettingsDock', 'txtSettingsSearch',
        'stgPillKtt', 'stgPillStorage', 'stgPillUi', 'stgPillPostStamp',
        'settingsQuickCardsGrid', 'stgSearchEmpty',
        'stgCardMetaGeneral', 'stgCardMetaKtt', 'stgCardMetaStorage',
        'chkEnablePostStamp', 'sliderEnablePostStamp', 'badgePostStampState'
    ];
    for (const id of requiredIds) {
        assert.ok(html.includes(`id="${id}"`), `index.html phải có phần tử #${id}`);
    }
    assert.ok(html.includes('class="settings-workspace-shell"'), 'Cài đặt hệ thống có khung chia bố cục .settings-workspace-shell');
    assert.ok(html.includes('class="stg-switch"'), 'Cài đặt hệ thống dùng công tắc trượt thật .stg-switch');
    assert.ok(polishCss.includes('#modalSettings .settings-workspace-shell') && polishCss.includes('[data-theme="light"] #modalSettings .stg-card') && polishCss.includes('body.field-mode #modalSettings .stg-card'));

    const opens = (polishCss.match(/\{/g) || []).length;
    const closes = (polishCss.match(/\}/g) || []).length;
    assert.equal(opens, closes, 'ui-polish.css phải cân bằng dấu ngoặc nhọn');
});

test('2. Chức năng "Đóng dấu" trong GPS live shots ẩn mặc định và chỉ mở khi tích chọn trong Cài đặt hệ thống', () => {
    // 2.1 Trong HTML ban đầu, tab Đóng dấu và tùy chọn ảnh chọn từ máy đều ẩn sẵn
    assert.match(html, /id="tabCameraUpload"[^>]*style="display:\s*none;"/, 'tabCameraUpload phải ẩn mặc định trong HTML');
    assert.match(html, /id="wrapCamStampUseFieldOnUpload"[^>]*style="display:\s*none;/, 'Tùy chọn mẫu thực địa cho ảnh từ máy ẩn mặc định');
    assert.ok(html.includes('onchange="appModal.togglePostStampFeature(this.checked)"'), 'Công tắc Cài đặt gọi appModal.togglePostStampFeature');

    // 2.2 Kiểm thử hành vi runtime bằng giả lập DOM & localStorage
    const store = {};
    const mkEl = (initDisplay = '') => ({
        style: { display: initDisplay, backgroundColor: '' },
        checked: false,
        textContent: '',
        classList: {
            _set: new Set(),
            toggle(c, f) { if (f === undefined) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); } else if (f) this._set.add(c); else this._set.delete(c); },
            add(c) { this._set.add(c); },
            remove(c) { this._set.delete(c); },
            contains(c) { return this._set.has(c); }
        }
    });

    const els = {
        tabCameraLive: mkEl(''),
        tabCameraUpload: mkEl('none'),
        tabCameraGallery: mkEl(''),
        cameraTabPaneLive: mkEl('block'),
        cameraTabPaneUpload: mkEl('none'),
        cameraTabPaneGallery: mkEl('none'),
        wrapCamStampUseFieldOnUpload: mkEl('none'),
        chkEnablePostStamp: mkEl(),
        sliderEnablePostStamp: mkEl(),
        badgePostStampState: mkEl(),
        stgPillPostStamp: mkEl()
    };

    const prevLS = global.localStorage;
    const prevDoc = global.document;
    const prevWin = global.window;
    global.localStorage = {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
    };
    global.document = {
        documentElement: { setAttribute() {}, getAttribute() { return null; } },
        querySelectorAll: () => [],
        getElementById: (id) => els[id] || null
    };
    global.window = { addEventListener() {}, location: { search: '' } };

    try {
        delete require.cache[require.resolve('../app.js')];
        const { appModal } = require('../app.js');

        // Mặc định: tắt (ẩn)
        assert.equal(appModal.isPostStampEnabled(), false, 'Mặc định chức năng Đóng dấu phải ẩn');
        appModal.updateGeneralSettingsUI();
        assert.equal(els.chkEnablePostStamp.checked, false);
        assert.equal(els.badgePostStampState.textContent, 'Đang ẩn');

        // Bật trong Cài đặt hệ thống -> lưu localStorage và hiện tab
        appModal.togglePostStampFeature(true);
        assert.equal(appModal.isPostStampEnabled(), true);
        assert.equal(store.vn2k_enable_post_stamp, 'true');
        assert.equal(els.chkEnablePostStamp.checked, true);
        assert.equal(els.badgePostStampState.textContent, 'Đang mở');
        assert.equal(els.tabCameraUpload.style.display, '', 'Khi bật, tabCameraUpload phải hiển thị');
        assert.equal(els.wrapCamStampUseFieldOnUpload.style.display, 'inline-flex', 'Khi bật, tùy chọn upload stamp phải hiển thị');

        // Tắt lại -> ẩn tab ngay
        appModal.togglePostStampFeature(false);
        assert.equal(appModal.isPostStampEnabled(), false);
        assert.equal(els.tabCameraUpload.style.display, 'none', 'Khi tắt, tabCameraUpload phải ẩn ngay');
        assert.equal(els.wrapCamStampUseFieldOnUpload.style.display, 'none');
    } finally {
        global.localStorage = prevLS;
        global.document = prevDoc;
        global.window = prevWin;
        delete require.cache[require.resolve('../app.js')];
    }

    // 2.3 Xác nhận appCamera.switchTab chặn mở tab 'upload' khi chưa bật trong Cài đặt
    assert.ok(appJs.includes("if (tab === 'upload' && !appCamera.isPostStampEnabled())"), 'switchTab phải chặn mở tab upload khi chức năng đang ẩn');
});

test('3. Đổi tên thống nhất "Camera Đóng dấu" → "GPS live shots" trên toàn bộ UI, app-shell, Trợ lý AI và Cẩm nang', () => {
    // HTML: thẻ Trang chủ, cây menu, lưới menu, drawer, Cẩm nang nội bộ, nút hướng dẫn
    assert.ok(html.includes('>5. GPS live shots<'));
    assert.ok(html.includes('>2.3 GPS live shots<'));
    assert.ok(html.includes('>4. GPS LIVE SHOTS<'));
    assert.ok(html.includes('>6. GPS live shots<'));
    assert.ok(html.includes('title="Hướng dẫn GPS live shots"'));
    assert.ok(!html.includes('>5. Camera Đóng Dấu Tọa Độ Hiện Trường<'));
    assert.ok(!html.includes('>2.3 Camera thực địa đóng dấu thủy ấn<'));
    assert.ok(!html.includes('>4. CAMERA ĐÓNG DẤU THỦY ẤN<'));
    assert.ok(!html.includes('>2.3 Camera khảo sát đóng dấu tọa độ<'));

    // app.js: tiêu đề màn hình, dashboard, i18n, hướng dẫn
    assert.ok(appJs.includes('titleText = "4. GPS LIVE SHOTS";'));
    assert.ok(appJs.includes("'feature.camera': 'GPS live shots'"));
    assert.ok(appJs.includes("name: '5. GPS live shots'"));
    assert.ok(appJs.includes("title: { vi: 'GPS live shots — Chụp ảnh & Quay video tọa độ'"));

    // app-shell.js: tiêu đề rút gọn & mục lục (tìm được cả tên mới lẫn từ khóa cũ)
    assert.equal(shell.cleanTitle('4. GPS LIVE SHOTS', false), 'GPS live shots');
    assert.equal(shell.cleanTitle('4. GPS LIVE SHOTS', true), 'GPS live shots');
    assert.equal(shell.ITEM_META.drawerItem_camera[0], 'GPS live shots');
    assert.equal(shell.ITEM_META.drawerItem_camera[1], 'GPS live shots');

    // Trợ lý AI: hiểu cả "mở gps live shots" lẫn "mở camera"
    const rNew = core.route('mở gps live shots', { provinces: [] });
    assert.equal(rNew.intent, 'open');
    assert.equal(rNew.args.target, 'drawerItem_camera');
    const rOld = core.route('mở camera', { provinces: [] });
    assert.equal(rOld.intent, 'open');
    assert.equal(rOld.args.target, 'drawerItem_camera');

    // user-guide.html
    assert.ok(userGuide.includes('10. GPS live shots'));
    assert.ok(userGuide.includes('📷 GPS live shots'));
});
