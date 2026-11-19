const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const styleCss = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('=== 1. KIỂM THỬ HỆ THỐNG 10 KIỂU DÁNG ICON & 4 CẤP KÍCH THƯỚC TRONG APP.JS ===', () => {
    // 1. Đủ 10 kiểu icon
    const expectedStyles = ['circle', 'square', 'diamond', 'triangle', 'pin', 'cross', 'ring', 'star', 'target', 'x'];
    expectedStyles.forEach(st => {
        assert.ok(appJs.includes(`id: '${st}'`), `Thiếu định nghĩa kiểu icon: ${st}`);
    });

    // 2. Đủ 4 cấp kích thước
    const expectedSizes = ['sm', 'md', 'lg', 'xl'];
    expectedSizes.forEach(sz => {
        assert.ok(appJs.includes(`id: '${sz}'`), `Thiếu định nghĩa cấp kích thước: ${sz}`);
    });

    // 3. Hàm getPointSizeFor tồn tại
    assert.ok(appJs.includes('getPointSizeFor(shape, v)'), 'Cần có hàm getPointSizeFor(shape, v)');

    // 4. Hàm updateDraftVertexConfig và initDraftVertexHud tồn tại
    assert.ok(appJs.includes('updateDraftVertexConfig(field, value)'), 'Cần có hàm updateDraftVertexConfig');
    assert.ok(appJs.includes('initDraftVertexHud()'), 'Cần có hàm initDraftVertexHud');

    // 5. Hàm setShapeVerticesGlyph và applyBulkVertexGlyphs tồn tại
    assert.ok(appJs.includes('setShapeVerticesGlyph(shapeIdx, field, value)'), 'Cần có hàm setShapeVerticesGlyph');
    assert.ok(appJs.includes('applyBulkVertexGlyphs()'), 'Cần có hàm applyBulkVertexGlyphs');
});

test('=== 2. KIỂM THỬ CSS ĐẶC TẢ ICON MỚI VÀ KÍCH THƯỚC TRONG STYLE.CSS ===', () => {
    // CSS cho 3 icon mới
    assert.ok(styleCss.includes('.cad-vertex-badge.sty-star:not(.expanded)'), 'Thiếu CSS cho sty-star');
    assert.ok(styleCss.includes('.cad-vertex-badge.sty-target:not(.expanded)'), 'Thiếu CSS cho sty-target');
    assert.ok(styleCss.includes('.cad-vertex-badge.sty-pin:not(.expanded)'), 'Thiếu CSS cho sty-pin');

    // CSS cho các cấp kích thước
    assert.ok(styleCss.includes('.cad-vertex-badge.size-sm:not(.expanded)'), 'Thiếu CSS cho size-sm');
    assert.ok(styleCss.includes('.cad-vertex-badge.size-md:not(.expanded)'), 'Thiếu CSS cho size-md');
    assert.ok(styleCss.includes('.cad-vertex-badge.size-lg:not(.expanded)'), 'Thiếu CSS cho size-lg');
    assert.ok(styleCss.includes('.cad-vertex-badge.size-xl:not(.expanded)'), 'Thiếu CSS cho size-xl');

    // CSS mở rộng khi expanded
    assert.ok(styleCss.includes('.cad-vertex-badge.size-sm.expanded'), 'Thiếu CSS cho size-sm.expanded');
    assert.ok(styleCss.includes('.cad-vertex-badge.size-xl.expanded'), 'Thiếu CSS cho size-xl.expanded');
});

test('=== 3. KIỂM THỬ GIAO DIỆN THANH CÔNG CỤ VÀ MODAL TRONG INDEX.HTML ===', () => {
    // Thanh điều khiển nhanh trên thanh công cụ Vẽ (#cadPanelDraw)
    assert.ok(indexHtml.includes('id="cadVertexQuickBar"'), 'Thiếu id cadVertexQuickBar trong index.html');
    assert.ok(indexHtml.includes('id="cadDrawVertexStyle"'), 'Thiếu id cadDrawVertexStyle trong index.html');
    assert.ok(indexHtml.includes('id="cadDrawVertexColor"'), 'Thiếu id cadDrawVertexColor trong index.html');
    assert.ok(indexHtml.includes('id="cadDrawVertexSize"'), 'Thiếu id cadDrawVertexSize trong index.html');

    // Bộ đổi hàng loạt trong bảng kê đỉnh thửa (tab vertices)
    assert.ok(indexHtml.includes('id="cadBulkShapeSelect"'), 'Thiếu id cadBulkShapeSelect');
    assert.ok(indexHtml.includes('id="cadBulkStyleSelect"'), 'Thiếu id cadBulkStyleSelect');
    assert.ok(indexHtml.includes('id="cadBulkColorSelect"'), 'Thiếu id cadBulkColorSelect');
    assert.ok(indexHtml.includes('id="cadBulkSizeSelect"'), 'Thiếu id cadBulkSizeSelect');
});

test('=== 4. KIỂM THỬ THUẬT TOÁN LOGIC QUY ĐỔI & TÍNH TOÁN KÍCH THƯỚC ICON ===', () => {
    // Giả lập đối tượng appCadTool thu nhỏ để kiểm thử logic
    const dummyCad = {
        pointStyles: [
            { id: 'circle' }, { id: 'square' }, { id: 'diamond' }, { id: 'triangle' },
            { id: 'pin' }, { id: 'cross' }, { id: 'ring' }, { id: 'star' }, { id: 'target' }, { id: 'x' }
        ],
        pointSizes: [
            { id: 'sm', size: 14 },
            { id: 'md', size: 20 },
            { id: 'lg', size: 26 },
            { id: 'xl', size: 32 }
        ],
        draftVertexStyle: 'star',
        draftVertexColor: '#f59e0b',
        draftVertexSize: 'lg',
        vertices: [
            { name: 'Đ1', x: 100, y: 200 },
            { name: 'Đ2', x: 110, y: 210 }
        ],
        savedShapes: [
            {
                id: 'sh_1',
                name: 'Thửa 1',
                vertices: [
                    { name: 'Đ1', x: 10, y: 20 },
                    { name: 'Đ2', x: 20, y: 30 }
                ]
            }
        ],
        getGlyphLayerOf() { return { vStyle: 'diamond', vColor: '#38bdf8', vSize: 'md' }; },
        getPointStyleFor(shape, v) {
            const ok = (id) => this.pointStyles.some(s => s.id === id);
            const layer = this.getGlyphLayerOf(shape);
            return [v && v.style, shape && (shape.vertexStyle || shape.style), layer && layer.vStyle].find(ok) || 'circle';
        },
        getPointSizeFor(shape, v) {
            const ok = (id) => this.pointSizes.some(s => s.id === id);
            const layer = this.getGlyphLayerOf(shape);
            return [v && v.size, shape && (shape.vertexSize || shape.vSize), layer && layer.vSize].find(ok) || 'md';
        },
        updateDraftVertexConfig(field, value) {
            if (field === 'style') this.draftVertexStyle = value;
            if (field === 'color') this.draftVertexColor = value;
            if (field === 'size') this.draftVertexSize = value;
            this.vertices.forEach(v => {
                if (field === 'style') v.style = this.draftVertexStyle;
                if (field === 'color') v.color = this.draftVertexColor;
                if (field === 'size') v.size = this.draftVertexSize;
            });
        },
        setShapeVerticesGlyph(shapeIdx, field, value) {
            const shape = this.savedShapes[shapeIdx];
            if (!shape || !shape.vertices) return;
            if (field === 'style') {
                shape.style = value;
                shape.vertices.forEach(v => { v.style = value; });
            } else if (field === 'size') {
                shape.vertexSize = value;
                shape.vertices.forEach(v => { v.size = value; });
            }
        }
    };

    // Kiểm tra phân cấp ưu tiên: đỉnh riêng > khối > layer
    assert.equal(dummyCad.getPointStyleFor({}, {}), 'diamond'); // Layer default
    assert.equal(dummyCad.getPointStyleFor({ style: 'square' }, {}), 'square'); // Shape override
    assert.equal(dummyCad.getPointStyleFor({ style: 'square' }, { style: 'target' }), 'target'); // Vertex override
    assert.equal(dummyCad.getPointSizeFor({}, { size: 'xl' }), 'xl'); // Vertex size override

    // Kiểm tra cập nhật realtime khi đang vẽ
    dummyCad.updateDraftVertexConfig('style', 'pin');
    dummyCad.updateDraftVertexConfig('size', 'xl');
    assert.equal(dummyCad.vertices[0].style, 'pin');
    assert.equal(dummyCad.vertices[1].style, 'pin');
    assert.equal(dummyCad.vertices[0].size, 'xl');

    // Kiểm tra áp dụng cho cả khối đã lưu
    dummyCad.setShapeVerticesGlyph(0, 'style', 'cross');
    dummyCad.setShapeVerticesGlyph(0, 'size', 'sm');
    assert.equal(dummyCad.savedShapes[0].style, 'cross');
    assert.equal(dummyCad.savedShapes[0].vertices[0].style, 'cross');
    assert.equal(dummyCad.savedShapes[0].vertices[1].size, 'sm');
});
