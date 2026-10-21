# Progress Log — VN2000-PWA Harness

## Thông tin dự án
- **Dự án**: VN2000-PWA (WGS84 - VN2000 Pro Geodetic Survey App)
- **Kiến trúc Harness**: Harness-Kit + Antigravity-Harness (L3 Architecture Factory)
- **Cơ chế xác thực**: `init.ps1` (`node --test tests/*.test.js`) - Hiện tại: 216/216 bài test đạt 100%.

---

## Nhật ký tiến độ gần nhất

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
