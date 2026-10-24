# Phiếu cân theo lệnh sản xuất

Phạm vi hiện tại: chỉ bảng `production_order_weighing_records`, chưa có bảng nguyên liệu hoặc chi tiết lần cân.

Quan hệ: một `production_orders` có nhiều phiếu cân qua `production_order_id`. Không thể xóa lệnh đang có phiếu cân (`ON DELETE RESTRICT`).

## Nút trên giao diện

Danh mục nút có action **Phiếu cân**, key `view_weighing_record`, nhóm **Biểu mẫu Pha chế**. Bật action này trong cấu hình nút của mã hàng để hiển thị nút trên chi tiết lô bán thành phẩm, lô thành phẩm và tổng hợp lô. Cấu hình độc lập với `view_mixing_record`; các lô đã chốt snapshot cấu hình tiếp tục dùng snapshot hiện có.

Bấm **Phiếu cân** để mở danh sách inline, có nút quay lại và **Thêm phiếu cân**. Form nhận mã phiếu (tùy chọn, bỏ trống để tự sinh) và mô tả; sau khi lưu cập nhật danh sách của đúng lệnh đang xem. Bấm một phiếu để xem thông tin chung và thông tin duyệt. Phần giao diện này hiện hỗ trợ danh sách, xem và tạo phiếu.

## API

Tất cả endpoint yêu cầu `Authorization: Bearer <accessToken>`. Quyền dùng chung nhóm `production-orders`, giống phiếu pha chế. Phạm vi truy cập lệnh sản xuất và audit log kế thừa Prisma extension hiện tại.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/production-orders/:id/weighing-records` | `production-orders.read` |
| POST | `/production-orders/:id/weighing-records` | `production-orders.create` |
| GET | `/production-orders/weighing-records/:recordId` | `production-orders.read` |
| PATCH | `/production-orders/weighing-records/:recordId` | `production-orders.update` |
| DELETE | `/production-orders/weighing-records/:recordId` | `production-orders.delete` |
| PATCH | `/production-orders/weighing-records/:recordId/qa-staff-approval` | `production-orders.update` |
| PATCH | `/production-orders/weighing-records/:recordId/ipc-staff-approval` | `production-orders.update` |

POST body:

```json
{
  "record_code": "PC-2026-001",
  "description": "Phiếu cân nguyên liệu"
}
```

Cả hai trường đều tùy chọn; có thể gửi `{}`. Nếu bỏ `record_code`, hệ thống sinh `PC-<UUID>`. Mã phiếu là duy nhất, tối đa 50 ký tự. Người tạo lấy từ tài khoản đăng nhập; trạng thái ban đầu là `draft`.

PATCH body (gửi ít nhất một trường):

```json
{
  "description": "Đã hoàn tất cân",
  "status": "completed"
}
```

Cho phép sửa `record_code`, `description`, `status`. Trạng thái được nhập: `draft`, `in_progress`, `completed`, `cancelled`. Gửi `description: null` để xóa nội dung. Các trường khác bị từ chối, bao gồm ID người tạo và thông tin duyệt.

Duyệt QA/IPC không cần body. Chỉ phiếu `completed` được duyệt. Mỗi chữ ký chỉ được ghi một lần; người duyệt và thời gian do server ghi. Phiếu khóa sửa/xóa ngay khi có một chữ ký. Khi đủ cả QA và IPC, trạng thái tự chuyển thành `approved`. API duyệt dùng quyền update giống phiếu pha chế hiện tại, chưa kiểm tra chức danh QA/IPC riêng.

Danh sách trả về mảng theo ngày tạo và ID giảm dần. Các API khác trả về object phiếu với `createdBy`, `qaStaffApprovedBy`, `ipcStaffApprovedBy` (chỉ `id`, `username`, `name`).

Lỗi: `400` dữ liệu/trạng thái không hợp lệ; `401` chưa đăng nhập; `403` thiếu quyền; `404` lệnh/phiếu không tồn tại hoặc ngoài phạm vi truy cập; `409` mã trùng, phiếu đã ký, hoặc có thay đổi đồng thời (tải lại rồi thử lại).

## Migration

`prisma/migrations/20261024000000_add_production_order_weighing_records/migration.sql` chỉ tạo bảng phiếu cân, index và khóa ngoại tới các bảng hiện có.
