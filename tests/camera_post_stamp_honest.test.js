// Camera, tab "Đóng dấu" (ảnh chọn từ máy): dấu ghi rõ "đóng dấu sau", giờ chụp gốc từ EXIF, "Sai số: không đo".
// Tab "Chụp ảnh", khung xem trực tiếp và quay video giữ sai số GPS thật và giờ thực địa.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

function slice(sig, from = 0) {
    const i = app.indexOf(sig, from); assert.ok(i >= 0, sig);
    let d = 0, j = app.indexOf(') {', i) + 2;
    for (; j < app.length; j++) { if (app[j] === '{') d++; else if (app[j] === '}' && --d === 0) break; }
    return app.slice(i, j + 1);
}
const readExifCaptureDate = new Function(slice('function readExifCaptureDate(') + '\nreturn readExifCaptureDate;')();

// JPEG tối thiểu: IFD0 → con trỏ ExifIFD → DateTimeOriginal "2025:07:14 08:30:05"
function jpegWithExif(dateStr, littleEndian = true) {
    const tiff = Buffer.alloc(64);
    const w16 = (o, v) => littleEndian ? tiff.writeUInt16LE(v, o) : tiff.writeUInt16BE(v, o);
    const w32 = (o, v) => littleEndian ? tiff.writeUInt32LE(v, o) : tiff.writeUInt32BE(v, o);
    tiff.write(littleEndian ? 'II' : 'MM', 0, 'ascii'); w16(2, 42); w32(4, 8);
    w16(8, 1); w16(10, 0x8769); w16(12, 4); w32(14, 1); w32(18, 26); w32(22, 0);
    w16(26, 1); w16(28, 0x9003); w16(30, 2); w32(32, 20); w32(36, 44); w32(40, 0);
    tiff.write(dateStr + '\0', 44, 'ascii');
    const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
    const len = Buffer.alloc(2); len.writeUInt16BE(app1.length + 2);
    const bytes = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), len, app1, Buffer.from([0xFF, 0xD9])]);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
}

test('đọc giờ chụp gốc EXIF (cả II và MM); ảnh không có EXIF → null', () => {
    for (const le of [true, false]) {
        const d = readExifCaptureDate(jpegWithExif('2025:07:14 08:30:05', le));
        assert.ok(d instanceof Date);
        assert.deepEqual([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()], [2025, 7, 14, 8, 30, 5]);
    }
    assert.equal(readExifCaptureDate(jpegWithExif('0000:00:00 00:00:00')), null);
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0]);
    assert.equal(readExifCaptureDate(png.buffer.slice(png.byteOffset, png.byteOffset + 8)), null);
});

test('ảnh chọn từ máy: dấu ghi "ĐÓNG DẤU SAU", giờ chụp, "Sai số: không đo"; không còn sai số ngẫu nhiên', () => {
    assert.ok(!app.includes('nominalStampAccuracy'), 'Đã bỏ sai số ngẫu nhiên ±2–4 m');
    const upload = slice('    renderWatermarkOnCanvas(img, info = {}) {');
    assert.ok(upload.includes('const stampOpts = { postStamp: true, captureDate: info.captureDate || null };'));
    assert.ok(upload.includes('this.getWatermarkData(stampOpts)'), 'Thông tin lưu thư viện khớp với dấu');
    const data = slice('    getWatermarkData(opts = {}) {');
    assert.ok(data.includes("const gpsAcc = postStamp ? 'không đo'"));
    assert.ok(data.includes('`• ĐÓNG DẤU SAU (ảnh chọn từ máy): Chụp lúc ${captureStr} | Đóng dấu ${dateStr} | Sai số: ${gpsAcc}`'));
    assert.ok(app.includes('data.postStamp ? "HỆ VN-2000 | ẢNH ĐÓNG DẤU SAU" : "HỆ VN-2000 | ẢNH NGHIỆM THU HIỆN TRƯỜNG"'), 'Tiêu đề dấu không gọi ảnh đóng dấu sau là ảnh nghiệm thu hiện trường');
    const onFile = slice('    onFileSelected(event) {');
    assert.ok(onFile.includes('readExifCaptureDate(e.target.result)') && onFile.includes('reader.readAsArrayBuffer(file);'));
});

test('chụp ảnh, xem trực tiếp, quay video vẫn dùng sai số GPS thật', () => {
    const start = app.indexOf('const appCamera = {');
    for (const name of ['captureLivePhoto', 'startVideoRecording', 'startHudLoop']) {
        const i = app.indexOf(`    ${name}(`, start);
        if (i < 0) continue;
        assert.ok(!slice(`    ${name}(`, start).includes('postStamp'), `${name} giữ dấu thực địa`);
    }
    assert.ok(slice('    getWatermarkData(opts = {}) {').includes('AppState.lastGps.accuracy'));
});
