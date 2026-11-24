/* Trợ lý cục bộ — LÕI (không giao diện, chạy được cả trên Node để kiểm thử).
   Ý tưởng học từ Ivy AI (github.com/iamankushpandit/esp_ai), viết lại hoàn toàn, không dùng mã của dự án đó:
   1) Câu nào máy tự trả lời chắc chắn được thì trả lời bằng mã thường, gắn nhãn "Không dùng AI"
      (Ivy: giờ, ngày, hẹn giờ do code C trả lời). Ở đây: mọi phép chuyển đổi tọa độ, khoảng cách,
      KTT, điều hướng, kiểm thử — KHÔNG BAO GIỜ để mô hình ngôn ngữ tính số.
   2) Mô hình AI (nếu người dùng bật) chỉ làm một việc: đổi câu nói tự do thành MỘT lệnh chuẩn trong danh sách,
      rồi lệnh đó lại đi qua bộ định tuyến này. Không khớp → lịch sự từ chối thay vì "bịa".
   3) Chạy theo pha, giải phóng tài nguyên sau mỗi pha (Ivy: Listen → Think → Speak trên cùng một vùng nhớ). */
(function (root) {
    'use strict';

    /** Chuẩn hóa để so khớp: thường, bỏ dấu, đ→d, gọn khoảng trắng. */
    function fold(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/đ/g, 'd').replace(/[“”"']/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // ---------------- Số & tọa độ ----------------
    /** Lấy các số trong câu. Hiểu dấu phẩy thập phân kiểu Việt ("10,776889") và dấu phẩy phân cách ("10.77, 106.70"),
        độ-phút-giây ("10°46'36.8\"") và nhóm nghìn kiểu "1 191 234,567". */
    function extractNumbers(text) {
        let t = String(text || '').replace(/[′]/g, "'").replace(/[″]/g, '"');
        const out = [];
        // Độ-phút-giây trước: 10°46'36.8" hoặc 10°46.613'
        t = t.replace(/(-?\d{1,3})\s*°\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*')?\s*(?:(\d{1,2}(?:[.,]\d+)?)\s*")?/g, (m, d, mi, s) => {
            const v = Math.abs(+d) + (mi ? +mi.replace(',', '.') / 60 : 0) + (s ? +s.replace(',', '.') / 3600 : 0);
            out.push({ at: t.indexOf(m), v: (+d < 0 ? -v : v) });
            return ' '.repeat(m.length);
        });
        // Nhóm nghìn bằng khoảng trắng: "1 191 234,567" → "1191234,567"
        t = t.replace(/(?<![\d.,])(\d{1,3})((?: \d{3})+)(?=[.,]\d|\b)/g, (m, a, b) => (a + b).replace(/ /g, ''));
        const re = /-?\d+(?:[.,]\d+)*/g;
        let m;
        while ((m = re.exec(t))) {
            let s = m[0];
            const dots = (s.match(/\./g) || []).length, commas = (s.match(/,/g) || []).length;
            if (dots > 1 && commas <= 1) s = s.replace(/\./g, '').replace(',', '.');      // 1.191.234,567
            else if (commas > 1 && dots <= 1) s = s.replace(/,/g, '');                     // 1,191,234.567
            else if (dots === 1 && commas === 1) s = s.indexOf('.') < s.indexOf(',') ? s.replace('.', '').replace(',', '.') : s.replace(',', '');
            else s = s.replace(',', '.');                                                  // 10,776889 → 10.776889
            const v = parseFloat(s);
            if (Number.isFinite(v)) out.push({ at: m.index, v });
        }
        return out.sort((a, b) => a.at - b.at).map(o => o.v);
    }

    const isLat = v => v >= 7 && v <= 24;
    const isLng = v => v >= 101 && v <= 118;
    const isX = v => v >= 700000 && v <= 2800000;
    const isY = v => v >= 50000 && v <= 950000;

    /** Đọc cặp tọa độ: {kind:'wgs', lat, lng} | {kind:'vn2k', X, Y} | null */
    function readPair(a, b) {
        if (isLat(a) && isLng(b)) return { kind: 'wgs', lat: a, lng: b };
        if (isLng(a) && isLat(b)) return { kind: 'wgs', lat: b, lng: a };
        if (isX(a) && isY(b)) return { kind: 'vn2k', X: a, Y: b };
        if (isY(a) && isX(b)) return { kind: 'vn2k', X: b, Y: a };
        return null;
    }

    // ---------------- Tỉnh / KTT ----------------
    function provinceKey(name) { return fold(name).replace(/^(tp\.?|thanh pho|tinh)\s+/, '').replace(/[–-]/g, ' ').replace(/\s+/g, ' ').trim(); }

    /** Tìm tỉnh được nhắc trong câu; ưu tiên danh sách 34 tỉnh sau 01/07/2025, rồi tên dài nhất. Trả về chỉ số trong list. */
    function findProvince(text, list) {
        const t = ' ' + fold(text).replace(/[–\-.,;:!?()]/g, ' ').replace(/\s+/g, ' ').replace(/\b(tp ?hcm|hcm|sai gon|tphcm)\b/g, 'ho chi minh') + ' ';
        let best = -1, bestScore = -1;
        (list || []).forEach((p, i) => {
            const k = provinceKey(p.name);
            if (k.length < 3 || t.indexOf(' ' + k + ' ') < 0) return;
            const score = k.length * 10 + (p.era === '2025' ? 5 : 0);
            if (score > bestScore) { best = i; bestScore = score; }
        });
        return best;
    }

    // ---------------- Chức năng để mở (đi theo mục menu ☰) ----------------
    // [id mục menu, các cách gọi (đã bỏ dấu)]
    const FEATURES = [
        ['drawerItem_home', ['trang chu', 'man hinh chinh', 'home']],
        ['drawerItem_transform', ['chuyen doi don diem', 'chuyen doi toa do', 'man chuyen doi', 'chuyen doi']],
        ['drawerItem_batch', ['chuyen doi hang loat', 'hang loat', 'nhieu diem', 'nhap excel', 'nhap file csv']],
        ['drawerItem_rezone', ['doi ktt', 'doi mui chieu', 'doi mui']],
        ['drawerItem_transform_map', ['cham toa do', 'cham diem tren ban do', 'lay toa do tren ban do', 'cham ban do']],
        ['drawerItem_map', ['ban do du an', 'ban do', 'xem moc', 'ban do moc']],
        ['drawerItem_stakeout', ['cam moc', 'stakeout', 'tim moc', 'dan duong toi moc']],
        ['drawerItem_camera', ['camera', 'chup anh', 'may anh', 'anh dong dau']],
        ['drawerItem_settings_rtk', ['rtk', 'may thu gnss', 'bluetooth']],
        ['drawerItem_routing', ['lo trinh', 'chi duong', 'dan duong', 'tim duong']],
        ['drawerItem_datamgmt', ['so do', 'du lieu', 'quan ly du an', 'danh sach moc', 'xuat file', 'xuat dwg', 'xuat kml']],
        ['drawerItem_settings_storage', ['google sheet', 'dong bo', 'luu tru dam may']],
        ['drawerItem_geodesy', ['bai toan trac dia', 'tinh dien tich', 'phuong vi', 'trac dia']],
        ['drawerItem_settings_resection', ['giao hoi', 'resection']],
        ['drawerItem_profile_volume', ['trac doc', 'dao dap', 'mat cat', 'khoi luong']],
        ['drawerItem_cad_tool', ['minicad', 'mini cad', 'cad', 've mat bang', 'ban ve']],
        ['drawerItem_settings_ktt', ['cai dat ktt', 'chon tinh', 'thiet lap ktt']],
        ['drawerItem_datetime', ['ngay gio he thong', 'chinh gio']],
        ['drawerItem_user_guide', ['cam nang', 'huong dan su dung']],
        ['drawerItem_about', ['gioi thieu', 'cai dat ung dung', 'phien ban']]
    ];

    function hasWord(t, w) { return (' ' + t + ' ').indexOf(' ' + w + ' ') >= 0; }

    /** Cụm gọi chức năng dài nhất xuất hiện trong câu → id mục menu. */
    function findFeature(t) {
        let best = null, len = 0;
        FEATURES.forEach(([id, names]) => names.forEach(n => {
            if (n.length > len && hasWord(t, n)) { best = id; len = n.length; }
        }));
        return best;
    }

    // ---------------- Chuỗi lệnh ----------------
    /** "chuyển 10.77 106.70 rồi mở bản đồ" → ["chuyển 10.77 106.70", "mở bản đồ"] */
    function splitChain(text) {
        return String(text || '').split(/\s*(?:;|\n|,?\s+(?:rồi|roi|sau đó|sau do|tiếp theo|tiep theo|xong thì|xong thi)\s+)\s*/i)
            .map(s => s.trim()).filter(Boolean);
    }

    // ---------------- Bộ định tuyến ----------------
    const OPEN_VERBS = ['mo', 'vao', 'chuyen sang', 'sang', 'den', 'toi', 'xem', 'hien', 'bat', 'di toi', 'di den', 'mo giup', 'cho toi xem'];

    /** Một câu → { intent, args }. intent 'unknown' khi không chắc. Không phụ thuộc DOM. */
    function route(text, ctx) {
        const raw = String(text || '');
        const t = fold(raw);
        const provinces = (ctx && ctx.provinces) || [];
        if (!t) return { intent: 'empty', args: {} };

        if (/^(dung|thoi|huy|im|stop|ngung)( lai| noi)?$/.test(t)) return { intent: 'stop', args: {} };
        if (/(ban lam (duoc )?gi|^(giup|tro giup)( toi| minh| em)?( voi)?$|danh sach lenh|^lenh$|^help$|huong dan (dung )?tro ly)/.test(t)) return { intent: 'help', args: {} };
        if (/(kiem thu|tu kiem tra|chan doan|kiem tra (he thong|ung dung|app|may|thiet bi|offline|ngoai tuyen)|self ?test|^test( app| ung dung)?$)/.test(t)) return { intent: 'selftest', args: {} };
        if (/(ban la ai|ten (ban|cua ban) la gi|gioi thieu ve ban)/.test(t)) return { intent: 'identity', args: {} };
        if (/(may gio|bay gio la|gio hien tai)/.test(t)) return { intent: 'time', args: {} };
        if (/(hom nay (la )?(ngay|thu)|ngay (hom nay|bao nhieu|may)|ngay thang)/.test(t)) return { intent: 'date', args: {} };

        // Kiểm tra chất lượng số liệu đo (máy tự soát, không dùng AI)
        if (/(kiem tra|ra soat|soat|danh gia|tim loi|phat hien loi)( lai)? (chat luong |loi |giup )?((trong|cua|o) )?(so lieu|du lieu|moc|toa do|diem do|so do)/.test(t) ||
            /(so lieu|du lieu|moc|toa do) (co )?(bi )?(loi|sai|trung|dao|nhay)\b/.test(t)) return { intent: 'checkData', args: {} };
        // Xuất bản vẽ có tham số: "xuất PDF A3 tỷ lệ 1:500 nền vệ tinh, in cả bảng điểm"
        const ex = parseExport(t);
        if (ex) return { intent: 'exportDrawing', args: ex };

        const nums = extractNumbers(raw.replace(/\b(vn|wgs)[\s-]?(2000|84)\b/gi, ' '));
        const wantsDistance = /(khoang cach|cu ly|phuong vi|goc phuong vi|dai bao nhieu)/.test(t);
        if (nums.length >= 4 && wantsDistance) {
            const p1 = readPair(nums[0], nums[1]), p2 = readPair(nums[2], nums[3]);
            if (p1 && p2 && p1.kind === p2.kind) return { intent: 'distance', args: { p1, p2 } };
        }
        if (nums.length >= 2) {
            const p = readPair(nums[0], nums[1]);
            if (p) {
                return { intent: p.kind === 'wgs' ? 'wgs2vn' : 'vn2wgs', args: Object.assign({}, p, { showOnMap: /ban do/.test(t) }) };
            }
        }

        // Múi chiếu
        const mui = t.match(/\bmui (3|6)\b/);
        if (mui && /(doi|dat|chon|chuyen|dung|sang)/.test(t)) return { intent: 'setMui', args: { mui: +mui[1] } };

        // KTT / tỉnh
        const mentionsKtt = /(ktt|kinh tuyen truc|kinh tuyen|mui chieu|tinh dang dung|tinh hien tai)/.test(t);
        const pIdx = findProvince(raw, provinces);
        // "dùng" chỉ là lệnh đổi khi đứng đầu câu hoặc ngay trước tỉnh/KTT ("KTT đang dùng" là câu hỏi).
        const setVerb = /\b(doi|dat|chon|chuyen|ap dung|lam viec o)\b/.test(t) || (/\bdung (tinh|ktt|kinh tuyen|mui)\b/.test(t) && !/dang dung/.test(t)) || (/^dung\b/.test(t) && !/dang dung/.test(t));
        if (pIdx >= 0 && setVerb) return { intent: 'setProvince', args: { index: pIdx } };
        if (pIdx >= 0 && (mentionsKtt || t.length <= 30)) return { intent: 'kttOf', args: { index: pIdx } };
        if (mentionsKtt && !setVerb) return { intent: 'kttInfo', args: {} };

        // GPS
        if (/(tat|ngat|dung) (gps|dinh vi)/.test(t)) return { intent: 'gps', args: { on: false } };
        if (/(bat|mo) (gps|dinh vi)/.test(t)) return { intent: 'gps', args: { on: true } };
        if (/(vi tri (cua )?(toi|minh|em|hien tai)|toa do (cua )?(toi|hien tai|o day|cho nay|noi dang dung)|(toi|minh|em) dang o dau|o day la dau|sai so gps|do chinh xac gps)/.test(t)) return { intent: 'whereAmI', args: {} };

        // Dự án
        if (/(du an (hien tai|dang mo|nao)|bao nhieu (moc|diem)|so (luong )?(moc|diem)|co may (moc|diem))/.test(t)) return { intent: 'project', args: {} };

        // Giao diện
        if (/(giao dien|che do|nen) (sang|ban ngay|trang)/.test(t)) return { intent: 'theme', args: { theme: 'light' } };
        if (/(giao dien|che do|nen) (toi|dem|ban dem|den)/.test(t)) return { intent: 'theme', args: { theme: 'dark' } };
        if (/(cai dat|thiet lap)( he thong| ung dung)?$/.test(t)) return { intent: 'settings', args: {} };

        // Mở chức năng: có động từ "mở/vào/xem…" hoặc chỉ nói tên chức năng
        const feat = findFeature(t);
        if (feat) {
            const verb = OPEN_VERBS.some(v => t.startsWith(v + ' ') || hasWord(t, v));
            const bare = t.length <= 28;
            if (verb || bare) return { intent: 'open', args: { target: feat } };
        }
        return { intent: 'unknown', args: { numbers: nums } };
    }

    // ---------------- Xuất bản vẽ có tham số ----------------
    const EXPORT_FORMAT_WORDS = [
        ['dwg', ['dwg', 'dxf', 'autocad', 'file cad', 'ban ve cad']],
        ['svg', ['svg']],
        ['png', ['png']],
        ['pdf', ['pdf']],
        ['image', ['webp', 'jpg', 'jpeg', 'anh nen', 'anh nhe', 'anh nho', 'hinh anh', 'anh']]
    ];
    const EXPORT_BASEMAP_WORDS = [
        ['none', ['khong nen', 'nen trang', 'khong ban do nen', 'khong co nen', 'bo nen', 'khong lay nen']],
        ['esri_satellite', ['esri']],
        ['google_hybrid', ['ve tinh', 'google', 'anh ve tinh', 'nen ve tinh']],
        ['osm_streets', ['duong pho', 'osm', 'openstreetmap', 'ban do duong']],
        ['opentopomap', ['dia hinh', 'topo', 'dong muc']],
        ['sentinel2', ['sentinel']]
    ];
    const PAPERS = ['A0', 'A0-P', 'A1', 'A1-P', 'A2', 'A2-P', 'A3', 'A3-P', 'A4', 'A4-P'];
    const BASEMAPS = ['none', 'google_hybrid', 'esri_satellite', 'google_streets', 'opentopomap', 'google_terrain', 'osm_streets', 'sentinel2'];

    /** "xuat pdf a3 ty le 1:500 nen ve tinh in ca bang diem" (đã fold) → tham số, hoặc null nếu không phải lệnh xuất bản vẽ. */
    function parseExport(t) {
        if (!/\b(xuat|in|luu|tao)\b/.test(t)) return null;
        if (/\b(kml|kmz|geojson|gpx|csv|excel|xlsx|txt|dgn|shp|shapefile|wkt)\b/.test(t)) return null;   // định dạng dữ liệu, không phải bản vẽ
        let format = null;
        for (const [id, words] of EXPORT_FORMAT_WORDS) { if (words.some(w => hasWord(t, w))) { format = id; break; } }
        const drawingWord = /(ban ve|ban do|so do thua|so do vi tri|trich luc|bao cao)/.test(t);
        if (!format && !drawingWord) return null;
        if (!format && !/\b(xuat|in)\b/.test(t)) return null;
        if (!format) format = 'pdf';
        if (format === 'image' && !/\b(xuat|luu|tao)\b/.test(t) && !drawingWord) return null;
        const args = { format };
        const pm = t.match(/\ba\s?([0-4])\b/);
        if (pm) args.paper = 'A' + pm[1] + (/\ba\s?[0-4]\s+(doc|dung)\b|\b(kho|giay|trang) (doc|dung)\b|\b(kho|giay) a\s?[0-4] (doc|dung)\b/.test(t) ? '-P' : '');
        const sm = t.match(/(?:ty le|ti le|\btl)\s*(?:1\s*[:/]\s*)?(\d{2,6})\b/) || t.match(/\b1\s*[:/]\s*(\d{2,6})\b/);
        if (sm) { const v = parseInt(sm[1], 10); if (v >= 50 && v <= 100000) args.scale = v; }
        else if (/(vua (kho|trang|giay)|tu dong ty le|ty le tu dong|tu chon ty le)/.test(t)) args.scale = 0;
        for (const [id, words] of EXPORT_BASEMAP_WORDS) { if (words.some(w => t.indexOf(w) >= 0)) { args.basemap = id; break; } }
        if (/(ca hai bang|ca 2 bang|hai bang|2 bang|ca bang dien tich va|dien tich va (bang )?(cac )?diem)/.test(t)) args.tables = 'both';
        else if (/(bang (cac |tong hop (cac )?)?diem|bang toa do|toa do (cac )?(diem|moc))/.test(t)) args.tables = 'points';
        else if (/bang (tong hop )?dien tich/.test(t)) args.tables = 'area';
        if (/(so do|du lieu|diem do|moc da do|so lieu)/.test(t) && !/so do (thua|vi tri)/.test(t)) args.source = 'data';
        else if (/(minicad|mini cad|cac thua|thua dat|khoi thua)/.test(t)) args.source = 'cad';
        return args;
    }

    // ---------------- Kiểm tra chất lượng số liệu đo (máy tự soát) ----------------
    /** points: [{name, x (Bắc), y (Đông)}]; opts: {kttDeg, toLngOf(X,Y)?}. Trả về {ok, issues:[{level, text}], stats}. */
    function qcPoints(points, opts) {
        opts = opts || {};
        const issues = [];
        const add = (level, text) => issues.push({ level, text });
        const pts = (points || []).map((p, i) => ({ i, name: String(p.name || p.ten || `#${i + 1}`).trim(), X: parseFloat(p.x != null ? p.x : p.X), Y: parseFloat(p.y != null ? p.y : p.Y) }));
        const valid = pts.filter(p => Number.isFinite(p.X) && Number.isFinite(p.Y));
        if (!pts.length) return { ok: false, issues: [{ level: 'warn', text: 'Dự án chưa có mốc nào.' }], stats: { n: 0 } };
        const missing = pts.length - valid.length;
        if (missing) add('err', `${missing} mốc thiếu hoặc sai tọa độ VN-2000.`);
        // Đảo X/Y: X (Bắc) VN-2000 khoảng 0,7–2,8 triệu m; Y (Đông) khoảng 50–950 nghìn m
        const swapped = valid.filter(p => isY(p.X) && isX(p.Y));
        if (swapped.length) add('err', `${swapped.length} mốc có vẻ bị đảo X ↔ Y (vd. ${swapped.slice(0, 3).map(p => p.name).join(', ')}).`);
        const outRange = valid.filter(p => !(isX(p.X) && isY(p.Y)) && !(isY(p.X) && isX(p.Y)));
        if (outRange.length) add('err', `${outRange.length} mốc nằm ngoài phạm vi tọa độ VN-2000 của Việt Nam (vd. ${outRange.slice(0, 3).map(p => p.name).join(', ')}).`);
        // Trùng tên / trùng vị trí
        const byName = {};
        pts.forEach(p => { const k = fold(p.name); (byName[k] = byName[k] || []).push(p); });
        // Cùng tên + cùng vị trí = đỉnh chung của nhiều thửa (hợp lệ). Chỉ báo khi cùng tên mà khác vị trí.
        const samePos = (a, b) => Number.isFinite(a.X) && Number.isFinite(b.X) && Math.abs(a.X - b.X) < 0.01 && Math.abs(a.Y - b.Y) < 0.01;
        const dupNames = Object.values(byName).filter(a => a.length > 1 && a.some(p => !samePos(p, a[0])));
        if (dupNames.length) add('warn', `${dupNames.length} tên mốc dùng cho nhiều vị trí khác nhau (vd. ${dupNames.slice(0, 3).map(a => a[0].name + ' ×' + a.length).join(', ')}).`);
        const good = valid.filter(p => isX(p.X) && isY(p.Y));
        const cell = {};
        let dupPos = 0;
        const dupSamples = [];
        good.forEach(p => {
            const k = Math.round(p.X * 100) + ':' + Math.round(p.Y * 100);
            if (cell[k]) { if (fold(cell[k].name) !== fold(p.name)) { dupPos++; if (dupSamples.length < 3) dupSamples.push(`${cell[k].name} = ${p.name}`); } } else cell[k] = p;
        });
        if (dupPos) add('warn', `${dupPos} mốc khác tên nhưng trùng vị trí (lệch < 1 cm) (vd. ${dupSamples.join('; ')}).`);
        // Điểm nhảy: xa trung vị hơn nhiều lần độ phân tán (MAD)
        if (good.length >= 5) {
            const med = a => { const b = a.slice().sort((u, v) => u - v); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
            const mx = med(good.map(p => p.X)), my = med(good.map(p => p.Y));
            const d = good.map(p => Math.hypot(p.X - mx, p.Y - my));
            const mad = Math.max(med(d), 5);
            const far = good.filter((p, i) => d[i] > 15 * mad && d[i] > 500);
            if (far.length) add('warn', `${far.length} mốc nằm rất xa cụm mốc chính (> ${Math.round(15 * mad)} m) — kiểm tra lại: ${far.slice(0, 3).map(p => p.name).join(', ')}.`);
        }
        // Sai KTT: kinh độ suy ra lệch xa kinh tuyến trục
        if (typeof opts.toLngOf === 'function' && Number.isFinite(opts.kttDeg) && good.length) {
            const off = good.filter(p => { const lng = opts.toLngOf(p.X, p.Y); return Number.isFinite(lng) && Math.abs(lng - opts.kttDeg) > 2.2; });
            if (off.length) add('warn', `${off.length} mốc lệch hơn 2° so với KTT đang dùng — có thể chọn sai tỉnh/KTT.`);
        }
        // Đa giác: tự cắt
        if (good.length >= 4 && opts.polygon) {
            const P = good;
            const cross = (a, b, c) => (b.Y - a.Y) * (c.X - a.X) - (b.X - a.X) * (c.Y - a.Y);
            const inter = (a, b, c, d) => (cross(a, b, c) * cross(a, b, d) < 0) && (cross(c, d, a) * cross(c, d, b) < 0);
            let selfX = 0;
            for (let i = 0; i < P.length && selfX < 3; i++) {
                for (let j = i + 2; j < P.length; j++) {
                    if (i === 0 && j === P.length - 1) continue;
                    if (inter(P[i], P[(i + 1) % P.length], P[j], P[(j + 1) % P.length])) { selfX++; break; }
                }
            }
            if (selfX) add('warn', 'Đường ranh nối theo thứ tự mốc bị tự cắt — có thể sai thứ tự mốc.');
        }
        return { ok: !issues.some(x => x.level === 'err') && !issues.length, issues, stats: { n: pts.length, valid: good.length } };
    }

    // ---------------- Danh mục công cụ (dùng chung: quy tắc, AI cục bộ, AI máy chủ) ----------------
    // Mô hình AI chỉ được chọn MỘT công cụ + tham số hợp lệ; mọi phép tính do hàm của app làm.
    const FEATURE_IDS = FEATURES.map(f => f[0]);
    const TOOLS = [
        { name: 'wgs2vn', desc: 'Chuyển tọa độ WGS-84 (vĩ độ, kinh độ) sang VN-2000', params: { lat: { type: 'number' }, lng: { type: 'number' } } },
        { name: 'vn2wgs', desc: 'Chuyển tọa độ VN-2000 (X Bắc, Y Đông, mét) sang WGS-84', params: { X: { type: 'number' }, Y: { type: 'number' } } },
        { name: 'open', desc: 'Mở một chức năng của ứng dụng', params: { target: { type: 'string', enum: FEATURE_IDS } } },
        { name: 'exportDrawing', desc: 'Xuất bản vẽ khổ giấy (PDF, PNG, ảnh nén, SVG, DWG) của dự án đang mở', params: {
            format: { type: 'string', enum: ['pdf', 'png', 'image', 'svg', 'dwg'] },
            paper: { type: 'string', enum: PAPERS, optional: true },
            scale: { type: 'integer', optional: true, desc: 'mẫu số tỷ lệ, 0 = tự động' },
            basemap: { type: 'string', enum: BASEMAPS, optional: true },
            tables: { type: 'string', enum: ['area', 'points', 'both'], optional: true },
            source: { type: 'string', enum: ['cad', 'data'], optional: true } } },
        { name: 'checkData', desc: 'Kiểm tra chất lượng số liệu đo của dự án (đảo X/Y, trùng mốc, mốc nhảy, sai KTT)', params: {} },
        { name: 'kttInfo', desc: 'Cho biết KTT / múi chiếu đang dùng', params: {} },
        { name: 'kttOf', desc: 'Cho biết KTT của một tỉnh', params: { province: { type: 'string' } } },
        { name: 'setProvince', desc: 'Đổi KTT theo tỉnh', params: { province: { type: 'string' } } },
        { name: 'setMui', desc: 'Đổi múi chiếu 3° hoặc 6°', params: { mui: { type: 'integer', enum: [3, 6] } } },
        { name: 'gps', desc: 'Bật / tắt GPS', params: { on: { type: 'boolean' } } },
        { name: 'whereAmI', desc: 'Tọa độ vị trí hiện tại theo GPS', params: {} },
        { name: 'project', desc: 'Thông tin dự án đang mở, số mốc', params: {} },
        { name: 'theme', desc: 'Đổi giao diện sáng / tối', params: { theme: { type: 'string', enum: ['light', 'dark'] } } },
        { name: 'settings', desc: 'Mở Cài đặt', params: {} },
        { name: 'selftest', desc: 'Tự kiểm thử ứng dụng (thuật toán, ngoại tuyến, GPS, bộ nhớ)', params: {} },
        { name: 'help', desc: 'Liệt kê những việc trợ lý làm được', params: {} },
        { name: 'time', desc: 'Giờ hiện tại', params: {} },
        { name: 'date', desc: 'Ngày hôm nay', params: {} }
    ];
    const TOOL_BY_NAME = {};
    TOOLS.forEach(t => { TOOL_BY_NAME[t.name] = t; });

    /** Kiểm tra / ép kiểu lời gọi công cụ do AI sinh ra. Trả về {intent, args} hoặc null nếu không hợp lệ. */
    function validateCall(call, ctx) {
        if (!call || typeof call !== 'object') return null;
        const name = String(call.tool || call.name || '').trim();
        const spec = TOOL_BY_NAME[name];
        if (!spec) return null;
        let raw = call.args || call.arguments || {};
        if (typeof raw === 'string') { try { raw = JSON.parse(raw || '{}'); } catch (e) { return null; } }
        const args = {};
        for (const [k, p] of Object.entries(spec.params)) {
            let v = raw[k];
            if (v === undefined || v === null || v === '') { if (p.optional) continue; return null; }
            if (p.type === 'number' || p.type === 'integer') { v = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); if (!Number.isFinite(v)) return null; if (p.type === 'integer') v = Math.round(v); }
            else if (p.type === 'boolean') { v = (v === true || v === 'true' || v === 1 || v === 'on'); }
            else v = String(v);
            if (p.enum && p.enum.indexOf(v) < 0) { if (p.optional) continue; return null; }
            args[k] = v;
        }
        // Tọa độ do AI đọc phải nằm trong phạm vi Việt Nam
        if (name === 'wgs2vn' && !(isLat(args.lat) && isLng(args.lng))) return null;
        if (name === 'vn2wgs' && !(isX(args.X) && isY(args.Y))) return null;
        if (name === 'vn2wgs') args.kind = 'vn2k';
        if (name === 'wgs2vn') args.kind = 'wgs';
        if (name === 'kttOf' || name === 'setProvince') {
            const idx = findProvince(args.province, (ctx && ctx.provinces) || []);
            if (idx < 0) return null;
            return { intent: name, args: { index: idx } };
        }
        if (name === 'exportDrawing' && args.scale !== undefined && args.scale !== 0 && (args.scale < 50 || args.scale > 100000)) delete args.scale;
        return { intent: name, args };
    }

    /** Lời gọi chuẩn (để so sánh / làm ví dụ) từ kết quả route. */
    function callOf(r, ctx) {
        if (!r || !TOOL_BY_NAME[r.intent]) return null;
        const a = Object.assign({}, r.args || {});
        delete a.kind; delete a.showOnMap; delete a.numbers;
        if ((r.intent === 'kttOf' || r.intent === 'setProvince') && ctx && ctx.provinces && ctx.provinces[a.index]) return { tool: r.intent, args: { province: ctx.provinces[a.index].name } };
        return { tool: r.intent, args: a };
    }

    // Ngữ pháp GBNF: mô hình cục bộ CHỈ sinh được JSON {"tool": …, "args": {…}} đúng danh mục và kiểu tham số.
    function buildGrammar() {
        const q = s => JSON.stringify(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const lit = s => '"' + q(s) + '"';
        const lines = ['root ::= call | "{\\"tool\\":\\"none\\",\\"args\\":{}}"', 'call ::= ' + TOOLS.map((t, i) => 't' + i).join(' | '),
            'num ::= "-"? [0-9]+ ("." [0-9]+)?', 'int ::= [0-9]+', 'str ::= "\\"" [^"\\\\]{1,60} "\\""', 'bool ::= "true" | "false"'];
        TOOLS.forEach((t, i) => {
            const req = Object.entries(t.params).filter(([, p]) => !p.optional);
            const opt = Object.entries(t.params).filter(([, p]) => p.optional);
            const val = (k, p) => {
                if (p.enum) return '(' + p.enum.map(e => lit(e)).join(' | ') + ')';
                return p.type === 'number' ? 'num' : p.type === 'integer' ? 'int' : p.type === 'boolean' ? 'bool' : 'str';
            };
            const kv = (k, p) => lit(k) + ' ":" ' + val(k, p);
            let body = req.map(([k, p]) => kv(k, p)).join(' "," ');
            opt.forEach(([k, p]) => { body += (body ? ' ("," ' : ' (') + kv(k, p) + ')?'; });
            if (!req.length && opt.length) body = body.replace(/^ \(/, '(').replace(/^\("," /, '(');
            lines.push(`t${i} ::= "{\\"tool\\":" ${lit(t.name)} ",\\"args\\":{" ${body || ''} "}}"`);
        });
        return lines.join('\n');
    }

    // ---------------- Học theo ví dụ: chọn câu mẫu gần nhất ----------------
    const tokenize = s => fold(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 1);
    function nearestExamples(text, dataset, k) {
        const q = new Set(tokenize(text));
        if (!q.size || !Array.isArray(dataset)) return [];
        return dataset.map(e => {
            const w = new Set(tokenize(e[0]));
            let inter = 0; q.forEach(x => { if (w.has(x)) inter++; });
            return { e, s: inter / (q.size + w.size - inter || 1) };
        }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k || 6).map(x => x.e);
    }

    /** Tin nhắn cho mô hình cục bộ / máy chủ: danh mục công cụ ngắn + vài ví dụ gần nhất. */
    function buildToolMessages(userText, dataset, k) {
        const toolLines = TOOLS.map(t => `- ${t.name}: ${t.desc}` + (Object.keys(t.params).length ? ` (${Object.entries(t.params).map(([n, p]) => n + (p.enum && p.enum.length <= 8 ? '=' + p.enum.join('|') : ':' + p.type) + (p.optional ? '?' : '')).join(', ')})` : '')).join('\n');
        const feats = FEATURES.map(f => `${f[0]} = ${f[1][0]}`).join('; ');
        const sys = 'Bạn là bộ điều khiển ứng dụng trắc địa VN2000. Đọc câu tiếng Việt của người dùng và trả về đúng MỘT JSON {"tool": tên, "args": {...}} chọn trong danh mục. ' +
            'Không tự tính toán, không bịa số: số tọa độ phải chép từ câu người dùng. Nếu không khớp công cụ nào, trả về {"tool":"none","args":{}}.\n' +
            'Danh mục:\n' + toolLines + '\nMã chức năng cho open.target: ' + feats;
        const msgs = [{ role: 'system', content: sys }];
        nearestExamples(userText, dataset, k || 6).forEach(e => {
            msgs.push({ role: 'user', content: e[0] });
            msgs.push({ role: 'assistant', content: JSON.stringify({ tool: e[1], args: e[2] || {} }) });
        });
        msgs.push({ role: 'user', content: String(userText || '').slice(0, 300) });
        return msgs;
    }

    /** Lời gọi hàm kiểu OpenAI (dùng cho AI máy chủ: Qwen / DeepSeek / Ollama / máy chủ Xiaozhi tự dựng…). */
    function openAiTools() {
        return TOOLS.map(t => ({
            type: 'function',
            function: {
                name: t.name, description: t.desc,
                parameters: {
                    type: 'object',
                    properties: Object.fromEntries(Object.entries(t.params).map(([k, p]) => [k, Object.assign({ type: p.type === 'integer' ? 'integer' : p.type }, p.enum ? { enum: p.enum } : {}, p.desc ? { description: p.desc } : {})])),
                    required: Object.entries(t.params).filter(([, p]) => !p.optional).map(([k]) => k)
                }
            }
        }));
    }

    /** Đọc JSON lời gọi trong chuỗi trả lời của mô hình. */
    function parseToolJson(text) {
        const s = String(text || '');
        const i = s.indexOf('{'), j = s.lastIndexOf('}');
        if (i < 0 || j <= i) return null;
        try { const o = JSON.parse(s.slice(i, j + 1)); return (o && o.tool && o.tool !== 'none') ? o : null; } catch (e) { return null; }
    }

    // ---------------- Lệnh chuẩn cho mô hình AI ----------------
    // Mô hình chỉ được chọn đúng một dòng trong danh sách này (hoặc "khong ro"). Không có số nào ở đây,
    // vì số luôn đọc trực tiếp từ câu người dùng bằng extractNumbers.
    const CANONICAL = [
        'mo trang chu', 'mo chuyen doi toa do', 'mo chuyen doi hang loat', 'mo cham toa do', 'mo ban do du an',
        'mo cam moc', 'mo camera', 'mo lo trinh', 'mo so do', 'mo bai toan trac dia', 'mo giao hoi', 'mo trac doc',
        'mo minicad', 'mo cam nang', 'ktt hien tai', 'vi tri cua toi', 'bat gps', 'tat gps', 'du an hien tai',
        'kiem thu', 'giao dien sang', 'giao dien toi', 'may gio', 'hom nay ngay may', 'ban lam duoc gi'
    ];

    function buildLlmMessages(userText) {
        return [
            { role: 'system', content: 'Bạn là bộ phân loại lệnh cho ứng dụng trắc địa VN2000. Chỉ trả lời đúng MỘT dòng, chép nguyên văn một lệnh trong danh sách. Nếu câu không khớp lệnh nào, trả lời: khong ro. Không giải thích, không tính toán.\nDanh sách lệnh:\n' + CANONICAL.join('\n') },
            { role: 'user', content: String(userText || '').slice(0, 240) }
        ];
    }

    /** Lọc câu trả lời của mô hình: chỉ nhận đúng một lệnh trong danh sách. */
    function parseLlmCommand(output) {
        const t = fold(String(output || '').split('\n')[0]).replace(/[.!:]+$/, '').trim();
        if (!t || /khong ro/.test(t)) return null;
        if (CANONICAL.indexOf(t) >= 0) return t;
        const hit = CANONICAL.filter(c => t.indexOf(c) >= 0).sort((a, b) => b.length - a.length)[0];
        return hit || null;
    }

    // ---------------- Định dạng câu trả lời ----------------
    function fmtM(v) { return Number(v).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false }); }
    function fmtDeg(v) { return Number(v).toFixed(7).replace('.', ',') + '°'; }
    function fmtKtt(deg, min) { return `${deg}°${String(min).padStart(2, '0')}'`; }
    function fmtAzimuth(a) {
        const d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = (mf - m) * 60;
        return `${d}°${String(m).padStart(2, '0')}'${s.toFixed(1).padStart(4, '0')}"`;
    }

    const HELP = [
        'Chuyển đổi: "10.7769 106.7009" hoặc "X 1191234 Y 602345" (dán số là được)',
        'Khoảng cách: "khoảng cách 1191234 602345 1191300 602400"',
        'Mở chức năng: "mở bản đồ", "mở MiniCAD", "cắm mốc", "lộ trình"…',
        'Xuất bản vẽ: "xuất PDF A3 tỷ lệ 1:500 nền vệ tinh, in cả hai bảng", "xuất DWG", "xuất ảnh không nền"',
        'Kiểm tra số liệu: "kiểm tra số liệu" — đảo X/Y, trùng mốc, mốc nhảy, sai KTT, ranh tự cắt',
        'KTT: "KTT hiện tại", "đổi KTT sang Đồng Tháp", "dùng múi 6"',
        'GPS: "vị trí của tôi", "bật GPS"',
        'Dự án: "dự án hiện tại", "có bao nhiêu mốc"',
        'Kiểm thử: "kiểm thử" — tự kiểm tra thuật toán, ngoại tuyến, bộ nhớ, GPS',
        'Nối lệnh bằng "rồi": "chuyển 10.77 106.70 rồi mở bản đồ"'
    ];

    const api = { fold, extractNumbers, readPair, findProvince, provinceKey, findFeature, splitChain, route, FEATURES,
        parseExport, qcPoints, TOOLS, validateCall, callOf, buildGrammar, nearestExamples, buildToolMessages, openAiTools, parseToolJson, PAPERS, BASEMAPS,
        CANONICAL, buildLlmMessages, parseLlmCommand, fmtM, fmtDeg, fmtKtt, fmtAzimuth, HELP };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AssistantCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
