/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: CHỨC NĂNG CHẤM ĐIỂM (MINICAD)
 * 1. Bảng điểm: sửa tên / X / Y / H / ghi chú, phóng đến điểm, xóa điểm
 * 2. Thêm điểm bằng tọa độ VN-2000 + tên tự động Pn không trùng
 * 3. Xuất CSV danh sách điểm (UTF-8 BOM, có escape dấu nháy kép)
 * Chạy với: node tests/cadcraft_points.test.js
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

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// Cắt nguyên văn một method của appCadTool (đếm ngoặc nhọn cân bằng)
function extractMethod(name) {
    const start = appJs.indexOf('\n    ' + name + '(');
    if (start < 0) throw new Error('Không tìm thấy method: ' + name);
    const open = appJs.indexOf('{', start);
    let depth = 0;
    for (let j = open; j < appJs.length; j++) {
        if (appJs[j] === '{') depth++;
        else if (appJs[j] === '}') {
            depth--;
            if (depth === 0) return appJs.slice(start + 1, j + 1);
        }
    }
    throw new Error('Ngoặc nhọn không cân bằng: ' + name);
}

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: CHẤM ĐIỂM — BẢNG ĐIỂM, SỬA TỌA ĐỘ, XUẤT CSV');
console.log('========================================================================\n');

// --- NHÓM 1: GIAO DIỆN TAB VẼ ---
console.log('--- NHÓM 1: GIAO DIỆN TAB VẼ & MODAL BẢNG ĐIỂM ---');
{
    assert(/id="btnCadModePoint"[\s\S]{0,220}?Chấm điểm \[I\]/.test(indexHtml), 'Nút chế độ đổi tên thành "📍 Chấm điểm [I]"');
    assert(/id="btnCadModePoint"[^>]*onclick="appCadTool\.setMode\('point'\)"/.test(indexHtml), 'Nút Chấm điểm vẫn gọi setMode(\'point\')');
    assert(indexHtml.includes('id="btnCadPointTable"'), 'Có nút "📋 Bảng điểm" trong tab Vẽ');
    assert(/id="btnCadPointTable"[^>]*onclick="appCadTool\.openPointTableModal\(\)"/.test(indexHtml), 'Nút Bảng điểm gọi openPointTableModal()');
    assert(indexHtml.includes('id="modalCadPointTable"'), 'Có modal #modalCadPointTable');
    assert(indexHtml.includes('id="cadPtTableLayerSelect"'), 'Modal có bộ chọn lớp điểm');
    assert(indexHtml.includes('id="cadPtTableBody"'), 'Modal có tbody #cadPtTableBody');
    assert(indexHtml.includes('id="cadPtTableCount"'), 'Modal có nhãn số điểm #cadPtTableCount');
    assert(indexHtml.includes('id="cadPtNewX"') && indexHtml.includes('id="cadPtNewY"'), 'Modal có ô nhập X, Y để thêm điểm');
    assert(indexHtml.includes('id="cadPtNewH"') && indexHtml.includes('id="cadPtNewNote"'), 'Modal có ô nhập H và ghi chú');
    assert(indexHtml.includes('appCadTool.addPointFromTable()'), 'Có nút "➕ Thêm điểm" gọi addPointFromTable()');
    assert(indexHtml.includes('appCadTool.exportPointCsv()'), 'Có nút "📄 Xuất CSV" gọi exportPointCsv()');
    assert(indexHtml.includes('appCadTool.closePointTableModal()'), 'Có nút đóng modal bảng điểm');
    assert(/<th[^>]*>X \(Bắc\)/.test(indexHtml) && /<th[^>]*>Y \(Đông\)/.test(indexHtml), 'Tiêu đề cột đúng quy ước X (Bắc) / Y (Đông)');
}

// --- NHÓM 2: LOGIC BẢNG ĐIỂM ---
console.log('\n--- NHÓM 2: LOGIC MỞ/SỬA/XÓA ĐIỂM TRONG BẢNG ---');
{
    assert(/openPointTableModal\(\)\s*\{[\s\S]{0,900}?renderPointTable\(\)/.test(appJs), 'openPointTableModal render bảng trước khi hiện modal');
    assert(/openPointTableModal\(\)\s*\{[\s\S]{0,500}?getPointLayers\(\)\.length === 0[\s\S]{0,200}?createPointLayer/.test(appJs), 'Mở bảng điểm tự tạo lớp điểm nếu chưa có');
    assert(/openPointTableModal\(\)\s*\{[\s\S]{0,700}?modalCadAreaTable'\);[\s\S]{0,120}?style\.display = 'none'/.test(appJs), 'Mở bảng điểm thì đóng bảng kê diện tích để không chồng modal');
    assert(/updatePointField\(vi, field, value\)\s*\{[\s\S]{0,400}?isShapeLocked\(layer\)/.test(appJs), 'updatePointField chặn sửa khi lớp bị khóa');
    assert(/closePointTableModal\(\)\s*\{[\s\S]{0,200}?style\.display = 'none'/.test(appJs), 'closePointTableModal ẩn modal');
    assert(/renderPointTable\(\)\s*\{[\s\S]{0,2600}?escapeHtml\(v\.name/.test(appJs), 'renderPointTable escape tên điểm khi render');
    assert(/updatePointField\(\$\{i\}, 'name', this\.value\)/.test(appJs), 'Ô tên gọi updatePointField(..., \'name\')');
    assert(/updatePointField\(\$\{i\}, 'x', this\.value\)/.test(appJs) && /updatePointField\(\$\{i\}, 'y', this\.value\)/.test(appJs), 'Ô X/Y gọi updatePointField tương ứng');
    assert(/updatePointField\(\$\{i\}, 'h', this\.value\)/.test(appJs), 'Ô H gọi updatePointField(..., \'h\')');
    assert(/updatePointField\(\$\{i\}, 'note', this\.value\)/.test(appJs), 'Ô ghi chú gọi updatePointField(..., \'note\')');
    assert(/deletePointRow\(\$\{i\}\)/.test(appJs), 'Nút 🗑 gọi deletePointRow(i)');
    assert(/zoomToPointRow\(\$\{i\}\)/.test(appJs), 'Nút 🔍 gọi zoomToPointRow(i)');

    const del = appJs.match(/deletePointRow\(vi\)\s*\{[\s\S]{0,1600}?\n    \},/);
    assert(!!del, 'Tìm thấy deletePointRow');
    if (del) {
        assert(/isShapeLocked\(layer\)/.test(del[0]), 'deletePointRow chặn xóa khi lớp bị khóa');
        assert(/pushHistoryState/.test(del[0]), 'deletePointRow có lưu lịch sử để Ctrl+Z');
        assert(/saveShapesForProject/.test(del[0]) && /persistSession/.test(del[0]), 'deletePointRow lưu shapes + phiên');
        assert(/renderPointTable\(\)/.test(del[0]), 'deletePointRow render lại bảng điểm');
    }

    const zoom = appJs.match(/zoomToPointRow\(vi\)\s*\{[\s\S]{0,900}?\n    \},/);
    assert(!!zoom && /setView\(\[parseFloat\(v\.lat\), parseFloat\(v\.lng\)\]/.test(zoom[0]), 'zoomToPointRow dùng map.setView theo lat/lng của điểm');
}

// --- NHÓM 3: ĐÁNH SỐ TỰ ĐỘNG & FIELD NOTE ---
console.log('\n--- NHÓM 3: TÊN TỰ ĐỘNG Pn KHÔNG TRÙNG + GH GIỮA GHI CHÚ ---');
{
    const nextNameApi = new Function(`return ({ ${extractMethod('nextPointName')} });`)();

    assert(nextNameApi.nextPointName.call({}, { vertices: [] }) === 'P1', 'Lớp rỗng → điểm đầu tiên là P1');
    assert(nextNameApi.nextPointName.call({}, { vertices: [{ name: 'P1' }, { name: 'P2' }] }) === 'P3', 'P1, P2 → điểm mới P3');
    assert(nextNameApi.nextPointName.call({}, { vertices: [{ name: 'P1' }, { name: 'P5' }] }) === 'P6', 'Có P5 → điểm mới P6 (không trùng)');
    assert(nextNameApi.nextPointName.call({}, { vertices: [{ name: 'P1' }, { name: 'P3' }] }) === 'P4', 'Sau khi xóa P2 vẫn không đè tên: P1, P3 → P4');
    assert(nextNameApi.nextPointName.call({}, { vertices: [{ name: 'Mốc A' }, { name: 'P2' }] }) === 'P3', 'Bỏ qua tên không theo mẫu Pn khi tính số kế tiếp');
    assert(nextNameApi.nextPointName.call({}, null) === 'P1', 'Chịu được layer/null rỗng');

    assert(/addPointToLayer\(lat, lng\)\s*\{[\s\S]{0,900}?name: this\.nextPointName\(layer\)/.test(appJs), 'addPointToLayer dùng nextPointName thay vì length + 1');
    assert(/addPointToLayer\(lat, lng\)\s*\{[\s\S]{0,1300}?note: ''/.test(appJs), 'Điểm tạo trên bản đồ có sẵn trường note rỗng');
    assert(/addPointFromTable\(\)\s*\{[\s\S]{0,2000}?note: String\(noteEl\?\.value/.test(appJs), 'addPointFromTable lưu ghi chú nhập tay');
    assert(/addPointFromTable\(\)\s*\{[\s\S]{0,900}?convertVn2kToWgs\(x, y/.test(appJs), 'addPointFromTable đổi VN-2000 → WGS84 trước khi lưu');
    assert(/updatePointField\(vi, field, value\)\s*\{[\s\S]{0,3200}?v\.isSnapped = false;[\s\S]{0,200}?v\.snapSource = '';/.test(appJs), 'Sửa X/Y thì bỏ cờ snap (dữ liệu do người dùng nhập)');
}

// --- NHÓM 4: HÀNH VI SỬA TRƯỜNG (CHẠY THẬT HÀM) ---
console.log('\n--- NHÓM 4: CHẠY THẬT updatePointField ---');
{
    const makeApi = new Function('convertVn2kToWgs', 'AppState', 'showToast',
        `return ({ ${extractMethod('updatePointField')} });`);
    const wgsCalls = [];
    const toasts = [];
    const api = makeApi(
        (x, y, ktt, k) => { wgsCalls.push({ x, y, ktt, k }); return { lat: 20 + x / 1000000, lng: 106 + y / 1000000 }; },
        { kttVal: 105, scaleFactor: 0.9999 },
        (msg, isErr) => toasts.push({ msg, isErr: !!isErr })
    );

    const makeCtx = (vertices, locked = false) => {
        const layer = { name: 'Mốc GPS', vertices };
        const calls = { history: 0, saved: 0, session: 0, rendered: 0, blocks: 0, bar: 0, table: 0 };
        const ctx = {
            pointLayerId: 'L1',
            getActivePointLayer: () => layer,
            isShapeLocked: () => locked,
            calculateAreaAndPerimeter: (verts, mode, force) => ({ area: 0, perimeter: 0, edges: [], n: verts.length, mode, force }),
            pushHistoryState: () => calls.history++,
            saveShapesForProject: () => calls.saved++,
            persistSession: () => calls.session++,
            renderGeometry: () => calls.rendered++,
            renderBlocksPanel: () => calls.blocks++,
            refreshPointLayerBar: () => calls.bar++,
            renderPointTable: () => calls.table++
        };
        return { ctx, layer, calls };
    };

    // Sửa X → cập nhật lat/lng, làm tròn 3 số, giữ Y
    {
        const { ctx, layer, calls } = makeCtx([{ id: 1, name: 'P1', lat: 20.001, lng: 106.002, x: 1000, y: 2000, h: 0, isSnapped: true, snapSource: 'Mốc dự án' }]);
        api.updatePointField.call(ctx, 0, 'x', '1234.5678');
        const v = layer.vertices[0];
        assert(v.x === 1234.568, 'Sửa X: làm tròn 3 chữ số thập phân (1234.5678 → 1234.568)');
        assert(v.y === 2000, 'Sửa X: giữ nguyên Y');
        assert(Math.abs(v.lat - (20 + 1234.5678 / 1000000)) < 1e-9 && Math.abs(v.lng - (106 + 2000 / 1000000)) < 1e-9, 'Sửa X: tính lại lat/lng từ (X, Y)');
        assert(v.isSnapped === false && v.snapSource === '', 'Sửa X: xóa cờ snap/snapSource');
        assert(calls.history === 1 && calls.saved === 1 && calls.session === 1, 'Sửa X: ghi lịch sử + lưu shapes + lưu phiên');
        assert(calls.rendered === 1 && calls.bar === 1 && calls.table === 1, 'Sửa X: vẽ lại bản đồ, thanh lớp và bảng điểm');
        assert(wgsCalls.length === 1 && wgsCalls[0].x === 1234.5678 && wgsCalls[0].y === 2000, 'Đổi VN→WGS dùng đúng cặp (X cũ, Y mới) trước khi làm tròn');
        assert(toasts.length === 0, 'Sửa X hợp lệ: không có toast lỗi');
    }

    // Sửa Y
    {
        const { ctx, layer } = makeCtx([{ id: 2, name: 'P2', lat: 20, lng: 106, x: 1000, y: 2000, h: 0 }]);
        api.updatePointField.call(ctx, 0, 'y', '2345.5');
        assert(layer.vertices[0].y === 2345.5 && layer.vertices[0].x === 1000, 'Sửa Y: cập nhật Y, giữ X');
    }

    // Tên: trim + chặn rỗng
    {
        const { ctx, layer, calls } = makeCtx([{ id: 3, name: 'P1', x: 0, y: 0, lat: 20, lng: 106 }]);
        api.updatePointField.call(ctx, 0, 'name', '  Mốc A1  ');
        assert(layer.vertices[0].name === 'Mốc A1', 'Sửa tên: tự trim khoảng trắng');
        const before = calls.history;
        toasts.length = 0;
        api.updatePointField.call(ctx, 0, 'name', '   ');
        assert(layer.vertices[0].name === 'Mốc A1' && calls.history === before, 'Sửa tên rỗng: không đổi dữ liệu, không ghi lịch sử');
        assert(toasts.length === 1 && toasts[0].isErr === true, 'Sửa tên rỗng: báo lỗi cho người dùng');
    }

    // H: số hợp lệ / không hợp lệ
    {
        const { ctx, layer, calls } = makeCtx([{ id: 4, name: 'P1', x: 0, y: 0, lat: 20, lng: 106, h: 0 }]);
        api.updatePointField.call(ctx, 0, 'h', '12.75');
        assert(layer.vertices[0].h === 12.75, 'Sửa H: nhận số thập phân (12.75)');
        const before = calls.history;
        toasts.length = 0;
        api.updatePointField.call(ctx, 0, 'h', 'abc');
        assert(layer.vertices[0].h === 12.75 && calls.history === before, 'Sửa H không hợp lệ: giữ nguyên dữ liệu');
        assert(toasts.length === 1 && toasts[0].isErr === true, 'Sửa H không hợp lệ: báo lỗi');
    }

    // Ghi chú
    {
        const { ctx, layer } = makeCtx([{ id: 5, name: 'P1', x: 0, y: 0, lat: 20, lng: 106, note: '' }]);
        api.updatePointField.call(ctx, 0, 'note', ' Cọc bê tông 10x10 ');
        assert(layer.vertices[0].note === 'Cọc bê tông 10x10', 'Sửa ghi chú: trim và lưu vào điểm');
    }

    // Tọa độ NaN
    {
        const { ctx, layer, calls } = makeCtx([{ id: 6, name: 'P1', x: 111, y: 222, lat: 20, lng: 106 }]);
        toasts.length = 0;
        api.updatePointField.call(ctx, 0, 'x', '');
        assert(layer.vertices[0].x === 111 && calls.history === 0, 'Tọa độ rỗng/NaN: không ghi đè dữ liệu cũ');
        assert(toasts.length === 1 && toasts[0].isErr === true, 'Tọa độ không hợp lệ: báo lỗi');
    }

    // Field lạ: bỏ qua hoàn toàn
    {
        const { ctx, layer, calls } = makeCtx([{ id: 7, name: 'P1', x: 1, y: 2, lat: 20, lng: 106 }]);
        api.updatePointField.call(ctx, 0, 'unknown', 'x');
        assert(calls.history === 0 && calls.rendered === 0 && layer.vertices[0].name === 'P1', 'Field không hỗ trợ: không làm gì');
    }

    // Lớp bị khóa: chặn sửa
    {
        const { ctx, layer, calls } = makeCtx([{ id: 8, name: 'P1', x: 111, y: 222, lat: 20, lng: 106 }], true);
        toasts.length = 0;
        api.updatePointField.call(ctx, 0, 'x', '999');
        assert(layer.vertices[0].x === 111 && calls.history === 0, 'Lớp bị khóa: không cho sửa tọa độ');
        assert(toasts.length === 1 && toasts[0].isErr === true, 'Lớp bị khóa: báo lỗi cho người dùng');
    }
}

// --- NHÓM 5: XUẤT CSV + TIÊU ĐỀ MARKER ---
console.log('\n--- NHÓM 5: XUẤT CSV & TIÊU ĐỀ ICON ĐIỂM ---');
{
    const csvFn = appJs.match(/exportPointCsv\(\)\s*\{[\s\S]{0,2600}?\n    \},/);
    assert(!!csvFn, 'Tìm thấy exportPointCsv');
    if (csvFn) {
        assert(csvFn[0].includes("'\\uFEFF'"), 'CSV có UTF-8 BOM để Excel đọc đúng tiếng Việt');
        assert(/replace\(\/"\/g, '""'\)/.test(csvFn[0]), 'CSV escape dấu nháy kép theo chuẩn ("" )');
        assert(/'STT;Tên điểm;X \(Bắc\) \[m\];Y \(Đông\) \[m\];Cao độ H \[m\];Vĩ độ WGS84;Kinh độ WGS84;Ghi chú;Nguồn\\n'/.test(csvFn[0]), 'CSV có đủ cột tên, X, Y, H, lat, lng, ghi chú, nguồn');
        assert(/v\.isSnapped \? \(v\.snapSource \|\| 'Hít mốc'\) : 'Chấm tay'/.test(csvFn[0]), 'CSV ghi nguồn điểm (Hít mốc / Chấm tay)');
        assert(/replace\(\/\[\\\\\/:\*\?"<>\|\]\/g, '_'\)/.test(csvFn[0]), 'Tên file CSV được lọc ký tự cấm');
        assert(/new Blob\(\[csv\], \{ type: 'text\/csv;charset=utf-8;' \}\)/.test(csvFn[0]), 'CSV tạo Blob đúng MIME type');
        assert(/vertices\.length === 0[\s\S]{0,160}?showToast\([\s\S]{0,120}?true\)/.test(csvFn[0]), 'Lớp rỗng: chặn xuất và báo lỗi');
    }

    assert(/const ptTitle = isPointLayer[\s\S]{0,260}?X=\$\{\(v\.x \|\| 0\)\.toFixed\(3\)\} Y=\$\{\(v\.y \|\| 0\)\.toFixed\(3\)\} H=\$\{\(v\.h \|\| 0\)\.toFixed\(2\)\}/.test(appJs), 'Icon điểm hiện X/Y/H khi rê chuột');
    assert(/const ptTitle = isPointLayer[\s\S]{0,420}?v\.note \? ' • ' \+ v\.note/.test(appJs), 'Icon điểm hiện ghi chú khi rê chuột');
    assert(/title="\$\{escapeHtml\(ptTitle\)\}"/.test(appJs), 'Tiêu đề icon được escape HTML');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 CHỨC NĂNG CHẤM ĐIỂM (BẢNG ĐIỂM • SỬA TỌA ĐỘ • XUẤT CSV) HOÀN TOÀN ĐẠT CHUẨN!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
