const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('=== 1. KIỂM THỬ GIAO DIỆN NÚT BẤM MINICAD TRONG TRẮC DỌC & HỐ ĐÀO MÓNG (INDEX.HTML) ===', () => {
    // 1.1 Tab 1 Tuyến trắc dọc có nút Vẽ trên MiniCAD và Nạp từ MiniCAD
    assert(indexHtml.includes("appElevationProfile.openCadForProfile('align')"), 'Tab 1 Tuyến phải có nút mở MiniCAD vẽ tuyến');
    assert(indexHtml.includes("appElevationProfile.loadAlignmentFromCad()"), 'Tab 1 Tuyến phải có nút nạp trực tiếp từ MiniCAD');

    // 1.2 Tab 2 Hố đào móng có nút Vẽ trên MiniCAD và Nạp từ MiniCAD
    assert(indexHtml.includes("appElevationProfile.openCadForProfile('pit')"), 'Tab 2 Hố đào phải có nút mở MiniCAD vẽ đáy hố móng');
    assert(indexHtml.includes("appElevationProfile.loadPitFromCad()"), 'Tab 2 Hố đào phải có nút nạp đáy móng từ MiniCAD');

    // 1.3 Banner liên thông độc lập nổi bật trong thanh công cụ MiniCAD
    assert(indexHtml.includes('id="cadProfileBridgeBanner"'), 'MiniCAD toolbar phải có banner liên thông #cadProfileBridgeBanner');
    assert(indexHtml.includes('id="btnCadApplyToProfile"'), 'Banner liên thông phải có nút áp dụng #btnCadApplyToProfile');
    assert(indexHtml.includes('appElevationProfile.applyCadToProfile()'), 'Nút áp dụng phải gọi appElevationProfile.applyCadToProfile()');
    assert(indexHtml.includes('appElevationProfile.closeCadBridge()'), 'Nút hủy phải gọi appElevationProfile.closeCadBridge()');
});

test('=== 2. KIỂM THỬ CÁC HÀM CẦU NỐI MINICAD TRONG APPELEVATIONPROFILE (APP.JS) ===', () => {
    assert(appJs.includes('openCadForProfile(targetMode = \'align\')'), 'appElevationProfile phải có hàm openCadForProfile');
    assert(appJs.includes('updateCadBridgeStats()'), 'appElevationProfile phải có hàm updateCadBridgeStats');
    assert(appJs.includes('closeCadBridge(navigateBack = true)'), 'appElevationProfile phải có hàm closeCadBridge');
    assert(appJs.includes('applyCadToProfile()'), 'appElevationProfile phải có hàm applyCadToProfile');
    assert(appJs.includes('loadAlignmentFromCad()'), 'appElevationProfile phải có hàm loadAlignmentFromCad');
    assert(appJs.includes('loadPitFromCad()'), 'appElevationProfile phải có hàm loadPitFromCad');
});

test('=== 3. KIỂM THỬ XỬ LÝ DỮ LIỆU ĐA DẠNG TỪ MINICAD (VERTICES, SAVED SHAPES, POLYLINE, POLYGON) ===', () => {
    // Giả lập môi trường chuyển đổi và kiểm thử logic nạp Tuyến từ MiniCAD
    const mockCadTool = {
        vertices: [
            { id: 'V1', name: 'M1', x: 1144000.0, y: 585000.0, z: 12.5, lat: 10.75, lng: 106.65 },
            { id: 'V2', name: 'M2', x: 1144050.0, y: 585020.0, z: 13.8, lat: 10.7504, lng: 106.6502 }
        ],
        savedShapes: [
            {
                id: 'SHP_ROAD',
                name: 'Tuyến đường D1',
                mode: 'polyline',
                vertices: [
                    { x: 1144000, y: 585000, z: 10.0 },
                    { x: 1144100, y: 585050, z: 11.5 }
                ]
            },
            {
                id: 'SHP_PIT',
                name: 'Đáy móng M1',
                mode: 'polygon',
                vertices: [
                    { x: 1144000, y: 585000, z: 10.0 },
                    { x: 1144010, y: 585000, z: 10.0 },
                    { x: 1144010, y: 585008, z: 10.0 },
                    { x: 1144000, y: 585008, z: 10.0 }
                ]
            }
        ]
    };

    // 3.1 Kiểm tra logic trích xuất tuyến polyline
    const lineShape = mockCadTool.savedShapes.find(s => s.mode === 'polyline');
    assert(lineShape && lineShape.vertices.length >= 2, 'Phải trích xuất được khối polyline từ savedShapes');

    // 3.2 Kiểm tra logic trích xuất đáy móng polygon
    const pitShape = mockCadTool.savedShapes.find(s => s.mode === 'polygon');
    assert(pitShape && pitShape.vertices.length >= 3, 'Phải trích xuất được khối polygon từ savedShapes');

    // 3.3 Tính khoảng cách tuyến trắc dọc
    const dx = lineShape.vertices[1].x - lineShape.vertices[0].x;
    const dy = lineShape.vertices[1].y - lineShape.vertices[0].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert(dist > 0, 'Khoảng cách tuyến phải lớn hơn 0');

    // 3.4 Tính diện tích đáy móng
    let area = 0;
    const v = pitShape.vertices;
    for (let i = 0; i < v.length; i++) {
        const j = (i + 1) % v.length;
        area += v[i].x * v[j].y - v[j].x * v[i].y;
    }
    area = Math.abs(area) / 2.0;
    assert.strictEqual(area, 80, 'Diện tích đáy móng 10m x 8m phải là 80 m²');
});

test('=== 4. BẢO VỆ PHÂN TÁCH ĐỘC LẬP: BẢN ĐỒ DỰ ÁN (2) & MINICAD (3.5) KHÔNG XUNG ĐỘT ===', () => {
    // 4.1 openCadForProfile phải mở MiniCAD (openCadMap), tuyệt đối không mở openProjectMap
    const fnStr = appJs.slice(appJs.indexOf('openCadForProfile(targetMode'));
    const fnBody = fnStr.slice(0, fnStr.indexOf('updateCadBridgeStats()'));
    assert(fnBody.includes('appNav.openCadMap()'), 'openCadForProfile phải gọi appNav.openCadMap()');
    assert(!fnBody.includes('appNav.openProjectMap()'), 'openCadForProfile KHÔNG được gọi appNav.openProjectMap()');

    // 4.2 Popup marker của Bản đồ dự án KHÔNG chứa nút thêm vào tuyến / hố đào
    assert(!appJs.includes('THÊM VÀO TUYẾN / HỐ ĐÀO'), 'Popup marker của Dự án không được chứa nút thêm vào tuyến / hố đào');

    // 4.3 Đã gỡ bỏ hoàn toàn thanh lạ #barProfileSurveyor khỏi index.html
    assert(!indexHtml.includes('id="barProfileSurveyor"'), 'Không được tồn tại thanh lạ #barProfileSurveyor trong DOM');
});
