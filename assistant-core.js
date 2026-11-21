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
        const t = ' ' + fold(text).replace(/[–-]/g, ' ').replace(/\b(tp ?hcm|hcm|sai gon|tphcm)\b/g, 'ho chi minh') + ' ';
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
        if (/(kiem thu|tu kiem tra|chan doan|kiem tra (he thong|ung dung|app|may|thiet bi|offline|ngoai tuyen)|self ?test|^test$)/.test(t)) return { intent: 'selftest', args: {} };
        if (/(ban la ai|ten (ban|cua ban) la gi|gioi thieu ve ban)/.test(t)) return { intent: 'identity', args: {} };
        if (/(may gio|bay gio la|gio hien tai)/.test(t)) return { intent: 'time', args: {} };
        if (/(hom nay (la )?(ngay|thu)|ngay (hom nay|bao nhieu|may)|ngay thang)/.test(t)) return { intent: 'date', args: {} };

        const nums = extractNumbers(raw);
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
        const setVerb = /\b(doi|dat|chon|chuyen|ap dung|lam viec o)\b/.test(t) || /\bdung (tinh|ktt|kinh tuyen|mui)\b/.test(t) || (/^dung\b/.test(t) && !/dang dung/.test(t));
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
        'KTT: "KTT hiện tại", "đổi KTT sang Đồng Tháp", "dùng múi 6"',
        'GPS: "vị trí của tôi", "bật GPS"',
        'Dự án: "dự án hiện tại", "có bao nhiêu mốc"',
        'Kiểm thử: "kiểm thử" — tự kiểm tra thuật toán, ngoại tuyến, bộ nhớ, GPS',
        'Nối lệnh bằng "rồi": "chuyển 10.77 106.70 rồi mở bản đồ"'
    ];

    const api = { fold, extractNumbers, readPair, findProvince, provinceKey, findFeature, splitChain, route, FEATURES,
        CANONICAL, buildLlmMessages, parseLlmCommand, fmtM, fmtDeg, fmtKtt, fmtAzimuth, HELP };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AssistantCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
