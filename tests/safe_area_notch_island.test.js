// Vùng an toàn cho tai thỏ / Dynamic Island / camera đục lỗ / xoay ngang.
// ui-polish.css là lớp cuối có !important, nên các ngưỡng inset phải nằm chính ở đó.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const polish = fs.readFileSync(path.join(root, 'ui-polish.css'), 'utf8');
const style = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

function ruleBody(css, selector) {
    const i = css.indexOf(selector + ' {');
    assert.ok(i >= 0, 'Thiếu rule ' + selector);
    return css.slice(i, css.indexOf('}', i));
}

test('header chừa inset trên (tai thỏ / Dynamic Island) và hai bên khi xoay ngang', () => {
    const h = ruleBody(polish, '\nheader.app-header.mac-top-bar');
    assert.match(h, /height:\s*calc\(var\(--sat-safe-top, 0px\) \+ 54px\) !important/);
    assert.match(h, /padding:\s*var\(--sat-safe-top, 0px\) calc\(var\(--sat-safe-right, 0px\) \+ 16px\) 0 calc\(var\(--sat-safe-left, 0px\) \+ 16px\) !important/);
    assert.doesNotMatch(h, /padding:\s*0 16px/, 'Không được ép padding-top về 0');
});

test('ngăn kéo Menu né tai thỏ (trên, trái) và thanh Home (dưới)', () => {
    const d = ruleBody(polish, '.nav-tree-drawer.mac-settings-sidebar');
    assert.match(d, /padding:\s*0 0 var\(--sat-safe-bottom, 0px\) var\(--sat-safe-left, 0px\) !important/);
    assert.match(ruleBody(polish, '.drawer-header.mac-sidebar-header'), /calc\(var\(--sat-safe-top, 0px\) \+ 16px\)/);
});

test('màn Chuyển đổi chừa inset hai bên', () => {
    assert.ok(style.includes('padding: 6px calc(var(--sat-safe-right) + 10px) 4px calc(var(--sat-safe-left) + 10px) !important;'));
});

test('điện thoại xoay ngang: Chuyển đổi chia trái/phải, JS và CSS cùng một điều kiện', () => {
    assert.ok(appJs.includes('function isTransformSideBySide()'));
    assert.ok(appJs.includes("matchMedia('(orientation: landscape) and (max-height: 620px)')"));
    assert.equal((appJs.match(/isTransformSideBySide\(\)/g) || []).length >= 4, true, 'Định nghĩa + 3 chỗ dùng');
    assert.ok(polish.includes('@media (orientation: landscape) and (max-height: 620px) and (max-width: 1023px)'));
    assert.match(polish, /#transformSplitLayout\.transform-split-layout \{[^}]*flex-direction: row !important;/);
});

test('xoay ngang: cột nút bản đồ không tràn mép dưới, hàng tab MiniCAD không tràn mép phải', () => {
    assert.match(polish, /#map-view-container \.map-right-controls \{[^}]*overflow-y: auto !important;/);
    assert.match(polish, /#mapCadToolbarHeader #cadTabGroup \{[^}]*min-width: 0 !important;[^}]*overflow-x: auto !important;/);
});
