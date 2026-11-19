/* Đổi tọa độ VN-2000 giữa các Kinh tuyến trục / Múi chiếu.
   Thuộc phân hệ Chuyển đổi tọa độ (tab "Đổi KTT / Múi"); không gọi giao diện phân hệ khác. */
(function (root) {
    'use strict';

    // Quá ngưỡng này (độ kinh) so với KTT, sai số biến dạng chiều dài và chuỗi Gauss-Kruger tăng nhanh.
    const FAR_DEG = 3.5;
    const K0 = { 3: 0.9999, 6: 0.9996 };

    function parseNum(token) {
        if (typeof token !== 'string') return NaN;
        let t = token.trim();
        if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); // 1.191.900,123
        else if (/^[+-]?\d+,\d+$/.test(t)) t = t.replace(',', '.');                           // 1191900,123
        return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t) ? Number(t) : NaN;
    }

    /**
     * Mỗi dòng một điểm: "Tên X Y" hoặc "X Y" (dán từ Excel/Zalo).
     * Phân cách: tab, chấm phẩy, khoảng trắng; dấu phẩy chỉ là phân cách khi không dùng làm dấu thập phân.
     * X (Bắc) ở Việt Nam luôn lớn hơn Y (Đông) → tự đảo khi người dùng dán ngược "Y X".
     */
    function parseLines(text) {
        const points = [], errors = [];
        String(text || '').split(/\r?\n/).forEach((raw, i) => {
            const line = raw.trim();
            if (!line || /^(#|\/\/)/.test(line)) return;
            let parts = /[\t;]/.test(line) ? line.split(/[\t;]+/) : line.split(/\s+/);
            if (parts.filter(p => Number.isFinite(parseNum(p))).length < 2 && line.includes(',')) parts = line.split(/\s*,\s*/);
            parts = parts.map(p => p.trim()).filter(Boolean);
            const nums = [], words = [];
            parts.forEach(p => { const n = parseNum(p); if (Number.isFinite(n)) nums.push(n); else words.push(p); });
            // Cột STT/tên dạng số đứng đầu: "1 1191900.1 603800.2" → bỏ số đầu nếu còn đủ 2 số lớn.
            let name = words.join(' ');
            if (nums.length >= 3 && Math.abs(nums[0]) < 100000) { name = name || String(nums[0]); nums.shift(); }
            if (nums.length < 2) { errors.push({ line: i + 1, text: line }); return; }
            let [x, y] = nums;
            const swapped = y > x;
            if (swapped) [x, y] = [y, x];
            points.push({ name: name || `Đ${points.length + 1}`, x, y, swapped, line: i + 1 });
        });
        return { points, errors };
    }

    function zoneScale(zone) { return K0[zone] || K0[3]; }

    /** src/dst: { ktt: số thập phân, zone: 3 | 6 } */
    function convertAll(points, src, dst, convert) {
        const k0s = zoneScale(src.zone), k0d = zoneScale(dst.zone);
        return points.map(p => {
            const r = convert(p.x, p.y, src.ktt, k0s, dst.ktt, k0d);
            if (!r) return { ...p, ok: false };
            return { ...p, ok: true, X: r.X, Y: r.Y, lat: r.lat, lng: r.lng,
                far: r.offSrc > FAR_DEG || r.offDst > FAR_DEG,
                outOfVn: r.lat < 7 || r.lat > 24 || r.lng < 101 || r.lng > 118 };
        });
    }

    function kttLabel(ktt) {
        const d = Math.floor(ktt + 1e-9), m = Math.round((ktt - d) * 60);
        return `${d}°${String(m).padStart(2, '0')}'`;
    }

    function csvCell(v) { return `"${String(v ?? '').replace(/"/g, '""')}"`; }

    function toCsv(results, src, dst) {
        const head = ['Tên Điểm', 'X nguồn', 'Y nguồn', 'X mới', 'Y mới', 'KTT nguồn', 'Múi nguồn', 'KTT đích', 'Múi đích', 'Ghi chú'];
        const rows = results.filter(r => r.ok).map(r => [r.name, r.x.toFixed(3), r.y.toFixed(3), r.X.toFixed(3), r.Y.toFixed(3),
            kttLabel(src.ktt), `${src.zone}°`, kttLabel(dst.ktt), `${dst.zone}°`, noteOf(r)].map(csvCell).join(','));
        return '﻿' + [head.map(csvCell).join(','), ...rows].join('\r\n');
    }

    function noteOf(r) {
        const notes = [];
        if (r.swapped) notes.push('Đã đảo X⇄Y khi nhập');
        if (r.outOfVn) notes.push('Ngoài lãnh thổ VN - kiểm tra KTT nguồn');
        else if (r.far) notes.push('Cách KTT > 3.5°');
        return notes.join('; ');
    }

    /** Danh sách KTT gom theo tỉnh: [{ ktt, label }] */
    function kttOptions(provinces) {
        const map = new Map();
        (provinces || []).forEach(p => {
            const k = Math.round(p.ktt * 10000) / 10000;
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(p.name.replace(/^TP\.\s*/, ''));
        });
        return [...map.keys()].sort((a, b) => a - b).map(k => ({ ktt: k, label: `${kttLabel(k)} — ${map.get(k).join(', ')}` }));
    }

    let last = null;

    const api = {
        parseNum, parseLines, convertAll, toCsv, kttOptions, kttLabel, zoneScale, FAR_DEG,
        viewOnMap, openSaveModal, closeSaveModal, onSaveProjectChange, onNamingStrategyChange,
        applyCurrentNaming, toggleSelectAllSave, updateSelectedCount, confirmSave, saveResultsToProject,
        copyCad, openExportModal,
        getLast: () => last,
        setLast: (val) => { last = val; }
    };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
    root.Vn2kRezone = api;

    // ======================= Giao diện =======================
    const byId = id => document.getElementById(id);

    function readSide(prefix) {
        const sel = byId(prefix + 'Ktt'), custom = byId(prefix + 'KttCustom');
        let ktt = Number(sel.value);
        if (sel.value === 'custom') {
            const parsed = typeof parseKttString === 'function' ? parseKttString(custom.value) : null;
            ktt = parsed ? parsed.decimal : NaN;
        }
        return { ktt, zone: Number(byId(prefix + 'Zone').value) === 6 ? 6 : 3 };
    }

    function fillSelect(sel, value) {
        const all = typeof VN_PROVINCES !== 'undefined' ? VN_PROVINCES : [];
        const oldCount = typeof VN_PROVINCES_OLD_COUNT !== 'undefined' ? VN_PROVINCES_OLD_COUNT : all.length;
        const groups = [
            ['Theo 34 tỉnh, thành phố (từ 01/07/2025)', all.slice(oldCount)],
            ['Theo 63 tỉnh cũ (số liệu trước 01/07/2025)', all.slice(0, oldCount)]
        ];
        sel.innerHTML = '';
        groups.forEach(([label, list]) => {
            if (!list.length) return;
            const g = document.createElement('optgroup');
            g.label = label;
            kttOptions(list).forEach(o => g.appendChild(new Option(o.label, String(o.ktt))));
            sel.appendChild(g);
        });
        sel.add(new Option('Nhập KTT khác…', 'custom'));
        const match = [...sel.options].find(o => Math.abs(Number(o.value) - value) < 1e-6);
        sel.value = match ? match.value : 'custom';
        return !match;
    }

    function toggleCustom(prefix) {
        byId(prefix + 'KttCustom').hidden = byId(prefix + 'Ktt').value !== 'custom';
    }

    function setStatus(text, isError) {
        const el = byId('rzStatus');
        el.textContent = text;
        el.style.color = isError ? '#f87171' : '';
    }

    function render(results) {
        const body = byId('rzResultBody');
        body.innerHTML = '';
        results.forEach(r => {
            const tr = document.createElement('tr');
            const cells = r.ok
                ? [r.name, r.X.toFixed(3), r.Y.toFixed(3), noteOf(r)]
                : [r.name, '—', '—', 'Không đổi được'];
            cells.forEach((c, i) => {
                const td = document.createElement('td');
                td.textContent = c;
                if (i === 1 || i === 2) td.className = 'font-mono';
                if (i === 3 && c) td.style.color = '#fbbf24';
                tr.appendChild(td);
            });
            body.appendChild(tr);
        });
        byId('rzResultCard').hidden = results.length === 0;
    }

    function run() {
        const src = readSide('rzSrc'), dst = readSide('rzDst');
        if (!Number.isFinite(src.ktt) || !Number.isFinite(dst.ktt)) return setStatus('KTT nhập tay không hợp lệ. Ví dụ: 105°45\' hoặc 105.75', true);
        const { points, errors } = parseLines(byId('rzInput').value);
        if (!points.length) { render([]); return setStatus('Chưa có điểm hợp lệ. Mỗi dòng: Tên X Y hoặc X Y.', true); }
        const results = convertAll(points, src, dst, root.convertVn2kToVn2k);
        last = { results, src, dst };
        render(results);
        const same = Math.abs(src.ktt - dst.ktt) < 1e-9 && src.zone === dst.zone;
        let msg = `Đã đổi ${results.filter(r => r.ok).length} điểm: KTT ${kttLabel(src.ktt)} múi ${src.zone}° → KTT ${kttLabel(dst.ktt)} múi ${dst.zone}°.`;
        if (same) msg += ' (Nguồn và đích giống nhau.)';
        if (errors.length) msg += ` Bỏ qua ${errors.length} dòng không đọc được (dòng ${errors.slice(0, 5).map(e => e.line).join(', ')}${errors.length > 5 ? '…' : ''}).`;
        setStatus(msg, false);
    }

    function resultText() {
        if (!last) return '';
        return last.results.filter(r => r.ok).map(r => `${r.name}\t${r.X.toFixed(3)}\t${r.Y.toFixed(3)}`).join('\n');
    }

    function copy() {
        const text = resultText();
        if (!text) return;
        const done = () => root.showToast && root.showToast('✓ Đã chép kết quả (Tên, X, Y) — dán thẳng vào Excel được');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => setStatus('Không chép được, hãy bôi đen bảng để chép.', true));
        else setStatus('Trình duyệt không cho chép tự động, hãy bôi đen bảng để chép.', true);
    }

    function copyCad() {
        if (!last || !last.results) {
            if (root.showToast) root.showToast('⚠️ Chưa có kết quả để chép CAD!', true);
            return;
        }
        const valid = last.results.filter(r => r.ok && Number.isFinite(r.X) && Number.isFinite(r.Y));
        if (!valid.length) {
            if (root.showToast) root.showToast('⚠️ Không có tọa độ hợp lệ để chép CAD!', true);
            return;
        }
        // Định dạng CAD chuẩn: Y,X (Easting,Northing) dán thẳng vào AutoCAD
        const text = valid.map(r => `${r.Y.toFixed(3)},${r.X.toFixed(3)}`).join('\r\n');
        const done = () => root.showToast && root.showToast(`📐 Đã chép tọa độ CAD (Y,X) của ${valid.length} điểm!`);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, () => setStatus('Không chép được CAD, hãy bôi đen bảng.', true));
        } else {
            if (typeof root.copyToClipboard === 'function') {
                root.copyToClipboard(text);
                done();
            } else {
                setStatus('Trình duyệt không hỗ trợ chép tự động.', true);
            }
        }
    }

    function openExportModal() {
        if (!last || !last.results) {
            if (root.showToast) root.showToast('⚠️ Chưa có kết quả để xuất file!', true);
            return;
        }
        const valid = last.results.filter(r => r.ok && Number.isFinite(r.X) && Number.isFinite(r.Y));
        if (!valid.length) {
            if (root.showToast) root.showToast('⚠️ Không có điểm nào hợp lệ để xuất file!', true);
            return;
        }
        const dstLabel = kttLabel(last.dst.ktt);
        const points = valid.map((r, idx) => ({
            id: Date.now() + idx,
            name: r.name || `M${idx + 1}`,
            x: r.X,
            y: r.Y,
            lat: r.lat || 0,
            lng: r.lng || 0,
            h: 0,
            ktt: dstLabel,
            mui: last.dst.zone,
            note: `Đổi KTT: ${kttLabel(last.src.ktt)} (${last.src.zone}°) ➔ ${dstLabel} (${last.dst.zone}°)`
        }));
        if (root.appData && typeof root.appData.openExportModal === 'function') {
            root.appData._customExportPoints = points;
            root.appData.openExportModal('transform');
        } else {
            download();
        }
    }

    function viewOnMap() {
        if (!last || !last.results || !last.results.length) {
            setStatus('Chưa có kết quả để xem trên bản đồ.', true);
            return;
        }
        const valid = last.results.filter(r => r.ok && Number.isFinite(r.lat) && Number.isFinite(r.lng));
        if (!valid.length) {
            setStatus('Không có điểm nào có tọa độ địa lý hợp lệ để hiển thị trên bản đồ.', true);
            return;
        }
        if (root.appNav && typeof root.appNav.openTransformMap === 'function') {
            root.appNav.openTransformMap({
                mode: 'view',
                subMode: 'multi',
                rezonePoints: valid,
                src: last.src,
                dst: last.dst
            });
            if (typeof root.showToast === 'function') {
                root.showToast(`🗺️ Đang hiển thị ${valid.length} điểm kết quả đổi KTT/múi trên bản đồ!`);
            }
        } else {
            setStatus('Bản đồ chuyển đổi chưa sẵn sàng.', true);
        }
    }

    function download() {
        if (!last) return;
        const blob = new Blob([toCsv(last.results, last.src, last.dst)], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `VN2000_DoiKTT_${kttLabel(last.src.ktt).replace(/[°']/g, '')}_sang_${kttLabel(last.dst.ktt).replace(/[°']/g, '')}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // ======================= ĐẶT TÊN VÀ LƯU ĐIỂM KẾT QUẢ =======================
    function openSaveModal() {
        if (!last || !last.results || !last.results.some(r => r.ok)) {
            setStatus('Chưa có kết quả điểm hợp lệ để lưu.', true);
            if (root.showToast) root.showToast('⚠️ Chưa có kết quả điểm hợp lệ để lưu!', true);
            return;
        }

        const modal = byId('modalRzSavePoints');
        if (!modal) return;

        // Nạp danh sách dự án hiện có
        const selProj = byId('rzSaveProject');
        if (selProj) {
            selProj.innerHTML = '';
            const state = root.AppState || {};
            const projects = (state.projectsList && state.projectsList.length > 0)
                ? state.projectsList
                : ['VN2000_SoLieu_DoDac.csv'];
            const curProj = state.currentProject || projects[0];

            projects.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                if (name === curProj) opt.selected = true;
                selProj.appendChild(opt);
            });

            const optNew = document.createElement('option');
            optNew.value = '__new__';
            optNew.innerText = '➕ Tạo dự án mới…';
            selProj.appendChild(optNew);
        }

        const newProjWrap = byId('rzSaveNewProjectWrap');
        if (newProjWrap) newProjWrap.style.display = 'none';

        const namingStrategy = byId('rzSaveNamingStrategy');
        if (namingStrategy) namingStrategy.value = 'original';
        const prefixWrap = byId('rzSavePrefixWrap');
        if (prefixWrap) prefixWrap.style.display = 'none';

        renderSavePointsTable();
        modal.classList.add('active', 'show');
    }

    function closeSaveModal() {
        const modal = byId('modalRzSavePoints');
        if (modal) modal.classList.remove('active', 'show');
    }

    function renderSavePointsTable() {
        const tbody = byId('rzSaveTableBody');
        if (!tbody || !last) return;
        tbody.innerHTML = '';

        const validResults = last.results.filter(r => r.ok);
        const kttDstStr = kttLabel(last.dst.ktt);
        const zoneDstStr = `${last.dst.zone}°`;

        validResults.forEach((r, idx) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
            tr.innerHTML = `
                <td style="text-align: center; padding: 6px;">
                    <input type="checkbox" class="rz-save-cb" value="${idx}" checked
                        onchange="Vn2kRezone.updateSelectedCount()"
                        style="accent-color: #c084fc; width: 14px; height: 14px; cursor: pointer;">
                </td>
                <td style="text-align: center; color: #94a3b8; font-size: 11px;">${idx + 1}</td>
                <td style="padding: 4px 6px;">
                    <input type="text" class="app-input rz-save-name" data-idx="${idx}" value="${escapeHtml(r.name)}"
                        style="height: 26px; width: 100%; font-size: 11.5px; font-weight: 700; color: #c084fc; padding: 0 6px;">
                </td>
                <td style="text-align: right; font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc;">${r.X.toFixed(3)}</td>
                <td style="text-align: right; font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc;">${r.Y.toFixed(3)}</td>
                <td style="text-align: center; font-size: 11px; color: #38bdf8; font-weight: 600;">${kttDstStr}</td>
                <td style="text-align: center; font-size: 11px; color: #38bdf8; font-weight: 600;">${zoneDstStr}</td>
                <td style="font-size: 11px; color: #94a3b8; font-family: ui-monospace, monospace;">${r.lat ? `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}` : '—'}</td>
            `;
            tbody.appendChild(tr);
        });

        const dstInfo = byId('rzSaveDstInfo');
        if (dstInfo) dstInfo.innerText = `(KTT đích: ${kttDstStr} • Múi ${zoneDstStr})`;
        updateSelectedCount();
    }

    function escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function onSaveProjectChange(val) {
        const wrap = byId('rzSaveNewProjectWrap');
        if (wrap) wrap.style.display = (val === '__new__') ? 'block' : 'none';
    }

    function onNamingStrategyChange(strategy) {
        const wrap = byId('rzSavePrefixWrap');
        if (wrap) wrap.style.display = (strategy === 'prefix') ? 'flex' : 'none';
        if (strategy === 'original' || strategy === 'suffix_ktt') {
            applyCurrentNaming();
        }
    }

    function applyCurrentNaming() {
        if (!last) return;
        const strategy = byId('rzSaveNamingStrategy')?.value || 'original';
        const prefix = byId('rzSavePrefix')?.value?.trim() || 'M_';
        const kttClean = kttLabel(last.dst.ktt).replace(/[°']/g, '');
        const validResults = last.results.filter(r => r.ok);

        const inputs = document.querySelectorAll('.rz-save-name');
        inputs.forEach(inp => {
            const idx = parseInt(inp.getAttribute('data-idx'), 10);
            if (isNaN(idx) || !validResults[idx]) return;
            const originalName = validResults[idx].name;

            if (strategy === 'original') {
                inp.value = originalName;
            } else if (strategy === 'prefix') {
                inp.value = `${prefix}${idx + 1}`;
            } else if (strategy === 'suffix_ktt') {
                inp.value = `${originalName}_${kttClean}`;
            }
        });
    }

    function toggleSelectAllSave(selectAll) {
        const cbs = document.querySelectorAll('.rz-save-cb');
        cbs.forEach(cb => { cb.checked = selectAll; });
        updateSelectedCount();
    }

    function updateSelectedCount() {
        const cbs = document.querySelectorAll('.rz-save-cb:checked');
        const el = byId('rzSaveSelectedCount');
        if (el) el.innerText = cbs.length;
    }

    /**
     * Lưu các điểm kết quả vào sổ đo dự án.
     */
    function saveResultsToProject(targetProj, customNames = null) {
        if (!last || !last.results || !last.results.length) {
            return { success: false, error: 'Chưa có kết quả chuyển đổi để lưu.' };
        }

        const validResults = last.results.filter(r => r.ok);
        if (!validResults.length) {
            return { success: false, error: 'Không có điểm nào hợp lệ để lưu.' };
        }

        const state = root.AppState || {};
        let finalProj = (typeof targetProj === 'string' && targetProj.trim())
            ? targetProj.trim()
            : (state.currentProject || 'VN2000_SoLieu_DoDac.csv');

        if (!finalProj.toLowerCase().endsWith('.csv')) {
            finalProj += '.csv';
        }

        // Cập nhật AppState.projectsList nếu là dự án mới
        if (state.projectsList && !state.projectsList.includes(finalProj)) {
            state.projectsList.push(finalProj);
            if (root.appData && root.appData.saveProjectsList) {
                root.appData.saveProjectsList();
            }
        }

        const pointsToSave = validResults.map((r, idx) => {
            let ptName = r.name;
            if (customNames && typeof customNames[idx] === 'string' && customNames[idx].trim()) {
                ptName = customNames[idx].trim();
            } else if (Array.isArray(customNames) && customNames[idx]) {
                ptName = String(customNames[idx]).trim();
            }

            const kttDstStr = kttLabel(last.dst.ktt);
            const kttSrcStr = kttLabel(last.src.ktt);
            const notes = [];
            notes.push(`Đổi KTT: ${kttSrcStr} (${last.src.zone}°) ➔ ${kttDstStr} (${last.dst.zone}°)`);
            const n = noteOf(r);
            if (n) notes.push(n);

            return {
                id: Date.now() + idx,
                name: ptName,
                x: parseFloat(r.X.toFixed(3)),
                y: parseFloat(r.Y.toFixed(3)),
                lat: Number.isFinite(r.lat) ? parseFloat(r.lat.toFixed(7)) : 0,
                lng: Number.isFinite(r.lng) ? parseFloat(r.lng.toFixed(7)) : 0,
                h: 0,
                mui: last.dst.zone,
                ktt: kttDstStr,
                kttVal: last.dst.ktt,
                kttDecimal: last.dst.ktt,
                note: notes.join('; '),
                source: 'Đổi KTT/Múi',
                project: finalProj,
                time: new Date().toISOString()
            };
        });

        // Lưu vào appData
        if (root.appData && typeof root.appData.getPoints === 'function' && typeof root.appData.savePoints === 'function') {
            const currentPts = root.appData.getPoints(finalProj) || [];
            currentPts.push(...pointsToSave);
            root.appData.savePoints(finalProj, currentPts);
        } else if (typeof localStorage !== 'undefined') {
            const key = `vn2k_pts_${finalProj}`;
            let currentPts = [];
            try { currentPts = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
            if (!Array.isArray(currentPts)) currentPts = [];
            currentPts.push(...pointsToSave);
            localStorage.setItem(key, JSON.stringify(currentPts));
        }

        // Cập nhật trạng thái dự án hiện hành
        state.currentProject = finalProj;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('vn2k_cur_project', finalProj);
        }

        // Lưu điểm đầu tiên vào AppState.lastConvertedPoint để dùng chung
        if (pointsToSave.length > 0) {
            state.lastConvertedPoint = pointsToSave[0];
            if (root.appTransformMap) {
                root.appTransformMap.rezonePoints = validResults.map((r, i) => ({
                    ...r,
                    name: pointsToSave[i].name
                }));
                root.appTransformMap.rezoneSrc = last.src;
                root.appTransformMap.rezoneDst = last.dst;
            }
        }

        // Đồng bộ banner và dropdown nếu có
        if (root.appNav && typeof root.appNav.updateBanner === 'function') {
            root.appNav.updateBanner();
        }
        if (root.appData && typeof root.appData.populateProjectSelect === 'function') {
            root.appData.populateProjectSelect();
        }

        return {
            success: true,
            count: pointsToSave.length,
            project: finalProj,
            points: pointsToSave
        };
    }

    function confirmSave() {
        if (!last || !last.results) return;
        const validResults = last.results.filter(r => r.ok);
        if (!validResults.length) {
            if (root.showToast) root.showToast('⚠️ Không có điểm nào hợp lệ để lưu!', true);
            return;
        }

        const sel = byId('rzSaveProject');
        let chosenProj = sel ? sel.value : '';
        if (chosenProj === '__new__') {
            const newNameInput = byId('rzSaveNewProject');
            chosenProj = newNameInput ? newNameInput.value.trim() : '';
            if (!chosenProj) {
                if (root.showToast) root.showToast('⚠️ Vui lòng nhập tên file dự án mới!', true);
                if (newNameInput) newNameInput.focus();
                return;
            }
        }

        // Thu thập checkbox và tên mốc tùy biến từ bảng
        const cbs = document.querySelectorAll('.rz-save-cb:checked');
        if (!cbs.length) {
            if (root.showToast) root.showToast('⚠️ Vui lòng tích chọn ít nhất 1 mốc để lưu!', true);
            return;
        }

        const customNames = {};
        cbs.forEach(cb => {
            const idx = parseInt(cb.value, 10);
            const nameInput = document.querySelector(`.rz-save-name[data-idx="${idx}"]`);
            if (nameInput) customNames[idx] = nameInput.value.trim() || validResults[idx].name;
            else customNames[idx] = validResults[idx].name;
        });

        const checkedIndices = Array.from(cbs).map(cb => parseInt(cb.value, 10));
        const originalValid = last.results.filter(r => r.ok);
        const subsetResults = checkedIndices.map(i => originalValid[i]).filter(Boolean);
        const subsetNames = checkedIndices.map(i => customNames[i]);

        const tempLast = { ...last, results: subsetResults };
        const saved = saveResultsToProject(chosenProj, subsetNames);

        closeSaveModal();

        if (saved && saved.success) {
            const dstStr = kttLabel(last.dst.ktt);
            const msg = `✓ Đã lưu thành công ${saved.count} điểm kết quả (KTT ${dstStr}, Múi ${last.dst.zone}°) vào dự án "${saved.project}"!`;
            if (root.showToast) root.showToast(msg, true);
            if (root.triggerHaptic) root.triggerHaptic('success');
            setStatus(`Đã lưu ${saved.count} mốc (KTT ${dstStr}, Múi ${last.dst.zone}°) vào dự án "${saved.project}".`, false);
        } else {
            if (root.showToast) root.showToast(`⚠️ Lỗi khi lưu: ${saved?.error || 'Không xác định'}`, true);
        }
    }

    function swap() {
        ['Ktt', 'KttCustom', 'Zone'].forEach(f => {
            const a = byId('rzSrc' + f), b = byId('rzDst' + f);
            [a.value, b.value] = [b.value, a.value];
        });
        toggleCustom('rzSrc'); toggleCustom('rzDst');
        // Kết quả đang có trở thành đầu vào để đổi ngược.
        if (last && last.results.some(r => r.ok)) {
            byId('rzInput').value = last.results.filter(r => r.ok).map(r => `${r.name}\t${r.X.toFixed(3)}\t${r.Y.toFixed(3)}`).join('\n');
            run();
        }
    }

    function init() {
        if (!byId('panelTransRezone')) return;
        const state = root.AppState || {};
        const current = Number(state.kttVal) || 105.75;
        if (fillSelect(byId('rzSrcKtt'), current)) byId('rzSrcKttCustom').value = kttLabel(current);
        fillSelect(byId('rzDstKtt'), current === 105 ? 105.75 : 105);
        byId('rzSrcZone').value = String(state.muiVal === 6 ? 6 : 3);
        ['rzSrc', 'rzDst'].forEach(p => { byId(p + 'Ktt').addEventListener('change', () => toggleCustom(p)); toggleCustom(p); });
        byId('rzRun').addEventListener('click', run);
        byId('rzSwap').addEventListener('click', swap);
        byId('rzCopy').addEventListener('click', copy);
        const btnCad = byId('rzCopyCad');
        if (btnCad) btnCad.addEventListener('click', copyCad);
        byId('rzCsv').addEventListener('click', download);
        const btnExport = byId('rzExport');
        if (btnExport) btnExport.addEventListener('click', openExportModal);
        const btnView = byId('rzViewMap');
        if (btnView) btnView.addEventListener('click', viewOnMap);
        const btnSave = byId('rzSave');
        if (btnSave) btnSave.addEventListener('click', openSaveModal);
        byId('rzClear').addEventListener('click', () => { byId('rzInput').value = ''; last = null; render([]); setStatus('', false); });
        byId('rzSample').addEventListener('click', () => {
            byId('rzInput').value = 'M1\t1191900.123\t603800.456\nM2\t1192015.880\t603912.304';
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})(typeof window !== 'undefined' ? window : globalThis);
