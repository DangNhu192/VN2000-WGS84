/**
 * Vercel Serverless Function: AI máy chủ cho trợ lý VN2000 (chế độ "kết hợp", kiểu Xiaozhi).
 * Trình duyệt gửi câu lệnh + danh mục công cụ; hàm này chuyển tiếp tới nhà cung cấp OpenAI-compatible
 * (Qwen DashScope, DeepSeek, OpenRouter, OpenAI, máy chủ tự dựng…) bằng khóa giữ trên Vercel — khóa không lộ ra app.
 *
 * Biến môi trường (Vercel → Settings → Environment Variables):
 *   AI_API_KEY   khóa API của nhà cung cấp (bắt buộc)
 *   AI_BASE_URL  vd. https://dashscope-intl.aliyuncs.com/compatible-mode/v1  |  https://api.deepseek.com/v1  |  https://openrouter.ai/api/v1
 *   AI_MODEL     vd. qwen-plus | deepseek-chat | qwen/qwen-2.5-72b-instruct
 *   AI_ALLOWED_ORIGINS (tùy chọn) danh sách origin được gọi, cách nhau dấu phẩy
 * Chưa cấu hình → trả 503, app tự dùng AI cục bộ / quy tắc.
 */
const MAX_BODY = 64 * 1024;

function allowedOrigin(origin, host) {
    if (!origin) return true;
    const list = String(process.env.AI_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (list.length) return list.includes(origin);
    try {
        const o = new URL(origin);
        return o.host === host || /\.vercel\.app$/.test(o.hostname) || o.hostname === 'localhost' || o.hostname === '127.0.0.1';
    } catch (e) { return false; }
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        if (req.body && typeof req.body === 'object') return resolve(req.body);
        let size = 0, raw = '';
        req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); } else raw += c; });
        req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('bad_json')); } });
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    const origin = req.headers.origin || '';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (origin && allowedOrigin(origin, req.headers.host)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Chỉ nhận POST' })); }
    if (!allowedOrigin(origin, req.headers.host)) { res.statusCode = 403; return res.end(JSON.stringify({ error: 'Nguồn gọi không được phép' })); }

    const key = process.env.AI_API_KEY;
    const base = String(process.env.AI_BASE_URL || '').replace(/\/+$/, '');
    const model = process.env.AI_MODEL;
    if (!key || !base || !model) { res.statusCode = 503; return res.end(JSON.stringify({ error: 'not_configured' })); }

    let body;
    try { body = await readBody(req); } catch (e) { res.statusCode = 400; return res.end(JSON.stringify({ error: e.message })); }
    const messages = Array.isArray(body.messages) ? body.messages.slice(-24).map(m => ({ role: String(m.role || 'user'), content: String(m.content || '').slice(0, 4000) })) : [];
    if (!messages.length) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Thiếu messages' })); }

    const payload = {
        model,
        messages,
        temperature: 0,
        max_tokens: Math.min(400, Number(body.max_tokens) || 300)
    };
    if (Array.isArray(body.tools) && body.tools.length) { payload.tools = body.tools.slice(0, 40); payload.tool_choice = 'auto'; }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    try {
        const r = await fetch(base + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
            body: JSON.stringify(payload),
            signal: ctrl.signal
        });
        const text = await r.text();
        res.statusCode = r.status;
        return res.end(text);
    } catch (e) {
        res.statusCode = 502;
        return res.end(JSON.stringify({ error: e.name === 'AbortError' ? 'Nhà cung cấp AI quá thời gian' : 'Không gọi được nhà cung cấp AI' }));
    } finally {
        clearTimeout(timer);
    }
};
