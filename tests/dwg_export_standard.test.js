/**
 * tests/dwg_export_standard.test.js
 * Kiểm thử tiêu chuẩn xuất file AutoCAD (.dwg) & Loại bỏ hoàn toàn .dxf
 * Chuẩn TCVN 7285:2003, TCVN 5571:2012 & Thông tư 25/2014/TT-BTNMT
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const indexPath = path.join(ROOT_DIR, 'index.html');
const appJsPath = path.join(ROOT_DIR, 'app.js');
const cadGeoPath = path.join(ROOT_DIR, 'src', 'core', 'cad_geometry.js');

const indexHtml = fs.readFileSync(indexPath, 'utf-8');
const appJs = fs.readFileSync(appJsPath, 'utf-8');
const CadGeometryEngine = require(cadGeoPath);

test('=== 1. KIỂM THỬ LOẠI BỎ TOÀN BỘ .DXF KHỎI GIAO DIỆN & LOGIC ỨNG DỤNG ===', async (t) => {
    await t.test('1.1 index.html không còn bất kỳ chữ "dxf" nào (không phân biệt hoa thường)', () => {
        const matches = indexHtml.match(/dxf/gi);
        assert.strictEqual(matches, null, `Vẫn còn ${matches ? matches.length : 0} từ khóa dxf trong index.html`);
    });

    await t.test('1.2 index.html đã chuyển đổi thành Bản vẽ AutoCAD (.dwg)', () => {
        assert.ok(indexHtml.includes('appCadTool.exportDwg()'), 'Thiếu nút gọi appCadTool.exportDwg()');
        assert.ok(indexHtml.includes('appData.exportDwgFile()'), 'Thiếu nút gọi appData.exportDwgFile()');
        assert.ok(indexHtml.includes('appElevationProfile.exportDwgProfile()'), 'Thiếu nút gọi appElevationProfile.exportDwgProfile()');
        assert.ok(indexHtml.includes('appElevationProfile.exportPitDwg()'), 'Thiếu nút gọi appElevationProfile.exportPitDwg()');
        assert.ok(indexHtml.includes('Bản vẽ AutoCAD (.dwg)'), 'Thiếu nhãn hiển thị Bản vẽ AutoCAD (.dwg)');
    });

    await t.test('1.3 app.js không còn chứa từ khóa "dxf" trong chuỗi người dùng / UI', () => {
        const matches = appJs.match(/dxf/gi);
        assert.strictEqual(matches, null, `Vẫn còn ${matches ? matches.length : 0} từ khóa dxf trong app.js`);
    });
});

test('=== 2. KIỂM THỬ ĐỘNG CƠ XUẤT BẢN VẼ AUTOCAD (.DWG) CHUẨN TCVN ===', async (t) => {
    await t.test('2.1 CadGeometryEngine có hàm exportDwgString xuất header AutoCAD chuẩn', () => {
        assert.strictEqual(typeof CadGeometryEngine.exportDwgString, 'function');
        const testShapes = [
            {
                name: 'THUA_DAT_01',
                isClosed: true,
                points: [
                    { x: 1144000, y: 539000, h: 2.5 },
                    { x: 1144050, y: 539000, h: 2.6 },
                    { x: 1144050, y: 539040, h: 2.5 },
                    { x: 1144000, y: 539040, h: 2.4 }
                ]
            }
        ];
        const dwgContent = CadGeometryEngine.exportDwgString(testShapes);
        assert.ok(dwgContent.includes('AC1015'), 'Header phải là AutoCAD R2000/2004 (AC1015) tương thích cao');
        assert.ok(dwgContent.includes('$INSUNITS\r\n70\r\n6'), 'Đơn vị bản vẽ phải là Mét (INSUNITS=6)');
        assert.ok(dwgContent.includes('$MEASUREMENT\r\n70\r\n1'), 'Hệ đo lường phải là Metric (MEASUREMENT=1)');
        assert.ok(dwgContent.includes('RANH_DAT'), 'Phải chứa layer chuẩn RANH_DAT');
        assert.ok(dwgContent.includes('POLYLINE'), 'Phải chứa thực thể POLYLINE ranh đất');
    });

    await t.test('2.2 appCadTool.exportDwg xuất file .dwg với MIME application/acad và các layer TCVN', () => {
        assert.ok(appJs.includes('exportDwg('), 'appCadTool thiếu hàm exportDwg');
        assert.ok(appJs.includes('.dwg'), 'Phải tạo file có đuôi mở rộng .dwg');
        assert.ok(appJs.includes('application/acad') || appJs.includes('image/vnd.dwg'), 'MIME type phải là application/acad');
        assert.ok(appJs.includes('RANH_THUA'), 'Phải định nghĩa layer RANH_THUA');
        assert.ok(appJs.includes('MOC_TOADO'), 'Phải định nghĩa layer MOC_TOADO');
        assert.ok(appJs.includes('SO_HIEU_DINH'), 'Phải định nghĩa layer SO_HIEU_DINH');
        assert.ok(appJs.includes('CHIEU_DAI_CANH'), 'Phải định nghĩa layer CHIEU_DAI_CANH');
        assert.ok(appJs.includes('DIEN_TICH_THUA'), 'Phải định nghĩa layer DIEN_TICH_THUA');
        assert.ok(appJs.includes('KHUNG_BAN_VE'), 'Phải định nghĩa layer KHUNG_BAN_VE');
        assert.ok(appJs.includes('KHUNG_TEN'), 'Phải định nghĩa layer KHUNG_TEN');
        assert.ok(appJs.includes('BANG_TOA_DO'), 'Phải định nghĩa layer BANG_TOA_DO');
        assert.ok(appJs.includes('MUI_TEN_BAC'), 'Phải định nghĩa layer MUI_TEN_BAC');
    });

    await t.test('2.3 Sổ đo mốc appData.exportDwgFile xuất file .dwg chuẩn', () => {
        assert.ok(appJs.includes('exportDwgFile('), 'appData thiếu hàm exportDwgFile');
        assert.ok(appJs.includes('MOC_TOADO'), 'appData xuất các mốc vào layer MOC_TOADO');
    });

    await t.test('2.4 Trắc dọc & Hố đào appElevationProfile xuất file .dwg chuẩn', () => {
        assert.ok(appJs.includes('exportDwgProfile('), 'appElevationProfile thiếu hàm exportDwgProfile');
        assert.ok(appJs.includes('exportPitDwg('), 'appElevationProfile thiếu hàm exportPitDwg');
    });
});
