const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const appJsContent = fs.readFileSync(path.join(ROOT_DIR, 'app.js'), 'utf8');

test('=== 1. KIỂM THỬ CHUYỂN ĐỔI TỌA ĐỘ 2 CHIỀU (WGS84 ➔ VN2000 & VN2000 ➔ WGS84) ===', () => {
    // 1.1 Giao diện Bottom Sheet có 2 nút chuyển đổi 2 chiều riêng biệt
    assert.ok(htmlContent.includes("appTransformMap.executeSingleConvert('wgs2vn2k')"), 
        'Bottom Sheet phải có nút bấm chuyển đổi chiều WGS84 ➔ VN2000');
    assert.ok(htmlContent.includes("appTransformMap.executeSingleConvert('vn2k2wgs')"), 
        'Bottom Sheet phải có nút bấm chuyển đổi chiều VN2000 ➔ WGS84');

    // 1.2 Form chính có 2 nút chuyển đổi 2 chiều
    assert.ok(htmlContent.includes("appTransform.wgsToVn2000()"), 
        'Form chính phải có nút wgsToVn2000()');
    assert.ok(htmlContent.includes("appTransform.vn2000ToWgs()"), 
        'Form chính phải có nút vn2000ToWgs()');

    // 1.3 Logic chuyển đổi 2 chiều trong executeSingleConvert
    assert.ok(appJsContent.includes("actualDirection === 'wgs2vn2k'"), 
        'executeSingleConvert phải có nhánh xử lý WGS ➔ VN2K');
    assert.ok(appJsContent.includes("convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor)"), 
        'executeSingleConvert phải gọi convertVn2kToWgs khi chuyển VN2K ➔ WGS');
    assert.ok(appJsContent.includes("convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor)"), 
        'executeSingleConvert phải gọi convertWgsToVn2k khi chuyển WGS ➔ VN2K');

    // 1.4 Hỗ trợ chuyển đổi 2 chiều cho Đa điểm
    assert.ok(htmlContent.includes("appTransformMap.executeMultiConvert('wgs2vn2k')"), 
        'Đa điểm trên Bottom sheet có nút chuyển WGS ➔ VN2K');
    assert.ok(htmlContent.includes("appTransformMap.executeMultiConvert('vn2k2wgs')"), 
        'Đa điểm trên Bottom sheet có nút chuyển VN2K ➔ WGS');
});

test('=== 2. KIỂM THỬ TÁCH BẠCH LỚP ĐƠN ĐIỂM VÀ ĐA ĐIỂM (KHÔNG HIỂN THỊ CÙNG LÚC) ===', () => {
    // 2.1 Định nghĩa các LayerGroup riêng biệt cho đơn điểm và đa điểm
    assert.ok(appJsContent.includes('singleMarkersLayer: null'), 
        'appTransformMap phải có singleMarkersLayer riêng');
    assert.ok(appJsContent.includes('multiMarkersLayer: null'), 
        'appTransformMap phải có multiMarkersLayer riêng');
    assert.ok(appJsContent.includes('singleConvertedLayer: null'), 
        'appTransformMap phải có singleConvertedLayer riêng');
    assert.ok(appJsContent.includes('multiConvertedLayer: null'), 
        'appTransformMap phải có multiConvertedLayer riêng');

    // 2.2 Hàm updateActiveLayers thực hiện ẩn/hiện loại trừ
    assert.ok(appJsContent.includes('updateActiveLayers()'), 
        'appTransformMap phải có hàm updateActiveLayers()');
    assert.ok(appJsContent.includes('this.map.removeLayer(this.singleMarkersLayer)'), 
        'Khi ở chế độ đa điểm, phải gỡ bỏ singleMarkersLayer khỏi map');
    assert.ok(appJsContent.includes('this.map.removeLayer(this.multiMarkersLayer)'), 
        'Khi ở chế độ đơn điểm, phải gỡ bỏ multiMarkersLayer khỏi map');

    // 2.3 Trong appCoordPicker trên bản đồ chính
    assert.ok(appJsContent.includes('AppState.leafletMap.removeLayer(this.multiMarkersGroup)'), 
        'appCoordPicker ở chế độ single phải gỡ bỏ multiMarkersGroup khỏi bản đồ chính');
    assert.ok(appJsContent.includes('AppState.leafletMap.removeLayer(AppState.pickerMarker)'), 
        'appCoordPicker ở chế độ multi phải gỡ bỏ pickerMarker khỏi bản đồ chính');
});

test('=== 3. KIỂM THỬ CHỨC NĂNG XÓA ĐIỂM ĐƠN ĐIỂM TRIỆT ĐỂ TRÊN BẢN ĐỒ ===', () => {
    // 3.1 appTransformMap có clearSinglePoint() xóa sạch cả input và layer marker
    assert.ok(appJsContent.includes('clearSinglePoint()'), 
        'appTransformMap phải có hàm clearSinglePoint()');
    assert.ok(appJsContent.includes('this.singleMarkersLayer.clearLayers()'), 
        'clearSinglePoint phải xóa sạch layer singleMarkersLayer');
    assert.ok(appJsContent.includes('this.singleConvertedLayer.clearLayers()'), 
        'clearSinglePoint phải xóa sạch layer singleConvertedLayer');
    assert.ok(appJsContent.includes('this.pickedSinglePoint = null;'), 
        'clearSinglePoint phải reset pickedSinglePoint về null');
    assert.ok(appJsContent.includes('this.viewSinglePoint = null;'), 
        'clearSinglePoint phải reset viewSinglePoint về null');

    // 3.2 appCoordPicker có clearSinglePoint()
    assert.ok(appJsContent.includes('clearSinglePoint()') && appJsContent.includes('AppState.pickerMarker = null;'), 
        'appCoordPicker phải xóa pickerMarker khỏi bản đồ khi xóa điểm');

    // 3.3 Form chính gọi checkAndClearSingleResult
    assert.ok(appJsContent.includes('checkAndClearSingleResult()'), 
        'appTransform có cơ chế tự động dọn sạch kết quả và marker khi ô nhập trắng');
});

test('=== 4. KIỂM THỬ BẢNG KẾT QUẢ CÓ THỂ SAO CHÉP ĐƯỢC CỦA ĐƠN ĐIỂM VÀ ĐA ĐIỂM ===', () => {
    // 4.1 Bảng kết quả đơn điểm
    assert.ok(htmlContent.includes('id="sheetResultBox"'), 'Phải có id="sheetResultBox"');
    assert.ok(htmlContent.includes('id="sheetResultVn2k"'), 'Phải có kết quả VN-2000 dạng text selectable');
    assert.ok(htmlContent.includes('id="sheetResultWgs"'), 'Phải có kết quả WGS-84 dạng text selectable');
    assert.ok(htmlContent.includes('appTransformMap.copyVn2kResult()'), 'Có nút sao chép riêng cho VN-2000');
    assert.ok(htmlContent.includes('appTransformMap.copyWgsResult()'), 'Có nút sao chép riêng cho WGS-84');
    assert.ok(htmlContent.includes('appTransformMap.smartCopyResult()'), 'Có nút sao chép tất cả');
    assert.ok(htmlContent.includes('appTransformMap.copyExcelFormatResult()'), 'Có nút sao chép dạng Tab Excel');

    // 4.2 Bảng kết quả đa điểm
    assert.ok(htmlContent.includes('id="sheetMultiResultBox"'), 'Phải có id="sheetMultiResultBox" cho đa điểm');
    assert.ok(htmlContent.includes('id="tbodySheetMultiResult"'), 'Phải có tbody kết quả đa điểm');
    assert.ok(htmlContent.includes('appTransformMap.copyMultiResultsAll()'), 'Có nút sao chép toàn bộ đa điểm');
    assert.ok(htmlContent.includes('appTransformMap.copyMultiResultsVn2k()'), 'Có nút sao chép chỉ VN2K đa điểm');
    assert.ok(htmlContent.includes('appTransformMap.copyMultiResultsWgs()'), 'Có nút sao chép chỉ WGS đa điểm');

    // 4.3 Form chính có bảng kết quả đa điểm và đơn điểm
    assert.ok(htmlContent.includes('id="boxConvertedResult"'), 'Form chính có boxConvertedResult');
    assert.ok(htmlContent.includes('id="boxMultiTransResult"'), 'Form chính có boxMultiTransResult');
    assert.ok(htmlContent.includes('appTransform.copyMultiResultsAll()'), 'Form chính có copyMultiResultsAll()');
});
