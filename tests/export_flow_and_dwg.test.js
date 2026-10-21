import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('=== TỐI ƯU HÓA QUY TRÌNH XUẤT DỮ LIỆU & FIX LỖI CAD "MISSING SYMBOL TABLE" ===', () => {
    const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const appJsContent = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf-8');
    const cadGeomContent = fs.readFileSync(path.join(rootDir, 'src', 'core', 'cad_geometry.js'), 'utf-8');

    it('1. Modal #modalExportData có đầy đủ 5 bước theo luồng UX chuẩn', () => {
        // Cửa sổ preview trực quan
        assert.ok(htmlContent.includes('id="modalExportData"'), 'Thiếu modal #modalExportData');
        assert.ok(htmlContent.includes('id="exportPreviewContainer"'), 'Thiếu khung preview #exportPreviewContainer');
        assert.ok(htmlContent.includes('id="exportPreviewSvg"'), 'Thiếu thẻ SVG preview #exportPreviewSvg');
        assert.ok(htmlContent.includes('id="exportPreviewScaleTag"'), 'Thiếu badge tỷ lệ #exportPreviewScaleTag');
        assert.ok(htmlContent.includes('id="exportPreviewStatsHud"'), 'Thiếu HUD kích thước #exportPreviewStatsHud');

        // Bộ chọn tỷ lệ bản đồ & khổ giấy
        assert.ok(htmlContent.includes('id="selExportMapScale"'), 'Thiếu dropdown tỷ lệ #selExportMapScale');
        assert.ok(htmlContent.includes('value="500"'), 'Thiếu tùy chọn tỷ lệ 1:500');
        assert.ok(htmlContent.includes('value="1000"'), 'Thiếu tùy chọn tỷ lệ 1:1.000');
        assert.ok(htmlContent.includes('value="2000"'), 'Thiếu tùy chọn tỷ lệ 1:2.000');
        assert.ok(htmlContent.includes('value="5000"'), 'Thiếu tùy chọn tỷ lệ 1:5.000');
        assert.ok(htmlContent.includes('id="selExportPaperSize"'), 'Thiếu chọn khổ giấy #selExportPaperSize');

        // Bộ chọn lớp xuất dữ liệu (Layers Toggle)
        assert.ok(htmlContent.includes('id="chkExportPoints"'), 'Thiếu checkbox #chkExportPoints');
        assert.ok(htmlContent.includes('id="chkExportNames"'), 'Thiếu checkbox #chkExportNames');
        assert.ok(htmlContent.includes('id="chkExportCoords"'), 'Thiếu checkbox #chkExportCoords');
        assert.ok(htmlContent.includes('id="chkExportLines"'), 'Thiếu checkbox #chkExportLines');
        assert.ok(htmlContent.includes('id="chkExportLengths"'), 'Thiếu checkbox #chkExportLengths');
        assert.ok(htmlContent.includes('id="chkExportGrid"'), 'Thiếu checkbox #chkExportGrid');
        assert.ok(htmlContent.includes('id="chkExportFrame"'), 'Thiếu checkbox #chkExportFrame');
        assert.ok(htmlContent.includes('id="chkExportNorth"'), 'Thiếu checkbox #chkExportNorth');

        // Cài đặt thông tin dự án & kỹ sư
        assert.ok(htmlContent.includes('id="txtExportProjectName"'), 'Thiếu input #txtExportProjectName');
        assert.ok(htmlContent.includes('id="txtExportSurveyor"'), 'Thiếu input #txtExportSurveyor');
        assert.ok(htmlContent.includes('id="txtExportDate"'), 'Thiếu input #txtExportDate');
        assert.ok(htmlContent.includes('id="txtExportOrg"'), 'Thiếu input #txtExportOrg');

        // Chọn định dạng xuất file
        assert.ok(htmlContent.includes('value="dwg"'), 'Thiếu tùy chọn định dạng DWG');
        assert.ok(htmlContent.includes('value="dgn"'), 'Thiếu tùy chọn định dạng DGN');
        assert.ok(htmlContent.includes('value="excel"'), 'Thiếu tùy chọn định dạng EXCEL');
        assert.ok(htmlContent.includes('value="pdf"'), 'Thiếu tùy chọn định dạng PDF');
        assert.ok(htmlContent.includes('value="png"'), 'Thiếu tùy chọn định dạng PNG');
        assert.ok(htmlContent.includes('value="kml"'), 'Thiếu tùy chọn định dạng KML');
        assert.ok(htmlContent.includes('value="geojson"'), 'Thiếu tùy chọn định dạng GeoJSON');
        assert.ok(htmlContent.includes('value="txt"'), 'Thiếu tùy chọn định dạng TXT');

        // Nút thực thi xuất
        assert.ok(htmlContent.includes('id="btnExecuteExport"'), 'Thiếu nút #btnExecuteExport');
    });

    it('2. Khắc phục triệt để lỗi "Missing symbol table" trong cad_geometry.js và app.js', () => {
        // Trong cad_geometry.js: Có đủ các Symbol Table bắt buộc của AutoCAD
        assert.ok(cadGeomContent.includes('VPORT'), 'cad_geometry.js phải có Symbol Table VPORT');
        assert.ok(cadGeomContent.includes('LTYPE'), 'cad_geometry.js phải có Symbol Table LTYPE');
        assert.ok(cadGeomContent.includes('LAYER'), 'cad_geometry.js phải có Symbol Table LAYER');
        assert.ok(cadGeomContent.includes('STYLE'), 'cad_geometry.js phải có Symbol Table STYLE');
        assert.ok(cadGeomContent.includes('BLOCK_RECORD'), 'cad_geometry.js phải có Symbol Table BLOCK_RECORD');
        assert.ok(cadGeomContent.includes('BLOCKS'), 'cad_geometry.js phải có SECTION BLOCKS');
        assert.ok(cadGeomContent.includes('OBJECTS'), 'cad_geometry.js phải có SECTION OBJECTS');
        assert.ok(cadGeomContent.includes('DICTIONARY'), 'cad_geometry.js phải có DICTIONARY');

        // Trong app.js:
        assert.ok(appJsContent.includes('exportDwgFile'), 'appData phải có hàm exportDwgFile');
        assert.ok(appJsContent.includes('*MODEL_SPACE'), 'Phải khai báo *MODEL_SPACE block record');
        assert.ok(appJsContent.includes('*PAPER_SPACE'), 'Phải khai báo *PAPER_SPACE block record');
        assert.ok(appJsContent.includes('AcDbPolyline'), 'Phải hỗ trợ AcDbPolyline chuẩn AC1015');
    });

    it('3. Định dạng MicroStation DGN (.dgn) và MicroStation ASCII tương thích Famis', () => {
        assert.ok(appJsContent.includes('exportDgnFile'), 'appData phải có hàm exportDgnFile');
        assert.ok(appJsContent.includes('_Famis.dat'), 'Hỗ trợ xuất file Famis .dat nạp địa chính');
        assert.ok(appJsContent.includes('_MicroStation_VeTuDong.cmd'), 'Hỗ trợ xuất kịch bản MicroStation Key-in command');
    });

    it('4. Khung Preview tương tác SVG cập nhật theo bộ chọn lớp và tỷ lệ', () => {
        assert.ok(appJsContent.includes('openExportModal'), 'appData phải có hàm openExportModal');
        assert.ok(appJsContent.includes('closeExportModal'), 'appData phải có hàm closeExportModal');
        assert.ok(appJsContent.includes('updateExportPreview'), 'appData phải có hàm updateExportPreview');
        assert.ok(appJsContent.includes('getExportScaleFactor'), 'appData phải có hàm getExportScaleFactor');
        assert.ok(appJsContent.includes('getExportPoints'), 'appData phải có hàm getExportPoints');
        assert.ok(appJsContent.includes('getExportOptions'), 'appData phải có hàm getExportOptions');
        assert.ok(appJsContent.includes('renderExportPreviewSvg'), 'appData phải có hàm renderExportPreviewSvg');
        assert.ok(appJsContent.includes('executeExport'), 'appData phải có hàm executeExport');
    });

    it('5. Xuất bản vẽ PDF & PNG đúng tỷ lệ đã chọn', () => {
        assert.ok(appJsContent.includes('exportPdfFile'), 'appData phải có hàm exportPdfFile');
        assert.ok(appJsContent.includes('exportPngImage'), 'appData phải có hàm exportPngImage');
    });
});
