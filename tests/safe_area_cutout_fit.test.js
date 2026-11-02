/**
 * BỘ KIỂM THỬ VÙNG AN TOÀN THIẾT BỊ (SAFE-AREA / CUTOUT FIT TEST)
 * Mục tiêu: không một bề mặt nào của ứng dụng được nằm trong vùng không thao tác được của
 * máy có camera "tai thỏ" / "nốt ruồi", ở cả màn dọc lẫn màn ngang, và cả khi bàn phím ảo mở.
 * Chạy với: node tests/safe_area_cutout_fit.test.js
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

// Bỏ comment để việc "quét đơn vị thô" không báo động giả vì dòng giải thích.
function stripComments(css) {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function runSafeAreaTests() {
    console.log('========================================================================');
    console.log('🧪 BẮT ĐẦU KIỂM THỬ VÙNG AN TOÀN 4 MÉP (TAI THỎ / NỐT RUỒI / NGANG / BÀN PHÍM)');
    console.log('========================================================================\n');

    const root = path.join(__dirname, '..');
    const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
    const indexHtml = read('index.html');
    const styleCss = read('style.css');
    const polishCss = read('ui-polish.css');
    const fieldCss = read('field-workspace.css');
    const appJs = read('app.js');
    const swJs = read('sw.js');

    // ------------------------------------------------------------------
    console.log('--- NHÓM 1: LƯỚI TOKEN AN TOÀN 4 MÉP TRONG :root ---');
    {
        assert(styleCss.includes('--sat-safe-top: env(safe-area-inset-top, 0px);'),
            'Có token mép trên (--sat-safe-top)');
        assert(styleCss.includes('--sat-safe-left: env(safe-area-inset-left, 0px);'),
            'Có token mép TRÁI — camera nốt ruồi lệch viền nằm ngang báo inset trái/phải, không báo mép trên');
        assert(styleCss.includes('--sat-safe-right: env(safe-area-inset-right, 0px);'),
            'Có token mép PHẢI');
        assert(styleCss.includes('--sat-safe-bottom: env(safe-area-inset-bottom, 0px);') === false &&
            styleCss.includes('--sat-safe-bottom: max(env(safe-area-inset-bottom, 0px), var(--kb-inset));'),
            'Mép dưới là max(inset thiết bị, --kb-inset) — bàn phím ảo tự nâng mọi bề mặt đang dùng token này');
        assert(/--kb-inset:\s*0px;/.test(styleCss), '--kb-inset có giá trị mặc định 0px (không bàn phím = không dịch)');
        assert(/--app-vh:\s*100vh;/.test(styleCss), '--app-vh mặc định 100vh trước khi JS đo được');
        assert(styleCss.includes('--ui-avail-h: calc(var(--app-vh) - var(--sat-safe-top) - var(--sat-safe-bottom));'),
            '--ui-avail-h = chiều cao đo được trừ hai mép an toàn (trần thật cho modal/panel)');
        ['--ui-edge-top', '--ui-edge-right', '--ui-edge-bottom', '--ui-edge-left'].forEach(t =>
            assert(new RegExp(`${t}:\\s*calc\\(var\\(--sat-safe-(top|right|bottom|left)\\) \\+ 8px\\);`).test(styleCss),
                `${t} cung cấp lề 8px đã cộng inset cho overlay/popup`));
        assert(styleCss.includes('--ui-dock-clear: calc(var(--sat-safe-bottom) + 68px);'),
            '--ui-dock-clear là một hằng số "né dock điều hướng" dùng chung (FAB, HUD Live Map)');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 2: VIEWPORT META & PINCH-ZOOM ---');
    {
        const meta = (indexHtml.match(/<meta[^>]*name="viewport"[^>]*>/i) || [''])[0];
        assert(meta.includes('viewport-fit=cover'),
            'viewport-fit=cover — bắt buộc để env(safe-area-inset-*) có giá trị trên máy tai thỏ');
        assert(!/user-scalable\s*=\s*no/i.test(meta),
            'Đã bỏ user-scalable=no — người dùng được phép zoom phóng to khi vùng chạm quá nhỏ');
        assert(!/maximum-scale\s*=\s*1(\.0)?\b/i.test(meta),
            'Không còn maximum-scale=1.0 chặn zoom');
        assert(/maximum-scale\s*=\s*[2-9]/i.test(meta), 'Cho phép zoom tới mức hợp lý (maximum-scale >= 2)');

        const noTap = stripComments(styleCss);
        const touchRule = noTap.match(/([^{}]*button[^{}]*)\{[^}]*touch-action:\s*manipulation;/);
        assert(!!touchRule,
            'Nút/input/nav được đặt touch-action:manipulation để mở pinch-zoom mà không sinh double-tap zoom trễ chạm');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 3: KHUNG ỨNG DỤNG (HEADER / DOCK / DRAWER / TOAST / FAB) ---');
    {
        const appContainer = (styleCss.match(/#app-container\s*\{[^}]*\}/) || [''])[0];
        assert(appContainer.includes('height: var(--app-vh);'),
            '#app-container cao theo --app-vh đo được, không cắt mất đáy vì 100vh của trình duyệt di động');

        const header = (styleCss.match(/header\.app-header\s*\{[^}]*\}/) || [''])[0];
        assert(header.includes('padding-top: calc(var(--sat-safe-top) + 6px)') &&
            header.includes('padding-left: calc(var(--sat-safe-left) + 10px)') &&
            header.includes('padding-right: calc(var(--sat-safe-right) + 10px)'),
            'Header đội đủ inset trên + trái + phải (logo/nút menu không tụt vào tai thỏ ngang)');

        const screenView = (styleCss.match(/\.screen-view\s*\{[^}]*\}/) || [''])[0];
        assert(/padding:\s*12px calc\(var\(--sat-safe-right\) \+ 14px\) calc\(var\(--sat-safe-bottom\) \+ 20px\) calc\(var\(--sat-safe-left\) \+ 14px\);/.test(screenView),
            'Màn hình nội dung chừa đủ lề trái-phải-dưới theo inset (hàng nút cuối không dính vạch cắt)');

        const dock = (styleCss.match(/nav#mobileBottomNav\.mobile-bottom-nav\s*\{[^}]*\}/) || [''])[0];
        assert(dock.includes('bottom: calc(var(--sat-safe-bottom) + 8px) !important;'),
            'Dock điều hướng nâng thêm đúng chiều cao bàn phím ảo (--kb-inset nằm trong --sat-safe-bottom)');
        assert(dock.includes('left: calc(var(--sat-safe-left) + 12px) !important;') &&
            dock.includes('right: calc(var(--sat-safe-right) + 12px) !important;'),
            'Dock co lại theo inset trái/phải — phím ngoài cùng không bị nốt ruồi lệch viền che');

        const quicknav = (styleCss.match(/\.btn-floating-quicknav\s*\{[^}]*\}/) || [''])[0];
        assert(quicknav.includes('bottom: calc(var(--sat-safe-bottom) + 20px)') &&
            quicknav.includes('right: calc(var(--sat-safe-right) + 16px)'),
            'Nút nổi QuickNav tránh cả mép dưới lẫn mép phải của máy cắt góc');

        const drawer = (styleCss.match(/\.nav-tree-drawer\s*\{[^}]*\}/) || [''])[0];
        assert(drawer.includes('height: var(--app-vh)'), 'Ngăn kéo menu cao theo viewport thật');
        assert(polishCss.includes('max-width: calc(88vw - var(--sat-safe-left) - var(--sat-safe-right)) !important;'),
            'Ngăn kéo menu (lớp ui-polish) trừ inset hai bên — không bị rìa cắt màn hình che nội dung');
        assert(/#toast-msg\s*\{[^}]*left:\s*calc\(50% \+ \(var\(--sat-safe-left\) - var\(--sat-safe-right\)\) \/ 2\);/s.test(styleCss),
            'Toast căn giữa theo TRỤC AN TOÀN (lệch inset trái/phải) chứ không theo giữa màn hình vật lý');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 4: BỀ MẶT BẢN ĐỒ & MiniCAD DÁN SÁT VIỀN ---');
    {
        const block = (sel) => (styleCss.match(new RegExp('\\' + sel + '\\s*\\{[^}]*\\}')) || [''])[0];
        assert(/left:\s*calc\(var\(--sat-safe-left\) \+ 10px\);/.test(block('.map-top-bar')) &&
            /right:\s*calc\(var\(--sat-safe-right\) \+ 10px\);/.test(block('.map-top-bar')),
            '.map-top-bar bám lề trái/phải theo inset (thanh công cụ bản đồ không lọt vào vùng cắt cạnh)');
        assert(/right:\s*calc\(var\(--sat-safe-right\) \+ 10px\);/.test(block('.map-right-controls')),
            '.map-right-controls cách mép phải theo inset');

        ['.cad-status-hud', '.cad-thumb-action-bar', '.cad-floating-cmd-bar'].forEach(cls => {
            const blocks = [...styleCss.matchAll(new RegExp('\\' + cls + '\\s*\\{([^}]*)\\}', 'g'))].map(m => m[1]);
            assert(blocks.some(b => /bottom:\s*calc\(var\(--sat-safe-bottom\)/.test(b)),
                `${cls} tính khoảng trống đáy bằng token (tự né tai thỏ dưới + bàn phím)`);
        });

        assert(styleCss.includes('width: calc(100vw - var(--sat-safe-left) - var(--sat-safe-right) - 20px) !important;'),
            'Bảng khối dự án khi phóng hết màn hình trừ đủ hai inset bên');
        // Bề mặt neo TRÁI mà trần rộng tính theo 100% sẽ tràn sang mép phải khi máy có nốt ruồi lệch viền
        ['.cad-status-hud', '.map-distance-hud'].forEach(cls => {
            const blocks = [...styleCss.matchAll(new RegExp('\\' + cls + '\\s*\\{([^}]*)\\}', 'g'))].map(m => m[1]);
            assert(blocks.some(b => /max-width:\s*calc\(100% - var\(--sat-safe-left\) - var\(--sat-safe-right\)/.test(b)),
                `${cls} trừ cả hai inset bên trong max-width (neo trái mà tính 100% là tràn mép phải)`);
        });
        assert(/\.cad-blocks-panel\s*\{[^}]*max-height:\s*calc\(var\(--ui-avail-h\)/.test(styleCss) ||
            styleCss.includes('max-height: calc(var(--ui-avail-h) - 120px);'),
            'Bảng khối MiniCAD cao theo --ui-avail-h — danh sách dài không chảy ra dưới dock');
        assert(fieldCss.includes('calc(var(--sat-safe-top) + 2px) calc(var(--sat-safe-right) + 8px) 2px calc(var(--sat-safe-left) + 8px)'),
            'Chế trường hiện trường (field-workspace) cũng cộng đủ 3 inset cho header');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 5: KHÔNG CÒN ĐƠN VỊ VIEWPORT THÔ (100vh / NNvh) ---');
    {
        const styleRaw = stripComments(styleCss).replace(/--app-vh:\s*100vh;/g, '');
        assert(!/[0-9]+vh\b/.test(styleRaw),
            'style.css: mọi cao độ đều qua --app-vh/--ui-avail-h (100vh chỉ còn làm giá trị khởi điểm của token)');
        assert(!/[0-9]+vh\b/.test(stripComments(polishCss)),
            'ui-polish.css: lớp CSS cuối không còn đơn vị vh thô đè lên token');
        assert(!/[0-9]+vh\b/.test(stripComments(indexHtml)),
            'index.html: không còn inline max-height: NNvh — inline sẽ thắng stylesheet nên phải đổi hết ra token');
        assert(!/style\.max(?:Height|Height)\s*=\s*'[0-9]+vh'/i.test(appJs) &&
            !/maxHeight = '[0-9]+vh'/.test(appJs) &&
            !/max-height:\s*[0-9]+vh/g.test(stripComments(appJs)),
            'app.js: không còn gán chiều cao vh thô bằng JS/inline template');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 6: ĐO VIEWPORT & BÀN PHÍM ẢO (appViewport) ---');
    {
        const module = (appJs.match(/const appViewport = \{[\s\S]*?\n\};/) || [''])[0];
        assert(module.length > 0, 'Có module appViewport đo vùng nhìn thấy của thiết bị');
        assert(/setProperty\('--app-vh'/.test(module) && /window\.innerHeight/.test(module),
            'appViewport ghi --app-vh từ window.innerHeight (giá trị thật, không tính vùng trình duyệt thu)');
        assert(/setProperty\('--kb-inset'/.test(module), 'appViewport ghi --kb-inset cho mép dưới');
        assert(/window\.innerHeight - vv\.height - vv\.offsetTop/.test(module),
            ' Chiều cao bàn phím ảo = innerHeight - visualViewport.height - offsetTop (nguồn duy nhất đọc được keyboard)');
        assert(/visualViewport/.test(module) && /addEventListener\('resize'/.test(module) &&
            /addEventListener\('orientationchange'/.test(module),
            'Lắng nghe resize + orientationchange + visualViewport để cập nhật khi xoay máy/mở phím');
        assert(/requestAnimationFrame/.test(module), 'Gộp cập nhật trong một frame (chống giật khi bàn phím animate)');

        const bootIdx = appJs.indexOf("if (typeof appViewport !== 'undefined') appViewport.init();");
        const themeIdx = appJs.indexOf('appTheme.init();');
        assert(bootIdx > 0 && themeIdx > 0 && bootIdx < themeIdx,
            'appViewport.init() chạy TRƯỚC appTheme.init() — đo xong mới dựng giao diện, tránh nháy layout khung đầu');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 7: MÀN NGANG (compact theo CHIỀU CAO) ---');
    {
        const lsIdx = styleCss.indexOf('@media (orientation: landscape) and (max-height: 620px)');
        assert(lsIdx > 0,
            'style.css có khối media theo orientation+chiều cao — trước đây mobile chỉ bật ở max-width:768px nên xoay ngang là mất dock');
        if (lsIdx > 0) {
            const lsBlock = styleCss.slice(lsIdx, lsIdx + 4000);
            assert(/\.mobile-bottom-nav\s*\{\s*display:\s*flex !important;/.test(lsBlock),
                'Màn ngang hẹp gọi lại dock điều hướng (display:flex)');
            assert(/\.transform-split-layout\s*\{[^}]*min-height:\s*0 !important;/.test(lsBlock),
                'Bố cục form+bản đồ bỏ sàn 680px (sàn này đẩy nội dung ra ngoài màn ngang)');
            assert(lsBlock.includes('max-height: calc(var(--ui-avail-h) - 8px) !important;'),
                'Modal bị trần bằng --ui-avail-h trong màn ngang (không tràn đỉnh tai thỏ)');
        }

        // Ngưỡng neo đáy của bề mặt nằm trong ui-polish.css vì chính lớp này đặt !important ở màn dọc:
        // đặt trong style.css sẽ bị thắng -> khối dưới đây là nơi duy nhất có hiệu lực.
        const lsP = polishCss.indexOf('@media (orientation: landscape) and (max-height: 620px)');
        assert(lsP > 0, 'ui-polish.css (lớp cuối) cũng có khối màn ngang để các ngưỡng neo thật sự có hiệu lực');
        if (lsP > 0) {
            const b = polishCss.slice(lsP);
            assert(/header\.app-header\.mac-top-bar\s*\{[^}]*max-height:\s*calc\(var\(--sat-safe-top, 0px\) \+ 44px\)/.test(b),
                'Header màn ngang hạ còn 44px + inset trên để dành chiều cao cho bản vẽ');
            assert(/nav#mobileBottomNav\.mobile-bottom-nav\.mac-floating-dock[^}]*height:\s*46px !important;/.test(b) &&
                /bottom:\s*calc\(var\(--sat-safe-bottom, 0px\) \+ 4px\) !important;/.test(b),
                'Dock màn ngang 46px áp sát đáy (chỉ chiếm dải 4→50px)');
            assert(/font-size:\s*9\.5px !important;/.test(b), 'Nhãn dock thu nhỏ trong màn ngang');
            assert(b.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 56px) !important;'),
                'HUD/sheet/Leaflet control né dải dock trong màn ngang');
            assert(b.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 60px) !important;'),
                'Thanh thao tác một ngón cái né dock trong màn ngang');
            assert(b.includes('bottom: calc(var(--sat-safe-bottom, 0px) + 96px) !important;'),
                'CLI CADCraft nổi trên HUD trong màn ngang');
            assert(/body\.dock-collapsed \.cad-status-hud/.test(b),
                'Kể cả khi dock thu gọn, bề mặt màn ngang vẫn được đặt lại theo hình học ngang (không ăn số của màn dọc)');
        }
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 8: LỚP CUỐI ui-polish.css KHÔNG VÔ HIỆU HOÁ TOKEN ---');
    {
        assert(!/bottom:\s*66px\s*!important/.test(polishCss),
            'Không còn "bottom: 66px !important" cứng (trước đây nó thắng rule có inset và đẩy sheet vào vùng cắt)');
        assert(polishCss.includes('bottom: calc(var(--sat-safe-bottom) + 66px) !important;'),
            'Sheet chuyển tọa độ dùng token mép dưới ở lớp cuối');
        const dockPolish = (polishCss.match(/nav#mobileBottomNav\.mobile-bottom-nav\.mac-floating-dock\s*\{[^}]*\}/) || [''])[0];
        assert(dockPolish.includes('left: calc(var(--sat-safe-left) + 14px) !important;') &&
            dockPolish.includes('right: calc(var(--sat-safe-right) + 14px) !important;'),
            'Dock MAC (lớp cuối) cũng trừ inset hai bên');
        assert(/max-width:\s*calc\(100vw - var\(--sat-safe-left\) - var\(--sat-safe-right\) - 16px\)/.test(polishCss),
            'Modal donate giới hạn bề ngang theo vùng an toàn hai bên');
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 9: TÍNH HỢP LỆ CẤU TRÚC CSS (CHỐNG VAI-PATCH LÀM HỎNG KHAI BÁO) ---');
    {
        // Bài học từ chính đợt vá này: script thay "bottom: 12px;" bằng "calc(...)" mà rơi mất tên thuộc tính
        // sẽ tạo ra khai báo không hợp lệ -> bề mặt mất neo mà không một test nào báo. Guard lại vĩnh viễn.
        [styleCss, polishCss, fieldCss].forEach((css, idx) => {
            const name = ['style.css', 'ui-polish.css', 'field-workspace.css'][idx];
            const naked = stripComments(css).split(/\r?\n/)
                .filter(l => /^\s*(calc|var|env)\(/.test(l));
            assert(naked.length === 0,
                `${name}: không có dòng giá trị "mất tên thuộc tính" (${naked.slice(0, 2).join(' / ').slice(0, 90)})`);
            const opens = (css.match(/\{/g) || []).length, closes = (css.match(/\}/g) || []).length;
            assert(opens === closes, `${name}: số cặp dấu ngoặc { } cân nhau (${opens})`);
        });
    }

    // ------------------------------------------------------------------
    console.log('\n--- NHÓM 10: PHIÊN BẢN CACHE BUỘC NẠP LẠI GIAO DIỆN ---');
    {
        const swVer = (swJs.match(/CACHE_NAME = 'vn2000-pro-v([\d.]+)'/) || [])[1];
        const styleVer = (indexHtml.match(/style\.css\?v=([\d.]+)/) || [])[1];
        const appVer = (indexHtml.match(/app\.js\?v=([\d.]+)/) || [])[1];
        const polishVer = (indexHtml.match(/ui-polish\.css\?v=([\d.]+)/) || [])[1];
        assert(!!swVer && swVer === styleVer && swVer === appVer && swVer === polishVer,
            `sw.js + style.css + app.js + ui-polish.css cùng phiên bản ${swVer} (người dùng cũ nhận ngay bộ token mới)`);
        const [maj, min, patch] = (swVer || '0.0.0').split('.').map(Number);
        assert(maj * 10000 + min * 100 + patch >= 2 * 10000 + 8 * 100 + 13, 'Đã tăng lên tối thiểu v2.8.13');
    }

    console.log('\n========================================================================');
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests / totalTests * 100)}%)`);
    if (failedTests > 0) {
        console.error(`❌ CÓ ${failedTests} KIỂM THỬ THẤT BẠI!`);
        process.exit(1);
    } else {
        console.log('🎉 GIAO DIỆN TỰ PHÂN PHỐI THEO VÙNG AN TOÀN CỦA MỌI THIẾT BỊ!');
    }
    console.log('========================================================================\n');
}

runSafeAreaTests();
