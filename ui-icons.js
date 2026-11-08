/* ui-icons.js — Biểu tượng SVG nét mảnh thay cho emoji trong khung giao diện chính (WP-M2).
   Lý do (ui-ux-pro-max, checklist "No emojis as icons"): emoji hiển thị khác nhau giữa iOS/Android/Windows,
   lệch cỡ và lệch đường chuẩn chữ, không đổi màu theo giao diện Sáng/Tối/Thực địa.
   Cách làm: KHÔNG sửa mã dựng giao diện. Module quét các ô biểu tượng đã biết, nếu nội dung là emoji có trong bảng
   thì thay bằng <svg> dùng currentColor; theo dõi DOM để áp lại khi giao diện dựng lại hoặc đổi ngôn ngữ.
   Emoji không có trong bảng được giữ nguyên. Nét vẽ theo phong cách Lucide (ISC), 24×24, stroke 2. */
(function () {
    'use strict';

    // Hình vẽ: chuỗi phần tử SVG con (đã là path/circle/line/polyline/rect...).
    const SHAPES = {
        menu: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
        back: '<polyline points="15 18 9 12 15 6"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
        moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
        settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
        help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
        home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        convert: '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
        map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>',
        target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
        camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
        setsquare: '<path d="M3 21V3l18 18z"/><path d="M7 17v-5l5 5z"/>',
        chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
        signal: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        list: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
        repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
        wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
        cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
        compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88"/>',
        ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
        table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
        zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
        globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
        save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
        trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>',
        layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
        book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
        smartphone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
        pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        minus: '<path d="M5 12h14"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        mountain: '<path d="m8 3 4 8 5-5 5 15H2z"/>'
    };

    // Emoji (đã bỏ ký tự biến thể U+FE0F) → tên hình.
    const EMOJI = {
        '☰': 'menu', '◀': 'back', '☀': 'sun', '🌙': 'moon', '⚙': 'settings', '?': 'help',
        '🏠': 'home', '🔄': 'convert', '⇄': 'convert', '🗺': 'map', '🎯': 'target',
        '📁': 'folder', '📂': 'folder', '🗂': 'folder', '📸': 'camera', '📷': 'camera', '📐': 'setsquare',
        '📈': 'chart', '📊': 'table', '🛰': 'signal', '📡': 'signal', 'ℹ': 'info', '📍': 'pin', '📌': 'pin',
        '📑': 'list', '📋': 'list', '📝': 'pen', '🔁': 'repeat', '🛠': 'wrench', '🔧': 'wrench', '☁': 'cloud',
        '🧭': 'compass', '📏': 'ruler', '🔍': 'search', '🔎': 'search', '🕒': 'clock', '⏰': 'clock', '📅': 'clock',
        '❤': 'heart', '☕': 'heart', '💖': 'heart', '⚡': 'zap', '🌐': 'globe', '📥': 'download', '📤': 'upload',
        '💾': 'save', '🗑': 'trash', '➕': 'plus', '➖': 'minus', '👥': 'users', '🧮': 'calc', '📚': 'book', '📖': 'book', '📱': 'smartphone',
        '⛰': 'mountain', '🏔': 'mountain', '🗻': 'mountain', '🧱': 'layers'
    };

    // Nút cần hình theo ý nghĩa, không theo emoji gốc (🛰️ ở đây là "đổi lớp nền", không phải tín hiệu).
    const BY_ID = { btnMapFabLayer: 'layers' };

    // Ô chứa đúng MỘT biểu tượng: thay toàn bộ nội dung.
    const WHOLE = [
        '#btnHeaderMenu .tree-nav-icon', '#headerThemeIcon', 'header.app-header .header-action-icon',
        '#btnHeaderHelpGuide > span',
        'nav#mobileBottomNav .bottom-nav-icon',
        '#navTreeDrawer .drawer-leaf-icon', '#navTreeDrawer .drawer-folder-icon', '#navTreeDrawer .drawer-icon',
        '#navTreeDrawer .drawer-search-icon',
        '#bigActionTilesGrid .big-tile-icon-box', '#screen-menu .bar-title-icon', '#screen-menu .dash-card-icon',
        '#screen-menu .chip-icon', '#screen-menu .home-gps-cta-icon',
        '#mapProjectBar .map-proj-icon', '#mapProjectBar .map-action-icon',
        '#mapRightControls .btn-map-fab', '#screen-menu .accordion-header-icon-box', '#screen-menu .chip-arrow'
    ].join(',');

    // Nhãn có emoji đứng ĐẦU: tách emoji thành biểu tượng, giữ nguyên phần chữ.
    const LEADING = [
        '#screen-transform .transform-subtabs .btn-subtab',
        '.app-card .card-header .card-title',
        '#navTreeDrawer .drawer-status-chip > span'
    ].join(',');

    const norm = (s) => String(s || '').replace(/️/g, '').trim();

    function svg(name) {
        return '<svg class="ui-ico" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" '
            + 'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-ico="'
            + name + '">' + SHAPES[name] + '</svg>';
    }

    function replaceWhole(el) {
        if (el.children.length) return; // đã là SVG hoặc có cấu trúc riêng
        const key = norm(el.textContent);
        const name = (el.id && BY_ID[el.id]) || EMOJI[key];
        if (!name) return;
        // Nút ? chỉ đổi khi đúng là nút trợ giúp đầu trang (dấu ? thường không phải biểu tượng).
        if (key === '?' && !el.closest('#btnHeaderHelpGuide')) return;
        el.innerHTML = svg(name);
        el.classList.add('has-ui-ico');
    }

    function firstText(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
        });
        return walker.nextNode();
    }

    // Lấy emoji đầu chuỗi (kể cả cặp surrogate và U+FE0F).
    function leadingEmoji(text) {
        const t = text.replace(/^\s+/, '');
        const m = t.match(/^(\p{Extended_Pictographic}|[☰◀⇄ℹ])️?/u);
        return m ? m[0] : null;
    }

    function replaceLeading(el) {
        const node = firstText(el);
        if (!node) return;
        const prev = node.previousSibling;
        if (prev && prev.nodeType === 1 && prev.classList && prev.classList.contains('ui-ico')) return;
        const em = leadingEmoji(node.nodeValue);
        if (!em) return;
        const name = EMOJI[norm(em)];
        if (!name) return;
        const tpl = document.createElement('template');
        tpl.innerHTML = svg(name);
        node.nodeValue = node.nodeValue.replace(/^\s+/, '').slice(em.length).replace(/^\s*/, ' ');
        node.parentNode.insertBefore(tpl.content.firstChild, node);
    }

    function apply(root) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll(WHOLE).forEach(replaceWhole);
        scope.querySelectorAll(LEADING).forEach(replaceLeading);
    }

    let pending = false;
    function schedule() {
        if (pending) return;
        pending = true;
        (window.requestAnimationFrame || setTimeout)(() => { pending = false; apply(document); });
    }

    function relevant(m) {
        const t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        if (!t) return false;
        // Bỏ qua ngăn bản đồ (thay đổi liên tục khi kéo/phóng) — không có ô biểu tượng nào ở đó.
        if (t.closest('.leaflet-pane, .leaflet-control-container')) return false;
        return true;
    }

    function start() {
        apply(document);
        if (typeof MutationObserver === 'undefined') return;
        new MutationObserver((list) => {
            for (const m of list) { if (relevant(m)) { schedule(); return; } }
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    window.appIcons = { apply, svg, SHAPES, EMOJI };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
