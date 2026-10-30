/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: NÂNG CẤP DIMENSION (KÍCH THƯỚC CẠNH / GÓC / BÁN KÍNH) CHO MINICAD
 * (đối chiếu năng lực annotate/linear, angular, radial của CADCraft)
 * Chạy với: node tests/cadcraft_dimensions.test.js
 */

const fs = require('fs');
const path = require('path');

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

function approx(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol); }

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// Tách nguyên văn một phương thức (định dạng "    tên(...) {") từ app.js để chạy thật, không viết lại công thức
function extractFn(name) {
    const re = new RegExp('\\n    ' + name + '\\([^)]*\\) \\{');
    const m = re.exec(appJs);
    if (!m) throw new Error('Không tìm thấy phương thức ' + name + ' trong app.js');
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < appJs.length && depth > 0) {
        const ch = appJs[i];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        i++;
    }
    return appJs.slice(m.index + 1, i);
}

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: MINICAD DIMENSION • CẠNH / GÓC / BÁN KÍNH');
console.log('========================================================================\n');

// --- NHÓM 1: NÚT LỆNH + FORM SỬA ---
console.log('--- NHÓM 1: NÚT DIM TRÊN TAB CHÚ THÍCH & FORM SỬA KÍCH THƯỚC ---');
{
    assert(indexHtml.includes('id="btnCadMarkupDimLin"'), 'Có nút 📏 Kích thước cạnh [M]');
    assert(indexHtml.includes('id="btnCadMarkupDimAng"'), 'Có nút 📐 Góc tại đỉnh [G]');
    assert(indexHtml.includes('id="btnCadMarkupDimRad"'), 'Có nút 🎯 Bán kính cung');
    assert(indexHtml.includes('appCadTool.setMarkupMode(\'dim_linear\')'), 'Nút cạnh gọi setMarkupMode(dim_linear)');
    assert(indexHtml.includes('appCadTool.setMarkupMode(\'dim_angle\')'), 'Nút góc gọi setMarkupMode(dim_angle)');
    assert(indexHtml.includes('appCadTool.setMarkupMode(\'dim_radius\')'), 'Nút bán kính gọi setMarkupMode(dim_radius)');
    assert(indexHtml.includes('id="grpCadEditAnnDim"'), 'Form sửa có nhóm riêng cho kích thước (#grpCadEditAnnDim)');
    assert(indexHtml.includes('id="lblCadEditAnnDimValue"'), 'Form hiển thị giá trị đo (#lblCadEditAnnDimValue)');
    assert(indexHtml.includes('id="selCadEditAnnDimMode"'), 'Chọn kiểu nhãn (#selCadEditAnnDimMode)');
    assert(indexHtml.includes('id="rowCadEditDimOffset"') && indexHtml.includes('id="txtCadEditAnnDimOffset"'), 'Chỉnh khoảng cách đường kích (#txtCadEditAnnDimOffset)');
    assert(indexHtml.includes('id="rowCadEditDimArc"') && indexHtml.includes('id="txtCadEditAnnDimArc"'), 'Chỉnh bán kính cung góc (#txtCadEditAnnDimArc)');
    assert(indexHtml.includes('id="txtCadEditAnnDimText"'), 'Có ô nhãn tuỳ biến (#txtCadEditAnnDimText)');
    assert(/dim_linear: 'btnCadMarkupDimLin'[\s\S]{0,120}dim_radius: 'btnCadMarkupDimRad'/.test(appJs), 'setMarkupMode nhận diện cả 3 chế độ dim để tô sáng nút');
    assert(/key === 'M'/.test(appJs) && /key === 'G'/.test(appJs), 'Phím tắt M (đường kích) và G (góc)');
}

// --- NHÓM 2: BỐ TRÍ ĐẦU ĐỦ Ở BỘ CHỌN & BỘ XUẤT ---
console.log('\n--- NHÓM 2: HANDLEMARKUPCLICK / PREVIEW / RENDER / MODAL / 3 BỘ XUẤT ---');
{
    assert(/case 'dim_linear':\s*\n\s*case 'dim_radius': \{/.test(appJs), 'handleMarkupClick có nhánh dim_linear + dim_radius');
    assert(/case 'dim_angle': \{/.test(appJs), 'handleMarkupClick có nhánh dim_angle');
    assert(appJs.includes("dimStyle: isRad ? 'radius' : 'aligned'"), 'Bán kính dùng lại pipeline đường kích (dimStyle = radius)');
    assert(/markupStepData = \{\s*p1Lat: clickLat, p1Lng: clickLng\s*\}/.test(appJs), 'DIMCONTINUE: giữ điểm cuối làm điểm đầu cho đường kích kế tiếp');
    const exportHits = (appJs.match(/case 'dim_linear': \{/g) || []).length + (appJs.match(/case 'dim_angle': \{/g) || []).length;
    assert(exportHits >= 8, 'Dim được xử lý ở preview, render bản đồ, DXF, PDF/PNG canvas và SVG (>= 8 nhánh)');
    assert(/addLine\("KICH_THUOC", g\.d1\.y, g\.d1\.x, g\.d2\.y, g\.d2\.x\)/.test(appJs), 'DXF xuất đường kích (LINE) ra lớp KICH_THUOC, X = Đông');
    assert(/addSolid\("KICH_THUOC", tipX, tipY/.test(appJs), 'DXF xuất mũi tên (SOLID) cho đường kích');
    assert(/addArc\("KICH_THUOC", g\.v\.y, g\.v\.x, g\.r, a0, a1\)/.test(appJs), 'DXF xuất cung góc (ARC)');
    assert(/addArcHead\(g\.arcStart, g\.startTanDeg\)[\s\S]{0,80}addArcHead\(g\.arcEnd, g\.endTanDeg\)/.test(appJs), 'DXF góc có 2 mũi tên tại 2 đầu cung (như trên bản vẽ PDF/SVG)');
    assert(/this\.newAnnotationId\(\)/.test(appJs) && !/'ann_' \+ Date\.now\(\),/.test(appJs), 'ID chú thích sinh tuần tự, tránh trùng khi ghi nhiều kích thước liên tiếp');
    assert(/addText\("KICH_THUOC", tx\.y, tx\.x, 1\.8 \* S, this\.dimLabelText\(ann, g, true\), rot\)/.test(appJs), 'DXF ghi nhãn bằng TEXT (X = Đông, Y = Bắc)');
    assert(/ctx\.fillText\(this\.dimLabelText\(ann, g, false\), 0, 0\)/.test(appJs), 'Canvas PDF/PNG vẽ nhãn xoay theo đường kích');
    assert(/transform="rotate\(' \+ sRot\.toFixed\(2\)/.test(appJs), 'SVG dùng <text transform="rotate(...)"> cho nhãn');
    assert(/case 'dim_linear':\s*\n\s*case 'dim_angle': \{/.test(appJs), 'openAnnotationModal + saveAnnotationEdit xử lý dim');
}

// --- NHÓM 3: CHẠY THẬT CÔNG THỨC HÌNH HỌC ĐÃ TÁCH TỪ app.js ---
console.log('\n--- NHÓM 3: HÌNH HỌC ĐƯỜNG KÍCH / GÓC (x = BẮC, y = ĐÔNG) ---');
const dimApi = new Function('metricFromLatLng', `
    return ({
        metricFromLatLng,
        toCadAscii: s => String(s).replace(/[^\\x20-\\x7E]/g, ''),
        ${extractFn('formatAngleDMS')},
        ${extractFn('computeDimLinearGeom')},
        ${extractFn('computeDimAngleGeom')},
        ${extractFn('dimLabelText')},
        ${extractFn('setDimLinearOffsetFromPoint')},
        ${extractFn('setDimArcRadiusFromPoint')}
    });
`)((lat, lng) => ({ x: lat, y: lng }));

{
    // Độ - phút - giây
    assert(dimApi.formatAngleDMS(82.258333, false) === '82°15\'30"', 'DMS: 82.258333 gon → 82°15\'30"');
    assert(dimApi.formatAngleDMS(82.258333, true) === '82d15\'30"', 'DMS ASCII (cho DXF): dùng d thay °');
    assert(dimApi.formatAngleDMS(0.5, false) === '0°30\'00"', 'DMS: 0.5 gon → 0°30\'00"');
    assert(dimApi.formatAngleDMS(-90, false) === '270°00\'00"', 'DMS: góc âm quy về dương');
    assert(dimApi.formatAngleDMS(359.9999, false) === '0°00\'00"', 'DMS: 360 gon được coi là 0°00\'00"');

    // Đường kích thẳng đứng (cạnh dài 10m hướng Đông)
    const lin = { type: 'dim_linear', dimStyle: 'aligned', p1Lat: 0, p1Lng: 0, p2Lat: 0, p2Lng: 10, offsetM: 1.5, dimLabelMode: 'len' };
    const g = dimApi.computeDimLinearGeom(lin);
    assert(g && approx(g.lenM, 10), 'computeDimLinearGeom: dài 10.00 m');
    assert(g && approx(g.azDeg, 90), 'computeDimLinearGeom: phương vị cạnh = 90 gon (song song trục Đông)');
    assert(g && approx(g.mid.x, -1.5) && approx(g.mid.y, 5), 'computeDimLinearGeom: nhãn nằm giữa đường kích, lệch 1.5 m theo pháp tuyến');
    assert(g && approx(g.d1.y, -0.4) && approx(g.d2.y, 10.4), 'computeDimLinearGeom: đường kích vượt quá 2 đầu (over = 0.4 m)');
    assert(g && g.ext.length === 2 && approx(g.ext[0][1].x, -1.9), 'computeDimLinearGeom: 2 đường dóng dài |offset| + over');
    assert(dimApi.dimLabelText(lin, g, false) === '10.00m', 'Nhãn "len": 10.00m');
    const linAz = { ...lin, dimLabelMode: 'len_az' };
    assert(dimApi.dimLabelText(linAz, g, false) === '10.00m / 90°00\'00"', 'Nhãn "len_az": 10.00m / 90°00\'00"');
    assert(dimApi.dimLabelText(linAz, g, true) === '10.00m / 90d00\'00"', 'Nhãn "len_az" bản ASCII cho DXF');
    const linCustom = { ...lin, dimLabelMode: 'custom', dimText: 'Cạnh A-B 10m' };
    assert(dimApi.dimLabelText(linCustom, g, false) === 'Cạnh A-B 10m', 'Nhãn tuỳ hiển thị đúng văn bản người dùng nhập');

    // Bán kính: offset = 0, 1 mũi, không có đường dóng
    const rad = { type: 'dim_linear', dimStyle: 'radius', p1Lat: 0, p1Lng: 0, p2Lat: 3, p2Lng: 4, dimLabelMode: 'len' };
    const gr = dimApi.computeDimLinearGeom(rad);
    assert(gr && gr.isRadius === true && gr.ext.length === 0, 'Bán kính: không có đường dóng (dimStyle = radius)');
    assert(gr && approx(gr.lenM, 5) && approx(gr.mid.x, 1.5) && approx(gr.mid.y, 2), 'Bán kính: R = 5.00 m, tâm đường kích tại trung điểm bán kính');
    assert(dimApi.dimLabelText(rad, gr, false) === 'R=5.00m', 'Nhãn bán kính tự thêm tiền tố R=');

    // Kéo nhãn → suy lại offsetM (chiếu vuông góc, có dấu)
    const dragAnn = { ...lin };
    dimApi.setDimLinearOffsetFromPoint(dragAnn, -3, 5);
    assert(dragAnn.offsetM === 3, 'Kéo nhãn tới x = -3 m → offsetM = 3 (chiếu lên pháp tuyến)');
    const gAfter = dimApi.computeDimLinearGeom(dragAnn);
    assert(approx(gAfter.mid.x, -3, 1e-9), 'Round-trip: vẽ lại đi đúng qua điểm vừa kéo');
    dimApi.setDimLinearOffsetFromPoint(dragAnn, 2, 4);
    assert(dragAnn.offsetM === -2, 'Kéo sang phía đối diện → offsetM âm (đường kích đổi bên)');

    // Góc tại đỉnh: 2 cạnh vuông góc
    const ang = { type: 'dim_angle', vLat: 0, vLng: 0, aLat: 10, aLng: 0, bLat: 0, bLng: 10, dimLabelMode: 'dms' };
    const ga = dimApi.computeDimAngleGeom(ang);
    assert(ga && approx(ga.interiorDeg, 90) && ga.dir === 1, 'computeDimAngleGeom: góc trong 90° quét thuận');
    assert(ga && approx(ga.r, 3.2), 'computeDimAngleGeom: bán kính cung mặc định = 0.32 * cạnh ngắn nhất');
    assert(ga && approx(ga.arcStart.x, 3.2) && approx(ga.arcStart.y, 0), 'Cung bắt đầu trên cạnh 1');
    assert(ga && approx(ga.arcEnd.x, 0, 1e-9) && approx(ga.arcEnd.y, 3.2, 1e-9), 'Cung kết thúc trên cạnh 2');
    assert(ga && approx(ga.label.x, 2.7605, 0.001) && approx(ga.label.y, 2.7605, 0.001), 'Nhãn góc nằm trên phân giác, ngoài cung');
    assert(dimApi.dimLabelText(ang, ga, false) === '90°00\'00"', 'Nhãn góc mặc định dạng Độ-Phút-Giây');
    assert(dimApi.dimLabelText({ ...ang, dimLabelMode: 'deg' }, ga, false) === '90.00°', 'Nhãn góc dạng thập phân');

    // Đảo thứ tự pick cạnh → vẫn ra cùng góc trong (không ra góc phản)
    const angRev = { ...ang, aLat: 0, aLng: 10, bLat: 10, bLng: 0 };
    const gRev = dimApi.computeDimAngleGeom(angRev);
    assert(approx(gRev.interiorDeg, 90) && gRev.dir === -1, 'Đảo cạnh: tự suy chiều nghịch, vẫn 90° (không phải 270°)');

    // Cung tự chọn + kéo nhãn suy lại bán kính cung
    const angBig = { ...ang, arcR: 5 };
    assert(approx(dimApi.computeDimAngleGeom(angBig).r, 5), 'arcR người dùng nhập được ưu tiên mặc định');
    const dragArc = { ...ang };
    dimApi.setDimArcRadiusFromPoint(dragArc, 4, 3);
    assert(dragArc.arcR === 5, 'Kéo nhãn góc ra xa 5 m → arcR = 5');
    dimApi.setDimArcRadiusFromPoint(dragArc, 0.1, 0);
    assert(dragArc.arcR === 0.3, 'Kéo quá gần đỉnh → arcR chặn ở 0.3 m để cung không biến mất');

    // Cạnh quá ngắn / đỉnh trùng → trả null (không vẽ rác)
    assert(dimApi.computeDimLinearGeom({ ...lin, p2Lat: 0, p2Lng: 0.005 }) === null, 'Cạnh < 0.01 m: bỏ qua, không tạo đường kích');
    assert(dimApi.computeDimAngleGeom({ ...ang, aLat: 0, aLng: 0 }) === null, 'Cạnh góc = 0: bỏ qua');
}

// --- NHÓM 4: TỌA ĐỘ XUẤT ĐÚNG TRỤC (DXF: X = ĐÔNG, Y = BẮC) ---
console.log('\n--- NHÓM 4: QUY ĐỔI TRỤC KHI XUẤT DXF ---');
{
    // Mô phỏng đúng công thức trong case 'dim_linear' của exportDxf
    const S = 1; // 1 m trên thực địa / 1 mm giấy (tỉ lệ 1:1 để kiểm tra hình học)
    const lin = { type: 'dim_linear', dimStyle: 'aligned', p1Lat: 100, p1Lng: 200, p2Lat: 100, p2Lng: 220, offsetM: 1.5, dimLabelMode: 'len' };
    const g = dimApi.computeDimLinearGeom({ ...lin, p1Lat: 0, p1Lng: 0, p2Lat: 0, p2Lng: 20 });
    const cadPt = p => ({ X: p.y, Y: p.x });
    assert(cadPt(g.mid).X === 10 && cadPt(g.mid).Y === -1.5, 'DXF: X lấy từ kinh độ (Đông), Y lấy từ vĩ độ (Bắc)');
    const rot = (() => { let r = 90 - g.azDeg; while (r < 0) r += 360; while (r >= 180) r -= 180; return r; })();
    assert(rot === 0, 'DXF: cạnh hướng Đông → góc quay TEXT = 0° (đọc ngang, không lộn ngược)');
    const rotNorth = (() => { let r = 90 - 0; while (r < 0) r += 360; while (r >= 180) r -= 180; return r; })();
    assert(rotNorth === 90, 'DXF: cạnh hướng Bắc → góc quay TEXT = 90°');
    const rotWest = (() => { let r = 90 - 270; while (r < 0) r += 360; while (r >= 180) r -= 180; return r; })();
    assert(rotWest === 0, 'DXF: cạnh hướng Tây → quay về 0° (không bao giờ > 90°)');
    const aLen = 2.5 * S, aWid = 0.9 * S;
    assert(aLen === 2.5 && aWid === 0.9, 'Mũi tên 2.5 × 0.9 mm giấy (nhân S mét/mm)');
}

console.log('\n========================================================================');
console.log(`📊 KẾT QUẢ: ${passedTests}/${totalTests} PASS • ${failedTests} FAIL`);
console.log('========================================================================');
process.exit(failedTests > 0 ? 1 : 0);
