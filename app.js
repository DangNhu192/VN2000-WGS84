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
    
    // UI & Navigation Tree State
    isTreeDrawerOpen: false,
    mainMenuViewMode: (typeof localStorage !== 'undefined' && localStorage.getItem('vn2000_main_menu_view')) ? localStorage.getItem('vn2000_main_menu_view') : 'big_tiles',

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
    projectDistanceLabelsGroup: null,
    projectPolygonLayer: null,
    showProjectDistance: false,
    isPolygonClosed: false,
    measureStartPoint: null,
    measureActiveLine: null,
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

// ================= 1b. LƯU CÀI ĐẶT BỀN VỮNG TRÊN THIẾT BỊ =================
// Ghi nhớ thông số người dùng (KTT, múi, định dạng, bản đồ, GPS, Snap CAD) giữa các lần mở app.
const appSettings = {
    KEY: 'vn2k_app_settings_v1',
    _timer: null,

    load() {
        let s;
        try { s = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { s = null; }
        if (!s || typeof s !== 'object') return;

        const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;
        const bool = (v) => (typeof v === 'boolean') ? v : null;

        if (num(s.kttDeg) !== null && num(s.kttMin) !== null) {
            AppState.kttDeg = s.kttDeg;
            AppState.kttMin = s.kttMin;
            AppState.kttVal = s.kttDeg + s.kttMin / 60.0;
        }
        if (num(s.provinceIndex) !== null) AppState.provinceIndex = s.provinceIndex;
        if (typeof s.provinceName === 'string' && s.provinceName) AppState.provinceName = s.provinceName;
        if (s.muiVal === 3 || s.muiVal === 6) {
            AppState.muiVal = s.muiVal;
            AppState.scaleFactor = (s.muiVal === 3) ? 0.9999 : 0.9996;
        }
        if ([0, 1, 2].includes(s.formatType)) AppState.formatType = s.formatType;
        if (s.activeBaseLayerId === 'google_hybrid' || s.activeBaseLayerId === 'osm_streets') AppState.activeBaseLayerId = s.activeBaseLayerId;
        if (bool(s.is34ProvVisible) !== null) AppState.is34ProvVisible = s.is34ProvVisible;
        if (bool(s.isDtCommunesVisible) !== null) AppState.isDtCommunesVisible = s.isDtCommunesVisible;
        if (bool(s.showProjectDistance) !== null) AppState.showProjectDistance = s.showProjectDistance;
        if (bool(s.isGpsTracking) !== null) AppState.isGpsTracking = s.isGpsTracking;
        if (s.mapView && num(s.mapView.lat) !== null && num(s.mapView.lng) !== null && num(s.mapView.zoom) !== null) {
            AppState.savedMapView = s.mapView;
        }
        if (bool(s.cadSnapEnabled) !== null) AppState.savedCadSnap = s.cadSnapEnabled;
        if (bool(s.cadSnapLineEnabled) !== null) AppState.savedCadSnapLine = s.cadSnapLineEnabled;
    },

    snapshot() {
        const map = AppState.leafletMap;
        let mapView = AppState.savedMapView || null;
        if (map) {
            const ctr = map.getCenter();
            mapView = { lat: ctr.lat, lng: ctr.lng, zoom: map.getZoom() };
            AppState.savedMapView = mapView;
        }
        return {
            provinceIndex: AppState.provinceIndex,
            provinceName: AppState.provinceName,
            kttDeg: AppState.kttDeg,
            kttMin: AppState.kttMin,
            muiVal: AppState.muiVal,
            formatType: AppState.formatType,
            activeBaseLayerId: AppState.activeBaseLayerId,
            is34ProvVisible: AppState.is34ProvVisible,
            isDtCommunesVisible: AppState.isDtCommunesVisible,
            showProjectDistance: AppState.showProjectDistance,
            isGpsTracking: AppState.isGpsTracking,
            mapView,
            cadSnapEnabled: (typeof appCadTool !== 'undefined') ? appCadTool.snapEnabled !== false : AppState.savedCadSnap,
            cadSnapLineEnabled: (typeof appCadTool !== 'undefined') ? appCadTool.snapLineEnabled !== false : (AppState.savedCadSnapLine !== false),
            updated: Date.now()
        };
    },

    saveNow() {
        clearTimeout(this._timer);
        this._timer = null;
        try { localStorage.setItem(this.KEY, JSON.stringify(this.snapshot())); } catch (e) { console.warn('Lưu cài đặt thất bại:', e); }
    },

    // Gộp nhiều thay đổi liên tiếp (vd: kéo/zoom bản đồ) thành 1 lần ghi
    save() {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.saveNow(), 400);
    },

    // Đồng bộ các control giao diện theo cài đặt đã nạp
    applyToUi() {
        const tfSel = document.getElementById('tfSelectProvince');
        if (tfSel) tfSel.value = String(AppState.provinceIndex);
        const b3 = document.getElementById('btnMui3');
        const b6 = document.getElementById('btnMui6');
        if (b3) b3.classList.toggle('active', AppState.muiVal === 3);
        if (b6) b6.classList.toggle('active', AppState.muiVal === 6);
        const fmt = document.getElementById('selFormatWgs');
        if (fmt) fmt.value = String(AppState.formatType);
        const dBtn = document.getElementById('btnToggleDistance');
        const dTxt = document.getElementById('txtDistToggle');
        if (dBtn) dBtn.classList.toggle('active', AppState.showProjectDistance);
        if (dTxt) dTxt.innerText = AppState.showProjectDistance ? "Khoảng cách" : "Ẩn cự ly";
        if (typeof appCadTool !== 'undefined') {
            if (typeof AppState.savedCadSnap === 'boolean') {
                appCadTool.snapEnabled = AppState.savedCadSnap;
                const sBtn = document.getElementById('btnCadSnap');
                if (sBtn) {
                    sBtn.classList.toggle('active', appCadTool.snapEnabled);
                    sBtn.innerHTML = appCadTool.snapEnabled ? "🧲 Snap: BẬT [S]" : "🧲 Snap: TẮT [S]";
                }
            }
            if (typeof AppState.savedCadSnapLine === 'boolean') {
                appCadTool.snapLineEnabled = AppState.savedCadSnapLine;
            }
            if (appCadTool.updateSnapLineUi) {
                appCadTool.updateSnapLineUi();
            }
        }
    },

    // Áp dụng lớp nền, lớp ranh giới và khung nhìn đã lưu ngay sau khi bản đồ khởi tạo
    applyToMap(map) {
        if (!map) return;
        const v = AppState.savedMapView;
        if (v) map.setView([v.lat, v.lng], v.zoom);

        const wantBase = AppState.activeBaseLayerId;
        if (wantBase === 'osm_streets' && AppState.baseLayers['osm_streets']) {
            map.removeLayer(AppState.baseLayers['google_hybrid']);
            AppState.baseLayers['osm_streets'].addTo(map);
        }

        if (AppState.is34ProvVisible && AppState.layer34Prov) {
            AppState.layer34Prov.addTo(map);
            document.getElementById('btnMap34Prov')?.classList.add('active');
        } else {
            AppState.is34ProvVisible = false;
        }
        if (AppState.isDtCommunesVisible && AppState.layerDtCommunes) {
            AppState.layerDtCommunes.addTo(map);
            document.getElementById('btnMapDtCommunes')?.classList.add('active');
        } else {
            AppState.isDtCommunesVisible = false;
        }

        map.on('moveend zoomend', () => this.save());
    }
};
appSettings.load();

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

// ================= HAPTIC FEEDBACK (CHUẨN UI/UX PRO MAX - PHẢN HỒI RUNG THỰC ĐỊA) =================
function triggerHaptic(type = 'light') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            if (type === 'light') navigator.vibrate(10);
            else if (type === 'medium') navigator.vibrate(22);
            else if (type === 'success') navigator.vibrate([15, 30, 20]);
            else if (type === 'warning') navigator.vibrate([30, 50, 30]);
        } catch (e) {}
    }
}

// ================= 3. ĐIỀU HƯỚNG MÀN HÌNH (NAVIGATION) =================
const appNav = window.appNav = {
    showScreen(screenName) {
        triggerHaptic('light');
        if (AppState.isTreeDrawerOpen) {
            appNav.closeTreeMenu();
        }
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = screenName;

        // Ẩn tất cả screens và container bản đồ một cách đồng bộ
        document.querySelectorAll('.screen-view').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const mapView = document.getElementById('map-view-container');
        if (mapView) {
            mapView.classList.remove('active');
            mapView.style.display = 'none';
        }
        if (typeof appCadTool !== 'undefined' && appCadTool.isActive) {
            appCadTool.closeToolbar();
        }

        const btnBack = document.getElementById('btnHeaderBack');
        const titleEl = document.getElementById('headerTitle');
        const subTitleEl = document.getElementById('headerSubtitle');

        let targetScreen = null;
        if (screenName === 'menu') {
            targetScreen = document.getElementById('screen-menu');
            if (btnBack) btnBack.style.display = 'none';
            if (titleEl) titleEl.innerHTML = `<img src="icon.png" alt="VN2000 Pro"><span>WGS-84 ⇄ VN-2000 PRO</span>`;
            if (subTitleEl) subTitleEl.innerText = "Hệ Quy Chiếu & Tọa Độ Quốc Gia";
            appNav.updateBanner();
        } else {
            if (btnBack) btnBack.style.display = 'inline-flex';
            
            let titleText = "WGS-84 ⇄ VN-2000";
            if (screenName === 'profile') {
                titleText = "8. TRẮC DỌC & ĐÀO ĐẮP";
                targetScreen = document.getElementById('screen-profile');
                if (subTitleEl) subTitleEl.innerText = "TCVN 4447:2012 • Tuyến & Hố Đào";
                setTimeout(() => {
                    if (typeof appElevationProfile !== 'undefined') {
                        appElevationProfile.setTab(appElevationProfile.currentTab || 'align');
                    }
                }, 40);
            } else if (screenName === 'geoid') {
                titleText = "9. GEOID HÒN DẤU";
                targetScreen = document.getElementById('screen-geoid');
                if (subTitleEl) subTitleEl.innerText = "Mô hình VIGAC2017 / EGM2008";
                setTimeout(() => {
                    if (typeof appGeoidVigac !== 'undefined' && appGeoidVigac.useCurrentLocation) {
                        appGeoidVigac.useCurrentLocation();
                    }
                }, 40);
            } else if (screenName === 'transform') {
                titleText = "1. CHUYỂN ĐỔI TỌA ĐỘ";
                targetScreen = document.getElementById('screen-transform');
            } else if (screenName === 'stakeout') {
                titleText = "3. CẮM MỐC THỰC ĐỊA";
                targetScreen = document.getElementById('screen-stakeout');
                if (typeof appStakeout !== 'undefined') appStakeout.init();
            } else if (screenName === 'camera') {
                titleText = "4. CAMERA ĐÓNG DẤU";
                targetScreen = document.getElementById('screen-camera');
                if (typeof appCamera !== 'undefined') appCamera.init();
            } else if (screenName === 'datamgmt') {
                titleText = "5. SỔ ĐO & DỰ ÁN";
                targetScreen = document.getElementById('screen-datamgmt');
                if (typeof appData !== 'undefined' && appData.refreshTable) appData.refreshTable();
            } else if (screenName === 'about') {
                titleText = "6. THÔNG TIN & HƯỚNG DẪN";
                targetScreen = document.getElementById('screen-about');
                const activeTab = document.querySelector('.about-tab-btn.active');
                if (!activeTab) {
                    appNav.switchAboutTab('app');
                }
            } else if (screenName === 'gps') {
                titleText = "GPS THỰC ĐỊA";
                targetScreen = document.getElementById('screen-gps');
                if (typeof appGps !== 'undefined' && appGps.refreshDisplay) appGps.refreshDisplay();
            } else if (screenName === 'geodesy') {
                titleText = "BÀI TOÁN TRẮC ĐỊA";
                targetScreen = document.getElementById('screen-geodesy');
                if (typeof appGeodesy !== 'undefined' && appGeodesy.initDropdowns) appGeodesy.initDropdowns();
            }

            if (titleEl) titleEl.innerHTML = `<span>${titleText}</span>`;
            if (subTitleEl) subTitleEl.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;
            
            // Tự động đồng bộ check chọn trong Thư Menu Cây Thư Mục
            appNav.syncActiveMenuWithScreen(screenName);
        }

        if (targetScreen) {
            targetScreen.classList.add('active');
            targetScreen.style.display = 'block';
            targetScreen.scrollTop = 0;
            // Ép browser kích hoạt reflow tức thì, loại bỏ triệt để độ trễ repaint của Chromium
            void targetScreen.offsetHeight;
        }
    },

    handleHeaderBack() {
        triggerHaptic('light');
        const mapView = document.getElementById('map-view-container');
        if (mapView && (mapView.classList.contains('active') || mapView.style.display === 'block')) {
            appNav.closeMap();
            return;
        }
        appNav.goToMenu();
    },

    goToMenu() {
        const mapView = document.getElementById('map-view-container');
        if (mapView) {
            mapView.classList.remove('active');
            mapView.style.display = 'none';
        }
        appNav.showScreen('menu');
    },

    switchAboutTab(tabName) {
        triggerHaptic('light');
        const validTabs = ['app', 'manual', 'math'];
        if (!validTabs.includes(tabName)) tabName = 'app';

        const btnMap = {
            'app': 'btnAboutTabApp',
            'manual': 'btnAboutTabManual',
            'math': 'btnAboutTabMath'
        };
        const contentMap = {
            'app': 'aboutTabContentApp',
            'manual': 'aboutTabContentManual',
            'math': 'aboutTabContentMath'
        };

        validTabs.forEach(t => {
            const btn = document.getElementById(btnMap[t]);
            const content = document.getElementById(contentMap[t]);
            if (btn) btn.classList.toggle('active', t === tabName);
            if (content) content.classList.toggle('active', t === tabName);
        });

        const screenEl = document.getElementById('screen-about');
        if (screenEl) {
            screenEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    toggleManualTask(headerEl) {
        triggerHaptic('light');
        if (!headerEl) return;
        const body = headerEl.nextElementSibling;
        const chevron = headerEl.querySelector('.manual-task-chevron') || headerEl.querySelector('span:last-child');
        if (!body) return;

        const isCurrentlyHidden = (body.style.display === 'none');
        body.style.display = isCurrentlyHidden ? 'block' : 'none';
        if (chevron) {
            chevron.style.transform = isCurrentlyHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
        }
    },

    toggleAllManualTasks(shouldOpen) {
        triggerHaptic('light');
        document.querySelectorAll('#aboutTabContentManual .manual-task-card').forEach(card => {
            const body = card.querySelector('.manual-task-body');
            const chevron = card.querySelector('.manual-task-chevron') || card.querySelector('span:last-child');
            if (body) {
                body.style.display = shouldOpen ? 'block' : 'none';
            }
            if (chevron) {
                chevron.style.transform = shouldOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
            }
        });
    },

    toggleTreeMenu() {
        const now = Date.now();
        if (appNav._lastToggleTime && (now - appNav._lastToggleTime < 350)) {
            return;
        }
        appNav._lastToggleTime = now;
        triggerHaptic('light');
        if (AppState.isTreeDrawerOpen) {
            appNav.closeTreeMenu();
        } else {
            appNav.openTreeMenu();
        }
    },

    openTreeMenu() {
        AppState.isTreeDrawerOpen = true;
        const drawer = document.getElementById('navTreeDrawer');
        const backdrop = document.getElementById('navTreeBackdrop');
        if (backdrop) {
            backdrop.style.setProperty('display', 'block', 'important');
            backdrop.style.setProperty('opacity', '1', 'important');
            backdrop.style.setProperty('pointer-events', 'auto', 'important');
            backdrop.classList.add('active');
        }
        if (drawer) {
            drawer.style.setProperty('display', 'flex', 'important');
            drawer.style.setProperty('transform', 'translateX(0)', 'important');
            drawer.classList.add('active');
        }
        appNav.updateTreeNavState();
    },

    closeTreeMenu(immediate = false) {
        AppState.isTreeDrawerOpen = false;
        const drawer = document.getElementById('navTreeDrawer');
        const backdrop = document.getElementById('navTreeBackdrop');
        if (drawer) {
            drawer.style.setProperty('transform', 'translateX(-100%)', 'important');
            drawer.classList.remove('active');
            drawer.style.setProperty('display', 'none', 'important');
        }
        if (backdrop) {
            backdrop.style.setProperty('opacity', '0', 'important');
            backdrop.style.setProperty('pointer-events', 'none', 'important');
            backdrop.classList.remove('active');
            backdrop.style.setProperty('display', 'none', 'important');
        }
    },

    setActiveMenuItem(itemId) {
        // Bỏ chọn tất cả các mục
        document.querySelectorAll('.drawer-leaf-item').forEach(el => {
            el.classList.remove('selected');
        });

        if (!itemId) return;
        const targetItem = document.getElementById(itemId);
        if (targetItem) {
            targetItem.classList.add('selected');

            // Tự động mở nhóm thư mục chứa item này và thu nhỏ các nhóm khác (Accordion Auto-Collapse)
            const parentFolder = targetItem.closest('.drawer-folder');
            if (parentFolder) {
                document.querySelectorAll('.drawer-folder').forEach(f => {
                    if (f === parentFolder) {
                        f.classList.add('open');
                    } else {
                        f.classList.remove('open');
                    }
                });
            }
        }
    },

    syncActiveMenuWithScreen(screenName) {
        const screenToItem = {
            'transform': 'drawerItem_transform',
            'stakeout': 'drawerItem_stakeout',
            'camera': 'drawerItem_camera',
            'datamgmt': 'drawerItem_datamgmt',
            'about': 'drawerItem_about',
            'profile': 'drawerItem_profile_volume',
            'geoid': 'drawerItem_geoid_convert'
        };
        if (screenToItem[screenName]) {
            appNav.setActiveMenuItem(screenToItem[screenName]);
        } else if (screenName === 'menu') {
            appNav.setActiveMenuItem(null);
        }
    },

    filterMainCategories(category) {
        const tabAll = document.getElementById('tabFilterAll');
        const tabBasic = document.getElementById('tabFilterBasic');
        const tabAdv = document.getElementById('tabFilterAdvanced');
        const secBasic = document.getElementById('secFeaturesBasic');
        const secAdv = document.getElementById('secFeaturesAdvanced');

        if (tabAll) tabAll.classList.toggle('active', category === 'all');
        if (tabBasic) tabBasic.classList.toggle('active', category === 'basic');
        if (tabAdv) tabAdv.classList.toggle('active', category === 'advanced');

        if (secBasic) {
            secBasic.style.display = (category === 'all' || category === 'basic') ? 'block' : 'none';
        }
        if (secAdv) {
            secAdv.style.display = (category === 'all' || category === 'advanced') ? 'block' : 'none';
        }
    },

    toggleAdvancedFeatures() {
        const secAdv = document.getElementById('secFeaturesAdvanced');
        const btnToggle = document.getElementById('btnToggleAdvancedFeatures');
        const btnTitle = document.getElementById('txtToggleAdvancedTitle');
        const chevron = document.getElementById('chevronToggleAdvanced');

        if (!secAdv) return;

        const isCurrentlyHidden = secAdv.style.display === 'none' || getComputedStyle(secAdv).display === 'none';

        if (isCurrentlyHidden) {
            secAdv.style.display = 'block';
            if (btnToggle) btnToggle.classList.add('expanded');
            if (btnTitle) btnTitle.innerText = "▲ Thu Gọn Chức Năng Nâng Cao";
            if (chevron) {
                chevron.innerText = "▲";
                chevron.style.transform = "rotate(180deg)";
            }
        } else {
            secAdv.style.display = 'none';
            if (btnToggle) btnToggle.classList.remove('expanded');
            if (btnTitle) btnTitle.innerText = "Chức Năng Nâng Cao (Stakeout, Camera, Tuyến, CAD/GIS)";
            if (chevron) {
                chevron.innerText = "▼";
                chevron.style.transform = "rotate(0deg)";
            }
        }
    },

    navigateTo(action, param) {
        const isModalAction = ['profile_volume', 'geoid_convert', 'settings_ktt', 'settings_storage', 'settings_rtk', 'settings_resection', 'batch_import'].includes(action);
        appNav.closeTreeMenu(isModalAction);
        if (action === 'menu') {
            appNav.goToMenu();
        } else if (action === 'transform') {
            appNav.showScreen('transform');
            appNav.setActiveMenuItem('drawerItem_transform');
        } else if (action === 'map') {
            appNav.openProjectMap();
            appNav.setActiveMenuItem('drawerItem_map');
            if (typeof appCadTool !== 'undefined' && appCadTool.isActive) appCadTool.closeToolbar();
        } else if (action === 'stakeout') {
            appNav.showScreen('stakeout');
            appNav.setActiveMenuItem('drawerItem_stakeout');
        } else if (action === 'camera') {
            appNav.showScreen('camera');
            appNav.setActiveMenuItem('drawerItem_camera');
        } else if (action === 'datamgmt') {
            appNav.showScreen('datamgmt');
            appNav.setActiveMenuItem('drawerItem_datamgmt');
        } else if (action === 'about') {
            appNav.showScreen('about');
            appNav.setActiveMenuItem('drawerItem_about');
        } else if (action === 'batch_import') {
            appNav.setActiveMenuItem('drawerItem_batch');
            appModal.openImportProjectModal();
        } else if (action === 'measure_distance') {
            appNav.setActiveMenuItem('drawerItem_measure_distance');
            appNav.openProjectMap(); // Mở bản đồ mới sạch theo yêu cầu
            if (typeof appCadTool !== 'undefined' && appCadTool.isActive) appCadTool.closeToolbar();
            if (!AppState.showProjectDistance) {
                appMap.toggleDistanceDisplay();
            }
            showToast("📏 Chế độ đo khoảng cách (Bản đồ mới). Chọn dự án từ menu nếu muốn nạp mốc có sẵn.");
        } else if (action === 'measure_polygon') {
            appNav.setActiveMenuItem('drawerItem_measure_polygon');
            appNav.openProjectMap(); // Mở bản đồ mới sạch
            if (typeof appCadTool !== 'undefined' && appCadTool.isActive) appCadTool.closeToolbar();
            if (!AppState.isPolygonClosed) {
                appMap.togglePolygonClose();
            }
            showToast("📐 Chế độ khép góc đa giác (Bản đồ mới). Chọn dự án từ menu nếu muốn nạp mốc có sẵn.");
        } else if (action === 'export_dxf') {
            appNav.setActiveMenuItem('drawerItem_export_dxf');
            appData.exportDxfFile();
        } else if (action === 'export_kml') {
            appNav.setActiveMenuItem('drawerItem_export_kml');
            appData.exportKmlFile();
        } else if (action === 'export_csv') {
            appNav.setActiveMenuItem('drawerItem_export_csv');
            appData.exportCsvFile();
        } else if (action === 'settings_ktt') {
            appNav.setActiveMenuItem('drawerItem_settings_ktt');
            appModal.openUnifiedSettings('ktt');
        } else if (action === 'settings_storage') {
            appNav.setActiveMenuItem('drawerItem_settings_storage');
            appModal.openUnifiedSettings('storage');
        } else if (action === 'settings_rtk') {
            appNav.setActiveMenuItem('drawerItem_settings_rtk');
            appModal.openUnifiedSettings('rtk');
        } else if (action === 'settings_resection') {
            appNav.setActiveMenuItem('drawerItem_settings_resection');
            appModal.openUnifiedSettings('resection');
        } else if (action === 'profile_volume' || action === 'profile') {
            appNav.setActiveMenuItem('drawerItem_profile_volume');
            appNav.showScreen('profile');
        } else if (action === 'geoid_convert' || action === 'geoid') {
            appNav.setActiveMenuItem('drawerItem_geoid_convert');
            appNav.showScreen('geoid');
        } else if (action === 'gps_toggle') {
            appNav.setActiveMenuItem('drawerItem_gps_toggle');
            appGps.toggleTracking();
        } else if (action === 'cad_tool') {
            appNav.setActiveMenuItem('drawerItem_cad_tool');
            appNav.openProjectMap();
            if (typeof appCadTool !== 'undefined') {
                appCadTool.openToolbar();
            }
        }
    },

    toggleTreeFolder(folderId) {
        const folder = document.getElementById(folderId);
        if (!folder) return;
        folder.classList.toggle('open');
    },

    toggleDrawerFolder(drawerFolderId) {
        const folder = document.getElementById(drawerFolderId);
        if (!folder) return;
        const willOpen = !folder.classList.contains('open');

        // Tự động thu nhỏ (Accordion Auto-Collapse) các nhóm khác trong menu
        document.querySelectorAll('.drawer-folder').forEach(f => {
            if (f.id !== drawerFolderId) {
                f.classList.remove('open');
            }
        });

        if (willOpen) {
            folder.classList.add('open');
        } else {
            folder.classList.remove('open');
        }
    },

    switchMainMenuView(viewMode) {
        AppState.mainMenuViewMode = viewMode;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('vn2000_main_menu_view', viewMode);
        }
        const modernHub = document.getElementById('dashboardModernHub');
        const cardsHub = document.getElementById('mainCardsHub');
        const filterTabs = (typeof document.querySelector === 'function') ? document.querySelector('.main-filter-tabs') : null;
        const treeCont = document.getElementById('mainTreeContainer');
        const gridCont = document.getElementById('mainGridContainer');
        const treeQuickTools = document.getElementById('treeQuickTools');
        const btnTree = document.getElementById('btnViewModeTree');
        const btnGrid = document.getElementById('btnViewModeGrid');

        if (viewMode === 'big_tiles') {
            if (modernHub) modernHub.style.display = 'block';
            if (cardsHub) cardsHub.style.display = 'none';
            if (filterTabs) filterTabs.style.display = 'none';
            if (gridCont) gridCont.style.display = 'none';
            if (treeCont) treeCont.style.display = 'none';
            if (treeQuickTools) treeQuickTools.style.display = 'none';
            if (typeof appDashboard !== 'undefined') appDashboard.renderDashboard();
        } else if (viewMode === 'tree') {
            if (modernHub) modernHub.style.display = 'none';
            if (cardsHub) cardsHub.style.display = 'none';
            if (filterTabs) filterTabs.style.display = 'none';
            if (gridCont) gridCont.style.display = 'none';
            if (treeCont) treeCont.style.display = 'flex';
            if (treeQuickTools) treeQuickTools.style.display = 'flex';
            if (btnTree) btnTree.classList.add('active');
            if (btnGrid) btnGrid.classList.remove('active');
        } else {
            if (modernHub) modernHub.style.display = 'none';
            if (cardsHub) cardsHub.style.display = 'block';
            if (filterTabs) filterTabs.style.display = 'flex';
            if (gridCont) gridCont.style.display = 'none';
            if (treeCont) treeCont.style.display = 'none';
            if (treeQuickTools) treeQuickTools.style.display = 'none';
            if (btnTree) btnTree.classList.remove('active');
            if (btnGrid) btnGrid.classList.add('active');
        }
    },

    toggleAllFolders(shouldOpen) {
        document.querySelectorAll('.tree-folder, .drawer-folder').forEach(el => {
            if (shouldOpen) el.classList.add('open');
            else el.classList.remove('open');
        });
    },

    filterTreeNav(query) {
        const q = (query || '').toLowerCase().trim();
        const mainInput = document.getElementById('txtMainTreeFilter');
        const drawerInput = document.getElementById('txtDrawerSearch');
        if (mainInput && mainInput.value !== query) mainInput.value = query;
        if (drawerInput && drawerInput.value !== query) drawerInput.value = query;

        // Lọc trong cây thư mục và drawer
        const items = document.querySelectorAll('.tree-leaf-item, .drawer-leaf-item');
        items.forEach(el => {
            const text = (el.innerText || '').toLowerCase();
            if (!q || text.includes(q)) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'none';
            }
        });

        // Lọc trên các thẻ chức năng Màn hình chính
        const cards = document.querySelectorAll('.feature-card');
        cards.forEach(card => {
            const text = (card.innerText || '').toLowerCase();
            if (!q || text.includes(q)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });

        if (q) {
            document.querySelectorAll('.tree-folder, .drawer-folder').forEach(folder => {
                const hasVisible = Array.from(folder.querySelectorAll('.tree-leaf-item, .drawer-leaf-item')).some(item => item.style.display !== 'none');
                if (hasVisible) {
                    folder.classList.add('open');
                    folder.style.display = 'block';
                } else {
                    folder.style.display = 'none';
                }
            });
        } else {
            document.querySelectorAll('.tree-folder, .drawer-folder').forEach(folder => {
                folder.style.display = 'block';
            });
        }
    },

    updateTreeNavState() {
        const chip = document.getElementById('drawerStatusInfo');
        if (chip) {
            chip.innerHTML = `<span>📁 ${AppState.currentProject}</span> • <span>🌐 ${AppState.provinceName} (${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')</span>`;
        }
    },

    openProjectMap(options = {}) {
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = 'map';
        document.querySelectorAll('.screen-view').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const mapView = document.getElementById('map-view-container');
        if (mapView) {
            mapView.classList.add('active');
            mapView.style.display = 'block';
            void mapView.offsetHeight;
        }

        // Đồng bộ Header trên cùng
        const btnBack = document.getElementById('btnHeaderBack');
        if (btnBack) btnBack.style.display = 'inline-flex';
        const titleEl = document.getElementById('headerTitle');
        const subTitleEl = document.getElementById('headerSubtitle');
        if (titleEl) titleEl.innerHTML = `<span>2. BẢN ĐỒ VỆ TINH & CHẤM ĐIỂM</span>`;
        if (subTitleEl) subTitleEl.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;

        appNav.setActiveMenuItem('drawerItem_map');

        appMap.initMap();
        if (appMap.initRightControlsDrag) appMap.initRightControlsDrag();

        // Kiểm tra xem có yêu cầu nạp dự án cụ thể hay không:
        // Mặc định khi vào các chức năng (Bản đồ, CAD Mini...) sẽ mở bản đồ mới sạch (không mở sẵn dự án khác)
        // Người dùng có thể dùng dropdown "Chọn dự án để nạp" để gọi dự án ra hiển thị.
        if (options && options.loadProject) {
            const projToLoad = (typeof options.loadProject === 'string') ? options.loadProject : AppState.currentProject;
            if (projToLoad) {
                AppState.currentProject = projToLoad;
                localStorage.setItem('vn2k_cur_project', AppState.currentProject);
                appMap.loadProjectMarkers();
                appMap.fitProjectBounds();
            }
        } else {
            // Mở bản đồ mới sạch: Xóa các mốc dự án trước đó, dropdown để ở tùy chọn "[Bản đồ mới]"
            if (AppState.projectMarkersGroup) AppState.projectMarkersGroup.clearLayers();
            if (AppState.projectDistanceLabelsGroup) AppState.projectDistanceLabelsGroup.clearLayers();
            if (AppState.projectPolygonLayer && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
                AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
                AppState.projectPolygonLayer = null;
            }
            const hud = document.getElementById('mapDistanceHud');
            if (hud) hud.style.display = 'none';

            appMap.populateMapProjectSelect(null); // Chọn [Bản đồ mới]

            if (AppState.lastGps && AppState.lastGps.lat) {
                AppState.leafletMap.setView([AppState.lastGps.lat, AppState.lastGps.lng], 16);
            }
        }
    },

    openConvertedMap(pointData) {
        AppState.prevScreen = AppState.currentScreen;
        AppState.currentScreen = 'map';
        document.querySelectorAll('.screen-view').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const mapView = document.getElementById('map-view-container');
        if (mapView) {
            mapView.classList.add('active');
            mapView.style.display = 'block';
            void mapView.offsetHeight;
        }

        // Đồng bộ Header trên cùng
        const btnBack = document.getElementById('btnHeaderBack');
        if (btnBack) btnBack.style.display = 'inline-flex';
        const titleEl = document.getElementById('headerTitle');
        const subTitleEl = document.getElementById('headerSubtitle');
        if (titleEl) titleEl.innerHTML = `<span>2. BẢN ĐỒ VỆ TINH & CHẤM ĐIỂM</span>`;
        if (subTitleEl) subTitleEl.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;

        appMap.initMap();
        // Mở bản đồ sạch tập trung vào điểm chuyển đổi
        if (AppState.projectMarkersGroup) AppState.projectMarkersGroup.clearLayers();
        if (AppState.projectDistanceLabelsGroup) AppState.projectDistanceLabelsGroup.clearLayers();
        if (AppState.projectPolygonLayer && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
            AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
            AppState.projectPolygonLayer = null;
        }
        const hud = document.getElementById('mapDistanceHud');
        if (hud) hud.style.display = 'none';
        appMap.populateMapProjectSelect(null);

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
        document.querySelectorAll('.screen-view').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const mapView = document.getElementById('map-view-container');
        if (mapView) {
            mapView.classList.add('active');
            mapView.style.display = 'block';
            void mapView.offsetHeight;
        }

        // Đồng bộ Header trên cùng
        const btnBack = document.getElementById('btnHeaderBack');
        if (btnBack) btnBack.style.display = 'inline-flex';
        const titleEl = document.getElementById('headerTitle');
        const subTitleEl = document.getElementById('headerSubtitle');
        if (titleEl) titleEl.innerHTML = `<span>2. BẢN ĐỒ VỆ TINH & CHẤM ĐIỂM</span>`;
        if (subTitleEl) subTitleEl.innerText = `${AppState.provinceName} (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;

        appMap.initMap();

        // Mở bản đồ sạch không mở sẵn dự án của các chức năng khác
        if (AppState.projectMarkersGroup) AppState.projectMarkersGroup.clearLayers();
        if (AppState.projectDistanceLabelsGroup) AppState.projectDistanceLabelsGroup.clearLayers();
        if (AppState.projectPolygonLayer && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
            AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
            AppState.projectPolygonLayer = null;
        }
        const hud = document.getElementById('mapDistanceHud');
        if (hud) hud.style.display = 'none';

        appMap.populateMapProjectSelect(null);

        const txt = document.getElementById('mapModeIndicator');
        if (txt) {
            txt.innerText = "🛰️ VỊ TRÍ GPS THỰC ĐỊA";
            txt.style.color = "#38bdf8";
        }

        if (AppState.lastGps && AppState.lastGps.lat) {
            appMap.updateGpsRealtimeMarker(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
            AppState.leafletMap.setView([AppState.lastGps.lat, AppState.lastGps.lng], 18);
            showToast("✓ Đã định vị theo vị trí GPS thực tế!");
        } else {
            appTransform.getLiveGps();
        }
    },

    closeMap() {
        const mapView = document.getElementById('map-view-container');
        if (mapView) {
            mapView.classList.remove('active');
            mapView.style.display = 'none';
        }
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

        // Tích hợp thông tin trắc địa gọn gàng vào Header Subtitle khi ở màn hình Menu
        const subTitleEl = document.getElementById('headerSubtitle');
        if (subTitleEl && AppState.currentScreen === 'menu') {
            subTitleEl.innerHTML = `<span class="header-geodetic-pill" onclick="appModal.openUnifiedSettings('ktt')" title="Nhấp để đổi Tỉnh thành & Kinh tuyến trục">📍 ${AppState.provinceName} • KTT ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}' (Múi ${AppState.muiVal}°) ▾</span>`;
        }

        if (typeof appDashboard !== 'undefined') {
            appDashboard.renderDashboard();
        }

        appNav.updateTreeNavState();
    }
};

// ================= 3.1. PHÂN HỆ DASHBOARD HIỆN ĐẠI (UI/UX PRO MAX) =================
const appDashboard = {
    allFeatures: [
        { id: 'transform', name: '1. Chuyển Đổi Tọa Độ Hai Chiều', short: 'Chuyển Đổi Tọa Độ', icon: '🔄', color: 'cyan', tag: '7 Tham số BTNMT', sub: 'WGS-84 ⇄ VN-2000 (Múi 3°/6°)', metric: '63 Tỉnh Thành', action: () => appNav.showScreen('transform') },
        { id: 'map', name: '2. Bản Đồ Vệ Tinh & Chấm Điểm', short: 'Bản Đồ Dự Án', icon: '🗺️', color: 'emerald', tag: 'Vệ tinh & Thực địa', sub: 'Ranh 34 tỉnh/xã • Đo cự ly', metric: 'Bản Đồ & DXF', action: () => appNav.openProjectMap() },
        { id: 'cad_tool', name: '3.5 Vẽ Mặt Bằng CAD Mini', short: 'CAD Mini Thực Địa', icon: '📐', color: 'cyan', tag: 'Vẽ ranh • Snap • DXF', sub: 'Đa giác • Tuyến • Bảng diện tích & DXF', metric: 'CAD TCVN', action: () => { appNav.openProjectMap(); if (typeof appCadTool !== 'undefined') appCadTool.openToolbar(); } },
        { id: 'stakeout', name: '3. Dẫn Đường Cắm Mốc (Stakeout)', short: 'Cắm Mốc Thực Địa', icon: '🎯', color: 'amber', tag: 'La bàn số 360°', sub: 'Dẫn đường • Radar bíp đích', metric: 'La Bàn HUD', action: () => appNav.showScreen('stakeout') },
        { id: 'datamgmt', name: '4. Sổ Đo Mốc & Quản Lý Dự Án', short: 'Sổ Đo & Dự Án', icon: '📁', color: 'purple', tag: 'Quản lý số liệu', sub: 'AutoCAD DXF • KML • CSV', metric: () => `${(typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject).length : 0} Điểm Mốc`, action: () => appNav.showScreen('datamgmt') },
        { id: 'camera', name: '5. Camera Đóng Dấu Thủy Ấn', short: 'Camera Thủy Ấn', icon: '📸', color: 'pink', tag: 'Thủy ấn pháp lý', sub: 'In GPS, VN2K & La bàn lên ảnh', metric: 'Đóng Dấu GPS', action: () => appNav.showScreen('camera') },
        { id: 'rtk', name: '6. RTK Rover Bluetooth Ngoài', short: 'RTK Bluetooth Rover', icon: '🛰️', color: 'blue', tag: 'Web Bluetooth NMEA', sub: 'Định vị chính xác cỡ milimet', metric: 'RTK Rover Fix', action: () => appModal.openUnifiedSettings('rtk') },
        { id: 'resection', name: '7. Giao Hội Trắc Địa Khi Mất GPS', short: 'Giao Hội Trắc Địa', icon: '📐', color: 'yellow', tag: 'Định vị hầm/tán cây', sub: 'Giao hội nghịch từ 2 mốc chuẩn', metric: 'Giao Hội Điểm P', action: () => appModal.openUnifiedSettings('resection') },
        { id: 'profile', name: '8. Trắc Dọc Địa Hình & Đào Đắp', short: 'Trắc Dọc & Đào Đắp', icon: '📈', color: 'teal', tag: 'Cao trình thiết kế', sub: 'Vẽ mặt cắt & Khối lượng Cut/Fill m³', metric: 'Đào Đắp m³', action: () => appNav.showScreen('profile') },
        { id: 'geoid', name: '9. Quy Đổi Cao Độ Geoid Hòn Dấu', short: 'Geoid VIGAC2017', icon: '🏔️', color: 'cyan', tag: 'Thủy chuẩn Quốc gia', sub: 'Quy đổi độ cao H = h - ζ (VIGAC)', metric: 'Geoid Hòn Dấu', action: () => appNav.showScreen('geoid') },
        { id: 'about', name: '10. Thông Tin & Hướng Dẫn', short: 'Thông Tin & Cẩm Nang', icon: 'ℹ️', color: 'slate', tag: '3 Tab Chuyên Nghiệp', sub: 'Cẩm nang 10 nghiệp vụ • Cài PWA • Toán BTNMT', metric: 'v2.7.0 Pro', action: () => appNav.showScreen('about') }
    ],

    toolFilterQuery: '',

    init() {
        const viewMode = (typeof localStorage !== 'undefined' && localStorage.getItem('vn2000_main_menu_view'))
            ? localStorage.getItem('vn2000_main_menu_view')
            : 'big_tiles';
        appNav.switchMainMenuView(viewMode);
        appDashboard.renderDashboard();
    },

    getPinnedFeatureIds() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem('vn2000_pinned_features');
                if (raw) {
                    const arr = JSON.parse(raw);
                    if (Array.isArray(arr) && arr.length === 4) return arr;
                }
            }
        } catch (e) {}
        return ['transform', 'map', 'stakeout', 'datamgmt'];
    },

    savePinnedFeatureIds(ids) {
        if (Array.isArray(ids) && ids.length === 4) {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('vn2000_pinned_features', JSON.stringify(ids));
            }
            appDashboard.renderDashboard();
            triggerHaptic('success');
            showToast("⭐ Đã cập nhật 4 tính năng ghim trên Màn hình chính!");
        }
    },

    isAccordionExpanded: true,

    toggleAccordion() {
        triggerHaptic('light');
        appDashboard.isAccordionExpanded = !appDashboard.isAccordionExpanded;
        const content = document.getElementById('accordionToolsContent');
        const chevron = document.getElementById('accordionChevronIcon');
        if (content) content.classList.toggle('expanded', appDashboard.isAccordionExpanded);
        if (chevron) chevron.classList.toggle('expanded', appDashboard.isAccordionExpanded);
    },

    filterTools(query) {
        appDashboard.toolFilterQuery = (query || '').trim().toLowerCase();
        const clearBtn = document.getElementById('btnDashToolFilterClear');
        if (clearBtn) clearBtn.style.display = appDashboard.toolFilterQuery ? 'inline-block' : 'none';
        appDashboard.renderAccordionToolsOnly();
    },

    clearToolFilter() {
        appDashboard.toolFilterQuery = '';
        const input = document.getElementById('txtDashToolFilter');
        const clearBtn = document.getElementById('btnDashToolFilterClear');
        if (input) input.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        appDashboard.renderAccordionToolsOnly();
    },

    renderAccordionToolsOnly() {
        const compactList = document.getElementById('compactToolsContainer');
        const countBadge = document.getElementById('accordionToolsCount');
        if (!compactList) return;

        const pinnedIds = appDashboard.getPinnedFeatureIds();
        let unpinnedFeatures = appDashboard.allFeatures.filter(f => !pinnedIds.includes(f.id));

        if (appDashboard.toolFilterQuery) {
            const q = appDashboard.toolFilterQuery;
            unpinnedFeatures = unpinnedFeatures.filter(f =>
                f.name.toLowerCase().includes(q) ||
                f.sub.toLowerCase().includes(q) ||
                (f.tag && f.tag.toLowerCase().includes(q)) ||
                f.short.toLowerCase().includes(q) ||
                f.id.toLowerCase().includes(q)
            );
        }

        if (unpinnedFeatures.length === 0) {
            compactList.innerHTML = `
              <div style="grid-column: 1/-1; text-align: center; padding: 22px 10px; color: #64748b; font-size: 12px;">
                🔍 Không tìm thấy công cụ nào phù hợp với từ khóa "${escapeHtml(appDashboard.toolFilterQuery)}"
              </div>
            `;
        } else {
            compactList.innerHTML = unpinnedFeatures.map(f => {
                return `
                  <div class="compact-tool-card" onclick="triggerHaptic('light'); appDashboard.launchFeature('${f.id}')" title="Mở ${f.name}">
                    <div class="compact-tool-left">
                      <div class="compact-tool-icon icon-box-${f.color}">${f.icon}</div>
                      <div class="compact-tool-info">
                        <div class="compact-tool-title-row">
                          <span class="compact-tool-title">${f.name}</span>
                          ${f.tag ? `<span class="compact-tool-tag">${f.tag}</span>` : ''}
                        </div>
                        <div class="compact-tool-desc">${f.sub}</div>
                      </div>
                    </div>
                    <div class="compact-tool-right">
                      <button type="button" class="btn-compact-pin" onclick="event.stopPropagation(); appDashboard.quickSwapPin('${f.id}')" title="Ghim lên màn hình chính">⭐</button>
                      <span class="btn-compact-launch">Mở ➔</span>
                    </div>
                  </div>
                `;
            }).join('');
        }

        if (countBadge) {
            countBadge.innerText = `${unpinnedFeatures.length} công cụ`;
        }
    },

    renderDashboard() {
        const grid = document.getElementById('bigActionTilesGrid');
        if (!grid) return;

        const pinnedIds = appDashboard.getPinnedFeatureIds();
        const pinnedFeatures = [];

        appDashboard.allFeatures.forEach(f => {
            if (pinnedIds.includes(f.id)) {
                pinnedFeatures.push(f);
            }
        });

        // 1. Render 4 Big Action Tiles
        grid.innerHTML = pinnedFeatures.map(f => {
            const metricVal = typeof f.metric === 'function' ? f.metric() : f.metric;
            return `
              <div class="big-action-tile tile-${f.color}" onclick="triggerHaptic('light'); appDashboard.launchFeature('${f.id}')" title="Mở ${f.name}">
                <div class="big-tile-top">
                  <div class="big-tile-icon-box icon-box-${f.color}">${f.icon}</div>
                  <span class="big-tile-launch-arrow">➔</span>
                </div>
                <div class="big-tile-bottom">
                  <div class="big-tile-title">${f.short}</div>
                  <div class="big-tile-subtitle">${f.sub}</div>
                  <div class="big-tile-metric">
                    <span class="tile-metric-pill metric-${f.color}">${metricVal}</span>
                  </div>
                </div>
              </div>
            `;
        }).join('');

        // 2. Render Accordion Tools
        appDashboard.renderAccordionToolsOnly();

        // 3. Update Status Chips & Info Row
        appDashboard.updateDashboardInfoRow();
    },

    launchFeature(id) {
        const f = appDashboard.allFeatures.find(item => item.id === id);
        if (f && typeof f.action === 'function') {
            f.action();
        }
    },

    quickSwapPin(idToPin) {
        triggerHaptic('medium');
        const pinned = appDashboard.getPinnedFeatureIds();
        if (!pinned.includes(idToPin)) {
            // Thay thế vị trí thứ 4 bằng tính năng được chọn
            pinned[3] = idToPin;
            appDashboard.savePinnedFeatureIds(pinned);
            showToast("⭐ Đã ghim tính năng mới lên Màn hình chính!");
        } else {
            showToast("ℹ️ Tính năng này đã có sẵn trên Màn hình chính!");
        }
    },

    openPinModal() {
        triggerHaptic('light');
        const modal = document.getElementById('modalCustomizePinned');
        if (!modal) return;
        modal.classList.add('active');
        appDashboard.renderPinPicker();
    },

    closePinModal() {
        triggerHaptic('light');
        const modal = document.getElementById('modalCustomizePinned');
        if (modal) modal.classList.remove('active');
    },

    tempSelectedPins: [],

    renderPinPicker() {
        appDashboard.tempSelectedPins = [...appDashboard.getPinnedFeatureIds()];
        appDashboard.updatePinPickerUi();
    },

    togglePinSelection(id) {
        triggerHaptic('light');
        const idx = appDashboard.tempSelectedPins.indexOf(id);
        if (idx !== -1) {
            if (appDashboard.tempSelectedPins.length <= 1) {
                showToast("⚠️ Cần giữ lại ít nhất 1 tính năng ghim!", true);
                return;
            }
            appDashboard.tempSelectedPins.splice(idx, 1);
        } else {
            if (appDashboard.tempSelectedPins.length >= 4) {
                showToast("⚠️ Tối đa 4 tính năng ghim trên màn hình chính! Hãy bỏ chọn bớt 1 mục.", true);
                return;
            }
            appDashboard.tempSelectedPins.push(id);
        }
        appDashboard.updatePinPickerUi();
    },

    updatePinPickerUi() {
        const container = document.getElementById('pinPickerList');
        const counter = document.getElementById('pinPickerCounter');
        if (counter) counter.innerText = `Đã chọn: ${appDashboard.tempSelectedPins.length}/4 mục`;

        if (!container) return;
        container.innerHTML = appDashboard.allFeatures.map(f => {
            const isChecked = appDashboard.tempSelectedPins.includes(f.id);
            return `
              <div class="pin-picker-item ${isChecked ? 'selected' : ''}" onclick="appDashboard.togglePinSelection('${f.id}')">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 20px;">${f.icon}</span>
                  <div>
                    <div style="font-weight: 600; font-size: 13.5px; color: #f1f5f9;">${f.name}</div>
                    <div style="font-size: 11px; color: #94a3b8;">${f.sub}</div>
                  </div>
                </div>
                <input type="checkbox" class="pin-picker-checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); appDashboard.togglePinSelection('${f.id}')">
              </div>
            `;
        }).join('');
    },

    updateDashboardInfoRow() {
        // Cập nhật thẻ thông tin dự án
        const projName = document.getElementById('dashInfoProjName');
        const projPoints = document.getElementById('dashInfoProjPoints');
        const kttShort = document.getElementById('dashInfoKttShort');
        if (projName) projName.textContent = AppState.currentProject || 'VN2000_SoLieu_DoDac.csv';
        if (projPoints) {
            const count = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject).length : 0;
            projPoints.textContent = count + ' mốc';
        }
        if (kttShort) {
            const prov = (AppState.provinceIndex >= 0 && typeof VN_PROVINCES !== 'undefined') ? VN_PROVINCES[AppState.provinceIndex] : null;
            kttShort.textContent = prov ? 'KTT ' + prov.deg + '°' + String(prov.min).padStart(2,'0') + '\'' : 'KTT ' + AppState.kttDeg + '°' + AppState.kttMin + '\'';
        }

        // Cập nhật 2 chip trạng thái nhanh ở đầu trang chủ
        const chipKtt = document.getElementById('dashChipProvinceKtt');
        if (chipKtt) {
            chipKtt.textContent = `${AppState.provinceName || 'TP. Hồ Chí Minh'} (${AppState.kttDeg || 105}°${String(AppState.kttMin || 45).padStart(2,'0')}')`;
        }
        const chipStorage = document.getElementById('dashChipStorage');
        if (chipStorage) {
            if (AppState.storageMode === 'auto_google') {
                chipStorage.innerHTML = `Google Sheets ${AppState.googleScriptUrl ? '🟢' : '⚠️'}`;
            } else {
                chipStorage.textContent = 'Ngoại tuyến (Máy)';
            }
        }
    },

    updateGpsMiniCard(lat, lng, acc, statusText) {
        const coord = document.getElementById('dashGpsMiniCoord');
        const accuracy = document.getElementById('dashGpsMiniAccuracy');
        const status = document.getElementById('dashGpsMiniStatus');
        const pulseDot = document.getElementById('dashGpsPulseDot');

        if (coord) {
            if (lat && lng) {
                coord.textContent = lat.toFixed(6) + '°N  ' + lng.toFixed(6) + '°E';
                coord.style.color = '#4ade80';
            } else {
                coord.textContent = statusText === 'searching' ? 'Đang tìm tín hiệu...' : 'Chạm để bật GPS';
                coord.style.color = '#64748b';
            }
        }
        if (accuracy) {
            accuracy.textContent = acc ? '± ' + (acc < 1 ? acc.toFixed(2) : acc.toFixed(1)) + 'm' : '± --';
            accuracy.style.color = acc ? (acc < 5 ? '#4ade80' : acc < 15 ? '#fbbf24' : '#f87171') : '#fbbf24';
        }
        if (status) {
            if (statusText === 'fix') {
                status.textContent = 'Fix ✓';
                status.style.background = 'rgba(74,222,128,0.15)';
                status.style.color = '#4ade80';
            } else if (statusText === 'off') {
                status.textContent = 'Chạm bật';
                status.style.background = 'rgba(148,163,184,0.12)';
                status.style.color = '#94a3b8';
            } else {
                status.textContent = 'Đang tìm...';
                status.style.background = 'rgba(251,191,36,0.12)';
                status.style.color = '#fbbf24';
            }
        }
        if (pulseDot) {
            pulseDot.classList.remove('pulse-active', 'pulse-searching');
            if (statusText === 'fix') {
                pulseDot.classList.add('pulse-active');
            } else if (statusText === 'searching') {
                pulseDot.classList.add('pulse-searching');
            }
        }
    },

    savePinSelection() {
        if (appDashboard.tempSelectedPins.length !== 4) {
            showToast("⚠️ Vui lòng chọn đủ 4 tính năng trước khi lưu!", true);
            return;
        }
        appDashboard.savePinnedFeatureIds(appDashboard.tempSelectedPins);
        appDashboard.closePinModal();
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
                if (idx === AppState.provinceIndex) opt.selected = true;
                sel.appendChild(opt);
            });
            sel.value = String(AppState.provinceIndex);
        }
    },

    setMui(mui) {
        AppState.muiVal = mui;
        AppState.scaleFactor = (mui === 3) ? 0.9999 : 0.9996;
        document.getElementById('btnMui3').classList.toggle('active', mui === 3);
        document.getElementById('btnMui6').classList.toggle('active', mui === 6);
        appNav.updateBanner();
        appSettings.save();
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
        appSettings.save();
    },

    onFormatChange() {
        const val = parseInt(document.getElementById('selFormatWgs').value, 10);
        AppState.formatType = val;
        appSettings.save();
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

            triggerHaptic('success');
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

            triggerHaptic('success');
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
                triggerHaptic('medium');
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
            note: note,
            project: AppState.currentProject
        };

        appData.addPoint(AppState.currentProject, newPoint);
        triggerHaptic('success');
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
            appGps.updateHeaderGpsUI('unsupported');
            return;
        }
        // Tôn trọng lựa chọn tắt GPS ở lần sử dụng trước
        if (AppState.isGpsTracking === false) {
            appGps.stopTracking();
            return;
        }
        appGps.updateHeaderGpsUI('searching');
        appGps.startTracking();
    },

    updateHeaderGpsUI(status, accuracy) {
        const btn = document.getElementById('btnHeaderGpsToggle');
        const dot = document.getElementById('headerGpsDot');
        const txt = document.getElementById('headerGpsText');
        if (!btn || !txt) return;

        btn.classList.remove('gps-active', 'gps-searching', 'gps-off', 'gps-error');

        if (status === 'off') {
            btn.classList.add('gps-off');
            btn.title = "GPS đang tắt. Bấm để bật định vị vệ tinh";
            if (dot) dot.className = 'gps-dot off';
            txt.innerText = "🛰️ Tắt";
        } else if (status === 'searching') {
            btn.classList.add('gps-searching');
            btn.title = "Đang dò bắt tín hiệu GPS vệ tinh... Bấm để tắt";
            if (dot) dot.className = 'gps-dot searching';
            txt.innerText = "🛰️ Tìm...";
        } else if (status === 'error' || status === 'unsupported') {
            btn.classList.add('gps-error');
            btn.title = (status === 'unsupported') ? "Thiết bị không hỗ trợ GPS" : "Lỗi hoặc chưa cấp quyền GPS. Bấm để thử lại";
            if (dot) dot.className = 'gps-dot error';
            txt.innerText = (status === 'unsupported') ? "⚠️ K.Hỗ trợ" : "⚠️ Lỗi GPS";
        } else if (status === 'active') {
            btn.classList.add('gps-active');
            const acc = (accuracy !== undefined && accuracy !== null) ? accuracy : (AppState.lastGps?.accuracy || 0);
            const accStr = acc > 0 ? (acc < 10 ? `±${acc.toFixed(1)}m` : `±${Math.round(acc)}m`) : 'Bật';
            btn.title = `GPS hoạt động tốt: Sai số thực tế ${accStr}. Bấm để tắt GPS`;
            if (dot) dot.className = 'gps-dot active';
            txt.innerText = `🛰️ ${accStr}`;
        }
    },

    startTracking() {
        if (AppState.gpsWatchId) return;
        AppState.isGpsTracking = true;
        appSettings.save();
        appGps.updateHeaderGpsUI('searching');

        const btn = document.getElementById('btnToggleGpsTracking');
        if (btn) btn.innerText = "⏸️ Tạm dừng GPS";

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
                // Cập nhật thẻ GPS mini trên màn hình chính
                if (typeof appDashboard !== 'undefined') {
                    appDashboard.updateGpsMiniCard(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, 'fix');
                }
                if (AppState.leafletMap) {
                    appMap.updateLiveGps(AppState.lastGps.lat, AppState.lastGps.lng, AppState.lastGps.accuracy, AppState.lastGps.heading);
                }
                if (AppState.currentScreen === 'stakeout' && typeof appStakeout !== 'undefined') {
                    appStakeout.updateLiveNavigation();
                }
            },
            (err) => {
                const badge = document.getElementById('gpsLiveStatusBadge');
                if (badge) {
                    badge.innerText = "⚠️ Mất GPS";
                    badge.className = "btn-sm btn-amber";
                }
                appGps.updateHeaderGpsUI('error');
                if (typeof appDashboard !== 'undefined') {
                    appDashboard.updateGpsMiniCard(null, null, null, 'searching');
                }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
        );
    },

    stopTracking() {
        if (AppState.gpsWatchId) {
            navigator.geolocation.clearWatch(AppState.gpsWatchId);
            AppState.gpsWatchId = null;
        }
        AppState.isGpsTracking = false;
        appSettings.save();
        const btn = document.getElementById('btnToggleGpsTracking');
        if (btn) btn.innerText = "▶️ Tiếp tục bắt GPS";
        const badge = document.getElementById('gpsLiveStatusBadge');
        if (badge) {
            badge.innerText = "⏸️ Đã dừng";
            badge.className = "btn-sm";
        }
        appGps.updateHeaderGpsUI('off');
        if (typeof appDashboard !== 'undefined') {
            appDashboard.updateGpsMiniCard(null, null, null, 'off');
        }
    },

    toggleTracking() {
        triggerHaptic('medium');
        if (AppState.isGpsTracking) {
            appGps.stopTracking();
            showToast("⏸️ Đã tắt định vị GPS (tiết kiệm pin)");
        } else {
            appGps.startTracking();
            showToast("🛰️ Đang bật định vị GPS vệ tinh...");
        }
    },

    refreshDisplay() {
        if (!AppState.lastGps.lat) return;

        appGps.updateHeaderGpsUI('active', AppState.lastGps.accuracy);

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
            note: `GPS Live (±${AppState.lastGps.accuracy.toFixed(1)}m)`,
            project: AppState.currentProject
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

// Tính khoảng cách phẳng trắc địa giữa 2 mốc (ưu tiên X, Y VN-2000, fallback WGS-84)
function calcPointsDistance(pA, pB) {
    const xA = parseFloat(pA.x);
    const yA = parseFloat(pA.y);
    const xB = parseFloat(pB.x);
    const yB = parseFloat(pB.y);

    if (!isNaN(xA) && !isNaN(yA) && !isNaN(xB) && !isNaN(yB) && xA !== 0 && xB !== 0) {
        const dx = xB - xA;
        const dy = yB - yA;
        return Math.sqrt(dx * dx + dy * dy);
    }
    const latA = parseFloat(pA.lat);
    const lngA = parseFloat(pA.lng);
    const latB = parseFloat(pB.lat);
    const lngB = parseFloat(pB.lng);
    return calcGeoDistanceAndAzimuth(latA, lngA, latB, lngB).distance;
}

// Thêm nhãn khoảng cách (Distance Badge) vào trung điểm đoạn nối trên bản đồ
function addDistanceBadge(pA, pB, dist) {
    const latA = parseFloat(pA.lat);
    const lngA = parseFloat(pA.lng);
    const latB = parseFloat(pB.lat);
    const lngB = parseFloat(pB.lng);

    const midLat = (latA + latB) / 2;
    const midLng = (lngA + lngB) / 2;

    const labelText = dist < 1000 ? `${dist.toFixed(1)}m` : `${(dist / 1000).toFixed(2)}km`;
    const icon = L.divIcon({
        className: '',
        html: `<div class="map-dist-pill" title="Cự ly: ${dist.toFixed(2)} m">${labelText}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });

    const badgeMarker = L.marker([midLat, midLng], {
        icon: icon,
        interactive: false
    });
    const hitLine = L.polyline([[latA, lngA], [latB, lngB]], { weight: 16, color: '#000', opacity: 0.001, interactive: true });
    const pill = () => badgeMarker.getElement()?.querySelector('.map-dist-pill');
    hitLine.on('mouseover', () => pill()?.classList.add('visible'));
    hitLine.on('mouseout', () => pill()?.classList.remove('visible'));
    hitLine.on('click', (e) => {
        if (typeof appCadTool !== 'undefined' && appCadTool.isActive) return;
        L.DomEvent.stopPropagation(e);
        pill()?.classList.toggle('pinned');
    });
    if (AppState.projectDistanceLabelsGroup) {
        AppState.projectDistanceLabelsGroup.addLayer(hitLine);
        AppState.projectDistanceLabelsGroup.addLayer(badgeMarker);
    }
}

// Tính diện tích đa giác trắc địa theo công thức Gauss (Shoelace formula)
function calcGaussPolygonArea(pts) {
    const n = pts.length;
    if (n < 3) return 0;

    let hasAllXY = true;
    for (let i = 0; i < n; i++) {
        const x = parseFloat(pts[i].x);
        const y = parseFloat(pts[i].y);
        if (isNaN(x) || isNaN(y) || x === 0 || y === 0) {
            hasAllXY = false;
            break;
        }
    }

    if (hasAllXY) {
        let sum = 0;
        for (let i = 0; i < n; i++) {
            const next = (i + 1) % n;
            const xi = parseFloat(pts[i].x);
            const yi = parseFloat(pts[i].y);
            const xNext = parseFloat(pts[next].x);
            const yNext = parseFloat(pts[next].y);
            sum += (xi * yNext - xNext * yi);
        }
        return Math.abs(sum) / 2.0;
    }

    // Fallback mặt cầu WGS-84
    const R = 6378137;
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const lat1 = parseFloat(pts[i].lat) * Math.PI / 180;
        const lon1 = parseFloat(pts[i].lng) * Math.PI / 180;
        const lat2 = parseFloat(pts[next].lat) * Math.PI / 180;
        const lon2 = parseFloat(pts[next].lng) * Math.PI / 180;
        sum += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs(sum * R * R / 4.0);
}

// ================= 7. PHÂN HỆ BẢN ĐỒ LEAFLET (MAP VIEWER & PICKER) =================
const appMap = {
    initMap() {
        this.initRightControlsDrag();
        if (AppState.leafletMap) {
            setTimeout(() => AppState.leafletMap.invalidateSize(), 200);
            return;
        }
    },

    initRightControlsDrag() {
        if (typeof window === 'undefined') return;
        const container = document.getElementById('mapRightControls') || document.querySelector('.map-right-controls');
        const handle = document.getElementById('dragHandleRightControls');
        if (!container || container._hasDragInit) return;
        container._hasDragInit = true;

        // Khôi phục vị trí lưu trước đó nếu có
        try {
            const savedTop = localStorage.getItem('vn2k_right_controls_top');
            if (savedTop) {
                const parsed = parseInt(savedTop, 10);
                if (!isNaN(parsed) && parsed >= 50 && parsed <= window.innerHeight - 100) {
                    container.style.top = `${parsed}px`;
                }
            }
        } catch (e) {}

        let isDragging = false;
        let startY = 0;
        let initTop = 0;

        const onStart = (e) => {
            // Không can thiệp nếu bấm trực tiếp vào nút chức năng
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            isDragging = true;
            const pt = e.touches ? e.touches[0] : e;
            startY = pt.clientY;
            const rect = container.getBoundingClientRect();
            initTop = rect.top;
            container.style.transition = 'none';
            if (handle) handle.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
            const pt = e.touches ? e.touches[0] : e;
            const dy = pt.clientY - startY;

            let newTop = initTop + dy;
            const minTop = 60; // Dưới header
            const maxTop = window.innerHeight - container.offsetHeight - 50; // Trên bottom bar

            newTop = Math.max(minTop, Math.min(newTop, maxTop));
            container.style.top = `${newTop}px`;
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            if (handle) handle.style.cursor = 'grab';
            container.style.transition = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);

            // Lưu lại vị trí để khi chuyển trang / mở lại vẫn giữ nguyên
            try {
                const curTop = parseInt(container.style.top, 10);
                if (!isNaN(curTop)) {
                    localStorage.setItem('vn2k_right_controls_top', curTop.toString());
                }
            } catch (e) {}
        };

        const target = handle || container;
        target.addEventListener('mousedown', onStart);
        target.addEventListener('touchstart', onStart, { passive: true });
        container.addEventListener('mousedown', onStart);
        container.addEventListener('touchstart', onStart, { passive: true });

        // Khởi tạo bản đồ Leaflet - Hỗ trợ siêu phóng to mức 24 phục vụ vẽ CAD chi tiết từng centimet
        const map = L.map('leaflet-map', {
            zoomControl: false,
            attributionControl: false,
            maxZoom: 24,
            minZoom: 4
        }).setView([10.5, 106.0], 12);

        // Lớp vệ tinh Google Hybrid (chuẩn sắc nét ngoài thực địa, nội suy siêu nét lên mức 24)
        const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 24,
            maxNativeZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        // Lớp OpenStreetMap đường phố (nội suy lên mức 24)
        const osmStreets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 24,
            maxNativeZoom: 19
        });

        googleHybrid.addTo(map);
        AppState.baseLayers['google_hybrid'] = googleHybrid;
        AppState.baseLayers['osm_streets'] = osmStreets;

        AppState.projectMarkersGroup = L.layerGroup().addTo(map);
        AppState.projectDistanceLabelsGroup = L.layerGroup().addTo(map);

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

        appSettings.applyToMap(map);

        setTimeout(() => map.invalidateSize(), 250);
    },

    toggleMapLayer() {
        const map = AppState.leafletMap;
        if (!map) return;
        if (AppState.activeBaseLayerId === 'google_hybrid') {
            map.removeLayer(AppState.baseLayers['google_hybrid']);
            AppState.baseLayers['osm_streets'].addTo(map);
            AppState.activeBaseLayerId = 'osm_streets';
            appSettings.save();
            showToast("🗺️ Bản đồ Đường phố (OSM)");
        } else {
            map.removeLayer(AppState.baseLayers['osm_streets']);
            AppState.baseLayers['google_hybrid'].addTo(map);
            AppState.activeBaseLayerId = 'google_hybrid';
            appSettings.save();
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
            appSettings.save();
            if (btn) btn.classList.remove('active');
            showToast("Đã ẩn ranh giới 34 Tỉnh thành");
        } else {
            AppState.layer34Prov.addTo(AppState.leafletMap);
            AppState.is34ProvVisible = true;
            appSettings.save();
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
            appSettings.save();
            if (btn) btn.classList.remove('active');
            showToast("Đã ẩn ranh giới xã Đồng Tháp");
        } else {
            AppState.layerDtCommunes.addTo(AppState.leafletMap);
            AppState.isDtCommunesVisible = true;
            appSettings.save();
            if (btn) btn.classList.add('active');
            showToast("✓ Đã hiển thị ranh giới xã Đồng Tháp");
        }
    },

    populateMapProjectSelect(selectedProjectName = null) {
        const sel = document.getElementById('selMapProjectFiles');
        if (!sel) return;
        sel.innerHTML = '';

        // Tùy chọn 1: [Bản đồ mới] không mở sẵn dự án nào
        const emptyOpt = document.createElement('option');
        emptyOpt.value = "";
        emptyOpt.innerText = "🗺️ [Bản đồ mới] Chọn dự án để nạp...";
        sel.appendChild(emptyOpt);

        AppState.projectsList.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            const ptsCount = appData.getPoints(name).length;
            opt.innerText = `📁 ${name} (${ptsCount} mốc)`;
            if (selectedProjectName && name === selectedProjectName) {
                opt.selected = true;
            }
            sel.appendChild(opt);
        });

        if (!selectedProjectName) {
            emptyOpt.selected = true;
        }
    },

    quickCreateProject() {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        const defaultName = `DuAn_${dateStr}_${Math.floor(Math.random()*900+100)}.csv`;
        let name = prompt("Nhập tên dự án mới (.csv):", defaultName);
        if (!name) return;
        name = name.trim();
        if (!name) return;
        if (!name.toLowerCase().endsWith('.csv')) name += '.csv';

        if (!AppState.projectsList.includes(name)) {
            AppState.projectsList.push(name);
            appData.saveProjectsList();
        }
        AppState.currentProject = name;
        localStorage.setItem('vn2k_cur_project', AppState.currentProject);
        appData.savePoints(name, []);
        appData.populateProjectSelect();
        appNav.updateTreeNavState();
        appNav.updateBanner();

        // Cập nhật lại dropdown và chọn dự án mới này
        appMap.populateMapProjectSelect(name);

        // Làm sạch các mốc và HUD đo cũ trên bản đồ
        if (AppState.projectMarkersGroup) AppState.projectMarkersGroup.clearLayers();
        if (AppState.projectDistanceLabelsGroup) AppState.projectDistanceLabelsGroup.clearLayers();
        if (AppState.projectPolygonLayer && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
            AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
            AppState.projectPolygonLayer = null;
        }
        const hud = document.getElementById('mapDistanceHud');
        if (hud) hud.style.display = 'none';

        showToast(`✓ Đã tạo dự án mới: "${name}". Bản đồ mới sẵn sàng!`, true);
    },

    onMapProjectChange(projectName) {
        if (!projectName) {
            // Người dùng chọn "[Bản đồ mới]" -> Làm sạch bản đồ
            if (AppState.projectMarkersGroup) AppState.projectMarkersGroup.clearLayers();
            if (AppState.projectDistanceLabelsGroup) AppState.projectDistanceLabelsGroup.clearLayers();
            if (AppState.projectPolygonLayer && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
                AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
                AppState.projectPolygonLayer = null;
            }
            if (typeof appCadTool !== 'undefined') {
                appCadTool.savedShapes = [];
                if (appCadTool.layers && appCadTool.layers.group) appCadTool.layers.group.clearLayers();
                const panel = document.getElementById('cadBlocksStatsPanel');
                if (panel) panel.style.display = 'none';
            }
            const hud = document.getElementById('mapDistanceHud');
            if (hud) hud.style.display = 'none';
            showToast("🗺️ Đã mở bản đồ mới (sạch)");
            return;
        }
        AppState.currentProject = projectName;
        localStorage.setItem('vn2k_cur_project', AppState.currentProject);
        appData.populateProjectSelect();
        appNav.updateTreeNavState();
        appNav.updateBanner();

        // Đồng bộ nạp khối CAD của dự án được chọn (hoặc tái tạo từ mốc nếu có shapeName)
        if (typeof appCadTool !== 'undefined') {
            appCadTool.savedShapes = [];
            if (!appCadTool.loadShapesForProject(projectName)) {
                appCadTool.reconstructShapesFromPoints(projectName);
            }
        }

        appMap.loadProjectMarkers();
        appMap.fitProjectBounds();
        showToast(`📁 Đã nạp và hiển thị dự án: ${projectName}`);
    },

    toggleDistanceDisplay() {
        AppState.showProjectDistance = !AppState.showProjectDistance;
        appSettings.save();
        const btn = document.getElementById('btnToggleDistance');
        const txt = document.getElementById('txtDistToggle');
        if (btn) btn.classList.toggle('active', AppState.showProjectDistance);
        if (txt) txt.innerText = AppState.showProjectDistance ? "Khoảng cách" : "Ẩn cự ly";
        appMap.loadProjectMarkers();
        showToast(AppState.showProjectDistance ? "📏 Đã BẬT hiển thị khoảng cách giữa các điểm" : "Đã ẨN khoảng cách");
    },

    togglePolygonClose() {
        AppState.isPolygonClosed = !AppState.isPolygonClosed;
        const btn = document.getElementById('btnTogglePolygon');
        if (btn) btn.classList.toggle('active', AppState.isPolygonClosed);
        appMap.loadProjectMarkers();
        showToast(AppState.isPolygonClosed ? "📐 Đã khép góc đa giác & tính diện tích!" : "Đã mở tuyến đường chuyền");
    },

    startMeasureFromPoint(idx) {
        const pts = appData.getPoints(AppState.currentProject);
        if (!pts || !pts[idx]) return;
        AppState.measureStartPoint = pts[idx];
        if (AppState.leafletMap) AppState.leafletMap.closePopup();
        showToast(`📏 Đã chọn mốc "${pts[idx].name || ('Mốc ' + (idx + 1))}"! Chạm vào mốc khác để xem khoảng cách.`, true);
    },

    showPointMeasurement(pA, pB) {
        if (!pA || !pB || !AppState.leafletMap) return;

        const latA = parseFloat(pA.lat);
        const lngA = parseFloat(pA.lng);
        const latB = parseFloat(pB.lat);
        const lngB = parseFloat(pB.lng);

        const xA = parseFloat(pA.x);
        const yA = parseFloat(pA.y);
        const xB = parseFloat(pB.x);
        const yB = parseFloat(pB.y);

        let dist = 0;
        let dx = 0;
        let dy = 0;

        if (!isNaN(xA) && !isNaN(yA) && !isNaN(xB) && !isNaN(yB) && xA !== 0 && xB !== 0) {
            dx = xB - xA;
            dy = yB - yA;
            dist = Math.sqrt(dx * dx + dy * dy);
        } else {
            const geo = calcGeoDistanceAndAzimuth(latA, lngA, latB, lngB);
            dist = geo.distance;
        }

        const geo = calcGeoDistanceAndAzimuth(latA, lngA, latB, lngB);
        const distStr = dist < 1000 ? `${dist.toFixed(2)} m` : `${(dist / 1000).toFixed(3)} km`;
        const azStr = `${geo.azimuth.toFixed(1)}°`;

        // Vẽ đường đo màu vàng nổi bật
        if (AppState.measureActiveLine && AppState.leafletMap.hasLayer(AppState.measureActiveLine)) {
            AppState.leafletMap.removeLayer(AppState.measureActiveLine);
        }
        AppState.measureActiveLine = L.polyline([[latA, lngA], [latB, lngB]], {
            color: '#fbbf24',
            weight: 3.5,
            dashArray: '8, 8'
        }).addTo(AppState.leafletMap);

        // Hiển thị hộp thông tin kết quả đo
        const box = document.getElementById('mapPointMeasureBox');
        const details = document.getElementById('measureDetails');
        if (box && details) {
            details.innerHTML = `
                <div style="margin-bottom: 4px;"><b>Đoạn:</b> <span style="color:#38bdf8; font-weight:700;">${pA.name || 'Mốc A'}</span> ➔ <span style="color:#fde047; font-weight:700;">${pB.name || 'Mốc B'}</span></div>
                <div style="font-size: 13.5px; font-weight: 800; color: #fde047; margin-bottom: 4px;">• Cự ly phẳng: ${distStr}</div>
                <div style="color: #cbd5e1; font-size: 11.5px;">• Góc phương vị: <b>${azStr}</b> | <b>ΔX:</b> ${dx >= 0 ? '+' : ''}${dx.toFixed(2)} m | <b>ΔY:</b> ${dy >= 0 ? '+' : ''}${dy.toFixed(2)} m</div>
            `;
            box.style.display = 'block';
        }
    },

    clearPointMeasure() {
        if (AppState.measureActiveLine && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.measureActiveLine)) {
            AppState.leafletMap.removeLayer(AppState.measureActiveLine);
            AppState.measureActiveLine = null;
        }
        AppState.measureStartPoint = null;
        const box = document.getElementById('mapPointMeasureBox');
        if (box) box.style.display = 'none';
    },

    loadProjectMarkers() {
        if (!AppState.projectMarkersGroup || !AppState.leafletMap) return;
        AppState.projectMarkersGroup.clearLayers();
        if (AppState.projectDistanceLabelsGroup) {
            AppState.projectDistanceLabelsGroup.clearLayers();
        }
        if (AppState.projectPolygonLayer && AppState.leafletMap && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
            AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
            AppState.projectPolygonLayer = null;
        }

        appMap.populateMapProjectSelect(AppState.currentProject);

        const pts = appData.getPoints(AppState.currentProject);
        if (!pts || pts.length === 0) {
            const hud = document.getElementById('mapDistanceHud');
            if (hud) hud.style.display = 'none';
            return;
        }

        // 1. Kiểm tra xem dự án có khối CAD nào không (hoặc CAD Mini đang hoạt động)
        const isCadActive = typeof appCadTool !== 'undefined' && appCadTool.isActive;
        let hasCadShapes = false;
        if (typeof appCadTool !== 'undefined') {
            hasCadShapes = appCadTool.hasShapesForProject(AppState.currentProject);
            if (!hasCadShapes && AppState.currentProject) {
                // Thử nạp hoặc tái tạo từ mốc nếu mốc chứa shapeName
                hasCadShapes = appCadTool.loadShapesForProject(AppState.currentProject);
            }
        }

        if (typeof appCadTool !== 'undefined' && (isCadActive || hasCadShapes)) {
            const hudEl = document.getElementById('mapDistanceHud');
            if (hudEl) hudEl.style.display = 'none';
            appCadTool.ensureLayers();
            if (hasCadShapes) {
                appCadTool.loadShapesForProject(AppState.currentProject);
            }
            appCadTool.renderGeometry();
            if (appCadTool.renderBlocksPanel) appCadTool.renderBlocksPanel();
        } else if (typeof appCadTool !== 'undefined') {
            // Dọn sạch khối CAD nếu dự án hiện tại không có hình CAD để không vẽ đè rác cũ
            appCadTool.savedShapes = [];
            if (appCadTool.layers && appCadTool.layers.group) appCadTool.layers.group.clearLayers();
            const panel = document.getElementById('cadBlocksStatsPanel');
            if (panel) panel.style.display = 'none';
        }

        // 2. Nạp các mốc dự án lên bản đồ để người dùng quan sát và bắt điểm (Snap)
        // Mặc định: Hiển thị chấm mốc tinh gọn (map-proj-point-dot), ẨN nhãn số thứ tự, chỉ bung ra khi rê chuột đến
        const validCoords = [];
        const validPoints = [];

        // Tập hợp tọa độ đỉnh CAD đã được render (để tránh vẽ đè 2 marker lên cùng 1 tọa độ)
        const cadPointKeys = new Set();
        if ((hasCadShapes || isCadActive) && typeof appCadTool !== 'undefined' && appCadTool.savedShapes) {
            appCadTool.savedShapes.forEach(s => {
                (s.vertices || []).forEach(v => {
                    if (isFinite(v.lat) && isFinite(v.lng)) {
                        cadPointKeys.add(v.lat.toFixed(6) + '_' + v.lng.toFixed(6));
                    }
                });
            });
        }

        pts.forEach((p, idx) => {
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

            validCoords.push([lat, lng]);
            validPoints.push(p);

            // Bỏ qua vẽ marker chấm tròn dự án nếu đỉnh này đã được MiniCAD vẽ badge đỉnh tương tác
            const ptKey = lat.toFixed(6) + '_' + lng.toFixed(6);
            if (cadPointKeys.has(ptKey)) return;

            // Chấm mốc định vị tinh gọn (8px), rê chuột vào bung badge hiển thị tên & số thứ tự
            const pointName = p.name || ('M' + (idx + 1));
            const iconHtml = `<div class="map-proj-point-dot" title="${idx + 1}. ${pointName} (X: ${p.x || '--'}, Y: ${p.y || '--'}) - Rê chuột để xem, bấm để chọn">${idx + 1}</div>`;
            const customIcon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 1500 });

            marker.on('mouseover', () => {
                marker.getElement()?.querySelector('.map-proj-point-dot')?.classList.add('expanded');
            });
            marker.on('mouseout', () => {
                marker.getElement()?.querySelector('.map-proj-point-dot')?.classList.remove('expanded');
            });

            marker.on('click', () => {
                if (AppState.measureStartPoint && AppState.measureStartPoint !== p) {
                    appMap.showPointMeasurement(AppState.measureStartPoint, p);
                    AppState.measureStartPoint = null;
                }
            });

            marker.bindPopup(`
                <div style="font-family:-apple-system, sans-serif; font-size:12px; line-height:1.5;">
                    <b style="color:#e11d48; font-size:13px;">📌 ${idx + 1}. ${pointName}</b><br>
                    <b>X:</b> ${p.x || '--'} m<br>
                    <b>Y:</b> ${p.y || '--'} m<br>
                    <b>Lat:</b> ${p.lat}° | <b>Lng:</b> ${p.lng}°<br>
                    <b>Ghi chú:</b> ${p.note || 'Không'}<br>
                    <button onclick="appMap.loadPointDirect('${p.lat}', '${p.lng}', '${p.x}', '${p.y}')" style="margin-top:6px; background:#1565C0; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-weight:700; width:100%; cursor:pointer;">
                        📌 NẠP VÀO MÀN HÌNH CHÍNH
                    </button>
                    <button onclick="appMap.startMeasureFromPoint(${idx})" style="margin-top:4px; background:#d97706; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-weight:700; width:100%; cursor:pointer;">
                        📏 ĐO KHOẢNG CÁCH TỪ ĐIỂM NÀY
                    </button>
                </div>
            `);
            AppState.projectMarkersGroup.addLayer(marker);
        });

        const n = validPoints.length;

        // 3. Đường nối tuyến hoặc đa giác khép góc:
        // QUY TẮC AN TOÀN TRÁNH NỐI MẠNG NHỆN LỘN XỘN:
        // - Nếu đang ở MiniCAD hoặc dự án đã có khối CAD: KHÔNG vẽ projectPolyline (MiniCAD tự vẽ đúng ranh đất các thửa).
        // - Nếu ở bản đồ thường: CHỈ vẽ polyline KHI người dùng bấm BẬT "Khép góc" (AppState.isPolygonClosed === true)!
        //   Tuyệt đối KHÔNG tự ý nối 1->2->3...->n khi chỉ mở bản đồ xem mốc!
        if (!isCadActive && !hasCadShapes && AppState.isPolygonClosed && n >= 3) {
            let totalDist = 0;
            let segmentCount = 0;

            const lineCoords = validCoords.slice();
            lineCoords.push(validCoords[0]); // Nối khép góc về điểm đầu

            AppState.projectPolyline = L.polyline(lineCoords, {
                color: '#38bdf8',
                weight: 2.5,
                dashArray: '5, 8'
            });
            AppState.projectMarkersGroup.addLayer(AppState.projectPolyline);

            // Tính khoảng cách từng đoạn và đoạn khép góc (Ẩn mặc định, rê chuột mới hiện)
            for (let i = 0; i < n; i++) {
                const pA = validPoints[i];
                const pB = validPoints[(i + 1) % n];
                const segDist = calcPointsDistance(pA, pB);
                totalDist += segDist;
                segmentCount++;
                addDistanceBadge(pA, pB, segDist);
            }

            // Vẽ Polygon đa giác
            AppState.projectPolygonLayer = L.polygon(validCoords, {
                color: '#10b981',
                weight: 2,
                fillColor: '#34d399',
                fillOpacity: 0.15
            }).addTo(AppState.leafletMap);

            // Tính diện tích đa giác theo công thức Gauss
            const area = calcGaussPolygonArea(validPoints);
            const areaContainer = document.getElementById('hudAreaContainer');
            const areaVal = document.getElementById('hudPolygonArea');
            if (areaContainer && areaVal) {
                areaContainer.style.display = 'inline-flex';
                if (area >= 10000) {
                    areaVal.innerText = `${area.toLocaleString('vi-VN', {maximumFractionDigits: 1})} m² (${(area / 10000).toFixed(3)} ha)`;
                } else {
                    areaVal.innerText = `${area.toLocaleString('vi-VN', {maximumFractionDigits: 1})} m² (${(area / 1000).toFixed(2)} công)`;
                }
            }

            // Cập nhật thanh HUD khoảng cách
            const hud = document.getElementById('mapDistanceHud');
            const totalDistEl = document.getElementById('hudTotalDistance');
            const segCountEl = document.getElementById('hudSegmentsCount');
            const btnPoly = document.getElementById('btnTogglePolygon');

            if (hud) hud.style.display = 'flex';
            if (totalDistEl) {
                totalDistEl.innerText = totalDist < 1000 
                    ? `${totalDist.toFixed(1)} m` 
                    : `${(totalDist / 1000).toFixed(2)} km`;
            }
            if (segCountEl) segCountEl.innerText = segmentCount;
            if (btnPoly) btnPoly.classList.add('active');
        } else {
            const areaContainer = document.getElementById('hudAreaContainer');
            if (areaContainer) areaContainer.style.display = 'none';
            const hud = document.getElementById('mapDistanceHud');
            if (hud) hud.style.display = 'none';
            const btnPoly = document.getElementById('btnTogglePolygon');
            if (btnPoly) btnPoly.classList.remove('active');
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
        triggerHaptic('light');
        if (typeof appCadTool !== 'undefined' && appCadTool.isActive) {
            appCadTool.handleMapClick(lat, lng);
            return;
        }
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
            note: "Chấm trên bản đồ",
            project: AppState.currentProject
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
        if (sel) {
            sel.innerHTML = '';
            AppState.projectsList.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                if (name === AppState.currentProject) opt.selected = true;
                sel.appendChild(opt);
            });
        }
        const cntEl = document.getElementById('txtPointsCount');
        if (cntEl) cntEl.innerText = appData.getPoints(AppState.currentProject).length;

        // Đồng bộ luôn dropdown trên bản đồ dự án
        if (window.appMap && appMap.populateMapProjectSelect) {
            appMap.populateMapProjectSelect();
        }
    },

    getPoints(projectName) {
        const key = `vn2k_pts_${projectName}`;
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
                // Đảm bảo từng mốc luôn mang thuộc tính project chuẩn xác
                list.forEach(p => {
                    if (!p.project) p.project = projectName;
                });
                return list;
            }
            return [];
        } catch (e) {
            return [];
        }
    },

    savePoints(projectName, points) {
        const key = `vn2k_pts_${projectName}`;
        localStorage.setItem(key, JSON.stringify(points));
    },

    addPoint(projectName, point) {
        const proj = projectName || AppState.currentProject;
        point.project = proj;
        const pts = appData.getPoints(proj);
        pts.push(point);
        appData.savePoints(proj, pts);
        appNav.updateBanner();
        if (AppState.currentScreen === 'datamgmt') {
            appData.refreshTable();
        }
        if (AppState.storageMode === 'auto_google' && AppState.googleScriptUrl) {
            appData.syncSinglePointToGoogle(point, proj);
        }
        appData.updateSyncUI();
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

        // Cập nhật số mốc trực quan trên các nút bấm đồng bộ
        const curPts = appData.getPoints(AppState.currentProject);
        const curShort = AppState.currentProject.replace(/\.csv$/i, '');
        const btnSyncCur = document.getElementById('btnSyncCurrentProject') || document.getElementById('btnSyncGoogleSheets');
        if (btnSyncCur) {
            btnSyncCur.innerHTML = `☁️ ĐỒNG BỘ DỰ ÁN NÀY ("${curShort}" - ${curPts.length} mốc)`;
        }

        const btnSyncAll = document.getElementById('btnSyncAllProjects');
        if (btnSyncAll) {
            let totalPts = 0;
            AppState.projectsList.forEach(p => {
                totalPts += appData.getPoints(p).length;
            });
            btnSyncAll.innerHTML = `🌐 ĐỒNG BỘ TẤT CẢ DỰ ÁN (${AppState.projectsList.length} dự án - ${totalPts} mốc)`;
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

    syncToGoogleSheets(mode = 'current') {
        if (mode === 'all') {
            appData.syncAllProjectsToGoogle();
        } else {
            appData.syncCurrentProjectToGoogle();
        }
    },

    syncCurrentProjectToGoogle() {
        if (!AppState.googleScriptUrl) {
            showToast("⚠️ Bạn chưa cài đặt link Google Apps Script URL!", true);
            appModal.openGoogleConfig();
            return;
        }

        const proj = AppState.currentProject;
        const pts = appData.getPoints(proj);
        if (pts.length === 0) {
            showToast(`⚠️ Dự án "${proj}" hiện chưa có mốc nào để đồng bộ!`, true);
            return;
        }

        const btn = document.getElementById('btnSyncCurrentProject') || document.getElementById('btnSyncGoogleSheets');
        const origText = btn ? btn.innerText : '';
        if (btn) {
            btn.innerText = `⏳ Đang gửi ${pts.length} mốc của "${proj}"...`;
            btn.disabled = true;
        }

        const pointsToSend = pts.map(p => {
            const copy = Object.assign({}, p);
            copy.project = proj;
            copy.shapeName = copy.shapeName || copy.blockName || '';
            copy.shapeMode = copy.shapeMode || (copy.mode === 'polyline' ? 'Tuyến' : (copy.mode === 'polygon' ? 'Đa giác' : ''));
            copy.shapeOrder = copy.shapeOrder || '';
            return copy;
        });

        // Gom danh sách các thửa / khối đã lưu của dự án để gửi lên Tab 2 "Tổng Hợp Diện Tích"
        let shapesToSend = [];
        try {
            if (typeof appCadTool !== 'undefined' && appCadTool.loadShapesForProject) {
                appCadTool.loadShapesForProject(proj);
                if (appCadTool.savedShapes && appCadTool.savedShapes.length > 0) {
                    shapesToSend = appCadTool.savedShapes.map((s, idx) => {
                        const stats = s.stats || (appCadTool.calculateAreaAndPerimeter ? appCadTool.calculateAreaAndPerimeter(s.vertices, s.mode) : {});
                        return {
                            project: proj,
                            order: idx + 1,
                            name: s.name || `Thửa ${idx + 1}`,
                            mode: s.mode === 'polyline' ? 'Tuyến' : 'Đa giác',
                            vertexCount: (s.vertices || []).length,
                            area: parseFloat((stats.area || 0).toFixed(2)),
                            ha: parseFloat(((stats.area || 0) / 10000.0).toFixed(4)),
                            perimeter: parseFloat((stats.perimeter || 0).toFixed(2)),
                            color: s.color || '#10b981',
                            note: s.isSnapped ? 'Hít mốc' : 'Vẽ tự do'
                        };
                    });
                }
            }
        } catch (e) {
            console.warn('Lỗi chuẩn bị danh sách thửa đất gửi Google Sheet:', e);
        }

        const payload = {
            action: 'bulk_sync',
            project: proj,
            points: pointsToSend,
            shapes: shapesToSend
        };

        fetch(AppState.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            showToast(`✓ Đã đồng bộ ${pts.length} mốc của dự án "${proj}" lên tab "Sổ Đo Tọa Độ"!`, true);
        }).catch(err => {
            showToast(`⚠️ Không thể gửi dữ liệu: ${err.message}`, true);
        }).finally(() => {
            if (btn) {
                btn.innerText = origText;
                btn.disabled = false;
            }
        });
    },

    syncAllProjectsToGoogle() {
        if (!AppState.googleScriptUrl) {
            showToast("⚠️ Bạn chưa cài đặt link Google Apps Script URL!", true);
            appModal.openGoogleConfig();
            return;
        }

        const allPoints = [];
        const allShapes = [];

        AppState.projectsList.forEach(proj => {
            const pts = appData.getPoints(proj);
            pts.forEach(p => {
                const copy = Object.assign({}, p);
                copy.project = proj;
                copy.shapeName = copy.shapeName || copy.blockName || '';
                copy.shapeMode = copy.shapeMode || (copy.mode === 'polyline' ? 'Tuyến' : (copy.mode === 'polygon' ? 'Đa giác' : ''));
                copy.shapeOrder = copy.shapeOrder || '';
                allPoints.push(copy);
            });

            try {
                if (typeof appCadTool !== 'undefined' && appCadTool.loadShapesForProject) {
                    appCadTool.loadShapesForProject(proj);
                    if (appCadTool.savedShapes && appCadTool.savedShapes.length > 0) {
                        appCadTool.savedShapes.forEach((s, idx) => {
                            const stats = s.stats || (appCadTool.calculateAreaAndPerimeter ? appCadTool.calculateAreaAndPerimeter(s.vertices, s.mode) : {});
                            allShapes.push({
                                project: proj,
                                order: idx + 1,
                                name: s.name || `Thửa ${idx + 1}`,
                                mode: s.mode === 'polyline' ? 'Tuyến' : 'Đa giác',
                                vertexCount: (s.vertices || []).length,
                                area: parseFloat((stats.area || 0).toFixed(2)),
                                ha: parseFloat(((stats.area || 0) / 10000.0).toFixed(4)),
                                perimeter: parseFloat((stats.perimeter || 0).toFixed(2)),
                                color: s.color || '#10b981',
                                note: s.isSnapped ? 'Hít mốc' : 'Vẽ tự do'
                            });
                        });
                    }
                }
            } catch (e) {
                console.warn(`Lỗi gom thửa đất dự án ${proj}:`, e);
            }
        });

        if (allPoints.length === 0 && allShapes.length === 0) {
            showToast("⚠️ Tất cả các dự án hiện chưa có mốc nào để đồng bộ!", true);
            return;
        }

        const btn = document.getElementById('btnSyncAllProjects');
        const origText = btn ? btn.innerText : '';
        if (btn) {
            btn.innerText = `⏳ Đang gửi ${allPoints.length} mốc, ${allShapes.length} thửa (${AppState.projectsList.length} dự án)...`;
            btn.disabled = true;
        }

        const payload = {
            action: 'bulk_sync',
            points: allPoints,
            shapes: allShapes
        };

        fetch(AppState.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            showToast(`✓ Đã đồng bộ thành công ${allPoints.length} mốc từ ${AppState.projectsList.length} dự án lên tab "Sổ Đo Tọa Độ"!`, true);
        }).catch(err => {
            showToast(`⚠️ Không thể gửi dữ liệu: ${err.message}`, true);
        }).finally(() => {
            if (btn) {
                btn.innerText = origText;
                btn.disabled = false;
            }
        });
    },

    syncSinglePointToGoogle(point, projectName) {
        const proj = projectName || point.project || AppState.currentProject;
        point.project = proj;
        if (AppState.storageMode !== 'auto_google' || !AppState.googleScriptUrl) return;

        // Nếu thiết bị đang ngoại tuyến hoàn toàn, đẩy vào hàng đợi tự động
        if (!navigator.onLine) {
            AppState.offlineQueue.push({ project: proj, point: point });
            localStorage.setItem('vn2k_offline_queue', JSON.stringify(AppState.offlineQueue));
            showToast(`📍 Đã lưu mốc vào hàng đợi (tự gửi khi có mạng)`, true);
            return;
        }

        const payload = {
            action: 'add_point',
            project: proj,
            point: {
                ...point,
                shapeName: point.shapeName || point.blockName || '',
                shapeMode: point.shapeMode || (point.mode === 'polyline' ? 'Tuyến' : (point.mode === 'polygon' ? 'Đa giác' : '')),
                shapeOrder: point.shapeOrder || ''
            }
        };

        fetch(AppState.googleScriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            console.log(`[Google Sync] Đã gửi mốc "${point.name}" của dự án "${proj}" lên Google Sheets`);
        }).catch(err => {
            console.warn(`[Google Sync] Lỗi gửi mốc ngầm, đưa vào hàng đợi:`, err);
            AppState.offlineQueue.push({ project: proj, point: point });
            localStorage.setItem('vn2k_offline_queue', JSON.stringify(AppState.offlineQueue));
        });
    },

    flushOfflineQueue() {
        if (!AppState.googleScriptUrl || AppState.offlineQueue.length === 0) return;
        const count = AppState.offlineQueue.length;
        console.log(`[Google Sync] Đang gửi ${count} mốc từ hàng đợi ngoại tuyến...`);

        // Đảm bảo từng mốc mang đúng tên dự án của chính nó và bảo toàn khối CAD
        const pointsToSend = AppState.offlineQueue.map(item => {
            const pt = Object.assign({}, item.point);
            pt.project = item.project || pt.project || AppState.currentProject;
            pt.shapeName = pt.shapeName || pt.blockName || '';
            pt.shapeMode = pt.shapeMode || (pt.mode === 'polyline' ? 'Tuyến' : (pt.mode === 'polygon' ? 'Đa giác' : ''));
            pt.shapeOrder = pt.shapeOrder || '';
            return pt;
        });

        const payload = {
            action: 'bulk_sync',
            points: pointsToSend
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
            project: 'Kiểm Tra Kết Nối',
            point: {
                time: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`,
                name: "Mốc Thử Nghiệm",
                shapeName: "Khối Thử Nghiệm",
                shapeMode: "Đa giác",
                shapeOrder: 1,
                x: "1144058.623",
                y: "539624.574",
                lat: "10.345211",
                lng: "106.113617",
                mui: AppState.muiVal,
                ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`,
                note: "Thử nghiệm kết nối từ PWA & MiniCAD",
                project: "Kiểm Tra Kết Nối"
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
            showToast("✅ Kết nối Google Apps Script thành công! (Dòng thử nghiệm 14 cột đã được ghi vào Sheet)", true);
        }).catch(err => {
            showToast(`❌ Thất bại: ${err.message}`, true);
        });
    },

    copyAppsScriptTemplate() {
        const scriptCode = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT ĐỒNG BỘ SỔ ĐO TRẮC ĐỊA VN-2000 & MINICAD PRO (V4.0)
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com) - Kiến Trúc Lưu Trữ Tập Trung 2 Tab
 * =========================================================================
 * TỐI ƯU HÓA ĐẶC BIỆT CHO DỮ LIỆU LỚN (BIG DATA):
 * 1. KHÔNG PHÂN MẢNH THÀNH NHIỀU TAB/SHEET CON:
 *    - Toàn bộ dữ liệu được quản lý tập trung và khoa học trên đúng 2 Tab chuẩn:
 *      • Tab 1: "Sổ Đo Tọa Độ" -> Toàn bộ mốc & đỉnh ranh giới (chuẩn 14 cột, lọc theo cột Dự Án, Thửa).
 *      • Tab 2: "Tổng Hợp Diện Tích" -> Bảng thống kê diện tích, chu vi, loại hình, số đỉnh của mọi thửa.
 * 2. TỰ ĐỘNG BẬT BỘ LỌC DỮ LIỆU (DATA FILTER):
 *    - Dễ dàng tra cứu, lọc xem từng dự án hoặc từng thửa đất chỉ với 1 click chuột.
 * 3. CƠ CHẾ CHỐNG TRÙNG LẶP & CẬP NHẬT THÔNG MINH (DEDUPLICATION & IN-PLACE UPDATE):
 *    - Đỉnh mốc: Khóa duy nhất theo [Dự Án + Khối + Tên Mốc + X + Y].
 *    - Thửa đất: Khóa theo [Dự Án + Tên Khối/Thửa]. Tự động cập nhật số liệu mới nhất nếu thửa đã có.
 * 4. TÍNH NĂNG CỨU HỘ & DỌN DẸP "gopVaLamSachSoDo()":
 *    - Tự động gom các tab cũ phân tán về đúng 2 Tab tập trung, dọn sạch tab rác.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận xử lý, vui lòng thử lại sau vài giây."
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var defaultProject = (data.project || "So_Do_Mac_Dinh").replace(/[:\\/?*\[\]]/g, "_").replace(/\.csv$/i, "");

    var pointSheetName = "Sổ Đo Tọa Độ";
    var areaSheetName = "Tổng Hợp Diện Tích";

    // 1. Quản lý Tab 1: "Sổ Đo Tọa Độ" (Lưu tập trung toàn bộ mốc & đỉnh ranh giới)
    var pointSheet = ss.getSheetByName(pointSheetName);
    if (!pointSheet) {
      var allSheets = ss.getSheets();
      if (allSheets.length > 0 && (allSheets[0].getName() === "Sheet1" || allSheets[0].getName() === "Trang tính1")) {
        allSheets[0].setName(pointSheetName);
        pointSheet = allSheets[0];
      } else {
        pointSheet = ss.insertSheet(pointSheetName, 0);
      }
    }
    if (pointSheet.getLastRow() === 0) {
      initPointSheetHeader(pointSheet);
    }

    var addedPointsCount = 0;
    var existingPointKeys = getExistingPointKeys(pointSheet);

    // Xử lý ghi mốc tọa độ vào Tab 1
    if (Array.isArray(data.points) && data.points.length > 0) {
      var pointRowsToAdd = [];

      data.points.forEach(function(p) {
        var pProj = String(p.project || defaultProject).replace(/\.csv$/i, "").trim();
        var pName = String(p.name || "Mốc").trim();
        var pShape = String(p.shapeName || p.blockName || p.shape || "").trim();
        var pX = parseFloat(p.x) || 0;
        var pY = parseFloat(p.y) || 0;
        var key = pProj.toLowerCase() + "_" + pShape.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

        if (!existingPointKeys[key]) {
          pointRowsToAdd.push(formatPointRow(p, pProj));
          existingPointKeys[key] = true;
          addedPointsCount++;
        }
      });

      if (pointRowsToAdd.length > 0) {
        var startRow = pointSheet.getLastRow() + 1;
        pointSheet.getRange(startRow, 1, pointRowsToAdd.length, pointRowsToAdd[0].length).setValues(pointRowsToAdd);
        formatPointDataRange(pointSheet, startRow, pointRowsToAdd.length);
        ensureFilterRange(pointSheet);
      }
    } else if (data.point) {
      var p = data.point;
      var pProj = String(p.project || defaultProject).replace(/\.csv$/i, "").trim();
      var pName = String(p.name || "Mốc").trim();
      var pShape = String(p.shapeName || p.blockName || p.shape || "").trim();
      var pX = parseFloat(p.x) || 0;
      var pY = parseFloat(p.y) || 0;
      var key = pProj.toLowerCase() + "_" + pShape.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

      if (!existingPointKeys[key]) {
        var rowData = formatPointRow(p, pProj);
        pointSheet.appendRow(rowData);
        var lastRow = pointSheet.getLastRow();
        formatPointDataRange(pointSheet, lastRow, 1);
        ensureFilterRange(pointSheet);
        addedPointsCount = 1;
      }
    }

    // 2. Quản lý Tab 2: "Tổng Hợp Diện Tích" (Lưu tập trung toàn bộ thửa đất / khối của mọi dự án)
    var addedShapesCount = 0;
    if (Array.isArray(data.shapes) && data.shapes.length > 0) {
      var areaSheet = ss.getSheetByName(areaSheetName);
      if (!areaSheet) {
        areaSheet = ss.insertSheet(areaSheetName, 1);
      }
      if (areaSheet.getLastRow() === 0) {
        initAreaSheetHeader(areaSheet);
      }

      var areaKeys = getExistingAreaKeys(areaSheet);
      var shapeRowsToAdd = [];
      var shapeUpdates = [];
      var nowStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd HH:mm:ss");

      data.shapes.forEach(function(s) {
        var sProj = String(s.project || defaultProject).replace(/\.csv$/i, "").trim();
        var sName = String(s.name || "Thửa").trim();
        var key = sProj.toLowerCase() + "_" + sName.toLowerCase();

        var rowValues = [
          nowStr,
          sProj,
          s.order || "--",
          sName,
          s.mode || "Đa giác",
          s.vertexCount || 0,
          parseFloat(s.area) || 0,
          parseFloat(s.ha) || 0,
          parseFloat(s.perimeter) || 0,
          s.color || "#10b981",
          s.note || ""
        ];

        if (areaKeys[key]) {
          shapeUpdates.push({ row: areaKeys[key], values: rowValues });
        } else {
          shapeRowsToAdd.push(rowValues);
          areaKeys[key] = true;
          addedShapesCount++;
        }
      });

      shapeUpdates.forEach(function(item) {
        areaSheet.getRange(item.row, 1, 1, item.values.length).setValues([item.values]);
      });

      if (shapeRowsToAdd.length > 0) {
        var aStartRow = areaSheet.getLastRow() + 1;
        areaSheet.getRange(aStartRow, 1, shapeRowsToAdd.length, shapeRowsToAdd[0].length).setValues(shapeRowsToAdd);
        formatAreaDataRange(areaSheet, aStartRow, shapeRowsToAdd.length);
      }

      ensureFilterRange(areaSheet);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      pointsAdded: addedPointsCount,
      shapesAdded: addedShapesCount,
      tabs: [pointSheetName, areaSheetName]
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

// Khởi tạo dòng tiêu đề Tab 1: "Sổ Đo Tọa Độ" (14 cột chuẩn hóa)
function initPointSheetHeader(sheet) {
  var headers = [
    "Thời Gian Đo", "Tên Điểm Mốc", "Khối / Thửa Đất", "Loại Hình", "STT Đỉnh",
    "Tọa Độ X (Bắc - m)", "Tọa Độ Y (Đông - m)", "Vĩ Độ (Lat - °)", "Kinh Độ (Long - °)",
    "Múi Chiếu", "Kinh Tuyến Trục", "Ghi Chú Hiện Trường", "Dự Án", "Vị Trí Google Maps"
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
  ensureFilterRange(sheet);
}

// Khởi tạo dòng tiêu đề Tab 2: "Tổng Hợp Diện Tích" (11 cột chuẩn hóa)
function initAreaSheetHeader(sheet) {
  var headers = [
    "Thời Gian Cập Nhật", "Dự Án", "STT", "Tên Khối / Thửa Đất", "Loại Hình",
    "Số Đỉnh", "Diện Tích (m²)", "Diện Tích (ha)", "Chu Vi / Chiều Dài (m)", "Mã Màu", "Ghi Chú"
  ];
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold")
             .setBackground("#0f172a")
             .setFontColor("#34d399")
             .setHorizontalAlignment("center")
             .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
  sheet.setFrozenRows(1);
  ensureFilterRange(sheet);
}

// Đảm bảo bộ lọc dữ liệu luôn bao quát toàn bộ bảng
function ensureFilterRange(sheet) {
  try {
    var lastRow = Math.max(sheet.getLastRow(), 2);
    var lastCol = Math.max(sheet.getLastColumn(), 11);
    var filter = sheet.getFilter();
    if (!filter) {
      sheet.getRange(1, 1, lastRow, lastCol).createFilter();
    }
  } catch(e) {}
}

// Định dạng dữ liệu một dòng mốc (Tab 1)
function formatPointRow(p, projectName) {
  var lat = parseFloat(p.lat) || 0;
  var lng = parseFloat(p.lng) || 0;
  var proj = String(p.project || projectName || "Mặc định").replace(/\.csv$/i, "").trim();
  var mapFormula = (lat !== 0 && lng !== 0) 
    ? '=HYPERLINK("https://www.google.com/maps?q=' + lat + ',' + lng + '"; "🗺️ Xem Vị Trí")'
    : "";

  var sName = String(p.shapeName || p.blockName || p.shape || "").trim();
  var sMode = String(p.shapeMode || (p.mode === 'polyline' ? 'Tuyến' : (p.mode === 'polygon' ? 'Đa giác' : '')) || "").trim();
  var sOrder = p.shapeOrder || p.vertexOrder || "";

  return [
    p.time || new Date(),
    p.name || "Mốc",
    sName || "Khối mặc định",
    sMode || "Đa giác",
    sOrder || "--",
    parseFloat(p.x) || p.x || 0,
    parseFloat(p.y) || p.y || 0,
    parseFloat(p.lat) || p.lat || 0,
    parseFloat(p.lng) || p.lng || 0,
    p.mui ? ("Múi " + p.mui + "°") : "Múi 3°",
    p.ktt || "",
    p.note || "",
    proj,
    mapFormula
  ];
}

// Định dạng vùng dữ liệu Tab 1: Sổ Đo Tọa Độ
function formatPointDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 6, numRows, 2).setNumberFormat("#,##0.000");
    sheet.getRange(startRow, 8, numRows, 2).setNumberFormat("0.000000");
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
    sheet.getRange(startRow, 3, numRows, 1).setFontWeight("bold").setFontColor("#059669");
    sheet.getRange(startRow, 4, numRows, 2).setHorizontalAlignment("center");
    sheet.getRange(startRow, 13, numRows, 1).setFontWeight("bold").setFontColor("#0284c7").setHorizontalAlignment("center");
    sheet.getRange(startRow, 14, numRows, 1).setHorizontalAlignment("center");

    var latLngValues = sheet.getRange(startRow, 8, numRows, 2).getValues();
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
    var mapRange = sheet.getRange(startRow, 14, numRows, 1);
    try {
      mapRange.setFormulasLocal(formulas);
    } catch (e) {
      mapRange.setValues(formulas);
    }
  } catch(e) {}
}

// Định dạng vùng dữ liệu Tab 2: Tổng Hợp Diện Tích
function formatAreaDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#0284c7").setHorizontalAlignment("center");
    sheet.getRange(startRow, 3, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 4, numRows, 1).setFontWeight("bold").setFontColor("#059669");
    sheet.getRange(startRow, 5, numRows, 2).setHorizontalAlignment("center");
    sheet.getRange(startRow, 7, numRows, 1).setNumberFormat("#,##0.00").setHorizontalAlignment("right");
    sheet.getRange(startRow, 8, numRows, 1).setNumberFormat("#,##0.0000").setHorizontalAlignment("right");
    sheet.getRange(startRow, 9, numRows, 1).setNumberFormat("#,##0.00").setHorizontalAlignment("right");
    sheet.getRange(startRow, 10, numRows, 1).setHorizontalAlignment("center");
  } catch(e) {}
}

// Lấy danh sách khóa mốc đã có (Tab 1)
function getExistingPointKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, Math.min(lastCol, 14)).getValues();
    var is14 = lastCol >= 14;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowName = String(row[1] || "").trim().toLowerCase();
      var rowShape = is14 ? String(row[2] || "").trim().toLowerCase() : "";
      var rowX = parseFloat(is14 ? row[5] : row[2]) || 0;
      var rowY = parseFloat(is14 ? row[6] : row[3]) || 0;
      var rowProj = String(is14 ? (row[12] || "") : (row[9] || "")).trim().toLowerCase().replace(/\.csv$/i, "");
      
      var key = rowProj + "_" + rowShape + "_" + rowName + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
      keys[key] = true;
      var fallbackKey = rowProj + "__" + rowName + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
      keys[fallbackKey] = true;
    }
  }
  return keys;
}

// Lấy danh sách khóa thửa đất đã có (Tab 2)
function getExistingAreaKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, Math.min(sheet.getLastColumn(), 5)).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var sProj = String(row[1] || "").trim().toLowerCase();
      var sName = String(row[3] || "").trim().toLowerCase();
      if (sProj || sName) {
        keys[sProj + "_" + sName] = i + 2;
      }
    }
  }
  return keys;
}

// HÀM TIỆN ÍCH DỌN DẸP & NÂNG CẤP: Gom các tab phân tán về đúng 2 Tab chuẩn
function gopVaLamSachSoDo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pointSheetName = "Sổ Đo Tọa Độ";
  var areaSheetName = "Tổng Hợp Diện Tích";

  var pointSheet = ss.getSheetByName(pointSheetName);
  if (!pointSheet) pointSheet = ss.insertSheet(pointSheetName, 0);
  if (pointSheet.getLastRow() === 0) initPointSheetHeader(pointSheet);

  var areaSheet = ss.getSheetByName(areaSheetName);
  if (!areaSheet) areaSheet = ss.insertSheet(areaSheetName, 1);
  if (areaSheet.getLastRow() === 0) initAreaSheetHeader(areaSheet);

  var existingPointKeys = getExistingPointKeys(pointSheet);
  var sheets = ss.getSheets();
  var totalImported = 0;
  var sheetsToDelete = [];

  sheets.forEach(function(sh) {
    var sName = sh.getName();
    if (sName === pointSheetName || sName === areaSheetName) return;

    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var numRows = lastRow - 1;
      var values = sh.getRange(2, 1, numRows, Math.min(sh.getLastColumn(), 14)).getValues();
      var rowsToAdd = [];

      for (var r = 0; r < values.length; r++) {
        var row = values[r];
        var rowTime = row[0] || new Date();
        var rowName = String(row[1] || "Mốc").trim();
        var rowShape = (row.length >= 14 && row[2]) ? String(row[2]).trim() : "Khối mặc định";
        var rowMode = (row.length >= 14 && row[3]) ? String(row[3]).trim() : "Đa giác";
        var rowOrder = (row.length >= 14 && row[4]) ? row[4] : (r + 1);
        
        var rowX = parseFloat(row.length >= 14 ? row[5] : row[2]) || 0;
        var rowY = parseFloat(row.length >= 14 ? row[6] : row[3]) || 0;
        var rowLat = parseFloat(row.length >= 14 ? row[7] : row[4]) || 0;
        var rowLng = parseFloat(row.length >= 14 ? row[8] : row[5]) || 0;
        var rowMui = (row.length >= 14 ? row[9] : row[6]) || "Múi 3°";
        var rowKtt = (row.length >= 14 ? row[10] : row[7]) || "";
        var rowNote = (row.length >= 14 ? row[11] : row[8]) || "";
        var rowProj = String((row.length >= 14 ? row[12] : row[9]) || sh.getName()).replace(/\.csv$/i, "").trim();

        var key = rowProj.toLowerCase() + "_" + rowShape.toLowerCase() + "_" + rowName.toLowerCase() + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
        if (!existingPointKeys[key] && (rowX !== 0 || rowLat !== 0)) {
          var mapFormula = (rowLat !== 0 && rowLng !== 0) 
            ? '=HYPERLINK("https://www.google.com/maps?q=' + rowLat + ',' + rowLng + '"; "🗺️ Xem Vị Trí")'
            : "";

          rowsToAdd.push([
            rowTime, rowName, rowShape, rowMode, rowOrder,
            rowX, rowY, rowLat, rowLng, rowMui, rowKtt, rowNote, rowProj, mapFormula
          ]);
          existingPointKeys[key] = true;
          totalImported++;
        }
      }

      if (rowsToAdd.length > 0) {
        var startRow = pointSheet.getLastRow() + 1;
        pointSheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd);
        formatPointDataRange(pointSheet, startRow, rowsToAdd.length);
      }
    }

    sheetsToDelete.push(sh);
  });

  sheetsToDelete.forEach(function(sh) {
    try {
      if (ss.getSheets().length > 2) {
        ss.deleteSheet(sh);
      }
    } catch(e) {}
  });

  ensureFilterRange(pointSheet);
  ensureFilterRange(areaSheet);
  return "✓ Đã gom và nâng cấp thành công " + totalImported + " mốc vào 2 Tab tập trung: 'Sổ Đo Tọa Độ' & 'Tổng Hợp Diện Tích'!";
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    version: "4.0",
    message: "Google Apps Script VN-2000 Pro & MiniCAD v4.0 (2-Tab Architecture) đã sẵn sàng!"
  })).setMimeType(ContentService.MimeType.JSON);
}`;
        copyToClipboard(scriptCode);
        showToast("📋 Đã sao chép mã Apps Script Pro v4.0! Mở Tiện ích mở rộng > Apps Script trên Google Sheet để dán.", true);
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
            const xVal = (p.x !== undefined && p.x !== null && !isNaN(parseFloat(p.x))) ? parseFloat(p.x).toFixed(3) : (p.x || '--');
            const yVal = (p.y !== undefined && p.y !== null && !isNaN(parseFloat(p.y))) ? parseFloat(p.y).toFixed(3) : (p.y || '--');
            const latVal = (p.lat !== undefined && p.lat !== null && !isNaN(parseFloat(p.lat))) ? parseFloat(p.lat).toFixed(7) : (p.lat || '--');
            const lngVal = (p.lng !== undefined && p.lng !== null && !isNaN(parseFloat(p.lng))) ? parseFloat(p.lng).toFixed(7) : (p.lng || '--');

            tr.innerHTML = `
                <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
                <td style="text-align: left;"><b style="color:#fbbf24;">${p.name || ('M' + (idx+1))}</b></td>
                <td style="text-align: right; padding-right: 12px; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${xVal}</td>
                <td style="text-align: right; padding-right: 12px; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${yVal}</td>
                <td style="text-align: right; padding-right: 12px; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; color: #cbd5e1;">${latVal}</td>
                <td style="text-align: right; padding-right: 12px; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums; color: #cbd5e1;">${lngVal}</td>
                <td style="text-align: left; font-family: inherit;">${p.note || ''}</td>
                <td style="text-align: center;">
                    <button class="btn-sm btn-blue" style="height:26px; padding:2px 8px; font-size:11px; display:inline-flex; align-items:center;" onclick="appMap.loadPointDirect('${p.lat}', '${p.lng}', '${p.x}', '${p.y}')" title="Nạp tọa độ mốc lên bản đồ">📌 Nạp</button>
                    <button class="btn-sm btn-red" style="height:26px; padding:2px 8px; font-size:11px; display:inline-flex; align-items:center;" onclick="appData.deletePoint(${p.id})" title="Xóa mốc đo">🗑️</button>
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
    exportExcelFile() {
        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length === 0) {
            showToast("⚠️ Dự án hiện chưa có mốc nào để xuất file!", true);
            return;
        }

        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "DuAn";
        
        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const headers = ["STT", "Thời Gian", "Tên Điểm", "Tọa Độ Ngang X", "Tọa Độ Đứng Y", "Cao Độ H", "Vĩ Độ (Lat)", "Kinh Độ (Long)", "Múi Chiếu", "Kinh Tuyến Trục", "Ghi Chú"];
            const rows = [headers];

            pts.forEach((p, idx) => {
                rows.push([
                    idx + 1,
                    p.time || '',
                    p.name || '',
                    parseFloat(parseFloat(p.x || 0).toFixed(3)),
                    parseFloat(parseFloat(p.y || 0).toFixed(3)),
                    parseFloat(parseFloat(p.h || 0).toFixed(3)),
                    parseFloat(parseFloat(p.lat || 0).toFixed(7)),
                    parseFloat(parseFloat(p.lng || 0).toFixed(7)),
                    p.mui || AppState.muiVal || 3,
                    p.ktt || (AppState.kttDeg ? (AppState.kttDeg + '°' + String(AppState.kttMin).padStart(2,'0') + "'") : "105°45'"),
                    p.note || ''
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 22 }];
            XLSX.utils.book_append_sheet(wb, ws, "DanhSach_Moc");

            // 4. Bổ sung Sheet Chú Thích & Hình Khối (nếu có)
            if (this.annotations && this.annotations.length > 0) {
                const annRows = [
                    ['DANH MỤC CHÚ THÍCH & HÌNH KHỐI KỸ THUẬT (MINICAD)'],
                    ['STT', 'Loại Đối Tượng', 'Tên / Nội Dung Ghi Chú', 'Kích Thước / Bán Kính', 'Diện Tích (m²)', 'Tọa Độ X (Bắc)', 'Tọa Độ Y (Đông)', 'Vĩ Độ (WGS84)', 'Kinh Độ (WGS84)', 'Màu Sắc']
                ];
                const typeLabels = {
                    arrow: 'Mũi tên chỉ dẫn',
                    north_arrow: 'La bàn hướng Bắc',
                    rect: 'Khối nhà / Công trình',
                    circle: 'Vùng đệm bảo vệ',
                    stamp: 'Tem nhãn thửa đất',
                    text: 'Chữ ghi chú'
                };
                this.annotations.forEach((ann, aIdx) => {
                    let desc = '', dim = '', area = '--', lat = ann.lat, lng = ann.lng;
                    if (ann.type === 'arrow') {
                        desc = ann.arrowText || 'Ghi chú mốc';
                        lat = ann.endLat; lng = ann.endLng;
                    } else if (ann.type === 'north_arrow') {
                        desc = 'Chỉ hướng Bắc trắc địa';
                    } else if (ann.type === 'rect') {
                        desc = ann.rectName || 'Khối nhà';
                        dim = ann.widthM + 'm x ' + ann.lengthM + 'm';
                        area = ann.rectArea || '--';
                    } else if (ann.type === 'circle') {
                        desc = ann.circleName || 'Vùng bảo vệ';
                        dim = 'Bán kính R = ' + ann.radiusM + 'm';
                        area = (Math.PI * Math.pow(ann.radiusM, 2)).toFixed(2);
                    } else if (ann.type === 'stamp') {
                        desc = 'Tờ: ' + ann.sheetNo + ' - Thửa: ' + ann.parcelNo + ' - Chủ: ' + ann.owner;
                        area = ann.area || '--';
                        dim = 'Loại đất: ' + ann.landType;
                    } else if (ann.type === 'text') {
                        desc = ann.text || '';
                    }
                    const vn = convertWgsToVn2k(lat || 0, lng || 0, AppState.kttVal, AppState.scaleFactor);
                    annRows.push([
                        aIdx + 1,
                        typeLabels[ann.type] || ann.type,
                        desc,
                        dim || '--',
                        area,
                        parseFloat((vn.X || 0).toFixed(3)),
                        parseFloat((vn.Y || 0).toFixed(3)),
                        parseFloat((lat || 0).toFixed(7)),
                        parseFloat((lng || 0).toFixed(7)),
                        ann.color || '#f59e0b'
                    ]);
                });
                const wsAnn = XLSX.utils.aoa_to_sheet(annRows);
                wsAnn['!cols'] = [
                    { wch: 6 }, { wch: 22 }, { wch: 35 }, { wch: 24 }, { wch: 15 },
                    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 12 }
                ];
                XLSX.utils.book_append_sheet(wb, wsAnn, 'ChuThich_HinhKhoi');
            }

            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const filename = projName + ".xlsx";
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("✓ Đã tải file Excel: " + filename);
        } else {
            this.exportCsvFile();
        }
    },

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
    },

    exportDxfFile() {
        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length === 0) {
            showToast("⚠️ Dự án hiện chưa có mốc nào để xuất file DXF!", true);
            return;
        }

        let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
        dxf += "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n";
        dxf += "0\nLAYER\n2\nMOC_TOADO\n70\n0\n62\n1\n6\nCONTINUOUS\n0\n";
        dxf += "LAYER\n2\nTEN_MOC\n70\n0\n62\n3\n6\nCONTINUOUS\n0\n";
        dxf += "LAYER\n2\nRANH_THUA\n70\n0\n62\n2\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n";
        dxf += "0\nSECTION\n2\nENTITIES\n";

        // Ghi các POINT và TEXT mốc (Trong CAD: X là Easting/Y VN2000, Y là Northing/X VN2000)
        pts.forEach(p => {
            const easting = parseFloat(p.y) || 0;
            const northing = parseFloat(p.x) || 0;
            const elev = parseFloat(p.h || 0);

            dxf += `0\nPOINT\n8\nMOC_TOADO\n10\n${easting}\n20\n${northing}\n30\n${elev}\n`;
            const cleanName = (p.name || 'Moc').replace(/[\r\n]/g, '');
            dxf += `0\nTEXT\n8\nTEN_MOC\n10\n${easting + 1.2}\n20\n${northing + 1.2}\n30\n${elev}\n40\n1.8\n1\n${cleanName}\n`;
        });

        // Nối đường ranh POLYLINE nếu có từ 2 mốc trở lên
        if (pts.length >= 2) {
            dxf += "0\nPOLYLINE\n8\nRANH_THUA\n66\n1\n70\n1\n";
            pts.forEach(p => {
                const easting = parseFloat(p.y) || 0;
                const northing = parseFloat(p.x) || 0;
                const elev = parseFloat(p.h || 0);
                dxf += `0\nVERTEX\n8\nRANH_THUA\n10\n${easting}\n20\n${northing}\n30\n${elev}\n`;
            });
            dxf += "0\nSEQEND\n";
        }

        dxf += "0\nENDSEC\n0\nEOF\n";

        const blob = new Blob([dxf], { type: "application/dxf;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = (AppState.currentProject.replace(/\.[^/.]+$/, "")) + ".dxf";
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất file AutoCAD: ${filename}`);
    },

    exportKmlFile() {
        const pts = appData.getPoints(AppState.currentProject);
        if (pts.length === 0) {
            showToast("⚠️ Dự án hiện chưa có mốc nào để xuất file KML!", true);
            return;
        }

        const projName = AppState.currentProject.replace(/\.[^/.]+$/, "");
        let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>${projName}</name>\n`;
        kml += `<Style id="pointStyle"><IconStyle><color>ff00ff00</color><scale>1.1</scale><Icon><href>https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle></Style>\n`;
        kml += `<Style id="lineStyle"><LineStyle><color>ff00ffff</color><width>3</width></LineStyle><PolyStyle><color>4000ffff</color></PolyStyle></Style>\n`;

        pts.forEach(p => {
            const lat = parseFloat(p.lat) || 0;
            const lng = parseFloat(p.lng) || 0;
            const cleanName = (p.name || 'Moc').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            kml += `<Placemark>\n<name>${cleanName}</name>\n<description><![CDATA[`;
            kml += `<div><b>Dự án:</b> ${projName}</div>`;
            kml += `<div><b>VN-2000 X:</b> ${p.x} m</div>`;
            kml += `<div><b>VN-2000 Y:</b> ${p.y} m</div>`;
            kml += `<div><b>WGS-84:</b> ${p.lat}, ${p.lng}</div>`;
            if (p.note) kml += `<div><b>Ghi chú:</b> ${p.note}</div>`;
            kml += `]]></description>\n<styleUrl>#pointStyle</styleUrl>\n`;
            kml += `<Point><coordinates>${lng},${lat},0</coordinates></Point>\n</Placemark>\n`;
        });

        if (pts.length >= 2) {
            kml += `<Placemark>\n<name>Ranh: ${projName}</name>\n<styleUrl>#lineStyle</styleUrl>\n`;
            if (pts.length >= 3) {
                kml += `<Polygon><outerBoundaryIs><LinearRing><coordinates>\n`;
                pts.forEach(p => { kml += `${p.lng},${p.lat},0\n`; });
                kml += `${pts[0].lng},${pts[0].lat},0\n`;
                kml += `</coordinates></LinearRing></outerBoundaryIs></Polygon>\n`;
            } else {
                kml += `<LineString><coordinates>\n`;
                pts.forEach(p => { kml += `${p.lng},${p.lat},0\n`; });
                kml += `</coordinates></LineString>\n`;
            }
            kml += `</Placemark>\n`;
        }

        kml += `</Document>\n</kml>`;

        const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = projName + ".kml";
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất file Google Earth: ${filename}`);
    },

    downloadSampleCsv() {
        const sampleRows = [
            "Tên Điểm,Tọa Độ X (Bắc - m),Tọa Độ Y (Đông - m),Vĩ Độ (Lat - °),Kinh Độ (Long - °),Múi Chiếu,Kinh Tuyến Trục,Ghi Chú",
            "M1,1144058.623,539624.574,10.345211,106.113617,3,105.75,Mốc gốc ranh đất",
            "M2,1144120.350,539680.120,10.345768,106.114125,3,105.75,Góc ranh phía Đông",
            "M3,1144185.700,539620.450,10.346360,106.113580,3,105.75,Góc ranh phía Bắc",
            "M4,1144115.200,539560.800,10.345724,106.113035,3,105.75,Góc ranh phía Tây"
        ];
        const content = "\uFEFF" + sampleRows.join("\r\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "File_Mau_Toa_Do_VN2000.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("✓ Đã tải file mẫu: File_Mau_Toa_Do_VN2000.csv!");
    },

    toggleImportTargetName(mode) {
        const c = document.getElementById('importNewNameContainer');
        if (c) c.style.display = (mode === 'new') ? 'block' : 'none';
    },

    handleFileImport(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const isExcel = /\.(xlsx|xls)$/i.test(file.name);
        if (isExcel && typeof XLSX !== 'undefined') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const buffer = e.target.result;
                    const wb = XLSX.read(buffer, { type: 'array' });

                    // Kiểm tra xem file có chứa các khối vẽ MiniCAD không
                    if (typeof appCadTool !== 'undefined' && appCadTool._parseWorkbookToShapes) {
                        try {
                            const cadShapes = appCadTool._parseWorkbookToShapes(wb, file.name);
                            if (cadShapes && cadShapes.length > 0) {
                                const wantCad = confirm("📁 File \"" + file.name + "\" chứa " + cadShapes.length + " khối bản vẽ MiniCAD (hình học & bảng kê diện tích).\n\n- Nhấn OK: Nạp trực tiếp lên bản đồ MiniCAD (hiển thị hình dạng các khối và bảng kê).\n- Nhấn CANCEL: Chỉ nạp điểm tọa độ vào Sổ đo dự án.");
                                if (wantCad) {
                                    appCadTool._applyImportedShapes(cadShapes, file.name);
                                    return; // Đã nạp thành công qua MiniCAD, không chạy tiếp extractPointsFromWorkbook làm đè mốc
                                }
                            }
                        } catch(cErr) {
                            console.warn("CAD parse check:", cErr);
                        }
                    }

                    const points = appData.extractPointsFromWorkbook(wb);
                    if (points && points.length > 0) {
                        appData.saveImportedPoints(points, file.name);
                    } else {
                        // Thử đọc sheet đầu tiên dạng CSV
                        const firstSheet = wb.Sheets[wb.SheetNames[0]];
                        const csv = XLSX.utils.sheet_to_csv(firstSheet);
                        appData.processImportedText(csv, file.name);
                    }
                } catch (err) {
                    console.error("Lỗi đọc Excel dự án:", err);
                    showToast("❌ Không thể đọc file Excel: " + (err.message || err), true);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;

                // Kiểm tra xem file CSV/HTML có chứa các khối bản vẽ MiniCAD không
                if (typeof appCadTool !== 'undefined' && appCadTool._parseHtmlOrTextToShapes) {
                    try {
                        const cadShapes = appCadTool._parseHtmlOrTextToShapes(text, file.name);
                        if (cadShapes && cadShapes.length > 0) {
                            const wantCad = confirm("📁 File \"" + file.name + "\" chứa " + cadShapes.length + " khối bản vẽ MiniCAD (hình học & bảng kê diện tích).\n\n- Nhấn OK: Nạp trực tiếp lên bản đồ MiniCAD (hiển thị hình dạng các khối và bảng kê).\n- Nhấn CANCEL: Chỉ nạp điểm tọa độ vào Sổ đo dự án.");
                            if (wantCad) {
                                appCadTool._applyImportedShapes(cadShapes, file.name);
                                return; // Đã nạp thành công qua MiniCAD
                            }
                        }
                    } catch(cErr) {}
                }

                // Nếu file .xls xuất từ MiniCAD/HTML table
                if (text && text.includes('<table') && typeof XLSX !== 'undefined') {
                    try {
                        const wb = XLSX.read(text, { type: 'string' });
                        const points = appData.extractPointsFromWorkbook(wb);
                        if (points && points.length > 0) {
                            return appData.saveImportedPoints(points, file.name);
                        }
                    } catch(err) {}
                }
                appData.processImportedText(text, file.name);
            };
            reader.readAsText(file, "UTF-8");
        }
        event.target.value = "";
    },

    extractPointsFromWorkbook(wb) {
        const points = [];
        const now = new Date().toLocaleString('vi-VN');

        wb.SheetNames.forEach(sname => {
            const sheet = wb.Sheets[sname];
            if (!sheet) return;
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!rows || rows.length < 2) return;

            let colName = -1, colX = -1, colY = -1, colLat = -1, colLng = -1, colH = -1, colNote = -1;
            let colShape = -1, colMode = -1, colOrder = -1;
            let headerRowIdx = -1;

            for (let r = 0; r < Math.min(rows.length, 10); r++) {
                const row = rows[r];
                if (!Array.isArray(row)) continue;

                let tempColName = -1, tempColX = -1, tempColY = -1, tempColLat = -1, tempColLng = -1, tempColH = -1, tempColNote = -1;
                let tempColShape = -1, tempColMode = -1, tempColOrder = -1;
                row.forEach((cell, cIdx) => {
                    const s = String(cell || '').toLowerCase().trim();
                    if (tempColShape === -1 && (s.includes('tên khối') || s.includes('tên thửa') || s === 'khối' || s === 'thửa' || s.includes('khối /') || s.includes('thửa /') || s === 'layer')) {
                        tempColShape = cIdx;
                    }
                    if (tempColMode === -1 && (s.includes('loại hình') || s.includes('chế độ') || s === 'loại' || s === 'mode')) {
                        tempColMode = cIdx;
                    }
                    if (tempColOrder === -1 && (s.includes('stt đỉnh') || s === 'đỉnh stt' || s === 'thứ tự')) {
                        tempColOrder = cIdx;
                    }
                    if (tempColName === -1 && (s.includes('tên đỉnh') || s.includes('tên mốc') || s.includes('tên điểm') || s === 'đỉnh' || s === 'mốc' || s === 'điểm' || s === 'name' || s === 'point' || s === 'stt/tên')) {
                        tempColName = cIdx;
                    }
                    if (tempColX === -1 && (s.includes('tọa độ x') || s.includes('x (bắc') || s.includes('x(bắc') || s.includes('x [m]') || s === 'x' || s.includes('north'))) {
                        tempColX = cIdx;
                    }
                    if (tempColY === -1 && (s.includes('tọa độ y') || s.includes('y (đông') || s.includes('y(đông') || s.includes('y [m]') || s === 'y' || s.includes('east'))) {
                        tempColY = cIdx;
                    }
                    if (tempColLat === -1 && (s.includes('vĩ độ') || s.includes('lat'))) {
                        tempColLat = cIdx;
                    }
                    if (tempColLng === -1 && (s.includes('kinh độ') || s.includes('lng') || s.includes('lon') || s.includes('long'))) {
                        tempColLng = cIdx;
                    }
                    if (tempColH === -1 && (s.includes('cao độ') || s.includes('h (m') || s === 'h' || s === 'z' || s === 'elev')) {
                        tempColH = cIdx;
                    }
                    if (tempColNote === -1 && (s.includes('ghi chú') || s.includes('note') || s.includes('mô tả') || s.includes('desc'))) {
                        tempColNote = cIdx;
                    }
                });

                if ((tempColX !== -1 && tempColY !== -1) || (tempColLat !== -1 && tempColLng !== -1)) {
                    headerRowIdx = r;
                    colName = tempColName !== -1 ? tempColName : (colName !== -1 ? colName : 1);
                    colX = tempColX;
                    colY = tempColY;
                    colLat = tempColLat;
                    colLng = tempColLng;
                    colH = tempColH;
                    colNote = tempColNote;
                    colShape = tempColShape;
                    colMode = tempColMode;
                    colOrder = tempColOrder;
                    break;
                }
            }

            if (headerRowIdx === -1) {
                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    if (!row || row.length < 2) continue;
                    for (let c = 0; c < row.length - 1; c++) {
                        const v1 = parseFloat(String(row[c]).replace(',', '.'));
                        const v2 = parseFloat(String(row[c+1]).replace(',', '.'));
                        if (!isNaN(v1) && !isNaN(v2) && v1 > 1000 && v2 > 1000) {
                            colX = c;
                            colY = c + 1;
                            colName = (c > 0) ? (c - 1) : 0;
                            headerRowIdx = r - 1;
                            break;
                        } else if (!isNaN(v1) && !isNaN(v2) && v1 >= 8 && v1 <= 24 && v2 >= 102 && v2 <= 110) {
                            colLat = c;
                            colLng = c + 1;
                            colName = (c > 0) ? (c - 1) : 0;
                            headerRowIdx = r - 1;
                            break;
                        }
                    }
                    if (headerRowIdx !== -1) break;
                }
            }

            if (headerRowIdx === -1) return;

            for (let r = headerRowIdx + 1; r < rows.length; r++) {
                const row = rows[r];
                if (!Array.isArray(row) || row.length === 0) continue;

                const rowText = row.join(' ').toLowerCase();
                if (rowText.includes('tổng cộng') || rowText.includes('tiểu kế')) continue;

                let name = (colName !== -1 && row[colName] !== undefined && row[colName] !== '') ? String(row[colName]).trim() : `M${points.length + 1}`;
                let x = (colX !== -1) ? parseFloat(String(row[colX]).replace(',', '.')) : 0;
                let y = (colY !== -1) ? parseFloat(String(row[colY]).replace(',', '.')) : 0;
                let lat = (colLat !== -1) ? parseFloat(String(row[colLat]).replace(',', '.')) : 0;
                let lng = (colLng !== -1) ? parseFloat(String(row[colLng]).replace(',', '.')) : 0;
                let h = (colH !== -1) ? parseFloat(String(row[colH]).replace(',', '.')) : 0;
                let note = (colNote !== -1 && row[colNote] !== undefined) ? String(row[colNote]).trim() : "";

                if (isNaN(x)) x = 0;
                if (isNaN(y)) y = 0;
                if (isNaN(lat)) lat = 0;
                if (isNaN(lng)) lng = 0;
                if (isNaN(h)) h = 0;

                if ((x === 0 && y === 0) && (lat === 0 && lng === 0)) continue;

                if ((lat === 0 && lng === 0) && (x !== 0 && y !== 0)) {
                    try {
                        const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                        lat = parseFloat(wgs.lat.toFixed(6));
                        lng = parseFloat(wgs.lng.toFixed(6));
                    } catch(e) {}
                } else if ((x === 0 && y === 0) && (lat !== 0 && lng !== 0)) {
                    try {
                        const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                        x = parseFloat(vn2k.X.toFixed(3));
                        y = parseFloat(vn2k.Y.toFixed(3));
                    } catch(e) {}
                }

                let shapeName = (colShape !== -1 && row[colShape] !== undefined && row[colShape] !== '')
                    ? String(row[colShape]).trim()
                    : (wb.SheetNames.length > 1 ? sname : "");
                let shapeMode = (colMode !== -1 && row[colMode] !== undefined && row[colMode] !== '')
                    ? String(row[colMode]).trim().toLowerCase()
                    : "polygon";
                let shapeOrder = (colOrder !== -1 && row[colOrder] !== undefined && row[colOrder] !== '')
                    ? parseInt(row[colOrder])
                    : (points.length + 1);

                points.push({
                    time: now,
                    name: name,
                    x: x,
                    y: y,
                    lat: lat,
                    lng: lng,
                    h: h,
                    mui: AppState.muiVal,
                    ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2, '0')}'`,
                    note: note,
                    shapeName: shapeName,
                    shapeMode: (shapeMode.includes('tuyến') || shapeMode.includes('polyline')) ? 'polyline' : 'polygon',
                    shapeOrder: shapeOrder
                });
            }
        });

        return points;
    },

    saveImportedPoints(parsedPoints, defaultName) {
        if (!parsedPoints || parsedPoints.length === 0) {
            return showToast("⚠️ Không nhận dạng được mốc tọa độ hợp lệ nào! Vui lòng kiểm tra lại file.", true);
        }

        const targetMode = document.querySelector('input[name="importTargetMode"]:checked')?.value || 'new';
        let targetProj = AppState.currentProject;

        if (targetMode === 'new') {
            const inputName = document.getElementById('txtImportNewProjectName')?.value?.trim();
            targetProj = inputName || defaultName || `DuAn_${Date.now().toString().slice(-4)}.csv`;
            if (!targetProj.toLowerCase().endsWith('.csv')) targetProj += '.csv';

            if (!AppState.projectsList.includes(targetProj)) {
                AppState.projectsList.push(targetProj);
                localStorage.setItem('vn2k_projects', JSON.stringify(AppState.projectsList));
            }
            parsedPoints.forEach(p => { p.project = targetProj; });
            appData.savePoints(targetProj, parsedPoints);
        } else {
            parsedPoints.forEach(p => { p.project = targetProj; });
            const existing = appData.getPoints(targetProj);
            parsedPoints.forEach(p => existing.push(p));
            appData.savePoints(targetProj, existing);
        }

        AppState.currentProject = targetProj;
        localStorage.setItem('vn2k_cur_project', targetProj);

        // Khôi phục và tái tạo các khối CAD nếu mốc có chứa thuộc tính shapeName
        if (typeof appCadTool !== 'undefined') {
            appCadTool.savedShapes = [];
            if (!appCadTool.loadShapesForProject(targetProj)) {
                appCadTool.reconstructShapesFromPoints(targetProj);
            }
        }

        appData.populateProjectSelect();
        appNav.updateBanner();
        if (AppState.currentScreen === 'datamgmt') {
            appData.refreshTable();
        }

        appModal.closeImportProjectModal();
        showToast(`✓ Đã nạp thành công ${parsedPoints.length} mốc vào dự án: ${targetProj}!`, true);

        // Mở bản đồ và zoom bao quát các mốc vừa nạp
        appNav.openProjectMap();
    },

    importManualPastedPoints() {
        const txt = document.getElementById('txtManualPointsInput')?.value;
        if (!txt || !txt.trim()) {
            return showToast("⚠️ Vui lòng dán danh sách tọa độ vào ô trước khi nạp!", true);
        }
        appData.processImportedText(txt, `DuAn_Nhap_${Date.now().toString().slice(-4)}.csv`);
    },

    processImportedText(text, defaultName) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) {
            return showToast("⚠️ Không tìm thấy dữ liệu tọa độ nào trong nội dung!", true);
        }

        const parsedPoints = [];
        const now = new Date().toLocaleString('vi-VN');

        lines.forEach((line, idx) => {
            let parts = [];
            if (line.includes(',') || line.includes(';')) {
                const sep = line.includes(';') ? ';' : ',';
                parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''));
            } else {
                parts = line.split(/\s+/).map(p => p.trim());
            }

            if (parts.length < 2) return;

            const lower0 = parts[0].toLowerCase();
            if (lower0.includes('tên') || lower0.includes('thời gian') || lower0.includes('name') || lower0.includes('time')) {
                return;
            }

            let name = parts[0] || `M${idx + 1}`;
            let val1 = parseFloat((parts[1] || '').replace(',', '.'));
            let val2 = parseFloat(parts[2] ? parts[2].replace(',', '.') : '0');
            let val3 = parseFloat(parts[3] ? parts[3].replace(',', '.') : '0');
            let val4 = parseFloat(parts[4] ? parts[4].replace(',', '.') : '0');
            let note = parts[parts.length - 1];
            if (typeof note === 'string' && (note === parts[1] || note === parts[2] || !isNaN(parseFloat(note)))) {
                note = "";
            }

            let x = 0, y = 0, lat = 0, lng = 0;

            // Kiểm tra cấu trúc 8-9 cột chuẩn
            if (parts.length >= 6 && !isNaN(val1) && !isNaN(val2) && !isNaN(val3) && !isNaN(val4)) {
                if (isNaN(parseFloat(parts[0])) && val1 > 1000) {
                    name = parts[0];
                    x = val1;
                    y = val2;
                    lat = val3;
                    lng = val4;
                    note = parts[7] || parts[8] || "";
                }
            }

            if (x === 0 && y === 0 && lat === 0 && lng === 0) {
                if (!isNaN(val1) && !isNaN(val2)) {
                    if (val1 > 1000 || val2 > 1000) {
                        x = val1;
                        y = val2;
                        try {
                            const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                            lat = parseFloat(wgs.lat.toFixed(6));
                            lng = parseFloat(wgs.lng.toFixed(6));
                        } catch(e) {}
                    } else if (val1 >= -90 && val1 <= 90 && val2 >= -180 && val2 <= 180) {
                        lat = val1;
                        lng = val2;
                        try {
                            const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                            x = parseFloat(vn2k.X.toFixed(3));
                            y = parseFloat(vn2k.Y.toFixed(3));
                        } catch(e) {}
                    }
                }
            }

            if ((x !== 0 && y !== 0) || (lat !== 0 && lng !== 0)) {
                parsedPoints.push({
                    time: now,
                    name: name,
                    x: x,
                    y: y,
                    lat: lat,
                    lng: lng,
                    mui: AppState.muiVal,
                    ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2, '0')}'`,
                    note: note || ""
                });
            }
        });

        if (parsedPoints.length === 0) {
            return showToast("⚠️ Không nhận dạng được mốc tọa độ hợp lệ nào! Vui lòng tải file mẫu để xem định dạng chuẩn.", true);
        }

        appData.saveImportedPoints(parsedPoints, defaultName);
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

// ================= 9. MODAL CÀI ĐẶT HỆ THỐNG (SETTINGS MODAL) =================
const appModal = {
    currentSettingsTab: 'storage',

    openUnifiedSettings(defaultTab = 'storage') {
        const m = document.getElementById('modalSettings');
        if (!m) return;
        m.classList.add('active');

        // 1. Khởi tạo dữ liệu Tab KTT
        const sel = document.getElementById('modalProvinceSelect');
        if (sel) {
            sel.innerHTML = '<option value="-1">--- Tự nhập kinh tuyến trục ---</option>';
            VN_PROVINCES.forEach((p, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.innerText = `${p.name} (${p.deg}°${String(p.min).padStart(2,'0')}')`;
                if (idx === AppState.provinceIndex) opt.selected = true;
                sel.appendChild(opt);
            });
        }

        const degInput = document.getElementById('txtModalDeg');
        if (degInput) degInput.value = AppState.kttDeg;
        const minInput = document.getElementById('txtModalMin');
        if (minInput) minInput.value = AppState.kttMin;
        appModal.setMui(AppState.muiVal);

        // 2. Khởi tạo dữ liệu Tab Lưu dữ liệu
        appData.selectStorageMode(AppState.storageMode || 'offline');
        const scriptUrlInput = document.getElementById('txtGoogleScriptUrl');
        if (scriptUrlInput) scriptUrlInput.value = AppState.googleScriptUrl || '';

        const sheetViewInput = document.getElementById('txtGoogleSheetViewUrl');
        if (sheetViewInput) sheetViewInput.value = AppState.googleSheetViewUrl || '';

        // 3. Kích hoạt đúng tab được yêu cầu
        appModal.switchSettingsTab(defaultTab);

        // 4. Cập nhật UI lựa chọn Bố cục màn hình chính
        appModal.updateViewModeSettingsUI();
    },

    updateViewModeSettingsUI() {
        const btnBig = document.getElementById('btnSettingViewBigTiles');
        const btnTree = document.getElementById('btnSettingViewTree');
        const isBig = (AppState.mainMenuViewMode === 'big_tiles');
        if (btnBig) btnBig.classList.toggle('active', isBig);
        if (btnTree) btnTree.classList.toggle('active', !isBig);
    },

    switchSettingsTab(tab = 'storage') {
        appModal.currentSettingsTab = tab;
        const tabList = ['storage', 'ktt', 'rtk', 'resection'];
        
        tabList.forEach(t => {
            const cap = t.charAt(0).toUpperCase() + t.slice(1);
            const btn = document.getElementById('btnTab' + cap);
            const content = document.getElementById('settingsTabContent' + cap);
            const isActive = (t === tab);
            if (btn) btn.classList.toggle('active', isActive);
            if (content) content.style.display = isActive ? 'block' : 'none';
        });

        const storageFooter = document.getElementById('settingsStorageFooter');
        if (storageFooter) {
            storageFooter.style.display = (tab === 'storage') ? 'flex' : 'none';
        }

        if (tab === 'resection' && typeof appResection !== 'undefined') {
            appResection.initModal();
        }
        if (tab === 'rtk' && typeof appBluetoothRtk !== 'undefined') {
            appBluetoothRtk.updateUi();
        }
    },

    openSettings() {
        appModal.openUnifiedSettings('ktt');
    },

    closeSettings() {
        const m = document.getElementById('modalSettings');
        if (m) m.classList.remove('active');
    },

    openDateTimeSettings() {
        triggerHaptic('light');
        // Lấy thông tin thời gian hiện tại
        const now = new Date();
        const tzOffset = -now.getTimezoneOffset() / 60;
        const tzStr = 'GMT' + (tzOffset >= 0 ? '+' : '') + tzOffset + ':00';
        const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
        const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        showToast(`⏰ Thời gian hệ thống: ${timeStr} | ${dateStr} | Múi giờ: ${tzStr}`);

        // Toast thứ 2 thông báo đồng bộ
        setTimeout(() => {
            showToast('✅ Ngày giờ đồng bộ tự động từ hệ thống thiết bị. Thay đổi múi giờ trong Cài đặt > Ngày giờ của thiết bị.');
        }, 2500);
    },

    setMui(mui) {
        const btn3 = document.getElementById('modalBtnMui3');
        const btn6 = document.getElementById('modalBtnMui6');
        if (btn3) btn3.classList.toggle('active', mui === 3);
        if (btn6) btn6.classList.toggle('active', mui === 6);
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

        const mui3Btn = document.getElementById('btnMui3');
        if (mui3Btn) mui3Btn.classList.toggle('active', AppState.muiVal === 3);
        const mui6Btn = document.getElementById('btnMui6');
        if (mui6Btn) mui6Btn.classList.toggle('active', AppState.muiVal === 6);

        appNav.updateBanner();
        appSettings.saveNow();
        appModal.closeSettings();
        showToast(`✓ Đã lưu KTT: ${AppState.provinceName} (${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`);
    },

    openGoogleConfig() {
        appModal.openUnifiedSettings('storage');
    },

    closeGoogleConfig() {
        appModal.closeSettings();
    },

    openGoogleGuide() {
        const m = document.getElementById('modalGoogleGuide');
        if (m) m.classList.add('active');
    },

    closeGoogleGuide() {
        const m = document.getElementById('modalGoogleGuide');
        if (m) m.classList.remove('active');
    },

    openImportProjectModal() {
        const m = document.getElementById('modalImportProject');
        if (!m) return;
        m.classList.add('active');

        // Gợi ý tên dự án mới nếu chưa nhập
        const nameInput = document.getElementById('txtImportNewProjectName');
        if (nameInput && !nameInput.value.trim()) {
            const today = new Date();
            const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
            nameInput.value = `Dự án đo ${dateStr}`;
        }
    },

    closeImportProjectModal() {
        const m = document.getElementById('modalImportProject');
        if (m) m.classList.remove('active');
    }
};

// ================= 11. PHÂN HỆ CẮM MỐC THỰC ĐỊA (STAKEOUT MODULE) =================
const appStakeout = {
    selectedPoint: null,
    audioBeepEnabled: true,
    compassHeading: 0,
    currentTargetAzimuth: 0,
    hasOrientationListener: false,
    audioContext: null,

    init() {
        appStakeout.refreshPointsList();
        appStakeout.initOrientationListener();
        appStakeout.updateLiveNavigation();
    },

    refreshPointsList() {
        const sel = document.getElementById('selStakeoutPoint');
        if (!sel) return;
        const pts = appData.getPoints(AppState.currentProject);

        if (pts.length === 0) {
            sel.innerHTML = '<option value="">-- Dự án chưa có mốc nào --</option>';
            appStakeout.selectedPoint = null;
            appStakeout.updateTargetCard();
            return;
        }

        sel.innerHTML = '';
        pts.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `${p.name} (X: ${parseFloat(p.x).toFixed(2)}, Y: ${parseFloat(p.y).toFixed(2)})`;
            sel.appendChild(opt);
        });

        if (sel.options.length > 0) {
            sel.selectedIndex = 0;
            appStakeout.selectedPoint = pts[0];
            appStakeout.updateTargetCard();
        }
    },

    onPointSelected() {
        const sel = document.getElementById('selStakeoutPoint');
        if (!sel || !sel.value) return;
        const idx = parseInt(sel.value, 10);
        const pts = appData.getPoints(AppState.currentProject);
        if (pts[idx]) {
            appStakeout.selectedPoint = pts[idx];
            appStakeout.updateTargetCard();
            appStakeout.updateLiveNavigation();
        }
    },

    updateTargetCard() {
        const nameEl = document.getElementById('txtStakeoutTargetName');
        const xEl = document.getElementById('txtStakeoutTargetX');
        const yEl = document.getElementById('txtStakeoutTargetY');
        const latLngEl = document.getElementById('txtStakeoutTargetLatLng');

        if (!appStakeout.selectedPoint) {
            if (nameEl) nameEl.innerText = "Chưa chọn mốc";
            if (xEl) xEl.innerText = "--";
            if (yEl) yEl.innerText = "--";
            if (latLngEl) latLngEl.innerText = "Lat: -- | Lng: --";
            return;
        }

        const p = appStakeout.selectedPoint;
        if (nameEl) nameEl.innerText = p.name;
        if (xEl) xEl.innerText = parseFloat(p.x).toFixed(3);
        if (yEl) yEl.innerText = parseFloat(p.y).toFixed(3);
        if (latLngEl) latLngEl.innerText = `Lat: ${parseFloat(p.lat).toFixed(6)} | Lng: ${parseFloat(p.lng).toFixed(6)}`;
    },

    initOrientationListener() {
        if (appStakeout.hasOrientationListener) return;

        const handleOrientation = (e) => {
            let heading = 0;
            if (e.webkitCompassHeading !== undefined) {
                // iOS Safari
                heading = e.webkitCompassHeading;
            } else if (e.alpha !== null) {
                // Android Chrome
                heading = 360 - e.alpha;
            }
            appStakeout.compassHeading = (heading + 360) % 360;
            appStakeout.updatePointerRotation();
        };

        if (window.DeviceOrientationEvent) {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                window.addEventListener('deviceorientation', handleOrientation, true);
            } else {
                window.addEventListener('deviceorientationabsolute', handleOrientation, true);
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
            appStakeout.hasOrientationListener = true;
        }
    },

    updateLiveNavigation() {
        const distEl = document.getElementById('txtStakeoutDistance');
        const dirEl = document.getElementById('txtStakeoutDirectionPrompt');
        const dxEl = document.getElementById('txtStakeoutDeltaX');
        const dyEl = document.getElementById('txtStakeoutDeltaY');
        const accEl = document.getElementById('txtStakeoutGpsAcc');

        if (!appStakeout.selectedPoint) {
            if (distEl) distEl.innerText = "-- m";
            if (dirEl) dirEl.innerText = "Vui lòng chọn mốc cần cắm";
            return;
        }

        const gps = AppState.lastGps;
        if (!gps || !gps.lat || gps.lat === 0) {
            if (distEl) distEl.innerText = "-- m";
            if (dirEl) dirEl.innerText = "🛰️ Đang đợi tín hiệu vệ tinh GPS...";
            return;
        }

        const p = appStakeout.selectedPoint;
        const targetLat = parseFloat(p.lat);
        const targetLng = parseFloat(p.lng);
        const targetX = parseFloat(p.x);
        const targetY = parseFloat(p.y);

        // Tính khoảng cách và góc phương vị
        const nav = calcGeoDistanceAndAzimuth(gps.lat, gps.lng, targetLat, targetLng);
        const dist = nav.distance;
        const targetAzimuth = nav.azimuth;

        // Tính delta theo VN-2000 nếu có tọa độ hiện tại
        try {
            const curPt = convertWgsToVn2k(gps.lat, gps.lng, AppState.kttVal, AppState.scaleFactor);
            const dX = targetX - curPt.X;
            const dY = targetY - curPt.Y;
            if (dxEl) dxEl.innerText = `${dX >= 0 ? '+' : ''}${dX.toFixed(2)}m`;
            if (dyEl) dyEl.innerText = `${dY >= 0 ? '+' : ''}${dY.toFixed(2)}m`;
        } catch (e) {}

        if (accEl) accEl.innerText = `±${gps.accuracy.toFixed(1)}m`;

        // Hiển thị cự ly và class màu sắc
        if (distEl) {
            distEl.className = 'stakeout-dist-val';
            if (dist < 0.5) {
                distEl.classList.add('arrived');
                distEl.innerText = "🎯 0.0 m";
                if (dirEl) dirEl.innerText = "✓ ĐÃ ĐẾN VỊ TRÍ MỐC CHÍNH XÁC!";
                triggerHaptic('success');
                appStakeout.playBeepSound(880, 200);
            } else if (dist < 2.0) {
                distEl.classList.add('near');
                distEl.innerText = `${dist.toFixed(2)} m`;
                if (dirEl) dirEl.innerText = `Đến rất gần mốc (${dist.toFixed(1)}m)`;
                triggerHaptic('light');
                appStakeout.playBeepSound(587, 80);
            } else {
                distEl.innerText = dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist.toFixed(1)} m`;
                const relAngle = ((targetAzimuth - appStakeout.compassHeading + 540) % 360) - 180;
                let turnText = "Đi thẳng";
                if (Math.abs(relAngle) > 20) {
                    turnText = relAngle > 0 ? `Rẽ phải ${Math.round(relAngle)}°` : `Rẽ trái ${Math.round(-relAngle)}°`;
                }
                if (dirEl) dirEl.innerText = `${turnText} ➔ Khoảng ${dist < 100 ? dist.toFixed(1) + 'm' : Math.round(dist) + 'm'}`;
            }
        }

        appStakeout.currentTargetAzimuth = targetAzimuth;
        appStakeout.updatePointerRotation();
    },

    updatePointerRotation() {
        const needle = document.getElementById('radarPointerNeedle');
        if (!needle || appStakeout.currentTargetAzimuth === undefined) return;
        const angle = (appStakeout.currentTargetAzimuth - appStakeout.compassHeading + 360) % 360;
        needle.style.transform = `rotate(${angle}deg)`;
    },

    toggleAudioBeep() {
        appStakeout.audioBeepEnabled = !appStakeout.audioBeepEnabled;
        const btn = document.getElementById('btnStakeoutBeep');
        if (btn) btn.innerText = appStakeout.audioBeepEnabled ? "🔊 Âm bíp: Bật" : "🔇 Âm bíp: Tắt";
        showToast(appStakeout.audioBeepEnabled ? "🔊 Đã bật âm thanh khi gần mốc" : "🔇 Đã tắt âm thanh");
    },

    playBeepSound(freq = 600, duration = 100) {
        if (!appStakeout.audioBeepEnabled) return;
        try {
            if (!appStakeout.audioContext) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) appStakeout.audioContext = new AudioCtx();
            }
            if (appStakeout.audioContext && appStakeout.audioContext.state === 'suspended') {
                appStakeout.audioContext.resume();
            }
            if (appStakeout.audioContext) {
                const osc = appStakeout.audioContext.createOscillator();
                const gain = appStakeout.audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, appStakeout.audioContext.currentTime);
                gain.gain.setValueAtTime(0.2, appStakeout.audioContext.currentTime);
                osc.connect(gain);
                gain.connect(appStakeout.audioContext.destination);
                osc.start();
                osc.stop(appStakeout.audioContext.currentTime + (duration / 1000));
            }
        } catch (e) {}
    },

    viewOnMap() {
        if (!appStakeout.selectedPoint) {
            showToast("⚠️ Vui lòng chọn mốc cần cắm trước!", true);
            return;
        }
        appNav.openProjectMap({ loadProject: true });
        const p = appStakeout.selectedPoint;
        if (AppState.leafletMap && p.lat && p.lng) {
            AppState.leafletMap.setView([parseFloat(p.lat), parseFloat(p.lng)], 19);
        }
    },

    openCameraForThisPoint() {
        if (!appStakeout.selectedPoint) {
            showToast("⚠️ Vui lòng chọn mốc trước!", true);
            return;
        }
        appNav.showScreen('camera');
        const sel = document.getElementById('selCameraPoint');
        if (sel) {
            const pts = appData.getPoints(AppState.currentProject);
            const idx = pts.findIndex(pt => pt.name === appStakeout.selectedPoint.name);
            if (idx >= 0) {
                sel.value = idx;
                appCamera.onPointSelected();
            }
        }
    }
};

// ================= 12. PHÂN HỆ CAMERA ĐÓNG DẤU THỦY ẤN (GEO-CAMERA) =================
const appCamera = {
    selectedPoint: null,
    renderedDataUrl: null,

    init() {
        appCamera.refreshPointsList();
    },

    refreshPointsList() {
        const sel = document.getElementById('selCameraPoint');
        if (!sel) return;
        const pts = appData.getPoints(AppState.currentProject);

        sel.innerHTML = '<option value="live">📍 Tọa độ GPS Live (Vị trí hiện tại)</option>';
        pts.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.innerText = `${p.name} (X: ${parseFloat(p.x).toFixed(2)}, Y: ${parseFloat(p.y).toFixed(2)})`;
            sel.appendChild(opt);
        });

        appCamera.onPointSelected();
    },

    onPointSelected() {
        const sel = document.getElementById('selCameraPoint');
        const markEl = document.getElementById('txtCameraTagMark');
        const projEl = document.getElementById('txtCameraTagProject');
        const vn2kEl = document.getElementById('txtCameraTagVn2k');
        const wgsEl = document.getElementById('txtCameraTagWgs');
        const gpsEl = document.getElementById('txtCameraTagGps');
        const timeEl = document.getElementById('txtCameraTagTime');

        if (projEl) projEl.innerText = AppState.currentProject.replace(/\.[^/.]+$/, "");

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        if (timeEl) timeEl.innerText = dateStr;

        const val = sel ? sel.value : 'live';
        if (val === 'live' || !val) {
            appCamera.selectedPoint = null;
            if (markEl) markEl.innerText = "GPS Live";
            const gps = AppState.lastGps;
            if (gps && gps.lat) {
                if (wgsEl) wgsEl.innerText = `Lat: ${gps.lat.toFixed(6)} | Lng: ${gps.lng.toFixed(6)}`;
                try {
                    const pt = convertWgsToVn2k(gps.lat, gps.lng, AppState.kttVal, AppState.scaleFactor);
                    if (vn2kEl) vn2kEl.innerText = `X = ${pt.X.toFixed(3)} m | Y = ${pt.Y.toFixed(3)} m (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;
                } catch(e) {}
                if (gpsEl) gpsEl.innerText = `Sai số: ±${gps.accuracy.toFixed(1)}m | Hướng: ${Math.round(appStakeout.compassHeading || 0)}°`;
            } else {
                if (wgsEl) wgsEl.innerText = "Chưa có tín hiệu GPS";
                if (vn2kEl) vn2kEl.innerText = "Chưa có tọa độ VN-2000";
                if (gpsEl) gpsEl.innerText = "Đang dò tìm vệ tinh...";
            }
        } else {
            const idx = parseInt(val, 10);
            const pts = appData.getPoints(AppState.currentProject);
            if (pts[idx]) {
                const p = pts[idx];
                appCamera.selectedPoint = p;
                if (markEl) markEl.innerText = p.name;
                if (vn2kEl) vn2kEl.innerText = `X = ${parseFloat(p.x).toFixed(3)} m | Y = ${parseFloat(p.y).toFixed(3)} m (KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}')`;
                if (wgsEl) wgsEl.innerText = `Lat: ${parseFloat(p.lat).toFixed(6)} | Lng: ${parseFloat(p.lng).toFixed(6)}`;
                const gps = AppState.lastGps;
                const acc = (gps && gps.accuracy) ? `±${gps.accuracy.toFixed(1)}m` : '±--m';
                if (gpsEl) gpsEl.innerText = `Sai số: ${acc} | Hướng: ${Math.round(appStakeout.compassHeading || 0)}°`;
            }
        }
    },

    onFileSelected(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        showToast("⏳ Đang xử lý và đóng dấu thủy ấn lên ảnh...");
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                appCamera.renderWatermarkOnCanvas(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    },

    renderWatermarkOnCanvas(img) {
        const canvas = document.getElementById('cameraWatermarkCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Tỷ lệ kích thước watermark theo độ phân giải ảnh
        const scale = Math.max(1, img.width / 1200);
        const padding = Math.round(18 * scale);
        const fontSizeHeader = Math.round(18 * scale);
        const fontSizeBody = Math.round(13.5 * scale);
        const lineHeight = Math.round(22 * scale);

        const projName = AppState.currentProject.replace(/\.[^/.]+$/, "");
        let markName = "Vị trí thực địa";
        let xStr = "--", yStr = "--", latStr = "--", lngStr = "--";

        if (appCamera.selectedPoint) {
            markName = appCamera.selectedPoint.name;
            xStr = parseFloat(appCamera.selectedPoint.x).toFixed(3);
            yStr = parseFloat(appCamera.selectedPoint.y).toFixed(3);
            latStr = parseFloat(appCamera.selectedPoint.lat).toFixed(6);
            lngStr = parseFloat(appCamera.selectedPoint.lng).toFixed(6);
        } else if (AppState.lastGps && AppState.lastGps.lat) {
            markName = "GPS Live";
            latStr = AppState.lastGps.lat.toFixed(6);
            lngStr = AppState.lastGps.lng.toFixed(6);
            try {
                const pt = convertWgsToVn2k(AppState.lastGps.lat, AppState.lastGps.lng, AppState.kttVal, AppState.scaleFactor);
                xStr = pt.X.toFixed(3);
                yStr = pt.Y.toFixed(3);
            } catch(e) {}
        }

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
        const gpsAcc = (AppState.lastGps && AppState.lastGps.accuracy) ? `±${AppState.lastGps.accuracy.toFixed(1)}m` : '±--m';
        const compassAz = Math.round(appStakeout.compassHeading || 0);

        const lines = [
            `📍 MỐC: ${markName} | DỰ ÁN: ${projName}`,
            `• VN-2000: X = ${xStr} m | Y = ${yStr} m (KTT ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}' Múi ${AppState.muiVal}°)`,
            `• WGS-84:  Lat = ${latStr}° | Lng = ${lngStr}°`,
            `• THỰC ĐỊA: Sai số: ${gpsAcc} | Hướng: ${compassAz}° | Thời gian: ${dateStr}`
        ];

        const cardW = Math.min(img.width - padding * 2, Math.round(680 * scale));
        const cardH = padding * 2 + fontSizeHeader + (lines.length * lineHeight) + Math.round(10 * scale);
        const cardX = padding;
        const cardY = img.height - cardH - padding;

        // Vẽ hộp nền thủy ấn (Dark glassmorphism card)
        ctx.save();
        ctx.fillStyle = "rgba(10, 18, 32, 0.88)";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = Math.max(2, Math.round(2 * scale));
        
        const r = Math.round(12 * scale);
        ctx.beginPath();
        ctx.moveTo(cardX + r, cardY);
        ctx.lineTo(cardX + cardW - r, cardY);
        ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + r);
        ctx.lineTo(cardX + cardW, cardY + cardH - r);
        ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - r, cardY + cardH);
        ctx.lineTo(cardX + r, cardY + cardH);
        ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - r);
        ctx.lineTo(cardX, cardY + r);
        ctx.quadraticCurveTo(cardX, cardY, cardX + r, cardY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Tiêu đề
        ctx.font = `bold ${fontSizeHeader}px -apple-system, sans-serif`;
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("WGS-84 ⇄ VN-2000 PRO | ẢNH NGHIỆM THU HIỆN TRƯỜNG", cardX + padding, cardY + padding + fontSizeHeader * 0.85);

        // Vạch phân cách mạ vàng
        ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.moveTo(cardX + padding, cardY + padding + fontSizeHeader + Math.round(6 * scale));
        ctx.lineTo(cardX + cardW - padding, cardY + padding + fontSizeHeader + Math.round(6 * scale));
        ctx.stroke();

        // Dòng thông tin
        ctx.font = `600 ${fontSizeBody}px ui-monospace, SFMono-Regular, monospace`;
        let curY = cardY + padding + fontSizeHeader + Math.round(6 * scale) + lineHeight;

        lines.forEach((l, idx) => {
            ctx.fillStyle = (idx === 0) ? "#fde047" : (idx === 1 ? "#34d399" : (idx === 2 ? "#bae6fd" : "#cbd5e1"));
            ctx.fillText(l, cardX + padding, curY);
            curY += lineHeight;
        });

        ctx.restore();

        const resultCard = document.getElementById('cardCameraResult');
        if (resultCard) resultCard.style.display = 'block';
        appCamera.renderedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        showToast("✅ Đã hoàn tất đóng dấu mốc tọa độ lên ảnh!");
    },

    downloadWatermarkedImage() {
        if (!appCamera.renderedDataUrl) {
            showToast("⚠️ Chưa có ảnh để tải về!", true);
            return;
        }
        const markName = appCamera.selectedPoint ? appCamera.selectedPoint.name : "GPS_Live";
        const link = document.createElement("a");
        link.download = `Anh_Moc_${markName}_VN2000.jpg`;
        link.href = appCamera.renderedDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("✓ Đã tải ảnh nghiệm thu về thiết bị!");
    },

    shareImage() {
        if (!appCamera.renderedDataUrl) {
            showToast("⚠️ Chưa có ảnh để chia sẻ!", true);
            return;
        }
        if (navigator.share) {
            fetch(appCamera.renderedDataUrl)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "Anh_Moc_VN2000.jpg", { type: "image/jpeg" });
                    navigator.share({
                        title: "Ảnh nghiệm thu mốc VN-2000",
                        text: `Mốc tọa độ dự án ${AppState.currentProject}`,
                        files: [file]
                    }).catch(() => {});
                });
        } else {
            appCamera.downloadWatermarkedImage();
            showToast("💡 Thiết bị không hỗ trợ share trực tiếp, đã tự động tải ảnh về máy!");
        }
    },

    attachToCurrentPoint() {
        if (!appCamera.selectedPoint) {
            showToast("⚠️ Vui lòng chọn mốc trong dự án để lưu ghi chú!", true);
            return;
        }
        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
        const pts = appData.getPoints(AppState.currentProject);
        const idx = pts.findIndex(pt => pt.name === appCamera.selectedPoint.name);
        if (idx >= 0) {
            pts[idx].note = (pts[idx].note ? pts[idx].note + " | " : "") + `Đã chụp ảnh nghiệm thu (${timeStr})`;
            appData.savePoints(AppState.currentProject, pts);
            showToast(`✓ Đã cập nhật ghi chú ảnh vào mốc "${appCamera.selectedPoint.name}"!`);
        }
    }
};

// ================= 9.1 KẾT NỐI MÁY ĐỊNH VỊ RTK NGOÀI QUA WEB BLUETOOTH =================
const appBluetoothRtk = {
    device: null,
    server: null,
    characteristic: null,
    isConnected: false,
    useExternalRtk: false,
    lastNmeaLine: "",
    rtkData: {
        solType: "Chưa kết nối",
        satCount: 0,
        hrms: null,
        vrms: null,
        lat: null,
        lng: null,
        alt: null,
        vn2kX: null,
        vn2kY: null
    },

    updateUi() {
        const led = document.getElementById('rtkLedIndicator');
        const statusText = document.getElementById('rtkStatusText');
        const badge = document.getElementById('rtkDeviceNameBadge');
        const solTypeEl = document.getElementById('rtkSolType');
        const satCountEl = document.getElementById('rtkSatCount');
        const hrmsEl = document.getElementById('rtkHrms');
        const vrmsEl = document.getElementById('rtkVrms');
        const vn2kEl = document.getElementById('rtkVn2kCoord');
        const chk = document.getElementById('chkUseExternalRtk');

        if (chk) chk.checked = !!appBluetoothRtk.useExternalRtk;

        if (appBluetoothRtk.isConnected) {
            if (led) {
                led.className = 'rtk-led-dot ' + (appBluetoothRtk.rtkData.solType.includes('Fix') ? 'connected' : 'float');
            }
            if (statusText) statusText.innerText = `Đã kết nối: ${appBluetoothRtk.device?.name || 'GNSS RTK Rover'}`;
            if (badge) {
                badge.style.display = 'inline-block';
                badge.innerText = appBluetoothRtk.device?.name || 'RTK Rover';
            }
        } else {
            if (led) led.className = 'rtk-led-dot';
            if (statusText) statusText.innerText = 'Chưa kết nối máy RTK ngoài';
            if (badge) badge.style.display = 'none';
        }

        if (solTypeEl) solTypeEl.innerText = appBluetoothRtk.rtkData.solType;
        if (satCountEl) satCountEl.innerText = `${appBluetoothRtk.rtkData.satCount} SVs`;
        if (hrmsEl) hrmsEl.innerText = appBluetoothRtk.rtkData.hrms ? `± ${appBluetoothRtk.rtkData.hrms} mm` : '± -- mm';
        if (vrmsEl) vrmsEl.innerText = appBluetoothRtk.rtkData.vrms ? `± ${appBluetoothRtk.rtkData.vrms} mm` : '± -- mm';
        if (vn2kEl) {
            if (appBluetoothRtk.rtkData.vn2kX) {
                vn2kEl.innerText = `X: ${appBluetoothRtk.rtkData.vn2kX.toFixed(3)} | Y: ${appBluetoothRtk.rtkData.vn2kY.toFixed(3)} | Z: ${(appBluetoothRtk.rtkData.alt || 0).toFixed(3)}`;
            } else {
                vn2kEl.innerText = "X: -- | Y: -- | Z: --";
            }
        }
    },

    async connect() {
        if (!navigator.bluetooth) {
            showToast("⚠️ Trình duyệt của bạn chưa hỗ trợ Web Bluetooth. Bạn có thể bấm 'Thử RTK Fix' để chạy chế độ mô phỏng!", true);
            return;
        }

        try {
            showToast("🔍 Đang quét thiết bị GNSS RTK Rover xung quanh...");
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile
                    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
                    '0000ffe0-0000-1000-8000-00805f9b34fb'  // HM-10 / CC2541 BLE
                ]
            });

            appBluetoothRtk.device = device;
            const server = await device.gatt.connect();
            appBluetoothRtk.server = server;
            appBluetoothRtk.isConnected = true;

            // Tìm characteristic nhận NMEA stream
            const services = await server.getPrimaryServices();
            for (const s of services) {
                const chars = await s.getCharacteristics();
                for (const c of chars) {
                    if (c.properties.notify || c.properties.indicate) {
                        await c.startNotifications();
                        c.addEventListener('characteristicvaluechanged', (e) => {
                            const val = new TextDecoder().decode(e.target.value);
                            appBluetoothRtk.handleNmeaChunk(val);
                        });
                        appBluetoothRtk.characteristic = c;
                        break;
                    }
                }
            }

            device.addEventListener('gattserverdisconnected', () => {
                appBluetoothRtk.isConnected = false;
                appBluetoothRtk.updateUi();
                showToast("⚠️ Đã ngắt kết nối với máy RTK Rover!");
            });

            appBluetoothRtk.updateUi();
            showToast(`✓ Đã kết nối thành công máy RTK "${device.name}"!`);
        } catch (err) {
            console.error("Lỗi kết nối Bluetooth RTK:", err);
            showToast("❌ Không thể kết nối Bluetooth: " + (err.message || err), true);
        }
    },

    disconnect() {
        if (appBluetoothRtk.device && appBluetoothRtk.device.gatt.connected) {
            appBluetoothRtk.device.gatt.disconnect();
        }
        appBluetoothRtk.isConnected = false;
        appBluetoothRtk.rtkData.solType = "Chưa kết nối";
        appBluetoothRtk.updateUi();
        showToast("⏹️ Đã ngắt kết nối máy RTK ngoài.");
    },

    simulateFix() {
        appBluetoothRtk.isConnected = true;
        const baseLat = AppState.currentPos ? AppState.currentPos.lat : 10.762622;
        const baseLng = AppState.currentPos ? AppState.currentPos.lng : 106.660172;
        const fakeNmea = `$GNGGA,071245.00,${appBluetoothRtk.toNmeaCoord(baseLat, 'lat')},${appBluetoothRtk.toNmeaCoord(baseLng, 'lng')},4,32,0.6,24.58,M,-5.12,M,1.2,0128*4C`;
        appBluetoothRtk.parseNmeaLine(fakeNmea);
        appBluetoothRtk.device = { name: "CHCNAV_i73_Simulated_Fix" };
        appBluetoothRtk.updateUi();
        triggerHaptic('success');
        showToast("⚡ Đã kích hoạt giả lập RTK FIX (Độ chính xác ±8mm, 32 SVs)!");
    },

    toNmeaCoord(deg, type) {
        const d = Math.floor(Math.abs(deg));
        const m = (Math.abs(deg) - d) * 60;
        const hemi = type === 'lat' ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
        const strDeg = type === 'lat' ? String(d).padStart(2, '0') : String(d).padStart(3, '0');
        const strMin = m.toFixed(4).padStart(7, '0');
        return `${strDeg}${strMin},${hemi}`;
    },

    nmeaBuffer: "",
    handleNmeaChunk(chunk) {
        appBluetoothRtk.nmeaBuffer += chunk;
        const lines = appBluetoothRtk.nmeaBuffer.split('\n');
        appBluetoothRtk.nmeaBuffer = lines.pop(); // giữ lại phần dở dang
        for (const line of lines) {
            const clean = line.trim();
            if (clean.startsWith('$GNGGA') || clean.startsWith('$GPGGA')) {
                appBluetoothRtk.parseNmeaLine(clean);
            }
        }
    },

    parseNmeaLine(line) {
        const term = document.getElementById('rtkNmeaTerminal');
        if (term) {
            term.innerText = line + "\n" + term.innerText.slice(0, 300);
        }

        const parts = line.split(',');
        if (parts.length < 10) return;

        // Trích xuất Lat/Lng NMEA: ddmm.mmmm
        const rawLat = parts[2];
        const latHemi = parts[3];
        const rawLng = parts[4];
        const lngHemi = parts[5];
        const fixQuality = parseInt(parts[6], 10);
        const satCount = parseInt(parts[7], 10) || 0;
        const hdop = parseFloat(parts[8]) || 1.0;
        const alt = parseFloat(parts[9]) || 0;

        if (!rawLat || !rawLng) return;

        const latDeg = parseInt(rawLat.slice(0, 2), 10);
        const latMin = parseFloat(rawLat.slice(2));
        let lat = latDeg + latMin / 60;
        if (latHemi === 'S') lat = -lat;

        const lngDeg = parseInt(rawLng.slice(0, 3), 10);
        const lngMin = parseFloat(rawLng.slice(3));
        let lng = lngDeg + lngMin / 60;
        if (lngHemi === 'W') lng = -lng;

        // Phân loại giải pháp GNSS
        let sol = "Single (GPS)";
        let hrms = (hdop * 1.5 * 1000).toFixed(0);
        let vrms = (hdop * 2.5 * 1000).toFixed(0);
        if (fixQuality === 4) {
            sol = "RTK FIX (Centimet)";
            hrms = (hdop * 8).toFixed(1);
            vrms = (hdop * 14).toFixed(1);
        } else if (fixQuality === 5) {
            sol = "RTK FLOAT (Decimet)";
            hrms = (hdop * 120).toFixed(0);
            vrms = (hdop * 220).toFixed(0);
        } else if (fixQuality === 2) {
            sol = "DGPS (Sub-meter)";
            hrms = (hdop * 600).toFixed(0);
            vrms = (hdop * 900).toFixed(0);
        }

        // Chuyển sang VN-2000
        const vn2k = VN2000.wgs84ToVn2000(lat, lng, AppState.kttDeg, AppState.kttMin, AppState.muiVal);

        appBluetoothRtk.rtkData = {
            solType: sol,
            satCount: satCount,
            hrms: hrms,
            vrms: vrms,
            lat: lat,
            lng: lng,
            alt: alt,
            vn2kX: vn2k ? vn2k.x : null,
            vn2kY: vn2k ? vn2k.y : null
        };

        // Nếu bật ưu tiên vị trí RTK ngoài
        if (appBluetoothRtk.useExternalRtk) {
            AppState.currentPos = { lat: lat, lng: lng };
            AppState.gpsAccuracy = fixQuality === 4 ? 0.008 : (fixQuality === 5 ? 0.15 : 1.5);
            AppState.gpsAltitude = alt;
            if (typeof appStakeout !== 'undefined' && appStakeout.updateLiveNavigation) {
                appStakeout.updateLiveNavigation();
            }
        }

        appBluetoothRtk.updateUi();
    },

    toggleUseRtk(enabled) {
        appBluetoothRtk.useExternalRtk = enabled;
        const slider = document.getElementById('sliderUseRtk');
        if (slider) slider.style.backgroundColor = enabled ? '#0284c7' : '#334155';
        if (enabled) {
            showToast("✓ Đã bật ưu tiên sử dụng vị trí chính xác centimet từ máy RTK ngoài!");
            if (appBluetoothRtk.rtkData.lat) {
                AppState.currentPos = { lat: appBluetoothRtk.rtkData.lat, lng: appBluetoothRtk.rtkData.lng };
                AppState.gpsAccuracy = 0.008;
            }
        } else {
            showToast("📱 Đã chuyển lại sử dụng GPS tích hợp của điện thoại.");
        }
    }
};

// ================= 9.2 GIAO HỘI TRẮC ĐỊA KHI MẤT SÓNG GPS =================
const appResection = {
    side: 'right',
    calculatedPoint: null,

    initModal() {
        const selA = document.getElementById('selResectionPtA');
        const selB = document.getElementById('selResectionPtB');
        if (!selA || !selB) return;

        const pts = appData.getPoints(AppState.currentProject);
        let opts = '<option value="">-- Chọn mốc có sẵn --</option>';
        pts.forEach((p, idx) => {
            opts += `<option value="${idx}">${p.name} (X: ${p.x.toFixed(1)}, Y: ${p.y.toFixed(1)})</option>`;
        });
        selA.innerHTML = opts;
        selB.innerHTML = opts;
    },

    onSelectPtA(val) {
        if (val === '') return;
        const pts = appData.getPoints(AppState.currentProject);
        const p = pts[parseInt(val, 10)];
        if (p) {
            document.getElementById('txtResectionXA').value = p.x.toFixed(3);
            document.getElementById('txtResectionYA').value = p.y.toFixed(3);
        }
    },

    onSelectPtB(val) {
        if (val === '') return;
        const pts = appData.getPoints(AppState.currentProject);
        const p = pts[parseInt(val, 10)];
        if (p) {
            document.getElementById('txtResectionXB').value = p.x.toFixed(3);
            document.getElementById('txtResectionYB').value = p.y.toFixed(3);
        }
    },

    setSide(s) {
        appResection.side = s;
        const btnR = document.getElementById('btnResectionSideRight');
        const btnL = document.getElementById('btnResectionSideLeft');
        if (btnR) btnR.classList.toggle('active', s === 'right');
        if (btnL) btnL.classList.toggle('active', s === 'left');
    },

    calculate() {
        const xA = parseFloat(document.getElementById('txtResectionXA')?.value);
        const yA = parseFloat(document.getElementById('txtResectionYA')?.value);
        const dA = parseFloat(document.getElementById('txtResectionDistA')?.value);

        const xB = parseFloat(document.getElementById('txtResectionXB')?.value);
        const yB = parseFloat(document.getElementById('txtResectionYB')?.value);
        const dB = parseFloat(document.getElementById('txtResectionDistB')?.value);

        if (isNaN(xA) || isNaN(yA) || isNaN(dA) || isNaN(xB) || isNaN(yB) || isNaN(dB)) {
            showToast("⚠️ Vui lòng nhập đầy đủ tọa độ và khoảng cách của 2 mốc khống chế!", true);
            return;
        }

        if (dA <= 0 || dB <= 0) {
            showToast("⚠️ Khoảng cách đo phải lớn hơn 0!", true);
            return;
        }

        // Tính cự ly AB
        const dx = xB - xA;
        const dy = yB - yA;
        const dAB = Math.sqrt(dx * dx + dy * dy);

        if (dAB < 0.001) {
            showToast("⚠️ Hai mốc A và B trùng nhau! Vui lòng chọn 2 mốc phân biệt.", true);
            return;
        }

        // Kiểm tra bất đẳng thức tam giác
        if (dA + dB < dAB) {
            showToast(`⚠️ Không thể giao hội: Tổng khoảng cách (${(dA + dB).toFixed(2)}m) nhỏ hơn cự ly 2 mốc AB (${dAB.toFixed(2)}m)!`, true);
            return;
        }
        if (Math.abs(dA - dB) > dAB) {
            showToast(`⚠️ Không thể giao hội: Hiệu khoảng cách lớn hơn cự ly 2 mốc AB!`, true);
            return;
        }

        // Góc kẹp alpha tại đỉnh A
        const cosAlpha = (dAB * dAB + dA * dA - dB * dB) / (2 * dAB * dA);
        const clampedCos = Math.max(-1, Math.min(1, cosAlpha));
        const alpha = Math.acos(clampedCos);

        // Phương vị tuyến AB
        const azAB = Math.atan2(dy, dx);

        // Phương vị từ A đến trạm P
        const azAP = (appResection.side === 'right') ? (azAB + alpha) : (azAB - alpha);

        // Tọa độ trạm đo P
        const xP = xA + dA * Math.cos(azAP);
        const yP = yA + dA * Math.sin(azAP);

        // Chuyển sang WGS-84
        const wgs = VN2000.vn2000ToWgs84(xP, yP, AppState.kttDeg, AppState.kttMin, AppState.muiVal);

        appResection.calculatedPoint = {
            x: xP,
            y: yP,
            lat: wgs ? wgs.lat : null,
            lng: wgs ? wgs.lng : null,
            distAB: dAB
        };

        // Cập nhật UI
        const resCard = document.getElementById('resectionResultCard');
        if (resCard) resCard.style.display = 'block';

        const elX = document.getElementById('resResectionX');
        const elY = document.getElementById('resResectionY');
        const elWgs = document.getElementById('resResectionWgs');
        const elDist = document.getElementById('resResectionDistAB');

        if (elX) elX.innerText = xP.toFixed(3);
        if (elY) elY.innerText = yP.toFixed(3);
        if (elWgs && wgs) elWgs.innerText = `${wgs.lat.toFixed(6)}°, ${wgs.lng.toFixed(6)}°`;
        if (elDist) elDist.innerText = dAB.toFixed(3);

        triggerHaptic('success');
        showToast("✓ Đã tính toán xong tọa độ giao hội trắc địa!");
    },

    applyAsCurrentPosition() {
        if (!appResection.calculatedPoint || !appResection.calculatedPoint.lat) {
            showToast("⚠️ Vui lòng tính toán tọa độ giao hội trước!", true);
            return;
        }
        AppState.currentPos = {
            lat: appResection.calculatedPoint.lat,
            lng: appResection.calculatedPoint.lng
        };
        AppState.gpsAccuracy = 0.05; // Độ chính xác giao hội cao
        showToast("📍 Đã gán vị trí giao hội làm tọa độ thực địa hiện tại để tiếp tục đo đạc!");
    },

    saveAsProjectPoint() {
        if (!appResection.calculatedPoint) {
            showToast("⚠️ Chưa có kết quả tọa độ để lưu!", true);
            return;
        }
        const pts = appData.getPoints(AppState.currentProject);
        const newName = `GH_${pts.length + 1}`;
        pts.push({
            name: newName,
            x: parseFloat(appResection.calculatedPoint.x.toFixed(3)),
            y: parseFloat(appResection.calculatedPoint.y.toFixed(3)),
            lat: appResection.calculatedPoint.lat,
            lng: appResection.calculatedPoint.lng,
            note: "Điểm giao hội bù GPS"
        });
        appData.savePoints(AppState.currentProject, pts);
        showToast(`✓ Đã lưu mốc giao hội "${newName}" vào dự án!`);
    },

    viewOnMap() {
        if (!appResection.calculatedPoint || !appResection.calculatedPoint.lat) {
            showToast("⚠️ Vui lòng tính toán trước khi xem bản đồ!", true);
            return;
        }
        appModal.closeSettings();
        appNav.openProjectMap();
        if (appMap.map) {
            appMap.map.setView([appResection.calculatedPoint.lat, appResection.calculatedPoint.lng], 19);
        }
    }
};

// ================= 9.3 TRẮC DỌC ĐỊA HÌNH & KHỐI LƯỢNG ĐÀO ĐẮP (TCVN 4447) =================
const appElevationProfile = {
    currentTab: 'align',
    profileData: [],
    alignPoints: [],
    pitPoints: [],
    pickerMode: 'pit',
    pickerSelectedIds: new Set(),
    lastPitStats: null,

    switchTab(tab) {
        this.setTab(tab);
    },

    setTab(tab) {
        triggerHaptic('light');
        this.currentTab = (tab === 'alignment' || tab === 'align') ? 'align' : 'pit';
        const btnAlign = document.getElementById('btnProfileTabAlign');
        const btnPit = document.getElementById('btnProfileTabPit');
        const panelAlign = document.getElementById('profilePanelAlignment');
        const panelPit = document.getElementById('profilePanelPit');

        if (btnAlign) btnAlign.classList.toggle('active', this.currentTab === 'align');
        if (btnPit) btnPit.classList.toggle('active', this.currentTab === 'pit');
        if (panelAlign) panelAlign.classList.toggle('active', this.currentTab === 'align');
        if (panelPit) panelPit.classList.toggle('active', this.currentTab === 'pit');

        if (this.currentTab === 'pit') {
            this.calculateAndRenderPit();
        } else {
            this.calculateAndRender();
        }
    },

    openModal() {
        appNav.showScreen('profile');
    },

    closeModal() {
        appNav.goToMenu();
    },

    // --- BỘ CHỌN MỐC DỰ ÁN CHO TUYẾN / HỐ ĐÀO ---
    loadFromProject() {
        this.openProjectPointPicker('align');
    },

    loadPitFromProject() {
        this.openProjectPointPicker('pit');
    },

    pickFromMap(mode) {
        triggerHaptic('light');
        appNav.openProjectMap();
        const targetName = (mode === 'alignment' || mode === 'align') ? "Tuyến trắc dọc" : "Hố đào móng";
        showToast(`🗺️ Đã mở Bản đồ dự án. Bạn có thể xem và quản lý các mốc cho ${targetName}!`);
    },

    openProjectPointPicker(mode = 'pit') {
        triggerHaptic('light');
        this.pickerMode = (mode === 'alignment' || mode === 'align') ? 'align' : 'pit';
        const modal = document.getElementById('modalPitPointPicker');
        const projNameEl = document.getElementById('txtPickerProjName');
        const listEl = document.getElementById('listProjectPointsPicker');
        const titleEl = modal ? modal.querySelector('.modal-title span') : null;
        const confirmBtn = modal ? modal.querySelector('.btn-green') : null;
        if (!modal || !listEl) return;

        if (titleEl) {
            titleEl.innerText = this.pickerMode === 'align'
                ? "📁 Chọn Cọc Mốc Cho Tuyến Trắc Dọc"
                : "📁 Chọn Mốc Dự Án Cho Hố Đào (TCVN 4447)";
        }
        if (confirmBtn) {
            confirmBtn.innerText = this.pickerMode === 'align'
                ? "✓ Nạp Các Mốc Đã Chọn Vào Tuyến Trắc Dọc"
                : "✓ Nạp Các Mốc Đã Chọn Vào Hố Đào";
        }

        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Dự án hiện tại";
        if (projNameEl) projNameEl.innerText = projName;

        const allPoints = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject) : [];
        if (!allPoints || allPoints.length === 0) {
            listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">⚠️ Dự án này chưa có điểm mốc nào. Vui lòng thêm mốc hoặc chuyển đổi tọa độ trước!</div>';
            modal.classList.add('active');
            modal.style.display = 'flex';
            return;
        }

        // Khởi tạo tập chọn từ mốc hiện có
        this.pickerSelectedIds.clear();
        const currentPoints = (this.pickerMode === 'align') ? this.alignPoints : this.pitPoints;
        if (currentPoints && currentPoints.length > 0) {
            currentPoints.forEach(p => {
                if (p.id) this.pickerSelectedIds.add(String(p.id));
                else if (p.name) this.pickerSelectedIds.add(String(p.name));
            });
        } else {
            // Mặc định chọn tất cả mốc nếu chưa chọn cái nào
            allPoints.forEach(p => this.pickerSelectedIds.add(String(p.id || p.name)));
        }

        let html = '';
        allPoints.forEach((pt, idx) => {
            const pId = String(pt.id || pt.name || idx);
            const isChecked = this.pickerSelectedIds.has(pId);
            const pName = pt.name || `M${idx + 1}`;
            const x = (typeof pt.x === 'number') ? pt.x.toFixed(2) : (pt.x || '--');
            const y = (typeof pt.y === 'number') ? pt.y.toFixed(2) : (pt.y || '--');
            const z = (typeof pt.z === 'number') ? pt.z.toFixed(2) : (pt.z || '0.00');

            html += `
            <label style="display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; cursor: pointer; transition: background 0.15s ease;" onmouseover="this.style.background='rgba(56, 189, 248, 0.15)'" onmouseout="this.style.background='rgba(30, 41, 59, 0.7)'">
                <input type="checkbox" style="width: 17px; height: 17px; accent-color: #0284c7; cursor: pointer;" value="${pId}" ${isChecked ? 'checked' : ''} onchange="appElevationProfile.togglePickerPoint('${pId}', this.checked)">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <b style="color: #38bdf8; font-size: 12.5px;">${pName}</b>
                        <span style="font-size: 11px; color: #4ade80; background: rgba(74, 222, 128, 0.1); padding: 1px 6px; border-radius: 4px;">H=${z}m</span>
                    </div>
                    <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">X: ${x} | Y: ${y}</div>
                </div>
            </label>`;
        });

        listEl.innerHTML = html;
        modal.classList.add('active');
        modal.style.display = 'flex';
    },

    togglePickerPoint(pId, isChecked) {
        if (isChecked) {
            this.pickerSelectedIds.add(String(pId));
        } else {
            this.pickerSelectedIds.delete(String(pId));
        }
    },

    selectAllPickerPoints(shouldSelect) {
        triggerHaptic('light');
        const listEl = document.getElementById('listProjectPointsPicker');
        if (!listEl) return;
        const checkboxes = listEl.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = shouldSelect;
            if (shouldSelect) {
                this.pickerSelectedIds.add(cb.value);
            } else {
                this.pickerSelectedIds.delete(cb.value);
            }
        });
    },

    closeProjectPointPicker() {
        const modal = document.getElementById('modalPitPointPicker');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    confirmProjectPointPicker() {
        triggerHaptic('medium');
        const allPoints = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject) : [];
        const selected = [];

        allPoints.forEach((pt, idx) => {
            const pId = String(pt.id || pt.name || idx);
            if (this.pickerSelectedIds.has(pId)) {
                selected.push({
                    id: pt.id || `P${idx+1}`,
                    name: pt.name || `M${idx+1}`,
                    x: parseFloat(pt.x) || 0,
                    y: parseFloat(pt.y) || 0,
                    z: parseFloat(pt.z) || 10.0,
                    lat: pt.lat,
                    lng: pt.lng
                });
            }
        });

        if (this.pickerMode === 'align') {
            if (selected.length < 2) {
                showToast("⚠️ Cần chọn tối thiểu 2 điểm cọc mốc để vẽ trắc dọc tuyến!", true);
                return;
            }
            this.alignPoints = selected;
            this.closeProjectPointPicker();
            this.calculateAndRender();
            showToast(`✓ Đã nạp ${selected.length} cọc mốc vào Tuyến trắc dọc!`);
        } else {
            if (selected.length < 3) {
                showToast("⚠️ Cần chọn tối thiểu 3 điểm mốc để tạo chu vi đa giác đáy hố đào!", true);
                return;
            }
            this.pitPoints = selected;
            this.renderPitPointsTable();
            this.closeProjectPointPicker();
            this.calculateAndRenderPit();
            showToast(`✓ Đã nạp ${selected.length} mốc đáy hố đào từ dự án!`);
        }
    },

    renderPitPointsTable() {
        const tbody = document.getElementById('tablePitBody');
        const badge = document.getElementById('txtPitPointCountBadge');
        if (badge) badge.innerText = `${this.pitPoints.length} mốc`;

        if (!tbody) return;
        if (!this.pitPoints || this.pitPoints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 10px; color: #94a3b8; text-align: center;">Chưa có mốc. Bấm [Chọn mốc Dự án] để bắt đầu.</td></tr>';
            return;
        }

        let html = '';
        this.pitPoints.forEach((pt, idx) => {
            html += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 6px 8px; font-weight: 700; color: #38bdf8; text-align: left;">${pt.name || 'M' + (idx+1)}</td>
                <td style="padding: 6px 8px; font-family: ui-monospace, monospace; text-align: right; font-variant-numeric: tabular-nums;">${pt.x.toFixed(3)}</td>
                <td style="padding: 6px 8px; font-family: ui-monospace, monospace; text-align: right; font-variant-numeric: tabular-nums;">${pt.y.toFixed(3)}</td>
                <td style="padding: 6px 8px; color: #4ade80; font-family: ui-monospace, monospace; text-align: right; font-variant-numeric: tabular-nums;">${pt.z.toFixed(2)}</td>
                <td style="padding: 6px 8px; text-align: center;">
                    <button class="btn-sm btn-red" style="padding: 2px 7px; font-size: 11px;" onclick="appElevationProfile.removePitPoint(${idx})">✕</button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = html;
    },

    removePitPoint(idx) {
        triggerHaptic('light');
        if (this.pitPoints && this.pitPoints[idx]) {
            this.pitPoints.splice(idx, 1);
            this.renderPitPointsTable();
            this.calculateAndRenderPit();
        }
    },

    clearPitPoints() {
        triggerHaptic('light');
        this.pitPoints = [];
        this.renderPitPointsTable();
        this.calculateAndRenderPit();
        showToast("Đã xóa danh sách mốc hố đào.");
    },

    loadPitFromProject() {
        this.openProjectPointPicker();
    },

    loadPitFromCad() {
        triggerHaptic('light');
        if (typeof appCadTool !== 'undefined' && appCadTool.vertices && appCadTool.vertices.length >= 3) {
            this.pitPoints = appCadTool.vertices.map((v, i) => ({
                id: `CAD_${i+1}`,
                name: `C${i+1}`,
                x: v.x,
                y: v.y,
                z: v.z || 10.0,
                lat: v.lat,
                lng: v.lng
            }));
            this.renderPitPointsTable();
            this.calculateAndRenderPit();
            showToast(`✓ Đã nạp ${this.pitPoints.length} điểm từ công cụ CAD Mini!`);
            return;
        }

        if (typeof appCadTool !== 'undefined' && appCadTool.savedShapes && appCadTool.savedShapes.length > 0) {
            const polygonShape = appCadTool.savedShapes.find(s => s.type === 'polygon' && s.points && s.points.length >= 3);
            if (polygonShape) {
                this.pitPoints = polygonShape.points.map((p, i) => ({
                    id: `CAD_P${i+1}`,
                    name: `P${i+1}`,
                    x: p.x,
                    y: p.y,
                    z: p.z || 10.0,
                    lat: p.lat,
                    lng: p.lng
                }));
                this.renderPitPointsTable();
                this.calculateAndRenderPit();
                showToast(`✓ Đã nạp ${this.pitPoints.length} đỉnh đa giác từ CAD Tool!`);
                return;
            }
        }

        showToast("⚠️ Chưa có đa giác nào được vẽ trên CAD Mini. Hãy vẽ đa giác trước hoặc bấm [Chọn mốc Dự án]!", true);
    },

    // --- CÀI ĐẶT THÔNG SỐ TCVN 4447 & LOẠI ĐẤT ---
    applySoilPreset(type) {
        triggerHaptic('light');
        const alphaEl = document.getElementById('txtPitSlopeAngleAlpha');
        const talusEl = document.getElementById('txtPitTalusM');
        const bulkingEl = document.getElementById('txtPitBulkingK');

        if (type === 'rock') {
            // Đá nứt nẻ / Sét rất chắc: m = 0.5 (alpha = 63.43)
            if (alphaEl) alphaEl.value = '63.5';
            if (talusEl) talusEl.value = '0.50';
            if (bulkingEl) bulkingEl.value = '1.35';
        } else if (type === 'clay') {
            // Sét dẻo / Sét pha: m = 0.67 (alpha = 56.2)
            if (alphaEl) alphaEl.value = '56.0';
            if (talusEl) talusEl.value = '0.67';
            if (bulkingEl) bulkingEl.value = '1.25';
        } else if (type === 'loam') {
            // Cát pha / Đất thịt: m = 1.0 (alpha = 45.0)
            if (alphaEl) alphaEl.value = '45.0';
            if (talusEl) talusEl.value = '1.00';
            if (bulkingEl) bulkingEl.value = '1.20';
        } else if (type === 'sand') {
            // Cát rời rạc: m = 1.25 (alpha = 38.66)
            if (alphaEl) alphaEl.value = '38.5';
            if (talusEl) talusEl.value = '1.25';
            if (bulkingEl) bulkingEl.value = '1.15';
        }

        this.calculateAndRenderPit();
        showToast(`Đã áp dụng định mức TCVN 4447 cho: ${type.toUpperCase()}`);
    },

    onPitSlopeAngleChange() {
        const alphaEl = document.getElementById('txtPitSlopeAngleAlpha');
        const talusEl = document.getElementById('txtPitTalusM');
        if (!alphaEl) return;
        let alpha = parseFloat(alphaEl.value);
        if (isNaN(alpha) || alpha < 5) alpha = 5;
        if (alpha > 89) alpha = 89;
        const rad = (alpha * Math.PI) / 180.0;
        const m = 1.0 / Math.tan(rad);
        if (talusEl) talusEl.value = m.toFixed(2);
        this.calculateAndRenderPit();
    },

    onPitTalusChange() {
        const alphaEl = document.getElementById('txtPitSlopeAngleAlpha');
        const talusEl = document.getElementById('txtPitTalusM');
        if (!talusEl) return;
        let m = parseFloat(talusEl.value);
        if (isNaN(m) || m <= 0.01) m = 0.01;
        const rad = Math.atan(1.0 / m);
        const alpha = (rad * 180.0) / Math.PI;
        if (alphaEl) alphaEl.value = alpha.toFixed(1);
        this.calculateAndRenderPit();
    },

    onPitDesignHChange() {
        this.calculateAndRenderPit();
    },

    onPitAvgDepthChange() {
        const depthInput = document.getElementById('txtPitAvgDepthInput');
        const designHEl = document.getElementById('txtPitDesignH');
        if (!depthInput || !designHEl || !this.pitPoints || this.pitPoints.length === 0) {
            this.calculateAndRenderPit();
            return;
        }

        const hAvgTarget = parseFloat(depthInput.value) || 0;
        const avgNatH = this.pitPoints.reduce((s, p) => s + (p.z || 0), 0) / this.pitPoints.length;
        const calculatedHDay = avgNatH - hAvgTarget;
        designHEl.value = calculatedHDay.toFixed(2);
        this.calculateAndRenderPit();
    },

    // --- TÍNH TOÁN KHỐI LƯỢNG HỐ ĐÀO (TCVN 4447:2012) ---
    calculateAndRenderPit() {
        const pts = this.pitPoints;
        const bottomAreaEl = document.getElementById('resPitBottomArea');
        const bottomHaEl = document.getElementById('resPitBottomHa');
        const avgDepthEl = document.getElementById('resPitAvgDepth');
        const bottomPerimEl = document.getElementById('resPitBottomPerim');
        const deltaDEl = document.getElementById('resPitDeltaD');
        const topAreaEl = document.getElementById('resPitTopArea');
        const topHaEl = document.getElementById('resPitTopHa');
        const slopeInfoEl = document.getElementById('resPitSlopeInfo');
        const inSituVolEl = document.getElementById('resPitInSituVol');
        const looseVolEl = document.getElementById('resPitLooseVol');
        const truckCountEl = document.getElementById('resPitTruckCount');

        if (!pts || pts.length < 3) {
            if (bottomAreaEl) bottomAreaEl.innerText = "0.00";
            if (topAreaEl) topAreaEl.innerText = "0.00";
            if (inSituVolEl) inSituVolEl.innerText = "0.0 m³";
            if (looseVolEl) looseVolEl.innerText = "0.0 m³";
            this.drawPitCadCanvas([], [], null);
            return;
        }

        const n = pts.length;

        // 1. Tính diện tích đáy F1 bằng công thức Gauss Shoelace
        let f1Double = 0;
        let p1 = 0;
        for (let i = 0; i < n; i++) {
            const cur = pts[i];
            const next = pts[(i + 1) % n];
            f1Double += (cur.x * next.y - next.x * cur.y);
            const dx = next.x - cur.x;
            const dy = next.y - cur.y;
            p1 += Math.sqrt(dx * dx + dy * dy);
        }
        const f1 = Math.abs(f1Double) / 2.0;

        // Xác định hướng đa giác đáy (CCW vs CW)
        const isCCW = f1Double > 0;

        // 2. Chiều sâu đào bình quân h_bar = Z_TN_avg - H_đáy
        const designHEl = document.getElementById('txtPitDesignH');
        const designH = designHEl ? (parseFloat(designHEl.value) || 0) : 0;
        const avgNatH = pts.reduce((sum, p) => sum + (p.z || 0), 0) / n;
        let hBar = avgNatH - designH;
        if (hBar <= 0) hBar = 0.1; // Bảo vệ tối thiểu

        // Đồng bộ ô Chiều sâu đào h
        const avgDepthInput = document.getElementById('txtPitAvgDepthInput');
        if (avgDepthInput && document.activeElement !== avgDepthInput) {
            avgDepthInput.value = hBar.toFixed(2);
        }

        // 3. Mái dốc taluy m và độ mở rộng delta_d
        const talusEl = document.getElementById('txtPitTalusM');
        const alphaEl = document.getElementById('txtPitSlopeAngleAlpha');
        let m = talusEl ? parseFloat(talusEl.value) : 0.58;
        if (isNaN(m) || m <= 0.01) m = 0.58;
        const alpha = alphaEl ? parseFloat(alphaEl.value) : 60;
        const deltaD = m * hBar;

        // 4. Tính toán tọa độ đỉnh miệng hố đào (Offset đa giác ra ngoài theo pháp tuyến)
        const topPts = [];
        for (let i = 0; i < n; i++) {
            const prev = pts[(i - 1 + n) % n];
            const cur = pts[i];
            const next = pts[(i + 1) % n];

            // Vector 2 cạnh kề
            const v1x = cur.x - prev.x;
            const v1y = cur.y - prev.y;
            const len1 = Math.sqrt(v1x * v1x + v1y * v1y) || 1;
            const u1x = v1x / len1;
            const u1y = v1y / len1;

            const v2x = next.x - cur.x;
            const v2y = next.y - cur.y;
            const len2 = Math.sqrt(v2x * v2x + v2y * v2y) || 1;
            const u2x = v2x / len2;
            const u2y = v2y / len2;

            // Pháp tuyến hướng ra ngoài (phụ thuộc vào CCW hay CW)
            const n1x = isCCW ? u1y : -u1y;
            const n1y = isCCW ? -u1x : u1x;
            const n2x = isCCW ? u2y : -u2y;
            const n2y = isCCW ? -u2x : u2x;

            // Pháp tuyến trung bình góc đỉnh
            let bx = n1x + n2x;
            let by = n1y + n2y;
            const bLen = Math.sqrt(bx * bx + by * by);
            if (bLen > 0.001) {
                bx /= bLen;
                by /= bLen;
            } else {
                bx = n1x;
                by = n1y;
            }

            // Khoảng cách dịch đỉnh ra ngoài
            const dot = n1x * bx + n1y * by;
            let expandDist = deltaD;
            if (dot > 0.2) {
                expandDist = Math.min(deltaD / dot, deltaD * 2.5);
            }

            topPts.push({
                name: cur.name ? cur.name + '_M' : `M${i+1}_M`,
                x: cur.x + bx * expandDist,
                y: cur.y + by * expandDist,
                z: cur.z || avgNatH,
                deltaH: (cur.z || avgNatH) - designH
            });
        }

        // Tính diện tích miệng hố F2
        let f2Double = 0;
        for (let i = 0; i < n; i++) {
            const cur = topPts[i];
            const next = topPts[(i + 1) % n];
            f2Double += (cur.x * next.y - next.x * cur.y);
        }
        let f2 = Math.abs(f2Double) / 2.0;
        if (isNaN(f2) || f2 <= 0) {
            f2 = f1 + p1 * deltaD + Math.PI * deltaD * deltaD;
        }

        // 5. Thể tích hình chóp cụt theo TCVN 4447:2012 / Simpson Prismoidal
        const fMid = Math.pow((Math.sqrt(f1) + Math.sqrt(f2)), 2) / 4.0;
        const vDao = (hBar / 6.0) * (f1 + f2 + 4.0 * fMid);

        // 6. Thể tích đất tơi xốp & số chuyến xe ben
        const bulkingEl = document.getElementById('txtPitBulkingK');
        const kTx = bulkingEl ? (parseFloat(bulkingEl.value) || 1.25) : 1.25;
        const vNo = vDao * kTx;

        const truckVEl = document.getElementById('txtPitTruckV');
        const vTruck = truckVEl ? (parseFloat(truckVEl.value) || 10) : 10;
        const numTrucks = Math.ceil(vNo / (vTruck > 0 ? vTruck : 10));

        // Lưu thông số vào object để xuất DXF / CSV
        this.lastPitStats = {
            f1, f2, p1, hBar, deltaD, m, alpha, kTx, vDao, vNo, vTruck, numTrucks,
            designH, avgNatH, bottomPts: pts, topPts
        };

        // Cập nhật DOM
        if (bottomAreaEl) bottomAreaEl.innerText = f1.toFixed(2);
        if (bottomHaEl) bottomHaEl.innerText = (f1 / 10000).toFixed(4) + ' ha';
        if (avgDepthEl) avgDepthEl.innerText = hBar.toFixed(2);
        if (bottomPerimEl) bottomPerimEl.innerText = p1.toFixed(2);
        if (deltaDEl) deltaDEl.innerText = deltaD.toFixed(2);
        if (topAreaEl) topAreaEl.innerText = f2.toFixed(2);
        if (topHaEl) topHaEl.innerText = (f2 / 10000).toFixed(4) + ' ha';
        if (slopeInfoEl) slopeInfoEl.innerText = `${alpha.toFixed(1)}° (1:${m.toFixed(2)})`;
        if (inSituVolEl) inSituVolEl.innerText = vDao.toFixed(1) + ' m³';
        if (looseVolEl) looseVolEl.innerText = vNo.toFixed(1) + ' m³';
        if (truckCountEl) truckCountEl.innerText = numTrucks.toLocaleString('vi-VN');

        // 7. Vẽ bản vẽ CAD preview 2D có vạch taluy chuẩn trắc địa
        this.drawPitCadCanvas(pts, topPts, this.lastPitStats);
    },

    // --- VẼ BẢN VẼ MẶT BẰNG CAD TRỰC QUAN (CÓ VẠCH TALUY CHUẨN TRẮC ĐỊA) ---
    drawPitCadCanvas(bottomPts, topPts, stats) {
        const canvas = document.getElementById('pitCadCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width;
        const height = canvas.height;

        // Reset canvas
        ctx.clearRect(0, 0, width, height);

        // Nền đen kỹ thuật CAD
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, width, height);

        if (!bottomPts || bottomPts.length < 3 || !topPts || topPts.length < 3) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Chưa có dữ liệu đa giác mốc hố đào. Bấm [Chọn mốc Dự án] để hiển thị bản vẽ CAD.', width / 2, height / 2);
            return;
        }

        // 1. Tính toán bounding box để scale vừa vặn canvas
        const allPts = [...bottomPts, ...topPts];
        const minX = Math.min(...allPts.map(p => p.x));
        const maxX = Math.max(...allPts.map(p => p.x));
        const minY = Math.min(...allPts.map(p => p.y));
        const maxY = Math.max(...allPts.map(p => p.y));

        const spanX = Math.max(maxX - minX, 5.0);
        const spanY = Math.max(maxY - minY, 5.0);

        const pad = 65; // Padding cho chữ và bảng số liệu
        const drawW = width - pad * 2;
        const drawH = height - pad * 2;

        const scale = Math.min(drawW / spanX, drawH / spanY);

        // Hàm chuyển đổi tọa độ thực tế (X Bắc, Y Đông) sang pixel Canvas (X ngang, Y dọc)
        const toPix = (pt) => {
            // pt.y là Trục Đông (hoành độ), pt.x là Trục Bắc (tung độ)
            const px = pad + (pt.y - minY) * scale + (drawW - spanY * scale) / 2;
            const py = height - (pad + (pt.x - minX) * scale + (drawH - spanX * scale) / 2);
            return { x: px, y: py };
        };

        // 2. Vẽ lưới ô vuông trắc địa (Grid Lines)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.lineWidth = 1;
        const gridStep = Math.max(10, Math.pow(10, Math.floor(Math.log10(Math.max(spanX, spanY)))));
        ctx.beginPath();
        for (let gx = Math.floor(minY / gridStep) * gridStep; gx <= maxY; gx += gridStep) {
            const p1 = toPix({ x: minX, y: gx });
            const p2 = toPix({ x: maxX, y: gx });
            ctx.moveTo(p1.x, 0); ctx.lineTo(p1.x, height);
        }
        for (let gy = Math.floor(minX / gridStep) * gridStep; gy <= maxX; gy += gridStep) {
            const p1 = toPix({ x: gy, y: minY });
            ctx.moveTo(0, p1.y); ctx.lineTo(width, p1.y);
        }
        ctx.stroke();

        const n = bottomPts.length;

        // 3. Vẽ đường viền Miệng Hố Đào (Top Crest Polygon) - Màu Cyan nét đứt
        ctx.save();
        ctx.beginPath();
        const pTop0 = toPix(topPts[0]);
        ctx.moveTo(pTop0.x, pTop0.y);
        for (let i = 1; i < n; i++) {
            const pt = toPix(topPts[i]);
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
        ctx.fill();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();

        // 4. Vẽ đường viền Đáy Hố Đào (Bottom Polygon) - Màu Vàng nét liền
        ctx.save();
        ctx.beginPath();
        const pBot0 = toPix(bottomPts[0]);
        ctx.moveTo(pBot0.x, pBot0.y);
        for (let i = 1; i < n; i++) {
            const pt = toPix(bottomPts[i]);
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();

        // 5. Vẽ vạch Taluy kỹ thuật (Chuẩn Trắc Địa: Vạch dài / Vạch ngắn hướng từ miệng dốc về đáy)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const tA = toPix(topPts[i]);
            const tB = toPix(topPts[(i + 1) % n]);
            const bA = toPix(bottomPts[i]);
            const bB = toPix(bottomPts[(i + 1) % n]);

            const segLen = Math.hypot(tB.x - tA.x, tB.y - tA.y);
            const numTicks = Math.max(3, Math.floor(segLen / 16));

            for (let k = 1; k < numTicks; k++) {
                const t = k / numTicks;
                // Điểm trên miệng hố
                const pxTop = tA.x + (tB.x - tA.x) * t;
                const pyTop = tA.y + (tB.y - tA.y) * t;

                // Điểm tương ứng trên đáy
                const pxBot = bA.x + (bB.x - bA.x) * t;
                const pyBot = bA.y + (bB.y - bA.y) * t;

                // Vạch so le: Vạch chẵn dài 75%, vạch lẻ ngắn 35%
                const fraction = (k % 2 === 0) ? 0.75 : 0.35;
                const pxEnd = pxTop + (pxBot - pxTop) * fraction;
                const pyEnd = pyTop + (pyBot - pyTop) * fraction;

                ctx.moveTo(pxTop, pyTop);
                ctx.lineTo(pxEnd, pyEnd);
            }
        }
        ctx.stroke();

        // 6. Vẽ các điểm mốc đỉnh đáy và nhãn tên, cao độ
        bottomPts.forEach((pt, i) => {
            const pPix = toPix(pt);

            // Điểm mốc đáy (Vàng)
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(pPix.x, pPix.y, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Nhãn tên mốc & chiều sâu đào
            const pName = pt.name || `M${i+1}`;
            const depth = pt.z ? (pt.z - (stats ? stats.designH : 0)).toFixed(2) : '--';
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11.5px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(pName, pPix.x + 7, pPix.y - 4);
            ctx.fillStyle = '#f87171';
            ctx.font = '10px sans-serif';
            ctx.fillText(`h=${depth}m`, pPix.x + 7, pPix.y + 10);
        });

        // 7. Nhãn kích thước các cạnh đáy
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        for (let i = 0; i < n; i++) {
            const ptA = bottomPts[i];
            const ptB = bottomPts[(i + 1) % n];
            const pA = toPix(ptA);
            const pB = toPix(ptB);
            const dist = Math.hypot(ptB.x - ptA.x, ptB.y - ptA.y);
            const midX = (pA.x + pB.x) / 2;
            const midY = (pA.y + pB.y) / 2;
            ctx.fillText(`${dist.toFixed(1)}m`, midX, midY - 5);
        }

        // 8. Bảng Khung Tên CAD Kỹ Thuật (Title Block) góc trái dưới
        if (stats) {
            const bx = 12;
            const by = height - 100;
            const bw = 240;
            const bh = 88;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.lineWidth = 1;
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeRect(bx, by, bw, bh);

            ctx.textAlign = 'left';
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('📐 THIẾT KẾ HỐ ĐÀO - TCVN 4447', bx + 8, by + 16);

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '10px sans-serif';
            ctx.fillText(`• Đáy F1: ${stats.f1.toFixed(1)} m² | Miệng F2: ${stats.f2.toFixed(1)} m²`, bx + 8, by + 32);
            ctx.fillText(`• Chiều sâu h̄: ${stats.hBar.toFixed(2)} m | Mái dốc: 1:${stats.m.toFixed(2)} (${stats.alpha.toFixed(0)}°)`, bx + 8, by + 48);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 10.5px sans-serif';
            ctx.fillText(`• V_đào nguyên thổ: ${stats.vDao.toFixed(1)} m³`, bx + 8, by + 64);
            ctx.fillStyle = '#10b981';
            ctx.fillText(`• V_đất tơi xốp: ${stats.vNo.toFixed(1)} m³ (${stats.numTrucks} xe)`, bx + 8, by + 80);
        }
    },

    // --- CHUYỂN DỮ LIỆU SANG CAD MINI TRÊN BẢN ĐỒ ---
    sendPitToCadMini() {
        triggerHaptic('medium');
        if (!this.lastPitStats || !this.pitPoints || this.pitPoints.length < 3) {
            showToast("⚠️ Vui lòng tính toán hố đào trước khi chuyển sang CAD Mini!", true);
            return;
        }

        if (typeof appCadTool === 'undefined') {
            showToast("⚠️ Không tìm thấy công cụ CAD Mini!", true);
            return;
        }

        const pts = this.pitPoints;
        const topPts = this.lastPitStats.topPts;

        // Lưu đa giác đáy và miệng vào savedShapes của appCadTool
        if (!appCadTool.savedShapes) appCadTool.savedShapes = [];

        // Đa giác đáy hố đào (Màu Vàng)
        appCadTool.savedShapes.push({
            id: 'PIT_BOT_' + Date.now(),
            name: 'Đáy Hố Đào (' + this.lastPitStats.f1.toFixed(1) + 'm²)',
            type: 'polygon',
            color: '#eab308',
            closed: true,
            points: pts.map(p => ({ x: p.x, y: p.y, z: p.z, lat: p.lat, lng: p.lng }))
        });

        // Đa giác miệng hố đào (Màu Cyan)
        if (topPts && topPts.length >= 3) {
            appCadTool.savedShapes.push({
                id: 'PIT_TOP_' + (Date.now() + 1),
                name: 'Miệng Hố Đào (' + this.lastPitStats.f2.toFixed(1) + 'm²)',
                type: 'polygon',
                color: '#06b6d4',
                closed: true,
                points: topPts.map(p => ({ x: p.x, y: p.y, z: p.z, lat: p.lat, lng: p.lng }))
            });
        }

        // Mở bản đồ và kích hoạt CAD Tool
        appNav.openProjectMap();
        setTimeout(() => {
            appCadTool.openToolbar();
            if (appCadTool.redrawAllShapes) appCadTool.redrawAllShapes();
            showToast("✓ Đã chuyển mặt bằng hố đào và mái taluy sang CAD Mini trên bản đồ!");
        }, 300);
    },

    // --- XUẤT BẢN VẼ AUTOCAD DXF HỐ ĐÀO KỸ THUẬT (6 LAYER CHUYÊN NGHIỆP) ---
    exportPitDxf() {
        triggerHaptic('medium');
        if (!this.lastPitStats || !this.pitPoints || this.pitPoints.length < 3) {
            showToast("⚠️ Chưa có số liệu hố đào để xuất file AutoCAD DXF!", true);
            return;
        }

        const stats = this.lastPitStats;
        const bPts = stats.bottomPts;
        const tPts = stats.topPts;
        const n = bPts.length;
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project_Pit";

        let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
        dxf += "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n";
        dxf += "0\nLAYER\n2\nHODAO_DAY\n70\n0\n62\n2\n6\nCONTINUOUS\n0\n";       // 2: Yellow
        dxf += "LAYER\n2\nHODAO_MIENG\n70\n0\n62\n4\n6\nDASHED\n0\n";           // 4: Cyan
        dxf += "LAYER\n2\nHODAO_TALUY\n70\n0\n62\n1\n6\nCONTINUOUS\n0\n";       // 1: Red
        dxf += "LAYER\n2\nHODAO_DINH_MOC\n70\n0\n62\n3\n6\nCONTINUOUS\n0\n";    // 3: Green
        dxf += "LAYER\n2\nHODAO_KICH_THUOC\n70\n0\n62\n6\n6\nCONTINUOUS\n0\n";  // 6: Magenta
        dxf += "LAYER\n2\nHODAO_BANG_KHOILUONG\n70\n0\n62\n7\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n"; // 7: White

        dxf += "0\nSECTION\n2\nENTITIES\n";

        // 1. Closed Polyline Đáy Hố Đào (X: Đông/Y, Y: Bắc/X)
        dxf += "0\nPOLYLINE\n8\nHODAO_DAY\n66\n1\n70\n1\n";
        bPts.forEach(p => {
            // Tọa độ CAD: X = Y_Đông, Y = X_Bắc
            dxf += `0\nVERTEX\n8\nHODAO_DAY\n10\n${p.y.toFixed(3)}\n20\n${p.x.toFixed(3)}\n30\n${stats.designH.toFixed(3)}\n`;
        });
        dxf += "0\nSEQEND\n";

        // 2. Closed Polyline Miệng Hố Đào
        dxf += "0\nPOLYLINE\n8\nHODAO_MIENG\n66\n1\n70\n1\n";
        tPts.forEach(p => {
            dxf += `0\nVERTEX\n8\nHODAO_MIENG\n10\n${p.y.toFixed(3)}\n20\n${p.x.toFixed(3)}\n30\n${p.z.toFixed(3)}\n`;
        });
        dxf += "0\nSEQEND\n";

        // 3. Các vạch Taluy dốc
        for (let i = 0; i < n; i++) {
            const tA = tPts[i];
            const tB = tPts[(i + 1) % n];
            const bA = bPts[i];
            const bB = bPts[(i + 1) % n];

            const segLen = Math.hypot(tB.x - tA.x, tB.y - tA.y);
            const numTicks = Math.max(3, Math.floor(segLen / 2.5)); // Cứ 2.5m 1 vạch taluy

            for (let k = 1; k < numTicks; k++) {
                const t = k / numTicks;
                const pxTop = tA.y + (tB.y - tA.y) * t;
                const pyTop = tA.x + (tB.x - tA.x) * t;
                const pxBot = bA.y + (bB.y - bA.y) * t;
                const pyBot = bA.x + (bB.x - bA.x) * t;

                const fraction = (k % 2 === 0) ? 0.75 : 0.35;
                const pxEnd = pxTop + (pxBot - pxTop) * fraction;
                const pyEnd = pyTop + (pyBot - pyTop) * fraction;

                dxf += `0\nLINE\n8\nHODAO_TALUY\n10\n${pxTop.toFixed(3)}\n20\n${pyTop.toFixed(3)}\n30\n0.0\n11\n${pxEnd.toFixed(3)}\n21\n${pyEnd.toFixed(3)}\n31\n0.0\n`;
            }
        }

        // 4. Mốc đỉnh đáy và text chú thích
        bPts.forEach((p, idx) => {
            const pName = (p.name || `M${idx+1}`).replace(/[\r\n]/g, '');
            const depth = (p.z - stats.designH).toFixed(2);
            dxf += `0\nPOINT\n8\nHODAO_DINH_MOC\n10\n${p.y.toFixed(3)}\n20\n${p.x.toFixed(3)}\n30\n${stats.designH.toFixed(3)}\n`;
            dxf += `0\nTEXT\n8\nHODAO_DINH_MOC\n10\n${(p.y + 0.6).toFixed(3)}\n20\n${(p.x + 0.6).toFixed(3)}\n30\n0.0\n40\n1.5\n1\n${pName} (H_day=${stats.designH.toFixed(2)}m, h=${depth}m)\n`;
        });

        // 5. Đường kích thước cạnh đáy
        for (let i = 0; i < n; i++) {
            const pA = bPts[i];
            const pB = bPts[(i + 1) % n];
            const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
            const midY = (pA.x + pB.x) / 2;
            const midX = (pA.y + pB.y) / 2;
            dxf += `0\nTEXT\n8\nHODAO_KICH_THUOC\n10\n${midX.toFixed(3)}\n20\n${midY.toFixed(3)}\n30\n0.0\n40\n1.2\n1\nL=${dist.toFixed(2)}m\n`;
        }

        // 6. Bảng Kê Khối Lượng TCVN 4447 đặt bên cạnh hố đào
        const minX = Math.min(...bPts.map(p => p.y));
        const maxY = Math.max(...bPts.map(p => p.x));
        const tbX = minX - 45.0;
        let tbY = maxY + 10.0;
        const lineH = 3.2;

        const tableLines = [
            `BAN VE MAT BANG HO DAO - DU AN: ${projName.toUpperCase()}`,
            `TIEU CHUAN AP DUNG: TCVN 4447:2012 (CONG TAC DAT)`,
            `------------------------------------------------------`,
            `• Dien tich day mong (F1):       ${stats.f1.toFixed(2)} m2 (${(stats.f1/10000).toFixed(4)} ha)`,
            `• Dien tich mieng ho (F2):       ${stats.f2.toFixed(2)} m2 (${(stats.f2/10000).toFixed(4)} ha)`,
            `• Chu vi day mong (P1):          ${stats.p1.toFixed(2)} m`,
            `• Chieu sau dao binh quan (h_bar): ${stats.hBar.toFixed(2)} m`,
            `• Cao do day ho thiet ke (H_day): ${stats.designH.toFixed(2)} m`,
            `• Mai doc taluy ho dao:          1:${stats.m.toFixed(2)} (alpha = ${stats.alpha.toFixed(1)} deg)`,
            `• He so no roi cua dat (k_tx):   ${stats.kTx.toFixed(2)}`,
            `------------------------------------------------------`,
            `* KHOI LUONG DAO NGUYEN THO (V_dao): ${stats.vDao.toFixed(1)} m3`,
            `* KHOI LUONG DAT TOI XOP (V_noi):    ${stats.vNo.toFixed(1)} m3`,
            `* UOC TINH VAN CHUYEN (${stats.vTruck}m3/xe):   ${stats.numTrucks} CHUYEN XE BEN`
        ];

        tableLines.forEach(line => {
            const isHeader = line.startsWith('BAN VE') || line.startsWith('*');
            const txtH = isHeader ? 2.2 : 1.6;
            dxf += `0\nTEXT\n8\nHODAO_BANG_KHOILUONG\n10\n${tbX.toFixed(3)}\n20\n${tbY.toFixed(3)}\n30\n0.0\n40\n${txtH}\n1\n${line}\n`;
            tbY -= lineH;
        });

        dxf += "0\nENDSEC\n0\nEOF\n";

        const blob = new Blob([dxf], { type: "application/dxf;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `MatBang_HoDao_${projName}.dxf`;
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất bản vẽ AutoCAD DXF hố đào: ${filename}!`);
    },

    // --- XUẤT BÁO CÁO CSV CHI TIẾT ---
    exportPitCsv() {
        triggerHaptic('medium');
        if (!this.lastPitStats || !this.pitPoints || this.pitPoints.length < 3) {
            showToast("⚠️ Chưa có số liệu hố đào để xuất file CSV!", true);
            return;
        }

        const stats = this.lastPitStats;
        const pts = stats.bottomPts;
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project_Pit";

        let csv = "\uFEFF"; // UTF-8 BOM cho Excel
        csv += "BAO CAO TINH TOAN KHOI LUONG HO DAO VA SAN NEN (TCVN 4447:2012)\n";
        csv += `Du an:;${projName}\n`;
        csv += `Ngay lap:;${new Date().toLocaleString('vi-VN')}\n\n`;

        csv += "THONG SO TONG HOP\n";
        csv += `Dien tich day mong F1 (m2):;${stats.f1.toFixed(2)}\n`;
        csv += `Chu vi day mong P1 (m):;${stats.p1.toFixed(2)}\n`;
        csv += `Chieu sau dao trung binh h (m):;${stats.hBar.toFixed(2)}\n`;
        csv += `Cao do day thiet ke H_day (m):;${stats.designH.toFixed(2)}\n`;
        csv += `Goc mai doc taluy alpha (do):;${stats.alpha.toFixed(1)}\n`;
        csv += `He so mai doc m (1:m):;${stats.m.toFixed(2)}\n`;
        csv += `Do mo rong taluy delta_d (m):;${stats.deltaD.toFixed(2)}\n`;
        csv += `Dien tich mieng ho F2 (m2):;${stats.f2.toFixed(2)}\n`;
        csv += `He so no dat k_tx:;${stats.kTx.toFixed(2)}\n`;
        csv += `KHOI LUONG DAO NGUYEN THO V_DAO (m3):;${stats.vDao.toFixed(2)}\n`;
        csv += `KHOI LUONG DAT TOI XOP V_NOI (m3):;${stats.vNo.toFixed(2)}\n`;
        csv += `SO CHUYEN XE BEN VAN CHUYEN (${stats.vTruck}m3/xe):;${stats.numTrucks}\n\n`;

        csv += "BANG TOA DO CAC MOC DAY HO DAO\n";
        csv += "STT;Ten Moc;X (Bac - m);Y (Dong - m);H_Tu nhien (m);Chieu sau dao h (m)\n";
        pts.forEach((p, idx) => {
            const depth = (p.z - stats.designH).toFixed(2);
            csv += `${idx+1};${p.name || 'M'+(idx+1)};${p.x.toFixed(3)};${p.y.toFixed(3)};${p.z.toFixed(3)};${depth}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `KhoiLuong_HoDao_${projName}.csv`;
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất báo cáo khối lượng: ${filename}!`);
    },

    // --- CÁC HÀM CHO TRẮC DỌC TUYẾN (PROFILE ALIGNMENT) ---
    calculateAndRender() {
        // Lấy danh sách điểm từ alignPoints nếu đã chọn, hoặc từ toàn bộ mốc dự án
        const pts = (this.alignPoints && this.alignPoints.length >= 2)
            ? this.alignPoints
            : ((typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject) : []);
        const canvas = document.getElementById('elevationProfileCanvas');
        const tbody = document.getElementById('tableVolumeBody');
        const resCut = document.getElementById('resTotalCutVol');
        const resFill = document.getElementById('resTotalFillVol');
        const resBal = document.getElementById('resBalanceVol');

        if (!pts || pts.length < 2) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding: 14px; color: #94a3b8; text-align: center;">Dự án cần tối thiểu 2 điểm mốc để vẽ trắc dọc tuyến.</td></tr>';
            return;
        }

        const z0Input = document.getElementById('txtProfileDesignZ0');
        const slopeInput = document.getElementById('txtProfileSlope');
        const widthBInput = document.getElementById('txtProfileWidthB');
        const taluyMInput = document.getElementById('txtProfileTaluyM');

        const z0 = z0Input ? (parseFloat(z0Input.value) || pts[0].z || 10.0) : 10.0;
        const slope = slopeInput ? ((parseFloat(slopeInput.value) || 0) / 100.0) : 0.0;
        const widthB = widthBInput ? (parseFloat(widthBInput.value) || 6.0) : 6.0;
        const taluyM = taluyMInput ? (parseFloat(taluyMInput.value) || 1.0) : 1.0;

        let cumDist = 0;
        const items = [];
        let totalCut = 0;
        let totalFill = 0;

        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (i > 0) {
                const prev = pts[i - 1];
                const d = Math.hypot((p.x || 0) - (prev.x || 0), (p.y || 0) - (prev.y || 0));
                cumDist += d;
            }

            const zNat = (typeof p.z === 'number') ? p.z : (parseFloat(p.z) || 10.0);
            const zDesign = z0 + cumDist * slope;
            const deltaH = zDesign - zNat; // > 0: Đắp, < 0: Đào

            // Diện tích mặt cắt ngang ước tính F = B*|h| + m*h^2
            const absH = Math.abs(deltaH);
            const area = widthB * absH + taluyM * absH * absH;
            const isCut = deltaH < 0;

            items.push({
                idx: i + 1,
                name: p.name || `C${i + 1}`,
                dist: cumDist,
                zNat,
                zDesign,
                deltaH,
                area,
                isCut,
                cutVol: 0,
                fillVol: 0
            });
        }

        // Tính khối lượng từng đoạn
        for (let i = 1; i < items.length; i++) {
            const p1 = items[i - 1];
            const p2 = items[i];
            const segL = p2.dist - p1.dist;

            if (p1.isCut === p2.isCut) {
                const vol = ((p1.area + p2.area) / 2.0) * segL;
                if (p2.isCut) {
                    p2.cutVol = vol;
                    totalCut += vol;
                } else {
                    p2.fillVol = vol;
                    totalFill += vol;
                }
            } else {
                // Đổi dấu từ đào sang đắp hoặc ngược lại
                const l1 = segL * (Math.abs(p1.deltaH) / (Math.abs(p1.deltaH) + Math.abs(p2.deltaH) || 1));
                const l2 = segL - l1;
                const v1 = (p1.area / 2.0) * l1;
                const v2 = (p2.area / 2.0) * l2;
                if (p1.isCut) {
                    p2.cutVol = v1;
                    p2.fillVol = v2;
                    totalCut += v1;
                    totalFill += v2;
                } else {
                    p2.fillVol = v1;
                    p2.cutVol = v2;
                    totalFill += v1;
                    totalCut += v2;
                }
            }
        }

        this.profileData = items;

        // Cập nhật DOM
        if (resCut) resCut.innerText = totalCut.toFixed(1) + ' m³';
        if (resFill) resFill.innerText = totalFill.toFixed(1) + ' m³';
        if (resBal) {
            const bal = totalFill - totalCut;
            resBal.innerText = (bal > 0 ? '+' : '') + bal.toFixed(1) + ' m³';
        }

        if (tbody) {
            let html = '';
            items.forEach(p => {
                const tcColor = p.deltaH > 0 ? '#38bdf8' : (p.deltaH < 0 ? '#ef4444' : '#cbd5e1');
                const tcText = (p.deltaH > 0 ? '+' : '') + p.deltaH.toFixed(2);
                html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 5px; font-weight: 700; color: #cbd5e1;">${p.name}</td>
                    <td style="padding: 5px; font-family: monospace;">${p.dist.toFixed(1)}</td>
                    <td style="padding: 5px; font-family: monospace; color: #4ade80;">${p.zNat.toFixed(2)}</td>
                    <td style="padding: 5px; font-family: monospace; color: #f87171;">${p.zDesign.toFixed(2)}</td>
                    <td style="padding: 5px; font-weight: 700; color: ${tcColor}; font-family: monospace;">${tcText}</td>
                    <td style="padding: 5px; color: #ef4444; font-family: monospace;">${p.cutVol > 0 ? p.cutVol.toFixed(1) : '-'}</td>
                    <td style="padding: 5px; color: #38bdf8; font-family: monospace;">${p.fillVol > 0 ? p.fillVol.toFixed(1) : '-'}</td>
                </tr>`;
            });
            tbody.innerHTML = html;
        }

        // Vẽ biểu đồ trắc dọc kỹ thuật
        this.drawCanvas(items);
    },

    drawCanvas(items) {
        const canvas = document.getElementById('elevationProfileCanvas');
        if (!canvas || !items || items.length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, w, h);

        const padLeft = 140; // Dành cho tiêu đề hàng bảng trích yếu
        const padRight = 30;
        const padTop = 30;
        const plotBottom = h - 140; // Bảng trích yếu cao 140px
        const plotH = plotBottom - padTop;
        const plotW = w - padLeft - padRight;

        const allZ = items.flatMap(p => [p.zNat, p.zDesign]);
        const minZ = Math.min(...allZ) - 1.0;
        const maxZ = Math.max(...allZ) + 1.0;
        const spanZ = Math.max(maxZ - minZ, 2.0);
        const maxDist = Math.max(items[items.length - 1].dist, 10.0);

        const toX = dist => padLeft + (dist / maxDist) * plotW;
        const toY = z => plotBottom - ((z - minZ) / spanZ) * plotH;

        // Vẽ lưới ngang
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let s = 0; s <= 5; s++) {
            const y = padTop + (plotH / 5) * s;
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();
        }

        // Đường tự nhiên (Xanh lá)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        items.forEach((p, idx) => {
            const x = toX(p.dist);
            const y = toY(p.zNat);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Đường thiết kế (Đỏ)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        items.forEach((p, idx) => {
            const x = toX(p.dist);
            const y = toY(p.zDesign);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Bảng trích yếu chuẩn trắc địa ở dưới
        const tableTop = plotBottom;
        const rowH = 26;
        const rowTitles = [
            "Độ cao thi công (m)",
            "Cao độ thiết kế (m)",
            "Cao độ tự nhiên (m)",
            "Lý trình dồn (m)",
            "Tên cọc mốc"
        ];

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padLeft, tableTop, plotW, rowH * 5);

        rowTitles.forEach((t, idx) => {
            const y = tableTop + idx * rowH;
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(w - padRight, y);
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(t, 14, y + 17);
        });

        // Đường gióng đứng và điền số liệu từng cọc
        items.forEach((p, idx) => {
            const x = toX(p.dist);

            // Đường gióng đứng
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(x, toY(Math.max(p.zNat, p.zDesign)));
            ctx.lineTo(x, tableTop + rowH * 5);
            ctx.stroke();
            ctx.setLineDash([]);

            // Điền chữ trong bảng
            ctx.font = '10.5px monospace';
            ctx.textAlign = 'center';

            // Hàng 0: Độ cao TC
            const deltaStr = (p.deltaH > 0 ? "+" : "") + p.deltaH.toFixed(2);
            ctx.fillStyle = p.deltaH > 0 ? '#38bdf8' : (p.deltaH < 0 ? '#ef4444' : '#cbd5e1');
            ctx.fillText(deltaStr, x, tableTop + 17);

            // Hàng 1: Cao độ TK
            ctx.fillStyle = '#f87171';
            ctx.fillText(p.zDesign.toFixed(2), x, tableTop + rowH + 17);

            // Hàng 2: Cao độ TN
            ctx.fillStyle = '#4ade80';
            ctx.fillText(p.zNat.toFixed(2), x, tableTop + rowH * 2 + 17);

            // Hàng 3: Lý trình
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(p.dist.toFixed(1), x, tableTop + rowH * 3 + 17);

            // Hàng 4: Tên cọc
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(p.name, x, tableTop + rowH * 4 + 17);
        });

        // Chú thích Legend góc trên
        ctx.textAlign = 'left';
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('― Mặt đất tự nhiên', padLeft + 10, padTop - 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('- - - Đường thiết kế', padLeft + 150, padTop - 10);
    },

    exportCsv() {
        if (!this.profileData || this.profileData.length === 0) {
            showToast("⚠️ Chưa có dữ liệu trắc dọc để xuất CSV!", true);
            return;
        }
        let csv = "\uFEFF";
        csv += "STT;Ten Coc;Ly Trinh (m);Z_Tu Nhien (m);Z_Thiet Ke (m);Do Cao Thi Cong (m);V_Dao (m3);V_Dap (m3)\n";
        this.profileData.forEach((p, idx) => {
            csv += `${idx+1};${p.name};${p.dist.toFixed(2)};${p.zNat.toFixed(2)};${p.zDesign.toFixed(2)};${p.deltaH.toFixed(2)};${p.cutVol.toFixed(2)};${p.fillVol.toFixed(2)}\n`;
        });
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("download", "TracDoc_Tuyen.csv");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("✓ Đã xuất file CSV trắc dọc!");
    },

    exportImage() {
        const canvas = document.getElementById('elevationProfileCanvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = 'BanVe_TracDoc.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast("✓ Đã tải ảnh bản vẽ trắc dọc PNG!");
    },

    exportDxfProfile() {
        if (!this.profileData || this.profileData.length === 0) {
            showToast("⚠️ Chưa có dữ liệu trắc dọc để xuất file DXF!", true);
            return;
        }

        const items = this.profileData;
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project";
        const scaleV = 5.0; // Phóng đại đứng 5x

        let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
        dxf += "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n";
        dxf += "0\nLAYER\n2\nTRACDOC_TUNHIEN\n70\n0\n62\n3\n6\nCONTINUOUS\n0\n";
        dxf += "LAYER\n2\nTRACDOC_THIETKE\n70\n0\n62\n1\n6\nCONTINUOUS\n0\n";
        dxf += "LAYER\n2\nTRACDOC_GIONG\n70\n0\n62\n8\n6\nDASHED\n0\n";
        dxf += "LAYER\n2\nTRACDOC_BANG_SO_LIEU\n70\n0\n62\n7\n6\nCONTINUOUS\n0\n";
        dxf += "LAYER\n2\nTRACDOC_TEXT_TIEUDE\n70\n0\n62\n4\n6\nCONTINUOUS\n0\n";
        dxf += "LAYER\n2\nTRACDOC_TEXT_SOLIEU\n70\n0\n62\n2\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n";

        dxf += "0\nSECTION\n2\nENTITIES\n";

        const allZ = items.flatMap(p => [p.zNat, p.zDesign]);
        const minZ = Math.floor(Math.min(...allZ) - 1.0);
        const datumY = 0;
        const rowH = 8.0;
        const tableBottom = datumY - rowH * 5;
        const maxDist = Math.max(items[items.length - 1].dist, 10.0);
        const leftHeaderX = -35.0;

        // 1. Polyline Tự Nhiên
        dxf += "0\nPOLYLINE\n8\nTRACDOC_TUNHIEN\n66\n1\n70\n0\n";
        items.forEach(p => {
            const xCad = p.dist;
            const yCad = datumY + (p.zNat - minZ) * scaleV;
            dxf += `0\nVERTEX\n8\nTRACDOC_TUNHIEN\n10\n${xCad.toFixed(3)}\n20\n${yCad.toFixed(3)}\n30\n0.0\n`;
        });
        dxf += "0\nSEQEND\n";

        // 2. Polyline Thiết Kế
        dxf += "0\nPOLYLINE\n8\nTRACDOC_THIETKE\n66\n1\n70\n0\n";
        items.forEach(p => {
            const xCad = p.dist;
            const yCad = datumY + (p.zDesign - minZ) * scaleV;
            dxf += `0\nVERTEX\n8\nTRACDOC_THIETKE\n10\n${xCad.toFixed(3)}\n20\n${yCad.toFixed(3)}\n30\n0.0\n`;
        });
        dxf += "0\nSEQEND\n";

        // 3. Đường gióng và text
        items.forEach((p, idx) => {
            const xCad = p.dist;
            const yMax = datumY + Math.max(p.zNat - minZ, p.zDesign - minZ) * scaleV + 2.0;

            dxf += `0\nLINE\n8\nTRACDOC_GIONG\n10\n${xCad.toFixed(3)}\n20\n${yMax.toFixed(3)}\n30\n0.0\n11\n${xCad.toFixed(3)}\n21\n${tableBottom.toFixed(3)}\n31\n0.0\n`;

            const cleanName = (p.name || `C${idx + 1}`).replace(/[\r\n]/g, '');
            dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n${xCad.toFixed(3)}\n20\n${(yMax + 1.0).toFixed(3)}\n30\n0.0\n40\n1.8\n1\n${cleanName}\n`;

            // Hàng 1
            const yRow1 = datumY - 0.6 * rowH;
            const deltaStr = (p.deltaH > 0 ? "+" : "") + p.deltaH.toFixed(2);
            dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n${xCad.toFixed(3)}\n20\n${yRow1.toFixed(3)}\n30\n0.0\n40\n1.6\n1\n${deltaStr}\n`;

            // Hàng 2
            const yRow2 = datumY - 1.6 * rowH;
            dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n${xCad.toFixed(3)}\n20\n${yRow2.toFixed(3)}\n30\n0.0\n40\n1.6\n1\n${p.zDesign.toFixed(2)}\n`;

            // Hàng 3
            const yRow3 = datumY - 2.6 * rowH;
            dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n${xCad.toFixed(3)}\n20\n${yRow3.toFixed(3)}\n30\n0.0\n40\n1.6\n1\n${p.zNat.toFixed(2)}\n`;

            // Hàng 4
            const yRow4 = datumY - 3.6 * rowH;
            dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n${xCad.toFixed(3)}\n20\n${yRow4.toFixed(3)}\n30\n0.0\n40\n1.6\n1\n${p.dist.toFixed(1)}\n`;

            // Hàng 5
            if (idx > 0) {
                const prevX = items[idx - 1].dist;
                const midX = (prevX + xCad) / 2;
                const interD = p.dist - items[idx - 1].dist;
                const yRow5 = datumY - 4.6 * rowH;
                dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n${midX.toFixed(3)}\n20\n${yRow5.toFixed(3)}\n30\n0.0\n40\n1.6\n1\n${interD.toFixed(1)}\n`;
            }
        });

        // Khung bảng số liệu
        for (let r = 0; r <= 5; r++) {
            const yLine = datumY - r * rowH;
            dxf += `0\nLINE\n8\nTRACDOC_BANG_SO_LIEU\n10\n${leftHeaderX.toFixed(3)}\n20\n${yLine.toFixed(3)}\n30\n0.0\n11\n${maxDist.toFixed(3)}\n21\n${yLine.toFixed(3)}\n31\n0.0\n`;
        }
        dxf += `0\nLINE\n8\nTRACDOC_BANG_SO_LIEU\n10\n${leftHeaderX.toFixed(3)}\n20\n${datumY.toFixed(3)}\n30\n0.0\n11\n${leftHeaderX.toFixed(3)}\n21\n${tableBottom.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nTRACDOC_BANG_SO_LIEU\n10\n0.0\n20\n${datumY.toFixed(3)}\n30\n0.0\n11\n0.0\n21\n${tableBottom.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nTRACDOC_BANG_SO_LIEU\n10\n${maxDist.toFixed(3)}\n20\n${datumY.toFixed(3)}\n30\n0.0\n11\n${maxDist.toFixed(3)}\n21\n${tableBottom.toFixed(3)}\n31\n0.0\n`;

        const rowTitlesDxf = [
            "DO CAO THI CONG (+DAP/-DAO)",
            "CAO DO THIET KE (Z_TK)",
            "CAO DO TU NHIEN (Z_TN)",
            "LY TRINH DONG (m)",
            "KHOANG CACH LE (m)"
        ];
        rowTitlesDxf.forEach((title, idx) => {
            const yT = datumY - (idx + 0.6) * rowH;
            dxf += `0\nTEXT\n8\nTRACDOC_TEXT_TIEUDE\n10\n${(leftHeaderX + 1.5).toFixed(3)}\n20\n${yT.toFixed(3)}\n30\n0.0\n40\n1.6\n1\n${title}\n`;
        });

        const titleY = datumY + (Math.max(...allZ) - minZ) * scaleV + 8.0;
        dxf += `0\nTEXT\n8\nTRACDOC_TEXT_TIEUDE\n10\n0.0\n20\n${titleY.toFixed(3)}\n30\n0.0\n40\n3.2\n1\nBAN VE TRAC DOC THIET KE & DAO DAP - DU AN: ${projName.toUpperCase()}\n`;
        dxf += `0\nTEXT\n8\nTRACDOC_TEXT_SOLIEU\n10\n0.0\n20\n${(titleY - 4.0).toFixed(3)}\n30\n0.0\n40\n1.8\n1\nTY LE NGANG: 1/1000  -  TY LE DUNG: 1/200 (Phong dai 5x)  -  CAO DO CHUAN DATUM = ${minZ.toFixed(2)}m\n`;

        dxf += "0\nENDSEC\n0\nEOF\n";

        const blob = new Blob([dxf], { type: "application/dxf;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `TracDoc_ThietKe_${projName}.dxf`;
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất bản vẽ AutoCAD DXF trắc dọc: ${filename}!`);
    }
};

// ================= 9.4 QUY ĐỔI CAO ĐỘ THỦY CHUẨN QUỐC GIA HÒN DẤU (VIGAC2017 / EGM2008) =================
const appGeoidVigac = {
    // Lưới điểm mốc mô hình Geoid VIGAC2017 Quốc gia (Lat, Lng -> Dị thường zeta)
    geoidGrid: [
        { lat: 22.8, lng: 104.9, zeta: 4.85 },  // Hà Giang
        { lat: 21.5, lng: 103.8, zeta: 6.20 },  // Sơn La / Tây Bắc
        { lat: 21.0, lng: 105.8, zeta: -3.95 }, // Hà Nội / Đồng bằng Bắc Bộ
        { lat: 20.8, lng: 106.7, zeta: -4.80 }, // Hải Phòng / Hòn Dấu
        { lat: 18.6, lng: 105.6, zeta: -6.40 }, // Nghệ An
        { lat: 16.5, lng: 107.5, zeta: -8.10 }, // Huế
        { lat: 16.0, lng: 108.2, zeta: -8.85 }, // Đà Nẵng
        { lat: 13.8, lng: 108.0, zeta: -7.60 }, // Tây Nguyên (Gia Lai / Kon Tum)
        { lat: 12.2, lng: 109.1, zeta: -9.50 }, // Nha Trang / Khánh Hòa
        { lat: 10.8, lng: 106.7, zeta: -11.45 },// TP. Hồ Chí Minh
        { lat: 10.3, lng: 105.7, zeta: -10.90 },// Đồng Tháp (Cao Lãnh)
        { lat: 10.0, lng: 105.8, zeta: -11.15 },// Cần Thơ
        { lat: 9.2, lng: 105.1, zeta: -12.10 }, // Cà Mau
        { lat: 10.2, lng: 103.9, zeta: -10.35 } // Phú Quốc / Kiên Giang
    ],

    openModal() {
        appNav.showScreen('geoid');
    },

    closeModal() {
        const m = document.getElementById('modalGeoidConverter');
        if (m) {
            m.classList.remove('active');
            m.style.display = 'none';
        }
    },

    onModelChange() {
        appGeoidVigac.convertFromEllipsoid();
    },

    useCurrentLocation() {
        let lat = 10.762622;
        let lng = 106.660172;
        let alt = 24.58;

        if (AppState.currentPos) {
            lat = AppState.currentPos.lat;
            lng = AppState.currentPos.lng;
        } else {
            const pts = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject) : [];
            if (pts && pts.length > 0 && pts[0].lat) {
                lat = pts[0].lat;
                lng = pts[0].lng;
            }
        }

        ['txtGeoidLat', 'txtGeoidLatScreen'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = lat.toFixed(6);
        });
        ['txtGeoidLng', 'txtGeoidLngScreen'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = lng.toFixed(6);
        });
        ['txtInputEllipsoidH', 'txtInputEllipsoidHScreen'].forEach(id => {
            const el = document.getElementById(id);
            if (el && (!el.value || el.value === '')) el.value = alt.toFixed(3);
        });

        appGeoidVigac.convertFromEllipsoid();
    },

    // Thuật toán nội suy song biến Inverse Distance Weighting (IDW) từ lưới VIGAC2017
    interpolateZeta(lat, lng) {
        let sumWeights = 0;
        let sumWeightedZeta = 0;

        for (const pt of appGeoidVigac.geoidGrid) {
            const dLat = lat - pt.lat;
            const dLng = lng - pt.lng;
            const distSq = dLat * dLat + dLng * dLng;

            if (distSq < 0.0001) return pt.zeta; // Trùng điểm mốc
            const w = 1 / Math.pow(distSq, 1.2);
            sumWeights += w;
            sumWeightedZeta += w * pt.zeta;
        }

        return parseFloat((sumWeightedZeta / sumWeights).toFixed(3));
    },

    convertFromEllipsoid(val) {
        const latEl = document.getElementById('txtGeoidLatScreen') || document.getElementById('txtGeoidLat');
        const lngEl = document.getElementById('txtGeoidLngScreen') || document.getElementById('txtGeoidLng');
        const lat = parseFloat(latEl?.value) || 10.762622;
        const lng = parseFloat(lngEl?.value) || 106.660172;

        const hEl = document.getElementById('txtInputEllipsoidHScreen') || document.getElementById('txtInputEllipsoidH');
        const h = val !== undefined ? parseFloat(val) : parseFloat(hEl?.value);

        if (isNaN(h)) return;

        const zeta = appGeoidVigac.interpolateZeta(lat, lng);
        const H = parseFloat((h - zeta).toFixed(3)); // H (Hòn Dấu) = h - zeta

        ['txtInputOrthometricH', 'txtInputOrthometricHScreen'].forEach(id => {
            const elH = document.getElementById(id);
            if (elH && document.activeElement !== elH) elH.value = H.toFixed(3);
        });
        ['resGeoidZeta', 'resGeoidZetaScreen'].forEach(id => {
            const res = document.getElementById(id);
            if (res) res.innerText = (zeta >= 0 ? '+' : '') + zeta.toFixed(3);
        });
        ['resGeoidResultH', 'resGeoidResultHScreen'].forEach(id => {
            const res = document.getElementById(id);
            if (res) res.innerText = H.toFixed(3) + ' m';
        });
        ['resGeoidResultEllip', 'resGeoidResultEllipScreen'].forEach(id => {
            const res = document.getElementById(id);
            if (res) res.innerText = h.toFixed(3) + ' m';
        });
    },

    convertFromOrthometric(val) {
        const latEl = document.getElementById('txtGeoidLatScreen') || document.getElementById('txtGeoidLat');
        const lngEl = document.getElementById('txtGeoidLngScreen') || document.getElementById('txtGeoidLng');
        const lat = parseFloat(latEl?.value) || 10.762622;
        const lng = parseFloat(lngEl?.value) || 106.660172;

        const hEl = document.getElementById('txtInputOrthometricHScreen') || document.getElementById('txtInputOrthometricH');
        const H = val !== undefined ? parseFloat(val) : parseFloat(hEl?.value);

        if (isNaN(H)) return;

        const zeta = appGeoidVigac.interpolateZeta(lat, lng);
        const h = parseFloat((H + zeta).toFixed(3)); // h = H + zeta

        ['txtInputEllipsoidH', 'txtInputEllipsoidHScreen'].forEach(id => {
            const elEllip = document.getElementById(id);
            if (elEllip && document.activeElement !== elEllip) elEllip.value = h.toFixed(3);
        });
        ['resGeoidZeta', 'resGeoidZetaScreen'].forEach(id => {
            const res = document.getElementById(id);
            if (res) res.innerText = (zeta >= 0 ? '+' : '') + zeta.toFixed(3);
        });
        ['resGeoidResultH', 'resGeoidResultHScreen'].forEach(id => {
            const res = document.getElementById(id);
            if (res) res.innerText = H.toFixed(3) + ' m';
        });
        ['resGeoidResultEllip', 'resGeoidResultEllipScreen'].forEach(id => {
            const res = document.getElementById(id);
            if (res) res.innerText = h.toFixed(3) + ' m';
        });
    },

    applyToAllProjectPoints() {
        const pts = appData.getPoints(AppState.currentProject);
        if (!pts || pts.length === 0) {
            showToast("⚠️ Dự án hiện chưa có mốc nào để áp dụng!", true);
            return;
        }

        const lat = parseFloat(document.getElementById('txtGeoidLat')?.value) || 10.762622;
        const lng = parseFloat(document.getElementById('txtGeoidLng')?.value) || 106.660172;
        const zeta = appGeoidVigac.interpolateZeta(lat, lng);

        let count = 0;
        pts.forEach(p => {
            const hVal = (typeof p.z === 'number' && !isNaN(p.z)) ? p.z : (AppState.gpsAltitude || 20.0);
            p.z = parseFloat((hVal - zeta).toFixed(3)); // Chuẩn hóa sang Hòn Dấu
            p.note = (p.note ? p.note + " | " : "") + "Cao độ Hòn Dấu VIGAC2017";
            count++;
        });

        appData.savePoints(AppState.currentProject, pts);
        showToast(`✓ Đã quy đổi thành công cao độ ${count} mốc sang Hệ Thủy Chuẩn Hòn Dấu (ζ = ${zeta.toFixed(3)}m)!`);
    }
};

// ================= 10. BỘ CÔNG CỤ VẼ MẶT BẰNG CÔNG TRÌNH CAD MINI (NHÓM 3.5) =================
// Tích hợp chuẩn thiết kế TCVN & kiểm soát chất lượng từ vn-autocad-skill
const appCadTool = {
    isActive: false,
    mode: 'polygon', // 'polygon' | 'polyline' | 'select'
    activeToolTab: 'draw', // 'draw' | 'select' | 'markup' | 'data' | 'layers'
    selectedItem: null, // { type: 'shape' | 'annotation', id, index, name }
    snapEnabled: true,
    snapLineEnabled: true,
    snapThresholdPx: 24,
    adjacentSnapThresholdMeters: 0.5, // Tự động bắt đỉnh khối liền kề trong phạm vi 0.5m thực địa
    adjacentEdgeSnapThresholdMeters: 0.5, // Tự động bắt line/cạnh khối liền kề trong phạm vi 0.5m thực địa (chống chồng lấn)
    _lastMouseLat: 0,
    _lastMouseLng: 0,
    _mouseRaf: null,
    showPercentRatio: true,
    customProjectArea: null,
    vertices: [], // [{ id, name, lat, lng, x, y, h, isSnapped, snapSource }]
    savedShapes: [], // [{ id, name, shortName, mode, vertices, stats, color }]
    annotations: [], // [{ id, type, lat, lng, color, ... }]
    markupMode: null, // null | 'arrow' | 'north_arrow' | 'rect' | 'circle' | 'stamp' | 'text'
    markupStepData: null,
    showAnnotations: true,
    palette: ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8', '#84cc16', '#f97316'],
    displaySettings: {
        showVertices: false,
        showDistances: false,
        showCenterLabels: true,
        showAnnotations: true,
        showBoundaries: true
    },

    
    // === CHUYỂN ĐỔI TAB CÔNG CỤ TRÊN THANH MINICAD TIẾT KIỆM KHÔNG GIAN ===
    
    computeRectCorners(centerX, centerY, widthM, lengthM, rotationDeg = 0) {
        const w = Math.max(0.5, parseFloat(widthM) || 5);
        const l = Math.max(0.5, parseFloat(lengthM) || 10);
        const rot = parseFloat(rotationDeg) || 0;
        const rad = (rot * Math.PI) / 180.0;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);

        const hw = w / 2.0;
        const hl = l / 2.0;

        // 4 local corners (length along X, width along Y)
        const localCorners = [
            { dx: hl, dy: -hw },
            { dx: hl, dy: hw },
            { dx: -hl, dy: hw },
            { dx: -hl, dy: -hw }
        ];

        return localCorners.map(pt => {
            const rotX = pt.dx * cosA - pt.dy * sinA;
            const rotY = pt.dx * sinA + pt.dy * cosA;
            const vnX = centerX + rotX;
            const vnY = centerY + rotY;
            const wgs = convertVn2kToWgs(vnX, vnY, AppState.kttVal, AppState.scaleFactor);
            return [wgs.lat, wgs.lng];
        });
    },

    onStampTypeChange(type) {
        const pBox = document.getElementById('boxStampFieldsParcel');
        const dBox = document.getElementById('boxStampFieldsDrawing');
        if (pBox) pBox.style.display = (type === 'parcel' || type === 'custom') ? 'block' : 'none';
        if (dBox) dBox.style.display = (type === 'drawing') ? 'block' : 'none';
    },

    switchToolTab(tabKey) {
        this.activeToolTab = tabKey;
        const tabs = ['draw', 'select', 'markup', 'data', 'layers'];
        const tabBtns = {
            draw: 'cadTabDraw',
            select: 'cadTabSelect',
            markup: 'cadTabMarkup',
            data: 'cadTabData',
            layers: 'cadTabLayers'
        };
        const panels = {
            draw: 'cadPanelDraw',
            select: 'cadPanelSelect',
            markup: 'cadPanelMarkup',
            data: 'cadPanelData',
            layers: 'cadPanelLayers'
        };

        tabs.forEach(t => {
            const btn = document.getElementById(tabBtns[t]);
            const panel = document.getElementById(panels[t]);
            if (btn) btn.classList.toggle('active', t === tabKey);
            if (panel) {
                if (t === tabKey) {
                    panel.style.display = 'flex';
                    panel.classList.add('active');
                } else {
                    panel.style.display = 'none';
                    panel.classList.remove('active');
                }
            }
        });

        if (tabKey === 'select') {
            this.setMode('select');
        } else if (tabKey === 'draw') {
            if (this.mode === 'select' || this.mode === 'markup') {
                this.setMode('polygon');
            } else {
                if (this.syncToolButtons) this.syncToolButtons();
            }
        } else if (tabKey === 'markup') {
            if (this.selectedItem) this.deselectCurrent();
            this.clearDynamicHelpers();
            if (this.mode !== 'markup') {
                this.mode = 'markup';
                this.markupMode = null;
                this.markupStepData = null;
            }
            if (this.syncToolButtons) this.syncToolButtons();
        }
    },

    // === CÔNG CỤ CHỌN ĐỐI TƯỢNG (SELECT & EDIT TOOL ↖️) ===
    selectItem(item) {
        this.selectedItem = item;
        const nameEl = document.getElementById('cadSelectedObjectName');
        const btnEdit = document.getElementById('btnCadEditSelected');
        const btnColor = document.getElementById('btnCadColorSelected');
        const btnDel = document.getElementById('btnCadDeleteSelected');
        const btnDesel = document.getElementById('btnCadDeselect');

        if (item) {
            let label = 'Đang chọn: ';
            if (item.type === 'shape') {
                const s = this.savedShapes ? this.savedShapes[item.index] : null;
                if (s) {
                    const areaStr = (s.stats && s.stats.areaFormatted) ? ` • S = ${s.stats.areaFormatted} m²` : '';
                    const vCount = (s.vertices || []).length;
                    label += `Khối [${s.name || s.shortName}]${areaStr} (${vCount} đỉnh)`;
                } else {
                    label += 'Khối';
                }
            } else if (item.type === 'vertex') {
                const v = item.point;
                const shapeName = item.shapeName || (item.shapeIndex >= 0 && this.savedShapes && this.savedShapes[item.shapeIndex] ? this.savedShapes[item.shapeIndex].shortName : 'Đang vẽ');
                if (v) {
                    label += `Đỉnh [${v.name}] thuộc [${shapeName}] (X: ${v.x?.toFixed(3) || '--'}, Y: ${v.y?.toFixed(3) || '--'})`;
                } else {
                    label += 'Đỉnh';
                }
            } else if (item.type === 'active_shape') {
                const stats = this.calculateAreaAndPerimeter();
                label += `Khối đang vẽ • ${this.vertices.length} đỉnh • S = ${stats.areaFormatted} m²`;
            } else if (item.type === 'annotation') {
                const a = (this.annotations || []).find(ann => ann.id === item.id);
                if (a) {
                    if (a.type === 'arrow') label += `Mũi tên "${a.arrowText || 'Ghi chú'}"`;
                    else if (a.type === 'stamp') label += `Tem thửa ${a.parcelNo || ''} (Tờ ${a.sheetNo || ''})`;
                    else if (a.type === 'rect') label += `Khối "${a.rectName || 'Nhà'}" (${a.widthM || 0}x${a.lengthM || 0}m)`;
                    else if (a.type === 'circle') label += `Vùng đệm R=${a.radiusM || 0}m`;
                    else if (a.type === 'text') label += `Chữ "${a.text || ''}"`;
                    else label += 'Chú thích';
                }
            }

            if (nameEl) {
                nameEl.innerText = label;
                nameEl.style.color = '#38bdf8';
                nameEl.style.borderColor = '#38bdf8';
                nameEl.style.background = 'rgba(56, 189, 248, 0.2)';
            }
            if (btnEdit) btnEdit.style.display = 'inline-flex';
            if (btnColor) btnColor.style.display = (item.type === 'shape' || item.type === 'annotation') ? 'inline-flex' : 'none';
            if (btnDel) btnDel.style.display = 'inline-flex';
            if (btnDesel) btnDesel.style.display = 'inline-flex';

            // Tự động chuyển qua tab Chọn nếu chưa ở tab này
            if (this.activeToolTab !== 'select') {
                this.switchToolTab('select');
            }
            triggerHaptic('selection');
            showToast(`↖️ ${label}`);
        } else {
            this.deselectCurrent();
        }
        this.renderGeometry();
        this.renderAnnotations();
    },

    deselectCurrent() {
        this.selectedItem = null;
        const nameEl = document.getElementById('cadSelectedObjectName');
        const btnEdit = document.getElementById('btnCadEditSelected');
        const btnColor = document.getElementById('btnCadColorSelected');
        const btnDel = document.getElementById('btnCadDeleteSelected');
        const btnDesel = document.getElementById('btnCadDeselect');

        if (nameEl) {
            nameEl.innerText = 'Chưa chọn đối tượng nào';
            nameEl.style.color = '#fbbf24';
            nameEl.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            nameEl.style.background = 'rgba(251, 191, 36, 0.15)';
        }
        if (btnEdit) btnEdit.style.display = 'none';
        if (btnColor) btnColor.style.display = 'none';
        if (btnDel) btnDel.style.display = 'none';
        if (btnDesel) btnDesel.style.display = 'none';
        this.renderGeometry();
        this.renderAnnotations();
    },

    deleteSelectedItem() {
        if (!this.selectedItem) {
            showToast('⚠️ Vui lòng nhấp chọn đối tượng cần xóa trước!');
            return;
        }
        const item = this.selectedItem;
        if (item.type === 'shape') {
            const s = this.savedShapes ? this.savedShapes[item.index] : null;
            if (!s) { this.deselectCurrent(); return; }
            const sName = s.name || s.shortName || 'Khối';
            if (confirm(`Bạn có chắc chắn muốn xóa khối "${sName}" khỏi bản đồ không?`)) {
                this.deleteShape(item.index, true);
            }
        } else if (item.type === 'vertex') {
            const shapeIdx = item.shapeIndex;
            const vertexIdx = item.vertexIndex;
            const vName = item.point?.name || 'Đỉnh';
            const shapeName = item.shapeName || (shapeIdx >= 0 && this.savedShapes && this.savedShapes[shapeIdx] ? this.savedShapes[shapeIdx].shortName : 'khối');
            if (confirm(`Bạn có chắc chắn muốn xóa đỉnh ${vName} của [${shapeName}] không?`)) {
                this.deleteVertex(shapeIdx, vertexIdx);
                this.deselectCurrent();
            }
        } else if (item.type === 'active_shape') {
            if (confirm('Bạn có chắc chắn muốn hủy khối đang vẽ dở này không?')) {
                this.clearDrawing();
                this.deselectCurrent();
            }
        } else if (item.type === 'annotation') {
            if (confirm('Bạn có chắc chắn muốn xóa ghi chú/ký tự này không?')) {
                this.pushHistoryState('Xóa chú thích');
                this.deleteAnnotation(item.id);
                this.deselectCurrent();
            }
        }
    },

    editSelectedItem() {
        if (!this.selectedItem) return;
        const item = this.selectedItem;
        if (item.type === 'shape') {
            const s = this.savedShapes ? this.savedShapes[item.index] : null;
            if (!s) return;
            const newName = prompt('Nhập tên mới cho khối này:', s.name || s.shortName);
            if (newName && newName.trim()) {
                this.pushHistoryState(`Đổi tên khối ${s.name}`);
                s.name = newName.trim();
                s.shortName = newName.trim();
                this.saveShapesForProject(AppState.currentProject);
                this.persistSession();
                this.renderGeometry();
                this.renderBlocksPanel();
                this.selectItem(item);
                showToast(`✓ Đã đổi tên thành: ${s.name}`);
            }
        } else if (item.type === 'vertex') {
            const v = item.point;
            if (!v) return;
            const newName = prompt(`Nhập tên mới cho đỉnh "${v.name}":`, v.name);
            if (newName && newName.trim()) {
                this.pushHistoryState(`Đổi tên đỉnh ${v.name}`);
                v.name = newName.trim();
                if (item.shapeIndex >= 0 && this.savedShapes && this.savedShapes[item.shapeIndex]) {
                    this.saveShapesForProject(AppState.currentProject);
                    this.persistSession();
                }
                this.renderGeometry();
                this.selectItem(item);
                showToast(`✓ Đã đổi tên đỉnh thành: ${v.name}`);
            }
        } else if (item.type === 'annotation') {
            this.openAnnotationModal(item.id);
        }
    },

    changeSelectedColor() {
        if (!this.selectedItem) return;
        const item = this.selectedItem;
        const colors = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8', '#84cc16', '#ef4444', '#f97316'];
        
        if (item.type === 'shape') {
            const s = this.savedShapes ? this.savedShapes[item.index] : null;
            if (!s) return;
            this.pushHistoryState(`Đổi màu khối ${s.name}`);
            const curIdx = colors.indexOf(s.color || '#06b6d4');
            const nextColor = colors[(curIdx + 1) % colors.length];
            s.color = nextColor;
            this.saveShapesForProject(AppState.currentProject);
            this.persistSession();
            this.renderGeometry();
            this.renderBlocksPanel();
            showToast(`🎨 Đã đổi màu khối: ${nextColor}`);
        } else if (item.type === 'annotation') {
            const a = (this.annotations || []).find(ann => ann.id === item.id);
            if (!a) return;
            this.pushHistoryState('Đổi màu chú thích');
            const curIdx = colors.indexOf(a.color || '#f59e0b');
            const nextColor = colors[(curIdx + 1) % colors.length];
            a.color = nextColor;
            this.saveAnnotations();
            this.renderAnnotations();
            showToast(`🎨 Đã đổi màu chú thích: ${nextColor}`);
        }
    },

    initDisplaySettings() {
        let saved = null;
        try {
            const raw = localStorage.getItem('vn2k_cad_display_settings_v3');
            if (raw) saved = JSON.parse(raw);
        } catch (e) {}

        this.displaySettings = Object.assign({
            showVertices: true,
            showDistances: true,
            showCenterLabels: true,
            showAnnotations: true,
            showBoundaries: true
        }, saved || {});

        // Mặc định hiển thị đầy đủ các thành phần tương quan bản vẽ (đỉnh, cự ly cạnh, ranh, tâm khối)
        if (!saved || typeof saved.showVertices !== 'boolean') this.displaySettings.showVertices = true;
        if (!saved || typeof saved.showDistances !== 'boolean') this.displaySettings.showDistances = true;
        if (!saved || typeof saved.showBoundaries !== 'boolean') this.displaySettings.showBoundaries = true;
        if (!saved || typeof saved.showCenterLabels !== 'boolean') this.displaySettings.showCenterLabels = true;

        this.showAnnotations = this.displaySettings.showAnnotations !== false;

        let savedSnapLine = null;
        try {
            const rawLine = localStorage.getItem('vn2k_cad_snap_line_enabled');
            if (rawLine !== null) savedSnapLine = JSON.parse(rawLine);
        } catch (e) {}
        if (savedSnapLine !== null) {
            this.snapLineEnabled = !!savedSnapLine;
        } else if (typeof AppState.savedCadSnapLine === 'boolean') {
            this.snapLineEnabled = AppState.savedCadSnapLine;
        } else {
            this.snapLineEnabled = true;
        }
    },

    syncDisplayCheckboxes() {
        if (!this.displaySettings) this.initDisplaySettings();
        const s = this.displaySettings;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!val;
        };

        // Checkboxes trên thanh công cụ CAD
        setVal('cadCheckShowVertices', s.showVertices);
        setVal('cadCheckShowDistances', s.showDistances);
        setVal('cadCheckShowCenterLabels', s.showCenterLabels);
        setVal('cadCheckShowAnnotations', s.showAnnotations);
        setVal('cadCheckShowBoundaries', s.showBoundaries);
        setVal('cadCheckSnapLine', this.snapLineEnabled);

        // Checkboxes trong Modal Xuất bản vẽ
        setVal('cadExportCheckVertices', s.showVertices);
        setVal('cadExportCheckDistances', s.showDistances);
        setVal('cadExportCheckCenterLabels', s.showCenterLabels);
        setVal('cadExportCheckAnnotations', s.showAnnotations);
        setVal('cadExportCheckBoundaries', s.showBoundaries);

        // Cập nhật trạng thái bắt line khối liền kề
        this.updateSnapLineUi();

        // Nút toggle chú thích
        const btnAnn = document.getElementById('btnCadMarkupToggle');
        if (btnAnn) {
            const cnt = this.annotations ? this.annotations.length : 0;
            btnAnn.innerHTML = s.showAnnotations 
                ? '👁️ Ẩn/Hiện (<span id="cadMarkupCount">' + cnt + '</span>)'
                : '🙈 Đang ẩn (<span id="cadMarkupCount">' + cnt + '</span>)';
            btnAnn.style.color = s.showAnnotations ? '#94a3b8' : '#f59e0b';
        }
    },

    updateSnapLineUi() {
        const isLineSnap = (this.snapLineEnabled !== false);
        const btn = document.getElementById('btnCadSnapLine');
        if (btn) {
            btn.classList.toggle('active', isLineSnap);
            btn.innerHTML = isLineSnap ? "🔗 Bắt line: BẬT [B]" : "🔗 Bắt line: TẮT [B]";
        }
        const chk = document.getElementById('cadCheckSnapLine');
        if (chk) {
            chk.checked = isLineSnap;
        }
        const hudLine = document.getElementById('btnCadHudSnapLine');
        if (hudLine) {
            hudLine.classList.toggle('active', isLineSnap);
        }
    },

    defaultStampConfig: {
        stampType: 'parcel',
        sheetNo: '01',
        parcelNo: '01',
        area: '',
        landType: 'ONT',
        owner: '',
        drawTitle: 'HIỆN TRẠNG VỊ TRÍ KHU ĐẤT',
        drawScale: '1:500',
        drawAuthor: 'Kỹ sư đo đạc',
        color: '#38bdf8'
    },

    loadDefaultStampConfig() {
        try {
            const raw = localStorage.getItem('vn2k_cad_default_stamp');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    this.defaultStampConfig = { ...this.defaultStampConfig, ...parsed };
                }
            }
        } catch (e) {}
    },

    toggleDisplayOption(key, checked) {
        if (!this.displaySettings) this.initDisplaySettings();
        this.displaySettings[key] = !!checked;
        if (key === 'showAnnotations') {
            this.showAnnotations = !!checked;
        }
        try {
            localStorage.setItem('vn2k_cad_display_settings_v3', JSON.stringify(this.displaySettings));
        } catch (e) {}

        this.syncDisplayCheckboxes();
        this.renderGeometry();
        this.renderAnnotations();

        const labels = {
            showVertices: '📍 Ký hiệu đỉnh',
            showDistances: '📏 Khoảng cách đỉnh (cự ly cạnh)',
            showCenterLabels: '🏷️ Ký hiệu & Tâm khối',
            showAnnotations: '🏹 Ghi chú kỹ thuật',
            showBoundaries: '📐 Nét ranh khối'
        };
        const name = labels[key] || key;
        showToast((checked ? '👁️ Đã BẬT: ' : '🙈 Đã TẮT: ') + name);
    },
    layers: {
        group: null,
        annotationsGroup: null,
        shape: null,
        markers: [],
        edgeLabels: [],
        centerLabel: null,
        offsetLayer: null,
        rubberbandLine: null,
        dynamicInputMarker: null,
        osnapMarker: null,
        snapEdgeLine: null,
        markupPreviewGroup: null
    },

    init() {
        this.ensureLayers();
        if (!this._zoomListenerBound && AppState.leafletMap) {
            this._zoomListenerBound = true;
            AppState.leafletMap.on('zoomend', () => {
                if (this.isActive) this.renderGeometry();
            });
        }
        this.bindEvents();
        this.initDraggablePanel();
        this.loadDefaultStampConfig();
        this.initDisplaySettings();
        this.restoreSession();
        this.loadAnnotations();
        this.initHistory();
        this.initToolbarAutoCollapse();
        this.updateSnapLineUi();
        if (this.syncToolButtons) this.syncToolButtons();
    },

    initDraggablePanel() {
        if (typeof window === 'undefined') return;
        const panel = document.getElementById('cadBlocksStatsPanel');
        const handle = document.getElementById('cadBlocksPanelHeader');
        if (!panel || !handle || panel._hasDragInit) return;
        panel._hasDragInit = true;

        let isDragging = false;
        let startX = 0, startY = 0, initLeft = 0, initTop = 0;

        const onStart = (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
            isDragging = true;
            const pt = e.touches ? e.touches[0] : e;
            startX = pt.clientX;
            startY = pt.clientY;
            const rect = panel.getBoundingClientRect();
            initLeft = rect.left;
            initTop = rect.top;
            handle.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (e) => {
            if (!isDragging) return;
            if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
            const pt = e.touches ? e.touches[0] : e;
            const dx = pt.clientX - startX;
            const dy = pt.clientY - startY;

            let newLeft = initLeft + dx;
            let newTop = initTop + dy;

            const maxW = window.innerWidth - panel.offsetWidth;
            const maxH = window.innerHeight - panel.offsetHeight;
            newLeft = Math.max(5, Math.min(newLeft, maxW - 5));
            newTop = Math.max(5, Math.min(newTop, maxH - 5));

            panel.style.left = `${newLeft}px`;
            panel.style.top = `${newTop}px`;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        };

        const onEnd = () => {
            isDragging = false;
            handle.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: true });
    },

    toggleMinimizeBlocksPanel() {
        const body = document.getElementById('cadPanelBlocksList');
        const btn = document.getElementById('btnCadPanelMinimize');
        if (!body) return;
        const isMin = body.style.display === 'none';
        body.style.display = isMin ? 'block' : 'none';
        if (btn) btn.innerText = isMin ? '▾' : '▴';
    },

    setBlockSymbol(idx, symbol) {
        if (this.savedShapes && this.savedShapes[idx]) {
            this.savedShapes[idx].symbol = (symbol || '').trim();
            this.renderGeometry();
            this.renderBlocksPanel();
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
        }
    },

    toggleBlockSelect(idx, isChecked) {
        if (this.savedShapes && this.savedShapes[idx]) {
            this.savedShapes[idx].selected = isChecked;
            this.renderGeometry();
            this.renderBlocksPanel();
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
        }
    },

    toggleSelectAllBlocks(isChecked) {
        if (this.savedShapes) {
            this.savedShapes.forEach(s => s.selected = isChecked);
            this.renderGeometry();
            this.renderBlocksPanel();
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
        }
    },

    editBlockArea(idx, newAreaVal) {
        const val = parseFloat(newAreaVal);
        if (isNaN(val) || val <= 0) {
            showToast("⚠️ Vui lòng nhập diện tích hợp lệ (> 0)!", true);
            return;
        }
        if (this.savedShapes && this.savedShapes[idx]) {
            const s = this.savedShapes[idx];
            if (!s.stats) s.stats = {};
            s.stats.area = val;
            s.stats.ha = val / 10000.0;
            s.stats.areaFormatted = val.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            s.customArea = true;
            this.pushHistoryState(`Sửa diện tích ${s.name}`);
            this.renderGeometry();
            this.renderBlocksPanel();
            this.renderExportBlockPicker();
            this.checkScalePaperFit();
            const allShapes = this._getAllExportShapes();
            this.renderBlockList(allShapes);
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
            showToast(`✓ Đã cập nhật diện tích ${s.name}: ${s.stats.areaFormatted} m²`);
        }
    },

    // === HỆ THỐNG LÙI / TIẾN (UNDO / REDO) ĐA TẦNG CHO MỌI THAO TÁC MINI CAD ===
    historyStack: [],
    historyIndex: -1,
    maxHistory: 50,
    isHistoryAction: false,

    initHistory() {
        if (!this.historyStack || this.historyStack.length === 0) {
            this.historyStack = [{
                vertices: (this.vertices || []).map(v => ({ ...v })),
                savedShapes: (this.savedShapes || []).map(s => ({
                    ...s,
                    vertices: (s.vertices || []).map(v => ({ ...v })),
                    stats: s.stats ? { ...s.stats } : null
                })),
                annotations: (this.annotations || []).map(a => ({
                    ...a,
                    corners: a.corners ? a.corners.map(c => [...c]) : undefined
                })),
                mode: this.mode,
                desc: 'Khởi đầu'
            }];
            this.historyIndex = 0;
            this.updateUndoRedoUi();
        }
    },

    pushHistoryState(description = '') {
        if (this.isHistoryAction) return;
        this.initHistory();

        // Cắt bỏ các nhánh tương lai nếu người dùng vẽ tiếp sau khi lùi
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        }

        const snapshot = {
            vertices: (this.vertices || []).map(v => ({ ...v })),
            savedShapes: (this.savedShapes || []).map(s => ({
                ...s,
                vertices: (s.vertices || []).map(v => ({ ...v })),
                stats: s.stats ? { ...s.stats } : null
            })),
            annotations: (this.annotations || []).map(a => ({
                ...a,
                corners: a.corners ? a.corners.map(c => [...c]) : undefined
            })),
            mode: this.mode,
            desc: description
        };

        this.historyStack.push(snapshot);
        if (this.historyStack.length > this.maxHistory) {
            this.historyStack.shift();
        } else {
            this.historyIndex++;
        }
        this.updateUndoRedoUi();
    },

    undo() {
        if (this.markupStepData) {
            this.markupStepData = null;
            if (this.clearMarkupPreview) this.clearMarkupPreview();
            showToast("↩ Đã hủy thao tác vẽ nhãn đang dở");
            return;
        }

        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.historyStack[this.historyIndex];
            this.applyHistoryState(state);
            triggerHaptic('selection');
            showToast(`↩ Đã lùi: ${state.desc || 'Thao tác trước'} [Ctrl+Z]`);
        } else if (this.vertices && this.vertices.length > 0) {
            this.undoVertex();
        } else {
            showToast("⚠️ Không còn thao tác trước đó để hoàn tác!", true);
        }
    },

    redo() {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyIndex++;
            const state = this.historyStack[this.historyIndex];
            this.applyHistoryState(state);
            triggerHaptic('selection');
            showToast(`↪ Đã tiến: ${state.desc || 'Thao tác sau'} [Ctrl+Y]`);
        } else {
            showToast("⚠️ Đang ở thao tác mới nhất, không thể tiến thêm!", true);
        }
    },

    applyHistoryState(state) {
        if (!state) return;
        this.isHistoryAction = true;
        try {
            this.vertices = (state.vertices || []).map(v => ({ ...v }));
            this.savedShapes = (state.savedShapes || []).map(s => ({
                ...s,
                vertices: (s.vertices || []).map(v => ({ ...v })),
                stats: s.stats ? { ...s.stats } : null
            }));
            this.annotations = (state.annotations || []).map(a => ({
                ...a,
                corners: a.corners ? a.corners.map(c => [...c]) : undefined
            }));
            this.mode = state.mode || this.mode;

            this.renderGeometry();
            this.renderAnnotations();
            this.saveAnnotations();
            this.updateUi();
            this.renderBlocksPanel();
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
            this.updateUndoRedoUi();
        } finally {
            this.isHistoryAction = false;
        }
    },

    updateUndoRedoUi() {
        const btnUndo = document.getElementById('btnCadUndo');
        const btnRedo = document.getElementById('btnCadRedo');
        const canUndo = this.historyIndex > 0 || (this.vertices && this.vertices.length > 0);
        const canRedo = this.historyIndex < this.historyStack.length - 1;

        if (btnUndo) {
            btnUndo.disabled = !canUndo;
            btnUndo.style.opacity = canUndo ? '1' : '0.45';
            btnUndo.style.cursor = canUndo ? 'pointer' : 'not-allowed';
        }
        if (btnRedo) {
            btnRedo.disabled = !canRedo;
            btnRedo.style.opacity = canRedo ? '1' : '0.45';
            btnRedo.style.cursor = canRedo ? 'pointer' : 'not-allowed';
        }
    },

    // Tính toán tâm hiển thị tối ưu (Visual Interior Center / Pole of Inaccessibility):
    // 1. Chuẩn hóa gốc tọa độ tương đối (Local Origin Normalization) triệt tiêu hoàn toàn sai số dấu phẩy động
    // 2. Xác định tâm hình học Green, kiểm tra nếu điểm nằm an toàn trong lòng đa giác (clearance >= 12% max span)
    // 3. Đối với các khối lõm như chữ L, chữ U, hình khuyết: Tự động dùng thuật toán cực nội tiếp (Pole of Inaccessibility)
    //    để tìm điểm nằm sâu nhất trong phần thân rộng nhất của khối chữ L, 100% không bao giờ văng ra ngoài khoảng trống!
    calculatePolygonVisualCenter(pts) {
        if (!pts || pts.length === 0) return [0, 0];
        const n = pts.length;
        const isWgs = (pts[0].lat !== undefined && pts[0].lng !== undefined);
        const isArray = Array.isArray(pts[0]);
        let raw = [];
        if (isWgs) raw = pts.map(p => ({ x: p.lng, y: p.lat }));
        else if (isArray) raw = pts.map(p => ({ x: p[1], y: p[0] }));
        else if (pts[0].x !== undefined && pts[0].y !== undefined) raw = pts.map(p => ({ x: p.x, y: p.y }));
        else if (pts[0].X !== undefined && pts[0].Y !== undefined) raw = pts.map(p => ({ x: p.Y, y: p.X }));
        else return isWgs ? [0, 0] : { x: 0, y: 0 };

        if (n < 3) {
            if (isWgs || isArray) {
                const ret = [raw[0].y, raw[0].x, 0.0001];
                ret.lat = raw[0].y; ret.lng = raw[0].x; ret.clearance = 0.0001;
                return ret;
            }
            return { x: raw[0].x, y: raw[0].y, clearance: 1 };
        }

        // 1. Chuẩn hóa tọa độ theo gốc tương đối để triệt tiêu hoàn toàn sai số triệt tiêu số học
        const oX = raw[0].x, oY = raw[0].y;
        const norm = raw.map(p => ({ x: p.x - oX, y: p.y - oY }));

        // Kiểm tra điểm nằm trong đa giác (Ray-Casting Algorithm)
        const pip = (x, y) => {
            let inside = false;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = norm[i].x, yi = norm[i].y;
                const xj = norm[j].x, yj = norm[j].y;
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        };

        // Khoảng cách từ điểm tới một đoạn thẳng
        const distToSeg = (px, py, x1, y1, x2, y2) => {
            const dx = x2 - x1, dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            if (l2 === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1) * dx + (py - y1) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
        };

        // Khoảng cách từ điểm tới cạnh gần nhất của đa giác (clearance)
        const edgeDist = (px, py) => {
            let minD = Infinity;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const d = distToSeg(px, py, norm[j].x, norm[j].y, norm[i].x, norm[i].y);
                if (d < minD) minD = d;
            }
            return minD;
        };

        // 2. Trọng tâm hình học Green chuẩn hóa
        let area2 = 0, cX = 0, cY = 0;
        for (let i = 0; i < n; i++) {
            const p1 = norm[i], p2 = norm[(i + 1) % n];
            const cross = (p1.x * p2.y) - (p2.x * p1.y);
            area2 += cross;
            cX += (p1.x + p2.x) * cross;
            cY += (p1.y + p2.y) * cross;
        }

        let centroid = null;
        if (Math.abs(area2) > 1e-15) {
            cX /= (3 * area2);
            cY /= (3 * area2);
            centroid = { x: cX, y: cY };
        } else {
            centroid = {
                x: norm.reduce((s, p) => s + p.x, 0) / n,
                y: norm.reduce((s, p) => s + p.y, 0) / n
            };
        }

        // Bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        norm.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
        const spanX = maxX - minX, spanY = maxY - minY;
        const maxSpan = Math.max(spanX, spanY);

        // Kiểm tra xem trọng tâm hình học có nằm trong đa giác và có khoảng cách an toàn tới các biên hay không
        const centroidInside = pip(centroid.x, centroid.y);
        const clearance = centroidInside ? edgeDist(centroid.x, centroid.y) : -1;

        let resX, resY, resDist;
        if (centroidInside && clearance >= maxSpan * 0.12) {
            // Đa giác lồi thông thường: dùng trọng tâm hình học đã được chuẩn hóa
            resX = centroid.x + oX;
            resY = centroid.y + oY;
            resDist = clearance;
        } else {
            // Đa giác lõm hình chữ L, chữ U, khuyết góc: Tìm Cực nội tiếp (Pole of Inaccessibility)
            // Lấy mẫu lưới 16x16 bên trong bounding box, chọn điểm có khoảng cách tới các cạnh lớn nhất
            let bestX = centroidInside ? centroid.x : (norm[0].x + norm[1].x) / 2;
            let bestY = centroidInside ? centroid.y : (norm[0].y + norm[1].y) / 2;
            let maxD = centroidInside ? clearance : -1;

            const gridSteps = 16;
            const stepX = spanX / gridSteps, stepY = spanY / gridSteps;

            for (let i = 1; i < gridSteps; i++) {
                const gx = minX + i * stepX;
                for (let j = 1; j < gridSteps; j++) {
                    const gy = minY + j * stepY;
                    if (pip(gx, gy)) {
                        const d = edgeDist(gx, gy);
                        if (d > maxD) {
                            maxD = d;
                            bestX = gx;
                            bestY = gy;
                        }
                    }
                }
            }

            // Lưới vi chỉnh mịn (Fine Grid Refinement) quanh điểm tốt nhất
            if (maxD > 0) {
                const fineRadiusX = stepX * 0.8, fineRadiusY = stepY * 0.8;
                const fineSteps = 6;
                const fxStep = (fineRadiusX * 2) / fineSteps;
                const fyStep = (fineRadiusY * 2) / fineSteps;
                for (let fi = -fineSteps / 2; fi <= fineSteps / 2; fi++) {
                    for (let fj = -fineSteps / 2; fj <= fineSteps / 2; fj++) {
                        const fx = bestX + fi * fxStep;
                        const fy = bestY + fj * fyStep;
                        if (pip(fx, fy)) {
                            const d = edgeDist(fx, fy);
                            if (d > maxD) {
                                maxD = d;
                                bestX = fx;
                                bestY = fy;
                            }
                        }
                    }
                }
            }

            resX = bestX + oX;
            resY = bestY + oY;
            resDist = maxD > 0 ? maxD : Math.max(0.00001, maxSpan * 0.05);
        }

        if (isWgs || isArray) {
            const ret = [resY, resX, resDist];
            ret.lat = resY;
            ret.lng = resX;
            ret.clearance = resDist;
            return ret;
        } else {
            return { x: resX, y: resY, clearance: resDist };
        }
    },

    // Alias tương thích ngược
    calculatePolygonCentroid(pts) {
        return this.calculatePolygonVisualCenter(pts);
    },

    // Thao tác chèn đỉnh mới vào cạnh
    insertVertexOnEdge(shapeIdx, edgeIdx) {
        if (this.mode === 'select') {
            if (shapeIdx >= 0 && this.savedShapes && this.savedShapes[shapeIdx]) {
                this.selectItem({ type: 'shape', index: shapeIdx, name: this.savedShapes[shapeIdx].name });
            } else if (shapeIdx === -1 && this.vertices && this.vertices.length > 0) {
                this.selectItem({ type: 'active_shape', name: 'Khối đang vẽ' });
            }
            return;
        }

        if (shapeIdx === -1) {
            // Khối đang vẽ dở
            if (this.vertices.length < 2) return;
            const p1 = this.vertices[edgeIdx];
            const p2 = this.vertices[(edgeIdx + 1) % this.vertices.length];
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
            const midVn = convertWgsToVn2k(midLat, midLng, AppState.kttVal, AppState.scaleFactor);

            this.pushHistoryState(`Chèn đỉnh mới`);
            this.vertices.splice(edgeIdx + 1, 0, {
                id: Date.now() + Math.random(),
                name: `Đ${this.vertices.length + 1}`,
                lat: midLat,
                lng: midLng,
                x: parseFloat(parseFloat(midVn.X).toFixed(3)),
                y: parseFloat(parseFloat(midVn.Y).toFixed(3)),
                h: 0,
                isSnapped: false
            });
            this.renderGeometry();
            this.updateUi();
            showToast(`✓ Đã chèn đỉnh mới vào cạnh ${edgeIdx + 1}! Kéo thả để nắn ranh.`);
        } else if (this.savedShapes && this.savedShapes[shapeIdx]) {
            // Khối đã lưu
            const s = this.savedShapes[shapeIdx];
            const p1 = s.vertices[edgeIdx];
            const p2 = s.vertices[(edgeIdx + 1) % s.vertices.length];
            const midLat = (p1.lat + p2.lat) / 2;
            const midLng = (p1.lng + p2.lng) / 2;
            const midVn = convertWgsToVn2k(midLat, midLng, AppState.kttVal, AppState.scaleFactor);

            this.pushHistoryState(`Chèn đỉnh khối [${s.shortName}]`);
            s.vertices.splice(edgeIdx + 1, 0, {
                id: Date.now() + Math.random(),
                name: `Đ${s.vertices.length + 1}`,
                lat: midLat,
                lng: midLng,
                x: parseFloat(parseFloat(midVn.X).toFixed(3)),
                y: parseFloat(parseFloat(midVn.Y).toFixed(3)),
                h: 0,
                isSnapped: false
            });
            s.stats = this.calculateAreaAndPerimeter(s.vertices, s.mode, true);
            this.saveShapesForProject(AppState.currentProject);
            this.persistSession();
            this.renderGeometry();
            this.renderBlocksPanel();
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
            showToast(`✓ Đã chèn đỉnh mới vào khối [${s.shortName}]! Kéo thả để nắn ranh.`);
        }
    },

    // Thao tác xóa đỉnh
    deleteVertex(shapeIdx, vertexIdx) {
        if (shapeIdx === -1) {
            // Khối đang vẽ dở
            if (this.vertices.length <= 1) {
                this.clearDrawing();
                return;
            }
            this.pushHistoryState(`Xóa đỉnh ${this.vertices[vertexIdx]?.name || ''}`);
            const removed = this.vertices.splice(vertexIdx, 1);
            this.renderGeometry();
            this.updateUi();
            showToast(`🗑️ Đã xóa đỉnh ${removed[0]?.name || ''}! Có thể nhấn [Ctrl+Z] để hoàn tác.`);
        } else if (this.savedShapes && this.savedShapes[shapeIdx]) {
            // Khối đã lưu
            const s = this.savedShapes[shapeIdx];
            if (s.mode === 'polygon' && s.vertices.length <= 3) {
                showToast("⚠️ Đa giác cần tối thiểu 3 đỉnh! Hãy dùng nút xóa khối nếu muốn xóa toàn bộ.", true);
                return;
            }
            if (s.mode === 'polyline' && s.vertices.length <= 2) {
                showToast("⚠️ Tuyến cần tối thiểu 2 đỉnh!", true);
                return;
            }
            this.pushHistoryState(`Xóa đỉnh [${s.shortName}]`);
            const removed = s.vertices.splice(vertexIdx, 1);
            s.stats = this.calculateAreaAndPerimeter(s.vertices, s.mode, true);
            this.saveShapesForProject(AppState.currentProject);
            this.persistSession();
            this.renderGeometry();
            this.renderBlocksPanel();
            if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                this.openAreaTableModal();
            }
            showToast(`🗑️ Đã xóa đỉnh ${removed[0]?.name || ''}! Có thể nhấn [Ctrl+Z] để hoàn tác.`);
        }
    },

    bindEvents() {
        // Phím tắt bàn phím chuẩn thao tác AutoCAD chuyên nghiệp
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            // Bỏ qua khi người dùng đang nhập liệu trong ô input / textarea
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    return;
                } else if (e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.redo();
                    return;
                }
            }

            const key = e.key.toUpperCase();
            if (key === 'V') {
                e.preventDefault();
                this.switchToolTab('select');
            } else if (key === 'P') {
                e.preventDefault();
                this.setMode('polygon');
            } else if (key === 'L') {
                e.preventDefault();
                this.setMode('polyline');
            } else if (key === 'S' || e.key === 'F3') {
                e.preventDefault();
                this.toggleSnap();
            } else if (key === 'B') {
                e.preventDefault();
                this.toggleSnapLine();
            } else if (key === 'C') {
                e.preventDefault();
                if (this.mode === 'polygon' && this.vertices.length >= 3) {
                    this.closeLoop();
                } else {
                    this.setMarkupMode(this.markupMode === 'circle' ? null : 'circle');
                }
            } else if (key === 'U') {
                e.preventDefault();
                this.undo();
            } else if (key === 'R' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.setMarkupMode(this.markupMode === 'rect' ? null : 'rect');
            } else if (key === 'A') {
                e.preventDefault();
                this.setMarkupMode(this.markupMode === 'arrow' ? null : 'arrow');
            } else if (key === 'T') {
                e.preventDefault();
                this.setMarkupMode(this.markupMode === 'text' ? null : 'text');
            } else if (key === 'N') {
                e.preventDefault();
                this.saveAndStartNewShape();
            } else if (key === 'O') {
                e.preventDefault();
                this.promptOffset();
            } else if (key === 'D') {
                e.preventDefault();
                this.openPolarModal();
            } else if (key === 'E') {
                e.preventDefault();
                this.openAreaTableModal();
            } else if (key === 'Z' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.zoomExtents();
            } else if (e.key === ' ' || e.key === 'Enter') {
                // Xác nhận lệnh / Đóng vòng thửa đất chuẩn Space / Enter CAD
                e.preventDefault();
                if (this.mode === 'polygon' && this.vertices.length >= 3) {
                    this.closeLoop();
                } else if (this.mode === 'polyline' && this.vertices.length >= 2) {
                    this.saveAndStartNewShape();
                } else if (this.mode === 'select' && this.selectedItem) {
                    this.editSelectedItem();
                }
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomOut();
            } else if (key === 'X') {
                e.preventDefault();
                this.clearDrawing();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                if (this.selectedItem) {
                    this.deleteSelectedItem();
                } else if (this.vertices.length > 0) {
                    this.undoVertex();
                }
            } else if (e.key === 'Escape') {
                // Hủy lệnh theo phân cấp chuẩn CAD (Markup -> Nét vẽ dở dang -> Bỏ chọn -> Tab Vẽ -> Đóng)
                e.preventDefault();
                if (this.markupMode) {
                    this.setMarkupMode(null);
                    showToast('Đã hủy thao tác nhãn [Esc]');
                } else if (this.vertices.length > 0) {
                    this.vertices = [];
                    this.renderGeometry();
                    this.updateUi();
                    this.clearDynamicHelpers();
                    showToast('Đã hủy nét vẽ hiện tại [Esc]');
                } else if (this.selectedItem) {
                    this.deselectCurrent();
                    showToast('Đã bỏ chọn đối tượng [Esc]');
                } else if (this.mode === 'select') {
                    this.switchToolTab('draw');
                } else {
                    this.closeToolbar();
                }
            }
        });
    },

    ensureLayers() {
        if (!AppState.leafletMap) return;
        if (!this.layers.group) {
            this.layers.group = L.layerGroup().addTo(AppState.leafletMap);
        }
        if (!this.layers.annotationsGroup) {
            this.layers.annotationsGroup = L.layerGroup().addTo(AppState.leafletMap);
        }
        if (!this.layers.markupPreviewGroup) {
            this.layers.markupPreviewGroup = L.layerGroup().addTo(AppState.leafletMap);
        }
        // Gắn sự kiện chuột di chuyển, zoom và click trực tiếp trên bản đồ cho CAD Tool
        if (!this._mapEventsBound && AppState.leafletMap) {
            AppState.leafletMap.on('click', (e) => {
                if (this.isActive) {
                    this.handleMapClick(e.latlng.lat, e.latlng.lng);
                }
            });
            AppState.leafletMap.on('mousemove', (e) => {
                if (this.isActive) {
                    this.handleMouseMove(e.latlng.lat, e.latlng.lng);
                }
            });
            AppState.leafletMap.on('mouseout', () => {
                this.clearDynamicHelpers();
            });
            AppState.leafletMap.on('zoomend', () => {
                if (this.isActive) {
                    this.renderGeometry();
                }
            });

            // Chuột phải (Contextmenu) chuẩn CAD: Đóng vòng đa giác, lưu tuyến hoặc hủy nhãn
            AppState.leafletMap.on('contextmenu', (e) => {
                if (!this.isActive) return;
                L.DomEvent.preventDefault(e);
                L.DomEvent.stopPropagation(e);
                if (this.markupMode) {
                    this.setMarkupMode(null);
                    showToast('Đã hủy thao tác nhãn [Chuột phải]');
                    return;
                }
                if (this.mode === 'polygon' && this.vertices.length >= 3) {
                    this.closeLoop();
                    return;
                }
                if (this.mode === 'polyline' && this.vertices.length >= 2) {
                    this.saveAndStartNewShape();
                    return;
                }
                if (this.vertices.length > 0) {
                    this.undoVertex();
                    return;
                }
                if (this.selectedItem) {
                    this.deselectCurrent();
                    showToast('Đã bỏ chọn [Chuột phải]');
                    return;
                }
            });

            // Thao tác Chuột giữa chuẩn CAD: Giữ chuột giữa kéo để Pan, Nhấp đúp chuột giữa để Zoom Extents
            const mapContainer = AppState.leafletMap.getContainer();
            if (mapContainer && !this._middleMousePanBound) {
                mapContainer.addEventListener('mousedown', (e) => {
                    if (!this.isActive) return;
                    if (e.button === 1) { // Chuột giữa
                        e.preventDefault();
                        this._isMiddlePanning = true;
                        this._middlePanStart = { x: e.clientX, y: e.clientY };
                        mapContainer.style.cursor = 'grabbing';
                    }
                });
                window.addEventListener('mousemove', (e) => {
                    if (this._isMiddlePanning && AppState.leafletMap) {
                        e.preventDefault();
                        const dx = e.clientX - this._middlePanStart.x;
                        const dy = e.clientY - this._middlePanStart.y;
                        this._middlePanStart = { x: e.clientX, y: e.clientY };
                        AppState.leafletMap.panBy([-dx, -dy], { animate: false });
                    }
                });
                window.addEventListener('mouseup', (e) => {
                    if (this._isMiddlePanning) {
                        this._isMiddlePanning = false;
                        if (mapContainer) mapContainer.style.cursor = '';
                    }
                });
                mapContainer.addEventListener('auxclick', (e) => {
                    if (e.button === 1) e.preventDefault();
                });
                mapContainer.addEventListener('dblclick', (e) => {
                    if (e.button === 1 && this.isActive) {
                        e.preventDefault();
                        this.zoomExtents();
                    }
                });
                this._middleMousePanBound = true;
            }

            this._mapEventsBound = true;
        }
    },

    openToolbar() {
        this.isActive = true;
        this.ensureLayers();
        if (!this.displaySettings) this.initDisplaySettings();

        // Tự động nạp hoặc tái tạo các khối của dự án nếu danh sách khối hiện đang rỗng
        const curProj = AppState.currentProject;
        if (curProj && (!this.savedShapes || this.savedShapes.length === 0)) {
            if (!this.loadShapesForProject(curProj)) {
                this.reconstructShapesFromPoints(curProj);
            }
        }

        const bar = document.getElementById('mapCadToolbar');
        if (bar) bar.style.display = 'flex';
        const toggleBtn = document.getElementById('btnToggleCadTool');
        if (toggleBtn) toggleBtn.classList.add('active');

        // Bật CAD Realtime Status & Coordinates HUD Bar
        const hud = document.getElementById('cadStatusHud');
        if (hud) hud.style.display = 'flex';
        if (this.updateHudQuickTips) this.updateHudQuickTips();

        // Bật con trỏ chữ thập CAD trên bản đồ
        const mapContainer = document.getElementById('map-view-container');
        if (mapContainer) mapContainer.classList.add('cad-active-map');

        this.syncDisplayCheckboxes();
        this.renderGeometry();
        this.updateUi();
        if (this.renderBlocksPanel) this.renderBlocksPanel();
        this.loadAnnotations();
        this.initToolbarAutoCollapse();
        this.setToolbarCollapsed(false);
        this.scheduleToolbarCollapse(this.toolbarIdleMs * 2);
        showToast("📐 MiniCAD sẵn sàng! Chuột trái: Đặt mốc • Chuột phải/Space: Khép góc • Chuột giữa: Pan/Zoom");
    },

    closeToolbar() {
        this.isActive = false;
        this.setToolbarCollapsed(false);
        const bar = document.getElementById('mapCadToolbar');
        if (bar) bar.style.display = 'none';
        const toggleBtn = document.getElementById('btnToggleCadTool');
        if (toggleBtn) toggleBtn.classList.remove('active');

        // Ẩn CAD Status HUD
        const hud = document.getElementById('cadStatusHud');
        if (hud) hud.style.display = 'none';

        // Khôi phục con trỏ bình thường
        const mapContainer = document.getElementById('map-view-container');
        if (mapContainer) mapContainer.classList.remove('cad-active-map');

        this.clearDynamicHelpers();
        showToast("Đã đóng công cụ CAD Mini");
    },

    clearDynamicHelpers() {
        if (!AppState.leafletMap) return;
        if (this.layers.rubberbandLine) {
            AppState.leafletMap.removeLayer(this.layers.rubberbandLine);
            this.layers.rubberbandLine = null;
        }
        if (this.layers.dynamicInputMarker) {
            AppState.leafletMap.removeLayer(this.layers.dynamicInputMarker);
            this.layers.dynamicInputMarker = null;
        }
        if (this.layers.osnapMarker) {
            AppState.leafletMap.removeLayer(this.layers.osnapMarker);
            this.layers.osnapMarker = null;
        }
        if (this.clearSnapEdgeGuide) {
            this.clearSnapEdgeGuide();
        }
        if (this.clearMarkupPreview) {
            this.clearMarkupPreview();
        }
    },

    toggleToolbar() {
        if (this.isActive) {
            this.closeToolbar();
        } else {
            this.openToolbar();
        }
    },

    renderSnapEdgeGuide(v1, v2) {
        if (!AppState.leafletMap || !v1 || !v2) return;
        const coords = [[v1.lat, v1.lng], [v2.lat, v2.lng]];
        if (!this.layers.snapEdgeLine) {
            this.layers.snapEdgeLine = L.polyline(coords, {
                color: '#f59e0b',
                weight: 3.5,
                dashArray: '6, 6',
                opacity: 0.95,
                interactive: false
            }).addTo(AppState.leafletMap);
        } else {
            this.layers.snapEdgeLine.setLatLngs(coords);
            this.layers.snapEdgeLine.setStyle({ color: '#f59e0b', weight: 3.5, dashArray: '6, 6', opacity: 0.95 });
        }
    },

    clearSnapEdgeGuide() {
        if (this.layers.snapEdgeLine && AppState.leafletMap) {
            AppState.leafletMap.removeLayer(this.layers.snapEdgeLine);
            this.layers.snapEdgeLine = null;
        }
    },

    clearMarkupPreview() {
        if (this.layers.markupPreviewGroup) {
            this.layers.markupPreviewGroup.clearLayers();
        }
    },

    renderMarkupPreview(lat, lng) {
        if (!AppState.leafletMap || !this.markupMode) {
            this.clearMarkupPreview();
            return;
        }
        const map = AppState.leafletMap;
        this.ensureLayers();
        if (this.layers.markupPreviewGroup) {
            this.layers.markupPreviewGroup.clearLayers();
        }

        let curLat = lat;
        let curLng = lng;
        let snapSource = null;

        if (this.snapEnabled) {
            const cand = this.findSnapCandidate(lat, lng);
            if (cand && cand.isSnapped) {
                curLat = cand.lat;
                curLng = cand.lng;
                snapSource = cand.source || cand.name;

                // Osnap marker
                const osnapIcon = L.divIcon({
                    className: '',
                    html: `<div class="cad-osnap-box" title="Snap: ${snapSource}">□</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });
                if (!this.layers.osnapMarker) {
                    this.layers.osnapMarker = L.marker([curLat, curLng], { icon: osnapIcon, interactive: false, zIndexOffset: 3000 }).addTo(map);
                } else {
                    this.layers.osnapMarker.setLatLng([curLat, curLng]);
                    this.layers.osnapMarker.setIcon(osnapIcon);
                }
            } else if (this.layers.osnapMarker) {
                map.removeLayer(this.layers.osnapMarker);
                this.layers.osnapMarker = null;
            }
        }

        switch (this.markupMode) {
            case 'arrow': {
                if (!this.markupStepData) {
                    // Bước 1: Chưa click mốc đầu -> Hiện vòng nhắm mốc ranh
                    const tipHtml = `
                        <div style="background: rgba(15,23,42,0.85); border: 1.5px dashed #f59e0b; border-radius: 6px; padding: 3px 8px; color: #fbbf24; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                            🏹 1. Click chọn mốc ranh gốc${snapSource ? ` [${snapSource}]` : ''}
                        </div>
                    `;
                    const icon = L.divIcon({ className: '', html: tipHtml, iconSize: [180, 24], iconAnchor: [-10, -10] });
                    L.marker([curLat, curLng], { icon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                    L.circleMarker([curLat, curLng], { radius: 6, color: '#f59e0b', weight: 2, fillOpacity: 0.3 }).addTo(this.layers.markupPreviewGroup);
                } else {
                    // Bước 2: Đã click mốc đầu -> Vẽ đường bóng mờ dóng từ mốc đầu tới con trỏ chuột
                    const p1 = this.markupStepData;
                    const d = map.distance([p1.startLat, p1.startLng], [curLat, curLng]);
                    L.polyline([[p1.startLat, p1.startLng], [curLat, curLng]], {
                        color: '#f59e0b',
                        weight: 2,
                        dashArray: '5, 5',
                        opacity: 0.85,
                        interactive: false
                    }).addTo(this.layers.markupPreviewGroup);

                    // Điểm gốc mốc
                    L.circleMarker([p1.startLat, p1.startLng], { radius: 5, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1 }).addTo(this.layers.markupPreviewGroup);

                    const tipHtml = `
                        <div style="background: rgba(15,23,42,0.9); border: 1.5px solid #f59e0b; border-radius: 6px; padding: 4px 8px; color: #f8fafc; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 14px rgba(0,0,0,0.6);">
                            <span style="color:#fbbf24; font-weight:800;">🏹 Mũi tên (${d.toFixed(1)}m)</span><br>
                            <span style="font-size:10px; color:#94a3b8;">Click để đặt chữ ghi chú</span>
                        </div>
                    `;
                    const icon = L.divIcon({ className: '', html: tipHtml, iconSize: [150, 36], iconAnchor: [-10, -10] });
                    L.marker([curLat, curLng], { icon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                }
                break;
            }

            case 'stamp': {
                // Tự động nhận diện thửa đất chứa con trỏ chuột để hiển thị số thửa & diện tích thực tế
                let previewParcel = '01';
                let previewArea = '150.0 m²';
                const matchedShape = this.findShapeContainingPoint(curLat, curLng) || (this.savedShapes && this.savedShapes.length ? this.savedShapes[this.savedShapes.length - 1] : null);
                if (matchedShape) {
                    if (matchedShape.name) previewParcel = matchedShape.name.replace(/[^0-9]/g, '') || matchedShape.name;
                    if (matchedShape.stats && matchedShape.stats.areaFormatted) previewArea = matchedShape.stats.areaFormatted + ' m²';
                    else if (matchedShape.stats && matchedShape.stats.area) previewArea = matchedShape.stats.area.toFixed(1) + ' m²';
                }
                const cfg = this.defaultStampConfig || {};
                const defSheet = cfg.sheetNo || '01';
                const defOwner = cfg.owner || 'Chủ sử dụng đất';

                const stampHtml = `
                    <div style="background: rgba(15,23,42,0.88); border: 2px dashed #38bdf8; border-radius: 8px; padding: 6px 10px; font-family: -apple-system, sans-serif; font-size: 11px; color: #f8fafc; box-shadow: 0 6px 18px rgba(0,0,0,0.5); min-width: 145px; pointer-events: none; text-align: left; opacity: 0.9;">
                        <div style="font-weight: 800; color: #38bdf8; border-bottom: 1px dashed rgba(255,255,255,0.25); padding-bottom: 2px; margin-bottom: 3px; display: flex; justify-content: space-between; font-size: 10.5px;">
                            <span>TỜ: <b>${defSheet}</b></span>
                            <span>THỬA: <b>${previewParcel}</b></span>
                        </div>
                        <div style="font-size: 9.5px; color: #cbd5e1; line-height: 1.35;">
                            <div>📐 DT: <b style="color: #4ade80;">${previewArea}</b></div>
                            <div>👤 Chủ: <b style="color: #f1f5f9;">${defOwner}</b></div>
                        </div>
                        <div style="font-size: 9px; color: #38bdf8; margin-top: 3px; text-align: center; border-top: 1px dashed rgba(56,189,248,0.3); padding-top: 2px;">
                            💡 Click để đặt tem nhãn
                        </div>
                    </div>
                `;
                const icon = L.divIcon({
                    className: '',
                    html: stampHtml,
                    iconSize: [160, 75],
                    iconAnchor: [80, 38]
                });
                L.marker([curLat, curLng], { icon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                break;
            }

            case 'rect': {
                if (!this.markupStepData) {
                    const w = 5.0, l = 10.0, rot = 0;
                    let cX = null, cY = null;
                    try {
                        const vn = convertWgsToVn2k(curLat, curLng, AppState.kttVal, AppState.scaleFactor);
                        cX = parseFloat(vn.X);
                        cY = parseFloat(vn.Y);
                    } catch (e) {}

                    if (cX !== null && cY !== null) {
                        const corners = this.computeRectCorners(cX, cY, w, l, rot);
                        const latlngs = corners.map(c => [c.lat, c.lng]);
                        L.polygon(latlngs, {
                            color: '#ec4899',
                            weight: 2,
                            dashArray: '5, 5',
                            fillColor: '#ec4899',
                            fillOpacity: 0.25,
                            interactive: false
                        }).addTo(this.layers.markupPreviewGroup);

                        const tipHtml = `
                            <div style="background: rgba(15,23,42,0.85); border: 1px solid #ec4899; border-radius: 4px; padding: 2px 6px; color: #f472b6; font-size: 10px; font-weight: 700; white-space: nowrap;">
                                🏠 Khối nhà ${w}m x ${l}m (${(w*l).toFixed(0)}m²)
                            </div>
                        `;
                        const tipIcon = L.divIcon({ className: '', html: tipHtml, iconSize: [140, 20], iconAnchor: [-10, -10] });
                        L.marker([curLat, curLng], { icon: tipIcon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                    }
                } else {
                    const p1 = this.markupStepData.p1;
                    const vn1 = convertWgsToVn2k(p1.lat, p1.lng, AppState.kttVal, AppState.scaleFactor);
                    const vn2 = convertWgsToVn2k(curLat, curLng, AppState.kttVal, AppState.scaleFactor);
                    let w = Math.abs(vn2.Y - vn1.Y);
                    let l = Math.abs(vn2.X - vn1.X);
                    if (w < 1) w = 5.0;
                    if (l < 1) l = 10.0;
                    const cX = (vn1.X + vn2.X) / 2;
                    const cY = (vn1.Y + vn2.Y) / 2;
                    const corners = this.computeRectCorners(cX, cY, w, l, 0);
                    const latlngs = corners.map(c => [c.lat, c.lng]);
                    L.polygon(latlngs, {
                        color: '#ec4899',
                        weight: 2,
                        dashArray: '5, 5',
                        fillColor: '#ec4899',
                        fillOpacity: 0.3,
                        interactive: false
                    }).addTo(this.layers.markupPreviewGroup);

                    const tipHtml = `
                        <div style="background: rgba(15,23,42,0.9); border: 1.5px solid #ec4899; border-radius: 4px; padding: 3px 6px; color: #fdf2f8; font-size: 10.5px; font-weight: 700; white-space: nowrap;">
                            🏠 ${w.toFixed(1)}m x ${l.toFixed(1)}m (${(w*l).toFixed(1)} m²)
                        </div>
                    `;
                    const tipIcon = L.divIcon({ className: '', html: tipHtml, iconSize: [130, 22], iconAnchor: [-10, -10] });
                    L.marker([curLat, curLng], { icon: tipIcon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                }
                break;
            }

            case 'circle': {
                const defR = 10;
                L.circle([curLat, curLng], {
                    radius: defR,
                    color: '#10b981',
                    weight: 2,
                    dashArray: '5, 5',
                    fillColor: '#10b981',
                    fillOpacity: 0.2,
                    interactive: false
                }).addTo(this.layers.markupPreviewGroup);
                L.circleMarker([curLat, curLng], { radius: 4, color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }).addTo(this.layers.markupPreviewGroup);

                const tipHtml = `
                    <div style="background: rgba(15,23,42,0.85); border: 1px solid #10b981; border-radius: 4px; padding: 2px 6px; color: #6ee7b7; font-size: 10px; font-weight: 700; white-space: nowrap;">
                        ⭕ Vùng đệm R = ${defR}m
                    </div>
                `;
                const tipIcon = L.divIcon({ className: '', html: tipHtml, iconSize: [120, 20], iconAnchor: [-10, -10] });
                L.marker([curLat, curLng], { icon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                break;
            }

            case 'text': {
                const tipHtml = `
                    <div style="background: rgba(15,23,42,0.85); border: 1.5px dashed #38bdf8; border-radius: 6px; padding: 4px 8px; color: #38bdf8; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                        🔤 [Chữ ghi chú] • Click để nhập
                    </div>
                `;
                const tipIcon = L.divIcon({ className: '', html: tipHtml, iconSize: [160, 24], iconAnchor: [80, 12] });
                L.marker([curLat, curLng], { icon, interactive: false }).addTo(this.layers.markupPreviewGroup);
                break;
            }
        }
    },

    isPointInPolygon(pt, vs) {
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i].lng, yi = vs[i].lat;
            const xj = vs[j].lng, yj = vs[j].lat;
            const intersect = ((yi > pt.lat) !== (yj > pt.lat))
                && (pt.lng < (xj - xi) * (pt.lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    },

    findShapeContainingPoint(lat, lng) {
        if (!this.savedShapes || !this.savedShapes.length) return null;
        const pt = { lat, lng };
        for (let i = this.savedShapes.length - 1; i >= 0; i--) {
            const s = this.savedShapes[i];
            if (s.mode === 'polygon' && s.vertices && s.vertices.length >= 3) {
                if (this.isPointInPolygon(pt, s.vertices)) {
                    return s;
                }
            }
        }
        return null;
    },

    openDefaultStampSettingsModal() {
        this.ensureLayers();
        const modal = document.getElementById('modalCadEditAnnotation');
        if (!modal) return;
        this.loadDefaultStampConfig();
        const cfg = this.defaultStampConfig;

        document.getElementById('txtCadEditAnnId').value = '__DEFAULT_STAMP__';
        const titleEl = document.getElementById('cadEditAnnModalTitle');
        if (titleEl) titleEl.innerText = '⚙️ Cài Đặt Thông Tin Mẫu Tem / Nhãn Bản Vẽ';

        const grpText = document.getElementById('grpCadEditAnnText');
        const grpStamp = document.getElementById('grpCadEditAnnStamp');
        const grpRect = document.getElementById('grpCadEditAnnRect');
        const grpCircle = document.getElementById('grpCadEditAnnCircle');
        const grpFont = document.getElementById('grpCadEditAnnFontSize');
        const btnDel = document.getElementById('btnCadEditAnnDelete');

        if (grpText) grpText.style.display = 'none';
        if (grpRect) grpRect.style.display = 'none';
        if (grpCircle) grpCircle.style.display = 'none';
        if (grpFont) grpFont.style.display = 'none';
        if (btnDel) btnDel.style.display = 'none';

        if (grpStamp) grpStamp.style.display = 'flex';
        const sTypeEl = document.getElementById('selCadEditAnnStampType');
        if (sTypeEl) sTypeEl.value = cfg.stampType || 'parcel';
        this.onStampTypeChange(cfg.stampType || 'parcel');

        if (document.getElementById('txtCadEditAnnSheet')) document.getElementById('txtCadEditAnnSheet').value = cfg.sheetNo || '01';
        if (document.getElementById('txtCadEditAnnParcel')) document.getElementById('txtCadEditAnnParcel').value = cfg.parcelNo || '01';
        if (document.getElementById('txtCadEditAnnArea')) document.getElementById('txtCadEditAnnArea').value = cfg.area || '';
        if (document.getElementById('txtCadEditAnnLandType')) document.getElementById('txtCadEditAnnLandType').value = cfg.landType || 'ONT';
        if (document.getElementById('txtCadEditAnnOwner')) document.getElementById('txtCadEditAnnOwner').value = cfg.owner || '';
        if (document.getElementById('txtCadEditAnnDrawTitle')) document.getElementById('txtCadEditAnnDrawTitle').value = cfg.drawTitle || 'HIỆN TRẠNG VỊ TRÍ KHU ĐẤT';
        if (document.getElementById('txtCadEditAnnDrawScale')) document.getElementById('txtCadEditAnnDrawScale').value = cfg.drawScale || '1:500';
        if (document.getElementById('txtCadEditAnnDrawAuthor')) document.getElementById('txtCadEditAnnDrawAuthor').value = cfg.drawAuthor || 'Kỹ sư đo đạc';

        const col = cfg.color || '#38bdf8';
        if (document.getElementById('txtCadEditAnnColor')) document.getElementById('txtCadEditAnnColor').value = col;
        if (document.getElementById('lblCadEditAnnColorHex')) document.getElementById('lblCadEditAnnColorHex').innerText = col;

        modal.classList.add('show');
    },

    syncToolButtons() {
        const isPoly = (this.mode === 'polygon');
        const isLine = (this.mode === 'polyline');
        const isSelect = (this.mode === 'select');
        const mMode = this.markupMode;

        const btnPoly = document.getElementById('btnCadModePoly');
        const btnLine = document.getElementById('btnCadModeLine');
        const btnSelect = document.getElementById('btnCadToolSelectMode');

        if (btnPoly) btnPoly.classList.toggle('active', isPoly && !mMode);
        if (btnLine) btnLine.classList.toggle('active', isLine && !mMode);
        if (btnSelect) btnSelect.classList.toggle('active', isSelect && !mMode);

        const modeBtns = {
            arrow: 'btnCadMarkupArrow',
            stamp: 'btnCadMarkupStamp',
            rect: 'btnCadMarkupRect',
            circle: 'btnCadMarkupCircle',
            text: 'btnCadMarkupText'
        };

        Object.keys(modeBtns).forEach(k => {
            const btn = document.getElementById(modeBtns[k]);
            if (btn) {
                btn.classList.toggle('active', mMode === k);
            }
        });

        // Cập nhật con trỏ bản đồ
        if (AppState.leafletMap) {
            const container = AppState.leafletMap.getContainer();
            if (container) {
                container.style.cursor = (isSelect) ? 'default' : 'crosshair';
            }
        }
        if (this.updateHudQuickTips) {
            this.updateHudQuickTips();
        }
    },

    updateHudQuickTips(customText) {
        const tipEl = document.getElementById('cadHudQuickTips');
        if (!tipEl) return;
        if (customText) {
            tipEl.innerHTML = `<span class="cad-hud-tip-text">${customText}</span>`;
            return;
        }
        if (this.markupMode) {
            const modeNames = { arrow: 'Mũi tên', stamp: 'Tem nhãn', rect: 'Khối nhà', circle: 'Bán kính', text: 'Chữ' };
            const mName = modeNames[this.markupMode] || this.markupMode;
            tipEl.innerHTML = `<span class="cad-hud-tip-text">🏷️ <b>${mName}</b>: Rê chuột xem bóng mờ • Click đặt • <b>Esc/Chuột phải</b>: Hủy</span>`;
        } else if (this.mode === 'select') {
            tipEl.innerHTML = `<span class="cad-hud-tip-text">↖️ <b>Chọn [V]</b>: Click đối tượng • Kéo để dời • <b>Del</b>: Xóa • <b>Esc</b>: Bỏ chọn</span>`;
        } else if (this.mode === 'polyline') {
            tipEl.innerHTML = `<span class="cad-hud-tip-text">📏 <b>Tuyến [L]</b>: Click đặt mốc • <b>Space/Chuột phải</b>: Lưu tuyến • <b>U</b>: Lùi • <b>Esc</b>: Hủy</span>`;
        } else {
            tipEl.innerHTML = `<span class="cad-hud-tip-text">📐 <b>Đa giác [P]</b>: Click mốc • <b>Space/Chuột phải</b>: Khép góc [C] • <b>U</b>: Lùi • <b>Esc</b>: Hủy</span>`;
        }
    },

    setMode(mode) {
        if (mode !== 'select' && this.selectedItem) {
            this.deselectCurrent();
        }
        if (mode === 'select') {
            this.clearDynamicHelpers();
        }

        this.mode = mode;
        this.isActive = true;
        this.markupMode = null;
        this.markupStepData = null;
        this.clearMarkupPreview();
        this.ensureLayers();

        const statusEl = document.getElementById('cadMarkupStatus');
        if (statusEl) { statusEl.style.display = 'none'; statusEl.innerText = ''; }

        const badge = document.getElementById('cadModeBadge');
        const subbar = document.getElementById('cadSelectSubbar');
        if (subbar) subbar.style.display = (mode === 'select') ? 'flex' : 'none';

        if (badge) {
            if (mode === 'polygon') badge.innerText = "Đa giác ranh";
            else if (mode === 'polyline') badge.innerText = "Đường tim tuyến";
            else if (mode === 'select') badge.innerText = "Chọn đối tượng ↖️";
        }

        if (mode === 'select') {
            showToast("↖️ Chế độ Chọn: Chạm vào thửa đất, đỉnh hoặc nhãn để chọn/sửa/xóa");
        } else if (mode === 'polygon') {
            showToast("📐 Chế độ vẽ: Đa giác khép kín (Chạm bản đồ để dựng mốc)");
        } else if (mode === 'polyline') {
            showToast("📏 Chế độ vẽ: Tim tuyến hở (Chạm bản đồ để dựng mốc)");
        }

        this.syncToolButtons();
        this.renderGeometry();
        this.updateUi();
    },

    togglePercentRatio(checked) {
        this.showPercentRatio = !!checked;
        const allShapes = this._getAllExportShapes();
        this.renderBlockList(allShapes);
    },

    updateCustomProjectArea(val) {
        const num = parseFloat(val);
        this.customProjectArea = (!isNaN(num) && num > 0) ? num : null;
        const allShapes = this._getAllExportShapes();
        this.renderBlockList(allShapes);
        this.renderExportBlockPicker();
        this.checkScalePaperFit();
    },

    resetCustomProjectArea() {
        const allShapes = this._getAllExportShapes();
        let measuredTotalArea = 0;
        let polyCount = 0;
        allShapes.forEach(s => {
            if (s.selected !== false && s.mode === 'polygon') {
                const stats = this.calculateAreaAndPerimeter(s.vertices, s.mode);
                if (s.stats) {
                    s.stats.area = stats.area;
                    s.stats.areaFormatted = stats.areaFormatted;
                    s.stats.ha = stats.ha;
                    s.stats.haFormatted = stats.haFormatted;
                    s.stats.perimeter = stats.perimeter;
                    s.stats.perimeterFormatted = stats.perimeterFormatted;
                }
                measuredTotalArea += (stats?.area || 0);
                polyCount++;
            }
        });
        measuredTotalArea = parseFloat(measuredTotalArea.toFixed(2));
        this.customProjectArea = measuredTotalArea > 0 ? measuredTotalArea : null;

        const input = document.getElementById('cadCustomProjectArea');
        if (input) {
            input.value = measuredTotalArea > 0 ? measuredTotalArea : '';
        }

        // Cập nhật lại giao diện bảng khối và tóm tắt
        this.renderBlockList(allShapes);

        const elAreaM2 = document.getElementById('cadModalAreaM2');
        const elAreaHa = document.getElementById('cadModalAreaHa');
        if (elAreaM2) elAreaM2.innerText = `${measuredTotalArea.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
        if (elAreaHa) elAreaHa.innerText = `≈ ${(measuredTotalArea / 10000).toFixed(4)} ha (${polyCount} đa giác)`;

        triggerHaptic('success');
        showToast(`✓ Đã tự động lấy diện tích thực: ${measuredTotalArea.toLocaleString('vi-VN')} m² (${polyCount} thửa đa giác)`);
    },

    _normalizeVertex(v, idx = 0, forceSyncVn2k = false) {
        if (!v) return null;
        let lat = parseFloat(v.lat !== undefined ? v.lat : (v.Lat !== undefined ? v.Lat : v.latitude));
        let lng = parseFloat(v.lng !== undefined ? v.lng : (v.Lng !== undefined ? v.Lng : v.longitude));
        let x = parseFloat(v.x !== undefined ? v.x : (v.X !== undefined ? v.X : v.northing));
        let y = parseFloat(v.y !== undefined ? v.y : (v.Y !== undefined ? v.Y : v.easting));

        // Phát hiện và tự đảo ngược nếu X (Bắc) và Y (Đông) bị hoán đổi
        // Tại Việt Nam: Northing X luôn > 800,000 m (8.5° - 23.5° Bắc); Easting Y luôn < 800,000 m (kinh tuyến trục 500,000 m ± 300,000 m)
        // Chỉ tự đảo khi x < 700000 && y > 900000 để tuyệt đối không đảo nhầm tọa độ ở vùng Nam Bộ (Cà Mau, Kiên Giang...)
        if (isFinite(x) && isFinite(y) && x < 700000 && y > 900000) {
            const temp = x;
            x = y;
            y = temp;
        }

        const hasValidLatLng = isFinite(lat) && isFinite(lng) && lat > 1 && lng > 50;
        const hasValidXY = isFinite(x) && isFinite(y) && x > 10000;

        // Tự động kiểm tra phát hiện lệch tọa độ VN2000 (X, Y) so với (lat, lng) khi kéo đỉnh
        let needRecomputeVn2k = forceSyncVn2k || !hasValidXY;
        if (!needRecomputeVn2k && hasValidLatLng && hasValidXY) {
            try {
                const checkWgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                // Nếu tọa độ WGS84 lệch trên ~0.05m (0.0000005 độ) so với lat/lng thực tế -> cần đồng bộ lại
                if (Math.abs(checkWgs.lat - lat) > 0.0000005 || Math.abs(checkWgs.lng - lng) > 0.0000005) {
                    needRecomputeVn2k = true;
                }
            } catch (e) {}
        }

        // Nếu forceSyncVn2k hoặc lệch tọa độ và có lat/lng hợp lệ, tính lại x/y từ lat/lng theo KTT hiện tại
        if (needRecomputeVn2k && hasValidLatLng) {
            try {
                const conv = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                x = parseFloat(conv.X);
                y = parseFloat(conv.Y);
            } catch (e) {}
        } else if (!hasValidLatLng && hasValidXY) {
            // Ngược lại nếu lat/lng chưa có hoặc = 0 nhưng có x/y VN2000 hợp lệ
            try {
                const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                lat = parseFloat(wgs.lat);
                lng = parseFloat(wgs.lng);
            } catch (e) {}
        }

        const normH = isFinite(parseFloat(v.h !== undefined ? v.h : (v.H !== undefined ? v.H : (v.z !== undefined ? v.z : 0))))
            ? parseFloat(parseFloat(v.h !== undefined ? v.h : (v.H !== undefined ? v.H : (v.z !== undefined ? v.z : 0))).toFixed(3))
            : 0;

        const norm = {
            ...v,
            name: v.name || (`Đ${idx + 1}`),
            lat: isFinite(lat) ? parseFloat(lat.toFixed(7)) : 0,
            lng: isFinite(lng) ? parseFloat(lng.toFixed(7)) : 0,
            x: isFinite(x) ? parseFloat(x.toFixed(3)) : 0,
            y: isFinite(y) ? parseFloat(y.toFixed(3)) : 0,
            h: normH
        };

        // Đồng thời gán đồng bộ trực tiếp vào đối tượng gốc v và các thuộc tính tương đương
        try {
            v.name = norm.name;
            v.lat = norm.lat;
            v.lng = norm.lng;
            v.x = norm.x;
            v.y = norm.y;
            v.h = norm.h;
            if (v.X !== undefined) v.X = norm.x;
            if (v.Y !== undefined) v.Y = norm.y;
            if (v.northing !== undefined) v.northing = norm.x;
            if (v.easting !== undefined) v.easting = norm.y;
            if (v.Lat !== undefined) v.Lat = norm.lat;
            if (v.Lng !== undefined) v.Lng = norm.lng;
        } catch (e) {}

        return norm;
    },

    applySuggestedScale(scale) {
        const sel = document.getElementById('cadExportScale');
        if (sel) {
            let found = false;
            for (let i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value === String(scale)) {
                    sel.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                const opt = document.createElement('option');
                opt.value = String(scale);
                opt.text = `1:${scale} (Tối ưu)`;
                sel.add(opt);
                sel.value = String(scale);
            }
            this.checkScalePaperFit();
            showToast(`✓ Đã áp dụng tỷ lệ tối ưu 1:${scale}`);
        }
    },

    _getAllExportShapes() {
        const allShapes = [];
        (this.savedShapes || []).forEach((s, idx) => {
            const rawVerts = s.vertices || [];
            const vertices = rawVerts.map((v, i) => this._normalizeVertex(v, i)).filter(Boolean);
            allShapes.push({
                id: s.id,
                name: s.name,
                shortName: s.shortName || `Thửa ${idx + 1}`,
                symbol: s.symbol || String(idx + 1),
                mode: s.mode,
                vertices: vertices,
                stats: s.stats || this.calculateAreaAndPerimeter(vertices, s.mode),
                color: s.color || '#10b981',
                selected: s.selected !== false
            });
        });
        if (this.vertices && this.vertices.length >= 2) {
            const actIdx = allShapes.length + 1;
            const vertices = this.vertices.map((v, i) => this._normalizeVertex(v, i)).filter(Boolean);
            allShapes.push({
                id: 'active_draft',
                name: `Cấu trúc ${actIdx} (Đang vẽ)`,
                shortName: `Thửa ${actIdx}`,
                symbol: String(actIdx),
                mode: this.mode,
                vertices: vertices,
                stats: this.calculateAreaAndPerimeter(vertices, this.mode),
                color: '#06b6d4',
                selected: this._draftSelected !== false
            });
        }
        return allShapes;
    },

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        appSettings.save();
        const btn = document.getElementById('btnCadSnap');
        if (btn) {
            if (this.snapEnabled) {
                btn.classList.add('active');
                btn.innerHTML = "🧲 Snap: BẬT [S]";
                showToast("Bật tự động bắt điểm (Snap) [S]");
            } else {
                btn.classList.remove('active');
                btn.innerHTML = "🧲 Snap: TẮT [S]";
                showToast("Tắt bắt điểm Snap [S]");
            }
        }
        const hudSnap = document.getElementById('btnCadHudSnap');
        if (hudSnap) {
            hudSnap.classList.toggle('active', !!this.snapEnabled);
        }
    },

    toggleSnapLine(explicitVal) {
        if (typeof explicitVal === 'boolean') {
            this.snapLineEnabled = explicitVal;
        } else {
            this.snapLineEnabled = !this.snapLineEnabled;
        }
        try {
            localStorage.setItem('vn2k_cad_snap_line_enabled', this.snapLineEnabled ? 'true' : 'false');
            AppState.savedCadSnapLine = this.snapLineEnabled;
        } catch (e) {}
        appSettings.save();

        this.updateSnapLineUi();

        if (!this.snapLineEnabled && this.clearSnapEdgeGuide) {
            this.clearSnapEdgeGuide();
        }

        showToast(this.snapLineEnabled ? "🔗 BẬT bắt LINE liền kề [B]" : "🔗 TẮT bắt LINE [B]");
    },

    // Kiểm tra hai đoạn thẳng P1P2 và P3P4 có cắt chéo nhau không (QC Geom từ vn-autocad-skill)
    segmentsIntersect(p1, p2, p3, p4) {
        const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
        return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
    },

    // Kiểm tra đa giác có bị tự cắt chéo dạng số 8 / cánh bướm không
    checkSelfIntersection() {
        const pts = this.vertices;
        const n = pts.length;
        if (n < 4) return false;
        for (let i = 0; i < n; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            for (let j = i + 2; j < n; j++) {
                if (i === 0 && j === n - 1) continue; // Bỏ qua 2 cạnh liền kề nhau
                const p3 = pts[j];
                const p4 = pts[(j + 1) % n];
                if (this.segmentsIntersect(p1, p2, p3, p4)) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Tự động tìm kiếm đỉnh của khối liền kề gần nhất trong phạm vi khoảng cách thực địa (mặc định 0.5m)
     * Phục vụ khép góc ranh thửa và loại bỏ khe hở ranh (sliver polygon) theo chuẩn Thông tư 25/2014/TT-BTNMT
     */
    findAdjacentVertexSnap(currentLat, currentLng, excludeShapeIdx = -1, excludeVertexIdx = -1, thresholdMeters = 0.5) {
        if (!AppState.leafletMap) return null;
        const map = AppState.leafletMap;
        let bestCandidate = null;
        let minDistance = thresholdMeters || 0.5;

        let curX = null, curY = null;
        try {
            const vn2k = convertWgsToVn2k(currentLat, currentLng, AppState.kttVal, AppState.scaleFactor);
            curX = parseFloat(vn2k.X);
            curY = parseFloat(vn2k.Y);
        } catch (e) {}

        // 1. Duyệt qua tất cả các khối / thửa liền kề đã lưu
        (this.savedShapes || []).forEach((shape, sIdx) => {
            if (excludeShapeIdx >= 0 && sIdx === excludeShapeIdx) return;
            if (shape.selected === false) return;

            const verts = shape.vertices || [];
            verts.forEach((v, vIdx) => {
                let dist = 999999;
                if (curX !== null && curY !== null && v.x !== undefined && v.y !== undefined && !isNaN(v.x) && !isNaN(v.y)) {
                    const dx = v.x - curX;
                    const dy = v.y - curY;
                    dist = Math.hypot(dx, dy);
                } else {
                    dist = map.distance([currentLat, currentLng], [v.lat, v.lng]);
                }

                if (dist <= minDistance) {
                    minDistance = dist;
                    bestCandidate = {
                        lat: v.lat,
                        lng: v.lng,
                        x: parseFloat(parseFloat(v.x).toFixed(3)),
                        y: parseFloat(parseFloat(v.y).toFixed(3)),
                        h: v.h || 0,
                        name: v.name,
                        shapeName: shape.name || shape.shortName || `Khối ${sIdx + 1}`,
                        shapeIdx: sIdx,
                        vertexIdx: vIdx,
                        distance: dist,
                        isSnapped: true,
                        snapType: 'adjacent_vertex',
                        source: `${shape.shortName || shape.name || `Khối ${sIdx + 1}`} • ${v.name}`
                    };
                }
            });
        });

        // 1.5 Nếu bật Bắt LINE (snapLineEnabled), kiểm tra chiếu vuông góc lên các cạnh của khối liền kề
        if (this.snapLineEnabled !== false && curX !== null && curY !== null) {
            (this.savedShapes || []).forEach((shape, sIdx) => {
                if (excludeShapeIdx >= 0 && sIdx === excludeShapeIdx) return;
                if (shape.selected === false) return;
                const verts = shape.vertices || [];
                const n = verts.length;
                if (n < 2) return;
                const isClosed = (shape.mode === 'polygon' && n >= 3);
                const numEdges = isClosed ? n : n - 1;

                for (let i = 0; i < numEdges; i++) {
                    const v1 = verts[i];
                    const v2 = verts[(i + 1) % n];
                    const dx = v2.x - v1.x;
                    const dy = v2.y - v1.y;
                    const lenSq = dx * dx + dy * dy;
                    if (lenSq < 1e-4) continue;

                    const t = ((curX - v1.x) * dx + (curY - v1.y) * dy) / lenSq;
                    if (t > 0.02 && t < 0.98) {
                        const projX = v1.x + t * dx;
                        const projY = v1.y + t * dy;
                        const distToEdge = Math.hypot(curX - projX, curY - projY);
                        if (distToEdge <= minDistance) {
                            minDistance = distToEdge;
                            const projWgs = convertVn2kToWgs(projX, projY, AppState.kttVal, AppState.scaleFactor);
                            const projH = (v1.h || 0) + t * ((v2.h || 0) - (v1.h || 0));
                            bestCandidate = {
                                lat: projWgs.lat,
                                lng: projWgs.lng,
                                x: parseFloat(projX.toFixed(3)),
                                y: parseFloat(projY.toFixed(3)),
                                h: parseFloat(projH.toFixed(3)),
                                name: `Trên cạnh [${v1.name}-${v2.name}]`,
                                shapeName: shape.name || shape.shortName || `Khối ${sIdx + 1}`,
                                shapeIdx: sIdx,
                                vertexIdx: -1,
                                distance: distToEdge,
                                isSnapped: true,
                                snapType: 'adjacent_edge',
                                source: `Cạnh ${shape.shortName || shape.name || `Khối ${sIdx + 1}`} • ${v1.name}-${v2.name}`
                            };
                        }
                    }
                }
            });
        }

        // 2. Nếu đang chỉnh sửa đỉnh của khối đã lưu và có nét vẽ dở this.vertices, cũng kiểm tra các đỉnh đó
        if (excludeShapeIdx >= 0 && this.vertices && this.vertices.length >= 2) {
            this.vertices.forEach((v, vIdx) => {
                let dist = 999999;
                if (curX !== null && curY !== null && v.x !== undefined && v.y !== undefined && !isNaN(v.x) && !isNaN(v.y)) {
                    const dx = v.x - curX;
                    const dy = v.y - curY;
                    dist = Math.hypot(dx, dy);
                } else {
                    dist = map.distance([currentLat, currentLng], [v.lat, v.lng]);
                }

                if (dist <= minDistance) {
                    minDistance = dist;
                    bestCandidate = {
                        lat: v.lat,
                        lng: v.lng,
                        x: parseFloat(parseFloat(v.x).toFixed(3)),
                        y: parseFloat(parseFloat(v.y).toFixed(3)),
                        h: v.h || 0,
                        name: v.name,
                        shapeName: 'Nét đang vẽ',
                        shapeIdx: -1,
                        vertexIdx: vIdx,
                        distance: dist,
                        isSnapped: true,
                        snapType: 'adjacent_vertex',
                        source: `Nét đang vẽ • ${v.name}`
                    };
                }
            });
        }

        // 3. Nếu đang vẽ dở (excludeShapeIdx === -1), cũng kiểm tra các đỉnh khác trong this.vertices (loại trừ đỉnh đang kéo excludeVertexIdx)
        if (excludeShapeIdx === -1 && this.vertices && this.vertices.length >= 2) {
            this.vertices.forEach((v, vIdx) => {
                if (excludeVertexIdx >= 0 && vIdx === excludeVertexIdx) return;
                let dist = 999999;
                if (curX !== null && curY !== null && v.x !== undefined && v.y !== undefined && !isNaN(v.x) && !isNaN(v.y)) {
                    const dx = v.x - curX;
                    const dy = v.y - curY;
                    dist = Math.hypot(dx, dy);
                } else {
                    dist = map.distance([currentLat, currentLng], [v.lat, v.lng]);
                }

                if (dist <= minDistance) {
                    minDistance = dist;
                    bestCandidate = {
                        lat: v.lat,
                        lng: v.lng,
                        x: parseFloat(parseFloat(v.x).toFixed(3)),
                        y: parseFloat(parseFloat(v.y).toFixed(3)),
                        h: v.h || 0,
                        name: v.name,
                        shapeName: 'Đỉnh cùng nét',
                        shapeIdx: -1,
                        vertexIdx: vIdx,
                        distance: dist,
                        isSnapped: true,
                        snapType: 'adjacent_vertex',
                        source: `Đỉnh cùng nét • ${v.name}`
                    };
                }
            });
        }

        // 4. Kiểm tra các mốc dự án đã lưu (Project Points)
        if (typeof appData !== 'undefined' && appData.getPoints) {
            const projPts = appData.getPoints(AppState.currentProject) || [];
            projPts.forEach((p, pIdx) => {
                const pLat = parseFloat(p.lat);
                const pLng = parseFloat(p.lng);
                let pX = parseFloat(p.x);
                let pY = parseFloat(p.y);
                if (!isFinite(pLat) || !isFinite(pLng)) return;

                if (!isFinite(pX) || !isFinite(pY) || pX < 10000) {
                    try {
                        const vn = convertWgsToVn2k(pLat, pLng, AppState.kttVal, AppState.scaleFactor);
                        pX = parseFloat(vn.X);
                        pY = parseFloat(vn.Y);
                    } catch (e) {}
                }

                let dist = 999999;
                if (curX !== null && curY !== null && isFinite(pX) && isFinite(pY)) {
                    dist = Math.hypot(pX - curX, pY - curY);
                } else {
                    dist = map.distance([currentLat, currentLng], [pLat, pLng]);
                }

                if (dist <= minDistance) {
                    minDistance = dist;
                    bestCandidate = {
                        lat: pLat,
                        lng: pLng,
                        x: parseFloat(pX.toFixed(3)),
                        y: parseFloat(pY.toFixed(3)),
                        h: parseFloat(p.h || 0),
                        name: p.name || `Mốc ${pIdx + 1}`,
                        shapeName: `Mốc dự án`,
                        shapeIdx: -2,
                        vertexIdx: pIdx,
                        distance: dist,
                        isSnapped: true,
                        snapType: 'project_point',
                        source: `Mốc dự án • ${p.name || (`Mốc ${pIdx + 1}`)}`
                    };
                }
            });
        }

        // 5. Nếu đang chỉnh sửa đỉnh của khối đã lưu (excludeShapeIdx >= 0), cũng cho phép bắt vào các đỉnh khác trong cùng khối (trừ chính đỉnh đang kéo)
        if (excludeShapeIdx >= 0 && this.savedShapes && this.savedShapes[excludeShapeIdx]) {
            const sameShape = this.savedShapes[excludeShapeIdx];
            (sameShape.vertices || []).forEach((v, vIdx) => {
                if (excludeVertexIdx >= 0 && vIdx === excludeVertexIdx) return;
                let dist = 999999;
                if (curX !== null && curY !== null && v.x !== undefined && v.y !== undefined && !isNaN(v.x) && !isNaN(v.y)) {
                    const dx = v.x - curX;
                    const dy = v.y - curY;
                    dist = Math.hypot(dx, dy);
                } else {
                    dist = map.distance([currentLat, currentLng], [v.lat, v.lng]);
                }

                if (dist <= minDistance) {
                    minDistance = dist;
                    bestCandidate = {
                        lat: v.lat,
                        lng: v.lng,
                        x: parseFloat(parseFloat(v.x).toFixed(3)),
                        y: parseFloat(parseFloat(v.y).toFixed(3)),
                        h: v.h || 0,
                        name: v.name,
                        shapeName: sameShape.name || sameShape.shortName || `Cùng khối`,
                        shapeIdx: excludeShapeIdx,
                        vertexIdx: vIdx,
                        distance: dist,
                        isSnapped: true,
                        snapType: 'same_shape_vertex',
                        source: `Đỉnh cùng khối • ${v.name}`
                    };
                }
            });
        }

        return bestCandidate;
    },

    findSnapCandidate(clickLat, clickLng) {
        if (!AppState.leafletMap) return null;
        const map = AppState.leafletMap;
        const clickPt = map.latLngToContainerPoint([clickLat, clickLng]);

        let bestVertex = null;
        let minVertexDist = this.snapThresholdPx || 24; // Bán kính bắt đỉnh: pixel màn hình
        const curZoom = map.getZoom ? map.getZoom() : 18;
        // Giới hạn khoảng cách thực địa tối đa để tránh hút nhầm điểm khi bản đồ đang thu nhỏ / nhìn toàn cảnh:
        // Ở mức zoom cao (>=22): 0.8m; ở mức zoom 20-21: 0.6m; ở mức zoom < 20: giới hạn nghiêm ngặt 0.4m
        const maxRealSnapMeters = (curZoom >= 22) ? 0.8 : (curZoom >= 20 ? 0.6 : 0.4);

        // --- BƯỚC 1: TÌM ĐỈNH TRÙNG KHỚP (VERTEX / ENDPOINT SNAP - ƯU TIÊN SỐ 1) ---
        // 1.1 Kiểm tra các đỉnh của các khối / thửa đã lưu trước đó (Bảo toàn diện tích tiếp giáp)
        this.savedShapes.forEach((shape, sIdx) => {
            if (shape.selected === false) return;
            shape.vertices.forEach((v, vIdx) => {
                const ptScreen = map.latLngToContainerPoint([v.lat, v.lng]);
                const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                if (d < minVertexDist) {
                    const gDist = map.distance([clickLat, clickLng], [v.lat, v.lng]);
                    if (gDist <= maxRealSnapMeters) {
                        minVertexDist = d;
                        bestVertex = {
                            lat: v.lat,
                            lng: v.lng,
                            x: v.x,
                            y: v.y,
                            h: v.h || 0,
                            name: v.name,
                            snapType: 'vertex',
                            isSnapped: true,
                            source: `${shape.shortName || `Thửa ${sIdx + 1}`} • ${v.name}`
                        };
                    }
                }
            });
        });

        // 1.2 Kiểm tra các đỉnh của nét vẽ hiện tại
        this.vertices.forEach((v, vIdx) => {
            const ptScreen = map.latLngToContainerPoint([v.lat, v.lng]);
            const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
            if (d < minVertexDist) {
                const gDist = map.distance([clickLat, clickLng], [v.lat, v.lng]);
                if (gDist <= maxRealSnapMeters) {
                    minVertexDist = d;
                    bestVertex = {
                        lat: v.lat,
                        lng: v.lng,
                        x: v.x,
                        y: v.y,
                        h: v.h || 0,
                        name: v.name,
                        snapType: 'vertex',
                        isSnapped: true,
                        source: `Đỉnh đang vẽ (${v.name})`
                    };
                }
            }
        });

        // 1.3 Kiểm tra các mốc dự án đã lưu
        const projectPoints = appData.getPoints(AppState.currentProject) || [];
        projectPoints.forEach(p => {
            const pLat = parseFloat(p.lat);
            const pLng = parseFloat(p.lng);
            if (!isNaN(pLat) && !isNaN(pLng)) {
                const ptScreen = map.latLngToContainerPoint([pLat, pLng]);
                const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                if (d < minVertexDist) {
                    const gDist = map.distance([clickLat, clickLng], [pLat, pLng]);
                    if (gDist <= maxRealSnapMeters) {
                        minVertexDist = d;
                        bestVertex = {
                            lat: pLat,
                            lng: pLng,
                            x: parseFloat(p.x) || 0,
                            y: parseFloat(p.y) || 0,
                            h: parseFloat(p.h || p.z || 0),
                            name: p.name || 'Mốc',
                            snapType: 'vertex',
                            isSnapped: true,
                            source: `Mốc dự án (${p.name || ''})`
                        };
                    }
                }
            }
        });

        // Nếu bắt trúng đỉnh -> trả về ngay để ưu tiên tuyệt đối
        if (bestVertex) {
            return bestVertex;
        }

        // --- BƯỚC 1.5: TÌM GIAO ĐIỂM CÁC CẠNH (INTERSECTION SNAP - ✕) ---
        let bestIntersection = null;
        let minIntDist = 26; // 26px threshold

        const shapesForInt = [...this.savedShapes];
        if (this.vertices && this.vertices.length >= 2) {
            shapesForInt.push({
                shortName: 'Nét đang vẽ',
                mode: this.mode,
                vertices: this.vertices
            });
        }

        const allSegments = [];
        shapesForInt.forEach((shape, sIdx) => {
            const verts = shape.vertices;
            const n = verts.length;
            if (n < 2) return;
            const isClosed = (shape.mode === 'polygon' && n >= 3);
            const numEdges = isClosed ? n : n - 1;
            for (let i = 0; i < numEdges; i++) {
                allSegments.push({
                    p1: verts[i],
                    p2: verts[(i + 1) % n],
                    shapeName: shape.shortName || `Thửa ${sIdx + 1}`
                });
            }
        });

        for (let i = 0; i < allSegments.length; i++) {
            for (let j = i + 1; j < allSegments.length; j++) {
                const s1 = allSegments[i];
                const s2 = allSegments[j];

                // Bỏ qua 2 cạnh kề nhau chung đỉnh
                if (s1.p1 === s2.p1 || s1.p1 === s2.p2 || s1.p2 === s2.p1 || s1.p2 === s2.p2) continue;

                const x1 = s1.p1.x, y1 = s1.p1.y;
                const x2 = s1.p2.x, y2 = s1.p2.y;
                const x3 = s2.p1.x, y3 = s2.p1.y;
                const x4 = s2.p2.x, y4 = s2.p2.y;

                const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                if (Math.abs(denom) < 1e-9) continue;

                const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
                const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

                if (t > 0.03 && t < 0.97 && u > 0.03 && u < 0.97) {
                    const intX = x1 + t * (x2 - x1);
                    const intY = y1 + t * (y2 - y1);
                    const intLat = s1.p1.lat + t * (s1.p2.lat - s1.p1.lat);
                    const intLng = s1.p1.lng + t * (s1.p2.lng - s1.p1.lng);
                    const intH = (s1.p1.h || 0) + t * ((s1.p2.h || 0) - (s1.p1.h || 0));

                    const ptScreen = map.latLngToContainerPoint([intLat, intLng]);
                    const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                    if (d < minIntDist) {
                        minIntDist = d;
                        bestIntersection = {
                            lat: intLat,
                            lng: intLng,
                            x: parseFloat(intX.toFixed(3)),
                            y: parseFloat(intY.toFixed(3)),
                            h: parseFloat(intH.toFixed(3)),
                            name: `Giao[${s1.p1.name}-${s1.p2.name}✕${s2.p1.name}-${s2.p2.name}]`,
                            snapType: 'intersection',
                            isSnapped: true,
                            source: `Giao điểm ✕ (${s1.shapeName} & ${s2.shapeName})`
                        };
                    }
                }
            }
        }
        if (bestIntersection) return bestIntersection;

        // --- BƯỚC 1.8: TÌM ĐIỂM VUÔNG GÓC (PERPENDICULAR SNAP - ⟂) ---
        if (this.vertices && this.vertices.length >= 1) {
            const lastV = this.vertices[this.vertices.length - 1];
            let bestPerp = null;
            let minPerpDist = 24;

            this.savedShapes.forEach((shape, sIdx) => {
                const verts = shape.vertices;
                const n = verts.length;
                if (n < 2) return;
                const isClosed = (shape.mode === 'polygon' && n >= 3);
                const numEdges = isClosed ? n : n - 1;

                for (let i = 0; i < numEdges; i++) {
                    const v1 = verts[i];
                    const v2 = verts[(i + 1) % n];

                    const dx = v2.x - v1.x;
                    const dy = v2.y - v1.y;
                    const lenSq = dx * dx + dy * dy;
                    if (lenSq === 0) continue;

                    const t = ((lastV.x - v1.x) * dx + (lastV.y - v1.y) * dy) / lenSq;
                    if (t > 0.04 && t < 0.96) {
                        const perpX = v1.x + t * dx;
                        const perpY = v1.y + t * dy;
                        const perpLat = v1.lat + t * (v2.lat - v1.lat);
                        const perpLng = v1.lng + t * (v2.lng - v1.lng);
                        const perpH = (v1.h || 0) + t * ((v2.h || 0) - (v1.h || 0));

                        const ptScreen = map.latLngToContainerPoint([perpLat, perpLng]);
                        const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                        if (d < minPerpDist) {
                            minPerpDist = d;
                            bestPerp = {
                                lat: perpLat,
                                lng: perpLng,
                                x: parseFloat(perpX.toFixed(3)),
                                y: parseFloat(perpY.toFixed(3)),
                                h: parseFloat(perpH.toFixed(3)),
                                name: `⟂[${v1.name}-${v2.name}]`,
                                snapType: 'perpendicular',
                                isSnapped: true,
                                source: `Vuông góc ⟂ ${shape.shortName || `Thửa ${sIdx + 1}`}: ${v1.name}-${v2.name}`
                            };
                        }
                    }
                }
            });

            if (bestPerp) return bestPerp;
        }

        // --- BƯỚC 2: TÌM ĐIỂM GIỮA CẠNH (MIDPOINT) & ĐIỂM TRÊN CẠNH (EDGE PROJECTION SNAP) ---
        let bestEdgeCandidate = null;
        if (this.snapLineEnabled !== false) {
            let minEdgeDist = 24; // Bán kính bắt cạnh: 24px

            const shapesToCheck = [...this.savedShapes];
            if (this.vertices && this.vertices.length >= 2) {
                shapesToCheck.push({
                    shortName: 'Nét đang vẽ',
                    mode: this.mode,
                    vertices: this.vertices
                });
            }

            shapesToCheck.forEach((shape, sIdx) => {
                const verts = shape.vertices;
                const n = verts.length;
                if (n < 2) return;
                const isClosed = (shape.mode === 'polygon' && n >= 3);
                const numEdges = isClosed ? n : n - 1;

                for (let i = 0; i < numEdges; i++) {
                    const v1 = verts[i];
                    const v2 = verts[(i + 1) % n];

                    const p1 = map.latLngToContainerPoint([v1.lat, v1.lng]);
                    const p2 = map.latLngToContainerPoint([v2.lat, v2.lng]);

                    // 2.1 Kiểm tra Midpoint (Điểm giữa cạnh)
                    const midPt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                    const distMid = Math.hypot(midPt.x - clickPt.x, midPt.y - clickPt.y);
                    if (distMid <= 26 && distMid < minEdgeDist) {
                        const midX = (v1.x + v2.x) / 2;
                        const midY = (v1.y + v2.y) / 2;
                        const midLat = (v1.lat + v2.lat) / 2;
                        const midLng = (v1.lng + v2.lng) / 2;
                        minEdgeDist = distMid;
                        bestEdgeCandidate = {
                            lat: midLat,
                            lng: midLng,
                            x: parseFloat(midX.toFixed(3)),
                            y: parseFloat(midY.toFixed(3)),
                            h: parseFloat(((v1.h + v2.h) / 2).toFixed(3)),
                            name: `Mid[${v1.name}-${v2.name}]`,
                            snapType: 'midpoint',
                            isSnapped: true,
                            source: `Điểm giữa ${shape.shortName || `Thửa ${sIdx + 1}`}: ${v1.name}-${v2.name}`
                        };
                        continue;
                    }

                    // 2.2 Kiểm tra điểm chiếu vuông góc lên đoạn thẳng (Orthogonal Edge Projection trong hệ tọa độ phẳng VN-2000 thực địa)
                    const clickVn = convertWgsToVn2k(clickLat, clickLng, AppState.kttVal, AppState.scaleFactor);
                    const segDx = v2.x - v1.x;
                    const segDy = v2.y - v1.y;
                    const lenSq = segDx * segDx + segDy * segDy;
                    if (segLenSq > 1e-4) {
                        // Tham số hình chiếu t = ((P_vn - V1) . (V2 - V1)) / lenSq
                        let tMetric = ((clickVn.X - v1.x) * segDx + (clickVn.Y - v1.y) * segDy) / segLenSq;
                        if (tMetric > 0.015 && tMetric < 0.985) {
                            // Tọa độ VN-2000 nằm nghiêm ngặt trên đường thẳng V1-V2 (Độ lệch diện tích Shoelace = 0.0000 m²)
                            const exactX = v1.x + tMetric * segDx;
                            const exactY = v1.y + tMetric * segDy;
                            const exactH = (v1.h || 0) + tMetric * ((v2.h || 0) - (v1.h || 0));
                            // Chuyển ngược sang WGS-84 bảo toàn tuyệt đối tọa độ trắc địa
                            const exactWgs = convertVn2kToWgs(exactX, exactY, AppState.kttVal, AppState.scaleFactor);
                            const ptScreen = map.latLngToContainerPoint([exactWgs.lat, exactWgs.lng]);
                            const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                            const edgeRealDist = map.distance([clickLat, clickLng], [exactWgs.lat, exactWgs.lng]);
                            const maxEdgeRealMeters = (curZoom >= 22) ? 0.6 : 0.35;

                            if (d < minEdgeDist && edgeRealDist <= maxEdgeRealMeters) {
                                minEdgeDist = d;
                                bestEdgeCandidate = {
                                    lat: exactWgs.lat,
                                    lng: exactWgs.lng,
                                    x: parseFloat(exactX.toFixed(3)),
                                    y: parseFloat(exactY.toFixed(3)),
                                    h: parseFloat(exactH.toFixed(3)),
                                    name: `Đ${this.vertices.length + 1}`,
                                    snapType: 'edge',
                                    isSnapped: true,
                                    shapeIdx: sIdx,
                                    shape: shape,
                                    edgeIdx: i,
                                    v1: v1,
                                    v2: v2,
                                    tMetric: tMetric,
                                    source: `Cạnh ${shape.shortName || `Thửa ${sIdx + 1}`}: ${v1.name}-${v2.name}`
                                };
                            }
                        }
                    }
                }
            });
        }

        return bestEdgeCandidate;
    },

    // Xử lý di chuyển chuột / ngón tay: Throttled bằng requestAnimationFrame cho 60-120 FPS mượt mà
    handleMouseMove(lat, lng) {
        if (!AppState.leafletMap || !this.isActive) return;
        this._lastMouseLat = lat;
        this._lastMouseLng = lng;
        if (this._mouseRaf) return;
        this._mouseRaf = requestAnimationFrame(() => {
            this._mouseRaf = null;
            this._processMouseMove(this._lastMouseLat, this._lastMouseLng);
        });
    },

    _processMouseMove(lat, lng) {
        if (!AppState.leafletMap) return;

        // Cập nhật tọa độ VN-2000 tức thời lên CAD Status HUD Bar
        const hudX = document.getElementById('cadHudCoordX');
        const hudY = document.getElementById('cadHudCoordY');
        if (hudX && hudY) {
            const curVn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
            hudX.innerText = `X: ${curVn2k.X.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
            hudY.innerText = `Y: ${curVn2k.Y.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
        }

        // Nếu đang ở chế độ Nhãn (Markup), hiển thị đường bóng mờ tương tác cho công cụ nhãn
        if (this.markupMode) {
            this.renderMarkupPreview(lat, lng);
            return;
        } else if (this.clearMarkupPreview) {
            this.clearMarkupPreview();
        }

        let targetLat = lat;
        let targetLng = lng;
        let targetName = null;
        let snapType = null;
        let snapSource = null;
        let targetX = null;
        let targetY = null;

        // 1. Kiểm tra bắt điểm Osnap theo thời gian thực (kể cả khi chưa có đỉnh nào - bắt điểm xuất phát)
        if (this.snapEnabled) {
            const cand = this.findSnapCandidate(lat, lng);
            if (cand && cand.isSnapped) {
                targetLat = cand.lat;
                targetLng = cand.lng;
                targetName = cand.name;
                snapType = cand.snapType;
                snapSource = cand.source;
                targetX = cand.x;
                targetY = cand.y;

                if (cand.snapType === 'edge' && cand.v1 && cand.v2) {
                    this.renderSnapEdgeGuide(cand.v1, cand.v2);
                } else {
                    this.clearSnapEdgeGuide();
                }

                // Lựa chọn glyph Osnap chuẩn AutoCAD
                let iconClass = 'cad-osnap-box';
                let glyph = '□';
                if (snapType === 'midpoint') {
                    iconClass = 'cad-osnap-box osnap-mid';
                    glyph = '△';
                } else if (snapType === 'edge') {
                    iconClass = 'cad-osnap-box osnap-edge';
                    glyph = '⧗';
                } else if (snapType === 'intersection') {
                    iconClass = 'cad-osnap-box osnap-intersection';
                    glyph = '✕';
                } else if (snapType === 'perpendicular') {
                    iconClass = 'cad-osnap-box osnap-perp';
                    glyph = '⟂';
                }

                const osnapIcon = L.divIcon({
                    className: '',
                    html: `<div class="${iconClass}" title="Snap: ${snapSource || targetName}">${glyph}</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                if (!this.layers.osnapMarker) {
                    this.layers.osnapMarker = L.marker([targetLat, targetLng], { icon: osnapIcon, interactive: false, zIndexOffset: 3000 }).addTo(AppState.leafletMap);
                } else {
                    this.layers.osnapMarker.setLatLng([targetLat, targetLng]);
                    this.layers.osnapMarker.setIcon(osnapIcon);
                }
            } else {
                if (this.layers.osnapMarker) {
                    AppState.leafletMap.removeLayer(this.layers.osnapMarker);
                    this.layers.osnapMarker = null;
                }
                this.clearSnapEdgeGuide();
            }
        } else {
            this.clearSnapEdgeGuide();
        }

        // 2. Nếu chưa có đỉnh nào trong nét vẽ hiện tại:
        if (this.vertices.length === 0) {
            if (targetName) {
                const tipHtml = `
                    <div class="cad-dynamic-tooltip" style="border-color:#f59e0b; color:#fbbf24; font-weight:700;">
                        🧲 BẮT ĐIỂM ĐẦU TIÊN: ${snapSource || targetName}
                    </div>
                `;
                const tipIcon = L.divIcon({ className: '', html: tipHtml, iconSize: [210, 24], iconAnchor: [-10, -10] });
                if (!this.layers.dynamicInputMarker) {
                    this.layers.dynamicInputMarker = L.marker([targetLat, targetLng], { icon: tipIcon, interactive: false, zIndexOffset: 3100 }).addTo(AppState.leafletMap);
                } else {
                    this.layers.dynamicInputMarker.setLatLng([targetLat, targetLng]);
                    this.layers.dynamicInputMarker.setIcon(tipIcon);
                }
            } else if (this.layers.dynamicInputMarker) {
                AppState.leafletMap.removeLayer(this.layers.dynamicInputMarker);
                this.layers.dynamicInputMarker = null;
            }
            if (this.layers.rubberbandLine) {
                AppState.leafletMap.removeLayer(this.layers.rubberbandLine);
                this.layers.rubberbandLine = null;
            }
            return;
        }

        // 3. Khi đã có ít nhất 1 đỉnh: Tính khoảng cách lẻ S và góc phương vị Az từ đỉnh cuối cùng
        const last = this.vertices[this.vertices.length - 1];
        let curX = targetX;
        let curY = targetY;
        if (curX === null || curY === null) {
            const vn2k = convertWgsToVn2k(targetLat, targetLng, AppState.kttVal, AppState.scaleFactor);
            curX = vn2k.X;
            curY = vn2k.Y;
        }

        const dx = curX - last.x;
        const dy = curY - last.y;
        const dist = Math.hypot(dx, dy);
        const azInfo = calculateDistanceAndAzimuth(last.x, last.y, curX, curY);

        // 3.1 Cập nhật đường thun Rubberband Line
        const lineCoords = [[last.lat, last.lng], [targetLat, targetLng]];
        const lineColor = targetName ? '#f59e0b' : '#38bdf8';
        if (!this.layers.rubberbandLine) {
            this.layers.rubberbandLine = L.polyline(lineCoords, {
                color: lineColor,
                weight: targetName ? 2.5 : 1.8,
                dashArray: '5, 5',
                opacity: 0.9
            }).addTo(AppState.leafletMap);
        } else {
            this.layers.rubberbandLine.setLatLngs(lineCoords);
            this.layers.rubberbandLine.setStyle({ color: lineColor, weight: targetName ? 2.5 : 1.8 });
        }

        // 3.2 Cập nhật Dynamic Input Tooltip chạy theo con trỏ chuột
        const snapLabel = snapSource ? ` <span style="color:#fbbf24; font-weight:800;">🧲 [${snapSource}]</span>` : '';
        const tooltipHtml = `
            <div class="cad-dynamic-tooltip">
                <b>📏 S: ${dist.toFixed(2)}m</b> • Az: ${azInfo.dDeg}°${String(azInfo.dMin).padStart(2,'0')}'${snapLabel}
            </div>
        `;
        const tipIcon = L.divIcon({
            className: '',
            html: tooltipHtml,
            iconSize: [210, 24],
            iconAnchor: [-10, -10]
        });

        if (!this.layers.dynamicInputMarker) {
            this.layers.dynamicInputMarker = L.marker([targetLat, targetLng], { icon: tipIcon, interactive: false, zIndexOffset: 3100 }).addTo(AppState.leafletMap);
        } else {
            this.layers.dynamicInputMarker.setLatLng([targetLat, targetLng]);
            this.layers.dynamicInputMarker.setIcon(tipIcon);
        }
    },

    handleMapClick(lat, lng) {
        this.scheduleToolbarCollapse(1500);
        const now = Date.now();
        if (this._lastClickTime && (now - this._lastClickTime < 120)) {
            return; // Khử nhiễu nhấp đúp hoặc sự kiện trùng lặp
        }
        this._lastClickTime = now;
        this.ensureLayers();
        if (this.mode === 'select') {
            // Khi ở chế độ chọn, nếu click vào khoảng trống trên bản đồ thì bỏ chọn
            this.deselectCurrent();
            return;
        }
        if (this.markupMode) {
            this.handleMarkupClick(lat, lng);
            return;
        }
        let candidate = null;
        if (this.snapEnabled) {
            candidate = this.findSnapCandidate(lat, lng);
        }

        if (candidate && candidate.isSnapped) {
            // Nếu vẽ đa giác và đang bấm gần đỉnh đầu tiên sau khi đã có >= 3 đỉnh -> Khép góc
            if (this.mode === 'polygon' && this.vertices.length >= 3) {
                const first = this.vertices[0];
                const map = AppState.leafletMap;
                const ptFirst = map.latLngToContainerPoint([first.lat, first.lng]);
                const ptClick = map.latLngToContainerPoint([candidate.lat, candidate.lng]);
                if (Math.hypot(ptFirst.x - ptClick.x, ptFirst.y - ptClick.y) <= 30) {
                    this.closeLoop();
                    return;
                }
            }
            const vertexName = candidate.snapType === 'edge' ? `Đ${this.vertices.length + 1}` : candidate.name;
            this.addVertex(candidate.lat, candidate.lng, vertexName, true, candidate.source, candidate.x, candidate.y, candidate.h);
            if (candidate.snapType === 'edge') {
                const lastAdded = this.vertices[this.vertices.length - 1];
                if (lastAdded) {
                    lastAdded.snappedToEdge = {
                        shape: candidate.shape,
                        edgeIdx: candidate.edgeIdx,
                        v1: candidate.v1,
                        v2: candidate.v2,
                        tMetric: candidate.tMetric
                    };
                }
            }
            triggerHaptic('success');
            showToast(`🧲 Đã bắt trùng: ${candidate.source || candidate.name}`);
        } else {
            const nextIdx = this.vertices.length + 1;
            this.addVertex(lat, lng, `Đ${nextIdx}`, false, null);
        }
    },

    addVertex(lat, lng, name, isSnapped = false, snapSource = null, explicitX = null, explicitY = null, explicitH = 0) {
        if (this.mode === 'select') return;
        let x = explicitX;
        let y = explicitY;
        if (x === null || y === null || isNaN(x) || isNaN(y)) {
            const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
            x = vn2k.X;
            y = vn2k.Y;
        }

        this.pushHistoryState(`Thêm đỉnh`);
        const v = {
            id: Date.now() + Math.random(),
            name: name || `Đ${this.vertices.length + 1}`,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            x: parseFloat(parseFloat(x).toFixed(3)),
            y: parseFloat(parseFloat(y).toFixed(3)),
            h: parseFloat(parseFloat(explicitH || 0).toFixed(3)),
            isSnapped: !!isSnapped,
            snapSource: snapSource || ''
        };

        this.vertices.push(v);
        this.renderGeometry();
        this.updateUi();
        triggerHaptic('light');
        showToast(`📍 Đã thêm đỉnh ${v.name}: X=${v.x.toFixed(2)}, Y=${v.y.toFixed(2)}`);
    },

    undoVertex() {
        if (this.vertices.length === 0) {
            showToast("⚠️ Chưa có đỉnh nào để hoàn tác!", true);
            return;
        }
        const removed = this.vertices.pop();
        this.renderGeometry();
        this.updateUi();
        showToast(`↩ Đã lùi đỉnh: ${removed.name} [U]`);
    },

    closeLoop() {
        if (this.vertices.length < 3) {
            showToast("⚠️ Cần tối thiểu 3 đỉnh để khép góc đa giác!", true);
            return;
        }
        this.setMode('polygon');
        this.renderGeometry();
        this.updateUi();
        const stats = this.calculateAreaAndPerimeter();
        showToast(`🔒 Đã khép góc đa giác ranh! S = ${stats.areaFormatted} m²`);
    },

    saveAndStartNewShape() {
        if (this.vertices.length === 0) {
            this.isActive = true;
            this.setMode('polygon');
            this.ensureLayers();
            showToast("📐 Sẵn sàng vẽ khối mới! Hãy chạm vào bản đồ để tạo các đỉnh");
            return;
        }
        if (this.vertices.length < 2) {
            showToast("⚠️ Cần tối thiểu 2 đỉnh để lưu cấu trúc trước khi tạo mới!", true);
            return;
        }
        const stats = this.calculateAreaAndPerimeter();
        const idx = this.savedShapes.length + 1;
        const isPoly = (this.mode === 'polygon' && this.vertices.length >= 3);

        // Kiểm tra tên từ input trên toolbar (#cadActiveShapeName) hoặc prompt hỏi người dùng
        const nameInput = document.getElementById('cadActiveShapeName');
        let chosenName = nameInput ? nameInput.value.trim() : '';
        const defaultSuggestion = isPoly ? `Thửa ${idx}` : `Tuyến ${idx}`;

        if (!chosenName) {
            const promptTitle = `Nhập tên/ký hiệu cho ${isPoly ? 'khối đa giác (S = ' + stats.areaFormatted + ' m²)' : 'đoạn tuyến (L = ' + stats.perimeterFormatted + ' m)'}:`;
            const inputVal = prompt(promptTitle, defaultSuggestion);
            if (inputVal === null) {
                return; // Người dùng ấn Hủy (Cancel) -> không lưu
            }
            chosenName = inputVal.trim() || defaultSuggestion;
        }

        const color = this.palette[(idx - 1) % this.palette.length];

        // Đồng bộ điểm chung trên các cạnh đã bắt điểm (Bảo toàn 100% diện tích và khớp nối ranh thửa tuyệt đối)
        if (this.savedShapes && this.savedShapes.length > 0) {
            this.vertices.forEach(v => {
                if (v.snappedToEdge && v.snappedToEdge.shape && v.snappedToEdge.shape.vertices) {
                    const targetShape = v.snappedToEdge.shape;
                    const verts = targetShape.vertices;
                    const alreadyExists = verts.some(tv => Math.hypot(tv.x - v.x, tv.y - v.y) < 0.005);
                    if (!alreadyExists) {
                        const v1Idx = verts.findIndex(tv => (v.snappedToEdge.v1 && tv.id === v.snappedToEdge.v1.id) || (Math.hypot(tv.x - v.snappedToEdge.v1.x, tv.y - v.snappedToEdge.v1.y) < 0.005));
                        if (v1Idx >= 0) {
                            const insertIdx = v1Idx + 1;
                            verts.splice(insertIdx, 0, {
                                id: Date.now() + Math.random(),
                                name: `${v.snappedToEdge.v1.name}b`,
                                lat: v.lat,
                                lng: v.lng,
                                x: v.x,
                                y: v.y,
                                h: v.h || 0,
                                isSnapped: true,
                                snapSource: `Điểm chung cạnh với ${chosenName}`
                            });
                            targetShape.stats = this.calculateAreaAndPerimeter(verts, targetShape.mode);
                        }
                    }
                }
            });
        }

        this.pushHistoryState(`Lưu khối "${chosenName}"`);
        this.savedShapes.push({
            id: 'shape_' + Date.now(),
            name: chosenName,
            shortName: chosenName,
            mode: this.mode,
            vertices: [...this.vertices],
            stats: stats,
            color: color
        });

        this.vertices = [];

        // Tự động gợi ý tên tiếp theo trên toolbar
        if (nameInput) {
            nameInput.value = isPoly ? `Thửa ${idx + 1}` : `Tuyến ${idx + 1}`;
        }

        this.renderGeometry();
        this.updateUi();
        this.renderBlocksPanel();

        // Tự động mở bảng thống kê khối nếu đang ẩn
        const panel = document.getElementById('cadBlocksStatsPanel');
        if (panel) panel.style.display = 'block';

        triggerHaptic('success');
        showToast(`✅ Đã lưu khối "${chosenName}"! Bắt đầu vẽ khối tiếp theo.`);
    },

    clearDrawing() {
        this.pushHistoryState('Xóa bản vẽ CAD');
        if (this.vertices.length === 0 && this.savedShapes.length === 0) {
            showToast("Bản vẽ hiện đang trống!");
            return;
        }
        if (this.savedShapes.length > 0 && this.vertices.length > 0) {
            const clearAll = confirm(`Xác nhận dọn bản vẽ:\n- Nhấn OK để XÓA TOÀN BỘ (cả ${this.savedShapes.length} cấu trúc đã lưu & nét vẽ đang dở)\n- Nhấn Cancel để chỉ xóa nét vẽ đang chấm dở.`);
            if (clearAll) {
                this.savedShapes = [];
                this.vertices = [];
            } else {
                this.vertices = [];
            }
        } else if (this.savedShapes.length > 0) {
            if (!confirm(`Bạn có chắc chắn muốn xóa toàn bộ ${this.savedShapes.length} cấu trúc đã vẽ trên bản đồ?`)) return;
            this.savedShapes = [];
            this.vertices = [];
        } else {
            if (!confirm("Bạn có chắc chắn muốn xóa nét vẽ hiện tại?")) return;
            this.vertices = [];
        }
        if (this.layers.group) {
            this.layers.group.clearLayers();
        }
        this.clearDynamicHelpers();
        this.renderGeometry();
        this.updateUi();
        showToast("Đã dọn dẹp bản vẽ CAD!");
    },

    // =========================================================================
    // CÁC CHỨC NĂNG CHÚ THÍCH & HÌNH KHỐI KỸ THUẬT (MARKUP & ANNOTATIONS)
    // =========================================================================
    setMarkupMode(mode) {
        if (this.markupMode === mode) {
            this.markupMode = null;
            this.mode = 'polygon';
        } else {
            this.markupMode = mode;
            this.mode = 'markup';
            if (this.selectedItem) {
                this.deselectCurrent();
            }
            this.clearDynamicHelpers();
        }
        this.markupStepData = null;
        if (this.clearMarkupPreview) {
            this.clearMarkupPreview();
        }

        const modeBtns = {
            arrow: 'btnCadMarkupArrow',
            north_arrow: 'btnCadMarkupNorth',
            rect: 'btnCadMarkupRect',
            circle: 'btnCadMarkupCircle',
            stamp: 'btnCadMarkupStamp',
            text: 'btnCadMarkupText'
        };

        Object.keys(modeBtns).forEach(k => {
            const btn = document.getElementById(modeBtns[k]);
            if (btn) {
                if (this.markupMode === k) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });

        const statusEl = document.getElementById('cadMarkupStatus');
        if (statusEl) {
            if (!this.markupMode) {
                statusEl.style.display = 'none';
                statusEl.innerText = '';
            } else {
                statusEl.style.display = 'inline-block';
                switch (this.markupMode) {
                    case 'arrow':
                        statusEl.innerText = '🏹 Click mốc ranh rồi click điểm đặt chữ ghi chú';
                        showToast('🏹 Mũi tên: Click vào mốc ranh rồi click điểm đặt chữ');
                        break;
                    case 'north_arrow':
                        statusEl.innerText = '🧭 Click 1 điểm trên bản đồ để chèn La bàn hướng Bắc';
                        showToast('🧭 Hướng Bắc: Click vị trí muốn đặt la bàn');
                        break;
                    case 'rect':
                        statusEl.innerText = '🏠 Rê chuột xem bóng mờ rồi click đặt khối nhà';
                        showToast('🏠 Khối nhà: Rê chuột xem bóng mờ rồi click đặt khối');
                        break;
                    case 'circle':
                        statusEl.innerText = '⭕ Rê chuột xem bóng mờ rồi click đặt tâm vùng đệm';
                        showToast('⭕ Bán kính: Rê chuột xem bóng mờ rồi click đặt tâm');
                        break;
                    case 'stamp':
                        statusEl.innerText = '🏷️ Rê chuột xem bóng mờ rồi click lên thửa đất để đóng tem';
                        showToast('🏷️ Tem thửa: Rê chuột xem bóng mờ rồi click đặt tem');
                        break;
                    case 'text':
                        statusEl.innerText = '🔤 Click 1 điểm trên bản đồ để chèn Chữ ghi chú';
                        showToast('🔤 Chữ: Click vị trí muốn viết chữ ghi chú');
                        break;
                }
            }
        }

        if (this.syncToolButtons) {
            this.syncToolButtons();
        }
    },

    handleMarkupClick(lat, lng) {
        if (!this.markupMode) return;

        let candidate = null;
        if (this.snapEnabled) {
            candidate = this.findSnapCandidate(lat, lng);
        }
        const clickLat = (candidate && candidate.isSnapped) ? candidate.lat : lat;
        const clickLng = (candidate && candidate.isSnapped) ? candidate.lng : lng;

        switch (this.markupMode) {
            case 'arrow': {
                if (!this.markupStepData) {
                    this.markupStepData = { startLat: clickLat, startLng: clickLng };
                    const statusEl = document.getElementById('cadMarkupStatus');
                    if (statusEl) statusEl.innerText = '🏹 Đã chọn gốc mũi tên. Giờ click điểm đặt nhãn ghi chú...';
                    showToast('🏹 Đã chọn gốc mũi tên! Click điểm đặt nhãn ghi chú...');
                } else {
                    const defText = candidate ? (candidate.name || 'Mốc ranh') : 'Mốc ranh';
                    const text = prompt('Nhập nội dung ghi chú cho mũi tên (ví dụ: Mốc M1, Ranh thửa, Bờ kênh...):', defText);
                    if (text !== null) {
                        this.pushHistoryState('Thêm mũi tên CAD');
                        const ann = {
                            id: 'ann_' + Date.now(),
                            type: 'arrow',
                            startLat: this.markupStepData.startLat,
                            startLng: this.markupStepData.startLng,
                            endLat: clickLat,
                            endLng: clickLng,
                            arrowText: text.trim() || 'Mốc ranh',
                            color: '#f59e0b',
                            fontSize: 12
                        };
                        this.annotations.push(ann);
                        this.saveAnnotations();
                        this.renderAnnotations();
                        showToast('✓ Đã thêm mũi tên chỉ dẫn: ' + ann.arrowText);
                    }
                    this.markupStepData = null;
                    this.setMarkupMode(null);
                }
                break;
            }

            case 'rect': {
                if (!this.markupStepData) {
                    this.markupStepData = { p1: { lat: clickLat, lng: clickLng } };
                    const statusEl = document.getElementById('cadMarkupStatus');
                    if (statusEl) statusEl.innerText = '🏠 Click góc đối diện (hoặc click tiếp để đặt khối 5x10m)';
                    showToast('🏠 Click góc đối diện (hoặc click tiếp để tạo khối 5x10m)');
                } else {
                    const p1 = this.markupStepData.p1;
                    const p2 = { lat: clickLat, lng: clickLng };

                    const vn1 = convertWgsToVn2k(p1.lat, p1.lng, AppState.kttVal, AppState.scaleFactor);
                    const vn2 = convertWgsToVn2k(p2.lat, p2.lng, AppState.kttVal, AppState.scaleFactor);

                    let w = Math.abs(vn2.Y - vn1.Y);
                    let l = Math.abs(vn2.X - vn1.X);

                    if (w < 2 || l < 2) {
                        w = 5.0;
                        l = 10.0;
                    }

                    w = Math.max(1, parseFloat(w.toFixed(2)));
                    l = Math.max(1, parseFloat(l.toFixed(2)));
                    const area = parseFloat((w * l).toFixed(2));

                    const cX = (vn1.X + vn2.X) / 2;
                    const cY = (vn1.Y + vn2.Y) / 2;
                    const cWgs = convertVn2kToWgs(cX, cY, AppState.kttVal, AppState.scaleFactor);

                    this.pushHistoryState('Thêm khối công trình');
                    const ann = {
                        id: 'ann_' + Date.now(),
                        type: 'rect',
                        lat: cWgs.lat,
                        lng: cWgs.lng,
                        widthM: w,
                        lengthM: l,
                        rotationDeg: 0,
                        shapeType: 'rect',
                        rectArea: area,
                        rectName: 'Khối nhà',
                        color: '#ec4899'
                    };
                    ann.corners = this.computeRectCorners(cX, cY, w, l, 0);

                    this.annotations.push(ann);
                    this.saveAnnotations();
                    this.renderAnnotations();
                    this.markupStepData = null;
                    this.setMarkupMode(null);
                    showToast(`✓ Đã tạo khối công trình: ${w}m x ${l}m (${area} m²)`);
                }
                break;
            }

            case 'circle': {
                const rStr = prompt('Nhập bán kính vùng đệm / bảo vệ (mét):', '10');
                if (rStr !== null) {
                    const r = parseFloat(rStr) || 10;
                    const name = prompt('Tên đối tượng bảo vệ (giếng khoan, trụ điện, hành lang lộ giới...):', 'Vùng bảo vệ') || 'Vùng bảo vệ';
                    this.pushHistoryState('Thêm vùng đệm bán kính');
                    const ann = {
                        id: 'ann_' + Date.now(),
                        type: 'circle',
                        lat: clickLat,
                        lng: clickLng,
                        radiusM: Math.max(0.5, r),
                        circleName: name.trim(),
                        color: '#10b981'
                    };
                    this.annotations.push(ann);
                    this.saveAnnotations();
                    this.renderAnnotations();
                    showToast('✓ Đã tạo vùng đệm R=' + ann.radiusM + 'm: "' + ann.circleName + '"');
                }
                this.setMarkupMode(null);
                break;
            }

            case 'stamp': {
                this.loadDefaultStampConfig();
                const cfg = this.defaultStampConfig || {};

                let matchedShape = this.findShapeContainingPoint(clickLat, clickLng);
                if (!matchedShape && this.savedShapes && this.savedShapes.length > 0) {
                    matchedShape = this.savedShapes[this.savedShapes.length - 1];
                }

                let defArea = cfg.area || '';
                let defParcel = cfg.parcelNo || '01';
                if (matchedShape) {
                    if (matchedShape.stats && matchedShape.stats.areaFormatted) {
                        defArea = matchedShape.stats.areaFormatted + ' m²';
                    } else if (matchedShape.stats && matchedShape.stats.area) {
                        defArea = matchedShape.stats.area.toFixed(1) + ' m²';
                    }
                    if (matchedShape.name) {
                        const numPart = matchedShape.name.replace(/[^0-9]/g, '');
                        defParcel = numPart || matchedShape.name;
                    }
                }
                if (!defArea) defArea = '150.0 m²';

                this.pushHistoryState('Đóng tem nhãn bản vẽ');
                const ann = {
                    id: 'ann_' + Date.now(),
                    type: 'stamp',
                    stampType: cfg.stampType || 'parcel',
                    lat: clickLat,
                    lng: clickLng,
                    sheetNo: cfg.sheetNo || '01',
                    parcelNo: defParcel,
                    area: defArea,
                    owner: cfg.owner || 'Chủ sử dụng đất',
                    landType: cfg.landType || 'ONT',
                    drawTitle: cfg.drawTitle || 'HIỆN TRẠNG VỊ TRÍ KHU ĐẤT',
                    drawScale: cfg.drawScale || '1:500',
                    drawAuthor: cfg.drawAuthor || 'Kỹ sư đo đạc',
                    color: cfg.color || '#38bdf8'
                };
                this.annotations.push(ann);
                this.saveAnnotations();
                this.renderAnnotations();
                this.setMarkupMode(null);
                showToast('✓ Đã đóng tem nhãn bản vẽ! Đang mở hộp thoại chỉnh sửa thông tin...');
                this.openAnnotationModal(ann.id);
                break;
            }

            case 'text': {
                const txt = prompt('Nhập nội dung chữ ghi chú:', 'Ghi chú kỹ thuật');
                if (txt !== null && txt.trim() !== '') {
                    this.pushHistoryState('Thêm chữ ghi chú');
                    const ann = {
                        id: 'ann_' + Date.now(),
                        type: 'text',
                        lat: clickLat,
                        lng: clickLng,
                        text: txt.trim(),
                        fontSize: 12,
                        color: '#f8fafc',
                        bgColor: 'rgba(15, 23, 42, 0.88)',
                        borderColor: '#38bdf8'
                    };
                    this.annotations.push(ann);
                    this.saveAnnotations();
                    this.renderAnnotations();
                    showToast('✓ Đã thêm chữ ghi chú: "' + ann.text + '"');
                }
                this.setMarkupMode(null);
                break;
            }
        }
    },

    renderAnnotations() {
        this.ensureLayers();
        if (!this.layers.annotationsGroup) return;
        this.layers.annotationsGroup.clearLayers();

        const countEl = document.getElementById('cadMarkupCount');
        if (countEl) countEl.innerText = this.annotations ? this.annotations.length : 0;

        if (this.displaySettings && this.displaySettings.showAnnotations === false || !this.showAnnotations || !this.annotations || this.annotations.length === 0) {
            return;
        }

        this.annotations.forEach(ann => {
            const isSelected = this.selectedItem && this.selectedItem.type === 'annotation' && this.selectedItem.id === ann.id;
            const annColor = isSelected ? '#facc15' : (ann.color || '#38bdf8');

            switch (ann.type) {
                case 'arrow': {
                    // Đường gióng nét liền sắc nét chuẩn CAD (Leader Line)
                    const polyline = L.polyline([
                        [ann.startLat, ann.startLng],
                        [ann.endLat, ann.endLng]
                    ], {
                        color: annColor,
                        weight: isSelected ? 3.5 : 2,
                        lineJoin: 'round',
                        lineCap: 'round',
                        interactive: true
                    });
                    polyline.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.arrowText || 'Mũi tên' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(polyline);

                    // Tính góc phương vị từ điểm đặt chữ về điểm chỉ mốc để mũi tên chỉ trúng đích
                    const dy = ann.startLat - ann.endLat;
                    const dx = (ann.startLng - ann.endLng) * Math.cos((ann.startLat + ann.endLat) * Math.PI / 360);
                    // Góc xoay hướng về phía gốc mốc ranh
                    const pointAngleDeg = Math.atan2(dx, dy) * 180 / Math.PI;

                    // Mũi tên Vector SVG chuẩn kỹ thuật CAD (góc nhọn 18° thanh thoát, viền sắc nét)
                    const arrowSvg = `<svg width="24" height="24" viewBox="-12 -12 24 24" style="transform: rotate(${pointAngleDeg}deg); overflow: visible; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8)); cursor: pointer;">
                        <path d="M0,-9 L5,5 L0,1.5 L-5,5 Z" fill="${annColor}" stroke="#0f172a" stroke-width="1.2" />
                    </svg>`;

                    const arrowIcon = L.divIcon({
                        className: 'cad-arrow-tip-marker',
                        html: arrowSvg,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    const headMarker = L.marker([ann.startLat, ann.startLng], {
                        icon: arrowIcon,
                        interactive: true,
                        zIndexOffset: 3300
                    });
                    headMarker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.arrowText || 'Mũi tên' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(headMarker);

                    // Nhãn chữ ghi chú tại đuôi mũi tên
                    const labelHtml = `<div class="cad-arrow-label-marker" style="background: rgba(15,23,42,0.94); border: 1.5px solid ${annColor}; color: #f8fafc; font-size: ${ann.fontSize || 12}px; font-weight: 700; padding: 3px 8px; border-radius: 6px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.6); cursor: move; user-select: none; display: flex; align-items: center; gap: 4px; ${isSelected ? 'box-shadow: 0 0 10px #facc15;' : ''}">
                        <span style="color: ${annColor}; font-size: 11px;">🏹</span>
                        <span>${ann.arrowText || 'Ghi chú'}</span>
                    </div>`;
                    const labelIcon = L.divIcon({
                        className: 'cad-arrow-label-icon',
                        html: labelHtml,
                        iconSize: null,
                        iconAnchor: [0, 12]
                    });
                    const textMarker = L.marker([ann.endLat, ann.endLng], {
                        icon: labelIcon,
                        draggable: true,
                        zIndexOffset: 3400
                    });

                    textMarker.on('dragstart', () => {
                        this.pushHistoryState('Dời nhãn mũi tên');
                    });
                    textMarker.on('drag', (e) => {
                        const pos = e.target.getLatLng();
                        ann.endLat = pos.lat;
                        ann.endLng = pos.lng;
                        polyline.setLatLngs([
                            [ann.startLat, ann.startLng],
                            [ann.endLat, ann.endLng]
                        ]);
                    });
                    textMarker.on('dragend', () => {
                        this.saveAnnotations();
                        this.renderAnnotations();
                    });
                    textMarker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.arrowText || 'Mũi tên' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(textMarker);
                    break;
                }

                case 'rect': {
                    if (ann.corners && ann.corners.length >= 4) {
                        const poly = L.polygon(ann.corners, {
                            color: annColor,
                            weight: isSelected ? 3.5 : 2,
                            fillColor: ann.color || '#ec4899',
                            fillOpacity: isSelected ? 0.45 : 0.25,
                            interactive: true
                        });
                        poly.on('click', (e) => {
                            L.DomEvent.stopPropagation(e);
                            if (this.mode === 'select') {
                                this.selectItem({ type: 'annotation', id: ann.id, name: ann.rectName || 'Khối nhà' });
                            } else {
                                this.openAnnotationModal(ann.id);
                            }
                        });
                        this.layers.annotationsGroup.addLayer(poly);
                    }

                    const rotInfo = ann.rotationDeg ? ` • ${ann.rotationDeg}°` : '';
                    const rectLabelHtml = `<div style="background: rgba(15,23,42,0.92); border: 1.5px solid ${annColor}; color: #fce7f3; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-align: center; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.6); cursor: move; user-select: none; ${isSelected ? 'box-shadow: 0 0 10px #facc15;' : ''}">
                        <div>🏠 ${ann.rectName || 'Khối nhà'}</div>
                        <div style="color: #f472b6; font-size: 9.5px; font-weight: 600;">${ann.widthM || 0}x${ann.lengthM || 0}m (${ann.rectArea || 0}m²)${rotInfo}</div>
                    </div>`;
                    const labelIcon = L.divIcon({
                        className: 'cad-rect-label-marker',
                        html: rectLabelHtml,
                        iconSize: null,
                        iconAnchor: [45, 18]
                    });
                    const marker = L.marker([ann.lat, ann.lng], {
                        icon: labelIcon,
                        draggable: true,
                        zIndexOffset: 3400
                    });

                    marker.on('dragstart', () => {
                        this.pushHistoryState('Dời khối nhà');
                    });
                    marker.on('dragend', (e) => {
                        const pos = e.target.getLatLng();
                        const dLat = pos.lat - ann.lat;
                        const dLng = pos.lng - ann.lng;
                        ann.lat = pos.lat;
                        ann.lng = pos.lng;
                        if (ann.corners) {
                            ann.corners = ann.corners.map(c => [c[0] + dLat, c[1] + dLng]);
                        }
                        this.saveAnnotations();
                        this.renderAnnotations();
                    });
                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.rectName || 'Khối nhà' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(marker);
                    break;
                }

                case 'stamp': {
                    let stampInner = '';
                    if (ann.stampType === 'drawing') {
                        stampInner = `
                            <div style="font-weight: 800; color: ${annColor}; border-bottom: 1px dashed rgba(255,255,255,0.25); padding-bottom: 3px; margin-bottom: 4px; font-size: 11px; text-transform: uppercase;">
                                📋 ${ann.drawTitle || 'HIỆN TRẠNG KHU ĐẤT'}
                            </div>
                            <div style="font-size: 10px; color: #cbd5e1; line-height: 1.45;">
                                <div>📐 Tỷ lệ: <b style="color: #4ade80;">${ann.drawScale || '1:500'}</b></div>
                                <div>👤 Người lập: <b style="color: #f1f5f9;">${ann.drawAuthor || '--'}</b></div>
                                <div>🏷️ Thửa/Khối: <b style="color: #fbbf24;">${ann.parcelNo || '--'} (Tờ ${ann.sheetNo || '--'})</b></div>
                            </div>
                        `;
                    } else {
                        // Mặc định hoặc tem thửa đất
                        stampInner = `
                            <div style="font-weight: 800; color: ${annColor}; border-bottom: 1px dashed rgba(255,255,255,0.25); padding-bottom: 3px; margin-bottom: 4px; display: flex; justify-content: space-between; font-size: 11px;">
                                <span>TỜ: <b style="color: #fff;">${ann.sheetNo || '01'}</b></span>
                                <span>THỬA: <b style="color: #fff;">${ann.parcelNo || '01'}</b></span>
                            </div>
                            <div style="font-size: 10px; color: #cbd5e1; line-height: 1.45;">
                                <div>📐 DT: <b style="color: #4ade80;">${ann.area || '--'}</b></div>
                                <div>👤 Chủ: <b style="color: #f1f5f9;">${ann.owner || '--'}</b></div>
                                <div>🏷️ Loại: <b style="color: #fbbf24;">${ann.landType || '--'}</b></div>
                            </div>
                        `;
                    }

                    const stampHtml = `<div style="background: rgba(15,23,42,0.95); border: 2px solid ${annColor}; border-radius: 8px; padding: 6px 10px; font-family: -apple-system, sans-serif; font-size: 11px; color: #f8fafc; box-shadow: 0 6px 18px rgba(0,0,0,0.65); min-width: 145px; cursor: move; user-select: none; text-align: left; ${isSelected ? 'box-shadow: 0 0 12px #facc15;' : ''}">
                        ${stampInner}
                    </div>`;

                    const stampIcon = L.divIcon({
                        className: 'cad-parcel-stamp-marker',
                        html: stampHtml,
                        iconSize: null,
                        iconAnchor: [72, 35]
                    });
                    const marker = L.marker([ann.lat, ann.lng], {
                        icon: stampIcon,
                        draggable: true,
                        zIndexOffset: 3400
                    });

                    marker.on('dragstart', () => {
                        this.pushHistoryState('Dời tem nhãn bản vẽ');
                    });
                    marker.on('dragend', (e) => {
                        const pos = e.target.getLatLng();
                        ann.lat = pos.lat;
                        ann.lng = pos.lng;
                        this.saveAnnotations();
                        this.renderAnnotations();
                    });
                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: 'Tem nhãn ' + (ann.parcelNo || '') });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(marker);
                    break;
                }

                case 'circle': {
                    const circ = L.circle([ann.lat, ann.lng], {
                        radius: ann.radiusM || 10,
                        color: annColor,
                        weight: isSelected ? 3.5 : 2,
                        dashArray: '5,5',
                        fillColor: ann.color || '#10b981',
                        fillOpacity: isSelected ? 0.35 : 0.15,
                        interactive: true
                    });
                    circ.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.circleName || 'Vùng đệm' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(circ);

                    const circLabelHtml = `<div style="background: rgba(15,23,42,0.9); border: 1.5px solid ${annColor}; color: #a7f3d0; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; text-align: center; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.5); cursor: move; ${isSelected ? 'box-shadow: 0 0 10px #facc15;' : ''}">
                        <div>⭕ ${ann.circleName || 'Vùng bảo vệ'}</div>
                        <div style="color: #6ee7b7; font-size: 9px;">R = ${ann.radiusM}m</div>
                    </div>`;
                    const labelIcon = L.divIcon({
                        className: 'cad-circle-label-marker',
                        html: circLabelHtml,
                        iconSize: null,
                        iconAnchor: [38, 14]
                    });
                    const marker = L.marker([ann.lat, ann.lng], {
                        icon: labelIcon,
                        draggable: true,
                        zIndexOffset: 3400
                    });

                    marker.on('dragstart', () => {
                        this.pushHistoryState('Dời vùng đệm');
                    });
                    marker.on('dragend', (e) => {
                        const pos = e.target.getLatLng();
                        ann.lat = pos.lat;
                        ann.lng = pos.lng;
                        this.saveAnnotations();
                        this.renderAnnotations();
                    });
                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.circleName || 'Vùng đệm' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(marker);
                    break;
                }

                case 'text': {
                    const textHtml = `<div style="background: ${ann.bgColor || 'rgba(15, 23, 42, 0.9)'}; border: 1.5px solid ${annColor}; border-radius: 6px; padding: 3px 8px; color: ${ann.color || '#f8fafc'}; font-size: ${ann.fontSize || 12}px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.5); cursor: move; user-select: none; ${isSelected ? 'box-shadow: 0 0 10px #facc15;' : ''}">
                        ${ann.text || 'Ghi chú'}
                    </div>`;
                    const textIcon = L.divIcon({
                        className: 'cad-text-note-marker',
                        html: textHtml,
                        iconSize: null,
                        iconAnchor: [10, 10]
                    });
                    const marker = L.marker([ann.lat, ann.lng], {
                        icon: textIcon,
                        draggable: true,
                        zIndexOffset: 3400
                    });

                    marker.on('dragstart', () => {
                        this.pushHistoryState('Dời chữ ghi chú');
                    });
                    marker.on('dragend', (e) => {
                        const pos = e.target.getLatLng();
                        ann.lat = pos.lat;
                        ann.lng = pos.lng;
                        this.saveAnnotations();
                        this.renderAnnotations();
                    });
                    marker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        if (this.mode === 'select') {
                            this.selectItem({ type: 'annotation', id: ann.id, name: ann.text || 'Chữ' });
                        } else {
                            this.openAnnotationModal(ann.id);
                        }
                    });
                    this.layers.annotationsGroup.addLayer(marker);
                    break;
                }
            }
        });
    },

    saveAnnotations() {
        try {
            const proj = AppState.currentProject || 'default';
            const key = 'vn2k_cad_annotations_' + proj;
            localStorage.setItem(key, JSON.stringify(this.annotations || []));
        } catch (e) {
            console.warn("Lỗi lưu annotations:", e);
        }
    },

    loadAnnotations() {
        try {
            const proj = AppState.currentProject || 'default';
            const key = 'vn2k_cad_annotations_' + proj;
            const raw = localStorage.getItem(key);
            if (raw) {
                this.annotations = JSON.parse(raw) || [];
            } else {
                this.annotations = [];
            }
        } catch (e) {
            console.warn("Lỗi đọc annotations:", e);
            this.annotations = [];
        }
        this.renderAnnotations();
    },

    openAnnotationModal(annId) {
        const ann = (this.annotations || []).find(a => a.id === annId);
        if (!ann) return;

        const modal = document.getElementById('modalCadEditAnnotation');
        if (!modal) return;

        document.getElementById('txtCadEditAnnId').value = ann.id;
        document.getElementById('txtCadEditAnnType').value = ann.type;
        document.getElementById('lblCadEditAnnColorHex').innerText = ann.color || '#f59e0b';
        document.getElementById('txtCadEditAnnColor').value = ann.color || '#f59e0b';

        const btnDel = document.getElementById('btnCadEditAnnDelete');
        if (btnDel) btnDel.style.display = 'inline-block';

        const grpText = document.getElementById('grpCadEditAnnText');
        const grpStamp = document.getElementById('grpCadEditAnnStamp');
        const grpRect = document.getElementById('grpCadEditAnnRect');
        const grpCircle = document.getElementById('grpCadEditAnnCircle');
        const grpFont = document.getElementById('grpCadEditAnnFontSize');

        if (grpText) grpText.style.display = 'none';
        if (grpStamp) grpStamp.style.display = 'none';
        if (grpRect) grpRect.style.display = 'none';
        if (grpCircle) grpCircle.style.display = 'none';
        if (grpFont) grpFont.style.display = 'none';

        const titleEl = document.getElementById('lblCadEditAnnTitle');

        switch (ann.type) {
            case 'arrow':
                if (titleEl) titleEl.innerText = '🏹 Sửa Mũi Tên Chỉ Dẫn CAD';
                if (grpText) grpText.style.display = 'block';
                if (grpFont) grpFont.style.display = 'block';
                document.getElementById('txtCadEditAnnText').value = ann.arrowText || '';
                document.getElementById('txtCadEditAnnFontSize').value = ann.fontSize || 12;
                break;

            case 'text':
                if (titleEl) titleEl.innerText = '🔤 Sửa Chữ Ghi Chú';
                if (grpText) grpText.style.display = 'block';
                if (grpFont) grpFont.style.display = 'block';
                document.getElementById('txtCadEditAnnText').value = ann.text || '';
                document.getElementById('txtCadEditAnnFontSize').value = ann.fontSize || 12;
                break;

            case 'stamp':
                if (titleEl) titleEl.innerText = '🏷️ Sửa Tem / Nhãn Bản Vẽ';
                if (grpStamp) grpStamp.style.display = 'flex';
                const sTypeEl = document.getElementById('selCadEditAnnStampType');
                if (sTypeEl) sTypeEl.value = ann.stampType || 'parcel';
                this.onStampTypeChange(ann.stampType || 'parcel');

                document.getElementById('txtCadEditAnnSheet').value = ann.sheetNo || '';
                document.getElementById('txtCadEditAnnParcel').value = ann.parcelNo || '';
                document.getElementById('txtCadEditAnnArea').value = ann.area || '';
                document.getElementById('txtCadEditAnnLandType').value = ann.landType || '';
                document.getElementById('txtCadEditAnnOwner').value = ann.owner || '';

                if (document.getElementById('txtCadEditAnnDrawTitle')) {
                    document.getElementById('txtCadEditAnnDrawTitle').value = ann.drawTitle || 'HIỆN TRẠNG KHU ĐẤT';
                }
                if (document.getElementById('txtCadEditAnnDrawScale')) {
                    document.getElementById('txtCadEditAnnDrawScale').value = ann.drawScale || '1:500';
                }
                if (document.getElementById('txtCadEditAnnDrawAuthor')) {
                    document.getElementById('txtCadEditAnnDrawAuthor').value = ann.drawAuthor || 'Kỹ sư trắc địa';
                }
                break;

            case 'rect':
                if (titleEl) titleEl.innerText = '🏠 Sửa Khối Công Trình / Nhà Ở';
                if (grpRect) grpRect.style.display = 'flex';
                document.getElementById('txtCadEditAnnRectName').value = ann.rectName || '';
                document.getElementById('txtCadEditAnnWidth').value = ann.widthM || 5;
                document.getElementById('txtCadEditAnnLength').value = ann.lengthM || 10;
                if (document.getElementById('txtCadEditAnnRotation')) {
                    document.getElementById('txtCadEditAnnRotation').value = ann.rotationDeg || 0;
                }
                if (document.getElementById('selCadEditAnnRectShape')) {
                    document.getElementById('selCadEditAnnRectShape').value = ann.shapeType || 'rect';
                }
                break;

            case 'circle':
                if (titleEl) titleEl.innerText = '⭕ Sửa Vùng Đệm / Bán Kính';
                if (grpCircle) grpCircle.style.display = 'flex';
                document.getElementById('txtCadEditAnnCircleName').value = ann.circleName || '';
                document.getElementById('txtCadEditAnnRadius').value = ann.radiusM || 10;
                break;
        }

        modal.classList.add('show');
    },

    closeAnnotationModal() {
        const modal = document.getElementById('modalCadEditAnnotation');
        if (modal) modal.classList.remove('show');
    },

    saveAnnotationEdit() {
        const id = document.getElementById('txtCadEditAnnId').value;
        if (id === '__DEFAULT_STAMP__') {
            this.loadDefaultStampConfig();
            const sType = document.getElementById('selCadEditAnnStampType')?.value || 'parcel';
            const sheet = document.getElementById('txtCadEditAnnSheet')?.value.trim() || '01';
            const parcel = document.getElementById('txtCadEditAnnParcel')?.value.trim() || '01';
            const area = document.getElementById('txtCadEditAnnArea')?.value.trim() || '';
            const landType = document.getElementById('txtCadEditAnnLandType')?.value.trim() || 'ONT';
            const owner = document.getElementById('txtCadEditAnnOwner')?.value.trim() || '';
            const drawTitle = document.getElementById('txtCadEditAnnDrawTitle')?.value.trim() || 'HIỆN TRẠNG VỊ TRÍ KHU ĐẤT';
            const drawScale = document.getElementById('txtCadEditAnnDrawScale')?.value.trim() || '1:500';
            const drawAuthor = document.getElementById('txtCadEditAnnDrawAuthor')?.value.trim() || 'Kỹ sư đo đạc';
            const color = document.getElementById('txtCadEditAnnColor')?.value || '#38bdf8';

            this.defaultStampConfig = {
                stampType: sType,
                sheetNo: sheet,
                parcelNo: parcel,
                area: area,
                landType: landType,
                owner: owner,
                drawTitle: drawTitle,
                drawScale: drawScale,
                drawAuthor: drawAuthor,
                color: color
            };
            try {
                localStorage.setItem('vn2k_cad_default_stamp_config', JSON.stringify(this.defaultStampConfig));
            } catch (e) {}

            this.closeAnnotationModal();
            showToast('✓ Đã lưu cài đặt mẫu Tem / Nhãn bản vẽ mặc định!');
            return;
        }

        const ann = (this.annotations || []).find(a => a.id === id);
        if (!ann) return;

        this.pushHistoryState('Chỉnh sửa chú thích');
        ann.color = document.getElementById('txtCadEditAnnColor').value;

        switch (ann.type) {
            case 'arrow':
                ann.arrowText = document.getElementById('txtCadEditAnnText').value.trim() || 'Ghi chú';
                ann.fontSize = parseInt(document.getElementById('txtCadEditAnnFontSize').value, 10) || 12;
                break;

            case 'text':
                ann.text = document.getElementById('txtCadEditAnnText').value.trim() || 'Ghi chú';
                ann.fontSize = parseInt(document.getElementById('txtCadEditAnnFontSize').value, 10) || 12;
                break;

            case 'stamp':
                ann.stampType = document.getElementById('selCadEditAnnStampType')?.value || 'parcel';
                ann.sheetNo = document.getElementById('txtCadEditAnnSheet').value.trim();
                ann.parcelNo = document.getElementById('txtCadEditAnnParcel').value.trim();
                ann.area = document.getElementById('txtCadEditAnnArea').value.trim();
                ann.landType = document.getElementById('txtCadEditAnnLandType').value.trim();
                ann.owner = document.getElementById('txtCadEditAnnOwner').value.trim();
                if (document.getElementById('txtCadEditAnnDrawTitle')) {
                    ann.drawTitle = document.getElementById('txtCadEditAnnDrawTitle').value.trim();
                }
                if (document.getElementById('txtCadEditAnnDrawScale')) {
                    ann.drawScale = document.getElementById('txtCadEditAnnDrawScale').value.trim();
                }
                if (document.getElementById('txtCadEditAnnDrawAuthor')) {
                    ann.drawAuthor = document.getElementById('txtCadEditAnnDrawAuthor').value.trim();
                }
                break;

            case 'rect': {
                ann.rectName = document.getElementById('txtCadEditAnnRectName').value.trim() || 'Khối nhà';
                const w = parseFloat(document.getElementById('txtCadEditAnnWidth').value) || 5;
                const l = parseFloat(document.getElementById('txtCadEditAnnLength').value) || 10;
                const rot = parseFloat(document.getElementById('txtCadEditAnnRotation')?.value) || 0;
                ann.widthM = w;
                ann.lengthM = l;
                ann.rotationDeg = rot;
                ann.rectArea = parseFloat((w * l).toFixed(2));
                ann.shapeType = document.getElementById('selCadEditAnnRectShape')?.value || 'rect';

                const vnCenter = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                ann.corners = this.computeRectCorners(vnCenter.X, vnCenter.Y, w, l, rot);
                break;
            }

            case 'circle':
                ann.circleName = document.getElementById('txtCadEditAnnCircleName').value.trim() || 'Vùng bảo vệ';
                ann.radiusM = parseFloat(document.getElementById('txtCadEditAnnRadius').value) || 10;
                break;
        }

        this.saveAnnotations();
        this.renderAnnotations();
        this.closeAnnotationModal();
        showToast('✓ Đã cập nhật chú thích thành công!');
    },

    deleteCurrentEditAnnotation() {
        const id = document.getElementById('txtCadEditAnnId').value;
        if (!id) return;
        this.deleteAnnotation(id);
        this.closeAnnotationModal();
    },

    deleteAnnotation(id) {
        this.pushHistoryState('Xóa chú thích');
        const idx = (this.annotations || []).findIndex(a => a.id === id);
        if (idx !== -1) {
            this.annotations.splice(idx, 1);
            this.saveAnnotations();
            this.renderAnnotations();
            showToast('✓ Đã xóa chú thích');
        }
    },

    clearAnnotations() {
        if (!this.annotations || this.annotations.length === 0) {
            showToast('⚠️ Không có chú thích hoặc hình khối nào để xóa!');
            return;
        }
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ ' + this.annotations.length + ' chú thích & hình khối trên bản vẽ?')) {
            this.pushHistoryState('Xóa toàn bộ chú thích');
            this.annotations = [];
            this.saveAnnotations();
            this.renderAnnotations();
            showToast('✓ Đã xóa toàn bộ chú thích');
        }
    },

    toggleAnnotationsVisible() {
        if (!this.displaySettings) this.initDisplaySettings();
        this.toggleDisplayOption('showAnnotations', !this.displaySettings.showAnnotations);
    },

    calculateAreaAndPerimeter(customPts = null, customMode = null, forceSyncVn2k = false) {
        const rawPts = customPts || this.vertices;
        const mode = customMode || this.mode;
        if (!rawPts || rawPts.length < 2) {
            return {
                area: 0,
                areaFormatted: '0.00',
                ha: 0,
                haFormatted: '0.0000',
                perimeter: 0,
                perimeterFormatted: '0.00',
                edges: []
            };
        }

        // Chuẩn hóa 100% tọa độ các đỉnh trước khi tính toán để chống sai số khoảng cách
        const pts = rawPts.map((p, idx) => {
            const norm = this._normalizeVertex(p, idx, forceSyncVn2k);
            if (norm) {
                p.x = norm.x;
                p.y = norm.y;
                p.lat = norm.lat;
                p.lng = norm.lng;
            }
            return norm || p;
        });

        const n = pts.length;
        let sumArea = 0;
        let perimeter = 0;
        const edges = [];
        const isClosed = (mode === 'polygon' && n >= 3);
        const segmentCount = isClosed ? n : n - 1;

        for (let i = 0; i < segmentCount; i++) {
            const cur = pts[i];
            const next = pts[(i + 1) % n];

            let dx = next.x - cur.x;
            let dy = next.y - cur.y;
            let length = Math.hypot(dx, dy);

            // Kiểm tra phát hiện bất đồng bộ hệ quy chiếu hoặc lệch trục giữa 2 đỉnh liên tiếp
            if (isFinite(cur.lat) && isFinite(cur.lng) && isFinite(next.lat) && isFinite(next.lng)) {
                let geoDist = 0;
                if (AppState.leafletMap) {
                    geoDist = AppState.leafletMap.distance([cur.lat, cur.lng], [next.lat, next.lng]);
                } else if (typeof calcGeoDistanceAndAzimuth === 'function') {
                    geoDist = calcGeoDistanceAndAzimuth(cur.lat, cur.lng, next.lat, next.lng).distance;
                }
                // Nếu khoảng cách phẳng Gauss lệch quá xa so với thực địa trên bản đồ (> 20m và lệch > 30%), tự động đồng bộ lại từ WGS84
                if (geoDist > 0 && Math.abs(length - geoDist) > Math.max(20, geoDist * 0.3)) {
                    try {
                        const curVn = convertWgsToVn2k(cur.lat, cur.lng, AppState.kttVal, AppState.scaleFactor);
                        const nextVn = convertWgsToVn2k(next.lat, next.lng, AppState.kttVal, AppState.scaleFactor);
                        cur.x = parseFloat(parseFloat(curVn.X).toFixed(3));
                        cur.y = parseFloat(parseFloat(curVn.Y).toFixed(3));
                        next.x = parseFloat(parseFloat(nextVn.X).toFixed(3));
                        next.y = parseFloat(parseFloat(nextVn.Y).toFixed(3));
                        dx = next.x - cur.x;
                        dy = next.y - cur.y;
                        length = Math.hypot(dx, dy);
                    } catch (e) {}
                }
            }

            // Fallback bảo vệ an toàn: nếu length không hợp lệ hoặc = 0 trong khi lat/lng khác nhau
            if (!isFinite(length) || (length === 0 && (cur.lat !== next.lat || cur.lng !== next.lng))) {
                if (isFinite(cur.lat) && isFinite(cur.lng) && isFinite(next.lat) && isFinite(next.lng)) {
                    if (AppState.leafletMap) {
                        length = AppState.leafletMap.distance([cur.lat, cur.lng], [next.lat, next.lng]);
                    } else if (typeof calcGeoDistanceAndAzimuth === 'function') {
                        length = calcGeoDistanceAndAzimuth(cur.lat, cur.lng, next.lat, next.lng).distance;
                    }
                }
            }

            if (isClosed) {
                // Công thức giải tích Gauss Shoelace
                sumArea += (cur.x * next.y - next.x * cur.y);
            }

            perimeter += length;

            // Tính phương vị trắc địa VN2000 (Azimuth từ trục X Bắc theo chiều kim đồng hồ)
            let azDeg = Math.atan2(dy, dx) * (180.0 / Math.PI);
            if (azDeg < 0) azDeg += 360.0;
            const dDeg = Math.floor(azDeg);
            const dMin = Math.floor((azDeg - dDeg) * 60);
            const dSec = Math.round(((azDeg - dDeg) * 60 - dMin) * 60);

            edges.push({
                from: cur.name,
                to: next.name,
                length,
                lengthFormatted: length.toFixed(2),
                azimuth: azDeg,
                azFormatted: `${dDeg}°${String(dMin).padStart(2, '0')}'${String(dSec).padStart(2, '0')}"`,
                dx,
                dy
            });
        }

        const area = isClosed ? Math.abs(sumArea) / 2.0 : 0;
        const ha = area / 10000.0;

        return {
            area,
            areaFormatted: Number(area.toFixed(2)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            ha,
            haFormatted: Number(ha.toFixed(4)).toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
            perimeter,
            perimeterFormatted: Number(perimeter.toFixed(2)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            edges
        };
    },

    // === LƯU / KHÔI PHỤC PHIÊN VẼ THEO TỪNG DỰ ÁN (Tối ưu hóa theo MiniCAD & chống mất khối khi F5) ===
    SESSION_KEY: 'vn2k_cad_session_v2',

    getProjectStorageKey(projName) {
        if (!projName) return '';
        return String(projName).replace(/(\.(csv|xlsx|xls|txt))+$/i, "").trim();
    },

    saveShapesForProject(projName) {
        const curProj = projName || AppState.currentProject;
        if (!curProj) return;
        try {
            const cleanKey = this.getProjectStorageKey(curProj);
            const data = { savedShapes: this.savedShapes || [], mode: this.mode, updated: Date.now() };
            const json = JSON.stringify(data, (k, val) => (k === 'snappedToEdge' || k === '_pinned') ? undefined : val);
            
            // Lưu theo khóa chuẩn hóa (không extension) và khóa gốc
            localStorage.setItem('vn2k_cad_shapes_' + cleanKey, json);
            if (curProj !== cleanKey) {
                localStorage.setItem('vn2k_cad_shapes_' + curProj, json);
            }

            // Tự động đồng bộ các đỉnh thành danh sách mốc Sổ Đo Dự Án mang đầy đủ thuộc tính Khối/Thửa
            this.syncShapesToProjectPoints(curProj);
        } catch (e) {
            console.warn('CAD save project shapes failed:', e);
        }
    },

    syncShapesToProjectPoints(projName) {
        const curProj = projName || AppState.currentProject;
        if (!curProj || !this.savedShapes || this.savedShapes.length === 0) return;

        try {
            const allPoints = [];
            const now = new Date().toLocaleString('vi-VN');

            this.savedShapes.forEach((shape, sIdx) => {
                const isPoly = (shape.mode === 'polygon');
                const sName = shape.name || `Khối ${sIdx + 1}`;
                const sColor = shape.color || '#10b981';

                (shape.vertices || []).forEach((v, vIdx) => {
                    allPoints.push({
                        time: v.time || now,
                        name: v.name || (`Đ${vIdx + 1}`),
                        x: parseFloat(parseFloat(v.x || 0).toFixed(3)),
                        y: parseFloat(parseFloat(v.y || 0).toFixed(3)),
                        lat: parseFloat(parseFloat(v.lat || 0).toFixed(7)),
                        lng: parseFloat(parseFloat(v.lng || 0).toFixed(7)),
                        h: parseFloat(parseFloat(v.h || 0).toFixed(3)),
                        mui: AppState.muiVal || 3,
                        ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2, '0')}'`,
                        note: v.snapSource || (v.isSnapped ? 'Hít mốc' : (isPoly ? `Đỉnh ranh ${sName}` : `Đỉnh tuyến ${sName}`)),
                        project: curProj,
                        shapeId: shape.id,
                        shapeName: sName,
                        shapeMode: shape.mode || 'polygon',
                        shapeColor: sColor,
                        shapeOrder: vIdx + 1
                    });
                });
            });

            if (allPoints.length > 0 && typeof appData !== 'undefined' && appData.savePoints) {
                appData.savePoints(curProj, allPoints);
            }
        } catch (e) {
            console.warn('CAD sync shapes to points failed:', e);
        }
    },

    reconstructShapesFromPoints(projName) {
        const curProj = projName || AppState.currentProject;
        if (!curProj || typeof appData === 'undefined' || !appData.getPoints) return false;
        const pts = appData.getPoints(curProj);
        if (!pts || pts.length === 0) return false;

        // Phân loại mốc theo Khối/Thửa Đất
        const shapeMap = new Map();
        let hasShapeTag = false;

        pts.forEach((p, idx) => {
            const sName = p.shapeName || p.blockName;
            if (sName) {
                hasShapeTag = true;
                if (!shapeMap.has(sName)) {
                    shapeMap.set(sName, {
                        name: sName,
                        mode: p.shapeMode || 'polygon',
                        color: p.shapeColor || null,
                        vertices: []
                    });
                }
                shapeMap.get(sName).vertices.push(p);
            }
        });

        if (hasShapeTag && shapeMap.size > 0) {
            const colorPalette = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16'];
            const reconstructed = [];
            let cIdx = 0;

            shapeMap.forEach((sObj, sName) => {
                const validVerts = sObj.vertices.map((v, i) => {
                    const norm = this._normalizeVertex(v, i);
                    return {
                        ...norm,
                        isSnapped: true,
                        snapSource: `Dự án: ${curProj}`,
                        shapeName: sName,
                        shapeMode: sObj.mode,
                        shapeOrder: i + 1
                    };
                }).filter(v => v && isFinite(v.lat) && isFinite(v.lng));

                if (validVerts.length >= 2) {
                    const sColor = sObj.color || colorPalette[cIdx % colorPalette.length];
                    cIdx++;
                    const sMode = (validVerts.length < 3 && sObj.mode === 'polygon') ? 'polyline' : sObj.mode;
                    reconstructed.push({
                        id: 'recon_shape_' + Date.now() + '_' + cIdx,
                        name: sName,
                        shortName: sName,
                        mode: sMode,
                        color: sColor,
                        vertices: validVerts,
                        selected: true,
                        stats: this.calculateAreaAndPerimeter(validVerts, sMode)
                    });
                }
            });

            if (reconstructed.length > 0) {
                this.savedShapes = reconstructed;
                // Lưu lại ngay vào CAD storage
                const cleanKey = this.getProjectStorageKey(curProj);
                const data = { savedShapes: this.savedShapes, mode: this.mode, updated: Date.now() };
                const json = JSON.stringify(data, (k, val) => (k === 'snappedToEdge' || k === '_pinned') ? undefined : val);
                localStorage.setItem('vn2k_cad_shapes_' + cleanKey, json);
                if (curProj !== cleanKey) localStorage.setItem('vn2k_cad_shapes_' + curProj, json);
                return true;
            }
        }
        return false;
    },

    loadShapesForProject(projName) {
        const curProj = projName || AppState.currentProject;
        if (!curProj) return false;
        try {
            const cleanKey = this.getProjectStorageKey(curProj);
            let raw = localStorage.getItem('vn2k_cad_shapes_' + cleanKey);
            if (!raw && curProj !== cleanKey) {
                raw = localStorage.getItem('vn2k_cad_shapes_' + curProj);
            }

            if (raw) {
                const data = JSON.parse(raw);
                if (data && data.savedShapes && data.savedShapes.length > 0) {
                    this.savedShapes = data.savedShapes.map(s => {
                        const vertices = (s.vertices || []).map((v, i) => this._normalizeVertex(v, i)).filter(v => v && isFinite(v.lat) && isFinite(v.lng));
                        const stats = s.customArea && s.stats ? s.stats : this.calculateAreaAndPerimeter(vertices, s.mode);
                        return { ...s, vertices, stats };
                    }).filter(s => s.vertices.length > 0);
                    if (data.mode) this.mode = data.mode;
                    return this.savedShapes.length > 0;
                }
            }

            // Nếu chưa có file CAD riêng, thử tái tạo từ các mốc dự án có chứa thông tin khối
            return this.reconstructShapesFromPoints(curProj);
        } catch (e) {
            console.warn('CAD load project shapes failed:', e);
        }
        return false;
    },

    hasShapesForProject(projName) {
        const curProj = projName || AppState.currentProject;
        if (!curProj) return false;
        const cleanKey = this.getProjectStorageKey(curProj);
        if (localStorage.getItem('vn2k_cad_shapes_' + cleanKey)) return true;
        if (curProj !== cleanKey && localStorage.getItem('vn2k_cad_shapes_' + curProj)) return true;
        
        // Kiểm tra xem mốc của dự án có chứa shapeName không
        if (typeof appData !== 'undefined' && appData.getPoints) {
            const pts = appData.getPoints(curProj);
            if (pts && pts.some(p => p.shapeName || p.blockName)) return true;
        }
        return false;
    },

    persistSession() {
        clearTimeout(this._persistTimer);
        this._persistTimer = setTimeout(() => {
            try {
                const data = { savedShapes: this.savedShapes || [], vertices: this.vertices || [], mode: this.mode };
                const json = JSON.stringify(data, (k, val) => (k === 'snappedToEdge' || k === '_pinned') ? undefined : val);
                localStorage.setItem(this.SESSION_KEY, json);
                this.saveShapesForProject(AppState.currentProject);
                localStorage.setItem('vn2k_cad_active', this.isActive ? '1' : '0');
            } catch (e) {
                console.warn('CAD persist failed:', e);
            }
        }, 150);
    },

    restoreSession() {
        try {
            const curProj = AppState.currentProject || localStorage.getItem('vn2k_cur_project');
            let loaded = false;
            if (curProj) {
                loaded = this.loadShapesForProject(curProj);
            }
            if (!loaded) {
                const raw = localStorage.getItem(this.SESSION_KEY);
                if (raw) {
                    const data = JSON.parse(raw);
                    this.savedShapes = (data.savedShapes || []).map(s => {
                        const vertices = (s.vertices || []).map((v, i) => this._normalizeVertex(v, i)).filter(v => v && isFinite(v.lat) && isFinite(v.lng));
                        const stats = s.customArea && s.stats ? s.stats : this.calculateAreaAndPerimeter(vertices, s.mode);
                        return { ...s, vertices, stats };
                    }).filter(s => s.vertices.length > 0);
                    this.vertices = (data.vertices || []).map((v, i) => this._normalizeVertex(v, i)).filter(v => v && isFinite(v.lat) && isFinite(v.lng));
                    if (data.mode) this.mode = data.mode;
                }
            }
            const wasActive = localStorage.getItem('vn2k_cad_active') === '1';
            if (wasActive && typeof appNav !== 'undefined') {
                setTimeout(() => {
                    if (AppState.currentScreen === 'map' && !this.isActive) {
                        this.openToolbar();
                    }
                }, 300);
            }
        } catch (e) {
            console.warn('CAD restore failed:', e);
        }
    },

    // Dự án có phải là tập đỉnh của các khối CAD đã vẽ/nhập không?
    isProjectCoveredByShapes(pts) {
        const shapes = this.savedShapes || [];
        if (!pts || pts.length < 3 || shapes.length === 0) return false;
        const keys = new Set();
        const keyXY = (x, y) => Math.round(parseFloat(x) * 100) + '_' + Math.round(parseFloat(y) * 100);
        const keyLL = (a, b) => Math.round(parseFloat(a) * 1e6) + '_' + Math.round(parseFloat(b) * 1e6);
        shapes.forEach(s => (s.vertices || []).forEach(v => {
            if (isFinite(v.x) && isFinite(v.y)) keys.add('xy' + keyXY(v.x, v.y));
            keys.add('ll' + keyLL(v.lat, v.lng));
        }));
        let matched = 0;
        pts.forEach(p => {
            if ((isFinite(parseFloat(p.x)) && keys.has('xy' + keyXY(p.x, p.y))) || keys.has('ll' + keyLL(p.lat, p.lng))) matched++;
        });
        return matched / pts.length >= 0.8;
    },

    // === THANH CÔNG CỤ TỰ THU GỌN THÔNG MINH ===
    toolbarIdleMs: 3500,

    initToolbarAutoCollapse() {
        const bar = document.getElementById('mapCadToolbar');
        if (!bar || bar._autoCollapseInit) return;
        bar._autoCollapseInit = true;
        this._toolbarHover = false;

        const expand = () => {
            this._toolbarHover = true;
            this.setToolbarCollapsed(false);
        };
        const leave = () => {
            this._toolbarHover = false;
            this.scheduleToolbarCollapse(this.toolbarIdleMs);
        };

        bar.addEventListener('mouseenter', expand);
        bar.addEventListener('mouseleave', leave);
        bar.addEventListener('focusin', expand);
        bar.addEventListener('focusout', leave);
        bar.addEventListener('touchstart', () => {
            clearTimeout(this._toolbarTimer);
            if (bar.classList.contains('collapsed')) this.setToolbarCollapsed(false);
            this.scheduleToolbarCollapse(this.toolbarIdleMs * 2);
        }, { passive: true });

        // Tự động thu nhỏ thông minh ngay khi người dùng thao tác bấm hoặc di chuyển bản đồ
        if (AppState.leafletMap && !AppState.leafletMap._cadCollapseBound) {
            AppState.leafletMap._cadCollapseBound = true;
            AppState.leafletMap.on('click', () => {
                if (!this.isActive) return;
                this._toolbarHover = false;
                this.setToolbarCollapsed(true);
            });
            AppState.leafletMap.on('movestart', () => {
                if (!this.isActive) return;
                this._toolbarHover = false;
                this.scheduleToolbarCollapse(800);
            });
            AppState.leafletMap.on('zoomstart', () => {
                if (!this.isActive) return;
                this._toolbarHover = false;
                this.scheduleToolbarCollapse(800);
            });
        }

        // Tự động thu nhỏ khi chạm ra ngoài thanh công cụ trên điện thoại/máy tính bảng
        document.addEventListener('touchstart', (e) => {
            if (!this.isActive) return;
            const toggleBtn = document.getElementById('btnToggleCadTool');
            if (bar && !bar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
                this._toolbarHover = false;
                this.scheduleToolbarCollapse(800);
            }
        }, { passive: true });
    },

    setToolbarCollapsed(collapsed) {
        const bar = document.getElementById('mapCadToolbar');
        if (!bar) return;
        clearTimeout(this._toolbarTimer);
        bar.classList.toggle('collapsed', !!collapsed);
        const btn = document.getElementById('btnCadToolbarCollapse');
        if (btn) btn.innerText = collapsed ? '▸ Mở rộng' : '▾ Thu gọn';
    },

    scheduleToolbarCollapse(delay) {
        clearTimeout(this._toolbarTimer);
        if (!this.isActive) return;
        this._toolbarTimer = setTimeout(() => {
            const active = document.activeElement;
            const bar = document.getElementById('mapCadToolbar');
            const typing = bar && active && bar.contains(active) && /INPUT|SELECT|TEXTAREA/.test(active.tagName);
            if (this._toolbarHover || typing) return;
            this.setToolbarCollapsed(true);
        }, delay || this.toolbarIdleMs);
    },

    toggleToolbarCollapse() {
        const bar = document.getElementById('mapCadToolbar');
        if (!bar) return;
        const willCollapse = !bar.classList.contains('collapsed');
        this.setToolbarCollapsed(willCollapse);
        if (!willCollapse) this.scheduleToolbarCollapse(this.toolbarIdleMs * 2);
    },

    renderGeometry() {
        this.persistSession();
        this.ensureLayers();
        if (!this.layers.group) return;
        this.layers.group.clearLayers();
        this.layers.shape = null;
        this.layers.centerMarker = null;

        if (!this.displaySettings) this.initDisplaySettings();
        const showBoundaries = this.displaySettings.showBoundaries !== false;
        const showVertices = this.displaySettings.showVertices === true;
        const showDistances = this.displaySettings.showDistances === true;
        const showCenterLabels = this.displaySettings.showCenterLabels !== false;

        // 0. Vẽ tất cả các cấu trúc / thửa đã lưu trước đó (có check có hiển thị, bỏ check thì ẩn)
        this.savedShapes.forEach((shape, sIdx) => {
            if (shape.selected === false) return;
            const sVerts = shape.vertices;
            const sLen = sVerts.length;
            if (sLen === 0) return;
            // Luôn đảm bảo shape.stats đồng bộ mới nhất 100% với các đỉnh thực tế
            shape.stats = this.calculateAreaAndPerimeter(shape.vertices, shape.mode, true);
            const sLatLngs = sVerts.map(v => [v.lat, v.lng]);
            const sColor = shape.color || '#10b981';

            let sShapeLayer = null;
            let sCenterMarker = null;

            const edgeMarkers = [];
            const vertexMarkers = [];
            const hitLines = [];

            if (showBoundaries && shape.mode === 'polygon' && sLen >= 3) {
                sShapeLayer = L.polygon(sLatLngs, {
                    color: sColor,
                    weight: 2.5,
                    fillColor: sColor,
                    fillOpacity: 0.18,
                    lineJoin: 'round',
                    interactive: true
                }).addTo(this.layers.group);

                // Khi rê chuột hoặc click vào polygon: hiện/ẩn cự ly các cạnh và hiện chấm góc đỉnh
                sShapeLayer.on('mouseover', () => {
                    edgeMarkers.forEach(em => em.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible'));
                    vertexMarkers.forEach(vm => vm.getElement()?.querySelector('.cad-vertex-badge')?.classList.add('dot-visible'));
                });
                sShapeLayer.on('mouseout', () => {
                    if (!shape._pinned) {
                        edgeMarkers.forEach(em => {
                            if (!em._pinned) em.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
                        });
                        vertexMarkers.forEach(vm => {
                            if (!vm._pinned) vm.getElement()?.querySelector('.cad-vertex-badge')?.classList.remove('dot-visible');
                        });
                    }
                });
                sShapeLayer.on('click', (e) => {
                    if (appCadTool.isActive) {
                        L.DomEvent.stopPropagation(e);
                        appCadTool.handleMapClick(e.latlng.lat, e.latlng.lng);
                        return;
                    }
                    L.DomEvent.stopPropagation(e);
                    shape._pinned = !shape._pinned;
                    edgeMarkers.forEach(em => {
                        const b = em.getElement()?.querySelector('.cad-edge-badge');
                        if (shape._pinned) b?.classList.add('visible', 'pinned');
                        else b?.classList.remove('visible', 'pinned');
                    });
                    vertexMarkers.forEach(vm => {
                        const b = vm.getElement()?.querySelector('.cad-vertex-badge');
                        if (shape._pinned) b?.classList.add('dot-visible');
                        else b?.classList.remove('dot-visible');
                    });
                });

                if (showCenterLabels) {
                // Nhãn tâm khối: Vị trí tâm trực quan tối ưu (Pole of Inaccessibility cho cả khối chữ L)
                // và Scale kích thước vừa khít theo khoảng cách mép trong lòng khối
                const [cLat, cLng, clearanceDeg] = this.calculatePolygonVisualCenter(sVerts);
                const blockSymbol = shape.symbol || String(sIdx + 1);

                // Tính toán kích thước pixel của khối trên màn hình để scale nhãn chuẩn xác
                let maxW = 75, maxH = 32, badgeHtml = '';
                if (AppState.leafletMap) {
                    const b = L.latLngBounds(sLatLngs);
                    const p1 = AppState.leafletMap.latLngToContainerPoint(b.getSouthWest());
                    const p2 = AppState.leafletMap.latLngToContainerPoint(b.getNorthEast());
                    const wPx = Math.abs(p2.x - p1.x);
                    const hPx = Math.abs(p2.y - p1.y);
                    const minDim = Math.min(wPx, hPx);

                    // Tính bán kính an toàn thực tế theo pixel tại vị trí đặt nhãn (đặc biệt chuẩn xác cho khối chữ L)
                    let clearancePx = 999;
                    if (clearanceDeg && clearanceDeg > 0) {
                        const cPt = AppState.leafletMap.latLngToContainerPoint([cLat, cLng]);
                        const offPt = AppState.leafletMap.latLngToContainerPoint([cLat + clearanceDeg, cLng]);
                        clearancePx = Math.max(8, Math.abs(offPt.y - cPt.y));
                    }
                    const safeInnerDiam = Math.min(minDim, Math.round(clearancePx * 1.85));

                    maxW = Math.max(18, Math.min(Math.floor(wPx * 0.82), Math.floor(clearancePx * 2.2)));
                    maxH = Math.max(18, Math.min(Math.floor(hPx * 0.82), Math.floor(clearancePx * 1.8)));

                    if (safeInnerDiam < 45) {
                        // Khối rất nhỏ hoặc nhánh chữ L hẹp: Hiển thị chấm tròn ký hiệu cực gọn, lọt thỏm trong lòng khối
                        const bDim = Math.min(22, Math.max(16, safeInnerDiam));
                        badgeHtml = `<div class="cad-center-badge" style="background:rgba(15,23,42,0.94); border:1.5px solid ${sColor}; color:${sColor}; width:${bDim}px; height:${bDim}px; min-width:${bDim}px; padding:0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:10px; box-shadow:0 1px 6px rgba(0,0,0,0.5);" title="${shape.name} (${shape.stats?.areaFormatted || 0} m²)">${blockSymbol}</div>`;
                    } else if (safeInnerDiam < 85) {
                        // Khối trung bình: Hiển thị ký hiệu + diện tích làm tròn
                        badgeHtml = `<div class="cad-center-badge" style="background:rgba(15,23,42,0.92); border:1.5px solid ${sColor}; color:#ffffff; padding:1px 4px; border-radius:4px; text-align:center; max-width:${maxW}px; max-height:${maxH}px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.4);" title="${shape.name}">
                            <div style="font-weight:800; font-size:11px; color:${sColor}; line-height:1.1;">${blockSymbol}</div>
                            <div class="cad-center-area-val" style="font-weight:700; font-size:8.5px; color:#f8fafc; white-space:nowrap;">${Math.round(shape.stats?.area || 0)} m²</div>
                        </div>`;
                    } else {
                        // Khối lớn: Hiển thị đầy đủ
                        badgeHtml = `<div class="cad-center-badge" style="background:rgba(15,23,42,0.90); border:1.5px solid ${sColor}; color:#ffffff; padding:2px 6px; border-radius:5px; text-align:center; max-width:${maxW}px; max-height:${maxH}px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.45);" title="${shape.name}">
                            <div style="font-weight:800; font-size:13px; color:${sColor}; line-height:1.15;">${blockSymbol}</div>
                            <div class="cad-center-area-val" style="font-weight:700; font-size:10px; color:#f8fafc; white-space:nowrap;">${shape.stats?.areaFormatted || 0} m²</div>
                        </div>`;
                    }
                } else {
                    badgeHtml = `<div class="cad-center-badge" style="background:rgba(15,23,42,0.9); border:1.5px solid ${sColor}; color:#ffffff; padding:2px 6px; border-radius:4px;"><div style="font-weight:800; font-size:12px; color:${sColor};">${blockSymbol}</div></div>`;
                }

                // iconAnchor [0, 0] kết hợp transform: translate(-50%, -50%) định tâm hoàn hảo, không bị trôi offset
                const centerIcon = L.divIcon({ className: 'cad-center-divicon', html: badgeHtml, iconSize: [0, 0], iconAnchor: [0, 0] });
                sCenterMarker = L.marker([cLat, cLng], { icon: centerIcon, interactive: false, zIndexOffset: 2300 }).addTo(this.layers.group);
                }
            } else if (showBoundaries && sLen >= 2) {
                const isSelected = this.selectedItem && this.selectedItem.type === 'shape' && this.selectedItem.index === sIdx;
                sShapeLayer = L.polyline(sLatLngs, {
                    color: isSelected ? '#facc15' : sColor,
                    weight: isSelected ? 4 : 2.5,
                    dashArray: isSelected ? null : '4, 4',
                    lineJoin: 'round',
                    interactive: true
                }).addTo(this.layers.group);
                sShapeLayer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (this.mode === 'select') {
                        this.selectItem({ type: 'shape', index: sIdx, name: shape.name || shape.shortName });
                    }
                });
            }

            // Nhãn cạnh và cự ly: Ẩn mặc định, hiển thị khi click hoặc rê chuột đến đỉnh/cạnh
            if (sLen >= 2 && shape.stats?.edges) {
                const isClosed = shape.mode === 'polygon' && sLen >= 3;
                const edgeCount = isClosed ? sLen : sLen - 1;

                for (let eIdx = 0; eIdx < edgeCount; eIdx++) {
                    const edge = shape.stats.edges[eIdx];
                    if (!edge) continue;
                    const cur = sVerts[eIdx];
                    const next = sVerts[(eIdx + 1) % sLen];
                    const midLat = (cur.lat + next.lat) / 2;
                    const midLng = (cur.lng + next.lng) / 2;

                    const isDistPinned = (showDistances === true || shape._pinned === true);
                    const labelHtml = `<div class="cad-edge-badge interactive ${isDistPinned ? 'visible pinned' : ''}" style="border-color:${sColor}; color:${sColor};" title="Bấm vào để chèn thêm đỉnh mới vào [${shape.shortName}] (+)">${edge.lengthFormatted}m <span style="font-size:9px; color:#4ade80;">+</span></div>`;
                    const labelIcon = L.divIcon({
                        className: '',
                        html: labelHtml,
                        iconSize: [52, 18],
                        iconAnchor: [26, 9]
                    });
                    const edgeMarker = L.marker([midLat, midLng], { icon: labelIcon, interactive: true, zIndexOffset: 2350 }).addTo(this.layers.group);
                    edgeMarker._pinned = isDistPinned;
                    edgeMarkers.push(edgeMarker);

                    edgeMarker.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        this.insertVertexOnEdge(sIdx, eIdx);
                    });

                    // Đường bắt rê chuột vô hình (Invisible Hit-Line) dọc theo cạnh để hiển thị cự ly khi rê chuột
                    const hitLine = L.polyline([[cur.lat, cur.lng], [next.lat, next.lng]], {
                        weight: 16,
                        color: '#000',
                        opacity: 0.001,
                        interactive: true
                    }).addTo(this.layers.group);
                    hitLines.push(hitLine);

                    hitLine.on('mouseover', () => {
                        edgeMarker.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible');
                    });
                    hitLine.on('mouseout', () => {
                        if (!edgeMarker._pinned && !shape._pinned) {
                            edgeMarker.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
                        }
                    });
                    hitLine.on('click', (e) => {
                        L.DomEvent.stopPropagation(e);
                        edgeMarker._pinned = !edgeMarker._pinned;
                        const b = edgeMarker.getElement()?.querySelector('.cad-edge-badge');
                        if (edgeMarker._pinned) b?.classList.add('visible', 'pinned');
                        else b?.classList.remove('visible', 'pinned');
                    });
                }
            }

            // Đỉnh của cấu trúc đã lưu: Ký hiệu Đ1, Đ2... Ẩn mặc định, chỉ hiển thị khi rê chuột đến hoặc bật tùy chọn showVertices
            {
            sVerts.forEach((v, vIdx) => {
                const isExpanded = (showVertices === true || shape._pinned === true);
                const iconHtml = `<div class="cad-vertex-badge ${isExpanded ? 'expanded' : ''}" style="background: ${sColor}; border-color: #ffffff;" title="${shape.shortName} - ${v.name} (Kéo thả để nắn ranh, bấm để xem chi tiết)">${v.name}</div>`;
                const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [22, 22], iconAnchor: [11, 11] });
                const marker = L.marker([v.lat, v.lng], { icon, zIndexOffset: 2450, draggable: true }).addTo(this.layers.group);
                marker._pinned = isExpanded;
                vertexMarkers.push(marker);

                // Rê chuột vào đỉnh: bung nhãn đỉnh và hiện cự ly các cạnh nối với đỉnh này
                marker.on('mouseover', () => {
                    marker.getElement()?.querySelector('.cad-vertex-badge')?.classList.add('expanded');
                    const prevE = edgeMarkers[(vIdx - 1 + edgeMarkers.length) % edgeMarkers.length];
                    const nextE = edgeMarkers[vIdx];
                    prevE?.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible');
                    nextE?.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible');
                });
                marker.on('mouseout', () => {
                    if (!marker._pinned) {
                        marker.getElement()?.querySelector('.cad-vertex-badge')?.classList.remove('expanded');
                    }
                    const prevE = edgeMarkers[(vIdx - 1 + edgeMarkers.length) % edgeMarkers.length];
                    const nextE = edgeMarkers[vIdx];
                    if (!prevE?._pinned && !shape._pinned) prevE?.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
                    if (!nextE?._pinned && !shape._pinned) nextE?.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
                });

                let isDragging = false;
                marker.on('dragstart', () => {
                    this.pushHistoryState(`Dời đỉnh ${v.name}`);
                    isDragging = true;
                    if (AppState.leafletMap) AppState.leafletMap.dragging.disable();
                });

                marker.on('drag', (e) => {
                    const rawPos = e.target.getLatLng();
                    const adjSnap = (this.snapEnabled && this.findAdjacentVertexSnap) 
                        ? this.findAdjacentVertexSnap(rawPos.lat, rawPos.lng, sIdx, vIdx, this.adjacentSnapThresholdMeters || 0.5) 
                        : null;
                    
                    const badgeEl = marker.getElement() ? marker.getElement().querySelector('.cad-vertex-badge') : null;
                    const displayLat = adjSnap ? adjSnap.lat : rawPos.lat;
                    const displayLng = adjSnap ? adjSnap.lng : rawPos.lng;

                    if (adjSnap) {
                        if (badgeEl) badgeEl.classList.add('snapped-adjacent');
                    } else {
                        if (badgeEl) badgeEl.classList.remove('snapped-adjacent');
                    }

                    v.lat = displayLat;
                    v.lng = displayLng;
                    // Luôn tính toán lại X, Y VN2000 chuẩn xác theo KTT hiện tại để tránh bất đồng bộ
                    const vn2k = convertWgsToVn2k(displayLat, displayLng, AppState.kttVal, AppState.scaleFactor);
                    v.x = parseFloat(parseFloat(vn2k.X).toFixed(3));
                    v.y = parseFloat(parseFloat(vn2k.Y).toFixed(3));

                    if (sShapeLayer) {
                        sShapeLayer.setLatLngs(sVerts.map(pt => [pt.lat, pt.lng]));
                    }

                    // Tính lại toàn bộ diện tích & cạnh tức thời (Live 60 FPS)
                    shape.stats = this.calculateAreaAndPerimeter(sVerts, shape.mode, true);

                    if (sCenterMarker && sLen >= 3) {
                        const curCLat = sVerts.reduce((a, b) => a + b.lat, 0) / sLen;
                        const curCLng = sVerts.reduce((a, b) => a + b.lng, 0) / sLen;
                        sCenterMarker.setLatLng([curCLat, curCLng]);

                        // Cập nhật giá trị diện tích hiển thị trên nhãn tâm khối
                        const centerAreaEl = sCenterMarker.getElement()?.querySelector('.cad-center-area-val');
                        if (centerAreaEl) {
                            if (centerAreaEl.innerText.includes('m²')) {
                                centerAreaEl.innerText = `${shape.stats.areaFormatted} m²`;
                            }
                        }
                    }

                    // Cập nhật vị trí và khoảng cách các cạnh liền kề theo thời gian thực (Live 60 FPS)
                    const isClosed = shape.mode === 'polygon' && sLen >= 3;
                    if (isClosed || vIdx > 0) {
                        const prevEIdx = (vIdx - 1 + sLen) % sLen;
                        const pA = sVerts[prevEIdx];
                        const pB = v;
                        if (pA && pB && edgeMarkers[prevEIdx]) {
                            const edgeData = shape.stats.edges ? shape.stats.edges[prevEIdx] : null;
                            const lenStr = edgeData ? edgeData.lengthFormatted : Math.hypot(pB.x - pA.x, pB.y - pA.y).toFixed(2);
                            const midLat = (pA.lat + pB.lat) / 2;
                            const midLng = (pA.lng + pB.lng) / 2;
                            edgeMarkers[prevEIdx].setLatLng([midLat, midLng]);
                            const bEl = edgeMarkers[prevEIdx].getElement()?.querySelector('.cad-edge-badge');
                            if (bEl) {
                                bEl.innerHTML = `${lenStr}m <span style="font-size:9px; color:#4ade80;">+</span>`;
                                bEl.classList.add('visible');
                            }
                            if (hitLines[prevEIdx]) {
                                hitLines[prevEIdx].setLatLngs([[pA.lat, pA.lng], [pB.lat, pB.lng]]);
                            }
                        }
                    }
                    if (isClosed || vIdx < sLen - 1) {
                        const nextEIdx = vIdx;
                        const pA = v;
                        const pB = sVerts[(vIdx + 1) % sLen];
                        if (pA && pB && edgeMarkers[nextEIdx]) {
                            const edgeData = shape.stats.edges ? shape.stats.edges[nextEIdx] : null;
                            const lenStr = edgeData ? edgeData.lengthFormatted : Math.hypot(pB.x - pA.x, pB.y - pA.y).toFixed(2);
                            const midLat = (pA.lat + pB.lat) / 2;
                            const midLng = (pA.lng + pB.lng) / 2;
                            edgeMarkers[nextEIdx].setLatLng([midLat, midLng]);
                            const bEl = edgeMarkers[nextEIdx].getElement()?.querySelector('.cad-edge-badge');
                            if (bEl) {
                                bEl.innerHTML = `${lenStr}m <span style="font-size:9px; color:#4ade80;">+</span>`;
                                bEl.classList.add('visible');
                            }
                            if (hitLines[nextEIdx]) {
                                hitLines[nextEIdx].setLatLngs([[pA.lat, pA.lng], [pB.lat, pB.lng]]);
                            }
                        }
                    }
                });

                marker.on('dragend', (e) => {
                    if (AppState.leafletMap) AppState.leafletMap.dragging.enable();
                    setTimeout(() => { isDragging = false; }, 150);

                    const finalPos = e.target.getLatLng();
                    let targetLat = finalPos.lat;
                    let targetLng = finalPos.lng;
                    let isSnapped = false;
                    let snapSource = null;

                    // Chỉ tự động bắt đỉnh khi đến gần <= 0.5m đỉnh của khối liền kề hoặc mốc dự án
                    if (this.snapEnabled && this.findAdjacentVertexSnap) {
                        const adjSnap = this.findAdjacentVertexSnap(finalPos.lat, finalPos.lng, sIdx, vIdx, this.adjacentSnapThresholdMeters || 0.5);
                        if (adjSnap) {
                            targetLat = adjSnap.lat;
                            targetLng = adjSnap.lng;
                            isSnapped = true;
                            snapSource = adjSnap.source;
                            marker.setLatLng([adjSnap.lat, adjSnap.lng]);
                        }
                    }

                    v.lat = targetLat;
                    v.lng = targetLng;
                    const vn2k = convertWgsToVn2k(targetLat, targetLng, AppState.kttVal, AppState.scaleFactor);
                    v.x = parseFloat(parseFloat(vn2k.X).toFixed(3));
                    v.y = parseFloat(parseFloat(vn2k.Y).toFixed(3));
                    v.isSnapped = isSnapped;
                    v.snapSource = snapSource;

                    // Chuẩn hóa đồng bộ 100% tất cả các đỉnh của khối theo cùng một hệ quy chiếu
                    shape.vertices.forEach((pt, pIdx) => {
                        this._normalizeVertex(pt, pIdx, true);
                    });

                    // Khi người dùng đã kéo điều chỉnh đỉnh, hủy diện tích nhập thủ công (nếu có) để tính lại diện tích chuẩn xác
                    if (shape.customArea) {
                        delete shape.customArea;
                    }

                    // Cập nhật lại thống kê diện tích / chu vi và các cạnh của khối
                    shape.stats = this.calculateAreaAndPerimeter(shape.vertices, shape.mode, true);

                    // Lưu dữ liệu ngay vào Sổ đo dự án & CAD storage để không bị mất khi reload
                    this.saveShapesForProject(AppState.currentProject);
                    this.persistSession();

                    this.renderGeometry();
                    this.renderBlocksPanel();
                    this.updateUi();
                    if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                        this.openAreaTableModal();
                    }
                    triggerHaptic('success');
                    if (isSnapped) {
                        showToast(`🧲 Đỉnh ${v.name} (${shape.shortName}) đã tự bắt khớp chuẩn vào [${snapSource}]!`);
                    } else {
                        showToast(`📍 Đã dời đỉnh ${v.name} (${shape.shortName}): X=${v.x.toFixed(3)}, Y=${v.y.toFixed(3)}`);
                    }
                });

                marker.on('click', (e) => {
                    if (isDragging) return;
                    if (appCadTool.isActive) {
                        L.DomEvent.stopPropagation(e);
                        appCadTool.handleMapClick(v.lat, v.lng);
                    }
                });
                marker.bindPopup(`
                    <div style="font-family: -apple-system, sans-serif; font-size: 12px; line-height: 1.5; min-width: 175px;">
                        <b style="color: ${sColor}; font-size: 13px;">📍 ${shape.shortName} - ${v.name}</b>
                        <div style="color: #334155; margin-top: 3px;">• <b>X:</b> ${v.x.toFixed(3)} m</div>
                        <div style="color: #334155;">• <b>Y:</b> ${v.y.toFixed(3)} m</div>
                        <div style="color: #0284c7; font-size: 11px; margin-top: 2px;">🖐️ <i>Kéo thả để nắn ranh đỉnh</i></div>
                        <button type="button" class="btn-sm" style="margin-top: 6px; width: 100%; height: 26px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); font-size: 11px; cursor: pointer; border-radius: 4px; font-weight: 700;" onclick="appCadTool.deleteVertex(${sIdx}, ${vIdx})">🗑️ Xóa đỉnh này</button>
                    </div>
                `);
                marker.on('contextmenu', (e) => {
                    L.DomEvent.stopPropagation(e);
                    if (confirm(`Bạn có chắc muốn xóa đỉnh ${v.name} của [${shape.shortName}]?`)) {
                        appCadTool.deleteVertex(sIdx, vIdx);
                    }
                });
            });
            }
        });

        const n = this.vertices.length;
        if (n === 0) return;

        const latlngs = this.vertices.map(v => [v.lat, v.lng]);

        // Kiểm tra lỗi tự cắt chéo hình học (QC Geom)
        const isSelfIntersecting = (this.mode === 'polygon' && this.checkSelfIntersection());
        const warnEl = document.getElementById('cadQcWarning');
        if (warnEl) {
            warnEl.style.display = isSelfIntersecting ? 'inline-block' : 'none';
        }

        // 1. Vẽ đường bao (Polyline hoặc Polygon)
        if (showBoundaries && n >= 2) {
            if (this.mode === 'polygon' && n >= 3) {
                this.layers.shape = L.polygon(latlngs, {
                    color: isSelfIntersecting ? '#ef4444' : '#06b6d4',
                    weight: 3,
                    dashArray: isSelfIntersecting ? '6, 4' : null,
                    fillColor: isSelfIntersecting ? '#f87171' : '#38bdf8',
                    fillOpacity: isSelfIntersecting ? 0.35 : 0.22,
                    lineJoin: 'round',
                    interactive: false
                }).addTo(this.layers.group);
            } else {
                this.layers.shape = L.polyline(latlngs, {
                    color: '#06b6d4',
                    weight: 3,
                    dashArray: '6, 6',
                    lineJoin: 'round',
                    interactive: false
                }).addTo(this.layers.group);
            }
        }

        // 2. Hiển thị nhãn kích thước cạnh (m) cho nét vẽ hiện tại (Tạo trước để hỗ trợ cập nhật thời gian thực khi kéo thả)
        const stats = this.calculateAreaAndPerimeter();
        const activeEdgeMarkers = [];
        const activeHitLines = [];

        if (stats && stats.edges && n >= 2) {
            const isClosed = this.mode === 'polygon' && n >= 3;
            const edgeCount = isClosed ? n : n - 1;

            for (let eIdx = 0; eIdx < edgeCount; eIdx++) {
                const edge = stats.edges[eIdx];
                if (!edge) continue;
                const cur = this.vertices[eIdx];
                const next = this.vertices[(eIdx + 1) % n];
                const midLat = (cur.lat + next.lat) / 2;
                const midLng = (cur.lng + next.lng) / 2;

                const isActDistPinned = (showDistances === true || this._pinned === true);
                const labelHtml = `<div class="cad-edge-badge interactive ${isActDistPinned ? 'visible pinned' : ''}" title="Bấm vào để chèn thêm đỉnh mới tại trung điểm cạnh (+)">${edge.lengthFormatted}m <span style="font-size:9px; color:#4ade80;">+</span></div>`;
                const labelIcon = L.divIcon({
                    className: '',
                    html: labelHtml,
                    iconSize: [52, 18],
                    iconAnchor: [26, 9]
                });
                const edgeMarker = L.marker([midLat, midLng], { icon: labelIcon, interactive: true, zIndexOffset: 2400 }).addTo(this.layers.group);
                edgeMarker._pinned = isActDistPinned;
                activeEdgeMarkers.push(edgeMarker);

                edgeMarker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    this.insertVertexOnEdge(-1, eIdx);
                });

                // Bắt rê chuột vào cạnh vẽ hiện tại
                const hitLine = L.polyline([[cur.lat, cur.lng], [next.lat, next.lng]], {
                    weight: 16,
                    color: '#000',
                    opacity: 0.001,
                    interactive: true
                }).addTo(this.layers.group);
                activeHitLines.push(hitLine);

                hitLine.on('mouseover', () => {
                    edgeMarker.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible');
                });
                hitLine.on('mouseout', () => {
                    if (!edgeMarker._pinned && !this._pinned) {
                        edgeMarker.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
                    }
                });
                hitLine.on('click', (e) => {
                    if (appCadTool.isActive) {
                        L.DomEvent.stopPropagation(e);
                        appCadTool.handleMapClick(e.latlng.lat, e.latlng.lng);
                        return;
                    }
                    L.DomEvent.stopPropagation(e);
                    edgeMarker._pinned = !edgeMarker._pinned;
                    const b = edgeMarker.getElement()?.querySelector('.cad-edge-badge');
                    if (edgeMarker._pinned) b?.classList.add('visible', 'pinned');
                    else b?.classList.remove('visible', 'pinned');
                });
            }
        }

        // 3. Vẽ marker tại các đỉnh kèm nhãn Đ1, Đ2... (Hỗ trợ kéo thả di chuyển mượt mà kèm cập nhật cự ly tức thì)
        this.vertices.forEach((v, idx) => {
            const isActExp = (showVertices === true || this._pinned === true) ? 'expanded' : '';
            const iconHtml = `<div class="cad-vertex-badge dot-visible ${isActExp}" style="cursor: grab;" title="${v.name} (X: ${v.x.toFixed(3)}, Y: ${v.y.toFixed(3)}) - Kéo thả để di chuyển nhanh đỉnh">${v.name}</div>`;
            const icon = L.divIcon({
                className: '',
                html: iconHtml,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            const marker = L.marker([v.lat, v.lng], { 
                icon, 
                zIndexOffset: 2500,
                draggable: true 
            }).addTo(this.layers.group);
            marker._pinned = (showVertices === true || this._pinned === true);

            marker.on('mouseover', () => {
                marker.getElement()?.querySelector('.cad-vertex-badge')?.classList.add('expanded');
                const prevE = activeEdgeMarkers[(idx - 1 + activeEdgeMarkers.length) % activeEdgeMarkers.length];
                const nextE = activeEdgeMarkers[idx];
                prevE?.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible');
                nextE?.getElement()?.querySelector('.cad-edge-badge')?.classList.add('visible');
            });
            marker.on('mouseout', () => {
                if (!marker._pinned) {
                    marker.getElement()?.querySelector('.cad-vertex-badge')?.classList.remove('expanded');
                }
                const prevE = activeEdgeMarkers[(idx - 1 + activeEdgeMarkers.length) % activeEdgeMarkers.length];
                const nextE = activeEdgeMarkers[idx];
                if (!prevE?._pinned && !this._pinned) prevE?.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
                if (!nextE?._pinned && !this._pinned) nextE?.getElement()?.querySelector('.cad-edge-badge')?.classList.remove('visible');
            });

            let isDragging = false;
            marker.on('dragstart', () => {
                this.pushHistoryState(`Dời đỉnh ${v.name}`);
                isDragging = true;
                if (AppState.leafletMap) AppState.leafletMap.dragging.disable();
            });

            marker.on('drag', (e) => {
                const rawPos = e.target.getLatLng();
                const adjSnap = (this.snapEnabled && this.findAdjacentVertexSnap)
                    ? this.findAdjacentVertexSnap(rawPos.lat, rawPos.lng, -1, idx, this.adjacentSnapThresholdMeters || 0.5)
                    : null;
                
                const badgeEl = marker.getElement() ? marker.getElement().querySelector('.cad-vertex-badge') : null;
                const displayLat = adjSnap ? adjSnap.lat : rawPos.lat;
                const displayLng = adjSnap ? adjSnap.lng : rawPos.lng;

                if (adjSnap) {
                    if (badgeEl) badgeEl.classList.add('snapped-adjacent');
                } else {
                    if (badgeEl) badgeEl.classList.remove('snapped-adjacent');
                }

                v.lat = displayLat;
                v.lng = displayLng;
                const vn2k = convertWgsToVn2k(displayLat, displayLng, AppState.kttVal, AppState.scaleFactor);
                v.x = parseFloat(parseFloat(vn2k.X).toFixed(3));
                v.y = parseFloat(parseFloat(vn2k.Y).toFixed(3));

                // Cập nhật ngay đường bao (polyline/polygon) để mượt mà 60 FPS
                if (this.layers.shape) {
                    this.layers.shape.setLatLngs(this.vertices.map(pt => [pt.lat, pt.lng]));
                }

                // Tính lại toàn bộ diện tích & cạnh tức thời (Live 60 FPS)
                const liveStats = this.calculateAreaAndPerimeter(this.vertices, this.mode, true);

                if (this.layers.centerMarker && n >= 3 && this.mode === 'polygon') {
                    const curCLat = this.vertices.reduce((a, b) => a + b.lat, 0) / n;
                    const curCLng = this.vertices.reduce((a, b) => a + b.lng, 0) / n;
                    this.layers.centerMarker.setLatLng([curCLat, curCLng]);

                    const centerAreaEl = this.layers.centerMarker.getElement()?.querySelector('.cad-center-area-val');
                    if (centerAreaEl) {
                        centerAreaEl.innerText = `S = ${liveStats.areaFormatted} m²`;
                    }
                }

                // Cập nhật khoảng cách 2 cạnh liền kề với đỉnh đang kéo theo thời gian thực (Live 60 FPS)
                const isClosed = this.mode === 'polygon' && n >= 3;
                if (isClosed || idx > 0) {
                    const prevEIdx = (idx - 1 + n) % n;
                    const pA = this.vertices[prevEIdx];
                    const pB = v;
                    if (pA && pB && activeEdgeMarkers[prevEIdx]) {
                        const edgeData = liveStats.edges ? liveStats.edges[prevEIdx] : null;
                        const lenStr = edgeData ? edgeData.lengthFormatted : Math.hypot(pB.x - pA.x, pB.y - pA.y).toFixed(2);
                        const midLat = (pA.lat + pB.lat) / 2;
                        const midLng = (pA.lng + pB.lng) / 2;
                        activeEdgeMarkers[prevEIdx].setLatLng([midLat, midLng]);
                        const bEl = activeEdgeMarkers[prevEIdx].getElement()?.querySelector('.cad-edge-badge');
                        if (bEl) {
                            bEl.innerHTML = `${lenStr}m <span style="font-size:9px; color:#4ade80;">+</span>`;
                            bEl.classList.add('visible');
                        }
                        if (activeHitLines[prevEIdx]) {
                            activeHitLines[prevEIdx].setLatLngs([[pA.lat, pA.lng], [pB.lat, pB.lng]]);
                        }
                    }
                }
                if (isClosed || idx < n - 1) {
                    const nextEIdx = idx;
                    const pA = v;
                    const pB = this.vertices[(idx + 1) % n];
                    if (pA && pB && activeEdgeMarkers[nextEIdx]) {
                        const edgeData = liveStats.edges ? liveStats.edges[nextEIdx] : null;
                        const lenStr = edgeData ? edgeData.lengthFormatted : Math.hypot(pB.x - pA.x, pB.y - pA.y).toFixed(2);
                        const midLat = (pA.lat + pB.lat) / 2;
                        const midLng = (pA.lng + pB.lng) / 2;
                        activeEdgeMarkers[nextEIdx].setLatLng([midLat, midLng]);
                        const bEl = activeEdgeMarkers[nextEIdx].getElement()?.querySelector('.cad-edge-badge');
                        if (bEl) {
                            bEl.innerHTML = `${lenStr}m <span style="font-size:9px; color:#4ade80;">+</span>`;
                            bEl.classList.add('visible');
                        }
                        if (activeHitLines[nextEIdx]) {
                            activeHitLines[nextEIdx].setLatLngs([[pA.lat, pA.lng], [pB.lat, pB.lng]]);
                        }
                    }
                }

                this.updateUi();
            });

            marker.on('dragend', (e) => {
                if (AppState.leafletMap) AppState.leafletMap.dragging.enable();
                setTimeout(() => { isDragging = false; }, 150);

                const finalPos = e.target.getLatLng();
                let targetLat = finalPos.lat;
                let targetLng = finalPos.lng;
                let isSnapped = false;
                let snapSource = null;

                if (this.snapEnabled && this.findAdjacentVertexSnap) {
                    const adjSnap = this.findAdjacentVertexSnap(finalPos.lat, finalPos.lng, -1, idx, this.adjacentSnapThresholdMeters || 0.5);
                    if (adjSnap) {
                        targetLat = adjSnap.lat;
                        targetLng = adjSnap.lng;
                        isSnapped = true;
                        snapSource = adjSnap.source;
                        marker.setLatLng([adjSnap.lat, adjSnap.lng]);
                    }
                }

                v.lat = targetLat;
                v.lng = targetLng;
                const vn2k = convertWgsToVn2k(targetLat, targetLng, AppState.kttVal, AppState.scaleFactor);
                v.x = parseFloat(parseFloat(vn2k.X).toFixed(3));
                v.y = parseFloat(parseFloat(vn2k.Y).toFixed(3));
                v.isSnapped = isSnapped;
                v.snapSource = snapSource;

                // Chuẩn hóa đồng bộ 100% tất cả các đỉnh đang vẽ
                this.vertices.forEach((pt, pIdx) => {
                    this._normalizeVertex(pt, pIdx, true);
                });

                this.calculateAreaAndPerimeter(this.vertices, this.mode, true);
                this.persistSession();
                this.renderGeometry();
                this.updateUi();
                this.renderBlocksPanel();
                if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
                    this.openAreaTableModal();
                }
                triggerHaptic('success');
                if (isSnapped) {
                    showToast(`🧲 Đỉnh ${v.name} đã tự bắt khớp chuẩn vào [${snapSource}]!`);
                } else {
                    showToast(`📍 Đã dời đỉnh ${v.name}: X=${v.x.toFixed(3)}, Y=${v.y.toFixed(3)}`);
                }
            });

            marker.on('click', (e) => {
                if (isDragging) return;
                if (appCadTool.isActive) {
                    L.DomEvent.stopPropagation(e);
                    appCadTool.handleMapClick(v.lat, v.lng);
                }
            });
            marker.bindPopup(`
                <div style="font-family: -apple-system, sans-serif; font-size: 12px; line-height: 1.5; min-width: 175px;">
                    <b style="color: #0284c7; font-size: 13px;">📍 ${v.name}</b>
                    <div style="color: #334155; margin-top: 3px;">• <b>X:</b> ${v.x.toFixed(3)} m</div>
                    <div style="color: #334155;">• <b>Y:</b> ${v.y.toFixed(3)} m</div>
                    ${v.isSnapped ? `<div style="color: #d97706; font-size: 11px;">🧲 ${v.snapSource || 'Hít mốc'}</div>` : ''}
                    <div style="color: #0284c7; font-size: 11px; margin-top: 2px;">🖐️ <i>Kéo thả để nắn ranh đỉnh</i></div>
                    <button type="button" class="btn-sm" style="margin-top: 6px; width: 100%; height: 26px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.35); font-size: 11px; cursor: pointer; border-radius: 4px; font-weight: 700;" onclick="appCadTool.deleteVertex(-1, ${idx})">🗑️ Xóa đỉnh này</button>
                </div>
            `);
            marker.on('contextmenu', (e) => {
                L.DomEvent.stopPropagation(e);
                if (confirm(`Bạn có chắc muốn xóa đỉnh ${v.name}?`)) {
                    appCadTool.deleteVertex(-1, idx);
                }
            });
        });

        // 4. Nếu là đa giác khép kín >= 3 đỉnh: hiển thị badge diện tích tại tâm đa giác (scale vừa khít)
        if (showCenterLabels && this.mode === 'polygon' && n >= 3) {
            const [centerLat, centerLng, clearanceDeg] = this.calculatePolygonVisualCenter(this.vertices);
            const warningMsg = isSelfIntersecting ? '<div style="color:#ef4444; font-size:9px;">⚠️ Tự cắt!</div>' : '';

            let maxW = 110, maxH = 34, actBadgeHtml = '';
            if (AppState.leafletMap) {
                const b = L.latLngBounds(latlngs);
                const p1 = AppState.leafletMap.latLngToContainerPoint(b.getSouthWest());
                const p2 = AppState.leafletMap.latLngToContainerPoint(b.getNorthEast());
                const wPx = Math.abs(p2.x - p1.x);
                const hPx = Math.abs(p2.y - p1.y);
                const minDim = Math.min(wPx, hPx);

                let clearancePx = 999;
                if (clearanceDeg && clearanceDeg > 0) {
                    const cPt = AppState.leafletMap.latLngToContainerPoint([centerLat, centerLng]);
                    const offPt = AppState.leafletMap.latLngToContainerPoint([centerLat + clearanceDeg, centerLng]);
                    clearancePx = Math.max(8, Math.abs(offPt.y - cPt.y));
                }
                const safeInnerDiam = Math.min(minDim, Math.round(clearancePx * 1.85));

                maxW = Math.max(20, Math.min(Math.floor(wPx * 0.82), Math.floor(clearancePx * 2.2)));
                maxH = Math.max(18, Math.min(Math.floor(hPx * 0.82), Math.floor(clearancePx * 1.8)));

                if (safeInnerDiam < 50) {
                    actBadgeHtml = `<div class="cad-center-badge" style="background:rgba(6,182,212,0.92); border:1.5px solid #06b6d4; color:#ffffff; padding:1px 4px; border-radius:4px; font-size:9.5px; font-weight:800; max-width:${maxW}px; overflow:hidden; text-align:center;"><span class="cad-center-area-val">${Math.round(stats.area)} m²</span></div>`;
                } else {
                    actBadgeHtml = `<div class="cad-center-badge" style="background:rgba(15,23,42,0.92); border:1.5px solid #06b6d4; color:#ffffff; padding:2px 6px; border-radius:5px; max-width:${maxW}px; max-height:${maxH}px; overflow:hidden; text-align:center;">
                        <div class="cad-center-area-val" style="color:#38bdf8; font-weight:800; font-size:11.5px;">S = ${stats.areaFormatted} m²</div>
                        <div style="font-size:9px; color:#cbd5e1;">${stats.haFormatted} ha</div>
                        ${warningMsg}
                    </div>`;
                }
            } else {
                actBadgeHtml = `<div class="cad-center-badge"><div class="cad-center-area-val">S = ${stats.areaFormatted} m²</div></div>`;
            }

            const badgeIcon = L.divIcon({
                className: 'cad-center-divicon',
                html: actBadgeHtml,
                iconSize: [0, 0],
                iconAnchor: [0, 0]
            });
            this.layers.centerMarker = L.marker([centerLat, centerLng], { icon: badgeIcon, interactive: false, zIndexOffset: 2300 }).addTo(this.layers.group);
        }
    },

    updateUi() {
        const stats = this.calculateAreaAndPerimeter();
        const pill = document.getElementById('cadStatsPill');
        if (pill) {
            if (this.mode === 'polygon' && this.vertices.length >= 3) {
                pill.innerText = `${this.vertices.length} đỉnh • ${stats.perimeterFormatted} m • ${stats.areaFormatted} m² (${stats.haFormatted} ha)`;
            } else {
                pill.innerText = `${this.vertices.length} đỉnh • L = ${stats.perimeterFormatted} m`;
            }
        }
    },

    promptOffset() {
        if (this.vertices.length < 2) {
            showToast("⚠️ Cần vẽ ít nhất 2 đỉnh để tạo đường song song (Offset)!", true);
            return;
        }
        const input = prompt("Nhập khoảng cách song song Offset (mét):\n(Nhập số dương: mở rộng ra ngoài/phải; số âm: thu vào trong/trái)", "5.0");
        if (input === null) return;
        const d = parseFloat(input);
        if (isNaN(d) || d === 0) {
            showToast("⚠️ Khoảng cách Offset không hợp lệ!", true);
            return;
        }

        this.pushHistoryState('Dựng đường Offset');
        const pts = this.vertices;
        const n = pts.length;
        const isClosed = (this.mode === 'polygon' && n >= 3);
        const offsetPts = [];

        // Tính toán các vector pháp tuyến đơn vị của từng cạnh
        const normals = [];
        const segCount = isClosed ? n : n - 1;
        for (let i = 0; i < segCount; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % n];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len === 0) {
                normals.push({ nx: 0, ny: 0 });
            } else {
                // Pháp tuyến bên phải (+90 deg trong hệ trắc địa X Bắc, Y Đông)
                normals.push({
                    nx: (-dy / len) * d,
                    ny: (dx / len) * d
                });
            }
        }

        for (let i = 0; i < n; i++) {
            let ox, oy;
            if (isClosed) {
                const prevNorm = normals[(i - 1 + n) % n];
                const curNorm = normals[i];
                ox = pts[i].x + (prevNorm.nx + curNorm.nx) / 2;
                oy = pts[i].y + (prevNorm.ny + curNorm.ny) / 2;
            } else {
                if (i === 0) {
                    ox = pts[0].x + normals[0].nx;
                    oy = pts[0].y + normals[0].ny;
                } else if (i === n - 1) {
                    ox = pts[n - 1].x + normals[n - 2].nx;
                    oy = pts[n - 1].y + normals[n - 2].ny;
                } else {
                    const prevNorm = normals[i - 1];
                    const curNorm = normals[i];
                    ox = pts[i].x + (prevNorm.nx + curNorm.nx) / 2;
                    oy = pts[i].y + (prevNorm.ny + curNorm.ny) / 2;
                }
            }
            const wgs = convertVn2kToWgs(ox, oy, AppState.kttVal, AppState.scaleFactor);
            offsetPts.push([wgs.lat, wgs.lng]);
        }

        if (this.layers.offsetLayer && this.layers.group) {
            this.layers.group.removeLayer(this.layers.offsetLayer);
        }

        if (isClosed) {
            this.layers.offsetLayer = L.polygon(offsetPts, {
                color: '#a855f7',
                weight: 2,
                dashArray: '5, 5',
                fillColor: '#c084fc',
                fillOpacity: 0.15
            }).addTo(this.layers.group);
        } else {
            this.layers.offsetLayer = L.polyline(offsetPts, {
                color: '#a855f7',
                weight: 2,
                dashArray: '5, 5'
            }).addTo(this.layers.group);
        }

        showToast(`✓ Đã dựng đường song song Offset ${d > 0 ? '+' : ''}${d}m (đường màu tím)`);
    },

    openPolarModal() {
        if (this.vertices.length === 0) {
            showToast("⚠️ Vui lòng chấm hoặc nhập ít nhất 1 đỉnh làm gốc trước khi bắn điểm!", true);
            return;
        }
        const last = this.vertices[this.vertices.length - 1];
        const elName = document.getElementById('cadPolarOriginName');
        const elCoords = document.getElementById('cadPolarOriginCoords');
        if (elName) elName.innerText = last.name;
        if (elCoords) elCoords.innerText = `X: ${last.x.toFixed(3)} | Y: ${last.y.toFixed(3)}`;

        const distInput = document.getElementById('txtCadPolarDist');
        const azInput = document.getElementById('txtCadPolarAzimuth');
        if (distInput) distInput.value = '';
        if (azInput) azInput.value = '';

        const modal = document.getElementById('modalCadPolarInput');
        if (modal) modal.style.display = 'flex';
    },

    closePolarModal() {
        const modal = document.getElementById('modalCadPolarInput');
        if (modal) modal.style.display = 'none';
    },

    submitPolarVertex() {
        if (this.vertices.length === 0) return;
        const dist = parseFloat(document.getElementById('txtCadPolarDist')?.value);
        const az = parseFloat(document.getElementById('txtCadPolarAzimuth')?.value);

        if (isNaN(dist) || dist <= 0) {
            showToast("⚠️ Vui lòng nhập khoảng cách hợp lệ (> 0 m)!", true);
            return;
        }
        if (isNaN(az) || az < 0 || az > 360) {
            showToast("⚠️ Góc phương vị phải nằm trong khoảng từ 0° đến 360°!", true);
            return;
        }

        const last = this.vertices[this.vertices.length - 1];
        const rad = az * (Math.PI / 180.0);
        const newX = last.x + dist * Math.cos(rad);
        const newY = last.y + dist * Math.sin(rad);

        const wgs = convertVn2kToWgs(newX, newY, AppState.kttVal, AppState.scaleFactor);
        const nextIdx = this.vertices.length + 1;
        this.addVertex(wgs.lat, wgs.lng, `Đ${nextIdx}`, false, `Bắn cự ly S=${dist}m, Az=${az}°`, newX, newY, last.h || 0);

        this.closePolarModal();
        showToast(`✓ Đã thêm đỉnh Đ${nextIdx} (S=${dist}m, Az=${az}°)`);
    },

    openCoordModal() {
        const nameInput = document.getElementById('txtCadCoordName');
        const xInput = document.getElementById('txtCadCoordX');
        const yInput = document.getElementById('txtCadCoordY');
        if (nameInput) nameInput.value = `Đ${this.vertices.length + 1}`;
        if (xInput) xInput.value = '';
        if (yInput) yInput.value = '';

        const modal = document.getElementById('modalCadCoordInput');
        if (modal) modal.style.display = 'flex';
    },

    closeCoordModal() {
        const modal = document.getElementById('modalCadCoordInput');
        if (modal) modal.style.display = 'none';
    },

    submitCoordVertex() {
        const x = parseFloat(document.getElementById('txtCadCoordX')?.value);
        const y = parseFloat(document.getElementById('txtCadCoordY')?.value);
        let name = document.getElementById('txtCadCoordName')?.value?.trim();
        if (!name) name = `Đ${this.vertices.length + 1}`;

        if (isNaN(x) || isNaN(y)) {
            showToast("⚠️ Vui lòng nhập đầy đủ tọa độ X và Y!", true);
            return;
        }

        const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
        this.addVertex(wgs.lat, wgs.lng, name, false, "Nhập tọa độ VN-2000", x, y, 0);

        this.closeCoordModal();
        showToast(`✓ Đã thêm đỉnh ${name} (X: ${x.toFixed(3)}, Y: ${y.toFixed(3)})`);
    },


    // === HỘP THOẠI CẤU HÌNH & XUẤT BẢN VẼ KỸ THUẬT (TÁCH BIỆT KHỎI BẢNG KÊ) ===
    openExportModal() {
        this.closeAreaTableModal();
        const allShapes = this._getAllExportShapes();
        if (allShapes.length === 0) {
            showToast("⚠️ Chưa có cấu trúc hoặc mốc ranh nào để xuất bản vẽ!", true);
            return;
        }

        const modal = document.getElementById('modalCadExportConfig');
        if (modal) modal.classList.add('active');

        // Reset bộ lọc tìm kiếm khối
        const filterInput = document.getElementById('txtFilterExportBlocks');
        if (filterInput) filterInput.value = '';
        this._exportBlockFilter = '';

        // Nạp cấu hình khung tên đã lưu từ localStorage
        try {
            const savedMetaStr = localStorage.getItem('vn2k_cad_meta_saved');
            const savedMeta = savedMetaStr ? JSON.parse(savedMetaStr) : null;
            const curProj = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "BanDo";

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) el.value = val;
            };

            setVal('cadExportDrawingName', savedMeta?.drawingName || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT');
            setVal('cadExportProjectName', savedMeta?.projectName || curProj);
            setVal('cadExportOrganization', savedMeta?.organization || '');
            setVal('cadExportOwner', savedMeta?.owner || '');
            setVal('cadExportParcelNo', savedMeta?.parcelNo || '');
            setVal('cadExportAddress', savedMeta?.address || AppState.provinceName || '');
            setVal('cadExportSurveyor', savedMeta?.surveyor || '');
            setVal('cadExportChecker', savedMeta?.checker || '');
            setVal('cadExportDrawingCode', savedMeta?.drawingCode || 'SĐ-01/01');
            setVal('cadExportDate', new Date().toLocaleDateString('vi-VN'));
            if (savedMeta?.scaleVal) setVal('cadExportScale', savedMeta.scaleVal);
            if (savedMeta?.paper) setVal('cadExportPaperSize', savedMeta.paper);
            // Khôi phục trạng thái tùy chọn hiển thị thông tin khối & thành phần
            if (savedMeta) {
                if (typeof savedMeta.showBlockInfo === 'boolean') {
                    if (document.getElementById('cadExportCheckFullDetails')) {
                        document.getElementById('cadExportCheckFullDetails').checked = savedMeta.showBlockInfo;
                    }
                    if (document.getElementById('cadBlockDisplayFull')) {
                        document.getElementById('cadBlockDisplayFull').checked = savedMeta.showBlockInfo;
                        if (document.getElementById('cadBlockDisplayMinimal')) {
                            document.getElementById('cadBlockDisplayMinimal').checked = !savedMeta.showBlockInfo;
                        }
                    } else if (document.getElementById('cadShowBlockInfo')) {
                        document.getElementById('cadShowBlockInfo').checked = savedMeta.showBlockInfo;
                    }
                }
                if (this.displaySettings) {
                    if (typeof savedMeta.showCenterLabels === 'boolean') this.displaySettings.showCenterLabels = savedMeta.showCenterLabels;
                    if (typeof savedMeta.showAnnotations === 'boolean') this.displaySettings.showAnnotations = savedMeta.showAnnotations;
                    if (typeof savedMeta.showBoundaries === 'boolean') this.displaySettings.showBoundaries = savedMeta.showBoundaries;
                }
            }
            this.syncDisplayCheckboxes();
        } catch (e) {}

        this.renderExportBlockPicker();
        setTimeout(() => this.checkScalePaperFit(), 50);
    },

    saveTitleBlockInfo(showToastMsg = false) {
        try {
            const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
            const data = {
                drawingName: getVal('cadExportDrawingName') || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT',
                projectName: getVal('cadExportProjectName'),
                organization: getVal('cadExportOrganization'),
                owner: getVal('cadExportOwner'),
                parcelNo: getVal('cadExportParcelNo'),
                address: getVal('cadExportAddress'),
                surveyor: getVal('cadExportSurveyor'),
                checker: getVal('cadExportChecker'),
                drawingCode: getVal('cadExportDrawingCode') || 'SĐ-01/01',
                scaleVal: document.getElementById('cadExportScale')?.value || '500',
                paper: document.getElementById('cadExportPaperSize')?.value || 'A4',
                savedAt: Date.now()
            };

            // 1. Lưu cấu hình khung tên mặc định toàn hệ thống
            localStorage.setItem('vn2k_cad_meta_saved', JSON.stringify(data));

            // 2. Lưu cấu hình khung tên riêng theo dự án đang mở
            if (AppState.currentProject) {
                const projKey = 'vn2k_cad_meta_proj_' + AppState.currentProject.replace(/\.[^/.]+$/, "");
                localStorage.setItem(projKey, JSON.stringify(data));
            }

            if (showToastMsg) {
                triggerHaptic('success');
                showToast('💾 Đã lưu thành công thông tin khung tên bản vẽ kỹ thuật!');
            }
            return data;
        } catch (e) {
            console.warn('Lỗi khi lưu thông tin khung tên:', e);
            return null;
        }
    },

    resetTitleBlockInfo() {
        if (!confirm('Bạn có muốn đặt lại thông tin khung tên bản vẽ về mặc định không?')) return;
        const curProj = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Dự án mới";
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        setVal('cadExportDrawingName', 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT');
        setVal('cadExportProjectName', curProj);
        setVal('cadExportOrganization', '');
        setVal('cadExportOwner', '');
        setVal('cadExportParcelNo', '');
        setVal('cadExportAddress', AppState.provinceName || '');
        setVal('cadExportSurveyor', '');
        setVal('cadExportChecker', '');
        setVal('cadExportDrawingCode', 'SĐ-01/01');

        if (AppState.currentProject) {
            const projKey = 'vn2k_cad_meta_proj_' + AppState.currentProject.replace(/\.[^/.]+$/, "");
            localStorage.removeItem(projKey);
        }
        localStorage.removeItem('vn2k_cad_meta_saved');
        triggerHaptic('selection');
        showToast('✓ Đã đặt lại thông tin khung tên về mặc định');
    },

    closeExportModal() {
        const modal = document.getElementById('modalCadExportConfig');
        if (modal) modal.classList.remove('active');
    },

    filterExportBlocks(keyword) {
        this._exportBlockFilter = (keyword || '').toLowerCase().trim();
        this.renderExportBlockPicker();
    },

    renderExportBlockPicker() {
        const listEl = document.getElementById('cadExportBlockPickerList');
        if (!listEl) return;

        const allShapes = this._getAllExportShapes();
        let html = '';
        let selCount = 0;
        let selArea = 0;
        const filter = this._exportBlockFilter || '';

        allShapes.forEach((s, idx) => {
            const isSelected = s.selected !== false;
            if (isSelected) {
                selCount++;
                if (s.mode === 'polygon') selArea += (s.stats?.area || 0);
            }

            const nameMatch = !filter || s.name.toLowerCase().includes(filter) || (s.shortName && s.shortName.toLowerCase().includes(filter)) || (s.mode === 'polygon' ? 'đa giác' : 'tuyến').includes(filter);
            if (!nameMatch) return;

            const modeText = s.mode === 'polygon' ? 'Đa giác' : 'Tuyến';
            const vCount = s.vertices ? s.vertices.length : 0;
            const areaText = s.mode === 'polygon' 
                ? `${(s.stats?.area || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} m²` 
                : `${(s.stats?.perimeter || 0).toFixed(1)} m`;

            html += `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(30,41,59,0.7); border-radius: 5px; border-left: 3px solid ${s.color || '#38bdf8'}; font-size: 11px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; user-select: none;">
                        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="appCadTool.toggleExportBlock(${idx}, this.checked)" style="accent-color: #38bdf8; width: 14px; height: 14px;">
                        <span style="font-weight: 700; color: #f8fafc;">${s.name}</span>
                        <span style="color: #94a3b8; font-size: 10px;">[${modeText} • ${vCount} đỉnh]</span>
                    </label>
                    <span style="color: #4ade80; font-weight: 700; font-size: 11px;">${areaText}</span>
                </div>
            `;
        });

        listEl.innerHTML = html || `<div style="color: #94a3b8; font-size: 11px; padding: 8px; text-align: center;">${filter ? 'Không tìm thấy khối nào phù hợp với từ khóa.' : 'Chưa có khối nào được vẽ.'}</div>`;

        const countEl = document.getElementById('cadExportSelectedCount');
        const areaEl = document.getElementById('cadExportSelectedArea');
        const haEl = document.getElementById('cadExportSelectedHa');
        if (countEl) countEl.innerText = selCount;
        if (areaEl) areaEl.innerText = `${selArea.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m²`;
        if (haEl) haEl.innerText = `${(selArea / 10000.0).toFixed(4)} ha`;
    },

    toggleSelectAllExportBlocks(selectAll) {
        const filter = this._exportBlockFilter || '';
        const allShapes = this._getAllExportShapes();
        allShapes.forEach((s, idx) => {
            if (!filter || s.name.toLowerCase().includes(filter) || (s.shortName && s.shortName.toLowerCase().includes(filter))) {
                if (idx < this.savedShapes.length) {
                    this.savedShapes[idx].selected = selectAll;
                } else {
                    this._draftSelected = selectAll;
                }
            }
        });
        this.renderExportBlockPicker();
        this.checkScalePaperFit();
        this.renderBlockList(this._getAllExportShapes());
    },

    toggleExportBlock(idx, checked) {
        if (idx < this.savedShapes.length) {
            this.savedShapes[idx].selected = checked;
        } else {
            this._draftSelected = checked;
        }
        this.renderExportBlockPicker();
        this.checkScalePaperFit();
        this.renderBlockList(this._getAllExportShapes());
    },

    // === HỘP THOẠI NẠP MỐC TỌA ĐỘ DỰ ÁN VÀO MINICAD ===
    openLoadProjectModal() {
        const modal = document.getElementById('modalCadLoadProject');
        if (!modal) return;
        modal.classList.add('active');

        const sel = document.getElementById('cadLoadProjectSelect');
        if (sel) {
            sel.innerHTML = '';
            AppState.projectsList.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                const count = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(name).length : 0;
                opt.innerText = `📁 ${name} (${count} mốc)`;
                if (name === AppState.currentProject) opt.selected = true;
                sel.appendChild(opt);
            });
        }

        const cur = sel?.value || AppState.currentProject;
        this.onLoadProjectSelectChange(cur);
    },

    closeLoadProjectModal() {
        const modal = document.getElementById('modalCadLoadProject');
        if (modal) modal.classList.remove('active');
    },

    filterLoadPoints(keyword) {
        this._loadPointFilter = (keyword || '').toLowerCase().trim();
        const sel = document.getElementById('cadLoadProjectSelect');
        const curProj = sel?.value || AppState.currentProject;
        this.renderLoadPointsList(curProj);
    },

    onLoadProjectSelectChange(projName) {
        const targetNameInput = document.getElementById('cadLoadTargetShapeName');
        if (targetNameInput) {
            const shortProj = projName ? projName.replace(/\.[^/.]+$/, "") : "DuAn";
            targetNameInput.value = `Ranh mốc ${shortProj}`;
        }

        const filterInput = document.getElementById('txtFilterLoadPoints');
        if (filterInput) filterInput.value = '';
        this._loadPointFilter = '';

        this.renderLoadPointsList(projName);
    },

    renderLoadPointsList(projName) {
        const listEl = document.getElementById('cadLoadPointsList');
        if (!listEl) return;

        const pts = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(projName) : [];
        if (pts.length === 0) {
            listEl.innerHTML = '<div style="color: #94a3b8; font-size: 11px; padding: 8px; text-align: center;">Dự án này chưa có điểm mốc nào.</div>';
            this._updateLoadPointsCount(0);
            return;
        }

        const filter = this._loadPointFilter || '';
        let html = '';
        let matchCount = 0;

        pts.forEach((p, idx) => {
            const nameStr = (p.name || ('M' + (idx+1))).toLowerCase();
            const noteStr = (p.code || p.note || '').toLowerCase();
            if (filter && !nameStr.includes(filter) && !noteStr.includes(filter)) return;
            matchCount++;

            const xStr = parseFloat(p.x || 0).toFixed(3);
            const yStr = parseFloat(p.y || 0).toFixed(3);
            html += `
                <label style="display: flex; align-items: center; justify-content: space-between; padding: 5px 8px; background: rgba(30,41,59,0.7); border-radius: 4px; font-size: 11px; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" class="cad-load-pt-cb" value="${idx}" checked onchange="appCadTool._onLoadPtCheckboxChange()" style="accent-color: #38bdf8; width: 13px; height: 13px;">
                        <span style="font-weight: 700; color: #38bdf8;">${p.name || ('M' + (idx+1))}</span>
                        <span style="color: #cbd5e1; font-size: 10px; font-family: ui-monospace, monospace;">(X: ${xStr}, Y: ${yStr})</span>
                    </div>
                    <span style="color: #94a3b8; font-size: 10px;">${p.code || p.note || ''}</span>
                </label>
            `;
        });

        listEl.innerHTML = html || '<div style="color: #94a3b8; font-size: 11px; padding: 8px; text-align: center;">Không tìm thấy mốc phù hợp với từ khóa.</div>';
        this._onLoadPtCheckboxChange();
    },

    _onLoadPtCheckboxChange() {
        const cbs = document.querySelectorAll('.cad-load-pt-cb:checked');
        this._updateLoadPointsCount(cbs.length);
    },

    _updateLoadPointsCount(count) {
        const el = document.getElementById('cadLoadSelectedPointCount');
        if (el) el.innerText = count;
    },

    toggleSelectAllLoadPoints(selectAll) {
        const cbs = document.querySelectorAll('.cad-load-pt-cb');
        cbs.forEach(cb => { cb.checked = selectAll; });
        this._updateLoadPointsCount(selectAll ? cbs.length : 0);
    },

    confirmLoadProjectAsShape(mode = 'polygon') {
        const selProj = document.getElementById('cadLoadProjectSelect')?.value || AppState.currentProject;
        const allPts = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(selProj) : [];
        const checkedIdxs = Array.from(document.querySelectorAll('.cad-load-pt-cb:checked')).map(cb => parseInt(cb.value));

        if (checkedIdxs.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 mốc để nạp!", true);
            return;
        }

        const colorPalette = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16'];
        const customTargetName = document.getElementById('cadLoadTargetShapeName')?.value?.trim();

        // Kiểm tra xem các mốc được chọn có thuộc các khối khác nhau không
        const shapeGroups = new Map();
        let hasMultiShapes = false;

        checkedIdxs.forEach((idx, orderIdx) => {
            const p = allPts[idx];
            if (!p) return;
            const sName = p.shapeName || customTargetName || `Thửa ${this.savedShapes.length + 1}`;
            if (p.shapeName && !customTargetName) hasMultiShapes = true;

            if (!shapeGroups.has(sName)) {
                shapeGroups.set(sName, {
                    name: sName,
                    mode: p.shapeMode || mode,
                    color: p.shapeColor || null,
                    vertices: []
                });
            }

            const x = parseFloat(p.x);
            const y = parseFloat(p.y);
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);

            shapeGroups.get(sName).vertices.push({
                x, y, lat, lng,
                h: parseFloat(p.h || 0),
                name: p.name || `Đ${orderIdx + 1}`,
                isSnapped: true,
                snapSource: `Dự án: ${selProj}`,
                shapeName: sName,
                shapeMode: p.shapeMode || mode
            });
        });

        // Nếu người dùng chỉ định tên khối cụ thể hoặc mốc không mang thông tin khối riêng
        if (!hasMultiShapes || customTargetName) {
            const finalName = customTargetName || `Thửa ${this.savedShapes.length + 1}`;
            const vertices = [];
            checkedIdxs.forEach((idx, orderIdx) => {
                const p = allPts[idx];
                if (!p) return;
                vertices.push({
                    x: parseFloat(p.x),
                    y: parseFloat(p.y),
                    lat: parseFloat(p.lat),
                    lng: parseFloat(p.lng),
                    h: parseFloat(p.h || 0),
                    name: p.name || `Đ${orderIdx + 1}`,
                    isSnapped: true,
                    snapSource: `Dự án: ${selProj}`,
                    shapeName: finalName,
                    shapeMode: mode
                });
            });

            if (mode === 'polygon' && vertices.length < 3) {
                showToast("⚠️ Cần ít nhất 3 mốc để tạo đa giác ranh khép kín!", true);
                return;
            }

            const shapeColor = colorPalette[this.savedShapes.length % colorPalette.length];
            const shape = {
                id: 'proj_shape_' + Date.now(),
                name: finalName,
                shortName: finalName,
                mode: mode,
                vertices: vertices,
                color: shapeColor,
                selected: true,
                stats: this.calculateAreaAndPerimeter(vertices, mode)
            };
            this.savedShapes.push(shape);
            showToast(`✓ Đã nạp ${vertices.length} mốc từ "${selProj}" thành khối [${mode === 'polygon' ? 'Đa giác' : 'Tuyến'}]: "${finalName}"!`);
        } else {
            // Tự động phân tách nạp thành các khối riêng biệt theo đúng ranh thửa của từng khối
            let loadedShapesCount = 0;
            let loadedVertCount = 0;

            shapeGroups.forEach((sObj, sName) => {
                if (sObj.vertices.length >= 2) {
                    const sMode = (sObj.vertices.length < 3 && sObj.mode === 'polygon') ? 'polyline' : sObj.mode;
                    const sColor = sObj.color || colorPalette[(this.savedShapes.length + loadedShapesCount) % colorPalette.length];
                    const shape = {
                        id: 'proj_shape_' + Date.now() + '_' + loadedShapesCount,
                        name: sName,
                        shortName: sName,
                        mode: sMode,
                        vertices: sObj.vertices,
                        color: sColor,
                        selected: true,
                        stats: this.calculateAreaAndPerimeter(sObj.vertices, sMode)
                    };
                    this.savedShapes.push(shape);
                    loadedShapesCount++;
                    loadedVertCount += sObj.vertices.length;
                }
            });

            showToast(`✓ Đã tự động phân tách nạp thành công ${loadedShapesCount} khối (${loadedVertCount} đỉnh) từ "${selProj}"!`);
        }

        this.renderGeometry();
        this.renderBlocksPanel();
        if (this.redrawAllShapes) this.redrawAllShapes();
        this.updateUi();
        this.saveShapesForProject(AppState.currentProject);
        this.persistSession();
        this.closeLoadProjectModal();
    },

    confirmLoadProjectAsSnap() {
        const selProj = document.getElementById('cadLoadProjectSelect')?.value || AppState.currentProject;
        AppState.currentProject = selProj;
        localStorage.setItem('vn2k_cur_project', AppState.currentProject);
        appMap.loadProjectMarkers();
        appMap.fitProjectBounds();
        this.closeLoadProjectModal();
        showToast(`🧲 Đã hiển thị các mốc của dự án "${selProj}" lên bản đồ để bắt điểm (Snap)!`);
    },

    openAreaTableModal(action = null) {
        if (document.getElementById("modalCadExportConfig")) document.getElementById("modalCadExportConfig").classList.remove("active");
        setTimeout(() => this.checkScalePaperFit(), 50);
        const allShapes = [];
        this.savedShapes.forEach((s, idx) => {
            // Luôn đảm bảo s.stats đồng bộ mới nhất 100% với các đỉnh thực tế
            s.stats = this.calculateAreaAndPerimeter(s.vertices, s.mode, true);
            allShapes.push({
                id: s.id,
                name: s.name,
                shortName: s.shortName || `Thửa ${idx + 1}`,
                symbol: s.symbol || String(idx + 1),
                mode: s.mode,
                vertices: s.vertices,
                stats: s.stats,
                color: s.color || '#10b981'
            });
        });
        if (this.vertices.length >= 2) {
            const actStats = this.calculateAreaAndPerimeter();
            const actIdx = allShapes.length + 1;
            allShapes.push({
                id: 'active_drawing',
                name: `Cấu trúc ${actIdx} (Đang vẽ)`,
                shortName: `Thửa ${actIdx} (Đang vẽ)`,
                mode: this.mode,
                vertices: [...this.vertices],
                stats: actStats,
                color: '#06b6d4'
            });
        }

        if (allShapes.length === 0) {
            showToast("⚠️ Chưa có cấu trúc hoặc đỉnh nào để lập bảng diện tích và tọa độ ranh!", true);
            return;
        }

        const totalArea = allShapes.reduce((sum, s) => sum + (s.stats?.area || 0), 0);
        const totalHa = totalArea / 10000.0;
        const totalPerimeter = allShapes.reduce((sum, s) => sum + (s.stats?.perimeter || 0), 0);
        const totalVertices = allShapes.reduce((sum, s) => sum + s.vertices.length, 0);
        // Khôi phục các thông tin tiêu đề bản vẽ & dự án đã lưu từ localStorage
        try {
            const savedMetaStr = localStorage.getItem('vn2k_cad_meta_saved');
            const savedMeta = savedMetaStr ? JSON.parse(savedMetaStr) : null;
            const curProj = AppState.currentProject.replace(/\.[^/.]+$/, "");

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) el.value = val;
            };

            setVal('cadExportDrawingName', savedMeta?.drawingName || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT');
            setVal('cadExportProjectName', savedMeta?.projectName || curProj);
            setVal('cadExportOrganization', savedMeta?.organization || '');
            setVal('cadExportOwner', savedMeta?.owner || '');
            setVal('cadExportParcelNo', savedMeta?.parcelNo || '');
            setVal('cadExportAddress', savedMeta?.address || AppState.provinceName || '');
            setVal('cadExportSurveyor', savedMeta?.surveyor || '');
            setVal('cadExportChecker', savedMeta?.checker || '');
            setVal('cadExportDrawingCode', savedMeta?.drawingCode || 'SĐ-01/01');
            setVal('cadExportDate', new Date().toLocaleDateString('vi-VN'));
            if (savedMeta?.scaleVal) setVal('cadExportScale', savedMeta.scaleVal);
            if (savedMeta?.paper) setVal('cadExportPaperSize', savedMeta.paper);
        } catch (e) {}

        const elAreaM2 = document.getElementById('cadModalAreaM2');
        const elAreaHa = document.getElementById('cadModalAreaHa');
        const elPerim = document.getElementById('cadModalPerimeter');
        const elVCount = document.getElementById('cadModalVertexCount');
        const elKtt = document.getElementById('cadModalKtt');

        if (elAreaM2) elAreaM2.innerText = `${totalArea.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
        if (elAreaHa) elAreaHa.innerText = `≈ ${totalHa.toFixed(4)} ha (${allShapes.length} cấu trúc)`;
        if (elPerim) elPerim.innerText = `${totalPerimeter.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
        if (elVCount) elVCount.innerText = `${totalVertices} đỉnh (${allShapes.length} thửa)`;
        if (elKtt) elKtt.innerText = `KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}' (${AppState.provinceName || 'VN-2000'})`;

        const tbody = document.getElementById('cadTableBody');
        if (tbody) {
            let html = '';
            allShapes.forEach((shape) => {
                const isPoly = shape.mode === 'polygon' && shape.vertices.length >= 3;
                html += `
                    <tr style="background: rgba(15, 23, 42, 0.95); border-top: 2px solid ${shape.color};">
                        <td colspan="7" style="color: ${shape.color}; font-weight: 800; font-size: 11.5px; padding: 7px 10px;">
                            📁 ${shape.name} [${isPoly ? 'Đa giác' : 'Tuyến'}] • S = ${shape.stats?.areaFormatted || 0} m² (${shape.stats?.haFormatted || 0} ha) • P = ${shape.stats?.perimeterFormatted || 0} m
                        </td>
                    </tr>
                `;
                shape.vertices.forEach((v, idx) => {
                    const edge = shape.stats?.edges ? shape.stats.edges[idx] : null;
                    const edgeLenStr = edge ? edge.lengthFormatted : '--';
                    const azStr = edge ? edge.azFormatted : '--';
                    const noteStr = v.isSnapped ? `<span style="color:#fbbf24;">🧲 ${v.snapSource || 'Hít mốc'}</span>` : '<span style="color:#94a3b8;">Vẽ tự do</span>';

                    html += `
                        <tr>
                            <td style="text-align: center; color: #94a3b8;">${idx + 1}</td>
                            <td style="text-align: left; font-weight: 700; color: #38bdf8;">${v.name}</td>
                            <td style="text-align: right; padding-right: 12px; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${(v.x || 0).toFixed(3)}</td>
                            <td style="text-align: right; padding-right: 12px; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${(v.y || 0).toFixed(3)}</td>
                            <td style="text-align: right; padding-right: 12px; color: #6ee7b7; font-weight: 600; font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${edgeLenStr}</td>
                            <td style="text-align: right; padding-right: 12px; color: #cbd5e1; font-family: ui-monospace, monospace;">${azStr}</td>
                            <td style="text-align: center; font-size: 10px;">${noteStr}</td>
                        </tr>
                    `;
                });
            });

            if (allShapes.length > 1) {
                html += `
                    <tr class="total-row" style="background: rgba(30, 41, 59, 1); font-size: 11.5px; border-top: 2px solid #38bdf8;">
                        <td colspan="2" style="text-align: center; color: #38bdf8; font-weight: 800;">TỔNG CỘNG (${allShapes.length} THỬA)</td>
                        <td colspan="2" style="color: #4ade80;"><b>TỔNG DIỆN TÍCH: ${totalArea.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²</b> (${totalHa.toFixed(4)} ha)</td>
                        <td colspan="3" style="color: #fbbf24;"><b>TỔNG CHU VI: ${totalPerimeter.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m</b></td>
                    </tr>
                `;
            }

            tbody.innerHTML = html;
        }

        // Render bảng khối 2D với tên chỉnh sửa được
        this.renderBlockList(allShapes);

        const modal = document.getElementById('modalCadAreaTable');
        if (modal) {
            modal.style.display = 'flex';
            if (action === 'dxf') {
                setTimeout(() => {
                    const exportSec = document.getElementById('cadExportDrawingName');
                    if (exportSec) exportSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showToast("ℹ️ Vui lòng kiểm tra thông tin bản vẽ và nhấn 'AutoCAD DXF' để tải file.");
                }, 150);
            }
        }
    },

    // === BẢNG DANH SÁCH KHỐI 2D VỚI TÊN CHỈNH SỬA ĐƯỢC ===
    renderBlockList(allShapes) {
        const container = document.getElementById('cadBlockList');
        const totalAreaEl = document.getElementById('cadBlockTotalArea');
        const totalHaEl = document.getElementById('cadBlockTotalHa');
        const totalPctEl = document.getElementById('cadBlockTotalPercent');
        const customAreaInput = document.getElementById('cadCustomProjectArea');
        const showPctCheck = document.getElementById('cadShowPercentRatio');

        if (!container) return;

        if (showPctCheck) {
            showPctCheck.checked = this.showPercentRatio !== false;
        }

        if (!allShapes || allShapes.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#64748b; font-size:11px; padding:12px;">Chưa có khối nào được tạo</div>`;
            if (totalAreaEl) totalAreaEl.textContent = '— m²';
            if (totalHaEl) totalHaEl.textContent = '— ha';
            if (totalPctEl) totalPctEl.textContent = '— %';
            return;
        }

        // Tính tổng diện tích đo thực tế của các khối polygon được chọn
        let measuredTotalArea = 0;
        allShapes.forEach(s => {
            if (s.selected !== false && s.mode === 'polygon') {
                measuredTotalArea += (s.stats?.area || 0);
            }
        });

        // Diện tích cơ sở dùng để tính tỉ lệ %: Nếu người dùng nhập custom thì ưu tiên, nếu không dùng tổng đo thực tế
        const baseProjectArea = (this.customProjectArea && this.customProjectArea > 0) ? this.customProjectArea : measuredTotalArea;

        if (customAreaInput && !customAreaInput.matches(':focus')) {
            if (this.customProjectArea) {
                customAreaInput.value = this.customProjectArea;
            } else if (measuredTotalArea > 0) {
                customAreaInput.placeholder = `Đo: ${measuredTotalArea.toFixed(2)} m²`;
            }
        }

        const allSelected = allShapes.every(s => s.selected !== false);
        const showPct = this.showPercentRatio !== false;

        let html = '';
        html += `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:rgba(30,41,59,0.7); border-radius:4px; margin-bottom:4px; font-size:11px; flex-wrap:wrap; gap:4px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:#38bdf8; font-weight:700;">
                <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="appCadTool.toggleSelectAllBlocks(this.checked)" style="accent-color:#38bdf8; width:14px; height:14px;">
                <span>Chọn tất cả (${allShapes.filter(s => s.selected !== false).length}/${allShapes.length} khối)</span>
            </label>
            <span style="font-size:10px; color:#94a3b8;">Có thể click vào Tên & Diện tích để chỉnh sửa số liệu</span>
        </div>`;

        allShapes.forEach((s, idx) => {
            const isPoly = s.mode === 'polygon';
            const isSelected = s.selected !== false;
            const area = s.stats?.area || 0;
            const perim = s.stats?.perimeter || 0;
            const isActive = s.id === 'active_draft';

            let pctStr = '--';
            let pctNum = 0;
            if (isPoly && baseProjectArea > 0) {
                pctNum = (area / baseProjectArea) * 100.0;
                pctStr = pctNum.toFixed(2) + '%';
            }

            html += `
            <div style="display:flex; align-items:center; gap:6px; padding:5px 8px; background:${isSelected ? 'rgba(30,41,59,0.75)' : 'rgba(30,41,59,0.3)'}; border:1px solid ${isSelected ? 'rgba(56,189,248,0.25)' : 'rgba(100,116,139,0.2)'}; border-radius:6px; font-size:11.5px; opacity:${isSelected ? '1' : '0.6'}; flex-wrap:wrap;">
                <input type="checkbox" ${isSelected ? 'checked' : ''} 
                    onchange="appCadTool.toggleBlockSelect(${idx}, this.checked)"
                    title="Tích chọn để xuất bản đồ"
                    style="accent-color:#38bdf8; width:14px; height:14px; cursor:pointer; flex:none;">
                <span style="width:10px; height:10px; border-radius:50%; background:${s.color || '#38bdf8'}; flex:none;"></span>
                <span style="font-size:10px; color:#94a3b8; font-weight:700; width:18px; flex:none;">#${idx + 1}</span>
                <input type="text" value="${s.symbol || (idx + 1)}"
                    style="width:36px; height:24px; text-align:center; font-size:11px; font-weight:800; color:#38bdf8; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.35); border-radius:4px; padding:0 2px; flex:none;"
                    onchange="appCadTool.setBlockSymbol(${idx}, this.value)"
                    title="Ký hiệu khối / STT hiển thị trên bản vẽ">
                <input type="text" value="${s.name || ''}" 
                    style="flex:1; min-width:80px; height:24px; font-size:11.5px; font-weight:600; color:#f8fafc; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.3); border-radius:4px; padding:0 6px;"
                    onchange="appCadTool.renameBlock(${idx}, this.value)"
                    title="Click để đổi tên khối">
                
                
                ${isPoly ? `
                    <div style="display:flex; align-items:center; gap:2px; flex:none;">
                        <input type="number" step="0.01" value="${area.toFixed(2)}"
                            style="width:80px; height:24px; font-size:11px; font-weight:700; color:#4ade80; background:rgba(15,23,42,0.85); border:1px solid rgba(74,222,128,0.35); border-radius:4px; padding:0 4px; text-align:right;"
                            ${isActive ? 'readonly' : `onchange="appCadTool.editBlockArea(${idx}, this.value)"`}
                            title="${isActive ? 'Khối đang vẽ dở' : 'Chỉnh sửa diện tích làm đẹp số liệu'}">
                        <span style="font-size:10.5px; color:#4ade80; font-weight:700;">m²</span>
                    </div>
                    <span style="font-size:10px; color:#a7f3d0; flex:none; min-width:55px; text-align:right;">${(area/10000).toFixed(4)} ha</span>
                    ${showPct ? `
                        <span style="display:inline-block; padding:1px 6px; font-size:10.5px; font-weight:800; color:#facc15; background:rgba(250,204,21,0.15); border:1px solid rgba(250,204,21,0.3); border-radius:4px; min-width:52px; text-align:center; flex:none;" title="Tỉ lệ so với tổng diện tích dự án">
                            ${pctStr}
                        </span>
                    ` : ''}
                ` : `
                    <span style="font-size:11px; color:#38bdf8; font-weight:700; flex:none;">L = ${perim.toFixed(2)} m</span>
                    ${showPct ? `<span style="font-size:10px; color:#64748b; min-width:52px; text-align:center;">Tuyến</span>` : ''}
                `}
            </div>`;
        });

        container.innerHTML = html;

        const totalFmt = measuredTotalArea.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (totalAreaEl) totalAreaEl.textContent = totalFmt + ' m²';
        if (totalHaEl) totalHaEl.textContent = (measuredTotalArea / 10000).toFixed(4) + ' ha';

        if (totalPctEl) {
            if (showPct) {
                totalPctEl.style.display = 'inline-block';
                if (baseProjectArea > 0) {
                    const totalPctNum = (measuredTotalArea / baseProjectArea) * 100.0;
                    totalPctEl.textContent = totalPctNum.toFixed(2) + '%';
                } else {
                    totalPctEl.textContent = '100.00%';
                }
            } else {
                totalPctEl.style.display = 'none';
            }
        }
    },

    renderBlocksPanel() {
        this.initDraggablePanel();
        const panel = document.getElementById('cadBlocksStatsPanel');
        const listEl = document.getElementById('cadPanelBlocksList');
        const countBadge = document.getElementById('cadPanelShapeCountBadge');
        const totalAreaBadge = document.getElementById('cadPanelTotalAreaBadge');
        const tbCount = document.getElementById('cadToolbarBlockCount');

        const shapes = this.savedShapes || [];
        if (tbCount) tbCount.innerText = shapes.length;

        if (!panel || !listEl) return;

        const selectedCount = shapes.filter(s => s.selected !== false).length;
        if (countBadge) countBadge.innerText = `${selectedCount}/${shapes.length} khối`;

        let totalArea = 0;
        let totalPerim = 0;

        let content = '';
        if (shapes.length === 0) {
            content = `<div style="text-align:center; color:#64748b; font-size:11px; padding:14px 6px;">
                Chưa có khối nào được lưu.<br>Vẽ các đỉnh rồi bấm <b style="color:#a7f3d0;">[Lưu & Vẽ mới]</b> để tạo khối!
            </div>`;
        } else {
            const allSelected = shapes.length > 0 && shapes.every(s => s.selected !== false);
            content += `
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px; padding:2px 4px; background:rgba(30,41,59,0.5); border-radius:4px; font-size:10.5px;">
                <label style="display:flex; align-items:center; gap:5px; cursor:pointer; color:#94a3b8; font-weight:600;">
                    <input type="checkbox" ${allSelected ? 'checked' : ''} onchange="appCadTool.toggleSelectAllBlocks(this.checked)" style="accent-color:#38bdf8; width:13px; height:13px;">
                    <span>Chọn xuất (${selectedCount}/${shapes.length})</span>
                </label>
                <span style="font-size:9.5px; color:#64748b;">✏️ Sửa số để làm đẹp</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px;">`;

            shapes.forEach((s, idx) => {
                const isPoly = s.mode === 'polygon';
                const isSelected = s.selected !== false;
                const area = s.stats?.area || 0;
                const perim = s.stats?.perimeter || 0;
                if (isSelected) {
                    totalArea += area;
                    totalPerim += perim;
                }

                content += `
                <div style="display:flex; align-items:center; gap:4px; background:${isSelected ? 'rgba(30,41,59,0.85)' : 'rgba(30,41,59,0.35)'}; border:1px solid ${isSelected ? 'rgba(56,189,248,0.25)' : 'rgba(100,116,139,0.2)'}; border-radius:6px; padding:3px 5px; opacity:${isSelected ? '1' : '0.65'};">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} 
                        onchange="appCadTool.toggleBlockSelect(${idx}, this.checked)" 
                        title="Tích chọn khối này để xuất bản đồ/bản vẽ"
                        style="accent-color:#38bdf8; width:13px; height:13px; cursor:pointer; flex:none;">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${s.color || '#38bdf8'}; flex:none;"></span>
                    <input type="text" value="${s.symbol || (idx + 1)}" 
                        style="width:28px; height:20px; font-size:10px; font-weight:800; color:#38bdf8; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.25); border-radius:3px; padding:0 2px; text-align:center; flex:none;"
                        onchange="appCadTool.setBlockSymbol(${idx}, this.value)"
                        title="Ký hiệu khối / STT trên bản vẽ">
                    <input type="text" value="${s.name || ''}" 
                        style="flex:1; min-width:65px; height:20px; font-size:10.5px; font-weight:600; color:#f8fafc; background:rgba(15,23,42,0.85); border:1px solid rgba(56,189,248,0.25); border-radius:3px; padding:0 4px;"
                        onchange="appCadTool.renameBlock(${idx}, this.value)"
                        title="Đổi tên khối">
                    <div style="display:flex; align-items:center; gap:2px; flex:none;">
                        ${isPoly ? `
                            <input type="number" step="0.01" value="${area.toFixed(2)}"
                                style="width:62px; height:20px; font-size:10px; font-weight:700; color:#4ade80; background:rgba(15,23,42,0.85); border:1px solid rgba(74,222,128,0.3); border-radius:3px; padding:0 3px; text-align:right;"
                                onchange="appCadTool.editBlockArea(${idx}, this.value)"
                                title="Chỉnh sửa diện tích khối này để làm đẹp số liệu">
                            <span style="font-size:9.5px; color:#4ade80; font-weight:600;">m²</span>
                        ` : `
                            <span style="font-size:10px; font-weight:700; color:#38bdf8;">${perim.toFixed(1)}m</span>
                        `}
                    </div>
                    <button onclick="appCadTool.zoomToShape(${idx})" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:11px; padding:1px; flex:none;" title="Thu phóng đến khối này">🔍</button>
                    <button onclick="appCadTool.continueShape(${idx})" style="background:none; border:none; color:#38bdf8; cursor:pointer; font-size:11px; padding:1px; flex:none;" title="Tiếp tục vẽ / bổ sung đỉnh cho khối này">✏️</button>
                    <button onclick="appCadTool.deleteShape(${idx})" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:11px; padding:1px; flex:none;" title="Xóa khối này">🗑️</button>
                </div>`;
            });
            content += `</div>`;
        }

        // Trạng thái nét đang vẽ dở nếu có
        if (this.vertices && this.vertices.length >= 2) {
            const curStats = this.calculateAreaAndPerimeter();
            const isPoly = this.mode === 'polygon';
            content += `
            <div style="margin-top:6px; padding:4px 6px; background:rgba(6,182,212,0.12); border:1px dashed #06b6d4; border-radius:6px; font-size:10.5px; color:#67e8f9; display:flex; align-items:center; justify-content:space-between;">
                <span>✏️ <b>Đang vẽ:</b> ${this.vertices.length} đỉnh</span>
                <span style="font-weight:700;">${isPoly ? curStats.areaFormatted + ' m²' : curStats.perimeterFormatted + ' m'}</span>
            </div>`;
        }

        listEl.innerHTML = content;

        const totalHa = (totalArea / 10000.0).toFixed(4);
        if (totalAreaBadge) {
            totalAreaBadge.innerText = `${totalArea.toFixed(1)} m² (${totalHa} ha)`;
        }
    },

    toggleBlocksPanel() {
        const panel = document.getElementById('cadBlocksStatsPanel');
        if (!panel) return;
        const isShown = panel.style.display !== 'none';
        panel.style.display = isShown ? 'none' : 'block';
        if (!isShown) {
            this.renderBlocksPanel();
        }
    },

    continueShape(index) {
        if (!this.savedShapes || !this.savedShapes[index]) return;
        const s = this.savedShapes[index];
        if (this.vertices && this.vertices.length > 0) {
            if (!confirm(`Bạn đang có nét vẽ dở (${this.vertices.length} đỉnh). Tiếp tục vẽ khối "${s.name}" sẽ nạp các đỉnh của khối này vào nét vẽ hiện tại. Bạn có muốn tiếp tục?`)) {
                return;
            }
        }
        this.pushHistoryState(`Tiếp tục vẽ khối "${s.name}"`);
        this.vertices = [...s.vertices];
        this.mode = s.mode || 'polygon';
        this.isActive = true;
        this.savedShapes.splice(index, 1);
        const nameInput = document.getElementById('cadActiveShapeName');
        if (nameInput) {
            nameInput.value = s.name || '';
        }
        this.renderGeometry();
        this.updateUi();
        this.renderBlocksPanel();
        showToast(`✏️ Đang tiếp tục vẽ khối "${s.name}". Hãy nhấp trên bản đồ để thêm đỉnh hoặc khép góc.`);
    },

    deleteShape(index, skipConfirm = false) {
        if (!this.savedShapes || !this.savedShapes[index]) return;
        const name = this.savedShapes[index].name || this.savedShapes[index].shortName || 'Khối';
        if (!skipConfirm && !confirm(`Bạn có chắc muốn xóa khối "${name}" không?`)) return;
        this.pushHistoryState(`Xóa khối "${name}"`);
        this.savedShapes.splice(index, 1);
        this.saveShapesForProject(AppState.currentProject);
        this.persistSession();
        this.deselectCurrent();
        this.renderGeometry();
        this.updateUi();
        this.renderBlocksPanel();
        if (document.getElementById('modalCadAreaTable')?.style.display !== 'none') {
            this.openAreaTableModal();
        }
        showToast(`🗑️ Đã xóa khối "${name}"`);
    },

    zoomToShape(index) {
        if (!this.savedShapes || !this.savedShapes[index] || !AppState.leafletMap) return;
        const pts = this.savedShapes[index].vertices;
        if (!pts || pts.length === 0) return;
        const coords = pts.map(p => [parseFloat(p.lat), parseFloat(p.lng)]).filter(c => !isNaN(c[0]) && !isNaN(c[1]));
        if (coords.length > 0) {
            AppState.leafletMap.fitBounds(coords, { padding: [60, 60], maxZoom: 23 });
            showToast(`🔍 Thu phóng đến khối: "${this.savedShapes[index].name}"`);
        }
    },

    zoomIn() {
        if (!AppState.leafletMap) return;
        AppState.leafletMap.zoomIn();
    },

    zoomOut() {
        if (!AppState.leafletMap) return;
        AppState.leafletMap.zoomOut();
    },

    zoomMax() {
        if (!AppState.leafletMap) return;
        const map = AppState.leafletMap;
        let center = null;
        if (this.vertices && this.vertices.length > 0) {
            const last = this.vertices[this.vertices.length - 1];
            center = [last.lat, last.lng];
        } else if (this.savedShapes && this.savedShapes.length > 0) {
            const lastShape = this.savedShapes[this.savedShapes.length - 1];
            if (lastShape.vertices && lastShape.vertices.length > 0) {
                center = [lastShape.vertices[0].lat, lastShape.vertices[0].lng];
            }
        }
        if (!center) center = map.getCenter();
        map.setView(center, 23);
        showToast("🔍 Đã phóng to cực đại (Mức 23 - Chuẩn từng centimet, không bị hút điểm nhầm)");
    },

    zoomExtents() {
        if (!AppState.leafletMap) return;
        const coords = [];
        if (this.vertices && this.vertices.length > 0) {
            this.vertices.forEach(v => {
                if (isFinite(v.lat) && isFinite(v.lng)) coords.push([v.lat, v.lng]);
            });
        }
        if (this.savedShapes && this.savedShapes.length > 0) {
            this.savedShapes.forEach(s => {
                (s.vertices || []).forEach(v => {
                    if (isFinite(v.lat) && isFinite(v.lng)) coords.push([v.lat, v.lng]);
                });
            });
        }
        if (this.annotations && this.annotations.length > 0) {
            this.annotations.forEach(a => {
                if (isFinite(a.lat) && isFinite(a.lng)) coords.push([a.lat, a.lng]);
                if (isFinite(a.startLat) && isFinite(a.startLng)) coords.push([a.startLat, a.startLng]);
                if (isFinite(a.endLat) && isFinite(a.endLng)) coords.push([a.endLat, a.endLng]);
            });
        }
        if (coords.length > 0) {
            AppState.leafletMap.fitBounds(coords, { padding: [60, 60], maxZoom: 22 });
            showToast("🔍 Zoom Extents: Hiển thị toàn cảnh bản vẽ [Z / Chuột giữa x2]");
        } else {
            showToast("⚠️ Chưa có đối tượng nào trên bản vẽ để Zoom Extents");
        }
    },

    renameBlock(idx, newName) {
        // Tính số savedShapes (không tính active_draft)
        const saved = this.savedShapes || [];
        if (idx < saved.length) {
            saved[idx].name = newName.trim() || `Thửa ${idx + 1}`;
            // Cập nhật lại label trên bản đồ nếu có
            if (this.layers && this.layers.centerLabel) {
                this.updateUi && this.updateUi();
            }
        }
        // Nếu là active draft (idx >= saved.length) thì không rename
    },

    closeAreaTableModal() {
        const modal = document.getElementById('modalCadAreaTable');
        if (modal) modal.style.display = 'none';
    },

    // Nhập dữ liệu hình vẽ / thửa đất từ file Excel (.xls, .xlsx) hoặc CSV
    importExcel(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                let shapes = [];

                if (typeof XLSX !== 'undefined') {
                    try {
                        const wb = XLSX.read(buffer, { type: 'array' });
                        shapes = this._parseWorkbookToShapes(wb, file.name);
                    } catch (wbErr) {
                        console.warn("SheetJS array parse warning:", wbErr);
                    }
                }

                // Nếu không có kết quả từ SheetJS, thử phân tích dạng text/HTML
                if (!shapes || shapes.length === 0) {
                    const text = new TextDecoder('utf-8').decode(buffer);
                    if (text) {
                        shapes = this._parseHtmlOrTextToShapes(text, file.name);
                    }
                }

                if (!shapes || shapes.length === 0) {
                    showToast("⚠️ Không tìm thấy bảng kê tọa độ hợp lệ nào trong file! Vui lòng kiểm tra định dạng file.", true);
                    return;
                }

                this._applyImportedShapes(shapes, file.name);
            } catch (err) {
                console.error("Lỗi khi đọc file Excel:", err);
                showToast("❌ Có lỗi xảy ra khi phân tích file Excel: " + (err.message || err), true);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = "";
    },

    _parseWorkbookToShapes(wb, fileName = '') {
        const shapes = [];
        if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) return shapes;

        // --- CHIẾN LƯỢC 1: Tìm sheet master tổng hợp chi tiết (Có cột "Tên Khối" hoặc "Tên Thửa") ---
        for (const sname of wb.SheetNames) {
            const sheet = wb.Sheets[sname];
            if (!sheet) continue;
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!rows || rows.length < 2) continue;

            let headerRowIdx = -1;
            let colShape = -1, colMode = -1, colColor = -1, colName = -1, colX = -1, colY = -1, colLat = -1, colLng = -1, colH = -1, colNote = -1;

            for (let r = 0; r < Math.min(rows.length, 6); r++) {
                const row = rows[r];
                if (!Array.isArray(row)) continue;

                row.forEach((cell, cIdx) => {
                    const s = String(cell || '').toLowerCase().trim();
                    if (colShape === -1 && (s.includes('tên khối') || s.includes('tên thửa') || s === 'khối' || s === 'thửa' || s.includes('khối /') || s.includes('thửa /') || s === 'layer')) colShape = cIdx;
                    if (colMode === -1 && (s.includes('loại hình') || s.includes('chế độ') || s === 'loại' || s === 'mode')) colMode = cIdx;
                    if (colColor === -1 && (s.includes('màu sắc') || s.includes('mã màu') || s === 'màu' || s === 'color')) colColor = cIdx;
                    if (colName === -1 && (s.includes('tên đỉnh') || s.includes('tên mốc') || s.includes('tên điểm') || s === 'đỉnh' || s === 'mốc' || s === 'point' || s === 'name')) colName = cIdx;
                    if (colX === -1 && (s.includes('tọa độ x') || s.includes('x (bắc') || s.includes('x(bắc') || s.includes('x [m]') || s === 'x' || s.includes('north'))) colX = cIdx;
                    if (colY === -1 && (s.includes('tọa độ y') || s.includes('y (đông') || s.includes('y(đông') || s.includes('y [m]') || s === 'y' || s.includes('east'))) colY = cIdx;
                    if (colLat === -1 && (s.includes('vĩ độ') || s.includes('lat'))) colLat = cIdx;
                    if (colLng === -1 && (s.includes('kinh độ') || s.includes('lng') || s.includes('lon') || s.includes('long'))) colLng = cIdx;
                    if (colH === -1 && (s.includes('cao độ') || s.includes('h (m') || s === 'h' || s === 'z' || s === 'elev')) colH = cIdx;
                    if (colNote === -1 && (s.includes('ghi chú') || s.includes('bắt điểm') || s.includes('note') || s.includes('desc'))) colNote = cIdx;
                });

                if (colShape !== -1 && ((colX !== -1 && colY !== -1) || (colLat !== -1 && colLng !== -1))) {
                    headerRowIdx = r;
                    break;
                }
            }

            if (headerRowIdx !== -1 && colShape !== -1) {
                const shapeMap = new Map();

                for (let r = headerRowIdx + 1; r < rows.length; r++) {
                    const row = rows[r];
                    if (!Array.isArray(row) || row.length === 0) continue;
                    const rowText = row.join(' ').toLowerCase();
                    if (rowText.includes('tổng cộng') || rowText.includes('tiểu kế')) continue;

                    const shapeName = String(row[colShape] || '').trim();
                    if (!shapeName) continue;

                    let x = colX !== -1 ? parseFloat(String(row[colX] || 0).replace(',', '.')) : 0;
                    let y = colY !== -1 ? parseFloat(String(row[colY] || 0).replace(',', '.')) : 0;
                    let lat = colLat !== -1 ? parseFloat(String(row[colLat] || 0).replace(',', '.')) : 0;
                    let lng = colLng !== -1 ? parseFloat(String(row[colLng] || 0).replace(',', '.')) : 0;
                    let h = colH !== -1 ? parseFloat(String(row[colH] || 0).replace(',', '.')) : 0;

                    if (isNaN(x)) x = 0; if (isNaN(y)) y = 0; if (isNaN(lat)) lat = 0; if (isNaN(lng)) lng = 0; if (isNaN(h)) h = 0;
                    if ((x === 0 && y === 0) && (lat === 0 && lng === 0)) continue;

                    if ((lat === 0 && lng === 0) && (x !== 0 && y !== 0)) {
                        try {
                            const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                            lat = parseFloat(wgs.lat.toFixed(7));
                            lng = parseFloat(wgs.lng.toFixed(7));
                        } catch(e) {}
                    } else if ((x === 0 && y === 0) && (lat !== 0 && lng !== 0)) {
                        try {
                            const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                            x = parseFloat(vn2k.X.toFixed(3));
                            y = parseFloat(vn2k.Y.toFixed(3));
                        } catch(e) {}
                    }

                    let shapeObj = shapeMap.get(shapeName);
                    if (!shapeObj) {
                        const modeVal = colMode !== -1 ? String(row[colMode] || '').toLowerCase() : '';
                        const isPoly = !modeVal.includes('tuyến') && !modeVal.includes('polyline');
                        const colorVal = colColor !== -1 ? String(row[colColor] || '').trim() : '';
                        shapeObj = {
                            name: shapeName,
                            mode: isPoly ? 'polygon' : 'polyline',
                            color: colorVal.startsWith('#') ? colorVal : null,
                            vertices: []
                        };
                        shapeMap.set(shapeName, shapeObj);
                    }

                    const vName = colName !== -1 && row[colName] ? String(row[colName]).trim() : ("Đ" + (shapeObj.vertices.length + 1));
                    const note = colNote !== -1 ? String(row[colNote] || '').trim() : '';
                    const isSnapped = note.includes('Hít') || note.includes('Mốc') || note.includes('snap');

                    shapeObj.vertices.push({
                        name: vName, x, y, lat, lng, h,
                        isSnapped,
                        snapSource: isSnapped ? note : ("Excel: " + (fileName || 'File'))
                    });
                }

                for (const [sName, sObj] of shapeMap.entries()) {
                    if (sObj.vertices.length >= 2) {
                        if (sObj.vertices.length < 3 && sObj.mode === 'polygon') sObj.mode = 'polyline';
                        shapes.push(sObj);
                    }
                }

                if (shapes.length > 0) return shapes;
            }
        }

        // --- CHIẾN LƯỢC 2: Từng sheet là một khối hoặc các bảng khối nối tiếp nhau ---
        wb.SheetNames.forEach((sname, sheetIdx) => {
            const sheet = wb.Sheets[sname];
            if (!sheet) return;
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!rows || rows.length < 2) return;

            // Kiểm tra nếu sheet chỉ là Bảng tổng hợp diện tích không chứa tọa độ đỉnh
            const firstFewRowsStr = rows.slice(0, 4).map(r => (r || []).join(' ')).join(' ').toLowerCase();
            if (firstFewRowsStr.includes('bảng tổng hợp') || (firstFewRowsStr.includes('tổng hợp diện tích') && !firstFewRowsStr.includes('tọa độ x'))) {
                let hasCoords = rows.slice(0, 8).some(r => (r || []).join(' ').toLowerCase().match(/tọa độ x|x \(bắc|vĩ độ/));
                if (!hasCoords) return;
            }

            let currentShapeName = sname !== 'Sheet1' ? sname : (fileName ? fileName.replace(/\.[^/.]+$/, '') : ("Thửa " + (shapes.length + 1)));
            let currentIsPoly = true;
            let currentColor = null;
            let currentVertices = [];
            let colName = -1, colX = -1, colY = -1, colLat = -1, colLng = -1, colH = -1, colShape = -1, colMode = -1, colColor = -1, colNote = -1;
            let hasHeader = false;

            const flushCurrent = () => {
                if (currentVertices.length >= 2) {
                    const sName = currentShapeName || ("Thửa " + (shapes.length + 1));
                    shapes.push({
                        name: sName,
                        mode: (currentVertices.length >= 3 && currentIsPoly) ? 'polygon' : 'polyline',
                        color: currentColor,
                        vertices: currentVertices
                    });
                }
                currentVertices = [];
            };

            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                if (!Array.isArray(row) || row.length === 0) continue;

                const nonEmpties = row.map(c => String(c !== null && c !== undefined ? c : '').trim()).filter(c => c !== '');
                if (nonEmpties.length === 0) continue;

                const fullRowText = nonEmpties.join(' ').toLowerCase();

                // Dòng tiêu đề khối (Banner Row)
                if (nonEmpties.length <= 2) {
                    const firstCell = nonEmpties[0];
                    const lowerFirst = firstCell.toLowerCase();
                    if (lowerFirst.includes('diện tích') || lowerFirst.includes('chiều dài') || lowerFirst.includes('thửa') || lowerFirst.includes('khối') || lowerFirst.includes('tuyến')) {
                        flushCurrent();
                        const match = firstCell.match(/^([^—–\-|:]+)/);
                        currentShapeName = (match ? match[1] : firstCell).replace(/^(bảng kê tọa độ|bảng kê|thửa đất|khối|tên khối\s*:?)/i, '').trim();
                        currentIsPoly = !(lowerFirst.includes('tuyến') || lowerFirst.includes('chiều dài'));
                        const colorMatch = firstCell.match(/#[0-9a-fA-F]{6}/);
                        if (colorMatch) currentColor = colorMatch[0];
                        hasHeader = false;
                        continue;
                    }
                }

                // Dòng tiêu đề cột
                let tName = -1, tX = -1, tY = -1, tLat = -1, tLng = -1, tH = -1, tShape = -1, tMode = -1, tColor = -1, tNote = -1;
                row.forEach((cell, cIdx) => {
                    const s = String(cell || '').toLowerCase().trim();
                    if (tShape === -1 && (s.includes('tên khối') || s.includes('tên thửa') || s === 'khối' || s === 'thửa' || s === 'layer')) tShape = cIdx;
                    if (tMode === -1 && (s.includes('loại') || s.includes('chế độ'))) tMode = cIdx;
                    if (tColor === -1 && (s.includes('màu'))) tColor = cIdx;
                    if (tName === -1 && (s.includes('tên đỉnh') || s.includes('tên mốc') || s.includes('tên điểm') || s === 'đỉnh' || s === 'mốc' || s === 'name' || s === 'point')) tName = cIdx;
                    if (tX === -1 && (s.includes('tọa độ x') || s.includes('x (bắc') || s.includes('x(bắc') || s.includes('x [m]') || s === 'x' || s.includes('north'))) tX = cIdx;
                    if (tY === -1 && (s.includes('tọa độ y') || s.includes('y (đông') || s.includes('y(đông') || s.includes('y [m]') || s === 'y' || s.includes('east'))) tY = cIdx;
                    if (tLat === -1 && (s.includes('vĩ độ') || s.includes('lat'))) tLat = cIdx;
                    if (tLng === -1 && (s.includes('kinh độ') || s.includes('lng') || s.includes('lon') || s.includes('long'))) tLng = cIdx;
                    if (tH === -1 && (s.includes('cao độ') || s.includes('h (m') || s === 'h' || s === 'z' || s === 'elev')) tH = cIdx;
                    if (tNote === -1 && (s.includes('ghi chú') || s.includes('bắt điểm') || s.includes('note'))) tNote = cIdx;
                });

                if ((tX !== -1 && tY !== -1) || (tLat !== -1 && tLng !== -1)) {
                    colName = tName !== -1 ? tName : 1;
                    colX = tX;
                    colY = tY;
                    colLat = tLat;
                    colLng = tLng;
                    colH = tH;
                    colShape = tShape;
                    colMode = tMode;
                    colColor = tColor;
                    colNote = tNote;
                    hasHeader = true;
                    continue;
                }

                if (fullRowText.includes('tổng cộng') || fullRowText.includes('tiểu kế') || fullRowText.includes('trung bình')) continue;

                // Tự động nhận diện cột nếu không có tiêu đề
                if (!hasHeader) {
                    for (let c = 0; c < row.length - 1; c++) {
                        const v1 = parseFloat(String(row[c]).replace(',', '.'));
                        const v2 = parseFloat(String(row[c+1]).replace(',', '.'));
                        if (!isNaN(v1) && !isNaN(v2) && v1 > 1000 && v2 > 1000) {
                            colX = c;
                            colY = c + 1;
                            colName = (c > 0) ? (c - 1) : 0;
                            hasHeader = true;
                            break;
                        } else if (!isNaN(v1) && !isNaN(v2) && v1 >= 8 && v1 <= 24 && v2 >= 102 && v2 <= 110) {
                            colLat = c;
                            colLng = c + 1;
                            colName = (c > 0) ? (c - 1) : 0;
                            hasHeader = true;
                            break;
                        }
                    }
                }

                if (!hasHeader) continue;

                // Nếu có cột Tên Khối thay đổi giữa chừng
                if (colShape !== -1 && row[colShape]) {
                    const rowShapeName = String(row[colShape]).trim();
                    if (currentShapeName && currentShapeName !== rowShapeName) {
                        flushCurrent();
                    }
                    currentShapeName = rowShapeName;
                    if (colMode !== -1 && row[colMode]) {
                        currentIsPoly = !String(row[colMode]).toLowerCase().includes('tuyến');
                    }
                    if (colColor !== -1 && row[colColor] && String(row[colColor]).startsWith('#')) {
                        currentColor = String(row[colColor]).trim();
                    }
                }

                let name = (colName !== -1 && row[colName] !== undefined && row[colName] !== '') ? String(row[colName]).trim() : ("Đ" + (currentVertices.length + 1));
                let x = (colX !== -1) ? parseFloat(String(row[colX]).replace(',', '.')) : 0;
                let y = (colY !== -1) ? parseFloat(String(row[colY]).replace(',', '.')) : 0;
                let lat = (colLat !== -1) ? parseFloat(String(row[colLat]).replace(',', '.')) : 0;
                let lng = (colLng !== -1) ? parseFloat(String(row[colLng]).replace(',', '.')) : 0;
                let h = (colH !== -1) ? parseFloat(String(row[colH]).replace(',', '.')) : 0;

                if (isNaN(x)) x = 0; if (isNaN(y)) y = 0; if (isNaN(lat)) lat = 0; if (isNaN(lng)) lng = 0; if (isNaN(h)) h = 0;
                if ((x === 0 && y === 0) && (lat === 0 && lng === 0)) continue;

                if ((lat === 0 && lng === 0) && (x !== 0 && y !== 0)) {
                    try {
                        const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                        lat = parseFloat(wgs.lat.toFixed(7));
                        lng = parseFloat(wgs.lng.toFixed(7));
                    } catch(e) {}
                } else if ((x === 0 && y === 0) && (lat !== 0 && lng !== 0)) {
                    try {
                        const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                        x = parseFloat(vn2k.X.toFixed(3));
                        y = parseFloat(vn2k.Y.toFixed(3));
                    } catch(e) {}
                }

                const note = (colNote !== -1 && row[colNote]) ? String(row[colNote]).trim() : '';
                const isSnapped = note.includes('Hít') || note.includes('Mốc') || note.includes('snap');

                currentVertices.push({
                    name, x, y, lat, lng, h,
                    isSnapped,
                    snapSource: isSnapped ? note : ("Excel: " + (fileName || 'File'))
                });
            }

            flushCurrent();
        });

        return shapes;
    },

    _parseHtmlOrTextToShapes(text, fileName = '') {
        const shapes = [];
        if (!text) return shapes;

        // 1. Phân tích nếu là file HTML .xls
        if (text.includes('<table') && typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const tables = doc.querySelectorAll('table');

            tables.forEach((tbl, tIdx) => {
                const headerRow = tbl.querySelector('.shape-header') || tbl.querySelector('tr:first-child');
                const headerText = headerRow ? headerRow.textContent.trim() : '';
                if (headerText.toLowerCase().includes('bảng tổng hợp diện tích')) return;

                let sName = "Thửa " + (tIdx + 1);
                let isPoly = true;
                let sColor = null;

                if (headerRow) {
                    const dataName = headerRow.getAttribute('data-name');
                    const dataMode = headerRow.getAttribute('data-mode');
                    const dataColor = headerRow.getAttribute('data-color');

                    if (dataName) sName = dataName;
                    if (dataMode) isPoly = (dataMode === 'polygon');
                    if (dataColor) sColor = dataColor;

                    if (!dataName && headerText) {
                        const match = headerText.match(/^([^—–\-|:]+)/);
                        if (match) sName = match[1].replace(/^(bảng kê tọa độ|bảng kê|thửa đất|khối|tên khối\s*:?)/i, '').trim();
                        if (headerText.toLowerCase().includes('tuyến') || headerText.toLowerCase().includes('chiều dài')) {
                            isPoly = false;
                        }
                        const cMatch = headerText.match(/#[0-9a-fA-F]{6}/);
                        if (cMatch) sColor = cMatch[0];
                    }
                }

                const rows = tbl.querySelectorAll('tr');
                const vertices = [];
                let colName = 1, colX = 2, colY = 3, colLat = 6, colLng = 7, colH = -1;

                rows.forEach((r, rIdx) => {
                    const ths = r.querySelectorAll('th');
                    if (ths.length >= 3) {
                        ths.forEach((th, cIdx) => {
                            const txt = th.textContent.toLowerCase();
                            if (txt.includes('tên đỉnh')) colName = cIdx;
                            if (txt.includes('tọa độ x')) colX = cIdx;
                            if (txt.includes('tọa độ y')) colY = cIdx;
                            if (txt.includes('vĩ độ')) colLat = cIdx;
                            if (txt.includes('kinh độ')) colLng = cIdx;
                            if (txt.includes('cao độ') || txt === 'h') colH = cIdx;
                        });
                        return;
                    }

                    const tds = r.querySelectorAll('td');
                    if (tds.length < 3) return;

                    let name = tds[colName] ? tds[colName].textContent.trim() : ("Đ" + (vertices.length + 1));
                    let x = tds[colX] ? parseFloat(tds[colX].textContent.replace(',', '.')) : 0;
                    let y = tds[colY] ? parseFloat(tds[colY].textContent.replace(',', '.')) : 0;
                    let lat = (colLat >= 0 && tds[colLat]) ? parseFloat(tds[colLat].textContent.replace(',', '.')) : 0;
                    let lng = (colLng >= 0 && tds[colLng]) ? parseFloat(tds[colLng].textContent.replace(',', '.')) : 0;
                    let h = (colH >= 0 && tds[colH]) ? parseFloat(tds[colH].textContent.replace(',', '.')) : 0;

                    if (isNaN(x)) x = 0; if (isNaN(y)) y = 0; if (isNaN(lat)) lat = 0; if (isNaN(lng)) lng = 0; if (isNaN(h)) h = 0;
                    if ((x === 0 && y === 0) && (lat === 0 && lng === 0)) return;

                    if ((lat === 0 && lng === 0) && (x !== 0 && y !== 0)) {
                        try {
                            const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                            lat = parseFloat(wgs.lat.toFixed(7));
                            lng = parseFloat(wgs.lng.toFixed(7));
                        } catch(e) {}
                    } else if ((x === 0 && y === 0) && (lat !== 0 && lng !== 0)) {
                        try {
                            const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                            x = parseFloat(vn2k.X.toFixed(3));
                            y = parseFloat(vn2k.Y.toFixed(3));
                        } catch(e) {}
                    }

                    vertices.push({
                        name, x, y, lat, lng, h,
                        isSnapped: true,
                        snapSource: ("Excel: " + (fileName || 'File'))
                    });
                });

                if (vertices.length >= 2) {
                    shapes.push({
                        name: sName,
                        mode: (vertices.length >= 3 && isPoly) ? 'polygon' : 'polyline',
                        color: sColor,
                        vertices: vertices
                    });
                }
            });

            if (shapes.length > 0) return shapes;
        }

        // 2. Phân tích nếu là file CSV hoặc text
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length >= 2) {
            const firstDataLine = lines.find(l => l.includes(';') || l.includes(',') || l.includes('\t')) || '';
            const delimiter = firstDataLine.includes(';') ? ';' : (firstDataLine.includes('\t') ? '\t' : ',');

            let currentShapeName = '';
            let currentMode = 'polygon';
            let currentColor = null;
            let currentVertices = [];
            let colName = -1, colX = -1, colY = -1, colLat = -1, colLng = -1, colH = -1, colShape = -1, colMode = -1, colColor = -1, colNote = -1;
            let hasHeader = false;

            const flushCsvShape = () => {
                if (currentVertices.length >= 2) {
                    shapes.push({
                        name: currentShapeName || (shapes.length > 0 ? ("Thửa " + (shapes.length + 1)) : (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Thửa 1')),
                        mode: (currentVertices.length >= 3 && currentMode === 'polygon') ? 'polygon' : 'polyline',
                        color: currentColor,
                        vertices: currentVertices
                    });
                }
                currentVertices = [];
            };

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                if (line.startsWith('---') || line.startsWith('===') || line.startsWith('#')) {
                    const bannerClean = line.replace(/^[-=#]+\s*/, '').replace(/\s*[-=#]+$/, '').trim();
                    const lowerBanner = bannerClean.toLowerCase();

                    if (lowerBanner.includes('bảng tổng hợp') || lowerBanner.includes('bảng kê tọa độ ranh')) continue;

                    if (lowerBanner.includes('thửa') || lowerBanner.includes('khối') || lowerBanner.includes('tuyến') || line.startsWith('---')) {
                        flushCsvShape();
                        const match = bannerClean.match(/^([^—–\-(|:]+)/);
                        currentShapeName = match ? match[1].trim() : bannerClean;
                        currentMode = (lowerBanner.includes('tuyến') || lowerBanner.includes('chiều dài') || lowerBanner.includes('polyline')) ? 'polyline' : 'polygon';
                        const colorMatch = bannerClean.match(/#[0-9a-fA-F]{6}/);
                        currentColor = colorMatch ? colorMatch[0] : null;
                        hasHeader = false;
                        continue;
                    }
                }

                const cells = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
                if (cells.length < 2) continue;

                let tName = -1, tX = -1, tY = -1, tLat = -1, tLng = -1, tH = -1, tShape = -1, tMode = -1, tColor = -1, tNote = -1;
                cells.forEach((cell, cIdx) => {
                    const s = cell.toLowerCase();
                    if (tShape === -1 && (s.includes('tên khối') || s.includes('tên thửa') || s === 'khối' || s === 'thửa')) tShape = cIdx;
                    if (tMode === -1 && (s.includes('loại') || s.includes('chế độ'))) tMode = cIdx;
                    if (tColor === -1 && (s.includes('màu'))) tColor = cIdx;
                    if (tName === -1 && (s.includes('tên đỉnh') || s.includes('tên mốc') || s === 'đỉnh')) tName = cIdx;
                    if (tX === -1 && (s.includes('tọa độ x') || s.includes('x (bắc') || s.includes('x [m]') || s === 'x' || s.includes('ngang x'))) tX = cIdx;
                    if (tY === -1 && (s.includes('tọa độ y') || s.includes('y (đông') || s.includes('y [m]') || s === 'y' || s.includes('đứng y'))) tY = cIdx;
                    if (tLat === -1 && (s.includes('vĩ độ') || s.includes('lat'))) tLat = cIdx;
                    if (tLng === -1 && (s.includes('kinh độ') || s.includes('lng') || s.includes('long') || s.includes('lon'))) tLng = cIdx;
                    if (tH === -1 && (s.includes('cao độ') || s === 'h' || s === 'z')) tH = cIdx;
                    if (tNote === -1 && (s.includes('ghi chú') || s.includes('note') || s.includes('bắt điểm'))) tNote = cIdx;
                });

                if ((tX !== -1 && tY !== -1) || (tLat !== -1 && tLng !== -1)) {
                    colName = tName !== -1 ? tName : 1;
                    colX = tX; colY = tY; colLat = tLat; colLng = tLng; colH = tH;
                    colShape = tShape; colMode = tMode; colColor = tColor; colNote = tNote;
                    hasHeader = true;
                    continue;
                }

                if (!hasHeader) continue;
                if (line.toLowerCase().match(/tổng cộng|tiểu kế/)) continue;

                if (colShape !== -1 && cells[colShape]) {
                    const rowShapeName = cells[colShape];
                    if (currentShapeName && currentShapeName !== rowShapeName) {
                        flushCsvShape();
                    }
                    currentShapeName = rowShapeName;
                    if (colMode !== -1 && cells[colMode]) {
                        currentMode = cells[colMode].toLowerCase().includes('tuyến') ? 'polyline' : 'polygon';
                    }
                    if (colColor !== -1 && cells[colColor] && cells[colColor].startsWith('#')) {
                        currentColor = cells[colColor];
                    }
                }

                let name = (colName !== -1 && cells[colName]) ? cells[colName] : ("Đ" + (currentVertices.length + 1));
                let x = colX !== -1 ? parseFloat(cells[colX].replace(',', '.')) : 0;
                let y = colY !== -1 ? parseFloat(cells[colY].replace(',', '.')) : 0;
                let lat = colLat !== -1 ? parseFloat(cells[colLat].replace(',', '.')) : 0;
                let lng = colLng !== -1 ? parseFloat(cells[colLng].replace(',', '.')) : 0;
                let h = colH !== -1 ? parseFloat(cells[colH].replace(',', '.')) : 0;
                const note = colNote !== -1 ? cells[colNote] : '';

                if (isNaN(x)) x = 0; if (isNaN(y)) y = 0; if (isNaN(lat)) lat = 0; if (isNaN(lng)) lng = 0; if (isNaN(h)) h = 0;
                if ((x === 0 && y === 0) && (lat === 0 && lng === 0)) continue;

                if ((lat === 0 && lng === 0) && (x !== 0 && y !== 0)) {
                    try {
                        const wgs = convertVn2kToWgs(x, y, AppState.kttVal, AppState.scaleFactor);
                        lat = parseFloat(wgs.lat.toFixed(7));
                        lng = parseFloat(wgs.lng.toFixed(7));
                    } catch(e) {}
                } else if ((x === 0 && y === 0) && (lat !== 0 && lng !== 0)) {
                    try {
                        const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
                        x = parseFloat(vn2k.X.toFixed(3));
                        y = parseFloat(vn2k.Y.toFixed(3));
                    } catch(e) {}
                }

                currentVertices.push({
                    name, x, y, lat, lng, h,
                    isSnapped: note.includes('Hít') || note.includes('Mốc') || note.includes('snap'),
                    snapSource: note || ("CSV: " + (fileName || 'File'))
                });
            }

            flushCsvShape();
        }

        return shapes;
    },

    _applyImportedShapes(shapes, fileName) {
        if (!shapes || shapes.length === 0) return;

        const colorPalette = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#84cc16'];
        
        let appendMode = true;
        if (this.savedShapes && this.savedShapes.length > 0) {
            const userChoice = confirm("Bản vẽ hiện tại đang có " + this.savedShapes.length + " cấu trúc/khối.\n\n- Nhấn OK: GIỮ NGUYÊN và THÊM TIẾP " + shapes.length + " khối mới từ file vào bản vẽ.\n- Nhấn CANCEL: XÓA CŨ và chỉ lấy " + shapes.length + " khối mới từ file.");
            if (!userChoice) {
                this.savedShapes = [];
                appendMode = false;
            }
        } else if (!this.savedShapes) {
            this.savedShapes = [];
        }

        let totalVertices = 0;
        const allLatLngs = [];

        shapes.forEach((s, idx) => {
            const sColor = s.color || colorPalette[(this.savedShapes.length + idx) % colorPalette.length];
            const stats = this.calculateAreaAndPerimeter(s.vertices, s.mode);
            const shapeObj = {
                id: 'excel_shape_' + Date.now() + '_' + idx,
                name: s.name,
                shortName: s.name,
                mode: s.mode,
                vertices: s.vertices,
                color: sColor,
                selected: true,
                stats: stats
            };
            this.savedShapes.push(shapeObj);
            totalVertices += s.vertices.length;

            s.vertices.forEach(v => {
                if (v.lat && v.lng) allLatLngs.push([v.lat, v.lng]);
            });
        });

        // 1. Chuyển sang màn hình bản đồ nếu đang ở màn hình khác
        if (typeof appNav !== 'undefined' && appNav.openProjectMap) {
            appNav.openProjectMap();
        }

        // 2. Mở thanh công cụ CAD nếu chưa mở
        if (!this.isActive) {
            this.openToolbar();
        }

        // 3. Xác định và đồng bộ tên dự án tương ứng với file nạp
        let targetProj = AppState.currentProject;
        if (fileName && (!appendMode || !targetProj)) {
            const cleanName = fileName.replace(/(\.(csv|xlsx|xls|txt))+$/i, "").trim();
            targetProj = cleanName ? `${cleanName}.csv` : (targetProj || `DuAn_${Date.now().toString().slice(-4)}.csv`);
        }
        if (!targetProj) targetProj = `DuAn_${Date.now().toString().slice(-4)}.csv`;
        if (!targetProj.toLowerCase().endsWith('.csv')) targetProj += '.csv';

        if (!AppState.projectsList.includes(targetProj)) {
            AppState.projectsList.push(targetProj);
            if (typeof appData !== 'undefined' && appData.saveProjectsList) {
                appData.saveProjectsList();
            } else {
                localStorage.setItem('vn2k_projects', JSON.stringify(AppState.projectsList));
            }
        }
        AppState.currentProject = targetProj;
        localStorage.setItem('vn2k_cur_project', targetProj);

        // Lưu bền vững vào CAD storage và tự động đồng bộ sang Sổ Đo Dự Án (kèm tag shapeName)
        this.saveShapesForProject(targetProj);
        this.persistSession();

        if (typeof appData !== 'undefined' && appData.populateProjectSelect) appData.populateProjectSelect();
        if (typeof appMap !== 'undefined' && appMap.populateMapProjectSelect) appMap.populateMapProjectSelect(targetProj);
        if (typeof appNav !== 'undefined') {
            if (appNav.updateTreeNavState) appNav.updateTreeNavState();
            if (appNav.updateBanner) appNav.updateBanner();
        }

        // Đảm bảo khi nạp từ Excel: mặc định ẩn nhãn đỉnh và khung kích thước cạnh (chỉ hiển thị khi rê chuột đến)
        if (!this.displaySettings) this.initDisplaySettings();
        this.displaySettings.showVertices = false;
        this.displaySettings.showDistances = false;
        try {
            localStorage.setItem('vn2k_cad_display_settings_v3', JSON.stringify(this.displaySettings));
        } catch(e) {}
        this.syncDisplayCheckboxes();
        this.scheduleToolbarCollapse(this.toolbarIdleMs);

        // 4. Vẽ toàn bộ hình dạng các khối và nhãn lên bản đồ
        this.renderGeometry();

        // 5. HIỂN THỊ BẢNG KÊ CÁC KHỐI TRÊN BẢN ĐỒ
        const panel = document.getElementById('cadBlocksStatsPanel');
        if (panel) {
            panel.style.display = 'block';
        }
        this.renderBlocksPanel();
        this.updateUi();

        // 6. Thu phóng bản đồ bao quát chính xác các khối vừa nạp
        if (allLatLngs.length > 0 && AppState.leafletMap) {
            setTimeout(() => {
                try {
                    AppState.leafletMap.fitBounds(L.latLngBounds(allLatLngs).pad(0.18));
                } catch(e) {}
            }, 100);
        }

        showToast("✓ Đã nạp thành công " + shapes.length + " khối (" + totalVertices + " đỉnh) và hiển thị bảng kê lên bản đồ!");
    },

    exportAreaCsv() {
        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để xuất bảng diện tích!", true);
            return;
        }

        const meta = this._getExportMeta();
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project";
        const totalArea = selectedShapes.reduce((sum, s) => sum + (s.mode === 'polygon' ? (s.stats?.area || 0) : 0), 0);
        const totalHa = totalArea / 10000.0;
        const totalPerimeter = selectedShapes.reduce((sum, s) => sum + (s.stats?.perimeter || 0), 0);
        const totalVertices = selectedShapes.reduce((sum, s) => sum + s.vertices.length, 0);

        const baseProjectArea = (meta.customTotalArea && meta.customTotalArea > 0) ? meta.customTotalArea : totalArea;
        const showPercent = meta.showPercent !== false;

        let csv = "\uFEFF"; // UTF-8 BOM
        csv += "BẢNG KÊ TỌA ĐỘ RANH & DIỆN TÍCH MẶT BẰNG CÔNG TRÌNH\n";
        csv += "Tiêu đề bản vẽ;" + meta.drawingName + ";Tên dự án;" + meta.projectName + "\n";
        csv += "Đơn vị đo vẽ;" + (meta.organization || 'TRUNG TÂM QUẢN LÝ ĐẤT ĐAI') + ";Người đo;" + (meta.surveyor || '') + ";Kiểm tra;" + (meta.checker || '') + "\n";
        csv += "Hệ tọa độ;VN-2000 (" + (AppState.provinceName || 'Tỉnh') + ");KTT;" + AppState.kttDeg + "°" + String(AppState.kttMin).padStart(2,'0') + "' (Múi " + (AppState.muiVal || 3) + "°);Tỷ lệ;1:" + meta.scaleVal + "\n";
        csv += "Ngày hoàn thành;" + meta.drawingDate + ";Số tờ/thửa;" + (meta.parcelNo || '01') + ";Tổng số khối;" + selectedShapes.length + "\n\n";

        // 1. PHẦN 1: BẢNG TỔNG HỢP CÁC KHỐI ĐƯỢC VẼ
        csv += "=== BẢNG TỔNG HỢP DIỆN TÍCH CÁC KHỐI / THỬA ĐẤT ===\n";
        csv += showPercent 
            ? "STT;Tên khối / Thửa;Loại hình;Mã màu;Số đỉnh;Diện tích [m2];Diện tích [ha];Chu vi [m];Tỉ lệ diện tích [%];Ghi chú\n"
            : "STT;Tên khối / Thửa;Loại hình;Mã màu;Số đỉnh;Diện tích [m2];Diện tích [ha];Chu vi [m];Ghi chú\n";

        selectedShapes.forEach((s, idx) => {
            const isPoly = s.mode === 'polygon';
            const area = s.stats?.area || 0;
            const perim = s.stats?.perimeter || 0;
            const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';

            if (showPercent) {
                csv += (idx + 1) + ";" + s.name + ";" + (isPoly ? 'Đa giác' : 'Tuyến') + ";" + (s.color || '#10b981') + ";" + s.vertices.length + ";" + (isPoly ? area.toFixed(2) : '--') + ";" + (isPoly ? (area / 10000).toFixed(4) : '--') + ";" + perim.toFixed(2) + ";" + pctStr + ";" + (s.isSnapped ? 'Hít mốc' : 'Tự do') + "\n";
            } else {
                csv += (idx + 1) + ";" + s.name + ";" + (isPoly ? 'Đa giác' : 'Tuyến') + ";" + (s.color || '#10b981') + ";" + s.vertices.length + ";" + (isPoly ? area.toFixed(2) : '--') + ";" + (isPoly ? (area / 10000).toFixed(4) : '--') + ";" + perim.toFixed(2) + ";" + (s.isSnapped ? 'Hít mốc' : 'Tự do') + "\n";
            }
        });

        const totalPctStr = (baseProjectArea > 0) ? ((totalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
        csv += showPercent
            ? "--;TỔNG CỘNG;--;--; " + totalVertices + " đỉnh;" + totalArea.toFixed(2) + ";" + totalHa.toFixed(4) + ";" + totalPerimeter.toFixed(2) + ";" + totalPctStr + ";" + (meta.customTotalArea ? 'Theo DA quy hoạch' : 'Tổng đo thực tế') + "\n\n"
            : "--;TỔNG CỘNG;--;--; " + totalVertices + " đỉnh;" + totalArea.toFixed(2) + ";" + totalHa.toFixed(4) + ";" + totalPerimeter.toFixed(2) + ";Tổng đo thực tế\n\n";

        // 2. PHẦN 2: BẢNG KÊ TỌA ĐỘ CHI TIẾT TỪNG ĐỈNH
        csv += "=== BẢNG KÊ TỌA ĐỘ CHI TIẾT CÁC ĐỈNH RANH (TCVN) ===\n";
        selectedShapes.forEach((shape) => {
            csv += "--- KHỐI: " + shape.name.toUpperCase() + " (" + (shape.mode === 'polygon' ? 'Đa giác' : 'Tuyến') + ") " + (shape.color || '#10b981') + " ---\n";
            csv += "STT;Tên Khối;Loại;Mã Màu;Tên Đỉnh;Tọa độ X (Bắc) [m];Tọa độ Y (Đông) [m];Cạnh kế [m];Góc phương vị (Az);Vĩ độ WGS84;Kinh độ WGS84;Cao độ H;Ghi chú\n";
            shape.vertices.forEach((v, idx) => {
                const edge = shape.stats?.edges ? shape.stats.edges[idx] : null;
                const edgeLen = edge ? edge.length.toFixed(3) : '';
                const azStr = edge ? edge.azFormatted : '';
                csv += (idx + 1) + ";" + shape.name + ";" + (shape.mode === 'polygon' ? 'Đa giác' : 'Tuyến') + ";" + (shape.color || '#10b981') + ";" + v.name + ";" + (v.x || 0).toFixed(3) + ";" + (v.y || 0).toFixed(3) + ";" + edgeLen + ";" + azStr + ";" + (v.lat || 0).toFixed(7) + ";" + (v.lng || 0).toFixed(7) + ";" + (v.h || 0).toFixed(3) + ";" + (v.isSnapped ? v.snapSource : 'Vẽ tự do') + "\n";
            });
            if (shape.mode === 'polygon' && shape.vertices.length >= 3) {
                csv += "Tiểu kế " + shape.shortName + ";;;;Diện tích [m2];" + (shape.stats?.area || 0).toFixed(2) + ";Diện tích [ha];" + (shape.stats?.ha || 0).toFixed(4) + ";Chu vi [m];" + (shape.stats?.perimeter || 0).toFixed(3) + ";;;\n\n";
            } else {
                csv += "Tiểu kế " + shape.shortName + ";;;;Chiều dài tuyến [m];" + (shape.stats?.perimeter || 0).toFixed(3) + ";;;;;;;\n\n";
            }
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = projName + "_Bang_Tong_Hop_Dien_Tich.csv";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("✓ Đã xuất bảng tổng hợp diện tích & tọa độ CSV: " + filename);
    },

    // Xuất bảng tính Excel chuẩn (.xlsx) hoặc bảng tính có định dạng màu sắc (.xls)
    exportAreaExcel(format = 'xlsx') {
        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để xuất bảng tính Excel!", true);
            return;
        }

        const meta = this._getExportMeta();
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project";
        const totalArea = selectedShapes.reduce((sum, s) => sum + (s.mode === 'polygon' ? (s.stats?.area || 0) : 0), 0);
        const totalHa = totalArea / 10000.0;
        const totalPerimeter = selectedShapes.reduce((sum, s) => sum + (s.stats?.perimeter || 0), 0);
        const totalVertices = selectedShapes.reduce((sum, s) => sum + s.vertices.length, 0);
        const baseProjectArea = (meta.customTotalArea && meta.customTotalArea > 0) ? meta.customTotalArea : totalArea;
        const showPercent = meta.showPercent !== false;

        // Nếu xuất định dạng chuẩn Microsoft Excel (.xlsx) qua SheetJS
        if (format === 'xlsx' && typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();

            // 1. Sheet 1: Bảng tổng hợp diện tích
            const summaryRows = [
                ["BẢNG TỔNG HỢP DIỆN TÍCH CÁC KHỐI / THỬA ĐẤT - " + (meta.drawingName || 'MẶT BẰNG CÔNG TRÌNH')],
                ["Dự án: " + (meta.projectName || projName) + " | Đơn vị: " + (meta.organization || '') + " | Cán bộ đo: " + (meta.surveyor || '') + " | Hệ tọa độ: VN-2000 (" + (AppState.provinceName || '') + ") | KTT: " + AppState.kttDeg + "°" + String(AppState.kttMin).padStart(2,'0') + "' (Múi " + (AppState.muiVal || 3) + "°) | Tỷ lệ: 1:" + meta.scaleVal + " | Ngày: " + meta.drawingDate],
                [],
                ['STT', 'Tên Khối / Thửa', 'Loại Hình', 'Số Đỉnh', 'Diện Tích (m²)', 'Diện Tích (ha)', 'Chu Vi / Chiều Dài (m)', 'Tỉ Lệ (%)', 'Mã Màu', 'Ghi Chú']
            ];

            selectedShapes.forEach((s, idx) => {
                const isPoly = s.mode === 'polygon';
                const area = s.stats?.area || 0;
                const perim = s.stats?.perimeter || 0;
                const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';
                summaryRows.push([
                    idx + 1,
                    s.name,
                    isPoly ? 'Đa giác' : 'Tuyến',
                    s.vertices.length,
                    isPoly ? parseFloat(area.toFixed(2)) : '--',
                    isPoly ? parseFloat((area / 10000.0).toFixed(4)) : '--',
                    parseFloat(perim.toFixed(2)),
                    pctStr,
                    s.color || '#10b981',
                    s.isSnapped ? 'Hít mốc' : 'Tự do'
                ]);
            });

            const totalPctStr = (baseProjectArea > 0) ? ((totalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
            summaryRows.push([
                '--', 'TỔNG CỘNG', selectedShapes.length + ' khối', totalVertices,
                parseFloat(totalArea.toFixed(2)), parseFloat(totalHa.toFixed(4)), parseFloat(totalPerimeter.toFixed(2)),
                totalPctStr, '--', meta.customTotalArea ? 'Theo DA quy hoạch' : 'Tổng đo thực tế'
            ]);

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
            wsSummary['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
            // Tối ưu AutoFilter trên dòng tiêu đề bảng tổng hợp
            if (summaryRows.length > 4) {
                wsSummary['!autofilter'] = { ref: "A4:J" + (summaryRows.length - 1) };
            }
            XLSX.utils.book_append_sheet(wb, wsSummary, 'TongHop_DienTich');

            // 2. Sheet 2: Master detail sheet (BangKe_ToaDo) - Lưu tập trung 100% đỉnh của mọi thửa
            const detailRows = [
                ['BẢNG KÊ TỌA ĐỘ CHI TIẾT CÁC ĐỈNH RANH (TCVN)'],
                ["Dự án: " + (meta.projectName || projName) + " | Hệ tọa độ: VN-2000 | Tổng số khối: " + selectedShapes.length],
                [],
                ['STT', 'Tên Khối / Thửa', 'Loại Hình', 'Mã Màu', 'Tên Đỉnh', 'Tọa độ X (Bắc) [m]', 'Tọa độ Y (Đông) [m]', 'Cạnh Kế [m]', 'Phương Vị (Az)', 'Vĩ độ WGS-84', 'Kinh độ WGS-84', 'Cao độ H [m]', 'Bắt Điểm / Ghi Chú']
            ];

            let ptCounter = 1;
            selectedShapes.forEach(shape => {
                const isPoly = shape.mode === 'polygon';
                const stats = shape.stats || {};
                shape.vertices.forEach((v, vIdx) => {
                    const edge = stats.edges ? stats.edges[vIdx] : null;
                    const edgeLen = edge ? parseFloat(edge.length.toFixed(3)) : '--';
                    const azStr = edge ? edge.azFormatted : '--';
                    detailRows.push([
                        ptCounter++,
                        shape.name,
                        isPoly ? 'Đa giác' : 'Tuyến',
                        shape.color || '#10b981',
                        v.name,
                        parseFloat((v.x || 0).toFixed(3)),
                        parseFloat((v.y || 0).toFixed(3)),
                        edgeLen,
                        azStr,
                        parseFloat((v.lat || 0).toFixed(7)),
                        parseFloat((v.lng || 0).toFixed(7)),
                        parseFloat((v.h || 0).toFixed(3)),
                        v.isSnapped ? (v.snapSource || 'Hít mốc') : 'Vẽ tự do'
                    ]);
                });
            });

            const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
            wsDetail['!cols'] = [
                { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
                { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 20 }
            ];
            // Tối ưu AutoFilter trên dòng tiêu đề bảng kê chi tiết để lọc nhanh bất kỳ thửa nào chỉ với 1 click
            if (detailRows.length > 4) {
                wsDetail['!autofilter'] = { ref: "A4:M" + detailRows.length };
            }
            XLSX.utils.book_append_sheet(wb, wsDetail, 'BangKe_ToaDo');

            // TỐI ƯU HÓA DỮ LIỆU LỚN: Không tạo thêm hàng chục sheet con cho từng thửa đất riêng lẻ
            // Giữ file Excel gọn nhẹ, mở tức thì, dễ dàng quản lý hàng trăm thửa đất qua bộ lọc Filter tập trung
            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const filename = projName + "_Bang_Tong_Hop_Dien_Tich.xlsx";
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("✓ Đã xuất file Excel chuẩn (.xlsx): " + filename);
            return;
        }

        // Xuất file HTML .xls có nhúng đầy đủ metadata và data-* attributes
        let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">\n' +
'<head>\n' +
'<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">\n' +
'<!--[if gte mso 9]>\n' +
'<xml>\n' +
' <x:ExcelWorkbook>\n' +
'  <x:ExcelWorksheets>\n' +
'   <x:ExcelWorksheet>\n' +
'    <x:Name>Bảng Kê VN-2000</x:Name>\n' +
'    <x:WorksheetOptions>\n' +
'     <x:DisplayGridlines/>\n' +
'     <x:Print><x:ValidPrinterInfo/><x:PaperSizeIndex>9</x:PaperSizeIndex></x:Print>\n' +
'    </x:WorksheetOptions>\n' +
'   </x:ExcelWorksheet>\n' +
'  </x:ExcelWorksheets>\n' +
' </x:ExcelWorkbook>\n' +
'</xml>\n' +
'<![endif]-->\n' +
'<style>\n' +
'  body { font-family: \'Segoe UI\', Arial, sans-serif; font-size: 11pt; color: #1e293b; }\n' +
'  table { border-collapse: collapse; margin-bottom: 24px; width: 100%; }\n' +
'  th { background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: center; }\n' +
'  td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 10pt; }\n' +
'  .title-main { font-size: 16pt; font-weight: bold; color: #0369a1; text-align: center; padding: 12px; }\n' +
'  .meta-table td { border: none; padding: 4px 8px; font-size: 10.5pt; }\n' +
'  .num-3 { mso-number-format: \'0\\.000\'; text-align: right; }\n' +
'  .num-2 { mso-number-format: \'0\\.00\'; text-align: right; }\n' +
'  .num-4 { mso-number-format: \'0\\.0000\'; text-align: right; }\n' +
'  .num-pct { mso-number-format: \'0\\.00%\'; text-align: right; }\n' +
'  .row-total { background-color: #fef08a; font-weight: bold; }\n' +
'  .section-title { font-size: 12pt; font-weight: bold; color: #0284c7; background-color: #f0f9ff; padding: 8px; margin-top: 14px; margin-bottom: 6px; }\n' +
'  .shape-header { background-color: #e0f2fe; font-weight: bold; color: #0369a1; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'  <table>\n' +
'    <tr><td colspan="' + (showPercent ? 10 : 9) + '" class="title-main">' + (meta.drawingName || 'BẢNG KÊ TỌA ĐỘ RANH & DIỆN TÍCH MẶT BẰNG CÔNG TRÌNH') + '</td></tr>\n' +
'  </table>\n\n' +
'  <table class="meta-table">\n' +
'    <tr>\n' +
'      <td><b>Dự án:</b> ' + (meta.projectName || '') + '</td>\n' +
'      <td><b>Đơn vị đo:</b> ' + (meta.organization || '') + '</td>\n' +
'      <td><b>Cán bộ đo:</b> ' + (meta.surveyor || '') + '</td>\n' +
'    </tr>\n' +
'    <tr>\n' +
'      <td><b>Hệ tọa độ:</b> VN-2000 (' + (AppState.provinceName || 'Tỉnh') + ')</td>\n' +
'      <td><b>KTT:</b> ' + AppState.kttDeg + '°' + String(AppState.kttMin).padStart(2,'0') + "' (Múi " + (AppState.muiVal || 3) + '°)</td>\n' +
'      <td><b>Kiểm tra:</b> ' + (meta.checker || '') + '</td>\n' +
'    </tr>\n' +
'    <tr>\n' +
'      <td><b>Số tờ/thửa:</b> ' + (meta.parcelNo || '01') + '</td>\n' +
'      <td><b>Tỷ lệ bản vẽ:</b> 1:' + meta.scaleVal + '</td>\n' +
'      <td><b>Ngày hoàn thành:</b> ' + meta.drawingDate + '</td>\n' +
'    </tr>\n' +
'  </table>\n\n' +
'  <div class="section-title">I. BẢNG TỔNG HỢP DIỆN TÍCH CÁC KHỐI / THỬA ĐẤT</div>\n' +
'  <table>\n' +
'    <thead>\n' +
'      <tr>\n' +
'        <th style="width: 50px;">STT</th>\n' +
'        <th>Tên Khối / Thửa</th>\n' +
'        <th>Loại Hình</th>\n' +
'        <th>Số Đỉnh</th>\n' +
'        <th>Diện Tích (m²)</th>\n' +
'        <th>Diện Tích (ha)</th>\n' +
'        <th>Chu Vi / Chiều Dài (m)</th>\n' +
        (showPercent ? '        <th>Tỉ Lệ Diện Tích (%)</th>\n' : '') +
'        <th>Mã Màu</th>\n' +
'        <th>Ghi Chú</th>\n' +
'      </tr>\n' +
'    </thead>\n' +
'    <tbody>';

        selectedShapes.forEach((s, idx) => {
            const isPoly = s.mode === 'polygon';
            const area = s.stats?.area || 0;
            const perim = s.stats?.perimeter || 0;
            const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';
            const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

            html += '\n      <tr style="background-color: ' + bg + ';" data-shape-idx="' + idx + '" data-color="' + (s.color || '#10b981') + '">' +
'\n        <td style="text-align: center;">' + (idx + 1) + '</td>' +
'\n        <td><b>' + s.name + '</b></td>' +
'\n        <td style="text-align: center;">' + (isPoly ? 'Đa giác' : 'Tuyến') + '</td>' +
'\n        <td style="text-align: center;">' + s.vertices.length + '</td>' +
'\n        <td class="num-2">' + (isPoly ? area.toFixed(2) : '--') + '</td>' +
'\n        <td class="num-4">' + (isPoly ? (area / 10000).toFixed(4) : '--') + '</td>' +
'\n        <td class="num-2">' + perim.toFixed(2) + '</td>' +
        (showPercent ? ('\n        <td class="num-pct">' + pctStr + '</td>') : '') +
'\n        <td style="text-align: center; color: ' + (s.color || '#10b981') + '; font-weight: bold;">' + (s.color || '#10b981') + '</td>' +
'\n        <td style="text-align: center;">' + (s.isSnapped ? 'Hít mốc' : 'Tự do') + '</td>' +
'\n      </tr>';
        });

        const totalPctStr = (baseProjectArea > 0) ? ((totalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
        html += '\n      <tr class="row-total">' +
'\n        <td style="text-align: center;">--</td>' +
'\n        <td><b>TỔNG CỘNG</b></td>' +
'\n        <td style="text-align: center;">--</td>' +
'\n        <td style="text-align: center;"><b>' + totalVertices + ' đỉnh</b></td>' +
'\n        <td class="num-2"><b>' + totalArea.toFixed(2) + '</b></td>' +
'\n        <td class="num-4"><b>' + totalHa.toFixed(4) + '</b></td>' +
'\n        <td class="num-2"><b>' + totalPerimeter.toFixed(2) + '</b></td>' +
        (showPercent ? ('\n        <td class="num-pct"><b>' + totalPctStr + '</b></td>') : '') +
'\n        <td style="text-align: center;">--</td>' +
'\n        <td style="text-align: center;"><b>' + (meta.customTotalArea ? 'Theo quy hoạch' : 'Đo thực tế') + '</b></td>' +
'\n      </tr>' +
'\n    </tbody>' +
'\n  </table>' +
'\n\n  <div class="section-title">II. BẢNG KÊ TỌA ĐỘ CHI TIẾT TỪNG ĐỈNH RANH (TCVN)</div>';

        selectedShapes.forEach((shape) => {
            const isPoly = shape.mode === 'polygon';
            const stats = shape.stats || {};
            html += '\n  <table>' +
'\n    <thead>' +
'\n      <tr class="shape-header" data-name="' + shape.name + '" data-mode="' + shape.mode + '" data-color="' + (shape.color || '#10b981') + '" data-area="' + (stats.area || 0).toFixed(2) + '" data-perimeter="' + (stats.perimeter || 0).toFixed(2) + '">' +
'\n        <td colspan="9">' +
'\n          <b>' + shape.name.toUpperCase() + '</b> [' + (isPoly ? 'Đa giác' : 'Tuyến') + '] - ' + (isPoly ? ("Diện tích: " + (stats.area || 0).toFixed(2) + " m² (" + (stats.ha || 0).toFixed(4) + " ha) | Chu vi: " + (stats.perimeter || 0).toFixed(2) + " m") : ("Chiều dài: " + (stats.perimeter || 0).toFixed(2) + " m")) + " | Màu: " + (shape.color || '#10b981') +
'\n        </td>' +
'\n      </tr>' +
'\n      <tr>' +
'\n        <th style="width: 45px;">STT</th>' +
'\n        <th>Tên Đỉnh</th>' +
'\n        <th>Tọa độ X (Bắc) [m]</th>' +
'\n        <th>Tọa độ Y (Đông) [m]</th>' +
'\n        <th>Cạnh Kế [m]</th>' +
'\n        <th>Phương Vị (Az)</th>' +
'\n        <th>Vĩ độ WGS-84</th>' +
'\n        <th>Kinh độ WGS-84</th>' +
'\n        <th>Cao độ H [m]</th>' +
'\n      </tr>' +
'\n    </thead>' +
'\n    <tbody>';
            shape.vertices.forEach((v, idx) => {
                const edge = stats.edges ? stats.edges[idx] : null;
                const edgeLen = edge ? edge.length.toFixed(3) : '--';
                const azStr = edge ? edge.azFormatted : '--';
                const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                html += '\n      <tr style="background-color: ' + bg + ';">' +
'\n        <td style="text-align: center;">' + (idx + 1) + '</td>' +
'\n        <td><b>' + v.name + '</b></td>' +
'\n        <td class="num-3">' + (v.x || 0).toFixed(3) + '</td>' +
'\n        <td class="num-3">' + (v.y || 0).toFixed(3) + '</td>' +
'\n        <td class="num-3">' + edgeLen + '</td>' +
'\n        <td style="text-align: center;">' + azStr + '</td>' +
'\n        <td class="num-3">' + (v.lat || 0).toFixed(7) + '</td>' +
'\n        <td class="num-3">' + (v.lng || 0).toFixed(7) + '</td>' +
'\n        <td class="num-3">' + (v.h || 0).toFixed(3) + '</td>' +
'\n      </tr>';
            });

            html += '\n    </tbody>' +
'\n  </table>';
        });

        html += '\n</body>' +
'\n</html>';

        const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = projName + "_Bang_Tong_Hop_Dien_Tich.xls";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("✓ Đã xuất file Excel bảng tổng hợp diện tích & tọa độ: " + filename);
    },


    copyTableToClipboard() {
        const allShapes = [];
        this.savedShapes.forEach((s, idx) => {
            allShapes.push({ name: s.name, shortName: s.shortName || `Thửa ${idx+1}`, mode: s.mode, vertices: s.vertices, stats: s.stats, selected: s.selected !== false });
        });
        if (this.vertices.length >= 2) {
            allShapes.push({ name: `Đang vẽ`, shortName: `Đang vẽ`, mode: this.mode, vertices: [...this.vertices], stats: this.calculateAreaAndPerimeter(), selected: true });
        }
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để sao chép!", true);
            return;
        }

        let text = `BẢNG KÊ TỌA ĐỘ RANH & DIỆN TÍCH - ${AppState.currentProject}\n`;
        selectedShapes.forEach(shape => {
            text += `\n[${shape.name}]\nSTT\tTên Đỉnh\tX (Bắc)\tY (Đông)\tCạnh (m)\tPhương vị\n`;
            shape.vertices.forEach((v, idx) => {
                const edge = shape.stats?.edges ? shape.stats.edges[idx] : null;
                const edgeLen = edge ? edge.length.toFixed(3) : '';
                const azStr = edge ? edge.azFormatted : '';
                text += `${idx + 1}\t${v.name}\t${(v.x || 0).toFixed(3)}\t${(v.y || 0).toFixed(3)}\t${edgeLen}\t${azStr}\n`;
            });
            if (shape.mode === 'polygon' && shape.vertices.length >= 3) {
                text += `Diện tích: ${shape.stats?.areaFormatted || 0} m² (${(shape.stats?.ha || 0).toFixed(4)} ha) | Chu vi: ${shape.stats?.perimeterFormatted || 0} m\n`;
            }
        });

        navigator.clipboard.writeText(text).then(() => {
            showToast(`✓ Đã sao chép bảng kê tọa độ & diện tích (${selectedShapes.length} đối tượng) vào bộ nhớ tạm!`);
        }).catch(err => {
            console.error("Lỗi clipboard:", err);
            showToast("⚠️ Không thể sao chép tự động!", true);
        });
    },

    // === HELPER: Lấy thông tin xuất bản vẽ từ form ===
    _getExportMeta() {
        const rawScaleVal = document.getElementById('cadExportScale')?.value;
        const scaleVal = (rawScaleVal && rawScaleVal !== 'auto') ? parseInt(rawScaleVal) : null;
        const paper = document.getElementById('cadExportPaperSize')?.value || 'A3';
        const drawingName = document.getElementById('cadExportDrawingName')?.value?.trim() || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT';
        const projectName = document.getElementById('cadExportProjectName')?.value?.trim() || AppState.currentProject.replace(/\.[^/.]+$/, "");
        const organization = document.getElementById('cadExportOrganization')?.value?.trim() || '';
        const owner = document.getElementById('cadExportOwner')?.value?.trim() || '';
        const parcelNo = document.getElementById('cadExportParcelNo')?.value?.trim() || '';
        const address = document.getElementById('cadExportAddress')?.value?.trim() || AppState.provinceName || '';
        const surveyor = document.getElementById('cadExportSurveyor')?.value?.trim() || '';
        const checker = document.getElementById('cadExportChecker')?.value?.trim() || '';
        const drawingCode = document.getElementById('cadExportDrawingCode')?.value?.trim() || 'SĐ-01/01';
        const drawingDate = document.getElementById('cadExportDate')?.value?.trim() || new Date().toLocaleDateString('vi-VN');

        const showPercent = document.getElementById('cadShowPercentRatio') ? document.getElementById('cadShowPercentRatio').checked : (this.showPercentRatio !== false);
        
        // Tùy chọn hiển thị các thành phần trên bản vẽ xuất
        const showVertices = document.getElementById('cadExportCheckVertices')
            ? document.getElementById('cadExportCheckVertices').checked
            : (this.displaySettings ? (this.displaySettings.showVertices === true) : false);
        const showDistances = document.getElementById('cadExportCheckDistances')
            ? document.getElementById('cadExportCheckDistances').checked
            : (this.displaySettings ? (this.displaySettings.showDistances === true) : false);
        const showCenterLabels = document.getElementById('cadExportCheckCenterLabels')
            ? document.getElementById('cadExportCheckCenterLabels').checked
            : (this.displaySettings ? (this.displaySettings.showCenterLabels !== false) : true);
        const showAnnotations = document.getElementById('cadExportCheckAnnotations')
            ? document.getElementById('cadExportCheckAnnotations').checked
            : (this.displaySettings ? (this.displaySettings.showAnnotations !== false) : true);
        const showBoundaries = document.getElementById('cadExportCheckBoundaries')
            ? document.getElementById('cadExportCheckBoundaries').checked
            : (this.displaySettings ? (this.displaySettings.showBoundaries !== false) : true);

        // showBlockInfo: true = hiện thêm chi tiết diện tích, chu vi, tỷ lệ % tại tâm
        let showBlockInfo = false;
        if (document.getElementById('cadExportCheckFullDetails')) {
            showBlockInfo = document.getElementById('cadExportCheckFullDetails').checked;
        } else if (document.getElementById('cadBlockDisplayFull')) {
            showBlockInfo = document.getElementById('cadBlockDisplayFull').checked;
        } else if (document.getElementById('cadShowBlockInfo')) {
            showBlockInfo = document.getElementById('cadShowBlockInfo').checked;
        }
        const customAreaVal = parseFloat(document.getElementById('cadCustomProjectArea')?.value || '0');
        const customTotalArea = (!isNaN(customAreaVal) && customAreaVal > 0) ? customAreaVal : null;

        // Lưu cấu hình vào localStorage để người dùng không phải nhập lại
        try {
            localStorage.setItem('vn2k_cad_meta_saved', JSON.stringify({
                drawingName, projectName, organization, owner, parcelNo, address, surveyor, checker, drawingCode, scaleVal, paper, showPercent, showBlockInfo, customTotalArea,
                showVertices, showDistances, showCenterLabels, showAnnotations, showBoundaries
            }));
        } catch (e) {}

        const paperW = paper === 'A3' ? 420 : 297;
        const paperH = paper === 'A3' ? 297 : 210;
        return { 
            scaleVal, paper, paperW, paperH, 
            drawingName, projectName, organization, owner, parcelNo, address, surveyor, checker, drawingCode, drawingDate,
            showPercent, showBlockInfo, customTotalArea,
            showVertices, showDistances, showCenterLabels, showAnnotations, showBoundaries
        };
    },

    _getFontSizeForScale(scale) {
        // Cỡ chữ trên bản vẽ (mm) chuyển sang đơn vị thực tế (m)
        // Theo TCVN 7285: cỡ chữ số liệu = 2.5mm, tiêu đề = 3.5mm, khung tên = 5mm
        const mmToM = scale / 1000.0;
        return {
            data: 2.5 * mmToM,       // Số liệu bảng kê
            label: 3.0 * mmToM,      // Tên mốc, kích thước
            title: 4.0 * mmToM,      // Tiêu đề đối tượng
            header: 5.0 * mmToM,     // Khung tên tiêu đề
            small: 2.0 * mmToM,      // Ghi chú nhỏ
        };
    },


    // Chuyển đổi chuỗi tiếng Việt có dấu sang ASCII thuần túy tương thích tuyệt đối mọi phiên bản MiniCAD/AutoCAD
    toCadAscii(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đ]/g, 'd')
            .replace(/[Đ]/g, 'D')
            .replace(/[²]/g, '2')
            .replace(/[³]/g, '3')
            .replace(/[°]/g, ' deg')
            .replace(/[\r\n\t]/g, ' ')
            .replace(/[^\x20-\x7E]/g, '')
            .trim();
    },

    // === 1. TÍNH TOÁN BỐ CỤC KHUNG BẢN VẼ CHUẨN TCVN 7285 & THÔNG TƯ 25/2014/TT-BTNMT ===
    _calculatePaperLayout(selectedShapes, meta) {
        const W_paper = meta.paperW || 420; // mm (A3: 420, A4: 297)
        const H_paper = meta.paperH || 297; // mm (A3: 297, A4: 210)

        // Quy chuẩn lề mép giấy TCVN (mm trên giấy): Lề trái 20mm để đóng gáy, lề phải/trên/dưới 10mm
        const M_left_mm = 20.0;
        const M_right_mm = 10.0;
        const M_top_mm = 10.0;
        const M_bottom_mm = 10.0;

        // Cột bảng biểu & Khung tên bên phải (mm trên giấy): A3 = 75mm, A4 = 60mm
        const W_panel_mm = (W_paper >= 420) ? 75.0 : 60.0;
        const W_inner_mm = W_paper - M_left_mm - M_right_mm;
        const H_inner_mm = H_paper - M_top_mm - M_bottom_mm;
        const W_map_mm = W_inner_mm - W_panel_mm;
        const H_map_mm = H_inner_mm;

        // 1. Tính toán Bounding Box chính xác (lọc sạch tọa độ 0 hoặc rác, đảm bảo tọa độ chuẩn VN2000)
        let minCadX = Infinity, maxCadX = -Infinity;
        let minCadY = Infinity, maxCadY = -Infinity;

        selectedShapes.forEach(shape => {
            (shape.vertices || []).forEach((p, idx) => {
                let cx = parseFloat(p.y);
                let cy = parseFloat(p.x);
                if (isNaN(cx) || isNaN(cy) || cx < 10000 || cy < 10000) {
                    if (isFinite(p.lat) && isFinite(p.lng) && p.lat !== 0) {
                        try {
                            const conv = convertWgsToVn2k(p.lat, p.lng, AppState.kttVal, AppState.scaleFactor);
                            cx = parseFloat(conv.Y);
                            cy = parseFloat(conv.X);
                            p.x = cy;
                            p.y = cx;
                        } catch (e) {}
                    }
                }
                if (isFinite(cx) && cx > 10000) {
                    if (cx < minCadX) minCadX = cx;
                    if (cx > maxCadX) maxCadX = cx;
                }
                if (isFinite(cy) && cy > 10000) {
                    if (cy < minCadY) minCadY = cy;
                    if (cy > maxCadY) maxCadY = cy;
                }
            });
        });

        if (!isFinite(minCadX) || minCadX === maxCadX) { minCadX -= 25; maxCadX += 25; }
        if (!isFinite(minCadY) || minCadY === maxCadY) { minCadY -= 25; maxCadY += 25; }

        const spanCadX = Math.max(maxCadX - minCadX, 1.0);
        const spanCadY = Math.max(maxCadY - minCadY, 1.0);

        // 2. Tính tỉ lệ bản vẽ tối ưu (Tự động hoặc theo người dùng chọn)
        let scaleVal = (typeof meta.scaleVal === 'number' && !isNaN(meta.scaleVal) && meta.scaleVal > 0) ? meta.scaleVal : null;
        let isAuto = !scaleVal;

        // Tính tỉ lệ chuẩn tối ưu tự động để hình vẽ thửa đất to, rõ, chiếm ~85% - 88% không gian vùng vẽ (tương tự độ lớn file ảnh PNG)
        const targetFill = 0.88;
        const reqScaleX = (spanCadX / (W_map_mm * targetFill)) * 1000;
        const reqScaleY = (spanCadY / (H_map_mm * targetFill)) * 1000;
        const rawScale = Math.max(reqScaleX, reqScaleY);
        const standardScales = [
            20, 25, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500,
            600, 750, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 10000
        ];
        let autoSuggestedScale = 500;
        for (const sc of standardScales) {
            if (rawScale <= sc) {
                autoSuggestedScale = sc;
                break;
            }
        }
        if (rawScale > standardScales[standardScales.length - 1]) {
            autoSuggestedScale = Math.ceil(rawScale / 1000) * 1000;
        }

        if (isAuto) {
            scaleVal = autoSuggestedScale;
        }

        const S = scaleVal / 1000.0; // 1 mm trên giấy = S mét thực địa

        // Kích thước khổ giấy thực tế (mét trong CAD)
        const W_sheet = W_paper * S;
        const H_sheet = H_paper * S;

        // Kích thước khung trong bản vẽ (mét)
        const W_inner = W_inner_mm * S;
        const H_inner = H_inner_mm * S;

        // Cột bảng biểu & Khung tên bên phải (mét)
        const W_panel = W_panel_mm * S;

        // Vùng vẽ bản đồ (Map Viewport) bên trái (mét)
        const W_map = W_inner - W_panel;
        const H_map = H_inner;

        // Trọng tâm thực địa của các khối thửa đất
        const Cx = (minCadX + maxCadX) / 2.0;
        const Cy = (minCadY + maxCadY) / 2.0;

        // TÍNH TOÁN TỌA ĐỘ GỐC TỜ GIẤY (X0, Y0) ĐỂ THỬA ĐẤT RƠI CHÍNH XÁC VÀO TRỌNG TÂM VÙNG BẢN ĐỒ
        const X0 = Cx - (M_left_mm * S + W_map / 2.0);
        const Y0 = Cy - (M_bottom_mm * S + H_map / 2.0);

        // Tọa độ 4 góc của Khung Trong (Inner Border)
        const Xin0 = X0 + M_left_mm * S;
        const Yin0 = Y0 + M_bottom_mm * S;
        const Xin1 = Xin0 + W_inner;
        const Yin1 = Yin0 + H_inner;

        // Đường ranh giới chia giữa Vùng bản đồ và Cột bảng bên phải
        const Xpanel0 = Xin1 - W_panel;

        // Chiều cao Khung Tên TCVN ở góc dưới bên phải (mm trên giấy: 36mm)
        const H_title_mm = 36.0;
        const H_title = H_title_mm * S;
        const YtitleTop = Yin0 + H_title;

        // Khoảng cách dấu chữ thập lưới tọa độ (km / m)
        let gridInterval = 50;
        if (scaleVal >= 5000) gridInterval = 500;
        else if (scaleVal >= 2000) gridInterval = 200;
        else if (scaleVal >= 1000) gridInterval = 100;
        else if (scaleVal >= 500) gridInterval = 50;
        else if (scaleVal >= 200) gridInterval = 20;
        else gridInterval = 10;

        // Kiểm tra xem thửa đất có nằm trọn vẹn trong vùng bản đồ không
        const fits = (spanCadX <= W_map * 0.95 && spanCadY <= H_map * 0.95);

        return {
            scaleVal, S, isAuto, autoSuggestedScale, W_paper, H_paper,
            M_left_mm, M_right_mm, M_top_mm, M_bottom_mm,
            W_sheet, H_sheet, W_inner, H_inner,
            W_panel_mm, W_panel, W_map, H_map,
            minCadX, maxCadX, minCadY, maxCadY,
            spanCadX, spanCadY, Cx, Cy,
            X0, Y0, Xin0, Yin0, Xin1, Yin1,
            Xpanel0, H_title_mm, H_title, YtitleTop,
            gridInterval, fits
        };
    },

    // Kiểm tra trực quan xem tỉ lệ và khổ giấy có vừa vặn không (Real-Time Fit Checker)
    checkScalePaperFit() {
        const noticeEl = document.getElementById('cadScaleFitNotice');
        if (!noticeEl) return;

        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            noticeEl.style.display = 'block';
            noticeEl.innerHTML = '<div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); padding: 7px 10px; border-radius: 6px; color:#94a3b8; font-size:11px;">⚠️ Vui lòng chọn ít nhất 1 khối để kiểm tra tỉ lệ bản vẽ.</div>';
            return;
        }

        const meta = this._getExportMeta();
        const L = this._calculatePaperLayout(selectedShapes, meta);

        noticeEl.style.display = 'block';
        if (L.isAuto) {
            noticeEl.innerHTML = `
                <div style="background: rgba(14, 165, 233, 0.15); border: 1px solid rgba(56, 189, 248, 0.45); padding: 7px 10px; border-radius: 6px; color: #38bdf8; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>⚡</span>
                        <span><b>Tự động tối ưu:</b> Đã chọn tỷ lệ chuẩn <b>1:${L.scaleVal}</b> trên khổ ${L.W_paper === 420 ? 'A3' : 'A4'} (Ranh đất: ${L.spanCadX.toFixed(1)}×${L.spanCadY.toFixed(1)}m | Vùng vẽ: ${L.W_map.toFixed(1)}×${L.H_map.toFixed(1)}m)</span>
                    </div>
                    <span style="background: rgba(56,189,248,0.2); padding: 2px 8px; border-radius: 4px; color: #e0f2fe; font-size: 10px;">Chuẩn kỹ thuật (To, rõ ~85% khung nhìn)</span>
                </div>
            `;
        } else if (L.fits) {
            noticeEl.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 7px 10px; border-radius: 6px; color: #4ade80; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>✅</span>
                        <span><b>Vừa vặn tuyệt đối:</b> Tỷ lệ 1:${L.scaleVal} trên khổ ${L.W_paper === 420 ? 'A3' : 'A4'} (Ranh đất: ${L.spanCadX.toFixed(1)}×${L.spanCadY.toFixed(1)}m | Vùng vẽ: ${L.W_map.toFixed(1)}×${L.H_map.toFixed(1)}m)</span>
                    </div>
                </div>
            `;
        } else {
            noticeEl.innerHTML = `
                <div style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.45); padding: 7px 10px; border-radius: 6px; color: #facc15; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>⚠️</span>
                        <span><b>Vượt kích thước vùng vẽ:</b> Ranh (${L.spanCadX.toFixed(1)}×${L.spanCadY.toFixed(1)}m) vượt khổ ${L.W_paper === 420 ? 'A3' : 'A4'} ở 1:${L.scaleVal}. Khuyến nghị: <b>1:${L.autoSuggestedScale}</b>.</span>
                    </div>
                    <button type="button" class="btn-sm" style="padding: 3px 10px; font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color: #0f172a; border: none; border-radius: 4px; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3);" onclick="appCadTool.applySuggestedScale(${L.autoSuggestedScale})" title="Bấm để chuyển ngay sang tỷ lệ khuyến nghị 1:${L.autoSuggestedScale}">
                        ⚡ Đổi sang 1:${L.autoSuggestedScale}
                    </button>
                </div>
            `;
        }
    },

    applySuggestedScale(val) {
        const scaleSelect = document.getElementById('cadExportScale');
        if (scaleSelect) {
            let found = false;
            for (let i = 0; i < scaleSelect.options.length; i++) {
                if (scaleSelect.options[i].value === String(val)) {
                    scaleSelect.selectedIndex = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                const opt = document.createElement('option');
                opt.value = String(val);
                opt.text = `1:${val} (Tối ưu)`;
                scaleSelect.add(opt);
                scaleSelect.value = String(val);
            }
            this.checkScalePaperFit();
            showToast(`✅ Đã chuyển tỷ lệ sang 1:${val}`);
        }
    },

    // === 2. XUẤT BẢN VẼ AUTOCAD (.DXF) CHUẨN KỸ THUẬT ĐỊA CHÍNH TCVN 7285 & THÔNG TƯ 25/2014 ===
    exportDxf() {
        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để xuất bản vẽ AutoCAD DXF!", true);
            return;
        }

        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "BanDo";
        const meta = this._getExportMeta();
        const L = this._calculatePaperLayout(selectedShapes, meta);
        const S = L.S; // 1mm = S meters

        // Cảnh báo người dùng nếu tỉ lệ chưa vừa vặn
        if (!L.fits) {
            showToast(`⚠️ Chú ý: Ranh đất hơi lớn so với vùng vẽ khổ ${L.W_paper === 420 ? 'A3' : 'A4'} ở tỷ lệ 1:${L.scaleVal}. Khung bản vẽ vẫn được căn chỉnh chính xác.`, false);
        }

        // Tính tổng diện tích đo thực tế
        let measuredTotalArea = 0;
        selectedShapes.forEach(s => {
            if (s.mode === 'polygon') measuredTotalArea += (s.stats?.area || 0);
        });
        const baseProjectArea = (meta.customTotalArea && meta.customTotalArea > 0) ? meta.customTotalArea : measuredTotalArea;
        const showPercent = meta.showPercent !== false;

        // KHỞI TẠO FILE DXF AC1009 (AutoCAD R12/2000+) - TƯƠNG THÍCH 100% TẤT CẢ PHẦN MỀM CAD
        // Tùy chọn showBlockInfo: true = hiện đầy đủ S, P, cạnh; false (mặc định) = chỉ hiện số thứ tự/ký hiệu khối tại tâm
        const showBlockInfo = meta.showBlockInfo === true;
        let dxf = "0\nSECTION\n2\nHEADER\n";
        dxf += "9\n$ACADVER\n1\nAC1009\n";
        dxf += "9\n$INSUNITS\n70\n6\n";       // 6 = Meters (TCVN)
        dxf += "9\n$MEASUREMENT\n70\n1\n";    // 1 = Metric
        dxf += "9\n$LTSCALE\n40\n" + S.toFixed(4) + "\n";
        dxf += "9\n$TEXTSIZE\n40\n" + (2.5 * S).toFixed(4) + "\n";
        dxf += "9\n$VIEWCTR\n10\n" + L.Cx.toFixed(3) + "\n20\n" + L.Cy.toFixed(3) + "\n";
        dxf += "9\n$VIEWSIZE\n40\n" + Math.max(L.spanCadY * 1.35, L.spanCadX * 1.05).toFixed(3) + "\n";
        dxf += "9\n$EXTMIN\n10\n" + L.X0.toFixed(3) + "\n20\n" + L.Y0.toFixed(3) + "\n30\n0.0\n";
        dxf += "9\n$EXTMAX\n10\n" + (L.X0 + L.W_sheet).toFixed(3) + "\n20\n" + (L.Y0 + L.H_sheet).toFixed(3) + "\n30\n0.0\n";
        dxf += "9\n$LIMMIN\n10\n" + L.X0.toFixed(3) + "\n20\n" + L.Y0.toFixed(3) + "\n";
        dxf += "9\n$LIMMAX\n10\n" + (L.X0 + L.W_sheet).toFixed(3) + "\n20\n" + (L.Y0 + L.H_sheet).toFixed(3) + "\n";
        dxf += "0\nENDSEC\n";

        // TABLES SECTION
        dxf += "0\nSECTION\n2\nTABLES\n";

        // 1. Viewport: Camera tự động zoom lớn trực diện vào trung tâm bản vẽ thửa đất khi mở trong AutoCAD
        dxf += "0\nTABLE\n2\nVPORT\n70\n1\n";
        dxf += "0\nVPORT\n2\n*ACTIVE\n70\n0\n";
        dxf += "10\n0.0\n20\n0.0\n11\n1.0\n21\n1.0\n";
        dxf += "12\n" + L.Cx.toFixed(3) + "\n22\n" + L.Cy.toFixed(3) + "\n";
        dxf += "40\n" + Math.max(L.spanCadY * 1.35, L.spanCadX * 1.05).toFixed(3) + "\n";
        dxf += "41\n" + (L.W_sheet / L.H_sheet).toFixed(4) + "\n";
        dxf += "0\nENDTAB\n";

        // 2. Line types
        dxf += "0\nTABLE\n2\nLTYPE\n70\n3\n";
        dxf += "0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n";
        dxf += "0\nLTYPE\n2\nDASHED\n70\n0\n3\nDashed\n72\n65\n73\n2\n40\n" + (1.0 * S).toFixed(4) + "\n49\n" + (0.6 * S).toFixed(4) + "\n49\n" + (-0.4 * S).toFixed(4) + "\n";
        dxf += "0\nLTYPE\n2\nCENTER\n70\n0\n3\nCenter\n72\n65\n73\n4\n40\n" + (2.0 * S).toFixed(4) + "\n49\n" + (1.0 * S).toFixed(4) + "\n49\n" + (-0.3 * S).toFixed(4) + "\n49\n" + (0.3 * S).toFixed(4) + "\n49\n" + (-0.3 * S).toFixed(4) + "\n";
        dxf += "0\nENDTAB\n";

        // 3. Layer table chuẩn kỹ thuật địa chính (R12 chuẩn không dùng handle)
        dxf += "0\nTABLE\n2\nLAYER\n70\n18\n";
        dxf += "0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nCAD_MUITEN\n70\n0\n62\n2\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nCAD_TEXT\n70\n0\n62\n7\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nCAD_HINHKHOI\n70\n0\n62\n6\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nCAD_TEMNHAN\n70\n0\n62\n4\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nKHUNG_NGOAI\n70\n0\n62\n7\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nKHUNG_TRONG\n70\n0\n62\n7\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nKHUNG_TEN\n70\n0\n62\n4\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nBANG_BIEU\n70\n0\n62\n4\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nRANH_THUA\n70\n0\n62\n5\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nDINH_MOC\n70\n0\n62\n1\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nTEN_MOC\n70\n0\n62\n3\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nKICH_THUOC\n70\n0\n62\n2\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nDIEN_TICH\n70\n0\n62\n6\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nLUOI_TOADO\n70\n0\n62\n8\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nTEXT_CHINH\n70\n0\n62\n7\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nTEXT_SO_LIEU\n70\n0\n62\n3\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nHUONG_BAC\n70\n0\n62\n4\n6\nCONTINUOUS\n";
        dxf += "0\nENDTAB\n";

        // 4. Style table: Khai báo STANDARD và VN_ARIAL
        dxf += "0\nTABLE\n2\nSTYLE\n70\n2\n";
        dxf += "0\nSTYLE\n2\nSTANDARD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\ntxt\n";
        dxf += "0\nSTYLE\n2\nVN_ARIAL\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n2.5\n3\narial.ttf\n";
        dxf += "0\nENDTAB\n";

        dxf += "0\nENDSEC\n";

        // ENTITIES SECTION
        dxf += "0\nSECTION\n2\nENTITIES\n";

        // === A. KHUNG BẢN VẼ CHUẨN XÁC THEO KHỔ GIẤY (A3/A4) ===
        // 1. Khung Ngoài (Mép cắt khổ giấy A3/A4 chuẩn mm)
        dxf += `0\nPOLYLINE\n8\nKHUNG_NGOAI\n66\n1\n70\n1\n10\n0.0\n20\n0.0\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_NGOAI\n10\n${L.X0.toFixed(3)}\n20\n${L.Y0.toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_NGOAI\n10\n${(L.X0 + L.W_sheet).toFixed(3)}\n20\n${L.Y0.toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_NGOAI\n10\n${(L.X0 + L.W_sheet).toFixed(3)}\n20\n${(L.Y0 + L.H_sheet).toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_NGOAI\n10\n${L.X0.toFixed(3)}\n20\n${(L.Y0 + L.H_sheet).toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nSEQEND\n8\nKHUNG_NGOAI\n`;

        // 2. Khung Trong (Đậm nét 0.50mm, cách lề trái 20mm, lề phải/trên/dưới 10mm)
        dxf += `0\nPOLYLINE\n8\nKHUNG_TRONG\n66\n1\n70\n1\n10\n0.0\n20\n0.0\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_TRONG\n10\n${L.Xin0.toFixed(3)}\n20\n${L.Yin0.toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_TRONG\n10\n${L.Xin1.toFixed(3)}\n20\n${L.Yin0.toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_TRONG\n10\n${L.Xin1.toFixed(3)}\n20\n${L.Yin1.toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nVERTEX\n8\nKHUNG_TRONG\n10\n${L.Xin0.toFixed(3)}\n20\n${L.Yin1.toFixed(3)}\n30\n0.0\n`;
        dxf += `0\nSEQEND\n8\nKHUNG_TRONG\n`;

        // 3. Đường phân cách giữa Vùng Bản Đồ và Cột Bảng Kê Bên Phải
        dxf += `0\nLINE\n8\nKHUNG_TRONG\n10\n${L.Xpanel0.toFixed(3)}\n20\n${L.Yin0.toFixed(3)}\n30\n0.0\n11\n${L.Xpanel0.toFixed(3)}\n21\n${L.Yin1.toFixed(3)}\n31\n0.0\n`;

        // === B. LƯỚI TỌA ĐỘ CHUẨN TRẮC ĐỊA: DẤU CHỮ THẬP (+) & TỌA ĐỘ BIÊN ===
        const crossArm = 3.5 * S; // Cánh chữ thập dài 3.5mm trên giấy
        const tickLen = 2.0 * S;  // Vạch chia biên 2.0mm trên giấy

        const startGx = Math.ceil(L.Xin0 / L.gridInterval) * L.gridInterval;
        const endGx = Math.floor(L.Xpanel0 / L.gridInterval) * L.gridInterval;
        const startGy = Math.ceil(L.Yin0 / L.gridInterval) * L.gridInterval;
        const endGy = Math.floor(L.Yin1 / L.gridInterval) * L.gridInterval;

        for (let gx = startGx; gx <= endGx; gx += L.gridInterval) {
            for (let gy = startGy; gy <= endGy; gy += L.gridInterval) {
                // Dấu chữ thập tọa độ trong lòng bản đồ
                if (gx > L.Xin0 + 8 * S && gx < L.Xpanel0 - 8 * S && gy > L.Yin0 + 8 * S && gy < L.Yin1 - 8 * S) {
                    dxf += `0\nLINE\n8\nLUOI_TOADO\n10\n${(gx - crossArm).toFixed(3)}\n20\n${gy.toFixed(3)}\n30\n0.0\n11\n${(gx + crossArm).toFixed(3)}\n21\n${gy.toFixed(3)}\n31\n0.0\n`;
                    dxf += `0\nLINE\n8\nLUOI_TOADO\n10\n${gx.toFixed(3)}\n20\n${(gy - crossArm).toFixed(3)}\n30\n0.0\n11\n${gx.toFixed(3)}\n21\n${(gy + crossArm).toFixed(3)}\n31\n0.0\n`;
                }
            }
            // Vạch chia & Tọa độ cạnh dưới
            dxf += `0\nLINE\n8\nLUOI_TOADO\n10\n${gx.toFixed(3)}\n20\n${L.Yin0.toFixed(3)}\n30\n0.0\n11\n${gx.toFixed(3)}\n21\n${(L.Yin0 + tickLen).toFixed(3)}\n31\n0.0\n`;
            dxf += `0\nTEXT\n8\nLUOI_TOADO\n10\n${(gx - 8 * S).toFixed(3)}\n20\n${(L.Yin0 - 3.2 * S).toFixed(3)}\n30\n0.0\n40\n${(1.8 * S).toFixed(4)}\n1\nY=${gx.toFixed(0)}\n7\nVN_ARIAL\n`;
        }

        for (let gy = startGy; gy <= endGy; gy += L.gridInterval) {
            // Vạch chia & Tọa độ cạnh trái
            dxf += `0\nLINE\n8\nLUOI_TOADO\n10\n${L.Xin0.toFixed(3)}\n20\n${gy.toFixed(3)}\n30\n0.0\n11\n${(L.Xin0 + tickLen).toFixed(3)}\n21\n${gy.toFixed(3)}\n31\n0.0\n`;
            dxf += `0\nTEXT\n8\nLUOI_TOADO\n10\n${(L.Xin0 - 16 * S).toFixed(3)}\n20\n${(gy - 0.9 * S).toFixed(3)}\n30\n0.0\n40\n${(1.8 * S).toFixed(4)}\n1\nX=${gy.toFixed(0)}\n7\nVN_ARIAL\n`;
        }

        // === C. KIM CHỈ HƯỚNG BẮC (NORTH ARROW CHUẨN ĐỊA CHÍNH TCVN) ===
        const naX = L.Xin0 + 16.0 * S;
        const naY = L.Yin1 - 22.0 * S;
        const naR = 4.5 * S;
        const naH = 14.0 * S;

        dxf += `0\nCIRCLE\n8\nHUONG_BAC\n10\n${naX.toFixed(3)}\n20\n${naY.toFixed(3)}\n30\n0.0\n40\n${naR.toFixed(4)}\n`;
        dxf += `0\nLINE\n8\nHUONG_BAC\n10\n${naX.toFixed(3)}\n20\n${(naY - naR).toFixed(3)}\n30\n0.0\n11\n${naX.toFixed(3)}\n21\n${(naY + naH).toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nHUONG_BAC\n10\n${(naX - naR * 0.8).toFixed(3)}\n20\n${naY.toFixed(3)}\n30\n0.0\n11\n${naX.toFixed(3)}\n21\n${(naY + naH).toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nHUONG_BAC\n10\n${(naX + naR * 0.8).toFixed(3)}\n20\n${naY.toFixed(3)}\n30\n0.0\n11\n${naX.toFixed(3)}\n21\n${(naY + naH).toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nTEXT\n8\nHUONG_BAC\n10\n${(naX - 1.2 * S).toFixed(3)}\n20\n${(naY + naH + 1.2 * S).toFixed(3)}\n30\n0.0\n40\n${(3.2 * S).toFixed(4)}\n1\nB\n7\nVN_ARIAL\n`;

        // === D. CÁC ĐỐI TƯỢNG ĐỒ HỌA THỬA ĐẤT (VÙNG TRỌNG TÂM BẢN ĐỒ) ===
        selectedShapes.forEach((shape, shapeIdx) => {
            const rawPts = shape.vertices || [];
            const pts = rawPts.map((p, i) => this._normalizeVertex(p, i)).filter(p => isFinite(p.x) && isFinite(p.y) && p.x > 1000);
            const n = pts.length;
            if (n < 2) return;
            const isClosed = (shape.mode === 'polygon' && n >= 3);
            const stats = shape.stats || this.calculateAreaAndPerimeter(pts, shape.mode);

            // Đường ranh thửa nét đậm 0.50mm
            if (meta.showBoundaries !== false) {
                dxf += `0\nPOLYLINE\n8\nRANH_THUA\n66\n1\n70\n${isClosed ? 1 : 0}\n10\n0.0\n20\n0.0\n30\n0.0\n`;
                pts.forEach(p => {
                    dxf += `0\nVERTEX\n8\nRANH_THUA\n10\n${p.y.toFixed(3)}\n20\n${p.x.toFixed(3)}\n30\n0.0\n`;
                });
                dxf += `0\nSEQEND\n8\nRANH_THUA\n`;
            }

            // Điểm đỉnh mốc & Nhãn tên mốc (Hiển thị khi meta.showVertices !== false)
            if (meta.showVertices !== false) {
                const mRadius = 1.0 * S; // Bán kính mốc 1mm trên giấy
                pts.forEach((p, idx) => {
                    const cadX = p.y;
                    const cadY = p.x;
                    dxf += `0\nCIRCLE\n8\nDINH_MOC\n10\n${cadX.toFixed(3)}\n20\n${cadY.toFixed(3)}\n30\n0.0\n40\n${mRadius.toFixed(4)}\n`;
                    dxf += `0\nPOINT\n8\nDINH_MOC\n10\n${cadX.toFixed(3)}\n20\n${cadY.toFixed(3)}\n30\n0.0\n`;

                    const cleanName = this.toCadAscii(p.name || `D${idx + 1}`);
                    dxf += `0\nTEXT\n8\nTEN_MOC\n10\n${(cadX + 1.5 * S).toFixed(3)}\n20\n${(cadY + 1.2 * S).toFixed(3)}\n30\n0.0\n40\n${(2.0 * S).toFixed(4)}\n1\n${cleanName}\n7\nVN_ARIAL\n`;
                });
            }

            // Chiều dài cạnh / khoảng cách đỉnh (vẽ khi meta.showDistances hoặc showBlockInfo)
            if (meta.showDistances && stats.edges) {
                stats.edges.forEach((edge, idx) => {
                    const p1 = pts[idx];
                    const p2 = pts[(idx + 1) % n];
                    const midX = (p1.y + p2.y) / 2;
                    const midY = (p1.x + p2.x) / 2;

                    const dx = p2.y - p1.y;
                    const dy = p2.x - p1.x;
                    const len = Math.hypot(dx, dy);
                    let angDeg = Math.atan2(dy, dx) * (180.0 / Math.PI);
                    if (angDeg < 0) angDeg += 360;

                    const offDist = 1.4 * S;
                    const perpX = (-dy / (len || 1)) * offDist;
                    const perpY = (dx / (len || 1)) * offDist;

                    let textRot = angDeg;
                    if (angDeg > 90 && angDeg < 270) textRot = (angDeg + 180) % 360;

                    dxf += `0\nTEXT\n8\nKICH_THUOC\n10\n${(midX + perpX).toFixed(3)}\n20\n${(midY + perpY).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n50\n${textRot.toFixed(2)}\n1\n${edge.lengthFormatted}m\n7\nVN_ARIAL\n`;
                });
            }

            // Nhãn tâm thửa đất (Visual Interior Center - tối ưu hiển thị trong lòng khối chữ L/khuyết góc)
            if (meta.showCenterLabels !== false && isClosed && stats.area > 0) {
                const center = this.calculatePolygonVisualCenter(pts.map(p => ({ x: p.y, y: p.x })));
                const cX = center.x;
                const cY = center.y;

                const blockSymbol = shape.symbol ? shape.symbol : String(shapeIdx + 1);
                const cleanSymbol = this.toCadAscii(blockSymbol);
                if (showBlockInfo) {
                    // Chế độ đầy đủ: ký hiệu + tên + diện tích + chu vi
                    let pctStr = '';
                    if (showPercent && baseProjectArea > 0) {
                        pctStr = ` (${((stats.area / baseProjectArea) * 100).toFixed(2)}%)`;
                    }
                    dxf += `0\nTEXT\n8\nDIEN_TICH\n10\n${(cX - 8 * S).toFixed(3)}\n20\n${(cY + 3.0 * S).toFixed(3)}\n30\n0.0\n40\n${(2.8 * S).toFixed(4)}\n1\n[${cleanSymbol}] ${this.toCadAscii(shape.name || '')}${pctStr}\n7\nVN_ARIAL\n`;
                    dxf += `0\nTEXT\n8\nDIEN_TICH\n10\n${(cX - 8 * S).toFixed(3)}\n20\n${cY.toFixed(3)}\n30\n0.0\n40\n${(2.4 * S).toFixed(4)}\n1\nS=${stats.areaFormatted}m2 (${stats.haFormatted}ha)\n7\nVN_ARIAL\n`;
                    dxf += `0\nTEXT\n8\nDIEN_TICH\n10\n${(cX - 8 * S).toFixed(3)}\n20\n${(cY - 2.8 * S).toFixed(3)}\n30\n0.0\n40\n${(1.8 * S).toFixed(4)}\n1\nP=${stats.perimeterFormatted}m\n7\nVN_ARIAL\n`;
                } else {
                    // Chế độ mặc định (Bắt buộc theo yêu cầu): CHỈ HIỂN THỊ SỐ THỨ TỰ HOẶC KÝ HIỆU KHỐI TẠI TÂM
                    dxf += `0\nTEXT\n8\nDIEN_TICH\n10\n${(cX - 2.5 * S).toFixed(3)}\n20\n${(cY - 1.2 * S).toFixed(3)}\n30\n0.0\n40\n${(3.5 * S).toFixed(4)}\n1\n${cleanSymbol}\n7\nVN_ARIAL\n`;
                }
            } else if (!isClosed && shape.mode !== 'polygon') {
                if (!showBlockInfo) {
                    const midIdx = Math.floor(pts.length / 2);
                    const mp = pts[midIdx] || pts[0];
                    dxf += `0\nTEXT\n8\nDIEN_TICH\n10\n${(mp.y + 1.5 * S).toFixed(3)}\n20\n${(mp.x + 1.5 * S).toFixed(3)}\n30\n0.0\n40\n${(2.6 * S).toFixed(4)}\n1\n${this.toCadAscii(shape.name)}\n7\nVN_ARIAL\n`;
                }
            }
        });

        // === E. CÁC ĐỐI TƯỢNG CHÚ THÍCH & HÌNH KHỐI (MINICAD ANNOTATIONS) ===
        if (meta.showAnnotations !== false && this.annotations && this.annotations.length > 0) {
            this.annotations.forEach(ann => {
                switch (ann.type) {
                    case 'arrow': {
                        const vnStart = convertWgsToVn2k(ann.startLat, ann.startLng, AppState.kttVal, AppState.scaleFactor);
                        const vnEnd = convertWgsToVn2k(ann.endLat, ann.endLng, AppState.kttVal, AppState.scaleFactor);
                        const x1 = vnStart.Y, y1 = vnStart.X;
                        const x2 = vnEnd.Y, y2 = vnEnd.X;

                        dxf += "0\nLINE\n8\nCAD_MUITEN\n10\n" + x1.toFixed(3) + "\n20\n" + y1.toFixed(3) + "\n30\n0.0\n11\n" + x2.toFixed(3) + "\n21\n" + y2.toFixed(3) + "\n31\n0.0\n";

                        const dx = x1 - x2, dy = y1 - y2;
                        const len = Math.hypot(dx, dy) || 1;
                        const ux = dx / len, uy = dy / len;
                        const aLen = 2.5 * S;
                        const aWid = 1.0 * S;
                        const ax = x1 - ux * aLen, ay = y1 - uy * aLen;
                        const px1 = ax - uy * aWid, py1 = ay + ux * aWid;
                        const px2 = ax + uy * aWid, py2 = ay - ux * aWid;

                        dxf += "0\nSOLID\n8\nCAD_MUITEN\n10\n" + x1.toFixed(3) + "\n20\n" + y1.toFixed(3) + "\n30\n0.0\n11\n" + px1.toFixed(3) + "\n21\n" + py1.toFixed(3) + "\n31\n0.0\n12\n" + px2.toFixed(3) + "\n22\n" + py2.toFixed(3) + "\n32\n0.0\n13\n" + x1.toFixed(3) + "\n23\n" + y1.toFixed(3) + "\n33\n0.0\n";

                        const textStr = this.toCadAscii(ann.arrowText || 'Ghi chu');
                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (x2 + 1.2 * S).toFixed(3) + "\n20\n" + (y2 + 0.8 * S).toFixed(3) + "\n30\n0.0\n40\n" + (((ann.fontSize || 12) * 0.22 * S).toFixed(4)) + "\n1\n" + textStr + "\n7\nVN_ARIAL\n";
                        break;
                    }

                    case 'north_arrow': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cX = vn.Y, cY = vn.X;
                        const nR = 4.0 * S;
                        const nH = 12.0 * S;
                        dxf += "0\nCIRCLE\n8\nHUONG_BAC\n10\n" + cX.toFixed(3) + "\n20\n" + cY.toFixed(3) + "\n30\n0.0\n40\n" + nR.toFixed(4) + "\n";
                        dxf += "0\nLINE\n8\nHUONG_BAC\n10\n" + cX.toFixed(3) + "\n20\n" + (cY - nR).toFixed(3) + "\n30\n0.0\n11\n" + cX.toFixed(3) + "\n21\n" + (cY + nH).toFixed(3) + "\n31\n0.0\n";
                        dxf += "0\nLINE\n8\nHUONG_BAC\n10\n" + (cX - nR * 0.7).toFixed(3) + "\n20\n" + cY.toFixed(3) + "\n30\n0.0\n11\n" + cX.toFixed(3) + "\n21\n" + (cY + nH).toFixed(3) + "\n31\n0.0\n";
                        dxf += "0\nLINE\n8\nHUONG_BAC\n10\n" + (cX + nR * 0.7).toFixed(3) + "\n20\n" + cY.toFixed(3) + "\n30\n0.0\n11\n" + cX.toFixed(3) + "\n21\n" + (cY + nH).toFixed(3) + "\n31\n0.0\n";
                        dxf += "0\nTEXT\n8\nHUONG_BAC\n10\n" + (cX - 1.0 * S).toFixed(3) + "\n20\n" + (cY + nH + 1.2 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((2.8 * S).toFixed(4)) + "\n1\nB\n7\nVN_ARIAL\n";
                        break;
                    }

                    case 'rect': {
                        if (ann.corners && ann.corners.length >= 4) {
                            const vnPts = ann.corners.map(c => convertWgsToVn2k(c[0], c[1], AppState.kttVal, AppState.scaleFactor));
                            dxf += "0\nPOLYLINE\n8\nCAD_HINHKHOI\n66\n1\n70\n1\n10\n0.0\n20\n0.0\n30\n0.0\n";
                            vnPts.forEach(p => {
                                dxf += "0\nVERTEX\n8\nCAD_HINHKHOI\n10\n" + p.Y.toFixed(3) + "\n20\n" + p.X.toFixed(3) + "\n30\n0.0\n";
                            });
                            dxf += "0\nSEQEND\n8\nCAD_HINHKHOI\n";

                            const vnCenter = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                            const nameStr = this.toCadAscii(ann.rectName || 'Khoi nha');
                            const dimStr = ann.widthM + "x" + ann.lengthM + "m (" + ann.rectArea + "m2)";
                            dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (vnCenter.Y - 5 * S).toFixed(3) + "\n20\n" + (vnCenter.X + 1 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((2.0 * S).toFixed(4)) + "\n1\n" + nameStr + "\n7\nVN_ARIAL\n";
                            dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (vnCenter.Y - 5 * S).toFixed(3) + "\n20\n" + (vnCenter.X - 2 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((1.6 * S).toFixed(4)) + "\n1\n" + dimStr + "\n7\nVN_ARIAL\n";
                        }
                        break;
                    }

                    case 'circle': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cX = vn.Y, cY = vn.X;
                        const r = ann.radiusM || 10;
                        dxf += "0\nCIRCLE\n8\nCAD_HINHKHOI\n10\n" + cX.toFixed(3) + "\n20\n" + cY.toFixed(3) + "\n30\n0.0\n40\n" + r.toFixed(4) + "\n";
                        const nameStr = this.toCadAscii(ann.circleName || 'Vung bao ve');
                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (cX - 6 * S).toFixed(3) + "\n20\n" + cY.toFixed(3) + "\n30\n0.0\n40\n" + ((1.8 * S).toFixed(4)) + "\n1\n" + nameStr + " (R=" + r + "m)\n7\nVN_ARIAL\n";
                        break;
                    }

                    case 'stamp': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cX = vn.Y, cY = vn.X;
                        const stampW = 24.0 * S;
                        const stampH = 14.0 * S;
                        dxf += "0\nPOLYLINE\n8\nCAD_TEMNHAN\n66\n1\n70\n1\n10\n0.0\n20\n0.0\n30\n0.0\n";
                        dxf += "0\nVERTEX\n8\nCAD_TEMNHAN\n10\n" + (cX - stampW / 2).toFixed(3) + "\n20\n" + (cY - stampH / 2).toFixed(3) + "\n30\n0.0\n";
                        dxf += "0\nVERTEX\n8\nCAD_TEMNHAN\n10\n" + (cX + stampW / 2).toFixed(3) + "\n20\n" + (cY - stampH / 2).toFixed(3) + "\n30\n0.0\n";
                        dxf += "0\nVERTEX\n8\nCAD_TEMNHAN\n10\n" + (cX + stampW / 2).toFixed(3) + "\n20\n" + (cY + stampH / 2).toFixed(3) + "\n30\n0.0\n";
                        dxf += "0\nVERTEX\n8\nCAD_TEMNHAN\n10\n" + (cX - stampW / 2).toFixed(3) + "\n20\n" + (cY + stampH / 2).toFixed(3) + "\n30\n0.0\n";
                        dxf += "0\nSEQEND\n8\nCAD_TEMNHAN\n";

                        dxf += "0\nLINE\n8\nCAD_TEMNHAN\n10\n" + (cX - stampW / 2).toFixed(3) + "\n20\n" + (cY + stampH / 2 - 4 * S).toFixed(3) + "\n30\n0.0\n11\n" + (cX + stampW / 2).toFixed(3) + "\n21\n" + (cY + stampH / 2 - 4 * S).toFixed(3) + "\n31\n0.0\n";

                        const h1 = "To: " + (ann.sheetNo || '01') + " - Thua: " + (ann.parcelNo || '01');
                        const h2 = "DT: " + this.toCadAscii(ann.area || '--');
                        const h3 = "Chu: " + this.toCadAscii(ann.owner || '--');
                        const h4 = "Loai: " + this.toCadAscii(ann.landType || '--');

                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (cX - stampW / 2 + 1.2 * S).toFixed(3) + "\n20\n" + (cY + stampH / 2 - 3.0 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((1.8 * S).toFixed(4)) + "\n1\n" + h1 + "\n7\nVN_ARIAL\n";
                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (cX - stampW / 2 + 1.2 * S).toFixed(3) + "\n20\n" + (cY + stampH / 2 - 6.5 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((1.5 * S).toFixed(4)) + "\n1\n" + h2 + "\n7\nVN_ARIAL\n";
                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (cX - stampW / 2 + 1.2 * S).toFixed(3) + "\n20\n" + (cY + stampH / 2 - 9.5 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((1.5 * S).toFixed(4)) + "\n1\n" + h3 + "\n7\nVN_ARIAL\n";
                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + (cX - stampW / 2 + 1.2 * S).toFixed(3) + "\n20\n" + (cY + stampH / 2 - 12.5 * S).toFixed(3) + "\n30\n0.0\n40\n" + ((1.5 * S).toFixed(4)) + "\n1\n" + h4 + "\n7\nVN_ARIAL\n";
                        break;
                    }

                    case 'text': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cX = vn.Y, cY = vn.X;
                        const txt = this.toCadAscii(ann.text || 'Ghi chu');
                        const fSize = (ann.fontSize || 12) * 0.22 * S;
                        dxf += "0\nTEXT\n8\nCAD_TEXT\n10\n" + cX.toFixed(3) + "\n20\n" + cY.toFixed(3) + "\n30\n0.0\n40\n" + fSize.toFixed(4) + "\n1\n" + txt + "\n7\nVN_ARIAL\n";
                        break;
                    }
                }
            });
        }

        // === E. BẢNG BIỂU & KHUNG TÊN CỘT BÊN PHẢI (RIGHT PANEL - CHUẨN TCVN 7285) ===
        const colWPanel = L.W_panel;
        let curTableY = L.Yin1;

        // --- 1. BẢNG TỔNG HỢP DIỆN TÍCH CÁC THỬA ĐẤT (CHUẨN GỌN - ĐÃ BỎ CỘT LOẠI & CHU VI) ---
        const sumRowH = 5.0 * S;
        // 4 cột phân bổ chính xác 100% bề rộng cột bên phải (colWPanel)
        const colWSum = [
            colWPanel * 0.10, // STT
            colWPanel * 0.44, // Ký hiệu / Tên thửa (rộng rãi, không đè chữ)
            colWPanel * 0.28, // Diện tích (m²)
            colWPanel * 0.18  // Tỉ lệ (%)
        ];

        // Tiêu đề bảng tổng hợp
        dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nTEXT\n8\nTEXT_CHINH\n10\n${(L.Xpanel0 + colWPanel / 2 - 24 * S).toFixed(3)}\n20\n${(curTableY - 4.2 * S).toFixed(3)}\n30\n0.0\n40\n${(2.4 * S).toFixed(4)}\n1\nBANG TONG HOP DIEN TICH\n7\nVN_ARIAL\n`;
        curTableY -= 6.0 * S;
        dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

        const sumHeaders = ["STT", "Ten thua", "Dien tich(m2)", "Ti le(%)"];
        let shX = L.Xpanel0;
        sumHeaders.forEach((h, idx) => {
            dxf += `0\nTEXT\n8\nTEXT_CHINH\n10\n${(shX + 1.2 * S).toFixed(3)}\n20\n${(curTableY - 3.6 * S).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n1\n${h}\n7\nVN_ARIAL\n`;
            shX += colWSum[idx];
        });

        const sumTopY = curTableY;
        curTableY -= sumRowH;
        dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

        function wrapDxfLines(txt, maxLen = 18) {
            if (!txt) return [''];
            const words = String(txt).trim().split(/\s+/);
            const lines = [];
            let cur = '';
            for (const w of words) {
                if (!cur) {
                    cur = w;
                } else if ((cur + ' ' + w).length <= maxLen) {
                    cur += ' ' + w;
                } else {
                    lines.push(cur);
                    cur = w;
                }
            }
            if (cur) lines.push(cur);
            return lines.length > 0 ? lines : [''];
        }

        selectedShapes.forEach((s, idx) => {
            const isPoly = s.mode === 'polygon';
            const area = s.stats?.area || 0;
            const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';

            const cleanName = this.toCadAscii(s.name || `Thua ${idx + 1}`);
            const rowSymbol = s.symbol ? `[${this.toCadAscii(s.symbol)}] ` : '';
            const fullLabel = rowSymbol + cleanName;
            const nameLines = wrapDxfLines(fullLabel, 18);
            const dynamicRowH = (Math.max(1, nameLines.length) * 2.8 + 2.2) * S;

            // STT, Area, Pct hiển thị tại dòng đầu tiên
            dxf += `0\nTEXT\n8\nTEXT_SO_LIEU\n10\n${(L.Xpanel0 + 1.2 * S).toFixed(3)}\n20\n${(curTableY - 3.4 * S).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n1\n${idx + 1}\n7\nVN_ARIAL\n`;
            
            // Xuống dòng tên khối/thửa không xóa mất ký tự hay thay bằng ".."
            nameLines.forEach((line, lIdx) => {
                dxf += `0\nTEXT\n8\nTEXT_SO_LIEU\n10\n${(L.Xpanel0 + colWSum[0] + 1.2 * S).toFixed(3)}\n20\n${(curTableY - (3.4 + lIdx * 2.8) * S).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n1\n${line}\n7\nVN_ARIAL\n`;
            });

            dxf += `0\nTEXT\n8\nTEXT_SO_LIEU\n10\n${(L.Xpanel0 + colWSum[0] + colWSum[1] + 1.2 * S).toFixed(3)}\n20\n${(curTableY - 3.4 * S).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n1\n${isPoly ? area.toFixed(2) : '--'}\n7\nVN_ARIAL\n`;
            dxf += `0\nTEXT\n8\nTEXT_SO_LIEU\n10\n${(L.Xpanel0 + colWSum[0] + colWSum[1] + colWSum[2] + 1.2 * S).toFixed(3)}\n20\n${(curTableY - 3.4 * S).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n1\n${pctStr}\n7\nVN_ARIAL\n`;

            curTableY -= dynamicRowH;
            dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
        });

        // Dòng tổng cộng bảng tổng hợp
        const totalPctVal = (baseProjectArea > 0) ? ((measuredTotalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
        const sumTotalRow = ['--', 'TONG CONG', measuredTotalArea.toFixed(2), totalPctVal];
        let strX = L.Xpanel0;
        sumTotalRow.forEach((val, cIdx) => {
            dxf += `0\nTEXT\n8\nTEXT_CHINH\n10\n${(strX + 1.2 * S).toFixed(3)}\n20\n${(curTableY - 3.6 * S).toFixed(3)}\n30\n0.0\n40\n${(1.7 * S).toFixed(4)}\n1\n${val}\n7\nVN_ARIAL\n`;
            strX += colWSum[cIdx];
        });

        curTableY -= sumRowH;
        dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

        // Kẻ dọc bảng tổng hợp (chuẩn khít tuyệt đối với colWPanel)
        const sumBottomY = curTableY;
        let svLineX = L.Xpanel0;
        dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${svLineX.toFixed(3)}\n20\n${sumTopY.toFixed(3)}\n30\n0.0\n11\n${svLineX.toFixed(3)}\n21\n${sumBottomY.toFixed(3)}\n31\n0.0\n`;
        colWSum.forEach(w => {
            svLineX += w;
            dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${svLineX.toFixed(3)}\n20\n${sumTopY.toFixed(3)}\n30\n0.0\n11\n${svLineX.toFixed(3)}\n21\n${sumBottomY.toFixed(3)}\n31\n0.0\n`;
        });

        // --- 2. BẢNG KÊ TỌA ĐỘ RANH THỬA (TCVN 7285) ---
        curTableY -= 4.0 * S;
        // 6 cột phân bổ vừa khít 100% colWPanel
        const colWCoord = [
            colWPanel * 0.10, // STT
            colWPanel * 0.16, // Diem
            colWPanel * 0.21, // X (Bac)
            colWPanel * 0.21, // Y (Dong)
            colWPanel * 0.16, // Canh (m)
            colWPanel * 0.16  // Huong (Az)
        ];
        const coordRowH = 4.2 * S;

        // Chỉ vẽ bảng kê nếu còn đủ chỗ phía trên khung tên
        if (curTableY > L.YtitleTop + 20 * S) {
            dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
            dxf += `0\nTEXT\n8\nTEXT_CHINH\n10\n${(L.Xpanel0 + colWPanel / 2 - 24 * S).toFixed(3)}\n20\n${(curTableY - 3.8 * S).toFixed(3)}\n30\n0.0\n40\n${(2.2 * S).toFixed(4)}\n1\nBANG KE TOA DO RANH THUA\n7\nVN_ARIAL\n`;
            curTableY -= 5.0 * S;
            dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

            const coordHeaders = ["STT", "Diem", "X(Bac)", "Y(Dong)", "Canh", "Az"];
            let chX = L.Xpanel0;
            coordHeaders.forEach((h, idx) => {
                dxf += `0\nTEXT\n8\nTEXT_CHINH\n10\n${(chX + 1.0 * S).toFixed(3)}\n20\n${(curTableY - 3.2 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\n${h}\n7\nVN_ARIAL\n`;
                chX += colWCoord[idx];
            });

            const coordTopY = curTableY;
            curTableY -= coordRowH;
            dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

            // Lấy danh sách điểm ranh
            selectedShapes.forEach(shape => {
                const pts = shape.vertices;
                const stats = shape.stats || {};
                pts.forEach((p, pIdx) => {
                    if (curTableY <= L.YtitleTop + 6 * S) return; // Dừng nếu chạm khung tên

                    const edge = stats.edges ? stats.edges[pIdx] : null;
                    const edgeStr = edge ? edge.lengthFormatted : '--';
                    const azStr = (edge && typeof edge.azimuth === 'number') ? `${edge.azimuth.toFixed(1)} deg` : (edge?.azFormatted || '--');
                    const cleanName = this.toCadAscii(p.name || `D${pIdx + 1}`);

                    const row = [String(pIdx + 1), cleanName, p.x.toFixed(3), p.y.toFixed(3), edgeStr, azStr];
                    let rx = L.Xpanel0;
                    row.forEach((v, cIdx) => {
                        dxf += `0\nTEXT\n8\nTEXT_SO_LIEU\n10\n${(rx + 1.0 * S).toFixed(3)}\n20\n${(curTableY - 3.0 * S).toFixed(3)}\n30\n0.0\n40\n${(1.5 * S).toFixed(4)}\n1\n${v}\n7\nVN_ARIAL\n`;
                        rx += colWCoord[cIdx];
                    });

                    curTableY -= coordRowH;
                    dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${L.Xpanel0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${L.Xin1.toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
                });
            });

            // Kẻ dọc bảng kê tọa độ (vừa khít colWPanel)
            const coordBottomY = curTableY;
            let cvLineX = L.Xpanel0;
            dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${cvLineX.toFixed(3)}\n20\n${coordTopY.toFixed(3)}\n30\n0.0\n11\n${cvLineX.toFixed(3)}\n21\n${coordBottomY.toFixed(3)}\n31\n0.0\n`;
            colWCoord.forEach(w => {
                cvLineX += w;
                dxf += `0\nLINE\n8\nBANG_BIEU\n10\n${cvLineX.toFixed(3)}\n20\n${coordTopY.toFixed(3)}\n30\n0.0\n11\n${cvLineX.toFixed(3)}\n21\n${coordBottomY.toFixed(3)}\n31\n0.0\n`;
            });
        }

        // --- 3. KHUNG TÊN BẢN VẼ CHUẨN TCVN 7285 & THÔNG TƯ 25/2014/TT-BTNMT ---
        // Nằm ở góc dưới cùng bên phải: từ L.Xpanel0 đến L.Xin1, từ L.Yin0 đến L.YtitleTop (Cao 36mm)
        const tY0 = L.Yin0;
        const tY_top = L.YtitleTop;
        const tX0 = L.Xpanel0;
        const tX1 = L.Xin1;

        // Khung bao quanh khung tên
        dxf += `0\nLINE\n8\nKHUNG_TEN\n10\n${tX0.toFixed(3)}\n20\n${tY_top.toFixed(3)}\n30\n0.0\n11\n${tX1.toFixed(3)}\n21\n${tY_top.toFixed(3)}\n31\n0.0\n`;

        // Hàng 1 (Đơn vị đo vẽ - cao 8.5mm)
        const yRow1 = tY_top - 8.5 * S;
        dxf += `0\nLINE\n8\nKHUNG_TEN\n10\n${tX0.toFixed(3)}\n20\n${yRow1.toFixed(3)}\n30\n0.0\n11\n${tX1.toFixed(3)}\n21\n${yRow1.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(tX0 + 2.0 * S).toFixed(3)}\n20\n${(tY_top - 5.8 * S).toFixed(3)}\n30\n0.0\n40\n${(2.4 * S).toFixed(4)}\n1\n${this.toCadAscii(meta.organization || 'TRUNG TAM KHAO SAT & DO DAC DIA CHINH').toUpperCase()}\n7\nVN_ARIAL\n`;

        // Hàng 2 (Tên bản vẽ - cao 9.5mm)
        const yRow2 = yRow1 - 9.5 * S;
        dxf += `0\nLINE\n8\nKHUNG_TEN\n10\n${tX0.toFixed(3)}\n20\n${yRow2.toFixed(3)}\n30\n0.0\n11\n${tX1.toFixed(3)}\n21\n${yRow2.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(tX0 + 2.0 * S).toFixed(3)}\n20\n${(yRow1 - 6.2 * S).toFixed(3)}\n30\n0.0\n40\n${(2.8 * S).toFixed(4)}\n1\n${this.toCadAscii(meta.drawingName || 'BAN DO HIEN TRANG VI TRI THUA DAT').toUpperCase()}\n7\nVN_ARIAL\n`;

        // Hàng 3 (Tên công trình / dự án - cao 6.0mm)
        const yRow3 = yRow2 - 6.0 * S;
        dxf += `0\nLINE\n8\nKHUNG_TEN\n10\n${tX0.toFixed(3)}\n20\n${yRow3.toFixed(3)}\n30\n0.0\n11\n${tX1.toFixed(3)}\n21\n${yRow3.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(tX0 + 2.0 * S).toFixed(3)}\n20\n${(yRow2 - 4.2 * S).toFixed(3)}\n30\n0.0\n40\n${(2.0 * S).toFixed(4)}\n1\nDU AN: ${this.toCadAscii(meta.projectName || '').toUpperCase()}\n7\nVN_ARIAL\n`;

        // Hàng 4 (Thông tin chi tiết chia 2 cột - cao 12.0mm)
        const midColX = tX0 + colWPanel * 0.52;
        dxf += `0\nLINE\n8\nKHUNG_TEN\n10\n${midColX.toFixed(3)}\n20\n${yRow3.toFixed(3)}\n30\n0.0\n11\n${midColX.toFixed(3)}\n21\n${tY0.toFixed(3)}\n31\n0.0\n`;

        // Cột trái hàng 4
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(tX0 + 1.8 * S).toFixed(3)}\n20\n${(yRow3 - 3.2 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\nHe VN2k: ${this.toCadAscii(AppState.provinceName || 'Tinh')} KTT:${AppState.kttDeg}\n7\nVN_ARIAL\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(tX0 + 1.8 * S).toFixed(3)}\n20\n${(yRow3 - 6.8 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\nNguoi do: ${this.toCadAscii(meta.surveyor || '').toUpperCase()}\n7\nVN_ARIAL\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(tX0 + 1.8 * S).toFixed(3)}\n20\n${(yRow3 - 10.2 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\nKiem tra: ${this.toCadAscii(meta.checker || '').toUpperCase()}\n7\nVN_ARIAL\n`;

        // Cột phải hàng 4
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(midColX + 1.8 * S).toFixed(3)}\n20\n${(yRow3 - 3.2 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\nTy le: 1:${L.scaleVal}\n7\nVN_ARIAL\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(midColX + 1.8 * S).toFixed(3)}\n20\n${(yRow3 - 6.8 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\nSo to/thua: ${this.toCadAscii(meta.parcelNo || '01')}\n7\nVN_ARIAL\n`;
        dxf += `0\nTEXT\n8\nKHUNG_TEN\n10\n${(midColX + 1.8 * S).toFixed(3)}\n20\n${(yRow3 - 10.2 * S).toFixed(3)}\n30\n0.0\n40\n${(1.6 * S).toFixed(4)}\n1\nNgay lap: ${this.toCadAscii(meta.drawingDate)}\n7\nVN_ARIAL\n`;

        dxf += "0\nENDSEC\n0\nEOF\n";

        const blob = new Blob([dxf], { type: "application/dxf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `${projName}_BanDo_${meta.paper}_1-${L.scaleVal}.dxf`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất AutoCAD DXF chuẩn kỹ thuật khổ ${meta.paper} tỷ lệ 1:${L.scaleVal}: ${filename}`);
    },

    // === 3. XUẤT BẢN VẼ PDF CHUẨN IN ẤN ĐỘ PHÂN GIẢI CAO (A3/A4 CHUẨN TỶ LỆ) ===
    exportPdf() {
        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để xuất bản vẽ PDF!", true);
            return;
        }

        const meta = this._getExportMeta();
        const L = this._calculatePaperLayout(selectedShapes, meta);
        const S = L.S;
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "BanDo";

        showToast(`⏳ Đang kết xuất bản vẽ PDF vector khổ ${meta.paper} tỷ lệ 1:${L.scaleVal}...`);

        // Độ phân giải cao cho bản in PDF: 8 pixels/mm (~203.2 DPI, sắc nét tuyệt đối, kết xuất dưới 0.5s)
        const pxPerMm = 8.0;
        const W_px = Math.round(meta.paperW * pxPerMm);
        const H_px = Math.round(meta.paperH * pxPerMm);

        const canvas = document.createElement('canvas');
        canvas.width = W_px;
        canvas.height = H_px;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            showToast("⚠️ Trình duyệt không hỗ trợ tạo Canvas PDF!", true);
            return;
        }

        // Tọa độ CAD -> Canvas (Gốc CAD Y hướng lên, Canvas Y hướng xuống)
        const pxPerMeter = pxPerMm / S;
        const toCvX = (cadX) => Math.round((cadX - L.X0) * pxPerMeter);
        const toCvY = (cadY) => Math.round(H_px - (cadY - L.Y0) * pxPerMeter);
        const toCvDist = (cadDist) => Math.round(cadDist * pxPerMeter);

        // 1. Nền giấy trắng
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W_px, H_px);

        // 2. Khung Ngoài (Mảnh)
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = Math.round(0.2 * pxPerMm);
        ctx.strokeRect(toCvX(L.X0), toCvY(L.Y0 + L.H_sheet), toCvDist(L.W_sheet), toCvDist(L.H_sheet));

        // 3. Khung Trong (Nét đậm 0.5mm TCVN)
        const inX0 = toCvX(L.Xin0);
        const inY0 = toCvY(L.Yin1);
        const inW = toCvDist(L.W_inner);
        const inH = toCvDist(L.H_inner);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.round(0.5 * pxPerMm);
        ctx.strokeRect(inX0, inY0, inW, inH);

        // 4. Đường phân cách cột bảng bên phải
        const panelLineX = toCvX(L.Xpanel0);
        ctx.beginPath();
        ctx.moveTo(panelLineX, inY0);
        ctx.lineTo(panelLineX, inY0 + inH);
        ctx.stroke();

        // 5. Lưới tọa độ chữ thập (+) & Vạch chia biên
        const crossArm = Math.round(3.5 * pxPerMm);
        const startGx = Math.ceil(L.Xin0 / L.gridInterval) * L.gridInterval;
        const endGx = Math.floor(L.Xpanel0 / L.gridInterval) * L.gridInterval;
        const startGy = Math.ceil(L.Yin0 / L.gridInterval) * L.gridInterval;
        const endGy = Math.floor(L.Yin1 / L.gridInterval) * L.gridInterval;

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = Math.round(0.15 * pxPerMm);
        ctx.font = `${Math.round(1.8 * pxPerMm)}px Arial, sans-serif`;
        ctx.fillStyle = '#475569';

        for (let gx = startGx; gx <= endGx; gx += L.gridInterval) {
            for (let gy = startGy; gy <= endGy; gy += L.gridInterval) {
                if (gx > L.Xin0 + 8 * S && gx < L.Xpanel0 - 8 * S && gy > L.Yin0 + 8 * S && gy < L.Yin1 - 8 * S) {
                    const cx = toCvX(gx);
                    const cy = toCvY(gy);
                    ctx.beginPath();
                    ctx.moveTo(cx - crossArm, cy); ctx.lineTo(cx + crossArm, cy);
                    ctx.moveTo(cx, cy - crossArm); ctx.lineTo(cx, cy + crossArm);
                    ctx.stroke();
                }
            }
            const cx = toCvX(gx);
            const cyBottom = toCvY(L.Yin0);
            ctx.beginPath();
            ctx.moveTo(cx, cyBottom); ctx.lineTo(cx, cyBottom - Math.round(2 * pxPerMm));
            ctx.stroke();
            ctx.fillText(`Y=${gx}`, cx - Math.round(8 * pxPerMm), cyBottom + Math.round(4 * pxPerMm));
        }

        for (let gy = startGy; gy <= endGy; gy += L.gridInterval) {
            const cy = toCvY(gy);
            const cxLeft = toCvX(L.Xin0);
            ctx.beginPath();
            ctx.moveTo(cxLeft, cy); ctx.lineTo(cxLeft + Math.round(2 * pxPerMm), cy);
            ctx.stroke();
            ctx.fillText(`X=${gy}`, cxLeft - Math.round(18 * pxPerMm), cy + Math.round(1 * pxPerMm));
        }

        // 6. Kim chỉ hướng Bắc
        const naX = toCvX(L.Xin0 + 16.0 * S);
        const naY = toCvY(L.Yin1 - 22.0 * S);
        const naR = Math.round(4.5 * pxPerMm);
        const naH = Math.round(14.0 * pxPerMm);

        ctx.strokeStyle = '#0284c7';
        ctx.fillStyle = '#0284c7';
        ctx.lineWidth = Math.round(0.3 * pxPerMm);
        ctx.beginPath();
        ctx.arc(naX, naY, naR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(naX, naY - naH);
        ctx.lineTo(naX + Math.round(naR * 0.8), naY);
        ctx.lineTo(naX, naY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(naX, naY - naH);
        ctx.lineTo(naX - Math.round(naR * 0.8), naY);
        ctx.lineTo(naX, naY);
        ctx.stroke();
        ctx.font = `bold ${Math.round(3.5 * pxPerMm)}px Arial`;
        ctx.fillText("B", naX - Math.round(1.5 * pxPerMm), naY - naH - Math.round(2 * pxPerMm));

        // 7. Vẽ các thửa đất (Parcel)
        selectedShapes.forEach((shape, shapeIdx) => {
            const rawPts = shape.vertices || [];
            const pts = rawPts.map((p, i) => this._normalizeVertex(p, i)).filter(p => isFinite(p.x) && isFinite(p.y) && p.x > 1000);
            const n = pts.length;
            if (n < 2) return;
            const isClosed = (shape.mode === 'polygon' && n >= 3);
            const stats = shape.stats || this.calculateAreaAndPerimeter(pts, shape.mode);

            // Nền đa giác mờ trang nhã
            if (isClosed) {
                ctx.fillStyle = 'rgba(14, 165, 233, 0.12)';
                ctx.beginPath();
                ctx.moveTo(toCvX(pts[0].y), toCvY(pts[0].x));
                for (let i = 1; i < n; i++) ctx.lineTo(toCvX(pts[i].y), toCvY(pts[i].x));
                ctx.closePath();
                ctx.fill();
            }

            // Đường viền ranh thửa đất
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = Math.round(0.5 * pxPerMm);
            ctx.beginPath();
            ctx.moveTo(toCvX(pts[0].y), toCvY(pts[0].x));
            for (let i = 1; i < n; i++) ctx.lineTo(toCvX(pts[i].y), toCvY(pts[i].x));
            if (isClosed) ctx.closePath();
            ctx.stroke();

            // Điểm đỉnh mốc ranh & Tên đỉnh
            if (meta.showVertices !== false) {
                pts.forEach((p, idx) => {
                    const px = toCvX(p.y);
                    const py = toCvY(p.x);
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(px, py, Math.round(1.2 * pxPerMm), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = Math.round(0.4 * pxPerMm);
                    ctx.stroke();

                    ctx.font = `bold ${Math.round(2.2 * pxPerMm)}px Arial`;
                    ctx.fillStyle = '#0f172a';
                    ctx.fillText(p.name || `Đ${idx+1}`, px + Math.round(2 * pxPerMm), py - Math.round(2 * pxPerMm));
                });
            }

            // Chiều dài cạnh / khoảng cách đỉnh
            const showBlockInfo = meta.showBlockInfo === true;
            if (meta.showDistances && stats.edges) {
                ctx.font = `${Math.round(2.0 * pxPerMm)}px Arial`;
                ctx.fillStyle = '#b45309';
                stats.edges.forEach((edge, idx) => {
                    const p1 = pts[idx];
                    const p2 = pts[(idx + 1) % n];
                    const midX = (toCvX(p1.y) + toCvX(p2.y)) / 2;
                    const midY = (toCvY(p1.x) + toCvY(p2.x)) / 2;
                    ctx.fillText(`${edge.lengthFormatted}m`, midX + Math.round(2 * pxPerMm), midY - Math.round(2 * pxPerMm));
                });
            }

            // Tâm thửa đất (Visual Interior Center - chuẩn trong lòng khối chữ L)
            if (meta.showCenterLabels !== false && isClosed && stats.area > 0) {
                const cvCenter = this.calculatePolygonVisualCenter(pts.map(p => ({ x: toCvX(p.y), y: toCvY(p.x) })));
                const cX = cvCenter.x;
                const cY = cvCenter.y;

                const blockSymbol = shape.symbol ? shape.symbol : String(shapeIdx + 1);
                if (showBlockInfo) {
                    ctx.font = `bold ${Math.round(3.2 * pxPerMm)}px Arial`;
                    ctx.fillStyle = '#0369a1';
                    ctx.textAlign = 'center';
                    ctx.fillText(`[${blockSymbol}] ${shape.name}`, cX, cY - Math.round(3 * pxPerMm));
                    ctx.font = `bold ${Math.round(2.6 * pxPerMm)}px Arial`;
                    ctx.fillStyle = '#047857';
                    ctx.fillText(`S = ${stats.areaFormatted} m² (${stats.haFormatted} ha)`, cX, cY + Math.round(1.5 * pxPerMm));
                    ctx.font = `${Math.round(2.0 * pxPerMm)}px Arial`;
                    ctx.fillStyle = '#475569';
                    ctx.fillText(`Chu vi P = ${stats.perimeterFormatted} m`, cX, cY + Math.round(5.5 * pxPerMm));
                    ctx.textAlign = 'left';
                } else {
                    // Chế độ mặc định (Bắt buộc theo yêu cầu): CHỈ HIỂN THỊ SỐ THỨ TỰ HOẶC KÝ HIỆU KHỐI
                    ctx.font = `bold ${Math.round(4.2 * pxPerMm)}px Arial`;
                    ctx.fillStyle = '#0369a1';
                    ctx.textAlign = 'center';
                    ctx.fillText(blockSymbol, cX, cY + Math.round(1.5 * pxPerMm));
                    ctx.textAlign = 'left';
                }
            } else if (!isClosed && shape.mode !== 'polygon') {
                if (!showBlockInfo) {
                    const midIdx = Math.floor(pts.length / 2);
                    const mp = pts[midIdx] || pts[0];
                    ctx.font = `bold ${Math.round(3.2 * pxPerMm)}px Arial`;
                    ctx.fillStyle = '#0369a1';
                    ctx.fillText(shape.name, toCvX(mp.y) + Math.round(2 * pxPerMm), toCvY(mp.x) - Math.round(2 * pxPerMm));
                }
            }
        });

        // 7.5. Vẽ các Chú Thích & Hình Khối Kỹ Thuật (MiniCAD Annotations)
        if (meta.showAnnotations !== false && this.annotations && this.annotations.length > 0) {
            this.annotations.forEach(ann => {
                switch (ann.type) {
                    case 'arrow': {
                        const vnStart = convertWgsToVn2k(ann.startLat, ann.startLng, AppState.kttVal, AppState.scaleFactor);
                        const vnEnd = convertWgsToVn2k(ann.endLat, ann.endLng, AppState.kttVal, AppState.scaleFactor);
                        const x1 = toCvX(vnStart.Y), y1 = toCvY(vnStart.X);
                        const x2 = toCvX(vnEnd.Y), y2 = toCvY(vnEnd.X);

                        ctx.strokeStyle = ann.color || '#f59e0b';
                        ctx.lineWidth = Math.round(0.35 * pxPerMm);
                        ctx.beginPath();
                        ctx.moveTo(x2, y2);
                        ctx.lineTo(x1, y1);
                        ctx.stroke();

                        const dx = x1 - x2, dy = y1 - y2;
                        const len = Math.hypot(dx, dy) || 1;
                        const ux = dx / len, uy = dy / len;
                        const aLen = Math.round(2.8 * pxPerMm);
                        const aWid = Math.round(1.2 * pxPerMm);
                        const ax = x1 - ux * aLen, ay = y1 - uy * aLen;

                        ctx.fillStyle = ann.color || '#f59e0b';
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(ax - uy * aWid, ay + ux * aWid);
                        ctx.lineTo(ax + uy * aWid, ay - ux * aWid);
                        ctx.closePath();
                        ctx.fill();

                        ctx.font = 'bold ' + Math.round(2.2 * pxPerMm) + 'px Arial';
                        ctx.fillStyle = '#0f172a';
                        ctx.fillText(ann.arrowText || 'Ghi chú', x2 + Math.round(1.5 * pxPerMm), y2 - Math.round(1.0 * pxPerMm));
                        break;
                    }

                    case 'north_arrow': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toCvX(vn.Y), cy = toCvY(vn.X);
                        const r = Math.round(4.0 * pxPerMm);
                        ctx.strokeStyle = ann.color || '#38bdf8';
                        ctx.lineWidth = Math.round(0.35 * pxPerMm);
                        ctx.beginPath();
                        ctx.arc(cx, cy, r, 0, Math.PI * 2);
                        ctx.stroke();

                        ctx.fillStyle = '#e11d48';
                        ctx.beginPath();
                        ctx.moveTo(cx, cy - Math.round(7 * pxPerMm));
                        ctx.lineTo(cx - Math.round(2 * pxPerMm), cy);
                        ctx.lineTo(cx + Math.round(2 * pxPerMm), cy);
                        ctx.closePath();
                        ctx.fill();

                        ctx.font = 'bold ' + Math.round(2.6 * pxPerMm) + 'px Arial';
                        ctx.fillStyle = '#0284c7';
                        ctx.textAlign = 'center';
                        ctx.fillText('N', cx, cy - Math.round(8 * pxPerMm));
                        ctx.textAlign = 'left';
                        break;
                    }

                    case 'rect': {
                        if (ann.corners && ann.corners.length >= 4) {
                            const cvPts = ann.corners.map(c => {
                                const vn = convertWgsToVn2k(c[0], c[1], AppState.kttVal, AppState.scaleFactor);
                                return { x: toCvX(vn.Y), y: toCvY(vn.X) };
                            });
                            ctx.beginPath();
                            ctx.moveTo(cvPts[0].x, cvPts[0].y);
                            for (let i = 1; i < cvPts.length; i++) ctx.lineTo(cvPts[i].x, cvPts[i].y);
                            ctx.closePath();
                            ctx.fillStyle = 'rgba(236, 72, 153, 0.15)';
                            ctx.fill();
                            ctx.strokeStyle = ann.color || '#ec4899';
                            ctx.lineWidth = Math.round(0.4 * pxPerMm);
                            ctx.stroke();

                            const vnC = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                            const cx = toCvX(vnC.Y), cy = toCvY(vnC.X);
                            ctx.font = 'bold ' + Math.round(2.0 * pxPerMm) + 'px Arial';
                            ctx.fillStyle = '#831843';
                            ctx.textAlign = 'center';
                            ctx.fillText(ann.rectName || 'Khối nhà', cx, cy - Math.round(1 * pxPerMm));
                            ctx.font = Math.round(1.6 * pxPerMm) + 'px Arial';
                            ctx.fillText(ann.widthM + 'x' + ann.lengthM + 'm (' + ann.rectArea + 'm²)', cx, cy + Math.round(2 * pxPerMm));
                            ctx.textAlign = 'left';
                        }
                        break;
                    }

                    case 'circle': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toCvX(vn.Y), cy = toCvY(vn.X);
                        const r_px = toCvDist(ann.radiusM || 10);
                        ctx.beginPath();
                        ctx.arc(cx, cy, r_px, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
                        ctx.fill();
                        ctx.strokeStyle = ann.color || '#10b981';
                        ctx.lineWidth = Math.round(0.35 * pxPerMm);
                        ctx.stroke();

                        ctx.font = 'bold ' + Math.round(1.8 * pxPerMm) + 'px Arial';
                        ctx.fillStyle = '#065f46';
                        ctx.textAlign = 'center';
                        ctx.fillText((ann.circleName || 'Vùng bảo vệ') + ' (R=' + ann.radiusM + 'm)', cx, cy);
                        ctx.textAlign = 'left';
                        break;
                    }

                    case 'stamp': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toCvX(vn.Y), cy = toCvY(vn.X);
                        const stW = Math.round(28 * pxPerMm);
                        const stH = Math.round(18 * pxPerMm);
                        const left = cx - stW / 2;
                        const top = cy - stH / 2;

                        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                        ctx.fillRect(left, top, stW, stH);
                        ctx.strokeStyle = ann.color || '#0284c7';
                        ctx.lineWidth = Math.round(0.4 * pxPerMm);
                        ctx.strokeRect(left, top, stW, stH);

                        ctx.font = 'bold ' + Math.round(2.0 * pxPerMm) + 'px Arial';
                        ctx.fillStyle = '#0369a1';
                        ctx.fillText('TỜ: ' + (ann.sheetNo || '01') + '  -  THỬA: ' + (ann.parcelNo || '01'), left + Math.round(1.5 * pxPerMm), top + Math.round(3.5 * pxPerMm));
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.beginPath();
                        ctx.moveTo(left, top + Math.round(5 * pxPerMm));
                        ctx.lineTo(left + stW, top + Math.round(5 * pxPerMm));
                        ctx.stroke();

                        ctx.font = Math.round(1.7 * pxPerMm) + 'px Arial';
                        ctx.fillStyle = '#0f172a';
                        ctx.fillText('DT: ' + (ann.area || '--'), left + Math.round(1.5 * pxPerMm), top + Math.round(8.5 * pxPerMm));
                        ctx.fillText('Chủ: ' + (ann.owner || '--'), left + Math.round(1.5 * pxPerMm), top + Math.round(12.0 * pxPerMm));
                        ctx.fillText('Loại: ' + (ann.landType || '--'), left + Math.round(1.5 * pxPerMm), top + Math.round(15.5 * pxPerMm));
                        break;
                    }

                    case 'text': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toCvX(vn.Y), cy = toCvY(vn.X);
                        ctx.font = 'bold ' + Math.round(((ann.fontSize || 12) / 4.5) * pxPerMm) + 'px Arial';
                        ctx.fillStyle = ann.color || '#0f172a';
                        ctx.fillText(ann.text || 'Ghi chú', cx, cy);
                        break;
                    }
                }
            });
        }

        // 8. Bảng Kê Bên Phải & Khung Tên TCVN
        const pX = toCvX(L.Xpanel0);
        const pW = toCvDist(L.W_panel);

        // --- Bảng tổng hợp diện tích (ĐÃ BỎ CỘT LOẠI & CHU VI) ---
        let curY = toCvY(L.Yin1);
        const sumRowH_px = Math.round(5.2 * pxPerMm);

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(pX, curY, pW, Math.round(6.5 * pxPerMm));
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(2.5 * pxPerMm)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText("BẢNG TỔNG HỢP DIỆN TÍCH", pX + pW / 2, curY + Math.round(4.4 * pxPerMm));
        ctx.textAlign = 'left';
        curY += Math.round(6.5 * pxPerMm);

        // Tiêu đề 4 cột (Căn chỉnh rộng rãi cho tên khối, tự động xuống dòng không cắt ngắn)
        const colW_px = [
            Math.round(0.10 * pW), // STT
            Math.round(0.44 * pW), // Ký hiệu & Tên thửa
            Math.round(0.28 * pW), // Diện tích (m²)
            pW - Math.round(0.10 * pW) - Math.round(0.44 * pW) - Math.round(0.28 * pW) // Tỉ lệ %
        ];

        function wrapPdfTextLines(txt, maxW) {
            if (!txt) return [''];
            const str = String(txt).trim();
            if (ctx.measureText(str).width <= maxW) return [str];
            const words = str.split(/\s+/);
            const lines = [];
            let cur = '';
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                const test = cur ? (cur + ' ' + w) : w;
                if (ctx.measureText(test).width <= maxW) {
                    cur = test;
                } else {
                    if (cur) lines.push(cur);
                    if (ctx.measureText(w).width > maxW) {
                        let sub = '';
                        for (let c of w) {
                            if (ctx.measureText(sub + c).width <= maxW) {
                                sub += c;
                            } else {
                                if (sub) lines.push(sub);
                                sub = c;
                            }
                        }
                        cur = sub;
                    } else {
                        cur = w;
                    }
                }
            }
            if (cur) lines.push(cur);
            return lines.length > 0 ? lines : [''];
        }

        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(pX, curY, pW, sumRowH_px);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = Math.round(0.2 * pxPerMm);
        ctx.strokeRect(pX, curY, pW, sumRowH_px);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(1.9 * pxPerMm)}px Arial`;

        const sHeaders = ["STT", "Tên thửa", "Diện tích (m²)", "Tỉ lệ %"];
        let cX = pX;
        sHeaders.forEach((h, idx) => {
            ctx.fillText(h, cX + Math.round(1.5 * pxPerMm), curY + Math.round(3.6 * pxPerMm));
            cX += colW_px[idx];
        });
        curY += sumRowH_px;

        // Dòng số liệu các khối
        let measuredTotalArea = 0;
        selectedShapes.forEach(s => { if (s.mode === 'polygon') measuredTotalArea += (s.stats?.area || 0); });
        const baseProjectArea = (meta.customTotalArea && meta.customTotalArea > 0) ? meta.customTotalArea : measuredTotalArea;

        const lineH_px = Math.round(2.6 * pxPerMm);
        selectedShapes.forEach((s, idx) => {
            const isPoly = s.mode === 'polygon';
            const area = s.stats?.area || 0;
            const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';

            ctx.font = `${Math.round(1.9 * pxPerMm)}px Arial`;
            const displayName = s.symbol ? `[${s.symbol}] ${s.name}` : (s.name || `Thửa ${idx + 1}`);
            const nameLines = wrapPdfTextLines(displayName, colW_px[1] - Math.round(3 * pxPerMm));
            const dynamicRowH = Math.max(sumRowH_px, Math.round(1.4 * pxPerMm) + nameLines.length * lineH_px + Math.round(1.4 * pxPerMm));

            ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(pX, curY, pW, dynamicRowH);
            ctx.strokeStyle = '#e2e8f0';
            ctx.strokeRect(pX, curY, pW, dynamicRowH);

            const baselineY = curY + Math.round(3.4 * pxPerMm);
            ctx.fillStyle = '#1e293b';
            ctx.fillText(String(idx + 1), pX + Math.round(1.5 * pxPerMm), baselineY);

            // Xuống dòng từng dòng tên khối, bảo toàn trọn vẹn ký tự không bị cắt ngắn thành "..."
            nameLines.forEach((l, lIdx) => {
                ctx.fillText(l, pX + colW_px[0] + Math.round(1.5 * pxPerMm), baselineY + lIdx * lineH_px);
            });

            ctx.fillText(isPoly ? area.toFixed(2) : '--', pX + colW_px[0] + colW_px[1] + Math.round(1.5 * pxPerMm), baselineY);
            ctx.fillText(pctStr, pX + colW_px[0] + colW_px[1] + colW_px[2] + Math.round(1.5 * pxPerMm), baselineY);

            // Vẽ vạch kẻ dọc phân chia các cột theo chiều cao thực tế của hàng
            let divX = pX;
            colW_px.forEach(w => {
                divX += w;
                ctx.strokeStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(divX, curY);
                ctx.lineTo(divX, curY + dynamicRowH);
                ctx.stroke();
            });
            curY += dynamicRowH;
        });

        // Dòng tổng cộng
        const totalPctVal = (baseProjectArea > 0) ? ((measuredTotalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(pX, curY, pW, sumRowH_px);
        ctx.strokeStyle = '#cbd5e1';
        ctx.strokeRect(pX, curY, pW, sumRowH_px);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(1.9 * pxPerMm)}px Arial`;
        const totRow = ['--', 'TỔNG CỘNG', measuredTotalArea.toFixed(2), totalPctVal];
        let tx = pX;
        totRow.forEach((v, cIdx) => {
            ctx.fillText(v, tx + Math.round(1.5 * pxPerMm), curY + Math.round(3.6 * pxPerMm));
            tx += colW_px[cIdx];
        });
        curY += sumRowH_px + Math.round(5.0 * pxPerMm);

        // --- KHUNG TÊN BẢN VẼ TCVN Ở GÓC DƯỚI BÊN PHẢI ---
        const tBoxH_px = Math.round(38.0 * pxPerMm);
        const tBoxY_px = toCvY(L.Yin0) - tBoxH_px;

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(pX, tBoxY_px, pW, tBoxH_px);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.round(0.35 * pxPerMm);
        ctx.strokeRect(pX, tBoxY_px, pW, tBoxH_px);

        // Hàng 1: Đơn vị đo vẽ
        const h1 = Math.round(9.5 * pxPerMm);
        ctx.strokeRect(pX, tBoxY_px, pW, h1);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${Math.round(2.8 * pxPerMm)}px Arial`;
        ctx.fillText((meta.organization || 'TRUNG TÂM KHẢO SÁT & ĐO ĐẠC ĐỊA CHÍNH').toUpperCase(), pX + Math.round(3 * pxPerMm), tBoxY_px + Math.round(6 * pxPerMm));

        // Hàng 2: Tên bản vẽ
        const h2 = Math.round(10.5 * pxPerMm);
        ctx.strokeRect(pX, tBoxY_px + h1, pW, h2);
        ctx.fillStyle = '#0369a1';
        ctx.font = `bold ${Math.round(3.4 * pxPerMm)}px Arial`;
        ctx.fillText((meta.drawingName || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT').toUpperCase(), pX + Math.round(3 * pxPerMm), tBoxY_px + h1 + Math.round(7 * pxPerMm));

        // Hàng 3: Dự án
        const h3 = Math.round(7.0 * pxPerMm);
        ctx.strokeRect(pX, tBoxY_px + h1 + h2, pW, h3);
        ctx.fillStyle = '#1e293b';
        ctx.font = `${Math.round(2.3 * pxPerMm)}px Arial`;
        ctx.fillText(`DỰ ÁN: ${(meta.projectName || '').toUpperCase()}`, pX + Math.round(3 * pxPerMm), tBoxY_px + h1 + h2 + Math.round(5 * pxPerMm));

        // Hàng 4: 2 Cột chi tiết
        const h4 = tBoxH_px - h1 - h2 - h3;
        const midW = Math.round(pW * 0.55);
        ctx.strokeRect(pX, tBoxY_px + h1 + h2 + h3, midW, h4);
        ctx.strokeRect(pX + midW, tBoxY_px + h1 + h2 + h3, pW - midW, h4);

        ctx.font = `${Math.round(1.9 * pxPerMm)}px Arial`;
        ctx.fillStyle = '#334155';
        const startY4 = tBoxY_px + h1 + h2 + h3;
        ctx.fillText(`Hệ VN-2000 (${AppState.provinceName || 'Tỉnh'}) - KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`, pX + Math.round(2.5 * pxPerMm), startY4 + Math.round(3.0 * pxPerMm));
        ctx.fillText(`Người đo: ${(meta.surveyor || '').toUpperCase()}`, pX + Math.round(2.5 * pxPerMm), startY4 + Math.round(6.2 * pxPerMm));
        ctx.fillText(`Kiểm tra: ${(meta.checker || '').toUpperCase()}`, pX + Math.round(2.5 * pxPerMm), startY4 + Math.round(9.4 * pxPerMm));

        ctx.fillText(`Tỷ lệ: 1:${L.scaleVal}`, pX + midW + Math.round(2.5 * pxPerMm), startY4 + Math.round(3.0 * pxPerMm));
        ctx.fillText(`Số tờ/thửa: ${meta.parcelNo || '01'}`, pX + midW + Math.round(2.5 * pxPerMm), startY4 + Math.round(6.2 * pxPerMm));
        ctx.fillText(`Ngày lập: ${meta.drawingDate}`, pX + midW + Math.round(2.5 * pxPerMm), startY4 + Math.round(9.4 * pxPerMm));

        // 9. Tạo tệp PDF bằng jsPDF
        try {
            const jspdfObj = (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
            if (!jspdfObj) {
                // Fallback: Tải ảnh PNG chất lượng cao khổ giấy
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${projName}_BanDo_${meta.paper}_1-${L.scaleVal}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast(`✓ Đã xuất ảnh bản vẽ chuẩn khổ ${meta.paper} tỷ lệ 1:${L.scaleVal}`);
                }, 'image/png');
                return;
            }

            const doc = new jspdfObj({
                orientation: 'landscape',
                unit: 'mm',
                format: meta.paper.toLowerCase() === 'a4' ? 'a4' : 'a3',
                compress: true
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            doc.addImage(imgData, 'JPEG', 0, 0, meta.paperW, meta.paperH);
            const pdfFilename = `${projName}_BanDo_${meta.paper}_1-${L.scaleVal}.pdf`;
            doc.save(pdfFilename);
            showToast(`✓ Đã xuất bản vẽ PDF kỹ thuật khổ ${meta.paper} tỷ lệ 1:${L.scaleVal}: ${pdfFilename}`);
        } catch (err) {
            console.error("Lỗi xuất PDF:", err);
            showToast("⚠️ Lỗi tạo PDF: " + err.message, true);
        }
    },

    exportSvg() {
        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để xuất SVG!", true);
            return;
        }

        const meta = this._getExportMeta();
        const showBlockInfo = meta.showBlockInfo === true;
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project";

        // Bounding box (chuẩn hóa tọa độ VN2000 tránh lỗi tọa độ 0 hoặc rác)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        selectedShapes.forEach(s => {
            (s.vertices || []).forEach((p, idx) => {
                const norm = this._normalizeVertex(p, idx);
                p.x = norm.x; p.y = norm.y;
                if (norm.y > 1000) { if (norm.y < minX) minX = norm.y; if (norm.y > maxX) maxX = norm.y; }
                if (norm.x > 1000) { if (norm.x < minY) minY = norm.x; if (norm.x > maxY) maxY = norm.x; }
            });
        });
        if (!isFinite(minX) || minX === maxX) { minX -= 25; maxX += 25; }
        if (!isFinite(minY) || minY === maxY) { minY -= 25; maxY += 25; }
        const spanX = Math.max(maxX - minX, 10);
        const spanY = Math.max(maxY - minY, 10);

        // Tính tổng diện tích & tỉ lệ %
        let measuredTotalArea = 0;
        selectedShapes.forEach(s => {
            if (s.mode === 'polygon') measuredTotalArea += (s.stats?.area || 0);
        });
        const baseProjectArea = (meta.customTotalArea && meta.customTotalArea > 0) ? meta.customTotalArea : measuredTotalArea;
        const showPercent = meta.showPercent !== false;

        // Hàm ngắt dòng thông minh không cắt ngắn chữ thành "..."
        function wrapSvgLines(txt, maxChars = 34) {
            if (!txt) return [''];
            const words = String(txt).trim().split(/\s+/);
            const lines = [];
            let cur = '';
            for (const w of words) {
                if (!cur) {
                    cur = w;
                } else if ((cur + ' ' + w).length <= maxChars) {
                    cur += ' ' + w;
                } else {
                    lines.push(cur);
                    cur = w;
                }
            }
            if (cur) lines.push(cur);
            return lines.length > 0 ? lines : [''];
        }

        // Tính chiều cao động của từng hàng và toàn bộ bảng tổng hợp
        const svgRowInfos = selectedShapes.map((s, idx) => {
            const displayName = s.symbol ? `[${s.symbol}] ${s.name}` : (s.name || `Thửa ${idx + 1}`);
            const lines = wrapSvgLines(displayName, 34);
            const rowH = Math.max(26, 8 + lines.length * 14);
            return { shape: s, displayName, lines, rowH };
        });
        const summaryTableH = 26 + svgRowInfos.reduce((sum, r) => sum + r.rowH, 0) + 26;

        // Kích thước SVG khổ lớn độ nét cao 1200px đồng bộ chất lượng với PNG
        const svgW = 1200;
        const mapH = Math.max(550, Math.min(1300, Math.round(1000 * spanY / spanX)));
        const svgH = mapH + 260 + summaryTableH;
        const pad = 80;
        const sc = Math.min((svgW - pad*2) / spanX, (mapH - pad*2) / spanY);

        const toSvgX = cx => pad + (cx - minX) * sc;
        const toSvgY = cy => (mapH - pad) - (cy - minY) * sc;

        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <defs>
    <style>
      text { font-family: Arial, sans-serif; }
      .layer-ranh { fill: none; stroke: #1565C0; stroke-width: 2.5; }
      .layer-ky-hieu { fill: #ef4444; stroke: #ffffff; stroke-width: 1.2; }
      .layer-ky-hieu-text { font-size: 11px; fill: #0f172a; font-weight: bold; }
      .layer-kich-thuoc { font-size: 10px; fill: #b45309; font-weight: bold; }
      .layer-dien-tich { font-size: 13px; fill: #0369a1; font-weight: bold; }
      .layer-bang-ke { fill: none; stroke: #cbd5e1; stroke-width: 1; }
      .layer-bang-ke-text { font-size: 11px; fill: #1e293b; }
      .layer-khung-ten { fill: none; stroke: #0f172a; stroke-width: 1.5; }
      .layer-khung-ten-text { font-size: 11px; fill: #0f172a; }
      .bg { fill: #ffffff; }
      .grid { stroke: #B0BEC580; stroke-width: 0.5; stroke-dasharray: 4,4; }
    </style>
  </defs>
  <!-- Nền trắng chuẩn bản vẽ kỹ thuật -->
  <rect class="bg" x="0" y="0" width="${svgW}" height="${svgH}"/>

  <!-- Lưới tọa độ thực địa -->
`;
        const gridInt = meta.scaleVal >= 2000 ? 100 : meta.scaleVal >= 1000 ? 50 : 20;
        for (let gx = Math.floor(minX / gridInt) * gridInt; gx <= maxX + gridInt; gx += gridInt) {
            svgContent += `  <line class="grid" x1="${toSvgX(gx).toFixed(1)}" y1="${pad}" x2="${toSvgX(gx).toFixed(1)}" y2="${mapH - pad}"/>\n`;
        }
        for (let gy = Math.floor(minY / gridInt) * gridInt; gy <= maxY + gridInt; gy += gridInt) {
            svgContent += `  <line class="grid" x1="${pad}" y1="${toSvgY(gy).toFixed(1)}" x2="${svgW - pad}" y2="${toSvgY(gy).toFixed(1)}"/>\n`;
        }

        svgContent += `
  <!-- Khung ngoài bản vẽ TCVN -->
  <rect x="20" y="20" width="${svgW-40}" height="${svgH-40}" fill="none" stroke="#000" stroke-width="2.5"/>
  <rect x="26" y="26" width="${svgW-52}" height="${svgH-52}" fill="none" stroke="#000" stroke-width="0.8"/>

`;

        // Vẽ các đối tượng được chọn
        selectedShapes.forEach((shape, shapeIdx) => {
            const pts = shape.vertices;
            if (pts.length < 2) return;
            const isClosed = shape.mode === 'polygon' && pts.length >= 3;
            const svgPts = pts.map(p => `${toSvgX(p.y).toFixed(1)},${toSvgY(p.x).toFixed(1)}`).join(' ');

            if (meta.showBoundaries !== false) {
                if (isClosed) {
                    svgContent += `  <polygon class="layer-ranh" points="${svgPts}" fill="${shape.color || '#38bdf8'}30"/>\n`;
                } else {
                    svgContent += `  <polyline class="layer-ranh" points="${svgPts}"/>\n`;
                }
            }

            // Điểm mốc & ký hiệu đỉnh
            if (meta.showVertices !== false) {
                pts.forEach((p, idx) => {
                    const sx2 = toSvgX(p.y);
                    const sy2 = toSvgY(p.x);
                    svgContent += `  <circle class="layer-ky-hieu" cx="${sx2.toFixed(1)}" cy="${sy2.toFixed(1)}" r="4"/>\n`;
                    svgContent += `  <text class="layer-ky-hieu-text" x="${(sx2 + 6).toFixed(1)}" y="${(sy2 - 5).toFixed(1)}">${p.name || ('Đ' + (idx+1))}</text>\n`;
                });
            }

            // Kích thước cạnh giữa đỉnh
            const stats = shape.stats;
            if (meta.showDistances && stats && stats.edges) {
                stats.edges.forEach((edge, idx) => {
                    const p1 = pts[idx];
                    const p2 = pts[(idx + 1) % pts.length];
                    const mx = toSvgX((p1.y + p2.y) / 2);
                    const my = toSvgY((p1.x + p2.x) / 2);
                    svgContent += `  <text class="layer-kich-thuoc" x="${mx.toFixed(1)}" y="${(my-4).toFixed(1)}" text-anchor="middle">${edge.lengthFormatted}m</text>\n`;
                });
            }

            // Nhãn tâm khối (Visual Interior Center - chuẩn trong lòng khối chữ L)
            if (meta.showCenterLabels !== false && isClosed && stats) {
                const center = this.calculatePolygonVisualCenter(pts.map(p => ({ x: p.y, y: p.x })));
                const cx = center.x;
                const cy = center.y;
                const blockSymbol = shape.symbol ? shape.symbol : String(shapeIdx + 1);
                if (showBlockInfo) {
                    let pctStr = '';
                    if (showPercent && baseProjectArea > 0) {
                        pctStr = ` (${((stats.area / baseProjectArea) * 100).toFixed(2)}%)`;
                    }
                    svgContent += `  <text class="layer-dien-tich" x="${toSvgX(cx).toFixed(1)}" y="${(toSvgY(cy) - 8).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="bold" fill="#0D47A1">[${blockSymbol}] ${shape.name}</text>\n`;
                    svgContent += `  <text class="layer-dien-tich" x="${toSvgX(cx).toFixed(1)}" y="${(toSvgY(cy) + 8).toFixed(1)}" text-anchor="middle" font-size="11" fill="#6A1B9A">S=${stats.areaFormatted}m²${pctStr}</text>\n`;
                } else {
                    svgContent += `  <text class="layer-dien-tich" x="${toSvgX(cx).toFixed(1)}" y="${(toSvgY(cy) + 5).toFixed(1)}" text-anchor="middle" font-size="15" font-weight="bold" fill="#0D47A1">${blockSymbol}</text>\n`;
                }
            } else if (!isClosed && shape.mode !== 'polygon') {
                const midIdx = Math.floor(pts.length / 2);
                const mp = pts[midIdx] || pts[0];
                svgContent += `  <text class="layer-dien-tich" x="${toSvgX(mp.y).toFixed(1)}" y="${toSvgY(mp.x).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="bold" fill="#0D47A1">${shape.name}</text>\n`;
            }
        });

        // Vẽ các Chú Thích & Hình Khối Kỹ Thuật (MiniCAD Annotations) trong SVG
        if (meta.showAnnotations !== false && this.annotations && this.annotations.length > 0) {
            this.annotations.forEach(ann => {
                switch (ann.type) {
                    case 'arrow': {
                        const vnStart = convertWgsToVn2k(ann.startLat, ann.startLng, AppState.kttVal, AppState.scaleFactor);
                        const vnEnd = convertWgsToVn2k(ann.endLat, ann.endLng, AppState.kttVal, AppState.scaleFactor);
                        const x1 = toSvgX(vnStart.Y), y1 = toSvgY(vnStart.X);
                        const x2 = toSvgX(vnEnd.Y), y2 = toSvgY(vnEnd.X);
                        svgContent += '  <line x1="' + x2.toFixed(1) + '" y1="' + y2.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y1.toFixed(1) + '" stroke="' + (ann.color || '#f59e0b') + '" stroke-width="2" stroke-dasharray="4,4"/>\n';
                        svgContent += '  <circle cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="4" fill="' + (ann.color || '#f59e0b') + '"/>\n';
                        svgContent += '  <text x="' + (x2 + 6).toFixed(1) + '" y="' + (y2 - 4).toFixed(1) + '" font-size="' + (ann.fontSize || 12) + '" font-weight="bold" fill="#0f172a">' + (ann.arrowText || 'Ghi chú') + '</text>\n';
                        break;
                    }
                    case 'north_arrow': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toSvgX(vn.Y), cy = toSvgY(vn.X);
                        svgContent += '  <circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="18" fill="#fff" stroke="' + (ann.color || '#38bdf8') + '" stroke-width="2"/>\n';
                        svgContent += '  <polygon points="' + cx.toFixed(1) + ',' + (cy-15).toFixed(1) + ' ' + (cx-6).toFixed(1) + ',' + cy.toFixed(1) + ' ' + (cx+6).toFixed(1) + ',' + cy.toFixed(1) + '" fill="#e11d48"/>\n';
                        svgContent += '  <text x="' + cx.toFixed(1) + '" y="' + (cy+13).toFixed(1) + '" font-size="11" font-weight="bold" text-anchor="middle" fill="#0284c7">N</text>\n';
                        break;
                    }
                    case 'rect': {
                        if (ann.corners && ann.corners.length >= 4) {
                            const pts = ann.corners.map(c => {
                                const vn = convertWgsToVn2k(c[0], c[1], AppState.kttVal, AppState.scaleFactor);
                                return toSvgX(vn.Y).toFixed(1) + ',' + toSvgY(vn.X).toFixed(1);
                            }).join(' ');
                            svgContent += '  <polygon points="' + pts + '" fill="' + (ann.color || '#ec4899') + '33" stroke="' + (ann.color || '#ec4899') + '" stroke-width="2"/>\n';
                            const vnC = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                            const cx = toSvgX(vnC.Y), cy = toSvgY(vnC.X);
                            svgContent += '  <text x="' + cx.toFixed(1) + '" y="' + (cy-4).toFixed(1) + '" font-size="11" font-weight="bold" text-anchor="middle" fill="#831843">' + (ann.rectName || 'Khối nhà') + '</text>\n';
                            svgContent += '  <text x="' + cx.toFixed(1) + '" y="' + (cy+10).toFixed(1) + '" font-size="9" text-anchor="middle" fill="#9d174d">' + ann.widthM + 'x' + ann.lengthM + 'm (' + ann.rectArea + 'm²)</text>\n';
                        }
                        break;
                    }
                    case 'circle': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toSvgX(vn.Y), cy = toSvgY(vn.X);
                        const r_px = (ann.radiusM || 10) * sc;
                        svgContent += '  <circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r_px.toFixed(1) + '" fill="' + (ann.color || '#10b981') + '22" stroke="' + (ann.color || '#10b981') + '" stroke-width="1.8" stroke-dasharray="4,4"/>\n';
                        svgContent += '  <text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" font-size="10" font-weight="bold" text-anchor="middle" fill="#065f46">' + (ann.circleName || 'Vùng bảo vệ') + ' (R=' + ann.radiusM + 'm)</text>\n';
                        break;
                    }
                    case 'stamp': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toSvgX(vn.Y), cy = toSvgY(vn.X);
                        const stW = 120, stH = 70;
                        const left = cx - stW / 2, top = cy - stH / 2;
                        svgContent += '  <rect x="' + left.toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + stW + '" height="' + stH + '" rx="5" fill="#ffffff" stroke="' + (ann.color || '#0284c7') + '" stroke-width="2"/>\n';
                        svgContent += '  <text x="' + (left+8).toFixed(1) + '" y="' + (top+16).toFixed(1) + '" font-size="10.5" font-weight="bold" fill="#0369a1">TỜ: ' + (ann.sheetNo || '01') + ' - THỬA: ' + (ann.parcelNo || '01') + '</text>\n';
                        svgContent += '  <line x1="' + left.toFixed(1) + '" y1="' + (top+22).toFixed(1) + '" x2="' + (left+stW).toFixed(1) + '" y2="' + (top+22).toFixed(1) + '" stroke="#cbd5e1" stroke-width="1"/>\n';
                        svgContent += '  <text x="' + (left+8).toFixed(1) + '" y="' + (top+36).toFixed(1) + '" font-size="9.5" fill="#0f172a">DT: ' + (ann.area || '--') + '</text>\n';
                        svgContent += '  <text x="' + (left+8).toFixed(1) + '" y="' + (top+50).toFixed(1) + '" font-size="9.5" fill="#0f172a">Chủ: ' + (ann.owner || '--') + '</text>\n';
                        svgContent += '  <text x="' + (left+8).toFixed(1) + '" y="' + (top+64).toFixed(1) + '" font-size="9.5" fill="#0f172a">Loại: ' + (ann.landType || '--') + '</text>\n';
                        break;
                    }
                    case 'text': {
                        const vn = convertWgsToVn2k(ann.lat, ann.lng, AppState.kttVal, AppState.scaleFactor);
                        const cx = toSvgX(vn.Y), cy = toSvgY(vn.X);
                        svgContent += '  <text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" font-size="' + (ann.fontSize || 13) + '" font-weight="bold" fill="' + (ann.color || '#0f172a') + '">' + (ann.text || 'Ghi chú') + '</text>\n';
                        break;
                    }
                }
            });
        }

        // Kim chỉ hướng Bắc
        const naXs = svgW - 80, naYs = 90;
        svgContent += `  <circle cx="${naXs}" cy="${naYs+20}" r="22" fill="#ffffff" stroke="#1565C0" stroke-width="2"/>
  <polygon points="${naXs},${naYs-5} ${naXs-7},${naYs+18} ${naXs+7},${naYs+18}" fill="#e11d48"/>
  <text x="${naXs}" y="${naYs+36}" text-anchor="middle" font-size="13" font-weight="bold" fill="#0284c7">N</text>
  <text x="${naXs}" y="${naYs+52}" text-anchor="middle" font-size="9.5" fill="#666">Bắc</text>\n`;

        // BẢNG TỔNG HỢP CÁC KHỐI ĐƯỢC VẼ (ĐẶT TRÊN KHUNG TÊN - XUỐNG DÒNG ĐẦY ĐỦ KHÔNG BỊ CẮT "...")
        const tblY = mapH + 30;
        const colX_Name = 80;
        const colX_AreaM2 = 620;
        const colX_AreaHa = 820;
        const colX_Pct = 1010;
        const tableRight = svgW - 30;

        svgContent += `  <!-- BẢNG TỔNG HỢP DIỆN TÍCH CÁC KHỐI / THỬA ĐẤT -->
  <text x="35" y="${tblY - 8}" font-size="13" font-weight="bold" fill="#0D47A1">BẢNG TỔNG HỢP DIỆN TÍCH CÁC KHỐI / THỬA ĐẤT (TCVN)</text>
  <rect class="layer-bang-ke" x="30" y="${tblY}" width="${svgW - 60}" height="${summaryTableH}" fill="#ffffff"/>
  <rect x="30" y="${tblY}" width="${svgW - 60}" height="26" fill="#E3F2FD"/>
  <line class="layer-bang-ke" x1="30" y1="${tblY + 26}" x2="${tableRight}" y2="${tblY + 26}"/>
  <line class="layer-bang-ke" x1="${colX_Name}" y1="${tblY}" x2="${colX_Name}" y2="${tblY + summaryTableH}"/>
  <line class="layer-bang-ke" x1="${colX_AreaM2}" y1="${tblY}" x2="${colX_AreaM2}" y2="${tblY + summaryTableH}"/>
  <line class="layer-bang-ke" x1="${colX_AreaHa}" y1="${tblY}" x2="${colX_AreaHa}" y2="${tblY + summaryTableH}"/>
  ${showPercent ? `<line class="layer-bang-ke" x1="${colX_Pct}" y1="${tblY}" x2="${colX_Pct}" y2="${tblY + summaryTableH}"/>` : ''}

  <!-- Header bảng -->
  <text class="layer-bang-ke-text" x="45" y="${tblY + 18}" font-weight="bold" fill="#0D47A1">STT</text>
  <text class="layer-bang-ke-text" x="95" y="${tblY + 18}" font-weight="bold" fill="#0D47A1">Ký hiệu & Tên khối / thửa</text>
  <text class="layer-bang-ke-text" x="${colX_AreaM2 + 15}" y="${tblY + 18}" font-weight="bold" fill="#0D47A1">Diện tích (m²)</text>
  <text class="layer-bang-ke-text" x="${colX_AreaHa + 15}" y="${tblY + 18}" font-weight="bold" fill="#0D47A1">Diện tích (ha)</text>
  ${showPercent ? `<text class="layer-bang-ke-text" x="${colX_Pct + 15}" y="${tblY + 18}" font-weight="bold" fill="#0D47A1">Tỉ lệ (%)</text>` : ''}
`;

        let curY = tblY + 26;
        svgRowInfos.forEach((r, idx) => {
            const s = r.shape;
            const isPoly = s.mode === 'polygon';
            const area = s.stats?.area || 0;
            const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';
            const rowBottom = curY + r.rowH;

            svgContent += `  <line class="layer-bang-ke" x1="30" y1="${rowBottom}" x2="${tableRight}" y2="${rowBottom}"/>\n`;
            svgContent += `  <text class="layer-bang-ke-text" x="45" y="${curY + 17}">${idx + 1}</text>\n`;
            
            // Xuống dòng tên khối bằng tspan, bảo toàn 100% ký tự
            svgContent += `  <text class="layer-bang-ke-text" x="95" y="${curY + 17}" font-weight="bold">\n`;
            r.lines.forEach((l, lIdx) => {
                if (lIdx === 0) {
                    svgContent += `    <tspan x="95">${l}</tspan>\n`;
                } else {
                    svgContent += `    <tspan x="95" dy="14">${l}</tspan>\n`;
                }
            });
            svgContent += `  </text>\n`;

            svgContent += `  <text class="layer-bang-ke-text" x="${colX_AreaM2 + 15}" y="${curY + 17}" font-weight="bold">${isPoly ? area.toFixed(2) : '--'}</text>\n`;
            svgContent += `  <text class="layer-bang-ke-text" x="${colX_AreaHa + 15}" y="${curY + 17}">${isPoly ? (area/10000).toFixed(4) : '--'}</text>\n`;
            if (showPercent) {
                svgContent += `  <text class="layer-bang-ke-text" x="${colX_Pct + 15}" y="${curY + 17}" font-weight="bold" fill="#E65100">${pctStr}</text>\n`;
            }
            curY = rowBottom;
        });

        // Hàng tổng cộng
        curY += 26;
        const totalPctStr = (baseProjectArea > 0) ? ((measuredTotalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
        svgContent += `  <line class="layer-bang-ke" x1="30" y1="${curY}" x2="${tableRight}" y2="${curY}"/>
  <text class="layer-bang-ke-text" x="95" y="${curY - 8}" font-weight="bold" fill="#0D47A1">TỔNG CỘNG (${selectedShapes.length} KHỐI)</text>
  <text class="layer-bang-ke-text" x="${colX_AreaM2 + 15}" y="${curY - 8}" font-weight="bold" fill="#1B5E20">${measuredTotalArea.toFixed(2)}</text>
  <text class="layer-bang-ke-text" x="${colX_AreaHa + 15}" y="${curY - 8}" font-weight="bold" fill="#1B5E20">${(measuredTotalArea/10000).toFixed(4)}</text>
  ${showPercent ? `<text class="layer-bang-ke-text" x="${colX_Pct + 15}" y="${curY - 8}" font-weight="bold" fill="#E65100">${totalPctStr}</text>` : ''}
`;

        // Khung tên dưới cùng chuẩn TCVN 7285
        const khy = svgH - 180;
        svgContent += `  <!-- Khung tên bản vẽ chuẩn TCVN 7285 -->
  <rect class="layer-khung-ten" x="30" y="${khy}" width="${svgW-60}" height="150" fill="#ffffff"/>
  <line class="layer-khung-ten" x1="30" y1="${khy+30}" x2="${svgW-30}" y2="${khy+30}"/>
  <line class="layer-khung-ten" x1="30" y1="${khy+70}" x2="${svgW-30}" y2="${khy+70}"/>
  <line class="layer-khung-ten" x1="${(svgW-60)*0.55+30}" y1="${khy+70}" x2="${(svgW-60)*0.55+30}" y2="${khy+150}"/>

  <text class="layer-khung-ten-text" x="45" y="${khy+20}" font-weight="bold">${(meta.organization || 'TRUNG TÂM QUẢN LÝ ĐẤT ĐAI').toUpperCase()}</text>
  <text class="layer-khung-ten-text" x="45" y="${khy+50}" font-weight="bold" font-size="14">${(meta.drawingName || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT').toUpperCase()}</text>
  <text class="layer-khung-ten-text" x="45" y="${khy+65}" font-size="10.5">DỰ ÁN: ${(meta.projectName || '').toUpperCase()}</text>

  <text class="layer-khung-ten-text" x="45" y="${khy+90}" font-size="10.5">Hệ tọa độ: VN-2000 (${AppState.provinceName || 'Tỉnh'})</text>
  <text class="layer-khung-ten-text" x="45" y="${khy+106}" font-size="10.5">KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}' (Múi ${AppState.muiVal || 3}°)</text>
  <text class="layer-khung-ten-text" x="45" y="${khy+122}" font-size="10.5">Người đo: ${(meta.surveyor || '').toUpperCase()}</text>
  <text class="layer-khung-ten-text" x="45" y="${khy+138}" font-size="10.5">Kiểm tra: ${(meta.checker || '').toUpperCase()}</text>

  <text class="layer-khung-ten-text" x="${(svgW-60)*0.55+45}" y="${khy+90}" font-size="10.5">Tỷ lệ: 1:${meta.scaleVal}</text>
  <text class="layer-khung-ten-text" x="${(svgW-60)*0.55+45}" y="${khy+106}" font-size="10.5">Số tờ/thửa: ${meta.parcelNo || '01'}</text>
  <text class="layer-khung-ten-text" x="${(svgW-60)*0.55+45}" y="${khy+122}" font-size="10.5">Ngày: ${meta.drawingDate}</text>
  <text class="layer-khung-ten-text" x="${(svgW-60)*0.55+45}" y="${khy+138}" font-size="10.5">Số đối tượng: ${selectedShapes.length}</text>
</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projName}_BanDo_1-${meta.scaleVal}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`✓ Đã xuất bản vẽ SVG Vector độ nét cao: ${projName}_BanDo_1-${meta.scaleVal}.svg`);
    },

    exportPng() {
        const allShapes = this._getAllExportShapes();
        const selectedShapes = allShapes.filter(s => s.selected !== false);
        if (selectedShapes.length === 0) {
            showToast("⚠️ Vui lòng chọn ít nhất 1 khối để xuất PNG!", true);
            return;
        }

        const meta = this._getExportMeta();
        const showBlockInfo = meta.showBlockInfo === true;
        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project";

        // Bounding box (chuẩn hóa tọa độ VN2000 tránh lỗi tọa độ 0 hoặc rác)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        selectedShapes.forEach(s => {
            (s.vertices || []).forEach((p, idx) => {
                const norm = this._normalizeVertex(p, idx);
                p.x = norm.x; p.y = norm.y;
                if (norm.y > 1000) { if (norm.y < minX) minX = norm.y; if (norm.y > maxX) maxX = norm.y; }
                if (norm.x > 1000) { if (norm.x < minY) minY = norm.x; if (norm.x > maxY) maxY = norm.x; }
            });
        });
        if (!isFinite(minX) || minX === maxX) { minX -= 25; maxX += 25; }
        if (!isFinite(minY) || minY === maxY) { minY -= 25; maxY += 25; }
        const spanX = Math.max(maxX - minX, 10);
        const spanY = Math.max(maxY - minY, 10);

        // Tính tổng diện tích & tỉ lệ %
        let measuredTotalArea = 0;
        selectedShapes.forEach(s => {
            if (s.mode === 'polygon') measuredTotalArea += (s.stats?.area || 0);
        });
        const baseProjectArea = (meta.customTotalArea && meta.customTotalArea > 0) ? meta.customTotalArea : measuredTotalArea;
        const showPercent = meta.showPercent !== false;

        function wrapPngLines(txt, maxW, fontCtx) {
            if (!txt) return [''];
            const str = String(txt).trim();
            if (fontCtx.measureText(str).width <= maxW) return [str];
            const words = str.split(/\s+/);
            const lines = [];
            let cur = '';
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                const test = cur ? (cur + ' ' + w) : w;
                if (fontCtx.measureText(test).width <= maxW) {
                    cur = test;
                } else {
                    if (cur) lines.push(cur);
                    cur = w;
                }
            }
            if (cur) lines.push(cur);
            return lines.length > 0 ? lines : [''];
        }

        // Tạo canvas tạm để đo chữ chính xác
        const measureCanvas = document.createElement('canvas');
        const measureCtx = measureCanvas.getContext('2d');
        measureCtx.font = 'bold 11.5px Arial';

        const pngRowInfos = selectedShapes.map((s, idx) => {
            const displayName = s.symbol ? `[${s.symbol}] ${s.name}` : (s.name || `Thửa ${idx + 1}`);
            const lines = wrapPngLines(displayName, 500, measureCtx);
            const rowH = Math.max(26, 8 + lines.length * 15);
            return { shape: s, displayName, lines, rowH };
        });
        const summaryTableH = 26 + pngRowInfos.reduce((sum, r) => sum + r.rowH, 0) + 26;

        const W = 1200;
        const mapH = Math.max(Math.round(W * spanY / spanX), 450);
        const H = mapH + 380 + summaryTableH;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const pad = 80;
        const sc = Math.min((W - pad*2) / spanX, (mapH - pad) / spanY);

        const toX = cx => pad + (cx - minX) * sc;
        const toY = cy => (H - 250 - summaryTableH - pad) - (cy - minY) * sc;

        // Nền trắng tinh khôi chuẩn bản vẽ kỹ thuật
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = '#B0BEC580';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([4, 4]);
        const gridInt = meta.scaleVal >= 2000 ? 100 : meta.scaleVal >= 1000 ? 50 : 20;
        for (let gx = Math.floor(minX / gridInt) * gridInt; gx <= maxX + gridInt; gx += gridInt) {
            ctx.beginPath(); ctx.moveTo(toX(gx), pad); ctx.lineTo(toX(gx), H - 250 - summaryTableH - pad); ctx.stroke();
        }
        for (let gy = Math.floor(minY / gridInt) * gridInt; gy <= maxY + gridInt; gy += gridInt) {
            ctx.beginPath(); ctx.moveTo(pad, toY(gy)); ctx.lineTo(W - pad, toY(gy)); ctx.stroke();
        }
        ctx.setLineDash([]);

        // Khung ngoài bản vẽ
        ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
        ctx.strokeRect(15, 15, W - 30, H - 30);
        ctx.lineWidth = 1;
        ctx.strokeRect(22, 22, W - 44, H - 44);

        // Vẽ các đối tượng được chọn
        selectedShapes.forEach((shape) => {
            const pts = shape.vertices;
            if (pts.length < 2) return;
            const isClosed = shape.mode === 'polygon' && pts.length >= 3;

            if (isClosed) {
                ctx.beginPath();
                ctx.moveTo(toX(pts[0].y), toY(pts[0].x));
                pts.slice(1).forEach(p => ctx.lineTo(toX(p.y), toY(p.x)));
                ctx.closePath();
                ctx.fillStyle = shape.color + '30';
                ctx.fill();
            }

            // Ranh thửa
            ctx.beginPath();
            ctx.strokeStyle = '#1565C0';
            ctx.lineWidth = 2.5;
            ctx.moveTo(toX(pts[0].y), toY(pts[0].x));
            pts.slice(1).forEach(p => ctx.lineTo(toX(p.y), toY(p.x)));
            if (isClosed) ctx.closePath();
            ctx.stroke();

            // Điểm mốc & ký hiệu đỉnh
            if (meta.showVertices !== false) {
                pts.forEach((p) => {
                    const px = toX(p.y), py = toY(p.x);
                    ctx.strokeStyle = '#C62828'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.stroke();
                    ctx.font = 'bold 10px Arial';
                    ctx.fillStyle = '#0f172a';
                    ctx.fillText(p.name || '', px + 5, py - 5);
                });
            }

            // Kích thước cạnh
            if (meta.showDistances && shape.stats && shape.stats.edges) {
                ctx.font = '10px Arial'; ctx.fillStyle = '#E65100';
                shape.stats.edges.forEach((edge, idx) => {
                    const p1 = pts[idx], p2 = pts[(idx+1) % pts.length];
                    const mx = toX((p1.y + p2.y) / 2);
                    const my = toY((p1.x + p2.x) / 2);
                    ctx.fillText(`${edge.lengthFormatted}m`, mx, my - 4);
                });
            }

            // Nhãn tâm khối (Visual Interior Center - chuẩn trong lòng khối chữ L)
            if (meta.showCenterLabels !== false && isClosed && shape.stats) {
                const center = this.calculatePolygonVisualCenter(pts.map(p => ({ x: p.y, y: p.x })));
                const cx = center.x;
                const cy = center.y;
                const blockSymbol = shape.symbol ? shape.symbol : String(shapeIdx + 1);
                if (showBlockInfo) {
                    ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#0D47A1';
                    ctx.textAlign = 'center';
                    ctx.fillText(`[${blockSymbol}] ${shape.name}`, toX(cx), toY(cy) - 8);
                    ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#6A1B9A';
                    let pctStr = '';
                    if (showPercent && baseProjectArea > 0) {
                        pctStr = ` (${((shape.stats.area / baseProjectArea) * 100).toFixed(2)}%)`;
                    }
                    ctx.fillText(`S=${shape.stats.areaFormatted}m²${pctStr}`, toX(cx), toY(cy) + 8);
                    ctx.textAlign = 'left';
                } else {
                    ctx.font = 'bold 15px Arial'; ctx.fillStyle = '#0D47A1';
                    ctx.textAlign = 'center';
                    ctx.fillText(blockSymbol, toX(cx), toY(cy) + 5);
                    ctx.textAlign = 'left';
                }
            } else if (!isClosed && shape.mode !== 'polygon') {
                const midIdx = Math.floor(pts.length / 2);
                const mp = pts[midIdx] || pts[0];
                ctx.font = 'bold 13px Arial'; ctx.fillStyle = '#0D47A1';
                ctx.fillText(shape.name, toX(mp.y) + 6, toY(mp.x) - 6);
            }
        });

        // BẢNG TỔNG HỢP CÁC KHỐI ĐƯỢC VẼ (ĐẶT TRÊN KHUNG TÊN - ĐÃ BỎ CỘT LOẠI & CHU VI)
        const tblY = H - 240 - summaryTableH;
        ctx.fillStyle = '#0D47A1';
        ctx.font = 'bold 13px Arial';
        ctx.fillText('BẢNG TỔNG HỢP DIỆN TÍCH CÁC KHỐI / THỬA ĐẤT (TCVN)', 35, tblY - 8);

        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        ctx.strokeRect(30, tblY, W - 60, summaryTableH);

        // Header (Bỏ cột Loại và Chu vi)
        ctx.fillStyle = '#E3F2FD';
        ctx.fillRect(30, tblY, W - 60, 26);
        ctx.beginPath(); ctx.moveTo(30, tblY + 26); ctx.lineTo(W - 30, tblY + 26); ctx.stroke();

        ctx.fillStyle = '#0D47A1';
        ctx.font = 'bold 11.5px Arial';
        ctx.fillText('STT', 45, tblY + 18);
        ctx.fillText('Ký hiệu & Tên khối / thửa', 100, tblY + 18);
        ctx.fillText('Diện tích (m²)', 620, tblY + 18);
        ctx.fillText('Diện tích (ha)', 820, tblY + 18);
        if (showPercent) ctx.fillText('Tỉ lệ (%)', 1010, tblY + 18);

        let rowY = tblY + 26;
        pngRowInfos.forEach((r, idx) => {
            const s = r.shape;
            const isPoly = s.mode === 'polygon';
            const area = s.stats?.area || 0;
            const pctStr = (isPoly && baseProjectArea > 0) ? ((area / baseProjectArea) * 100.0).toFixed(2) + '%' : '--';
            const rowBottom = rowY + r.rowH;

            ctx.beginPath(); ctx.moveTo(30, rowBottom); ctx.lineTo(W - 30, rowBottom); ctx.stroke();

            ctx.fillStyle = '#333';
            ctx.font = '11.5px Arial';
            ctx.fillText(String(idx + 1), 45, rowY + 17);

            // Xuống dòng tên khối/thửa trên PNG không xóa mất ký tự
            ctx.font = 'bold 11.5px Arial';
            r.lines.forEach((l, lIdx) => {
                ctx.fillText(l, 100, rowY + 17 + lIdx * 15);
            });

            ctx.fillText(isPoly ? area.toFixed(2) : '--', 620, rowY + 17);
            ctx.font = '11.5px Arial';
            ctx.fillText(isPoly ? (area / 10000).toFixed(4) : '--', 820, rowY + 17);
            if (showPercent) {
                ctx.fillStyle = '#E65100';
                ctx.font = 'bold 11.5px Arial';
                ctx.fillText(pctStr, 1010, rowY + 17);
            }
            rowY = rowBottom;
        });

        // Hàng tổng cộng
        rowY += 26;
        ctx.beginPath(); ctx.moveTo(30, rowY); ctx.lineTo(W - 30, rowY); ctx.stroke();
        ctx.fillStyle = '#0D47A1';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`TỔNG CỘNG (${selectedShapes.length} KHỐI)`, 100, rowY - 8);
        ctx.fillStyle = '#1B5E20';
        ctx.fillText(measuredTotalArea.toFixed(2), 620, rowY - 8);
        ctx.fillText((measuredTotalArea / 10000).toFixed(4), 820, rowY - 8);
        if (showPercent) {
            ctx.fillStyle = '#E65100';
            const totalPctStr = (baseProjectArea > 0) ? ((measuredTotalArea / baseProjectArea) * 100.0).toFixed(2) + '%' : '100.00%';
            ctx.fillText(totalPctStr, 1010, rowY - 8);
        }

        // Khung tên dưới cùng
        const khy = H - 230;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
        ctx.strokeRect(30, khy, W - 60, 210);
        ctx.beginPath();
        ctx.moveTo(30, khy + 40); ctx.lineTo(W - 30, khy + 40);
        ctx.moveTo(30, khy + 90); ctx.lineTo(W - 30, khy + 90);
        const midX = (W - 60) * 0.55 + 30;
        ctx.moveTo(midX, khy + 90); ctx.lineTo(midX, khy + 210);
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.fillText((meta.organization || 'TRUNG TÂM QUẢN LÝ ĐẤT ĐAI').toUpperCase(), 45, khy + 26);
        ctx.font = 'bold 18px Arial';
        ctx.fillText((meta.drawingName || 'BẢN ĐỒ HIỆN TRẠNG VỊ TRÍ THỬA ĐẤT').toUpperCase(), 45, khy + 65);
        ctx.font = '13px Arial';
        ctx.fillText(`DỰ ÁN: ${(meta.projectName || '').toUpperCase()}`, 45, khy + 83);

        const lY = khy + 115;
        ctx.font = '12px Arial';
        ctx.fillText(`Hệ tọa độ: VN-2000 (${AppState.provinceName || 'Tỉnh'})`, 45, lY);
        ctx.fillText(`KTT: ${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}' (Múi ${AppState.muiVal || 3}°)`, 45, lY + 24);
        ctx.fillText(`Người đo: ${(meta.surveyor || '').toUpperCase()}`, 45, lY + 48);
        ctx.fillText(`Kiểm tra: ${(meta.checker || '').toUpperCase()}`, 45, lY + 72);

        ctx.fillText(`Tỷ lệ: 1:${meta.scaleVal}`, midX + 20, lY);
        ctx.fillText(`Số tờ/thửa: ${meta.parcelNo || '01'}`, midX + 20, lY + 24);
        ctx.fillText(`Ngày: ${meta.drawingDate}`, midX + 20, lY + 48);
        ctx.fillText(`Số đối tượng: ${selectedShapes.length}`, midX + 20, lY + 72);

        // Xuất file PNG
        canvas.toBlob((blob) => {
            if (!blob) { showToast("⚠️ Lỗi tạo ảnh PNG!", true); return; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projName}_BanDo_1-${meta.scaleVal}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`✓ Đã xuất ảnh PNG kèm bảng tổng hợp: ${projName}_BanDo_1-${meta.scaleVal}.png`);
        }, 'image/png');
    }
};

// ================= 11. KHỞI TẠO ỨNG DỤNG (APP BOOTSTRAP) =================
window.addEventListener('DOMContentLoaded', () => {
// Menu button handled via debounced appNav.toggleTreeMenu

    appTransform.init();
    appData.init();
    appGps.init();
    if (typeof appDashboard !== 'undefined') appDashboard.init();
    if (typeof appCadTool !== 'undefined') appCadTool.init();
    appSettings.applyToUi();
    appNav.updateBanner();

    // Lưu chắc chắn khi người dùng đóng tab / chuyển app (PWA trên di động)
    window.addEventListener('pagehide', () => appSettings.saveNow());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') appSettings.saveNow();
    });


    // Lắng nghe phím bấm Escape để đóng cây thư mục chức năng
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && AppState.isTreeDrawerOpen) {
            appNav.closeTreeMenu();
        }
    });
});

// ================= GLOBAL WINDOW EXPORTS FOR RELIABLE BROWSER / WEBVIEW COMPATIBILITY =================
if (typeof window !== 'undefined') {
    window.appNav = appNav;
    window.AppState = AppState;
    window.appElevationProfile = appElevationProfile;
    window.appGeoidVigac = appGeoidVigac;
    window.appDashboard = appDashboard;
    window.appData = appData;
    window.appGps = appGps;
    window.appTransform = appTransform;
    window.appModal = appModal;
    window.appCadTool = appCadTool;
    window.appMap = appMap;
    window.appStakeout = appStakeout;
    window.appCamera = appCamera;
    window.appGeodesy = appGeodesy;
    window.triggerHaptic = triggerHaptic;
    window.showToast = showToast;
    window.appSettings = appSettings;
}
