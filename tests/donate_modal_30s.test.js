const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function createMockDom() {
  const elements = {};
  function getOrCreate(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        classList: {
          _classes: new Set(),
          add(c) { this._classes.add(c); },
          remove(c) { this._classes.delete(c); },
          contains(c) { return this._classes.has(c); }
        },
        attributes: {},
        setAttribute(k, v) { this.attributes[k] = String(v); },
        getAttribute(k) { return this.attributes[k] || null; },
        style: {},
        focusCalled: false,
        focus() { this.focusCalled = true; },
        innerText: '',
        innerHTML: '',
        src: '',
        href: '',
        disabled: false
      };
    }
    return elements[id];
  }

  const channelPills = ['vietinbank', 'bidv', 'momo', 'zalopay'].map(ch => {
    const pill = {
      attributes: { 'data-channel': ch },
      getAttribute(k) { return this.attributes[k]; },
      classList: {
        _classes: new Set(ch === 'vietinbank' ? ['active'] : []),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      }
    };
    return pill;
  });

  return {
    elements,
    getOrCreate,
    document: {
      getElementById(id) { return getOrCreate(id); },
      querySelectorAll(sel) {
        if (sel === '.donate-channel-pill') return channelPills;
        return [];
      }
    },
    channelPills
  };
}

function extractAppDonate(appJsContent, overrides = {}) {
  const startIdx = appJsContent.indexOf('const appDonate = {');
  assert.ok(startIdx !== -1, 'app.js must contain appDonate');
  const endIdx = appJsContent.indexOf('// ================= 11. KHỞI TẠO ỨNG DỤNG', startIdx);
  const code = appJsContent.slice(startIdx, endIdx !== -1 ? endIdx : undefined) + '\nreturn appDonate;';
  const fn = new Function('localStorage', 'document', 'window', 'appNav', code);
  return fn(overrides.localStorage, overrides.document, overrides.window, overrides.appNav);
}

test('1. Startup does not open modal, write storage, or schedule timers', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  let storageWritten = false;
  const mockStorage = {
    getItem() { return null; },
    setItem() { storageWritten = true; }
  };
  const { document } = createMockDom();
  const windowEvents = {};
  const mockWindow = {
    addEventListener(evt, fn) { windowEvents[evt] = fn; }
  };

  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;
  let timerScheduled = false;
  global.setTimeout = () => { timerScheduled = true; };
  global.setInterval = () => { timerScheduled = true; };

  try {
    const appDonate = extractAppDonate(appJs, { localStorage: mockStorage, document, window: mockWindow });
    assert.equal(appDonate.timerId, undefined);
    assert.equal(appDonate.COUNTDOWN_SECONDS, undefined);
    assert.equal(appDonate.STORAGE_KEY, undefined);
    assert.equal(appDonate.checkDailyTrigger, undefined);

    appDonate.init();
    assert.equal(storageWritten, false, 'init must not write storage');
    assert.equal(timerScheduled, false, 'init must not schedule timers');
    const modal = document.getElementById('modalDonateCountdown');
    assert.equal(modal.classList.contains('active'), false, 'init must not open modal');
  } finally {
    global.setTimeout = originalSetTimeout;
    global.setInterval = originalSetInterval;
  }
});

test('2. Startup handles blocked localStorage gracefully', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const blockedStorage = {
    getItem() { throw new Error('Blocked localStorage'); },
    setItem() { throw new Error('Blocked localStorage'); }
  };
  const { document } = createMockDom();
  const mockWindow = { addEventListener() {} };
  const appDonate = extractAppDonate(appJs, { localStorage: blockedStorage, document, window: mockWindow });
  assert.doesNotThrow(() => appDonate.init(), 'init should not throw if localStorage is blocked');
});

test('3. Switching all 4 channels updates config and pill states', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, channelPills } = createMockDom();
  const appDonate = extractAppDonate(appJs, { document, window: {} });

  const channels = ['vietinbank', 'bidv', 'momo', 'zalopay'];
  for (const ch of channels) {
    appDonate.setChannel(ch);
    assert.equal(appDonate.activeChannel, ch);
    assert.equal(appDonate.config.accountNumber, '0839656568');
    const activePills = channelPills.filter(p => p.classList.contains('active'));
    assert.equal(activePills.length, 1);
    assert.equal(activePills[0].getAttribute('data-channel'), ch);
  }
});

test('4. Explicit opening closes tree menu, displays modal, sets QR src, and focuses close button', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, getOrCreate } = createMockDom();
  let treeMenuClosed = false;
  const mockAppNav = {
    closeTreeMenu() { treeMenuClosed = true; }
  };
  const appDonate = extractAppDonate(appJs, { document, window: {}, appNav: mockAppNav });

  const qr = getOrCreate('imgDonateVietQR');
  assert.equal(qr.src, '', 'QR image must have no src before opening');

  appDonate.openModal();
  assert.equal(treeMenuClosed, true, 'openModal must close tree menu via appNav.closeTreeMenu');
  const modal = getOrCreate('modalDonateCountdown');
  assert.equal(modal.classList.contains('active'), true, 'modal must be active');
  assert.notEqual(qr.src, '', 'QR image src must be populated upon explicit open');
  const closeBtn = getOrCreate('btnDonateEnterApp');
  assert.equal(closeBtn.focusCalled, true, 'Close button must receive focus');
});

test('5. Immediate close hides modal and returns focus to btnHeaderMenu', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, getOrCreate } = createMockDom();
  const appDonate = extractAppDonate(appJs, { document, window: {} });

  const modal = getOrCreate('modalDonateCountdown');
  modal.classList.add('active');
  const menuBtn = getOrCreate('btnHeaderMenu');

  appDonate.closeModal();
  assert.equal(modal.classList.contains('active'), false, 'closeModal must hide modal immediately');
  assert.equal(menuBtn.focusCalled, true, 'closeModal must return focus to btnHeaderMenu');
});

test('6. Escape key listener closes modal only when modal is active', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, getOrCreate } = createMockDom();
  let keydownHandler = null;
  const mockWindow = {
    addEventListener(evt, fn) {
      if (evt === 'keydown') keydownHandler = fn;
    }
  };
  const appDonate = extractAppDonate(appJs, { document, window: mockWindow });
  appDonate.init();
  assert.ok(keydownHandler, 'keydown handler must be registered in init');

  const modal = getOrCreate('modalDonateCountdown');
  let closeCalled = false;
  appDonate.closeModal = () => { closeCalled = true; };

  modal.classList.remove('active');
  keydownHandler({ key: 'Escape' });
  assert.equal(closeCalled, false, 'Escape should not trigger close if modal is not active');

  modal.classList.add('active');
  keydownHandler({ key: 'Escape' });
  assert.equal(closeCalled, true, 'Escape must trigger close when modal is active');
});
