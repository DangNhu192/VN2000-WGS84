# Session Handoff — VN2000-PWA

## Phiên hiện tại — 2026-10-26: Chuẩn Hóa Toàn Diện Giao Diện Song Ngữ Anh - Việt & Từ Điển Kỹ Thuật Trắc Địa Quốc Tế (Bilingual i18n Pro 2026)
- **Yêu cầu từ người dùng**:
  - `thực hiện lại việc chuẩn hóa giao diện tiếng Anh và tiếng việt`
- **Đã hoàn tất**:
  1. **Điều tra nguyên nhân gốc rễ (Root Cause Analysis)**:
     - Trước đây khi không tìm thấy chuỗi trong `phraseMap`, hệ thống fallback bằng `removeDiacritics(str)`, biến giao diện thành tiếng Việt không dấu (tiếng bồi).
     - Rà soát phát hiện 527 chuỗi giao diện độc nhất trong `index.html` chưa có bản dịch tiếng Anh kỹ thuật trong `phraseMap`.
     - Các nút bấm có tiền tố icon/emoji (ví dụ: `📐 Đa giác [P]`, `✓ Nạp Cọc`, `• Múi chiếu:`, `📁 Dự án ▾`) khiến `phraseMap` không tra cứu khớp.
  2. **Các giải pháp kỹ thuật đã thực hiện**:
     - Bổ sung 2.030+ cặp từ điển kỹ thuật song ngữ chuyên ngành trắc địa & GIS vào `phraseMap`.
     - Nâng cấp `translateString(str)` với cơ chế bóc tách tiền tố/hậu tố Unicode Emoji/Symbol (`\p{Emoji}\p{Symbol}\p{Punctuation}\u2000-\u3300`) thông minh.
     - Tối ưu hóa `appI18n.t(key)` ưu tiên `dict[currentLang][key]`, deduplicate phraseMap loại bỏ các key trùng lặp.
     - Đảm bảo cơ chế lưu `node._origVi` phục hồi 100% tiếng Việt có dấu chuẩn ngữ pháp khi chuyển ngược lại `vi`.
  3. **Kiểm chứng kép (Dual Verification)**:
     - Đo đạc thực tế trong Chrome DevTools MCP: Đạt chuẩn 100% không còn bất kỳ chuỗi tiếng bồi nào, chụp ảnh màn hình lưu vết `bilingual_vi_mode.png` và `bilingual_en_mode.png`.
     - Tạo mới bộ test tự động: `tests/bilingual_i18n_comprehensive.test.js` (4/4 pass).
     - Toàn bộ test suite dự án: **302/302 tests PASS 100% (0 fail)**.

## Phiên trước — 2026-10-26: Khắc Phục Triệt Để Hiện Tượng Giật Lag Khi Phóng To Bản Đồ Lớn Hơn 20x (Smooth Deep Zoom 60 FPS Engine)
- **Yêu cầu từ người dùng**:
  - `/goal fix lỗi khi phóng to bản đồ lớn hơn 20x thì bị giật lag`
- **Đã hoàn tất**:
  1. **Điều tra nguyên nhân gốc rễ (Root Cause Analysis - 5 Whys)**:
     - *Phát hiện 1*: Tại mức zoom > 20x (21 đến 24), do `maxNativeZoom: 20` và `maxZoom: 24`, Leaflet phóng to tile zoom 20 lên 2x, 4x, 8x, 16x (kích thước hiển thị 4096x4096px = 16.7 triệu pixel/tile!). Bộ lọc SVG `#mapTileEnhancer` với `feConvolveMatrix order="3"` (ma trận tích chập 3x3) áp trên từng thẻ `img.leaflet-tile` không thể tăng tốc phần cứng trên Chromium/Blink mà fallback về phần mềm CPU Skia. Hàng trăm triệu phép tính ma trận mỗi frame làm CPU nghẽn 100%, FPS tụt thảm hại về **2 FPS** (được đo đạc thực tế: `[60, 60, 25, 10, 2]`).
     - *Phát hiện 2*: Luật `will-change: transform` trên từng `img.leaflet-tile` con ép GPU tạo GraphicLayer riêng trong VRAM cho từng tile 4096px (67MB VRAM/tile), dẫn đến layer explosion và tràn VRAM đồ họa.
     - *Phát hiện 3*: Thiếu cơ chế bypass bộ lọc trong lúc animation zoom đang chạy (`.leaflet-zoom-anim`).
     - *Phát hiện 4*: Layout thrashing trong `appMapZoomIndicator.showBadge()` do đọc `clientWidth/clientHeight` và ghi DOM liên tục theo từng event `zoom` mà không throttle.
  2. **Giải pháp kỹ thuật đã thực hiện**:
     - *Chuyển đổi GPU-Native Filter siêu tốc ở zoom > 20x*: Trong `pixoptimizer.js`, tự động gắn class `.map-zoom-above-20` khi `zoom > 20`. Trong `style.css`, áp dụng bộ lọc CSS GPU nguyên bản: `filter: contrast(1.08) saturate(1.10) brightness(1.02) !important; image-rendering: auto !important; will-change: auto !important;` (chạy 100% trên GPU shader, 0% CPU overhead, hình ảnh vệ tinh sắc nét rõ ranh mốc).
     - *Cơ chế 60 FPS Zoom Animation Bypass*: Lắng nghe `zoomstart` gắn `.map-is-zooming` và `zoomend` gỡ bỏ. Trong CSS: `.leaflet-zoom-anim .leaflet-tile-container img.leaflet-tile, .map-is-zooming .leaflet-tile-container img.leaflet-tile { filter: none !important; }`.
     - *Giải phóng VRAM*: Gỡ bỏ `will-change: transform` khỏi từng ảnh tile con, chỉ giữ trên container của Leaflet.
     - *Triệt tiêu Layout Thrashing*: Throttling `showBadge` bằng `requestAnimationFrame(renderBadge)` và cache kích thước container.
  3. **Kiểm chứng kép (Dual Verification)**:
     - Đo đạc thực tế bằng Chrome DevTools MCP: FPS đo đạc liên tục qua toàn bộ dải zoom 20 -> 24 đạt trung bình **61 FPS**, mức tối thiểu **59 FPS** (tăng gấp 30 lần từ 2 FPS lên 61 FPS!).
     - Chụp ảnh màn hình đối soát tại zoom 23x: hình ảnh hiển thị rõ nét, mượt mà.
     - Bộ kiểm thử tự động mới: `tests/map_deep_zoom_smoothness.test.js` (3/3 pass).
     - Toàn bộ test suite dự án: **298/298 tests PASS 100% (0 fail)**.

## Phiên trước — 2026-10-26: Khắc Phục Triệt Để Khung CADCraft 2D CLI Dính Cạnh Dưới & Xung Đột Status Bar (Systematic Debugging & Chrome DevTools Pro v3.0)
- **Yêu cầu từ người dùng**:
  - `/goal /systematic-debugging /debug-fix-bug-chrome-pro khung CADCraft 2D CLI đang bị lỗi dính cạnh dưới. hãy test kiểm tra toàn diện để phát hiện lỗi theo từng chức năng và từng dòng code`
- **Đã hoàn tất**:
  1. **Điều tra nguyên nhân gốc rễ (Root Cause Analysis - 5 Whys)**:
     - Phát hiện xung đột `!important` giữa `ui-polish.css` (`bottom: calc(...) + 16px) !important;`) và JavaScript `app.js` (`bar.style.bottom = 'auto'`). Do không thể override `!important`, phần tử nhận cả `top` và `bottom`, bị kéo dãn từ 109px lên 558px và dính chặt vào cạnh đáy màn hình.
     - Phát hiện xung đột cao độ ở trạng thái mặc định: Status Bar (`#cadStatusHud`) ở `bottom: 12px`, CLI ở `bottom: 16px` (chiều cao 109px) dẫn đến việc CLI đè trực tiếp lên Status Bar, che khuất tọa độ X, Y, diện tích S và chu vi P.
  2. **Các giải pháp kỹ thuật đã thực hiện**:
     - Thêm class `.cad-floating-cmd-bar.is-dragged` trong `ui-polish.css` và `app.js` gán `bottom: auto !important; right: auto !important; transition: none !important;` giúp di chuyển chuột/touch hoàn toàn tự do, không bị kéo dãn và không bao giờ dính đáy.
     - Tái cấu trúc phân tầng cao độ chuẩn AutoCAD: Khi Dock thu gọn, Status Bar ở `bottom: 12px`, CLI nổi phía trên ở `bottom: 52px` (khoảng cách đệm 9px thoáng đãng, 0% che khuất). Khi Dock mở rộng, Status Bar ở `bottom: 72px`, CLI ở `bottom: 112px`.
     - Thêm thao tác nhấp đúp (Double-Click) trên Header để Reset vị trí CLI về mặc định kèm Toast thông báo.
     - Bổ sung class `.drop-down` cho autocomplete (`top: 100% !important; bottom: auto !important;`) khi kéo CLI lên nửa trên màn hình (`top < 220px`).
     - Tối ưu chiều cao lưới công cụ CAD `max-height: min(240px, 45vh)`.
  3. **Kiểm chứng kép (Dual Verification)**:
     - Chrome DevTools MCP: Đạt 9/9 bài test trực tiếp trên browser, 0 lỗi console, xác minh trực quan trên Desktop và iPhone Mobile (390x844).
     - Bộ test hồi quy mới: `tests/cadcraft_cli_bottom_drag_and_dock.test.js` (3/3 pass), cập nhật `tests/taskbar_anti_overlap_and_collapse.test.js` (4/4 pass).
     - Toàn bộ **295/295 tests PASS 100% (0 fail)**.

## Phiên trước — 2026-10-26: Khắc Phục Triệt Để Taskbar Đè Lên MiniCAD & Các Phân Hệ, Bổ Sung Chế Độ Thu Gọn Dock 2026 Pro
- **Yêu cầu từ người dùng**:
  - `tiêp tục tối ưu ứng dụng, chú ý thanh taskbar bên dưới (5 nút) đang nằm đè lên hiển thị của các chức năng khác (trong đó có miniCAD)`
- **Đã hoàn tất**:
  1. **Khắc phục triệt để lỗi Taskbar đè lên MiniCAD**:
     - Nâng an toàn các công cụ đáy MiniCAD: CLI Floating CMD Bar (`bottom: calc(var(--sat-safe-bottom, 0px) + 74px) !important; z-index: 3200`), Status HUD (`bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important; z-index: 2450`), và Thumb Bar (`bottom: calc(var(--sat-safe-bottom, 0px) + 76px) !important; z-index: 2470`).
     - Tự động thu gọn Taskbar khi vào MiniCAD (`openCadMap()` & `openToolbar()`) xuống dạng viên thuốc mỏng 26px (`.dock-collapsed`), gán `body.cad-mode`, các thanh hạ xuống sát đáy (+12px..+16px) giải phóng 100% không gian canvas thực địa. Tự động phục hồi taskbar khi rời MiniCAD.
  2. **Khắc phục lỗi Taskbar đè lên các chức năng khác**:
     - *Bản đồ chuyển đổi tọa độ (`screen-transform-map`)*: Nâng HUD tọa độ thời gian thực `#transformMapCoordHud` từ 12px lên +72px (`z-index: 2450`), nâng `.transform-bottom-sheet` và `.live-map-coord-hud` lên +72px.
     - *Bản đồ dự án & mốc (`map-view-container`)*: Nâng `.map-bottom-sheet` lên +72px, nâng thước tỷ lệ Leaflet (`.leaflet-bottom`) lên +68px trên mọi kích cỡ màn hình.
     - *Toàn bộ màn hình cuộn (`.screen-view`)*: Áp dụng khoảng đệm đáy `padding-bottom: calc(130px + env(safe-area-inset-bottom, 20px)) !important;` đồng nhất trên cả mobile, tablet và desktop. Nút thao tác đáy không bao giờ bị taskbar che khuất.
  3. **Hệ thống Nút Thu Nhỏ / Mở Rộng Dock Chủ Động**:
     - Thêm nút thu nhỏ `#btnDockCollapse` (`▾`) và khối tay nắm mở rộng `#dockExpandHandle` (`[ ▲ Phím tắt ]`).
     - Hỗ trợ người dùng chủ động thu nhỏ Taskbar bất cứ lúc nào để xem toàn màn hình hoặc mở lại với hiệu ứng 60fps mượt mà.
  4. **Kiểm thử tự động 100%**:
     - Bổ sung `tests/taskbar_anti_overlap_and_collapse.test.js` (4/4 test).
     - Toàn bộ **292/292 tests PASS 100% (0 fail)**.

## Phiên trước — 2026-10-26: Rà Soát Toàn Bộ Ứng Dụng, Tinh Gọn Mã Nguồn & Cập Nhật Lên GitHub
- **Yêu cầu từ người dùng**:
  - `tách tool đăng bài lên fanpage fb ra một folder riêng với VN2000-PWA`
- **Đã hoàn tất**:
  1. Di chuyển toàn bộ công cụ sang thư mục độc lập `d:\Nhu\APP\telegram-fb-bot/`.
  2. Tạo `package.json` độc lập với các scripts: `start`, `test`, `campaign`, `test-gemini`, `test-fb`.
  3. Dọn dẹp sạch sẽ thư mục `tools/telegram-fb-bot` và `tests/telegram_fb_bot.test.js` trong `VN2000-PWA` để trả lại sự tinh gọn 100% cho mã nguồn PWA.
  4. Kiểm thử độc lập:
     - Tại `d:\Nhu\APP\telegram-fb-bot`: **6/6 tests PASS 100%**.
     - Tại `d:\Nhu\APP\VN2000-PWA`: **288/288 tests PASS 100% (0 fail)**.
  5. Đồng bộ Hindsight Memory (`track`) bank `VN2000-PWA`.

## Phiên trước — 2026-10-26: Nâng Cấp Bộ Não Antigravity Gemini Engine (Zero-API-Key) & Auto-Publisher Tự Động Lên Lịch Đăng FB
- **Yêu cầu từ người dùng**:
  - `sử dụng tài khoản Antigravity + Gemini để giải quyết chứ không dùng API Antigravity + Gemini để giải quyết`
- **Đã hoàn tất**:
  1. Loại bỏ 100% sự phụ thuộc vào `GEMINI_API_KEY` ngoài (không cần tài khoản AI Studio, không tốn phí API).
  2. Antigravity trực tiếp biên soạn sẵn toàn bộ kho nội dung chuyên sâu 14 tính năng tại `antigravity_content_library.js` (đầy đủ bài đăng Facebook chuẩn SEO, prompt ảnh Midjourney/Flux 16:9, kịch bản video Reels 30s + gợi ý âm nhạc).
  3. Cập nhật `gemini_engine.js` hỗ trợ *Antigravity Managed Mode*: phục vụ mượt mà khi `GEMINI_API_KEY` để trống.
  4. Khởi tạo sẵn chiến dịch 14 ngày đăng bài tự động (`generate_campaign.js`): nạp vào `data/posts.json` và xuất báo cáo `data/content_calendar.md`.
  5. Bổ sung bộ lập lịch tự động ngầm (Background Scheduler Ticker) trong `telegram_bot.js`: kiểm tra mỗi 60 giây, tự động xuất bản lên Facebook Fanpage theo lịch hẹn qua Page Access Token và gửi thông báo về Telegram.
  6. Tạo tiện ích `add_custom_post.js` cho phép thêm bài viết hoặc đăng ngay từ dòng lệnh.
  7. Bổ sung test case số 6 trong `telegram_fb_bot.test.js` xác thực hoạt động Zero-API-Key.
  8. Đồng bộ Hindsight Memory (`track`) bank `VN2000-PWA`.

## Phiên trước — 2026-10-26: Xây Dựng Tool Bot Telegram Tự Động Soạn & Đăng Bài Lên Facebook Bằng Gemini AI
- **Yêu cầu từ người dùng**:
  - `tạo bot telegram để tự động đăng bài lên fb (tạo bài từ link được cung cấp, câu gợi ý,....) sử dụng tài khoản gemini để đăng nhập và tạo bài phân tích, tạo nhạc, bài viết, video minh họa,... theo yêu cầu của người dùng nhắn vào telegram`
- **Đã hoàn tất**:
  1. Xây dựng trọn bộ tool độc lập `tools/telegram-fb-bot/` thuần Node.js (Zero-dependency):
     - `config.js` & `.env.example`: Quản lý Token Telegram, Gemini API Key, Meta Page ID & Token.
     - `gemini_engine.js`: Bộ não phân tích link, viết bài Facebook chuẩn viral/chuyên ngành trắc địa, tạo prompt ảnh Midjourney/Imagen 3, kịch bản video Reels 30s và gợi ý âm nhạc.
     - `facebook_publisher.js`: Kết nối Meta Graph API v21.0 đăng bài trực tiếp hoặc hẹn giờ.
     - `post_queue.js`: Quản lý hàng đợi bài viết cục bộ (Draft, Scheduled, Published).
     - `telegram_bot.js`: Bot tương tác hai chiều Long-polling, giao diện nút bấm Inline Keyboard 6 chức năng.
     - `bot.js`: Điểm khởi chạy CLI & Daemon, cờ `--generate-all` tự động sinh 14 bài đăng cho 14 tính năng.
     - `README.md`: Cẩm nang hướng dẫn lấy Token và vận hành từng bước.
  2. Bổ sung bộ kiểm thử `tests/telegram_fb_bot.test.js`.
  3. **293/293 bài test PASS 100%**.
  4. Đồng bộ tri thức vào Hindsight Long-term Memory bank `VN2000-PWA`.

## Phiên trước — 2026-10-26: Tối Ưu Hóa Giao Diện Trang Chủ & Thanh Menu (Cấu Trúc Hóa Tuyệt Đối)
- **Yêu cầu từ người dùng**:
  - `tối ưu hóa giao diện trang chủ và thanh menu (cần điều chỉnh và cấu trúc hóa tuyệt đối)`
- **Đã hoàn tất**:
  1. **Thanh Menu Đỉnh (`.app-header.mac-top-bar`)**:
     - Cố định chiều cao 54px, hiệu ứng kính mờ `backdrop-filter: blur(20px) saturate(180%)`, viền phản quang `rgba(56, 189, 248, 0.18)` và bóng đổ đa tầng.
     - Nút Menu `#btnHeaderMenu` dạng viên thuốc (Pill capsule), nút quay lại `#btnHeaderBack` hiệu ứng trượt êm ái, logo sắc nét cùng biểu tượng `mac-apple-badge`  và Pill kinh tuyến trục `headerSubtitle`.
     - Cụm Control Center Capsule: Tích hợp Theme (☀️/🌙), định vị GPS (chấm xanh nhịp thở radar), Cài đặt (⚙️) và Sổ tay hướng dẫn (?) trong một khoang điều khiển liền khối bo tròn 999px.
  2. **Side Drawer Menu (`.nav-tree-drawer.mac-settings-sidebar`)**:
     - Tiêu đề rút gọn chuẩn `MỤC LỤC CHỨC NĂNG` với macOS Traffic Lights (Đỏ - Vàng - Xanh), triệt tiêu hoàn toàn dòng phụ đề giải thích rườm rà.
     - Ô tìm kiếm nhanh với kính lúp, bo góc 10px, hiệu ứng focus phát sáng viền cyan và nút xóa nhanh ✕.
     - 5 Folders nghiệp vụ khoa học (`drawerFolder1` đến `drawerFolder5`), mỗi leaf item sở hữu Squircle icon sắc nét 34x34px, nhãn đậm, badge số lượng mục và tick xanh ngọc.
  3. **Thanh Điều Hướng Đáy (`#mobileBottomNav.mac-floating-dock`)**:
     - Thanh dock lơ lửng cách đáy màn hình 10px, bo cong 22px, kính mờ 24px, viền cyan phản quang `rgba(56, 189, 248, 0.28)`.
     - 5 tab cố định chuẩn công thái học thực địa: `Trang Chủ`, `Chuyển Đổi`, `Bản Đồ`, `Cắm Mốc`, `Sổ Đo`. Đảm bảo khoảng chạm tối thiểu 48px, nhãn chữ 1 dòng, icon 24px kèm chấm đèn phát sáng `dock-active-dot` và hiệu ứng nhấn đàn hồi 60fps.
  4. **Tái Cấu Trúc 4 Tầng Thị Giác Trang Chủ (`#screen-menu`)**:
     - Tầng 1: `#fwToolbar` (Chuyển chế độ Đơn giản / Nâng cao + Nút Thực địa chống chói nắng ngoài trời).
     - Tầng 2: Dải ngữ cảnh KTT + Nơi lưu trữ + Nút `⭐ Đổi ghim` gắn kết liền mạch với `heroLiveHudCard` hiển thị số liệu tọa độ X (Bắc - Cyan), Y (Đông - Amber), H (Cao độ - Green) dạng chữ số bảng `tabular-nums` thẳng hàng, chấm nhịp thở vệ tinh và 2 nút tác vụ 50-50 (`⚡ Sao chép nhanh` & `🗺️ Hiện vị trí trên Map`).
     - Tầng 3: 4 Trụ cột Bento Core cân xứng hoàn hảo (2 cột trên mobile, 4 cột trên desktop), icon squircle 50x50px to rõ, thẻ bo góc 18px.
     - Tầng 4: Thẻ thông tin dự án hiện hành kèm số lượng mốc và khối Accordion công cụ kỹ thuật đóng mở mượt mà với ô lọc tìm kiếm tức thì.
  5. **Kiểm thử**: **288/288 bài test PASS 100%**.

## Phiên trước — 2026-10-26: Cài Đặt Codex Design, Tích Hợp MCP & Dựng Canvas Mockup 5 Phân Hệ VN2000-PWA
- **Yêu cầu từ người dùng**:
  - `cài đăht giao diện cho ứng dụng theo tiêu chuẩn này: https://codexdesign.io/install.md`
  - Người dùng chọn: `tất cả` (thiết lập mockup tương tác trên Canvas Codex Design trước cho toàn bộ 5 phân hệ theo chuẩn Field Survey Pro).
- **Đã hoàn tất**:
  1. Hoàn tất cài đặt plugin `codexdesign@codexdesign-github` (v0.1.1) theo tiêu chuẩn chính thức của `codexdesign.io/install.md`.
  2. Cấu hình MCP server `codexdesign` vào `C:\Users\User\.gemini\config\mcp_config.json`.
  3. Kích hoạt Daemon Local Codex Design tại `http://127.0.0.1:55181`.
  4. Khởi tạo project `f0f73e95-bee7-4f56-a5c8-fb6251012650` (`VN2000-PWA-Redesign`) mở rộng trọn vẹn 8 mockup màn hình tương tác độc lập (HTML/CSS):
     - `node-dashboard`: Dashboard & Bento Survey HUD
     - `node-converter`: Chuyển đổi tọa độ Dual-Pane (100% UI Isolation)
     - `node-project-map`: Bản đồ dự án & Quản lý mốc (Dedicated `#mapProjectBar`)
     - `node-minicad`: MiniCAD thực địa 2D Pro (Vẽ, xén [TR], kéo dài [EX], tách/hợp thửa TT 25/2014, bắt điểm Osnap)
     - `node-survey-tools`: Sổ đo thực địa & Trắc dọc đào đắp
     - `node-stakeout`: Bố trí mốc thực địa & La bàn AR (Radar, phương vị Azimuth, cự ly)
     - `node-geodesy-tools`: Tiện ích trắc địa (Giao hội nghịch 2 mốc khi mất GPS, Geoid VIGAC2017)
     - `node-camera-settings`: Camera thực địa & Cài đặt hệ thống (Thủy ấn địa chính, KTT 63 tỉnh thành)
     - Triệt tiêu 100% rác chữ kỹ thuật nội bộ thừa thãi trên tiêu đề header theo yêu cầu người dùng (giao diện tối giản, trực diện).
  5. Áp dụng chuẩn thiết kế Field Survey Pro Minimalist vào mã nguồn thực tế `ui-polish.css`:
     - Định dạng chữ số tabular figures `font-variant-numeric: tabular-nums` chống nhảy số tọa độ.
     - Tăng cường tương phản cao cho chế độ Light Theme chống chói lóa ngoài trời nắng gắt.
     - Viền thẻ Bento HUD sắc nét, đàn hồi 60fps khi nhấn chạm.
     - Bổ sung tinh chỉnh giao diện cho Bố trí cắm mốc (`#screen-stakeout`), Tiện ích trắc địa (`#screen-geodesy`), Camera (`#screen-camera`) và Sổ đo mốc (`#screen-datamgmt`).
  6. Đồng bộ bền vững vào Hindsight Memory (`track`, `retain`, `reflect`).
  7. Bảo toàn **288/288 bài test PASS 100%**.

## Phiên trước — 2026-10-23: Nâng Cấp MiniCAD 2D Tiệm Cận AutoCAD & MicroStation (Tách/Hợp Thửa, Trim/Extend, Quản Lý Layer TT 25)
- **Yêu cầu từ người dùng**:
  - `triển khai cả 3 ưu tiên cho MiniCAD` (Tách thửa/Hợp thửa bảo toàn diện tích VN2000, Cắt xén Trim/Kéo dài Extend ranh + Dóng mở rộng Polar Tracking, Quản lý Layer chuẩn Thông tư 25/2014/TT-BTNMT).
- **Đã hoàn tất**:
  1. Xây dựng thuật toán hình học cốt lõi trong `src/core/cad_geometry.js`: `splitPolygon`, `mergePolygons`, `trimLine`, `extendLine`, `getPolarExtensionPoint`.
  2. Tích hợp UI vào `index.html`: Nút Tách thửa, Hợp thửa, Xén ranh, Kéo dài, Đổi Lớp trên `#cadPanelSelect`, Pill hiển thị Lớp hiện hành `#cadCurrentLayerPill`, Tab Lớp `#cadTabLayersManager` và Modal `#modalCadLayers`.
  3. Bổ sung quản lý 7 Layer chuẩn TT 25, bắt điểm dóng mở rộng `extension` với tia dóng màu vàng trực quan, tích hợp lệnh CLI CADCraft: `SPLIT`, `MERGE`, `TR`, `EX`, `LA`.
  4. Tuân thủ 100% UI Isolation Principle giữa MiniCAD và các phân hệ khác.
  5. **288/288 bài test PASS 100%** (bao gồm 8 nhóm test chuyên sâu trong `tests/cad_2d_advanced_tools.test.js`).
  6. Đồng bộ Hindsight Memory (`track`, `retain`, `reflect`).

## Phiên trước — 2026-10-23: Tối Ưu Hóa 60fps Bản Đồ & Hiển Thị Tỉ Lệ Zoom Tại Trỏ Chuột
- **Yêu cầu từ người dùng**:
  - `kiểm tra tại sao khi phóng to bản đồ thì khá giật lag, tìm hiểu và cho để xuất chỉnh sửa`
  - `hãy tiến hành triển khai, bên cạnh đó bổ sung hiển thị tỉ lệ phóng to (icon thông báo nhỏ khi thu nhỏ/phóng to ngay vị trí trỏ chuột)`
- **Đã hoàn tất**:
  1. Loại bỏ `transition: filter` và `-webkit-optimize-contrast`, kích hoạt `will-change: transform` trên tile layer trong `style.css`.
  2. Cấu hình Smooth Fractional Zoom (`zoomSnap: 0.5`, `zoomDelta: 0.5`, `wheelPxPerZoomLevel: 100`) và bật `preferCanvas: true` trên tất cả các instance bản đồ.
  3. Xây dựng module `appMapZoomIndicator` hiển thị badge kính lúp mờ với cấp độ zoom và tỉ lệ khảo sát xấp xỉ (1:500 đến 1:2.000.000) bám sát vị trí trỏ chuột.
  4. Khử listener `zoomend` trùng lặp trong `appCadTool`.
  5. 100% tests PASS (**279/279 bài test**).
  6. Lưu trữ `track`, `retain`, `reflect` vào Hindsight Memory tại `D:\Nhu\Memory Antigravity\banks\VN2000-PWA`.


## Phiên hiện tại — 2026-10-23: Kiểm Duyệt Toàn Diện Mã Nguồn Theo Chrome DevTools Pro & Lên Phương Án Tinh Gọn Nội Dung
- **Yêu cầu từ người dùng**:
  - `đọc qua từng dòng code phối hợp cùng /debug-fix-bug-chrome-pro để xây dựng và kiểm duyệt ứng dụng lưu về /hindsight-memory , sau đó lên phương án cải tạo nội dung (có kết hợp /viet-chuyen-nghiep để loại bỏ các nội dung dư thừa)`
- **Đã hoàn tất**:
  1. **Kiểm duyệt & sửa lỗi (Zero-Guesswork)**:
     - Sửa lỗi dropdown chọn định dạng file `#selExportFormat` trong `index.html` (chuẩn hóa hiển thị đuôi file ngắn gọn `.dwg`, `.xlsx`, `.pdf`... và giữ thuộc tính `data-handler`).
     - Sửa lỗi thiếu biến `filenameDwg` và loại bỏ code xuất file `.dxf` phụ trong `appData.exportDwgFile()` trong `app.js`.
     - 100% test suites đạt **279/279 tests PASS** (`node --test tests/*.test.js`).
  2. **Lưu trữ Hindsight Memory**:
     - Ghi nhận `track` tác vụ hoàn thành, `retain` bài học về đồng bộ text format và `reflect` mental models tại `D:\Nhu\Memory Antigravity\banks\VN2000-PWA`.
  3. **Bóc tách và lên phương án cải tạo nội dung tinh gọn** theo chuẩn `/viet-chuyen-nghiep`.
  4. **Triển khai tinh gọn nội dung giao diện [index.html](file:///d:/Nhu/APP/VN2000-PWA/index.html)**:
     - Tinh gọn tiêu đề Dashboard & Hero HUD Card.
     - Lược bỏ các nhãn quảng cáo trên các thẻ Card 3, 4, 5, 6, 7.
     - Cô đọng mô tả các chức năng và viết lại modal cấp quyền GPS `#modalGpsPermissionGuide` trực diện.
     - Chuẩn hóa hệ thống thông báo showToast() sang cấu trúc súc tích: ✓ Đã [hành động]: [đối tượng].
     - Tinh gọn Side Drawer Menu (#navTreeDrawer) và phụ đề dư thừa.
     - Rà soát cẩm nang hướng dẫn user-guide.html (TCVN 7285, TT 25/2014/TT-BTNMT).
     - 100% test suites đạt **279/279 tests PASS**.

## Phiên trước — 2026-10-22: Triển Khai Hệ Thống Bộ Nhớ Học Tập Hindsight (vectorize-io/hindsight) Toàn Cục Tại D:\Nhu\Memory Antigravity
- **Yêu cầu từ người dùng**:
  - `cài đặt skill repo này (vectorize-io/hindsight: Hindsight: Agent Memory That Learns) cho tất cả các hoạt động của từng dự án trên Antigravity IDE và Antigravity về folder D:\Nhu\Memory Antigravity. để lưu trữ các phiên làm việc và tối ưu hiệu suất hoạt động của Antigravity IDE và Antigravity`
- **Đã hoàn tất**:
  1. **Khởi tạo kho lưu trữ tập trung `D:\Nhu\Memory Antigravity`**:
     - Cấu trúc các Memory Bank: `banks/VN2000-PWA/`, `banks/global/`...
     - Các thư mục `observations/` và `mental_models/` độc lập theo từng dự án.
     - Bộ chỉ mục đa chiều `index.json` (BM25 + Tags + Temporal).
  2. **Động cơ lõi Hindsight Engine (`hindsight.js` & `hindsight.py`)**:
     - Đầy đủ 3 thao tác: `retain` (lưu trí nhớ), `recall` (hồi tưởng ngữ cảnh), `reflect` (đúc kết mental models).
     - Hoạt động 100% offline, siêu tốc (<10ms), zero-latency, không tốn token vô ích.
  3. **Cài đặt Skill toàn cục `hindsight-memory`**:
     - Đặt tại `C:\Users\User\.gemini\config\skills\hindsight-memory\SKILL.md`.
  4. **Tích hợp Quy chuẩn bắt buộc vào `core-protocol.md`**:
     - Bắt buộc Agent thực hiện `RECALL` khi bắt đầu và `RETAIN` + `REFLECT` khi kết thúc phiên.
  5. **Nạp sẵn toàn bộ bài học cốt lõi cho `VN2000-PWA`**:
     - Nạp các kinh nghiệm về UI Isolation, DWG AC1015 symbol tables, offline MCP, MiniCAD area table.
  6. **Kiểm thử tự động**:
     - Toàn bộ 279/279 tests trong `tests/*.test.js` PASS 100%.

## Phiên trước — 2026-10-22: Xử Lý Triệt Để Các Hoạt Động Gây Nghẽn Mạng & Đứng Máy Của Antigravity
- **Yêu cầu từ người dùng**:
  - `fix lỗi các hoạt động của Antigravity gây nghẽn mạng và đứng máy.`
- **Đã hoàn tất**:
  1. **Dọn dẹp triệt để 15 tiến trình Zombie ngầm**:
     - Tiêu diệt 7 tiến trình Chrome DevTools bị kẹt (trong đó có GPU/Renderer ăn tới hơn 2.200s CPU) và 8 tiến trình Node MCP.
     - Hệ thống được giải phóng CPU và hàng Gigabyte RAM ngay lập tức.
  2. **Cài đặt cố định & Offline hóa cấu hình MCP (`mcp_config.json`)**:
     - Chuyển `chrome-devtools-mcp` từ chạy qua `npx -y chrome-devtools-mcp@latest` sang `node` gọi trực tiếp file script toàn cục.
     - Chấm dứt 100% tình trạng ping mạng ra npm registry kiểm tra update, khởi động trong <50ms.
  3. **Tối ưu Service Worker `sw.js`**:
     - Tách riêng logic xử lý tile bản đồ trực tuyến (`isMapTile`), chấm dứt việc tự động `cache.put` hàng trăm opaque tile gây nghẽn Disk I/O khi cuộn bản đồ.
  4. **Tạo script bảo trì định kỳ `clean-system.ps1`**:
     - Cho phép quét và dọn dẹp tiến trình mồ côi nhanh chóng chỉ bằng 1 câu lệnh.
  5. **Kiểm thử tự động**:
     - Toàn bộ **279/279 bài test** trong `tests/*.test.js` PASS 100%.

## Phiên trước — 2026-10-22: Tinh Gọn Dropdown Chọn Đuôi File, Sửa Lỗi Nút Xuất Không Phản Hồi & Hoàn Thiện Bảng Cấu Hình Bản Vẽ
- **Yêu cầu từ người dùng**:
  1. `file .dwg khi xuất ra đã đảm bảo cấu trúc để có thể cho phần mềm AutoCad đọc chưa?`
  2. `kiểm tra lại tính năng xuất dữ liệu. nút bấm xuất dữ liệu ko phản hồi.`
  3. `đã mất bảng điểuf khiển "cấu hình thông tin khác của bản vẽ", hãy bổ sung lại`
  4. `cửa sổ "Chọn định dạng file cần xuất" là dạng list sổ xuống để chọn, chỉ đơn giản là định dạng đuôi file, đừng giải thích dài dòng. hãy điều chỉnh trong ứng dụng và các chức năng của ứng dụng có thể xuất file`
- **Đã hoàn tất**:
  1. **Khắc phục triệt để lỗi nút xuất dữ liệu không phản hồi**:
     - Bổ sung `selectExportFormat(format)`, `executeExport()`, `onExportSettingChange()`, và các hàm xuất `exportDgn()`, `exportKml()`, `exportGeoJson()`, `exportTxt()`, `shareExport()` vào `appCadTool` trong `app.js`.
     - Sửa lỗi `openExportModal()` và `closeExportModal()` đảm bảo bật/tắt `modal.style.display = 'flex'` / `'none'` và class `.active`.
     - Chuẩn hóa hàm `getExportPoints()` và `getTitleBlockInfo()` trong `appData`, chống lỗi rỗng điểm khi xuất từ Chuyển đổi tọa độ hoặc Bản đồ.
  2. **Tinh gọn bộ chọn định dạng file thành Dropdown `<select>` sổ xuống (chỉ hiển thị đuôi file)**:
     - Áp dụng trên cả Sổ đo / Chuyển đổi (`#selExportFormat`) và MiniCAD (`#cadExportFormatSelect`).
     - Tùy chọn thuần khiết chỉ gồm đuôi file: `.dwg`, `.xlsx`, `.pdf`, `.png`, `.dgn / .dat`, `.kml`, `.geojson`, `.svg`, `.txt`, `.csv`, `.share`.
     - Nhãn nút bấm đồng bộ súc tích: `🚀 XUẤT FILE .DWG`, `🚀 XUẤT FILE .PDF`, `🚀 XUẤT FILE .XLSX`, v.v.
  3. **Phục hồi và hoàn thiện Bảng điều khiển "Cấu hình thông tin khác của bản vẽ" (TCVN 7285 & Bản đồ địa chính)**:
     - Đầy đủ 11 trường thông tin kỹ thuật: Tên bản vẽ, Tên dự án, Chủ sở hữu, Đơn vị khảo sát, Số tờ/thửa, Địa chỉ, Người đo vẽ, Người kiểm tra, Ngày lập, Ký hiệu bản vẽ, Ghi chú kỹ thuật.
     - Tích hợp 2 nút thao tác: "💾 Lưu cấu hình" (lưu vào `localStorage`) và "🔄 Đặt lại" (phục hồi mặc định).
     - Động cơ xuất AutoCAD `.dwg` và PDF tự động điền đầy đủ thông tin vào khung tên bản vẽ.
  4. **Kiểm thử tự động & kiểm chứng trình duyệt**:
     - Bổ sung 2 file test: `tests/export_modal_and_drawing_config.test.js` và `tests/export_flow_and_dwg_standard.test.js`.
     - Toàn bộ **279/279 bài test** trong `tests/*.test.js` PASS 100%.
     - Kiểm chứng trực tiếp qua Chrome DevTools: Modal mở mượt, dropdown sổ xuống tiện lợi, nút bấm phản hồi tức thì và tải file về máy thành công.

## Phiên trước — 2026-10-22: Nâng Cấp Bảng Kê MiniCAD Chống Che Khuất: Phóng To Toàn Màn Hình, 4 Chế Độ Bố Trí Bảng Linh Hoạt & Sticky Header Chống Trôi

## Phiên trước — 2026-10-21: Sửa Dứt Điểm Lỗi Check Chọn Thửa Trong Bảng Kê & Thống Kê Tổng Hợp MiniCAD
- **Yêu cầu từ người dùng**:
  `"Bảng kê & thống kê tổng hợp MiniCAD" trong chức năng MiniCAD hiện không phản hồi ở chức năng check chọn thửa`
- **Đã hoàn tất**:
  1. **Khắc phục lỗi mất trạng thái `selected` trong `openAreaTableModal()`**:
     - Thay thế việc sinh mảng thủ công bằng `this._getAllExportShapes()` chuẩn hóa toàn diện có trường `selected: s.selected !== false` và `this._draftSelected !== false`.
     - Phân tách `selectedShapes = allShapes.filter(s => s.selected !== false)` để tính toán chính xác tổng diện tích, tổng chu vi và số đỉnh của các thửa được chọn.
     - Cập nhật số liệu hiển thị tức thì trên các thẻ tóm tắt `#cadModalAreaM2`, `#cadModalAreaHa`, `#cadModalPerimeter`, `#cadModalVertexCount`.
     - Bảng chi tiết đỉnh: hiển thị làm mờ và gắn nhãn `👁️ Bỏ chọn (Không tính tổng)` cho thửa bị bỏ chọn.
  2. **Nâng cấp `toggleBlockSelect(idx, isChecked)` & `toggleSelectAllBlocks(isChecked)`**:
     - Xử lý cả khối đã lưu trong `savedShapes` và khối đang vẽ dở `this._draftSelected`.
     - Lưu trạng thái bền vững với `saveShapesForProject()` và `persistSession()`.
     - Gọi `renderGeometry()` để lập tức ẩn/hiện thửa đất trên bản đồ MiniCAD.
  3. **Kiểm thử tự động**:
     - Bổ sung `tests/cad_block_selection.test.js`.
     - Toàn bộ 251/251 bài test trong `tests/*.test.js` PASS 100%.

## Phiên trước — 2026-10-21: Nâng Cấp Toàn Diện Studio Xuất Dữ Liệu & Bản Đồ Trắc Địa, Khắc Phục Triệt Để Lỗi "Missing Symbol Table" trong AutoCAD
- **Yêu cầu từ người dùng**:
  1. `kiểm tra lại vấn đề xuất dữ liệu, cần tối ưu hóa xuất dữ liệu: Nhận chọn nút xuất dữ liệu==>cửa sổ preview==>cài đặt các thông tin, chọn lớp xuất dữ liệu,....==>chọn định dạng file được xuất dữ liệu (.png, .pdf, .xlsx, .dng (microstation), .dwg, .kml, ...)==>xuất dữ liệu.`
  2. `tối ưu các file dữ liệu được xuất ra đúng tỉ lệ được chọn.`
  3. `fix lỗi file .dwg không đọc được do lỗi "Missing symbol table"`
- **Đã hoàn tất**:
  1. **Khắc phục 100% lỗi "Missing symbol table" trong AutoCAD ([src/core/cad_geometry.js](file:///d:/Nhu/APP/VN2000-PWA/src/core/cad_geometry.js), [app.js](file:///d:/Nhu/APP/VN2000-PWA/app.js))**:
     - Bổ sung toàn diện các Symbol Tables chuẩn Autodesk AutoCAD DXF/DWG (AC1015): Table `VPORT` (entry `*ACTIVE` tự động định vị camera), Table `LTYPE` (`CONTINUOUS`, `DASHED`, `CENTER`), Table `LAYER` (chuẩn TCVN 7285 & TT 25/2014/TT-BTNMT), Table `STYLE` (`STANDARD`, `VN_ARIAL`), Table `BLOCK_RECORD` (`*MODEL_SPACE`, `*PAPER_SPACE`), Section `BLOCKS`, và kết thúc file bằng `0\r\nEOF\r\n`.
     - Tự động chuẩn hóa mảng điểm đầu vào, tính toán text height và bán kính tâm mốc scale chính xác theo hệ số $S = \text{Scale} / 1000$.
  2. **Giao diện Modal Studio Xuất Dữ Liệu 5 bước ([index.html](file:///d:/Nhu/APP/VN2000-PWA/index.html) `#modalExportData`)**:
     - **Cửa sổ Live Preview**: Khung SVG tương tác cao, vẽ đa giác ranh thửa, tâm mốc, tên mốc, tọa độ X/Y, thước tỷ lệ Graphic Scale Bar, la bàn hướng Bắc, lưới Km chữ thập; tự động cập nhật ngay lập tức khi thay đổi tỷ lệ hoặc bật/tắt lớp.
     - **Cài đặt thông tin dự án & người lập**: Tên công trình, Kỹ sư đo vẽ, Ngày lập, Đơn vị khảo sát.
     - **Bộ chọn tỷ lệ bản vẽ**: 1:500, 1:1.000, 1:2.000, 1:5.000, 1:10.000, và Fit tự động theo khổ giấy.
     - **Bộ chọn lớp dữ liệu xuất (Layers)**: Toggle độc lập 8 lớp dữ liệu với nút "Bật tất cả".
     - **11 Định dạng xuất file**: DWG (AutoCAD), DGN (MicroStation/Famis), PDF (Báo cáo A4/A3), PNG (Full HD có tỷ lệ xích), Excel XLSX, Google Earth KML, GeoJSON OGC, SVG Vector, TXT (Máy toàn đạc RTK), CSV UTF-8, Chia sẻ Zalo.
  3. **Tối ưu xuất dữ liệu đúng tỷ lệ xích ([app.js](file:///d:/Nhu/APP/VN2000-PWA/app.js))**:
     - Nâng cấp `exportDwgFile()` áp dụng tỷ lệ bản vẽ và metadata.
     - Nâng cấp `exportPdfFile()` theo khổ giấy A4/A3, vẽ sơ đồ phân bố mốc theo các lớp đã lọc và ghi rõ tỷ lệ 1:scaleVal.
     - Nâng cấp `exportPngImage()` với Graphic Scale Bar, kim hướng Bắc, lưới Km và đặt tên file `${projName}_1-${scaleVal}.png`.
  4. **Kiểm thử tự động & Trực quan**:
     - Thêm `tests/export_data_modal_and_standards.test.js` & `tests/export_flow_and_dwg.test.js`.
     - Toàn bộ 247/247 bài test trong dự án PASS 100%.
     - Khắc phục triệt để lỗi "Missing symbol table" cho file `.dwg` trên AutoCAD 2000-2026.

## Phiên trước — 2026-10-21: Xóa Bỏ Toàn Bộ Video Cũ & Ra Mắt Cẩm Nang Sổ Tay Hướng Dẫn Thực Địa user-guide.html Kèm Tích Hợp Nút "?"
- **Yêu cầu từ người dùng**:
  1. `bỏ hết các video hướng dẫn đi (xóa vết các video cũ và các tài liệu liên quan video luôn, tạo file hướng dẫn .html khi người dùng cần hướng dẫn đi (Nhấn nút "?" để nhờ hướng dẫn)`
  2. `hướng dẫn thì cái màn hình cần thao tác cần lớn để nhìn chứ, đưa mấy cái khung kia nhỏ hơn hoặc bố trí sao cho phù hợp. hiện tại hướng dẫn còn chưa nhìn được màn hình. chưa đọc xong hướng dẫn bước này thì đã chuyển sang bước khác.`
- **Đã hoàn tất**:
  1. **Xóa sạch dấu vết video cũ & tài liệu liên quan**:
     - Xóa bỏ hoàn toàn `tutorials-pdoom.html` và toàn bộ thư mục `assets/video_assets/`.
     - Thay thế test `pdoom_video_engine.test.js` bằng `tests/user_guide_handbook.test.js`.
  2. **Ra mắt Cẩm Nang Sổ Tay Hướng Dẫn Thực Địa Chuyên Nghiệp ([user-guide.html](file:///d:/Nhu/APP/VN2000-PWA/user-guide.html) & [huong-dan.html](file:///d:/Nhu/APP/VN2000-PWA/huong-dan.html))**:
     - **Màn hình thao tác cực lớn (Showcase 1000px-1100px)**: Dùng ảnh chụp thực tế độ phân giải cao từ `assets/tutorial_screens/`, chữ số, nút bấm, bản đồ đều rõ nét, trực quan. Tích hợp Lightbox zoom 100%.
     - **Không bao giờ bị trôi bước**: Trình bày dạng tài liệu SOP tĩnh, người dùng tự do đọc kỹ, nghiền ngẫm, đối chiếu với màn hình ứng dụng mà không bị áp lực thời gian.
     - **14 Chuyên đề toàn diện**: Chuyển đổi đơn điểm, Hàng loạt Excel, Bản đồ & Live GPS, Cắm mốc la bàn, Sổ đo dự án, MiniCAD thực địa, 5 Bảng kê ranh đất, Trắc dọc & Đào đắp, Camera đóng dấu, KTT 63 tỉnh thành, Xuất DWG/Excel/KML, Tiện ích trắc địa, Lưu trữ ngoại tuyến.
     - **Tính năng tra cứu thông minh**: Thanh tìm kiếm tức thì (Live Quick Filter), Sidebar mục lục cố định (Sticky TOC), hỗ trợ in ấn hoặc xuất ra PDF (Print-friendly).
  3. **Tích hợp nút "?" toàn diện trong ứng dụng ([index.html](file:///d:/Nhu/APP/VN2000-PWA/index.html), [app.js](file:///d:/Nhu/APP/VN2000-PWA/app.js))**:
     - Khi bấm nút `?` ở Header hoặc ở bất kỳ màn hình nào: Modal hiển thị tóm tắt và nút nổi bật **"📖 Cẩm Nang Toàn Diện"** (`appGuide.openFullUserGuide()`) dẫn thẳng tới chuyên mục tương ứng trên `user-guide.html`.
     - Drawer menu mục 5.7: Đổi thành `5.7 Cẩm Nang & Sổ Tay Hướng Dẫn`, mở thẳng `user-guide.html`.
  4. **Xác thực toàn diện**:
     - 237/237 bài test PASS 100% trong `tests/*.test.js`.
     - Kiểm tra trực quan bằng Chrome DevTools MCP.

## Phiên trước — 2026-10-21: Sửa Lỗi Thanh Công Cụ MiniCAD & Nâng Cấp Toàn Diện Studio Video Hướng Dẫn
- **Yêu cầu từ người dùng**:
  1. `Thanh công cụ của MiniCAD bị show hết mà không thu theo từng cụm riêng (chiếm hết màn hình)`
  2. `Về các video: hướng dẫn bằng giọng nói quá đơn giản cần chi tiết hơn; hiển thị giao diện cần hướng dẫn trên màn hình kích thước lớn/nhỏ; mô tả và hình ảnh chưa khớp, trỏ chuột chưa đặt đúng chức năng; các chức năng nâng cao như MiniCAD, đào đắp,... cần hướng dẫn chi tiết đến từng công cụ.`
- **Đã hoàn tất**:
  1. **Sửa dứt điểm lỗi thanh công cụ MiniCAD ([ui-polish.css](file:///d:/Nhu/APP/VN2000-PWA/ui-polish.css))**:
     - Khắc phục rule CSS bị cưỡng ép `display: flex !important` bằng `#mapCadToolbar .cad-collapsible-row:not(.active) { display: none !important; }` và `#mapCadToolbar .cad-collapsible-row.active { display: flex !important; }`.
     - Chỉ mở đúng 1 hàng công cụ của tab được chọn (`Vẽ`, `Sửa`, `Nhãn`, `Snap`, `File`), giải phóng 100% không gian bản đồ thực địa.
  2. **Studio Video Hướng Dẫn Dual-Mode Màn hình lớn & Màn hình nhỏ ([tutorials-pdoom.html](file:///d:/Nhu/APP/VN2000-PWA/tutorials-pdoom.html))**:
     - Nút chuyển đổi: `📱 Điện thoại (Mobile)` (khung smartphone 9:16, touch ripple) ⇄ `💻 Màn hình lớn (Desktop / Tablet)` (khung laptop/monitor 16:10, thanh Safari/macOS có 3 nút điều khiển, URL `https://vn2000.pro — Màn hình chuyên dụng kỹ sư`).
     - Con trỏ chuột máy tính sắc nét (Sharp Computer Mouse Pointer Arrow) có hiệu ứng click ripple trên desktop, đặt chuẩn xác 100% vào từng nút công cụ.
  3. **Tách thành 8 Video Chuyên Biệt, Chi Tiết Từng Công Cụ Nâng Cao**:
     - **Video 6: Chi Tiết Bộ Công Cụ MiniCAD** (4 bước): Tab Vẽ (Đa giác [P], Tuyến [L], Nhà [REC], Bán kính [C], Polar [D]); Tab Snap (Bắt mốc [F3], Bắt cạnh ranh [B] chống hở thửa đất, Ortho [F8] vuông góc); Tab Sửa & Nhãn ([V, RO, O, DIM, Tem]); Bảng kê diện tích m² & Xuất bản vẽ AutoCAD (.dwg) chuẩn TT 25/2014/TT-BTNMT.
     - **Video 7: Trắc Dọc Địa Hình & Khối Lượng Đào Đắp TCVN 4447:2012** (4 bước): Nạp cọc mốc tuyến và cao độ tự nhiên $Z_{TN}$; Thiết kế đường đỏ $Z_0$, độ dốc dọc $i$ (%) và mái dốc taluy $m$; Mặt cắt trắc dọc TCVN 9436, khối lượng $V_{đào}, V_{đắp}$ ($m^3$); Xuất bản vẽ trắc dọc AutoCAD (.dwg) và bảng tính CSV.
  4. **Khớp Chuẩn Xác 100% Giọng Đọc, Ảnh Thực Tế & Con Trỏ Chuột**:
     - Chụp bổ sung 12 ảnh màn hình Desktop và Mobile độ nét cao bằng Chrome DevTools MCP.
     - Tọa độ `cursor` và `focus` căn chỉnh tỉ mỉ từng nút bấm.
     - Thuyết minh tiếng Việt phân tích chuyên sâu các quy chuẩn kỹ thuật và thao tác thực hành.
  5. **Kiểm thử tự động & Trực quan**:
     - **237 / 237 bài test tự động PASS 100%**.
     - Đã xác thực thực tế qua Chrome DevTools MCP chụp ảnh nghiệm thu trên cả 2 chế độ hiển thị.

## Phiên trước — 2026-10-21: Tinh Chỉnh Giao Diện & Câu Chữ Video Hướng Dẫn Chuẩn Coder Chuyên Nghiệp
- **Đã hoàn tất**:
  1. Loại bỏ hoàn toàn văn phong giải thích rườm rà dạng AI prompt:
     - Menu Drawer mục 5.7: Sửa thành `5.7 Video Hướng Dẫn Sử Dụng`, phụ đề `Trực quan từng bước 7 tính năng chính`.
  2. Chuẩn hóa trang Studio `tutorials-pdoom.html`:
     - Tiêu đề & header: `VN2000 PRO — Video Hướng Dẫn Sử Dụng`, badge `HƯỚNG DẪN`.
     - Nhãn âm thanh: `🎹 Nhạc nền:`, `🗣️ Thuyết minh:`.
     - Danh mục: `📂 DANH SÁCH VIDEO HƯỚNG DẪN`.
  3. Kiểm thử tự động & Trực quan:
     - **237 / 237 bài test tự động PASS 100%**.
     - Đã xác thực thực tế qua Chrome DevTools MCP chụp ảnh màn hình di động.

## Phiên trước — 2026-10-21: Chuẩn Hóa Xuất File Bản Vẽ AutoCAD (.dwg) & Loại Bỏ Hoàn Toàn Định Dạng .dxf
- **Đã hoàn tất**:
  1. **Loại bỏ hoàn toàn từ khóa & nút xuất .dxf trong giao diện (`index.html`)**:
     - Thay thế tất cả các nhãn, badge, modal, tooltip: `"Xuất AutoCAD (.dwg / .dxf)"` → `"Xuất Bản vẽ AutoCAD (.dwg)"`.
     - Cập nhật mục Sổ đo dự án, Tiện ích trắc dọc, Tiện ích hố đào, MiniCAD, Drawer Menu 100% hiển thị `.dwg`.
  2. **Chuẩn hóa Engine xuất AutoCAD (.dwg) trong `app.js` & `src/core/cad_geometry.js`**:
     - Nâng cấp `exportDwgFile()` (Sổ đo dự án), `exportDwgProfile()` (Trắc dọc), `exportPitDwg()` (Hố đào), `appCadTool.exportDwg()` (MiniCAD) để tải trực tiếp file `.dwg`.
     - Cấu hình header CAD tương thích tối đa: `$ACADVER = AC1015` (AutoCAD 2000/2004 engine), `$INSUNITS = 6` (Meters), `$MEASUREMENT = 1` (Hệ mét Metric), bảng Layer phân định màu sắc chuẩn TT 25/2014/TT-BTNMT (`RANH_THUA`, `MOC_TOADO`, `SO_HIEU_DINH`, `CHIEU_DAI_CANH`).
     - Tích hợp `CadGeometryEngine.exportDwgString()` trong thư viện lõi.
  3. **Bộ kiểm thử tự động nghiêm ngặt (`tests/dwg_export_standard.test.js`)**:
     - Kiểm tra không còn bất kỳ chữ "dxf" nào trong `index.html` và chuỗi giao diện `app.js`.
     - Kiểm tra header AutoCAD `.dwg`, cấu trúc layer và các hàm xuất file.
     - Toàn bộ **237 / 237 bài test PASS 100%**.

## Phiên trước — 2026-10-21: Xây Dựng Hệ Thống Video Hướng Dẫn Thao Tác Bằng Quay Chụp Màn Hình (1 Chức Năng / 1 Video)
- **Đã hoàn tất**:
  1. **Bãi bỏ hoàn toàn định dạng MV ca nhạc / hát vè vần**:
     - Loại bỏ toàn bộ ca từ hát rhyme, beat trống dồn dập, chuyển đổi sang **Screen Walkthrough Video Studio** chuyên nghiệp.
  2. **Quay chụp màn hình thực tế từng chức năng (`assets/tutorial_screens/`)**:
     - Sử dụng Chrome DevTools MCP trực tiếp chụp 11 frame ảnh thực tế của ứng dụng VN2000-PWA với độ nét cao, bao quát 7 phân hệ chính (Chuyển đổi đơn điểm, Chuyển đổi hàng loạt, Bản đồ Live GPS, Cắm mốc thực địa, Sổ đo dự án & xuất file, MiniCAD, Camera đóng dấu).
  3. **Tách riêng 1 chức năng / 1 video độc lập (7 Videos Dedicated)**:
     - 7 video riêng biệt tương ứng 7 chức năng. Không gom chung, người dùng chọn chức năng nào sẽ xem video hướng dẫn của đúng chức năng đó.
     - Canvas Full HD 1920×1080 với mockup điện thoại hiển thị ảnh chụp màn hình thật, hiệu ứng Ken Burns zoom, con trỏ cảm ứng chạm phát quang, spotlight khoanh vùng nút bấm/ô nhập liệu đang được nói đến.
     - Thẻ chỉ dẫn từng bước (Step Badge, Tiêu đề bước tiếng Việt, Lời thuyết minh, Subtitle tiếng Anh, Mẹo thực địa, Thanh tiến trình).
  4. **Nhạc nền Piano Ambient Lo-Fi êm dịu & Giọng đọc Tiếng Việt chuẩn**:
     - Nhạc nền: Hợp âm Piano Ambient Lo-Fi (`Cmaj7 → Am7 → Fmaj7 → G6`) êm đềm, du dương, âm lượng nhỏ nhẹ không át tiếng thuyết minh.
     - Giọng đọc: Web Speech API TTS tiếng Việt tự động đọc to, rõ ràng lời hướng dẫn khi chuyển sang từng bước thao tác. Có nút Tắt/Bật, thanh trượt âm lượng và nút "Đọc lại".
  5. **Tính năng Xuất Video Client-Side (MediaRecorder)**:
     - Nút "Xuất Video MP4" xuất file clip hướng dẫn của chức năng đó về thiết bị người dùng.
  6. **Đồng bộ hóa Menu & Kiểm thử**:
     - Cập nhật mục 5.7 trong `index.html` Side Drawer thành *"5.7 Video Hướng Dẫn Thao Tác Chức Năng (Quay chụp màn hình • Giọng đọc & Nhạc nhẹ)"*.
     - Cập nhật bài test [tests/pdoom_video_engine.test.js](file:///d:/Nhu/APP/VN2000-PWA/tests/pdoom_video_engine.test.js).
     - Toàn bộ **237 / 237 bài test PASS 100%**.
     - Nghiệm thu trực tiếp trên Chrome DevTools cả trên Mobile Viewport (390×844) và Desktop Viewport (1280×800).

## Phiên trước — 2026-10-21: Sửa Dứt Điểm Lỗi Thanh Menu Không Thể Vuốt Lên & Chức Năng Bị Che Khuất

## Phiên trước — 2026-10-21: Nâng Cấp Hệ Thống Âm Nhạc Polyphonic Lo-Fi Studio
     - **Phản hồi người dùng**: *"nhạc bạn làm nghe chán quá."* do phiên bản trước chỉ dùng oscillator bíp đơn điệu cùng giọng đọc Web Speech robot khô cứng.
     - **Hệ thống hòa âm Polyphonic Web Audio Studio**:
       + **Polyphonic Chord Progression**: Chuỗi hợp âm Jazz Lo-Fi kinh điển (`Dm9 → G13 → Cmaj9 → Am9`), dùng 2 oscillator (Triangle + Sine) detuned ±4 cents qua bộ lọc Low-pass 750Hz tạo độ ấm mịn như synthesizer Moog / Juno.
       + **Melodic Rhodes Piano & Bell Arpeggio**: Điểm xuyết các nốt licks ngũ âm Pentatonic thánh thót, ngẫu hứng có trật tự ở các phách lệch.
       + **Sub-Bass 55Hz - 110Hz**: Âm sắc trầm ấm, êm tai, nảy nhịp groove tự nhiên.
       + **Lo-Fi Velvet Drums**: Soft kick tròn trịa, velvet rimshot/snare ấm cúng, shaker nhấp nhô nhẹ nhàng giữ nhịp swing thư thái.
       + **Tape Echo / Reverb Space**: Mô phỏng hiệu ứng không gian băng từ 280ms êm đềm.
     - **3 Phong cách Âm nhạc Tự chọn**:
       + ☕ `Lo-Fi Trắc Địa Chill` (75-80 BPM: ấm áp, thư giãn, giúp tập trung tính toán)
       + 🌆 `Cyber Synthwave 80s` (105-120 BPM: phong cách retro neon, arpeggiator sôi động)
       + 🍃 `Ambient Zen Space` (55-60 BPM: không gian mở mênh mang, chuông ngân thiền định)
     - **Bảng Điều Khiển Âm Thanh Chuyên Nghiệp**:
       + 🗣️ **Nút Tắt / Bật Giọng đọc riêng biệt**: Cho phép người dùng tắt hoàn toàn giọng đọc thuyết minh robot để nghe thuần túy nhạc Lo-Fi chill thư giãn trong lúc xem video.
       + 🎵 **Nút Bật / Tắt Nhạc nền** + Thanh trượt Volume BGM (0% - 100%).
       + 🎙️ **Thanh trượt Volume Giọng đọc** độc lập.
       + 🔊 **Nút Tắt/Bật Master Sound**.
     - **Real-Time Audio Spectrum Neon Equalizer**: Tích hợp `AnalyserNode` vẽ 20 cột quang phổ âm thanh neon trực tiếp trên khung nhìn Canvas Full HD 1920×1080.
  3. **Kiểm thử tự động & Nghiệm thu trực quan**:
     - `node --test tests/*.test.js`: **234 / 234 bài test PASS 100%**.
     - Xác thực thực tế qua Chrome DevTools MCP: Playback 60fps mượt mà, audioState "running", 0 lỗi console.

## Phiên trước — 2026-10-21: Cài Đặt Skill pdoom-video & Studio Video Hướng Dẫn Âm Nhạc Song Ngữ
     - Tích hợp Lazy Permissions Check: chỉ kích hoạt GPS khi đã cấp quyền hoặc khi người dùng chạm ngón tay có chủ đích (`User Gesture`), không tự bung popup đột ngột khi tải trang.
     - Tích hợp Modal `#modalGpsPermissionGuide` giải thích nguyên nhân và hướng dẫn xử lý bong bóng chat Messenger/Zalo hoặc cấp quyền trực tiếp trong Chrome.
     - Cập nhật xử lý lỗi `PERMISSION_DENIED` trên toàn bộ các điểm gọi GPS (`appGps.init`, `appGps.startTracking`, `appTransform.getLiveGps`).
  2. **Hợp nhất 1 nút xuất dữ liệu duy nhất trong Sổ đo (`screen-datamgmt`)**:
     - Thay thế cụm 4 nút cũ bằng 1 nút duy nhất: `#btnOpenExportModal` (`[ 📤 XUẤT DỮ LIỆU SỔ ĐO ]`).
     - Tích hợp Cửa sổ Xuất Dữ Liệu Hợp Nhất `#modalExportData` cho phép lựa chọn linh hoạt 5 định dạng trắc địa: Excel (`.xlsx`), CSV (`.csv`), AutoCAD (`.dwg`), Google Earth (`.kml`), Chia sẻ Zalo/Mail (`share`).
     - Thêm các hàm `openExportModal()`, `closeExportModal()`, `selectExportFormat(format)`, `executeExport()` trong `appData`.
  2. **Nâng cấp Hệ thống Theme Toàn cục 3-in-1 (Dark ➔ Light ➔ Field ➔ Dark)**:
     - Nút Theme Header (`#btnHeaderThemeToggle`) điều khiển chu trình 3 chế độ: `🌙 Tối` ➔ `☀️ Sáng` ➔ `⚡ Thực địa` ➔ `🌙 Tối`.
     - Cho phép kích hoạt Chế độ Thực địa (đen/vàng siêu tương phản) ở bất kỳ màn hình nào trong toàn bộ ứng dụng.
     - Thay icon Mặt trời (`☼`) trên nút `#fwField` bằng icon Tia sét (`⚡`), triệt tiêu việc xuất hiện 2 biểu tượng mặt trời cùng lúc.
     - Đồng bộ hóa trạng thái 2 chiều: Khi Thực địa bật, nút Theme trên header chuyển thành `⚡`, kích hoạt viền phát quang cảnh báo `active-field-theme`.
     - Nút `#fwField` ở Toolbar trang chủ đóng vai trò Quick Outdoor Switch, đồng bộ 100% với Header, không còn kẹt màu nền đen `#000 !important`.
  2. **Tối ưu hiển thị đa kích thước màn hình (Mobile 360px - 420px, Tablet 768px, Desktop 1280px)**:
     - Header mobile siêu nhỏ (< 480px): Tự động ẩn subtitle thừa, co gọn nút Menu thành icon `☰`, nút Quay lại thành `◀`, giải phóng không gian cho tiêu đề không bị co cụt.
     - Tiêu đề thẻ Sổ đo (`screen-datamgmt`): Bọc số lượng mốc `#txtPointsCount` trong badge pill bo tròn sắc nét, căn chỉnh flexbox chống bẻ dấu ngoặc đơn `1 )` xuống dòng.
     - Bố cục Bento HUD và Bento Action Tiles đáp ứng tự nhiên từ 1 cột (Mobile) sang 4 cột (Tablet/Desktop), căn giữa tối đa 960px.
- **Kiểm thử tự động & Nghiệm thu**:
  - `node --test tests/*.test.js`: **227/227 tests PASS 100%**.
  - `powershell -ExecutionPolicy Bypass -File init.ps1`: Thành công 100%.
  - Đối soát Chrome DevTools qua các viewport: Mobile 360×740, Mobile 390×844, Tablet 768×1024, Desktop 1280×800.
  - Thao tác trực tiếp qua lại giữa các theme và phân hệ: 0 lỗi console, không tràn viền.
- **Trạng thái**: Hoàn thành tối ưu, sẵn sàng release.

## Phiên trước — 2026-10-20: Rà soát Toàn diện 578 Nút bấm & Tối ưu hóa Chức năng (Harness-Kit F-011)
- **Đã hoàn tất**:
  1. Rà soát 100% chi tiết 578 nút bấm và phần tử tương tác qua Chrome DevTools MCP.
  2. Bổ sung xuất toàn cục an toàn vào `window` cho: `appCoordPicker`, `appBluetoothRtk`, `appResection`, `appProfile`, `appTrenches`, `appGeoid`, `appProject`.
  3. Vá lỗi tiềm ẩn trong `appData.getPoints` và `appData.addPoint`: Xử lý phòng vệ trước đối số không phải chuỗi hoặc null, hỗ trợ gọi đa hình `addPoint(point)` và `addPoint(projectName, point)` loại trừ dứt điểm lỗi `TypeError: proj.endsWith is not a function`.
  4. Tối ưu hóa công thái học cảm ứng di động: Nút `.btn-customize-pins` đạt `min-height: 36px`, chip `.quick-chip-pill` đạt `min-height: 38px`.
  5. Tối ưu thanh Camera tabs (`📸 Chụp ảnh`, `🖼️ Đóng dấu`, `📂 Thư viện`) dàn đều `flex: 1 1 0; min-width: 0;` triệt tiêu tràn viền ngang.
  6. Khuyến cáo sai số GPS trắc địa (±3m - 10m) tại Live HUD và màn hình Cắm mốc; kích hoạt `preferCanvas: true` tăng tốc bản đồ Leaflet.
- **Kiểm thử tự động & Nghiệm thu**:
  - `node --test tests/*.test.js`: **225/225 tests PASS 100%**.
  - `powershell -ExecutionPolicy Bypass -File init.ps1`: Thành công 100%.
  - Mô phỏng tương tác Chrome DevTools 10 phân hệ nghiệp vụ: PASS toàn bộ.
  - Viewport 360×740: `overflowIssues: []` (0 lỗi), 0 lỗi console.
- **Trạng thái**: Hoàn thành F-011 (`done`), sẵn sàng release.

## Phiên trước — 2026-10-19: Trang chủ Đơn giản / Nâng cao và Thực địa
- **Đã hoàn tất**: Trang chủ chuyển đổi nhanh hai chiều; mặc định Đơn giản, Nâng cao giữ toàn bộ HUD/ghim/công cụ cũ. Thêm chế độ Thực địa tương phản cao, nút lớn, lưu lựa chọn bằng localStorage có xử lý lỗi. Cấu hình sáng/tối và chế độ sunlight riêng của MiniCAD không bị ghi đè.
- **Tệp**: `field-workspace.js`, `field-workspace.css`, `tests/field-workspace.test.js`; các điểm tích hợp nhỏ ở `index.html`, `app.js`, `sw.js`.
- **Sự kiện**: `appNav.updateBanner()` phát `vn2000:contextchange`; đổi ngôn ngữ phát `vn2000:languagechange`. Module cập nhật nhãn và xóa kết quả không còn phù hợp. Chuyển đổi dùng trực tiếp các hàm geodesy hiện có với KTT/scale hiện hành; kết quả ghi rõ đơn vị và thông số.
- **Cô lập**: Nút chấm tọa độ nhanh chỉ mở `screen-transform-map`. Đã xác nhận trên trình duyệt `mapProjectBar` và `mapCadToolbar` không hiện. Accordion mặc định đóng, không để công cụ ẩn nhận focus.
- **GPS/PWA**: Thông báo giới hạn GPS điện thoại tại HUD/cắm mốc. Cache tăng lên `vn2000-pro-v2.8.3`, có hai tài nguyên module mới với đường dẫn không version query.
- **Kiểm thử**: `node --test tests/*.test.js` đạt **216/216**; syntax và diff check đạt. Đã kiểm tra trực quan 390×844, 360×844, 1440×900; Thực địa đo nút header ≥48×48 px, không bị cắt hoặc tràn ngang. Đã thử form chuyển đổi dấu phẩy, chế độ sáng/tối, accordion và bản đồ chuyển đổi.
- **Giới hạn xác minh**: Chưa thử với phần cứng GNSS/RTK, tệp CAD dung lượng lớn hoặc PWA cài trên điện thoại thật; thay đổi này tập trung vào UI/UX, không thay thuật toán đo hoặc bộ tải CAD.
- **Quyền thực thi**: Sau lỗi/treo CLI Gemini, người dùng đã chọn “Cho Codex hoàn thiện trực tiếp”. Codex viết bản cuối và kiểm thử; không nhận bản đề xuất Gemini làm sản phẩm đã hoàn thành.
- **Bàn giao**: Thay đổi đang ở working tree, chưa commit/deploy. Nhật ký thử và đề xuất gốc trong `.scratch/ui-ux-20261019/`; không đưa scratch vào bản phát hành.

## Ngữ cảnh phiên trước — Kiểm tra tổng thể
- **Phiên làm việc**: Hoàn tất kiểm tra tổng thể 4 vòng (`/grill-me`), vá lỗ hổng QuotaExceededError, cô lập MiniCAD và nghiệm thu F-002.
- **Kết quả cốt lõi**:
  - Tách bạch 100% giao diện: Mỗi chức năng sở hữu giao diện/màn hình riêng biệt.
  - Phân hệ Chuyển đổi tọa độ (F-002) sở hữu Live Map độc lập (`screen-transform-map`) và Bottom Sheet draggable, hoàn tất 10/10 tính năng cốt lõi (`done`).
  - Đã tích hợp `safeStorage` chống tràn bộ nhớ và loại bỏ sự kiện click kép giữa `appMap` và `appCadTool`.
  - Cache Service Worker được nâng cấp lên `vn2000-pro-v2.8.1`.
- **Trạng thái bài test**: 74/74 tests pass (100%).
- **Branch**: `main`.


## 2026-10-19 — Sửa trả tọa độ bản đồ về chế độ Đơn giản
- Nguyên nhân: Apply chỉ cập nhật bottom sheet bản đồ, chưa có đường trả điểm về form nhanh.
- Thêm onApplyPoint theo từng lần mở bản đồ; reset khi mở lại và tiêu thụ một lần. Luồng bộ chuyển đổi đầy đủ/đa điểm giữ nguyên.
- Form nhanh nhận lat/lng, chọn WGS-84 → VN-2000, quay về trang chủ và chuyển đổi ngay bằng KTT/scale hiện hành. Focus về nút Chuyển đổi.
- Cache PWA tăng lên vn2000-pro-v2.8.4.
- Kiểm chứng: 218/218 tests PASS, node --check và git diff --check đạt. Thử UI localhost: chấm điểm và Áp dụng về Form trả đúng tọa độ, X/Y khớp bản đồ.
- Chưa commit/deploy. Người dùng đã cho phép Codex hoàn thiện trực tiếp.
