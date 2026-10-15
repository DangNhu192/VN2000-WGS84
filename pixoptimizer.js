/**
 * PIXOPTIMIZER CLIENT-SIDE ENGINE FOR VN2000-PWA
 * Tham chiếu kiến trúc: vigdigital/vig-pixoptimizer (VIG Digital)
 * 100% Client-Side In-Browser Optimization (WebP / JPEG / PNG)
 * Tối ưu hóa xuất bản vẽ MiniCAD & Bộ nhớ đệm Bản đồ vệ tinh không giật lag.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.PixOptimizer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const SETTINGS_KEY = 'vn2k_pixoptimizer_settings_v1';

    const DEFAULT_SETTINGS = {
        format: 'webp',            // 'webp' | 'jpeg' | 'png'
        qualityPreset: 'balanced', // 'high' (0.90) | 'balanced' (0.80) | 'light' (0.65)
        maxEdge: 2048,            // 3840 | 2048 | 1440
        smoothMap: true,          // Bật tải bản đồ mượt mà (updateWhenIdle, keepBuffer = 3)
        mapEnhanceMode: 'gaussian_hd', // 'gaussian_hd' | 'contrast' | 'natural' | 'none'
        highResTiles: false,      // Nạp tile Google scale=2x siêu nét Retina
        compressOfflineTiles: true
    };

    const QUALITY_MAP = {
        high: 0.90,
        balanced: 0.80,
        light: 0.65
    };

    const PixOptimizer = {
        settings: { ...DEFAULT_SETTINGS },

        init() {
            this.loadSettings();
        },

        loadSettings() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const raw = localStorage.getItem(SETTINGS_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
                    }
                }
            } catch (e) {
                console.warn('[PixOptimizer] Không thể nạp cài đặt từ localStorage:', e);
            }
            return this.settings;
        },

        saveSettings(newSettings = {}) {
            try {
                this.settings = { ...this.settings, ...newSettings };
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
                }
            } catch (e) {
                console.warn('[PixOptimizer] Không thể lưu cài đặt vào localStorage:', e);
            }
            return this.settings;
        },

        getQualityFloat(preset = null) {
            const p = preset || this.settings.qualityPreset || 'balanced';
            return QUALITY_MAP[p] !== undefined ? QUALITY_MAP[p] : 0.80;
        },

        getMimeType(fmt = null) {
            const f = (fmt || this.settings.format || 'webp').toLowerCase();
            if (f === 'jpeg' || f === 'jpg') return 'image/jpeg';
            if (f === 'png') return 'image/png';
            return 'image/webp';
        },

        getFileExtension(fmt = null) {
            const f = (fmt || this.settings.format || 'webp').toLowerCase();
            if (f === 'jpeg' || f === 'jpg') return 'jpg';
            if (f === 'png') return 'png';
            return 'webp';
        },

        /**
         * Kiểm tra trình duyệt có hỗ trợ xuất định dạng cụ thể qua Canvas toBlob/toDataURL không
         */
        isFormatSupported(format = 'webp') {
            if (typeof document === 'undefined') return true;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                const mime = this.getMimeType(format);
                const dataUrl = canvas.toDataURL(mime);
                return dataUrl.indexOf(`data:${mime}`) === 0;
            } catch (e) {
                return false;
            }
        },

        /**
         * Nén và thu nhỏ Canvas với thuật toán tối ưu hóa cạnh và chất lượng
         * @param {HTMLCanvasElement} sourceCanvas 
         * @param {Object} options { format, quality, maxEdge }
         * @returns {Promise<{ blob: Blob, dataUrl: string, width: number, height: number, originalBytes: number, compressedBytes: number, savedPercent: number, format: string, ext: string }>}
         */
        async compressCanvas(sourceCanvas, options = {}) {
            if (!sourceCanvas || !(sourceCanvas instanceof HTMLCanvasElement)) {
                throw new Error('[PixOptimizer] Nguồn canvas không hợp lệ!');
            }

            let format = options.format || this.settings.format || 'webp';
            // Fallback sang JPEG nếu WebP không được hỗ trợ trên thiết bị cũ
            if (format === 'webp' && !this.isFormatSupported('webp')) {
                format = 'jpeg';
            }

            const mime = this.getMimeType(format);
            const ext = this.getFileExtension(format);
            const maxEdge = options.maxEdge || this.settings.maxEdge || 2048;
            const quality = options.quality !== undefined ? options.quality : this.getQualityFloat(options.qualityPreset);

            let srcW = sourceCanvas.width;
            let srcH = sourceCanvas.height;
            let targetW = srcW;
            let targetH = srcH;

            // Downscale thông minh nếu vượt giới hạn maxEdge
            if (srcW > maxEdge || srcH > maxEdge) {
                if (srcW >= srcH) {
                    targetW = maxEdge;
                    targetH = Math.round((srcH * maxEdge) / srcW);
                } else {
                    targetH = maxEdge;
                    targetW = Math.round((srcW * maxEdge) / srcH);
                }
            }

            let exportCanvas = sourceCanvas;
            if (targetW !== srcW || targetH !== srcH) {
                exportCanvas = document.createElement('canvas');
                exportCanvas.width = targetW;
                exportCanvas.height = targetH;
                const ctx = exportCanvas.getContext('2d', { alpha: format === 'png' || format === 'webp' });
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);
            }

            // Ước tính dung lượng ảnh thô (RGBA 4 bytes/pixel)
            const estimatedRawBytes = targetW * targetH * 4;

            const blob = await new Promise((resolve, reject) => {
                exportCanvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('[PixOptimizer] Lỗi chuyển đổi Canvas sang Blob!'));
                }, mime, (format === 'png') ? undefined : quality);
            });

            const compressedBytes = blob.size;
            // Tính tỷ lệ tiết kiệm so với ước tính PNG/Raw
            const baselineBytes = (format === 'png') ? compressedBytes : Math.max(compressedBytes, Math.round(estimatedRawBytes * 0.35));
            const savedPercent = (baselineBytes > compressedBytes)
                ? Math.round(((baselineBytes - compressedBytes) / baselineBytes) * 100)
                : 0;

            return {
                blob,
                width: targetW,
                height: targetH,
                originalBytes: baselineBytes,
                compressedBytes,
                savedPercent,
                format,
                ext,
                mime
            };
        },

        /**
         * Cung cấp tùy chọn cấu hình tối ưu cho các lớp Leaflet tileLayer
         * Chống giật lag khi cuộn / pan, tải ảnh gốc native zoom 20 không bị kéo dãn vỡ hạt
         */
        getTileLayerOptions(custom = {}) {
            const isSmooth = this.settings.smoothMap !== false;
            // Nâng native zoom lên 20 (Google Maps tại VN hỗ trợ native tile đến zoom 20, chống phóng to cưỡng bức)
            const defaultNativeZoom = (custom && custom.maxNativeZoom !== undefined) ? custom.maxNativeZoom : 20;
            return {
                maxZoom: 24,
                maxNativeZoom: defaultNativeZoom,
                updateWhenIdle: isSmooth,         // Chỉ nạp tile khi người dùng dừng di chuyển
                updateWhenZooming: false,         // Giữ khung hình mượt mà khi zoom
                keepBuffer: isSmooth ? 3 : 6,     // Giảm từ 8 xuống 3 để tiết kiệm bộ nhớ RAM tile
                crossOrigin: true,
                ...custom
            };
        },

        /**
         * Cung cấp URL Template ảnh vệ tinh Google Hybrid
         * Tự động thêm &scale=2 khi bật nạp ô siêu nét Retina 2x hoặc màn hình High-DPI
         */
        getSatelliteUrlTemplate() {
            const isRetina = (typeof window !== 'undefined' && window.devicePixelRatio > 1.5);
            const useScale2 = this.settings.highResTiles || (this.settings.highResTiles !== false && isRetina);
            return useScale2 
                ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&scale=2'
                : 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        },

        /**
         * Gắn bộ lọc xử lý ảnh không gian & Gaussian Blur lên bản đồ Leaflet
         * Tự động kích hoạt khi phóng to sâu (zoom >= 19 tới 24)
         * Căn cứ tài liệu: lequocdien/XuLyHinhAnh & jrvansuita/GaussianBlur
         */
        applyMapEnhancement(map) {
            if (!map || !map.getContainer) return;
            const container = map.getContainer();
            if (!container) return;

            const updateClasses = () => {
                const zoom = (typeof map.getZoom === 'function') ? map.getZoom() : 0;
                const mode = this.settings.mapEnhanceMode || 'gaussian_hd';

                // Xóa các class trạng thái cũ
                container.classList.remove('map-deep-zoom-enhanced', 'map-enhance-gaussian', 'map-enhance-contrast', 'map-enhance-natural', 'map-enhance-none');

                if (mode === 'none') {
                    container.classList.add('map-enhance-none');
                    return;
                }

                if (zoom >= 19) {
                    container.classList.add('map-deep-zoom-enhanced');
                    if (mode === 'gaussian_hd') container.classList.add('map-enhance-gaussian');
                    else if (mode === 'contrast') container.classList.add('map-enhance-contrast');
                    else if (mode === 'natural') container.classList.add('map-enhance-natural');
                } else {
                    if (mode === 'contrast') container.classList.add('map-enhance-contrast');
                    else if (mode === 'natural') container.classList.add('map-enhance-natural');
                }
            };

            map.on('zoomend', updateClasses);
            updateClasses();

            if (!this._registeredMaps) this._registeredMaps = new Set();
            this._registeredMaps.add(map);
        },

        /**
         * Cập nhật tức thì tất cả bản đồ đang mở khi người dùng đổi cấu hình
         */
        updateAllRegisteredMaps() {
            if (!this._registeredMaps) return;
            for (const map of this._registeredMaps) {
                try {
                    if (map && map.getContainer && map.getContainer()) {
                        const zoom = (typeof map.getZoom === 'function') ? map.getZoom() : 0;
                        const mode = this.settings.mapEnhanceMode || 'gaussian_hd';
                        const container = map.getContainer();
                        container.classList.remove('map-deep-zoom-enhanced', 'map-enhance-gaussian', 'map-enhance-contrast', 'map-enhance-natural', 'map-enhance-none');
                        if (mode === 'none') {
                            container.classList.add('map-enhance-none');
                        } else if (zoom >= 19) {
                            container.classList.add('map-deep-zoom-enhanced');
                            if (mode === 'gaussian_hd') container.classList.add('map-enhance-gaussian');
                            else if (mode === 'contrast') container.classList.add('map-enhance-contrast');
                            else if (mode === 'natural') container.classList.add('map-enhance-natural');
                        }
                    }
                } catch (e) {
                    // Bỏ qua lỗi nếu map đã hủy
                }
            }
        },

        /**
         * Định dạng kích thước byte sang chuỗi hiển thị thân thiện (KB / MB)
         */
        formatBytes(bytes) {
            if (!bytes || bytes <= 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        },

        /**
         * Dọn dẹp bộ nhớ đệm tile bản đồ lưu ngoại vi trong Cache Storage
         */
        async clearTileCache() {
            if (typeof caches === 'undefined') return { success: false, message: 'Trình duyệt không hỗ trợ Cache Storage' };
            try {
                let deletedCount = 0;
                const cacheKeys = await caches.keys();
                for (const key of cacheKeys) {
                    const cache = await caches.open(key);
                    const requests = await cache.keys();
                    for (const req of requests) {
                        const url = req.url || '';
                        // Nhận diện URL ô bản đồ vệ tinh / OSM
                        if (url.includes('google.com/vt') || url.includes('openstreetmap.org') || url.includes('arcgisonline.com')) {
                            await cache.delete(req);
                            deletedCount++;
                        }
                    }
                }
                return {
                    success: true,
                    deletedCount,
                    message: `Đã dọn dẹp ${deletedCount} ô tile bản đồ trong bộ nhớ đệm!`
                };
            } catch (e) {
                console.error('[PixOptimizer] Lỗi khi dọn dẹp cache:', e);
                return { success: false, error: e.message };
            }
        }
    };

    PixOptimizer.init();
    return PixOptimizer;
}));
