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

## Khôi phục lỗi migration P3009 / P3018 / MySQL 1824

Migration `20261002000000_add_warehouse_temperature_humidity_checks` trước đây tham chiếu
`Users` thay vì tên bảng thực tế `users` (`@@map("users")` trong schema). MySQL trên Linux
có thể phân biệt chữ hoa/thường nên bước thêm khóa ngoại thất bại. Migration đã được sửa
để dùng `users` cho các database chưa áp dụng.

Sau lần thất bại, Prisma lưu trạng thái lỗi trong `_prisma_migrations`. Vì vậy, `git pull`
lấy SQL đã sửa rồi chạy lại `npx prisma migrate deploy` vẫn có thể báo **P3009**: Prisma
chặn migration mới cho đến khi migration lỗi được khôi phục và resolve. `prisma generate`,
build thành công hoặc PM2 báo `online` không xóa trạng thái này và không cập nhật database.
Log P3009 chỉ cho biết migration còn lỗi; lỗi gốc nằm trong cột `logs` của bản ghi migration.

### Khôi phục bằng lệnh có kiểm tra trạng thái

Trong thư mục backend, chạy:

```bash
npm run db:recover:warehouse-checks
```

Lệnh sử dụng `DATABASE_URL` từ môi trường hoặc `.env` của backend và kiểm tra migration
`20261002000000_add_warehouse_temperature_humidity_checks`. Nếu migration đang lỗi, lệnh
kiểm tra bảng đã tồn tại, các cột/index, quan hệ đến `users.id` và các giá trị `checked_by_id`
không có người dùng tương ứng trước khi sửa. Lệnh chỉ bổ sung khóa ngoại còn thiếu, kiểm tra
lại rồi chạy `prisma migrate resolve --applied` cho migration này; giữ nguyên dữ liệu.

Nếu khóa ngoại đúng đã có từ lần sửa trước, lệnh bỏ qua bước thêm khóa ngoại và tiếp tục
resolve. Nếu không còn bản ghi migration đang lỗi, lệnh kết thúc mà không sửa database.
Có thể chạy lại lệnh sau khi một lần khôi phục bị gián đoạn.

Nếu migration đang lỗi nhưng bảng chưa tồn tại, cấu trúc bảng/khóa ngoại khác dự kiến hoặc
có `checked_by_id` không khớp `users.id`, lệnh dừng và báo nguyên nhân. Cần đối chiếu lỗi gốc
và trạng thái database trước khi xử lý trường hợp đó. Lệnh không tự tạo lại bảng, xóa dữ liệu,
triển khai migration tiếp theo, build hoặc restart backend.

Trước khi dùng `git pull` trên server, cần commit và push các thay đổi của bản sửa này lên
`origin/main`, gồm script khôi phục và lệnh mới trong `backend/package.json`. Sau đó chạy
chuỗi sau trên server:

```bash
cd /home/admin/hrm &&
git pull origin main &&
cd backend &&
npm run db:recover:warehouse-checks &&
npx prisma migrate deploy &&
npx prisma migrate status &&
npx prisma generate &&
npm run build &&
pm2 restart hrm-backend &&
pm2 status
```

`migrate deploy` sẽ tiếp tục áp dụng migration thêm cột `is_passed` và các migration đang chờ.
Dùng `&&` để dừng chuỗi triển khai nếu có bước lỗi; chỉ restart backend sau khi khôi phục,
triển khai migration và build đều thành công.

### Kiểm tra và khôi phục thủ công

Nếu cần đối chiếu trực tiếp, chạy các truy vấn sau trong MySQL, database `dkpharma`:

```sql
SHOW CREATE TABLE `users`;
SHOW CREATE TABLE `warehouse_temperature_humidity_checks`;
SELECT `migration_name`, `finished_at`, `rolled_back_at`, `logs`
FROM `_prisma_migrations`
WHERE `migration_name` = '20261002000000_add_warehouse_temperature_humidity_checks';
SELECT COUNT(*) AS `orphan_count`
FROM `warehouse_temperature_humidity_checks` AS c
LEFT JOIN `users` AS u ON u.`id` = c.`checked_by_id`
WHERE u.`id` IS NULL;
```

Nếu bảng kiểm tra đã tồn tại với các cột/index của migration, migration đang lỗi chưa được
resolve (`finished_at` và `rolled_back_at` đều `NULL`), không có người dùng tham chiếu bị thiếu
(`orphan_count = 0`) và khóa ngoại `warehouse_temperature_humidity_checks_checked_by_id_fkey`
chưa có, chạy script SQL khôi phục bên dưới. Script chỉ thêm khóa ngoại còn thiếu, giữ nguyên dữ liệu.
Nếu khóa ngoại đúng đã có, bỏ qua lệnh `db execute`; nếu trạng thái khác, cần đối chiếu lại
schema trước khi đánh dấu migration thành công.

Sau khi kiểm tra các điều kiện trên, chạy trong thư mục backend:

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

Chỉ dùng `resolve --applied` sau khi toàn bộ bước của migration đầu đã hoàn tất, gồm khóa
ngoại đến `users.id` với `ON DELETE RESTRICT ON UPDATE CASCADE`. Cột `is_passed` thuộc
migration tiếp theo nên chưa cần có để resolve migration đầu.

Không chạy lại toàn bộ migration đầu trực tiếp trên bảng đã tạo vì sẽ lỗi trùng bảng.
Không chỉ đánh dấu `--rolled-back` rồi chạy lại migration khi bảng vẫn tồn tại: lệnh này
chỉ đổi lịch sử migration, không hoàn tác bước tạo bảng đã chạy.
Không cần xóa bảng hay reset database để sửa lỗi này.
