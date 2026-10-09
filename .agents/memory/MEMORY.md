# Project Memory & Workflow Rules

## 1. Local-First Editing Workflow (MANDATORY)
- **Thực hiện chỉnh sửa trực tiếp trên**: D:\Nhu\APP\VN2000-PWA (ổ đĩa SSD cục bộ tốc độ cao, không bị lag/khóa file do Google Drive sync).
- **Máy chủ cục bộ (Local Server)**: Chạy từ D:\Nhu\APP\VN2000-PWA (port 8080).
- **Quy trình hoàn tất**: Khi hoàn thành chỉnh sửa và kiểm thử xong 100%, mới sao chép/đồng bộ sang I:\My Drive\AppSheet\UNGDUNGWEB\VN2000-PWA và Git commit/push.
## 2. Harness Governance & Anti-Amnesia Rules
- **Đọc khởi động**: Mỗi session phải đọc `AGENTS.md`, `feature_list.json`, và `progress.md`.
- **UI Isolation**: Không bao giờ gọi chéo thanh công cụ hoặc giao diện giữa các chức năng (Chuyển đổi tọa độ, Bản đồ dự án, MiniCAD có màn hình/giao diện độc lập).
- **Kiểm thử bắt buộc**: Chạy `powershell -File init.ps1` (`node --test tests/*.test.js`) trước khi bàn giao.
