/*
 * Bộ dẫn đường lõi cho phân hệ Lộ trình (thuần JS, không giao diện, chạy được trên Node để kiểm thử).
 *
 * Nhận lộ trình dạng OSRM (OSRM / Valhalla format=osrm) và theo dõi từng tọa độ GPS giống Google / Apple Maps:
 *   - bám vị trí vào tuyến (snap) và đo tiến độ theo QUÃNG ĐƯỜNG dọc tuyến (không theo đường chim bay);
 *   - ưu tiên đi tới — tuyến quay đầu tại điểm dừng (đường đi và về trùng nhau) không bị nhảy lùi / nhảy tắt;
 *   - bước rẽ hiện tại, khoảng cách tới chỗ rẽ, chỗ rẽ "sau đó" nếu sát nhau;
 *   - nhắc giọng nhiều mốc (vd. "Tiếp tục 2 km" → "Trong 300 mét nữa, rẽ trái…" → "Rẽ trái…"),
 *     dùng lời nhắc tiếng Việt của Valhalla nếu có, không có thì tự soạn;
 *   - phát hiện đi lệch tuyến (để tìm đường mới), báo đến từng điểm dừng, quãng đường / thời gian còn lại.
 */
(function (root) {
    'use strict';
    const RAD = Math.PI / 180;
    const EARTH = 6371008.8;

    function haversine(aLat, aLng, bLat, bLng) {
        const dLat = (bLat - aLat) * RAD, dLng = (bLng - aLng) * RAD;
        const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLng / 2) ** 2;
        return 2 * EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
    }
    function bearing(aLat, aLng, bLat, bLng) {
        const y = Math.sin((bLng - aLng) * RAD) * Math.cos(bLat * RAD);
        const x = Math.cos(aLat * RAD) * Math.sin(bLat * RAD) - Math.sin(aLat * RAD) * Math.cos(bLat * RAD) * Math.cos((bLng - aLng) * RAD);
        return (Math.atan2(y, x) / RAD + 360) % 360;
    }

    /** "450 m", "1,2 km", "15 km" */
    function fmtDist(m) {
        if (!Number.isFinite(m)) return '';
        if (m < 1000) return `${m < 100 ? Math.max(10, Math.round(m / 10) * 10) : Math.round(m / 50) * 50} m`;
        const km = m / 1000;
        return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
    }
    function fmtDistSpoken(m) {
        if (m < 1000) return `${m < 100 ? Math.max(10, Math.round(m / 10) * 10) : Math.round(m / 50) * 50} mét`;
        const km = m / 1000;
        return `${km < 10 ? km.toFixed(1).replace('.', ' phẩy ').replace(' phẩy 0', '') : Math.round(km)} ki lô mét`;
    }
    function fmtDuration(sec) {
        if (!Number.isFinite(sec)) return '';
        const m = Math.max(1, Math.round(sec / 60));
        return m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ ${m % 60 ? (m % 60) + ' phút' : ''}`.trim();
    }

    // ---------------- Lời hướng dẫn tiếng Việt (khi nguồn không có sẵn) ----------------
    const MOD_VI = {
        'left': 'rẽ trái', 'right': 'rẽ phải', 'sharp left': 'ngoặt gấp sang trái', 'sharp right': 'ngoặt gấp sang phải',
        'slight left': 'chếch sang trái', 'slight right': 'chếch sang phải', 'straight': 'đi thẳng', 'uturn': 'quay đầu'
    };
    /** Kiểu biểu tượng chỗ rẽ: straight | slight-left | left | sharp-left | uturn | … | roundabout | depart | arrive */
    function iconKind(step) {
        const t = step && step.type, m = (step && step.modifier) || 'straight';
        if (t === 'arrive') return 'arrive';
        if (t === 'depart') return 'depart';
        if (t === 'roundabout' || t === 'rotary' || t === 'roundabout turn' || t === 'exit roundabout' || t === 'exit rotary') return 'roundabout-' + m.replace(' ', '-');
        return m.replace(' ', '-');
    }
    function instructionVi(step) {
        if (!step) return '';
        if (step.instruction) return step.instruction.replace(/\.$/, '');
        const name = step.name ? ` vào ${step.name}` : '';
        const mod = MOD_VI[step.modifier] || '';
        switch (step.type) {
            case 'depart': return `Xuất phát${step.name ? ' trên ' + step.name : ''}`;
            case 'arrive': return 'Đến điểm dừng';
            case 'turn': case 'end of road': case 'fork': case 'on ramp': case 'off ramp': case 'ramp':
                return `${mod ? mod.charAt(0).toUpperCase() + mod.slice(1) : 'Rẽ'}${name}`;
            case 'merge': return `Nhập làn${name}`;
            case 'roundabout': case 'rotary': return `Vào vòng xuyến${step.exit ? `, ra ở lối thứ ${step.exit}` : ''}${name}`;
            case 'exit roundabout': case 'exit rotary': return `Ra khỏi vòng xuyến${name}`;
            case 'continue': case 'new name': return `Đi tiếp${name}`;
            default: return `Đi tiếp${name}`;
        }
    }

    // ---------------- Dựng mô hình tuyến ----------------
    /** route: một phần tử routes[]/trips[] dạng OSRM. stopNames: tên các điểm dừng (để báo "đã đến M3"). */
    function prepare(route, stopNames) {
        const lat = [], lng = [], cum = [];
        const steps = [];
        const legEnds = [];
        const push = (c) => {
            const n = lat.length;
            if (n && Math.abs(lat[n - 1] - c[1]) < 1e-9 && Math.abs(lng[n - 1] - c[0]) < 1e-9) return;
            cum.push(n ? cum[n - 1] + haversine(lat[n - 1], lng[n - 1], c[1], c[0]) : 0);
            lat.push(c[1]); lng.push(c[0]);
        };
        const legs = (route && route.legs) || [];
        const hasStepGeom = legs.length && legs.every(l => (l.steps || []).length && l.steps.every(s => s.geometry && Array.isArray(s.geometry.coordinates)));
        if (hasStepGeom) {
            legs.forEach((leg, li) => {
                leg.steps.forEach(s => {
                    const start = lat.length ? cum[cum.length - 1] : 0;
                    s.geometry.coordinates.forEach(push);
                    const end = lat.length ? cum[cum.length - 1] : 0;
                    const m = s.maneuver || {};
                    steps.push({
                        leg: li, start, end, len: end - start, duration: +s.duration || 0,
                        name: s.name || '', type: m.type || 'continue', modifier: m.modifier || '', exit: m.exit,
                        instruction: m.instruction || '',
                        banner: (s.bannerInstructions && s.bannerInstructions[0] && s.bannerInstructions[0].primary) ? s.bannerInstructions[0].primary.text : '',
                        rawVoice: (s.voiceInstructions || []).map(v => ({ d: +v.distanceAlongGeometry, text: String(v.announcement || '').trim() })).filter(v => v.text)
                    });
                });
                legEnds.push(cum[cum.length - 1] || 0);
            });
        } else {
            // Không có từng bước (đường nối thẳng khi ngoại tuyến): một bước cho mỗi chặng
            const coords = (route && route.geometry && route.geometry.coordinates) || [];
            coords.forEach(push);
            const total = cum[cum.length - 1] || 0;
            steps.push({ leg: 0, start: 0, end: total, len: total, duration: +(route && route.duration) || total / 8, name: '', type: 'depart', modifier: '', instruction: 'Đi theo đường nối thẳng tới điểm dừng', banner: '', rawVoice: [] });
            steps.push({ leg: 0, start: total, end: total, len: 0, duration: 0, name: '', type: 'arrive', modifier: '', instruction: '', banner: '', rawVoice: [] });
            legEnds.push(total);
        }
        const total = cum[cum.length - 1] || 0;
        // Thời gian tích lũy ở đầu mỗi bước → nội suy thời gian còn lại
        let t = 0;
        steps.forEach(s => { s.t0 = t; t += s.duration; s.t1 = t; });
        const totalTime = t || (route && route.duration) || total / 8;
        // Lời nhắc: Valhalla (distanceAlongGeometry tính từ CUỐI bước, nói về chỗ rẽ ở cuối bước) hoặc tự soạn
        steps.forEach((s, i) => {
            const next = steps[i + 1];
            if (s.rawVoice.length) {
                s.voice = s.rawVoice.map(v => ({ at: Math.max(s.start, s.end - v.d), text: v.text }));
            } else if (next) {
                const what = next.type === 'arrive' ? `điểm dừng ${stopNames && stopNames[next.leg + 1] ? stopNames[next.leg + 1] + ' ' : ''}ở phía trước` : instructionVi(next).replace(/^./, c => c.toLowerCase());
                const v = [];
                if (s.len > 1500) v.push({ at: s.start + 15, text: `Đi tiếp ${fmtDistSpoken(s.len)}` });
                if (s.len > 800) v.push({ at: s.end - 500, text: `Sau 500 mét, ${what}` });
                if (s.len > 300) v.push({ at: s.end - 200, text: `Sau 200 mét, ${what}` });
                v.push({ at: s.end - Math.min(60, s.len * 0.6), text: what.charAt(0).toUpperCase() + what.slice(1) });
                s.voice = v;
            } else s.voice = [];
            s.voice.sort((a, b) => a.at - b.at);
        });
        return { lat, lng, cum, steps, legEnds, total, totalTime, stopNames: stopNames || [] };
    }

    function pointAt(model, along) {
        const { lat, lng, cum } = model;
        const n = lat.length;
        if (!n) return null;
        if (along <= 0) return { lat: lat[0], lng: lng[0], bearing: n > 1 ? bearing(lat[0], lng[0], lat[1], lng[1]) : 0, seg: 0 };
        if (along >= model.total) return { lat: lat[n - 1], lng: lng[n - 1], bearing: n > 1 ? bearing(lat[n - 2], lng[n - 2], lat[n - 1], lng[n - 1]) : 0, seg: n - 2 };
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= along) lo = mid; else hi = mid; }
        const f = (along - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
        return { lat: lat[lo] + (lat[hi] - lat[lo]) * f, lng: lng[lo] + (lng[hi] - lng[lo]) * f, bearing: bearing(lat[lo], lng[lo], lat[hi], lng[hi]), seg: lo };
    }

    /** Tọa độ [lat, lng] của đoạn tuyến từ a tới b (mét dọc tuyến) — để vẽ phần đã đi / còn lại. */
    function slice(model, a, b) {
        a = Math.max(0, a); b = Math.min(model.total, b == null ? model.total : b);
        if (b <= a) return [];
        const out = [];
        const p0 = pointAt(model, a);
        out.push([p0.lat, p0.lng]);
        for (let i = p0.seg + 1; i < model.lat.length && model.cum[i] < b; i++) out.push([model.lat[i], model.lng[i]]);
        const p1 = pointAt(model, b);
        out.push([p1.lat, p1.lng]);
        return out;
    }

    function timeLeft(model, along) {
        const s = model.steps.find(x => along < x.end) || model.steps[model.steps.length - 1];
        if (!s) return 0;
        const f = s.len > 0 ? Math.min(1, Math.max(0, (along - s.start) / s.len)) : 1;
        return Math.max(0, model.totalTime - (s.t0 + (s.t1 - s.t0) * f));
    }

    // ---------------- Theo dõi GPS ----------------
    function createTracker(model, opts) {
        opts = Object.assign({ offRouteMeters: 35, offRouteFixes: 3, maxAccuracy: 80, arriveMeters: 25 }, opts || {});
        const st = { along: 0, seg: 0, offCount: 0, spoken: new Set(), arrived: new Set(), finished: false, lastGood: null, started: false };

        function project(fix, i, ky, kx) {
            const ax = (model.lng[i] - fix.lng) * kx, ay = (model.lat[i] - fix.lat) * ky;
            const bx = (model.lng[i + 1] - fix.lng) * kx, by = (model.lat[i + 1] - fix.lat) * ky;
            const dx = bx - ax, dy = by - ay;
            const L2 = dx * dx + dy * dy;
            let f = L2 > 0 ? -(ax * dx + ay * dy) / L2 : 0;
            f = Math.max(0, Math.min(1, f));
            const px = ax + dx * f, py = ay + dy * f;
            return { d: Math.hypot(px, py), along: model.cum[i] + (model.cum[i + 1] - model.cum[i]) * f };
        }

        function snap(fix) {
            const n = model.lat.length;
            if (n < 2) return { d: 0, along: 0 };
            const ky = EARTH * RAD, kx = EARTH * RAD * Math.cos(fix.lat * RAD);
            const speed = Number.isFinite(fix.speed) && fix.speed > 0 ? fix.speed : 8;
            const ahead = st.started ? 120 + speed * 12 : model.total;   // lần đầu: tìm cả tuyến
            let best = null;
            for (let i = 0; i < n - 1; i++) {
                if (model.cum[i + 1] < st.along - 40) continue;
                if (model.cum[i] > st.along + ahead) break;
                const p = project(fix, i, ky, kx);
                // ưu tiên tiến tới: lùi lại bị phạt, nhảy xa về phía trước cũng bị phạt nhẹ
                const back = Math.max(0, st.along - 10 - p.along);
                const jump = Math.max(0, p.along - st.along - 60 - speed * 4);
                const score = p.d + back * 0.8 + jump * 0.05;
                if (!best || score < best.score) best = Object.assign(p, { seg: i, score });
            }
            // Mất dấu (vd. GPS nhảy xa): tìm trên toàn tuyến
            if (!best || best.d > 80) {
                for (let i = 0; i < n - 1; i++) {
                    const p = project(fix, i, ky, kx);
                    const score = p.d + Math.max(0, st.along - p.along) * 0.2;
                    if (!best || score < best.score) best = Object.assign(p, { seg: i, score });
                }
            }
            return best;
        }

        function update(fix) {
            const out = { quality: 'ok', announce: null, arrivedLeg: null };
            if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return Object.assign(out, { quality: 'none' }, view());
            if (Number.isFinite(fix.accuracy) && fix.accuracy > opts.maxAccuracy && st.started) return Object.assign(out, { quality: 'poor' }, view());
            const p = snap(fix);
            st.started = true;
            const tol = Math.max(opts.offRouteMeters, Math.min(60, (fix.accuracy || 0) * 1.2));
            if (p.d > tol) st.offCount++; else st.offCount = 0;
            const offRoute = st.offCount >= opts.offRouteFixes;
            if (p.d <= tol * 1.5 && p.along > st.along - 15) st.along = Math.max(st.along, p.along);
            out.offDist = p.d;
            out.offRoute = offRoute;
            out.raw = { lat: fix.lat, lng: fix.lng };
            // Lời nhắc của bước hiện tại: đọc mốc mới nhất vừa vượt qua (bù độ trễ đọc ~1,5 s)
            const lead = (Number.isFinite(fix.speed) ? fix.speed : 8) * 1.5;
            const sIdx = stepIndex();
            const s = model.steps[sIdx];
            if (s && !offRoute) {
                let pick = null;
                s.voice.forEach((v, vi) => {
                    const key = sIdx + ':' + vi;
                    if (st.spoken.has(key)) return;
                    if (v.at <= st.along + lead) { st.spoken.add(key); if (v.at >= st.along - 150) pick = v; }
                });
                if (pick) out.announce = pick.text;
            }
            // Đến điểm dừng
            model.legEnds.forEach((e, li) => {
                if (st.arrived.has(li)) return;
                const pEnd = pointAt(model, e);
                if (st.along >= e - opts.arriveMeters || (st.along >= e - 80 && haversine(fix.lat, fix.lng, pEnd.lat, pEnd.lng) < opts.arriveMeters)) {
                    st.arrived.add(li);
                    st.along = Math.max(st.along, e);
                    out.arrivedLeg = li;
                    const nm = model.stopNames[li + 1];
                    if (li === model.legEnds.length - 1) { st.finished = true; out.announce = `Bạn đã đến ${nm ? 'điểm ' + nm + ', ' : ''}điểm cuối của lộ trình.`; }
                    else out.announce = `Đã đến ${nm ? 'điểm ' + nm : 'điểm dừng ' + (li + 1)}. Tiếp tục tới ${model.stopNames[li + 2] ? 'điểm ' + model.stopNames[li + 2] : 'điểm kế tiếp'}.`;
                }
            });
            return Object.assign(out, view());
        }

        function stepIndex() {
            let i = 0;
            for (let k = 0; k < model.steps.length; k++) { if (model.steps[k].start <= st.along + 3 && model.steps[k].type !== 'arrive') i = k; else if (model.steps[k].start > st.along + 3) break; }
            // Ở cuối bước (đã tới chỗ rẽ) → sang bước kế
            const s = model.steps[i];
            if (s && st.along >= s.end - 2 && model.steps[i + 1] && model.steps[i + 1].type !== 'arrive') i++;
            return i;
        }

        function view() {
            const i = stepIndex();
            const step = model.steps[i];
            const next = model.steps[i + 1] || null;
            const then = (next && next.len < 150 && model.steps[i + 2]) ? model.steps[i + 2] : null;
            const pt = pointAt(model, st.along);
            const remainingDist = Math.max(0, model.total - st.along);
            return {
                along: st.along, total: model.total, stepIdx: i, step, next, then,
                distToManeuver: step ? Math.max(0, step.end - st.along) : 0,
                remainingDist, remainingTime: timeLeft(model, st.along),
                snapped: pt ? { lat: pt.lat, lng: pt.lng } : null, bearing: pt ? pt.bearing : 0,
                finished: st.finished, legsDone: st.arrived.size
            };
        }

        return { update, view, state: st, model };
    }

    const api = { prepare, createTracker, pointAt, slice, timeLeft, instructionVi, iconKind, fmtDist, fmtDistSpoken, fmtDuration, haversine, bearing };
    root.NavEngine = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
