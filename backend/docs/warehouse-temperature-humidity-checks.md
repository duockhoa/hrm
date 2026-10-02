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

## Khôi phục lỗi migration P3018 / MySQL 1824

Migration `20261002000000_add_warehouse_temperature_humidity_checks` trước đây tham chiếu
`Users` thay vì tên bảng thực tế `users` (`@@map("users")` trong schema). MySQL trên Linux
có thể phân biệt chữ hoa/thường nên bước thêm khóa ngoại thất bại. Migration đã được sửa
để dùng `users` cho các database chưa áp dụng.

Với server đã lỗi ở câu lệnh thứ 2, bước tạo bảng đã chạy thành công theo log; cần kiểm tra
trạng thái thực tế trước khi khôi phục. Chạy các truy vấn sau trong MySQL, database `dkpharma`:

```sql
SHOW CREATE TABLE `users`;
SHOW CREATE TABLE `warehouse_temperature_humidity_checks`;
SELECT `migration_name`, `finished_at`, `rolled_back_at`, `logs`
FROM `_prisma_migrations`
WHERE `migration_name` = '20261002000000_add_warehouse_temperature_humidity_checks';
```

Nếu bảng kiểm tra đã tồn tại với các cột/index của migration, migration đang lỗi chưa được
resolve và khóa ngoại `warehouse_temperature_humidity_checks_checked_by_id_fkey` chưa có,
chạy script khôi phục bên dưới. Script chỉ thêm khóa ngoại còn thiếu, giữ nguyên dữ liệu.
Nếu khóa ngoại đúng đã có, bỏ qua lệnh `db execute`; nếu trạng thái khác, cần đối chiếu lại
schema trước khi đánh dấu migration thành công.

Sau khi đưa bản sửa này lên server, chạy trong thư mục backend:

```bash
cd /home/admin/hrm/backend
npx prisma db execute --schema prisma/schema.prisma --file prisma/recovery/20261002000000_warehouse_temperature_humidity_checks_fk.sql &&
npx prisma migrate resolve --applied 20261002000000_add_warehouse_temperature_humidity_checks &&
npx prisma migrate deploy &&
npx prisma migrate status &&
npx prisma generate &&
npm run build &&
pm2 restart hrm-backend
```

Chỉ dùng `resolve --applied` sau khi toàn bộ bước của migration đầu đã hoàn tất.
`migrate deploy` sẽ tiếp tục áp dụng migration thêm cột `is_passed` và các migration đang chờ.
Dùng `&&` để dừng chuỗi triển khai nếu có bước lỗi. PM2 báo `online` chỉ xác nhận process
đang chạy, không xác nhận schema database đã cập nhật đầy đủ.

Không chạy lại toàn bộ migration đầu trực tiếp trên bảng đã tạo vì sẽ lỗi trùng bảng.
Không cần xóa bảng hay reset database để sửa lỗi này.
