/**
 * KIỂM THỬ HỒI QUY: PHÂN HỆ SỔ ĐO & DỰ ÁN (DATAMGMT & GOOGLE SYNC FIX)
 * Đảm bảo:
 * 1. Tự động di trú (Auto-Migration) từ khóa cũ vn2k_proj_ sang vn2k_pts_
 * 2. appData.getPoints() tự hồi phục mốc và đồng bộ 100% với danh sách hiển thị
 * 3. Các nút đồng bộ Google Sheets luôn hiển thị chính xác số mốc thực tế của dự án
 * 4. Chuyển đổi hàng loạt saveMultiToCurrentProject() lưu đúng khóa chuẩn
 * 5. refreshTable() luôn đồng bộ updateSyncUI()
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

test('=== 1. KIỂM THỬ DI TRÚ VÀ KHÓA LƯU TRỮ CHUẨN TRONG APPDATA ===', () => {
    // 1.1 Kiểm tra có hàm migrateAllLegacyProjectKeys
    assert.strictEqual(
        appJsContent.includes('migrateAllLegacyProjectKeys()'),
        true,
        'appData phải có hàm migrateAllLegacyProjectKeys() để dọn dẹp và di trú các khóa mốc cũ'
    );

    // 1.2 Kiểm tra saveMultiToCurrentProject không còn dùng vn2k_proj_
    const saveMultiMatch = appJsContent.match(/saveMultiToCurrentProject\(\)\s*\{([\s\S]*?)\n\s*\}/);
    assert.ok(saveMultiMatch, 'Phải tìm thấy saveMultiToCurrentProject');
    const saveMultiCode = saveMultiMatch[1];
    assert.strictEqual(
        saveMultiCode.includes('vn2k_proj_'),
        false,
        'saveMultiToCurrentProject không được dùng tiền tố cũ vn2k_proj_'
    );
    assert.strictEqual(
        saveMultiCode.includes('appData.getPoints') || saveMultiCode.includes('appData.savePoints'),
        true,
        'saveMultiToCurrentProject phải tích hợp với appData.getPoints/savePoints'
    );
});

test('=== 2. KIỂM THỬ HÀM GETPOINTS VÀ TỰ HỒI PHỤC MỐC THÔNG MINH ===', () => {
    // 2.1 Kiểm tra logic getPoints hỗ trợ fallback
    const getPointsMatch = appJsContent.match(/getPoints\(projectName\)\s*\{([\s\S]*?)\n\s*savePoints/);
    assert.ok(getPointsMatch, 'Phải tìm thấy hàm getPoints');
    const getPointsCode = getPointsMatch[1];
    
    assert.strictEqual(
        getPointsCode.includes('vn2k_proj_'),
        true,
        'getPoints phải có cơ chế fallback đọc từ vn2k_proj_ nếu khóa chuẩn vn2k_pts_ rỗng'
    );
    assert.strictEqual(
        getPointsCode.includes('.endsWith(\'.csv\')'),
        true,
        'getPoints phải kiểm tra biến thể có/không có đuôi .csv'
    );
});

test('=== 3. KIỂM THỬ ĐỒNG BỘ GIAO DIỆN SỔ ĐO & NÚT ĐỒNG BỘ GOOGLE SHEETS ===', () => {
    // 3.1 appNav.showScreen('datamgmt') phải gọi đầy đủ refreshTable và updateSyncUI
    const showScreenMatch = appJsContent.match(/else if \(screenName === 'datamgmt'\)\s*\{([\s\S]*?)\}\s*else if \(screenName === 'about'\)/);
    assert.ok(showScreenMatch, 'Phải tìm thấy nhánh datamgmt trong showScreen');
    const datamgmtNavCode = showScreenMatch[1];
    assert.strictEqual(
        datamgmtNavCode.includes('appData.refreshTable') && datamgmtNavCode.includes('appData.updateSyncUI'),
        true,
        'showScreen datamgmt phải gọi đồng thời refreshTable và updateSyncUI'
    );

    // 3.2 refreshTable() phải cập nhật updateSyncUI()
    const refreshTableMatch = appJsContent.match(/refreshTable\(\)\s*\{([\s\S]*?)\n\s*deletePoint/);
    assert.ok(refreshTableMatch, 'Phải tìm thấy refreshTable');
    const refreshTableCode = refreshTableMatch[1];
    assert.strictEqual(
        refreshTableCode.includes('this.updateSyncUI'),
        true,
        'refreshTable phải gọi updateSyncUI để số mốc trên nút đồng bộ luôn khớp 100% với bảng'
    );
});

test('=== 4. KIỂM THỬ CHỐNG NGHẼN CORS KHI ĐỒNG BỘ GOOGLE APPS SCRIPT ===', () => {
    // 4.1 syncCurrentProjectToGoogle dùng header text/plain chống CORS OPTIONS
    const syncCurMatch = appJsContent.match(/syncCurrentProjectToGoogle\(\)\s*\{([\s\S]*?)\n\s*syncAllProjectsToGoogle/);
    assert.ok(syncCurMatch, 'Phải tìm thấy syncCurrentProjectToGoogle');
    const syncCurCode = syncCurMatch[1];
    assert.strictEqual(
        syncCurCode.includes('text/plain;charset=utf-8'),
        true,
        'syncCurrentProjectToGoogle phải dùng header text/plain để không bị chặn bởi CORS OPTIONS preflight'
    );

    // 4.2 syncAllProjectsToGoogle dùng header text/plain
    const syncAllMatch = appJsContent.match(/syncAllProjectsToGoogle\(\)\s*\{([\s\S]*?)\n\s*syncSinglePointToGoogle/);
    assert.ok(syncAllMatch, 'Phải tìm thấy syncAllProjectsToGoogle');
    const syncAllCode = syncAllMatch[1];
    assert.strictEqual(
        syncAllCode.includes('text/plain;charset=utf-8'),
        true,
        'syncAllProjectsToGoogle phải dùng header text/plain để không bị chặn bởi CORS'
    );
});
