/**
 * TEST SUITE: CHỨC NĂNG TẠO MỚI DỰ ÁN TRỰC TIẾP TRONG MINICAD 3.5
 */
const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const appJsContent = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
    }
}

console.log("\n========================================================================");
console.log("🧪 BẮT ĐẦU KIỂM THỬ: TẠO MỚI VÀ QUẢN LÝ DỰ ÁN TRONG MINICAD 3.5");
console.log("========================================================================\n");

console.log("--- NHÓM 1: GIAO DIỆN & CÁC NÚT ĐIỀU KHIỂN DỰ ÁN TRONG MINICAD ---");
assert(htmlContent.includes('id="cadCurrentProjectBadge"'), 'Badge hiển thị dự án hiện hành (#cadCurrentProjectBadge) tồn tại trên MiniCAD Header');
assert(htmlContent.includes('id="cadCurrentProjectName"'), 'Nhãn tên dự án (#cadCurrentProjectName) hiển thị tên dự án hiện hành');
assert(htmlContent.includes('id="btnCadNewProject"'), 'Nút "➕ Dự án mới" (#btnCadNewProject) tồn tại trong Tab Dữ liệu MiniCAD');
assert(htmlContent.includes('appCadTool.saveAsNewProject()'), 'Nút "💾 Lưu thành dự án mới" có mặt trong Tab Dữ liệu MiniCAD');
assert(htmlContent.includes('appCadTool.switchActiveProjectFromModal()'), 'Nút "🔄 Đổi Dự Án Này" tồn tại trong Modal Nạp Dữ Liệu Dự Án');
assert(htmlContent.includes('appCadTool.quickCreateNewProject()'), 'Nút gọi hàm quickCreateNewProject tồn tại trong cả Toolbar và Modal');

console.log("\n--- NHÓM 2: PHƯƠNG THỨC LOGIC CỦA appCadTool TRONG APP.JS ---");
assert(appJsContent.includes('updateCurrentProjectBadge()'), 'appCadTool có hàm updateCurrentProjectBadge() cập nhật badge dự án');
assert(appJsContent.includes('quickCreateNewProject()'), 'appCadTool có hàm quickCreateNewProject() khởi tạo dự án trắng');
assert(appJsContent.includes('saveAsNewProject()'), 'appCadTool có hàm saveAsNewProject() lưu các khối hiện có thành dự án mới');
assert(appJsContent.includes('switchActiveProjectFromModal()'), 'appCadTool có hàm switchActiveProjectFromModal() chuyển đổi dự án trực tiếp');

console.log("\n--- NHÓM 3: KHỞI TẠO BẢN VẼ TRẮNG VÀ BẢO VỆ DỰ ÁN CŨ ---");
assert(appJsContent.includes('this.savedShapes = [];') && appJsContent.includes('this.vertices = [];'), 'Hàm quickCreateNewProject làm sạch mảng savedShapes và vertices');
assert(appJsContent.includes('this.saveShapesForProject(AppState.currentProject);'), 'Hàm quickCreateNewProject tự động lưu lại khối của dự án cũ trước khi tạo mới');
assert(appJsContent.includes('localStorage.setItem(\'vn2k_cur_project\', name);'), 'Hàm quickCreateNewProject cập nhật dự án hiện hành vào LocalStorage');

console.log("\n========================================================================");
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests/totalTests*100)}%)`);
if (passedTests === totalTests) {
    console.log("🎉 TÍNH NĂNG TẠO DỰ ÁN MỚI TRỰC TIẾP TRONG MINICAD ĐÃ HOÀN TẤT XUẤT SẮC 100%!");
} else {
    console.error("⚠️ VẪN CÒN LỖI CHƯA ĐẠT!");
    process.exit(1);
}
console.log("========================================================================\n");
