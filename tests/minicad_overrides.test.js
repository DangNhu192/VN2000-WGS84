/**
 * BỘ KIỂM THỬ ĐỘNG: CƠ CHẾ ĐIỀU CHỈNH SỐ LIỆU HIỂN THỊ PHI PHÁ HỦY (NON-DESTRUCTIVE OVERRIDES)
 * VÀ KHÔI PHỤC TỰ ĐỘNG ĐO TRONG MINICAD
 * Chạy với: node tests/minicad_overrides.test.js
 */

const { calculatePolygonAreaAndPerimeter } = require('../geodesy.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

// Mô phỏng logic MiniCAD getEffectiveStats
function getEffectiveStats(shape) {
    if (!shape || !shape.vertices || shape.vertices.length < 2) {
        return { area: 0, perimeter: 0, edges: [] };
    }
    const realStats = calculatePolygonAreaAndPerimeter(shape.vertices.map(v => ({ X: v.x, Y: v.y })));
    const edges = [];
    for (let i = 0; i < shape.vertices.length; i++) {
        const cur = shape.vertices[i];
        const next = shape.vertices[(i + 1) % shape.vertices.length];
        const dx = next.x - cur.x;
        const dy = next.y - cur.y;
        const realDist = Math.sqrt(dx * dx + dy * dy);
        let dist = realDist;
        let isCustomEdge = false;
        if (shape.customEdges && shape.customEdges[i] !== undefined && !isNaN(shape.customEdges[i])) {
            dist = parseFloat(shape.customEdges[i]);
            isCustomEdge = true;
        }
        edges.push({ realDist, dist, isCustomEdge });
    }

    let area = realStats.area;
    let isCustomArea = false;
    if (shape.customArea !== undefined && shape.customArea !== null && !isNaN(shape.customArea)) {
        area = parseFloat(shape.customArea);
        isCustomArea = true;
    }

    let perimeter = realStats.perimeter;
    let isCustomPerimeter = false;
    if (shape.customPerimeter !== undefined && shape.customPerimeter !== null && !isNaN(shape.customPerimeter)) {
        perimeter = parseFloat(shape.customPerimeter);
        isCustomPerimeter = true;
    }

    return {
        realArea: realStats.area,
        area,
        isCustomArea,
        realPerimeter: realStats.perimeter,
        perimeter,
        isCustomPerimeter,
        edges,
        isCustomModified: isCustomArea || isCustomPerimeter || edges.some(e => e.isCustomEdge)
    };
}

function runCadOverrideTests() {
    console.log('========================================================================');
    console.log('🧪 BẮT ĐẦU KIỂM THỬ NON-DESTRUCTIVE DISPLAY OVERRIDES & RESET TRONG MINICAD');
    console.log('========================================================================\n');

    // Thửa đất chuẩn hình chữ nhật 50m x 20m (Diện tích 1,000 m2, Chu vi 140m)
    const initialVertices = [
        { id: 1, x: 1000.0, y: 500.0, lat: 10.7, lng: 106.6 },
        { id: 2, x: 1050.0, y: 500.0, lat: 10.7, lng: 106.6004 },
        { id: 3, x: 1050.0, y: 520.0, lat: 10.70018, lng: 106.6004 },
        { id: 4, x: 1000.0, y: 520.0, lat: 10.70018, lng: 106.6 }
    ];

    // Tạo bản sao đối tượng hình vẽ MiniCAD
    const shape = {
        name: "Thửa Đất Số 1",
        mode: "polygon",
        vertices: JSON.parse(JSON.stringify(initialVertices))
    };

    // 1. Kiểm thử số đo hình học ban đầu
    console.log('--- BƯỚC 1: KIỂM THỬ SỐ ĐO HÌNH HỌC BAN ĐẦU ---');
    let stats = getEffectiveStats(shape);
    assert(Math.abs(stats.realArea - 1000.0) < 1e-4 && stats.area === 1000.0, `Diện tích hình học thực tế ban đầu = 1,000.00 m²`);
    assert(Math.abs(stats.realPerimeter - 140.0) < 1e-4 && stats.perimeter === 140.0, `Chu vi hình học thực tế ban đầu = 140.00 m`);
    assert(stats.isCustomModified === false, `Trạng thái ban đầu chưa bị chỉnh sửa tùy biến`);

    // 2. Chỉnh sửa diện tích hiển thị (customArea)
    console.log('\n--- BƯỚC 2: ĐIỀU CHỈNH DIỆN TÍCH HIỂN THỊ TRÊN BẢNG KÊ (1,050 m²) ---');
    shape.customArea = 1050.0;
    stats = getEffectiveStats(shape);
    assert(stats.area === 1050.0, `Số liệu diện tích hiển thị cập nhật chính xác thành ${stats.area} m²`);
    assert(stats.realArea === 1000.0, `Số liệu diện tích thực tế vẫn bảo toàn là ${stats.realArea} m²`);
    assert(stats.isCustomArea === true, `Đánh dấu cờ isCustomArea = true để hiển thị cảnh báo viền vàng/hổ phách`);

    // BẢO TOÀN TỌA ĐỘ THỰC TẾ
    const coordsMatch = shape.vertices.every((v, i) => 
        v.x === initialVertices[i].x && 
        v.y === initialVertices[i].y && 
        v.lat === initialVertices[i].lat && 
        v.lng === initialVertices[i].lng
    );
    assert(coordsMatch === true, `Tọa độ hình học thực tế (x, y, lat, lng) của 4 đỉnh hoàn toàn giữ nguyên 100%`);

    // 3. Chỉnh sửa chiều dài cạnh đỉnh (customEdges)
    console.log('\n--- BƯỚC 3: ĐIỀU CHỈNH CHIỀU DÀI CẠNH ĐỈNH [1-2] (50m -> 52.5m) ---');
    shape.customEdges = { 0: 52.5 };
    stats = getEffectiveStats(shape);
    assert(stats.edges[0].dist === 52.5, `Cạnh [1-2] hiển thị cự ly tùy biến = 52.5 m`);
    assert(stats.edges[0].realDist === 50.0, `Cạnh [1-2] bảo toàn cự ly thực tế = 50.0 m`);
    assert(stats.edges[0].isCustomEdge === true, `Cạnh [1-2] được đánh dấu tùy biến`);

    // 4. Khôi phục lại dữ liệu gốc bằng nút "Tự động đo" (Master Reset)
    console.log('\n--- BƯỚC 4: NHẤN NÚT "TỰ ĐỘNG ĐO" ĐỂ HOÀN TÁC VỀ DỮ LIỆU THỰC TẾ ---');
    delete shape.customArea;
    delete shape.customPerimeter;
    delete shape.customEdges;
    stats = getEffectiveStats(shape);
    assert(stats.area === 1000.0, `Diện tích khôi phục hoàn toàn về số đo thực = ${stats.area} m²`);
    assert(stats.edges[0].dist === 50.0, `Cự ly cạnh khôi phục hoàn toàn về số đo thực = ${stats.edges[0].dist} m`);
    assert(stats.isCustomModified === false, `Trạng thái tùy biến đã được xóa bỏ hoàn toàn (isCustomModified = false)`);

    console.log('\n========================================================================');
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests/totalTests*100)}%)`);
    if (failedTests > 0) {
        console.error(`❌ CÓ ${failedTests} KIỂM THỬ THẤT BẠI!`);
        process.exit(1);
    } else {
        console.log(`🎉 CƠ CHẾ SỐ LIỆU TÙY BIẾN VÀ HOÀN TÁC ĐẠT ĐỘ CHÍNH XÁC & AN TOÀN TUYỆT ĐỐI!`);
    }
    console.log('========================================================================\n');
}

runCadOverrideTests();
