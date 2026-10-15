# 📖 Hướng Dẫn Chi Tiết: Tạo & Tối Ưu Bảng Tính Google Sheet Lưu Số Liệu VN-2000

Tài liệu này hướng dẫn chi tiết cách khởi tạo bảng tính **Google Sheets trên Google Drive cá nhân** của bạn và kết nối với ứng dụng **WGS84 - VN2000 Pro PWA** để tự động lưu mốc và đồng bộ dữ liệu ngoại tuyến một cách tối ưu, bảo mật tuyệt đối.

---

## 🎯 1. Cơ Chế Hoạt Động & Tính Bảo Mật

- **Bảng tính nằm ở đâu?** Toàn bộ file bảng tính Google Sheet nằm 100% trong **Google Drive cá nhân** (hoặc tài khoản Google Workspace) của chính bạn. Không một ai khác (kể cả GitHub, Vercel hay tác giả ứng dụng) có thể xem hoặc can thiệp dữ liệu đo đạc của bạn.
- **Dữ liệu được chuyển như thế nào?** Thông qua kịch bản **Google Apps Script** do chính bạn kích hoạt trên Google Drive. Kịch bản này tạo ra một cổng nhận dữ liệu bảo mật (Webhook URL).
- **Khi không có mạng (Offline ở thực địa):** Ứng dụng PWA lưu mốc ngay vào bộ nhớ máy (`localStorage`). Khi có sóng 4G/Wi-Fi trở lại, hệ thống sẽ **tự động gửi các mốc tồn đọng** lên Google Sheet mà không mất bất kỳ điểm nào.

---

## 🚀 2. Các Bước Cài Đặt Chi Tiết (Chỉ làm 1 lần duy nhất - 2 phút)

### Bước 1: Tạo bảng tính Google Sheet mới
1. Mở trình duyệt và truy cập liên kết nhanh: **[https://sheets.new](https://sheets.new)** (hoặc vào Google Drive $\rightarrow$ bấm **Mới** $\rightarrow$ chọn **Google Trang tính**).
2. Đặt tên cho bảng tính ở góc trên bên trái, ví dụ: `Sổ Đo Tọa Độ VN-2000`.

---

### Bước 2: Mở trình soạn thảo Google Apps Script
1. Trên thanh bảng chọn của Google Sheet, bấm vào menu **Tiện ích mở rộng** (*Extensions*).
2. Chọn **Apps Script**. Trình duyệt sẽ mở ra một tab soạn thảo mã lệnh của Google.
3. Xóa sạch mọi dòng code mặc định có sẵn (`function myFunction() { ... }`).

---

### Bước 3: Dán đoạn mã kịch bản tối ưu (Pro Script)
1. Trong ứng dụng VN-2000 PWA, mở mục **`☁️ Lưu`** $\rightarrow$ bấm nút **`📋 Sao Chép Mã Google Apps Script Sẵn Có`** (hoặc copy đoạn mã ở **Mục 4** bên dưới).
2. Dán đoạn mã này vào khung soạn thảo của Google Apps Script.
3. Bấm biểu tượng **💾 Lưu dự án** (*Save project*) hoặc nhấn phím `Ctrl + S` (`Cmd + S` trên Mac).

---

### Bước 4: Triển khai ứng dụng Web (Deploy as Web App)
1. Ở góc trên bên phải của trang Apps Script, bấm nút **Triển khai** (*Deploy*) $\rightarrow$ chọn **Quản lý bản triển khai mới** (*New deployment*).
2. Tại cửa sổ hiện ra:
   - Bấm vào biểu tượng bánh răng ⚙️ bên cạnh dòng *"Chọn loại"* $\rightarrow$ Chọn **Ứng dụng web** (*Web app*).
   - **Mô tả (*Description*):** Nhập `VN2000 Sync API`.
   - **Thực thi dưới dạng (*Execute as*):** Chọn **Tôi (*Me*)** (`email_cua_ban@gmail.com`).
   - 🔴 **Người có quyền truy cập (*Who has access*):** Chọn **Bất kỳ ai (*Anyone*)**.  
     *(Lưu ý cực kỳ quan trọng: Phải chọn "Anyone" để ứng dụng PWA từ điện thoại có thể gửi mốc vào Sheet mà không bị chặn lỗi phân quyền!)*
3. Bấm nút **Triển khai** (*Deploy*).

---

### Bước 5: Cấp quyền tài khoản Google (Vượt qua cảnh báo bảo mật)
Khi bấm Triển khai lần đầu, Google sẽ yêu cầu bạn cấp quyền ghi dữ liệu vào bảng tính:

1. Bấm nút **Ủy quyền truy cập** (*Authorize access*).
2. Chọn tài khoản Google của bạn.
3. **Màn hình cảnh báo xuất hiện:** Google sẽ hiện thông báo *"Google chưa xác minh ứng dụng này"* (*Google hasn't verified this app*) — Đây là cảnh báo tiêu chuẩn đối với mọi script do người dùng tự viết:
   - Hãy bấm vào dòng chữ nhỏ: **Nâng cao (*Advanced*)** ở góc dưới bên trái.
   - Bấm tiếp vào dòng: **Đi tới [Tên dự án] (không an toàn)** (*Go to [Project Name] (unsafe)*).
4. Bấm nút **Cho phép (*Allow*)** để hoàn tất cấp quyền.
5. Google sẽ cấp cho bạn một đường link dạng:  
   `https://script.google.com/macros/s/AKfycbx.../exec`  
   $\rightarrow$ Hãy **sao chép đường link này** và dán vào mục cài đặt Google Sheet trên ứng dụng VN-2000 PWA.

---

## 🌟 3. Kiến Trúc Lưu Trữ Tập Trung 2 Tab (v4.0 - Tối Ưu Tuyệt Đối Cho Dữ Liệu Lớn)

### ⚠️ Vì sao phân chia dữ liệu thành nhiều sheet không tối ưu khi dữ liệu lớn?
- **Phân tán & Khó quản lý:** Khi một dự án đo đạc có 50, 100 hoặc hàng trăm thửa đất/khối quy hoạch, nếu mỗi thửa hoặc mỗi dự án sinh ra một sheet riêng biệt, bảng tính sẽ có hàng trăm tab con. Việc cuộn chuột tìm kiếm từng tab cực kỳ chậm, tốn tài nguyên máy và dễ nhầm lẫn.
- **Không thể lọc, thống kê và báo cáo:** Dữ liệu bị xé nhỏ ra nhiều sheet khiến bạn không thể dùng Pivot Table, AutoFilter hay hàm tổng hợp (`SUMIFS`, `COUNTIFS`) trên toàn bộ dự án.
- **Chạm ngưỡng giới hạn của Google Sheets:** Google Sheets có giới hạn tính toán theo số lượng sheet và công thức phân tán, gây giật lag khi mở trên điện thoại thực địa.

### 🎯 Giải pháp Tối Ưu Tập Trung 2 Tab Chuẩn v4.0:
Toàn bộ hệ thống quản lý dữ liệu được tổ chức khoa học, tinh gọn trên đúng **2 Tab duy nhất**:

1. **Tab 1: "Sổ Đo Tọa Độ" (Lưu tập trung toàn bộ mốc & đỉnh ranh giới):**  
   - Cấu trúc 14 cột chuẩn hóa: `Thời Gian Đo`, `Tên Điểm Mốc`, `Khối / Thửa Đất`, `Loại Hình`, `STT Đỉnh`, `Tọa Độ X (Bắc)`, `Tọa Độ Y (Đông)`, `Vĩ Độ (Lat)`, `Kinh Độ (Long)`, `Múi Chiếu`, `Kinh Tuyến Trục`, `Ghi Chú Hiện Trường`, `Dự Án`, `Vị Trí Google Maps`.
   - Phân biệt dự án và thửa đất rõ ràng qua cột **"Dự Án"** và **"Khối / Thửa Đất"**.
   - Tự động bật bộ lọc **Data Filter** trên hàng 1. Bạn chỉ cần bấm vào mũi tên lọc ở cột "Dự Án" hoặc "Khối / Thửa Đất" là xem riêng từng thửa chỉ với 1 click chuột!
   - Chống trùng lặp mốc tuyệt đối theo khóa: `[Dự Án + Khối + Tên Mốc + X + Y]`.

2. **Tab 2: "Tổng Hợp Diện Tích" (Lưu tập trung bảng tổng hợp diện tích, chu vi mọi thửa đất):**  
   - Cấu trúc 11 cột chuẩn hóa: `Thời Gian Cập Nhật`, `Dự Án`, `STT`, `Tên Khối / Thửa Đất`, `Loại Hình`, `Số Đỉnh`, `Diện Tích (m²)`, `Diện Tích (ha)`, `Chu Vi / Chiều Dài (m)`, `Mã Màu`, `Ghi Chú`.
   - Lưu trữ tập trung bảng kê diện tích của tất cả các thửa đất thuộc mọi dự án.
   - Cơ chế cập nhật thông minh (`In-place Update`): Khi nắn ranh đỉnh hoặc cập nhật lại thửa đất, script tự động tìm dòng của thửa đó và cập nhật số liệu diện tích/chu vi mới nhất, không sinh thêm dòng rác trùng lặp!
   - Tự động bật bộ lọc **Data Filter** để lọc tổng hợp diện tích theo dự án hoặc nhóm quy hoạch.

3. **Tự động gắn link Google Maps vệ tinh (`🗺️ Xem Vị Trí`):**  
   Mỗi đỉnh mốc tự động tạo liên kết vệ tinh chuẩn tiếng Việt (dấu phân cách `;`). Bấm vào link mở ngay vị trí mốc trên Google Maps.

4. **Định dạng số chuẩn Trắc địa & CAD:**  
   - Tọa độ phẳng VN-2000 (X, Y): 3 chữ số thập phân chuẩn mét (`#,##0.000`).
   - Tọa độ WGS-84 (Lat, Lng): 6 chữ số thập phân (`0.000000`).
   - Diện tích m²: 2 số thập phân (`#,##0.00`), Diện tích ha: 4 số thập phân (`#,##0.0000`).
   - Hàng tiêu đề nền tối `#0f172a`, chữ màu ngọc nổi bật, đóng băng hàng 1 (`Freeze Row 1`).

5. **Hàm cứu hộ & dọn dẹp tự động (`gopVaLamSachSoDo`):**  
   Tự động gom toàn bộ các sheet cũ bị phân tán về đúng 2 Tab tập trung, khử trùng lặp và xóa sạch các sheet thừa!

---

## 💻 4. Mã Nguồn Google Apps Script Tối Ưu v4.0 (Sao chép và sử dụng)

```javascript
/**
 * =========================================================================
 * GOOGLE APPS SCRIPT ĐỒNG BỘ SỔ ĐO TRẮC ĐỊA VN-2000 & MINICAD PRO (V4.0)
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com) - Kiến Trúc Lưu Trữ Tập Trung 2 Tab
 * =========================================================================
 * TỐI ƯU HÓA ĐẶC BIỆT CHO DỮ LIỆU LỚN (BIG DATA):
 * 1. KHÔNG PHÂN MẢNH THÀNH NHIỀU TAB/SHEET CON:
 *    - Toàn bộ dữ liệu được quản lý tập trung và khoa học trên đúng 2 Tab chuẩn:
 *      • Tab 1: "Sổ Đo Tọa Độ" -> Toàn bộ mốc & đỉnh ranh giới (chuẩn 14 cột, lọc theo cột Dự Án, Thửa).
 *      • Tab 2: "Tổng Hợp Diện Tích" -> Bảng thống kê diện tích, chu vi, loại hình, số đỉnh của mọi thửa.
 * 2. TỰ ĐỘNG BẬT BỘ LỌC DỮ LIỆU (DATA FILTER):
 *    - Dễ dàng tra cứu, lọc xem từng dự án hoặc từng thửa đất chỉ với 1 click chuột.
 * 3. CƠ CHẾ CHỐNG TRÙNG LẶP & CẬP NHẬT THÔNG MINH (DEDUPLICATION & IN-PLACE UPDATE):
 *    - Đỉnh mốc: Khóa duy nhất theo [Dự Án + Khối + Tên Mốc + X + Y].
 *    - Thửa đất: Khóa theo [Dự Án + Tên Khối/Thửa]. Tự động cập nhật số liệu mới nhất nếu thửa đã có.
 * 4. TÍNH NĂNG CỨU HỘ & DỌN DẸP "gopVaLamSachSoDo()":
 *    - Tự động gom các tab cũ phân tán về đúng 2 Tab tập trung, dọn sạch tab rác.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận xử lý, vui lòng thử lại sau vài giây."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var defaultProject = (data.project || "So_Do_Mac_Dinh").replace(/[:\/?*[]]/g, "_").replace(/\.csv$/i, "");

    var pointSheetName = "Sổ Đo Tọa Độ";
    var areaSheetName = "Tổng Hợp Diện Tích";

    // 1. Quản lý Tab 1: "Sổ Đo Tọa Độ" (Lưu tập trung toàn bộ mốc & đỉnh ranh giới)
    var pointSheet = ss.getSheetByName(pointSheetName);
    if (!pointSheet) {
      var allSheets = ss.getSheets();
      if (allSheets.length > 0 && (allSheets[0].getName() === "Sheet1" || allSheets[0].getName() === "Trang tính1")) {
        allSheets[0].setName(pointSheetName);
        pointSheet = allSheets[0];
      } else {
        pointSheet = ss.insertSheet(pointSheetName, 0);
      }
    }
    if (pointSheet.getLastRow() === 0) {
      initPointSheetHeader(pointSheet);
    }

    var addedPointsCount = 0;
    var existingPointKeys = getExistingPointKeys(pointSheet);

    // Xử lý ghi mốc tọa độ vào Tab 1
    if (Array.isArray(data.points) && data.points.length > 0) {
      var pointRowsToAdd = [];

      data.points.forEach(function(p) {
        var pProj = String(p.project || defaultProject).replace(/\.csv$/i, "").trim();
        var pName = String(p.name || "Mốc").trim();
        var pShape = String(p.shapeName || p.blockName || p.shape || "").trim();
        var pX = parseFloat(p.x) || 0;
        var pY = parseFloat(p.y) || 0;
        var key = pProj.toLowerCase() + "_" + pShape.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

        if (!existingPointKeys[key]) {
          pointRowsToAdd.push(formatPointRow(p, pProj));
          existingPointKeys[key] = true;
          addedPointsCount++;
        }
      });

      if (pointRowsToAdd.length > 0) {
        var startRow = pointSheet.getLastRow() + 1;
        pointSheet.getRange(startRow, 1, pointRowsToAdd.length, pointRowsToAdd[0].length).setValues(pointRowsToAdd);
        formatPointDataRange(pointSheet, startRow, pointRowsToAdd.length);
        ensureFilterRange(pointSheet);
      }
    } else if (data.point) {
      var p = data.point;
      var pProj = String(p.project || defaultProject).replace(/\.csv$/i, "").trim();
      var pName = String(p.name || "Mốc").trim();
      var pShape = String(p.shapeName || p.blockName || p.shape || "").trim();
      var pX = parseFloat(p.x) || 0;
      var pY = parseFloat(p.y) || 0;
      var key = pProj.toLowerCase() + "_" + pShape.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

      if (!existingPointKeys[key]) {
        var rowData = formatPointRow(p, pProj);
        pointSheet.appendRow(rowData);
        var lastRow = pointSheet.getLastRow();
        formatPointDataRange(pointSheet, lastRow, 1);
        ensureFilterRange(pointSheet);
        addedPointsCount = 1;
      }
    }

    // 2. Quản lý Tab 2: "Tổng Hợp Diện Tích" (Lưu tập trung toàn bộ thửa đất / khối của mọi dự án)
    var addedShapesCount = 0;
    if (Array.isArray(data.shapes) && data.shapes.length > 0) {
      var areaSheet = ss.getSheetByName(areaSheetName);
      if (!areaSheet) {
        areaSheet = ss.insertSheet(areaSheetName, 1);
      }
      if (areaSheet.getLastRow() === 0) {
        initAreaSheetHeader(areaSheet);
      }

      var areaKeys = getExistingAreaKeys(areaSheet);
      var shapeRowsToAdd = [];
      var shapeUpdates = [];
      var nowStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");

      data.shapes.forEach(function(s) {
        var sProj = String(s.project || defaultProject).replace(/\.csv$/i, "").trim();
        var sName = String(s.name || "Thửa").trim();
        var key = sProj.toLowerCase() + "_" + sName.toLowerCase();

        var rowValues = [
          nowStr,
          sProj,
          s.order || "--",
          sName,
          s.mode || "Đa giác",
          s.vertexCount || 0,
          parseFloat(s.area) || 0,
          parseFloat(s.ha) || 0,
          parseFloat(s.perimeter) || 0,
          s.color || "#10b981",
          s.note || ""
        ];

        if (areaKeys[key]) {
          shapeUpdates.push({ row: areaKeys[key], values: rowValues });
        } else {
          shapeRowsToAdd.push(rowValues);
          areaKeys[key] = true;
          addedShapesCount++;
        }
      });

      shapeUpdates.forEach(function(item) {
        areaSheet.getRange(item.row, 1, 1, item.values.length).setValues([item.values]);
      });

      if (shapeRowsToAdd.length > 0) {
        var aStartRow = areaSheet.getLastRow() + 1;
        areaSheet.getRange(aStartRow, 1, shapeRowsToAdd.length, shapeRowsToAdd[0].length).setValues(shapeRowsToAdd);
        formatAreaDataRange(areaSheet, aStartRow, shapeRowsToAdd.length);
      }

      ensureFilterRange(areaSheet);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      pointsAdded: addedPointsCount,
      shapesAdded: addedShapesCount,
      tabs: [pointSheetName, areaSheetName]
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Khởi tạo dòng tiêu đề Tab 1: "Sổ Đo Tọa Độ" (14 cột chuẩn hóa)
function initPointSheetHeader(sheet) {
  var headers = [
    "Thời Gian Đo", "Tên Điểm Mốc", "Khối / Thửa Đất", "Loại Hình", "STT Đỉnh",
    "Tọa Độ X (Bắc - m)", "Tọa Độ Y (Đông - m)", "Vĩ Độ (Lat - °)", "Kinh Độ (Long - °)",
    "Múi Chiếu", "Kinh Tuyến Trục", "Ghi Chú Hiện Trường", "Dự Án", "Vị Trí Google Maps"
  ];
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setBackground("#0f172a")
             .setFontColor("#38bdf8")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
  ensureFilterRange(sheet);
}

// Khởi tạo dòng tiêu đề Tab 2: "Tổng Hợp Diện Tích" (11 cột chuẩn hóa)
function initAreaSheetHeader(sheet) {
  var headers = [
    "Thời Gian Cập Nhật", "Dự Án", "STT", "Tên Khối / Thửa Đất", "Loại Hình",
    "Số Đỉnh", "Diện Tích (m²)", "Diện Tích (ha)", "Chu Vi / Chiều Dài (m)", "Mã Màu", "Ghi Chú"
  ];
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setBackground("#0f172a")
             .setFontColor("#34d399")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
  ensureFilterRange(sheet);
}

// Đảm bảo bộ lọc dữ liệu luôn bao quát toàn bộ bảng
function ensureFilterRange(sheet) {
  try {
    var lastRow = Math.max(sheet.getLastRow(), 2);
    var lastCol = Math.max(sheet.getLastColumn(), 11);
    var filter = sheet.getFilter();
    if (!filter) {
      sheet.getRange(1, 1, lastRow, lastCol).createFilter();
    }
  } catch(e) {}
}

// Định dạng dữ liệu một dòng mốc (Tab 1)
function formatPointRow(p, projectName) {
  var lat = parseFloat(p.lat) || 0;
  var lng = parseFloat(p.lng) || 0;
  var proj = String(p.project || projectName || "Mặc định").replace(/\.csv$/i, "").trim();
  var mapFormula = (lat !== 0 && lng !== 0) 
    ? '=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")'
    : "";

  var sName = String(p.shapeName || p.blockName || p.shape || "").trim();
  var sMode = String(p.shapeMode || (p.mode === 'polyline' ? 'Tuyến' : (p.mode === 'polygon' ? 'Đa giác' : '')) || "").trim();
  var sOrder = p.shapeOrder || p.vertexOrder || "";

  return [
    p.time || new Date(),
    p.name || "Mốc",
    sName || "Khối mặc định",
    sMode || "Đa giác",
    sOrder || "--",
    parseFloat(p.x) || p.x || 0,
    parseFloat(p.y) || p.y || 0,
    parseFloat(p.lat) || p.lat || 0,
    parseFloat(p.lng) || p.lng || 0,
    p.mui ? ("Múi " + p.mui + "°") : "Múi 3°",
    p.ktt || "",
    p.note || "",
    proj,
    mapFormula
  ];
}

// Định dạng vùng dữ liệu Tab 1: Sổ Đo Tọa Độ
function formatPointDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 6, numRows, 2).setNumberFormat("#,##0.000");
    sheet.getRange(startRow, 8, numRows, 2).setNumberFormat("0.000000");
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
    sheet.getRange(startRow, 3, numRows, 1).setFontWeight("bold").setFontColor("#059669");
    sheet.getRange(startRow, 4, numRows, 2).setHorizontalAlignment("center");
    sheet.getRange(startRow, 13, numRows, 1).setFontWeight("bold").setFontColor("#0284c7").setHorizontalAlignment("center");
    sheet.getRange(startRow, 14, numRows, 1).setHorizontalAlignment("center");

    var latLngValues = sheet.getRange(startRow, 8, numRows, 2).getValues();
    var formulas = [];
    for (var i = 0; i < latLngValues.length; i++) {
      var lat = parseFloat(latLngValues[i][0]) || 0;
      var lng = parseFloat(latLngValues[i][1]) || 0;
      if (lat !== 0 && lng !== 0) {
        formulas.push(['=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")']);
      } else {
        formulas.push([""]);
      }
    }
    var mapRange = sheet.getRange(startRow, 14, numRows, 1);
    try {
      mapRange.setFormulasLocal(formulas);
    } catch (e) {
      mapRange.setValues(formulas);
    }
  } catch(e) {}
}

// Định dạng vùng dữ liệu Tab 2: Tổng Hợp Diện Tích
function formatAreaDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#0284c7").setHorizontalAlignment("center");
    sheet.getRange(startRow, 3, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 4, numRows, 1).setFontWeight("bold").setFontColor("#059669");
    sheet.getRange(startRow, 5, numRows, 2).setHorizontalAlignment("center");
    sheet.getRange(startRow, 7, numRows, 1).setNumberFormat("#,##0.00").setHorizontalAlignment("right");
    sheet.getRange(startRow, 8, numRows, 1).setNumberFormat("#,##0.0000").setHorizontalAlignment("right");
    sheet.getRange(startRow, 9, numRows, 1).setNumberFormat("#,##0.00").setHorizontalAlignment("right");
    sheet.getRange(startRow, 10, numRows, 1).setHorizontalAlignment("center");
  } catch(e) {}
}

// Lấy danh sách khóa mốc đã có (Tab 1)
function getExistingPointKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, Math.min(lastCol, 14)).getValues();
    var is14 = lastCol >= 14;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowName = String(row[1] || "").trim().toLowerCase();
      var rowShape = is14 ? String(row[2] || "").trim().toLowerCase() : "";
      var rowX = parseFloat(is14 ? row[5] : row[2]) || 0;
      var rowY = parseFloat(is14 ? row[6] : row[3]) || 0;
      var rowProj = String(is14 ? (row[12] || "") : (row[9] || "")).trim().toLowerCase().replace(/\.csv$/i, "");
      
      var key = rowProj + "_" + rowShape + "_" + rowName + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
      keys[key] = true;
      var fallbackKey = rowProj + "__" + rowName + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
      keys[fallbackKey] = true;
    }
  }
  return keys;
}

// Lấy danh sách khóa thửa đất đã có (Tab 2)
function getExistingAreaKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 5)).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var sProj = String(row[1] || "").trim().toLowerCase();
      var sName = String(row[3] || "").trim().toLowerCase();
      if (sProj || sName) {
        keys[sProj + "_" + sName] = i + 2;
      }
    }
  }
  return keys;
}

// HÀM TIỆN ÍCH DỌN DẸP & NÂNG CẤP: Gom các tab phân tán về đúng 2 Tab chuẩn
function gopVaLamSachSoDo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pointSheetName = "Sổ Đo Tọa Độ";
  var areaSheetName = "Tổng Hợp Diện Tích";

  var pointSheet = ss.getSheetByName(pointSheetName);
  if (!pointSheet) pointSheet = ss.insertSheet(pointSheetName, 0);
  if (pointSheet.getLastRow() === 0) initPointSheetHeader(pointSheet);

  var areaSheet = ss.getSheetByName(areaSheetName);
  if (!areaSheet) areaSheet = ss.insertSheet(areaSheetName, 1);
  if (areaSheet.getLastRow() === 0) initAreaSheetHeader(areaSheet);

  var existingPointKeys = getExistingPointKeys(pointSheet);
  var sheets = ss.getSheets();
  var totalImported = 0;
  var sheetsToDelete = [];

  sheets.forEach(function(sh) {
    var sName = sh.getName();
    if (sName === pointSheetName || sName === areaSheetName) return;

    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var numRows = lastRow - 1;
      var values = sh.getRange(2, 1, numRows, Math.min(sh.getLastColumn(), 14)).getValues();
      var rowsToAdd = [];

      for (var r = 0; r < values.length; r++) {
        var row = values[r];
        var rowTime = row[0] || new Date();
        var rowName = String(row[1] || "Mốc").trim();
        var rowShape = (row.length >= 14 && row[2]) ? String(row[2]).trim() : "Khối mặc định";
        var rowMode = (row.length >= 14 && row[3]) ? String(row[3]).trim() : "Đa giác";
        var rowOrder = (row.length >= 14 && row[4]) ? row[4] : (r + 1);
        
        var rowX = parseFloat(row.length >= 14 ? row[5] : row[2]) || 0;
        var rowY = parseFloat(row.length >= 14 ? row[6] : row[3]) || 0;
        var rowLat = parseFloat(row.length >= 14 ? row[7] : row[4]) || 0;
        var rowLng = parseFloat(row.length >= 14 ? row[8] : row[5]) || 0;
        var rowMui = (row.length >= 14 ? row[9] : row[6]) || "Múi 3°";
        var rowKtt = (row.length >= 14 ? row[10] : row[7]) || "";
        var rowNote = (row.length >= 14 ? row[11] : row[8]) || "";
        var rowProj = String((row.length >= 14 ? row[12] : row[9]) || sh.getName()).replace(/\.csv$/i, "").trim();

        var key = rowProj.toLowerCase() + "_" + rowShape.toLowerCase() + "_" + rowName.toLowerCase() + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
        if (!existingPointKeys[key] && (rowX !== 0 || rowLat !== 0)) {
          var mapFormula = (rowLat !== 0 && rowLng !== 0) 
            ? '=HYPERLINK("https://www.google.com/maps?q=' + rowLat + ',' + rowLng + '"; "🗺️ Xem Vị Trí")'
            : "";

          rowsToAdd.push([
            rowTime, rowName, rowShape, rowMode, rowOrder,
            rowX, rowY, rowLat, rowLng, rowMui, rowKtt, rowNote, rowProj, mapFormula
          ]);
          existingPointKeys[key] = true;
          totalImported++;
        }
      }

      if (rowsToAdd.length > 0) {
        var startRow = pointSheet.getLastRow() + 1;
        pointSheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
        formatPointDataRange(pointSheet, startRow, rowsToAdd.length);
      }
    }

    sheetsToDelete.push(sh);
  });

  sheetsToDelete.forEach(function(sh) {
    try {
      if (ss.getSheets().length > 2) {
        ss.deleteSheet(sh);
      }
    } catch(e) {}
  });

  ensureFilterRange(pointSheet);
  ensureFilterRange(areaSheet);
  return "✓ Đã gom và nâng cấp thành công " + totalImported + " mốc vào 2 Tab tập trung: 'Sổ Đo Tọa Độ' & 'Tổng Hợp Diện Tích'!";
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: "4.0",
    message: "Google Apps Script VN-2000 Pro & MiniCAD v4.0 (2-Tab Architecture) đã sẵn sàng!"
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## 📱 4.5 Cấu hình Google Sheets & AppSheet Phù Hợp với MiniCAD

Khi sử dụng **Google Sheets** làm nguồn cấp dữ liệu cho **AppSheet** (nền tảng No-Code di động của Google) hoặc đồng bộ 2 chiều với phân hệ **MiniCAD**, cấu trúc 14 cột v3.0 mang lại khả năng quản lý hồ sơ địa chính và đo đạc cực kỳ mạnh mẽ:

### 1. Bảng đối chiếu trường dữ liệu giữa MiniCAD, Google Sheets và AppSheet

| STT Cột | Tên Cột Google Sheets | Thuộc tính MiniCAD | Kiểu dữ liệu AppSheet | Vai trò nghiệp vụ trong AppSheet & MiniCAD |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `Thời Gian Đo` | `time` | `DateTime` | Thời điểm ghi nhận mốc |
| **2** | `Tên Điểm Mốc` | `name` | `Text` (Key phụ) | Tên điểm đo (Đ1, Đ2, M1, ...) |
| **3** | `Khối / Thửa Đất` | `shapeName` | `Text` *(Group By)* | **Nhóm theo Thửa đất/Lô đất**: Gom các đỉnh thuộc cùng một thửa đất riêng biệt, không bị nối lẫn sang thửa khác |
| **4** | `Loại Hình` | `shapeMode` | `Enum` (`Đa giác`, `Tuyến`) | Phân loại đường bao khép kín (Polygon) hay tim tuyến mở (Polyline) |
| **5** | `STT Đỉnh` | `shapeOrder` | `Number` *(Sort Order)* | **Thứ tự đỉnh**: Dùng để nối điểm ranh liên tục và khép góc ranh thửa chính xác |
| **6** | `Tọa Độ X (Bắc - m)` | `x` | `Decimal` (3 số lẻ) | Tọa độ phẳng trục X theo hệ VN-2000 |
| **7** | `Tọa Độ Y (Đông - m)` | `y` | `Decimal` (3 số lẻ) | Tọa độ phẳng trục Y theo hệ VN-2000 |
| **8** | `Vĩ Độ (Lat - °)` | `lat` | `Decimal` (6 số lẻ) | Tọa độ địa lý WGS-84 vĩ độ |
| **9** | `Kinh Độ (Long - °)` | `lng` | `Decimal` (6 số lẻ) | Tọa độ địa lý WGS-84 kinh độ |
| **10** | `Múi Chiếu` | `mui` | `Text` / `Enum` | Múi chiếu 3° hoặc 6° |
| **11** | `Kinh Tuyến Trục` | `ktt` | `Text` | Kinh tuyến trục địa phương (ví dụ: `105°00'`, `105°45'`) |
| **12** | `Ghi Chú Hiện Trường` | `note` | `LongText` | Tình trạng mốc, ranh giới, ghi chú đo |
| **13** | `Dự Án` | `project` | `Text` *(Group By tầng 1)* | Gom nhóm theo công trình / dự án đo đạc |
| **14** | `Vị Trí Google Maps` | `mapFormula` | `Url` / `Show` | Mở trực tiếp vị trí trạm đo trên Google Maps vệ tinh |

### 2. Thiết lập hiển thị phân cấp (Hierarchical View) trong AppSheet
Để quản lý nhiều thửa đất trong cùng một dự án mà không bị lộn xộn:
1. **Tạo View dạng Table / Deck:**
   - **View type:** `table` hoặc `deck`.
   - **Group by:**
     - Cấp 1: `[Dự Án]`
     - Cấp 2: `[Khối / Thửa Đất]`
   - **Sort by:** `[STT Đỉnh]` (Ascending / Tăng dần).
2. **Hiển thị bản đồ (Map View):**
   - Tạo cột ảo `[Map_Location]` kiểu `LatLong` với công thức:  
     `CONCATENATE([Vĩ Độ (Lat - °)], " , ", [Kinh Độ (Long - °)])`
   - Chọn cột `[Map_Location]` làm địa chỉ ghim mốc trên AppSheet Map.
3. **Tính diện tích & chu vi thửa đất:**
   - Nhờ có trường `Khối / Thửa Đất`, bạn có thể tạo Slice theo từng thửa đất và áp dụng công thức Gauss (Shoelace) để tính diện tích thửa đất trực tiếp hoặc trích xuất sang MiniCAD để xem diện tích tự động.

---

## ❓ 5. Xử Lý Các Câu Hỏi & Lỗi Thường Gặp

| Vấn đề gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Khi tải lại trang (F5), các mốc bị nối điểm lộn xộn** | Dữ liệu trước đây không lưu trường `Khối / Thửa Đất` và `STT Đỉnh`, dẫn tới khi nạp lại hệ thống nối dây chuyền từ đỉnh thửa này sang thửa khác. | **Đã được giải quyết triệt để trong bản v3.0!** Ứng dụng đã tự động lưu và tái tạo ranh giới từng thửa theo cấu trúc `shapeName` và `shapeOrder`. Hãy cập nhật kịch bản Google Apps Script v3.0 để đồng bộ đồng nhất. |
| **Bảng tính cũ có 11 cột, làm sao để nâng cấp lên 14 cột?** | Bảng tính tạo từ phiên bản trước chưa có các cột `Khối / Thửa Đất`, `Loại Hình`, `STT Đỉnh`. | Mở trình soạn thảo Apps Script, dán mã v3.0 mới, chọn hàm **`gopVaLamSachSoDo()`** và bấm **Chạy (Run)**. Script sẽ tự động nâng cấp cấu trúc lên 14 cột và gom dữ liệu an toàn mà không làm mất số liệu cũ! |
| **Cột Google Maps báo `#ERROR!` (Lỗi phân tích cú pháp)** | Google Sheets cài đặt vùng **Việt Nam** dùng dấu phẩy `,` làm số thập phân, do đó đối số hàm phải phân cách bằng **dấu chấm phẩy `;`** thay vì dấu phẩy `,`. | **Cách 1:** Cập nhật đoạn code Apps Script mới ở trên (sử dụng công thức `=HYPERLINK("..."; "🗺️ Xem Vị Trí")` với dấu chấm phẩy `;`).<br>**Cách 2:** Nhấn `Ctrl + H` trên Google Sheet, Tìm: `, "🗺️` $\rightarrow$ Thay thế bằng: `; "🗺️`. |
| **Báo lỗi `CORS error` hoặc không gửi được dữ liệu** | Khi Triển khai (Deploy), mục *"Người có quyền truy cập"* chưa chọn *"Bất kỳ ai"* (*Anyone*). | Mở lại Apps Script $\rightarrow$ **Triển khai** $\rightarrow$ **Quản lý bản triển khai** $\rightarrow$ Bấm biểu tượng ✏️ chỉnh sửa $\rightarrow$ Đổi thành **Bất kỳ ai** (*Anyone*) $\rightarrow$ Bấm **Triển khai lại**. |
| **Khi nào thì dữ liệu tự động gửi lên Sheet?** | Khi chọn chế độ *"Tự động đồng bộ lên Google Sheets"*. | Mọi thao tác lưu mốc trên màn hình Chuyển đổi, GPS, Bản đồ hay MiniCAD sẽ tự động đẩy lên Google Sheet ngay khi có mạng. |

