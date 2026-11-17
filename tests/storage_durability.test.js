// Lưu trữ: xin giữ dữ liệu lâu dài; MiniCAD báo khi lưu lỗi và chỉ giữ một bản cho mỗi dự án.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function fnBody(sig) {
    const i = app.indexOf(sig); assert.ok(i >= 0, sig);
    let d = 0, j = app.indexOf('{', i);
    for (; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}' && --d === 0) break; }
    return app.slice(i, j + 1);
}

test('khởi động xin navigator.storage.persist()', () => {
    assert.ok(app.includes('navigator.storage.persisted().then(already => already || navigator.storage.persist())'));
});

test('storeCadShapes: ghi một khóa, chỉ xóa bản sao cũ khi ghi thành công', () => {
    const store = {}; let full = false; const toasts = [];
    const safeStorage = {
        setItem(k, v) { if (full) { toasts.push('full'); return false; } store[k] = v; return true; },
        removeItem(k) { delete store[k]; return true; }
    };
    const storeCadShapes = new Function('safeStorage', fnBody('function storeCadShapes(') + '\nreturn storeCadShapes;')(safeStorage);
    store['vn2k_cad_shapes_DuAn.csv'] = 'old';
    assert.equal(storeCadShapes('DuAn', 'DuAn.csv', 'new'), true);
    assert.deepEqual(store, { vn2k_cad_shapes_DuAn: 'new' });
    full = true; store['vn2k_cad_shapes_B.csv'] = 'keep';
    assert.equal(storeCadShapes('B', 'B.csv', 'x'), false);
    assert.equal(store['vn2k_cad_shapes_B.csv'], 'keep', 'Không xóa bản cũ khi chưa lưu được bản mới');
    assert.deepEqual(toasts, ['full']);
});

test('không còn chỗ nào ghi bản sao thứ hai của bản vẽ; phiên MiniCAD dùng safeStorage', () => {
    assert.ok(!/setItem\('vn2k_cad_shapes_' \+ (curProj|name|restoreName)/.test(app));
    const persist = fnBody('    persistSession() {');
    assert.ok(persist.includes('safeStorage.setItem(this.SESSION_KEY, json);'));
    assert.ok(persist.includes('savedShapes: inProject ? [] : (this.savedShapes || [])'));
    assert.ok(persist.includes("showToast('⚠️ Chưa lưu được bản vẽ MiniCAD"));
});
