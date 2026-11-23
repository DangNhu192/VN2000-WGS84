// v2.8.52: bỏ GeodesyEngine / VolumeCalculationEngine / DataStoreEngine — bản nháp chưa từng được ứng dụng nạp
// (trùng geodesy.js); chỉ giữ CadGeometryEngine là mô-đun đang chạy.
const test = require('node:test');
const assert = require('node:assert');

const CadGeometryEngine = require('../src/core/cad_geometry.js');

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
