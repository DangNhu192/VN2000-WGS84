// v2.8.58: bộ dẫn đường lõi (src/core/nav_engine.js) — bám tuyến, nhắc giọng nhiều mốc, lệch tuyến, đến điểm dừng.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const N = require('../src/core/nav_engine.js');
const ROUTE = require('./fixtures/valhalla_route_caolanh.json').routes[0];   // Valhalla xe máy, 3 điểm, quay đầu ở điểm giữa

function drive(model, opts) {
    opts = Object.assign({ step: 12, noise: 8, speed: 8 }, opts);
    const tr = N.createTracker(model);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ev = { said: [], arrived: [], back: 0, off: 0, last: null };
    let prev = 0;
    for (let a = 0; a <= model.total + 30; a += opts.step) {
        const p = N.pointAt(model, Math.min(a, model.total));
        const s = tr.update({ lat: p.lat + (rnd() - 0.5) * opts.noise / 111000, lng: p.lng + (rnd() - 0.5) * opts.noise / 109000, accuracy: 6, speed: opts.speed });
        if (s.along < prev - 1) ev.back++;
        prev = s.along;
        if (s.announce) ev.said.push(s.announce);
        if (s.arrivedLeg !== null) ev.arrived.push(s.arrivedLeg);
        if (s.offRoute) ev.off++;
        ev.last = s;
    }
    return ev;
}

test('dựng tuyến từ Valhalla: quãng đường, bước, chặng, thời gian', () => {
    const m = N.prepare(ROUTE, ['A', 'M2', 'M3']);
    assert.ok(Math.abs(m.total - ROUTE.distance) < 15, `tổng ${m.total} ≈ ${ROUTE.distance}`);
    assert.equal(m.legEnds.length, 2);
    assert.ok(Math.abs(m.legEnds[0] - ROUTE.legs[0].distance) < 10);
    assert.ok(Math.abs(m.totalTime - ROUTE.duration) < 1);
    // lời nhắc Valhalla: tính từ CUỐI bước
    const ql30 = m.steps.find(s => s.name === 'Nguyễn Huệ' && s.len > 1000);
    assert.ok(ql30.voice.some(v => /Trong 300 mét nữa/.test(v.text) && Math.abs((ql30.end - v.at) - 271.5) < 0.5));
});

test('đi hết tuyến có nhiễu GPS: không nhảy lùi (kể cả đoạn quay đầu), nhắc đúng thứ tự, báo đến từng điểm', () => {
    const m = N.prepare(ROUTE, ['A', 'M2', 'M3']);
    const ev = drive(m);
    assert.equal(ev.back, 0, 'tiến độ không lùi');
    assert.equal(ev.off, 0, 'không báo lệch tuyến khi vẫn đi đúng');
    assert.deepEqual(ev.arrived, [0, 1]);
    assert.ok(ev.last.finished);
    const idx = (re) => ev.said.findIndex(t => re.test(t));
    const order = [/Rẽ phải vào Nguyễn Huệ/, /Tiếp tục đi trên QL.30/, /Trong 300 mét nữa, Đi vào vòng xuyến/, /Rẽ phải vào Phù Đổng/, /Đã đến điểm M2/, /Rẽ phải vào Trần Hưng Đạo/, /Tiếp tục đi thêm 2 ki-lô-mét/, /điểm cuối của lộ trình/];
    const pos = order.map(idx);
    assert.ok(pos.every(p => p >= 0), 'đủ các lời nhắc chính: ' + JSON.stringify(ev.said));
    assert.deepEqual(pos.slice().sort((a, b) => a - b), pos, 'đúng thứ tự');
    assert.equal(new Set(ev.said).size >= ev.said.length - 2, true, 'không nhắc lặp');
});

test('đi lệch tuyến → báo lệch sau vài lần đo; quay lại tuyến → hết báo', () => {
    const m = N.prepare(ROUTE, ['A', 'M2', 'M3']);
    const tr = N.createTracker(m);
    const p = N.pointAt(m, 600);
    tr.update({ lat: p.lat, lng: p.lng, accuracy: 5, speed: 8 });
    let s;
    for (let i = 1; i <= 3; i++) s = tr.update({ lat: p.lat + 0.0012, lng: p.lng, accuracy: 5, speed: 8 });   // lệch ~130 m
    assert.equal(s.offRoute, true);
    s = tr.update({ lat: p.lat, lng: p.lng, accuracy: 5, speed: 8 });
    assert.equal(s.offRoute, false);
    // GPS kém (±150 m) bị bỏ qua, không làm nhảy vị trí
    const before = s.along;
    s = tr.update({ lat: p.lat + 0.01, lng: p.lng, accuracy: 150, speed: 8 });
    assert.equal(s.quality, 'poor'); assert.equal(s.along, before);
});

test('nguồn OSRM (không có lời nhắc sẵn): tự soạn lời nhắc tiếng Việt nhiều mốc', () => {
    const bare = JSON.parse(JSON.stringify(ROUTE));
    bare.legs.forEach(l => l.steps.forEach(s => { delete s.voiceInstructions; delete s.bannerInstructions; delete s.maneuver.instruction; }));
    const m = N.prepare(bare, ['A', 'M2', 'M3']);
    const ev = drive(m);
    assert.ok(ev.said.some(t => /^Sau 500 mét, rẽ phải vào Trần Hưng Đạo|^Sau 200 mét, /.test(t)), JSON.stringify(ev.said));
    assert.ok(ev.said.some(t => /Vào vòng xuyến, ra ở lối thứ 3/i.test(t)));
    assert.deepEqual(ev.arrived, [0, 1]);
});

test('đường nối thẳng khi ngoại tuyến vẫn dẫn được tới đích', () => {
    const m = N.prepare({ distance: 1000, duration: 120, geometry: { coordinates: [[105.63, 10.45], [105.64, 10.455]] }, legs: [] }, ['A', 'B']);
    const ev = drive(m, { step: 20 });
    assert.ok(ev.last.finished);
});

test('định dạng & cắt tuyến để vẽ phần đã đi / còn lại', () => {
    assert.equal(N.fmtDist(47), '50 m'); assert.equal(N.fmtDist(1234), '1,2 km'); assert.equal(N.fmtDist(15400), '15 km');
    assert.equal(N.fmtDuration(65 * 60), '1 giờ 5 phút');
    const m = N.prepare(ROUTE);
    const a = N.slice(m, 0, 1000), b = N.slice(m, 1000);
    assert.deepEqual(a[a.length - 1], b[0]);
    assert.equal(N.iconKind({ type: 'turn', modifier: 'slight left' }), 'slight-left');
    assert.equal(N.iconKind({ type: 'roundabout', modifier: 'straight' }), 'roundabout-straight');
});

test('app: dùng Valhalla (xe máy, tiếng Việt) → OSRM → nối thẳng; dẫn đường dùng bộ lõi; giao diện dẫn đường', () => {
    const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    assert.ok(app.includes("const costing = this.vehicle === 'bike' ? 'motor_scooter' : (this.vehicle === 'minibus' ? 'bus' : 'auto');"));
    assert.ok(app.includes("directions_options: { language: 'vi-VN', units: 'kilometers' }") && app.includes('voice_instructions: true'));
    assert.ok(app.includes("OSRM_URLS: ['https://routing.openstreetmap.de/routed-car', 'https://router.project-osrm.org']"));
    assert.ok(app.includes('NavEngine.createTracker(this.navModel)') && app.includes('this._reroute({ lat, lng, heading: hdg }, s)'));
    for (const id of ['routingNavCard', 'rnavIcon', 'rnavDist', 'rnavText', 'rnavThen', 'routingNavBanner', 'btnRnavRecenter', 'routingNavBar', 'rnavEta', 'rnavRemain', 'btnRoutingSimulate'])
        assert.ok(html.includes(`id="${id}"`), id);
    assert.ok(html.indexOf('src/core/nav_engine.js') > 0 && html.indexOf('src/core/nav_engine.js') < html.indexOf('<script src="app.js'));
    assert.ok(sw.includes("'./src/core/nav_engine.js'"));
});
