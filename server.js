const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 8080;
const ROOT = path.resolve(__dirname);
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.geojson': 'application/geo+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Endpoint proxy tile bản đồ cho việc xuất PDF / PNG Canvas an toàn CORS
    if (req.url.startsWith('/api/tile-proxy?') || req.url.startsWith('/api/proxy-tile?')) {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const targetUrl = parsedUrl.searchParams.get('url');
        if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end('400 Bad Request: missing or invalid target url');
            return;
        }

        // Chỉ cho phép proxy các domain bản đồ được phê duyệt để chống SSRF
        const allowedHosts = [
            'vcdn.cloud', 'cmctelecom.vn', 'fptcloud.com', 'digitaloceanspaces.com',
            'openstreetmap.org', 'arcgisonline.com', 'terrascope.be', 'eox.at'
        ];
        let targetHost = '';
        try { targetHost = new URL(targetUrl).hostname.toLowerCase(); } catch (e) { targetHost = ''; }
        const isAllowed = allowedHosts.some(h => targetHost === h || targetHost.endsWith('.' + h));
        if (!isAllowed) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end('403 Forbidden: domain not allowed for tile proxy');
            return;
        }

        const clientMod = targetUrl.startsWith('https:') ? require('https') : require('http');
        const proxyReq = clientMod.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            timeout: 10000
        }, (proxyRes) => {
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                clientMod.get(proxyRes.headers.location, (redRes) => {
                    res.writeHead(redRes.statusCode || 200, {
                        'Content-Type': redRes.headers['content-type'] || 'image/png',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=604800, s-maxage=604800'
                    });
                    redRes.pipe(res);
                }).on('error', () => {
                    res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
                    res.end('502 Bad Gateway');
                });
                return;
            }

            res.writeHead(proxyRes.statusCode || 200, {
                'Content-Type': proxyRes.headers['content-type'] || 'image/png',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=604800, s-maxage=604800'
            });
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end('502 Bad Gateway: ' + (err.message || 'error'));
        });
        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
            res.end('504 Gateway Timeout');
        });
        return;
    }

    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let decoded;
    try { decoded = decodeURIComponent(reqUrl); } catch (e) { decoded = null; }
    // Chặn đọc file ngoài thư mục dự án (vd. "/..%2f..%2fetc/passwd") — máy chủ mở cho cả mạng Wi-Fi.
    let filePath = decoded === null ? null : path.resolve(__dirname, '.' + path.posix.normalize('/' + decoded));
    if (!filePath || (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) || /(^|[\\/])\./.test(path.relative(ROOT, filePath))) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('================================================================');
    console.log('🚀 MÁY CHỦ THỬ NGHIỆM APP VN-2000 PRO ĐANG CHẠY TRÊN CỔNG ' + PORT);
    console.log('================================================================');
    console.log('📱 1. Để thử nghiệm trên máy tính này:');
    console.log('   Mở trình duyệt: http://localhost:' + PORT);
    console.log('');
    console.log('📱 2. Để cài đặt lên iPhone qua Safari (trong cùng mạng Wi-Fi):');

    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                console.log('   👉 Mở Safari trên iPhone nhập: http://' + alias.address + ':' + PORT);
            }
        }
    }
    console.log('================================================================');
    console.log('💡 Hướng dẫn trên iPhone: Mở link trên -> Bấm Chia sẻ -> Chọn "Thêm vào Màn hình chính"');
});
