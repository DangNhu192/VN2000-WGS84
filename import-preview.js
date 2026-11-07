/* Nhập bảng tọa độ có XEM TRƯỚC: chọn file → xem vài dòng đầu → kiểm tra/chỉnh cột → chọn KTT/múi của file
   (có thể đổi sang KTT hiện hành) → nạp vào Sổ đo. Thuộc phân hệ Sổ đo & Dữ liệu dự án. */
(function (root) {
    'use strict';

    const g = (typeof module !== 'undefined' && module.exports) ? require('./geodesy.js') : root;

    function num(v) {
        if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
        let t = String(v ?? '').trim().replace(/\s+/g, '');
        if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
        else if (/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, '');
        else if (/^[+-]?\d+,\d+$/.test(t)) t = t.replace(',', '.');
        return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t) ? Number(t) : NaN;
    }

    /** Văn bản (CSV/TXT/DAT) → mảng dòng × ô. Tự nhận dấu phân cách: tab > ; > , > khoảng trắng. */
    function textToRows(text) {
        const lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);
        const split = (line, d) => (d === ' ' ? line.split(/\s+/) : g.splitDelimitedLine(line, d));
        // Chọn dấu phân cách cho nhiều ô SỐ nhất mỗi dòng: tránh tách nhầm "1191900,5" (phẩy thập phân) thành 2 ô.
        const body = lines.filter(l => !l.startsWith('#')).slice(0, 30);
        let delim = ' ', best = -1;
        for (const d of ['\t', ';', ',', ' ']) {
            if (d !== ' ' && !body.some(l => l.includes(d))) continue;
            const score = body.reduce((sum, l) => sum + split(l, d).filter(c => !/\s/.test(c.trim()) && Number.isFinite(num(c))).length, 0) / (body.length || 1);
            if (score > best + 1e-9) { best = score; delim = d; }
        }
        return lines.map(l => split(l.replace(/^#\s*/, ''), delim)).filter(cells => cells.length >= 2);
    }

    /** Đoán dòng tiêu đề + cột + loại tọa độ. */
    function guessMapping(rows) {
        let headerRow = -1, cols = {};
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const c = g.mapHeaderColumns(rows[i]);
            if (('x' in c && 'y' in c) || ('lat' in c && 'lng' in c)) { headerRow = i; cols = c; break; }
        }
        const body = rows.slice(headerRow + 1, headerRow + 41);
        const width = Math.max(0, ...rows.slice(0, 50).map(r => r.length));
        const share = (ci, test) => {
            const vals = body.map(r => num(r[ci])).filter(Number.isFinite);
            return body.length ? vals.filter(test).length / body.length : 0;
        };
        let type = ('lat' in cols && !('x' in cols)) ? 'wgs84' : 'vn2000';
        if (headerRow < 0) {
            const idx = [...Array(width).keys()];
            const isLat = ci => share(ci, v => v > 6 && v < 25) > 0.6;
            const isLng = ci => share(ci, v => v > 100 && v < 120) > 0.6;
            const median = ci => {
                const v = body.map(r => num(r[ci])).filter(Number.isFinite).sort((p, q) => p - q);
                return v.length ? v[v.length >> 1] : 0;
            };
            // Hai cột số lớn đầu tiên là X/Y; cột giá trị lớn hơn là X (Bắc) vì ở Việt Nam X luôn lớn hơn Y.
            const big = idx.filter(ci => share(ci, v => v > 50000 && v < 3000000) > 0.6);
            if (big.length >= 2) {
                const [c1, c2] = big;
                cols = median(c1) >= median(c2) ? { x: c1, y: c2 } : { x: c2, y: c1 };
            } else {
                const la = idx.find(isLat), lo = idx.find(ci => ci !== la && isLng(ci));
                if (la !== undefined && lo !== undefined) { cols = { lat: la, lng: lo }; type = 'wgs84'; }
            }
            const used = new Set(Object.values(cols));
            const nameCol = idx.find(ci => !used.has(ci) && body.some(r => r[ci] && !Number.isFinite(num(r[ci]))));
            if (nameCol !== undefined) cols.name = nameCol;
            const hCol = idx.find(ci => !used.has(ci) && ci !== nameCol && share(ci, v => v > -100 && v < 4000) > 0.6);
            if (hCol !== undefined && (cols.x !== undefined || cols.lat !== undefined)) cols.h = hCol;
        }
        return { headerRow, cols, type, width };
    }

    /**
     * Dựng danh sách điểm theo cấu hình người dùng đã xác nhận.
     * opt: { headerRow, cols:{name,x,y,lat,lng,h,note}, type:'vn2000'|'wgs84', src:{ktt,mui}, dst:{ktt,mui}|null }
     *  - VN-2000 + dst: đổi X/Y từ KTT/múi của file sang KTT/múi đích (không qua WGS-84).
     */
    function buildPoints(rows, opt) {
        const c = opt.cols || {};
        const k0 = m => (Number(m) === 6 ? 0.9996 : 0.9999);
        const out = [], skipped = [];
        rows.slice(opt.headerRow + 1).forEach((r, i) => {
            const line = opt.headerRow + 2 + i;
            const cell = k => (c[k] === undefined || c[k] === '' ? undefined : r[c[k]]);
            const p = { name: String(cell('name') ?? '').trim() || `M${out.length + 1}`, note: String(cell('note') ?? '').trim(), h: num(cell('h')) };
            if (opt.type === 'wgs84') {
                p.lat = num(cell('lat')); p.lng = num(cell('lng'));
                if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) { skipped.push(line); return; }
                p.ktt = (opt.dst || opt.src).ktt; p.mui = (opt.dst || opt.src).mui;
            } else {
                let x = num(cell('x')), y = num(cell('y'));
                if (!Number.isFinite(x) || !Number.isFinite(y)) { skipped.push(line); return; }
                if (y > x) [x, y] = [y, x]; // X (Bắc) ở VN luôn lớn hơn Y (Đông)
                const target = opt.dst || opt.src;
                if (opt.dst && (opt.dst.ktt !== opt.src.ktt || opt.dst.mui !== opt.src.mui)) {
                    const r2 = g.convertVn2kToVn2k(x, y, opt.src.ktt, k0(opt.src.mui), opt.dst.ktt, k0(opt.dst.mui));
                    if (!r2) { skipped.push(line); return; }
                    x = r2.X; y = r2.Y;
                }
                p.x = x; p.y = y; p.ktt = target.ktt; p.mui = target.mui;
            }
            out.push(p);
        });
        const points = g.normalizeSurveyPoints(out, opt.dst || opt.src);
        const lost = out.length - points.length;
        return { points, skipped: skipped.length + lost, skippedLines: skipped.slice(0, 10) };
    }

    const api = { num, textToRows, guessMapping, buildPoints };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
    root.ImportPreview = Object.assign(api, createUi());

    // ======================= Giao diện xem trước =======================
    function createUi() {
        let state = null;
        const byId = id => document.getElementById(id);
        const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const FIELDS = [['name', 'Tên điểm'], ['x', 'X (Bắc) / Vĩ độ'], ['y', 'Y (Đông) / Kinh độ'], ['h', 'Cao độ H'], ['note', 'Ghi chú']];

        function colOptions(width, sel) {
            let h = '<option value="">— không có —</option>';
            for (let i = 0; i < width; i++) h += `<option value="${i}"${i === sel ? ' selected' : ''}>Cột ${i + 1}${state && state.headerRow >= 0 && state.rows[state.headerRow][i] ? ': ' + esc(state.rows[state.headerRow][i]) : ''}</option>`;
            return h;
        }

        function renderTable() {
            const { rows, headerRow, width } = state;
            const view = rows.slice(Math.max(0, headerRow), Math.max(0, headerRow) + 7);
            let h = '<table class="imp-table"><thead><tr><th>#</th>';
            for (let i = 0; i < width; i++) h += `<th>Cột ${i + 1}</th>`;
            h += '</tr></thead><tbody>';
            view.forEach((r, i) => {
                const isHead = headerRow >= 0 && i === 0;
                h += `<tr${isHead ? ' class="imp-head"' : ''}><td>${isHead ? 'Tiêu đề' : Math.max(0, headerRow) + i + 1}</td>`;
                for (let c = 0; c < width; c++) h += `<td>${esc(r[c])}</td>`;
                h += '</tr>';
            });
            byId('impPreviewTable').innerHTML = h + '</tbody></table>';
        }

        function renderMapping() {
            const { cols, type, width } = state;
            const pick = k => (type === 'wgs84' && k === 'x') ? cols.lat : (type === 'wgs84' && k === 'y') ? cols.lng : cols[k];
            byId('impMapping').innerHTML = FIELDS.map(([k, label]) =>
                `<label class="imp-map-item"><span>${label}</span><select class="app-select" data-imp-col="${k}">${colOptions(width, pick(k))}</select></label>`).join('');
            byId('impType').value = type;
        }

        function readConfig() {
            const type = byId('impType').value === 'wgs84' ? 'wgs84' : 'vn2000';
            const cols = {};
            document.querySelectorAll('[data-imp-col]').forEach(sel => {
                if (sel.value === '') return;
                const k = sel.dataset.impCol, v = Number(sel.value);
                if (type === 'wgs84' && k === 'x') cols.lat = v;
                else if (type === 'wgs84' && k === 'y') cols.lng = v;
                else cols[k] = v;
            });
            const provVal = byId('impSrcKtt').value;
            const prov = provVal === 'current' ? null : VN_PROVINCES[Number(provVal)];
            const src = { ktt: prov ? prov.ktt : AppState.kttVal, mui: Number(byId('impSrcMui').value) === 6 ? 6 : 3 };
            const cur = { ktt: AppState.kttVal, mui: AppState.muiVal === 6 ? 6 : 3 };
            const dst = (type === 'vn2000' && byId('impConvert').checked) ? cur : null;
            return { headerRow: state.headerRow, cols, type, src, dst: type === 'wgs84' ? cur : dst };
        }

        function refreshSummary() {
            const cfg = readConfig();
            const res = buildPoints(state.rows, cfg);
            const same = !cfg.dst || (cfg.dst.ktt === cfg.src.ktt && cfg.dst.mui === cfg.src.mui);
            byId('impConvertRow').hidden = cfg.type !== 'vn2000';
            byId('impSummary').textContent = `Sẽ nạp ${res.points.length} điểm` +
                (res.skipped ? `, bỏ qua ${res.skipped} dòng không đọc được${res.skippedLines.length ? ' (dòng ' + res.skippedLines.join(', ') + ')' : ''}` : '') +
                (cfg.type === 'vn2000' && !same ? ' — X/Y được đổi sang KTT hiện hành.' : '.');
            byId('btnImpConfirm').disabled = res.points.length === 0;
            return res;
        }

        function open(rows, fileName) {
            const guess = guessMapping(rows);
            state = { rows, fileName, ...guess };
            byId('impFileName').textContent = `${fileName} · ${rows.length} dòng`;
            const sel = byId('impSrcKtt');
            const cur = `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2, '0')}'`;
            sel.innerHTML = `<option value="current">KTT hiện hành — ${esc(AppState.provinceName || '')} (${cur})</option>` +
                (typeof provinceOptionsHtml === 'function' ? provinceOptionsHtml(-1) : '');
            byId('impSrcMui').value = String(AppState.muiVal === 6 ? 6 : 3);
            byId('impConvert').checked = true;
            renderTable(); renderMapping(); refreshSummary();
            byId('importPreviewBox').hidden = false;
            byId('importPreviewBox').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        function confirm() {
            if (!state) return;
            const res = refreshSummary();
            if (!res.points.length) return;
            const now = new Date().toLocaleString('vi-VN');
            res.points.forEach(p => { p.time = p.time || now; p.source = 'Nhập file'; });
            appData.saveImportedPoints(res.points, state.fileName);
            cancel();
        }

        function cancel() {
            state = null;
            const box = byId('importPreviewBox');
            if (box) box.hidden = true;
        }

        function bind() {
            const box = byId('importPreviewBox');
            if (!box || box._bound) return;
            box._bound = true;
            box.addEventListener('change', e => {
                if (!state) return;
                if (e.target.id === 'impType') { state.type = e.target.value; state.cols = readConfig().cols; renderMapping(); }
                refreshSummary();
            });
            byId('btnImpConfirm').addEventListener('click', confirm);
            byId('btnImpCancel').addEventListener('click', cancel);
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
        return { open, cancel };
    }
})(typeof window !== 'undefined' ? window : globalThis);
