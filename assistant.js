/* Trợ lý cục bộ — GIAO DIỆN + CÔNG CỤ THÔNG MINH + BỘ NHỚ HỘI THOẠI + GIỌNG NÓI + NÃO AI TÙY CHỌN.
   Chạy hoàn toàn trên máy đang cài ứng dụng. Lõi định tuyến ở assistant-core.js (không AI).
   Pha làm việc (học từ Ivy AI): NGHE (Web Speech) → HIỂU (bộ định tuyến; nếu không chắc mới hỏi AI máy chủ / cục bộ)
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

    // ---------------- Bộ nhớ phiên hội thoại (đa lượt) ----------------
    const session = {
        lastPoint: null,        // { lat, lng, X, Y, name, source: 'transform'|'project'|'gps' }
        lastIntent: '',
        history: [],            // lịch sử câu lệnh để bấm ↑/↓
        historyIdx: -1
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
    function activePoints() {
        try { return (typeof appData !== 'undefined' && appData.getPoints) ? (appData.getPoints(S().currentProject) || []) : []; } catch (e) { return []; }
    }
    function pointCoords(p) {
        const k = ktt();
        let X = parseFloat(p.x != null ? p.x : p.X), Y = parseFloat(p.y != null ? p.y : p.Y);
        let lat = parseFloat(p.lat), lng = parseFloat(p.lng);
        if ((!Number.isFinite(X) || !Number.isFinite(Y)) && Number.isFinite(lat) && Number.isFinite(lng) && typeof convertWgsToVn2k === 'function') {
            const vn = convertWgsToVn2k(lat, lng, k.val, k.k0);
            X = vn.X; Y = vn.Y;
        }
        if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && Number.isFinite(X) && Number.isFinite(Y) && typeof convertVn2kToWgs === 'function') {
            const wg = convertVn2kToWgs(X, Y, k.val, k.k0);
            lat = wg.lat; lng = wg.lng;
        }
        return { X, Y, lat, lng };
    }
    /** Tìm mốc theo tên/ghi chú trong dự án hiện tại (ưu tiên khớp chính xác → tiền tố → chứa). */
    function matchProjectPoint(query, searchAll) {
        const q = C.fold(query);
        if (!q) return null;
        const searchList = (pts, proj) => {
            let exact = null, pref = null, sub = null;
            pts.forEach((p, idx) => {
                const fn = C.fold(p.name || p.ten || '');
                const note = C.fold(p.note || '');
                if (fn === q && !exact) exact = { point: p, index: idx, project: proj };
                else if (fn.startsWith(q) && !pref) pref = { point: p, index: idx, project: proj };
                else if ((fn.includes(q) || (note && note.includes(q))) && !sub) sub = { point: p, index: idx, project: proj };
            });
            return exact || pref || sub;
        };
        const cur = S().currentProject;
        const inCur = searchList(activePoints(), cur);
        if (inCur || !searchAll || typeof appData === 'undefined') return inCur;
        const list = Array.isArray(S().projectsList) ? S().projectsList : [];
        for (const pr of list) {
            if (pr === cur) continue;
            try {
                const hit = searchList(appData.getPoints(pr) || [], pr);
                if (hit) return hit;
            } catch (e) { /* bỏ qua dự án lỗi */ }
        }
        return null;
    }

    // ---------------- Công cụ: mỗi ý định → một hàm của app ----------------
    // Kết quả: { text, source: 'device'|'ai'|'cloud'|'test', actions: [{label, run}], speak }
    const DEVICE = 'device';
    const tools = {
        help: () => ({ text: 'Tôi chạy ngay trên máy này, không cần mạng. Bạn có thể nói hoặc gõ:\n• ' + C.HELP.join('\n• '), source: DEVICE, speak: 'Tôi giúp chuyển đổi tọa độ, tìm và cắm mốc, điều khiển MiniCAD, bản đồ quy hoạch, lộ trình, xuất bản vẽ và tự kiểm thử.' }),
        identity: () => ({ text: 'Tôi là trợ lý thông minh của VN2000 Pro: chạy trên chính thiết bị này, không gửi dữ liệu dự án đi đâu. Mọi phép tính tọa độ, khoảng cách, diện tích luôn do thuật toán trắc địa của ứng dụng thực hiện, không do AI đoán.', source: DEVICE }),
        time: () => { const d = new Date(); return { text: `Bây giờ là ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (đồng hồ máy).`, source: DEVICE }; },
        date: () => { const d = new Date(); return { text: `Hôm nay là ${d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}.`, source: DEVICE }; },
        stop: () => { voice.stopAll(); return { text: 'Đã dừng.', source: DEVICE, speak: '' }; },

        wgs2vn({ lat, lng, showOnMap, saveAs, saveNote }) {
            const k = ktt();
            if (typeof convertWgsToVn2k !== 'function') return fail('Chưa nạp xong thuật toán chuyển đổi.');
            const r = convertWgsToVn2k(lat, lng, k.val, k.k0);
            const pt = { lat, lng, X: r.X, Y: r.Y, name: saveAs || 'Điểm từ trợ lý', source: 'transform' };
            let text = `WGS-84 ${C.fmtDeg(lat)}, ${C.fmtDeg(lng)}\n→ VN-2000: X = ${C.fmtM(r.X)} m; Y = ${C.fmtM(r.Y)} m\n${kttLabel(k)}`;
            if (saveAs) {
                const sv = savePointToProject(pt, saveAs, saveNote || 'Lưu từ Trợ lý');
                if (sv.ok) text += `\n✅ Đã lưu mốc "${sv.name}" vào dự án ${sv.project}.`;
            }
            const acts = [mapAction(lat, lng, pt.name)];
            if (!saveAs) acts.push({ label: 'Lưu vào dự án', run: () => run('lưu điểm vừa chuyển vào dự án') });
            acts.push({ label: 'Cắm mốc', run: () => openStakeoutForPoint(pt) });
            const out = { text, source: DEVICE, point: pt, copy: `${r.X.toFixed(3)}\t${r.Y.toFixed(3)}`, speak: `X bằng ${Math.round(r.X)} mét, Y bằng ${Math.round(r.Y)} mét.`, actions: acts };
            if (showOnMap) out.after = () => mapAction(lat, lng, pt.name).run();
            return out;
        },
        vn2wgs({ X, Y, showOnMap, saveAs, saveNote }) {
            const k = ktt();
            if (typeof convertVn2kToWgs !== 'function') return fail('Chưa nạp xong thuật toán chuyển đổi.');
            const r = convertVn2kToWgs(X, Y, k.val, k.k0);
            const ok = r.lat > 7 && r.lat < 24.5 && r.lng > 101 && r.lng < 118;
            const pt = ok ? { lat: r.lat, lng: r.lng, X, Y, name: saveAs || 'Điểm từ trợ lý', source: 'transform' } : null;
            let text = `VN-2000 X = ${C.fmtM(X)} m; Y = ${C.fmtM(Y)} m (${kttLabel(k)})\n→ WGS-84: ${C.fmtDeg(r.lat)}, ${C.fmtDeg(r.lng)}` +
                (ok ? '' : '\n⚠️ Kết quả nằm ngoài lãnh thổ Việt Nam — kiểm tra lại KTT hoặc thứ tự X, Y.');
            if (saveAs && pt) {
                const sv = savePointToProject(pt, saveAs, saveNote || 'Lưu từ Trợ lý');
                if (sv.ok) text += `\n✅ Đã lưu mốc "${sv.name}" vào dự án ${sv.project}.`;
            }
            const acts = ok ? [mapAction(r.lat, r.lng, pt.name)] : [];
            if (ok && !saveAs) acts.push({ label: 'Lưu vào dự án', run: () => run('lưu điểm vừa chuyển vào dự án') });
            if (ok) acts.push({ label: 'Cắm mốc', run: () => openStakeoutForPoint(pt) });
            const out = { text, source: DEVICE, point: pt, copy: `${r.lat.toFixed(7)}, ${r.lng.toFixed(7)}`, speak: 'Đã chuyển sang WGS 84.', actions: acts };
            if (showOnMap && ok) out.after = () => mapAction(r.lat, r.lng, pt.name).run();
            return out;
        },
        distance({ p1, p2 }) {
            const k = ktt();
            const toVn = p => p.kind === 'vn2k' ? p : convertWgsToVn2k(p.lat, p.lng, k.val, k.k0);
            const a = toVn(p1), b = toVn(p2);
            const r = calculateDistanceAndAzimuth(a.X, a.Y, b.X, b.Y);
            return { text: `Khoảng cách phẳng VN-2000: ${C.fmtM(r.dist)} m\nPhương vị: ${C.fmtAzimuth(r.azimuthDeg)} (${r.quarter})\nΔX = ${C.fmtM(r.dX)} m; ΔY = ${C.fmtM(r.dY)} m` +
                (p1.kind === 'wgs' ? `\nTính trên ${kttLabel(k)}` : ''), source: DEVICE, copy: `${r.dist.toFixed(3)} m | ${C.fmtAzimuth(r.azimuthDeg)}`, speak: `Khoảng cách ${r.dist.toFixed(2).replace('.', ' phẩy ')} mét.` };
        },
        calcArea({ points }) {
            const k = ktt();
            const vnPts = (points || []).map(p => {
                if (p.kind === 'vn2k') return { x: p.X, y: p.Y };
                const r = convertWgsToVn2k(p.lat, p.lng, k.val, k.k0);
                return { x: r.X, y: r.Y };
            });
            if (vnPts.length < 3 || typeof calculatePolygonAreaAndPerimeter !== 'function') return fail('Cần ít nhất 3 cặp tọa độ hợp lệ để tính diện tích.');
            const res = calculatePolygonAreaAndPerimeter(vnPts);
            const areaHa = (res.area / 10000).toFixed(4);
            const text = `Đa giác ${vnPts.length} đỉnh (${kttLabel(k)}):\n• Diện tích: ${res.area.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m² (${areaHa} ha)\n• Chu vi: ${C.fmtM(res.perimeter)} m`;
            return { text, source: DEVICE, copy: `S=${res.area.toFixed(2)} m2 (${areaHa} ha) | P=${res.perimeter.toFixed(3)} m`, speak: `Diện tích ${res.area.toFixed(1).replace('.', ' phẩy ')} mét vuông.` };
        },
        findPoint({ query }) {
            const hit = matchProjectPoint(query, true);
            if (!hit) {
                const pts = activePoints();
                const sample = pts.slice(0, 5).map(p => p.name).filter(Boolean).join(', ');
                return fail(`Không tìm thấy mốc "${query}".${sample ? ' Các mốc đang có: ' + sample + (pts.length > 5 ? '…' : '') + '.' : ' Dự án hiện tại chưa có mốc nào.'}`);
            }
            const p = hit.point;
            const c = pointCoords(p);
            const projClean = String(hit.project || '').replace(/\.[^/.]+$/, '');
            const zTxt = Number.isFinite(parseFloat(p.z)) ? `\n• Cao độ Z: ${parseFloat(p.z).toFixed(3)} m` : '';
            const noteTxt = p.note ? `\n• Ghi chú: ${p.note}` : '';
            const ptObj = { lat: c.lat, lng: c.lng, X: c.X, Y: c.Y, name: p.name, source: 'project', project: hit.project };
            const text = `📍 Mốc ${p.name} (Dự án: ${projClean})\n• VN-2000: X = ${C.fmtM(c.X)} m; Y = ${C.fmtM(c.Y)} m\n• WGS-84: ${C.fmtDeg(c.lat)}, ${C.fmtDeg(c.lng)}${zTxt}${noteTxt}`;
            const acts = [];
            if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
                acts.push(projectMapAction(c.lat, c.lng, p.name, hit.project));
                acts.push({ label: 'Cắm mốc ngay', run: () => run(`cắm mốc ${p.name}`) });
            }
            return { text, source: DEVICE, point: ptObj, copy: `${p.name}\t${c.X.toFixed(3)}\t${c.Y.toFixed(3)}`, speak: `Tìm thấy mốc ${p.name}.`, actions: acts };
        },
        distancePoints({ from, to }) {
            const resolveRef = ref => {
                if (ref === 'GPS') {
                    const g = S().lastGps || {};
                    if (!g.lat || !g.lng) return { err: 'Chưa có tín hiệu GPS. Nói "bật GPS" trước rồi thử lại.' };
                    const c = pointCoords({ lat: g.lat, lng: g.lng });
                    return { label: 'Vị trí hiện tại (GPS)', X: c.X, Y: c.Y };
                }
                if (ref === 'LAST') {
                    if (!session.lastPoint) return { err: 'Chưa có điểm nào vừa chuyển đổi trong phiên này.' };
                    const c = pointCoords(session.lastPoint);
                    return { label: session.lastPoint.name || 'Điểm vừa rồi', X: c.X, Y: c.Y };
                }
                const hit = matchProjectPoint(ref, true);
                if (!hit) return { err: `Không tìm thấy mốc "${ref}" trong sổ đo.` };
                const c = pointCoords(hit.point);
                return { label: hit.point.name, X: c.X, Y: c.Y };
            };
            const a = resolveRef(from), b = resolveRef(to);
            if (a.err) return fail(a.err);
            if (b.err) return fail(b.err);
            const r = calculateDistanceAndAzimuth(a.X, a.Y, b.X, b.Y);
            const text = `📏 ${a.label} → ${b.label}\n• Cự ly ngang VN-2000: ${C.fmtM(r.dist)} m\n• Phương vị: ${C.fmtAzimuth(r.azimuthDeg)} (${r.quarter})\n• ΔX = ${C.fmtM(r.dX)} m; ΔY = ${C.fmtM(r.dY)} m`;
            return { text, source: DEVICE, copy: `${a.label}->${b.label}: S=${r.dist.toFixed(3)}m, Az=${C.fmtAzimuth(r.azimuthDeg)}`, speak: `Từ ${a.label} đến ${b.label} dài ${r.dist.toFixed(2).replace('.', ' phẩy ')} mét.` };
        },
        savePoint({ name, note, source }) {
            let pt = null;
            if (source === 'gps') {
                const g = S().lastGps || {};
                if (!g.lat || !g.lng) return { text: '⚠️ Chưa có tọa độ GPS để lưu. Hãy bật GPS trước.', source: DEVICE, actions: [{ label: 'Bật GPS', run: () => run('bật GPS') }] };
                const c = pointCoords({ lat: g.lat, lng: g.lng });
                pt = { lat: g.lat, lng: g.lng, X: c.X, Y: c.Y, source: 'gps' };
            } else {
                pt = session.lastPoint;
                if (!pt) return fail('Chưa có điểm nào vừa chuyển đổi để lưu. Hãy nhập tọa độ (vd. "10.7769 106.7009") hoặc nói "lưu vị trí hiện tại thành mốc M1".');
            }
            const sv = savePointToProject(pt, name, note || (source === 'gps' ? 'Đo GPS từ Trợ lý' : 'Lưu từ Trợ lý'));
            if (!sv.ok) return fail(sv.err);
            const savedPt = Object.assign({}, pt, { name: sv.name, source: 'project' });
            return {
                text: `✅ Đã lưu mốc "${sv.name}" vào dự án ${sv.project} (tổng ${sv.total} mốc).\n• X = ${C.fmtM(sv.X)} m; Y = ${C.fmtM(sv.Y)} m`,
                source: DEVICE,
                point: savedPt,
                speak: `Đã lưu mốc ${sv.name} vào dự án.`,
                actions: [
                    projectMapAction(sv.lat, sv.lng, sv.name, S().currentProject),
                    { label: 'Cắm mốc', run: () => run(`cắm mốc ${sv.name}`) },
                    { label: 'Mở Sổ đo', run: () => run('mở sổ đo') }
                ]
            };
        },
        stakeoutPoint({ name }) {
            if (typeof appNav === 'undefined' || typeof appStakeout === 'undefined') return fail('Chưa nạp phân hệ Cắm mốc.');
            const fn = C.fold(name);
            if (/^(diem vua roi|diem do|diem nay)$/.test(fn)) {
                if (!session.lastPoint) return fail('Chưa có điểm vừa chuyển đổi để cắm mốc.');
                return openStakeoutForPoint(session.lastPoint);
            }
            const hit = matchProjectPoint(name, false);
            if (!hit) {
                const pts = activePoints();
                const sample = pts.slice(0, 5).map(p => p.name).filter(Boolean).join(', ');
                return fail(`Không thấy mốc "${name}" trong dự án hiện tại.${sample ? ' Các mốc đang có: ' + sample + '.' : ''}`);
            }
            appNav.showScreen('stakeout');
            if (appStakeout.refreshPointsList) appStakeout.refreshPointsList();
            const sel = $('selStakeoutPoint');
            if (sel) { sel.value = String(hit.index); appStakeout.onPointSelected(); }
            const c = pointCoords(hit.point);
            const g = S().lastGps || {};
            let extra = '';
            if (g.lat && g.lng && typeof calcGeoDistanceAndAzimuth === 'function') {
                const nav = calcGeoDistanceAndAzimuth(g.lat, g.lng, c.lat, c.lng);
                extra = `\n• Khoảng cách hiện tại: ${nav.distance.toFixed(1)} m (phương vị ${nav.azimuth.toFixed(0)}°)`;
            }
            return {
                text: `🎯 Đã mở Cắm mốc tới "${hit.point.name}" (X = ${C.fmtM(c.X)}, Y = ${C.fmtM(c.Y)}).${extra}`,
                source: DEVICE,
                point: { lat: c.lat, lng: c.lng, X: c.X, Y: c.Y, name: hit.point.name, source: 'project' },
                speak: `Đã chọn cắm mốc ${hit.point.name}.`,
                after: () => ui.minimize()
            };
        },
        cadSummary({ query }) {
            if (typeof appCadTool === 'undefined') return fail('Chưa nạp MiniCAD.');
            const shapes = Array.isArray(appCadTool.savedShapes) ? appCadTool.savedShapes : [];
            if (!shapes.length) {
                return {
                    text: 'Bản vẽ MiniCAD hiện chưa có khối nào.',
                    source: DEVICE,
                    actions: [{ label: 'Mở MiniCAD', run: () => run('mở MiniCAD') }, { label: 'Nối điểm thành thửa', run: () => run('nối điểm MiniCAD') }]
                };
            }
            const computeStats = sh => {
                if (sh.stats && Number.isFinite(sh.stats.area)) return sh.stats;
                const verts = (sh.vertices || []).map(v => pointCoords(v)).filter(v => Number.isFinite(v.X) && Number.isFinite(v.Y));
                if (sh.mode === 'polygon' && verts.length >= 3 && typeof calculatePolygonAreaAndPerimeter === 'function') {
                    const r = calculatePolygonAreaAndPerimeter(verts.map(v => ({ x: v.X, y: v.Y })));
                    return { area: r.area, ha: r.area / 10000, perimeter: r.perimeter };
                }
                let len = 0;
                for (let i = 0; i + 1 < verts.length; i++) len += Math.hypot(verts[i + 1].X - verts[i].X, verts[i + 1].Y - verts[i].Y);
                return { area: 0, ha: 0, perimeter: len };
            };
            if (query) {
                const q = C.fold(query);
                const qNum = (q.match(/\d+/) || [])[0];
                const hit = shapes.find((sh, idx) => {
                    const sn = C.fold(sh.name || sh.shortName || '');
                    return sn === q || sn.includes(q) || (qNum && (sn.includes(qNum) || String(idx + 1) === qNum));
                });
                if (!hit) return fail(`Không thấy khối "${query}" trên MiniCAD (đang có: ${shapes.map(s => s.name).slice(0, 5).join(', ')}).`);
                const st = computeStats(hit);
                const text = `📐 Khối "${hit.name}" (${hit.mode === 'polygon' ? 'Đa giác' : hit.mode === 'polyline' ? 'Tuyến' : 'Điểm'}, ${(hit.vertices || []).length} đỉnh):\n• Diện tích: ${st.area.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m² (${(st.area / 10000).toFixed(4)} ha)\n• Chu vi / Chiều dài: ${C.fmtM(st.perimeter || 0)} m`;
                return { text, source: DEVICE, copy: `${hit.name}: S=${st.area.toFixed(2)} m2, P=${(st.perimeter || 0).toFixed(2)} m`,
                    actions: [{ label: 'Mở bảng kê', run: () => run('mở bảng kê MiniCAD') }, { label: 'Xuất PDF A3', run: () => run('xuất PDF A3') }] };
            }
            let totalArea = 0, totalPerim = 0, nPoly = 0, nLine = 0, nPt = 0;
            const lines = shapes.slice(0, 6).map((sh, i) => {
                const st = computeStats(sh);
                if (sh.mode === 'polygon') { nPoly++; totalArea += st.area || 0; totalPerim += st.perimeter || 0; }
                else if (sh.mode === 'polyline') { nLine++; totalPerim += st.perimeter || 0; }
                else nPt++;
                return `  ${i + 1}. ${sh.name}: ${sh.mode === 'polygon' ? `${st.area.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} m²` : `${(st.perimeter || 0).toFixed(2)} m`} (${(sh.vertices || []).length} đỉnh)`;
            });
            const anns = (appCadTool.annotations || []).length;
            const text = `📐 Thống kê MiniCAD: ${shapes.length} khối (${nPoly} đa giác, ${nLine} tuyến, ${nPt} lớp điểm)${anns ? `, ${anns} ghi chú` : ''}.\n• Tổng diện tích: ${totalArea.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m² (${(totalArea / 10000).toFixed(4)} ha)\n• Tổng chu vi/dài: ${C.fmtM(totalPerim)} m\n` + lines.join('\n') + (shapes.length > 6 ? `\n  … và ${shapes.length - 6} khối khác.` : '');
            return {
                text, source: DEVICE, copy: text,
                speak: `MiniCAD đang có ${shapes.length} khối, tổng diện tích ${Math.round(totalArea)} mét vuông.`,
                actions: [
                    { label: 'Mở bảng kê', run: () => run('mở bảng kê MiniCAD') },
                    { label: 'Zoom toàn cảnh', run: () => run('zoom toàn cảnh bản vẽ') },
                    { label: 'Xuất PDF A3', run: () => run('xuất PDF A3') }
                ]
            };
        },
        cadAction({ action }) {
            if (typeof appNav === 'undefined' || typeof appCadTool === 'undefined') return fail('Chưa nạp MiniCAD.');
            // Nguyên tắc tách biệt phân hệ (AGENTS.md): thao tác MiniCAD phải mở không gian MiniCAD trước
            if (S().mapMode !== 'cad' || S().currentScreen !== 'map') appNav.openCadMap();
            const map = {
                table: () => { appCadTool.openAreaTableModal && appCadTool.openAreaTableModal(); return 'Đã mở Bảng kê diện tích & tọa độ đỉnh MiniCAD.'; },
                polygon: () => { appCadTool.setMode && appCadTool.setMode('polygon'); return 'Đã bật chế độ Vẽ đa giác khép kín [P] trên MiniCAD.'; },
                polyline: () => { appCadTool.setMode && appCadTool.setMode('polyline'); return 'Đã bật chế độ Vẽ tuyến / bờ ranh [L] trên MiniCAD.'; },
                point: () => { appCadTool.setMode && appCadTool.setMode('point'); return 'Đã bật chế độ Chấm điểm [I] trên MiniCAD.'; },
                snap: () => { appCadTool.toggleSnap && appCadTool.toggleSnap(); return `Đã ${appCadTool.isSnapEnabled !== false ? 'bật' : 'tắt'} Bắt điểm (Snap) trên MiniCAD.`; },
                ortho: () => { appCadTool.toggleOrthoMode && appCadTool.toggleOrthoMode(); return `Đã ${appCadTool.orthoMode ? 'bật' : 'tắt'} Khóa vuông góc (Ortho) trên MiniCAD.`; },
                polar: () => { appCadTool.togglePolarTracking && appCadTool.togglePolarTracking(); return `Đã ${appCadTool.polarTracking ? 'bật' : 'tắt'} Bắt góc cực (Polar) trên MiniCAD.`; },
                undo: () => { appCadTool.undo && appCadTool.undo(); return 'Đã hoàn tác (Undo) bước vẽ trước trên MiniCAD.'; },
                redo: () => { appCadTool.redo && appCadTool.redo(); return 'Đã làm lại (Redo) thao tác vừa hoàn tác trên MiniCAD.'; },
                zoom: () => { appCadTool.zoomToAllShapes && appCadTool.zoomToAllShapes(); return 'Đã thu phóng bao quát toàn bộ bản vẽ MiniCAD.'; },
                connect: () => { appCadTool.openConnectPointsModal && appCadTool.openConnectPointsModal(); return 'Đã mở hộp thoại Nối điểm thành thửa / tuyến trên MiniCAD.'; },
                symbols: () => { appCadTool.openSymbolPanel && appCadTool.openSymbolPanel(); return 'Đã mở bảng Ký hiệu & Nhãn đỉnh MiniCAD.'; },
                qselect: () => { appCadTool.openQSelectModal && appCadTool.openQSelectModal(); return 'Đã mở bộ lọc Chọn nhanh đối tượng (QSELECT) trên MiniCAD.'; },
                inquiry_dist: () => { appCadTool.openInquiryModal && appCadTool.openInquiryModal('dist'); return 'Đã mở công cụ Đo khoảng cách (DIST) trên MiniCAD.'; },
                inquiry_area: () => { appCadTool.openInquiryModal && appCadTool.openInquiryModal('area'); return 'Đã mở công cụ Đo diện tích (AREA) trên MiniCAD.'; }
            };
            const fn = map[action];
            if (!fn) return fail('Không rõ lệnh MiniCAD.');
            const msg = fn();
            return { text: '📐 ' + msg, source: DEVICE, after: () => ui.minimize() };
        },
        mapLayer({ kind, value, on, opacity }) {
            const onMapScreen = S().currentScreen === 'map' || S().currentScreen === 'transform_map';
            if (!onMapScreen && typeof appNav !== 'undefined') {
                appNav.openProjectMap({ loadProject: S().currentProject });
            }
            if (kind === 'basemap') {
                if (typeof appMapLayers === 'undefined' || !appMapLayers.setBase) return fail('Chưa nạp bộ quản lý lớp bản đồ.');
                appMapLayers.setBase(value);
                const labels = {
                    google_hybrid: 'Vệ tinh Google (Siêu nét)', esri_satellite: 'Ảnh vệ tinh Esri',
                    google_streets: 'Đường phố Google', opentopomap: 'Địa hình & Sông ngòi OpenTopoMap',
                    google_terrain: 'Địa hình Google Terrain', osm_streets: 'Đường phố OpenStreetMap', none: 'Không nền (nền trắng)'
                };
                return { text: `🗺️ Đã đổi bản đồ nền sang: ${labels[value] || value}.`, source: DEVICE, after: () => ui.minimize() };
            }
            if (kind === 'overlay') {
                const want = on !== false;
                if (value === 'prov34' && typeof appMap !== 'undefined' && appMap.toggle34Provinces) {
                    if (!!S().is34ProvVisible !== want) appMap.toggle34Provinces();
                    return { text: `🗺️ Đã ${want ? 'bật' : 'tắt'} lớp Ranh giới 34 tỉnh (sau 01/07/2025).`, source: DEVICE, after: () => ui.minimize() };
                }
                if (value === 'dongthap' && typeof appMap !== 'undefined' && appMap.toggleDongThapCommunes) {
                    if (!!S().isDtCommunesVisible !== want) appMap.toggleDongThapCommunes();
                    return { text: `🗺️ Đã ${want ? 'bật' : 'tắt'} lớp Ranh giới xã Đồng Tháp.`, source: DEVICE, after: () => ui.minimize() };
                }
                if (typeof appMapLayers !== 'undefined' && appMapLayers.setOverlay) {
                    appMapLayers.setOverlay(value, want);
                    const names = { google_traffic: 'Giao thông trực tiếp Google', esri_transport: 'Mạng lưới Giao thông Esri', google_roads: 'Đường & Địa danh Google' };
                    return { text: `🗺️ Đã ${want ? 'bật' : 'tắt'} lớp phủ ${names[value] || value}.`, source: DEVICE, after: () => ui.minimize() };
                }
                return fail('Không điều khiển được lớp phủ này.');
            }
            if (kind === 'planning') {
                if (typeof appPlanning === 'undefined') return fail('Chưa nạp bản đồ Quy hoạch 2030.');
                const targetKey = S().mapMode === 'cad' ? 'cadMap' : (S().currentScreen === 'transform_map' ? 'transformMap' : 'projectMap');
                const want = on !== false;
                let provLabel = '';
                if (value && value !== 'current' && Array.isArray(appPlanning.provinces)) {
                    const qf = C.fold(value).replace(/^(tp\.?|thanh pho|tinh)\s+/, '');
                    const hit = appPlanning.provinces.find(p => C.fold(p.name).includes(qf) || qf.includes(C.fold(p.name)));
                    if (hit) {
                        provLabel = hit.name;
                        if (appPlanning.setProvince) appPlanning.setProvince(targetKey, hit.slug, want);
                    }
                }
                const tState = appPlanning.targets && appPlanning.targets[targetKey];
                if (tState && !!tState.active !== want) {
                    if (targetKey === 'cadMap' && appPlanning.toggleCadPlanning) appPlanning.toggleCadPlanning(want);
                    else if (appPlanning.toggle) appPlanning.toggle(targetKey);
                }
                if (Number.isFinite(opacity) && appPlanning.setOpacity) {
                    appPlanning.setOpacity(targetKey, opacity / 100);
                }
                const opTxt = Number.isFinite(opacity) ? `, độ rõ ${opacity}%` : '';
                return { text: `🗺️ Đã ${want ? 'bật' : 'tắt'} bản đồ Quy hoạch 2030${provLabel ? ' — ' + provLabel : ''}${opTxt}.`, source: DEVICE, after: () => ui.minimize() };
            }
            return fail('Không rõ loại lớp bản đồ.');
        },
        routeProject({ vehicle, startFromGps }) {
            if (typeof appRouting === 'undefined' || typeof appNav === 'undefined') return fail('Chưa nạp phân hệ Lộ trình.');
            const pts = activePoints();
            if (!pts.length) return fail('Dự án hiện tại chưa có mốc nào để lập lộ trình.');
            const vehLabel = { bike: 'Xe máy', car: 'Ô tô con', minibus: 'Ô tô 16 chỗ (đường lớn)' }[vehicle] || 'Ô tô';
            appNav.showScreen('routing');
            if (appRouting.setVehicle) appRouting.setVehicle(vehicle || 'car');
            if (appRouting.loadPointsFromSurvey) appRouting.loadPointsFromSurvey(pts);
            if (startFromGps && appRouting.useCurrentGpsAsStart) appRouting.useCurrentGpsAsStart();
            if (appRouting.optimizeRoute) setTimeout(() => { try { appRouting.optimizeRoute(); } catch (e) { /* ngoại tuyến dùng fallback */ } }, 180);
            return {
                text: `🚗 Đã nạp ${pts.length} mốc dự án vào Lộ trình (${vehLabel}${startFromGps ? ', xuất phát từ GPS hiện tại' : ''}) và bắt đầu tối ưu đường đi.`,
                source: DEVICE,
                speak: `Đã tối ưu lộ trình qua ${pts.length} mốc bằng ${vehLabel}.`,
                after: () => ui.minimize()
            };
        },
        rezone({ index, X, Y }) {
            const p = provinces()[index];
            if (!p) return fail('Không rõ tỉnh đích để quy đổi KTT.');
            if (typeof convertVn2kToVn2k !== 'function') return fail('Chưa nạp thuật toán đổi KTT.');
            const k = ktt();
            let srcX = X, srcY = Y, label = '';
            if (!Number.isFinite(srcX) || !Number.isFinite(srcY)) {
                if (!session.lastPoint) return fail('Chưa có tọa độ để quy đổi. Hãy nhập tọa độ trước hoặc gõ: "quy đổi 1191942.3 603797.3 sang KTT Đồng Tháp".');
                const c = pointCoords(session.lastPoint);
                srcX = c.X; srcY = c.Y;
                label = session.lastPoint.name ? ` (${session.lastPoint.name})` : '';
            }
            const dstKtt = p.deg + (p.min || 0) / 60;
            const res = convertVn2kToVn2k(srcX, srcY, k.val, k.k0, dstKtt, 0.9999);
            const text = `🔄 Quy đổi KTT${label}:\n• Nguồn (${kttLabel(k)}): X = ${C.fmtM(srcX)} m; Y = ${C.fmtM(srcY)} m\n• Đích (${p.name} — KTT ${C.fmtKtt(p.deg, p.min)}, múi 3°): X = ${C.fmtM(res.X)} m; Y = ${C.fmtM(res.Y)} m\n(Không thay đổi KTT chung đang cấu hình của ứng dụng.)`;
            return {
                text, source: DEVICE,
                copy: `${res.X.toFixed(3)}\t${res.Y.toFixed(3)}`,
                speak: `Đã quy đổi sang kinh tuyến trục ${p.name}.`,
                actions: [{ label: `Đổi KTT app sang ${p.name}`, run: () => run(`đổi KTT sang ${p.name}`) }]
            };
        },
        switchProject({ action, name }) {
            const s = S();
            const list = Array.isArray(s.projectsList) ? s.projectsList : [];
            if (action === 'list') {
                if (!list.length) return fail('Chưa có dự án nào trên máy.');
                const rows = list.map((pr, i) => {
                    let n = 0;
                    try { n = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(pr).length : 0; } catch (e) { n = 0; }
                    const active = pr === s.currentProject ? ' ★ (đang mở)' : '';
                    return `${i + 1}. ${pr.replace(/\.[^/.]+$/, '')} — ${n} mốc${active}`;
                });
                const acts = list.filter(pr => pr !== s.currentProject).slice(0, 3).map(pr => ({
                    label: 'Mở ' + pr.replace(/\.[^/.]+$/, ''),
                    run: () => run('chuyển sang dự án ' + pr.replace(/\.[^/.]+$/, ''))
                }));
                return { text: `📁 Danh sách ${list.length} dự án trên máy:\n` + rows.join('\n'), source: DEVICE, actions: acts };
            }
            if (action === 'switch') {
                const q = C.fold(name).replace(/\.csv$/, '');
                const hit = list.find(pr => C.fold(pr).replace(/\.csv$/, '') === q)
                    || list.find(pr => C.fold(pr).includes(q));
                if (!hit) return fail(`Không tìm thấy dự án "${name}". Gõ "danh sách dự án" để xem các dự án hiện có.`);
                const sel = $('selProjectFiles');
                if (sel && typeof appData !== 'undefined' && appData.onProjectSelectChange) {
                    sel.value = hit;
                    appData.onProjectSelectChange();
                } else {
                    s.currentProject = hit;
                    store.set('vn2k_cur_project', hit);
                }
                const n = activePoints().length;
                return {
                    text: `✅ Đã chuyển sang dự án "${hit.replace(/\.[^/.]+$/, '')}" (${n} mốc).`,
                    source: DEVICE,
                    actions: [{ label: 'Xem trên bản đồ', run: () => run('mở bản đồ dự án') }, { label: 'Kiểm tra số liệu', run: () => run('kiểm tra số liệu') }]
                };
            }
            if (action === 'create') {
                const clean = String(name || '').replace(/[<>:"/\\|?*]+/g, '_').trim();
                if (!clean) return fail('Tên dự án không hợp lệ.');
                const fileName = clean.toLowerCase().endsWith('.csv') ? clean : clean + '.csv';
                if (!list.includes(fileName)) {
                    list.push(fileName);
                    store.set('vn2k_projects', JSON.stringify(list));
                }
                s.currentProject = fileName;
                store.set('vn2k_cur_project', fileName);
                if (typeof appData !== 'undefined') {
                    appData.populateProjectSelect && appData.populateProjectSelect();
                    appData.refreshTable && appData.refreshTable();
                    appData.updateSyncUI && appData.updateSyncUI();
                }
                if (typeof appNav !== 'undefined' && appNav.updateBanner) appNav.updateBanner();
                return { text: `✅ Đã tạo và mở dự án mới "${fileName.replace(/\.csv$/i, '')}".`, source: DEVICE, actions: [{ label: 'Mở Sổ đo', run: () => run('mở sổ đo') }] };
            }
            return fail('Không rõ thao tác dự án.');
        },
        appMode({ target, value }) {
            if (target === 'field') {
                const on = value === 'on';
                document.body.classList.toggle('field-mode', on);
                const fwField = $('fwField');
                if (fwField) fwField.setAttribute('aria-pressed', String(on));
                store.set('vn2k_field_mode', on ? '1' : '0');
                if (typeof appTheme !== 'undefined' && appTheme.syncFieldMode) appTheme.syncFieldMode(on);
                return { text: on ? '⚡ Đã bật Chế độ Thực địa (siêu tương phản chống lóa ngoài nắng).' : 'Đã tắt Chế độ Thực địa, quay về giao diện chuẩn.', source: DEVICE };
            }
            if (target === 'lang') {
                if (typeof appI18n === 'undefined' || !appI18n.setLanguage) return fail('Chưa nạp bộ chuyển ngôn ngữ.');
                appI18n.setLanguage(value, false);
                return { text: value === 'en' ? '🌐 Switched interface language to English.' : '🌐 Đã chuyển ngôn ngữ giao diện sang Tiếng Việt.', source: DEVICE };
            }
            return fail('Không rõ chế độ.');
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
            const acts = [mapAction(g.lat, g.lng, 'Vị trí hiện tại'), { label: 'Lưu vị trí này', run: () => run('lưu vị trí hiện tại thành mốc GPS_1') }];
            return Object.assign(base, { text: 'Vị trí hiện tại:\n' + base.text + acc, actions: acts, point: Object.assign({}, base.point, { source: 'gps', name: 'Vị trí GPS' }) });
        },
        project() {
            const s = S();
            const pts = activePoints();
            const n = pts.length;
            const name = String(s.currentProject || '').replace(/\.[^/.]+$/, '');
            const count = Array.isArray(s.projectsList) ? s.projectsList.length : 1;
            const cadCount = (typeof appCadTool !== 'undefined' && Array.isArray(appCadTool.savedShapes)) ? appCadTool.savedShapes.length : 0;
            return { text: `Dự án đang mở: ${name || '(chưa có)'} — ${n} mốc${cadCount ? `, ${cadCount} khối MiniCAD` : ''}.\nTổng số dự án trên máy: ${count}.`, source: DEVICE,
                actions: [
                    { label: 'Mở Sổ đo', run: () => run('mở sổ đo') },
                    { label: 'Xem trên bản đồ', run: () => run('mở bản đồ dự án') },
                    { label: 'Kiểm tra số liệu', run: () => run('kiểm tra số liệu') },
                    { label: 'Danh sách dự án', run: () => run('danh sách dự án') }
                ] };
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
            const label = { pdf: 'PDF', png: 'PNG', image: 'ảnh nén', svg: 'SVG', dwg: 'DXF (AutoCAD)' }[format] || 'PDF';
            const baseName = { none: 'không nền', google_hybrid: 'nền Google vệ tinh', esri_satellite: 'nền Esri vệ tinh', google_streets: 'nền Google đường phố', opentopomap: 'nền địa hình', google_terrain: 'nền địa hình Google', osm_streets: 'nền OpenStreetMap', sentinel2: 'nền Sentinel-2' }[meta.basemap] || 'nền đang chọn';
            const tbl = { area: 'bảng diện tích', points: 'bảng các điểm', both: 'cả hai bảng' }[meta.summaryTables] || 'bảng diện tích';
            const after = () => { if (format === 'dwg') appCadTool.exportDwg(opts); else appCadTool.exportPdf(Object.assign({ target: format }, opts)); };
            return { text: `Đang xuất ${label} từ ${from}: khổ ${meta.paperLabel || meta.paper || 'đang chọn'}, tỷ lệ ${meta.scaleVal ? '1:' + meta.scaleVal : 'tự động'}, ${format === 'dwg' ? 'nét vẽ vector (DXF không nhúng ảnh nền)' : baseName}, ${tbl}.`,
                source: DEVICE, speak: `Đang xuất bản vẽ ${label}.`, after };
        },
        // Kiểm tra chất lượng số liệu đo — máy tự soát, không dùng AI
        checkData() {
            const pts = activePoints();
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
                actions: [{ label: 'Mở Sổ đo', run: () => run('mở sổ đo') }, { label: 'Xem trên bản đồ', run: () => run('mở bản đồ dự án') }] };
        },
        theme({ theme }) {
            if (typeof appTheme !== 'undefined') {
                document.body.classList.remove('field-mode');
                appTheme.setTheme(theme);
            }
            return { text: theme === 'light' ? 'Đã chuyển giao diện sáng.' : 'Đã chuyển giao diện tối.', source: DEVICE };
        },
        selftest: () => selfTest()
    };

    function fail(msg) { return { text: '⚠️ ' + msg, source: DEVICE }; }
    function titleOf(el) { const t = el.querySelector('.drawer-leaf-title'); return t ? t.textContent.replace(/^\s*\d+(\.\d+)?\s*/, '').trim() : ''; }
    /** Tách biệt giao diện (AGENTS.md §2): điểm từ Chuyển đổi luôn mở Bản đồ Chuyển đổi (KHÔNG mở Bản đồ dự án). */
    function mapAction(lat, lng, name) {
        return { label: 'Xem trên bản đồ', run: () => { if (typeof appNav !== 'undefined') appNav.openTransformMap({ mode: 'view', singlePoint: { lat, lng, name } }); ui.minimize(); } };
    }
    /** Điểm mốc thuộc Dự án mở đúng phân hệ Bản đồ Dự án và phóng tới mốc. */
    function projectMapAction(lat, lng, name, proj) {
        return {
            label: 'Xem trên bản đồ',
            run: () => {
                if (typeof appNav !== 'undefined') appNav.openProjectMap({ loadProject: proj || S().currentProject });
                setTimeout(() => { if (S().leafletMap && Number.isFinite(lat) && Number.isFinite(lng)) S().leafletMap.setView([lat, lng], 19); }, 250);
                ui.minimize();
            }
        };
    }
    function savePointToProject(pt, rawName, note) {
        if (typeof appData === 'undefined' || !appData.savePoints) return { ok: false, err: 'Chưa nạp Sổ đo.' };
        const proj = S().currentProject;
        const pts = activePoints().slice();
        const c = pointCoords(pt);
        if (!Number.isFinite(c.X) || !Number.isFinite(c.Y)) return { ok: false, err: 'Tọa độ không hợp lệ.' };
        const finalName = (!rawName || rawName === 'AUTO' || rawName === 'GPS') ? `${rawName === 'GPS' ? 'GPS' : 'M'}_${pts.length + 1}` : rawName;
        pts.push({
            name: finalName,
            x: parseFloat(c.X.toFixed(3)),
            y: parseFloat(c.Y.toFixed(3)),
            lat: Number.isFinite(c.lat) ? parseFloat(c.lat.toFixed(7)) : null,
            lng: Number.isFinite(c.lng) ? parseFloat(c.lng.toFixed(7)) : null,
            note: note || ''
        });
        appData.savePoints(proj, pts);
        if (appData.refreshTable) appData.refreshTable();
        if (window.appMap && appMap.loadProjectMarkers && S().mapMode === 'project') appMap.loadProjectMarkers();
        return { ok: true, name: finalName, project: String(proj || '').replace(/\.[^/.]+$/, ''), total: pts.length, X: c.X, Y: c.Y, lat: c.lat, lng: c.lng };
    }
    function openStakeoutForPoint(pt) {
        if (typeof appNav === 'undefined' || typeof appStakeout === 'undefined') return fail('Chưa nạp phân hệ Cắm mốc.');
        const c = pointCoords(pt);
        appNav.showScreen('stakeout');
        appStakeout.selectedPoint = { name: pt.name || 'Điểm từ Trợ lý', x: c.X, y: c.Y, lat: c.lat, lng: c.lng };
        if (appStakeout.updateTargetCard) appStakeout.updateTargetCard();
        if (appStakeout.updateLiveNavigation) appStakeout.updateLiveNavigation();
        ui.minimize();
        return { text: `🎯 Đã nạp "${pt.name || 'Điểm từ Trợ lý'}" (X = ${C.fmtM(c.X)}, Y = ${C.fmtM(c.Y)}) vào màn hình Cắm mốc.`, source: DEVICE };
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
            const pts = activePoints();
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
    const cloud = {
        state: 'idle', error: '', server: null,
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
                    if (raw && (raw.tool === 'kttOf' || raw.tool === 'setProvince' || raw.tool === 'rezone')) { this.state = 'ok'; return { call: j.call }; }
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
        ui.hideSuggest();
        ui.user(text);
        if (session.history[session.history.length - 1] !== text) {
            session.history.push(text);
            if (session.history.length > 30) session.history.shift();
        }
        session.historyIdx = session.history.length;
        let lastPoint = session.lastPoint;
        for (const part of parts) {
            const fp = C.fold(part);
            let r = C.route(part, { provinces: provinces() });
            // Hội thoại nối tiếp: "xem điểm đó trên bản đồ" hoặc "… rồi xem trên bản đồ"
            // Giữ nguyên nguyên tắc tách biệt giao diện (AGENTS.md §2): điểm chuyển đổi → Bản đồ Chuyển đổi; điểm mốc dự án → Bản đồ Dự án.
            const asksViewLastOnMap = lastPoint && (
                (r.intent === 'open' && r.args.target === 'drawerItem_map' && !/du an|moc/.test(fp)) ||
                (/(xem|mo|hien).*(diem do|diem vua|diem nay|toa do do|toa do vua).*(ban do)/.test(fp))
            );
            if (asksViewLastOnMap) {
                if (lastPoint.source === 'project') {
                    projectMapAction(lastPoint.lat, lastPoint.lng, lastPoint.name || 'Mốc dự án', lastPoint.project).run();
                    ui.bot({ text: `Đã mở Bản đồ dự án tại mốc "${lastPoint.name || 'vừa tìm'}".`, source: DEVICE });
                } else {
                    mapAction(lastPoint.lat, lastPoint.lng, lastPoint.name || 'Điểm từ trợ lý').run();
                    ui.bot({ text: 'Đã mở bản đồ chuyển đổi tại điểm vừa tính.', source: DEVICE });
                }
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
                // Gợi ý thông minh khi gõ sai chính tả / nói chưa chuẩn — KHÔNG tự chạy bừa
                const suggs = (typeof C.suggestCommands === 'function') ? C.suggestCommands(part, window.AssistantDataset || [], 3) : [];
                const sugActs = suggs.map(sg => ({ label: '↳ ' + sg.text, run: () => send(sg.text) }));
                res = {
                    text: (cloudSaidNone ? 'Câu này không khớp chức năng nào của app — trợ lý chỉ làm các việc của app (chuyển tọa độ, tìm/cắm mốc, MiniCAD, bản đồ quy hoạch, xuất bản vẽ, kiểm tra số liệu…).' : 'Xin lỗi, tôi chưa hiểu chắc yêu cầu này nên không đoán bừa.') +
                        (suggs.length ? '\nÝ bạn muốn chạy một trong các lệnh sau?' : (llm.state === 'ready' || cloud.usable() ? '' : (cloud.cfg().enabled ? ' (Đang ngoại tuyến nên AI máy chủ tạm nghỉ; có thể tải AI cục bộ ở nút ⚙ để dùng khi mất mạng.)' : ' (Có thể bật AI ở nút ⚙ để hiểu câu tự do hơn.)')) + '\nThử: "mở bản đồ", "10.7769 106.7009", "tìm mốc M1", "bật quy hoạch", "thống kê MiniCAD", "giúp".'),
                    source: DEVICE,
                    actions: sugActs,
                    speak: 'Xin lỗi, tôi chưa hiểu. Bạn thử chọn gợi ý hoặc nói cách khác nhé.'
                };
            } else {
                try { res = await tools[r.intent](r.args || {}); } catch (e) { res = fail('Lỗi khi thực hiện: ' + e.message); }
                if (viaAi) res.source = viaAi === 'cloud' ? 'cloud' : 'ai';
                session.lastIntent = r.intent;
            }
            ui.bot(res);
            if (res.point) { lastPoint = res.point; session.lastPoint = res.point; }
            voice.speak(res.speak !== undefined ? res.speak : res.text.split('\n')[0]);
            if (typeof res.after === 'function') { ui.minimize(); setTimeout(res.after, 60); }
        }
        ui.refreshQuick();
    }
    async function send(text) {
        if (busy) return;
        busy = true;
        try { await run(text); } finally { busy = false; }
    }

    // ---------------- Giao diện thông minh theo ngữ cảnh màn hình ----------------
    function getContextChips() {
        const s = S();
        const scr = s.currentScreen || 'menu';
        const mode = s.mapMode || '';
        const pts = activePoints();
        const firstPt = pts[0] && pts[0].name ? pts[0].name : 'M1';
        if (scr === 'map' && mode === 'cad') {
            return ['Thống kê MiniCAD', 'Mở bảng kê MiniCAD', 'Xuất PDF A3', 'Zoom toàn cảnh bản vẽ', 'Bật quy hoạch', 'Hoàn tác'];
        }
        if (scr === 'map' && mode === 'project') {
            return ['Bật quy hoạch', 'Đổi nền địa hình', 'Bật giao thông trực tiếp', `Tìm mốc ${firstPt}`, 'Tối ưu lộ trình', 'Kiểm tra số liệu'];
        }
        if (scr === 'stakeout') {
            return ['Vị trí của tôi', 'Bật GPS', `Cắm mốc ${firstPt}`, 'Bật chế độ thực địa', 'Kiểm tra số liệu'];
        }
        if (scr === 'routing') {
            return ['Tối ưu lộ trình xe máy', 'Tối ưu lộ trình ô tô', 'Tối ưu lộ trình từ vị trí hiện tại', 'Bật GPS'];
        }
        if (scr === 'datamgmt') {
            return ['Kiểm tra số liệu', 'Xuất PDF A3', 'Tối ưu lộ trình', 'Danh sách dự án', 'Kiểm thử'];
        }
        return ['Kiểm tra số liệu', 'Xuất PDF A3', 'Vị trí của tôi', 'KTT hiện tại', `Tìm mốc ${firstPt}`, 'Bật quy hoạch', 'Kiểm thử', 'Giúp'];
    }

    /** Gợi ý trực tiếp khi đang gõ (kết hợp tên mốc dự án thực tế + mẫu lệnh). */
    function buildLiveSuggestions(query) {
        const q = C.fold(query);
        if (q.length < 2) return [];
        const out = [];
        const seen = new Set();
        const push = txt => {
            const k = C.fold(txt);
            if (!k || seen.has(k)) return;
            seen.add(k);
            out.push(txt);
        };
        // 1. Gợi ý mốc thực tế của dự án khi gõ tên mốc hoặc "mốc / tìm / cắm / khoảng cách"
        const pts = activePoints();
        if (pts.length && /(moc|tim|cam|khoang|cu ly|phuong vi|^[a-z]\d)/i.test(q)) {
            const matchedPts = pts.filter(p => {
                const fn = C.fold(p.name || '');
                return fn && (q.includes(fn) || fn.includes(q.replace(/^(tim|cam|moc|diem)\s+/i, '')));
            }).slice(0, 2);
            const pick = matchedPts.length ? matchedPts : pts.slice(0, 2);
            pick.forEach(p => {
                if (/cam/.test(q)) push(`Cắm mốc ${p.name}`);
                else if (/khoang|cu ly|phuong vi/.test(q) && pts.length >= 2) {
                    const other = pts.find(o => o.name !== p.name);
                    if (other) push(`Khoảng cách từ ${p.name} đến ${other.name}`);
                } else {
                    push(`Tìm mốc ${p.name}`);
                }
            });
        }
        // 2. Gợi ý từ bộ mẫu câu AssistantDataset
        const suggs = (typeof C.suggestCommands === 'function') ? C.suggestCommands(query, window.AssistantDataset || [], 4) : [];
        suggs.forEach(sg => push(sg.text));
        return out.slice(0, 4);
    }

    const ui = {
        el: null,
        sugIdx: -1,
        build() {
            if (this.el) return this.el;
            const d = document.createElement('section');
            d.id = 'aiPanel'; d.className = 'ai-panel'; d.hidden = true;
            d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Trợ lý cục bộ');
            d.innerHTML = `
              <header class="ai-head">
                <div class="ai-title"><span class="ai-dot" aria-hidden="true"></span><b>Trợ lý thông minh</b><span class="ai-sub" id="aiSub">chạy trên máy này · không cần mạng</span></div>
                <button type="button" class="ai-icon" id="aiClearBtn" title="Xóa lịch sử hội thoại">🧹</button>
                <button type="button" class="ai-icon" id="aiSpeakBtn" title="Đọc câu trả lời thành tiếng" aria-pressed="false">🔈</button>
                <button type="button" class="ai-icon" id="aiCfgBtn" title="Não AI cục bộ & AI máy chủ (tùy chọn)">⚙</button>
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
              <div class="ai-suggest" id="aiSuggest" hidden role="listbox" aria-label="Gợi ý lệnh"></div>
              <div class="ai-quick" id="aiQuick"></div>
              <form class="ai-input" id="aiForm" autocomplete="off">
                <button type="button" class="ai-icon ai-mic" id="aiMic" title="Nói (tiếng Việt)">🎤</button>
                <input id="aiText" type="text" inputmode="text" enterkeyhint="send" placeholder="Gõ hoặc nói: tìm mốc M1, bật quy hoạch, 10.7769 106.7009…" aria-label="Câu lệnh cho trợ lý">
                <button type="submit" class="ai-icon ai-send" title="Gửi">➤</button>
              </form>`;
            document.body.appendChild(d);
            this.el = d;
            this.refreshQuick();
            $('aiCloseBtn').onclick = () => this.close();
            $('aiClearBtn').onclick = () => this.clearChat();
            $('aiCfgBtn').onclick = () => { $('aiCfg').hidden = !$('aiCfg').hidden; this.refreshLlm(); };
            const sp = $('aiSpeakBtn');
            const syncSp = () => { const on = voice.enabled(); sp.setAttribute('aria-pressed', String(on)); sp.textContent = on ? '🔊' : '🔈'; };
            sp.onclick = () => { store.set('vn2k_ai_speak', voice.enabled() ? '0' : '1'); syncSp(); if (!voice.enabled()) voice.stopAll(); };
            syncSp();
            if (!voice.canSpeak()) sp.hidden = true;
            $('aiQuick').onclick = e => { const b = e.target.closest('.ai-chip'); if (b) send(b.textContent); };
            $('aiSuggest').onclick = e => {
                const b = e.target.closest('.ai-sug-item');
                if (!b) return;
                $('aiText').value = '';
                this.hideSuggest();
                send(b.dataset.cmd);
            };
            const input = $('aiText');
            input.addEventListener('input', () => this.updateSuggest(input.value));
            input.addEventListener('keydown', e => {
                const box = $('aiSuggest');
                const items = box && !box.hidden ? Array.from(box.querySelectorAll('.ai-sug-item')) : [];
                if (e.key === 'ArrowDown' && items.length) {
                    e.preventDefault();
                    this.sugIdx = (this.sugIdx + 1) % items.length;
                    items.forEach((el, i) => el.classList.toggle('is-active', i === this.sugIdx));
                    return;
                }
                if (e.key === 'ArrowUp' && items.length) {
                    e.preventDefault();
                    this.sugIdx = (this.sugIdx - 1 + items.length) % items.length;
                    items.forEach((el, i) => el.classList.toggle('is-active', i === this.sugIdx));
                    return;
                }
                if (e.key === 'Tab' && items.length) {
                    e.preventDefault();
                    const chosen = items[this.sugIdx >= 0 ? this.sugIdx : 0];
                    if (chosen) { input.value = chosen.dataset.cmd; this.hideSuggest(); }
                    return;
                }
                if (e.key === 'Enter' && this.sugIdx >= 0 && items[this.sugIdx]) {
                    e.preventDefault();
                    const cmd = items[this.sugIdx].dataset.cmd;
                    input.value = '';
                    this.hideSuggest();
                    send(cmd);
                    return;
                }
                if (e.key === 'Escape' && items.length) { e.stopPropagation(); this.hideSuggest(); return; }
                // Lịch sử câu lệnh bằng phím ↑ / ↓ khi không mở gợi ý
                if (e.key === 'ArrowUp' && !items.length && session.history.length) {
                    e.preventDefault();
                    session.historyIdx = Math.max(0, session.historyIdx - 1);
                    input.value = session.history[session.historyIdx] || '';
                } else if (e.key === 'ArrowDown' && !items.length && session.history.length) {
                    e.preventDefault();
                    session.historyIdx = Math.min(session.history.length, session.historyIdx + 1);
                    input.value = session.history[session.historyIdx] || '';
                }
            });
            $('aiForm').onsubmit = e => { e.preventDefault(); const t = $('aiText').value.trim(); if (!t) return; $('aiText').value = ''; this.hideSuggest(); send(t); };
            const mic = $('aiMic');
            if (!voice.canListen()) mic.hidden = true;
            mic.onclick = () => {
                if (voice.listening) { voice.stopListening(); return; }
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
            this.welcome();
            return d;
        },
        welcome() {
            this.bot({ text: 'Xin chào! Tôi chạy ngay trên máy này, không cần mạng. Thử gõ hoặc nói:\n• "10.7769 106.7009" → rồi "lưu điểm đó tên M5"\n• "tìm mốc M1", "khoảng cách từ M1 đến M3", "cắm mốc M2"\n• "thống kê MiniCAD", "bật quy hoạch Đồng Tháp", "tối ưu lộ trình xe máy"', source: DEVICE });
        },
        clearChat() {
            const log = $('aiLog');
            if (log) log.innerHTML = '';
            session.lastPoint = null;
            session.lastIntent = '';
            this.welcome();
        },
        refreshQuick() {
            const q = $('aiQuick');
            if (!q) return;
            q.innerHTML = getContextChips().map(c => `<button type="button" class="ai-chip">${esc(c)}</button>`).join('');
        },
        updateSuggest(val) {
            const box = $('aiSuggest');
            if (!box) return;
            const list = buildLiveSuggestions(val);
            this.sugIdx = -1;
            if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
            box.innerHTML = list.map(t => `<button type="button" class="ai-sug-item" role="option" data-cmd="${esc(t)}">${esc(t)}</button>`).join('');
            box.hidden = false;
        },
        hideSuggest() {
            const box = $('aiSuggest');
            this.sugIdx = -1;
            if (box) { box.hidden = true; box.innerHTML = ''; }
        },
        open() { this.build(); this.refreshQuick(); cloud.probe().then(() => this.refreshLlm()); this.el.hidden = false; document.body.classList.add('ai-open'); this.el.classList.remove('is-min'); setTimeout(() => { const i = $('aiText'); if (i && matchMedia('(pointer: fine)').matches) i.focus(); }, 50); syncBtn(); },
        close() { if (!this.el) return; this.hideSuggest(); this.el.hidden = true; document.body.classList.remove('ai-open'); voice.stopAll(); syncBtn(); },
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
            if (sub) sub.textContent = llm.state === 'loading' ? `đang nạp AI ${llm.progress}%` : [llm.state === 'ready' ? 'AI cục bộ sẵn sàng' : 'quy tắc thông minh trên máy', cloud.usable() ? 'AI máy chủ khi có mạng' : 'không cần mạng'].join(' · ');
        }
    };

    function syncBtn() {
        const b = $('btnHeaderAssistant');
        if (b) b.setAttribute('aria-expanded', String(!!(ui.el && !ui.el.hidden)));
    }

    window.appAssistant = { open: () => ui.open(), close: () => ui.close(), toggle: () => ui.toggle(), send, selfTest, llm, voice, cloud, tools, session, getContextChips };
    // Trình duyệt nạp danh sách giọng đọc không đồng bộ.
    if (window.speechSynthesis && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', () => { /* chỉ để kích nạp */ });
})();
