/* account.js — Đăng nhập Google, lưu dự án theo tài khoản, trang Quản trị (WP-O).
   Không gian giao diện riêng (AGENTS.md §2): cửa sổ #modalAccount và màn #screen-admin; không chạm bản đồ/MiniCAD.
   Máy chủ: backend/TaiKhoan.gs (Google Apps Script của chủ ứng dụng). Cấu hình: account-config.js.
   Quyền riêng tư: chỉ gửi lượt mở ứng dụng (một lần mỗi lần mở) — KHÔNG gửi thao tác của người dùng. */
(function () {
    'use strict';

    const STATE_KEY = 'vn2k_account_v1';
    const AUTO_KEY = 'vn2k_account_autosync_v1';
    const VISIT_FLAG = 'vn2k_visit_sent';
    const GIS_SRC = 'https://accounts.google.com/gsi/client';

    const isEn = () => typeof appI18n !== 'undefined' && appI18n.currentLang === 'en';
    const L = (vi, en) => (isEn() ? en : vi);
    const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (m) => { if (typeof showToast === 'function') showToast(m); };
    const fmtTime = (ms) => {
        if (!ms) return '—';
        const d = new Date(ms);
        const p = (n) => String(n).padStart(2, '0');
        return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };
    const $ = (id) => document.getElementById(id);

    const appAccount = {
        state: { session: '', user: null },
        cloud: [],
        _gisPromise: null,
        _syncTimers: {},

        config() {
            const c = (typeof window !== 'undefined' && window.VN2K_ACCOUNT_CONFIG) || {};
            return { apiUrl: String(c.apiUrl || '').trim(), clientId: String(c.clientId || '').trim() };
        },
        isConfigured() {
            const c = this.config();
            return /^https:\/\/script\.google(usercontent)?\.com\//.test(c.apiUrl) && /\.apps\.googleusercontent\.com$/.test(c.clientId);
        },
        isSignedIn() { return !!(this.state.session && this.state.user); },
        isAdmin() { return this.isSignedIn() && this.state.user.role === 'admin'; },

        // ------------------------------------------------------------ Khởi động
        init() {
            try {
                const raw = localStorage.getItem(STATE_KEY);
                if (raw) this.state = Object.assign({ session: '', user: null }, JSON.parse(raw));
            } catch (e) { /* bộ nhớ bị chặn: coi như chưa đăng nhập */ }
            this.renderBadges();
            this.hookAutoSync();
            this.sendVisit();
        },

        saveState() {
            try { localStorage.setItem(STATE_KEY, JSON.stringify(this.state)); } catch (e) { /* bỏ qua */ }
            this.renderBadges();
        },

        clearLocalSession() {
            this.state = { session: '', user: null };
            this.cloud = [];
            this.saveState();
        },

        /** Một lượt truy cập cho mỗi lần mở ứng dụng (không gửi khi ngoại tuyến hoặc chưa cấu hình). */
        sendVisit() {
            if (!this.isConfigured() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
            try {
                if (sessionStorage.getItem(VISIT_FLAG)) return;
                sessionStorage.setItem(VISIT_FLAG, '1');
            } catch (e) { /* vẫn gửi một lần */ }
            this.call('visit', {}, { quiet: true }).then((r) => {
                if (r && r.user) { this.state.user = r.user; this.saveState(); }
            }).catch(() => {});
        },

        // ------------------------------------------------------------ Gọi máy chủ
        async call(action, payload, opts) {
            const o = opts || {};
            if (!this.isConfigured()) throw new Error(L('Chức năng tài khoản chưa được cấu hình.', 'Accounts are not configured.'));
            const body = Object.assign({ action, session: this.state.session || '' }, payload || {});
            let res;
            try {
                // text/plain: yêu cầu "đơn giản", không kích hoạt preflight CORS với Apps Script.
                res = await fetch(this.config().apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
            } catch (e) {
                throw new Error(L('Không kết nối được máy chủ tài khoản (kiểm tra mạng).', 'Cannot reach the account server (check your connection).'));
            }
            let data;
            try { data = await res.json(); } catch (e) { throw new Error(L('Máy chủ tài khoản trả về dữ liệu lỗi.', 'The account server returned invalid data.')); }
            if (data.status !== 'ok') {
                if (data.code === 'no_session' || data.code === 'blocked') {
                    this.clearLocalSession();
                    if (!o.quiet) this.render();
                }
                const err = new Error(data.message || L('Lỗi máy chủ tài khoản.', 'Account server error.'));
                err.code = data.code;
                throw err;
            }
            return data;
        },

        // ------------------------------------------------------------ Google Identity Services
        loadGis() {
            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) return Promise.resolve();
            if (this._gisPromise) return this._gisPromise;
            this._gisPromise = new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = GIS_SRC;
                s.async = true;
                s.defer = true;
                s.onload = () => resolve();
                s.onerror = () => { this._gisPromise = null; reject(new Error(L('Không tải được dịch vụ đăng nhập Google (cần mạng).', 'Could not load Google sign-in (internet needed).'))); };
                document.head.appendChild(s);
            });
            return this._gisPromise;
        },

        async renderGoogleButton(el) {
            if (!el) return;
            el.innerHTML = `<span class="acc-muted">${L('Đang tải nút đăng nhập Google…', 'Loading Google sign-in…')}</span>`;
            try {
                await this.loadGis();
                google.accounts.id.initialize({
                    client_id: this.config().clientId,
                    callback: (resp) => this.onCredential(resp && resp.credential),
                    ux_mode: 'popup',
                    auto_select: false,
                    itp_support: true
                });
                el.innerHTML = '';
                const light = document.body.getAttribute('data-theme') === 'light';
                google.accounts.id.renderButton(el, { theme: light ? 'outline' : 'filled_black', size: 'large', shape: 'pill', text: 'signin_with', locale: isEn() ? 'en' : 'vi', width: Math.min(320, el.clientWidth || 300) });
            } catch (e) {
                el.innerHTML = `<p class="acc-error">${esc(e.message)}</p>`;
            }
        },

        async onCredential(idToken) {
            if (!idToken) return;
            const box = $('accStatusMsg');
            if (box) box.textContent = L('Đang xác minh tài khoản…', 'Verifying your account…');
            try {
                const r = await this.call('login', { idToken });
                this.state = { session: r.session, user: r.user };
                this.saveState();
                toast(L(`✓ Đã đăng nhập: ${r.user.email}`, `✓ Signed in: ${r.user.email}`));
                this.render();
                this.refreshCloudList();
            } catch (e) {
                if (box) box.textContent = '';
                toast('⚠️ ' + e.message);
                this.render();
            }
        },

        async signOut() {
            const session = this.state.session;
            this.clearLocalSession();
            try { if (typeof google !== 'undefined' && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* bỏ qua */ }
            if (session && this.isConfigured()) {
                fetch(this.config().apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'logout', session }) }).catch(() => {});
            }
            toast(L('Đã đăng xuất. Dự án trên máy vẫn được giữ nguyên.', 'Signed out. Projects on this device are kept.'));
            if (typeof AppState !== 'undefined' && AppState.currentScreen === 'admin' && typeof appNav !== 'undefined') appNav.goToMenu();
            this.render();
        },

        // ------------------------------------------------------------ Dự án
        localProjects() {
            const list = (typeof AppState !== 'undefined' && Array.isArray(AppState.projectsList)) ? AppState.projectsList.slice() : [];
            return list.filter((n) => typeof n === 'string' && n.trim());
        },

        cadKey(name) {
            return (typeof appCadTool !== 'undefined' && appCadTool.getProjectStorageKey) ? appCadTool.getProjectStorageKey(name) : String(name).replace(/(\.(csv|xlsx|xls|txt))+$/i, '').trim();
        },

        /** Gói một dự án: mốc + bản vẽ MiniCAD (cùng cấu trúc với thùng rác dự án). */
        buildBundle(name) {
            const points = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(name) : [];
            let cad = null;
            try {
                const raw = localStorage.getItem('vn2k_cad_shapes_' + this.cadKey(name)) || localStorage.getItem('vn2k_cad_shapes_' + name);
                if (raw) cad = JSON.parse(raw);
            } catch (e) { cad = null; }
            return { format: 'vn2000-pro-project', version: 1, name, savedAt: Date.now(), points: Array.isArray(points) ? points : [], cad };
        },

        applyBundle(bundle, name) {
            if (!bundle || bundle.format !== 'vn2000-pro-project') throw new Error(L('Tệp dự án trên tài khoản không đúng định dạng.', 'The cloud project has an unknown format.'));
            const proj = name || bundle.name;
            if (!AppState.projectsList.includes(proj)) {
                AppState.projectsList.push(proj);
                localStorage.setItem('vn2k_projects', JSON.stringify(AppState.projectsList));
            }
            appData.savePoints(proj, Array.isArray(bundle.points) ? bundle.points : []);
            if (bundle.cad) localStorage.setItem('vn2k_cad_shapes_' + this.cadKey(proj), JSON.stringify(bundle.cad));
            if (appData.populateProjectSelect) appData.populateProjectSelect();
            if (AppState.currentProject === proj && typeof appCadTool !== 'undefined' && appCadTool.loadShapesForProject) {
                try { appCadTool.loadShapesForProject(proj); } catch (e) { /* MiniCAD chưa mở */ }
            }
        },

        async uploadProject(name, quiet) {
            const bundle = this.buildBundle(name);
            await this.call('saveProject', { name, data: bundle });
            if (!quiet) toast(L(`☁️ Đã lưu "${name}" lên tài khoản (${bundle.points.length} mốc).`, `☁️ "${name}" saved to your account (${bundle.points.length} points).`));
        },

        async uploadAll() {
            const list = this.localProjects();
            if (!list.length) { toast(L('⚠️ Chưa có dự án nào trên máy.', '⚠️ No projects on this device yet.')); return; }
            const btn = $('accBtnUploadAll');
            if (btn) btn.disabled = true;
            let ok = 0;
            for (const n of list) {
                if (btn) btn.textContent = L(`Đang lưu ${ok + 1}/${list.length}…`, `Saving ${ok + 1}/${list.length}…`);
                try { await this.uploadProject(n, true); ok++; } catch (e) { toast('⚠️ ' + n + ': ' + e.message); }
            }
            if (btn) { btn.disabled = false; btn.textContent = L('☁️ Lưu tất cả dự án lên tài khoản', '☁️ Save all projects to my account'); }
            toast(L(`✓ Đã lưu ${ok}/${list.length} dự án lên tài khoản.`, `✓ Saved ${ok}/${list.length} projects to your account.`));
            this.refreshCloudList();
        },

        async refreshCloudList() {
            const box = $('accCloudList');
            if (!box || !this.isSignedIn()) return;
            box.innerHTML = `<p class="acc-muted">${L('Đang tải danh sách…', 'Loading…')}</p>`;
            try {
                const r = await this.call('listProjects', {});
                this.cloud = r.projects || [];
                this.renderCloudList();
            } catch (e) {
                box.innerHTML = `<p class="acc-error">${esc(e.message)}</p>`;
            }
        },

        renderCloudList() {
            const box = $('accCloudList');
            if (!box) return;
            if (!this.cloud.length) {
                box.innerHTML = `<p class="acc-muted">${L('Chưa có dự án nào trên tài khoản.', 'No projects in your account yet.')}</p>`;
                return;
            }
            const local = new Set(this.localProjects());
            box.innerHTML = this.cloud.map((p, i) => `
                <div class="acc-proj-row">
                  <div class="acc-proj-main">
                    <div class="acc-proj-name">${esc(p.name)}</div>
                    <div class="acc-proj-meta">${p.points} ${L('mốc', 'points')} · ${p.shapes} ${L('khối', 'blocks')} · ${fmtTime(p.updated)}${local.has(p.name) ? ' · ' + L('có trên máy', 'on device') : ''}</div>
                  </div>
                  <button type="button" class="acc-btn acc-btn-sm" data-acc-load="${i}">${L('Tải về', 'Download')}</button>
                  <button type="button" class="acc-btn acc-btn-sm acc-btn-ghost" data-acc-del="${i}" aria-label="${L('Xóa khỏi tài khoản', 'Delete from account')}">✕</button>
                </div>`).join('');
            box.querySelectorAll('[data-acc-load]').forEach((b) => b.addEventListener('click', () => this.downloadProject(this.cloud[+b.dataset.accLoad].name)));
            box.querySelectorAll('[data-acc-del]').forEach((b) => b.addEventListener('click', () => this.deleteCloudProject(this.cloud[+b.dataset.accDel].name)));
        },

        async downloadProject(name) {
            const exists = this.localProjects().includes(name);
            if (exists && !confirm(L(`Dự án "${name}" đã có trên máy. Thay bằng bản trên tài khoản?`, `"${name}" already exists on this device. Replace it with the account copy?`))) return;
            try {
                const r = await this.call('loadProject', { name });
                this.applyBundle(r.data, name);
                toast(L(`✓ Đã tải "${name}" về máy.`, `✓ "${name}" downloaded.`));
                this.renderCloudList();
            } catch (e) { toast('⚠️ ' + e.message); }
        },

        async deleteCloudProject(name) {
            if (!confirm(L(`Xóa "${name}" khỏi tài khoản? Bản trên máy không bị ảnh hưởng.`, `Delete "${name}" from your account? The copy on this device is not affected.`))) return;
            try {
                await this.call('deleteProject', { name });
                toast(L('✓ Đã xóa khỏi tài khoản.', '✓ Deleted from your account.'));
                this.refreshCloudList();
            } catch (e) { toast('⚠️ ' + e.message); }
        },

        // ------------------------------------------------------------ Tự động lưu
        isAutoSync() { try { return localStorage.getItem(AUTO_KEY) === '1'; } catch (e) { return false; } },
        setAutoSync(on) {
            try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch (e) { /* bỏ qua */ }
            toast(on ? L('✓ Tự động lưu dự án lên tài khoản: BẬT', '✓ Auto-save to account: ON') : L('Tự động lưu dự án lên tài khoản: TẮT', 'Auto-save to account: OFF'));
            if (on && AppState.currentProject) this.scheduleSync(AppState.currentProject);
        },

        /** Khi bật: mỗi lần lưu mốc / bản vẽ, đẩy dự án đó lên tài khoản sau 4 giây (gộp nhiều lần lưu). */
        hookAutoSync() {
            const self = this;
            if (typeof appData !== 'undefined' && appData.savePoints && !appData.savePoints.__accHook) {
                const orig = appData.savePoints;
                appData.savePoints = function (projectName, points) {
                    const r = orig.apply(this, arguments);
                    self.scheduleSync(projectName);
                    return r;
                };
                appData.savePoints.__accHook = true;
            }
            if (typeof appCadTool !== 'undefined' && appCadTool.saveShapesForProject && !appCadTool.saveShapesForProject.__accHook) {
                const origCad = appCadTool.saveShapesForProject;
                appCadTool.saveShapesForProject = function (projName) {
                    const r = origCad.apply(this, arguments);
                    self.scheduleSync(projName || (typeof AppState !== 'undefined' && AppState.currentProject));
                    return r;
                };
                appCadTool.saveShapesForProject.__accHook = true;
            }
        },

        scheduleSync(name) {
            if (!name || !this.isAutoSync() || !this.isSignedIn() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
            clearTimeout(this._syncTimers[name]);
            this._syncTimers[name] = setTimeout(() => {
                this.uploadProject(name, true).catch(() => { /* thử lại ở lần lưu sau */ });
            }, 4000);
        },

        // ------------------------------------------------------------ Giao diện tài khoản
        open() {
            if (typeof appNav !== 'undefined' && appNav.closeTreeMenu) appNav.closeTreeMenu();
            const m = $('modalAccount');
            if (!m) return;
            m.classList.add('active');
            m.setAttribute('aria-hidden', 'false');
            this.render();
            if (this.isSignedIn()) this.refreshCloudList();
        },

        close() {
            const m = $('modalAccount');
            if (!m) return;
            m.classList.remove('active');
            m.setAttribute('aria-hidden', 'true');
        },

        render() {
            const body = $('accBody');
            if (!body) return;
            if (!this.isConfigured()) {
                body.innerHTML = `
                  <div class="acc-empty">
                    <p><b>${L('Đăng nhập chưa được bật cho bản ứng dụng này.', 'Sign-in is not enabled for this copy of the app.')}</b></p>
                    <p class="acc-muted">${L('Chủ ứng dụng cần điền máy chủ tài khoản và Google Client ID trong account-config.js (xem HUONG_DAN_DANG_NHAP_GOOGLE.md). Ứng dụng vẫn lưu dự án trên máy như bình thường.', 'The app owner needs to set the account server and Google Client ID in account-config.js (see HUONG_DAN_DANG_NHAP_GOOGLE.md). Projects are still saved on this device as usual.')}</p>
                  </div>`;
                return;
            }
            if (!this.isSignedIn()) {
                body.innerHTML = `
                  <div class="acc-signin">
                    <p class="acc-lead">${L('Đăng nhập bằng tài khoản Google để lưu dự án lên tài khoản và mở lại trên máy khác.', 'Sign in with Google to save projects to your account and open them on another device.')}</p>
                    <div id="accGoogleBtn" class="acc-google-btn"></div>
                    <p id="accStatusMsg" class="acc-muted" role="status" aria-live="polite"></p>
                    <ul class="acc-privacy">
                      <li>${L('Ứng dụng chỉ nhận email, tên và ảnh đại diện từ Google.', 'The app only receives your email, name and profile picture from Google.')}</li>
                      <li>${L('Chỉ ghi lại thời điểm bạn mở ứng dụng/đăng nhập — không ghi thao tác bạn làm.', 'Only the time you open the app / sign in is recorded — not what you do in it.')}</li>
                      <li>${L('Không đăng nhập vẫn dùng đầy đủ chức năng, dữ liệu lưu trên máy.', 'Without signing in everything still works; data stays on this device.')}</li>
                    </ul>
                  </div>`;
                this.renderGoogleButton($('accGoogleBtn'));
                return;
            }
            const u = this.state.user;
            const initial = esc((u.name || u.email || '?').trim().charAt(0).toUpperCase());
            body.innerHTML = `
              <div class="acc-profile">
                ${u.picture ? `<img class="acc-avatar" src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : `<span class="acc-avatar acc-avatar-letter">${initial}</span>`}
                <div class="acc-profile-text">
                  <div class="acc-name">${esc(u.name || u.email)}</div>
                  <div class="acc-email">${esc(u.email)}${u.role === 'admin' ? ` · <span class="acc-role">${L('Quản trị', 'Admin')}</span>` : ''}</div>
                </div>
              </div>
              <div class="acc-actions">
                <button type="button" id="accBtnUploadAll" class="acc-btn acc-btn-primary">${L('☁️ Lưu tất cả dự án lên tài khoản', '☁️ Save all projects to my account')}</button>
                <button type="button" id="accBtnUploadCur" class="acc-btn">${L('Lưu dự án đang mở', 'Save the open project')}</button>
              </div>
              <label class="acc-switch"><input type="checkbox" id="accAutoSync" ${this.isAutoSync() ? 'checked' : ''}> <span>${L('Tự động lưu dự án lên tài khoản khi có thay đổi', 'Auto-save projects to my account when they change')}</span></label>
              <h3 class="acc-h3">${L('Dự án trên tài khoản', 'Projects in my account')}</h3>
              <div id="accCloudList" class="acc-cloud-list"></div>
              <div class="acc-footer">
                ${u.role === 'admin' ? `<button type="button" id="accBtnAdmin" class="acc-btn">${L('🛡️ Trang quản trị', '🛡️ Admin page')}</button>` : ''}
                <button type="button" id="accBtnSignOut" class="acc-btn acc-btn-ghost">${L('Đăng xuất', 'Sign out')}</button>
              </div>`;
            const img = body.querySelector('img.acc-avatar');
            if (img) img.addEventListener('error', () => {
                const span = document.createElement('span');
                span.className = 'acc-avatar acc-avatar-letter';
                span.textContent = (u.name || u.email || '?').trim().charAt(0).toUpperCase();
                img.replaceWith(span);
            });
            $('accBtnUploadAll').addEventListener('click', () => this.uploadAll());
            $('accBtnUploadCur').addEventListener('click', () => {
                const n = AppState.currentProject;
                if (!n) { toast(L('⚠️ Chưa mở dự án nào.', '⚠️ No project is open.')); return; }
                this.uploadProject(n).then(() => this.refreshCloudList()).catch((e) => toast('⚠️ ' + e.message));
            });
            $('accAutoSync').addEventListener('change', (e) => this.setAutoSync(e.target.checked));
            $('accBtnSignOut').addEventListener('click', () => this.signOut());
            const adminBtn = $('accBtnAdmin');
            if (adminBtn) adminBtn.addEventListener('click', () => { this.close(); this.openAdmin(); });
            this.renderCloudList();
        },

        /** Trạng thái tài khoản trên mục Menu ☰ và nút Trang chủ. */
        renderBadges() {
            const signed = this.isSignedIn();
            const label = signed ? (this.state.user.name || this.state.user.email) : L('Đăng nhập Google', 'Sign in with Google');
            const sub = signed ? this.state.user.email : L('Lưu dự án theo tài khoản Google', 'Save projects to your Google account');
            const t = $('drawerAccountTitle'); if (t) t.textContent = label;
            const s = $('drawerAccountSub'); if (s) s.textContent = sub;
            const homeBtn = $('btnHomeAccount');
            if (homeBtn) {
                homeBtn.classList.toggle('is-signed', signed);
                const hl = homeBtn.querySelector('.home-acc-label');
                if (hl) hl.textContent = signed ? L(`Tài khoản: ${this.state.user.email}`, `Account: ${this.state.user.email}`) : L('Đăng nhập để lưu dự án lên tài khoản Google', 'Sign in to save projects to your Google account');
            }
            const adminItem = $('drawerItem_admin');
            if (adminItem) adminItem.hidden = !this.isAdmin();
        },

        // ------------------------------------------------------------ Trang quản trị
        admin: { users: [], visits: [], filter: '' },

        openAdmin() {
            if (!this.isAdmin()) { toast(L('⚠️ Chỉ quản trị viên mới mở được trang này.', '⚠️ Only admins can open this page.')); return; }
            if (typeof appNav !== 'undefined') appNav.showScreen('admin');
            this.loadAdmin();
        },

        async loadAdmin() {
            const root = $('adminRoot');
            if (!root) return;
            root.querySelectorAll('[data-admin-slot]').forEach((el) => { el.innerHTML = `<p class="acc-muted">${L('Đang tải…', 'Loading…')}</p>`; });
            try {
                const [stats, users, visits] = await Promise.all([this.call('adminStats', {}), this.call('adminUsers', {}), this.call('adminVisits', { limit: 300 })]);
                this.admin.users = users.users || [];
                this.admin.visits = visits.visits || [];
                this.renderAdminStats(stats);
                this.renderAdminUsers();
                this.renderAdminVisits();
            } catch (e) {
                root.querySelectorAll('[data-admin-slot]').forEach((el) => { el.innerHTML = `<p class="acc-error">${esc(e.message)}</p>`; });
            }
        },

        renderAdminStats(s) {
            const el = $('adminStats');
            if (!el) return;
            const tiles = [
                [L('Tài khoản', 'Accounts'), s.users.total, L(`${s.users.blocked} bị khóa`, `${s.users.blocked} blocked`)],
                [L('Lượt hôm nay', 'Visits today'), s.visits.today, L('đã đăng nhập + khách', 'signed-in + guests')],
                [L('7 ngày', '7 days'), s.visits.last7, L('lượt có đăng nhập', 'signed-in visits')],
                [L('Khách (tổng)', 'Guests (total)'), s.visits.guests, L('chưa đăng nhập, không định danh', 'not signed in, anonymous')]
            ];
            const max = Math.max(1, ...s.daily.map((d) => d.users + d.guests));
            el.innerHTML = `
              <div class="adm-tiles">${tiles.map((t) => `<div class="adm-tile"><div class="adm-tile-num">${esc(t[1])}</div><div class="adm-tile-label">${esc(t[0])}</div><div class="adm-tile-sub">${esc(t[2])}</div></div>`).join('')}</div>
              <div class="adm-chart" role="img" aria-label="${L('Lượt truy cập 30 ngày gần nhất', 'Visits in the last 30 days')}">
                ${s.daily.map((d) => `<div class="adm-bar" title="${esc(d.day)}: ${d.users} ${L('lượt đăng nhập', 'signed-in')} (${d.people} ${L('người', 'people')}), ${d.guests} ${L('khách', 'guests')}"><span class="adm-bar-g" style="height:${(d.guests / max) * 100}%"></span><span class="adm-bar-u" style="height:${(d.users / max) * 100}%"></span></div>`).join('')}
              </div>
              <div class="adm-legend"><span><i class="adm-dot-u"></i>${L('Đã đăng nhập', 'Signed in')}</span><span><i class="adm-dot-g"></i>${L('Khách', 'Guests')}</span><span class="acc-muted">${L('30 ngày gần nhất', 'Last 30 days')}</span></div>`;
        },

        renderAdminUsers() {
            const el = $('adminUsers');
            if (!el) return;
            const q = this.admin.filter.trim().toLowerCase();
            const rows = this.admin.users.filter((u) => !q || String(u.email).toLowerCase().includes(q) || String(u.name).toLowerCase().includes(q));
            if (!rows.length) { el.innerHTML = `<p class="acc-muted">${L('Không có tài khoản nào.', 'No accounts.')}</p>`; return; }
            el.innerHTML = rows.map((u) => `
              <div class="adm-user ${u.status === 'blocked' ? 'is-blocked' : ''}">
                <div class="adm-user-main">
                  <div class="adm-user-name">${esc(u.name || u.email)} ${u.role === 'admin' ? `<span class="acc-role">${L('Quản trị', 'Admin')}</span>` : ''} ${u.status === 'blocked' ? `<span class="adm-badge-blocked">${L('Đã khóa', 'Blocked')}</span>` : ''}</div>
                  <div class="adm-user-meta">${esc(u.email)}</div>
                  <div class="adm-user-meta">${L('Lần cuối', 'Last seen')}: ${fmtTime(u.lastSeen)} · ${u.visits} ${L('lượt', 'visits')} · ${L('Từ', 'Since')} ${fmtTime(u.firstSeen)}</div>
                </div>
                <div class="adm-user-actions">
                  <button type="button" class="acc-btn acc-btn-sm" data-adm-visits="${esc(u.email)}">${L('Lượt truy cập', 'Visits')}</button>
                  ${u.owner ? '' : `
                  <button type="button" class="acc-btn acc-btn-sm" data-adm-status="${esc(u.email)}" data-next="${u.status === 'blocked' ? 'active' : 'blocked'}">${u.status === 'blocked' ? L('Mở khóa', 'Unblock') : L('Khóa', 'Block')}</button>
                  <button type="button" class="acc-btn acc-btn-sm" data-adm-role="${esc(u.email)}" data-next="${u.role === 'admin' ? 'user' : 'admin'}">${u.role === 'admin' ? L('Bỏ quản trị', 'Remove admin') : L('Cấp quản trị', 'Make admin')}</button>
                  <button type="button" class="acc-btn acc-btn-sm acc-btn-danger" data-adm-del="${esc(u.email)}">${L('Xóa', 'Delete')}</button>`}
                </div>
              </div>`).join('');
            el.querySelectorAll('[data-adm-visits]').forEach((b) => b.addEventListener('click', () => this.filterVisits(b.dataset.admVisits)));
            el.querySelectorAll('[data-adm-status]').forEach((b) => b.addEventListener('click', () => this.adminAction('adminSetStatus', { email: b.dataset.admStatus, status: b.dataset.next })));
            el.querySelectorAll('[data-adm-role]').forEach((b) => b.addEventListener('click', () => this.adminAction('adminSetRole', { email: b.dataset.admRole, role: b.dataset.next })));
            el.querySelectorAll('[data-adm-del]').forEach((b) => b.addEventListener('click', () => {
                if (confirm(L(`Xóa tài khoản ${b.dataset.admDel}? Lượt truy cập và dự án lưu trên tài khoản này cũng bị xóa (dự án vào thùng rác Drive 30 ngày).`, `Delete ${b.dataset.admDel}? Their visits and cloud projects are deleted too (projects go to the Drive trash for 30 days).`))) {
                    this.adminAction('adminDeleteUser', { email: b.dataset.admDel });
                }
            }));
        },

        async adminAction(action, payload) {
            try {
                await this.call(action, payload);
                toast(L('✓ Đã cập nhật.', '✓ Updated.'));
                this.loadAdmin();
            } catch (e) { toast('⚠️ ' + e.message); }
        },

        async filterVisits(email) {
            const el = $('adminVisits');
            const label = $('adminVisitsFilter');
            if (label) label.textContent = email ? email : L('tất cả', 'everyone');
            const clear = $('adminVisitsClear');
            if (clear) clear.hidden = !email;
            if (el) el.innerHTML = `<p class="acc-muted">${L('Đang tải…', 'Loading…')}</p>`;
            try {
                const r = await this.call('adminVisits', { email: email || '', limit: 300 });
                this.admin.visits = r.visits || [];
                this.renderAdminVisits();
                if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } catch (e) { if (el) el.innerHTML = `<p class="acc-error">${esc(e.message)}</p>`; }
        },

        renderAdminVisits() {
            const el = $('adminVisits');
            if (!el) return;
            if (!this.admin.visits.length) { el.innerHTML = `<p class="acc-muted">${L('Chưa có lượt truy cập nào.', 'No visits yet.')}</p>`; return; }
            const kind = (k) => (k === 'dang_nhap' ? L('Đăng nhập', 'Sign-in') : L('Mở ứng dụng', 'App opened'));
            el.innerHTML = `<table class="adm-table"><thead><tr><th>${L('Thời điểm', 'Time')}</th><th>${L('Người dùng', 'User')}</th><th>${L('Loại', 'Type')}</th></tr></thead><tbody>${
                this.admin.visits.map((v) => `<tr><td class="adm-nowrap">${fmtTime(v.time)}</td><td><div>${esc(v.name || '')}</div><div class="adm-user-meta">${esc(v.email)}</div></td><td>${kind(v.kind)}</td></tr>`).join('')
            }</tbody></table>`;
        }
    };

    window.appAccount = appAccount;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => appAccount.init());
    else appAccount.init();
})();
