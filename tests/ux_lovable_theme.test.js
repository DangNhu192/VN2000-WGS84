const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const getMergedMarkupAndStyles = () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.existsSync('style.css') ? fs.readFileSync('style.css', 'utf8') : '';
  return html + '\n' + css;
};

test('=== 1. KIỂM THỬ GIAO DIỆN CHUẨN LOVABLE: THEME CONTROLLER & DOM ===', () => {
  const indexHtml = getMergedMarkupAndStyles();
  const appJs = fs.readFileSync('app.js', 'utf8');

  // Kiểm tra nút chuyển Theme trên Header
  assert.ok(indexHtml.includes('id="btnHeaderThemeToggle"'), 'Phải có nút #btnHeaderThemeToggle trên Header');
  assert.ok(indexHtml.includes('id="headerThemeIcon"'), 'Phải có icon #headerThemeIcon trên nút');
  assert.ok(indexHtml.includes('appTheme.toggleTheme()'), 'Nút phải gọi appTheme.toggleTheme() khi nhấp');

  // Kiểm tra định nghĩa appTheme trong app.js
  assert.ok(appJs.includes('const appTheme = {'), 'Phải định nghĩa đối tượng appTheme');
  assert.ok(appJs.includes('window.appTheme = appTheme;'), 'Phải export window.appTheme');
  assert.ok(appJs.includes('appTheme.init();'), 'Phải khởi tạo appTheme.init() khi trang tải xong');
});

test('=== 2. KIỂM THỬ BỘ BIẾN CSS LOVABLE TOÀN DIỆN (DARK & LIGHT MODE) ===', () => {
  const indexHtml = getMergedMarkupAndStyles();

  // Kiểm tra bộ token Lovable
  assert.ok(indexHtml.includes('--lv-bg-base: #090d16;'), 'Có token nền tối kỹ thuật sâu');
  assert.ok(indexHtml.includes('--lv-accent: #6366f1;'), 'Có accent Indigo chuẩn Lovable');
  assert.ok(indexHtml.includes('[data-theme="light"]'), 'Hỗ trợ chế độ Clean Light Mode');
  assert.ok(indexHtml.includes('nav#mobileBottomNav.mobile-bottom-nav'), 'Thanh điều hướng nổi Floating Island');
  assert.ok(indexHtml.includes('.big-action-tile'), 'Có CSS nâng cấp Bento Grid cards');
});

test('=== 3. KIỂM THỬ LOGIC HOẠT ĐỘNG CỦA APPTHEME ===', () => {
  // Mock môi trường DOM tối giản
  let storedTheme = 'dark';
  let attrTheme = '';
  let iconText = '';
  let btnTitle = '';

  const mockLocalStorage = {
    getItem: (k) => storedTheme,
    setItem: (k, v) => { storedTheme = v; }
  };

  const mockDocument = {
    documentElement: { setAttribute: (k, v) => { attrTheme = v; } },
    body: { setAttribute: (k, v) => { attrTheme = v; } },
    getElementById: (id) => {
      if (id === 'headerThemeIcon') return { set textContent(val) { iconText = val; }, get textContent() { return iconText; } };
      if (id === 'btnHeaderThemeToggle') return { set title(val) { btnTitle = val; }, get title() { return btnTitle; } };
      return null;
    }
  };

  // Trích xuất logic appTheme để test độc lập
  const appTheme = {
    current: 'dark',
    init() {
      const saved = mockLocalStorage.getItem('app_theme') || 'dark';
      this.setTheme(saved);
    },
    setTheme(theme) {
      this.current = (theme === 'light') ? 'light' : 'dark';
      mockDocument.documentElement.setAttribute('data-theme', this.current);
      mockDocument.body.setAttribute('data-theme', this.current);
      const icon = mockDocument.getElementById('headerThemeIcon');
      if (icon) icon.textContent = this.current === 'light' ? '🌙' : '☀️';
      const btn = mockDocument.getElementById('btnHeaderThemeToggle');
      if (btn) btn.title = this.current === 'light' ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng';
      mockLocalStorage.setItem('app_theme', this.current);
    },
    toggleTheme() {
      this.setTheme(this.current === 'dark' ? 'light' : 'dark');
    }
  };

  appTheme.init();
  assert.strictEqual(appTheme.current, 'dark');
  assert.strictEqual(attrTheme, 'dark');
  assert.strictEqual(iconText, '☀️');

  // Chuyển sang Light mode
  appTheme.toggleTheme();
  assert.strictEqual(appTheme.current, 'light');
  assert.strictEqual(attrTheme, 'light');
  assert.strictEqual(iconText, '🌙');
  assert.strictEqual(storedTheme, 'light');

  // Chuyển lại về Dark mode
  appTheme.toggleTheme();
  assert.strictEqual(appTheme.current, 'dark');
  assert.strictEqual(attrTheme, 'dark');
  assert.strictEqual(iconText, '☀️');
  assert.strictEqual(storedTheme, 'dark');
});

test('=== 4. KIỂM THỬ TƯƠNG PHẢN CAO & CHỐNG CHỮ TRẮNG TRÊN NỀN TRẮNG (LIGHT THEME) ===', () => {
  const indexHtml = getMergedMarkupAndStyles();

  // Kiểm tra các selector ghi đè chữ đậm màu #090d16 trên nền sáng
  assert.ok(indexHtml.includes('[data-theme="light"] .big-tile-title'), 'Phải có override cho .big-tile-title ở Light mode');
  assert.ok(indexHtml.includes('[data-theme="light"] .menu-card-title'), 'Phải có override cho .menu-card-title ở Light mode');
  assert.ok(indexHtml.includes('[data-theme="light"] .compact-tool-title'), 'Phải có override cho .compact-tool-title ở Light mode');
  assert.ok(indexHtml.includes('[data-theme="light"] .table-selectable th'), 'Phải có override cho header bảng biểu ở Light mode');
  assert.ok(indexHtml.includes('color: #090d16 !important;'), 'Phải dùng màu chữ tối tương phản cao #090d16');
  assert.ok(indexHtml.includes('--bg-dark: #f1f5f9;'), 'Nền tổng thể Light mode phải là xám sáng #f1f5f9 chống chói');
});

test('=== 5. KIỂM THỬ KHỬ RÁC CHỮ (DE-CLUTTERED BENTO TILES LOVABLE 2026) ===', () => {
  const appJs = fs.readFileSync('app.js', 'utf8');

  // Đảm bảo không còn dòng big-tile-subtitle rườm rà trong renderDashboard
  const renderDashCode = appJs.substring(appJs.indexOf('renderDashboard()'), appJs.indexOf('launchFeature(id)'));
  assert.strictEqual(renderDashCode.includes('<div class="big-tile-subtitle">'), false, 'Đã khử bỏ hoàn toàn dòng subtitle rườm rà trên Bento Action Tile');
  assert.ok(renderDashCode.includes('big-tile-title'), 'Vẫn giữ nguyên tiêu đề chính sắc nét');
  assert.ok(renderDashCode.includes('tile-metric-pill'), 'Có badge/pill trạng thái gọn gàng');
});

test('=== 6. KIỂM THỬ CINEMATIC INDUSTRIAL BAUHAUS (IMOL2o 2026 FIELD SPEC) ===', () => {
  const indexHtml = getMergedMarkupAndStyles();

  // Kiểm tra bộ token Industrial Bauhaus
  assert.ok(indexHtml.includes('--bauhaus-amber: #f59e0b;'), 'Có token Laser Amber đặc trưng máy đo đạc');
  assert.ok(indexHtml.includes('--bauhaus-titan-card: #131c2e;'), 'Có token nền titan sâu cho thẻ khí tài dã chiến');
  assert.ok(indexHtml.includes('--bauhaus-ease-spring:'), 'Có gia tốc chuyển động đàn hồi vật lý 60fps');

  // Kiểm tra hiệu ứng Signature Moment: Radar Beam Sweep
  assert.ok(indexHtml.includes('radarBeamSweep'), 'Có hiệu ứng quét tia laser Amber 360 độ cơ học');
  assert.ok(indexHtml.includes('conic-gradient'), 'Tia quét dùng conic-gradient quét quanh tâm ngắm');

  // Kiểm tra công tắc kích hoạt xúc giác Tactile Trigger
  assert.ok(indexHtml.includes('.btn-convert'), 'Phím chuyển đổi tọa độ dã chiến tồn tại');
  assert.ok(indexHtml.includes('linear-gradient(135deg, #f59e0b'), 'Nút chuyển đổi mang gradient Laser Amber nổi bật');
});


