// Bản đồ tự đo lại khi khung đổi cỡ: "Tối ưu lộ trình" lần mở đầu chỉ hiện 1 ô ảnh (11% trên điện thoại,
// 2% trên máy tính) vì bản đồ được tạo khi màn hình còn ẩn (khung 0×0).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
global.document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, documentElement: {}, body: {} };
global.window = { addEventListener() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { installLeafletAutoResize } = require('../app.js');

function fakeLeaflet() {
    const hooks = [];
    return { hooks, Map: { addInitHook: fn => hooks.push(fn) } };
}
function fakeMap() {
    const handlers = {};
    return {
        _loaded: true, calls: [],
        getContainer() { return { id: 'leaflet-routing-map' }; },
        invalidateSize(opts) { this.calls.push(opts); },
        on(ev, fn) { handlers[ev] = fn; },
        fire(ev) { handlers[ev] && handlers[ev](); }
    };
}

test('mọi bản đồ Leaflet được theo dõi kích thước và đo lại khi khung hiện ra', () => {
    const L = fakeLeaflet();
    let observer;
    class RO { constructor(cb) { this.cb = cb; this.watching = []; observer = this; } observe(el) { this.watching.push(el); } disconnect() { this.watching = []; this.off = true; } }
    global.requestAnimationFrame = fn => fn();
    assert.equal(installLeafletAutoResize(L, RO), true);
    assert.equal(L.hooks.length, 1);

    const map = fakeMap();
    L.hooks[0].call(map);
    assert.equal(observer.watching.length, 1, 'Theo dõi khung bản đồ');

    observer.cb([{ contentRect: { width: 0, height: 0 } }]);
    assert.equal(map.calls.length, 0, 'Khung đang ẩn (0×0): không đo lại');

    observer.cb([{ contentRect: { width: 347, height: 440 } }]);
    assert.equal(map.calls.length, 1, 'Khung hiện ra: đo lại');
    assert.deepEqual(map.calls[0], { debounceMoveend: true });

    map.fire('unload');
    assert.equal(observer.off, true, 'Gỡ bản đồ thì ngừng theo dõi');
    delete global.requestAnimationFrame;
});

test('không có Leaflet hoặc ResizeObserver thì bỏ qua, không lỗi', () => {
    assert.equal(installLeafletAutoResize(undefined, function () {}), false);
    assert.equal(installLeafletAutoResize(fakeLeaflet(), undefined), false);
});

test('app.js gắn bộ theo dõi khi tải, và bản đồ lộ trình tự đo lại ngay sau khi tạo (dự phòng)', () => {
    assert.match(app, /if \(typeof L !== 'undefined' && typeof ResizeObserver !== 'undefined'\) installLeafletAutoResize\(L, ResizeObserver\);/);
    const start = app.indexOf("this.map = L.map('leaflet-routing-map'");
    const created = app.slice(start, app.indexOf('    toggleTileLayer() {', start));
    assert.ok(start > 0 && created.length > 0);
    assert.match(created, /setTimeout\(\(\) => \{ if \(this\.map && typeof this\.map\.invalidateSize === 'function'\) this\.map\.invalidateSize\(\); \}, 250\);/);
});
