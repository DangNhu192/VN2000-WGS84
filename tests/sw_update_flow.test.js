// Cập nhật ứng dụng: không tự tải lại giữa chừng; có thanh "Cập nhật"; mạng chậm thì dùng bản đã lưu sau 3 giây.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('service worker chỉ kích hoạt bản mới khi trang gửi SKIP_WAITING', () => {
    const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('message'"));
    assert.ok(!install.includes('skipWaiting'), 'install không tự skipWaiting');
    assert.match(sw, /if \(event\.data === 'SKIP_WAITING'\) self\.skipWaiting\(\);/);
});

test('trang không tự reload khi có bản mới; hiện thanh Cập nhật và chỉ reload sau controllerchange khi đã có controller cũ', () => {
    assert.ok(!html.includes('setTimeout(() => window.location.reload(), 1500)'));
    assert.ok(html.includes('id="swUpdateBar"') && html.includes('id="btnSwUpdate"'));
    assert.ok(html.includes("worker.postMessage('SKIP_WAITING')"));
    assert.ok(html.includes("navigator.serviceWorker.addEventListener('controllerchange'"));
    assert.ok(html.includes("const hadController = !!navigator.serviceWorker.controller;"));
    assert.ok(html.includes("if (!hadController || reloaded) return;"));
});

test('mạng chậm: chờ tối đa 3 giây rồi dùng bản đã lưu, kể cả khi URL có ?v=', async () => {
    assert.match(sw, /const NETWORK_TIMEOUT_MS = 3000;/);
    assert.ok(sw.includes("caches.match(req, { ignoreSearch: true })"));
    // Chạy thử fetchWithTimeout với fetch treo
    const start = sw.indexOf('const NETWORK_TIMEOUT_MS'); const end = sw.indexOf('function cachedCopy');
    const fetchWithTimeout = new Function('fetch', sw.slice(start, end).replace('3000', '50') + '\nreturn fetchWithTimeout;')(() => new Promise(() => {}));
    await assert.rejects(fetchWithTimeout('x'), /timeout/);
});
