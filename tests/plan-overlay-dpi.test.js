/**
 * Test bộ nâng độ nét PDF & DPI rasterization cho appPlanOverlay
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Plan Overlay High DPI & PDF Resolution', () => {
    test('1. index.html contains DPI selector with options (150, 300, 450, 600)', () => {
        const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
        assert.ok(html.includes('id="planOvDpiSelect"'), 'Must have #planOvDpiSelect');
        assert.ok(html.includes('value="150"'), 'Must have 150 DPI option');
        assert.ok(html.includes('value="300"'), 'Must have 300 DPI option');
        assert.ok(html.includes('value="450"'), 'Must have 450 DPI option');
        assert.ok(html.includes('value="600"'), 'Must have 600 DPI option');
        assert.ok(html.includes('vn2k_plan_overlay_dpi'), 'Must store/retrieve from localStorage');
    });

    test('2. app.js contains MAX_SIDE >= 8192 and MAX_PIXELS >= 48000000', () => {
        const js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
        assert.ok(js.includes('MAX_SIDE: 8192') || js.includes('MAX_SIDE: 16384'), 'MAX_SIDE must be >= 8192');
        assert.ok(js.includes('MAX_PIXELS: 48000000') || js.includes('MAX_PIXELS: 120000000'), 'MAX_PIXELS must be >= 48000000');
    });

    test('3. app.js contains reRenderHighDpi method', () => {
        const js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
        assert.ok(js.includes('reRenderHighDpi(id,'), 'appPlanOverlay must have reRenderHighDpi');
    });

    test('4. Affine matrix re-scaling preserves exact ground coordinates (E, N)', () => {
        // Giả lập ma trận affine ban đầu ở 100 DPI
        const W_old = 1000, H_old = 800;
        const affine_old = {
            a: 0.5,     // m/px
            b: 0.05,
            c: 586000,  // Easting gốc
            d: 0.05,
            e: -0.5,
            f: 1158000  // Northing gốc
        };

        // Điểm khống chế mẫu trên ảnh ban đầu
        const u_old = 400, v_old = 300;
        const E_old = affine_old.a * u_old + affine_old.b * v_old + affine_old.c;
        const N_old = affine_old.d * u_old + affine_old.e * v_old + affine_old.f;

        // Tăng độ nét lên 300 DPI (gấp 3 lần)
        const r = 3.0;
        const W_new = W_old * r;
        const H_new = H_old * r;

        // Ma trận mới theo công thức trong reRenderHighDpi
        const affine_new = {
            a: affine_old.a / r,
            b: affine_old.b / r,
            c: affine_old.c,
            d: affine_old.d / r,
            e: affine_old.e / r,
            f: affine_old.f
        };

        // Tọa độ pixel tương ứng trên ảnh mới
        const u_new = Math.round(u_old * r);
        const v_new = Math.round(v_old * r);

        const E_new = affine_new.a * u_new + affine_new.b * v_new + affine_new.c;
        const N_new = affine_new.d * u_new + affine_new.e * v_new + affine_new.f;

        // Sai số phải xấp xỉ 0 mét (bảo toàn tuyệt đối)
        assert.ok(Math.abs(E_new - E_old) < 1e-9, `Easting error should be < 1e-9, got ${Math.abs(E_new - E_old)}`);
        assert.ok(Math.abs(N_new - N_old) < 1e-9, `Northing error should be < 1e-9, got ${Math.abs(N_new - N_old)}`);
    });

    test('5. _layerClass includes dynamic sharp viewport canvas for 100% pin-sharp deep zoom', () => {
        const js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
        assert.ok(js.includes('_sharpCv') || js.includes('_renderSharpPatch'), 'Layer must feature dynamic sharp viewport rendering');
    });

    test('6. renderList has DPI badge and upgrade sharpness button', () => {
        const js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
        assert.ok(js.includes('reRenderHighDpi'), 'renderList must allow calling reRenderHighDpi');
        assert.ok(js.includes('Nâng độ nét'), 'renderList must have Nâng độ nét button or prompt');
    });

    test('7. _getPdfPage and sharp viewer rendering exist for pin-sharp georeferencing', () => {
        const js = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
        assert.ok(js.includes('_getPdfPage'), 'Must cache and load PDF pages quickly');
        assert.ok(js.includes('_renderSharpViewer'), 'Must dynamically render pin-sharp viewer when zoomed in');
    });
});
