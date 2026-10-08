const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: PHÂN HỆ CHUYỂN ĐỔI TỌA ĐỘ ĐA ĐIỂM (MULTI-POINT)');
console.log('========================================================================');

const appJsPath = path.join(__dirname, '..', 'app.js');
const indexHtmlPath = path.join(__dirname, '..', 'index.html');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  ✅ PASS: ${name}`);
    } catch (e) {
        console.error(`  ❌ FAIL: ${name} -> ${e.message}`);
    }
}

// 1. Kiểm tra tồn tại các nút và hàm nạp đa điểm trong HTML & JS
console.log('\n--- NHÓM 1: GIAO DIỆN & NÚT NẠP TỌA ĐỘ ĐA ĐIỂM ---');
test('Nút Lấy từ Bản đồ (loadMultiFromPickedMap) tồn tại trong HTML & JS', () => {
    assert(indexHtml.includes('appTransform.loadMultiFromPickedMap()'), 'HTML có nút loadMultiFromPickedMap()');
    assert(appJs.includes('loadMultiFromPickedMap()'), 'app.js có định nghĩa hàm loadMultiFromPickedMap()');
});

test('Nút Chấm trên Bản đồ (openPickMultiOnMap) tồn tại trong HTML & JS', () => {
    assert(indexHtml.includes('appTransform.openPickMultiOnMap()'), 'HTML có nút openPickMultiOnMap()');
    assert(appJs.includes('openPickMultiOnMap()'), 'app.js có định nghĩa hàm openPickMultiOnMap()');
});

test('Nút Lấy từ Dự án (loadMultiFromCurrentProject) tồn tại trong HTML & JS', () => {
    assert(indexHtml.includes('appTransform.loadMultiFromCurrentProject()'), 'HTML có nút loadMultiFromCurrentProject()');
    assert(appJs.includes('loadMultiFromCurrentProject()'), 'app.js có định nghĩa hàm loadMultiFromCurrentProject()');
});

test('Nút Dán text nhanh (togglePasteMultiModal, parsePasteMultiText) tồn tại', () => {
    assert(indexHtml.includes('appTransform.togglePasteMultiModal('), 'HTML có nút togglePasteMultiModal()');
    assert(indexHtml.includes('appTransform.parsePasteMultiText()'), 'HTML có nút parsePasteMultiText()');
    assert(appJs.includes('togglePasteMultiModal('), 'app.js có hàm togglePasteMultiModal()');
    assert(appJs.includes('parsePasteMultiText()'), 'app.js có hàm parsePasteMultiText()');
});

test('Nút Xóa hết (clearMultiInputPoints) tồn tại', () => {
    assert(indexHtml.includes('appTransform.clearMultiInputPoints()'), 'HTML có nút clearMultiInputPoints()');
    assert(appJs.includes('clearMultiInputPoints()'), 'app.js có hàm clearMultiInputPoints()');
});

// 2. Kiểm tra các hàm chuyển đổi hàng loạt & xử lý kết quả
console.log('\n--- NHÓM 2: HÀM CHUYỂN ĐỔI HÀNG LOẠT & XỬ LÝ KẾT QUẢ ---');
test('Hàm chuyển đổi hàng loạt convertMultiBatch tồn tại trong HTML & JS', () => {
    assert(indexHtml.includes("appTransform.convertMultiBatch('wgs2vn2k')"), 'HTML có nút chuyển WGS->VN2K');
    assert(indexHtml.includes("appTransform.convertMultiBatch('vn2k2wgs')"), 'HTML có nút chuyển VN2K->WGS');
    assert(appJs.includes('convertMultiBatch('), 'app.js có định nghĩa hàm convertMultiBatch()');
});

test('Các hàm sao chép kết quả chuyển đổi đa điểm tồn tại', () => {
    assert(indexHtml.includes('appTransform.copyMultiResultsAll()'), 'HTML có nút copyMultiResultsAll()');
    assert(indexHtml.includes('appTransform.copyMultiResultsVn2k()'), 'HTML có nút copyMultiResultsVn2k()');
    assert(indexHtml.includes('appTransform.copyMultiResultsWgs()'), 'HTML có nút copyMultiResultsWgs()');
    assert(indexHtml.includes('appTransform.exportMultiResultCsv()'), 'HTML có nút exportMultiResultCsv()');
    assert(appJs.includes('copyMultiResultsAll()'), 'app.js có hàm copyMultiResultsAll()');
    assert(appJs.includes('copyMultiResultsVn2k()'), 'app.js có hàm copyMultiResultsVn2k()');
    assert(appJs.includes('copyMultiResultsWgs()'), 'app.js có hàm copyMultiResultsWgs()');
    assert(appJs.includes('exportMultiResultCsv()'), 'app.js có hàm exportMultiResultCsv()');
});

test('Hàm xem trên bản đồ & lưu vào dự án tồn tại', () => {
    assert(indexHtml.includes('appTransform.viewMultiConvertedOnMap()'), 'HTML có nút viewMultiConvertedOnMap()');
    assert(indexHtml.includes('appTransform.saveMultiResultToChosenProject()'), 'HTML có nút saveMultiResultToChosenProject()');
    assert(appJs.includes('viewMultiConvertedOnMap()'), 'app.js có hàm viewMultiConvertedOnMap()');
    assert(appJs.includes('saveMultiResultToChosenProject('), 'app.js có hàm saveMultiResultToChosenProject()');
});

// 3. Kiểm tra tính tương thích ngược với các test cũ
console.log('\n--- NHÓM 3: TƯƠNG THÍCH NGƯỢC ---');
test('Bảo toàn các hàm tương thích executeMultiTransform() & copyAllMultiResults()', () => {
    assert(appJs.includes('executeMultiTransform()'), 'app.js vẫn có executeMultiTransform()');
    assert(appJs.includes('copyAllMultiResults()'), 'app.js vẫn có copyAllMultiResults()');
    assert(appJs.includes('switchTransformSubTab('), 'app.js vẫn có switchTransformSubTab()');
});

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('========================================================================');

if (passedTests !== totalTests) {
    process.exit(1);
}
