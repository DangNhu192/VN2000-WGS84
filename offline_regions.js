/**
 * OFFLINE REGIONS & TILE CALCULATION ENGINE
 * Hệ thống định nghĩa Quốc gia, Tỉnh/Thành và tính toán Slippy Map Tiles
 * Chuẩn OGC / OpenStreetMap Slippy Map Tilenames
 */

if (typeof window === 'undefined') {
    var window = global;
}

window.OFFLINE_COUNTRIES = [
    { code: 'VN', name: 'Việt Nam 🇻🇳', flag: '🇻🇳', center: [16.047, 107.835], zoom: 6 },
    { code: 'LA', name: 'Lào 🇱🇦 (Laos)', flag: '🇱🇦', center: [18.0, 104.0], zoom: 6 },
    { code: 'KH', name: 'Campuchia 🇰🇭 (Cambodia)', flag: '🇰🇭', center: [12.5, 105.0], zoom: 7 },
    { code: 'TH', name: 'Thái Lan 🇹🇭 (Thailand)', flag: '🇹🇭', center: [15.0, 101.0], zoom: 6 },
    { code: 'CURRENT', name: '📍 Khu vực trạm đứng hiện tại (GPS)', flag: '📍', center: null, zoom: 16 }
];

window.OFFLINE_PROVINCES = [
    // --- VIỆT NAM (ĐỒNG BẰNG SÔNG CỬU LONG & ĐÔNG NAM BỘ) ---
    { country: 'VN', id: 'dong_thap', name: 'Đồng Tháp', center: [10.45, 105.63], bbox: [10.12, 105.15, 10.95, 106.05] },
    { country: 'VN', id: 'an_giang', name: 'An Giang', center: [10.52, 105.12], bbox: [10.18, 104.75, 10.95, 105.58] },
    { country: 'VN', id: 'tphcm', name: 'TP. Hồ Chí Minh', center: [10.7769, 106.6980], bbox: [10.37, 106.36, 11.16, 107.03] },
    { country: 'VN', id: 'can_tho', name: 'TP. Cần Thơ', center: [10.035, 105.784], bbox: [9.90, 105.25, 10.32, 105.90] },
    { country: 'VN', id: 'long_an', name: 'Long An', center: [10.68, 106.18], bbox: [10.35, 105.50, 11.05, 106.70] },
    { country: 'VN', id: 'tien_giang', name: 'Tiền Giang', center: [10.42, 106.32], bbox: [10.20, 105.80, 10.60, 106.80] },
    { country: 'VN', id: 'ben_tre', name: 'Bến Tre', center: [10.24, 106.37], bbox: [9.80, 106.00, 10.40, 106.80] },
    { country: 'VN', id: 'vinh_long', name: 'Vĩnh Long', center: [10.25, 105.97], bbox: [9.95, 105.75, 10.35, 106.20] },
    { country: 'VN', id: 'tra_vinh', name: 'Trà Vinh', center: [9.93, 106.34], bbox: [9.50, 106.05, 10.10, 106.65] },
    { country: 'VN', id: 'hau_giang', name: 'Hậu Giang', center: [9.78, 105.47], bbox: [9.55, 105.20, 9.95, 105.85] },
    { country: 'VN', id: 'soc_trang', name: 'Sóc Trăng', center: [9.60, 105.98], bbox: [9.25, 105.55, 9.95, 106.30] },
    { country: 'VN', id: 'bac_lieu', name: 'Bạc Liêu', center: [9.29, 105.72], bbox: [9.00, 105.20, 9.60, 105.90] },
    { country: 'VN', id: 'ca_mau', name: 'Cà Mau', center: [9.18, 105.15], bbox: [8.55, 104.70, 9.55, 105.45] },
    { country: 'VN', id: 'kien_giang', name: 'Kiên Giang (Rạch Giá / Phú Quốc)', center: [10.01, 105.08], bbox: [9.35, 103.45, 10.55, 105.45] },
    { country: 'VN', id: 'tay_ninh', name: 'Tây Ninh', center: [11.31, 106.09], bbox: [10.95, 105.80, 11.80, 106.40] },
    { country: 'VN', id: 'binh_duong', name: 'Bình Dương', center: [11.13, 106.65], bbox: [10.85, 106.45, 11.50, 106.95] },
    { country: 'VN', id: 'dong_nai', name: 'Đồng Nai', center: [11.05, 107.05], bbox: [10.65, 106.70, 11.55, 107.60] },
    { country: 'VN', id: 'brvt', name: 'Bà Rịa – Vũng Tàu', center: [10.45, 107.18], bbox: [8.60, 106.50, 10.80, 107.60] },
    { country: 'VN', id: 'binh_phuoc', name: 'Bình Phước', center: [11.75, 106.90], bbox: [11.30, 106.40, 12.30, 107.40] },

    // --- VIỆT NAM (TÂY NGUYÊN & NAM TRUNG BỘ) ---
    { country: 'VN', id: 'lam_dong', name: 'Lâm Đồng (Đà Lạt)', center: [11.94, 108.45], bbox: [11.25, 107.25, 12.35, 108.75] },
    { country: 'VN', id: 'dak_lak', name: 'Đắk Lắk (Buôn Ma Thuột)', center: [12.67, 108.04], bbox: [12.15, 107.45, 13.40, 108.95] },
    { country: 'VN', id: 'dak_nong', name: 'Đắk Nông', center: [12.00, 107.69], bbox: [11.75, 107.20, 12.50, 108.10] },
    { country: 'VN', id: 'gia_lai', name: 'Gia Lai (Pleiku)', center: [13.98, 108.00], bbox: [13.25, 107.35, 14.65, 108.90] },
    { country: 'VN', id: 'kon_tum', name: 'Kon Tum', center: [14.35, 108.00], bbox: [13.90, 107.30, 15.35, 108.40] },
    { country: 'VN', id: 'ninh_thuan', name: 'Ninh Thuận (Phan Rang)', center: [11.56, 108.99], bbox: [11.30, 108.65, 12.00, 109.25] },
    { country: 'VN', id: 'binh_thuan', name: 'Bình Thuận (Phan Thiết)', center: [10.93, 108.10], bbox: [10.55, 107.40, 11.55, 108.90] },
    { country: 'VN', id: 'khanh_hoa', name: 'Khánh Hòa (Nha Trang)', center: [12.24, 109.19], bbox: [11.75, 108.65, 12.90, 109.45] },
    { country: 'VN', id: 'phu_yen', name: 'Phú Yên (Tuy Hòa)', center: [13.09, 109.31], bbox: [12.70, 108.65, 13.70, 109.50] },
    { country: 'VN', id: 'binh_dinh', name: 'Bình Định (Quy Nhơn)', center: [13.78, 109.22], bbox: [13.50, 108.60, 14.75, 109.35] },
    { country: 'VN', id: 'quang_ngai', name: 'Quảng Ngãi', center: [15.12, 108.80], bbox: [14.50, 108.10, 15.40, 109.15] },
    { country: 'VN', id: 'quang_nam', name: 'Quảng Nam (Tam Kỳ / Hội An)', center: [15.57, 108.47], bbox: [14.95, 107.20, 16.00, 108.70] },
    { country: 'VN', id: 'da_nang', name: 'TP. Đà Nẵng', center: [16.054, 108.202], bbox: [15.90, 107.82, 16.25, 108.35] },
    { country: 'VN', id: 'thua_thien_hue', name: 'Thừa Thiên Huế', center: [16.46, 107.59], bbox: [16.00, 107.00, 16.80, 108.20] },

    // --- VIỆT NAM (BẮC TRUNG BỘ & MIỀN BẮC) ---
    { country: 'VN', id: 'quang_tri', name: 'Quảng Trị', center: [16.75, 107.18], bbox: [16.30, 106.50, 17.20, 107.40] },
    { country: 'VN', id: 'quang_binh', name: 'Quảng Bình', center: [17.47, 106.60], bbox: [16.90, 105.60, 18.10, 106.85] },
    { country: 'VN', id: 'ha_tinh', name: 'Hà Tĩnh', center: [18.34, 105.90], bbox: [17.90, 105.10, 18.75, 106.50] },
    { country: 'VN', id: 'nghe_an', name: 'Nghệ An (Vinh)', center: [19.00, 105.00], bbox: [18.55, 103.85, 20.00, 105.80] },
    { country: 'VN', id: 'thanh_hoa', name: 'Thanh Hóa', center: [19.80, 105.77], bbox: [19.25, 104.40, 20.70, 106.10] },
    { country: 'VN', id: 'ha_noi', name: 'TP. Hà Nội', center: [21.0285, 105.8542], bbox: [20.56, 105.28, 21.39, 106.02] },
    { country: 'VN', id: 'hai_phong', name: 'TP. Hải Phòng', center: [20.8449, 106.6881], bbox: [20.55, 106.40, 21.05, 107.10] },
    { country: 'VN', id: 'quang_ninh', name: 'Quảng Ninh (Hạ Long)', center: [21.01, 107.30], bbox: [20.70, 106.45, 21.85, 108.10] },
    { country: 'VN', id: 'ninh_binh', name: 'Ninh Bình', center: [20.25, 105.97], bbox: [20.00, 105.50, 20.50, 106.10] },
    { country: 'VN', id: 'nam_dinh', name: 'Nam Định', center: [20.43, 106.17], bbox: [19.90, 105.95, 20.55, 106.60] },
    { country: 'VN', id: 'thai_binh', name: 'Thái Bình', center: [20.45, 106.34], bbox: [20.20, 106.10, 20.75, 106.70] },
    { country: 'VN', id: 'ha_nam', name: 'Hà Nam', center: [20.54, 105.92], bbox: [20.35, 105.75, 20.75, 106.10] },
    { country: 'VN', id: 'hung_yen', name: 'Hưng Yên', center: [20.65, 106.05], bbox: [20.50, 105.85, 21.00, 106.25] },
    { country: 'VN', id: 'hai_duong', name: 'Hải Dương', center: [20.94, 106.33], bbox: [20.70, 106.10, 21.25, 106.65] },
    { country: 'VN', id: 'bac_ninh', name: 'Bắc Ninh', center: [21.18, 106.07], bbox: [21.05, 105.90, 21.30, 106.30] },
    { country: 'VN', id: 'bac_giang', name: 'Bắc Giang', center: [21.27, 106.20], bbox: [21.10, 105.85, 21.65, 107.10] },
    { country: 'VN', id: 'vinh_phuc', name: 'Vĩnh Phúc', center: [21.31, 105.60], bbox: [21.15, 105.30, 21.60, 105.80] },
    { country: 'VN', id: 'phu_tho', name: 'Phú Thọ', center: [21.32, 105.20], bbox: [20.90, 104.80, 21.75, 105.50] },
    { country: 'VN', id: 'thai_nguyen', name: 'Thái Nguyên', center: [21.59, 105.84], bbox: [21.30, 105.45, 21.90, 106.25] },
    { country: 'VN', id: 'tuyen_quang', name: 'Tuyên Quang', center: [21.82, 105.21], bbox: [21.50, 104.85, 22.70, 105.65] },
    { country: 'VN', id: 'ha_giang', name: 'Hà Giang', center: [22.82, 104.98], bbox: [22.15, 104.35, 23.40, 105.55] },
    { country: 'VN', id: 'cao_bang', name: 'Cao Bằng', center: [22.67, 106.26], bbox: [22.25, 105.25, 23.10, 106.85] },
    { country: 'VN', id: 'bac_kan', name: 'Bắc Kạn', center: [22.15, 105.83], bbox: [21.80, 105.40, 22.75, 106.25] },
    { country: 'VN', id: 'lang_son', name: 'Lạng Sơn', center: [21.85, 106.76], bbox: [21.30, 106.10, 22.45, 107.40] },
    { country: 'VN', id: 'lao_cai', name: 'Lào Cai (Sa Pa)', center: [22.48, 103.97], bbox: [21.90, 103.50, 22.85, 104.65] },
    { country: 'VN', id: 'yen_bai', name: 'Yên Bái', center: [21.72, 104.91], bbox: [21.30, 103.90, 22.30, 105.15] },
    { country: 'VN', id: 'dien_bien', name: 'Điện Biên', center: [21.39, 103.02], bbox: [20.90, 102.15, 22.55, 103.60] },
    { country: 'VN', id: 'lai_chau', name: 'Lai Châu', center: [22.39, 103.46], bbox: [21.80, 102.30, 22.85, 103.95] },
    { country: 'VN', id: 'son_la', name: 'Sơn La', center: [21.33, 103.91], bbox: [20.65, 103.20, 22.05, 105.05] },
    { country: 'VN', id: 'hoa_binh', name: 'Hòa Bình', center: [20.81, 105.34], bbox: [20.30, 104.80, 21.15, 105.85] },

    // --- LÀO (LAOS) ---
    { country: 'LA', id: 'vientiane', name: 'Viêng Chăn (Vientiane)', center: [17.97, 102.63], bbox: [17.80, 102.40, 18.25, 102.90] },
    { country: 'LA', id: 'luang_prabang', name: 'Luang Prabang', center: [19.89, 102.14], bbox: [19.70, 101.90, 20.10, 102.40] },
    { country: 'LA', id: 'savannakhet', name: 'Savannakhet', center: [16.55, 104.75], bbox: [16.30, 104.50, 16.80, 105.10] },
    { country: 'LA', id: 'champasak', name: 'Champasak (Pakse)', center: [15.12, 105.78], bbox: [14.80, 105.50, 15.40, 106.10] },

    // --- CAMPUCHIA (CAMBODIA) ---
    { country: 'KH', id: 'phnom_penh', name: 'Phnôm Pênh (Phnom Penh)', center: [11.55, 104.92], bbox: [11.40, 104.75, 11.75, 105.10] },
    { country: 'KH', id: 'siem_reap', name: 'Siem Reap (Angkor Wat)', center: [13.36, 103.86], bbox: [13.20, 103.70, 13.55, 104.05] },
    { country: 'KH', id: 'battambang', name: 'Battambang', center: [13.10, 103.20], bbox: [12.90, 103.00, 13.30, 103.40] },
    { country: 'KH', id: 'kandal', name: 'Kandal (Giáp Việt Nam)', center: [11.45, 105.00], bbox: [11.00, 104.70, 11.80, 105.30] },
    { country: 'KH', id: 'kampot', name: 'Kampot / Kep (Biển)', center: [10.60, 104.18], bbox: [10.40, 104.00, 10.80, 104.40] },

    // --- THÁI LAN (THAILAND) ---
    { country: 'TH', id: 'bangkok', name: 'Băng Cốc (Bangkok)', center: [13.75, 100.50], bbox: [13.55, 100.30, 13.95, 100.75] },
    { country: 'TH', id: 'chiang_mai', name: 'Chiang Mai', center: [18.79, 98.98], bbox: [18.60, 98.80, 19.00, 99.15] },
    { country: 'TH', id: 'ubon', name: 'Ubon Ratchathani (Đông Bắc)', center: [15.24, 104.85], bbox: [15.00, 104.60, 15.50, 105.10] }
];

window.OFFLINE_SOURCES = [
    {
        id: 'esri_satellite',
        name: '🛰️ Vệ tinh Esri World Imagery (Mã nguồn mở)',
        type: 'satellite',
        isOpenSource: true,
        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri, Maxar, Earthstar Geographics',
        maxZoom: 19
    },
    {
        id: 'osm_streets',
        name: '🗺️ Bản đồ Đường sá OpenStreetMap (Mã nguồn mở)',
        type: 'street',
        isOpenSource: true,
        urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    },
    {
        id: 'open_topo',
        name: '🏔️ Bản đồ Địa hình OpenTopoMap (Đường bình độ)',
        type: 'topo',
        isOpenSource: true,
        urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap (CC-BY-SA)',
        maxZoom: 17
    },
    {
        id: 'google_hybrid',
        name: '🛰️ Vệ tinh Google Hybrid (Google Maps Platform)',
        type: 'hybrid',
        isOpenSource: false,
        urlTemplate: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution: '© Google Maps Platform (gmp_git_agentskills_v1)',
        maxZoom: 20
    }
];

// Các tiện ích toán học tính toán Slippy Map Tile (Chuẩn Web Mercator EPSG:3857)
window.OfflineTileMath = {
    // Đổi Kinh độ/Vĩ độ sang chỉ số ô tile X, Y theo mức Zoom
    latLngToTile: function(lat, lng, zoom) {
        var latRad = lat * Math.PI / 180.0;
        var n = Math.pow(2.0, zoom);
        var x = Math.floor((lng + 180.0) / 360.0 * n);
        var y = Math.floor((1.0 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2.0 * n);
        return { x: x, y: y, z: zoom };
    },

    // Đổi chỉ số ô tile X, Y sang Kinh độ/Vĩ độ góc Tây Bắc
    tileToLatLng: function(x, y, zoom) {
        var n = Math.pow(2.0, zoom);
        var lng = x / n * 360.0 - 180.0;
        var latRad = Math.atan(Math.sinh(Math.PI * (1.0 - 2.0 * y / n)));
        var lat = latRad * 180.0 / Math.PI;
        return { lat: lat, lng: lng };
    },

    // Lấy danh sách tất cả các ô tile nằm trong Bounding Box [minLat, minLng, maxLat, maxLng]
    getTilesInBbox: function(bbox, minZoom, maxZoom) {
        var tiles = [];
        var minLat = bbox[0], minLng = bbox[1], maxLat = bbox[2], maxLng = bbox[3];

        for (var z = minZoom; z <= maxZoom; z++) {
            var topLeft = this.latLngToTile(maxLat, minLng, z);
            var bottomRight = this.latLngToTile(minLat, maxLng, z);

            var minX = Math.min(topLeft.x, bottomRight.x);
            var maxX = Math.max(topLeft.x, bottomRight.x);
            var minY = Math.min(topLeft.y, bottomRight.y);
            var maxY = Math.max(topLeft.y, bottomRight.y);

            for (var x = minX; x <= maxX; x++) {
                for (var y = minY; y <= maxY; y++) {
                    tiles.push({ x: x, y: y, z: z });
                }
            }
        }
        return tiles;
    },

    // Tạo BBox hình vuông/tròn theo bán kính quanh tâm [lat, lng]
    getBboxFromRadius: function(lat, lng, radiusKm) {
        var latDelta = radiusKm / 111.32; // 1 độ vĩ ~ 111.32 km
        var lngDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180.0));
        return [
            lat - latDelta,
            lng - lngDelta,
            lat + latDelta,
            lng + lngDelta
        ];
    },

    // Ước lượng dung lượng (MB) dựa trên số lượng tile
    estimateSizeMB: function(tileCount, sourceId) {
        // Ảnh vệ tinh ~ 20 KB/tile, vector/OSM ~ 14 KB/tile, Topo ~ 25 KB/tile
        var avgTileKb = 20;
        if (sourceId === 'osm_streets') avgTileKb = 14;
        else if (sourceId === 'open_topo') avgTileKb = 25;
        return (tileCount * avgTileKb / 1024).toFixed(1);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        OFFLINE_COUNTRIES: window.OFFLINE_COUNTRIES,
        OFFLINE_PROVINCES: window.OFFLINE_PROVINCES,
        OFFLINE_SOURCES: window.OFFLINE_SOURCES,
        OfflineTileMath: window.OfflineTileMath
    };
}
