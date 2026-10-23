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

    // Chuyển đổi ký tự tiếng Việt sang ASCII an toàn cho AutoCAD/MicroStation
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

    // Xuất chuỗi định dạng bản vẽ AutoCAD (.dwg / .dxf) chuẩn kỹ thuật địa chính cho các khối đa giác
    // Chuẩn TCVN 7285 & Thông tư 25/2014/TT-BTNMT - Tương thích 100% AutoCAD 2000-2026 không lỗi Missing symbol table
    exportDwgString(shapes, layerName = "RANH_DAT", options = {}) {
        // Hỗ trợ truyền mảng điểm trực tiếp thay vì bọc trong shape object
        let normalizedShapes = shapes || [];
        if (Array.isArray(shapes) && shapes.length > 0 && (shapes[0].x !== undefined || shapes[0].y !== undefined) && !shapes[0].points) {
            normalizedShapes = [{ name: layerName, points: shapes, isClosed: shapes.length >= 3 }];
        }

        const scaleVal = options.scaleVal || options.scale || 1000;
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
        dwg += "9\r\n$DWGCODEPAGE\r\n3\r\nANSI_1252\r\n";
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
        dwg += "0\r\nVPORT\r\n5\r\n10\r\n330\r\n8\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbViewportTableRecord\r\n2\r\n*ACTIVE\r\n70\r\n0\r\n10\r\n0.0\r\n20\r\n0.0\r\n11\r\n1.0\r\n21\r\n1.0\r\n";
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
        dwg += "0\r\nBLOCK_RECORD\r\n5\r\n1B\r\n330\r\n1\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbBlockTableRecord\r\n2\r\n*MODEL_SPACE\r\n70\r\n0\r\n";
        dwg += "0\r\nBLOCK_RECORD\r\n5\r\n1C\r\n330\r\n1\r\n100\r\nAcDbSymbolTableRecord\r\n100\r\nAcDbBlockTableRecord\r\n2\r\n*PAPER_SPACE\r\n70\r\n0\r\n";
        dwg += "0\r\nENDTAB\r\n";

        dwg += "0\r\nENDSEC\r\n";

        // SECTION BLOCKS
        dwg += "0\r\nSECTION\r\n2\r\nBLOCKS\r\n";
        dwg += "0\r\nBLOCK\r\n5\r\n1D\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockBegin\r\n2\r\n*MODEL_SPACE\r\n70\r\n0\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n3\r\n*MODEL_SPACE\r\n1\r\n \r\n0\r\nENDBLK\r\n5\r\n1E\r\n330\r\n1B\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockEnd\r\n";
        dwg += "0\r\nBLOCK\r\n5\r\n1F\r\n330\r\n1C\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockBegin\r\n2\r\n*PAPER_SPACE\r\n70\r\n0\r\n10\r\n0.0\r\n20\r\n0.0\r\n30\r\n0.0\r\n3\r\n*PAPER_SPACE\r\n1\r\n \r\n0\r\nENDBLK\r\n5\r\n20\r\n330\r\n1C\r\n100\r\nAcDbEntity\r\n8\r\n0\r\n100\r\nAcDbBlockEnd\r\n";
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
                    const ptName = this.toCadAscii(p.name || `D${pIdx + 1}`);
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
        dwg += "0\r\nDICTIONARY\r\n5\r\nC\r\n330\r\n0\r\n100\r\nAcDbDictionary\r\n3\r\nACAD_GROUP\r\n350\r\nD\r\n";
        dwg += "0\r\nDICTIONARY\r\n5\r\nD\r\n330\r\nC\r\n100\r\nAcDbDictionary\r\n";
        dwg += "0\r\nENDSEC\r\n";
        dwg += "0\r\nEOF\r\n";
        return dwg;
    },

    // Giữ tương thích ngược với các hàm gọi cũ
    exportDxfString(shapes, layerName = "RANH_DAT", options = {}) {
        return this.exportDwgString(shapes, layerName, options);
    },

    // =========================================================================
    // THUẬT TOÁN HÌNH HỌC 2D NÂNG CAO CHO ĐỊA CHÍNH & KHẢO SÁT THỰC ĐỊA
    // =========================================================================

    // Tính giao điểm giữa 2 đoạn thẳng p1-p2 và p3-p4
    intersectSegments(p1, p2, p3, p4) {
        const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (Math.abs(denom) < 1e-9) return null; // Song song hoặc trùng nhau

        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            return {
                x: p1.x + ua * (p2.x - p1.x),
                y: p1.y + ua * (p2.y - p1.y),
                ua,
                ub
            };
        }
        return null;
    },

    // Tính giao điểm của đường thẳng vô hạn đi qua lineP1-lineP2 với đoạn thẳng segA-segB
    intersectLineWithSegment(lineP1, lineP2, segA, segB) {
        const dxL = lineP2.x - lineP1.x;
        const dyL = lineP2.y - lineP1.y;
        const dxS = segB.x - segA.x;
        const dyS = segB.y - segA.y;

        const denom = dyL * dxS - dxL * dyS;
        if (Math.abs(denom) < 1e-9) return null; // Song song

        const t = (dxL * (segA.y - lineP1.y) - dyL * (segA.x - lineP1.x)) / denom;
        if (t >= -1e-6 && t <= 1 + 1e-6) {
            const clampedT = Math.max(0, Math.min(1, t));
            return {
                x: segA.x + clampedT * dxS,
                y: segA.y + clampedT * dyS,
                t: clampedT
            };
        }
        return null;
    },

    // TÁCH THỬA ĐẤT: Chia đa giác khép kín thành 2 đa giác con qua đường cắt 2 điểm
    splitPolygon(polygonPoints, cutP1, cutP2) {
        if (!polygonPoints || polygonPoints.length < 3) {
            return { success: false, error: 'Đa giác phải có tối thiểu 3 đỉnh để tách thửa' };
        }
        if (!cutP1 || !cutP2) {
            return { success: false, error: 'Cần chỉ định đủ 2 điểm mốc xác định đường cắt' };
        }

        const n = polygonPoints.length;
        const hits = [];

        // Tìm tất cả các giao điểm của đường cắt với các cạnh đa giác
        for (let i = 0; i < n; i++) {
            const a = polygonPoints[i];
            const b = polygonPoints[(i + 1) % n];
            const hit = this.intersectLineWithSegment(cutP1, cutP2, a, b);
            if (hit) {
                // Kiểm tra trùng lặp với giao điểm đã tìm thấy trước đó
                const isDuplicate = hits.some(h => Math.hypot(h.x - hit.x, h.y - hit.y) < 1e-3);
                if (!isDuplicate) {
                    // Nội suy các thuộc tính khác (lat, lng, h) theo tỉ lệ t
                    const lat = (a.lat !== undefined && b.lat !== undefined) ? a.lat + hit.t * (b.lat - a.lat) : undefined;
                    const lng = (a.lng !== undefined && b.lng !== undefined) ? a.lng + hit.t * (b.lng - a.lng) : undefined;
                    const h = (a.h !== undefined && b.h !== undefined) ? a.h + hit.t * (b.h - a.h) : 0;

                    hits.push({
                        edgeIndex: i,
                        t: hit.t,
                        x: parseFloat(hit.x.toFixed(3)),
                        y: parseFloat(hit.y.toFixed(3)),
                        lat,
                        lng,
                        h,
                        name: `M${hits.length + 1}`
                    });
                }
            }
        }

        if (hits.length < 2) {
            return {
                success: false,
                error: 'Đường cắt không cắt xuyên qua thửa đất (cần cắt qua ít nhất 2 cạnh). Hãy kiểm tra lại hướng cắt!'
            };
        }

        // Lấy 2 giao điểm đầu tiên (sắp xếp theo thứ tự cạnh)
        hits.sort((h1, h2) => h1.edgeIndex - h2.edgeIndex || h1.t - h2.t);
        const hit1 = hits[0];
        const hit2 = hits[1];

        // Nếu 2 giao điểm cùng nằm trên 1 cạnh thì không tách được
        if (hit1.edgeIndex === hit2.edgeIndex) {
            return { success: false, error: 'Hai điểm cắt nằm trên cùng một cạnh, không thể tách thửa!' };
        }

        // Tạo 2 đa giác con
        // Đa giác con A: [0 .. hit1.edgeIndex] -> hit1 -> hit2 -> [(hit2.edgeIndex + 1) .. n - 1]
        const polyA = [];
        for (let i = 0; i <= hit1.edgeIndex; i++) {
            polyA.push({ ...polygonPoints[i] });
        }
        polyA.push({ ...hit1, name: `Ranh_T1` });
        polyA.push({ ...hit2, name: `Ranh_T2` });
        for (let i = hit2.edgeIndex + 1; i < n; i++) {
            polyA.push({ ...polygonPoints[i] });
        }

        // Đa giác con B: hit1 -> [hit1.edgeIndex + 1 .. hit2.edgeIndex] -> hit2
        const polyB = [];
        polyB.push({ ...hit1, name: `Ranh_T1` });
        for (let i = hit1.edgeIndex + 1; i <= hit2.edgeIndex; i++) {
            polyB.push({ ...polygonPoints[i] });
        }
        polyB.push({ ...hit2, name: `Ranh_T2` });

        // Đánh lại số thứ tự tên đỉnh chuẩn địa chính
        polyA.forEach((pt, idx) => { pt.name = `Đ${idx + 1}`; });
        polyB.forEach((pt, idx) => { pt.name = `Đ${idx + 1}`; });

        const areaA = this.calculateArea(polyA);
        const areaB = this.calculateArea(polyB);
        const perimA = this.calculatePerimeter(polyA, true);
        const perimB = this.calculatePerimeter(polyB, true);

        return {
            success: true,
            polygonA: polyA,
            polygonB: polyB,
            areaA,
            areaB,
            perimA,
            perimB,
            intersections: [hit1, hit2]
        };
    },

    // HỢP THỬA ĐẤT: Gộp 2 thửa liền kề có cạnh tiếp giáp thành 1 thửa bao ngoài
    mergePolygons(polyA, polyB, tolerance = 0.08) {
        if (!polyA || polyA.length < 3 || !polyB || polyB.length < 3) {
            return { success: false, error: 'Cả hai thửa đất phải có tối thiểu 3 đỉnh khép kín' };
        }

        const isPtMatch = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y) <= tolerance;

        // Tìm các cặp đỉnh tiếp xúc giữa PolyA và PolyB
        const contactPairs = [];
        polyA.forEach((pa, idxA) => {
            polyB.forEach((pb, idxB) => {
                if (isPtMatch(pa, pb)) {
                    contactPairs.push({ idxA, idxB });
                }
            });
        });

        if (contactPairs.length < 2) {
            return {
                success: false,
                error: 'Hai thửa đất không có cạnh tiếp giáp liền kề (cần tối thiểu 2 đỉnh chung ranh giới để hợp thửa)!'
            };
        }

        // Tìm đoạn cạnh chung liên tiếp trên polyA và polyB
        const c1 = contactPairs[0];
        const c2 = contactPairs[1];

        let startA = c1.idxA;
        let endA = c2.idxA;
        let startB = c1.idxB;
        let endB = c2.idxB;

        if ((endA - startA + polyA.length) % polyA.length > polyA.length / 2) {
            const tmp = startA; startA = endA; endA = tmp;
            const tmpB = startB; startB = endB; endB = tmpB;
        }

        // Đi theo viền ngoài polyA từ endA đến startA
        const merged = [];
        let currA = endA;
        while (true) {
            merged.push({ ...polyA[currA] });
            if (currA === startA) break;
            currA = (currA + 1) % polyA.length;
        }

        // Đi tiếp qua viền ngoài polyB từ startB đến endB (chọn chiều không trùng với cạnh chung)
        const stepB = (endB === (startB + 1) % polyB.length) ? -1 : 1;
        let currB = (startB + stepB + polyB.length) % polyB.length;
        while (currB !== endB) {
            if (!polyA.some(pa => isPtMatch(pa, polyB[currB]))) {
                merged.push({ ...polyB[currB] });
            }
            currB = (currB + stepB + polyB.length) % polyB.length;
        }

        // Khử các điểm trùng lặp liên tiếp
        const cleaned = [];
        for (let i = 0; i < merged.length; i++) {
            const next = merged[(i + 1) % merged.length];
            if (!isPtMatch(merged[i], next)) {
                cleaned.push(merged[i]);
            }
        }

        if (cleaned.length < 3) {
            return { success: false, error: 'Lỗi hình học: Không tạo được đa giác bao ngoài hợp lệ' };
        }

        // Đánh lại số hiệu đỉnh
        cleaned.forEach((pt, idx) => { pt.name = `Đ${idx + 1}`; });
        const totalArea = this.calculateArea(cleaned);
        const perim = this.calculatePerimeter(cleaned, true);

        return {
            success: true,
            mergedPolygon: cleaned,
            totalArea,
            perimeter: perim
        };
    },

    // CẮT XÉN RANH (TRIM [TR]): Xén bớt đoạn thẳng vượt quá ranh giới cắt
    trimLine(linePoints, cuttingPoints, clickNearPoint = null) {
        if (!linePoints || linePoints.length < 2) {
            return { success: false, error: 'Tuyến cần cắt phải có ít nhất 2 điểm' };
        }
        if (!cuttingPoints || cuttingPoints.length < 2) {
            return { success: false, error: 'Đường ranh giới cắt cần tối thiểu 2 điểm' };
        }

        let bestHit = null;
        let cutSegIdx = -1;

        // Tìm giao điểm đầu tiên giữa tuyến và đường ranh cắt
        for (let i = 0; i < linePoints.length - 1; i++) {
            const p1 = linePoints[i];
            const p2 = linePoints[i + 1];
            for (let j = 0; j < cuttingPoints.length - 1; j++) {
                const c1 = cuttingPoints[j];
                const c2 = cuttingPoints[j + 1];
                const hit = this.intersectSegments(p1, p2, c1, c2);
                if (hit) {
                    bestHit = hit;
                    cutSegIdx = i;
                    break;
                }
            }
            if (bestHit) break;
        }

        if (!bestHit) {
            return { success: false, error: 'Đường ranh giới không giao cắt với tuyến thẳng đã chọn!' };
        }

        // Chia tuyến thành 2 phần: phần đầu và phần đuôi tại điểm giao cắt
        const headPart = linePoints.slice(0, cutSegIdx + 1);
        headPart.push({
            x: parseFloat(bestHit.x.toFixed(3)),
            y: parseFloat(bestHit.y.toFixed(3)),
            name: 'Giao_Xen'
        });

        const tailPart = [{
            x: parseFloat(bestHit.x.toFixed(3)),
            y: parseFloat(bestHit.y.toFixed(3)),
            name: 'Giao_Xen'
        }, ...linePoints.slice(cutSegIdx + 1)];

        // Nếu có clickNearPoint, xóa phần gần clickNearPoint hơn, giữ lại phần kia
        let resultLine = headPart;
        if (clickNearPoint) {
            const distHead = Math.hypot(linePoints[0].x - clickNearPoint.x, linePoints[0].y - clickNearPoint.y);
            const distTail = Math.hypot(linePoints[linePoints.length - 1].x - clickNearPoint.x, linePoints[linePoints.length - 1].y - clickNearPoint.y);
            resultLine = distTail < distHead ? headPart : tailPart;
        }

        return {
            success: true,
            trimmedLine: resultLine,
            intersection: bestHit
        };
    },

    // KÉO DÀI RANH (EXTEND [EX]): Phóng dài đoạn thẳng tới chạm vào ranh giới đích
    extendLine(linePoints, boundaryPoints, maxExtendMeters = 500) {
        if (!linePoints || linePoints.length < 2) {
            return { success: false, error: 'Tuyến cần kéo dài phải có tối thiểu 2 điểm' };
        }
        if (!boundaryPoints || boundaryPoints.length < 2) {
            return { success: false, error: 'Ranh giới đích phải có tối thiểu 2 điểm' };
        }

        const pPrev = linePoints[linePoints.length - 2];
        const pLast = linePoints[linePoints.length - 1];

        const dx = pLast.x - pPrev.x;
        const dy = pLast.y - pPrev.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-4) return { success: false, error: 'Đoạn cuối của tuyến quá ngắn, không xác định được hướng' };

        const ux = dx / len;
        const uy = dy / len;

        // Tạo điểm kéo dài xa về phía trước
        const pFar = {
            x: pLast.x + ux * maxExtendMeters,
            y: pLast.y + uy * maxExtendMeters
        };

        // Tìm giao điểm gần nhất với các cạnh của ranh giới đích
        let closestHit = null;
        let minDist = Infinity;
        const numBounds = boundaryPoints.length;

        for (let i = 0; i < numBounds; i++) {
            const b1 = boundaryPoints[i];
            const b2 = boundaryPoints[(i + 1) % numBounds];
            const hit = this.intersectSegments(pLast, pFar, b1, b2);
            if (hit) {
                const d = Math.hypot(hit.x - pLast.x, hit.y - pLast.y);
                if (d > 1e-3 && d < minDist) {
                    minDist = d;
                    closestHit = hit;
                }
            }
        }

        if (!closestHit) {
            return { success: false, error: 'Không tìm thấy điểm giao cắt trên ranh giới đích trong phạm vi kéo dài!' };
        }

        const extended = [...linePoints];
        extended.push({
            x: parseFloat(closestHit.x.toFixed(3)),
            y: parseFloat(closestHit.y.toFixed(3)),
            name: `Đ_${extended.length + 1}`
        });

        return {
            success: true,
            extendedLine: extended,
            intersection: closestHit,
            extendDistance: minDist
        };
    },

    // DÓNG ĐIỂM MỞ RỘNG (POLAR / EXTENSION TRACKING): Tính điểm dóng trên phương kéo dài cạnh
    getPolarExtensionPoint(p1, p2, mousePt, maxDist = 300, angleTolDeg = 2.5) {
        if (!p1 || !p2 || !mousePt) return null;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1e-4) return null;

        const ux = dx / len;
        const uy = dy / len;

        const wX = mousePt.x - p2.x;
        const wY = mousePt.y - p2.y;

        // Chiếu lên phương kéo dài vector p1->p2
        const proj = wX * ux + wY * uy;

        // Chỉ xét khi con trỏ chuột nằm phía trước điểm p2 (phương kéo dài)
        if (proj <= 0.1 || proj > maxDist) return null;

        // Điểm hình chiếu trên đường thẳng
        const projX = p2.x + proj * ux;
        const projY = p2.y + proj * uy;

        // Khoảng cách vuông góc từ chuột tới đường dóng
        const perpDist = Math.hypot(mousePt.x - projX, mousePt.y - projY);

        // Góc lệch
        const mouseLen = Math.hypot(wX, wY);
        const angleRad = Math.asin(Math.min(1.0, perpDist / mouseLen));
        const angleDeg = (angleRad * 180.0) / Math.PI;

        if (angleDeg <= angleTolDeg || perpDist <= 0.8) {
            // Tính góc phương vị toán học (0° = Bắc, 90° = Đông)
            let az = (Math.atan2(dx, dy) * 180.0) / Math.PI;
            if (az < 0) az += 360.0;

            return {
                isAligned: true,
                point: { x: parseFloat(projX.toFixed(3)), y: parseFloat(projY.toFixed(3)) },
                extensionDistance: parseFloat(proj.toFixed(2)),
                azimuthDeg: parseFloat(az.toFixed(1)),
                perpDist: parseFloat(perpDist.toFixed(3))
            };
        }

        return null;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CadGeometryEngine;
} else if (typeof window !== 'undefined') {
    window.CadGeometryEngine = CadGeometryEngine;
}
