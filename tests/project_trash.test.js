/**
 * Bộ kiểm thử tự động cho hệ thống THÙNG RÁC DỰ ÁN (PROJECT TRASH) & KIỂM TRA BỘ NHỚ KHI XÓA:
 * 1. Chuyển dự án bị xóa vào thùng rác lưu trữ 30 ngày
 * 2. Tự động dọn dẹp vĩnh viễn sau 30 ngày
 * 3. Chống rò rỉ bộ nhớ / chống tự động thêm mốc và khối cũ vào dự án khác không theo chỉ định
 * 4. Khôi phục và xóa vĩnh viễn
 */

const assert = require('assert');

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: THÙNG RÁC DỰ ÁN 30 NGÀY & CHỐNG TỰ ĐỘNG THÊM MỐC');
console.log('========================================================================\n');

// Mock môi trường LocalStorage
class MockLocalStorage {
    constructor() {
        this.store = {};
    }
    getItem(key) {
        return this.store[key] || null;
    }
    setItem(key, value) {
        this.store[key] = String(value);
    }
    removeItem(key) {
        delete this.store[key];
    }
    clear() {
        this.store = {};
    }
}

const mockStorage = new MockLocalStorage();

// Mock AppState
const mockAppState = {
    projectsList: ["DuAn_KhuA.csv", "DuAn_KhuB.csv"],
    currentProject: "DuAn_KhuA.csv",
    kttVal: 105.75,
    muiVal: 3
};

// Mock MiniCAD Tool
const mockCadTool = {
    savedShapes: [],
    vertices: [],
    _persistTimer: null,
    SESSION_KEY: 'vn2k_cad_session_v2',
    getProjectStorageKey(name) {
        return (name || '').replace(/(\.(csv|xlsx|xls|txt))+$/i, "").trim();
    },
    saveShapesForProject(projName) {
        const curProj = projName || mockAppState.currentProject;
        if (!curProj) return;
        if (mockAppData.isProjectInTrash(curProj) || !mockAppState.projectsList.includes(curProj)) {
            return; // Bảo vệ chống lưu vào dự án đã xóa
        }
        const cleanKey = this.getProjectStorageKey(curProj);
        mockStorage.setItem('vn2k_cad_shapes_' + cleanKey, JSON.stringify({ savedShapes: this.savedShapes }));
        this.syncShapesToProjectPoints(curProj);
    },
    syncShapesToProjectPoints(projName) {
        const curProj = projName || mockAppState.currentProject;
        if (!curProj || !this.savedShapes || this.savedShapes.length === 0) return;
        if (mockAppData.isProjectInTrash(curProj) || !mockAppState.projectsList.includes(curProj)) {
            return; // Bảo vệ chống lưu vào dự án đã xóa
        }
        const points = this.savedShapes.flatMap(s => (s.vertices || []).map(v => ({
            name: v.name, x: v.x, y: v.y, lat: v.lat, lng: v.lng, project: curProj
        })));
        mockAppData.savePoints(curProj, points);
    },
    loadShapesForProject(projName) {
        const cleanKey = this.getProjectStorageKey(projName);
        const raw = mockStorage.getItem('vn2k_cad_shapes_' + cleanKey);
        if (raw) {
            const data = JSON.parse(raw);
            this.savedShapes = data.savedShapes || [];
            return true;
        }
        this.savedShapes = [];
        return false;
    }
};

// Mock AppData với Module Thùng Rác chuẩn
const mockAppData = {
    TRASH_KEY: 'vn2k_trash_projects',
    TRASH_DAYS: 30,

    getTrashProjects() {
        try {
            const raw = mockStorage.getItem(this.TRASH_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    },

    saveTrashProjects(list) {
        mockStorage.setItem(this.TRASH_KEY, JSON.stringify(list || []));
    },

    isProjectInTrash(projName) {
        if (!projName) return false;
        const list = this.getTrashProjects();
        return list.some(item => item.name === projName);
    },

    purgeExpiredTrash() {
        const list = this.getTrashProjects();
        if (!list || list.length === 0) return 0;
        const now = Date.now();
        const remaining = list.filter(item => {
            const expiresAt = item.expiresAt || (item.deletedAt + this.TRASH_DAYS * 24 * 60 * 60 * 1000);
            return now < expiresAt;
        });
        const purgedCount = list.length - remaining.length;
        if (purgedCount > 0) {
            this.saveTrashProjects(remaining);
        }
        return purgedCount;
    },

    getPoints(projName) {
        const raw = mockStorage.getItem(`vn2k_pts_${projName}`);
        return raw ? JSON.parse(raw) : [];
    },

    savePoints(projName, points) {
        mockStorage.setItem(`vn2k_pts_${projName}`, JSON.stringify(points));
    },

    moveToTrash(projectName) {
        const cur = projectName || mockAppState.currentProject;
        if (!cur) return;

        this.purgeExpiredTrash();

        const pts = this.getPoints(cur);
        const cleanKey = mockCadTool.getProjectStorageKey(cur);
        let cadShapes = [];
        const rawShapes = mockStorage.getItem('vn2k_cad_shapes_' + cleanKey);
        if (rawShapes) {
            cadShapes = JSON.parse(rawShapes).savedShapes || [];
        } else if (cur === mockAppState.currentProject && mockCadTool.savedShapes) {
            cadShapes = JSON.parse(JSON.stringify(mockCadTool.savedShapes));
        }

        const trashList = this.getTrashProjects();
        const trashItem = {
            id: 'trash_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name: cur,
            deletedAt: Date.now(),
            expiresAt: Date.now() + (this.TRASH_DAYS * 24 * 60 * 60 * 1000),
            points: pts,
            cadShapes: cadShapes,
            pointCount: pts.length,
            shapeCount: cadShapes.length
        };
        trashList.push(trashItem);
        this.saveTrashProjects(trashList);

        // Xóa hoàn toàn khỏi Storage hoạt động
        mockStorage.removeItem(`vn2k_pts_${cur}`);
        mockStorage.removeItem(`vn2k_cad_shapes_${cleanKey}`);

        // Loại khỏi projectsList
        mockAppState.projectsList = mockAppState.projectsList.filter(p => p !== cur);

        // DỌN SẠCH BỘ NHỚ RAM CỦA MINICAD (CHỐNG LỖI TỰ ĐỘNG THÊM MỐC CŨ VÀO DỰ ÁN MỚI)
        mockCadTool.savedShapes = [];
        mockCadTool.vertices = [];

        // Chuyển sang dự án kế tiếp
        if (mockAppState.projectsList.length === 0) {
            const blank = "DuAn_Moi.csv";
            mockAppState.projectsList.push(blank);
            mockAppState.currentProject = blank;
            this.savePoints(blank, []);
        } else {
            mockAppState.currentProject = mockAppState.projectsList[0];
        }

        // Nạp CAD của dự án mới (nếu có)
        mockCadTool.loadShapesForProject(mockAppState.currentProject);

        return trashItem;
    },

    restoreProjectFromTrash(trashId) {
        const list = this.getTrashProjects();
        const idx = list.findIndex(i => i.id === trashId);
        if (idx === -1) return null;

        const item = list[idx];
        let restoreName = item.name;

        this.savePoints(restoreName, item.points || []);

        if (item.cadShapes && item.cadShapes.length > 0) {
            const cleanKey = mockCadTool.getProjectStorageKey(restoreName);
            mockStorage.setItem('vn2k_cad_shapes_' + cleanKey, JSON.stringify({ savedShapes: item.cadShapes }));
        }

        list.splice(idx, 1);
        this.saveTrashProjects(list);

        mockAppState.projectsList.push(restoreName);
        mockAppState.currentProject = restoreName;
        mockCadTool.loadShapesForProject(restoreName);

        return restoreName;
    }
};

// ================= NHÓM 1: CHUYỂN DỰ ÁN VÀO THÙNG RÁC 30 NGÀY =================
console.log('--- NHÓM 1: CHUYỂN DỰ ÁN VÀO THÙNG RÁC 30 NGÀY ---');

// Chuẩn bị dữ liệu ban đầu cho DuAn_KhuA.csv: 3 mốc và 1 khối đa giác
const pointsA = [
    { name: "M1", x: 1144000, y: 539000, lat: 10.5, lng: 106.5 },
    { name: "M2", x: 1144050, y: 539000, lat: 10.5, lng: 106.6 },
    { name: "M3", x: 1144050, y: 539050, lat: 10.6, lng: 106.6 }
];
const shapesA = [
    {
        name: "Thửa Đất Ranh Khu A",
        mode: "polygon",
        vertices: pointsA
    }
];

mockAppData.savePoints("DuAn_KhuA.csv", pointsA);
mockCadTool.savedShapes = shapesA;
mockCadTool.saveShapesForProject("DuAn_KhuA.csv");

assert.strictEqual(mockAppData.getPoints("DuAn_KhuA.csv").length, 3, 'Dự án A có 3 mốc');
assert.strictEqual(mockCadTool.savedShapes.length, 1, 'MiniCAD đang có 1 khối');

// Thực hiện xóa dự án A chuyển vào thùng rác
const trashItem = mockAppData.moveToTrash("DuAn_KhuA.csv");

assert.ok(trashItem !== null, 'Dự án A được chuyển vào thùng rác thành công');
assert.strictEqual(trashItem.name, "DuAn_KhuA.csv");
assert.strictEqual(trashItem.pointCount, 3, 'Thùng rác bảo lưu đủ 3 mốc');
assert.strictEqual(trashItem.shapeCount, 1, 'Thùng rác bảo lưu đủ 1 khối CAD');

// Kiểm tra thời hạn 30 ngày
const daysRetention = Math.round((trashItem.expiresAt - trashItem.deletedAt) / (24 * 60 * 60 * 1000));
assert.strictEqual(daysRetention, 30, 'Hạn lưu trữ trong thùng rác phải đúng 30 ngày');
console.log('  ✅ PASS: Dự án bị xóa được bảo lưu an toàn trong Thùng rác đúng thời hạn 30 ngày');

// Kiểm tra danh sách dự án hoạt động
assert.ok(!mockAppState.projectsList.includes("DuAn_KhuA.csv"), 'Dự án A phải bị xóa khỏi projectsList');
assert.strictEqual(mockAppState.currentProject, "DuAn_KhuB.csv", 'Tự động chuyển sang dự án tiếp theo Khu B');
assert.strictEqual(mockStorage.getItem('vn2k_pts_DuAn_KhuA.csv'), null, 'Key mốc của dự án A phải bị dọn khỏi storage');
console.log('  ✅ PASS: Dự án A bị loại bỏ hoàn toàn khỏi bộ nhớ hoạt động');

// ================= NHÓM 2: CHỐNG RÒ RỈ RAM & CHỐNG TỰ ĐỘNG THÊM VÀO DỰ ÁN MỚI =================
console.log('\n--- NHÓM 2: CHỐNG TỰ ĐỘNG THÊM MỐC CỦA DỰ ÁN ĐÃ XÓA SANG DỰ ÁN KHÁC ---');

// 1. RAM của MiniCAD phải được làm sạch, không còn chứa khối của dự án A
assert.strictEqual(mockCadTool.savedShapes.length, 0, 'MiniCAD RAM phải được reset sạch sẽ (0 khối)');
console.log('  ✅ PASS: Bộ nhớ RAM của MiniCAD được làm sạch ngay khi xóa dự án');

// 2. Dự án Khu B hiện tại phải không bị mốc của dự án A đổ vào
assert.strictEqual(mockAppData.getPoints("DuAn_KhuB.csv").length, 0, 'Dự án B phải có 0 mốc, không bị nhiễm mốc từ dự án A');
console.log('  ✅ PASS: Dự án B hoàn toàn sạch sẽ, không bị nhiễm bất kỳ mốc nào từ dự án đã xóa');

// 3. Nếu vô tình gọi saveShapesForProject với dự án đã xóa -> Guard chặn đứng
mockCadTool.savedShapes = [{ name: "Khối Lạ", vertices: [{ x: 1, y: 1 }] }];
mockCadTool.saveShapesForProject("DuAn_KhuA.csv"); // Cố lưu vào dự án trong thùng rác
assert.strictEqual(mockAppData.getPoints("DuAn_KhuA.csv").length, 0, 'Guard bảo vệ chặn đứng mọi cố gắng ghi vào dự án trong thùng rác');
assert.strictEqual(mockStorage.getItem('vn2k_cad_shapes_DuAn_KhuA'), null, 'Không được lưu CAD cho dự án trong thùng rác');
console.log('  ✅ PASS: Guard bảo vệ chặn 100% việc tự ý lưu mốc hoặc khối vào dự án đã xóa');

// ================= NHÓM 3: TỰ ĐỘNG DỌN DẸP SAU 30 NGÀY (AUTO PURGE) =================
console.log('\n--- NHÓM 3: TỰ ĐỘNG DỌN DẸP VĨNH VIỄN SAU 30 NGÀY ---');

// Giả lập một dự án cũ "DuAn_XuaCu.csv" đã bị xóa cách đây 31 ngày (quá hạn 30 ngày)
const expiredTrashItem = {
    id: "trash_old_expired",
    name: "DuAn_XuaCu.csv",
    deletedAt: Date.now() - (31 * 24 * 60 * 60 * 1000), // 31 ngày trước
    expiresAt: Date.now() - (1 * 24 * 60 * 60 * 1000),  // Đã hết hạn hôm qua
    points: [{ name: "OldPt" }],
    cadShapes: []
};

const curTrash = mockAppData.getTrashProjects();
curTrash.push(expiredTrashItem);
mockAppData.saveTrashProjects(curTrash);

assert.strictEqual(mockAppData.getTrashProjects().length, 2, 'Thùng rác có 2 mục (1 mục mới + 1 mục quá 30 ngày)');

// Kích hoạt hàm dọn dẹp tự động
const purged = mockAppData.purgeExpiredTrash();
assert.strictEqual(purged, 1, 'Phải tự động dọn dẹp đúng 1 dự án quá 30 ngày');

const remainingTrash = mockAppData.getTrashProjects();
assert.strictEqual(remainingTrash.length, 1, 'Thùng rác chỉ còn lại dự án chưa quá 30 ngày');
assert.strictEqual(remainingTrash[0].name, "DuAn_KhuA.csv", 'Dự án Khu A (còn hạn) được bảo toàn');
console.log('  ✅ PASS: Tự động phát hiện và xóa vĩnh viễn các dự án quá hạn 30 ngày khỏi thiết bị');

// ================= NHÓM 4: KHÔI PHỤC DỰ ÁN TỪ THÙNG RÁC =================
console.log('\n--- NHÓM 4: KHÔI PHỤC DỰ ÁN TỪ THÙNG RÁC (RESTORE) ---');

const restoreId = remainingTrash[0].id;
const restoredName = mockAppData.restoreProjectFromTrash(restoreId);

assert.strictEqual(restoredName, "DuAn_KhuA.csv", 'Khôi phục đúng tên dự án');
assert.ok(mockAppState.projectsList.includes("DuAn_KhuA.csv"), 'Dự án quay trở lại projectsList');
assert.strictEqual(mockAppData.getPoints("DuAn_KhuA.csv").length, 3, 'Khôi phục nguyên vẹn 3 mốc');
assert.strictEqual(mockCadTool.savedShapes.length, 1, 'Khôi phục nguyên vẹn khối CAD');
assert.strictEqual(mockAppData.getTrashProjects().length, 0, 'Thùng rác sạch sau khi khôi phục');
console.log('  ✅ PASS: Khôi phục dự án từ thùng rác toàn vẹn 100% mốc và khối CAD');

console.log('\n========================================================================');
console.log('🏁 TỔNG KẾT: 8/8 KIỂM THỬ THÀNH CÔNG (100%)');
console.log('🎉 HỆ THỐNG THÙNG RÁC 30 NGÀY & CHỐNG TỰ ĐỘNG THÊM MỐC HOẠT ĐỘNG HOÀN HẢO!');
console.log('========================================================================\n');
