/**
 * GisIO - Bộ Đọc/ghi Dữ Liệu Vector GIS Chuẩn Mở (GeoJSON / KML / GPX / WKT)
 * Độc lập 100% với DOM và với hệ quy chiếu: module chỉ bóc tách hình học thô,
 * việc quy đổi WGS84 <-> VN-2000 do tầng ứng dụng (app.js) quyết định.
 *
 * Quy ước vị trí trong mọi hàm trả về:
 *   { lng, lat, h } — với dữ liệu địa lý: lng = kinh độ, lat = vĩ độ.
 *   Với dữ liệu đã chiếu (projected, đơn vị mét) theo đúng thứ tự trục trong tệp:
 *   lng = trục 1 (Easting / Y / Đông), lat = trục 2 (Northing / X / Bắc).
 */

const GisIO = {

    stripBom(text) {
        return String(text == null ? '' : text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    },

    // Nhận dạng định dạng theo phần mở rộng, nếu không đoán được thì "ngửi" nội dung
    detectFormat(fileName, text) {
        const name = String(fileName || '').toLowerCase();
        if (/\.(geo)?json$/.test(name)) return 'geojson';
        if (/\.kml$/.test(name)) return 'kml';
        if (/\.kmz$/.test(name)) return 'kmz';
        if (/\.gpx$/.test(name)) return 'gpx';
        if (/\.wkt$/.test(name)) return 'wkt';

        const body = String(text || '').slice(0, 4000).toLowerCase();
        if (body.includes('<kml')) return 'kml';
        if (body.includes('<gpx')) return 'gpx';
        if (body.includes('"featurecollection"') || body.includes('"multipolygon"') ||
            body.includes('"geometrype"')) return 'geojson';
        if (/\b(point|linestring|polygon|multipoint|multipolygon|geometrycollection)\s*[zmm]?\s*\(/.test(body)) return 'wkt';
        return null;
    },

    // Entry point duy nhất mà tầng ứng dụng nên gọi
    read(text, fileName) {
        const clean = this.stripBom(text);
        const format = this.detectFormat(fileName, clean);
        if (!format) {
            return { ok: false, format: null, error: 'KHONG_NHAN_DANG_DUOC_DINH_DANG', features: [], counts: emptyCounts() };
        }
        if (format === 'kmz') {
            // KMZ là KML đóng gói ZIP: cần thư viện giải nén, nằm ngoài phạm vi module thuần JS này
            return { ok: false, format, error: 'KMZ_CAN_CONVERT_SANG_KML', features: [], counts: emptyCounts() };
        }
        if (!clean.trim()) {
            return { ok: false, format, error: 'FILE_RONG', features: [], counts: emptyCounts() };
        }
        try {
            const reader = { geojson: 'parseGeoJson', kml: 'parseKml', gpx: 'parseGpx', wkt: 'parseWkt' }[format];
            const features = this[reader](clean) || [];
            const counts = emptyCounts();
            features.forEach(f => {
                if (f.kind === 'point') counts.points += ringPointCount(f.rings);
                else if (f.kind === 'line') { counts.lines++; counts.vertices += ringPointCount(f.rings); }
                else { counts.polygons++; counts.vertices += ringPointCount(f.rings); }
            });
            return { ok: features.length > 0, format, error: features.length ? null : 'KHONG_TIM_THAY_HINH_HOC', features, counts };
        } catch (err) {
            return { ok: false, format, error: String(err && err.message || err), features: [], counts: emptyCounts() };
        }
    },

    // ============================== 1. GEOJSON ==============================
    parseGeoJson(text) {
        const data = JSON.parse(text);
        const features = [];
        const root = Array.isArray(data) ? { type: 'FeatureCollection', features: data } : data;

        const pushGeometry = (geom, props, inheritedName) => {
            if (!geom || typeof geom !== 'object') return;
            const g = geom.geometry && geom.type === 'Feature' ? geom.geometry : geom;
            const p = Object.assign({}, props || {}, geom.properties || {});
            if (g.type === 'GeometryCollection') {
                (g.geometries || []).forEach(sub => pushGeometry(sub, p, inheritedName));
                return;
            }
            const parsed = geometryToFeature(g, labelOf(p, inheritedName));
            (Array.isArray(parsed) ? parsed : [parsed]).forEach(f => {
                if (!f) return;
                f.note = f.note || noteOf(p);
                f.properties = p;
                features.push(f);
            });
        };

        switch (root.type) {
            case 'FeatureCollection':
                (root.features || []).forEach(f => pushGeometry(f, f && f.properties, root.name));
                break;
            case 'Feature':
                pushGeometry(root, root.properties, root.name);
                break;
            default:
                pushGeometry(root, {}, root.name);
        }
        return features;
    },

    // ================================ 2. KML ================================
    parseKml(text) {
        const body = String(text);
        const features = [];
        const placemarks = matchAll(body, /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi);
        const sources = placemarks.length ? placemarks.map(m => m[1]) : [body];

        sources.forEach(block => {
            const name = firstTagText(block, 'name') || 'Placemark';
            const note = stripTags(firstTagText(block, 'description') || '');
            parseKmlGeometries(block, name, note, features);
        });
        return features;
    },

    // ================================ 3. GPX ================================
    parseGpx(text) {
        const body = String(text);
        const features = [];

        gpxPoints(body, 'wpt').forEach(({ attrs, inner }) => {
            if (!isNum(attrs.lat) || !isNum(attrs.lon)) return;
            const ele = parseFloat(firstTagText(inner, 'ele'));
            features.push(pointFeature(isFinite(ele) ? ele : 0, attrs.lon, attrs.lat,
                firstTagText(inner, 'name') || 'WPT', stripTags(firstTagText(inner, 'desc') || '')));
        });

        const sequence = (tagName, pointTag, fallbackLabel) => {
            matchAll(body, new RegExp('<' + tagName + '\\b[^>]*>([\\s\\S]*?)</' + tagName + '>', 'gi')).forEach(m => {
                const block = m[1] || '';
                const name = firstTagText(block, 'name') || fallbackLabel;
                const pts = [];
                gpxPoints(block, pointTag).forEach(({ attrs, inner }) => {
                    if (!isNum(attrs.lat) || !isNum(attrs.lon)) return;
                    const ele = parseFloat(firstTagText(inner, 'ele'));
                    pts.push(pos(attrs.lon, attrs.lat, isFinite(ele) ? ele : 0));
                });
                if (pts.length >= 2) {
                    features.push({ kind: 'line', name, note: '', crs: 'wgs84', rings: [pts] });
                }
            });
        };
        sequence('trk', 'trkpt', 'Track');
        sequence('rte', 'rtept', 'Route');
        return features;
    },

    // ================================ 4. WKT ================================
    parseWkt(text) {
        const features = [];
        // Tách từng dòng geometry (WKT thường là 1 đối tượng/dòng); dòng # hoặc ; là chú thích
        String(text).split('\n').forEach(rawLine => {
            const line = rawLine.trim();
            if (!line || line.startsWith('#') || line.startsWith('//')) return;
            const cursor = { s: line.replace(/^\s*SRID=\d+\s*;\s*/i, ''), i: 0 };
            try {
                const geom = readWktGeometry(cursor);
                if (geom) {
                    const nameMatch = /(?:^|\s)(?:NAME|TEN)\s*=\s*"?([^"\n,]+)"?/i.exec(line);
                    (flattenWkt(geom, nameMatch ? nameMatch[1].trim() : 'WKT')).forEach(f => features.push(f));
                }
            } catch (e) { /* bỏ qua dòng không hợp lệ, tầng ứng dụng sẽ báo tổng số */ }
        });
        return features;
    },

    // ============================== VIET (OUTPUT) ==============================
    toWktText(features, options = {}) {
        const precision = Number.isFinite(options.precision) ? options.precision : 3;
        const order = options.order === 'NE' ? 'NE' : 'EN';
        return (features || []).map(f => {
            const head = f.name ? '# ' + String(f.name).replace(/[#\r\n]/g, ' ').trim() + '\n' : '';
            return head + geometryToWkt(f, precision, order);
        }).join('\n') + '\n';
    },

    toGpxText(features, options = {}) {
        const creator = escapeXml(options.creator || 'VN2000-PWA');
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="' + creator + '" xmlns="http://www.topografix.com/GPX/1/1">\n';
        (features || []).forEach(f => {
            if (f.kind === 'point') {
                flatRings(f).forEach(p => {
                    gpx += `  <wpt lat="${p.lat}" lon="${p.lng}">\n`;
                    if (p.h) gpx += `    <ele>${p.h}</ele>\n`;
                    gpx += `    <name>${escapeXml(f.name || '')}</name>\n`;
                    if (f.note) gpx += `    <desc>${escapeXml(f.note)}</desc>\n`;
                    gpx += '  </wpt>\n';
                });
            } else {
                gpx += `  <trk>\n    <name>${escapeXml(f.name || '')}</name>\n    <trkseg>\n`;
                flatRings(f).forEach(p => {
                    gpx += `      <trkpt lat="${p.lat}" lon="${p.lng}">\n`;
                    if (p.h) gpx += `        <ele>${p.h}</ele>\n`;
                    gpx += '      </trkpt>\n';
                });
                gpx += '    </trkseg>\n  </trk>\n';
            }
        });
        gpx += '</gpx>\n';
        return gpx;
    },

    toGeoJsonText(features, options = {}) {
        const out = {
            type: 'FeatureCollection',
            name: options.name || 'VN2000-PWA',
            crs: options.crs === 'projected'
                ? { type: 'name', properties: { name: options.crsUrn || 'urn:ogc:def:crs:EPSG::VN2000' } }
                : { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
            features: []
        };
        (features || []).forEach(f => {
            if (f.kind === 'point') {
                flatRings(f).forEach(p => out.features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [p.lng, p.lat, p.h || 0] },
                    properties: Object.assign({ name: f.name || '' }, f.properties || {})
                }));
                return;
            }
            const ringCoords = (f.rings || []).map(ring => {
                const pts = ring.map(p => [p.lng, p.lat, p.h || 0]);
                if (f.kind === 'polygon' && pts.length && !sameXY(pts[0], pts[pts.length - 1])) pts.push(pts[0].slice());
                return pts;
            });
            out.features.push({
                type: 'Feature',
                geometry: f.kind === 'polygon'
                    ? { type: 'Polygon', coordinates: ringCoords }
                    : (ringCoords.length === 1
                        ? { type: 'LineString', coordinates: ringCoords[0] }
                        : { type: 'MultiLineString', coordinates: ringCoords }),
                properties: Object.assign({ name: f.name || '' }, f.properties || {})
            });
        });
        return JSON.stringify(out, null, 2);
    }
};

// ============================== HIEN THUC BEN TRONG ==============================
function emptyCounts() { return { points: 0, lines: 0, polygons: 0, vertices: 0 }; }
function ringPointCount(rings) { return (rings || []).reduce((s, r) => s + ((r || []).length), 0); }
function flatRings(f) { return (f && f.rings || []).reduce((all, r) => all.concat(r || []), []); }
function isNum(v) { return v !== undefined && v !== null && v !== '' && isFinite(parseFloat(v)); }
function sameXY(a, b) { return a[0] === b[0] && a[1] === b[1]; }
function pos(lng, lat, h) { return { lng: Number(lng), lat: Number(lat), h: Number.isFinite(h) ? h : 0 }; }
function pointFeature(h, lng, lat, name, note) {
    return { kind: 'point', name: name || 'Point', note: note || '', crs: 'wgs84', rings: [[pos(lng, lat, h)]] };
}
function escapeXml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function stripTags(s) { return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function firstTagText(block, tag) {
    const m = new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>', 'i').exec(String(block || ''));
    return m ? m[1].trim() : '';
}
function matchAll(str, re) {
    const out = [];
    let m;
    const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    while ((m = rx.exec(str)) !== null) {
        out.push(m);
        if (m.index === rx.lastIndex) rx.lastIndex++;
    }
    return out;
}
function parseAttrs(attrString) {
    const attrs = {};
    matchAll(String(attrString || ''), /([\w:-]+)\s*=\s*"([^"]*)"/g).forEach(m => { attrs[m[1]] = m[2]; });
    return attrs;
}

// GPX viet diem dang tu dong `<trkpt lat=".." lon=".."/>` hoac co the `<wpt ...> ... </wpt>`
function gpxPoints(block, tag) {
    return matchAll(String(block || ''),
        new RegExp('<' + tag + '\\b([^>]*?)(?:/>|>([\\s\\S]*?)</' + tag + '>)', 'gi'))
        .map(m => ({ attrs: parseAttrs(m[1]), inner: m[2] || '' }));
}
function labelOf(props, fallback) {
    const p = props || {};
    const keys = ['name', 'Name', 'NAME', 'TEN', 'ten', 'tên', 'TEN_MOC', 'point_name', 'id'];
    for (const k of keys) if (p[k] !== undefined && String(p[k]).trim()) return String(p[k]).trim();
    return (typeof fallback === 'string' && fallback.trim()) ? fallback.trim() : 'Feature';
}
function noteOf(props) {
    const p = props || {};
    const keys = ['note', 'Note', 'ghi_chu', 'GHI_CHU', 'description', 'Description', 'mo_ta'];
    for (const k of keys) if (p[k] !== undefined && String(p[k]).trim()) return stripTags(String(p[k]));
    return '';
}

// Mot GeoJSON geometry -> feature chuan hoa (Multi* duoc flat thanh nhieu feature)
function geometryToFeature(geom, name) {
    if (!geom || !geom.type) return null;
    const type = String(geom.type);
    const coords = geom.coordinates;
    const crs = crsFromGeometry(coords, type);

    const ringFrom = (list) => (list || [])
        .filter(c => Array.isArray(c) && isNum(c[0]) && isNum(c[1]))
        .map(c => pos(c[0], c[1], num(c[2])));
    const single = (kind, rings) => ({ kind, name: name || 'Feature', note: '', crs, rings });
    const mkPoint = (c, label) => {
        const p = pointFeature(num(c && c[2]), c && c[0], c && c[1], label, '');
        p.crs = crs;
        return p;
    };

    switch (type) {
        case 'Point':
            return Array.isArray(coords) ? mkPoint(coords, name) : null;
        case 'MultiPoint':
            return (coords || []).map((c, i) => mkPoint(c, (coords || []).length > 1 ? `${name} ${i + 1}` : name));
        case 'LineString':
            return single('line', [ringFrom(coords)]);
        case 'MultiLineString':
            return (coords || []).map((l, i) => Object.assign(single('line', [ringFrom(l)]), { name: `${name} ${i + 1}` }));
        case 'Polygon':
            return single('polygon', (coords || []).map(ringFrom));
        case 'MultiPolygon':
            return (coords || []).map((poly, i) => Object.assign(single('polygon', (poly || []).map(ringFrom)), { name: `${name} ${i + 1}` }));
        default:
            return null;
    }
}

function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

// Toa do |kinh/vi| <= 180/90 va khong phai so met lon -> du lieu dia ly WGS84
function crsFromGeometry(coords, type) {
    let sample = null;
    const walk = (c, depth) => {
        if (sample || !Array.isArray(c)) return;
        if (depth === 0) { if (isNum(c[0]) && isNum(c[1])) sample = c; return; }
        c.forEach(sub => walk(sub, depth - 1));
    };
    const depth = type === 'MultiPolygon' ? 3 : (type === 'Polygon' || type === 'MultiLineString' || type === 'MultiPoint') ? 2 : 1;
    if (type === 'Point') { if (Array.isArray(coords) && isNum(coords[0])) sample = coords; }
    else walk(coords, depth);
    if (!sample) return 'wgs84';
    const a = Math.abs(sample[0]), b = Math.abs(sample[1]);
    return (a <= 180 && b <= 90) ? 'wgs84' : 'projected';
}

// ---- KML geometry ----
function parseKmlGeometries(block, name, note, out) {
    const pushLine = (label, pts) => { if (pts.length >= 2) out.push({ kind: 'line', name: label, note, crs: 'wgs84', rings: [pts] }); };
    // Gỡ các khối MultiGeometry ra khỏi lượt quét này rồi mới đệ quy, tránh một hình học bị tính 2 lần
    const multi = matchAll(block, /<MultiGeometry\b[^>]*>([\s\S]*?)<\/MultiGeometry>/gi);
    const plain = multi.length ? block.replace(/<MultiGeometry\b[\s\S]*?<\/MultiGeometry>/gi, '') : block;

    matchAll(plain, /<Point\b[^>]*>([\s\S]*?)<\/Point>/gi).forEach(m => {
        const pts = decodeKmlCoords(firstTagText(m[1], 'coordinates'));
        pts.forEach(p => out.push(pointFeature(p.h, p.lng, p.lat, name, note)));
    });

    matchAll(plain, /<LineString\b[^>]*>([\s\S]*?)<\/LineString>/gi).forEach(m => {
        pushLine(name, decodeKmlCoords(firstTagText(m[1], 'coordinates')));
    });

    matchAll(plain, /<Polygon\b[^>]*>([\s\S]*?)<\/Polygon>/gi).forEach(m => {
        const rings = matchAll(m[1], /<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi)
            .map(c => decodeKmlCoords(c[1])).filter(r => r.length >= 3);
        if (rings.length) out.push({ kind: 'polygon', name, note, crs: 'wgs84', rings });
    });

    multi.forEach(m => parseKmlGeometries(m[1], name, note, out));
    return out;
}

// KML: cac tuple "lng,lat,alt" ngan nhau bang khong trang / xuong dong
function decodeKmlCoords(str) {
    return String(str || '').split(/\s+/).map(t => {
        const p = t.split(',');
        if (p.length < 2 || !isNum(p[0]) || !isNum(p[1])) return null;
        return pos(parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]));
    }).filter(Boolean);
}

// ---- WKT recursive descent ----
// Đọc lồng ngoặc bất kỳ cấp độ: "POINT (1 2)" -> [[1,2]], "POLYGON ((1 2, 3 4))" -> [[[1,2],[3,4]]]
function readWktGeometry(cur) {
    skipSpace(cur);
    const typeMatch = /^([A-Za-z]+)(?:\s+[ZzMm]{1,2})?\s*/.exec(cur.s.slice(cur.i));
    if (!typeMatch) return null;
    const type = typeMatch[1].toUpperCase();
    cur.i += typeMatch[0].length;
    skipSpace(cur);
    if (cur.s[cur.i] !== '(') return null;

    if (type === 'GEOMETRYCOLLECTION') {
        cur.i++;
        const geoms = [];
        while (cur.i < cur.s.length) {
            skipSpace(cur);
            if (cur.s[cur.i] === ')') { cur.i++; break; }
            const sub = readWktGeometry(cur);
            if (sub) geoms.push(sub);
            skipSpace(cur);
            if (cur.s[cur.i] === ',') cur.i++;
        }
        return { type: 'GeometryCollection', geometries: geoms };
    }

    const n = readWktNested(cur);

    switch (type) {
        case 'POINT': return { type: 'Point', coordinates: firstTuple(n) };
        case 'MULTIPOINT': return { type: 'MultiPoint', coordinates: n.map(p => firstTuple([p]) || p) };
        case 'LINESTRING': return { type: 'LineString', coordinates: n };
        case 'MULTILINESTRING': return { type: 'MultiLineString', coordinates: n };
        case 'POLYGON': return { type: 'Polygon', coordinates: n };
        case 'MULTIPOLYGON': return { type: 'MultiPolygon', coordinates: n };
        default: return null;
    }
}

// Mot tuple toa do: 2-3 số liên tiếp (chấp nhận cả dấu phẩy thập phân kiểu châu Âu)
const WKT_NUM = '-?\\d+(?:[.,]\\d+)?(?:[eE][-+]?\\d+)?';
const WKT_TUPLE_RE = new RegExp('^(' + WKT_NUM + ')(?:\\s+(' + WKT_NUM + '))?(?:\\s+(' + WKT_NUM + '))?');

function readWktTuple(cur) {
    skipSpace(cur);
    const m = WKT_TUPLE_RE.exec(cur.s.slice(cur.i));
    if (!m) return null;
    cur.i += m[0].length;
    return [num(m[1]), num(m[2]), num(m[3])];
}

function firstTuple(arr) {
    if (!Array.isArray(arr) || !arr.length) return null;
    const first = arr[0];
    return Array.isArray(first) && Array.isArray(first[0]) ? firstTuple(first) : first;
}

function readWktNested(cur) {
    skipSpace(cur);
    if (cur.s[cur.i] !== '(') {
        const t = readWktTuple(cur);
        return t ? [t] : [];
    }
    cur.i++;
    const out = [];
    while (cur.i < cur.s.length) {
        skipSpace(cur);
        if (cur.s[cur.i] === ')') { cur.i++; break; }
        if (cur.s[cur.i] === '(') {
            out.push(readWktNested(cur));
        } else {
            const t = readWktTuple(cur);
            if (t) out.push(t); else cur.i++;
        }
        skipSpace(cur);
        if (cur.s[cur.i] === ',') cur.i++;
    }
    return out;
}

function skipSpace(cur) {
    while (cur.i < cur.s.length && /\s/.test(cur.s[cur.i])) cur.i++;
}

// WKT geometry -> feature chuan hoa (de tai su dung lai geometryToFeature cua GeoJSON)
function flattenWkt(geom, name) {
    const features = geometryToFeature(geom, name);
    return Array.isArray(features) ? features : (features ? [features] : []);
}

function geometryToWkt(f, precision, order) {
    const pt = (p) => {
        const a = order === 'NE' ? p.lat : p.lng;
        const b = order === 'NE' ? p.lng : p.lat;
        const c = [round(a, precision), round(b, precision)];
        if (p.h) c.push(round(p.h, precision));
        return c.join(' ');
    };
    const list = (ring) => (ring || []).map(pt).join(', ');
    if (f.kind === 'point') {
        const pts = flatRings(f);
        return pts.length > 1
            ? 'MULTIPOINT (' + pts.map(p => '(' + pt(p) + ')').join(', ') + ')'
            : 'POINT (' + (pt(pts[0] || pos(0, 0, 0))) + ')';
    }
    if (f.kind === 'polygon') {
        return 'POLYGON ((' + (f.rings || []).map(list).join('), (') + '))';
    }
    return (f.rings || []).length > 1
        ? 'MULTILINESTRING ((' + (f.rings || []).map(list).join('), (') + '))'
        : 'LINESTRING (' + list((f.rings || [[]])[0]) + ')';
}

function round(v, precision) { return Number((Number(v) || 0).toFixed(precision)); }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GisIO;
} else if (typeof window !== 'undefined') {
    window.GisIO = GisIO;
}
