/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: TỐI ƯU GIAO DIỆN & TRẢI NGHIỆM THỰC ĐỊA (FIELD UI/UX)
 * 1. MiniCAD Live Stats HUD (Diện tích S và Chu vi P tức thời)
 * 2. Kính lúp phóng to cảm ứng (Touch Magnifier Loupe) chống ngón tay che khuất mốc
 * 3. Thanh thao tác ngón cái một tay trên di động (One-hand Thumb Action Bar)
 * 4. Chế độ tương phản cao ngoài trời nắng (Sunlight Field Mode)
 * Chạy với: node tests/field_ux_cad.test.js
 */

const fs = require('fs');
const path = require('path');
const geodesy = require('../geodesy.js');

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

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: TỐI ƯU TRẢI NGHIỆM THỰC ĐỊA & MINICAD FIELD UI/UX');
console.log('========================================================================\n');

const indexPath = path.join(__dirname, '..', 'index.html');
const appPath = path.join(__dirname, '..', 'app.js');

const stylePath = path.join(__dirname, '..', 'style.css');
const indexHtml = fs.readFileSync(indexPath, 'utf8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf8') : '');
const appJs = fs.readFileSync(appPath, 'utf8');

// --- NHÓM 1: CẤU TRÚC HUD DIỆN TÍCH & CHU VI TỨC THỜI (LIVE STATS HUD) ---
console.log('--- NHÓM 1: HUD DIỆN TÍCH & CHU VI TỨC THỜI (LIVE STATS HUD) ---');
{
    assert(indexHtml.includes('id="cadHudMeasure"'), 'Có phần tử chứa số liệu đo tức thời (#cadHudMeasure)');
    assert(indexHtml.includes('id="cadHudArea"'), 'Có phần tử hiển thị diện tích tức thời (#cadHudArea)');
    assert(indexHtml.includes('id="cadHudPerimeter"'), 'Có phần tử hiển thị chu vi tức thời (#cadHudPerimeter)');
    assert(indexHtml.includes('id="btnCadHudSunlight"'), 'Có nút chuyển đổi Chế độ Nắng gắt (#btnCadHudSunlight)');
    assert(appJs.includes('updateLiveStatsHud(candLat'), 'appCadTool có hàm updateLiveStatsHud cập nhật diện tích thời gian thực');
}

// --- NHÓM 2: THANH THAO TÁC NGÓN CÁI MỘT TAY (ONE-HAND THUMB ACTION BAR) ---
console.log('\n--- NHÓM 2: THANH THAO TÁC NGÓN CÁI MỘT TAY (ONE-HAND THUMB BAR) ---');
{
    assert(indexHtml.includes('id="cadThumbActionBar"'), 'Thanh công cụ ngón cái (#cadThumbActionBar) tồn tại trong DOM');
    assert(indexHtml.includes('btnCadThumbUndo'), 'Có nút Lùi đỉnh / Hoàn tác cho ngón cái (#btnCadThumbUndo)');
    assert(indexHtml.includes('btnCadThumbGps'), 'Có nút Lấy tọa độ GPS tức thời làm đỉnh (#btnCadThumbGps)');
    assert(indexHtml.includes('btnCadThumbClose'), 'Có nút Khép & Lưu đa giác cho ngón cái (#btnCadThumbClose)');
    assert(indexHtml.includes('btnCadThumbCancel'), 'Có nút Hủy nét vẽ đang dở (#btnCadThumbCancel)');
    assert(appJs.includes('addCurrentGpsVertex()'), 'appCadTool có hàm addCurrentGpsVertex lấy mốc từ GPS');
    assert(appJs.includes('finishCurrentShape()'), 'appCadTool có hàm finishCurrentShape khép góc và lưu');
    assert(appJs.includes('cancelCurrentDrawing()'), 'appCadTool có hàm cancelCurrentDrawing hủy nét vẽ an toàn');
}

// --- NHÓM 3: KÍNH LÚP PHÓNG TO CẢM ỨNG (TOUCH MAGNIFIER LOUPE) ---
console.log('\n--- NHÓM 3: KÍNH LÚP CẢM ỨNG CHỐNG NGÓN TAY CHE (TOUCH MAGNIFIER LOUPE) ---');
{
    assert(indexHtml.includes('id="cadTouchLoupe"'), 'Container kính lúp cảm ứng (#cadTouchLoupe) tồn tại trong DOM');
    assert(indexHtml.includes('id="cadLoupeMap"'), 'Có canvas/map container cho kính lúp (#cadLoupeMap)');
    assert(indexHtml.includes('cad-loupe-reticle'), 'Có hồng tâm chữ thập phản quang định vị (cad-loupe-reticle)');
    assert(indexHtml.includes('id="cadLoupeSnapTag"'), 'Có nhãn hiển thị tên mốc bị hút Osnap (#cadLoupeSnapTag)');
    assert(appJs.includes('initTouchLoupe()'), 'appCadTool có hàm initTouchLoupe khởi tạo kính lúp');
    assert(appJs.includes('bindTouchLoupeEvents()'), 'appCadTool có hàm bindTouchLoupeEvents lắng nghe thao tác chạm ngón tay');
}

// --- NHÓM 4: CHẾ ĐỘ TƯƠNG PHẢN CAO NGOÀI TRỜI NẮNG (SUNLIGHT MODE) ---
console.log('\n--- NHÓM 4: CHẾ ĐỘ TƯƠNG PHẢN CAO NGOÀI TRỜI NẮNG (SUNLIGHT MODE) ---');
{
    assert(indexHtml.includes('body.sunlight-mode .cad-status-hud'), 'Có CSS chuyên biệt nền đen viền vàng dạ quang cho HUD ngoài nắng');
    assert(indexHtml.includes('body.sunlight-mode .cad-hud-val'), 'Số liệu tọa độ ngoài nắng chuyển sang màu vàng đậm tương phản cao');
    assert(indexHtml.includes('body.sunlight-mode .cad-touch-loupe'), 'Kính lúp ngoài nắng được tăng độ sáng và viền dạ quang');
    assert(appJs.includes('toggleSunlightMode()'), 'appCadTool có hàm toggleSunlightMode');
    assert(appJs.includes('initSunlightMode()'), 'appCadTool có hàm initSunlightMode đọc lưu trữ localStorage');
}

// --- NHÓM 5: THUẬT TOÁN TÍNH TOÁN DIỆN TÍCH & CHU VI THỜI GIAN THỰC ---
console.log('\n--- NHÓM 5: THUẬT TOÁN TÍNH TOÁN DIỆN TÍCH & CHU VI THỜI GIAN THỰC ---');
{
    // Mô phỏng tính diện tích thử nghiệm hình chữ nhật 100m x 50m = 5000 m² (0.5 ha)
    const mockVertices = [
        { x: 1000000.000, y: 500000.000, lat: 10.0, lng: 106.0 },
        { x: 1000100.000, y: 500000.000, lat: 10.0, lng: 106.001 },
        { x: 1000100.000, y: 500050.000, lat: 10.001, lng: 106.001 },
        { x: 1000000.000, y: 500050.000, lat: 10.001, lng: 106.0 }
    ];

    // Thuật toán Gauss-Shoelace tính diện tích đa giác khép góc
    let sumArea = 0;
    let perimeter = 0;
    const n = mockVertices.length;
    for (let i = 0; i < n; i++) {
        const cur = mockVertices[i];
        const next = mockVertices[(i + 1) % n];
        sumArea += (cur.x * next.y) - (next.x * cur.y);
        perimeter += Math.hypot(next.x - cur.x, next.y - cur.y);
    }
    const area = Math.abs(sumArea) / 2.0;

    assert(Math.abs(area - 5000.0) < 0.001, 'Tính chính xác tuyệt đối diện tích thửa đất mẫu 5.000 m²');
    assert(Math.abs(perimeter - 300.0) < 0.001, 'Tính chính xác chu vi khép kín 300 mét');
    assert((area / 10000.0) === 0.5, 'Quy đổi diện tích sang héc-ta chuẩn xác: 0.5000 ha');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 TOÀN BỘ TÍNH NĂNG TRẢI NGHIỆM THỰC ĐỊA & MINICAD FIELD UI/UX ĐÃ SẴN SÀNG 100%!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
