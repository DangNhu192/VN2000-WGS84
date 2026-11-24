// v2.8.56: trợ lý "kết hợp" — quy tắc trên máy → AI máy chủ khi có mạng → AI cục bộ khi ngoại tuyến.
// AI chỉ chọn công cụ + tham số đã kiểm; mọi phép tính / xuất tệp do hàm của app làm.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../assistant-core.js');
const G = require('../geodesy.js');
const DATA = require('../assistant-dataset.js');
const root = path.join(__dirname, '..');
const ctx = { provinces: G.VN_PROVINCES };

function same(a, b) {
    if (!a || a.tool !== b.tool) return false;
    const ka = Object.keys(a.args), kb = Object.keys(b.args);
    if (ka.length !== kb.length) return false;
    return kb.every(k => k === 'province'
        ? C.findProvince(String(a.args[k]), ctx.provinces) === C.findProvince(String(b.args[k]), ctx.provinces)
        : (typeof b.args[k] === 'number' ? Math.abs(a.args[k] - b.args[k]) < 1e-6 : a.args[k] === b.args[k]));
}

test('bộ câu mẫu: bộ định tuyến không bao giờ hiểu sai, bắt được ≥ 95% câu', () => {
    assert.ok(DATA.length >= 300, 'đủ câu mẫu');
    let ok = 0, unknown = 0;
    const wrong = [];
    for (const [t, tool, args] of DATA) {
        const r = C.route(t, ctx);
        if (r.intent === 'unknown') { unknown++; continue; }
        if (same(C.callOf(r, ctx), { tool, args })) ok++; else wrong.push(t);
    }
    assert.deepEqual(wrong, [], 'câu bị hiểu sai');
    assert.ok(ok / DATA.length >= 0.95, `độ phủ ${ok}/${DATA.length}`);
    // mọi câu mẫu đều là lời gọi hợp lệ theo danh mục công cụ
    for (const [t, tool, args] of DATA) assert.ok(C.validateCall({ tool, args }, ctx), t);
});

test('xuất bản vẽ có tham số', () => {
    const r = C.route('xuất PDF A3 tỷ lệ 1:500 nền vệ tinh, in cả hai bảng', ctx);
    assert.equal(r.intent, 'exportDrawing');
    assert.deepEqual(r.args, { format: 'pdf', paper: 'A3', scale: 500, basemap: 'google_hybrid', tables: 'both' });
    assert.deepEqual(C.route('in bản vẽ khổ A4 đứng không nền', ctx).args, { format: 'pdf', paper: 'A4-P', basemap: 'none' });
    assert.equal(C.route('xuất file AutoCAD', ctx).args.format, 'dwg');
    assert.equal(C.route('xuất svg từ sổ đo', ctx).args.source, 'data');
    // không nhầm với lệnh khác
    assert.equal(C.route('xuất kml', ctx).intent, 'open');
    assert.equal(C.route('mở bản đồ', ctx).intent, 'open');
    assert.notEqual(C.route('lưu bản đồ ngoại tuyến', ctx).intent, 'exportDrawing');
});

test('kiểm tra chất lượng số liệu: đảo X/Y, ngoài phạm vi, trùng, mốc nhảy, sai KTT, ranh tự cắt', () => {
    const base = [];
    for (let i = 0; i < 8; i++) base.push({ name: 'M' + (i + 1), x: 1154000 + (i % 4) * 20, y: 562000 + Math.floor(i / 4) * 20 });
    assert.equal(C.qcPoints(base.slice(0, 4).concat([{ name: 'M9', x: 1154030, y: 562030 }])).issues.length, 0);
    const bad = base.concat([
        { name: 'S1', x: 562100, y: 1154100 },          // đảo
        { name: 'O1', x: 50, y: 60 },                     // ngoài phạm vi
        { name: 'M1', x: 1154005, y: 562005 },            // trùng tên, khác vị trí
        { name: 'M2', x: 1154020, y: 562000 },            // đỉnh chung (cùng tên, cùng vị trí) → hợp lệ
        { name: 'D1', x: 1154000, y: 562000 },            // khác tên, trùng vị trí M1
        { name: 'F1', x: 1190000, y: 600000 }             // nhảy xa
    ]);
    const txt = C.qcPoints(bad).issues.map(i => i.text).join('\n');
    assert.ok(!txt.includes('M2 ×'), 'đỉnh chung giữa các thửa không bị coi là lỗi');
    for (const w of ['đảo X ↔ Y', 'ngoài phạm vi', 'nhiều vị trí khác nhau', 'trùng vị trí', 'rất xa cụm mốc']) assert.ok(txt.includes(w), w);
    const ktt = C.qcPoints(base, { kttDeg: 108.5, toLngOf: () => 105.6 });
    assert.ok(ktt.issues.some(i => /KTT/.test(i.text)));
    const bow = [{ name: 'A', x: 1154000, y: 562000 }, { name: 'B', x: 1154020, y: 562020 }, { name: 'C', x: 1154000, y: 562020 }, { name: 'D', x: 1154020, y: 562000 }];
    assert.ok(C.qcPoints(bow, { polygon: true }).issues.some(i => /tự cắt/.test(i.text)));
});

test('lời gọi do AI sinh ra được kiểm kỹ trước khi chạy', () => {
    assert.equal(C.validateCall({ tool: 'xoaHet', args: {} }, ctx), null, 'công cụ lạ');
    assert.equal(C.validateCall({ tool: 'exportDrawing', args: { format: 'exe' } }, ctx), null, 'định dạng lạ');
    assert.equal(C.validateCall({ tool: 'wgs2vn', args: { lat: 48.85, lng: 2.35 } }, ctx), null, 'tọa độ ngoài Việt Nam');
    assert.deepEqual(C.validateCall({ tool: 'exportDrawing', args: '{"format":"png","paper":"B5","scale":"500"}' }, ctx).args, { format: 'png', scale: 500 }, 'bỏ tham số tùy chọn sai, ép kiểu số');
    const sp = C.validateCall({ tool: 'setProvince', args: { province: 'Đồng Tháp' } }, ctx);
    assert.equal(sp.intent, 'setProvince'); assert.equal(G.VN_PROVINCES[sp.args.index].name.includes('Đồng Tháp'), true);
    assert.equal(C.parseToolJson('```json\n{"tool":"checkData","args":{}}\n```').tool, 'checkData');
    assert.equal(C.parseToolJson('{"tool":"none","args":{}}'), null);
});

test('ngữ pháp, ví dụ gần nhất, lược đồ công cụ cho AI', () => {
    const g = C.buildGrammar();
    for (const t of C.TOOLS) assert.ok(g.includes(`"\\"${t.name}\\""`), t.name);
    assert.match(g, /^root ::= call \|/);
    const ex = C.nearestExamples('xuất bản vẽ pdf khổ a3', DATA, 4);
    assert.ok(ex.length === 4 && ex.every(e => e[1] === 'exportDrawing'));
    const msgs = C.buildToolMessages('in giùm bản vẽ a3', DATA, 3);
    assert.equal(msgs[0].role, 'system'); assert.equal(msgs.length, 1 + 3 * 2 + 1);
    assert.ok(/Không tự tính toán/.test(msgs[0].content));
    const oa = C.openAiTools();
    assert.equal(oa.length, C.TOOLS.length);
    const ed = oa.find(t => t.function.name === 'exportDrawing').function.parameters;
    assert.deepEqual(ed.required, ['format']);
});

test('máy chủ AI (/api/ai): chưa cấu hình → 503; nguồn lạ → 403; có khóa → chuyển tiếp, khóa không lộ', async () => {
    const handler = require('../api/ai.js');
    const run = (env, headers, body) => new Promise(resolve => {
        const saved = {}; for (const k of ['AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL']) { saved[k] = process.env[k]; delete process.env[k]; }
        Object.assign(process.env, env);
        const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { Object.assign(process.env, saved); for (const k in saved) if (saved[k] === undefined) delete process.env[k]; resolve({ status: this.statusCode, body: b, headers: this.headers }); } };
        handler({ method: 'POST', headers: Object.assign({ host: 'app.vercel.app' }, headers), body }, res);
    });
    assert.equal((await run({}, {}, { messages: [{ role: 'user', content: 'x' }] })).status, 503);
    assert.equal((await run({ AI_API_KEY: 'k', AI_BASE_URL: 'https://x/v1', AI_MODEL: 'm' }, { origin: 'https://evil.example' }, { messages: [{ role: 'user', content: 'x' }] })).status, 403);
    const realFetch = global.fetch;
    let sent = null;
    global.fetch = async (url, o) => { sent = { url, o }; return { status: 200, text: async () => '{"choices":[]}' }; };
    try {
        const r = await run({ AI_API_KEY: 'sk-secret', AI_BASE_URL: 'https://x/v1/', AI_MODEL: 'qwen-plus' }, { origin: 'https://app.vercel.app' }, { messages: [{ role: 'user', content: 'mở bản đồ' }], tools: C.openAiTools() });
        assert.equal(r.status, 200);
        assert.equal(sent.url, 'https://x/v1/chat/completions');
        assert.equal(JSON.parse(sent.o.body).model, 'qwen-plus');
        assert.equal(sent.o.headers.Authorization, 'Bearer sk-secret');
        assert.ok(!r.body.includes('sk-secret'));
    } finally { global.fetch = realFetch; }
});

test('trợ lý nối đúng thứ tự: quy tắc → AI máy chủ (có mạng) → AI cục bộ', () => {
    const a = fs.readFileSync(path.join(root, 'assistant.js'), 'utf8');
    const i1 = a.indexOf("if (r.intent === 'unknown' && cloud.usable())");
    const i2 = a.indexOf("if (r.intent === 'unknown' && !cloudText && llm.state === 'ready')");
    assert.ok(i1 > 0 && i2 > i1);
    assert.ok(a.includes('usable() { const c = this.cfg(); return c.enabled && navigator.onLine !== false; }'), 'mất mạng thì không gọi máy chủ');
    assert.ok(a.includes("chưa tải mô hình (0 / ~400 MB; app không tự tải)"), 'trạng thái rõ dung lượng mô hình');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.indexOf('assistant-dataset.js') > html.indexOf('assistant-core.js') && html.indexOf('assistant-dataset.js') < html.indexOf('src="assistant.js'));
    assert.ok(fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes("'./assistant-dataset.js'"));
    assert.ok(fs.existsSync(path.join(root, 'docs/ai/sft_vi.jsonl')), 'dữ liệu fine-tune');
});
