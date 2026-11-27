/* Trợ lý cục bộ — LÕI (không giao diện, chạy được cả trên Node để kiểm thử).
   Ý tưởng học từ Ivy AI (github.com/iamankushpandit/esp_ai), viết lại hoàn toàn, không dùng mã của dự án đó:
   1) Câu nào máy tự trả lời chắc chắn được thì trả lời bằng mã thường, gắn nhãn "Không dùng AI"
      (Ivy: giờ, ngày, hẹn giờ do code C trả lời). Ở đây: mọi phép chuyển đổi tọa độ, khoảng cách,
      diện tích, đổi KTT, KTT, điều hướng, kiểm thử — KHÔNG BAO GIỜ để mô hình ngôn ngữ tính số.
   2) Mô hình AI (nếu người dùng bật) chỉ làm một việc: đổi câu nói tự do thành MỘT lệnh chuẩn trong danh sách,
      rồi lệnh đó lại đi qua bộ định tuyến và kiểm định validateCall. Không khớp → lịch sự gợi ý thay vì "bịa".
   3) Chạy theo pha, giải phóng tài nguyên sau mỗi pha (Ivy: Listen → Think → Speak trên cùng một vùng nhớ). */
(function (root) {
    'use strict';

    /** Chuẩn hóa để so khớp: thường, bỏ dấu, đ→d, gọn khoảng trắng. */
    function fold(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
        ['drawerItem_camera', ['gps live shots', 'live shots', 'live shot', 'camera', 'chup anh', 'may anh', 'anh dong dau']],
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

    // ---------------- Hỗ trợ đọc tên mốc / dự án / lớp bản đồ / lệnh CAD ----------------
    const GENERIC_POINT_STOP = new Set([
        'ngoai', 'thuc', 'dia', 'gan', 'nhat', 'du', 'an', 'hien', 'tai', 'tren', 'ban', 'do', 'trong',
        'so', 'nay', 'kia', 'moi', 'cu', 'chinh', 'phu', 'bao', 'nhieu', 'la', 'gi', 'o', 'dau',
        'giup', 'toi', 'minh', 'em', 'voi', 'di', 'nha', 'nhe', 'tat', 'ca', 'cac', 'danh', 'sach',
        'chuc', 'nang', 'vao', 'ra', 'cua', 'cho', 'xem', 'tim', 'cam', 'toa', 'khong', 'co', 'bi',
        'sai', 'loi', 'trung', 'nhay', 'dao', 'ktt', 've', 'tinh', 'xe', 'may', 'oto',
        'moc', 'diem', 'coc', 'thua', 'khoi', 'tuyen'
    ]);

    function cleanEntityToken(raw) {
        return String(raw || '').replace(/^[.,;:!?()\[\]"\s]+|[.,;:!?()\[\]"\s]+$/g, '').trim();
    }

    function isLikelyPointName(tok) {
        const s = cleanEntityToken(tok);
        if (!s || s.length > 28) return false;
        const f = fold(s);
        if (f === 'diem vua roi' || f === 'diem do' || f === 'diem nay' || f === 'vi tri hien tai' || f === 'day' || f === 'o day') return true;
        if (GENERIC_POINT_STOP.has(f)) return false;
        // Tên mốc thực tế: thường chứa chữ+số (M1, A2, Goc1, T1.1, DC-05) hoặc mã ngắn không phải từ chung
        if (/\d/.test(f)) return true;
        const parts = f.split(/\s+/);
        if (parts.length <= 2 && parts.every(w => !GENERIC_POINT_STOP.has(w))) return true;
        return false;
    }

    function normalizePointCode(s) {
        const clean = cleanEntityToken(s);
        return /^[a-z]{1,2}\d+[a-z]?$/i.test(clean) ? clean.toUpperCase() : clean;
    }

    /** Trích tên mốc cụ thể sau từ khóa "mốc / điểm / cọc" trong câu gốc (giữ nguyên chữ hoa/thường). */
    function extractPointAfterKeyword(raw, pattern) {
        const m = raw.match(pattern);
        if (!m || !m[1]) return null;
        let cand = cleanEntityToken(m[1]);
        // Cắt đuôi câu hỏi phổ biến ("ở đâu", "là bao nhiêu", "giúp tôi", "ngay"...)
        cand = cand.replace(/\s+(?:ở đâu|o dau|là gì|la gi|là bao nhiêu|la bao nhieu|có tọa độ|co toa do|giúp|giup|nhé|nhe|nha|với|voi|đi|di|ngay|luôn|luon|trong dự án|trong du an|ở dự án|o du an).*$/i, '').trim();
        cand = normalizePointCode(cand);
        return isLikelyPointName(cand) ? cand : null;
    }

    /** Đọc lệnh khoảng cách/phương vị giữa 2 mốc có tên: "khoảng cách từ M1 đến M3", "từ đây đến mốc M2 bao xa". */
    function parseDistancePoints(raw, t) {
        const wants = /(khoang cach|cu ly|phuong vi|goc phuong vi|bao xa|cach nhau|dai bao nhieu|bao nhieu met)/.test(t);
        if (!wants) return null;
        const normRef = s => {
            const f = fold(s);
            if (/^(day|o day|vi tri hien tai|vi tri cua toi|cho nay|toi|minh)$/.test(f)) return 'GPS';
            if (/^(diem vua roi|vua roi|diem do|diem vua chuyen|vua chuyen|do|diem nay)$/.test(f)) return 'LAST';
            return normalizePointCode(s);
        };
        // Dạng: "từ <A> đến/tới <B>"
        const mFromTo = raw.match(/(?:từ|tu)\s+(?:mốc|moc|điểm|diem|cọc|coc)?\s*([^,;?!]+?)\s+(?:đến|den|tới|toi|sang|qua|->|→)\s+(?:mốc|moc|điểm|diem|cọc|coc)?\s*([^,;?!]+)/i);
        if (mFromTo) {
            let a = cleanEntityToken(mFromTo[1]).replace(/\s+(?:lên|len|xuống|xuong)$/i, '');
            let b = cleanEntityToken(mFromTo[2]).replace(/\s+(?:là|la|bao|cách|cach|có|co|nhiêu|nhieu|mét|met|giúp|giup|với|voi|nhé|nhe|nha).*$/i, '');
            a = normRef(a); b = normRef(b);
            if ((a === 'GPS' || a === 'LAST' || isLikelyPointName(a)) && (b === 'LAST' || isLikelyPointName(b)) && a && b && fold(a) !== fold(b)) {
                return { from: a, to: b };
            }
        }
        // Dạng: "khoảng cách / phương vị <A> và/đến/tới/- <B>" hoặc "khoảng cách M1 M2"
        const mPair = raw.match(/(?:khoảng cách|khoang cach|cự ly|cu ly|phương vị|phuong vi)\s+(?:giữa\s+|giua\s+)?(?:mốc|moc|điểm|diem|cọc|coc)?\s*([A-Za-zÀ-ỹ0-9_.-]+)\s+(?:và|va|đến|den|tới|toi|với|voi|-|→|->)?\s*(?:mốc|moc|điểm|diem|cọc|coc)?\s*([A-Za-zÀ-ỹ0-9_.-]+)/i);
        if (mPair) {
            const a = normalizePointCode(mPair[1]), b = normalizePointCode(mPair[2]);
            if (isLikelyPointName(a) && isLikelyPointName(b) && fold(a) !== fold(b) && !/^\d+$/.test(a + b)) {
                return { from: a, to: b };
            }
        }
        return null;
    }

    /** Đọc lệnh lưu điểm vừa chuyển / GPS vào dự án. */
    function parseSavePoint(raw, t) {
        if (!/\bluu\b/.test(t)) return null;
        if (/\b(ban do ngoai tuyen|ngoai tuyen|vung ban do|cai dat|cau hinh|anh|pdf|png|svg|dwg|dxf|ban ve)\b/.test(t)) return null;
        const isPointSave = /(diem vua|diem do|diem nay|toa do vua|toa do do|vi tri hien tai|vi tri nay|vi tri cua toi|vi tri gps|vao du an|vao so do|thanh moc|ten moc|moc moi)/.test(t)
            || /\bluu\s+(moc|diem)\s+[a-z0-9]/i.test(t);
        if (!isPointSave) return null;
        const fromGps = /(vi tri hien tai|vi tri nay|vi tri cua toi|vi tri gps|cho nay|o day)/.test(t);
        let note = '';
        const mNote = raw.match(/(?:ghi chú|ghi chu|note)\s*[:=]?\s*(.+)$/i);
        let work = raw;
        if (mNote) { note = cleanEntityToken(mNote[1]); work = raw.slice(0, mNote.index).trim(); }
        let name = '';
        const mName = work.match(/(?:tên là|ten la|tên|ten|thành mốc|thanh moc|thành điểm|thanh diem|thành|thanh|là mốc|la moc)\s+([A-Za-zÀ-ỹ0-9_.-]+(?:\s+[A-Za-zÀ-ỹ0-9_.-]+)?)/i)
            || work.match(/(?:lưu|luu)\s+(?:mốc|moc|điểm|diem)\s+([A-Za-zÀ-ỹ0-9_.-]+)/i);
        if (mName) {
            let c = normalizePointCode(cleanEntityToken(mName[1]).replace(/\s+(?:vào|vao|trong|ở|o)\s+(?:dự án|du an|sổ đo|so do).*$/i, '').trim());
            if (isLikelyPointName(c) && !/^(vua|do|nay|hien|tai|vao|du|an|so)$/i.test(fold(c))) name = c;
        }
        const args = { name: name || (fromGps ? 'GPS' : 'AUTO') };
        if (note) args.note = note.slice(0, 60);
        if (fromGps) args.source = 'gps';
        return args;
    }

    /** Đọc lệnh điều khiển lớp bản đồ (nền, lớp phủ, quy hoạch Guland 2030). */
    const MAP_BASE_ALIASES = [
        ['esri_satellite', ['ve tinh esri', 'esri']],
        ['google_hybrid', ['ve tinh google', 'google hybrid', 've tinh', 'anh ve tinh']],
        ['google_streets', ['duong pho google', 'google streets', 'google map', 'duong bo google']],
        ['opentopomap', ['opentopomap', 'opentopo', 'topo', 'song ngoi', 'kenh rach']],
        ['google_terrain', ['google terrain', 'terrain', 'dia hinh google']],
        ['osm_streets', ['openstreetmap', 'osm', 'duong pho osm', 'duong pho']],
        ['none', ['khong nen', 'nen trang ban do', 'ban do nen trang', 'tat nen ban do', 'bo nen ban do', 'tat nen', 'bo nen']]
    ];
    const MAP_OVERLAY_ALIASES = [
        ['google_traffic', ['giao thong truc tiep', 'traffic', 'un tac', 'tinh trang giao thong']],
        ['esri_transport', ['mang luoi giao thong', 'giao thong esri', 'lop giao thong']],
        ['google_roads', ['duong va dia danh', 'ten duong google', 'lop duong google', 'nhan duong']],
        ['prov34', ['ranh gioi 34 tinh', '34 tinh', 'ranh gioi tinh', 'dia gioi tinh']],
        ['dongthap', ['ranh gioi xa dong thap', 'xa dong thap', 'cac xa dong thap', 'ranh gioi xa']]
    ];

    function parseMapLayer(raw, t, provinces) {
        // 1. Quy hoạch Guland 2030
        if (/(quy hoach|guland)/.test(t)) {
            if (/(xuat|in)\b/.test(t)) return null; // dành cho exportDrawing
            const opM = t.match(/(?:do mo|do ro|trong suot|opacity)\s*(?:quy hoach)?\s*(\d{1,3})\s*%?/);
            const off = /\b(tat|an|bo|dung)\b/.test(t) && !/\b(bat|mo|hien|xem)\b/.test(t);
            const on = !off;
            const pIdx = findProvince(raw, provinces);
            const args = { kind: 'planning', value: pIdx >= 0 ? provinces[pIdx].name : 'current', on };
            if (opM) {
                const pct = parseInt(opM[1], 10);
                if (pct >= 10 && pct <= 100) args.opacity = pct;
            }
            return args;
        }
        // 2. Lớp phủ giao thông / ranh giới hành chính
        if (/\b(bat|tat|mo|an|hien|chuyen|xem)\b/.test(t)) {
            for (const [id, words] of MAP_OVERLAY_ALIASES) {
                if (words.some(w => t.indexOf(w) >= 0)) {
                    const off = /\b(tat|an|bo)\b/.test(t) && !/\b(bat|mo|hien)\b/.test(t);
                    return { kind: 'overlay', value: id, on: !off };
                }
            }
        }
        // 3. Bản đồ nền (basemap)
        const mentionsBase = /\b(nen|ban do nen|lop nen|nen ban do|lop ban do)\b/.test(t) || /\b(opentopomap|opentopo|google terrain|ve tinh esri)\b/.test(t);
        if (mentionsBase && /\b(doi|chuyen|bat|dung|chon|sang|mo|xem|tat|bo)\b/.test(t) && !/\b(xuat|in)\b/.test(t)) {
            if (/\bdia hinh\b/.test(t) && !/google/.test(t)) return { kind: 'basemap', value: 'opentopomap' };
            for (const [id, words] of MAP_BASE_ALIASES) {
                if (words.some(w => t.indexOf(w) >= 0)) return { kind: 'basemap', value: id };
            }
        }
        return null;
    }

    /** Đọc lệnh thao tác trực tiếp trên MiniCAD. */
    const CAD_ACTIONS = ['table', 'polygon', 'polyline', 'point', 'snap', 'ortho', 'polar', 'undo', 'redo', 'zoom', 'connect', 'symbols', 'qselect', 'inquiry_dist', 'inquiry_area'];
    function parseCadAction(t) {
        if (/(bang ke|bang dien tich|bang toa do dinh).*(minicad|cad|ban ve)|mo bang ke\b|xem bang ke\b/.test(t)) return { action: 'table' };
        if (/\bve (da giac|ranh thua|hinh da giac)\b/.test(t)) return { action: 'polygon' };
        if (/\bve (tuyen|duong tim|duong thang|polyline|bo ranh ho)\b/.test(t)) return { action: 'polyline' };
        if (/\b(cham diem cad|ve diem cad|che do cham diem cad)\b/.test(t)) return { action: 'point' };
        if (/\b(bat|tat|chuyen|doi) (che do )?(snap|osnap|bat diem)\b/.test(t)) return { action: 'snap' };
        if (/\b(bat|tat|chuyen|doi) (che do )?(ortho|vuong goc|khoa vuong goc)\b|^khoa vuong goc$/.test(t)) return { action: 'ortho' };
        if (/\b(bat|tat|chuyen|doi) (che do )?(polar|goc cuc|bat goc)\b/.test(t)) return { action: 'polar' };
        if (/\b(hoan tac|undo|lui buoc)\b/.test(t) && !/xuat/.test(t)) return { action: 'undo' };
        if (/\b(lam lai|redo|tien buoc)\b/.test(t)) return { action: 'redo' };
        if (/(zoom toan canh|bao quat (ban ve|minicad|cac khoi|thua)|zoom extents|vua khung ban ve)/.test(t)) return { action: 'zoom' };
        if (/(noi diem|noi moc) (minicad|cad|thanh da giac|thanh tuyen|tren ban ve)/.test(t) || /^noi diem$/.test(t)) return { action: 'connect' };
        if (/(ky hieu dinh|mau ky hieu|bieu tuong dinh|symbol).*(cad|minicad|ban ve)|mo bang ky hieu/.test(t)) return { action: 'symbols' };
        if (/(qselect|chon nhanh doi tuong|loc doi tuong cad)/.test(t)) return { action: 'qselect' };
        if (/(do khoang cach|do cu ly|lenh dist) (tren )?(minicad|cad|ban ve)/.test(t)) return { action: 'inquiry_dist' };
        if (/(do dien tich|lenh area) (tren )?(minicad|cad|ban ve)/.test(t)) return { action: 'inquiry_area' };
        return null;
    }

    /** Đọc lệnh tối ưu lộ trình đi qua các mốc của dự án. */
    function parseRouteProject(t) {
        const wantsOpt = /(toi uu lo trinh|lap lo trinh|chi duong di het|di qua (tat ca |het )?(cac )?moc|lo trinh (tat ca |cac )?moc|lo trinh du an|toi uu duong di)/.test(t)
            || (/(lo trinh|chi duong)/.test(t) && /(xe may|o to|oto|xe hoi|16 cho|minibus|tu vi tri hien tai)/.test(t));
        if (!wantsOpt) return null;
        let vehicle = 'car';
        if (/(xe may|gan may|moto|bike|2 banh)/.test(t)) vehicle = 'bike';
        else if (/(16 cho|minibus|xe khach|xe lon|o to lon|duong lon)/.test(t)) vehicle = 'minibus';
        const startFromGps = /(tu vi tri hien tai|tu day|tu cho toi|tu gps)/.test(t);
        const args = { vehicle };
        if (startFromGps) args.startFromGps = true;
        return args;
    }

    /** Đọc lệnh liệt kê / chuyển / tạo dự án. */
    function parseSwitchProject(raw, t) {
        if (/(danh sach (cac )?du an|liet ke (cac )?du an|co nhung du an nao|cac du an da luu|xem cac du an)/.test(t)) {
            return { action: 'list' };
        }
        const mCreate = raw.match(/(?:tạo|tao|thêm|them|lập|lap)\s+(?:file\s+)?(?:dự án|du an)\s+(?:mới\s+|moi\s+)?(?:tên\s+|ten\s+)?(.+)$/i);
        if (mCreate) {
            const name = cleanEntityToken(mCreate[1]).replace(/\s+(?:giúp|giup|nhé|nhe|nha|với|voi).*$/i, '').trim();
            if (name && !/^(mới|moi|này|nay)$/i.test(fold(name))) return { action: 'create', name: name.slice(0, 50) };
        }
        const mSwitch = raw.match(/(?:chuyển sang|chuyen sang|đổi sang|doi sang|mở|mo|vào|vao|dùng|dung)\s+(?:file\s+)?(?:dự án|du an)\s+(.+)$/i);
        if (mSwitch) {
            const name = cleanEntityToken(mSwitch[1]).replace(/\s+(?:giúp|giup|nhé|nhe|nha|với|voi).*$/i, '').trim();
            const fn = fold(name);
            if (name && !/^(hien tai|dang mo|nao|nay|moi|cua toi)$/.test(fn)) return { action: 'switch', name: name.slice(0, 50) };
        }
        return null;
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
            /(so lieu|du lieu|moc|toa do) (co )?(bi )?(loi|sai|trung|dao|nhay|on khong)\b/.test(t)) return { intent: 'checkData', args: {} };

        // Xuất bản vẽ có tham số: "xuất PDF A3 tỷ lệ 1:500 nền vệ tinh, in cả bảng điểm"
        const ex = parseExport(t);
        if (ex) return { intent: 'exportDrawing', args: ex };

        // Đọc số tọa độ trong câu
        const nums = extractNumbers(raw.replace(/\b(vn|wgs)[\s-]?(2000|84)\b/gi, ' '));

        // Tính diện tích đa giác từ ≥ 3 cặp tọa độ dán trực tiếp (máy tự tính)
        if (nums.length >= 6 && /(dien tich|chu vi|bao nhieu m2|bao nhieu met vuong|bao nhieu ha)/.test(t)) {
            const pts = [];
            for (let i = 0; i + 1 < nums.length; i += 2) {
                const pair = readPair(nums[i], nums[i + 1]);
                if (pair) pts.push(pair);
            }
            if (pts.length >= 3 && pts.every(p => p.kind === pts[0].kind)) {
                return { intent: 'calcArea', args: { points: pts } };
            }
        }

        // Quy đổi tọa độ VN-2000 sang KTT tỉnh khác (không làm đổi KTT chung của app)
        const pIdx = findProvince(raw, provinces);
        if (nums.length >= 2) {
            const p0 = readPair(nums[0], nums[1]);
            if (p0 && p0.kind === 'vn2k' && pIdx >= 0 && /(ktt|kinh tuyen|doi he|quy doi|sang ktt|he toa do)/.test(t)) {
                return { intent: 'rezone', args: { toProvince: provinces[pIdx].name, index: pIdx, X: p0.X, Y: p0.Y } };
            }
        }

        const wantsDistance = /(khoang cach|cu ly|phuong vi|goc phuong vi|dai bao nhieu)/.test(t);
        if (nums.length >= 4 && wantsDistance) {
            const p1 = readPair(nums[0], nums[1]), p2 = readPair(nums[2], nums[3]);
            if (p1 && p2 && p1.kind === p2.kind) return { intent: 'distance', args: { p1, p2 } };
        }
        if (nums.length >= 2) {
            const p = readPair(nums[0], nums[1]);
            if (p) {
                const saveMatch = /\bluu\b/.test(t) ? parseSavePoint(raw, t) : null;
                return {
                    intent: p.kind === 'wgs' ? 'wgs2vn' : 'vn2wgs',
                    args: Object.assign({}, p, { showOnMap: /ban do/.test(t) }, saveMatch ? { saveAs: saveMatch.name, saveNote: saveMatch.note || '' } : {})
                };
            }
        }

        // Khoảng cách / phương vị giữa 2 mốc có tên (hoặc từ GPS / điểm vừa rồi tới mốc)
        const dp = parseDistancePoints(raw, t);
        if (dp) return { intent: 'distancePoints', args: dp };

        // Lưu điểm vừa chuyển hoặc vị trí hiện tại vào dự án
        const sv = parseSavePoint(raw, t);
        if (sv) return { intent: 'savePoint', args: sv };

        // Chế độ Thực địa (ngoài nắng) & ngôn ngữ
        if (/(bat|mo|chuyen sang|dung) (che do )?(thuc dia|ngoai nang)/.test(t)) return { intent: 'appMode', args: { target: 'field', value: 'on' } };
        if (/(tat|thoat|huy|bo) (che do )?(thuc dia|ngoai nang)/.test(t)) return { intent: 'appMode', args: { target: 'field', value: 'off' } };
        if (/(doi|chuyen|dung|bat|sang) (ngon ngu |sang )?(tieng anh|english)/.test(t) || /^english$/.test(t)) return { intent: 'appMode', args: { target: 'lang', value: 'en' } };
        if (/(doi|chuyen|dung|bat|sang) (ngon ngu |sang )?(tieng viet|vietnamese)/.test(t)) return { intent: 'appMode', args: { target: 'lang', value: 'vi' } };

        // Lớp bản đồ nền, lớp phủ giao thông / ranh giới, bản đồ quy hoạch 2030
        const ml = parseMapLayer(raw, t, provinces);
        if (ml) return { intent: 'mapLayer', args: ml };

        // Điều khiển công cụ MiniCAD trực tiếp
        const ca = parseCadAction(t);
        if (ca) return { intent: 'cadAction', args: ca };

        // Thống kê bản vẽ MiniCAD / hỏi diện tích thửa cụ thể
        if (/(thong ke|tong ket|tom tat) (minicad|mini cad|ban ve|cac thua|cac khoi)/.test(t) ||
            /(tong dien tich|ban ve co may khoi|co may (khoi|thua) (tren|trong) (minicad|ban ve))/.test(t)) {
            return { intent: 'cadSummary', args: {} };
        }
        const mParcelArea = raw.match(/(?:diện tích|dien tich|chu vi)\s+(?:của\s+|cua\s+)?((?:thửa|thua|khối|khoi|lô|lo)\s*[A-Za-zÀ-ỹ0-9_.-]+)/i);
        if (mParcelArea && !/(tính diện tích$|tinh dien tich$)/.test(t)) {
            return { intent: 'cadSummary', args: { query: cleanEntityToken(mParcelArea[1]) } };
        }

        // Cắm mốc một điểm CỤ THỂ theo tên ("cắm mốc M2", "dẫn đường tới mốc A1")
        if (/(cam moc|stakeout|dan duong (toi|den)|chi huong (toi|den)|di toi|tim ngoai thuc dia)/.test(t)) {
            const ptName = extractPointAfterKeyword(raw, /(?:cắm mốc|cam moc|stakeout|dẫn đường (?:tới|đến)|dan duong (?:toi|den)|chỉ hướng (?:tới|đến)|chi huong (?:toi|den)|đi tới|di toi|tìm ngoài thực địa)\s+(?:mốc\s+|moc\s+|điểm\s+|diem\s+|cọc\s+|coc\s+)?(.+)$/i);
            if (ptName && !/^(chuc nang|ngoai thuc dia|gan nhat)$/.test(fold(ptName))) {
                return { intent: 'stakeoutPoint', args: { name: ptName } };
            }
        }

        // Tối ưu lộ trình dự án theo phương tiện
        const rp = parseRouteProject(t);
        if (rp) return { intent: 'routeProject', args: rp };

        // Tìm mốc cụ thể trong dự án ("tìm mốc M2", "tọa độ mốc M1", "mốc M3 ở đâu")
        if (/(tim|tra|xem|toa do|thong tin|vi tri).*\b(moc|diem|coc)\b|\b(moc|coc)\s+[a-z0-9_.-]+\s+(o dau|la bao nhieu|toa do)/.test(t) &&
            !/(ban do moc|danh sach moc|co bao nhieu moc|so luong moc|co may moc|xem moc$|tim moc$|tim moc ngoai|vi tri (cua )?(toi|minh|em|hien tai)|toa do (cua )?(toi|hien tai|o day|cho nay))/.test(t)) {
            const q = extractPointAfterKeyword(raw, /(?:tìm|tim|tra|xem|tọa độ|toa do|thông tin|thong tin|vị trí|vi tri)\s+(?:của\s+|cua\s+)?(?:mốc|moc|điểm|diem|cọc|coc)\s+(.+)$/i)
                || extractPointAfterKeyword(raw, /(?:mốc|moc|cọc|coc)\s+([A-Za-zÀ-ỹ0-9_.-]+)\s+(?:ở đâu|o dau|là bao nhiêu|la bao nhieu|tọa độ|toa do)/i);
            if (q && !/^(ngoai|thuc|dia|du|an|da|do|gan|nhat|vua|roi|do|nay)$/.test(fold(q))) {
                return { intent: 'findPoint', args: { query: q } };
            }
        }

        // Quy đổi điểm vừa rồi sang KTT tỉnh khác (ngữ cảnh hội thoại)
        if (pIdx >= 0 && /(diem vua|diem do|toa do vua|toa do do)/.test(t) && /(ktt|kinh tuyen|quy doi|doi he|sang)/.test(t)) {
            return { intent: 'rezone', args: { toProvince: provinces[pIdx].name, index: pIdx } };
        }

        // Liệt kê / chuyển / tạo dự án
        const sp = parseSwitchProject(raw, t);
        if (sp) return { intent: 'switchProject', args: sp };

        // Múi chiếu
        const mui = t.match(/\bmui (3|6)\b/);
        if (mui && /(doi|dat|chon|chuyen|dung|sang)/.test(t)) return { intent: 'setMui', args: { mui: +mui[1] } };

        // KTT / tỉnh
        const mentionsKtt = /(ktt|kinh tuyen truc|kinh tuyen|mui chieu|tinh dang dung|tinh hien tai)/.test(t);
        // "dùng" chỉ là lệnh đổi khi đứng đầu câu hoặc ngay trước tỉnh/KTT ("KTT đang dùng" là câu hỏi).
        const setVerb = /\b(doi|dat|chon|chuyen|ap dung|lam viec o)\b/.test(t) || (/\bdung (tinh|ktt|kinh tuyen|mui)\b/.test(t) && !/dang dung/.test(t)) || (/^dung\b/.test(t) && !/dang dung/.test(t));
        if (pIdx >= 0 && setVerb) return { intent: 'setProvince', args: { index: pIdx } };
        if (pIdx >= 0 && (mentionsKtt || t.length <= 30)) return { intent: 'kttOf', args: { index: pIdx } };
        if (mentionsKtt && !setVerb) return { intent: 'kttInfo', args: {} };

        // GPS (tránh bắt nhầm tên chức năng "GPS live shots")
        if (!/\blive\s*shot/.test(t) && /(tat|ngat|dung) (gps|dinh vi)/.test(t)) return { intent: 'gps', args: { on: false } };
        if (!/\blive\s*shot/.test(t) && /(bat|mo) (gps|dinh vi)/.test(t)) return { intent: 'gps', args: { on: true } };
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
        { name: 'findPoint', desc: 'Tìm tọa độ và thông tin chi tiết của một mốc cụ thể trong dự án theo tên', params: { query: { type: 'string' } } },
        { name: 'distancePoints', desc: 'Tính khoảng cách phẳng VN-2000 và phương vị giữa 2 mốc có tên (hoặc từ GPS/LAST đến mốc)', params: { from: { type: 'string' }, to: { type: 'string' } } },
        { name: 'savePoint', desc: 'Lưu điểm vừa chuyển hoặc vị trí GPS hiện tại vào sổ đo dự án đang mở', params: {
            name: { type: 'string' },
            note: { type: 'string', optional: true },
            source: { type: 'string', enum: ['last', 'gps'], optional: true } } },
        { name: 'stakeoutPoint', desc: 'Mở Cắm mốc thực địa và chọn sẵn mốc mục tiêu theo tên', params: { name: { type: 'string' } } },
        { name: 'cadSummary', desc: 'Thống kê số khối, tổng diện tích, chu vi trên MiniCAD hoặc tra diện tích một thửa', params: { query: { type: 'string', optional: true } } },
        { name: 'cadAction', desc: 'Điều khiển trực tiếp công cụ trên MiniCAD (mở bảng kê, vẽ đa giác/tuyến, snap, ortho, undo, zoom…)', params: {
            action: { type: 'string', enum: CAD_ACTIONS } } },
        { name: 'mapLayer', desc: 'Đổi bản đồ nền (vệ tinh, địa hình, đường phố), bật/tắt lớp phủ giao thông/ranh giới hoặc quy hoạch 2030', params: {
            kind: { type: 'string', enum: ['basemap', 'overlay', 'planning'] },
            value: { type: 'string' },
            on: { type: 'boolean', optional: true },
            opacity: { type: 'integer', optional: true } } },
        { name: 'routeProject', desc: 'Nạp toàn bộ mốc dự án vào Lộ trình và tối ưu đường đi theo phương tiện', params: {
            vehicle: { type: 'string', enum: ['bike', 'car', 'minibus'] },
            startFromGps: { type: 'boolean', optional: true } } },
        { name: 'rezone', desc: 'Quy đổi tọa độ VN-2000 (hoặc điểm vừa chuyển) sang KTT của một tỉnh khác', params: {
            toProvince: { type: 'string' },
            X: { type: 'number', optional: true },
            Y: { type: 'number', optional: true } } },
        { name: 'switchProject', desc: 'Liệt kê, chuyển sang hoặc tạo mới dự án sổ đo (an toàn, không xóa dữ liệu)', params: {
            action: { type: 'string', enum: ['list', 'switch', 'create'] },
            name: { type: 'string', optional: true } } },
        { name: 'appMode', desc: 'Bật/tắt Chế độ Thực địa ngoài nắng hoặc đổi ngôn ngữ Việt/Anh', params: {
            target: { type: 'string', enum: ['field', 'lang'] },
            value: { type: 'string', enum: ['on', 'off', 'vi', 'en'] } } },
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
            else v = String(v).trim();
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
        if (name === 'rezone') {
            const idx = findProvince(args.toProvince, (ctx && ctx.provinces) || []);
            if (idx < 0) return null;
            if ((args.X !== undefined || args.Y !== undefined) && !(isX(args.X) && isY(args.Y))) { delete args.X; delete args.Y; }
            args.index = idx;
            return { intent: 'rezone', args };
        }
        if (name === 'mapLayer') {
            if (args.kind === 'basemap' && BASEMAPS.indexOf(args.value) < 0) return null;
            if (args.kind === 'overlay' && ['esri_transport', 'google_roads', 'google_traffic', 'prov34', 'dongthap'].indexOf(args.value) < 0) return null;
            if (args.opacity !== undefined && (args.opacity < 10 || args.opacity > 100)) delete args.opacity;
        }
        if (name === 'appMode') {
            if (args.target === 'field' && !['on', 'off'].includes(args.value)) return null;
            if (args.target === 'lang' && !['vi', 'en'].includes(args.value)) return null;
        }
        if (name === 'switchProject' && args.action !== 'list' && !args.name) return null;
        if (name === 'exportDrawing' && args.scale !== undefined && args.scale !== 0 && (args.scale < 50 || args.scale > 100000)) delete args.scale;
        return { intent: name, args };
    }

    /** Lời gọi chuẩn (để so sánh / làm ví dụ) từ kết quả route. */
    function callOf(r, ctx) {
        if (!r || !TOOL_BY_NAME[r.intent]) return null;
        const a = Object.assign({}, r.args || {});
        delete a.kind; delete a.showOnMap; delete a.numbers; delete a.saveAs; delete a.saveNote;
        if ((r.intent === 'kttOf' || r.intent === 'setProvince') && ctx && ctx.provinces && ctx.provinces[a.index]) return { tool: r.intent, args: { province: ctx.provinces[a.index].name } };
        if (r.intent === 'rezone') {
            if (ctx && ctx.provinces && ctx.provinces[a.index]) a.toProvince = ctx.provinces[a.index].name;
            delete a.index;
        }
        if (r.intent === 'mapLayer' && r.args && r.args.kind) a.kind = r.args.kind;
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

    // ---------------- Học theo ví dụ & Gợi ý thông minh (từ khóa + n-gram chống gõ nhầm) ----------------
    const STOP = new Set(['toi', 'minh', 'em', 'anh', 'chi', 'giup', 'cho', 'voi', 'nha', 'nhe', 'di', 'cai', 'la', 'co', 'khong', 'cua', 'duoc', 'nay', 'do', 've', 'hay', 'lam', 'on']);
    const tokenize = s => fold(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 1);
    function trigrams(s) {
        const clean = ' ' + fold(s).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
        const out = new Set();
        for (let i = 0; i <= clean.length - 3; i++) out.add(clean.slice(i, i + 3));
        return out;
    }
    function similarity(aText, bText) {
        const qa = tokenize(aText), wb = tokenize(bText);
        if (!qa.length || !wb.length) return 0;
        const qs = new Set(qa), ws = new Set(wb);
        let inter = 0, wInter = 0, wUnion = 0;
        const all = new Set([...qs, ...ws]);
        all.forEach(w => {
            const wt = STOP.has(w) ? 0.35 : 1.0;
            wUnion += wt;
            if (qs.has(w) && ws.has(w)) { inter++; wInter += wt; }
        });
        const tokScore = wUnion ? wInter / wUnion : 0;
        // Cộng điểm 3-gram ký tự để bắt lỗi chính tả tiếng Việt ("mincad" ~ "minicad", "trc doc" ~ "trac doc")
        const ga = trigrams(aText), gb = trigrams(bText);
        let gInter = 0;
        ga.forEach(g => { if (gb.has(g)) gInter++; });
        const triScore = (ga.size + gb.size) ? (2 * gInter) / (ga.size + gb.size) : 0;
        return inter > 0 ? (0.72 * tokScore + 0.28 * triScore) : (0.55 * triScore);
    }

    function nearestExamples(text, dataset, k) {
        const q = tokenize(text);
        if (!q.length || !Array.isArray(dataset)) return [];
        return dataset.map(e => ({ e, s: similarity(text, e[0]) }))
            .filter(x => x.s > 0.08)
            .sort((a, b) => b.s - a.s)
            .slice(0, k || 6)
            .map(x => x.e);
    }

    /** Khi bộ định tuyến trả về unknown, gợi ý tối đa 3 lệnh gần nhất (khác nhóm công cụ) để người dùng chạm chọn — KHÔNG tự đoán chạy bừa. */
    function suggestCommands(text, dataset, limit) {
        if (!text || !Array.isArray(dataset) || !dataset.length) return [];
        const scored = dataset.map(e => ({ e, s: similarity(text, e[0]) }))
            .filter(x => x.s >= 0.24)
            .sort((a, b) => b.s - a.s);
        const picked = [];
        const seenKey = new Set();
        for (const item of scored) {
            const key = item.e[1] + ':' + JSON.stringify(item.e[2] || {});
            if (seenKey.has(key)) continue;
            seenKey.add(key);
            picked.push({ text: item.e[0], tool: item.e[1], args: item.e[2] || {}, score: Number(item.s.toFixed(3)) });
            if (picked.length >= (limit || 3)) break;
        }
        return picked;
    }

    /** Tin nhắn cho mô hình cục bộ / máy chủ: danh mục công cụ ngắn + vài ví dụ gần nhất. */
    function buildToolMessages(userText, dataset, k) {
        const toolLines = TOOLS.map(t => `- ${t.name}: ${t.desc}` + (Object.keys(t.params).length ? ` (${Object.entries(t.params).map(([n, p]) => n + (p.enum && p.enum.length <= 8 ? '=' + p.enum.join('|') : ':' + p.type) + (p.optional ? '?' : '')).join(', ')})` : '')).join('\n');
        const feats = FEATURES.map(f => `${f[0]} = ${f[1][0]}`).join('; ');
        const sys = 'Bạn là bộ điều khiển thông minh của ứng dụng trắc địa VN2000 Pro. Đọc câu tiếng Việt của người dùng và trả về đúng MỘT JSON {"tool": tên, "args": {...}} chọn trong danh mục. ' +
            'Không tự tính toán, không bịa số: số tọa độ phải chép nguyên văn từ câu người dùng. Nếu không khớp công cụ nào, trả về {"tool":"none","args":{}}.\n' +
            'Danh mục:\n' + toolLines + '\nMã chức năng cho open.target: ' + feats;
        const msgs = [{ role: 'system', content: sys }];
        nearestExamples(userText, dataset, k || 6).forEach(e => {
            msgs.push({ role: 'user', content: e[0] });
            msgs.push({ role: 'assistant', content: JSON.stringify({ tool: e[1], args: e[2] || {} }) });
        });
        msgs.push({ role: 'user', content: String(userText || '').slice(0, 300) });
        return msgs;
    }

    /** Lời gọi hàm kiểu OpenAI (dùng cho AI máy chủ: Qwen / DeepSeek / Ollama / Groq / Gemini…). */
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

    // ---------------- Lệnh chuẩn cho mô hình AI (dự phòng không tham số) ----------------
    // Mô hình chỉ được chọn đúng một dòng trong danh sách này (hoặc "khong ro"). Không có số nào ở đây,
    // vì số luôn đọc trực tiếp từ câu người dùng bằng extractNumbers.
    const CANONICAL = [
        'mo trang chu', 'mo chuyen doi toa do', 'mo chuyen doi hang loat', 'mo cham toa do', 'mo ban do du an',
        'mo cam moc', 'mo gps live shots', 'mo camera', 'mo lo trinh', 'mo so do', 'mo bai toan trac dia', 'mo giao hoi', 'mo trac doc',
        'mo minicad', 'mo cam nang', 'ktt hien tai', 'vi tri cua toi', 'bat gps', 'tat gps', 'du an hien tai',
        'danh sach du an', 'kiem tra so lieu', 'thong ke minicad', 'mo bang ke minicad', 'zoom toan canh ban ve',
        'bat quy hoach', 'tat quy hoach', 'doi nen dia hinh', 'toi uu lo trinh', 'bat che do thuc dia',
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
        'Chuyển đổi & Đổi KTT: "10.7769 106.7009", "X 1191234 Y 602345", "quy đổi điểm vừa rồi sang KTT Đồng Tháp"',
        'Mốc & Khoảng cách: "tìm mốc M1", "khoảng cách từ M1 đến M3", "cắm mốc M2", "lưu điểm vừa chuyển tên M5"',
        'Diện tích & MiniCAD: "thống kê MiniCAD", "diện tích thửa 1", "mở bảng kê MiniCAD", "vẽ đa giác", "bật snap", "zoom toàn cảnh bản vẽ"',
        'Lớp bản đồ & Quy hoạch: "bật quy hoạch Đồng Tháp", "độ mờ quy hoạch 60%", "đổi nền địa hình", "bật giao thông trực tiếp", "bật ranh giới 34 tỉnh"',
        'Xuất bản vẽ: "xuất PDF A3 tỷ lệ 1:500 nền vệ tinh, in cả hai bảng", "xuất DWG", "xuất ảnh không nền"',
        'Lộ trình & Dự án: "tối ưu lộ trình xe máy", "danh sách dự án", "tạo dự án mới KhuA", "kiểm tra số liệu"',
        'KTT, GPS & Chế độ: "đổi KTT sang Đồng Tháp", "vị trí của tôi", "bật chế độ thực địa", "đổi sang tiếng Anh", "kiểm thử"',
        'Hội thoại nối tiếp: "10.7769 106.7009" → sau đó nói "xem điểm đó trên bản đồ" hoặc "lưu điểm đó tên M5"'
    ];

    const api = { fold, extractNumbers, readPair, findProvince, provinceKey, findFeature, splitChain, route, FEATURES,
        parseExport, qcPoints, TOOLS, CAD_ACTIONS, validateCall, callOf, buildGrammar, nearestExamples, suggestCommands, similarity,
        buildToolMessages, openAiTools, parseToolJson, PAPERS, BASEMAPS,
        CANONICAL, buildLlmMessages, parseLlmCommand, fmtM, fmtDeg, fmtKtt, fmtAzimuth, HELP };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.AssistantCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
