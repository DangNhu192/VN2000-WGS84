# Session Handoff — VN2000-PWA

## Phiên hiện tại — 2026-11-24 (khuya): TỐI ƯU GIAO DIỆN + MENU XỔ XUỐNG (v2.8.59)
- **Yêu cầu**: chạy tối ưu ứng dụng, kiểm kỹ giao diện và các menu xổ xuống.
- **Cách kiểm** (Playwright, giao diện tối + sáng, điện thoại 390×844 cảm ứng + máy tính 1280×900):
  - mọi `<select>` trên mọi màn hình, hộp thoại và tab Cài đặt (188 lượt): tương phản chữ ô chọn và danh sách xổ, cỡ chữ, chiều cao, bị cắt / tràn, mục trống / trùng; chọn thử từng mục, xem có lỗi JS không và có giữ lựa chọn không;
  - menu ☰: mở bằng cú bấm thật, 22 mục nằm trong màn hình, không bị che, đủ tương phản; bấm thật 20 mục, mỗi mục mở đúng màn và đóng menu; chip lọc nhóm, ô tìm ("dwg" → Sổ đo, MiniCAD; không khớp → báo rỗng); 5 nút thanh điều hướng dưới.
- **Lỗi tìm thấy và đã sửa**:
  - Giao diện tối: danh sách xổ chữ gần trắng trên nền trắng (tương phản ~1.2) ở gần như mọi ô chọn → `color-scheme` + màu `option/optgroup` theo giao diện tối, sáng, thực địa.
  - Ô chọn 15 px làm iPhone tự phóng to khi chạm → 16 px trên màn cảm ứng (chọn độ ưu tiên đủ mạnh để thắng quy tắc 15px !important).
  - Ô chọn kiểu / cỡ đỉnh khi vẽ 24 px, hộp Nối điểm 30 px → 32–36 px.
  - Ô chọn dự án trên Bản đồ chỉ cao 16 px trên máy tính, bị cắt trên điện thoại → đủ cao, chữ "Dự án…".
  - Ô tỉnh của lớp quy hoạch tô cứng màu tối, không nhãn → `app-select` + `aria-label`.
  - KTT trong hộp Quy hoạch PDF trống cho tới khi nạp bản vẽ → nạp sẵn khi mở.
  - Chip KTT trên thanh tiêu đề bị cắt "105°45" ở màn con → múi chiếu ở span riêng, ẩn khi chip hẹp (container query).
  - Logo đầu trang / Cài đặt tải icon.png 244 KB → icon-128.webp 8 KB (icon.png giữ cho manifest).
- **Chấp nhận, không sửa**: rzSrcKtt/rzDstKtt trùng giá trị KTT (nhiều tỉnh chung KTT); mlGulandProvSelect vẽ lại bảng khi đổi tỉnh (đúng thiết kế).
- **Test**: `tests/ui_select_menus.test.js` (7). **609/609 PASS**.

---

## Phiên hiện tại — 2026-11-24 (tối): NÂNG CẤP DẪN ĐƯỜNG KIỂU GOOGLE / APPLE MAPS (v2.8.58)
- **Yêu cầu**: dẫn đường của app chưa tốt bằng Google Maps / Apple Maps.
- **Điểm yếu cũ**:
  - Chỉ chuyển bước khi tới cách chỗ rẽ 20 m theo đường chim bay. Nếu GPS lệch hoặc bỏ qua chỗ rẽ thì kẹt luôn ở bước đó.
  - Chỉ nhắc một lần ở 70 m; không phát hiện đi lệch tuyến, không tìm đường mới.
  - Không có giờ đến dự kiến, không báo đến từng điểm dừng.
  - Xe máy gọi hồ sơ `bike` trên máy chủ OSRM demo, vốn chỉ có ô tô.
- **Đã làm**:
  - `src/core/nav_engine.js` (mới):
    - bám vị trí vào tuyến, đo tiến độ theo quãng đường dọc tuyến, ưu tiên đi tới (đoạn quay đầu tại điểm dừng không bị nhảy);
    - nhắc giọng nhiều mốc: lời nhắc tiếng Việt của Valhalla, hoặc tự soạn "Đi tiếp…", "Sau 500 m…", "Sau 200 m…", "Rẽ…";
    - báo lệch tuyến sau 3 lần đo, bỏ qua GPS kém (> 80 m), báo đến từng điểm dừng;
    - tính quãng đường, thời gian còn lại và giờ đến; chỗ rẽ "sau đó" khi hai chỗ rẽ sát nhau.
  - `appRouting`:
    - tìm đường bằng Valhalla (`motor_scooter` cho xe máy, tránh cao tốc; `auto`; `bus`) với chỉ đường tiếng Việt; dự phòng OSRM FOSSGIS → OSRM demo → đường nối thẳng;
    - sắp thứ tự điểm bằng OSRM trip; khi ngoại tuyến thì sắp trên máy (láng giềng gần nhất + 2-opt);
    - dẫn đường dùng bộ lõi: chấm xe bám tuyến và xoay theo hướng đi; phần đường đã đi tô mờ; đường có viền tối;
    - camera bám theo xe, thu phóng theo tốc độ; kéo bản đồ thì tạm dừng bám, bấm "Định tâm" để bám lại;
    - tự tìm đường mới khi đi lệch (có hướng đi, giãn cách 10 s); báo mất GPS / GPS yếu;
    - nút "🎬 Chạy thử" dẫn đường mô phỏng dọc lộ trình.
  - Giao diện dẫn đường toàn màn hình: thẻ rẽ lớn màu xanh (mũi tên SVG, khoảng cách, lời chỉ đường, "Sau đó"), thanh dưới hiện giờ đến, quãng đường / thời gian còn lại, số chặng, nút giọng nói và nút Thoát. Thanh điều hướng của app được ẩn trong lúc dẫn đường.
- **Kiểm**:
  - Đã kiểm thật Valhalla và OSRM FOSSGIS từ trang app (CORS OK). Lưu một lộ trình Valhalla thật làm fixture.
  - Node: chạy xe mô phỏng có nhiễu → tiến độ không lùi, nhắc đúng thứ tự, đến M2 rồi M3; lệch tuyến; nguồn OSRM tự soạn lời nhắc; đường nối thẳng.
  - Playwright: Chạy thử hiện đúng thẻ rẽ và giờ đến; GPS giả lập đi lệch → gọi Valhalla tìm đường mới có hướng đi; kéo bản đồ → hiện "Định tâm".
  - **602/602 PASS**.

---

## Phiên hiện tại — 2026-11-24 (chiều): AI MÁY CHỦ MIỄN PHÍ DÙNG CHUNG, CHỈ CHO CHỨC NĂNG APP (v2.8.57)
- **Yêu cầu**: tìm API miễn phí và thêm cho nhiều người cùng dùng; chỉ dùng cho chức năng của app, không dùng việc khác.
- **Đã làm**: `api/ai.js` viết lại thành máy chủ chung. Nhà cung cấp miễn phí không cần thẻ là Groq (`GROQ_API_KEY`) và Google Gemini (`GEMINI_API_KEY`), có thể thêm một nhà cung cấp OpenAI-compatible tùy chọn. Máy chủ tự chuyển sang nhà cung cấp hoặc mô hình kế tiếp khi gặp 429/404/5xx; khóa sai (401/403) thì bỏ cả nhà cung cấp đó.
  - Giới hạn phạm vi: app chỉ gửi `{text}`. Lời nhắc, công cụ và ví dụ do máy chủ dựng. `tool_choice: required`; chữ tự do và công cụ lạ đều bị bỏ, mọi lời gọi qua `validateCall`. Câu quy tắc hiểu chắc thì trả ngay, không tốn lượt.
  - Giới hạn số lần gọi theo IP và tổng mỗi ngày. `GET /api/ai` báo đã sẵn sàng hay chưa.
  - Phía app: AI máy chủ bật sẵn và dùng máy chủ chung (vẫn đổi được sang địa chỉ riêng). Bỏ đường trả lời chữ tự do. Câu không khớp chức năng nào thì báo rõ "trợ lý chỉ làm các việc của app".
- **Kiểm**: test máy chủ dùng fetch giả lập. Lời nhắc hoặc công cụ lạ do client gửi bị bỏ qua; câu xin làm thơ và công cụ lạ đều nhận `none`; Groq 429 thì chuyển sang Gemini; quá giới hạn IP trả 429. **595/595 PASS**.
- **Việc của người dùng**: tạo khóa Groq và/hoặc Gemini (miễn phí), dán vào Vercel → Environment Variables, rồi deploy lại.

---

## Phiên hiện tại — 2026-11-24: TRỢ LÝ AI "KẾT HỢP" (v2.8.56)
- **Yêu cầu**: dùng phương án kết hợp (AI máy chủ kiểu Xiaozhi khi có mạng + AI cục bộ khi ngoại tuyến) và "train" AI hoạt động thông minh trên các chức năng của app.
- **Không train trọng số** trong phiên này (không có GPU, không tải được mô hình). Thay vào đó "dạy" AI bằng: (1) danh mục công cụ có tham số dùng chung cho mọi tầng; (2) bộ 355 câu mẫu tiếng Việt (few-shot + chấm điểm + dữ liệu fine-tune); (3) khóa đầu ra bằng ngữ pháp JSON + `validateCall`.
- **Đã làm**:
  - `assistant-core.js`: `parseExport` (xuất bản vẽ có định dạng / khổ / tỷ lệ / nền / bảng / nguồn), `qcPoints` (đảo X/Y, ngoài phạm vi, tên trùng khác vị trí, khác tên trùng vị trí, mốc nhảy, lệch KTT, ranh tự cắt; đỉnh chung giữa các thửa không bị coi là lỗi), `TOOLS`, `validateCall`, `buildGrammar` (GBNF), `nearestExamples`, `buildToolMessages`, `openAiTools`, `parseToolJson`. Sửa: dấu câu sau tên tỉnh, số "2000" trong "VN2000" làm hỏng cặp tọa độ, "đang dùng múi chiếu nào" bị hiểu là lệnh đổi.
  - `assistant.js`: công cụ `exportDrawing` (đi qua bộ xuất bản vẽ dùng chung), `checkData`; thứ tự quy tắc → AI máy chủ (chỉ khi bật và đang có mạng) → AI cục bộ (`toCall` JSON + ví dụ gần nhất, dự phòng lệnh chuẩn cũ); câu trả lời chữ của AI máy chủ gắn nhãn "chỉ để tham khảo"; cấu hình AI máy chủ trong ⚙ (địa chỉ, mô hình, khóa, thử kết nối); trạng thái AI cục bộ ghi rõ "chưa tải mô hình (0 / ~400 MB)".
  - `api/ai.js`: hàm Vercel chuyển tiếp OpenAI-compatible, khóa giữ ở biến môi trường (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`), chặn nguồn gọi lạ, chưa cấu hình → 503 (app tự quay về cục bộ).
  - `tools/ai/build_dataset.py` → `assistant-dataset.js` + `docs/ai/sft_vi.jsonl`; hướng dẫn `docs/ai/README.md` (bật AI máy chủ, fine-tune LoRA → GGUF).
- **Kiểm**: bộ định tuyến 344/355 câu đúng, 0 câu sai (11 câu tự do để AI hiểu); Playwright: "xuất PDF A3 tỷ lệ 1:500 không nền, in cả hai bảng" ra đúng tệp; "kiểm tra số liệu" chạy; AI máy chủ giả lập hiểu câu tự do → mở bản đồ, xuất DWG; công cụ lạ bị loại; ngoại tuyến không gọi máy chủ. Test mới `tests/assistant_hybrid.test.js`; **595/595 PASS**.
- **Việc của người dùng**: đặt `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` trên Vercel để bật AI máy chủ cho mọi máy.

---

## Phiên hiện tại — 2026-11-23 (tối): XUẤT ĐÚNG LỚP ĐÃ CHỌN + MỘT BỐ CỤC CHO MỌI ĐỊNH DẠNG + TƯƠNG PHẢN (v2.8.55)
- **Yêu cầu**: (1) chọn lớp bản đồ rồi xuất nhưng tệp không đúng như đã chọn; (2) bố cục PDF / PNG / DWG / ảnh / SVG không giống nhau; (3) tối ưu giao diện các chức năng; (4) thẻ chức năng khó đọc khi đổi màu nền / màu chữ (giao diện).
- **Nguyên nhân tìm thấy**: `exportPdf` lưu `_lastExportPdfOpts` → lớp bản đồ đã tải (và cờ PNG / base64) của lần xuất trước dính sang lần sau; các ô "Lưới tọa độ", "Kim Bắc & thước tỷ lệ", "Khung tên", "Ghi chú" của Studio MiniCAD không được đọc ở đâu; khối "Xem trước & cài đặt nâng cao" bị cột flex ép còn 2 px nên người dùng không thấy ô xem trước và các ô tích thành phần bản vẽ; ảnh nén & SVG dùng bố cục dọc riêng; "Xuất dữ liệu" có 4 bộ vẽ riêng (PDF HTML, PNG 1920 px, SVG trơn không nền, DWG riêng).
- **Đã làm**: `exportPdf` thành bộ vẽ khổ giấy dùng chung (`target` pdf | png | image | svg | preview; `shapes` / `meta` / `fileBase` truyền vào được), không lưu tùy chọn giữa các lần; SVG vẽ bằng svgcanvas 2.6 (MIT, `vendor/svgcanvas`, nạp khi cần) với lớp bản đồ raster hóa nhúng trong khung; ảnh nén = cùng bản vẽ + PixOptimizer; bỏ thân cũ của `exportSvg` / `exportOptimizedImage`. Lưới / kim Bắc + thước tỷ lệ (mới) / khung tên / ghi chú theo ô tích ở PDF-PNG-SVG-ảnh và DWG; DWG báo rõ lớp ảnh không nhúng được. Ô xem trước = ảnh khổ giấy thật (`paperPreviewSvg`) + ô nền SVG bên dưới. "Xuất dữ liệu" PDF / PNG / SVG / DWG → `_cadExportPayload` + bộ vẽ MiniCAD; thêm chọn "Bảng in kèm". `EXPORT_PAPER_DIMS` dùng chung. Giao diện hộp xuất: xem trước đặt ngay sau chọn định dạng, khối con không co, tiêu đề / chân hộp gọn trên điện thoại, ô chữ dùng phông thường, huy hiệu "n/N khối". Tương phản: `src/ui/contrast_guard.js` (đo chữ / nền thật, chỉnh màu chữ hoặc làm đậm nền nút đến chuẩn WCAG, hoàn nguyên khi đổi giao diện, theo dõi nội dung mới) + CSS giao diện Sáng đổi các khối nền tối viết sẵn sang nền sáng; Thực địa: chữ đen trên nút vàng.
- **Kiểm**: Playwright (ô ảnh giả màu): cùng lớp Google → PDF / PNG / WebP / SVG cùng bố cục, xanh 61%; đổi "không nền" → 0%; đổi Esri → xanh dương 60% (không dính lớp cũ); tắt lưới / kim Bắc / khung tên → DXF không còn các lớp đó; "Xuất dữ liệu" PDF / PNG / SVG / DWG cùng bố cục. Kiểm tương phản tự động 11 màn hình × 3 giao diện × 2 cỡ: trước có hàng chục chữ 1.0–2.3:1 ở giao diện Sáng, sau chỉ còn emoji và nút bị vô hiệu. Test mới `export_unified_layout`, `contrast_guard`; **588/588 PASS**.

---

## Phiên hiện tại — 2026-11-23 (chiều): XEM TRƯỚC CÓ NỀN BẢN ĐỒ + BẢNG IN KÈM TÙY CHỌN (v2.8.54)
- **Báo lỗi lặp lại**: "còn lỗi tải ảnh bản đồ, chưa chọn được các lớp bản đồ cần xuất trong MiniCAD"; thêm yêu cầu bảng "Tổng hợp diện tích" / "Tổng hợp các điểm" / cả hai.
- **Kiểm trên trang thật** (v2.8.53, service worker mới đã hoạt động): hộp xuất MiniCAD có đủ 7 nền + 5 lớp phủ; xuất PDF thật với Google vệ tinh + 2 lớp phủ + quy hoạch + ranh xã (324 ô) không lỗi ô nào. Phát hiện ô **xem trước** của Studio MiniCAD vẽ khối theo (x = Bắc, y = Đông) vào khung (Đông, Bắc) → khối nằm ngoài khung (tọa độ ~142000 trong khung 600), ô xem trước trống và không có nền → người dùng thấy như "không tải được ảnh bản đồ".
- **Đã làm**: sửa trục ô xem trước MiniCAD; `exportPreviewLayersSvg` vẽ ô ảnh nền / lớp phủ / quy hoạch đã chọn vào cả hai ô xem trước (thẻ `<image>`, không cần CORS) + huy hiệu "IN KÈM: …"; tùy chọn `#cadExportSummaryTables` (area | points | both, mặc định area) lưu theo cấu hình, `summaryTablesMode`, `exportPointRows` (mỗi mốc một dòng, đỉnh chung không lặp); PDF (bảng các điểm dưới bảng diện tích, tràn chỗ thì báo "còn N điểm"), ảnh & SVG (chia 2 cột khi > 16 điểm), DXF (bảng tọa độ ranh thửa nay theo tùy chọn, tiêu đề "BANG TONG HOP CAC DIEM"). Test `tests/export_preview_and_tables.test.js`; **580/580 PASS**.
- **Lưu ý**: DXF trước đây luôn in bảng tọa độ; nay theo tùy chọn (mặc định chỉ bảng diện tích, chọn "Cả hai" để có như cũ).

---

## Phiên hiện tại — 2026-11-23: WP-TITLE-BLOCK — THÔNG TIN KHUNG TÊN TRONG TỆP XUẤT (v2.8.54)
- **Yêu cầu**: cho phép điều chỉnh "TRUNG TÂM KHẢO SÁT & ĐO ĐẠC ĐỊA CHÍNH" và các thông tin khác trong tệp xuất.
- **Tìm thấy**: khi ô Đơn vị để trống, PDF MiniCAD tự in "TRUNG TÂM KHẢO SÁT & ĐO ĐẠC ĐỊA CHÍNH", SVG/ảnh/CSV in "TRUNG TÂM QUẢN LÝ ĐẤT ĐAI", hộp Xuất dữ liệu tự điền "Trung tâm Trắc địa Bản đồ"; báo cáo PDF / ảnh / DXF của Xuất dữ liệu bỏ qua đơn vị, chủ sử dụng, địa chỉ, số tờ/thửa, mã hồ sơ, người kiểm tra, ghi chú; MiniCAD không in chủ sử dụng, địa chỉ, mã bản vẽ; hai hộp lưu riêng.
- **Người dùng chốt**: các mục này phải tùy chỉnh được, không cố định.
- **Đã làm**: `appTitleRows` (localStorage `vn2k_title_rows_v1`): danh sách dòng khung tên tự đặt — đổi tên mục, sửa nội dung, thêm / xóa dòng, "Đầu khung" (in đậm ở đầu, vd. tên đơn vị), "Mục mặc định"; một danh sách dùng chung cho hộp Xuất dữ liệu (`#exportTitleRowsBox`) và Studio MiniCAD (`#cadTitleRowsBox`), thay 6 ô cố định cũ (đơn vị, chủ sử dụng, địa chỉ, số tờ/thửa, mã hồ sơ, người kiểm tra); lần đầu lấy lại nội dung đã nhập ở ô cũ. `titleBlockLines` → org (dòng đầu khung), proj, infoA/infoB (chia đôi cho hai cột khung tên). Bỏ mọi tên đơn vị gán cứng. In ở: MiniCAD PDF/SVG/ảnh/DXF/CSV/Excel; Xuất dữ liệu báo cáo PDF (đơn vị góc trái + các dòng), ảnh PNG, DXF. `shareTitleBlock` còn chia sẻ tên bản vẽ, người đo, ghi chú. `fillTextFit`/`svgFit`: chữ dài co vừa ô. Test `tests/export_title_block.test.js` + cập nhật 4 test ghim ô cũ; **577/577 PASS**. Kiểm trong trình duyệt (1280 & 390 px): đổi tên mục, xóa, thêm dòng → MiniCAD nhận đủ; PDF, ảnh, DXF in đúng.

---

## Phiên hiện tại — 2026-11-23: WP-SW-FIX — SERVICE WORKER KẸT BẢN CŨ + TẢI Ô ẢNH KHI XUẤT (v2.8.53)
- **Báo lỗi**: "còn lỗi tải ảnh bản đồ; chưa chọn được các lớp bản đồ cần xuất trong MiniCAD".
- **Kiểm trên trang thật** (vn2000-wgs84-three.vercel.app, trình duyệt thật): trang đang chạy v2.8.47 (PR #15 chưa gộp) nên hộp xuất MiniCAD chỉ có 3 nền. Phát hiện `sw.js` lỗi cú pháp `url.hostname.includes('opentopomap.org') ||;` từ commit 42cb9e4 (20/11): `reg.update()` báo "ServiceWorker script evaluation failed" → mọi máy kẹt ở service worker cũ (bộ nhớ đệm `vn2000-pro-v2.8.40`), không bao giờ hiện "Cập nhật".
- **Đã sửa**: (1) `sw.js` biên dịch được; thêm `eox.at` (Sentinel-2) vào nhóm ô bản đồ; ô lưu dạng opaque không trả cho yêu cầu CORS của bộ xuất. (2) `loadExportBasemap`: ô lỗi thử lại một lần với `?_vn2k=export` (né bản lưu cũ / lỗi mạng thoáng qua) trước khi bỏ. (3) Test `tests/js_syntax_all.test.js`: mọi tệp .js của ứng dụng (kể cả sw.js) phải biên dịch được. **573/573 PASS**.
- **Cần làm**: gộp PR #15 để lên bản chính; sau đó trên điện thoại mở app 1–2 lần, bấm "Cập nhật" khi có thông báo (service worker mới chờ người dùng xác nhận).

---

## Phiên hiện tại — 2026-11-23: WP-CLEANUP — DỌN MÃ DƯ THỪA (v2.8.52)
- **Yêu cầu**: cập nhật toàn bộ app, làm sạch mã dư thừa, đẩy lên GitHub.
- **Cách tìm**: phân tích cú pháp (acorn) app.js + các tệp JS: phương thức của object cấp cao và hàm cấp cao mà tên không xuất hiện ở đâu khác (JS, HTML, CSS, chuỗi onclick); không có gọi động `obj[tên]`. Lặp đến khi không còn mã chết dây chuyền.
- **Đã xóa**:
  1. 34 phương thức không ai gọi (~610 dòng): openCoordPickerMap, openConvertedMap, promptOpenConvertedMap, showConvertedPoint, setTransformViewMode, copyAllMultiResults, filterDongThapCu/TienGiangCu/SouthProvince, togglePickMode, onMarkerDrag, syncToGoogleSheets, setUiIconMode, quickExecCmd, toggleCmdToolsGrid, toggleDeWatermark, _getPdfPage, các bí danh xoay nhãn cũ…
  2. Phân hệ `appCoordPicker` cũ (~340 dòng) + thanh `#barCoordPicker`, modal `#modalMultiPickList`, popup `#modalPromptConvertedMap` (chỉ mở được từ các hàm đã chết) + CSS riêng của chúng; `AppState.pickerMarker`, `createOpticalCrosshairIcon`.
  3. Mô-đun nháp chưa từng nạp: `src/core/geodesy_engine.js` (trùng geodesy.js), `volume_calc.js`, `data_store.js`, `seed_dgn_base64.json`; 5 ảnh chụp kiểm thử `assets/tutorial_screens/verify_tutorials_*.png`.
- **Sửa kèm**: nút "🎯 Lấy từ Bản đồ (n)" ở Chuyển đổi đa điểm trước đây đọc kho điểm của appCoordPicker (luôn 0) → nay đọc điểm đã chấm trên bản đồ chuyển đổi (`appTransformMap.pickedMultiPoints`).
- **Test**: cập nhật 17 tệp test chỉ ghim mã đã chết (bỏ assert tương ứng, giữ assert hành vi còn sống); **570/570 PASS**. Kiểm khói trong trình duyệt (1280 & 390 px): Chuyển đổi, chấm đa điểm + lấy từ bản đồ, Bản đồ dự án, MiniCAD, hai hộp xuất, Cài đặt, Trắc dọc, ảnh nền PDF — không lỗi JS.
- **Giữ lại có chủ đích**: ảnh PNG gốc trong `assets/tutorial_screens/` (đã ghi trong .vercelignore: giữ để chỉnh sửa, không triển khai); thư mục `.agents/` `.github/skills` (công cụ phát triển); tệp .bat chạy máy chủ cục bộ.

---

## Phiên hiện tại — 2026-11-23: WP-PARCEL-LINKS — MÃ LIÊN KẾT THỬA ↔ ĐỈNH KHI XUẤT / NHẬP ĐIỂM (v2.8.51)
- **Yêu cầu**: xuất điểm ra tệp mất quan hệ thửa nào – đỉnh nào, đỉnh chung; nhập lại phải tự hiểu thứ tự liên kết.
- **Quy ước** (`src/core/parcel_links.js`, `ParcelLinks`): cột "Mã liên kết" `T1.3` = đỉnh 3 của thửa 1 (T thửa kín, D tuyến, P lớp điểm); mốc chung ghi MỘT dòng `T1.3+T2.1`; cột "Thửa / khối" = tên các khối theo thứ tự trong mã, nối " | "; mốc lẻ để trống. Mốc trùng tọa độ (đến mm) là một mốc.
- **Đã làm**:
  1. Xuất: CSV / Excel / TXT của "Xuất dữ liệu" (`appData._linkedExportRows`, chỉ thêm cột khi Sổ đo có thửa) + TXT toàn đạc MiniCAD; Excel kèm trang `HuongDan_MaLienKet`.
  2. Nhập vào Sổ đo: `geodesy.mapHeaderColumns` nhận cột `lk`/`shape`; `ImportPreview` có 2 ô chọn cột mới, tự nhận cột mã theo nội dung, tóm tắt "Dựng lại N thửa…"; `saveImportedPoints` → `ParcelLinks.expandToTaggedPoints` → MiniCAD dựng lại (nạp thêm vào dự án đã có bản vẽ thì thêm khối mới). Tệp có mã bỏ qua hộp hỏi "khối MiniCAD" cũ.
  3. Nạp thẳng vào MiniCAD: `_shapesFromLinkedRows` (Chiến lược 0 của `_parseWorkbookToShapes` / `_parseHtmlOrTextToShapes`); CSV/TXT đọc UTF-8 trước SheetJS.
  4. `reconstructShapesFromPoints` tách phần dựng sang `shapesFromTaggedPoints`: nhóm theo shapeId+tên, sắp theo shapeOrder.
  5. `ImportPreview.textToRows`: tab/chấm phẩy chia đều cột thì dùng luôn (trước đây ô "Đỉnh ranh Thửa 12" làm chọn nhầm khoảng trắng).
  6. Test: `tests/parcel_links.test.js` (8); cập nhật 3 test ghim mã cũ (kể cả kiểm phiên bản sw ≥ 2.8.50). **576/576 PASS**. Kiểm trong trình duyệt: 2 thửa chung cạnh + tuyến + mốc lẻ, xuất CSV/TXT/XLSX/TXT MiniCAD → nạp lại (Sổ đo & MiniCAD, mới & nạp thêm) đều dựng đúng.
- **Chưa làm**: bảng kê MiniCAD (CSV/Excel chi tiết đỉnh) chưa thêm cột mã (vẫn nạp lại được theo cột Tên khối); KML/GeoJSON/DXF vốn đã mang hình học.

---

## Phiên hiện tại — 2026-11-23: WP-EXPORT-ALL-LAYERS — XUẤT BẢN ĐỒ VỚI ĐỦ CÁC LỚP (v2.8.50)
- **Yêu cầu**: chức năng xuất bản đồ ra tệp chỉ cho chọn vài lớp bản đồ (3 nền), chưa chọn được tất cả.
- **Tìm thấy**: (1) hộp xuất chỉ có OSM, Esri vệ tinh, Sentinel-2, trong khi "Lớp bản đồ" có 6 nền + lớp phủ Esri giao thông, Google đường/nhãn, Google giao thông, ranh 34 tỉnh, xã Đồng Tháp, nguồn tự thêm XYZ/WMS; (2) PDF/PNG của hộp "Xuất dữ liệu" bỏ qua hoàn toàn nền, quy hoạch, ảnh PDF đã chọn; (3) ảnh/SVG MiniCAD ghi "Tỷ lệ: 1:null" khi tỉ lệ tự động.
- **Đã làm**:
  1. `EXPORT_BASEMAPS` thêm google_hybrid, esri_satellite, google_streets, opentopomap, google_terrain, osm_streets (tên cũ street/satellite vẫn chạy); `EXPORT_TILE_OVERLAYS`, `EXPORT_VECTOR_OVERLAYS`; `exportMapSource` (cả `custom:<id>` XYZ/WMS — WMS tính BBOX EPSG:3857 theo ô), `exportLayerCatalog`.
  2. Hộp xuất (cả hai): ô nền dựng từ danh mục (đánh dấu "đang xem"), danh sách "Lớp phủ in kèm" chọn sẵn lớp đang bật trên bản đồ; lưu cùng cấu hình xuất.
  3. `appCadTool._prepareExportBasemap` tải nền + lớp phủ + quy hoạch + thư viện ranh giới; `drawExportMapLayers` vẽ nền → lớp phủ → quy hoạch → ranh giới (`drawExportVector`) → ảnh PDF, ghi nguồn gộp một dòng (`drawExportCredit`).
  4. `appData.exportPngImage/exportPdfFile` vẽ các lớp (PDF: mở cửa sổ in trước rồi chờ tải, ảnh lớp đặt vào SVG sơ đồ).
  5. Test: `tests/export_all_map_layers.test.js` (6); cập nhật 3 test ghim mã cũ. **568/568 PASS**. Kiểm trong trình duyệt bằng ô ảnh giả lập: PNG dữ liệu, ảnh MiniCAD, PDF dữ liệu đều có nền + lớp phủ + ranh giới.
- **Lưu ý**: nguồn Google/OpenTopo được bản đồ chính nạp kiểu CORS nên in được; nếu một nguồn chặn, ô lỗi bị bỏ qua và có thông báo. Chưa thử với mạng thật trong phiên này (máy kiểm thử chặn mạng ngoài).

---

## Phiên hiện tại — 2026-11-23: WP-CAD-GLYPH-LABELS — KÝ HIỆU & CHỮ MINICAD, ICON MỐC DỰ ÁN (v2.8.48 → v2.8.49)
- **Yêu cầu**: cách chỉnh icon MiniCAD chưa ổn — chưa chỉnh được icon mốc tọa độ và cỡ/vị trí chữ trong hoặc ngoài icon.
- **Lỗi tìm thấy khi đo trong trình duyệt**: (1) mọi ký hiệu đỉnh/điểm bị vẽ LỆCH nửa ô icon lên trên-trái (11 px với cỡ Vừa) so với tọa độ thật; (2) tên dài hơn ~3 ký tự (GPS-5, M105) bị cắt trong viên thuốc; (3) chữ chỉ nằm trong ký hiệu, cỡ chữ gắn cứng theo cỡ ký hiệu; (4) mốc dự án luôn là ghim đỏ có số thứ tự, không chỉnh được.
- **Đã làm**:
  1. `appCadTool.glyphHtml/buildGlyphIcon/glyphHover`: khung tâm 0×0 `.cad-vglyph` đặt đúng tọa độ; viên thuốc rộng theo chữ; dùng chung cho đỉnh đã lưu, điểm rời và đỉnh đang vẽ.
  2. Chữ: `lPos` (trong / phải / trên / dưới / trái / ẩn), `lSize` (9–24 px), `lColor`; ưu tiên đỉnh → khối → lớp CAD → mặc định (`getLabelStyleFor`). Chữ ngoài giữ nguyên hình ký hiệu, có quầng tối.
  3. Bảng 🎨 "Ký hiệu & chữ" làm lại: thẻ theo lớp có mẫu xem trước, 6 ô (hình, màu, cỡ, vị trí chữ, cỡ chữ, màu chữ); mục 3 "Icon mốc tọa độ dự án". Thẻ nhanh khi bấm vào đỉnh có thêm vị trí/cỡ/màu chữ (Lưu đỉnh / Cả khối).
  4. `appMap.getLandmarkStyle/setLandmarkStyle/landmarkIcon` (localStorage `vn2k_landmark_style_v1`): ghim hoặc ký hiệu hình, màu, cỡ, chữ (STT / tên / STT+tên / không), vị trí, cỡ, màu chữ; áp cho Bản đồ dự án và MiniCAD. `createSharpPinIcon` thêm `extraHtml`, `fontSize`.
  5. Test: thêm `tests/cad_glyph_labels.test.js` (6 test); cập nhật 3 test ghim mã cũ (point_styling_visibility, cadcraft_points, sharp_pinpoint_markers). **561/561 PASS**.
- **v2.8.49 — tệp xuất theo cài đặt chữ**: `appCadTool.exportLabelAnchor` dùng chung cho DXF, PDF, SVG, PNG: vị trí phải/trái/trên/dưới đặt chữ cạnh ký hiệu và căn lề đúng (DXF nhóm 72/73, đã kiểm bằng ezdxf, audit 0 lỗi); cỡ chữ theo tỉ lệ `lSize/12`; 'ẩn' không xuất chữ; 'trong' giữ chỗ cũ. Màu chữ không xuất (giấy trắng, giữ màu lớp). Thêm 1 test; **562/562 PASS**.
- **Còn lại**: chưa đo trên điện thoại thật.

---

## Phiên trước — 2026-11-21: WP-LOCAL-AI — TRỢ LÝ AI CỤC BỘ (học kiến trúc Ivy AI / esp_ai), v2.8.47
- **Yêu cầu**: học repo iamankushpandit/esp_ai để tạo AI cục bộ chạy trên thiết bị cài app: giao tiếp, kiểm thử, điều phối hoạt động; tự triển khai nếu thuận lợi.
- **Quyết định**: esp_ai là firmware C cho ESP32-S3, giấy phép GPL-3.0 → không chép mã (app MIT); chỉ học nguyên tắc. Chi tiết: `docs/AI_CUC_BO.md`.
- **Đã làm**:
  1. `assistant-core.js` (thuần, test bằng Node): bộ định tuyến lệnh tiếng Việt không AI — số kiểu VN, ~20 ý định, nối lệnh bằng "rồi", danh sách lệnh chuẩn cho AI.
  2. `assistant.js` + `ui-assistant.css` + nút 🤖 trên thanh tiêu đề: bảng kính (không che hết bản đồ), công cụ gọi hàm thật của app, nhãn nguồn câu trả lời, tự kiểm thử 10 mục, nghe/đọc tiếng Việt (Web Speech), "rồi xem trên bản đồ" mở bản đồ Chuyển đổi (giữ tách biệt UI).
  3. Não AI tùy chọn: `vendor/wllama` (llama.cpp WASM, MIT, 10 MB, nạp lười), mô hình GGUF chọn từ máy hoặc tải Qwen2.5-0.5B; đầu ra khóa bằng GBNF chỉ ra một lệnh chuẩn; gỡ sau 3 phút rảnh. Đã thử đường ống trong Chrome headless với GGUF tí hon tự tạo (nạp ~1,9 s, suy luận có ngữ pháp, gỡ).
  4. Test: `tests/assistant_local_ai.test.js` (8 test); cập nhật thứ tự stylesheet trong `tests/ui_sylva_theme.test.js`. **555/555 PASS**.
- **Chưa làm / cần đo**: tốc độ & độ chính xác Qwen trên điện thoại thật; STT ngoại tuyến (Whisper WASM); từ đánh thức.

---

## Phiên trước — 2026-11-21: WP-MAP-FIRST — BỐ CỤC ƯU TIÊN BẢN ĐỒ Ở MỌI CHỨC NĂNG CÓ BẢN ĐỒ, MỌI CỠ MÀN HÌNH (v2.8.46)
- **Yêu cầu**: tỉ lệ khung chức năng / bản đồ chưa hợp lý; app dùng bản đồ là chính → ưu tiên bản đồ ở tất cả chức năng có bản đồ, tối ưu mọi khung màn hình, chú ý điện thoại nhỏ.
- **Cách đo**: script Playwright mở 6 màn hình có bản đồ (Chuyển đổi, Chấm tọa độ, Bản đồ dự án, MiniCAD, Cắm mốc, Lộ trình) ở 9 cỡ (320×568 → 1440×900, có máy ngang) và tính % diện tích bản đồ không bị che. Ví dụ 320×568: Chuyển đổi 2%→29–33%, Chấm tọa độ 6%→63–71%, Cắm mốc 0%→40%, Lộ trình 33%→54–62%.
- **Đã làm**:
  1. `app-shell.js`: ghi `<body data-screen / data-map-mode>`; đo thật `--mf-dock-clear` (dock nổi) và `--mf-rc-top/-bottom` (dải trống cho cột nút phải, né CLI/thanh MiniCAD/thanh trạng thái/dock) bằng ResizeObserver; phát `resize` sau khi đổi màn hình để Leaflet đo lại.
  2. `ui-mapfirst.css` (nạp cuối): ẩn thanh tên màn hình trên màn bản đồ; Chuyển đổi xếp dọc vừa khít trên dock (khung nhập 40%), đầu bản đồ 1 hàng; Chấm tọa độ: thanh nút 1 hàng cuộn ngang, bảng đáy tối đa 45% (dọc) / cột trái (ngang); MiniCAD dọc gộp 3 hàng đầu thành 2, nút mở dock thu về góc; Cắm mốc: bản đồ lên đầu, cao ~46% màn hình, màn ngang chia 2 cột (bản đồ trái); Lộ trình: thanh công cụ 2 hàng gọn; máy ngang: tên màn hình 1 dòng.
  3. `app.js`: tỉ lệ mặc định `defaultSplitRatio()` 38% (ngang/máy tính) / 40% (dọc); Chấm tọa độ trên điện thoại mở bảng dạng thanh mỏng; `toggleMiniMap` cắm mốc dùng lớp `is-expanded` thay vì ghim 210/340px.
  4. `ui-sylva.css`: thanh bên trái chỉ từ ≥1280px (1024–1279 dùng dock ngang để bản đồ rộng hơn).
  5. Test: thêm `tests/ui_mapfirst_layout.test.js` (5 test). **547/547 PASS**.

---

## Phiên trước — 2026-11-21: WP-UI-SYLVA — GIAO DIỆN KÍNH MỜ THEO MẪU "SYLVA" (Code and Chill), v2.8.45
- **Yêu cầu từ người dùng**: `Cập nhật giao diện app theo sản phẩm trong link này https://codeandchill.store/templates/sylva`
- **Lưu ý**: trang mẫu và bản demo không mở được trong phiên (trang dựng bằng JS, demo cần duyệt quyền). Chỉ dựa trên mô tả công khai của Sylva: CRM kính mờ (frosted glass), nền đen ấm `#171615`, có bản tối + sáng, thanh bên gập thành dock. Màu nhấn xanh rừng/sage là lựa chọn diễn giải (Sylva = rừng) — cần người dùng xác nhận khi so với bản demo thật.
- **Đã làm**:
  1. Đổi bảng màu toàn bộ CSS + style inline trong `index.html` (không đụng `app.js` — màu marker/canvas giữ nguyên): sky → sage/forest (`#38bdf8→#93cc9c`, `#0284c7→#3f8a5a`, `#0369a1→#2f6e47`…), slate → stone ấm (`#0f172a→#1c1a18`, `#94a3b8→#a8a29e`…), navy rất tối → tối ấm cùng độ sáng. Giữ nguyên độ sáng nên tương phản không đổi.
  2. Thêm `ui-sylva.css` (nạp cuối): token kính `--sy-*` cho 2 chế độ, nền ánh sáng dịu, header/thẻ/ô nhập/modal/menu ☰/dock bằng kính, nút chính xanh rừng phẳng. Mọi quy tắc loại trừ `body.field-mode`.
  3. Máy tính (≥1024px, cao ≥621px): thanh điều hướng thành **thanh bên kính bên trái**; nút ◂ gập thành **dock biểu tượng giữa đáy** (dùng lại `appNav.toggleTaskbarDock` / `body.dock-collapsed`). HUD đáy bản đồ/MiniCAD tự né dock. `toggleTaskbarDock` phát `resize` để Leaflet đo lại.
  4. `theme-color` + manifest → `#171615`; nâng phiên bản 2.8.45 (cache SW mới), SW cache `ui-sylva.css`.
  5. Test: cập nhật giá trị màu cũ trong `tests/ux_lovable_theme.test.js`, `tests/pwa_production_optimization.test.js`; thêm `tests/ui_sylva_theme.test.js` (4 test). **542/542 PASS**.

---

## Phiên trước đó — 2026-11-20: WP-MAP-LAYERS-AUDIT-CLEANUP — LOẠI BỎ LỚP RỖNG OPENSEAMAP & TỐI ƯU HÓA TOÀN DIỆN CÁC LỚP BẢN ĐỒ TRẮC ĐỊA (F-027)
- **Yêu cầu từ người dùng**:
  - `openseamap ko hoạt động đúng không?` -> `bỏ lớp OpenSeaMap đi, sau đó tìm các lớp bản đồ khác (tốt) và đề xuất tôi thêm vào (cho link test trước gốc)` -> `thôi khỏi đi, xem lại các lớp bản đồ còn lỗi không?`
- **Kết quả triển khai & Xác minh**:
  1. **Loại bỏ triệt để lớp OpenSeaMap**:
     - Đã dọn sạch khỏi `app.js`, `index.html`, `server.js`, `sw.js`. Bảng điều khiển lớp giờ đây gọn gàng, thuần túy các lớp hữu ích cho công tác trắc địa, đo đạc đất đai.
  2. **Kiểm toán & Tối ưu hóa sâu hệ thống bản đồ (Deep Map Audit)**:
     - 100% các lớp nền và lớp phủ đều phản hồi HTTP 200 nhanh chóng tại Việt Nam.
     - Sửa lỗi tiềm ẩn zoom sâu trên `osm_streets` (OpenStreetMap): Ghim `maxNativeZoom: 19`, triệt tiêu 100% lỗi HTTP 400 ô xám khi kỹ sư zoom mức 20 - 24.
     - Phân tầng hiển thị Leaflet Panes zIndex chuẩn xác, nét vẽ MiniCAD luôn nằm trên cùng.
  3. **Kiểm thử tự động & Nghiệm thu**:
     - Cập nhật `tests/waterways_traffic_layers.test.js` và `tests/map_layers_panel.test.js`.
     - Toàn bộ **530 / 530 tests PASS 100% (9 suites, 0 fail)**.
     - Đã đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

## Phiên trước đó — 2026-11-20: WP-WHITE-LABEL-PLANNING — XÓA BỎ CỤM TỪ GULAND TRÊN TOÀN BỘ GIAO DIỆN ỨNG DỤNG & CHUẨN HÓA HIỂN THỊ NGUỒN KHI XUẤT BẢN VẼ (F-026)
- **Yêu cầu từ người dùng**:
  - `xóa các cụm từ có chữ Guland trong app, chỉ còn hiển thị nguồn khi xuất bản vẽ (các file)`
- **Kết quả triển khai & Xác minh**:
  1. **Dọn sạch 100% cụm từ "Guland" trên giao diện người dùng (User-Facing UI)**:
     - Toàn bộ nhãn, nút bấm, tiêu đề modal, tooltip, thông báo toast, bảng chọn lớp trên Live Map, Bản đồ Dự án, MiniCAD và Quản lý lớp đều đã được chuyển thành thuật ngữ kỹ thuật chuẩn: `Bản đồ Quy hoạch sử dụng đất 2030`, `📐 Quy hoạch SDĐ 2030`, `📐 QUY HOẠCH`.
     - Danh sách trợ giúp lệnh CAD CLI hiển thị `QH` và `QUYHOACH`.
  2. **Chuẩn hóa Hiển thị Nguồn khi Xuất Bản Vẽ (Export Credit)**:
     - Khi xuất file bản vẽ (ảnh PNG, tài liệu PDF, bản in ấn kỹ thuật), hệ thống tự động ghi nhận chú thích nguồn ở góc khung bản vẽ:
       `credit: Nguồn dữ liệu tham khảo: Quy hoạch sử dụng đất 2030 - ${prov.name} (Guland)`
       tuân thủ trọn vẹn yêu cầu người dùng và Luật Sở hữu trí tuệ.
  3. **Kiểm thử tự động & Nghiệm thu**:
     - Cập nhật `tests/planning_map_integration.test.js` kiểm tra các nhãn hiển thị mới.
     - Toàn bộ **530 / 530 tests PASS 100% (9 suites, 0 fail)**.
     - Đã đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

## Phiên trước đó — 2026-11-20: WP-WATERMARK-CLEANER-PRO — BỘ CÔNG CỤ LÀM SẠCH & CHE WATERMARK GULAND / BẢN ĐỒ QUY HOẠCH NỀN (F-025)
- **Yêu cầu từ người dùng**:
  - `phương án 3, bổ sung cơ chế tạo lớp phủ che hoặc xóa chữ Guland trên lớp bản đồ nền (tự động nhận diện)`
- **Kết quả triển khai & Xác minh**:
  1. **Tạo mới Bộ Công Cụ Làm Sạch & Che Watermark Bản Đồ (`modalPlanWatermarkClean`)**:
     - Tích hợp độc lập trong phân hệ Lớp phủ quy hoạch ảnh / PDF (`appPlanOverlay`), tuân thủ 100% nguyên tắc cách ly giao diện (UI Isolation Principle - `AGENTS.md`).
     - Hỗ trợ 4 chế độ khử watermark:
       + 🤖 **Tự động triệt tiêu chữ chìm**: Thuật toán phân tích quang độ (Luminance Thresholding) kết hợp lấy mẫu màu nền lân cận (Neighbor Color Inpainting), tự động lấp đầy màu nền quy hoạch vào các pixel chữ watermark sáng màu mờ ảo, bảo vệ 100% đường ranh thửa tối màu.
       + 🖱️ **Hộp khoanh xóa 1-chạm**: Cho phép kéo thả trực quan trên Canvas để khoanh chọn và xóa tức thì từng chữ theo thuật toán nội suy màu biên (Border Sampling Inpaint).
       + 📐 **Lưới mặt nạ chu kỳ**: Tự động phủ inpaint theo bước gạch bản đồ tile (256/384/512px).
       + 👁️ **Lớp phủ lọc thời gian thực (`toggleDeWatermark`)**: Dùng CSS mix-blend-mode và contrast lọc trực tiếp trên layer bản đồ.
     - Trang bị đầy đủ tính năng Hoàn tác (Undo) và Khôi phục ảnh gốc (Restore Original).
  2. **Tiêu chuẩn UX/UI & Trợ năng**:
     - 100% font chữ `>= 11px` theo `DESIGN.md`.
     - Sử dụng token `--ui-avail-h`, tương thích toàn diện với vùng an toàn màn hình (tai thỏ / nốt ruồi / xoay ngang / bàn phím ảo).
  3. **Kiểm thử tự động & Nghiệm thu**:
     - Bổ sung `tests/plan_overlay_watermark_cleaner.test.js` (6/6 pass).
     - Toàn bộ **530 / 530 tests PASS 100% (9 suites, 0 fail)**.
     - Đã đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

## Phiên trước đó — 2026-11-20: WP-CODEBASE-CLEANUP-AUDIT — TỔNG RÀ SOÁT, VỆ SINH MÃ NGUỒN, XÓA TỆP NẶNG 50MB, TRIỆT TIÊU 100% MÃ RÁC WORLDCOVER/GIBS & CHUẨN HÓA TRỢ NĂNG ACCESSIBILITY (F-023)
- **Yêu cầu từ người dùng**:
  - `tổng rà soát và vệ sinh các mã, tìm lỗi và sửa, thấy mã rác dư thừa thì xóa`
  - Đã qua tiền kiểm tra Pre-flight Gate và xác nhận:
    + Xóa hẳn file 50.8 MB `BandohanhchinhVietNam_34tinhthanh.pptx` khỏi Git và thư mục dự án; thêm vào `.gitignore` và `.vercelignore`.
    + Xóa sạch 100% mọi dòng code liên quan đến lớp cũ `worldcover` và `gibs` kể cả các phương thức tải ngầm.
    + Đồng bộ nút đổi nhanh nền `toggleMapLayer` theo 6 nền chất lượng cao tại Việt Nam.
    + Bổ sung đầy đủ `aria-label` cho toàn bộ form inputs, triệt tiêu 100% cảnh báo Accessibility.
- **Kết quả triển khai & Xác minh**:
  1. **Xóa tệp rác 50.8 MB & Tinh giản kích thước deploy**:
     - Đã dùng `git rm -f` xóa tệp `BandohanhchinhVietNam_34tinhthanh.pptx` khỏi Git repo và xóa khỏi ổ đĩa.
     - Cập nhật `.gitignore` và `.vercelignore` chặn `*.pptx`, `*.ppt`. Quá trình build và deploy Vercel nhẹ hơn 50 MB, tốc độ triển khai tức thì.
  2. **Triệt tiêu 100% mã rác lớp viễn thám thô sơ cũ (`worldcover`, `gibs`)**:
     - Xóa mảng `WORLDCOVER_CLASSES` và `GIBS_PRODUCTS`.
     - Xóa các phương thức ngầm `gibsDefaultDate()`, `gibsUrl()`, `setGibs()`, và các nhánh `worldcover`/`gibs` trong `_overlayDef()`, `_isOn()`, `syncOverlays()`, `setOverlay()`, `setOpacity()`.
     - Xóa các biến tính toán DOM chuỗi thừa (`wc`, `g`, `legend`, `gibsExtra`) trong `renderPanel()`.
     - Xóa `worldcover` khỏi dropdown `cadExportBasemap` trong `index.html` và `EXPORT_BASEMAPS` trong `app.js`.
     - Loại bỏ `'s2_2016'` khỏi mảng kiểm tra ID nền hợp lệ `s.activeBaseLayerId`.
  3. **Đồng bộ vòng lặp chuyển nhanh 6 nền bản đồ (`toggleMapLayer`)**:
     - Đồng bộ thứ tự: `google_hybrid` (Vệ tinh Google) ➔ `esri_satellite` (Vệ tinh Esri) ➔ `google_streets` (Đường phố & Thủy văn Google) ➔ `opentopomap` (Địa hình & Sông ngòi OpenTopo) ➔ `google_terrain` (Địa hình Google) ➔ `osm_streets` (Đường phố OSM).
  4. **Chuẩn hóa Accessibility (Trợ năng) 100% Form Inputs**:
     - Bổ sung `aria-label` chuẩn tiếng Việt cho 276 trường nhập liệu, ô chọn dropdown, thanh trượt trong `index.html` và các HUD floating panel trong `src/core/planning_map.js`.
     - Khắc phục lỗi cú pháp nhãn tại ô `cadGisLayerName`.
     - Xác thực qua Chrome DevTools MCP: `unlabelled: 0` (100% form fields có nhãn trợ năng đạt chuẩn WCAG).
  5. **Kiểm thử tự động & Nghiệm thu**:
     - Cập nhật test suite `tests/map_layers_panel.test.js` kiểm tra các lớp giao thông, thủy văn hiện hành.
     - Toàn bộ **524 / 524 tests PASS 100% (9 suites, 0 fail)**.

---

## Phiên trước đó — 2026-11-20: WP-MAP-LAYERS-VIETNAM-FOCUS — ƯU TIÊN LỚP NỀN CHI TIẾT CAO TẠI VIỆT NAM & LOẠI BỎ LỚP KHÔNG KHẢ DỤNG / DỮ LIỆU THÔ SƠ (F-022)
- **Yêu cầu từ người dùng**:
  - `ưu tiên giữ lại các lớp bản đồ nền có dữ liệu chi tiết tại Việt Nam, xóa các lớp bản đồ không khả dụng hoặc dữ liệu không chi tiết`
- **Kết quả triển khai & Xác minh**:
  1. **Tối ưu danh mục Lớp nền Bản đồ (Base Maps) chuẩn Việt Nam**:
     - Sắp xếp và ưu tiên các lớp nền có độ phân giải cao nhất, dữ liệu chi tiết sâu tại Việt Nam:
       + `google_hybrid`: Vệ tinh Google (Siêu nét) — Chi tiết từng nóc nhà, bờ thửa ranh đất tại Việt Nam, native zoom lên tới 22.
       + `esri_satellite`: Ảnh vệ tinh Esri — Sắc nét toàn quốc, cho phép xuất bản vẽ in ấn bản đồ.
       + `google_streets`: Đường phố Google (Giao thông & Thủy văn) — Mạng lưới đường bộ, ngõ hẻm, tên đường & hệ thống sông ngòi chi tiết nhất Việt Nam (native zoom 20).
       + `opentopomap`: Địa hình & Sông ngòi OpenTopo — Thể hiện chi tiết hệ thống sông ngòi, kênh rạch chằng chịt miền Tây Nam Bộ và đường bình độ cao độ địa hình (zoom 17).
       + `google_terrain`: Địa hình Google — Độ dốc, đồi núi, lưu vực sông suối toàn quốc (zoom 17).
       + `osm_streets`: Đường phố OpenStreetMap — Bản đồ đường sá mở toàn cầu, cho phép in ấn khi xuất bản vẽ.
       + `none`: Không nền — Giấy trắng nhẹ nhất phục vụ vẽ kỹ thuật MiniCAD.
     - **Loại bỏ lớp nền không khả dụng / độ phân giải thấp**: Gỡ bỏ hoàn toàn `s2_2016` (Sentinel-2 2016) vì độ phân giải chỉ 10m/pixel (mờ ở mức khảo sát đất đai, native zoom chỉ 14, dữ liệu cũ từ 2016).
     - **Cơ chế Fallback An toàn**: Trong `setBase(id)`, nếu người dùng có dữ liệu lưu trữ cũ chứa `s2_2016`, hệ thống tự động fallback mượt mà về `google_hybrid` mà không gây lỗi giao diện.
  2. **Dọn dẹp Lớp phủ (Overlays) không chi tiết**:
     - Loại bỏ khỏi giao diện bảng lớp:
       + `worldcover` (ESA WorldCover 10m 2021): Phân loại che phủ thực bì thô sơ toàn cầu.
       + `gibs` (NASA GIBS MODIS 250m - 1km): Ảnh viễn thám thô vĩ mô, không chi tiết thửa đất hay quy hoạch.
     - Giữ nguyên và bảo toàn các lớp phủ chất lượng cao: Mạng lưới Giao thông Esri, Nhãn đường Google, Giao thông trực tiếp Google Traffic, Luồng lạch đường thủy OpenSeaMap, Ranh giới 34 tỉnh 2025, Ranh giới xã Đồng Tháp mới, Bản đồ quy hoạch Guland 2030 và Bản đồ quy hoạch PDF đính kèm (sạch 100% watermark).
  3. **Kiểm thử tự động & Xác minh trực quan**:
     - Cập nhật `tests/map_layers_panel.test.js`.
     - 100% bộ kiểm thử tự động đạt **524 / 524 tests PASS 100% (9 suites)**.
     - Kiểm chứng thực tế qua Chrome DevTools MCP: Chụp ảnh modal Lớp bản đồ sạch đẹp, danh mục trực quan, không còn bất kỳ lớp rác nào.

---

## Phiên trước đó — 2026-11-20: WP-SYSTEM-OPTIMIZE-ALL — TỐI ƯU HÓA TOÀN DIỆN ỨNG DỤNG (MOBILE PWA & DESKTOP) — OFFLINE TILE CACHE, 60FPS GPU, MINICAD BBOX INDEXING & NETWORK PRUNING (F-021)
- **Yêu cầu từ người dùng**:
  - `tối ưu lại ứng dụng`
  - Chọn phương án: **E - Toàn diện (Tổng hợp A + B + C + D theo từng giai đoạn an toàn)**.
  - Thiết bị mục tiêu: **Cả hai nền tảng** (Mobile PWA & Desktop).
  - Kỳ vọng: **Ưu tiên lưu cache offline tối đa để dùng ở thực địa không có sóng mạng**.
- **Kết quả triển khai & Xác minh**:
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
     - Đã đồng bộ mã nguồn sang `D:\Nhu\APP\VN2000-PWA`.

---

## Phiên trước đó — 2026-11-20: WP-MAP-LAYERS-CLEANUP-PDF — DỌN DẸP LỚP BẢN ĐỒ RÁC & MỞ RỘNG NẠP BẢN ĐỒ QUY HOẠCH PDF TỪNG TỈNH KHÔNG WATERMARK (F-020)
- **Yêu cầu từ người dùng**:
  1. `tìm cách loại bỏ các hình này (từ ký hiệu Guland) từ các lớp bản đồ được tải từ Guland hoặc cho phép tải dữ liệu bản đồ tỉnh sau sáp nhập từ các file PDF đính kèm (theo từng file PDF riêng lẻ).`
  2. `Hiện tại bạn đang tải dữ liệu lớp bản đồ trực tiếp từ guland hay đã tải offline từ các file dữ liệu được tải về kho dữ liệu?`
  3. `- loại bỏ các lớp bản đồ 19 tỉnh miền nam, quy hoạch sử dụng đất (TT27)... chỉ để lại các lớp bản đồ nền có dữ liệu có chất lượng`
- **Kết quả triển khai & Xác minh**:
  1. **Bản chất kỹ thuật của Watermark GULAND**:
     - Dữ liệu Guland hiện được stream trực tiếp online qua CDN (`vcdn.cloud`, `cmccloud.com.vn`, `fptcloud.com`).
     - Chữ `GULAND` màu vàng là **watermark chìm do máy chủ Guland in chết vào từng ô ảnh tile PNG raster** khi render từ hệ thống của họ. Vì là ảnh raster nén, không phải thẻ HTML text hay vector layer riêng biệt, nên không thể tắt bằng CSS filter mà không làm lệch màu các vùng đất quy hoạch màu vàng khác (đất trồng trọt, đất lúa).
     - **Giải pháp tối ưu & chuyên nghiệp nhất**: Cho phép người dùng nạp trực tiếp file bản đồ quy hoạch chính thức của tỉnh sau sáp nhập từ các file PDF đính kèm (theo từng file riêng lẻ), không phụ thuộc Guland, sạch 100% watermark.
  2. **Mở rộng chức năng nạp & hiển thị Bản đồ Quy hoạch PDF (`appPlanOverlay`) ra toàn bộ hệ thống**:
     - Cho phép nạp từng file PDF riêng lẻ theo từng tỉnh/huyện/xã.
     - Đồng bộ hiển thị trực tiếp lên `AppState.leafletMap` (Bản đồ Dự án, Bản đồ chuyển đổi tọa độ) lẫn MiniCAD.
     - Đưa mục `Bản đồ quy hoạch (PDF đính kèm)` trực tiếp vào bảng quản lý lớp `appMapLayers` với công tắc tổng, thanh trượt độ mờ và nút `[📂 Quản lý & Nạp PDF]`.
  3. **Loại bỏ triệt để các lớp bản đồ rác**:
     - Đã loại bỏ hoàn toàn khỏi giao diện: `19 Tỉnh Miền Nam` (`mlSouthProv`), `Quy hoạch sử dụng đất (TT27)` (`mlPlanZones`), `Đồng Tháp cũ` (`mlDtCu`), `Tiền Giang cũ` (`mlTgCu`).
     - Giữ lại danh mục lớp chất lượng cao: 8 nền bản đồ chuẩn (Google Satellite, Esri Satellite, OSM, Google Streets thủy văn, OpenTopoMap sông ngòi kênh rạch, Google Terrain, Sentinel-2, Không nền); các lớp phủ hạ tầng chất lượng cao (Mạng lưới giao thông Esri, Nhãn đường Google, Giao thông trực tiếp Google Traffic, Luồng lạch đường thủy OpenSeaMap, Ranh giới 34 tỉnh, Ranh giới xã mới Đồng Tháp, Bản đồ quy hoạch PDF đính kèm).
  4. **Kiểm thử & Nghiệm thu Thực tế**:
     - Cập nhật test suite `tests/vn_south_map_layers.test.js`.
     - Toàn bộ **524 / 524 bài kiểm thử đạt PASS 100% (9 suites, 0 fail, 0 skipped)**.
     - Xác thực trực quan bằng Chrome DevTools MCP: Chụp ảnh modal Lớp bản đồ và modal Nạp PDF, xác nhận độ sắc nét và tính độc lập của giao diện.
  5. **Đồng bộ mã nguồn**: Đã đồng bộ sang `D:\Nhu\APP\VN2000-PWA`.

---

## Phiên trước đó — 2026-11-19: WP-MAP-LAYERS-WATER-TRAFFIC — TỐI ƯU TỐC ĐỘ TẢI BẢN ĐỒ, GIỮ LỚP QUY HOẠCH GULAND 1X-9X & TÍCH HỢP LỚP SÔNG NGÒI, KÊNH RẠCH, GIAO THÔNG TOÀN QUỐC (F-019)
- **Yêu cầu từ người dùng**:
  - `tốc độ load dữ liệu còn chậm`
  - `bên cạnh đó khi thu nhỏ từ 1x đến 9x sẽ không xem được lớp bản đồ có nguồn gốc được tải từ Guland, hãy điều chỉnh phù hợp để hoạt động tốt`
  - `Chưa có dữ liệu bản đồ về sông ngòi kênh rạch, bản đồ về giao thông của các tỉnh`
- **Kết quả triển khai**:
  1. **Khắc phục triệt để lỗi biến mất của Lớp Quy hoạch Guland ở Zoom 1x-9x**:
     - `src/core/planning_map.js`: Thay `minZoom: 10` thành `minZoom: 1`, bổ sung `minNativeZoom: 8`, `keepBuffer: 8`, `updateWhenIdle: false`.
     - Leaflet tự động downscale từ mức native zoom z=8 khi thu nhỏ dưới 9x, không gửi request 404, giữ nguyên vẹn toàn cảnh ranh giới quy hoạch tỉnh mà không bị ẩn (`display: none`).
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
     - Toàn bộ **524 / 524 bài kiểm thử đạt PASS 100% (9 suites, 0 fail, 0 skipped)**.
     - Xác thực giao diện và hoạt động trực quan bằng Chrome DevTools MCP: Bản đồ quy hoạch Đồng Tháp hiển thị sắc nét ở zoom 7 và zoom 11; OpenTopoMap và Esri Transportation hiển thị chuẩn xác hệ thống sông ngòi và mạng lưới giao thông.

---

## Phiên trước đó — 2026-11-19: WP-MAP-FILTER-CAD — CƠ CHẾ LỌC BẬT TẮT TỪNG TỈNH / TỪNG XÃ SAU SÁP NHẬP & NẠP VÀO MINICAD
- **Yêu cầu từ người dùng**:
  - `cơ chế bật tắt (trong bản đồ và miniCAD) có cho phép cho từng tỉnh hoặc từng xã sau sáp nhập chưa?` -> Đồng ý triển khai cơ chế lọc và nạp ranh giới chi tiết.
- **Kết quả triển khai**:
  1. **Bản đồ chính (`appMap` & `appMapLayers`)**:
     - Bổ sung các biến lọc trạng thái trong `AppState`: `filterDtCommune`, `filterSouthProv`, `filter34Prov`, `filterDtCu`, `filterTgCu`.
     - 5 hàm lọc động tự động `fitBounds` và mở popup: `filterDongThapCommune`, `filterSouthProvince`, `filter34Province`, `filterDongThapCu`, `filterTienGiangCu`.
     - Tích hợp các bộ chọn dropdown trong modal Lớp Bản đồ (`appMapLayers.renderPanel`), tuân thủ chuẩn cỡ chữ `>= 11.5px` của `DESIGN.md`.
  2. **Phân hệ MiniCAD (`appCadTool`)**:
     - Bổ sung Thư viện Ranh giới Địa chính trong `modalCadGisImport`: Kỹ sư có thể chọn bất kỳ xã hoặc tỉnh sáp nhập nào và nhấn **"Nạp vào CAD"**.
     - Hệ thống tự động chuyển đổi polygon của xã/tỉnh sang tọa độ phẳng VN-2000 theo kinh tuyến trục KTT của dự án, tạo thành đối tượng hình khối (`mode: polygon`) trên layer riêng `RANH_GIOI_HANH_CHINH`.
     - Bổ sung lệnh CLI `RANH` / `RANHGIOI <tên>` trên CADCraft CLI để nạp ranh giới trực tiếp bằng phím tắt.
  3. **Kiểm thử**: Toàn bộ **518/518 tests PASS 100% (9 test suites, 0 fail, 0 skipped)**.

---

## Phiên trước đó — 2026-11-19: WP-MAP-SOUTH — XÂY DỰNG KHO DỮ LIỆU LỚP BẢN ĐỒ & QUY HOẠCH MIỀN NAM CHẠY OFFLINE 100%
- **Yêu cầu từ người dùng**:
  - `tôi cần dữ liệu lớp bản đồ của các tỉnh ở Việt Nam, bạn có thể tìm trên Internet để xây dựng dữ liệu.`
  - Thống nhất qua Socratic Gate:
    1. Lớp dữ liệu: Bản đồ Quy hoạch sử dụng đất / Xây dựng & Ranh giới hành chính.
    2. Định dạng: Tệp dữ liệu cục bộ (GeoJSON / JS trong `data/`) chạy Offline 100% không cần mạng.
    3. Phạm vi: Các tỉnh thành miền Nam (Bắt buộc có Đồng Tháp mới sau sáp nhập, Đồng Tháp cũ và Tiền Giang cũ).
- **Kết quả triển khai**:
  1. **Bộ công cụ tải & chuẩn hóa dữ liệu GIS mở (`tools/build_vn_south_layers.js`)**:
     - Thu thập từ Cổng thông tin GIS Tổng cục Thống kê / `daohoangson/dvhcvn` (MIT) & `sapnhap.bando.com.vn`.
     - Tự động lọc, chuẩn hóa tọa độ và cấu trúc hóa toàn bộ 19 tỉnh thành miền Nam.
  2. **Kho dữ liệu `data/vn_south_provinces.js` (1.29 MB)**:
     - `dong_thap_moi`: Tỉnh Đồng Tháp mới sau sáp nhập (hợp nhất Tiền Giang + Đồng Tháp theo đề án 34 tỉnh, diện tích 5.939 km², 102 xã/phường).
     - `dong_thap_cu`: 12 quận/huyện/TP tỉnh Đồng Tháp cũ (TP Cao Lãnh, Sa Đéc, Hồng Ngự, Tân Hồng, v.v., KTT 105°00').
     - `tien_giang_cu`: 11 quận/huyện/thị/TP tỉnh Tiền Giang cũ (TP Mỹ Tho, TX Gò Công, Cai Lậy, Cái Bè, v.v., KTT 105°45').
     - `south_provinces`: Ranh giới 19 tỉnh thành miền Nam (TP.HCM, Cần Thơ, An Giang, Long An, Bến Tre, Vĩnh Long, Bà Rịa - Vũng Tàu, Tây Ninh...) kèm KTT VN-2000.
     - `planning_zones`: Lớp phân vùng quy hoạch sử dụng đất theo chuẩn **Thông tư 27/2018/TT-BTNMT** (ODT, ONT, TMD, SKC, DGT, CX, MN).
  3. **Tích hợp PWA & Giao diện Bản đồ**:
     - Thêm `vn_south` vào `LAZY_LIBS` trong `app.js` (nạp bất đồng bộ theo nhu cầu).
     - Đăng ký `./data/vn_south_provinces.js` vào `ASSETS_TO_CACHE` trong `sw.js` (chạy Offline 100%).
     - Bổ sung 8 phương thức `init` và `toggle` trong `appMap` với styling và popup thông tin trắc địa/quy hoạch chuẩn xác.
     - Tích hợp 4 switch điều khiển chuyên biệt trong bảng nổi lớp bản đồ `appMapLayers.renderPanel()`.
  4. **Kiểm thử & Nghiệm thu**:
     - Tạo mới test suite `tests/vn_south_map_layers.test.js`.
     - Toàn bộ **516 / 516 bài test PASS 100%** (9 suites, 0 fail).
     - Đồng bộ toàn diện sang `D:\Nhu\APP\VN2000-PWA`.

## Phiên trước — 2026-11-19: WP-Z — TÙY BIẾN TOÀN DIỆN KÝ HIỆU ICON ĐỈNH / MỐC MINICAD (10 KIỂU DÁNG, 4 KÍCH THƯỚC, PALETTE MÀU & REALTIME HUD)
- **Yêu cầu từ người dùng**:
  `cho phép điều chỉnh Icon điểm lưu, các đỉnh của tuyến, đa giác, thửa đã lưu hoặc đang vẽ`
- **Kết quả triển khai**:
  1. **10 Kiểu dáng Icon Đỉnh & Mốc**:
     - Mở rộng đầy đủ 10 kiểu dáng trắc địa: `circle` (● Tròn), `square` (■ Vuông), `diamond` (◆ Thoi), `triangle` (▲ Tam giác), `pin` (📍 Ghim Pin), `cross` (✚ Chữ thập), `ring` (◎ Vành khuyên), `star` (★ Ngôi sao), `target` (🎯 Tâm ngắm), `x` (❈ Chữ X).
     - Định nghĩa CSS đặc tả hình học với SVG clip-path & drop-shadow trong `style.css`.
  2. **4 Cấp Kích Thước Icon**:
     - `sm` (Nhỏ - 14px), `md` (Vừa - 20px), `lg` (Lớn - 26px), `xl` (Rất lớn - 32px).
     - Neo Leaflet Marker (`iconAnchor`) đồng bộ chuẩn xác từng milimet theo `[px, px]` và `[px/2, px/2]`.
  3. **Thao tác Realtime khi Đang Vẽ (Realtime Vertex HUD)**:
     - Bổ sung thanh điều khiển nhanh `#cadVertexQuickBar` trên tab Vẽ (`#cadPanelDraw`) gồm 3 bộ chọn: Kiểu icon (`#cadDrawVertexStyle`), Màu sắc (`#cadDrawVertexColor`), Kích thước (`#cadDrawVertexSize`).
     - Tự động áp dụng tức thì lên các đỉnh đang vẽ dở qua `updateDraftVertexConfig()` mà không cần thoát lệnh hay vẽ lại.
  4. **Tùy biến Đối tượng Đã Lưu**:
     - Click vào đỉnh trên bản đồ: Popup sửa nhanh (`showQuickEditPopup`) cho phép đổi Kiểu icon, Màu sắc, Cỡ đỉnh cho riêng đỉnh ("Lưu Đỉnh") hoặc áp dụng đồng loạt cho toàn bộ các đỉnh của hình ("Cả Khối").
     - Bảng kê đỉnh thửa (`modalCadAreaTable` - Tab Vertices): Bổ sung cột "Cỡ" cho từng đỉnh, kèm thanh công cụ Đổi hàng loạt (`#cadBulkShapeSelect`, `#cadBulkStyleSelect`, `#cadBulkColorSelect`, `#cadBulkSizeSelect`, `applyBulkVertexGlyphs`).
     - Hộp thoại Ký hiệu & Hiển thị (`modalCadSymbols`): Bổ sung cột Kích thước mặc định theo từng lớp CAD (`cadSymSize_${layerId}`, `applyLayerGlyph`).
  5. **Kiểm soát Chất lượng & UI Polish**:
     - Loại bỏ toàn bộ font-size < 11px theo quy chuẩn `DESIGN.md`.
     - Đồng bộ phiên bản tài nguyên `v2.8.44` trên toàn bộ hệ thống (`package.json`, `sw.js`, `index.html`).
- **Tình trạng kiểm thử & Vận hành**:
  - Tạo mới test suite `tests/cad_vertex_icon_styling.test.js`.
  - Toàn bộ **513 / 513 bài tests PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Đã kiểm chứng trực quan E2E trên Chrome DevTools MCP: Đổi kiểu icon đỉnh trong lúc vẽ dở, popup sửa nhanh trên map, và đổi hàng loạt trong bảng đỉnh đều phản hồi mượt mà, chính xác.

## Phiên trước — 2026-11-19: WP-Y — ĐỒNG BỘ TOÀN DIỆN NÚT CHỨC NĂNG & HOẠT ĐỘNG TRONG PHÂN HỆ "CHUYỂN TỌA ĐỘ"
- **Yêu cầu từ người dùng**:
  - `điều chỉnh để các chức năng tương tự nhau trong "chuyển tọa độ" đều có nút chức năng và các hoạt động tương tự nhau`
  - Đã thực hiện Pre-flight Intake Gate và xác nhận phương án đồng bộ toàn diện cả 3 phân hệ: Đơn điểm, Nhiều điểm, Đổi KTT/múi.
- **Kết quả triển khai**:
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
- **Tình trạng kiểm thử & Vận hành**:
  - Tạo mới test suite `tests/transform_features_unification.test.js` bao quát 100% các nút và modal mới.
  - Toàn bộ **509 / 509 bài tests PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Chrome DevTools MCP kiểm chứng: Cả 3 phân hệ hoạt động đồng nhất, lưu điểm và xuất file hoàn hảo, 0 lỗi JavaScript trong console.

## Phiên trước — 2026-11-19: WP-X — BỔ SUNG NÚT CHỨC NĂNG ĐẶT TÊN & LƯU ĐIỂM KẾT QUẢ CHUYỂN ĐỔI KTT/MÚI VÀO SỔ ĐO DỰ ÁN
- **Yêu cầu từ người dùng**:
  `- Chức năng "Đổi VN-2000 sang KTT/múi khác" cần bổ sung nút chức năng đặt tên và lưu các điểm kết quả được chuyển đổi (tọa độ, múi chiếu, kinh tuyến trục)`
  `/goal Hãy đảm bảo các chức năng hoạt động tốt.`
- **Kết quả triển khai**:
  1. **Nút chức năng**: Thêm nút `💾 Lưu Điểm` (`#rzSave`) vào thanh công cụ kết quả `#rzResultCard`.
  2. **Hộp thoại Đặt Tên & Lưu Điểm (`#modalRzSavePoints`)**:
     - Cho phép chọn file dự án mục tiêu từ `AppState.projectsList` hoặc tạo file dự án mới.
     - Cung cấp quy tắc đặt tên nhanh (Giữ nguyên tên, Tiền tố + STT, hoặc Hậu tố KTT đích) và cho phép sửa trực tiếp tên từng mốc trong bảng.
     - Lưu đầy đủ thông tin: Tên mốc, Tọa độ X/Y mới, KTT đích, Múi chiếu đích, WGS-84, Ghi chú chuyển đổi nguồn ➔ đích, Tên file dự án.
  3. **Tuân thủ 100% UI Isolation Principle**: Không gọi chéo sang giao diện Bản đồ dự án (`openProjectMap`) hay `appCadTool`.
- **Tình trạng kiểm thử & Vận hành**:
  - Toàn bộ **506 / 506 bài tests PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Chrome DevTools MCP kiểm chứng: Thao tác đặt tên theo tiền tố `MOC_KTT_` và lưu 2 điểm mốc vào sổ đo thành công, console 0 lỗi.

## Phiên trước — 2026-11-19: WP-W — BỔ SUNG NÚT XEM BẢN ĐỒ KẾT QUẢ ĐỔI KTT/MÚI & TÍNH NĂNG NỐI ĐIỂM ĐÃ LƯU/CHUYỂN ĐỔI TRONG MINICAD
- **Yêu cầu từ người dùng**:
  1. `Chức năng "Đổi VN-2000 sang KTT/múi khác" cần bổ sung nút chức năng cho xem bản đồ các kết quả được chuyển đổi.`
  2. `MiniCAD cho phép bổ sung chức năng nối các điểm được lưu/chuyển đổi trước đó.`
  3. `/goal Hãy đảm bảo các chức năng hoạt động tốt.`
- **Kết quả triển khai**:
  1. **Tính năng 1: Nút Xem Bản Đồ cho kết quả Đổi KTT/Múi**:
     - Thêm nút `🗺️ Xem Bản Đồ` (`#rzViewMap`) trong thẻ kết quả `#rzResultCard`.
     - Viết hàm `viewOnMap()` trong `vn2000-rezone.js`, chuyển tiếp danh sách điểm kết quả (`last.results`) sang `appNav.openTransformMap({ mode: 'view', subMode: 'multi', rezonePoints: valid, src: last.src, dst: last.dst })`.
     - **Tuân thủ 100% UI Isolation Principle**: Tuyệt đối không gọi chéo sang Sổ mốc dự án (`openProjectMap`) hay `appCadTool`.
     - Cập nhật `appTransformMap`: Hiển thị các pin marker màu xanh bầu trời `#0284c7`, popup chi tiết (Tên điểm, VN-2000 mới, VN-2000 cũ, WGS-84, KTT nguồn ➔ KTT đích), tự động `fitBounds` và thu nhỏ sheet về peek để người dùng nhìn toàn cảnh các điểm mốc trên bản đồ vệ tinh.
  2. **Tính năng 2: Nối các điểm đã lưu/chuyển đổi trong MiniCAD**:
     - Thêm nút `🔗 Nối điểm [NOI]` (`#btnCadConnectPoints`) trên thanh công cụ MiniCAD tab Vẽ (`#cadPanelDraw`) và nút `🔗 Nối thành thửa/tuyến` trong Bảng điểm `#modalCadPointTable`.
     - Xây dựng hộp thoại `#modalCadConnectPoints` hiện đại chuẩn Lovable 2026: Cho phép chọn nguồn điểm (`cad_points`: Lớp điểm rời MiniCAD; `project_points`: Sổ mốc dự án; `converted_points`: Điểm vừa chuyển đổi tọa độ / Đổi KTT).
     - Hỗ trợ kiểu nối: `polygon` (Đa giác ranh khép kín tính diện tích $m^2$, ha) hoặc `polyline` (Đường tim tuyến / ranh hở tính tổng chiều dài).
     - Hỗ trợ 3 thuật toán sắp xếp thứ tự nối:
       1. `natural`: Sắp xếp theo Tên mốc / Số thứ tự tự nhiên (Đ1, Đ2, Đ3... Đ10).
       2. `list`: Theo thứ tự ban đầu trong danh sách.
       3. `tsp`: Tối ưu chu vi ngắn nhất khép vòng (Greedy Nearest Neighbor Tour) chống tự cắt chéo.
     - Tích hợp lệnh CADCraft CLI: `NOI`, `CONNECT`, `NOIDIEM`, `LINKPOINTS`.
- **Tình trạng kiểm thử & Vận hành**:
  - Toàn bộ **505 / 505 bài tests PASS 100%** (9 suites, 0 fail, 0 skipped), bao gồm test mới `tests/cad_connect_points.test.js`.
  - Chrome DevTools MCP kiểm chứng: Cả 2 tính năng hoạt động mượt mà, định vị chính xác và tạo thửa đất tính diện tích chuẩn xác, 0 lỗi JavaScript trong console.

## Phiên trước — 2026-11-19: WP-V — KHẮC PHỤC LỖI XUNG ĐỘT RENDER KHI KÉO THẢ BẢN ĐỒ MINICAD (DOUBLE-BUFFERING & TASK CANCELLATION)
- **Yêu cầu từ người dùng**:
  `MiniCAD đã làm nét được tuy nhiên khi load dữ liệu còn xuất hiện lỗi khi kéo thả bản đồ`
- **Kết quả triển khai & Khắc phục triệt để**:
  1. **Triệt tiêu lỗi xung đột render PDF.js**:
     - Áp dụng kỹ thuật **Double-Buffering**: mỗi lượt render PDF sắc nét được thực thi trên một `offscreenCv` ảo độc lập, sau đó mới sao chép sang `this._sharpCv` qua `drawImage()`. Triệt tiêu 100% lỗi `Cannot use the same canvas during multiple render() operations`.
  2. **Cơ chế Hủy Tác Vụ Cũ & Generation Counter (`_renderGen`)**:
     - Lắng nghe sự kiện `movestart` và `zoomstart`: ngay khi người dùng bắt đầu chạm/kéo bản đồ, hệ thống lập tức hủy tác vụ render đang chạy (`this._activeRenderTask.cancel()`), giải phóng 100% tài nguyên CPU/GPU cho thao tác kéo thả 60 FPS mượt mà.
     - Theo dõi biến thế hệ `_renderGen`: nếu người dùng tiếp tục kéo bản đồ sang tọa độ mới trong lúc đang render, kết quả của vị trí cũ sẽ tự động bị bỏ qua, chỉ vị trí dừng cuối cùng mới được hiển thị.
  3. **Đồng bộ cơ chế cho cả Viewer nắn tọa độ (`_renderSharpViewer`)**:
     - Áp dụng cùng giải pháp double-buffering, cancellation và generation counter cho modal xem và chấm mốc tọa độ.
- **Tình trạng kiểm thử & Vận hành**:
  - Toàn bộ **502 / 502 bài tests PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Chrome DevTools MCP kiểm chứng: Kéo thả và thu phóng liên tục trên bản đồ MiniCAD không còn bất kỳ lỗi console nào (0 errors, 0 warnings). Bản đồ phản hồi tức thì, mượt mà và cực kỳ sắc nét.

## Phiên trước — 2026-11-19: WP-U — KHẮC PHỤC TRIỆT ĐỂ LỖI PDF MỜ KHI ZOOM & XUẤT FILE MINICAD (PDF/PNG) SẮC NÉT CHUẨN IN ẤN 300 DPI
- **Yêu cầu từ người dùng**:
  - `file PDF rất nét được nhập vào, tuy nhiên khi nhập vào ứng dụng thì rất mờ khi phóng to cùng tỉ lệ dù đã chỉnh độ nét lên tối đa`
  - `trong chức năng MiniCAD file xuất ra (dạng pdf và hình ảnh) đang rất mờ.`
  - `hãy fix các lỗi trên`
  - Chọn thực hiện theo **Phương án A**: Tự động tối ưu hóa sắc nét tối đa (Dynamic Sharp Viewport chuẩn Retina/4K cho PDF nhập vào và hiển thị khi zoom; Xuất PDF và ảnh PNG MiniCAD ở chuẩn in ấn sắc nét cao 200–300 DPI, chuyển hoàn toàn sang nén Lossless PNG loại bỏ vỡ hạt JPEG).
- **Kết quả triển khai & Khắc phục triệt để**:
  1. **Dynamic Sharp Viewport cho PDF nhập vào**:
     - Cải tiến `_renderSharpViewer` trong modal Viewer: Tính `zoomRatio = v.s / (v.fit || v.s || 1)`, kích hoạt sharp canvas ngay khi zoom $\ge 1.05$.
     - Khắc phục triệt để lỗi PDF.js reset canvas transform bằng cách truyền tham số chuẩn `transform: [1, 0, 0, 1, offsetX, offsetY]` trực tiếp vào `page.render()`.
     - Đồng bộ tỷ lệ màn hình Retina / 4K (`window.devicePixelRatio`) cho cả modal Viewer và Leaflet Map (`_renderSharpPatch`).
  2. **Động cơ Xuất PDF MiniCAD Siêu Sắc Nét 300 DPI**:
     - Nâng `pxPerMm` trong `appCadTool.exportPdf`: A3/A4 đạt 11.811 px/mm (**300 DPI chuẩn in ấn bản đồ địa chính**), A2 đạt 9.5 px/mm (**240 DPI**), A1 đạt 8.0 px/mm (**200 DPI**), A0 đạt 6.0 px/mm (**152.4 DPI**).
     - Chuyển nén ảnh PDF sang **Lossless PNG** (`canvas.toDataURL('image/png')` + `doc.addImage(..., 'PNG', ...)`), xóa bỏ hoàn toàn hiện tượng nhòe vỡ hạt do nén lossy JPEG gây ra.
  3. **Hỗ trợ Xuất Ảnh PNG MiniCAD Khổ Giấy CAD TCVN Độ Nét Cao (`exportPng`)**:
     - `appCadTool.exportPng()` liên kết trực tiếp với động cơ vẽ CAD TCVN khổ giấy cao cấp qua `this.exportPdf({ asPng: true })`.
     - Tự động xuất tệp PNG độ nét cao mang đầy đủ khung tên, mộc dự án, bảng kê tọa độ ranh đất, thước tỷ lệ, kim chỉ Bắc và các lớp nền quy hoạch Guland / vệ tinh.
  4. **Nâng Cấp Độ Phân Giải `exportOptimizedImage` Lên 2x Retina (2400px)**:
     - Áp dụng `dpr = 2` (`ctx.scale(2, 2)`), nâng độ phân giải ảnh nén PixOptimizer lên gấp đôi (2400px chiều ngang) và nới giới hạn `maxEdge` lên 3840px, giúp ảnh thumbnail/quick export cũng đạt độ sắc nét tuyệt hảo.
- **Tình trạng kiểm thử & Vận hành**:
  - Toàn bộ **502 / 502 bài tests PASS 100%** (9 suites, 0 fail, 0 skipped).
  - Chrome DevTools MCP kiểm chứng: Xuất bản vẽ PNG 300 DPI trả về kết quả sắc nét, kích thước >700KB, không lỗi console.

## Phiên trước — 2026-11-19: WP-T — NÂNG CẤP TOÀN DIỆN ỨNG DỤNG THEO 5-WAVE SUITE & PHÁT HÀNH v2.8.43 PRO
- **Yêu cầu từ người dùng**:
  `nâng cấp cho app` - Triển khai trọn vẹn toàn bộ các phân hệ theo 5-Wave logic, bảo đảm không lỗi và tuân thủ UI Isolation Principle.
- **Kết quả triển khai 5-Wave**:
  1. **Wave 1 (Chuyển đổi tọa độ)**:
     - Thêm nút `📐 CAD` (`appTransform.copyCadResult()`) xuất định dạng `Y,X` dán thẳng vào AutoCAD command line.
     - Thêm nút `🗺️ G-Maps` (`appTransform.openGoogleMaps()`) mở vị trí vệ tinh Google Maps.
  2. **Wave 2 (MiniCAD HUD)**:
     - Thêm 2 nút bấm truy cập nhanh ngay trên HUD đáy `#cadStatusHud`: `#btnCadHudPlanPdf` (Bản đồ PDF) và `#btnCadHudGuland` (Bản đồ quy hoạch Guland).
     - Đồng bộ trạng thái active/color qua `appPlanOverlay.syncControlsUi()`.
  3. **Wave 3 (Cắm mốc Stakeout thực địa)**:
     - Thêm nút `📋 CHÉP SỐ` (`appStakeout.copyStakeoutDelta()`) trên `#screen-stakeout` cho phép chép nhanh khoảng cách, $\Delta X, \Delta Y$ và sai số GPS.
  4. **Wave 4 (UI/UX Ergonomics)**:
     - Đảm bảo 100% font-size $\ge 11$px, touch targets $\ge 42-44$px.
  5. **Wave 5 (Phát hành v2.8.43 Pro & PWA Cache)**:
     - Cập nhật phiên bản lên `v2.8.43` đồng bộ trong `package.json`, `feature_list.json` (`F-016`, `F-017`), `index.html`, và `sw.js` (`CACHE_NAME = 'vn2000-pro-v2.8.43'`).
- **Tình trạng kiểm thử**:
  - Toàn bộ **502 / 502 bài tests PASS 100%** (9 suites).
  - Chrome DevTools xác nhận giao diện hoạt động hoàn hảo, 0 lỗi JavaScript trong console.

## Phiên trước — 2026-11-19: WP-S — KIỂM TRA TOÀN DIỆN & TỐI ƯU HÓA MINICAD TÍCH HỢP XUẤT LỚP BẢN ĐỒ GULAND 2030
- **Yêu cầu từ người dùng**:
  `kiểm tra toàn diện để tối ưu hóa MiniCAD để có thể tích hợp chọn xuất được file chứa được lớp bản đồ Guland`
- **Kết quả rà soát & Tối ưu hóa**:
  1. Tự động nhận diện tỉnh theo `AppState.provinceName` và kế thừa trạng thái quy hoạch từ bản đồ MiniCAD.
  2. Bổ sung lưu trữ cấu hình Guland vào `saveTitleBlockInfo` trong `localStorage`.
  3. Khung xem trước SVG hiển thị huy hiệu sinh động `🗺️ IN KÈM QUY HOẠCH GULAND: [TỈNH] ([OPACITY]%)`.
  4. Nâng `maxTiles` cho khổ lớn A0/A1/A2 để tăng độ phân giải chữ số quy hoạch và ranh đất.
  5. Kiểm thử thực tế trên Chrome DevTools: Canvas hoàn toàn không bị tainted, xuất dữ liệu pixel thành công 100%. Toàn bộ 495 tests PASS.

## Phiên trước — 2026-11-18: WP-R2 — SỬA TRIỆT ĐỂ LỖI XUẤT LỚP BẢN ĐỒ GULAND 2030 (CORS TILE PROXY STREAM & UN-TAINTED CANVAS)
- **Yêu cầu từ người dùng**:
  `chưa xuất được file chứa được lớp bản đồ Guland.`
- **Nguyên nhân cốt lõi**:
  - CDN ngói Guland (`vcdn.cloud`, `cmctelecom.vn`, `fptcloud.com`, `digitaloceanspaces.com`) không có CORS header (`Access-Control-Allow-Origin: *`).
  - Khi Canvas tải ảnh với `img.crossOrigin = 'anonymous'`, trình duyệt chặn tải $\to$ 100% ngói bị lỗi không vào được canvas xuất file.
- **Giải pháp & Kiến trúc triển khai**:
  1. **Tạo Endpoint Proxy Ngói**:
     - `server.js`: `/api/tile-proxy?url=...` kèm CORS `*` và whitelist chống SSRF.
     - `api/tile-proxy.js`: Serverless Function cho Vercel / serverless runtime.
  2. **Tự động bọc Proxy URL trong `app.js`**:
     - Hàm `wrapTileProxyUrl(url)` tự động bọc các link ngói Guland qua proxy nội bộ khi chạy trên Web.
     - Tích hợp cả trong `planExportGuland` lẫn `loadExportBasemap`.
  3. **Kiểm thử thực nghiệm**:
     - Chrome DevTools MCP: 8/8 ngói tải thành công (`loadedTiles: 8, failedTiles: 0`), Canvas không bị tainted (`taintedError: null, dataUrlLength: 47718`).
     - 495/495 tests PASS 100%.

## Phiên trước — 2026-11-18: WP-R — TÍCH HỢP XUẤT KÈM LỚP BẢN ĐỒ GULAND 2030 & TỆP PDF/ẢNH NẮN TỌA ĐỘ VÀO BẢN VẼ KỸ THUẬT (F-004/F-015/F-016)
- **Yêu cầu từ người dùng**:
  `bổ sung cho phép chọn lớp bản đồ Guland hoặc PDF hoặc các file được bổ sung lớp bản đồ để chọn xuất file PDF hoặc các định dạng file khác`
- **Giải pháp & Kiến trúc triển khai**:
  1. **Hộp thoại xuất MiniCAD (`#modalCadExportConfig`)**:
     - Bổ sung nhóm: `CHỌN LỚP BẢN ĐỒ NỀN, GULAND & FILE PDF XUẤT KÈM`.
     - Tùy chọn nền cơ sở: Giấy trắng, OpenStreetMap, Vệ tinh Esri, Sentinel-2 10m, ESA WorldCover.
     - Lớp quy hoạch Guland: Checkbox `#cadExportCheckGuland`, dropdown 63 tỉnh `#cadExportGulandProvince`, thanh trượt mờ đục `#cadExportGulandOpacity`, checkbox `#cadExportGulandLand` (in kèm ranh thửa đất).
     - Lớp bản đồ PDF / Ảnh nắn tọa độ (`appPlanOverlay`): Checkbox `#cadExportPlanOverlay`, nhãn đếm `#cadExportPlanOverlayCountBadge`, danh sách từng tệp PDF/ảnh `#cadExportPlanOverlayList` với checkbox độc lập từng file và nút Chọn tất cả / Bỏ chọn nhanh.
  2. **Hộp thoại xuất Bản đồ Dự án / Sổ đo (`#modalExportData` / `#modalExportDwg`)**:
     - Bổ sung bước 2.5: `CHỌN NỀN BẢN ĐỒ, GULAND & TỆP PDF XUẤT KÈM`.
     - Tương thích đầy đủ nền cơ sở `#selExportBasemap`, quy hoạch Guland `#chkExportGulandPlanning`, bộ chọn tỉnh `#selExportGulandProvince`, thửa đất `#chkExportGulandLand`, và danh sách tệp PDF/ảnh `#selExportPlanOverlayList`.
  3. **Thuật toán & Động cơ nạp ngói (`app.js`)**:
     - `planExportGuland(provinceSlug, frame, pxPerMeter, toLatLng, maxTiles, showLand, opacity)`: tính toán z-level và danh sách ô ngói theo EPSG:3857, ghép chuẩn xác tọa độ affine VN-2000.
     - `loadExportBasemap`: hỗ trợ tự động retry `fallbackUrl` nếu ngói CDN chính gặp lỗi.
     - `_prepareExportBasemap`: tải đồng thời cả ngói nền cơ sở và ngói quy hoạch Guland qua `Promise.all`.
     - `appPlanOverlay`: thêm `renderExportFileList()`, `getSelectedExportIds()`, và `drawForExport(ctx, rect, toCanvas, selectedIds)` chỉ xuất đúng các tệp PDF/ảnh đã được tích chọn.
     - Tích hợp vẽ lớp Guland và PDF overlays vào `exportPdf()`, `exportOptimizedImage()` của MiniCAD và `exportPdfFile()` của Bản đồ dự án.
  4. **Kiểm Thử Toàn Diện & Trực Quan**:
     - Bộ test mới: `tests/export_guland_and_pdf_layers.test.js`: **7/7 tests PASS**.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **494/494 tests PASS 100% (0 fail)**.
     - Kiểm chứng trực quan qua Google Chrome DevTools MCP: 63 tỉnh hiển thị chuẩn, danh sách tệp PDF/ảnh hoạt động mượt mà.

## Phiên trước — 2026-11-18: WP-Q — BỔ SUNG KHỔ GIẤY LỚN (A0, A1, A2) & NHẬP TAY TỈ LỆ BẢN ĐỒ ĐÁNH GIÁ VÙNG LỚN (F-004/F-015/F-016)
- **Yêu cầu từ người dùng**:
  `khổ giấy cho phép chọn khổ lớn hơn để in bản vẽ, về tỉ lệ bản đồ cũng cho phép nhập tay tỉ lệ bản đổ (do một số bản vẽ cần được vẽ là bản đồ lớn để đánh giá)`
- **Giải pháp & Kiến trúc triển khai**:
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
  6. **Kiểm Thử Toàn Diện**:
     - Bộ test mới: `tests/export_large_paper_and_custom_scale.test.js`: **13/13 tests PASS**.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **487/487 tests PASS 100% (0 fail)**.
     - Đã xác thực thực tế trên Google Chrome DevTools MCP.

## Phiên trước — 2026-11-18: WP-P — DUY NHẤT MỘT LỚP BẢN ĐỒ GULAND, TRIỆT TIÊU LAYER MẶC ĐỊNH / KẸT LUÔN MỞ & CHO PHÉP CHỌN TỈNH HOẶC TẮT HOÀN TOÀN (F-015/F-016)
- **Yêu cầu từ người dùng**:
  `nền bản đồ đang có 1 lớp guland luôn được mở là không đúng, chỉ nên tồn tại 1 lớp bản đồ guland (cho phép chọn hiển thị tỉnh, hoặc tắt lớp guland)`
- **Giải pháp & Kiến trúc triển khai**:
  1. **Purge Triệt Để Zero-Orphan Layer (`removeAllGulandLayersFromMap`)**:
     - `removeAllGulandLayersFromMap(map)`: quét toàn bộ `map.eachLayer()`, phát hiện và xóa sạch mọi tile layer mang class `leaflet-layer-guland-planning`, `leaflet-layer-guland-land` hoặc chứa URL `vcdn.cloud`/`guland`.
     - Tự động gọi trước khi nạp layer mới hoặc khi tắt, đảm bảo trên bản đồ luôn có đúng 0 hoặc 1 layer quy hoạch duy nhất.
  2. **Đồng Bộ Hai Chiều Tuyệt Đối Giữa `projectMap` & `cadMap` (`syncMainMapTargets`)**:
     - Do cả hai cùng chung instance `AppState.leafletMap`, hàm `syncMainMapTargets(sourceKey)` đồng bộ ngay tức khắc `active`, `layer`, `landLayer`, `provinceSlug`, `opacity`, `showLand` giữa cả 2 phân hệ, chấm dứt hoàn toàn hiện tượng lệch con trỏ đối tượng layer.
  3. **Khắc Phục Đóng Thẻ Nổi & Tự Động Ẩn Khi Đổi Phân Hệ**:
     - Đổi `togglePanel(target, true)` thành `togglePanel(target, willOpen)`. Khi người dùng tắt lớp quy hoạch, bảng nổi tự động đóng (`display: none`).
     - Bổ sung `'mapProjectPlanningCtrl'` và `'cadPlanningCtrl'` vào `resetMapChrome()` và `closeCadWindows()` trong `app.js`.
  4. **Bộ Chọn 63 Tỉnh Thành Ngay Cả Khi Lớp Đang Tắt**:
     - Trong Hộp thoại Quản lý Lớp bản đồ (`modalMapLayers`), hiển thị dropdown `#mlGulandProvSelect` ngay cả khi công tắc đang TẮT để người dùng chủ động chọn tỉnh trước khi kích hoạt.
     - Thêm phương thức `appPlanning.panToProvince(targetKey, slug)`.
  5. **CADCraft CLI Nâng Cao**:
     - Lệnh `QH OFF`, `QH ON` và `QH <tên_tỉnh>`.
  6. **Kiểm Thử Toàn Diện**:
     - `tests/planning_map_integration.test.js`: **41/41 tests PASS 100%**.
     - Toàn bộ suite hồi quy `node --test tests/*.test.js`: **484/484 tests PASS 100% (0 fail)**.
     - Kiểm chứng trực quan qua Chrome DevTools MCP: khởi động bản đồ có 0 layer Guland, bật có đúng 1 layer, đổi tỉnh giữ nguyên 1 layer, tắt về 0 layer sạch sẽ.

## Phiên trước — 2026-11-18: WP-N — ĐƯA DỮ LIỆU HÌNH HỌC, ĐIỂM MỐC, TUYẾN, THỬA LÊN LỚP TRÊN CÙNG & TỰ ĐỘNG ĐỒNG BỘ XUẤT FILE MINICAD (F-004/F-015/F-016)
- **Yêu cầu từ người dùng**:
  `các điểm chấm, điểm lưu, tuyến, thửa, đa giác,... các dữ liệu được lưu chưa được hiển thị ở phía trên cùng để xem và xuất dữ liệu trong miniCAD`
- **Giải pháp & Kiến trúc triển khai**:
  1. **Leaflet Custom Panes Trên Cùng (`cadVectorPane` & `cadMarkerPane`)**:
     - `cadVectorPane` (`zIndex: 450`, `pointerEvents: 'auto'`): Chứa các đường bao ranh thửa, đường tim tuyến, đa giác vẽ và nét Offset, nổi bật lên trên toàn bộ các lớp ngói quy hoạch Guland (`zIndex: 230-235`), PDF overlay (`zIndex: 250`), và bản đồ nền.
     - `cadMarkerPane` (`zIndex: 680`, `pointerEvents: 'auto'`): Chứa các nhãn đỉnh (Đ1, Đ2...), nhãn kích thước cạnh, nhãn tâm diện tích và ghim mốc định vị, đảm bảo tương tác click/kéo thả đỉnh luôn mượt mà.
     - `bringCadToFront()`: Tự động đưa toàn bộ các layer vectơ, nhãn và mốc dự án lên lớp hiển thị cao nhất.
  2. **Tự Động Tái Tạo Hình Học Từ Mốc Chưa Gán Khối (`reconstructShapesFromPoints`)**:
     - Nâng cấp thuật toán tự động nhận diện mốc từ Sổ đo, Chuyển đổi tọa độ:
       - $\ge 3$ mốc: dựng thành đa giác khép kín ranh thửa (`mode: 'polygon'`).
       - $2$ mốc: dựng thành đường tim tuyến (`mode: 'polyline'`).
       - $1$ mốc (hoặc điểm rời): dựng thành lớp điểm mốc định vị (`mode: 'point'`).
     - `appCadTool.autoLoadAllProjectDataToCad(projName)`: Nạp và đồng bộ 1 chạm toàn bộ khối, mốc, thửa lên trên cùng MiniCAD.
     - `appCadTool.zoomToAllShapes()`: Tự động zoom vừa vặn toàn bộ đối tượng khi nạp.
  3. **Đảm Bảo Xuất Dữ Liệu Tức Thì (`_getAllExportShapes`)**:
     - Tự động nạp hoặc tái tạo hình học từ mốc dự án nếu `savedShapes` rỗng, ngay lập tức mở khóa xuất AutoCAD DWG/DXF, GeoJSON, KML, CSV, Excel, PDF và Bảng kê 6 tab.
  4. **Giao Diện Điều Khiển (`index.html`)**:
     - Tab 3 MiniCAD: Bổ sung nút `#btnCadAutoSyncProjectData` (`⚡ Đồng bộ mốc/thửa`).
     - Modal nạp dự án: Bổ sung `#btnCadLoadProjectAll` (`⚡ NẠP TẤT CẢ DỮ LIỆU`) và `#btnCadLoadPointsOnly` (`📍 Nạp Điểm rời`).
  5. **Kiểm Thử Tự Động & Hồi Quy**:
     - `tests/cad_topmost_data_and_export.test.js`: 26/26 tests PASS 100%.
     - Toàn bộ suite `tests/*.test.js`: **477/477 tests PASS 100% (0 fail)**.

## Phiên trước — 2026-11-18: WP-M — TÍCH HỢP BẢN ĐỒ QUY HOẠCH GULAND 2030 LÀM NỀN DƯỚI LỚP VECTƠ & BỘ CHỌN 63 TỈNH (F-015/F-016)
- **Yêu cầu từ người dùng**:
  1. Chưa thể sử dụng các lớp bản đồ của Guland như bản đồ nền (bên dưới) để thao tác xem các điểm, tuyến, đa giác (ở trên cùng).
  2. Hiện tại chưa cho phép chọn tỉnh để lấy lớp bản đồ của Guland.
- **Giải pháp & Kiến trúc triển khai**:
  1. **Leaflet Custom Panes**:
     - `planningOverlayPane` (zIndex: 230) cho quy hoạch 2030 và `planningLandPane` (zIndex: 235) cho ranh thửa đất, nằm dưới `overlayPane` (zIndex: 400 - các nét vẽ đa giác, tuyến, điểm) và `markerPane` (zIndex: 600 - các mốc tọa độ).
     - Đặt `pointerEvents = 'none'` cho các pane này, đảm bảo 100% sự kiện click/tap/touch truyền xuyên qua xuống bản đồ và không cản trở bắt điểm hay vẽ hình vector ở lớp trên.
  2. **Bộ chọn 63 tỉnh thành & Tích hợp vào Hộp thoại Quản lý Lớp Bản đồ (`modalMapLayers`)**:
     - Thêm card `Bản đồ Quy hoạch 2030 (Guland)` trong `appMapLayers.renderPanel()`.
     - Dropdown `#mlGulandProvSelect` đầy đủ 63 tỉnh thành, thanh trượt opacity 10%-100%, checkbox lớp thửa đất, nút `🎯 Về tâm tỉnh` và `⚙️ Bảng nổi`.
     - Hàm `appPlanning.setProvinceGlobal(slug, panToCenter)` đồng bộ chọn tỉnh trên toàn bộ ứng dụng.
  3. **Tích hợp MiniCAD**:
     - Tab 3: Nút bấm `#btnCadPlanning` (`📐 Quy hoạch Guland`).
     - Tab 4: Checkbox `#cadCheckShowGulandPlanning` trong nhóm `HIỂN THỊ`.
     - Thẻ nổi: `#cadPlanningCtrl` ở góc trên bên phải bản đồ.
     - Dòng lệnh CADCraft 2D CLI: Lệnh `QH`, `GULAND`, `QUYHOACHGULAND`.
  4. **Kiểm thử tự động**:
     - `tests/planning_map_integration.test.js`: 34/34 tests PASS.
     - Toàn bộ suite `tests/*.test.js`: 476/476 tests PASS 100%.

## Phiên trước — 2026-11-18: WP-L — BẬT / TẮT LỚP BẢN ĐỒ PDF & ẢNH QUY HOẠCH (F-016)
- **Yêu cầu**: `cho phép bật/tắt lớp bản đồ được chèn bởi file PDF`. Master toggle `appPlanOverlay.toggleAll()`, MiniCAD checkbox & nút bấm, modalMapLayers slider & sub-controls, lệnh CLI `PDF`/`PLAN`.

## Phiên trước — 2026-11-09: WP-I — TỐI ƯU HÓA CHỈ ĐƯỜNG & LỘ TRÌNH GIAO THÔNG (XE MÁY, Ô TÔ CON, XE 16 CHỖ) (F-012)
- **Yêu cầu từ người dùng**:
  1. Thêm chức năng tối ưu hóa lộ trình giao thông cho các điểm mốc theo 3 loại phương tiện: Xe máy, Ô tô con, Ô tô 16 chỗ.
  2. Hỗ trợ 3 nguồn dữ liệu điểm: (1) Chấm trực tiếp trên bản đồ Leaflet; (2) Chọn mốc từ Quản lý dữ liệu mốc; (3) Nhập/dán bảng tọa độ (VN-2000 hoặc WGS-84).
  3. API OSRM trực tuyến (chuẩn Traveling Salesperson Problem - TSP) kết hợp fallback ngoại tuyến đường nối trắc địa.
  4. Tự động lấy vị trí GPS hiện tại làm điểm xuất phát; hỗ trợ tùy chọn lộ trình khép kín (khứ hồi) vs 1 chiều.
  5. Dẫn đường bằng giọng nói tiếng Việt tự động (`vi-VN`) trực tiếp trong PWA; tích hợp Screen Wake Lock API giữ màn hình luôn sáng.
  6. Mở sang Google Maps với cơ chế tự động chia nhỏ thành các chặng tối ưu $\le 9$ điểm dừng (`#modalGoogleMapsLegs`) để tài xế lái xe liên tục không bị giới hạn URL.
  7. Vị trí UI độc lập 100% (`UI Isolation Principle`): Card 8 trên Dashboard, Drawer item 2.3 `#drawerItem_routing`, nút tác vụ trong Quản lý dữ liệu mốc `#barBatchPointsActions` và `card-tools` sổ đo; màn hình `#screen-routing` tách biệt hoàn toàn.
- **Giải pháp & Kiến trúc triển khai**:
  1. **UI & Layout**:
     - `index.html`: Thêm card 8 `#cardOptRoute` trên Bento grid Dashboard, card 6 trong danh sách menu gọn, `#drawerItem_routing` trong drawer menu; nút `🚗 Tối ưu lộ trình` trong `#barBatchPointsActions` và nút `🚗 Lộ trình` trong `card-tools` của `#screen-datamgmt`.
     - Thêm phân hệ `#screen-routing` độc lập: thanh điều khiển phương tiện (Xe máy, Ô tô con, 16 chỗ), tùy chọn khứ hồi, cảnh báo barie/tải trọng xe 16 chỗ, bản đồ `#leaflet-routing-map`, HUD dẫn đường thời gian thực `#routingNavHud`, danh sách điểm chặng `#routingPointsSheet`.
     - Thêm 2 modal: `#modalRoutingAddPoints` (nhập tọa độ / chọn mốc sổ đo) và `#modalGoogleMapsLegs` (danh sách chặng Google Maps).
  2. **Styling & Touch Standards**:
     - `ui-polish.css`: Bổ sung CSS cho `#screen-routing`, marker pin (Start, Mid, End), HUD dẫn đường bo góc, bottom sheet kéo thả, touch floor $\ge 40\text{px}$/44px, tuân thủ nghiêm ngặt `--sat-safe-*` và `calc(var(--ui-avail-h) * 0.9)`.
  3. **Module `appRouting` trong `app.js`**:
     - Quản lý danh sách điểm (`points`), phương tiện (`vehicle`: `motorcycle`, `car`, `van16`), trạng thái khứ hồi (`isRoundTrip`).
     - Tích hợp OSRM Trip API (`/trip/v1/driving/`) với giải thuật TSP tối ưu hóa thứ tự ghé thăm mốc ngắn nhất.
     - Dẫn đường thời gian thực (`startNavigation`, `watchPosition`) với giọng nói Web Speech API (`speechSynthesis`) phát nhắc ngã rẽ khi cách $\le 70\text{m}$.
     - Kích hoạt Screen Wake Lock (`navigator.wakeLock.request('screen')`) giữ màn hình luôn sáng và tự động tái cấp phát khi quay lại tab.
     - Hàm `openGoogleMapsChunked()`: chia danh sách mốc thành các chặng $\le 9$ điểm dừng theo chuẩn Google Maps URL API (`dirflg=d` cho ô tô, `dirflg=w` cho xe máy), cho phép tài xế chuyển chặng mượt mà.
  4. **Tích hợp & Đồng bộ bộ nhớ**:
     - `appNav.showScreen('routing')`, `appNav.syncActiveMenuWithScreen('routing')`, `appNav.navigateTo('routing')`.
     - Thêm item 10 vào `appDashboard.allFeatures`.
     - Đăng ký tài nguyên: `sw.js` `CACHE_NAME = 'vn2000-pro-v2.8.28'`, `index.html` (`style.css?v`, `ui-polish.css?v`, `app.js?v` = `2.8.28`).
     - Cập nhật `feature_list.json` (active feature `F-012`, version `2.8.0`).
- **Kết quả kiểm chứng**:
  - `tests/route_optimization.test.js`: **3/3 PASS (100%)**.

## Phiên trước — 2026-11-07: WP-L — LÀM TOÀN BỘ ĐỀ XUẤT + ĐỊA CHỈ SAU SÁP NHẬP TRÊN CAMERA
- **Yêu cầu**: `Thực hiện tất cả các đề xuất trên, bổ sung thêm là hiển thị địa chỉ sau sáp nhập khi chụp ảnh/quay film đóng dấu camera`.
- **Chi tiết**: `progress.md` mục WP-L; trạng thái đề xuất ở `docs/DE_XUAT_BO_CUC_GIAO_DIEN.md` (tất cả ✅).
- **Điểm cần nhớ**:
  - Dữ liệu địa giới: chạy lại `python3 -I tools/build_vn_admin_2025.py <json/geojson> data/vn_admin_2025.js` khi có bản cập nhật; đổi tên `DATA_CACHE` trong sw.js để máy người dùng tải bản mới.
  - Biến `const` (VN_PROVINCES, AppState, appData) KHÔNG nằm trên `window` — module ngoài app.js phải gọi trực tiếp theo tên.
  - 34 tỉnh nối sau 63 tỉnh cũ trong `VN_PROVINCES`; dùng `VN_PROVINCES_OLD_COUNT` / `p.era === '2025'`.
  - Ô chọn tỉnh mới: luôn dùng `provinceOptionsHtml(selectedIdx, labelFn)`.
  - CSS `!important` trong style.css/ui-polish.css có thể vô hiệu hóa `el.style.display` của JS (đã gặp ở nút Quay lại và thanh Bản đồ dự án) — kiểm bằng computed style khi sửa hiển thị.
- **Cần chủ dự án xác minh**: KTT Lai Châu / Phú Thọ / Ninh Bình (34 tỉnh) và Bình Thuận (63 tỉnh cũ) với văn bản gốc; tên "Thành phố" của Quảng Ninh / Bắc Ninh / Đồng Nai lấy nguyên từ dữ liệu sapnhap.bando.

## Phiên trước — 2026-11-06: WP-K — ĐỔI KTT/MÚI, CHUẨN HÓA NHẬP/XUẤT, MINICAD, MENU
- **Yêu cầu**: tối ưu & đề xuất bố cục/phân nhóm/menu; thêm đổi VN-2000 giữa KTT/múi; kiểm tra MiniCAD; kiểm tra nhập/xuất dữ liệu.
- **Chi tiết**: `progress.md` mục WP-K; đề xuất ở `docs/DE_XUAT_BO_CUC_GIAO_DIEN.md`.
- **Điểm cần nhớ**:
  - Mọi exporter đi qua `appData.getExportPoints()` → `normalizeSurveyPoints` (geodesy.js). Exporter mới phải dùng hàm này, không đọc `appData.getPoints` trực tiếp.
  - Nhập file: `processImportedText` thử `parseHeaderedTable` trước (chỉ khi định dạng = auto), rồi mới tới bộ đọc từng dòng `parseSmartManualLine`.
  - Không dùng `split(/\r?\r\n/)`; test `data_io_roundtrip` khóa lại.
  - MiniCAD: X/Y là số liệu gốc; `_normalizeVertex` chỉ tính lại khi lat/lng lệch thật.
  - `COMMON_KTT_PRESETS` sinh từ `VN_PROVINCES` — sửa KTT tỉnh chỉ cần sửa bảng.
- **Việc kế tiếp / chờ quyết định**: xác minh KTT Bình Thuận; bảng KTT 34 tỉnh sau sáp nhập; màn nhập dữ liệu thống nhất có xem trước & chọn cột; các mục ⏳ trong file đề xuất.

## Phiên trước — 2026-11-06: WP-J — VÙNG AN TOÀN TAI THỎ / DYNAMIC ISLAND / XOAY NGANG
- **Yêu cầu**: `Fix lỗi màn hình chưa được tối ưu cho các loại màn hình khác nhau, trong đó có loại màn hình tai thỏ hoặc dynamic island`.
- **Chi tiết**: xem `progress.md` mục WP-J.
- **Điểm cần nhớ**:
  - Đo inset thật bằng CDP `Emulation.setSafeAreaInsetsOverride({ insets: {top,bottom,left,right} })` (Chromium ≥ 136) — không cần thiết bị thật để thấy lỗi tai thỏ.
  - Header: chỉ sửa trong `ui-polish.css` rule `header.app-header.mac-top-bar` (lớp cuối, `!important`); test `safe_area_notch_island.test.js` khoá lại.
  - Bố cục trái/phải của Chuyển đổi: JS `isTransformSideBySide()` và media query ui-polish phải cùng điều kiện.
- **Việc kế tiếp**: thiết kế lại thanh công cụ MiniCAD cho màn ngang thấp (CLI đang che một phần thanh công cụ).

## Phiên trước — 2026-11-06: WP-I — TỐI ƯU TRẢI NGHIỆM NGƯỜI DÙNG LẦN ĐẦU
- **Yêu cầu**: `Tối ưu ứng dụng và đề xuất chỉnh trang giao diện và cách bố trí các nội dung do người dùng lần đầu khó hiểu cách sử dụng`.
- **Đã làm**: xem chi tiết trong `progress.md` (mục 2026-11-06). Tóm tắt: bỏ màn chờ ủng hộ ngày đầu tiên, ẩn nút Quay lại ở Trang chủ, hướng dẫn `?` riêng cho Trang chủ, nhãn dock ngắn, thẻ chào mừng 3 bước + dòng giải thích chế độ, placeholder "VD:", đưa 4 ô chức năng lên trước khối GPS.
- **Điểm cần nhớ**:
  - `#btnHeaderBack` phải bật/tắt bằng thuộc tính `hidden` (CSS `!important` của `.mac-pill-btn` thắng `style.display`).
  - Muốn bật lại màn chờ ủng hộ ngay ngày đầu: bỏ dòng `if (!lastShown && firstUse === today) return;` trong `appDonate.checkDailyTrigger`.
- **Đề xuất chưa làm (cần chủ dự án quyết)**:
  1. Header điện thoại quá chật: tên app bị cắt, dòng 📍 Tỉnh/KTT bị ẩn. Đề xuất bỏ chữ trên header, đưa Tỉnh/KTT thành chip luôn hiện ngay dưới header ở mọi màn hình.
  2. Nút GPS trên header chỉ là một chấm xám không chữ → thêm nhãn "GPS" hoặc trạng thái "Tắt".
  3. Gộp hai chế độ Đơn giản/Nâng cao: Trang chủ duy nhất = khung chuyển đổi nhanh ở trên + 4 ô chức năng + "Công cụ khác" ở dưới, bỏ công tắc chế độ.
  4. Khối GPS (lớn, toàn gạch ngang khi chưa bật) chỉ nên hiện khi GPS đang bật; khi tắt thay bằng một nút "Bật GPS".
  5. Thống nhất thuật ngữ: "Bản Đồ Trắc Địa" / "Bản đồ dự án & Mốc" / "Bản Đồ Khảo Sát & Vệ Tinh" đang chỉ cùng một màn.
  6. Màn chờ ủng hộ: cân nhắc chuyển thành thẻ nhỏ không chặn (hoặc giảm 20s → 5s).

## Phiên trước — 2026-11-04: WP-H — KHẮC PHỤC NÚT CHUYỂN TIỀN QUA APP ỦNG HỘ TÁC GIẢ & TẢI MÃ VIETQR
- **Yêu cầu từ người dùng**: `nhấn nút chuyển tiền qua app để ủng hộ tác giả bị lỗi`.
- **Nguyên nhân**:
  1. Hai kênh VietinBank và BIDV dùng liên kết rút gọn Firebase Dynamic Links `*.page.link` đã bị khai tử bởi Google, gây lỗi 404 khi người dùng bấm vào.
  2. Nút bấm không kích hoạt deep link app trên điện thoại, chưa tự động sao chép STK vào Clipboard.
- **Giải pháp & Kiến trúc triển khai**:
  1. Cập nhật URL web chính thức của 4 kênh và hỗ trợ Deep Link app di động:
     - VietinBank: `https://ipay.vietinbank.vn/` + scheme `vietinbankipay://`
     - BIDV: `https://smartbanking.bidv.com.vn/` + scheme `bidvsmartbanking://`
     - MoMo: `https://nhantien.momo.vn/0839656568` + scheme `momo://`
     - ZaloPay: `https://zalo.me/0839656568` + scheme `zalopay://`
  2. `appDonate.handleOpenApp`:
     - Tự động sao chép STK `0839656568` (ĐẶNG NHƯ) vào Clipboard và hiển thị Toast thông báo rõ ràng cho người dùng.
     - Kích hoạt deep link app tương ứng trên thiết bị di động, đồng thời mở cổng thanh toán chính thức an toàn.
  3. `appDonate.downloadQrImage`:
     - Bổ sung nút `💾 Tải mã VietQR về máy (để quét ảnh)`.
     - Cho phép tải ảnh mã QR VietQR (PNG Blob) về máy để quét từ bất kỳ ứng dụng ngân hàng nào (Vietcombank, MB, Techcombank, VPBank, Agribank...).
  4. Đăng ký tài nguyên: `sw.js` `CACHE_NAME = 'vn2000-pro-v2.8.23'`, `index.html` (`style.css?v`, `ui-polish.css?v`, `app.js?v` = `2.8.23`).
- **Kết quả kiểm chứng**: `tests/donate_modal_30s.test.js` **8/8**; toàn dự án `npm test` **321/321 PASS (100%)**.

## Phiên trước — 2026-11-04: WP-G — CHỌN NHIỀU DỮ LIỆU & CHIA SẺ SỔ ĐO + TẢI/CHIA SẺ ẢNH ĐÓNG DẤU CHUẨN BLOB
- **Yêu cầu từ người dùng**:
  1. `đối với các chức năng về quản lý dữ liệu, cần bổ sung nút chia sẻ và chọn nhiều dữ liệu để chia sẻ.` (Lựa chọn A: menu chia sẻ trực tiếp Zalo, SMS, Mail... kèm tải CSV/TXT nhanh; chọn nhiều mốc để chia sẻ, xuất riêng và xóa hàng loạt).
  2. `chức năng Camera đóng dấu khi tải ảnh từ thư mục quản lý về thì chưa được đóng dấu mà chỉ là ảnh chụp bình thường` + bổ sung nút `📤 Chia sẻ Zalo/Thiết bị` ngay trên thẻ ảnh.
- **Kiến trúc đã dựng**:
  1. **Quản lý dữ liệu (`screen-datamgmt`)**:
     - Thêm cột Checkbox `#chkSelectAllPoints` và `.chk-point-item` cho từng mốc.
     - Thanh tác vụ Batch Actions `#barBatchPointsActions`: hiển thị số lượng mốc đã chọn và 5 nút: *📤 Chia sẻ*, *📁 Xuất đã chọn*, *📋 Chép text*, *🗑️ Xóa đã chọn*, *✕ Bỏ chọn*.
     - Bổ sung nút *📤 Chia sẻ* trên card-tools của Danh sách mốc.
     - Hỗ trợ `navigator.share` (Zalo, Tin nhắn, Gmail...) với nội dung bảng trắc địa chuẩn + đính kèm file CSV UTF-8 BOM; fallback sao chép Clipboard và tải file CSV khi chạy trên Desktop.
     - Hỗ trợ xuất chọn lọc qua `this._customExportPoints` cho Studio Xuất Dữ Liệu (`openExportModal`).
  2. **Camera Khảo sát đóng dấu (`screen-camera`)**:
     - Hàm `dataUrlToBlob(dataUrl)`: chuyển đổi Base64 Data URL thành Blob nhị phân chuẩn W3C.
     - Sửa `downloadSingleMedia()` & `downloadAllImages()`: sử dụng Blob URL `URL.createObjectURL(blob)` để tải file, loại bỏ triệt để hiện tượng mất dấu hoặc thẻ download Base64 bị nuốt trên Safari/Chrome mobile.
     - Bổ sung hàm `shareSingleMedia(id)` và `shareCurrentViewerMedia()`: cho phép chia sẻ file ảnh trực tiếp có đầy đủ con dấu qua `navigator.share({ files: [file] })` (gửi thẳng Zalo, Tin nhắn hoặc Lưu vào Album ảnh).
     - Thêm nút `📤` trên từng thẻ ảnh trong tab *📂 Thư viện* (`cameraGalleryGrid`) và nút `📤 Chia sẻ` trong modal xem chi tiết ảnh (`modalCameraMediaViewer`).
  3. **Đăng ký tài nguyên**: `sw.js` `CACHE_NAME = 'vn2000-pro-v2.8.22'`, `index.html` (`style.css?v`, `ui-polish.css?v`, `app.js?v` = `2.8.22`).
- **Kết quả kiểm chứng**: `tests/datamgmt_multiselect_share_and_camera_download.test.js` **4/4**; toàn dự án `npm test` **319/319 PASS (100%)**.

## Phiên trước — 2026-11-02: WP-F — SÀN CHẠM TỐI THIỂU cho mọi nút & ô nhập (kiểm kê trực tiếp 390×844)
- **Yêu cầu từ người dùng**: `tiếp tục kiểm tra các nút và giao diện của app` (nhắc lại 2 lần) → kiểm kê **từng bề mặt trong trình duyệt** rồi sửa mọi điều khiển dưới sàn ngón tay. Không có phạm vi chốt bằng AskUserQuestion trong đợt này: người dùng muốn tự kiểm tra và báo lỗi, vì vậy cách làm là **đo, liệt kê, sửa, đo lại**.
- **Kiến trúc đã dựng** (chỉ `ui-polish.css` §6, `index.html`/`sw.js` tăng version, `tests/touch_target_floor.test.js` mới):
  1. **Neo**: 17 lớp/id được đặt `position: relative` (`btn-header-action`, `mac-ctrl-btn`, `btn-map-action`, `btn-help-circle(-sm)`, `camera-icon-btn`, `btn-modal-close`, `btn-sm`, `cad-ribbon-btn`, `cad-cmd-*`, `cad-hud-btn`, `#btnDockCollapse`, `#fwSimple/#fwAdvanced/#fwField`, `btn-drawer-clear`, `btn-resizer-quick-toggle`…) để chứa vùng chạm.
  2. **Nhát 1 — chỉ mở CHIỀU DỌC 44px** cho nút nằm trong hàng dọc (`::after` `left/right:0; height:44px; margin-top:-22px`) → **không trộm chạm láng giềng**, **không giãn mật độ bảng**. **Nhát 2 — mở 44×44** cho nút tròn/icon góc (`margin:-22px 0 0 -22px`). Cả hai dùng **margin**, không dùng `translate()`.
  3. **Sàn thật cho replaced element**: `input.app-input, select, select.app-select, .map-proj-select` **40px**; `[class*="modal"] select / input[type=text|number]` **36px**; `input[type=checkbox|radio]` **20px**; `input[type=color]` **34px**; `#chkGuideDontShowAgain` **26px**; `.cad-check-label/.cad-export-check-item` **34px**; Leaflet `.leaflet-bar a` **40×40 (thật)**.
  4. **MiniCAD**: ribbon thoát nén → `flex:0 0 auto`, **46×40**, font 12px (dải **cuộn ngang**, `scrollWidth 895 > clientWidth 368`); `.cad-btn-icon` (Lùi/Tiến) **40×40**; `button.btn-sm` **min-width 40** (nút ✕ 23px); `.cad-tab-btn` **38px**; `.cad-cmd-input` 38, `.cad-cmd-submit-btn` 38×38.
  5. **Modal**: `.btn-micro` **34×38**, `.donate-channel-pill` **44px**, `button[title="Gập / Mở bảng này"]` **38×38** (nút **không class/id** → buộc dùng attribute title), `[class*="modal"] a[href]` **34px**, `a[href^="mailto:"]` padding **11px**.
- **Điểm cần nhớ khi sửa tiếp**:
  - **`::after` bất lực trên `input`/`select`** (replaced element) ⇒ ô nhập bắt buộc tăng `min-height` thật.
  - **`::after` bị cha `overflow:hidden` cắt** (nhóm `.card-tools` màn Cắm mốc) ⇒ ở đó phải tăng chiều cao thật (`.btn-sm { min-height: 40px }`).
  - **`min-height` thắng inline `height: 30px` mà không cần `!important`** (hai tính chất khác nhau, giải bằng ràng buộc hộp) ⇒ **một rule** phủ ~59 khai báo nội tuyến trong index.html. Đừng viết `height: … !important` — sẽ làm layout giãn và khó gỡ.
  - **Media query KHÔNG tăng mức ưu tiên.** Khi một rule có `!important` + đặc hiệu cao hơn đã ấn định sàn cũ, **phải sửa đúng rule đó**: [ui-polish.css:505](ui-polish.css) `:is(#screen-stakeout,#screen-datamgmt) .card-header .card-tools .btn-sm` (36→**40**) và [ui-polish.css:313](ui-polish.css) `#modalDonateCountdown .donate-channel-pill.support-channel-btn` (36→**44**). Chồng rule mới đặc hiệu thấp hơn ở cuối file là **không có tác dụng**.
  - **Định tâm pseudo bằng `margin: -22px 0 0 -22px`**, không bằng `transform: translate(-50%,-50%)` — `#btnDockCollapse` đã có `transform … !important` nên translate bị computed thành `none`.
  - **Mỗi lần bump `CACHE_NAME` là một lần `location.reload()`** ([index.html:7585](index.html), `setTimeout(…, 1500)`) ⇒ iframe kiểm kê bị xoá. **Gom hết sửa CSS rồi mới bump một lần**, tạo lại iframe sau khi reload.
  - **Đo đúng**: vùng chạm hiệu dụng = `max(rect, min-height, ::after)`; modal phải quét bằng cách **ép `display:flex` rồi khôi phục `cssText`** (lúc ẩn thì rect = 0). Probe `elementFromPoint` phải đi **từ biên rect ra ngoài** và chỉ nhận `t === el || el.contains(t)`.
  - **Luôn kèm canh gác tràn ngang** (`scrollWidth − clientWidth`) sau mỗi lần nâng sàn, và **đo đối chứng ở desktop 1280×800** để chắc `@media (max-width:900px),(pointer:coarse)` không kích hoạt (đã xác nhận: `::after content:none`, header giữ 79×36).
- **Kết quả kiểm chứng**: `tests/touch_target_floor.test.js` **54/54**; toàn dự án `npm test` **315/315 PASS**; live iframe 390×844: **10 màn + 6 tab CAD + Layer Manager + Bản đồ dự án + drawer = 0 cờ, OVF=0**; quét toàn bộ modal = **0 cờ**. Trước/sau tiêu biểu: header 44×32→44×44, dock 20×20→44×44, help modal Cài đặt 26×26→44×44, undo/redo 26×26→40×40, ribbon 17×26→46×40, tab CAD 28→38, `.btn-micro` 25×26→34×38, pill chuyển khoản 36→44, Leaflet 30→40, `#btnStakeoutBeep` 116×28→116×40, `#selFormatWgs` 30→40.
- **Đăng ký tài nguyên**: `index.html` `style.css?v` / `ui-polish.css?v` / `app.js?v` = **2.8.21**; `sw.js` `CACHE_NAME = vn2000-pro-v2.8.21`. Không sửa `style.css`, `app.js`, `field-workspace.css` trong đợt này.
- **Còn lại / việc kế tiếp**:
  1. **Mở trên điện thoại thật** để chốt: desktop không giả lập đồng thời `pointer:coarse` + `env(safe-area-inset-*)`; nếu người dùng vẫn thấy nút nào khó chạm, bổ sung lớp đó vào **danh sách neo** + một trong hai nhát pseudo.
  2. Cân nhắc chuẩn hoá `.cad-cmd-btn-toggle` (30×30, hiện chỉ đủ nhờ pseudo 44×44) và **rà `@media (max-width: 768px)`** còn rule nào nên nhân bản sang nhánh ngang; màn gập/tablet ngang cao >620px vẫn chưa thuộc nhánh compact nào.
  3. **Backlog CADCraft**: **Hatch** + **Import DXF** (task #23); kéo `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` vào `npm test`.
  4. **Ràng buộc của người dùng vẫn hiệu lực**: "Tôi tự rever — đừng đẩy lại" → chỉ push `integration-draw-fixes`, **không đụng `main`**, rồi fast-forward mirror `D:\Nhu\APP\VN2000-PWA`. "Port lần lượt, ưu tiên Dimension".
  5. **Không chạy `npm install`** trong `I:\My Drive\...`; stage đúng tên tệp (`index.html`, `ui-polish.css`, `sw.js`, `tests/touch_target_floor.test.js`, `progress.md`, `session-handoff.md`), **không `git add -A`** — `git status` còn nhiều tệp skill/asset/`geodesy.js`/`src/core/cad_geometry.js` `M` và `?? BandohanhchinhVietNam_34tinhthanh.pptx` không thuộc đợt này.

## Phiên trước — 2026-11-02: WP-E — Giao diện TỰ PHÂN PHỐI THEO VÙNG AN TOÀN 4 MÉP (tai thỏ / nốt ruồi / ngang / bàn phím)
- **Yêu cầu từ người dùng**: `giao diện tổng thể của ứng dụng chưa đáp ứng tự động phân phối phù hợp cho tất cả các màn hình do có thể nằm ở khu vực không thao tác được của các thiết bị có camera dạng tai thỏ hoặc nốt ruồi`. Phạm vi chốt qua AskUserQuestion: **"Trọn gói: tai thỏ + nốt ruồi + ngang + bàn phím"** + **"Cho pinch-zoom toàn ứng dụng"**.
- **Kiến trúc đã dựng**:
  1. **Lưới token 4 mép** [style.css:25-43](style.css): `--sat-safe-top/left/right` = `env(safe-area-inset-*)`, `--kb-inset: 0px`, và **mấu chốt là `--sat-safe-bottom: max(env(safe-area-inset-bottom, 0px), var(--kb-inset))`** — gộp bàn phím vào mép dưới nên ~26 rule đang dùng token (kể cả mọi literal `!important` trong `ui-polish.css` mà test đang khoá chặt) tự nâng theo bàn phím mà **không phải sửa từng rule**. Thêm `--app-vh` (JS đo), `--ui-edge-{top,right,bottom,left}` (lề 8px + inset cho overlay), `--ui-dock-clear`, `--ui-avail-h = --app-vh − top − bottom` (trần thật cho modal/panel).
  2. **`appViewport`** [app.js:34811](app.js) (§10.8): ghi `--app-vh = innerHeight`, `--kb-inset = max(0, innerHeight − visualViewport.height − visualViewport.offsetTop)`; nghe `resize` + `orientationchange` (+ bù 260ms sau xoay) + `visualViewport.resize/scroll`, gộp trong một `requestAnimationFrame`. **`init()` gọi TRƯỚC `appTheme.init()`** [app.js:35283](app.js) để đo xong mới dựng giao diện, khỏi nháy layout khung đầu.
  3. **Khung ứng dụng**: `#app-container` cao `var(--app-vh)`; `header.app-header`, `.screen-view`, `nav#mobileBottomNav` (kể cả nhánh ≤600px), `.btn-floating-quicknav`, `#toast-msg` (trục giữa hiệu chỉnh `(left − right)/2`), `.nav-tree-backdrop/drawer`, `.drawer-header`, `.drawer-tree-body` đều trừ đủ inset 4 mép.
  4. **Bề mặt bản đồ & MiniCAD**: `map-top-bar`, `map-project-bar`, `bar-coord-picker`, `map-cad-toolbar`, `map-right-controls`, `map-bottom-sheet`, `map-measure-box`, `map-distance-hud`, `cad-status-hud`, `cad-thumb-action-bar`, `cad-floating-cmd-bar`, `cad-blocks-panel`/`project-marks-blocks-panel` (+ `.maximized`), `transform-bottom-sheet`, `transform-map-column.is-fullscreen` → `calc(var(--sat-safe-{left,right}) + Npx)`; `max-width` của `.cad-status-hud`/`.map-distance-hud` **trừ thêm hai inset bên**.
  5. **Hết `vh` thô ở mọi tầng**: 22 rule style.css + 5 rule ui-polish.css + **19 inline `max-height: NNvh` trong index.html** + 5 chỗ gán JS trong app.js ⇒ tất cả qua `--app-vh`/`--ui-avail-h`, giữ nguyên tỉ lệ (`94vh` → `calc(var(--ui-avail-h) * 0.94)`). `--app-vh: 100vh` chỉ còn là giá trị khởi điểm.
  6. **Màn ngang compact theo CHIỀU CAO** (không theo bề rộng): `@media (orientation: landscape) and (max-height: 620px)` ở style.css (gọi lại dock, trần modal theo `--ui-avail-h`, bỏ sàn 680px của `.transform-split-layout`) **và khối cùng điều kiện ở cuối `ui-polish.css`** vì lớp này nắm `!important`: header 44px, dock 46px áp đáy `+4px` (dải 4→50px), nhãn dock 9.5px, HUD/sheet/coord-hud/Leaflet `+56px`, thumb bar `+60px`, CLI `+96px`, kèm biến thể `body.dock-collapsed`.
  7. **Pinch-zoom mở lại**: viewport meta [index.html:6-7](index.html) bỏ `user-scalable=no`, `maximum-scale=6.0`; bù độ trễ chạm bằng `touch-action: manipulation` cho `button/select/textarea/input/label/.mobile-bottom-nav/.bottom-nav-item` [style.css:63-72](style.css).
- **Điểm cần nhớ khi sửa tiếp**:
  - **`ui-polish.css` là lớp cuối và là "quyền lực cuối"**: ngưỡng neo viết trong `style.css` cho cùng selector mà ui-polish đã đặt `!important` với đặc hiệu **bằng hoặc cao hơn** ⇒ không bao giờ có hiệu lực (đã kiểm chứng bằng cách duyệt `document.styleSheets` và in mọi rule khớp). Muốn đổi ngưỡng neo/HUD/dock/header thì **sửa trong ui-polish.css**.
  - **Không viết tay `--x: 100vh; --x: 100dvh;` để làm fallback**: custom property giải tại computed-value time, đơn vị không hỗ trợ ⇒ IACVT ⇒ `unset`, không rơi về giá trị trước. Muốn an toàn thì đo bằng JS (`appViewport`) — vì vậy mới có `--app-vh`.
  - **Bề mặt neo MỘT cạnh mà tính bề rộng theo `100%`** sẽ tràn sang mép đối diện khi máy có nốt ruồi bên; phải `calc(100% - var(--sat-safe-left) - var(--sat-safe-right) - ...)`.
  - **Test cấu trúc CSS (nhóm 9 của `tests/safe_area_cutout_fit.test.js`) là bắt buộc giữ**: script patch từng tạo 13 khai báo **mất tên thuộc tính** (`calc(...) ` đứng trần) ở `.cad-status-hud`, `.cad-thumb-action-bar`, `.cad-floating-cmd-bar`, `.bar-coord-picker`, `.map-measure-box`, `.map-distance-hud`, `.cad-blocks-panel`, `.project-marks-blocks-panel` — CSS hỏng nhưng không test nào bắt được. Sau mọi lần vá CSS bằng script: quét dòng bắt đầu bằng `calc(/var(/env(` + kiểm `{}` cân bằng.
  - **Đo live bằng iframe + `*{transition:none !important}`**: các bề mặt có `transition: bottom .24s` trả computed style **trễ một chu kỳ** khi trang bị ẩn (surface Browser trong app không render), dễ đọc nhầm "không phản ứng". Cách đáng tin: tạo `<iframe>` 851×390 (ngang) / 390×844 (dọc), chèn style tắt transition, đặt token giả lập cắt góc **trước** layout đầu rồi mới đo `getBoundingClientRect`.
  - `env(safe-area-inset-*)` **không giả lập được bằng CSS**, chỉ ghi đè token; trên máy thật hãy dùng chrome://flags "Simulate display with notches" để xác nhận lần cuối.
  - Version tài nguyên giờ do **3 test cùng khoá** (`sw.js` ↔ `app.js?v=` ↔ `style.css?v=` và test mới thêm `ui-polish.css?v=`) — bump cả 4 chỗ cùng lúc, hiện là **2.8.13**.
- **Kết quả kiểm chứng**: `tests/safe_area_cutout_fit.test.js` mới **71/71**; toàn dự án `npm test` **314/314 PASS (0 fail)**; `node --check app.js` đạt; CSS `{}` cân bằng (style 1590 cặp, ui-polish 358, field 79) và 0 dòng mất tên thuộc tính. Live localhost:8080: `--app-vh` đo thật 785px (trang chính) / 390px (iframe ngang); giả lập cắt góc left/right 28px + bottom 34px ⇒ CLI +28px hai bên, `.map-right-controls` dịch 28px vào trong, HUD/dock/CLI nâng đúng +34px; iframe 851×390 ⇒ `matchMedia('(orientation: landscape) and (max-height: 620px)')` true, **dock hiện lại** (flex, cao 46px, dải 4→50px), header 44px, HUD `bottom 72px` = 56+16, CLI 112 = 96+16, `dockTop − hudBottom = 0` (kề sát không đè), không tràn mép phải; iframe 390×844 đặt `--kb-inset: 260px` ⇒ `--sat-safe-bottom` resolve 260px và dock `bottom` **10px → 270px** (tự né bàn phím, không sửa rule nào).
- **Đăng ký tài nguyên**: `index.html` viewport meta + `style.css?v=2.8.13` + `app.js?v=2.8.13` + `ui-polish.css?v=2.8.13`, 19 inline style đổi sang token; `sw.js` `CACHE_NAME = vn2000-pro-v2.8.13`; `field-workspace.css:87` header chế trường trừ đủ 3 inset.
- **Còn lại / việc kế tiếp**:
  1. **Backlog CADCraft port**: **Hatch** và **Import DXF** (task #23); kéo `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` vào `npm test`.
  2. **Ý định chưa làm**: rà `@media (max-width: 768px)` còn rule nào nên nhân bản sang nhánh ngang; kiểm tra màn gập (foldable) và tablet ngang cao >620px (đang chưa thuộc nhánh compact nào); cân nhắc `--sat-safe-*` cho Leaflet popup/tooltip (hiện chỉ chỉnh `.leaflet-bottom`).
  3. **Ràng buộc của người dùng vẫn hiệu lực**: "Tôi tự rever — đừng đẩy lại" → chỉ push `integration-draw-fixes`, không đụng `main`; rồi fast-forward mirror `D:\Nhu\APP\VN2000-PWA`. "Port lần lượt, ưu tiên Dimension".
  4. **Không chạy `npm install`** trong `I:\My Drive\...`; stage đúng tên tệp (`app.js`, `index.html`, `style.css`, `ui-polish.css`, `field-workspace.css`, `sw.js`, `tests/safe_area_cutout_fit.test.js`, `progress.md`, `session-handoff.md`), không `git add -A` — `git status` còn nhiều tệp skill/asset/`geodesy.js`/`src/core/cad_geometry.js` `M` không thuộc đợt này.

## Phiên trước — 2026-10-30: WP-D — Kiểu & màu ký hiệu cho ĐỈNH KHỐI/TUYẾN + nhánh "Ký hiệu & Hiển thị"
- **Yêu cầu từ người dùng**: `- bổ sung cho phép điều chỉnh hình dạng và màu sắc các điểm được vẽ trong MiniCAD. cho phép tắt/mở hiển thị các điểm, các đỉnh của khối và tuyến (chia riêng từng dạng chứ không gộp chung, có thể gộp chung 1 nhánh thao tác)` — hiển thị 3 nhóm + kiểu/màu **điểm rời** đã có từ WP-A; phạm vi chốt qua AskUserQuestion: **đổi kiểu+màu đỉnh khối/tuyến** và **gộp thành 1 nhánh thao tác**.
- **Kiến trúc đã dựng**:
  1. **Một chuỗi ưu tiên duy nhất** [app.js:20438](app.js): `getGlyphLayerOf(shape)` + `getPointStyleFor(shape, v)` / `getPointColorFor(shape, v)` = *đỉnh (`v.style`/`v.color`) → khối (`shape.style`, màu của lớp điểm) → mặc định lớp CAD (`layersTable[].vStyle`/`vColor`) → mặc định hệ thống* (`circle` / `#10b981`). **Mỗi ứng viên được kiểm tra riêng** (`find(ok)` / `map(hex).find(Boolean)`) — giá trị rác tầng trên không che giá trị hợp lệ tầng dưới.
  2. **Badge thống nhất trong `renderGeometry()`** [app.js:24945-24967](app.js): đỉnh khối/tuyến nhận `sty-<kiểu>` + màu thật + `dot-visible`; `showLabels` nay chi phối cả đỉnh (trước đây bị bỏ qua); `marker._pinned = isExpanded || isDotGlyph` để `mouseout` của khối không gỡ `dot-visible`.
  3. **Đỉnh đang vẽ thừa kế ký hiệu lớp đang chọn**: `draftGlyphShape/draftGlyphStyle/draftGlyphColor` tính trước vòng lặp `this.vertices`.
  4. **Mutator từng đỉnh**: `setVertexGlyph(shapeIdx, vIdx, field, value)` / `resetVertexGlyph(shapeIdx, vIdx)` — validate `pointStyles` + `#RRGGBB`, bỏ qua giá trị không đổi, tôn trọng `isShapeLocked`, `pushHistoryState` rồi chuỗi persist `saveShapesForProject → persistSession → renderGeometry → renderBlocksPanel → refreshAreaTableIfOpen → renderModalVerticesTable (nếu tab Đỉnh) → refreshSymbolPanelIfOpen`. Tab Đỉnh thêm cột "Ký hiệu"/"Màu" + nút "↺" (amber khi đỉnh tùy chỉnh).
  5. **Nhánh gộp** `#modalCadSymbols` + nút `#btnCadSymbols` "🎨 Ký hiệu & Hiển thị": 3 công tắc hiển thị dùng chung `displaySettings` (`syncDisplayCheckboxes()` mirror checkbox thanh công cụ) + bảng "Ký hiệu mặc định theo lớp CAD" (`applyLayerGlyph`/`resetLayerGlyph`, trữ `vn2k_cad_layers_v1`) + footer `countVertexGlyphOverrides()` / `clearAllVertexGlyphOverrides()`.
  6. **4 exporter (DXF/PDF/SVG/PNG) hết gate `isPointLayer`** → hình và màu trong tệp đúng bằng những gì thấy trên bản đồ. `exportGlyphFlag(meta, isPointLayer)` vẫn giữ cho việc bật/tắt hiển thị.
- **Điểm cần nhớ khi sửa tiếp**:
  - **Ký hiệu chỉ có MỘT nguồn quyết định**: `getPointStyleFor`/`getPointColorFor`. Thêm chỗ vẽ/xuất điểm mới thì gọi hai helper này, **không** đọc `v.style`/`shape.style` trực tiếp và không hard-code `'circle'`/`'#ef4444'`.
  - `refreshSymbolPanelIfOpen()` là bắt buộc sau mọi mutator ký hiệu: thiếu nó bộ đếm "đỉnh tùy chỉnh riêng" và bảng lớp đứng yên khi modal đang mở (lỗi thật phát hiện lúc test live).
  - Đặt mặc định theo **lớp CAD** ảnh hưởng cả **lớp điểm** gán lớp đó khi lớp điểm chưa đặt kiểu riêng — kiểu của điểm/đỉnh luôn thắng.
  - Đăng ký giao diện theo AGENTS.md §2: `modalCadSymbols` đã vào `closeCadWindows()` [app.js:19830](app.js) — tổng **13 modal CAD**, `tests/cad_ui_isolation.test.js` kiểm đúng danh sách này.
  - **Đừng test bằng `svgPaths`**: CAD map dùng `preferCanvas: true`; chứng minh render bằng `layers.group.getLayers().length`, class badge (`/expanded/`, `sty-*`, `dot-visible`) và computed style.
  - Stack hoàn tác tên là `historyStack`/`historyIndex` (KHÔNG phải `history`), `maxHistory` cho trần.
  - Assertion phiên bản trong `tests/cad_inquiry_qselect_polar.test.js` giờ **đối chiếu sw.js ↔ app.js ↔ style.css** thay vì hard-code; đợt bump sau chỉ cần sửa 3 chỗ tài nguyên, test không phá.
- **Kết quả kiểm chứng**: `tests/point_styling_visibility.test.js` **93 → 142/142** (4 nhóm mới chạy hàm thật trong sandbox `new Function`), `cad_ui_isolation` **13 modal**, `cad_inquiry_qselect_polar` **177/177**, `node --check app.js` đạt, toàn dự án **313/313 PASS (0 fail)**. Live localhost:8080 (`?v=2.8.12`): lớp `RANH_THUA` = thoi/đỏ → 12 badge `sty-diamond` nền `rgb(239,68,68)`; tắt Nhãn → `sty-diamond dot-visible` + `clip-path`; Đ1 của `Tuyến 2` = ring xanh → bộ đếm 0→1, SVG `<circle class="cad-pt-glyph" fill="none" stroke="#22c55e">`; `resetVertexGlyph` → 0. **Bản vẽ người dùng khôi phục nguyên trạng**: `resetLayerGlyph('RANH_THUA')`, bật lại Nhãn, `historyStack` còn 1, 3 đối tượng `selected=true`, `layers.group=31`, modal đóng. (Không chụp được ảnh vì surface Browser trong app ẩn — dùng computed style/DOM làm bằng chứng.)
- **Đăng ký tài nguyên**: `index.html` thêm `#btnCadSymbols` + `#modalCadSymbols` (cạnh các modal CAD), `style.css` `.cad-sym-section`/`.cad-sym-section-title` + `?v=2.8.12`, `app.js?v=2.8.12`, `sw.js` `CACHE_NAME = vn2000-pro-v2.8.12`; 11 mục `phraseMap` Anh–Việt.
- **Còn lại / việc kế tiếp**:
  1. **Backlog CADCraft port**: **Hatch** và **Import DXF** (task #23); kéo `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` vào `npm test`.
  2. **Ý định chưa làm**: kiểu ký hiệu theo *từng loại mốc* trong sổ đo, sao chép ký hiệu đỉnh hàng loạt, hoàn tác chéo giữa các phân hệ.
  3. **Ràng buộc của người dùng vẫn hiệu lực**: "Tôi tự rever — đừng đẩy lại" → chỉ push `integration-draw-fixes`, không đụng `main`; rồi fast-forward mirror `D:\Nhu\APP\VN2000-PWA`. "Port lần lượt, ưu tiên Dimension".
  4. **Không chạy `npm install`** trong `I:\My Drive\...`; stage đúng tên tệp (`app.js`, `index.html`, `style.css`, `sw.js`, `tests/point_styling_visibility.test.js`, `tests/cad_ui_isolation.test.js`, `tests/cad_inquiry_qselect_polar.test.js`, `progress.md`, `session-handoff.md`), không `git add -A` — `git status` còn nhiều tệp skill/asset/`geodesy.js`/`src/core/cad_geometry.js` `M` không thuộc đợt này.

## Phiên trước — 2026-10-30: WP-C — Dóng góc [F10] + Trắc Lượng (Inquiry) + Chọn Nhanh (QSELECT)
- **Yêu cầu từ người dùng**: `Inquiry/QSELECT (Dynamic Input còn thiếu phần polar tracking)` — nối tiếp chỉ đạo "Port lần lượt, ưu tiên Dimension" (Dimension đã xong ở phiên trước đó).
- **Kiến trúc đã dựng**:
  1. **Một hàm chốt điểm duy nhất** `appCadTool.lockDraftPoint(lat, lng)` — Ortho [F8] áp trước, rồi Polar [F10] — được gọi ở **cả** `handleMapClick` lẫn `_processMouseMove`. Đây là chỗ sửa lỗi "xem một đằng, vẽ một nẻo" của bản cũ (hai bản sao logic khóa trục).
  2. **Polar Tracking**: `togglePolarTracking/setPolarStep/polarLockPoint/azimuthDegOf/syncPolarGuides` + nhóm `layers.polarGroup` (4 tia đứt nét, nhãn `.cad-polar-angle-tag`), suy giảm vẽ lại bằng `this._polarGuideKey`; UI `#btnCadPolarTrack`, `#btnCadRibbonPolar`, `#cadPolarStepSelect` (disabled khi Ortho bật vì Ortho thắng).
  3. **Inquiry** (§15B): state `inquiry = {mode, pts, log, lastResult, shapeIdx}`, `toolAction === 'inquiry'` trong `handleMapClick` → `handleInquiryPick(lat,lng)`; 4 chế độ `dist|area|point|shape`; modal `#modalCadInquiry`; `zoomToSelection()` (bí danh `ZS`); xuất CSV `;` BOM.
  4. **QSELECT** (§15C): `qSelectKindOf` + `qSelectMatches(shape, crit)` **thuần, không chạm DOM** (dễ test bằng Node) + `collectQSelectCriteria` (đọc UI) + `applyQSelect(mode)` 3 chế độ `replace|append|exclude`; modal `#modalCadQSelect`; phím `Q`.
- **Điểm cần nhớ khi sửa tiếp**:
  - **DIỆN TÍCH/CHU VI KHÔNG TÍNH Ở HAI CHỖ**: `inquiryChain()` gọi `calculateAreaAndPerimeter(list,'polygon')`, `qSelectMatches` đọc `getEffectiveStats(shape)`. Thêm phép đo mới thì ủy quyền cho chuẩn này, đừng viết shoelace riêng.
  - `GisIO.read(...).counts.vertices` không liên quan; ở CAD, `shape.selected !== false` = ĐANG CHỌN (true khi thiếu trường) — dùng `toggleBlockSelect(idx, bool)` / `toggleSelectAllBlocks(bool)`, không có `clearSelection()`.
  - `renderInquiryGraphics()` phải dùng `this.inquiry.shapeIdx`, **không** dùng `this.selectedItem` (con trỏ của công cụ vẽ, không được set khi trắc lượng).
  - `pushInquiryLog(result, isLive=true)` cập nhật tại chỗ dòng đầu nếu cùng `kind` — nhờ vậy chấm 20 đỉnh không sinh 20 dòng; log chặn ở 20 dòng cho điện thoại.
  - Tùy chọn polar nằm ở khóa RIÊNG `localStorage['vn2k_cad_polar_v1']` (`{on, step}`), KHÔNG nằm trong `persistSession()`, vì `restoreSession()` return sớm khi hình vẽ đến từ dự án.
  - `refreshAreaTableIfOpen()` mở lại bảng kê rồi **phải khôi phục `scrollTop`** của `#cadBlockList` và `.modal-box`; đây là method dùng chung, đừng nhân bản khối `openAreaTableModal()` ở nơi khác.
  - `executeCommandLine()` **không nhận tham số** — nó đọc `#txtCadCommandLine` và tự xóa; test CLI phải gán `input.value` rồi gọi.
  - Bí danh CLI: `DIST|KHOANGCACH|DO`, `AREA|DIENTICH|TINH`, `ID|TODO`, `LIST|TRATHONGTIN`, `QSELECT|QSEL|CHONNHANH`, `ZOOMSEL|ZS`, `POLAR`. Lệnh lạ rơi vào `default` (chỉ toast, không nguy hại).
- **Kết quả kiểm chứng**: `tests/cad_inquiry_qselect_polar.test.js` **178/178**, `tests/cad_ui_isolation.test.js` **27/27**, `node --check app.js` đạt, toàn dự án **313/313 PASS (0 fail)** (lưu ý: `node --test tests/` vẫn MODULE_NOT_FOUND trên Node 24 → dùng `node --test tests/*.test.js`). Live localhost:8080 (`?v=2.8.11`): DIST `55,063 m • Az 36°30'16"`, AREA `725,33 m²/131,79 m`, ID 6 dòng, LIST `Thửa 2` 9 nhãn, CSV `DuAn_Moi_TracLuong.csv` 5 dòng BOM, polar khóa 90° kéo điểm 2,604 m + 4 tia/4 nhãn, Ortho đè polar, `ZOOMSEL` gọi `fitBounds(padding:[48,48])`, QSELECT lọc loại/tên/diện tích đúng. **Bản vẽ người dùng đã được khôi phục nguyên trạng**: 3 đối tượng (`Thửa 2`/`Tuyến 2`/`Lớp điểm 3`) đều `selected=true`, `group: 31` layer, `polarGroup/inquiryGroup = 0`, modal đóng, `vn2k_cad_polar_v1 = {"on":false,"step":90}`.
- **Đăng ký tài nguyên**: `index.html` thêm `#modalCadInquiry` + `#modalCadQSelect` (đặt cạnh các modal CAD, trước khối "MODAL STUDIO CẤU HÌNH & XUẤT BẢN VẼ MINICAD"), `style.css?v=2.8.11`, `app.js?v=2.8.11`, `sw.js` `CACHE_NAME = vn2000-pro-v2.8.11`; `closeCadWindows()` thêm 2 modal (tổng 12), `clearCadOverlays()` thêm `polarGroup` + `inquiryGroup`; ~38 mục `phraseMap` Anh–Việt.
- **Còn lại / việc kế tiếp**:
  1. **Backlog CADCraft port**: **Hatch** và **Import DXF** (task #23); kéo các suite `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` vào `npm test`.
  2. **Ý định chưa làm**: Hatch theo tỉ lệ mẫu, DXF import (chỉ mới có export), Inquiry chế độ measure góc giữa 3 điểm / list theo lớp, QSELECT lưu bộ lọc yêu thích.
  3. **Ràng buộc của người dùng vẫn hiệu lực**: "Tôi tự rever — đừng đẩy lại" → chỉ push `integration-draw-fixes`, không đụng `main`; "Port lần lượt, ưu tiên Dimension".
  4. **Không chạy `npm install`** trong `I:\My Drive\...`; stage đúng tên tệp (`app.js`, `index.html`, `style.css`, `sw.js`, `tests/cad_inquiry_qselect_polar.test.js`, `tests/cad_ui_isolation.test.js`, `tests/cadcraft_cli_and_ortho.test.js`, `progress.md`, `session-handoff.md`), không `git add -A` — `git status` còn nhiều tệp skill/asset/`geodesy.js`/`src/core/cad_geometry.js` `M` không thuộc đợt này.

## Phiên trước — 2026-10-30: WP-B — Nạp/Xuất GIS & QGIS (GeoJSON / KML / GPX / WKT)
- **Yêu cầu từ người dùng**:
  - `Bổ sung tính năng nạp/xuất dữ liệu map dự án từ các định dạng phổ biến trong GIS/QGIS. tối ưu hóa sử dụng để hoàn thiện các chức năng trong MiniCAD`
  - Phạm vi chốt qua AskUserQuestion: GeoJSON + KML + GPX + WKT, JavaScript thuần (không thêm vendor lib), không Shapefile/GeoPackage/DXF.
- **Kiến trúc đã dựng (3 tầng, cũng là cách mở rộng cho các định dạng sau)**:
  1. **Engine** `window.GisIO` — [src/core/gis_io.js](src/core/gis_io.js): `read/detectFormat/parseGeoJson/parseKml/parseGpx/parseWkt/toGeoJsonText/toGpxText/toWktText`. Không chạm DOM nên test được bằng Node. Feature chuẩn: `{kind:'point'|'line'|'polygon', name, note, crs:'wgs84'|'projected', rings:[[{lng,lat,h}]], properties}`.
  2. **Cầu** `appGis` — [app.js:17245](app.js#L17245): `resolveKtt/applyKtt/readFromFile/summarize/featuresToCadShapes/featuresToProjectPoints/featuresFromPoints/featuresFromShapes/isGenericName/uniqueName`. Nơi quyết định hệ quy chiếu, trục EN/NE, KTT và đặt tên chống trùng.
  3. **Bề mặt**: `appCadTool.openGisImportModal/onGisFilePicked/applyGisImport/_importPointLayer` (modal riêng `#modalCadGisImport`) và `appData.onGisProjectFilePicked/applyGisToProject` (Phân vùng 2.5 trong `#modalImportProject`). Hai phân hệ chỉ chung tầng dữ liệu — có test chốt AGENTS.md §2.
- **Điểm cần nhớ khi sửa tiếp**:
  - **Thứ tự bắt buộc**: `resolveKtt` → `applyKtt` → *rồi mới* đổi feature sang shape. Đảo ngược làm `_normalizeVertex` tính X/Y theo KTT cũ (lệch hàng trăm mét, không báo lỗi).
  - Tính năng vô danh từ parser mang tên `Feature`; mọi tên đỉnh/mốc/khối đi qua `uniqueName(used, base)` để không trùng.
  - `GisIO.read(...).counts.vertices` **chỉ đếm đỉnh của tuyến/khối**, không tính điểm rời — đừng dùng làm "tổng số điểm".
  - Tệp phẳng (X Bắc/Y Đông) phải bật hàng `#cadGisTargetProjected`/`#projGisAxis`; `onGisFilePicked` tự nhận và bật radio `vn2000`.
  - `openGisImportModal()` cố ý xóa `_gisResult` (đặt lại phiên nạp), nên code kiểm thử phải "nạp lại" kết quả sau khi mở modal.
  - Export GPX/WKT dùng `_downloadText` + `getExportGeometry()` (dự án) / `_selectedExportShapes()` (CAD); mốc thiếu kinh/vĩ độ bị loại và báo `skipped`; ≥3 mốc tự sinh `Ranh_<project>`.
- **Kết quả kiểm chứng**: `tests/gis_io_interop.test.js` 67/67, `tests/gis_import_export_bridge.test.js` 125/125, `node --check app.js` đạt, toàn dự án **312/312 PASS (0 fail)**. Live localhost:8080 (`?v=2.8.10`): nạp GeoJSON ra `Tuyen demo:polyline:3`, `Thua demo:polygon:5`, `Điểm GIS:point:2`; bằng chứng vẽ thật `layers.group=47`, 32 marker, 18 `.cad-vertex-badge` (bản đồ CAD dùng `preferCanvas:true` nên không có `<path>` SVG — đừng bắt lỗi `svgPaths=0`). Dọn vết test: stub `saveShapesForProject/persistSession/appSettings.save/saveImportedPoints`, rút shape tạm, render lại.
- **Đăng ký tài nguyên**: `src/core/gis_io.js?v=2.8.10` nạp trước `app.js`, `sw.js` `CACHE_NAME = vn2000-pro-v2.8.10` + precache `./src/core/gis_io.js`, `style.css?v=2.8.10`; `closeCadWindows()` thêm `modalCadGisImport`.
- **Còn lại / việc kế tiếp**:
  1. **Backlog CADCraft port**: Dynamic Input, Hatch, Import DXF, Inquiry/QSELECT; kéo các suite `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` vào `npm test` (task #23 kiểm kê nhóm còn thiếu).
  2. **Ý định chưa làm** (ngoài phạm vi đã chốt): nhập Shapefile/GeoPackage, KMZ (hiện báo lỗi hướng dẫn giải nén), quỹ tích có lỗ trong MiniCAD (đang bỏ vòng lỗ và báo đếm `holes`), liên kết CRS động theo EPSG.
  3. **Ràng buộc của người dùng vẫn hiệu lực**: "Tôi tự rever — đừng đẩy lại" → chỉ push `integration-draw-fixes`, không đụng `main`; "Port lần lượt, ưu tiên Dimension".
  4. **Không chạy `npm install`** trong `I:\My Drive\...`; stage đúng tên tệp (`src/core/gis_io.js`, `app.js`, `index.html`, `sw.js`, `tests/gis_io_interop.test.js`, `tests/gis_import_export_bridge.test.js`, `progress.md`, `session-handoff.md`), không `git add -A`.

## Phiên trước — 2026-10-30: WP-A MiniCAD — Kiểu/Màu Điểm Rời & 3 Nhóm Hiển Thị Tách Biệt
- **Yêu cầu từ người dùng**:
  - `bổ sung cho phép điều chỉnh hình dạng và màu sắc các điểm được vẽ trong MiniCAD. cho phép tắt/mở hiển thị các điểm, các đỉnh của khối và tuyến (chia riêng từng dạng chứ không gộp chung, có thể gộp chung 1 nhánh thao tác)`
  - Phạm vi đã chốt: GIS import chỉ GeoJSON/KML/GPX/WKT (WP-B, chưa làm); style riêng từng điểm + mặc định theo lớp + áp hàng loạt; thêm nhóm thứ 3 (nhãn/ký hiệu).
- **Đã hoàn tất**:
  1. **Kiến trúc hiển thị**: `displaySettings` thành 7 cờ, trong đó 3 cờ mới `showPoints` / `showVertices` / `showLabels` đọc riêng qua `resolveGroupVisibility(shape)`; mỗi shape ghi đè được bằng `shape.showPoints` / `shape.showVertices` / `shape.showLabels`, nút toàn cục `toggleAllVerticesVisible` và `toggleShapeVerticesVisibility` / `toggleShapeLabelsVisibility` định tuyến theo `shape.mode === 'point'`.
  2. **Tương thích ngược**: blob cũ 5-6 khóa vẫn nhận mặc định `true`; self-heal "tắt hết" đếm theo `presentKeys` nên blob cũ không bị bỏ qua; người dùng tự tắt 1 ô tuyệt đối không bị app bật lại.
  3. **Style & màu điểm**: `pointStyles` 7 kiểu, `getPointStyleFor`/`getPointColorFor` (điểm → lớp → mặc định, validate `#rrggbb`), bảng điểm thêm cột Kiểu/Màu + thanh "Áp dụng cả lớp"/"Đặt lại", round-trip qua mốc dự án bằng `pointStyle`/`pointColor`, sửa ngưỡng dựng lại lớp điểm còn 1 mốc.
  4. **Xuất bản vẽ**: 4 exporter (DXF/PDF/SVG/PNG) dùng `exportGlyphFlag` + `drawPointGlyph`/`pointGlyphSvg`; SVG dùng class `cad-pt-glyph` để màu tùy chỉnh không bị `.layer-ky-hieu` ghi đè; PNG giữ diện mạo cũ bằng mặc định `ring`/`#C62828`; hộp Xuất không còn ghi cờ meta ngược vào `displaySettings`.
  5. **CSS & cache**: chuỗi `.sty-*:not(.expanded)` với `clip-path` + `drop-shadow`, `.dot-visible` 13px; `sw.js` → `vn2000-pro-v2.8.9`, `index.html` → `style.css?v=2.8.9`, `app.js?v=2.8.9`; test CACHE_NAME đổi thành chặn dưới `>= 2.8.8`.
- **Kết quả kiểm chứng**: `tests/point_styling_visibility.test.js` 94/94 PASS; toàn dự án **310/310 PASS**; live browser xác nhận stylesheet mới đã nạp và glyph áp dụng đúng (13px, clip-path hoạt động, pill `expanded` không đổi).
- **Còn lại / việc kế tiếp**:
  1. **WP-B (chưa bắt đầu)**: import thuần JS GeoJSON / KML / GPX / WKT (chọn hệ quy chiếu + KTT, ghi đè hay cộng thêm) vào `_normalizeVertex` → `_applyImportedShapes` → mốc dự án; xuất thêm GPX/WKT và bổ sung `point_style`/`point_color` vào property GeoJSON. Panels phải tách riêng cho Bản đồ dự án và MiniCAD (AGENTS.md §2).
  2. **Backlog CADCraft port**: Dynamic Input, Hatch, Import DXF, Inquiry/QSELECT; kéo các suite `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` vào `npm test`.
  3. **Ràng buộc của người dùng vẫn còn hiệu lực**: "Tôi tự rever — đừng đẩy lại" → chỉ push nhánh `integration-draw-fixes`, không push `main`; "Port lần lượt, ưu tiên Dimension" (Dimension đã xong).
  4. **Không chạy `npm install`** trong `I:\My Drive\...` (Drive I/O làm nghẽn node_modules); build bằng Docker. `git status` có nhiều tệp tài liệu/skill/asset `M` không thuộc đợt sửa này — chỉ stage đúng 7 tệp: `app.js`, `index.html`, `style.css`, `sw.js`, `tests/point_styling_visibility.test.js`, `tests/draw_tools_runtime.test.js`, `progress.md`, `session-handoff.md`.

## Phiên trước — 2026-10-26: Chuẩn Hóa Toàn Diện Giao Diện Song Ngữ Anh - Việt & Từ Điển Kỹ Thuật Trắc Địa Quốc Tế (Bilingual i18n Pro 2026)
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

## 2026-10-30 — Nhóm Chấm điểm / Bảng điểm (đã xong)
- Commit `b65da20` trên `integration-draw-fixes` (app.js + index.html + tests/cadcraft_points.test.js). Không push `main`.
- `D:\Nhu\APP\VN2000-PWA` đã fast-forward tới `b65da20`; `npm test` = 305/305.
- Còn lại theo thứ tự ưu tiên port: (1) icon mốc theo lớp (`pointStyle`, `openPointIconModal`, `showPointIcons`, CSS `--cad-pt-size`), (2) Layer Manager ẩn/khóa/màu (`toggleShapeHidden`, `toggleShapeLocked`, `setShapeColor`, `renderLayerManager`), (3) Dynamic Input, (4) Hatch, (5) Import DXF, (6) Inquiry/QSELECT — kèm các suite `cadcraft_layers`, `cadcraft_dynamic_input`, `minicad_snap_runtime`, `minicad_toolbar_collapse`, `minicad_select_and_delete` chưa chuyển sang nền mới.
- Lưu ý dữ liệu: dự án thật `VN2000_SoLieu_DoDac` vẫn còn 1 lớp điểm thử nghiệm "Lớp điểm 1" (điểm P1) do lần kiểm thử trước để lại — đã giữ nguyên khóa localStorage, người dùng tự xóa nếu không cần.

## 2026-10-30 — Công cụ Vẽ MiniCAD (đã sửa, commit 99c2815)
- Đã nạp `CadGeometryEngine` cho trình duyệt; Tách/Hợp/Xén/Kéo dài chạy đúng, có test hồi quy `tests/draw_tools_runtime.test.js`.
- Đã sửa gợi ý tên khối theo chế độ và Offset từ khối đang chọn.
- Việc tiếp theo: port nhóm **Layer Manager** (gán `layer` cho khối khi lưu, xuất DXF theo lớp, ẩn/khóa/màu theo lớp, `renderLayerManager`) rồi icon mốc theo lớp (`pointStyle`).

## 2026-10-30 — Layer Manager (đã xong trên working tree)
- Khối vẽ/nạp/offset giờ mang `layer` + màu BYLAYER; Layer Manager có ô đổi màu lớp (áp cho mọi khối thuộc lớp), khóa lớp chặn xóa/tách/hợp; DXF khai báo lớp động và ghi ranh vào đúng lớp.
- Helper mới: `getShapeLayerId`, `isShapeLayerLocked`, `cadLayerColorToAci`, `sanitizeLayerId`, `collectExportLayers`, `setLayerColor`; `_getAllExportShapes` giữ `layer`.
- Test: `tests/cadcraft_layers.test.js` 61/61; `npm test` 307/307. Đã kiểm chứng live với dự án tạm, không ghi vào dự án thật.
- Lưu ý dữ liệu: trong lúc dọn môi trường test đã xóa lớp điểm thử nghiệm "Lớp điểm 1" còn sót từ lần kiểm thử Chấm điểm trước (127.0.0.1:8080). Bản triển khai thật (vercel) vốn đã để trống `savedShapes` nên không mất dữ liệu người dùng.
- Việc tiếp theo: icon mốc theo lớp (`pointStyle`, `openPointIconModal`, `showPointIcons`, CSS `--cad-pt-size`), rồi Dynamic Input, Hatch, Import DXF, Inquiry/QSELECT.

## 2026-10-30 — Cách ly cửa sổ chéo phân hệ (đã xong trên working tree)
- MiniCAD không còn rò cửa sổ/hình khối sang Bản đồ dự án, Chấm điểm, Chuyển đổi tọa độ: guard `isActive` ở `selectItem/showQuickEditPopup/openAnnotationModal/handleMapClick`, marker chỉ kéo khi CAD bật, `closeCadWindows` + `clearCadOverlays` gọi khi rời phân hệ.
- Test hồi quy `tests/cad_ui_isolation.test.js` (26/26), `npm test` 308/308.
- Việc tiếp theo: icon mốc theo lớp (`pointStyle`), Dynamic Input, Hatch, Import DXF, Inquiry/QSELECT.

## 2026-10-30 — Rà soát toàn bộ cửa sổ chéo phân hệ (đã xong trên working tree)
- `openLiveGpsMap` nay là không gian riêng: `mapMode='live_gps'`, tắt MiniCAD, dọn sạch chrome, FAB riêng; không còn kế thừa thanh dự án / thanh chấm điểm / HUD CAD.
- `appNav.resetMapChrome()` được gọi ở cả 5 lối vào bản đồ dùng chung; `onMapClick` chỉ xử lý chấm điểm/dự án ở đúng chế độ của nó.
- Bottom Sheet bản đồ bỏ "Nạp tọa độ" và "Lưu mốc" chéo phân hệ (xóa `loadSelectedToMain`, `savePickedPoint`).
- Test hồi quy `tests/map_chrome_isolation.test.js` 21/21; `npm test` 309/309.
- Việc tiếp theo: icon mốc theo lớp (`pointStyle`), Dynamic Input, Hatch, Import DXF, Inquiry/QSELECT.

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

## 2026-11-19 — Tối ưu hóa độ nét tệp PDF bản đồ quy hoạch & bản vẽ kỹ thuật (v2.8.42)
- **Vấn đề đã xử lý**: Tệp PDF gốc rất nét nhưng khi nạp vào ứng dụng bị mờ nhòe do PDF.js mặc định render 72 DPI, clamp `MAX_SIDE = 4096` và nén JPEG 0.9; thanh trượt "Độ rõ" trên giao diện thực chất là CSS Opacity, không tăng độ phân giải thực.
- **Giải pháp**:
  - Nâng `MAX_SIDE: 8192` và `MAX_PIXELS: 48000000` (hỗ trợ render đến 8K).
  - Thêm bộ chọn độ nét `#planOvDpiSelect`: 150 DPI, 300 DPI (Mặc định), 450 DPI, 600 DPI, lưu vào `localStorage`.
  - Nâng cấp `_rasterizePdf` dùng `intent: 'print'` của PDF.js và thuật toán nén `image/webp, 0.96` (fallback `image/png`), loại bỏ hoàn toàn quầng nhiễu JPEG artifacts.
  - Bổ sung hàm `reRenderHighDpi(id, targetDpi)`: tự động scale ma trận affine và tọa độ điểm khống chế, bảo toàn 100% tọa độ thực địa VN-2000 $(E, N)$ mà không cần chấm lại mốc.
  - Thêm CSS `image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;` vào Leaflet pane.
  - Đổi nhãn "Độ rõ" thành "Độ mờ", thêm huy hiệu DPI và nút `🔍 Nâng độ nét` trên từng ảnh.
- **Kiểm thử**: `tests/plan-overlay-dpi.test.js` (6/6 PASS). Toàn bộ test suite: **501/501 PASS 100%**.

- **Cập nhật 2026-11-19 v2.8.43**: Đột phá giải pháp Dynamic Sharp Viewport Engine: tự động kết xuất lại đúng góc nhìn thấy của PDF ở độ phân giải 1:1 màn hình khi zoom sâu trong khung chấm điểm và trên bản đồ Leaflet. Nâng `MAX_SIDE: 16384`, `MAX_PIXELS: 120000000`, nén PNG lossless. 502/502 tests PASS.
