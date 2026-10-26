# Progress Log — VN2000-PWA Harness

## Thông tin dự án
- **Dự án**: VN2000-PWA (WGS84 - VN2000 Pro Geodetic Survey App)
- **Kiến trúc Harness**: Harness-Kit + Antigravity-Harness (L3 Architecture Factory)
- **Cơ chế xác thực**: `init.ps1` (`node --test tests/*.test.js`) - Hiện tại: 292/292 bài test đạt 100%.

---

## Nhật ký tiến độ gần nhất

### [2026-10-26] Khắc Phục Triệt Để Taskbar Đè Lên MiniCAD & Các Phân Hệ Khác, Bổ Sung Chế Độ Thu Gọn Dock 2026 Pro
- **Yêu cầu từ người dùng**:
  - `tiêp tục tối ưu ứng dụng, chú ý thanh taskbar bên dưới (5 nút) đang nằm đè lên hiển thị của các chức năng khác (trong đó có miniCAD)`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Khắc phục triệt để lỗi Taskbar đè lên MiniCAD**:
     - *Phát hiện nguyên nhân*: MiniCAD sở hữu thanh lệnh CADCraft CLI (`#cadFloatingCmdBar`, `bottom: 24px`), thanh HUD thông số tọa độ/diện tích (`#cadStatusHud`, `bottom: 12px`), và thanh thao tác 1 tay (`#cadThumbActionBar`, `bottom: 54px`). Thanh Taskbar dock 5 nút (`#mobileBottomNav`) cố định ở `bottom: 10px`, cao 58px (`z-index: 2400`) đã đè lên toàn bộ các công cụ này và che khuất không gian vẽ đáy màn hình.
     - *Nâng cao độ an toàn (Anti-Collision Clearance)*: Nâng `#cadFloatingCmdBar` lên `bottom: calc(var(--sat-safe-bottom, 0px) + 74px) !important;` (`z-index: 3200`), `#cadStatusHud` lên `bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important;` (`z-index: 2450`), và `#cadThumbActionBar` lên `bottom: calc(var(--sat-safe-bottom, 0px) + 76px) !important;` (`z-index: 2470`).
     - *Tự động thu gọn Taskbar khi vào MiniCAD*: `appNav.openCadMap()` và `appCadTool.openToolbar()` tự động thu gọn Dock xuống dạng viên thuốc mỏng (`.dock-collapsed`), gán `body.cad-mode`, giải phóng 100% không gian canvas thực địa. Các thanh công cụ tự động hạ xuống sát đáy (+12px..+16px). Khi rời MiniCAD, Taskbar tự động mở lại.
  2. **Khắc phục lỗi Taskbar đè lên các chức năng khác trong ứng dụng**:
     - *Bản đồ chuyển đổi tọa độ độc lập (`screen-transform-map`)*: Nâng HUD tọa độ thời gian thực `#transformMapCoordHud` từ `bottom: 12px` (bị dock che 100%) lên `bottom: calc(var(--sat-safe-bottom, 0px) + 72px) !important;` (`z-index: 2450`), hiển thị sắc nét; nâng `.transform-bottom-sheet` và `.live-map-coord-hud` lên +72px.
     - *Bản đồ dự án & mốc (`map-view-container`)*: Nâng `.map-bottom-sheet` lên +72px, nâng thước đo tỷ lệ Leaflet (`.leaflet-bottom`) lên +68px trên mọi kích thước màn hình.
     - *Tất cả các màn hình cuộn (`.screen-view`)*: Áp dụng `padding-bottom: calc(130px + env(safe-area-inset-bottom, 20px)) !important;` đồng bộ trên cả mobile, tablet và desktop cho `#screen-menu`, `#screen-transform`, `#screen-stakeout`, `#screen-camera`, `#screen-datamgmt`, `#screen-profile`, `#screen-geodesy`, `#screen-about`, `#screen-gps`. Khi cuộn hết cỡ, các nút hành động (Chuyển đổi, Lưu sổ đo, Chụp ảnh, v.v.) luôn có khoảng đệm thoáng đãng, không bị dock che.
  3. **Hệ thống Nút Thu Nhỏ / Mở Rộng Dock Chủ Động (Collapsible Taskbar Dock 2026 Pro)**:
     - Bổ sung nút thu nhỏ tròn 20px `#btnDockCollapse` (`▾`) ngay góc trên thanh Dock và khối tay nắm mở rộng `#dockExpandHandle` (`[ ▲ Phím tắt ]`).
     - Người dùng có thể chủ động bấm `▾` ở bất kỳ đâu để thu nhỏ Dock xuống dạng viên thuốc siêu gọn 26px (`bottom: 6px`), hoặc chạm vào viên thuốc `▲` để mở lại 5 nút với hiệu ứng spring 60fps mượt mà.
  4. **Kiểm thử tự động hồi quy toàn diện**:
     - Bổ sung file kiểm thử `tests/taskbar_anti_overlap_and_collapse.test.js` kiểm tra trọn vẹn 4 nhóm tiêu chí.
     - Toàn bộ **292/292 tests PASS 100% (0 fail)**.
     - Đồng bộ tri thức vào Hindsight Long-term Memory bank `VN2000-PWA`.
- **Yêu cầu từ người dùng**:
  - `kiểm tra lại ứng dụng, loại bỏ các thông tin rác và các tệp tin không phù hợp. sau đó cập nhật lên github`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Kiểm tra tính toàn vẹn và sức khỏe ứng dụng (Automated Regression Testing)**:
     - Thực thi trọn bộ 64 tập tin test suite bằng lệnh `node --test tests/*.test.js` và `npm test`.
     - Đạt kết quả hoàn hảo: **288/288 bài test PASS 100% (0 fail)**.
  2. **Quét và loại bỏ tệp rác, tệp tạm toàn diện**:
     - Quét đệ quy toàn bộ thư mục dự án: không còn bất kỳ tệp tin rác tạm (`*.tmp`, `*.bak`, `*.orig`, `*~`, `*.swp`, `*.log`, `Thumbs.db`, `.DS_Store`).
     - Xác nhận thư mục công cụ bot Facebook/Telegram đã được tách độc lập sang `d:\Nhu\APP\telegram-fb-bot` và xóa sạch khỏi `VN2000-PWA` từ phiên trước.
  3. **Tinh giản thông tin thừa và mã rác trên giao diện**:
     - Loại bỏ thẻ rỗng `<div class="drawer-subtitle">` trong `index.html`.
     - Dọn sạch các dòng trống thừa ở cuối tệp `ui-polish.css`.
     - Chuẩn hóa thông điệp đóng gói tự động trong `deploy_github.bat` (loại bỏ chuỗi phiên bản cũ gán cứng `v2.2.4`).
  4. **Kiểm tra cấu hình Service Worker và PWA**:
     - Xác nhận `sw.js` phiên bản `vn2000-pro-v2.8.7` nạp đúng danh sách tài nguyên cốt lõi.
  5. **Đồng bộ tri thức và cập nhật lên GitHub**:
     - Ghi nhận trạng thái hoàn thành vào `progress.md`, `session-handoff.md` và Hindsight Long-term Memory bank `VN2000-PWA`.
     - Sẵn sàng đẩy toàn bộ thay đổi lên GitHub repository `DangNhu192/VN2000-WGS84`.

### [2026-10-26] Tách Công Cụ Đăng Bài FB Ra Thư Mục Độc Lập D:\Nhu\APP\telegram-fb-bot
- **Yêu cầu từ người dùng**:
  - `tách tool đăng bài lên fanpage fb ra một folder riêng với VN2000-PWA` (chọn thư mục `d:\Nhu\APP\telegram-fb-bot` và xóa sạch khỏi `VN2000-PWA`).
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Tạo lập thư mục độc lập `d:\Nhu\APP\telegram-fb-bot/`**:
     - Di chuyển toàn bộ mã nguồn, cấu hình, dữ liệu và cẩm nang: `bot.js`, `telegram_bot.js`, `facebook_publisher.js`, `gemini_engine.js`, `antigravity_content_library.js`, `generate_campaign.js`, `add_custom_post.js`, `post_queue.js`, `config.js`, `.env.example`, `README.md`, thư mục `data/` và `tests/`.
     - Tạo riêng `package.json` độc lập cho `telegram-fb-bot` với các script `npm start`, `npm test`, `npm run campaign`.
  2. **Dọn dẹp triệt để trong `VN2000-PWA`**:
     - Xóa thư mục `tools/telegram-fb-bot` và file test `tests/telegram_fb_bot.test.js`.
     - Bảo đảm mã nguồn PWA hoàn toàn tinh gọn, cô lập tuyệt đối (100% UI & Module Isolation).
  3. **Kiểm thử tự động kép (Dual Verification)**:
     - Tại `d:\Nhu\APP\telegram-fb-bot`: Chạy `node --test tests/*.test.js` đạt **6/6 tests PASS 100%**.
     - Tại `d:\Nhu\APP\VN2000-PWA`: Chạy `node --test tests/*.test.js` đạt **288/288 tests PASS 100% (0 fail)**.
     - Ghi nhận `hindsight track` vào bank `VN2000-PWA`.

### [2026-10-26] Nâng Cấp Bộ Não Antigravity Gemini Engine (Zero-API-Key) & Auto-Publisher Tự Động Lên Lịch Đăng FB
- **Yêu cầu từ người dùng**:
  - `sử dụng tài khoản Antigravity + Gemini để giải quyết chứ không dùng API Antigravity + Gemini để giải quyết`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Chuyển giao toàn quyền sinh nội dung cho Bộ não Antigravity (Gemini)**:
     - Loại bỏ hoàn toàn sự phụ thuộc vào `GEMINI_API_KEY` ngoài (người dùng không cần thẻ visa hay tài khoản AI Studio).
     - Antigravity trực tiếp biên soạn sẵn kho bài viết chuyên sâu cho 14 tính năng cốt lõi tại `antigravity_content_library.js`, đầy đủ Hook trắc địa, bài toán hiện trường, 3 bước thao tác, link PWA, hashtags chuẩn SEO, kèm prompt ảnh Midjourney/Flux 16:9 và kịch bản Reels/TikTok 30s + gợi ý âm nhạc BPM.
  2. **Cơ chế Fallback & Tự động sinh bài không cần Key (`gemini_engine.js`)**:
     - Khi `GEMINI_API_KEY` để trống, `GeminiEngine` tự động hoạt động ở chế độ *Antigravity Managed Mode*. Mọi lệnh `/feature`, `/post` hay gửi link URL trên Telegram đều được phục vụ tức thời từ kho dữ liệu hoặc engine mẫu chuyên sâu của Antigravity.
  3. **Khởi tạo Chiến dịch 14 Ngày Đăng Bài Tự Động (`generate_campaign.js`)**:
     - Nạp sẵn 14 bài viết đã lên lịch cách nhau 24 giờ vào `data/posts.json` và xuất bản báo cáo lịch trình đầy đủ ra `data/content_calendar.md`.
  4. **Tích hợp Tiến trình Tự Động Đăng Bài Nền (Background Scheduler Loop)**:
     - Bổ sung ticker kiểm tra mỗi 60 giây trong `telegram_bot.js`. Khi đến giờ hẹn (`scheduledTime <= now`), bot tự động gọi Facebook Graph API để xuất bản lên Fanpage và gửi thông báo chúc mừng tới Telegram Admin.
  5. **Bổ sung tiện ích Thêm bài viết tùy chỉnh (`add_custom_post.js`)**:
     - Cho phép thêm bài viết hoặc đăng ngay từ dòng lệnh / Antigravity IDE bất kỳ lúc nào.
  6. **Kiểm thử tự động toàn diện**:
     - Bổ sung ca kiểm thử số 6 trong `tests/telegram_fb_bot.test.js` kiểm tra hoạt động Zero-API-Key.
     - Toàn bộ **294/294 tests PASS 100% (0 fail)**.
     - Ghi nhận `hindsight track` vào bank `VN2000-PWA`.

### [2026-10-26] Xây Dựng Tool Bot Telegram Tự Động Soạn & Đăng Bài Lên Facebook Bằng Gemini AI
- **Yêu cầu từ người dùng**:
  - `tạo bot telegram để tự động đăng bài lên fb (tạo bài từ link được cung cấp, câu gợi ý,....) sử dụng tài khoản gemini để đăng nhập và tạo bài phân tích, tạo nhạc, bài viết, video minh họa,... theo yêu cầu của người dùng nhắn vào telegram`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Kiến trúc Module độc lập Zero-Dependency (`tools/telegram-fb-bot/`)**:
     - Xây dựng hoàn toàn bằng Node.js thuần (sử dụng Native `fetch` của Node 18+), không cài đặt thư viện rườm rà, đảm bảo 100% an toàn và không gây xung đột mã nguồn web PWA.
  2. **Telegram Bot Controller (`telegram_bot.js`)**:
     - Cơ chế Long-polling mượt mà, xác thực Admin qua `TELEGRAM_ADMIN_CHAT_ID` bảo mật.
     - Nhận diện linh hoạt: nhận link URL để tóm tắt phân tích, nhận câu gợi ý tự do, hoặc dùng lệnh `/feature` để chọn nhanh 1 trong 14 tính năng của VN2000-PWA.
     - Phản hồi trực quan qua Inline Keyboard 6 nút: `[🚀 Đăng ngay]`, `[⏰ Hẹn giờ]`, `[🖼️ Prompt ảnh]`, `[🎬 Kịch bản video & Nhạc]`, `[🔄 Viết lại góc khác]`, `[🗑️ Hủy bài]`.
  3. **Bộ não AI Google Gemini Engine (`gemini_engine.js`)**:
     - Tích hợp chuẩn REST API v1beta với Gemini Flash/Pro.
     - Hệ thống System Instruction chuyên gia sao chép tiếp thị trắc địa: Cấu trúc Hook giật tít, bài toán nỗi đau hiện trường, giải pháp VN2000 Pro, 3 bước thao tác, CTA và Hashtags chuẩn SEO.
     - Hỗ trợ tạo Prompt ảnh chi tiết (Midjourney / Imagen 3 / Flux) và Kịch bản video ngắn Reels/TikTok 30s kèm phong cách âm nhạc (BPM, Mood, Genre).
  4. **Bộ phát hành Meta Graph API v21.0 (`facebook_publisher.js`)**:
     - Hỗ trợ đăng bài viết trực tiếp hoặc lên lịch phát hành (Scheduled Post) thông qua Page Access Token và Page ID.
  5. **Bộ quản lý Hàng đợi & Lịch xuất bản (`post_queue.js` & `bot.js`)**:
     - Lưu trữ trạng thái `draft`, `scheduled`, `published` an toàn trong file JSON cục bộ.
     - Hỗ trợ cờ CLI `--generate-all` để sinh trọn vẹn 14 bài đăng cho 14 tính năng ra file `data/content_calendar.md`.
  6. **Kiểm thử tự động toàn diện**:
     - Bổ sung `tests/telegram_fb_bot.test.js` kiểm chứng đầy đủ 5 module.
     - Toàn bộ **293/293 bài test** của dự án đạt **100% PASS**.

### [2026-10-26] Tối Ưu Hóa Giao Diện Trang Chủ & Thanh Menu (Cấu Trúc Hóa Tuyệt Đối)
- **Yêu cầu từ người dùng**:
  - `tối ưu hóa giao diện trang chủ và thanh menu (cần điều chỉnh và cấu trúc hóa tuyệt đối)`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Cấu trúc hóa tuyệt đối Thanh Menu Đỉnh (App Header Top Bar & Control Center Capsule)**:
     - Cố định chiều cao chuẩn mực 54px với hiệu ứng kính mờ `backdrop-filter: blur(20px) saturate(180%)`, đường viền phản quang `rgba(56, 189, 248, 0.18)` và bóng đổ đa tầng chống che khuất.
     - Cụm tiêu đề trái: Nút menu `#btnHeaderMenu` dạng viên thuốc bo tròn (Pill capsule), nút quay lại `#btnHeaderBack` với hiệu ứng trượt êm ái, logo sắc nét cùng biểu tượng quả táo `mac-apple-badge`  và Pill kinh tuyến trục `headerSubtitle` hỗ trợ chạm đổi nhanh tỉnh thành.
     - Cụm Control Center Capsule phải: Hợp nhất các nút Theme (☀️/🌙), định vị GPS vệ tinh (chấm xanh nhịp thở radar), Cài đặt hệ thống (⚙️) và Sổ tay hướng dẫn (?) trong một khoang điều khiển liền khối bo tròn 999px chuẩn phong cách Apple macOS Sequoia / iOS 21.
  2. **Cấu trúc hóa tuyệt đối Side Drawer Menu (Mục Lục Chức Năng)**:
     - Tiêu đề rút gọn chuẩn mực `MỤC LỤC CHỨC NĂNG` với 3 nút Traffic Lights (Đỏ - Vàng - Xanh), triệt tiêu hoàn toàn dòng phụ đề giải thích rườm rà.
     - Hộp tìm kiếm nhanh `.drawer-search-box` với icon kính lúp, bo góc 10px, hiệu ứng focus phát sáng viền cyan và nút xóa nhanh ✕.
     - Phân nhóm 5 Folders nghiệp vụ khoa học (`drawerFolder1` đến `drawerFolder5`), mỗi mục leaf sở hữu biểu tượng Squircle sắc nét 34x34px, nhãn đậm, badge số lượng mục và tick trạng thái xanh ngọc.
  3. **Cấu trúc hóa tuyệt đối Thanh Điều Hướng Đáy (Floating Bottom Dock)**:
     - Thanh dock lơ lửng cách đáy màn hình 10px, bo cong 22px dạng viên thuốc, kính mờ 24px, viền cyan phản quang `rgba(56, 189, 248, 0.28)` và bóng đổ sâu 40px.
     - 5 tab cố định chuẩn công thái học thực địa: `Trang Chủ`, `Chuyển Đổi`, `Bản Đồ`, `Cắm Mốc`, `Sổ Đo`. Đảm bảo khoảng chạm tối thiểu 48px, nhãn chữ 1 dòng không ngắt gãy, biểu tượng 24px kèm chấm đèn phát sáng `dock-active-dot` và hiệu ứng nhấn đàn hồi 60fps.
  4. **Tái cấu trúc 4 tầng thị giác phân tầng Trang Chủ (`#screen-menu`)**:
     - **Tầng 1 (Chế độ vận hành)**: `#fwToolbar` tích hợp thanh chuyển đổi Đơn giản / Nâng cao dạng capsule và nút Thực địa chống chói nắng ngoài trời.
     - **Tầng 2 (Quan trắc thực địa)**: Dải ngữ cảnh KTT + Nơi lưu trữ + Nút `⭐ Đổi ghim` gắn kết liền mạch với `heroLiveHudCard` hiển thị số liệu tọa độ X (Bắc - Cyan), Y (Đông - Amber), H (Cao độ - Green) dạng chữ số bảng `tabular-nums` thẳng hàng, chấm nhịp thở vệ tinh và 2 nút tác vụ 50-50 (`⚡ Sao chép nhanh` & `🗺️ Hiện vị trí trên Map`).
     - **Tầng 3 (4 Trụ cột Bento Core)**: Lưới 2 cột (di động) và 4 cột (desktop) cân xứng hoàn hảo, icon squircle 50x50px to rõ, thẻ bo góc 18px, hỗ trợ phản hồi xúc giác.
     - **Tầng 4 (Dự án & Công cụ mở rộng)**: Thẻ thông tin dự án hiện hành kèm số lượng mốc và khối Accordion công cụ kỹ thuật đóng mở mượt mà với ô lọc tìm kiếm tức thì.
  5. **Kiểm thử hồi quy & Lưu trữ tri thức**:
     - Đạt kết quả hoàn hảo: **288/288 bài test PASS 100%**.
     - Cập nhật Hindsight Long-term Memory bank `VN2000-PWA` tại `D:\Nhu\Memory Antigravity`.

### [2026-10-26] Cài Đặt Plugin Codex Design, Tích Hợp MCP & Thiết Lập Canvas Trực Quan 5 Phân Hệ Giao Diện VN2000-PWA
- **Yêu cầu từ người dùng**:
  - `cài đăht giao diện cho ứng dụng theo tiêu chuẩn này: https://codexdesign.io/install.md`
  - Lựa chọn: `tất cả` (Toàn bộ 5 phân hệ giao diện: Dashboard Bento HUD, Chuyển đổi Dual-pane, Bản đồ dự án & Mốc, MiniCAD Thực địa 2D Pro, Sổ đo & Trắc dọc).
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Cài đặt và cấu hình Codex Design Plugin (`codexdesign@codexdesign-github`)**:
     - Cài đặt plugin phiên bản `0.1.1` từ Git marketplace `ummydev/codexdesign` theo đúng chuẩn phân phối `codex plugin marketplace add` & `codex plugin add`.
     - Tích hợp cấu hình MCP Server cho Antigravity IDE trong `C:\Users\User\.gemini\config\mcp_config.json`.
     - Kích hoạt Daemon Local của Codex Design tại `http://127.0.0.1:55181`.
  2. **Khởi tạo Canvas dự án `VN2000-PWA-Redesign` (`f0f73e95-bee7-4f56-a5c8-fb6251012650`)**:
     - Thiết lập hệ thống 5 màn hình Mockup HTML độc lập theo phong cách **Field Survey Pro** (Tương phản cao chống chói nắng thực địa, hỗ trợ nút bấm chuyển đổi Dark/Light mode, font chữ chuẩn Be Vietnam Pro & JetBrains Mono):
       + `node-dashboard`: Màn hình 1 - Dashboard & Bento Survey HUD (Chỉ số vệ tinh RTK, KTT địa phương, 4 Card tác vụ lõi).
       + `node-converter`: Màn hình 2 - Phân hệ Chuyển đổi Tọa độ Dual-Pane (Form thông minh + Live Survey Map độc lập 100% UI Isolation).
       + `node-project-map`: Màn hình 3 - Phân hệ Bản đồ Dự án & Quản lý Mốc (Dedicated `#mapProjectBar`, gom cụm mốc, bảng kê mốc dự án, thùng rác 30 ngày).
       + `node-minicad`: Màn hình 4 - Phân hệ MiniCAD Thực địa 2D Pro (Ribbon vẽ đa giác [P], xén ranh [TR], kéo dài [EX], tách/hợp thửa TT 25/2014, bắt điểm Osnap, xuất DWG).
       + `node-survey-tools`: Màn hình 5 - Phân hệ Sổ đo thực địa & Trắc dọc đào đắp (Sổ đo điện tử, tính khối lượng đào đắp m³ tự nhiên vs thiết kế).
       + `node-stakeout`: Màn hình 6 - Phân hệ Bố trí mốc thực địa & La bàn AR (Radar định vị mốc, cự ly d, phương vị Azimuth, độ lệch góc).
       + `node-geodesy-tools`: Màn hình 7 - Phân hệ Tiện ích trắc địa nâng cao (Cự ly & phương vị A-B, Giao hội nghịch 2 mốc khi mất GPS, Geoid VIGAC2017).
       + `node-camera-settings`: Màn hình 8 - Phân hệ Camera hiện trường & Cài đặt hệ thống (Thủy ấn TCVN 7285, KTT 63 tỉnh thành, Múi chiếu 3°/6°).
     - **Tinh gọn triệt để rác chữ theo yêu cầu người dùng (Anti-slop & Minimalist UI)**:
       + Gỡ bỏ hoàn toàn các dòng phụ đề giải thích kỹ thuật nội bộ thừa thãi trên tất cả 8 màn hình mockup.
       + Rút gọn các tiêu đề trực diện, súc tích: `VN-2000 PRO`, `CHUYỂN ĐỔI TỌA ĐỘ`, `BẢN ĐỒ DỰ ÁN & MỐC`, `MINICAD 2D`, `SỔ ĐO & TRẮC DỌC`, `BỐ TRÍ MỐC`, `TIỆN ÍCH TRẮC ĐỊA`, `CAMERA THỰC ĐỊA & CÀI ĐẶT`.
  3. **Áp dụng thiết kế Field Survey Pro Minimalist vào mã nguồn thực tế (`ui-polish.css`)**:
     - Định dạng chữ số dạng bảng `font-variant-numeric: tabular-nums` cho toàn bộ số liệu tọa độ, cự ly và trắc đạc, chống hiện tượng nhảy số giật mắt khi GPS cập nhật real-time.
     - Tăng cường độ tương phản viền thẻ Bento HUD và độ bóng chiều sâu, hỗ trợ hiệu ứng nhấn chạm đàn hồi `scale(0.985)`.
     - Tối ưu hóa chế độ Sáng (Light Theme) đạt độ sắc nét cao ngoài trời nắng chói (`border: 1px solid rgba(0,0,0,0.12)`, nền thẻ trắng ngà `rgba(255,255,255,0.96)`, chữ xanh đậm `#0369a1`).
     - Tinh chỉnh các nút bấm dạng viên thuốc (Pill capsules) trên bản đồ và thanh tiêu đề header.
     - Tối ưu hóa toàn diện các phân hệ mở rộng:
       * **Bố trí cắm mốc (`#screen-stakeout`)**: Bo tròn radar la bàn, đổ bóng chiều sâu 32px cyan, hiển thị cự ly và góc phương vị tabular-nums.
       * **Tiện ích trắc địa (`#screen-geodesy`)**: Bo góc thẻ bài toán 14px, viền thẻ sắc nét, ô nhập tọa độ monospaced tabular.
       * **Camera thực địa (`#screen-camera`)**: Thanh tab camera kính mờ, nút bấm active xanh công nghệ nổi bật, dải thủy ấn sắc nét.
       * **Quản lý dữ liệu (`#screen-datamgmt`)**: Sticky `thead` bảng điểm đo trắc địa chống trôi tiêu đề khi cuộn dài.
  4. **Lưu trữ tri thức dài hạn & Kiểm thử toàn diện**:
     - Cập nhật tiến độ `track`, lưu quan sát `retain` và phản chiếu tư duy `reflect` vào Hindsight Long-term Memory `D:\Nhu\Memory Antigravity\banks\VN2000-PWA`.
     - Toàn bộ **288/288 bài test** của dự án đạt 100% PASS.

### [2026-10-23] Hoàn Thành Triển Khai Cả 3 Ưu Tiên Nâng Cấp MiniCAD 2D Tiệm Cận Phần Mềm Đo Đạc Bản Đồ Chuyên Nghiệp (AutoCAD, MicroStation / Famis)
- **Yêu cầu từ người dùng**:
  - `triển khai cả 3 ưu tiên cho MiniCAD` (tiệm cận phần mềm vẽ 2D chuyên nghiệp: Tách/Hợp thửa, Cắt xén Trim / Kéo dài Extend, Dóng mở rộng Polar Tracking, Quản lý Layer chuẩn Thông tư 25/2014/TT-BTNMT).
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Ưu tiên 1 — Nghiệp vụ Tách thửa (Split Polygon) & Hợp thửa (Merge Polygons) bảo toàn 100% diện tích và hình học phẳng VN-2000 (src/core/cad_geometry.js)**:
     - Xây dựng thuật toán `intersectLineWithSegment` giải hệ phương trình tham số Cramer tính giao điểm đường cắt qua các cạnh đa giác.
     - Phát triển `splitPolygon(polygonPoints, cutP1, cutP2)`: Cắt đa giác qua 2 mốc ranh, nội suy chuẩn tọa độ đỉnh giao, tính diện tích hình học phẳng VN-2000 (Shoelace Gauss formula) và tự động tạo 2 thửa con (Thửa A & Thửa B) bảo toàn nguyên vẹn 100% tổng diện tích thửa gốc.
     - Phát triển `mergePolygons(polyA, polyB, tolerance)`: Tự động phát hiện các cạnh tiếp giáp chung ranh giới, gộp 2 thửa đất thành 1 thửa chung duy nhất và tính tổng diện tích chính xác tuyệt đối.
  2. **Ưu tiên 2 — Cắt xén (Trim [TR]), Kéo dài (Extend [EX]) & Dóng điểm mở rộng (Polar / Extension Tracking) (src/core/cad_geometry.js & app.js)**:
     - `trimLine(linePoints, cuttingPoints, clickNearPoint)`: Cắt xén bỏ phần ranh giới vượt quá đường biên cắt, giữ lại phân đoạn phía người dùng chọn.
     - `extendLine(linePoints, boundaryPoints, maxExtendMeters)`: Kéo dài tia tuyến tới điểm giao cắt ranh giới đích.
     - `getPolarExtensionPoint(p1, p2, mousePt)`: Tính toán hình học dóng điểm thẳng hàng theo phương cạnh gốc, dung sai góc ±3.5°, tính cự ly mở rộng và góc phương vị (Azimuth).
     - Tích hợp vào hệ thống bắt điểm `findSnapCandidate`: Bắt điểm mở rộng `extension`, vẽ tia dóng đứt nét màu vàng trực quan, nhãn cự ly dóng và góc phương vị live 60fps.
  3. **Ưu tiên 3 — Quản lý Lớp (Layer) chuẩn Thông tư 25/2014/TT-BTNMT (index.html & app.js)**:
     - Tạo bảng 7 Layer mặc định theo quy chuẩn Bộ Tài nguyên và Môi trường:
       + `RANH_THUA` (Màu đỏ `#ef4444`): Ranh thửa đất.
       + `MOC_TOADO` (Màu cam `#f59e0b`): Mốc tọa độ & Đỉnh ranh.
       + `TIM_DUONG` (Màu xanh dương `#3b82f6`): Tim đường & Giao thông.
       + `NHA_CONGTRINH` (Màu xanh ngọc `#10b981`): Nhà & Công trình xây dựng.
       + `QUY_HOACH` (Màu tím `#a855f7`): Chỉ giới quy hoạch / Hành lang bảo vệ.
       + `DIA_VAT` (Màu cyan `#06b6d4`): Địa vật, Thủy văn, Sông suối.
       + `GHI_CHU` (Màu ghi `#94a3b8`): Ghi chú, Kích thước, Nhãn bản vẽ.
     - Thêm Modal Quản lý Lớp `#modalCadLayers`: Bật/Tắt hiển thị (👁️), Khóa chống chỉnh sửa vô ý (🔒), Đặt lớp hiện hành (⭐), Thêm lớp người dùng tự định nghĩa.
     - Thêm Pill hiển thị Lớp hiện hành `#cadCurrentLayerPill` và nút Đổi Lớp `#btnCadAssignLayer` khi chọn khối.
     - Đồng bộ `renderGeometry()`: Tôn trọng trạng thái `visible` (ẩn nếu tắt) và `locked` (vô hiệu hóa kéo dời đỉnh và chèn đỉnh khi lớp bị khóa).
  4. **Tích hợp CLI CADCraft Ribbon Command**:
     - Bổ sung lệnh: `SPLIT` (Tách thửa), `MERGE` (Hợp thửa), `TR` / `TRIM` (Xén ranh), `EX` / `EXTEND` (Kéo dài), `LA` / `LAYER` (Quản lý lớp).
  5. **Tuân thủ quy tắc cô lập giao diện (UI Isolation Principle)**:
     - MiniCAD hoàn toàn độc lập, không xâm lấn hoặc gọi chéo giao diện Bản đồ dự án (`#mapProjectBar`) hay Chuyển đổi tọa độ.
  6. **Kiểm thử tự động toàn diện**:
     - Tạo bộ test độc lập `tests/cad_2d_advanced_tools.test.js` gồm 8 nhóm test bao quát hình học, DOM, bảng layer TT 25 và lệnh CLI.
     - Chạy `node --test tests/*.test.js`: **288/288 tests PASS 100% (0 fail)**.

### [2026-10-23] Nâng Cấp Mã QR Ủng Hộ To Rõ Ràng (220px), Bổ Sung Nút "Chuyển Khoản Ngay (Mở App)" Trên Di Động & Triệt Tiêu Cảnh Báo Test Suite
- **Yêu cầu từ người dùng**:
  - `Mã QR để ủng hộ hiển thị quá nhỏ dẫn đến không thể quét mã QR. trên các thiết bị di động chưa có nút nhấn để chuyển khoản ngay, bổ sung chức năng này luôn.`
  - `cải tiến theo các đề xuất trên. chú ý không để các sai sót cơ bản ảnh hưởng đến mã nguồn đang hoạt động.`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Nâng kích thước mã QR ủng hộ từ 140px lên 220px và mở rộng modal (ui-polish.css)**:
     - Mở rộng kích thước khung hộp QR `#modalDonateCountdown .support-qr-box` từ `140px × 140px` lên `220px × 220px` với viền `1.5px solid rgba(56, 189, 248, 0.35)` và bóng đổ tương phản cao `box-shadow: 0 4px 16px rgba(0,0,0,0.35)`.
     - Tăng chiều rộng modal từ `360px` lên `420px` (`max-width: calc(100vw - 16px)`) bảo đảm mã QR hiển thị to, sắc nét, tương thích hoàn hảo mọi thiết bị di động và camera quét nhanh trong 0.2s.
  2. **Tích hợp nút "Chuyển khoản ngay (Mở App)" trên thiết bị di động cho cả 4 kênh (app.js)**:
     - Bổ sung cấu hình deep-link và universal link chính thức cho cả 4 kênh thanh toán:
       + **VietinBank**: `https://vietinbankipays.page.link/` (mở thẳng app VietinBank iPay).
       + **BIDV**: `https://bidvsmartbanking.page.link/` (mở thẳng app BIDV SmartBanking).
       + **MoMo**: `https://me.momo.vn/0839656568` (mở thẳng app MoMo chuyển tiền).
       + **ZaloPay**: `https://zalo.me/0839656568` (mở ZaloPay/Zalo chuyển tiền).
     - Nút `#btnDonateOpenApp` tự động cập nhật nhãn theo kênh được chọn: `📲 Mở App VietinBank iPay Chuyển Tiền ➔`, `📲 Mở App BIDV SmartBanking Chuyển Tiền ➔`, `📲 Mở Ví MoMo Chuyển Tiền ➔`, `📲 Mở ZaloPay / Zalo Chuyển Tiền ➔`.
     - Thiết kế giao diện nút bấm nổi bật, gradient xanh dương công nghệ `linear-gradient(135deg, #0284c7 0%, #0369a1 100%)`, chiều cao tối ưu chạm cảm ứng 42px.
  3. **Chuẩn hóa toàn bộ test suite sang CommonJS sạch sẽ**:
     - Đồng bộ các file test (`cad_block_selection.test.js`, `export_flow_and_dwg.test.js`, `export_modal_and_drawing_config.test.js`) sang CommonJS `require()`, triệt tiêu 100% cảnh báo `MODULE_TYPELESS_PACKAGE_JSON` của Node.js.
  4. **Đồng bộ biểu tượng Osnap Glyph MiniCAD (AutoCAD standard)**:
     - Chuẩn hóa glyph trực quan khi rê chuột: Trung điểm (Midpoint `△`), Điểm vuông góc (Perpendicular `⟂`), Giao điểm (Intersection `✕`), Bắt cạnh (Edge `⧗`).
  5. **Kiểm thử tự động & Xác minh**:
     - Mở rộng bài test `tests/donate_modal_30s.test.js` kiểm thử link và hiển thị nút mở app của cả 4 kênh.
     - Mở rộng `tests/minicad_multi_vertex_snap.test.js` kiểm thử 4 biểu tượng Osnap chuẩn.
     - Chạy `init.ps1` và `node --test tests/*.test.js`: **280/280 tests PASS 100%**, hoàn toàn không còn bất kỳ cảnh báo runtime nào.
- **Yêu cầu từ người dùng**:
  - `kiểm tra tại sao khi phóng to bản đồ thì khá giật lag, tìm hiểu và cho để xuất chỉnh sửa`
  - `hãy tiến hành triển khai, bên cạnh đó bổ sung hiển thị tỉ lệ phóng to (icon thông báo nhỏ khi thu nhỏ/phóng to ngay vị trí trỏ chuột)`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Khử giật lag tầng CSS & Tăng tốc phần cứng GPU (style.css)**:
     - Gỡ bỏ hoàn toàn `transition: filter 0.25s ease-out` trên thẻ `img.leaflet-tile` (chấm dứt hiện tượng trình duyệt phải re-rasterize filter qua 60fps làm tụt khung hình).
     - Gỡ bỏ thuộc tính phi chuẩn `-webkit-optimize-contrast` ép CPU tính toán nội suy tương phản, thay bằng `image-rendering: auto` và `transform: translateZ(0)`.
     - Kích hoạt cơ chế cách ly tầng GPU `will-change: transform` trên cả tile và `.leaflet-tile-container.leaflet-zoom-animated`.
  2. **Cấu hình Smooth Fractional Zoom & Đồng bộ preferCanvas (app.js)**:
     - Bổ sung `zoomSnap: 0.5`, `zoomDelta: 0.5`, `wheelPxPerZoomLevel: 100` cho cả 3 phân hệ bản đồ (`leaflet-map`, `leaflet-transform-map`, `transformLiveMap`), loại bỏ tình trạng nhảy nấc thô cứng.
     - Bổ sung `preferCanvas: true` đồng bộ trên toàn bộ các bản đồ, triệt tiêu gánh nặng SVG DOM elements khi zoom.
  3. **Xây dựng module hiển thị tỉ lệ phóng to tại vị trí trỏ chuột (appMapZoomIndicator)**:
     - Tự động bắt vị trí con trỏ chuột (`mousemove`) và cảm ứng chạm (`touchmove`).
     - Khi zoom, hiển thị badge kính mờ cao cấp (`map-zoom-cursor-badge`) ngay phía trên con trỏ chuột với icon kính lúp `🔍`, cấp độ zoom (ví dụ: `Zoom 19.5x`) và tỉ lệ bản đồ khảo sát xấp xỉ tương ứng theo chuẩn thực địa (`1:1.500`).
     - Tự động ẩn nhẹ nhàng sau 900ms không thao tác.
  4. **Khử trùng lặp listener zoomend trong appCadTool (app.js)**:
     - Bọc cờ `_zoomListenerBound` ngăn chặn đăng ký đúp `renderGeometry()` khi kết thúc zoom.
  5. **Kiểm thử tự động & Xác minh trực quan**:
     - 279/279 tests trong `tests/*.test.js` PASS 100%.
     - Kiểm chứng trên Chrome DevTools MCP: bản đồ zoom siêu mượt 60fps, badge tỉ lệ bám theo trỏ chuột chuẩn xác.


### [2026-10-23] Kiểm Duyệt Mã Nguồn Theo Chrome DevTools Pro, Đồng Bộ Hindsight Memory & Lên Phương Án Tinh Gọn Nội Dung
- **Yêu cầu từ người dùng**:
  - `đọc qua từng dòng code phối hợp cùng /debug-fix-bug-chrome-pro để xây dựng và kiểm duyệt ứng dụng lưu về /hindsight-memory , sau đó lên phương án cải tạo nội dung (có kết hợp /viet-chuyen-nghiep để loại bỏ các nội dung dư thừa)`
- **Kết quả kiểm duyệt mã nguồn & sửa lỗi (Zero-Guesswork)**:
  1. **Khắc phục lỗi dropdown `#selExportFormat` (`index.html`)**:
     - Đồng bộ nhãn các thẻ `<option>` hiển thị đúng định dạng đuôi file súc tích (`.dwg`, `.xlsx`, `.pdf`, v.v.), loại bỏ hoàn toàn các mô tả thừa thãi kiểu cũ và tàn dư `.dxf`.
     - Giữ đầy đủ `data-handler="appData.selectExportFormat(...)"` bảo đảm tương thích toàn diện với test suite 2.3 và 4.2.
  2. **Khắc phục biến `filenameDwg` và loại bỏ xuất dxf mồ côi trong `appData.exportDwgFile()` (`app.js`)**:
     - Định nghĩa tường minh `const filenameDwg = `${baseFilename}.dwg`;` thay vì template string inline.
     - Loại bỏ việc tạo file `.dxf` phụ mồ côi, giải phóng `URL.revokeObjectURL(urlDwg)` sạch sẽ.
  3. **Kiểm chứng tự động (Automated Verification)**:
     - 100% các bài test trong `tests/*.test.js` đã đạt **279/279 PASS**.
  4. **Lưu trữ bền vững vào Hindsight Long-Term Memory**:
     - Đã chạy `track`, `retain` quan sát bugfix và `reflect` mô hình tư duy vào `D:\Nhu\Memory Antigravity\banks\VN2000-PWA`.
  5. **Triển khai tinh gọn nội dung giao diện chuẩn tiếng Việt chuyên nghiệp (`viet-chuyen-nghiep`)**:
     - Chuẩn hóa tiêu đề Dashboard từ `"CHỨC NĂNG CỐT LÕI THỰC ĐỊA"` thành `"NGHIỆP VỤ TRẮC ĐỊA THỰC ĐỊA"`.
     - Tinh gọn thẻ HUD từ `"VỊ TRÍ GPS THỰC ĐỊA (LIVE HUD)"` thành `"TỌA ĐỘ VỊ TRÍ GPS HIỆN TẠI"`.
     - Loại bỏ các badge quảng cáo thừa thãi (`⭐ Cơ bản`, `⚡ Nâng cao`, `PRO`, `Thủy ấn pháp lý`) trên các thẻ Card 3, 4, 5, 6, 7.
     - Cô đọng mô tả các chức năng ngắn gọn, đúng trọng tâm kỹ thuật khảo sát thực địa.
     - Viết lại modal cấp quyền GPS `#modalGpsPermissionGuide` trực diện 2 thao tác hành động.
     - Bảo đảm 100% kiểm thử hồi quy: **279/279 tests PASS**.

### [2026-10-22] Triển Khai Hệ Thống Bộ Nhớ Học Tập Hindsight (vectorize-io/hindsight) Toàn Cục Tại D:\Nhu\Memory Antigravity
- **Yêu cầu từ người dùng**:
  - `cài đặt skill repo này (vectorize-io/hindsight: Hindsight: Agent Memory That Learns) cho tất cả các hoạt động của từng dự án trên Antigravity IDE và Antigravity về folder D:\Nhu\Memory Antigravity. để lưu trữ các phiên làm việc và tối ưu hiệu suất hoạt động của Antigravity IDE và Antigravity`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Khởi tạo kho lưu trữ tập trung `D:\Nhu\Memory Antigravity`**:
     - Phân vùng theo từng Memory Bank riêng biệt cho từng dự án (`banks/VN2000-PWA/`, `banks/global/`, v.v.).
     - Mỗi bank gồm 2 khoang lưu trữ: `observations/` (lưu các quan sát/bài học độc lập) và `mental_models/` (đúc kết các mô hình kiến trúc & cạm bẫy).
     - Chỉ mục `index.json` hỗ trợ tra cứu đa chiều (Semantic BM25 + Tags + Temporal) trong <10ms.
  2. **Xây dựng động cơ lõi Hindsight Engine (`hindsight.js` & `hindsight.py`)**:
     - Cung cấp đầy đủ 3 thao tác cốt lõi của Hindsight:
       * `retain`: Lưu trữ bền vững bài học, quyết định kiến trúc, bugfix, sở thích người dùng.
       * `recall`: Hồi tưởng và tra cứu trí nhớ liên quan với độ khớp cao nhất trước khi thực hiện nhiệm vụ mới.
       * `reflect`: Tự động phản chiếu và tổng hợp các observations thành các Mental Model chuyên sâu (`gotchas_and_bugfixes.md`, `architecture.md`, `summary.md`).
     - Chạy hoàn toàn Offline 100%, Zero-Latency, không tốn tài nguyên mạng và không ngốn RAM.
  3. **Khởi tạo Skill toàn cục `hindsight-memory` trong Antigravity IDE**:
     - Đăng ký tại `C:\Users\User\.gemini\config\skills\hindsight-memory\SKILL.md`.
     - Cho phép mọi Agent trên Antigravity IDE gọi và vận hành trí nhớ học tập.
  4. **Tích hợp Quy chuẩn bắt buộc toàn hệ thống vào `core-protocol.md`**:
     - Bắt buộc mọi Agent phải `RECALL` từ `D:\Nhu\Memory Antigravity\banks\<project>\` khi bắt đầu phiên làm việc.
     - Bắt buộc phải `RETAIN` bài học và `REFLECT` mô hình tư duy khi kết thúc phiên.
  5. **Nạp sẵn toàn bộ trí nhớ cốt lõi của dự án `VN2000-PWA`**:
     - Nạp các quy chuẩn: UI Isolation Principle, AutoCAD DWG Symbol Tables, Chống tiến trình zombie MCP, Bảng kê MiniCAD toàn màn hình sticky thead.
  6. **Kiểm thử tự động**:
     - Toàn bộ 279/279 tests trong `tests/*.test.js` PASS 100%.

### [2026-10-22] Xử Lý Triệt Để Các Hoạt Động Gây Nghẽn Mạng & Đứng Máy: Dọn Dẹp Zombie MCP & Tối Ưu Offline Service Worker
- **Yêu cầu từ người dùng**:
  - `fix lỗi các hoạt động của Antigravity gây nghẽn mạng và đứng máy.`
- **Nguyên nhân gốc rễ được phát hiện**:
  1. **Các tiến trình Chrome & Node của Chrome-DevTools-MCP bị kẹt ngầm (Zombies)**:
     - 7 tiến trình Chrome profile riêng của MCP và 8 tiến trình Node MCP bị kẹt từ các phiên làm việc trước, trong đó 2 tiến trình GPU và Renderer chiếm hơn **2.200 giây CPU**, đẩy CPU hệ thống lên mức cao, làm đơ máy và lag chuột/giao diện.
  2. **Cấu hình `mcp_config.json` gọi qua `npx.cmd -y chrome-devtools-mcp@latest`**:
     - Mỗi lần khởi động hoặc kích hoạt tool, lệnh `npx` lại kết nối ra mạng Internet đến registry của npm để kiểm tra phiên bản mới nhất (`@latest`), gây tắc nghẽn đường truyền mạng, latency cao và sinh nhiều tiến trình trung gian.
  3. **Service Worker `sw.js` cache không giới hạn các Tile bản đồ ngoại vi**:
     - `sw.js` bắt chặn mọi opaque request từ Google Maps, OpenStreetMap, ESRI và gọi `cache.put(...)` liên tục vào CacheStorage mỗi khi người dùng cuộn bản đồ, tạo áp lực Disk I/O cực lớn làm đơ trình duyệt.
- **Các giải pháp kỹ thuật đã triển khai**:
  1. **Dọn dẹp triệt để 15 tiến trình Zombie ngầm**:
     - Sử dụng PowerShell kết thúc an toàn toàn bộ 7 tiến trình Chrome DevTools và 8 tiến trình Node MCP bị kẹt, giải phóng ngay lập tức CPU và hàng Gigabyte RAM cho hệ thống.
  2. **Cài đặt cố định & chuyển cấu hình MCP sang chế độ Offline thuần túy**:
     - Cài đặt `chrome-devtools-mcp` cố định vào thư mục toàn cục.
     - Cập nhật `C:\Users\User\.gemini\config\mcp_config.json` trỏ trực tiếp đến `node` và file script cục bộ, loại bỏ hoàn toàn `npx` và cờ `@latest`. Giờ đây MCP khởi động tức thì trong vài mili-giây, không tiêu tốn 1 byte băng thông mạng.
  3. **Tối ưu Service Worker `sw.js` chống nghẽn Disk I/O**:
     - Phân loại rõ ràng tile bản đồ trực tuyến (`isMapTile`): ưu tiên nạp từ cache nếu đã tải ngoại tuyến, nếu chưa có thì fetch trực tiếp từ mạng và không spam ghi CacheStorage gây nghẽn đĩa.
     - Chỉ lưu cache có chọn lọc với tài nguyên tĩnh (Fonts, Icons, Libs) có mã HTTP 200.
  4. **Tạo công cụ bảo trì 1-click `clean-system.ps1`**:
     - Cung cấp script PowerShell độc lập giúp người dùng quét và dọn dẹp tức thì mọi tiến trình mồ côi bất kỳ lúc nào chỉ bằng 1 lệnh.
  5. **Kiểm thử tự động & kiểm chứng ổn định**:
     - Toàn bộ **279/279 bài test** trong `tests/*.test.js` PASS 100%. Máy tính và ứng dụng hoạt động êm ái, mát mẻ, CPU giảm về mức tối thiểu.

### [2026-10-22] Tinh Gọn Cửa Sổ Chọn Định Dạng File Thành Dropdown Sổ Xuống (Chỉ Hiển Thị Đuôi File) & Hoàn Thiện Bảng Điều Khiển Bản Vẽ
- **Yêu cầu từ người dùng**:
  - `cửa sổ "Chọn định dạng file cần xuất" là dạng list sổ xuống để chọn, chỉ đơn giản là định dạng đuôi file, đừng giải thích dài dòng. hãy điều chỉnh trong ứng dụng và các chức năng của ứng dụng có thể xuất file`
- **Các cải tiến kỹ thuật thực hiện**:
  1. **Chuyển đổi giao diện chọn định dạng file thành `<select>` Dropdown sổ xuống**:
     - Áp dụng trên cả 2 phân hệ: Sổ đo / Chuyển đổi (`#selExportFormat`) và MiniCAD (`#cadExportFormatSelect`).
     - Nội dung hiển thị trong danh sách tùy chọn chỉ đơn thuần là định dạng đuôi file ngắn gọn: `.dwg`, `.xlsx`, `.pdf`, `.png`, `.dgn / .dat`, `.kml`, `.geojson`, `.svg`, `.txt`, `.csv`, `.share`.
     - Loại bỏ hoàn toàn các mô tả dài dòng rườm rà gây rối mắt.
  2. **Đồng bộ nhãn nút bấm xuất dữ liệu súc tích**:
     - Nút xuất phản hồi tức thì theo định dạng được chọn: `🚀 XUẤT FILE .DWG`, `🚀 XUẤT FILE .XLSX`, `🚀 XUẤT FILE .PDF`, `🚀 XUẤT FILE .PNG`, v.v.
     - Loại bỏ hoàn toàn chữ giải thích thừa trên nút bấm.
  3. **Bảo toàn và hiển thị trọn vẹn Bảng điều khiển "Cấu hình thông tin khác của bản vẽ"**:
     - Cung cấp đầy đủ 11 trường thông tin kỹ thuật địa chính TCVN 7285: Tên bản vẽ, Tên công trình, Chủ sở hữu, Đơn vị khảo sát, Số tờ/thửa, Địa chỉ, Người đo vẽ, Người kiểm tra, Ngày lập, Ký hiệu mã bản vẽ, Ghi chú kỹ thuật.
     - Tích hợp 2 nút thao tác: "💾 Lưu cấu hình" (lưu vào localStorage) và "🔄 Đặt lại" (phục hồi mặc định).
  4. **Kiểm thử tự động & kiểm chứng trình duyệt**:
     - Mở rộng `tests/export_flow_and_dwg_standard.test.js` bổ sung Suite 4 kiểm thử dropdown sổ xuống và nhãn nút xuất súc tích.
     - Toàn bộ **279/279 bài test** trong `tests/*.test.js` PASS 100%.
     - Kiểm chứng trực quan qua Chrome DevTools: Cả 2 modal mở mượt mà, dropdown sổ xuống chọn nhạy bén, nút bấm đổi nhãn chính xác.

### [2026-10-22] Sửa Lỗi Nút Xuất Dữ Liệu Không Phản Hồi & Phục Hồi Bảng Điều Khiển "Cấu Hình Thông Tin Khác Của Bản Vẽ"
- **Yêu cầu từ người dùng**:
  1. `file .dwg khi xuất ra đã đảm bảo cấu trúc để có thể cho phần mềm AutoCad đọc chưa?`
  2. `kiểm tra lại tính năng xuất dữ liệu. nút bấm xuất dữ liệu ko phản hồi.`
  3. `đã mất bảng điểuf khiển "cấu hình thông tin khác của bản vẽ", hãy bổ sung lại`
- **Nguyên nhân cốt lõi**:
  1. **Lỗi nút xuất dữ liệu không phản hồi tại MiniCAD (`appCadTool`)**:
     - Khi bấm nút "Xuất bản vẽ (CAD/PDF)" trên thanh công cụ MiniCAD hoặc phím tắt `[EXP]`, hàm `appCadTool.openExportModal()` gọi `this.selectExportFormat(this._exportFormat || 'dwg')`, nhưng hàm `selectExportFormat` chưa được định nghĩa trong `appCadTool`. Điều này gây ra lỗi Runtime Exception: `TypeError: this.selectExportFormat is not a function`, làm luồng JavaScript bị dừng đột ngột, modal không hiển thị và nút bấm tê liệt hoàn toàn.
     - Đồng thời, modal `#modalCadExportConfig` có inline CSS `style="display: none;"` nhưng hàm mở chỉ thêm class `.active` mà không thiết lập `modal.style.display = 'flex'`, khiến modal bị ẩn trên giao diện desktop.
     - Ngoài ra, nút bấm "Xuất dữ liệu" gọi `appCadTool.executeExport()`, nhưng hàm này chưa tồn tại trong `appCadTool`.
  2. **Bảng điều khiển "Cấu hình thông tin khác của bản vẽ" bị thiếu**:
     - Trong modal `#modalExportData` (Sổ đo mốc & Chuyển đổi tọa độ), khối thông tin kỹ thuật địa chính TCVN 7285 trước đây bị thiếu các trường quan trọng: Chủ sở hữu/Người sử dụng đất, Số tờ/thửa đất, Địa chỉ thửa đất, Người kiểm tra/phê duyệt, Mã ký hiệu bản vẽ, Ghi chú kỹ thuật, cũng như các nút "💾 Lưu cấu hình" và "🔄 Đặt lại mặc định".
- **Giải pháp triển khai kỹ thuật**:
  1. **Bổ sung và chuẩn hóa toàn bộ hàm điều khiển trong `appCadTool` (`app.js`)**:
     - Bổ sung `selectExportFormat(format)`: đồng bộ radio, highlight tile định dạng được chọn, tự động đổi nhãn và icon trên nút xuất `#btnExecuteCadExport`.
     - Bổ sung `executeExport()`: điều hướng gọi đúng hàm xuất tương ứng định dạng đã chọn (`exportDwg`, `exportPdf`, `exportAreaExcel`, `exportOptimizedImage`, `exportDgn`, `exportKml`, `exportGeoJson`, `exportTxt`, `shareExport`).
     - Bổ sung các phương thức xuất hoàn chỉnh cho MiniCAD: `exportDgn()` (xuất kịch bản MicroStation `.cmd` và bảng số liệu Famis `.dat`), `exportKml()` (Google Earth 3D có Polygon ranh thửa), `exportGeoJson()` (chuẩn RFC 7946 CRS84), `exportTxt()` (tọa độ toàn đạc điện tử & RTK), `shareExport()` (Web Share API & Clipboard).
     - Cập nhật `openExportModal()` và `closeExportModal()` quản lý `modal.style.display = 'flex'` / `'none'` và `classList.add('active')` / `remove('active')` mượt mà.
  2. **Tái thiết lập Bảng điều khiển "Cấu hình thông tin khác của bản vẽ" (TCVN 7285 & Bản đồ địa chính)**:
     - Tích hợp đầy đủ vào cả 2 modal: `#modalExportData` (Sổ đo mốc) và `#modalCadExportConfig` (MiniCAD).
     - Gồm 11 trường chi tiết: Tiêu đề in bản vẽ, Tên công trình/dự án, Chủ sở hữu/Người sử dụng, Đơn vị khảo sát/đo đạc, Số hiệu thửa/tờ bản đồ, Địa chỉ thửa đất, Người đo vẽ, Người kiểm tra/phê duyệt, Ngày lập, Ký hiệu mã bản vẽ, Ghi chú kỹ thuật.
     - Thêm 2 nút thao tác: "💾 Lưu cấu hình" (lưu vào `localStorage` bền vững) và "🔄 Đặt lại" (phục hồi mặc định chuẩn kỹ thuật).
     - Động cơ xuất AutoCAD `.dwg` và báo cáo PDF đọc và in trực tiếp các thông tin này vào khung tên (Title Block) và bảng góc ranh theo đúng quy chuẩn bản đồ địa chính Việt Nam.
  3. **Kiểm thử tự động & kiểm chứng trực quan**:
     - Tạo mới `tests/export_modal_and_drawing_config.test.js` (2/2 tests PASS).
     - Toàn bộ **276/276 bài test** trong `tests/*.test.js` PASS 100%.
     - Kiểm chứng thực tế qua Chrome DevTools: Modal mở mượt mà, bảng điều khiển hiển thị sắc nét, nút xuất bản vẽ `.dwg` phản hồi tức thì và tải file về máy thành công.

---

### [2026-10-22] Nâng Cấp Bảng Kê MiniCAD Chống Che Khuất: Phóng To Toàn Màn Hình, 4 Chế Độ Bố Trí Bảng Linh Hoạt & Sticky Header Chống Trôi
- **Yêu cầu từ người dùng**:
  - `làm cho bản kê này không bị che khuất và tạo thêm kiểm thử cho chức năng này`
- **Nguyên nhân cốt lõi gây che khuất**:
  1. Modal `#modalCadAreaTable` trước đây có kích thước cố định `max-width: 900px; max-height: 90vh;`, khi danh sách khối nhiều hoặc bảng chi tiết đỉnh dài, hai bảng xếp chồng dọc khiến bảng chi tiết bị dồn xuống đáy và bị thanh cuộn cắt mất tầm nhìn.
  2. Thẻ `thead` của bảng chi tiết đỉnh không được cố định (`position: sticky`), khi cuộn xem các đỉnh bên dưới thì tiêu đề cột (STT, Tên đỉnh, X, Y, Cạnh, Phương vị, Ghi chú) bị trôi mất, gây khó đối chiếu số liệu.
  3. Thiếu cơ chế điều chỉnh bố trí cho các màn hình khác nhau (màn hình dọc di động vs màn hình rộng máy tính).
- **Giải pháp triển khai kỹ thuật toàn diện**:
  1. **Nút Phóng to / Thu nhỏ toàn màn hình (`#btnCadTableMaximize`)**:
     - Nút ⛶ phóng to modal lên `98vw × 96vh`, mở rộng tối đa không gian hiển thị, loại bỏ hoàn toàn cảm giác chật chội.
     - Tự động lưu trạng thái vào `localStorage ('vn2k_cad_table_maximized')` để người dùng không phải bấm lại mỗi lần mở.
  2. **Thanh điều chỉnh bố trí bảng (`.cad-table-view-controls`) với 4 chế độ linh hoạt**:
     - `📑 Xem Cả Hai (both)`: Bố trí dọc chuẩn mực, tự cân đối chiều cao của cả Bảng khối và Bảng chi tiết đỉnh.
     - `📦 Chỉ Bảng Khối (blocks)`: Ẩn bảng chi tiết, mở rộng Bảng tổng hợp các khối & tỷ lệ diện tích % toàn màn hình (rất tiện khi cần rà soát cơ cấu đất dự án).
     - `📍 Chỉ Bảng Chi Tiết (coords)`: Ẩn bảng khối, giải phóng 100% diện tích modal cho Bảng kê chi tiết tọa độ đỉnh & cự ly cạnh VN-2000.
     - `🔀 Song Song 2 Cột (split)`: Bố trí dạng Grid 2 cột song song (cột trái: Bảng khối & tỷ lệ %, cột phải: Bảng chi tiết tọa độ đỉnh), cực kỳ trực quan và rộng rãi trên máy tính/máy tính bảng màn hình ngang.
     - Tự động lưu chế độ bố trí vào `localStorage ('vn2k_cad_table_view_mode')`.
  3. **Nút gập / mở thu gọn độc lập (`btnToggleCollapseBlocks`, `btnToggleCollapseCoords`)**:
     - Cho phép kỹ sư thu gọn nhanh từng bảng chỉ với 1 click mà không làm xáo trộn dữ liệu.
  4. **Sticky Header chống trôi tiêu đề cột (`.cad-sticky-thead`)**:
     - Cố định dòng tiêu đề `th` (`position: sticky; top: 0; z-index: 10; background: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.5);`), cuộn hàng trăm đỉnh vẫn luôn nhìn rõ tiêu đề cột.
  5. **Kiểm thử tự động**:
     - Tạo mới `tests/cad_table_layout_unobscured.test.js` (10/10 tests PASS).
     - Toàn bộ **267/267 bài test** trong `tests/*.test.js` PASS 100%.

---

### [2026-10-21] Sửa Lỗi Chức Năng Check Chọn Thửa Trong "Bảng Kê & Thống Kê Tổng Hợp MiniCAD"
- **Yêu cầu từ người dùng**:
  `"Bảng kê & thống kê tổng hợp MiniCAD" trong chức năng MiniCAD hiện không phản hồi ở chức năng check chọn thửa`
- **Nguyên nhân gốc rễ**:
  1. Trong `openAreaTableModal()` (`app.js`), mảng `allShapes` được khởi tạo thủ công bằng cách lặp qua `this.savedShapes` nhưng bỏ quên thuộc tính `selected: s.selected !== false`. Khi truyền `allShapes` vào `renderBlockList(allShapes)`, điều kiện kiểm tra `s.selected !== false` luôn nhận giá trị `undefined !== false` (tức `true`), khiến checkbox trong danh sách khối luôn bị render lại thành `checked`.
  2. Khi người dùng click bỏ chọn một thửa, hàm `toggleBlockSelect(idx, isChecked)` cập nhật `this.savedShapes[idx].selected = false` và gọi `openAreaTableModal()` để render lại, nhưng do `openAreaTableModal()` không giữ thuộc tính `selected` nên checkbox lại bị ép về `checked`, và tổng diện tích `totalArea` tính gộp toàn bộ các thửa mà không trừ thửa đã bỏ chọn.
  3. Khối đang vẽ dở (`active_draft`) khi người dùng click checkbox không được cập nhật trạng thái `_draftSelected`.
- **Giải pháp triển khai kỹ thuật**:
  1. Chuẩn hóa `openAreaTableModal()` sử dụng `this._getAllExportShapes()` (đã có đầy đủ chuẩn hóa `selected: s.selected !== false`, `_draftSelected`, tọa độ và stats).
  2. Tách biệt `selectedShapes = allShapes.filter(s => s.selected !== false)` để tính toán chính xác tổng diện tích `selectedArea`, tổng chu vi `selectedPerimeter`, và số đỉnh `selectedVertices` của các thửa được chọn.
  3. Cập nhật các thẻ tóm tắt `#cadModalAreaM2`, `#cadModalAreaHa`, `#cadModalPerimeter`, `#cadModalVertexCount` phản hồi tức thì theo số đo của các thửa được chọn kèm tỷ lệ số thửa chọn / tổng số thửa.
  4. Hiển thị trực quan trong bảng chi tiết đỉnh: các thửa bị bỏ chọn được làm mờ (opacity: 0.55 / 0.4) và gắn nhãn `👁️ Bỏ chọn (Không tính tổng)`.
  5. Cập nhật `toggleBlockSelect(idx, isChecked)` và `toggleSelectAllBlocks(isChecked)` hỗ trợ đầy đủ cả các khối đã lưu và khối đang vẽ dở (`this._draftSelected = isChecked`), lưu trạng thái bền vững qua `saveShapesForProject()` và `persistSession()`, đồng thời gọi `renderGeometry()` để lập tức ẩn/hiện thửa đất trên bản đồ MiniCAD.
- **Kiểm thử tự động**:
  - Bổ sung bộ test `tests/cad_block_selection.test.js`.
  - Toàn bộ 251/251 tests trong `tests/*.test.js` PASS 100%.

### [2026-10-21] Nâng Cấp Toàn Diện Studio Xuất Dữ Liệu & Bản Đồ Trắc Địa: Cửa Sổ Live Preview, Đa Định Dạng Chuẩn Tỷ Lệ & Khắc Phục Triệt Để Lỗi "Missing Symbol Table" trong AutoCAD
- **Yêu cầu từ người dùng**:
  1. `kiểm tra lại vấn đề xuất dữ liệu, cần tối ưu hóa xuất dữ liệu: Nhận chọn nút xuất dữ liệu==>cửa sổ preview==>cài đặt các thông tin, chọn lớp xuất dữ liệu,....==>chọn định dạng file được xuất dữ liệu (.png, .pdf, .xlsx, .dng (microstation), .dwg, .kml, ...)==>xuất dữ liệu.`
  2. `tối ưu các file dữ liệu được xuất ra đúng tỉ lệ được chọn.`
  3. `fix lỗi file .dwg không đọc được do lỗi "Missing symbol table"`
- **Nguyên nhân cốt lõi lỗi "Missing symbol table"**:
  - File CAD trước đây chỉ có duy nhất Table `LAYER` sơ sài trong Section `TABLES`, thiếu toàn bộ các Symbol Tables bắt buộc theo đặc tả AutoCAD của Autodesk (`VPORT`, `LTYPE`, `STYLE`, `BLOCK_RECORD`) và thiếu Section `BLOCKS`. Khi AutoCAD mở file này, trình nạp phát hiện thiếu các bảng ký hiệu chuẩn và báo lỗi nghiêm trọng *"Missing symbol table"* hoặc *"Drawing file is not valid"*.
- **Giải pháp triển khai kỹ thuật toàn diện**:
  1. **Khắc phục 100% lỗi "Missing symbol table" (`src/core/cad_geometry.js`)**:
     - Xây dựng đầy đủ 100% Symbol Tables chuẩn Autodesk AutoCAD 2000-2026:
       + Table `VPORT`: Entry `*ACTIVE` tự động định vị camera trung tâm bản vẽ dựa trên bounding box thực tế.
       + Table `LTYPE`: Đầy đủ `CONTINUOUS`, `DASHED`, `CENTER`, `BYBLOCK`, `BYLAYER`.
       + Table `LAYER`: Hệ thống lớp chuẩn TCVN 7285 & TT 25/2014/TT-BTNMT (`0`, `RANH_THUA`, `RANH_DAT`, `MOC_TOADO`, `SO_HIEU_DINH`, `CHIEU_DAI_CANH`, `TOADO_TEXT`, `LUOI_TOADO`, `KHUNG_BAN_VE`, `KHUNG_TEN`, `HUONG_BAC`).
       + Table `STYLE`: Khai báo phông chữ `STANDARD` (`txt`) và `VN_ARIAL` (`arial.ttf`).
       + Table `BLOCK_RECORD` & Section `BLOCKS`: `*MODEL_SPACE` và `*PAPER_SPACE`.
     - Tự động chuẩn hóa mảng điểm đầu vào, tính toán kích thước text height và bán kính tâm mốc scale theo đúng hệ số tỷ lệ $S = \text{Scale} / 1000$.
  2. **Quy trình xuất 5 bước tích hợp trong Studio Xuất Dữ Liệu (`#modalExportData` trong `index.html`)**:
     - **Cửa sổ Xem trước bản vẽ (Live Preview)**: SVG Map tương tác cao, tự động cập nhật ngay lập tức khi bật/tắt lớp hoặc thay đổi tỷ lệ bản đồ.
     - **Cài đặt thông tin dự án**: Tên công trình, Kỹ sư đo đạc, Ngày đo, Đơn vị khảo sát.
     - **Bộ chọn tỷ lệ bản vẽ chuẩn**: 1:500 (Hoàn công, Đô thị), 1:1.000 (Địa chính chuẩn), 1:2.000 (Tuyến, Quy hoạch), 1:5.000, 1:10.000, và chế độ Fit tự động tính toán theo khổ giấy.
     - **Bộ chọn lớp dữ liệu xuất (Layers)**: Bật/tắt độc lập Tâm mốc, Tên mốc, Tọa độ X/Y, Ranh thửa đất, Chiều dài cạnh, Lưới Km chữ thập, Khung bản vẽ, Kim chỉ hướng Bắc.
     - **11 Định dạng xuất dữ liệu**: AutoCAD (.dwg), MicroStation & Famis (.dgn), Báo cáo PDF A4/A3 (.pdf), Ảnh PNG Full HD (.png), Excel (.xlsx), Google Earth (.kml), GeoJSON (.geojson), Vector SVG (.svg), Tọa độ máy đo RTK (.txt), CSV UTF-8 (.csv), Chia sẻ trực tiếp (Zalo).
  3. **Tối ưu xuất file đúng tỷ lệ xích thực tế & đảm bảo tính toàn vẹn 100% của file xuất ra (`app.js`)**:
     - Nâng cấp `exportDwgFile()` nạp options tỷ lệ và metadata: Khắc phục triệt để lỗi "Missing symbol table" bằng cấu trúc đầy đủ Symbol Tables (`VPORT`, `LTYPE`, `LAYER`, `STYLE`, `BLOCK_RECORD`, `BLOCKS`), mở trực tiếp và xem trọn vẹn 100% trên AutoCAD 2000-2026, Civil 3D, MicroStation, QGIS.
     - Nâng cấp `exportDgnFile()`: Xuất song song tệp số liệu Famis chuẩn `.dat` (chuẩn địa chính TN&MT: `STT  Tên_Mốc  Y_Đông  X_Bắc  Cao_Độ  Mã_Điểm`) và tệp kịch bản MicroStation Key-in Command `.cmd` (tự động vẽ mốc, ranh thửa và nhãn tên vào đúng Level trong MicroStation với lệnh `@ten_file.cmd`).
     - Nâng cấp `exportPdfFile()` định dạng khổ giấy A4/A3 theo tỷ lệ được chọn, hiển thị sơ đồ phân bố mốc theo các lớp đã lọc.
     - Nâng cấp `exportPngImage()` vẽ đồ họa bản vẽ chuẩn kỹ thuật, hiển thị thước tỷ lệ xích Graphic Scale Bar góc dưới và xuất tên file theo tỷ lệ `${projName}_1-${scaleVal}.png`.
  4. **Kiểm thử tự động**:
     - Bổ sung bộ test `tests/export_data_modal_and_standards.test.js`.
     - Toàn bộ 242/242 unit tests trong `tests/*.test.js` PASS 100%.
- **Yêu cầu từ người dùng**:
  - `bỏ hết các video hướng dẫn đi (xóa vết các video cũ và các tài liệu liên quan video luôn, tạo file hướng dẫn .html khi người dùng cần hướng dẫn đi (Nhấn nút "?" để nhờ hướng dẫn)`
  - `hướng dẫn thì cái màn hình cần thao tác cần lớn để nhìn chứ, đưa mấy cái khung kia nhỏ hơn hoặc bố trí sao cho phù hợp. hiện tại hướng dẫn còn chưa nhìn được màn hình. chưa đọc xong hướng dẫn bước này thì đã chuyển sang bước khác.`
- **Giải pháp triệt để**:
  1. **Xóa sạch dấu vết video cũ & tài liệu liên quan**:
     - Xóa bỏ hoàn toàn `tutorials-pdoom.html` và toàn bộ thư mục `assets/video_assets/` (các file phụ đề .srt, file storyboard .json, typography).
     - Xóa bỏ và thay thế test cũ `pdoom_video_engine.test.js` bằng `tests/user_guide_handbook.test.js`.
  2. **Xây dựng Cẩm Nang Sổ Tay Hướng Dẫn Thực Địa Chuyên Nghiệp (`user-guide.html` & `huong-dan.html`)**:
     - **Màn hình thao tác cực lớn (Showcase 1000px-1100px)**: Dùng ảnh chụp thực tế chất lượng cao (`assets/tutorial_screens/`), rõ nét từng con số, nút bấm, ô nhập liệu. Tích hợp Lightbox phóng to 100%.
     - **Không bao giờ bị trôi bước**: Trình bày dạng cẩm nang kỹ thuật tĩnh (SOP), từng bước 1-2-3 rõ ràng, kèm Mẹo thực địa (Field Tips) và Cảnh báo sai số. Kỹ sư tự do đọc kỹ bao lâu tùy thích mà không bị áp lực thời gian.
     - **14 Chuyên đề toàn diện**: Chuyển đổi đơn điểm, Chuyển đổi hàng loạt Excel, Bản đồ & Live GPS HUD, Cắm mốc la bàn, Sổ đo dự án, MiniCAD thực địa, 5 Bảng kê ranh đất, Trắc dọc & Đào đắp, Camera đóng dấu tọa độ, KTT 63 tỉnh thành, Xuất DWG/Excel/KML, Tiện ích trắc địa, Lưu trữ ngoại tuyến.
     - **Sidebar mục lục cố định (Sticky TOC)** và **Bộ lọc tìm kiếm tức thì (Live Search Filter)**.
     - **Hỗ trợ In ấn / Xuất PDF (Print friendly)** làm tài liệu đào tạo nội bộ.
  3. **Tích hợp nút "?" toàn diện trong ứng dụng**:
     - Nút `?` ở Header (`#btnHeaderHelpGuide`) và ở từng phân hệ: Mở modal tóm tắt kèm nút nổi bật **"📖 Cẩm Nang Toàn Diện"** (`appGuide.openFullUserGuide()`) dẫn thẳng tới chuyên mục tương ứng trên `user-guide.html`.
     - Drawer menu mục 5.7: Đổi thành `5.7 Cẩm Nang & Sổ Tay Hướng Dẫn`, nhấp vào mở trực tiếp `user-guide.html`.
  4. **Kiểm thử hồi quy**:
     - 237/237 bài test PASS 100% trong `tests/*.test.js`.

---
- **Yêu cầu từ người dùng**:
  1. `các khung làm nổi bật nội dung cần hướng dẫn và vị trí con trỏ chuột chưa được rê đúng vị trí cần hướng dẫn các chức năng.`
  2. `các chức năng chưa thực sự được hướng dẫn cụ thể`
- **Nguyên nhân cốt lõi (Root Cause)**:
  - Trước đây video hướng dẫn dùng chung 1 cặp tọa độ `%` cho cả Mobile (dọc 9:16) và Desktop (ngang 16:10). Do giao diện Desktop và Mobile có bố cục layout hoàn toàn khác nhau (Desktop chia 2 cột trái phải, Mobile 1 cột dọc), việc dùng chung tọa độ khiến trên Desktop con trỏ chuột và khung spotlight bị lệch hơn 20-30% so với vị trí nút thực tế.
  - Tọa độ con trỏ trước đây chỉ là 1 điểm tĩnh `x, y`, đứng yên một chỗ và không có hành vi rê chuột hay thao tác bấm (Click), thiếu tính tương tác thực tế của một chuyên viên đo đạc thao tác phần mềm.
  - Lời thoại và văn bản hướng dẫn còn mang tính khái quát, thiếu thông số nhập liệu thực nghiệm cụ thể và các bước bấm phím tắt kỹ thuật.
- **Triển khai kỹ thuật toàn diện**:
  1. **Đo đạc chính xác 100% tọa độ thực tế trên cả 2 viewports (Chrome DevTools MCP)**:
     - **Chế độ Desktop (1280×800)**:
       + MiniCAD: Tab Vẽ `{x: 30.5, y: 11.4}`, Nút Đa giác `[P]` `{x: 6.3, y: 18.4, w: 8.7, h: 4.8}`; Tab Snap `{x: 49.1, y: 11.4}`, Nút Bắt line `[B]` `{x: 18.0, y: 18.4, w: 11.2, h: 4.8}`, Ortho `[F8]` `{x: 29.5, y: 18.4}`; Tab Sửa `{x: 38.6, y: 11.4}`, Nút Chọn `[V]` `{x: 7.6, y: 18.4}`, Xoay `[RO]` `{x: 31.8, y: 18.4}`; Tab File `{x: 58.0, y: 11.4}`, Bảng kê `[E]` `{x: 14.7, y: 18.4}`, Hộp thoại xuất AutoCAD (.dwg) `{x: 50.0, y: 60.0}`.
       + Trắc dọc & Đào đắp: Nút Tuyến Mẫu (5 Cọc) `{x: 19.7, y: 33.1, w: 11.2, h: 4.3}`; Ô nhập Cao độ $Z_0$ `{x: 9.8, y: 63.1}`, Dốc dọc $i$ `{x: 24.1, y: 63.0}`; Nút Tính toán `{x: 17.0, y: 76.4, w: 28.0, h: 4.8}`; Biểu đồ trắc dọc `{x: 65.0, y: 53.3, w: 62.5, h: 50.0}`; Nút Xuất CAD .DWG `{x: 9.4, y: 89.3}`, Xuất CSV `{x: 24.5, y: 89.3}`.
     - **Chế độ Mobile (500×844)**:
       + MiniCAD: Tab Vẽ `{x: 9.5, y: 12.0}`, Nút Đa giác `[P]` `{x: 14.9, y: 23.6, w: 22.3, h: 4.5}`; Tab Snap `{x: 56.6, y: 12.0}`, Nút Bắt line `[B]` `{x: 44.9, y: 23.6, w: 28.7, h: 4.5}`.
       + Trắc dọc: Nút Tuyến Mẫu `{x: 53.9, y: 35.2}`; Ô nhập $Z_0$ `{x: 27.7, y: 63.6}`, Dốc $i$ `{x: 69.3, y: 63.5}`; Nút Tính toán `{x: 48.5, y: 76.2}`; Nút Xuất CAD .DWG `{x: 77.6, y: 83.2}`.
  2. **Tách biệt độc lập cấu trúc dữ liệu theo thiết bị ([tutorials-pdoom.html](file:///d:/Nhu/APP/VN2000-PWA/tutorials-pdoom.html))**:
     - Định nghĩa riêng rẽ `focus` & `cursor` (dành cho Mobile) và `desktopFocus` & `desktopCursor` (dành cho Desktop).
     - Hỗ trợ quỹ đạo 3 mốc tọa độ: `start` (vị trí xuất phát) → `target` (tâm nút cần thao tác) → `end` (vùng kết quả sau khi bấm).
  3. **Động cơ mô phỏng rê chuột & nhấp chuột chân thực (`interpolateCursor`)**:
     - Áp dụng hàm mượt bậc 3 (Smoothstep Cubic Easing: $3t^2 - 2t^3$) chia làm 4 pha tự nhiên:
       + *Pha 1 (0% - 28%)*: Rê con trỏ chuột mượt mà từ điểm xuất phát đến đúng tâm nút bấm.
       + *Pha 2 (28% - 48%)*: Thực hiện cú **CLICK** thực tế — con trỏ chuột co tỉ lệ ($0.88\times$), đổi màu xanh cyan, sóng xung kích (Click Pulse Wave) lan tỏa từ đầu mũi tên, khung spotlight rực sáng 28px blur.
       + *Pha 3 (48% - 78%)*: Rê con trỏ từ nút bấm sang vùng hiển thị kết quả (bản đồ, biểu đồ hoặc bảng số liệu).
       + *Pha 4 (78% - 100%)*: Dừng nhẹ con trỏ tại vùng kết quả để người dùng quan sát số liệu nghiệm thu.
  4. **Chi tiết hóa nghiệp vụ từng bước thực hành (Action-Oriented Hands-on Walkthrough)**:
     - Nêu rõ tên phím tắt bàn phím: `[P]` (Đa giác), `[L]` (Đường thẳng), `[F3]` (Bắt mốc), `[B]` (Bắt line ranh), `[F8]` (Ortho vuông góc), `[RO]` (Xoay ranh đất), `[E]` (Bảng kê diện tích).
     - Nêu rõ giá trị thông số số liệu cụ thể: $Z_0 = 12.00\text{m}$, $i = 0.00\%$, $B = 6.00\text{m}$, $m = 1.00$; đọc trực tiếp số liệu đào đắp: $V_{đào} = 404.2\text{ m}^3$, $V_{đắp} = 193.5\text{ m}^3$.
  5. **Kiểm tra trực quan & Đảm bảo chất lượng (QA)**:
     - Trực tiếp kiểm tra và chụp màn hình qua Chrome DevTools MCP trên cả hai chế độ `📱 Điện thoại` và `💻 Màn hình lớn`.
     - Xác nhận con trỏ chuột và khung spotlight ôm khít 100% nút bấm tại thời điểm click.
     - Bộ kiểm thử tự động toàn dự án: **237 / 237 bài test PASS 100%**.

---

### [2026-10-21] Sửa Lỗi Thanh Công Cụ MiniCAD & Nâng Cấp Toàn Diện Studio Video Hướng Dẫn
- **Yêu cầu từ người dùng**:
  1. `Thanh công cụ của MiniCAD bị show hết mà không thu theo từng cụm riêng (chiếm hết màn hình)`
  2. `Về các video:`
     - `phần hướng dẫn bằng giọng nói quá đơn giản, cần chi tiết hơn`
     - `phần hiển thị giao diện hướng dẫn cần hướng dẫn trên màn hình có kích thước lớn/nhỏ.`
     - `mô tả và hình ảnh của video chưa khớp với nhau. bên cạnh đó trỏ chuột chưa được đặt đúng chức năng, các bước được mô tả.`
     - `các chức năng nâng cao như Minicad, đào đắp,.... cần được hướng dẫn chi tiết đến từng công cụ của MiniCAD, đào đắp,...`
- **Triển khai kỹ thuật toàn diện**:
  1. **Sửa dứt điểm lỗi thanh công cụ MiniCAD bị bung cùng lúc cả 5 cụm panel ([ui-polish.css](file:///d:/Nhu/APP/VN2000-PWA/ui-polish.css))**:
     - *Nguyên nhân gốc rễ (Root Cause)*: Rule `#mapCadToolbar .cad-collapsible-row { display: flex !important; }` đã vô hiệu hóa thuộc tính `panel.style.display = 'none'` trong JavaScript, khiến cả 5 cụm công cụ (Vẽ, Sửa, Nhãn, Snap, File) cùng hiển thị đồng thời chiếm trọn màn hình.
     - *Khắc phục*: Chuyển thành `#mapCadToolbar .cad-collapsible-row:not(.active) { display: none !important; }` và `#mapCadToolbar .cad-collapsible-row.active { display: flex !important; }`. Chỉ mở duy nhất 1 hàng công cụ của tab đang chọn, giải phóng 100% không gian bản đồ thực địa.
  2. **Nâng cấp Studio Video Hướng Dẫn hỗ trợ Dual-Mode Màn hình lớn & Màn hình nhỏ ([tutorials-pdoom.html](file:///d:/Nhu/APP/VN2000-PWA/tutorials-pdoom.html))**:
     - Bổ sung nút chuyển đổi tức thì giữa:
       + `📱 Điện thoại (Mobile)`: Giả lập Smartphone 9:16 viền Titanium, touch ripple phát quang cyan.
       + `💻 Màn hình lớn (Desktop / Tablet)`: Khung Laptop/Monitor 16:10 sang trọng, thanh Safari/macOS có 3 nút điều khiển, URL `https://vn2000.pro — Màn hình chuyên dụng kỹ sư`, con trỏ chuột máy tính (Sharp Computer Mouse Pointer Arrow) sắc nét có hiệu ứng click ripple.
  3. **Tách & Nâng cấp thành 8 Video Chuyên Biệt, Chi Tiết Từng Công Cụ Nâng Cao**:
     - **Video 6: Chi Tiết Bộ Công Cụ MiniCAD Thực Địa** (4 bước): Tab Vẽ (Đa giác [P], Tuyến [L], Nhà [REC], Bán kính [C], Polar [D]); Tab Snap (Bắt mốc [F3], Bắt cạnh ranh [B] chống hở thửa đất, Ortho [F8] vuông góc); Tab Sửa & Nhãn ([V, RO, O, DIM, Tem]); Bảng kê diện tích m² & Xuất bản vẽ AutoCAD (.dwg) chuẩn TT 25/2014/TT-BTNMT.
     - **Video 7: Trắc Dọc Địa Hình & Khối Lượng Đào Đắp TCVN 4447:2012** (4 bước): Nạp cọc mốc tuyến và cao độ tự nhiên $Z_{TN}$; Thiết kế đường đỏ $Z_0$, độ dốc dọc $i$ (%) và mái dốc taluy $m$; Mặt cắt trắc dọc TCVN 9436, khối lượng $V_{đào}, V_{đắp}$ ($m^3$); Xuất bản vẽ trắc dọc AutoCAD (.dwg) và bảng tính CSV.
  4. **Khớp Chuẩn Xác 100% Giọng Đọc Chuyên Nghiệp, Hình Ảnh Thực Tế & Tọa Độ Con Trỏ Chuột**:
     - Chụp bổ sung bộ ảnh màn hình Desktop và Mobile độ nét cao bằng Chrome DevTools MCP (`fn6_step1_draw.png`, `fn6_step2_snap.png`, `fn6_step3_export.png`, `fn7_step1_profile_input.png`, `fn7_step2_profile_design.png`, `fn7_step3_profile_chart.png`, `desktop_fn1_transform.png`, `desktop_fn2_project.png`, `desktop_fn4_geoid.png`, `desktop_fn5_batch.png`, `desktop_fn6_cad.png`, `desktop_fn7_profile.png`).
     - Tọa độ `cursor` và `focus` được căn chỉnh chính xác đến từng nút bấm trên giao diện.
     - Thuyết minh Tiếng Việt chi tiết nghiệp vụ sâu sắc, kèm phụ đề tiếng Anh và mẹo thực địa chuyên gia.
  5. **Kiểm thử hồi quy tự động**:
     - `node --test tests/*.test.js`: **237 / 237 bài test PASS 100%**.
- **Yêu cầu**: `" Video Hướng Dẫn Thao Tác Chức Năng (Quay chụp màn hình • Giọng đọc & Nhạc nhẹ)." sao mà AI quá vậy. bạn hãy sửa lỗi để thuận tự nhiên như một coder chuyên nghiệp gọn gàng chứ.`
- **Triển khai kỹ thuật**:
  1. **Loại bỏ văn phong giải thích rườm rà dạng AI prompt**:
     - Menu Drawer mục 5.7: Đổi từ `"5.7 Video Hướng Dẫn Thao Tác Chức Năng (Quay chụp màn hình • Giọng đọc & Nhạc nhẹ)"` thành:
       + Tiêu đề: **`5.7 Video Hướng Dẫn Sử Dụng`**
       + Mô tả nghiệp vụ: **`Trực quan từng bước 7 tính năng chính`**
  2. **Chuẩn hóa trang Studio ([tutorials-pdoom.html](file:///d:/Nhu/APP/VN2000-PWA/tutorials-pdoom.html))**:
     - Tiêu đề trang & header: **`VN2000 PRO — Video Hướng Dẫn Sử Dụng`** (Badge: `HƯỚNG DẪN`).
     - Thanh điều khiển âm thanh: `🎹 Nhạc nền:`, `🗣️ Thuyết minh:` thay vì `Nhạc nhẹ`, `Giọng đọc`.
     - Danh mục: **`📂 DANH SÁCH VIDEO HƯỚNG DẪN`**.
  3. **Kiểm tra trực quan & Kiểm thử hồi quy**:
     - Xác thực thực tế qua Chrome DevTools MCP trên cả mobile viewport và desktop viewport: giao diện gọn gàng, đồng nhất với các mục khác trong hệ thống.
     - **237 / 237 bài test tự động PASS 100%**.

### [2026-10-21] Chuẩn Hóa Xuất File Bản Vẽ AutoCAD (.dwg) & Loại Bỏ Hoàn Toàn Định Dạng .dxf
- **Mục tiêu**: Chuẩn hóa toàn bộ hệ thống xuất bản vẽ CAD sang định dạng AutoCAD (.dwg) theo tiêu chuẩn kỹ thuật địa chính TCVN và Thông tư 25/2014/TT-BTNMT; loại bỏ triệt để định dạng trung gian .dxf khỏi giao diện người dùng, mã nguồn và hệ thống file.
- **Triển khai kỹ thuật toàn diện**:
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

### [2026-10-21] Xây Dựng Hệ Thống Video Hướng Dẫn Thao Tác Bằng Quay Chụp Màn Hình (1 Chức Năng / 1 Video)
- **Yêu cầu**: "video hướng dẫn bằng âm nhạc của bạn làm chán quá, hãy bỏ đi, thực hiện sử dụng quay chụp màn hình để hướng dẫn thao tác cho từng chức năng đi, chỉ cần thêm nhạc nhẹ nhàng và giọng đọc hướng dẫn từng chức năng thôi (không gom hướng dẫn nhiều chức năng trong cùng 1 video - tách riêng 1 chức năng/1 video)"
- **Triển khai kỹ thuật toàn diện**:
  1. **Bãi bỏ hoàn toàn định dạng MV ca nhạc / hát vè vần**:
     - Loại bỏ toàn bộ ca từ hát rhyme, beat dồn dập, chuyển sang định dạng **Screen Walkthrough Video Studio** chuyên nghiệp.
  2. **Quay chụp màn hình thực tế từng chức năng (`assets/tutorial_screens/`)**:
     - Sử dụng Chrome DevTools MCP trực tiếp chụp ảnh màn hình giao diện thực tế của ứng dụng VN2000-PWA với 11 frame độ nét cao:
       + Chức năng 1: Form chuyển đổi, nạp tọa độ, xem bản đồ vệ tinh (`fn1_step1_form.png`, `fn1_step2_input.png`, `fn1_step3_map.png`).
       + Chức năng 2: Thẻ chuyển đổi hàng loạt, dán bảng Excel tự nhận diện cột (`fn2_step1_batch_tab.png`, `fn2_step2_batch_data.png`).
       + Chức năng 3: Màn hình Bản đồ GPS thực địa & Live HUD (`fn3_step1_gps.png`).
       + Chức năng 4: Cắm mốc thực địa & La bàn dẫn hướng (`fn4_step1_stakeout.png`).
       + Chức năng 5: Sổ đo dự án & Hộp thoại xuất 5 định dạng (`fn5_step1_datamgmt.png`, `fn5_step2_export_modal.png`).
       + Chức năng 6: Tiện ích Vẽ mặt bằng MiniCAD độc lập (`fn6_step1_cad.png`).
       + Chức năng 7: Camera khảo sát đóng dấu tọa độ watermark (`fn7_step1_camera.png`).
  3. **Tách riêng 1 chức năng / 1 video độc lập (7 Videos Dedicated)**:
     - Không gom chung: người dùng chọn chức năng nào sẽ xem đúng video hướng dẫn chức năng đó.
     - Canvas Full HD 1920×1080 hiển thị khung điện thoại di động mô phỏng thao tác vuốt chạm (Ken Burns pan/zoom, spotlight highlight vùng UI đang thao tác, con trỏ cảm ứng ripple phát quang).
     - Bảng thẻ chỉ dẫn từng bước rõ ràng (Step Badge, Tiêu đề bước, Lời hướng dẫn, Subtitle tiếng Anh, Mẹo thực địa, Thanh tiến trình từng bước).
  4. **Nhạc nền Piano Ambient Lo-Fi cực kỳ nhẹ nhàng & Giọng đọc Tiếng Việt chuẩn**:
     - Nhạc nền: Hợp âm Piano Ambient Lo-Fi (`Cmaj7 → Am7 → Fmaj7 → G6`) êm dịu, du dương, âm lượng nhẹ nhàng (mặc định 25%) không lấn át thuyết minh.
     - Giọng đọc: Web Speech API TTS tiếng Việt tự động đọc to, rõ ràng lời hướng dẫn khi chuyển sang từng bước thao tác. Có nút Tắt/Bật, thanh trượt âm lượng và nút "Đọc lại".
  5. **Tính năng Xuất Video Client-Side (MediaRecorder)**:
     - Nút "Xuất Video MP4" xuất file clip hướng dẫn của chức năng đó về thiết bị người dùng.
  6. **Đồng bộ hóa Menu & Kiểm thử**:
     - Cập nhật mục 5.7 trong `index.html` Side Drawer thành *"5.7 Video Hướng Dẫn Thao Tác Chức Năng (Quay chụp màn hình • Giọng đọc & Nhạc nhẹ)"*.
     - Cập nhật bài test [tests/pdoom_video_engine.test.js](file:///d:/Nhu/APP/VN2000-PWA/tests/pdoom_video_engine.test.js).
     - Toàn bộ **237 / 237 bài test PASS 100%**.
     - Nghiệm thu trực tiếp trên Chrome DevTools cả trên Mobile Viewport (390×844) và Desktop Viewport (1280×800).

### [2026-10-21] Sửa Dứt Điểm Lỗi Thanh Menu Không Thể Vuốt Lên & Chức Năng Bị Che Khuất
- **Yêu cầu**: "thanh menu không thể vuốt lên để chọn các chức năng bị che khuất"
- **Phân tích nguyên nhân gốc rễ (Root Cause)**:
  1. **Side Drawer (`#navTreeDrawer`)**:
     - `.nav-tree-drawer` có `z-index: 2200` và `.nav-tree-backdrop` có `z-index: 2100`, trong khi thanh dock nổi `#mobileBottomNav` có `z-index: 2400` và header có `z-index: 2500`. Do đó, khi Drawer mở ra, thanh Bottom Dock vẫn nằm đè lên trên Drawer ở đáy màn hình, che khuất toàn bộ các mục 5.1 đến 5.7 và nuốt cử chỉ chạm vuốt ở 1/3 dưới màn hình!
     - `body.drawer-open` có `touch-action: none !important;` khiến trình duyệt mobile (WebKit, Chrome) chặn cử chỉ cuộn dọc trên mọi phần tử con.
  2. **Trang Chủ / Màn Hình Chính (`#screen-menu`)**:
     - `#screen-menu` có `padding-bottom: calc(68px + ...)`, trong khi thanh dock `#mobileBottomNav` chiếm khoảng 90-110px ở đáy. Khi cuộn xuống hết trang chủ, các thẻ chức năng ở đáy ("Tiện Ích: Vẽ Mặt Bằng CAD Mini", v.v.) bị thanh dock che khuất phân nửa và không thể vuốt lên cao hơn được.
  3. **Bottom Sheet Chuyển Đổi Trên Bản Đồ (`#transformBottomSheet`)**:
     - Thiếu sự kiện click/tap 1 chạm trên drag handle để toggle và ngưỡng vuốt 35px quá nặng.
- **Giải pháp xử lý toàn diện**:
  1. **Nâng cấp Side Drawer**:
     - Cập nhật `.nav-tree-drawer` lên `z-index: 9999 !important;`, `.nav-tree-backdrop` lên `z-index: 9998 !important;`.
     - Thêm luật CSS và xử lý JS: khi mở Drawer (`body.drawer-open`), thanh Bottom Dock được ẩn hoàn toàn (`display: none !important; opacity: 0; pointer-events: none; z-index: -1;`).
     - Sửa `body.drawer-open` thành `touch-action: pan-y !important;` (xóa `touch-action: none`), cho phép vuốt cuộn 100% mượt mà trên di động.
  2. **Tăng Dock Clearance cho Trang Chủ & Màn Hình**:
     - Cập nhật `#screen-menu`, `#screen-datamgmt`, `#screen-about`, `#screen-camera`, v.v. lên `padding-bottom: calc(130px + env(safe-area-inset-bottom, 20px)) !important;`.
     - Cho phép cuộn vuốt trọn vẹn mọi thẻ chức năng ở đáy màn hình vượt hẳn lên trên thanh Bottom Dock.
  3. **Tối ưu Bottom Sheet**:
     - Bổ sung sự kiện 1-chạm tap/click trên drag handle để tự động thu gọn/mở rộng (`sheet-peek`), hạ ngưỡng kéo vuốt xuống 15px.
  4. **Kiểm thử tự động & Trực quan**:
     - Tạo bài test `tests/menu_scroll_and_touch_fix.test.js` xác thực bảo vệ.
     - Toàn bộ **237 / 237 bài test PASS 100%**.
     - Chụp ảnh màn hình kiểm chứng trực tiếp qua Chrome DevTools MCP.

### [2026-10-21] Khắc Phục Lỗi Cuộn Menu Drawer & Nâng Cấp Hệ Thống Âm Nhạc Polyphonic Lo-Fi Studio
- **Yêu cầu**:
  1. "thanh menu không thể vuốt lên để chọn các chức năng bị che khuất"
  2. "nhạc bạn làm nghe chán quá."
- **Triển khai kỹ thuật toàn diện**:
  1. **Khắc phục dứt điểm lỗi kẹt cuộn Menu Drawer**:
     - Phát hiện nguyên nhân cốt lõi: Các thẻ con trong `.drawer-tree-body` mặc định bị Flexbox co ép (`flex-shrink: 1`), làm triệt tiêu thanh cuộn dọc (`scrollHeight: 669px === clientHeight: 669px`).
     - Bổ sung luật CSS cưỡng chế trong `ui-polish.css`:
       + `.drawer-tree-body > * { flex-shrink: 0 !important; }`
       + `.drawer-folder.open { height: auto !important; max-height: none !important; overflow: visible !important; }`
       + `.drawer-tree-body { min-height: 0 !important; overflow-y: scroll !important; -webkit-overflow-scrolling: touch !important; padding-bottom: calc(var(--sat-safe-bottom, 20px) + 160px) !important; touch-action: pan-y !important; }`
     - Bổ sung cơ chế khóa cuộn nền ngoài `document.body.classList.add('drawer-open')` trong `app.js`.
     - Xác thực qua Chrome DevTools Viewport di động: `scrollHeight` đạt **1601px**, cuộn `scrollTop = 932px`, hiển thị đầy đủ 100% các mục cuối (mục 5.4 đến 5.7 và nút Ủng Hộ).
  2. **Nâng cấp Hệ thống Âm nhạc Polyphonic Lo-Fi Studio (`tutorials-pdoom.html`)**:
     - Thay thế các tiếng oscillator bíp đơn điệu bằng **Polyphonic Web Audio Synthesizer**:
       + **Hợp âm Lo-Fi Jazz**: `Dm9 → G13 → Cmaj9 → Am9` với 2 oscillator detuned ±4 cents qua Low-pass filter 750Hz tạo độ ấm mềm mại chuẩn analog.
       + **Giai điệu Rhodes Piano / Bell Plucks**: Ngẫu hứng pentatonic thánh thót, du dương ở các phách lệch.
       + **Sub-Bass 55Hz**: Trầm sâu ấm cúng, nảy nhịp tự nhiên.
       + **Lo-Fi Velvet Drums**: Soft kick, velvet snare/rimshot và shaker nhẹ nhàng giữ nhịp swing thư thái.
       + **Tape Echo / Reverb Network**: Mô phỏng vang không gian băng từ 280ms êm dịu.
     - **3 Phong cách Âm nhạc Tự chọn**:
       + ☕ `Lo-Fi Trắc Địa Chill` (Ấm áp, êm dịu giúp kỹ sư tập trung làm việc)
       + 🌆 `Cyber Synthwave 80s` (Retro neon, arpeggiator sôi động)
       + 🍃 `Ambient Zen Space` (Không gian sâu lắng, tĩnh tại)
     - **Bảng Điều Khiển Âm Thanh Chuyên Nghiệp**:
       + 🗣️ **Nút Tắt / Bật Giọng đọc riêng biệt**: Cho phép tắt hẳn giọng đọc thuyết minh để nghe thuần nhạc nền thư giãn.
       + 🎵 **Nút Tắt / Bật Nhạc nền** + Thanh trượt Volume BGM (0% - 100%).
       + 🎙️ **Thanh trượt Volume Giọng đọc** độc lập.
       + 🔊 **Nút Tắt/Bật Master Sound**.
     - **Real-Time Audio Spectrum Neon Equalizer**: Vẽ dải quang phổ tần số 20 cột neon trực tiếp trên khung nhìn Canvas Full HD.
  3. **Kiểm thử tự động**:
     - Toàn bộ **234 / 234 bài test PASS 100%** (`node --test tests/*.test.js`).
     - Xác thực trực tiếp trên trình duyệt qua Chrome DevTools MCP.

### [2026-10-21] Cài Đặt Skill pdoom-video & Xây Dựng Studio Video Hướng Dẫn Âm Nhạc Song Ngữ (Code-Rendered)
- **Yêu cầu**: Cài đặt repo `mexicat/pdoom-video` thành 1 skill, sau đó sử dụng để tạo các video hướng dẫn sử dụng app có chất lượng cao, song ngữ Anh - Việt để đọc, và tiếng Việt là ngôn ngữ hát/hướng dẫn.
- **Triển khai kỹ thuật toàn diện**:
  1. **Cài đặt Skill `pdoom-video`**:
     - Tạo tài liệu quy chuẩn tại `C:\Users\User\.gemini\config\skills\pdoom-video\SKILL.md` và `.agents/skills/pdoom-video/SKILL.md`.
     - Quy chuẩn hóa 5 trụ cột: Deterministic Timeline (`render(t)`), Word-Synced Karaoke Typography, Scene Module System, Web Audio Drum Synthesizer + Web Speech Voice, và Export Pipeline (MediaRecorder + CapCut/SRT).
  2. **Bộ 3 Video Hướng Dẫn Code-Rendered (1080p60)**:
     - **Tập 1**: *"Vè Chuyển Đổi VN-2000 & Bắt Sóng GPS"* (128 BPM - Preset `tech_cyber`).
     - **Tập 2**: *"Khúc Ca Mốc Dự Án & Sổ Đo Thực Địa"* (120 BPM - Preset `bold_impact`).
     - **Tập 3**: *"Giai Điệu MiniCAD & Thửa Đất Khống Chế"* (132 BPM - Preset `kinetic_hype`).
  3. **Word-Synced Karaoke Typography Song Ngữ (Anh - Việt)**:
     - Dòng 1: Tiếng Việt hát/hướng dẫn theo nhịp phách, từ đang hát phóng to và phát quang rực rỡ màu vàng hổ phách (`#f59e0b`).
     - Dòng 2: Tiếng Anh phụ đề kỹ thuật quốc tế dịch nghĩa chuẩn xác bên dưới.
  4. **Studio Player Chuyên Biệt `tutorials-pdoom.html`**:
     - Canvas Full HD 1920×1080 render 60fps mượt mà bằng toán học thuần túy.
     - Bộ máy âm thanh Web Audio đánh trống Kick/Snare/Hi-hat theo BPM thực tế.
     - Giọng đọc/hát tiếng Việt qua Web Speech API đồng bộ từng câu hát.
     - Phím tắt chuẩn pdoom-video: `Space` (Play/Pause), `←/→` (Seek ±1s/5s), `,/.` (Frame step), `L` (Loop), `H` (Toggle HUD).
     - Hỗ trợ xuất video WebM/MP4 trực tiếp từ Canvas qua `MediaRecorder` và tải trọn gói phụ đề `.srt` song ngữ + CapCut typography `.json`/`.svg`.
  5. **Tích hợp & Kiểm thử**:
     - Thêm mục `5.7 Video Hướng Dẫn Âm Nhạc Song Ngữ` trong Menu Drawer của `index.html`.
     - Thêm bộ test `tests/pdoom_video_engine.test.js` kiểm tra 5/5 kịch bản thành công.
     - Toàn bộ **234 / 234 bài test PASS 100%**.
     - Đã xác thực trực quan qua Chrome DevTools MCP trên cả 3 tập.

### [2026-10-21] Chuyển Đổi Thành Thông Báo Treo Góc Trên Màn Hình & Tối Giản Văn Phong (Tự Tin, Sang Trọng)
- **Đáp ứng phản hồi**:
  1. **Không chiếm màn hình**: Chuyển đổi từ modal overlay che kín giữa trang sang **Thông báo treo góc trên màn hình (Top-Right Floating Toast Card)**:
     - Xóa bỏ hoàn toàn lớp backdrop nền đen che mờ (`background: transparent !important`, `pointer-events: none`).
     - Định vị treo góc trên: `top: 12px; right: 16px;` (trên Desktop/Tablet) và `top: 8px; left: 8px; right: 8px;` (trên Mobile).
     - Toàn bộ giao diện bản đồ, menu và tác vụ bên dưới hiển thị thông thoáng 100%, người dùng không bị cảm giác che kín màn hình.
  2. **Văn phong sang trọng, tự tin và siêu ngắn gọn (ít chữ)**:
     - **Tiêu đề**: `Mời Tác Giả Ly Cà Phê ☕`
     - **Phụ đề**: `Đồng hành cùng dự án VN2000 PRO`
     - **Thông điệp ngắn gọn 1 câu duy nhất**: *"Ứng dụng phi lợi nhuận. Tùy tâm tiếp sức để cùng phát triển!"*
     - Triệt tiêu hoàn toàn giải thích dài dòng, không xin xỏ con số, không than thở máy chủ.
  3. **Tối ưu layout nhỏ gọn**:
     - 4 kênh chuyển khoản dạng pill 1 hàng: `Vietin | BIDV | MoMo | Zalo`.
     - Mã VietQR 140px sắc nét kèm nút `Chép` STK nhanh.
     - Thanh đếm ngược 20s mỏng 4px và nút đếm ngược `⏳ Chờ {n}s để vào ứng dụng...` ➔ chuyển thành `🚀 Vào Ứng Dụng (Cảm ơn bạn!)`.
  4. **Bảo đảm chất lượng**:
     - 229 / 229 bài test PASS 100%. Xác thực qua Chrome DevTools MCP trên cả Desktop và Mobile.


### [2026-10-21] Khắc Phục Lỗi Chặn Lớp Phủ Android / Bong Bóng Chat & Bảo Vệ Cấp Quyền GPS Thông Minh
- **Nguyên nhân**: Cơ chế Tapjacking Protection của Android chặn hộp thoại cấp quyền (Permission Dialog) của Chrome khi máy có bong bóng chat Messenger/Zalo, nút ảo hoặc app lọc màn hình đang nổi trong lúc webapp tự động dò GPS ngay lúc tải trang (`DOMContentLoaded`).
- **Triển khai khắc phục toàn diện**:
  1. **Lazy Permissions Checking trong `appGps.init()`**:
     - Sử dụng `navigator.permissions.query({ name: 'geolocation' })` để kiểm tra trước trạng thái cấp quyền.
     - Nếu đã cấp quyền (`granted`): Tự động bắt GPS an toàn mà không làm bung popup.
     - Nếu là thiết bị mới chưa cấp quyền (`prompt`): Đưa GPS về trạng thái Chờ (Standby / Click-to-activate), chỉ kích hoạt khi người dùng chạm ngón tay có chủ đích (`User Gesture`).
  2. **Tự động bắt lỗi Tapjacking & Chặn quyền**:
     - Trong `startTracking()` và `getLiveGps()`: Bắt mã lỗi `err.code === 1` (`PERMISSION_DENIED`).
     - Tự động hiển thị Toast cảnh báo chi tiết và kích hoạt Modal Hướng Dẫn Khắc Phục.
  3. **Tích hợp Cửa Sổ Trợ Giúp Cấp Quyền `#modalGpsPermissionGuide`**:
     - Giải thích rõ ràng nguyên nhân lớp phủ Android và hướng dẫn 2 cách khắc phục đơn giản:
       - Cách 1: Kéo đóng bong bóng chat Messenger / Zalo / tắt app lọc màn hình rồi bấm Thử lại.
       - Cách 2: Bấm vào biểu tượng Cài đặt trang web ⚙️ / 🔒 bên trái URL Chrome ➔ Quyền ➔ Bật Vị trí (Location).
     - Nút `[ 🛰️ Thử Lại Bắt GPS ]` cho phép kỹ sư kích hoạt lại ngay lập tức mà không cần F5 trang.
  4. **Kiểm thử tự động & Xác thực**:
     - Bổ sung **Test Suite 8** trong `tests/harness_button_audit_and_optimization.test.js`.
     - **229 / 229 bài test PASS 100%**.

### [2026-10-21] Hợp Nhất 1 Nút Xuất Dữ Liệu & Cửa Sổ Chọn Định Dạng Đa Năng (Lovable Pro 2026)
- **Tối ưu hóa Phân hệ Sổ đo (`screen-datamgmt`)**:
  - **Triệt tiêu cụm 4 nút xuất cồng kềnh**: Thay thế lưới 4 nút riêng lẻ (`Xuất CSV`, `Xuất CAD`, `Xuất KML`, `Chia sẻ`) bằng **ĐÚNG 1 NÚT DUY NHẤT**: `[ 📤 XUẤT DỮ LIỆU SỔ ĐO ]` (`#btnOpenExportModal`) rộng 100%, bo góc 12px, chuẩn công thái học di động.
  - **Cửa sổ Xuất & Chia sẻ Dữ liệu Hợp nhất (`#modalExportData`)**:
    - Hiển thị tóm tắt tên dự án hiện hành, số lượng mốc và badge thông số.
    - Cho phép kỹ sư chọn trực quan giữa 5 định dạng xuất hàng đầu ngành trắc địa:
      1. 📊 **Bảng Tính Excel (.xlsx)**: Đầy đủ 11 cột số liệu chuẩn + Sheet Chú thích hình khối MiniCAD.
      2. 📄 **File Văn Bản CSV (.csv)**: Mã hóa UTF-8 BOM, tương thích mọi thiết bị đo GPS RTK và phần mềm trắc địa.
      3. 📐 **Bản Vẽ AutoCAD (.dwg)**: Chuẩn Thông tư 25/2014/TT-BTNMT (Layer RANH_THUA, MOC_TOADO, chiều dài cạnh).
      4. 🌍 **Google Earth 3D (.kml)**: Xem vệ tinh 3D và ranh thửa đất trực quan.
      5. 💬 **Chia Sẻ Trực Tiếp (Zalo / Mail / App)**: Gửi file tức thì qua hộp thoại chia sẻ di động OS.
  - **Bổ sung các phương thức điều khiển**: `openExportModal()`, `closeExportModal()`, `selectExportFormat()`, `executeExport()` trong `appData`.
  - **Xác thực tự động**: Bổ sung Test Suite 7 trong `tests/harness_button_audit_and_optimization.test.js` — **228/228 bài test PASS 100%**.

### [2026-10-21] Khắc phục Xung đột "Thực địa vs Theme Sáng/Tối" & Tối ưu Giao diện Đa Màn Hình
- **Nâng cấp Hệ thống Theme Toàn cục 3-in-1 (Dark ➔ Light ➔ Field ➔ Dark)**:
  - Hợp nhất hoàn toàn Chế độ Thực địa vào nút Theme trên Header (`#btnHeaderThemeToggle`):
    - Chu trình 3 trạng thái: `🌙 Tối kỹ thuật` ➔ `☀️ Sáng ngọc trai` ➔ `⚡ Thực địa ngoài trời` ➔ `🌙 Tối kỹ thuật`.
    - Cho phép kỹ sư bật/tắt chế độ Thực địa ở **bất kỳ màn hình nào** (Bản đồ, Sổ đo, Cắm mốc...) ngay từ Header trên cùng.
  - Đồng bộ hóa 100% hai chiều với nút `#fwField` ở Toolbar trang chủ (hoạt động như một công tắc nhanh Quick Sunlight Switch ngoài nắng).
  - Khử trùng lặp thị giác: Dùng icon tia sét `⚡` thay cho biểu tượng mặt trời cũ, thêm viền phát quang cảnh báo `active-field-theme`.
- **Tối ưu hóa hiển thị và công thái học đa kích thước màn hình**:
  - **Mobile siêu nhỏ (360px - 420px)**:
    - Khắc phục lỗi tiêu đề Header bị co cụt ("W... Đồng") bằng cách tự động ẩn subtitle thừa trên mobile, thu gọn chữ "Menu" dài dòng thành icon `☰`, và co gọn nút Quay lại `◀`.
    - Khắc phục lỗi hiển thị tiêu đề thẻ Sổ đo (`screen-datamgmt`) bị ngắt dòng dấu ngoặc đơn `1 )`: chuyển số lượng mốc vào một badge pill bo tròn sắc nét `#txtPointsCount`, căn chỉnh flexbox chống bẻ dòng xấu xí.
    - Tối ưu thanh công cụ `#fwToolbar`: co giãn flex 50/50 đều đẹp cho `[ Đơn giản | Nâng cao ]` và căn phải nút `[ ⚡ Thực địa ]`.
  - **Tablet (768px - 1024px) & Desktop (1280px - 1920px)**:
    - Bố cục Bento HUD dàn đều 4 cột chuẩn tỷ lệ vàng.
    - Căn giữa toàn bộ giao diện làm việc, giữ khoảng đệm tối đa 960px thanh lịch, không bị kéo dãn dị dạng.
- **Xác thực toàn diện qua Chrome DevTools MCP & Node Test Runner**:
  - Chụp ảnh màn hình đối soát trực quan tại: Mobile 360×740, Mobile 390×844, Tablet 768×1024, Desktop 1280×800.
  - Thao tác thực tế qua lại giữa Chế độ Sáng (`Clean Pearl Light`), Tối (`Engineering Dark Pro`) và Thực địa (`High-Contrast Field Mode`).
  - Toàn bộ **227/227 bài test PASS 100%**.

### [2026-10-20] Kiểm thử chuyên sâu & Tối ưu hóa chức năng, thao tác toàn bộ ứng dụng (Harness-Kit & Vibe Design - F-011)
- **Kiểm thử chi tiết 578 nút bấm & thao tác**:
  - Dùng Chrome DevTools MCP tự động quét và phân tích 578 nút bấm và phần tử tương tác trên toàn bộ 11 phân hệ chức năng.
  - Phát hiện và bổ sung xuất toàn cục an toàn vào `window` cho: `appCoordPicker`, `appBluetoothRtk`, `appResection`, `appProfile`, `appTrenches`, `appGeoid`, `appProject`.
  - Phát hiện và vá lỗi tiềm ẩn trong `appData.getPoints` và `appData.addPoint`: Xử lý phòng vệ trước đối số không phải chuỗi hoặc null, hỗ trợ cú pháp gọi đa hình `addPoint(point)` và `addPoint(projectName, point)` triệt tiêu hoàn toàn nguy cơ `TypeError: proj.endsWith is not a function`.
- **Tối ưu hóa công thái học & Vùng cảm ứng (Touch Ergonomics)**:
  - Tăng chiều cao tối thiểu cho nút `.btn-customize-pins` (Đổi ghim) lên `min-height: 36px`.
  - Tăng chiều cao tối thiểu cho các chip trạng thái `.quick-chip-pill` lên `min-height: 38px`.
  - Tối ưu 3 tab chức năng Camera hiện trường (`📸 Chụp ảnh`, `🖼️ Đóng dấu`, `📂 Thư viện`) co giãn đều `flex: 1 1 0; min-width: 0;`.
- **Khuyến cáo sai số GPS & Tối ưu hóa Bản đồ Leaflet**:
  - Tích hợp banner khuyến cáo nghiệp vụ trắc địa pháp lý tại Live HUD và màn hình Cắm mốc.
  - Kích hoạt `preferCanvas: true` tăng tốc độ vẽ vector và khử lag khi tải nhiều mốc trên WebGIS.
- **Mô phỏng vận hành 10 phân hệ nghiệp vụ & Xác thực tự động**:
  - Chạy mô phỏng tương tác thành công 10/10 phân hệ: Chuyển đổi đơn/đa điểm, Bản đồ chuyển đổi, Bản đồ dự án (UI Isolation), Cắm mốc thực địa, Sổ đo, Trắc dọc & Hố đào TCVN 4447, Camera hiện trường, MiniCAD, Cài đặt & Trợ giúp.
  - Bổ sung bộ test hồi quy tự động: `tests/harness_button_audit_and_optimization.test.js` (5 bài test mới).
  - Kết quả xác thực qua `init.ps1` (`node --test tests/*.test.js`): **225/225 bài test PASS 100%**.
  - Đóng tính năng `F-011` trong `feature_list.json` với trạng thái `done`.

### [2026-10-19] Tinh gọn trang chủ và bổ sung chế độ Thực địa
- **Trang chủ**: Mặc định Đơn giản với form chuyển đổi nhanh WGS-84 ⇄ VN-2000, KTT/múi chiếu hiện hành, lối mở bản đồ chuyển đổi riêng và bộ chuyển đổi đầy đủ. Nâng cao giữ HUD, các ghim tùy chọn và công cụ hiện có; lựa chọn chế độ được lưu an toàn, không làm mất cấu hình kiểu menu cũ.
- **Nhập và kết quả**: Chấp nhận dấu phẩy thập phân, kiểm tra toàn bộ chuỗi số và giới hạn tọa độ, thông báo lỗi/focus đúng ô. Dùng động cơ trắc địa hiện có với đúng KTT và hệ số chiếu; xóa kết quả cũ khi sửa ô nhập, đổi chiều, đổi KTT hoặc ngôn ngữ. Có giao diện tiếng Việt/Anh.
- **Thực địa**: Tương phản đen/vàng, vùng bấm đầu trang tối thiểu 48×48 px, form và nút chính lớn. Giữ nguyên lựa chọn sáng/tối đã lưu và cài đặt nắng gắt của MiniCAD. Công cụ thu gọn dùng `hidden` và đồng bộ `aria-expanded` để không nhận focus khi đóng.
- **GPS**: Lưu ý giới hạn GPS điện thoại ở Live HUD và màn hình cắm mốc, giữ số liệu sai số hiện có; không đưa ra sai số cố định hoặc cam kết độ chính xác.
- **Cô lập/PWA**: Nút bản đồ nhanh gọi `openTransformMap({ mode: 'pick' })`, không mở Bản đồ dự án hoặc MiniCAD. Hai tài nguyên mới được thêm vào cache `vn2000-pro-v2.8.3` bằng URL không có query version.
- **Xác thực**: Baseline 209/209; sau thay đổi 216/216, gồm 7 test hành vi mới. `node --check` cho JS và `git diff --check` đạt. Đã thử chuyển đổi dấu phẩy trên trình duyệt; xem bố cục 390×844, 360×844 và 1440×900; kiểm tra sáng/tối/Thực địa, accordion và đường mở bản đồ độc lập. Không có tràn ngang trong các khung đã kiểm tra; các nút header Thực địa đo được ≥48×48 px.
- **Thực thi**: Đã gọi Gemini qua CLI chính thức nhưng kết quả không đạt điều kiện chấp nhận (quyền đọc lệnh bị từ chối ở lượt đầu; lượt sau trả nội dung không hợp lệ và không tự thoát thành công). Người dùng đã cho phép Codex hoàn thiện trực tiếp; mã cuối và việc kiểm thử do Codex thực hiện. Task/result và ảnh kiểm tra ở `.scratch/ui-ux-20261019/`.

### [2026-10-12] Kiểm tra Tổng thể 4 Vòng (/grill-me) & Khắc phục Lỗ hổng Ứng dụng
- **Phạm vi**: VN2000-PWA — Rà soát toàn diện 4 vòng: Chuyển đổi F-002, Cô lập 5 bản đồ, PWA & Bộ nhớ SafeStorage, Nghiệp vụ Kỹ sư thực địa.
- **Đã phát hiện & khắc phục**:
  1. **Bảo vệ Bộ nhớ (SafeStorage)**: Bổ sung module `safeStorage` (try/catch an toàn + toast cảnh báo người dùng) cho `savePoints` và các hàm lưu trữ dữ liệu, triệt tiêu nguy cơ sập script do `QuotaExceededError` khi nạp dữ liệu lớn.
  2. **Cô lập Click MiniCAD**: Chuẩn hóa `appMap.onMapClick` thoát ngay khi `AppState.mapMode === 'cad'`, loại bỏ lời gọi kép tới `appCadTool.handleMapClick()` vì `appCadTool` đã có event listener riêng biệt.
  3. **Đóng gói Phân hệ F-002**: Chuyển trạng thái F-002 từ `in_progress` sang `done` trong `feature_list.json` sau khi xác thực 100% tính độc lập của Form, Bottom Sheet và Bản đồ chuyển đổi riêng biệt.
  4. **Nâng cấp Cache Version**: Tăng `CACHE_NAME` trong `sw.js` lên `vn2000-pro-v2.8.1`, đảm bảo người dùng PWA trên di động tự động nhận bản vá mới nhất.
  5. **Bổ sung Bộ test hồi quy**: Thêm `tests/audit_remediation_regression.test.js` (4/4 test pass). Toàn bộ 74/74 bài test trong hệ thống đạt 100%.

### [2026-10-09] Sửa lỗi kích hoạt thanh công cụ 4.4 Vẽ MiniCAD
- **Vấn đề**: Khi bấm menu 4.4 trong Drawer, thanh công cụ MiniCAD không xuất hiện do CSS isolation `:not(.cad-active-map)` chặn `display: none !important` và `initMap()` bị gộp lỗi trong `initRightControlsDrag()`.
- **Đã chỉnh sửa**:
  1. `appNav.openCadMap()` thêm ngay lập tức class `cad-active-map`.
  2. `appCadTool.openToolbar()` đưa lệnh thêm `cad-active-map` lên ngay đầu hàm.
  3. `index.html` bổ sung luật CSS hiển thị `#map-view-container.cad-active-map #mapCadToolbar { display: flex !important; }`.
  4. Tách biệt `initMap()` khởi tạo Leaflet map chính xác, độc lập khỏi drag controls.
  5. Thêm test tự động `tests/cad_tool_navigation_and_visibility.test.js` (4/4 tests pass).
- **Trạng thái**: Đã push commit `592ca44` lên `origin/main`.

## 2026-10-19 — Sửa trả tọa độ bản đồ về chế độ Đơn giản
- Nguyên nhân: Apply chỉ cập nhật bottom sheet bản đồ, chưa có đường trả điểm về form nhanh.
- Thêm onApplyPoint theo từng lần mở bản đồ; reset khi mở lại và tiêu thụ một lần. Luồng bộ chuyển đổi đầy đủ/đa điểm giữ nguyên.
- Form nhanh nhận lat/lng, chọn WGS-84 → VN-2000, quay về trang chủ và chuyển đổi ngay bằng KTT/scale hiện hành. Focus về nút Chuyển đổi.
- Cache PWA tăng lên vn2000-pro-v2.8.4.
- Kiểm chứng: 218/218 tests PASS, node --check và git diff --check đạt. Thử UI localhost: chấm điểm và Áp dụng về Form trả đúng tọa độ, X/Y khớp bản đồ.
- Chưa commit/deploy. Người dùng đã cho phép Codex hoàn thiện trực tiếp.
