/**
 * BỘ KIỂM THỬ: CẦU NỐI GIS WP-B (NẠP / XUẤT GeoJSON · KML · GPX · WKT)
 *
 * Chạy THẬT các hàm nghiệp vụ cắt nguyên văn từ app.js (cơ chế sandbox `new Function`
 * như tests/point_styling_visibility.test.js) trên động cơ GisIO thật của src/core/gis_io.js:
 *  - appGis.readFromFile / summarize / projectPos / resolveKtt / applyKtt
 *  - appGis.featuresToCadShapes (khối + tuyến + lớp điểm rời, tên không trùng, đỉnh lỗi bị bỏ)
 *  - appGis.featuresToProjectPoints (sổ đo dự án, ghi nguồn GHI CHÚ theo khối)
 *  - appGis.featuresFromPoints / featuresFromShapes cho exporter GPX / WKT / GeoJSON
 *  - appCadTool.openGisImportModal / applyGisImport / _importPointLayer
 *  - appData.onGisProjectFilePicked / applyGisToProject / getExportGeometry / exportGpxFile / exportWktFile
 *  - Đăng ký tài nguyên: index.html nạp gis_io.js trước app.js, sw.js lưu cache, 2 dropdown có .gpx/.wkt
 *
 * Run: node tests/gis_import_export_bridge.test.js
 */

const fs = require('fs');
const path = require('path');
const GisIO = require('../src/core/gis_io.js');

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

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

/** Cắt nguyên văn một object literal `const NAME = {` ... `};` khỏi app.js. */
function extractObject(marker) {
    const start = appJs.indexOf(marker);
    if (start < 0) throw new Error('Không tìm thấy ' + marker + ' trong app.js');
    const open = appJs.indexOf('{', start);
    let depth = 0;
    for (let j = open; j < appJs.length; j++) {
        if (appJs[j] === '{') depth++;
        else if (appJs[j] === '}') {
            depth--;
            if (depth === 0) return appJs.slice(open + 1, j);
        }
    }
    throw new Error('Ngoặc nhọn không cân bằng: ' + marker);
}

/** Cắt nguyên văn một method của appData / appCadTool để chạy trong sandbox. */
function extractMethod(name, from = 0) {
    const start = appJs.indexOf('\n    ' + name + '(', from);
    if (start < 0) throw new Error('Không tìm thấy method: ' + name);
    let parenDepth = 0, parenClose = -1;
    for (let j = appJs.indexOf('(', start); j < appJs.length; j++) {
        if (appJs[j] === '(') parenDepth++;
        else if (appJs[j] === ')') { parenDepth--; if (parenDepth === 0) { parenClose = j; break; } }
    }
    if (parenClose < 0) throw new Error('Không cân bằng ngoặc tham số: ' + name);
    const open = appJs.indexOf('{', parenClose);
    let depth = 0;
    for (let j = open; j < appJs.length; j++) {
        if (appJs[j] === '{') depth++;
        else if (appJs[j] === '}') { depth--; if (depth === 0) return appJs.slice(start + 1, j + 1); }
    }
    throw new Error('Ngoặc nhọn không cân bằng: ' + name);
}

// ---------------- Môi trường giả lập trắc địa (hàm bậc nhất, dễ kiểm chứng) ----------------
// WGS84 -> VN2000: X = lat*110000, Y = 500000 + (lng - KTT)*100000 (đảo ngược chính xác)
const toVn2k = (lat, lng, ktt) => ({ X: (lat * 110000).toFixed(3), Y: (500000 + (lng - ktt) * 100000).toFixed(3) });
const toWgs = (x, y, ktt) => ({ lat: (x / 110000).toFixed(7), lng: (ktt + (y - 500000) / 100000).toFixed(7) });

const VN_PROVINCES = [
    { name: 'Hà Nội', deg: 105, min: 30, ktt: 105.5 },
    { name: 'Cà Mau', deg: 104, min: 45, ktt: 104.75 }
];

function makeEnv(state) {
    const toasts = [];
    const env = {
        AppState: state,
        VN_PROVINCES,
        toasts,
        showToast: (msg) => toasts.push(msg),
        escapeHtml: (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
        convertWgsToVn2k: (lat, lng, ktt) => toVn2k(lat, lng, ktt),
        convertVn2kToWgs: (x, y, ktt) => toWgs(x, y, ktt),
        appSettings: { saved: 0, save() { this.saved++; } },
        appNav: { banners: 0, updateBanner() { this.banners++; }, openCadMap() {}, syncBottomNav() {} },
        GisIO
    };
    return env;
}

const baseState = () => ({
    kttDeg: 105, kttMin: 30, kttVal: 105.5, muiVal: 3, scaleFactor: 0.9999,
    provinceName: 'Hà Nội', provinceIndex: 0, currentProject: 'DuAn.csv', leafletMap: null
});

function buildAppGis(env) {
    const body = extractObject('const appGis = {');
    return new Function('AppState', 'VN_PROVINCES', 'escapeHtml', 'showToast',
        'convertWgsToVn2k', 'convertVn2kToWgs', 'appSettings', 'appNav', 'GisIO',
        `return {${body}};`)(env.AppState, env.VN_PROVINCES, env.escapeHtml, env.showToast,
        env.convertWgsToVn2k, env.convertVn2kToWgs, env.appSettings, env.appNav, env.GisIO);
}

const GEOJSON_WGS = JSON.stringify({
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', properties: { name: 'Mốc A' }, geometry: { type: 'Point', coordinates: [106.05, 21.0, 12.5] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [106.06, 21.01] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [106.07, 21.02] } },
        { type: 'Feature', properties: { name: 'Thửa 17' }, geometry: { type: 'Polygon', coordinates: [[[106.0, 21.0], [106.001, 21.0], [106.001, 21.001], [106.0, 21.001], [106.0, 21.0]]] } },
        { type: 'Feature', properties: { name: 'Tuyến điện' }, geometry: { type: 'LineString', coordinates: [[106.02, 21.02], [106.03, 21.03]] } },
        { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [2.29, 48.85] } }
    ]
});

// Điểm đã chiếu theo hàm giả lập ở trên: lat 21 -> X 2310000 ; lng 106.05 với KTT 105.5 -> Y 555000
const GEOJSON_PROJECTED = JSON.stringify({
    type: 'FeatureCollection',
    features: [
        { type: 'Feature', properties: { name: 'M1' }, geometry: { type: 'Point', coordinates: [555000, 2310000, 3] } },
        { type: 'Feature', properties: { name: 'M2' }, geometry: { type: 'Point', coordinates: [555100, 2311100] } }
    ]
});

// =====================================================================
// 1. Đăng ký tài nguyên & giao diện (index.html, sw.js)
// =====================================================================
console.log('\n— Đăng ký động cơ GIS và các nút/modal trong giao diện —');
{
    const ioTag = indexHtml.indexOf('src/core/gis_io.js');
    assert(ioTag > 0, 'index.html nạp <script src="src/core/gis_io.js">');
    assert(ioTag < indexHtml.indexOf('src="app.js?v='),
        'gis_io.js nạp TRƯỚC app.js (appGis cần GisIO khi chạy)');
    assert(/gis_io\.js\?v=\d/.test(indexHtml), 'gis_io.js có phiên bản cache-bust ?v=');
    assert(swJs.includes("'./src/core/gis_io.js'"), 'sw.js đưa gis_io.js vào ASSETS_TO_CACHE offline');

    assert(indexHtml.includes('id="cadFileInputGis"'), 'MiniCAD có <input type=file> riêng cho GIS');
    assert(indexHtml.includes('id="modalCadGisImport"'), 'MiniCAD có modal #modalCadGisImport của riêng phân hệ');
    ['cadGisSummary', 'cadGisKtt', 'cadGisMui', 'cadGisLayerName', 'cadGisTargetProjected'].forEach(id =>
        assert(indexHtml.includes(`id="${id}"`), `modal GIS MiniCAD có điều khiển #${id}`));
    ['cadGisCrs', 'cadGisAxis', 'cadGisTarget'].forEach(name =>
        assert(indexHtml.includes(`name="${name}"`), `modal GIS MiniCAD có nhóm lựa chọn ${name}`));

    assert(indexHtml.includes('id="fileInputProjectGis"'), 'Bản đồ dự án có <input type=file> GIS riêng');
    ['projGisSummary', 'projGisCrs', 'projGisKtt', 'projGisMui', 'projGisSource', 'projGisAxis', 'btnProjGisImport']
        .forEach(id => assert(indexHtml.includes(`id="${id}"`), `panel nhập dự án có #${id}`));

    const gpxCount = (indexHtml.match(/value="gpx" data-format="gpx"/g) || []).length;
    const wktCount = (indexHtml.match(/value="wkt" data-format="wkt"/g) || []).length;
    assert(gpxCount === 2, 'Cả 2 dropdown xuất định dạng đều có .gpx (MiniCAD + dự án)');
    assert(wktCount === 2, 'Cả 2 dropdown xuất định dạng đều có .wkt (MiniCAD + dự án)');
}

// =====================================================================
// 2. appGis nhận diện tệp + tóm tắt cho người dùng
// =====================================================================
console.log('\n— appGis.readFromFile / summarize —');
{
    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const read = (text, fileName) => {
        let out = null;
        const fakeFile = { name: fileName };
        // readFromFile dùng FileReader thật của trình duyệt: mô phỏng đúng callback
        const RealFileReader = global.FileReader;
        global.FileReader = class { readAsText() { this.onload({ target: { result: text } }); } };
        appGis.readFromFile(fakeFile, (r) => { out = r; });
        global.FileReader = RealFileReader;
        return out;
    };

    const r = read(GEOJSON_WGS, 'thua.geojson');
    assert(r && r.ok && r.format === 'geojson', 'readFromFile trả kết quả GeoJSON hợp lệ');
    assert(r.fileName === 'thua.geojson', 'readFromFile gắn tên tệp vào kết quả để ghi nguồn điểm');
    assert(appGis.summarize(r) === 'GEOJSON • 4 điểm rời • 1 tuyến • 1 khối (7 đỉnh)',
        'summarize đếm đúng điểm/tuyến/khối/đỉnh hình học: ' + appGis.summarize(r));

    const bad = read('{"type":"FeatureCollection","features":[]}', 'rong.geojson');
    assert(/không tìm thấy hình học/i.test(appGis.summarize(bad)),
        'Tệp không có hình học: summarize dịch mã lỗi sang tiếng Việt');
    const kmz = read('zipzip', 'nen.kmz');
    assert(/KMZ/i.test(appGis.summarize(kmz)), 'KMZ được hướng dẫn chuyển ra KML thay vì báo lỗi chung');

    // Điểm Paris (vĩ độ 48) hợp lệ về mặt GIS nhưng ngoài Việt Nam -> bị loại ở bước cầu nối
    const converted = appGis.featuresToCadShapes(r, {
        ktt: appGis.resolveKtt('current'), crs: 'auto', axis: 'EN', layerName: ''
    });
    assert(converted.skipped === 1, 'Đỉnh ngoài vùng Việt Nam bị bỏ và ĐẾP ĐÚNG số lượng (1)');
    assert(converted.shapes.length === 2, 'Khối + tuyến vào bản vẽ: 2 shape');
    assert(converted.shapes[0].mode === 'polygon' && converted.shapes[0].vertices.length === 5,
        'Polygon đóng kín giữ đủ 5 đỉnh vòng ngoài');
    assert(converted.shapes[0].name === 'Thửa 17', 'Giữ tên thuộc tính của đối tượng GIS');
    assert(converted.shapes[1].mode === 'polyline' && converted.shapes[1].name === 'Tuyến điện',
        'LineString vào CAD thành polyline mang tên');
    assert(converted.pointLayer && converted.pointLayer.vertices.length === 3,
        '3 điểm rời WGS84 hợp lệ gom thành một lớp điểm');
    assert(converted.pointLayer.vertices[0].name === 'Mốc A', 'Điểm có tên trong tệp giữ nguyên tên');
    assert(converted.pointLayer.vertices.slice(1).every((v, i) => v.name === `Đ${i + 2}`),
        'Điểm vô tên đánh số Đ2, Đ3 KHÔNG trùng (đếm theo toàn lớp, không theo từng feature)');
    assert(converted.pointLayer.vertices.every(v => v.snapSource.startsWith('GEOJSON: thua.geojson')),
        'Mỗi đỉnh mang nguồn GIS để truy vết sau này');
    assert(converted.pointLayer.vertices[0].x === '2310000.000' * 1 || Math.abs(converted.pointLayer.vertices[0].x - 2310000) < 1,
        'Điểm rời đã quy đổi X theo KTT đang chọn');
}

// =====================================================================
// 3. Tệp đã chiếu (VN2000) + trục tọa độ + KTT
// =====================================================================
console.log('\n— projectPos với tệp chiếu và lựa chọn KTT —');
{
    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const r = GisIO.read(GEOJSON_PROJECTED, 'ban_do.geojson');
    assert(r.ok && r.features[0].crs === 'projected', 'GisIO gắn crs=projected cho tọa độ mét lớn');

    const k = appGis.resolveKtt('current');
    assert(k.changed === false && k.ktt === 105.5, 'resolveKtt("current") giữ kinh tuyến trục đang dùng');

    const en = appGis.featuresToCadShapes(r, { ktt: k, crs: 'auto', axis: 'EN', layerName: '' });
    assert(en.skipped === 0 && en.pointLayer.vertices.length === 2, 'Đọc trục (Đông, Bắc) theo mặc định QGIS');
    assert(en.pointLayer.vertices[0].x === 2310000 && en.pointLayer.vertices[0].y === 555000,
        'Trục 1=Y Đông, trục 2=X Bắc -> X/Y đúng thứ tự trắc địa');

    const ne = appGis.featuresToCadShapes(r, { ktt: k, crs: 'auto', axis: 'NE', layerName: '' });
    assert(ne.pointLayer.vertices[0].x === 555000, 'Chọn trục (Bắc, Đông) đảo lại X/Y cho tệp kiểu AutoCAD');

    // Người dùng ép hệ WGS84 cho tệp đã chiếu -> vĩ độ 2310000 ngoài Việt Nam, phải bỏ hết
    const forced = appGis.featuresToCadShapes(r, { ktt: k, crs: 'wgs84', axis: 'EN', layerName: '' });
    assert(forced.skipped === 2 && !forced.pointLayer, 'Ép sai hệ tọa độ: bỏ đỉnh và báo qua bộ đếm skipped');

    const doIt = appGis.resolveKtt('1', '6');
    assert(doIt.changed === true && doIt.ktt === 104.75 && doIt.k0 === 0.9996,
        'resolveKtt theo tỉnh + múi 6° trả đúng k0=0.9996');
    assert(appGis.applyKtt(doIt) === true, 'applyKtt xác nhận đã đổi kinh tuyến trục');
    assert(env.AppState.kttVal === 104.75 && env.AppState.muiVal === 6 && env.AppState.provinceName === 'Cà Mau',
        'KTT mới đồng bộ vào AppState (để _normalizeVertex không tính lại theo KTT cũ)');
    assert(env.appSettings.saved === 1 && env.appNav.banners === 1,
        'Đổi KTT lưu cài đặt và cập nhật banner dự án');
    assert(appGis.applyKtt(appGis.resolveKtt('current')) === false,
        'applyKtt không ghi gì khi người dùng giữ nguyên KTT');
}

// =====================================================================
// 4. Sổ đo dự án: mốc + ghi chú theo khối
// =====================================================================
console.log('\n— featuresToProjectPoints cho Bản đồ dự án —');
{
    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const r = GisIO.read(GEOJSON_WGS, 'quy_hoach.geojson');
    r.format = 'kml';
    const k = appGis.resolveKtt('current');
    const { pts, meta } = appGis.featuresToProjectPoints(r, { ktt: k, crs: 'auto', axis: 'EN', tagShape: true });
    assert(meta.skipped === 1, 'Mốc ngoài Việt Nam bị loại khỏi sổ đo và có đếm');
    assert(pts.length > 0 && pts.every(p => p.source === 'KML'), 'Mỗi mốc ghi nguồn định dạng KML');
    assert(pts[0].name === 'Mốc A' && pts[0].h === 12.5, 'Điểm đặt tên giữ tên và cao độ H');
    assert(new Set(pts.map(p => p.name)).size === pts.length, 'Không có hai mốc trùng tên trong sổ đo');
    assert(pts.every(p => p.ktt === "105°30'"), 'Mốc lưu nhãn kinh tuyến trục đã dùng để quy đổi');
    const dauVet = pts.find(p => p.note && p.note.includes('đỉnh'));
    assert(dauVet && /Thửa 17 • đỉnh \d/.test(dauVet.note),
        'Đỉnh khối vào sổ đo ghi chú rõ thuộc thửa nào: ' + (dauVet && dauVet.note));
    assert(pts.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), 'Mọi mốc đều có X/Y VN2000 hợp lệ');
}

// =====================================================================
// 5. Đường xuất: featuresFromPoints / featuresFromShapes mang kiểu & màu
// =====================================================================
console.log('\n— Bộ đóng gói feature cho exporter GPX / WKT / GeoJSON —');
{
    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const pts = [
        { name: 'M1', lat: 21, lng: 106.05, x: 2310000, y: 555000, h: 5, note: 'Mốc ranh', pointStyle: 'diamond', pointColor: '#ef4444' },
        { name: 'M2', lat: 0, lng: 0, x: 2311100, y: 555100 },
        { name: 'M3', lat: 21.01, lng: 106.06, x: 2311100, y: 555100 }
    ];
    const feats = appGis.featuresFromPoints(pts);
    assert(feats.length === 2, 'Mốc chưa có kinh/vĩ độ bị loại (tệp GIS luôn ghi WGS84)');
    assert(feats[0].properties.point_style === 'diamond' && feats[0].properties.point_color === '#ef4444',
        'GeoJSON mang theo point_style / point_color của điểm');
    assert(feats[0].properties.stt === 1 && feats[1].properties.stt === 2,
        'STT đánh lại liên tục sau khi lọc mốc lỗi, không nhảy thứ tự');
    assert(feats[0].rings[0][0].lng === 106.05 && feats[0].rings[0][0].lat === 21,
        'Feature Point ghi kinh độ trước vĩ độ sau đúng chuẩn');

    const shapes = [
        { name: 'Thửa 5', mode: 'polygon', layer: 'RANH_THUA', color: '#ef4444', stats: { area: 107.6666667, perimeter: 42.1234 }, vertices: pts.map(p => ({ lat: 21, lng: 106.05, x: 1, y: 2, h: 0 })).slice(0, 3) },
        { name: 'Cọc biên', mode: 'point', color: '#22c55e', style: 'cross', vertices: [{ name: 'C1', lat: 21.0, lng: 106.05, x: 0, y: 0, h: 1 }, { name: '', lat: 21.1, lng: 106.06, x: 0, y: 0, h: 0 }, { name: 'Lỗi', lat: 0, lng: 0, x: 0, y: 0 }] }
    ];
    const sf = appGis.featuresFromShapes(shapes);
    assert(sf.filter(f => f.kind === 'polygon').length === 1, 'Polygon CAD ra feature Polygon');
    const polyProps = sf[0].properties;
    assert(polyProps.cad_layer === 'RANH_THUA' && polyProps.area_m2 === 107.67 && polyProps.perimeter_m === 42.12,
        'GeoJSON khối kèm lớp CAD, diện tích và chu vi làm tròn 2 số');
    const pointFeats = sf.filter(f => f.kind === 'point');
    assert(pointFeats.length === 2, 'Lớp điểm chỉ xuất 2 điểm có kinh/vĩ độ hợp lệ');
    assert(pointFeats[0].properties.point_style === 'cross' && pointFeats[0].properties.point_color === '#22c55e',
        'Điểm thừa kế kiểu/màu mặc định của lớp khi chính nó không đặt');
    assert(pointFeats[1].name === 'Cọc biên_2', 'Điểm vô tên trong lớp điểm sinh tên theo khối + số thứ tự');

    // Vòng quay tệp: writer -> reader phải giữ nguyên số đối tượng
    const geoText = GisIO.toGeoJsonText(sf, { name: 'KiểmThử' });
    const back = GisIO.read(geoText, 'xuat.geojson');
    assert(back.ok && back.counts.polygons === 1 && back.counts.points === 2,
        'Xuất GeoJSON rồi nạp lại: giữ đủ 1 khối + 2 điểm rời');
    const gpxText = GisIO.toGpxText(sf, { creator: 'VN2000-PWA' });
    assert(gpxText.includes('<wpt lat="21" lon="106.05"') && gpxText.includes('<trk>'),
        'GPX có waypoint cho điểm rời và track cho khối/tuyến');
    const wktText = GisIO.toWktText(sf, { precision: 7 });
    assert(/POINT \(106\.05 21/.test(wktText) && /POLYGON/.test(wktText),
        'WKT ghi POINT và POLYGON theo thứ tự kinh trước vĩ sau');
    const backWkt = GisIO.read(wktText, 'xuat.wkt');
    assert(backWkt.ok && backWkt.counts.polygons === 1 && backWkt.counts.points === 2,
        'WKT xuất ra đọc lại được bằng chính động cơ GIS');
}

// =====================================================================
// 6. appCadTool: modal nạp GIS của riêng MiniCAD
// =====================================================================
console.log('\n— appCadTool.openGisImportModal / applyGisImport / _importPointLayer —');
{
    const cadStart = appJs.indexOf('const appCadTool = {');
    assert(cadStart > 0, 'Định vị được appCadTool trong app.js');
    ['openGisImportModal', 'closeGisImportModal', 'onGisFilePicked', 'applyGisImport', '_importPointLayer', '_gisRadioValue', '_gisSetRadio']
        .forEach(name => assert(appJs.includes('\n    ' + name + '('), `appCadTool có ${name}()`));
    assert(appJs.includes("'modalCadGisImport'"),
        'modal GIS nằm trong danh sách đóng cửa sổ khi rời MiniCAD (chống đè phân hệ khác)');

    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const controls = {
        modalCadGisImport: { style: {} },
        cadGisKtt: { value: 'current', options: [] }, cadGisMui: { value: '3' },
        cadGisLayerName: { value: 'Điểm QH' },
        cadGisSummary: { textContent: '' }, cadGisTargetProjected: { style: {} },
        cadFileInputGis: { value: '' }
    };
    const RealDoc = global.document;
    global.document = {
        getElementById: (id) => controls[id] || null,
        querySelector: (sel) => {
            const m = /name="(\w+)":checked/.exec(sel);
            if (!m) return null;
            const v = controls[m[1]];
            return v ? { value: v } : null;
        }
    };
    controls.cadGisCrs = 'auto';
    controls.cadGisAxis = 'EN';
    controls.cadGisTarget = 'shapes';

    const ctx = {
        _gisResult: null, savedShapes: [], currentLayer: 'RANH_THUA', palette: ['#06b6d4'],
        applyImports: [], pointLayerCalls: [], closed: 0,
        _applyImportedShapes(shapes, fileName) { this.applyImports.push({ shapes, fileName }); },
        _importPointLayer(layer) { this.pointLayerCalls.push(layer); return { id: 'x' }; },
        _gisRadioValue(group, fallback) { return controls[group] === undefined ? fallback : controls[group]; },
        _gisSetRadio() {},
        closeGisImportModal() { this.closed++; }
    };
    const run = (name, ctxObj) => {
        const obj = new Function('appGis', 'GisIO', 'AppState', 'showToast', 'document', 'escapeHtml',
            `return ({ ${extractMethod(name, cadStart)} });`)(
            appGis, GisIO, env.AppState, env.showToast, global.document, env.escapeHtml);
        return obj[name].bind(ctxObj);
    };

    // (a) mở modal: reset trạng thái, ẩn hàng trục tọa độ
    const r1 = GisIO.read(GEOJSON_WGS, 'a.geojson');
    ctx._gisResult = r1;
    run('openGisImportModal', ctx)();
    assert(controls.cadGisSummary.textContent.includes('Chưa chọn tệp'),
        'Mở modal đặt lại dòng tóm tắt về trạng thái chưa chọn tệp');
    assert(controls.cadGisTargetProjected.style.display === 'none', 'Mở modal ẩn hàng "thứ tự trục" (chỉ dùng cho tệp chiếu)');
    assert(ctx._gisResult === null, 'Mở modal xóa kết quả cũ để không nạp lại tệp cũ âm thầm');

    // (b) nạp chỉ khối & tuyến -> điểm rời bị bỏ đúng theo lựa chọn
    ctx._gisResult = r1; // modal vừa mở có chủ đích reset kết quả, phải "chọn tệp" lại
    ctx.applyImports.length = 0; ctx.pointLayerCalls.length = 0;
    run('applyGisImport', ctx)();
    assert(ctx.applyImports.length === 1 && ctx.applyImports[0].shapes.length === 2,
        'Lựa chọn "Chỉ khối & tuyến" nạp đủ 2 shape và không tạo lớp điểm');
    assert(ctx.pointLayerCalls.length === 0, 'Không âm thầm tạo lớp điểm khi người dùng chỉ chọn khối');

    // (c) cả khối + điểm, tên lớp điểm lấy từ ô nhập
    controls.cadGisTarget = 'both';
    ctx.applyImports.length = 0; ctx.pointLayerCalls.length = 0;
    run('applyGisImport', ctx)();
    assert(ctx.pointLayerCalls.length === 1 && ctx.pointLayerCalls[0].name === 'Điểm QH',
        'Lớp điểm nhận tên người dùng nhập trong modal');
    assert(ctx.pointLayerCalls[0].vertices.every(v => v.name && v.x > 0),
        'Điểm vào lớp đã quy đổi X/Y và có tên');
    assert(ctx.closed === 2, 'Mỗi lần nạp xong là đóng modal GIS (2 lần nạp = 2 lần đóng)');
    assert(env.appSettings.saved === 0,
        'Giữ KTT hiện tại thì không ghi đè cài đặt toàn dự án');
    global.document = RealDoc;
}

// =====================================================================
// 7. _importPointLayer dựng shape mode 'point' đúng cấu trúc MiniCAD
// =====================================================================
console.log('\n— _importPointLayer: lớp điểm GIS hòa nhập dữ liệu MiniCAD —');
{
    const cadStart = appJs.indexOf('const appCadTool = {');
    const calls = [];
    const ctx = {
        savedShapes: [], pointLayerId: null, palette: ['#06b6d4'],
        _normalizeVertex: (v) => (isFinite(v.lat) && isFinite(v.lng) ? Object.assign({}, v) : null),
        calculateAreaAndPerimeter: (verts, mode) => ({ mode, count: verts.length }),
        getLayerById: () => ({ color: '#22c55e' }),
        getPointLayers: () => [],
        pushHistoryState: (label) => calls.push(['history', label]),
        saveShapesForProject: (p) => calls.push(['save', p]),
        persistSession: () => calls.push(['session']),
        renderGeometry: () => calls.push(['render']),
        updateUi: () => calls.push(['ui']),
        renderBlocksPanel: () => calls.push(['blocks']),
        refreshPointLayerBar: () => calls.push(['bar'])
    };
    const fn = new Function('AppState', `return ({ ${extractMethod('_importPointLayer', cadStart)} });`)({ currentProject: 'DuAn.csv' })._importPointLayer;
    const layer = fn.call(ctx, { name: 'Điểm GPS', vertices: [{ lat: 21, lng: 106.05, x: 1, y: 2, h: 0 }] });
    assert(layer && layer.mode === 'point' && layer.layer === 'MOC_TOADO',
        'Lớp điểm GIS tạo với mode=point, lớp MOC_TOADO (không lẫn vào RANH_THUA)');
    assert(layer.style === 'circle' && layer.color === '#22c55e',
        'Ký hiệu mặc định tròn + màu lớp mốc tọa độ');
    assert(ctx.savedShapes.length === 1 && ctx.pointLayerId === layer.id,
        'Lớp mới được đẩy vào savedShapes và trở thành lớp điểm đang nhận điểm mới');
    const seq = calls.map(c => c[0]);
    assert(seq.join(',') === 'history,save,session,render,ui,blocks,bar',
        'Lưu lịch sử + ghi dự án + dựng lại bản đồ theo đúng thứ tự: ' + seq.join(','));

    const empty = fn.call(ctx, { name: 'Rỗng', vertices: [] });
    assert(empty === null, 'Lớp điểm không có đỉnh: không tạo shape rác');
    const badVerts = fn.call(ctx, { name: 'Lỗi', vertices: [{}] });
    assert(badVerts === null, 'Toàn bộ đỉnh bị _normalizeVertex loại: không tạo lớp rỗng');
}

// =====================================================================
// 8. appData: nạp GIS vào sổ đo dự án (surface riêng, không mở cửa sổ CAD)
// =====================================================================
console.log('\n— appData.onGisProjectFilePicked / applyGisToProject —');
{
    const dataStart = appJs.indexOf('const appData = {');
    assert(dataStart > 0, 'Định vị được appData trong app.js');
    ['onGisProjectFilePicked', 'applyGisToProject'].forEach(name =>
        assert(appJs.includes('\n    ' + name + '('), `appData có ${name}()`));

    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const controls = {
        projGisKtt: { value: 'current', options: [{}, {}] }, projGisMui: { value: '3' },
        projGisCrs: { value: 'auto' }, projGisAxis: { value: 'EN' }, projGisSource: { value: 'all' },
        projGisSummary: { textContent: '' }, btnProjGisImport: { disabled: true }
    };
    const RealDoc = global.document;
    global.document = { getElementById: (id) => controls[id] || null, querySelector: () => null };

    const ctx = {
        saved: [], closes: 0,
        getPoints: () => [],
        saveImportedPoints(pts, name) { this.saved.push({ pts, name }); },
        fillKtt: 0
    };
    const run = (name, ctxObj) => {
        const obj = new Function('appGis', 'GisIO', 'AppState', 'showToast', 'document', 'escapeHtml', 'appData',
            `return ({ ${extractMethod(name, dataStart)} });`)(
            appGis, GisIO, env.AppState, env.showToast, global.document, env.escapeHtml, ctxObj);
        return obj[name].bind(ctxObj);
    };

    // (a) chọn tệp -> đọc, bật nút nạp
    const RealFR = global.FileReader;
    global.FileReader = class { readAsText(file) { this.onload({ target: { result: GEOJSON_WGS } }); } };
    const fileEvent = { target: { files: [{ name: 'quy_hoach.geojson' }], value: '' } };
    run('onGisProjectFilePicked', ctx)(fileEvent);
    global.FileReader = RealFR;
    assert(/GEOJSON • 4 điểm rời/.test(controls.projGisSummary.textContent),
        'Panel dự án tóm tắt đủ số đối tượng GIS ngay sau khi chọn tệp');
    assert(ctx._gisProjectResult && ctx._gisProjectResult.ok, 'Kết quả đọc được giữ để nút "Nạp" dùng lại');
    assert(controls.btnProjGisImport.disabled === false, 'Nút nạp chỉ mở khóa khi tệp hợp lệ');
    assert(fileEvent.target.value === '', 'Reset input file để chọn lại cùng tệp vẫn kích hoạt onchange');

    // (b) bấm nạp -> saveImportedPoints với tên dự án lấy từ tệp
    const fn = run('applyGisToProject', ctx);
    fn();
    assert(ctx.saved.length === 1 && /\.csv$/.test(ctx.saved[0].name) && ctx.saved[0].name.includes('quy_hoach'),
        'Nạp xong tạo sổ đo "<tên tệp>.csv": ' + (ctx.saved[0] && ctx.saved[0].name));
    assert(ctx.saved[0].pts.length > 3 && ctx.saved[0].pts.every(p => p.lat && p.x),
        'Mốc nạp vào có đủ kinh/vĩ độ lẫn X/Y');
    const onlyPointNames = ctx.saved[0].pts.map(p => p.name);
    assert(new Set(onlyPointNames).size === onlyPointNames.length, 'Sổ đo không có mốc trùng tên');

    // (c) lọc "chỉ điểm rời"
    ctx.saved.length = 0;
    controls.projGisSource.value = 'points';
    fn();
    assert(ctx.saved.length === 1 && ctx.saved[0].pts.length === 3,
        'Lựa chọn "Chỉ điểm rời" nạp đúng 3 điểm WGS84 hợp lệ, bỏ đỉnh khối/tuyến');

    // (d) tệp lỗi: không được gọi saveImportedPoints
    ctx.saved.length = 0;
    ctx._gisProjectResult = { ok: false, error: 'FILE_RONG' };
    fn();
    assert(ctx.saved.length === 0, 'Tệp lỗi: không nạp gì vào sổ đo');

    // (e) không có đường nào mở cửa sổ MiniCAD từ panel dự án (AGENTS.md §2)
    const gisBlock = appJs.slice(appJs.indexOf('    onGisProjectFilePicked(event) {'), appJs.indexOf('    extractPointsFromWorkbook(wb) {'));
    assert(!gisBlock.includes('appCadTool.') && !gisBlock.includes('openCadMap'),
        'Luồng nạp GIS của dự án không gọi thẳng cửa sổ MiniCAD (tách biệt phân hệ)');
    global.document = RealDoc;
}

// =====================================================================
// 9. appData.getExportGeometry + exporter GPX/WKT của sổ đo
// =====================================================================
console.log('\n— getExportGeometry / exportGpxFile / exportWktFile (dự án) —');
{
    const dataStart = appJs.indexOf('const appData = {');
    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const RealDoc = global.document;
    const downloads = [];
    global.document = {
        createElement: () => ({
            set href(v) { this._h = v; }, get href() { return this._h; },
            click() { downloads.push(this.download); }, remove() {}, style: {}
        }),
        body: { appendChild() {}, removeChild() {} }
    };
    global.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
    global.Blob = class { constructor(parts) { this.text = parts.join(''); } };

    const ctx = {
        getPoints: () => [
            { name: 'M1', lat: 21, lng: 106.05, x: 2310000, y: 555000, h: 3, pointStyle: 'ring', pointColor: '#38bdf8' },
            { name: 'M2', lat: 21.01, lng: 106.06, x: 2311100, y: 555100, h: 4 },
            { name: 'M3', lat: 21.02, lng: 106.07, x: 2312200, y: 555200, h: 5 },
            { name: 'M4', lat: 0, lng: 0, x: 0, y: 0 }
        ]
    };
    const grab = (name) => {
        const obj = new Function('appData', 'appGis', 'GisIO', 'AppState', 'showToast', 'document', 'URL', 'Blob',
            `return ({ ${extractMethod(name, dataStart)} });`)(
            ctx, appGis, GisIO, env.AppState, env.showToast, global.document, global.URL, global.Blob);
        return obj[name].bind(ctx);
    };

    ctx._exportBaseName = grab('_exportBaseName');
    ctx._downloadText = grab('_downloadText');
    ctx.getExportGeometry = grab('getExportGeometry');
    const geo = ctx.getExportGeometry();
    assert(geo.points.length === 3, 'getExportGeometry loại mốc chưa có kinh/vĩ độ (1/4 mốc lỗi)');
    assert(geo.geometry.length === 1 && geo.geometry[0].kind === 'polygon' && geo.geometry[0].rings[0].length === 4,
        '≥3 mốc tự sinh một ranh khép kín (3 đỉnh + đỉnh đóng)');
    assert(geo.geometry[0].name.startsWith('Ranh_'), 'Ranh kế thừa tên dự án làm tên đối tượng');

    ctx.exportGpxFile = grab('exportGpxFile');
    ctx.exportWktFile = grab('exportWktFile');
    ctx.exportGpxFile();
    assert(downloads.length === 1 && /\.gpx$/.test(downloads[0]), 'appData xuất tệp .gpx');
    ctx.exportWktFile();
    assert(downloads.length === 2 && /\.wkt$/.test(downloads[1]), 'appData xuất tệp .wkt');
    assert(env.toasts.some(t => /GPX/.test(t)) && env.toasts.some(t => /WKT/.test(t)),
        'Có toast xác nhận từng định dạng vừa xuất');
    global.document = RealDoc;
}

// =====================================================================
// 10. Tệp KML/GPX/WKT thật đi hết cầu nối vào MiniCAD
// =====================================================================
console.log('\n— Đường trọn vẹn: KML / GPX / WKT vào bản vẽ CAD —');
{
    const env = makeEnv(baseState());
    const appGis = buildAppGis(env);
    const k = appGis.resolveKtt('current');
    const samples = {
        'placemark.kml': '<?xml version="1.0"?><kml><Document><Placemark><name>Thửa KML</name><Polygon><outerBoundaryIs><LinearRing><coordinates>106.0,21.0,0 106.001,21.0,0 106.001,21.001,0 106.0,21.0,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>',
        'duong.gpx': '<?xml version="1.0"?><gpx version="1.1"><wpt lat="21.0" lon="106.05"><name>W1</name></wpt><trk><trkseg><trkpt lat="21.01" lon="106.06"/><trkpt lat="21.02" lon="106.07"/></trkseg></trk></gpx>',
        'danh.sach.wkt': 'POINT (106.05 21.0)\nLINESTRING (106.0 21.0, 106.001 21.001)'
    };
    Object.entries(samples).forEach(([fileName, text]) => {
        const r = GisIO.read(text, fileName);
        assert(r.ok, `${fileName}: động cơ GIS nhận dạng và đọc được`);
        const conv = appGis.featuresToCadShapes(r, { ktt: k, crs: 'auto', axis: 'EN', layerName: '' });
        assert(conv.skipped === 0, `${fileName}: mọi đỉnh đều trong vùng Việt Nam`);
        assert(conv.shapes.length + (conv.pointLayer ? 1 : 0) >= 1, `${fileName}: có đối tượng đưa vào bản vẽ`);
    });
    const gpx = appGis.featuresToCadShapes(GisIO.read(samples['duong.gpx'], 'duong.gpx'), { ktt: k, crs: 'auto', axis: 'EN', layerName: 'Cọc GPX' });
    assert(gpx.pointLayer && gpx.pointLayer.name === 'Cọc GPX', 'Tên lớp điểm người dùng nhập thắng đề xuất tự động');
    assert(gpx.pointLayer.vertices[0].name === 'W1', ' waypoints GPX giữ <name> thành tên điểm');
    assert(gpx.shapes.length === 1 && gpx.shapes[0].mode === 'polyline', 'trkseg GPX vào CAD thành tuyến mở');
}

console.log(`\n🏁 TỔNG KẾT: ${passedTests}/${totalTests} bài test đạt 100%`);
if (passedTests !== totalTests) process.exit(1);
