// Mọi lời gọi appX.method(...) trong index.html và các file JS của ứng dụng phải trỏ tới hàm có thật.
// (Bắt lỗi kiểu nút "＋ Dự án mới" gọi appData.saveProjectsList không tồn tại.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILES = ['index.html', 'app.js', 'field-workspace.js', 'vn2000-rezone.js', 'vn-admin-2025.js', 'import-preview.js', 'app-shell.js'];
const src = Object.fromEntries(FILES.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const allJs = FILES.filter(f => f.endsWith('.js')).map(f => src[f]).join('\n');

// Phạm vi thân của "const appX = {" hoặc "appX = {" trong app.js (đến dòng "};" ở cột 0).
function objectBody(name) {
    const m = new RegExp(`^(?:const |let |var |window\\.)?${name} = \\{`, 'm').exec(allJs);
    if (!m) return null;
    const end = allJs.indexOf('\n};', m.index);
    return allJs.slice(m.index, end < 0 ? undefined : end);
}
function defines(obj, method) {
    const body = objectBody(obj);
    const inBody = body && new RegExp(`^\\s{4}(?:async\\s+)?${method}\\s*\\(|^\\s{4}${method}\\s*:`, 'm').test(body);
    const assigned = new RegExp(`\\b${obj}\\.${method}\\s*=`).test(allJs);
    return Boolean(inBody || assigned);
}

test('không có lời gọi appX.method(...) nào trỏ tới hàm không tồn tại', () => {
    const missing = [];
    for (const [file, text] of Object.entries(src)) {
        const re = /\b(app[A-Z][A-Za-z0-9]*)\.([A-Za-z_$][\w$]*)\s*\(/g;
        let m;
        while ((m = re.exec(text))) {
            const [, obj, method] = m;
            if (!objectBody(obj)) continue; // đối tượng ngoài phạm vi (thư viện, biến DOM)
            if (defines(obj, method)) continue;
            // Lời gọi có kiểm tra trước (if (appX.method) / appX.method && ...) là tùy chọn, bỏ qua.
            const before = text.slice(Math.max(0, m.index - 160), m.index);
            if (before.includes(`${obj}.${method})`) || before.includes(`${obj}.${method} &&`) || before.includes(`${obj}.${method} ===`)) continue;
            const line = text.slice(0, m.index).split('\n').length;
            if (/^\s*(\/\/|\*|<!--)/.test(text.split('\n')[line - 1])) continue;
            missing.push(`${obj}.${method} (${file}:${line})`);
        }
    }
    assert.deepEqual(missing, []);
});

test('3 nút đã sửa gọi đúng hàm có thật', () => {
    const app = src['app.js'];
    assert.ok(app.includes('appCadTool.deleteShape(${targetData.shapeIndex})'), 'Nút 🗑️ trong cửa sổ khối MiniCAD');
    assert.ok(app.includes('appMap.updateLiveGps(AppState.lastGps.lat'), 'Xem vị trí GPS trên bản đồ');
    assert.ok(defines('appData', 'saveProjectsList'), '＋ Dự án mới');
});
