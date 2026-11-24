/**
 * Vercel Serverless Function: AI máy chủ DÙNG CHUNG cho mọi người dùng app VN2000 (chế độ "kết hợp").
 *
 * CHỈ phục vụ chức năng của app:
 *   - app chỉ gửi CÂU NGƯỜI DÙNG (≤ 300 ký tự). Lời nhắc hệ thống, danh mục công cụ và ví dụ do MÁY CHỦ dựng
 *     từ assistant-core.js, nên không ai gửi được lời nhắc hay công cụ khác qua đây;
 *   - mô hình BẮT BUỘC trả về một lời gọi công cụ (tool_choice "required"); mọi chữ tự do bị bỏ;
 *   - lời gọi được kiểm bằng validateCall trước khi trả về: công cụ lạ, tham số sai, tọa độ ngoài Việt Nam → bị loại;
 *   - giới hạn số lần gọi theo IP và tổng mỗi ngày để không ai dùng hết hạn mức miễn phí.
 *
 * Nhà cung cấp MIỄN PHÍ (không cần thẻ), thử lần lượt — cái nào hết hạn mức thì chuyển cái sau:
 *   GROQ_API_KEY    (console.groq.com/keys)          — GROQ_MODELS   mặc định "llama-3.3-70b-versatile,openai/gpt-oss-120b"
 *   GEMINI_API_KEY  (aistudio.google.com/apikey)     — GEMINI_MODELS mặc định "gemini-3.8-flash,gemini-3.5-flash"
 *   AI_API_KEY + AI_BASE_URL + AI_MODEL              — nhà cung cấp OpenAI-compatible bất kỳ (tùy chọn)
 * Giới hạn (tùy chọn): AI_RPM_PER_IP (mặc định 10), AI_RPD_PER_IP (150), AI_RPD_TOTAL (1500), AI_ALLOWED_ORIGINS.
 */
const C = require('../assistant-core.js');
const DATA = require('../assistant-dataset.js');
const { VN_PROVINCES } = require('../geodesy.js');

const MAX_TEXT = 300;
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const list = (v) => String(v || '').split(',').map(s => s.trim()).filter(Boolean);

function providers() {
    const out = [];
    if (env('GROQ_API_KEY')) list(env('GROQ_MODELS', 'llama-3.3-70b-versatile,openai/gpt-oss-120b'))
        .forEach(m => out.push({ name: 'groq', base: 'https://api.groq.com/openai/v1', key: env('GROQ_API_KEY'), model: m }));
    if (env('GEMINI_API_KEY')) list(env('GEMINI_MODELS', 'gemini-3.8-flash,gemini-3.5-flash'))
        .forEach(m => out.push({ name: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta/openai', key: env('GEMINI_API_KEY'), model: m, extra: { reasoning_effort: 'low' } }));
    if (env('AI_API_KEY') && env('AI_BASE_URL') && env('AI_MODEL'))
        out.push({ name: 'custom', base: String(env('AI_BASE_URL')).replace(/\/+$/, ''), key: env('AI_API_KEY'), model: env('AI_MODEL') });
    return out;
}

// ---- Giới hạn số lần gọi (trong bộ nhớ của mỗi phiên bản hàm; đủ chặn lạm dụng thông thường) ----
const hits = new Map();   // ip → [thời điểm…] trong 24h
let dayKey = '', dayTotal = 0;
function allow(ip) {
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    if (today !== dayKey) { dayKey = today; dayTotal = 0; hits.clear(); }
    if (dayTotal >= Number(env('AI_RPD_TOTAL', 1500))) return 'Hôm nay AI máy chủ đã dùng hết hạn mức chung — app tự dùng AI trên máy.';
    const arr = (hits.get(ip) || []).filter(t => now - t < 86400000);
    if (arr.filter(t => now - t < 60000).length >= Number(env('AI_RPM_PER_IP', 10))) return 'Gửi quá nhanh, đợi một phút rồi thử lại.';
    if (arr.length >= Number(env('AI_RPD_PER_IP', 150))) return 'Bạn đã dùng hết lượt AI máy chủ hôm nay — app tự dùng AI trên máy.';
    arr.push(now); hits.set(ip, arr); dayTotal++;
    if (hits.size > 5000) hits.delete(hits.keys().next().value);
    return '';
}

function allowedOrigin(origin, host) {
    if (!origin) return true;
    const allow = list(env('AI_ALLOWED_ORIGINS', ''));
    if (allow.length) return allow.includes(origin);
    try {
        const o = new URL(origin);
        return o.host === host || /\.vercel\.app$/.test(o.hostname) || o.hostname === 'localhost' || o.hostname === '127.0.0.1';
    } catch (e) { return false; }
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        if (req.body && typeof req.body === 'object') return resolve(req.body);
        let size = 0, raw = '';
        req.on('data', c => { size += c.length; if (size > 8192) { reject(new Error('too_large')); req.destroy(); } else raw += c; });
        req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(new Error('bad_json')); } });
        req.on('error', reject);
    });
}

/** Gọi một nhà cung cấp; trả về {call} | {none:true}; ném lỗi kèm .status khi cần chuyển nhà cung cấp khác. */
async function askProvider(p, text, fetchImpl, choice) {
    choice = choice || 'required';
    const body = Object.assign({
        model: p.model,
        messages: C.buildToolMessages(text, DATA, 4),
        tools: C.openAiTools(),
        tool_choice: choice,
        temperature: 0,
        max_tokens: 200
    }, p.extra || {});
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
        const r = await fetchImpl(p.base + '/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.key },
            body: JSON.stringify(body),
            signal: ctrl.signal
        });
        if (r.status === 400 && choice === 'required') return askProvider(p, text, fetchImpl, 'auto');   // nhà cung cấp chưa hỗ trợ "required"
        if (!r.ok) { const e = new Error(`${p.name} ${r.status}`); e.status = r.status; throw e; }
        const j = await r.json();
        const m = (((j || {}).choices || [])[0] || {}).message || {};
        const tc = (m.tool_calls || [])[0];
        const raw = tc && tc.function ? { tool: tc.function.name, args: tc.function.arguments } : C.parseToolJson(m.content || '');
        const call = C.validateCall(raw, { provinces: VN_PROVINCES });
        return call ? { call } : { none: true };
    } finally { clearTimeout(timer); }
}

async function handler(req, res, fetchImpl) {
    fetchImpl = fetchImpl || fetch;
    const origin = req.headers.origin || '';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, obj) => { res.statusCode = status; res.end(JSON.stringify(obj)); };
    if (origin && allowedOrigin(origin, req.headers.host)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    if (!allowedOrigin(origin, req.headers.host)) return send(403, { error: 'Nguồn gọi không được phép' });
    const ps = providers();
    // GET: app hỏi máy chủ đã có AI chưa (không lộ khóa)
    if (req.method === 'GET') return send(200, { ready: ps.length > 0, providers: [...new Set(ps.map(p => p.name))] });
    if (req.method !== 'POST') return send(405, { error: 'Chỉ nhận GET/POST' });
    if (!ps.length) return send(503, { error: 'not_configured' });

    let body;
    try { body = await readBody(req); } catch (e) { return send(400, { error: e.message }); }
    const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    if (!text) return send(400, { error: 'Thiếu câu lệnh' });

    // Câu nào quy tắc trên máy chủ đã hiểu chắc thì trả lời luôn, không tốn lượt AI
    const r0 = C.route(text, { provinces: VN_PROVINCES });
    const c0 = r0.intent !== 'unknown' ? C.validateCall(C.callOf(r0, { provinces: VN_PROVINCES }), { provinces: VN_PROVINCES }) : null;
    if (c0) return send(200, { call: c0, by: 'rules' });

    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'ip').split(',')[0].trim();
    const block = allow(ip);
    if (block) return send(429, { error: block });

    let lastErr = '';
    const dead = new Set();
    for (const p of ps) {
        if (dead.has(p.name)) continue;
        try {
            const a = await askProvider(p, text, fetchImpl);
            if (a.call) return send(200, { call: a.call, by: p.name });
            return send(200, { none: true, by: p.name });   // mô hình không khớp công cụ nào của app
        } catch (e) {
            lastErr = e.name === 'AbortError' ? `${p.name} quá thời gian` : e.message;
            // 401/403: khóa sai → bỏ cả nhà cung cấp đó; 429 / 404 / 5xx / quá giờ → thử mô hình / nhà cung cấp kế tiếp
            if (e.status === 401 || e.status === 403) dead.add(p.name);
        }
    }
    return send(502, { error: 'AI máy chủ tạm không trả lời (' + lastErr + ')' });
}

module.exports = (req, res) => handler(req, res);
module.exports.handler = handler;
module.exports._allow = allow;
