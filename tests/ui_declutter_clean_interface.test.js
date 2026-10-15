// tests/ui_declutter_clean_interface.test.js
// Kiểm thử toàn diện việc tối ưu giao diện, loại bỏ rác chữ, bỏ nút "Mở ➔" thừa thãi và các tag/phụ đề tràn lan

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ CSS TRIỆT TIÊU RÁC CHỮ & NÚT MỞ RƯỜM RÀ (style.css) ===', () => {
    const cssPath = path.join(ROOT_DIR, 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 1.1 Kiểm tra các class rác chữ được ẩn triệt để
    assert.ok(css.includes('.compact-tool-tag,'), 'CSS phải ẩn .compact-tool-tag');
    assert.ok(css.includes('.compact-tool-desc,'), 'CSS phải ẩn .compact-tool-desc');
    assert.ok(css.includes('.btn-compact-launch,'), 'CSS phải ẩn .btn-compact-launch (nút Mở ➔)');
    assert.ok(css.includes('.drawer-leaf-sub,'), 'CSS phải ẩn .drawer-leaf-sub trong side drawer');
    assert.ok(css.includes('.tree-leaf-desc,'), 'CSS phải ẩn .tree-leaf-desc');
    assert.ok(css.includes('.feature-card-desc,'), 'CSS phải ẩn .feature-card-desc');
    assert.ok(css.includes('.btn-card-launch'), 'CSS phải ẩn .btn-card-launch');
    assert.ok(css.includes('.accordion-title-sub,'), 'CSS phải ẩn .accordion-title-sub');
});

test('=== 2. KIỂM THỬ LOGIC JAVASCRIPT APP.JS KHÔNG EMIT RÁC CHỮ VÀO DOM ===', () => {
    const appJsPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    // Trích xuất hàm renderAccordionToolsOnly()
    const startIdx = appJs.indexOf('renderAccordionToolsOnly() {');
    const endIdx = appJs.indexOf('renderDashboard() {');
    const accordionCode = appJs.substring(startIdx, endIdx);

    // 2.1 Không còn nút "Mở ➔" trong danh sách công cụ
    assert.strictEqual(accordionCode.includes('btn-compact-launch'), false, 'Đã loại bỏ hoàn toàn nút btn-compact-launch (Mở ➔)');
    assert.strictEqual(accordionCode.includes('Open ➔'), false, 'Không còn chữ Open ➔');
    assert.strictEqual(accordionCode.includes('Mở ➔'), false, 'Không còn chữ Mở ➔');

    // 2.2 Không còn tag quảng cáo và phụ đề dài dòng
    assert.strictEqual(accordionCode.includes('compact-tool-tag'), false, 'Đã loại bỏ compact-tool-tag khỏi template');
    assert.strictEqual(accordionCode.includes('compact-tool-desc'), false, 'Đã loại bỏ compact-tool-desc khỏi template');

    // 2.3 Thẻ chỉ còn icon, title và nút ghim
    assert.ok(accordionCode.includes('compact-tool-icon'), 'Thẻ có icon đại diện to rõ');
    assert.ok(accordionCode.includes('compact-tool-title'), 'Thẻ có tên chức năng sắc nét');
    assert.ok(accordionCode.includes('btn-compact-pin'), 'Thẻ có nút ghim ⭐');
});

test('=== 3. KIỂM THỬ BENTO ACTION TILES KHÔNG HIỆN TAG TIẾP THỊ & NÚT MỞ ===', () => {
    const appJsPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    // Trích xuất hàm renderDashboard()
    const startIdx = appJs.indexOf('renderDashboard()');
    const endIdx = appJs.indexOf('launchFeature(id)');
    const dashCode = appJs.substring(startIdx, endIdx);

    // Không còn fallback 'Mở ➔' hoặc f.tag trong pill của Bento Grid
    assert.strictEqual(dashCode.includes("|| f.tag || 'Mở ➔'"), false, 'Đã loại bỏ hoàn toàn tag tiếp thị và Mở ➔ khỏi Bento Grid');
    assert.ok(dashCode.includes("typeof f.metric === 'function' ? f.metric() : null"), 'Chỉ giữ lại số liệu động thực tế (như số lượng mốc sổ đo)');
});

test('=== 4. KIỂM THỬ MODAL ĐỔI GHIM KHÔNG HIỂN THỊ PHỤ ĐỀ DÀI DÒNG ===', () => {
    const appJsPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    // Trích xuất hàm updatePinPickerUi()
    const startIdx = appJs.indexOf('updatePinPickerUi()');
    const endIdx = appJs.indexOf('updateDashboardInfoRow()');
    const pinPickerCode = appJs.substring(startIdx, endIdx);

    // Không còn dòng ${f.sub} trong danh sách chọn ghim
    assert.strictEqual(pinPickerCode.includes('${f.sub}'), false, 'Đã loại bỏ hoàn toàn dòng phụ đề ${f.sub} khỏi modal đổi ghim');
});
