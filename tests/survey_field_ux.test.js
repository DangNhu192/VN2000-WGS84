const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

test('=== 1. KIỂM THỬ BOTTOM NAVIGATION: THAY MINICAD BẰNG SỔ ĐO ===', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const appJs = fs.readFileSync('app.js', 'utf8');

  // Kiểm tra 5 nút chuẩn trên Bottom Nav
  assert.ok(indexHtml.includes('id="bnavMenu"'), 'Có nút Trang chủ');
  assert.ok(indexHtml.includes('id="bnavTransform"'), 'Có nút Chuyển đổi');
  assert.ok(indexHtml.includes('id="bnavMap"'), 'Có nút Bản đồ');
  assert.ok(indexHtml.includes('id="bnavStakeout"'), 'Có nút Cắm mốc');
  assert.ok(indexHtml.includes('id="bnavDataMgmt"'), 'Có nút Sổ đo thay cho MiniCAD');
  
  // Đảm bảo không còn nút bnavCad trên Bottom Nav
  const bnavStart = indexHtml.indexOf('<nav id="mobileBottomNav"');
  const bnavEnd = indexHtml.indexOf('</nav>', bnavStart);
  const bnavHtml = indexHtml.substring(bnavStart, bnavEnd);
  assert.strictEqual(bnavHtml.includes('id="bnavCad"'), false, 'Đã loại bỏ hoàn toàn nút MiniCAD khỏi thanh Bottom Nav');

  // Kiểm tra hàm syncBottomNav trong app.js
  assert.ok(appJs.includes("'datamgmt': 'bnavDataMgmt'"), 'syncBottomNav ánh xạ datamgmt sang bnavDataMgmt');
});

test('=== 2. KIỂM THỬ 4 TÁC VỤ CỐT LÕI TRANG CHỦ & CÔ LẬP MINICAD ===', () => {
  const appJs = fs.readFileSync('app.js', 'utf8');

  // Kiểm tra hàm getPinnedFeatureIds trả về 4 chức năng cốt lõi thực địa
  assert.ok(appJs.includes("return ['transform', 'map', 'stakeout', 'datamgmt'];"), 'Mặc định 4 tác vụ cốt lõi là Chuyển đổi, Bản đồ, Cắm mốc, Sổ đo');

  // Kiểm tra allFeatures
  const allFeaturesIdx = appJs.indexOf('allFeatures: [');
  const allFeaturesEnd = appJs.indexOf('toolFilterQuery:', allFeaturesIdx);
  const featuresText = appJs.substring(allFeaturesIdx, allFeaturesEnd);
  
  assert.ok(featuresText.includes("id: 'transform'"), 'Có tác vụ Chuyển đổi');
  assert.ok(featuresText.includes("id: 'map'"), 'Có tác vụ Bản đồ');
  assert.ok(featuresText.includes("id: 'stakeout'"), 'Có tác vụ Cắm mốc');
  assert.ok(featuresText.includes("id: 'datamgmt'"), 'Có tác vụ Sổ đo');
  assert.ok(featuresText.includes("id: 'cad_tool'"), 'MiniCAD tồn tại độc lập như một tiện ích phụ trợ');
});
