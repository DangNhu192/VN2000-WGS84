/**
 * @file tests/export_data_modal_and_standards.test.js
 * Kiểm thử toàn diện Quy trình Xuất Dữ Liệu: Modal Preview trực quan, Bộ chọn tỷ lệ,
 * Cài đặt thông tin, Bộ lọc Lớp & Chuẩn Symbol Tables CAD triệt tiêu lỗi Missing Symbol Table.
 */

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('=== KIỂM THỬ QUY TRÌNH XUẤT DỮ LIỆU & FIX LỖI MISSING SYMBOL TABLE ===', () => {
    let indexHtml = '';
    let cadGeometry = null;
    let appJs = '';

    before(() => {
        indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
        appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
        cadGeometry = require('../src/core/cad_geometry.js');
    });

    test('1. Giao diện Modal Xuất Dữ Liệu (#modalExportData) có đầy đủ 5 thành phần cốt lõi', () => {
        // 1. Khung Preview trực quan
        assert.ok(indexHtml.includes('id="modalExportData"'), 'Modal export data phải tồn tại');
        assert.ok(indexHtml.includes('id="exportPreviewSvg"'), 'Phải có khung SVG Preview bản đồ');

        // 2. Bộ chọn tỷ lệ bản đồ
        assert.ok(indexHtml.includes('id="selExportMapScale"'), 'Phải có dropdown chọn tỷ lệ selExportMapScale');
        assert.ok(indexHtml.includes('value="500"'), 'Có tùy chọn tỷ lệ 1:500');
        assert.ok(indexHtml.includes('value="1000"'), 'Có tùy chọn tỷ lệ 1:1000');
        assert.ok(indexHtml.includes('value="2000"'), 'Có tùy chọn tỷ lệ 1:2000');
        assert.ok(indexHtml.includes('value="5000"'), 'Có tùy chọn tỷ lệ 1:5000');

        // 3. Khung Cài đặt thông tin dự án & người lập
        assert.ok(indexHtml.includes('id="txtExportProjectName"'), 'Có input tên công trình');
        assert.ok(indexHtml.includes('id="txtExportSurveyor"'), 'Có input người lập / kỹ sư');
        assert.ok(indexHtml.includes('id="txtExportDate"'), 'Có input ngày thực hiện');

        // 4. Bộ chọn lớp dữ liệu (Layers switch)
        assert.ok(indexHtml.includes('id="chkExportPoints"'), 'Có switch lớp Điểm mốc');
        assert.ok(indexHtml.includes('id="chkExportNames"'), 'Có switch lớp Tên mốc');
        assert.ok(indexHtml.includes('id="chkExportCoords"'), 'Có switch lớp Tọa độ X, Y');
        assert.ok(indexHtml.includes('id="chkExportLines"'), 'Có switch lớp Ranh thửa / Cạnh');
        assert.ok(indexHtml.includes('id="chkExportLengths"'), 'Có switch lớp Kích thước cạnh');
        assert.ok(indexHtml.includes('id="chkExportGrid"'), 'Có switch lớp Lưới tọa độ Km');

        // 5. Nút bấm Xác nhận Xuất Dữ Liệu
        assert.ok(indexHtml.includes('onclick="appData.executeExport()"') || indexHtml.includes('appData.executeExport()'), 'Có nút thực hiện xuất file');
    });

    test('2. Khắc phục triệt để lỗi "Missing symbol table" trong AutoCAD (cad_geometry.js)', () => {
        const dummyPoints = [
            { name: 'M1', x: 2315000.123, y: 585000.456, h: 12.5 },
            { name: 'M2', x: 2315050.234, y: 585080.567, h: 13.0 },
            { name: 'M3', x: 2315020.345, y: 585120.678, h: 12.8 },
            { name: 'M4', x: 2314980.456, y: 585040.789, h: 12.2 }
        ];

        const dwgContent = cadGeometry.exportDwgString(dummyPoints, 'RANH_DAT', {
            scaleVal: 1000,
            projectName: 'Dự Án Đo Đạc Mẫu',
            surveyor: 'Kỹ Sư Trắc Địa'
        });

        // Kiểm tra Symbol Tables bắt buộc theo đặc tả AutoCAD DXF/DWG:
        // Table VPORT
        assert.ok(dwgContent.includes('0\r\nTABLE\r\n2\r\nVPORT'), 'Bắt buộc phải có Symbol Table VPORT');
        assert.ok(dwgContent.includes('*ACTIVE'), 'VPORT phải có mục *ACTIVE');

        // Table LTYPE
        assert.ok(dwgContent.includes('0\r\nTABLE\r\n2\r\nLTYPE'), 'Bắt buộc phải có Symbol Table LTYPE');
        assert.ok(dwgContent.includes('CONTINUOUS'), 'LTYPE phải có CONTINUOUS');
        assert.ok(dwgContent.includes('DASHED'), 'LTYPE phải có DASHED');
        assert.ok(dwgContent.includes('CENTER'), 'LTYPE phải có CENTER');

        // Table LAYER
        assert.ok(dwgContent.includes('0\r\nTABLE\r\n2\r\nLAYER'), 'Bắt buộc phải có Symbol Table LAYER');
        assert.ok(dwgContent.includes('RANH_THUA'), 'Có LAYER RANH_THUA');
        assert.ok(dwgContent.includes('MOC_TOADO'), 'Có LAYER MOC_TOADO');
        assert.ok(dwgContent.includes('SO_HIEU_DINH'), 'Có LAYER SO_HIEU_DINH');
        assert.ok(dwgContent.includes('CHIEU_DAI_CANH'), 'Có LAYER CHIEU_DAI_CANH');
        assert.ok(dwgContent.includes('TOADO_TEXT'), 'Có LAYER TOADO_TEXT');
        assert.ok(dwgContent.includes('LUOI_TOADO'), 'Có LAYER LUOI_TOADO');
        assert.ok(dwgContent.includes('KHUNG_BAN_VE'), 'Có LAYER KHUNG_BAN_VE');

        // Table STYLE
        assert.ok(dwgContent.includes('0\r\nTABLE\r\n2\r\nSTYLE'), 'Bắt buộc phải có Symbol Table STYLE');
        assert.ok(dwgContent.includes('STANDARD'), 'Có STYLE STANDARD');
        assert.ok(dwgContent.includes('VN_ARIAL'), 'Có STYLE VN_ARIAL');

        // Table BLOCK_RECORD & Section BLOCKS
        assert.ok(dwgContent.includes('0\r\nTABLE\r\n2\r\nBLOCK_RECORD'), 'Bắt buộc phải có Symbol Table BLOCK_RECORD');
        assert.ok(dwgContent.includes('*MODEL_SPACE'), 'Có BLOCK_RECORD *MODEL_SPACE');
        assert.ok(dwgContent.includes('*PAPER_SPACE'), 'Có BLOCK_RECORD *PAPER_SPACE');
        assert.ok(dwgContent.includes('0\r\nSECTION\r\n2\r\nBLOCKS'), 'Bắt buộc phải có Section BLOCKS');

        // Section ENTITIES & EOF
        assert.ok(dwgContent.includes('0\r\nSECTION\r\n2\r\nENTITIES'), 'Bắt buộc phải có Section ENTITIES');
        assert.ok(dwgContent.endsWith('0\r\nEOF\r\n'), 'File CAD phải kết thúc bằng 0\\r\\nEOF\\r\\n');
    });

    test('3. Tính toán tỷ lệ xuất CAD chính xác theo tỷ lệ bản vẽ', () => {
        const dummyPoints = [
            { name: 'M1', x: 2315000, y: 585000, h: 10 },
            { name: 'M2', x: 2315100, y: 585100, h: 10 }
        ];

        // Tỷ lệ 1:500 (Hệ số S = 0.5)
        const dwg500 = cadGeometry.exportDwgString(dummyPoints, 'RANH_DAT', { scaleVal: 500 });
        // Tỷ lệ 1:2000 (Hệ số S = 2.0)
        const dwg2000 = cadGeometry.exportDwgString(dummyPoints, 'RANH_DAT', { scaleVal: 2000 });

        // Chiều cao chữ tỷ lệ 1:500 là 2.5 * 0.5 = 1.2500m
        assert.ok(dwg500.includes('1.2500'), 'Chữ ở tỷ lệ 1:500 có chiều cao 1.2500m');
        // Chiều cao chữ tỷ lệ 1:2000 là 2.5 * 2.0 = 5.0000m
        assert.ok(dwg2000.includes('5.0000'), 'Chữ ở tỷ lệ 1:2000 có chiều cao 5.0000m');
    });

    test('4. Logic appData trong app.js tích hợp đầy đủ getExportOptions & renderExportPreview', () => {
        assert.ok(appJs.includes('getExportOptions()'), 'Hàm getExportOptions phải có trong appData');
        assert.ok(appJs.includes('renderExportPreview()'), 'Hàm renderExportPreview phải có trong appData');
        assert.ok(appJs.includes('executeExport()'), 'Hàm executeExport phải có trong appData');
    });
});
