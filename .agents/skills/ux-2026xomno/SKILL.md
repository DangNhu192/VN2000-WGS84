---
name: UX-2026Xomno
description: Bộ kỹ năng dựng website đỉnh cao & đẹp chuẩn 2026 (xomno01/IMOL2o). Chắt lọc từ 5 nhánh nghiên cứu: thẩm mỹ thị giác (OKLCH, Aurora UI, Bento Grid), stack frontend 2026 (Tailwind v4, native CSS, View Transitions), cinematic 3D/WebGPU, motion vật lý 60fps (Lenis, GSAP), và quy trình AI chống slop. Đạt chuẩn Awwwards-grade (Design 40%, Usability 30%, Creativity 20%, Content 10%).
when_to_use: "Khi người dùng yêu cầu dựng website đỉnh cao, đẹp chuẩn 2026, thiết kế Awwwards-ready, tạo điểm nhấn 3D/WebGPU cinematic, tinh chỉnh motion cao cấp 60fps, hoặc chống mã giao diện AI lười biếng (Anti-AI-slop)."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# ✦ UX-2026Xomno — Dựng Website Đỉnh Cao & Đẹp Chuẩn 2026 (IMOL2o)

> Dựa trên nghiên cứu của **[xomno01/IMOL2o](https://github.com/xomno01/IMOL2o)**.  
> Không phải template mẫu. Không phải AI slop.  
> Aurora UI · OKLCH · WebGPU · 60fps Motion · Từ nghiên cứu đến thực tế — phiên bản 2026.

---

## 🎯 I. TRIẾT LÝ BẤT BIẾN (CORE LAWS)

1. **Đẹp đỉnh = 1 "Signature Moment" + Usability + Performance:**
   - Site đoạt giải **trượt vì usability + performance, không phải thiếu sáng tạo**.
   - Tiêu chí Awwwards: Design `40%` · **Usability `30%`** · Creativity `20%` · Content `10%`.
   - **Tuyệt đối KHÔNG** nhồi 20 hiệu ứng chuyển động vào cùng 1 trang làm nghẽn CPU/GPU.
2. **Nền tảng đúng từ đầu rẻ hơn sửa sau:**
   - OKLCH + Tailwind v4 + variable fonts + native CSS (`:has()`, container queries, View Transitions) là chuẩn sàn của năm 2026.
3. **Tiết chế = Sang:**
   - Motion ít mà đúng vật lý (spring curves, easing thật, thời lượng 150–400ms, chỉ `transform` + `opacity`) đánh bại mọi hiệu ứng lòe loẹt.
4. **AI ra đẹp nhờ Grounding, không nhờ công cụ:**
   - Design tokens cụ thể + reference thực tế mới thoát khỏi "AI slop" (Inter + gradient tím lịm + 3 card bo góc bằng chằn chặn).
5. **Accessibility là dấu hiệu tay nghề:**
   - Luôn tôn trọng `prefers-reduced-motion`, độ tương phản WCAG 2.1 AA/AAA, semantic HTML.

---

## 🧭 II. KHUNG RA QUYẾT ĐỊNH (DECISION FRAMEWORK)

| Kịch bản | Stack đề xuất 2026 | Lý do kỹ thuật |
|:---|:---|:---|
| **Landing / Portfolio siêu đẹp, SEO** | **Astro** + Tailwind v4 + View Transitions + CSS scroll-driven | Zero-JS mặc định $\rightarrow$ LCP/INP/SEO hoàn hảo; Islands cho phần tương tác |
| **Web App phức tạp (React)** | **Next.js 16** App Router/RSC + shadcn/ui + Biome | Hệ sinh thái hoàn thiện, Turbopack ổn định |
| **Web App nhẹ, phản hồi tức thời** | **SvelteKit 2** (Svelte 5 Runes) | Bundle siêu nhẹ, syntax tinh gọn, reactivity đỉnh cao |
| **PWA Ngoại tuyến Kỹ thuật** | **Vanilla HTML5 / Modern CSS / ES-Modules** | Không tốn chi phí bundle, tốc độ tức thời ngoài thực địa |

---

## 🎨 III. 5 TRỤ CỘT THAM CHIẾU CHI TIẾT (THE 5 PILLARS)

### 1. Thẩm Mỹ Thị Giác 2026 (Visual Design)
- **Bảng màu OKLCH:** Chuyển đổi toàn bộ hex/hsl sang `oklch(L C H)` để màu sắc bảo toàn độ sáng đồng đều giữa các sắc thái.
- **Aurora UI:** Sử dụng các dải màu khuếch tán đa điểm `radial-gradient` với độ mờ đục nhẹ nhàng (opacity 0.08 - 0.2) tạo chiều sâu không gian huyền bí.
- **Bento Grid:** Bố cục bất đối xứng có chủ đích (1 thẻ chiếm 2x2, 2 thẻ 1x1, 1 thẻ 1x2) kết hợp nhãn pill badge.
- **Tinted Dark Mode:** Nền tối không dùng đen tuyền `#000000` mà pha sắc tố đêm `oklch(0.12 0.02 260)`.

### 2. Stack Frontend Hiện Đại (Modern Frontend)
- **Tailwind v4 CSS-First:** Cấu hình thông qua chỉ thị `@theme` trong CSS thay vì file `tailwind.config.js`.
- **CSS Native 2026:**
  - `:has()` thay thế cho các selector phức tạp bằng JavaScript.
  - `@container` queries giúp component phản hồi theo kích thước cha thay vì chỉ theo viewport.
  - Native `@view-transition` cho chuyển trang mượt mà như app native.

### 3. Cinematic 3D / WebGPU (Signature Moment)
- Tận dụng WebGPU hoặc Three.js / Spline tối ưu hóa render.
- Chỉ kích hoạt canvas 3D khi nằm trong viewport (`IntersectionObserver`).
- Luôn có phương án Fallback ảnh tĩnh/CSS gradient khi thiết bị không hỗ trợ GPU mạnh.

### 4. Motion & Tương Tác Vật Lý (Motion Physics)
```css
/* Easing chuẩn 2026: Nhanh dứt khoát lúc vào, phanh êm lúc dừng */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5. Quy Trình AI Chống Generic / Slop (AI Grounding Workflow)
- **Bước 1:** Bắt buộc định nghĩa danh sách Design Tokens (Colors, Radii, Shadows, Fonts) trước khi sinh code.
- **Bước 2:** Chọn trước 1 linh hồn thiết kế độc bản (ví dụ: Linear Minimalist, Cyber-Engineering, Industrial Bauhaus).
- **Bước 3:** Kiểm tra Lighthouse ngay trong quá trình xây dựng, giữ INP < 200ms.