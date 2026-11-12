// Camera: tab "Đóng dấu" (ảnh chọn từ máy) dùng sai số danh định ngẫu nhiên ±2–4 m; tab "Chụp ảnh"/video giữ sai số thật.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function method(name) {
    const i = app.indexOf(`    ${name}(`, app.indexOf('const appCamera = {'));
    assert.ok(i > 0, name);
    let depth = 0, j = app.indexOf(') {', i) + 2;
    for (; j < app.length; j++) { if (app[j] === '{') depth++; else if (app[j] === '}' && --depth === 0) break; }
    return app.slice(i, j + 1);
}

test('sai số danh định luôn trong khoảng ±2.0–4.0 m, một chữ số lẻ', () => {
    const fn = new Function('return {' + method('nominalStampAccuracy') + '}')();
    for (const r of [0, 0.25, 0.5, 0.999999]) {
        const t = fn.nominalStampAccuracy(() => r);
        const v = Number(t.replace(/[±m]/g, ''));
        assert.match(t, /^±\d\.\dm$/);
        assert.ok(v >= 2 && v <= 4, t);
    }
});

test('chỉ ảnh chọn từ máy dùng sai số danh định; chụp ảnh, xem trực tiếp và quay video giữ sai số thật', () => {
    const upload = method('renderWatermarkOnCanvas');
    assert.ok(upload.includes('const stampOpts = { accuracyText: this.nominalStampAccuracy() };'));
    assert.ok(upload.includes('this.drawWatermark(ctx, targetW, targetH, this.watermarkCorner, stampOpts);'));
    assert.ok(upload.includes('this.getWatermarkData(stampOpts)'), 'Thông tin lưu thư viện khớp với dấu trên ảnh');
    for (const name of ['captureLivePhoto', 'startVideoRecording', 'startHudLoop']) {
        const i = app.indexOf(`    ${name}(`, app.indexOf('const appCamera = {'));
        if (i < 0) continue;
        assert.ok(!method(name).includes('nominalStampAccuracy'), `${name} giữ sai số thật`);
    }
    assert.ok(method('getWatermarkData').includes('AppState.lastGps.accuracy'), 'Mặc định vẫn là sai số thật của GPS');
});
