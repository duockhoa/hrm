# API Guide

Tài liệu này mô tả các API đang được khai báo trong NestJS backend.

Base URL khi chạy local:

```text
http://localhost:3000
```

Các API có `Auth: Bearer` cần gửi header:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Với API upload file, dùng `multipart/form-data`.

## Quy Ước Chung

- Date/time dùng ISO 8601, ví dụ: `2026-06-11T08:00:00.000Z`.
- ID trên URL thường là số nguyên.
- Response lỗi theo chuẩn NestJS, thường có `statusCode`, `message`, `error`.
- Các API export trả về file binary, không trả JSON.

## Auth

### Đăng nhập

```http
POST /auth/login
```

Auth: Public

Body:

```json
{
  "username": "admin",
  "password": "password"
}
```

Response:

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Đăng ký user

```http
POST /auth/register
```

Auth: Public

Body:

```json
{
  "username": "newuser",
  "password": "password",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "department": "QA",
  "position": "Staff"
}
```

### Refresh access token

```http
POST /auth/refresh-token
```

Auth: Public

Body:

```json
{
  "refreshToken": "..."
}
```

Response:

```json
{
  "accessToken": "..."
}
```

### Đăng xuất

```http
POST /auth/logout
```

Auth: Public

Body:

```json
{
  "refreshToken": "..."
}
```

### Lấy OTP reset mật khẩu

```http
POST /auth/get-reset-password-otp
POST /auth/request-password-reset
```

Auth: Public

Body:

```json
{
  "email": "a@example.com"
}
```

### Xác thực OTP reset mật khẩu

```http
POST /auth/verify-reset-password-otp
```

Auth: Public

Body:

```json
{
  "email": "a@example.com",
  "otp": "123456"
}
```

### Reset mật khẩu

```http
POST /auth/reset-password
```

Auth: Public

Body:

```json
{
  "email": "a@example.com",
  "otp": "123456",
  "newPassword": "new-password"
}
```

## Users

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách user

```http
GET /users
```

### Lấy danh sách user bao gồm bản ghi đã xóa

```http
GET /users/with-deleted
```

### Lấy thông tin user đang đăng nhập

```http
GET /users/me
```

### Lấy user theo ID

```http
GET /users/:id
```

### Tạo user

```http
POST /users
```

Body:

```json
{
  "username": "newuser",
  "password": "password",
  "name": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0900000000",
  "address": "Ho Chi Minh",
  "department": "QA",
  "position": "Staff"
}
```

### Cập nhật user

```http
PUT /users/:id
```

Body: gửi các field cần đổi.

```json
{
  "name": "Nguyen Van B",
  "department": "Production",
  "position": "Leader"
}
```

### Xóa user

```http
DELETE /users/:id
```

### Đổi mật khẩu user hiện tại

```http
POST /users/me/change-password
```

Body:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

### Upload avatar

```http
POST /users/me/avatar
```

Content-Type: `multipart/form-data`

Form data:

```text
avatar=<file>
```

## Companies

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách công ty

```http
GET /companies
```

### Lấy công ty theo ID

```http
GET /companies/:id
```

### Tạo công ty

```http
POST /companies
```

Body:

```json
{
  "name": "DK Pharma",
  "address": "Ha Noi",
  "phone": "0240000000",
  "email": "company@example.com",
  "description": "Company description",
  "leader_id": 1
}
```

### Cập nhật công ty

```http
PUT /companies/:id
```

Body: gửi các field cần đổi.

### Xóa công ty

```http
DELETE /companies/:id
```

## Departments

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách phòng ban

```http
GET /departments
```

### Lấy phòng ban theo tên

```http
GET /departments/:name
```

### Tạo phòng ban

```http
POST /departments
```

Body:

```json
{
  "name": "QA",
  "description": "Quality Assurance",
  "team_lead": 1,
  "company_id": 1
}
```

### Cập nhật phòng ban

```http
PUT /departments/:name
```

Body:

```json
{
  "description": "Quality Assurance Department",
  "team_lead": 2,
  "company_id": 1
}
```

### Xóa phòng ban

```http
DELETE /departments/:name
```

## Roles

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách role

```http
GET /roles
```

Response bao gồm `rolePermissions` và thông tin permission.

### Tạo role

```http
POST /roles
```

Body:

```json
{
  "roleName": "admin",
  "description": "Administrator"
}
```

### Gán permission cho role

```http
POST /roles/:roleId/permission
```

Body:

```json
{
  "permissionId": 1
}
```

### Gỡ permission khỏi role

```http
DELETE /roles/:roleId/remove-permission/:permissionId
```

## Items

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách item

```http
GET /items
```

### Lấy thành phẩm

```http
GET /items/finished-products
```

### Lấy bán thành phẩm

```http
GET /items/semi-finished-products
```

### Lấy nguyên liệu

```http
GET /items/raw-materials
```

### Lấy item theo mã

```http
GET /items/:item_code
```

Ví dụ:

```http
GET /items/TP00001
```

## Production Orders

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách lệnh sản xuất

```http
GET /production-orders
```

Response có thêm field `pyclm` dựa trên sampling request mới nhất.

### Lấy lệnh sản xuất thành phẩm

```http
GET /production-orders/finished-products
```

### Lấy lệnh sản xuất bán thành phẩm

```http
GET /production-orders/semi-finished-products
```

### Lấy chi tiết lệnh sản xuất

```http
GET /production-orders/:id
```

### Lấy line của lệnh sản xuất từ SAP connector

```http
GET /production-orders/:id/production-order-lines
```

### Export lệnh sản xuất

```http
GET /production-orders/:id/export
```

Response: file `.docx`.

### Export phiếu xuất kho theo line

```http
POST /production-orders/:id/production-order-lines/export
```

Body có thể để `{}` để export tất cả line, hoặc lọc theo công đoạn:

```json
{
  "stageIds": [1, 2, 3]
}
```

Các tên field được hỗ trợ: `stageId`, `stageIds`, `StageID`.

Response: file `.xlsx`.

## Production Order Sampling Requests

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy lịch sử gửi phiếu kiểm nghiệm PYCLM

```http
GET /production-orders/:id/sampling-requests
```

### Tạo yêu cầu gửi phiếu kiểm nghiệm PYCLM

```http
POST /production-orders/:id/sampling-requests
```

Body:

```json
{
  "location": "Kiem nghiem",
  "resend": false
}
```

Ghi chú:

- `location` là tùy chọn.
- `resend` hiện được DTO hỗ trợ nhưng logic chặn gửi lại đang bị comment trong service.
- Người gửi được lấy từ user đăng nhập.

## Production Order Environment Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách kiểm tra môi trường của lệnh sản xuất

```http
GET /production-orders/:id/environment-checks
```

Response sắp xếp theo `checked_at` mới nhất trước, sau đó `created_at` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "room": "Phong pha che 1",
    "temperature_c": "25.50",
    "humidity_percent": "60.20",
    "created_by_id": 7,
    "checked_at": "2026-06-11T08:00:00.000Z",
    "created_at": "2026-06-11T08:10:00.000Z",
    "updated_at": "2026-06-11T08:10:00.000Z",
    "createdBy": {
      "id": 7,
      "username": "binh",
      "name": "Binh",
      "email": "binh@example.com",
      "department": "QA",
      "position": "Staff"
    }
  }
]
```

### Thêm dữ liệu nhiệt độ/độ ẩm

```http
POST /production-orders/:id/environment-checks
```

Body:

```json
{
  "room": "Phong pha che 1",
  "temperature_c": 25.5,
  "humidity_percent": 60.2,
  "checked_at": "2026-06-11T08:00:00.000Z"
}
```

Quy tắc:

- `room` bắt buộc và không được rỗng.
- `temperature_c` bắt buộc, lưu dạng `DECIMAL(5, 2)`.
- `humidity_percent` bắt buộc, lưu dạng `DECIMAL(5, 2)`, giá trị từ `0` đến `100`.
- Có thể gửi số dạng chuỗi, ví dụ `"25.5"` hoặc `"25,5"`.
- `checked_at` là thời điểm kiểm tra thực tế.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 room is required`
- `400 humidity_percent must be less than or equal to 100`
- `401 Authenticated user not found`

## Production Order Deviations

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách sai lệch

```http
GET /production-order-deviations
```

Lọc theo lệnh sản xuất:

```http
GET /production-order-deviations?production_order_id=2031
```

### Lấy sai lệch theo ID

```http
GET /production-order-deviations/:id
```

### Tạo sai lệch

```http
POST /production-order-deviations
```

Cách 1: JSON body với đường dẫn ảnh có sẵn:

```json
{
  "production_order_id": 2031,
  "deviation_content": "Noi dung sai lech",
  "handling_plan": "Huong xu ly",
  "approver_id": 2,
  "reporter_id": 7,
  "deviation_images": [
    "/production-order-deviations/images/example.jpg"
  ]
}
```

Cách 2: `multipart/form-data` upload ảnh:

```text
production_order_id=2031
deviation_content=Noi dung sai lech
handling_plan=Huong xu ly
approver_id=2
reporter_id=7
deviation_images=<file>
deviation_images=<file>
```

Ghi chú upload:

- Field upload hỗ trợ `deviation_images` hoặc `deviation_image`.
- Tối đa 10 ảnh.
- File hợp lệ: JPG, PNG, WEBP, GIF.
- Dung lượng tối đa mỗi file: 5 MB.

### Cập nhật sai lệch

```http
PUT /production-order-deviations/:id
```

Body: JSON hoặc `multipart/form-data`, gửi các field cần đổi.

```json
{
  "deviation_content": "Noi dung moi",
  "handling_plan": "Huong xu ly moi",
  "approver_id": 2
}
```

### Xóa sai lệch

```http
DELETE /production-order-deviations/:id
```

### Lấy file ảnh sai lệch

```http
GET /production-order-deviations/images/:filename
```

Response: file ảnh.

## Production Specifications

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách specification

```http
GET /production-specifications
```

### Lấy specification theo mã item

```http
GET /production-specifications/:item_code
```

### Tạo specification

```http
POST /production-specifications
```

Body:

```json
{
  "item_code": "TP00001",
  "product_line": "Line A",
  "dosage_form": "Liquid",
  "lower_control_limit": 95,
  "upper_control_limit": 105,
  "lower_allowed_limit": 90,
  "upper_allowed_limit": 110,
  "unit": "%"
}
```

Quy tắc:

- `item_code` phải tồn tại trong bảng `items`.
- Các field giới hạn là số thập phân, tối đa 6 chữ số sau dấu phẩy.
- Nếu specification đã bị soft delete, API create/update có thể restore bản ghi.

### Cập nhật specification

```http
PUT /production-specifications/:item_code
```

Body: gửi các field cần đổi.

```json
{
  "lower_control_limit": 96,
  "upper_control_limit": 104,
  "unit": "%"
}
```

### Xóa mềm specification

```http
DELETE /production-specifications/:item_code
```

API này set `deleted_at`, không xóa cứng bản ghi.

## Email

### Gửi email

```http
POST /email/send
```

Auth: Bearer

Body:

```json
{
  "recipients": ["a@example.com", "b@example.com"],
  "subject": "Thong bao",
  "message": "Noi dung email",
  "html": "<p>Noi dung HTML</p>",
  "senderName": "HRM"
}
```

Quy tắc:

- `recipients` có thể là chuỗi, chuỗi phân tách bằng dấu phẩy, hoặc mảng chuỗi.
- `subject` bắt buộc.
- Cần có ít nhất một trong hai field: `message` hoặc `html`.

## App Root

Các route này hiện có trong `AppController`, chủ yếu dùng kiểm tra server.

```http
GET /
POST /
```

## Module Chưa Có Endpoint Public

Các controller sau đang tồn tại nhưng chưa khai báo route xử lý request:

- `PermissionsController`
- `ExternalSyncController`
