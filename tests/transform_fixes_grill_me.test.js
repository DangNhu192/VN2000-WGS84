const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const cssContent = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

test('=== 1. KIỂM THỬ FIX LỖI 1: BẢN ĐỒ CHUYỂN ĐỔI PHỦ 100% TOÀN MÀN HÌNH (KHÔNG BỊ KẸT 2/5) ===', () => {
    // 1.1 CSS của #screen-transform-map phải là flex absolute chiếm 100%
    assert.match(cssContent, /#screen-transform-map\.screen-view\.active\s*\{[^}]*display:\s*flex\s*!important;/, 
        '#screen-transform-map.screen-view.active phải có display: flex !important');
    assert.match(cssContent, /#screen-transform-map\.screen-view\.active\s*\{[^}]*height:\s*100%\s*!important;/, 
        '#screen-transform-map.screen-view.active phải có height: 100% !important');

    // 1.2 #leaflet-transform-map phải có height: 100% !important
    assert.match(cssContent, /#screen-transform-map\s+#leaflet-transform-map\s*\{[^}]*height:\s*100%\s*!important;/, 
        '#leaflet-transform-map phải có height: 100% !important');
    assert.match(cssContent, /#screen-transform-map\s+#leaflet-transform-map\s*\{[^}]*flex:\s*1\s+1\s+100%\s*!important;/, 
        '#leaflet-transform-map phải có flex: 1 1 100% !important');
});

test('=== 2. KIỂM THỬ FIX LỖI 2: KÉO THẢ VUỐT TRƯỢT THU GỌN / MỞ RỘNG BOTTOM SHEET ===', () => {
    // 2.1 CSS Drag Handle
    assert.match(cssContent, /\.transform-sheet-drag-handle\s*\{[^}]*touch-action:\s*none;/, 
        'Thanh vuốt drag handle phải có touch-action: none chống chặn cử chỉ cuộn web');
    assert.match(cssContent, /\.transform-bottom-sheet\.is-dragging\s*\{[^}]*transition:\s*none\s*!important;/, 
        'Khi đang vuốt is-dragging phải tắt transition để trượt êm mượt tức thì 0ms');

    // 2.2 Logic JS gắn sự kiện kéo thả
    assert.ok(appJsContent.includes('initSheetDrag()'), 'appTransformMap phải có hàm initSheetDrag()');
    assert.ok(appJsContent.includes("handle.addEventListener('touchstart', onTouchStart"), 'Gắn sự kiện touchstart kéo trượt trên di động');
    assert.ok(appJsContent.includes("handle.addEventListener('mousedown', onTouchStart"), 'Gắn sự kiện mousedown kéo trượt trên máy tính');
    assert.ok(appJsContent.includes("sheet.classList.add('sheet-peek')"), 'Vuốt xuống thành công tự động thu gọn sheet-peek');
});

test('=== 3. KIỂM THỬ FIX LỖI 3: GIẢI PHÓNG BẢNG TỌA ĐỘ VÀ HIỂN THỊ CHUẨN MỐC CHUYỂN ĐỔI ===', () => {
    // 3.1 Cấu trúc HTML: Card 4 và Card 5 KHÔNG được nằm trong boxConvertedResult
    const boxResStart = htmlContent.indexOf('id="boxConvertedResult"');
    assert.ok(boxResStart > 0, 'Phải có id="boxConvertedResult"');
    
    const card4Start = htmlContent.indexOf('id="txtVn2kX"');
    assert.ok(card4Start > 0, 'Phải có input id="txtVn2kX"');

    // Tìm thẻ đóng </div> của boxConvertedResult
    const afterBox = htmlContent.substring(boxResStart, card4Start);
    // Đoạn giữa boxConvertedResult và Card 4 phải có thẻ đóng của boxConvertedResult
    assert.ok(afterBox.includes('</div>\n              </div>') || afterBox.includes('</div>\r\n              </div>'), 
        'boxConvertedResult phải được đóng thẻ div hoàn chỉnh trước khi đến Card 4');

    // 3.2 Bỏ modal pop-up phiền toái trong wgsToVn2000
    const wgsFunc = appJsContent.substring(appJsContent.indexOf('wgsToVn2000()'), appJsContent.indexOf('vn2000ToWgs()'));
    assert.strictEqual(wgsFunc.includes('promptOpenConvertedMap'), false, 
        'wgsToVn2000() không còn gọi pop-up phiền toái promptOpenConvertedMap');
    assert.ok(wgsFunc.includes('scrollIntoView'), 
        'wgsToVn2000() cuộn mượt đến bảng kết quả');

    // 3.3 Ưu tiên tuyệt đối hiển thị mốc vừa chuyển đổi trên bản đồ
    assert.ok(appJsContent.includes('this.viewSinglePoint'), 'renderConvertedPoints ưu tiên mốc vừa chuyển đổi viewSinglePoint');
    assert.ok(appJsContent.includes('this.map.setView([fLat, fLng], 17);'), 'Zoom trực tiếp mức 17 vào đúng mốc vừa chuyển đổi');
});

test('=== 4. KIỂM THỬ FIX LỖI 4: NÚT QUAY LẠI TỪ BẢN ĐỒ CHUYỂN ĐỔI THOÁT RA MENU TRANG CHỦ HOÀN TOÀN ===', () => {
    // 4.1 handleHeaderBack() phải gọi appNav.goToMenu() thay vì gọi lại showScreen('transform') gây vòng lặp kẹt
    assert.match(appJsContent, /handleHeaderBack\(\)\s*\{[\s\S]*?getElementById\('screen-transform-map'\)[\s\S]*?appNav\.goToMenu\(\);/,
        'handleHeaderBack() khi ở screen-transform-map phải gọi appNav.goToMenu() để quay về trang chủ');

    // 4.2 Nút ✕ Đóng trên thanh công cụ bản đồ phải gọi appNav.goToMenu()
    assert.ok(htmlContent.includes('onclick="appNav.goToMenu()" title="Đóng bản đồ, quay lại màn hình chính"'),
        'Nút ✕ Đóng trên thanh toolbar bản đồ chuyển đổi phải quay về menu chính');

    // 4.3 goToMenu() phải dọn dẹp ẩn sạch sẽ cả map-view-container và screen-transform-map
    assert.match(appJsContent, /goToMenu\(\)\s*\{[\s\S]*?getElementById\('screen-transform-map'\)[\s\S]*?appNav\.showScreen\('menu'\);/,
        'goToMenu() phải ẩn dứt điểm screen-transform-map và chuyển sang screen-menu');
});
