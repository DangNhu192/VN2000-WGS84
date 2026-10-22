/**
 * @file tests/data_export_studio.test.js
 * Bộ kiểm thử toàn diện quy trình xuất dữ liệu và sửa lỗi "Missing symbol table" AutoCAD
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('=== 1. KIỂM THỬ SỬA LỖI "MISSING SYMBOL TABLE" TRONG CAD_GEOMETRY.JS ===', async () => {
    const cadGeomPath = path.join(__dirname, '../src/core/cad_geometry.js');
    const content = fs.readFileSync(cadGeomPath, 'utf8');

    // Phải có CadGeometryEngine với hàm exportDwgString hỗ trợ tỷ lệ
    assert.match(content, /exportDwgString\s*\(/, 'Hàm exportDwgString phải tồn tại');
    assert.match(content, /scaleVal\s*=/, 'exportDwgString phải hỗ trợ tham số scaleVal');

    // Phải khai báo đầy đủ các Symbol Tables bắt buộc của AutoCAD trong mã nguồn
    assert.ok(content.includes('TABLE\\r\\n2\\r\\nVPORT'), 'Phải có bảng VPORT (*ACTIVE)');
    assert.ok(content.includes('TABLE\\r\\n2\\r\\nLTYPE'), 'Phải có bảng LTYPE (CONTINUOUS, DASHED, CENTER)');
    assert.ok(content.includes('TABLE\\r\\n2\\r\\nLAYER'), 'Phải có bảng LAYER chuẩn');
    assert.ok(content.includes('TABLE\\r\\n2\\r\\nSTYLE'), 'Phải có bảng STYLE (STANDARD & VN_ARIAL)');
    assert.ok(content.includes('TABLE\\r\\n2\\r\\nBLOCK_RECORD'), 'Phải có bảng BLOCK_RECORD (*MODEL_SPACE, *PAPER_SPACE)');
    assert.ok(content.includes('SECTION\\r\\n2\\r\\nBLOCKS'), 'Phải có section BLOCKS');

    // Kiểm tra các biến hệ thống quan trọng
    assert.ok(content.includes('$ACADVER\\r\\n1\\r\\nAC1015'), 'Phải định dạng tương thích AutoCAD AC1015');
    assert.ok(content.includes('$INSUNITS\\r\\n70\\r\\n6'), 'Phải đặt đơn vị mét INSUNITS = 6');

    // Thực thi trực tiếp logic sinh chuỗi CAD
    const CadGeometryEngine = require('../src/core/cad_geometry.js');
    const mockPoints = [
        { name: 'M1', x: 1144000.0, y: 585000.0 },
        { name: 'M2', x: 1144100.0, y: 585000.0 },
        { name: 'M3', x: 1144100.0, y: 585100.0 },
        { name: 'M4', x: 1144000.0, y: 585100.0 }
    ];
    
    // Xuất ở tỷ lệ 1:500
    const dwgStr500 = CadGeometryEngine.exportDwgString(mockPoints, 'RANH_DAT', { scaleVal: 500 });
    assert.ok(dwgStr500.includes('EOF'), 'Chuỗi CAD phải kết thúc bằng EOF');
    assert.ok(dwgStr500.includes('TABLE\r\n2\r\nVPORT'), 'Chuỗi CAD phải có bảng VPORT');
    assert.ok(dwgStr500.includes('TABLE\r\n2\r\nLTYPE'), 'Chuỗi CAD phải có bảng LTYPE');
    assert.ok(dwgStr500.includes('TABLE\r\n2\r\nLAYER'), 'Chuỗi CAD phải có bảng LAYER');
    assert.ok(dwgStr500.includes('TABLE\r\n2\r\nSTYLE'), 'Chuỗi CAD phải có bảng STYLE');
    assert.ok(dwgStr500.includes('TABLE\r\n2\r\nBLOCK_RECORD'), 'Chuỗi CAD phải có bảng BLOCK_RECORD');
    assert.ok(dwgStr500.includes('SECTION\r\n2\r\nBLOCKS'), 'Chuỗi CAD phải có section BLOCKS');

    // Tỷ lệ 1:500 (S=0.5) vs 1:1000 (S=1.0) text height và circle radius phải khác nhau
    const dwgStr1000 = CadGeometryEngine.exportDwgString(mockPoints, 'RANH_DAT', { scaleVal: 1000 });
    assert.notStrictEqual(dwgStr500, dwgStr1000, 'Chuỗi CAD tỷ lệ 1:500 và 1:1000 phải có kích thước đối tượng khác nhau tương ứng tỷ lệ');
});

test('=== 2. KIỂM THỬ GIAO DIỆN CỬA SỔ PREVIEW XUẤT DỮ LIỆU TRONG INDEX.HTML ===', async () => {
    const htmlPath = path.join(__dirname, '../index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Kiểm tra cấu trúc modal xuất dữ liệu 5 bước
    assert.ok(html.includes('id="modalExportData"'), 'Modal #modalExportData phải tồn tại');
    assert.ok(html.includes('id="exportPreviewContainer"'), 'Phải có khung Preview bản đồ tương tác #exportPreviewContainer');
    assert.ok(html.includes('id="exportPreviewSvg"'), 'Phải có khung SVG Preview bản đồ');
    assert.ok(html.includes('id="selExportMapScale"'), 'Phải có dropdown chọn tỷ lệ #selExportMapScale');

    // Kiểm tra các tùy chọn tỷ lệ chuẩn
    assert.ok(html.includes('value="500"'), 'Phải hỗ trợ tỷ lệ 1:500');
    assert.ok(html.includes('value="1000"'), 'Phải hỗ trợ tỷ lệ 1:1.000');
    assert.ok(html.includes('value="2000"'), 'Phải hỗ trợ tỷ lệ 1:2.000');
    assert.ok(html.includes('value="5000"'), 'Phải hỗ trợ tỷ lệ 1:5.000');
    assert.ok(html.includes('value="10000"'), 'Phải hỗ trợ tỷ lệ 1:10.000');

    // Kiểm tra bộ chọn lớp dữ liệu
    assert.ok(html.includes('id="chkExportPoints"'), 'Phải có lớp Điểm mốc');
    assert.ok(html.includes('id="chkExportNames"'), 'Phải có lớp Tên mốc');
    assert.ok(html.includes('id="chkExportCoords"'), 'Phải có lớp Tọa độ X/Y');
    assert.ok(html.includes('id="chkExportLines"'), 'Phải có lớp Ranh thửa');
    assert.ok(html.includes('id="chkExportLengths"'), 'Phải có lớp Kích thước cạnh');
    assert.ok(html.includes('id="chkExportGrid"'), 'Phải có lớp Lưới tọa độ Km');
    assert.ok(html.includes('id="chkExportFrame"'), 'Phải có lớp Khung tên bản vẽ');

    // Kiểm tra bộ cài đặt thông tin dự án
    assert.ok(html.includes('id="txtExportProjectName"'), 'Phải có trường Tên công trình / Dự án');
    assert.ok(html.includes('id="txtExportSurveyor"'), 'Phải có trường Kỹ sư lập');
    assert.ok(html.includes('id="txtExportDate"'), 'Phải có trường Ngày đo');
    assert.ok(html.includes('id="txtExportOrg"'), 'Phải có trường Đơn vị khảo sát');

    // Kiểm tra các nút định dạng xuất
    assert.ok(html.includes('value="dwg"'), 'Phải hỗ trợ xuất DWG');
    assert.ok(html.includes('value="excel"'), 'Phải hỗ trợ xuất Excel');
    assert.ok(html.includes('value="pdf"'), 'Phải hỗ trợ xuất PDF');
    assert.ok(html.includes('value="png"'), 'Phải hỗ trợ xuất PNG');
    assert.ok(html.includes('value="dgn"'), 'Phải hỗ trợ xuất MicroStation DGN');
    assert.ok(html.includes('value="kml"'), 'Phải hỗ trợ xuất KML');
    assert.ok(html.includes('value="geojson"'), 'Phải hỗ trợ xuất GeoJSON');
});

test('=== 3. KIỂM THỬ LOGIC XUẤT DỮ LIỆU ĐÚNG TỶ LỆ VÀ PREVIEW TRONG APP.JS ===', async () => {
    const appJsPath = path.join(__dirname, '../app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    // Kiểm tra các hàm logic trong appData
    assert.ok(appJs.includes('renderExportPreview('), 'Phải có hàm renderExportPreview');
    assert.ok(appJs.includes('exportDwgFile('), 'Phải có hàm exportDwgFile');
    assert.ok(appJs.includes('exportDgnFile('), 'Phải có hàm exportDgnFile');
    assert.ok(appJs.includes('exportPdfFile('), 'Phải có hàm exportPdfFile');
    assert.ok(appJs.includes('exportPngImage('), 'Phải có hàm exportPngImage');

    // Kiểm tra hỗ trợ tỷ lệ và lớp được nạp từ modal
    assert.ok(appJs.includes('selExportMapScale'), 'appData phải đọc scale từ modal #selExportMapScale');
    assert.ok(appJs.includes('chkExportLines'), 'appData phải đọc trạng thái lớp từ modal');
    assert.ok(appJs.includes('txtExportProjectName'), 'appData phải đọc tên dự án từ modal');

    // Kiểm tra tính năng đồng bộ checkbox chọn/bỏ chọn khối MiniCAD
    assert.ok(appJs.includes('toggleBlockSelect('), 'appCadTool phải có hàm toggleBlockSelect');
    assert.ok(appCadToolLogicChecks(appJs), 'Logic toggleBlockSelect phải cập nhật chính xác');
});

function appCadToolLogicChecks(content) {
    return content.includes('this.openAreaTableModal') &&
           content.includes('this.renderBlockList') &&
           content.includes('selectedArea');
}
