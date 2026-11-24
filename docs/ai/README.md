# Trợ lý AI "kết hợp" của VN2000 Pro

Thứ tự xử lý một câu nói:

1. **Quy tắc trên máy** (`assistant-core.js`): luôn chạy, không cần mạng và không cần mô hình. Bắt được khoảng 97% bộ câu mẫu.
2. **AI máy chủ** khi có mạng và người dùng bật trong ⚙. Cách làm giống Xiaozhi: máy chủ hiểu câu và trả về **một lời gọi công cụ**, sau đó app tự thực hiện.
3. **AI cục bộ** (wllama + tệp `.gguf`) khi ngoại tuyến. Đầu ra bị khóa bằng ngữ pháp JSON theo danh mục công cụ.

Ở cả ba tầng, AI không tự tính số và không tự xuất tệp. Mọi lời gọi đều qua `validateCall` trước khi chạy: công cụ lạ, tham số sai và tọa độ ngoài Việt Nam đều bị loại.

## Bật AI máy chủ cho cả app (khóa giữ trên Vercel)

Vercel → Project → Settings → Environment Variables:

| Biến | Ví dụ |
|---|---|
| `AI_API_KEY` | khóa của nhà cung cấp |
| `AI_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (Qwen) · `https://api.deepseek.com/v1` · `https://openrouter.ai/api/v1` |
| `AI_MODEL` | `qwen-plus` · `deepseek-chat` · … (mô hình phải hỗ trợ *tool calling*) |
| `AI_ALLOWED_ORIGINS` | (tùy chọn) `https://vn2000-wgs84-three.vercel.app` |

Sau khi lưu biến, deploy lại. Trong app, mở Trợ lý → ⚙ → tích **Dùng AI máy chủ khi có mạng** → **Thử kết nối**.

Muốn dùng máy chủ riêng (Ollama, LM Studio, vLLM hay máy chủ tự dựng trong mạng nội bộ), điền **Địa chỉ** dạng OpenAI-compatible, ví dụ `http://192.168.1.10:11434/v1`. Máy chủ đó phải cho phép CORS từ app.

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
