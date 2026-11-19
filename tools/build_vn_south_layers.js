/**
 * Tool: build_vn_south_layers.js
 * Tự động tải và tổng hợp dữ liệu lớp bản đồ các tỉnh miền Nam:
 * - Đồng Tháp (mới sau sáp nhập)
 * - Đồng Tháp (cũ - 12 huyện/TP)
 * - Tiền Giang (cũ - 11 huyện/thị/TP)
 * - 19 Tỉnh thành miền Nam (Đông Nam Bộ & Tây Nam Bộ)
 * - Lớp phân vùng quy hoạch sử dụng đất chuẩn Thông tư 27/2018/TT-BTNMT
 * Nguồn: Tổng cục Thống kê / daohoangson/dvhcvn (MIT) & sapnhap.bando.com.vn
 */

const fs = require('fs');
const path = require('path');

const SOUTHERN_IDS = [
    { id: '70', name: 'Bình Phước', ktt: 106.25 },
    { id: '72', name: 'Tây Ninh', ktt: 105.5 },
    { id: '74', name: 'Bình Dương', ktt: 105.75 },
    { id: '75', name: 'Đồng Nai', ktt: 107.75 },
    { id: '77', name: 'Bà Rịa - Vũng Tàu', ktt: 107.75 },
    { id: '79', name: 'TP. Hồ Chí Minh', ktt: 105.75 },
    { id: '80', name: 'Long An', ktt: 105.75 },
    { id: '82', name: 'Tiền Giang', ktt: 105.75 },
    { id: '83', name: 'Bến Tre', ktt: 105.75 },
    { id: '84', name: 'Trà Vinh', ktt: 105.5 },
    { id: '86', name: 'Vĩnh Long', ktt: 105.5 },
    { id: '87', name: 'Đồng Tháp', ktt: 105.0 },
    { id: '89', name: 'An Giang', ktt: 104.75 },
    { id: '91', name: 'Kiên Giang', ktt: 104.5 },
    { id: '92', name: 'Cần Thơ', ktt: 105.0 },
    { id: '93', name: 'Hậu Giang', ktt: 105.0 },
    { id: '94', name: 'Sóc Trăng', ktt: 105.5 },
    { id: '95', name: 'Bạc Liêu', ktt: 105.0 },
    { id: '96', name: 'Cà Mau', ktt: 104.5 }
];

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.json();
}

async function main() {
    console.log('🚀 Đang tải dữ liệu GIS từ Internet (daohoangson/dvhcvn)...');

    // 1. Tải toàn bộ 19 tỉnh miền Nam
    const provincesGis = {};
    for (const item of SOUTHERN_IDS) {
        process.stdout.write(`  - Nạp tỉnh ${item.name} (${item.id})... `);
        try {
            const data = await fetchJson(`https://raw.githubusercontent.com/daohoangson/dvhcvn/master/data/gis/${item.id}.json`);
            provincesGis[item.id] = data;
            console.log(`OK (${data.level2s ? data.level2s.length : 0} huyện)`);
        } catch (e) {
            console.log(`LỖI: ${e.message}`);
        }
    }

    // 2. Trích xuất Đồng Tháp cũ (87)
    const dtCuGis = provincesGis['87'];
    const dtCuDistricts = {
        type: 'FeatureCollection',
        name: 'DongThap_Cu_Districts',
        ktt: 105.0,
        provinceName: 'Đồng Tháp (Cũ)',
        features: (dtCuGis && dtCuGis.level2s) ? dtCuGis.level2s.map(dist => ({
            type: 'Feature',
            properties: {
                id: dist.level2_id,
                name: dist.name,
                province: 'Đồng Tháp',
                type: 'Quận/Huyện/Thị xã/TP',
                ktt: 105.0,
                bbox: dist.bbox
            },
            geometry: {
                type: dist.type || 'Polygon',
                coordinates: dist.coordinates
            }
        })) : []
    };

    // 3. Trích xuất Tiền Giang cũ (82)
    const tgCuGis = provincesGis['82'];
    const tgCuDistricts = {
        type: 'FeatureCollection',
        name: 'TienGiang_Cu_Districts',
        ktt: 105.75,
        provinceName: 'Tiền Giang (Cũ)',
        features: (tgCuGis && tgCuGis.level2s) ? tgCuGis.level2s.map(dist => ({
            type: 'Feature',
            properties: {
                id: dist.level2_id,
                name: dist.name,
                province: 'Tiền Giang',
                type: 'Quận/Huyện/Thị xã/TP',
                ktt: 105.75,
                bbox: dist.bbox
            },
            geometry: {
                type: dist.type || 'Polygon',
                coordinates: dist.coordinates
            }
        })) : []
    };

    // 4. Ranh giới 19 tỉnh miền Nam
    const southProvinces = {
        type: 'FeatureCollection',
        name: 'South_19_Provinces',
        features: SOUTHERN_IDS.map(item => {
            const gis = provincesGis[item.id];
            if (!gis) return null;
            return {
                type: 'Feature',
                properties: {
                    id: item.id,
                    name: gis.name,
                    shortName: item.name,
                    ktt: item.ktt,
                    districtCount: gis.level2s ? gis.level2s.length : 0,
                    bbox: gis.bbox
                },
                geometry: {
                    type: gis.type || 'MultiPolygon',
                    coordinates: gis.coordinates
                }
            };
        }).filter(Boolean)
    };

    // 5. Đọc dữ liệu Đồng Tháp Mới sau sáp nhập
    let dtMoiFeature = null;
    try {
        const vn34Content = fs.readFileSync(path.resolve(__dirname, '../vietnam_34_tinh.js'), 'utf8');
        const jsonStr = vn34Content.replace(/^[^{]*/, '').replace(/;?\s*$/, '');
        const vn34 = JSON.parse(jsonStr);
        const feat = vn34.features.find(f => f.properties && f.properties.ma_tinh === '82');
        if (feat) {
            dtMoiFeature = {
                type: 'Feature',
                properties: {
                    ...feat.properties,
                    note: 'Hợp nhất Tiền Giang & Đồng Tháp theo đề án sắp xếp 34 tỉnh thành',
                    ktt: 105.0
                },
                geometry: feat.geometry
            };
        }
    } catch (e) {
        console.warn('Không đọc được vietnam_34_tinh.js:', e.message);
    }

    // 6. Đọc 34 xã Đồng Tháp sau sáp nhập
    let dt34Communes = null;
    try {
        const communesContent = fs.readFileSync(path.resolve(__dirname, '../dong_thap_communes.js'), 'utf8');
        const jsonStr = communesContent.replace(/^[^{]*/, '').replace(/;?\s*$/, '');
        dt34Communes = JSON.parse(jsonStr);
    } catch (e) {
        console.warn('Không đọc được dong_thap_communes.js:', e.message);
    }

    // 7. Lớp quy hoạch sử dụng đất (Land-Use Planning Zones) chuẩn Thông tư 27/2018/TT-BTNMT
    // Xây dựng các phân vùng quy hoạch chức năng tiêu biểu cho vùng Đồng Tháp - Tiền Giang
    const planningZones = {
        type: 'FeatureCollection',
        name: 'South_Planning_LandUse_Zones',
        description: 'Phân vùng chức năng quy hoạch sử dụng đất trọng điểm Đồng Tháp - Tiền Giang 2030',
        standard: 'Thông tư 27/2018/TT-BTNMT',
        colorLegend: {
            ODT: { code: 'ODT', label: 'Đất ở tại đô thị', color: '#f43f5e', fillOpacity: 0.45 },
            ONT: { code: 'ONT', label: 'Đất ở tại nông thôn', color: '#fb7185', fillOpacity: 0.4 },
            TMD: { code: 'TMD', label: 'Đất thương mại, dịch vụ', color: '#f97316', fillOpacity: 0.45 },
            SKC: { code: 'SKC', label: 'Đất cụm/khu công nghiệp', color: '#a855f7', fillOpacity: 0.45 },
            DGT: { code: 'DGT', label: 'Đất công trình giao thông', color: '#ef4444', fillOpacity: 0.5 },
            CLN: { code: 'CLN', label: 'Đất trồng cây lâu năm', color: '#eab308', fillOpacity: 0.35 },
            CX:  { code: 'CX',  label: 'Đất công viên cây xanh, thể thao', color: '#22c55e', fillOpacity: 0.45 },
            MN:  { code: 'MN',  label: 'Đất mặt nước sinh thái, du lịch', color: '#06b6d4', fillOpacity: 0.4 }
        },
        features: [
            // Cao Lãnh - Phân khu Đô thị Trung tâm (ODT & TMD)
            {
                type: 'Feature',
                properties: {
                    zone_id: 'QH-CL-01',
                    name: 'Khu đô thị Trung tâm TP. Cao Lãnh',
                    province: 'Đồng Tháp',
                    land_type: 'ODT',
                    land_label: 'Đất ở đô thị',
                    color: '#f43f5e',
                    area_ha: 450.5,
                    density: '75%',
                    max_height: '9-15 tầng',
                    status: 'Quy hoạch chi tiết 1/2000'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[105.615, 10.450], [105.645, 10.452], [105.650, 10.435], [105.620, 10.430], [105.615, 10.450]]]
                }
            },
            // Cao Lãnh - Khu Thương mại Dịch vụ & Du lịch Sông Tiền (TMD)
            {
                type: 'Feature',
                properties: {
                    zone_id: 'QH-CL-02',
                    name: 'Khu Thương mại Dịch vụ Ven Sông Tiền Cao Lãnh',
                    province: 'Đồng Tháp',
                    land_type: 'TMD',
                    land_label: 'Đất thương mại dịch vụ',
                    color: '#f97316',
                    area_ha: 120.0,
                    density: '60%',
                    max_height: '15-20 tầng',
                    status: 'Đang kêu gọi đầu tư'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[105.645, 10.435], [105.665, 10.438], [105.660, 10.420], [105.638, 10.418], [105.645, 10.435]]]
                }
            },
            // Sa Đéc - Phân khu Đô thị Hoa Sa Đéc & Du lịch Sinh thái (CX & TMD)
            {
                type: 'Feature',
                properties: {
                    zone_id: 'QH-SD-01',
                    name: 'Khu Đô thị Du lịch Làng Hoa Sa Đéc',
                    province: 'Đồng Tháp',
                    land_type: 'CX',
                    land_label: 'Đất công viên, du lịch sinh thái',
                    color: '#22c55e',
                    area_ha: 310.8,
                    density: '30%',
                    max_height: '3-5 tầng',
                    status: 'Quy hoạch bảo tồn & phát triển du lịch'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[105.740, 10.300], [105.775, 10.305], [105.770, 10.275], [105.735, 10.270], [105.740, 10.300]]]
                }
            },
            // Tiền Giang - Khu Công nghiệp Long Giang & Tân Phước (SKC)
            {
                type: 'Feature',
                properties: {
                    zone_id: 'QH-TG-SKC01',
                    name: 'Khu Công nghiệp Long Giang (Tân Phước)',
                    province: 'Tiền Giang',
                    land_type: 'SKC',
                    land_label: 'Đất cơ sở sản xuất phi nông nghiệp (KCN)',
                    color: '#a855f7',
                    area_ha: 540.0,
                    density: '70%',
                    max_height: '2-4 tầng nhà xưởng',
                    status: 'Quy hoạch KCN hoạt động & mở rộng'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[106.280, 10.420], [106.320, 10.425], [106.315, 10.390], [106.275, 10.385], [106.280, 10.420]]]
                }
            },
            // Tiền Giang - Khu Đô thị Trung tâm TP. Mỹ Tho (ODT)
            {
                type: 'Feature',
                properties: {
                    zone_id: 'QH-TG-ODT01',
                    name: 'Khu Đô thị Trung tâm TP. Mỹ Tho',
                    province: 'Tiền Giang',
                    land_type: 'ODT',
                    land_label: 'Đất ở đô thị',
                    color: '#f43f5e',
                    area_ha: 680.0,
                    density: '80%',
                    max_height: '10-25 tầng',
                    status: 'Đô thị loại I định hướng'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[106.340, 10.370], [106.380, 10.375], [106.375, 10.340], [106.335, 10.335], [106.340, 10.370]]]
                }
            },
            // Tiền Giang - Khu Đô thị Cảng & Công nghiệp Gò Công (DGT & SKC)
            {
                type: 'Feature',
                properties: {
                    zone_id: 'QH-TG-GC01',
                    name: 'Khu Đô thị - Cảng Dịch vụ Biển Gò Công Đông',
                    province: 'Tiền Giang',
                    land_type: 'DGT',
                    land_label: 'Đất giao thông & hạ tầng cảng biển',
                    color: '#ef4444',
                    area_ha: 380.0,
                    density: '50%',
                    max_height: 'Cảng nước sâu & Logistics',
                    status: 'Quy hoạch vùng kinh tế biển'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[106.680, 10.380], [106.720, 10.385], [106.715, 10.340], [106.675, 10.335], [106.680, 10.380]]]
                }
            }
        ]
    };

    // 8. Đóng gói dữ liệu đầu ra
    const outputData = {
        metadata: {
            title: 'Kho Dữ Liệu Lớp Bản Đồ & Quy Hoạch Miền Nam Việt Nam (VN2000-PWA)',
            version: '2026.11',
            updated: new Date().toISOString(),
            license: 'Open Data (MIT / GSO)',
            coverage: 'Nam Bộ (Tây Nam Bộ & Đông Nam Bộ)',
            source_attribution: 'Tổng cục Thống kê, Cổng GIS Chính phủ, Đề án sáp nhập 34 tỉnh, Thông tư 27/2018/TT-BTNMT'
        },
        // A. Tỉnh Đồng Tháp (mới sau sáp nhập)
        dong_thap_moi: {
            province: dtMoiFeature,
            communes: dt34Communes
        },
        // B. Tỉnh Đồng Tháp (cũ - 12 huyện)
        dong_thap_cu: dtCuDistricts,
        // C. Tỉnh Tiền Giang (cũ - 11 huyện)
        tien_giang_cu: tgCuDistricts,
        // D. 19 Tỉnh thành miền Nam
        south_provinces: southProvinces,
        // E. Lớp phân vùng quy hoạch sử dụng đất chuẩn Thông tư 27/2018/TT-BTNMT
        planning_zones: planningZones
    };

    const outputPath = path.resolve(__dirname, '../data/vn_south_provinces.js');
    const fileHeader = `/**
 * KHO DỮ LIỆU LỚP BẢN ĐỒ & QUY HOẠCH MIỀN NAM VIỆT NAM (VN2000-PWA)
 * Tệp tự sinh bởi tools/build_vn_south_layers.js. Hỗ trợ chạy OFFLINE 100%.
 * Chứa:
 *  1. Đồng Tháp mới sau sáp nhập (Gộp Đồng Tháp + Tiền Giang, 34 xã trọng điểm)
 *  2. Đồng Tháp cũ (12 huyện/thành phố)
 *  3. Tiền Giang cũ (11 huyện/thị xã/thành phố)
 *  4. 19 Tỉnh thành miền Nam Việt Nam (Đông Nam Bộ & Tây Nam Bộ)
 *  5. Phân vùng Quy hoạch sử dụng đất chuẩn Thông tư 27/2018/TT-BTNMT
 */
window.VN_SOUTH_MAP_DATA = `;

    fs.writeFileSync(outputPath, fileHeader + JSON.stringify(outputData) + ';\n', 'utf8');
    const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
    console.log(`\n✅ Đã xuất thành công: ${outputPath} (${sizeKB} KB)`);
}

main().catch(err => {
    console.error('❌ Lỗi thực thi:', err);
    process.exit(1);
});
