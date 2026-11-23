// v2.8.55: mọi định dạng hình (PDF / PNG / ảnh nén / SVG) và DWG dùng CHUNG một bố cục khổ giấy,
// lớp bản đồ đã chọn áp đúng từng lần xuất, các ô "Lưới tọa độ / Kim Bắc / Khung tên / Ghi chú" có tác dụng.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pdf = app.slice(app.indexOf('    exportPdf(opts = {}) {'), app.indexOf('    _drawExportMapLayersRaster('));

test('không nhớ lớp bản đồ / định dạng của lần xuất trước', () => {
    assert.ok(!app.includes('_lastExportPdfOpts'));
    assert.ok(pdf.includes("bm => this.exportPdf(Object.assign({}, opts, { basemap: bm || { none: true } }))"));
    assert.ok(pdf.includes("needLib('jspdf', () => this.exportPdf(opts))"), 'chờ thư viện xong vẫn giữ đúng tùy chọn');
});

test('PDF, PNG, ảnh nén, SVG đi qua một bộ vẽ; xem trước cũng vậy', () => {
    for (const t of ['pdf', 'png', 'image', 'svg', 'preview']) assert.ok(pdf.includes(`target === '${t}'`), t);
    assert.match(app, /exportPng\(opts = \{\}\) \{[\s\S]{0,200}target: 'png'/);
    assert.match(app, /exportSvg\(opts = \{\}\) \{\s*return this\.exportPdf\(Object\.assign\(\{\}, opts, \{ target: 'svg' \}\)\);/);
    assert.ok(pdf.includes('new window.SvgCanvas.Context({ width: W_px, height: H_px })'));
    assert.ok(pdf.includes('width="${meta.paperW}mm" height="${meta.paperH}mm"'), 'SVG đúng khổ giấy theo mm');
    assert.match(app, /svgcanvas: \{ src: 'vendor\/svgcanvas\/svgcanvas\.js'/);
    assert.ok(fs.existsSync(path.join(root, 'vendor/svgcanvas/svgcanvas.js')) && fs.existsSync(path.join(root, 'vendor/svgcanvas/LICENSE')));
    assert.ok(sw.includes("'./vendor/svgcanvas/svgcanvas.js'"));
});

test('ô Lưới / Kim Bắc + thước tỷ lệ / Khung tên / Ghi chú có tác dụng ở PDF và DWG', () => {
    for (const id of ['cadExportCheckGrid', 'cadExportCheckNorth', 'cadExportCheckTitleBlock', 'cadExportNotes']) {
        assert.ok(html.includes(`id="${id}"`)); assert.ok(app.includes(`'${id}'`), id);
    }
    const dwg = app.slice(app.indexOf('    exportDwg(opts) {'), app.indexOf('    exportPdf(opts = {}) {'));
    for (const src of [pdf, dwg]) {
        assert.ok(src.includes('if (meta.showGrid !== false) {'));
        assert.ok(src.includes('if (meta.showNorth !== false) {'));
        assert.ok(src.includes('if (meta.showTitleBlock !== false) {'));
        assert.ok(src.includes('const segM = nice.find('), 'thước tỷ lệ');
        assert.ok(src.includes('meta.notes'));
    }
    assert.ok(dwg.includes('exportRasterLayerNames(meta)'), 'DWG báo rõ lớp ảnh không nhúng được');
});

test('"Xuất dữ liệu" dùng chung bộ vẽ MiniCAD cho PDF / PNG / SVG / DWG', () => {
    const pay = app.slice(app.indexOf('    _cadExportPayload(ptsIn) {'), app.indexOf('    exportPdfFile() {'));
    assert.ok(pay.includes('appCadTool.shapesFromTaggedPoints('));
    assert.ok(pay.includes('showGrid: ly.grid !== false') && pay.includes('showNorth: ly.north !== false') && pay.includes('showTitleBlock: ly.frame !== false'));
    assert.ok(pay.includes("if (target === 'dwg') return appCadTool.exportDwg(pl);"));
    assert.ok(html.includes('id="selExportSummaryTables"'));
});

test('hộp thoại xuất: khối xem trước không bị ép mất; điện thoại gọn', () => {
    const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
    assert.ok(css.includes('.modal-export-box .modal-body > * { flex-shrink: 0; }'));
    assert.ok(css.includes('#cadExportModalSubTitle, #exportModalSubTitle { display: none; }'));
    // xem trước đứng ngay sau bước chọn định dạng
    assert.ok(html.indexOf('id="cadExportAdvancedDetails"') < html.indexOf('BƯỚC 2: TÙY CHỌN TỈ LỆ BẢN ĐỒ & KHỔ GIẤY'));
});
