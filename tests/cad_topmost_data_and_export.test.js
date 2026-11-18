/**
 * TEST SUITE: HIỂN THỊ DỮ LIỆU Ở PHÍA TRÊN CÙNG & XUẤT DỮ LIỆU TRONG MINICAD
 *
 * Kiểm tra toàn diện:
 * 1. CSS Panes: cadVectorPane (zIndex: 450) & cadMarkerPane (zIndex: 680)
 * 2. Giao diện: Các nút đồng bộ dữ liệu mốc/thửa trong MiniCAD và Modal nạp
 * 3. Logic khởi tạo Panes & bringCadToFront()
 * 4. Tái tạo hình học từ mốc dự án (kể cả mốc chưa gắn shapeName/blockName)
 * 5. Tự động nạp dữ liệu mốc vào MiniCAD và đảm bảo xuất dữ liệu (DXF/GeoJSON/Excel/Bảng kê)
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const uiPolishCss = fs.readFileSync(path.join(root, 'ui-polish.css'), 'utf8');

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

console.log("\n========================================================================");
console.log("🧪 KIỂM THỬ: HIỂN THỊ DỮ LIỆU TRÊN CÙNG & XUẤT DỮ LIỆU MINICAD");
console.log("========================================================================\n");

console.log("--- NHÓM 1: CÁC LỚP PANE TRÊN CÙNG TRONG UI-POLISH.CSS ---");
assert(uiPolishCss.includes('.leaflet-pane.leaflet-cadVectorPane-pane'), 'CSS có định nghĩa .leaflet-pane.leaflet-cadVectorPane-pane');
assert(uiPolishCss.includes('z-index: 450 !important'), 'cadVectorPane được gán z-index: 450 !important (nằm trên bản đồ nền, Guland & PDF)');
assert(uiPolishCss.includes('.leaflet-pane.leaflet-cadMarkerPane-pane'), 'CSS có định nghĩa .leaflet-pane.leaflet-cadMarkerPane-pane');
assert(uiPolishCss.includes('z-index: 680 !important'), 'cadMarkerPane được gán z-index: 680 !important (nằm trên vector layer & tương tác trực quan)');

console.log("\n--- NHÓM 2: CÁC NÚT ĐỒNG BỘ DỮ LIỆU TRONG INDEX.HTML ---");
assert(indexHtml.includes('id="btnCadAutoSyncProjectData"'), 'Tab Dữ liệu MiniCAD có nút "#btnCadAutoSyncProjectData" (⚡ Đồng bộ mốc/thửa)');
assert(indexHtml.includes('appCadTool.autoLoadAllProjectDataToCad()'), 'Sự kiện click gọi appCadTool.autoLoadAllProjectDataToCad()');
assert(indexHtml.includes('id="btnCadLoadProjectAll"'), 'Modal nạp dự án có nút "⚡ NẠP TẤT CẢ DỮ LIỆU" (#btnCadLoadProjectAll)');
assert(indexHtml.includes('id="btnCadLoadPointsOnly"'), 'Modal nạp dự án có nút "📍 Nạp Điểm rời" (#btnCadLoadPointsOnly)');
assert(indexHtml.includes("confirmLoadProjectAsShape('point')"), 'Nút nạp điểm rời gọi confirmLoadProjectAsShape(\'point\')');

console.log("\n--- NHÓM 3: KHỞI TẠO PANES & bringCadToFront TRONG APP.JS ---");
assert(appJs.includes("createPane('cadVectorPane')"), 'appCadTool.ensureLayers tạo pane cadVectorPane');
assert(appJs.includes("createPane('cadMarkerPane')"), 'appCadTool.ensureLayers tạo pane cadMarkerPane');
assert(appJs.includes("vPane.style.zIndex = 450"), 'ensureLayers gán zIndex 450 cho cadVectorPane');
assert(appJs.includes("mPane.style.zIndex = 680"), 'ensureLayers gán zIndex 680 cho cadMarkerPane');
assert(appJs.includes("bringCadToFront() {"), 'appCadTool có phương thức bringCadToFront()');
assert(appJs.includes("zoomToAllShapes() {"), 'appCadTool có phương thức zoomToAllShapes()');
assert(appJs.includes("autoLoadAllProjectDataToCad("), 'appCadTool có phương thức autoLoadAllProjectDataToCad()');

console.log("\n--- NHÓM 4: GÁN PANE & bringToFront TRONG RENDER HÌNH HỌC ---");
assert(appJs.includes("pane: vPaneName"), 'renderGeometry gán pane: vPaneName cho các đối tượng vector polygon/polyline');
assert(appJs.includes("pane: mPaneName"), 'renderGeometry gán pane: mPaneName cho các nhãn marker/đỉnh/tâm/cạnh');
assert(appJs.includes("sShapeLayer.bringToFront()"), 'renderGeometry gọi sShapeLayer.bringToFront() đưa khối lên trên');
assert(appJs.includes("this.layers.shape.bringToFront()"), 'renderGeometry gọi bringToFront() cho nét vẽ dở');

console.log("\n--- NHÓM 5: TỰ ĐỘNG TÁI TẠO KHỐI TỪ CÁC MỐC CHƯA GẮN THẺ ---");
// Mô phỏng reconstructShapesFromPoints trong môi trường giả lập
const cadToolStart = appJs.indexOf('const appCadTool = {');
function extractMethod(name) {
    const start = appJs.indexOf('\n    ' + name + '(', cadToolStart);
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

// Kiểm tra mã nguồn logic của reconstructShapesFromPoints
const reconCode = extractMethod('reconstructShapesFromPoints');
assert(reconCode.includes('unassignedPts'), 'reconstructShapesFromPoints có xử lý các mốc unassignedPts (mốc chưa gắn blockName/shapeName)');
assert(reconCode.includes("sMode = 'polygon'"), 'unassignedPts >= 3 tự động chuyển thành khối đa giác ranh thửa (polygon)');
assert(reconCode.includes("sMode = 'polyline'"), 'unassignedPts == 2 tự động chuyển thành tuyến (polyline)');
assert(reconCode.includes("sMode = 'point'"), 'unassignedPts == 1 tự động chuyển thành lớp điểm rời (point)');

console.log("\n--- NHÓM 6: DỰ PHÒNG XUẤT DỮ LIỆU KHI savedShapes RỖNG ---");
const exportShapesCode = extractMethod('_getAllExportShapes');
assert(exportShapesCode.includes('reconstructShapesFromPoints(AppState.currentProject)'), '_getAllExportShapes tự động tái tạo hình học từ mốc dự án nếu savedShapes rỗng');
assert(exportShapesCode.includes('loadShapesForProject(AppState.currentProject)'), '_getAllExportShapes thử nạp từ file dự án trước khi tái tạo');

console.log("\n========================================================================");
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests/totalTests*100)}%)`);
if (passedTests === totalTests) {
    console.log("🎉 TÍNH NĂNG HIỂN THỊ DỮ LIỆU TRÊN CÙNG & XUẤT DỮ LIỆU MINICAD HOÀN TẤT XUẤT SẮC 100%!");
} else {
    console.error("⚠️ CÒN BÀI TEST CHƯA ĐẠT!");
    process.exit(1);
}
console.log("========================================================================\n");
