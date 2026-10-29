/**
 * BỘ KIỂM THỬ TỰ ĐỘNG: NÂNG CẤP ORTHO / POLAR TRACKING / DYNAMIC INPUT CHO MINICAD
 * (đối chiếu năng lực precise drafting của CADCraft: cmd line, tracking, dynamic input)
 * Chạy với: node tests/cadcraft_dynamic_input.test.js
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

function approx(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol); }

console.log('========================================================================');
console.log('🧪 BẮT ĐẦU KIỂM THỬ: MINICAD ORTHO • POLAR TRACKING • DYNAMIC INPUT');
console.log('========================================================================\n');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// --- NHÓM 1: UI & TRẠNG THÁI ---
console.log('--- NHÓM 1: NÚT ORTHO / POLAR / D-INPUT TRONG HUD CAD ---');
{
    assert(indexHtml.includes('id="btnCadHudOrtho"'), 'Có nút 📐 ORTHO [F8] trên HUD');
    assert(indexHtml.includes('id="btnCadHudPolar"'), 'Có nút 🧭 POLAR [F10] trên HUD');
    assert(indexHtml.includes('id="btnCadHudDynInput"'), 'Có nút ⌨️ D-INPUT trên HUD');
    assert(indexHtml.includes('id="cadDynamicInput"'), 'Có hộp nhập động (#cadDynamicInput)');
    assert(indexHtml.includes('id="txtCadDynamicInput"'), 'Có ô nhập (#txtCadDynamicInput) với hint cú pháp');
    assert(indexHtml.includes('handleDynamicInputKey(event)'), 'Ô nhập bắt Enter/Esc qua handleDynamicInputKey');
    assert(/orthoMode:\s*false/.test(appJs) && /polarTracking:\s*false/.test(appJs), 'Khai báo trạng thái orthoMode/polarTracking mặc định tắt');
    assert(/dynamicInputEnabled:\s*true/.test(appJs), 'Nhập động bật mặc định (dynamicInputEnabled: true)');
}

// --- NHÓM 2: PHÍM TẮT & RÀNG BUỘC HƯỚNG ---
console.log('\n--- NHÓM 2: PHÍM TẮT F8/F10 VÀ THUẬT TOÁN GIỚI HẠN HƯỚNG ---');
{
    assert(/e\.key === 'F8'/.test(appJs) && /toggleOrthoMode\(\)/.test(appJs), "Phím F8 gọi toggleOrthoMode()");
    assert(/e\.key === 'F10'/.test(appJs) && /togglePolarTracking\(\)/.test(appJs), "Phím F10 gọi togglePolarTracking()");
    assert(/if \(this\.orthoMode && this\.polarTracking\) this\.polarTracking = false/.test(appJs), 'ORTHO và POLAR loại trừ nhau (bật 1 tắt còn lại)');
    assert(/if \(this\.polarTracking && this\.orthoMode\) this\.orthoMode = false/.test(appJs), 'POLAR cũng tự tắt ORTHO khi bật');
    assert(/applyDirectionConstraint\(fromX, fromY, toX, toY\)/.test(appJs), 'Có hàm applyDirectionConstraint(from, to)');
    assert(/handleMapClick[\s\S]{0,4000}?applyDirectionConstraint/.test(appJs), 'handleMapClick áp ràng buộc hướng khi chạm bản đồ');
    assert(/_lastRawLatLng = \{ lat, lng \}/.test(appJs), 'Ghi nhớ vị trí rê/chạm thô để suy hướng cho nhập cự ly');

    // Quy ước đơn vị dự án: x = BẮC (VN2000 X), y = ĐÔNG (VN2000 Y) => az = atan2(Đông, Bắc)
    assert(appJs.includes('const az = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;'), 'Polar đo phương vị = atan2(ΔĐông, ΔBắc) đúng quy ước VN2000');
    assert(appJs.includes('x: fromX + proj * Math.cos(rad), y: fromY + proj * Math.sin(rad)'), 'Polar dựng điểm: Bắc × cos, Đông × sin');
    assert((appJs.match(/lastM\.x \+ d \* Math\.cos\(rad\), lastM\.y \+ d \* Math\.sin\(rad\)/g) || []).length === 2, 'Nhập động @d<az và <az cùng dùng cos/sin đúng trục');
}

// --- NHÓM 3: CÚ PHÁP NHẬP ĐỘNG ---
console.log('\n--- NHÓM 3: CÚ PHÁP NHẬP ĐỘNG (@d<a • <a • d • X,Y • biểu thức) ---');
{
    assert(/applyDynamicInput\(rawText\)/.test(appJs), 'Có hàm applyDynamicInput()');
    assert(appJs.includes("text.match(/^@([\\d.]+)\\s*<\\s*([-\\d.]+)$/"), 'Parsers hỗ trợ @d<az (tọa độ cực tương đối)');
    assert(appJs.includes("text.match(/^<\\s*([-\\d.]+)$/"), 'Parsers hỗ trợ <az (giữ cự ly nhập trước)');
    assert(/_lastEnteredDistance/.test(appJs), 'Lưu cự ly nhập trước để chuỗi <90 kế tiếp dùng');
    assert(/isFinite\(x\) && isFinite\(y\)/.test(appJs) && /text\.replace\(\/\^@\/, ''\)\.split\(','\)/.test(appJs), 'Hỗ trợ nhập trực tiếp X,Y (VN-2000)');
    assert(appJs.includes('Function(`"use strict"; return (${expr});`)') && appJs.includes('/^[-+*/().,\\d\\s]+$/.test(expr)'), 'Biểu thức chỉ nhận chữ số & toán tử + - * / (chặn thực thi mã)');
}

// --- NHÓM 4: ĐƠN GIẢM THUẬT TOÁN (độc lập, chạy trực tiếp) ---
console.log('\n--- NHÓM 4: MÔ PHỎNG SỐ HỌC ORTHO / POLAR (đơn vị dự án: x = BẮC, y = ĐÔNG) ---');
{
    function applyConstraint(ortho, polar, angles, fx, fy, tx, ty) {
        const dx = tx - fx, dy = ty - fy;
        if (ortho) return Math.abs(dx) >= Math.abs(dy) ? { x: tx, y: fy } : { x: fx, y: ty };
        if (polar) {
            const r = Math.hypot(dx, dy);
            if (!(r > 0.001)) return { x: tx, y: ty };
            const az = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
            let best = null, bestDiff = Infinity;
            angles.forEach(a => {
                const d = Math.min(Math.abs(az - a), 360 - Math.abs(az - a));
                if (d < bestDiff) { bestDiff = d; best = a; }
            });
            if (bestDiff > 5) return { x: tx, y: ty };
            const rad = best * Math.PI / 180;
            const proj = dx * Math.cos(rad) + dy * Math.sin(rad);
            if (proj <= 0) return { x: tx, y: ty };
            return { x: fx + proj * Math.cos(rad), y: fy + proj * Math.sin(rad), polarAz: best };
        }
        return { x: tx, y: ty };
    }
    const ANG = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 240, 270, 300, 315, 330];

    // Ortho: rê chủ yếu theo X (Bắc) → giữ nguyên Y (Đông) = cạnh chạy theo trục Bắc-Nam
    let o1 = applyConstraint(true, false, ANG, 100, 100, 183.2, 101.1);
    assert(approx(o1.y, 100) && approx(o1.x, 183.2), 'ORTHO giữ cạnh Bắc-Nam khi rê chủ yếu theo trục X');
    let o2 = applyConstraint(true, false, ANG, 100, 100, 100.7, 160.3);
    assert(approx(o2.x, 100) && approx(o2.y, 160.3), 'ORTHO giữ cạnh Đông-Tây khi rê chủ yếu theo trục Y');

    // Polar: 45° exact giữ nguyên, (105,200) az 87.13° hút về 90° (Đông), (160,120) az 18.43° không hút
    let p1 = applyConstraint(false, true, ANG, 100, 100, 145, 145);
    assert(p1.polarAz === 45 && approx(p1.x, 145) && approx(p1.y, 145), 'POLAR hút đúng góc 45° chuẩn (Đông-Bắc)');
    let p2 = applyConstraint(false, true, ANG, 100, 100, 105, 200);
    assert(p2.polarAz === 90 && approx(p2.x, 100) && approx(p2.y, 200), 'POLAR hút cạnh gần Đông (87.13°) về 90°: Bắc giữ nguyên, Đông dịch');
    let p2b = applyConstraint(false, true, ANG, 100, 100, 200, 95);
    assert(p2b.polarAz === 0 && approx(p2b.y, 100) && approx(p2b.x, 200), 'POLAR hút 0° (Bắc): Đông giữ nguyên, Bắc dịch theo');
    let p3 = applyConstraint(false, true, ANG, 100, 100, 160, 120);
    assert(p3.polarAz === undefined, 'POLAR bỏ qua khi hướng lệch quá 5° khỏi lưới góc');
    let p4 = applyConstraint(false, true, ANG, 100, 100, 100.0004, 100.0002);
    assert(p4.polarAz === undefined && approx(p4.x, 100.0004), 'POLAR bỏ qua bước nhảy siêu nhỏ (r ≤ 1mm) giữ nguyên điểm');
    let p5 = applyConstraint(false, true, ANG, 100, 100, 100, 100);
    assert(p5.polarAz === undefined, 'POLAR an toàn khi trùng gốc (r = 0)');

    // Dựng điểm cực tương đối @d<az (x = BẮC, y = ĐÔNG, az từ Bắc theo chiều kim đồng hồ)
    function polarOffset(x, y, d, azDeg) {
        const rad = azDeg * Math.PI / 180;
        return { x: x + d * Math.cos(rad), y: y + d * Math.sin(rad) };
    }
    let e90 = polarOffset(1000, 2000, 100, 90);
    assert(approx(e90.x, 1000) && approx(e90.y, 2100), '@100<90 → tăng y (ĐÔNG) 100m, giữ nguyên bắc');
    let e0 = polarOffset(1000, 2000, 50, 0);
    assert(approx(e0.x, 1050) && approx(e0.y, 2000), '@50<0 → tăng x (BẮC) 50m');
    let e180 = polarOffset(1000, 2000, 100, 180);
    assert(approx(e180.x, 900) && approx(e180.y, 2000), '@100<180 → giảm x (NAM) 100m');
    let e270 = polarOffset(1000, 2000, 40, 270);
    assert(approx(e270.x, 1000) && approx(e270.y, 1960), '@40<270 → giảm y (TÂY) 40m');
    let e315 = polarOffset(1000, 2000, 50, 315);
    assert(approx(e315.x, 1000 + 35.3553, 0.01) && approx(e315.y, 2000 - 35.3553, 0.01), '@50<315 → Tây Bắc đúng lượng giác');
}

// --- NHÓM 5: BẢO TOÀN LUỒNG VẼ CŨ (snap vẫn ưu tiên, offset/phím cũ còn) ---
console.log('\n--- NHÓM 5: KHÔNG PHÁ LUỒNG VẼ CŨ (SNAP ƯU TIÊN, PHÍM CŨ còn) ---');
{
    const clickBodyMatch = appJs.match(/\n    handleMapClick\(lat, lng\) \{[\s\S]*?\n    \},/g);
    const cadClick = (clickBodyMatch || []).find(b => b.includes('addPointToLayer'));
    const clickStart = cadClick ? appJs.indexOf(cadClick) : -1;
    const clickBody = cadClick || '';
    const iSnap = clickBody.indexOf('candidate.isSnapped');
    const iConstraint = clickBody.indexOf('applyDirectionConstraint');
    assert(clickBody.length > 0 && iSnap >= 0 && iConstraint >= 0 && iSnap < iConstraint, 'Nhánh snap ưu tiên vẫn đứng trước ràng buộc Ortho/Polar');
    if (iSnap >= 0 && iConstraint >= 0) {
        assert(clickBody.slice(iSnap, iConstraint).indexOf('applyDirectionConstraint') === -1, 'Nhánh snap trùng không bị ràng buộc hướng làm lệch mốc');
    }
    assert(/key === 'S' \|\| e\.key === 'F3'/.test(appJs), 'Phím S/F3 toggle SNAP giữ nguyên');
    assert(/key === 'O'/.test(appJs) && /promptOffset\(\)/.test(appJs), 'Phím O (Offset) giữ nguyên');
    assert(/key === 'D'/.test(appJs) && /openPolarModal\(\)/.test(appJs), 'Phím D (bắn L/Az modal) giữ nguyên');
    assert(/cadOrthoMode:/.test(appJs) && /cadPolarTracking:/.test(appJs) && /cadDynamicInput:/.test(appJs), 'Trạng thái ORTHO/POLAR/D-INPUT được lưu vào appSettings');
}

console.log('\n========================================================================');
console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests === 0) {
    console.log('🎉 MINICAD ORTHO • POLAR TRACKING • DYNAMIC INPUT ĐÃ SẴN SÀNG 100%!');
}
console.log('========================================================================\n');

process.exit(failedTests === 0 ? 0 : 1);
