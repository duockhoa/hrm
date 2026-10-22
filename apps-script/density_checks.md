# Xuất tỉ trọng

1. Triển khai backend có API `GET /data-export/density-checks`.
2. Thêm nội dung `density_checks.gs` vào dự án Apps Script đang dùng chung `configs.gs`. API key phải khớp `DATA_EXPORT_API_KEY` của backend.
3. Kiểm tra spreadsheet cấu hình có tab `TỈ TRỌNG`, sau đó chạy `xuatTiTrong()` hoặc gắn hàm vào trigger.

Hàm giữ tiêu đề dòng 1 và thay dữ liệu A:J từ dòng 2. Dòng mô tả “Ngày nhập” trong ảnh sẽ được thay bằng dữ liệu.

Thứ tự cột: Thời điểm, Mã BTP-số lô, Tên BTP, Số lô BTP, Bình rỗng (g), Bình chứa dịch (g), Bình chứa nước (g), Tỉ trọng, Tỉ trọng biểu kiến, Người nhập.

Thời điểm dùng `created_at` và múi giờ cấu hình. Số lô giữ dạng text. Khối lượng dùng tối đa 4 chữ số thập phân, tỉ trọng dùng tối đa 6 chữ số thập phân theo dữ liệu đã lưu. Tỉ trọng biểu kiến chưa nhập được để trống.

API dùng header `x-data-export-api-key`, hỗ trợ `page` (mặc định 1), `limit` (mặc định 500, tối đa 10000) và `updated_from` (ISO 8601, lọc `updated_at`). Apps Script tải hết các trang trước khi thay dữ liệu trên sheet.
