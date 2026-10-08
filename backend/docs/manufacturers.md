# API nhà sản xuất

API yêu cầu đăng nhập bằng JWT, không phân quyền theo vai trò hoặc permission.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/manufacturers` | Danh sách kèm người thêm |
| GET | `/manufacturers/:id` | Chi tiết kèm người thêm |
| POST | `/manufacturers` | Thêm nhà sản xuất, tự sinh mã |
| PATCH | `/manufacturers/:id` | Sửa tên |
| DELETE | `/manufacturers/:id` | Xoá nhà sản xuất |

Body thêm hoặc sửa chỉ cần tên (bắt buộc, tối đa 255 ký tự):

```json
{ "manufacturer_name": "Nhà sản xuất A" }
```

Mã tự sinh `NSX0001`, `NSX0002`, ...; sau `NSX9999` là `NSX10000`.
Bộ đếm được lưu trong database và tăng trong cùng transaction với việc tạo nhà
sản xuất để tránh trùng mã khi tạo đồng thời. Xoá nhà sản xuất không đặt lại bộ đếm.
Migration khởi tạo bộ đếm từ mã NSX có phần số lớn nhất đang tồn tại; mã cũ giữ nguyên.

`created_by_id` lấy từ tài khoản đăng nhập, không lấy từ body. Response gồm
`createdBy: { id, username, name }`. Mã và người thêm không sửa qua API cập nhật.
Các bản ghi có trước migration có `created_by_id` và `createdBy` bằng `null`
vì không có thông tin xác định người thêm.

Dữ liệu không hợp lệ trả HTTP 400; ID không tồn tại trả HTTP 404.

Áp dụng migration trong thư mục `backend`:

```sh
npx prisma migrate deploy
npx prisma generate
```
