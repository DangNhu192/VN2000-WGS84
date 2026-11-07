/* Đổi tọa độ VN-2000 giữa các Kinh tuyến trục / Múi chiếu.
   Thuộc phân hệ Chuyển đổi tọa độ (tab "Đổi KTT / Múi"); không gọi giao diện phân hệ khác. */
(function (root) {
    'use strict';

    // Quá ngưỡng này (độ kinh) so với KTT, sai số biến dạng chiều dài và chuỗi Gauss-Kruger tăng nhanh.
    const FAR_DEG = 3.5;
    const K0 = { 3: 0.9999, 6: 0.9996 };

    function parseNum(token) {
        if (typeof token !== 'string') return NaN;
        let t = token.trim();
        if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); // 1.191.900,123
        else if (/^[+-]?\d+,\d+$/.test(t)) t = t.replace(',', '.');                           // 1191900,123
        return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t) ? Number(t) : NaN;
    }

    /**
     * Mỗi dòng một điểm: "Tên X Y" hoặc "X Y" (dán từ Excel/Zalo).
     * Phân cách: tab, chấm phẩy, khoảng trắng; dấu phẩy chỉ là phân cách khi không dùng làm dấu thập phân.
     * X (Bắc) ở Việt Nam luôn lớn hơn Y (Đông) → tự đảo khi người dùng dán ngược "Y X".
     */
    function parseLines(text) {
        const points = [], errors = [];
        String(text || '').split(/\r?\n/).forEach((raw, i) => {
            const line = raw.trim();
            if (!line || /^(#|\/\/)/.test(line)) return;
            let parts = /[\t;]/.test(line) ? line.split(/[\t;]+/) : line.split(/\s+/);
            if (parts.filter(p => Number.isFinite(parseNum(p))).length < 2 && line.includes(',')) parts = line.split(/\s*,\s*/);
            parts = parts.map(p => p.trim()).filter(Boolean);
            const nums = [], words = [];
            parts.forEach(p => { const n = parseNum(p); if (Number.isFinite(n)) nums.push(n); else words.push(p); });
            // Cột STT/tên dạng số đứng đầu: "1 1191900.1 603800.2" → bỏ số đầu nếu còn đủ 2 số lớn.
            let name = words.join(' ');
            if (nums.length >= 3 && Math.abs(nums[0]) < 100000) { name = name || String(nums[0]); nums.shift(); }
            if (nums.length < 2) { errors.push({ line: i + 1, text: line }); return; }
            let [x, y] = nums;
            const swapped = y > x;
            if (swapped) [x, y] = [y, x];
            points.push({ name: name || `Đ${points.length + 1}`, x, y, swapped, line: i + 1 });
        });
        return { points, errors };
    }

    function zoneScale(zone) { return K0[zone] || K0[3]; }

    /** src/dst: { ktt: số thập phân, zone: 3 | 6 } */
    function convertAll(points, src, dst, convert) {
        const k0s = zoneScale(src.zone), k0d = zoneScale(dst.zone);
        return points.map(p => {
            const r = convert(p.x, p.y, src.ktt, k0s, dst.ktt, k0d);
            if (!r) return { ...p, ok: false };
            return { ...p, ok: true, X: r.X, Y: r.Y, lat: r.lat, lng: r.lng,
                far: r.offSrc > FAR_DEG || r.offDst > FAR_DEG,
                outOfVn: r.lat < 7 || r.lat > 24 || r.lng < 101 || r.lng > 118 };
        });
    }

    function kttLabel(ktt) {
        const d = Math.floor(ktt + 1e-9), m = Math.round((ktt - d) * 60);
        return `${d}°${String(m).padStart(2, '0')}'`;
    }

    function csvCell(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

    function toCsv(results, src, dst) {
        const head = ['Tên Điểm', 'X nguồn', 'Y nguồn', 'X mới', 'Y mới', 'KTT nguồn', 'Múi nguồn', 'KTT đích', 'Múi đích', 'Ghi chú'];
        const rows = results.filter(r => r.ok).map(r => [r.name, r.x.toFixed(3), r.y.toFixed(3), r.X.toFixed(3), r.Y.toFixed(3),
            kttLabel(src.ktt), `${src.zone}°`, kttLabel(dst.ktt), `${dst.zone}°`, noteOf(r)].map(csvCell).join(','));
        return '﻿' + [head.map(csvCell).join(','), ...rows].join('\r\n');
    }

    function noteOf(r) {
        const notes = [];
        if (r.swapped) notes.push('Đã đảo X⇄Y khi nhập');
        if (r.outOfVn) notes.push('Ngoài lãnh thổ VN - kiểm tra KTT nguồn');
        else if (r.far) notes.push('Cách KTT > 3.5°');
        return notes.join('; ');
    }

    /** Danh sách KTT gom theo tỉnh: [{ ktt, label }] */
    function kttOptions(provinces) {
        const map = new Map();
        (provinces || []).forEach(p => {
            const k = Math.round(p.ktt * 10000) / 10000;
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(p.name.replace(/^TP\.\s*/, ''));
        });
        return [...map.keys()].sort((a, b) => a - b).map(k => ({ ktt: k, label: `${kttLabel(k)} — ${map.get(k).join(', ')}` }));
    }

    const api = { parseNum, parseLines, convertAll, toCsv, kttOptions, kttLabel, zoneScale, FAR_DEG };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
    root.Vn2kRezone = api;

    // ======================= Giao diện =======================
    let last = null;
    const byId = id => document.getElementById(id);

    function readSide(prefix) {
        const sel = byId(prefix + 'Ktt'), custom = byId(prefix + 'KttCustom');
        let ktt = Number(sel.value);
        if (sel.value === 'custom') {
            const parsed = typeof parseKttString === 'function' ? parseKttString(custom.value) : null;
            ktt = parsed ? parsed.decimal : NaN;
        }
        return { ktt, zone: Number(byId(prefix + 'Zone').value) === 6 ? 6 : 3 };
    }

    function fillSelect(sel, value) {
        const all = typeof VN_PROVINCES !== 'undefined' ? VN_PROVINCES : [];
        const oldCount = typeof VN_PROVINCES_OLD_COUNT !== 'undefined' ? VN_PROVINCES_OLD_COUNT : all.length;
        const groups = [
            ['Theo 34 tỉnh, thành phố (từ 01/07/2025)', all.slice(oldCount)],
            ['Theo 63 tỉnh cũ (số liệu trước 01/07/2025)', all.slice(0, oldCount)]
        ];
        sel.innerHTML = '';
        groups.forEach(([label, list]) => {
            if (!list.length) return;
            const g = document.createElement('optgroup');
            g.label = label;
            kttOptions(list).forEach(o => g.appendChild(new Option(o.label, String(o.ktt))));
            sel.appendChild(g);
        });
        sel.add(new Option('Nhập KTT khác…', 'custom'));
        const match = [...sel.options].find(o => Math.abs(Number(o.value) - value) < 1e-6);
        sel.value = match ? match.value : 'custom';
        return !match;
    }

    function toggleCustom(prefix) {
        byId(prefix + 'KttCustom').hidden = byId(prefix + 'Ktt').value !== 'custom';
    }

    function setStatus(text, isError) {
        const el = byId('rzStatus');
        el.textContent = text;
        el.style.color = isError ? '#f87171' : '';
    }

    function render(results) {
        const body = byId('rzResultBody');
        body.innerHTML = '';
        results.forEach(r => {
            const tr = document.createElement('tr');
            const cells = r.ok
                ? [r.name, r.X.toFixed(3), r.Y.toFixed(3), noteOf(r)]
                : [r.name, '—', '—', 'Không đổi được'];
            cells.forEach((c, i) => {
                const td = document.createElement('td');
                td.textContent = c;
                if (i === 1 || i === 2) td.className = 'font-mono';
                if (i === 3 && c) td.style.color = '#fbbf24';
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
        byId('rzResultCard').hidden = results.length === 0;
    }

    function run() {
        const src = readSide('rzSrc'), dst = readSide('rzDst');
        if (!Number.isFinite(src.ktt) || !Number.isFinite(dst.ktt)) return setStatus('KTT nhập tay không hợp lệ. Ví dụ: 105°45\' hoặc 105.75', true);
        const { points, errors } = parseLines(byId('rzInput').value);
        if (!points.length) { render([]); return setStatus('Chưa có điểm hợp lệ. Mỗi dòng: Tên X Y hoặc X Y.', true); }
        const results = convertAll(points, src, dst, root.convertVn2kToVn2k);
        last = { results, src, dst };
        render(results);
        const same = Math.abs(src.ktt - dst.ktt) < 1e-9 && src.zone === dst.zone;
        let msg = `Đã đổi ${results.filter(r => r.ok).length} điểm: KTT ${kttLabel(src.ktt)} múi ${src.zone}° → KTT ${kttLabel(dst.ktt)} múi ${dst.zone}°.`;
        if (same) msg += ' (Nguồn và đích giống nhau.)';
        if (errors.length) msg += ` Bỏ qua ${errors.length} dòng không đọc được (dòng ${errors.slice(0, 5).map(e => e.line).join(', ')}${errors.length > 5 ? '…' : ''}).`;
        setStatus(msg, false);
    }

    function resultText() {
        if (!last) return '';
        return last.results.filter(r => r.ok).map(r => `${r.name}\t${r.X.toFixed(3)}\t${r.Y.toFixed(3)}`).join('\n');
    }

    function copy() {
        const text = resultText();
        if (!text) return;
        const done = () => root.showToast && root.showToast('✓ Đã chép kết quả (Tên, X, Y) — dán thẳng vào Excel được');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => setStatus('Không chép được, hãy bôi đen bảng để chép.', true));
        else setStatus('Trình duyệt không cho chép tự động, hãy bôi đen bảng để chép.', true);
    }

    function download() {
        if (!last) return;
        const blob = new Blob([toCsv(last.results, last.src, last.dst)], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `VN2000_DoiKTT_${kttLabel(last.src.ktt).replace(/[°']/g, '')}_sang_${kttLabel(last.dst.ktt).replace(/[°']/g, '')}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    function swap() {
        ['Ktt', 'KttCustom', 'Zone'].forEach(f => {
            const a = byId('rzSrc' + f), b = byId('rzDst' + f);
            [a.value, b.value] = [b.value, a.value];
        });
        toggleCustom('rzSrc'); toggleCustom('rzDst');
        // Kết quả đang có trở thành đầu vào để đổi ngược.
        if (last && last.results.some(r => r.ok)) {
            byId('rzInput').value = last.results.filter(r => r.ok).map(r => `${r.name}\t${r.X.toFixed(3)}\t${r.Y.toFixed(3)}`).join('\n');
            run();
        }
    }

    function init() {
        if (!byId('panelTransRezone')) return;
        const state = root.AppState || {};
        const current = Number(state.kttVal) || 105.75;
        if (fillSelect(byId('rzSrcKtt'), current)) byId('rzSrcKttCustom').value = kttLabel(current);
        fillSelect(byId('rzDstKtt'), current === 105 ? 105.75 : 105);
        byId('rzSrcZone').value = String(state.muiVal === 6 ? 6 : 3);
        ['rzSrc', 'rzDst'].forEach(p => { byId(p + 'Ktt').addEventListener('change', () => toggleCustom(p)); toggleCustom(p); });
        byId('rzRun').addEventListener('click', run);
        byId('rzSwap').addEventListener('click', swap);
        byId('rzCopy').addEventListener('click', copy);
        byId('rzCsv').addEventListener('click', download);
        byId('rzClear').addEventListener('click', () => { byId('rzInput').value = ''; last = null; render([]); setStatus('', false); });
        byId('rzSample').addEventListener('click', () => {
            byId('rzInput').value = 'M1\t1191900.123\t603800.456\nM2\t1192015.880\t603912.304';
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : globalThis);
