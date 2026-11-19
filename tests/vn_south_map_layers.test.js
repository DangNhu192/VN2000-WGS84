/**
 * Test Suite: vn_south_map_layers.test.js
 * Kiểm thử toàn diện kho dữ liệu lớp bản đồ & quy hoạch miền Nam (Đồng Tháp mới, Đồng Tháp cũ, Tiền Giang cũ, 19 tỉnh Nam Bộ)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('=== 1. KIỂM THỬ TÍNH TOÀN VẸN VÀ CẤU TRÚC KHO DỮ LIỆU DATA/VN_SOUTH_PROVINCES.JS ===', () => {
    const filePath = path.join(root, 'data', 'vn_south_provinces.js');
    assert.ok(fs.existsSync(filePath), 'Tệp data/vn_south_provinces.js phải tồn tại');

    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.length > 500000, 'Dung lượng tệp phải đủ lớn (>500KB) chứa đủ 19 tỉnh');

    // Parse JSON
    const jsonStr = content.replace(/^[^{]*/, '').replace(/;?\s*$/, '');
    const data = JSON.parse(jsonStr);

    assert.ok(data.metadata, 'Phải có mục metadata');
    assert.ok(data.metadata.title.includes('Miền Nam Việt Nam'), 'Tiêu đề metadata chuẩn');

    // 1. Đồng Tháp mới sau sáp nhập
    assert.ok(data.dong_thap_moi, 'Phải có dữ liệu Đồng Tháp mới sau sáp nhập');
    assert.ok(data.dong_thap_moi.province, 'Đồng Tháp mới phải có feature ranh giới tỉnh');
    assert.equal(data.dong_thap_moi.province.properties.ma_tinh, '82');
    assert.ok(data.dong_thap_moi.province.properties.sap_nhap.includes('Tiền Giang'), 'Đồng Tháp mới phải sáp nhập Tiền Giang + Đồng Tháp');

    // 2. Đồng Tháp cũ (12 huyện)
    assert.ok(data.dong_thap_cu, 'Phải có dữ liệu Đồng Tháp cũ');
    assert.equal(data.dong_thap_cu.features.length, 12, 'Đồng Tháp cũ phải có đúng 12 huyện/thành phố');
    assert.equal(data.dong_thap_cu.ktt, 105.0, 'KTT Đồng Tháp cũ là 105°00\'');
    const dtDistrictNames = data.dong_thap_cu.features.map(f => f.properties.name);
    assert.ok(dtDistrictNames.includes('Thành phố Cao Lãnh'));
    assert.ok(dtDistrictNames.includes('Thành phố Sa Đéc'));
    assert.ok(dtDistrictNames.includes('Huyện Tháp Mười'));

    // 3. Tiền Giang cũ (11 huyện)
    assert.ok(data.tien_giang_cu, 'Phải có dữ liệu Tiền Giang cũ');
    assert.equal(data.tien_giang_cu.features.length, 11, 'Tiền Giang cũ phải có đúng 11 huyện/thị xã/thành phố');
    assert.equal(data.tien_giang_cu.ktt, 105.75, 'KTT Tiền Giang cũ là 105°45\'');
    const tgDistrictNames = data.tien_giang_cu.features.map(f => f.properties.name);
    assert.ok(tgDistrictNames.includes('Thành phố Mỹ Tho'));
    assert.ok(tgDistrictNames.includes('Huyện Cái Bè'));
    assert.ok(tgDistrictNames.includes('Huyện Châu Thành'));

    // 4. 19 Tỉnh thành miền Nam
    assert.ok(data.south_provinces, 'Phải có danh sách 19 tỉnh miền Nam');
    assert.equal(data.south_provinces.features.length, 19, 'Phải đủ 19 tỉnh thành Nam Bộ');
    const provNames = data.south_provinces.features.map(f => f.properties.shortName);
    assert.ok(provNames.includes('TP. Hồ Chí Minh'));
    assert.ok(provNames.includes('Cần Thơ'));
    assert.ok(provNames.includes('An Giang'));
    assert.ok(provNames.includes('Long An'));

    // 5. Phân vùng quy hoạch sử dụng đất (Thông tư 27/2018/TT-BTNMT)
    assert.ok(data.planning_zones, 'Phải có lớp phân vùng quy hoạch');
    assert.ok(data.planning_zones.features.length >= 6, 'Phải có ít nhất 6 phân vùng quy hoạch mẫu');
    assert.equal(data.planning_zones.standard, 'Thông tư 27/2018/TT-BTNMT');
    const types = data.planning_zones.features.map(f => f.properties.land_type);
    assert.ok(types.includes('ODT'), 'Có đất ở đô thị');
    assert.ok(types.includes('SKC'), 'Có đất công nghiệp');
    assert.ok(types.includes('TMD'), 'Có đất thương mại');
});

test('=== 2. KIỂM THỬ ĐĂNG KÝ LAZY LOAD VÀ SERVICE WORKER OFFLINE CACHE ===', () => {
    const appJs = read('app.js');
    const swJs = read('sw.js');

    // LAZY_LIBS trong app.js
    assert.ok(appJs.includes("vn_south: { src: 'data/vn_south_provinces.js'"), 'LAZY_LIBS phải khai báo vn_south');

    // Service Worker trong sw.js
    assert.ok(swJs.includes("'./data/vn_south_provinces.js'"), 'sw.js phải nạp sẵn data/vn_south_provinces.js vào ASSETS_TO_CACHE');
});

test('=== 3. KIỂM THỬ LOGIC APPMAP VÀ QUẢN LÝ LỚP TRÊN GIAO DIỆN ===', () => {
    const appJs = read('app.js');

    // Các hàm khởi tạo và toggle layer trong appMap
    assert.ok(appJs.includes('initDongThapCuLayer()'), 'appMap phải có initDongThapCuLayer');
    assert.ok(appJs.includes('toggleDongThapCu()'), 'appMap phải có toggleDongThapCu');
    assert.ok(appJs.includes('initTienGiangCuLayer()'), 'appMap phải có initTienGiangCuLayer');
    assert.ok(appJs.includes('toggleTienGiangCu()'), 'appMap phải có toggleTienGiangCu');
    assert.ok(appJs.includes('initSouthProvincesLayer()'), 'appMap phải có initSouthProvincesLayer');
    assert.ok(appJs.includes('toggleSouthProvinces()'), 'appMap phải có toggleSouthProvinces');
    assert.ok(appJs.includes('initPlanningZonesLayer()'), 'appMap phải có initPlanningZonesLayer');
    assert.ok(appJs.includes('togglePlanningZones()'), 'appMap phải có togglePlanningZones');

    // AppState khai báo đầy đủ
    assert.ok(appJs.includes('layerDtCu: null'), 'AppState có layerDtCu');
    assert.ok(appJs.includes('layerTgCu: null'), 'AppState có layerTgCu');
    assert.ok(appJs.includes('layerSouthProv: null'), 'AppState có layerSouthProv');
    assert.ok(appJs.includes('layerPlanningZones: null'), 'AppState có layerPlanningZones');

    // Modal Map Layers Panel hiển thị các switch điều khiển
    assert.ok(appJs.includes("this._switch('mlDtCu'"), 'Panel có công tắc Đồng Tháp cũ');
    assert.ok(appJs.includes("this._switch('mlTgCu'"), 'Panel có công tắc Tiền Giang cũ');
    assert.ok(appJs.includes("this._switch('mlSouthProv'"), 'Panel có công tắc 19 tỉnh miền Nam');
    assert.ok(appJs.includes("this._switch('mlPlanZones'"), 'Panel có công tắc Quy hoạch sử dụng đất TT27');
});

test('=== 4. KIỂM THỬ BỘ LỌC BẬT TẮT TỪNG TỈNH / TỪNG XÃ SAU SÁP NHẬP TRÊN BẢN ĐỒ ===', () => {
    const appJs = read('app.js');

    // 1. Kiểm tra các biến trạng thái bộ lọc trong AppState
    assert.ok(appJs.includes("filterDtCommune: 'ALL'"), 'AppState có filterDtCommune');
    assert.ok(appJs.includes("filterSouthProv: 'ALL'"), 'AppState có filterSouthProv');
    assert.ok(appJs.includes("filter34Prov: 'ALL'"), 'AppState có filter34Prov');
    assert.ok(appJs.includes("filterDtCu: 'ALL'"), 'AppState có filterDtCu');
    assert.ok(appJs.includes("filterTgCu: 'ALL'"), 'AppState có filterTgCu');

    // 2. Kiểm tra các hàm lọc & phong cách động trong appMap
    assert.ok(appJs.includes('filterDongThapCommune(communeVal)'), 'appMap có hàm filterDongThapCommune');
    assert.ok(appJs.includes('filterSouthProvince(provVal)'), 'appMap có hàm filterSouthProvince');
    assert.ok(appJs.includes('filter34Province(provVal)'), 'appMap có hàm filter34Province');
    assert.ok(appJs.includes('filterDongThapCu(districtVal)'), 'appMap có hàm filterDongThapCu');
    assert.ok(appJs.includes('filterTienGiangCu(districtVal)'), 'appMap có hàm filterTienGiangCu');

    // 3. Kiểm tra hàm tạo style động ẩn/hiện đối tượng lọc
    assert.ok(appJs.includes('_getDtCommuneStyle(feature)'), 'appMap có hàm _getDtCommuneStyle');
    assert.ok(appJs.includes('_getSouthProvStyle(feature)'), 'appMap có hàm _getSouthProvStyle');
    assert.ok(appJs.includes('_get34ProvStyle(feature)'), 'appMap có hàm _get34ProvStyle');

    // 4. Kiểm tra panel appMapLayers sinh sub-controls dropdown lọc
    assert.ok(appJs.includes('appMap.filterDongThapCommune(this.value)'), 'Panel có select lọc xã Đồng Tháp');
    assert.ok(appJs.includes('appMap.filterSouthProvince(this.value)'), 'Panel có select lọc 19 tỉnh miền Nam');
    assert.ok(appJs.includes('appMap.filter34Province(this.value)'), 'Panel có select lọc 34 tỉnh sáp nhập');
    assert.ok(appJs.includes('appMap.filterDongThapCu(this.value)'), 'Panel có select lọc huyện ĐT cũ');
    assert.ok(appJs.includes('appMap.filterTienGiangCu(this.value)'), 'Panel có select lọc huyện TG cũ');
});

test('=== 5. KIỂM THỬ TÍCH HỢP NẠP RANH GIỚI TỈNH / XÃ VÀO MINICAD ===', () => {
    const appJs = read('app.js');
    const indexHtml = read('index.html');

    // 1. Kiểm tra các phương thức nghiệp vụ trong appCadTool
    assert.ok(appJs.includes('populateAdminBoundaryDropdowns()'), 'appCadTool có populateAdminBoundaryDropdowns');
    assert.ok(appJs.includes('onBoundaryCategoryChange(category)'), 'appCadTool có onBoundaryCategoryChange');
    assert.ok(appJs.includes('applyAdminBoundaryImport()'), 'appCadTool có applyAdminBoundaryImport');
    assert.ok(appJs.includes('importAdminBoundaryToCad({ category, name })'), 'appCadTool có importAdminBoundaryToCad');

    // 2. Kiểm tra lệnh CADCraft CLI
    assert.ok(appJs.includes("case 'RANH':") && appJs.includes("case 'RANHGIOI':"), 'MiniCAD CLI hỗ trợ lệnh RANH / RANHGIOI');

    // 3. Kiểm tra phần tử giao diện trong modalCadGisImport của index.html
    assert.ok(indexHtml.includes('id="cadSelectBoundaryCategory"'), 'index.html có dropdown chọn loại ranh giới');
    assert.ok(indexHtml.includes('id="cadSelectBoundaryName"'), 'index.html có dropdown chọn tên đơn vị');
    assert.ok(indexHtml.includes('appCadTool.applyAdminBoundaryImport()'), 'index.html có nút gọi nạp ranh giới vào CAD');
    assert.ok(indexHtml.includes('RANH_GIOI_HANH_CHINH') || appJs.includes('RANH_GIOI_HANH_CHINH'), 'Layer ranh giới hành chính chuẩn');
});

