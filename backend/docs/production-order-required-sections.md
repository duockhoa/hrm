# Dữ liệu bắt buộc trong hồ sơ lô

## Cấu hình theo mã hàng

`ItemFeatures.required` mặc định `false` cho cả cấu hình cũ và mới. Chỉ section đang bật và có quy tắc kiểm tra mới được đặt bắt buộc. Tắt section tự động bỏ yêu cầu bắt buộc; bật lại không tự khôi phục yêu cầu. Action và View không có lựa chọn bắt buộc.

Cột **Bắt buộc có dữ liệu** nằm trước cột **Thứ tự**. Sao chép cấu hình mã hàng bao gồm trạng thái, yêu cầu bắt buộc và thứ tự. Quyền quản lý tiếp tục dùng `features.manage`.

## Chốt cấu hình của lô

Khi chưa có bản chụp, lô dùng cấu hình mã hàng hiện tại. Sau khi dịch vụ PYCLM trả về thành công, nếu lô chưa có bản chụp, hệ thống lưu `feature_config_snapshot` phiên bản 1, nguồn `pyclm`, vào `ProductionOrderDocumentControls`. Bản chụp được lưu trong cùng transaction với số đăng ký của lô và lịch sử gửi PYCLM. Bản chụp bao gồm key, loại, tên, nhóm, thứ tự, trạng thái và yêu cầu bắt buộc của các tính năng đang áp dụng. Gửi PYCLM thất bại không tạo bản chụp.

Gửi lại PYCLM không ghi đè bản chụp đã có. Cấp hồ sơ lô giấy, nhận hồ sơ, nhận phiếu kho và nhận phiếu kiểm nghiệm không chốt cấu hình. Đồng bộ SAP không sửa bản chụp. Trang chi tiết và báo cáo sử dụng cùng cấu hình đã lưu.

Migration `20261014010000_add_required_production_order_sections` trước đây lưu cấu hình cho các hồ sơ đã cấp, với mọi yêu cầu bắt buộc bằng `false`. Các bản chụp cũ (`legacy` hoặc `issued`) được giữ nguyên khi đổi thời điểm chốt sang gửi PYCLM. Lô đã gửi PYCLM nhưng chưa có bản chụp sẽ tiếp tục dùng cấu hình mã hàng cho đến lần gửi PYCLM thành công tiếp theo; không tự tạo bản chụp từ lịch sử gửi cũ.

## Quy tắc phiên bản 1

- Section thông thường: có ít nhất một bản ghi đã lưu thuộc đúng lô, thông qua quan hệ dữ liệu riêng của section. Không gộp kiểm tra cảm quan sản phẩm với kiểm tra cảm quan chung, hoặc lô hiện tại với lô được tham chiếu.
- Hiệu chuẩn ống đong và kiểm tra khối lượng 10 vỏ: có bản ghi đơn của lô.
- Phiếu pha chế: có ít nhất một phiếu có thông số được nhập kết quả hoặc ảnh kết quả. Phiếu mới tạo từ template, ghi chú đơn thuần và chuỗi kết quả rỗng không được tính. Giá trị `0` và `false` được tính là dữ liệu.
- Hồ sơ đính kèm: có ít nhất một bản ghi có tệp đính kèm.
- Dòng lệnh sản xuất: có ít nhất một dòng từ SAP. SAP không truy cập được được báo riêng, không coi là dữ liệu thiếu.

Đây là kiểm tra sự hiện diện. Không suy ra dữ liệu đạt chất lượng, đủ số lần kiểm tra, đủ mọi dòng vật liệu hay đã được ký duyệt. Section mới chưa có quy tắc không được bật bắt buộc. Các alias kiểm tra soi lọ cũ được chuẩn hóa về `vial_inspection_checks`; key hiệu chuẩn cũ `cylinder_calibratio` được chuẩn hóa về `cylinder_calibration`.

## API và giao diện

`GET /production-orders/:id/completeness`, yêu cầu quyền `production-orders.read`.

Kết quả gồm `configuration_source` (`item` hoặc `snapshot`), `rule_version`, `required_count`, `completed_count`, `is_complete`, `required_sections`, `missing_sections` và `unavailable_sections`. Mỗi section có key, tên, thứ tự, quy tắc, số bản ghi và trạng thái `has_data`, `missing` hoặc `unavailable`.

Checklist xuất hiện trên cả ba trang chi tiết lô, trước section kiểm tra tiệt trùng. Liên kết tên mục đưa người dùng đến section tương ứng. Kết quả tự động được kiểm tra lại sau thao tác lưu/xóa/cấu hình, khi quay lại trang và định kỳ 30 giây. Giao diện không thêm bước xác nhận hoàn tất và không chặn nhập liệu hay xuất biểu mẫu.

## Nâng cấp

Áp dụng migration `20261014010000_add_required_production_order_sections`, generate Prisma Client và khởi động lại backend. Không dùng `migrate reset` với dữ liệu hiện hữu.

Kiểm thử bao gồm mặc định không bắt buộc, cấu hình không hợp lệ, sao chép yêu cầu, chốt bản chụp sau khi gửi PYCLM thành công, không chốt khi gửi lỗi hoặc cấp hồ sơ giấy, giữ bản chụp khi cấu hình mã hàng thay đổi hoặc gửi lại PYCLM, template pha chế rỗng, kết quả `0`/`false`, ảnh, tệp bị xóa, singleton và SAP không truy cập được.
