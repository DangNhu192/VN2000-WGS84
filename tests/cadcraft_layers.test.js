/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: NÂNG CẤP MINICAD THEO CADCRAFT
 * 1. Layer Manager: ẩn/hiện 💡, khóa 🔒, đổi màu theo lớp
 * Chạy với: node tests/cadcraft_layers.test.js
 */

const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: MINICAD LAYER MANAGER (CADCRAFT-STYLE LAYERS PANEL)');
console.log('========================================================================\n');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// --- NHÓM 1: UI PANEL LỚP ---
console.log('--- NHÓM 1: GIAO DIỆN LAYER MANAGER TRONG TAB LỚP ---');
{
    assert(indexHtml.includes('id="cadLayerManagerList"'), 'Có danh sách lớp (#cadLayerManagerList) trong tab Lớp');
    assert(indexHtml.includes('id="cadLayerManagerSummary"'), 'Có nhãn tóm tắt số lớp hiện/khóa (#cadLayerManagerSummary)');
    assert(indexHtml.includes('id="cadLayerManagerToolbar"'), 'Có thanh công cụ lớp (#cadLayerManagerToolbar)');
    assert(indexHtml.includes('appCadTool.showAllLayers()'), 'Nút "Hiện tất cả" gọi showAllLayers()');
    assert(indexHtml.includes('appCadTool.unlockAllLayers()'), 'Nút "Mở khóa hết" gọi unlockAllLayers()');
    assert(indexHtml.includes('appCadTool.hideAllExceptSelectedLayer()'), 'Nút "Chỉ 1 lớp" gọi hideAllExceptSelectedLayer()');
}

// --- NHÓM 2: LOGIC ẨN / KHÓA / MÀU ---
console.log('\n--- NHÓM 2: LOGIC ẨN 💡, KHÓA 🔒, ĐỔI MÀU LỚP ---');
{
    assert(/toggleShapeHidden\(idx\)/.test(appJs), 'Có hàm toggleShapeHidden(idx)');
    assert(/toggleShapeLocked\(idx\)/.test(appJs), 'Có hàm toggleShapeLocked(idx)');
    assert(/setShapeColor\(idx,\s*color\)/.test(appJs), 'Có hàm setShapeColor(idx, color)');
    assert(/resetShapeColorToPalette\(idx\)/.test(appJs), 'Có hàm resetShapeColorToPalette(idx)');
    assert(/isShapeLocked\(shape\)\s*\{[\s\S]{0,80}locked\s*===\s*true/.test(appJs), 'Hàm isShapeLocked kiểm tra cờ locked === true');
    assert(/shape\.hidden\s*===\s*true\)\s*return/.test(appJs), 'renderGeometry bỏ qua lớp có hidden === true');
    assert(/if \(this\.isShapeLocked\(s\)\)[\s\S]{0,160}continueShape|continueShape\(index\)[\s\S]{0,400}isShapeLocked/.test(appJs), 'continueShape bị chặn khi lớp đang khóa');
    assert(/deleteShape\(index[\s\S]{0,500}isShapeLocked/.test(appJs), 'deleteShape bị chặn khi lớp đang khóa');
    assert(appJs.includes("!/^#[0-9a-f]{6}$/i.test(String(color))"), 'setShapeColor chỉ nhận mã màu hex hợp lệ');
    assert(/renderLayerManager\(\)/.test(appJs), 'Có hàm renderLayerManager và được gọi khi trạng thái đổi');
    assert(/persistSession\(\)\s*\{[\s\S]{0,120}renderLayerManager/.test(appJs), 'Layer Manager được đồng bộ mỗi lần lưu phiên');
}

// --- NHÓM 3: BẢO TOÀN SỐ LIỆU (ẨN ≠ MẤT KHỎI EXPORT) ---
console.log('\n--- NHÓM 3: LỚP ẨN VẪN GIỮ TRONG SỐ LIỆU XUẤT ---');
{
    const getAll = appJs.match(/_getAllExportShapes\(\)\s*\{[\s\S]{0,3000}?\n    \},/);
    assert(!!getAll, 'Tìm thấy hàm _getAllExportShapes');
    if (getAll) {
        assert(!/hidden/.test(getAll[0]), '_getAllExportShapes KHÔNG loại trừ lớp hidden (ẩn chỉ là hiển thị)');
        assert(/selected:\s*s\.selected\s*!==\s*false/.test(getAll[0]), 'Cột xuất vẫn theo cờ selected (tích chọn khối)');
    }
    assert(/renderLayerManager\(\)[\s\S]{0,2000}?s\.hidden === true/.test(appJs), 'Bảng Layer Manager phân biệt trạng thái ẩn để làm mờ dòng');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 MINICAD LAYER MANAGER (ẨN/HIỆN • KHÓA • MÀU) HOÀN TOÀN ĐẠT CHUẨN!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
