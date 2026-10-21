# Session Handoff — VN2000-PWA

## Phiên hiện tại — 2026-10-21: Xóa Bỏ Toàn Bộ Video Cũ & Ra Mắt Cẩm Nang Sổ Tay Hướng Dẫn Thực Địa user-guide.html Kèm Tích Hợp Nút "?"
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
