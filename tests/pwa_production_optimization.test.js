const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

test('=== 1. KIỂM THỬ CẤU TRÚC VÀ ĐẶC TẢ MANIFEST.JSON CHO PWA HIỆN ĐẠI ===', () => {
    const manifestPath = path.join(ROOT_DIR, 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'Tệp manifest.json phải tồn tại');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.id, 'vn2000-pro-pwa', 'Phải có id định danh ứng dụng PWA');
    assert.equal(manifest.theme_color, '#0f172a', 'Màu theme_color phải đồng bộ Dark Titanium #0f172a');
    assert.equal(manifest.background_color, '#0f172a', 'Màu background_color phải là #0f172a');
    assert.equal(manifest.display, 'standalone', 'Chế độ hiển thị phải là standalone');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Phải có danh sách biểu tượng đầy đủ kích thước');

    // Kiểm tra Shortcuts cho người dùng giữ icon trên màn hình
    assert.ok(Array.isArray(manifest.shortcuts), 'Phải có danh sách shortcuts (Quick Actions)');
    assert.ok(manifest.shortcuts.length >= 4, 'Phải có ít nhất 4 lối tắt chức năng chính');

    const shortcutUrls = manifest.shortcuts.map(s => s.url);
    assert.ok(shortcutUrls.some(u => u.includes('screen=transform')), 'Phải có shortcut Chuyển đổi tọa độ');
    assert.ok(shortcutUrls.some(u => u.includes('screen=map')), 'Phải có shortcut Bản đồ dự án');
    assert.ok(shortcutUrls.some(u => u.includes('screen=stakeout')), 'Phải có shortcut Cắm mốc thực địa');
    assert.ok(shortcutUrls.some(u => u.includes('screen=datamgmt')), 'Phải có shortcut Sổ đo dự án');
    assert.ok(shortcutUrls.some(u => u.includes('screen=cad_tool')), 'Phải có shortcut MiniCAD');
});

test('=== 2. KIỂM THỬ CHIẾN LƯỢC SERVICE WORKER (SW.JS) VÀ CACHE OFFLINE ===', () => {
    const swPath = path.join(ROOT_DIR, 'sw.js');
    assert.ok(fs.existsSync(swPath), 'Tệp sw.js phải tồn tại');

    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes("CACHE_NAME = 'vn2000-pro-v2.8.0'"), 'CACHE_NAME phải nâng cấp lên v2.8.0');
    assert.ok(swContent.includes('!req.url.startsWith(\'http\')'), 'Phải có guard kiểm tra http/https tránh lỗi protocol ngoại vi');
    assert.ok(swContent.includes('caches.open(CACHE_NAME)'), 'Phải mở đúng CACHE_NAME');
    assert.ok(swContent.includes('self.skipWaiting()'), 'Phải kích hoạt skipWaiting để cài đặt nhanh');
    assert.ok(swContent.includes('self.clients.claim()'), 'Phải claim clients khi kích hoạt phiên bản mới');

    // Kiểm tra các tệp lõi offline
    const requiredOfflineAssets = [
        './index.html',
        './app.js',
        './geodesy.js',
        './leaflet.js',
        './leaflet.css',
        './vietnam_34_tinh.js',
        './dong_thap_communes.js',
        './manifest.json',
        './jspdf.umd.min.js',
        './xlsx.full.min.js'
    ];
    requiredOfflineAssets.forEach(asset => {
        assert.ok(swContent.includes(asset), `ASSETS_TO_CACHE phải chứa ${asset}`);
        const localPath = path.join(ROOT_DIR, asset.replace('./', ''));
        assert.ok(fs.existsSync(localPath), `Tệp cục bộ ${localPath} phải thực sự tồn tại trong thư mục dự án`);
    });
});

test('=== 3. KIỂM THỬ CẤU HÌNH VERCEL PRODUCTION (VERCEL.JSON) ===', () => {
    const vercelPath = path.join(ROOT_DIR, 'vercel.json');
    assert.ok(fs.existsSync(vercelPath), 'Tệp vercel.json phải tồn tại');

    const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    assert.equal(vercel.version, 2, 'Phiên bản Vercel config phải là 2');
    assert.equal(vercel.cleanUrls, true, 'cleanUrls phải bật');

    const headers = vercel.headers;
    assert.ok(Array.isArray(headers) && headers.length > 0, 'Phải có danh sách headers tối ưu');

    // Kiểm tra cache-control cho Service Worker và Manifest
    const swHeader = headers.find(h => h.source === '/sw.js');
    assert.ok(swHeader, 'Phải có cấu hình header cho /sw.js');
    assert.ok(swHeader.headers.some(h => h.key === 'Cache-Control' && h.value.includes('must-revalidate')));

    const manifestHeader = headers.find(h => h.source === '/manifest.json');
    assert.ok(manifestHeader, 'Phải có cấu hình header cho /manifest.json');
    assert.ok(manifestHeader.headers.some(h => h.key === 'Cache-Control' && h.value.includes('must-revalidate')));

    // Kiểm tra cache bất biến (immutable) cho thư viện tĩnh nặng
    const immutableRule = headers.find(h => h.headers.some(hdr => hdr.key === 'Cache-Control' && hdr.value.includes('immutable')));
    assert.ok(immutableRule, 'Phải có cấu hình cache immutable cho tài nguyên tĩnh');
});

test('=== 4. KIỂM THỬ ĐỒNG BỘ PHIÊN BẢN VÀ META TAGS TRONG INDEX.HTML & APP.JS ===', () => {
    const htmlPath = path.join(ROOT_DIR, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('<meta name="theme-color" content="#0f172a">'), 'Theme-color trong index.html phải là #0f172a');
    assert.ok(html.includes('app.js?v=2.8.0'), 'index.html phải nạp script app.js?v=2.8.0');

    const appPath = path.join(ROOT_DIR, 'app.js');
    const appJs = fs.readFileSync(appPath, 'utf8');
    assert.ok(appJs.includes("v2.8.0 Pro"), 'app.js phải hiển thị phiên bản v2.8.0 Pro');
    assert.ok(appJs.includes("urlParams.get('screen')"), 'app.js phải có xử lý deep linking từ PWA shortcut');
});
