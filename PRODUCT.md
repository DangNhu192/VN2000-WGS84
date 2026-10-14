# PRODUCT.md — VN2000 & WGS-84 Survey Pro

## Product Identity
- **Product Name:** VN2000 - WGS84 Survey Pro
- **Domain:** Hệ thống Chuyển đổi Tọa độ & Đo đạc Trắc địa Công trình Thực địa Việt Nam
- **Legal & Technical Basis:** Quyết định số 05/2007/QĐ-BTNMT & Thông tư số 25/2014/TT-BTNMT (Bộ TN&MT). 7 tham số dịch chuyển Bursa-Wolf, Ellipsoid WGS-84 / WGS84 và Kinh tuyến trục 63 tỉnh thành.

## Primary Users & Usage Context
- **Target Users:** Kỹ sư trắc địa, cán bộ địa chính, giám sát công trình xây dựng, kỹ sư hạ tầng giao thông và chuyên viên GIS.
- **Real-world Context:** Thường xuyên tác nghiệp ngoài thực địa dưới ánh nắng gắt, điều kiện mạng 4G/5G chập chờn hoặc mất sóng, đòi hỏi:
  - Ứng dụng hoạt động Offline-First 100%.
  - Tốc độ phản hồi tức thì, không giật lag.
  - Độ tương phản cực cao, chữ rõ nét không bị chói lóa.
  - Số liệu tọa độ $X, Y, H$ chính xác đến từng milimet (3 chữ số thập phân).

## Core Capabilities
1. **Chuyển đổi tọa độ 2 chiều:** WGS-84 $\longleftrightarrow$ VN-2000 (Đơn điểm & Hàng loạt dán từ Excel/Zalo).
2. **Bản đồ dự án & Mốc trắc địa:** Tải bản đồ ngoại tuyến, trực quan hóa ranh thửa và điểm mốc.
3. **Cắm mốc thực địa (Stakeout):** La bàn số 360°, radar dẫn hướng, đo khoảng cách và góc lệch tới mốc.
4. **Camera thực địa đóng dấu thủy ấn:** Chụp ảnh hiện trường in nổi tọa độ VN-2000, WGS-84, sai số GPS, la bàn.
5. **MiniCAD & Bảng kê:** Vẽ mặt bằng công trình, bắt điểm Snap, tính diện tích m² và xuất tệp CAD DXF.
6. **Trắc dọc & Đào đắp:** Vẽ mặt cắt tự nhiên, đường đỏ thiết kế, tính khối lượng đào đắp $m^3$.
7. **Quản lý dự án:** Đồng bộ Google Sheets, xuất nhập CSV/DXF/KML.
8. **Định vị RTK & Giao hội:** Kết nối rover GNSS ngoài qua Web Bluetooth NMEA, bù tọa độ giao hội 2 mốc.

## Quality Floor & Standards
- **Zero Data Loss:** Dữ liệu mốc và cấu hình lưu trữ vĩnh viễn trên máy (IndexedDB / LocalStorage).
- **Legibility Floor:** Không dùng cỡ chữ dưới 11px cho bất kỳ phần tử chức năng nào.
- **Tabular Precision:** Toàn bộ số liệu tọa độ sử dụng phông chữ monospace tabular numbers (`font-variant-numeric: tabular-nums`).
- **No AI Slop:** Thiết kế theo phong cách Precision Engineering thực dụng, không trang trí rườm rà, không hiệu ứng nảy giật gây mỏi mắt.
