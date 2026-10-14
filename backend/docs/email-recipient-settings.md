# Cấu hình người nhận email

Ba bảng `email_types`, `email_default_recipients`, `email_user_recipients` lưu
loại email, cấu hình mặc định và cấu hình cá nhân. Mỗi cấu hình chứa một trường
`email TEXT`; cấu hình mặc định lưu các địa chỉ ngăn cách bằng một dấu cách,
cấu hình cá nhân vẫn lưu bằng dấu phẩy. Không có `display_name` hoặc bảng con cho từng email.

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
Migration `20261014040000_add_deviation_created_email_type` thêm loại **Phiếu sai lệch**
(`production_order_deviation_created`), để trống người nhận mặc định.
Migration `20261014050000_space_separated_default_email_recipients` chuyển dấu phẩy
trong dữ liệu mặc định cũ sang dấu cách, giữ nguyên bảng và trường dữ liệu.

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
trong chi tiết, nút Chỉnh sửa mở form nhập danh sách email ngăn cách bằng dấu cách.
Bên dưới phần thông tin chung là bảng **Người nhận email mặc định**: mỗi địa chỉ
một dòng với thao tác thêm, sửa, xóa độc lập. Xóa dòng cuối sẽ xóa cấu hình mặc định.
Backend cập nhật từng dòng vào cùng trường `email TEXT`; thao tác đồng thời được kiểm tra
để không ghi đè thay đổi của người nhận khác. Các địa chỉ trùng không phân biệt hoa/thường
trả 409; sửa địa chỉ không còn tồn tại trả 404.
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
| POST | `/email-settings/types/:id/default/recipients` | `email-settings.manage`; thêm một địa chỉ |
| PATCH | `/email-settings/types/:id/default/recipients` | `email-settings.manage`; sửa một địa chỉ |
| DELETE | `/email-settings/types/:id/default/recipients` | `email-settings.manage`; xóa một địa chỉ |
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
{ "email": "qc@example.com qa@example.com" }
```

`{ "email": "" }` tương đương DELETE. Xóa là idempotent. Loại email không tồn tại
trả 404; địa chỉ không hợp lệ trả 400 và không thay đổi cấu hình.
API vẫn đọc/nhận danh sách dấu phẩy cũ và các khoảng trắng (dấu cách, xuống dòng, tab).

Body POST/DELETE cho một người nhận: `{ "email": "qc@example.com" }`.
Body PATCH: `{ "email": "qc@example.com", "newEmail": "qa@example.com" }`.
Các API trả cấu hình mới `{ id?, email_type_id, email }`; frontend cập nhật cả bảng
và trạng thái chi tiết từ cấu hình này. Mỗi body chỉ nhận một địa chỉ hợp lệ.

## Chọn người nhận và gửi email

Thứ tự áp dụng theo loại email và người thao tác:

Riêng **Phiếu sai lệch** chỉ dùng cấu hình mặc định; không áp dụng cấu hình cá nhân
hay email người thao tác. Loại này không xuất hiện trong màn hình Cá nhân hoá email;
API lưu cá nhân trả 400. Khi chưa có người nhận mặc định, tạo phiếu vẫn thành công
và không gửi email. Quy tắc ưu tiên bên dưới áp dụng cho các loại còn lại.

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

## Thông báo tạo phiếu sai lệch

Chỉ `POST /production-order-deviations` gửi thông báo, sau khi transaction lưu phiếu
và ảnh thành công. Sửa/xóa phiếu hoặc tạo thất bại không gửi email. Email gồm các
trường như màn hình chi tiết, ngày giờ Việt Nam, logo và ảnh nhúng trong nội dung.
Không gửi file HTML hoặc tệp đính kèm riêng (`attachments`).
Đầu thông báo hiển thị logo DKPHARMA rộng 200 px, tự thu nhỏ theo màn hình. Logo
được đọc từ `templates/batch-report/logo-removebg.png`, gửi base64 trong
`inlineImages.dkpharma_logo`; HTML tham chiếu `cid:dkpharma_logo`. Nếu thiếu file
logo, dùng chữ DKPHARMA. Ảnh sai lệch được đọc từ thư mục upload, thu nhỏ tối đa
1200 × 1200 và chuyển JPEG, gửi qua `inlineImages` với khóa `deviation_image_<n>`.
Không tải ảnh/logo email lên Cloudinary và không dùng URL ảnh yêu cầu đăng nhập.
Thông báo sai lệch không dùng `DEVIATION_EMAIL_LOGO_URL` hoặc cấu hình logo OTP;
chức năng OTP và Cloudinary cho ảnh đại diện giữ nguyên.
Nếu ảnh bị mất/lỗi, email hiển thị
thông báo tại vị trí ảnh và ghi log. Lỗi nhà cung cấp được ghi log; phiếu và ảnh đã
lưu không bị xóa, không tự thử gửi lại hoặc gửi bù khi thêm cấu hình sau đó.

Để kích hoạt:

1. Chạy `npx prisma migrate deploy` trong `backend` để thêm loại email.
2. Cập nhật **dự án Google Apps Script gửi email** bằng `apps-script/email.gs`,
   triển khai phiên bản Web App mới. Đây là dự án riêng với các script xuất dữ liệu.
   Nếu cập nhật deployment hiện hành, giữ URL `APPS_SCRIPT_EMAIL_API_URL`;
   nếu tạo deployment mới, cập nhật biến này. Script phải chạy bằng tài khoản có
   quyền gửi email và cho phép backend gọi Web App như deployment đang dùng.
3. HRM → **Email mặc định** → **Phiếu sai lệch** → nhập địa chỉ người nhận và lưu.

Backend tiếp tục gửi payload cũ cho email OTP. Thông báo sai lệch gửi ảnh nhúng:

```json
{
  "inlineImages": {
    "dkpharma_logo": {
      "filename": "dkpharma-logo.png",
      "contentType": "image/png",
      "contentBase64": "..."
    },
    "deviation_image_1": {
      "filename": "deviation_image_1.jpg",
      "contentType": "image/jpeg",
      "contentBase64": "..."
    }
  }
}
```

HTML thông báo dùng `<img src="cid:dkpharma_logo">` và
`<img src="cid:deviation_image_1">`; script giải mã base64 thành Blob
và truyền `inlineImages` cho
[GmailApp.sendEmail](https://developers.google.com/apps-script/reference/gmail/gmail-app#sendEmail(String,String,String,Object)).
Tổng dung lượng ảnh và file đã giải mã tối đa 16 MB. Deployment cũ chỉ xử lý `html`
phải được cập nhật và triển khai phiên bản mới để xử lý ảnh CID. API gửi email chung
vẫn hỗ trợ `attachments` khi được yêu cầu, nhưng thông báo sai lệch không gửi trường này.

### Cấp quyền GmailApp

Script dùng `GmailApp.sendEmail(recipients, subject, body, options)` và cần quyền
`https://mail.google.com/`. Chuyển từ MailApp sang GmailApp vẫn phải cấp quyền Google;
đổi dịch vụ không tự khắc phục lỗi chưa được ủy quyền.

1. Nếu `appsscript.json` có mảng `oauthScopes`, thêm `https://mail.google.com/` vào
   mảng và giữ các quyền khác mà dự án vẫn sử dụng.
2. Trong trình soạn thảo Apps Script, chọn hàm `authorizeGmail` → **Run**, cấp quyền
   bằng tài khoản triển khai. Hàm chỉ đọc danh sách bí danh để yêu cầu quyền, không gửi email.
3. **Deploy → Manage deployments → Edit → New version → Deploy**, giữ
   **Execute as: Me** và cấu hình truy cập đang cho phép backend gọi Web App.
   Cập nhật deployment hiện hành để giữ URL trong `APPS_SCRIPT_EMAIL_API_URL`.

Payload backend giữ nguyên cho cả OTP và thông báo sai lệch.
