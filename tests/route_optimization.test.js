const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// 1. Đọc nội dung mã nguồn
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const uiPolishCss = fs.readFileSync(path.join(__dirname, '../ui-polish.css'), 'utf8');
const swJs = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');

function extractAppRouting(appJsContent) {
    const startIdx = appJsContent.indexOf('const appRouting = {');
    assert.ok(startIdx !== -1, 'app.js phải chứa định nghĩa appRouting');
    const endIdx = appJsContent.indexOf('// ================= 11. KHỞI TẠO ỨNG DỤNG', startIdx);
    assert.ok(endIdx !== -1, 'app.js phải có điểm kết thúc module');
    const code = appJsContent.substring(startIdx, endIdx);
    const fn = new Function('L', 'geodesy', 'AppState', 'showToast', 'triggerHaptic', `
        ${code}
        return appRouting;
    `);
    return fn(undefined, undefined, { kttDeg: 105, kttMin: 45, muiVal: 3, currentProject: 'test.csv' }, () => {}, () => {});
}

test('=== 1. KIỂM THỬ GIAO DIỆN & PHẦN TỬ DOM CỦA PHÂN HỆ LỘ TRÌNH (INDEX.HTML) ===', () => {
    // 1.1 Thẻ Card trong Menu chính
    assert.ok(indexHtml.includes('8. Tối Ưu Lộ Trình & Dẫn Đường Giao Thông'), 'Phải có Thẻ 8 trong danh mục thẻ lớn');
    assert.ok(indexHtml.includes("appNav.showScreen('routing')"), 'Thẻ và menu có onclick mở screen routing');
    assert.ok(indexHtml.includes('Xe máy • Ô tô • 16 Chỗ'), 'Thẻ có huy hiệu 3 loại phương tiện');

    // 1.2 Menu card chế độ xem gọn
    assert.ok(indexHtml.includes('6. TỐI ƯU LỘ TRÌNH & CHỈ ĐƯỜNG'), 'Có menu card trong danh sách menu gọn');

    // 1.3 Drawer Item
    assert.ok(indexHtml.includes('id="drawerItem_routing"'), 'Có drawer item trong cây thư mục');
    assert.ok(indexHtml.includes("appNav.navigateTo('routing')"), 'Drawer item gọi appNav.navigateTo("routing")');

    // 1.4 Nút tác vụ trong Quản lý dữ liệu mốc
    assert.ok(indexHtml.includes('id="btnBatchOptimizeRoute"'), 'Thanh chọn nhiều mốc có nút Tối ưu lộ trình');
    assert.ok(indexHtml.includes('appRouting.openWithSelectedPoints()'), 'Nút gọi openWithSelectedPoints()');
    assert.ok(indexHtml.includes('id="btnRoutingAllPoints"'), 'Header sổ đo có nút Lộ trình toàn bộ mốc');
    assert.ok(indexHtml.includes('appRouting.openWithAllPoints()'), 'Nút gọi openWithAllPoints()');

    // 1.5 Màn hình chuyên biệt #screen-routing
    assert.ok(indexHtml.includes('id="screen-routing"'), 'Màn hình chuyên biệt #screen-routing tồn tại');
    assert.ok(indexHtml.includes('id="routingTopToolbar"'), 'Có thanh công cụ trên đỉnh');
    assert.ok(indexHtml.includes('id="btnRoutingVehBike"'), 'Có nút chọn xe máy');
    assert.ok(indexHtml.includes('id="btnRoutingVehCar"'), 'Có nút chọn ô tô con');
    assert.ok(indexHtml.includes('id="btnRoutingVehMinibus"'), 'Có nút chọn xe 16 chỗ');
    assert.ok(indexHtml.includes('id="chkRoutingRoundTrip"'), 'Có checkbox chọn khứ hồi');
    assert.ok(indexHtml.includes('id="routingMinibusNotice"'), 'Có banner lưu ý barie và tải trọng cho xe 16 chỗ');
    assert.ok(indexHtml.includes('id="leaflet-routing-map"'), 'Có container bản đồ Leaflet độc lập');
    assert.ok(indexHtml.includes('id="routingNavHud"'), 'Có HUD dẫn đường');
    assert.ok(indexHtml.includes('id="btnRoutingStartNav"'), 'Có nút bắt đầu/dừng dẫn đường');
    assert.ok(indexHtml.includes('id="btnRoutingVoiceToggle"'), 'Có nút bật/tắt giọng nói');
    assert.ok(indexHtml.includes('id="btnOpenGoogleMaps"'), 'Có nút mở Google Maps');
    assert.ok(indexHtml.includes('id="routingPointsSheet"'), 'Có Bottom Sheet danh sách chặng');

    // 1.6 Các Modal phụ trợ
    assert.ok(indexHtml.includes('id="modalRoutingAddPoints"'), 'Có modal thêm điểm từ sổ đo hoặc dán');
    assert.ok(indexHtml.includes('id="modalGoogleMapsLegs"'), 'Có modal phân chặng Google Maps');
});

test('=== 2. KIỂM THỬ ĐỊNH KIỂU CSS & ĐỒNG BỘ PHIÊN BẢN (UI-POLISH.CSS & SW.JS) ===', () => {
    // 2.1 CSS độc lập
    assert.ok(uiPolishCss.includes('#screen-routing.screen-view.active'), 'Có rule kích hoạt display flex cho screen-routing');
    assert.ok(uiPolishCss.includes('.routing-marker-pin'), 'Có class marker custom cho điểm dừng');
    assert.ok(uiPolishCss.includes('.routing-marker-start'), 'Có màu riêng cho điểm xuất phát');
    assert.ok(uiPolishCss.includes('.routing-marker-end'), 'Có màu riêng cho điểm đích');
    assert.ok(uiPolishCss.includes('.routing-nav-hud'), 'Có định kiểu cho HUD');

    // 2.2 Đồng bộ phiên bản Cache (4 tệp)
    const swVer = (swJs.match(/CACHE_NAME = 'vn2000-pro-v([\d.]+)'/) || [])[1];
    const styleVer = (indexHtml.match(/style\.css\?v=([\d.]+)/) || [])[1];
    const appVer = (indexHtml.match(/app\.js\?v=([\d.]+)/) || [])[1];
    const polishVer = (indexHtml.match(/ui-polish\.css\?v=([\d.]+)/) || [])[1];

    assert.ok(swVer, 'sw.js phải có CACHE_NAME hợp lệ');
    assert.strictEqual(swVer, styleVer, 'sw.js và style.css phải cùng version');
    assert.strictEqual(swVer, appVer, 'sw.js và app.js phải cùng version');
    assert.strictEqual(swVer, polishVer, 'sw.js và ui-polish.css phải cùng version');
    const verNum = parseInt(swVer.split('.')[2] || '0', 10);
    assert.ok(verNum >= 24, `Phiên bản mới nhất phải tối thiểu 2.8.24 (hiện tại: ${swVer})`);
});

test('=== 3. KIỂM THỬ LOGIC JAVASCRIPT APPROUTING (APP.JS) ===', () => {
    const appRouting = extractAppRouting(appJs);
    assert.ok(appRouting, 'appRouting phải được khởi tạo thành công');

    // 3.1 Quản lý điểm mốc (Points Management)
    appRouting.clearAllPoints();
    assert.strictEqual(appRouting.points.length, 0, 'clearAllPoints phải xóa sạch danh sách');

    appRouting.addPoint(10.512345, 106.123456, 'Điểm A', 1162000, 589000);
    appRouting.addPoint(10.523456, 106.134567, 'Điểm B', 1163000, 590000);
    appRouting.addPoint(10.534567, 106.145678, 'Điểm C', 1164000, 591000);
    assert.strictEqual(appRouting.points.length, 3, 'addPoint phải thêm đủ 3 điểm');

    appRouting.reversePoints();
    assert.strictEqual(appRouting.points[0].name, 'Điểm C', 'reversePoints phải đảo chiều điểm đầu');
    assert.strictEqual(appRouting.points[2].name, 'Điểm A', 'reversePoints phải đảo chiều điểm cuối');

    appRouting.removePoint(1); // Xóa Điểm B
    assert.strictEqual(appRouting.points.length, 2, 'removePoint phải giảm 1 điểm');
    assert.strictEqual(appRouting.points[0].name, 'Điểm C');
    assert.strictEqual(appRouting.points[1].name, 'Điểm A');

    // 3.2 Chọn phương tiện & Roundtrip
    appRouting.setVehicle('minibus');
    assert.strictEqual(appRouting.vehicle, 'minibus', 'setVehicle phải đổi sang minibus');

    appRouting.setVehicle('bike');
    assert.strictEqual(appRouting.vehicle, 'bike', 'setVehicle phải đổi sang bike');

    appRouting.toggleRoundTrip(true);
    assert.strictEqual(appRouting.isRoundTrip, true, 'toggleRoundTrip(true) phải bật khứ hồi');
    appRouting.toggleRoundTrip(false);
    assert.strictEqual(appRouting.isRoundTrip, false, 'toggleRoundTrip(false) phải tắt khứ hồi');

    // 3.3 Tính khoảng cách Haversine
    const dist = appRouting.calcDistance(10.0, 106.0, 10.01, 106.0);
    assert.ok(dist > 1000 && dist < 1200, `Khoảng cách 0.01 độ vĩ ~ 1111m (kết quả thật: ${dist}m)`);

    // 3.4 Dịch câu lệnh chỉ đường OSRM sang tiếng Việt
    const turnLeft = appRouting.translateManeuver({
        maneuver: { type: 'turn', modifier: 'left' },
        name: 'Quốc lộ 30'
    });
    assert.ok(turnLeft.text.includes('Rẽ trái') && turnLeft.text.includes('Quốc lộ 30'), 'Dịch đúng rẽ trái tiếng Việt');
    assert.strictEqual(turnLeft.icon, '↰', 'Icon rẽ trái là ↰');

    const turnSharpRight = appRouting.translateManeuver({
        maneuver: { type: 'turn', modifier: 'sharp right' },
        name: 'Đường tỉnh 848'
    });
    assert.ok(turnSharpRight.text.includes('ngoặt gấp sang phải'), 'Dịch đúng ngoặt gấp sang phải');

    const arrive = appRouting.translateManeuver({
        maneuver: { type: 'arrive' },
        name: ''
    });
    assert.ok(arrive.text.includes('Đã đến điểm dừng'), 'Dịch đúng điểm đến');

    // 3.5 Thuật toán tạo URL Google Maps & Phân chặng (Lựa chọn A)
    const smallChunk = [
        { lat: 10.1, lng: 106.1, name: 'P1' },
        { lat: 10.2, lng: 106.2, name: 'P2' },
        { lat: 10.3, lng: 106.3, name: 'P3' }
    ];
    const url = appRouting.buildGoogleMapsUrl(smallChunk);
    assert.ok(url.includes('api=1'), 'URL Google Maps có api=1');
    assert.ok(url.includes('origin=10.100000,106.100000'), 'Đúng điểm xuất phát origin');
    assert.ok(url.includes('destination=10.300000,106.300000'), 'Đúng điểm đích destination');
    assert.ok(url.includes('waypoints='), 'Có waypoints trung gian');

    // Kiểm tra phân chặng khi số điểm > 9 (Lựa chọn A)
    appRouting.clearAllPoints();
    for (let i = 1; i <= 20; i++) {
        appRouting.addPoint(10.0 + i * 0.01, 106.0 + i * 0.01, `Mốc ${i}`);
    }
    assert.strictEqual(appRouting.points.length, 20);

    const legs = appRouting.getGoogleMapsLegs();
    assert.ok(legs.length >= 3, `20 mốc phải được chia thành ít nhất 3 chặng gối đầu (kết quả: ${legs.length} chặng)`);
    assert.ok(legs[0].pointCount <= 9, 'Mỗi chặng tối đa 9 điểm');
    assert.ok(legs[0].url.includes('google.com/maps/dir'), 'Mỗi chặng có link Google Maps hợp lệ');
    assert.strictEqual(legs[0].fromName, 'Mốc 1');
    assert.strictEqual(legs[0].toName, 'Mốc 9');
    assert.strictEqual(legs[1].fromName, 'Mốc 9', 'Chặng 2 phải gối đầu tiếp nối từ điểm cuối chặng 1');

    // 3.6 Tính toán lộ trình ngoại tuyến (Fallback Straight Line)
    appRouting.fallbackStraightLineRoute();
    assert.ok(appRouting.optimizedRoute, 'Fallback phải tạo ra đối tượng optimizedRoute hợp lệ');
    assert.ok(appRouting.optimizedRoute.distance > 0, 'Phải tính được tổng cự ly đường trắc địa');

    // 3.7 An toàn giọng nói và Screen Wake Lock khi chạy Node (không crash)
    assert.doesNotThrow(() => {
        appRouting.toggleVoice();
        appRouting.speakInstruction('Test');
        appRouting.requestWakeLock();
        appRouting.releaseWakeLock();
    }, 'Các hàm API browser phải an toàn trong môi trường test Node');
});
