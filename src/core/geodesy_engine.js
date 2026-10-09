/**
 * GeodesyEngine - Bộ Động Cơ Số Học Trắc Địa VN2000 / WGS84 Thuần Túy
 * Chuẩn Spec-Driven Development (Bộ Nhớ Spec-Kit)
 * Độc lập 100% với DOM - Hỗ trợ cả Node.js (Testing) và Trình duyệt (PWA)
 */

const GeodesyEngine = {
    // Thông số Ellipsoid WGS-84
    WGS84: {
        a: 6378137.0,
        f: 1.0 / 298.257223563,
        get b() { return this.a * (1.0 - this.f); },
        get e2() { return (this.a * this.a - this.b * this.b) / (this.a * this.a); },
        get ePrime2() { return (this.a * this.a - this.b * this.b) / (this.b * this.b); }
    },

    // 7 Tham số chuyển đổi chuẩn Bộ Tài nguyên & Môi trường (WGS84 -> VN2000)
    DEFAULT_HELMERT_7: {
        dx: -191.90441429,
        dy: -39.30318279,
        dz: -111.45032835,
        wx: -0.00928836,  // Giây góc
        wy: 0.01975479,
        wz: -0.00427372,
        scale: 0.000000252906278
    },

    // Chuyển đổi Độ Phút Giây sang Độ Thập Phân
    dmsToDeg(deg, min, sec) {
        return deg + (min / 60.0) + (sec / 3600.0);
    },

    // Chuyển đổi Độ Thập Phân sang Độ Phút Giây
    degToDms(deg) {
        const d = Math.floor(deg);
        const remMin = (deg - d) * 60.0;
        const m = Math.floor(remMin);
        const s = (remMin - m) * 60.0;
        return { deg: d, min: m, sec: Number(s.toFixed(4)) };
    },

    // Tự động phát hiện và sửa thứ tự trục Y-X thành X-Y (Đặc sản trắc địa Việt Nam)
    normalizeCoords(val1, val2) {
        // Tọa độ X (Bắc) ở VN dao động từ ~900.000m đến ~2.500.000m
        // Tọa độ Y (Đông) ở VN dao động từ ~200.000m đến ~800.000m
        if (val1 < val2 && val2 > 900000 && val1 < 900000) {
            return { x: val2, y: val1, isFlipped: true };
        }
        return { x: val1, y: val2, isFlipped: false };
    },

    // Tính khoảng cách 2D Euclid
    distance2D(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Tính góc phương vị từ điểm 1 đến điểm 2 (X Bắc, Y Đông: 0° là Bắc, 90° là Đông, 180° là Nam, 270° là Tây)
    azimuth(p1, p2) {
        const dx = p2.x - p1.x; // Delta X (Bắc)
        const dy = p2.y - p1.y; // Delta Y (Đông)
        let rad = Math.atan2(dy, dx);
        let deg = (rad * 180.0 / Math.PI);
        if (deg < 0) deg += 360.0;
        return deg % 360.0;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeodesyEngine;
} else if (typeof window !== 'undefined') {
    window.GeodesyEngine = GeodesyEngine;
}
