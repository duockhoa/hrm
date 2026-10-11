# Yêu cầu lấy mẫu hàng nhập kho

Bảng `warehouse_receipt_item_sampling_requests`, model Prisma
`WarehouseReceiptItemSamplingRequests`, có cấu trúc tương tự
`production_order_sampling_requests`. Mỗi bản ghi tham chiếu một hàng nhập kho
bằng `warehouse_receipt_item_id`; một hàng nhập kho có thể có nhiều yêu cầu.

| Trường | Kiểu MySQL | Ý nghĩa |
| --- | --- | --- |
| `id` | `INT`, tự tăng, khóa chính | ID yêu cầu |
| `warehouse_receipt_item_id` | `INT NOT NULL` | Khóa ngoại đến `warehouse_receipt_items.id` |
| `sender_id` | `INT NULL` | Khóa ngoại đến `users.id` |
| `location` | `VARCHAR(191) NULL` | Vị trí lấy mẫu |
| `google_doc_url` | `TEXT NULL` | Đường dẫn phiếu |
| `status` | `VARCHAR(191) NOT NULL DEFAULT 'sent'` | Trạng thái, lưu dạng chuỗi như bảng Production Order |
| `sent_at` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` | Thời điểm gửi |
| `created_at` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` | Thời điểm tạo |
| `updated_at` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` | Thời điểm cập nhật; Prisma tự cập nhật khi sửa |

Quan hệ Prisma: `WarehouseReceiptItems.samplingRequests`,
`Users.warehouseReceiptItemSamplingRequests`, `receipt` và `sender` trên yêu cầu.
Có index cho `warehouse_receipt_item_id` và `sender_id`.
Khóa ngoại dùng `ON DELETE CASCADE` với hàng nhập kho và `ON DELETE SET NULL`
với người gửi, tương tự bảng yêu cầu lấy mẫu Production Order.

Migration: `20261011000000_add_warehouse_receipt_item_sampling_requests`.
Áp dụng trong thư mục `backend` bằng `npx prisma migrate deploy`, sau đó
chạy `npx prisma generate`.
