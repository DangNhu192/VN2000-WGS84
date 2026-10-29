/**
 * THƯ VIỆN TOÁN TRẮC ĐỊA VN-2000 & WGS-84 (CHUẨN HÓA 100% THEO APP GỐC)
 * Tác giả gốc: Đặng Như (dnpn.ttqt@gmail.com)
 * Chuẩn mô hình 7 tham số Bursa-Wolf & Phép chiếu Gauss-Krüger / Transverse Mercator
 */

const ModCS = {
    Ellipsoid_WGS84: {
        SemiMajorAxis: 6378137.0,
        SemiMinorAxis: 6356752.314245
    },
    Datum_WGS84: {
        Name: "WGS-84",
        DX: 0, DY: 0, DZ: 0, DS: 0, RX: 0, RY: 0, RZ: 0
    },
    // Tham số tính chuyển Bursa-Wolf chuẩn khớp 100% với Chuyển Tọa Độ VN2000.apk
    Datum_VN2000: {
        Name: "VN-2000",
        DX: 191.90441429,
        DY: 39.30318279,
        DZ: 111.45032835,
        DS: -0.252906278,
        RX: 0.00928836,
        RY: -0.01975479,
        RZ: 0.00427372
    }
};

function degToRad(deg) {
    return deg * 0.017453292519943295;
}

function radToDeg(rad) {
    return rad * 57.29577951308232;
}

class CoordLatLong {
    constructor(lat, lng, h = 0, datum = ModCS.Datum_WGS84) {
        this.lat = lat;
        this.lng = lng;
        this.h = h;
        this.datum = datum;
    }

    transform(targetDatum, isInverse) {
        const a = ModCS.Ellipsoid_WGS84.SemiMajorAxis;
        const b = ModCS.Ellipsoid_WGS84.SemiMinorAxis;
        const latRad = degToRad(this.lat);
        const lonRad = degToRad(this.lng);

        const sinB = Math.sin(latRad);
        const cosB = Math.cos(latRad);
        const sinL = Math.sin(lonRad);
        const cosL = Math.cos(lonRad);

        const e2 = (a * a - b * b) / (a * a);
        const N = a / Math.sqrt(1.0 - e2 * sinB * sinB);

        // Tọa độ Descartes 3D
        const X = (N + this.h) * cosB * cosL;
        const Y = (N + this.h) * cosB * sinL;
        const Z = (N * (1.0 - e2) + this.h) * sinB;

        const src = isInverse ? this.datum : targetDatum;
        const mult = isInverse ? -1.0 : 1.0;

        const dx = src.DX * mult;
        const dy = src.DY * mult;
        const dz = src.DZ * mult;
        const rx = degToRad((src.RX * mult) / 3600.0);
        const ry = degToRad((src.RY * mult) / 3600.0);
        const rz = degToRad((src.RZ * mult) / 3600.0);
        const ds = (src.DS * mult) / 1000000.0;
        const scale = 1.0 + ds;

        // Ma trận xoay Bursa-Wolf
        const X2 = dx + scale * (X + rz * Y - ry * Z);
        const Y2 = dy + scale * (-rz * X + Y + rx * Z);
        const Z2 = dz + scale * (ry * X - rx * Y + Z);

        // Chuyển ngược về trắc địa trên Ellipsoid đích (Bowring)
        const a2 = targetDatum === ModCS.Datum_VN2000 ? ModCS.Ellipsoid_WGS84.SemiMajorAxis : ModCS.Ellipsoid_WGS84.SemiMajorAxis;
        const b2 = targetDatum === ModCS.Datum_VN2000 ? ModCS.Ellipsoid_WGS84.SemiMinorAxis : ModCS.Ellipsoid_WGS84.SemiMinorAxis;
        const e2_target = (a2 * a2 - b2 * b2) / (a2 * a2);
        const e_prime2 = (a2 * a2 - b2 * b2) / (b2 * b2);

        const p = Math.sqrt(X2 * X2 + Y2 * Y2);
        const theta = Math.atan2(Z2 * a2, p * b2);

        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const lat2 = Math.atan2(
            Z2 + e_prime2 * b2 * Math.pow(sinTheta, 3),
            p - e2_target * a2 * Math.pow(cosTheta, 3)
        );
        const lon2 = Math.atan2(Y2, X2);
        const sinLat2 = Math.sin(lat2);
        const N2 = a2 / Math.sqrt(1.0 - e2_target * sinLat2 * sinLat2);
        const h2 = p / Math.cos(lat2) - N2;

        this.lat = radToDeg(lat2);
        this.lng = radToDeg(lon2);
        this.h = h2;
        this.datum = targetDatum;
    }

    toVN2000() {
        if (this.datum.Name !== "WGS-84") {
            this.transform(ModCS.Datum_WGS84, true);
        }
        if (ModCS.Datum_VN2000.Name !== "WGS-84") {
            this.transform(ModCS.Datum_VN2000, false);
        }
    }

    toWGS84() {
        if (this.datum.Name !== "WGS-84") {
            this.transform(ModCS.Datum_WGS84, true);
        }
    }
}

class ProjTransverseMercator {
    constructor(a = 6378137.0, b = 6356752.314245, k0 = 0.9999, L0 = 105.75, B0 = 0.0, X0 = 0.0, Y0 = 500000.0) {
        this.a = a;
        this.b = b;
        this.k0 = k0;
        this.L0 = L0;
        this.B0 = B0;
        this.X0 = X0;
        this.Y0 = Y0;

        this.e2 = (a * a - b * b) / (a * a);
        this.e_prime2 = (a * a - b * b) / (b * b);
        const e4 = this.e2 * this.e2;
        const e6 = e4 * this.e2;

        this.e_0 = 1.0 - 0.25 * this.e2 - 0.046875 * e4 - 0.01953125 * e6;
        this.e_1 = 0.375 * this.e2 + 0.09375 * e4 + 0.0439453125 * e6;
        this.e_2 = 0.05859375 * e4 + 0.0439453125 * e6;
        this.e_3 = 0.011393229166666666 * e6;
    }

    meridianDistance(latRad) {
        return this.a * (this.e_0 * latRad - this.e_1 * Math.sin(2.0 * latRad) + this.e_2 * Math.sin(4.0 * latRad) - this.e_3 * Math.sin(6.0 * latRad));
    }

    forward(latDeg, lonDeg) {
        const latRad = degToRad(latDeg);
        const lonRad = degToRad(lonDeg);
        const cmRad = degToRad(this.L0);

        let dLon = lonRad - cmRad;
        if (dLon > Math.PI) dLon -= 2 * Math.PI;
        if (dLon < -Math.PI) dLon += 2 * Math.PI;

        const sinB = Math.sin(latRad);
        const cosB = Math.cos(latRad);
        const tanB = Math.tan(latRad);

        const N = this.a / Math.sqrt(1.0 - this.e2 * sinB * sinB);
        const T = tanB * tanB;
        const C = this.e_prime2 * cosB * cosB;
        const A = cosB * dLon;

        const M = this.meridianDistance(latRad);
        const M0 = this.meridianDistance(degToRad(this.B0));

        const X = this.k0 * (M - M0 + N * tanB * (
            A * A / 2.0 +
            (5.0 - T + 9.0 * C + 4.0 * C * C) * Math.pow(A, 4) / 24.0 +
            (61.0 - 58.0 * T + T * T + 600.0 * C - 330.0 * this.e_prime2) * Math.pow(A, 6) / 720.0
        )) + this.X0;

        const Y = this.k0 * N * (
            A +
            (1.0 - T + C) * Math.pow(A, 3) / 6.0 +
            (5.0 - 18.0 * T + T * T + 72.0 * C - 58.0 * this.e_prime2) * Math.pow(A, 5) / 120.0
        ) + this.Y0;

        return { X, Y };
    }

    inverse(X, Y) {
        const M0 = this.meridianDistance(degToRad(this.B0));
        const M = M0 + (X - this.X0) / this.k0;

        const mu = M / (this.a * this.e_0);
        const e1 = (1.0 - Math.sqrt(1.0 - this.e2)) / (1.0 + Math.sqrt(1.0 - this.e2));

        const phi1 = mu + (1.5 * e1 - 0.84375 * Math.pow(e1, 3)) * Math.sin(2.0 * mu) +
            (1.3125 * Math.pow(e1, 2) - 1.71875 * Math.pow(e1, 4)) * Math.sin(4.0 * mu) +
            (1.5729166666666667 * Math.pow(e1, 3)) * Math.sin(6.0 * mu) +
            (2.142578125 * Math.pow(e1, 4)) * Math.sin(8.0 * mu);

        const sinPhi1 = Math.sin(phi1);
        const cosPhi1 = Math.cos(phi1);
        const tanPhi1 = Math.tan(phi1);

        const N1 = this.a / Math.sqrt(1.0 - this.e2 * sinPhi1 * sinPhi1);
        const R1 = this.a * (1.0 - this.e2) / Math.pow(1.0 - this.e2 * sinPhi1 * sinPhi1, 1.5);
        const D = (Y - this.Y0) / (N1 * this.k0);

        const T1 = tanPhi1 * tanPhi1;
        const C1 = this.e_prime2 * cosPhi1 * cosPhi1;

        const latRad = phi1 - (N1 * tanPhi1 / R1) * (
            D * D / 2.0 -
            (5.0 + 3.0 * T1 + 10.0 * C1 - 4.0 * C1 * C1 - 9.0 * this.e_prime2) * Math.pow(D, 4) / 24.0 +
            (61.0 + 90.0 * T1 + 298.0 * C1 + 45.0 * T1 * T1 - 252.0 * this.e_prime2 - 3.0 * C1 * C1) * Math.pow(D, 6) / 720.0
        );

        const lonRad = degToRad(this.L0) + (
            D -
            (1.0 + 2.0 * T1 + C1) * Math.pow(D, 3) / 6.0 +
            (5.0 - 2.0 * C1 + 28.0 * T1 - 3.0 * C1 * C1 + 8.0 * this.e_prime2 + 24.0 * T1 * T1) * Math.pow(D, 5) / 120.0
        ) / cosPhi1;

        return {
            lat: radToDeg(latRad),
            lng: radToDeg(lonRad)
        };
    }
}

// 63 Tỉnh Thành Việt Nam & Kinh Tuyến Trục chuẩn Quyết định 05/2007/QĐ-BTNMT
const VN_PROVINCES = [
    { name: "TP. Hồ Chí Minh", deg: 105, min: 45, ktt: 105.75 },
    { name: "TP. Hà Nội", deg: 105, min: 0, ktt: 105.0 },
    { name: "TP. Đà Nẵng", deg: 107, min: 45, ktt: 107.75 },
    { name: "TP. Cần Thơ", deg: 105, min: 0, ktt: 105.0 },
    { name: "TP. Hải Phòng", deg: 105, min: 45, ktt: 105.75 },
    { name: "An Giang", deg: 104, min: 45, ktt: 104.75 },
    { name: "Bà Rịa – Vũng Tàu", deg: 107, min: 45, ktt: 107.75 },
    { name: "Bắc Cạn", deg: 106, min: 30, ktt: 106.5 },
    { name: "Bắc Giang", deg: 107, min: 0, ktt: 107.0 },
    { name: "Bạc Liêu", deg: 105, min: 0, ktt: 105.0 },
    { name: "Bắc Ninh", deg: 105, min: 30, ktt: 105.5 },
    { name: "Bến Tre", deg: 105, min: 45, ktt: 105.75 },
    { name: "Bình Định", deg: 108, min: 15, ktt: 108.25 },
    { name: "Bình Dương", deg: 105, min: 45, ktt: 105.75 },
    { name: "Bình Phước", deg: 106, min: 15, ktt: 106.25 },
    { name: "Bình Thuận", deg: 107, min: 45, ktt: 107.75 },
    { name: "Cà Mau", deg: 104, min: 30, ktt: 104.5 },
    { name: "Cao Bằng", deg: 105, min: 45, ktt: 105.75 },
    { name: "Đắc Nông", deg: 108, min: 30, ktt: 108.5 },
    { name: "Đắk Lắk", deg: 108, min: 30, ktt: 108.5 },
    { name: "Điện Biên", deg: 103, min: 0, ktt: 103.0 },
    { name: "Đồng Nai", deg: 107, min: 45, ktt: 107.75 },
    { name: "Đồng Tháp", deg: 105, min: 0, ktt: 105.0 },
    { name: "Gia Lai", deg: 108, min: 30, ktt: 108.5 },
    { name: "Hà Giang", deg: 105, min: 30, ktt: 105.5 },
    { name: "Hà Nam", deg: 105, min: 0, ktt: 105.0 },
    { name: "Hà Tĩnh", deg: 105, min: 30, ktt: 105.5 },
    { name: "Hải Dương", deg: 105, min: 30, ktt: 105.5 },
    { name: "Hậu Giang", deg: 105, min: 0, ktt: 105.0 },
    { name: "Hoà Bình", deg: 106, min: 0, ktt: 106.0 },
    { name: "Huế", deg: 107, min: 0, ktt: 107.0 },
    { name: "Hưng Yên", deg: 105, min: 30, ktt: 105.5 },
    { name: "Khánh Hoà", deg: 108, min: 15, ktt: 108.25 },
    { name: "Kiên Giang", deg: 104, min: 30, ktt: 104.5 },
    { name: "Kon Tum", deg: 107, min: 30, ktt: 107.5 },
    { name: "Lai Châu", deg: 103, min: 0, ktt: 103.0 },
    { name: "Lâm Đồng", deg: 107, min: 45, ktt: 107.75 },
    { name: "Lạng Sơn", deg: 107, min: 15, ktt: 107.25 },
    { name: "Lào Cai", deg: 104, min: 45, ktt: 104.75 },
    { name: "Long An", deg: 105, min: 45, ktt: 105.75 },
    { name: "Nam Định", deg: 105, min: 30, ktt: 105.5 },
    { name: "Nghệ An", deg: 104, min: 45, ktt: 104.75 },
    { name: "Ninh Bình", deg: 105, min: 0, ktt: 105.0 },
    { name: "Ninh Thuận", deg: 108, min: 15, ktt: 108.25 },
    { name: "Phú Thọ", deg: 104, min: 45, ktt: 104.75 },
    { name: "Phú Yên", deg: 108, min: 30, ktt: 108.5 },
    { name: "Quảng Bình", deg: 106, min: 0, ktt: 106.0 },
    { name: "Quảng Nam", deg: 107, min: 45, ktt: 107.75 },
    { name: "Quảng Ngãi", deg: 108, min: 0, ktt: 108.0 },
    { name: "Quảng Ninh", deg: 107, min: 45, ktt: 107.75 },
    { name: "Quảng Trị", deg: 106, min: 15, ktt: 106.25 },
    { name: "Sóc Trăng", deg: 105, min: 30, ktt: 105.5 },
    { name: "Sơn La", deg: 104, min: 0, ktt: 104.0 },
    { name: "Tây Ninh", deg: 105, min: 30, ktt: 105.5 },
    { name: "Thái Bình", deg: 105, min: 30, ktt: 105.5 },
    { name: "Thái Nguyên", deg: 106, min: 30, ktt: 106.5 },
    { name: "Thanh Hoá", deg: 105, min: 0, ktt: 105.0 },
    { name: "Tiền Giang", deg: 105, min: 45, ktt: 105.75 },
    { name: "Trà Vinh", deg: 105, min: 30, ktt: 105.5 },
    { name: "Tuyên Quang", deg: 106, min: 0, ktt: 106.0 },
    { name: "Vĩnh Long", deg: 105, min: 30, ktt: 105.5 },
    { name: "Vĩnh Phúc", deg: 105, min: 0, ktt: 105.0 },
    { name: "Yên Bái", deg: 104, min: 45, ktt: 104.75 }
];

/**
 * Định dạng tọa độ Lat / Long theo 3 kiểu hiển thị
 * @param {number} val 
 * @param {number} type 0: dd.dddddd°, 1: dd° mm.mmmm', 2: dd° mm' ss.ss"
 */
function formatLatLong(val, type = 0) {
    if (isNaN(val) || val === null || val === undefined) return "";
    const sign = val < 0 ? "-" : "";
    const absVal = Math.abs(val);

    if (type === 0) {
        return sign + absVal.toFixed(6) + "°";
    }

    const deg = Math.floor(absVal);
    const remainder = absVal - deg;

    if (type === 1) {
        const min = remainder * 60.0;
        return `${sign}${deg}° ${min.toFixed(4)}'`;
    }

    if (type === 2) {
        const min = Math.floor(remainder * 60.0);
        const sec = (remainder * 60.0 - min) * 60.0;
        return `${sign}${deg}° ${min}' ${sec.toFixed(2)}"`;
    }

    return sign + absVal.toFixed(6) + "°";
}

/**
 * Parse chuỗi tọa độ (hỗ trợ cả thập phân, độ-phút-giây, dấu phẩy, v.v.)
 */
function parseCoordinateNumber(str) {
    if (!str) return 0;
    let s = String(str).trim();
    // Thay thế ký tự đặc biệt
    s = s.replace(/°|'|"|″|′/g, " ").replace(/\s+/g, " ").trim();
    const parts = s.split(" ");
    if (parts.length === 1) {
        const clean = parts[0].replace(/,/g, ".");
        const val = parseFloat(clean);
        return isNaN(val) ? 0 : val;
    } else if (parts.length === 2) {
        // Deg Min
        const d = parseFloat(parts[0].replace(/,/g, "."));
        const m = parseFloat(parts[1].replace(/,/g, "."));
        if (isNaN(d) || isNaN(m)) return 0;
        const sign = d < 0 ? -1 : 1;
        return sign * (Math.abs(d) + m / 60.0);
    } else if (parts.length >= 3) {
        // Deg Min Sec
        const d = parseFloat(parts[0].replace(/,/g, "."));
        const m = parseFloat(parts[1].replace(/,/g, "."));
        const sec = parseFloat(parts[2].replace(/,/g, "."));
        if (isNaN(d) || isNaN(m) || isNaN(sec)) return 0;
        const sign = d < 0 ? -1 : 1;
        return sign * (Math.abs(d) + m / 60.0 + sec / 3600.0);
    }
    return 0;
}

/**
 * Hàm tính chuyển WGS84 -> VN2000
 * @param {number} lat Vĩ độ WGS84
 * @param {number} lng Kinh độ WGS84
 * @param {number} ktt Kinh tuyến trục (vd: 105.75)
 * @param {number} k0 Hệ số tỷ lệ (0.9999 cho Múi 3°, 0.9996 cho Múi 6°)
 * @returns {{ X: number, Y: number }} X (Bắc ~ 7 chữ số), Y (Đông ~ 6 chữ số)
 */
function convertWgsToVn2k(lat, lng, ktt, k0 = 0.9999) {
    const coord = new CoordLatLong(lat, lng, 0, ModCS.Datum_WGS84);
    coord.toVN2000();
    const proj = new ProjTransverseMercator(
        ModCS.Ellipsoid_WGS84.SemiMajorAxis,
        ModCS.Ellipsoid_WGS84.SemiMinorAxis,
        k0,
        ktt,
        0, 0, 500000.0
    );
    const pt = proj.forward(coord.lat, coord.lng);
    return {
        X: pt.X,
        Y: pt.Y
    };
}

/**
 * Hàm tính chuyển VN2000 -> WGS84
 * @param {number} X Tọa độ Bắc VN2000 (~7 chữ số)
 * @param {number} Y Tọa độ Đông VN2000 (~6 chữ số)
 * @param {number} ktt Kinh tuyến trục
 * @param {number} k0 Hệ số tỷ lệ
 * @returns {{ lat: number, lng: number }} Vĩ độ & Kinh độ WGS84
 */
function convertVn2kToWgs(X, Y, ktt, k0 = 0.9999) {
    const proj = new ProjTransverseMercator(
        ModCS.Ellipsoid_WGS84.SemiMajorAxis,
        ModCS.Ellipsoid_WGS84.SemiMinorAxis,
        k0,
        ktt,
        0, 0, 500000.0
    );
    const pt = proj.inverse(X, Y);
    const coord = new CoordLatLong(pt.lat, pt.lng, 0, ModCS.Datum_VN2000);
    coord.toWGS84();
    return {
        lat: coord.lat,
        lng: coord.lng
    };
}

/**
 * Tính khoảng cách và góc phương vị giữa 2 điểm VN2000 A(x1, y1) và B(x2, y2)
 */
function calculateDistanceAndAzimuth(x1, y1, x2, y2) {
    const dX = x2 - x1;
    const dY = y2 - y1;
    const dist = Math.sqrt(dX * dX + dY * dY);

    let rad = Math.atan2(dY, dX);
    if (rad < 0) rad += 2 * Math.PI;
    const degTotal = rad * (180.0 / Math.PI);
    const dDeg = Math.floor(degTotal);
    const dMin = Math.floor((degTotal - dDeg) * 60.0);
    const dSec = ((degTotal - dDeg) * 60.0 - dMin) * 60.0;

    let quarter = "";
    if (degTotal >= 0 && degTotal < 90) quarter = "Góc phần tư I (Đông - Bắc)";
    else if (degTotal >= 90 && degTotal < 180) quarter = "Góc phần tư II (Đông - Nam)";
    else if (degTotal >= 180 && degTotal < 270) quarter = "Góc phần tư III (Tây - Nam)";
    else quarter = "Góc phần tư IV (Tây - Bắc)";

    return {
        dist,
        azimuthDeg: degTotal,
        dDeg,
        dMin,
        dSec,
        quarter,
        dX,
        dY
    };
}

/**
 * Tính diện tích và chu vi đa giác từ mảng các đỉnh [{ X, Y }]
 */
function calculatePolygonAreaAndPerimeter(points) {
    if (!points || points.length < 3) {
        return { area: 0, perimeter: 0 };
    }
    const n = points.length;
    let sumArea = 0;
    let perimeter = 0;

    for (let i = 0; i < n; i++) {
        const cur = points[i];
        const next = points[(i + 1) % n];

        sumArea += (cur.X * next.Y - next.X * cur.Y);

        const dx = next.X - cur.X;
        const dy = next.Y - cur.Y;
        perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    const area = Math.abs(sumArea) / 2.0;
    return { area, perimeter };
}

/**
 * =========================================================================
 * BỘ TIỆN ÍCH AN TOÀN TRẮC ĐỊA & HÌNH HỌC (RUST-INSPIRED RESULT PATTERN)
 * =========================================================================
 */

const Ok = (val) => ({ ok: true, val, err: null });
const Err = (err) => ({ ok: false, val: null, err });

/**
 * Kiểm tra tính hợp lệ của tọa độ WGS-84 (kinh độ, vĩ độ)
 * Trả về Result kiểu Rust kèm cảnh báo lãnh thổ Việt Nam
 */
function validateWgsCoordinates(lat, lng) {
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (isNaN(numLat) || isNaN(numLng)) {
        return Err("Tọa độ không hợp lệ: Giá trị vĩ độ hoặc kinh độ không phải là số hợp lệ.");
    }
    if (numLat < -90 || numLat > 90) {
        return Err(`Vĩ độ vượt dải hợp lệ [-90, 90]: ${numLat}`);
    }
    if (numLng < -180 || numLng > 180) {
        return Err(`Kinh độ vượt dải hợp lệ [-180, 180]: ${numLng}`);
    }
    // Cảnh báo phạm vi lãnh thổ Việt Nam (8°N - 24°N, 102°E - 110°E)
    const isInsideVietnam = (numLat >= 8.0 && numLat <= 24.0 && numLng >= 102.0 && numLng <= 110.0);
    return Ok({
        lat: numLat,
        lng: numLng,
        isInsideVietnam,
        warning: isInsideVietnam ? null : "⚠️ Tọa độ nằm ngoài phạm vi lãnh thổ Việt Nam (8° - 24°B, 102° - 110°Đ)."
    });
}

/**
 * Kiểm tra tính hợp lệ của tọa độ phẳng VN-2000 (X: Bắc, Y: Đông)
 */
function validateVn2kCoordinates(x, y) {
    const numX = parseFloat(x);
    const numY = parseFloat(y);
    if (isNaN(numX) || isNaN(numY)) {
        return Err("Tọa độ không hợp lệ: X hoặc Y không phải là số.");
    }
    // Kiểm tra dải giá trị thông thường của VN2000 tại Việt Nam
    const isNormalVnRange = (numX >= 500000 && numX <= 3000000 && numY >= 100000 && numY <= 900000);
    return Ok({
        X: numX,
        Y: numY,
        isNormalVnRange,
        warning: isNormalVnRange ? null : "⚠️ Tọa độ X hoặc Y có dải giá trị bất thường so với lưới chiếu VN-2000 tiêu chuẩn."
    });
}

/**
 * Kiểm tra 2 đoạn thẳng AB và CD có cắt chéo nhau không (Cross Product Ray Test)
 */
function doLineSegmentsIntersect(p1, p2, p3, p4) {
    const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    const isSamePoint = (a, b) => Math.abs(a.x - b.x) < 1e-7 && Math.abs(a.y - b.y) < 1e-7;
    if (isSamePoint(p1, p3) || isSamePoint(p1, p4) || isSamePoint(p2, p3) || isSamePoint(p2, p4)) {
        return false;
    }
    return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

/**
 * Kiểm tra đa giác có bị tự cắt chéo (self-intersecting polygon) không
 */
function checkPolygonSelfIntersection(vertices) {
    if (!vertices || vertices.length < 4) return Ok({ hasSelfIntersection: false });
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
        const p1 = { x: vertices[i].x ?? vertices[i].lng ?? vertices[i].X, y: vertices[i].y ?? vertices[i].lat ?? vertices[i].Y };
        const p2 = { x: vertices[(i + 1) % n].x ?? vertices[(i + 1) % n].lng ?? vertices[(i + 1) % n].X, y: vertices[(i + 1) % n].y ?? vertices[(i + 1) % n].lat ?? vertices[(i + 1) % n].Y };
        for (let j = i + 2; j < n; j++) {
            if (i === 0 && j === n - 1) continue; // Cạnh liền kề chia sẻ đỉnh đầu-cuối
            const p3 = { x: vertices[j].x ?? vertices[j].lng ?? vertices[j].X, y: vertices[j].y ?? vertices[j].lat ?? vertices[j].Y };
            const p4 = { x: vertices[(j + 1) % n].x ?? vertices[(j + 1) % n].lng ?? vertices[(j + 1) % n].X, y: vertices[(j + 1) % n].y ?? vertices[(j + 1) % n].lat ?? vertices[(j + 1) % n].Y };
            if (doLineSegmentsIntersect(p1, p2, p3, p4)) {
                return Ok({
                    hasSelfIntersection: true,
                    intersectingSegments: [i, j],
                    warning: `⚠️ Cạnh [${i + 1}-${((i + 1) % n) + 1}] và cạnh [${j + 1}-${((j + 1) % n) + 1}] tự cắt chéo nhau!`
                });
            }
        }
    }
    return Ok({ hasSelfIntersection: false });
}

// Xuất các hàm ra phạm vi toàn cục hoặc module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModCS,
        CoordLatLong,
        ProjTransverseMercator,
        VN_PROVINCES,
        formatLatLong,
        parseCoordinateNumber,
        convertWgsToVn2k,
        convertVn2kToWgs,
        calculateDistanceAndAzimuth,
        calculatePolygonAreaAndPerimeter,
        Ok,
        Err,
        validateWgsCoordinates,
        validateVn2kCoordinates,
        doLineSegmentsIntersect,
        checkPolygonSelfIntersection
    };
}

