# Xuất khối lượng vỏ

1. Triển khai backend có API `GET /data-export/shell-weight-checks`.
2. Thêm nội dung `shell_weight_checks.gs` vào dự án Apps Script đang dùng chung `configs.gs`. Cấu hình API key phải khớp `DATA_EXPORT_API_KEY` của backend.
3. Kiểm tra spreadsheet cấu hình có tab `KHỐI LƯỢNG VỎ`, sau đó chạy `xuatKhoiLuongVo()` (hoặc gắn hàm này vào trigger).

Hàm giữ tiêu đề dòng 1 và thay dữ liệu A:O từ dòng 2, giống các hàm xuất hiện có. Dòng mô tả “Ngày nhập” trong ảnh cũng được thay bằng dữ liệu.

Thứ tự cột: Thời điểm, Mã BTP-số lô, Tên BTP, Số lô BTP, Vỏ 1 đến Vỏ 10, Người nhập. Thời điểm dùng `created_at` và múi giờ trong cấu hình. Số lô giữ dạng text; khối lượng là số theo đơn vị đã lưu, không chuyển đổi đơn vị.

API dùng header `x-data-export-api-key`, hỗ trợ `page` (mặc định 1), `limit` (mặc định 500, tối đa 10000) và `updated_from` (ISO 8601, lọc `updated_at`). Dữ liệu trả về tại `data`, cùng `pagination.has_next_page`. Apps Script tải hết các trang trước khi thay dữ liệu trên sheet.
