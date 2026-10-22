# Chốt bộ tiêu chuẩn theo lô khi gửi PYCLM

Sau khi nhà cung cấp PYCLM trả thành công và có URL phiếu, hệ thống lưu bộ tiêu
chuẩn vào `production_order_document_controls.production_specification_snapshot`.
Snapshot và bản ghi gửi được lưu cùng transaction, sử dụng cùng `sent_at`.

Snapshot phiên bản 1 gồm mã hàng, thời điểm chốt, ID người gửi và toàn bộ dữ liệu
`ProductionSpecifications`, kèm `productLine` và `dosageForm` (bao gồm yêu cầu cảm
quan). Số Decimal được lưu thành chuỗi để giữ nguyên độ chính xác; toán tử so sánh,
giới hạn kiểm soát/cho phép và đơn vị đo đều được giữ lại.

- Chỉ lần gửi thành công đầu tiên khi chưa có snapshot mới chốt tiêu chuẩn.
  Gửi lại không ghi đè; các lần gửi đồng thời được tuần tự hóa bằng khóa bản ghi
  document control, dùng chung với snapshot cấu hình biểu mẫu.
- Gửi thất bại hoặc phản hồi thiếu URL không tạo snapshot. Lỗi lưu snapshot làm
  rollback transaction cục bộ. Lệnh gọi nhà cung cấp là tác vụ bên ngoài transaction,
  nên rollback database không thu hồi được phiếu/email đã gửi bên ngoài.
- Không có tiêu chuẩn hoặc tiêu chuẩn đã xóa mềm: lưu `specification: null` trong
  snapshot. Thêm tiêu chuẩn sản phẩm sau đó không tự áp dụng cho lô đã chốt.
- Lô cũ chưa có snapshot tiếp tục đọc tiêu chuẩn hiện tại. Không backfill tiêu chuẩn
  hiện tại thành tiêu chuẩn lịch sử. Nếu gửi lại PYCLM, lô chưa có snapshot sẽ chốt
  tiêu chuẩn tại lần gửi thành công đó.
- Snapshot không hợp lệ trả lỗi, không tự thay bằng tiêu chuẩn hiện tại.

API chi tiết/danh sách lệnh và dữ liệu xuất hồ sơ dùng tiêu chuẩn đã chốt ở
`productionSpecification` và `item.productionSpecification`. Các thuộc tính
`productionSpecificationSource` (`snapshot` hoặc `item`) và
`productionSpecificationCapturedAt` cho biết nguồn và thời điểm áp dụng.

`GET /production-orders/:id/production-specification` trả ba thuộc tính trên, yêu
cầu quyền `production-orders.read` và áp dụng giới hạn đọc lệnh hiện hành. Các form
kiểm tra lấy dữ liệu theo ID lệnh, không lấy tiêu chuẩn từ mã hàng chung. MCP trả
snapshot trong `documentControl.production_specification_snapshot` khi đọc hồ sơ.

Triển khai migration `20261022000000_snapshot_production_specification_on_pyclm`
và chạy `prisma generate` trước khi khởi động phiên bản backend mới.
