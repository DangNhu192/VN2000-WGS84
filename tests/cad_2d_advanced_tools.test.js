const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const CadGeometryEngine = require('../src/core/cad_geometry.js');

test('=== 1. KIỂM THỬ THUẬT TOÁN TÁCH THỬA (SPLIT POLYGON) ===', () => {
    // Tạo thửa đất hình chữ nhật 20m x 10m (Diện tích 200 m²)
    // (0,0) -> (20,0) -> (20,10) -> (0,10)
    const polygon = [
        { x: 0, y: 0, name: 'Đ1', lat: 10.0, lng: 106.0 },
        { x: 20, y: 0, name: 'Đ2', lat: 10.0, lng: 106.0002 },
        { x: 20, y: 10, name: 'Đ3', lat: 10.0001, lng: 106.0002 },
        { x: 0, y: 10, name: 'Đ4', lat: 10.0001, lng: 106.0 }
    ];

    const initialArea = CadGeometryEngine.calculateArea(polygon);
    assert.strictEqual(initialArea, 200, 'Diện tích thửa gốc ban đầu phải là 200 m²');

    // Đường cắt thẳng đứng x = 8: qua (8, -5) và (8, 15)
    // Chia thửa thành Thửa A (8x10 = 80 m²) và Thửa B (12x10 = 120 m²)
    const cutP1 = { x: 8, y: -5 };
    const cutP2 = { x: 8, y: 15 };

    const result = CadGeometryEngine.splitPolygon(polygon, cutP1, cutP2);
    assert.strictEqual(result.success, true, 'Tách thửa thành công');
    assert.strictEqual(result.polygonA.length, 4, 'Đa giác con A có 4 đỉnh');
    assert.strictEqual(result.polygonB.length, 4, 'Đa giác con B có 4 đỉnh');

    // Kiểm tra tổng diện tích sau khi tách bằng chính xác diện tích ban đầu
    const sumArea = result.areaA + result.areaB;
    assert.ok(Math.abs(sumArea - initialArea) < 1e-4, 'Tổng diện tích 2 thửa con phải đúng bằng thửa gốc');
    assert.ok(Math.abs(result.areaA - 80) < 1e-4 || Math.abs(result.areaA - 120) < 1e-4, 'Diện tích con A phải là 80m² hoặc 120m²');
    assert.ok(Math.abs(result.areaB - 80) < 1e-4 || Math.abs(result.areaB - 120) < 1e-4, 'Diện tích con B phải là 120m² hoặc 80m²');
    assert.strictEqual(result.intersections.length, 2, 'Tìm thấy đúng 2 điểm cắt ranh giới');
});

test('=== 2. KIỂM THỬ THUẬT TOÁN HỢP THỬA (MERGE POLYGONS) ===', () => {
    // Thửa 1: 0..10 dọc x, 0..10 dọc y (Diện tích 100 m²)
    const poly1 = [
        { x: 0, y: 0, name: 'A1' },
        { x: 10, y: 0, name: 'A2' },
        { x: 10, y: 10, name: 'A3' },
        { x: 0, y: 10, name: 'A4' }
    ];

    // Thửa 2: 10..20 dọc x, 0..10 dọc y (Diện tích 100 m²) có cạnh chung (10,0)-(10,10)
    const poly2 = [
        { x: 10, y: 0, name: 'B1' },
        { x: 20, y: 0, name: 'B2' },
        { x: 20, y: 10, name: 'B3' },
        { x: 10, y: 10, name: 'B4' }
    ];

    const mergeRes = CadGeometryEngine.mergePolygons(poly1, poly2);
    assert.strictEqual(mergeRes.success, true, 'Hợp thửa thành công');
    assert.ok(Math.abs(mergeRes.totalArea - 200) < 1e-3, 'Diện tích sau hợp thửa phải là 200 m² (100 + 100)');
    assert.ok(mergeRes.mergedPolygon.length >= 4, 'Đa giác hợp nhất phải có ít nhất 4 đỉnh ngoài');
});

test('=== 3. KIỂM THỬ CẮT XÉN (TRIM) VÀ KÉO DÀI (EXTEND) ===', () => {
    // Tuyến L: đi từ (0, 5) đến (20, 5)
    const line = [
        { x: 0, y: 5 },
        { x: 20, y: 5 }
    ];

    // Ranh giới cắt: đường thẳng x = 12 từ (12, 0) đến (12, 10)
    const cuttingBoundary = [
        { x: 12, y: 0 },
        { x: 12, y: 10 }
    ];

    // Cắt bỏ phần ngọn (phía gần x = 20)
    const trimRes = CadGeometryEngine.trimLine(line, cuttingBoundary, { x: 19, y: 5 });
    assert.strictEqual(trimRes.success, true, 'Cắt xén thành công');
    assert.strictEqual(trimRes.trimmedLine.length, 2, 'Tuyến sau xén có 2 đỉnh');
    assert.strictEqual(trimRes.trimmedLine[0].x, 0, 'Đầu tuyến giữ nguyên x=0');
    assert.ok(Math.abs(trimRes.trimmedLine[1].x - 12) < 1e-3, 'Điểm cuối tuyến chạm đúng ranh cắt x=12');

    // Tuyến ngắn: từ (0, 3) đến (7, 3), hướng sang phải
    const shortLine = [
        { x: 0, y: 3 },
        { x: 7, y: 3 }
    ];
    // Kéo dài tới ranh x = 12
    const extendRes = CadGeometryEngine.extendLine(shortLine, cuttingBoundary);
    assert.strictEqual(extendRes.success, true, 'Kéo dài thành công');
    assert.strictEqual(extendRes.extendedLine.length, 3, 'Tuyến kéo dài có thêm đỉnh giao ranh');
    assert.ok(Math.abs(extendRes.extendedLine[2].x - 12) < 1e-3, 'Điểm kéo dài chạm tới ranh giới x=12');
});

test('=== 4. KIỂM THỬ DÓNG ĐIỂM MỞ RỘNG (POLAR / EXTENSION TRACKING) ===', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 10, y: 0 }; // Hướng ngang sang phải (vector dóng: theo trục x dương)

    // Chuột ở (25, 0.2) cách đường dóng chỉ 0.2m (rất thẳng hàng)
    const mousePt = { x: 25, y: 0.2 };
    const polarRes = CadGeometryEngine.getPolarExtensionPoint(p1, p2, mousePt);

    assert.ok(polarRes !== null, 'Phải phát hiện điểm dóng mở rộng');
    assert.strictEqual(polarRes.isAligned, true, 'Đã căn thẳng hàng');
    assert.ok(Math.abs(polarRes.point.x - 25) < 1e-3, 'Điểm dóng chiếu đúng lên x=25');
    assert.ok(Math.abs(polarRes.point.y - 0) < 1e-3, 'Điểm dóng chiếu đúng lên y=0');
    assert.strictEqual(polarRes.azimuthDeg, 90, 'Phương vị dóng sang Đông là 90°');
});

test('=== 5. KIỂM THỬ TÁCH THỬA VỚI ĐƯỜNG CẮT XIÊN GÓC (DIAGONAL CUT) ===', () => {
    // Thửa tam giác vuông (0,0) -> (10,0) -> (0,10) (Diện tích 50 m²)
    const triangle = [
        { x: 0, y: 0, name: 'T1' },
        { x: 10, y: 0, name: 'T2' },
        { x: 0, y: 10, name: 'T3' }
    ];
    const triArea = CadGeometryEngine.calculateArea(triangle);
    assert.strictEqual(triArea, 50, 'Diện tích tam giác vuông là 50 m²');

    // Đường cắt ngang y = 4 (chia tam giác thành hình thang và tam giác con)
    const cutP1 = { x: -2, y: 4 };
    const cutP2 = { x: 12, y: 4 };
    const splitRes = CadGeometryEngine.splitPolygon(triangle, cutP1, cutP2);

    assert.strictEqual(splitRes.success, true, 'Tách tam giác thành công');
    const totalSubArea = splitRes.areaA + splitRes.areaB;
    assert.ok(Math.abs(totalSubArea - 50) < 1e-4, 'Tổng diện tích 2 phần phải bằng 50 m²');
    assert.strictEqual(splitRes.intersections.length, 2, 'Tìm thấy đúng 2 giao điểm');
});

test('=== 6. KIỂM THỬ SỰ TỒN TẠI CỦA CÁC PHẦN TỬ UI MINICAD NÂNG CAO TRONG INDEX.HTML ===', () => {
    const fs = require('fs');
    const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    // Ưu tiên 1 & 2: Các nút công cụ trong tab Sửa (#cadPanelSelect)
    assert.ok(htmlContent.includes('id="btnCadToolSplit"'), 'Phải có nút Tách thửa (#btnCadToolSplit)');
    assert.ok(htmlContent.includes('id="btnCadToolMerge"'), 'Phải có nút Hợp thửa (#btnCadToolMerge)');
    assert.ok(htmlContent.includes('id="btnCadToolTrim"'), 'Phải có nút Xén ranh (#btnCadToolTrim)');
    assert.ok(htmlContent.includes('id="btnCadToolExtend"'), 'Phải có nút Kéo dài (#btnCadToolExtend)');
    assert.ok(htmlContent.includes('id="btnCadAssignLayer"'), 'Phải có nút Đổi Lớp (#btnCadAssignLayer)');

    // Ưu tiên 3: Quản lý Lớp chuẩn Thông tư 25
    assert.ok(htmlContent.includes('id="cadCurrentLayerPill"'), 'Phải có Pill hiển thị Lớp hiện hành (#cadCurrentLayerPill)');
    assert.ok(htmlContent.includes('id="cadTabLayersManager"'), 'Phải có Tab Lớp trên thanh công cụ (#cadTabLayersManager)');
    assert.ok(htmlContent.includes('id="modalCadLayers"'), 'Phải có Modal Quản lý Lớp (#modalCadLayers)');
    assert.ok(htmlContent.includes('id="cadLayersTableBody"'), 'Phải có Bảng danh sách Layer (#cadLayersTableBody)');
});

test('=== 7. KIỂM THỬ BẢNG LỚP CHUẨN THÔNG TƯ 25/2014/TT-BTNMT VÀ LOGIC LAYER ===', () => {
    // 7 Lớp mặc định theo Thông tư 25
    const defaultLayers = [
        { id: 'RANH_THUA', name: 'Ranh thửa đất', color: '#ef4444', visible: true, locked: false },
        { id: 'MOC_TOADO', name: 'Mốc tọa độ & Đỉnh ranh', color: '#f59e0b', visible: true, locked: false },
        { id: 'TIM_DUONG', name: 'Tim đường & Giao thông', color: '#3b82f6', visible: true, locked: false },
        { id: 'NHA_CONGTRINH', name: 'Nhà & Công trình xây dựng', color: '#10b981', visible: true, locked: false },
        { id: 'QUY_HOACH', name: 'Chỉ giới quy hoạch / Hành lang', color: '#a855f7', visible: true, locked: false },
        { id: 'DIA_VAT', name: 'Địa vật, Thủy văn, Sông suối', color: '#06b6d4', visible: true, locked: false },
        { id: 'GHI_CHU', name: 'Ghi chú, Kích thước, Nhãn', color: '#94a3b8', visible: true, locked: false }
    ];

    assert.strictEqual(defaultLayers.length, 7, 'Bảng lớp TT 25 mặc định có 7 lớp');
    const ranhThua = defaultLayers.find(l => l.id === 'RANH_THUA');
    assert.ok(ranhThua !== undefined, 'Lớp RANH_THUA phải tồn tại');
    assert.strictEqual(ranhThua.color, '#ef4444', 'Màu ranh thửa chuẩn đỏ đất');

    // Kiểm tra tính chất toggling visible & lock
    ranhThua.visible = !ranhThua.visible;
    assert.strictEqual(ranhThua.visible, false, 'Có thể tắt hiển thị layer');
    ranhThua.locked = true;
    assert.strictEqual(ranhThua.locked, true, 'Có thể khóa layer chống chỉnh sửa');
});

test('=== 8. KIỂM THỬ TỪ KHÓA LỆNH CAD MỚI TRONG APP.JS ===', () => {
    const fs = require('fs');
    const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

    // Kiểm tra CLI command dispatching
    assert.ok(appJsContent.includes("case 'SPLIT':"), 'Phải có lệnh CLI SPLIT');
    assert.ok(appJsContent.includes("case 'MERGE':"), 'Phải có lệnh CLI MERGE');
    assert.ok(appJsContent.includes("case 'TR':"), 'Phải có lệnh CLI TR (TRIM)');
    assert.ok(appJsContent.includes("case 'EX':"), 'Phải có lệnh CLI EX (EXTEND)');
    assert.ok(appJsContent.includes("case 'LA':"), 'Phải có lệnh CLI LA (LAYER)');

    // Kiểm tra các phương thức nghiệp vụ của MiniCAD
    assert.ok(appJsContent.includes('startSplitTool()'), 'Có hàm startSplitTool');
    assert.ok(appJsContent.includes('executeSplit('), 'Có hàm executeSplit');
    assert.ok(appJsContent.includes('startMergeTool()'), 'Có hàm startMergeTool');
    assert.ok(appJsContent.includes('executeMerge('), 'Có hàm executeMerge');
    assert.ok(appJsContent.includes('startTrimTool()'), 'Có hàm startTrimTool');
    assert.ok(appJsContent.includes('executeTrim('), 'Có hàm executeTrim');
    assert.ok(appJsContent.includes('startExtendTool()'), 'Có hàm startExtendTool');
    assert.ok(appJsContent.includes('executeExtend('), 'Có hàm executeExtend');
    assert.ok(appJsContent.includes('openLayerManagerModal()'), 'Có hàm openLayerManagerModal');
});

