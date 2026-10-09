---
name: spec-kit
description: Bộ Nhớ Spec-Kit (GitHub Spec-Kit & DeusData Codebase-Memory-MCP). Hợp nhất phương pháp Phát triển Định hướng Đặc tả (Spec-Driven Development - SDD) của GitHub và Đồ thị Ngữ cảnh Bộ nhớ Mã nguồn Siêu tốc (AST Tree-sitter Knowledge Graph MCP của DeusData). Hướng dẫn toàn diện bằng tiếng Việt, thiết lập quy trình Chuẩn hóa Yêu cầu (Constitution -> Spec -> Plan -> Tasks -> Implement) kết hợp bộ nhớ cấu trúc không tiêu tốn token.
when_to_use: "Khi cần lập đặc tả kỹ thuật, tái cấu trúc codebase lớn, xây dựng lại ứng dụng bài bản, quản lý bộ nhớ tri thức dự án, hoặc đồng bộ hóa quy trình phát triển có kiểm chứng cho các AI Agent."
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
version: 1.0.0
---

# 🧠 BỘ NHỚ SPEC-KIT (SPEC-DRIVEN MEMORY SUITE)

> **Hợp nhất tinh hoa của 2 công nghệ hàng đầu thế giới:**  
> 1. **[GitHub Spec-Kit](https://github.com/github/spec-kit):** Phát triển Định hướng Đặc tả (Spec-Driven Development - SDD) — Chấm dứt "vibe coding" cảm tính, biến yêu cầu thành các thực thể đặc tả sống, có thể kiểm chứng độc lập.  
> 2. **[DeusData Codebase-Memory-MCP](https://github.com/DeusData/codebase-memory-mcp):** Đồ thị tri thức ngữ cảnh mã nguồn MCP (AST Tree-sitter) — Phân tích cấu trúc trong <1ms, định vị quan hệ hàm/class/API, cắt giảm 99% token tra cứu lặp lại.

---

## 🧭 I. TỔNG QUAN & NGUYÊN TẮC CỐT LÕI (CORE MANIFESTO)

### 1. Triết Lý "Không Cảm Tính" (Anti-Vibe Coding)
- Mọi dòng mã được viết ra đều phải xuất phát từ một **Đặc tả Kỹ thuật (Specification)** đã được thẩm định rõ ràng.
- Thay vì nhảy vào gõ code ngay khi nhận yêu cầu mơ hồ, AI Agent bắt buộc phải thực thi qua phễu đặc tả 5 tầng:
  $$\text{Constitution (Hiến pháp)} \longrightarrow \text{Specify (Đặc tả)} \longrightarrow \text{Plan (Kiến trúc)} \longrightarrow \text{Tasks (Phân rã)} \longrightarrow \text{Implement (Thực thi)}$$

### 2. Đồ Thị Tri Thức Ngữ Cảnh Bền Vững (Zero-Token Codebase Memory)
- Không đọc duyệt file một cách mù quáng (blind full-scan) gây phình to ngữ cảnh và lãng phí token.
- Sử dụng đồ thị tri thức AST (Abstract Syntax Tree) để lập bản đồ liên kết:
  - Xác định chính xác các điểm gọi hàm (Call hierarchy).
  - Phân tích bán kính ảnh hưởng (Blast radius) trước khi sửa đổi bất kỳ tệp tin nào.
  - Bảo toàn 100% tính nguyên vẹn của các API công khai và bộ kiểm thử (regression safety).

---

## 🏛️ II. QUY TRÌNH 5 BƯỚC ĐẶC TẢ (SPEC-DRIVEN PIPELINE)

Thư mục chuẩn được lưu tại `.specs/` trong gốc dự án:

```
.specs/
├── 00_constitution.md       # Hiến pháp dự án: Các quy tắc bất khả xâm phạm, giới hạn kỹ thuật
├── 01_specification.md      # Đặc tả yêu cầu: Nghiệp vụ chi tiết, kịch bản người dùng (User Stories)
├── 02_architectural_plan.md # Kế hoạch kiến trúc: Phân tách module, cấu trúc dữ liệu, sơ đồ tương tác
├── 03_task_breakdown.md     # Danh mục tác vụ: Các bước chia nhỏ nguyên tử kèm điều kiện nghiệm thu
└── 04_verification_gate.md  # Biên bản kiểm định: Kết quả kiểm thử tự động, checklist bàn giao
```

### Bước 1: Thiết Lập Hiến Pháp Dự Án (`00_constitution.md`)
- Định nghĩa các nguyên tắc cốt lõi:
  - Ví dụ: "Ứng dụng chạy offline 100% trên thiết bị di động, không phụ thuộc máy chủ trung gian."
  - "Bảo toàn số học trắc địa: Sai số mặt bằng < 1mm, không làm tròn số float bừa bãi."
  - "Không dùng thư viện bên ngoài vượt quá dung lượng quy định."

### Bước 2: Soạn Thảo Đặc Tả Nghiệp Vụ (`01_specification.md`)
- Mô tả rõ ràng "CÁI GÌ" (WHAT) và "TẠI SAO" (WHY), không vội đi vào "LÀM NHƯ THẾ NÀO" (HOW).
- Liệt kê các tiêu chí nghiệm thu (Acceptance Criteria - Gherkin Given/When/Then).

### Bước 3: Hoạch Định Kiến Trúc & Sơ Đồ Khối (`02_architectural_plan.md`)
- Phân chia trách nhiệm (Separation of Concerns):
  - **Domain Engine:** Thuật toán số học, không dính DOM.
  - **Data Layer:** IndexedDB / SQLite / LocalStorage.
  - **Presentation / UI Shell:** Giao diện người dùng, xử lý sự kiện.

### Bước 4: Phân Rã Tác Vụ Nguyên Tử (`03_task_breakdown.md`)
- Chia nhỏ công việc thành các đơn vị tác vụ độc lập, đánh số thứ tự T01, T02, T03...
- Mỗi tác vụ có thời gian ước tính và tiêu chí hoàn thành đo lường được.

### Bước 5: Thực Thi Kèm Cửa Kiểm Duyệt (`04_verification_gate.md`)
- Chỉ code khi Task đã được phê duyệt.
- Chạy kiểm thử tự động sau mỗi task; nếu có lỗi hồi quy -> rollback ngay lập tức.

---

## 🔌 III. TÍCH HỢP MCP CODEBASE MEMORY (DEUSDATA)

### 1. Cấu Hình MCP Server (`mcp.json` / `mcp_config.json`)
```json
{
  "mcpServers": {
    "codebase-memory": {
      "command": "codebase-memory-mcp",
      "args": ["--workspace", "./"],
      "env": {
        "MEMORY_STORAGE_PATH": "./.memory/codebase_graph.db"
      }
    }
  }
}
```

### 2. Các Lệnh Truy Vấn Bộ Nhớ Tri Thức Trọng Yếu
- `query_callers(function_name)`: Tìm tất cả những nơi đang gọi hàm này để đánh giá bán kính ảnh hưởng.
- `get_type_definition(symbol)`: Trích xuất định nghĩa kiểu hoặc cấu trúc dữ liệu mà không cần mở file.
- `trace_dependency_graph(file_path)`: Vẽ cây phụ thuộc giữa các mô-đun.

---

## 🔄 IV. HƯỚNG DẪN CẤU TRÚC LẠI HỆ THỐNG SKILL TRONG THƯ MỤC DRIVE

Để đồng bộ toàn bộ kho kỹ năng trong `H:\My Drive\Ho so ca nhan\b. ThS KHMT\Skill` theo chuẩn **Bộ Nhớ Spec-Kit**:

1. **Mỗi Skill thư mục mẹ phải có cấu trúc chuẩn hóa:**
   - `SKILL.md`: Metadata YAML frontmatter, bản đồ mục tiêu, quy trình tác nghiệp.
   - `SPECIFICATION.md`: Bản đặc tả tiêu chuẩn đầu vào/đầu ra của kỹ năng.
   - `HUONG_DAN_SU_DUNG.md`: Hướng dẫn cho người dùng và các AI Agent.
2. **Cập nhật danh mục phân hệ chuẩn (Functional Domain Taxonomy):**
   - Bổ sung phân hệ **08 — BỘ NHỚ SPEC-KIT** vào `README.md` và `AGENTS.md`.
   - Kết nối hai chiều với các phân hệ Nghiên cứu khoa học (00-06), Thiết kế giao diện (07/ux-loveable) và Kỹ nghệ Phần mềm.
