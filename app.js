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
    showProjectDistance: true,
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
                        if (appElevationProfile.currentTab === 'pit') {
                            appElevationProfile.calculateAndRenderPit();
                        } else {
                            appElevationProfile.calculateAndRender();
                        }
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
            appNav.openProjectMap();
            if (!AppState.showProjectDistance) {
                appMap.toggleDistanceDisplay();
            }
            showToast("📏 Chế độ đo khoảng cách giữa các mốc đã sẵn sàng!");
        } else if (action === 'measure_polygon') {
            appNav.setActiveMenuItem('drawerItem_measure_polygon');
            appNav.openProjectMap();
            if (!AppState.isPolygonClosed) {
                appMap.togglePolygonClose();
            }
            showToast("📐 Chế độ khép góc đa giác ranh thửa đã kích hoạt!");
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

    openProjectMap() {
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
        appMap.loadProjectMarkers();
        appMap.fitProjectBounds();
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
        { id: 'about', name: '10. Thông Tin & Hướng Dẫn', short: 'Thông Tin & Cẩm Nang', icon: 'ℹ️', color: 'slate', tag: '3 Tab Chuyên Nghiệp', sub: 'Cẩm nang 10 nghiệp vụ • Cài PWA • Toán BTNMT', metric: 'v2.5.6 Pro', action: () => appNav.showScreen('about') }
    ],

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

    isAccordionExpanded: false,

    toggleAccordion() {
        triggerHaptic('light');
        appDashboard.isAccordionExpanded = !appDashboard.isAccordionExpanded;
        const content = document.getElementById('accordionToolsContent');
        const chevron = document.getElementById('accordionChevronIcon');
        if (content) content.classList.toggle('expanded', appDashboard.isAccordionExpanded);
        if (chevron) chevron.classList.toggle('expanded', appDashboard.isAccordionExpanded);
    },

    renderDashboard() {
        const grid = document.getElementById('bigActionTilesGrid');
        const compactList = document.getElementById('compactToolsContainer');
        const countBadge = document.getElementById('accordionToolsCount');
        if (!grid || !compactList) return;

        const pinnedIds = appDashboard.getPinnedFeatureIds();
        const pinnedFeatures = [];
        const unpinnedFeatures = [];

        appDashboard.allFeatures.forEach(f => {
            if (pinnedIds.includes(f.id)) {
                pinnedFeatures.push(f);
            } else {
                unpinnedFeatures.push(f);
            }
        });

        // 1. Render 4 Big Action Tiles
        grid.innerHTML = pinnedFeatures.map(f => {
            const metricVal = typeof f.metric === 'function' ? f.metric() : f.metric;
            return `
              <div class="big-action-tile" onclick="triggerHaptic('light'); appDashboard.launchFeature('${f.id}')" title="Mở ${f.name}">
                <div class="big-tile-top">
                  <div class="big-tile-icon-box icon-box-${f.color}">${f.icon}</div>
                  <span class="big-tile-pin-badge" title="Đang ghim trên màn hình chính">⭐</span>
                </div>
                <div class="big-tile-bottom">
                  <div class="big-tile-title">${f.short}</div>
                  <div class="big-tile-subtitle">${f.sub}</div>
                  <div class="big-tile-metric">${metricVal}</div>
                </div>
              </div>
            `;
        }).join('');

        // 2. Render Accordion Tools
        compactList.innerHTML = unpinnedFeatures.map(f => {
            return `
              <div class="compact-tool-card" onclick="triggerHaptic('light'); appDashboard.launchFeature('${f.id}')" title="Mở ${f.name}">
                <div class="compact-tool-left">
                  <div class="compact-tool-icon icon-box-${f.color}">${f.icon}</div>
                  <div class="compact-tool-info">
                    <div class="compact-tool-title">${f.name}</div>
                    <div class="compact-tool-desc">${f.sub}</div>
                  </div>
                </div>
                <div class="compact-tool-right">
                  <button type="button" class="btn-compact-pin" onclick="event.stopPropagation(); appDashboard.quickSwapPin('${f.id}')" title="Ghim tính năng này lên Màn hình chính">⭐</button>
                  <span class="btn-compact-launch">Mở ➔</span>
                </div>
              </div>
            `;
        }).join('');

        if (countBadge) countBadge.innerText = `${unpinnedFeatures.length} công cụ`;
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
            pinned[3] = idToPin;
            appDashboard.savePinnedFeatureIds(pinned);
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
        const btn = document.getElementById('btnToggleGpsTracking');
        if (btn) btn.innerText = "▶️ Tiếp tục bắt GPS";
        const badge = document.getElementById('gpsLiveStatusBadge');
        if (badge) {
            badge.innerText = "⏸️ Đã dừng";
            badge.className = "btn-sm";
        }
        appGps.updateHeaderGpsUI('off');
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
    if (AppState.projectDistanceLabelsGroup) {
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

    populateMapProjectSelect() {
        const sel = document.getElementById('selMapProjectFiles');
        if (!sel) return;
        sel.innerHTML = '';
        AppState.projectsList.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            const ptsCount = appData.getPoints(name).length;
            opt.innerText = `${name} (${ptsCount} mốc)`;
            if (name === AppState.currentProject) opt.selected = true;
            sel.appendChild(opt);
        });
    },

    onMapProjectChange(projectName) {
        if (!projectName) return;
        AppState.currentProject = projectName;
        localStorage.setItem('vn2k_cur_project', AppState.currentProject);
        appData.populateProjectSelect();
        appNav.updateBanner();
        appMap.loadProjectMarkers();
        appMap.fitProjectBounds();
        showToast(`📁 Chuyển dự án: ${projectName}`);
    },

    toggleDistanceDisplay() {
        AppState.showProjectDistance = !AppState.showProjectDistance;
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
        if (AppState.projectPolygonLayer && AppState.leafletMap.hasLayer(AppState.projectPolygonLayer)) {
            AppState.leafletMap.removeLayer(AppState.projectPolygonLayer);
            AppState.projectPolygonLayer = null;
        }

        appMap.populateMapProjectSelect();

        const pts = appData.getPoints(AppState.currentProject);
        if (!pts || pts.length === 0) {
            const hud = document.getElementById('mapDistanceHud');
            if (hud) hud.style.display = 'none';
            return;
        }

        const validCoords = [];
        const validPoints = [];

        pts.forEach((p, idx) => {
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

            validCoords.push([lat, lng]);
            validPoints.push(p);

            // Ghim đánh số thứ tự 1, 2, 3...
            const iconHtml = `<div style="background:#dc2626; color:#fff; border:2px solid #fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; box-shadow:0 3px 8px rgba(0,0,0,0.5);">${idx + 1}</div>`;
            const customIcon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });

            const marker = L.marker([lat, lng], { icon: customIcon });

            marker.on('click', () => {
                if (AppState.measureStartPoint && AppState.measureStartPoint !== p) {
                    appMap.showPointMeasurement(AppState.measureStartPoint, p);
                    AppState.measureStartPoint = null;
                }
            });

            marker.bindPopup(`
                <div style="font-family:-apple-system, sans-serif; font-size:12px; line-height:1.5;">
                    <b style="color:#e11d48; font-size:13px;">📌 ${idx + 1}. ${p.name || 'Mốc'}</b><br>
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
        if (n >= 2) {
            let totalDist = 0;
            let segmentCount = 0;

            // Nối đường line giữa các mốc
            const lineCoords = validCoords.slice();
            if (AppState.isPolygonClosed && n >= 3) {
                lineCoords.push(validCoords[0]); // Nối khép góc về điểm đầu
            }

            AppState.projectPolyline = L.polyline(lineCoords, {
                color: '#38bdf8',
                weight: 2.5,
                dashArray: '5, 8'
            });
            AppState.projectMarkersGroup.addLayer(AppState.projectPolyline);

            // Tính khoảng cách từng đoạn
            for (let i = 0; i < n - 1; i++) {
                const pA = validPoints[i];
                const pB = validPoints[i + 1];
                const segDist = calcPointsDistance(pA, pB);
                totalDist += segDist;
                segmentCount++;

                if (AppState.showProjectDistance && AppState.projectDistanceLabelsGroup) {
                    addDistanceBadge(pA, pB, segDist);
                }
            }

            // Đoạn khép góc cuối về đầu
            if (AppState.isPolygonClosed && n >= 3) {
                const pLast = validPoints[n - 1];
                const pFirst = validPoints[0];
                const closeDist = calcPointsDistance(pLast, pFirst);
                totalDist += closeDist;
                segmentCount++;

                if (AppState.showProjectDistance && AppState.projectDistanceLabelsGroup) {
                    addDistanceBadge(pLast, pFirst, closeDist);
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
            } else {
                const areaContainer = document.getElementById('hudAreaContainer');
                if (areaContainer) areaContainer.style.display = 'none';
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
            if (btnPoly) btnPoly.classList.toggle('active', AppState.isPolygonClosed);

        } else {
            const hud = document.getElementById('mapDistanceHud');
            if (hud) hud.style.display = 'none';
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
            return copy;
        });

        const payload = {
            action: 'bulk_sync',
            project: proj,
            points: pointsToSend
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
        AppState.projectsList.forEach(proj => {
            const pts = appData.getPoints(proj);
            pts.forEach(p => {
                const copy = Object.assign({}, p);
                copy.project = proj;
                allPoints.push(copy);
            });
        });

        if (allPoints.length === 0) {
            showToast("⚠️ Tất cả các dự án hiện chưa có mốc nào để đồng bộ!", true);
            return;
        }

        const btn = document.getElementById('btnSyncAllProjects');
        const origText = btn ? btn.innerText : '';
        if (btn) {
            btn.innerText = `⏳ Đang gửi ${allPoints.length} mốc (${AppState.projectsList.length} dự án)...`;
            btn.disabled = true;
        }

        const payload = {
            action: 'bulk_sync',
            points: allPoints
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

        // Đảm bảo từng mốc mang đúng tên dự án của chính nó
        const pointsToSend = AppState.offlineQueue.map(item => {
            const pt = Object.assign({}, item.point);
            pt.project = item.project || pt.project || AppState.currentProject;
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
                x: "1144058.623",
                y: "539624.574",
                lat: "10.345211",
                lng: "106.113617",
                mui: AppState.muiVal,
                ktt: `${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}'`,
                note: "Thử nghiệm kết nối từ PWA",
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
            showToast("✅ Kết nối Google Apps Script thành công! (Dòng thử nghiệm đã được ghi vào Sheet)", true);
        }).catch(err => {
            showToast(`❌ Thất bại: ${err.message}`, true);
        });
    },

    copyAppsScriptTemplate() {
        const scriptCode = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT ĐỒNG BỘ SỔ ĐO TỌA ĐỘ TRẮC ĐỊA VN-2000 & WGS-84 PRO
 * Tác giả: Đặng Như (dnpn.ttqt@gmail.com) - Phiên bản Tối Ưu v2.3
 * =========================================================================
 * Tính năng tự động hóa vượt trội:
 * 1. Lưu TẬP TRUNG tất cả dự án vào 1 Sheet (Tab) duy nhất "Sổ Đo Tọa Độ",
 *    phân biệt rõ ràng theo cột "Dự Án" (cột 10) - Không bị tách nhỏ tab.
 * 2. Tự động bật bộ lọc dữ liệu (Filter) giúp lọc xem từng dự án chỉ với 1 click.
 * 3. Chống trùng lặp mốc tuyệt đối: Định danh mốc theo [Dự Án + Tên Mốc + X + Y].
 *    Dù bấm đồng bộ nhiều lần, số lượng mốc của từng dự án luôn chuẩn xác 100%.
 * 4. Tự động tạo công thức Google Maps vệ tinh chuẩn tiếng Việt dấu chấm phẩy (;).
 * 5. Định dạng trắc địa chuẩn (X, Y: 3 số lẻ; Lat, Lng: 6 số lẻ).
 * 6. Hàm tiện ích "gopVaLamSachSoDo()": Tự động gom các tab cũ và dọn sạch trùng lặp!
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
    var defaultProject = (data.project || "So_Do_Mac_Dinh").replace(/[:\\\\/?*\\[\\]]/g, "_").replace(/\\.csv$/i, "");

    // 1. Lưu tập trung toàn bộ dự án vào 1 Sheet (Tab) duy nhất
    var sheetName = "Sổ Đo Tọa Độ";
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      var allSheets = ss.getSheets();
      if (allSheets.length > 0 && (allSheets[0].getName() === "Sheet1" || allSheets[0].getName() === "Trang tính1")) {
        allSheets[0].setName(sheetName);
        sheet = allSheets[0];
      } else {
        sheet = ss.insertSheet(sheetName, 0);
      }
    }

    // 2. Khởi tạo dòng tiêu đề chuẩn nếu Tab còn trống
    if (sheet.getLastRow() === 0) {
      initSheetHeader(sheet);
    }

    var addedCount = 0;
    var existingKeys = getExistingKeys(sheet);

    // 3. Xử lý đồng bộ nhiều mốc cùng lúc (Bulk Sync)
    if (Array.isArray(data.points) && data.points.length > 0) {
      var rowsToAdd = [];

      data.points.forEach(function(p) {
        var pProj = String(p.project || defaultProject).replace(/\\.csv$/i, "").trim();
        var pName = String(p.name || "Mốc").trim();
        var pX = parseFloat(p.x) || 0;
        var pY = parseFloat(p.y) || 0;
        var key = pProj.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

        if (!existingKeys[key]) {
          rowsToAdd.push(formatPointRow(p, pProj));
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
      var pProj = String(p.project || defaultProject).replace(/\\.csv$/i, "").trim();
      var pName = String(p.name || "Mốc").trim();
      var pX = parseFloat(p.x) || 0;
      var pY = parseFloat(p.y) || 0;
      var key = pProj.toLowerCase() + "_" + pName.toLowerCase() + "_" + pX.toFixed(3) + "_" + pY.toFixed(3);

      if (!existingKeys[key]) {
        var rowData = formatPointRow(p, pProj);
        sheet.appendRow(rowData);
        var lastRow = sheet.getLastRow();
        formatDataRange(sheet, lastRow, 1);
        addedCount = 1;
      }
    }

    // Cập nhật bộ lọc bao quát tất cả dòng nếu có thêm mốc mới
    if (addedCount > 0) {
      ensureFilterRange(sheet);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      added: addedCount,
      sheet: sheetName
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

// Khởi tạo dòng tiêu đề sang trọng, đóng băng hàng 1 và tạo bộ lọc Filter
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
  ensureFilterRange(sheet);
}

// Đảm bảo bộ lọc dữ liệu luôn bao quát toàn bộ bảng
function ensureFilterRange(sheet) {
  try {
    var lastRow = Math.max(sheet.getLastRow(), 2);
    var filter = sheet.getFilter();
    if (!filter) {
      sheet.getRange(1, 1, lastRow, 11).createFilter();
    }
  } catch(e) {}
}

// Định dạng dữ liệu một dòng kèm tên Dự Án chuẩn xác
function formatPointRow(p, projectName) {
  var lat = parseFloat(p.lat) || 0;
  var lng = parseFloat(p.lng) || 0;
  var proj = String(p.project || projectName || "Mặc định").replace(/\\.csv$/i, "").trim();
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
    proj,
    mapFormula
  ];
}

// Định dạng số liệu trắc địa & áp dụng setFormulasLocal đảm bảo 100% không bị lỗi #ERROR!
function formatDataRange(sheet, startRow, numRows) {
  try {
    sheet.getRange(startRow, 3, numRows, 2).setNumberFormat("#,##0.000");
    sheet.getRange(startRow, 5, numRows, 2).setNumberFormat("0.000000");
    sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment("center");
    sheet.getRange(startRow, 2, numRows, 1).setFontWeight("bold").setFontColor("#b45309");
    sheet.getRange(startRow, 10, numRows, 1).setFontWeight("bold").setFontColor("#0284c7").setHorizontalAlignment("center");
    sheet.getRange(startRow, 11, numRows, 1).setHorizontalAlignment("center");

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

// Lấy danh sách khóa mốc đã có theo [Dự Án + Tên Mốc + X + Y] để chống trùng lặp tuyệt đối
function getExistingKeys(sheet) {
  var keys = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    for (var i = 0; i < data.length; i++) {
      var rowName = String(data[i][1] || "").trim().toLowerCase();
      var rowX = parseFloat(data[i][2]) || 0;
      var rowY = parseFloat(data[i][3]) || 0;
      var rowProj = String(data[i][9] || "").trim().toLowerCase().replace(/\\.csv$/i, "");
      var key = rowProj + "_" + rowName + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
      keys[key] = true;
    }
  }
  return keys;
}

// HÀM TIỆN ÍCH DỌN DẸP: Gom tất cả các tab cũ về 1 tab "Sổ Đo Tọa Độ", khử trùng lặp & xóa tab thừa
function gopVaLamSachSoDo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targetSheet = ss.getSheetByName("Sổ Đo Tọa Độ");
  if (!targetSheet) {
    targetSheet = ss.insertSheet("Sổ Đo Tọa Độ", 0);
  }
  if (targetSheet.getLastRow() === 0) {
    initSheetHeader(targetSheet);
  }

  var existingKeys = getExistingKeys(targetSheet);
  var sheets = ss.getSheets();
  var totalImported = 0;
  var sheetsToDelete = [];

  sheets.forEach(function(sh) {
    if (sh.getName() === "Sổ Đo Tọa Độ") return;

    var lastRow = sh.getLastRow();
    if (lastRow > 1) {
      var numRows = lastRow - 1;
      var values = sh.getRange(2, 1, numRows, Math.min(sh.getLastColumn(), 11)).getValues();
      var rowsToAdd = [];

      for (var r = 0; r < values.length; r++) {
        var row = values[r];
        var rowTime = row[0] || new Date();
        var rowName = String(row[1] || "Mốc").trim();
        var rowX = parseFloat(row[2]) || 0;
        var rowY = parseFloat(row[3]) || 0;
        var rowLat = parseFloat(row[4]) || 0;
        var rowLng = parseFloat(row[5]) || 0;
        var rowMui = row[6] || "Múi 3°";
        var rowKtt = row[7] || "";
        var rowNote = row[8] || "";
        var rowProj = String(row[9] || sh.getName()).replace(/\\.csv$/i, "").trim();

        var key = rowProj.toLowerCase() + "_" + rowName.toLowerCase() + "_" + rowX.toFixed(3) + "_" + rowY.toFixed(3);
        if (!existingKeys[key] && (rowX !== 0 || rowLat !== 0)) {
          var mapFormula = (rowLat !== 0 && rowLng !== 0) 
            ? '=HYPERLINK("https://www.google.com/maps?q=' + rowLat + ',' + rowLng + '"; "🗺️ Xem Vị Trí")'
            : "";

          rowsToAdd.push([
            rowTime, rowName, rowX, rowY, rowLat, rowLng, rowMui, rowKtt, rowNote, rowProj, mapFormula
          ]);
          existingKeys[key] = true;
          totalImported++;
        }
      }

      if (rowsToAdd.length > 0) {
        var startRow = targetSheet.getLastRow() + 1;
        var range = targetSheet.getRange(startRow, 1, rowsToAdd.length, rowsToAdd[0].length);
        range.setValues(rowsToAdd);
        formatDataRange(targetSheet, startRow, rowsToAdd.length);
      }
    }

    sheetsToDelete.push(sh);
  });

  sheetsToDelete.forEach(function(sh) {
    try {
      if (ss.getSheets().length > 1) {
        ss.deleteSheet(sh);
      }
    } catch(e) {}
  });

  ensureFilterRange(targetSheet);
  return "✓ Đã gom và làm sạch thành công " + totalImported + " mốc vào duy nhất tab 'Sổ Đo Tọa Độ'!";
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

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            appData.processImportedText(text, file.name);
        };
        reader.readAsText(file, "UTF-8");
        event.target.value = "";
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

        appData.populateProjectSelect();
        appNav.updateBanner();
        if (AppState.currentScreen === 'datamgmt') {
            appData.refreshTable();
        }

        appModal.closeImportProjectModal();
        showToast(`✓ Đã nạp thành công ${parsedPoints.length} mốc vào dự án: ${targetProj}!`, true);

        // Mở bản đồ và zoom bao quát các mốc vừa nạp
        appNav.openProjectMap();
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
        appNav.openProjectMap();
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
    currentTab: 'pit',
    profileData: [],
    pitPoints: [],
    pickerSelectedIds: new Set(),
    lastPitStats: null,

    setTab(tab) {
        triggerHaptic('light');
        this.currentTab = tab;
        const btnAlign = document.getElementById('btnProfileTabAlign');
        const btnPit = document.getElementById('btnProfileTabPit');
        const panelAlign = document.getElementById('profilePanelAlignment');
        const panelPit = document.getElementById('profilePanelPit');

        if (btnAlign) btnAlign.classList.toggle('active', tab === 'align');
        if (btnPit) btnPit.classList.toggle('active', tab === 'pit');
        if (panelAlign) panelAlign.classList.toggle('active', tab === 'align');
        if (panelPit) panelPit.classList.toggle('active', tab === 'pit');

        if (tab === 'pit') {
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

    // --- BỘ CHỌN MỐC DỰ ÁN CHO HỐ ĐÀO (CHECKLIST MODAL) ---
    openProjectPointPicker() {
        triggerHaptic('light');
        const modal = document.getElementById('modalPitPointPicker');
        const projNameEl = document.getElementById('txtPickerProjName');
        const listEl = document.getElementById('listProjectPointsPicker');
        if (!modal || !listEl) return;

        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Dự án hiện tại";
        if (projNameEl) projNameEl.innerText = projName;

        const allPoints = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject) : [];
        if (!allPoints || allPoints.length === 0) {
            listEl.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">⚠️ Dự án này chưa có điểm mốc nào. Vui lòng thêm mốc hoặc chuyển đổi tọa độ trước!</div>';
            modal.classList.add('active');
            modal.style.display = 'flex';
            return;
        }

        // Khởi tạo tập chọn từ pitPoints hiện có
        this.pickerSelectedIds.clear();
        if (this.pitPoints && this.pitPoints.length > 0) {
            this.pitPoints.forEach(p => {
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

        if (selected.length < 3) {
            showToast("⚠️ Cần chọn tối thiểu 3 điểm mốc để tạo chu vi đa giác đáy hố đào!", true);
            return;
        }

        this.pitPoints = selected;
        this.renderPitPointsTable();
        this.closeProjectPointPicker();
        this.calculateAndRenderPit();
        showToast(`✓ Đã nạp ${selected.length} mốc đáy hố đào từ dự án!`);
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
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center;">
                <td style="padding: 6px; font-weight: 700; color: #38bdf8;">${pt.name || 'M' + (idx+1)}</td>
                <td style="padding: 6px; font-family: monospace;">${pt.x.toFixed(2)}</td>
                <td style="padding: 6px; font-family: monospace;">${pt.y.toFixed(2)}</td>
                <td style="padding: 6px; color: #4ade80; font-family: monospace;">${pt.z.toFixed(2)}</td>
                <td style="padding: 6px;">
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
        // Lấy danh sách điểm từ sổ đo hoặc dự án hiện tại
        const pts = (typeof appData !== 'undefined' && appData.getPoints) ? appData.getPoints(AppState.currentProject) : [];
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
    mode: 'polygon', // 'polygon' | 'polyline'
    snapEnabled: true,
    snapThresholdPx: 24,
    vertices: [], // [{ id, name, lat, lng, x, y, h, isSnapped, snapSource }]
    savedShapes: [], // [{ id, name, shortName, mode, vertices, stats, color }]
    palette: ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#38bdf8', '#84cc16', '#f97316'],
    layers: {
        group: null,
        shape: null,
        markers: [],
        edgeLabels: [],
        centerLabel: null,
        offsetLayer: null,
        rubberbandLine: null,
        dynamicInputMarker: null,
        osnapMarker: null
    },

    init() {
        this.ensureLayers();
        this.bindEvents();
    },

    bindEvents() {
        // Phím tắt bàn phím chuẩn thao tác AutoCAD chuyên nghiệp
        window.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            // Bỏ qua khi người dùng đang nhập liệu trong ô input / textarea
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

            const key = e.key.toUpperCase();
            if (key === 'P') {
                e.preventDefault();
                this.setMode('polygon');
            } else if (key === 'L') {
                e.preventDefault();
                this.setMode('polyline');
            } else if (key === 'S') {
                e.preventDefault();
                this.toggleSnap();
            } else if (key === 'C') {
                e.preventDefault();
                this.closeLoop();
            } else if (key === 'U') {
                e.preventDefault();
                this.undoVertex();
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
            } else if (key === 'X') {
                e.preventDefault();
                this.clearDrawing();
            } else if (e.key === 'Escape') {
                this.closeToolbar();
            }
        });
    },

    ensureLayers() {
        if (!AppState.leafletMap) return;
        if (!this.layers.group) {
            this.layers.group = L.layerGroup().addTo(AppState.leafletMap);
        }
        // Gắn sự kiện chuột di chuyển trên bản đồ cho Dynamic Input & Rubberband
        if (!this._mapEventsBound && AppState.leafletMap) {
            AppState.leafletMap.on('mousemove', (e) => {
                if (this.isActive) {
                    this.handleMouseMove(e.latlng.lat, e.latlng.lng);
                }
            });
            AppState.leafletMap.on('mouseout', () => {
                this.clearDynamicHelpers();
            });
            this._mapEventsBound = true;
        }
    },

    openToolbar() {
        this.isActive = true;
        this.ensureLayers();
        const bar = document.getElementById('mapCadToolbar');
        if (bar) bar.style.display = 'flex';
        const toggleBtn = document.getElementById('btnToggleCadTool');
        if (toggleBtn) toggleBtn.classList.add('active');

        // Bật con trỏ chữ thập CAD trên bản đồ
        const mapContainer = document.getElementById('map-view-container');
        if (mapContainer) mapContainer.classList.add('cad-active-map');

        this.updateUi();
        showToast("📐 Chế độ Vẽ CAD Mini đã kích hoạt! Chạm bản đồ để dựng mốc (Phím: P, L, S, C, U, D, E)");
    },

    closeToolbar() {
        this.isActive = false;
        const bar = document.getElementById('mapCadToolbar');
        if (bar) bar.style.display = 'none';
        const toggleBtn = document.getElementById('btnToggleCadTool');
        if (toggleBtn) toggleBtn.classList.remove('active');

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
    },

    toggleToolbar() {
        if (this.isActive) {
            this.closeToolbar();
        } else {
            this.openToolbar();
        }
    },

    setMode(mode) {
        this.mode = mode;
        const btnPoly = document.getElementById('btnCadModePoly');
        const btnLine = document.getElementById('btnCadModeLine');
        const badge = document.getElementById('cadModeBadge');
        if (btnPoly && btnLine) {
            if (mode === 'polygon') {
                btnPoly.classList.add('active');
                btnLine.classList.remove('active');
                if (badge) badge.innerText = "Đa giác ranh";
                showToast("Chế độ: Đa giác khép kín [P]");
            } else {
                btnLine.classList.add('active');
                btnPoly.classList.remove('active');
                if (badge) badge.innerText = "Đường tim tuyến";
                showToast("Chế độ: Tuyến hở Polyline [L]");
            }
        }
        this.renderGeometry();
        this.updateUi();
    },

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
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

    findSnapCandidate(clickLat, clickLng) {
        if (!AppState.leafletMap) return null;
        const map = AppState.leafletMap;
        const clickPt = map.latLngToContainerPoint([clickLat, clickLng]);

        let bestCandidate = null;
        let minPixelDist = this.snapThresholdPx;

        // 1. Kiểm tra các mốc dự án hiện tại
        const projectPoints = appData.getPoints(AppState.currentProject) || [];
        projectPoints.forEach(p => {
            const pLat = parseFloat(p.lat);
            const pLng = parseFloat(p.lng);
            if (!isNaN(pLat) && !isNaN(pLng)) {
                const ptScreen = map.latLngToContainerPoint([pLat, pLng]);
                const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                if (d < minPixelDist) {
                    minPixelDist = d;
                    bestCandidate = {
                        lat: pLat,
                        lng: pLng,
                        x: parseFloat(p.x) || 0,
                        y: parseFloat(p.y) || 0,
                        h: parseFloat(p.h || p.z || 0),
                        name: p.name || 'Mốc',
                        isSnapped: true,
                        source: `Mốc dự án (${p.name || ''})`
                    };
                }
            }
        });

        // 2. Kiểm tra các đỉnh CAD đang vẽ
        this.vertices.forEach(v => {
            const ptScreen = map.latLngToContainerPoint([v.lat, v.lng]);
            const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
            if (d < minPixelDist) {
                minPixelDist = d;
                bestCandidate = {
                    lat: v.lat,
                    lng: v.lng,
                    x: v.x,
                    y: v.y,
                    h: v.h || 0,
                    name: v.name,
                    isSnapped: true,
                    source: `Đỉnh CAD (${v.name})`
                };
            }
        });

        // 3. Kiểm tra các đỉnh của các cấu trúc/thửa đã lưu trước đó
        this.savedShapes.forEach(shape => {
            shape.vertices.forEach(v => {
                const ptScreen = map.latLngToContainerPoint([v.lat, v.lng]);
                const d = Math.hypot(ptScreen.x - clickPt.x, ptScreen.y - clickPt.y);
                if (d < minPixelDist) {
                    minPixelDist = d;
                    bestCandidate = {
                        lat: v.lat,
                        lng: v.lng,
                        x: v.x,
                        y: v.y,
                        h: v.h || 0,
                        name: v.name,
                        isSnapped: true,
                        source: `${shape.shortName || 'Thửa'} - ${v.name}`
                    };
                }
            });
        });

        return bestCandidate;
    },

    // Xử lý di chuyển chuột: Hiển thị đường thun Rubberband & Dynamic Input Tooltip (AutoCAD F12)
    handleMouseMove(lat, lng) {
        if (!AppState.leafletMap || this.vertices.length === 0) {
            this.clearDynamicHelpers();
            return;
        }

        let targetLat = lat;
        let targetLng = lng;
        let targetName = null;

        // Kiểm tra bắt điểm Osnap theo thời gian thực
        if (this.snapEnabled) {
            const cand = this.findSnapCandidate(lat, lng);
            if (cand && cand.isSnapped) {
                targetLat = cand.lat;
                targetLng = cand.lng;
                targetName = cand.name;

                // Hiển thị ô vuông vàng Osnap tại điểm bắt
                const osnapIcon = L.divIcon({
                    className: '',
                    html: '<div class="cad-osnap-box" title="Snap: ' + cand.name + '"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                });
                if (!this.layers.osnapMarker) {
                    this.layers.osnapMarker = L.marker([targetLat, targetLng], { icon: osnapIcon, interactive: false, zIndexOffset: 3000 }).addTo(AppState.leafletMap);
                } else {
                    this.layers.osnapMarker.setLatLng([targetLat, targetLng]);
                    this.layers.osnapMarker.setIcon(osnapIcon);
                }
            } else if (this.layers.osnapMarker) {
                AppState.leafletMap.removeLayer(this.layers.osnapMarker);
                this.layers.osnapMarker = null;
            }
        }

        // Tính khoảng cách lẻ S và góc phương vị Az từ đỉnh cuối cùng
        const last = this.vertices[this.vertices.length - 1];
        const vn2k = convertWgsToVn2k(targetLat, targetLng, AppState.kttVal, AppState.scaleFactor);
        const dx = vn2k.X - last.x;
        const dy = vn2k.Y - last.y;
        const dist = Math.hypot(dx, dy);
        const azInfo = calculateDistanceAndAzimuth(last.x, last.y, vn2k.X, vn2k.Y);

        // 1. Cập nhật đường thun Rubberband Line
        const lineCoords = [[last.lat, last.lng], [targetLat, targetLng]];
        if (!this.layers.rubberbandLine) {
            this.layers.rubberbandLine = L.polyline(lineCoords, {
                color: '#38bdf8',
                weight: 1.5,
                dashArray: '5, 5',
                opacity: 0.85
            }).addTo(AppState.leafletMap);
        } else {
            this.layers.rubberbandLine.setLatLngs(lineCoords);
        }

        // 2. Cập nhật Dynamic Input Tooltip chạy theo con trỏ chuột
        const snapLabel = targetName ? ` <span style="color:#fbbf24;">🧲 [${targetName}]</span>` : '';
        const tooltipHtml = `
            <div class="cad-dynamic-tooltip">
                <b>📏 S: ${dist.toFixed(2)}m</b> • Az: ${azInfo.dDeg}°${String(azInfo.dMin).padStart(2,'0')}'${snapLabel}
            </div>
        `;
        const tipIcon = L.divIcon({
            className: '',
            html: tooltipHtml,
            iconSize: [160, 24],
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
        this.ensureLayers();
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
                const ptClick = map.latLngToContainerPoint([lat, lng]);
                if (Math.hypot(ptFirst.x - ptClick.x, ptFirst.y - ptClick.y) <= this.snapThresholdPx) {
                    this.closeLoop();
                    return;
                }
            }
            this.addVertex(candidate.lat, candidate.lng, candidate.name, true, candidate.source, candidate.x, candidate.y, candidate.h);
            showToast(`🧲 Đã hít (Snap) vào: ${candidate.name}`);
        } else {
            const nextIdx = this.vertices.length + 1;
            this.addVertex(lat, lng, `Đ${nextIdx}`, false, null);
        }
    },

    addVertex(lat, lng, name, isSnapped = false, snapSource = null, explicitX = null, explicitY = null, explicitH = 0) {
        let x = explicitX;
        let y = explicitY;
        if (x === null || y === null || isNaN(x) || isNaN(y)) {
            const vn2k = convertWgsToVn2k(lat, lng, AppState.kttVal, AppState.scaleFactor);
            x = vn2k.X;
            y = vn2k.Y;
        }

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
        if (this.vertices.length < 2) {
            showToast("⚠️ Cần tối thiểu 2 đỉnh để lưu cấu trúc trước khi tạo mới!", true);
            return;
        }
        const stats = this.calculateAreaAndPerimeter();
        const idx = this.savedShapes.length + 1;
        const isPoly = (this.mode === 'polygon' && this.vertices.length >= 3);
        const shapeName = `Cấu trúc ${idx}` + (isPoly ? ` (${stats.areaFormatted} m²)` : ` (${stats.perimeterFormatted} m)`);
        const color = this.palette[(idx - 1) % this.palette.length];

        this.savedShapes.push({
            id: 'shape_' + Date.now(),
            name: shapeName,
            shortName: `Thửa ${idx}`,
            mode: this.mode,
            vertices: [...this.vertices],
            stats: stats,
            color: color
        });

        this.vertices = [];
        this.renderGeometry();
        this.updateUi();
        triggerHaptic('success');
        showToast(`✅ Đã lưu [${shapeName}]! Bây giờ bạn có thể bắt đầu chấm vẽ cấu trúc tiếp theo.`);
    },

    clearDrawing() {
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

    calculateAreaAndPerimeter() {
        const pts = this.vertices;
        const n = pts.length;
        if (n < 2) {
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

        let sumArea = 0;
        let perimeter = 0;
        const edges = [];
        const isClosed = (this.mode === 'polygon' && n >= 3);
        const segmentCount = isClosed ? n : n - 1;

        for (let i = 0; i < segmentCount; i++) {
            const cur = pts[i];
            const next = pts[(i + 1) % n];

            if (isClosed) {
                // Công thức giải tích Gauss Shoelace
                sumArea += (cur.x * next.y - next.x * cur.y);
            }

            const dx = next.x - cur.x;
            const dy = next.y - cur.y;
            const length = Math.hypot(dx, dy);
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

    renderGeometry() {
        this.ensureLayers();
        if (!this.layers.group) return;
        this.layers.group.clearLayers();

        // 0. Vẽ tất cả các cấu trúc / thửa đã lưu trước đó
        this.savedShapes.forEach((shape, sIdx) => {
            const sVerts = shape.vertices;
            const sLen = sVerts.length;
            if (sLen === 0) return;
            const sLatLngs = sVerts.map(v => [v.lat, v.lng]);
            const sColor = shape.color || '#10b981';

            if (shape.mode === 'polygon' && sLen >= 3) {
                L.polygon(sLatLngs, {
                    color: sColor,
                    weight: 2.5,
                    fillColor: sColor,
                    fillOpacity: 0.18,
                    lineJoin: 'round'
                }).addTo(this.layers.group);

                // Nhãn tâm thửa đất
                const cLat = sVerts.reduce((a, b) => a + b.lat, 0) / sLen;
                const cLng = sVerts.reduce((a, b) => a + b.lng, 0) / sLen;
                const centerHtml = `<div class="cad-center-badge" style="background: rgba(15, 23, 42, 0.88); border: 1.5px solid ${sColor}; color: #ffffff;">
                    <div style="font-weight: 800; font-size: 11px; color: ${sColor};">${shape.shortName || `Thửa ${sIdx + 1}`}</div>
                    <div style="font-weight: 700; font-size: 10px;">${shape.stats?.areaFormatted || 0} m²</div>
                </div>`;
                const centerIcon = L.divIcon({ className: '', html: centerHtml, iconSize: [90, 36], iconAnchor: [45, 18] });
                L.marker([cLat, cLng], { icon: centerIcon, interactive: false, zIndexOffset: 2300 }).addTo(this.layers.group);
            } else if (sLen >= 2) {
                L.polyline(sLatLngs, {
                    color: sColor,
                    weight: 2.5,
                    dashArray: '4, 4',
                    lineJoin: 'round'
                }).addTo(this.layers.group);
            }

            // Đỉnh của cấu trúc đã lưu
            sVerts.forEach((v, vIdx) => {
                const iconHtml = `<div class="cad-vertex-badge" style="background: ${sColor}; border-color: #ffffff; width: 18px; height: 18px; font-size: 9px; line-height: 18px;" title="${shape.shortName} - ${v.name}">${v.name}</div>`;
                const icon = L.divIcon({ className: '', html: iconHtml, iconSize: [18, 18], iconAnchor: [9, 9] });
                const marker = L.marker([v.lat, v.lng], { icon, zIndexOffset: 2450 }).addTo(this.layers.group);
                marker.bindPopup(`
                    <div style="font-family: -apple-system, sans-serif; font-size: 12px; line-height: 1.5; min-width: 170px;">
                        <b style="color: ${sColor}; font-size: 13px;">📍 ${shape.shortName} - ${v.name}</b>
                        <div style="color: #334155; margin-top: 3px;">• <b>X:</b> ${v.x.toFixed(3)} m</div>
                        <div style="color: #334155;">• <b>Y:</b> ${v.y.toFixed(3)} m</div>
                    </div>
                `);
            });
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
        if (n >= 2) {
            if (this.mode === 'polygon' && n >= 3) {
                this.layers.shape = L.polygon(latlngs, {
                    color: isSelfIntersecting ? '#ef4444' : '#06b6d4',
                    weight: 3,
                    dashArray: isSelfIntersecting ? '6, 4' : null,
                    fillColor: isSelfIntersecting ? '#f87171' : '#38bdf8',
                    fillOpacity: isSelfIntersecting ? 0.35 : 0.22,
                    lineJoin: 'round'
                }).addTo(this.layers.group);
            } else {
                this.layers.shape = L.polyline(latlngs, {
                    color: '#06b6d4',
                    weight: 3,
                    dashArray: '6, 6',
                    lineJoin: 'round'
                }).addTo(this.layers.group);
            }
        }

        // 2. Vẽ marker tại các đỉnh kèm nhãn Đ1, Đ2...
        this.vertices.forEach((v, idx) => {
            const iconHtml = `<div class="cad-vertex-badge" title="${v.name} (X: ${v.x.toFixed(3)}, Y: ${v.y.toFixed(3)})">${v.name}</div>`;
            const icon = L.divIcon({
                className: '',
                html: iconHtml,
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            const marker = L.marker([v.lat, v.lng], { icon, zIndexOffset: 2500 }).addTo(this.layers.group);
            marker.bindPopup(`
                <div style="font-family: -apple-system, sans-serif; font-size: 12px; line-height: 1.5; min-width: 170px;">
                    <b style="color: #0284c7; font-size: 13px;">📍 ${v.name}</b>
                    <div style="color: #334155; margin-top: 3px;">• <b>X:</b> ${v.x.toFixed(3)} m</div>
                    <div style="color: #334155;">• <b>Y:</b> ${v.y.toFixed(3)} m</div>
                    ${v.isSnapped ? `<div style="color: #d97706; font-size: 11px;">🧲 ${v.snapSource || 'Hít mốc'}</div>` : ''}
                </div>
            `);
        });

        // 3. Hiển thị nhãn kích thước cạnh (m)
        const stats = this.calculateAreaAndPerimeter();
        stats.edges.forEach((edge, idx) => {
            const cur = this.vertices[idx];
            const next = this.vertices[(idx + 1) % n];
            const midLat = (cur.lat + next.lat) / 2;
            const midLng = (cur.lng + next.lng) / 2;

            const labelHtml = `<div class="cad-edge-badge">${edge.lengthFormatted}m</div>`;
            const labelIcon = L.divIcon({
                className: '',
                html: labelHtml,
                iconSize: [40, 16],
                iconAnchor: [20, 8]
            });
            L.marker([midLat, midLng], { icon: labelIcon, interactive: false, zIndexOffset: 2400 }).addTo(this.layers.group);
        });

        // 4. Nếu là đa giác khép kín >= 3 đỉnh: hiển thị badge diện tích tại tâm đa giác
        if (this.mode === 'polygon' && n >= 3) {
            const centerLat = latlngs.reduce((sum, p) => sum + p[0], 0) / n;
            const centerLng = latlngs.reduce((sum, p) => sum + p[1], 0) / n;

            const warningMsg = isSelfIntersecting ? '<div style="color:#ef4444; font-size:9px;">⚠️ Đa giác tự cắt chéo!</div>' : '';
            const badgeHtml = `
                <div class="cad-center-badge">
                    <div>📐 <b>S = ${stats.areaFormatted} m²</b></div>
                    <div style="font-size: 9.5px; opacity: 0.9; margin-top: 1px;">(${stats.haFormatted} ha • P = ${stats.perimeterFormatted} m)</div>
                    ${warningMsg}
                </div>
            `;
            const badgeIcon = L.divIcon({
                className: '',
                html: badgeHtml,
                iconSize: [140, 36],
                iconAnchor: [70, 18]
            });
            L.marker([centerLat, centerLng], { icon: badgeIcon, interactive: false, zIndexOffset: 2300 }).addTo(this.layers.group);
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

    openAreaTableModal() {
        const allShapes = [];
        this.savedShapes.forEach((s, idx) => {
            allShapes.push({
                id: s.id,
                name: s.name,
                shortName: s.shortName || `Thửa ${idx + 1}`,
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
                            <td style="font-weight: 700; color: #38bdf8;">${v.name}</td>
                            <td>${(v.x || 0).toFixed(3)}</td>
                            <td>${(v.y || 0).toFixed(3)}</td>
                            <td style="color: #6ee7b7; font-weight: 600;">${edgeLenStr}</td>
                            <td style="color: #cbd5e1;">${azStr}</td>
                            <td style="font-size: 10px;">${noteStr}</td>
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

        const modal = document.getElementById('modalCadAreaTable');
        if (modal) modal.style.display = 'flex';
    },

    closeAreaTableModal() {
        const modal = document.getElementById('modalCadAreaTable');
        if (modal) modal.style.display = 'none';
    },

    exportAreaCsv() {
        const allShapes = [];
        this.savedShapes.forEach((s, idx) => {
            allShapes.push({
                name: s.name,
                shortName: s.shortName || `Thửa ${idx + 1}`,
                mode: s.mode,
                vertices: s.vertices,
                stats: s.stats,
                color: s.color || '#10b981'
            });
        });
        if (this.vertices.length >= 2) {
            allShapes.push({
                name: `Cấu trúc ${allShapes.length + 1} (Đang vẽ)`,
                shortName: `Thửa ${allShapes.length + 1}`,
                mode: this.mode,
                vertices: [...this.vertices],
                stats: this.calculateAreaAndPerimeter(),
                color: '#06b6d4'
            });
        }

        if (allShapes.length === 0) {
            showToast("⚠️ Chưa có dữ liệu để xuất bảng diện tích!", true);
            return;
        }

        const projName = AppState.currentProject ? AppState.currentProject.replace(/\.[^/.]+$/, "") : "Project";
        const totalArea = allShapes.reduce((sum, s) => sum + (s.stats?.area || 0), 0);
        const totalHa = totalArea / 10000.0;
        const totalPerimeter = allShapes.reduce((sum, s) => sum + (s.stats?.perimeter || 0), 0);
        const totalVertices = allShapes.reduce((sum, s) => sum + s.vertices.length, 0);

        let csv = "\uFEFF"; // UTF-8 BOM
        csv += `BẢNG KÊ TỌA ĐỘ RANH & DIỆN TÍCH MẶT BẰNG CÔNG TRÌNH\n`;
        csv += `Dự án;${projName};Tổng số cấu trúc/thửa;${allShapes.length}\n`;
        csv += `Hệ tọa độ;VN-2000 (${AppState.provinceName || 'Tỉnh'});KTT;${AppState.kttDeg}°${String(AppState.kttMin).padStart(2,'0')}' (Múi ${AppState.muiVal || 3}°)\n`;
        csv += `Ngày giờ xuất;${new Date().toLocaleString('vi-VN')}\n`;
        csv += `Tổng số đỉnh;${totalVertices};Tổng chu vi [m];${totalPerimeter.toFixed(3)};Tổng diện tích [m2];${totalArea.toFixed(2)};Tổng diện tích [ha];${totalHa.toFixed(4)}\n\n`;

        allShapes.forEach((shape) => {
            csv += `--- ${shape.name.toUpperCase()} ---\n`;
            csv += `STT;Tên Đỉnh;Tọa độ X [m];Tọa độ Y [m];Cạnh kế [m];Góc phương vị (Az);Vĩ độ WGS84;Kinh độ WGS84;Ghi chú\n`;
            shape.vertices.forEach((v, idx) => {
                const edge = shape.stats?.edges ? shape.stats.edges[idx] : null;
                const edgeLen = edge ? edge.length.toFixed(3) : '';
                const azStr = edge ? edge.azFormatted : '';
                csv += `${idx + 1};${v.name};${(v.x || 0).toFixed(3)};${(v.y || 0).toFixed(3)};${edgeLen};${azStr};${(v.lat || 0).toFixed(7)};${(v.lng || 0).toFixed(7)};${v.isSnapped ? v.snapSource : 'Vẽ tự do'}\n`;
            });
            if (shape.mode === 'polygon' && shape.vertices.length >= 3) {
                csv += `Tiểu kế ${shape.shortName};;Diện tích [m2];${(shape.stats?.area || 0).toFixed(2)};Diện tích [ha];${(shape.stats?.ha || 0).toFixed(4)};Chu vi [m];${(shape.stats?.perimeter || 0).toFixed(3)};;\n\n`;
            } else {
                csv += `Tiểu kế ${shape.shortName};;Chiều dài tuyến [m];${(shape.stats?.perimeter || 0).toFixed(3)};;;;;;\n\n`;
            }
        });

        if (allShapes.length > 1) {
            csv += `TỔNG CỘNG TOÀN BỘ BẢN VẼ;;;;;;;;\n`;
            csv += `Tổng diện tích;;${totalArea.toFixed(2)} m2;;;;;;\n`;
            csv += `Quy đổi Hecta;;${totalHa.toFixed(4)} ha;;;;;;\n`;
            csv += `Tổng chu vi;;${totalPerimeter.toFixed(3)} m;;;;;;\n`;
        }

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `${projName}_Bang_Dien_Tich_Toa_Do.csv`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`✓ Đã xuất bảng diện tích Excel (${allShapes.length} cấu trúc): ${filename}`);
    },

    copyTableToClipboard() {
        const allShapes = [];
        this.savedShapes.forEach((s, idx) => {
            allShapes.push({ name: s.name, shortName: s.shortName || `Thửa ${idx+1}`, mode: s.mode, vertices: s.vertices, stats: s.stats });
        });
        if (this.vertices.length >= 2) {
            allShapes.push({ name: `Đang vẽ`, shortName: `Đang vẽ`, mode: this.mode, vertices: [...this.vertices], stats: this.calculateAreaAndPerimeter() });
        }
        if (allShapes.length === 0) return;

        let text = `BẢNG KÊ TỌA ĐỘ RANH & DIỆN TÍCH - ${AppState.currentProject}\n`;
        allShapes.forEach(shape => {
            text += `\n[${shape.name}]\nSTT\tTên Đỉnh\tX (Bắc)\tY (Đông)\tCạnh (m)\tPhương vị\n`;
            shape.vertices.forEach((v, idx) => {
                const edge = shape.stats?.edges ? shape.stats.edges[idx] : null;
                text += `${idx + 1}\t${v.name}\t${(v.x || 0).toFixed(3)}\t${(v.y || 0).toFixed(3)}\t${edge ? edge.lengthFormatted : '--'}\t${edge ? edge.azFormatted : '--'}\n`;
            });
            if (shape.mode === 'polygon' && shape.vertices.length >= 3) {
                text += `Diện tích: ${shape.stats?.areaFormatted || 0} m² (${shape.stats?.haFormatted || 0} ha) - Chu vi: ${shape.stats?.perimeterFormatted || 0} m\n`;
            }
        });

        navigator.clipboard.writeText(text).then(() => {
            showToast("✓ Đã sao chép bảng tọa độ vào Clipboard (dán trực tiếp vào Excel/Word)!");
        }).catch(() => {
            showToast("⚠️ Không thể sao chép tự động!", true);
        });
    },

    // Xuất bản vẽ AutoCAD R12 DXF chuẩn TCVN có Bảng kê tọa độ và Khung tên A3 bên cạnh thửa đất (Hỗ trợ đa đối tượng)
    exportDxf() {
        const allShapes = [...(this.savedShapes || [])];
        if (this.vertices && this.vertices.length >= 2) {
            allShapes.push({
                id: 'active_draft',
                name: `Cấu trúc ${allShapes.length + 1} (Đang vẽ)`,
                mode: this.mode,
                vertices: [...this.vertices],
                stats: this.calculateAreaAndPerimeter(),
                color: this.color
            });
        }

        if (allShapes.length === 0) {
            showToast("⚠️ Cần tối thiểu 2 đỉnh hoặc 1 đối tượng đã lưu để xuất bản vẽ AutoCAD DXF!", true);
            return;
        }

        const projName = AppState.currentProject.replace(/\.[^/.]+$/, "");

        // Khởi tạo cấu trúc file AutoCAD Release 12 DXF chuẩn TCVN
        let dxf = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
        dxf += "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n";
        dxf += "0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n";
        dxf += "0\nLAYER\n2\nCAD_RANH_THUA\n70\n0\n62\n4\n6\nCONTINUOUS\n"; // Cyan (Nét biên ranh)
        dxf += "0\nLAYER\n2\nCAD_DINH_MOC\n70\n0\n62\n1\n6\nCONTINUOUS\n";  // Red (Điểm đỉnh mốc)
        dxf += "0\nLAYER\n2\nCAD_TEXT_DINH\n70\n0\n62\n3\n6\nCONTINUOUS\n"; // Green (Tên mốc Đ1, Đ2...)
        dxf += "0\nLAYER\n2\nCAD_KICH_THUOC\n70\n0\n62\n2\n6\nCONTINUOUS\n"; // Yellow (Kích thước cạnh)
        dxf += "0\nLAYER\n2\nCAD_DIEN_TICH\n70\n0\n62\n6\n6\nCONTINUOUS\n"; // Magenta (Diện tích & Chu vi)
        dxf += "0\nLAYER\n2\nCAD_BANG_TOADO\n70\n0\n62\n7\n6\nCONTINUOUS\n"; // White (Khung kẻ bảng kê)
        dxf += "0\nLAYER\n2\nCAD_TEXT_BANG\n70\n0\n62\n3\n6\nCONTINUOUS\n";  // Green (Chữ số liệu bảng kê)
        dxf += "0\nLAYER\n2\nCAD_KHUNG_TEN\n70\n0\n62\n4\n6\nCONTINUOUS\n";  // Cyan (Khung tên bản vẽ)
        dxf += "0\nENDTAB\n0\nENDSEC\n";
        dxf += "0\nSECTION\n2\nENTITIES\n";

        // Tính Bounding Box toàn cục của tất cả các đối tượng để đặt Bảng kê & Khung tên
        let minCadX = Infinity, maxCadX = -Infinity;
        let minCadY = Infinity, maxCadY = -Infinity;

        allShapes.forEach(shape => {
            shape.vertices.forEach(p => {
                const cx = p.y; // VN2000 Y = CAD X (Easting)
                const cy = p.x; // VN2000 X = CAD Y (Northing)
                if (cx < minCadX) minCadX = cx;
                if (cx > maxCadX) maxCadX = cx;
                if (cy < minCadY) minCadY = cy;
                if (cy > maxCadY) maxCadY = cy;
            });
        });

        // 1. VẼ CÁC ĐỐI TƯỢNG (POLYLINE, VERTEX, KÍCH THƯỚC, DIỆN TÍCH)
        allShapes.forEach((shape) => {
            const pts = shape.vertices;
            const n = pts.length;
            const isClosed = (shape.mode === 'polygon' && n >= 3);
            const stats = shape.stats || this.calculateAreaAndPerimeter();

            // POLYLINE
            dxf += "0\nPOLYLINE\n8\nCAD_RANH_THUA\n66\n1\n";
            dxf += `70\n${isClosed ? 1 : 0}\n`;
            pts.forEach(p => {
                const cadX = p.y;
                const cadY = p.x;
                const cadZ = p.h || 0;
                dxf += `0\nVERTEX\n8\nCAD_RANH_THUA\n10\n${cadX.toFixed(3)}\n20\n${cadY.toFixed(3)}\n30\n${cadZ.toFixed(3)}\n`;
            });
            dxf += "0\nSEQEND\n";

            // VERTICES & LABELS
            pts.forEach((p, idx) => {
                const cadX = p.y;
                const cadY = p.x;
                const cadZ = p.h || 0;
                dxf += `0\nPOINT\n8\nCAD_DINH_MOC\n10\n${cadX.toFixed(3)}\n20\n${cadY.toFixed(3)}\n30\n${cadZ.toFixed(3)}\n`;
                dxf += `0\nCIRCLE\n8\nCAD_DINH_MOC\n10\n${cadX.toFixed(3)}\n20\n${cadY.toFixed(3)}\n30\n${cadZ.toFixed(3)}\n40\n0.6\n`;
                const cleanName = (p.name || `D${idx+1}`).replace(/[\r\n]/g, '');
                dxf += `0\nTEXT\n8\nCAD_TEXT_DINH\n10\n${(cadX + 0.8).toFixed(3)}\n20\n${(cadY + 0.8).toFixed(3)}\n30\n${cadZ.toFixed(3)}\n40\n1.8\n1\n${cleanName}\n`;
            });

            // EDGES & AZIMUTH
            if (stats.edges) {
                stats.edges.forEach((edge, idx) => {
                    const p1 = pts[idx];
                    const p2 = pts[(idx + 1) % n];
                    const midCadX = (p1.y + p2.y) / 2;
                    const midCadY = (p1.x + p2.x) / 2;

                    const dCadX = p2.y - p1.y;
                    const dCadY = p2.x - p1.x;
                    const len = Math.hypot(dCadX, dCadY);
                    let angDeg = Math.atan2(dCadY, dCadX) * (180.0 / Math.PI);
                    if (angDeg < 0) angDeg += 360;

                    const offDist = 0.8;
                    const perpX = (-dCadY / (len || 1)) * offDist;
                    const perpY = (dCadX / (len || 1)) * offDist;

                    let textRot = angDeg;
                    if (angDeg > 90 && angDeg < 270) {
                        textRot = (angDeg + 180) % 360;
                    }

                    const textPosX = midCadX + perpX;
                    const textPosY = midCadY + perpY;

                    dxf += `0\nTEXT\n8\nCAD_KICH_THUOC\n10\n${textPosX.toFixed(3)}\n20\n${textPosY.toFixed(3)}\n30\n0.0\n40\n1.4\n50\n${textRot.toFixed(2)}\n1\n${edge.lengthFormatted}m\n`;
                });
            }

            // CENTROID TEXT NẾU LÀ ĐA GIÁC
            if (isClosed && stats.area > 0) {
                let cX = 0, cY = 0;
                pts.forEach(p => { cX += p.y; cY += p.x; });
                cX /= n; cY /= n;
                dxf += `0\nTEXT\n8\nCAD_DIEN_TICH\n10\n${cX.toFixed(3)}\n20\n${(cY + 2.0).toFixed(3)}\n30\n0.0\n40\n1.8\n1\n[${shape.name}]\n`;
                dxf += `0\nTEXT\n8\nCAD_DIEN_TICH\n10\n${cX.toFixed(3)}\n20\n${cY.toFixed(3)}\n30\n0.0\n40\n2.0\n1\nS = ${stats.areaFormatted} m2\n`;
                dxf += `0\nTEXT\n8\nCAD_DIEN_TICH\n10\n${cX.toFixed(3)}\n20\n${(cY - 1.8).toFixed(3)}\n30\n0.0\n40\n1.5\n1\nP = ${stats.perimeterFormatted} m\n`;
            }
        });

        // 2. BẢNG KÊ TỌA ĐỘ TỔNG HỢP CÁC CẤU TRÚC (TỰ ĐỘNG BỐ TRÍ BÊN PHẢI)
        const tableX0 = maxCadX + 15.0;
        let curTableY = maxCadY;
        const colW = [10.0, 16.0, 24.0, 24.0, 18.0, 20.0]; // STT, Đỉnh, X, Y, Cạnh, Phương vị
        const totalW = colW.reduce((a, b) => a + b, 0);
        const rowH = 3.6;

        // Tiêu đề bảng
        dxf += `0\nTEXT\n8\nCAD_TEXT_BANG\n10\n${(tableX0 + totalW / 2 - 25).toFixed(3)}\n20\n${(curTableY + 4).toFixed(3)}\n30\n0.0\n40\n2.2\n1\nBANG KE TOA DO & KICH THUOC RANG THUA (TCVN)\n`;

        allShapes.forEach((shape) => {
            const pts = shape.vertices;
            const n = pts.length;
            const stats = shape.stats || this.calculateAreaAndPerimeter();

            // Dòng phân cách tên đối tượng
            curTableY -= 2.0;
            dxf += `0\nLINE\n8\nCAD_BANG_TOADO\n10\n${tableX0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
            dxf += `0\nTEXT\n8\nCAD_TEXT_BANG\n10\n${(tableX0 + 2.0).toFixed(3)}\n20\n${(curTableY - 2.4).toFixed(3)}\n30\n0.0\n40\n1.5\n1\n${shape.name.toUpperCase()} (${shape.mode === 'polygon' ? `S = ${stats.areaFormatted} m2, P = ${stats.perimeterFormatted} m` : `L = ${stats.perimeterFormatted} m`})\n`;
            curTableY -= rowH;

            // Tiêu đề cột
            const tableTopY = curTableY;
            dxf += `0\nLINE\n8\nCAD_BANG_TOADO\n10\n${tableX0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

            const headers = ["STT", "Ten moc", "X (Bac) [m]", "Y (Dong) [m]", "Canh (m)", "Phuong vi"];
            let hX = tableX0;
            headers.forEach((h, idx) => {
                dxf += `0\nTEXT\n8\nCAD_TEXT_BANG\n10\n${(hX + 1.5).toFixed(3)}\n20\n${(curTableY - 2.5).toFixed(3)}\n30\n0.0\n40\n1.3\n1\n${h}\n`;
                hX += colW[idx];
            });

            curTableY -= rowH;
            dxf += `0\nLINE\n8\nCAD_BANG_TOADO\n10\n${tableX0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;

            // Dữ liệu từng đỉnh
            pts.forEach((p, idx) => {
                const edge = stats.edges ? stats.edges[idx] : null;
                const edgeStr = edge ? edge.lengthFormatted : '--';
                const azStr = edge ? `${edge.azimuth.toFixed(1)} deg` : '--';
                const cleanName = (p.name || `D${idx + 1}`).replace(/[\r\n]/g, '');

                const rowData = [
                    String(idx + 1),
                    cleanName,
                    p.x.toFixed(3),
                    p.y.toFixed(3),
                    edgeStr,
                    azStr
                ];

                let rX = tableX0;
                rowData.forEach((val, cIdx) => {
                    dxf += `0\nTEXT\n8\nCAD_TEXT_BANG\n10\n${(rX + 1.2).toFixed(3)}\n20\n${(curTableY - 2.5).toFixed(3)}\n30\n0.0\n40\n1.2\n1\n${val}\n`;
                    rX += colW[cIdx];
                });

                curTableY -= rowH;
                dxf += `0\nLINE\n8\nCAD_BANG_TOADO\n10\n${tableX0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
            });

            // Kẻ các đường dọc của bảng
            const tableBottomY = curTableY;
            let vLineX = tableX0;
            dxf += `0\nLINE\n8\nCAD_BANG_TOADO\n10\n${vLineX.toFixed(3)}\n20\n${tableTopY.toFixed(3)}\n30\n0.0\n11\n${vLineX.toFixed(3)}\n21\n${tableBottomY.toFixed(3)}\n31\n0.0\n`;
            colW.forEach(w => {
                vLineX += w;
                dxf += `0\nLINE\n8\nCAD_BANG_TOADO\n10\n${vLineX.toFixed(3)}\n20\n${tableTopY.toFixed(3)}\n30\n0.0\n11\n${vLineX.toFixed(3)}\n21\n${tableBottomY.toFixed(3)}\n31\n0.0\n`;
            });

            curTableY -= 2.0;
        });

        // 3. KHUNG TÊN DỰ ÁN (TITLE BLOCK TCVN) PHÍA DƯỚI BẢNG KÊ
        curTableY -= 2.0;
        const titleBoxH = 15.0;
        dxf += `0\nLINE\n8\nCAD_KHUNG_TEN\n10\n${tableX0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${curTableY.toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nCAD_KHUNG_TEN\n10\n${tableX0.toFixed(3)}\n20\n${(curTableY - titleBoxH).toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${(curTableY - titleBoxH).toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nCAD_KHUNG_TEN\n10\n${tableX0.toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${tableX0.toFixed(3)}\n21\n${(curTableY - titleBoxH).toFixed(3)}\n31\n0.0\n`;
        dxf += `0\nLINE\n8\nCAD_KHUNG_TEN\n10\n${(tableX0 + totalW).toFixed(3)}\n20\n${curTableY.toFixed(3)}\n30\n0.0\n11\n${(tableX0 + totalW).toFixed(3)}\n21\n${(curTableY - titleBoxH).toFixed(3)}\n31\n0.0\n`;

        // Thông tin trong Khung tên
        dxf += `0\nTEXT\n8\nCAD_KHUNG_TEN\n10\n${(tableX0 + 2.0).toFixed(3)}\n20\n${(curTableY - 3.2).toFixed(3)}\n30\n0.0\n40\n1.8\n1\nDU AN: ${projName}\n`;
        dxf += `0\nTEXT\n8\nCAD_KHUNG_TEN\n10\n${(tableX0 + 2.0).toFixed(3)}\n20\n${(curTableY - 6.2).toFixed(3)}\n30\n0.0\n40\n1.4\n1\nHE TOA DO: VN-2000 (${AppState.provinceName || 'Tinh'}) - KTT: ${AppState.kttDeg}d${String(AppState.kttMin).padStart(2,'0')}\'\n`;
        dxf += `0\nTEXT\n8\nCAD_KHUNG_TEN\n10\n${(tableX0 + 2.0).toFixed(3)}\n20\n${(curTableY - 9.2).toFixed(3)}\n30\n0.0\n40\n1.5\n1\nTONG SO CAU TRUC / DOI TUONG CAD: ${allShapes.length}\n`;
        dxf += `0\nTEXT\n8\nCAD_KHUNG_TEN\n10\n${(tableX0 + 2.0).toFixed(3)}\n20\n${(curTableY - 12.2).toFixed(3)}\n30\n0.0\n40\n1.2\n1\nNGAY XUAT: ${new Date().toLocaleDateString('vi-VN')} - PHAN MEM VN2000-PWA PRO v2.5.7\n`;

        dxf += "0\nENDSEC\n0\nEOF\n";

        const blob = new Blob([dxf], { type: "application/dxf;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `${projName}_MatBang_CAD.dxf`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`✓ Đã xuất file AutoCAD DXF: ${filename} (${allShapes.length} đối tượng kèm Bảng kê & Khung tên)`);
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
    appNav.updateBanner();


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
}
