const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
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
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    let filePath = path.join(__dirname, decodeURIComponent(reqUrl));

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
            'Access-Control-Allow-Origin': '*',
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
