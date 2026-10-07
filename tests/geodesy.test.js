/**
 * BỘ KIỂM THỬ TỰ ĐỘNG THUẬT TOÁN TRẮC ĐỊA & HÌNH HỌC VN2000-PWA
 * Chạy với: node tests/geodesy.test.js
 */

const {
    convertWgsToVn2k,
    convertVn2kToWgs,
    calculateDistanceAndAzimuth,
    calculatePolygonAreaAndPerimeter,
    validateWgsCoordinates,
    validateVn2kCoordinates,
    checkPolygonSelfIntersection
} = require('../geodesy.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function runTests() {
    console.log('====================================================');
    console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN THUẬT TOÁN VN2000-PWA');
    console.log('====================================================\n');

    // 1. Kiểm thử chuyển đổi thuận nghịch WGS-84 <-> VN-2000
    console.log('--- NHÓM 1: CHUYỂN ĐỔI THUẬN NGHỊCH WGS-84 <-> VN-2000 ---');
    {
        // Mốc tại TP.HCM (KTT 105.75, Múi 3°)
        const latHcm = 10.7769;
        const lngHcm = 106.7009;
        const vn2kHcm = convertWgsToVn2k(latHcm, lngHcm, 105.75, 3.0);
        assert(vn2kHcm && vn2kHcm.X > 1100000 && vn2kHcm.Y > 500000, 
            `Chuyển đổi WGS84 -> VN2000 TP.HCM thành công (X=${vn2kHcm.X.toFixed(3)}, Y=${vn2kHcm.Y.toFixed(3)})`);

        // Chuyển ngược về WGS-84
        const wgsBackHcm = convertVn2kToWgs(vn2kHcm.X, vn2kHcm.Y, 105.75, 3.0);
        const errLat = Math.abs(wgsBackHcm.lat - latHcm);
        const errLng = Math.abs(wgsBackHcm.lng - lngHcm);
        assert(errLat < 1e-6 && errLng < 1e-6, 
            `Chuyển ngược VN2000 -> WGS84 bảo toàn độ chính xác < 0.1 mm (Sai số Lat=${errLat.toExponential(2)}, Lng=${errLng.toExponential(2)})`);

        // Mốc tại Hà Nội (KTT 105.0, Múi 3°)
        const latHn = 21.0285;
        const lngHn = 105.8542;
        const vn2kHn = convertWgsToVn2k(latHn, lngHn, 105.0, 3.0);
        const wgsBackHn = convertVn2kToWgs(vn2kHn.X, vn2kHn.Y, 105.0, 3.0);
        assert(Math.abs(wgsBackHn.lat - latHn) < 1e-6, `Chuyển đổi thuận nghịch Hà Nội chính xác tuyệt đối`);
    }

    // 2. Kiểm thử tính diện tích & chu vi hình học (Gauss-Shoelace)
    console.log('\n--- NHÓM 2: THUẬT TOÁN DIỆN TÍCH & CHU VI (GAUSS-SHOELACE) ---');
    {
        // Thửa đất hình vuông 100m x 100m => Diện tích 10,000 m2, Chu vi 400m
        const squarePoints = [
            { X: 1000.0, Y: 2000.0 },
            { X: 1100.0, Y: 2000.0 },
            { X: 1100.0, Y: 2100.0 },
            { X: 1000.0, Y: 2100.0 }
        ];
        const res = calculatePolygonAreaAndPerimeter(squarePoints);
        assert(Math.abs(res.area - 10000.0) < 1e-4, `Tính đúng diện tích hình vuông 100x100m = ${res.area} m²`);
        assert(Math.abs(res.perimeter - 400.0) < 1e-4, `Tính đúng chu vi hình vuông = ${res.perimeter} m`);

        // Tam giác vuông 30m x 40m => Diện tích 600 m2, Chu vi 120m
        const trianglePoints = [
            { X: 0, Y: 0 },
            { X: 30, Y: 0 },
            { X: 30, Y: 40 }
        ];
        const resTri = calculatePolygonAreaAndPerimeter(trianglePoints);
        assert(Math.abs(resTri.area - 600.0) < 1e-4, `Tính đúng diện tích tam giác vuông = ${resTri.area} m²`);
        assert(Math.abs(resTri.perimeter - 120.0) < 1e-4, `Tính đúng chu vi tam giác vuông = ${resTri.perimeter} m`);
    }

    // 3. Kiểm thử Rust-Style Result Pattern & Boundary Checks
    console.log('\n--- NHÓM 3: RUST-STYLE RESULT PATTERN & BOUNDARY CHECKS ---');
    {
        // Kiểm tra WGS84 hợp lệ trong VN
        const r1 = validateWgsCoordinates(10.5, 106.0);
        assert(r1.ok === true && r1.val.isInsideVietnam === true, `Xác nhận tọa độ hợp lệ trong lãnh thổ Việt Nam`);

        // Kiểm tra tọa độ ngoài lãnh thổ VN (vẫn ok nhưng có warning)
        const r2 = validateWgsCoordinates(48.8566, 2.3522); // Paris
        assert(r2.ok === true && r2.val.isInsideVietnam === false && r2.val.warning !== null, 
            `Cảnh báo chính xác khi tọa độ nằm ngoài lãnh thổ Việt Nam`);

        // Kiểm tra tọa độ không hợp lệ (vượt biên giới hạn)
        const r3 = validateWgsCoordinates(120.0, 50.0);
        assert(r3.ok === false && r3.err.includes('Vĩ độ vượt dải'), `Chặn bắt lỗi khi Vĩ độ > 90°`);

        // Kiểm tra số không hợp lệ
        const r4 = validateWgsCoordinates('abc', 105.0);
        assert(r4.ok === false && r4.err.includes('không hợp lệ'), `Chặn bắt lỗi khi đầu vào không phải là số`);
    }

    // 4. Kiểm thử phát hiện đa giác tự cắt chéo (Self-intersection)
    console.log('\n--- NHÓM 4: KIỂM SOÁT HÌNH HỌC ĐA GIÁC (SELF-INTERSECTION) ---');
    {
        // Đa giác lồi thông thường (không cắt chéo)
        const normalPoly = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10 },
            { x: 0, y: 10 }
        ];
        const checkNormal = checkPolygonSelfIntersection(normalPoly);
        assert(checkNormal.ok && !checkNormal.val.hasSelfIntersection, `Đa giác lồi hợp lệ không bị tự cắt chéo`);

        // Đa giác hình cánh bướm / đồng hồ cát (hourglass shape: 0,0 -> 10,10 -> 10,0 -> 0,10)
        const hourglassPoly = [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
            { x: 10, y: 0 },
            { x: 0, y: 10 }
        ];
        const checkHourglass = checkPolygonSelfIntersection(hourglassPoly);
        assert(checkHourglass.ok && checkHourglass.val.hasSelfIntersection === true, 
            `Phát hiện chuẩn xác đa giác tự cắt chéo hình cánh bướm (${checkHourglass.val.warning})`);
    }

    // 5. Kiểm thử khoảng cách và góc phương vị
    console.log('\n--- NHÓM 5: KHOẢNG CÁCH & PHƯƠNG VỊ TRẮC ĐỊA ---');
    {
        const distAz = calculateDistanceAndAzimuth(0, 0, 100, 100);
        assert(Math.abs(distAz.dist - 141.421356) < 1e-3, `Khoảng cách Pythagoras đúng: ${distAz.dist.toFixed(3)} m`);
        assert(Math.abs(distAz.azimuthDeg - 45.0) < 1e-3, `Góc phương vị đúng: ${distAz.azimuthDeg}° (Góc phần tư I)`);
    }

    console.log('\n====================================================');
    console.log(`🏁 TỔNG KẾT: ${passedTests}/${totalTests} KIỂM THỬ THÀNH CÔNG (${Math.round(passedTests/totalTests*100)}%)`);
    if (failedTests > 0) {
        console.error(`❌ CÓ ${failedTests} KIỂM THỬ THẤT BẠI!`);
        process.exit(1);
    } else {
        console.log(`🎉 TẤT CẢ CÁC CA KIỂM THỬ ĐÃ ĐẠT CHUẨN 100%!`);
    }
    console.log('====================================================\n');
}

runTests();
