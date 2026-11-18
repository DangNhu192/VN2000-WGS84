/**
 * Georef — gắn tọa độ cho ảnh bản đồ (ảnh quét / ảnh xuất từ PDF) theo VN-2000.
 *
 * Phép biến đổi ảnh → mặt đất là affine, đơn vị điểm ảnh tính từ GÓC trên-trái của ảnh:
 *     E (Đông, Y VN-2000) = a·u + b·v + c
 *     N (Bắc,  X VN-2000) = d·u + e·v + f
 * Nguồn: tệp tọa độ đi kèm ảnh (.jgw/.pgw/.tfw/.wld — chuẩn ESRI world file) hoặc các
 * điểm khống chế người dùng chấm trên ảnh (2 điểm: dời + xoay + tỉ lệ; ≥ 3 điểm: affine
 * bình phương tối thiểu, có sai số từng điểm).
 * Không phụ thuộc trình duyệt — dùng được trong Node để kiểm thử.
 */
(function (root) {
    'use strict';

    const num = (s) => {
        const v = parseFloat(String(s).trim().replace(/,(?=\d+$)/, '.'));
        return isFinite(v) ? v : NaN;
    };

    // World file: 6 dòng A, D, B, E, C, F (C/F là TÂM điểm ảnh trên-trái).
    // X = A·cột + B·hàng + C (Đông), Y = D·cột + E·hàng + F (Bắc).
    function parseWorldFile(text) {
        const vals = String(text || '').split(/[\r\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 6).map(num);
        if (vals.length < 6 || vals.some(v => !isFinite(v))) return null;
        let [A, D, B, E, C, F] = vals;
        if (A === 0 && B === 0) return null;
        // Một số phần mềm ghi (X Bắc, Y Đông): ở Việt Nam Đông < 800 km, Bắc > 900 km → đảo lại.
        let swapped = false;
        if (C > 900000 && F < 800000) {
            [A, D] = [D, A]; [B, E] = [E, B]; [C, F] = [F, C];
            swapped = true;
        }
        return { A, D, B, E, C, F, swapped };
    }

    function worldFileToAffine(wf) {
        if (!wf) return null;
        return {
            a: wf.A, b: wf.B, c: wf.C - 0.5 * wf.A - 0.5 * wf.B,
            d: wf.D, e: wf.E, f: wf.F - 0.5 * wf.D - 0.5 * wf.E
        };
    }

    function affineToWorldFile(m) {
        const fmt = (v) => (Math.abs(v) >= 1000 ? v.toFixed(6) : String(+v.toPrecision(12)));
        const C = m.c + 0.5 * m.a + 0.5 * m.b;
        const F = m.f + 0.5 * m.d + 0.5 * m.e;
        return [m.a, m.d, m.b, m.e, C, F].map(fmt).join('\r\n') + '\r\n';
    }

    function applyAffine(m, u, v) {
        return { e: m.a * u + m.b * v + m.c, n: m.d * u + m.e * v + m.f };
    }

    function invertAffine(m) {
        const det = m.a * m.e - m.b * m.d;
        if (!det || !isFinite(det)) return null;
        const ia = m.e / det, ib = -m.b / det, id = -m.d / det, ie = m.a / det;
        return { a: ia, b: ib, c: -(ia * m.c + ib * m.f), d: id, e: ie, f: -(id * m.c + ie * m.f) };
    }

    // Giải hệ 3×3 (Cramer) cho phương trình chuẩn bình phương tối thiểu
    function solve3(M, r) {
        const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
            - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
        const D = det(M);
        if (!D || !isFinite(D) || Math.abs(D) < 1e-12) return null;
        return [0, 1, 2].map(k => det(M.map((row, i) => row.map((x, j) => (j === k ? r[i] : x)))) / D);
    }

    /**
     * points: [{ u, v, e, n }] — u,v điểm ảnh; e Đông (Y), n Bắc (X) VN-2000.
     * Trả về { affine, method, rms, residuals: [m], scale (m/điểm ảnh) } hoặc { error }.
     */
    function fitAffine(points) {
        const pts = (points || []).filter(p => [p.u, p.v, p.e, p.n].every(isFinite));
        if (pts.length < 2) return { error: 'CAN_IT_NHAT_2_DIEM' };
        let m, method;
        if (pts.length === 2) {
            // Dời + xoay + tỉ lệ đều: E = s·u − t·v + c, N = −(t·u + s·v) + f (trục v hướng xuống)
            const [p, q] = pts;
            const du = q.u - p.u, dv = -(q.v - p.v), de = q.e - p.e, dn = q.n - p.n;
            const den = du * du + dv * dv;
            if (den < 1e-9) return { error: 'DIEM_TRUNG_NHAU' };
            const s = (de * du + dn * dv) / den;   // cos·k
            const t = (dn * du - de * dv) / den;   // sin·k
            m = { a: s, b: t, d: t, e: -s };
            m.c = p.e - m.a * p.u - m.b * p.v;
            m.f = p.n - m.d * p.u - m.e * p.v;
            method = 'similarity';
        } else {
            // Đưa về gốc trọng tâm cho ổn định số học (tọa độ VN-2000 ~ 10⁶ m)
            const cu = pts.reduce((s, p) => s + p.u, 0) / pts.length;
            const cv = pts.reduce((s, p) => s + p.v, 0) / pts.length;
            const ce = pts.reduce((s, p) => s + p.e, 0) / pts.length;
            const cn = pts.reduce((s, p) => s + p.n, 0) / pts.length;
            let suu = 0, suv = 0, svv = 0, su = 0, sv = 0;
            let sue = 0, sve = 0, se = 0, sun = 0, svn = 0, sn = 0;
            pts.forEach(p => {
                const u = p.u - cu, v = p.v - cv, e = p.e - ce, n = p.n - cn;
                suu += u * u; suv += u * v; svv += v * v; su += u; sv += v;
                sue += u * e; sve += v * e; se += e; sun += u * n; svn += v * n; sn += n;
            });
            const N = [[suu, suv, su], [suv, svv, sv], [su, sv, pts.length]];
            const xe = solve3(N, [sue, sve, se]);
            const xn = solve3(N, [sun, svn, sn]);
            if (!xe || !xn) return { error: 'DIEM_THANG_HANG' };
            m = {
                a: xe[0], b: xe[1], c: xe[2] + ce - xe[0] * cu - xe[1] * cv,
                d: xn[0], e: xn[1], f: xn[2] + cn - xn[0] * cu - xn[1] * cv
            };
            method = 'affine';
        }
        if (!invertAffine(m)) return { error: 'DIEM_THANG_HANG' };
        const residuals = pts.map(p => { const g = applyAffine(m, p.u, p.v); return Math.hypot(g.e - p.e, g.n - p.n); });
        const dof = pts.length - (method === 'affine' ? 3 : 2);
        const rms = dof > 0 ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / pts.length) : null;
        const scale = Math.sqrt(Math.abs(m.a * m.e - m.b * m.d));
        return { affine: m, method, residuals, rms, scale };
    }

    // Tệp đi kèm ảnh: abc.jpg ↔ abc.jgw / abc.jpgw / abc.wld …
    const WORLD_EXT = /\.(jgw|jpgw|jpw|pgw|pngw|tfw|tifw|wld|j2w|bpw|gfw)$/i;
    function isWorldFileName(name) { return WORLD_EXT.test(String(name || '')); }
    function baseName(name) { return String(name || '').replace(/\.[^.\\/]+$/, '').toLowerCase(); }

    const Georef = { parseWorldFile, worldFileToAffine, affineToWorldFile, applyAffine, invertAffine, fitAffine, isWorldFileName, baseName };
    if (typeof module !== 'undefined' && module.exports) module.exports = Georef;
    if (root) root.Georef = Georef;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
