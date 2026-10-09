const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const cssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

test('=== 1. KIỂM THỬ GIAO DIỆN MÀN HÌNH NHỎ DẠNG ĐỨNG: THANH HEADER & TIÊU ĐỀ ===', () => {
    // 1.1 Kiểm tra quy tắc Header co giãn trên mobile
    assert.match(cssContent, /header\.app-header\s*\{[^}]*max-height:\s*calc\(var\(--sat-safe-top\)\s*\+\s*48px\)\s*!important;/,
        'Header trên mobile dọc khống chế chiều cao gọn gàng 48px');

    // 1.2 Chống tràn tiêu đề và subtitle
    assert.match(cssContent, /\.app-title\s*span\s*\{[^}]*text-overflow:\s*ellipsis\s*!important;/,
        '.app-title span có text-overflow: ellipsis chống tràn tiêu đề');
    assert.match(cssContent, /\.header-geodetic-pill\s*\{[^}]*text-overflow:\s*ellipsis\s*!important;/,
        '.header-geodetic-pill có text-overflow: ellipsis chống tràn thông tin KTT');
});

test('=== 2. KIỂM THỬ THANH CÔNG CỤ BẢN ĐỒ CHUYỂN ĐỔI: CUỘN NGANG 1 DÒNG CHỐNG CHE BẢN ĐỒ ===', () => {
    // 2.1 Toolbar không bị nhảy xuống 3 dòng, cuộn ngang mượt mà
    assert.match(cssContent, /#transformMapToolbar\.transform-map-toolbar\s*\{[^}]*flex-wrap:\s*nowrap\s*!important;/,
        'Thanh công cụ chuyển đổi không được ngắt dòng gây che bản đồ');
    assert.match(cssContent, /#transformMapToolbar\.transform-map-toolbar\s*\{[^}]*overflow-x:\s*auto\s*!important;/,
        'Thanh công cụ chuyển đổi cho phép cuộn ngang êm ái trên di động');
    assert.match(cssContent, /#transformMapToolbar\.transform-map-toolbar\s*\{[^}]*height:\s*42px\s*!important;/,
        'Thanh công cụ khống chế chiều cao 42px');

    // 2.2 Nút bấm compact không bị khổng lồ
    assert.match(cssContent, /#transformMapToolbar\.transform-map-toolbar\s+\.btn-sm\s*\{[^}]*height:\s*30px\s*!important;/,
        'Nút bấm trên thanh toolbar có chiều cao 30px cân đối');
});

test('=== 3. KIỂM THỬ BOTTOM SHEET CHUYỂN ĐỔI: TỶ LỆ VÀNG & CÂN ĐỐI NÚT THAO TÁC ===', () => {
    // 3.1 Bottom sheet ôm sát cạnh nhưng chừa viền 8px
    assert.match(cssContent, /\.transform-bottom-sheet\s*\{[^}]*left:\s*8px\s*!important;/,
        'Bottom sheet căn lề trái 8px trên mobile');
    assert.match(cssContent, /\.transform-bottom-sheet\s*\{[^}]*right:\s*8px\s*!important;/,
        'Bottom sheet căn lề phải 8px trên mobile');

    // 3.2 Tinh chỉnh nút chuyển đổi và nút sao chép
    assert.match(cssContent, /\.btn-sheet-convert\s*\{[^}]*height:\s*36px\s*!important;/,
        'Nút chuyển đổi trong bottom sheet có chiều cao 36px');
    assert.match(cssContent, /\.btn-smart-copy\s*\{[^}]*height:\s*34px\s*!important;/,
        'Nút sao chép thông minh có chiều cao 34px');
    assert.match(cssContent, /\.sheet-tab-btn\s*\{[^}]*font-size:\s*11\.5px\s*!important;/,
        'Tab Đơn điểm / Đa điểm chữ vừa vặn 11.5px chống tràn hàng');
});

test('=== 4. KIỂM THỬ BENTO TILES TRANG CHỦ & ĐIỀU HƯỚNG ĐÁY CHUẨN MÀN HÌNH DỌC ===', () => {
    // 4.1 Khối Bento 2x2 co giãn tỷ lệ cân xứng
    assert.match(cssContent, /\.big-action-tile\s*\{[^}]*min-height:\s*98px\s*!important;/,
        'Thẻ Bento hành động chính có min-height 98px gọn gàng');

    // 4.2 Thẻ tọa độ Live HUD không vỡ khung số
    assert.match(cssContent, /\.hero-coord-val\s*\{[^}]*font-size:\s*clamp\(12px,\s*3\.5vw,\s*14\.5px\)\s*!important;/,
        'Tọa độ Live HUD dùng clamp co giãn chống tràn khung');

    // 4.3 Breakpoint đặc thù cho máy siêu nhỏ <= 380px
    assert.match(cssContent, /@media\s*\(max-width:\s*380px\)\s*\{/,
        'Có breakpoint riêng biệt cho màn hình nhỏ <= 380px (iPhone SE, Galaxy A-series)');
});
