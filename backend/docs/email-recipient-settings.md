# Cấu hình người nhận email

Ba bảng `email_types`, `email_default_recipients`, `email_user_recipients` lưu
loại email, cấu hình mặc định và cấu hình cá nhân. Mỗi cấu hình chứa một trường
`email TEXT`, ngăn cách các địa chỉ bằng dấu phẩy; không có `display_name`.

Mỗi loại có tối đa một cấu hình mặc định (`UNIQUE(email_type_id)`). Mỗi người dùng
có tối đa một cấu hình cá nhân cho một loại (`UNIQUE(user_id, email_type_id)`).
API kiểm tra địa chỉ, trim khoảng trắng và loại trùng không phân biệt hoa/thường.
Lưu chuỗi rỗng hoặc chỉ có khoảng trắng/dấu phẩy sẽ xóa cấu hình hiện có.

## Cài đặt

Migration: `20261014020000_add_email_recipient_settings`. Migration tạo ba bảng,
thêm loại `sampling_request` (Phiếu yêu cầu lấy mẫu). Không tạo sẵn danh sách người nhận.
Migration `20261014030000_consolidate_email_management_permission` gộp quyền quản trị
thành `email-settings.manage` (Quản lý email), chuyển các vai trò đã có quyền cũ
sang quyền mới rồi xóa hai quyền cũ.

Trong thư mục `backend`:

```sh
npx prisma migrate deploy
npx prisma generate
```

Gán quyền tại HRM → Vai trò:

- `email-settings.manage` (Quản lý email): quản lý loại email và xem/sửa/xóa người nhận mặc định.

Menu HRM **Email mặc định**, đường dẫn `/email-settings`, hiển thị khi có quyền
`email-settings.manage`. Cấu hình cá nhân không yêu cầu quyền này; chỉ chủ tài khoản
có thể xem/sửa/xóa cấu hình của chính mình, kể cả người quản lý email cũng không
thể dùng API cá nhân để sửa cấu hình người khác.

Giao diện dùng mẫu list/detail của danh sách nhân sự: `/email-settings` hiển thị
danh sách loại email, `/email-settings/:id` mở chi tiết. Dùng thanh tìm kiếm chung
của HRM để tìm theo tên, mã hoặc email người nhận. Có thể thêm loại email mới;
trong chi tiết, nút Chỉnh sửa mở form nhập danh sách email ngăn cách bằng dấu phẩy.
Trên máy tính, danh sách và chi tiết hiển thị cạnh nhau; trên điện thoại, chỉ mở
chi tiết và có nút quay lại danh sách.

Trong EBR, menu tài khoản → **Cá nhân hoá email** mở `/personal-email-settings`.
Giao diện dùng bố cục của Cài đặt EBR: chọn loại email ở cột trái, nhập danh sách
người nhận riêng ở cột phải. Có thể tìm loại email, lưu hoặc xóa cá nhân hoá.
Không cần quyền `email-settings.manage`. API cá nhân chỉ nhận `{ email }`, không
nhận ID người dùng; người sở hữu cấu hình được xác định bằng tài khoản đăng nhập.

## API

Tất cả API yêu cầu Bearer token. Cấu hình cá nhân luôn lấy `user_id` từ tài khoản
đăng nhập; không nhận `user_id` trong body hay URL.

| Method | URL                                 | Quyền / chức năng                                                               |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------- |
| GET    | `/email-settings/types`             | Đăng nhập; danh sách loại email                                                 |
| POST   | `/email-settings/types`             | `email-settings.manage`; thêm loại email                                        |
| PATCH  | `/email-settings/types/:id`         | `email-settings.manage`; đổi tên loại email                                     |
| GET    | `/email-settings/defaults`          | `email-settings.manage`; tất cả loại cùng `defaultRecipients`, có thể là `null` |
| PUT    | `/email-settings/types/:id/default` | `email-settings.manage`; tạo/cập nhật mặc định                                  |
| DELETE | `/email-settings/types/:id/default` | `email-settings.manage`; xóa mặc định                                           |
| GET    | `/email-settings/me`                | Đăng nhập; danh sách cấu hình cá nhân kèm `emailType`                           |
| PUT    | `/email-settings/types/:id/me`      | Đăng nhập; tạo/cập nhật cấu hình cá nhân                                        |
| DELETE | `/email-settings/types/:id/me`      | Đăng nhập; xóa cấu hình cá nhân                                                 |

Body POST loại email:

```json
{ "code": "production_order_approved", "name": "Lệnh sản xuất được duyệt" }
```

Body PATCH loại email chỉ chứa `name`. Mã `code` cố định để backend xác định
nghiệp vụ. Thêm loại vào bảng chưa tự tạo sự kiện gửi email: nghiệp vụ tương ứng
cần gọi bộ chọn người nhận hoặc `sendConfiguredEmail`.

Body PUT cấu hình mặc định/cá nhân:

```json
{ "email": "qc@example.com,qa@example.com" }
```

`{ "email": "" }` tương đương DELETE. Xóa là idempotent. Loại email không tồn tại
trả 404; địa chỉ không hợp lệ trả 400 và không thay đổi cấu hình.

## Chọn người nhận và gửi email

Thứ tự áp dụng theo loại email và người thao tác:

1. Danh sách cá nhân có địa chỉ → dùng toàn bộ danh sách cá nhân.
2. Nếu cá nhân rỗng/chưa có, mặc định có địa chỉ → dùng toàn bộ danh sách mặc định.
3. Nếu cả hai rỗng/chưa có → lấy email người thao tác từ bảng `users`.

Các danh sách thay thế nhau, không cộng dồn. Không tự thêm người thao tác vào danh
sách cá nhân/mặc định. Nếu bước cuối chưa có email, trả 400 trước khi gọi nhà cung
cấp hoặc tạo bản ghi phiếu đã gửi.

Phiếu yêu cầu lấy mẫu lệnh sản xuất đã dùng mã `sampling_request`. Apps Script
nhận `emailRecipients` là chuỗi các email ngăn cách bằng dấu phẩy như trước.

Endpoint `POST /email/send` có thể dùng cấu hình bằng body:

```json
{
  "emailTypeCode": "sampling_request",
  "subject": "Phiếu yêu cầu lấy mẫu",
  "message": "Nội dung email"
}
```

Khi có `emailTypeCode`, trường `recipients` gửi kèm bị thay bằng danh sách đã chọn.
Khi không có `emailTypeCode`, API tiếp tục gửi đến `recipients` trực tiếp. Email
OTP đặt lại mật khẩu vẫn gửi trực tiếp đến tài khoản đang đặt lại mật khẩu.

Nghiệp vụ mới có thể import `EmailSettingsModule` rồi gọi
`EmailSettingsService.resolveRecipients(code, actorId)` để lấy `string[]`; hoặc
import `EmailModule` và gọi `EmailService.sendConfiguredEmail(code, actorId, dto)`.
