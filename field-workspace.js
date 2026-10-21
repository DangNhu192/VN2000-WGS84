/* A small home workspace; surveying engines and maps retain their own screens. */
(function (root) {
    'use strict';

    const text = {
        vi: {
            simple: 'Đơn giản', advanced: 'Nâng cao', field: 'Thực địa',
            title: 'Chuyển đổi tọa độ', direction: 'Chiều chuyển đổi',
            lat: 'Vĩ độ (°)', lng: 'Kinh độ (°)', x: 'X · Bắc (m)', y: 'Y · Đông (m)',
            convert: 'Chuyển đổi', map: 'Chấm tọa độ trên bản đồ', full: 'Mở bộ chuyển đổi đầy đủ',
            change: 'Đổi KTT', result: 'Kết quả', cm: 'KTT', zone: 'Múi',
            empty: 'Nhập tọa độ vào ô này.', number: 'Nhập một số thập phân hợp lệ, dùng dấu chấm hoặc dấu phẩy.',
            latitude: 'Vĩ độ phải lớn hơn −90° và nhỏ hơn 90°.', longitude: 'Kinh độ phải từ −180° đến 180°.',
            northing: 'X (Bắc) phải từ 500.000 đến 3.000.000 m.', easting: 'Y (Đông) phải từ 100.000 đến 900.000 m.',
            failed: 'Không thể chuyển đổi. Kiểm tra tọa độ và kinh tuyến trục rồi thử lại.',
            far: 'Điểm nằm xa kinh tuyến trục đang chọn. Kiểm tra KTT và múi chiếu trước khi sử dụng.',
            gps: 'GPS điện thoại chỉ dùng tham khảo; không thay thế RTK hoặc phép đo kiểm định.',
            modes: 'Chế độ giao diện', actions: 'Chế độ giao diện và thực địa'
        },
        en: {
            simple: 'Simple', advanced: 'Advanced', field: 'Field',
            title: 'Coordinate conversion', direction: 'Conversion direction',
            lat: 'Latitude (°)', lng: 'Longitude (°)', x: 'X · Northing (m)', y: 'Y · Easting (m)',
            convert: 'Convert', map: 'Pick coordinates on map', full: 'Open full converter',
            change: 'Change CM', result: 'Result', cm: 'CM', zone: 'Zone',
            empty: 'Enter a coordinate in this field.', number: 'Enter a decimal number using a dot or comma.',
            latitude: 'Latitude must be greater than −90° and less than 90°.', longitude: 'Longitude must be between −180° and 180°.',
            northing: 'X (northing) must be between 500,000 and 3,000,000 m.', easting: 'Y (easting) must be between 100,000 and 900,000 m.',
            failed: 'Conversion failed. Check the coordinates and central meridian, then try again.',
            far: 'This point is far from the selected central meridian. Check the CM and projection zone before use.',
            gps: 'Phone GPS is for reference only; it does not replace RTK or certified survey measurements.',
            modes: 'Workspace mode', actions: 'Workspace and field mode'
        }
    };

    function parseNumber(value) {
        if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
        if (typeof value !== 'string') return NaN;
        const clean = value.trim();
        return /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(clean) ? Number(clean.replace(',', '.')) : NaN;
    }

    function convertPoint(direction, first, second, config, engines) {
        const a = parseNumber(first), b = parseNumber(second);
        const invalid = (error, field) => ({ ok: false, error, field });
        if (!Number.isFinite(a)) return invalid(String(first ?? '').trim() ? 'number' : 'empty', 1);
        if (!Number.isFinite(b)) return invalid(String(second ?? '').trim() ? 'number' : 'empty', 2);
        if (!config || !Number.isFinite(config.kttVal) || !Number.isFinite(config.scaleFactor) || config.scaleFactor <= 0) return invalid('failed', 0);
        if (direction !== 'wgs2vn' && direction !== 'vn2wgs') return invalid('failed', 0);
        const forward = direction === 'wgs2vn';
        if (forward && (a <= -90 || a >= 90)) return invalid('latitude', 1);
        if (forward && (b < -180 || b > 180)) return invalid('longitude', 2);
        if (!forward && (a < 500000 || a > 3000000)) return invalid('northing', 1);
        if (!forward && (b < 100000 || b > 900000)) return invalid('easting', 2);
        try {
            const result = forward
                ? engines.forward(a, b, config.kttVal, config.scaleFactor)
                : engines.reverse(a, b, config.kttVal, config.scaleFactor);
            const values = forward ? [result.X, result.Y] : [result.lat, result.lng];
            if (!values.every(Number.isFinite) || (!forward && (Math.abs(values[0]) >= 90 || Math.abs(values[1]) > 180))) return invalid('failed', 0);
            return { ok: true, values, forward, ktt: config.kttVal, scale: config.scaleFactor,
                far: Math.abs((forward ? b : values[1]) - config.kttVal) > 2.5 };
        } catch (_) { return invalid('failed', 0); }
    }

    function readPreference(storage, key, fallback) {
        try { return storage.getItem(key) || fallback; } catch (_) { return fallback; }
    }
    function writePreference(storage, key, value) {
        try { storage.setItem(key, value); } catch (_) { /* The current session remains usable. */ }
    }
    const normalizeMode = mode => mode === 'advanced' ? 'advanced' : 'simple';

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { parseNumber, convertPoint, readPreference, writePreference, normalizeMode };
        return;
    }

    function init() {
        const workspace = document.getElementById('fieldWorkspace');
        if (!workspace) return;
        const byId = id => document.getElementById(id);
        const first = byId('fwInput1'), second = byId('fwInput2'), direction = byId('fwDirection');
        let storage;
        try { storage = root.localStorage; } catch (_) { storage = null; }
        const language = () => root.appI18n?.currentLang === 'en' ? 'en' : 'vi';
        const words = () => text[language()];

        function clearResult() {
            byId('fwResult').hidden = true;
            byId('fwError').hidden = true;
            first.removeAttribute('aria-invalid');
            second.removeAttribute('aria-invalid');
        }
        function setMode(mode) {
            mode = normalizeMode(mode);
            document.body.dataset.workspace = mode;
            byId('fwQuick').hidden = mode === 'advanced';
            ['simple', 'advanced'].forEach(name => byId(name === 'simple' ? 'fwSimple' : 'fwAdvanced').setAttribute('aria-pressed', String(name === mode)));
            writePreference(storage, 'vn2k_workspace_mode', mode);
        }
        function setField(enabled) {
            document.body.classList.toggle('field-mode', enabled);
            byId('fwField').setAttribute('aria-pressed', String(enabled));
            writePreference(storage, 'vn2k_field_mode', enabled ? '1' : '0');
            if (root.appTheme && typeof root.appTheme.syncFieldMode === 'function') {
                root.appTheme.syncFieldMode(enabled);
            }
        }
        function refresh() {
            const t = words(), state = root.AppState;
            workspace.querySelectorAll('[data-fw-text]').forEach(el => { el.textContent = t[el.dataset.fwText]; });
            byId('fwModes').setAttribute('aria-label', t.modes);
            byId('fwToolbar').setAttribute('aria-label', t.actions);
            const forward = direction.value === 'wgs2vn';
            byId('fwLabel1').textContent = forward ? t.lat : t.x;
            byId('fwLabel2').textContent = forward ? t.lng : t.y;
            first.placeholder = forward ? '10.7769' : '1191900.123';
            second.placeholder = forward ? '106.7009' : '603800.456';
            byId('fwContext').textContent = `${t.cm} ${state.kttDeg}°${String(state.kttMin).padStart(2, '0')}′ · ${t.zone} ${state.muiVal}°`;
            document.querySelectorAll('[data-fw-gps]').forEach(el => { el.textContent = t.gps; });
            clearResult();
        }

        byId('fwSimple').addEventListener('click', () => setMode('simple'));
        byId('fwAdvanced').addEventListener('click', () => setMode('advanced'));
        byId('fwField').addEventListener('click', () => setField(!document.body.classList.contains('field-mode')));
        direction.addEventListener('change', () => { first.value = ''; second.value = ''; refresh(); });
        first.addEventListener('input', clearResult);
        second.addEventListener('input', clearResult);
        byId('fwKtt').addEventListener('click', () => root.appModal.openUnifiedSettings('ktt'));
        byId('fwMap').addEventListener('click', () => root.appNav.openTransformMap({
            mode: 'pick',
            onApplyPoint(point) {
                // Map picks are WGS-84, even if the previous input was VN-2000.
                direction.value = 'wgs2vn';
                first.value = String(point.lat);
                second.value = String(point.lng);
                root.appNav.goToMenu();
                refresh();
                convert();
                byId('fwSubmit').focus();
            }
        }));
        byId('fwFull').addEventListener('click', () => root.appNav.showScreen('transform'));
        byId('fwForm').addEventListener('submit', event => {
            event.preventDefault();
            convert();
        });
        function convert() {
            clearResult();
            const t = words();
            const result = convertPoint(direction.value, first.value, second.value, root.AppState,
                { forward: convertWgsToVn2k, reverse: convertVn2kToWgs });
            if (!result.ok) {
                byId('fwError').textContent = t[result.error];
                byId('fwError').hidden = false;
                if (result.field) {
                    const invalid = result.field === 1 ? first : second;
                    invalid.setAttribute('aria-invalid', 'true');
                    invalid.focus();
                }
                return;
            }
            const labels = result.forward ? ['X', 'Y'] : [t.lat, t.lng];
            const unit = result.forward ? ' m' : '°';
            byId('fwValues').textContent = result.values.map((n, i) => `${labels[i]} = ${n.toFixed(result.forward ? 3 : 7)}${unit}`).join('\n');
            byId('fwResultContext').textContent = `${t.cm} ${result.ktt}° · k₀ = ${result.scale}`;
            byId('fwWarning').textContent = result.far ? t.far : '';
            byId('fwWarning').hidden = !result.far;
            byId('fwResult').hidden = false;
        }
        document.addEventListener('vn2000:contextchange', refresh);
        document.addEventListener('vn2000:languagechange', refresh);
        setMode(readPreference(storage, 'vn2k_workspace_mode', 'simple'));
        setField(readPreference(storage, 'vn2k_field_mode', '0') === '1');
        refresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : globalThis);
