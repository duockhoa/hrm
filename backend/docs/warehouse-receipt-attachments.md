# Ảnh chứng từ hàng nhập kho

Bảng `warehouse_receipt_item_attachments` liên kết một-nhiều với
`warehouse_receipt_items`. Một hàng nhập kho có thể có nhiều ảnh thuộc các nhóm:

| attachment_type | Chứng từ |
| --- | --- |
| `dispatch_note` | Phiếu xuất kho |
| `coa` | COA / phiếu kiểm nghiệm |
| `invoice` | Hoá đơn |

Mỗi bản ghi gồm `id`, `warehouse_receipt_item_id`, `attachment_type`, `file_path`,
`original_name`, `mime_type`, `file_size` (byte), `uploaded_by_id`, `created_at`.
Response có `uploadedBy: { id, username, name }`; người tải lấy từ JWT.
File lưu trong `uploads/warehouse-receipt-items`, tên UUID do server sinh;
`file_path` là URL tương đối của endpoint xem ảnh có xác thực.

Tất cả API yêu cầu `Authorization: Bearer <access_token>`, không gắn permission riêng.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| POST | `/warehouse-receipt-items/:id/attachments` | Tải nhiều ảnh lên |
| GET | `/warehouse-receipt-items/:id/attachments` | Danh sách ảnh của hàng nhập kho |
| GET | `/warehouse-receipt-items/:id/attachments/:attachmentId` | Thông tin một ảnh |
| GET | `/warehouse-receipt-items/attachment-files/:filename` | Xem ảnh gốc qua `file_path` |
| DELETE | `/warehouse-receipt-items/:id/attachments/:attachmentId` | Xoá ảnh và file |

POST sử dụng `multipart/form-data`:

- `attachment_type`: một trong ba giá trị trên, bắt buộc.
- `files`: từ 1 đến 10 file/lần, tối đa 5 MB/file.
- Chấp nhận JPG/JPEG, PNG, WEBP, GIF. Kiểm tra nội dung ảnh thực tế và MIME type.
- Không gửi trường khác; không gửi đường dẫn file hoặc ID người tải.
- POST trả HTTP 201 với mảng bản ghi ảnh đã tạo; các API còn lại trả 200.

Ví dụ:

```sh
curl -X POST "http://localhost:3000/warehouse-receipt-items/1/attachments" \
  -H "Authorization: Bearer <access_token>" \
  -F "attachment_type=coa" \
  -F "files=@coa-page-1.jpg" \
  -F "files=@coa-page-2.png"
```

GET danh sách có query `attachment_type=coa` (hoặc `dispatch_note`, `invoice`)
để lọc nhóm. GET `file_path?thumbnail=true` trả ảnh thu nhỏ WEBP; mặc định trả
ảnh gốc. Cả hai đều cần JWT và không cung cấp URL static công khai.

GET danh sách/chi tiết hàng nhập kho cũng trả `attachments`, gồm thông tin người tải.
Xoá hàng nhập kho sẽ xoá các bản ghi ảnh qua khoá ngoại CASCADE và dọn file gốc,
thumbnail. File đã lưu cũng được dọn khi transaction tải ảnh lên thất bại.

Không có endpoint ghi đè ảnh. Để thay ảnh, tải ảnh mới rồi xoá ảnh cũ.
API chỉ nhận ảnh; không nhận PDF ở phiên bản này.

Dữ liệu upload không hợp lệ trả 400; không xác thực trả 401;
hàng/ảnh không tồn tại trả 404; file quá lớn trả 413.
