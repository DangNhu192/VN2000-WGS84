---
version: 3.0.0
name: Sylva Glass — Precision Geodetic Design System
description: Studio-grade UI/UX Design System for VN2000-PWA with Guland 2030 Planning Map Integration
colors:
  primary: "#3f8a5a"
  secondary: "#93cc9c"
  tertiary: "#4fa46b"
  neutral-bg: "#171615"
  neutral-surface: "rgba(40, 37, 34, 0.52)"
  neutral-elevated: "rgba(30, 28, 26, 0.86)"
  text-primary: "#f2eee7"
  text-secondary: "#a8a29e"
  text-accent: "#93cc9c"
  border-subtle: "rgba(255, 244, 228, 0.09)"
  border-strong: "rgba(147, 204, 156, 0.45)"
  border-focus: "#93cc9c"
  planning-brand: "#38bdf8"
  planning-bg: "rgba(15, 23, 42, 0.94)"
  planning-surface: "rgba(30, 41, 59, 0.85)"
  planning-border: "rgba(56, 189, 248, 0.35)"
  planning-badge-bg: "rgba(56, 189, 248, 0.18)"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#ef4444"
typography:
  headline-display:
    fontFamily: "Be Vietnam Pro, -apple-system, sans-serif"
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.2
  headline-lg:
    fontFamily: "Be Vietnam Pro, -apple-system, sans-serif"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.2
  headline-md:
    fontFamily: "Be Vietnam Pro, -apple-system, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: "Be Vietnam Pro, -apple-system, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: "Be Vietnam Pro, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  data-mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    fontFeature: "tabular-nums"
  label-sm:
    fontFamily: "Be Vietnam Pro, -apple-system, sans-serif"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 32px
components:
  planning-float-card:
    backgroundColor: "{colors.planning-bg}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    border: "1px solid {colors.planning-border}"
  planning-toggle-btn:
    backgroundColor: "{colors.planning-badge-bg}"
    textColor: "{colors.planning-brand}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "40px"
  planning-opacity-slider:
    height: "6px"
    rounded: "{rounded.full}"
    accentColor: "{colors.planning-brand}"
  planning-province-select:
    backgroundColor: "{colors.planning-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    height: "36px"
    border: "1px solid {colors.border-strong}"
---

# Precision Geodetic & Planning Design System (DESIGN.md)

## Overview
A precision-engineered, high-contrast design system tailored for Vietnamese land surveyors, geodesists, and field civil engineers. 
Designed for extreme readability under high-noon outdoor sunlight and fast, tactile one-hand mobile operation (390×844 and larger). 
Combines the functional rigor of Leica/Trimble surveying hardware with modern Awwwards-grade glassmorphism, OKLCH technical blue accents, and full integration of the **Guland 2030 Land-Use Planning Map Layer**.

## Colors
The palette is rooted in deep technical obsidian, vivid sky cyan, and high-visibility status accents.

### Dark Theme (Field Pro — Default)
- **Primary / Brand (`--accent-primary`):** `#0284c7` (Cobalt Blue)
- **Secondary / Action Focus (`--accent-focus`, `--text-accent`):** `#38bdf8` (Vivid Sky Cyan)
- **Background Canvas (`--bg-canvas`):** `#0b1120` (Obsidian Deep Slate)
- **Surface Layer (`--bg-surface`):** `#111d35` (Dark Navy Panel)
- **Elevated Surface (`--bg-surface-elevated`):** `#182747` (Floating Cards & Modals)
- **Planning Brand Tone (`--planning-brand`):** `#38bdf8` (Guland Planning Map Accent)
- **Planning Card Surface (`--planning-bg`):** `rgba(15, 23, 42, 0.94)` with `backdrop-filter: blur(12px)`
- **Planning Border (`--planning-border`):** `rgba(56, 189, 248, 0.35)`
- **Success (`--accent-success`):** `#10b981` (GPS Fix / Connected)
- **Warning (`--accent-warning`):** `#f59e0b` (Degraded Accuracy / High Dilution of Precision)
- **Danger (`--accent-danger`):** `#ef4444` (Delete / Disconnect / Error)

### Light Theme (High-Noon Outdoor)
- **Canvas:** `#f8fafc` (Ultra-crisp light gray)
- **Surface:** `#ffffff` (Pure white card)
- **Elevated:** `#f1f5f9` (Light slate)
- **Text Primary:** `#0f172a` (High-contrast deep charcoal, WCAG AAA > 12:1)
- **Text Secondary:** `#475569` (Dark gray)
- **Primary:** `#0284c7`

## Typography
- **UI & Reading Typography:** `'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - 100% fine-tuned for Vietnamese diacritics (dấu ngã, hỏi, nặng sắc nét, không gãy dòng).
- **Technical & Coordinates Typography:** `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`
  - Bắt buộc áp dụng `font-variant-numeric: tabular-nums` cho mọi bảng số liệu $X, Y, H$, góc phương vị Azimuth và diện tích $S$.
- **Type Scale Floor:**
  - Micro Floor (Badges / Status Chips): `11px`.
  - Secondary UI (Controls / Subtitles): `12px` - `13px`.
  - Body: `14px`.
  - Headers: `16px` - `18px`.

## Layout
- **Safe Area Insets (4 mép):** Bắt buộc neo qua `--sat-safe-top`, `--sat-safe-bottom`, `--sat-safe-left`, `--sat-safe-right` và `--kb-inset` cho bàn phím ảo.
- **Touch Target Floor:** Mọi nút bấm, ô chọn select, thanh gạt và con trỏ điều khiển đạt tối thiểu **44px × 44px** trên thiết bị di động (`(pointer: coarse)` và `@media (max-width: 900px)`).
- **Split Layout (Desktop/Tablet):** Cột trái chứa biểu mẫu tính toán tọa độ, cột phải là Live Map trực quan (`#transformLiveMap`) tỷ lệ 50/50 hoặc tự co giãn bằng resizer bar.
- **Mobile Stack:** Bản đồ Chuyển đổi và Bản đồ Dự án chiếm toàn màn hình, thanh công cụ bám sát mép trên/dưới ngoài vùng an toàn tai thỏ/nốt ruồi.

## Elevation & Depth
- **Level 1 (Subtle Panes):** `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3)`
- **Level 2 (Floating Controls / HUDs):** `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255, 255, 255, 0.12)`
- **Level 3 (Planning Overlay Panels / Modals):** `box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(56, 189, 248, 0.25)`, `backdrop-filter: blur(14px)`

## Shapes
- **Corner Radii:**
  - `sm` (4px): Checkboxes, micro badges, coordinate chips.
  - `md` (8px): Action buttons, inputs, segmented tabs.
  - `lg` (12px): Floating HUDs, planning controller cards.
  - `full` (9999px): Toggle pills, status dots, range slider thumbs.

## Components

### 1. Planning Map Overlay & Floating Controller (`.planning-float-card`)
- **Vị trí hiển thị:**
  - *Live Map*: Nằm góc trên-phải của khung Live Map (`#boxTransformLiveMapWrap`).
  - *Bản đồ Chuyển đổi Độc lập*: Nằm ngay dưới thanh công cụ `#transformMapToolbar`.
  - *Bản đồ Dự án*: Nằm góc trên-trái hoặc liên kết với nút "📐 Quy hoạch" trên `#mapProjectBar`.
- **Thành phần:**
  - **Header:** Biểu tượng 📐 + Tiêu đề "QUY HOẠCH 2030 (GULAND)" + Nút thu gọn / đóng `✕`.
  - **Trạng thái:** Status chip xanh lục `🟢 Đang bật` / xám `⚪ Đang tắt`.
  - **Menu Tỉnh Thành:** Dropdown 63 tỉnh thành, tự động nhảy theo KTT hoặc Tỉnh đang chọn trong dự án.
  - **Thanh trượt Opacity:** Dải `10%` đến `100%` (mặc định `65%`), kéo mượt mà 60fps cập nhật tức thời trên Leaflet layer.
  - **Nút "🎯 Về tâm tỉnh":** Phóng nhanh bản đồ về trung tâm tỉnh đã chọn.
  - **Nút "↺ Đặt lại":** Khôi phục độ mờ mặc định 65%.

### 2. Planning Action Toggle Button (`.btn-planning-toggle`)
- **Kích thước:** Chiều cao tối thiểu 36px (desktop) / 44px (mobile touch floor).
- **Trạng thái Active:** Nền gradient cyan `linear-gradient(135deg, rgba(56,189,248,0.25), rgba(2,132,199,0.35))`, viền `#38bdf8`, chữ trắng sáng.
- **Trạng thái Inactive:** Nền bán trong suốt `rgba(255,255,255,0.06)`, chữ `#94a3b8`.

## Do's and Don'ts
- **DO** duy trì sự cách ly 100% giữa các phân hệ: Live Map, Bản đồ Chuyển đổi độc lập và Bản đồ Dự án phải sở hữu instance và panel riêng biệt.
- **DO** tự động lưu tỉnh đã chọn và độ mờ vào `localStorage` (`vn2k_planning_province`, `vn2k_planning_opacity`) để giữ nguyên cấu hình khi người dùng mở lại app.
- **DO** bảo đảm lớp quy hoạch nằm ở `zIndex: 350 - 400` (trên ảnh vệ tinh và bản đồ đường OSM, nhưng dưới các mốc tọa độ, đường CAD và nhãn đo đạc).
- **DON'T** gọi chéo giao diện: Không hiển thị thanh công cụ `#mapProjectBar` của Dự án trên màn hình Chuyển đổi tọa độ.
- **DON'T** gán cứng kích thước nhỏ dưới 44px trên thiết bị di động.
- **DON'T** sử dụng hiệu ứng rung giật hoặc bounce animation.
