/**
 * DataStoreEngine - Bộ Động Cơ Quản Lý Dữ Liệu Bền Vững & Thùng Rác 30 Ngày
 * Chuẩn Spec-Driven Development (Bộ Nhớ Spec-Kit)
 * Độc lập với giao diện, hỗ trợ Mock Storage cho kiểm thử
 */

const DataStoreEngine = {
    TRASH_RETENTION_DAYS: 30,

    // Lọc và dọn dẹp các dự án trong thùng rác đã quá hạn 30 ngày
    filterExpiredTrash(trashList, currentDate = new Date()) {
        const retentionMs = this.TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const nowMs = currentDate.getTime();

        return trashList.filter(item => {
            const deletedTime = new Date(item.deletedAt).getTime();
            return (nowMs - deletedTime) < retentionMs;
        });
    },

    // Kiểm tra tính hợp lệ của mốc tọa độ
    validatePoint(pt) {
        if (!pt || typeof pt !== 'object') return false;
        const hasValidName = typeof pt.name === 'string' && pt.name.trim().length > 0;
        const hasValidX = typeof pt.x === 'number' && !isNaN(pt.x);
        const hasValidY = typeof pt.y === 'number' && !isNaN(pt.y);
        return hasValidName && hasValidX && hasValidY;
    },

    // Tạo bản ghi dự án mới với siêu dữ liệu
    createProjectRecord(name, options = {}) {
        return {
            name: name.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pointsCount: 0,
            shapesCount: 0,
            province: options.province || 'TP. Hồ Chí Minh',
            kttDeg: options.kttDeg || 105,
            kttMin: options.kttMin || 45,
            muiVal: options.muiVal || 3
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStoreEngine;
} else if (typeof window !== 'undefined') {
    window.DataStoreEngine = DataStoreEngine;
}
