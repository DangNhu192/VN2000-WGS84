/**
 * BỘ KIỂM THỬ SÀN CHẠM TỐI THIỂU CHO NÚT & Ô NHẬP (WP-F TOUCH TARGET FLOOR)
 * Mục tiêu: trên điện thoại, mọi điều khiển được chạm phải đạt kích thước ngón tay.
 * Kỹ thuật được khoá ở đây là "mở vùng chạm bằng ::after trong suốt" nên kích thước
 * thật không đổi — mật độ bảng/hàng nút không bị giãn. Test này chặn việc ai đó
 * xoá mất vùng chạm hoặc hạ sàn min-height xuống dưới mức ngón tay.
 * Chạy với: node tests/touch_target_floor.test.js
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

function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function runTouchTargetTests() {
    console.log('========================================================================');
    console.log('🧪 KIỂM THỬ SÀN CHẠM TỐI THIỂU (NÚT ĐẦU TRANG / RIBBON CAD / MODAL BẢNG KÊ)');
    console.log('========================================================================\n');

    const root = path.join(__dirname, '..');
    const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
    const indexHtml = read('index.html');
    const swJs = read('sw.js');
    const polishRaw = read('ui-polish.css');
    const polish = stripComments(polishRaw);

    const marker = polishRaw.indexOf('WP-F');
    assert(marker > -1, 'ui-polish.css còn khai báo khu vực sàn chạm WP-F');
    const wpf = marker > -1 ? stripComments(polishRaw.slice(marker)) : '';

    console.log('\n--- NHÓM 1: NỀN CHO VÙNG CHẠM MỞ RỘNG (::after) ---');
    {
        // Danh sách lớp được đặt position:relative để chứa ::after mở rộng.
        const anchorBlock = wpf.slice(0, wpf.indexOf('@media'));
        ['.btn-header-action', '.mac-ctrl-btn', '.btn-map-action', '.btn-help-circle', '.btn-help-circle-sm',
            '.camera-icon-btn', '.btn-modal-close', '.btn-sm', '.cad-ribbon-btn', '.cad-cmd-btn-toggle',
            '.cad-hud-btn', '#btnDockCollapse', '#fwSimple', '#fwAdvanced', '#fwField',
            '.btn-drawer-clear', '.btn-resizer-quick-toggle'].forEach(cls => {
            assert(anchorBlock.includes(cls), `Neo position:relative cho ${cls}`);
        });
        assert(/position:\s*relative;/.test(anchorBlock), 'Nhóm neo dùng position:relative (không đổi kích thước thật)');
    }

    console.log('\n--- NHÓM 2: HAI LOẠI VÙNG CHẠM 44px ---');
    {
        const tall = wpf.match(/([^{}]*::after)\s*\{([^}]*left:\s*0;[^}]*)\}/);
        assert(!!tall && /height:\s*44px;/.test(tall[2]) && /margin-top:\s*-22px;/.test(tall[2]),
            'Nhát 1: nút trong hàng dọc mở RIÊNG chiều dọc lên 44px (tránh trộm chạm láng giềng)');
        assert(/position:\s*absolute;/.test(tall ? tall[2] : ''), 'Vùng chạm là position:absolute (không giãn dòng, không lố nhãn)');

        const square = wpf.match(/([^{}]*#btnDockCollapse::after[^{}]*)\{([^}]*)\}/);
        assert(!!square && /width:\s*44px;/.test(square[2]) && /height:\s*44px;/.test(square[2]),
            'Nhát 2: nút tròn / nút icon góc mở cả hai chiều 44x44');
        assert(!!square && /margin:\s*-22px 0 0 -22px;/.test(square[2]),
            'Định tâm bằng margin (không dùng transform vì nhiều nút đã có transform !important)');
        assert(!/translate\(-50%/.test(square ? square[2] : ''), 'Không còn translate() bị !important của nút khác ghi đè');
    }

    console.log('\n--- NHÓM 3: SÀN CHẠM THẬT CHO ĐIỀU KHIỂN KHÔNG MỞ ::after ĐƯỢC ---');
    {
        // Replaced element (input/select) không thể có ::after → phải nâng kích thước thật.
        const floor = wpf.match(/input\.app-input,\s*select,[^}]*\{([^}]*)\}/);
        assert(!!floor && /min-height:\s*40px;/.test(floor[1]),
            'input.app-input + mọi select: min-height 40px (thắng được inline "height: 30px" vì là tính chất khác)');
        assert(!/input\.app-input[^}]*height:\s*40px\s*!important/.test(wpf),
            'Không dùng !important cho sàn ô nhập — giữ cho khai báo nội tuyến vẫn dễ đầu được');

        ['.btn-sm {', 'button.btn-sm {', 'input[type="checkbox"],', 'input[type="color"] {'].forEach(sel => {
            assert(wpf.includes(sel), `Còn quy ước sàn chạm cho ${sel}`);
        });
        assert(/\.btn-sm\s*\{[^}]*min-height:\s*40px;/.test(wpf), '.btn-sm min-height 40px (nhóm .card-tools bị overflow:hidden cắt)');
        assert(/button\.btn-sm\s*\{[^}]*min-width:\s*40px;/.test(wpf), 'button.btn-sm min-width 40px (nút ✕ rộng 23px)');
        assert(/input\[type="checkbox"\][^}]*min-width:\s*20px;[^}]*min-height:\s*20px;/.test(wpf),
            'Ô tick / ô chọn tối thiểu 20px (ô trong modal CAD chỉ 13-16px)');
        assert(/input\[type="color"\]\s*\{[^}]*min-height:\s*34px;/.test(wpf), 'Ô chọn màu min-height 34px');
    }

    console.log('\n--- NHÓM 4: SÀN CHẠM TRONG CÁC MODAL ---');
    {
        assert(/:is\(#screen-stakeout,\s*#screen-datamgmt\)[^}]*min-height:\s*40px\s*!important;/.test(polish),
            'Sàn .card-tools .btn-sm màn Stakeout/DataMgmt đã nâng 36px → 40px');
        assert(!/card-tools \.btn-sm\s*\{[^}]*min-height:\s*36px/.test(polish), 'Không còn sàn cũ 36px trong card-tools');
        assert(/\[class\*="modal"\] select[^}]*\{[^}]*min-height:\s*36px;/.test(wpf),
            'Select trong modal (Bảng kê đỉnh / Bulk style) min-height 36px');
        assert(/\[class\*="modal"\] a\[href\]\s*\{[^}]*min-height:\s*34px;/.test(wpf),
            'Liên kết trong modal có lớp chạm 34px (modal hướng dẫn Google Sheet)');
        assert(/a\[href\^="mailto:"\]\s*\{[^}]*padding:\s*1[0-9]px 4px;/.test(wpf),
            'Liên kết email màn About: lớp chạm ≥ 10px (chữ thường 14px)');
        assert(/\.donate-channel-pill\s*\{[^}]*min-height:\s*44px;/.test(wpf), 'Pill kênh chuyển khoản 44px');
        assert(/#modalDonateCountdown \.donate-channel-pill\.support-channel-btn\{min-height:44px/.test(polish),
            'Sàn 44px cũng áp cho rule đặc hiệu #modalDonateCountdown (trước đây giữ 36px)');
        assert(/\.btn-micro\s*\{[^}]*min-width:\s*34px;[^}]*min-height:\s*38px;/.test(wpf),
            'Nút siêu nhỏ modal OCR toạ độ: 34x38 (bản cũ 25x26, ngón tay không với tới)');
        assert(/\.cad-check-label,\s*\.cad-export-check-item\s*\{[^}]*min-height:\s*34px;/.test(wpf),
            'Hàng nhãn ô tick (Bảng kê / Xuất file) cao 34px để chạm trúng cả nhãn');
        assert(/button\[title="Gập \/ Mở bảng này"\]\s*\{[^}]*min-width:\s*38px;[^}]*min-height:\s*38px;/.test(wpf),
            'Nút gập bảng ▾ không class trong Bảng kê được nạp lớp chạm 38px');
    }

    console.log('\n--- NHÓM 5: MINICAD RIBBON & THANH LỆNH KHÔNG BỊ NAN ---');
    {
        assert(/\.cad-ribbon-btn\s*\{[^}]*flex:\s*0 0 auto\s*!important;[^}]*min-width:\s*46px\s*!important;[^}]*height:\s*40px\s*!important;/.test(wpf),
            'Ribbon CAD thoát chế độ nén "15 nút về 17px" → 46x40, dài lượng cuộn ngang');
        assert(/\.cad-btn-icon\s*\{[^}]*width:\s*40px\s*!important;[^}]*height:\s*40px\s*!important;/.test(wpf),
            'Nút Lùi/Tiến CAD 26x26 → 40x40 (thắng xác !important của max-width:460px)');
        assert(/\.cad-cmd-submit-btn\s*\{[^}]*width:\s*38px\s*!important;/.test(wpf), 'Nút Gửi lệnh Enter 38x38');
        assert(/\.cad-cmd-input\s*\{[^}]*min-height:\s*38px;/.test(wpf), 'Ô lệnh CAD min-height 38px');
        assert(/\.cad-tab-btn\s*\{[^}]*min-height:\s*38px;/.test(wpf), '6 nhãn chuyển tab CAD đạt sàn 38px');
        assert(/\.map-project-bar \.btn-map-action\s*\{[^}]*min-width:\s*38px\s*!important;/.test(wpf),
            'Nút icon thanh bản đồ dự án min-width 38px');
    }

    console.log('\n--- NHÓM 6: KIỂM SOÁT LẠI THỦ TỤC (MEDIA QUERY KHÔNG TĂNG MỨC ƯU TIÊN) ---');
    {
        assert(/@media\s*\(max-width:\s*900px\),\s*\(pointer:\s*coarse\)/.test(wpf),
            'Toàn bộ sàn chạm nằm trong @media (max-width:900px),(pointer:coarse) — máy tính không bị ảnh hưởng');
        const leaflet = wpf.match(/\.leaflet-bar a,\s*\.leaflet-touch \.leaflet-bar a\s*\{([^}]*)\}/);
        assert(!!leaflet && /width:\s*40px;/.test(leaflet[1]) && /height:\s*40px;/.test(leaflet[1]),
            'Nút phóng to/thu nhỏ Leaflet 30px → 40px (kích thước thật, không phải ::after)');
    }

    console.log('\n--- NHÓM 7: PHIÊN BẢN CACHE BUỘC NẠP LẠI SAN CHẠM ---');
    {
        const swVer = (swJs.match(/CACHE_NAME = 'vn2000-pro-v([\d.]+)'/) || [])[1];
        const styleVer = (indexHtml.match(/style\.css\?v=([\d.]+)/) || [])[1];
        const appVer = (indexHtml.match(/app\.js\?v=([\d.]+)/) || [])[1];
        const polishVer = (indexHtml.match(/ui-polish\.css\?v=([\d.]+)/) || [])[1];
        assert(!!swVer && swVer === styleVer && swVer === appVer && swVer === polishVer,
            `sw.js + style.css + app.js + ui-polish.css cùng phiên bản ${swVer}`);
        const [maj, min, patch] = (swVer || '0.0.0').split('.').map(Number);
        assert(maj * 10000 + min * 100 + patch >= 2 * 10000 + 8 * 100 + 19, 'Đã tăng lên tối thiểu v2.8.19');
    }

    console.log('\n========================================================================');
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests / totalTests * 100)}%)`);
    if (failedTests > 0) {
        console.error(`❌ CÓ ${failedTests} KIỂM THỬ THẤT BẠI!`);
        process.exit(1);
    } else {
        console.log('🎉 MỌI ĐIỀU KHIỂN CHẠM ĐỀU ĐẠT SÀN NGÓN TAY TRÊN ĐIỆN THOẠI!');
    }
    console.log('========================================================================\n');
}

runTouchTargetTests();
