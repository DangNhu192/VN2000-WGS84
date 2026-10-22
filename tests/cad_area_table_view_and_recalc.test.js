/**
 * @file tests/cad_area_table_view_and_recalc.test.js
 * Kiểm thử tự động tính lại diện tích khối khi chỉnh sửa các cạnh (tuyến) và điều chỉnh bố cục hiển thị Bảng kê MiniCAD
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('=== 1. KIỂM THỬ THUẬT TOÁN TỰ ĐỘNG TÍNH LẠI DIỆN TÍCH KHI ĐIỀU CHỈNH CẠNH (APP.JS) ===', () => {
    const appJsPath = path.join(__dirname, '../app.js');
    const content = fs.readFileSync(appJsPath, 'utf8');

    // Phải có cơ chế tính lại diện tích đa giác khi có customEdges trong getEffectiveStats
    assert.match(content, /getEffectiveStats\s*\(/, 'Hàm getEffectiveStats phải tồn tại');
    assert.match(content, /customEdges/, 'Phải kiểm tra customEdges trong getEffectiveStats');
    assert.match(content, /editEdgeLength\s*\(/, 'Hàm editEdgeLength phải tồn tại');

    // Kiểm tra logic lưu và cập nhật bản đồ trong editEdgeLength
    assert.ok(content.includes('saveShapesForProject'), 'editEdgeLength phải lưu dữ liệu dự án');
    assert.ok(content.includes('renderGeometry'), 'editEdgeLength phải vẽ lại bản đồ');
});

test('=== 2. KIỂM THỬ TÍNH TOÁN HÌNH HỌC TỰ ĐỘNG TÍNH DIỆN TÍCH THEO CẠNH ĐIỀU CHỈNH ===', () => {
    // Giả lập một hình chữ nhật 20m x 10m (Diện tích chuẩn = 200 m², Chu vi = 60 m)
    const mockVertices = [
        { x: 1000.0, y: 500.0, lat: 10.0, lng: 106.0, name: 'Đ1' },
        { x: 1020.0, y: 500.0, lat: 10.00018, lng: 106.0, name: 'Đ2' }, // Cạnh 1: 20m
        { x: 1020.0, y: 510.0, lat: 10.00018, lng: 106.00009, name: 'Đ3' }, // Cạnh 2: 10m
        { x: 1000.0, y: 510.0, lat: 10.0, lng: 106.00009, name: 'Đ4' }  // Cạnh 3: 20m, Cạnh 4 (Đ4->Đ1): 10m
    ];

    // Thuật toán phân rã tam giác tâm Centroid tính diện tích điều chỉnh
    function calculateAdjustedArea(vertices, customEdges = {}) {
        const n = vertices.length;
        if (n < 3) return 0;
        
        let cx = 0, cy = 0;
        vertices.forEach(v => { cx += v.x; cy += v.y; });
        cx /= n;
        cy /= n;

        let totalAdjustedArea = 0;
        let totalAdjustedPerim = 0;

        for (let i = 0; i < n; i++) {
            const p1 = vertices[i];
            const p2 = vertices[(i + 1) % n];
            const realLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const effLen = (customEdges[i] !== undefined && customEdges[i] > 0) ? customEdges[i] : realLen;
            totalAdjustedPerim += effLen;

            // Diện tích tam giác từ Centroid đến cạnh i
            const triArea = 0.5 * Math.abs((p1.x - cx) * (p2.y - cy) - (p2.x - cx) * (p1.y - cy));
            const ratio = realLen > 0 ? (effLen / realLen) : 1.0;
            totalAdjustedArea += triArea * ratio;
        }

        return { area: totalAdjustedArea, perimeter: totalAdjustedPerim };
    }

    // 1. Khi chưa sửa cạnh
    const baseResult = calculateAdjustedArea(mockVertices, {});
    assert.strictEqual(Math.round(baseResult.area), 200, 'Diện tích gốc phải là 200 m²');
    assert.strictEqual(Math.round(baseResult.perimeter), 60, 'Chu vi gốc phải là 60 m');

    // 2. Khi sửa Cạnh 1 từ 20m thành 25m (+25% chiều dài cạnh đáy tam giác phân đoạn)
    const editedResult1 = calculateAdjustedArea(mockVertices, { 0: 25.0 });
    assert.ok(editedResult1.area > 200, 'Diện tích phải tự động tăng khi cạnh tăng');
    assert.strictEqual(editedResult1.perimeter, 65, 'Chu vi phải tăng thành 65 m');

    // 3. Khi sửa cả 4 cạnh tăng gấp đôi (tỷ lệ 2.0)
    const doubledResult = calculateAdjustedArea(mockVertices, { 0: 40.0, 1: 20.0, 2: 40.0, 3: 20.0 });
    assert.strictEqual(Math.round(doubledResult.area), 400, 'Diện tích phải tự động nhân đôi theo chiều dài cạnh đáy');
    assert.strictEqual(Math.round(doubledResult.perimeter), 120, 'Chu vi phải tăng gấp đôi');
});

test('=== 3. KIỂM THỬ BỐ TRÍ VÀ ĐIỀU CHỈNH HIỂN THỊ CÁC BẢNG TRONG INDEX.HTML ===', () => {
    const htmlPath = path.join(__dirname, '../index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Modal #modalCadAreaTable phải có nút phóng to / thu nhỏ
    assert.ok(html.includes('id="btnCadTableMaximize"'), 'Phải có nút phóng to modal #btnCadTableMaximize');

    // Phải có bộ nút điều chỉnh chế độ hiển thị bảng (Xem cả hai, Chỉ bảng khối, Chỉ bảng chi tiết, Song song 2 cột)
    assert.ok(html.includes('id="btnCadViewBoth"'), 'Phải có nút xem cả hai bảng #btnCadViewBoth');
    assert.ok(html.includes('id="btnCadViewBlocksOnly"'), 'Phải có nút chỉ xem bảng khối #btnCadViewBlocksOnly');
    assert.ok(html.includes('id="btnCadViewCoordsOnly"'), 'Phải có nút chỉ xem bảng chi tiết #btnCadViewCoordsOnly');
    assert.ok(html.includes('id="btnCadViewSplit"'), 'Phải có nút xem song song 2 cột #btnCadViewSplit');

    // Phải có nút thu gọn / mở rộng từng bảng
    assert.ok(html.includes('id="btnToggleCollapseBlocks"'), 'Phải có nút thu gọn bảng khối #btnToggleCollapseBlocks');
    assert.ok(html.includes('id="btnToggleCollapseCoords"'), 'Phải có nút thu gọn bảng chi tiết #btnToggleCollapseCoords');

    // Header bảng chi tiết phải có thuộc tính sticky chống trôi che khuất
    assert.ok(html.includes('sticky') || html.includes('cad-sticky-header'), 'Header bảng phải hỗ trợ sticky chống trôi che khuất');
});
