/* Vỏ giao diện thống nhất:
   1) Thanh ngữ cảnh dưới header (điện thoại): tên màn hình đang mở + dự án hiện hành.
   2) Mục lục chức năng (phương án A — danh sách gọn): dùng chung cho menu ☰ và "Tất cả chức năng" ở Trang chủ.
      Đọc từ chính menu ☰ cũ (ẩn) → một nguồn duy nhất; mỗi dòng chỉ kích hoạt mục menu tương ứng.
   Không chứa logic nghiệp vụ. */
(function (root) {
    'use strict';

    // Tên màn hình gọn, thống nhất (header gốc dùng chữ in hoa + số thứ tự không khớp menu).
    const TITLES = {
        'CHUYỂN ĐỔI TỌA ĐỘ': ['Chuyển đổi tọa độ', 'Coordinate conversion'],
        'CHUYỂN ĐỔI 2 CHIỀU ĐƠN ĐIỂM': ['Chuyển đổi tọa độ', 'Coordinate conversion'],
        'CHUYỂN ĐỔI ĐA ĐIỂM HÀNG LOẠT': ['Chuyển đổi hàng loạt', 'Batch conversion'],
        'CHẤM CHỌN TỌA ĐỘ BẢN ĐỒ': ['Chấm tọa độ trên bản đồ', 'Pick coordinates on map'],
        'VỊ TRÍ ĐIỂM CHUYỂN ĐỔI': ['Vị trí điểm chuyển đổi', 'Converted point location'],
        'BẢN ĐỒ DỰ ÁN & MỐC': ['Bản đồ dự án & Mốc', 'Project map'],
        'CẮM MỐC THỰC ĐỊA': ['Cắm mốc thực địa', 'Stakeout'],
        'CAMERA ĐÓNG DẤU': ['GPS live shots', 'GPS live shots'],
        'GPS LIVE SHOTS': ['GPS live shots', 'GPS live shots'],
        'GPS THỰC ĐỊA': ['GPS thực địa', 'Field GPS'],
        'VỊ TRÍ GPS THỰC ĐỊA': ['Vị trí GPS', 'GPS location'],
        'TỐI ƯU LỘ TRÌNH & CHỈ ĐƯỜNG': ['Lộ trình & Chỉ đường', 'Routing'],
        'SỔ ĐO & DỰ ÁN': ['Sổ đo & Dự án', 'Field book & Projects'],
        'BÀI TOÁN TRẮC ĐỊA': ['Bài toán trắc địa', 'Survey calculations'],
        'TRẮC DỌC & ĐÀO ĐẮP': ['Trắc dọc & Đào đắp', 'Profile & Cut/Fill'],
        'VẼ MẶT BẰNG & BẢNG KÊ MINICAD': ['MiniCAD', 'MiniCAD'],
        'THÔNG TIN & HƯỚNG DẪN': ['Thông tin & Hướng dẫn', 'About & Guide']
    };

    /** "🗺️ 2. BẢN ĐỒ DỰ ÁN & MỐC" → "Bản đồ dự án & Mốc" */
    function cleanTitle(raw, isEn) {
        const key = String(raw || '').replace(/<[^>]*>/g, '')
            .replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+(\.\d+)?\.?\s+/, '').trim();
        const hit = TITLES[key.toUpperCase()];
        if (hit) return hit[isEn ? 1 : 0];
        return key;
    }

    const fold = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    const stripNo = t => String(t || '').replace(/^\s*\d+\.\d+\s+/, '').trim();

    // ---------- Mục lục: tên gọn, mô tả, biểu tượng nét (theo id mục menu ☰) ----------
    const ICON = {
        swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
        table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14',
        rotate: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
        pin: 'M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
        map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
        target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
        camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        gps: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 2v3M12 19v3M2 12h3M19 12h3M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
        bluetooth: 'M7 7l10 10-5 5V2l5 5L7 17',
        route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
        book: 'M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h11M8 8h6',
        cloud: 'M7 18a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z',
        angle: 'M4 20h16M4 20 18 6M10 20a6 6 0 0 0-1.8-4.2',
        triangle: 'M12 4 3 19h18zM12 11.5a1 1 0 1 0 0.01 0',
        chart: 'M3 20h18M3 16l5-6 4 3 5-7 4 4',
        pen: 'M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.6 7.6M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
        globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
        clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
        guide: 'M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z',
        info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-5M12 8h.01',
        coffee: 'M17 8h1a3 3 0 0 1 0 6h-1M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM7 2v2M11 2v2',
        home: 'M3 11 12 4l9 7M5 10v10h14V10M10 20v-5h4v5',
        chevron: 'M9 6l6 6-6 6',
        star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'
    };
    // [tên vi, tên en, mô tả vi, mô tả en, biểu tượng, từ khóa tìm thêm]
    const ITEM_META = {
        drawerItem_transform: ['Chuyển đổi đơn điểm', 'Single-point conversion', 'WGS-84 ⇄ VN-2000, chuẩn 7 tham số', 'WGS-84 ⇄ VN-2000, 7 parameters', 'swap', 'transform 7 tham so'],
        drawerItem_batch: ['Chuyển đổi hàng loạt', 'Batch conversion', 'Dán bảng, CSV / Excel, quét ảnh', 'Paste a table, CSV / Excel, photo OCR', 'table', 'batch csv excel ocr nhap file import'],
        drawerItem_rezone: ['Đổi KTT / múi chiếu', 'Change CM / zone', 'VN-2000 giữa các tỉnh, múi 3° / 6°', 'VN-2000 between provinces, 3° / 6°', 'rotate', 'rezone kinh tuyen truc'],
        drawerItem_transform_map: ['Chấm tọa độ trên bản đồ', 'Pick coordinates on map', 'Chạm bản đồ để lấy tọa độ', 'Tap the map to get coordinates', 'pin', 'cham diem pick'],
        drawerItem_map: ['Bản đồ dự án', 'Project map', 'Mốc, vệ tinh, đo cự ly & góc', 'Points, satellite, distance & angle', 'map', 'ban do moc ve tinh'],
        drawerItem_stakeout: ['Cắm mốc', 'Stakeout', 'La bàn, radar dẫn hướng, bíp đích', 'Compass, guidance radar, arrival beep', 'target', 'stakeout radar'],
        drawerItem_camera: ['GPS live shots', 'GPS live shots', 'Chụp ảnh, quay video in tọa độ, GPS, giờ', 'Live field photo/video with GPS, coordinates, time', 'camera', 'gps live shots camera chup anh anh dong dau photo'],
        drawerItem_gps_toggle: ['GPS & sai số', 'GPS & accuracy', 'Bật / tắt, độ chính xác ±m', 'On / off, accuracy ±m', 'gps', 'gps ve tinh'],
        drawerItem_settings_rtk: ['Máy RTK ngoài', 'External RTK receiver', 'GNSS Bluetooth, độ chính xác cm', 'Bluetooth GNSS, cm accuracy', 'bluetooth', 'rtk gnss rover'],
        drawerItem_routing: ['Lộ trình & chỉ đường', 'Routes & directions', 'Xe máy, ô tô, Google Maps', 'Motorbike, car, Google Maps', 'route', 'routing toi uu lo trinh'],
        drawerItem_datamgmt: ['Sổ đo & dự án', 'Field book & projects', 'Bảng mốc, xuất DWG / KML / CSV', 'Point table, DWG / KML / CSV export', 'book', 'so do dwg kml csv xuat export'],
        drawerItem_settings_storage: ['Google Sheets / Cloud', 'Google Sheets / Cloud', 'Đồng bộ lên Google Drive', 'Sync to Google Drive', 'cloud', 'dong bo drive sync'],
        drawerItem_geodesy: ['Bài toán trắc địa', 'Survey calculations', 'Cự ly, phương vị, diện tích', 'Distance, bearing, area', 'angle', 'geodesy cu ly phuong vi dien tich'],
        drawerItem_settings_resection: ['Giao hội', 'Resection', 'Bù tọa độ trạm khi mất GPS', 'Station coordinates without GPS', 'triangle', 'resection giao hoi'],
        drawerItem_profile_volume: ['Trắc dọc & đào đắp', 'Profile & earthwork', 'Mặt cắt, khối lượng m³', 'Cross-sections, volumes in m³', 'chart', 'profile volume dao dap'],
        drawerItem_cad_tool: ['MiniCAD', 'MiniCAD', 'Vẽ mặt bằng, bảng kê, xuất DWG', 'Site plans, area tables, DWG export', 'pen', 'cad ve mat bang dwg'],
        drawerItem_settings_ktt: ['Kinh tuyến trục', 'Central meridian', '34 tỉnh mới, 63 tỉnh cũ, múi 3° / 6°', '34 new / 63 old provinces, 3° / 6°', 'globe', 'ktt tinh'],
        drawerItem_datetime: ['Ngày giờ', 'Date & time', 'Đồng bộ tự động hoặc chỉnh tay', 'Automatic or manual', 'clock', 'ngay gio datetime'],
        drawerItem_user_guide: ['Cẩm nang', 'User guide', 'Hướng dẫn 14 chức năng thực địa', 'Guide to 14 field features', 'guide', 'huong dan guide'],
        drawerItem_about: ['Giới thiệu', 'About', 'Cài ứng dụng, 7 tham số BTNMT', 'Install the app, 7 official parameters', 'info', 'about pwa'],
        drawerItem_donate: ['Ủng hộ tác giả', 'Support the author', 'Tùy tâm tiếp sức phát triển', 'Help keep the app going', 'coffee', 'donate']
    };
    // [tên nhóm vi, en, nút lọc vi, en, màu]
    const GROUP_META = {
        drawerFolder1: ['Chuyển đổi tọa độ', 'Coordinate conversion', 'Chuyển đổi', 'Convert', 'sky'],
        drawerFolder2: ['Bản đồ & thực địa', 'Map & field', 'Thực địa', 'Field', 'green'],
        drawerFolder3: ['Sổ đo & dữ liệu', 'Field book & data', 'Dữ liệu', 'Data', 'violet'],
        drawerFolder4: ['Tính toán & đồ họa', 'Calculations & drawing', 'Tính toán', 'Calc', 'amber'],
        drawerFolder5: ['Hệ thống & trợ giúp', 'System & help', 'Hệ thống', 'System', 'slate']
    };

    /** Mục lục từ dữ liệu thô của menu ☰: [{id, name, items:[{id, name, sub}]}] → nhóm có tên gọn, biểu tượng, ★. */
    function indexModel(rawGroups, pinnedTargets, en) {
        const pinned = new Set(pinnedTargets || []);
        return rawGroups.map(g => {
            const gm = GROUP_META[g.id] || [g.name, g.name, g.name, g.name, 'slate'];
            const items = g.items.map(it => {
                const m = ITEM_META[it.id];
                const name = m ? m[en ? 1 : 0] : stripNo(it.name);
                const sub = m ? m[en ? 3 : 2] : it.sub;
                return {
                    id: it.id, name, sub, icon: ICON[m ? m[4] : 'chevron'],
                    pinned: pinned.has(it.id), current: !!it.current,
                    text: fold([name, sub, it.name, it.sub, m ? m[0] + ' ' + m[1] + ' ' + m[2] + ' ' + m[5] : ''].join(' '))
                };
            });
            return { id: g.id, name: gm[en ? 1 : 0], chip: gm[en ? 3 : 2], color: gm[4], items };
        }).filter(g => g.items.length);
    }

    /** Lọc theo ô tìm và nút nhóm (all = tất cả). */
    function filterModel(model, query, group) {
        const q = fold(query).trim();
        return model
            .filter(g => !group || group === 'all' || g.id === group)
            .map(g => ({ ...g, items: g.items.filter(it => !q || it.text.includes(q)) }))
            .filter(g => g.items.length);
    }

    const api = { cleanTitle, fold, stripNo, TITLES, ICON, ITEM_META, GROUP_META, indexModel, filterModel };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
    root.AppShell = api;

    const byId = id => document.getElementById(id);
    const isEn = () => (typeof appI18n !== 'undefined' && appI18n.currentLang === 'en');

    // ---------- 1) Thanh ngữ cảnh ----------
    function updateContextBar(detail) {
        const title = byId('ctxScreenTitle'), proj = byId('ctxProject');
        if (!title) return;
        const en = isEn();
        if (detail && detail.menu) title.textContent = en ? 'Home' : 'Trang chủ';
        else if (detail && detail.titleVi) {
            const known = TITLES[cleanTitle(detail.titleVi, false).toUpperCase()] || TITLES[String(detail.titleVi).replace(/^[^\p{L}\p{N}]+/u, '').replace(/^\d+(\.\d+)?\.?\s+/, '').trim().toUpperCase()];
            title.textContent = known ? known[en ? 1 : 0] : cleanTitle(en && detail.titleEn ? detail.titleEn : detail.titleVi, en);
        }
        if (proj && typeof AppState !== 'undefined') {
            const name = String(AppState.currentProject || '').replace(/\.[^/.]+$/, '');
            proj.textContent = name ? `📁 ${name}` : '';
            proj.hidden = !name;
        }
    }

    // ---------- 2) Mục lục chức năng (menu ☰ + Tất cả chức năng) ----------
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
    const svg = (d, size, extra) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra || 'aria-hidden="true"'}><path d="${d}"></path></svg>`;

    /** Đọc menu ☰ cũ (ẩn, vẫn giữ trình xử lý bấm và trạng thái "đang mở"). */
    function readMenu() {
        const seen = new Set();
        return [...document.querySelectorAll('#navTreeDrawer .drawer-folder')].filter(f => !seen.has(f.id) && seen.add(f.id)).map(folder => {
            const head = folder.querySelector('.drawer-folder-title');
            return {
                id: folder.id,
                name: head ? head.lastElementChild.textContent.trim() : '',
                items: [...folder.querySelectorAll('.drawer-leaf-item')].filter(it => it.style.display !== 'none').map(it => ({
                    id: it.id,
                    name: (it.querySelector('.drawer-leaf-title') || it).textContent.trim(),
                    sub: ((it.querySelector('.drawer-leaf-sub') || {}).textContent || '').trim(),
                    current: it.classList.contains('selected')
                }))
            };
        });
    }

    /** id chức năng trên Trang chủ (appDashboard) → id mục menu ☰. */
    function pinnedTargets() {
        if (typeof appDashboard === 'undefined' || !appDashboard.getPinnedFeatureIds) return [];
        return appDashboard.getPinnedFeatureIds()
            .map(id => ['drawerItem_' + id, 'drawerItem_settings_' + id].find(x => byId(x)))
            .filter(Boolean);
    }

    const scopes = {
        hub: { list: 'homeFeatureHubList', search: 'txtHubSearch', count: 'hubCount', home: false, group: 'all' },
        drawer: { list: 'drawerFeatureIndex', search: 'txtDrawerSearch', count: null, home: true, group: 'all' }
    };

    function render(scopeName) {
        const sc = scopes[scopeName];
        const host = byId(sc.list);
        if (!host) return;
        const en = isEn();
        const model = indexModel(readMenu(), pinnedTargets(), en);
        const search = byId(sc.search);
        const q = search ? search.value : '';
        const shown = filterModel(model, q, sc.group);
        const total = model.reduce((n, g) => n + g.items.length, 0);
        const chips = [{ id: 'all', chip: en ? 'All' : 'Tất cả' }].concat(model)
            .map(g => `<button type="button" class="fi-chip" data-fi-chip="${g.id}" aria-pressed="${sc.group === g.id}">${esc(g.chip)}</button>`).join('');
        const row = it => `<button type="button" class="fi-row" data-fi-target="${it.id}"${it.current ? ' aria-current="page"' : ''}>` +
            `<span class="fi-icon">${svg(it.icon, 20)}</span>` +
            `<span class="fi-text"><span class="fi-name">${esc(it.name)}</span><span class="fi-sub">${esc(it.sub)}</span></span>` +
            (it.pinned ? `<span class="fi-end fi-star">${svg(ICON.star, 18, 'role="img" aria-label="' + (en ? 'On Home' : 'Đang hiện trên Trang chủ') + '"')}</span>`
                : `<span class="fi-end">${svg(ICON.chevron, 18)}</span>`) + '</button>';
        const home = sc.home && !fold(q).trim() && sc.group === 'all'
            ? `<button type="button" class="fi-row fi-home" data-fi-target="drawerItem_home"${(typeof AppState !== 'undefined' && AppState.currentScreen === 'menu') ? ' aria-current="page"' : ''}>` +
              `<span class="fi-icon">${svg(ICON.home, 20)}</span><span class="fi-text"><span class="fi-name">${en ? 'Home' : 'Trang chủ'}</span></span></button>` : '';
        const groups = shown.map(g => `<section class="fi-group" data-fi-color="${g.color}" aria-label="${esc(g.name)}">` +
            `<h3 class="fi-group-title"><span class="fi-dot" aria-hidden="true"></span>${esc(g.name)}<span class="fi-count">· ${g.items.length}</span></h3>` +
            g.items.map(row).join('') + '</section>').join('');
        const empty = shown.length ? '' : `<p class="fi-empty">${en ? 'No matching feature.' : 'Không có chức năng nào khớp.'}</p>`;
        const legend = model.some(g => g.items.some(it => it.pinned))
            ? `<p class="fi-legend"><span class="fi-star">${svg(ICON.star, 14)}</span>${en ? 'On Home — change with Customize' : 'Đang hiện trên Trang chủ — đổi bằng nút Tùy chỉnh'}</p>` : '';
        host.innerHTML = `<div class="fi-chips" role="group" aria-label="${en ? 'Filter by group' : 'Lọc theo nhóm'}">${chips}</div><div class="fi-list">${home}${groups}${empty}${legend}</div>`;
        if (sc.count && byId(sc.count)) byId(sc.count).textContent = String(total);
        if (search) search.placeholder = en ? 'Find: stakeout, DWG, KML, GPS…' : 'Tìm: cắm mốc, DWG, KML, GPS…';
    }
    const renderAll = () => { render('hub'); render('drawer'); };

    function bindScope(scopeName) {
        const sc = scopes[scopeName];
        const host = byId(sc.list);
        if (!host) return;
        host.addEventListener('click', e => {
            const chip = e.target.closest('[data-fi-chip]');
            if (chip) { sc.group = chip.dataset.fiChip; render(scopeName); return; }
            const rowEl = e.target.closest('[data-fi-target]');
            if (!rowEl) return;
            const target = byId(rowEl.dataset.fiTarget);
            if (target) target.click();
            // Mục không đổi màn hình (Ngày giờ, Ủng hộ, Cẩm nang…) vẫn đóng menu ☰.
            if (scopeName === 'drawer' && typeof AppState !== 'undefined' && AppState.isTreeDrawerOpen && rowEl.dataset.fiTarget !== 'drawerItem_gps_toggle') appNav.closeTreeMenu();
        });
        const search = byId(sc.search);
        if (search) search.addEventListener('input', () => render(scopeName));
    }

    function init() {
        bindScope('hub');
        bindScope('drawer');
        // Mở menu ☰ / đổi màn hình / đổi chức năng trên Trang chủ → vẽ lại (đúng mục đang mở và ★).
        document.addEventListener('vn2000:draweropen', () => {
            // Mỗi lần mở menu: bắt đầu lại từ "Tất cả", ô tìm trống.
            scopes.drawer.group = 'all';
            const search = byId(scopes.drawer.search);
            if (search) search.value = '';
            render('drawer');
        });
        document.addEventListener('vn2000:homechange', renderAll);
        const proj = byId('ctxProject');
        if (proj) proj.addEventListener('click', () => appNav.showScreen('datamgmt'));
        document.addEventListener('vn2000:screenchange', e => updateContextBar(e.detail));
        document.addEventListener('vn2000:contextchange', () => updateContextBar(null));
        // Bộ dịch chạy trên DOM của menu sau khi đổi ngôn ngữ → dựng lại bảng ở nhịp kế tiếp.
        document.addEventListener('vn2000:languagechange', () => setTimeout(() => { renderAll(); updateContextBar(lastDetail); }, 60));
        renderAll();
        updateContextBar({ menu: true });
    }

    let lastDetail = { menu: true };
    document.addEventListener('vn2000:screenchange', e => { lastDetail = e.detail || lastDetail; });

    // ---------- 3) Ưu tiên bản đồ (ui-mapfirst.css) ----------
    // <body data-screen data-map-mode> cho CSS biết màn hình đang mở; đo các lớp phủ thật để bản đồ
    // dùng đúng phần còn trống thay vì đoán bằng số cố định:
    //   --mf-dock-clear  : khoảng phải chừa ở đáy cho dock nổi (0 khi dock là thanh bên trên máy tính)
    //   --mf-rc-top/-bottom (trên #map-view-container): dải trống dọc cho cột nút phải, né CLI/thanh MiniCAD/dock
    const px = n => Math.max(0, Math.round(n)) + 'px';
    // offsetParent luôn null với phần tử position: fixed (dock) → kiểm tra bằng hộp hiển thị.
    const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

    function markScreen() {
        if (typeof AppState === 'undefined' || !document.body) return;
        const scr = String(AppState.currentScreen || 'menu');
        document.body.dataset.screen = scr;
        document.body.dataset.mapMode = scr === 'map' ? String(AppState.mapMode || 'project') : '';
    }

    function measureDock() {
        const nav = byId('mobileBottomNav');
        let clear = 0;
        if (visible(nav)) {
            const r = nav.getBoundingClientRect();
            // Chỉ khi dock nằm ngang ở nửa dưới màn hình (điện thoại, dock đã gập trên máy tính).
            if (r.width > r.height && r.top > window.innerHeight / 2) clear = window.innerHeight - r.top + 6;
        }
        document.documentElement.style.setProperty('--mf-dock-clear', px(clear));
    }

    function measureMapBand() {
        const box = byId('map-view-container'), rc = byId('mapRightControls');
        if (!box || !visible(box) || !rc) return;
        const b = box.getBoundingClientRect(), x0 = rc.getBoundingClientRect().left, x1 = rc.getBoundingClientRect().right;
        const overlapsX = r => r.right > x0 && r.left < x1;
        let top = 0, bottom = 0;
        // Lớp phủ nằm nửa trên (thanh MiniCAD khi máy ngang, CLI, thanh dự án) đẩy mép trên xuống;
        // nằm nửa dưới (thanh MiniCAD khi máy dọc, thanh trạng thái, bảng mốc, dock) đẩy mép dưới lên.
        ['cadFloatingCmdBar', 'mapProjectBar', 'mapCadToolbar', 'cadStatusHud', 'mapBottomSheet', 'mobileBottomNav'].forEach(id => {
            const el = byId(id);
            if (!visible(el) || el.classList.contains('is-dragged')) return;
            const r = el.getBoundingClientRect();
            if (!r.height || !overlapsX(r)) return;
            if ((r.top + r.bottom) / 2 < b.top + b.height / 2) top = Math.max(top, r.bottom - b.top);
            else bottom = Math.max(bottom, b.bottom - r.top);
        });
        box.style.setProperty('--mf-rc-top', px(top + 8));
        box.style.setProperty('--mf-rc-bottom', px(bottom + 8));
    }

    let mfRaf = 0;
    function relayout() {
        if (mfRaf) return;
        mfRaf = requestAnimationFrame(() => {
            mfRaf = 0;
            markScreen();
            measureDock();
            measureMapBand();
        });
    }

    function initMapFirst() {
        relayout();
        document.addEventListener('vn2000:screenchange', () => {
            relayout();
            // Đổi màn hình có thể đổi chiều cao vùng bản đồ (ẩn thanh tên màn hình…) → Leaflet đo lại.
            setTimeout(() => { relayout(); window.dispatchEvent(new Event('resize')); }, 120);
        });
        window.addEventListener('resize', relayout);
        if (typeof ResizeObserver === 'function') {
            const ro = new ResizeObserver(relayout);
            ['mobileBottomNav', 'mapCadToolbar', 'cadFloatingCmdBar', 'cadStatusHud', 'mapProjectBar', 'mapBottomSheet', 'map-view-container']
                .forEach(id => { const el = byId(id); if (el) ro.observe(el); });
        }
        const nav = byId('mobileBottomNav');
        if (nav) nav.addEventListener('transitionend', relayout);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMapFirst);
    else initMapFirst();

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : globalThis);
