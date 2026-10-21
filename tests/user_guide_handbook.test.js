const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('1. Verify user-guide.html exists, valid HTML5 with Be Vietnam Pro & JetBrains Mono typography', () => {
  const guidePath = path.join(__dirname, '..', 'user-guide.html');
  assert.ok(fs.existsSync(guidePath), 'user-guide.html must exist');
  const html = fs.readFileSync(guidePath, 'utf8');

  assert.ok(html.includes('<!DOCTYPE html>'), 'Must be standard HTML5');
  assert.ok(html.includes('Be Vietnam Pro'), 'Must load Be Vietnam Pro font');
  assert.ok(html.includes('JetBrains Mono'), 'Must load JetBrains Mono font');
  assert.ok(html.includes('Cẩm Nang Hướng Dẫn Sử Dụng — VN2000 PRO'), 'Must have proper title');
});

test('2. Verify all 14 core practical field surveying sections exist in user-guide.html', () => {
  const guidePath = path.join(__dirname, '..', 'user-guide.html');
  const html = fs.readFileSync(guidePath, 'utf8');

  const expectedSections = [
    'section-overview',
    'section-transform',
    'section-batch',
    'section-map',
    'section-stakeout',
    'section-datamgmt',
    'section-cad',
    'section-cad_tables',
    'section-profile',
    'section-camera',
    'section-settings_ktt',
    'section-export',
    'section-geodesy',
    'section-settings_storage'
  ];

  expectedSections.forEach(secId => {
    assert.ok(html.includes(`id="${secId}"`), `user-guide.html must include section #${secId}`);
  });
});

test('3. Verify large screen showcase with real high-resolution screenshots & step-by-step instructions', () => {
  const guidePath = path.join(__dirname, '..', 'user-guide.html');
  const html = fs.readFileSync(guidePath, 'utf8');

  // Kiểm tra khung màn hình showcase kích thước lớn
  assert.ok(html.includes('class="guide-screen-showcase"'), 'Must have large screen showcase container');
  assert.ok(html.includes('showcase-callouts-bar'), 'Must have callouts bar explaining numbered controls');
  assert.ok(html.includes('step-number-circle'), 'Must have clear step-by-step number indicators');

  // Kiểm tra sử dụng ảnh thực tế chất lượng cao
  assert.ok(html.includes('desktop_fn1_transform.png'), 'Must include desktop transform screenshot');
  assert.ok(html.includes('desktop_fn5_batch.png'), 'Must include desktop batch screenshot');
  assert.ok(html.includes('desktop_fn2_project.png'), 'Must include desktop project screenshot');
  assert.ok(html.includes('desktop_fn6_cad.png'), 'Must include desktop cad screenshot');
  assert.ok(html.includes('desktop_fn7_profile.png'), 'Must include desktop profile screenshot');

  // Kiểm tra tính năng Lightbox phóng to ảnh và thanh tìm kiếm nhanh
  assert.ok(html.includes('openLightbox'), 'Must provide openLightbox for 100% zoom inspection');
  assert.ok(html.includes('filterGuideTopics'), 'Must provide live instant topic filter');
});

test('4. Verify huong-dan.html redirect exists for smooth URL accessibility', () => {
  const hdPath = path.join(__dirname, '..', 'huong-dan.html');
  assert.ok(fs.existsSync(hdPath), 'huong-dan.html redirect must exist');
  const html = fs.readFileSync(hdPath, 'utf8');
  assert.ok(html.includes('user-guide.html'), 'Must redirect to user-guide.html');
});

test('5. Verify appGuide and index.html integrate the handbook via "?" button and Drawer Menu 5.7', () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Drawer menu 5.7
  assert.ok(indexHtml.includes('id="drawerItem_user_guide"'), 'Drawer must have #drawerItem_user_guide');
  assert.ok(indexHtml.includes("user-guide.html"), 'Drawer must link to user-guide.html');
  assert.ok(!indexHtml.includes('tutorials-pdoom.html'), 'Old tutorials-pdoom.html must be completely purged from index.html');

  // Modal Help Guide button
  assert.ok(indexHtml.includes('btnOpenFullHandbook'), 'Help modal must have #btnOpenFullHandbook');
  assert.ok(indexHtml.includes('appGuide.openFullUserGuide()'), 'Button must call appGuide.openFullUserGuide()');

  // app.js appGuide method
  const appJsPath = path.join(__dirname, '..', 'app.js');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  assert.ok(appJs.includes('openFullUserGuide(guideKey)'), 'appGuide must implement openFullUserGuide method');
  assert.ok(appJs.includes('user-guide.html#'), 'openFullUserGuide must navigate to anchored section in user-guide.html');
});
