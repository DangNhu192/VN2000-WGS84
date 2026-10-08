/**
 * BỘ KIỂM THỬ TỰ ĐỘNG PHÂN CHIA RÀNH MẠCH GIAO DIỆN CÁC PHÂN HỆ
 * 1. Chuyển đổi tọa độ: Chấm chọn điểm đơn / đa điểm độc lập
 * 2. Bản đồ dự án: Chỉ hiện nạp dữ liệu và xem dự án, không chứa nút vẽ CAD / đo khoảng cách
 * 3. MiniCAD: Tập trung công cụ hỗ trợ vẽ MiniCAD, không chồng chéo với dự án hay chấm điểm
 * 4. Không dùng chung các nút chức năng giữa các module
 * Chạy với: node tests/ui_partitioning.test.js
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
console.log('🧪 BẮT ĐẦU KIỂM THỬ: PHÂN CHIA RÀNH MẠCH GIAO DIỆN TỪNG CHỨC NĂNG');
console.log('========================================================================\n');

const indexPath = path.join(__dirname, '..', 'index.html');
const appPath = path.join(__dirname, '..', 'app.js');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const appJs = fs.readFileSync(appPath, 'utf8');

// --- NHÓM 1: KIỂM SOÁT CẤU TRÚC GIAO DIỆN BẢN ĐỒ DỰ ÁN (PROJECT MAP) ---
console.log('--- NHÓM 1: BẢN ĐỒ DỰ ÁN CHỈ HIỆN NẠP VÀ XEM DỰ ÁN ---');
{
    // 1. Thanh bản đồ dự án có id mapProjectBar
    assert(indexHtml.includes('id="mapProjectBar"'), 'Thanh công cụ dự án có ID riêng biệt (#mapProjectBar)');

    // 2. Không còn nút vẽ CAD hay đo khoảng cách trên thanh dự án
    const startIdx = indexHtml.indexOf('id="mapProjectBar"');
    const endIdx = indexHtml.indexOf('id="mapDistanceHud"');
    const projectBarHtml = (startIdx !== -1 && endIdx !== -1) ? indexHtml.substring(startIdx, endIdx) : '';
    
    assert(!projectBarHtml.includes('btnToggleCadTool'), 'Đã gỡ bỏ hoàn toàn nút Vẽ CAD khỏi thanh Bản đồ dự án');
    assert(!projectBarHtml.includes('btnToggleDistance'), 'Đã gỡ bỏ hoàn toàn nút Đo khoảng cách khỏi thanh Bản đồ dự án');
    assert(projectBarHtml.includes('appModal.openPointsListModal()'), 'Bổ sung nút Xem danh sách mốc chuyên biệt cho dự án');
    assert(projectBarHtml.includes('appMap.fitProjectBounds()'), 'Bổ sung nút Thu phóng bao quát mốc dự án');
}

// --- NHÓM 2: THANH CHẤM CHỌN TỌA ĐỘ ĐƠN / ĐA ĐIỂM (CHUYỂN ĐỔI TỌA ĐỘ) ---
console.log('\n--- NHÓM 2: PHÂN HỆ CHUYỂN ĐỔI TỌA ĐỘ CHẤM ĐƠN / ĐA ĐIỂM ---');
{
    assert(indexHtml.includes('id="barCoordPicker"'), 'Thanh công cụ chấm tọa độ chuyên biệt (#barCoordPicker) tồn tại');
    assert(indexHtml.includes('btnPickModeSingle'), 'Có nút chuyển chế độ Đơn điểm');
    assert(indexHtml.includes('btnPickModeMulti'), 'Có nút chuyển chế độ Đa điểm');
    assert(indexHtml.includes('btnPickerApplySingle'), 'Có nút Áp dụng tọa độ đơn điểm về form chuyển đổi');
    assert(indexHtml.includes('btnPickerApplyMulti'), 'Có nút Nạp danh sách đa điểm vào chuyển đổi hàng loạt');
    assert(indexHtml.includes('id="modalMultiPickList"'), 'Modal xem danh sách đa điểm đã chấm (#modalMultiPickList) tồn tại');
}

// --- NHÓM 3: LOGIC MỞ BẢN ĐỒ TÁCH BẠCH TRONG APPNAV ---
console.log('\n--- NHÓM 3: LOGIC ĐIỀU HƯỚNG TÁCH BẠCH TRONG APPNAV ---');
{
    assert(appJs.includes('openCoordPickerMap(options'), 'appNav có hàm openCoordPickerMap chuyên biệt cho Chuyển đổi');
    assert(appJs.includes('openProjectMap(options'), 'appNav có hàm openProjectMap chuyên biệt cho Dự án');
    assert(appJs.includes('openCadMap()'), 'appNav có hàm openCadMap chuyên biệt cho MiniCAD');
    assert(appJs.includes('openConvertedMap(pointData)'), 'appNav có hàm openConvertedMap hiển thị điểm chuyển đổi sạch sẽ');
}

// --- NHÓM 4: LOGIC CHẤM ĐA ĐIỂM & TẠO DANH SÁCH CHUYỂN ĐỔI HÀNG LOẠT ---
console.log('\n--- NHÓM 4: CHẤM ĐA ĐIỂM & ĐỊNH DẠNG NẠP CHUYỂN ĐỔI HÀNG LOẠT ---');
{
    // Mô phỏng logic appCoordPicker
    const mockMultiPoints = [];
    const ktt = 105.75;
    const k0 = 0.9999;

    function mockAddMultiPoint(lat, lng) {
        const pt = geodesy.convertWgsToVn2k(lat, lng, ktt, k0);
        const idx = mockMultiPoints.length + 1;
        mockMultiPoints.push({
            id: idx,
            name: `P${idx}`,
            lat: lat,
            lng: lng,
            x: pt.X.toFixed(3),
            y: pt.Y.toFixed(3)
        });
    }

    mockAddMultiPoint(10.345211, 106.113617);
    mockAddMultiPoint(10.346500, 106.114800);
    mockAddMultiPoint(10.347200, 106.115500);

    assert(mockMultiPoints.length === 3, 'Chấm liên tiếp 3 điểm thành công');
    assert(mockMultiPoints[0].name === 'P1' && mockMultiPoints[2].name === 'P3', 'Tự động đánh số thứ tự P1, P2, P3...');
    assert(parseFloat(mockMultiPoints[0].x) > 1000000, 'Tọa độ X VN2000 chuẩn xác (> 1,000,000m)');
    assert(parseFloat(mockMultiPoints[0].y) > 500000, 'Tọa độ Y VN2000 chuẩn xác (> 500,000m)');

    // Tạo văn bản nạp hàng loạt
    const batchText = mockMultiPoints.map(p => `${p.name}\t${p.x}\t${p.y}`).join('\n');
    assert(batchText.includes('P1\t1144058.623\t539624.574'), 'Định dạng dữ liệu nạp hàng loạt chuẩn Tab-delimited');
    assert(batchText.split('\n').length === 3, 'Đầy đủ 3 dòng tương ứng 3 điểm đã chấm');
}

// --- NHÓM 5: PHÂN QUYỀN NÚT FAB BẢN ĐỒ THEO CHẾ ĐỘ ---
console.log('\n--- NHÓM 5: PHÂN BIỆT NÚT FAB THEO CHẾ ĐỘ ---');
{
    assert(appJs.includes('updateFabControlsVisibility(mode)'), 'appMap có hàm updateFabControlsVisibility quản lý nút FAB');
    assert(indexHtml.includes('id="btnMapFabZoomIn"') && appJs.includes('btnFitProjectBounds'), 'Các nút FAB có ID định danh độc lập');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 GIAO DIỆN ĐÃ ĐƯỢC PHÂN CHIA HOÀN TOÀN ĐỘC LẬP & RÀNH MẠCH!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
