# DESIGN.md — Precision Geodetic Design System

## Design Persona & Visual World
- **Archetype:** Precision Instrument / Professional Geodetic Tool (Công cụ trắc địa chính xác).
- **Inspiration:** Leica Geosystems, Trimble Field Controllers, Bauhaus Technical Instruments.
- **Aesthetic Tenets:**
  - **Clarity over Cleverness:** Dữ liệu trắc địa là trung tâm, loại bỏ hoàn toàn các trang trí rườm rà.
  - **High Contrast Readability:** Tương phản cao đạt chuẩn WCAG AAA, tối ưu cho mắt khi nhìn màn hình ngoài trời nắng.
  - **Rock-Solid Stability:** Cửa sổ, header, thanh điều hướng luôn cố định vững chãi, chuyển tab không giật lag.
  - **Smooth Deceleration Motion:** Triệt tiêu hoàn toàn hiệu ứng bounce/elastic nảy giật, sử dụng đường cong hãm đà mượt mà (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## Design Tokens

### 1. Color Palette (OKLCH / Hex Mappings)

#### Dark Theme (Field Pro — Default)
- `--bg-canvas`: `#0b1120` (Nền chính đêm sâu)
- `--bg-surface`: `#111d35` (Thẻ container / Thân bảng điều khiển)
- `--bg-surface-elevated`: `#182747` (Khối nổi / Modal box)
- `--border-subtle`: `rgba(255, 255, 255, 0.10)`
- `--border-strong`: `rgba(56, 189, 248, 0.35)`
- `--border-focus`: `#38bdf8` (Xanh Cyan định vị)
- `--text-primary`: `#f8fafc` (Trắng sáng rõ nét)
- `--text-secondary`: `#94a3b8` (Xám bạc dịu mắt)
- `--text-accent`: `#38bdf8` (Cyan nổi bật)
- `--accent-primary`: `#0284c7` (Xanh cobalt kỹ thuật)
- `--accent-success`: `#10b981` (Xanh lục vệ tinh / GPS Fix)
- `--accent-warning`: `#f59e0b` (Vàng hổ phách cảnh báo)
- `--accent-danger`: `#ef4444` (Đỏ mốc cảnh báo)

#### Light Theme (High-Noon Outdoor)
- `--bg-canvas`: `#f8fafc` (Nền sáng sạch)
- `--bg-surface`: `#ffffff` (Thẻ trắng tinh khiết)
- `--bg-surface-elevated`: `#f1f5f9` (Khối xám nhẹ)
- `--border-subtle`: `rgba(15, 23, 42, 0.12)`
- `--border-strong`: `rgba(2, 132, 199, 0.40)`
- `--border-focus`: `#0284c7`
- `--text-primary`: `#0f172a` (Đen sâu tương phản cao)
- `--text-secondary`: `#475569` (Xám đậm dễ đọc)
- `--text-accent`: `#0369a1`
- `--accent-primary`: `#0284c7`
- `--accent-success`: `#059669`
- `--accent-warning`: `#d97706`
- `--accent-danger`: `#dc2626`

---

### 2. Typography

- **UI & Reading Font:** `'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  - Đã tối ưu hóa 100% cho chữ Quốc ngữ tiếng Việt (dấu thanh sắc sảo, không lệch dòng).
- **Data & Coordinates Font:** `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`
  - Bắt buộc dùng `font-variant-numeric: tabular-nums` để các hàng số $X, Y, H$ thẳng hàng tuyệt đối.
- **Type Scale Floor:**
  - Micro Floor (Labels / Badges / Chips): `11px` (tuyệt đối không dùng dưới 11px).
  - Secondary UI (Subtitles / Inputs / Buttons): `12px` - `13px`.
  - Body Text: `14px`.
  - Section Headers: `15px` - `16px`.
  - Primary Titles: `18px` - `22px`.

---

### 3. Spacing Scale
- `2xs`: `4px`
- `xs`: `8px`
- `sm`: `12px`
- `md`: `16px`
- `lg`: `20px`
- `xl`: `24px`
- `2xl`: `32px`

---

### 4. Motion & Transitions
- **Standard Transition:** `all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`
- **Modal Entry:** `opacity 0.25s ease-out, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)`
- **Absolute Ban:** Không sử dụng `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce) hoặc các animation rung lắc.
