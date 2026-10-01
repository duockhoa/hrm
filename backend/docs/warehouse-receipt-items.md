# API hàng nhập kho

Bảng `warehouse_receipt_items`: mỗi bản ghi là một mặt hàng theo lô trong một lần nhập kho. Cho phép cùng mã hàng và số lô xuất hiện trong nhiều lần nhập. Bảng lưu thông tin hàng/lô, chưa tính tồn kho vì chưa có số lượng nhập.

Tất cả endpoint yêu cầu `Authorization: Bearer <access_token>` và quyền tương ứng. Migration tạo các quyền nhưng không tự gán cho vai trò; quản trị viên gán qua chức năng quản lý quyền/vai trò hiện tại.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/warehouse-receipt-items` | `warehouse-receipt-items.list` |
| GET | `/warehouse-receipt-items/:id` | `warehouse-receipt-items.read` |
| POST | `/warehouse-receipt-items` | `warehouse-receipt-items.create` |
| PATCH | `/warehouse-receipt-items/:id` | `warehouse-receipt-items.update` |
| DELETE | `/warehouse-receipt-items/:id` | `warehouse-receipt-items.delete` |

## Thêm mới

```json
{
  "item_code": "NL001",
  "manufacturer_lot_number": "NSX-2026-001",
  "lot_number": "LOT-2026-001",
  "expiry_date": "2027-12-31",
  "packaging_specification": "Thùng 20 kg",
  "supplier_name": "Công ty cung cấp A",
  "manufacturer_name": "Nhà sản xuất B",
  "note": "Kiểm tra bao bì khi nhận hàng",
  "received_at": "2026-10-01T08:00:00+07:00"
}
```

- Bắt buộc `item_code`, `lot_number`: chuỗi không rỗng. Mã hàng phải tồn tại và chưa bị xoá.
- `entered_by_id` tự lấy từ tài khoản đăng nhập và giữ nguyên khi sửa; không gửi trong body.
- `expiry_date` nhận ngày hợp lệ dạng `YYYY-MM-DD` hoặc `null`.
- `received_at` nhận ISO datetime có múi giờ; mặc định là thời điểm tạo nếu bỏ qua. API trả thời gian theo UTC; frontend hiển thị theo múi giờ người dùng.
- Các trường chuỗi tuỳ chọn nhận `null` hoặc chuỗi rỗng để xoá giá trị. Giới hạn: mã hàng 191 ký tự, số lô 100 ký tự, quy cách/nhà cung cấp/nhà sản xuất 255 ký tự, ghi chú 65535 byte UTF-8.
- `created_at`, `updated_at` do hệ thống quản lý. Trường ngoài danh sách cho phép trả lỗi 400.

## Sửa và xoá

PATCH chỉ gửi các trường cần đổi, ví dụ `{"note": "Đã kiểm tra", "expiry_date": null}`. Body rỗng hoặc giá trị không hợp lệ trả 400. ID không tồn tại trả 404.

DELETE xoá bản ghi khỏi bảng, trả bản ghi vừa xoá. Lịch sử thao tác được ghi qua audit log hiện tại.

POST trả 201; các API khác trả 200. Bản ghi trả về gồm dữ liệu đã lưu, `item` (mã hàng, tên hàng, đơn vị tính) và `enteredBy` (id, username, tên người nhập). GET danh sách trả mảng, sắp xếp thời điểm nhập giảm dần.

Swagger có các endpoint và schema body trong nhóm `warehouse-receipt-items` tại `/api-docs`.
