// Menu ☰: mọi nhóm phải nằm trong vùng cuộn .drawer-tree-body; thẻ <div> trong index.html phải cân bằng.
// (Lỗi 11/2026: chèn mục 2.6 làm thừa một </div> → nhóm 3–5 rơi ra ngoài, đè lên nhóm 1–2, menu không cuộn được.)
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const html = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/g, '');

test('số thẻ <div> mở và đóng bằng nhau', () => {
    assert.equal((html.match(/<div\b/g) || []).length, (html.match(/<\/div>/g) || []).length);
});

test('cả 5 nhóm menu nằm trong .drawer-tree-body', () => {
    const start = html.indexOf('class="drawer-tree-body');
    assert.ok(start > 0);
    // Tìm điểm đóng của .drawer-tree-body bằng cách đếm div.
    const open = html.lastIndexOf('<div', start);
    let depth = 0, end = -1;
    const re = /<div\b|<\/div>/g;
    re.lastIndex = open;
    for (let m; (m = re.exec(html));) {
        depth += m[0] === '</div>' ? -1 : 1;
        if (depth === 0) { end = m.index; break; }
    }
    const body = html.slice(open, end);
    for (let i = 1; i <= 5; i++) assert.ok(body.includes(`id="drawerFolder${i}"`), `drawerFolder${i} trong vùng cuộn`);
    assert.ok(body.includes('id="drawerItem_routing"'));
});
