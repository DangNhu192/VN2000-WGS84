---
name: ux-loveable
description: Kỹ năng sao chép, tái cấu trúc và tái tạo giao diện người dùng đỉnh cao chuẩn 2026 (Hợp nhất Firecrawl Open-Lovable & xomno01 IMOL2o). Chuyên bóc tách phân tầng thị giác (Visual Hierarchy), trích xuất hệ thống Design Tokens OKLCH/Tailwind v4, chuyển hóa giao diện sang phong cách hiện đại Awwwards-grade, trau chuốt (Aurora UI, Bento Grid, Cinematic 3D/WebGPU signature moment, Lenis/GSAP 60fps motion, dark/light tinted theme, Shadcn/Tailwind ergonomics) mà vẫn bảo toàn 100% logic nghiệp vụ.
when_to_use: "Khi người dùng yêu cầu tái tạo, hiện đại hóa (redesign/modernize), clone giao diện từ website/ảnh/mã nguồn sẵn có, hoặc nâng cấp toàn diện UI/UX ứng dụng theo chuẩn Lovable.dev, Open-Lovable và IMOL2o 2026."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 2.5.0
---

# ux-Loveable Pro 2026 — Kỹ Năng Tái Tạo & Hiện Đại Hóa Giao Diện Đẳng Cấp

> Hợp nhất sức mạnh của:  
> 1. **[firecrawl/open-lovable](https://github.com/firecrawl/open-lovable):** Pipeline cào bóc tách DOM, nhân bản giao diện sang React/Tailwind/Lucide/Shadcn tức thì.  
> 2. **[xomno01/IMOL2o](https://github.com/xomno01/IMOL2o):** Bộ kỹ năng dựng website đỉnh cao chuẩn 2026 (Awwwards-grade, OKLCH, Aurora UI, WebGPU/3D signature moment, motion vật lý 60fps, anti-AI-slop grounding).

---

## 🎯 I. 4 TRỤ CỘT "ĐẸP ĐỈNH" CHUẨN 2026 (IMOL2o ENHANCEMENT)

1. **🎨 Nền Tảng Màu Sắc & Kiểu Chữ Hiện Đại:**
   - Không gian màu **OKLCH** cho độ chuyển màu mịn, không bị bệt vùng tối hay chói lóa vùng sáng.
   - Tailwind v4 `@theme` / Native CSS (`:has()`, container queries, View Transitions).
   - Tuyệt đối không dùng cặp font mặc định nhàm chán (Inter + slate-900). Sử dụng variable fonts (Geist, Outfit, Plus Jakarta Sans, JetBrains Mono cho số liệu trắc địa/kỹ thuật).
   - Dark mode có chiều sâu (Tinted Dark: pha nhẹ 2-4% sắc tố chàm/xanh navy vào nền đen).

2. **💫 Một "Signature Moment" Đắt Giá:**
   - Đẹp đỉnh = 1 điểm nhấn duy nhất (Hero 3D WebGPU, thẻ bento phản quang aurora, hoặc một scroll-reveal đắt giá). **KHÔNG nhồi 20 hiệu ứng lòe loẹt làm lag máy.**
   - Tiêu chí Awwwards: Design `40%` · **Usability `30%`** · Creativity `20%` · Content `10%`.

3. **🌊 Motion Tiết Chế & Đúng Vật Lý (60fps Motion):**
   - Easing tự nhiên (spring curves, cubic-bezier(0.16, 1, 0.3, 1), thời lượng 150–400ms).
   - Chỉ animate trên thuộc tính phần cứng: `transform` và `opacity`.
   - Bắt buộc tôn trọng `prefers-reduced-motion` vì khả năng tiếp cận (a11y).

4. **🤖 Thoát Khỏi "AI Slop" Nhờ Grounding Chặt Chẽ:**
   - AI code ra sản phẩm xấu vì dùng style mặc định của mô hình. Thoát slop bằng cách neo vào hệ thống Design Tokens cụ thể và linh hồn sản phẩm thực tế.

---

## 📐 II. BẢNG MÀU OKLCH & HỆ THỐNG DESIGN TOKENS CHUẨN 2026

```css
:root, [data-theme="dark"] {
  /* Nền Tinted Dark sâu lắng */
  --lv-bg-base: oklch(0.12 0.02 260);        /* Nền tổng thể siêu sâu pha xanh đêm */
  --lv-bg-surface: oklch(0.16 0.03 260);     /* Bề mặt panel, sidebar */
  --lv-bg-card: oklch(0.20 0.035 260);      /* Bề mặt card, khung nội dung */
  --lv-bg-elevated: oklch(0.24 0.04 260);  /* Bề mặt nổi (popover, dropdown) */

  /* Viền kính mờ & Aurora Gradient */
  --lv-border-subtle: oklch(0.98 0.01 260 / 0.08);
  --lv-border-focus: oklch(0.65 0.22 265);
  --lv-aurora-glow: radial-gradient(circle at 50% 0%, oklch(0.65 0.22 265 / 0.18), transparent 70%);

  /* Typography */
  --lv-text-primary: oklch(0.98 0.005 260);
  --lv-text-secondary: oklch(0.75 0.02 260);
  --lv-text-muted: oklch(0.55 0.02 260);

  /* Accents Công Nghệ 2026 */
  --lv-accent-indigo: oklch(0.62 0.23 265);  /* Indigo hiện đại */
  --lv-accent-cyan: oklch(0.78 0.16 200);    /* Cyan công nghệ */
  --lv-accent-emerald: oklch(0.75 0.18 155); /* Emerald định vị GPS */
  --lv-accent-amber: oklch(0.80 0.17 75);    /* Cảnh báo */
  --lv-accent-rose: oklch(0.65 0.24 15);     /* Xóa / Nguy hiểm */
}

[data-theme="light"] {
  --lv-bg-base: oklch(0.98 0.005 260);
  --lv-bg-surface: oklch(1 0 0);
  --lv-bg-card: oklch(1 0 0);
  --lv-bg-card-hover: oklch(0.96 0.01 260);
  --lv-border-subtle: oklch(0.2 0.02 260 / 0.1);
  --lv-text-primary: oklch(0.18 0.03 260);
  --lv-text-secondary: oklch(0.42 0.03 260);
  --lv-accent-indigo: oklch(0.55 0.24 265);
}
```

---

## 🛠️ III. QUY TRÌNH TÁI TẠO & NÂNG CẤP WEBSITE 5 BƯỚC

1. **Bóc tách & Phân tích cấu trúc:** Quét toàn bộ DOM/CSS hoặc URL nguồn, bóc tách phân tầng thị giác và sơ đồ luồng người dùng.
2. **Thiết lập Design Tokens:** Xác lập bảng màu OKLCH, typography, spacing, border-radius trong file định nghĩa.
3. **Thực thi Kiến trúc Shell:** Dựng Floating Island Bottom Nav, Floating Glass Header, Bento Grid Layout.
4. **Cài cắm 1 Signature Moment:** Bổ sung hiệu ứng đắt giá (ví dụ: radar cắm mốc tỏa xung ánh sáng, hoặc canvas trắc dọc chuyển động mượt 60fps).
5. **Kiểm thử Liêm chính & Đo đạc:** Kiểm tra Lighthouse (Performance > 90, Accessibility 100), kiểm tra không giật khung hình khi thao tác dữ liệu lớn.