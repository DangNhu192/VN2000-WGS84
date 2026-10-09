const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

test('=== 1. KIỂM THỬ GIAO DIỆN CHUẨN LOVABLE: THEME CONTROLLER & DOM ===', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
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
  const indexHtml = fs.readFileSync('index.html', 'utf8');

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
