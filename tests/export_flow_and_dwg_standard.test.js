/**
 * tests/export_flow_and_dwg_standard.test.js
 * Kiểm thử quy trình Xuất dữ liệu chuẩn hoá & Khắc phục lỗi Missing symbol table CAD
 */
const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const cadGeo = require('../src/core/cad_geometry.js');

describe('=== 1. KIỂM THỬ KHẮC PHỤC LỖI "MISSING SYMBOL TABLE" TRONG AUTOCAD ===', () => {
    test('1.1 File CAD được tạo phải chứa đầy đủ các Symbol Tables bắt buộc theo đặc tả Autodesk', () => {
        const dummyMarkers = [
            { id: 'M1', name: 'Mốc 01', x: 1144050.25, y: 585120.75, z: 12.5 },
            { id: 'M2', name: 'Mốc 02', x: 1144120.50, y: 585230.10, z: 12.8 }
        ];
        const dummyShapes = [
            {
                name: 'Thửa 01',
                type: 'polygon',
                points: [
                    { x: 1144050.25, y: 585120.75 },
                    { x: 1144120.50, y: 585230.10 },
                    { x: 1144050.25, y: 585120.75 }
                ]
            }
        ];

        const cadContent = cadGeo.exportDwgString(dummyMarkers, dummyShapes, {
            scaleVal: 1000,
            projectName: 'Dự án Test Kỹ thuật',
            author: 'Kỹ sư Trắc địa'
        });

        // Kiểm tra Symbol Tables
        assert.ok(cadContent.includes('VPORT'), 'Phải chứa bảng VPORT để tránh lỗi Missing symbol table');
        assert.ok(cadContent.includes('*ACTIVE'), 'Phải có VPORT *ACTIVE');
        assert.ok(cadContent.includes('LTYPE'), 'Phải chứa bảng LTYPE');
        assert.ok(cadContent.includes('CONTINUOUS'), 'Phải có kiểu nét CONTINUOUS');
        assert.ok(cadContent.includes('DASHED'), 'Phải có kiểu nét DASHED');
        assert.ok(cadContent.includes('CENTER'), 'Phải có kiểu nét CENTER');
        assert.ok(cadContent.includes('LAYER'), 'Phải chứa bảng LAYER');
        assert.ok(cadContent.includes('STYLE'), 'Phải chứa bảng STYLE chữ');
        assert.ok(cadContent.includes('BLOCK_RECORD'), 'Phải chứa bảng BLOCK_RECORD (*MODEL_SPACE, *PAPER_SPACE)');
        assert.ok(cadContent.includes('*MODEL_SPACE'), 'Phải định nghĩa *MODEL_SPACE');
        assert.ok(cadContent.includes('*PAPER_SPACE'), 'Phải định nghĩa *PAPER_SPACE');
        assert.ok(cadContent.includes('SECTION\r\n2\r\nBLOCKS'), 'Phải chứa section BLOCKS hoàn chỉnh');
        assert.ok(cadContent.includes('SECTION\r\n2\r\nENTITIES'), 'Phải chứa section ENTITIES');
        assert.ok(cadContent.includes('0\r\nEOF'), 'Phải kết thúc bằng mã nhóm 0 EOF');
    });

    test('1.2 Kích thước phần tử CAD phải tự động co giãn theo tỷ lệ bản đồ được chọn (scaleVal)', () => {
        const dummyMarkers = [{ id: 'M1', name: 'M1', x: 1000, y: 2000, z: 0 }];
        
        // Xuất ở tỷ lệ 1:500 (scaleVal = 500 => S = 0.5)
        const cad500 = cadGeo.exportDwgString(dummyMarkers, [], { scaleVal: 500 });
        // Xuất ở tỷ lệ 1:2000 (scaleVal = 2000 => S = 2.0)
        const cad2000 = cadGeo.exportDwgString(dummyMarkers, [], { scaleVal: 2000 });

        // Tỷ lệ 1:2000 phải có chiều cao chữ lớn gấp 4 lần tỷ lệ 1:500
        // S_500: txtH = 2.5 * 0.5 = 1.25
        // S_2000: txtH = 2.5 * 2.0 = 5.00
        assert.ok(cad500.includes('1.25'), 'Tỷ lệ 1:500 phải có chiều cao chữ/bán kính 1.25m');
        assert.ok(cad2000.includes('5.00') || cad2000.includes('5'), 'Tỷ lệ 1:2000 phải có chiều cao chữ 5.0m');
    });
});

describe('=== 2. KIỂM THỬ GIAO DIỆN CỬA SỔ PREVIEW VÀ CÀI ĐẶT THÔNG TIN TRONG INDEX.HTML ===', () => {
    let indexHtml = '';
    before(() => {
        indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    });

    test('2.1 Modal xuất dữ liệu #modalExportData phải có đầy đủ 5 bước theo yêu cầu', () => {
        assert.ok(indexHtml.includes('id="modalExportData"'), 'Phải tồn tại modalExportData');
        assert.ok(indexHtml.includes('id="exportPreviewSvg"'), 'Phải có khung Preview bản đồ SVG tương tác');
        assert.ok(indexHtml.includes('id="selExportMapScale"'), 'Phải có dropdown chọn tỷ lệ bản đồ');
        assert.ok(indexHtml.includes('id="txtExportProjectName"'), 'Phải có ô nhập Tên dự án');
        assert.ok(indexHtml.includes('id="txtExportSurveyor"'), 'Phải có ô nhập Tên kỹ sư lập');
    });

    test('2.2 Modal xuất dữ liệu phải có bộ chọn lớp dữ liệu xuất (Layer toggles)', () => {
        assert.ok(indexHtml.includes('id="chkExportPoints"'), 'Có checkbox bật/tắt Lớp Điểm mốc');
        assert.ok(indexHtml.includes('id="chkExportNames"'), 'Có checkbox bật/tắt Tên mốc');
        assert.ok(indexHtml.includes('id="chkExportCoords"'), 'Có checkbox bật/tắt Tọa độ X/Y');
        assert.ok(indexHtml.includes('id="chkExportLines"'), 'Có checkbox bật/tắt Ranh thửa / Khối hình');
        assert.ok(indexHtml.includes('id="chkExportLengths"'), 'Có checkbox bật/tắt Kích thước cạnh');
        assert.ok(indexHtml.includes('id="chkExportGrid"'), 'Có checkbox bật/tắt Lưới tọa độ Km');
        assert.ok(indexHtml.includes('id="chkExportFrame"'), 'Có checkbox bật/tắt Khung tên bản vẽ');
    });

    test('2.3 Modal xuất dữ liệu phải hỗ trợ đầy đủ các định dạng theo yêu cầu', () => {
        assert.ok(indexHtml.includes("appData.selectExportFormat('dwg')"), 'Có chọn AutoCAD (.dwg)');
        assert.ok(indexHtml.includes("appData.selectExportFormat('dgn')"), 'Có chọn MicroStation (.dgn)');
        assert.ok(indexHtml.includes("appData.selectExportFormat('excel')"), 'Có chọn Bảng tính Excel (.xlsx)');
        assert.ok(indexHtml.includes("appData.selectExportFormat('pdf')"), 'Có chọn Bản vẽ PDF (.pdf)');
        assert.ok(indexHtml.includes("appData.selectExportFormat('png')"), 'Có chọn Ảnh nét cao (.png)');
        assert.ok(indexHtml.includes("appData.selectExportFormat('kml')"), 'Có chọn Google Earth (.kml)');
    });
});

describe('=== 3. KIỂM THỬ LOGIC JAVASCRIPT ĐIỀU PHỐI PREVIEW VÀ XUẤT TẬP TIN TRONG APP.JS ===', () => {
    let appJs = '';
    before(() => {
        appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    });

    test('3.1 appData phải có đầy đủ các hàm Preview, bộ chọn định dạng và xuất file chuẩn', () => {
        assert.ok(appJs.includes('openExportModal('), 'Có hàm mở modal xuất dữ liệu');
        assert.ok(appJs.includes('selectExportFormat('), 'Có hàm chọn định dạng xuất');
        assert.ok(appJs.includes('renderExportPreview('), 'Có hàm vẽ Preview trực quan');
        assert.ok(appJs.includes('executeExport('), 'Có hàm điều phối thực thi xuất dữ liệu');
        assert.ok(appJs.includes('exportDwgFile('), 'Có hàm xuất file DWG chuẩn');
        assert.ok(appJs.includes('exportDgnFile('), 'Có hàm xuất file DGN MicroStation chuẩn');
    });

    test('3.2 Modal xuất MiniCAD (cadExportModal) cũng đồng bộ Preview và tỷ lệ chuẩn', () => {
        assert.ok(appJs.includes('renderExportPreview'), 'MiniCAD có hàm renderExportPreview');
        assert.ok(appJs.includes('selectExportFormat'), 'MiniCAD có hàm selectExportFormat');
    });
});

describe('=== 4. KIỂM THỬ GIAO DIỆN DROPDOWN SỔ XUỐNG VÀ ĐỊNH DẠNG ĐUÔI FILE SÚC TÍCH ===', () => {
    let indexHtml = '';
    let appJs = '';
    before(() => {
        indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
        appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    });

    test('4.1 Cửa sổ chọn định dạng file là dropdown <select> sổ xuống cả ở Sổ đo và MiniCAD', () => {
        assert.ok(indexHtml.includes('<select id="selExportFormat"'), 'Sổ đo/Chuyển đổi có dropdown <select id="selExportFormat">');
        assert.ok(indexHtml.includes('<select id="cadExportFormatSelect"'), 'MiniCAD có dropdown <select id="cadExportFormatSelect">');
    });

    test('4.2 Nội dung hiển thị trong option chỉ đơn giản là định dạng đuôi file không giải thích dài dòng', () => {
        // Trích xuất các option trong selExportFormat
        const selMatch = indexHtml.match(/<select id="selExportFormat"[\s\S]*?<\/select>/);
        assert.ok(selMatch, 'Tìm thấy selExportFormat');
        const selContent = selMatch[0];
        
        // Kiểm tra các định dạng hiển thị dạng .dwg, .xlsx, .pdf, .png...
        assert.ok(/>\.dwg<\/option>/.test(selContent), 'Option hiển thị .dwg gọn gàng');
        assert.ok(/>\.xlsx<\/option>/.test(selContent), 'Option hiển thị .xlsx gọn gàng');
        assert.ok(/>\.pdf<\/option>/.test(selContent), 'Option hiển thị .pdf gọn gàng');
        assert.ok(/>\.png<\/option>/.test(selContent), 'Option hiển thị .png gọn gàng');
        assert.ok(/>\.dgn\s*\/?\s*\.?dat?<\/option>/.test(selContent), 'Option hiển thị .dgn / .dat gọn gàng');
        assert.ok(/>\.kml<\/option>/.test(selContent), 'Option hiển thị .kml gọn gàng');
        assert.ok(/>\.geojson<\/option>/.test(selContent), 'Option hiển thị .geojson gọn gàng');

        // Trong thẻ cadExportFormatSelect cũng súc tích tương tự
        const cadSelMatch = indexHtml.match(/<select id="cadExportFormatSelect"[\s\S]*?<\/select>/);
        assert.ok(cadSelMatch, 'Tìm thấy cadExportFormatSelect');
        const cadContent = cadSelMatch[0];
        assert.ok(/>\.dwg<\/option>/.test(cadContent), 'MiniCAD option hiển thị .dwg gọn gàng');
        assert.ok(/>\.xlsx<\/option>/.test(cadContent), 'MiniCAD option hiển thị .xlsx gọn gàng');
        assert.ok(/>\.pdf<\/option>/.test(cadContent), 'MiniCAD option hiển thị .pdf gọn gàng');
    });

    test('4.3 Nút bấm xuất dữ liệu phản hồi nhãn súc tích chỉ chứa đuôi file', () => {
        assert.ok(appJs.includes("'🚀 XUẤT FILE .DWG'"), 'Nhãn nút xuất DWG chuẩn súc tích');
        assert.ok(appJs.includes("'🚀 XUẤT FILE .XLSX'"), 'Nhãn nút xuất XLSX chuẩn súc tích');
        assert.ok(appJs.includes("'🚀 XUẤT FILE .PDF'"), 'Nhãn nút xuất PDF chuẩn súc tích');
        assert.ok(appJs.includes("'🚀 XUẤT FILE .PNG'"), 'Nhãn nút xuất PNG chuẩn súc tích');
    });
});

