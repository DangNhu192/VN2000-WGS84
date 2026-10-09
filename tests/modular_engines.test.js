const test = require('node:test');
const assert = require('node:assert');

const GeodesyEngine = require('../src/core/geodesy_engine.js');
const CadGeometryEngine = require('../src/core/cad_geometry.js');
const VolumeCalculationEngine = require('../src/core/volume_calc.js');
const DataStoreEngine = require('../src/core/data_store.js');

test('=== 1. KIỂM THỬ GEODESY ENGINE (BỘ ĐỘNG CƠ TRẮC ĐỊA) ===', () => {
    // Test chuyển đổi DMS sang Deg và ngược lại
    const deg = GeodesyEngine.dmsToDeg(105, 45, 0);
    assert.strictEqual(deg, 105.75);

    const dms = GeodesyEngine.degToDms(105.75);
    assert.strictEqual(dms.deg, 105);
    assert.strictEqual(dms.min, 45);

    // Test phát hiện đảo trục Y-X thành X-Y
    const norm = GeodesyEngine.normalizeCoords(586000, 1144000);
    assert.strictEqual(norm.x, 1144000);
    assert.strictEqual(norm.y, 586000);
    assert.strictEqual(norm.isFlipped, true);

    // Test khoảng cách và phương vị
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 100, y: 0 };
    assert.strictEqual(GeodesyEngine.distance2D(p1, p2), 100);
    assert.strictEqual(GeodesyEngine.azimuth(p1, p2), 0); // Hướng Bắc = 0 độ
});

test('=== 2. KIỂM THỬ CAD GEOMETRY ENGINE (HÌNH HỌC & SHOELACE AREA) ===', () => {
    // Hình chữ nhật 10m x 20m -> Diện tích = 200m2, Chu vi = 60m
    const rect = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 20, y: 10 },
        { x: 20, y: 0 }
    ];
    const area = CadGeometryEngine.calculateArea(rect);
    const perim = CadGeometryEngine.calculatePerimeter(rect, true);
    assert.strictEqual(area, 200);
    assert.strictEqual(perim, 60);

    // Test Object Snap
    const mouse = { x: 1, y: 1 };
    const snap = CadGeometryEngine.findSnapPoint(mouse, rect, 15);
    assert.ok(snap !== null);
    assert.strictEqual(snap.index, 0);

    // Test Xuất chuỗi DXF
    const shapes = [{ name: 'THUA_01', isClosed: true, points: rect }];
    const dxf = CadGeometryEngine.exportDxfString(shapes);
    assert.ok(dxf.includes('SECTION'));
    assert.ok(dxf.includes('POLYLINE'));
    assert.ok(dxf.includes('THUA_01'));
    assert.ok(dxf.includes('EOF'));
});

test('=== 3. KIỂM THỬ VOLUME CALCULATION ENGINE (ĐÀO ĐẮP TCVN 4447) ===', () => {
    const stations = [
        { name: 'KM0', distance: 0, groundH: 10.0, designH: 12.0 },  // Đắp 2m
        { name: 'KM1', distance: 50, groundH: 14.0, designH: 11.0 }  // Đào 3m
    ];

    const deltas = VolumeCalculationEngine.calculateStationDeltas(stations);
    assert.strictEqual(deltas[0].type, 'FILL');
    assert.strictEqual(deltas[0].deltaH, 2.0);
    assert.strictEqual(deltas[1].type, 'CUT');
    assert.strictEqual(deltas[1].deltaH, -3.0);

    const segs = VolumeCalculationEngine.calculateSegmentVolumes(stations);
    assert.strictEqual(segs.length, 1);
    assert.strictEqual(segs[0].distance, 50);

    // Hố móng đáy 10x10, sâu 2m, mái dốc taluy 1:0.5 (đất sét)
    const pit = VolumeCalculationEngine.calculatePitVolumeTCVN4447({
        bottomLength: 10,
        bottomWidth: 10,
        depth: 2,
        slopeM: 0.5
    });
    assert.ok(pit.volume > 200, 'Thể tích hình chóp cụt phải lớn hơn hình hộp chữ nhật');
    assert.strictEqual(pit.topLength, 12);
    assert.strictEqual(pit.bottomArea, 100);
});

test('=== 4. KIỂM THỬ DATA STORE ENGINE (THÙNG RÁC 30 NGÀY) ===', () => {
    const now = new Date('2026-10-09T08:00:00Z');
    const trashList = [
        { name: 'DuAn_MoiXoa', deletedAt: new Date('2026-10-01T08:00:00Z').toISOString() }, // 8 ngày -> Giữ lại
        { name: 'DuAn_QuaHan', deletedAt: new Date('2026-08-01T08:00:00Z').toISOString() }  // >60 ngày -> Xóa
    ];

    const retained = DataStoreEngine.filterExpiredTrash(trashList, now);
    assert.strictEqual(retained.length, 1);
    assert.strictEqual(retained[0].name, 'DuAn_MoiXoa');
});
