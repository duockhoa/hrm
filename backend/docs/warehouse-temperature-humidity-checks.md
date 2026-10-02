# Kiểm tra nhiệt độ, độ ẩm kho

Bảng: `warehouse_temperature_humidity_checks`. Mỗi dòng là một lần kiểm tra.

API yêu cầu JWT đăng nhập, chưa áp dụng `PermissionsGuard` hay permission riêng.
Người kiểm tra lấy từ tài khoản đăng nhập khi tạo; sửa bản ghi giữ nguyên người kiểm tra.
`created_at` và `updated_at` do hệ thống quản lý. Thời điểm kiểm tra được xem là thời điểm tạo bản ghi.

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| GET | `/warehouse-temperature-humidity-checks` | Danh sách mới nhất trước |
| GET | `/warehouse-temperature-humidity-checks/:id` | Chi tiết |
| POST | `/warehouse-temperature-humidity-checks` | Thêm |
| PATCH | `/warehouse-temperature-humidity-checks/:id` | Sửa các trường được gửi |
| DELETE | `/warehouse-temperature-humidity-checks/:id` | Xoá bản ghi |

Ví dụ POST:

```json
{
  "location": "Kho nguyên liệu - A1",
  "requirement": "Nhiệt độ 15–30 °C; độ ẩm không quá 75 %RH",
  "temperature": 25.5,
  "humidity": 65.25,
  "is_passed": true
}
```

POST yêu cầu đủ 5 trường trên; PATCH nhận ít nhất 1 trường. Nhiệt độ và độ ẩm phải là số JSON,
tối đa 2 chữ số thập phân. Nhiệt độ: -999.99 đến 999.99 °C; độ ẩm: 0 đến 100 %RH.
Vị trí tối đa 255 ký tự; yêu cầu tối đa 65.535 byte UTF-8, không được để trống.
Không nhận `checked_by_id`, `created_at`, `updated_at` hoặc trường ngoài danh sách.

`is_passed` phải là boolean JSON: `true` = Đạt, `false` = Không đạt. Kết quả do người kiểm tra
đánh giá theo yêu cầu; API không tự suy luận từ trường `requirement` dạng văn bản.
Bản ghi cũ chưa được đánh giá có `is_passed: null`; POST/PATCH không nhận `null`.
PATCH bỏ qua `is_passed` sẽ giữ nguyên kết quả hiện có. Ví dụ cập nhật kết quả: `{ "is_passed": false }`.

Response kèm `is_passed` và `checkedBy: { id, username, name }`. Prisma trả các giá trị Decimal dưới dạng chuỗi JSON.
Lỗi dữ liệu: 400; chưa đăng nhập: 401; không tìm thấy: 404; xung đột quan hệ: 409.

Áp dụng migration khi triển khai: `npx prisma migrate deploy`, sau đó `npx prisma generate` và build backend.
