const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');

// Setup mock DOM
global.document = {
    getElementById: (id) => {
        if (!global._mockElements) global._mockElements = {};
        if (!global._mockElements[id]) {
            global._mockElements[id] = {
                id,
                style: {},
                classList: {
                    _classes: new Set(),
                    add(c) { this._classes.add(c); },
                    remove(c) { this._classes.delete(c); },
                    contains(c) { return this._classes.has(c); }
                },
                value: id === 'wkThresholdSlider' ? '28' : (id === 'wkRadiusSlider' ? '5' : (id === 'wkGridStepSelect' ? '256' : '')),
                textContent: '',
                getContext: () => ({
                    getImageData: (x, y, w, h) => ({
                        data: new Uint8ClampedArray(w * h * 4)
                    }),
                    putImageData: () => {},
                    clearRect: () => {},
                    strokeRect: () => {},
                    fillRect: () => {},
                    setLineDash: () => {},
                    drawImage: () => {}
                }),
                addEventListener: () => {},
                getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 400 })
            };
        }
        return global._mockElements[id];
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    documentElement: {},
    body: {}
};
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.showToast = () => {};

// Nạp geodesy, georef và app.js
const geo = require('../geodesy.js');
Object.assign(global, geo);
const Georef = require('../src/core/georef.js');
global.Georef = Georef;
require('../src/core/planning_map.js');
if (global.window && global.window.appPlanning) global.appPlanning = global.window.appPlanning;
const { appPlanOverlay } = require('../app.js');

test('1. index.html contains all watermark cleaning UI elements and modal', () => {
    assert.ok(html.includes('id="modalPlanWatermarkClean"'), 'Should have modalPlanWatermarkClean');
    assert.ok(html.includes('id="btnWkModeAuto"'), 'Should have btnWkModeAuto');
    assert.ok(html.includes('id="btnWkModeBox"'), 'Should have btnWkModeBox');
    assert.ok(html.includes('id="btnWkModeGrid"'), 'Should have btnWkModeGrid');
    assert.ok(html.includes('id="wkThresholdSlider"'), 'Should have wkThresholdSlider');
    assert.ok(html.includes('id="wkRadiusSlider"'), 'Should have wkRadiusSlider');
    assert.ok(html.includes('id="wkGridStepSelect"'), 'Should have wkGridStepSelect');
    assert.ok(html.includes('id="wkCanvasClean"'), 'Should have wkCanvasClean');
    assert.ok(html.includes('id="wkCanvasOverlay"'), 'Should have wkCanvasOverlay');
    assert.ok(html.includes('id="wkStatusText"'), 'Should have wkStatusText');
});

test('2. appPlanOverlay contains all necessary watermark cleaner methods', () => {
    assert.strictEqual(typeof appPlanOverlay.openWatermarkCleaner, 'function');
    assert.strictEqual(typeof appPlanOverlay.closeWatermarkCleaner, 'function');
    assert.strictEqual(typeof appPlanOverlay.setWkMode, 'function');
    assert.strictEqual(typeof appPlanOverlay.inpaintBox, 'function');
    assert.strictEqual(typeof appPlanOverlay.applyAutoWatermarkSuppression, 'function');
    assert.strictEqual(typeof appPlanOverlay.applyGridMaskInpaint, 'function');
    assert.strictEqual(typeof appPlanOverlay.undoWkClean, 'function');
    assert.strictEqual(typeof appPlanOverlay.restoreWkOriginal, 'function');
    assert.strictEqual(typeof appPlanOverlay.saveCleanedImage, 'function');
});

test('3. setWkMode correctly switches active mode and updates UI controls', () => {
    appPlanOverlay.setWkMode('box');
    assert.strictEqual(appPlanOverlay._wkMode, 'box');
    assert.strictEqual(document.getElementById('wkWarpControlsBox').style.display, 'flex');
    assert.strictEqual(document.getElementById('wkWarpControlsAuto').style.display, 'none');

    appPlanOverlay.setWkMode('grid');
    assert.strictEqual(appPlanOverlay._wkMode, 'grid');
    assert.strictEqual(document.getElementById('wkWarpControlsGrid').style.display, 'flex');
    assert.strictEqual(document.getElementById('wkWarpControlsBox').style.display, 'none');

    appPlanOverlay.setWkMode('auto');
    assert.strictEqual(appPlanOverlay._wkMode, 'auto');
    assert.strictEqual(document.getElementById('wkWarpControlsAuto').style.display, 'flex');
});

test('4. inpaintBox computes border average color and fills the bounding box', () => {
    const w = 20, h = 20;
    const canvas = document.getElementById('wkCanvasClean');
    canvas.width = w;
    canvas.height = h;

    // Giả lập pixel: nền xanh lá đậm rgb(30, 150, 40), vùng giữa có chữ trắng mờ rgb(200, 240, 200)
    const buffer = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (x >= 5 && x <= 10 && y >= 5 && y <= 10) {
                // Vùng chữ Guland
                buffer[idx] = 200;
                buffer[idx + 1] = 240;
                buffer[idx + 2] = 200;
                buffer[idx + 3] = 255;
            } else {
                // Vùng nền quy hoạch
                buffer[idx] = 30;
                buffer[idx + 1] = 150;
                buffer[idx + 2] = 40;
                buffer[idx + 3] = 255;
            }
        }
    }

    let putImageCalled = false;
    let putData = null;
    let targetX = 0, targetY = 0;

    canvas.getContext = () => ({
        getImageData: (sx, sy, sw, sh) => {
            const crop = new Uint8ClampedArray(sw * sh * 4);
            for (let cy = 0; cy < sh; cy++) {
                for (let cx = 0; cx < sw; cx++) {
                    const srcIdx = ((sy + cy) * w + (sx + cx)) * 4;
                    const dstIdx = (cy * sw + cx) * 4;
                    crop[dstIdx] = buffer[srcIdx];
                    crop[dstIdx + 1] = buffer[srcIdx + 1];
                    crop[dstIdx + 2] = buffer[srcIdx + 2];
                    crop[dstIdx + 3] = buffer[srcIdx + 3];
                }
            }
            return { data: crop, width: sw, height: sh };
        },
        putImageData: (imgData, dx, dy) => {
            putImageCalled = true;
            putData = imgData;
            targetX = dx;
            targetY = dy;
        }
    });

    appPlanOverlay._wkHistory = [];
    appPlanOverlay.inpaintBox(5, 5, 10, 10);

    assert.ok(putImageCalled, 'putImageData should have been called');
    assert.strictEqual(targetX, 5);
    assert.strictEqual(targetY, 5);
    // Màu sau khi inpaint phải gần với màu nền rgb(30, 150, 40)
    assert.ok(putData.data[0] < 50, `Red should be around 30, got ${putData.data[0]}`);
    assert.ok(putData.data[1] > 120, `Green should be around 150, got ${putData.data[1]}`);
    assert.ok(putData.data[2] < 60, `Blue should be around 40, got ${putData.data[2]}`);
});

test('5. applyAutoWatermarkSuppression suppresses bright watermark pixels on planning basemap', () => {
    const w = 30, h = 30;
    const canvas = document.getElementById('wkCanvasClean');
    canvas.width = w;
    canvas.height = h;

    // Ảnh nền đất ở ODT: màu hồng nhạt rgb(240, 160, 160)
    // Chữ chìm Guland: mờ trắng sáng rgb(255, 235, 235)
    const buffer = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (x >= 12 && x <= 16 && y >= 12 && y <= 16) {
                // Pixel watermark
                buffer[idx] = 255;
                buffer[idx + 1] = 235;
                buffer[idx + 2] = 235;
                buffer[idx + 3] = 255;
            } else {
                // Pixel nền quy hoạch
                buffer[idx] = 240;
                buffer[idx + 1] = 160;
                buffer[idx + 2] = 160;
                buffer[idx + 3] = 255;
            }
        }
    }

    let modifiedImgData = null;
    canvas.getContext = () => ({
        getImageData: () => ({ data: buffer, width: w, height: h }),
        putImageData: (imgData) => {
            modifiedImgData = imgData;
        }
    });

    document.getElementById('wkThresholdSlider').value = '20';
    document.getElementById('wkRadiusSlider').value = '4';

    appPlanOverlay._wkHistory = [];
    appPlanOverlay.applyAutoWatermarkSuppression();

    assert.ok(modifiedImgData, 'putImageData should be called after auto suppression');
    // Kiểm tra pixel tâm (14, 14) đã được kéo về màu nền hồng nhạt (green ~160 thay vì 235)
    const centerIdx = (14 * w + 14) * 4;
    assert.ok(modifiedImgData.data[centerIdx + 1] <= 180, `Watermark green suppressed, got ${modifiedImgData.data[centerIdx + 1]}`);
});

