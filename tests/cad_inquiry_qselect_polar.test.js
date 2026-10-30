/**
 * BỘ KIỂM THỬ: WP-C (CADCraft) — POLAR TRACKING F10 · INQUIRY (DIST/AREA/ID/LIST) · QSELECT
 *
 * Chạy THẬT các method cắt nguyên văn từ appCash app.js trong sandbox `new Function`
 * (cùng cơ chế với tests/point_styling_visibility.test.js, tests/gis_import_export_bridge.test.js):
 *  - azimuthDegOf / polarLockPoint / lockDraftPoint (Ortho F8 thắng Polar F10) / syncPolarGuides
 *  - togglePolarTracking + setPolarStep + save/loadPolarPrefs (key riêng, không lẫn dữ liệu vẽ)
 *  - inquiryDistance / inquiryChain (reuses calculateAreaAndPerimeter) / handleInquiryPick / pushInquiryLog
 *  - exportInquiryCsv / zoomToSelection / closeInquiryModal (dọn overlay)
 *  - qSelectMatches / collectQSelectCriteria / qSelectSummary / applyQSelect (replace|append|exclude)
 *  - refreshAreaTableIfOpen + đăng ký modal trong closeCadWindows (UI Isolation — AGENTS.md §2)
 *
 * Run: node tests/cad_inquiry_qselect_polar.test.js
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        console.error(`  ❌ FAIL: ${message}`);
    }
}

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styleCss = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

const cadStart = appJs.indexOf('const appCadTool = {');
if (cadStart < 0) throw new Error('Không tìm thấy appCadTool trong app.js');

function extractMethod(name, from = cadStart) {
    const start = appJs.indexOf('\n    ' + name + '(', from);
    if (start < 0) throw new Error('Không tìm thấy method: ' + name);
    let parenDepth = 0, parenClose = -1;
    for (let j = appJs.indexOf('(', start); j < appJs.length; j++) {
        if (appJs[j] === '(') parenDepth++;
        else if (appJs[j] === ')') { parenDepth--; if (parenDepth === 0) { parenClose = j; break; } }
    }
    const open = appJs.indexOf('{', parenClose);
    let depth = 0;
    for (let j = open; j < appJs.length; j++) {
        if (appJs[j] === '{') depth++;
        else if (appJs[j] === '}') { depth--; if (depth === 0) return appJs.slice(start + 1, j + 1); }
    }
    throw new Error('Ngoặc nhọn không cân bằng: ' + name);
}

// Lưới chiếu giả lập bậc nhất để số liệu kiểm chứng được bằng tay: X = lat*110000, Y = 500000 + (lng-KTT)*100000
const KTT = 105.5;
function convertWgsToVn2k(lat, lng) { return { X: lat * 110000, Y: 500000 + (lng - KTT) * 100000 }; }
function convertVn2kToWgs(x, y) { return { lat: x / 110000, lng: KTT + (y - 500000) / 100000 }; }

const APP_STATE = { kttVal: KTT, kttMin: 30, muiVal: 3, scaleFactor: 0.9999, currentProject: 'DuAn.csv', leafletMap: null };
const ESC = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mkDoc = (els) => ({ getElementById: id => (id in els ? els[id] : null) });
const input = (value, checked = false) => ({ value, checked, classList: { add() { }, remove() { }, contains: () => false }, scrollTop: 0, querySelector: () => null });
const el = (props = {}) => Object.assign({
    value: '', checked: false, innerText: '', innerHTML: '', scrollTop: 0, style: {}, options: [], disabled: false,
    classList: {
        _s: new Set(),
        add(...n) { n.forEach(x => this._s.add(x)); },
        remove(...n) { n.forEach(x => this._s.delete(x)); },
        contains(n) { return this._s.has(n); },
        toggle(n, force) {
            const on = force === undefined ? !this._s.has(n) : !!force;
            if (on) this._s.add(n); else this._s.delete(n);
            return on;
        }
    },
    querySelector: () => null
}, props);

/** Dựng object appCadTool chỉ chứa các method cần test + stub bổ sung. */
function cad(methods, stubs = '', env = {}) {
    const names = ['AppState', 'document', 'showToast', 'escapeHtml', 'L', 'localStorage',
        'convertWgsToVn2k', 'convertVn2kToWgs', 'calcGeoDistanceAndAzimuth', 'triggerHaptic'];
    const vals = Object.assign({
        AppState: APP_STATE, document: mkDoc({}), showToast: () => { }, escapeHtml: ESC,
        L: null, localStorage: null, convertWgsToVn2k, convertVn2kToWgs,
        calcGeoDistanceAndAzimuth: undefined, triggerHaptic: () => { }
    }, env);
    const src = methods.map(m => extractMethod(m)).join(',\n        ');
    return new Function(...names, `return ({ ${src}${stubs ? ',' + stubs : ''} });`)(...names.map(n => vals[n]));
}

// =====================================================================
// 1. POLAR TRACKING — góc phương vị & khóa tia
// =====================================================================
console.log('\n— 1. Polar Tracking: góc phương vị, khóa tia theo bội số góc —');
{
    const p = cad(['azimuthDegOf', 'polarLockPoint']);
    assert(p.azimuthDegOf(1, 0) === 0 && p.azimuthDegOf(0, 1) === 90,
        'Azimuth chuẩn trắc địa: 0° là Bắc (+X), 90° là Đông (+Y)');
    assert(p.azimuthDegOf(-1, 0) === 180 && p.azimuthDegOf(0, -1) === 270,
        'Azimuth Nam 180° và Tây 270° (không trả số âm)');

    assert(p.polarLockPoint(null, { x: 1, y: 1 }) === null && p.polarLockPoint({ x: 0, y: 0 }, null) === null,
        'polarLockPoint trả null khi chưa có đỉnh gốc hoặc con trỏ');
    assert(p.polarLockPoint({ x: 0, y: 0 }, { x: 0, y: 0 }) === null,
        'polarLockPoint bỏ qua khi khoảng cách ~0 (không chia 0)');
    assert(p.polarLockPoint({ x: 0, y: 0 }, { x: 100, y: 6 }, 90, 3) === null,
        'Lệch 3.44° ngoài dung sai 3° → chưa bắt tia, người dùng vẽ tự do');

    const lock90 = p.polarLockPoint({ x: 0, y: 0 }, { x: 100, y: 5 }, 90, 3);
    // lệch atan2(5,100)=2.86° < 3° → bám tia Đông, giữ nguyên khoảng cách chéo
    assert(lock90 && lock90.angleDeg === 0, 'Bám tia 0° (Bắc) khi con trỏ lệch 2.86° trong dung sai');
    const east = p.polarLockPoint({ x: 0, y: 0 }, { x: 5, y: 100 }, 90, 3);
    assert(east && east.angleDeg === 90 && Math.abs(east.x - 0) < 1e-6 && east.y > 99,
        'Bám tia 90° (Đông): X bị kéo về 0, Y ≈ 100 (giữ cự ly chéo)');
    const diag = p.polarLockPoint({ x: 0, y: 0 }, { x: 70, y: 72 }, 45, 3);
    assert(diag && diag.angleDeg === 45, 'Với bước 45° bám tia 45° thay vì 90°');
    const edge = p.polarLockPoint({ x: 0, y: 0 }, { x: 100, y: 5.236 }, 90, 3);
    assert(edge && edge.deviation <= 3.001, 'Dung sai tính tại mép (≤3°) vẫn khóa — giống AutoCAD');
    assert(p.polarLockPoint({ x: 0, y: 0 }, { x: 100, y: 5 }, 0, 3) === null,
        'Bước góc 0 bị loại (phòng chia 0 khi cấu hình sai)');
}

// =====================================================================
// 2. lockDraftPoint — Ortho F8 thắng Polar F10, một chỗ duy nhất
// =====================================================================
console.log('\n— 2. lockDraftPoint: Ortho ưu tiên trước Polar, điểm xem trước = điểm thật —');
{
    const last = { lat: 21.0, lng: 106.05, x: 2310000, y: 555000, id: 'D1' };
    const ctx = (ortho, polar) => ({
        vertices: [last], orthoMode: ortho, polarTracking: polar, polarStepDeg: 90, polarTolDeg: 3,
        azimuthDegOf: (dx, dy) => (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360,
        polarLockPoint(l, c, step = 90, tol = 3) {
            const dx = c.x - l.x, dy = c.y - l.y, dist = Math.hypot(dx, dy);
            if (!(dist > 1e-6)) return null;
            const az = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
            const target = (Math.round(az / step) * step) % 360;
            let diff = Math.abs(az - target); if (diff > 180) diff = 360 - diff;
            if (diff > tol) return null;
            return { x: l.x + dist * Math.cos(target * Math.PI / 180), y: l.y + dist * Math.sin(target * Math.PI / 180), angleDeg: target, distance: dist };
        }
    });
    const api = cad(['lockDraftPoint']);

    const plain = api.lockDraftPoint.call({ vertices: [], orthoMode: false, polarTracking: true }, 21.001, 106.051);
    assert(plain.locked === false && plain.mode === null,
        'Chưa có đỉnh nào → không khóa hướng (điểm đầu tiên luôn tự do)');

    const off = api.lockDraftPoint.call(ctx(false, false), 21.0001, 106.0509);
    assert(off.locked === false, 'Tắt cả F8 lẫn F10 → giữ đúng điểm người dùng chạm');

    // Ortho: dx=|2310110-2310000|=110 < dy=|558000-555000|=3000 → khóa theo trục Bắc (X về đỉnh cũ)
    const ortho = api.lockDraftPoint.call(ctx(true, true), 21.001, 106.08);
    assert(ortho.locked && ortho.mode === 'ortho' && Math.abs(ortho.lat - 21.0) < 1e-9,
        'Ortho (F8) thắng Polar (F10) khi bật cả hai — đúng thứ tự AutoCAD');

    // Polar: con trỏ ở az ≈ 91.5° so với đỉnh cuối (100 m), dung sai 3° → bám tia 90°
    const az = 91.5 * Math.PI / 180, dist = 100;
    const px = 2310000 + dist * Math.cos(az), py = 555000 + dist * Math.sin(az);
    const latIn = px / 110000, lngIn = KTT + (py - 500000) / 100000;
    const polar = api.lockDraftPoint.call(ctx(false, true), latIn, lngIn);
    assert(polar.locked && polar.mode === 'polar' && polar.angleDeg === 90,
        'Polar bám tia 90° từ đỉnh cuối khi con trỏ lệch 1.5°');
    const back = convertVn2kToWgs(2310000, 555100);
    assert(Math.abs(polar.lat - back.lat) < 1e-9 && Math.abs(polar.lng - back.lng) < 1e-9,
        'Điểm khóa được chiếu ngược WGS84 đúng giá (X=2310000 Y=555100)');

    const far = api.lockDraftPoint.call(ctx(false, true), 21.0002, 106.0509);
    assert(far.locked === false, 'Con trỏ xa mọi tia bội số → không khóa, vẽ tự do');
}

// =====================================================================
// 3. syncPolarGuides — chống vẽ lại mỗi frame + toggle/bước góc
// =====================================================================
console.log('\n— 3. syncPolarGuides chống churn + togglePolarTracking/setPolarStep —');
{
    const last = { lat: 21.0, lng: 106.05, x: 2310000, y: 555000, id: 'D1' };
    let rendered = 0, cleared = 0;
    const ctx = {
        polarTracking: true, orthoMode: false, polarStepDeg: 90, _polarGuideKey: null,
        layers: { polarGroup: { getLayers: () => (cleared ? [] : [1]), clearLayers() { cleared++; } } },
        clearPolarGuides() { cleared++; },
        renderPolarGuides() { rendered++; }
    };
    const api = cad(['syncPolarGuides']);
    const lock = { angleDeg: 90, distance: 100 };
    api.syncPolarGuides.call(ctx, last, lock);
    api.syncPolarGuides.call(ctx, last, lock);
    assert(rendered === 1, 'Cùng đỉnh + cùng tia + cùng tầm → chỉ vẽ 1 lần (không churn mỗi frame)');
    api.syncPolarGuides.call(ctx, last, { angleDeg: 0, distance: 100 });
    assert(rendered === 2, 'Đổi tia đang khóa (90° → 0°) → vẽ lại');
    api.syncPolarGuides.call(ctx, { ...last, id: 'D2' }, { angleDeg: 0, distance: 130 });
    assert(rendered === 3, 'Đổi đỉnh gốc hoặc tầm xa (làm tròn 5 m) → vẽ lại');
    ctx.polarTracking = false;
    api.syncPolarGuides.call(ctx, last, null);
    assert(cleared > 0, 'Tắt F10 → dọn hết tia dóng trên bản đồ');
}

{
    const store = {};
    const localStorage = {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); }
    };
    const els = {
        btnCadPolarTrack: el(), btnCadRibbonPolar: el(), cadPolarStepSelect: el({ value: '90', disabled: true })
    };
    const api = cad(['togglePolarTracking', 'syncPolarControls', 'setPolarStep', 'savePolarPrefs', 'loadPolarPrefs'], '', {
        document: mkDoc(els), localStorage
    });
    const ctx = { polarTracking: false, polarStepDeg: 90, orthoMode: false, POLAR_PREF_KEY: 'vn2k_cad_polar_v1', cleared: 0 };
    ctx.savePolarPrefs = () => api.savePolarPrefs.call(ctx);
    ctx.syncPolarControls = () => api.syncPolarControls.call(ctx);
    ctx.clearPolarGuides = () => { ctx.cleared++; };
    api.togglePolarTracking.call(ctx);
    assert(ctx.polarTracking === true, 'Phím F10 / nút 🧭 bật Dóng góc');
    assert(els.btnCadPolarTrack.classList.contains('active') && els.btnCadRibbonPolar.classList.contains('active'),
        'Cả nút trong panel lẫn ribbon đều sáng trạng thái active');
    assert(/"on":true,"step":90/.test(store['vn2k_cad_polar_v1']),
        'Tùy tính dóng góc lưu key riêng vn2k_cad_polar_v1 (không lẫn dữ liệu bản vẽ)');
    api.togglePolarTracking.call(ctx);
    assert(ctx.polarTracking === false && ctx.cleared === 1,
        'F10 lần thứ hai tắt Dóng góc và dọn tia dóng ngay');
    assert(els.cadPolarStepSelect.disabled === true, 'Dropdown bước góc chỉ sáng khi bật dóng góc (đang tắt)');

    ctx.polarTracking = true;
    api.syncPolarControls.call(ctx);
    assert(els.cadPolarStepSelect.disabled === false, 'Bật F10 → chọn được bước góc 90/45/30°');
    ctx.orthoMode = true;
    api.syncPolarControls.call(ctx);
    assert(els.cadPolarStepSelect.disabled === true,
        'Bật Ortho F8 → vô hiệu bước góc vì F8 đã thắng, tránh người dùng tưởng đang dóng góc');
    ctx.orthoMode = false;

    api.setPolarStep.call(ctx, '45');
    assert(ctx.polarStepDeg === 45 && els.cadPolarStepSelect.value === '45', 'Chọn bước góc 45° từ dropdown');
    api.setPolarStep.call(ctx, '0');
    assert(ctx.polarStepDeg === 45, 'Bước góc 0/NaN bị từ chối (giữ giá trị hợp lệ trước đó)');
    api.setPolarStep.call(ctx, '999');
    assert(ctx.polarStepDeg === 45, 'Bước góc > 180° bị từ chối');
    ctx.polarStepDeg = 90;
    ctx.polarTracking = false;
    api.loadPolarPrefs.call(ctx);
    assert(ctx.polarTracking === true && ctx.polarStepDeg === 45,
        'loadPolarPrefs khôi phục đúng tùy tính đã lưu (restoreSession không làm mất settings)');
    const fresh = { polarTracking: false, polarStepDeg: 90, POLAR_PREF_KEY: 'vn2k_cad_polar_xua' };
    api.loadPolarPrefs.call(fresh);
    assert(fresh.polarTracking === false && fresh.polarStepDeg === 90, 'Chưa từng lưu → giữ mặc định 90°, tắt F10');
}

// =====================================================================
// 4. INQUIRY — dmsText, khoảng cách, chuỗi đỉnh
// =====================================================================
console.log('\n— 4. Inquiry: định dạng DMS, DIST trên lưới VN-2000, AREA dùng lại hàm khối —');
{
    const api = cad(['azimuthDegOf', 'dmsText', 'inquiryDistance', 'inquiryChain', 'inquiryPointFromLatLng']);
    assert(api.dmsText(45.5) === `45°30'00"`, 'dmsText đổi 45.5° → 45°30\'00"');
    assert(api.dmsText(10.999997) === `11°00'00"`, 'dmsText làm tròn đúng và không sinh 60" / 60\'');
    assert(api.dmsText(NaN) === '--', 'dmsText trả "--" khi dữ liệu hỏng');

    const p = api.inquiryPointFromLatLng(21.0, 106.05, 12.5, 'M1');
    assert(p.x === 2310000 && p.y === 555000 && p.h === 12.5 && p.name === 'M1',
        'inquiryPointFromLatLng chiếu WGS84 → VN-2000 và giữ cao độ/tên điểm');

    const a = { lat: 21.0, lng: 106.05, x: 0, y: 0, h: 0, name: 'A' };
    const b = { lat: 21.0, lng: 106.05, x: 30, y: 40, h: 12, name: 'B' };
    const d = api.inquiryDistance(a, b);
    assert(Math.abs(d.dPlan - 50) < 1e-9, 'ΔX=30 ΔY=40 → cự ly lưới 50 m (định lý Pythagore)');
    assert(Math.abs(d.dSlope - Math.hypot(50, 12)) < 1e-9 && d.dz === 12,
        'Có ΔH → tự tính cự ly nghiêng 3D');
    assert(Math.abs(d.azimuth - (Math.atan2(40, 30) * 180 / Math.PI)) < 1e-9 && /°/.test(d.azFormatted),
        'Góc phương vị theo trục Bắc–Đông và định dạng DMS');
    assert(d.wgs === null, 'Không có calcGeoDistanceAndAzimuth → bỏ kiểm chứng địa tĩnh (không ném lỗi)');

    const geoApi = cad(['azimuthDegOf', 'dmsText', 'inquiryDistance'], '', {
        calcGeoDistanceAndAzimuth: () => ({ distance: 50.12, azimuth: 53.1301 })
    });
    const dg = geoApi.inquiryDistance(a, b);
    assert(dg.wgs && Math.abs(dg.wgs.distance - 50.12) < 1e-9 && /°/.test(dg.wgs.azFormatted),
        'Có hàm cầu → kèm cự ly địa tĩnh WGS84 để đối chiếu độ dài cạnh thực tế');

    const chainPts = [
        { x: 0, y: 0, lat: 21, lng: 106.05 }, { x: 10, y: 0, lat: 21, lng: 106.05 },
        { x: 10, y: 10, lat: 21, lng: 106.05 }, { x: 0, y: 10, lat: 21, lng: 106.05 }
    ];
    let usedMode = null;
    const chainCtx = {
        calculateAreaAndPerimeter(pts, mode) {
            usedMode = mode;
            return { area: 100, areaFormatted: '100.00', ha: 0.01, haFormatted: '0.0100', perimeter: 40, perimeterFormatted: '40.00', edges: [{ lengthFormatted: '10.00', azFormatted: `0°00'00"`, from: 'Đ1', to: 'Đ2' }] };
        },
        dmsText: api.dmsText
    };
    const ch = api.inquiryChain.call(chainCtx, chainPts);
    assert(ch.count === 4 && Math.abs(ch.openLength - 30) < 1e-9,
        'inquiryChain: chuỗi hở 4 đỉnh = 30 m (không cộng cạnh khép về đỉnh đầu)');
    assert(usedMode === 'polygon' && ch.stats.area === 100,
        'Diện tích truy vấn dùng lại calculateAreaAndPerimeter(mode="polygon") — một chuẩn duy nhất');
    assert(api.inquiryChain.call(chainCtx, []).count === 0, 'Chuỗi rỗng không làm sập phép tính');
}

// =====================================================================
// 5. INQUIRY — bảng dòng kết quả
// =====================================================================
console.log('\n— 5. Inquiry: các dòng kết quả DIST/AREA/ID/LIST —');
{
    const api = cad(['dmsText', 'inquiryDistanceRows', 'inquiryChainRows', 'inquiryPointRows', 'inquiryShapeRows', 'shapeKindLabel']);
    const a = { x: 0, y: 0, lat: 21, lng: 106.05, h: 0, name: 'M1' };
    const b = { x: 30, y: 40, lat: 21, lng: 106.05, h: 0, name: 'M2' };
    const rows = api.inquiryDistanceRows(a, b, { dx: 30, dy: 40, dz: 0, dPlan: 50, dSlope: 50, azimuth: 53.13, azFormatted: `53°07'48"` });
    const labels = rows.map(r => r.label).join('|');
    assert(/Cự ly lưới VN-2000/.test(labels) && /ΔX \(Bắc\)/.test(labels) && /Góc phương vị Az/.test(labels),
        'DIST hiển thị ΔX/ΔY, cự ly lưới VN-2000 và azimuth');
    assert(!rows.some(r => /WGS84/.test(r.label)), 'Không có số liệu WGS84 thì không hiển thị dòng WGS84');
    const withWgs = api.inquiryDistanceRows(a, b, { dx: 30, dy: 40, dz: 0, dPlan: 50, dSlope: 50, azimuth: 53.13, azFormatted: 'x', wgs: { distance: 50.2, azFormatted: 'y' } });
    assert(withWgs.some(r => /WGS84/.test(r.label)), 'Có kiểm chứng địa tĩnh → thêm dòng so sánh WGS84');
    const withH = api.inquiryDistanceRows({ ...a, h: 3 }, { ...b, h: 9 }, { dx: 0, dy: 0, dz: 6, dPlan: 0, dSlope: 6, azimuth: 0, azFormatted: 'x' });
    assert(withH.some(r => r.label === 'Chênh cao ΔH') && withH.some(r => r.label === 'Cự ly nghiêng 3D'),
        'Chênh cao ≠ 0 → hiện ΔH và cự ly nghiêng 3D');

    const chain = api.inquiryChainRows({ count: 3, openLength: 25.5, stats: { areaFormatted: '100.00', haFormatted: '0.0100', perimeterFormatted: '40.00' }, edges: [{ lengthFormatted: '10.00', azFormatted: '0°', from: 'Đ1', to: 'Đ2' }] });
    assert(chain.some(r => /Diện tích khép kín/.test(r.label)) && chain.some(r => /^Cạnh 1/.test(r.label)),
        'AREA Liệt kê từng cạnh + tổng diện tích/chu vi');

    const ptRows = api.inquiryPointRows.call({ }, { name: 'M1', x: 2310000, y: 555000, lat: 21, lng: 106.05, h: 0 });
    const ptLabels = ptRows.map(r => r.label).join('|');
    assert(/X \(Bắc\)/.test(ptLabels) && /Y \(Đông\)/.test(ptLabels) && /Vĩ độ B/.test(ptLabels) && /Kinh độ L/.test(ptLabels),
        'ID tra cả tọa độ vuông góc VN-2000 lẫn B/L WGS84');
    assert(!ptRows.some(r => /Cao độ/.test(r.label)), 'ID ẩn dòng cao độ khi điểm không có H');
    assert(ptRows.some(r => /Kinh tuyến trục/.test(r.label) && /105.5/.test(r.value)),
        'ID ghi rõ KTT/múi chiếu đang dùng (kTTVal từ AppState)');

    assert(api.shapeKindLabel({ mode: 'point' }) === 'Lớp điểm rời' && api.shapeKindLabel({ mode: 'polyline' }) === 'Tuyến hở' && api.shapeKindLabel({ mode: 'polygon' }) === 'Khối đa giác',
        'shapeKindLabel phân loại đúng 3 kiểu đối tượng');

    const shapeCtx = {
        shapeKindLabel: api.shapeKindLabel,
        getEffectiveStats: () => ({ area: 250, areaFormatted: '250.00', haFormatted: '0.0250', perimeter: 64, perimeterFormatted: '64.00' }),
        getLayerById: id => ({ id, name: 'Ranh thửa', color: '#38bdf8' })
    };
    const sRows = api.inquiryShapeRows.call(shapeCtx, {
        name: 'Thửa 17', mode: 'polygon', layer: 'RANH_THUA',
        vertices: [{ name: 'Đ1', x: 1, y: 2 }, { name: 'Đ2', x: 3, y: 4 }]
    });
    const sText = sRows.map(r => `${r.label}=${r.value}`).join(' | ');
    assert(/Loại=Khối đa giác/.test(sText) && /Số đỉnh=2/.test(sText), 'LIST hiển thị loại + số đỉnh');
    assert(/Lớp CAD=RANH_THUA — Ranh thửa/.test(sText), 'LIST hiển thị lớp CAD kèm tên lớp');
    assert(/Đỉnh đầu=Đ1/.test(sText) && /Đỉnh cuối=Đ2/.test(sText), 'LIST hiển thị đỉnh đầu/cuối');
}

// =====================================================================
// 6. INQUIRY — luồng chạm bản đồ (handleInquiryPick)
// =====================================================================
console.log('\n— 6. Inquiry: DIST 2 điểm / AREA chuỗi / ID / LIST chọn đối tượng —');
{
    const mkInq = () => ({ mode: 'dist', pts: [], log: [], lastResult: null, shapeIdx: null });
    const base = (over = {}) => Object.assign({
        inquiry: mkInq(), toolAction: 'inquiry', snapEnabled: false, savedShapes: [],
        toasts: [], statuses: [], graphicsDrawn: 0,
        inquiryPointFromLatLng: (lat, lng, h = 0, name = '') => ({ lat, lng, x: lat * 110000, y: 500000 + (lng - KTT) * 100000, h, name }),
        inquiryDistance: (a, b) => ({ dx: b.x - a.x, dy: b.y - a.y, dz: 0, dPlan: Math.hypot(b.x - a.x, b.y - a.y), dSlope: 0, azimuth: 0, azFormatted: 'x' }),
        inquiryChain: (pts) => ({ count: pts.length, openLength: pts.length * 10, stats: { area: 100, areaFormatted: '100', haFormatted: '0.01', perimeter: 40, perimeterFormatted: '40' }, edges: [] }),
        inquiryDistanceRows: (a, b, d) => [{ label: 'Cự ly', value: d.dPlan.toFixed(3) }],
        inquiryChainRows: (c) => [{ label: 'Đỉnh', value: String(c.count) }],
        inquiryPointRows: (p) => [{ label: 'X', value: String(p.x) }],
        inquiryShapeRows: () => [{ label: 'Tên', value: 'x' }],
        findSnapCandidate: () => null,
        findShapeAtLatLng: () => null,
        updateInquiryStatus(t) { this.statuses.push(t); },
        renderInquiryResult() { }, pushInquiryLog(r, live) { this.pushes.push({ kind: r.kind, live }); },
        renderInquiryGraphics() { this.graphicsDrawn++; },
        pushes: []
    }, over);

    const api = cad(['handleInquiryPick']);

    const c1 = base();
    api.handleInquiryPick.call(c1, 21.0, 106.05);
    assert(c1.inquiry.pts.length === 1 && c1.pushes.length === 0,
        'DIST mới chạm điểm 1: chờ điểm 2, chưa ghi nhật ký');
    assert(/Đã chọn điểm 1/.test(c1.statuses.join('|')), 'DIST báo đã nhận điểm 1 trên dòng trạng thái');
    api.handleInquiryPick.call(c1, 21.001, 106.05);
    assert(c1.inquiry.pts.length === 0 && c1.inquiry.lastResult.kind === 'dist' && c1.pushes.length === 1,
        'DIST điểm 2: trả kết quả rồi reset để đo cặp tiếp theo');
    assert(c1.toolAction === 'inquiry', 'Sau mỗi phép đo, công cụ trắc lượng vẫn bật để đo liên tục');

    const c2 = base({ inquiry: Object.assign(mkInq(), { mode: 'area' }) });
    api.handleInquiryPick.call(c2, 21.0, 106.05);
    api.handleInquiryPick.call(c2, 21.001, 106.05);
    api.handleInquiryPick.call(c2, 21.001, 106.06);
    assert(c2.inquiry.pts.length === 3 && c2.inquiry.lastResult.kind === 'area',
        'AREA gom dần từng đỉnh, kết quả cập nhật ngay khi có đủ 3 đỉnh');
    assert(c2.pushes.every(p => p.live === true) && c2.pushes.length === 3,
        'AREA ghi nhật ký dạng live (cập nhật tại chỗ, không bắn 20 dòng cho 20 đỉnh)');

    const c3 = base({ inquiry: Object.assign(mkInq(), { mode: 'point' }) });
    api.handleInquiryPick.call(c3, 21.0, 106.05);
    assert(c3.inquiry.lastResult.kind === 'point' && c3.inquiry.pts.length === 1,
        'ID: một chạm là ra tọa độ, không chờ điểm thứ hai');

    const shape = { id: 'S9', name: 'Thửa 88', mode: 'polygon', vertices: [] };
    const c4 = base({
        inquiry: Object.assign(mkInq(), { mode: 'shape' }), savedShapes: [{ id: 'S1' }, shape],
        findShapeAtLatLng: () => 1
    });
    api.handleInquiryPick.call(c4, 21.0, 106.05);
    assert(c4.inquiry.lastResult.kind === 'shape' && c4.inquiry.shapeIdx === 1,
        'LIST: chạm vào khối → tra đúng đối tượng và nhớ chỉ số để tô sáng');
    const c5 = base({ inquiry: Object.assign(mkInq(), { mode: 'shape' }) });
    api.handleInquiryPick.call(c5, 21.0, 106.05);
    assert(c5.inquiry.lastResult === null, 'LIST chạm vùng trống → không có kết quả, báo nhắc người dùng');

    const c6 = base({
        snapEnabled: true,
        findSnapCandidate: () => ({ isSnapped: true, lat: 21.0001, lng: 106.0502, x: 2310011, y: 555020, h: 7.5, name: 'Đ3' })
    });
    api.handleInquiryPick.call(c6, 21.0001234, 106.0502567);
    assert(c6.inquiry.pts[0].name === 'Đ3' && c6.inquiry.pts[0].h === 7.5,
        'Bật nam châm F3 → điểm truy vấn hít vào đỉnh khối thật (kèm tên + cao độ)');
}

// =====================================================================
// 7. INQUIRY — nhật ký, xuất CSV, đóng dọn dẹp
// =====================================================================
console.log('\n— 7. Inquiry: nhật ký 20 dòng, xuất CSV, ESC và đóng cửa sổ —');
{
    const api = cad(['pushInquiryLog', 'resetInquiryChain', 'closeInquiryModal', 'clearInquiryGraphics', 'exportInquiryCsv', 'dmsText']);
    const mk = () => ({ inquiry: { mode: 'dist', pts: [1], log: [], lastResult: { kind: 'dist' }, shapeIdx: 3 }, cleared: 0, toolAction: 'inquiry', clearInquiryGraphics() { this.cleared++; }, updateInquiryHint() { }, renderInquiryResult() { }, renderInquiryLog() { } });

    const c1 = mk();
    for (let i = 1; i <= 25; i++) {
        api.pushInquiryLog.call(c1, { kind: 'dist', title: `P${i}`, rows: [{ label: 'S', value: String(i) }] });
    }
    assert(c1.inquiry.log.length === 20 && c1.inquiry.log[0].title === 'P25',
        'Nhật ký chỉ giữ 20 phép đo gần nhất (đỡ phình bộ nhớ trên điện thoại)');
    assert(c1.inquiry.log[0].detail.includes('S\t25') && c1.inquiry.log[0].at,
        'Mỗi dòng nhật ký lưu đủ chi tiết + thời điểm');

    const live = mk();
    api.pushInquiryLog.call(live, { kind: 'area', title: 'Vùng 3 đỉnh', rows: [{ label: 'S', value: '300' }] }, true);
    api.pushInquiryLog.call(live, { kind: 'area', title: 'Vùng 4 đỉnh', rows: [{ label: 'S', value: '400' }] }, true);
    assert(live.inquiry.log.length === 1 && live.inquiry.log[0].title === 'Vùng 4 đỉnh',
        'Chuỗi AREA đang chấm cập nhật tại chỗ 1 dòng, không cộng dồn rác');

    const c2 = mk();
    c2.inquiry.log = [{ kind: 'dist' }];
    api.resetInquiryChain.call(c2);
    assert(c2.inquiry.pts.length === 0 && c2.inquiry.lastResult === null && c2.cleared === 1,
        'ESC/resetInquiryChain xóa chuỗi đỉnh và hình vẽ tạm nhưng không đổi chế độ đo');

    const modal = el({ classList: el().classList });
    const c3 = mk();
    const closer = cad(['closeInquiryModal', 'clearInquiryGraphics'], '', { document: mkDoc({ modalCadInquiry: modal }) });
    closer.closeInquiryModal.call(c3);
    assert(c3.toolAction === null && c3.inquiry.pts.length === 0 && c3.inquiry.shapeIdx === null && c3.cleared === 1,
        'Đóng cửa sổ trắc lượng → tắt chế độ đọc, dọn overlay (không để sót hình cyan trên bản đồ)');

    const dl = [];
    const exporter = cad(['exportInquiryCsv'], '', { AppState: APP_STATE });
    const expCtx = {
        inquiry: { log: [
            { kind: 'dist', title: 'M1 → M2', detail: 'ΔX\t30.000\nΔY\t40;000', at: '10:00' },
            { kind: 'area', title: 'Vùng 3', detail: 'S\t100.000', at: '10:01' }
        ] },
        _downloadText(text, name, mime) { dl.push({ text, name, mime }); }
    };
    exporter.exportInquiryCsv.call(expCtx);
    assert(dl.length === 1 && dl[0].name === 'DuAn_TracLuong.csv',
        'Nhật ký trắc lượng xuất ra <Dự án>_TracLuong.csv (tách file riêng, không lẫn sổ đo)');
    assert(dl[0].text.charCodeAt(0) === 0xFEFF && dl[0].text.split('\r\n')[0].includes(';'),
        'CSV mở được trong Excel Việt Nam: BOM UTF-8 + phân cách dấu chấm phẩy');
    assert(dl[0].text.includes('Nhóm;Đối tượng;Nội dung;Thời điểm'), 'CSV có dòng tiêu đề 5 cột');
    const semi = dl[0].text.split('\r\n').find(l => l.includes('M1 → M2'));
    assert(!/40;000/.test(semi) && semi.split(';').length === 5,
        'Dấu ; trong dữ liệu bị thay bằng , để không vỡ cột CSV');
    const empty = { inquiry: { log: [] }, warned: false, _downloadText() { this.warned = true; } };
    exporter.exportInquiryCsv.call(empty);
    assert(empty.warned === false, 'Chưa có phép đo → không sinh file rỗng');
}

// =====================================================================
// 8. ZOOM Sel — phóng vừa nhóm đang chọn
// =====================================================================
console.log('\n— 8. zoomToSelection (ZS): vừa khung đúng tập đang chọn —');
{
    const api = cad(['zoomToSelection']);
    let fitted = null;
    const bounds = { _l: [], isValid: () => true, extend(ll) { this._l.push(ll); } };
    const ctx = {
        savedShapes: [
            { selected: true, vertices: [{ lat: 21.0, lng: 106.0 }, { lat: 21.001, lng: 106.001 }] },
            { selected: false, vertices: [{ lat: 22.5, lng: 108.5 }] },
            { selected: true, vertices: [{ lat: 21.002, lng: 106.002, x: 1, y: 1 }, { lat: 21.003, lng: 106.003 }] }
        ],
        AppState: APP_STATE
    };
    const AppStateEnv = { ...APP_STATE, leafletMap: { fitBounds(b, o) { fitted = { b, o }; } } };
    const inMap = cad(['zoomToSelection'], '', { AppState: AppStateEnv, L: { latLngBounds: () => bounds } });
    inMap.zoomToSelection.call(ctx);
    assert(fitted && bounds._l.length === 4, 'ZS chỉ gom 4 đỉnh của 2 khối đang chọn (bỏ khối bị bỏ chọn)');
    assert(fitted.o.padding[0] === 48, 'ZS chừa padding 48 px để nhãn không sát mép khung');

    let toast = '';
    const noneCtx = { savedShapes: [{ selected: false, vertices: [{ lat: 21, lng: 106 }] }] };
    const none = cad(['zoomToSelection'], '', { AppState: AppStateEnv, L: { latLngBounds: () => bounds }, showToast: m => { toast = m; } });
    none.zoomToSelection.call(noneCtx);
    assert(/Không có đối tượng/.test(toast), 'Không có gì được chọn → ZS cảnh báo thay vì phóng sai');
}

// =====================================================================
// 9. QSELECT — bộ lọc thuần theo thuộc tính
// =====================================================================
console.log('\n— 9. QSELECT: bộ lọc loại / lớp / tên / diện tích / số đỉnh —');
{
    const shapes = [
        { id: 'A', name: 'Thửa 17', shortName: 'T17', mode: 'polygon', layer: 'RANH_THUA', selected: true, vertices: [{}, {}, {}, {}] },
        { id: 'B', name: 'Nhà ở 05', mode: 'rectangle', layer: 'MAT_CAT', selected: true, vertices: [{}, {}, {}, {}] },
        { id: 'C', name: 'Tuyến điện', mode: 'polyline', layer: 'GIAO_THONG', selected: false, vertices: [{}, {}, {}] },
        { id: 'D', name: 'Mốc R1', mode: 'point', layer: 'RANH_THUA', selected: true, vertices: [{}] }
    ];
    const api = cad(['qSelectKindOf', 'qSelectMatches']);
    const ctx = {
        qSelectKindOf: api.qSelectKindOf,
        getEffectiveStats: s => ({ area: s.id === 'A' ? 500 : s.id === 'B' ? 40 : s.id === 'C' ? 0 : 0 }),
        getShapeLayerId: s => s.layer,
        savedShapes: shapes, qSelect: { crit: null, matchedIds: [] }, layersTable: []
    };
    assert(api.qSelectKindOf({ mode: 'point' }) === 'point' && api.qSelectKindOf({ mode: 'polyline' }) === 'line' &&
        api.qSelectKindOf({ mode: 'polygon' }) === 'poly' && api.qSelectKindOf({ mode: 'rectangle' }) === 'poly',
        'QSELECT gom rectangle vào khối (poly), phân biệt tuyến hở và điểm rời');

    const only = crit => shapes.filter(s => api.qSelectMatches.call(ctx, s, crit));
    assert(only({ kind: 'all', layer: 'ALL' }).length === 4, 'Bộ lọc trống khớp mọi đối tượng');
    assert(only({ kind: 'poly', layer: 'ALL' }).map(s => s.id).join('') === 'AB', 'Loại "poly" gồm cả đa giác và chữ nhật');
    assert(only({ kind: 'line', layer: 'ALL' }).map(s => s.id).join('') === 'C', 'Loại "line" chỉ ra tuyến hở');
    assert(only({ kind: 'point', layer: 'ALL' }).map(s => s.id).join('') === 'D', 'Loại "point" chỉ ra điểm rời');
    assert(only({ kind: 'all', layer: 'RANH_THUA' }).map(s => s.id).join('') === 'AD', 'Lọc theo lớp CAD (getShapeLayerId)');
    assert(only({ kind: 'all', layer: 'ALL', name: 'thửa' }).map(s => s.id).join('') === 'A',
        'Tìm tên không phân biệt hoa/thường');
    assert(only({ kind: 'all', layer: 'ALL', name: 't17' }).map(s => s.id).join('') === 'A',
        'Khớp cả shortName (tên gọn trong bảng kê)');
    assert(only({ kind: 'all', layer: 'ALL', areaMin: 100 }).map(s => s.id).join('') === 'A',
        'S ≥ 100 m² loại các thửa nhỏ và tuyến/điểm (S = 0)');
    assert(only({ kind: 'all', layer: 'ALL', areaMax: 100 }).map(s => s.id).sort().join('') === 'BCD',
        'S ≤ 100 m² giữ đối tượng nhỏ (dùng để tìm thửa bé)');
    assert(only({ kind: 'all', layer: 'ALL', vMin: 3, vMax: 3 }).map(s => s.id).join('') === 'C',
        'Lọc theo số đỉnh = 3 (tìm riêng khối tam giác / tuyến 3 điểm)');
    assert(only({ kind: 'poly', layer: 'MAT_CAT', areaMax: 100 }).map(s => s.id).join('') === 'B',
        'Kết hợp nhiều điều kiện là quan hệ AND (như QSELECT AutoCAD)');
    assert(api.qSelectMatches.call(ctx, null, { kind: 'all' }) === false,
        'Bộ lọc null-safe: đối tượng rỗng không làm sập vòng lặp');

    const sumApi = cad(['qSelectSummary']);
    const sum = sumApi.qSelectSummary.call(ctx, shapes.filter(s => s.selected !== false));
    assert(sum.count === 3 && sum.area === 540 && sum.vertices === 9,
        'Tổng hợp QSELECT: số đối tượng khớp + Σ diện tích + Σ đỉnh');
    assert(sum.byLayer.RANH_THUA === 2 && sum.byLayer.MAT_CAT === 1, 'Tổng hợp đếm theo từng lớp để biết chọn ở đâu');
}

// =====================================================================
// 10. QSELECT — áp dụng lựa chọn (replace/append/exclude)
// =====================================================================
console.log('\n— 10. QSELECT: Thế / Cộng thêm / Loại bớt + bảng kê liên quan —');
{
    const build = () => {
        const shapes = [
            { id: 'A', name: 'Thửa 17', mode: 'polygon', layer: 'RANH_THUA', selected: false, vertices: [{}, {}, {}, {}] },
            { id: 'B', name: 'Nhà ở 05', mode: 'rectangle', layer: 'MAT_CAT', selected: true, vertices: [{}, {}, {}] },
            { id: 'C', name: 'Tuyến điện', mode: 'polyline', layer: 'GIAO_THONG', selected: true, vertices: [{}, {}] }
        ];
        const calls = [];
        const ctx = {
            savedShapes: shapes, qSelect: { crit: null, matchedIds: [] }, layersTable: [],
            getShapeLayerId: s => s.layer, getEffectiveStats: () => ({ area: 100, perimeter: 60 }),
            persistSession() { calls.push('persist'); },
            renderGeometry() { calls.push('render'); },
            renderBlocksPanel() { calls.push('panel'); },
            refreshAreaTableIfOpen() { calls.push('areaTable'); },
            renderQSelectSummary(hit) { calls.push('summary:' + hit.length); },
            collectQSelectCriteria: () => ({ kind: 'poly', layer: 'ALL', areaMin: NaN, areaMax: NaN, vMin: 0, vMax: 0, onlySelected: false }),
            calls
        };
        ctx.qSelectKindOf = api.qSelectKindOf;   // dùng đúng hàm phân loại + bộ lọc thật của app.js
        ctx.qSelectMatches = api.qSelectMatches;
        return ctx;
    };
    const api = cad(['applyQSelect', 'qSelectKindOf', 'qSelectMatches', 'refreshAreaTableIfOpen']);

    let ctx = build();
    api.applyQSelect.call(ctx, 'replace');
    assert(ctx.savedShapes.map(s => s.selected).join(',') === 'true,true,false',
        'Thế (replace): chỉ khối/tứ giác khớp bộ lọc được chọn, các đối tượng khác bị bỏ chọn');
    assert(ctx.qSelect.matchedIds.join(',') === 'A,B' && ctx.qSelect.crit.kind === 'poly',
        'applyQSelect lưu lại danh sách khớp + bộ lọc đã dùng để truy vết');
    assert(['persist', 'render', 'panel', 'areaTable', 'summary:2'].every(c => ctx.calls.includes(c)),
        'Sau khi chọn: lưu phiên, vẽ lại, cập nhật panel khối, bảng kê (nếu mở) và tổng hợp QSELECT');

    ctx = build();
    api.applyQSelect.call(ctx, 'append');
    assert(ctx.savedShapes.map(s => s.selected).join(',') === 'true,true,true',
        'Cộng thêm (append): giữ lựa chọn cũ và thêm kết quả khớp');
    ctx = build();
    ctx.savedShapes[0].selected = true;
    api.applyQSelect.call(ctx, 'exclude');
    assert(ctx.savedShapes.map(s => s.selected).join(',') === 'false,false,true',
        'Loại bớt (exclude): chỉ bỏ chọn các đối tượng khớp, phần còn lại nguyên trạng');

    const nested = build();
    nested.savedShapes.forEach(s => { s.selected = s.id !== 'C'; });
    nested.collectQSelectCriteria = () => ({ kind: 'poly', layer: 'ALL', areaMin: NaN, areaMax: NaN, vMin: 0, vMax: 0, onlySelected: true });
    api.applyQSelect.call(nested, 'append');
    assert(nested.savedShapes.find(s => s.id === 'C').selected === false,
        'onlySelected: tìm trong nhóm đang chọn để chọn lồng dần (nested filter)');

    const closed = cad(['refreshAreaTableIfOpen'], '', { document: mkDoc({}) });
    let opened = 0;
    closed.refreshAreaTableIfOpen.call({ openAreaTableModal() { opened++; } });
    assert(opened === 0, 'Bảng kê chưa mở → không gọi openAreaTableModal (đỡ chồng cửa sổ)');
    const areaModal = el({ style: { display: 'flex' } });
    areaModal.querySelector = () => ({ scrollTop: 500 });
    const listEl = { scrollTop: 120 };
    const openedApi = cad(['refreshAreaTableIfOpen'], '', { document: mkDoc({ modalCadAreaTable: areaModal, cadBlockList: listEl }) });
    openedApi.refreshAreaTableIfOpen.call({ openAreaTableModal() { opened++; listEl.scrollTop = 999; areaModal.querySelector().scrollTop = 999; } });
    assert(opened === 1 && listEl.scrollTop === 120,
        'Bảng kê đang mở → vẽ lại 1 lần và trả lại vị trí cuộn cũ cho người dùng');
}

// =====================================================================
// 11. QSELECT — đọc tiêu chí từ form + mở/đóng modal
// =====================================================================
console.log('\n— 11. QSELECT: thu tiêu chí từ form, đổ danh sách lớp —');
{
    const els = {
        cadQSelKind: input('poly'), cadQSelLayer: input('MAT_CAT'), cadQSelName: input('  thửa 17 '),
        cadQSelAreaMin: input('1,5'), cadQSelAreaMax: input(''), cadQSelVMin: input('3'), cadQSelVMax: input('0'),
        cadQSelOnlySelected: input('on', true),
        modalCadQSelect: el()
    };
    const api = cad(['collectQSelectCriteria', 'clearQSelectCriteria', 'openQSelectModal', 'closeQSelectModal', 'renderQSelectSummary'], '', { document: mkDoc(els) });
    const crit = api.collectQSelectCriteria.call({});
    assert(crit.kind === 'poly' && crit.layer === 'MAT_CAT' && crit.name === 'thửa 17',
        'collectQSelectCriteria đọc đúng loại/lớp/tên và tự cắt khoảng trắng hai đầu');
    assert(crit.areaMin === 1.5, 'Ô số chấp nhận dấu phẩy thập phân kiểu Việt Nam ("1,5" → 1.5)');
    assert(isNaN(crit.areaMax) && crit.vMin === 3 && crit.vMax === 0,
        'Ô trống → NaN (bỏ qua điều kiện); số đỉnh ≤ 0 nghĩa là không giới hạn');
    assert(crit.onlySelected === true, 'Tích "chỉ tìm trong nhóm đang chọn" được nhận');

    api.clearQSelectCriteria.call({});
    assert(Object.values(els).every(e => e.value === '' || e.value === 'all' || e.value === 'ALL' || (e.checked === false)),
        'Nút "Xóa bộ lọc" trả mọi ô về rỗng/mặc định');

    const modalCtx = {
        layersTable: [{ id: 'RANH_THUA', name: 'Ranh thửa' }, { id: 'MAT_CAT', name: 'Mặt cắt' }],
        savedShapes: [{ selected: true, vertices: [], mode: 'polygon' }],
        getEffectiveStats: () => ({ area: 12, perimeter: 14 }), getShapeLayerId: () => 'RANH_THUA',
        renderQSelectSummary(hit) { this.summarized = hit.length; }
    };
    const layerSel = els.cadQSelLayer;
    layerSel.innerHTML = '';
    layerSel.value = 'MAT_CAT';
    layerSel.options = [{ value: 'MAT_CAT' }, { value: 'ALL' }];
    api.openQSelectModal.call(modalCtx);
    assert(els.modalCadQSelect.classList.contains('active') && els.modalCadQSelect.classList.contains('show'),
        'openQSelectModal bật class active+show theo chuẩn modal của phân hệ');
    assert(/value="RANH_THUA"/.test(layerSel.innerHTML) && /— Mọi lớp —/.test(layerSel.innerHTML),
        'Dropdown lớp CAD nạp từ layersTable (kèm lựa chọn "Mọi lớp")');
    assert(layerSel.value === 'MAT_CAT', 'Giữ giá trị lớp người dùng đã chọn giữa các lần mở');
    api.closeQSelectModal.call(modalCtx);
    assert(!els.modalCadQSelect.classList.contains('active'), 'Đóng QSELECT gỡ class active');

    const box = el();
    const sumApi = cad(['renderQSelectSummary', 'qSelectSummary'], '', { document: mkDoc({ cadQSelSummary: box }), escapeHtml: ESC });
    const sumCtx = {
        qSelectSummary: sumApi.qSelectSummary,
        savedShapes: [{ id: 'x' }], getEffectiveStats: () => ({ area: 250, perimeter: 64 }), getShapeLayerId: () => 'RANH_THUA'
    };
    sumApi.renderQSelectSummary.call(sumCtx, [{ vertices: [{}, {}, {}] }, { vertices: [{}] }]);
    assert(/2<\/b> \/ 1 đối tượng khớp/.test(box.innerHTML) && /S = 500\.00 m²/.test(box.innerHTML),
        'Tổng hợp QSELECT in số đối tượng khớp và Σ diện tích (m² + ha)');
    assert(/P = 128\.00 m/.test(box.innerHTML) && /4 đỉnh/.test(box.innerHTML),
        'Tổng hợp kèm Σ chu vi và Σ số đỉnh');
    assert(/cad-qsel-chip">RANH_THUA: 2/.test(box.innerHTML), 'Đếm theo từng lớp hiển thị bằng chip để biết chọn ở đâu');
}

// =====================================================================
// 12. Đăng ký giao diện & luồng phím/lệnh (tĩnh)
// =====================================================================
console.log('\n— 12. Đăng ký modal, nút, phím tắt, dòng lệnh và CSS —');
{
    assert(indexHtml.includes('id="modalCadInquiry"'), 'index.html có modal trắc lượng #modalCadInquiry của riêng MiniCAD');
    assert(indexHtml.includes('id="modalCadQSelect"'), 'index.html có modal #modalCadQSelect của riêng MiniCAD');
    ['cadInquiryMode', 'cadInquiryHint', 'cadInquiryStatus', 'cadInquiryResult', 'cadInquiryLogList']
        .forEach(id => assert(indexHtml.includes(`id="${id}"`), `modal trắc lượng có điều khiển #${id}`));
    ['cadQSelKind', 'cadQSelLayer', 'cadQSelName', 'cadQSelAreaMin', 'cadQSelAreaMax', 'cadQSelVMin', 'cadQSelVMax',
        'cadQSelOnlySelected', 'cadQSelSummary']
        .forEach(id => assert(indexHtml.includes(`id="${id}"`), `modal QSELECT có điều khiển #${id}`));
    assert(/id="cadInquiryMode"[\s\S]{0,400}?value="dist"[\s\S]{0,400}?value="area"[\s\S]{0,400}?value="point"[\s\S]{0,400}?value="shape"/.test(indexHtml),
        'Dropdown phép đo có đủ DIST / AREA / ID / LIST khớp 4 nhánh handleInquiryPick');
    assert(/id="btnCadPolarTrack"[\s\S]{0,120}?togglePolarTracking\(\)/.test(indexHtml), 'Nút 🧭 Dóng góc gọi togglePolarTracking()');
    assert(indexHtml.includes('id="btnCadRibbonPolar"') && indexHtml.includes('id="btnCadRibbonInquiry"') && indexHtml.includes('id="btnCadRibbonQSelect"'),
        'Ribbon CAD có 3 nút Dóng góc / Trắc lượng / Chọn nhanh');
    assert(/<option value="90">/.test(indexHtml) && /<option value="45">/.test(indexHtml),
        'Dropdown bước góc dóng 90°/45° (bội số chuẩn AutoCAD)');
    assert(/<label class="cad-mini-select-label" for="cadQSelKind"/.test(indexHtml),
        'Mỗi ô QSELECT có <label for> (chạm tên vẫn mở đúng ô — chuẩn accessibility)');

    // UI Isolation (AGENTS.md §2): 2 modal mới thuộc MiniCAD, nằm trong block modal CAD
    const inquiryPos = indexHtml.indexOf('id="modalCadInquiry"');
    assert(inquiryPos > indexHtml.indexOf('id="modalCadGisImport"') && inquiryPos < indexHtml.indexOf('MODAL STUDIO CẤU HÌNH & XUẤT BẢN VẼ MINICAD'),
        'Modal mới được đặt cạnh các modal MiniCAD, không lẫn vào phân hệ khác');

    const closeBody = extractMethod('closeCadWindows').replace(/\s+/g, ' ');
    assert(closeBody.includes("'modalCadGisImport', 'modalCadInquiry', 'modalCadQSelect'"),
        'closeCadWindows() đóng cả 2 cửa sổ mới khi rời MiniCAD (UI Isolation)');

    const keydown = appJs.slice(appJs.indexOf('bindEvents()'), appJs.indexOf('bindEvents()') + 40000);
    assert(/e\.key === 'F10'[\s\S]{0,80}?this\.togglePolarTracking\(\)/.test(keydown), 'Phím F10 bật/tắt dóng góc');
    assert(/key === 'Q'[\s\S]{0,80}?this\.openQSelectModal\(\)/.test(keydown), 'Phím Q mở QSELECT');
    assert(/key === 'F10'[\s\S]{0,400}?else if \(key === 'B'\)/.test(keydown),
        'Chuỗi if/else phím không bị gãy: sau F10/Q vẫn tới nhánh B (cạnh)');

    assert(/if \(this\.toolAction === 'inquiry'\) \{\s*this\.handleInquiryPick\(lat, lng\);\s*return;/.test(appJs),
        'handleMapClick chuyển sang trắc lượng và KHÔNG thêm đỉnh vào nét vẽ');
    const clickBody = extractMethod('handleMapClick');
    assert(/const locked = this\.lockDraftPoint\(lat, lng\);/.test(clickBody),
        'Nhấp vẽ dùng lockDraftPoint (chung một chuẩn với xem trước)');

    const cliBody = appJs.slice(appJs.indexOf('executeCommandLine()'));
    assert(/case 'POLAR':\s*case 'DONGGOC':\s*case 'F10':\s*this\.togglePolarTracking\(\);/.test(cliBody), 'Lệnh POLAR/DONGGOC/F10');
    assert(/case 'DIST':\s*case 'KHOANGCACH':\s*case 'DO':\s*this\.openInquiryModal\('dist'\);/.test(cliBody), 'Lệnh DIST/KHOANGCACH/DO');
    assert(/case 'AREA':\s*case 'DIENTICH':\s*case 'TINH':\s*this\.openInquiryModal\('area'\);/.test(cliBody), 'Lệnh AREA/DIENTICH/TINH');
    assert(/case 'ID':\s*case 'TODO':\s*this\.openInquiryModal\('point'\);/.test(cliBody), 'Lệnh ID/TODO tra tọa độ');
    assert(/case 'LIST':\s*case 'TRATHONGTIN':\s*this\.openInquiryModal\('shape'\);/.test(cliBody), 'Lệnh LIST tra thông tin đối tượng');
    assert(/case 'QSEL':\s*case 'QSELECT':\s*case 'CHONNHANH':\s*this\.openQSelectModal\(\);/.test(cliBody), 'Lệnh QSELECT/CHONNHANH');
    assert(/case 'ZS':\s*case 'ZOOMSEL':\s*this\.zoomToSelection\(\);/.test(cliBody), 'Lệnh ZS/ZOOMSEL vừa khung nhóm chọn');
    assert(/case 'ESC':\s*case 'THOAT':\s*this\.toolAction = null;\s*this\.resetInquiryChain\(\);/.test(cliBody),
        'Lệnh ESC tắt công cụ đọc và xóa chuỗi đang chấm');
    const dupe = (cliBody.match(/case '[A-Z0-9]+'/g) || []);
    assert(new Set(dupe).size === dupe.length, 'Không có nhãn case trùng nhau trong switch dòng lệnh');

    ['DIST', 'AREA', 'ID', 'LIST', 'QSELECT', 'POLAR'].forEach(cmd =>
        assert(new RegExp(`\\{ cmd: '${cmd}', desc:`).test(appJs), `cadCommandList có mục gợi ý lệnh ${cmd}`));

    ['.cad-inq-table', '.cad-inq-log-row', '.cad-inq-empty', '.cad-qsel-summary', '.cad-qsel-total', '.cad-qsel-chip',
        '.cad-qsel-layers', '.cad-polar-angle-tag', '.cad-dyn-lock', '.cad-inline-select']
        .forEach(cls => assert(styleCss.includes(cls), `style.css định nghĩa ${cls}`));

    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert(/CACHE_NAME = 'vn2000-pro-v2\.8\.11'/.test(sw), 'sw.js nâng CACHE_NAME lên v2.8.11 cho đợt WP-C');
    assert(indexHtml.includes('app.js?v=2.8.11') && indexHtml.includes('style.css?v=2.8.11'),
        'index.html cache-bust app.js + style.css lên 2.8.11');
}

// =====================================================================
// 13. INQUIRY — render kết quả và đồ họa tạm (escape + Leaflet)
// =====================================================================
console.log('\n— 13. Inquiry: render an toàn XSS + vẽ hình tạm —');
{
    const box = el(), status = el(), list = el();
    const api = cad(['renderInquiryResult', 'renderInquiryLog', 'updateInquiryStatus'], '', {
        document: mkDoc({ cadInquiryResult: box, cadInquiryStatus: status, cadInquiryLogList: list }),
        escapeHtml: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    });
    const withDeps = o => Object.assign(o, { updateInquiryStatus: api.updateInquiryStatus, renderInquiryLog: api.renderInquiryLog });
    const ctx = withDeps({ inquiry: { log: [{ kind: 'dist', title: '<img src=x>', summary: 'S=1', at: '09:00' }], lastResult: { kind: 'dist', title: 'M1 → M2', rows: [{ label: 'ΔX', value: '<script>' }] } } });
    api.renderInquiryResult.call(ctx);
    assert(/&lt;script&gt;/.test(box.innerHTML) && !/<script>/.test(box.innerHTML),
        'Kết quả trắc lượng được escape (không chèn được HTML/JS từ tên điểm)');
    assert(/&lt;img/.test(list.innerHTML) && list.innerHTML.includes('cad-inq-log-row'),
        'Nhật ký trắc lượng escape cả tiêu đề');
    assert(status.innerText.includes('M1 → M2'), 'Dòng trạng thái cập nhật theo phép đo cuối');

    const emptyCtx = withDeps({ inquiry: { log: [], lastResult: null } });
    api.renderInquiryResult.call(emptyCtx);
    assert(box.innerHTML === '' && /cad-inq-empty/.test(list.innerHTML),
        'Chưa có phép đo → khung kết quả trống nhưng vẫn render nhật ký (không bỏ sót UI)');

    const added = [];
    const group = { clearLayers() { } };
    const fakeL = {
        circleMarker: ll => ({ addTo: () => { added.push(['circle', ll]); return { bindTooltip() { } }; } }),
        polyline: ll => { added.push(['line', ll]); return { addTo() { } }; },
        polygon: ll => { added.push(['poly', ll]); return { addTo() { } }; }
    };
    const gfx = cad(['renderInquiryGraphics', 'clearInquiryGraphics', 'drawInquiryShape'], '', { AppState: { ...APP_STATE, leafletMap: {} }, L: fakeL });
    const gctx = {
        layers: { inquiryGroup: group },
        drawInquiryShape: gfx.drawInquiryShape,
        inquiry: { mode: 'dist', pts: [{ lat: 21, lng: 106.05, x: 1, y: 2, name: 'A' }, { lat: 21.001, lng: 106.05, x: 3, y: 4, name: 'B' }], lastResult: { kind: 'dist' }, shapeIdx: null },
        savedShapes: []
    };
    gfx.renderInquiryGraphics.call(gctx);
    assert(added.filter(a => a[0] === 'circle').length === 2 && added.some(a => a[0] === 'line'),
        'DIST vẽ 2 điểm + 1 đoạn nối lên nhóm overlay tạm (không lẫn vào nét vẽ)');
    gctx.inquiry.lastResult = { kind: 'area' };
    gctx.inquiry.pts.push({ lat: 21.002, lng: 106.05, x: 5, y: 6, name: 'C' });
    added.length = 0;
    gfx.renderInquiryGraphics.call(gctx);
    assert(added.some(a => a[0] === 'poly'), 'AREA tô vùng đang chấm lên bản đồ để nhìn bằng mắt');

    gctx.inquiry.lastResult = { kind: 'shape' };
    gctx.inquiry.shapeIdx = 0;
    gctx.savedShapes = [{ mode: 'polygon', vertices: [{ lat: 21, lng: 106.05 }, { lat: 21.001, lng: 106.05 }, { lat: 21.001, lng: 106.06 }] }];
    added.length = 0;
    gfx.renderInquiryGraphics.call(gctx);
    assert(added.some(a => a[0] === 'poly'),
        'LIST tô sáng đúng đối tượng vừa tra (shapeIdx), không phụ thuộc con trỏ chọn của phân hệ khác');

    const hintMissing = cad(['updateInquiryHint'], '', { document: mkDoc({}) });
    let hintThrew = false;
    try { hintMissing.updateInquiryHint.call({ inquiry: { mode: 'area' } }); } catch (e) { hintThrew = true; }
    assert(!hintThrew, 'updateInquiryHint null-safe khi modal chưa được render');
    const hintBox = el();
    cad(['updateInquiryHint'], '', { document: mkDoc({ cadInquiryHint: hintBox }) })
        .updateInquiryHint.call({ inquiry: { mode: 'area' } });
    assert(/3 đỉnh/.test(hintBox.innerText), 'Gợi ý đổi theo chế độ đo (AREA chỉ cách chấm ≥3 đỉnh)');
}

console.log(`\n🏁 TỔNG KẾT WP-C: ${passedTests}/${totalTests} bài test đạt 100%`);
if (passedTests !== totalTests) process.exit(1);
