/* Vỏ giao diện thống nhất:
   1) Thanh ngữ cảnh dưới header (điện thoại): tên màn hình đang mở + dự án hiện hành.
   2) Trang chủ: bảng "Tất cả chức năng" theo đúng 5 nhóm của menu ☰ (đọc từ chính menu → một nguồn duy nhất).
   Không chứa logic nghiệp vụ; mỗi ô chỉ kích hoạt mục menu tương ứng. */
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
        'CAMERA ĐÓNG DẤU': ['Camera đóng dấu', 'Stamp camera'],
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

    const api = { cleanTitle, fold, stripNo, TITLES };
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

    // ---------- 2) Bảng tất cả chức năng ----------
    function renderHub() {
        const host = byId('homeFeatureHub');
        if (!host) return;
        const en = isEn();
        const groups = [...document.querySelectorAll('#navTreeDrawer .drawer-folder, .nav-tree-drawer .drawer-folder')];
        const seen = new Set();
        let html = '';
        groups.forEach(folder => {
            if (seen.has(folder.id)) return;
            seen.add(folder.id);
            const head = folder.querySelector('.drawer-folder-title');
            const gIcon = head ? (head.querySelector('.drawer-folder-icon') || {}).textContent || '' : '';
            const gName = head ? head.lastElementChild.textContent.trim() : '';
            const items = [...folder.querySelectorAll('.drawer-leaf-item')];
            if (!items.length) return;
            html += `<section class="hub-group" data-hub-group><h3 class="hub-group-title"><span aria-hidden="true">${gIcon.trim()}</span>${esc(gName)}</h3><div class="hub-grid">`;
            items.forEach(it => {
                const icon = (it.querySelector('.drawer-leaf-icon') || {}).textContent || '•';
                const name = stripNo((it.querySelector('.drawer-leaf-title') || it).textContent);
                const sub = ((it.querySelector('.drawer-leaf-sub') || {}).textContent || '').trim();
                html += `<button type="button" class="hub-tile" data-hub-target="${it.id}" data-hub-text="${esc(fold(name + ' ' + sub))}">` +
                    `<span class="hub-tile-icon" aria-hidden="true">${icon.trim()}</span>` +
                    `<span class="hub-tile-text"><span class="hub-tile-name">${esc(name)}</span><span class="hub-tile-sub">${esc(sub)}</span></span></button>`;
            });
            html += '</div></section>';
        });
        const list = byId('homeFeatureHubList');
        if (list) list.innerHTML = html;
        const search = byId('txtHubSearch');
        if (search) { search.placeholder = en ? 'Find a feature…' : 'Tìm chức năng (cắm mốc, xuất dwg, camera…)'; applyFilter(search.value); }
    }

    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

    function applyFilter(q) {
        const needle = fold(q).trim();
        let any = false;
        document.querySelectorAll('#homeFeatureHubList [data-hub-group]').forEach(g => {
            let shown = 0;
            g.querySelectorAll('.hub-tile').forEach(t => {
                const ok = !needle || t.dataset.hubText.includes(needle);
                t.hidden = !ok;
                if (ok) shown++;
            });
            g.hidden = shown === 0;
            if (shown) any = true;
        });
        const empty = byId('hubEmpty');
        if (empty) empty.hidden = any;
    }

    function init() {
        const host = byId('homeFeatureHub');
        if (host) {
            host.addEventListener('click', e => {
                const tile = e.target.closest('[data-hub-target]');
                if (!tile) return;
                const target = byId(tile.dataset.hubTarget);
                if (target) target.click();
            });
            const search = byId('txtHubSearch');
            if (search) search.addEventListener('input', () => applyFilter(search.value));
        }
        const proj = byId('ctxProject');
        if (proj) proj.addEventListener('click', () => appNav.showScreen('datamgmt'));
        document.addEventListener('vn2000:screenchange', e => updateContextBar(e.detail));
        document.addEventListener('vn2000:contextchange', () => updateContextBar(null));
        // Bộ dịch chạy trên DOM của menu sau khi đổi ngôn ngữ → dựng lại bảng ở nhịp kế tiếp.
        document.addEventListener('vn2000:languagechange', () => setTimeout(() => { renderHub(); updateContextBar(lastDetail); }, 60));
        renderHub();
        updateContextBar({ menu: true });
    }

    let lastDetail = { menu: true };
    document.addEventListener('vn2000:screenchange', e => { lastDetail = e.detail || lastDetail; });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : globalThis);
