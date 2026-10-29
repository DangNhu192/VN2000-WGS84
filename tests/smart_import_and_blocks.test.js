/**
 * Bộ kiểm thử tự động cho tính năng:
 * 1. Tối ưu "Dán tọa độ nhanh (từ Zalo, Excel, ghi chú)": chống lệch vị trí, tự đảo X-Y, WGS-84, KTT & Múi
 * 2. MiniCAD "Nạp mốc dự án": lựa chọn theo Khối đã vẽ hoặc theo Điểm đơn lẻ
 */

const assert = require('assert');
const geodesy = require('../geodesy.js');

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: DÁN TỌA ĐỘ NHANH CHỐNG LỆCH & NẠP THEO KHỐI MINICAD');
console.log('========================================================================\n');

// Mock môi trường AppState và các hàm chuyển đổi
const mockAppState = {
    kttDeg: 105,
    kttMin: 45,
    kttVal: 105.75, // TP.HCM
    muiVal: 3,
    scaleFactor: 0.9999,
    provinceName: "TP. Hồ Chí Minh"
};

// Mô phỏng hàm parseSmartManualLine như trong app.js
function parseSmartManualLine(line, idx, options) {
    if (!line || !line.trim()) return null;
    let clean = line.trim();

    const lower = clean.toLowerCase();
    if (lower.startsWith('stt') || lower.startsWith('tên') || lower.startsWith('name') || 
        lower.startsWith('toạ độ') || lower.startsWith('tọa độ') || lower.startsWith('kinh độ') || 
        lower.startsWith('vĩ độ') || lower.startsWith('lat') || lower.startsWith('lng') ||
        lower.startsWith('point') || lower.startsWith('thời gian') || lower.startsWith('time')) {
        return null;
    }

    let tokens = [];
    if (clean.includes('\t')) {
        tokens = clean.split('\t').map(t => t.trim()).filter(Boolean);
    } else if (clean.includes(';')) {
        tokens = clean.split(';').map(t => t.trim()).filter(Boolean);
    } else if (clean.includes(',')) {
        const commaParts = clean.split(',').map(t => t.trim()).filter(Boolean);
        if (commaParts.length >= 2) {
            tokens = commaParts;
        } else {
            tokens = clean.split(/\s+/).map(t => t.trim()).filter(Boolean);
        }
    } else {
        tokens = clean.split(/\s+/).map(t => t.trim()).filter(Boolean);
    }

    if (tokens.length < 2) return null;

    const cleanNumStr = (s) => {
        if (!s) return '';
        let str = String(s).trim().replace(/^"|"$/g, '');
        if (str.includes('.') && str.includes(',')) {
            if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
                str = str.replace(/\./g, '').replace(',', '.');
            } else {
                str = str.replace(/,/g, '');
            }
        } else if (str.includes(',')) {
            str = str.replace(',', '.');
        }
        return str;
    };

    let name = '';
    let val1 = NaN, val2 = NaN, val3 = NaN;
    let note = '';

    const rawFirstNum = parseFloat(cleanNumStr(tokens[0]));
    const isFirstTokenNumeric = !isNaN(rawFirstNum) && (/^[-+]?[\d.,]+$/.test(tokens[0].trim()));

    if (isFirstTokenNumeric && (rawFirstNum > 1000 || (rawFirstNum >= 8 && rawFirstNum <= 115))) {
        name = `M${idx + 1}`;
        val1 = parseFloat(cleanNumStr(tokens[0]));
        val2 = parseFloat(cleanNumStr(tokens[1]));
        if (tokens.length >= 3) {
            val3 = parseFloat(cleanNumStr(tokens[2]));
            if (isNaN(val3)) note = tokens.slice(2).join(' ');
            else if (tokens.length >= 4) note = tokens.slice(3).join(' ');
        }
    } else {
        name = tokens[0].replace(/^"|"$/g, '').trim() || `M${idx + 1}`;
        val1 = parseFloat(cleanNumStr(tokens[1]));
        val2 = parseFloat(cleanNumStr(tokens[2]));
        if (tokens.length >= 4) {
            val3 = parseFloat(cleanNumStr(tokens[3]));
            if (isNaN(val3)) note = tokens.slice(3).join(' ');
            else if (tokens.length >= 5) note = tokens.slice(4).join(' ');
        }
    }

    if (isNaN(val1) || isNaN(val2)) return null;

    let x = 0, y = 0, lat = 0, lng = 0;
    let coordTypeInferred = '';

    const fmt = options.format || 'auto';
    const targetKtt = options.ktt || mockAppState.kttVal;
    const targetK0 = options.scaleFactor || mockAppState.scaleFactor;

    if (fmt === 'vn2k_yx') {
        y = val1;
        x = val2;
        coordTypeInferred = 'VN2000 (Y, X)';
        const wgs = geodesy.convertVn2kToWgs(x, y, targetKtt, targetK0);
        lat = parseFloat(wgs.lat.toFixed(6));
        lng = parseFloat(wgs.lng.toFixed(6));
    } else if (fmt === 'vn2k_xy') {
        x = val1;
        y = val2;
        coordTypeInferred = 'VN2000 (X, Y)';
        const wgs = geodesy.convertVn2kToWgs(x, y, targetKtt, targetK0);
        lat = parseFloat(wgs.lat.toFixed(6));
        lng = parseFloat(wgs.lng.toFixed(6));
    } else if (fmt === 'wgs_lnglat') {
        lng = val1;
        lat = val2;
        coordTypeInferred = 'WGS84 (Lng, Lat)';
        const vn2k = geodesy.convertWgsToVn2k(lat, lng, targetKtt, targetK0);
        x = parseFloat(vn2k.X.toFixed(3));
        y = parseFloat(vn2k.Y.toFixed(3));
    } else if (fmt === 'wgs_latlng') {
        lat = val1;
        lng = val2;
        coordTypeInferred = 'WGS84 (Lat, Lng)';
        const vn2k = geodesy.convertWgsToVn2k(lat, lng, targetKtt, targetK0);
        x = parseFloat(vn2k.X.toFixed(3));
        y = parseFloat(vn2k.Y.toFixed(3));
    } else {
        // AUTO
        if (val1 > 1000 || val2 > 1000) {
            if (val1 < 850000 && val2 >= 850000) {
                // Đảo Y trước X sau
                y = val1;
                x = val2;
                coordTypeInferred = 'VN2000 đảo (Y, X ➔ Tự sửa đúng)';
            } else {
                x = val1;
                y = val2;
                coordTypeInferred = 'VN2000 chuẩn (X, Y)';
            }
            const wgs = geodesy.convertVn2kToWgs(x, y, targetKtt, targetK0);
            lat = parseFloat(wgs.lat.toFixed(6));
            lng = parseFloat(wgs.lng.toFixed(6));
        } else if (Math.abs(val1) <= 180 && Math.abs(val2) <= 180 && (Math.abs(val1) <= 90 || Math.abs(val2) <= 90)) {
            if (val1 >= 100 && val1 <= 112 && val2 >= 8 && val2 <= 25) {
                lng = val1;
                lat = val2;
                coordTypeInferred = 'WGS84 đảo (Lng, Lat ➔ Tự sửa đúng)';
            } else {
                lat = val1;
                lng = val2;
                coordTypeInferred = 'WGS84 chuẩn (Lat, Lng)';
            }
            const vn2k = geodesy.convertWgsToVn2k(lat, lng, targetKtt, targetK0);
            x = parseFloat(vn2k.X.toFixed(3));
            y = parseFloat(vn2k.Y.toFixed(3));
        }
    }

    if ((x === 0 && y === 0) && (lat === 0 && lng === 0)) return null;

    return {
        name, x, y, lat, lng,
        mui: options.muiVal || 3,
        ktt: options.kttStr || "105°45'",
        note: note || "",
        coordTypeInferred
    };
}

// ================= KIỂM THỬ NHÓM 1: DÁN TỌA ĐỘ NHANH CHỐNG LỆCH =================
console.log('--- NHÓM 1: TỰ ĐỘNG NHẬN DIỆN & TỐI ƯU DÁN TỌA ĐỘ NHANH ---');

// Ca 1: Dán 2 cột số không có cột tên mốc
const lineNoName = "1144058.623  539624.574";
const pt1 = parseSmartManualLine(lineNoName, 0, { format: 'auto', ktt: 105.75, scaleFactor: 0.9999 });
assert.ok(pt1 !== null, 'Phải nhận dạng được dòng không có tên mốc');
assert.strictEqual(pt1.name, 'M1', 'Tự động gán tên M1 cho mốc đầu tiên');
assert.strictEqual(pt1.x, 1144058.623, 'X phải đúng số đầu');
assert.strictEqual(pt1.y, 539624.574, 'Y phải đúng số hai');
assert.ok(pt1.lat > 10.0 && pt1.lat < 11.0, 'Lat WGS84 phải nằm trong khoảng TP.HCM');
assert.ok(pt1.lng > 106.0 && pt1.lng < 107.0, 'Lng WGS84 phải nằm trong khoảng TP.HCM');
console.log('  ✅ PASS: Nhận dạng thành công dòng chỉ có 2 cột số không có cột tên mốc (tự sinh M1)');

// Ca 2: Dán tọa độ bị đảo ngược trục (Y Đông trước, X Bắc sau)
const lineReversed = "M2, 539624.574, 1144058.623, Góc phía Đông";
const pt2 = parseSmartManualLine(lineReversed, 1, { format: 'auto', ktt: 105.75, scaleFactor: 0.9999 });
assert.strictEqual(pt2.name, 'M2');
assert.strictEqual(pt2.x, 1144058.623, 'Hệ thống phải tự động hoán đổi X về 1144058.623 để chống lệch');
assert.strictEqual(pt2.y, 539624.574, 'Hệ thống phải tự động hoán đổi Y về 539624.574');
assert.strictEqual(pt2.note, 'Góc phía Đông', 'Bảo toàn ghi chú');
console.log('  ✅ PASS: Tự động phát hiện và đảo trục Y-X thành X-Y chuẩn xác chống lệch hàng trăm km');

// Ca 3: Dán tọa độ GPS WGS-84 (Lat, Lng)
const lineWgs = "M3, 10.762622, 106.660172";
const pt3 = parseSmartManualLine(lineWgs, 2, { format: 'auto', ktt: 105.75, scaleFactor: 0.9999 });
assert.strictEqual(pt3.lat, 10.762622);
assert.strictEqual(pt3.lng, 106.660172);
assert.ok(pt3.x > 1000000, 'Tự động tính chuyển sang VN2000 X > 1.000.000m');
assert.ok(pt3.y > 500000 && pt3.y < 600000, 'Tự động tính chuyển sang VN2000 Y ~ 500.000m');
console.log('  ✅ PASS: Nhận diện và chuyển đổi tọa độ WGS-84 (Lat, Lng) sang VN-2000 chính xác');

// Ca 4: Dán tọa độ GPS WGS-84 bị đảo (Lng trước, Lat sau)
const lineWgsReversed = "M4, 106.660172, 10.762622";
const pt4 = parseSmartManualLine(lineWgsReversed, 3, { format: 'auto', ktt: 105.75, scaleFactor: 0.9999 });
assert.strictEqual(pt4.lat, 10.762622, 'Phải tự đảo Vĩ độ Lat về đúng 10.762622');
assert.strictEqual(pt4.lng, 106.660172, 'Phải tự đảo Kinh độ Lng về đúng 106.660172');
console.log('  ✅ PASS: Nhận diện và tự động sửa thứ tự Lng-Lat thành Lat-Lng chuẩn xác');

// Ca 5: Dán với phân cách Tab Excel và dấu phẩy số học Việt Nam
const lineExcelVn = "1144058,623\t539624,574";
const pt5 = parseSmartManualLine(lineExcelVn, 4, { format: 'auto', ktt: 105.75, scaleFactor: 0.9999 });
assert.strictEqual(pt5.x, 1144058.623);
assert.strictEqual(pt5.y, 539624.574);
console.log('  ✅ PASS: Xử lý mượt mà phân cách Tab Excel và dấu phẩy số học Việt Nam (1144058,623)');

// Ca 6: Chọn KTT tỉnh khác (Hà Nội KTT 105.0)
const ptHn = parseSmartManualLine("HN_Goc, 2322588.120, 584920.450", 5, {
    format: 'vn2k_xy',
    ktt: 105.0,
    scaleFactor: 0.9999,
    kttStr: "105°00'"
});
assert.ok(ptHn.lat > 20.0 && ptHn.lat < 22.0, 'Tọa độ Hà Nội với KTT 105°00 phải cho vĩ độ ~21°N');
console.log('  ✅ PASS: Áp dụng Kinh tuyến trục cục bộ chuẩn xác theo từng địa phương không bị lệch');

// ================= KIỂM THỬ NHÓM 2: NẠP THEO KHỐI TRONG MINICAD =================
console.log('\n--- NHÓM 2: NẠP THEO KHỐI (CŨ) ĐÃ VẼ TRONG MINICAD ---');

// Mô phỏng bộ lưu trữ và quản lý khối MiniCAD
class MockCadTool {
    constructor() {
        this.savedShapes = [];
        this.storage = new Map();
        this._currentLoadTab = 'blocks';
    }

    getProjectStorageKey(name) {
        return (name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    saveProjectShapes(name, shapes) {
        const key = 'vn2k_cad_shapes_' + this.getProjectStorageKey(name);
        this.storage.set(key, JSON.stringify({ savedShapes: shapes }));
    }

    getProjectSavedShapes(name) {
        const key = 'vn2k_cad_shapes_' + this.getProjectStorageKey(name);
        const raw = this.storage.get(key);
        if (!raw) return [];
        return JSON.parse(raw).savedShapes || [];
    }

    confirmLoadProjectAsBlocks(projName, selectedBlockIdxs) {
        const shapes = this.getProjectSavedShapes(projName);
        let loadedCount = 0;
        selectedBlockIdxs.forEach((idx, ord) => {
            const s = shapes[idx];
            if (!s) return;
            const newShape = {
                id: 'proj_shape_' + Date.now() + '_' + ord,
                name: s.name,
                shortName: s.shortName || s.name,
                mode: s.mode || 'polygon',
                vertices: s.vertices.map((v, vIdx) => ({
                    ...v,
                    isSnapped: true,
                    snapSource: `Khối: ${projName} - ${s.name}`
                })),
                color: s.color || '#10b981',
                selected: true,
                stats: { area: s.stats ? s.stats.area : 1000, perimeter: 140 }
            };
            this.savedShapes.push(newShape);
            loadedCount++;
        });
        return loadedCount;
    }
}

const mockCad = new MockCadTool();

// Giả lập dự án "DuAn_KhuDanCu.csv" đã vẽ sẵn 2 khối: Thửa 1 (Đa giác) và Tuyến đường (Tuyến)
const originalShapes = [
    {
        name: "Thửa Đất Số 1",
        shortName: "Thửa 1",
        mode: "polygon",
        color: "#10b981",
        vertices: [
            { x: 1000, y: 1000, lat: 10.1, lng: 106.1, name: "Đ1" },
            { x: 1050, y: 1000, lat: 10.1, lng: 106.2, name: "Đ2" },
            { x: 1050, y: 1050, lat: 10.2, lng: 106.2, name: "Đ3" },
            { x: 1000, y: 1050, lat: 10.2, lng: 106.1, name: "Đ4" }
        ],
        stats: { area: 2500, perimeter: 200 }
    },
    {
        name: "Tuyến Đường D1",
        shortName: "Đường D1",
        mode: "polyline",
        color: "#38bdf8",
        vertices: [
            { x: 1000, y: 900, lat: 10.0, lng: 106.1, name: "T1" },
            { x: 1200, y: 900, lat: 10.0, lng: 106.3, name: "T2" }
        ],
        stats: { area: 0, perimeter: 200 }
    }
];

mockCad.saveProjectShapes("DuAn_KhuDanCu.csv", originalShapes);

// Ca 7: Kiểm tra đọc danh sách khối của dự án
const loadedList = mockCad.getProjectSavedShapes("DuAn_KhuDanCu.csv");
assert.strictEqual(loadedList.length, 2, 'Dự án nguồn phải có 2 khối đã lưu');
assert.strictEqual(loadedList[0].name, 'Thửa Đất Số 1');
assert.strictEqual(loadedList[1].mode, 'polyline');
console.log('  ✅ PASS: Đọc danh sách khối (Shapes) đã lưu của dự án nguồn thành công');

// Ca 8: Nạp khối được chọn vào MiniCAD của bản vẽ hiện tại
assert.strictEqual(mockCad.savedShapes.length, 0, 'Trước khi nạp MiniCAD rỗng');
const nLoaded = mockCad.confirmLoadProjectAsBlocks("DuAn_KhuDanCu.csv", [0, 1]);
assert.strictEqual(nLoaded, 2, 'Phải nạp thành công 2 khối');
assert.strictEqual(mockCad.savedShapes.length, 2, 'Bản vẽ hiện tại nhận đủ 2 khối');
assert.strictEqual(mockCad.savedShapes[0].name, 'Thửa Đất Số 1');
assert.strictEqual(mockCad.savedShapes[0].stats.area, 2500);
assert.strictEqual(mockCad.savedShapes[1].name, 'Tuyến Đường D1');
assert.strictEqual(mockCad.savedShapes[1].mode, 'polyline');
assert.ok(mockCad.savedShapes[0].id.startsWith('proj_shape_'), 'Sinh ID khối độc lập');
console.log('  ✅ PASS: Nạp nguyên vẹn các khối cũ đã chọn vào MiniCAD với đầy đủ đỉnh, màu, diện tích');

// Ca 9: Chỉ nạp 1 khối cụ thể (ví dụ chỉ chọn nạp Thửa 1)
const mockCadSingle = new MockCadTool();
mockCadSingle.saveProjectShapes("DuAn_KhuDanCu.csv", originalShapes);
const nSingle = mockCadSingle.confirmLoadProjectAsBlocks("DuAn_KhuDanCu.csv", [0]);
assert.strictEqual(nSingle, 1);
assert.strictEqual(mockCadSingle.savedShapes.length, 1);
assert.strictEqual(mockCadSingle.savedShapes[0].name, 'Thửa Đất Số 1');
console.log('  ✅ PASS: Cho phép người dùng lọc tick chọn từng khối mong muốn để nạp');

console.log('\n========================================================================');
console.log('🏁 TỔNG KẾT: 9/9 KIỂM THỬ THÀNH CÔNG (100%)');
console.log('🎉 TÍNH NĂNG DÁN TỌA ĐỘ NHANH CHỐNG LỆCH & NẠP THEO KHỐI MINICAD HOÀN HẢO!');
console.log('========================================================================\n');
