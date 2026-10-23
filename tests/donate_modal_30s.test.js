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
  const fn = new Function('localStorage', 'document', 'window', 'appNav', 'showToast', code);
  return fn(overrides.localStorage, overrides.document, overrides.window, overrides.appNav, overrides.showToast);
}

test('1. Startup checks daily trigger and configures 20s countdown support (Đồng hành cùng dự án)', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  let storageWrittenKey = null;
  let storageWrittenValue = null;
  const mockStorage = {
    getItem() { return null; },
    setItem(k, v) { storageWrittenKey = k; storageWrittenValue = v; }
  };
  const { document } = createMockDom();
  const windowEvents = {};
  const mockWindow = {
    addEventListener(evt, fn) { windowEvents[evt] = fn; }
  };

  const originalSetTimeout = global.setTimeout;
  let timerScheduled = false;
  let scheduledCallback = null;
  global.setTimeout = (cb) => {
    timerScheduled = true;
    scheduledCallback = cb;
  };

  try {
    const appDonate = extractAppDonate(appJs, { localStorage: mockStorage, document, window: mockWindow });
    assert.equal(appDonate.COUNTDOWN_SECONDS, 20, 'Đếm ngược đúng 20 giây');
    assert.equal(appDonate.STORAGE_KEY, 'vn2k_donate_last_shown_date_v1');
    assert.equal(typeof appDonate.checkDailyTrigger, 'function');

    appDonate.init();
    assert.equal(storageWrittenKey, 'vn2k_donate_last_shown_date_v1', 'Phải ghi nhớ ngày kích hoạt vào localStorage');
    assert.equal(timerScheduled, true, 'checkDailyTrigger phải lên lịch hiển thị sau khi UI ổn định');
    
    // Giả lập callback setTimeout kích hoạt mở modal
    scheduledCallback();
    const modal = document.getElementById('modalDonateCountdown');
    assert.equal(modal.classList.contains('active'), true, 'Modal phải được mở với đếm ngược');
    assert.equal(appDonate.isCountingDown, true, 'Trạng thái đếm ngược phải active');
    assert.equal(appDonate.remainingSeconds, 20, 'Thời gian còn lại khởi tạo 20s');
  } finally {
    global.setTimeout = originalSetTimeout;
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

test('3. Switching all 4 channels updates config and pill states and sets direct transfer link', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, channelPills, getOrCreate } = createMockDom();
  const appDonate = extractAppDonate(appJs, { document, window: {} });

  const channels = ['vietinbank', 'bidv', 'momo', 'zalopay'];
  const btnOpenApp = getOrCreate('btnDonateOpenApp');

  for (const ch of channels) {
    appDonate.setChannel(ch);
    assert.equal(appDonate.activeChannel, ch);
    assert.equal(appDonate.config.accountNumber, '0839656568');
    assert.ok(appDonate.config.openAppUrl, `Kênh ${ch} phải có link mở ứng dụng chuyển khoản trực tiếp`);
    assert.equal(btnOpenApp.style.display, 'inline-flex', `Kênh ${ch} phải hiển thị nút chuyển khoản ngay`);
    assert.equal(btnOpenApp.href, appDonate.config.openAppUrl, `Nút chuyển khoản của ${ch} phải gắn đúng deeplink`);
    const activePills = channelPills.filter(p => p.classList.contains('active'));
    assert.equal(activePills.length, 1);
    assert.equal(activePills[0].getAttribute('data-channel'), ch);
  }
});

test('4. Explicit opening from menu does not force countdown and allows free close', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, getOrCreate } = createMockDom();
  let treeMenuClosed = false;
  const mockAppNav = {
    closeTreeMenu() { treeMenuClosed = true; }
  };
  const appDonate = extractAppDonate(appJs, { document, window: {}, appNav: mockAppNav });

  const qr = getOrCreate('imgDonateVietQR');
  assert.equal(qr.src, '', 'QR image must have no src before opening');

  appDonate.openModal(false);
  assert.equal(treeMenuClosed, true, 'openModal must close tree menu via appNav.closeTreeMenu');
  const modal = getOrCreate('modalDonateCountdown');
  assert.equal(modal.classList.contains('active'), true, 'modal must be active');
  assert.notEqual(qr.src, '', 'QR image src must be populated upon open');
  assert.equal(appDonate.isCountingDown, false, 'Mở từ menu không bắt buộc đếm ngược');
  assert.equal(appDonate.remainingSeconds, 0, 'Số giây còn lại là 0');

  // Đóng modal tự do
  appDonate.closeModal();
  assert.equal(modal.classList.contains('active'), false, 'Đóng modal thành công');
});

test('5. Auto countdown mode prevents early close until 20s finished', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const { document, getOrCreate } = createMockDom();
  let toastMsg = '';
  const mockShowToast = (msg) => { toastMsg = msg; };
  const appDonate = extractAppDonate(appJs, { document, window: {}, showToast: mockShowToast });

  const modal = getOrCreate('modalDonateCountdown');
  appDonate.openModal(true); // Mở chế độ đếm ngược
  assert.equal(appDonate.isCountingDown, true);
  assert.equal(appDonate.remainingSeconds, 20);

  // Thử đóng trước khi hết 20s -> bị chặn và toast nhắc nhở
  appDonate.closeModal();
  assert.equal(modal.classList.contains('active'), true, 'Không cho phép đóng khi còn thời gian đếm ngược');
  assert.ok(toastMsg.includes('trước khi vào ứng dụng'), 'Thông báo lịch sự nhắc nhở chờ trước khi vào ứng dụng');

  // Giả lập hết 20s
  appDonate.remainingSeconds = 0;
  appDonate.unlockCloseButton();
  appDonate.closeModal();
  assert.equal(modal.classList.contains('active'), false, 'Hết 20s thì đóng modal thành công');
});

test('6. Escape key listener respects modal active state', () => {
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
