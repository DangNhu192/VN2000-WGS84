/**
 * KIỂM THỬ HỒI QUY TỰ ĐỘNG:
 * 1. Hiển thị & chọn các điểm (đỉnh của từng nét vẽ) trong MiniCAD
 * 2. 5 Bảng kê chi tiết: Bảng ranh & diện tích, Bảng kê các đỉnh, Bảng kê mũi tên, Bảng kê khối nhà, Bảng kê bán kính
 * 3. Sửa trực tiếp tên trên bản đồ (Quick Inline Rename Popup)
 * 4. Mũi tên 1 đầu nhọn (chỉ dẫn) và 2 đầu nhọn (đo kích thước khoảng cách)
 * 5. Xuất Excel đa sheet (.xlsx), CSV theo tab và Sao chép clipboard
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const styleCss = fs.readFileSync(path.resolve(__dirname, '../style.css'), 'utf8');
const appJs = fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8');

test('=== 1. KIỂM THỬ GIAO DIỆN MODAL BẢNG KÊ 6 TAB TRONG INDEX.HTML ===', (t) => {
    // 6 nút Tab trong Modal Bảng Kê
    assert.match(indexHtml, /id="tabBtnCadTableRanh"/, 'Có tab Ranh & Diện tích');
    assert.match(indexHtml, /id="tabBtnCadTableVertices"/, 'Có tab Bảng kê đỉnh');
    assert.match(indexHtml, /id="tabBtnCadTableArrows"/, 'Có tab Bảng kê mũi tên');
    assert.match(indexHtml, /id="tabBtnCadTableBuildings"/, 'Có tab Bảng kê khối nhà');
    assert.match(indexHtml, /id="tabBtnCadTableCircles"/, 'Có tab Bảng kê bán kính');
    assert.match(indexHtml, /id="tabBtnCadTableStamps"/, 'Có tab Bảng kê tem & nhãn');

    // 6 container nội dung tương ứng
    assert.match(indexHtml, /id="tabContentCadTableRanh"/, 'Có container nội dung Ranh');
    assert.match(indexHtml, /id="tabContentCadTableVertices"/, 'Có container nội dung Đỉnh');
    assert.match(indexHtml, /id="tabContentCadTableArrows"/, 'Có container nội dung Mũi tên');
    assert.match(indexHtml, /id="tabContentCadTableBuildings"/, 'Có container nội dung Khối nhà');
    assert.match(indexHtml, /id="tabContentCadTableCircles"/, 'Có container nội dung Bán kính');
    assert.match(indexHtml, /id="tabContentCadTableStamps"/, 'Có container nội dung Tem & Nhãn');

    // Bộ lọc và công tắc hiển thị đỉnh
    assert.match(indexHtml, /id="txtSearchCadVertices"/, 'Có ô tìm kiếm lọc đỉnh');
    assert.match(indexHtml, /id="cadCheckAllVerticesVisible"/, 'Có checkbox công tắc hiện tất cả đỉnh');
});

test('=== 2. KIỂM THỬ FLOATING PANEL SUBTABS & BADGES TRÊN MAP TRONG INDEX.HTML ===', (t) => {
    assert.match(indexHtml, /id="cadPanelTitleLabel"/, 'Có tiêu đề động cho floating panel');
    assert.match(indexHtml, /id="cadPanelSubtabs"/, 'Có thanh subtab chuyển đổi trên map');
    assert.match(indexHtml, /id="btnSubtabBlocks"/, 'Có subtab Khối');
    assert.match(indexHtml, /id="btnSubtabVertices"/, 'Có subtab Đỉnh');
    assert.match(indexHtml, /id="btnSubtabArrows"/, 'Có subtab Mũi tên');
    assert.match(indexHtml, /id="btnSubtabBuildings"/, 'Có subtab Khối nhà');
    assert.match(indexHtml, /id="btnSubtabCircles"/, 'Có subtab Bán kính');

    // Các số đếm trên subtab
    assert.match(indexHtml, /id="cadSubtabCountBlocks"/, 'Có badge đếm khối');
    assert.match(indexHtml, /id="cadSubtabCountVertices"/, 'Có badge đếm đỉnh');
    assert.match(indexHtml, /id="cadSubtabCountArrows"/, 'Có badge đếm mũi tên');
    assert.match(indexHtml, /id="cadSubtabCountBuildings"/, 'Có badge đếm nhà');
    assert.match(indexHtml, /id="cadSubtabCountCircles"/, 'Có badge đếm bán kính');
    assert.match(indexHtml, /id="cadCountTabStamps"/, 'Có badge đếm tem nhãn');
});

test('=== 3. KIỂM THỬ MODAL TẠO & SỬA MŨI TÊN 1 ĐẦU / 2 ĐẦU NHỌN TRONG INDEX.HTML ===', (t) => {
    // Modal tạo mũi tên
    assert.match(indexHtml, /id="modalCadCreateArrow"/, 'Có modal tạo mũi tên CAD');
    assert.match(indexHtml, /id="btnArrowTypeSingle"/, 'Có nút chọn mũi tên 1 đầu nhọn');
    assert.match(indexHtml, /id="btnArrowTypeDouble"/, 'Có nút chọn mũi tên 2 đầu nhọn');
    assert.match(indexHtml, /id="txtNewArrowText"/, 'Có ô nhập ghi chú / cự ly');
    assert.match(indexHtml, /id="lblNewArrowDistHint"/, 'Có nhãn hiển thị cự ly đo thực tế');
    assert.match(indexHtml, /id="btnCadConfirmCreateArrow"/, 'Có nút xác nhận thêm mũi tên');

    // Nhóm chọn kiểu mũi tên trong modal sửa thuộc tính
    assert.match(indexHtml, /id="grpCadEditAnnArrowTypeChoice"/, 'Có bộ chọn kiểu mũi tên trong modal sửa');
    assert.match(indexHtml, /id="btnEditArrowTypeSingle"/, 'Có nút sửa mũi tên 1 đầu');
    assert.match(indexHtml, /id="btnEditArrowTypeDouble"/, 'Có nút sửa mũi tên 2 đầu');
});

test('=== 4. KIỂM THỬ ĐỊNH KIỂU STYLE.CSS (QUICK POPUP & SUBTABS) ===', (t) => {
    assert.match(styleCss, /\.cad-quick-popup/, 'Có CSS class cho popup chỉnh sửa trực tiếp trên map');
    assert.match(styleCss, /\[data-theme="light"\]\s+\.cad-quick-popup/, 'Có CSS dark/light theme cho quick popup');
    assert.match(styleCss, /\.cad-panel-subtabs\s+button\.active/, 'Có CSS cho subtab active trên panel');
    assert.match(styleCss, /\.cad-editable-inline-cell/, 'Có CSS hover cho ô inline editable');
});

test('=== 5. KIỂM THỬ LOGIC JAVASCRIPT TRONG APP.JS (APPCADTOOL) ===', (t) => {
    // Hàm chuyển đổi tab modal & render các bảng kê mới
    assert.match(appJs, /switchModalTableTab\s*\(/, 'Có hàm switchModalTableTab');
    assert.match(appJs, /renderModalVerticesTable\s*\(/, 'Có hàm renderModalVerticesTable');
    assert.match(appJs, /renderModalArrowsTable\s*\(/, 'Có hàm renderModalArrowsTable');
    assert.match(appJs, /renderModalBuildingsTable\s*\(/, 'Có hàm renderModalBuildingsTable');
    assert.match(appJs, /renderModalCirclesTable\s*\(/, 'Có hàm renderModalCirclesTable');
    assert.match(appJs, /renderModalStampsTable\s*\(/, 'Có hàm renderModalStampsTable');

    // Hàm chuyển đổi subtab trên map panel
    assert.match(appJs, /switchPanelTab\s*\(/, 'Có hàm switchPanelTab');

    // Tạo & đổi kiểu mũi tên
    assert.match(appJs, /openCreateArrowModal\s*\(/, 'Có hàm openCreateArrowModal');
    assert.match(appJs, /selectNewArrowType\s*\(/, 'Có hàm selectNewArrowType');
    assert.match(appJs, /confirmCreateArrow\s*\(/, 'Có hàm confirmCreateArrow');
    assert.match(appJs, /quickToggleArrowType\s*\(/, 'Có hàm quickToggleArrowType');
    assert.match(appJs, /setEditAnnotationArrowType\s*\(/, 'Có hàm setEditAnnotationArrowType');

    // Sửa tên nhanh trực tiếp trên bản đồ
    assert.match(appJs, /showQuickEditPopup\s*\(/, 'Có hàm showQuickEditPopup');
    assert.match(appJs, /submitQuickRename\s*\(/, 'Có hàm submitQuickRename');
    assert.match(appJs, /promptRenameVertex\s*\(/, 'Có hàm promptRenameVertex');
    assert.match(appJs, /promptRenameAnnotation\s*\(/, 'Có hàm promptRenameAnnotation');

    // Ẩn / hiện đỉnh
    assert.match(appJs, /toggleAllVerticesVisible\s*\(/, 'Có hàm toggleAllVerticesVisible');
    assert.match(appJs, /toggleShapeVerticesVisibility\s*\(/, 'Có hàm toggleShapeVerticesVisibility');

    // Xóa từ bảng kê
    assert.match(appJs, /deleteVertexFromTable\s*\(/, 'Có hàm deleteVertexFromTable');
    assert.match(appJs, /deleteAnnotationFromTable\s*\(/, 'Có hàm deleteAnnotationFromTable');

    // Xuất Excel 6 sheets
    assert.match(appJs, /'BangKe_MuiTen'/, 'Xuất Excel có Sheet BangKe_MuiTen');
    assert.match(appJs, /'BangKe_KhoiNha'/, 'Xuất Excel có Sheet BangKe_KhoiNha');
    assert.match(appJs, /'BangKe_BanKinh'/, 'Xuất Excel có Sheet BangKe_BanKinh');
    assert.match(appJs, /'BangKe_TemNhan'/, 'Xuất Excel có Sheet BangKe_TemNhan');
});
