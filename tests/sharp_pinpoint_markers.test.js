// tests/sharp_pinpoint_markers.test.js
// Kiểm thử toàn diện hệ thống Icon ghim đầu nhọn (Sharp Pinpoint Needle Markers) trên tất cả các phân hệ bản đồ

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Đọc mã nguồn app.js và style.css
const appJsPath = path.join(__dirname, '..', 'app.js');
const styleCssPath = path.join(__dirname, '..', 'style.css');
const appJs = fs.readFileSync(appJsPath, 'utf8');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

// Thiết lập môi trường giả lập L.divIcon để kiểm thử hàm logic
global.L = {
    divIcon(options) {
        return {
            _isDivIcon: true,
            options: options
        };
    }
};

// Nạp createSharpPinIcon từ app.js
const sandbox = {};
const startIdx = appJs.indexOf('function createSharpPinIcon');
const endIdx = appJs.indexOf('function createOpticalCrosshairIcon');
if (startIdx !== -1 && endIdx !== -1) {
    const fnCode = appJs.slice(startIdx, endIdx);
    const fn = new Function('L', 'window', 'global', fnCode + '\nreturn createSharpPinIcon;');
    sandbox.createSharpPinIcon = fn(global.L, global, global);
}

test('=== 1. KIỂM THỬ HÀM TẠO ICON GHIM ĐẦU NHỌN (createSharpPinIcon) ===', async (t) => {
    await t.test('1.1 Hàm createSharpPinIcon tồn tại trong app.js', () => {
        assert.ok(typeof sandbox.createSharpPinIcon === 'function', 'createSharpPinIcon phải là một hàm hợp lệ');
    });

    await t.test('1.2 Định vị tâm mốc bằng đầu nhọn (iconAnchor: [width/2, height]) thay vì tâm hình tròn [width/2, height/2]', () => {
        const icon = sandbox.createSharpPinIcon({ width: 26, height: 35, text: 'P1' });
        assert.ok(icon._isDivIcon, 'Kết quả phải là một đối tượng L.divIcon');
        const opts = icon.options;
        assert.deepStrictEqual(opts.iconSize, [26, 35], 'iconSize phải là [26, 35]');
        assert.deepStrictEqual(opts.iconAnchor, [13, 35], 'iconAnchor phải neo chính xác vào đầu nhọn đáy [13, 35]');
        assert.deepStrictEqual(opts.popupAnchor, [0, -35], 'popupAnchor phải mở phía trên đỉnh ghim [0, -35]');
    });

    await t.test('1.3 SVG chứa đường cong thon nhọn (tapering path) và chấm kim định vị tại đáy', () => {
        const icon = sandbox.createSharpPinIcon({ color: '#ef4444', text: '1', width: 24, height: 33 });
        const html = icon.options.html;
        assert.ok(html.includes('<svg'), 'Markup phải chứa thẻ SVG');
        assert.ok(html.includes('<path d="M 12,2'), 'SVG phải chứa đường dẫn hình ghim chuẩn');
        assert.ok(html.includes('<circle cx="12" cy="32" r="1.2"'), 'Đáy ghim phải có chấm kim định vị chính xác');
        assert.ok(html.includes('>1</text>'), 'Đầu ghim phải hiển thị số thứ tự điểm');
    });

    await t.test('1.4 Hỗ trợ chế độ tâm ngắm mục tiêu (symbol: target / 🎯) và kiểm tra (inspect)', () => {
        const targetIcon = sandbox.createSharpPinIcon({ symbol: 'target', color: '#ef4444', width: 30, height: 40 });
        assert.ok(targetIcon.options.html.includes('circle'), 'Target pin phải chứa hồng tâm tròn');
        assert.ok(targetIcon.options.html.includes('line'), 'Target pin phải chứa chữ thập quang học');
        assert.deepStrictEqual(targetIcon.options.iconAnchor, [15, 40], 'Target pin phải có anchor tại đáy kim [15, 40]');

        const inspectIcon = sandbox.createSharpPinIcon({ symbol: 'inspect', color: '#f59e0b', width: 30, height: 40 });
        assert.ok(inspectIcon.options.html.includes('fde047'), 'Inspect pin phải chứa tâm màu vàng định vị');
    });

    await t.test('1.5 Hỗ trợ sóng xung kích radar tại điểm tiếp xúc đất (pulse: true)', () => {
        const pulsePin = sandbox.createSharpPinIcon({ color: '#10b981', pulse: true, width: 28, height: 38 });
        const html = pulsePin.options.html;
        assert.ok(html.includes('sharp-pin-pulse-ring'), 'Phải sinh vòng tròn xung kích radar');
        assert.ok(html.includes('sharp-pin-ground-dot'), 'Phải sinh điểm tiếp đất chuẩn xác');
    });
});

test('=== 2. KIỂM THỬ ÁP DỤNG GHIM ĐẦU NHỌN TRÊN TẤT CẢ CÁC PHÂN HỆ CỦA APP.JS ===', async (t) => {
    await t.test('2.1 Phân hệ Chuyển đổi tọa độ - Chấm điểm đa điểm (appCoordPicker)', () => {
        assert.ok(
            appJs.includes('createSharpPinIcon({\n            color: \'#0284c7\',\n            secondaryColor: \'#0369a1\',\n            text: `P${ptIndex}`'),
            'appCoordPicker.addMultiPoint phải sử dụng createSharpPinIcon thay cho circle marker'
        );
        assert.ok(
            appJs.includes('createSharpPinIcon({\n                        color: \'#0284c7\',\n                        secondaryColor: \'#0369a1\',\n                        text: `P${i + 1}`'),
            'appCoordPicker.deleteMultiPoint phải cập nhật lại icon bằng createSharpPinIcon'
        );
    });

    await t.test('2.2 Phân hệ Live Map & Tra cứu tọa độ (appTransform)', () => {
        assert.ok(
            appJs.includes('highlightLiveMapPickedPoint(lat, lng, vn2k)') &&
            appJs.includes('createSharpPinIcon({\n            color: \'#f59e0b\',\n            secondaryColor: \'#d97706\',\n            symbol: \'inspect\''),
            'highlightLiveMapPickedPoint phải ghim điểm bằng createSharpPinIcon màu hổ phách'
        );
        assert.ok(
            appJs.includes('syncSingleToLiveMap(pt)') &&
            appJs.includes('createSharpPinIcon({\n            color: \'#0284c7\',\n            secondaryColor: \'#0369a1\',\n            symbol: \'target\''),
            'syncSingleToLiveMap phải hiển thị điểm chuyển đổi đơn bằng createSharpPinIcon'
        );
        assert.ok(
            appJs.includes('syncMultiToLiveMap(results)') &&
            appJs.includes('createSharpPinIcon({\n                    color: \'#059669\',\n                    secondaryColor: \'#047857\',\n                    text: r.stt || (idx + 1)'),
            'syncMultiToLiveMap phải hiển thị danh sách mốc bằng createSharpPinIcon'
        );
    });

    await t.test('2.3 Phân hệ Bản đồ chuyển đổi toàn màn hình (appTransformMap)', () => {
        assert.ok(
            appJs.includes('setSinglePoint(lat, lng, vn)') &&
            appJs.includes('createSharpPinIcon({\n                color: \'#2563eb\',\n                secondaryColor: \'#1d4ed8\',\n                symbol: \'target\''),
            'appTransformMap.setSinglePoint phải sử dụng createSharpPinIcon'
        );
        assert.ok(
            appJs.includes('renderConvertedPoints()') &&
            appJs.includes('createSharpPinIcon({\n                    color: \'#10b981\',\n                    secondaryColor: \'#059669\',\n                    symbol: \'target\''),
            'appTransformMap.renderConvertedPoints đơn điểm phải sử dụng createSharpPinIcon'
        );
        assert.ok(
            appJs.includes('renderConvertedPoints()') &&
            appJs.includes('createSharpPinIcon({\n                            color: \'#0d9488\',\n                            secondaryColor: \'#0f766e\',\n                            text: r.stt'),
            'appTransformMap.renderConvertedPoints đa điểm phải sử dụng createSharpPinIcon'
        );
        assert.ok(
            appJs.includes('replotMultiMarkers()') &&
            appJs.includes('createSharpPinIcon({\n                color: \'#f59e0b\',\n                secondaryColor: \'#d97706\',\n                text: p.stt'),
            'appTransformMap.replotMultiMarkers phải sử dụng createSharpPinIcon'
        );
    });

    await t.test('2.4 Phân hệ Bản đồ Khảo sát & Mốc Dự Án (appMap)', () => {
        assert.ok(
            appJs.includes('loadProjectMarkers()') &&
            appJs.includes('createSharpPinIcon({\n                color: \'#ef4444\',\n                secondaryColor: \'#b91c1c\',\n                text: idx + 1,\n                width: 24,\n                height: 33'),
            'appMap.loadProjectMarkers phải thay thế toàn bộ chấm tròn cũ bằng ghim đầu nhọn số thứ tự'
        );
        assert.ok(
            appJs.includes('showConvertedPoint(') &&
            appJs.includes('createSharpPinIcon({\n            color: \'#0d9488\',\n            secondaryColor: \'#047857\',\n            symbol: \'target\',\n            width: 32,\n            height: 42,\n            pulse: true'),
            'appMap.showConvertedPoint (AppState.convertedMarker) phải sử dụng ghim đầu nhọn quang học'
        );
    });

    await t.test('2.5 Phân hệ Cắm mốc thực địa (appStakeout)', () => {
        assert.ok(
            appJs.includes('this.targetMarker = L.marker') &&
            appJs.includes('createSharpPinIcon({\n                    color: \'#ef4444\',\n                    secondaryColor: \'#b91c1c\',\n                    symbol: \'target\',\n                    width: 30,\n                    height: 40'),
            'appStakeout cắm mốc thực địa phải sử dụng ghim đầu nhọn chấm chính xác vị trí cọc mốc cần cắm'
        );
    });

    await t.test('2.6 Hàm createOpticalCrosshairIcon trả về ghim đầu nhọn chuẩn xác', () => {
        assert.ok(
            appJs.includes('function createOpticalCrosshairIcon() {\n    return createSharpPinIcon({'),
            'createOpticalCrosshairIcon phải trả về ghim đầu nhọn chuẩn xác thay vì hình tròn đồng tâm cũ'
        );
    });
});

test('=== 3. KIỂM THỬ CSS VÀ HIỆU ỨNG TƯƠNG TÁC CỦA GHIM ĐẦU NHỌN (style.css) ===', async (t) => {
    await t.test('3.1 Có định nghĩa hiệu ứng sóng xung kích pinPulse', () => {
        assert.ok(styleCss.includes('@keyframes pinPulse'), 'style.css phải có keyframes pinPulse');
    });

    await t.test('3.2 Có class .sharp-pin-divicon và .sharp-pin-marker-container', () => {
        assert.ok(styleCss.includes('.sharp-pin-divicon'), 'style.css phải chứa class .sharp-pin-divicon');
        assert.ok(styleCss.includes('.sharp-pin-marker-container'), 'style.css phải chứa class .sharp-pin-marker-container');
    });

    await t.test('3.3 Hiệu ứng rê chuột (hover) phóng to và nổi bật ghim mốc', () => {
        assert.ok(styleCss.includes('.sharp-pin-marker-container:hover'), 'Container phải có hover animation');
        assert.ok(styleCss.includes('.project-landmark-pin:hover'), 'Ghim mốc dự án phải có hover sáng nổi');
    });
});
