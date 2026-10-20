---
name: vibe-design-harness
description: "Studio-Grade UI/UX Design System Engine & Anti-Slop Harness for AI Agents (AGS v2.0). BẮT BUỘC áp dụng cho TẤT CẢ các ứng dụng/app được xây dựng (Web, SaaS, PWA, Mobile, Mini Apps, Landing Pages). Kiểm soát chất lượng toàn trình qua 30-Gate Deterministic UI Linter (<1ms), khởi tạo cặp DESIGN.md + PRODUCT.md từ 14 chủ đề thiết kế cao cấp, 12 quy trình hậu kỳ thiết kế chuyên sâu, 5 bộ adapter hình ảnh studio và bộ bảo vệ typography tiếng Việt CapCut 134/134 ký tự có dấu."
---

# 🎨 VIBE DESIGN HARNESS (AGS STUDIO v2.0)
> **Engine:** Studio-Grade UI/UX Design System · 30-Gate Anti-Slop UI Linter · 14 Pro Themes · 12 Design Commands · CapCut Vietnamese Typography Engine · 5-Platform Studio Image Compiler.
> **Quy định:** BẮT BUỘC tuân thủ và áp dụng cho TẤT CẢ các ứng dụng/app được xây dựng hoặc đại tu giao diện.

---

## 🏛️ 5 TRỤ CỘT BẮT BUỘC KHI XÂY DỰNG MỌI ỨNG DỤNG (APP & UI)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   VIBE DESIGN HARNESS — LIFECYCLE CHUẨN                      │
├───────────────────────────┬───────────────────────────┬─────────────────────┤
│ 1. Context Gate           │ 2. Scaffolding & Zero-Slop│ 3. 30-Gate Linter   │
│    (DESIGN.md+PRODUCT.md) │    Component Assembly     │    & Auto-Fixer     │
├───────────────────────────┼───────────────────────────┼─────────────────────┤
│ • 14 Brand Token Themes   │ • Pro UI Layouts          │ • AST/Regex <1ms    │
│ • Deep Rationale          │ • Bento Grids & Micro-FX  │ • Trảm sạch AI-Slop │
├───────────────────────────┴───────────────────────────┴─────────────────────┤
│ 4. 12 Post-Processing Design Flows (Audit, Critique, Polish, Distill, etc.) │
│ 5. Visual Studio & CapCut Vietnamese Typography Guard (134 Glyphs U+0102)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ TRỤ CỘT 1: GATE BẮT BUỘC — KHỞI TẠO DESIGN.MD + PRODUCT.MD

Trước khi viết bất kỳ dòng mã UI/App nào, **PHẢI** tạo hoặc nạp context thương hiệu từ một trong 14 chủ đề chuyên nghiệp:

```bash
# Khởi tạo cặp context DESIGN.md và PRODUCT.md trong thư mục dự án
vibe-design-harness init-context <theme> --name "<Tên_Ứng_Dụng>"
```

### 14 Chủ Đề Thiết Kế Độc Quyền (14 Built-in Pro Themes):
1. **`ags_editorial`**: Phong cách tạp chí sang trọng, đẳng cấp (AgentSea signature).
2. **`apple_luxury`**: Tinh tế, tối giản cao cấp chuẩn Cupertino, bo góc chuẩn mực, frosted glass.
3. **`linear_dark`**: Dark tech mode sâu thẳm, viền mờ tinh xảo, tối ưu năng suất cao.
4. **`minimal_mono`**: Trắng đen đơn sắc thuần túy, typography đậm nét, không màu mè.
5. **`nordic_frost`**: Xanh băng giá Bắc Âu, không gian thở thoáng đãng, yên tĩnh.
6. **`warm_craft`**: Tông màu ấm tự nhiên, đất son cát vàng, cảm giác thủ công cao cấp.
7. **`cyber_matrix`**: Phong cách viễn tưởng Cyberpunk/High-tech, neon accents trên nền đen tuyền.
8. **`neo_brutalist`**: Viền đen dày dặn, tương phản cực đại, cá tính mạnh mẽ hiện đại.
9. **`tokyo_night`**: Tím than đêm Tokyo, ánh neon xanh lam - hồng rực rỡ nhưng tinh tế.
10. **`swiss_modern`**: Lưới cấu trúc Thụy Sĩ chuẩn xác, kiểu chữ Sans-serif cân bằng tuyệt đối.
11. **`emerald_wealth`**: Xanh ngọc lục bảo hoàng gia kết hợp vàng kim, dành cho Fintech/Wealth.
12. **`rose_elegance`**: Hồng phấn sang trọng, thẩm mỹ mỹ phẩm, phong cách sống cao cấp.
13. **`ocean_depths`**: Xanh đại dương thẳm sâu, gradient dịu mắt, an tâm tin cậy.
14. **`sunset_vibe`**: Ráng chiều hoàng hôn cam ấm - tím hồng nghệ thuật, giàu cảm xúc.

---

## ⚡ TRỤ CỘT 2: 30-GATE DETERMINISTIC ANTI-SLOP LINTER (KIỂM SOÁT AI-SLOP <1MS)

Tất cả các tệp UI (`.html`, `.jsx`, `.tsx`, `.vue`, `.svelte`, `.css`) khi tạo mới hoặc chỉnh sửa **BẮT BUỘC** phải vượt qua 30 cổng kiểm định:

```bash
# Quét và tự động sửa các lỗi AI-slop trong tệp UI
vibe-design-harness lint <đường_dẫn_tệp> --fix

# Xem danh sách đầy đủ 30 detector rules
vibe-design-harness rules
```

### Các Cổng Cấm Tuyệt Đối (Zero Tolerance):
1. **Color Gates**:
   - ❌ **CẤM** gradient tím AI rập khuôn (`from-purple-600 to-indigo-600`, `purple-500`, `#8b5cf6`).
   - ❌ **CẤM** mã màu HEX thô bạo không qua bảng màu token (`#ff0000`, `#0000ff`).
   - ❌ **CẤM** màu xanh lam mặc định Bootstrap/Tailwind cũ.
2. **Layout Gates**:
   - ❌ **CẤM** bố cục 3 cột thẻ giống hệt nhau (Cookie-cutter 3-card features).
   - ❌ **CẤM** thẻ lồng trong thẻ (Nested card inside card trap).
   - ❌ **CẤM** các icon bay lơ lửng đặt trong khối hộp tròn gradient lòe loẹt (Toy-box icons).
3. **Typography Gates**:
   - ❌ **CẤM** lạm dụng một font `Inter` đơn điệu cho toàn bộ giao diện. Phải phối hợp font Tiêu đề + Thân bài có cá tính (Geist, Outfit, Plus Jakarta Sans, Syne, Cormorant Garamond, Be Vietnam Pro).
   - ❌ **CẤM** thiếu letter-spacing khi viết hoa (Uppercase tracking) và thiếu line-height giãn cách dấu tiếng Việt.
4. **Copywriting Gates**:
   - ❌ **CẤM** các câu khẩu hiệu AI sáo rỗng ("Empower your workflow", "Unlock your potential", "Revolutionize the way you...", "Seamless experience"). Phải viết copy trực diện, giải quyết đúng nỗi đau người dùng thực tế.
5. **Micro-Interactions**:
   - ✅ Bắt buộc mọi nút bấm/thẻ tương tác phải có `active:scale-[0.98]`, hover transition 150-200ms mượt mà, focus-visible có vòng viền rõ ràng.

---

## ⚡ TRỤ CỘT 3: 12 POST-PROCESSING DESIGN WORKFLOWS (HẬU KỲ GIAO DIỆN)

Khi cần tối ưu hoặc đại tu giao diện theo yêu cầu cụ thể, kích hoạt playbook tương ứng:

```bash
vibe-design-harness command <tên_lệnh>
```

| Tên Lệnh | Mô Tả & Tác Động |
| :--- | :--- |
| **`audit`** | Kiểm toán toàn diện hệ thống phân tầng thị giác, contrast, token và nhịp điệu không gian. |
| **`critique`** | Phân tích phản biện sắc bén dưới góc nhìn Art Director cao cấp. |
| **`polish`** | Tinh chỉnh vi mô: bo góc, bóng mờ (shadows), đường viền kính (glass borders), micro-transitions. |
| **`distill`** | Tối giản hóa: lược bỏ các chi tiết thừa, tăng khoảng trắng âm, làm sạch giao diện. |
| **`bolder`** | Tăng độ đậm, tương phản cao hơn, typography ấn tượng, kích thước tiêu đề mạnh mẽ. |
| **`quieter`** | Hạ tông màu, làm dịu mắt, chuyển sang phong cách Quiet Luxury, giảm độ bão hòa. |
| **`delight`** | Thêm các chi tiết vi mô bất ngờ, gradient viền óng ánh, hiệu ứng phản hồi xúc giác thị giác. |
| **`harden`** | Tăng độ bền vững, khả năng chịu lỗi, trạng thái rỗng (empty states), error boundaries, accessibility. |
| **`clarify`** | Làm rõ thông tin, cải thiện phân tầng thông tin, bảng biểu dễ đọc, nhãn trực quan. |
| **`adapt`** | Tối ưu hóa phản hồi đa màn hình (Mobile, Tablet, Desktop, Ultrawide). |
| **`colorize`** | Tái cấu trúc bảng màu theo gam màu HSL/OKLCH chọn lọc, tạo độ sâu màu sắc. |
| **`animate`** | Bổ sung hoạt ảnh 60fps mượt mà, layout exit/entry, micro-stagger animations. |

---

## ⚡ TRỤ CỘT 4: BẢO VỆ TYPOGRAPHY TIẾNG VIỆT & XUẤT ASSET CAPCUT

Khi ứng dụng có hiển thị văn bản tiếng Việt hoặc hình ảnh video quảng bá:

```bash
# 1. Kiểm tra font có hỗ trợ đủ 134 ký tự dấu tiếng Việt (U+0102 - U+1EF9)
vibe-design-harness check-font "Tên_Font"

# 2. Xuất SVG chữ trong suốt + JSON cấu hình CapCut/Figma chuẩn tỉ lệ
vibe-design-harness export-typography --preset bold_impact \
  --title "Tiêu Đề Điểm Nhấn" \
  --subtitle "Mô tả phụ sắc nét" \
  --badge "PHIÊN BẢN 2026"
```

---

## ⚡ TRỤ CỘT 5: TÍCH HỢP VÀO TOÀN TRÌNH LẬP TRÌNH (AGENT WORKFLOW)

1. **Khi nhận yêu cầu tạo App mới (New App) hoặc trang mới:**
   - Kích hoạt `vibe-design-harness init-context <theme> --name <tên_app>`.
   - Đọc các token trong `DESIGN.md` để sinh CSS/Tailwind config.
2. **Trong lúc viết code UI:**
   - Dùng các Pro Component Blocks có sẵn: `vibe-design-harness components`.
   - Giữ nguyên lý phân tầng và độ tương phản cao.
3. **Trước khi hoàn tất hoặc bàn giao cho người dùng:**
   - Chạy lệnh linter: `vibe-design-harness lint <file> --fix`.
   - Đảm bảo 100% không còn vi phạm AI-slop.
