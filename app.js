/**
 * ỨNG DỤNG TRẮC ĐỊA VN-2000 & WGS-84 CHO IOS & WEB PWA
 * Thiết kế giao diện và chức năng chuẩn hóa 100% theo bản Android B4A
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com)
 */

// ================= 1. TRẠNG THÁI TOÀN CỤC (GLOBAL STATE) =================
const AppState = {
    currentScreen: 'menu',
    prevScreen: 'menu',
    provinceIndex: 0, // Mặc định TP. Hồ Chí Minh
    provinceName: "TP. Hồ Chí Minh",
    kttDeg: 105,
    kttMin: 45,
    kttVal: 105.75,
    muiVal: 3, // 3° hoặc 6°
    scaleFactor: 0.9999, // 0.9999 cho Múi 3°, 0.9996 cho Múi 6°
    formatType: 0, // 0: dd.dddddd°, 1: dd° mm.mmm', 2: dd° mm' ss.ss"
    
    currentProject: "VN2000_SoLieu_DoDac.csv",
    projectsList: ["VN2000_SoLieu_DoDac.csv"],
    
    // Storage & Google Sync State
    storageMode: 'offline', // 'offline' (mặc định) hoặc 'auto_google'
    googleScriptUrl: '',
    googleSheetViewUrl: '',
    offlineQueue: [],
    
    // GPS State
    isGpsTracking: true,
    gpsWatchId: null,
    lastGps: { lat: 0, lng: 0, accuracy: 0, altitude: 0, speed: 0, heading: 0 },
    
    // Map State
    leafletMap: null,
    mapMode: 'view', // 'view' hoặc 'pick'
    baseLayers: {},
    activeBaseLayerId: 'google_hybrid',
    layer34Prov: null,
    is34ProvVisible: false,
    layerDtCommunes: null,
    isDtCommunesVisible: false,
    projectMarkersGroup: null,
    projectPolyline: null,
    pickerMarker: null,
    pickedCoord: null, // { lat, lng, X, Y }
    lastConvertedPoint: null, // { lat, lng, x, y, name, ktt, k0 }
    convertedMarker: null,
    liveGpsMarker: null,
    liveGpsAccuracyCircle: null,
    surveyorTargetLine: null,
    
    // Geodesy State
    boundaryPoints: []
};

// ================= 2. TIỆN ÍCH TOAST & CLIPBOARD =================
function showToast(msg, isLong = false) {
    const el = document.getElementById('toast-msg');
    if (!el) return;
    el.innerText = msg;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
        el.classList.remove('show');
    }, isLong ? 3500 : 2000);
}

function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("📋 Đã sao chép vào bộ nhớ tạm!");
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        showToast("📋 Đã sao chép vào bộ nhớ tạm!");
    } catch (e) {
        showToast("⚠️ Không thể sao chép tự động!");
    }
    document.body.removeChild(ta);
}

// ================= 3. ĐIỀU HƯỚNG MÀN HÌNH (NAVIGATION) =================
const appNav = {
    showScreen(screenName) {
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = screenName;

        // Ẩn tất cả screens
        document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));
        const mapView = document.getElementById('map-view-container');
        if (mapView) mapView.classList.remove('active');

        const btnBack = document.getElementById('btnHeaderBack');
        const titleEl = document.getElementById('headerTitle');
        const subTitleEl = document.getElementById('headerSubtitle');

        if (screenName === 'menu') {
            document.getElementById('screen-menu').classList.add('active');
            if (btnBack) btnBack.style.display = 'none';
            if (titleEl) titleEl.innerHTML = `<img src="icon.png" alt="VN2000 Pro"><span>WGS-84 ⇄ VN-2000 PRO</span>`;
            if (subTitleEl) subTitleEl.innerText = "Hệ Quy Chiếu & Tọa Độ Quốc Gia";
            appNav.updateBanner();
        } else {
            if (btnBack) btnBack.style.display = 'inline-flex';
            
            let titleText = "WGS-84 ⇄ VN-2000";
            if (screenName === 'transform') {
                titleText = "1. CHUYỂN ĐỔI TỌA ĐỘ";
                document.getElementById('screen-transform').classList.add('active');
            } else if (screenName === 'gps') {
                titleText = "2. GPS THỰC ĐỊA";
                document.getElementById('screen-gps').classList.add('active');
                appGps.refreshDisplay();
            } else if (screenName === 'datamgmt') {
                titleText = "4. SỔ ĐO & DỰ ÁN";
                document.getElementById('screen-datamgmt').classList.add('active');
                appData.refreshTable();
            } else if (screenName === 'geodesy') {
                titleText = "5. BÀI TOÁN TRẮC ĐỊA";
                document.getElementById('screen-geodesy').classList.add('active');
                appGeodesy.initDropdowns();
            } else if (screenName === 'about') {
                titleText = "6. THÔNG TIN & HƯỚNG DẪN";
                document.getElementById('screen-about').classList.add('active');
            }

            if (titleEl) titleEl.innerHTML = `<span>${titleText}</span>`;
            if (subTitleEl) subTitleEl.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;
        }
    },

    goToMenu() {
        appNav.showScreen('menu');
    },

    openProjectMap() {
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = 'map';
        document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));
        const mapView = document.getElementById('map-view-container');
        if (mapView) mapView.classList.add('active');

        appMap.initMap();
        appMap.loadProjectMarkers();
        appMap.fitProjectBounds();
    },

    openConvertedMap(pointData) {
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = 'map';
        document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));
        const mapView = document.getElementById('map-view-container');
        if (mapView) mapView.classList.add('active');

        appMap.initMap();
        if (pointData) {
            appMap.showConvertedPoint(
                pointData.lat,
                pointData.lng,
                pointData.x,
                pointData.y,
                pointData.name,
                pointData.ktt,
                pointData.k0
            );
        }
    },

    openLiveGpsMap() {
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = 'map';
        document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));
        const mapView = document.getElementById('map-view-container');
        if (mapView) mapView.classList.add('active');

        appMap.initMap();
        appMap.loadProjectMarkers();

        const txt = document.getElementById('mapModeIndicator');
        if (txt) {
            txt.innerText = "🛰️ VỊ TRÍ GPS THỰC ĐỊA";
            txt.style.color = "#38bdf8";
        }

        if (AppState.lastGps && AppState.lastGps.lat) {
            AppState.leafletMap.setView([AppState.lastGps.lat, AppState.lastGps.lng], 18);
            appMap.updateLiveGps(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
            showToast("✓ Đã định vị theo vị trí GPS thực tế!");
        } else {
            appTransform.getLiveGps();
        }
    },

    closeMap() {
        const dest = (AppState.prevScreen && AppState.prevScreen !== 'map') ? AppState.prevScreen : 'menu';
        appNav.showScreen(dest);
    },

    updateBanner() {
        const provEl = document.getElementById('bannerProvinceKtt');
        const muiEl = document.getElementById('bannerMui');
        const projEl = document.getElementById('bannerProject');

        if (provEl) provEl.innerText = `${AppState.provinceName} (${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;
        if (muiEl) muiEl.innerText = `Múi ${AppState.muiVal}° (k0 = ${AppState.scaleFactor})`;
        
        const count = appData.getPoints(AppState.currentProject).length;
        if (projEl) projEl.innerText = `${AppState.currentProject} (${count} mốc)`;

        const storageEl = document.getElementById('bannerStorageMode');
        if (storageEl) {
            if (AppState.storageMode === 'auto_google') {
                storageEl.innerHTML = `☁️ Google Sheets ${AppState.googleScriptUrl ? '🟢' : '⚠️'} ⚙️`;
                storageEl.style.color = '#38bdf8';
            } else {
                storageEl.innerHTML = `📱 Ngoại tuyến (Trên máy) ⚙️`;
                storageEl.style.color = '#4ade80';
            }
        }
    }
};

// ================= 4. PHÂN HỆ CHUYỂN ĐỔI TỌA ĐỘ (TRANSFORM) =================
const appTransform = {
    init() {
        // Nạp 63 tỉnh thành vào dropdown màn hình 1
        const sel = document.getElementById('tfSelectProvince');
        if (sel) {
            sel.innerHTML = '<option value="-1">--- Tự nhập kinh tuyến trục ---</option>';
            VN_PROVINCES.forEach((p, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.innerText = `${p.name} (${p.deg}°${String(p.min).padStart(2,'0')}')`;
                if (p.name.includes("Hồ Chí Minh")) opt.selected = true;
                sel.appendChild(opt);
            });
        }
    },

    setMui(mui) {
        AppState.muiVal = mui;
        AppState.scaleFactor = (mui === 3) ? 0.9999 : 0.9996;
        document.getElementById('btnMui3').classList.toggle('active', mui === 3);
        document.getElementById('btnMui6').classList.toggle('active', mui === 6);
        appNav.updateBanner();
        showToast(`Đã chọn Múi ${mui}° (k0 = ${AppState.scaleFactor})`);
    },

    onProvinceChange() {
        const sel = document.getElementById('tfSelectProvince');
        const idx = parseInt(sel.value, 10);
        if (idx >= 0 && idx < VN_PROVINCES.length) {
            const p = VN_PROVINCES[idx];
            AppState.provinceIndex = idx;
            AppState.provinceName = p.name;
            AppState.kttDeg = p.deg;
            AppState.kttMin = p.min;
            AppState.kttVal = p.ktt;
        } else {
            appModal.openSettings();
        }
        appNav.updateBanner();
    },

    onFormatChange() {
        const val = parseInt(document.getElementById('selFormatWgs').value, 10);
        AppState.formatType = val;
        // Nếu đang có số Lat/Lng thì cập nhật lại định dạng hiển thị
        const rawLat = parseCoordinateNumber(document.getElementById('txtWgsLat').value);
        const rawLng = parseCoordinateNumber(document.getElementById('txtWgsLng').value);
        if (rawLat !== 0 && rawLng !== 0) {
            document.getElementById('txtWgsLat').value = formatLatLong(rawLat, AppState.formatType);
            document.getElementById('txtWgsLng').value = formatLatLong(rawLng, AppState.formatType);
        }
    },

    // Chuyển đổi WGS-84 -> VN-2000 (Chủ động click)
    wgsToVn2000() {
        const strLat = document.getElementById('txtWgsLat').value.trim();
        const strLng = document.getElementById('txtWgsLng').value.trim();
        if (!strLat || !strLng) {
            showToast("⚠️ Vui lòng nhập hoặc lấy tọa độ WGS-84 (Vĩ độ, Kinh độ)!", true);
            return;
        }

        let lat = parseCoordinateNumber(strLat);
        let lng = parseCoordinateNumber(strLng);

        if (lat === 0 || lng === 0) {
            showToast("⚠️ Tọa độ Vĩ độ và Kinh độ phải là số hợp lệ!", true);
            return;
        }

        // Tự động kiểm tra và đảo vị trí nếu người dùng nhập ngược (ở VN: Lat ~ 8-24, Lng ~ 102-110)
        if (lat > 50 && lng < 50) {
            const temp = lat;
            lat = lng;
            lng = temp;
            document.getElementById('txtWgsLat').value = formatLatLong(lat, AppState.formatType);
            document.getElementById('txtWgsLng').value = formatLatLong(lng, AppState.formatType);
            showToast("🔄 Đã tự động đảo đúng vị trí Vĩ độ (B) và Kinh độ (L)!", true);
        }

        // Cảnh báo nếu kinh độ lệch xa kinh tuyến trục
        if (Math.abs(lng - AppState.kttVal) > 2.5) {
            showToast(`⚠️ Lưu ý: Kinh độ (${lng.toFixed(2)}°) lệch nhiều so với KTT (${AppState.kttVal.toFixed(2)}°)!`, true);
        }

        try {
            const pt = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
            const ptX = pt.X;
            const ptY = pt.Y;
            document.getElementById('txtVn2kX').value = ptX.toFixed(3);
            document.getElementById('txtVn2kY').value = ptY.toFixed(3);

            // Lưu trạng thái điểm vừa chuyển đổi
            const ptName = document.getElementById('txtSavePointName').value.trim() || 'Điểm Chuyển Đổi';
            AppState.lastConvertedPoint = {
                lat: lat,
                lng: lng,
                x: ptX,
                y: ptY,
                name: ptName,
                ktt: AppState.kttVal,
                k0: AppState.scaleFactor
            };

            // Cập nhật khung kết quả chuyển đổi
            appTransform.updateConvertedResultBox(AppState.lastConvertedPoint);

            // Hiển thị dialog hỏi mở bản đồ như Android B4A
            appTransform.promptOpenConvertedMap(AppState.lastConvertedPoint);

            showToast("✓ Đã tính chuyển thành công sang VN-2000!");
        } catch (e) {
            showToast("❌ Lỗi tính toán: " + e.message, true);
        }
    },

    // Chuyển đổi VN-2000 -> WGS-84 (Chủ động click)
    vn2000ToWgs() {
        const strX = document.getElementById('txtVn2kX').value.trim();
        const strY = document.getElementById('txtVn2kY').value.trim();
        if (!strX || !strY) {
            showToast("⚠️ Vui lòng nhập tọa độ phẳng VN-2000 (X, Y)!", true);
            return;
        }

        let x = parseCoordinateNumber(strX);
        let y = parseCoordinateNumber(strY);

        if (x === 0 || y === 0) {
            showToast("⚠️ Tọa độ X và Y phải là số hợp lệ!", true);
            return;
        }

        // Tự động đảo nếu nhập ngược X và Y (VN-2000: X Bắc ~ 7 chữ số 1tr-2tr, Y Đông ~ 6 chữ số 300k-700k)
        if (x < 1000000 && y > 1000000) {
            const temp = x;
            x = y;
            y = temp;
            document.getElementById('txtVn2kX').value = x.toFixed(3);
            document.getElementById('txtVn2kY').value = y.toFixed(3);
            showToast("🔄 Đã tự động đảo đúng vị trí X (Bắc ~ 7 số) và Y (Đông ~ 6 số)!", true);
        }

        try {
            const coord = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
            const cLat = coord.lat;
            const cLng = coord.lng;
            document.getElementById('txtWgsLat').value = formatLatLong(cLat, AppState.formatType);
            document.getElementById('txtWgsLng').value = formatLatLong(cLng, AppState.formatType);

            // Lưu trạng thái điểm vừa chuyển đổi
            const ptName = document.getElementById('txtSavePointName').value.trim() || 'Điểm Chuyển Đổi';
            AppState.lastConvertedPoint = {
                lat: cLat,
                lng: cLng,
                x: x,
                y: y,
                name: ptName,
                ktt: AppState.kttVal,
                k0: AppState.scaleFactor
            };

            // Cập nhật khung kết quả chuyển đổi
            appTransform.updateConvertedResultBox(AppState.lastConvertedPoint);

            // Hiển thị dialog hỏi mở bản đồ như Android B4A
            appTransform.promptOpenConvertedMap(AppState.lastConvertedPoint);

            showToast("✓ Đã tính chuyển thành công sang WGS-84!");
        } catch (e) {
            showToast("❌ Lỗi tính toán: " + e.message, true);
        }
    },

    getLiveGps() {
        showToast("🛰️ Đang lấy tọa độ GPS thực tế...");
        if (!navigator.geolocation) {
            showToast("⚠️ Thiết bị không hỗ trợ định vị GPS!", true);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('txtWgsLat').value = formatLatLong(lat, AppState.formatType);
                document.getElementById('txtWgsLng').value = formatLatLong(lng, AppState.formatType);
                showToast(`✓ Đã nạp GPS (±${pos.coords.accuracy.toFixed(1)}m). Bấm nút chuyển đổi để tính!`, true);
            },
            (err) => {
                showToast("⚠️ Không thể lấy GPS: " + err.message, true);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    },

    openPickOnMap() {
        AppState.mapMode = 'pick';
        
        let initLat = 0;
        let initLng = 0;
        const strLat = document.getElementById('txtWgsLat').value.trim();
        const strLng = document.getElementById('txtWgsLng').value.trim();
        const strX = document.getElementById('txtVn2kX').value.trim();
        const strY = document.getElementById('txtVn2kY').value.trim();

        if (strLat && strLng) {
            initLat = parseCoordinateNumber(strLat);
            initLng = parseCoordinateNumber(strLng);
        } else if (strX && strY) {
            const x = parseCoordinateNumber(strX);
            const y = parseCoordinateNumber(strY);
            if (x && y) {
                const w = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                initLat = w.lat;
                initLng = w.lng;
            }
        }

        appNav.openProjectMap();

        const txt = document.getElementById('mapModeIndicator');
        if (txt) {
            txt.innerText = "🎯 CHẾ ĐỘ CHẤM ĐIỂM";
            txt.style.color = "#38bdf8";
        }

        // Nếu người dùng đã có tọa độ nhập, đặt con trỏ tâm ngắm quang học tại đó
        if (initLat && initLng && initLat !== 0 && initLng !== 0) {
            appMap.onMapClick(initLat, initLng);
        } else if (AppState.lastGps && AppState.lastGps.lat) {
            // Nếu chưa nhập tọa độ nhưng đã có GPS, đặt tâm ngắm tại GPS
            appMap.onMapClick(AppState.lastGps.lat, AppState.lastGps.lng);
        }

        // Đảm bảo Live GPS Marker (chấm xanh radar) luôn hiển thị đồng thời nếu có GPS
        if (AppState.lastGps && AppState.lastGps.lat) {
            appMap.updateLiveGps(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
            // Thu phóng hiển thị đồng thời cả 2 điểm (vị trí đứng & tâm ngắm)
            appMap.fitBothPoints();
        }
    },

    pasteCoords() {
        if (!navigator.clipboard || !navigator.clipboard.readText) {
            const manual = prompt("Dán chuỗi tọa độ vào đây (VD: 10.345211, 106.113617 hoặc X, Y):");
            if (manual) appTransform.parseAndFillString(manual);
            return;
        }
        navigator.clipboard.readText().then(text => {
            if (text) appTransform.parseAndFillString(text);
        }).catch(() => {
            const manual = prompt("Dán chuỗi tọa độ vào đây:");
            if (manual) appTransform.parseAndFillString(manual);
        });
    },

    parseAndFillString(text) {
        const clean = text.replace(/,/g, ' ').replace(/;/g, ' ').replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
        const parts = clean.split(' ');
        if (parts.length >= 2) {
            const n1 = parseCoordinateNumber(parts[0]);
            const n2 = parseCoordinateNumber(parts[1]);
            if (n1 > 500000 || n2 > 500000) {
                // Nhận diện là VN2000
                document.getElementById('txtVn2kX').value = n1.toFixed(3);
                document.getElementById('txtVn2kY').value = n2.toFixed(3);
                showToast("✓ Đã dán vào ô tọa độ VN-2000 (X, Y)!");
            } else {
                // Nhận diện là WGS84
                document.getElementById('txtWgsLat').value = formatLatLong(n1, AppState.formatType);
                document.getElementById('txtWgsLng').value = formatLatLong(n2, AppState.formatType);
                showToast("✓ Đã dán vào ô tọa độ WGS-84 (Lat, Lng)!");
            }
        } else {
            showToast("⚠️ Không tìm thấy 2 tọa độ hợp lệ trong chuỗi!", true);
        }
    },

    copyWgs() {
        const lat = document.getElementById('txtWgsLat').value;
        const lng = document.getElementById('txtWgsLng').value;
        if (!lat || !lng) return showToast("⚠️ Chưa có tọa độ WGS-84!");
        copyToClipboard(`${lat}, ${lng}`);
    },

    copyVn2k() {
        const x = document.getElementById('txtVn2kX').value;
        const y = document.getElementById('txtVn2kY').value;
        if (!x || !y) return showToast("⚠️ Chưa có tọa độ VN-2000!");
        copyToClipboard(`X=${x}, Y=${y}`);
    },

    clearWgs() {
        document.getElementById('txtWgsLat').value = '';
        document.getElementById('txtWgsLng').value = '';
    },

    clearVn2k() {
        document.getElementById('txtVn2kX').value = '';
        document.getElementById('txtVn2kY').value = '';
    },

    savePointToCsv() {
        const strX = document.getElementById('txtVn2kX').value.trim();
        const strY = document.getElementById('txtVn2kY').value.trim();
        const strLat = document.getElementById('txtWgsLat').value.trim();
        const strLng = document.getElementById('txtWgsLng').value.trim();

        if (!strX && !strLat) {
            showToast("⚠️ Vui lòng nhập tọa độ trước khi lưu mốc!", true);
            return;
        }

        let name = document.getElementById('txtSavePointName').value.trim();
        let note = document.getElementById('txtSavePointNote').value.trim();
        const pts = appData.getPoints(AppState.currentProject);

        if (!name) {
            name = `Mốc ${pts.length + 1}`;
        }

        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        const newPoint = {
            id: Date.now(),
            time: timeStr,
            name: name,
            x: strX || "0",
            y: strY || "0",
            lat: strLat || "0",
            lng: strLng || "0",
            mui: AppState.muiVal,
            ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`,
            note: note
        };

        appData.addPoint(AppState.currentProject, newPoint);
        if (AppState.storageMode === 'auto_google' && AppState.googleScriptUrl) {
            showToast(`✓ Đã lưu "${name}" và gửi Google Sheets!`, true);
        } else {
            showToast(`✓ Đã lưu "${name}" vào file ${AppState.currentProject}!`, true);
        }

        // Xóa ô nhập sau khi lưu
        document.getElementById('txtSavePointName').value = '';
        document.getElementById('txtSavePointNote').value = '';
    },

    updateConvertedResultBox(pt) {
        const box = document.getElementById('boxConvertedResult');
        if (!box || !pt) return;
        
        const elName = document.getElementById('resPtName');
        const elX = document.getElementById('resVn2kX');
        const elY = document.getElementById('resVn2kY');
        const elLat = document.getElementById('resWgsLat');
        const elLng = document.getElementById('resWgsLng');
        const elKtt = document.getElementById('resKttInfo');

        if (elName) elName.innerText = pt.name;
        if (elX) elX.innerText = parseFloat(pt.x).toFixed(3);
        if (elY) elY.innerText = parseFloat(pt.y).toFixed(3);
        if (elLat) elLat.innerText = formatLatLong(pt.lat, AppState.formatType);
        if (elLng) elLng.innerText = formatLatLong(pt.lng, AppState.formatType);
        if (elKtt) elKtt.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}', Múi ${AppState.muiVal}°)`;

        box.style.display = 'block';
    },

    promptOpenConvertedMap(pt) {
        const modal = document.getElementById('modalPromptConvertedMap');
        if (!modal || !pt) return;

        const pName = document.getElementById('promptPtName');
        const pX = document.getElementById('promptVn2kX');
        const pY = document.getElementById('promptVn2kY');
        const pLat = document.getElementById('promptWgsLat');
        const pLng = document.getElementById('promptWgsLng');
        const pKtt = document.getElementById('promptKtt');

        if (pName) pName.innerText = pt.name;
        if (pX) pX.innerText = parseFloat(pt.x).toFixed(3);
        if (pY) pY.innerText = parseFloat(pt.y).toFixed(3);
        if (pLat) pLat.innerText = formatLatLong(pt.lat, AppState.formatType);
        if (pLng) pLng.innerText = formatLatLong(pt.lng, AppState.formatType);
        if (pKtt) pKtt.innerText = `${AppState.provinceName} (${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}', Múi ${AppState.muiVal}°)`;

        modal.classList.add('show');
    },

    closePromptMap() {
        const modal = document.getElementById('modalPromptConvertedMap');
        if (modal) modal.classList.remove('show');
    },

    confirmOpenConvertedMap() {
        appTransform.closePromptMap();
        appTransform.viewConvertedOnMap();
    },

    viewConvertedOnMap() {
        let pt = AppState.lastConvertedPoint;
        if (!pt) {
            const strLat = document.getElementById('txtWgsLat').value.trim();
            const strLng = document.getElementById('txtWgsLng').value.trim();
            const strX = document.getElementById('txtVn2kX').value.trim();
            const strY = document.getElementById('txtVn2kY').value.trim();
            
            let lat = parseCoordinateNumber(strLat);
            let lng = parseCoordinateNumber(strLng);
            let x = parseCoordinateNumber(strX);
            let y = parseCoordinateNumber(strY);

            if ((lat === 0 || lng === 0) && (x !== 0 && y !== 0)) {
                const coord = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                lat = coord.lat;
                lng = coord.lng;
            } else if ((x === 0 || y === 0) && (lat !== 0 && lng !== 0)) {
                const vn = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                x = vn.X;
                y = vn.Y;
            }

            if (lat === 0 || lng === 0) {
                showToast("⚠️ Vui lòng chuyển đổi hoặc nhập tọa độ trước khi xem bản đồ!", true);
                return;
            }

            const ptName = document.getElementById('txtSavePointName').value.trim() || 'Điểm Chuyển Đổi';
            pt = {
                lat: lat,
                lng: lng,
                x: x,
                y: y,
                name: ptName,
                ktt: AppState.kttVal,
                k0: AppState.scaleFactor
            };
            AppState.lastConvertedPoint = pt;
        }

        appNav.openConvertedMap(pt);
    },

    swapXY() {
        const xEl = document.getElementById('txtVn2kX');
        const yEl = document.getElementById('txtVn2kY');
        const temp = xEl.value;
        xEl.value = yEl.value;
        yEl.value = temp;
        showToast("🔄 Đã đảo vị trí Trục X và Trục Y!");
    },

    copyAllResults() {
        const pt = AppState.lastConvertedPoint;
        if (!pt) {
            showToast("⚠️ Chưa có kết quả chuyển đổi!");
            return;
        }
        const text = `Tên điểm: ${pt.name}\nVN-2000: X=${parseFloat(pt.x).toFixed(3)}, Y=${parseFloat(pt.y).toFixed(3)}\nWGS-84: Lat=${pt.lat.toFixed(7)}°, Lng=${pt.lng.toFixed(7)}°\nKTT: ${AppState.provinceName} (${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}', Múi ${AppState.muiVal}°)`;
        copyToClipboard(text);
    }
};

// ================= 5. PHÂN HỆ GPS THỰC ĐỊA (GPS REALTIME) =================
const appGps = {
    init() {
        if (!navigator.geolocation) {
            const badge = document.getElementById('gpsLiveStatusBadge');
            if (badge) {
                badge.innerText = "🔴 Không hỗ trợ";
                badge.className = "btn-sm btn-red";
            }
            return;
        }
        appGps.startTracking();
    },

    startTracking() {
        if (AppState.gpsWatchId) return;
        AppState.gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                AppState.lastGps = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy || 0,
                    altitude: pos.coords.altitude || 0,
                    speed: pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : 0,
                    heading: pos.coords.heading || 0
                };
                appGps.refreshDisplay();
                if (AppState.leafletMap) {
                    appMap.updateLiveGps(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
                }
            },
            (err) => {
                const badge = document.getElementById('gpsLiveStatusBadge');
                if (badge) {
                    badge.innerText = "⚠️ Mất GPS";
                    badge.className = "btn-sm btn-amber";
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
        );
        AppState.isGpsTracking = true;
        const btn = document.getElementById('btnToggleGpsTracking');
        if (btn) btn.innerText = "⏸️ Tạm dừng GPS";
    },

    stopTracking() {
        if (AppState.gpsWatchId) {
            navigator.geolocation.clearWatch(AppState.gpsWatchId);
            AppState.gpsWatchId = null;
        }
        AppState.isGpsTracking = false;
        const btn = document.getElementById('btnToggleGpsTracking');
        if (btn) btn.innerText = "▶️ Tiếp tục bắt GPS";
        const badge = document.getElementById('gpsLiveStatusBadge');
        if (badge) {
            badge.innerText = "⏸️ Đã dừng";
            badge.className = "btn-sm";
        }
    },

    toggleTracking() {
        if (AppState.isGpsTracking) {
            appGps.stopTracking();
        } else {
            appGps.startTracking();
        }
    },

    refreshDisplay() {
        if (!AppState.lastGps.lat) return;

        const latEl = document.getElementById('gpsLiveLat');
        const lngEl = document.getElementById('gpsLiveLng');
        const accEl = document.getElementById('gpsLiveAccuracy');
        const spdEl = document.getElementById('gpsLiveSpeed');
        const altEl = document.getElementById('gpsLiveAltitude');
        const provEl = document.getElementById('gpsVn2kProvinceInfo');
        const badge = document.getElementById('gpsLiveStatusBadge');

        if (latEl) latEl.innerText = formatLatLong(AppState.lastGps.lat, 0);
        if (lngEl) lngEl.innerText = formatLatLong(AppState.lastGps.lng, 0);
        if (accEl) accEl.innerText = `±${AppState.lastGps.accuracy.toFixed(1)} m`;
        if (spdEl) spdEl.innerText = `${AppState.lastGps.speed} km/h`;
        if (altEl) altEl.innerText = `${AppState.lastGps.altitude ? AppState.lastGps.altitude.toFixed(1) : '--'} m`;
        if (provEl) provEl.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;

        if (badge) {
            badge.innerText = "🟢 Hoạt động";
            badge.className = "btn-sm btn-green";
        }

        // Tự động tính chuyển VN-2000 Live chỉ cho màn hình GPS
        try {
            const pt = convertWgsToVn2k(AppState.lastGps.lat, AppState.lastGps.lng, AppState.kttVal, AppState.scaleFactor);
            const xEl = document.getElementById('gpsLiveVn2kX');
            const yEl = document.getElementById('gpsLiveVn2kY');
            if (xEl) xEl.innerText = pt.X.toFixed(3);
            if (yEl) yEl.innerText = pt.Y.toFixed(3);
        } catch (e) {}
    },

    saveQuickPoint() {
        if (!AppState.lastGps.lat) {
            showToast("⚠️ Chưa bắt được tọa độ GPS vệ tinh!", true);
            return;
        }

        const pts = appData.getPoints(AppState.currentProject);
        const name = prompt("Nhập tên mốc đo nhanh:", `GPS_Mốc ${pts.length + 1}`);
        if (!name) return;

        const pt = convertWgsToVn2k(AppState.lastGps.lat, AppState.lastGps.lng, AppState.kttVal, AppState.scaleFactor);
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        const newPoint = {
            id: Date.now(),
            time: timeStr,
            name: name,
            x: pt.X.toFixed(3),
            y: pt.Y.toFixed(3),
            lat: AppState.lastGps.lat.toFixed(6),
            lng: AppState.lastGps.lng.toFixed(6),
            mui: AppState.muiVal,
            ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`,
            note: `GPS Live (±${AppState.lastGps.accuracy.toFixed(1)}m)`
        };

        appData.addPoint(AppState.currentProject, newPoint);
        if (AppState.storageMode === 'auto_google' && AppState.googleScriptUrl) {
            showToast(`✓ Đã lưu nhanh "${name}" và gửi Google Sheets!`, true);
        } else {
            showToast(`✓ Đã lưu nhanh "${name}"!`);
        }
    }
};

// ================= 6. CÁC HÀM TIỆN ÍCH BIỂU TƯỢNG VÀ TRẮC ĐỊA BẢN ĐỒ =================
function createOpticalCrosshairIcon() {
    const cursorSvgHtml = 
        '<div class="concentric-marker-container">' +
            '<div class="concentric-pulse-ring" style="border:2px solid #ef4444; background:rgba(239, 68, 68, 0.16);"></div>' +
            '<svg width="48" height="48" viewBox="0 0 48 48" style="position:absolute; top:0; left:0; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.55)); pointer-events:none;">' +
                '<circle cx="24" cy="24" r="16" fill="none" stroke="#ef4444" stroke-width="2.5"/>' +
                '<circle cx="24" cy="24" r="7" fill="#ef4444" fill-opacity="0.35" stroke="#ffffff" stroke-width="2"/>' +
                '<line x1="24" y1="2" x2="24" y2="12" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>' +
                '<line x1="24" y1="36" x2="24" y2="46" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>' +
                '<line x1="2" y1="24" x2="12" y2="24" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>' +
                '<line x1="36" y1="24" x2="46" y2="24" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>' +
                '<circle cx="24" cy="24" r="3" fill="#ffffff"/>' +
            '</svg>' +
        '</div>';
    return L.divIcon({
        className: 'optical-crosshair-icon',
        html: cursorSvgHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });
}

function createLiveGpsIcon(heading) {
    const rotStyle = (heading !== undefined && heading !== null && !isNaN(heading)) ? `transform: rotate(${heading}deg);` : '';
    const html = 
        '<div class="live-gps-marker-container">' +
            '<div class="live-gps-pulse-ring"></div>' +
            '<div class="live-gps-heading-cone" style="' + rotStyle + '"></div>' +
            '<div class="live-gps-dot">' +
                '<div class="live-gps-center-core"></div>' +
            '</div>' +
        '</div>';
    return L.divIcon({
        className: 'live-gps-div-icon',
        html: html,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
    });
}

function calcGeoDistanceAndAzimuth(lat1, lon1, lat2, lon2) {
    const R = 6378137;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    let az = Math.atan2(y, x) * 180 / Math.PI;
    az = (az + 360) % 360;

    return { distance: dist, azimuth: az };
}

// ================= 7. PHÂN HỆ BẢN ĐỒ LEAFLET (MAP VIEWER & PICKER) =================
const appMap = {
    initMap() {
        if (AppState.leafletMap) {
            setTimeout(() => AppState.leafletMap.invalidateSize(), 200);
            return;
        }

        // Khởi tạo bản đồ Leaflet
        const map = L.map('leaflet-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([10.5, 106.0], 12);

        // Lớp vệ tinh Google Hybrid (chuẩn sắc nét ngoài thực địa)
        const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 22,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        // Lớp OpenStreetMap đường phố
        const osmStreets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        });

        googleHybrid.addTo(map);
        AppState.baseLayers['google_hybrid'] = googleHybrid;
        AppState.baseLayers['osm_streets'] = osmStreets;
        AppState.activeBaseLayerId = 'google_hybrid';

        AppState.projectMarkersGroup = L.layerGroup().addTo(map);

        // Sự kiện chạm chọn điểm trên bản đồ
        map.on('click', (e) => {
            appMap.onMapClick(e.latlng.lat, e.latlng.lng);
        });

        AppState.leafletMap = map;

        // Tự động nạp ranh giới 34 tỉnh thành nếu file js đã tải
        if (window.VIETNAM_34_PROVINCES) {
            appMap.init34ProvincesLayer();
        }

        // Tự động nạp ranh giới Đồng Tháp
        if (window.DONG_THAP_COMMUNES) {
            appMap.initDongThapCommunesLayer();
        }

        setTimeout(() => map.invalidateSize(), 250);
    },

    toggleMapLayer() {
        const map = AppState.leafletMap;
        if (!map) return;
        if (AppState.activeBaseLayerId === 'google_hybrid') {
            map.removeLayer(AppState.baseLayers['google_hybrid']);
            AppState.baseLayers['osm_streets'].addTo(map);
            AppState.activeBaseLayerId = 'osm_streets';
            showToast("🗺️ Bản đồ Đường phố (OSM)");
        } else {
            map.removeLayer(AppState.baseLayers['osm_streets']);
            AppState.baseLayers['google_hybrid'].addTo(map);
            AppState.activeBaseLayerId = 'google_hybrid';
            showToast("🛰️ Bản đồ Vệ tinh (Google Hybrid)");
        }
    },

    init34ProvincesLayer() {
        if (AppState.layer34Prov) return;
        if (!window.VIETNAM_34_PROVINCES) return;
        try {
            AppState.layer34Prov = L.geoJSON(window.VIETNAM_34_PROVINCES, {
                style: {
                    color: "#f43f5e",
                    weight: 2,
                    opacity: 0.85,
                    fillColor: "#fb7185",
                    fillOpacity: 0.08
                },
                onEachFeature: (feature, layer) => {
                    const p = feature.properties || {};
                    const name = p.ten_tinh || p.Ten_Tinh || p.NAME_1 || p.name || "Tỉnh";
                    const merged = p.sap_nhap ? `<div style="color:#64748b; font-size:11px; margin-top:2px;">• <b>Sáp nhập:</b> ${p.sap_nhap}</div>` : '';
                    const scale = p.quy_mo ? `<div style="color:#475569; font-size:11px;">• <b>Quy mô:</b> ${p.quy_mo}</div>` : '';
                    const area = p.dtich_km2 ? `<div style="color:#0284c7; font-size:11.5px;">• <b>Diện tích:</b> ${Number(p.dtich_km2).toLocaleString('vi-VN')} km²</div>` : '';
                    const pop = p.dan_so ? `<div style="color:#059669; font-size:11.5px;">• <b>Dân số:</b> ${Number(p.dan_so).toLocaleString('vi-VN')} người</div>` : '';
                    const hq = p.tru_so ? `<div style="color:#d97706; font-size:11px;">• <b>Trụ sở:</b> ${p.tru_so}</div>` : '';

                    layer.bindPopup(`
                        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; min-width:210px; padding:2px; line-height:1.5;">
                            <b style="color:#e11d48; font-size:14px;">🏛️ Tỉnh ${name}</b>
                            ${merged}${scale}${area}${pop}${hq}
                        </div>
                    `);
                }
            });
        } catch (e) {
            console.error("Lỗi nạp ranh giới 34 tỉnh:", e);
        }
    },

    toggle34Provinces() {
        if (!AppState.layer34Prov && window.VIETNAM_34_PROVINCES) {
            appMap.init34ProvincesLayer();
        }
        if (!AppState.layer34Prov) return showToast("⚠️ Dữ liệu 34 tỉnh đang được nạp, vui lòng bấm lại sau 1 giây!", true);

        const btn = document.getElementById('btnMap34Prov');
        if (AppState.is34ProvVisible) {
            AppState.leafletMap.removeLayer(AppState.layer34Prov);
            AppState.is34ProvVisible = false;
            if (btn) btn.classList.remove('active');
            showToast("Đã ẩn ranh giới 34 Tỉnh thành");
        } else {
            AppState.layer34Prov.addTo(AppState.leafletMap);
            AppState.is34ProvVisible = true;
            if (btn) btn.classList.add('active');
            showToast("✓ Đã hiển thị ranh giới 34 Tỉnh thành");
        }
    },

    initDongThapCommunesLayer() {
        if (AppState.layerDtCommunes) return;
        if (!window.DONG_THAP_COMMUNES) return;
        try {
            AppState.layerDtCommunes = L.geoJSON(window.DONG_THAP_COMMUNES, {
                style: {
                    color: "#10b981",
                    weight: 1.5,
                    opacity: 0.9,
                    fillColor: "#34d399",
                    fillOpacity: 0.12
                },
                onEachFeature: (feature, layer) => {
                    const p = feature.properties || {};
                    const name = p.ten_xa || p.Ten_Xa || p.NAME_3 || p.name || "Xã/Phường";
                    const type = p.loai || "Xã";
                    const merged = p.sap_nhap ? `<div style="color:#64748b; font-size:11px; margin-top:2px;">• <b>Sáp nhập:</b> ${p.sap_nhap}</div>` : '';
                    const area = p.dtich_km2 ? `<div style="color:#0284c7; font-size:11.5px;">• <b>Diện tích:</b> ${p.dtich_km2} km²</div>` : '';
                    const pop = p.dan_so ? `<div style="color:#059669; font-size:11.5px;">• <b>Dân số:</b> ${Number(p.dan_so).toLocaleString('vi-VN')} người</div>` : '';
                    const density = p.matdo_km2 ? `<div style="color:#64748b; font-size:11px;">• <b>Mật độ:</b> ${p.matdo_km2} người/km²</div>` : '';

                    layer.bindPopup(`
                        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; min-width:200px; padding:2px; line-height:1.5;">
                            <b style="color:#059669; font-size:14px;">🌾 ${type} ${name}</b>
                            <span style="color:#0d9488; font-size:11px; font-weight:600;">(Đồng Tháp)</span>
                            ${merged}${area}${pop}${density}
                        </div>
                    `);
                }
            });
        } catch (e) {
            console.error("Lỗi nạp ranh giới Đồng Tháp:", e);
        }
    },

    toggleDongThapCommunes() {
        if (!AppState.layerDtCommunes && window.DONG_THAP_COMMUNES) {
            appMap.initDongThapCommunesLayer();
        }
        if (!AppState.layerDtCommunes) return showToast("⚠️ Dữ liệu xã Đồng Tháp đang được nạp, vui lòng bấm lại sau 1 giây!", true);

        const btn = document.getElementById('btnMapDtCommunes');
        if (AppState.isDtCommunesVisible) {
            AppState.leafletMap.removeLayer(AppState.layerDtCommunes);
            AppState.isDtCommunesVisible = false;
            if (btn) btn.classList.remove('active');
            showToast("Đã ẩn ranh giới xã Đồng Tháp");
        } else {
            AppState.layerDtCommunes.addTo(AppState.leafletMap);
            AppState.isDtCommunesVisible = true;
            if (btn) btn.classList.add('active');
            showToast("✓ Đã hiển thị ranh giới xã Đồng Tháp");
        }
    },

    loadProjectMarkers() {
        if (!AppState.projectMarkersGroup) return;
        AppState.projectMarkersGroup.clearLayers();

        const pts = appData.getPoints(AppState.currentProject);
        if (!pts || pts.length === 0) return;

        const latLngs = [];

        pts.forEach((p, idx) => {
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

            latLngs.push([lat, lng]);

            // Ghim đánh số thứ tự 1, 2, 3...
            const iconHtml = `<div style="background:#dc2626; color:#fff; border:2px solid #fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; box-shadow:0 3px 8px rgba(0,0,0,0.5);">${idx + 1}</div>`;
            const customIcon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([lat, lng], { icon: customIcon });
            marker.bindPopup(`
                <div style="font-family:-apple-system, sans-serif; font-size:12px; line-height:1.5;">
                    <b style="color:#e11d48; font-size:13px;">📌 ${p.name}</b><br>
                    <b>X:</b> ${p.x} m<br>
                    <b>Y:</b> ${p.y} m<br>
                    <b>Lat:</b> ${p.lat}° | <b>Lng:</b> ${p.lng}°<br>
                    <b>Ghi chú:</b> ${p.note || 'Không'}<br>
                    <button onclick="appMap.loadPointDirect('${p.lat}', '${p.lng}', '${p.x}', '${p.y}')" style="margin-top:6px; background:#1565C0; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-weight:700; width:100%; cursor:pointer;">
                        📌 NẠP VÀO MÀN HÌNH CHÍNH
                    </button>
                </div>
            `);
            AppState.projectMarkersGroup.addLayer(marker);
        });

        // Nối đường line giữa các mốc
        if (latLngs.length > 1) {
            AppState.projectPolyline = L.polyline(latLngs, {
                color: '#38bdf8',
                weight: 2.5,
                dashArray: '5, 8'
            });
            AppState.projectMarkersGroup.addLayer(AppState.projectPolyline);
        }
    },

    fitProjectBounds() {
        const pts = appData.getPoints(AppState.currentProject);
        const validCoords = [];
        pts.forEach(p => {
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                validCoords.push([lat, lng]);
            }
        });

        if (validCoords.length > 0 && AppState.leafletMap) {
            AppState.leafletMap.fitBounds(validCoords, { padding: [50, 50] });
        } else if (AppState.lastGps.lat) {
            AppState.leafletMap.setView([AppState.lastGps.lat, AppState.lastGps.lng], 16);
        }
    },

    locateCurrentGps() {
        const map = AppState.leafletMap;
        if (AppState.lastGps && AppState.lastGps.lat && map) {
            map.setView([AppState.lastGps.lat, AppState.lastGps.lng], 18);
            appMap.updateLiveGps(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
            showToast("✓ Đã định vị theo GPS hiện tại!");
        } else {
            appTransform.getLiveGps();
        }
    },

    updateLiveGps(lat, lng, acc, heading) {
        const map = AppState.leafletMap;
        const fLat = parseFloat(lat);
        const fLng = parseFloat(lng);
        const fAcc = parseFloat(acc) || 0;
        const fHead = parseFloat(heading) || 0;
        if (!fLat || !fLng || isNaN(fLat) || isNaN(fLng) || fLat === 0 || fLng === 0) return;

        AppState.lastGps.lat = fLat;
        AppState.lastGps.lng = fLng;
        AppState.lastGps.accuracy = fAcc;
        AppState.lastGps.heading = fHead;

        if (!map) return;

        // 1. Tạo hoặc di chuyển Live GPS Marker (sóng radar xanh dương nhấp nháy)
        if (!AppState.liveGpsMarker) {
            AppState.liveGpsMarker = L.marker([fLat, fLng], {
                icon: createLiveGpsIcon(fHead),
                zIndexOffset: 1500,
                interactive: false
            }).addTo(map);
        } else {
            AppState.liveGpsMarker.setLatLng([fLat, fLng]);
            AppState.liveGpsMarker.setIcon(createLiveGpsIcon(fHead));
            if (!map.hasLayer(AppState.liveGpsMarker)) AppState.liveGpsMarker.addTo(map);
        }

        // 2. Tạo hoặc di chuyển vòng tròn sai số (Accuracy Circle)
        if (fAcc > 0 && fAcc < 300) {
            if (!AppState.liveGpsAccuracyCircle) {
                AppState.liveGpsAccuracyCircle = L.circle([fLat, fLng], {
                    radius: fAcc,
                    color: '#0284c7',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.12,
                    weight: 1.5,
                    interactive: false
                }).addTo(map);
            } else {
                AppState.liveGpsAccuracyCircle.setLatLng([fLat, fLng]);
                AppState.liveGpsAccuracyCircle.setRadius(fAcc);
                if (!map.hasLayer(AppState.liveGpsAccuracyCircle)) AppState.liveGpsAccuracyCircle.addTo(map);
            }
        } else if (AppState.liveGpsAccuracyCircle && map.hasLayer(AppState.liveGpsAccuracyCircle)) {
            map.removeLayer(AppState.liveGpsAccuracyCircle);
            AppState.liveGpsAccuracyCircle = null;
        }

        // 3. Cập nhật đường kết nối và cự ly tới điểm chọn/chuyển đổi (Hiển thị đồng thời cả 2 điểm)
        appMap.updateSurveyorLineAndDistance();
    },

    updateSurveyorLineAndDistance() {
        const map = AppState.leafletMap;
        if (!map || !AppState.lastGps || !AppState.lastGps.lat) return;

        let targetLat = 0;
        let targetLng = 0;

        if (AppState.mapMode === 'converted_point' && AppState.lastConvertedPoint) {
            targetLat = parseFloat(AppState.lastConvertedPoint.lat);
            targetLng = parseFloat(AppState.lastConvertedPoint.lng);
        } else if (AppState.pickedCoord && AppState.pickedCoord.lat) {
            targetLat = parseFloat(AppState.pickedCoord.lat);
            targetLng = parseFloat(AppState.pickedCoord.lng);
        }

        if (!targetLat || !targetLng || (targetLat === AppState.lastGps.lat && targetLng === AppState.lastGps.lng)) {
            if (AppState.surveyorTargetLine && map.hasLayer(AppState.surveyorTargetLine)) {
                map.removeLayer(AppState.surveyorTargetLine);
            }
            const distRow = document.getElementById('mapSheetDistRow');
            if (distRow) distRow.style.display = 'none';
            return;
        }

        const geo = calcGeoDistanceAndAzimuth(AppState.lastGps.lat, AppState.lastGps.lng, targetLat, targetLng);
        const distStr = geo.distance < 1000 ? `${geo.distance.toFixed(1)} m` : `${(geo.distance / 1000).toFixed(2)} km`;
        const azStr = `${geo.azimuth.toFixed(1)}°`;

        // Vẽ đường nối chỉ hướng thực địa giữa vị trí đứng và mục tiêu
        const pts = [ [AppState.lastGps.lat, AppState.lastGps.lng], [targetLat, targetLng] ];
        if (!AppState.surveyorTargetLine) {
            AppState.surveyorTargetLine = L.polyline(pts, {
                color: '#2dd4bf',
                weight: 2.5,
                dashArray: '6, 8',
                opacity: 0.85
            }).addTo(map);
        } else {
            AppState.surveyorTargetLine.setLatLngs(pts);
            if (!map.hasLayer(AppState.surveyorTargetLine)) AppState.surveyorTargetLine.addTo(map);
        }

        // Cập nhật thông tin khoảng cách lên Bottom Sheet
        const distEl = document.getElementById('mapSheetDist');
        const distRow = document.getElementById('mapSheetDistRow');
        if (distEl && distRow) {
            distEl.innerHTML = `${distStr} <span style="color:#94a3b8; font-weight:500;">(Pv: ${azStr})</span>`;
            distRow.style.display = 'block';
        }
    },

    fitBothPoints() {
        const map = AppState.leafletMap;
        if (!map) return;

        let targetLat = 0;
        let targetLng = 0;

        if (AppState.mapMode === 'converted_point' && AppState.lastConvertedPoint) {
            targetLat = parseFloat(AppState.lastConvertedPoint.lat);
            targetLng = parseFloat(AppState.lastConvertedPoint.lng);
        } else if (AppState.pickedCoord && AppState.pickedCoord.lat) {
            targetLat = parseFloat(AppState.pickedCoord.lat);
            targetLng = parseFloat(AppState.pickedCoord.lng);
        }

        const hasGps = AppState.lastGps && AppState.lastGps.lat && AppState.lastGps.lat !== 0;
        const hasTarget = targetLat !== 0 && targetLng !== 0;

        if (hasGps && hasTarget) {
            const bounds = L.latLngBounds([
                [AppState.lastGps.lat, AppState.lastGps.lng],
                [targetLat, targetLng]
            ]);
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
            showToast("🎯 Hiển thị cả 2 điểm (Vị trí đứng & Điểm đích)!");
        } else if (hasGps) {
            map.setView([AppState.lastGps.lat, AppState.lastGps.lng], 18);
            showToast("🛰️ Căn giữa vị trí GPS hiện tại!");
        } else if (hasTarget) {
            map.setView([targetLat, targetLng], 18);
            showToast("📍 Căn giữa điểm chọn / chuyển đổi!");
        } else {
            showToast("⚠️ Chưa có tọa độ GPS hoặc điểm chọn!");
        }
    },

    togglePickMode() {
        AppState.mapMode = (AppState.mapMode === 'pick') ? 'view' : 'pick';
        const txt = document.getElementById('mapModeIndicator');
        if (txt) {
            txt.innerText = (AppState.mapMode === 'pick') ? "🎯 CHẾ ĐỘ CHẤM ĐIỂM" : "📍 BẢN ĐỒ DỰ ÁN";
            txt.style.color = (AppState.mapMode === 'pick') ? "#38bdf8" : "#fbbf24";
        }
        showToast((AppState.mapMode === 'pick') ? "Chạm vào bản đồ để chọn tọa độ!" : "Đã chuyển về chế độ xem mốc");
    },

    onMapClick(lat, lng) {
        // Luôn cho phép hiển thị thông tin điểm chạm
        const pt = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
        AppState.pickedCoord = {
            lat: lat,
            lng: lng,
            x: pt.X.toFixed(3),
            y: pt.Y.toFixed(3)
        };

        // Đặt marker điểm chọn với tâm ngắm quang học (Optical Crosshair kéo thả)
        if (!AppState.pickerMarker) {
            AppState.pickerMarker = L.marker([lat, lng], {
                icon: createOpticalCrosshairIcon(),
                draggable: true,
                zIndexOffset: 2000
            }).addTo(AppState.leafletMap);

            AppState.pickerMarker.on('drag', (e) => {
                const pos = e.target.getLatLng();
                appMap.onMarkerDrag(pos.lat, pos.lng);
            });
        } else {
            AppState.pickerMarker.setIcon(createOpticalCrosshairIcon());
            AppState.pickerMarker.setLatLng([lat, lng]);
            if (!AppState.leafletMap.hasLayer(AppState.pickerMarker)) {
                AppState.pickerMarker.addTo(AppState.leafletMap);
            }
        }

        // Cập nhật Bottom Sheet
        document.getElementById('mapSheetWgs').innerText = `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
        document.getElementById('mapSheetVn2k').innerText = `X: ${pt.X.toFixed(3)} | Y: ${pt.Y.toFixed(3)}`;
        document.getElementById('mapBottomSheet').style.display = 'flex';

        // Cập nhật đường kết nối và cự ly
        appMap.updateSurveyorLineAndDistance();
    },

    onMarkerDrag(lat, lng) {
        const pt = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
        AppState.pickedCoord = {
            lat: lat,
            lng: lng,
            x: pt.X.toFixed(3),
            y: pt.Y.toFixed(3)
        };
        document.getElementById('mapSheetWgs').innerText = `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
        document.getElementById('mapSheetVn2k').innerText = `X: ${pt.X.toFixed(3)} | Y: ${pt.Y.toFixed(3)}`;
        appMap.updateSurveyorLineAndDistance();
    },

    closeBottomSheet() {
        document.getElementById('mapBottomSheet').style.display = 'none';
        if (AppState.surveyorTargetLine && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.surveyorTargetLine)) {
            AppState.leafletMap.removeLayer(AppState.surveyorTargetLine);
        }
    },

    loadSelectedToMain() {
        if (!AppState.pickedCoord) return;
        appMap.loadPointDirect(
            AppState.pickedCoord.lat,
            AppState.pickedCoord.lng,
            AppState.pickedCoord.x,
            AppState.pickedCoord.y
        );
    },

    loadPointDirect(lat, lng, x, y) {
        // Nạp tọa độ vào màn hình chính nhưng TUYỆT ĐỐI KHÔNG TỰ ĐỘNG TÍNH CHUYỂN
        document.getElementById('txtWgsLat').value = formatLatLong(parseFloat(lat), AppState.formatType);
        document.getElementById('txtWgsLng').value = formatLatLong(parseFloat(lng), AppState.formatType);
        if (x && y) {
            document.getElementById('txtVn2kX').value = x;
            document.getElementById('txtVn2kY').value = y;
        }
        appNav.closeMap();
        appNav.showScreen('transform');
        showToast("📌 Đã nạp tọa độ vào màn hình chính! (Nhấn nút chuyển đổi nếu muốn tính lại)", true);
    },

    savePickedPoint() {
        if (!AppState.pickedCoord) return;
        const pts = appData.getPoints(AppState.currentProject);
        const name = prompt("Nhập tên mốc chấm trên bản đồ:", `Mốc ${pts.length + 1}`);
        if (!name) return;

        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

        const newPoint = {
            id: Date.now(),
            time: timeStr,
            name: name,
            x: AppState.pickedCoord.x,
            y: AppState.pickedCoord.y,
            lat: AppState.pickedCoord.lat.toFixed(6),
            lng: AppState.pickedCoord.lng.toFixed(6),
            mui: AppState.muiVal,
            ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`,
            note: "Chấm trên bản đồ"
        };

        appData.addPoint(AppState.currentProject, newPoint);
        appMap.loadProjectMarkers();
        appMap.closeBottomSheet();
        if (AppState.storageMode === 'auto_google' && AppState.googleScriptUrl) {
            showToast(`✓ Đã lưu mốc "${name}" và gửi Google Sheets!`, true);
        } else {
            showToast(`✓ Đã lưu mốc "${name}"!`);
        }
    },

    showConvertedPoint(lat, lng, x, y, name, ktt, k0) {
        const map = AppState.leafletMap;
        if (!map) return;

        const fLat = parseFloat(lat);
        const fLng = parseFloat(lng);
        const fX = parseFloat(x) || 0;
        const fY = parseFloat(y) || 0;
        const ptName = name || 'Điểm Chuyển Đổi';
        const fKtt = parseFloat(ktt) || AppState.kttVal;
        const fK0 = parseFloat(k0) || AppState.scaleFactor;

        AppState.mapMode = 'converted_point';
        const txt = document.getElementById('mapModeIndicator');
        if (txt) {
            txt.innerText = "🎯 ĐIỂM CHUYỂN ĐỔI: " + ptName;
            txt.style.color = "#2dd4bf";
        }

        // Tạo marker với hiệu ứng sóng radar đồng tâm (concentric-pulse-ring) và tâm ngắm quang học SVG
        const pinIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="concentric-marker-container" style="pointer-events:none;">' +
                    '<div class="concentric-pulse-ring" style="border:2.5px solid #0d9488; background:rgba(13, 148, 136, 0.25);"></div>' +
                    '<svg width="48" height="48" viewBox="0 0 48 48" style="position:absolute; top:0; left:0; filter: drop-shadow(0 0 6px rgba(0,0,0,0.6)); pointer-events:none;">' +
                        '<circle cx="24" cy="24" r="14" fill="#0f766e" stroke="#ffffff" stroke-width="2.5"/>' +
                        '<line x1="24" y1="13" x2="24" y2="35" stroke="#a7f3d0" stroke-width="2"/>' +
                        '<line x1="13" y1="24" x2="35" y2="24" stroke="#a7f3d0" stroke-width="2"/>' +
                        '<circle cx="24" cy="24" r="4.5" fill="#fde047" stroke="#ffffff" stroke-width="1.5"/>' +
                    '</svg>' +
                  '</div>',
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });

        if (!AppState.convertedMarker) {
            AppState.convertedMarker = L.marker([fLat, fLng], {
                icon: pinIcon,
                zIndexOffset: 3000
            }).addTo(map);
        } else {
            AppState.convertedMarker.setLatLng([fLat, fLng]);
            AppState.convertedMarker.setIcon(pinIcon);
            if (!map.hasLayer(AppState.convertedMarker)) {
                AppState.convertedMarker.addTo(map);
            }
        }

        AppState.convertedMarker.unbindTooltip();
        AppState.convertedMarker.bindTooltip("📍 " + ptName, {
            permanent: true,
            direction: 'top',
            className: 'point-label',
            offset: [0, -18]
        });

        const popupContent = '<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; min-width:220px; padding:2px;">' +
            '<div style="font-weight:800; color:#0f766e; font-size:14px; margin-bottom:5px; display:flex; align-items:center;">📍 ' + ptName + '</div>' +
            '<div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; font-size:12px; line-height:1.5; color:#1e293b;">' +
                '<b style="color:#2563eb;">📐 Tọa độ VN-2000 (Phẳng):</b><br/>' +
                '• X (Bắc) = <b>' + fX.toFixed(3) + ' m</b><br/>' +
                '• Y (Đông) = <b>' + fY.toFixed(3) + ' m</b><br/>' +
                '<hr style="margin:5px 0; border:0; border-top:1px solid #cbd5e1;"/>' +
                '<b style="color:#059669;">🛰️ Tọa độ WGS-84 (Vệ tinh):</b><br/>' +
                '• B (Vĩ độ) = <b>' + fLat.toFixed(7) + '°</b><br/>' +
                '• L (Kinh độ) = <b>' + fLng.toFixed(7) + '°</b><br/>' +
                '• KTT = <b>' + fKtt.toFixed(2) + '°</b> (Múi ' + (fK0 === 0.9999 ? '3°' : '6°') + ')' +
            '</div>' +
            '<button onclick="appMap.loadPointDirect(\'' + fLat + '\', \'' + fLng + '\', \'' + fX.toFixed(3) + '\', \'' + fY.toFixed(3) + '\')" style="margin-top:8px; background:#0d9488; color:#fff; border:none; border-radius:6px; padding:7px 10px; font-weight:700; width:100%; cursor:pointer;">' +
                '📌 NẠP VÀO MÀN HÌNH CHÍNH' +
            '</button>' +
        '</div>';

        AppState.convertedMarker.unbindPopup();
        AppState.convertedMarker.bindPopup(popupContent).openPopup();

        // Cập nhật Bottom Sheet thông tin
        const sheetWgs = document.getElementById('mapSheetWgs');
        const sheetVn2k = document.getElementById('mapSheetVn2k');
        if (sheetWgs) sheetWgs.innerText = `${fLat.toFixed(6)}°, ${fLng.toFixed(6)}°`;
        if (sheetVn2k) sheetVn2k.innerText = `X: ${fX.toFixed(3)} | Y: ${fY.toFixed(3)}`;
        const bottomSheet = document.getElementById('mapBottomSheet');
        if (bottomSheet) bottomSheet.style.display = 'flex';

        // Đảm bảo Live GPS Marker (chấm xanh radar) luôn hiển thị đồng thời nếu có GPS
        if (AppState.lastGps && AppState.lastGps.lat) {
            appMap.updateLiveGps(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
            // Thu phóng hiển thị đồng thời cả 2 điểm (vị trí đứng & điểm chuyển đổi)
            appMap.fitBothPoints();
        } else {
            map.setView([fLat, fLng], 18);
        }
        setTimeout(() => map.invalidateSize(), 200);
    }
};

// ================= 7. PHÂN HỆ QUẢN LÝ DỰ ÁN & SỔ ĐO (EXCEL / CSV) =================
const appData = {
    init() {
        // Khởi tạo danh sách dự án
        const rawProj = localStorage.getItem('vn2k_projects');
        if (rawProj) {
            try {
                AppState.projectsList = JSON.parse(rawProj);
            } catch (e) {}
        }
        const lastCur = localStorage.getItem('vn2k_cur_project');
        if (lastCur && AppState.projectsList.includes(lastCur)) {
            AppState.currentProject = lastCur;
        }

        // Khởi tạo cấu hình nơi lưu trữ & Google Sheets
        AppState.storageMode = localStorage.getItem('vn2k_storage_mode') || 'offline';
        AppState.googleScriptUrl = localStorage.getItem('vn2k_google_script_url') || '';
        AppState.googleSheetViewUrl = localStorage.getItem('vn2k_google_sheet_view_url') || '';
        try {
            AppState.offlineQueue = JSON.parse(localStorage.getItem('vn2k_offline_queue') || '[]');
        } catch(e) {
            AppState.offlineQueue = [];
        }

        // Lắng nghe sự kiện kết nối lại mạng để tự động xả hàng đợi mốc lên Google Sheets
        window.addEventListener('online', () => {
            console.log("Thiết bị đã kết nối mạng trở lại!");
            appData.flushOfflineQueue();
        });

        // Nếu vừa mở app mà có mạng và có mốc tồn đọng, tự động gửi
        if (navigator.onLine && AppState.offlineQueue.length > 0) {
            setTimeout(() => appData.flushOfflineQueue(), 2500);
        }

        appData.populateProjectSelect();
        appData.updateSyncUI();
    },

    populateProjectSelect() {
        const sel = document.getElementById('selProjectFiles');
        if (!sel) return;
        sel.innerHTML = '';
        AppState.projectsList.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            if (name === AppState.currentProject) opt.selected = true;
            sel.appendChild(opt);
        });
        const cntEl = document.getElementById('txtPointsCount');
        if (cntEl) cntEl.innerText = appData.getPoints(AppState.currentProject).length;
    },

    getPoints(projectName) {
        const key = `vn2k_pts_${projectName}`;
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            return [];
        }
    },

    savePoints(projectName, points) {
        const key = `vn2k_pts_${projectName}`;
        localStorage.setItem(key, JSON.stringify(points));
    },

    addPoint(projectName, point) {
        const pts = appData.getPoints(projectName);
        pts.push(point);
        appData.savePoints(projectName, pts);
        appNav.updateBanner();
        if (AppState.currentScreen === 'datamgmt') {
            appData.refreshTable();
        }
        if (AppState.storageMode === 'auto_google' && AppState.googleScriptUrl) {
            appData.syncSinglePointToGoogle(point);
        }
    },

    updateSyncUI() {
        const modeBadge = document.getElementById('syncModeStatusBadge');
        if (modeBadge) {
            if (AppState.storageMode === 'auto_google') {
                modeBadge.innerText = "☁️ Tự động đồng bộ Google Sheets khi có mạng";
                modeBadge.style.color = "#38bdf8";
            } else {
                modeBadge.innerText = "📱 Ngoại tuyến (Lưu an toàn trên thiết bị)";
                modeBadge.style.color = "#4ade80";
            }
        }

        const linkBadge = document.getElementById('syncLinkedBadge');
        if (linkBadge) {
            if (AppState.googleScriptUrl) {
                linkBadge.innerText = "🟢 Đã liên kết Google Apps Script Web App";
                linkBadge.style.color = "#4ade80";
            } else {
                linkBadge.innerText = "⚪ Chưa cấu hình Web App URL (Bấm 'Cấu hình' để kết nối)";
                linkBadge.style.color = "#94a3b8";
            }
        }

        const btnOpen = document.getElementById('btnOpenGoogleSheet');
        if (btnOpen) {
            btnOpen.style.display = AppState.googleSheetViewUrl ? 'inline-flex' : 'none';
        }

        appNav.updateBanner();
    },

    selectStorageMode(mode) {
        AppState.storageMode = mode;
        const radOffline = document.getElementById('radioModeOffline');
        const radAuto = document.getElementById('radioModeAutoGoogle');
        const cardOffline = document.getElementById('cardModeOffline');
        const cardAuto = document.getElementById('cardModeAutoGoogle');

        if (radOffline) radOffline.checked = (mode === 'offline');
        if (radAuto) radAuto.checked = (mode === 'auto_google');

        if (cardOffline) cardOffline.classList.toggle('active', mode === 'offline');
        if (cardAuto) cardAuto.classList.toggle('active', mode === 'auto_google');
    },

    saveGoogleConfig() {
        const radAuto = document.getElementById('radioModeAutoGoogle');
        AppState.storageMode = (radAuto && radAuto.checked) ? 'auto_google' : 'offline';

        const scriptUrlInput = document.getElementById('txtGoogleScriptUrl');
        AppState.googleScriptUrl = scriptUrlInput ? scriptUrlInput.value.trim() : '';

        const sheetViewInput = document.getElementById('txtGoogleSheetViewUrl');
        AppState.googleSheetViewUrl = sheetViewInput ? sheetViewInput.value.trim() : '';

        localStorage.setItem('vn2k_storage_mode', AppState.storageMode);
        localStorage.setItem('vn2k_google_script_url', AppState.googleScriptUrl);
        localStorage.setItem('vn2k_google_sheet_view_url', AppState.googleSheetViewUrl);

        appData.updateSyncUI();
        appModal.closeGoogleConfig();
        showToast("✓ Đã lưu cài đặt nơi lưu trữ & Google Sheets!");
    },

    syncToGoogleSheets() {
        if (!AppState.googleScriptUrl) {
            showToast("⚠️ Bạn chưa cài đặt link Google Apps Script URL!", true);
            appModal.openGoogleConfig();
            return;
        }

        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length === 0) {
            showToast("⚠️ Dự án hiện chưa có mốc nào để đồng bộ!", true);
            return;
        }

        const btn = document.getElementById('btnSyncGoogleSheets');
        const origText = btn ? btn.innerText : '';
        if (btn) {
            btn.innerText = "⏳ Đang gửi dữ liệu lên Google Sheets...";
            btn.disabled = true;
        }

        const payload = {
            action: 'bulk_sync',
            project: AppState.currentProject,
            points: pts
        };

        fetch(AppState.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            showToast(`✓ Đã đồng bộ thành công ${pts.length} mốc lên Google Sheets!`, true);
        }).catch(err => {
            showToast(`⚠️ Không thể gửi dữ liệu: ${err.message}`, true);
        }).finally(() => {
            if (btn) {
                btn.innerText = origText;
                btn.disabled = false;
            }
        });
    },

    syncSinglePointToGoogle(point) {
        if (AppState.storageMode !== 'auto_google' || !AppState.googleScriptUrl) return;

        // Nếu thiết bị đang ngoại tuyến hoàn toàn, đẩy vào hàng đợi tự động
        if (!navigator.onLine) {
            AppState.offlineQueue.push({ project: AppState.currentProject, point: point });
            localStorage.setItem('vn2k_offline_queue', JSON.stringify(AppState.offlineQueue));
            showToast(`📍 Đã lưu mốc vào hàng đợi (tự gửi khi có mạng)`, true);
            return;
        }

        const payload = {
            action: 'add_point',
            project: AppState.currentProject,
            point: point
        };

        fetch(AppState.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            console.log(`[Google Sync] Đã gửi mốc "${point.name}" lên Google Sheets`);
        }).catch(err => {
            console.warn(`[Google Sync] Lỗi gửi mốc ngầm, đưa vào hàng đợi:`, err);
            AppState.offlineQueue.push({ project: AppState.currentProject, point: point });
            localStorage.setItem('vn2k_offline_queue', JSON.stringify(AppState.offlineQueue));
        });
    },

    flushOfflineQueue() {
        if (!AppState.googleScriptUrl || AppState.offlineQueue.length === 0) return;
        const count = AppState.offlineQueue.length;
        console.log(`[Google Sync] Đang gửi ${count} mốc từ hàng đợi ngoại tuyến...`);

        const points = AppState.offlineQueue.map(item => item.point);
        const payload = {
            action: 'bulk_sync',
            project: AppState.currentProject,
            points: points
        };

        fetch(AppState.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            AppState.offlineQueue = [];
            localStorage.removeItem('vn2k_offline_queue');
            showToast(`✓ Đã tự động gửi ${count} mốc tồn đọng lên Google Sheets!`, true);
        }).catch(err => {
            console.warn(`[Google Sync] Thử lại sau do lỗi:`, err);
        });
    },

    openConnectedGoogleSheet() {
        if (AppState.googleSheetViewUrl) {
            window.open(AppState.googleSheetViewUrl, '_blank');
        } else {
            showToast("⚠️ Chưa có link xem Google Sheet!", true);
        }
    },

    testGoogleConnection() {
        const urlInput = document.getElementById('txtGoogleScriptUrl');
        const url = urlInput ? urlInput.value.trim() : '';

        if (!url) {
            showToast("⚠️ Vui lòng dán link Google Apps Script URL trước!", true);
            return;
        }

        if (!url.startsWith("https://script.google.com/macros/s/")) {
            showToast("⚠️ Link phải có dạng https://script.google.com/macros/s/.../exec", true);
            return;
        }

        showToast("⏳ Đang thử nghiệm kết nối tới Google...");

        const now = new Date();
        const testPayload = {
            action: 'test_connection',
            project: 'Test_Connection',
            point: {
                time: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
                name: "Kiem_Tra_Ket_Noi",
                x: "1144058.623",
                y: "539624.574",
                lat: "10.345211",
                lng: "106.113617",
                mui: AppState.muiVal,
                ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`,
                note: "Thử nghiệm kết nối từ PWA"
            }
        };

        fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
        }).then(() => {
            showToast("✅ Kết nối Google Apps Script thành công! (Dòng thử nghiệm đã được ghi vào Sheet)", true);
        }).catch(err => {
            showToast(`❌ Thất bại: ${err.message}`, true);
        });
    },

    copyAppsScriptTemplate() {
        const scriptCode = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT ĐỒNG BỘ SỔ ĐO TỌA ĐỘ TRẮC ĐỊA VN-2000 & WGS-84 PRO
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com)
 * =========================================================================
 * Tính năng tự động hóa:
 * - Tự động tạo Tab (Sheet) riêng theo tên từng Dự Án
 * - Tự động tạo công thức Google Maps vệ tinh cho từng mốc
 * - Tự động định dạng số liệu trắc địa chuẩn (X, Y: 3 số lẻ; Lat, Lng: 6 số lẻ)
 * - Chống ghi trùng lặp mốc khi đồng bộ nhiều lần
 * - Khóa an toàn LockService chống xung đột dữ liệu
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận ghi dữ liệu, vui lòng thử lại sau vài giây."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var rawProject = data.project || "So_Do_Mac_Dinh";
    var projectName = rawProject.replace(/[:\\\\/?*\\[\\]]/g, "_").replace(/\\.csv$/i, "");
    
    // 1. Tự động tìm hoặc tạo Tab (Sheet) theo tên dự án
    var sheet = ss.getSheetByName(projectName);
    if (!sheet) {
      sheet = ss.insertSheet(projectName);
    }
    
    // 2. Khởi tạo dòng tiêu đề chuẩn nếu Tab còn trống
    if (sheet.getLastRow() === 0) {
      initSheetHeader(sheet);
    }

    var addedCount = 0;
    
    // 3. Xử lý đồng bộ nhiều mốc cùng lúc (Bulk Sync)
    if (Array.isArray(data.points) && data.points.length > 0) {
      var existingKeys = getExistingKeys(sheet);
      var rowsToAdd = [];

      data.points.forEach(function(p) {
        var key = (p.name || "") + "_" + (p.time || "") + "_" + (p.x || "");
        if (!existingKeys[key]) {
          rowsToAdd.push(formatPointRow(p, projectName));
          existingKeys[key] = true;
          addedCount++;
        }
      });

      if (rowsToAdd.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        var range = sheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length);
        range.setValues(rowsToAdd);
        formatDataRange(sheet, startRow, rowsToAdd.length);
      }
    } 
    // 4. Xử lý lưu mốc lẻ theo thời gian thực (Real-time Single Point)
    else if (data.point) {
      var p = data.point;
      var existingKeys = getExistingKeys(sheet);
      var key = (p.name || "") + "_" + (p.time || "") + "_" + (p.x || "");
      
      if (!existingKeys[key]) {
        var rowData = formatPointRow(p, projectName);
        sheet.appendRow(rowData);
        var lastRow = sheet.getLastRow();
        formatDataRange(sheet, lastRow, 1);
        addedCount = 1;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      added: addedCount,
      project: projectName
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Khởi tạo dòng tiêu đề sang trọng & đóng băng hàng 1
function initSheetHeader(sheet) {
  var headers = [
    "Thời Gian Đo", "Tên Điểm Mốc", "Tọa Độ X (Bắc - m)", "Tọa Độ Y (Đông - m)",
    "Vĩ Độ (Lat - °)", "Kinh Độ (Long - °)", "Múi Chiếu", "Kinh Tuyến Trục",
    "Ghi Chú Hiện Trường", "Dự Án", "Vị Trí Google Maps"
  ];
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setBackground("#0f172a")
             .setFontColor("#38bdf8")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
}

// Định dạng dữ liệu một dòng kèm công thức xem Google Maps chuẩn dấu chấm phẩy (;)
function formatPointRow(p, projectName) {
  var lat = parseFloat(p.lat) || 0;
  var lng = parseFloat(p.lng) || 0;
  var mapFormula = (lat !== 0 && lng !== 0) 
    ? '=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")'
    : "";

  return [
    p.time || new Date(),
    p.name || "Mốc",
    parseFloat(p.x) || p.x || 0,
    parseFloat(p.y) || p.y || 0,
    parseFloat(p.lat) || p.lat || 0,
    parseFloat(p.lng) || p.lng || 0,
    p.mui ? ("Múi " + p.mui + "°") : "Múi 3°",
    p.ktt || "",
    p.note || "",
    projectName,
    mapFormula
  ];
}

// Định dạng số liệu trắc địa & áp dụng setFormulasLocal đảm bảo 100% công thức không bao giờ bị lỗi #ERROR!
function formatDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 3, numRows, 2).setNumberFormat("#,##0.000");
    sheet.getRange(startRow, 5, numRows, 2).setNumberFormat("0.000000");
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
    sheet.getRange(startRow, 11, numRows, 1).setHorizontalAlignment("center");

    // Đảm bảo công thức Hyperlink tiếng Việt chuẩn dấu chấm phẩy (;) hiển thị chuẩn xác
    var latLngValues = sheet.getRange(startRow, 5, numRows, 2).getValues();
    var formulas = [];
    for (var i = 0; i < latLngValues.length; i++) {
      var lat = parseFloat(latLngValues[i][0]) || 0;
      var lng = parseFloat(latLngValues[i][1]) || 0;
      if (lat !== 0 && lng !== 0) {
        formulas.push(['=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")']);
      } else {
        formulas.push([""]);
      }
    }
    var mapRange = sheet.getRange(startRow, 11, numRows, 1);
    try {
      mapRange.setFormulasLocal(formulas);
    } catch (e) {
      mapRange.setValues(formulas);
    }
  } catch(e) {}
}

// Hàm hỗ trợ tự động sửa nhanh toàn bộ các dòng cũ đang bị lỗi #ERROR! trong Sheet
function suaLoiLienKetCu() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var totalFixed = 0;

  sheets.forEach(function(sh) {
    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var numRows = lastRow - 1;
      var latLngValues = sh.getRange(2, 5, numRows, 2).getValues();
      var formulas = [];
      for (var r = 0; r < latLngValues.length; r++) {
        var lat = parseFloat(latLngValues[r][0]) || 0;
        var lng = parseFloat(latLngValues[r][1]) || 0;
        if (lat !== 0 && lng !== 0) {
          formulas.push(['=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")']);
          totalFixed++;
        } else {
          formulas.push([""]);
        }
      }
      var targetRange = sh.getRange(2, 11, formulas.length, 1);
      try {
        targetRange.setFormulasLocal(formulas);
      } catch(err) {
        targetRange.setValues(formulas);
      }
    }
  });

  return "Đã sửa thành công " + totalFixed + " mốc bằng công thức: =HYPERLINK(\"...; \"🗺️ Xem Vị Trí\") chuẩn dấu chấm phẩy (;)!";
}

// Lấy danh sách khóa mốc đã có để chống trùng lặp
function getExistingKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return keys;
  var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  for (var i = 0; i < data.length; i++) {
    var time = data[i][0];
    var name = data[i][1];
    var x = data[i][2];
    keys[name + "_" + time + "_" + x] = true;
  }
  return keys;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Google Apps Script VN-2000 Pro sẵn sàng hoạt động!"
  })).setMimeType(ContentService.MimeType.JSON);
}`;
        copyToClipboard(scriptCode);
        showToast("📋 Đã sao chép mã Apps Script Pro! Mở Tiện ích mở rộng > Apps Script trên Google Sheet để dán.", true);
    },

    onProjectSelectChange() {
        const sel = document.getElementById('selProjectFiles');
        AppState.currentProject = sel.value;
        localStorage.setItem('vn2k_cur_project', AppState.currentProject);
        appNav.updateBanner();
        appData.refreshTable();
        showToast(`Đã chuyển sang dự án: ${AppState.currentProject}`);
    },

    createNewProject() {
        let name = prompt("Nhập tên file dự án mới (.csv):", `DuAn_${Date.now().toString().slice(-4)}.csv`);
        if (!name) return;
        if (!name.toLowerCase().endsWith('.csv')) name += '.csv';

        if (!AppState.projectsList.includes(name)) {
            AppState.projectsList.push(name);
            localStorage.setItem('vn2k_projects', JSON.stringify(AppState.projectsList));
        }
        AppState.currentProject = name;
        localStorage.setItem('vn2k_cur_project', name);
        appData.populateProjectSelect();
        appNav.updateBanner();
        appData.refreshTable();
        showToast(`✓ Đã tạo file dự án mới: ${name}`);
    },

    renameCurrentProject() {
        const cur = AppState.currentProject;
        let newName = prompt("Nhập tên mới cho file dự án:", cur);
        if (!newName || newName === cur) return;
        if (!newName.toLowerCase().endsWith('.csv')) newName += '.csv';

        const pts = appData.getPoints(cur);
        appData.savePoints(newName, pts);
        localStorage.removeItem(`vn2k_pts_${cur}`);

        const idx = AppState.projectsList.indexOf(cur);
        if (idx !== -1) AppState.projectsList[idx] = newName;
        localStorage.setItem('vn2k_projects', JSON.stringify(AppState.projectsList));

        AppState.currentProject = newName;
        localStorage.setItem('vn2k_cur_project', newName);

        appData.populateProjectSelect();
        appNav.updateBanner();
        showToast(`✓ Đã đổi tên thành: ${newName}`);
    },

    deleteCurrentProject() {
        if (AppState.projectsList.length <= 1) {
            showToast("⚠️ Không thể xóa file dự án duy nhất còn lại!", true);
            return;
        }
        if (!confirm(`Bạn có chắc chắn muốn xóa toàn bộ file "${AppState.currentProject}" không?`)) return;

        const cur = AppState.currentProject;
        localStorage.removeItem(`vn2k_pts_${cur}`);
        AppState.projectsList = AppState.projectsList.filter(p => p !== cur);
        localStorage.setItem('vn2k_projects', JSON.stringify(AppState.projectsList));

        AppState.currentProject = AppState.projectsList[0];
        localStorage.setItem('vn2k_cur_project', AppState.currentProject);

        appData.populateProjectSelect();
        appNav.updateBanner();
        appData.refreshTable();
        showToast("✓ Đã xóa file dự án!");
    },

    refreshTable() {
        const tbody = document.getElementById('tbodyPointsList');
        if (!tbody) return;
        tbody.innerHTML = '';

        const pts = appData.getPoints(AppState.currentProject);
        document.getElementById('txtPointsCount').innerText = pts.length;

        if (pts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:16px; color:#94a3b8;">Chưa có mốc đo nào trong dự án này.</td></tr>`;
            return;
        }

        pts.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><b style="color:#fbbf24;">${p.name}</b></td>
                <td>${p.x}</td>
                <td>${p.y}</td>
                <td>${p.lat}</td>
                <td>${p.lng}</td>
                <td>${p.note || ''}</td>
                <td>
                    <button class="btn-sm btn-blue" style="height:26px; padding:2px 6px; font-size:11px; display:inline-flex;" onclick="appMap.loadPointDirect('${p.lat}', '${p.lng}', '${p.x}', '${p.y}')">📌 Nạp</button>
                    <button class="btn-sm btn-red" style="height:26px; padding:2px 6px; font-size:11px; display:inline-flex;" onclick="appData.deletePoint(${p.id})">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    deletePoint(id) {
        if (!confirm("Xóa mốc đo này?")) return;
        let pts = appData.getPoints(AppState.currentProject);
        pts = pts.filter(p => p.id !== id);
        appData.savePoints(AppState.currentProject, pts);
        appNav.updateBanner();
        appData.refreshTable();
        showToast("✓ Đã xóa mốc!");
    },

    // Xuất file CSV chuẩn UTF-8 BOM hiển thị tiếng Việt sắc nét trên Excel
    exportCsvFile() {
        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length === 0) {
            showToast("⚠️ Dự án hiện chưa có mốc nào để xuất file!", true);
            return;
        }

        // Cấu trúc dữ liệu CSV 9 cột chuẩn
        const headers = ["Thời Gian", "Tên Điểm", "Tọa Độ Ngang X", "Tọa Độ Đứng Y", "Vĩ Độ (Lat)", "Kinh Độ (Long)", "Múi Chiếu", "Kinh Tuyến Trục", "Ghi Chú"];
        const rows = [headers.join(",")];

        pts.forEach(p => {
            const row = [
                `"${p.time || ''}"`,
                `"${p.name || ''}"`,
                `"${p.x || ''}"`,
                `"${p.y || ''}"`,
                `"${p.lat || ''}"`,
                `"${p.lng || ''}"`,
                `"${p.mui || ''}"`,
                `"${p.ktt || ''}"`,
                `"${(p.note || '').replace(/"/g, '""')}"`
            ];
            rows.push(row.join(","));
        });

        // Gắn UTF-8 BOM (\uFEFF)
        const csvContent = "\uFEFF" + rows.join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", AppState.currentProject);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`✓ Đã tải file: ${AppState.currentProject}`);
    },

    shareCsvFile() {
        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length === 0) return showToast("⚠️ Dự án chưa có mốc nào!", true);

        const headers = ["Thời Gian", "Tên Điểm", "Tọa Độ Ngang X", "Tọa Độ Đứng Y", "Vĩ Độ (Lat)", "Kinh Độ (Long)", "Múi Chiếu", "Kinh Tuyến Trục", "Ghi Chú"];
        const rows = [headers.join(",")];
        pts.forEach(p => {
            rows.push([
                `"${p.time || ''}"`,
                `"${p.name || ''}"`,
                `"${p.x || ''}"`,
                `"${p.y || ''}"`,
                `"${p.lat || ''}"`,
                `"${p.lng || ''}"`,
                `"${p.mui || ''}"`,
                `"${p.ktt || ''}"`,
                `"${(p.note || '').replace(/"/g, '""')}"`
            ].join(","));
        });

        const csvContent = "\uFEFF" + rows.join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const file = new File([blob], AppState.currentProject, { type: "text/csv" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
                title: AppState.currentProject,
                text: `Sổ đo tọa độ VN-2000 & WGS-84 (${pts.length} mốc)`,
                files: [file]
            }).catch(() => appData.exportCsvFile());
        } else {
            appData.exportCsvFile();
        }
    }
};

// ================= 8. PHÂN HỆ BÀI TOÁN TRẮC ĐỊA (GEODESY CALCULATIONS) =================
const appGeodesy = {
    initDropdowns() {
        const pts = appData.getPoints(AppState.currentProject);
        const selA = document.getElementById('selGeoPointA');
        const selB = document.getElementById('selGeoPointB');
        if (!selA || !selB) return;

        selA.innerHTML = '<option value="">-- Chọn mốc từ sổ đo --</option>';
        selB.innerHTML = '<option value="">-- Chọn mốc từ sổ đo --</option>';

        pts.forEach((p, idx) => {
            const optA = document.createElement('option');
            optA.value = idx;
            optA.innerText = `${p.name} (X:${p.x}, Y:${p.y})`;
            selA.appendChild(optA);

            const optB = document.createElement('option');
            optB.value = idx;
            optB.innerText = `${p.name} (X:${p.x}, Y:${p.y})`;
            selB.appendChild(optB);
        });

        appGeodesy.renderBoundaryList();
    },

    onSelectPointA() {
        const idx = document.getElementById('selGeoPointA').value;
        if (idx !== '') {
            const pts = appData.getPoints(AppState.currentProject);
            const p = pts[parseInt(idx, 10)];
            if (p) {
                document.getElementById('txtGeoXa').value = p.x;
                document.getElementById('txtGeoYa').value = p.y;
            }
        }
    },

    onSelectPointB() {
        const idx = document.getElementById('selGeoPointB').value;
        if (idx !== '') {
            const pts = appData.getPoints(AppState.currentProject);
            const p = pts[parseInt(idx, 10)];
            if (p) {
                document.getElementById('txtGeoXb').value = p.x;
                document.getElementById('txtGeoYb').value = p.y;
            }
        }
    },

    calcDistAzimuth() {
        const strXa = document.getElementById('txtGeoXa').value.trim();
        const strYa = document.getElementById('txtGeoYa').value.trim();
        const strXb = document.getElementById('txtGeoXb').value.trim();
        const strYb = document.getElementById('txtGeoYb').value.trim();

        if (!strXa || !strYa || !strXb || !strYb) {
            showToast("⚠️ Vui lòng nhập hoặc chọn đủ tọa độ Mốc A và Mốc B!", true);
            return;
        }

        const xa = parseCoordinateNumber(strXa);
        const ya = parseCoordinateNumber(strYa);
        const xb = parseCoordinateNumber(strXb);
        const yb = parseCoordinateNumber(strYb);

        if (xa === xb && ya === yb) {
            showToast("⚠️ Mốc A và Mốc B trùng tọa độ (Cự ly S = 0 m)!", true);
            return;
        }

        const res = calculateDistanceAndAzimuth(xa, ya, xb, yb);

        const box = document.getElementById('boxGeoResult');
        const content = document.getElementById('resDistAzimuthContent');

        content.innerHTML = `
            <div>📏 <b>Cự ly ngang:</b> <span style="color:#38bdf8; font-weight:800; font-size:15px;">S = ${res.dist.toFixed(3)} m</span></div>
            <div>🧭 <b>Góc phương vị:</b> <span style="color:#fbbf24; font-weight:800;">α = ${res.dDeg}° ${res.dMin}' ${res.dSec.toFixed(1)}"</span> (${res.azimuthDeg.toFixed(4)}°)</div>
            <div style="color:#a78bfa;">🧭 ${res.quarter}</div>
            <div style="color:#94a3b8; font-size:11.5px; margin-top:4px;">📐 ΔX = ${res.dX.toFixed(3)} m  |  ΔY = ${res.dY.toFixed(3)} m</div>
        `;

        box.style.display = 'block';
        showToast("✓ Đã tính xong cự ly & góc phương vị!");
    },

    copyResult() {
        const text = document.getElementById('resDistAzimuthContent').innerText;
        copyToClipboard(text);
    },

    addCurrentPointToBoundary() {
        const strXa = document.getElementById('txtGeoXa').value.trim();
        const strYa = document.getElementById('txtGeoYa').value.trim();
        if (!strXa || !strYa) return showToast("⚠️ Chưa có tọa độ mốc A!");

        const x = parseCoordinateNumber(strXa);
        const y = parseCoordinateNumber(strYa);
        AppState.boundaryPoints.push({
            name: `Đỉnh ${AppState.boundaryPoints.length + 1}`,
            X: x,
            Y: y
        });
        appGeodesy.renderBoundaryList();
        showToast("✓ Đã thêm 1 đỉnh vào đa giác");
    },

    loadAllProjectPointsToBoundary() {
        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length < 3) return showToast("⚠️ Cần ít nhất 3 mốc để tạo thành đa giác thửa đất!", true);

        AppState.boundaryPoints = pts.map(p => ({
            name: p.name,
            X: parseCoordinateNumber(p.x),
            Y: parseCoordinateNumber(p.y)
        }));

        appGeodesy.renderBoundaryList();
        showToast(`✓ Đã nạp ${AppState.boundaryPoints.length} mốc của dự án!`);
    },

    clearBoundary() {
        AppState.boundaryPoints = [];
        appGeodesy.renderBoundaryList();
        document.getElementById('boxAreaResult').style.display = 'none';
    },

    renderBoundaryList() {
        const c = document.getElementById('boundaryPointsListContainer');
        if (!c) return;
        if (AppState.boundaryPoints.length === 0) {
            c.innerText = "Chưa có đỉnh nào được chọn.";
            return;
        }
        c.innerHTML = AppState.boundaryPoints.map((p, i) => `${i + 1}. <b>${p.name}</b> (X: ${p.X.toFixed(2)}, Y: ${p.Y.toFixed(2)})`).join("<br>");
    },

    calcArea() {
        if (AppState.boundaryPoints.length < 3) {
            showToast("⚠️ Cần ít nhất 3 đỉnh khép kín để tính diện tích!", true);
            return;
        }

        const res = calculatePolygonAreaAndPerimeter(AppState.boundaryPoints);
        const box = document.getElementById('boxAreaResult');
        const content = document.getElementById('resAreaContent');

        const ha = res.area / 10000.0;

        content.innerHTML = `
            <div>📐 <b>Diện tích thửa đất:</b> <span style="color:#fbbf24; font-weight:800; font-size:16px;">S = ${res.area.toFixed(2)} m²</span></div>
            <div>🌾 <b>Quy đổi héc-ta:</b> <span style="color:#4ade80; font-weight:800;">${ha.toFixed(4)} ha</span></div>
            <div>📏 <b>Chu vi ranh đất:</b> <span style="color:#38bdf8; font-weight:800;">P = ${res.perimeter.toFixed(2)} m</span></div>
            <div style="color:#94a3b8; font-size:11.5px; margin-top:4px;">Tổng số đỉnh đa giác khép kín: ${AppState.boundaryPoints.length} đỉnh</div>
        `;

        box.style.display = 'block';
        showToast("✓ Đã tính xong diện tích & chu vi!");
    }
};

// ================= 9. MODAL CÀI ĐẶT KTT (SETTINGS MODAL) =================
const appModal = {
    openSettings() {
        const m = document.getElementById('modalSettings');
        if (!m) return;
        m.classList.add('active');

        // Nạp danh sách 63 tỉnh
        const sel = document.getElementById('modalProvinceSelect');
        sel.innerHTML = '<option value="-1">--- Tự nhập kinh tuyến trục ---</option>';
        VN_PROVINCES.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `${p.name} (${p.deg}°${String(p.min).padStart(2,'0')}')`;
            if (idx === AppState.provinceIndex) opt.selected = true;
            sel.appendChild(opt);
        });

        document.getElementById('txtModalDeg').value = AppState.kttDeg;
        document.getElementById('txtModalMin').value = AppState.kttMin;
        appModal.setMui(AppState.muiVal);
    },

    closeSettings() {
        const m = document.getElementById('modalSettings');
        if (m) m.classList.remove('active');
    },

    setMui(mui) {
        document.getElementById('modalBtnMui3').classList.toggle('active', mui === 3);
        document.getElementById('modalBtnMui6').classList.toggle('active', mui === 6);
        AppState.muiVal = mui;
        AppState.scaleFactor = (mui === 3) ? 0.9999 : 0.9996;
    },

    onProvinceChange() {
        const idx = parseInt(document.getElementById('modalProvinceSelect').value, 10);
        if (idx >= 0 && idx < VN_PROVINCES.length) {
            const p = VN_PROVINCES[idx];
            document.getElementById('txtModalDeg').value = p.deg;
            document.getElementById('txtModalMin').value = p.min;
        }
    },

    saveSettings() {
        const selIdx = parseInt(document.getElementById('modalProvinceSelect').value, 10);
        const d = parseInt(document.getElementById('txtModalDeg').value, 10);
        const m = parseInt(document.getElementById('txtModalMin').value, 10);

        if (isNaN(d) || isNaN(m)) {
            showToast("⚠️ Vui lòng nhập độ và phút hợp lệ!", true);
            return;
        }

        AppState.kttDeg = d;
        AppState.kttMin = m;
        AppState.kttVal = d + (m / 60.0);

        if (selIdx >= 0 && selIdx < VN_PROVINCES.length) {
            AppState.provinceIndex = selIdx;
            AppState.provinceName = VN_PROVINCES[selIdx].name;
            const tfSel = document.getElementById('tfSelectProvince');
            if (tfSel) tfSel.value = selIdx;
        } else {
            AppState.provinceIndex = -1;
            AppState.provinceName = "KTT Tùy chỉnh";
            const tfSel = document.getElementById('tfSelectProvince');
            if (tfSel) tfSel.value = -1;
        }

        document.getElementById('btnMui3').classList.toggle('active', AppState.muiVal === 3);
        document.getElementById('btnMui6').classList.toggle('active', AppState.muiVal === 6);

        appNav.updateBanner();
        appModal.closeSettings();
        showToast(`✓ Đã lưu KTT: ${AppState.provinceName} (${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`);
    },

    openGoogleConfig() {
        const m = document.getElementById('modalGoogleConfig');
        if (!m) return;
        m.classList.add('active');

        appData.selectStorageMode(AppState.storageMode || 'offline');
        const scriptUrlInput = document.getElementById('txtGoogleScriptUrl');
        if (scriptUrlInput) scriptUrlInput.value = AppState.googleScriptUrl || '';

        const sheetViewInput = document.getElementById('txtGoogleSheetViewUrl');
        if (sheetViewInput) sheetViewInput.value = AppState.googleSheetViewUrl || '';
    },

    closeGoogleConfig() {
        const m = document.getElementById('modalGoogleConfig');
        if (m) m.classList.remove('active');
    },

    openGoogleGuide() {
        const m = document.getElementById('modalGoogleGuide');
        if (m) m.classList.add('active');
    },

    closeGoogleGuide() {
        const m = document.getElementById('modalGoogleGuide');
        if (m) m.classList.remove('active');
    }
};

// ================= 10. KHỞI TẠO ỨNG DỤNG (APP BOOTSTRAP) =================
window.addEventListener('DOMContentLoaded', () => {
    appTransform.init();
    appData.init();
    appGps.init();
    appNav.updateBanner();
});
