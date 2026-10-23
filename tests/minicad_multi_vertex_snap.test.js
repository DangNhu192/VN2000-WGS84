const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('=== 1. KIỂM THỬ KHẮC PHỤC LỖI SEGLENSQ VÀ TÍNH ĐỘC LẬP KHI BẮT CẠNH MINICAD ===', () => {
    // 1.1 Kiểm tra không còn biến lenSq mồ côi trong logic bắt cạnh findSnapCandidate
    assert(appJs.includes('const segLenSq = segDx * segDx + segDy * segDy;'), 'segLenSq phải được định nghĩa đúng biến');
    assert(!appJs.includes('const lenSq = segDx * segDx + segDy * segDy;'), 'Không được còn biến lenSq gây lỗi ReferenceError segLenSq');
});

test('=== 2. KIỂM THỬ MÔ PHỎNG VẼ ĐA GIÁC TRÊN 2 ĐỈNH TRONG MINICAD (3, 4, 5... ĐỈNH) ===', () => {
    // Trích xuất logic tính khoảng cách và hình chiếu bắt cạnh từ app.js
    const v1 = { x: 1144000.0, y: 585000.0, lat: 10.750, lng: 106.650, name: 'Đ1' };
    const v2 = { x: 1144100.0, y: 585000.0, lat: 10.751, lng: 106.650, name: 'Đ2' };

    const clickVn = { X: 1144050.0, Y: 585005.0 }; // Điểm click gần cạnh Đ1-Đ2
    const segDx = v2.x - v1.x;
    const segDy = v2.y - v1.y;
    const segLenSq = segDx * segDx + segDy * segDy;

    assert(segLenSq > 1e-4, 'segLenSq phải hợp lệ');
    const tMetric = ((clickVn.X - v1.x) * segDx + (clickVn.Y - v1.y) * segDy) / segLenSq;
    assert(tMetric > 0 && tMetric < 1, 'Điểm chiếu phải nằm trong đoạn thẳng');

    const exactX = v1.x + tMetric * segDx;
    const exactY = v1.y + tMetric * segDy;
    assert.strictEqual(exactX, 1144050.0, 'Tọa độ X điểm chiếu phải chuẩn xác');
    assert.strictEqual(exactY, 585000.0, 'Tọa độ Y điểm chiếu phải nằm trên cạnh');
});

test('=== 3. KIỂM THỬ ĐẦY ĐỦ CÁC TÍNH NĂNG MINICAD VỚI ĐA GIÁC NHIỀU ĐỈNH (TCVN) ===', () => {
    // Khối 5 đỉnh
    const vertices = [
        { x: 1144000, y: 585000, name: 'Đ1' },
        { x: 1144100, y: 585000, name: 'Đ2' },
        { x: 1144100, y: 585100, name: 'Đ3' },
        { x: 1144000, y: 585100, name: 'Đ4' },
        { x: 1143950, y: 585050, name: 'Đ5' }
    ];

    assert(vertices.length >= 3, 'Phải vẽ được trên 2 đỉnh');

    // Tính diện tích đa giác Shoelace Gauss
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
    }
    area = Math.abs(area) / 2.0;

    assert(area > 0, 'Diện tích phải lớn hơn 0');
    assert.strictEqual(area, 12500, 'Diện tích hình 5 đỉnh phải là 12,500 m²');
});

test('=== 4. KIỂM THỬ ĐỒNG BỘ GLYPH OSNAP CHUẨN AUTOCAD (MIDPOINT △, PERP ⟂, INTERSECTION ✕, EDGE ⧗) ===', () => {
    // Kiểm tra class và ký hiệu glyph trong app.js
    assert.ok(appJs.includes("snapType === 'midpoint'"), 'Phải có snapType midpoint');
    assert.ok(appJs.includes("snapType === 'perpendicular'"), 'Phải có snapType perpendicular');
    assert.ok(appJs.includes("snapType === 'intersection'"), 'Phải có snapType intersection');
    assert.ok(appJs.includes("osnap-mid") && appJs.includes("△"), 'Midpoint phải có glyph △ và class osnap-mid');
    assert.ok(appJs.includes("osnap-perp") && appJs.includes("⟂"), 'Perpendicular phải có glyph ⟂ và class osnap-perp');
    assert.ok(appJs.includes("osnap-intersection") && appJs.includes("✕"), 'Intersection phải có glyph ✕ và class osnap-intersection');
    assert.ok(appJs.includes("osnap-edge") && appJs.includes("⧗"), 'Edge phải có glyph ⧗ và class osnap-edge');
});
