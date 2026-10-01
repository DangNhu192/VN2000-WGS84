# 🛰️ WGS84 - VN2000 Conversion & Surveyor PWA Pro

<div align="center">

![VN-2000 Pro Logo](icon.png)

**Ứng dụng Chuyển đổi Tọa độ WGS-84 & VN-2000, Trắc địa Số liệu Công trình và Bản đồ Thực địa Ngoại tuyến**

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-059669?style=for-the-badge&logo=pwa&logoColor=white)](https://github.com/DangNhu192/VN2000-WGS84)
[![Deployed with Vercel](https://img.shields.io/badge/Deployed%20with-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Standard](https://img.shields.io/badge/Chuẩn-Bursa--Wolf%207%20Tham%20Số-1565C0?style=for-the-badge)](https://github.com/DangNhu192/VN2000-WGS84)
[![License](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)

[🌐 Trải nghiệm Trực tiếp](#-hướng-dẫn-cài-đặt-trên-điện-thoại-ios--android) • [📖 Tính năng Chính](#-tính-năng-nổi-bật) • [📐 Tham số Trắc địa](#-tham-số-tính-chuyển-chuẩn-quốc-gia) • [🚀 Triển khai Vercel](#-triển-khai-nhanh-lên-vercel)

</div>

---

## 📌 Giới thiệu

**WGS84 - VN2000 Pro PWA** là giải pháp công nghệ trắc địa hiện đại chạy trực tiếp trên nền tảng Web và Progressive Web App (PWA). Ứng dụng được thiết kế tối ưu hóa cho kỹ sư trắc địa, địa chính, quy hoạch công trình và người dùng thực địa cần tra cứu, chuyển đổi tọa độ nhanh chóng, chính xác tuyệt đối ngay trên điện thoại iPhone (Safari) và Android mà **không cần kết nối mạng 4G/Wi-Fi**.

- **Tác giả:** Đặng Như
- **Email:** [dnpn.ttqt@gmail.com](mailto:dnpn.ttqt@gmail.com)
- **Phiên bản:** v2.5.3 Pro (Tối Ưu 4 Tab Cài Đặt Hệ Thống Lưới 2x2 & Sticky Footer Lưu Dữ Liệu)

---

## 🌟 Tính năng nổi bật

### 1. 🔄 Chuyển đổi tọa độ 2 chiều (WGS-84 ⇄ VN-2000)
- Chuyển đổi tương hỗ giữa tọa độ trắc địa vệ tinh **WGS-84** (Kinh độ L, Vĩ độ B) và tọa độ phẳng **VN-2000** (X Bắc, Y Đông).
- Hỗ trợ đầy đủ **Múi chiếu 3°** ($k_0 = 0.9999$) và **Múi chiếu 6°** ($k_0 = 0.9996$).
- Tích hợp sẵn danh mục Kinh tuyến trục (KTT) của **63 Tỉnh/Thành phố trên cả nước** cùng tùy chọn tự nhập KTT bất kỳ.
- Đa dạng định dạng hiển thị: Độ thập phân (`dd.dddddd°`), Độ - Phút (`dd° mm.mmm'`), Độ - Phút - Giây (`dd° mm' ss.ss"`).
- Cơ chế tự động nhận diện và đảo chiều thông minh nếu người dùng nhập ngược trục X/Y hoặc B/L.

### 2. 🛰️ GPS Thực địa & Định vị Thời gian thực
- Thu nhận tín hiệu GPS trực tiếp từ cảm biến thiết bị với độ chính xác cao.
- Quy đổi tọa độ tức thời từ vị trí đứng sang tọa độ phẳng VN-2000 Live.
- Hiển thị đầy đủ bán kính sai số (Accuracy Circle mét), độ cao trắc địa (Altitude), tốc độ di chuyển và góc hướng la bàn.

### 3. 🗺️ Bản đồ số Leaflet & Chấm điểm ngoại tuyến
- Tích hợp 2 lớp nền bản đồ sắc nét: **Vệ tinh Google Hybrid** và **Đường phố OpenStreetMap**.
- Hiển thị ranh giới địa giới hành chính **34 Tỉnh/Thành phố sáp nhập** mới nhất.
- Tích hợp chi tiết ranh giới **102 Xã/Phường tỉnh Đồng Tháp** với đầy đủ dữ liệu dân số, diện tích và trụ sở.
- **Tâm ngắm quang học (Optical Crosshair):** Chạm hoặc kéo thả ngắm trực tiếp tọa độ trên bản đồ.
- Tự động đo vẽ đường nối chỉ hướng thực địa, tính cự ly ngang và góc phương vị giữa vị trí GPS của người đo và mốc mục tiêu.

### 4. 📁 Quản lý Dự án & Sổ đo (Excel / CSV UTF-8)
- Tạo nhiều sổ đo dự án không giới hạn (`.csv`).
- Lưu trữ danh sách mốc kèm thời gian đo, tên mốc, tọa độ phẳng, tọa độ vệ tinh và ghi chú.
- Xuất file CSV đạt chuẩn **UTF-8 BOM**, mở trực tiếp trên Microsoft Excel hiển thị tiếng Việt sắc nét không bao giờ lỗi font.
- Hỗ trợ nút chia sẻ nhanh dữ liệu sổ đo qua Zalo, Gmail, AirDrop, v.v.

### 5. ☁️ Lưu Trữ Ngoại Tuyến & Đồng Bộ Google Sheets / Google Drive
- **Lưu ngoại tuyến 100% trên thiết bị:** Tốc độ tức thì, không cần mạng 4G/Wifi, không bị gián đoạn thao tác khi đo thực địa.
- **Bảo mật tuyệt đối:** GitHub & Vercel chỉ đóng vai trò phân phối mã nguồn giao diện web tĩnh, tuyệt đối không lưu trữ dữ liệu cá nhân hay sổ đo của bạn.
- **Đồng bộ Google Sheets 1-Chạm:** Tích hợp nút đồng bộ toàn bộ sổ đo lên bảng tính Google Sheets lưu trên Google Drive cá nhân của bạn thông qua Google Apps Script Web App.
- **Tự động gửi mốc khi có mạng:** Tùy chọn tự động gửi mốc lên Google Sheet ngầm (non-blocking) ngay khi lưu ở thực địa mà không làm chậm máy.
- Cung cấp sẵn mã kịch bản Google Apps Script tích hợp nhanh trong 1 phút.

### 6. 📐 Bài toán Trắc địa chuyên sâu
- **Bài toán trắc địa nghịch:** Tính cự ly ngang $S$, hiệu tọa độ $\Delta X, \Delta Y$, góc phương vị $\alpha$ (độ, phút, giây) và góc phần tư giữa 2 mốc bất kỳ.
- **Tính diện tích & Chu vi thửa đất:** Tự động tính diện tích ($m^2$, ha) và chu vi ranh đất ($m$) từ danh sách các đỉnh mốc khép kín của dự án.

---

## 📐 Tham số tính chuyển chuẩn Quốc gia

Ứng dụng áp dụng chính xác tuyệt đối mô hình chuyển dịch tọa độ không gian 7 tham số **Bursa-Wolf** ban hành theo quy chuẩn Bộ Tài nguyên và Môi trường:

```text
• ΔX (Dịch tâm trục X)   = +191.90441429 m
• ΔY (Dịch tâm trục Y)   = +39.30318279 m
• ΔZ (Dịch tâm trục Z)   = +111.45032835 m
• DS (Tỷ lệ biến dạng)  = -0.252906278 ppm
• ωX (Góc xoay trục X)   = +0.00928836''
• ωY (Góc xoay trục Y)   = -0.01975479''
• ωZ (Góc xoay trục Z)   = +0.00427372''
```

> **Độ chính xác:** Khớp milimét với thuật toán gốc trên phần mềm Android B4A và máy toàn đạc điện tử.

---

## 📱 Hướng dẫn cài đặt trên điện thoại (iOS & Android)

Ứng dụng được đóng gói theo công nghệ **PWA (Progressive Web App)** cho phép bạn cài đặt như một ứng dụng tải từ App Store mà không tốn dung lượng máy:

### Trên iPhone / iPad (Safari)
1. Mở liên kết ứng dụng bằng trình duyệt **Safari**.
2. Nhấn vào nút **Chia sẻ** (biểu tượng hình vuông có mũi tên hướng lên ở thanh công cụ dưới).
3. Cuộn xuống và chọn **"Thêm vào Màn hình chính" (Add to Home Screen)**.
4. Nhấn **Thêm (Add)** ở góc trên bên phải. Biểu tượng ứng dụng sẽ xuất hiện trên màn hình chính và có thể sử dụng ngoại tuyến không cần 4G!

### Trên Android (Google Chrome)
1. Mở liên kết ứng dụng bằng **Chrome**.
2. Bấm vào biểu tượng dấu **3 chấm** ở góc trên bên phải.
3. Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào Màn hình chính"**.

---

## 🚀 Triển khai nhanh lên Vercel

Dự án đã được cấu hình sẵn tệp [vercel.json](vercel.json) tương thích tuyệt đối với Vercel Edge Network:

1. Đăng nhập [https://vercel.com/new](https://vercel.com/new) bằng tài khoản GitHub của bạn.
2. Tìm kho lưu trữ **`VN2000-WGS84`** và nhấn nút **Import**.
3. Tại phần cấu hình:
   - **Framework Preset:** Chọn `Other`.
   - **Root Directory:** Để trống (`./`).
   - Nhấn **Deploy**.
4. Sau 20 giây, ứng dụng sẽ có đường dẫn HTTPS chính thức tốc độ cao dạng:  
   👉 `https://vn2000-wgs84.vercel.app`

---

## 🛠️ Cấu trúc thư mục

```text
├── index.html                 # Giao diện chính Responsive & PWA Viewport
├── app.js                     # Bộ điều khiển trung tâm (Controller & State)
├── geodesy.js                 # Thư viện thuật toán trắc địa Bursa-Wolf & Gauss-Krüger
├── sw.js                      # Service Worker quản lý bộ nhớ đệm ngoại tuyến
├── manifest.json              # Khai báo Web App Manifest cho iOS & Android
├── vercel.json                # Cấu hình máy chủ Vercel (Cache-Control & CleanUrls)
├── package.json               # Cấu hình dự án và scripts
├── vietnam_34_tinh.js         # Dữ liệu ranh giới GeoJSON 34 Tỉnh thành sáp nhập
├── dong_thap_communes.js      # Dữ liệu ranh giới GeoJSON 102 Xã/Phường Đồng Tháp
├── offline_regions.js         # Động cơ tính toán tọa độ Slippy Map Tiles
├── leaflet.js / leaflet.css   # Thư viện bản đồ số Leaflet
├── deploy_github.bat          # Kịch bản đẩy mã nguồn lên GitHub tự động (Windows CMD)
├── deploy_github.ps1          # Kịch bản đẩy mã nguồn giao diện UTF-8 (PowerShell)
└── icon.png / favicon.png     # Bộ biểu tượng ứng dụng độ nét cao
```

---

## 📄 Bản quyền & Tác giả

Phát triển và duy trì bởi **Đặng Như** ([dnpn.ttqt@gmail.com](mailto:dnpn.ttqt@gmail.com)).  
Mã nguồn được phân phối theo giấy phép tự do [MIT License](LICENSE).
