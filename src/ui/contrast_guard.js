/*
 * Bảo đảm tương phản chữ / nền (WCAG AA: 4.5:1, chữ lớn 3:1) cho MỌI giao diện (Tối, Sáng, Thực địa).
 * Rất nhiều thẻ chức năng mang màu viết sẵn cho nền tối (style="color:#a8a29e" ...), sang giao diện Sáng
 * thì chữ nhạt nằm trên nền nhạt. Bộ này đo màu chữ thật và nền thật (kể cả nền bán trong suốt chồng lớp),
 * phần tử nào chưa đạt thì:
 *   - nút / thẻ có nền màu đặc riêng và chữ trắng → làm đậm nền của chính nút (giữ chữ trắng);
 *   - còn lại → kéo màu chữ về đen (nền sáng) hoặc trắng (nền tối) vừa đủ đạt chuẩn, giữ sắc màu gốc.
 * Mọi chỉnh sửa ghi lại giá trị gốc (data-cg-c / data-cg-b) và được hoàn nguyên khi đổi giao diện.
 */
(function (root) {
    'use strict';
    const parse = (c) => {
        if (!c) return null;
        const m = String(c).match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
        return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    };
    const hex = (h) => {
        h = h.replace('#', '');
        if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
    };
    const firstStop = (bi) => {
        const m = String(bi || '').match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}\b/i);
        if (!m) return null;
        return m[0][0] === '#' ? hex(m[0]) : parse(m[0]);
    };
    const lum = (c) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
    };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
    const blend = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
    const mix = (c, pole, t) => [c[0] + (pole[0] - c[0]) * t, c[1] + (pole[1] - c[1]) * t, c[2] + (pole[2] - c[2]) * t, 1];
    const css = (c) => `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
    const BLACK = [0, 0, 0, 1], WHITE = [255, 255, 255, 1];
    const SKIP = 'svg, canvas, .leaflet-container, .cg-skip, script, style, noscript';
    const CONTROL = 'button, a, [role="button"], [class*="btn"], [class*="tab"], .badge-count';

    function restore(el) {
        if (el.hasAttribute('data-cg-c')) {
            const [v, pr] = el.getAttribute('data-cg-c').split('|');
            el.style.removeProperty('color');
            if (v) el.style.setProperty('color', v, pr || '');
            el.removeAttribute('data-cg-c');
        }
        if (el.hasAttribute('data-cg-b')) {
            const [v, pr] = el.getAttribute('data-cg-b').split('|');
            el.style.removeProperty('background-color');
            if (v) el.style.setProperty('background-color', v, pr || '');
            el.removeAttribute('data-cg-b');
        }
    }

    function setProp(el, prop, attr, value) {
        if (!el.hasAttribute(attr)) el.setAttribute(attr, `${el.style.getPropertyValue(prop)}|${el.style.getPropertyPriority(prop)}`);
        el.style.setProperty(prop, value, 'important');
    }

    // Nền thực sự sau chữ: chồng các lớp nền bán trong suốt của tổ tiên lên nền trang
    function backdrop(el, pageBg) {
        const layers = [];
        let owner = null, ownerGradient = false;
        for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
            const cs = getComputedStyle(e);
            let c = parse(cs.backgroundColor);
            let grad = false;
            if ((!c || c[3] === 0) && cs.backgroundImage && cs.backgroundImage.indexOf('gradient') >= 0) { c = firstStop(cs.backgroundImage); grad = true; }
            if (c && c[3] > 0.02) {
                if (!owner && c[3] >= 0.85) { owner = e; ownerGradient = grad; }
                layers.push(c);
                if (c[3] >= 0.99) break;
            }
        }
        let base = pageBg;
        for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
        return { bg: base, owner, ownerGradient };
    }

    function hasOwnText(el) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return true;
        for (let n = el.firstChild; n; n = n.nextSibling) {
            if (n.nodeType === 3 && /[A-Za-zÀ-ỹ0-9\-–—]/.test(n.nodeValue)) return true;
        }
        return false;
    }

    function fixOne(el, pageBg) {
        const cs = getComputedStyle(el);
        const fg0 = parse(cs.color);
        if (!fg0 || fg0[3] === 0) return false;
        const { bg, owner, ownerGradient } = backdrop(el, pageBg);
        const fg = blend(fg0, bg);
        const size = parseFloat(cs.fontSize) || 14;
        const bold = (parseInt(cs.fontWeight, 10) || 400) >= 600;
        const need = (size >= 18.5 || (size >= 14 && bold)) ? 3 : 4.5;
        if (ratio(fg, bg) >= need) return false;

        // Nút / thẻ có nền đặc riêng, chữ sáng: làm đậm nền nút thay vì đổi màu chữ
        if (owner && !ownerGradient && lum(fg) > 0.6 && owner.matches(CONTROL)) {
            const ob = parse(getComputedStyle(owner).backgroundColor);
            if (ob) {
                for (let t = 0.08; t <= 0.81; t += 0.08) {
                    const nb = mix(ob, BLACK, t);
                    if (ratio(fg, nb) >= need + 0.1) { setProp(owner, 'background-color', 'data-cg-b', css(nb)); return true; }
                }
            }
        }
        // Đổi màu chữ về phía đen / trắng vừa đủ đạt chuẩn
        const pole = ratio(BLACK, bg) >= ratio(WHITE, bg) ? BLACK : WHITE;
        for (let t = 0.1; t <= 1.001; t += 0.1) {
            const nc = mix(fg, pole, t);
            if (ratio(nc, bg) >= need + 0.1 || t > 0.95) { setProp(el, 'color', 'data-cg-c', css(nc)); return true; }
        }
        return false;
    }

    const guard = {
        enabled: true,
        fixed: 0,
        _busy: false,
        _queue: new Set(),
        _timer: null,
        _obs: null,
        pageBg() {
            const b = parse(getComputedStyle(document.body).backgroundColor);
            if (b && b[3] > 0.5) return b;
            const h = parse(getComputedStyle(document.documentElement).backgroundColor);
            if (h && h[3] > 0.5) return h;
            return document.documentElement.getAttribute('data-theme') === 'light' ? WHITE : [23, 22, 21, 1];
        },
        // Hoàn nguyên toàn bộ rồi kiểm lại (gọi khi đổi giao diện)
        refresh() {
            if (typeof document === 'undefined' || !document.body) return;
            this.scan(document.body);
        },
        // Tạm tắt hiệu ứng chuyển màu khi đo — nếu không, màu đọc được là màu đang chuyển dở
        _freeze(on) {
            if (!this._style) {
                this._style = document.createElement('style');
                // :not(#…) nâng độ ưu tiên lên mức id để thắng cả các quy tắc transition … !important của giao diện
                this._style.textContent = 'html.cg-scan :not(#_cg1):not(#_cg2):not(#_cg3), html.cg-scan :not(#_cg1):not(#_cg2):not(#_cg3)::before, html.cg-scan :not(#_cg1):not(#_cg2):not(#_cg3)::after { transition: none !important; }';
                document.head.appendChild(this._style);
            }
            document.documentElement.classList.toggle('cg-scan', on);
        },
        scan(rootEl) {
            if (!this.enabled || !rootEl || rootEl.nodeType !== 1) return 0;
            if (rootEl.closest && rootEl.closest(SKIP)) return 0;
            this._busy = true;
            this._freeze(true);
            const pageBg = this.pageBg();
            let n = 0;
            const all = [rootEl].concat(Array.from(rootEl.querySelectorAll('*')));
            // Hoàn nguyên trước trong cả nhánh (nền của cha có thể đã đổi), rồi đo lại
            all.forEach(el => { if (el.hasAttribute('data-cg-c') || el.hasAttribute('data-cg-b')) restore(el); });
            for (const el of all) {
                if (el.closest(SKIP)) continue;
                if (!hasOwnText(el)) continue;
                try { if (fixOne(el, pageBg)) n++; } catch (e) { /* phần tử đã rời DOM */ }
            }
            this.fixed += n;
            void document.documentElement.offsetHeight; // áp màu mới khi transition còn tắt
            this._freeze(false);
            if (this._obs) this._obs.takeRecords();
            this._busy = false;
            return n;
        },
        _enqueue(node) {
            if (!node || node.nodeType !== 1) return;
            if (node.closest && node.closest(SKIP)) return;
            this._queue.add(node);
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this._flush(), 180);
        },
        _flush() {
            const nodes = Array.from(this._queue).filter(n => n.isConnected);
            this._queue.clear();
            // Bỏ các nút nằm trong nút khác cũng đang chờ
            const tops = nodes.filter(n => !nodes.some(o => o !== n && o.contains(n)));
            tops.forEach(n => this.scan(n));
        },
        start() {
            if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
            if (this._obs) return;
            this._obs = new MutationObserver((recs) => {
                if (this._busy) return;
                for (const r of recs) {
                    if (r.type === 'childList') r.addedNodes.forEach(nd => this._enqueue(nd.nodeType === 1 ? nd : nd.parentElement));
                    else if (r.target === document.body || r.target === document.documentElement) {
                        // Đổi giao diện / chế độ: kiểm lại toàn trang (gộp mọi thay đổi nhỏ đang chờ)
                        clearTimeout(this._fullTimer);
                        this._fullTimer = setTimeout(() => { this._queue.clear(); clearTimeout(this._timer); this.refresh(); }, 120);
                    }
                    else this._enqueue(r.target);
                }
            });
            this._obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
            this.refresh();
            // Kiểm lại khi CSS / phông chữ đã nạp xong (lần đầu có thể chạy lúc stylesheet chưa áp dụng)
            if (document.readyState !== 'complete') window.addEventListener('load', () => this.refresh(), { once: true });
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(() => this.refresh(), 50));
        },
        // Dùng cho kiểm thử: liệt kê phần tử chưa đạt chuẩn
        audit(rootEl) {
            const out = [];
            const pageBg = this.pageBg();
            (rootEl || document.body).querySelectorAll('*').forEach(el => {
                if (el.closest(SKIP) || !hasOwnText(el)) return;
                const cs = getComputedStyle(el);
                const fg0 = parse(cs.color);
                if (!fg0) return;
                const { bg } = backdrop(el, pageBg);
                const r = ratio(blend(fg0, bg), bg);
                if (r < 3) out.push({ el, r: +r.toFixed(2) });
            });
            return out;
        },
        _test: { parse, hex, ratio, lum, mix, blend }
    };

    root.appContrast = guard;
    if (typeof module !== 'undefined' && module.exports) module.exports = guard;
})(typeof window !== 'undefined' ? window : globalThis);
