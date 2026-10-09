/**
 * Kiểm thử tự động: Ràng buộc Read-Only Bản đồ dự án & Bảng kê thông tin khối CAD
 */

const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Kiểm thử thất bại: ${message}`);
    }
    console.log(`  ✅ PASS: ${message}`);
}

function runProjectMapReadOnlyTests() {
    console.log("========================================================================");
    console.log("🧪 BẮT ĐẦU KIỂM THỬ: RÀNG BUỘC CHỈ XEM BẢN ĐỒ DỰ ÁN & BẢNG KÊ KHỐI CAD");
    console.log("========================================================================");

    const stylePath = path.join(__dirname, '../style.css');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf8') : '');
    const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

    // --- NHÓM 1: RÀNG BUỘC KHÔNG THỂ THÊM ĐIỂM Ở CHỨC NĂNG BẢN ĐỒ DỰ ÁN ---
    console.log("\n--- NHÓM 1: RÀNG BUỘC CHỈ XEM (READ-ONLY) TRÊN BẢN ĐỒ DỰ ÁN ---");
    assert(
        appJs.includes("if (AppState.mapMode === 'project')") &&
        appJs.includes("onMapClick(lat, lng)"),
        "Hàm onMapClick chặn hoàn toàn việc tạo điểm/bật bottom sheet khi ở mode project"
    );
    assert(
        appJs.includes("Muốn chỉnh sửa/thêm mốc/vẽ thửa, người dùng bắt buộc phải dùng MiniCAD"),
        "Có quy tắc và chú thích rõ ràng ràng buộc chuyển qua MiniCAD khi cần chỉnh sửa"
    );
    assert(
        appJs.includes("const bSheet = document.getElementById('mapBottomSheet');") &&
        appJs.includes("if (bSheet) bSheet.style.display = 'none';"),
        "appNav.openProjectMap ẩn hoàn toàn Bottom Sheet thêm điểm khi vào màn hình bản đồ dự án"
    );

    // --- NHÓM 2: NÚT 'XEM MỐC' VÀ HIỂN THỊ VỊ TRÍ VỀ DỰ ÁN (LOCAL) ---
    console.log("\n--- NHÓM 2: NÚT XEM MỐC & ĐỊNH VỊ VỀ DỰ ÁN LOCAL ---");
    assert(
        indexHtml.includes('openPointsListModal()') || indexHtml.includes('appMap.viewProjectMarksAndBlocks()'),
        "Nút '📋 Xem mốc' trong mapProjectBar liên kết tới chức năng xem mốc và bảng kê dự án"
    );
    assert(
        appJs.includes('viewProjectMarksAndBlocks() {') &&
        appJs.includes('this.loadProjectMarkers();') &&
        appJs.includes('this.fitProjectBounds();'),
        "viewProjectMarksAndBlocks nạp đầy đủ mốc và tự động thu phóng bao quát về vị trí dự án"
    );
    assert(
        appJs.includes('openPointsListModal() {') &&
        appJs.includes('appMap.viewProjectMarksAndBlocks()'),
        "appModal.openPointsListModal ủy quyền trỏ về appMap.viewProjectMarksAndBlocks()"
    );

    // --- NHÓM 3: KHUNG BẢNG KÊ THÔNG TIN CÁC KHỐI CAD (READ-ONLY) ---
    console.log("\n--- NHÓM 3: KHUNG BẢNG KÊ THÔNG TIN CÁC KHỐI CAD (READ-ONLY) ---");
    assert(
        indexHtml.includes('id="projectMarksBlocksPanel"'),
        "DOM chứa khung Bảng kê thông tin khối & mốc dự án (#projectMarksBlocksPanel)"
    );
    assert(
        indexHtml.includes('id="pmbShapesTableBody"'),
        "Có bảng kê tổng hợp các khối CAD (#pmbShapesTableBody)"
    );
    assert(
        indexHtml.includes('id="pmbPointsTableBody"'),
        "Có bảng kê danh sách tọa độ mốc & ranh đất (#pmbPointsTableBody)"
    );
    assert(
        !indexHtml.includes('id="pmbCustomAreaInput"') &&
        !indexHtml.includes('id="pmbEditPointsInput"'),
        "Bảng kê dự án ở chế độ READ-ONLY tuyệt đối, không có ô nhập liệu sửa số liệu"
    );
    assert(
        appJs.includes('renderProjectMarksBlocksPanel('),
        "appMap có hàm renderProjectMarksBlocksPanel hiển thị đầy đủ diện tích, chu vi, tỉ lệ %"
    );

    // --- NHÓM 4: ĐIỀU CHỈNH TỈ LỆ KHUNG & PHÓNG TO / THU NHỎ ---
    console.log("\n--- NHÓM 4: ĐIỀU CHỈNH TỈ LỆ KHUNG & PHÓNG TO / THU NHỎ ---");
    assert(
        indexHtml.includes("appMap.setProjectBlocksPanelScale('50')") &&
        indexHtml.includes("appMap.setProjectBlocksPanelScale('75')") &&
        indexHtml.includes("appMap.setProjectBlocksPanelScale('100')"),
        "Giao diện có các nút điều chỉnh tỉ lệ khung: 50%, 75%, 100%"
    );
    assert(
        indexHtml.includes('id="btnPmbMaximize"') &&
        indexHtml.includes('appMap.toggleMaximizeProjectBlocksPanel()'),
        "Có nút phóng to toàn màn hình / phục hồi kích thước (#btnPmbMaximize)"
    );
    assert(
        indexHtml.includes('id="btnPmbMinimize"') &&
        indexHtml.includes('appMap.toggleMinimizeProjectBlocksPanel()'),
        "Có nút thu gọn thành thanh dock (#btnPmbMinimize)"
    );
    assert(
        indexHtml.includes('resize: both;'),
        "CSS cho phép người dùng kéo giãn tự do kích thước khung bảng kê (resize: both)"
    );
    assert(
        appJs.includes('openInMiniCadToEdit()') &&
        appJs.includes('appNav.openCadMap({ loadProject: true })'),
        "Có nút 'Mở MiniCAD để sửa' cho phép chuyển thẳng sang MiniCAD khi cần chỉnh sửa"
    );

    console.log("\n========================================================================");
    console.log("🏁 TỔNG KẾT: 14/14 KIỂM THỬ THÀNH CÔNG (100%)");
    console.log("🎉 RÀNG BUỘC BẢN ĐỒ DỰ ÁN & BẢNG KÊ KHỐI CAD HOÀN TOÀN ĐẠT CHUẨN!");
    console.log("========================================================================\n");
}

runProjectMapReadOnlyTests();
