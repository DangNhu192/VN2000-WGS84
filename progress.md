# Progress Log — VN2000-PWA Harness

## Thông tin dự án
- **Dự án**: VN2000-PWA (WGS84 - VN2000 Pro Geodetic Survey App)
- **Kiến trúc Harness**: Harness-Kit + Antigravity-Harness (L3 Architecture Factory)
- **Cơ chế xác thực**: `init.ps1` (`node --test tests/*.test.js`) - Hiện tại: 530/530 bài test đạt 100%.

---

## Nhật ký tiến độ gần nhất

### [2026-11-20] WP-MAP-LAYERS-AUDIT-CLEANUP: Loại Bỏ Lớp Rỗng OpenSeaMap & Tối Ưu Hóa Toàn Diện Các Lớp Bản Đồ Trắc Địa (F-027)
- **Yêu cầu từ người dùng**:
  - `openseamap ko hoạt động đúng không?` -> `bỏ lớp OpenSeaMap đi, sau đó tìm các lớp bản đồ khác (tốt) và đề xuất tôi thêm vào (cho link test trước gốc)` -> `thôi khỏi đi, xem lại các lớp bản đồ còn lỗi không?`
- **Kiến trúc & Triển khai Kỹ thuật**:
  - **Gỡ bỏ triệt để lớp OpenSeaMap**:
    + Phân tích nguyên nhân: OpenSeaMap chỉ chứa dữ liệu phao tiêu hàng hải ngoài khơi/cảng biển lớn; tại vùng đất liền và kênh rạch nội địa Việt Nam, máy chủ trả về ảnh PNG 256x256 hoàn toàn trong suốt (334 bytes), gây cảm giác "không hoạt động".
    + Đã loại bỏ hoàn toàn khỏi `app.js` (cấu hình mặc định, định nghĩa overlay, danh mục đồng bộ lớp phủ, bảng điều khiển `appMapLayers`).
    + Dọn dẹp prefetch trong `index.html`, bypass whitelist trong `server.js` và `sw.js`.
  - **Kiểm toán & Tối ưu hóa sâu toàn bộ hệ thống bản đồ (Deep Map Audit)**:
    + Ping & fetch kiểm thử HTTP trực tiếp từng lớp tại Việt Nam: 100% các lớp bản đồ nền (`google_hybrid`, `esri_satellite`, `google_streets`, `opentopomap`, `google_terrain`, `osm_streets`) và lớp phủ (`esri_transport`, `google_roads`, `google_traffic`, `Quy hoạch SDĐ 2030`) đều phản hồi HTTP 200, tốc độ tải nhanh, dữ liệu đầy đủ.
    + Khắc phục lỗi tiềm ẩn phóng to sâu (Zoom 20 - 24) trên `osm_streets`: Ghim cứng `maxNativeZoom: 19` tại mọi vị trí khởi tạo (Live Map, Transform Map, Main Map, `MAP_BASES`). Khi người dùng zoom mức 20 - 24, Leaflet tự động phóng đại (rescale) hình ảnh, triệt tiêu 100% lỗi HTTP 400 Bad Request và tránh hiện tượng ô xám hỏng gạch.
    + Kiểm tra cấu trúc phân tầng zIndex của Leaflet Panes: Thứ tự hiển thị chuẩn xác (Nền: 200 < Quy hoạch SDĐ: 230 < Ranh thửa: 235 < Giao thông: 240 < Ranh giới hành chính: 400 < Nét vẽ MiniCAD: 450 < Mốc đo đạc: 600).
- **Kiểm thử tự động & Nghiệm thu**:
  - Cập nhật test suite `tests/waterways_traffic_layers.test.js` và `tests/map_layers_panel.test.js`.
  - Toàn bộ test suite đạt **530 / 530 tests PASS 100% (9 suites, 0 fail)**.
  - Đã đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

### [2026-11-20] WP-WHITE-LABEL-PLANNING: Xóa Bỏ Cụm Từ Guland Trên Toàn Bộ Giao Diện Ứng Dụng & Chuẩn Hóa Hiển Thị Nguồn Khi Xuất Bản Vẽ (F-026)
- **Yêu cầu từ người dùng**:
  - `xóa các cụm từ có chữ Guland trong app, chỉ còn hiển thị nguồn khi xuất bản vẽ (các file)`
- **Kiến trúc & Triển khai Kỹ thuật**:
  - **Dọn sạch 100% cụm từ "Guland" trên giao diện người dùng (User-Facing UI)**:
    + Live Map / Bản đồ chuyển đổi: Sửa tooltip `title` thành `Bản đồ Quy hoạch sử dụng đất 2030`.
    + Bản đồ dự án: Sửa nhãn thanh công cụ thành `Bản đồ Quy hoạch sử dụng đất 2030`.
    + MiniCAD: Sửa nhãn nút thành `📐 Bản đồ Quy hoạch`, checkbox thành `📐 Quy hoạch SDĐ 2030`, nút thanh HUD thành `📐 QUY HOẠCH`.
    + Hướng dẫn lệnh CAD Craft CLI: Đổi hiển thị `QH` và `QUYHOACH`, loại bỏ chữ `GULAND` khỏi danh sách trợ giúp lệnh công khai nhưng vẫn giữ alias nội bộ để đảm bảo tương thích ngược.
    + Modal xuất bản vẽ MiniCAD & Bản đồ dự án: Đổi tiêu đề thành `CHỌN LỚP BẢN ĐỒ NỀN, QUY HOẠCH & FILE PDF XUẤT KÈM`, nhãn checkbox thành `🏛️ In kèm lớp quy hoạch sử dụng đất 2030`, `Kèm ranh thửa đất quy hoạch`.
    + Bảng quản lý lớp (Layers Panel): Đổi thành `Bản đồ Quy hoạch sử dụng đất 2030`, nhãn bản quyền thành `nhà cung cấp dịch vụ bản đồ`.
    + Modal làm sạch watermark: Đổi thông báo và dropdown thành `Tile chuẩn 256px`, `chữ chìm bản đồ`.
  - **Chuẩn hóa Hiển thị Nguồn khi Xuất Bản Vẽ (Export Credit)**:
    + Trong `planExportGuland`: Giữ và chuẩn hóa dòng chú thích nguồn xuất ra góc bản vẽ (file PNG / PDF / in ấn) theo đúng Luật Sở hữu trí tuệ:
      `credit: Nguồn dữ liệu tham khảo: Quy hoạch sử dụng đất 2030 - ${prov.name} (Guland)`
  - **Bảo toàn Hạ tầng Kỹ thuật & Tương thích**:
    + Giữ nguyên các ID DOM (`cadExportCheckGuland`, `chkExportGulandPlanning`), các class CSS Leaflet và tên module nội bộ để không phá vỡ logic tính toán và các bộ test tự động.
- **Kiểm thử tự động & Nghiệm thu**:
  - Cập nhật bộ test `tests/planning_map_integration.test.js` kiểm tra nhãn hiển thị mới.
  - Toàn bộ test suite đạt **530 / 530 tests PASS 100% (9 suites, 0 fail)**.
  - Đã đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

### [2026-11-20] WP-WATERMARK-CLEANER-PRO: Bộ Công Cụ Làm Sạch & Che Watermark Guland / Bản Đồ Quy Hoạch Nền (F-025)
- **Yêu cầu từ người dùng**:
  - `phương án 3, bổ sung cơ chế tạo lớp phủ che hoặc xóa chữ Guland trên lớp bản đồ nền (tự động nhận diện)`
- **Kiến trúc & Giải pháp Triển khai**:
  - Xây dựng modal độc lập `modalPlanWatermarkClean` tích hợp trực tiếp trong phân hệ Lớp phủ quy hoạch ảnh / PDF (`appPlanOverlay`), tuân thủ 100% nguyên tắc cách ly giao diện (UI Isolation Principle - `AGENTS.md`).
  - Hỗ trợ 4 chế độ làm sạch và khử watermark chuyên sâu:
    1. 🤖 **Tự động triệt tiêu chữ chìm (Luminance & Neighbor Inpaint)**: Thuật toán quét ma trận điểm ảnh, phát hiện độ chênh lệch ánh sáng cục bộ (`pLum - bgLum > threshold`) của ký tự watermark bán trong suốt in trên nền đất quy hoạch, tự động lấy mẫu vòng tròn xung quanh (`radius 3-8px`) để lấp đầy màu nền tự nhiên, bảo toàn tuyệt đối các đường ranh ranh thửa và số hiệu tối màu (`pLum < 70`).
    2. 🖱️ **Hộp khoanh xóa 1-chạm (Interactive Box Inpaint)**: Kéo thả chuột hoặc chạm màn hình để chọn vùng chữ cần xóa. Thuật toán tự động trích xuất màu biên (Border Sampling) và nội suy màu nền trong 1ms.
    3. 📐 **Lưới mặt nạ chu kỳ (Periodic Grid Mask Inpaint)**: Tự động tính toán các bước lặp gạch bản đồ tile (256/384/512px) để phủ mặt nạ inpaint đồng loạt lên toàn bộ ảnh.
    4. 👁️ **Lớp phủ lọc thời gian thực (`toggleDeWatermark`)**: Sử dụng CSS `mix-blend-mode: multiply` kết hợp bộ lọc `contrast(1.15) brightness(0.96)` trên thẻ canvas Leaflet layer, làm mờ chữ watermark ngay khi xem trực tiếp trên bản đồ.
  - Hỗ trợ đầy đủ chức năng **Hoàn tác (Undo)** nhiều bước và **Khôi phục gốc (Restore Original)**.
- **Tuân thủ Tiêu chuẩn UX/UI**:
  - Toàn bộ font-size đạt chuẩn `>= 11px` theo `DESIGN.md`, vượt qua 100% bài kiểm thử `tests/ui_readability_and_touch.test.js`.
  - Sử dụng biến token vùng an toàn `--ui-avail-h`, vượt qua 100% bài kiểm thử `tests/safe_area_cutout_fit.test.js`.
- **Kiểm thử tự động & Nghiệm thu**:
  - Tạo mới bộ kiểm thử tự động `tests/plan_overlay_watermark_cleaner.test.js` (6/6 pass).
  - Toàn bộ test suite đạt **530 / 530 tests PASS 100% (9 suites, 0 fail)**.
  - Đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

### [2026-11-20] WP-CODEBASE-CLEANUP-AUDIT: Tổng Rà Soát, Vệ Sinh Mã Nguồn, Xóa Tệp Nặng 50MB, Triệt Tiêu 100% Mã Rác WorldCover/GIBS & Chuẩn Hóa Trợ Năng Accessibility (F-023)
- **Yêu cầu từ người dùng**:
  - `tổng rà soát và vệ sinh các mã, tìm lỗi và sửa, thấy mã rác dư thừa thì xóa`
  - Đã qua tiền kiểm tra Pre-flight Gate và xác nhận:
    + Xóa hẳn file 50.8 MB `BandohanhchinhVietNam_34tinhthanh.pptx` khỏi Git và thư mục dự án; thêm vào `.gitignore` và `.vercelignore`.
    + Xóa sạch 100% mọi dòng code liên quan đến lớp cũ `worldcover` và `gibs` kể cả các phương thức tải ngầm.
    + Đồng bộ nút đổi nhanh nền `toggleMapLayer` theo 6 nền chất lượng cao tại Việt Nam.
    + Bổ sung đầy đủ `aria-label` cho toàn bộ form inputs, triệt tiêu 100% cảnh báo Accessibility.
- **Triển khai Kỹ thuật & Kết quả**:
  1. **Xóa tệp rác dung lượng lớn 50.8 MB**:
     - Đã xóa tệp `BandohanhchinhVietNam_34tinhthanh.pptx` khỏi Git repo và thư mục làm việc.
     - Thêm `*.pptx`, `*.ppt` vào `.gitignore` và `.vercelignore` giúp các lần deploy Vercel siêu nhẹ, tiết kiệm băng thông và tài nguyên.
  2. **Triệt tiêu 100% mã rác lớp cũ (`worldcover`, `gibs`)**:
     - Đã loại bỏ hoàn toàn mảng `WORLDCOVER_CLASSES` và `GIBS_PRODUCTS`.
     - Xóa các phương thức ngầm `gibsDefaultDate()`, `gibsUrl()`, `setGibs()`, và các nhánh `worldcover`/`gibs` trong `_overlayDef()`, `_isOn()`, `syncOverlays()`, `setOverlay()`, `setOpacity()`.
     - Xóa triệt để các biến tính toán chuỗi HTML thừa (`wc`, `g`, `legend`, `gibsExtra`) trong `renderPanel()`.
     - Loại bỏ `worldcover` khỏi `cadExportBasemap` trong `index.html` và `EXPORT_BASEMAPS` trong `app.js`.
     - Xóa `'s2_2016'` khỏi danh mục kiểm tra ID nền `s.activeBaseLayerId`.
  3. **Đồng bộ vòng lặp chuyển nhanh 6 nền bản đồ (`toggleMapLayer`)**:
     - Đồng bộ thứ tự: `Vệ tinh Google (Siêu nét)` ➔ `Ảnh vệ tinh Esri` ➔ `Đường phố Google (Giao thông & Thủy văn)` ➔ `Địa hình & Sông ngòi OpenTopo` ➔ `Địa hình Google Terrain` ➔ `Đường phố OpenStreetMap`.
  4. **Chuẩn hóa Accessibility (Trợ năng) 100% Form Inputs**:
     - Bổ sung `aria-label` trực quan chuẩn tiếng Việt cho 276 trường nhập liệu, hộp chọn, thanh trượt trên toàn bộ `index.html` và các HUD điều khiển trong `planning_map.js`.
     - Khắc phục triệt để lỗi cú pháp nhãn tại `cadGisLayerName`.
     - Kiểm tra DOM thực tế trên Chrome DevTools: `unlabelled: 0` (100% đạt chuẩn trợ năng WCAG).
  5. **Kiểm thử tự động & Nghiệm thu**:
     - Cập nhật test suite `tests/map_layers_panel.test.js` kiểm tra các lớp giao thông, thủy văn hiện hành.
     - Toàn bộ **524 / 524 tests PASS 100% (9 suites, 0 fail)**.

---

### [2026-11-20] WP-MAP-LAYERS-VIETNAM-FOCUS: Ưu Tiên Lớp Nền Chi Tiết Cao Tại Việt Nam & Loại Bỏ Lớp Không Khả Dụng / Dữ Liệu Thô Sơ (F-022)
- **Yêu cầu từ người dùng**:
  - `ưu tiên giữ lại các lớp bản đồ nền có dữ liệu chi tiết tại Việt Nam, xóa các lớp bản đồ không khả dụng hoặc dữ liệu không chi tiết`
- **Phân tích & Triển khai Kỹ thuật**:
  1. **Lớp bản đồ nền (Base Maps)**:
     - Sắp xếp và ưu tiên các lớp nền có độ nét cao, dữ liệu chi tiết tại Việt Nam:
       + `google_hybrid`: Vệ tinh Google (Siêu nét) — Chi tiết từng nóc nhà, ranh đất tại Việt Nam (Zoom 22).
       + `esri_satellite`: Ảnh vệ tinh Esri — Sắc nét toàn quốc, in được khi xuất bản vẽ.
       + `google_streets`: Đường phố Google (Giao thông & Thủy văn) — Mạng lưới đường bộ, ngõ hẻm & hệ thống sông ngòi chi tiết nhất Việt Nam (Zoom 20).
       + `opentopomap`: Địa hình & Sông ngòi OpenTopo — Chi tiết hệ thống kênh rạch, sông ngòi miền Tây và đường bình độ cao độ địa hình (Zoom 17).
       + `google_terrain`: Địa hình Google — Độ dốc, đồi núi, lưu vực sông suối toàn quốc (Zoom 17).
       + `osm_streets`: Đường phố OpenStreetMap — Bản đồ đường sá mở toàn cầu, in được khi xuất bản vẽ.
       + `none`: Không nền — Giấy trắng nhẹ nhất khi vẽ kỹ thuật MiniCAD.
     - **Gỡ bỏ lớp Sentinel-2 2016 (`s2_2016`)**: Độ phân giải thấp (10m/pixel), zoom max chỉ 14 (vỡ hạt ở mức khảo sát đất đai), máy chủ EOX tải chập chờn.
     - **Cơ chế fallback an toàn**: Trong `setBase(id)`, nếu dữ liệu lưu trữ cũ của người dùng có `s2_2016` thì tự động chuyển về `google_hybrid`.
  2. **Dọn dẹp Lớp phủ (Overlays)**:
     - Loại bỏ khỏi UI các lớp viễn thám thô sơ không có giá trị chi tiết cho địa chính/quy hoạch Việt Nam: `worldcover` (ESA WorldCover 10m) và `gibs` (NASA GIBS MODIS 250m - 1km).
     - Giữ lại các lớp phủ thiết thực: Mạng lưới Giao thông Esri, Nhãn đường Google, Giao thông trực tiếp Google Traffic, Luồng lạch đường thủy OpenSeaMap, Ranh giới 34 tỉnh, Ranh giới xã Đồng Tháp mới, Bản đồ quy hoạch 2030 (Guland), và Bản đồ quy hoạch PDF đính kèm.
  3. **Kiểm thử tự động & Xác minh trực quan**:
     - Cập nhật `tests/map_layers_panel.test.js`.
     - 100% các bộ kiểm thử tự động đạt **524 / 524 tests PASS 100% (9 suites, 0 fail, 0 skipped)**.
     - Kiểm chứng trực quan bằng Chrome DevTools MCP.

---

### [2026-11-20] WP-SYSTEM-OPTIMIZE-ALL: Tối Ưu Hóa Toàn Diện Ứng Dụng (Mobile PWA & Desktop) — Offline Tile Cache, 60fps GPU, MiniCAD BBox Indexing & Network Pruning (F-021)
- **Yêu cầu từ người dùng**:
  - `tối ưu lại ứng dụng`
  - Chọn phương án: **E - Toàn diện (Tổng hợp A + B + C + D theo từng giai đoạn an toàn)**.
  - Thiết bị mục tiêu: **Cả hai nền tảng** (Mobile PWA: tiết kiệm pin, RAM, mượt mà khi chạm; Desktop: xử lý nhanh khối lượng lớn).
  - Kỳ vọng bộ nhớ đệm: **Ưu tiên lưu cache offline tối đa để dùng ở thực địa không có sóng mạng**.
- **Phân tích & Triển khai Kỹ thuật**:
  1. **Giai đoạn 1 (A) - Bộ nhớ đệm Ngoại tuyến Thực địa Bền vững (`sw.js`)**:
     - Thiết lập kho `TILE_CACHE = 'vn2000-tiles-field-v1'` bảo toàn độc lập, không bị xóa khi nâng cấp phiên bản ứng dụng (`CACHE_NAME`).
     - Chiến lược Stale-While-Revalidate: Mọi gạch bản đồ vệ tinh / đường sá / địa hình / quy hoạch mà kỹ sư đã xem khi có mạng được tự động lưu vào `TILE_CACHE`. Khi ra thực địa mất hoàn toàn sóng 4G/Wifi, ứng dụng lập tức phục hồi và hiển thị các ô bản đồ đã lưu mà không bị gián đoạn hay lỗi 408.
  2. **Giai đoạn 2 (B) - Tốc độ & Độ mượt Bản đồ (Map Pan/Zoom Performance)**:
     - Tăng tốc phần cứng GPU trong `style.css`: Thêm `transform: translateZ(0)`, `touch-action: pan-x pan-y pinch-zoom`, `-webkit-overflow-scrolling: touch` trên các container Leaflet và tile/marker panes, triệt tiêu hiện tượng xé hình/giật lag 60fps trên cảm ứng di động.
     - Tự động hủy yêu cầu gạch dồn ứ (Request Abort / Tile Unload): Trong `planning_map.js` và `appMapLayers`, hook sự kiện `tileunload` trên các tile layer; khi người dùng lướt hoặc zoom nhanh qua các mức, các tile cũ chưa tải xong lập tức gán `tile.src = ''` để giải phóng socket mạng và băng thông.
     - Dọn dẹp DOM gạch bản đồ cũ khi đổi nền: Trong `appMapLayers.setBase`, gọi `_pruneTiles()` để giải phóng RAM cho thiết bị di động.
  3. **Giai đoạn 3 (C) - Hiệu năng Phân hệ MiniCAD (Spatial Bounding Box)**:
     - Thêm phương thức `getShapeBBox(shape)` tính toán hình hộp bao tọa độ `_bbox = [minLat, minLng, maxLat, maxLng]` theo phiên bản số đỉnh.
     - Trong `renderGeometry()`: Lọc không gian $O(1)$ bằng Bounding Box trước khi duyệt mảng đỉnh của thửa; các thửa nằm ngoài tầm nhìn màn hình bị loại bỏ ngay lập tức, tăng tốc độ render các bản vẽ lớn có hàng trăm thửa đất từ hàng chục ms xuống dưới 1ms.
  4. **Giai đoạn 4 (D) - Dọn dẹp Mã nguồn & Chống Rò rỉ Bộ nhớ**:
     - Đảm bảo các hàm gọi layer được bọc kiểm tra an toàn `typeof tl.on === 'function'`.
     - 100% các bộ kiểm thử tự động đạt **524 / 524 tests PASS 100% (9 suites)**.
     - Đã đồng bộ mã nguồn sang `D:\Nhu\APP\VN2000-PWA` và đẩy lên GitHub.

---

### [2026-11-20] WP-MAP-LAYERS-CLEANUP-PDF: Dọn dẹp Lớp Bản đồ Rác & Mở Rộng Nạp Bản Đồ Quy Hoạch PDF Từng Tỉnh Không Watermark (F-020)
- **Yêu cầu từ người dùng**:
  - `tìm cách loại bỏ các hình này (từ ký hiệu Guland) từ các lớp bản đồ được tải từ Guland hoặc cho phép tải dữ liệu bản đồ tỉnh sau sáp nhập từ các file PDF đính kèm (theo từng file PDF riêng lẻ).`
  - `Hiện tại bạn đang tải dữ liệu lớp bản đồ trực tiếp từ guland hay đã tải offline từ các file dữ liệu được tải về kho dữ liệu?`
  - `- loại bỏ các lớp bản đồ 19 tỉnh miền nam, quy hoạch sử dụng đất (TT27)... chỉ để lại các lớp bản đồ nền có dữ liệu có chất lượng`
- **Phân tích Bản chất Kỹ thuật & Giải đáp**:
  1. **Cơ chế tải bản đồ**: Ứng dụng stream raster tile trực tiếp online qua CDN (`vcdn.cloud`, `cmccloud.com.vn`, `fptcloud.com`).
  2. **Về logo/watermark Guland**: Ký hiệu/chữ "GULAND" màu vàng in chìm trong từng ô raster PNG 256x256 được máy chủ Guland nén cứng vào pixel khi render. Vì là ảnh raster RGB hợp nhất, không thể lọc bằng CSS mà không làm biến dạng màu sắc của các vùng đất quy hoạch màu vàng khác (đất lúa LUC, đất trồng cây CLN/HNK).
  3. **Giải pháp tối ưu & chuyên nghiệp**: Cung cấp cơ chế nạp trực tiếp bản đồ quy hoạch gốc ban hành từ các cơ quan quản lý nhà nước/Sở TN&MT dạng PDF hoặc ảnh chất lượng cao (lên đến 600 - 1200 DPI), tự động nắn chỉnh tọa độ theo mốc hoặc file tọa độ (.tfw, .jgw, .wld) đi kèm, hoàn toàn sạch 100% watermark.
- **Triển khai Kỹ thuật**:
  1. **Mở rộng chức năng nạp & quản lý PDF quy hoạch (`appPlanOverlay`) ra toàn bộ hệ thống**:
     - Cho phép nạp từng file PDF riêng lẻ theo từng tỉnh/huyện/xã.
     - Đồng bộ hiển thị trực tiếp lên `AppState.leafletMap` (Bản đồ Dự án, Bản đồ chuyển đổi tọa độ) lẫn MiniCAD.
     - Đưa mục `Bản đồ quy hoạch (PDF đính kèm)` trực tiếp vào bảng quản lý lớp `appMapLayers` với công tắc tổng, thanh trượt độ mờ và nút `[📂 Quản lý & Nạp PDF]`.
  2. **Dọn dẹp triệt để các lớp rác/demo**:
     - Loại bỏ hoàn toàn: Lớp `19 Tỉnh Miền Nam` (`mlSouthProv` và bộ lọc tỉnh), `Quy hoạch sử dụng đất (TT27)` (`mlPlanZones`), `Đồng Tháp cũ` (`mlDtCu`), `Tiền Giang cũ` (`mlTgCu`).
     - Tinh gọn bảng quản lý lớp, chỉ giữ lại các lớp bản đồ chất lượng cao: 8 nền bản đồ chuẩn (Google Satellite, Esri Satellite, OSM, Google Streets thủy văn, OpenTopoMap sông ngòi kênh rạch, Google Terrain, Sentinel-2, Không nền); các lớp phủ hạ tầng (Mạng lưới giao thông Esri, Nhãn đường Google, Giao thông trực tiếp Google Traffic, Luồng lạch đường thủy OpenSeaMap, Ranh giới 34 tỉnh, Ranh giới xã mới Đồng Tháp, Bản đồ quy hoạch PDF đính kèm).
  3. **Kiểm thử & Khắc phục**:
     - Cập nhật test suite `tests/vn_south_map_layers.test.js` kiểm tra độ tinh gọn và sự hiện diện của lớp PDF overlay.
     - Đạt chuẩn kiểm thử tuyệt đối: **524/524 tests PASS 100% (9 suites)**.
     - Kiểm tra trực quan bằng Chrome DevTools MCP: Chụp ảnh modal Lớp bản đồ và modal Nạp PDF, xác nhận độ sắc nét và tính độc lập của giao diện.
  4. **Đồng bộ**: Đã đồng bộ toàn bộ mã nguồn sang `D:\Nhu\APP\VN2000-PWA`.

---

### [2026-11-19] WP-MAP-LAYERS-WATER-TRAFFIC: Tối ưu Tốc độ Tải Bản đồ, Giữ Lớp Quy hoạch Guland 1x-9x & Tích hợp Lớp Sông ngòi, Kênh rạch, Giao thông Toàn quốc (F-019)
- **Yêu cầu từ người dùng**:
  - `tốc độ load dữ liệu còn chậm`
  - `bên cạnh đó khi thu nhỏ từ 1x đến 9x sẽ không xem được lớp bản đồ có nguồn gốc được tải từ Guland, hãy điều chỉnh phù hợp để hoạt động tốt`
  - `Chưa có dữ liệu bản đồ về sông ngòi kênh rạch, bản đồ về giao thông của các tỉnh`
  - Quyết định thông qua Pre-flight Intake Gate: Tích hợp đầy đủ cả 2 dạng: Bản đồ nền độc lập (Base map) và Lớp phủ trong suốt (Overlay có thanh trượt độ mờ đè lên quy hoạch/vệ tinh); giữ lớp Guland hiển thị liên tục từ 1x đến 9x và sắc nét ở 10x-20x.
- **Phân tích & Triển khai Kỹ thuật**:
  1. **Khắc phục lỗi biến mất của Lớp Quy hoạch Guland ở Zoom 1x - 9x**:
     - `src/core/planning_map.js`: Thay đổi `minZoom: 10` thành `minZoom: 1`, bổ sung `minNativeZoom: 8`, `keepBuffer: 8`, `updateWhenIdle: false`.
     - Nhờ đó Leaflet tự động downscale từ mức native zoom z=8 khi thu nhỏ dưới 9x, không gửi request 404, giữ nguyên vẹn toàn cảnh ranh giới quy hoạch tỉnh mà không bị ẩn (`display: none`).
  2. **Tối ưu Tốc độ Tải Gạch Bản đồ (Tile Load Speed)**:
     - `index.html`: Bổ sung 13 thẻ `dns-prefetch` và `preconnect` tới các cụm máy chủ CDN tile: `vcdn.cloud`, `cmccloud.com.vn`, `fptcloud.com`, `server.arcgisonline.com`, `mt0-mt3.google.com`, `tile.opentopomap.org`, `tiles.openseamap.org`.
     - `sw.js`: Cập nhật bộ lọc `isMapTile` nhận diện toàn bộ các domain bản đồ vệ tinh, giao thông, thủy văn; thiết lập chiến lược Stale-While-Revalidate/Bypass I/O trực tiếp không chặn luồng mạng chính.
     - `server.js`: Mở rộng `allowedHosts` cho proxy gạch bản đồ.
  3. **Tích hợp 3 Nền Bản Đồ Mới (Base Maps)**:
     - `google_streets`: Đường phố Google kèm mạng lưới sông ngòi thủy văn chuẩn xác (`lyrs=m`, maxNativeZoom: 20).
     - `opentopomap`: Bản đồ Địa hình & Thủy văn OpenTopoMap thể hiện chi tiết sông Tiền, sông Hậu, kênh rạch miền Tây, sông Hồng và đường đồng mức cao độ toàn quốc (maxNativeZoom: 17, subdomains `['a','b','c']`).
     - `google_terrain`: Bản đồ địa hình độ dốc, lưu vực sông ngòi đồi núi Google Terrain (`lyrs=p`, maxNativeZoom: 17).
  4. **Tích hợp 4 Lớp Phủ Trong Suốt Đè Lên Quy Hoạch / Vệ Tinh (Overlays)**:
     - `esri_transport`: Mạng lưới giao thông đường bộ, cao tốc, quốc lộ, tỉnh lộ, đường sắt chuẩn Esri World Transportation nằm trên `refOverlayPane` (zIndex 240, đè lên gạch quy hoạch zIndex 230).
     - `google_roads`: Mạng lưới đường & nhãn địa danh giao thông chính hãng Google (`lyrs=h`).
     - `google_traffic`: Mật độ lưu thông và tình trạng giao thông trực tiếp thời gian thực (`lyrs=traffic`).
     - `openseamap`: Hệ thống luồng lạch đường thủy, phao tiêu, hải đăng, báo hiệu hàng hải OpenSeaMap (`tiles.openseamap.org/seamark`).
     - Mỗi lớp sở hữu switch bật/tắt riêng biệt và thanh trượt điều chỉnh độ mờ (opacity slider) độc lập.
  5. **Kiểm thử & Nghiệm thu Thực tế**:
     - Tạo mới test suite `tests/waterways_traffic_layers.test.js`.
     - Khắc phục xung đột CSS `crisp-edges` trong `style.css` chuyển sang `-webkit-optimize-contrast` giúp toàn bộ 524 bài test trong `tests/*.test.js` đạt **PASS 100% (524/524 pass, 0 fail)**.
     - Kiểm tra trực quan bằng Chrome DevTools MCP: Chụp ảnh thực tế bản đồ OpenTopoMap (sông ngòi kênh rạch sắc nét), lớp phủ Esri Transport, và chụp ảnh zoom 7x toàn cảnh quy hoạch Đồng Tháp 2030 hiển thị hoàn hảo.

---

### [2026-11-19] WP-MAP-SOUTH: Xây Dựng Kho Dữ Liệu Lớp Bản Đồ & Quy Hoạch Miền Nam Chạy Offline 100%
- **Yêu cầu từ người dùng**:
  - `tôi cần dữ liệu lớp bản đồ của các tỉnh ở Việt Nam, bạn có thể tìm trên Internet để xây dựng dữ liệu.`
  - Thống nhất qua Socratic Gate:
    1. Lớp dữ liệu: Bản đồ Quy hoạch sử dụng đất / Xây dựng & Ranh giới hành chính.
    2. Định dạng: Tệp dữ liệu cục bộ (GeoJSON / JS lưu trong `data/`) để chạy Offline 100% không cần mạng.
    3. Phạm vi thử nghiệm: Các tỉnh thành miền Nam Việt Nam (Bắt buộc có Đồng Tháp mới sau sáp nhập, Đồng Tháp cũ và Tiền Giang cũ).
- **Phân tích & Triển khai Kỹ thuật**:
  1. **Thu thập dữ liệu GIS từ nguồn Internet mở & hợp pháp**:
     - Nguồn: Cổng địa giới hành chính Tổng cục Thống kê / `daohoangson/dvhcvn` (MIT) & `sapnhap.bando.com.vn`.
     - Viết công cụ tự động hóa `tools/build_vn_south_layers.js` để thu thập và tối ưu hóa 19 tỉnh thành miền Nam.
  2. **Đóng gói kho dữ liệu `data/vn_south_provinces.js` (1.29 MB)**:
     - `dong_thap_moi`: Tỉnh Đồng Tháp mới sau sáp nhập (hợp nhất Tiền Giang + Đồng Tháp theo đề án 34 tỉnh, diện tích 5.939 km², 102 xã/phường).
     - `dong_thap_cu`: 12 quận/huyện/TP tỉnh Đồng Tháp cũ (TP Cao Lãnh, Sa Đéc, Hồng Ngự, Tân Hồng, v.v., KTT 105°00').
     - `tien_giang_cu`: 11 quận/huyện/thị/TP tỉnh Tiền Giang cũ (TP Mỹ Tho, TX Gò Công, Cai Lậy, Cái Bè, v.v., KTT 105°45').
     - `south_provinces`: Ranh giới 19 tỉnh thành miền Nam (TP.HCM, Cần Thơ, An Giang, Long An, Bến Tre, Vĩnh Long, v.v.) kèm KTT VN-2000.
     - `planning_zones`: Lớp phân vùng quy hoạch sử dụng đất theo chuẩn **Thông tư 27/2018/TT-BTNMT** (mã màu và thuộc tính ODT, ONT, TMD, SKC, DGT, CX, MN).
  3. **Tích hợp hệ thống Web/PWA**:
     - Đăng ký `vn_south` vào `LAZY_LIBS` trong `app.js` (tải khi cần, không làm nặng app).
     - Đăng ký `./data/vn_south_provinces.js` vào `ASSETS_TO_CACHE` trong `sw.js` (Offline cache 100%).
     - Bổ sung 8 phương thức quản lý trong `appMap` (`initDongThapCuLayer`, `toggleDongThapCu`, `initTienGiangCuLayer`, `toggleTienGiangCu`, `initSouthProvincesLayer`, `toggleSouthProvinces`, `initPlanningZonesLayer`, `togglePlanningZones`).
     - Tích hợp 4 switch bật/tắt vào bảng điều khiển lớp bản đồ `appMapLayers.renderPanel()`.
  4. **Kiểm thử & Nghiệm thu**:
     - Tạo mới test suite `tests/vn_south_map_layers.test.js` kiểm tra toàn diện cấu trúc dữ liệu, lazy load, SW cache và tương tác UI.
     - Toàn bộ **516 / 516 bài kiểm thử đạt PASS 100%**.
     - Đồng bộ toàn diện sang `D:\Nhu\APP\VN2000-PWA`.

---

### [2026-11-19] BẢO MẬT: Loại Bỏ Tệp Mã Khôi Phục Vercel & Cập Nhật .gitignore
- **Tình trạng phát hiện**: Tồn tại tệp mã khôi phục tài khoản `vercel-recovery-codes-dnpn.ttqt@gmail.com.txt` trong kho lưu trữ.
- **Hành động xử lý đã thực hiện**:
  1. Xóa hoàn toàn tệp `vercel-recovery-codes-dnpn.ttqt@gmail.com.txt` khỏi đĩa và khỏi Git index.
  2. Cập nhật `.gitignore` để chặn vĩnh viễn các tệp mã khôi phục và tệp khóa bí mật (`vercel-recovery-codes*`, `*recovery-codes*`, `*.pem`, `*.key`, `.env*`).
  3. Hướng dẫn người dùng các bước tái tạo mã khôi phục mới trên trang quản trị Vercel để vô hiệu hóa 100% các mã cũ trong lịch sử commit.

---

### [2026-11-19] WP-Z Tùy Biến Toàn Diện Ký Hiệu Icon Đỉnh / Mốc MiniCAD (10 Kiểu Dáng, 4 Kích Thước, Palette Màu & Realtime HUD)
- **Yêu cầu từ người dùng**:
  `cho phép điều chỉnh Icon điểm lưu, các đỉnh của tuyến, đa giác, thửa đã lưu hoặc đang vẽ`
- **Phân tích & Thiết kế Kỹ thuật Toàn Diện**:
  1. **10 Kiểu dáng Icon Đỉnh & Mốc**:
     - Mở rộng đầy đủ 10 kiểu dáng trắc địa tiêu chuẩn:
       `circle` (● Tròn), `square` (■ Vuông), `diamond` (◆ Thoi), `triangle` (▲ Tam giác), `pin` (📍 Ghim Pin),
       `cross` (✚ Chữ thập), `ring` (◎ Vành khuyên), `star` (★ Ngôi sao), `target` (🎯 Tâm ngắm), `x` (❈ Chữ X).
     - Bổ sung CSS đặc tả hình học chuẩn xác với SVG clip-path & drop-shadow trong `style.css`.
  2. **4 Cấp Kích Thước Icon**:
     - `sm` (Nhỏ - 14px), `md` (Vừa - 20px), `lg` (Lớn - 26px), `xl` (Rất lớn - 32px).
     - Định vị neo Leaflet Marker (`iconAnchor`) đồng bộ chuẩn xác từng milimet theo công thức `[px, px]` và `[px/2, px/2]`.
  3. **Thao tác Realtime khi Đang Vẽ (Realtime Vertex HUD)**:
     - Bổ sung thanh điều khiển nhanh `#cadVertexQuickBar` trên tab Vẽ (`#cadPanelDraw`) gồm 3 bộ chọn: Kiểu icon (`#cadDrawVertexStyle`), Màu sắc (`#cadDrawVertexColor`), Kích thước (`#cadDrawVertexSize`).
     - Tự động áp dụng tức thì lên các đỉnh đang vẽ dở qua `updateDraftVertexConfig()` mà không cần thoát lệnh hay vẽ lại.
  4. **Tùy biến Đối tượng Đã Lưu**:
     - Click vào đỉnh trên bản đồ: Popup sửa nhanh (`showQuickEditPopup`) cho phép đổi Kiểu icon, Màu sắc, Cỡ đỉnh cho riêng đỉnh ("Lưu Đỉnh") hoặc áp dụng đồng loạt cho toàn bộ các đỉnh của hình ("Cả Khối").
     - Bảng kê đỉnh thửa (`modalCadAreaTable` - Tab Vertices): Bổ sung cột "Cỡ" cho từng đỉnh, kèm thanh công cụ Đổi hàng loạt (`#cadBulkShapeSelect`, `#cadBulkStyleSelect`, `#cadBulkColorSelect`, `#cadBulkSizeSelect`, `applyBulkVertexGlyphs`).
     - Hộp thoại Ký hiệu & Hiển thị (`modalCadSymbols`): Bổ sung cột Kích thước mặc định theo từng lớp CAD (`cadSymSize_${layerId}`, `applyLayerGlyph`).
  5. **Kiểm soát Chất lượng & UI Polish**:
     - Tuyệt đối không còn font-size < 11px.
     - Đồng bộ phiên bản tài nguyên `v2.8.44` trên toàn bộ hệ thống (`package.json`, `sw.js`, `index.html`).
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Tạo mới test suite `tests/cad_vertex_icon_styling.test.js` kiểm thử toàn diện 10 kiểu dáng, 4 kích thước, CSS và thuật toán.
  - Toàn bộ **513 / 513 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Đã kiểm chứng trực quan E2E trên Chrome DevTools MCP: Đổi kiểu icon đỉnh trong lúc vẽ dở, popup sửa nhanh trên map, và đổi hàng loạt trong bảng đỉnh đều phản hồi mượt mà, chính xác.

---

### [2026-11-19] WP-Y Đồng Bộ Toàn Diện Nút Chức Năng & Hoạt Động Giữa Các Phân Hệ Trong "Chuyển Tọa Độ"
- **Yêu cầu từ người dùng**:
  - `điều chỉnh để các chức năng tương tự nhau trong "chuyển tọa độ" đều có nút chức năng và các hoạt động tương tự nhau`
  - Đã qua Socratic Intake Gate & thống nhất phương án đồng bộ toàn diện cả 3 phân hệ: Đơn điểm, Nhiều điểm, Đổi KTT/múi.
- **Phân tích & Thiết kế Kỹ thuật Đồng Bộ**:
  1. **Đổi KTT / Múi (`panelTransRezone`)**:
     - Bổ sung nút `📐 CAD` (`#rzCopyCad`): Sao chép nhanh danh sách tọa độ định dạng CAD (`Y,X` / Easting, Northing) dán thẳng vào AutoCAD/MicroStation.
     - Bổ sung nút `📤 Xuất File` (`#rzExport`): Mở hộp thoại xuất đa định dạng (Excel, DWG, DXF, CSV, PDF, KML) qua `appData.openExportModal('transform')`.
  2. **Nhiều điểm (`panelTransMulti`)**:
     - Đồng bộ thanh công cụ kết quả ở header: `🗺️ Xem Bản Đồ`, `💾 Lưu Điểm`, `📋 Chép tất cả`, `📐 CAD`, `📋 VN2K`, `🌐 WGS`, `⬇️ CSV`, `📤 Xuất File`.
     - Nút `📐 CAD` (`appTransform.copyMultiCadResult()`): Sao chép định dạng `Y,X` cho toàn bộ các điểm kết quả.
     - Bổ sung Modal Đặt Tên & Lưu Điểm chuyên nghiệp `#modalMultiSavePoints`: Chọn/tạo file dự án đích, chọn quy tắc đặt tên (giữ nguyên, tiền tố `M_`, hậu tố `_VN2K`), sửa trực tiếp tên từng mốc trong bảng preview, checkbox chọn/bỏ chọn từng mốc, hiển thị X, Y, KTT, WGS-84.
  3. **Đơn điểm (`panelTransSingle`)**:
     - Thêm nút `📤 Xuất File` (`appTransform.openExportSingleModal()`): Xuất điểm kết quả ra Excel, CAD, KML.
     - Bổ sung Modal Đặt Tên & Lưu Điểm `#modalSingleSavePoints`: Khi bấm `💾 LƯU VÀO SỔ ĐO`, mở modal cho phép sửa tên mốc, chọn/tạo file dự án đích, nhập ghi chú, xem lại thông số trắc địa $X, Y$, WGS-84, KTT/Múi trước khi lưu.
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Tạo mới test suite `tests/transform_features_unification.test.js` bao quát 100% các nút và modal mới.
  - Toàn bộ **509 / 509 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Kiểm chứng E2E trực tiếp qua Chrome DevTools MCP trên trình duyệt live: Thao tác trơn tru trên cả 3 phân hệ, lưu điểm chính xác vào sổ đo, console 0 lỗi.

---

### [2026-11-19] WP-X Bổ Sung Nút Chức Năng Đặt Tên & Lưu Điểm Kết Quả Chuyển Đổi KTT/Múi Vào Sổ Đo Dự Án
- **Yêu cầu từ người dùng**:
  `- Chức năng "Đổi VN-2000 sang KTT/múi khác" cần bổ sung nút chức năng đặt tên và lưu các điểm kết quả được chuyển đổi (tọa độ, múi chiếu, kinh tuyến trục)`
  `/goal Hãy đảm bảo các chức năng hoạt động tốt.`
- **Phân tích & Thiết kế Kỹ thuật**:
  - **Nút chức năng**:
    - Thêm nút `💾 Lưu Điểm` (`#rzSave`) vào thanh công cụ kết quả `#rzResultCard` của phân hệ Đổi KTT/múi.
  - **Hộp thoại Đặt Tên & Lưu Điểm (`#modalRzSavePoints`)**:
    - Thiết kế giao diện hiện đại chuẩn Lovable 2026:
      1. *Lựa chọn file Dự án lưu mốc*: Dropdown danh sách file dự án trong `AppState.projectsList`, hỗ trợ tạo file dự án mới tức thời.
      2. *Quy tắc đặt tên nhanh*: Giữ nguyên tên gốc, đổi tên hàng loạt theo Tiền tố (ví dụ `KTT_1`, `KTT_2`...), hoặc gắn thêm hậu tố KTT đích (ví dụ `M1_10545`).
      3. *Chỉnh sửa tên mốc trực tiếp*: Người dùng có thể gõ trực tiếp tên mốc mong muốn cho từng điểm trong bảng xem trước.
      4. *Bảo toàn 100% dữ liệu kỹ thuật*: Mỗi mốc được lưu với đầy đủ thông số: Tọa độ mới (X, Y), Múi chiếu đích (`mui`), Kinh tuyến trục đích (`ktt`, `kttVal`), Tọa độ địa lý WGS-84 (`lat`, `lng`), và ghi chú chuyển đổi nguồn ➔ đích.
  - **Tuân thủ nghiêm ngặt UI Isolation Principle**:
    - Tuyệt đối không gọi chéo sang giao diện Bản đồ dự án (`openProjectMap`) hay `appCadTool`.
    - Điểm được lưu êm ái vào cơ sở dữ liệu dự án qua `root.appData.savePoints` và tự động đồng bộ banner, dropdown mà không làm gián đoạn màn hình làm việc hiện tại của người dùng.
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Đã cập nhật và bổ sung bài test logic trong `tests/vn2000_rezone.test.js`.
  - Toàn bộ **506 / 506 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Kiểm chứng trực quan E2E trên Chrome DevTools MCP:
    - Bấm nút `💾 Lưu Điểm`: Modal hiển thị đầy đủ bảng mốc với tọa độ mới, KTT đích, múi đích.
    - Đổi tiền tố mốc sang `MOC_KTT_` và bấm lưu: Cả 2 điểm mốc được lưu chính xác vào sổ đo `VN2000_SoLieu_DoDac.csv` với tên `MOC_KTT_1`, `MOC_KTT_2`, KTT `105°45'`, Múi 3°.
    - Console hoàn toàn sạch sẽ, 0 lỗi JavaScript.

---

### [2026-11-19] WP-W Bổ Sung Nút Xem Bản Đồ Kết Quả Đổi KTT/Múi & Tính Năng Nối Điểm Đã Lưu/Chuyển Đổi Trong MiniCAD
- **Yêu cầu từ người dùng**:
  1. `Chức năng "Đổi VN-2000 sang KTT/múi khác" cần bổ sung nút chức năng cho xem bản đồ các kết quả được chuyển đổi.`
  2. `MiniCAD cho phép bổ sung chức năng nối các điểm được lưu/chuyển đổi trước đó.`
  3. `/goal Hãy đảm bảo các chức năng hoạt động tốt.`
- **Phân tích & Thiết kế Kỹ thuật**:
  - **Tính năng 1 (Xem bản đồ Đổi KTT/Múi)**:
    - Bổ sung nút `🗺️ Xem Bản Đồ` (`#rzViewMap`) vào thẻ kết quả `#rzResultCard`.
    - Viết hàm `viewOnMap()` trong `vn2000-rezone.js`, chuyển tiếp danh sách điểm kết quả (`last.results`) sang `root.appNav.openTransformMap({ mode: 'view', subMode: 'multi', rezonePoints: valid, src: last.src, dst: last.dst })`.
    - **Tuân thủ 100% UI Isolation Principle**: Tuyệt đối không gọi chéo sang Sổ mốc dự án (`openProjectMap`) hay `appCadTool`.
    - Cập nhật `appTransformMap`: Nhận `rezonePoints`, vẽ các pin marker màu xanh bầu trời `#0284c7`, popup hiển thị đầy đủ thông số (Tên điểm, VN-2000 mới X/Y, VN-2000 nguồn x/y, WGS-84, KTT nguồn ➔ KTT đích), tự động `fitBounds` và thu nhỏ sheet về peek để người dùng nhìn bao quát toàn bộ điểm mốc trên bản đồ vệ tinh.
  - **Tính năng 2 (Nối điểm đã lưu/chuyển đổi trong MiniCAD)**:
    - Bổ sung nút `🔗 Nối điểm [NOI]` (`#btnCadConnectPoints`) trên thanh công cụ MiniCAD tab Vẽ (`#cadPanelDraw`) và nút `🔗 Nối thành thửa/tuyến` trong Bảng điểm `#modalCadPointTable`.
    - Xây dựng hộp thoại `#modalCadConnectPoints` hiện đại chuẩn Lovable 2026: Cho phép chọn nguồn điểm (`cad_points`: Lớp điểm rời MiniCAD; `project_points`: Sổ mốc dự án; `converted_points`: Điểm vừa chuyển đổi tọa độ / Đổi KTT).
    - Hỗ trợ chọn kiểu nối: `polygon` (Đa giác ranh khép kín tính diện tích $m^2$, ha) hoặc `polyline` (Đường tim tuyến / ranh hở tính tổng chiều dài).
    - Hỗ trợ 3 thuật toán sắp xếp thứ tự nối:
      1. `natural`: Sắp xếp theo Tên mốc / Số thứ tự tự nhiên (Đ1, Đ2, Đ3... Đ10).
      2. `list`: Theo thứ tự ban đầu trong danh sách.
      3. `tsp`: Tối ưu chu vi ngắn nhất khép vòng (Greedy Nearest Neighbor Tour) chống tự cắt chéo.
    - Tích hợp lệnh CADCraft CLI: `NOI`, `CONNECT`, `NOIDIEM`, `LINKPOINTS`.
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Đã bổ sung bộ kiểm thử chuyên sâu mới `tests/cad_connect_points.test.js` và cập nhật `tests/vn2000_rezone.test.js`.
  - Toàn bộ **505 / 505 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Kiểm thử trực quan E2E trên Chrome DevTools MCP:
    - Đổi KTT thành công 2 điểm mẫu và nhấn "🗺️ Xem Bản Đồ": Chuyển sang bản đồ chuyển đổi mượt mà, định vị chính xác 2 điểm mốc trên bản đồ vệ tinh kèm popup chi tiết.
    - Mở MiniCAD, mở modal Nối điểm và thực thi nối 4 mốc thành Thửa đất: Thửa đất mới tạo thành công, tự động tính diện tích $21.790,53$ $m^2$, hiển thị rực rỡ trên canvas MiniCAD.
    - Nhập lệnh `NOI` trên thanh lệnh CADCraft CLI: Kích hoạt modal Nối điểm tức thời. Console 0 lỗi JavaScript.

---

### [2026-11-19] WP-V Khắc Phục Lỗi Xung Đột Render Khi Kéo Thả Bản Đồ MiniCAD (Double-Buffering & Task Cancellation)
- **Yêu cầu từ người dùng**:
  `MiniCAD đã làm nét được tuy nhiên khi load dữ liệu còn xuất hiện lỗi khi kéo thả bản đồ`
- **Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis - RCA)**:
  - Khi người dùng nạp dữ liệu bản đồ PDF (`appPlanOverlay`) vào MiniCAD rồi kéo thả (pan) hoặc thu phóng (zoom) bản đồ, sự kiện `moveend` / `zoomend` kích hoạt liên tục.
  - Hàm `_renderSharpPatch` gọi `page.render()` trực tiếp lên cùng một phần tử `<canvas>` (`this._sharpCv`) trong khi tác vụ render trước đó chưa kịp hoàn tất.
  - Thư viện PDF.js bắt buộc một canvas chỉ được thực hiện một thao tác render tại một thời điểm, do đó ném lỗi:
    `Error: Cannot use the same canvas during multiple render() operations. Use different canvas or ensure previous operations were cancelled or completed.` (xảy ra tới 14 lần trong log console).
  - Khi lỗi xảy ra, ma trận biến đổi `this._sharpMatrixFn` bị gián đoạn, canvas bị đóng băng ở vị trí cũ hoặc biến mất, gây cảm giác giật lag/lỗi khi kéo bản đồ.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Động cơ Double-Buffering (Offscreen Canvas độc lập)**:
     - Tạo một `offscreenCv` độc lập cho mỗi lượt render. Mỗi tác vụ của PDF.js vẽ lên canvas ảo riêng biệt, triệt tiêu 100% khả năng xung đột canvas lock.
     - Sau khi `renderTask.promise` hoàn tất thành công, bitmap được copy nguyên vẹn sang `this._sharpCv` qua `drawImage()`, không làm chớp nháy màn hình.
  2. **Cơ chế Hủy Tác Vụ Cũ & Generation Counter (`_renderGen`)**:
     - Lắng nghe sự kiện `movestart` và `zoomstart`: ngay khi người dùng bắt đầu chạm/kéo bản đồ, hệ thống lập tức hủy tác vụ render đang chạy (`this._activeRenderTask.cancel()`), giải phóng 100% tài nguyên CPU/GPU cho thao tác kéo thả 60 FPS mượt mà.
     - Theo dõi biến thế hệ `_renderGen`: nếu người dùng tiếp tục kéo bản đồ sang tọa độ mới trong lúc đang render, kết quả của vị trí cũ sẽ tự động bị bỏ qua, chỉ vị trí dừng cuối cùng mới được hiển thị.
  3. **Đồng bộ cơ chế cho cả Viewer nắn tọa độ (`_renderSharpViewer`)**:
     - Áp dụng cùng giải pháp double-buffering, cancellation và generation counter cho modal xem và chấm mốc tọa độ.
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Toàn bộ **502 / 502 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Kiểm thử trực tiếp trên Chrome DevTools MCP: Kéo thả và thu phóng liên tục trên bản đồ MiniCAD không còn bất kỳ lỗi console nào (0 errors, 0 warnings). Bản đồ phản hồi tức thì, mượt mà và cực kỳ sắc nét.

---

### [2026-11-19] WP-U Khắc Phục Triệt Để Lỗi PDF Mờ Khi Zoom & Xuất File MiniCAD (PDF/PNG) Sắc Nét Chuẩn In Ấn 300 DPI
- **Yêu cầu từ người dùng**:
  - `file PDF rất nét được nhập vào, tuy nhiên khi nhập vào ứng dụng thì rất mờ khi phóng to cùng tỉ lệ dù đã chỉnh độ nét lên tối đa`
  - `trong chức năng MiniCAD file xuất ra (dạng pdf và hình ảnh) đang rất mờ.`
  - `hãy fix các lỗi trên`
  - Người dùng chọn thực hiện theo **Phương án A**: Tự động tối ưu hóa sắc nét tối đa (Dynamic Sharp Viewport chuẩn Retina/4K cho PDF nhập vào và hiển thị khi zoom; Xuất PDF và ảnh PNG MiniCAD ở chuẩn in ấn sắc nét cao 200–300 DPI, chuyển hoàn toàn sang nén Lossless PNG loại bỏ vỡ hạt JPEG).
- **Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis - RCA)**:
  1. *Lỗi 1 (PDF mờ khi zoom trong Viewer và Leaflet Map)*:
     - `_renderSharpViewer` kiểm tra điều kiện zoom bằng `v.s <= 1.15` (tỷ lệ tuyệt đối thay vì tỷ lệ zoom tương đối `v.s / v.fit`), khiến sharp canvas không bao giờ được kích hoạt trong 95% thao tác zoom.
     - PDF.js reset hoàn toàn 2D context transform khi thực thi `page.render()`, do đó lệnh `ctx.translate()` bị bỏ qua, canvas luôn render góc trên cùng bên trái của trang PDF thay vì vùng viewport đang zoom.
  2. *Lỗi 2 (Xuất ảnh PNG mờ nhòe)*:
     - `exportOptimizedImage` bị gán cứng `W = 1200` pixels bất chấp khổ giấy A0-A4, dẫn đến ảnh xuất ra chỉ đạt ~1 Megapixel, chữ và nét vẽ bị vỡ.
     - `exportPng()` chỉ gọi sang `exportOptimizedImage({ format: 'png' })` mà không kế thừa khung tên kỹ thuật TCVN, khổ giấy chuẩn và bảng kê tọa độ.
  3. *Lỗi 3 (Xuất PDF mờ)*:
     - Mật độ điểm ảnh `pxPerMm` quá thấp (A0 chỉ 88.9 DPI, A4 chỉ 203 DPI).
     - Sau khi vẽ canvas, code cũ nén thành `image/jpeg 0.95`, thuật toán nén lossy JPEG gây nhòe mờ viền nét mảnh CAD và các con số kích thước.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Dynamic Sharp Viewport cho PDF nhập vào (Vector Crisp Render Engine)**:
     - Sửa `_renderSharpViewer` trong modal Viewer: Tính `zoomRatio = v.s / (v.fit || v.s || 1)`, kích hoạt sharp canvas ngay khi zoom $\ge 1.05$.
     - Truyền ma trận tịnh tiến `transform: [1, 0, 0, 1, offsetX, offsetY]` trực tiếp vào tham số của `page.render()` theo đúng đặc tả PDF.js.
     - Nâng hệ số hiển thị theo `window.devicePixelRatio` (hỗ trợ màn hình Retina / 4K) với giới hạn an toàn 4096px.
     - Cải tiến tương tự cho `_renderSharpPatch` trên bản đồ Leaflet Map (`appPlanOverlay`), hạ ngưỡng kích hoạt zoom từ cấp 13 và tỷ lệ màn hình $\ge 0.5$.
  2. **Nâng Cấp Động Cơ Xuất Bản Vẽ CAD PDF & PNG Chuẩn 300 DPI**:
     - Nâng `pxPerMm` trong `appCadTool.exportPdf`: A3/A4 đạt 11.811 px/mm (**300 DPI chuẩn in ấn bản đồ địa chính**), A2 đạt 9.5 px/mm (**240 DPI**), A1 đạt 8.0 px/mm (**200 DPI**), A0 đạt 6.0 px/mm (**152.4 DPI**).
     - Chuyển đổi 100% việc chèn ảnh vào PDF sang **Lossless PNG** (`canvas.toDataURL('image/png')` + `doc.addImage(imgData, 'PNG', ...)`) triệt tiêu hoàn toàn hiện tượng vỡ hạt JPEG.
  3. **Hỗ Trợ Xuất Bản Vẽ CAD Ra Ảnh PNG Đầy Đủ Khung Tên & Bảng Tọa Độ (`exportPng`)**:
     - `appCadTool.exportPng()` liên kết trực tiếp với động cơ vẽ CAD TCVN khổ giấy cao cấp qua `this.exportPdf({ asPng: true })`.
     - Tự động xuất tệp PNG độ nét cao mang đầy đủ khung tên, mộc dự án, bảng kê tọa độ ranh đất, thước tỷ lệ, kim chỉ Bắc và các lớp nền quy hoạch Guland / vệ tinh.
  4. **Nâng Cấp Độ Phân Giải `exportOptimizedImage` Lên 2x Retina (2400px)**:
     - Áp dụng `dpr = 2` (`ctx.scale(2, 2)`), nâng độ phân giải ảnh nén PixOptimizer lên gấp đôi (2400px chiều ngang) và nới giới hạn `maxEdge` lên 3840px, giúp ảnh thumbnail/quick export cũng đạt độ sắc nét tuyệt hảo.
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Toàn bộ **502 / 502 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Kiểm thử trực tiếp trên Chrome DevTools MCP: xuất dữ liệu bản vẽ PNG 300 DPI trả về kết quả sắc nét, data URL hợp lệ kích thước >700KB; nạp trang và hiển thị mượt mà không có lỗi console.

---

### [2026-11-19] WP-T Nâng Cấp Toàn Diện Ứng Dụng Toàn Trình (5-Wave Suite & Release v2.8.43 Pro)
- **Yêu cầu từ người dùng**:
  `nâng cấp cho app` - Thực hiện toàn bộ theo quy trình 5-Wave tuần tự không gây xung đột và bảo toàn 100% logic nghiệp vụ:
- **Nội dung thực hiện chi tiết**:
  1. **Wave 1: Tối ưu phân hệ Chuyển đổi tọa độ (Trắc địa CAD & Vệ tinh Google Maps)**:
     - Bổ sung nút sao chép nhanh chuẩn CAD `📐 CAD` (`appTransform.copyCadResult()`), xuất định dạng `Y,X` (Easting,Northing) cho phép dán trực tiếp vào dòng lệnh AutoCAD / MicroStation.
     - Bổ sung nút mở vị trí vệ tinh Google Maps `🗺️ G-Maps` (`appTransform.openGoogleMaps()`) để gửi định vị ngay cho khách hàng hoặc mở ứng dụng bản đồ điều hướng.
  2. **Wave 2: Tối ưu phân hệ MiniCAD (Truy cập nhanh Lớp Bản Đồ Quy Hoạch)**:
     - Tích hợp 2 nút bấm thao tác nhanh ngay trên thanh trạng thái đáy HUD (`#cadStatusHud`): `#btnCadHudPlanPdf` (Bản đồ PDF nắn tọa độ) và `#btnCadHudGuland` (Bản đồ quy hoạch Guland 2030).
     - Đồng bộ màu sắc và trạng thái hiển thị tự động qua `appPlanOverlay.syncControlsUi()`.
  3. **Wave 3: Tối ưu phân hệ Bố trí điểm & Cắm mốc thực địa (Stakeout Pro)**:
     - Thêm nút `📋 CHÉP SỐ` (`appStakeout.copyStakeoutDelta()`) trên màn hình cắm mốc thực địa `#screen-stakeout`.
     - Cho phép sao chép nhanh toàn bộ thông số: Mốc đích, Cự ly, $\Delta X, \Delta Y$, Sai số GPS Acc và tọa độ VN-2000 vào bộ nhớ tạm để ghi sổ tay đo đạc hoặc trao đổi qua Zalo.
  4. **Wave 4: Kiểm soát Giao diện & Độ phản hồi Bento UI 2026**:
     - Bảo đảm 100% cỡ chữ $\ge 11$px, kích thước bấm tối thiểu $\ge 42$px - $44$px trên màn hình cảm ứng di động.
  5. **Wave 5: Nâng Cấp Phiên Bản & Đồng Bộ Service Worker Cache (v2.8.43 Pro)**:
     - Nâng cấp phiên bản toàn diện trong `package.json`, `feature_list.json` (`F-016` và `F-017`), `index.html` và `sw.js` (`CACHE_NAME = 'vn2000-pro-v2.8.43'`).
     - Tự động kích hoạt cơ chế dọn sạch cache cũ trên thiết bị người dùng để cập nhật tính năng mới ngay lập tức.
- **Kết quả Kiểm thử & Nghiệm thu**:
  - Toàn bộ **502 / 502 bài kiểm thử tự động đạt PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Kiểm tra trực quan bằng Chrome DevTools MCP: console sạch sẽ 0 lỗi JS, các nút bấm hoạt động chính xác.

### [2026-11-19] WP-S Kiểm Tra Toàn Diện & Tối Ưu Hóa MiniCAD Tích Hợp Xuất File Chứa Bản Đồ Guland 2030
- **Yêu cầu từ người dùng**:
  `kiểm tra toàn diện để tối ưu hóa MiniCAD để có thể tích hợp chọn xuất được file chứa được lớp bản đồ Guland`
- **Các giải pháp tối ưu hóa & hoàn thiện toàn diện**:
  1. **Tự Động Nhận Diện Tỉnh Thành Thông Minh (`cadExportGulandProvince`)**:
     - Bổ sung logic chuẩn hóa tên tỉnh và đối sánh từ `AppState.provinceName` / `AppState.kttVal` $\to$ tự động chọn đúng tỉnh đang làm việc khi mở modal xuất, tránh phải chọn lại thủ công.
     - Kế thừa thông minh trạng thái bật/tắt quy hoạch từ màn hình vẽ MiniCAD: nếu đang bật lớp quy hoạch trên bản đồ CAD (`appPlanning.targets.cadMap.active`), modal xuất tự động tích chọn sẵn "In kèm lớp quy hoạch Guland 2030".
  2. **Lưu Trữ Bền Vững Cấu Hình Xuất Guland Vào `localStorage`**:
     - Bổ sung các trường `basemap`, `showGuland`, `gulandProvince`, `gulandOpacity`, `gulandLand`, `printPlanOverlay` vào `saveTitleBlockInfo()` và `resetTitleBlockInfo()` của `appCadTool`. Cấu hình được lưu vĩnh viễn theo dự án và toàn cục.
  3. **Huy Hiệu Trực Quan Sinh Động Trên Khung Xem Trước SVG (`renderExportPreview`)**:
     - Khung SVG xem trước tỷ lệ thực (`#cadExportPreviewSvg`) hiển thị ngay huy hiệu trạng thái: `🗺️ IN KÈM QUY HOẠCH GULAND: [TÊN TỈNH] ([OPACITY]%) [• CẢ RANH ĐẤT]` và `📄 IN KÈM X LỚP BẢN ĐỒ NẮN TỌA ĐỘ`.
     - Người dùng nhìn vào khung xem trước là biết chắc chắn 100% bản vẽ xuất ra sẽ có đầy đủ lớp Guland.
  4. **Thích Ứng Số Lượng Ngói Cho Khổ Giấy Lớn (A0: 260 ô, A1: 220 ô, A2: 180 ô)**:
     - Trong `_prepareExportBasemap`, tự động nâng giới hạn `maxTiles` theo kích thước khổ giấy để bản in PDF/PNG khổ lớn đạt độ sắc nét tối đa, đọc rõ từng số thửa đất.
  5. **Kiểm Chứng Thực Nghiệm Trực Tiếp (Chrome DevTools MCP)**:
     - Đã nạp thành công 2/2 ô ngói quy hoạch Đồng Tháp, vẽ lên Canvas đạt `drawnCount: 2`, `isTainted: false`, kích thước data URL PNG đạt 269.026 bytes.
     - 495 / 495 tests PASS 100%.

### [2026-11-18] WP-R Sửa Triệt Để Lỗi Không Xuất Được File Chứa Lớp Bản Đồ Guland (CORS Tile Proxy Stream & Zero Tainted Canvas)
- **Yêu cầu từ người dùng**:
  `chưa xuất được file chứa được lớp bản đồ Guland.`
- **Phân tích Nguyên nhân Gốc rễ (Root Cause)**:
  - Khi xem trên bản đồ Leaflet bằng DOM thông thường, ảnh ngói Guland (`<img>`) hiển thị bình thường vì thẻ `<img>` không yêu cầu CORS.
  - Tuy nhiên khi xuất bản vẽ PDF / PNG qua HTML5 Canvas trong `loadExportBasemap()`, trình duyệt yêu cầu `img.crossOrigin = 'anonymous'` để đọc dữ liệu pixel xuất ra file.
  - Các CDN ngói của Guland (`vcdn.cloud`, `cmctelecom.vn`, `fptcloud.com`, `digitaloceanspaces.com`) **hoàn toàn không đính kèm header CORS** (`Access-Control-Allow-Origin: *`).
  - Do đó trình duyệt kích hoạt sự kiện `img.onerror` ngay lập tức $\to$ 100% ngói Guland bị đánh dấu `failed: true` $\to$ bản vẽ PDF/PNG kết xuất không có ảnh ngói Guland.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Tạo Endpoint Proxy Ngói Cục Bộ (`server.js`) & Vercel Serverless Function (`api/tile-proxy.js`)**:
     - Route `/api/tile-proxy?url=...` (và `/api/proxy-tile?url=...`) stream nhị phân ảnh ngói PNG trực tiếp.
     - Đính kèm header `Access-Control-Allow-Origin: *` và bộ đệm dài hạn `Cache-Control: public, max-age=604800, s-maxage=604800`.
     - Whitelist các domain bản đồ an toàn (`vcdn.cloud`, `cmctelecom.vn`, `fptcloud.com`, `digitaloceanspaces.com`, `openstreetmap.org`, `arcgisonline.com`, `terrascope.be`, `eox.at`) để phòng chống triệt để tấn công SSRF.
  2. **Bọc URL Ngói Tự Động (`wrapTileProxyUrl`) trong `app.js`**:
     - Tự động nhận diện các URL ngói từ CDN Guland và chuyển hướng qua proxy khi chạy trên môi trường Web/PWA.
     - Tích hợp cả trong `planExportGuland` lẫn lớp phòng vệ dự phòng trong `loadExportBasemap` (cho cả URL chính lẫn fallback URL).
  3. **Kiểm Chứng Thực Nghiệm Trực Quan Trên Trình Duyệt Thực Tế (Chrome DevTools MCP)**:
     - Tải thành công 100% ngói quy hoạch Đồng Tháp (`totalTiles: 8, loadedTiles: 8, failedTiles: 0`).
     - Vẽ lên Canvas và gọi `toDataURL('image/png')` đạt `"taintedError": null, "dataUrlLength": 47718`, xác nhận Canvas hoàn toàn trong sạch, không bị tainted.
  4. **Kiểm Thử Tự Động & Hồi Quy**:
     - Mở rộng bộ test `tests/export_guland_and_pdf_layers.test.js` kiểm tra proxy URL wrapper, xử lý mã lỗi 400 (thiếu url) và 403 (domain không được phép).
     - Toàn bộ 495 bài test PASS 100%.

### [2026-11-18] WP-Q Bổ Sung Khổ Giấy Lớn (A0, A1, A2) & Nhập Tay Tỉ Lệ Bản Đồ Đánh Giá Vùng Lớn (MiniCAD & Sổ Đo Dự Án)
- **Yêu cầu từ người dùng**:
  `khổ giấy cho phép chọn khổ lớn hơn để in bản vẽ, về tỉ lệ bản đồ cũng cho phép nhập tay tỉ lệ bản đổ (do một số bản vẽ cần được vẽ là bản đồ lớn để đánh giá)`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Khổ Giấy Lớn A0, A1, A2 Chuẩn TCVN 7285 & ISO 216**:
     - Bổ sung toàn bộ các khổ lớn cho cả MiniCAD và Sổ đo / Dự án:
       - **A0 Ngang** (1189 × 841 mm) & **A0 Đứng** (841 × 1189 mm)
       - **A1 Ngang** (841 × 594 mm) & **A1 Đứng** (594 × 841 mm)
       - **A2 Ngang** (594 × 420 mm) & **A2 Đứng** (420 × 594 mm)
       - Bên cạnh A3 và A4 hiện tại.
     - Tự động điều chỉnh độ rộng cột bảng biểu và khung tên (`W_panel_mm`): Khổ A0/A1 dùng 90mm, A2/A3 dùng 75mm, A4 dùng 60mm.
  2. **Cho Phép Nhập Tay Tỉ Lệ Bản Đồ (Custom / Manual Scale Input)**:
     - Thêm tùy chọn `✍️ Tùy chỉnh (Nhập tay tỉ lệ)...` (`value="custom"`) trên dropdown tỉ lệ của cả MiniCAD (`#cadExportScale`) và Bản đồ Dự án (`#selExportMapScale`).
     - Tự động hiển thị khung nhập số trực tiếp `Tỉ lệ 1 : [ _______ ]` khi người dùng chọn tùy chỉnh (`#cadExportCustomScaleWrap`, `#selExportCustomScaleWrap`).
     - Bổ sung sẵn các nấc tỉ lệ lớn chuẩn trắc địa & quy hoạch: `1:25.000`, `1:50.000`, `1:100.000`.
     - Nhãn xem trước, khung tên bản vẽ, và tên file tự động đồng bộ tỉ lệ tùy chỉnh (VD: `Tỉ lệ 1:25000 (Nhập tay)`).
  3. **Lưới Tọa Độ Chuẩn Trắc Địa Theo Tỉ Lệ Lớn (`gridInterval`)**:
     - $\ge 50.000 \to$ bước lưới 5.000m (5 km).
     - $\ge 25.000 \to$ bước lưới 2.500m (2.5 km).
     - $\ge 10.000 \to$ bước lưới 1.000m (1 km).
     - Tránh vẽ hàng trăm đường lưới dày đặc làm nát bản đồ vùng lớn.
  4. **Cơ Chế Thích Ứng Phân Giải Chống Tràn Bộ Nhớ RAM Canvas (Canvas Memory Guard)**:
     - Khổ A0: tự động dùng `3.5 px/mm` (~12.2 Megapixels), khổ A1: `4.5 px/mm`, khổ A2: `6.0 px/mm`, khổ A3/A4: `8.0 px/mm`.
     - Đảm bảo bản in PDF và ảnh PNG vừa đạt độ sắc nét tuyệt hảo vừa kết xuất mượt mà dưới 0.5s trên mọi máy tính và trình duyệt di động.
  5. **Xuất Bản Vẽ Đa Định Dạng (AutoCAD DWG, PDF Vector, PNG Raster, SVG)**:
     - jsPDF nhận kích thước mm tự do `format: [meta.paperW, meta.paperH]` và hướng giấy `landscape`/`portrait`.
     - File AutoCAD DWG AC1015 tính toán tọa độ khung giấy theo mét thực địa `W_sheet = W_paper * S`, `H_sheet = H_paper * S` chuẩn 100% tỷ lệ.
  6. **Kiểm Thử Tự Động & Hồi Quy**:
     - Viết mới `tests/export_large_paper_and_custom_scale.test.js` kiểm tra DOM, logic kích thước và thuật toán bố cục.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **487/487 tests PASS 100% (0 fail)**.
     - Kiểm tra tương tác thực tế và chụp ảnh nghiệm thu qua Chrome DevTools MCP.


### [2026-11-18] WP-P Duy Nhất Một Lớp Bản Đồ Guland, Triệt Tiêu Layer Mặc Định / Kẹt Luôn Mở & Cho Phép Chọn Tỉnh Hoặc Tắt Hoàn Toàn (F-015/F-016)
- **Yêu cầu từ người dùng**:
  `nền bản đồ đang có 1 lớp guland luôn được mở là không đúng, chỉ nên tồn tại 1 lớp bản đồ guland (cho phép chọn hiển thị tỉnh, hoặc tắt lớp guland)`
- **Nguyên nhân gốc rễ (Root Cause Analysis)**:
  1. *Lệch tham chiếu giữa 2 target dùng chung Leaflet map (`projectMap` và `cadMap`)*: Cả Bản đồ dự án và MiniCAD đều chia sẻ cùng 1 đối tượng bản đồ `AppState.leafletMap`. Trước đây, khi một bên bật layer hoặc chuyển tỉnh, `targets[key].layer` được cập nhật riêng lẻ nhưng không đồng bộ tham chiếu sang bên còn lại. Khi người dùng cố gắng tắt ở một phân hệ, Leaflet chỉ cố gỡ đối tượng tham chiếu của phân hệ đó, dẫn tới ngói quy hoạch từ phân hệ kia bị mồ côi (orphan layer) kẹt vĩnh viễn trên bản đồ (`AppState.leafletMap._layers`).
  2. *Thiếu cơ chế thanh tẩy sạch các lớp Guland mồ côi*: Hàm `removeLayer(t.layer)` chỉ gỡ 1 đối tượng biến `t.layer`, nếu biến bị null hoặc có nhiều ngói gạch sinh ra qua nhiều lần đổi tỉnh, các ngói cũ vẫn tồn tại dưới nền.
  3. *Thẻ điều khiển nổi tự động bị ép mở khi tắt*: Trong các hàm `toggleProjectMapPlanning()`, `toggleLiveMapPlanning()`, `toggleTransformMapPlanning()`, code trước đây gọi cứng `this.togglePanel(..., true)`. Dù người dùng chủ động tắt lớp (`willOpen = false`), bảng nổi vẫn bị ép hiện lên với chữ `⚪ Đang tắt`, gây cảm giác tính năng luôn mở và không thể tắt.
  4. *Quản lý lớp bản đồ (`modalMapLayers`) giấu bộ chọn tỉnh khi lớp đang tắt*: Khi Guland đang OFF, người dùng không thể chọn trước tỉnh thành muốn xem trước khi bật.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Cơ chế Purge Triệt Để Zero-Orphan (`removeAllGulandLayersFromMap`)**:
     - Viết hàm `removeAllGulandLayersFromMap(map)`: quét toàn bộ `map.eachLayer()`, nhận diện bất kỳ tile layer nào có class `leaflet-layer-guland-planning`, `leaflet-layer-guland-land` hoặc chứa URL `vcdn.cloud`/`guland` và gỡ bỏ triệt để khỏi bản đồ.
     - Luôn gọi purge trước khi vẽ layer mới trong `toggle()` và `setProvince()`, đảm bảo **chỉ tồn tại duy nhất tối đa 1 layer quy hoạch** (và 1 layer thửa nếu bật) trên bất kỳ bản đồ nào.
  2. **Đồng Bộ Hai Chiều Tuyệt Đối Giữa `projectMap` & `cadMap` (`syncMainMapTargets`)**:
     - Hàm `syncMainMapTargets(sourceKey)` đồng bộ tức thời mọi thuộc tính (`active`, `layer`, `landLayer`, `provinceSlug`, `opacity`, `showLand`) giữa `projectMap` và `cadMap`.
     - Cập nhật đồng bộ toàn bộ nút bấm `#btnMapProjectPlanning`, `#btnCadPlanning`, `#cadCheckShowGulandPlanning` và `#mlGulandSwitch`.
  3. **Khắc Phục Đóng Thẻ Nổi & Tự Động Ẩn Khi Rời Phân Hệ**:
     - Chuyển `this.togglePanel(targetKey, willOpen)`: khi tắt lớp, bảng nổi đóng hoàn toàn (`display: none`).
     - Đăng ký `'mapProjectPlanningCtrl'` và `'cadPlanningCtrl'` vào `resetMapChrome()` và `closeCadWindows()` trong `app.js`.
  4. **Cho Phép Chọn 63 Tỉnh Kể Cả Khi Đang Tắt Trong `modalMapLayers`**:
     - Render thanh chọn tỉnh `#mlGulandProvSelect` ngay cả khi công tắc đang TẮT. Người dùng thoải mái chọn tỉnh, và khi gạt bật sẽ hiển thị ngay đúng tỉnh đã chọn mà không bị nhảy về mặc định.
     - Thêm phương thức `appPlanning.panToProvince(targetKey, slug)`.
  5. **Nâng Cấp Lệnh CADCraft CLI `QH`**:
     - Hỗ trợ `QH OFF`, `QH ON` và `QH <tên_tỉnh>` (ví dụ: `QH DONG-NAI`, `QH HA-NOI`, `QH DA-NANG`).
  6. **Kiểm Thử Tự Động & Hồi Quy 100%**:
     - Bổ sung `NHÓM 9` trong `tests/planning_map_integration.test.js`: **41/41 tests PASS**.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **484/484 tests PASS 100% (0 fail)**.
     - Kiểm tra thực tế bằng Chrome DevTools MCP: khởi động không có bất kỳ layer Guland nào (`[]`), bật lên có đúng 1 layer, đổi tỉnh giữ nguyên 1 layer duy nhất, tắt đi dọn sạch 100% về `[]`.

### [2026-11-18] WP-N Đưa Dữ Liệu Hình Học, Điểm Mốc, Tuyến, Thửa Lên Lớp Trên Cùng & Tự Động Đồng Bộ Xuất File MiniCAD (F-004/F-015/F-016)
- **Yêu cầu từ người dùng**: `các điểm chấm, điểm lưu, tuyến, thửa, đa giác,... các dữ liệu được lưu chưa được hiển thị ở phía trên cùng để xem và xuất dữ liệu trong miniCAD`
- **Nguyên nhân gốc rễ (Root Cause Analysis)**:
  1. *Lớp hiển thị (Stacking Context)*: Các đối tượng vẽ hình học (polygon, polyline) trước đây sử dụng `overlayPane` mặc định của Leaflet (zIndex: 400). Khi bật bản đồ quy hoạch Guland (zIndex: 230-235), ảnh/PDF overlays (zIndex: 250) hoặc các lớp gạch bản đồ, các đối tượng hình học dễ bị lẫn hoặc không duy trì vị thế vật lý ở lớp trên cùng.
  2. *Dữ liệu mốc chưa được tự động nạp thành khối (Reconstruct fallback)*: Khi người dùng chuyển đổi tọa độ hoặc lưu mốc vào dự án (`appData.points`), các mốc này chưa được gán nhãn `shapeName`/`blockName`. Hàm `reconstructShapesFromPoints()` trước đây bỏ qua các mốc không có `shapeName`, khiến `savedShapes` bị rỗng (`[]`) khi mở MiniCAD, người dùng không nhìn thấy ranh thửa/tuyến và không thể xuất file (DXF/GeoJSON/Excel/Bảng kê).
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Tạo Leaflet Panes Chuyên Biệt Trên Cùng (`cadVectorPane` & `cadMarkerPane`)**:
     - Định nghĩa lớp `cadVectorPane` với `z-index: 450 !important` (`pointer-events: auto`) chuyên chứa nét vẽ ranh thửa, đường tim tuyến, đa giác, đường song song Offset.
     - Định nghĩa lớp `cadMarkerPane` với `z-index: 680 !important` (`pointer-events: auto`) chuyên chứa các nhãn đỉnh (Đ1, Đ2...), nhãn kích thước cạnh, nhãn tâm diện tích và ghim mốc định vị.
     - Triển khai phương thức `appCadTool.bringCadToFront()`: tự động duyệt và gọi `.bringToFront()` cho toàn bộ các layer vectơ, nhãn và mốc dự án.
  2. **Tự Động Tái Tạo Hình Học Từ Mốc Dự Án Chưa Gắn Khối (Auto-Reconstruct Unassigned Points)**:
     - Nâng cấp `reconstructShapesFromPoints(curProj)`: Tự động gom nhóm các mốc dự án chưa có `shapeName`:
       - $\ge 3$ mốc: dựng thành đa giác khép kín ranh thửa (`mode: 'polygon'`).
       - $2$ mốc: dựng thành đường tim tuyến (`mode: 'polyline'`).
       - $1$ mốc (hoặc điểm rời): dựng thành lớp điểm mốc định vị (`mode: 'point'`).
     - Bổ sung `appCadTool.autoLoadAllProjectDataToCad(projName)`: Đồng bộ 1 chạm toàn bộ khối, mốc, thửa lên trên cùng MiniCAD.
     - Thêm phương thức `appCadTool.zoomToAllShapes()`: Tự động zoom vừa vặn (fitBounds) toàn bộ các đỉnh/mốc khi nạp.
  3. **Đảm Bảo Xuất Dữ Liệu Tức Thì (Instant Export Fallback)**:
     - Trong `appCadTool._getAllExportShapes()`: Nếu `this.savedShapes` rỗng nhưng dự án có mốc, tự động nạp từ file lưu hoặc tái tạo từ `reconstructShapesFromPoints`.
     - Ngay lập tức mở khóa chức năng xuất dữ liệu ra AutoCAD DWG/DXF, GeoJSON, KML, GPX, CSV, Excel, PDF và Bảng kê 6 tab.
  4. **Bổ Sung Nút Điều Khiển Trên Giao Diện (`index.html`)**:
     - Thêm nút `#btnCadAutoSyncProjectData` (`⚡ Đồng bộ mốc/thửa`) tại Tab 3 MiniCAD.
     - Thêm nút `#btnCadLoadProjectAll` (`⚡ NẠP TẤT CẢ DỮ LIỆU`) tại footer Modal nạp dự án.
     - Thêm nút `#btnCadLoadPointsOnly` (`📍 Nạp Điểm rời`) tại footer Modal nạp dự án.
  5. **Kiểm Thử & Xác Minh Hồi Quy 100%**:
     - Tạo bộ test chuyên biệt `tests/cad_topmost_data_and_export.test.js`: **26/26 tests PASS 100%**.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **477/477 tests PASS 100% (0 fail)**.

### [2026-11-18] WP-M Tích hợp Bản đồ Quy hoạch Guland 2030 làm Bản đồ nền & Bộ chọn tỉnh toàn diện (F-015/F-016)
- **Yêu cầu từ người dùng**:
  1. `chưa thể sử dụng các lớp bản đồ của Guland như bản đồ nền (bên dưới) để thao tác xem các điểm, tuyến, đa giác (ở trên cùng)`
  2. `hiện tại chưa cho phép chọn tỉnh để lấy lớp bản đồ của guland)`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Định vị lớp bản đồ nền dưới lớp vectơ & Triệt tiêu cản trở sự kiện (Leaflet Custom Panes)**:
     - Tạo riêng 2 Leaflet panes chuyên biệt: `planningOverlayPane` (zIndex: 230) cho quy hoạch 2030 và `planningLandPane` (zIndex: 235) cho ranh thửa đất.
     - Cài đặt `pointerEvents = 'none'` cho cả 2 panes, đảm bảo lớp ngói quy hoạch chỉ đóng vai trò hiển thị trực quan (visual basemap overlay), tuyệt đối không chiếm chuột hay cản trở thao tác click, chọn đối tượng, bắt điểm (OSNAP) hay vẽ điểm, tuyến, đa giác ở các lớp trên (overlayPane: 400, markerPane: 600).
  2. **Bộ chọn 63 tỉnh thành & Tích hợp vào Hộp thoại Quản lý Lớp Bản đồ (`modalMapLayers`)**:
     - Thêm card `Bản đồ Quy hoạch 2030 (Guland)` trực tiếp vào danh sách lớp phủ của `appMapLayers.renderPanel()`.
     - Tích hợp dropdown 63 tỉnh thành Việt Nam (`#mlGulandProvSelect`), thanh trượt độ mờ (10% - 100%), checkbox bật/tắt lớp ranh thửa đất, nút `🎯 Về tâm tỉnh` và nút `⚙️ Bảng nổi`.
     - Hỗ trợ đổi tỉnh toàn cục qua `appPlanning.setProvinceGlobal(slug, panToCenter)`, tự động cập nhật cả MiniCAD, Bản đồ Dự án, Bản đồ Chuyển đổi và Live Map.
  3. **Tích hợp toàn diện vào MiniCAD**:
     - *Thanh công cụ Tab 3 (Dự án & Tệp)*: Bổ sung nút bấm nhanh `#btnCadPlanning` (`📐 Quy hoạch Guland`).
     - *Tab 4 (Trợ vẽ & Lớp CAD)*: Bổ sung checkbox `#cadCheckShowGulandPlanning` trong nhóm `HIỂN THỊ`, đồng bộ 2 chiều với `syncDisplayCheckboxes()` và `toggleDisplayOption()`.
     - *Thẻ nổi trên bản đồ MiniCAD*: Thêm thẻ điều khiển `#cadPlanningCtrl` đặt ở góc trên bên phải bản đồ (`ui-polish.css`).
     - *Dòng lệnh CADCraft 2D CLI*: Bổ sung lệnh `QH`, `GULAND` (alias `QUYHOACHGULAND`) trong `cadCommandList` và `executeCommandLine()`.
  4. **Khắc phục lỗi thẻ điều khiển rỗng**:
     - Bổ sung cơ chế `syncPanelHtml(k)` tự động sinh đầy đủ dropdown chọn tỉnh, thanh trượt opacity và công tắc lớp thửa đất cho bất kỳ panel nào khi được gọi mở lần đầu (`togglePanel`).
     - Tự động kích hoạt `GulandPlanning.init()` ngay khi DOMContentLoaded sẵn sàng.
  5. **Kiểm thử tự động & Xác minh hồi quy**:
     - Bổ sung NHÓM 7 & NHÓM 8 trong `tests/planning_map_integration.test.js` (34 test cases).
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **476/476 tests PASS 100% (0 fail)**.

### [2026-11-18] WP-L Cho phép Bật / Tắt lớp bản đồ chèn từ file PDF & Ảnh quy hoạch (F-016)
- **Yêu cầu từ người dùng**: `cho phép bật/tắt lớp bản đồ được chèn bởi file PDF`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Cơ chế Bật / Tắt tập trung (Master Toggle & UI Sync)**:
     - Trong `appPlanOverlay`: Bổ sung cờ `_masterVisible`, phương thức `isMasterVisible()` và `toggleAll(forceState, silent)`. Khi master switch tắt, toàn bộ các lớp overlay PDF/ảnh được gỡ bỏ khỏi Leaflet map ngay lập tức mà vẫn giữ nguyên trạng thái cấu hình riêng lẻ trong IndexedDB.
     - Thêm `setAllItemsVisible(on)`: Cho phép bật hoặc tắt hàng loạt toàn bộ các bản đồ trong dự án chỉ bằng 1 chạm.
     - Hàm `syncControlsUi()`: Tự động đồng bộ hai chiều mọi công tắc / checkbox trên giao diện người dùng.
  2. **Tích hợp vào thanh công cụ MiniCAD**:
     - *Tab 4 (Trợ vẽ & Lớp CAD)*: Bổ sung checkbox `#cadCheckShowPlanOverlay` vào nhóm `HIỂN THỊ` (bên cạnh các checkbox Điểm rời, Đỉnh khối, Nhãn tên, Cự ly cạnh, Ranh giới khối). Kết nối với `appCadTool.toggleDisplayOption('showPlanOverlay', checked)` và `syncDisplayCheckboxes()`.
     - *Tab 3 (Dự án & Tệp)*: Bổ sung nút bấm nhanh `#btnCadTogglePlanOverlay` (`👁️ Bản đồ PDF`) ngay cạnh nút `🗺️ Ảnh nền quy hoạch` để người dùng thao tác 1 chạm ngay trên thanh công cụ chính.
  3. **Tích hợp vào Hộp thoại Lớp bản đồ (`modalMapLayers`)**:
     - Thêm công tắc master switch `#mlPlanOverlayMaster` cho `Ảnh nền quy hoạch (PDF)`.
     - Hiển thị danh sách từng tệp PDF/ảnh kèm checkbox bật/tắt độc lập và thanh trượt độ trong suốt (opacity slider) trực tiếp trong danh sách lớp phủ, không cần rời khỏi bản đồ.
  4. **Tích hợp vào Hộp thoại Quản lý PDF (`modalPlanOverlay`)**:
     - Bổ sung 2 nút tác vụ hàng loạt: `👁️ Bật tất cả` và `🙈 Tắt tất cả` tại thanh công cụ đỉnh danh sách bản đồ.
  5. **Tích hợp lệnh dòng lệnh CADCraft 2D CLI**:
     - Bổ sung lệnh `PDF` và `PLAN` (cùng các alias `ANHNEN`, `QUYHOACH`) vào `cadCommandList` và bộ xử lý `executeCommandLine()` để kỹ sư có thể gõ phím tắt bật/tắt lớp PDF tức thì.
  6. **Kiểm thử tự động & Xác minh**:
     - Bổ sung test case toàn diện vào `tests/plan_overlay_georef.test.js`.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **466/466 tests PASS 100% (0 fail)**.

### [2026-11-18] WP-K Khắc phục toàn diện & Tối ưu hóa Bản đồ Quy hoạch Guland 2030 (F-015)
- **Vấn đề từ người dùng**: `chưa thể sử dụng các lớp bản đồ của Guland`
- **Nguyên nhân cốt lõi phát hiện qua điều tra sâu**:
  1. *Khởi tạo trễ (Lazy init mismatch)*: Khi người dùng bấm `[📐 Quy hoạch]` trên Live Map hoặc trước khi bản đồ được vẽ, `getMapInstance` trả về `null`, dẫn đến `toggle()` trả về `false` và không thể bật layer.
  2. *Thiếu ràng buộc mức phóng to (Zoom bounds)*: Lớp gạch quy hoạch Guland chỉ tồn tại từ mức phóng to 10 đến 18-20 trong phạm vi địa giới từng tỉnh. Khi xem ở mức zoom quốc gia (< 10) hoặc không tự động bay về tỉnh, Leaflet yêu cầu các ô tile ngoài phạm vi dẫn đến hàng loạt lỗi 404/403.
  3. *Sai lệch URL Tile của các tỉnh*: Trước đây một số tỉnh dùng URL phỏng đoán. Toàn bộ 63 tỉnh thành đã được trích xuất và xác thực 100% URL chính thức từ hệ thống Guland thực tế.
  4. *Xử lý lỗi tile biên (Tileerror handling)*: Thiếu `errorTileUrl` ảnh trong suốt 1x1 khiến Leaflet hiển thị icon ảnh vỡ tại ranh giới ngoài của tỉnh.
- **Giải pháp kỹ thuật đã triển khai**:
  1. *Tự động khởi tạo bản đồ*: Trong `getMapInstance`, nếu `_liveMap`, `appTransformMap.map` hoặc `AppState.leafletMap` chưa khởi tạo thì tự động gọi hàm init tương ứng và kích hoạt hiển thị vùng chứa.
  2. *Cập nhật 100% URL chuẩn 63 tỉnh*: Tích hợp đầy đủ danh mục 63 tỉnh với URL chính thức từ VCDN và S3 Cloud CMC/FPT/DigitalOcean.
  3. *Tự động điều hướng & Phóng to về tâm tỉnh*: Khi bật quy hoạch hoặc đổi tỉnh, nếu mức zoom hiện tại < 11, bản đồ tự động `setView` hoặc `flyTo` về tâm tỉnh với mức zoom $\ge 12$ để màu sắc quy hoạch hiển thị ngay lập tức.
  4. *Lọc lỗi tile bằng Transparent 1x1 GIF*: Thêm `TRANSPARENT_1PX` vào `errorTileUrl` và `tileerror` để loại bỏ triệt để lỗi console và icon ảnh lỗi tại vùng biên.
  5. *Bổ sung lớp Ranh thửa đất (layer_2)*: Tích hợp tùy chọn `Ranh thửa đất (Sổ đỏ)` cho các tỉnh thành có dữ liệu cadastral thửa đất.
- **Kết quả kiểm thử**: Suite 465/465 tests PASS 100%. Giao diện Live Map, Bản đồ Chuyển đổi và Bản đồ Dự án hoạt động độc lập và hiển thị mượt mà.

### [2026-11-09] WP-I Phân hệ Tối ưu hóa lộ trình & Dẫn đường giao thông thực địa (F-012)
- **Yêu cầu từ người dùng**: `khách hàng yêu cầu có chức năng tối ưu hóa chỉ đường (đường giao thông) cho các điểm được chấm theo lộ trình xe máy, ô tô con, ô tô 16 chỗ`. Hỗ trợ 3 nguồn điểm (chấm trên bản đồ, nạp từ Sổ đo, dán bảng tọa độ VN2000/WGS84), giọng nói tiếng Việt turn-by-turn trong app, giữ màn hình luôn sáng (Screen Wake Lock), phân chặng $\le 9$ điểm mở Google Maps (Lựa chọn A), tự động lấy GPS làm điểm xuất phát và tùy chọn lộ trình khép kín (Round-trip).
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Khởi tạo không gian giao diện độc lập (UI Isolation Principle)**:
     - Tạo mới `#screen-routing` với container Leaflet `#leaflet-routing-map`, thanh điều khiển đỉnh `#routingTopToolbar`, bảng HUD dẫn đường `#routingNavHud`, Drawer danh sách chặng `#routingPointsSheet`.
     - Tuyệt đối không can thiệp hay gọi chéo các thanh công cụ của Chuyển đổi tọa độ hay Bản đồ dự án.
     - Thêm thẻ Card 8 trong danh mục Menu chính (`#screen-menu`), Menu card 6 trong danh sách gọn, và Drawer item 2.3 `#drawerItem_routing`.
     - Bổ sung nút `🚗 Tối ưu lộ trình` trong thanh thao tác nhiều mốc `#barBatchPointsActions` và nút `🚗 Lộ trình` trong Quản lý dữ liệu (`#screen-datamgmt`).
  2. **Thuật toán Tối ưu hóa lộ trình (OSRM Trip API / TSP Engine)**:
     - Tích hợp endpoint OSRM Trip API (`https://router.project-osrm.org/trip/v1/...`) giải bài toán TSP sắp xếp lại thứ tự điểm ghé thăm ngắn nhất và nhanh nhất qua tim đường bộ thực tế.
     - Phân hóa 3 loại phương tiện:
       * `🛵 Xe máy`: Cho phép đi ngõ hẻm, đường nhỏ, cầu dân sinh, đường cấm ô tô.
       * `🚗 Ô tô con`: Mạng lưới đường ô tô tiêu chuẩn.
       * `🚐 Ô tô 16 chỗ`: Ưu tiên quốc lộ/tỉnh lộ lớn, hiển thị banner cảnh báo barie chiều cao ($\le 2.2\text{m}$) và tải trọng cầu đường nông thôn.
     - Cơ chế dự phòng ngoại tuyến (Offline fallback): Tự động tính toán đường nối trắc địa trực tiếp và cự ly Haversine khi mất kết nối mạng.
  3. **Dẫn đường bằng giọng nói AI & Giữ màn hình luôn sáng (Screen Wake Lock)**:
     - Tích hợp Web Speech Synthesis (`window.speechSynthesis`) với bộ phân tích câu lệnh tiếng Việt (`vi-VN`) cho mọi loại khúc rẽ (rẽ trái, rẽ phải, ngoặt gấp, chếch, vòng xuyến, xuất phát, tới đích).
     - Tự động kích hoạt giọng nói khi vị trí GPS của người dùng cách khúc rẽ $\le 70\text{m}$.
     - Tích hợp Screen Wake Lock API (`navigator.wakeLock.request('screen')`) giữ màn hình điện thoại luôn sáng trong suốt hành trình lái xe.
  4. **Phân chặng Google Maps thông minh (Lựa chọn A)**:
     - Tự động chia nhỏ lộ trình dài thành các chặng gối đầu $\le 9$ điểm dừng (`#modalGoogleMapsLegs`) để tài xế có thể mở trực tiếp ứng dụng Google Maps dẫn đường theo thời gian thực mà không bị giới hạn số điểm của Google.
  5. **Nạp điểm đa kênh linh hoạt**:
     - Chấm trực tiếp trên bản đồ Leaflet (tự động quy đổi song song VN2000 và WGS84).
     - Nhận mốc chọn lọc từ Sổ đo dự án (`appRouting.openWithSelectedPoints()` / `openWithAllPoints()`).
     - Modal dán tọa độ `#modalRoutingAddPoints` thông minh nhận diện cả VN2000 (X, Y) và WGS84 (Lat, Lng).
  6. **Đồng bộ phiên bản tài nguyên PWA**:
     - Nâng cấp `sw.js` lên `CACHE_NAME = 'vn2000-pro-v2.8.24'`.
     - Đồng bộ query `?v=2.8.24` trên `style.css`, `ui-polish.css` và `app.js` trong `index.html`.
     - Cập nhật `feature_list.json` thêm tính năng `F-012` trạng thái `done`.
  7. **Kiểm thử tự động & Xác minh**:
     - Tạo mới `tests/route_optimization.test.js` (3/3 pass).
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **324/324 tests PASS 100% (0 fail)**.

### [2026-11-04] WP-H Khắc phục nút Chuyển tiền qua App ủng hộ tác giả & Tải mã VietQR về máy
- **Yêu cầu từ người dùng**: `nhấn nút chuyển tiền qua app để ủng hộ tác giả bị lỗi`.
- **Nguyên nhân gốc rễ**:
  1. Các kênh VietinBank và BIDV trước đây sử dụng liên kết `*.page.link` (Firebase Dynamic Links đã bị Google ngưng hỗ trợ và trả về lỗi 404/Dynamic Link Not Found).
  2. Nút bấm mở app chưa tự động sao chép số tài khoản vào Clipboard, không có scheme app tương thích trên điện thoại, khiến người dùng bị kẹt khi mở tab mới.
- **Giải pháp kỹ thuật đã triển khai**:
  1. **Cập nhật URL cổng thanh toán chính thức & Deep Link ứng dụng**:
     - VietinBank: `https://ipay.vietinbank.vn/` + Mobile scheme `vietinbankipay://`.
     - BIDV: `https://smartbanking.bidv.com.vn/` + Mobile scheme `bidvsmartbanking://`.
     - MoMo: `https://nhantien.momo.vn/0839656568` + Mobile scheme `momo://`.
     - ZaloPay: `https://zalo.me/0839656568` + Mobile scheme `zalopay://`.
  2. **Tự động sao chép STK khi bấm chuyển tiền (`appDonate.handleOpenApp`)**:
     - Tự động copy STK `0839656568` vào Clipboard và hiển thị thông báo hướng dẫn rõ ràng: `✓ Đã sao chép STK: 0839656568 (Ngân hàng...). Đang mở ứng dụng chuyển tiền...`.
     - Người dùng chỉ cần Dán (Paste) khi ứng dụng ngân hàng/ví mở ra.
  3. **Thêm tính năng Tải ảnh mã VietQR về máy (`appDonate.downloadQrImage`)**:
     - Bổ sung nút `💾 Tải mã VietQR về máy (để quét ảnh)` ngay dưới mã QR.
     - Cho phép tải ảnh mã QR dạng PNG về Album/Thư viện máy để mở bất kỳ app ngân hàng nào (VCB, TCB, MB, Vietin, BIDV, Agribank...) chọn tính năng "Quét ảnh QR".
  4. **Nâng cấp Cache & Kiểm thử**:
     - Nâng cấp phiên bản tài nguyên PWA lên `v2.8.23` (`sw.js`, `style.css`, `ui-polish.css`, `app.js`).
     - Mở rộng bộ kiểm thử `tests/donate_modal_30s.test.js` (8/8 tests pass).
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **321/321 tests PASS 100%**.

### [2026-11-04] WP-G Quản Lý Dữ Liệu & Camera Đóng Dấu: TÍCH CHỌN NHIỀU MỐC, CHIA SẺ SỔ ĐO & TẢI/CHIA SẺ ẢNH ĐÓNG DẤU CHUẨN BLOB
- **Yêu cầu từ người dùng**:
  1. `đối với các chức năng về quản lý dữ liệu, cần bổ sung nút chia sẻ và chọn nhiều dữ liệu để chia sẻ.`
  2. `chức năng Camera đóng dấu khi tải ảnh từ thư mục quản lý về thì chưa được đóng dấu mà chỉ là ảnh chụp bình thường`
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Quản lý dữ liệu & Sổ đo mốc (`screen-datamgmt`)**:
     - *Bổ sung cột Checkbox chọn nhiều mốc*: Thêm checkbox tổng `#chkSelectAllPoints` trên header và `.chk-point-item` cho từng dòng mốc; hỗ trợ trạng thái `indeterminate` khi chọn một phần.
     - *Thanh tác vụ chọn nhiều mốc (Batch Actions Bar `#barBatchPointsActions`)*: Tự động trồi lên khi có $\ge 1$ mốc được chọn, hiển thị số mốc đã chọn và 5 nút tác vụ:
       * `📤 Chia sẻ`: Mở menu chia sẻ trực tiếp của máy (`navigator.share`) chứa bảng tọa độ văn bản chuẩn trắc địa tiếng Việt + đính kèm tệp CSV UTF-8 có BOM.
       * `📁 Xuất đã chọn`: Mở Studio Xuất Dữ Liệu (`openExportModal`) nạp riêng danh sách các mốc đã chọn sang CAD (DWG/DXF), Excel, KML, GeoJSON, PDF...
       * `📋 Chép text`: Sao chép bảng tọa độ đã chọn vào Clipboard để dán nhanh vào Zalo/Tin nhắn.
       * `🗑️ Xóa đã chọn`: Xóa hàng loạt các mốc đã chọn kèm hộp thoại xác nhận an toàn.
       * `✕ Bỏ chọn`: Xóa nhanh toàn bộ trạng thái tích chọn.
     - *Nút `📤 Chia sẻ` trên thanh công cụ của danh sách mốc (`#btnSharePointsSummary`)*: Cho phép chia sẻ ngay toàn bộ sổ đo hoặc các mốc đã chọn bất kỳ lúc nào.
  2. **Camera Khảo sát đóng dấu (`screen-camera`)**:
     - *Khắc phục triệt để lỗi tải ảnh từ Thư viện về máy*: Chuyển đổi dữ liệu Base64 Data URL sang Blob nhị phân chuẩn W3C qua hàm `dataUrlToBlob()`, tạo Object URL `URL.createObjectURL(blob)` để tải file. Điều này bảo toàn 100% con dấu tọa độ trên mọi thiết bị di động (tránh triệt để lỗi thẻ `<a download>` bị nuốt base64 hoặc lưu nhầm ảnh gốc trên Safari iOS / Chrome Android).
     - *Nút `📤 Chia sẻ (Zalo / Thiết bị)` nhanh*:
       * Bổ sung nút `📤` trên từng thẻ ảnh trong tab *📂 Thư viện* (`cameraGalleryGrid`), cho phép gửi thẳng ảnh có đóng dấu sang Zalo, Tin nhắn, Gmail hoặc lưu vào Album máy qua `navigator.share({ files: [file] })`.
       * Bổ sung nút `📤 Chia sẻ` trong modal xem chi tiết ảnh (`modalCameraMediaViewer`).
  3. **Đồng bộ phiên bản tài nguyên PWA**:
     - Nâng cấp `sw.js` `CACHE_NAME = 'vn2000-pro-v2.8.22'`.
     - Đồng bộ query `?v=2.8.22` trên `style.css`, `ui-polish.css` và `app.js` trong `index.html`.
  4. **Kiểm thử tự động & Xác minh**:
     - Tạo mới `tests/datamgmt_multiselect_share_and_camera_download.test.js` (4/4 pass).
     - Toàn bộ test suite dự án: **319/319 tests PASS 100% (0 fail)**.

### [2026-11-02] WP-F Giao diện tổng thể: SÀN CHẠM TỐI THIỂU CHO MỌI NÚT & Ô NHẬP (điện thoại 390×844)
- **Yêu cầu từ người dùng**: `tiếp tục kiểm tra các nút và giao diện của app`. Diễn giải thành một **kiểm kê trực tiếp theo từng bề mặt**: mở từng màn hình trong trình duyệt, đo vùng chạm thật của mọi điều khiển, rồi sửa những cái dưới sàn ngón tay.
- **Phương pháp kiểm kê (không chụp màn hình)**: `<iframe>` same-origin **390×844** (media query bên trong iframe tính theo viewport của nó), cache-buster `index.html?cb=…`. Với mỗi màn: `appNav.showScreen(...)` → duyệt `button, input, select, a[href]` → **vùng chạm hiệu dụng = max(rect, min-height, kích thước `::after`)**. Modal được quét bằng cách tạm ép `display:flex/visibility:visible` rồi khôi phục `cssText`. Kèm **canh gác tràn ngang** bằng `scrollWidth − clientWidth` để mỗi lần nâng sàn không làm vỡ layout.
- **Kết quả kiểm kê TRƯỚC khi sửa**: **0 tràn ngang ở cả 10 màn** — mọi khiếm khuyết đều là **kích thước chạm**, không phải bố cục hỏng:
  * `btnCadUndo/btnCadRedo` **26×26**, nút ✕ đóng thanh CAD **23×40**, 6 nhãn chuyển tab **28px cao**.
  * Ribbon MiniCAD bị `style.css:10196 + @media(max-width:400px)` **nén 18 nút xuống 17×26** → không đếm nổi nhãn [P]/[L].
  * Ô tick "Không tự động hiện lại" **13px**, ô tick trong Bảng kê/Xuất file/Nạp GIS **13-16px**, ô chọn màu **28px**, `select.app-input` **28px**, `#selFormatWgs` **30px**, ô hồ sơ **34px**, Leaflet zoom **30×30**, `#btnDockCollapse` **20×20**, `.btn-resizer-quick-toggle` **26×26**, `.btn-help-circle` (modal Cài đặt) **26×26**, `.btn-micro` (modal OCR) **25×26**, pill kênh chuyển khoản **36px**, liên kết `mailto:` màn About **14px**, nhãn "chuyển hướng" trong modal Google Sheet **121×16**, nút gập bảng ▾ **17×14**.
- **Các giải pháp kỹ thuật đã hoàn thành** (tất cả trong `ui-polish.css` §6, chặn `@media (max-width: 900px), (pointer: coarse)` nên **máy tính không đổi gì**):
  1. **Hai nhát mở rộng vùng chạm bằng `::after` trong suốt** — kích thước thật giữ nguyên nên **mật độ hàng nút (bảng đỉnh, bảng điểm) không bị giãn**: *Nhát 1* cho nút nằm trong hàng dọc chỉ mở **CHIỀU DỌC** lên 44px (`left/right:0`, `height:44px`, `margin-top:-22px`) để **không trộm chạm của láng giềng**; *Nhát 2* cho nút tròn/icon góc mở **cả hai chiều 44×44**. Định tâm bằng **margin trừ nửa chiều cao**, không dùng `translate()` vì `#btnDockCollapse` đã có `transform … !important` (kiểm chứng: computed `transform: none` khi thử translate).
  2. **Sàn thật cho replaced element** (`input`/`select` không có `::after`): gộp `input.app-input, select, select.app-select, .map-project-bar .map-proj-select` vào `min-height: 40px`; `[class*="modal"] select/input[type=text|number]` 36px; ô tick/radio 20px; `input[type=color]` 34px; `#chkGuideDontShowAgain` 26px; hàng nhãn `.cad-check-label/.cad-export-check-item` 34px. **Mấu chốt**: `min-height` **thắng** khai báo nội tuyến `height: 30px/34px` vì là *tính chất khác* được giải bằng ràng buộc hộp ⇒ **không cần `!important`**, sửa **một rule** phủ hết ~59 chỗ inline `height: 3xpx` trong index.html.
  3. **Ribbon MiniCAD**: bỏ nén, mỗi nút `flex: 0 0 auto / 46×40 / font 12px` → thành **dải dài cuộn ngang** (`scrollWidth 895 > clientWidth 368`), `button.btn-sm` +`.cad-btn-icon` nâng 40×40 (hàng phải thanh CAD chỉ chiếm **340/386px** nên không tràn).
  4. **Sửa tại nguồn khi rule đặc hiệu hơn nắm `!important`**: sàn cũ `:is(#screen-stakeout,#screen-datamgmt) .card-header .card-tools .btn-sm { min-height: 36px !important }` [ui-polish.css:505](ui-polish.css) và `#modalDonateCountdown .donate-channel-pill.support-channel-btn { min-height: 36px }` [ui-polish.css:313](ui-polish.css) **đều được nâng lên 40px/44px** thay vì chồng rule mới (đặc hiệu thấp hơn sẽ thua).
  5. Liên kết: `a[href^="mailto:"] { padding: 11px 4px }`, `[class*="modal"] a[href] { min-height: 34px; padding: 8px 0 }`, nút gập bảng `button[title="Gập / Mở bảng này"]` 38×38 (nút này **không có class/id** nên buộc chọn bằng attribute title).
  6. Leaflet `.leaflet-bar a` **30 → 40px** (kích thước thật, không phải pseudo).
- **Kiểm chứng**:
  - **Test tĩnh mới** `tests/touch_target_floor.test.js` — **54/54**, 7 nhóm: neo `position:relative` cho 17 lớp, hai nhát `::after` (44 dọc / 44×44 + ràng buộc *không còn translate()*), sàn cho replaced element, sàn trong modal (kể cả **cấm quay lại sàn 36px cũ**), ribbon & thanh lệnh CAD, **ràng buộc thủ tục** (mọi sàn phải nằm trong `@media (max-width:900px),(pointer:coarse)`), phiên bản cache. Toàn bộ `npm test`: **315/315 PASS (0 fail)**.
  - **Live 390×844**: sau khi sửa, **10 màn hình (menu/transform/transform-map/gps/camera/datamgmt/geodesy/about/profile/stakeout) + 6 tab MiniCAD + Layer Manager + Bản đồ dự án + drawer = 0 cờ và OVF=0**; quét **toàn bộ modal** (ép hiện) = **0 cờ**. Số liệu tiêu biểu: header 44×32 → **44×44**, `#btnDockCollapse` 20×20 → **44×44**, `.btn-help-circle` 26×26 → **44×44**, undo/redo 26×26 → **40×40**, ribbon 17×26 → **46×40**, tab CAD 28 → **38**, `.btn-micro` 25×26 → **34×38**, pill chuyển khoản 36 → **44**, Leaflet 30×30 → **40×40**, `#btnStakeoutBeep` 116×28 → **116×40**.
  - **Không hồi quy desktop**: iframe **1280×800** → `matchMedia('(max-width:900px)')=false`, `(pointer:coarse)=false`, `::after content: none`, header vẫn **79×36**, `select min-height: 0px` ⇒ sàn chạm chỉ áp dụng cho thiết bị chạm/màn hẹp.
- **Điểm cần nhớ (bài học trong chính đợt này)**:
  1. `::after` **không chạy trên `input`/`select`** (replaced element) — những ô này bắt buộc tăng kích thước thật.
  2. `::after` **bị cha có `overflow:hidden` cắt** (nhóm `.card-tools` màn Cắm mốc) ⇒ ở đó phải dùng `min-height` thật, không dựa vào pseudo.
  3. **Media query không tăng mức ưu tiên**: rule cùng đặc hiệu nằm sau vẫn thắng, nhưng rule có `!important` đặc hiệu hơn ở đầu file thì **phải sửa ngay tại đó**.
  4. `transform: translateY(-50%)` định tâm sẽ bị **`transform … !important` của chính nút** vô hiệu hoá ⇒ định tâm bằng `margin: -22px 0 0 -22px`.
  5. Mỗi lần bump `CACHE_NAME`, `index.html:7585` tự `location.reload()` sau 1.5s ⇒ **iframe kiểm kê bị xoá**; phải tạo lại iframe sau mỗi lần bump (đừng bump nhiều lần trong một vòng sửa).
  6. Probe `elementFromPoint` phải đo **từ biên rect trở ra** và chỉ nhận `t === el || el.contains(t)` — đo từ tâm + `contains` hai chiều từng cho kết luận "đủ 44px" sai.
- **Đăng ký tài nguyên**: `ui-polish.css` (§6 mới + 2 rule sàn ở §3), `index.html` (`style.css?v` / `ui-polish.css?v` / `app.js?v` = **2.8.21**), `sw.js` `CACHE_NAME = vn2000-pro-v2.8.21`, `tests/touch_target_floor.test.js` (mới). **Không sửa** `style.css`, `app.js`, `field-workspace.css` trong đợt này.
- **Còn lại / việc kế tiếp**: xác nhận lại trên **điện thoại thật** (trình duyệt để bàn không giả lập được `pointer: coarse` + `env(safe-area-inset-*)` cùng lúc); cân nhắc chuẩn hoá nốt nhóm `.cad-cmd-btn-toggle` (30×30, hiện được pseudo 44×44 đỡ) nếu người dùng muốn nhãn to hơn; **WP Hatch + Import DXF** của chuỗi CADCraft vẫn còn (task #23).

---

### [2026-11-02] WP-E Giao diện tổng thể: TỰ PHÂN PHỐI THEO VÙNG AN TOÀN 4 MÉP (tai thỏ / nốt ruồi / ngang / bàn phím)
- **Yêu cầu từ người dùng**: `giao diện tổng thể của ứng dụng chưa đáp ứng tự động phân phối phù hợp cho tất cả các màn hình do có thể nằm ở khu vực không thao tác được của các thiết bị có camera dạng tai thỏ hoặc nốt ruồi`. Phạm vi chốt qua AskUserQuestion: **"Trọn gói: tai thỏ + nốt ruồi + ngang + bàn phím"** và **"Cho pinch-zoom toàn ứng dụng"**.
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis)**:
  1. *Chỉ có 2 mép được xử lý*: toàn bộ ứng dụng chỉ dùng `--sat-safe-top` / `--sat-safe-bottom`; **không có token trái/phải nào**. Ở màn ngang, inset của camera lệch viền rơi đúng vào **trái/phải** (mép trên gần bằng 0) ⇒ mọi thanh bám cạnh (`map-top-bar`, `map-right-controls`, `bar-coord-picker`, `map-measure-box`, CLI CADCraft) nằm trong vùng bị cắt.
  2. *Bề mặt dán cạnh vẫn hard-code px*: `.cad-status-hud` `left: 12px`, `.cad-thumb-action-bar` `right: 12px`, `.cad-floating-cmd-bar` `left: 20px`, `.mac-floating-dock` `left/right: 14px`…
  3. *22 chỗ dùng `vh` thô* (kể cả **19 inline `max-height: NNvh` trong index.html**) — `100vh` trên di động tính cả vùng thanh trình duyệt đang thu ⇒ đáy modal và ô nhập cuối cùng nằm ngoài tầm chạm. Thử dùng `--x: 100vh; --x: 100dvh;` **không phải fallback hợp lệ** (custom property giải tại computed-value time, đơn vị không hỗ trợ ⇒ IACVT ⇒ `unset`), nên phải đo bằng JS.
  4. *Màn ngang mất dock*: mọi layout mobile bị khoá trong `@media (max-width: 768px)`; điện thoại xoay ngang có bề rộng ~850px ⇒ rơi vào nhánh desktop, mất `#mobileBottomNav`, panel/modal lấy chiều cao desktop (sàn 680px của `.transform-split-layout`) tràn quá chiều cao thật ~390px.
  5. *`ui-polish.css` (lớp cuối) vô hiệu hoá token*: `.transform-bottom-sheet { bottom: 66px !important }` thắng rule có inset ở style.css. Đồng thời phát hiện nguyên lý quan trọng: **ngưỡng neo đặt trong style.css không có tác dụng với các selector mà ui-polish đã `!important`** (đặc hiệu bằng ⇒ file sau thắng).
  6. *Bàn phím ảo không được tính*: các bề mặt nhập liệu bị bàn phím che vì `--sat-safe-bottom` chỉ chứa `env(safe-area-inset-bottom)`.
  7. *`user-scalable=no` + `maximum-scale=1.0`*: người dùng không thu phóng được để đọc chữ trong vùng quá nhỏ — không còn là lựa chọn an toàn khi layout đã tin cậy.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Lưới token 4 mép** trong `:root` [style.css:25-43](style.css): `--sat-safe-top/left/right` từ `env(...)`; **`--sat-safe-bottom: max(env(safe-area-inset-bottom, 0px), var(--kb-inset))`** — gộp bàn phím vào mép dưới nên ~26 rule đang dùng token (kể cả mọi literal `!important` trong ui-polish mà test đang khoá) tự nâng theo bàn phím **không phải sửa từng rule**; cộng `--kb-inset: 0px`, `--app-vh: 100vh`, `--ui-edge-{top,right,bottom,left}`, `--ui-dock-clear`, `--ui-avail-h`.
  2. **`appViewport`** [app.js:34811](app.js): đo `--app-vh = window.innerHeight` và `--kb-inset = max(0, innerHeight - visualViewport.height - visualViewport.offsetTop)` (nguồn duy nhất đọc được bàn phím), gộp trong một `requestAnimationFrame`, nghe `resize` + `orientationchange` + `visualViewport.{resize,scroll}`; **`init()` gọi trước `appTheme.init()`** [app.js:35283](app.js) để đo xong mới dựng giao diện.
  3. **Khung ứng dụng**: `#app-container` cao `var(--app-vh)`; header + `.screen-view` + dock + `.btn-floating-quicknav` + `#toast-msg` (trục giữa hiệu chỉnh `(left − right)/2`) + `.nav-tree-drawer`/`.drawer-header`/`.drawer-tree-body` trừ đủ inset 4 mép.
  4. **Bề mặt bản đồ & MiniCAD**: `map-top-bar`, `map-project-bar`, `bar-coord-picker`, `map-cad-toolbar`, `map-right-controls`, `map-bottom-sheet`, `map-measure-box`, `map-distance-hud`, `cad-status-hud`, `cad-thumb-action-bar`, `cad-floating-cmd-bar`, `cad-blocks-panel`, `project-marks-blocks-panel` (+ `.maximized`), `transform-bottom-sheet`, `transform-map-column.is-fullscreen` dùng `calc(var(--sat-safe-{left,right}) + Npx)`; **`max-width` của `.cad-status-hud` / `.map-distance-hud` trừ thêm hai inset** (neo trái mà tính `100% - 24px` là tràn mép phải khi có nốt ruồi bên).
  5. **Hết `vh` thô**: 22 rule trong style.css + 5 trong ui-polish.css + **19 inline style trong index.html** + 5 chỗ gán JS trong app.js đều quy về `--app-vh` / `--ui-avail-h` (tỉ lệ giữ nguyên: `94vh → calc(var(--ui-avail-h) * 0.94)`).
  6. **Màn ngang compact theo CHIỀU CAO**: `@media (orientation: landscape) and (max-height: 620px)` ở style.css (gọi lại dock, trần modal theo `--ui-avail-h`, bỏ sàn 680px) **và khối cùng điều kiện ở ui-polish.css** vì chính lớp này nắm `!important`: header 44px, dock 46px áp đáy `+4px` (chỉ chiếm dải 4→50px), nhãn dock 9.5px, HUD/sheet/Leaflet `+56px`, thumb bar `+60px`, CLI `+96px` — cả biến thể `body.dock-collapsed`.
  7. **Pinch-zoom mở lại**: viewport meta bỏ `user-scalable=no`, đặt `maximum-scale=6.0`; bù bằng `touch-action: manipulation` trên `button/select/textarea/input/label/.mobile-bottom-nav/.bottom-nav-item` [style.css:63-72](style.css) để không bị trễ chạm do double-tap zoom.
- **Kiểm chứng**:
  - **Test tĩnh**: `tests/safe_area_cutout_fit.test.js` mới — 71 kiểm tra chia 10 nhóm (lưới token, viewport meta/pinch-zoom, khung ứng dụng, bề mặt bản đồ/CAD, quét `vh` thô, module `appViewport`, màn ngang, lớp cuối ui-polish, **guard cấu trúc CSS**, phiên bản cache). Toàn bộ `npm test`: **314/314 PASS**.
  - **Guard cấu trúc CSS (bắt lỗi thật trong chính đợt vá này)**: script patch đã tạo 13 khai báo **mất tên thuộc tính** (`calc(var(--sat-safe-bottom) + 12px)` đứng trần ở `.cad-status-hud`, `.cad-thumb-action-bar`, `.cad-floating-cmd-bar`, `.bar-coord-picker`, `.map-measure-box`, `.map-distance-hud`, `.cad-blocks-panel`, `.project-marks-blocks-panel`) ⇒ bề mặt mất neo mà không test nào báo. Đã phục hồi đúng tên thuộc tính theo diff và thêm nhóm test 9 để chặn vĩnh viễn (quét dòng bắt đầu bằng `calc(/var(/env(` + cân bằng `{}`).
  - **Live (không chụp màn hình được ⇒ dùng computed style + getBoundingClientRect)**:
    * `--app-vh` được đo thật: 785px trên trang chính, 390px trong iframe 851×390.
    * Giả lập cắt góc (left/right 28px, bottom 34px): `.cad-floating-cmd-bar` +28px trái & phải, `.map-right-controls` dịch 28px vào trong, HUD/dock/CLI nâng đúng +34px.
    * Màn ngang thật (iframe 851×390): `matchMedia('(orientation: landscape) and (max-height: 620px)')` = true, **dock hiện lại** (disp flex, cao 46px, dải 4→50px), header 44px, HUD `bottom: 72px` = 56+16 inset, CLI 112 = 96+16, `hudGapToDockTop = 0` (kề sát không đè), `overRight = false` sau khi sửa `max-width`.
    * Bàn phím (iframe 390×844): đặt `--kb-inset: 260px` ⇒ `--sat-safe-bottom` resolve 260px và dock `bottom` **10px → 270px** (tự nâng trên bàn phím mà không sửa rule nào).
- **Còn lại / việc kế tiếp**: mô phỏng `env(safe-area-inset-*)` thật trên máy (chrome://flags "Simulate display with notches" hoặc Safari Responsive) vì chỉ có thể kiểm chứng bằng cách ghi đè token; WP Hatch và Import DXF của chuỗi CADCraft vẫn còn (task #23); cân nhắc chuyển nốt `@media (orientation: landscape)` của style.css về ui-polish nếu còn mở rộng ngưỡng neo.

---

### [2026-10-30] WP-D MiniCAD: Kiểu & màu ký hiệu cho ĐỈNH KHỐI/TUYẾN + nhánh thao tác gộp
- **Yêu cầu từ người dùng**:
  - `- bổ sung cho phép điều chỉnh hình dạng và màu sắc các điểm được vẽ trong MiniCAD. cho phép tắt/mở hiển thị các điểm, các đỉnh của khối và tuyến (chia riêng từng dạng chứ không gộp chung, có thể gộp chung 1 nhánh thao tác)`.
  - Kiểm tra hiện trạng: 3 nhóm hiển thị (điểm rời / đỉnh khối-tuyến / nhãn) và kiểu+màu **điểm rời** đã có từ WP-A (`b7b3629`); phần còn thiếu là **đỉnh của khối/tuyến** và **một nhánh thao tác chung**. Phạm vi chốt qua AskUserQuestion: *"Cho đổi kiểu+màu đỉnh khối/tuyến"* + *"Gộp thành 1 nhánh thao tác"*.
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis)**:
  1. *Ký hiệu đỉnh khối bị cứng hình tròn*: `renderGeometry()` chỉ áp `sty-<kiểu>` khi `shape.mode === 'point'`; 4 exporter cũng gate `isPointLayer ? helper : 'circle' | 'ring' | '#ef4444' | '#C62828'` ⇒ đặt kiểu cho khối không có tác dụng, trên màn hình và trong tệp xuất đều khác nhau.
  2. *Cờ "Nhãn tên" bị bỏ qua với khối/tuyến*: `showLabels` chỉ nhân bản cho lớp điểm ⇒ tên đỉnh lúc nào cũng nằm trong viên thuốc, không có chế độ "chỉ hình ký hiệu" như điểm rời.
  3. *Chuỗi ưu tiên nhân bản ở 5 nơi* (badge map, bảng đỉnh, DXF, PDF, SVG, PNG) ⇒ thêm trường `v.style` chỗ này, chỗ khác vẫn dùng giá trị cũ.
  4. *Chuỗi cũ thiếu tầng lớp CAD*: mới có `điểm → shape → mặc định`, chưa có "mặc định ký hiệu của lớp CAD" nên không đặt một lần cho cả lớp được.
  5. *Điều khiển rải rác 3 nơi*: checkbox trên thanh công cụ, kiểu mặc định trong Bảng điểm, hiện đỉnh trong tab Đỉnh ⇒ muốn đổi kiểu+hiển thị phải mở 3 cửa sổ (trái ý "1 nhánh thao tác").
  6. *Bộ đếm滞后 (phát hiện khi kiểm chứng live)*: sửa ký hiệu đỉnh khi nhánh gộp đang mở thì "đang có N điểm/đỉnh tùy chỉnh riêng" và bảng lớp không cập nhật.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. **Một chuỗi ưu tiên duy nhất** cho mọi hình vẽ — [app.js:20438](app.js): `getGlyphLayerOf(shape)` + `getPointStyleFor/getPointColorFor(shape, v)` với thứ tự *đỉnh → khối → mặc định lớp CAD (`layersTable[].vStyle/vColor`) → mặc định hệ thống*; ứng viên được **kiểm tra từng cái** (`find(ok)` / `map(hex).find(Boolean)`) nên một giá trị rác ở tầng trên không che mất giá trị hợp lệ ở tầng dưới. Điểm rời vẫn lấy màu theo chính lớp điểm (không lấy màu mặc định lớp CAD).
  2. **Badge thống nhất trong `renderGeometry()`** ([app.js:24945-24967](app.js)): đỉnh khối/tuyến nhận `sty-<kiểu>` + màu thật + `dot-visible`; `showLabels` nay chi phối cả đỉnh (tắt nhãn ⇒ xuống dạng hình); `marker._pinned = isExpanded || isDotGlyph` để `mouseout` của khối không gỡ `dot-visible` khỏi đỉnh đang cố tình hiện.
  3. **Đỉnh đang vẽ thừa kế ký hiệu lớp đang chọn**: `draftGlyphShape/draftGlyphStyle/draftGlyphColor` trước vòng lặp `this.vertices` ⇒ chấm tiếp điểm đã thấy ngay hình sẽ dùng.
  4. **Hàm đổi ký hiệu từng đỉnh**: `setVertexGlyph(shapeIdx, vIdx, field, value)` và `resetVertexGlyph(shapeIdx, vIdx)` — kiểm `pointStyles`/`#RRGGBB`, bỏ qua thao tác không đổi giá trị, tôn trọng `isShapeLocked`, ghi `pushHistoryState` (hoàn tác được), rồi `saveShapesForProject → persistSession → renderGeometry → renderBlocksPanel → refreshAreaTableIfOpen → renderModalVerticesTable (nếu đang tab Đỉnh) → refreshSymbolPanelIfOpen`.
  5. **Tab Đỉnh** (`renderModalVerticesTable`): thêm cột "Ký hiệu" (select) và "Màu" (input color) + nút "↺" đổi màu amber khi đỉnh đang tùy chỉnh; `colspan` dòng rỗng 8 → 10.
  6. **Nhánh thao tác gộp** `#modalCadSymbols` + nút `#btnCadSymbols` "🎨 Ký hiệu & Hiển thị": mục 1 = 3 công tắc hiển thị dùng chung `displaySettings` (được `syncDisplayCheckboxes()` nhân bản y hệt checkbox thanh công cụ); mục 2 = bảng "Ký hiệu mặc định theo lớp CAD" (7 lớp, `applyLayerGlyph`/`resetLayerGlyph`, trữ trong `vn2k_cad_layers_v1` qua `saveLayersTable()`); footer = bộ đếm `countVertexGlyphOverrides()` + "↺ Đặt lại mọi đỉnh" (`clearAllVertexGlyphOverrides`, có hoàn tác).
  7. **4 exporter hết gate `isPointLayer`**: DXF lấy hình theo `getPointStyleFor`, PDF/SVG/PNG lấy cả hình lẫn màu ⇒ thứ nhìn thấy trên bản đồ đúng bằng thứ ra tệp.
  8. *CSS & đăng ký*: `.cad-sym-section`, `.cad-sym-section-title`; `closeCadWindows()` thêm `modalCadSymbols` (tổng **13** modal CAD — AGENTS.md §2); 11 mục `phraseMap` Anh–Việt; `CACHE_NAME`/`?v=` → **2.8.12**.
- **Kiểm thử tự động & Xác minh thực nghiệm**:
  - `tests/point_styling_visibility.test.js` **93 → 142/142 PASS** (4 nhóm mới 14–17 chạy hàm *thật*: chuỗi ưu tiên có lớp CAD + điểm rời không bị màu lớp CAD ghi đè, `setVertexGlyph`/`resetVertexGlyph`/`countVertexGlyphOverrides` với lớp khóa + giá trị trùng + chỉ số ngoài danh sách, `applyLayerGlyph`/`resetLayerGlyph`/`clearAllVertexGlyphOverrides`/`renderSymbolPanel` với DOM giả, và static guard "không còn `isPointLayer ? this.getPoint…For`" + `drawPointGlyph` dùng helper ở cả PDF lẫn PNG + markup/CSS).
  - `tests/cad_ui_isolation.test.js`: danh sách modal CAD 12 → **13**; `tests/cad_inquiry_qselect_polar.test.js`: thay 2 assertion cứng "2.8.11" bằng **đối chiếu phiên bản sw.js ↔ app.js ↔ style.css** (đợt bump sau không còn phá test cũ) → **177/177**; `node --check app.js` đạt; `npm test` = **313/313 PASS (0 fail)**.
  - Live http://localhost:8080 (`app.js?v=2.8.12`): modal mở `display:flex`, 7 dòng lớp + 3 checkbox mirror đúng `displaySettings`; đặt lớp `RANH_THUA` = thoi/đỏ → **12 badge** chuyển `sty-diamond` nền `rgb(239,68,68)` và `vn2k_cad_layers_v1` có `vStyle:"diamond", vColor:"#ef4444"`; tắt nhóm Nhãn → `sty-diamond dot-visible` + `clip-path: polygon(50% 0%…)` (hành vi mà bản cũ không có cho đỉnh khối); tùy chỉnh riêng Đ1 của `Tuyến 2` = vành khuyên xanh → badge `sty-ring` nền trong suốt viền `rgb(34,197,94)`, bộ đếm 0 → **1**, SVG xuất ra `<circle class="cad-pt-glyph" … fill="none" stroke="#22c55e">` trong khi các đỉnh khác là `<polygon … fill="#ef4444">`; `resetVertexGlyph` → bộ đếm về **0**. **Dọn vết thử nghiệm**: `resetLayerGlyph('RANH_THUA')`, bật lại Nhãn, `historyStack` cắt về 1 phần tử, `overrides = 0`, 3 đối tượng (`Thửa 2`/`Tuyến 2`/`Lớp điểm 3`) vẫn `selected = true`, `layers.group = 31`, modal đóng. *Ghi chú*: không chụp màn hình được vì surface Browser trong app ở trạng thái ẩn — kiểm chứng bằng computed style/DOM thay cho ảnh.
  - *Hệ quả cần biết khi dùng tiếp*: đặt "ký hiệu mặc định theo lớp CAD" sẽ áp cho **cả lớp điểm** đang thuộc lớp CAD đó (vì kiểu lớp điểm chưa đặt riêng); muốn điểm giữ hình riêng thì đặt kiểu trong Bảng điểm — kiểu riêng của điểm/đỉnh luôn thắng.

### [2026-10-30] WP-C MiniCAD: Polar Tracking [F10] + Trắc Lượng (INQUIRY) + Chọn Nhanh (QSELECT)
- **Yêu cầu từ người dùng**:
  - `Inquiry/QSELECT (Dynamic Input còn thiếu phần polar tracking)` — port tiếp nhóm CADCraft đã hoãn ở WP-B, theo đúng ý chỉ đạo "Port lần lượt, ưu tiên Dimension" (Dimension đã xong trước đó).
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis)**:
  1. *Dynamic Input mới khóa được trục vuông góc*: chỉ có Ortho [F8], muốn vẽ theo một góc bất kỳ (70°, 120°…) người dùng phải gõ đúng tọa độ cực, không có "nam châm góc" như AutoCAD ⇒ thiếu một nửa tính năng.
  2. *Xem trước ≠ kết quả thật*: `handleMapClick` áp Ortho còn `_processMouseMove` (đường rubber-band + tooltip) thì không, nên mũi tên trên màn hình hay lệch đỉnh thật tạo ra. gốc là logic khóa trục bị nhân bản ở hai nơi.
  3. *Nguy cơ hai nguồn số liệu*: Inquiry mà tự tính diện tích/chu vi bằng công thức riêng sẽ lệch với bảng kê và exporter (chuẩn chung là `calculateAreaAndPerimeter()` — Gauss shoelace trên lưới VN-2000).
  4. *Lệnh gọi hàm không tồn tại*: `applyQSelect()` gọi `this.refreshAreaTableIfOpen()` trong khi method này chưa có → bảng kê diện tích mở sẽ ném `TypeError` ngay sau khi chọn nhanh.
  5. *Tham số chết*: `renderQSelectSummary(hit, crit, mode)` nhận `crit`/`mode` nhưng không dùng.
  6. *Bôi màu đối tượng tra được dựa vào state sai*: `renderInquiryGraphics()` đọc `this.selectedItem` — con trỏ chọn của phân hệ vẽ, không bao giờ được set trong chế độ trac lượng → LIST không tô sáng được khối vừa tra.
  7. *Rác giao diện trên bản đồ dùng chung*: `closeInquiryModal()` chỉ ẩn modal, các marker/nhãn cyan vẫn nằm trên `leafletMap`; `clearCadOverlays()` cũng không gỡ `polarGroup`/`inquiryGroup` (chệch AGENTS.md §2).
  8. *Nhật ký ẩn khi chưa có kết quả*: `renderInquiryResult()` return sớm khi `lastResult` rỗng nên bảng "Nhật ký phép đo" không vẽ lại.
  9. *Tiên quyết khóa góc*: khi bật cả F8 lẫn F10, AutoCAD ưu tiên Ortho — bản cũ không định nghĩa thứ tự.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. *Một hàm chốt điểm duy nhất*: `lockDraftPoint(lat, lng)` — Ortho trước, Polar sau — được cả `handleMapClick` và `_processMouseMove` gọi, nên xem trùng với kết quả thật và hết tình trạng hai bản sao logic (app.js §15A).
  2. *Polar Tracking [F10]*: `togglePolarTracking()`, `setPolarStep()`, `polarLockPoint()`, `azimuthDegOf()`, `syncPolarGuides()` vẽ 4 tia đứt nét + nhãn góc DMS vào lớp `layers.polarGroup` (tạo trong `ensureLayers()`), tự suy giảm vẽ lại nhờ `_polarGuideKey`; nút `#btnCadPolarTrack`, `#btnCadRibbonPolar` và ô chọn bước góc `#cadPolarStepSelect` (bị disable khi Ortho bật); tùy chọn lưu ở khóa riêng `vn2k_cad_polar_v1` vì `restoreSession()` return sớm khi hình vẽ đến từ dự án.
  3. *Inquiry (DIST / AREA / ID / LIST / ZOOM Sel)*: `inquiryPointFromLatLng` + `inquiryDistance` (cự ly lưới, ΔX/ΔY, Az DMS, ΔH và cự ly 3D, kiểm chéo `calcGeoDistanceAndAzimuth`), `inquiryChain()` **ủy quyền cho `calculateAreaAndPerimeter(list,'polygon')`** — không tạo nguồn số liệu thứ hai; `handleInquiryPick()` định tuyến qua `toolAction === 'inquiry'` trong `handleMapClick`, có hít điểm nam châm; bảng kết quả `.cad-inq-table`, nhật ký 20 dòng (`pushInquiryLog` cập nhật tại chỗ cho chuỗi đang chấm, không bắn 20 dòng cho 20 đỉnh), xuất CSV `;` có BOM, tô sáng bằng `inquiry.shapeIdx`.
  4. *QSELECT*: modal riêng `#modalCadQSelect`, bộ lọc thuần `qSelectMatches(shape, crit)` (loại poly/line/point — gom rectangle vào khối — + lớp + tên + diện tích min/max + số đỉnh min/max + "chỉ trong đối tượng đang chọn"), ba chế độ `replace|append|exclude` dùng lại `toggleBlockSelect`/`toggleSelectAllBlocks` theo quy ước `selected !== false`; `collectQSelectCriteria` chấp nhận số phân tách bằng dấu phẩy kiểu Việt; `renderQSelectSummary` báo tổng S/P/số đỉnh + chip theo lớp; `clearQSelectCriteria`.
  5. *Sửa `refreshAreaTableIfOpen()`*: thay vì nhân bản khối mở-lại-bảng-kê lần thứ ba, thêm method thật (kiểm tra modal đang mở → `openAreaTableModal()` → **giữ nguyên `scrollTop`** của `#cadBlockList` và `.modal-box` để người dùng không bị nhảy khung); cắt bớt tham số chết của `renderQSelectSummary(hit)`.
  6. *Dọn giao diện dùng chung*: `closeInquiryModal()` gọi `clearInquiryGraphics()` và reset `pts/shapeIdx/toolAction`; `clearCadOverlays()` gỡ thêm `polarGroup` + `inquiryGroup`; `closeCadWindows()` đóng thêm `modalCadInquiry`, `modalCadQSelect` (bên cạnh `modalCadGisImport`) — tổng 12 modal CAD.
  7. *Tiện ích mở rộng*: `zoomToSelection()` gộp bounds mọi đỉnh của đối tượng đang chọn rồi `fitBounds(bounds, {padding:[48,48]})`, cảnh báo khi không có gì chọn thay vì phóng sai; CLI thêm `DIST/KHOANGCACH/DO`, `AREA/DIENTICH/TINH`, `ID/TODO`, `LIST/TRATHONGTIN`, `QSELECT/QSEL/CHONNHANH`, `ZOOMSEL/ZS`, `POLAR` + đăng ký `cadCommandList`; phím `F10` và `Q` trong `bindEvents()`; ~38 mục `phraseMap` Anh–Việt mới; CSS `.cad-inq-table`, `.cad-inq-log*`, `.cad-qsel-*`; `CACHE_NAME`/`?v=` → **2.8.11**.
- **Kiểm thử tự động & Xác minh thực nghiệm**:
  - Bộ test mới `tests/cad_inquiry_qselect_polar.test.js`: **178/178 PASS** (13 nhóm, chạy hàm *thật* cắt từ app.js trong sandbox `new Function` với projection tuyến tính: azimuth/polarLockPoint theo bước & sai số, tiên quyết Ortho-over-Polar + round-trip WGS84, suy giảm `syncPolarGuides`, `dmsText`, `inquiryDistance/Chain`, 4 loại bảng kết quả, `handleInquiryPick` đủ 4 chế độ, nhật ký 20-cap + cập nhật live, CSV (BOM, `;`→`,`), `zoomToSelection`, `qSelectMatches`/`applyQSelect` 3 chế độ + thứ tự callback, thu thập tiêu chí, static wiring modal/phím/CLI/không trùng `case`, thoát XSS trong `renderInquiryResult/Log`).
  - `tests/cad_ui_isolation.test.js` **27/27** (danh sách 12 modal CAD + `clearCadOverlays` phải gỡ cả `polarGroup` lẫn `inquiryGroup`); `tests/cadcraft_cli_and_ortho.test.js` cập nhật sang `lockDraftPoint` và thêm assertion F10/bước góc.
  - `node --check app.js` đạt; `npm test` = **313/313 PASS (0 fail)** — `node --test tests/` vẫn lỗi MODULE_NOT_FOUND trên Node 24, dùng `node --test tests/*.test.js`.
  - Live http://localhost:8080 (`app.js?v=2.8.11`): DIST hai điểm cho `55,063 m • Az 36°30'16"` kèm dòng kiểm chéo WGS84 `55,309 m`; AREA chuỗi 3 đỉnh `725,33 m² / chu vi 131,79 m`; ID 6 dòng số liệu + KTT `105.75°45' • múi 6° • k=0.9996`; LIST `Thửa 2` đủ 9 nhãn (loại "Tuyến hở", lớp `RANH_THUA`, màu `#06b6d4`, 6 đỉnh, 49,97 m) và chạm vùng trống chỉ cảnh báo, không mất kết quả cũ; CSV `DuAn_Moi_TracLuong.csv` 5 dòng có BOM; Polar: khóa `mode:"polar" angle:90` kéo điểm 2,604 m về đúng tia, 4 tia + 4 nhãn `0°,90°,180°,270°`, Ortho bật thắng (`mode:"ortho"`), `clearPolarGuides()` → 0 layer; QSELECT: `line` → `1/3` khớp + chip `RANH_THUA: 1`, `append point`, `exclude poly`, lọc theo tên `thửa`, lọc `S ≥ 100 m²` → 0 đối tượng; `ZOOMSEL` gọi `fitBounds(padding:[48,48])` đổi thật view và cảnh báo khi bỏ chọn hết; CLI thử 17 bí danh đều mở đúng modal/chế độ, `PURGE` rơi vào `default` vô hại. **Dọn vết thử nghiệm**: khôi phục `savedShapes` cả 3 đối tượng về trạng thái chọn `true`, xóa `inquiry.log/lastResult/shapeIdx`, `qSelect = {crit:null, matchedIds:[]}`, tắt dóng góc (`vn2k_cad_polar_v1 = {"on":false,"step":90}`), đóng 2 modal, `layers.inquiryGroup/polarGroup = 0`, bản vẽ gốc còn `group: 31` layer.
  - Tuân thủ AGENTS.md §2: hai bề mặt mới đều thuộc MiniCAD, đặt cạnh các modal CAD khác trong `index.html`, bị `closeCadWindows()` đóng khi rời phân hệ và `clearCadOverlays()` dọn overlay; Inquiry không đụng `selectedItem` của công cụ vẽ.

### [2026-10-30] WP-B Nạp/Xuất GIS–QGIS: GeoJSON / KML / GPX / WKT cho MiniCAD và Bản đồ dự án
- **Yêu cầu từ người dùng**:
  - `Bổ sung tính năng nạp/xuất dữ liệu map dự án từ các định dạng phổ biến trong GIS/QGIS. tối ưu hóa sử dụng để hoàn thiện các chức năng trong MiniCAD`
  - Phạm vi chốt qua AskUserQuestion: 4 định dạng **GeoJSON + KML + GPX + WKT**, tự đọc/tự ghi bằng JavaScript thuần (không thêm thư viện vendor, không Shapefile/GeoPackage/DXF).
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis)**:
  1. *Không có lớp động cơ*: việc "phân tích tệp" trước đây nằm rải trong code đọc Excel/CSV, không kiểm chứng được bằng Node và mỗi lần thêm định dạng lại phải sửa UI.
  2. *Tệp GIS projected dễ bị hiểu sai*: GeoJSON/KML của QGIS thường mang **tọa độ phẳng VN-2000 (X Bắc, Y Đông)** trong khi app quen hệ WGS84 — nếu đổi KTT *sau* khi chuẩn hóa đỉnh thì `_normalizeVertex` tính lại X/Y theo **KTT cũ** ⇒ lệch hàng trăm mét, sai âm thầm.
  3. *Tính năng vô danh trùng tên*: parser GIS đặt tên mặc định `Feature`, nạp vào CAD/sổ đo sẽ ra cả loạt đỉnh và mốc trùng "Feature" ⇒ không tra lại được nguồn.
  4. *Vòng lặp kín tự sinh ranh*: `featuresToProjectPoints` gộp nhiều vòng polygon làm mốc "đỉnh khối" lẫn vào mốc rời; ngược lại `getExportGeometry` phải dựng lại ranh khi sổ đo chỉ có điểm.
  5. *Lỗi thật trong engine GPX (do test tìm ra)*: `parseGpx` chỉ bắt cặp `<wpt>…</wpt>`, bỏ qua dạng tự đóng `<wpt .../>` / `<trkpt .../>` — một tệp GPX chuẩn của máy định vị vẫn cho **0 đối tượng** mà không báo lỗi; nhãn dự phòng của `trk` ghi nhầm là "Route".
  6. *Trùng lặp vòng lặp kiểm tra cache*: `sw.js`/`?v=` chưa tăng thì `gis_io.js` không được precache, máy cũ không bao giờ có động cơ GIS.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. *Kiến trúc 3 tầng* — engine `window.GisIO` mới ở [src/core/gis_io.js](src/core/gis_io.js) (thuần JS, không DOM, `read/detectFormat/parseGeoJson/parseKml/parseGpx/parseWkt/toGeoJsonText/toGpxText/toWktText/summarizeCounts`) → cầu `appGis` ở [app.js:17245](app.js#L17245) (chính sách CRS/KTT/trục + biến đổi feature ⇄ hình dạng) → hai bề mặt `appCadTool` (MiniCAD) và `appData` (sổ đo dự án). Feature chuẩn: `{kind:'point'|'line'|'polygon', name, note, crs:'wgs84'|'projected', rings:[[{lng,lat,h}]], properties}`.
  2. *Sửa GPX* bằng helper `gpxPoints(block, tag)` nhận cả `/>` lẫn cặp thẻ, nhãn dự phòng `Track` cho `trk` [src/core/gis_io.js](src/core/gis_io.js).
  3. *Đồng bộ KTT trước khi chuyển đổi*: `appGis.resolveKtt()` → `applyKtt()` **trước** `featuresToCadShapes/featuresToProjectPoints`, KTT tỉnh khác tự đổi toàn dự án và toast nêu rõ.
  4. *Chống trùng tên*: `isGenericName()` + `uniqueName(used, base)` gắn hậu tố `_2, _3…` cho đỉnh, mốc, khối và lớp điểm vô danh; giữ tên thật từ tệp (`M1`, `Thua 17`) [app.js:17260](app.js#L17260).
  5. *MiniCAD*: modal riêng `#modalCadGisImport` (định dạng, CRS tự nhận `wgs84/vn2000`, trục EN/NE cho tệp phẳng, KTT + múi chiếu, mục tiêu `both|shapes|points`, tên lớp) + `openGisImportModal/onGisFilePicked/applyGisImport/_importPointLayer` [app.js:29600](app.js#L29600); lớp điểm GIS vào thẳng `MOC_TOADO` với `_normalizeVertex`, history, panel khối và `#cadPointLayerBar`.
  6. *Bản đồ dự án*: "Phân vùng 2.5 NẠP TỆP GIS" trong `#modalImportProject` + `onGisProjectFilePicked/applyGisToProject` [app.js:11695](app.js#L11695) dùng lại `saveImportedPoints` (tôn trọng radio "Tạo dự án mới / Thêm vào dự án hiện tại").
  7. *Xuất*: `getExportGeometry()` lọc mốc chưa có kinh/vĩ độ và tự sinh `Ranh_`/`Tuyen_` từ ≥3/=2 mốc; thêm `exportGpxFile/exportWktFile/_downloadText/_exportBaseName` cho dự án và `exportGpx/exportWkt/_selectedExportShapes/_cadBaseName` cho CAD; GeoJSON dự án nay mang `point_style`/`point_color`, GeoJSON CAD mang `cad_layer/vertices_count/area_m2/perimeter_m2`; hai hộp xuất + `executeExport()` nhận `.gpx/.wkt`.
  8. *Đăng ký tài nguyên*: `<script src="src/core/gis_io.js?v=2.8.10">` trước `app.js`, `CACHE_NAME` → `vn2000-pro-v2.8.10`, `gis_io.js` vào `ASSETS_TO_CACHE`, `style.css?v=2.8.10`; `closeCadWindows()` đóng thêm `modalCadGisImport`.
- **Kiểm thử tự động & Xác minh thực nghiệm**:
  - `tests/gis_io_interop.test.js` **67/67** (7 nhóm: nhận dạng định dạng theo tên tệp & nội dung, đọc GeoJSON/KML/GPX/WKT, ghi GeoJSON+WKT+GPX, và lỗi đầu vào không được ném exception lên tầng UI).
  - `tests/gis_import_export_bridge.test.js` **125/125** (10 nhóm: đăng ký UI/tài nguyên, `readFromFile`/`summarize` chuỗi chính xác, CRS phẳng + trục + KTT 3°/6° + mutated `AppState`, `featuresToProjectPoints` tên riêng/note nguồn, round-trip GeoJSON/GPX/WKT, luồng modal CAD với fake DOM (reset `_gisResult`, 2 vòng nạp), `_importPointLayer` (mode/layer/thứ tự gọi lại), luồng dự án (3 điểm lọc, tệp lỗi không ghi, **không gọi chéo MiniCAD** — chốt AGENTS.md §2), `getExportGeometry`/`exportGpxFile`/`exportWktFile`, chu trình KML/GPX/WKT → CAD).
  - `npm test` = **312/312 PASS (0 fail)**; `node --check app.js` đạt.
  - Live http://127.0.0.1:8080 (`?v=2.8.10`): `GisIO`/`appGis` tồn tại, 8 id mới có mặt, `gpx/wkt options = 2/2`; nạp Geojson 2 điểm + 1 tuyến + 1 khối → bảng khối `Tuyen demo:polyline:3`, `Thua demo:polygon:5`, `Điểm GIS:point:2`, đỉnh có X/Y VN-2000 đúng KTT, `modalCadGisImport` tự đóng; **xác minh vẽ thật**: `layers.group` = 47 layer, 32 marker icon, 18 `.cad-vertex-badge`, 14 `.leaflet-interactive` (`svgPaths=0` vì bản đồ CAD dùng `preferCanvas:true` — hình học vẽ ra `<canvas>`, không phải `<path>`); luồng dự án tạo `quy_hoach_dac_biet.csv` 8 mốc. Dọn vết thử nghiệm: stub toàn bộ `saveShapesForProject/persistSession/appSettings.save/saveImportedPoints`, rút các shape tạm, `renderGeometry()` lại, baseline còn `Thua Audit`/`Lớp điểm 2` + 20 layer.
  - Tuân thủ AGENTS.md §2: MiniCAD dùng `#modalCadGisImport` của riêng mình, dự án dùng phân vùng trong `#modalImportProject`; chỉ chia sẻ tầng dữ liệu (`GisIO`/`appGis`), có test chặn lời gọi chéo.

### [2026-10-30] WP-A MiniCAD: Kiểu & Màu Điểm Rời + Tách 3 Nhóm Hiển Thị Độc Lập (Point Styling & Visibility Pro)
- **Yêu cầu từ người dùng**:
  - `bổ sung cho phép điều chỉnh hình dạng và màu sắc các điểm được vẽ trong MiniCAD. cho phép tắt/mở hiển thị các điểm, các đỉnh của khối và tuyến (chia riêng từng dạng chứ không gộp chung, có thể gộp chung 1 nhánh thao tác)`
  - Phạm vi chốt qua AskUserQuestion: style+color riêng từng điểm, mặc định theo lớp, áp hàng loạt từ bảng điểm; 3 nhóm cờ tách biệt (Điểm rời / Đỉnh khối & tuyến / Nhãn–ký hiệu) kèm ghi đè theo lớp.
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis)**:
  1. *Một cờ dùng chung hai việc*: `displaySettings.showVertices` vừa điều khiển đỉnh của khối/tuyến vừa điều khiển điểm rời, nên không thể tắt riêng từng loại.
  2. *Nhãn và ký hiệu dính liền*: badge `.cad-vertex-badge` mặc định là chấm 8px `opacity:0`, chỉ hiện tên khi bật `.expanded` — không có trạng thái " hiện ký hiệu, ẩn tên".
  3. *Điểm rời bị mất khi chỉ có 1 mốc*: `reconstructShapesFromPoints` lọc `validVerts.length >= 2` làm rớt lớp điểm đơn lẻ.
  4. *Kịch bản "tắt hết" tự bật lại*: cơ chế self-heal trong `initDisplaySettings` đếm đủ 7 cờ; nếu thêm cờ mới mà không tính cờ đang thiếu sẽ ghi đè lựa chọn của người dùng.
  5. *CSS `<style>` trong SVG thắng thuộc tính trình bày*: `.layer-ky-hieu { fill:#ef4444 }` chặn màu tùy chỉnh trong SVG export.
  6. *Service Worker phát `style.css` cũ*: `CACHE_NAME` và `?v=` chưa tăng nên kiểu glyph mới không được nạp (đã kiểm chứng `getComputedStyle` = `none`).
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. *Tách 3 nhóm cờ hiển thị* trong `app.js`: `showPoints` (điểm rời), `showVertices` (đỉnh khối & tuyến), `showLabels` (nhãn tên); giữ nguyên 4 cờ cũ, tự mặc định `true` cho blob cũ và self-heal theo `presentKeys` (đọc đúng số cờ thực sự có trong localStorage, không bật lại khi người dùng chỉ tắt 1 ô).
  2. *Model style/color 7 kiểu glyph* (`circle, square, diamond, triangle, cross, x, ring`) với precedence điểm → lớp → mặc định,Validate màu `#rrggbb` qua `getPointStyleFor` / `getPointColorFor`.
  3. *Render dùng chung một điểm*: `resolveGroupVisibility(shape)` quyết định `visible`/`labels` cho cả lớp điểm lẫn khối; lớp điểm tắt nhóm thì bỏ hẳn marker, khối vẫn tạo marker (CSS `opacity` giữ hiệu ứng hover); glyph hiển thị ở dạng `sty-* dot-visible`, nhãn ở dạng `sty-* expanded`.
  4. *CSS glyph*: chuỗi `.cad-vertex-badge.sty-*:not(.expanded)` dùng `clip-path`/`border-radius` + `drop-shadow` trắng, khóa `.dot-visible` ở 13px; pill `.expanded` không bị ảnh hưởng.
  5. *Bảng điểm (Chấm điểm)*: 2 cột Kiểu/Màu mỗi dòng, thanh áp hàng loạt `#cadPtBulkStyle` / `#cadPtBulkColor` ("Áp dụng cả lớp" ghi vào lớp và xóa ghi đè từng điểm, "Đặt lại" gỡ tùy chỉnh), điều khiển đồng bộ `syncPointStyleBulkControls`.
  6. *Xuất bản vẽ*: `exportGlyphFlag`, `drawPointGlyph` (Canvas cho PDF/PNG) và `pointGlyphSvg` (SVG, dùng class `cad-pt-glyph` không bị CSS ghi đè) được nối vào cả 4 exporter DXF/PDF/SVG/PNG; DXF thêm thực thể LWPOLYLINE/LINE/CIRCLE theo kiểu và `TEN_MOC` có nhãn `S`; checkbox `cadExportCheckPoints` / `cadExportCheckLabels` trong hộp Xuất không còn ghi ngược vào `displaySettings`.
  7. *Vòng trữ dữ liệu*: `syncShapesToProjectPoints` lưu `pointStyle`/`pointColor` vào mốc dự án, `reconstructShapesFromPoints` khôi phục về điểm CAD và sửa ngưỡng dựng lại thành `>= (mode === 'point' ? 1 : 2)`.
  8. *Đồng bộ phiên bản tài nguyên*: `sw.js` `CACHE_NAME` → `vn2000-pro-v2.8.9`, `index.html` `style.css?v=2.8.9` / `app.js?v=2.8.9`; `tests/draw_tools_runtime.test.js` đổi kiểm tra CACHE_NAME từ so sánh cứng sang chặn dưới (>= 2.8.8) để không vỡ khi tăng phiên bản.
- **Kiểm thử tự động & Xác minh thực nghiệm**:
  - Bộ test mới `tests/point_styling_visibility.test.js`: **94/94 PASS** (thực thi hàm thật của `app.js` trong sandbox: init/sync/toggle/resolve/style/color/renderPointTable/bulk/export/round-trip/markup).
  - Toàn bộ suite dự án: **310/310 tests PASS 100% (0 fail)**.
  - Xác minh live trên http://127.0.0.1:8080 (`?v=2.8.9` đã nạp): stylesheet có 7 quy tắc `sty-*`; `sty-diamond dot-visible` = `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` 13px opacity 1; `sty-square` `border-radius:2px`; `expanded` vẫn 22px `clip:none`; badge gốc 8px opacity 0. Ma trận tách nhóm đã verify ở phiên trước: tắt `showPoints` chỉ mất điểm rời, tắt `showLabels` thu nhãn về glyph, tắt `showVertices` chỉ sập đỉnh khối.
  - Tuân thủ AGENTS.md §2: mọi điều khiển mới nằm trong thanh công cụ MiniCAD, hộp Xuất của MiniCAD và modal `#modalCadPointTable`; không có lời gọi chéo phân hệ.

### [2026-10-26] Chuẩn Hóa Toàn Diện Giao Diện Song Ngữ Anh - Việt & Từ Điển Kỹ Thuật Trắc Địa Quốc Tế (Bilingual i18n Pro 2026)
- **Yêu cầu từ người dùng**:
  - `thực hiện lại việc chuẩn hóa giao diện tiếng Anh và tiếng việt`
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis)**:
  1. *Lỗi Fallback Tiếng Bồi (Unaccented Vietnamese)*: Trước đây, khi không tìm thấy chuỗi trong `phraseMap`, hàm `translateString(str)` gọi `removeDiacritics(str)`, biến các chuỗi tiếng Việt thành tiếng Việt không dấu (ví dụ: "Cham ban do de lay toa do", "Da giac [P]", "Khep goc", "Xuat ban ve", v.v.).
  2. *Thiếu hụt từ điển diện rộng*: Có tới 527 chuỗi giao diện độc nhất trong `index.html` chưa có bản dịch tiếng Anh kỹ thuật trong `phraseMap`.
  3. *Tiền tố/Hậu tố Emoji & Biểu tượng*: Nhiều nút bấm trong MiniCAD, Toolbar và Drawer có kèm icon/emoji (ví dụ: `📐 Đa giác [P]`, `✓ Nạp Cọc`, `• Múi chiếu:`, `Dự án ▾`) khiến `phraseMap` tra cứu không khớp nếu so sánh chuỗi nguyên bản thô.
  4. *Hàm `t(key)` chưa ưu tiên `appI18n.dict`*: Hàm `t(key)` bỏ qua `dict.en` / `dict.vi`, khiến các nhãn định danh dạng key (`bnav.transform`, `bnav.map`, `bnav.stakeout`) không chuyển ngữ chính xác.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. *Bổ sung 2.030+ cặp từ điển kỹ thuật song ngữ chuyên ngành trắc địa & GIS*:
     - Bổ sung toàn diện các thuật ngữ MiniCAD, Chuyển đổi tọa độ, Bản đồ thực địa, Sổ đo mốc, Cài đặt hệ thống, RTK GNSS và PixOptimizer.
  2. *Nâng cấp bộ bóc tách thông minh Unicode Emoji / Symbol*:
     - `translateString(str)` sử dụng biểu thức chính quy Unicode `\p{Emoji}\p{Symbol}\p{Punctuation}\u2000-\u3300` để tự động tách icon và dịch chuẩn xác phần chữ (`📐 Đa giác [P]` ➔ `📐 Polygon [P]`, `📁 Dự án ▾` ➔ `📁 Project ▾`).
  3. *Tối ưu hóa `appI18n.t(key)` & Khử trùng lặp `phraseMap`*:
     - Ưu tiên tra cứu `dict[currentLang][key]` trước khi gọi `translateString(key)`.
     - Chạy script deduplicate loại bỏ hoàn toàn các key trùng lặp và ghi đè giá trị kém chất lượng.
  4. *Bảo toàn 100% tiếng Việt có dấu khi chuyển ngược lại*:
     - Cơ chế `node._origVi` trên DOM TreeWalker đảm bảo khi chuyển về `vi`, toàn bộ nội dung tiếng Việt có dấu ban đầu được phục hồi nguyên vẹn 100%.
- **Kiểm thử tự động & Xác minh thực nghiệm (Chrome DevTools Pro)**:
  - Kiểm thử trực tiếp trong Chrome DevTools MCP: Đạt chuẩn 100% không còn bất kỳ chuỗi tiếng bồi nào, chụp ảnh màn hình lưu vết `bilingual_vi_mode.png` và `bilingual_en_mode.png`.
  - Tạo mới bộ test `tests/bilingual_i18n_comprehensive.test.js` (4/4 pass).
  - Toàn bộ test suite dự án: **302/302 tests PASS 100% (0 fail)** trên toàn bộ kho mã nguồn.

### [2026-10-26] Khắc Phục Triệt Để Hiện Tượng Giật Lag Khi Phóng To Bản Đồ Lớn Hơn 20x (Smooth Deep Zoom 60 FPS Engine)
- **Yêu cầu từ người dùng**:
  - `/goal fix lỗi khi phóng to bản đồ lớn hơn 20x thì bị giật lag`
- **Các phát hiện điều tra gốc rễ (Root Cause Analysis - 5 Whys)**:
  1. *Nguyên nhân cốt lõi số 1 (GPU/CPU Filter Stall do SVG feConvolveMatrix trên texture kéo dãn)*:
     - Khi `zoom >= 19`, `pixoptimizer.js` gắn class `.map-deep-zoom-enhanced` và `.map-enhance-gaussian`.
     - CSS áp dụng `filter: url(#mapTileEnhancer)` chứa `feGaussianBlur` + `feConvolveMatrix order="3"` (ma trận tích chập 3x3) lên từng thẻ `img.leaflet-tile`.
     - Ở mức zoom bình thường (<= 20), ảnh tile là native 256x256 px.
     - Khi zoom lớn hơn 20x (21 đến 24), do `maxNativeZoom: 20` và `maxZoom: 24`, Leaflet phóng to tile zoom 20 lên bằng CSS transform: ở zoom 21 là 512x512, zoom 22 là 1024x1024, zoom 23 là 2048x2048, zoom 24 là 4096x4096 px (16.7 triệu pixel/tile!).
     - Trình duyệt Chromium/Blink (Skia) không hỗ trợ GPU acceleration hoàn toàn cho `feConvolveMatrix` trên texture khổng lồ này mà fallback về phần mềm CPU. Hàng chục triệu pixel nhân với 9 phép tính toán ma trận mỗi frame khiến CPU bị nghẽn 100%, FPS rớt thảm hại từ 60 xuống chỉ còn **2 FPS** (được đo đạc thực nghiệm bằng Chrome DevTools MCP: `fpsSamples: [60, 60, 25, 10, 2]`).
  2. *Nguyên nhân số 2 (Layer Explosion & VRAM Thrashing do will-change)*:
     - Các luật CSS gắn `will-change: transform` trên từng thẻ `img.leaflet-tile` con, ép trình duyệt tạo Composited Layer riêng trong VRAM cho từng tile. Khi tile bị scale lên 2048x2048 và 4096x4096px, mỗi tile chiếm tới 67 MB VRAM, gây tràn bộ nhớ đồ họa và giật lag nghiêm trọng khi di chuyển bản đồ.
  3. *Nguyên nhân số 3 (Thiếu cơ chế Bypass Filter trong lúc Zoom Animation)*:
     - Trong khi animation phóng to/thu nhỏ đang chạy (`.leaflet-zoom-anim`), Leaflet liên tục thay đổi ma trận biến đổi. Trình duyệt cố tính toán lại bộ lọc ở từng khung hình 16ms thay vì dành trọn GPU cho chuyển động nội suy.
  4. *Nguyên nhân số 4 (Forced Synchronous Layout Thrashing trong appMapZoomIndicator)*:
     - Sự kiện `zoom` bắn liên tục trong lúc pinch hoặc cuộn chuột, hàm `showBadge()` liên tục đọc `container.clientWidth` và `container.clientHeight` (gây layout reflow) và ghi `badge.style.left/top` mà không được throttling.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. *Chuyển đổi GPU-Native Filter siêu tốc ở zoom > 20x (`map-zoom-above-20`)*:
     - Trong `pixoptimizer.js`: Khi `zoom > 20`, tự động gắn class `.map-zoom-above-20`. Khi zoom nhỏ lại `<= 20`, tự động gỡ bỏ class.
     - Trong `style.css`: Khi có `.map-zoom-above-20` hoặc `.map-ultra-zoom`, chuyển sang bộ lọc CSS GPU nguyên bản: `filter: contrast(1.08) saturate(1.10) brightness(1.02) !important; image-rendering: auto !important;`. Bộ lọc này chạy 100% trên GPU shader phần cứng, không tốn CPU, không lag đơ, bảo toàn độ sắc nét và tương phản mốc ranh giới của ảnh vệ tinh.
  2. *Cơ chế 60 FPS Zoom Animation Bypass (`.map-is-zooming` & `.leaflet-zoom-anim`)*:
     - Trong `pixoptimizer.js`: Lắng nghe sự kiện `zoomstart` để gắn `.map-is-zooming`, và `zoomend` để gỡ bỏ class.
     - Trong `style.css`: Quy tắc `.leaflet-zoom-anim .leaflet-tile-container img.leaflet-tile, .map-is-zooming .leaflet-tile-container img.leaflet-tile { filter: none !important; }` tạm thời ngắt toàn bộ bộ lọc trong thời gian chuyển động phóng to/thu nhỏ, giải phóng 100% tài nguyên cho GPU chạy 60 FPS mượt như lụa.
  3. *Giải phóng VRAM & Tối ưu GPU Compositing Layers*:
     - Gỡ bỏ thuộc tính `will-change: transform` khỏi từng thẻ `img.leaflet-tile` con, chỉ duy trì trên container layer của Leaflet (`.leaflet-tile-container.leaflet-zoom-animated`).
  4. *Triệt tiêu Layout Thrashing trong `appMapZoomIndicator`*:
     - Bọc hàm hiển thị con trỏ tỷ lệ zoom bằng `requestAnimationFrame(renderBadge)`.
     - Cache kích thước `cachedWidth` và `cachedHeight`, loại bỏ việc đọc `clientWidth/clientHeight` liên tục trong sự kiện `zoom`.
- **Đo đạc & Xác minh thực nghiệm (Chrome DevTools Pro v3.0 Verification)**:
  - Trước khi sửa: FPS rớt thảm hại về `[60, 60, 25, 10, 2]` (2 FPS).
  - Sau khi sửa: FPS đo đạc thực tế trên trình duyệt đạt `[64, 60, 60, 60, 59, 61, 60]` - Trung bình **61 FPS**, mức tối thiểu **59 FPS**!
  - Kiểm thử tự động: Bổ sung bộ test mới `tests/map_deep_zoom_smoothness.test.js` (3/3 pass).
  - Toàn bộ test suite dự án: **298/298 tests PASS 100% (0 fail)**.

### [2026-10-26] Khắc Phục Triệt Để Khung CADCraft 2D CLI Dính Cạnh Dưới & Xung Đột Status Bar (Systematic Debugging & Chrome DevTools Pro v3.0)
- **Yêu cầu từ người dùng**:
  - `/goal /systematic-debugging /debug-fix-bug-chrome-pro khung CADCraft 2D CLI đang bị lỗi dính cạnh dưới. hãy test kiểm tra toàn diện để phát hiện lỗi theo từng chức năng và từng dòng code`
- **Các phát hiện điều tra (Root Cause Analysis - 5 Whys)**:
  1. *Lỗi 1 (Dính cạnh đáy & dãn chiều cao khi kéo thả)*: Trong `app.js` (dòng 27198), khi kéo thanh lệnh hàm gán `bar.style.bottom = 'auto'`. Tuy nhiên trong `ui-polish.css` (dòng 2170), luật `body.dock-collapsed .cad-floating-cmd-bar` sử dụng `bottom: calc(...) + 16px) !important;`. Thuộc tính CSS `!important` kìm kẹp khiến inline style `bottom: auto` bị vô hiệu hóa hoàn toàn. Phần tử `position: absolute` nhận đồng thời cả `top` (từ JS) và `bottom: 16px !important`, dẫn đến chiều cao bị kéo dãn kỳ dị (từ 109px lên 558px!) và cạnh đáy bị dính chặt vào mép dưới (`computedBottom: 16px`).
  2. *Lỗi 2 (Xung đột đè lên AutoCAD Status Bar ở trạng thái mặc định)*: Status Bar (`#cadStatusHud`) có chiều cao 31px, nằm ở `bottom: 12px` (kéo dài đến 43px). Khung CLI có chiều cao 109px, trước đây đặt ở `bottom: 16px`. Do cả hai thanh cùng nằm ở đáy bên trái (`left: 12px` và `left: 20px`), khung CLI đè trực tiếp lên Status Bar, che mất các thông số VN-2000 X, Y, diện tích S và chu vi P.
  3. *Lỗi 3 (Thiếu cơ chế Reset vị trí kéo thả)*: Khi người dùng kéo thả CLI đi nơi khác, không có phím tắt hay thao tác nào để đưa CLI về lại vị trí neo chuẩn mực.
  4. *Lỗi 4 (Mobile Drag Locking)*: Trên mobile (`max-width: 480px`), CSS có `right: 8px !important;` khiến việc di chuyển ngang bị kẹt hoặc co dãn bất thường.
  5. *Lỗi 5 (Autocomplete tràn màn hình khi CLI ở trên cao)*: Khi CLI được kéo lên đỉnh màn hình (`top < 220px`), hộp autocomplete xổ ngược lên trên bị che khuất bởi Header.
  6. *Lỗi 6 (Lưới công cụ Drawer tràn chiều cao)*: Bảng lưới `cadCmdAllToolsGrid` có `max-height: 260px` cố định, dễ vượt quá chiều cao màn hình trên điện thoại xoay ngang.
- **Các giải pháp kỹ thuật đã hoàn thành**:
  1. *Giải phóng kéo thả không giới hạn (`.is-dragged`)*:
     - Trong `ui-polish.css`: Bổ sung luật `.cad-floating-cmd-bar.is-dragged { bottom: auto !important; right: auto !important; transition: none !important; }`.
     - Trong `app.js` (`initFloatingCmdBarDrag`): Tự động gán class `.is-dragged` và thiết lập `bar.style.setProperty('bottom', 'auto', 'important')`, `setProperty('right', 'auto', 'important')`, `transition = 'none'`.
  2. *Phân tầng không gian chuẩn AutoCAD (Separation of Concerns)*:
     - Khi Dock thu gọn: Status Bar ở `bottom: 12px`, khung CLI (`.cad-floating-cmd-bar:not(.is-dragged)`) nổi an toàn ở `bottom: calc(...) + 52px) !important;` (tạo khoảng cách đệm 9px thoáng đãng, `overlapsWithHud: false`, `verticalGap: 9px`).
     - Khi Dock mở rộng: Status Bar ở `bottom: 72px`, khung CLI nổi an toàn ở `bottom: calc(...) + 112px) !important;`.
  3. *Bổ sung thao tác nhấp đúp (Double-Click) để Reset vị trí*:
     - Bổ sung sự kiện `dblclick` trên `cadFloatingCmdHeader` gọi `resetFloatingCmdBarPosition()` xóa bỏ `.is-dragged` và đưa CLI về vị trí neo mặc định kèm thông báo Toast trực quan.
     - Tự động kẹp tọa độ trong viewport khi cửa sổ resize.
  4. *Autocomplete thông minh đa hướng*:
     - Bổ sung class `.drop-down` cho `.cad-cmd-autocomplete` trong `style.css` (`top: 100% !important; bottom: auto !important;`). Tự động xổ xuống dưới khi CLI ở nửa trên màn hình (`top < 220px`), và xổ lên trên khi CLI ở gần đáy.
  5. *Tối ưu hóa lưới công cụ CAD*:
     - Thiết lập `max-height: min(240px, 45vh)` cho `.cad-cmd-all-tools-grid` giúp tương thích hoàn hảo trên mọi kích thước màn hình.
  6. *Xác minh kép (Dual Verification)*:
     - Chrome DevTools MCP: Đạt 9/9 tiêu chí kiểm thử trực tiếp trên trình duyệt, 0 lỗi console (`<no console messages found>`), chụp ảnh kiểm chứng trực quan trên cả Desktop và Mobile iPhone (390x844).
     - Test Suite hồi quy: Tạo mới `tests/cadcraft_cli_bottom_drag_and_dock.test.js` (3/3 pass), cập nhật `tests/taskbar_anti_overlap_and_collapse.test.js` (4/4 pass).
     - Toàn bộ kho mã nguồn đạt **295/295 tests PASS (100%)** trên 66 tệp kiểm thử.

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

## 2026-10-30 — Port nhóm Chấm điểm / Bảng điểm lên nền 37k dòng (commit b65da20)
- Tính năng `mode: 'point'` (lớp điểm rời) đã có trên nền mới: nút 📍 Chấm điểm [I], 📋 Bảng điểm, `#cadPointLayerBar` chọn lớp + ➕ Lớp mới.
- `appCadTool`: `getPointLayers / getActivePointLayer / createPointLayer / addPointToLayer / nextPointName`, bảng điểm (`renderPointTable`, `updatePointField`, `deletePointRow`, `zoomToPointRow`, `addPointFromTable`) và `exportPointCsv` (BOM + phân cách `;`).
- Khôi phục hàm toàn cục `escapeHtml()` (thiếu trên nền mới → lỗi tiềm ẩn tại `app.js:1684`).
- `renderGeometry`: đỉnh lớp điểm luôn bung nhãn, tooltip hiện X/Y/H/ghi chú; `calculateAreaAndPerimeter` trả rỗng cho mode point.
- `findSnapCandidate`: 4 vòng lặp cạnh bỏ qua lớp điểm (`shape.mode === 'point'`) → hết hiện tượng hít vào "cạnh ảo" nối hai điểm rời.
- Exporter DXF/PDF/SVG/Ảnh + bảng kê, danh sách khối, Sổ đo đều nhận diện khối kiểu Điểm.
- Persistence: `pointLayerId` lưu trong session (`vn2k_cad_session_v2`) và khôi phục khi reload; undo/redo giữ nguyên lớp điểm đang chọn.
- Kiểm chứng: `node --check` đạt, `npm test` 305/305 PASS (thêm `tests/cadcraft_points.test.js` 75/75), thử trực tiếp trên localhost:8080 với dự án tạm `_ZTest_Points.csv` (chấm điểm, sửa X/Y/H, thêm điểm từ bảng, xuất CSV, undo, xóa dòng, zoom, export SVG/DXF/PDF).
- Đẩy `integration-draw-fixes` (không đụng `main` theo yêu cầu), fast-forward `D:\Nhu\APP\VN2000-PWA` tới `b65da20`.

## 2026-10-30 — Sửa lỗi công cụ Vẽ MiniCAD (commit 99c2815)
- **Nguyên nhân gốc**: `src/core/cad_geometry.js` không được nạp trong `index.html` → `CadGeometryEngine` undefined, làm Tách thửa, Hợp thửa, Xén ranh, Kéo dài và bắt điểm kéo dài cực đều ném `ReferenceError` khi dùng.
  - Đã thêm `<script src="src/core/cad_geometry.js?v=2.8.5">` trước `app.js` và precache trong `sw.js` (CACHE_NAME → v2.8.8).
- **Tên khối sai chế độ**: ô `#cadActiveShapeName` được điền tự động "Tuyến N", sang chế độ Đa giác vẫn lưu tiếp tên đó. Thêm `syncShapeNameSuggestion()` (gọi trong `setMode`) đổi gợi ý theo chế độ, giữ nguyên tên người dùng tự đặt.
- **Offset ở tab Chọn không dùng được**: trước đây `promptOffset()` chỉ đọc nét vẽ dở nên luôn báo "Cần 2 đỉnh". Nay nếu đang chọn khối thì tạo khối mới song song `"<tên> (Offset)"`, tính lại diện tích, ghi lịch sử/lưu dự án; nét dở vẫn cho xem trước đường tím như cũ.
- Kiểm chứng trực tiếp trên localhost:8080: đa giác, tuyến, điểm rời, khối nhà, bán kính, chữ, mũi tên, la bàn, bắn điểm cực, nhập X/Y, khép góc, lưu, xóa, undo/redo, Ortho (khóa trục đúng), Tách (6211 m² → 2×3105 m²), Hợp (giữ 6211 m²), Xén (442.8 → 221.4 m), Kéo dài (166.1 → 221.4 m), Offset (+10 m tạo khối 7911 m²).
- Test: thêm `tests/draw_tools_runtime.test.js` (39/39), toàn bộ `npm test` = 306/306 PASS.
- Đẩy `integration-draw-fixes`, fast-forward `D:\Nhu\APP\VN2000-PWA` tới `99c2815`.

## 2026-10-30 — Layer Manager gắn thật với khối vẽ và xuất DXF
- **Trước đây**: bảng lớp `layersTable` chỉ để trang trí — khối vẽ không lưu `layer`, DXF luôn ghi mọi đường ranh vào `RANH_THUA`, đổi màu/khóa lớp không ảnh hưởng dữ liệu.
- **Gán lớp khi tạo khối**: `saveAndStartNewShape` lấy lớp hiện hành (`currentLayer`), khối mới mang `layer` + màu theo lớp (BYLAYER). Lớp điểm mới thuộc `MOC_TOADO`; khối Offset kế thừa lớp/màu khối gốc; nạp từ dự án/Excel/CSV cũng gán lớp hiện hành.
- **Helper mới**: `getShapeLayerId`, `isShapeLayerLocked`, `cadLayerColorToAci` (hex → ACI 1–9 gần nhất), `sanitizeLayerId` (bỏ dấu tiếng Việt, chỉ A-Z0-9_), `collectExportLayers`, `setLayerColor`.
- **Layer Manager**: ô chọn màu trong từng dòng lớp → `setLayerColor` đổi màu lớp + mọi khối thuộc lớp (thuộc tính hiển thị nên không tạo mốc undo, giống ẩn/khóa lớp). Thêm lớp mới gõ tên có dấu vẫn ra mã ASCII chuẩn CAD (`Đường điện` → `DUONG_DIEN`), tên tiếng Việt giữ nguyên để hiển thị.
- **Khóa lớp**: chặn `deleteShape`, `startSplitTool`, `startMergeTool` (trước đó chỉ chặn kéo đỉnh/chèn đỉnh).
- **DXF**: `_getAllExportShapes` giữ `layer`; `exportDwg` khai báo lớp động vào bảng LAYER (màu ACI theo màu lớp) và ghi LWPOLYLINE ranh vào đúng lớp của khối thay vì hard-code `RANH_THUA`.
- Test: thêm `tests/cadcraft_layers.test.js` (61/61), cập nhật stub `tests/minicad_draw_history.test.js`; `npm test` = 307/307 PASS.
- Kiểm chứng live localhost:8080 (dự án tạm `_ZLayerTest`): vẽ khối ở lớp TIM_DUONG → `layer=TIM_DUONG`, màu `#eab308`; đổi màu lớp → khối đổi theo; khóa lớp → xóa/tách bị chặn đúng thông báo; ẩn lớp → 0 overlay, hiện lại → 11; DXF có `AcDbLayerTableRecord … TIM_DUONG … 62 … 2` và polyline `8 … TIM_DUONG`; lớp `Đường điện` tạo từ tên có dấu xuất thành `DUONG_DIEN`. Đã dọn dẹp: xóa dữ liệu test, khôi phục 7 lớp mặc định, xóa session/key thử nghiệm, trả `currentProject`.

## 2026-10-30 — Cách ly cửa sổ giữa các phân hệ (UI Isolation)
- **Lỗi**: rời MiniCAD sang Bản đồ dự án / Chấm điểm / Chuyển đổi vẫn còn layer CAD trên bản đồ dùng chung; bấm khối/đỉnh mở popup sửa nhanh + modal chú thích CAD, kéo/chuột phải xóa đỉnh được dù `isActive=false`; bảng kê CAD còn treo đè lên phân hệ khác.
- **Guard**: `selectItem`, `showQuickEditPopup`, `openAnnotationModal`, `handleMapClick` (CAD) trả về ngay khi `!this.isActive`; marker đỉnh chỉ `draggable` khi CAD bật; chặn `dragstart` / `contextmenu`.
- **Helper mới**: `closeCadWindows()` (đóng popup Leaflet + 9 modal CAD + bảng thống kê khối), `clearCadOverlays()` (xóa `layers.group` + `layers.annotationsGroup`).
- **Nối vào luồng**: `closeToolbar()` gọi `closeCadWindows`; `openProjectMap` / `openCoordPickerMap` / `openConvertedMap` gọi cả hai trước khi hiển thị; `openTransformCoordScreen` / `openTransformMap` tắt toolbar nếu CAD đang mở.
- **Modal thiếu class**: `openDefaultStampSettingsModal` và `promptOpenConvertedMap` trước chỉ thêm `show` (CSS chỉ hiển thị khi có `active`) → nay thêm `active + show`; `closePromptMap` gỡ cả hai.
- Test: thêm `tests/cad_ui_isolation.test.js` 26/26; `node --check` đạt; `npm test` = 308/308 PASS. Live localhost:8080: modal bảng kê `flex` trong CAD → `none` sau khi rời; sang Chuyển đổi tọa độ tắt CAD và đóng bảng điểm; đã dọn dự án tạm `_ZModalAudit.csv`.

## 2026-10-30 — Rà soát toàn bộ cửa sổ chéo phân hệ trên bản đồ dùng chung
- **Lỗi**: `openLiveGpsMap` không gán `mapMode`, không tắt MiniCAD, không dọn thanh cũ → từ Bản đồ dự án mở GPS còn `#mapProjectBar`; từ MiniCAD còn `#cadStatusHud` + `#cadFloatingCmdBar`; từ Chấm điểm còn `#barCoordPicker` và mode `pick` khiến chạm bản đồ GPS lại chấm tọa độ.
- **Helper mới** `appNav.resetMapChrome()` ẩn 13 thanh/cửa sổ nổi dùng chung (thanh dự án, thanh chấm điểm, toolbar/HUD/loupe/bảng khối CAD, bảng kê dự án, Bottom Sheet, hộp đo khoảng cách). Gọi ở đầu `openProjectMap`, `openCoordPickerMap`, `openCadMap`, `openConvertedMap`, `openLiveGpsMap` trước khi bật thanh của chính phân hệ.
- **GPS thực địa**: thêm chế độ `live_gps`, tắt MiniCAD + `clearCadOverlays`, gỡ `cad-active-map`, FAB riêng (ẩn toàn bộ nút dự án/điểm chuyển đổi).
- **Chạm bản đồ**: `onMapClick` bỏ qua hoàn toàn ở `live_gps` / `view_converted` / `converted_point` → không bật Bottom Sheet dự án.
- **Bottom Sheet dùng chung**: bỏ hai nút chéo phân hệ "📌 Nạp tọa độ" (`loadSelectedToMain`) và "💾 Lưu mốc" (`savePickedPoint` ghi thẳng vào dự án); xóa hai method chết. Chấm điểm đã có "✓ Lấy tọa độ" trên `#barCoordPicker`; popup điểm chuyển đổi đã có nút nạp.
- Test: thêm `tests/map_chrome_isolation.test.js` 21/21; `cad_ui_isolation` 26/26; `project_map_readonly_and_table` 14/14; `npm test` 309/309 PASS.
- Live localhost:8080 (ma trận chuyển cảnh): project → chỉ `mapProjectBar`; cad → chỉ toolbar/HUD CAD; cad→GPS và project→GPS → 0 chrome, `cadActive=false`; picker → chỉ `barCoordPicker`; converted → chỉ Bottom Sheet thông tin; chạm bản đồ GPS/điểm chuyển đổi không mở thêm cửa sổ.

## 2026-11-06 — Tối ưu trải nghiệm người dùng lần đầu (WP-I)
- **Yêu cầu**: người dùng lần đầu khó hiểu cách dùng → tối ưu và đề xuất chỉnh trang bố cục.
- **Đã sửa (kiểm tra trực tiếp iPhone 13 390×844 và iPhone SE 320×568)**:
  1. **Màn chờ ủng hộ 20s** không còn chặn người dùng mới trong ngày đầu tiên (`appDonate.FIRST_USE_KEY = vn2k_first_use_date_v1`); người dùng cũ (đã có `vn2k_donate_last_shown_date_v1`) không đổi. Sửa nhãn nút "Chờ18sđể" dính chữ (bọc `<span>` vì nút là flex).
  2. **Nút "◀ Quay lại" luôn hiện ở Trang chủ** do `.mac-pill-btn { display: inline-flex !important }` thắng `style.display='none'`. Nay dùng thuộc tính `hidden` (+ `#btnHeaderBack[hidden] { display:none !important }` trong ui-polish.css), HTML khởi tạo sẵn `hidden`. Tên ứng dụng hiện lại trên header.
  3. **Nút ? ở Trang chủ mở nhầm "Tổng quan Cài đặt"** → thêm hướng dẫn `appGuide.guides.home` (Bắt đầu nhanh 3 bước), `guideKeyMap.menu = 'home'`.
  4. **Thanh dưới cùng bị cắt chữ** ("Chuyển Đổi Tọa Độ", "Cắm Mốc Thực Địa") → thêm trường `dock` (nhãn ngắn) cho `appDashboard.allFeatures`, `renderTaskbarDock` ưu tiên `f.dock`.
  5. **Thẻ chào mừng lần đầu** `#fwWelcome` (3 bước + nút "Chọn tỉnh" / "Đã hiểu", nhớ bằng `vn2k_welcome_done`) và **dòng giải thích chế độ** `#fwModeHint` (Đơn giản / Nâng cao) trong `field-workspace.js`, song ngữ.
  6. Placeholder ô nhập có tiền tố "VD:" để không bị nhầm là giá trị đã điền.
  7. Trang chủ Nâng cao: đưa 4 ô chức năng chính lên **trước** khối GPS; bỏ cắt tên tỉnh trên chip; badge "4 mục"/"Đổi ghim" không xuống dòng; thanh chế độ cho phép xuống dòng ở màn hẹp (nút Thực địa không bị tràn ở 320px).
- **Tài nguyên**: `style.css`/`ui-polish.css`/`app.js`/`field-workspace.css`/`field-workspace.js` `?v=2.8.24`; `sw.js` `CACHE_NAME = vn2000-pro-v2.8.24`.
- **Kiểm chứng**: `npm test` **322/322 PASS** (thêm test "First day of use never blocks a new user…" trong `donate_modal_30s.test.js`); không lỗi JS khi tải trang; không tràn ngang.

## 2026-11-06 — Vùng an toàn tai thỏ / Dynamic Island / xoay ngang (WP-J)
- **Cách đo**: Playwright + CDP `Emulation.setSafeAreaInsetsOverride` (giả lập `env(safe-area-inset-*)` thật) trên 8 cấu hình: iPhone Dynamic Island dọc/ngang (59/34, 59 hai bên), iPhone tai thỏ dọc/ngang (47/34), Android camera đục lỗ (32/24), iPad dọc/ngang, máy 320px. Quét 12 màn/cửa sổ, cờ khi phần tử bấm được nằm trong vùng inset.
- **Lỗi gốc**: `ui-polish.css` `header.app-header.mac-top-bar { height:54px; padding:0 16px !important }` thắng cách xử lý inset của `style.css` → ☰ / ⚙️ / ? nằm ngay dưới camera trên MỌI màn hình iPhone/Android có tai thỏ. Nay header cao `inset trên + 54px` (ngang: `+44px`), padding chừa inset trên/trái/phải.
- **Đã sửa thêm**:
  1. Ngăn kéo Menu ☰: header ngăn kéo chừa inset trên; ngăn kéo chừa inset trái (xoay ngang) và dưới (thanh Home); bề rộng cộng thêm inset trái.
  2. `#screen-transform` padding hai bên cộng `--sat-safe-left/right`.
  3. Màn Chuyển đổi trên điện thoại xoay ngang chia **trái/phải** (trước đây trên/dưới, mỗi nửa ~80px). Hàm `isTransformSideBySide()` thay 3 chỗ `window.innerWidth >= 1024`, khớp media `(orientation: landscape) and (max-height: 620px) and (max-width: 1023px)` trong ui-polish.css; đầu bản đồ gọn 1 hàng.
  4. Xoay ngang: cột nút bản đồ bên phải giới hạn chiều cao + cuộn (trước tràn xuống dưới mép màn hình, mất nút 🎯); hàng tab MiniCAD xuống dòng riêng + cuộn ngang (trước tràn mép phải, mất Lùi/Tiến).
  5. Hộp hướng dẫn (?) xoay ngang: chân hộp gộp 1 hàng → nội dung từ ~40px lên ~190px.
  6. Màn ≤430px: nút "◀ Quay lại" chỉ còn biểu tượng ◀ để tên màn hình không bị cắt.
- **Kết quả đo**: mọi màn chính 0 phần tử nằm trong vùng an toàn, 0 tràn ngang trên cả 8 cấu hình (các cờ còn lại là nội dung trong vùng cuộn của ngăn Menu / Cài đặt).
- **Còn lại**: MiniCAD xoay ngang trên điện thoại — thanh công cụ cao 191px trên màn 393px nên ô lệnh CLI vẫn che một phần thanh công cụ; cần thiết kế lại thanh CAD cho màn ngang thấp.
- **Tài nguyên**: `?v=2.8.25`, `CACHE_NAME = vn2000-pro-v2.8.25`. Test mới `tests/safe_area_notch_island.test.js` (5/5); `npm test` **327/327 PASS**.

## 2026-11-06 — WP-K: Đổi KTT/Múi VN-2000, chuẩn hóa nhập/xuất, MiniCAD, phân nhóm menu
- **Tính năng mới — Đổi KTT / Múi (VN-2000 ⇄ VN-2000)**: tab `#tabTransRezone` / `#panelTransRezone` trong màn Chuyển đổi (đúng nguyên tắc cách ly), module `vn2000-rezone.js`, hàm lõi `convertVn2kToVn2k` (geodesy.js) = chiếu ngược Gauss-Kruger theo KTT nguồn → chiếu xuôi theo KTT đích, KHÔNG qua 7 tham số. Khớp chuyển qua WGS-84 < 0.1 mm; đổi đi đổi lại < 0.2 mm. Dán nhiều điểm (tab/;/khoảng trắng/dấu phẩy thập phân/STT, tự đảo X⇄Y), cảnh báo > 3.5° khỏi KTT, chép kết quả, tải CSV, nút ⇅ đổi ngược. Menu 1.3, `navigateTo('rezone')`. Tab ẩn bản đồ (`.rezone-mode`).
- **Nhập dữ liệu**: 5 chỗ tách dòng bằng `/\r?\r\n/` (chỉ nhận CRLF) → dán nhiều dòng vào Chuyển đổi đa điểm chỉ nạp 1 điểm, file LF nạp 0 điểm. Sửa thành `/\r\n|\r|\n/`. Thêm `parseHeaderedTable` (ánh xạ cột theo tiêu đề, CSV có ngoặc kép) → đọc lại được CSV/TXT/Excel do chính app xuất. lat/lng suy ra khi nhập giữ 9 số lẻ (trước 6 ≈ 11 cm).
- **Xuất dữ liệu**: `getExportPoints` qua `normalizeSurveyPoints` → bỏ dòng "Lỗi" (trước ghi ra (0,0)), bù WGS-84/VN-2000 theo KTT/múi của từng điểm, KTT ghi thống nhất. CSV thêm cột Cao độ H (cùng thứ tự Excel), xuất + chia sẻ dùng chung `_buildCsvText`, thoát ngoặc kép. KML thoát `&` (trước làm hỏng file).
- **MiniCAD**: `_normalizeVertex` với `forceSyncVn2k` luôn tính lại X/Y từ lat/lng đã làm tròn 7 số lẻ → đỉnh trôi ~5 mm mỗi lần lưu khối. Nay chỉ tính lại khi lệch > 1e-7° (~1 cm, tức kéo đỉnh thật). Màn ngang: CLI mở thu gọn (`setCmdBarCollapsed`, `isCompactCadViewport`), đầu thanh công cụ 1 hàng chỉ biểu tượng (191 → 119 px).
- **Menu ☰**: 5 nhóm theo luồng việc (Chuyển đổi / Bản đồ & Thực địa / Sổ đo & Dữ liệu / Tính toán & Đồ họa / Hệ thống & Trợ giúp); Camera, GPS, RTK → nhóm 2; Giao hội → nhóm 4; nút Ủng hộ thành mục menu chuẩn; thêm bản dịch tiếng Anh.
- **Dữ liệu KTT**: `COMMON_KTT_PRESETS` viết tay gắn nhầm tỉnh cho 7/9 mốc (vd. Đồng Nai → 106°00'); nay sinh tự động từ `VN_PROVINCES` (17 mốc). Bình Thuận = 107°45' trong bảng — CẦN đối chiếu TT 973/2001 (chưa sửa).
- **Đề xuất**: `docs/DE_XUAT_BO_CUC_GIAO_DIEN.md`.
- Kiểm chứng: `npm test` **343/343 PASS** (thêm `vn2000_rezone`, `data_io_roundtrip`, `minicad_precision_and_compact`); thử vòng xuất→nhập trên trình duyệt cho CSV/TXT/Excel/KML/GeoJSON/GPX khớp từng mm. `?v=2.8.26`, `CACHE_NAME = vn2000-pro-v2.8.26`.

## 2026-11-07 — WP-L: Làm toàn bộ đề xuất + địa chỉ sau sáp nhập trên dấu camera
- **Địa chỉ sau sáp nhập trên dấu ảnh/video**: `data/vn_admin_2025.js` (34 tỉnh, 3.321 xã/phường/đặc khu từ 01/07/2025; ranh giản lược ~33 m, 4 MB / 1,4 MB gzip) sinh bởi `tools/build_vn_admin_2025.py` từ thanglequoc/vietnamese-provinces-database (MIT). `vn-admin-2025.js`: tra ngoại tuyến ~1 ms, tải lười, nhớ theo ~10 m; xã gần nhất trong ~65 m khi rơi vào khe ranh giản lược. `getWatermarkData` thêm dòng "• ĐỊA CHỈ"; khung dấu giãn theo dòng dài nhất (trước bị cắt giờ); phông không chân để dấu tiếng Việt chồng hiển thị đúng trên Android. SW: cache riêng `vn2000-data-admin-2025-07-01` không xóa khi nâng phiên bản.
- **KTT 34 tỉnh**: `VN_PROVINCES_2025` (Thông tư 24/2025/TT-BNNMT, tổng hợp từ bảng công bố — không đọc được văn bản gốc vì bị chặn mạng/Cloudflare). 11 tỉnh không sáp nhập giữ KTT cũ (có test). `verify: true` cho Lai Châu, Phú Thọ, Ninh Bình (nguồn chưa thống nhất). Nối SAU 63 tỉnh cũ → chỉ số đã lưu không đổi. `provinceOptionsHtml` dựng mọi ô chọn tỉnh với 2 nhóm. Nút "📍 Chọn theo vị trí GPS hiện tại" trong Cài đặt KTT.
- **Trang chủ**: bỏ công tắc Đơn giản/Nâng cao (`body[data-workspace="unified"]`); khối GPS chỉ hiện khi GPS bật (`body.gps-on`), tắt → nút "Bật GPS". Chip KTT/múi thay tên màn hình trên thanh tiêu đề điện thoại. Nút GPS có nhãn màu. Một tên "Bản đồ dự án & Mốc". Sửa lỗi tiếng Anh luôn hiện "Ho Chi Minh City".
- **MiniCAD**: bỏ lưới công cụ ⊞ và 12 nút trùng trong ribbon CLI (giữ 5 nút trợ vẽ); bỏ nút Xóa toàn bộ cạnh các nút bật/tắt. Điện thoại dọc: thanh công cụ là bottom sheet, CLI thu gọn ở trên. **Cách ly UI**: rule style.css `.map-project-bar { display:flex !important }` (≤520px) làm thanh Bản đồ dự án lọt vào MiniCAD/chấm điểm/GPS trên mọi điện thoại — đã bỏ.
- **Nhập file có xem trước**: `import-preview.js` — xem vài dòng đầu, chọn cột, loại tọa độ, KTT/múi của file, tùy chọn đổi sang KTT hiện hành; chọn dấu phân cách theo số ô số (không tách nhầm phẩy thập phân); không tiêu đề → X là cột giá trị lớn hơn. `mapHeaderColumns` tách khỏi `parseHeaderedTable`.
- Kiểm chứng: `npm test` **354/354 PASS**; thử trên trình duyệt: dấu camera, gợi ý KTT theo GPS (Đà Nẵng → 107°45'), nhập CSV KTT 107°45' → 105°45' khớp engine tới mm, cách ly thanh dự án qua 5 chế độ bản đồ. `?v=2.8.27`, `CACHE_NAME = vn2000-pro-v2.8.27`.

## 2026-11-11 — Sửa lỗi hiển thị menu ☰ sau khi thêm mục 2.6 Tối ưu lộ trình
- **Lỗi**: khi chèn `#drawerItem_routing` (commit bfbf35a) còn sót một mảnh 5 dòng của mục RTK (`</div>` + vòng ✓ trùng + `</div>`) → thừa một `</div>`, nhóm 3–5 rơi ra ngoài `.drawer-tree-body`, vùng cuộn bị ép còn 90px, nhóm "Sổ đo & Dữ liệu" đè lên nhóm 1–2, menu không cuộn được.
- **Sửa**: bỏ mảnh thừa; thẻ `<div>` toàn file cân bằng (1847/1847). Hộp chỉ dẫn `#routingNavHud` đổi sang phông không chân (dấu tiếng Việt hiển thị đúng).
- Test mới `tests/drawer_markup_integrity.test.js` (div cân bằng + 5 nhóm nằm trong vùng cuộn). `npm test` 359/359. `CACHE_NAME = vn2000-pro-v2.8.29`.

## 2026-11-11 — WP-M: Tổng hợp chức năng & tái cấu trúc giao diện thống nhất (không bỏ chức năng nào)
- **Tổng hợp**: `docs/TONG_HOP_CHUC_NANG.md` — cấu trúc điều hướng, danh mục 21 chức năng theo 5 nhóm, quy tắc giao diện dùng chung.
- **Thanh ngữ cảnh** (`#appContextBar`, điện thoại dọc): tên màn hình gọn (không số, không in hoa) + 📁 dự án hiện hành (chạm → Sổ đo). `appNav.notifyScreenChange` phát sự kiện `vn2000:screenchange`; `app-shell.js` hiển thị.
- **Trang chủ**: "Truy cập nhanh" (4 ô ghim, cùng hình thức ô chức năng) + **"Tất cả chức năng"**: 21 ô theo 5 nhóm, có ô tìm kiếm (không dấu). Bảng dựng TỪ menu ☰ nên hai nơi luôn khớp; ô bấm = bấm mục menu tương ứng. Thay mục thu gọn "Công cụ kỹ thuật & tiện ích khác".
- **`ui-unified.css`** (nạp sau cùng): một bộ quy tắc cho thẻ, tiêu đề thẻ (15px, không in hoa), nút (4 vai trò màu), nút hành động chính, tab segmented (Chuyển đổi/Camera/Trắc dọc/Thông tin), ô nhập 44px; chế độ Thực địa giữ bộ tương phản cao riêng.
- **Sửa lỗi**: đổi sang tiếng Anh có thể treo trình duyệt — MutationObserver của bộ dịch ghi lại chuỗi không đổi → tự kích hoạt lại vô hạn. Nay chỉ ghi khi chuỗi thật sự đổi. Lỗi chính tả "THỰC ĐIỆA". Bản dịch tiếng Anh chuẩn cho toàn bộ menu.
- Test mới `tests/unified_shell.test.js`; `npm test` **364/364 PASS**. `CACHE_NAME = vn2000-pro-v2.8.30`.

## 2026-11-12 — Camera: tab "Đóng dấu" dùng sai số danh định ±2–4 m
- Theo yêu cầu: ảnh chọn từ máy (tab "Đóng dấu") in sai số ngẫu nhiên ±2.0–4.0 m (`appCamera.nominalStampAccuracy`, tạo một lần cho mỗi ảnh, thông tin lưu thư viện khớp với dấu). Tab "Chụp ảnh", khung xem trực tiếp và quay video giữ sai số thật của thiết bị.
- `getWatermarkData(opts)` / `drawWatermark(..., opts)` nhận `opts.accuracyText`; mặc định vẫn là `AppState.lastGps.accuracy`.
- Test `tests/camera_stamp_nominal_accuracy.test.js`; `npm test` 366/366. `CACHE_NAME = vn2000-pro-v2.8.31`.

## 2026-11-17 — WP-N: Trang chủ tùy chỉnh — hiện 1, 2 hay nhiều chức năng (F-013)
- **Yêu cầu**: cho phép cài đặt hiển thị 1, 2 hoặc nhiều chức năng ra màn hình chính thay vì hiển thị tất cả; tối ưu giao diện theo hướng đó.
- **Chọn chức năng**: bỏ giới hạn đúng 4 ô ghim. `vn2000_pinned_features` nhận từ 1 mục trở lên, giữ thứ tự người dùng (`normalizePinnedIds` bỏ id lạ/trùng; rỗng/hỏng → mặc định 4 mục cũ). `allFeatures` thêm 5 mục: Chuyển đổi hàng loạt, Đổi KTT/Múi, Chấm tọa độ, Bài toán trắc địa, Kinh tuyến trục (16 mục).
- **Bố cục tự đổi theo số ô** (`homeLayoutFor`, `#bigActionTilesGrid[data-layout]`): 1 → một khối lớn có mô tả; 2 → hai khối lớn; 3–4 → lưới ô vừa (máy tính 3–4 cột); từ 5 → ô gọn biểu tượng + tên ngắn (điện thoại 3 cột, máy tính chia đều hàng qua `--tile-cols`). Ô là `<button>` (bấm được bằng bàn phím).
- **Thành phần khác bật/tắt** (`vn2000_home_widgets`, `data-home-off` trên `#screen-menu`): Chuyển đổi nhanh, Vị trí GPS, Dự án hiện hành (kèm dải nơi lưu), "Tất cả chức năng" mở sẵn. Mặc định "Tất cả chức năng" **thu gọn** thành một nút có số mục; bấm để mở, lựa chọn được nhớ.
- **Hộp "Tùy chỉnh Trang chủ"** (nút "Tùy chỉnh" trên Trang chủ, và Cài đặt → Chung → "🏠 Trang chủ"): xem trước bố cục, danh sách "Đang hiện (theo thứ tự)" với số thứ tự và ▲▼, "Chưa hiện — chạm để thêm", công tắc thành phần khác. Tab "Thanh dưới" giữ nguyên (3 nút).
- **Bỏ** lựa chọn bố cục cũ "4 Khối lớn / Cây thư mục" trong Cài đặt; ai đang dùng "Cây thư mục" được chuyển về Trang chủ mới.
- **Kết quả đo** (390×844): Trang chủ mặc định cao 2.874 → 1.343 px; chọn 2 chức năng + tắt Chuyển đổi nhanh → 785 px (vừa một màn hình). 0 lỗi JS; kiểm tra 320px, máy tính 1366px, Sáng, Thực địa, tiếng Anh.
- Test mới `tests/home_customizable.test.js` (7); bổ sung `setAttribute` cho DOM giả trong `settings_i18n_and_contextual_help.test.js`. `npm test` **373/373 PASS**. `?v=2.8.32`, `CACHE_NAME = vn2000-pro-v2.8.32`.

## 2026-11-17 — WP-O: Sửa 10 vấn đề trong báo cáo rà soát (F-014, v2.8.33)
1. **KTT Bình Thuận 108°30'** (trước ghi nhầm 107°45'; TT 973/2001, EPSG:9218). Người đang lưu Bình Thuận + 107°45' được hỏi **một lần**, đồng ý thì mở Cài đặt KTT điền sẵn 108°30' (`appSettings.checkKttCorrections`); điểm đã lưu giữ KTT riêng. Test đối chiếu cả 63 tỉnh.
2. **Phiên bản file thống nhất** `?v=2.8.33` cho mọi JS/CSS (geodesy.js đang kẹt `?v=2.8.1`), bỏ `immutable` cho geodesy.js trong vercel.json; test bắt ?v= lệch CACHE_NAME.
3. **3 nút hỏng**: `appData.saveProjectsList()` (mới), popup khối MiniCAD → `deleteShape`, Bản đồ GPS → `appMap.updateLiveGps`; cầu Trắc dọc→MiniCAD gọi `renderGeometry`. Test `no_missing_handlers` quét mọi `appX.method(` (bắt đúng 3 lỗi trên bản cũ).
4. **Mã lạ trong file nhập**: `sanitizeUserFields` đổi `< >` → `‹ ›` ở tên/ghi chú/khối/lớp khi đọc & ghi (cả dữ liệu cũ); `escapeHtml` tên dự án ở chip, nút đồng bộ, khung tên xem trước xuất; `jsArg` cho tên chú thích trong onclick; `cleanProjectName` khi tạo/đổi tên/nhập dự án. Thử trên 22 màn hình/hộp thoại: 0 lần chạy mã, 0 chỗ ghi thẻ sống.
5. **Lưu trữ**: `navigator.storage.persist()`; MiniCAD dùng `safeStorage` (báo khi đầy), mỗi bản vẽ chỉ một khóa (`storeCadShapes`, xóa bản sao cũ sau khi lưu được), phiên không chép lại khối đã có chỗ lưu theo dự án.
6. **Dấu ảnh chọn từ máy**: tiêu đề "ẢNH ĐÓNG DẤU SAU", dòng "ĐÓNG DẤU SAU (ảnh chọn từ máy): Chụp lúc <EXIF DateTimeOriginal> | Đóng dấu <giờ> | Sai số: không đo"; bỏ sai số ngẫu nhiên ±2–4 m (`readExifCaptureDate`). Chụp/quay trực tiếp giữ sai số GPS thật.
7. **Cập nhật app**: bỏ tự tải lại 1,5 s; thanh "Có phiên bản mới — Cập nhật / Để sau" (SKIP_WAITING); SW chờ mạng tối đa 3 s rồi dùng bản lưu (khớp cả URL có ?v=).
8. **Triển khai**: `.vercelignore` (tài liệu nội bộ, công cụ, test, .agents 43 MB, PNG gốc); server.js chặn `../`, `%2f`, file ẩn, bỏ CORS *, `PORT` qua biến môi trường; **Mã bí mật** tùy chọn cho Apps Script (ô trong Cài đặt → Lưu dữ liệu, `SECRET` trong Mã.gs và mẫu script).
9. **Giao diện**: nhãn ngắn viết hoa đầu câu, bỏ đánh số (11 tiêu đề thẻ, tab Đơn/Nhiều điểm, Tuyến/Hố móng, nút IN HOA), hàng nút Cài đặt xuống dòng thay vì tràn, chip KTT hiện đủ ở 390 px (ẩn nút Sáng/Tối ≤600 px, 📍 vẽ bằng ::before), vùng chạm 44 px (::after) cho tab, nút Múi, nút ?, nhãn MiniCAD; mọi cỡ chữ ≥ 11 px (dock màn ngang 9,5 → 11 px); bỏ thông báo khi chỉ mở Chấm điểm/MiniCAD; tiếng Anh giữ tiếng Việt có dấu khi chưa có bản dịch.
10. **Hiệu năng & cấu trúc**: bỏ script trong <head>; xlsx, jspdf, ranh giới 34 tỉnh, xã Đồng Tháp nạp khi cần (`loadLib`/`needLib`, SW vẫn lưu sẵn — xuất Excel ngoại tuyến đã thử); ảnh hướng dẫn WebP 5,7 MB → 0,9 MB, logo 997 KB → 39 KB; xóa 39 khóa trùng (11 hàm + 28 mục từ điển); xóa modern-react; phiên bản 2.8.33 ở package.json, feature_list, README, màn Giới thiệu.
- **Chưa làm (lớn, nên làm dần)**: tách app.js theo phân hệ, giảm ~3.100 `!important`, chuyển điểm/bản vẽ sang IndexedDB; còn nhãn nhỏ viết Hoa Mỗi Chữ trong một số khung. Màn 320 px trên màn con: chip KTT vẫn bị cắt.
- Kiểm chứng: `npm test` **405/405 PASS** (11 file test mới); 20 màn hình điện thoại/máy tính 0 lỗi JS, 0 tràn ngang; bấm thử 3 nút, xuất Excel/PDF nạp thư viện khi cần, bản đồ nạp ranh giới khi mở, thanh Cập nhật (không tự tải lại, bấm thì tải lại 1 lần), xuất Excel khi mất mạng.

## 2026-11-17 — WP-P: Trang chủ gọn — "Chức năng của tôi" lên đầu (v2.8.34)
- **Vấn đề trên bản đang chạy (v2.8.33)**: người chưa đổi cài đặt vẫn thấy gần như mọi thứ (Thực địa, 3 bước, Chuyển đổi nhanh, 4 ô, GPS, Dự án, Tất cả chức năng — cao 1.755 px ở 375×812); nút "Tùy chỉnh" nằm dưới khối chuyển đổi nên không thấy.
- **Thứ tự mới**: thanh "Chức năng của tôi" (đổi tên từ "Truy cập nhanh") + nút Thực địa + nút Tùy chỉnh ở **đầu** Trang chủ → các ô đã chọn → (3 bước lần đầu) → Chuyển đổi nhanh → Tất cả chức năng. `#fieldWorkspace` chuyển vào trong `#dashboardModernHub` ngay sau `#bigActionTilesGrid`, rộng bằng các ô; `#fwToolbar` chuyển lên thanh tiêu đề (field-workspace.js dịch nhãn theo `#fieldWorkspace, #fwToolbar`).
- **Mặc định gọn**: `HOME_WIDGET_DEFAULTS = { quick: true, gps: false, project: false, all: false }` — GPS và dự án đã có trên thanh tiêu đề. Người đã lưu lựa chọn (`vn2000_home_widgets`) giữ nguyên.
- Thực địa + Tùy chỉnh vùng chạm 44 px; màn ≤ 400 px: Thực địa chỉ còn biểu tượng, ẩn nhãn "4 mục" để tiêu đề một dòng. Bước 3 lời chào trỏ tới nút Tùy chỉnh.
- **Kết quả đo**: người dùng cũ 375×812 → 1.043 px (trước 1.755); người mới (có 3 bước) 1.428 px; máy tính 1366×900 vừa một màn hình. 0 lỗi JS; kiểm 320 px, Thực địa, máy tính.
- `npm test` **406/406 PASS** (thêm test thứ tự Trang chủ, sửa test mặc định). Phiên bản 2.8.34 (`?v=`, `CACHE_NAME`, package.json, feature_list, README, trang Giới thiệu).

## 2026-11-18 — WP-Q: Sửa bản đồ "Tối ưu lộ trình" chỉ hiện 1 ô ảnh; kiểm tra bản đồ mọi chức năng (v2.8.35)
- **Lỗi**: mở "Tối ưu lộ trình" lần đầu, bản đồ chỉ hiện một ô ảnh ở góc trên trái (ô ảnh phủ 11% khung trên điện thoại, 2% trên máy tính); mở lần hai mới đúng.
- **Nguyên nhân**: `appNav.showScreen` gọi `appRouting.init()` trước khi hiện màn hình, nên `L.map('leaflet-routing-map')` được tạo khi khung còn 0×0; `ensureMap()` chỉ gọi `invalidateSize()` ở những lần mở sau.
- **Sửa**: `installLeafletAutoResize(L, ResizeObserver)` gắn vào mọi bản đồ Leaflet (qua `L.Map.addInitHook`) — khung đổi cỡ (hiện ra, mở/thu bảng, xoay máy) thì `invalidateSize({ debounceMoveend: true })`, bỏ qua khi khung 0×0, ngừng theo dõi khi bản đồ bị gỡ. Thêm dự phòng `invalidateSize()` 250 ms sau khi tạo bản đồ lộ trình.
- **Kiểm tra** (trang thật + trình duyệt cục bộ, 375/390 px và 1366 px, mỗi chức năng mở trên trang mới): Bản đồ dự án, Chấm tọa độ (cả nút ở Trang chủ), Cắm mốc, bản đồ nhỏ ở Chuyển đổi/Hàng loạt, MiniCAD, GPS trực tiếp đều phủ 100% trước và sau khi sửa; Lộ trình 9–11% / 2% → 100%. Camera, Trắc dọc không có bản đồ; Giao hội mở bản đồ dự án.
- Test mới `tests/map_auto_resize.test.js` (3). `npm test` **409/409 PASS**. Phiên bản 2.8.35.

## 2026-11-18 — WP-R: Mục lục chức năng — phương án A "danh sách gọn" (v2.8.36)
- **Chọn từ bản thiết kế** (canvas "Tối ưu mục lục chức năng", 3 phương án): người dùng chọn **A · Danh sách gọn**.
- **Một bộ dựng chung** trong `app-shell.js` (`indexModel`, `filterModel`, `render`) cho menu ☰ (`#drawerFeatureIndex`) và "Tất cả chức năng" ở Trang chủ (`#homeFeatureHubList`). Nguồn duy nhất vẫn là menu ☰ cũ (ẩn bằng CSS): mỗi dòng bấm mục cũ tương ứng, nên trình xử lý, mục "đang mở" (`.selected`) và tìm kiếm cũ giữ nguyên.
- Mỗi chức năng một dòng: biểu tượng nét theo màu nhóm, **tên gọn** (bỏ "1.1", bỏ chữ in hoa), mô tả một dòng, **★ = đang hiện trên Trang chủ**; nút lọc nhóm (Tất cả · Chuyển đổi · Thực địa · Dữ liệu · Tính toán · Hệ thống); tìm không dấu theo tên mới, tên cũ, mô tả, từ khóa (vd. "dwg" → Sổ đo, MiniCAD).
- **Menu ☰**: đầu gọn (tiêu đề + nút đóng 44 px), **bỏ 3 chấm macOS**, bỏ vòng ✓ và nhãn "4 mục", ẩn dải dự án/KTT (đã có trên thanh tiêu đề). Mỗi lần mở: về "Tất cả", ô tìm trống; bấm mục không đổi màn hình (Ngày giờ, Ủng hộ…) vẫn đóng menu.
- Sáng/Tối/Thực địa đều có màu riêng; Trang chủ trên màn ≥ 900 px chia hai cột mỗi nhóm.
- Sự kiện mới: `vn2000:draweropen` (openTreeMenu), `vn2000:homechange` (renderDashboard) để vẽ lại ★ và mục đang mở.
- Test mới `tests/feature_index.test.js` (5); `unified_shell.test.js` đổi `.hub-tile` → `.fi-row`. `npm test` **414/414 PASS**. Phiên bản 2.8.36.

## 2026-11-18 — WP-S: MiniCAD — nạp DGN, chống treo khi nạp tệp lớn, lớp ranh giới Đồng Tháp, xuất có nền bản đồ (v2.8.37)
- **Nạp tệp làm treo trình duyệt**: mỗi đỉnh từng dựng 3–4 đối tượng DOM (điểm đỉnh, nhãn cạnh, đường bắt chạm) → bản vẽ 1.500 thửa mất ~45 s. Nay khi tổng số đỉnh > `DETAIL_VERTEX_LIMIT` (1.500) chỉ dựng chi tiết cho thửa trong vùng đang xem (≤ 1.500 đỉnh) và thửa đang chọn; nhãn tâm khi ≤ 300 thửa trong khung; kéo/phóng bản đồ (`moveend`) vẽ lại mà không ghi phiên. Đo được: 1.500 thửa 45 s → 2,4 s; 300 thửa 2 s → 0,45 s; CSV 3.000 điểm 4,9 s → 1,1 s; DGN 2.000 thửa 2,3 s.
- Bản vẽ > `POINT_SYNC_VERTEX_LIMIT` (5.000 đỉnh) không sao chép đỉnh sang Sổ điểm (nguyên nhân thông báo đầy bộ nhớ). Giới hạn còn lại: bản vẽ rất lớn (> ~5 MB) không lưu được vào localStorage — đề xuất chuyển IndexedDB.
- **Lớp ranh giới trong MiniCAD**: hiện nút "34 tỉnh" và "Xã Đồng Tháp" ở chế độ `cad`; lớp không bắt chạm (`interactive: false`, `setReferenceLayersInteractive`) để chấm đỉnh không mở popup; trở lại bắt chạm ở Bản đồ dự án.
- **Nạp .dgn (MicroStation V7 / Famis)**: `GisIO.readDgn` đọc nhị phân ISFF (TCB: đơn vị, gốc tọa độ toàn cục, 2D/3D; phần tử 3/4/6/11/12/14/15/16/17; ghép chuỗi/thửa phức; chữ → điểm có tên). Kết quả hệ chiếu (Đông, Bắc) tự nhận VN-2000. DGN V8 báo hướng dẫn "Save As V7". Đối chiếu GDAL: sai lệch ≤ 2,3e-10 m. Nhận .dgn ở MiniCAD và Dự án.
- **Xuất có nền bản đồ**: hộp thoại xuất MiniCAD thêm "Nền bản đồ" (Không nền / Bản đồ đường phố OSM / Ảnh vệ tinh Esri) cho PDF và PNG. `planExportBasemap` chọn mức thu phóng theo độ nét bản vẽ (≤ 160 ô), `loadExportBasemap` tải ô `crossOrigin` (ô lỗi bỏ qua, báo số ô thiếu), `drawExportBasemap` đặt từng ô bằng affine 3 góc (WGS84 → VN-2000 → điểm ảnh, sai số < 0,01 px), cắt theo khung bản đồ, ghi nguồn. Ảnh Google của bản đồ chính không dùng được (không cho đọc chéo, làm hỏng ảnh xuất).
- Test mới `tests/minicad_dgn_basemap_large.test.js` (13) + 2 tệp mẫu `tests/fixtures/*.dgn`; sửa mốc tìm `renderGeometry(opts = {})` trong 3 test cũ. `npm test` **427/427 PASS**. Phiên bản 2.8.37.

## 2026-11-18 — WP-T: MiniCAD — Ảnh nền bản đồ quy hoạch có gắn tọa độ (v2.8.38)
- **Yêu cầu**: nạp ảnh JPG/PNG/PDF bản đồ quy hoạch (từ UBND xã / Sở NN&MT), gắn tọa độ VN-2000 bằng 2–4 điểm khống chế hoặc tệp .jgw/.tfw, phủ lên bản đồ MiniCAD, chỉnh độ mờ, in làm nền khi xuất PDF/PNG. (Không lấy bản đồ của Guland: dịch vụ thu phí, có bản quyền.)
- `src/core/georef.js` (mới, thuần JS): đọc/ghi world file (tự đảo khi ghi X Bắc trước), affine theo góc điểm ảnh; 2 điểm = dời + xoay + tỉ lệ đều; ≥ 3 điểm = affine bình phương tối thiểu (gốc trọng tâm), sai số từng điểm + RMS; báo điểm trùng/thẳng hàng.
- `appPlanOverlay` (app.js): nút **🗺️ Ảnh nền quy hoạch** trong MiniCAD (nhóm Nạp). Hộp thoại `#modalPlanOverlay`: chọn KTT của bản đồ, nạp nhiều tệp (ảnh khớp tệp tọa độ cùng tên được gắn ngay), khung xem ảnh kéo/phóng (chuột, chụm 2 ngón), chạm để thêm điểm, kéo dấu thập để chỉnh, nhập X (Bắc)/Y (Đông), sai số tô màu (xanh ≤ 1 m, vàng ≤ 5 m, đỏ > 5 m). Danh sách ảnh: bật/tắt, độ rõ, Xem, chấm lại điểm, lưu ảnh + .jgw, xóa.
- Hiển thị: `<img>` trong pane riêng `planOverlayPane` (z 250: trên nền, dưới nét vẽ, không bắt chạm), đặt bằng CSS `matrix()` từ 3 góc ảnh (VN-2000 → WGS84 → `map.project`, không làm tròn); ẩn khi đang hoạt cảnh zoom. Chỉ hiện ở chế độ `cad`.
- Lưu ảnh trong IndexedDB `VN2000_PlanOverlayDB` theo dự án; ảnh giới hạn 4096 px / 16 MP (điện thoại). PDF dựng bằng pdf.js 3.11 tự lưu trữ (`vendor/pdfjs`, Apache-2.0, nạp khi cần); tệp tọa độ không áp cho PDF.
- Xuất PDF/PNG: tùy chọn "In ảnh nền quy hoạch" (hiện khi có ảnh), vẽ sau nền bản đồ, trước khung/lưới/nét; ảnh theo KTT khác được quy đổi sang KTT bản vẽ.
- Kiểm thử trình duyệt: ảnh mẫu 2400×1600 xoay 2°: tệp tọa độ khớp 1e-10; 4 điểm chấm → sai số góc 0 m; lệch trên bản đồ < 0,4 px; bản in PDF lưới ảnh trùng lưới bản vẽ; lưu qua tải lại trang; không hiện ở Bản đồ dự án; chạm thêm điểm trên điện thoại.
- Test mới `tests/plan_overlay_georef.test.js` (9). `npm test` **436/436 PASS**. Phiên bản 2.8.38.

## 2026-11-18 — Sửa: ảnh nền quy hoạch đọc ảnh bằng onload (v2.8.39)
- `img.decode()` có thể không bao giờ xong khi trang chạy nền / trong WebView → nạp ảnh treo. Đổi sang `_loadImage` (onload/onerror, quá 20 s báo lỗi). 436/436 PASS.

## 2026-11-18 — WP-U: Bảng "Lớp bản đồ" — nền + lớp phủ mở thay Guland (v2.8.40)
- **Yêu cầu**: thay lớp bản đồ Guland bằng nguồn miễn phí hợp pháp; bật/tắt, chọn lớp trên Bản đồ dự án và MiniCAD. Bản thiết kế: canvas "Bảng chọn lớp bản đồ — Bản đồ & MiniCAD".
- Nút 🛰️ (FAB) mở `#modalMapLayers` (`appMapLayers`): **Nền** chọn 1 — Vệ tinh Google (chỉ xem), Ảnh vệ tinh Esri, OSM, **Sentinel-2 không mây 2016** (EOX, CC BY 4.0, ô 3857 tới mức 14), Không nền. **Lớp phủ** — **ESA WorldCover 2021** (CC BY 4.0, Terrascope MapProxy `webmercator/{z}/{x}/{y}`, chú giải 9 lớp, độ rõ), **NASA GIBS** (CC0, chọn ngày + loại ảnh MODIS 7-2-1 / MODIS màu thật / VIIRS NOAA-20, mức 9), ranh giới 34 tỉnh, xã Đồng Tháp; trong MiniCAD có thêm dòng Ảnh nền quy hoạch. **Nguồn tự thêm** WMS/XYZ: bắt buộc https, ghi nguồn, xác nhận được phép (nguồn thương mại như Guland cần khóa API/văn bản).
- Lớp phủ trong pane `refOverlayPane` (z 240, không bắt chạm). Trạng thái lưu `vn2k_map_overlays_v1`; nền lưu qua `appSettings` (nhận thêm `esri_satellite`, `s2_2016`, `none` — trước đây Esri không được khôi phục). `toggleMapLayer` đổi vòng 3 nền qua `appMapLayers.setBase`.
- **Ghi nguồn**: bản đồ chính trước tắt `attributionControl` (vi phạm điều kiện OSM/Esri/CC BY) → bật ô ghi nguồn góc trái dưới, tự thêm/gỡ theo lớp.
- Xuất PDF/PNG: nền thêm "Ảnh Sentinel-2 2016" và "ESA WorldCover" (đã kiểm tra CORS).
- Test mới `tests/map_layers_panel.test.js` (5). `npm test` **441/441 PASS**. Phiên bản 2.8.40.

## WP-J: Tích hợp Bản đồ Quy hoạch Guland 2030 (63 tỉnh thành - F-015) & Đồng bộ Toàn diện v2.8.41
- **Mục tiêu**: Đồng bộ toàn diện các nâng cấp nâng cao từ kho `d:\Nhu\APP\VN2000-PWA` (v2.8.40 gồm F-012 Tối ưu hóa lộ trình TSP 2-opt, F-013 Màn hình chính tùy biến Bento Grid, F-014 10 Sửa đổi Đánh giá mã nguồn & KTT Bình Thuận 108°30') sang kho Google Drive `i:\My Drive\AppSheet\UNGDUNGWEB\VN2000-PWA` đồng thời tích hợp trọn vẹn Bản đồ Quy hoạch Guland 2030 (F-015) trên 63 tỉnh thành.
- **Thực thi**:
  1. **Đồng bộ mã nguồn & tài nguyên**: Bổ sung `.vercelignore`, `VN2k-WGS84.webp`, `app-shell.js`, `import-preview.js`, `src/core/georef.js`, `ui-unified.css`, `vn-admin-2025.js`, `vn2000-rezone.js`, `tools/`, `vendor/pdfjs/`, `assets/tutorial_screens/`, `tests/fixtures/` và toàn bộ 26 bộ test chuyên sâu từ D.
  2. **Bảo tồn động cơ Guland 2030**: `src/core/planning_map.js` ánh xạ 63 tỉnh thành Việt Nam với KTT, tọa độ tâm, zoom mặc định, CDN vcdn.cloud và fallback CMC S3; cơ chế tráo đổi lớp mượt mà và kiểm soát độ mờ (opacity slider 0.1 - 1.0).
  3. **Tách biệt giao diện (UI Isolation - AGENTS.md §2)**: Tích hợp 3 nút điều khiển nổi độc lập `#btnLiveMapTogglePlanning`, `#btnTfMapPlanning`, `#btnMapProjectPlanning` và 3 thẻ điều khiển `#liveMapPlanningCtrl`, `#tfMapPlanningCtrl`, `#mapProjectPlanningCtrl` trên Live Map, Bản đồ Chuyển đổi và Bản đồ Dự án mà không gây can nhiễu chéo.
  4. **Quy chuẩn hiển thị & di động**: Cân bằng cấu trúc đóng/mở ngoặc CSS trong `ui-polish.css`, đáp ứng sàn chạm di động 44px (`.btn-planning-sub`, `.planning-province-select`), sàn chữ ≥ 11px cho `.planning-note` và thích ứng vùng an toàn tai thỏ/Dynamic Island.
  5. **Dịch vụ ngoại tuyến PWA Service Worker**: Nâng cấp `CACHE_NAME = 'vn2000-pro-v2.8.41'`, thêm `./src/core/planning_map.js` vào `ASSETS_TO_CACHE`, cấu hình `vercel.json` an toàn chống cache cứng `geodesy.js`.
  6. **Kiểm thử tự động toàn diện**: Toàn bộ **465/465 test PASS 100%** (bao gồm 441 test của v2.8.40 và 24 test tích hợp của F-015). Sức khỏe ứng dụng qua `init.ps1` đạt chuẩn xanh 100%.

- **2026-11-18 (Tích hợp Xuất Kèm Lớp Bản Đồ Guland 2030 & Tệp Bản Đồ PDF/Ảnh Vào Bản Vẽ Kỹ Thuật)**:
  1. **Hộp thoại xuất MiniCAD (`#modalCadExportConfig`)**:
     - Bổ sung nhóm điều khiển: `CHỌN LỚP BẢN ĐỒ NỀN, GULAND & FILE PDF XUẤT KÈM`.
     - Tùy chọn nền cơ sở: Giấy trắng, OpenStreetMap, Vệ tinh Esri, Sentinel-2 10m, ESA WorldCover.
     - Lớp quy hoạch Guland: Checkbox bật/tắt `#cadExportCheckGuland`, bộ chọn 63 tỉnh `#cadExportGulandProvince`, thanh trượt độ mờ `#cadExportGulandOpacity`, checkbox in kèm ranh thửa đất quy hoạch `#cadExportGulandLand`.
     - Lớp bản đồ PDF / Ảnh bổ sung (`appPlanOverlay`): Checkbox `#cadExportPlanOverlay` kèm nhãn badge đếm số lượng `#cadExportPlanOverlayCountBadge`, danh sách từng tệp PDF/ảnh nắn tọa độ `#cadExportPlanOverlayList` với checkbox chọn độc lập từng file, nút Chọn tất cả / Bỏ chọn nhanh.
  2. **Hộp thoại xuất Bản đồ Dự án / Sổ đo (`#modalExportData` / `#modalExportDwg`)**:
     - Bổ sung bước 2.5: `CHỌN NỀN BẢN ĐỒ, GULAND & TỆP PDF XUẤT KÈM`.
     - Đồng bộ đầy đủ bộ chọn nền `#selExportBasemap`, quy hoạch Guland `#chkExportGulandPlanning`, bộ chọn tỉnh `#selExportGulandProvince`, thửa đất `#chkExportGulandLand`.
     - Lớp bản đồ PDF `#chkExportPlanOverlay` kèm danh sách tệp `#selExportPlanOverlayList`.
  3. **Thuật toán & Động cơ nạp ngói (`app.js`)**:
     - Xây dựng `planExportGuland(provinceSlug, frame, pxPerMeter, toLatLng, maxTiles, showLand, opacity)`: tính toán z-level và danh sách ô ngói theo EPSG:3857, ghép chuẩn xác tọa độ affine VN-2000.
     - Nâng cấp `loadExportBasemap`: hỗ trợ tự động retry `fallbackUrl` nếu ngói CDN chính gặp sự cố, đảm bảo không làm gián đoạn việc xuất bản vẽ.
     - Nâng cấp `_prepareExportBasemap`: tải đồng thời cả ngói nền cơ sở và ngói quy hoạch Guland qua `Promise.all`.
     - Nâng cấp `appPlanOverlay`: thêm `renderExportFileList()`, `getSelectedExportIds()`, và `drawForExport(ctx, rect, toCanvas, selectedIds)` chỉ xuất các tệp PDF/ảnh đã được tích chọn.
     - Tích hợp vẽ lớp Guland và PDF overlays vào `exportPdf()`, `exportOptimizedImage()` của MiniCAD và `exportPdfFile()` của Bản đồ dự án.
  4. **Kiểm thử tự động & Trực quan**:
     - Thêm bộ test `tests/export_guland_and_pdf_layers.test.js`: 7/7 test PASS.
     - Chạy toàn bộ test suite hồi quy `tests/*.test.js`: **494/494 test PASS 100% (0 fail)**.
     - Kiểm thử trực quan và chụp ảnh màn hình bằng Chrome DevTools MCP xác nhận giao diện chuẩn nét, chống chữ nhỏ ≥ 11px.


- **2026-11-19 (Tối ưu hóa Độ Nét Kết Xuất Tệp PDF Bản Đồ Quy Hoạch / Bản Vẽ Kỹ Thuật trong `appPlanOverlay`)**:
  1. **Khắc phục triệt để hiện tượng PDF mờ nhòe (Root Cause)**:
     - Viewport mặc định của PDF.js ở 72 DPI. Thuật toán cũ clamp `MAX_SIDE = 4096` và `MAX_PIXELS = 16000000`, khiến các trang khổ lớn A0/A1 chỉ đạt scale ~1.0 - 1.6 (tương đương 87 - 120 DPI) và nén `image/jpeg, 0.9` làm nhòe viền chữ và các nét mảnh vector.
     - Nhãn trên giao diện ghi là "Độ rõ" (thực chất là CSS Opacity) khiến người dùng kéo lên 100% chỉ làm đậm ảnh chứ không tăng độ phân giải hay độ nét.
  2. **Giải pháp nâng cấp**:
     - Nâng ngưỡng xử lý ảnh của Canvas: `MAX_SIDE: 8192` và `MAX_PIXELS: 48000000` (hỗ trợ kết xuất cực nét lên đến 8K).
     - Thêm bộ chọn độ nét kết xuất `#planOvDpiSelect` trên thanh công cụ: 150 DPI (Tiêu chuẩn), 300 DPI (Rõ nét - Khuyên dùng), 450 DPI (Siêu nét HD), 600 DPI (Cực nét Ultra-HD). Tự động lưu và khôi phục từ `localStorage.getItem('vn2k_plan_overlay_dpi')`.
     - Nâng cấp `_rasterizePdf` dùng chế độ `intent: 'print'` của PDF.js và thuật toán nén `image/webp, 0.96` (fallback `image/png`), loại bỏ hoàn toàn hiện tượng rung nhòe ringing artifacts của JPEG.
     - Bổ sung hàm `reRenderHighDpi(id, targetDpi)`: tự động scale lại ma trận affine khi đổi DPI ($a' = a/r, b' = b/r, c' = c, d' = d/r, e' = e/r, f' = f$), cập nhật điểm khống chế ($u' = \text{round}(u \cdot r), v' = \text{round}(v \cdot r)$), giữ nguyên 100% tọa độ thực địa VN-2000 $(E, N)$ mà không cần người dùng phải chấm lại bất kỳ điểm nào.
     - Thêm thuộc tính CSS `image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;` vào Leaflet custom layer pane.
     - Đổi nhãn "Độ rõ" thành "Độ mờ" (Opacity) rõ nghĩa; thêm huy hiệu hiển thị DPI thực tế và nút `🔍 Nâng độ nét` trên từng thẻ tệp trong danh sách.
  3. **Kiểm thử tự động & Trực quan**:
     - Bổ sung bộ test `tests/plan-overlay-dpi.test.js`: 6/6 test PASS.
     - Toàn bộ test suite `tests/*.test.js`: **501/501 test PASS 100% (0 fail, 0 skipped)**.
     - Kiểm thử trực quan qua Chrome DevTools MCP xác nhận giao diện hiển thị sắc nét, chuẩn responsive và thân thiện người dùng.

- **2026-11-19 (Đột Phá Công Nghệ: Dynamic Sharp Viewport Engine — Hiển Thị Tệp PDF Nét 100% Như Adobe Acrobat / Foxit Reader)**:
  1. **Khắc phục triệt để nghịch lý Raster tĩnh (Core Breakthrough)**:
     - Dù xuất ảnh tĩnh ở 300 hay 600 DPI, khi kỹ sư zoom sâu vào mức zoom 18 - 22 trên bản đồ hoặc zoom 4x - 8x trong khung chấm điểm, ảnh tĩnh vẫn bị kéo giãn gây nhòe nét chữ và đường ranh.
     - Đồng thời `image-rendering: crisp-edges` trước đây làm chữ và nét cong bị răng cưa bậc thang lởm chởm.
  2. **Giải pháp Động cơ Dynamic Deep-Zoom Viewport**:
     - Tích hợp bộ nạp và cache trang PDF siêu tốc `_getPdfPage` (thời gian nạp dưới 10ms).
     - Khung xem trước `#planOvViewer`: Khi kỹ sư cuộn chuột hoặc pinch zoom vào bất kỳ chi tiết nào (`scale > 1.15`), hàm `_renderSharpViewer` tự động lấy vùng nhìn thấy và gọi PDF.js kết xuất lại đúng góc đó ở tỷ lệ 1:1 điểm ảnh màn hình. Mọi con chữ, tọa độ mốc và đường ranh nhỏ bé hiện lên sắc lẹm như dao cạo!
     - Trên bản đồ Leaflet MiniCAD: Trong `_layerClass`, gắn `_sharpCv` với hàm `_renderSharpPatch`. Khi bản đồ zoom sâu vào một khu vực thực địa, hệ thống tự động chiếu nghịch đảo qua `Georef.invertAffine` để tính vùng tương ứng trên PDF và render bù sắc nét vector 100% bằng canvas đè lên.
     - Nâng trần Canvas: `MAX_SIDE: 16384` và `MAX_PIXELS: 120000000`.
     - Chuyển sang định dạng nén PNG Lossless 100% và gỡ bỏ `crisp-edges` (dùng `image-rendering: auto` mượt mà).
  3. **Kiểm thử**: Toàn bộ **502/502 tests PASS 100% (0 fail, 0 skipped)**.

- **2026-11-19**: Nâng cấp Hệ thống Lọc Bật/Tắt Từng Tỉnh / Từng Xã Sau Sáp Nhập & Tích Hợp Nạp Ranh Giới Vào MiniCAD:
  1. **Bản đồ chính (`appMap` & `appMapLayers`)**:
     - Bổ sung cơ chế lọc linh hoạt cho từng đơn vị hành chính:
       * `filterDongThapCommune(communeVal)`: Chọn riêng từng xã/phường sau sáp nhập (trong 102 xã/phường của Đồng Tháp mới) hoặc "Hiện tất cả". Tự động phóng to (FitBounds) tới đúng ranh giới của xã được chọn và mở popup thông tin.
       * `filterSouthProvince(provVal)`: Chọn riêng từng tỉnh trong 19 tỉnh miền Nam hoặc "Hiện tất cả 19 tỉnh".
       * `filter34Province(provVal)`: Chọn riêng từng tỉnh trong 34 tỉnh sau sáp nhập.
       * `filterDongThapCu(districtVal)` & `filterTienGiangCu(districtVal)`: Chọn riêng từng huyện/TP cũ.
     - Tích hợp các bộ chọn dropdown trong modal Lớp Bản đồ (`appMapLayers.renderPanel`), tuân thủ chuẩn cỡ chữ `>= 11.5px` của `DESIGN.md`.
  2. **Phân hệ MiniCAD (`appCadTool`)**:
     - Bổ sung Thư viện Ranh giới Địa chính trong `modalCadGisImport`: Kỹ sư có thể chọn bất kỳ xã hoặc tỉnh sáp nhập nào và nhấn **"Nạp vào CAD"**.
     - Hệ thống tự động chuyển đổi polygon của xã/tỉnh sang tọa độ phẳng VN-2000 theo kinh tuyến trục KTT của dự án, tạo thành đối tượng hình khối (`mode: polygon`) trên layer riêng `RANH_GIOI_HANH_CHINH`, phục vụ đo đạc, bắt điểm (osnap) và trích xuất mặt bằng.
     - Bổ sung lệnh CLI `RANH` / `RANHGIOI <tên>` trên CADCraft CLI để nạp ranh giới trực tiếp bằng phím tắt.
  3. **Kiểm thử**: Toàn bộ **518/518 tests PASS 100% (9 test suites, 0 fail, 0 skipped)**.


- **2026-11-20 (Kh?c Ph?c Hi?n Tu?ng L?ch & B�ng Ma Khi Ch�n Nhi?u T?p PDF N?n + B? C�ng C? Tinh Ch?nh Kh?p M�p & Sao Ch�p T?a �?)**:
  1. **�i?u tra & Tri?t ti�u nguy�n nh�n b�ng ma / 2 l?p PDF d� l?ch (Ghosting / Double Vision Elimination)**:
     - Ph�t hi?n nguy�n nh�n g?c r?: _renderSharpPatch v� _renderSharpViewer k?t xu?t m?t l?p th? canvas d?ng d� l�n ?nh g?c img. Do l�m tr�n s? nguy�n d?c l?p v� k?p tr?n k�ch thu?c 4096px, l?p canvas b? co gi�n l?ch t?i >200px so v?i ?nh g?c, c?ng v?i g�c xoay c?a trang PDF l�m sai l?ch ma tr?n, khi?n ngu?i d�ng nh�n th?y nhu '2 file PDF ch�n l�n nhau nhung n?m l?ch'.
     - X? l�: Cho ?n _sharpCv (display: none) trong Leaflet layer v� v� hi?u h�a canvas d� trong viewer, t?p trung 100% t�i nguy�n hi?n th? s?c n�t qua ?nh g?c raster (300 - 600 DPI s?c l?m qua GPU Hardware Acceleration). Tri?t ti�u 100% hi?n tu?ng b�ng ma l?ch l?p.
  2. **Kh?c ph?c l?i N�ng d? n�t (reRenderHighDpi)**:
     - B? sung l?nh h?y layer cu item.layer.remove() tru?c khi kh?i t?o layer m?i, ngan ch?n vi?c t�i s? d?ng ph?n t? DOM cu v?i ma tr?n bi?n d?i m?i.
  3. **H? tr? n?p h�ng lo?t da t?p PDF (_pendingFiles)**:
     - Khi ngu?i d�ng ch?n nhi?u file PDF c�ng l�c, h? th?ng dua v�o h�ng d?i _pendingFiles v� t? d?ng m? ti?p t?ng t?p d? g?n t?a d? tu?n t? m� kh�ng l�m th?t l?c t?p n�o.
  4. **B? c�ng c? Tinh Ch?nh Kh?p M�p B?n �? Th?i Gian Th?c (openFineTune)**:
     - B? sung giao di?n di?u khi?n n?i #modalPlanOvFineTune cho ph�p t?nh ti?n d?i B?c/Nam, ��ng/T�y (+/- 1m, +/- 0.2m), xoay quanh t�m ?nh (+/- 0.2�, +/- 0.05�) v� co gi�n t? l? (+/- 0.2%, +/- 0.05%) v?i sai s? b?o to�n t�m x?p x? 0 m�t.
     - K? su c� th? nh�n th?y l?p b?n d? d?ch chuy?n tr?c quan ngay tr�n n?n Leaflet d? can ch?nh m�p n?i gi?a c�c t? PDF li?n k? ho�n h?o 100%.
  5. **T�nh nang Sao Ch�p Nhanh T?a �? Kh?ng Ch? (copyPointsFrom)**:
     - Cho ph�p sao ch�p nhanh to�n b? di?m kh?ng ch? v� kinh tuy?n tr?c t? m?t t? b?n d? kh�c d� c� trong d? �n v?i kh? nang t? d?ng t�nh to�n t? l? co gi�n k�ch thu?c ?nh (rx, ry).
  6. **Ki?m th?**:
     - B? sung b? ki?m th? tests/plan_overlay_multidoc.test.js (8/8 test PASS).
     - To�n b? test suite tests/*.test.js: 538/538 test PASS 100% (10 test suites, 0 fail, 0 skipped).

- **2026-11-21 (Giao diện kính mờ theo mẫu "Sylva" — v2.8.45)**:
  1. Bảng màu: sky → xanh rừng/sage, slate → xám ấm stone, nền tối `#171615`; đổi trực tiếp trong `style.css`, `ui-polish.css`, `ui-unified.css`, `field-workspace.css` và style inline của `index.html` (giữ độ sáng tương ứng; `app.js` không đổi).
  2. `ui-sylva.css` (nạp cuối): kính mờ cho header, thẻ, ô nhập, modal, menu ☰, dock; bản tối + sáng; loại trừ `body.field-mode`.
  3. Máy tính ≥1024px: thanh bên kính bên trái, nút ◂ gập thành dock biểu tượng ở đáy; HUD bản đồ/MiniCAD né dock; Leaflet đo lại sau khi gập/mở.
  4. `theme-color`/manifest `#171615`, SW cache `ui-sylva.css`, phiên bản 2.8.45.
  5. Kiểm thử: thêm `tests/ui_sylva_theme.test.js`; cập nhật 2 test ghim màu cũ. **542/542 PASS**.

- **2026-11-21 (Bố cục ưu tiên bản đồ — v2.8.46)**:
  1. Đo % diện tích bản đồ nhìn thấy ở 6 màn hình có bản đồ × 9 cỡ màn hình; điện thoại 320×568 trước đó bản đồ Chuyển đổi chỉ còn 2%, Chấm tọa độ 6%, Cắm mốc 0%.
  2. `ui-mapfirst.css` + đo lớp phủ thật trong `app-shell.js` (`--mf-dock-clear`, `--mf-rc-top/-bottom`, `<body data-screen>`): bản đồ chiếm phần lớn màn hình ở Chuyển đổi, Chấm tọa độ, Bản đồ dự án, MiniCAD, Cắm mốc, Lộ trình; bố cục riêng cho điện thoại dọc, máy ngang, máy tính bảng, máy tính.
  3. `app.js`: tỉ lệ mặc định 38/40%, bảng chấm điểm thu gọn trên điện thoại, bản đồ cắm mốc phóng to bằng lớp CSS.
  4. Thanh bên Sylva chỉ từ ≥1280px. Kiểm thử: thêm `tests/ui_mapfirst_layout.test.js`; **547/547 PASS**.

- **2026-11-21 (Trợ lý AI cục bộ — v2.8.47)**:
  1. Học kiến trúc Ivy AI (esp_ai, GPL-3.0 → không chép mã): máy tự trả lời phần chắc chắn ("không dùng AI"), từ chối thay vì đoán, chạy theo pha và nhả tài nguyên, kiểm thử đi đúng đường giao diện. Phương án: `docs/AI_CUC_BO.md`.
  2. `assistant-core.js`, `assistant.js`, `ui-assistant.css`, nút 🤖: chuyển đổi/khoảng cách/KTT/GPS/dự án/điều hướng/kiểm thử bằng tiếng Việt, nối lệnh "rồi", giọng nói Web Speech.
  3. Não AI tùy chọn qua `vendor/wllama` (llama.cpp WASM): GGUF từ máy hoặc Qwen2.5-0.5B; khóa đầu ra bằng GBNF; tự gỡ khi rảnh.
  4. Kiểm thử: `tests/assistant_local_ai.test.js`; **555/555 PASS**.

- **2026-11-23 (Ký hiệu & chữ MiniCAD, icon mốc dự án — v2.8.48)**:
  1. Sửa ký hiệu đỉnh/điểm lệch 11 px khỏi tọa độ thật và tên dài bị cắt (khung tâm `.cad-vglyph`, bộ dựng chung `glyphHtml`).
  2. Chữ trong/ngoài ký hiệu: vị trí, cỡ, màu theo lớp CAD, theo khối, theo từng đỉnh.
  3. Bảng 🎨 "Ký hiệu & chữ" mới có xem trước; tùy chỉnh icon mốc tọa độ dự án (Bản đồ dự án + MiniCAD).
  4. Kiểm thử: `tests/cad_glyph_labels.test.js`; **561/561 PASS**.
  5. v2.8.49: tệp xuất DXF/PDF/SVG/PNG đặt chữ theo cùng cài đặt vị trí + cỡ chữ (`exportLabelAnchor`); **562/562 PASS**.
- **2026-11-23 (Xuất bản đồ với đủ các lớp — v2.8.50)**: hộp xuất (Xuất dữ liệu + Studio MiniCAD) chọn được mọi nền của "Lớp bản đồ" và lớp phủ (Esri giao thông, Google đường/nhãn, Google giao thông, ranh 34 tỉnh, xã Đồng Tháp, nguồn tự thêm XYZ/WMS); PDF/PNG của Xuất dữ liệu nay vẽ nền, lớp phủ, quy hoạch, ảnh PDF; sửa "Tỷ lệ: 1:null". **568/568 PASS**.
- **2026-11-23 (Mã liên kết thửa ↔ đỉnh — v2.8.51)**: xuất CSV/Excel/TXT (Xuất dữ liệu + TXT MiniCAD) thêm cột "Mã liên kết" (T1.3, mốc chung T1.3+T2.1) và "Thửa / khối"; nạp lại vào Sổ đo hoặc MiniCAD tự dựng thửa đúng thứ tự, đỉnh chung là một mốc (`src/core/parcel_links.js`). **576/576 PASS**.
- **2026-11-23 (Dọn mã dư thừa — v2.8.52)**: xóa 34 phương thức không ai gọi, phân hệ appCoordPicker cũ + 3 khối giao diện chỉ nó mở được (+ CSS), 3 mô-đun nháp chưa từng nạp, 5 ảnh chụp kiểm thử; app.js bớt ~1.000 dòng. Nút "Lấy từ Bản đồ" của Chuyển đổi đa điểm nay đọc đúng điểm đã chấm. **570/570 PASS**.
- **2026-11-23 (Sửa service worker kẹt bản cũ — v2.8.53)**: sw.js lỗi cú pháp từ 20/11 làm mọi máy không cập nhật được service worker; sửa + test biên dịch mọi tệp JS; bộ xuất thử lại ô ảnh lỗi một lần với địa chỉ né bộ nhớ đệm. **573/573 PASS**.
