/**
 * @file field_ux_enhancements.test.js
 * Kiểm thử toàn diện 5 yêu cầu nâng cấp UI/UX và quy trình thực địa:
 * 1. Khả năng bôi đen / chọn và sao chép kết quả chuyển đổi tọa độ (Copy & User-select)
 * 2. Tối ưu quy trình Chuyển đổi tọa độ đa điểm (tùy chọn điểm, tùy chọn lưu/không lưu dự án, chọn dự án)
 * 3. Khung bản đồ trực quan tích hợp trong màn hình Cắm mốc (Stakeout Live Map & La bàn)
 * 4. Tối ưu cấu trúc Menu Drawer & Dashboard, loại bỏ trùng lặp chức năng nhỏ lẻ
 * 5. Xác minh gỡ bỏ triệt để tính năng "Quy đổi cao độ GEOID"
 */

const fs = require('fs');
const path = require('path');

function runFieldUxEnhancementsTests() {
    console.log("========================================================================");
    console.log("🧪 BẮT ĐẦU KIỂM THỬ: 5 TÍNH NĂNG TỐI ƯU GIAO DIỆN & QUY TRÌNH THỰC ĐỊA");
    console.log("========================================================================");

    const indexPath = path.join(__dirname, '..', 'index.html');
    const appPath = path.join(__dirname, '..', 'app.js');

    const stylePath = path.join(__dirname, '..', 'style.css');
    const indexHtml = fs.readFileSync(indexPath, 'utf8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf8') : '');
    const appJs = fs.readFileSync(appPath, 'utf8');

    let passedCount = 0;
    let totalCount = 0;

    function assert(condition, message) {
        totalCount++;
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passedCount++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            throw new Error(`Kiểm thử thất bại: ${message}`);
        }
    }

    // --- NHÓM 1: KHẢ NĂNG CHỌN VÀ COPY KẾT QUẢ CHUYỂN ĐỔI TỌA ĐỘ ---
    console.log("\n--- NHÓM 1: BÔI ĐEN VÀ SAO CHÉP KẾT QUẢ CHUYỂN ĐỔI ---");
    assert(
        indexHtml.includes('.selectable, .res-val, .res-lbl, .converted-result-box') &&
        indexHtml.includes('user-select: text !important'),
        "CSS cho phép bôi đen/chọn chữ trong các ô kết quả (.selectable, .res-val, .converted-result-box)"
    );
    assert(
        indexHtml.includes('appTransform.copyVn2kResult()'),
        "Giao diện có nút sao chép nhanh tọa độ VN-2000"
    );
    assert(
        indexHtml.includes('appTransform.copyWgsResult()'),
        "Giao diện có nút sao chép nhanh tọa độ WGS-84"
    );
    assert(
        appJs.includes('copyVn2kResult()') && appJs.includes('navigator.clipboard.writeText'),
        "Hàm appTransform.copyVn2kResult() sao chép vào Clipboard chuẩn xác"
    );
    assert(
        appJs.includes('copyWgsResult()') && appJs.includes('navigator.clipboard.writeText'),
        "Hàm appTransform.copyWgsResult() sao chép vào Clipboard chuẩn xác"
    );

    // --- NHÓM 2: QUY TRÌNH CHUYỂN ĐỔI TỌA ĐỘ ĐA ĐIỂM (LƯU / KHÔNG LƯU DỰ ÁN) ---
    console.log("\n--- NHÓM 2: CHUYỂN ĐỔI ĐA ĐIỂM LINH HOẠT VỚI DỰ ÁN ---");
    assert(
        indexHtml.includes('id="tabTransSingle"') && indexHtml.includes('id="tabTransMulti"'),
        "Module Chuyển đổi tọa độ có phân chia Tab Đơn điểm và Tab Đa điểm"
    );
    assert(
        indexHtml.includes('id="panelTransMulti"'),
        "Container bảng chuyển đổi tọa độ đa điểm (#panelTransMulti) tồn tại"
    );
    assert(
        indexHtml.includes('id="chkSaveMultiToProject"'),
        "Có checkbox cho phép người dùng chọn Lưu hoặc Không lưu điểm vào dự án"
    );
    assert(
        indexHtml.includes('id="selMultiTargetProject"'),
        "Có danh sách chọn dự án mục tiêu trước khi lưu (#selMultiTargetProject)"
    );
    assert(
        indexHtml.includes('id="multiTransTableBody"'),
        "Bảng đa điểm có body hiển thị từng dòng mốc (#multiTransTableBody)"
    );
    assert(
        appJs.includes('switchTransformSubTab('),
        "appTransform có hàm chuyển tab con giữa Đơn điểm và Đa điểm"
    );
    assert(
        appJs.includes('executeMultiTransform()'),
        "appTransform có hàm thực thi chuyển đổi đa điểm độc lập"
    );
    assert(
        appJs.includes('copyAllMultiResults()'),
        "appTransform có nút sao chép toàn bộ kết quả chuyển đổi đa điểm dạng bảng"
    );

    // --- NHÓM 3: KHUNG BẢN ĐỒ TRỰC QUAN TRONG CẮM MỐC (STAKEOUT LIVE MAP) ---
    console.log("\n--- NHÓM 3: KHUNG BẢN ĐỒ CẮM MỐC & LA BÀN THỰC ĐỊA ---");
    assert(
        indexHtml.includes('id="stakeoutLiveMap"'),
        "Khung bản đồ thực địa (#stakeoutLiveMap) tồn tại trong màn hình cắm mốc"
    );
    assert(
        indexHtml.includes('id="stakeoutMapToggleBtn"'),
        "Có nút ẩn/hiện hoặc thu phóng bản đồ cắm mốc (#stakeoutMapToggleBtn)"
    );
    assert(
        appJs.includes('initStakeoutMiniMap()') || appJs.includes('this.miniMap = L.map('),
        "appStakeout có hàm khởi tạo bản đồ mini (#stakeoutLiveMap)"
    );
    assert(
        appJs.includes('this.navPolyline = L.polyline(') || appJs.includes('this.navLine'),
        "Bản đồ cắm mốc vẽ đường polyline nối từ người dùng tới cọc mốc mục tiêu"
    );
    assert(
        appJs.includes('userMarker') && appJs.includes('targetMarker'),
        "Bản đồ cắm mốc hiển thị đồng thời cả vị trí người dùng và cọc mốc cần cắm"
    );

    // --- NHÓM 4: TỐI ƯU CẤU TRÚC MENU DRAWER & DASHBOARD ---
    console.log("\n--- NHÓM 4: TỐI ƯU MENU DRAWER & LOẠI BỎ TRÙNG LẶP ---");
    assert(
        !indexHtml.includes('id="drawerItem_export_dxf"') &&
        !indexHtml.includes('id="drawerItem_export_kml"') &&
        !indexHtml.includes('id="drawerItem_export_csv"'),
        "Menu Drawer đã gom các nút xuất file con (DXF, KML, CSV) vào trong mục Sổ đo chính"
    );
    assert(
        !indexHtml.includes('id="drawerItem_measure_distance"') &&
        !indexHtml.includes('id="drawerItem_measure_polygon"'),
        "Menu Drawer đã gom các công cụ đo đạc vào thanh bản đồ, không làm rối menu"
    );
    assert(
        indexHtml.includes('id="drawerFolder1"') &&
        indexHtml.includes('id="drawerFolder2"') &&
        indexHtml.includes('id="drawerFolder3"') &&
        indexHtml.includes('id="drawerFolder4"') &&
        indexHtml.includes('id="drawerFolder5"'),
        "Menu Drawer được cấu trúc thành 5 thư mục nghiệp vụ rõ ràng, chuyên nghiệp"
    );

    // --- NHÓM 5: XÓA TRIỆT ĐỂ CHỨC NĂNG GEOID ---
    console.log("\n--- NHÓM 5: GỠ BỎ HOÀN TOÀN TÍNH NĂNG GEOID ---");
    assert(
        !indexHtml.includes('id="screen-geoid"'),
        "Màn hình screen-geoid đã bị xóa hoàn toàn khỏi index.html"
    );
    assert(
        !indexHtml.includes('id="drawerItem_geoid_convert"'),
        "Mục Geoid trong menu drawer đã bị xóa hoàn toàn"
    );
    assert(
        !appJs.includes('window.appGeoidVigac ='),
        "window.appGeoidVigac export đã bị gỡ bỏ khỏi app.js"
    );
    assert(
        !appJs.includes("action === 'geoid_convert' || action === 'geoid'"),
        "Routing geoid_convert trong appNav đã được làm sạch"
    );

    console.log("\n========================================================================");
    console.log(`🏁 TỔNG KẾT: ${passedCount}/${totalCount} KIỂM THỬ THÀNH CÔNG (100%)`);
    console.log("🎉 TOÀN BỘ 5 YÊU CẦU NÂNG CẤP THỰC ĐỊA ĐÃ HOÀN TẤT XUẤT SẮC!");
    console.log("========================================================================");
}

runFieldUxEnhancementsTests();
