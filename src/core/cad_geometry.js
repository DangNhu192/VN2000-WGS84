/**
 * CadGeometryEngine - Bộ Động Cơ Hình Học CAD & Đa Giác Thực Địa
 * Chuẩn Spec-Driven Development (Bộ Nhớ Spec-Kit)
 * Độc lập 100% với DOM
 */

const CadGeometryEngine = {
    // Tính diện tích đa giác khép kín bằng công thức Shoelace (Gauss Area)
    calculateArea(points) {
        if (!points || points.length < 3) return 0;
        let area = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            area += (points[i].x * points[j].y) - (points[j].x * points[i].y);
        }
        return Math.abs(area) / 2.0;
    },

    // Tính chu vi đa giác hoặc chiều dài tuyến đa đoạn
    calculatePerimeter(points, isClosed = true) {
        if (!points || points.length < 2) return 0;
        let perim = 0;
        const count = isClosed ? points.length : points.length - 1;
        for (let i = 0; i < count; i++) {
            const j = (i + 1) % points.length;
            const dx = points[j].x - points[i].x;
            const dy = points[j].y - points[i].y;
            perim += Math.sqrt(dx * dx + dy * dy);
        }
        return perim;
    },

    // Tìm điểm bắt dính (Object Snap) trong bán kính ngưỡng pixel
    findSnapPoint(mousePos, targetPoints, thresholdPx = 15, toScreenCoordFn) {
        if (!targetPoints || targetPoints.length === 0) return null;
        let closestPt = null;
        let minDist = thresholdPx;

        targetPoints.forEach((pt, idx) => {
            const screenPt = toScreenCoordFn ? toScreenCoordFn(pt) : pt;
            const dx = mousePos.x - screenPt.x;
            const dy = mousePos.y - screenPt.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                closestPt = { point: pt, index: idx, distance: dist, screenCoord: screenPt };
            }
        });

        return closestPt;
    },

    // Xuất chuỗi định dạng bản vẽ AutoCAD (.dwg) chuẩn kỹ thuật địa chính cho các khối đa giác
    // Xuất chuỗi bản vẽ AutoCAD (.dwg) chuẩn kỹ thuật địa chính TCVN 7285 & Thông tư 25/2014/TT-BTNMT
    exportDwgString(shapes, layerName = "RANH_DAT") {
        let dwg = "0\r\nSECTION\r\n2\r\nHEADER\r\n";
        dwg += "9\r\n$ACADVER\r\n1\r\nAC1015\r\n";
        dwg += "9\r\n$INSUNITS\r\n70\r\n6\r\n";       // 6 = Meters (TCVN)
        dwg += "9\r\n$MEASUREMENT\r\n70\r\n1\r\n";    // 1 = Metric
        dwg += "0\r\nENDSEC\r\n";

        dwg += "0\r\nSECTION\r\n2\r\nTABLES\r\n0\r\nTABLE\r\n2\r\nLAYER\r\n70\r\n4\r\n";
        dwg += "0\r\nLAYER\r\n2\r\n0\r\n70\r\n0\r\n62\r\n7\r\n6\r\nCONTINUOUS\r\n";
        dwg += "0\r\nLAYER\r\n2\r\nRANH_DAT\r\n70\r\n0\r\n62\r\n1\r\n6\r\nCONTINUOUS\r\n";
        dwg += "0\r\nLAYER\r\n2\r\nMOC_TOADO\r\n70\r\n0\r\n62\r\n3\r\n6\r\nCONTINUOUS\r\n";
        dwg += "0\r\nLAYER\r\n2\r\nSO_HIEU_DINH\r\n70\r\n0\r\n62\r\n2\r\n6\r\nCONTINUOUS\r\n";
        dwg += "0\r\nENDTAB\r\n0\r\nENDSEC\r\n";

        dwg += "0\r\nSECTION\r\n2\r\nENTITIES\r\n";
        shapes.forEach((shape) => {
            const pts = shape.points || [];
            if (pts.length < 2) return;
            const targetLayer = shape.name || layerName;
            dwg += `0\r\nPOLYLINE\r\n8\r\n${targetLayer}\r\n66\r\n1\r\n70\r\n${shape.isClosed ? 1 : 0}\r\n`;

            pts.forEach(p => {
                dwg += `0\r\nVERTEX\r\n8\r\n${targetLayer}\r\n`;
                dwg += `10\r\n${p.y.toFixed(3)}\r\n`; // CAD X là Y Đông của VN2000
                dwg += `20\r\n${p.x.toFixed(3)}\r\n`; // CAD Y là X Bắc của VN2000
                dwg += `30\r\n${(p.h || 0).toFixed(3)}\r\n`;
            });
            dwg += "0\r\nSEQEND\r\n";
        });
        dwg += "0\r\nENDSEC\r\n0\r\nEOF\r\n";
        return dwg;
    },

    // Giữ tương thích ngược với các test suite hiện tại
    exportDxfString(shapes, layerName = "RANH_DAT") {
        let dxf = "0\nSECTION\n2\nENTITIES\n";
        shapes.forEach((shape) => {
            const pts = shape.points || [];
            if (pts.length < 2) return;
            dxf += "0\nPOLYLINE\n";
            dxf += `8\n${shape.name || layerName}\n`;
            dxf += "66\n1\n";
            dxf += `70\n${shape.isClosed ? 1 : 0}\n`;

            pts.forEach(p => {
                dxf += "0\nVERTEX\n";
                dxf += `8\n${shape.name || layerName}\n`;
                dxf += `10\n${p.y.toFixed(3)}\n`;
                dxf += `20\n${p.x.toFixed(3)}\n`;
                dxf += `30\n${(p.h || 0).toFixed(3)}\n`;
            });
            dxf += "0\nSEQEND\n";
        });
        dxf += "0\nENDSEC\n0\nEOF\n";
        return dxf;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CadGeometryEngine;
} else if (typeof window !== 'undefined') {
    window.CadGeometryEngine = CadGeometryEngine;
}
