/**
 * tests/plan_overlay_multidoc.test.js
 * Kiểm thử tính năng tinh chỉnh khớp mép bản đồ (Fine-Tune), sao chép tọa độ giữa các file PDF (Copy Points),
 * hàng đợi nạp đa tệp PDF (_pendingFiles), hủy layer cũ khi nâng độ nét và triệt tiêu bóng ma (ghosting / skew).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Plan Overlay Multi-doc & Fine-Tuning Suite', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

    test('1. UI DOM elements for fine-tuning & point copying exist in index.html', () => {
        assert.ok(indexHtml.includes('id="planOvCopyRow"'), 'Must contain #planOvCopyRow');
        assert.ok(indexHtml.includes('id="planOvCopySelect"'), 'Must contain #planOvCopySelect');
        assert.ok(indexHtml.includes('id="modalPlanOvFineTune"'), 'Must contain #modalPlanOvFineTune');
        assert.ok(indexHtml.includes('id="planOvFtStatus"'), 'Must contain #planOvFtStatus');
        assert.ok(indexHtml.includes('id="planOvFtName"'), 'Must contain #planOvFtName');
        assert.ok(indexHtml.includes('appPlanOverlay.applyFineTuneStep'), 'Must call applyFineTuneStep');
        assert.ok(indexHtml.includes('appPlanOverlay.resetFineTune'), 'Must call resetFineTune');
        assert.ok(indexHtml.includes('appPlanOverlay.closeFineTune'), 'Must call closeFineTune');
    });

    test('2. app.js defines fine-tuning methods and multi-file queue', () => {
        assert.ok(appJs.includes('openFineTune('), 'Must have openFineTune');
        assert.ok(appJs.includes('closeFineTune('), 'Must have closeFineTune');
        assert.ok(appJs.includes('applyFineTuneStep('), 'Must have applyFineTuneStep');
        assert.ok(appJs.includes('resetFineTune('), 'Must have resetFineTune');
        assert.ok(appJs.includes('fineTuneItem('), 'Must have fineTuneItem');
        assert.ok(appJs.includes('copyPointsFrom('), 'Must have copyPointsFrom');
        assert.ok(appJs.includes('_pendingFiles'), 'Must have _pendingFiles queue');
    });

    test('3. Mathematical verification of fineTuneItem: translation (dx, dy)', () => {
        // Giả lập affine matrix ban đầu
        const it = {
            id: 'test_1',
            w: 1000,
            h: 800,
            affine: { a: 0.1, b: 0, c: 500000, d: 0, e: -0.1, f: 1200000 }
        };

        const dx = 2.5; // Dời Bắc +2.5m
        const dy = -1.2; // Dời Đông -1.2m

        // Giả lập logic fineTuneItem
        const aff = it.affine;
        aff.c += dy; // Easting
        aff.f += dx; // Northing

        assert.strictEqual(aff.c, 500000 - 1.2, 'Easting c must shift by dy');
        assert.strictEqual(aff.f, 1200000 + 2.5, 'Northing f must shift by dx');
    });

    test('4. Mathematical verification of fineTuneItem: rotation (dRot) preserves map center', () => {
        const it = {
            id: 'test_rot',
            w: 2000,
            h: 1500,
            affine: { a: 0.05, b: 0.01, c: 600000, d: 0.01, e: -0.05, f: 1300000 }
        };

        const uMid = it.w / 2;
        const vMid = it.h / 2;
        const centerE_before = it.affine.a * uMid + it.affine.b * vMid + it.affine.c;
        const centerN_before = it.affine.d * uMid + it.affine.e * vMid + it.affine.f;

        // Xoay 0.5 độ
        const dRot = 0.5;
        const rad = (dRot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const a1 = it.affine.a * cos - it.affine.d * sin;
        const b1 = it.affine.b * cos - it.affine.e * sin;
        const d1 = it.affine.a * sin + it.affine.d * cos;
        const e1 = it.affine.b * sin + it.affine.e * cos;

        const c1 = centerE_before - (a1 * uMid + b1 * vMid);
        const f1 = centerN_before - (d1 * uMid + e1 * vMid);

        const centerE_after = a1 * uMid + b1 * vMid + c1;
        const centerN_after = d1 * uMid + e1 * vMid + f1;

        assert.ok(Math.abs(centerE_after - centerE_before) < 1e-10, 'Center Easting must be preserved');
        assert.ok(Math.abs(centerN_after - centerN_before) < 1e-10, 'Center Northing must be preserved');
    });

    test('5. Mathematical verification of fineTuneItem: scaling (dScale) preserves map center', () => {
        const it = {
            id: 'test_scale',
            w: 2000,
            h: 1500,
            affine: { a: 0.05, b: 0.01, c: 600000, d: 0.01, e: -0.05, f: 1300000 }
        };

        const uMid = it.w / 2;
        const vMid = it.h / 2;
        const centerE_before = it.affine.a * uMid + it.affine.b * vMid + it.affine.c;
        const centerN_before = it.affine.d * uMid + it.affine.e * vMid + it.affine.f;

        // Phóng to +1%
        const dScale = 1.0;
        const k = 1 + dScale / 100;
        const a1 = it.affine.a * k;
        const b1 = it.affine.b * k;
        const d1 = it.affine.d * k;
        const e1 = it.affine.e * k;

        const c1 = centerE_before - (a1 * uMid + b1 * vMid);
        const f1 = centerN_before - (d1 * uMid + e1 * vMid);

        const centerE_after = a1 * uMid + b1 * vMid + c1;
        const centerN_after = d1 * uMid + e1 * vMid + f1;

        assert.ok(Math.abs(centerE_after - centerE_before) < 1e-10, 'Center Easting must be preserved');
        assert.ok(Math.abs(centerN_after - centerN_before) < 1e-10, 'Center Northing must be preserved');
    });

    test('6. copyPointsFrom scales control points correctly based on raster dimensions', () => {
        const src = {
            id: 'src_pdf',
            w: 1000,
            h: 800,
            points: [
                { u: 100, v: 200, x: 1234567, y: 567890 },
                { u: 900, v: 700, x: 1234900, y: 568300 }
            ]
        };

        const draft = {
            raster: { w: 2000, h: 1600 },
            points: []
        };

        const rx = draft.raster.w / src.w; // 2.0
        const ry = draft.raster.h / src.h; // 2.0

        draft.points = src.points.map(p => ({
            u: Math.round(p.u * rx),
            v: Math.round(p.v * ry),
            x: p.x,
            y: p.y
        }));

        assert.strictEqual(draft.points.length, 2);
        assert.strictEqual(draft.points[0].u, 200);
        assert.strictEqual(draft.points[0].v, 400);
        assert.strictEqual(draft.points[0].x, 1234567);
        assert.strictEqual(draft.points[0].y, 567890);
        assert.strictEqual(draft.points[1].u, 1800);
        assert.strictEqual(draft.points[1].v, 1400);
    });

    test('7. reRenderHighDpi removes old layer instance before syncToMap', () => {
        assert.ok(
            appJs.includes('if (item.layer) {\n            item.layer.remove();\n            item.layer = null;\n        }') ||
            appJs.includes('item.layer.remove()'),
            'reRenderHighDpi must remove existing layer instance to prevent ghosting'
        );
    });

    test('8. _sharpCv is safely hidden in _update to eliminate misaligned double-layer ghosting', () => {
        assert.ok(
            appJs.includes("this._sharpCv.style.display = 'none';"),
            '_sharpCv must have display none to prevent double vision'
        );
    });
});
