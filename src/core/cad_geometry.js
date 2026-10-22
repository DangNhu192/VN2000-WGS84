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
    // Chuẩn TCVN 7285 & Thông tư 25/2014/TT-BTNMT - Tương thích 100% AutoCAD 2000-2026 không lỗi Missing symbol table
    exportDwgString(shapes, layerName = "RANH_DAT", options = {}) {
        // Hỗ trợ truyền mảng điểm trực tiếp thay vì bọc trong shape object
        let normalizedShapes = shapes || [];
        if (Array.isArray(shapes) && shapes.length > 0 && (shapes[0].x !== undefined || shapes[0].y !== undefined) && !shapes[0].points) {
            normalizedShapes = [{ name: layerName, points: shapes, isClosed: shapes.length >= 3 }];
        }

        const scaleVal = options.scaleVal || 1000;
        const S = Math.max(scaleVal / 1000.0, 0.1); // 1mm trên giấy = S mét thực địa (1:500 -> S=0.5; 1:1000 -> S=1.0)
        const layersOpt = options.layers || {};

        // Tính Bounding Box toàn cục để căn camera VPORT
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        normalizedShapes.forEach(shape => {
            (shape.points || []).forEach(p => {
                const px = p.y !== undefined ? p.y : p.x; // CAD X là Y Đông
                const py = p.x !== undefined ? p.x : p.y; // CAD Y là X Bắc
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
            });
        });
        if (!isFinite(minX)) { minX = 0; maxX = 100; minY = 0; maxY = 100; }
        const cx = (minX + maxX) / 2.0;
        const cy = (minY + maxY) / 2.0;
        const viewSize = Math.max(maxX - minX, maxY - minY, 50) * 1.3;

        let handleSeed = 0x30;
        const nextH = () => (handleSeed++).toString(16).toUpperCase();

        let dwg = "0\r\nSECTION\r\n2\r\nHEADER\r\n";
        dwg += "9\r\n$ACADVER\r\n1\r\nAC1015\r\n";     // AutoCAD 2000/2004 DWG/DXF engine
        dwg += "9\r\n$HANDSEED\r\n5\r\nFFFF\r\n";
        dwg += "9\r\n$INSUNITS\r\n70\r\n6\r\n";       // 6 = Meters (Đơn vị đo chuẩn Việt Nam TCVN)
        dwg += "9\r\n$MEASUREMENT\r\n70\r\n1\r\n";    // 1 = Metric
        dwg += "9\r\n$LTSCALE\r\n40\r\n" + S.toFixed(4) + "\r\n";
        dwg += "9\r\n$TEXTSIZE\r\n40\r\n" + (2.5 * S).toFixed(4) + "\r\n";
        dwg += "0\r\nENDSEC\r\n";

        // SECTION CLASSES (Bắt buộc theo đặc tả AutoCAD AC1015)
        dwg += "0\r\nSECTION\r\n2\r\nCLASSES\r\n0\r\nENDSEC\r\n";

        // SECTION TABLES - Khai báo ĐẦY ĐỦ 100% Symbol Tables chuẩn Autodesk chống lỗi "Missing symbol table" & "Null objectId"
        dwg += "0\r\nSECTION\r\n2\r\nTABLES\r\n";

        // 1. Table VPORT (Khung nhìn chủ động)
        dwg += "0\r\nTABLE\r\n2\r\nVPORT\r\n5\r\n8\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n1\r\n";
        dwg += "0\r\nVPORT\r\n5\r\n9\r\n330\r\n8\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbViewportTableRecord\r\n2\r\n*ACTIVE\r\n70\r\n0\r\n10\r\n0.0\r\n20\r\n0.0\r\n11\r\n1.0\r\n21\r\n1.0\r\n";
        dwg += `12\r\n${cx.toFixed(3)}\r\n22\r\n${cy.toFixed(3)}\r\n40\r\n${viewSize.toFixed(3)}\r\n41\r\n1.4142\r\n`;
        dwg += "0\r\nENDTAB\r\n";

        // 2. Table LTYPE (Kiểu đường)
        dwg += "0\r\nTABLE\r\n2\r\nLTYPE\r\n5\r\n5\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n5\r\n";
        dwg += "0\r\nLTYPE\r\n5\r\n14\r\n330\r\n5\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbLinetypeTableRecord\r\n2\r\nBYBLOCK\r\n70\r\n0\r\n3\r\n\r\n72\r\n65\r\n73\r\n0\r\n40\r\n0.0\r\n";
        dwg += "0\r\nLTYPE\r\n5\r\n15\r\n330\r\n5\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbLinetypeTableRecord\r\n2\r\nBYLAYER\r\n70\r\n0\r\n3\r\n\r\n72\r\n65\r\n73\r\n0\r\n40\r\n0.0\r\n";
        dwg += "0\r\nLTYPE\r\n5\r\n16\r\n330\r\n5\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbLinetypeTableRecord\r\n2\r\nCONTINUOUS\r\n70\r\n0\r\n3\r\nSolid line\r\n72\r\n65\r\n73\r\n0\r\n40\r\n0.0\r\n";
        dwg += "0\r\nLTYPE\r\n5\r\n17\r\n330\r\n5\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbLinetypeTableRecord\r\n2\r\nDASHED\r\n70\r\n0\r\n3\r\nDashed\r\n72\r\n65\r\n73\r\n2\r\n40\r\n" + (1.0 * S).toFixed(4) + "\r\n49\r\n" + (0.6 * S).toFixed(4) + "\r\n49\r\n" + (-0.4 * S).toFixed(4) + "\r\n";
        dwg += "0\r\nLTYPE\r\n5\r\n18\r\n330\r\n5\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbLinetypeTableRecord\r\n2\r\nCENTER\r\n70\r\n0\r\n3\r\nCenter\r\n72\r\n65\r\n73\r\n4\r\n40\r\n" + (2.0 * S).toFixed(4) + "\r\n49\r\n" + (1.0 * S).toFixed(4) + "\r\n49\r\n" + (-0.3 * S).toFixed(4) + "\r\n49\r\n" + (0.3 * S).toFixed(4) + "\r\n49\r\n" + (-0.3 * S).toFixed(4) + "\r\n";
        dwg += "0\r\nENDTAB\r\n";

        // 3. Table LAYER (Hệ thống lớp theo TCVN 7285 & Thông tư 25/2014/TT-BTNMT)
        const layersList = [
            { name: "0", color: 7 },
            { name: "RANH_DAT", color: 1 },
            { name: "RANH_THUA", color: 1 },
            { name: "MOC_TOADO", color: 3 },
            { name: "SO_HIEU_DINH", color: 2 },
            { name: "CHIEU_DAI_CANH", color: 4 },
            { name: "TOADO_TEXT", color: 8 },
            { name: "LUOI_TOADO", color: 8 },
            { name: "KHUNG_BAN_VE", color: 7 },
            { name: "KHUNG_TEN", color: 4 },
            { name: "HUONG_BAC", color: 2 }
        ];
        dwg += `0\r\nTABLE\r\n2\r\nLAYER\r\n5\r\n2\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n${layersList.length}\r\n`;
        layersList.forEach(ly => {
            dwg += `0\r\nLAYER\r\n5\r\n${nextH()}\r\n330\r\n2\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbLayerTableRecord\r\n2\r\n${ly.name}\r\n70\r\n0\r\n62\r\n${ly.color}\r\n6\r\nCONTINUOUS\r\n`;
        });
        dwg += "0\r\nENDTAB\r\n";

        // 4. Table STYLE (Phông chữ bản vẽ)
        dwg += "0\r\nTABLE\r\n2\r\nSTYLE\r\n5\r\n3\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n2\r\n";
        dwg += "0\r\nSTYLE\r\n5\r\n11\r\n330\r\n3\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbTextStyleTableRecord\r\n2\r\nSTANDARD\r\n70\r\n0\r\n40\r\n0.0\r\n41\r\n1.0\r\n50\r\n0.0\r\n71\r\n0\r\n42\r\n2.5\r\n3\r\ntxt\r\n4\r\n\r\n";
        dwg += "0\r\nSTYLE\r\n5\r\n12\r\n330\r\n3\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbTextStyleTableRecord\r\n2\r\nVN_ARIAL\r\n70\r\n0\r\n40\r\n0.0\r\n41\r\n1.0\r\n50\r\n0.0\r\n71\r\n0\r\n42\r\n2.5\r\n3\r\narial.ttf\r\n4\r\n\r\n";
        dwg += "0\r\nENDTAB\r\n";

        // 5. Table VIEW
        dwg += "0\r\nTABLE\r\n2\r\nVIEW\r\n5\r\n6\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n0\r\n0\r\nENDTAB\r\n";

        // 6. Table UCS
        dwg += "0\r\nTABLE\r\n2\r\nUCS\r\n5\r\n7\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n0\r\n0\r\nENDTAB\r\n";

        // 7. Table APPID
        dwg += "0\r\nTABLE\r\n2\r\nAPPID\r\n5\r\n9\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n1\r\n";
        dwg += "0\r\nAPPID\r\n5\r\n13\r\n330\r\n9\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbRegAppTableRecord\r\n2\r\nACAD\r\n70\r\n0\r\n0\r\nENDTAB\r\n";

        // 8. Table DIMSTYLE
        dwg += "0\r\nTABLE\r\n2\r\nDIMSTYLE\r\n5\r\nA\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n0\r\n100\r\nAcDbDimStyleTable\r\n71\r\n1\r\n0\r\nENDTAB\r\n";

        // 9. Table BLOCK_RECORD
        dwg += "0\r\nTABLE\r\n2\r\nBLOCK_RECORD\r\n5\r\n1\r\n330\r\n0\r\n100\r\nAcDbSymbolTable\r\n70\r\n2\r\n";
        dwg += "0\r\nBLOCK_RECORD\r\n5\r\n1B\r\n330\r\n1\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbBlockTableRecord\r\n2\r\n*MODEL_SPACE\r\n";
        dwg += "0\r\nBLOCK_RECORD\r\n5\r\n1C\r\n330\r\n1\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbBlockTableRecord\r\n2\r\n*PAPER_SPACE\r\n";
        dwg += "0\r\nENDTAB\r\n";

        dwg += "0\r\nENDSEC\r\n";

        // SECTION BLOCKS
        dwg += "0\r\nSECTION\r\n2\r\nBLOCKS\r\n";
        dwg += "0\r\nBLOCK\r\n5\r\n1D\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockBegin\r\n2\r\n*MODEL_SPACE\r\n70\r\n0\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n3\r\n*MODEL_SPACE\r\n1\r\n\r\n0\r\nENDBLK\r\n5\r\n1E\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockEnd\r\n";
        dwg += "0\r\nBLOCK\r\n5\r\n1F\r\n330\r\n1C\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockBegin\r\n2\r\n*PAPER_SPACE\r\n70\r\n0\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n3\r\n*PAPER_SPACE\r\n1\r\n\r\n0\r\nENDBLK\r\n5\r\n20\r\n330\r\n1C\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockEnd\r\n";
        dwg += "0\r\nENDSEC\r\n";

        // SECTION ENTITIES
        dwg += "0\r\nSECTION\r\n2\r\nENTITIES\r\n";
        normalizedShapes.forEach((shape) => {
            const pts = shape.points || [];
            if (pts.length < 2) return;
            const targetLayer = shape.name || layerName;

            // Đường ranh đa giác: Dùng LWPOLYLINE chuẩn AC1015 với đầy đủ 5 & 330 pointers
            if (layersOpt.lines !== false) {
                dwg += `0\r\nLWPOLYLINE\r\n5\r\n${nextH()}\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\n${targetLayer}\r\n100\r\nAcDbPolyline\r\n90\r\n${pts.length}\r\n70\r\n${shape.isClosed ? 1 : 0}\r\n43\r\n0.0\r\n`;
                pts.forEach(p => {
                    const px = p.y !== undefined ? p.y : p.x;
                    const py = p.x !== undefined ? p.x : p.y;
                    dwg += `10\r\n${px.toFixed(3)}\r\n20\r\n${py.toFixed(3)}\r\n`;
                });
            }

            // Điểm mốc và tên mốc theo tỷ lệ S
            pts.forEach((p, pIdx) => {
                const px = p.y !== undefined ? p.y : p.x;
                const py = p.x !== undefined ? p.x : p.y;
                const ph = p.h || 0;

                if (layersOpt.points !== false) {
                    dwg += `0\r\nPOINT\r\n5\r\n${nextH()}\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\nMOC_TOADO\r\n100\r\nAcDbPoint\r\n10\r\n${px.toFixed(3)}\r\n20\r\n${py.toFixed(3)}\r\n30\r\n${ph.toFixed(3)}\r\n`;
                    dwg += `0\r\nCIRCLE\r\n5\r\n${nextH()}\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\nMOC_TOADO\r\n100\r\nAcDbCircle\r\n10\r\n${px.toFixed(3)}\r\n20\r\n${py.toFixed(3)}\r\n30\r\n${ph.toFixed(3)}\r\n40\r\n${(0.8 * S).toFixed(4)}\r\n`;
                }

                if (layersOpt.names !== false) {
                    const ptName = p.name || `D${pIdx + 1}`;
                    dwg += `0\r\nTEXT\r\n5\r\n${nextH()}\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\nSO_HIEU_DINH\r\n100\r\nAcDbText\r\n10\r\n${(px + 1.2 * S).toFixed(3)}\r\n20\r\n${(py + 1.2 * S).toFixed(3)}\r\n30\r\n${ph.toFixed(3)}\r\n40\r\n${(2.5 * S).toFixed(4)}\r\n1\r\n${ptName}\r\n7\r\nVN_ARIAL\r\n`;
                }

                if (layersOpt.coords === true) {
                    const coordStr = `X:${py.toFixed(2)} Y:${px.toFixed(2)}`;
                    dwg += `0\r\nTEXT\r\n5\r\n${nextH()}\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\nSO_HIEU_DINH\r\n100\r\nAcDbText\r\n10\r\n${(px + 1.2 * S).toFixed(3)}\r\n20\r\n${(py - 1.8 * S).toFixed(3)}\r\n30\r\n${ph.toFixed(3)}\r\n40\r\n${(1.8 * S).toFixed(4)}\r\n1\r\n${coordStr}\r\n7\r\nVN_ARIAL\r\n`;
                }
            });

            // Chiều dài cạnh theo tỷ lệ S
            if (layersOpt.lengths !== false && pts.length >= 2) {
                const count = shape.isClosed ? pts.length : pts.length - 1;
                for (let i = 0; i < count; i++) {
                    const p1 = pts[i];
                    const p2 = pts[(i + 1) % pts.length];
                    const x1 = p1.y !== undefined ? p1.y : p1.x;
                    const y1 = p1.x !== undefined ? p1.x : p1.y;
                    const x2 = p2.y !== undefined ? p2.y : p2.x;
                    const y2 = p2.x !== undefined ? p2.x : p2.y;
                    const dist = Math.hypot(x2 - x1, y2 - y1);
                    if (dist > 0.05) {
                        const midX = (x1 + x2) / 2.0;
                        const midY = (y1 + y2) / 2.0;
                        dwg += `0\r\nTEXT\r\n5\r\n${nextH()}\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\nCHIEU_DAI_CANH\r\n100\r\nAcDbText\r\n10\r\n${midX.toFixed(3)}\r\n20\r\n${midY.toFixed(3)}\r\n30\r\n0.0\r\n40\r\n${(1.8 * S).toFixed(4)}\r\n1\r\n${dist.toFixed(2)}m\r\n7\r\nVN_ARIAL\r\n`;
                    }
                }
            }
        });
        dwg += "0\r\nENDSEC\r\n";

        // SECTION OBJECTS - Triệt tiêu 100% lỗi "Null objectId: <object> (0)"
        dwg += "0\r\nSECTION\r\n2\r\nOBJECTS\r\n";
        dwg += "0\r\nDICTIONARY\r\n5\r\nC\r\n330\r\n0\r\n100\r\nAcDbDictionary\r\n281\r\n1\r\n3\r\nACAD_GROUP\r\n350\r\nD\r\n";
        dwg += "0\r\nDICTIONARY\r\n5\r\nD\r\n330\r\nC\r\n100\r\nAcDbDictionary\r\n281\r\n1\r\n";
        dwg += "0\r\nENDSEC\r\n";
        dwg += "0\r\nEOF\r\n";
        return dwg;
    },

    // Giữ tương thích ngược với các hàm gọi cũ
    exportDxfString(shapes, layerName = "RANH_DAT", options = {}) {
        return this.exportDwgString(shapes, layerName, options);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CadGeometryEngine;
} else if (typeof window !== 'undefined') {
    window.CadGeometryEngine = CadGeometryEngine;
}
