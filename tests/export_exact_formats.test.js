// v2.8.61 — Xuất đúng định dạng, mỗi lần xuất đúng MỘT tệp.
// Lỗi cũ: ".dwg" thật ra là DXF đổi đuôi (AutoCAD báo hỏng) kèm lượt tải .dxf thứ hai; ".dgn / .dat" không có tệp
// .dgn nào mà ra .dat + .cmd (+ .dxf); trình duyệt máy tính chặn các lượt tải tự động sau lượt đầu → "không có file".
// Bộ ghi DGN được kiểm chéo bằng GDAL (scripts/export_matrix.py); ở đây đọc lại bằng bộ đọc DGN của app.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const GisIO = require('../src/core/gis_io.js');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const i16 = (b, o) => b[o] | (b[o + 1] << 8);
const i32 = (b, o) => (b[o + 1] << 24) | (b[o] << 16) | (b[o + 3] << 8) | b[o + 2];
function elements(b) {
    const out = [];
    for (let off = 0; off + 4 <= b.length;) {
        if (b[off] === 0xff && b[off + 1] === 0xff) break;
        const size = (i16(b, off + 2) + 2) * 2;
        out.push({ off, type: b[off + 1] & 0x7f, level: b[off] & 0x3f, complex: !!(b[off] & 0x80), size });
        off += size;
    }
    return out;
}

const parcel = [[603699.135, 1191842.445], [603699.032, 1191875.630], [603742.781, 1191875.766], [603742.884, 1191842.581]];

test('DGN V7: TCB đơn vị m / mm, gốc 0; tệp đệm đủ khối 512 byte sau dấu hết tệp', () => {
    const b = GisIO.writeDgn([{ kind: 'shape', level: 10, pts: parcel }]);
    assert.strictEqual(b[0], 0x08); assert.strictEqual(b[1], 0x09);          // phần tử đầu là TCB 2D
    assert.strictEqual(i32(b, 1112), 1000);                                  // 1000 mm / m
    assert.strictEqual(i32(b, 1116), 1);                                     // 1 UOR / mm
    assert.strictEqual(String.fromCharCode(b[1120]), 'm');
    assert.strictEqual(String.fromCharCode(b[1122], b[1123]), 'mm');
    for (let i = 1240; i < 1256; i++) assert.strictEqual(b[i], 0, 'gốc tọa độ toàn cục = 0');
    assert.strictEqual(b.length % 512, 0);
    const els = elements(b);
    const last = els[els.length - 1];
    assert.strictEqual(b[last.off + last.size], 0xff);
    assert.strictEqual(b[last.off + last.size + 1], 0xff);
});

test('DGN V7: vùng / đường / điểm / chữ đọc lại đúng loại, lớp và tọa độ tới mm', () => {
    const b = GisIO.writeDgn([
        { kind: 'shape', level: 10, color: 3, weight: 2, pts: parcel },
        { kind: 'line', level: 20, pts: [parcel[0], parcel[1], parcel[2]] },
        { kind: 'line', level: 20, pts: [parcel[0], parcel[1]] },
        { kind: 'point', level: 30, pts: [[603808.164, 1191953.401]] },
        { kind: 'text', level: 31, text: 'Mốc Đ1', height: 1, pts: [[603699.5, 1191843]] }
    ]);
    const els = elements(b).filter(e => [3, 4, 6, 17].includes(e.type));
    assert.deepStrictEqual(els.map(e => e.type), [6, 4, 3, 3, 17]);
    assert.deepStrictEqual(els.map(e => e.level), [10, 20, 20, 30, 31]);
    const shape = els[0];
    assert.strictEqual(i16(b, shape.off + 36), 5, 'vùng tự khép: 4 đỉnh + đỉnh đầu');
    assert.strictEqual(i32(b, shape.off + 38), 603699135);
    assert.strictEqual(i32(b, shape.off + 42), 1191842445);
    assert.strictEqual(i16(b, shape.off + 34), (3 << 8) | (2 << 3), 'màu 3, nét 2');
    assert.strictEqual(i16(b, shape.off + 30), (shape.size - 32) / 2, 'chỉ số thuộc tính trỏ ngay sau hình học');
    // phạm vi (range) ở dạng bù 0x80000000
    assert.strictEqual((i32(b, shape.off + 4) ^ 0x80000000) | 0, 603699032);
    const r = GisIO.readDgn(b);
    assert.ok(r.ok);
    assert.strictEqual(r.counts.polygons, 1);
    const txt = r.features.find(f => f.kind === 'point' && f.name);
    assert.strictEqual(txt.name, 'Moc D1', 'chữ V7 8 bit: bỏ dấu tiếng Việt');
});

test('DGN V7: vùng / tuyến > 101 đỉnh ghi thành phần tử phức (14 / 12) và đọc lại đủ đỉnh', () => {
    const ring = [];
    for (let i = 0; i < 150; i++) ring.push([603700 + 50 * Math.cos(2 * Math.PI * i / 150), 1191850 + 50 * Math.sin(2 * Math.PI * i / 150)]);
    const b = GisIO.writeDgn([{ kind: 'shape', level: 11, pts: ring }, { kind: 'line', level: 21, pts: ring }]);
    const els = elements(b).filter(e => e.type !== 9 && e.type !== 8 && e.type !== 10 && e.type !== 66);
    const hdr = els.find(e => e.type === 14);
    assert.ok(hdr && els.find(e => e.type === 12), 'có đầu vùng phức và đầu chuỗi phức');
    const comps = els.slice(els.indexOf(hdr) + 1, els.indexOf(hdr) + 1 + i16(b, hdr.off + 38));
    assert.ok(comps.length > 1 && comps.every(c => c.complex && c.type === 4));
    assert.strictEqual(i16(b, hdr.off + 36), (48 / 2 - 19) + comps.reduce((s, c) => s + c.size / 2, 0), 'totlength theo đặc tả');
    const r = GisIO.readDgn(b);
    assert.strictEqual(r.counts.polygons, 1);
    assert.strictEqual(r.features.find(f => f.kind === 'polygon').rings[0].length, 151);
});

test('DGN V7: tọa độ ngoài phạm vi số nguyên 32 bit báo lỗi rõ ràng', () => {
    assert.throws(() => GisIO.writeDgn([{ kind: 'point', pts: [[3e6, 1e6]] }]), /DGN_TOA_DO_VUOT_PHAM_VI/);
});

test('mỗi định dạng xuất đúng MỘT tệp, đúng đuôi', () => {
    const dxf = app.slice(app.indexOf('        // Một tệp .dxf thật (AutoCAD R2000 / AC1015).'), app.indexOf('    exportDxf(opts) {'));
    assert.strictEqual((dxf.match(/saveBlobFile\(/g) || []).length, 1);
    assert.match(dxf, /`\$\{baseFilename\}\.dxf`/);
    assert.doesNotMatch(app, /aDxf\.click\(\)|aCmd\.click\(\)|aMicro\.click\(\)/, 'không còn lượt tải thứ hai / thứ ba');
    assert.doesNotMatch(app, /`MatBang_HoDao_\$\{projName\}\.dwg`|`TracDoc_ThietKe_\$\{projName\}\.dwg`/, 'hố đào / trắc dọc là .dxf');
    const dgn = app.slice(app.indexOf('    exportDgn(opts = {}) {'), app.indexOf('    exportFamisDat(opts = {}) {'));
    assert.match(dgn, /GisIO\.writeDgn\(items\)/);
    assert.match(dgn, /saveBlobFile\(new Blob\(\[bytes\], \{ type: 'application\/octet-stream' \}\), `\$\{base\}\.dgn`\);/);
    assert.match(app, /saveBlobFile\(dat, `\$\{base\}_Famis\.dat`/);
    assert.match(app, /toWktText\(feats, \{ precision: 7, names: false \}\)/, 'WKT thuần, không dòng chú thích #');
});

test('hai hộp xuất: .dxf (AutoCAD), .dgn (MicroStation), .dat (Famis); "dwg" cũ tự đổi sang dxf', () => {
    for (const id of ['cadExportFormatSelect', 'selExportFormat']) {
        const sel = html.match(new RegExp(`<select id="${id}"[\\s\\S]*?</select>`))[0];
        assert.match(sel, /value="dxf"[^>]*>\.dxf \(AutoCAD\)</);
        assert.match(sel, /value="dgn"[^>]*>\.dgn \(MicroStation\)</);
        assert.match(sel, /value="dat"[^>]*>\.dat \(Famis\)</);
        assert.doesNotMatch(sel, /value="dwg"/);
    }
    assert.match(app, /if \(!fmt \|\| fmt === 'dwg'\) fmt = 'dxf';/);
    assert.match(app, /const fmt = \(!format \|\| format === 'dwg'\) \? 'dxf' : format;/);
});

test('Chia sẻ MiniCAD gửi đúng tệp PDF; máy không chia sẻ được tệp thì tải PDF về', () => {
    const share = app.slice(app.indexOf('    shareExport() {'), app.indexOf('\n};\n', app.indexOf('    shareExport() {')));
    assert.match(share, /this\.exportPdf\(\{\s*onFile: \(blob, filename\) =>/);
    assert.match(share, /nav\.share\(\{ files: \[file\]/);
    assert.match(share, /saveBlobFile\(blob, filename\)/);
    assert.match(app, /if \(typeof opts\.onFile === 'function'\) \{ opts\.onFile\(doc\.output\('blob'\), `\$\{baseName\}\.pdf`\); return; \}/);
});
