# API hàng nhập kho

Bảng `warehouse_receipt_items`: mỗi bản ghi là một mặt hàng theo lô trong một lần nhập kho. Cho phép cùng mã hàng và số lô xuất hiện trong nhiều lần nhập. Bảng lưu thông tin hàng/lô, số lượng và đơn vị tính của từng lần nhập.

Tất cả endpoint yêu cầu `Authorization: Bearer <access_token>`, không yêu cầu quyền riêng. Người dùng đã đăng nhập có thể xem danh sách, xem chi tiết, thêm, sửa và xoá hàng nhập kho. Migration `20261001010000_remove_warehouse_receipt_item_permissions` xoá các quyền `warehouse-receipt-items.*` và các liên kết vai trò tương ứng đã được tạo trước đây.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/warehouse-receipt-items` | Chỉ cần đăng nhập |
| GET | `/warehouse-receipt-items/:id` | Chỉ cần đăng nhập |
| POST | `/warehouse-receipt-items` | Chỉ cần đăng nhập |
| PATCH | `/warehouse-receipt-items/:id` | Chỉ cần đăng nhập |
| DELETE | `/warehouse-receipt-items/:id` | Chỉ cần đăng nhập |

## Thêm mới

```json
{
  "item_code": "NL001",
  "quantity": "125.5",
  "unit": "kg",
  "manufacturer_lot_number": "NSX-2026-001",
  "lot_number": "LOT-2026-001",
  "expiry_date": "2027-12-31",
  "packaging_specification": "Thùng 20 kg",
  "supplier_code": "NC.NĐ.0168",
  "manufacturer_name": "Nhà sản xuất B",
  "note": "Kiểm tra bao bì khi nhận hàng",
  "received_at": "2026-10-01T08:00:00+07:00"
}
```

- Bắt buộc `item_code`, `lot_number`: chuỗi không rỗng. Mã hàng phải tồn tại và chưa bị xoá.
- `quantity` tuỳ chọn, nhận số hoặc chuỗi số thập phân dương, tối đa 3 chữ số thập phân và `999999999.999`; nhận `null` để xoá. Lưu bằng `DECIMAL(12,3)`, response trả dạng chuỗi để giữ độ chính xác.
- `unit` tuỳ chọn, là đơn vị tính lưu riêng cho bản ghi, tối đa 191 ký tự. Khi tạo mới hoặc đổi sang mã hàng khác mà không gửi `unit`, API mặc định lấy đơn vị từ mã hàng. Sửa các trường khác hoặc gửi lại cùng mã hàng sẽ giữ nguyên đơn vị đã lưu. Nhận `null` hoặc chuỗi rỗng để xoá, hoặc gửi đơn vị khác để ghi đè mặc định. Form hiển thị đơn vị bằng chữ mờ sau ô số lượng, lấy từ mã hàng khi chọn/đổi mã hoặc khi bản ghi chưa có đơn vị. Migration lấy đơn vị từ danh mục cho dữ liệu cũ và để số lượng là `null`.
- `entered_by_id` tự lấy từ tài khoản đăng nhập và giữ nguyên khi sửa; không gửi trong body.
- `expiry_date` nhận ngày hợp lệ dạng `YYYY-MM-DD` hoặc `null`.
- `received_at` nhận ISO datetime có múi giờ; mặc định là thời điểm tạo nếu bỏ qua. API trả thời gian theo UTC; frontend hiển thị theo múi giờ người dùng.
- `supplier_code` là `CardCode` của đối tác loại `cSupplier` trong bảng `business_partners`, tối đa 191 ký tự. Nhận `null` hoặc chuỗi rỗng để bỏ nhà cung cấp. Không gửi `supplier_name` trong POST/PATCH.
- Các trường chuỗi tuỳ chọn nhận `null` hoặc chuỗi rỗng để xoá giá trị. Giới hạn: mã hàng 191 ký tự, số lô 100 ký tự, quy cách/nhà sản xuất 255 ký tự, ghi chú 65535 byte UTF-8.
- `created_at`, `updated_at` do hệ thống quản lý. Trường ngoài danh sách cho phép trả lỗi 400.

## Sửa và xoá

PATCH chỉ gửi các trường cần đổi, ví dụ `{"note": "Đã kiểm tra", "expiry_date": null}`. Body rỗng hoặc giá trị không hợp lệ trả 400. ID không tồn tại trả 404.

DELETE xoá bản ghi khỏi bảng, trả bản ghi vừa xoá. Lịch sử thao tác được ghi qua audit log hiện tại.

POST trả 201; các API khác trả 200. Bản ghi trả về gồm dữ liệu đã lưu, `item` (mã hàng, tên hàng, đơn vị tính), `supplier` (card_code, card_name, tax_code hoặc null) và `enteredBy` (id, username, tên người nhập). GET danh sách trả mảng, sắp xếp thời điểm nhập giảm dần.

Migration `20261006020000_link_receipt_suppliers` thêm khóa ngoại nullable `supplier_code` và ghép tên nhà cung cấp cũ chỉ khi tên khớp đúng một đối tác loại `cSupplier`. `supplier_name` giữ lại để hiển thị dữ liệu lịch sử chưa ghép được. Khi chọn hoặc xóa nhà cung cấp qua `supplier_code`, tên nhập tay cũ được xóa; sửa trường khác vẫn giữ nguyên nhà cung cấp. Khóa ngoại chặn xóa đối tác đang được phiếu tham chiếu.

Swagger có các endpoint và schema body trong nhóm `warehouse-receipt-items` tại `/api-docs`.

Ảnh phiếu xuất kho, COA và hoá đơn được quản lý bằng API riêng;
xem [API ảnh chứng từ](warehouse-receipt-attachments.md). Response hàng nhập kho
trả thêm mảng `attachments`. Khi xoá hàng nhập kho, các ảnh đính kèm cũng được xoá.
