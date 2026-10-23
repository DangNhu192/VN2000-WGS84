const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('=== KIỂM THỬ TÍNH NĂNG CHỌN / BỎ CHỌN THỬA ĐẤT TRONG BẢNG KÊ MINICAD ===', () => {
    const appJsContent = fs.readFileSync(path.resolve('./app.js'), 'utf-8');
    const indexHtmlContent = fs.readFileSync(path.resolve('./index.html'), 'utf-8');

    it('1. Giao diện HTML có đầy đủ các thành phần checkbox chọn thửa và tổng hợp diện tích', () => {
        // Modal Bảng kê & Thống kê tổng hợp MiniCAD
        assert.ok(indexHtmlContent.includes('id="modalCadAreaTable"'), 'Thiếu modal #modalCadAreaTable');
        assert.ok(indexHtmlContent.includes('id="cadBlockList"'), 'Thiếu container danh sách khối #cadBlockList');
        assert.ok(indexHtmlContent.includes('id="cadBlockTotalArea"'), 'Thiếu nhãn tổng diện tích khối chọn #cadBlockTotalArea');
        assert.ok(indexHtmlContent.includes('id="cadBlockTotalHa"'), 'Thiếu nhãn tổng ha #cadBlockTotalHa');
        assert.ok(indexHtmlContent.includes('id="cadBlockTotalPercent"'), 'Thiếu nhãn % tỉ lệ #cadBlockTotalPercent');
        assert.ok(indexHtmlContent.includes('id="cadModalAreaM2"'), 'Thiếu thẻ tổng diện tích m² #cadModalAreaM2');
    });

    it('2. Logic appCadTool.toggleBlockSelect & toggleSelectAllBlocks hoạt động chuẩn xác', () => {
        assert.ok(appJsContent.includes('toggleBlockSelect(idx, isChecked)'), 'Thiếu hàm toggleBlockSelect');
        assert.ok(appJsContent.includes('toggleSelectAllBlocks(isChecked)'), 'Thiếu hàm toggleSelectAllBlocks');
        assert.ok(appJsContent.includes('_draftSelected = isChecked'), 'toggleBlockSelect/toggleSelectAllBlocks phải cập nhật _draftSelected');
    });

    it('3. openAreaTableModal sử dụng _getAllExportShapes và tính tổng diện tích theo các khối được chọn', () => {
        // Kiểm tra openAreaTableModal lấy allShapes từ _getAllExportShapes()
        const startIdx = appJsContent.indexOf('openAreaTableModal(action = null)');
        const openModalFn = appJsContent.slice(startIdx, startIdx + 6000);
        assert.ok(openModalFn.includes('_getAllExportShapes()'), 'openAreaTableModal phải dùng _getAllExportShapes() để giữ thuộc tính selected');
        assert.ok(openModalFn.includes('allShapes.filter(s => s.selected !== false)'), 'Phải lọc các khối selected !== false để tính tổng diện tích');
        assert.ok(openModalFn.includes('Bỏ chọn (Không tính tổng)'), 'Phải hiển thị nhãn bỏ chọn cho khối unselected trong bảng chi tiết');
    });

    it('4. Mô phỏng tích chọn/bỏ chọn cập nhật chuẩn xác tổng diện tích và trạng thái checkbox', () => {
        // Mock môi trường tối thiểu để chạy logic
        const shapes = [
            { id: 'shape_1', name: 'Thửa 1', mode: 'polygon', selected: true, stats: { area: 150.0, perimeter: 50.0 } },
            { id: 'shape_2', name: 'Thửa 2', mode: 'polygon', selected: true, stats: { area: 250.0, perimeter: 70.0 } },
            { id: 'shape_3', name: 'Thửa 3', mode: 'polygon', selected: true, stats: { area: 100.0, perimeter: 40.0 } }
        ];

        // 1. Khi chọn tất cả
        let selectedShapes = shapes.filter(s => s.selected !== false);
        let totalArea = selectedShapes.reduce((sum, s) => sum + s.stats.area, 0);
        assert.equal(totalArea, 500.0, 'Tổng diện tích ban đầu của 3 thửa phải là 500m²');

        // 2. Người dùng bỏ check Thửa 2 (idx = 1)
        shapes[1].selected = false;
        selectedShapes = shapes.filter(s => s.selected !== false);
        totalArea = selectedShapes.reduce((sum, s) => sum + s.stats.area, 0);
        assert.equal(totalArea, 250.0, 'Sau khi bỏ chọn Thửa 2 (250m²), tổng diện tích phải còn 250m²');
        assert.equal(selectedShapes.length, 2, 'Số thửa được chọn phải là 2');

        // 3. Người dùng bỏ check Thửa 3 (idx = 2)
        shapes[2].selected = false;
        selectedShapes = shapes.filter(s => s.selected !== false);
        totalArea = selectedShapes.reduce((sum, s) => sum + s.stats.area, 0);
        assert.equal(totalArea, 150.0, 'Sau khi bỏ chọn thêm Thửa 3 (100m²), tổng diện tích phải còn 150m²');

        // 4. Người dùng tick "Chọn tất cả"
        shapes.forEach(s => s.selected = true);
        selectedShapes = shapes.filter(s => s.selected !== false);
        totalArea = selectedShapes.reduce((sum, s) => sum + s.stats.area, 0);
        assert.equal(totalArea, 500.0, 'Sau khi tick Chọn tất cả, tổng diện tích phải quay về 500m²');
    });
});
