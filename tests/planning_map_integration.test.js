/**
 * VN2000-PWA — Guland 2030 Planning Map Integration Automated Test Suite
 * File: tests/planning_map_integration.test.js
 * Version: 2.8.41
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const planningJsPath = path.join(ROOT_DIR, 'src', 'core', 'planning_map.js');
const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
const swJsPath = path.join(ROOT_DIR, 'sw.js');
const uiPolishCssPath = path.join(ROOT_DIR, 'ui-polish.css');
const designMdPath = path.join(ROOT_DIR, 'DESIGN.md');

// Đọc mã nguồn
const planningJsContent = fs.readFileSync(planningJsPath, 'utf8');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
const swJsContent = fs.readFileSync(swJsPath, 'utf8');
const uiPolishCssContent = fs.readFileSync(uiPolishCssPath, 'utf8');
const designMdContent = fs.readFileSync(designMdPath, 'utf8');
const appJsPath = path.join(ROOT_DIR, 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Giả lập môi trường trình duyệt cho planning_map.js
function createPlanningSandbox() {
    const mockStorage = {};
    const sandboxWindow = {
        localStorage: {
            getItem(k) { return mockStorage[k] || null; },
            setItem(k, v) { mockStorage[k] = String(v); },
            removeItem(k) { delete mockStorage[k]; }
        },
        document: {
            getElementById() { return null; },
            querySelector() { return null; },
            querySelectorAll() { return []; }
        },
        console: {
            warn() {},
            log() {}
        }
    };

    const fn = new Function('window', 'global', planningJsContent);
    fn(sandboxWindow, sandboxWindow);
    return { GulandPlanning: sandboxWindow.GulandPlanning, mockStorage };
}

test('=== NHÓM 1: TÍNH TOÀN VẸN CỦA DANH MỤC 63 TỈNH THÀNH QUY HOẠCH GULAND ===', async (t) => {
    const { GulandPlanning } = createPlanningSandbox();

    await t.test('1.1 Module GulandPlanning được khởi tạo và định nghĩa 63 tỉnh thành', () => {
        assert.ok(GulandPlanning, 'GulandPlanning phải được export trên global');
        assert.ok(Array.isArray(GulandPlanning.provinces), 'GulandPlanning.provinces phải là mảng');
        assert.equal(GulandPlanning.provinces.length, 63, 'Phải có đầy đủ 63 tỉnh thành');
    });

    await t.test('1.2 Mỗi tỉnh thành có đầy đủ thông tin: slug, name, ktt, center, zoom, url, fallback', () => {
        const slugs = new Set();
        GulandPlanning.provinces.forEach(p => {
            assert.ok(p.slug && typeof p.slug === 'string', `Tỉnh ${p.name} phải có slug hợp lệ`);
            assert.ok(!slugs.has(p.slug), `Slug ${p.slug} không được trùng lặp`);
            slugs.add(p.slug);

            assert.ok(p.name && typeof p.name === 'string', `Tỉnh ${p.slug} phải có tên tiếng Việt`);
            assert.ok(typeof p.ktt === 'number' && p.ktt >= 100 && p.ktt <= 110, `KTT của ${p.name} phải từ 100-110`);
            assert.ok(Array.isArray(p.center) && p.center.length === 2, `Tọa độ tâm của ${p.name} phải là [lat, lng]`);
            assert.ok(p.center[0] >= 8 && p.center[0] <= 24, `Vĩ độ của ${p.name} phải nằm trong lãnh thổ VN`);
            assert.ok(p.center[1] >= 102 && p.center[1] <= 110, `Kinh độ của ${p.name} phải nằm trong lãnh thổ VN`);
            assert.ok(p.url.includes('{z}/{x}/{y}.png'), `URL của ${p.name} phải theo chuẩn Tile XYZ`);
            assert.ok(p.fallback.includes('{z}/{x}/{y}.png'), `Fallback URL của ${p.name} phải theo chuẩn Tile XYZ`);
        });
    });

    await t.test('1.3 Các tỉnh đặc thù có URL chuyên biệt chính xác', () => {
        const hcm = GulandPlanning.getProvince('ho-chi-minh');
        assert.ok(hcm.url.includes('qhxd'), 'TP.HCM phải ánh xạ tới cụm qhxd trên CMC S3');

        const hn = GulandPlanning.getProvince('ha-noi');
        assert.ok(hn.url.includes('hanoi-pk'), 'Hà Nội phải ánh xạ tới hanoi-pk');

        const dt = GulandPlanning.getProvince('dong-thap');
        assert.ok(dt.url.includes('dong-thap-2030'), 'Đồng Tháp phải ánh xạ tới dong-thap-2030');
    });
});

test('=== NHÓM 2: TRA CỨU TỈNH & TỰ ĐỘNG ĐỀ XUẤT THEO KTT ===', async (t) => {
    const { GulandPlanning } = createPlanningSandbox();

    await t.test('2.1 Tra cứu theo slug chính xác', () => {
        const dn = GulandPlanning.getProvince('dong-nai');
        assert.equal(dn.name, 'Đồng Nai');
        assert.equal(dn.ktt, 107.75);
    });

    await t.test('2.2 Tra cứu slug không tồn tại tự fallback về tỉnh mặc định', () => {
        const invalid = GulandPlanning.getProvince('tinh-khong-ton-tai');
        assert.ok(invalid, 'Không được trả về null');
        assert.equal(invalid.slug, 'dong-thap', 'Phải fallback về tỉnh đầu tiên (Đồng Tháp)');
    });

    await t.test('2.3 Tự động nhận diện tỉnh theo KTT', () => {
        const provByKtt = GulandPlanning.getProvinceByKtt(104.75);
        assert.ok(provByKtt, 'Phải tìm thấy tỉnh có KTT 104.75');
        assert.ok(['an-giang', 'lao-cai', 'nghe-an', 'phu-tho', 'yen-bai'].includes(provByKtt.slug));
    });
});

test('=== NHÓM 3: NGUYÊN TẮC CÔ LẬP GIAO DIỆN (UI ISOLATION PRINCIPLE - AGENTS.md) ===', async (t) => {
    const { GulandPlanning } = createPlanningSandbox();

    await t.test('3.1 Ba mục tiêu bản đồ (liveMap, transformMap, projectMap) hoàn toàn độc lập', () => {
        assert.ok(GulandPlanning.targets.liveMap, 'Phải có target liveMap');
        assert.ok(GulandPlanning.targets.transformMap, 'Phải có target transformMap');
        assert.ok(GulandPlanning.targets.projectMap, 'Phải có target projectMap');

        assert.equal(GulandPlanning.targets.liveMap.active, false);
        assert.equal(GulandPlanning.targets.transformMap.active, false);
        assert.equal(GulandPlanning.targets.projectMap.active, false);
    });

    await t.test('3.2 Thay đổi cấu hình của một bản đồ KHÔNG làm ảnh hưởng bản đồ khác', () => {
        GulandPlanning.setOpacity('liveMap', 0.4);
        assert.equal(GulandPlanning.targets.liveMap.opacity, 0.4);
        assert.equal(GulandPlanning.targets.projectMap.opacity, 0.65, 'ProjectMap opacity phải giữ nguyên');
        assert.equal(GulandPlanning.targets.transformMap.opacity, 0.65, 'TransformMap opacity phải giữ nguyên');

        GulandPlanning.setProvince('projectMap', 'binh-duong', false);
        assert.equal(GulandPlanning.targets.projectMap.provinceSlug, 'binh-duong');
        assert.equal(GulandPlanning.targets.liveMap.provinceSlug, 'dong-thap', 'LiveMap province phải giữ nguyên');
    });

    await t.test('3.3 Giới hạn phạm vi độ mờ từ 0.1 đến 1.0', () => {
        GulandPlanning.setOpacity('liveMap', 1.8);
        assert.equal(GulandPlanning.targets.liveMap.opacity, 1.0, 'Không được vượt quá 1.0');

        GulandPlanning.setOpacity('liveMap', 0.01);
        assert.equal(GulandPlanning.targets.liveMap.opacity, 0.1, 'Không được nhỏ hơn 0.1');
    });
});

test('=== NHÓM 4: KIỂM TRA ĐĂNG KÝ GIAO DIỆN & DOM TRONG INDEX.HTML ===', async (t) => {
    await t.test('4.1 Có nút điều khiển Quy hoạch trên Live Map (Chuyển đổi tọa độ)', () => {
        assert.ok(indexHtmlContent.includes('id="btnLiveMapTogglePlanning"'), 'Thiếu id="btnLiveMapTogglePlanning"');
        assert.ok(indexHtmlContent.includes('id="liveMapPlanningCtrl"'), 'Thiếu id="liveMapPlanningCtrl"');
        assert.ok(indexHtmlContent.includes('appPlanning.toggleLiveMapPlanning()'), 'Nút Live Map phải gọi appPlanning');
    });

    await t.test('4.2 Có nút điều khiển Quy hoạch trên Bản đồ Chuyển đổi độc lập', () => {
        assert.ok(indexHtmlContent.includes('id="btnTfMapPlanning"'), 'Thiếu id="btnTfMapPlanning"');
        assert.ok(indexHtmlContent.includes('id="tfMapPlanningCtrl"'), 'Thiếu id="tfMapPlanningCtrl"');
        assert.ok(indexHtmlContent.includes('appPlanning.toggleTransformMapPlanning()'), 'Nút Transform Map phải gọi appPlanning');
    });

    await t.test('4.3 Có nút điều khiển Quy hoạch trên Bản đồ Dự án', () => {
        assert.ok(indexHtmlContent.includes('id="btnMapProjectPlanning"'), 'Thiếu id="btnMapProjectPlanning"');
        assert.ok(indexHtmlContent.includes('id="mapProjectPlanningCtrl"'), 'Thiếu id="mapProjectPlanningCtrl"');
        assert.ok(indexHtmlContent.includes('appPlanning.toggleProjectMapPlanning()'), 'Nút Project Map phải gọi appPlanning');
    });

    await t.test('4.4 File planning_map.js được import trước app.js', () => {
        const planIdx = indexHtmlContent.indexOf('src/core/planning_map.js');
        const appIdx = indexHtmlContent.indexOf('app.js');
        assert.ok(planIdx !== -1, 'Thiếu thẻ script cho planning_map.js');
        assert.ok(appIdx !== -1, 'Thiếu thẻ script cho app.js');
        assert.ok(planIdx < appIdx, 'planning_map.js phải được nạp trước app.js');
    });
});

test('=== NHÓM 5: ĐỒNG BỘ PHIÊN BẢN & BỘ NHỚ ĐỆM SERVICE WORKER ===', async (t) => {
    await t.test('5.1 CACHE_NAME trong sw.js đã nâng cấp lên tối thiểu v2.8.41', () => {
        assert.ok(/CACHE_NAME = 'vn2000-pro-v2\.8\.(4[1-9]|\d{3,})'/.test(swJsContent), 'CACHE_NAME phải tối thiểu v2.8.41');
    });

    await t.test('5.2 planning_map.js có trong danh mục ASSETS_TO_CACHE của sw.js', () => {
        assert.ok(swJsContent.includes("'./src/core/planning_map.js'"), 'Thiếu planning_map.js trong ASSETS_TO_CACHE');
    });

    await t.test('5.3 Phiên bản tài nguyên đồng bộ tuyệt đối giữa sw.js, index.html và stylesheets', () => {
        const swVerMatch = swJsContent.match(/CACHE_NAME = 'vn2000-pro-v([\d.]+)'/);
        const styleVerMatch = indexHtmlContent.match(/style\.css\?v=([\d.]+)/);
        const polishVerMatch = indexHtmlContent.match(/ui-polish\.css\?v=([\d.]+)/);
        const appVerMatch = indexHtmlContent.match(/app\.js\?v=([\d.]+)/);

        assert.ok(swVerMatch, 'sw.js phải có phiên bản');
        assert.ok(styleVerMatch, 'index.html phải có style.css?v=');
        assert.ok(polishVerMatch, 'index.html phải có ui-polish.css?v=');
        assert.ok(appVerMatch, 'index.html phải có app.js?v=');

        const ver = swVerMatch[1];
        assert.ok(['2.8.41', '2.8.42', '2.8.43'].includes(ver), 'Phiên bản phải là 2.8.41 hoặc mới hơn');
        assert.equal(styleVerMatch[1], ver, 'style.css?v phải khớp swVer');
        assert.equal(polishVerMatch[1], ver, 'ui-polish.css?v phải khớp swVer');
        assert.equal(appVerMatch[1], ver, 'app.js?v phải khớp swVer');
    });
});

test('=== NHÓM 6: THIẾT KẾ GIAO DIỆN & ĐẶC TẢ DESIGN.MD ===', async (t) => {
    await t.test('6.1 DESIGN.md chứa token front-matter hợp lệ cho planning components', () => {
        assert.ok(designMdContent.startsWith('---'), 'DESIGN.md phải bắt đầu bằng YAML front-matter');
        assert.ok(designMdContent.includes('planning-float-card:'), 'Phải có token planning-float-card');
        assert.ok(designMdContent.includes('planning-toggle-btn:'), 'Phải có token planning-toggle-btn');
        assert.ok(designMdContent.includes('planning-opacity-slider:'), 'Phải có token planning-opacity-slider');
        assert.ok(designMdContent.includes('planning-province-select:'), 'Phải có token planning-province-select');
    });

    await t.test('6.2 ui-polish.css định nghĩa đầy đủ class và đạt chuẩn sàn chạm di động 44px', () => {
        assert.ok(uiPolishCssContent.includes('.planning-float-card'), 'ui-polish.css phải định nghĩa .planning-float-card');
        assert.ok(uiPolishCssContent.includes('.btn-planning-toggle'), 'ui-polish.css phải định nghĩa .btn-planning-toggle');
        assert.ok(uiPolishCssContent.includes('.planning-province-select'), 'ui-polish.css phải định nghĩa .planning-province-select');
        assert.ok(uiPolishCssContent.includes('.btn-planning-sub'), 'ui-polish.css phải định nghĩa .btn-planning-sub');

        // Kiểm tra sàn chạm di động
        assert.ok(uiPolishCssContent.includes('min-height: 44px !important'), 'Nút tương tác phụ phải có min-height: 44px trên mobile');
        assert.ok(uiPolishCssContent.includes('min-height: 40px !important'), 'Nút toggle phải có min-height: 40px trên mobile');
    });
});

test('=== NHÓM 7: BẢN ĐỒ NỀN QUY HOẠCH GULAND DƯỚI LỚP VECTƠ (POINTER-EVENTS NONE & PANE 230) ===', async (t) => {
    const { GulandPlanning } = createPlanningSandbox();

    await t.test('7.1 Lớp bản đồ quy hoạch sử dụng custom Leaflet Pane planningOverlayPane (zIndex: 230, pointerEvents: none)', () => {
        assert.ok(planningJsContent.includes("'planningOverlayPane'"), 'Phải định nghĩa planningOverlayPane');
        assert.ok(planningJsContent.includes('pane.style.zIndex = 230'), 'zIndex phải là 230 (nằm dưới vector overlayPane 400)');
        assert.ok(planningJsContent.includes("pane.style.pointerEvents = 'none'"), 'pointerEvents phải là none để không chặn click/thao tác đỉnh thửa');
    });

    await t.test('7.2 Lớp thửa đất sử dụng custom Leaflet Pane planningLandPane (zIndex: 235, pointerEvents: none)', () => {
        assert.ok(planningJsContent.includes("'planningLandPane'"), 'Phải định nghĩa planningLandPane');
        assert.ok(planningJsContent.includes('pane.style.zIndex = 235'), 'zIndex của thửa đất phải là 235');
    });

    await t.test('7.3 GulandPlanning.targets hỗ trợ mục tiêu cadMap độc lập cho MiniCAD', () => {
        assert.ok(GulandPlanning.targets.cadMap, 'targets phải có cadMap');
        assert.equal(GulandPlanning.targets.cadMap.containerId, 'map-view-container');
        assert.equal(GulandPlanning.targets.cadMap.btnId, 'btnCadPlanning');
        assert.equal(GulandPlanning.targets.cadMap.panelId, 'cadPlanningCtrl');
    });

    await t.test('7.4 Hàm setProvinceGlobal đồng bộ chọn tỉnh trên tất cả các bản đồ', () => {
        assert.ok(typeof GulandPlanning.setProvinceGlobal === 'function', 'Phải có hàm setProvinceGlobal');
        GulandPlanning.setProvinceGlobal('da-nang', false);
        assert.equal(GulandPlanning.targets.liveMap.provinceSlug, 'da-nang');
        assert.equal(GulandPlanning.targets.projectMap.provinceSlug, 'da-nang');
        assert.equal(GulandPlanning.targets.cadMap.provinceSlug, 'da-nang');
    });
});

test('=== NHÓM 8: TÍCH HỢP ĐIỀU KHIỂN QUY HOẠCH GULAND TRONG MINICAD & MAP LAYERS MODAL ===', async (t) => {
    await t.test('8.1 MiniCAD có nút #btnCadPlanning, checkbox #cadCheckShowGulandPlanning và thẻ nổi #cadPlanningCtrl', () => {
        assert.ok(indexHtmlContent.includes('id="btnCadPlanning"'), 'index.html phải có nút #btnCadPlanning');
        assert.ok(indexHtmlContent.includes('id="cadCheckShowGulandPlanning"'), 'index.html phải có checkbox #cadCheckShowGulandPlanning');
        assert.ok(indexHtmlContent.includes('id="cadPlanningCtrl"'), 'index.html phải có thẻ nổi #cadPlanningCtrl');
        assert.ok(uiPolishCssContent.includes('#cadPlanningCtrl'), 'ui-polish.css phải định vị #cadPlanningCtrl');
    });

    await t.test('8.2 MiniCAD CADCraft CLI hỗ trợ lệnh QH, GULAND và QUYHOACHGULAND', () => {
        assert.ok(appJsContent.includes("cmd: 'QH'"), 'cadCommandList phải có lệnh QH');
        assert.ok(appJsContent.includes("cmd: 'GULAND'"), 'cadCommandList phải có lệnh GULAND');
        assert.ok(appJsContent.includes("case 'QH':"), 'executeCommandLine phải có case QH');
        assert.ok(appJsContent.includes("case 'GULAND':"), 'executeCommandLine phải có case GULAND');
        assert.ok(appJsContent.includes("appPlanning.toggleCadPlanning"), 'Lệnh CLI phải gọi appPlanning.toggleCadPlanning()');
    });

    await t.test('8.3 MiniCAD toggleDisplayOption và syncDisplayCheckboxes xử lý showGulandPlanning', () => {
        assert.ok(appJsContent.includes("key === 'showGulandPlanning'"), 'toggleDisplayOption phải xử lý showGulandPlanning');
        assert.ok(appJsContent.includes("setVal('cadCheckShowGulandPlanning'"), 'syncDisplayCheckboxes phải cập nhật cadCheckShowGulandPlanning');
    });

    await t.test('8.4 appMapLayers.renderPanel trong app.js chứa bộ chọn 63 tỉnh, thanh trượt độ mờ và công tắc Guland', () => {
        assert.ok(appJsContent.includes('mlGulandSwitch'), 'appMapLayers phải có mlGulandSwitch');
        assert.ok(appJsContent.includes('mlGulandProvSelect'), 'appMapLayers phải có bộ chọn mlGulandProvSelect');
        assert.ok(appJsContent.includes('Bản đồ Quy hoạch 2030 (Guland)'), 'appMapLayers phải có nhãn tiếng Việt');
        assert.ok(appJsContent.includes('appPlanning.setProvinceGlobal'), 'appMapLayers phải gọi setProvinceGlobal');
    });
});

test('=== NHÓM 9: DUY NHẤT 1 LỚP BẢN ĐỒ GULAND, CHO PHÉP CHỌN TỈNH HOẶC TẮT LỚP TRIỆT ĐỂ ===', async (t) => {
    const { GulandPlanning } = createPlanningSandbox();

    await t.test('9.1 Cho phép chọn 63 tỉnh trong Quản lý lớp bản đồ ngay cả khi lớp Guland đang TẮT', () => {
        // Kiểm tra logic renderPanel trong app.js: khi isGulandOn = false, vẫn có mlGulandProvSelect để người dùng chọn trước tỉnh
        assert.ok(appJsContent.includes('mlGulandProvSelect'), 'Phải có mlGulandProvSelect');
        assert.ok(appJsContent.includes('Chọn tỉnh hiển thị:'), 'Phải có nhãn chọn tỉnh hiển thị khi đang tắt');
    });

    await t.test('9.2 Hàm panToProvince tồn tại trên GulandPlanning và hoạt động chính xác', () => {
        assert.equal(typeof GulandPlanning.panToProvince, 'function', 'Phải có hàm panToProvince');
        GulandPlanning.panToProvince('projectMap', 'dong-nai');
        assert.equal(GulandPlanning.targets.projectMap.provinceSlug, 'dong-nai');
    });

    await t.test('9.3 Tắt lớp quy hoạch đóng triệt để thẻ nổi (togglePanel tôn trọng trạng thái tắt willOpen)', () => {
        assert.ok(planningJsContent.includes("this.togglePanel('liveMap', willOpen)"), 'toggleLiveMapPlanning phải truyền willOpen');
        assert.ok(planningJsContent.includes("this.togglePanel('transformMap', willOpen)"), 'toggleTransformMapPlanning phải truyền willOpen');
        assert.ok(planningJsContent.includes("this.togglePanel('projectMap', willOpen)"), 'toggleProjectMapPlanning phải truyền willOpen');
        assert.ok(planningJsContent.includes("this.togglePanel('cadMap', willOpen)"), 'toggleCadPlanning phải truyền willOpen');
    });

    await t.test('9.4 Đóng cửa sổ CAD và resetMapChrome ẩn sạch bảng nổi quy hoạch cadPlanningCtrl / mapProjectPlanningCtrl', () => {
        assert.ok(appJsContent.includes("'mapProjectPlanningCtrl'"), 'resetMapChrome phải ẩn mapProjectPlanningCtrl');
        assert.ok(appJsContent.includes("'cadPlanningCtrl'"), 'resetMapChrome và closeCadWindows phải ẩn cadPlanningCtrl');
    });

    await t.test('9.5 CADCraft CLI hỗ trợ lệnh nâng cao: QH OFF, QH ON và QH <tên_tỉnh>', () => {
        assert.ok(appJsContent.includes("upArg === 'OFF'"), 'CLI phải nhận tham số OFF');
        assert.ok(appJsContent.includes("upArg === 'ON'"), 'CLI phải nhận tham số ON');
        assert.ok(appJsContent.includes("appPlanning.setProvince('cadMap'"), 'CLI phải chuyển tỉnh trực tiếp khi truyền tên tỉnh');
    });

    await t.test('9.6 planning_map.js sở hữu cơ chế removeAllGulandLayersFromMap và syncMainMapTargets chống sót layer', () => {
        assert.ok(planningJsContent.includes('function removeAllGulandLayersFromMap'), 'Phải có hàm purge removeAllGulandLayersFromMap');
        assert.ok(planningJsContent.includes('function syncMainMapTargets'), 'Phải có hàm đồng bộ syncMainMapTargets giữa projectMap và cadMap');
        assert.ok(planningJsContent.includes('removeAllGulandLayersFromMap(map)'), 'toggle và setProvince phải dọn sạch layer trước khi vẽ layer mới');
    });
});
