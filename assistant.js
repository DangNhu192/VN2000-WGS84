/* Trợ lý cục bộ — GIAO DIỆN + CÔNG CỤ + GIỌNG NÓI + NÃO AI TÙY CHỌN.
   Chạy hoàn toàn trên máy đang cài ứng dụng. Lõi định tuyến ở assistant-core.js (không AI).
   Pha làm việc (học từ Ivy AI): NGHE (Web Speech) → HIỂU (bộ định tuyến; nếu không chắc mới hỏi mô hình AI)
   → LÀM (gọi đúng hàm của app) → NÓI (speechSynthesis). Mỗi pha xong thì nhả tài nguyên cho pha sau:
   tắt micro trước khi nói, dừng đọc khi bắt đầu nghe, gỡ mô hình AI khỏi bộ nhớ sau một lúc không dùng. */
(function () {
    'use strict';
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const C = window.AssistantCore;
    if (!C) return;

    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const store = {
        get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
        set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bộ nhớ đầy hoặc bị chặn */ } }
    };
    const LLM_IDLE_MS = 3 * 60 * 1000;
    const LLM_SUGGESTED = {
        name: 'Qwen2.5 0.5B Instruct (Q4_K_M, ~400 MB)',
        url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf'
    };

    // ---------------- Trạng thái app (đọc an toàn) ----------------
    const S = () => (typeof AppState !== 'undefined' ? AppState : {});
    function ktt() {
        const s = S();
        const deg = Number(s.kttDeg) || 105, min = Number(s.kttMin) || 0;
        const k0 = Number(s.scaleFactor) || 0.9999;
        return { deg, min, val: deg + min / 60, k0, mui: k0 > 0.99975 ? 3 : 6, province: s.provinceName || '' };
    }
    const kttLabel = k => `KTT ${C.fmtKtt(k.deg, k.min)}, múi ${k.mui}°${k.province ? ` (${k.province})` : ''}`;
    const provinces = () => (typeof VN_PROVINCES !== 'undefined' ? VN_PROVINCES : []);

    // ---------------- Công cụ: mỗi ý định → một hàm của app ----------------
    // Kết quả: { text, source: 'device'|'ai'|'test', actions: [{label, run}], speak }
    const DEVICE = 'device';
    const tools = {
        help: () => ({ text: 'Tôi chạy ngay trên máy này, không cần mạng. Bạn có thể nói hoặc gõ:\n• ' + C.HELP.join('\n• '), source: DEVICE, speak: 'Tôi giúp chuyển đổi tọa độ, mở chức năng, kiểm tra KTT, GPS và tự kiểm thử ứng dụng.' }),
        identity: () => ({ text: 'Tôi là trợ lý cục bộ của VN2000 Pro: chạy trên chính thiết bị này, không gửi dữ liệu đi đâu. Phép tính tọa độ luôn do thuật toán của ứng dụng thực hiện, không do AI đoán.', source: DEVICE }),
        time: () => { const d = new Date(); return { text: `Bây giờ là ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (đồng hồ máy).`, source: DEVICE }; },
        date: () => { const d = new Date(); return { text: `Hôm nay là ${d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}.`, source: DEVICE }; },
        stop: () => { voice.stopAll(); return { text: 'Đã dừng.', source: DEVICE, speak: '' }; },

        wgs2vn({ lat, lng, showOnMap }) {
            const k = ktt();
            if (typeof convertWgsToVn2k !== 'function') return fail('Chưa nạp xong thuật toán chuyển đổi.');
            const r = convertWgsToVn2k(lat, lng, k.val, k.k0);
            const text = `WGS-84 ${C.fmtDeg(lat)}, ${C.fmtDeg(lng)}\n→ VN-2000: X = ${C.fmtM(r.X)} m; Y = ${C.fmtM(r.Y)} m\n${kttLabel(k)}`;
            const out = { text, source: DEVICE, point: { lat, lng }, copy: `${r.X.toFixed(3)}\t${r.Y.toFixed(3)}`, speak: `X bằng ${Math.round(r.X)} mét, Y bằng ${Math.round(r.Y)} mét.`,
                actions: [mapAction(lat, lng, 'Điểm từ trợ lý')] };
            if (showOnMap) out.after = () => mapAction(lat, lng, 'Điểm từ trợ lý').run();
            return out;
        },
        vn2wgs({ X, Y, showOnMap }) {
            const k = ktt();
            if (typeof convertVn2kToWgs !== 'function') return fail('Chưa nạp xong thuật toán chuyển đổi.');
            const r = convertVn2kToWgs(X, Y, k.val, k.k0);
            const ok = r.lat > 7 && r.lat < 24.5 && r.lng > 101 && r.lng < 118;
            const text = `VN-2000 X = ${C.fmtM(X)} m; Y = ${C.fmtM(Y)} m (${kttLabel(k)})\n→ WGS-84: ${C.fmtDeg(r.lat)}, ${C.fmtDeg(r.lng)}` +
                (ok ? '' : '\n⚠️ Kết quả nằm ngoài lãnh thổ Việt Nam — kiểm tra lại KTT hoặc thứ tự X, Y.');
            const out = { text, source: DEVICE, point: ok ? { lat: r.lat, lng: r.lng } : null, copy: `${r.lat.toFixed(7)}, ${r.lng.toFixed(7)}`, speak: 'Đã chuyển sang WGS 84.',
                actions: ok ? [mapAction(r.lat, r.lng, 'Điểm từ trợ lý')] : [] };
            if (showOnMap && ok) out.after = () => mapAction(r.lat, r.lng, 'Điểm từ trợ lý').run();
            return out;
        },
        distance({ p1, p2 }) {
            const k = ktt();
            const toVn = p => p.kind === 'vn2k' ? p : convertWgsToVn2k(p.lat, p.lng, k.val, k.k0);
            const a = toVn(p1), b = toVn(p2);
            const r = calculateDistanceAndAzimuth(a.X, a.Y, b.X, b.Y);
            return { text: `Khoảng cách phẳng VN-2000: ${C.fmtM(r.dist)} m\nPhương vị: ${C.fmtAzimuth(r.azimuthDeg)} (${r.quarter})\nΔX = ${C.fmtM(r.dX)} m; ΔY = ${C.fmtM(r.dY)} m` +
                (p1.kind === 'wgs' ? `\nTính trên ${kttLabel(k)}` : ''), source: DEVICE, speak: `Khoảng cách ${r.dist.toFixed(2).replace('.', ' phẩy ')} mét.` };
        },
        open({ target }) {
            if (target === 'drawerItem_home' && typeof appNav !== 'undefined') { appNav.goToMenu(); return { text: 'Đã về Trang chủ.', source: DEVICE }; }
            const el = $(target);
            if (!el) return fail('Không tìm thấy chức năng này trong ứng dụng.');
            const name = (C.FEATURES.find(f => f[0] === target) || [0, ['']])[1][0];
            el.click();
            if (typeof appNav !== 'undefined' && S().isTreeDrawerOpen) appNav.closeTreeMenu();
            return { text: `Đã mở ${titleOf(el) || name}.`, source: DEVICE };
        },
        settings: () => { appModal.openUnifiedSettings(); return { text: 'Đã mở Cài đặt.', source: DEVICE }; },
        kttInfo: () => ({ text: `Đang dùng ${kttLabel(ktt())}.`, source: DEVICE, speak: `Kinh tuyến trục ${ktt().deg} độ ${ktt().min} phút, múi ${ktt().mui}.` }),
        kttOf({ index }) {
            const p = provinces()[index];
            if (!p) return fail('Không rõ tỉnh.');
            const era = p.era === '2025' ? 'theo danh sách 34 tỉnh từ 01/07/2025' : 'tỉnh cũ (trước 01/07/2025)';
            return { text: `${p.name}: KTT ${C.fmtKtt(p.deg, p.min)} — ${era}${p.verify ? ' ⚠️ các nguồn chưa thống nhất, cần đối chiếu Thông tư 24/2025' : ''}.`, source: DEVICE,
                actions: [{ label: 'Dùng tỉnh này', run: () => run(`đổi KTT sang ${p.name}`) }] };
        },
        setProvince({ index }) {
            const p = provinces()[index];
            if (!p || typeof appModal === 'undefined') return fail('Không đổi được KTT ở đây.');
            appModal.openUnifiedSettings('ktt');
            const sel = $('modalProvinceSelect');
            if (sel) { sel.value = String(index); appModal.onProvinceChange(); }
            return { text: `Đã chọn sẵn ${p.name} — KTT ${C.fmtKtt(p.deg, p.min)} trong Cài đặt KTT. Kiểm tra rồi bấm Lưu để áp dụng (đổi KTT làm đổi mọi kết quả VN-2000).`, source: DEVICE };
        },
        setMui({ mui }) {
            if (typeof appModal === 'undefined') return fail('Không đổi được múi chiếu ở đây.');
            appModal.openUnifiedSettings('ktt');
            appModal.setMui(mui);
            return { text: `Đã chọn múi ${mui}° (k0 = ${mui === 3 ? '0,9999' : '0,9996'}) trong Cài đặt KTT. Bấm Lưu để áp dụng.`, source: DEVICE };
        },
        gps({ on }) {
            const s = S();
            if (typeof appGps === 'undefined') return fail('Không có mô-đun GPS.');
            if (!!s.isGpsTracking !== on) appGps.toggleTracking();
            return { text: on ? 'Đã bật GPS. Chờ vài giây để có tọa độ, rồi hỏi "vị trí của tôi".' : 'Đã tắt GPS.', source: DEVICE };
        },
        whereAmI() {
            const g = S().lastGps || {};
            if (!g.lat || !g.lng) return { text: 'Chưa có tọa độ GPS. Nói "bật GPS" rồi hỏi lại sau vài giây (ngoài trời sẽ nhanh hơn).', source: DEVICE,
                actions: [{ label: 'Bật GPS', run: () => run('bật GPS') }] };
            const base = tools.wgs2vn({ lat: g.lat, lng: g.lng });
            const acc = Number(g.accuracy) ? `\nSai số GPS điện thoại: ±${Number(g.accuracy).toFixed(1)} m (chỉ tham khảo, không thay RTK)` : '';
            return Object.assign(base, { text: 'Vị trí hiện tại:\n' + base.text + acc });
        },
        project() {
            const s = S();
            let n = 0;
            try { n = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints().length : 0; } catch (e) { n = 0; }
            const name = String(s.currentProject || '').replace(/\.[^/.]+$/, '');
            const count = Array.isArray(s.projectsList) ? s.projectsList.length : 1;
            return { text: `Dự án đang mở: ${name || '(chưa có)'} — ${n} mốc.\nTổng số dự án trên máy: ${count}.`, source: DEVICE,
                actions: [{ label: 'Mở Sổ đo', run: () => run('mở sổ đo') }, { label: 'Xem trên bản đồ', run: () => run('mở bản đồ dự án') }] };
        },
        // Xuất bản vẽ có tham số — đi qua đúng bộ xuất của app (cùng bố cục PDF / PNG / ảnh / SVG / DWG)
        exportDrawing({ format, paper, scale, basemap, tables, source }) {
            if (typeof appCadTool === 'undefined' || typeof appCadTool.exportPdf !== 'function') return fail('Chưa nạp bộ xuất bản vẽ.');
            let pl = null, from = '';
            if (source !== 'data') {
                let shapes = [];
                try { shapes = (appCadTool._getAllExportShapes() || []).filter(sh => sh.selected !== false && (sh.vertices || []).length); } catch (e) { shapes = []; }
                if (shapes.length) { pl = { shapes, meta: appCadTool._getExportMeta() }; from = `MiniCAD (${shapes.length} khối)`; }
            }
            if (!pl && typeof appData !== 'undefined' && appData._cadExportPayload) { pl = appData._cadExportPayload(); from = 'Sổ đo'; }
            if (!pl) return fail('Dự án đang mở chưa có mốc hay khối nào để xuất.');
            const meta = Object.assign({}, pl.meta);
            const dims = (typeof EXPORT_PAPER_DIMS !== 'undefined') ? EXPORT_PAPER_DIMS : {};
            if (paper && dims[paper]) Object.assign(meta, { paper, paperW: dims[paper].w, paperH: dims[paper].h, paperLabel: dims[paper].label });
            if (scale !== undefined) { if (scale > 0) { meta.scaleVal = scale; meta.rawScaleVal = String(scale); } else { meta.scaleVal = null; meta.rawScaleVal = 'auto'; } }
            if (basemap) meta.basemap = basemap;
            if (tables) meta.summaryTables = tables;
            const opts = { shapes: pl.shapes, meta, fileBase: pl.fileBase };
            const label = { pdf: 'PDF', png: 'PNG', image: 'ảnh nén', svg: 'SVG', dwg: 'DWG' }[format] || 'PDF';
            const baseName = { none: 'không nền', google_hybrid: 'nền Google vệ tinh', esri_satellite: 'nền Esri vệ tinh', google_streets: 'nền Google đường phố', opentopomap: 'nền địa hình', google_terrain: 'nền địa hình Google', osm_streets: 'nền OpenStreetMap', sentinel2: 'nền Sentinel-2' }[meta.basemap] || 'nền đang chọn';
            const tbl = { area: 'bảng diện tích', points: 'bảng các điểm', both: 'cả hai bảng' }[meta.summaryTables] || 'bảng diện tích';
            const after = () => { if (format === 'dwg') appCadTool.exportDwg(opts); else appCadTool.exportPdf(Object.assign({ target: format }, opts)); };
            return { text: `Đang xuất ${label} từ ${from}: khổ ${meta.paperLabel || meta.paper || 'đang chọn'}, tỷ lệ ${meta.scaleVal ? '1:' + meta.scaleVal : 'tự động'}, ${format === 'dwg' ? 'nét vẽ vector (DWG không nhúng ảnh nền)' : baseName}, ${tbl}.`,
                source: DEVICE, speak: `Đang xuất bản vẽ ${label}.`, after };
        },
        // Kiểm tra chất lượng số liệu đo — máy tự soát, không dùng AI
        checkData() {
            let pts = [];
            try { pts = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints() : []; } catch (e) { pts = []; }
            const k = ktt();
            const linked = pts.some(p => p && (p.lk || p.shape || p.link));
            const res = C.qcPoints(pts, {
                kttDeg: k.val,
                toLngOf: (X, Y) => (typeof convertVn2kToWgs === 'function' ? convertVn2kToWgs(X, Y, k.val, k.k0).lng : NaN),
                polygon: !linked && pts.length <= 300 && S().isPolygonClosed !== false
            });
            const name = String(S().currentProject || '').replace(/\.[^/.]+$/, '');
            const head = `Kiểm tra số liệu dự án ${name || '(chưa có)'}: ${res.stats.n} mốc.`;
            const text = res.issues.length ? head + '\n' + res.issues.map(x => (x.level === 'err' ? '❌ ' : '⚠️ ') + x.text).join('\n') : head + '\n✅ Không thấy lỗi: không đảo X/Y, không trùng, không mốc nhảy, khớp KTT.';
            return { text, source: DEVICE, copy: text, speak: res.issues.length ? `Tìm thấy ${res.issues.length} vấn đề trong số liệu.` : 'Số liệu không có lỗi.',
                actions: [{ label: 'Mở Sổ đo', run: () => run('mở sổ đo') }] };
        },
        theme({ theme }) { if (typeof appTheme !== 'undefined') appTheme.setTheme(theme); return { text: theme === 'light' ? 'Đã chuyển giao diện sáng.' : 'Đã chuyển giao diện tối.', source: DEVICE }; },
        selftest: () => selfTest()
    };

    function fail(msg) { return { text: '⚠️ ' + msg, source: DEVICE }; }
    function titleOf(el) { const t = el.querySelector('.drawer-leaf-title'); return t ? t.textContent.replace(/^\s*\d+(\.\d+)?\s*/, '').trim() : ''; }
    function mapAction(lat, lng, name) {
        return { label: 'Xem trên bản đồ', run: () => { if (typeof appNav !== 'undefined') appNav.openTransformMap({ mode: 'view', singlePoint: { lat, lng, name } }); ui.minimize(); } };
    }

    // ---------------- Tự kiểm thử (Ivy: lệnh qua console chạy đúng đường giao diện dùng, không mô phỏng) ----------------
    async function selfTest() {
        const rows = [];
        const add = (ok, name, detail) => rows.push({ ok, name, detail });
        // 1. Thuật toán: điểm chuẩn TP.HCM (KTT 105°45', múi 3°) và chuyển thuận-nghịch
        try {
            const r = convertWgsToVn2k(10.7769, 106.7009, 105.75, 0.9999);
            const back = convertVn2kToWgs(r.X, r.Y, 105.75, 0.9999);
            const errMm = Math.hypot((back.lat - 10.7769) * 111320, (back.lng - 106.7009) * 109300) * 1000;
            const refOk = Math.abs(r.X - 1191942.305) < 0.005 && Math.abs(r.Y - 603797.261) < 0.005;
            add(refOk && errMm < 1, 'Thuật toán WGS-84 ⇄ VN-2000', `điểm chuẩn ${refOk ? 'khớp' : 'LỆCH'} (X ${r.X.toFixed(3)}, Y ${r.Y.toFixed(3)}); sai số thuận-nghịch ${errMm.toFixed(3)} mm`);
        } catch (e) { add(false, 'Thuật toán WGS-84 ⇄ VN-2000', 'lỗi: ' + e.message); }
        // 2. KTT
        const k = ktt();
        add(k.val >= 102 && k.val <= 109.5 && (k.mui === 3 || k.mui === 6), 'Kinh tuyến trục', kttLabel(k));
        // 3. Bản đồ
        add(typeof L !== 'undefined' && !!L.map, 'Thư viện bản đồ Leaflet', typeof L !== 'undefined' ? 'phiên bản ' + (L.version || '?') : 'chưa nạp');
        // 4. Ngoại tuyến
        try {
            const sw = navigator.serviceWorker;
            const ctl = !!(sw && sw.controller);
            let cached = 0, keyOk = false;
            if (window.caches) {
                const names = await caches.keys();
                const app = names.find(n => /^vn2000-pro-v/.test(n));
                if (app) {
                    const c = await caches.open(app);
                    cached = (await c.keys()).length;
                    keyOk = !!(await c.match('./geodesy.js', { ignoreSearch: true })) && !!(await c.match('./leaflet.js', { ignoreSearch: true }));
                }
            }
            add(ctl && keyOk, 'Chạy ngoại tuyến', ctl ? `${cached} tệp trong bộ nhớ đệm${keyOk ? '' : ' — thiếu tệp lõi, mở lại khi có mạng'}` : 'service worker chưa điều khiển trang (mở lại ứng dụng một lần)');
        } catch (e) { add(false, 'Chạy ngoại tuyến', 'không đọc được bộ nhớ đệm'); }
        // 5. Bộ nhớ lưu trữ
        try {
            const key = 'vn2k_ai_selftest';
            localStorage.setItem(key, '1'); const ok = localStorage.getItem(key) === '1'; localStorage.removeItem(key);
            let extra = '';
            if (navigator.storage && navigator.storage.estimate) {
                const e = await navigator.storage.estimate();
                extra = ` — đã dùng ${(e.usage / 1048576).toFixed(1)} / ${(e.quota / 1048576).toFixed(0)} MB`;
                if (navigator.storage.persisted) extra += (await navigator.storage.persisted()) ? ', lưu bền' : ', chưa xin lưu bền';
            }
            add(ok, 'Bộ nhớ lưu dữ liệu', (ok ? 'ghi/đọc được' : 'KHÔNG ghi được') + extra);
        } catch (e) { add(false, 'Bộ nhớ lưu dữ liệu', 'bị chặn (chế độ riêng tư?)'); }
        // 6. Dữ liệu dự án
        try {
            const pts = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints() : [];
            const bad = pts.filter(p => !(parseFloat(p.x || p.X) > 0) && !(parseFloat(p.lat) > 0)).length;
            add(bad === 0, 'Dữ liệu dự án', `${String(S().currentProject || '').replace(/\.[^/.]+$/, '')}: ${pts.length} mốc${bad ? `, ${bad} mốc thiếu tọa độ` : ''}`);
        } catch (e) { add(false, 'Dữ liệu dự án', 'không đọc được'); }
        // 7. GPS
        try {
            let perm = 'không rõ';
            if (navigator.permissions) perm = (await navigator.permissions.query({ name: 'geolocation' })).state;
            const g = S().lastGps || {};
            const permVi = { granted: 'đã cho phép', denied: 'BỊ CHẶN', prompt: 'chưa hỏi' }[perm] || perm;
            add(perm !== 'denied', 'GPS', `quyền: ${permVi}${g.lat ? `; lần đo cuối ±${(+g.accuracy || 0).toFixed(1)} m` : '; chưa có tọa độ'}`);
        } catch (e) { add(true, 'GPS', 'trình duyệt không báo quyền'); }
        // 8. Thiết bị
        const mem = navigator.deviceMemory ? `${navigator.deviceMemory} GB RAM` : 'RAM không rõ';
        add(true, 'Thiết bị', `${mem}, ${navigator.hardwareConcurrency || '?'} nhân, màn hình ${innerWidth}×${innerHeight}, ${navigator.onLine ? 'có mạng' : 'ngoại tuyến'}`);
        // 9. Giọng nói
        add(voice.canListen() || voice.canSpeak(), 'Giọng nói', `nghe: ${voice.canListen() ? 'có' : 'không hỗ trợ'}; đọc tiếng Việt: ${voice.viVoice() ? 'có' : (voice.canSpeak() ? 'không có giọng Việt' : 'không hỗ trợ')}`);
        // 10. Não AI
        add(true, 'Não AI cục bộ (tùy chọn)', llm.describe());
        add(true, 'AI máy chủ (tùy chọn)', cloud.describe());
        const pass = rows.filter(r => r.ok).length;
        const text = `Kết quả tự kiểm thử: ${pass}/${rows.length} đạt\n` + rows.map(r => `${r.ok ? '✅' : '⚠️'} ${r.name}: ${r.detail}`).join('\n');
        return { text, source: 'test', speak: `Tự kiểm thử xong, ${pass} trên ${rows.length} mục đạt.`, copy: text };
    }

    // ---------------- Giọng nói ----------------
    const voice = {
        rec: null, listening: false,
        canListen: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
        canSpeak: () => !!window.speechSynthesis,
        enabled: () => store.get('vn2k_ai_speak', '0') === '1',
        viVoice() { if (!this.canSpeak()) return null; return speechSynthesis.getVoices().find(v => /^vi/i.test(v.lang)) || null; },
        speak(text) {
            if (!text || !this.enabled() || !this.canSpeak()) return;
            this.stopListening();
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'vi-VN';
            const v = this.viVoice(); if (v) u.voice = v;
            u.rate = 1.05;
            speechSynthesis.speak(u);
        },
        listen(onText, onEnd) {
            const R = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!R) return false;
            if (this.canSpeak()) speechSynthesis.cancel();
            this.stopListening();
            const rec = new R();
            rec.lang = 'vi-VN'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
            let finalText = '';
            rec.onresult = e => {
                let interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) finalText += e.results[i][0].transcript; else interim += e.results[i][0].transcript;
                }
                onText(finalText + interim, false);
            };
            rec.onerror = e => { this.listening = false; onEnd(null, e.error); };
            rec.onend = () => { this.listening = false; this.rec = null; onEnd(finalText.trim()); };
            this.rec = rec; this.listening = true;
            try { rec.start(); } catch (e) { this.listening = false; return false; }
            return true;
        },
        stopListening() { if (this.rec) { try { this.rec.stop(); } catch (e) { /* đã dừng */ } } },
        stopAll() { this.stopListening(); if (this.canSpeak()) speechSynthesis.cancel(); }
    };

    // ---------------- Não AI cục bộ (tùy chọn, wllama = llama.cpp chạy WebAssembly) ----------------
    const llm = {
        engine: null, state: 'off', name: '', progress: 0, error: '', _idle: 0,
        describe() {
            if (this.state === 'ready') return `đang nạp: ${this.name}`;
            if (this.state === 'loading') return `đang nạp ${this.name} (${this.progress}%)`;
            if (this.state === 'error') return 'lỗi: ' + this.error;
            const simd = typeof WebAssembly === 'object' && WebAssembly.validate && WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
            const ram = navigator.deviceMemory ? `, máy ${navigator.deviceMemory} GB RAM${navigator.deviceMemory < 3 ? ' — có thể không đủ' : ''}` : '';
            return `chưa tải mô hình (0 / ~400 MB; app không tự tải)${ram}${simd ? '' : ' — máy KHÔNG hỗ trợ WebAssembly SIMD'}`;
        },
        async ensureEngine() {
            if (this.engine) return this.engine;
            const mod = await import(new URL('vendor/wllama/index.js', document.baseURI).href);
            this.engine = new mod.Wllama({ default: new URL('vendor/wllama/wllama.wasm', document.baseURI).href },
                { suppressNativeLog: true, allowOffline: true });
            return this.engine;
        },
        async load(source, label) {
            if (this.state === 'loading') return;
            this.state = 'loading'; this.progress = 0; this.error = ''; this.name = label || 'mô hình';
            ui.refreshLlm();
            try {
                await this.unload(true);
                const w = await this.ensureEngine();
                const params = { n_ctx: 1024, n_batch: 256, n_threads: Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)), n_gpu_layers: 0 };
                if (source instanceof Blob) await w.loadModel([source], params);
                else await w.loadModelFromUrl(source, Object.assign({ useCache: true, progressCallback: ({ loaded, total }) => { this.progress = total ? Math.round(loaded * 100 / total) : 0; ui.refreshLlm(); } }, params));
                this.state = 'ready';
                store.set('vn2k_ai_llm', JSON.stringify({ url: source instanceof Blob ? '' : source, name: this.name }));
                this.touch();
            } catch (e) {
                this.state = 'error'; this.error = (e && e.message) || String(e);
                try { if (this.engine) await this.engine.exit(); } catch (x) { /* bỏ qua */ }
                this.engine = null;
            }
            ui.refreshLlm();
        },
        async unload(silent) {
            clearTimeout(this._idle);
            if (this.engine) { try { await this.engine.exit(); } catch (e) { /* bỏ qua */ } }
            this.engine = null;
            if (!silent) { this.state = 'off'; ui.refreshLlm(); }
        },
        touch() { clearTimeout(this._idle); this._idle = setTimeout(() => { if (this.state === 'ready') { this.unload(); ui.note('Đã gỡ mô hình AI khỏi bộ nhớ sau 3 phút không dùng (nạp lại khi cần).'); } }, LLM_IDLE_MS); },
        /** Đổi câu tự do → một lệnh chuẩn (hoặc null). Bị khóa trong danh sách lệnh bằng ngữ pháp JSON. */
        /** Câu tự do → MỘT lời gọi công cụ {intent, args} (ngữ pháp JSON + ví dụ gần nhất). Không hợp lệ → null. */
        async toCall(text) {
            if (this.state !== 'ready' || !this.engine) return null;
            this.touch();
            const base = { messages: C.buildToolMessages(text, window.AssistantDataset || [], 5), max_tokens: 120, temperature: 0 };
            let res = null;
            try { res = await this.engine.createChatCompletion(Object.assign({ grammar: C.buildGrammar() }, base)); }
            catch (e) { try { res = await this.engine.createChatCompletion(base); } catch (x) { res = null; } }
            const out = ((((res || {}).choices || [])[0] || {}).message || {}).content || '';
            const call = C.validateCall(C.parseToolJson(out), { provinces: provinces() });
            if (call) return call;
            // Dự phòng: kiểu cũ — chọn một lệnh chuẩn không tham số
            const cmd = await this.toCommand(text);
            return cmd ? C.route(cmd, { provinces: provinces() }) : null;
        },
        async toCommand(text) {
            if (this.state !== 'ready' || !this.engine) return null;
            this.touch();
            // Ngữ pháp GBNF: mô hình CHỈ có thể sinh đúng một chuỗi trong danh sách lệnh (hoặc "khong ro").
            const grammar = 'root ::= ' + C.CANONICAL.concat(['khong ro']).map(c => JSON.stringify(c)).join(' | ');
            const base = { messages: C.buildLlmMessages(text), max_tokens: 24, temperature: 0 };
            let res;
            try { res = await this.engine.createChatCompletion(Object.assign({ grammar }, base)); }
            catch (e) { res = await this.engine.createChatCompletion(base); }
            const cmd = ((((res || {}).choices || [])[0] || {}).message || {}).content || '';
            return C.parseLlmCommand(cmd);
        }
    };

    // ---------------- AI máy chủ (khi có mạng) — kiểu Xiaozhi: máy chủ hiểu câu, app tự thực hiện ----------------
    // Mặc định dùng MÁY CHỦ CHUNG của app (/api/ai, nhà cung cấp miễn phí Groq / Gemini, khóa giữ trên Vercel):
    // app chỉ gửi câu người dùng, máy chủ chỉ trả về MỘT lời gọi công cụ của app — không trò chuyện / làm việc khác.
    // Người dùng có thể đổi sang địa chỉ riêng OpenAI-compatible (Ollama, LM Studio, máy chủ tự dựng…).
    const cloud = {
        state: 'idle', error: '', server: null,   // server: null = chưa hỏi, {ready, providers}
        cfg() {
            let c = {};
            try { c = JSON.parse(store.get('vn2k_ai_cloud', '{}')) || {}; } catch (e) { c = {}; }
            return { enabled: c.enabled !== false, url: c.url || '', model: c.model || '', key: c.key || '' };
        },
        save(c) { store.set('vn2k_ai_cloud', JSON.stringify(c)); },
        usable() {
            const c = this.cfg();
            if (!c.enabled || navigator.onLine === false) return false;
            return !!c.url || !(this.server && this.server.ready === false);
        },
        appEndpoint() { return new URL('api/ai', document.baseURI).href; },
        /** Hỏi máy chủ chung đã có khóa AI chưa (một lần mỗi phiên, không lộ khóa). */
        async probe() {
            if (this.server || !/^https?:/.test(location.protocol)) return this.server;
            try {
                const r = await fetch(this.appEndpoint(), { method: 'GET', cache: 'no-store' });
                this.server = r.ok ? await r.json() : { ready: false };
            } catch (e) { this.server = null; }
            return this.server;
        },
        describe() {
            const c = this.cfg();
            if (!c.enabled) return 'tắt';
            if (navigator.onLine === false) return 'đang ngoại tuyến — dùng AI cục bộ / quy tắc';
            if (this.state === 'error') return 'lỗi: ' + this.error;
            if (c.url) return `bật — địa chỉ riêng ${c.url.replace(/^https?:\/\//, '').split('/')[0]}${c.model ? ' · ' + c.model : ''}`;
            if (this.server && this.server.ready === false) return 'máy chủ chung chưa được cấu hình khóa AI';
            if (this.server && this.server.ready) return `bật — máy chủ chung của app (${(this.server.providers || []).join(', ') || 'AI miễn phí'}), chỉ cho chức năng của app`;
            return 'bật — máy chủ chung của app';
        },
        /** Trả về {call} (lời gọi công cụ đã kiểm) hoặc null. Không bao giờ trả chữ tự do. */
        async ask(text) {
            const c = this.cfg();
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 15000);
            try {
                let raw = null;
                if (!c.url) {
                    const r = await fetch(this.appEndpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: String(text || '').slice(0, 300) }), signal: ctrl.signal });
                    const j = await r.json().catch(() => ({}));
                    if (r.status === 503) { this.server = { ready: false }; throw new Error('máy chủ chung chưa được cấu hình khóa AI'); }
                    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
                    raw = j.call ? { tool: j.call.intent, args: j.call.args } : null;
                    if (raw && (raw.tool === 'kttOf' || raw.tool === 'setProvince')) { this.state = 'ok'; return { call: j.call }; }
                } else {
                    const body = { messages: C.buildToolMessages(text, window.AssistantDataset || [], 4), tools: C.openAiTools(), tool_choice: 'required', temperature: 0, max_tokens: 200 };
                    if (c.model) body.model = c.model;
                    const headers = { 'Content-Type': 'application/json' };
                    if (c.key) headers.Authorization = 'Bearer ' + c.key;
                    const ep = c.url.replace(/\/+$/, '') + (/\/chat\/completions$/.test(c.url) ? '' : '/chat/completions');
                    const r = await fetch(ep, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    const j = await r.json();
                    const m = (((j || {}).choices || [])[0] || {}).message || {};
                    const tc = (m.tool_calls || [])[0];
                    raw = tc && tc.function ? { tool: tc.function.name, args: tc.function.arguments } : C.parseToolJson(m.content || '');
                }
                this.state = 'ok'; this.error = '';
                const call = raw ? C.validateCall(raw, { provinces: provinces() }) : null;
                return call ? { call } : null;
            } catch (e) {
                this.state = 'error'; this.error = e.name === 'AbortError' ? 'quá 15 giây không trả lời' : (e.message || String(e));
                throw new Error(this.error);
            } finally { clearTimeout(timer); }
        }
    };

    // ---------------- Điều phối ----------------
    let busy = false;
    async function run(text) {
        const parts = C.splitChain(text);
        if (!parts.length) return;
        ui.user(text);
        let lastPoint = null;
        for (const part of parts) {
            let r = C.route(part, { provinces: provinces() });
            // "… rồi xem trên bản đồ" sau một phép chuyển đổi: mở bản đồ của phân hệ Chuyển đổi tại điểm vừa tính,
            // không mở Bản đồ dự án (nguyên tắc tách biệt giao diện trong AGENTS.md).
            if (lastPoint && r.intent === 'open' && r.args.target === 'drawerItem_map' && !/du an|moc/.test(C.fold(part))) {
                mapAction(lastPoint.lat, lastPoint.lng, 'Điểm từ trợ lý').run();
                ui.bot({ text: 'Đã mở bản đồ chuyển đổi tại điểm vừa tính.', source: DEVICE });
                continue;
            }
            let viaAi = '', cloudSaidNone = false;
            // Kết hợp: quy tắc trên máy trước → AI máy chủ khi có mạng → AI cục bộ khi ngoại tuyến
            if (r.intent === 'unknown' && cloud.usable()) {
                ui.thinking(true, 'AI máy chủ đang đọc câu…');
                try {
                    const a = await cloud.ask(part);
                    if (a && a.call) { r = a.call; viaAi = 'cloud'; } else cloudSaidNone = true;
                } catch (e) { ui.note('AI máy chủ không trả lời (' + e.message + ')' + (llm.state === 'ready' ? ' — chuyển sang AI cục bộ.' : '.')); }
                ui.thinking(false);
            }
            if (r.intent === 'unknown' && llm.state === 'ready') {
                ui.thinking(true);
                try {
                    const call = await llm.toCall(part);
                    if (call && call.intent !== 'unknown') { r = call; viaAi = 'local'; }
                } catch (e) { ui.note('Mô hình AI gặp lỗi: ' + e.message); }
                ui.thinking(false);
            }
            let res;
            if (r.intent === 'unknown' || r.intent === 'empty' || !tools[r.intent]) {
                res = { text: (cloudSaidNone ? 'Câu này không khớp chức năng nào của app — trợ lý chỉ làm các việc của app (chuyển tọa độ, xuất bản vẽ, kiểm tra số liệu, mở chức năng…).' : 'Xin lỗi, tôi chưa hiểu yêu cầu này nên không đoán bừa.') + (llm.state === 'ready' || cloud.usable() ? '' : (cloud.cfg().enabled ? ' (Đang ngoại tuyến nên AI máy chủ tạm nghỉ; có thể tải AI cục bộ ở nút ⚙ để dùng khi mất mạng.)' : ' (Có thể bật AI ở nút ⚙ để hiểu câu tự do hơn.)')) +
                    '\nThử: "mở bản đồ", "10.7769 106.7009", "KTT hiện tại", "kiểm thử", "giúp".', source: DEVICE, speak: 'Xin lỗi, tôi chưa hiểu. Bạn thử nói cách khác nhé.' };
            } else {
                try { res = await tools[r.intent](r.args || {}); } catch (e) { res = fail('Lỗi khi thực hiện: ' + e.message); }
                if (viaAi) res.source = viaAi === 'cloud' ? 'cloud' : 'ai';
            }
            ui.bot(res);
            if (res.point) lastPoint = res.point;
            voice.speak(res.speak !== undefined ? res.speak : res.text.split('\n')[0]);
            if (typeof res.after === 'function') { ui.minimize(); setTimeout(res.after, 60); }
        }
    }
    async function send(text) {
        if (busy) return;
        busy = true;
        try { await run(text); } finally { busy = false; }
    }

    // ---------------- Giao diện ----------------
    const QUICK = ['Kiểm tra số liệu', 'Xuất PDF A3', 'Vị trí của tôi', 'KTT hiện tại', 'Kiểm thử', 'Giúp'];
    const ui = {
        el: null,
        build() {
            if (this.el) return this.el;
            const d = document.createElement('section');
            d.id = 'aiPanel'; d.className = 'ai-panel'; d.hidden = true;
            d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Trợ lý cục bộ');
            d.innerHTML = `
              <header class="ai-head">
                <div class="ai-title"><span class="ai-dot" aria-hidden="true"></span><b>Trợ lý cục bộ</b><span class="ai-sub" id="aiSub">chạy trên máy này · không cần mạng</span></div>
                <button type="button" class="ai-icon" id="aiSpeakBtn" title="Đọc câu trả lời thành tiếng" aria-pressed="false">🔈</button>
                <button type="button" class="ai-icon" id="aiCfgBtn" title="Não AI cục bộ (tùy chọn)">⚙</button>
                <button type="button" class="ai-icon" id="aiCloseBtn" title="Đóng">✕</button>
              </header>
              <div class="ai-cfg" id="aiCfg" hidden>
                <p><b>Não AI cục bộ (tùy chọn).</b> Không bật vẫn dùng đủ mọi lệnh. Bật lên, mô hình chỉ giúp <i>hiểu câu nói tự do</i> rồi đổi thành một lệnh có sẵn — không bao giờ tự tính tọa độ. Chạy hoàn toàn trên máy (llama.cpp WebAssembly), tự gỡ khỏi bộ nhớ sau 3 phút không dùng.</p>
                <div class="ai-cfg-row">
                  <button type="button" class="btn-sm" id="aiLlmUrl">Tải ${esc(LLM_SUGGESTED.name)}</button>
                  <label class="btn-sm ai-file">Chọn tệp .gguf trên máy<input type="file" id="aiLlmFile" accept=".gguf" hidden></label>
                  <button type="button" class="btn-sm" id="aiLlmOff">Gỡ mô hình</button>
                </div>
                <p class="ai-cfg-status" id="aiLlmStatus"></p>
                <p class="ai-cfg-note">Tải một lần (cần mạng, nên dùng Wi-Fi), sau đó chạy ngoại tuyến. Máy yếu có thể mất 10–30 giây cho mỗi câu khó; các lệnh thường vẫn trả lời tức thì không qua AI.</p>
                <hr class="ai-cfg-sep">
                <p><b>AI máy chủ khi có mạng (miễn phí, dùng chung).</b> Câu khó được gửi lên máy chủ chung của app để hiểu thành <i>một lệnh của app</i>, rồi app tự thực hiện. Chỉ dùng cho chức năng của app — không trò chuyện hay làm việc khác. Chỉ gửi câu bạn nói/gõ, không gửi dữ liệu dự án; mất mạng thì tự quay về AI cục bộ / quy tắc.</p>
                <label class="ai-cfg-check"><input type="checkbox" id="aiCloudOn"> Dùng AI máy chủ khi có mạng</label>
                <div class="ai-cfg-grid">
                  <input id="aiCloudUrl" class="ai-cfg-in" type="url" placeholder="Địa chỉ riêng (để trống = máy chủ chung của app)" autocomplete="off">
                  <input id="aiCloudModel" class="ai-cfg-in" type="text" placeholder="Mô hình (vd. qwen-plus, deepseek-chat)" autocomplete="off">
                  <input id="aiCloudKey" class="ai-cfg-in" type="password" placeholder="Khóa API (chỉ khi dùng địa chỉ riêng)" autocomplete="off">
                </div>
                <div class="ai-cfg-row"><button type="button" class="btn-sm" id="aiCloudSave">Lưu</button><button type="button" class="btn-sm" id="aiCloudTest">Thử kết nối</button></div>
                <p class="ai-cfg-status" id="aiCloudStatus"></p>
              </div>
              <div class="ai-log" id="aiLog" aria-live="polite"></div>
              <div class="ai-quick" id="aiQuick">${QUICK.map(q => `<button type="button" class="ai-chip">${q}</button>`).join('')}</div>
              <form class="ai-input" id="aiForm" autocomplete="off">
                <button type="button" class="ai-icon ai-mic" id="aiMic" title="Nói (tiếng Việt)">🎤</button>
                <input id="aiText" type="text" inputmode="text" enterkeyhint="send" placeholder="Nói hoặc gõ: mở bản đồ, 10.7769 106.7009…" aria-label="Câu lệnh cho trợ lý">
                <button type="submit" class="ai-icon ai-send" title="Gửi">➤</button>
              </form>`;
            document.body.appendChild(d);
            this.el = d;
            $('aiCloseBtn').onclick = () => this.close();
            $('aiCfgBtn').onclick = () => { $('aiCfg').hidden = !$('aiCfg').hidden; this.refreshLlm(); };
            const sp = $('aiSpeakBtn');
            const syncSp = () => { const on = voice.enabled(); sp.setAttribute('aria-pressed', String(on)); sp.textContent = on ? '🔊' : '🔈'; };
            sp.onclick = () => { store.set('vn2k_ai_speak', voice.enabled() ? '0' : '1'); syncSp(); if (!voice.enabled()) voice.stopAll(); };
            syncSp();
            if (!voice.canSpeak()) sp.hidden = true;
            $('aiQuick').onclick = e => { const b = e.target.closest('.ai-chip'); if (b) send(b.textContent); };
            $('aiForm').onsubmit = e => { e.preventDefault(); const t = $('aiText').value.trim(); if (!t) return; $('aiText').value = ''; send(t); };
            const mic = $('aiMic');
            if (!voice.canListen()) mic.hidden = true;
            mic.onclick = () => {
                if (voice.listening) { voice.stopListening(); return; }
                const input = $('aiText');
                mic.classList.add('is-on');
                const ok = voice.listen(t => { input.value = t; }, (finalText, err) => {
                    mic.classList.remove('is-on');
                    if (err) { this.note(err === 'not-allowed' ? 'Chưa được cấp quyền micro.' : (err === 'network' ? 'Nhận giọng nói trên trình duyệt này cần mạng; hãy gõ lệnh khi ngoại tuyến.' : 'Không nghe rõ, thử lại.')); return; }
                    if (finalText) { input.value = ''; send(finalText); }
                });
                if (!ok) { mic.classList.remove('is-on'); this.note('Trình duyệt không hỗ trợ nhận giọng nói.'); }
            };
            // Mô hình tải từ mạng lần trước nằm trong bộ nhớ đệm của trình duyệt → nạp lại được khi ngoại tuyến.
            let last = null;
            try { last = JSON.parse(store.get('vn2k_ai_llm', 'null')); } catch (e) { last = null; }
            const urlBtn = $('aiLlmUrl');
            if (last && last.url) urlBtn.textContent = `Nạp ${last.name}`;
            urlBtn.onclick = () => (last && last.url ? llm.load(last.url, last.name) : llm.load(LLM_SUGGESTED.url, LLM_SUGGESTED.name));
            $('aiLlmFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) llm.load(f, f.name); e.target.value = ''; };
            $('aiLlmOff').onclick = () => llm.unload();
            const fillCloud = () => { const cc = cloud.cfg(); $('aiCloudOn').checked = cc.enabled; $('aiCloudUrl').value = cc.url; $('aiCloudModel').value = cc.model; $('aiCloudKey').value = cc.key; };
            fillCloud();
            $('aiCfgBtn').addEventListener('click', fillCloud);
            const saveCloud = () => { cloud.save({ enabled: $('aiCloudOn').checked, url: $('aiCloudUrl').value.trim(), model: $('aiCloudModel').value.trim(), key: $('aiCloudKey').value.trim() }); cloud.state = 'idle'; this.refreshLlm(); };
            $('aiCloudOn').onchange = saveCloud;
            $('aiCloudSave').onclick = () => { saveCloud(); this.note('Đã lưu cấu hình AI máy chủ.'); };
            $('aiCloudTest').onclick = async () => {
                saveCloud();
                cloud.server = null; await cloud.probe();
                const st = $('aiCloudStatus'); st.textContent = 'Đang thử…';
                try { const a = await cloud.ask('mở bản đồ dự án'); st.textContent = a && a.call ? `✓ Kết nối được — máy chủ hiểu câu thử thành lệnh "${a.call.intent}".` : '⚠️ Kết nối được nhưng máy chủ không trả về lệnh của app (mô hình có hỗ trợ tool calling không?).'; }
                catch (e) { st.textContent = '⚠️ ' + e.message; }
            };
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && !d.hidden) this.close(); });
            this.bot({ text: 'Xin chào! Tôi chạy ngay trên máy này, không cần mạng. Gõ hoặc nói lệnh — ví dụ "10.7769 106.7009", "mở MiniCAD", "kiểm thử". Nối nhiều lệnh bằng "rồi".', source: DEVICE });
            return d;
        },
        open() { this.build(); cloud.probe().then(() => this.refreshLlm()); this.el.hidden = false; document.body.classList.add('ai-open'); this.el.classList.remove('is-min'); setTimeout(() => { const i = $('aiText'); if (i && matchMedia('(pointer: fine)').matches) i.focus(); }, 50); syncBtn(); },
        close() { if (!this.el) return; this.el.hidden = true; document.body.classList.remove('ai-open'); voice.stopAll(); syncBtn(); },
        toggle() { if (!this.el || this.el.hidden) this.open(); else this.close(); },
        minimize() { if (this.el && matchMedia('(max-width: 767px)').matches) this.close(); },
        push(html, cls) {
            const log = $('aiLog');
            const row = document.createElement('div');
            row.className = 'ai-msg ' + cls; row.innerHTML = html;
            log.appendChild(row);
            while (log.children.length > 60) log.removeChild(log.firstChild);
            log.scrollTop = log.scrollHeight;
            return row;
        },
        user(t) { this.push(`<div class="ai-bubble">${esc(t)}</div>`, 'is-user'); },
        bot(r) {
            const badge = r.source === 'ai' ? '<span class="ai-badge is-ai">AI cục bộ hiểu câu → máy tự thực hiện</span>'
                : r.source === 'cloud' ? '<span class="ai-badge is-ai">AI máy chủ hiểu câu → máy tự thực hiện</span>'
                : r.source === 'test' ? '<span class="ai-badge is-test">Tự kiểm thử</span>'
                    : '<span class="ai-badge is-dev">✓ Máy tự tính — không dùng AI</span>';
            const row = this.push(`<div class="ai-bubble">${badge}<div class="ai-text">${esc(r.text)}</div><div class="ai-acts"></div></div>`, 'is-bot');
            const acts = row.querySelector('.ai-acts');
            (r.actions || []).forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ai-act'; b.textContent = a.label; b.onclick = a.run; acts.appendChild(b); });
            if (r.copy && navigator.clipboard) {
                const b = document.createElement('button'); b.type = 'button'; b.className = 'ai-act'; b.textContent = 'Chép';
                b.onclick = () => navigator.clipboard.writeText(r.copy).then(() => { b.textContent = 'Đã chép'; }, () => { b.textContent = 'Không chép được'; });
                acts.appendChild(b);
            }
            if (!acts.children.length) acts.remove();
        },
        note(t) { if (this.el) this.push(`<div class="ai-note">${esc(t)}</div>`, 'is-note'); },
        thinking(on, label) {
            const old = this.el && this.el.querySelector('.ai-msg.is-thinking');
            if (old) old.remove();
            if (on) this.push(`<div class="ai-note">${esc(label || 'AI cục bộ đang đọc câu…')}</div>`, 'is-note is-thinking');
        },
        refreshLlm() {
            const s = $('aiLlmStatus');
            if (s) s.textContent = 'Trạng thái: ' + llm.describe();
            const cs = $('aiCloudStatus');
            if (cs && !/^(Đang thử|✓|⚠️)/.test(cs.textContent)) cs.textContent = 'AI máy chủ: ' + cloud.describe();
            const sub = $('aiSub');
            if (sub) sub.textContent = llm.state === 'loading' ? `đang nạp AI ${llm.progress}%` : [llm.state === 'ready' ? 'AI cục bộ sẵn sàng' : 'quy tắc trên máy', cloud.usable() ? 'AI máy chủ khi có mạng' : 'không cần mạng'].join(' · ');
        }
    };

    function syncBtn() {
        const b = $('btnHeaderAssistant');
        if (b) b.setAttribute('aria-expanded', String(!!(ui.el && !ui.el.hidden)));
    }

    window.appAssistant = { open: () => ui.open(), close: () => ui.close(), toggle: () => ui.toggle(), send, selfTest, llm, voice, cloud, tools };
    // Trình duyệt nạp danh sách giọng đọc không đồng bộ.
    if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { /* chỉ để kích nạp */ });
})();
