const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workspace = require('../field-workspace.js');
const { convertWgsToVn2k, convertVn2kToWgs } = require('../geodesy.js');
const engines = { forward: convertWgsToVn2k, reverse: convertVn2kToWgs };

test('quick coordinates accept decimal commas and reject partial, non-decimal and non-finite text', () => {
    assert.equal(workspace.parseNumber(' 10,7769 '), 10.7769);
    assert.equal(workspace.parseNumber('-0.5'), -0.5);
    for (const input of ['', ' ', '10.7x', '1,2,3', '0x10', '1e3', 'Infinity', null, NaN, Infinity]) {
        assert.ok(Number.isNaN(workspace.parseNumber(input)), `Reject ${String(input)}`);
    }
});

test('quick conversion uses the selected meridian and projection scale in both directions', () => {
    for (const config of [{ kttVal: 105.75, scaleFactor: 0.9999 }, { kttVal: 105, scaleFactor: 0.9996 }]) {
        const forward = workspace.convertPoint('wgs2vn', '10,7769', '106,7009', config, engines);
        const expected = convertWgsToVn2k(10.7769, 106.7009, config.kttVal, config.scaleFactor);
        assert.equal(forward.ok, true);
        assert.equal(forward.values[0], expected.X);
        assert.equal(forward.values[1], expected.Y);
        const reverse = workspace.convertPoint('vn2wgs', ...forward.values, config, engines);
        assert.equal(reverse.ok, true);
        assert.ok(Math.abs(reverse.values[0] - 10.7769) < 1e-6);
        assert.ok(Math.abs(reverse.values[1] - 106.7009) < 1e-6);
    }
});

test('invalid coordinates identify the correct field before calling the engine', () => {
    const unused = { forward() { assert.fail('Invalid input reached the engine'); } };
    const config = { kttVal: 105, scaleFactor: 0.9999 };
    for (const [direction, first, second, error, field] of [
        ['wgs2vn', '', '106', 'empty', 1], ['wgs2vn', '10', 'bad', 'number', 2],
        ['wgs2vn', '90', '106', 'latitude', 1], ['wgs2vn', '10', '181', 'longitude', 2],
        ['vn2wgs', '10', '500000', 'northing', 1], ['vn2wgs', '1200000', '5', 'easting', 2]
    ]) assert.deepEqual(workspace.convertPoint(direction, first, second, config, unused), { ok: false, error, field });
});

test('engine exceptions, invalid settings and non-finite outputs never become successful results', () => {
    const config = { kttVal: 105, scaleFactor: 0.9999 };
    for (const forward of [() => { throw new Error('projection'); }, () => ({ X: Infinity, Y: 1 }), () => null]) {
        assert.equal(workspace.convertPoint('wgs2vn', 10, 106, config, { forward }).ok, false);
    }
    assert.equal(workspace.convertPoint('wgs2vn', 10, 106, {}, engines).ok, false);
    assert.equal(workspace.convertPoint('unknown', 10, 106, config, engines).ok, false);
});

function boot({ lang = 'vi', blockedStorage = false, savedMode = 'tree' } = {}) {
    const elements = new Map();
    function element(id) {
        const attrs = new Map(), events = new Map(), classes = new Set();
        return { id, value: '', hidden: true, textContent: '', dataset: {}, attrs, events, classes,
            addEventListener(name, fn) { events.set(name, fn); },
            setAttribute(name, value) { attrs.set(name, value); }, removeAttribute(name) { attrs.delete(name); },
            focus() { this.focused = true; }, querySelectorAll() { return []; },
            classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); }, contains: name => classes.has(name) }
        };
    }
    for (const id of ['fieldWorkspace', 'fwInput1', 'fwInput2', 'fwDirection', 'fwResult', 'fwError', 'fwQuick', 'fwSimple', 'fwAdvanced', 'fwField', 'fwModes', 'fwToolbar', 'fwLabel1', 'fwLabel2', 'fwContext', 'fwKtt', 'fwMap', 'fwFull', 'fwForm', 'fwValues', 'fwResultContext', 'fwWarning']) elements.set(id, element(id));
    elements.get('fwDirection').value = 'wgs2vn';
    const documentEvents = new Map(), body = element('body');
    const document = { readyState: 'complete', body, getElementById: id => elements.get(id), querySelectorAll: () => [],
        addEventListener: (name, fn) => documentEvents.set(name, fn) };
    const saved = new Map([['app_theme', 'light'], ['vn2k_workspace_mode', savedMode]]);
    const localStorage = { getItem(key) { if (blockedStorage) throw new Error('SecurityError'); return saved.get(key); },
        setItem(key, value) { if (blockedStorage) throw new Error('QuotaExceededError'); saved.set(key, value); } };
    elements.set('fwSubmit', element('fwSubmit'));
    const mapCalls = [];
    const window = { localStorage, AppState: { kttVal: 105.75, kttDeg: 105, kttMin: 45, muiVal: 3, scaleFactor: 0.9999 },
        appI18n: { currentLang: lang }, appModal: {}, appNav: {
            openTransformMap(options) { mapCalls.push(options); },
            goToMenu() { window.AppState.currentScreen = 'menu'; },
            openProjectMap() { assert.fail('Conversion leaked into project map'); }
        } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../field-workspace.js'), 'utf8'), { window, document, convertWgsToVn2k, convertVn2kToWgs });
    const click = id => elements.get(id).events.get('click')();
    const submit = () => elements.get('fwForm').events.get('submit')({ preventDefault() {} });
    return { elements, body, window, saved, click, submit, documentEvents, mapCalls };
}

test('workspace modes remain reversible even when storage is blocked and preserve the saved theme', () => {
    for (const blockedStorage of [true, false]) {
        const app = boot({ blockedStorage });
        assert.equal(app.body.dataset.workspace, 'simple');
        app.click('fwAdvanced');
        assert.equal(app.body.dataset.workspace, 'advanced');
        assert.equal(app.elements.get('fwQuick').hidden, true);
        app.click('fwSimple');
        assert.equal(app.elements.get('fwQuick').hidden, false);
        app.click('fwField');
        assert.equal(app.body.classes.has('field-mode'), true);
        app.click('fwField');
        assert.equal(app.body.classes.has('field-mode'), false);
        assert.equal(app.saved.get('app_theme'), 'light');
    }
    assert.equal(boot({ savedMode: 'advanced' }).body.dataset.workspace, 'advanced');
});

test('editing input, changing KTT and switching languages invalidate visible results', () => {
    const app = boot();
    const first = app.elements.get('fwInput1'), second = app.elements.get('fwInput2');
    first.value = '10.7769'; second.value = '106.7009';
    app.submit();
    assert.equal(app.elements.get('fwResult').hidden, false);
    assert.match(app.elements.get('fwValues').textContent, /X = .* m\nY = .* m/);
    first.events.get('input')();
    assert.equal(app.elements.get('fwResult').hidden, true);
    app.submit();
    app.window.AppState.kttVal = 105; app.window.AppState.kttMin = 0;
    app.documentEvents.get('vn2000:contextchange')();
    assert.equal(app.elements.get('fwResult').hidden, true);
    assert.match(app.elements.get('fwContext').textContent, /105°00/);
    app.window.appI18n.currentLang = 'en';
    app.documentEvents.get('vn2000:languagechange')();
    assert.equal(app.elements.get('fwLabel1').textContent, 'Latitude (°)');
    assert.equal(first.value, '10.7769');
});

test('invalid second coordinate gets focus and map entry stays inside conversion', () => {
    const app = boot();
    app.elements.get('fwInput1').value = '10'; app.elements.get('fwInput2').value = '106oops';
    app.submit();
    assert.equal(app.elements.get('fwInput2').focused, true);
    assert.equal(app.elements.get('fwInput2').attrs.get('aria-invalid'), 'true');
    assert.equal(app.elements.get('fwResult').hidden, true);
    app.click('fwMap');
    assert.equal(app.mapCalls.length, 1);
    assert.equal(app.mapCalls[0].mode, 'pick');
});

test('map selection returns WGS coordinates to simple mode and converts with the current KTT', () => {
    const app = boot();
    app.elements.get('fwDirection').value = 'vn2wgs';
    app.elements.get('fwInput1').value = '1200000';
    app.click('fwMap');
    app.window.AppState.kttVal = 105;
    app.window.AppState.scaleFactor = 0.9996;
    app.mapCalls[0].onApplyPoint({ lat: 10.7769, lng: 106.7009 });
    assert.equal(app.window.AppState.currentScreen, 'menu');
    assert.equal(app.elements.get('fwDirection').value, 'wgs2vn');
    assert.equal(app.elements.get('fwInput1').value, '10.7769');
    assert.equal(app.elements.get('fwInput2').value, '106.7009');
    assert.equal(app.elements.get('fwLabel1').textContent, 'Vĩ độ (°)');
    assert.equal(app.elements.get('fwResult').hidden, false);
    const expected = convertWgsToVn2k(10.7769, 106.7009, 105, 0.9996);
    assert.equal(app.elements.get('fwValues').textContent, `X = ${expected.X.toFixed(3)} m\nY = ${expected.Y.toFixed(3)} m`);
    assert.equal(app.elements.get('fwSubmit').focused, true);
});

test('picker callback validates selection, is consumed once and is reset for other map openings', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
    const start = source.indexOf('const appTransformMap = {');
    const end = source.indexOf('\n};', start) + 3;
    const context = { AppState: {}, document: { getElementById: () => null }, showToast() {} };
    vm.createContext(context);
    vm.runInContext(source.slice(start, end) + '\nthis.picker = appTransformMap;', context);
    const picker = context.picker;
    for (const name of ['ensureMap', 'initSheet', 'initSheetDrag', 'setMode', 'setPickSubMode']) picker[name] = () => {};
    let returned = 0, sheetUpdates = 0;
    picker.syncSinglePointToSheet = () => sheetUpdates++;
    const onApplyPoint = point => { returned++; assert.equal(point.lat, 10); };
    picker.init({ mode: 'pick', onApplyPoint });
    picker.applyToForm();
    assert.equal(returned, 0);
    picker.pickedSinglePoint = { lat: 10, lng: 106 };
    picker.applyToForm();
    assert.equal(returned, 1);
    assert.equal(sheetUpdates, 0);
    picker.applyToForm();
    assert.equal(returned, 1);
    assert.equal(sheetUpdates, 1);
    picker.init({ mode: 'pick', onApplyPoint });
    picker.init({ mode: 'pick' }); // Cancel simple entry, then open the full converter.
    picker.applyToForm();
    assert.equal(returned, 1);
    assert.equal(sheetUpdates, 2);
});
