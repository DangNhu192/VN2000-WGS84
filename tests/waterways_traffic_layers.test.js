const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('Planning map continuous zoom (1x-9x downscale fix)', (t) => {
    const planningMapCode = fs.readFileSync(path.join(ROOT, 'src', 'core', 'planning_map.js'), 'utf-8');
    
    // minZoom must be 1 so that zoom 1x to 9x keeps the planning layers visible
    assert.match(planningMapCode, /minZoom:\s*1[,\s]/, 'Planning map layer must have minZoom: 1');
    assert.match(planningMapCode, /minNativeZoom:\s*(minNative|8)[,\s]/, 'Planning map layer must have minNativeZoom: 8 to prevent 404s below zoom 8');
    assert.match(planningMapCode, /keepBuffer:\s*8[,\s]/, 'Planning map layer must keep buffer for smooth panning');
});

test('CSS Crisp rendering for planning map tiles at 10x-20x', (t) => {
    const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf-8');
    assert.ok(css.includes('.leaflet-layer-guland-planning img.leaflet-tile'), 'CSS must optimize guland planning tiles');
    assert.ok(css.includes('image-rendering: crisp-edges') || css.includes('image-rendering: -webkit-optimize-contrast'), 'CSS must include crisp-edges rendering');
});

test('Base Maps & Waterways/Traffic layers in app.js', (t) => {
    const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf-8');

    // Base Maps checks
    assert.ok(appJs.includes("id: 'google_streets'"), 'MAP_BASES must include google_streets');
    assert.ok(appJs.includes("id: 'opentopomap'"), 'MAP_BASES must include opentopomap (waterways/terrain)');
    assert.ok(appJs.includes("id: 'google_terrain'"), 'MAP_BASES must include google_terrain');

    // Overlays checks in appMapLayers
    assert.ok(appJs.includes('esri_transport: { on: false, opacity: 0.85 }'), 'appMapLayers defaults must include esri_transport');
    assert.ok(appJs.includes('google_roads: { on: false, opacity: 0.85 }'), 'appMapLayers defaults must include google_roads');
    assert.ok(appJs.includes('google_traffic: { on: false, opacity: 0.85 }'), 'appMapLayers defaults must include google_traffic');
    assert.ok(appJs.includes('openseamap: { on: false, opacity: 0.8 }'), 'appMapLayers defaults must include openseamap');

    // Overlay definitions check
    assert.ok(appJs.includes("id === 'esri_transport'"), '_overlayDef must define esri_transport');
    assert.ok(appJs.includes("id === 'google_roads'"), '_overlayDef must define google_roads');
    assert.ok(appJs.includes("id === 'google_traffic'"), '_overlayDef must define google_traffic');
    assert.ok(appJs.includes("id === 'openseamap'"), '_overlayDef must define openseamap');

    // Settings persistence check
    assert.ok(appJs.includes("'google_streets', 'opentopomap', 'google_terrain'"), 'appSettings must accept new base layer IDs');
});

test('Service Worker map tile bypass caching for smooth loading', (t) => {
    const swJs = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf-8');
    assert.ok(swJs.includes('opentopomap.org'), 'SW must recognize opentopomap.org');
    assert.ok(swJs.includes('openseamap.org'), 'SW must recognize openseamap.org');
    assert.ok(swJs.includes('arcgisonline.com'), 'SW must recognize arcgisonline.com');
    assert.ok(swJs.includes('guland.vn'), 'SW must recognize guland.vn');
    assert.ok(swJs.includes('vcdn.cloud'), 'SW must recognize vcdn.cloud');
});

test('index.html CDN preconnect and DNS prefetch', (t) => {
    const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes('https://server.arcgisonline.com'), 'index.html must preconnect arcgisonline.com');
    assert.ok(indexHtml.includes('https://tile.opentopomap.org'), 'index.html must preconnect opentopomap.org');
    assert.ok(indexHtml.includes('https://tiles.openseamap.org'), 'index.html must preconnect openseamap.org');
    assert.ok(indexHtml.includes('https://mt1.google.com'), 'index.html must preconnect mt1.google.com');
});

test('server.js tile proxy allowed hosts', (t) => {
    const serverJs = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf-8');
    assert.ok(serverJs.includes('opentopomap.org'), 'server.js must allow opentopomap.org');
    assert.ok(serverJs.includes('openseamap.org'), 'server.js must allow openseamap.org');
    assert.ok(serverJs.includes('google.com'), 'server.js must allow google.com');
});
