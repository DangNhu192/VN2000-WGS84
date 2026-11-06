"""Sinh data/vn_admin_2025.js: ranh giới 34 tỉnh + 3.321 xã/phường SAU SÁP NHẬP (01/07/2025), đã giản lược
để tra địa chỉ ngoại tuyến (đóng dấu camera, gợi ý KTT).

Nguồn: https://github.com/thanglequoc/vietnamese-provinces-database (MIT), thư mục json/geojson
(dữ liệu gốc từ sapnhap.bando.com.vn).

Chạy:  python3 -I tools/build_vn_admin_2025.py <đường dẫn tới json/geojson> data/vn_admin_2025.js
"""
import glob
import json
import os
import sys

TOL = 0.0003      # ~33 m: đủ để nhận đúng xã/phường, nhỏ hơn nhiều so với kích thước một xã
SCALE = 10000     # lưu tọa độ 4 số lẻ (~11 m), mã hóa sai phân để file nhỏ


def simplify(pts, tol):
    """Douglas-Peucker không đệ quy."""
    if len(pts) < 4:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            # Vòng khép kín: đoạn a-b suy biến thành một điểm → dùng khoảng cách tới điểm đó.
            d = (abs(dy * (px - ax) - dx * (py - ay)) / norm) if norm > 1e-12 else ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]


def encode_ring(ring):
    out, px, py = [], 0, 0
    for lng, lat in ring:
        x, y = round(lng * SCALE), round(lat * SCALE)
        if out and x == px and y == py:
            continue
        out += [x - px, y - py]
        px, py = x, y
    return out


def polygons(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon':
        return geom['coordinates']
    return []


def main(src, dst):
    provinces, wards = [], []
    for pdir in sorted(d for d in glob.glob(os.path.join(src, '*')) if os.path.isdir(d)):
        pfile = glob.glob(os.path.join(pdir, '*.geojson'))[0]
        pprops = json.load(open(pfile, encoding='utf-8'))['features'][0]['properties']
        pidx = len(provinces)
        provinces.append([pprops['code'], pprops['fullName']])
        for wfile in sorted(glob.glob(os.path.join(pdir, 'wards', '*'))):
            for ft in json.load(open(wfile, encoding='utf-8'))['features']:
                name = ft['properties']['fullName'].strip()
                name = name[:1].upper() + name[1:]
                rings, minx, miny, maxx, maxy = [], 1e9, 1e9, -1e9, -1e9
                for poly in polygons(ft['geometry']):
                    outer = simplify([tuple(p[:2]) for p in poly[0]], TOL)
                    if len(outer) < 4:
                        continue  # đảo/mảnh rất nhỏ: bỏ, tra cứu sẽ rơi về cấp tỉnh
                    for lng, lat in outer:
                        minx, miny, maxx, maxy = min(minx, lng), min(miny, lat), max(maxx, lng), max(maxy, lat)
                    rings.append(encode_ring(outer))
                if rings:
                    bbox = [round(minx * SCALE), round(miny * SCALE), round(maxx * SCALE), round(maxy * SCALE)]
                    wards.append([name, pidx, bbox, rings])
    data = {'v': '2025-07-01', 'scale': SCALE, 'source': 'thanglequoc/vietnamese-provinces-database (MIT) / sapnhap.bando.com.vn',
            'provinces': provinces, 'wards': wards}
    with open(dst, 'w', encoding='utf-8') as f:
        f.write('/* Tự sinh bởi tools/build_vn_admin_2025.py — không sửa tay. ' + data['source'] + ' */\n')
        f.write('window.VN_ADMIN_2025 = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(len(provinces), 'provinces', len(wards), 'wards', os.path.getsize(dst) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
