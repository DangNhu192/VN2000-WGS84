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
      // Khóa dự phòng không có khối
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
