#!/usr/bin/env python3
"""Sinh bộ câu mẫu tiếng Việt cho trợ lý VN2000 (câu nói → công cụ + tham số).

Đầu ra:
  assistant-dataset.js     — nạp trong app: ví dụ gần nhất cho AI cục bộ / máy chủ (few-shot) và để chấm điểm bộ định tuyến
  docs/ai/sft_vi.jsonl     — cùng dữ liệu ở dạng hội thoại, dùng fine-tune (LoRA) mô hình nhỏ trên máy có GPU

Chạy lại sau khi thêm mẫu:  python3 tools/ai/build_dataset.py
"""
import json, os, random, unicodedata
random.seed(7)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def strip_accents(s):
    s = s.replace('đ', 'd').replace('Đ', 'D')
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

D = []  # (text, tool, args)
def add(texts, tool, args=None, unaccent=True):
    for t in texts:
        D.append((t, tool, args or {}))
        if unaccent and random.random() < 0.35:
            D.append((strip_accents(t).lower(), tool, args or {}))

# --- Mở chức năng ---
OPEN = {
    'drawerItem_map': ['mở bản đồ', 'xem bản đồ dự án', 'cho tôi xem các mốc trên bản đồ', 'bản đồ mốc', 'mở bản đồ dự án giúp mình'],
    'drawerItem_cad_tool': ['mở MiniCAD', 'vào mini cad', 'tôi muốn vẽ mặt bằng', 'mở phần vẽ bản vẽ', 'mở cad'],
    'drawerItem_stakeout': ['cắm mốc', 'dẫn đường tới mốc', 'mở chức năng cắm mốc', 'tìm mốc ngoài thực địa'],
    'drawerItem_routing': ['lộ trình', 'chỉ đường', 'mở lộ trình đi đo', 'tìm đường tới khu đo'],
    'drawerItem_datamgmt': ['sổ đo', 'mở sổ đo', 'danh sách mốc', 'quản lý dự án', 'xem dữ liệu đo'],
    'drawerItem_transform': ['chuyển đổi tọa độ', 'mở chuyển đổi đơn điểm', 'vào màn chuyển đổi'],
    'drawerItem_batch': ['chuyển đổi hàng loạt', 'nhập excel nhiều điểm', 'chuyển nhiều điểm một lúc'],
    'drawerItem_transform_map': ['chấm tọa độ', 'lấy tọa độ trên bản đồ', 'chấm điểm trên bản đồ'],
    'drawerItem_camera': ['mở camera', 'chụp ảnh hiện trường', 'chụp ảnh đóng dấu tọa độ'],
    'drawerItem_geodesy': ['bài toán trắc địa', 'tính phương vị', 'mở bài toán trắc địa'],
    'drawerItem_settings_resection': ['giao hội', 'mở giao hội nghịch'],
    'drawerItem_profile_volume': ['trắc dọc', 'tính đào đắp', 'mặt cắt địa hình'],
    'drawerItem_user_guide': ['cẩm nang', 'hướng dẫn sử dụng app'],
    'drawerItem_home': ['trang chủ', 'về màn hình chính'],
    'drawerItem_settings_rtk': ['kết nối máy thu RTK', 'mở bluetooth máy GNSS'],
    'drawerItem_settings_storage': ['đồng bộ google sheet', 'mở đồng bộ lưu trữ đám mây'],
}
for target, texts in OPEN.items():
    add(texts, 'open', {'target': target})

# --- Chuyển đổi ---
for lat, lng in [(10.7769, 106.7009), (21.0285, 105.8542), (10.4545, 105.6339), (16.0544, 108.2022), (9.1768, 105.1524)]:
    add([f'{lat} {lng}', f'chuyển {lat}, {lng} sang VN2000', f'đổi tọa độ GPS {lat} {lng}', f'vĩ độ {lat} kinh độ {lng} là X Y bao nhiêu'], 'wgs2vn', {'lat': lat, 'lng': lng}, unaccent=False)
for X, Y in [(1191942.305, 603797.261), (1154321.5, 562100.25), (2326000.1, 586000.9)]:
    add([f'X {X} Y {Y}', f'chuyển {X} {Y} sang WGS84', f'tọa độ VN2000 {X} {Y} ở đâu', f'đổi X={X}, Y={Y} ra kinh vĩ độ'], 'vn2wgs', {'X': X, 'Y': Y}, unaccent=False)

# --- Xuất bản vẽ có tham số ---
fmt_words = {'pdf': ['PDF', 'file pdf'], 'png': ['PNG', 'ảnh png'], 'image': ['ảnh nén', 'ảnh webp', 'ảnh jpg'], 'svg': ['SVG', 'file svg'], 'dwg': ['DWG', 'file AutoCAD', 'dxf']}
papers = [('A4', 'A4'), ('A3', 'A3'), ('A4-P', 'A4 đứng'), ('A3-P', 'khổ A3 dọc'), ('A1', 'A1'), ('A2', 'giấy A2')]
scales = [500, 1000, 200, 2000, 750]
bases = [('google_hybrid', 'nền vệ tinh'), ('esri_satellite', 'nền Esri'), ('osm_streets', 'nền đường phố'), ('none', 'không nền'), ('opentopomap', 'nền địa hình')]
tables = [('points', 'in bảng các điểm'), ('area', 'kèm bảng diện tích'), ('both', 'in cả hai bảng')]
for fmt, words in fmt_words.items():
    for w in words:
        add([f'xuất {w}', f'xuất bản vẽ {w}'], 'exportDrawing', {'format': fmt})
for i in range(70):
    fmt = random.choice(list(fmt_words)); w = random.choice(fmt_words[fmt])
    args = {'format': fmt}; parts = [random.choice(['xuất', 'xuất giúp tôi', 'cho tôi xuất', 'in']) if fmt == 'pdf' else random.choice(['xuất', 'xuất giúp tôi', 'cho tôi xuất', 'lưu'])]
    parts.append(random.choice(['bản vẽ ' + w, w, 'bản đồ ' + w]))
    if random.random() < 0.7:
        p, pw = random.choice(papers); args['paper'] = p; parts.append(random.choice(['khổ ', '']) + pw)
    if random.random() < 0.7:
        sc = random.choice(scales); args['scale'] = sc; parts.append(random.choice([f'tỷ lệ 1:{sc}', f'tỉ lệ 1/{sc}', f'tỷ lệ {sc}']))
    if random.random() < 0.6:
        b, bw = random.choice(bases); args['basemap'] = b; parts.append(bw)
    if random.random() < 0.5:
        tb, tw = random.choice(tables); args['tables'] = tb; parts.append(tw)
    if random.random() < 0.25:
        args['source'] = 'data'; parts.append(random.choice(['từ sổ đo', 'của dữ liệu đo']))
    add([' '.join(parts)], 'exportDrawing', args)

# --- Kiểm tra số liệu ---
add(['kiểm tra số liệu', 'rà soát dữ liệu đo', 'kiểm tra lỗi tọa độ', 'soát lỗi mốc giúp tôi', 'dữ liệu có bị trùng không',
     'kiểm tra chất lượng số liệu đo', 'tìm lỗi trong sổ đo', 'mốc có bị đảo X Y không'], 'checkData')

# --- KTT / tỉnh / múi ---
add(['KTT đang dùng là gì', 'kinh tuyến trục hiện tại', 'đang dùng múi chiếu nào'], 'kttInfo')
for prov in ['Đồng Tháp', 'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Cần Thơ', 'An Giang', 'Lâm Đồng']:
    add([f'KTT {prov}', f'kinh tuyến trục của {prov} là bao nhiêu'], 'kttOf', {'province': prov})
    add([f'đổi KTT sang {prov}', f'chọn tỉnh {prov}', f'tôi đang làm việc ở {prov}, đổi KTT giúp'], 'setProvince', {'province': prov})
add(['dùng múi 6', 'đổi sang múi 6 độ'], 'setMui', {'mui': 6})
add(['dùng múi 3', 'chuyển múi 3'], 'setMui', {'mui': 3})

# --- GPS / vị trí / dự án / khác ---
add(['bật GPS', 'mở định vị', 'bật định vị lên'], 'gps', {'on': True})
add(['tắt GPS', 'tắt định vị', 'ngắt gps đi'], 'gps', {'on': False})
add(['vị trí của tôi', 'tôi đang ở đâu', 'tọa độ chỗ này là bao nhiêu', 'sai số GPS bao nhiêu'], 'whereAmI')
add(['dự án hiện tại', 'có bao nhiêu mốc', 'dự án đang mở là gì', 'số lượng mốc trong dự án'], 'project')
add(['giao diện sáng', 'chuyển nền trắng', 'chế độ ban ngày'], 'theme', {'theme': 'light'})
add(['giao diện tối', 'chế độ ban đêm', 'nền đen'], 'theme', {'theme': 'dark'})
add(['kiểm thử', 'tự kiểm tra hệ thống', 'chẩn đoán ứng dụng', 'test app'], 'selftest')
add(['bạn làm được gì', 'giúp', 'danh sách lệnh'], 'help')
add(['mấy giờ rồi', 'bây giờ là mấy giờ'], 'time')
add(['hôm nay ngày mấy', 'hôm nay thứ mấy'], 'date')
add(['cài đặt', 'mở thiết lập ứng dụng'], 'settings')

# --- Công cụ thông minh mở rộng (v2.8.62): mốc, khoảng cách theo tên, lưu mốc, cắm mốc, MiniCAD, lớp bản đồ, lộ trình, đổi KTT, dự án, chế độ ---
# Tìm mốc theo tên
for pt in ['M1', 'M2', 'M3', 'A1', 'G1']:
    add([f'tìm mốc {pt}', f'tọa độ mốc {pt} là bao nhiêu', f'mốc {pt} ở đâu', f'xem thông tin mốc {pt}'], 'findPoint', {'query': pt})

# Khoảng cách / phương vị giữa 2 mốc theo tên
add(['khoảng cách từ M1 đến M3', 'cự ly từ M1 tới M3', 'phương vị từ M1 đến M3'], 'distancePoints', {'from': 'M1', 'to': 'M3'})
add(['khoảng cách từ A1 đến A2', 'khoảng cách A1 A2'], 'distancePoints', {'from': 'A1', 'to': 'A2'})
add(['từ đây đến mốc M2 bao xa', 'khoảng cách từ vị trí hiện tại đến mốc M2'], 'distancePoints', {'from': 'GPS', 'to': 'M2'})
add(['khoảng cách từ điểm vừa rồi đến M1', 'từ điểm đó tới M1 bao xa'], 'distancePoints', {'from': 'LAST', 'to': 'M1'})

# Lưu mốc vào dự án
add(['lưu điểm vừa chuyển tên M5', 'lưu điểm đó vào dự án tên M5'], 'savePoint', {'name': 'M5'})
add(['lưu điểm vừa rồi thành mốc A1', 'lưu tọa độ vừa rồi tên A1'], 'savePoint', {'name': 'A1'})
add(['lưu vị trí hiện tại thành mốc G1', 'lưu vị trí GPS tên G1'], 'savePoint', {'name': 'G1', 'source': 'gps'})

# Cắm mốc theo tên điểm cụ thể
for pt in ['M1', 'M2', 'A3']:
    add([f'cắm mốc {pt}', f'dẫn đường tới mốc {pt}', f'chỉ hướng đến mốc {pt}'], 'stakeoutPoint', {'name': pt})

# Thống kê & diện tích MiniCAD
add(['thống kê MiniCAD', 'tổng diện tích MiniCAD', 'bản vẽ có mấy khối', 'tóm tắt bản vẽ'], 'cadSummary')
add(['diện tích thửa 1 bao nhiêu', 'chu vi thửa 1'], 'cadSummary', {'query': 'thửa 1'}, unaccent=False)
add(['diện tích thửa 2 bao nhiêu'], 'cadSummary', {'query': 'thửa 2'}, unaccent=False)

# Điều khiển công cụ MiniCAD trực tiếp
CAD_ACT = {
    'table': ['mở bảng kê MiniCAD', 'xem bảng kê', 'mở bảng diện tích MiniCAD'],
    'polygon': ['vẽ đa giác', 'vẽ ranh thửa'],
    'polyline': ['vẽ tuyến', 'vẽ đường tim'],
    'point': ['chấm điểm CAD', 'vẽ điểm CAD'],
    'snap': ['bật snap', 'tắt snap', 'bật bắt điểm'],
    'ortho': ['bật ortho', 'khóa vuông góc'],
    'polar': ['bật polar', 'bật góc cực'],
    'undo': ['hoàn tác', 'lùi bước'],
    'redo': ['làm lại', 'tiến bước'],
    'zoom': ['zoom toàn cảnh bản vẽ', 'bao quát MiniCAD', 'vừa khung bản vẽ'],
    'connect': ['nối điểm MiniCAD', 'nối điểm'],
    'symbols': ['mở bảng ký hiệu', 'mở ký hiệu đỉnh CAD'],
    'qselect': ['chọn nhanh đối tượng CAD', 'lọc đối tượng CAD'],
    'inquiry_dist': ['đo khoảng cách trên MiniCAD', 'đo cự ly trên CAD'],
    'inquiry_area': ['đo diện tích trên MiniCAD', 'đo diện tích trên CAD'],
}
for act, texts in CAD_ACT.items():
    add(texts, 'cadAction', {'action': act})

# Bản đồ nền, lớp phủ giao thông / ranh giới & Quy hoạch Guland 2030
add(['đổi nền vệ tinh', 'chuyển bản đồ nền vệ tinh Google'], 'mapLayer', {'kind': 'basemap', 'value': 'google_hybrid'})
add(['đổi nền địa hình', 'chuyển nền OpenTopoMap', 'đổi nền topo'], 'mapLayer', {'kind': 'basemap', 'value': 'opentopomap'})
add(['đổi nền Esri', 'chuyển nền vệ tinh Esri'], 'mapLayer', {'kind': 'basemap', 'value': 'esri_satellite'})
add(['đổi nền đường phố Google', 'chuyển nền Google Streets'], 'mapLayer', {'kind': 'basemap', 'value': 'google_streets'})
add(['đổi nền OpenStreetMap', 'chuyển nền OSM'], 'mapLayer', {'kind': 'basemap', 'value': 'osm_streets'})
add(['tắt nền bản đồ', 'chuyển sang không nền'], 'mapLayer', {'kind': 'basemap', 'value': 'none'})
add(['bật giao thông trực tiếp', 'bật lớp traffic'], 'mapLayer', {'kind': 'overlay', 'value': 'google_traffic', 'on': True})
add(['tắt giao thông trực tiếp'], 'mapLayer', {'kind': 'overlay', 'value': 'google_traffic', 'on': False})
add(['bật mạng lưới giao thông Esri'], 'mapLayer', {'kind': 'overlay', 'value': 'esri_transport', 'on': True})
add(['bật ranh giới 34 tỉnh', 'hiện ranh giới tỉnh'], 'mapLayer', {'kind': 'overlay', 'value': 'prov34', 'on': True})
add(['tắt ranh giới 34 tỉnh'], 'mapLayer', {'kind': 'overlay', 'value': 'prov34', 'on': False})
add(['bật ranh giới xã Đồng Tháp'], 'mapLayer', {'kind': 'overlay', 'value': 'dongthap', 'on': True})
add(['bật quy hoạch', 'mở bản đồ quy hoạch'], 'mapLayer', {'kind': 'planning', 'value': 'current', 'on': True})
add(['tắt quy hoạch', 'ẩn bản đồ quy hoạch'], 'mapLayer', {'kind': 'planning', 'value': 'current', 'on': False})
add(['bật quy hoạch Đồng Tháp', 'xem bản đồ quy hoạch Đồng Tháp'], 'mapLayer', {'kind': 'planning', 'value': 'Đồng Tháp', 'on': True})
add(['bật quy hoạch TP. Hồ Chí Minh'], 'mapLayer', {'kind': 'planning', 'value': 'TP. Hồ Chí Minh', 'on': True})
add(['độ mờ quy hoạch 60%', 'chỉnh độ rõ quy hoạch 60%'], 'mapLayer', {'kind': 'planning', 'value': 'current', 'on': True, 'opacity': 60})

# Tối ưu lộ trình dự án
add(['tối ưu lộ trình', 'lập lộ trình tất cả mốc', 'chỉ đường đi hết các mốc'], 'routeProject', {'vehicle': 'car'})
add(['tối ưu lộ trình xe máy', 'lộ trình các mốc bằng xe máy'], 'routeProject', {'vehicle': 'bike'})
add(['tối ưu lộ trình ô tô 16 chỗ', 'lập lộ trình bằng minibus'], 'routeProject', {'vehicle': 'minibus'})
add(['tối ưu lộ trình từ vị trí hiện tại'], 'routeProject', {'vehicle': 'car', 'startFromGps': True})

# Quy đổi KTT (Rezone)
add(['quy đổi điểm vừa rồi sang KTT Đồng Tháp', 'đổi tọa độ vừa rồi sang KTT Đồng Tháp'], 'rezone', {'toProvince': 'Đồng Tháp'})
add(['quy đổi 1191942.305 603797.261 sang KTT Đồng Tháp'], 'rezone', {'toProvince': 'Đồng Tháp', 'X': 1191942.305, 'Y': 603797.261}, unaccent=False)

# Quản lý / chuyển / tạo dự án
add(['danh sách dự án', 'liệt kê các dự án', 'có những dự án nào'], 'switchProject', {'action': 'list'})
add(['chuyển sang dự án KhuA', 'mở dự án KhuA'], 'switchProject', {'action': 'switch', 'name': 'KhuA'}, unaccent=False)
add(['tạo dự án mới DoDac2026', 'thêm dự án mới DoDac2026'], 'switchProject', {'action': 'create', 'name': 'DoDac2026'}, unaccent=False)

# Chế độ thực địa & ngôn ngữ
add(['bật chế độ thực địa', 'bật chế độ ngoài nắng'], 'appMode', {'target': 'field', 'value': 'on'})
add(['tắt chế độ thực địa', 'tắt chế độ ngoài nắng'], 'appMode', {'target': 'field', 'value': 'off'})
add(['đổi sang tiếng Anh', 'chuyển ngôn ngữ tiếng Anh'], 'appMode', {'target': 'lang', 'value': 'en'})
add(['đổi sang tiếng Việt', 'chuyển ngôn ngữ tiếng Việt'], 'appMode', {'target': 'lang', 'value': 'vi'})

# --- Câu tự do (dành cho AI hiểu: quy tắc có thể không bắt được) ---
FREE = [
    ('ê in giùm cái bản vẽ ra giấy a3 nha', 'exportDrawing', {'format': 'pdf', 'paper': 'A3'}),
    ('cho bản vẽ có hình vệ tinh phía sau rồi xuất ảnh', 'exportDrawing', {'format': 'image', 'basemap': 'google_hybrid'}),
    ('làm file cho anh kỹ sư mở bằng autocad', 'exportDrawing', {'format': 'dwg'}),
    ('mấy cái mốc hôm qua đo có cái nào sai không', 'checkData', {}),
    ('coi giùm số liệu có điểm nào nhảy lung tung không', 'checkData', {}),
    ('tui muốn đi tới mốc gần nhất', 'open', {'target': 'drawerItem_stakeout'}),
    ('cho coi các điểm đã đo trên map', 'open', {'target': 'drawerItem_map'}),
    ('màn hình chói quá', 'theme', {'theme': 'dark'}),
    ('ngoài nắng khó nhìn quá', 'theme', {'theme': 'light'}),
    ('app có chạy được khi mất sóng không', 'selftest', {}),
    ('tôi chuyển qua làm ở Cần Thơ rồi', 'setProvince', {'province': 'Cần Thơ'}),
    ('vẽ thửa đất', 'open', {'target': 'drawerItem_cad_tool'}),
    ('xem giúp vị trí hiện giờ', 'whereAmI', {}),
    ('làm ơn tắt cái định vị đi cho đỡ hao pin', 'gps', {'on': False}),
    ('nắng gắt quá cho màn hình dễ nhìn ngoài trời đi', 'appMode', {'target': 'field', 'value': 'on'}),
    ('xem đất này có dính quy hoạch không', 'mapLayer', {'kind': 'planning', 'value': 'current', 'on': True}),
    ('lên đường đi đo hết các điểm bằng xe máy nha', 'routeProject', {'vehicle': 'bike'}),
    ('lùi lại nét vẽ hồi nãy giùm', 'cadAction', {'action': 'undo'}),
    ('mảnh đất này đo ra tổng cộng bao nhiêu mét vuông rồi', 'cadSummary', {}),
]
for t, tool, args in FREE:
    D.append((t, tool, args))

# Bỏ trùng
seen, out = set(), []
for t, tool, args in D:
    k = t.strip().lower()
    if k in seen: continue
    seen.add(k); out.append([t, tool, args])

js = ('/* Bộ câu mẫu tiếng Việt cho trợ lý VN2000 — SINH TỰ ĐỘNG bởi tools/ai/build_dataset.py, đừng sửa tay.\n'
      '   Mỗi dòng: [câu người dùng, công cụ, tham số]. Dùng làm ví dụ gần nhất cho AI và để chấm điểm bộ định tuyến. */\n'
      '(function (root) {\n    const DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
      '    root.AssistantDataset = DATA;\n    if (typeof module !== "undefined" && module.exports) module.exports = DATA;\n'
      '})(typeof window !== "undefined" ? window : globalThis);\n')
open(os.path.join(ROOT, 'assistant-dataset.js'), 'w', encoding='utf-8').write(js)
os.makedirs(os.path.join(ROOT, 'docs', 'ai'), exist_ok=True)
SYS = 'Bạn là bộ điều khiển ứng dụng trắc địa VN2000. Trả về đúng MỘT JSON {"tool": tên, "args": {...}}.'
with open(os.path.join(ROOT, 'docs', 'ai', 'sft_vi.jsonl'), 'w', encoding='utf-8') as f:
    for t, tool, args in out:
        f.write(json.dumps({'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': t},
                                         {'role': 'assistant', 'content': json.dumps({'tool': tool, 'args': args}, ensure_ascii=False)}]}, ensure_ascii=False) + '\n')
print(len(out), 'câu mẫu')
