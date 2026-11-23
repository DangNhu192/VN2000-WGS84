// v2.8.53: sw.js từng có lỗi cú pháp ("||;") từ 20/11 khiến service worker KHÔNG cập nhật được trên mọi máy:
// người dùng kẹt ở bản cũ (bộ nhớ đệm v2.8.40), không nhận bản vá. Mọi tệp JS chạy trên trình duyệt phải biên dịch được.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const skipDir = /^(\.|node_modules$|tests$|tools$|vendor$|docs$)/;
const files = [];
(function scan(dir) {
    for (const f of fs.readdirSync(dir)) {
        if (skipDir.test(f)) continue;
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) scan(p);
        else if (f.endsWith('.js')) files.push(p);
    }
})(root);

test('mọi tệp .js của ứng dụng biên dịch được (kể cả sw.js)', () => {
    assert.ok(files.some(f => f.endsWith('sw.js')) && files.some(f => f.endsWith('app.js')));
    for (const f of files) {
        const src = fs.readFileSync(f, 'utf8');
        assert.doesNotThrow(() => new vm.Script(src, { filename: f }), `${path.relative(root, f)} có lỗi cú pháp`);
    }
});

test('service worker: ô bản đồ lưu dạng opaque không trả cho yêu cầu CORS của bộ xuất', () => {
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(sw.includes("if (cachedResponse && !(cachedResponse.type === 'opaque' && req.mode === 'cors')) return cachedResponse;"));
});

test('bộ tải ô ảnh khi xuất: thử lại một lần với địa chỉ né bộ nhớ đệm trước khi bỏ ô', () => {
    const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
    assert.ok(app.includes("img.src = base + (base.includes('?') ? '&' : '?') + '_vn2k=export';"));
});
