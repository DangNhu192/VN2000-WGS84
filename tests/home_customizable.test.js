// Trang chủ tùy chỉnh: chọn 1, 2 hay nhiều chức năng; bố cục tự đổi theo số mục; bật/tắt các thành phần khác.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'ui-unified.css'), 'utf8');

// DOM giả tối thiểu: phần tử theo id, có thuộc tính và innerHTML.
function fakeEl(id) {
    const attrs = {};
    return {
        id, attrs, innerHTML: '', textContent: '', innerText: '', hidden: false, value: '', style: {},
        classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
        setAttribute(k, v) { attrs[k] = String(v); },
        getAttribute(k) { return k in attrs ? attrs[k] : null; },
        querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, focus() {}
    };
}
const els = {};
const store = {};
global.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => Object.keys(store).forEach(k => delete store[k])
};
global.document = {
    documentElement: fakeEl('html'), body: fakeEl('body'), readyState: 'complete',
    getElementById: id => els[id] || null,
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => fakeEl('x')
};
global.window = { addEventListener() {}, location: { search: '' }, innerWidth: 390 };
global.navigator = {};

const { appDashboard } = require('../app.js');
['bigActionTilesGrid', 'screen-menu', 'btnHubToggle', 'pinnedFeaturesCountBadge', 'pinPickerList', 'pinPickerCounter',
 'pinPickerInstruction', 'pinTaskbarPreviewContainer', 'pinHomeOptions'].forEach(id => { els[id] = fakeEl(id); });

test('bố cục theo số chức năng: 1 → một khối lớn, 2 → hai khối, 3–4 → lưới, từ 5 → ô gọn', () => {
    assert.equal(appDashboard.homeLayoutFor(1), 'hero');
    assert.equal(appDashboard.homeLayoutFor(2), 'duo');
    assert.equal(appDashboard.homeLayoutFor(3), 'grid');
    assert.equal(appDashboard.homeLayoutFor(4), 'grid');
    assert.equal(appDashboard.homeLayoutFor(5), 'compact');
    assert.equal(appDashboard.homeLayoutFor(16), 'compact');
});

test('danh sách ghim nhận 1, 2 hay nhiều mục, giữ thứ tự, bỏ id lạ/trùng; rỗng → mặc định 4 mục', () => {
    localStorage.clear();
    assert.deepEqual(appDashboard.getPinnedFeatureIds(), ['transform', 'map', 'stakeout', 'datamgmt']);
    localStorage.setItem('vn2000_pinned_features', JSON.stringify(['stakeout']));
    assert.deepEqual(appDashboard.getPinnedFeatureIds(), ['stakeout']);
    localStorage.setItem('vn2000_pinned_features', JSON.stringify(['camera', 'nope', 'camera', 'map']));
    assert.deepEqual(appDashboard.getPinnedFeatureIds(), ['camera', 'map']);
    const many = appDashboard.allFeatures.map(f => f.id);
    localStorage.setItem('vn2000_pinned_features', JSON.stringify(many));
    assert.equal(appDashboard.getPinnedFeatureIds().length, many.length);
    localStorage.setItem('vn2000_pinned_features', JSON.stringify(['nope']));
    assert.deepEqual(appDashboard.getPinnedFeatureIds(), ['transform', 'map', 'stakeout', 'datamgmt']);
    localStorage.setItem('vn2000_pinned_features', '{hỏng');
    assert.deepEqual(appDashboard.getPinnedFeatureIds(), ['transform', 'map', 'stakeout', 'datamgmt']);
});

test('Trang chủ vẽ đúng số ô, đúng thứ tự người dùng chọn và đặt data-layout tương ứng', () => {
    const grid = els.bigActionTilesGrid;
    for (const [ids, layout] of [[['map'], 'hero'], [['stakeout', 'transform'], 'duo'], [['camera', 'map', 'datamgmt'], 'grid'],
        [['transform', 'map', 'stakeout', 'datamgmt', 'camera', 'routing'], 'compact']]) {
        appDashboard.savePinnedFeatureIds(ids);
        assert.equal(grid.getAttribute('data-layout'), layout);
        assert.equal(grid.getAttribute('data-count'), String(ids.length));
        const rendered = [...grid.innerHTML.matchAll(/data-feature="([^"]+)"/g)].map(m => m[1]);
        assert.deepEqual(rendered, ids);
        assert.ok(grid.innerHTML.includes('<button type="button" class="big-action-tile'), 'Ô là nút bấm được bằng bàn phím');
        assert.equal(els.pinnedFeaturesCountBadge.textContent, `${ids.length} mục`);
    }
});

test('thành phần khác: mặc định gọn — chỉ Chuyển đổi nhanh; GPS, dự án tắt (đã có trên thanh tiêu đề); "Tất cả chức năng" thu gọn', () => {
    localStorage.removeItem(appDashboard.HOME_WIDGETS_KEY);
    assert.deepEqual(appDashboard.getHomeWidgets(), { quick: true, gps: false, project: false, all: false });
    appDashboard.applyHomeWidgets();
    assert.equal(els['screen-menu'].getAttribute('data-home-off'), 'gps project all');
    assert.equal(els.btnHubToggle.getAttribute('aria-expanded'), 'false');

    appDashboard.saveHomeWidgets({ quick: false, gps: true, project: false, all: true, rác: 1 });
    assert.deepEqual(JSON.parse(localStorage.getItem(appDashboard.HOME_WIDGETS_KEY)), { quick: false, gps: true, project: false, all: true });
    assert.equal(els['screen-menu'].getAttribute('data-home-off'), 'quick project');
    assert.equal(els.btnHubToggle.getAttribute('aria-expanded'), 'true');

    appDashboard.toggleAllFeaturesHub();
    assert.equal(appDashboard.getHomeWidgets().all, false, 'Nút "Tất cả chức năng" nhớ trạng thái thu gọn');
});

test('hộp Tùy chỉnh: chọn quá 4 mục được, luôn giữ ít nhất 1, sắp thứ tự bằng ▲▼, lưu cả thành phần khác', () => {
    appDashboard.savePinnedFeatureIds(['transform']);
    appDashboard.currentPinTab = 'home';
    appDashboard.renderPinPicker();
    appDashboard.togglePinSelection('transform');
    assert.deepEqual(appDashboard.tempSelectedPins, ['transform'], 'Không bỏ được mục cuối cùng');
    ['map', 'stakeout', 'datamgmt', 'camera', 'routing'].forEach(id => appDashboard.togglePinSelection(id));
    assert.equal(appDashboard.tempSelectedPins.length, 6);
    appDashboard.movePinSelection('routing', -1);
    assert.deepEqual(appDashboard.tempSelectedPins.slice(-2), ['routing', 'camera']);
    appDashboard.movePinSelection('transform', -1);
    assert.equal(appDashboard.tempSelectedPins[0], 'transform', 'Mục đầu không lên được nữa');
    assert.match(els.pinPickerCounter.innerText, /6 mục/);
    assert.match(els.pinTaskbarPreviewContainer.innerHTML, /data-layout="compact"/);
    assert.match(els.pinHomeOptions.innerHTML, /toggleTempHomeWidget\('quick'\)/);

    appDashboard.toggleTempHomeWidget('gps');
    appDashboard.tempSelectedTaskbarPins = ['transform', 'map', 'stakeout'];
    appDashboard.savePinSelection();
    assert.equal(appDashboard.getPinnedFeatureIds().length, 6);
    assert.equal(appDashboard.getHomeWidgets().gps, false);
});

test('mọi chức năng chọn được đều có tên tiếng Anh và đích mở có thật', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    appDashboard.allFeatures.forEach(f => {
        assert.ok(app.includes(`'feature.${f.id}': '`), `Thiếu bản dịch feature.${f.id}`);
        const m = String(f.action).match(/navigateTo\('([^']+)'\)/);
        if (m) assert.ok(app.includes(`action === '${m[1]}'`), `navigateTo('${m[1]}') không có xử lý`);
    });
});

test('HTML & CSS: nút thu gọn "Tất cả chức năng", mục cài đặt Trang chủ, quy tắc cho từng bố cục và thành phần', () => {
    assert.match(html, /id="btnHubToggle"[^>]*aria-controls="homeFeatureHubBody"/);
    assert.ok(html.includes('id="homeFeatureHubBody"'));
    assert.ok(html.includes('id="btnSettingHomeCustomize"'), 'Cài đặt chung có mục Trang chủ');
    assert.ok(html.includes('id="pinHomeOptions"'));
    assert.ok(!html.includes('btnSettingViewTree'), 'Bỏ bố cục "Cây thư mục" cũ');
    for (const layout of ['hero', 'duo', 'compact']) assert.ok(css.includes(`[data-layout="${layout}"]`), layout);
    for (const w of ['quick', 'gps', 'project', 'all']) assert.ok(css.includes(`[data-home-off~="${w}"]`), w);
});

test('Trang chủ: thanh "Chức năng của tôi" (Thực địa + Tùy chỉnh) và các ô đứng trước Chuyển đổi nhanh', () => {
    const at = id => html.indexOf(`id="${id}"`);
    assert.ok(at('pinnedFeaturesCountBadge') < at('bigActionTilesGrid'));
    assert.ok(at('bigActionTilesGrid') < at('fieldWorkspace'), 'Ô chức năng trước khối chuyển đổi');
    assert.ok(at('fieldWorkspace') < at('fwQuick'));
    const bar = html.slice(html.indexOf('class="dashboard-section-bar"'), at('bigActionTilesGrid'));
    assert.ok(bar.includes('id="fwField"') && bar.includes('btn-customize-pins'), 'Thực địa và Tùy chỉnh cùng một hàng');
    assert.ok(html.includes('data-i18n="dash.section_title">Chức năng của tôi<'));
    const fw = fs.readFileSync(path.join(ROOT, 'field-workspace.js'), 'utf8');
    assert.ok(fw.includes("#fwToolbar [data-fw-text]"), 'Nhãn nút Thực địa vẫn được dịch sau khi chuyển chỗ');
    assert.ok(css.includes('#dashboardModernHub #fieldWorkspace {'), 'Chuyển đổi nhanh rộng bằng các ô');
});
