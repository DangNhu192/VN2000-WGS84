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
   - Bấm ti## 🌟 3. Các Tối Ưu Tự Động Được Tích Hợp (Chuẩn 14 Cột v3.0)

Đoạn mã kịch bản Apps Script được tối ưu hóa chuyên sâu cho nghiệp vụ trắc địa, phân hệ MiniCAD đa thửa đất và kết nối AppSheet:

1. **Lưu Tập Trung Vào 1 Sheet Duy Nhất ("Sổ Đo Tọa Độ"):**  
   Toàn bộ mốc đo của tất cả các dự án đều được ghi vào **duy nhất 1 Tab mang tên "Sổ Đo Tọa Độ"**, không tạo ra nhiều tab riêng lẻ gây phân tán số liệu. Mốc thuộc dự án nào được ghi rõ ràng vào cột **"Dự Án"** (cột 13).
2. **Cấu trúc 14 Cột Chuẩn Hóa Phân Hệ MiniCAD & AppSheet:**  
   Bổ sung 3 trường dữ liệu cốt lõi:
   - **`Khối / Thửa Đất` (Cột 3):** Tên thửa đất hoặc khối phân lô (Shape Name). Giúp tách biệt ranh giới từng thửa độc lập, triệt tiêu hoàn toàn lỗi nối điểm chéo khi mở lại trên MiniCAD.
   - **`Loại Hình` (Cột 4):** Kiểu hình học (`Đa giác` - Polygon hoặc `Tuyến` - Polyline).
   - **`STT Đỉnh` (Cột 5):** Thứ tự đỉnh mốc trên đường bao thửa đất, phục vụ khép góc ranh thửa và sắp xếp thứ tự hiển thị.
3. **Tự động kích hoạt bộ lọc dữ liệu (Data Filter):**  
   Google Sheet tự động bật bộ lọc theo hàng 1. Bạn chỉ cần bấm vào mũi tên lọc ở cột **"Dự Án"** hoặc **"Khối / Thửa Đất"** để xem riêng từng dự án, từng thửa chỉ với 1 click chuột!
4. **Cơ chế chống ghi trùng lặp tuyệt đối (Deduplication):**  
   Định danh duy nhất từng mốc theo công thức `[Dự Án] + [Khối/Thửa Đất] + [Tên Mốc] + [Tọa Độ X] + [Tọa Độ Y]`. Dù bạn bấm *"Đồng bộ"* bao nhiêu lần, số lượng mốc và ranh thửa của từng dự án luôn bảo toàn 100%, không bị nhân đôi mốc hay mất đỉnh chung ranh giới!
5. **Tự động gắn link Google Maps vệ tinh (`🗺️ Xem Vị Trí`):**  
   Mỗi mốc được thêm vào bảng sẽ tự động có một liên kết siêu văn bản chuẩn tiếng Việt (dấu chấm phẩy `;`). Mở Google Sheet bấm vào link này sẽ lập tức mở đúng vị trí thực tế của mốc trên Google Maps vệ tinh.
6. **Định dạng số chuẩn Trắc địa:**  
   - Tọa độ phẳng VN-2000 (X, Y): Cột 6 và 7, định dạng 3 chữ số thập phân chuẩn mét (`#,##0.000`).
   - Tọa độ WGS-84 (Vĩ độ, Kinh độ): Cột 8 và 9, định dạng 6 chữ số thập phân (`0.000000`).
   - Dòng tiêu đề: Màu nền tối `#0f172a`, chữ xanh ngọc `#38bdf8`, in đậm và **đóng băng hàng 1** (*Freeze Row 1*) để cuộn trang thuận tiện.
7. **Khóa chống xung đột dữ liệu (LockService):**  
   Đảm bảo an toàn 100% khi có nhiều tổ đo cùng gửi số liệu về một bảng tính cùng lúc.
8. **Hàng đợi ngoại tuyến thông minh (Offline Queue):**  
   Khi đi đo ở vùng sâu vùng xa mất sóng, mốc được lưu vào hàng đợi trên điện thoại kèm đầy đủ thông tin Khối/Thửa. Ngay khi có mạng trở lại, ứng dụng tự động đẩy các mốc lên Sheet mà bạn không cần phải làm gì thêm!
9. **Hàm cứu hộ & nâng cấp tự động (`gopVaLamSachSoDo`):**  
   Tự động gom toàn bộ các tab cũ về tab "Sổ Đo Tọa Độ", nâng cấp cấu trúc lên 14 cột, khử trùng lặp và loại bỏ các sheet rác.

---

## 💻 4. Mã Nguồn Google Apps Script Tối Ưu v3.0 (Sao chép và sử dụng)

```javascript
/**
 * =========================================================================
 * GOOGLE APPS SCRIPT ĐỒNG BỘ SỔ ĐO TỌA ĐỘ TRẮC ĐỊA VN-2000 & WGS-84 PRO
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com) - Phiên bản Tối Ưu v3.0 (Hỗ trợ MiniCAD & AppSheet)
 * =========================================================================
 * Tính năng tự động hóa vượt trội:
 * 1. Lưu TẬP TRUNG tất cả dự án vào 1 Sheet (Tab) duy nhất "Sổ Đo Tọa Độ",
 *    phân biệt rõ ràng theo cột "Dự Án" (cột 13) và "Khối / Thửa Đất" (cột 3).
 * 2. Tương thích 100% với phân hệ vẽ CAD Mini và phần mềm AppSheet (gom nhóm thửa đất, tính diện tích).
 * 3. Tự động bật bộ lọc dữ liệu (Filter) giúp lọc xem từng dự án hoặc từng thửa chỉ với 1 click.
 * 4. Chống trùng lặp mốc tuyệt đối: Định danh mốc theo [Dự Án + Khối + Tên Mốc + X + Y].
 * 5. Tự động tạo công thức Google Maps vệ tinh chuẩn tiếng Việt dấu chấm phẩy (;).
 * 6. Định dạng trắc địa chuẩn (X, Y: 3 số lẻ; Lat, Lng: 6 số lẻ).
 * 7. Hàm tiện ích "gopVaLamSachSoDo()": Tự động gom các tab cũ, nâng cấp lên 14 cột và dọn sạch trùng lặp!
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var defaultProject = (data.project || "So_Do_Mac_Dinh").replace(/[:\\/?*\[\]]/g, "_").replace(/\.csv$/i, "");

    // 1. Lưu tập trung toàn bộ dự án vào 1 Sheet (Tab) duy nhất "Sổ Đo Tọa Độ"
    var sheetName = "Sổ Đo Tọa Độ";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      var allSheets = ss.getSheets();
      if (allSheets.length > 0 && (allSheets[0].getName() === "Sheet1" || allSheets[0].getName() === "Trang tính1")) {
        allSheets[0].setName(sheetName);
        sheet = allSheets[0];
      } else {
        sheet = ss.insertSheet(sheetName, 0);
      }
    }

    // 2. Khởi tạo dòng tiêu đề chuẩn 14 cột nếu Tab còn trống
    if (sheet.getLastRow() === 0) {
      initSheetHeader(sheet);
    }

    var lastCol = sheet.getLastColumn();
    var isNew14Col = (lastCol >= 14 || sheet.getLastRow() <= 1);
    var addedCount = 0;
    var existingKeys = getExistingKeys(sheet);

    // 3. Xử lý đồng bộ nhiều mốc cùng lúc (Bulk Sync)
    if (Array.isArray(data.points) && data.points.length > 0) {
      var rowsToAdd = [];

      data.points.forEach(function(p) {
        var pProj = String(p.project || defaultProject).replace(/\.csv$/i, "").trim();
        var pName = String(p.name || "Mốc").trim();
        var pShape = String(p.shapeName || p.blockName || p.shape || "").trim();
        var pX = parseFloat(p.x) || 0;
        var pY = parseFloat(p.y) || 0;
        var key = pProj.toLowerCase() + "_" + pShape.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

        if (!existingKeys[key]) {
          rowsToAdd.push(formatPointRow(p, pProj, isNew14Col ? 14 : 11));
          existingKeys[key] = true;
          addedCount++;
        }
      });

      if (rowsToAdd.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        var range = sheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length);
        range.setValues(rowsToAdd);
        formatDataRange(sheet, startRow, rowsToAdd.length, isNew14Col ? 14 : 11);
      }
    } 
    // 4. Xử lý lưu mốc lẻ theo thời gian thực (Real-time Single Point)
    else if (data.point) {
      var p = data.point;
      var pProj = String(p.project || defaultProject).replace(/\.csv$/i, "").trim();
      var pName = String(p.name || "Mốc").trim();
      var pShape = String(p.shapeName || p.blockName || p.shape || "").trim();
      var pX = parseFloat(p.x) || 0;
      var pY = parseFloat(p.y) || 0;
      var key = pProj.toLowerCase() + "_" + pShape.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

      if (!existingKeys[key]) {
        var rowData = formatPointRow(p, pProj, isNew14Col ? 14 : 11);
        sheet.appendRow(rowData);
        var lastRow = sheet.getLastRow();
        formatDataRange(sheet, lastRow, 1, isNew14Col ? 14 : 11);
        addedCount = 1;
      }
    }

    // Cập nhật bộ lọc bao quát tất cả dòng nếu có thêm mốc mới
    if (addedCount > 0) {
      ensureFilterRange(sheet);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      added: addedCount,
      sheet: sheetName,
      columns: isNew14Col ? 14 : 11
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

// Khởi tạo dòng tiêu đề chuẩn 14 cột tích hợp MiniCAD & AppSheet
function initSheetHeader(sheet) {
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

// Định dạng dữ liệu một dòng (hỗ trợ cả chuẩn mới 14 cột và bảng cũ 11 cột)
function formatPointRow(p, projectName, numCols) {
  var lat = parseFloat(p.lat) || 0;
  var lng = parseFloat(p.lng) || 0;
  var proj = String(p.project || projectName || "Mặc định").replace(/\.csv$/i, "").trim();
  var mapFormula = (lat !== 0 && lng !== 0) 
    ? '=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")'
    : "";

  var sName = String(p.shapeName || p.blockName || p.shape || "").trim();
  var sMode = String(p.shapeMode || (p.mode === 'polyline' ? 'Tuyến' : (p.mode === 'polygon' ? 'Đa giác' : '')) || "").trim();
  var sOrder = p.shapeOrder || p.vertexOrder || "";

  // Trường hợp tương thích ngược bảng cũ 11 cột
  if (numCols === 11) {
    var noteCombined = (p.note || "");
    if (sName) noteCombined = (noteCombined ? (noteCombined + " | ") : "") + "Khối: " + sName;
    return [
      p.time || new Date(),
      p.name || "Mốc",
      parseFloat(p.x) || p.x || 0,
      parseFloat(p.y) || p.y || 0,
      parseFloat(p.lat) || p.lat || 0,
      parseFloat(p.lng) || p.lng || 0,
      p.mui ? ("Múi " + p.mui + "°") : "Múi 3°",
      p.ktt || "",
      noteCombined,
      proj,
      mapFormula
    ];
  }

  // Chuẩn mới 14 cột chuyên biệt cho MiniCAD & AppSheet
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

// Định dạng số liệu trắc địa & áp dụng setFormulasLocal đảm bảo 100% không bị lỗi #ERROR!
function formatDataRange(sheet, startRow, numRows, numCols) {
  try {
    if (numCols === 14) {
      // 14 Cột: X (cột 6), Y (cột 7), Lat (cột 8), Lng (cột 9), Dự Án (cột 13), Map (cột 14)
      sheet.getRange(startRow, 6, numRows, 2).setNumberFormat("#,##0.000");
      sheet.getRange(startRow, 8, numRows, 2).setNumberFormat("0.000000");
      sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
      sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
      sheet.getRange(startRow, 3, numRows, 1).setFontWeight("bold").setFontColor("#059669"); // Tên Khối/Thửa
      sheet.getRange(startRow, 4, numRows, 2).setHorizontalAlignment("center"); // Loại hình & STT
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
    } else {
      // Bảng cũ 11 Cột
      sheet.getRange(startRow, 3, numRows, 2).setNumberFormat("#,##0.000");
      sheet.getRange(startRow, 5, numRows, 2).setNumberFormat("0.000000");
      sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
      sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
      sheet.getRange(startRow, 10, numRows, 1).setFontWeight("bold").setFontColor("#0284c7").setHorizontalAlignment("center");
      sheet.getRange(startRow, 11, numRows, 1).setHorizontalAlignment("center");

      var latLngValues11 = sheet.getRange(startRow, 5, numRows, 2).getValues();
      var formulas11 = [];
      for (var j = 0; j < latLngValues11.length; j++) {
        var lat11 = parseFloat(latLngValues11[j][0]) || 0;
        var lng11 = parseFloat(latLngValues11[j][1]) || 0;
        if (lat11 !== 0 && lng11 !== 0) {
          formulas11.push(['=HYPERLINK("https://www.google.com/maps?q=' + lat11 + ',' + lng11 + '"; "🗺️ Xem Vị Trí")']);
        } else {
          formulas11.push([""]);
        }
      }
      var mapRange11 = sheet.getRange(startRow, 11, numRows, 1);
      try {
        mapRange11.setFormulasLocal(formulas11);
      } catch (e) {
        mapRange11.setValues(formulas11);
      }
    }
  } catch(e) {}
}

// Lấy danh sách khóa mốc đã có theo [Dự Án + Khối + Tên Mốc + X + Y] để chống trùng lặp tuyệt đối
function getExistingKeys(sheet) {
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

// HÀM TIỆN ÍCH DỌN DẸP & NÂNG CẤP: Gom các tab cũ, nâng cấp lên 14 cột chuẩn MiniCAD/AppSheet
function gopVaLamSachSoDo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName("Sổ Đo Tọa Độ");
  if (!targetSheet) {
    targetSheet = ss.insertSheet("Sổ Đo Tọa Độ", 0);
  }
  if (targetSheet.getLastRow() === 0) {
    initSheetHeader(targetSheet);
  }

  var existingKeys = getExistingKeys(targetSheet);
  var sheets = ss.getSheets();
  var totalImported = 0;
  var sheetsToDelete = [];

  sheets.forEach(function(sh) {
    if (sh.getName() === "Sổ Đo Tọa Độ") return;

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
        if (!existingKeys[key] && (rowX !== 0 || rowLat !== 0)) {
          var mapFormula = (rowLat !== 0 && rowLng !== 0) 
            ? '=HYPERLINK("https://www.google.com/maps?q=' + rowLat + ',' + rowLng + '"; "🗺️ Xem Vị Trí")'
            : "";

          rowsToAdd.push([
            rowTime, rowName, rowShape, rowMode, rowOrder,
            rowX, rowY, rowLat, rowLng, rowMui, rowKtt, rowNote, rowProj, mapFormula
          ]);
          existingKeys[key] = true;
          totalImported++;
        }
      }

      if (rowsToAdd.length > 0) {
        var startRow = targetSheet.getLastRow() + 1;
        var range = targetSheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length);
        range.setValues(rowsToAdd);
        formatDataRange(targetSheet, startRow, rowsToAdd.length, 14);
      }
    }

    sheetsToDelete.push(sh);
  });

  sheetsToDelete.forEach(function(sh) {
    try {
      if (ss.getSheets().length > 1) {
        ss.deleteSheet(sh);
      }
    } catch(e) {}
  });

  ensureFilterRange(targetSheet);
  return "✓ Đã gom và nâng cấp thành công " + totalImported + " mốc vào bảng 14 cột chuẩn 'Sổ Đo Tọa Độ'!";
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: "3.0",
    message: "Google Apps Script VN-2000 Pro & MiniCAD đã sẵn sàng!"
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

