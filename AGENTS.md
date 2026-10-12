# AGENTS.md — Quy tắc Harness cho VN2000-PWA

## 1. Khởi động phiên làm việc (Startup Routine)
1. Đọc `feature_list.json` để biết feature đang kích hoạt (`active_feature`).
2. Đọc `progress.md` để nắm rõ các chỉnh sửa gần nhất, tránh trùng lặp hoặc quên ngữ cảnh.
3. Chạy `powershell -File init.ps1` hoặc `node --test tests/*.test.js` để kiểm tra sức khỏe dự án trước khi sửa mã nguồn.

## 2. Nguyên tắc Bất di bất dịch về Kiến trúc Giao diện (UI Isolation Principle)
- **Tách biệt 100% từng phân hệ**: Mỗi chức năng (Chuyển đổi tọa độ, Bản đồ dự án, MiniCAD, Đo trắc dọc...) phải sở hữu không gian giao diện riêng.
- **Không gọi chéo giao diện của chức năng khác**:
  - Khi thao tác trong **Chuyển đổi tọa độ** (như chấm tọa độ trên bản đồ để lấy số liệu, hoặc xem vị trí điểm chuyển đổi trên bản đồ), **TUYỆT ĐỐI KHÔNG gọi giao diện "Bản đồ dự án & Mốc"** (`openProjectMap`) hay hiển thị thanh công cụ của Dự án (`#mapProjectBar`).
  - Giao diện chấm điểm chuyển đổi phải là màn hình chuyên biệt của Chuyển đổi tọa độ.
  - Phân hệ Bản đồ dự án chỉ phục vụ xem mốc dự án, không được chèn các công cụ của chuyển đổi hay CAD.
  - Phân hệ MiniCAD chỉ hoạt động khi người dùng mở MiniCAD.

## 3. Tiêu chuẩn Hoàn thành (Definition of Done - DoD)
- Code sạch, không over-engineering.
- 100% test trong `tests/*.test.js` phải PASS trước khi kết thúc task.
- Ghi nhật ký tóm tắt các thay đổi vào `progress.md` và `session-handoff.md`.
