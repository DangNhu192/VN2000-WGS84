/**
 * BỘ KIỂM THỬ: ĐỘNG CƠ ĐỌC/ghi GIS THUẦN JS (GisIO)
 * Chạy thật src/core/gis_io.js (không DOM, không AppState) trên Node.
 * Chạy với: node tests/gis_io_interop.test.js
 */

const path = require('path');
const GisIO = require(path.join(__dirname, '..', 'src', 'core', 'gis_io.js'));

let totalTests = 0, passedTests = 0, failedTests = 0;
function assert(condition, message) {
    totalTests++;
    if (condition) { passedTests++; console.log(`  ✅ PASS: ${message}`); }
    else { failedTests++; console.error(`  ❌ FAIL: ${message}`); }
}
const flat = (f) => (f.rings || []).reduce((a, r) => a.concat(r || []), []);
const byName = (features, name) => features.find(f => f.name === name);

console.log('========================================================================');
console.log('🧪 KIỂM THỬ: GisIO — GeoJSON / KML / GPX / WKT (đọc + ghi + round-trip)');
console.log('========================================================================\n');

// --- NHÓM 1: NHẬN DẠNG ĐỊNH DẠNG ---
console.log('--- NHÓM 1: Nhận dạng định dạng theo tên tệp & nội dung ---');
{
    assert(GisIO.detectFormat('ranh.geojson', '') === 'geojson', 'đuôi .geojson → geojson');
    assert(GisIO.detectFormat('a.json', '') === 'geojson', 'đuôi .json → geojson');
    assert(GisIO.detectFormat('moc.kml', '') === 'kml', 'đuôi .kml → kml');
    assert(GisIO.detectFormat('track.gpx', '') === 'gpx', 'đuôi .gpx → gpx');
    assert(GisIO.detectFormat('ranh.wkt', '') === 'wkt', 'đuôi .wkt → wkt');
    assert(GisIO.detectFormat('x.txt', '{"type":"FeatureCollection","features":[]}') === 'geojson', 'ngửi nội dung JSON → geojson');
    assert(GisIO.detectFormat('x.txt', '<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"></kml>') === 'kml', 'ngửi thẻ <kml> → kml');
    assert(GisIO.detectFormat('x.txt', '<gpx version="1.1"></gpx>') === 'gpx', 'ngửi thẻ <gpx> → gpx');
    assert(GisIO.detectFormat('x.txt', 'POLYGON ((0 0, 1 0, 1 1, 0 0))') === 'wkt', 'ngửi từ khóa WKT → wkt');
    assert(GisIO.detectFormat('moc.kmz', '') === 'kmz', 'giữ nhãn kmz để báo lỗi hướng dẫn người dùng');
    assert(GisIO.detectFormat('README.md', '# tai lieu') === null, 'tệp không phải GIS → null');
}

// --- NHÓM 2: GEOJSON ---
console.log('\n--- NHÓM 2: Đọc GeoJSON (RFC 7946) ---');
{
    const geojson = JSON.stringify({
        type: 'FeatureCollection',
        features: [
            { type: 'Feature', properties: { name: 'M1', note: 'mốc ranh' }, geometry: { type: 'Point', coordinates: [106.1, 10.3, 12.5] } },
            { type: 'Feature', properties: { NAME: 'Tuyến kênh' }, geometry: { type: 'LineString', coordinates: [[106.1, 10.3], [106.2, 10.3], [106.2, 10.4]] } },
            { type: 'Feature', properties: { ten: 'Thửa A' }, geometry: { type: 'Polygon', coordinates: [[[106.1, 10.3], [106.2, 10.3], [106.2, 10.4], [106.1, 10.3]], [[106.14, 10.33], [106.16, 10.33], [106.16, 10.35], [106.14, 10.33]]] } },
            { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: [[106.3, 10.5], [106.4, 10.6]] } },
            { type: 'Feature', properties: { name: 'Bộ thửa' }, geometry: { type: 'GeometryCollection', geometries: [{ type: 'Point', coordinates: [106.5, 10.7] }, { type: 'LineString', coordinates: [[106.5, 10.7], [106.6, 10.8]] }] } }
        ]
    });
    const r = GisIO.read(geojson, 'du_an.geojson');
    assert(r.ok && r.format === 'geojson', 'read() trả ok + format geojson');
    assert(r.counts.points === 4, 'tổng 4 điểm rời (M1 + 2 MultiPoint + 1 trong GeometryCollection), thực tế: ' + r.counts.points);
    assert(r.counts.lines === 2 && r.counts.polygons === 1, '2 tuyến + 1 polygon');
    const m1 = byName(r.features, 'M1');
    assert(m1 && m1.kind === 'point' && m1.rings[0][0].lat === 10.3 && m1.rings[0][0].lng === 106.1 && m1.rings[0][0].h === 12.5, 'điểm M1 đúng lat/lng/ele lấy từ properties');
    assert(m1.note === 'mốc ranh', 'giữ note từ property note');
    const thua = byName(r.features, 'Thửa A');
    assert(thua && thua.rings.length === 2 && flat(thua).length === 8, 'polygon giữ cả vòng ngoài + vòng lỗ (8 đỉnh)');
    const tuyen = byName(r.features, 'Tuyến kênh');
    assert(tuyen && tuyen.kind === 'line' && flat(tuyen).length === 3, 'LineString 3 đỉnh, tên lấy từ property NAME viết hoa');
    const gc = byName(r.features, 'Bộ thửa');
    assert(gc && r.features.some(f => f.name === 'Bộ thửa 2' || f.kind === 'line'), 'GeometryCollection được tách thành các feature con');

    const projected = JSON.stringify({
        type: 'Feature', properties: { name: 'Xôn VN2000' },
        geometry: { type: 'Point', coordinates: [539624.574, 1144058.623, 0] }
    });
    const rp = GisIO.read(projected, 'xo.geojson');
    assert(rp.features[0].crs === 'projected', 'tọa độ mét (E,N) được đánh dấu crs=projected');
    assert(rp.features[0].rings[0][0].lng === 539624.574 && rp.features[0].rings[0][0].lat === 1144058.623, 'giữ nguyên thứ tự trục E,N của tệp (không tự đảo)');
}

// --- NHÓM 3: KML ---
console.log('\n--- NHÓM 3: Đọc KML (Google Earth / QGIS) ---');
{
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
 <Placemark><name>M1</name><description><![CDATA[<div><b>VN-2000 X:</b> 1144058.6 m</div>]]></description>
   <Point><coordinates>106.113617,10.345211,15</coordinates></Point></Placemark>
 <Placemark><name>Ranh thửa B</name>
   <Polygon><outerBoundaryIs><LinearRing><coordinates>
     106.1,10.3,0 106.2,10.3,0 106.2,10.4,0 106.1,10.3,0
   </coordinates></LinearRing></outerBoundaryIs>
   <innerBoundaryIs><LinearRing><coordinates>106.14,10.33,0 106.16,10.33,0 106.16,10.35,0 106.14,10.33,0</coordinates></LinearRing></innerBoundaryIs></Polygon></Placemark>
 <Placemark><name>Tuyến C</name><LineString><coordinates>106.1,10.3 106.15,10.35</coordinates></LineString></Placemark>
 <Placemark><name>Khối D</name><MultiGeometry>
   <Point><coordinates>106.3,10.5,0</coordinates></Point>
   <LineString><coordinates>106.3,10.5 106.35,10.55</coordinates></LineString>
 </MultiGeometry></Placemark>
 <Folder><name>ranh gioi</name></Folder>
</Document></kml>`;
    const r = GisIO.read(kml, 'du_an.kml');
    assert(r.ok && r.format === 'kml', 'read() phát hiện kml');
    const m1 = byName(r.features, 'M1');
    assert(m1 && m1.kind === 'point' && m1.rings[0][0].h === 15, 'KML Point lấy thành phần alt làm cao độ');
    assert(m1.note.includes('1144058.6') && !m1.note.includes('<div>'), 'mô tả CDATA được làm sạch thẻ HTML');
    const b = byName(r.features, 'Ranh thửa B');
    assert(b && b.kind === 'polygon' && b.rings.length === 2 && flat(b).length === 8, 'KML Polygon gom outer + inner (8 đỉnh)');
    const c = byName(r.features, 'Tuyến C');
    assert(c && c.kind === 'line' && flat(c).length === 2, 'KML LineString 2 đỉnh');
    const khoiD = r.features.filter(f => f.name === 'Khối D');
    assert(khoiD.length === 2 && khoiD.some(f => f.kind === 'point') && khoiD.some(f => f.kind === 'line'),
        'MultiGeometry được tách đúng một lần (1 điểm + 1 tuyến), không trùng: ' + khoiD.length);
    assert(!byName(r.features, 'ranh gioi'), 'Folder không có hình học thì bỏ qua');
}

// --- NHÓM 4: GPX ---
console.log('\n--- NHÓM 4: Đọc GPX (waypoint / track / route) ---');
{
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="QGIS" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="10.345211" lon="106.113617"><ele>14.2</ele><name>M1</name><desc>mốc GPS</desc></wpt>
  <wpt lat="10.346" lon="106.114"><name>M2</name></wpt>
  <trk><name>Đo tuyến đo</name><trkseg>
    <trkpt lat="10.34" lon="106.11"><ele>10</ele></trkpt>
    <trkpt lat="10.35" lon="106.12"><ele>11</ele></trkpt>
    <trkpt lat="10.36" lon="106.13"></trkpt>
  </trkseg></trk>
  <rte><name>Lời đi thêm</name><rtept lat="10.4" lon="106.2"></rtept><rtept lat="10.41" lon="106.21"></rtept></rte>
  <wpt lat="abc" lon="106.9"><name>Lỗi</name></wpt>
</gpx>`;
    const r = GisIO.read(gpx, 'do_dac.gpx');
    assert(r.ok && r.format === 'gpx', 'read() phát hiện gpx');
    assert(r.counts.points === 2, '2 waypoint hợp lệ (bỏ qua wpt lat sai), thực tế: ' + r.counts.points);
    const m1 = byName(r.features, 'M1');
    assert(m1 && m1.rings[0][0].lat === 10.345211 && m1.rings[0][0].h === 14.2, 'wpt lấy lat/lon/ele');
    assert(m1.note === 'mốc GPS', 'wpt lấy desc làm ghi chú');
    const trk = byName(r.features, 'Đo tuyến đo');
    assert(trk && trk.kind === 'line' && flat(trk).length === 3 && flat(trk)[0].h === 10, 'trk → tuyến 3 điểm có cao độ');
    const rte = byName(r.features, 'Lời đi thêm');
    assert(rte && rte.kind === 'line' && flat(rte).length === 2, 'rte → tuyến 2 điểm');
    assert(!byName(r.features, 'Lỗi'), 'waypoint tọa độ hỏng bị loại');

    // Máy định vị & QGIS thường xuất thẻ tự đóng <trkpt lat=".." lon=".."/> — phải đọc được
    const selfClosed = '<gpx version="1.1"><wpt lat="10.3" lon="106.1"/><wpt lat="10.4" lon="106.2"/>'
        + '<trk><trkseg><trkpt lat="10.3" lon="106.1"/><trkpt lat="10.31" lon="106.12"/></trkseg></trk></gpx>';
    const sc = GisIO.read(selfClosed, 'may_dinh_vi.gpx');
    assert(sc.ok && sc.counts.points === 2, 'GPX tự đóng <wpt/> vẫn đọc được 2 waypoint');
    const scTrk = byName(sc.features, 'Track');
    assert(sc.counts.lines === 1 && scTrk && flat(scTrk).length === 2, 'GPX tự đóng <trkpt/> thành tuyến 2 điểm, tên mặc định "Track"');
}

// --- NHÓM 5: WKT ---
console.log('\n--- NHÓM 5: Đọc WKT (OGC Simple Features) ---');
{
    const wkt = [
        '# M1',
        'POINT (106.113617 10.345211 12.5)',
        'SRID=4326;LINESTRING (106.1 10.3, 106.2 10.4)',
        'POLYGON ((106.1 10.3, 106.2 10.3, 106.2 10.4, 106.1 10.3), (106.14 10.33, 106.16 10.33, 106.16 10.35, 106.14 10.33))',
        'MULTIPOINT (106.3 10.5, 106.4 10.6)',
        'MULTIPOINT ((106.5 10.7), (106.6 10.8))',
        'MULTILINESTRING ((106.1 10.3, 106.2 10.4), (106.3 10.5, 106.4 10.6))',
        'MULTIPOLYGON (((106.1 10.3, 106.2 10.3, 106.2 10.4, 106.1 10.3)))',
        'GEOMETRYCOLLECTION (POINT (106.7 10.9), LINESTRING (106.7 10.9, 106.8 11.0))',
        'POINT Z (106.9 11.1 20)',
        'MATRIX (1 2)'
    ].join('\n');
    const r = GisIO.read(wkt, 'ranh.wkt');
    assert(r.ok && r.format === 'wkt', 'đọc WKT nhiều đối tượng trong một tệp');
    const pt = r.features[0];
    assert(pt.kind === 'point' && pt.rings[0][0].h === 12.5, 'POINT 3 chiều → điểm có cao độ');
    assert(r.features.some(f => f.kind === 'line' && flat(f).length === 2), 'bỏ tiền tố SRID= và đọc LINESTRING');
    const poly = r.features.find(f => f.kind === 'polygon');
    assert(poly && poly.rings.length === 2 && flat(poly).length === 8, 'POLYGON có lỗ đọc đủ 2 vòng (8 đỉnh)');
    const mp = r.features.filter(f => f.kind === 'point');
    assert(mp.length >= 5, 'cả 2 dạng MULTIPOINT (phẳng và bọc ngoặc đơn) đều ra điểm rời: ' + mp.length);
    const ml = r.features.filter(f => f.kind === 'line' && flat(f).length === 2);
    assert(ml.length >= 3, 'MULTILINESTRING được tách thành từng tuyến 2 đỉnh (không gộp sai)');
    assert(r.features.some(f => f.kind === 'polygon' && f.rings.length >= 1), 'MULTIPOLYGON → polygon');
    assert(r.features.some(f => f.kind === 'point' && f.rings[0][0].lat === 11.1), 'POINT Z đọc được chiều Z');
    assert(!r.features.some(f => JSON.stringify(f.rings).includes('"a"')), 'dòng WKT từ sai (MATRIX) bị bỏ qua, không ném lỗi');
}

// --- NHÓM 6: GHI (XUẤT) ---
console.log('\n--- NHÓM 6: Ghi GeoJSON / WKT / GPX ---');
{
    const features = [
        { kind: 'point', name: 'M1', note: 'góc ranh', crs: 'wgs84', rings: [[{ lng: 106.1, lat: 10.3, h: 12 }]] },
        { kind: 'point', name: 'M2', note: '', crs: 'wgs84', rings: [[{ lng: 106.2, lat: 10.4, h: 0 }]] },
        { kind: 'line', name: 'Tuyến', note: '', crs: 'wgs84', rings: [[{ lng: 106.1, lat: 10.3 }, { lng: 106.2, lat: 10.3 }]] },
        { kind: 'polygon', name: 'Thửa', note: '', crs: 'wgs84', rings: [[{ lng: 0, lat: 0 }, { lng: 1, lat: 0 }, { lng: 1, lat: 1 }]] }
    ];

    const gj = JSON.parse(GisIO.toGeoJsonText(features, { name: 'DuAnX' }));
    assert(gj.type === 'FeatureCollection' && gj.name === 'DuAnX', 'toGeoJsonText trả về FeatureCollection kèm tên dự án');
    assert(gj.features.filter(f => f.geometry.type === 'Point').length === 2, '2 điểm → 2 Point feature');
    const polyFeat = gj.features.find(f => f.geometry.type === 'Polygon');
    const ring = polyFeat.geometry.coordinates[0];
    assert(ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1], 'Polygon tự đóng kín vòng theo RFC 7946');
    assert(gj.crs.properties.name.includes('CRS84'), 'mặc định ghi CRS84 (WGS84 kinh-trước-vĩ-sau)');

    const wktOut = GisIO.toWktText(features, { precision: 2 });
    assert(wktOut.includes('POINT (106.1 10.3 12)'), 'WKT điểm kèm cao độ và làm tròn 2 số lẻ');
    assert(/POLYGON \(\(0 0, 1 0, 1 1\)\)/.test(wktOut), 'WKT giữ nguyên vòng mở (không tự thêm đỉnh đóng)');
    assert(wktOut.includes('# M1') && wktOut.includes('LINESTRING (106.1 10.3, 106.2 10.3)'), 'WKT có chú thích tên và LineString');
    const neOut = GisIO.toWktText([{ kind: 'point', name: '', rings: [[{ lng: 106.1, lat: 10.3, h: 0 }]] }], { order: 'NE' });
    assert(neOut.includes('POINT (10.3 106.1'), 'order=NE đảo trục X (Bắc) trước cho bản vẽ CAD Việt Nam');

    const gpxOut = GisIO.toGpxText(features, { creator: 'VN2000-PWA' });
    assert(gpxOut.includes('<gpx version="1.1" creator="VN2000-PWA"'), 'GPX 1.1 kèm nhà sáng tạo');
    assert((gpxOut.match(/<wpt /g) || []).length === 2, '2 điểm → 2 thẻ <wpt>');
    assert(gpxOut.includes('<name>M1</name>') && gpxOut.includes('<desc>góc ranh</desc>'), 'GPX mang tên + ghi chú');
    assert((gpxOut.match(/<trk>/g) || []).length === 2, 'tuyến + polygon → 2 <trk>');

    // Round-trip: ghi ra rồi đọc lại không mất đỉnh
    const reRead = GisIO.read(wktOut, 'rt.wkt');
    assert(reRead.ok && reRead.counts.vertices >= 5, 'round-trip WKT → GisIO.read nhận lại hình học');
    const rtGpx = GisIO.read(gpxOut, 'rt.gpx');
    assert(rtGpx.ok && rtGpx.counts.points === 2 && rtGpx.counts.lines === 2, 'round-trip GPX → 2 wpt + 2 tuyến');
    const rtGj = GisIO.read(GisIO.toGeoJsonText(features), 'rt.geojson');
    assert(rtGj.ok && rtGj.features.length === 4, 'round-trip GeoJSON → đủ 4 feature');
}

// --- NHÓM 7: LỖI ĐẦU VÀO ---
console.log('\n--- NHÓM 7: Lỗi đầu vào (không được ném exception ra tầng UI) ---');
{
    const kmz = GisIO.read('PK\x03\x04 binary', 'a.kmz');
    assert(!kmz.ok && kmz.error === 'KMZ_CAN_CONVERT_SANG_KML', 'KMZ → mã lỗi hướng dẫn đổi sang KML');
    const empty = GisIO.read('', 'a.geojson');
    assert(!empty.ok && empty.error === 'FILE_RONG', 'tệp rỗng → FILE_RONG');
    const unknown = GisIO.read('xin chao', 'a.txt');
    assert(!unknown.ok && unknown.error === 'KHONG_NHAN_DANG_DUOC_DINH_DANG', 'không nhận dạng → mã lỗi tương ứng');
    const jsonFail = GisIO.read('{ "type": "FeatureCollection", "features": [ ', 'a.geojson');
    assert(!jsonFail.ok && jsonFail.features.length === 0, 'GeoJSON hỏng không làm gãy luồng xử lý');
    const noGeom = GisIO.read('<kml><Document><Placemark><name>N</name></Placemark></Document></kml>', 'a.kml');
    assert(!noGeom.ok && noGeom.error === 'KHONG_TIM_THAY_HINH_HOC', 'KML không có hình học → báo rõ');
    assert(GisIO.stripBom('\uFEFFa\r\nb') === 'a\nb', 'stripBom bỏ BOM và chuẩn hóa xuống dòng');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (passedTests === totalTests) console.log('🎉 ĐỘNG CƠ GIS ĐẠT CHUẨN GEOJSON / KML / GPX / WKT!');
console.log('========================================================================\n');
process.exit(failedTests > 0 ? 1 : 0);
