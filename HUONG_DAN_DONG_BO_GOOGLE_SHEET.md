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
   - Bấm tiếp vào liên kết: **Đi tới ... (không an toàn)** / *Go to ... (unsafe)*.
   - Kéo xuống và bấm nút **Cho phép (*Allow*)**.

---

### Bước 6: Lấy link Web App và dán vào ứng dụng
1. Sau khi cấp quyền xong, Google sẽ cung cấp cho bạn một đường dẫn tại mục **URL của ứng dụng web (*Web app URL*)** có dạng:  
   👉 `https://script.google.com/macros/s/AKfycbx.../exec`
2. Bấm nút **Sao chép** (*Copy*).
3. Quay trở lại ứng dụng **VN-2000 PWA**:
   - Mở hộp thoại **`☁️ Lưu`**.
   - Dán link vừa copy vào ô: **Google Apps Script Web App URL**.
   - (Tùy chọn): Dán link xem Google Sheet vào ô **Link xem file Google Sheet** để mở xem nhanh.
   - Bấm nút **`🔌 Thử kết nối`** để kiểm tra (hệ thống sẽ tự động ghi 1 dòng thử nghiệm vào Sheet để xác nhận thành công).
   - Bấm nút **`💾 LƯU CẤU HÌNH`**.

---

## 🌟 3. Các Tối Ưu Tự Động Được Tích Hợp

Đoạn mã kịch bản Apps Script được tối ưu hóa chuyên sâu cho nghiệp vụ trắc địa:

1. **Phân tách Tab tự động theo Dự Án (Multi-Tab per Project):**  
   Khi bạn tạo một sổ đo mới (ví dụ `DuAn_RanhDat_A.csv`), script sẽ **tự động tạo một Tab riêng** mang tên dự án trong Google Sheet, không làm trộn lẫn mốc giữa các dự án khác nhau.
2. **Tự động gắn link Google Maps (`🗺️ Xem Vị Trí`):**  
   Mỗi mốc được thêm vào bảng sẽ tự động có một liên kết siêu văn bản. Bất cứ ai mở Google Sheet bấm vào link này sẽ lập tức mở đúng vị trí thực tế của mốc trên Google Maps vệ tinh.
3. **Định dạng số chuẩn Trắc địa:**  
   - Tọa độ phẳng VN-2000 (X, Y): Định dạng 3 chữ số thập phân chuẩn mét (`#,##0.000`).
   - Tọa độ WGS-84 (Vĩ độ, Kinh độ): Định dạng 6 chữ số thập phân (`0.000000`).
   - Dòng tiêu đề: Màu nền tối `#0f172a`, chữ xanh ngọc `#38bdf8`, in đậm và **đóng băng hàng 1** (*Freeze Row 1*) để cuộn trang thuận tiện.
4. **Cơ chế chống ghi trùng lặp (Deduplication):**  
   Nếu bạn bấm *"Đồng bộ toàn bộ sổ đo"* nhiều lần, hệ thống sẽ đối chiếu và chỉ bổ sung những mốc mới, bỏ qua mốc đã có sẵn trên Sheet.
5. **Khóa chống xung đột dữ liệu (LockService):**  
   Đảm bảo an toàn 100% khi có nhiều người đo cùng gửi số liệu về một bảng tính cùng lúc.
6. **Hàng đợi ngoại tuyến thông minh (Offline Queue):**  
   Khi đi đo ở vùng sâu vùng xa mất sóng, mốc được lưu vào hàng đợi trên điện thoại. Ngay khi có mạng trở lại, ứng dụng tự động đẩy các mốc lên Sheet mà bạn không cần phải làm gì thêm!

---

## 💻 4. Mã Nguồn Google Apps Script Tối Ưu (Sao chép và sử dụng)

```javascript
/**
 * =========================================================================
 * GOOGLE APPS SCRIPT ĐỒNG BỘ SỔ ĐO TỌA ĐỘ TRẮC ĐỊA VN-2000 & WGS-84 PRO
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com)
 * =========================================================================
 * Tính năng:
 * - Tự động tạo Tab (Sheet) theo tên từng Dự Án
 * - Tự động tạo liên kết Google Maps cho từng mốc tọa độ
 * - Tự động định dạng số liệu trắc địa chuẩn (X, Y 3 số lẻ; Lat, Lng 6 số lẻ)
 * - Chống trùng lặp mốc khi đồng bộ nhiều lần
 * - Khóa LockService bảo vệ dữ liệu chống ghi đè đồng thời
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Chờ tối đa 10 giây để nhận quyền ghi
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var rawProject = data.project || "So_Do_Mac_Dinh";
    var projectName = rawProject.replace(/[:\\/?*\[\]]/g, "_").replace(/\.csv$/i, "");
    
    // 1. Tự động tìm hoặc tạo Tab theo tên Dự án
    var sheet = ss.getSheetByName(projectName);
    if (!sheet) {
      sheet = ss.insertSheet(projectName);
    }
    
    // 2. Khởi tạo dòng tiêu đề chuyên nghiệp nếu Tab còn trống
    if (sheet.getLastRow() === 0) {
      initSheetHeader(sheet);
    }

    var addedCount = 0;
    
    // 3. Xử lý đồng bộ nhiều mốc cùng lúc (Bulk Sync)
    if (Array.isArray(data.points) && data.points.length > 0) {
      var existingKeys = getExistingKeys(sheet);
      var rowsToAdd = [];

      data.points.forEach(function(p) {
        var key = (p.name || "") + "_" + (p.time || "") + "_" + (p.x || "");
        if (!existingKeys[key]) {
          rowsToAdd.push(formatPointRow(p, projectName));
          existingKeys[key] = true;
          addedCount++;
        }
      });

      if (rowsToAdd.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        var range = sheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length);
        range.setValues(rowsToAdd);
        formatDataRange(sheet, startRow, rowsToAdd.length);
      }
    } 
    // 4. Xử lý lưu mốc lẻ theo thời gian thực (Real-time Single Point)
    else if (data.point) {
      var p = data.point;
      var existingKeys = getExistingKeys(sheet);
      var key = (p.name || "") + "_" + (p.time || "") + "_" + (p.x || "");
      
      if (!existingKeys[key]) {
        var rowData = formatPointRow(p, projectName);
        sheet.appendRow(rowData);
        var lastRow = sheet.getLastRow();
        formatDataRange(sheet, lastRow, 1);
        addedCount = 1;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      added: addedCount,
      project: projectName
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

// Khởi tạo hàng tiêu đề và đóng băng hàng 1
function initSheetHeader(sheet) {
  var headers = [
    "Thời Gian Đo", "Tên Điểm Mốc", "Tọa Độ X (Bắc - m)", "Tọa Độ Y (Đông - m)",
    "Vĩ Độ (Lat - °)", "Kinh Độ (Long - °)", "Múi Chiếu", "Kinh Tuyến Trục",
    "Ghi Chú Hiện Trường", "Dự Án", "Vị Trí Google Maps"
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
}

// Định dạng dữ liệu một hàng và tạo liên kết bản đồ Google Maps chuẩn dấu chấm phẩy (;) cho Google Sheets Việt Nam
function formatPointRow(p, projectName) {
  var lat = parseFloat(p.lat) || 0;
  var lng = parseFloat(p.lng) || 0;
  var mapFormula = (lat !== 0 && lng !== 0) 
    ? '=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")'
    : "";

  return [
    p.time || new Date(),
    p.name || "Mốc",
    parseFloat(p.x) || p.x || 0,
    parseFloat(p.y) || p.y || 0,
    parseFloat(p.lat) || p.lat || 0,
    parseFloat(p.lng) || p.lng || 0,
    p.mui ? ("Múi " + p.mui + "°") : "Múi 3°",
    p.ktt || "",
    p.note || "",
    projectName,
    mapFormula
  ];
}

// Áp dụng định dạng số liệu trắc địa và chuẩn hóa công thức Hyperlink tiếng Việt
function formatDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 3, numRows, 2).setNumberFormat("#,##0.000"); // X, Y (3 chữ số thập phân)
    sheet.getRange(startRow, 5, numRows, 2).setNumberFormat("0.000000");  // Lat, Lng (6 chữ số thập phân)
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
    sheet.getRange(startRow, 11, numRows, 1).setHorizontalAlignment("center");

    // Đảm bảo công thức Hyperlink tiếng Việt chuẩn dấu chấm phẩy (;) hiển thị chuẩn xác
    var latLngValues = sheet.getRange(startRow, 5, numRows, 2).getValues();
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
    var mapRange = sheet.getRange(startRow, 11, numRows, 1);
    try {
      mapRange.setFormulasLocal(formulas);
    } catch (e) {
      mapRange.setValues(formulas);
    }
  } catch(e) {}
}

// Hàm hỗ trợ tự động sửa nhanh toàn bộ các dòng cũ đang bị lỗi #ERROR! trong Sheet
function suaLoiLienKetCu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var totalFixed = 0;

  sheets.forEach(function(sh) {
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var numRows = lastRow - 1;
      var latLngValues = sh.getRange(2, 5, numRows, 2).getValues();
      var formulas = [];
      for (var r = 0; r < latLngValues.length; r++) {
        var lat = parseFloat(latLngValues[r][0]) || 0; // Cột Vĩ độ (Lat)
        var lng = parseFloat(latLngValues[r][1]) || 0; // Cột Kinh độ (Long)
        if (lat !== 0 && lng !== 0) {
          formulas.push(['=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")']);
          totalFixed++;
        } else {
          formulas.push([""]);
        }
      }
      var targetRange = sh.getRange(2, 11, formulas.length, 1);
      try {
        targetRange.setFormulasLocal(formulas);
      } catch(err) {
        targetRange.setValues(formulas);
      }
    }
  });

  return "Đã sửa thành công " + totalFixed + " mốc bằng công thức: =HYPERLINK(\"...; \"🗺️ Xem Vị Trí\") chuẩn dấu chấm phẩy (;)!";
}

// Lấy danh sách khóa mốc đã có trong bảng để chống trùng lặp
function getExistingKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return keys;
  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  for (var i = 0; i < data.length; i++) {
    var time = data[i][0];
    var name = data[i][1];
    var x = data[i][2];
    keys[name + "_" + time + "_" + x] = true;
  }
  return keys;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script VN-2000 Pro sẵn sàng hoạt động!"
  })).setMimeType(ContentService.MimeType.JSON);
}
```

---

## ❓ 5. Xử Lý Các Câu Hỏi & Lỗi Thường Gặp

| Vấn đề gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Cột Google Maps báo `#ERROR!` (Lỗi phân tích cú pháp)** | Google Sheets cài đặt vùng **Việt Nam** dùng dấu phẩy `,` làm số thập phân, do đó đối số hàm phải phân cách bằng **dấu chấm phẩy `;`** thay vì dấu phẩy `,`. | **Cách 1:** Cập nhật đoạn code Apps Script mới ở trên (sử dụng công thức `=HYPERLINK("..."; "🗺️ Xem Vị Trí")` với dấu chấm phẩy `;`).<br>**Cách 2:** Trong thanh công cụ Apps Script, chọn hàm `suaLoiLienKetCu` rồi bấm **Chạy (Run)** để sửa ngay các dòng cũ.<br>**Cách 3 (Nhanh trên bảng tính):** Nhấn `Ctrl + H` trên Google Sheet, Tìm: `, "🗺️` $\rightarrow$ Thay thế bằng: `; "🗺️`. |
| **Báo lỗi `CORS error` hoặc không gửi được dữ liệu** | Khi Triển khai (Deploy), mục *"Người có quyền truy cập"* chưa chọn *"Bất kỳ ai"* (*Anyone*). | Mở lại Apps Script $\rightarrow$ **Triển khai** $\rightarrow$ **Quản lý bản triển khai** $\rightarrow$ Bấm biểu tượng ✏️ chỉnh sửa $\rightarrow$ Đổi thành **Bất kỳ ai** (*Anyone*) $\rightarrow$ Bấm **Triển khai lại**. |
| **Không biết tìm link xem Google Sheet ở đâu** | Cần lấy đường link để dán vào ô *Link xem Google Sheet*. | Mở tab Google Sheet $\rightarrow$ Bấm nút **Chia sẻ** góc phải $\rightarrow$ Bấm **Sao chép liên kết** và dán vào ứng dụng. |
| **Khi nào thì dữ liệu tự động gửi lên Sheet?** | Khi chọn chế độ *"Tự động đồng bộ lên Google Sheets"*. | Mọi thao tác lưu mốc trên màn hình Chuyển đổi, GPS hay Bản đồ sẽ tự động đẩy lên Google Sheet ngay khi có mạng. |
