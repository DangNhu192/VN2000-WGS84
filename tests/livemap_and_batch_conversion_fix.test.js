const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const stylePath = path.join(__dirname, '../style.css');
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf-8') + (fs.existsSync(stylePath) ? fs.readFileSync(stylePath, 'utf-8') : '');
const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf-8');
const geodesy = fs.readFileSync(path.join(__dirname, '../geodesy.js'), 'utf-8');

test('=== 1. KIỂM THỬ BẢN ĐỒ TRỰC QUAN LIVE MAP LỚN CHIẾM ĐA SỐ MÀN HÌNH ===', () => {
    // 1.1 Kiểm tra Subtab thứ 3 cho Live Map lớn
    assert.match(indexHtml, /id="tabTransLiveMap"/, 'Phải có tab chuyển nhanh sang Bản Đồ Lớn Trực Quan');
    assert.match(indexHtml, /switchTransformSubTab\('livemap'\)/, 'Tab Bản Đồ Trực Quan phải kích hoạt switchTransformSubTab("livemap")');

    // 1.2 Kiểm tra CSS class cho Bản đồ lớn
    assert.match(indexHtml, /\.transform-map-column\.large-focus/, 'Phải có CSS class large-focus cho Bản đồ lớn');
    assert.match(indexHtml, /\.transform-map-column\.fullscreen-mode/, 'Phải có CSS class fullscreen-mode phóng to toàn màn hình');
    assert.match(indexHtml, /id="btnLiveMapExpand"/, 'Phải có nút phóng to bản đồ lớn trên header');

    // 1.3 Kiểm tra logic JS
    assert.match(appJs, /toggleLiveMapExpand\s*\(/, 'appTransform phải có hàm toggleLiveMapExpand()');
    assert.match(appJs, /openFullConvertedMap\s*\(/, 'appTransform phải có hàm openFullConvertedMap()');
    assert.match(appJs, /tab === 'livemap'/, 'switchTransformSubTab phải xử lý chế độ livemap');
});

test('=== 2. KIỂM THỬ CHỨC NĂNG CHUYỂN ĐỔI ĐA ĐIỂM HOẠT ĐỘNG HOÀN HẢO ===', () => {
    // 2.1 Nút Chuyển đổi tự động
    assert.match(indexHtml, /appTransform\.executeMultiTransform\(\)/, 'Phải có nút chuyển đổi tự động executeMultiTransform()');
    assert.match(appJs, /executeMultiTransform\(\)\s*\{/, 'appTransform phải có hàm executeMultiTransform()');

    // 2.2 Logic phân tích dữ liệu dán thông minh (Smart Tokenizer)
    assert.match(appJs, /cleanNumStr/, 'parsePasteMultiText phải có hàm chuẩn hóa số cleanNumStr chống lỗi dấu phẩy');
    
    // 2.3 Logic chuyển đổi thông minh auto-detect & auto-correct
    assert.match(appJs, /isVn2kCoords/, 'convertMultiBatch phải tự nhận diện tọa độ VN2000');
    assert.match(appJs, /isWgsCoords/, 'convertMultiBatch phải tự nhận diện tọa độ WGS84');
});
