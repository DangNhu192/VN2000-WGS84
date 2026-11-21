# Trợ lý AI cục bộ cho VN2000 Pro — phương án và hiện trạng

## 1. Học được gì từ Ivy AI (github.com/iamankushpandit/esp_ai)

Ivy là trợ lý giọng nói chạy trọn trên vi điều khiển ESP32-S3 (8 MB PSRAM): đánh thức → nghe (STT) → nghĩ (LLM 19,7M tham số, 4-bit) → nói (TTS), không mạng, không máy chủ. Mã viết bằng C cho ESP-IDF, giấy phép **GPL-3.0** → **không chép mã** vào app (app dùng MIT). Chỉ học **kiến trúc và nguyên tắc**, viết lại từ đầu:

| Nguyên tắc của Ivy | Áp dụng cho VN2000 Pro |
|---|---|
| Câu chắc chắn trả lời được thì code thường trả lời, gắn nhãn "no AI" (giờ, ngày, hẹn giờ) | Mọi phép **chuyển đổi tọa độ, khoảng cách, phương vị, KTT, điều hướng, kiểm thử** do thuật toán của app làm, nhãn "✓ Máy tự tính — không dùng AI". AI **không bao giờ** tính số. |
| Ngoài hiểu biết thì từ chối lịch sự, không "ảo giác" | Không hiểu → nói thẳng "chưa hiểu, không đoán bừa" + gợi ý lệnh. Mô hình AI bị **khóa bằng ngữ pháp GBNF** chỉ sinh được đúng một lệnh trong danh sách hoặc "khong ro". |
| Phased Arena: Nghe → Nghĩ → Nói lần lượt, pha xong trả sạch bộ nhớ | Tắt micro trước khi đọc, dừng đọc khi nghe; mô hình AI chỉ nạp khi bật, **tự gỡ khỏi bộ nhớ sau 3 phút** không dùng. |
| Console `serial_cmd.py` đi đúng đường giao diện dùng, kiểm thử không mô phỏng | Lệnh **"kiểm thử"**: tự kiểm tra thuật toán (điểm chuẩn + thuận-nghịch), KTT, thư viện bản đồ, ngoại tuyến (service worker + bộ nhớ đệm), bộ nhớ lưu, dữ liệu dự án, quyền GPS, thiết bị, giọng nói, AI. |
| Đổi "não" bằng cách chép tệp GGUF vào thẻ SD | Chọn tệp **.gguf** trên máy hoặc tải mô hình gợi ý; chạy bằng **wllama** (llama.cpp WebAssembly, MIT). |
| Công khai giới hạn | Bảng ở mục 4. |

## 2. Kiến trúc trong app

```
 🎤 Web Speech (vi-VN) ──┐
 ⌨️  gõ lệnh ────────────┼─► splitChain ("rồi", ";") ─► route() — assistant-core.js, KHÔNG AI
                         │        │ hiểu được                        │ không hiểu
                         │        ▼                                  ▼
                         │   tools[intent]() gọi hàm thật của app   (nếu đã bật) wllama + GBNF
                         │   convertWgsToVn2k, appNav, appModal…    → đúng 1 lệnh chuẩn → route() lại
                         │        │
                         └─► bảng trả lời (nhãn nguồn) ─► 🔊 speechSynthesis vi-VN (tùy chọn)
```

- `assistant-core.js` — lõi thuần, chạy được trên Node: chuẩn hóa tiếng Việt (bỏ dấu), đọc số kiểu Việt Nam (dấu phẩy thập phân, nhóm nghìn, độ-phút-giây), nhận diện ~20 ý định, nối lệnh, danh sách lệnh chuẩn cho AI.
- `assistant.js` — bảng trò chuyện, công cụ, tự kiểm thử, giọng nói, nạp/gỡ mô hình.
- `ui-assistant.css` — tấm kính đáy (điện thoại dọc), cột phải (máy ngang), khung nổi (máy tính bảng/máy tính); không che hết bản đồ.
- `vendor/wllama/` — llama.cpp WebAssembly (~10 MB), chỉ tải khi bật AI, sau đó được service worker lưu để chạy ngoại tuyến.
- Tuân thủ tách biệt giao diện (AGENTS.md): "chuyển … rồi xem trên bản đồ" mở **bản đồ Chuyển đổi**, không mở Bản đồ dự án.
- Lệnh đổi KTT/múi **không tự lưu**: mở sẵn Cài đặt KTT với tỉnh đã chọn, người dùng bấm Lưu (đổi KTT làm đổi mọi kết quả).

## 3. Lệnh hiện có

Chuyển đổi (dán số là được) · khoảng cách/phương vị · mở mọi chức năng trong menu ☰ · KTT hiện tại / KTT của tỉnh / đổi tỉnh / đổi múi · bật-tắt GPS, vị trí của tôi (kèm VN-2000 và sai số) · dự án hiện tại, số mốc · giao diện sáng/tối · giờ, ngày · kiểm thử · giúp · dừng. Nối lệnh: `chuyển 10.7769 106.7009 rồi xem trên bản đồ`.

## 4. Giới hạn (nói thẳng)

- Nhận giọng nói dùng Web Speech của trình duyệt: Chrome Android/desktop thường cần mạng; Safari iOS có thể chạy trên máy. Ngoại tuyến hoàn toàn thì gõ lệnh.
- Đọc thành tiếng cần giọng tiếng Việt cài sẵn trên máy.
- Mô hình gợi ý Qwen2.5-0.5B (~400 MB) tải một lần; chạy một luồng (app không bật COOP/COEP vì sẽ chặn ảnh bản đồ bên thứ ba) nên máy yếu mất 10–30 giây cho câu khó. Câu thường không đi qua AI nên vẫn tức thì.
- Đã kiểm thử đường ống nạp → suy luận có ngữ pháp → gỡ bằng một mô hình GGUF tí hon tự tạo (trọng số ngẫu nhiên); chưa đo độ chính xác hiểu câu của Qwen trên điện thoại thật.

## 5. Bước tiếp theo đề xuất

1. Đo trên 2–3 điện thoại thật: thời gian nạp, thời gian mỗi câu qua AI, RAM.
2. Bộ câu thử tiếng Việt (như "What it gets wrong" của Ivy): 100 cách nói tự do → tỉ lệ ra đúng lệnh; công bố trong app.
3. Nhận giọng nói ngoại tuyến hoàn toàn: Whisper tiny/base qua WebAssembly (whisper.cpp/wllama) — khoảng 40–150 MB.
4. Từ đánh thức ("Này VN2000") chỉ khi người dùng bật, vì luôn mở micro tốn pin ngoài thực địa.
5. Kịch bản điều phối dài: "nhập file → chuyển hàng loạt → xuất DWG" thành một lệnh, có bước xác nhận trước khi ghi tệp.
