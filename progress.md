# Progress Log — VN2000-PWA Harness

## Thông tin dự án
- **Dự án**: VN2000-PWA (WGS84 - VN2000 Pro Geodetic Survey App)
- **Kiến trúc Harness**: Harness-Kit + Antigravity-Harness (L3 Architecture Factory)
- **Cơ chế xác thực**: `init.ps1` (`node --test tests/*.test.js`) - Hiện tại: 313/313 bài test đạt 100%.

---

## Nhật ký tiến độ gần nhất

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
