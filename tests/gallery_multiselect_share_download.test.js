/**
 * KIỂM THỬ CHỌN NHIỀU HÌNH ẢNH / VIDEO TRONG THƯ VIỆN (GPS LIVE SHOTS GALLERY)
 * - Chọn 2 hoặc nhiều ảnh bằng checkbox trên thẻ hoặc chế độ "Chọn nhiều"
 * - Gửi / Chia sẻ nhiều tệp qua Web Share API Level 2 (và fallback ZIP trên trình duyệt không hỗ trợ)
 * - Tải rời từng ảnh đã chọn và đóng gói tải 1 tệp ZIP chuẩn PKZIP (CRC-32 + UTF-8)
 * - Xóa chọn lọc nhiều ảnh đã chọn
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const uiPolishCss = fs.readFileSync(path.join(ROOT, 'ui-polish.css'), 'utf8');
const uiUnifiedCss = fs.readFileSync(path.join(ROOT, 'ui-unified.css'), 'utf8');

function extractAppCameraSandbox(overrides = {}) {
    const startIdx = appJs.indexOf('const appCamera = {');
    const endIdx = appJs.indexOf('// ================= 9.0 CÀI ĐẶT NGÀY GIỜ', startIdx);
    assert.ok(startIdx > 0 && endIdx > startIdx, 'Phải tìm thấy khối const appCamera trong app.js');
    const camSrc = appJs.slice(startIdx, endIdx);

    const elements = {};
    const makeEl = (id, tag = 'div') => {
        const classes = new Set();
        const el = {
            id,
            tagName: tag.toUpperCase(),
            style: {},
            innerText: '',
            textContent: '',
            innerHTML: '',
            checked: false,
            indeterminate: false,
            disabled: false,
            classList: {
                add: (...cs) => cs.forEach(c => classes.add(c)),
                remove: (...cs) => cs.forEach(c => classes.delete(c)),
                toggle: (c, force) => {
                    const on = force !== undefined ? !!force : !classes.has(c);
                    if (on) classes.add(c); else classes.delete(c);
                    return on;
                },
                contains: (c) => classes.has(c)
            },
            querySelectorAll: () => [],
            remove() {}
        };
        elements[id] = el;
        return el;
    };

    [
        'txtCameraGalleryCount', 'cameraGalleryGrid', 'cameraGalleryEmptyState',
        'barGalleryBatchActions', 'btnGallerySelectMode', 'chkGallerySelectAll',
        'txtGallerySelectedCount', 'txtGalleryTotalCount', 'txtGalleryShareCount',
        'txtGalleryDownloadCount', 'txtGalleryZipCount', 'txtGalleryDeleteCount',
        'txtGalleryDownloadLabel', 'btnGalleryShareSelected', 'btnGalleryDownloadSelected',
        'btnGalleryZipSelected', 'btnGalleryDeleteSelected'
    ].forEach(id => makeEl(id));

    const downloads = [];
    const toasts = [];
    const blobStore = new Map();
    let blobSeq = 0;

    class MockFile extends Blob {
        constructor(parts, name, opts = {}) {
            super(parts, opts);
            this.name = name;
            this.lastModified = opts.lastModified || Date.now();
        }
    }

    const ctx = {
        console,
        Math,
        Date,
        Set,
        Map,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Uint8Array,
        Uint32Array,
        DataView,
        ArrayBuffer,
        Blob,
        File: MockFile,
        TextEncoder,
        Promise,
        atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
        btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
        setTimeout: (fn) => { fn(); return 1; },
        clearTimeout: () => {},
        confirm: () => true,
        showToast: (msg, isErr) => toasts.push({ msg, isErr: !!isErr }),
        AppState: { currentProject: 'DuAn_Test' },
        getAppEffectiveDate: () => new Date(2026, 10, 26, 14, 30, 0),
        URL: {
            createObjectURL: (blob) => {
                const u = `blob:mock/${++blobSeq}`;
                blobStore.set(u, blob);
                return u;
            },
            revokeObjectURL: () => {}
        },
        navigator: overrides.navigator || {},
        document: {
            getElementById: (id) => elements[id] || null,
            createElement: (tag) => {
                const el = {
                    tagName: tag.toUpperCase(),
                    download: '',
                    href: '',
                    parentNode: null,
                    click() {
                        downloads.push({
                            filename: this.download,
                            href: this.href,
                            blob: blobStore.get(this.href) || null
                        });
                    }
                };
                return el;
            },
            body: {
                appendChild(el) { el.parentNode = this; return el; },
                removeChild(el) { el.parentNode = null; return el; }
            }
        }
    };

    vm.createContext(ctx);
    vm.runInContext(`${camSrc}\nthis.__appCamera = appCamera;`, ctx);
    return { appCamera: ctx.__appCamera, elements, downloads, toasts, ctx };
}

test('1. Giao diện HTML & CSS đầy đủ cho chọn nhiều ảnh (gửi, tải rời, tải ZIP, xóa)', () => {
    for (const id of [
        'btnGallerySelectMode',
        'barGalleryBatchActions',
        'chkGallerySelectAll',
        'txtGallerySelectedCount',
        'btnGalleryShareSelected',
        'btnGalleryDownloadSelected',
        'btnGalleryZipSelected',
        'btnGalleryDeleteSelected'
    ]) {
        assert.ok(indexHtml.includes(`id="${id}"`), `Thiếu phần tử #${id} trong index.html`);
    }
    assert.ok(indexHtml.includes('appCamera.toggleGallerySelectMode()'));
    assert.ok(indexHtml.includes('appCamera.toggleSelectAllGallery(this.checked)'));
    assert.ok(indexHtml.includes('appCamera.shareSelectedMedia()'));
    assert.ok(indexHtml.includes('appCamera.downloadSelectedMedia()'));
    assert.ok(indexHtml.includes('appCamera.downloadSelectedMediaZip()'));
    assert.ok(indexHtml.includes('appCamera.deleteSelectedMedia()'));

    assert.ok(uiPolishCss.includes('.camera-gallery-batch-bar'));
    assert.ok(uiPolishCss.includes('.camera-select-overlay'));
    assert.ok(uiPolishCss.includes('.camera-gallery-card.is-selected'));
    assert.ok(uiUnifiedCss.includes('#screen-camera #btnGallerySelectMode.active'));
});

test('2. Chọn 2+ ảnh trong thư viện cập nhật đúng thanh tác vụ, chọn tất cả & thoát chế độ chọn', async () => {
    const { appCamera, elements } = extractAppCameraSandbox();
    const imgB64 = 'data:image/jpeg;base64,' + Buffer.from('FAKE_JPEG_DATA_1').toString('base64');
    const items = [
        { id: 1001, type: 'photo', markName: 'M1', projectName: 'P1', x: '1150000.000', y: '560000.000', dateStr: '26/11/2026', dataUrl: imgB64 },
        { id: 1002, type: 'photo', markName: 'M2', projectName: 'P1', x: '1150010.000', y: '560020.000', dateStr: '26/11/2026', dataUrl: imgB64 },
        { id: 1003, type: 'video', markName: 'M3', projectName: 'P1', x: '1150020.000', y: '560030.000', dateStr: '26/11/2026', dataUrl: 'data:video/webm;base64,' + Buffer.from('FAKE_WEBM').toString('base64') }
    ];
    appCamera.db.getAll = async () => items.slice();

    await appCamera.loadGalleryFromDb();
    assert.equal(elements.barGalleryBatchActions.style.display, 'none', 'Chưa chọn ảnh thì thanh tác vụ phải ẩn');
    assert.ok(elements.cameraGalleryGrid.innerHTML.includes('class="camera-select-chk"'), 'Thẻ ảnh phải có checkbox chọn');

    // Tích chọn ảnh 1 trực tiếp
    appCamera.toggleGallerySelection(1001);
    assert.equal(elements.barGalleryBatchActions.style.display, 'flex');
    assert.equal(elements.txtGallerySelectedCount.textContent, '1');
    assert.equal(elements.btnGalleryZipSelected.style.display, 'none', 'Chọn 1 ảnh không cần nút ZIP');
    assert.equal(elements.txtGalleryDownloadLabel.textContent, 'Tải về');
    assert.equal(elements.btnGalleryShareSelected.disabled, false);

    // Tích chọn ảnh 2 (đủ 2 ảnh -> bật nút ZIP và đổi nhãn thành Tải từng ảnh)
    appCamera.toggleGallerySelection(1002);
    assert.equal(elements.txtGallerySelectedCount.textContent, '2');
    assert.equal(elements.btnGalleryZipSelected.style.display, 'inline-flex', 'Chọn >= 2 ảnh phải hiện nút Tải gói ZIP');
    assert.equal(elements.btnGalleryZipSelected.disabled, false);
    assert.equal(elements.txtGalleryDownloadLabel.textContent, 'Tải từng ảnh');
    assert.equal(elements.chkGallerySelectAll.indeterminate, true);

    // Bấm "✕ Xong chọn" phải thoát sạch kể cả khi chưa từng bấm nút "Chọn nhiều" trước đó
    appCamera.toggleGallerySelectMode();
    assert.equal(appCamera.selectedGalleryIds.size, 0);
    assert.equal(elements.barGalleryBatchActions.style.display, 'none');

    // Chọn tất cả
    appCamera.toggleSelectAllGallery(true);
    assert.equal(appCamera.selectedGalleryIds.size, 3);
    assert.equal(elements.chkGallerySelectAll.checked, true);
    assert.equal(elements.txtGallerySelectedCount.textContent, '3');
});

test('3. Gửi / Chia sẻ 2+ ảnh qua Web Share API Level 2 và fallback tải gói ZIP hợp lệ', async () => {
    const jpeg1 = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 0xFF, 0xD9]);
    const jpeg2 = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 5, 6, 7, 8, 9, 0xFF, 0xD9]);
    const items = [
        { id: 2001, type: 'photo', markName: 'Mốc A/1', projectName: 'Tuyến ĐT', x: '1150001', y: '560001', dateStr: '26/11/2026', dataUrl: 'data:image/jpeg;base64,' + jpeg1.toString('base64') },
        { id: 2002, type: 'photo', markName: 'Mốc B:2', projectName: 'Tuyến ĐT', x: '1150002', y: '560002', dateStr: '26/11/2026', dataUrl: 'data:image/jpeg;base64,' + jpeg2.toString('base64') }
    ];

    // 3a. Trình duyệt hỗ trợ Web Share Level 2 với nhiều File (Android / iOS)
    const shareCalls = [];
    const envShare = extractAppCameraSandbox({
        navigator: {
            canShare: (payload) => Array.isArray(payload.files) && payload.files.length >= 2,
            share: async (payload) => { shareCalls.push(payload); }
        }
    });
    envShare.appCamera.db.getAll = async () => items.slice();
    await envShare.appCamera.loadGalleryFromDb();
    envShare.appCamera.toggleSelectAllGallery(true);
    await envShare.appCamera.shareSelectedMedia();

    assert.equal(shareCalls.length, 1, 'Phải gọi navigator.share đúng 1 lần với toàn bộ tệp đã chọn');
    assert.equal(shareCalls[0].files.length, 2, 'Phải gửi kèm cả 2 tệp ảnh');
    assert.ok(shareCalls[0].files[0].name.endsWith('.jpg'));
    assert.ok(!/[/:*?"<>|]/.test(shareCalls[0].files[0].name), 'Tên tệp chia sẻ phải loại bỏ ký tự đặc biệt cấm');
    assert.equal(shareCalls[0].files[1].type, 'image/jpeg');

    // 3b. Trình duyệt Desktop không hỗ trợ Web Share nhiều tệp -> đóng gói & tải 1 tệp ZIP chuẩn PKZIP
    const envDesktop = extractAppCameraSandbox({ navigator: {} });
    envDesktop.appCamera.db.getAll = async () => items.slice();
    await envDesktop.appCamera.loadGalleryFromDb();
    envDesktop.appCamera.toggleSelectAllGallery(true);
    await envDesktop.appCamera.shareSelectedMedia();

    assert.equal(envDesktop.downloads.length, 1, 'Fallback desktop phải tải đúng 1 tệp ZIP');
    assert.ok(envDesktop.downloads[0].filename.endsWith('.zip'));
    const zipBuf = Buffer.from(await envDesktop.downloads[0].blob.arrayBuffer());
    assert.equal(zipBuf.readUInt32LE(0), 0x04034b50, 'Local file header signature PKZIP phải hợp lệ');
    assert.equal(zipBuf.readUInt16LE(6), 0x0800, 'Cờ UTF-8 filename trong ZIP phải bật');
    const eocdOff = zipBuf.length - 22;
    assert.equal(zipBuf.readUInt32LE(eocdOff), 0x06054b50, 'EOCD signature PKZIP phải hợp lệ');
    assert.equal(zipBuf.readUInt16LE(eocdOff + 10), 2, 'Tệp ZIP phải chứa đúng 2 mục');
    // Kiểm tra CRC-32 của tệp đầu khớp chuẩn zlib.crc32 (nếu Node hỗ trợ) hoặc byte dữ liệu khớp 100%
    const nameLen1 = zipBuf.readUInt16LE(26);
    const size1 = zipBuf.readUInt32LE(18);
    assert.equal(size1, jpeg1.length);
    const extracted1 = zipBuf.subarray(30 + nameLen1, 30 + nameLen1 + size1);
    assert.deepEqual(extracted1, jpeg1, 'Dữ liệu ảnh 1 trong gói ZIP phải khớp từng byte gốc');
    if (typeof zlib.crc32 === 'function') {
        assert.equal(zipBuf.readUInt32LE(14), zlib.crc32(jpeg1) >>> 0, 'CRC-32 tệp 1 trong ZIP phải chuẩn IEEE');
    }
});

test('4. Tải rời nhiều ảnh đã chọn & xóa chọn lọc chỉ xóa các ảnh đang tích chọn', async () => {
    const imgB64 = 'data:image/jpeg;base64,' + Buffer.from('IMG_BYTES').toString('base64');
    let store = [
        { id: 3001, type: 'photo', markName: 'M1', dataUrl: imgB64 },
        { id: 3002, type: 'photo', markName: 'M2', dataUrl: imgB64 },
        { id: 3003, type: 'photo', markName: 'M3', dataUrl: imgB64 }
    ];
    const { appCamera, downloads } = extractAppCameraSandbox();
    appCamera.db.getAll = async () => store.slice();
    appCamera.db.deleteItem = async (id) => { store = store.filter(x => x.id !== id); };

    await appCamera.loadGalleryFromDb();
    appCamera.toggleGallerySelection(3001);
    appCamera.toggleGallerySelection(3003);

    // Tải rời 2 ảnh đã chọn (không tải M2)
    await appCamera.downloadSelectedMedia();
    assert.equal(downloads.length, 2, 'Phải tải đúng 2 tệp đã chọn');
    assert.ok(downloads[0].filename.includes('M1'));
    assert.ok(downloads[1].filename.includes('M3'));

    // Xóa 2 ảnh đã chọn -> còn lại duy nhất M2
    await appCamera.deleteSelectedMedia();
    assert.equal(store.length, 1);
    assert.equal(store[0].id, 3002, 'Ảnh không được chọn phải được giữ nguyên');
    assert.equal(appCamera.selectedGalleryIds.size, 0);
});
