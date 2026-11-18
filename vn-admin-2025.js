/* Tra địa chỉ hành chính SAU SÁP NHẬP (từ 01/07/2025) theo tọa độ, chạy ngoại tuyến.
   Dữ liệu: data/vn_admin_2025.js (34 tỉnh, 3.321 xã/phường/đặc khu), chỉ tải khi cần (camera, gợi ý KTT). */
(function (root) {
    'use strict';

    // Điểm nằm ngoài mọi đa giác (do ranh đã giản lược ~33 m) vẫn nhận xã gần nhất trong ngưỡng này.
    const NEAR_DEG = 0.0006; // ~65 m

    function decodeRing(enc, scale) {
        const out = new Float64Array(enc.length);
        let x = 0, y = 0;
        for (let i = 0; i < enc.length; i += 2) {
            x += enc[i]; y += enc[i + 1];
            out[i] = x / scale; out[i + 1] = y / scale;
        }
        return out;
    }

    function inRing(ring, lng, lat) {
        let inside = false;
        for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
            const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
            if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }

    function distToRing(ring, lng, lat) {
        const k = Math.cos(lat * Math.PI / 180); // co kinh độ theo vĩ độ để khoảng cách gần đúng mét
        let best = Infinity;
        for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
            const ax = ring[j] * k, ay = ring[j + 1], bx = ring[i] * k, by = ring[i + 1], px = lng * k, py = lat;
            const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
            const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
            const ex = ax + t * dx - px, ey = ay + t * dy - py;
            best = Math.min(best, Math.sqrt(ex * ex + ey * ey));
        }
        return best;
    }

    /** Tạo bộ tra cứu từ dữ liệu VN_ADMIN_2025. */
    function createLookup(data) {
        const scale = data.scale || 10000;
        const wards = data.wards.map(w => ({
            name: w[0], prov: w[1],
            bbox: w[2].map(v => v / scale), enc: w[3], rings: null
        }));
        const rings = w => w.rings || (w.rings = w.enc.map(r => decodeRing(r, scale)));
        const result = (w, approx) => {
            const p = data.provinces[w.prov];
            return { ward: w.name, province: p[1], provinceCode: p[0], approx: !!approx };
        };
        return function lookup(lat, lng) {
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            let near = null, nearD = NEAR_DEG;
            for (const w of wards) {
                const b = w.bbox;
                if (lng < b[0] - NEAR_DEG || lng > b[2] + NEAR_DEG || lat < b[1] - NEAR_DEG || lat > b[3] + NEAR_DEG) continue;
                const rs = rings(w);
                if (lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3] && rs.some(r => inRing(r, lng, lat))) return result(w, false);
                for (const r of rs) {
                    const d = distToRing(r, lng, lat);
                    if (d < nearD) { nearD = d; near = w; }
                }
            }
            return near ? result(near, true) : null;
        };
    }

    /** Dòng địa chỉ in trên dấu ảnh. */
    function formatAddress(hit) {
        if (!hit) return '';
        return `${hit.ward}, ${hit.province}${hit.approx ? ' (gần ranh giới)' : ''}`.normalize('NFC');
    }

    const api = { createLookup, formatAddress, decodeRing, inRing };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

    // ======================= Trình duyệt: tải lười + bộ nhớ đệm theo vị trí =======================
    let lookup = null, loading = null, last = null;
    const SRC = 'data/vn_admin_2025.js?v=2025-07-01';

    function load() {
        if (lookup) return Promise.resolve(lookup);
        if (loading) return loading;
        loading = new Promise((resolve, reject) => {
            if (root.VN_ADMIN_2025) { lookup = createLookup(root.VN_ADMIN_2025); return resolve(lookup); }
            const s = document.createElement('script');
            s.src = SRC;
            s.async = true;
            s.onload = () => {
                if (!root.VN_ADMIN_2025) return reject(new Error('Thiếu dữ liệu địa giới 2025'));
                lookup = createLookup(root.VN_ADMIN_2025);
                resolve(lookup);
            };
            s.onerror = () => { loading = null; reject(new Error('Không tải được dữ liệu địa giới 2025')); };
            document.head.appendChild(s);
        });
        return loading;
    }

    /** Địa chỉ đã biết cho tọa độ gần nhất (đồng bộ, dùng khi vẽ từng khung hình). Rỗng khi chưa có. */
    function cachedAddress(lat, lng) {
        if (!lookup) { load().catch(() => {}); return ''; }
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
        // Chỉ tra lại khi dời > ~10 m: camera vẽ 30 khung/giây.
        if (last && Math.abs(last.lat - lat) < 0.0001 && Math.abs(last.lng - lng) < 0.0001) return last.text;
        const text = formatAddress(lookup(lat, lng));
        last = { lat, lng, text };
        return text;
    }

    root.VnAdmin2025 = { load, cachedAddress, lookup: (lat, lng) => (lookup ? lookup(lat, lng) : null), formatAddress };
})(typeof window !== 'undefined' ? window : globalThis);
