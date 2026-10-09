---
name: omo
description: Kỹ nghệ Đồ thị Đa Tác tử & Điều phối Đa Mô hình (OmO - Oh My OpenAgent & Graph Engineering). Kích hoạt bằng từ khóa "mass ulw". Chuyên phân rã bài toán lập trình và kiến trúc phức tạp thành Đồ thị Hướng Không Chu trình (DAG), điều phối thực thi song song nhiều mô hình AI (Multi-model ultracode), Wave Scheduler, Write-Ahead Log (WAL) chống mất mát dữ liệu và khóa kiểm thử bắt buộc bằng chứng thực tế (Evidence-Based QA).
when_to_use: "Khi người dùng gõ từ khóa 'mass ulw', khi cần xử lý các tác vụ phát triển phần mềm siêu phức tạp đòi hỏi điều phối đa agent song song, xây dựng luồng đồ thị DAG hoặc kiểm thử nghiêm ngặt có ghi nhận bằng chứng."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 5.0.0
---

# ⚡ OH MY OPENAGENT (OmO) — BẬC THẦY KỸ NGHỆ ĐỒ THỊ (GRAPH ENGINEERING)

> Lấy cảm hứng từ kiến trúc của **[code-yeongyu/oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent)**.  
> **Khẩu hiệu kích hoạt:** Gõ `"mass ulw"` cùng với câu lệnh yêu cầu của bạn để biến AI thành một tổng công trình sư điều phối đội ngũ tác tử đa mô hình.

---

## 🧭 I. TỔNG QUAN VỀ KIẾN TRÚC GRAPH ENGINEERING

Thay vì xử lý các tác vụ phức tạp theo một chuỗi tuần tự tuyến tính đơn lẻ dễ gây quá tải token và suy thoái ngữ cảnh, **OmO** chuyển hóa nhiệm vụ thành một **Đồ Thị Hướng Không Chu Trình (DAG - Directed Acyclic Graph)**:

```
                  ┌──────────────┐
                  │ ROOT TASK    │
                  └──────┬───────┘
                         │ Phân rã DAG
            ┌────────────┴────────────┐
            ▼                         ▼
   ┌─────────────────┐       ┌─────────────────┐
   │ NODE A (Core)   │       │ NODE B (UI/UX)  │
   │ [Wave 1 - Model1│       │ [Wave 1 - Model2│
   └────────┬────────┘       └────────┬────────┘
            │ Phụ thuộc               │ Phụ thuộc
            └────────────┬────────────┘
                         ▼
               ┌───────────────────┐
               │ NODE C (Integrate)│
               │ [Wave 2 - Lead]   │
               └─────────┬─────────┘
                         ▼
               ┌───────────────────┐
               │ QA EVIDENCE GATE  │
               └───────────────────┘
```

---

## ⚡ II. CÁC THÀNH PHẦN CỐT LÕI CỦA "MASS ULW"

### 1. Bộ Lập Lịch Theo Sóng (Wave Scheduler)
- Các node không có quan hệ phụ thuộc nhau sẽ được tự động xếp vào cùng một **Wave** và thực thi song song.
- Các node phụ thuộc sẽ chờ tín hiệu hoàn thành có thẩm định từ Wave trước mới bắt đầu.

### 2. Định Tuyến Đa Mô Hình (Multi-Model Routing)
- Không ép một mô hình duy nhất gánh toàn bộ bài toán.
- Tự động gán mô hình tối ưu nhất cho từng loại node:
  - **Node Kiến trúc & Lập kế hoạch:** Mô hình lý luận sâu (Claude Opus / o1 / o3 / Gemini Pro).
  - **Node Viết mã Frontend / UI:** Mô hình có gu thẩm mỹ cao (Claude Sonnet / Lovable Engine).
  - **Node Kiểm thử & Tối ưu số học:** Mô hình chuyên tính toán chuẩn xác và phân tích tĩnh.

### 3. Nhật Ký Ghi Trước & Khôi Phục (Write-Ahead Log - WAL)
- Mọi quyết định, trạng thái của từng node trong DAG đều được lưu vết vào bộ nhớ bền vững (`.omo/state.wal` hoặc log).
- Nếu phiên làm việc bị ngắt quãng, hệ thống khôi phục ngay tại node dang dở mà không phải tốn token chạy lại từ đầu.

---

## 🛑 III. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM: EVIDENCE-BASED QA (BẰNG CHỨNG KIỂM THỬ)

> **"It typechecks" is NOT QA. "`test is green`" is NOT QA if not verified in real harness.**

Mọi thay đổi mã nguồn qua luồng `mass ulw` bắt buộc phải vượt qua cánh cổng thẩm định:
1. **Lái thử thực tế:** Chạy lệnh kiểm thử thực tế trên hệ thống (`node --test`, `npm test`, hoặc kiểm tra file output).
2. **Ghi nhận bằng chứng vào đĩa:** Bắt buộc xuất log hoặc biên bản kiểm định (Evidence log) chứa kết quả chạy thực tế trước khi coi nhiệm vụ là hoàn thành.
3. **Cấm tuyệt đối suy đoán:** Không bao giờ kết luận "chắc chắn hoạt động" khi chưa có output kiểm thử thực tế từ terminal.

---

## 📋 IV. QUY TRÌNH THỰC THI KHI GẶP TỪ KHÓA "MASS ULW"

Khi người dùng nhập prompt chứa `"mass ulw"`:
1. **Phân rã Đồ thị (DAG Decomposition):**
   - Tuyên bố rõ ràng danh sách các Node trong DAG: Node ID, Mô tả nhiệm vụ, Điều kiện tiên quyết (Dependencies), và Wave thực thi.
2. **Thực thi Theo Wave:**
   - Hoàn thành Wave 1 $\rightarrow$ Báo cáo kết quả trung gian $\rightarrow$ Chuyển sang Wave 2.
3. **Chốt Bằng Chứng QA:**
   - Thực thi toàn bộ test suite, kiểm tra hồi quy và xác nhận bàn giao sạch sẽ.
