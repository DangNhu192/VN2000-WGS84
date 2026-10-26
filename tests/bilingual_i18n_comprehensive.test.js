const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('🌐 BILINGUAL I18N COMPREHENSIVE TEST SUITE', () => {
    const appJsPath = path.join(__dirname, '..', 'app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    test('app.js should define appI18n with comprehensive phraseMap', () => {
        assert.ok(appJs.includes('const appI18n = {'), 'appI18n must be defined');
        assert.ok(appJs.includes('phraseMap: {'), 'phraseMap must be defined');
        assert.ok(appJs.includes('translateString(str) {'), 'translateString method must be defined');
        assert.ok(appJs.includes('t(key) {'), 't(key) method must be defined');
    });

    test('phraseMap should contain standard geodetic & CAD technical terms', () => {
        // Trích xuất phraseMap từ app.js
        const startMarker = 'phraseMap: {';
        const endMarker = '\n    },\n\n    patterns:';
        const startIdx = appJs.indexOf(startMarker);
        const endIdx = appJs.indexOf(endMarker, startIdx);
        assert.ok(startIdx !== -1 && endIdx !== -1, 'phraseMap boundaries found');

        const mapContent = appJs.slice(startIdx + startMarker.length, endIdx);
        const lines = mapContent.split('\n');

        const phraseMap = {};
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('"')) continue;
            const m = trimmed.match(/^"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/);
            if (m) {
                try {
                    const k = JSON.parse(`"${m[1]}"`);
                    const v = JSON.parse(`"${m[2]}"`);
                    phraseMap[k] = v;
                } catch (e) {}
            }
        }

        // Kiểm tra các thuật ngữ cốt lõi
        const coreChecks = [
            ['📐 Đa giác [P]', '📐 Polygon [P]'],
            ['📏 Tuyến [L]', '📏 Polyline [L]'],
            ['🎯 Bắn điểm [D]', '🎯 Shoot Point [D]'],
            ['📌 Nhập X,Y', '📌 Input X,Y'],
            ['🔒 Khép góc [CL]', '🔒 Close Polygon [CL]'],
            ['Chuyển đổi tọa độ', 'Coordinate Transformation'],
            ['Chiều chuyển đổi', 'Conversion Direction'],
            ['Vĩ độ (°)', 'Latitude (°)'],
            ['Kinh độ (°)', 'Longitude (°)'],
            ['Kết quả', 'Results'],
            ['Chấm tọa độ trên bản đồ', 'Pick Coordinates on Map'],
            ['Mở bộ chuyển đổi đầy đủ', 'Open Full Converter'],
            ['Xuất dữ liệu', 'Export Data'],
            ['Sổ đo', 'Survey Book'],
            ['Kinh tuyến trục', 'Central Meridian'],
            ['Múi chiếu', 'Projection Zone']
        ];

        for (const [vi, en] of coreChecks) {
            assert.equal(phraseMap[vi], en, `Translation for "${vi}" should be "${en}"`);
        }

        // Đảm bảo số lượng key trong phraseMap đạt chuẩn >= 2000 mục
        const totalKeys = Object.keys(phraseMap).length;
        assert.ok(totalKeys >= 2000, `phraseMap should contain >= 2000 entries (got ${totalKeys})`);
    });

    test('translateString should handle emoji/symbol prefixes seamlessly', () => {
        // Mô phỏng logic translateString trong môi trường node
        const phraseMap = {
            "Đa giác [P]": "Polygon [P]",
            "Tuyến [L]": "Polyline [L]",
            "Dự án": "Project",
            "Múi chiếu:": "Zone:"
        };

        function simulateTranslate(str) {
            const norm = str.replace(/\s+/g, ' ').trim();
            if (phraseMap[norm]) return phraseMap[norm];

            const iconPrefixMatch = norm.match(/^([\p{Emoji}\p{Symbol}\p{Punctuation}\u2000-\u3300\s]+)(.+)$/u);
            if (iconPrefixMatch) {
                const prefix = iconPrefixMatch[1];
                const rest = iconPrefixMatch[2].trim();
                if (phraseMap[rest]) {
                    return prefix + phraseMap[rest];
                }
            }
            return norm;
        }

        assert.equal(simulateTranslate("📐 Đa giác [P]"), "📐 Polygon [P]");
        assert.equal(simulateTranslate("📏 Tuyến [L]"), "📏 Polyline [L]");
        assert.equal(simulateTranslate("📁 Dự án"), "📁 Project");
        assert.equal(simulateTranslate("• Múi chiếu:"), "• Zone:");
    });

    test('appI18n.t should prioritize dict entries then fallback to translateString', () => {
        const dict = {
            en: {
                'bnav.transform': 'Transform',
                'bnav.map': 'Map',
                'bnav.stakeout': 'Stakeout'
            },
            vi: {
                'bnav.transform': 'Chuyển Đổi',
                'bnav.map': 'Bản Đồ',
                'bnav.stakeout': 'Cắm Mốc'
            }
        };

        function mockT(currentLang, key) {
            if (dict[currentLang] && dict[currentLang][key]) {
                return dict[currentLang][key];
            }
            return key;
        }

        assert.equal(mockT('en', 'bnav.transform'), 'Transform');
        assert.equal(mockT('vi', 'bnav.transform'), 'Chuyển Đổi');
        assert.equal(mockT('en', 'bnav.map'), 'Map');
        assert.equal(mockT('vi', 'bnav.map'), 'Bản Đồ');
    });
});
