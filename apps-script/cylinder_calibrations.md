# Xuất hiệu chỉnh ống đong

1. Triển khai backend có API `GET /data-export/cylinder-calibrations`.
2. Thêm nội dung `cylinder_calibrations.gs` vào dự án Apps Script đang dùng chung `configs.gs`. API key phải khớp `DATA_EXPORT_API_KEY` của backend.
3. Kiểm tra spreadsheet cấu hình có tab `HIỆU CHỈNH ỐNG ĐONG`, sau đó chạy `xuatHieuChinhOngDong()` hoặc gắn hàm vào trigger.

Hàm giữ tiêu đề dòng 1 và thay dữ liệu A:G từ dòng 2 theo thứ tự: Thời điểm, Mã BTP-số lô, Tên BTP, Số lô BTP, Thông số hiệu chỉnh, Mã ống đong, Người nhập.

Thời điểm dùng `created_at` và múi giờ cấu hình. Số lô và mã ống đong giữ dạng text. Thông số hiệu chỉnh là số theo dữ liệu đã lưu, gồm cả giá trị âm và 0, hiển thị tối đa 4 chữ số thập phân. Mã ống đong chưa nhập được để trống.

API dùng header `x-data-export-api-key`, hỗ trợ `page` (mặc định 1), `limit` (mặc định 500, tối đa 10000) và `updated_from` (ISO 8601, lọc `updated_at`). Apps Script tải hết các trang trước khi thay dữ liệu trên sheet.
