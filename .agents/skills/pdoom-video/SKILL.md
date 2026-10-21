---
name: pdoom-video
description: "Kỹ năng Sản Xuất Video Âm Nhạc & Hướng Dẫn Render Bằng Code (Code-Rendered Music Video & Kinetic Typography Engine - mexicat/pdoom-video). Chuyên tạo video 60fps hoàn toàn bằng mã nguồn (TypeScript, Three.js, Canvas, WebGL, Web Audio), đồng bộ lời hát Karaoke từng từ (Word-synced Karaoke Typography), phân tích nhịp điệu (BPM, Beat Grid, Downbeats), kết xuất video xác định (Deterministic Timeline) và hỗ trợ phụ đề song ngữ Anh - Việt chất lượng cao."
---

# SIÊU KỸ NĂNG: CODE-RENDERED MUSIC & TUTORIAL VIDEO ENGINE (`pdoom-video`)
> **Nguồn gốc:** Phỏng theo kiến trúc của `mexicat/pdoom-video` ("I'm Upping My P(doom)" - Code-rendered music video with word-synced karaoke typography).
> **Nguyên lý cốt lõi:** *"Every frame is a deterministic function of song time `t`"* — Mọi khung hình tại thời điểm `t` đều được tính toán xác định bằng toán học và mã nguồn, đảm bảo bản xem trước trên trình duyệt và bản xuất 1080p60/4K offline giống nhau 100%.

---

## 🏛️ TRỤ CỘT 1: KIẾN TRÚC RENDERER XÁC ĐỊNH (DETERMINISTIC TIMELINE)

1. **Hàm thuần túy của thời gian `f(t)`:**
   - Không sử dụng `Math.random()`, `Date.now()` hay `performance.now()` trong logic render hình ảnh.
   - Tất cả giá trị ngẫu nhiên phải dùng bộ sinh số giả ngẫu nhiên có hạt giống cố định (Seeded PRNG: `mulberry32(seed)` hoặc hàm băm không gian `hash(vec2)`).
   - Cho phép tua tới lùi (`seek`), nhảy từng khung hình (`frameStep`), tua chậm hoặc lặp đoạn (`loop`) mà hình ảnh không bị sai lệch.

2. **Cấu trúc dữ liệu Nhịp điệu & Âm thanh (Audio & Beat Grid Data):**
   - `BPM` (Beats Per Minute) cố định hoặc biến thiên theo đoạn.
   - `beatAt(t)`: Tính toán chỉ số phách hiện tại.
   - `barAt(t)`: Tính toán ô nhịp (bar/measure).
   - `beatPhase`: Chu kỳ dao động (0..1) theo từng nhịp để tạo xung nhịp thị giác (Visual Pulse / Kick Impact).

---

## 🎤 TRỤ CỘT 2: WORD-SYNCED KARAOKE TYPOGRAPHY (PHỤ ĐỀ KARAOKE ĐỒNG BỘ TỪNG TỪ)

1. **Cấu trúc Lời bài hát / Hướng dẫn (Lyrics Data Schema):**
   ```json
   {
     "text_vi": "WGS-84 ta chuyển đổi, sang VN-2000 chính xác tức thời!",
     "text_en": "Effortlessly transforming WGS-84 to VN-2000 in real-time!",
     "start": 4.8,
     "end": 8.2,
     "words": [
       { "w": "WGS-84", "start": 4.8, "end": 5.4 },
       { "w": "ta", "start": 5.4, "end": 5.8 },
       { "w": "chuyển", "start": 5.8, "end": 6.3 },
       { "w": "đổi,", "start": 6.3, "end": 6.8 },
       { "w": "sang", "start": 6.8, "end": 7.2 },
       { "w": "VN-2000", "start": 7.2, "end": 7.8 },
       { "w": "chính", "start": 7.8, "end": 8.0 },
       { "w": "xác!", "start": 8.0, "end": 8.2 }
     ]
   }
   ```

2. **Thuật toán quét từ (Word Progress & Character Wipe):**
   - `wordProgress(word, t) = clamp((t - word.start) / (word.end - word.start), 0, 1)`
   - Từ chưa hát đến: Hiển thị mờ (opacity 0.45, màu bạc/xám).
   - Từ đang hát: Phát sáng rực rỡ (glowing cyan/gold, hiệu ứng scale nhẹ 1.08x và viền nổi bật).
   - Từ đã hát xong: Màu trắng sáng ổn định.
   - **Song ngữ Anh - Việt**: Dòng trên là tiếng Việt (hát/rap/hướng dẫn có vần điệu), dòng dưới là tiếng Anh (phụ đề kỹ thuật dịch nghĩa chuẩn xác).

---

## 🎨 TRỤ CỘT 3: THIẾT KẾ ĐỒ HỌA PHÂN CẢNH (SCENE MODULE SYSTEM)

Mỗi phân cảnh trong video là một Scene kế thừa từ lớp cơ sở:
```ts
class BaseScene {
  init(canvas, ctx) { /* Khởi tạo buffer, font, asset */ }
  render(t, frameContext) {
    // 1. Vẽ nền (Background Shader / Dynamic Grid)
    // 2. Vẽ đối tượng kỹ thuật (HUD, Radar, Map Point, CAD Polygon)
    // 3. Vẽ chữ và hiệu ứng Karaoke Kinetic Typography
    // 4. Áp dụng hậu kỳ (Glow, Bloom, Film Grain, Scanlines)
  }
}
```

### Các hiệu ứng đồ thị kỹ thuật trắc địa (Surveying Visual Motifs):
- **HUD Grid & Coordinate Crosshairs**: Lưới tọa độ trắc địa xoay theo chiều kim đồng hồ, tâm ngắm quang học phóng to thu nhỏ.
- **Satellite Waveform & GPS Rays**: Tia sóng vệ tinh radar quét góc tròn 360 độ bắt tọa độ điểm mốc.
- **Polygon Vertex Assembly**: Các đỉnh mốc P1, P2, P3... nối thành thửa đất và diện tích tô màu gradient trong suốt.
- **Waveform Audio Reactive Bar**: Các cột sóng âm dao động theo âm lượng và nhịp điệu bài hát.

---

## 🎹 TRỤ CỘT 4: BỘ MÁY ÂM THANH & GIỌNG HÁT TIẾNG VIỆT (SYNTH & VOICE)

1. **Web Audio Synthesizer (Zero-Asset Beatmaker):**
   - Sử dụng Web Audio API tạo tiếng trống Kick (80Hz -> 30Hz pitch drop), Snare (white noise burst) và Hi-hat (high-pass filter noise).
   - Tự động đánh nhịp theo BPM của bài hát, tạo sự hưng phấn và cuốn hút người xem.
2. **Thuyết minh & Giai điệu tiếng Việt (Voice Synthesis / Audio Playback):**
   - Hỗ trợ `SpeechSynthesisUtterance` với `lang: 'vi-VN'`, điều chỉnh `rate` và `pitch` phù hợp với nhịp bài hát.
   - Hoặc tải kèm tệp âm thanh thu sẵn (Audio Stem).

---

## 🎬 TRỤ CỘT 5: QUY TRÌNH XUẤT VIDEO (OFFLINE EXPORT PIPELINE)

1. **Xuất trực tiếp trên trình duyệt (Client-Side MediaRecorder):**
   - Ghi lại Canvas 60fps kèm âm thanh Web Audio vào tệp định dạng WebM / MP4 H.264.
2. **Xuất gói CapCut / Premiere / After Effects:**
   - Xuất tệp phụ đề song ngữ `.srt`.
   - Xuất tệp Typography JSON và SVG trong suốt chuẩn tỉ lệ 16:9 (1920×1080) và 9:16 (1080×1920).
   - Xuất kịch bản phân cảnh Storyboard JSON.

---

## 💡 CÁC BÀI TOÁN ÁP DỤNG MẪU (USE CASES)

1. **Video Hướng Dẫn Sử Dụng Ứng Dụng (Software Tutorial Walkthroughs)**: Minh họa từng thao tác bấm nút, nhập số liệu, chuyển đổi bản đồ kèm lời dẫn vui tươi, dễ nhớ.
2. **Video Giới Thiệu Tính Năng Mới (Feature Launch Trailers)**: Hiệu ứng Kinetic Typography bùng nổ, nhịp điệu EDM/Hip-hop sôi động.
3. **Video Trắc Địa & Giáo Dục Trực Quan (Surveying & Math Visualizers)**: Trực quan hóa công thức toán học Gauss-Kruger, phép chiếu VN-2000, giao hội trắc địa.
