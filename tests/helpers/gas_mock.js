// Giả lập tối thiểu các dịch vụ Google Apps Script để chạy backend/TaiKhoan.gs trong Node (kiểm thử).
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const OWNER = 'owner@example.com';

function makeSheet(name) {
    const rows = [];
    return {
        _rows: rows,
        getName: () => name,
        appendRow(row) { rows.push(row.map((v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v))); },
        getDataRange() { return { getValues: () => rows.map((r) => r.slice()) }; },
        getRange(r, c, nr, nc) {
            return {
                setValue(v) { rows[r - 1][c - 1] = v; },
                setValues(vals) { vals.forEach((vr, i) => vr.forEach((v, j) => { rows[r - 1 + i][c - 1 + j] = v; })); }
            };
        },
        deleteRow(i) { rows.splice(i - 1, 1); },
        getLastRow: () => rows.length,
        setFrozenRows() {}
    };
}

function makeDrive() {
    const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
    function makeFile(name, content) {
        const f = { name, content, desc: '', trashed: false, updated: new Date() };
        return {
            _f: f,
            getName: () => f.name,
            setContent(c) { f.content = c; f.updated = new Date(); },
            getBlob: () => ({ getDataAsString: () => f.content }),
            getSize: () => Buffer.byteLength(f.content),
            getLastUpdated: () => f.updated,
            setDescription(d) { f.desc = d; },
            getDescription: () => f.desc,
            setTrashed(t) { f.trashed = t; },
            isTrashed: () => f.trashed
        };
    }
    function makeFolder(name) {
        const state = { name, folders: [], files: [], trashed: false };
        const live = (arr) => arr.filter((x) => !x.isTrashed());
        const folder = {
            _s: state,
            getName: () => state.name,
            isTrashed: () => state.trashed,
            setTrashed(t) { state.trashed = t; },
            getFoldersByName: (n) => iter(live(state.folders).filter((x) => x.getName() === n)),
            createFolder(n) { const sub = makeFolder(n); state.folders.push(sub); return sub; },
            getFiles: () => iter(live(state.files)),
            getFilesByName: (n) => iter(live(state.files).filter((x) => x.getName() === n)),
            createFile(n, c) { const f = makeFile(n, c); state.files.push(f); return f; }
        };
        return folder;
    }
    const root = makeFolder('My Drive');
    return { _root: root, getFoldersByName: (n) => root.getFoldersByName(n), createFolder: (n) => root.createFolder(n) };
}

/** Nạp backend với dịch vụ giả. Mã thông báo hợp lệ dạng "ok|email|Tên"; sai ứng dụng dạng "wrongaud|email". */
function loadBackend(opts) {
    const o = opts || {};
    const sheets = {};
    const props = Object.assign({ GOOGLE_CLIENT_ID: CLIENT_ID, ADMIN_EMAILS: '' }, o.props || {});
    const cache = {};
    const ctx = {
        console,
        Date,
        JSON,
        Math,
        SpreadsheetApp: {
            getActiveSpreadsheet: () => ({
                getSheetByName: (n) => sheets[n] || null,
                insertSheet: (n) => (sheets[n] = makeSheet(n))
            })
        },
        DriveApp: makeDrive(),
        UrlFetchApp: {
            fetch(url) {
                const tok = decodeURIComponent(String(url).split('id_token=')[1] || '');
                const [kind, email, name] = tok.split('|');
                if (kind !== 'ok' && kind !== 'wrongaud' && kind !== 'expired') return { getResponseCode: () => 400, getContentText: () => '{}' };
                const claims = {
                    aud: kind === 'wrongaud' ? 'someone-else.apps.googleusercontent.com' : CLIENT_ID,
                    iss: 'https://accounts.google.com',
                    exp: String(Math.floor(Date.now() / 1000) + (kind === 'expired' ? -10 : 3600)),
                    email_verified: 'true',
                    email,
                    name: name || email,
                    picture: 'https://example.com/a.png'
                };
                return { getResponseCode: () => 200, getContentText: () => JSON.stringify(claims) };
            }
        },
        PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperties: (p) => Object.assign(props, p) }) },
        CacheService: { getScriptCache: () => ({ get: (k) => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
        Utilities: {
            getUuid: () => crypto.randomUUID(),
            DigestAlgorithm: { SHA_256: 'sha256' },
            computeDigest: (alg, s) => [...crypto.createHash('sha256').update(String(s)).digest()].map((b) => (b > 127 ? b - 256 : b)),
            formatDate: (d, tz, fmt) => new Date(new Date(d).getTime() + 7 * 3600000).toISOString().slice(0, 10)
        },
        Session: { getEffectiveUser: () => ({ getEmail: () => OWNER }) },
        LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
        ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ _text: t, setMimeType() { return this; }, getContent() { return t; } }) }
    };
    vm.createContext(ctx);
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'backend', 'TaiKhoan.gs'), 'utf8');
    vm.runInContext(src, ctx, { filename: 'TaiKhoan.gs' });
    /** Gọi như ứng dụng: qua doPost với JSON, trả về object đã parse. */
    ctx.api = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
    ctx._sheets = sheets;
    ctx._props = props;
    return ctx;
}

module.exports = { loadBackend, CLIENT_ID, OWNER };
