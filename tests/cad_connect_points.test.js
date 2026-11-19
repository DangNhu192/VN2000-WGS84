// tests/cad_connect_points.test.js
// Kiểm thử chức năng Nối các điểm đã lưu / chuyển đổi thành Thửa đất (Polygon) hoặc Tuyến ranh (Polyline) trong MiniCAD

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

test('=== 1. KIỂM THỬ GIAO DIỆN NỐI ĐIỂM MINICAD TRONG INDEX.HTML ===', () => {
    // 1. Nút trên thanh công cụ MiniCAD tab Vẽ
    assert.ok(indexHtml.includes('id="btnCadConnectPoints"'), 'Có nút #btnCadConnectPoints trên thanh công cụ MiniCAD');
    assert.match(indexHtml, /appCadTool\.openConnectPointsModal\(\)/, 'Nút gọi hàm openConnectPointsModal()');

    // 2. Hộp thoại modalCadConnectPoints
    assert.ok(indexHtml.includes('id="modalCadConnectPoints"'), 'Có hộp thoại #modalCadConnectPoints');
    assert.ok(indexHtml.includes('id="cadConnectSourceSelect"'), 'Có dropdown chọn nguồn điểm (MiniCAD, Dự án, Chuyển đổi)');
    assert.ok(indexHtml.includes('id="cadConnectModeSelect"'), 'Có dropdown chọn kiểu đối tượng nối (Đa giác, Tuyến)');
    assert.ok(indexHtml.includes('id="cadConnectOrderSelect"'), 'Có dropdown chọn thứ tự nối (Tự nhiên, Ban đầu, TSP)');
    assert.ok(indexHtml.includes('id="cadConnectLayerSelect"'), 'Có dropdown chọn lớp đối tượng đích');
    assert.ok(indexHtml.includes('id="cadConnectTargetName"'), 'Có ô nhập tên đối tượng nối');
    assert.ok(indexHtml.includes('id="cadConnectPointsTableBody"'), 'Có bảng danh sách các điểm mốc #cadConnectPointsTableBody');
    assert.ok(indexHtml.includes('id="cadConnectSelectedCount"'), 'Có đếm số lượng điểm đã chọn #cadConnectSelectedCount');
});

test('=== 2. KIỂM THỬ TÍCH HỢP LỆNH CADCRAFT CLI VÀ HÀM LOGIC TRONG APP.JS ===', () => {
    // 1. Danh mục lệnh CLI
    assert.ok(appJs.includes("{ cmd: 'NOI'"), 'cadCommandList có lệnh NOI');
    assert.ok(appJs.includes("{ cmd: 'CONNECT'"), 'cadCommandList có lệnh CONNECT');

    // 2. Xử lý lệnh trong executeCommandLine
    assert.ok(/case\s+'NOI':[\s\S]*?case\s+'CONNECT':[\s\S]*?this\.openConnectPointsModal\(\)/.test(appJs),
        'executeCommandLine xử lý các lệnh NOI, CONNECT gọi openConnectPointsModal');

    // 3. Các hàm cốt lõi của tính năng nối điểm
    assert.ok(appJs.includes('getConnectablePoints('), 'appCadTool có hàm getConnectablePoints');
    assert.ok(appJs.includes('openConnectPointsModal('), 'appCadTool có hàm openConnectPointsModal');
    assert.ok(appJs.includes('closeConnectPointsModal('), 'appCadTool có hàm closeConnectPointsModal');
    assert.ok(appJs.includes('sortConnectVertices('), 'appCadTool có hàm sortConnectVertices');
    assert.ok(appJs.includes('executeConnectPoints('), 'appCadTool có hàm executeConnectPoints');
});

test('=== 3. KIỂM THỬ THUẬT TOÁN SẮP XẾP ĐỈNH TỰ NHIÊN VÀ TOÀN TRÌNH NỐI ĐIỂM ===', () => {
    // Tạo môi trường giả lập nhỏ để kiểm tra logic
    const mockCadTool = {
        savedShapes: [],
        layersTable: [{ id: 'RANH_THUA', name: 'Ranh thửa đất' }, { id: 'TIM_TUYEN', name: 'Tim tuyến' }],
        calculateAreaAndPerimeter(verts, mode) {
            // Giả lập tính diện tích Shoelace
            if (mode === 'polygon') {
                let a = 0;
                for (let i = 0; i < verts.length; i++) {
                    const j = (i + 1) % verts.length;
                    a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
                }
                const area = Math.abs(a) / 2;
                return { area, areaFormatted: area.toFixed(2), perimeter: 100, perimeterFormatted: '100.00' };
            }
            return { area: 0, perimeter: 80, perimeterFormatted: '80.00' };
        }
    };

    // Kiểm tra sortConnectVertices theo thứ tự tự nhiên (natural)
    const rawPoints = [
        { name: 'Đ10', x: 100, y: 200, lat: 10.1, lng: 106.1 },
        { name: 'Đ2', x: 50, y: 150, lat: 10.2, lng: 106.2 },
        { name: 'Đ1', x: 0, y: 100, lat: 10.3, lng: 106.3 },
        { name: 'Đ3', x: 80, y: 180, lat: 10.4, lng: 106.4 }
    ];

    // Trích xuất hàm sortConnectVertices từ mã nguồn app.js
    const sortMatch = appJs.match(/sortConnectVertices\(verts,\s*orderType\s*=\s*'natural',\s*isPolygon\s*=\s*true\)\s*\{([\s\S]*?)\n\s*\},/);
    assert.ok(sortMatch, 'Trích xuất được hàm sortConnectVertices');

    const sortFn = new Function('verts', 'orderType', 'isPolygon', sortMatch[1]);
    const sorted = sortFn(rawPoints, 'natural', true);

    assert.equal(sorted[0].name, 'Đ1');
    assert.equal(sorted[1].name, 'Đ2');
    assert.equal(sorted[2].name, 'Đ3');
    assert.equal(sorted[3].name, 'Đ10');
});
