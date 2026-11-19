/**
 * Vercel Serverless Function: Map Tile Proxy
 * Stream map tiles from external CDNs (Guland, OpenStreetMap, ESRI, etc.)
 * with Access-Control-Allow-Origin: * to prevent tainted Canvas during PDF/PNG export.
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');

const ALLOWED_HOST_SUFFIXES = [
    'vcdn.cloud',
    'cmctelecom.vn',
    'fptcloud.com',
    'digitaloceanspaces.com',
    'openstreetmap.org',
    'arcgisonline.com',
    'terrascope.be',
    'eox.at'
];

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    const hostHeader = (req.headers && req.headers.host) || 'localhost';
    const targetUrl = req.query?.url || (req.url ? new URL(req.url, `http://${hostHeader}`).searchParams.get('url') : null);
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('400 Bad Request: missing or invalid target url');
        return;
    }

    let parsed;
    try {
        parsed = new URL(targetUrl);
    } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('400 Bad Request: malformed url');
        return;
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_HOST_SUFFIXES.some(suffix => host === suffix || host.endsWith('.' + suffix));
    if (!isAllowed) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('403 Forbidden: host not allowed by tile proxy whitelist');
        return;
    }

    const client = parsed.protocol === 'https:' ? https : http;
    const requestOptions = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': 'https://guland.vn/'
        },
        timeout: 10000
    };

    client.get(targetUrl, requestOptions, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            // Đơn giản redirect nếu có
            res.statusCode = 302;
            res.setHeader('Location', proxyRes.headers.location);
            res.end();
            return;
        }

        res.statusCode = proxyRes.statusCode || 200;
        res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

        proxyRes.pipe(res);
    }).on('error', (err) => {
        if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('502 Bad Gateway: ' + (err.message || 'proxy error'));
        }
    });
};
