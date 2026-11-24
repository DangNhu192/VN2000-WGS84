# Trợ lý AI "kết hợp" của VN2000 Pro

Thứ tự xử lý một câu nói:

1. **Quy tắc trên máy** (`assistant-core.js`): luôn chạy, không cần mạng và không cần mô hình. Bắt được khoảng 97% bộ câu mẫu.
2. **AI máy chủ** khi có mạng và người dùng bật trong ⚙. Cách làm giống Xiaozhi: máy chủ hiểu câu và trả về **một lời gọi công cụ**, sau đó app tự thực hiện.
3. **AI cục bộ** (wllama + tệp `.gguf`) khi ngoại tuyến. Đầu ra bị khóa bằng ngữ pháp JSON theo danh mục công cụ.

Ở cả ba tầng, AI không tự tính số và không tự xuất tệp. Mọi lời gọi đều qua `validateCall` trước khi chạy: công cụ lạ, tham số sai và tọa độ ngoài Việt Nam đều bị loại.

## AI máy chủ dùng chung, miễn phí (`api/ai.js`)

Máy chủ bật sẵn cho mọi người dùng app. **Chỉ phục vụ chức năng của app**:

- App chỉ gửi câu người dùng, tối đa 300 ký tự. Lời nhắc hệ thống, danh mục công cụ và ví dụ do máy chủ tự dựng, nên không ai gửi được lời nhắc hay công cụ khác qua đây.
- Mô hình **bắt buộc** trả về một lời gọi công cụ (`tool_choice: "required"`). Chữ tự do bị bỏ. Lời gọi phải qua `validateCall` mới được trả về.
- Câu nào quy tắc đã hiểu chắc thì trả lời ngay, không tốn lượt AI.
- Giới hạn mỗi IP 10 lần/phút và 150 lần/ngày; tổng toàn app 1500 lần/ngày. Đổi bằng `AI_RPM_PER_IP`, `AI_RPD_PER_IP`, `AI_RPD_TOTAL`.

Nhà cung cấp miễn phí, không cần thẻ. Máy chủ thử lần lượt; cái nào hết hạn mức thì tự chuyển sang cái sau:

| Biến trên Vercel | Lấy khóa ở | Mô hình mặc định (đổi bằng biến) |
|---|---|---|
| `GROQ_API_KEY` | console.groq.com/keys | `GROQ_MODELS=llama-3.3-70b-versatile,openai/gpt-oss-120b` |
| `GEMINI_API_KEY` | aistudio.google.com/apikey | `GEMINI_MODELS=gemini-3.8-flash,gemini-3.5-flash` |
| `AI_API_KEY` + `AI_BASE_URL` + `AI_MODEL` | nhà cung cấp OpenAI-compatible bất kỳ | — |

Lưu ý:
- Hạn mức miễn phí và tên mô hình thay đổi thường xuyên. Nếu một mô hình bị gỡ, máy chủ tự thử mô hình kế tiếp; khi đó đặt lại `*_MODELS` cho đúng.
- Gói miễn phí của Gemini có thể dùng nội dung gửi lên để huấn luyện. Máy chủ chỉ gửi câu lệnh, không gửi dữ liệu dự án.
- `GET /api/ai` trả về `{ready, providers}` (không lộ khóa) để app biết máy chủ đã sẵn sàng chưa.

Người dùng muốn dùng máy riêng (Ollama, LM Studio…) thì điền **Địa chỉ riêng** trong ⚙ của Trợ lý.

## Bộ câu mẫu và "huấn luyện"

- `tools/ai/build_dataset.py` sinh ra:
  - `assistant-dataset.js`: chạy trong app, dùng chọn ví dụ gần nhất (few-shot) cho AI;
  - `docs/ai/sft_vi.jsonl`: dùng để fine-tune.
- Thêm câu mẫu vào script rồi chạy lại: `python3 tools/ai/build_dataset.py`.
- `tests/assistant_hybrid.test.js` chấm bộ định tuyến trên toàn bộ câu mẫu. Yêu cầu: **không câu nào bị hiểu sai** và độ phủ ≥ 95%.

### Fine-tune mô hình nhỏ (tùy chọn, cần máy có GPU)

1. Chọn mô hình gốc nhỏ có hỗ trợ tiếng Việt, ví dụ Qwen2.5-0.5B/1.5B-Instruct.
2. Fine-tune LoRA với `sft_vi.jsonl`, dạng hội thoại `messages` (ví dụ dùng Unsloth hoặc TRL `SFTTrainer`). Vài epoch là đủ, vì đầu ra chỉ là JSON ngắn.
3. Gộp LoRA vào mô hình, chuyển sang GGUF (`convert_hf_to_gguf.py` của llama.cpp) rồi lượng tử hóa Q4_K_M.
4. Trong app: Trợ lý → ⚙ → **Chọn tệp .gguf trên máy**.

Sau khi fine-tune, mô hình vẫn bị khóa bằng ngữ pháp JSON và vẫn phải qua `validateCall` như trên.
