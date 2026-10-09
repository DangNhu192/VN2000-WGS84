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

    // Xuất chuỗi định dạng AutoCAD DXF R12 cho các khối đa giác
    exportDxfString(shapes, layerName = "RANH_DAT") {
        let dxf = "0\nSECTION\n2\nENTITIES\n";
        shapes.forEach((shape, sIdx) => {
            const pts = shape.points || [];
            if (pts.length < 2) return;
            dxf += "0\nPOLYLINE\n";
            dxf += `8\n${shape.name || layerName}\n`;
            dxf += "66\n1\n";
            dxf += `70\n${shape.isClosed ? 1 : 0}\n`;

            pts.forEach(p => {
                dxf += "0\nVERTEX\n";
                dxf += `8\n${shape.name || layerName}\n`;
                dxf += `10\n${p.y.toFixed(3)}\n`; // DXF AutoCAD X thường là Trục Y Đông của VN2000
                dxf += `20\n${p.x.toFixed(3)}\n`; // DXF AutoCAD Y là Trục X Bắc của VN2000
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
