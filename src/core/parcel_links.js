/**
 * VN2000-PWA — Mã liên kết thửa ↔ đỉnh (src/core/parcel_links.js)
 *
 * Khi xuất điểm ra tệp (CSV / Excel / TXT), mỗi điểm mang một "mã liên kết" cho biết nó là đỉnh
 * thứ mấy của thửa / tuyến / lớp điểm nào. Nhập lại tệp đó, ứng dụng tự dựng lại các thửa đúng
 * thứ tự nối đỉnh, và một mốc chung của nhiều thửa vẫn là MỘT điểm.
 *
 * Quy ước (ghi trong cột "Mã liên kết"):
 *   <loại><số khối>.<thứ tự đỉnh>      ví dụ  T1.3  = đỉnh thứ 3 của thửa số 1
 *   nhiều khối nối bằng "+"            ví dụ  T1.3+T2.1 = đỉnh chung: đỉnh 3 của thửa 1, đỉnh 1 của thửa 2
 *   loại: T = thửa / vùng khép kín, D = đường / tuyến hở, P = lớp điểm rời
 * Cột "Thửa / khối" ghi tên các khối theo thứ tự xuất hiện trong mã, nối bằng " | ".
 * Điểm không thuộc khối nào để trống cả hai cột.
 */
(function (root) {
    'use strict';

    const TYPE_OF_MODE = { polygon: 'T', polyline: 'D', point: 'P' };
    const MODE_OF_TYPE = { T: 'polygon', D: 'polyline', P: 'point' };
    const DEFAULT_NAME = { T: 'Thửa', D: 'Tuyến', P: 'Điểm' };
    const NAME_SEP = ' | ';
    const LK_HEADER = 'Mã liên kết';
    const SHAPE_HEADER = 'Thửa / khối';

    const fin = v => (typeof v === 'number' ? Number.isFinite(v) : (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))));
    const cleanName = s => String(s == null ? '' : s).replace(/\|/g, '/').replace(/[\r\n\t]+/g, ' ').trim();

    // Khóa vị trí: cùng tọa độ (đến mm, hoặc ~1 mm theo độ) là cùng một mốc ngoài thực địa.
    function positionKey(p) {
        if (fin(p.x) && fin(p.y) && (Number(p.x) !== 0 || Number(p.y) !== 0)) return 'xy:' + Number(p.x).toFixed(3) + ',' + Number(p.y).toFixed(3);
        if (fin(p.lat) && fin(p.lng)) return 'll:' + Number(p.lat).toFixed(8) + ',' + Number(p.lng).toFixed(8);
        return null;
    }

    function formatLinks(memberships) {
        return (memberships || []).map(m => `${m.type}${m.index}.${m.order}`).join('+');
    }

    // Đọc mã, chấp nhận cả cách gõ tay: "t1.3 + T2.1", "T1:3;T2-1", "T1/3, T2_1".
    function parseLinks(str) {
        const out = [];
        const re = /([TDP])\s*(\d+)\s*[.:\-/_]\s*(\d+)/gi;
        let m;
        const s = String(str == null ? '' : str);
        while ((m = re.exec(s))) out.push({ type: m[1].toUpperCase(), index: Number(m[2]), order: Number(m[3]) });
        return out;
    }

    function looksLikeLinkCell(v) {
        const s = String(v == null ? '' : v).trim();
        return /^([TDP]\s*\d+\s*[.:\-/_]\s*\d+)(\s*[+;,&]\s*[TDP]\s*\d+\s*[.:\-/_]\s*\d+)*$/i.test(s);
    }

    /**
     * Khối (có thứ tự đỉnh) + điểm rời → các dòng điểm KHÔNG trùng vị trí, mỗi dòng có mã liên kết.
     * shapes: [{ name, mode, vertices: [{ name, x, y, h, lat, lng, ... }] }]
     * loose:  điểm không thuộc khối nào (giữ nguyên, mã trống).
     */
    function buildLinkedRows(shapes, loose) {
        const rows = [];
        const byPos = new Map();
        const legend = [];
        const counter = { T: 0, D: 0, P: 0 };
        (shapes || []).forEach(s => {
            const verts = (s && s.vertices) || [];
            if (!verts.length) return;
            const type = TYPE_OF_MODE[s.mode] || 'T';
            const index = ++counter[type];
            const key = type + index;
            const name = cleanName(s.name) || `${DEFAULT_NAME[type]} ${index}`;
            legend.push({ key, type, index, name, mode: MODE_OF_TYPE[type], color: s.color || '', count: verts.length });
            verts.forEach((v, i) => {
                const pk = positionKey(v);
                let row = pk ? byPos.get(pk) : null;
                if (!row) {
                    row = Object.assign({}, v, { memberships: [] });
                    ['shapeId', 'shapeName', 'shapeMode', 'shapeColor', 'shapeOrder'].forEach(k => delete row[k]);
                    rows.push(row);
                    if (pk) byPos.set(pk, row);
                }
                row.memberships.push({ type, index, order: i + 1, key, name });
            });
        });
        (loose || []).forEach(p => {
            const pk = positionKey(p);
            if (pk && byPos.has(pk)) return; // đã là đỉnh của một khối
            rows.push(Object.assign({}, p, { memberships: [] }));
            if (pk) byPos.set(pk, rows[rows.length - 1]);
        });
        rows.forEach(r => {
            r.lk = formatLinks(r.memberships);
            const keys = [];
            r.memberships.forEach(m => { if (!keys.some(k => k.key === m.key)) keys.push(m); });
            r.lkNames = keys.map(k => k.name).join(NAME_SEP);
        });
        return { rows, legend };
    }

    /** Điểm của Sổ đo (đã gắn shapeId/shapeName/shapeOrder khi MiniCAD lưu) → khối + điểm rời. */
    function shapesFromTaggedPoints(points) {
        const map = new Map();
        const loose = [];
        (points || []).forEach((p, i) => {
            const tag = p && (p.shapeId || p.shapeName || p.blockName);
            if (!tag) { loose.push(p); return; }
            const key = String(p.shapeId || '') + '|' + String(p.shapeName || p.blockName || '');
            if (!map.has(key)) map.set(key, { name: p.shapeName || p.blockName, mode: p.shapeMode || 'polygon', color: p.shapeColor || '', items: [] });
            map.get(key).items.push({ p, i, order: Number(p.shapeOrder) || 0 });
        });
        const shapes = [];
        map.forEach(s => {
            s.items.sort((a, b) => (a.order && b.order && a.order !== b.order) ? a.order - b.order : a.i - b.i);
            shapes.push({ name: s.name, mode: s.mode, color: s.color, vertices: s.items.map(it => it.p) });
        });
        return { shapes, loose };
    }

    function hasShapeTags(points) {
        return (points || []).some(p => p && (p.shapeId || p.shapeName || p.blockName));
    }

    /**
     * Điểm nhập từ tệp (mỗi điểm có .lk và/hoặc .lkNames) → khối dựng lại theo đúng thứ tự đỉnh.
     * Tệp chỉ có cột "Thửa / khối" (không có mã) vẫn được: nhóm theo tên, theo thứ tự dòng.
     * Trả về { shapes:[{key,name,mode,vertices,warnings}], loose:[điểm không thuộc khối], warnings:[] }.
     */
    function rebuildShapes(points) {
        const groups = new Map();
        const names = new Map();
        const loose = [];
        const warnings = [];
        let byNameSeq = 0;
        (points || []).forEach((p, row) => {
            const ms = parseLinks(p.lk);
            const nameList = String(p.lkNames == null ? '' : p.lkNames).split('|').map(s => s.trim()).filter(Boolean);
            if (!ms.length) {
                if (nameList.length === 1) {
                    // Chỉ có tên khối: gom theo tên, thứ tự = thứ tự dòng
                    const key = 'N:' + nameList[0];
                    if (!groups.has(key)) groups.set(key, { key, type: 'T', index: ++byNameSeq, items: [], byName: true });
                    names.set(key, nameList[0]);
                    groups.get(key).items.push({ p, order: groups.get(key).items.length + 1, row });
                } else {
                    loose.push(p);
                }
                return;
            }
            const distinct = [];
            ms.forEach(m => { const k = m.type + m.index; if (!distinct.includes(k)) distinct.push(k); });
            distinct.forEach((k, i) => { if (nameList[i] && !names.has(k)) names.set(k, nameList[i]); });
            ms.forEach(m => {
                const k = m.type + m.index;
                if (!groups.has(k)) groups.set(k, { key: k, type: m.type, index: m.index, items: [] });
                groups.get(k).items.push({ p, order: m.order, row });
            });
        });
        const shapes = [];
        Array.from(groups.values())
            .sort((a, b) => (a.byName === b.byName ? 0 : a.byName ? 1 : -1) || ('TDP'.indexOf(a.type) - 'TDP'.indexOf(b.type)) || a.index - b.index)
            .forEach(g => {
                g.items.sort((a, b) => a.order - b.order || a.row - b.row);
                const name = names.get(g.key) || `${DEFAULT_NAME[g.type]} ${g.index}`;
                const seen = new Set();
                g.items.forEach(it => {
                    if (seen.has(it.order) && !g.byName) warnings.push(`${name}: thứ tự đỉnh ${it.order} bị lặp`);
                    seen.add(it.order);
                });
                let mode = MODE_OF_TYPE[g.type];
                if (g.byName) mode = g.items.length >= 3 ? 'polygon' : (g.items.length === 2 ? 'polyline' : 'point');
                if (mode === 'polygon' && g.items.length < 3) {
                    warnings.push(`${name}: chỉ có ${g.items.length} đỉnh, dựng thành tuyến`);
                    mode = g.items.length >= 2 ? 'polyline' : 'point';
                }
                shapes.push({ key: g.key, name, mode, vertices: g.items.map(it => it.p) });
            });
        return { shapes, loose, warnings };
    }

    /** Điểm nhập có mã → dòng điểm gắn thẻ khối (như MiniCAD lưu vào Sổ đo): mỗi lần là đỉnh = một dòng. */
    function expandToTaggedPoints(points, opts = {}) {
        const res = rebuildShapes(points);
        const prefix = opts.idPrefix || ('lk_' + Date.now().toString(36));
        const out = [];
        res.shapes.forEach((s, si) => {
            const shapeId = `${prefix}_${s.key.replace(/[^A-Za-z0-9]/g, '')}_${si + 1}`;
            s.vertices.forEach((p, i) => {
                const q = Object.assign({}, p, { shapeId, shapeName: s.name, shapeMode: s.mode, shapeOrder: i + 1 });
                delete q.lk; delete q.lkNames;
                out.push(q);
            });
        });
        res.loose.forEach(p => { const q = Object.assign({}, p); delete q.lk; delete q.lkNames; out.push(q); });
        return { points: out, shapes: res.shapes, loose: res.loose, warnings: res.warnings };
    }

    function hasLinks(points) {
        return (points || []).some(p => p && ((p.lk && parseLinks(p.lk).length) || (p.lkNames && String(p.lkNames).trim())));
    }

    const api = {
        TYPE_OF_MODE, MODE_OF_TYPE, LK_HEADER, SHAPE_HEADER, NAME_SEP,
        positionKey, formatLinks, parseLinks, looksLikeLinkCell,
        buildLinkedRows, shapesFromTaggedPoints, hasShapeTags,
        rebuildShapes, expandToTaggedPoints, hasLinks
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.ParcelLinks = api;
})(typeof window !== 'undefined' ? window : globalThis);
