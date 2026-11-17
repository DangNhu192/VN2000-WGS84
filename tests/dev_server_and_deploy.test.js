// Máy chủ thử (server.js) không cho đọc file ngoài thư mục dự án; Vercel không đưa tài liệu nội bộ, công cụ lên mạng.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const ROOT = path.join(__dirname, '..');

function get(port, url) {
    return new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port, path: url, method: 'GET' }, res => { res.resume(); resolve(res.statusCode); });
        req.on('error', reject); req.end();
    });
}

test('server.js: chặn ../ (kể cả mã hóa %2f) và file ẩn; vẫn phục vụ file của ứng dụng', async (t) => {
    const port = 18000 + Math.floor(Math.random() * 1000);
    const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
    t.after(() => child.kill());
    for (let i = 0; i < 50; i++) { try { await get(port, '/'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
    assert.equal(await get(port, '/index.html'), 200);
    assert.equal(await get(port, '/geodesy.js'), 200);
    for (const bad of ['/..%2f..%2f..%2fetc%2fpasswd', '/%2e%2e/%2e%2e/etc/passwd', '/.git/config', '/..%5c..%5cwindows%5cwin.ini']) {
        const code = await get(port, bad);
        assert.ok(code === 403 || code === 404, `${bad} → ${code}`);
        assert.notEqual(code, 200, bad);
    }
});

test('.vercelignore loại tài liệu nội bộ, công cụ, test và mã nguồn phụ khỏi bản triển khai', () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    for (const must of ['.agents', '.github', 'tests', 'tools', 'progress.md', 'session-handoff.md', 'Mã.gs', 'server.js', '*.ps1', '*.bat']) {
        assert.ok(ignore.includes(must), `thiếu ${must}`);
    }
    for (const keep of ['index.html', 'app.js', 'geodesy.js', 'sw.js', 'manifest.json', 'data', 'src', 'assets']) {
        assert.ok(!ignore.includes(keep), `không được bỏ ${keep}`);
    }
});
