# KẾ HOẠCH KIẾN TRÚC HỆ THỐNG (ARCHITECTURAL PLAN)
## Dự án: VN2000-PRO Modular Re-architecture v2.0
### Chuẩn: Spec-Driven Development (Bộ Nhớ Spec-Kit)

---

## 🏛️ I. MÔ HÌNH PHÂN TÁCH TRÁCH NHIỆM (SEPARATION OF CONCERNS)

Để khắc phục tình trạng file monolithic tập trung toàn bộ logic, hệ thống được quy hoạch theo mô hình Kiến trúc Sạch 3 Tầng (Clean 3-Tier Architecture):

```
┌─────────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER (UI SHELL)                │
│  • Lovable Dark/Light Theme Controller                      │
│  • Floating Island Bottom Navigation & Glass Header         │
│  • Bento Grid Dashboard, Modals, Forms & Canvas Views       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Events / User Actions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 APPLICATION / MODULE COORDINATOR            │
│  • AppState & Dispatcher                                    │
│  • Screen View Routers (appNav)                             │
│  • Multi-point Import Pipeline & File Exporters             │
└──────────────────────────────┬──────────────────────────────┘
                               │ Calls
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 CORE DOMAIN ENGINE (NO DOM)                 │
│  • GeodesyEngine: Gauss-Kruger & 7 Helmert Parameters       │
│  • CadGeometryEngine: Polygons, Shoelace Area, Object Snap  │
│  • VolumeCalculationEngine: Cut/Fill & TCVN 4447 Math       │
│  • DataStoreEngine: Offline Queue, Trash 30-Day, Google Sync│
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 II. CẤU TRÚC THƯ MỤC MODULE HÓA (VANILLA PWA ES-MODULES)

```
VN2000-PWA/
├── .specs/                      # Hồ sơ Đặc tả chuẩn Spec-Kit
│   ├── 00_constitution.md
│   ├── 01_specification.md
│   ├── 02_architectural_plan.md
│   ├── 03_task_breakdown.md
│   └── 04_verification_gate.md
├── src/
│   ├── core/                    # Domain Engines (Thuần tính toán, kiểm thử độc lập)
│   │   ├── geodesy_engine.js    # Thuật toán VN-2000 / WGS-84
│   │   ├── cad_geometry.js      # Tính toán hình học CAD, diện tích Shoelace
│   │   ├── volume_calc.js       # Thuật toán đào đắp TCVN 4447
│   │   └── data_store.js        # LocalStorage, Thùng rác 30 ngày, Đồng bộ Sheets
│   ├── modules/                 # Module điều khiển giao diện từng phân hệ
│   │   ├── transform_module.js  # Chuyển đổi tọa độ đơn / hàng loạt
│   │   ├── project_map_module.js# Bản đồ mốc dự án (Read-only)
│   │   ├── cad_module.js        # Vẽ mặt bằng MiniCAD
│   │   ├── stakeout_module.js   # Cắm mốc thực địa & radar la bàn
│   │   ├── camera_module.js     # Camera đóng dấu thủy ấn
│   │   └── profile_module.js    # Trắc dọc & đào đắp hố móng
│   └── ui/                      # Giao diện vỏ (UI Shell)
│       ├── theme_controller.js  # Lovable Dark/Light Theme Controller
│       └── app_shell.js         # Header, Island Nav, Toast, Haptics
├── index.html                   # Giao diện chính Lovable Design System v2.0
├── app.js                       # Entry point tương thích ngược 100%
└── tests/                       # 13 Test suites bảo vệ hồi quy (100% Pass)
```

---

## ⚡ III. SƠ ĐỒ ĐỒ THỊ BỘ NHỚ TRI THỨC (CODEBASE MEMORY GRAPH)

Áp dụng phương pháp phân tích của **DeusData Codebase-Memory-MCP**:

1. **Ranh giới an toàn của Hàm Xuất Khẩu Toàn Cục (Global Public APIs):**
   - Các hàm: `window.appNav`, `window.appTransform`, `window.appMap`, `window.appCadTool`, `window.appElevationProfile`, `window.appData`, `window.appTheme`, `window.getAppEffectiveDate` phải giữ nguyên định danh để đảm bảo toàn bộ thuộc tính `onclick="..."` trong HTML hoạt động liên tục.
2. **Bán kính ảnh hưởng (Blast Radius Mapping):**
   - Khi chỉnh sửa `geodesy.js` hoặc thuật toán chuyển đổi: Bắt buộc chạy `tests/geodesy.test.js` và `tests/smart_import_and_blocks.test.js`.
   - Khi chỉnh sửa giao diện và CSS: Bắt buộc chạy `tests/ux_enhancements_v2.test.js`, `tests/elevation_profile_ux.test.js`, `tests/ux_lovable_theme.test.js`.
   - Khi chỉnh sửa dữ liệu và thùng rác: Bắt buộc chạy `tests/project_trash.test.js`.

---

## 🚀 IV. ĐỊNH HƯỚNG MỞ RỘNG DỰ ÁN MỚI (MODERN TYPESCRIPT / VITE SCAFFOLDING)
Bên cạnh việc mô-đun hóa dự án hiện hữu, thiết lập cấu hình nền tảng cho thư mục dự án hiện đại:
- Vite + TypeScript + Tailwind CSS / Vanilla CSS Tokens.
- Module hóa các thuật toán trắc địa thành gói thư viện dùng chung `@vn2000/core`.
