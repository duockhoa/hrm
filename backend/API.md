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

## Swagger UI

Khi backend đang chạy, Swagger UI được phục vụ tại:

```text
http://localhost:50000/api-docs
```

Có thể thay đổi port bằng biến môi trường `SWAGGER_PORT`. Swagger dùng chung API handler với backend, nên các request thử nghiệm trong giao diện được gửi tới cùng port `50000`.

## Quy Ước Chung

- Date/time dùng ISO 8601, ví dụ: `2026-06-11T08:00:00.000Z`.
- ID trên URL thường là số nguyên.
- Response lỗi theo chuẩn NestJS, thường có `statusCode`, `message`, `error`.
- Các API export trả về file binary, không trả JSON.

## Cleaning Objects và Cleaning Requirements

Tất cả endpoint bên dưới yêu cầu `Auth: Bearer`. Trường `created_by_id` được lấy tự động từ access token và không cần (cũng không nên) gửi từ client.

### Cleaning objects

```http
GET    /cleaning-objects
GET    /cleaning-objects/:id
GET    /cleaning-objects/qr/:qrCode
POST   /cleaning-objects
PATCH  /cleaning-objects/:id
DELETE /cleaning-objects/:id
```

Body tạo/cập nhật:

```json
{
  "name": "Bàn đóng gói số 1",
  "qr_code": "CLEAN-OBJ-001"
}
```

`qr_code` là duy nhất. API chi tiết đối tượng trả kèm `cleaningRequirements`; API danh sách trả kèm `cleaning_requirements_count`. Xóa đối tượng sẽ xóa các yêu cầu thuộc đối tượng đó.

### Cleaning requirements

```http
GET    /cleaning-requirements
GET    /cleaning-requirements/:id
POST   /cleaning-requirements
PATCH  /cleaning-requirements/:id
DELETE /cleaning-requirements/:id
```

Body tạo:

```json
{
  "cleaning_object_id": 1,
  "requirement_type": "Disinfection",
  "requirement_content": "Lau bề mặt bằng dung dịch sát khuẩn theo SOP."
}
```

Các trường trên đều có thể cập nhật qua `PATCH`; `cleaning_object_id` phải tham chiếu đến một đối tượng tồn tại.

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

Response thanh cong:

```json
{
  "message": "Password reset OTP sent"
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

`newPassword` toi thieu 6 ky tu. OTP chi dung duoc mot lan va het han theo `PASSWORD_RESET_OTP_EXPIRES_IN_MINUTES` hoac mac dinh 5 phut.

## Users

Tất cả API trong nhóm này cần `Auth: Bearer`. Các API quản trị yêu cầu thêm key quyền tương ứng; quyền được lấy từ role của user. Nếu thiếu key, API trả về `403 Forbidden`.

| Key quyền | API được phép gọi |
| --- | --- |
| `users.list` | `GET /users` |
| `users.list.deleted` | `GET /users/with-deleted` |
| `users.read` | `GET /users/:id` |
| `users.create` | `POST /users` |
| `users.update` | `PUT /users/:id` |
| `users.delete` | `DELETE /users/:id` |
| `users.roles.read` | `GET /users/:id/roles` |
| `users.roles.assign` | `POST`, `PUT`, `DELETE /users/:id/roles...` |
| `users.applications.read` | `GET /users/:id/applications` |
| `users.applications.assign` | `PUT /users/:id/applications` |
| `users.permissions.read` | `GET /users/:id/permissions` |

Các route tự phục vụ chỉ yêu cầu đăng nhập: `GET /users/me`, `GET /users/me/applications`, `GET /users/me/permissions`, `POST /users/me/avatar`, `POST /users/me/change-password`.

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

### Lấy ứng dụng user đang đăng nhập được vào

```http
GET /users/me/applications
```

Response chỉ gồm các ứng dụng đang active, sắp xếp theo `default_order`, `name`, `id`.

Response mẫu:

```json
[
  {
    "id": 1,
    "key": "hrm",
    "name": "HRM",
    "description": "Quan ly nhan su",
    "default_order": 1,
    "is_active": true,
    "created_at": "2026-07-26T08:00:00.000Z",
    "updated_at": "2026-07-26T08:00:00.000Z"
  }
]
```

### Lấy user theo ID

```http
GET /users/:id
```

### Lấy role của user

```http
GET /users/:id/roles
```

Response gồm danh sách `userRoles`, mỗi item include `roles` và `rolePermissions`.

### Lấy key phân quyền của user hiện tại

```http
GET /users/me/permissions
```

Response trả về các key quyền mà user nhận được từ toàn bộ role, đã loại bỏ key trùng lặp và sắp xếp tăng dần:

```json
{
  "permissionKeys": ["roles.read", "users.read", "users.write"]
}
```

### Lấy key phân quyền của một user

```http
GET /users/:id/permissions
```

Response có cùng cấu trúc với `GET /users/me/permissions`.

### Gán role cho user

```http
POST /users/:id/roles
```

Body gán một role:

```json
{
  "roleId": 1
}
```

Hoặc gán nhiều role:

```json
{
  "roleIds": [1, 2, 3]
}
```

### Đồng bộ role của user

```http
PUT /users/:id/roles
```

Body:

```json
{
  "roleIds": [1, 2]
}
```

Gửi mảng rỗng `[]` để gỡ toàn bộ role của user.

### Gỡ role khỏi user

```http
DELETE /users/:id/roles/:roleId
```

### Lấy ứng dụng của user

```http
GET /users/:id/applications
```

Response giống `GET /users/me/applications`.

### Đồng bộ ứng dụng của user

```http
PUT /users/:id/applications
```

Body:

```json
{
  "applicationIds": [1, 2, 3]
}
```

Gửi mảng rỗng `[]` để gỡ toàn bộ ứng dụng của user. Backend chỉ lưu quan hệ user-app; người dùng vẫn cần đăng nhập hợp lệ.

Lỗi thường gặp:

- `404 User not found`
- `404 Applications not found: 1, 2`
- `400 applicationIds must be an array`
- `400 applicationIds must contain positive integers`

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

## Applications

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này quản trị danh sách ứng dụng để gán trực tiếp cho user qua `user_applications`.

### Lấy danh sách ứng dụng

```http
GET /applications
GET /applications?includeInactive=false
```

Mặc định trả cả ứng dụng inactive. Dùng `includeInactive=false` để chỉ lấy ứng dụng đang active.

### Lấy ứng dụng theo ID

```http
GET /applications/:id
```

### Tạo ứng dụng

```http
POST /applications
```

Body:

```json
{
  "key": "hrm",
  "name": "HRM",
  "description": "Quan ly nhan su",
  "default_order": 1,
  "is_active": true
}
```

Quy tắc:

- `key` bắt buộc, duy nhất, tối đa 100 ký tự.
- `name` bắt buộc, tối đa 255 ký tự.
- `description` tùy chọn.
- `default_order` mặc định `0`.
- `is_active` mặc định `true`.

### Cập nhật ứng dụng

```http
PATCH /applications/:id
```

Body: gửi một hoặc nhiều field cần đổi.

### Xóa ứng dụng

```http
DELETE /applications/:id
```

Khi xóa ứng dụng, các dòng gán trong `user_applications` cũng bị xóa theo.

Lỗi thường gặp:

- `404 Application not found`
- `409 Application key already exists`
- `400 No update data provided`

## Permissions

Tất cả API trong nhóm này cần `Auth: Bearer`.

Các API này chỉ quản trị danh sách permission, chưa tự gắn permission vào API nghiệp vụ.

### Lấy danh sách permission

```http
GET /permissions
```

Response bao gồm `rolePermissions` và thông tin role đang dùng permission.

### Lấy permission theo ID

```http
GET /permissions/:id
```

### Tạo permission

```http
POST /permissions
```

Body:

```json
{
  "name": "production-orders.read",
  "description": "Xem hồ sơ lô"
}
```

### Cập nhật permission

```http
PUT /permissions/:id
```

Body:

```json
{
  "name": "production-orders.read",
  "description": "Xem danh sách và chi tiết hồ sơ lô"
}
```

### Xóa permission

```http
DELETE /permissions/:id
```

## Roles

Tất cả API trong nhóm này cần `Auth: Bearer`.

Các API này quản trị role và quan hệ role-permission, chưa yêu cầu permission cụ thể để gọi.

### Lấy danh sách role

```http
GET /roles
```

Response bao gồm `rolePermissions` và thông tin permission.

### Lấy role theo ID

```http
GET /roles/:id
```

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

Có thể dùng `name` thay cho `roleName`:

```json
{
  "name": "admin",
  "description": "Administrator"
}
```

### Cập nhật role

```http
PUT /roles/:id
```

Body:

```json
{
  "name": "qa",
  "description": "Quality Assurance"
}
```

### Xóa role

```http
DELETE /roles/:id
```

### Gán permission cho role

```http
POST /roles/:roleId/permissions
```

Body gán một permission:

```json
{
  "permissionId": 1
}
```

Hoặc gán nhiều permission:

```json
{
  "permissionIds": [1, 2, 3]
}
```

Route cũ vẫn dùng được:

```http
POST /roles/:roleId/permission
```

### Đồng bộ permission của role

```http
PUT /roles/:roleId/permissions
```

Body:

```json
{
  "permissionIds": [1, 2]
}
```

Gửi mảng rỗng `[]` để gỡ toàn bộ permission của role.

### Gỡ permission khỏi role

```http
DELETE /roles/:roleId/permissions/:permissionId
```

Route cũ vẫn dùng được:

```http
DELETE /roles/:roleId/remove-permission/:permissionId
```

## Registration Numbers

Tất cả API trong nhóm này cần `Auth: Bearer`.

Sync số đăng ký dùng tài khoản service để tự lấy token, không cấu hình token trực tiếp:

```env
SCB_AUTH_LOGIN_URL=https://server.dkpharma.io.vn/auth/login
SCB_AUTH_USERNAME=0029
SCB_AUTH_PASSWORD=...
SCB_REGISTRATION_NUMBERS_API_URL=https://scbserver.dkpharma.io.vn/api/ho-so
SCB_REGISTRATION_NUMBERS_SYNC_CRON="0 * * * * *"
SCB_REGISTRATION_NUMBERS_LIMIT=5000
```

### Lấy danh sách số đăng ký

```http
GET /registration-numbers
GET /registration-numbers?search=723
```

Query:

- `search`: tìm theo `registration_number`, không bắt buộc.

Response:

```json
[
  {
    "id": 583,
    "registration_number": "723/26/CBMP-PT",
    "product_name": "Muối kiềm"
  }
]
```

## Items

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách item

```http
GET /items
```

Response include `productionSpecification`. Nếu specification có `product_line_id`, response include thêm `productionSpecification.productLine`. Nếu specification có `updated_by_id`, response include thêm `productionSpecification.updatedBy`.

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

Response include `productionSpecification`. Nếu specification có `product_line_id`, response include thêm `productionSpecification.productLine`. Nếu specification có `updated_by_id`, response include thêm `productionSpecification.updatedBy`.

### Cập nhật item

```http
PATCH /items/:item_code
```

Body hiện hỗ trợ cập nhật số đăng ký:

```json
{
  "registration_id": 583
}
```

Gửi `null` để xóa liên kết số đăng ký:

```json
{
  "registration_id": null
}
```

Response trả item sau khi cập nhật, include `registration` và `productionSpecification`.

## Item Equipment

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu danh sách thiết bị được dùng cho từng item. Một item có thể dùng nhiều thiết bị; một thiết bị có thể dùng cho nhiều item. Backend lấy `created_by_id` từ user đăng nhập. Không lưu `note`.

### Lấy danh sách thiết bị của item

```http
GET /items/:item_code/equipment
```

Response mẫu:

```json
[
  {
    "id": 1,
    "item_code": "TP00001",
    "equipment_id": 2,
    "created_by_id": 7,
    "created_at": "2026-07-19T00:00:00.000Z",
    "updated_at": "2026-07-19T00:00:00.000Z",
    "equipment": {
      "id": 2,
      "code": "TB-001",
      "name": "Cân phân tích",
      "created_by_id": 7,
      "created_at": "2026-07-19T00:00:00.000Z",
      "updated_at": "2026-07-19T00:00:00.000Z",
      "parameters": [
        {
          "id": 1,
          "equipment_id": 2,
          "name": "Sai số cho phép",
          "data_type": "number",
          "unit": "g",
          "is_required": true,
          "created_by_id": 7,
          "created_at": "2026-07-19T00:00:00.000Z",
          "updated_at": "2026-07-19T00:00:00.000Z"
        }
      ]
    },
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

Lỗi thường gặp:

- `404 Item not found`

### Lấy một liên kết item-thiết bị theo ID

```http
GET /items/equipment/:itemEquipmentId
```

Lỗi thường gặp:

- `404 Item equipment not found`

### Thêm thiết bị cho item

```http
POST /items/:item_code/equipment
Content-Type: application/json
```

Body:

```json
{
  "equipment_id": 2
}
```

Quy tắc:

- `equipment_id` bắt buộc và phải là thiết bị đang tồn tại.
- Một item không được thêm trùng cùng một thiết bị.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `400 item_code is required`
- `400 equipment_id is required`
- `401 Authenticated user not found`
- `404 Item not found`
- `404 Equipment not found`
- `409 Item equipment already exists`

### Xóa liên kết item-thiết bị

```http
DELETE /items/equipment/:itemEquipmentId
```

API trả về liên kết item-thiết bị vừa xóa.

Lỗi thường gặp:

- `404 Item equipment not found`

## Equipment

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu danh sách thiết bị. Backend lấy `created_by_id` từ user đăng nhập; body không cần gửi thông tin người tạo.

### Lấy danh sách thiết bị

```http
GET /equipment
```

Response mẫu:

```json
[
  {
    "id": 1,
    "code": "TB-001",
    "name": "Cân phân tích",
    "created_by_id": 7,
    "created_at": "2026-07-19T00:00:00.000Z",
    "updated_at": "2026-07-19T00:00:00.000Z",
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

### Lấy thiết bị theo ID

```http
GET /equipment/:id
```

Lỗi thường gặp:

- `404 Equipment not found`

### Tạo thiết bị

```http
POST /equipment
Content-Type: application/json
```

Body:

```json
{
  "code": "TB-001",
  "name": "Cân phân tích"
}
```

Quy tắc:

- `code` bắt buộc, tối đa 100 ký tự và không được trùng.
- `name` bắt buộc, tối đa 255 ký tự.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `400 code is required`
- `400 code must be at most 100 characters`
- `400 name is required`
- `400 name must be at most 255 characters`
- `401 Authenticated user not found`
- `409 Equipment code already exists`

### Cập nhật thiết bị

```http
PATCH /equipment/:id
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "name": "Máy trộn"
}
```

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `code` và `name` giống API tạo.
- `404 Equipment not found`
- `409 Equipment code already exists`

### Xóa thiết bị

```http
DELETE /equipment/:id
```

API trả về thiết bị vừa xóa.

Lỗi thường gặp:

- `404 Equipment not found`

## Equipment Parameters

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu danh sách thông số cần nhập cho từng thiết bị. Một thiết bị có thể có nhiều thông số; tên thông số không được trùng trong cùng một thiết bị. Backend lấy `created_by_id` từ user đăng nhập.

`data_type` hỗ trợ các giá trị:

- `text`: chuỗi.
- `number`: số.
- `boolean`: đúng/sai.
- `date`: ngày.
- `datetime`: ngày giờ.
- `select`: lựa chọn.

### Lấy danh sách thông số theo thiết bị

```http
GET /equipment/:id/parameters
```

Response mẫu:

```json
[
  {
    "id": 1,
    "equipment_id": 1,
    "name": "Sai số cho phép",
    "data_type": "number",
    "unit": "g",
    "is_required": true,
    "created_by_id": 7,
    "created_at": "2026-07-19T00:00:00.000Z",
    "updated_at": "2026-07-19T00:00:00.000Z",
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

Lỗi thường gặp:

- `404 Equipment not found`

### Lấy một thông số theo ID

```http
GET /equipment/parameters/:parameterId
```

Lỗi thường gặp:

- `404 Equipment parameter not found`

### Tạo thông số cho thiết bị

```http
POST /equipment/:id/parameters
Content-Type: application/json
```

Body:

```json
{
  "name": "Sai số cho phép",
  "data_type": "number",
  "unit": "g",
  "is_required": true
}
```

Quy tắc:

- `name` bắt buộc, tối đa 255 ký tự và không được trùng trong cùng thiết bị.
- `data_type` bắt buộc, chỉ nhận `text`, `number`, `boolean`, `date`, `datetime`, `select`.
- `unit` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `is_required` không bắt buộc, mặc định `true`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Equipment not found`
- `400 name is required`
- `400 name must be at most 255 characters`
- `400 data_type is required`
- `400 data_type must be one of: text, number, boolean, date, datetime, select`
- `400 unit must be a string`
- `400 unit must be at most 50 characters`
- `400 is_required must be a boolean`
- `401 Authenticated user not found`
- `409 Equipment parameter name already exists`

### Cập nhật thông số

```http
PATCH /equipment/parameters/:parameterId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "unit": "mg",
  "is_required": false
}
```

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `name`, `data_type`, `unit`, `is_required` giống API tạo.
- `404 Equipment parameter not found`
- `409 Equipment parameter name already exists`

### Xóa thông số

```http
DELETE /equipment/parameters/:parameterId
```

API trả về thông số vừa xóa.

Lỗi thường gặp:

- `404 Equipment parameter not found`

### Lấy danh sách lần theo dõi thông số thiết bị

```http
GET /equipment/monitoring-records
```

Query không bắt buộc:

```http
GET /equipment/monitoring-records?production_order_id=1001&equipment_id=1
```

Response gồm lệnh sản xuất, thiết bị, người tạo và danh sách giá trị theo từng thông số.

### Lấy một lần theo dõi thông số thiết bị

```http
GET /equipment/monitoring-records/:recordId
```

Lỗi thường gặp:

- `404 Equipment monitoring record not found`

### Tạo lần theo dõi thông số thiết bị

```http
POST /equipment/monitoring-records
Content-Type: application/json
```

Body:

```json
{
  "production_order_id": 1001,
  "equipment_id": 1,
  "recorded_at": "2026-07-19T08:00:00.000Z",
  "note": "Kiểm tra đầu ca",
  "values": [
    {
      "parameter_id": 1,
      "value": "25.5",
      "note": "Ổn định"
    },
    {
      "parameter_id": 2,
      "value": "Đạt"
    }
  ]
}
```

Quy tắc:

- `production_order_id` bắt buộc và phải tồn tại.
- `equipment_id` bắt buộc và phải tồn tại.
- `recorded_at` không bắt buộc; nếu không gửi backend dùng thời điểm hiện tại.
- `values` bắt buộc, phải là mảng và có ít nhất một item.
- Mỗi `parameter_id` chỉ được gửi một lần trong cùng record.
- `parameter_id` phải thuộc đúng `equipment_id`.
- Các thông số có `is_required = true` bắt buộc phải có value.
- Dù DB chỉ lưu `value` dạng text, backend vẫn validate theo `data_type` của thông số: `number`, `boolean`, `date`, `datetime`.

Lỗi thường gặp:

- `400 production_order_id must be a positive integer`
- `400 equipment_id must be a positive integer`
- `400 values must be an array`
- `400 values must contain at least one item`
- `400 values[x].parameter_id does not belong to equipment`
- `400 <Tên thông số> is required`
- `401 Authenticated user not found`
- `404 Production order not found`
- `404 Equipment not found`

### Cập nhật lần theo dõi thông số thiết bị

```http
PATCH /equipment/monitoring-records/:recordId
Content-Type: application/json
```

Body gửi field cần đổi:

```json
{
  "recorded_at": "2026-07-19T09:00:00.000Z",
  "note": "Cập nhật sau kiểm tra lại",
  "values": [
    {
      "parameter_id": 1,
      "value": "26"
    },
    {
      "parameter_id": 2,
      "value": "Đạt"
    }
  ]
}
```

Lưu ý: nếu gửi `values`, backend sẽ thay thế toàn bộ danh sách value cũ của record bằng danh sách mới.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi validate `values` giống API tạo.
- `404 Equipment monitoring record not found`

### Xóa lần theo dõi thông số thiết bị

```http
DELETE /equipment/monitoring-records/:recordId
```

API xóa mềm bằng `deleted_at`.

Lỗi thường gặp:

- `404 Equipment monitoring record not found`

## Features

Tất cả API trong nhóm này cần `Auth: Bearer`.

`features` là danh mục action/view chuẩn của hệ thống; `item_features` là liên kết xác định item nào được bật từng feature. Một feature có thể được dùng cho nhiều item.

### Cấu trúc feature

| Field | Kiểu | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| `id` | number | Tự sinh | ID feature. |
| `key` | string | Có khi tạo | Khóa duy nhất của feature, ví dụ `environment_checks`. Giá trị được cắt khoảng trắng đầu/cuối. |
| `kind` | string | Có khi tạo | Loại feature. API config frontend tách riêng `action` và `section`; các giá trị khác vẫn được trả về trong mảng `features`. |
| `label` | string | Có khi tạo | Tên hiển thị. Giá trị được cắt khoảng trắng đầu/cuối. |
| `group_name` | string \| null | Không | Tên nhóm để frontend phân nhóm feature, ví dụ `Kiểm tra môi trường`. Tối đa 100 ký tự. Gửi `null` hoặc chuỗi rỗng để bỏ nhóm. |
| `default_order` | number | Không | Thứ tự mặc định, mặc định là `0`. Có thể là số nguyên âm. |
| `created_at` | ISO 8601 datetime | Tự sinh | Thời điểm tạo. |
| `updated_at` | ISO 8601 datetime | Tự sinh | Thời điểm cập nhật gần nhất. |

`group_name` chỉ là metadata phục vụ hiển thị/phân nhóm; không làm thay đổi quyền truy cập hay trạng thái bật/tắt feature.

### Lấy danh sách feature

```http
GET /features
```

Trả về mảng feature, sắp xếp theo `default_order` tăng dần, sau đó theo `key` tăng dần.

Ví dụ response:

```json
[
  {
    "id": 1,
    "key": "environment_checks",
    "kind": "section",
    "label": "Nhiệt độ/độ ẩm",
    "group_name": "Kiểm tra môi trường",
    "default_order": 10,
    "created_at": "2026-08-11T08:00:00.000Z",
    "updated_at": "2026-08-11T08:00:00.000Z"
  }
]
```

### Lấy feature theo id

```http
GET /features/:id
```

`id` phải là số nguyên. Response là feature kèm mảng `itemFeatures`, thể hiện các item đang liên kết với feature đó.

Lỗi thường gặp:

- `404 Feature not found`

### Lấy feature theo key

```http
GET /features/key/:key
```

`key` không được rỗng. Response giống `GET /features/:id`, bao gồm mảng `itemFeatures`.

Lỗi thường gặp:

- `400 key is required`
- `404 Feature not found`

### Tạo feature

```http
POST /features
Content-Type: application/json
```

Body:

```json
{
  "key": "environment_checks",
  "kind": "section",
  "label": "Nhiệt độ/độ ẩm",
  "group_name": "Kiểm tra môi trường",
  "default_order": 10
}
```

Quy tắc:

- `key`, `kind`, `label` là bắt buộc, phải là chuỗi không rỗng.
- `key` phải là duy nhất.
- `group_name` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì feature không thuộc nhóm nào.
- `default_order` không bắt buộc; nếu không gửi thì nhận giá trị `0`.

Response là feature vừa tạo, bao gồm `id`, `created_at` và `updated_at`.

Lỗi thường gặp:

- `400 key is required`, `400 kind is required`, `400 label is required`
- `400 group_name must be a string`
- `400 default_order must be an integer`
- `409 Feature key already exists`

### Cập nhật feature

```http
PUT /features/:id
Content-Type: application/json
```

Chỉ gửi các field cần thay đổi. Ví dụ:

```json
{
  "label": "Nhiệt độ/độ ẩm",
  "group_name": "Kiểm tra môi trường",
  "default_order": 10
}
```

Để bỏ nhóm, gửi:

```json
{
  "group_name": null
}
```

Nếu đổi `key`, key mới phải là duy nhất. `updated_at` được cập nhật tự động.

Lỗi thường gặp:

- `400 No update data provided`
- Các lỗi validate field giống API tạo
- `404 Feature not found`
- `409 Feature key already exists`

### Xóa feature

```http
DELETE /features/:id
```

Xóa vĩnh viễn feature. Các liên kết `item_features` của feature này cũng bị xóa theo cấu hình quan hệ DB.

Lỗi thường gặp:

- `404 Feature not found`

### Lấy action/view theo item

```http
GET /features/items/:item_code
GET /features/items/:item_code?includeDisabled=true
```

Mặc định chỉ trả về liên kết có `enabled = true`. Thêm `includeDisabled=true` để lấy cả liên kết đang tắt. `item_code` phải thuộc một item chưa bị xóa.

Response là mảng bản ghi `item_features`, kèm object `feature` và `item`. Giá trị `feature.group_name` có mặt trong object `feature`.

Ví dụ response rút gọn:

```json
[
  {
    "id": 12,
    "item_code": "TP00001",
    "feature_id": 1,
    "enabled": true,
    "order": null,
    "feature": {
      "id": 1,
      "key": "create_environment_check",
      "kind": "action",
      "label": "Nhập nhiệt độ/độ ẩm",
      "group_name": "Kiểm tra môi trường",
      "default_order": 10
    }
  }
]
```

Nếu `order` là `null`, frontend nên dùng `feature.default_order` làm thứ tự hiển thị.

Lỗi thường gặp:

- `404 Item not found`

### Lấy action/view theo item dạng config frontend

```http
GET /features/items/:item_code/config
GET /features/items/:item_code/config?includeDisabled=true
```

Response:

```json
{
  "item_code": "TP00001",
  "actions": [
    {
      "feature_id": 1,
      "key": "create_environment_check",
      "kind": "action",
      "label": "Nhập nhiệt độ/độ ẩm",
      "group_name": "Kiểm tra môi trường",
      "order": 10,
      "enabled": true
    }
  ],
  "sections": [
    {
      "feature_id": 2,
      "key": "environment_checks",
      "kind": "section",
      "label": "Nhiệt độ/độ ẩm",
      "group_name": "Kiểm tra môi trường",
      "order": 10,
      "enabled": true
    }
  ],
  "features": [
    {
      "feature_id": 1,
      "key": "create_environment_check",
      "kind": "action",
      "label": "Nhập nhiệt độ/độ ẩm",
      "group_name": "Kiểm tra môi trường",
      "order": 10,
      "enabled": true
    },
    {
      "feature_id": 2,
      "key": "environment_checks",
      "kind": "section",
      "label": "Nhiệt độ/độ ẩm",
      "group_name": "Kiểm tra môi trường",
      "order": 10,
      "enabled": true
    }
  ]
}
```

Ý nghĩa response:

- `features`: tất cả feature áp dụng cho item, sau khi lọc theo `includeDisabled`.
- `actions`: các phần tử trong `features` có `kind = "action"`.
- `sections`: các phần tử trong `features` có `kind = "section"`.
- `order`: ưu tiên `item_features.order`; khi giá trị này là `null`, API trả `feature.default_order`.
- `group_name`: nhóm của feature, có thể là `null`.

Lỗi thường gặp:

- `404 Item not found`

### Bật hoặc cập nhật feature cho item

```http
POST /features/items/:item_code
Content-Type: application/json
```

API tạo mới hoặc cập nhật liên kết `item_features` theo cặp `item_code` và feature. Body dùng một trong các field định danh `feature_id`/`featureId` hoặc `feature_key`/`featureKey`; nếu gửi cả ID và key, API ưu tiên ID.

```json
{
  "feature_key": "environment_checks",
  "enabled": true,
  "order": 10
}
```

Quy tắc:

- `feature_id` phải là số nguyên dương; `feature_key` phải là chuỗi không rỗng.
- `enabled` mặc định là `true`; chấp nhận `true`/`false`, `1`/`0`, hoặc chuỗi `"true"`/`"false"`/`"1"`/`"0"`.
- `order` không bắt buộc. Gửi `null` để sử dụng `default_order` của feature.
- `item_code` và feature phải tồn tại.

Response là bản ghi liên kết vừa tạo/cập nhật, kèm `feature` và `item`.

Lỗi thường gặp:

- `400 feature_id or feature_key is required`
- `400 feature_id must be a positive integer`
- `400 enabled must be a boolean`
- `400 order must be an integer`
- `404 Item not found`
- `404 Feature not found`

### Cập nhật liên kết item-feature

```http
PUT /features/items/:item_code/:feature_id
Content-Type: application/json
```

Chỉ gửi `enabled`, `order`, hoặc cả hai. Ví dụ:

```json
{
  "enabled": false,
  "order": 20
}
```

Gửi `"order": null` để quay về thứ tự mặc định của feature. Response là liên kết sau cập nhật, kèm `feature` và `item`.

Lỗi thường gặp:

- `400 No update data provided`
- `400 enabled must be a boolean`
- `400 order must be an integer`
- `404 Item not found`
- `404 Feature not found`
- `404 Item feature not found`

### Xóa liên kết item-feature

```http
DELETE /features/items/:item_code/:feature_id
```

Chỉ xóa liên kết giữa item và feature; không xóa item hoặc feature gốc. Response là liên kết vừa xóa, kèm `feature` và `item`.

Lỗi thường gặp:

- `404 Item not found`
- `404 Feature not found`
- `404 Item feature not found`

## Production Orders

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách lệnh sản xuất

```http
GET /production-orders
```

Response có thêm field `pyclm` dựa trên sampling request mới nhất, `samplingRecords` chứa dữ liệu lấy mẫu và `documentControl` chứa thông tin cấp/nhận hồ sơ, phiếu xuất kho, phiếu kiểm nghiệm.

### Lấy lệnh sản xuất thành phẩm

```http
GET /production-orders/finished-products
```

Response giống `GET /production-orders`, có thêm `pyclm`, `samplingRecords` và `documentControl`.

### Lấy lệnh sản xuất bán thành phẩm

```http
GET /production-orders/semi-finished-products
```

Response giống `GET /production-orders`, có thêm `pyclm`, `samplingRecords` và `documentControl`.

### Lấy chi tiết lệnh sản xuất

```http
GET /production-orders/:id
```

Response có thêm field `pyclm` dựa trên sampling request mới nhất, `samplingRecords` chứa dữ liệu lấy mẫu, `documentControl` chứa thông tin cấp/nhận hồ sơ và `featureConfig` dựa trên cấu hình action/view của `item_code`.

Ví dụ phần dữ liệu lấy mẫu trong response:

```json
{
  "id": 2031,
  "item_code": "TP00001",
  "pyclm": {
    "isSent": true,
    "status": "sent",
    "googleDocUrl": "https://docs.google.com/document/d/test",
    "sentAt": "2026-07-05T08:00:00.000Z",
    "location": "Kiem nghiem",
    "sender": {
      "id": 7,
      "username": "binh",
      "name": "Binh",
      "email": "binh@example.com",
      "department": "QA",
      "position": "Staff"
    },
    "latestSamplingRequest": {
      "id": 1,
      "production_order_id": 2031,
      "sender_id": 7,
      "location": "Kiem nghiem",
      "google_doc_url": "https://docs.google.com/document/d/test",
      "status": "sent",
      "sent_at": "2026-07-05T08:00:00.000Z"
    }
  },
  "samplingRecords": [
    {
      "id": 1,
      "production_order_id": 2031,
      "sampling_type": "Dinh ky",
      "quantity": "12.50",
      "unit": "mau",
      "created_by_id": 7,
      "created_at": "2026-07-05T08:10:00.000Z",
      "updated_at": "2026-07-05T08:10:00.000Z",
      "createdBy": {
        "id": 7,
        "username": "binh",
        "name": "Binh",
        "email": "binh@example.com",
        "department": "QA",
        "position": "Staff"
      }
    }
  ],
  "documentControl": {
    "id": 1,
    "production_order_id": 2031,
    "batch_record_issued_by_id": 5,
    "batch_record_issued_at": "2026-07-22T08:00:00.000Z",
    "batch_record_received_by_id": 8,
    "batch_record_received_at": "2026-07-22T09:00:00.000Z",
    "test_certificate_received_by_id": 9,
    "test_certificate_received_at": "2026-07-22T10:00:00.000Z",
    "warehouse_release_received_by_id": 10,
    "warehouse_release_received_at": "2026-07-22T11:00:00.000Z",
    "created_at": "2026-07-22T08:00:00.000Z",
    "updated_at": "2026-07-22T11:00:00.000Z",
    "deleted_at": null,
    "batchRecordIssuedBy": {
      "id": 5,
      "username": "qa01",
      "name": "Nguyen Van A",
      "email": "qa01@example.com",
      "department": "QA",
      "position": "Staff"
    },
    "batchRecordReceivedBy": {
      "id": 8,
      "username": "sx01",
      "name": "Tran Van B",
      "email": "sx01@example.com",
      "department": "Production",
      "position": "Staff"
    },
    "testCertificateReceivedBy": {
      "id": 9,
      "username": "sx02",
      "name": "Le Van C",
      "email": "sx02@example.com",
      "department": "Production",
      "position": "Staff"
    },
    "warehouseReleaseReceivedBy": {
      "id": 10,
      "username": "sx03",
      "name": "Pham Van D",
      "email": "sx03@example.com",
      "department": "Production",
      "position": "Staff"
    }
  }
}
```

`samplingRecords` được sắp xếp theo `created_at` mới nhất trước, sau đó `id` giảm dần. Nếu chưa có dữ liệu lấy mẫu, `samplingRecords` là mảng rỗng `[]`.
Nếu chưa có thông tin cấp/nhận chứng từ, `documentControl` là `null`.

Ví dụ `featureConfig`:

```json
{
  "featureConfig": {
    "item_code": "TP00001",
    "actions": [],
    "sections": [],
    "features": []
  }
}
```

### Lấy line của lệnh sản xuất từ SAP connector

```http
GET /production-orders/:id/production-order-lines
```

## SAP B1 Connector

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm route này proxy trực tiếp từ backend sang SAP B1 Service Layer bằng cấu hình môi trường `SAP_SERVICE_LAYER_URL`, `SAP_COMPANY_DB`, `SAP_USERNAME`, `SAP_PASSWORD`. Các API này trả dữ liệu SAP thô và không tự ghi vào database local, trừ các cron sync riêng của backend.

### Lấy danh sách item từ SAP

```http
GET /sap-b1-connector/items
```

Response: mảng item SAP lấy từ endpoint `Items`.

### Lấy danh sách lệnh sản xuất từ SAP

```http
GET /sap-b1-connector/production-orders
```

Response: mảng production order SAP lấy từ endpoint `ProductionOrders`.

Lưu ý: backend hiện đang gọi SAP với `$skip=1300` cho danh sách production orders.

### Lấy chi tiết một lệnh sản xuất từ SAP

```http
GET /sap-b1-connector/production-orders/:id
```

Ví dụ:

```http
GET /sap-b1-connector/production-orders/100
```

Response: object SAP từ endpoint `ProductionOrders(100)`, có thể bao gồm `ProductionOrderLines` và `ProductionOrdersStages`.

### Cập nhật một lệnh sản xuất trên SAP

```http
PATCH /sap-b1-connector/production-orders/:id
```

Body gửi các field SAP cần cập nhật.

Ví dụ cập nhật `Remarks`:

```json
{
  "Remarks": "SCB: 31/26/CBMP-BN. HT BTP lô 1180726"
}
```

Response:

```json
{
  "message": "Production order updated successfully",
  "productionOrder": {
    "id": 100,
    "item_code": "TP00666",
    "status": "boposReleased",
    "type": "bopotStandard",
    "planned_quatity": 10000,
    "remarks": "SCB: 31/26/CBMP-BN. HT BTP lô 1180726",
    "internal_notes": "..."
  }
}
```

Lưu ý: API này gọi trực tiếp SAP `PATCH ProductionOrders(:id)`. Sau khi SAP cập nhật thành công, backend gọi lại SAP `GET ProductionOrders(:id)` và upsert đúng lệnh sản xuất đó vào bảng `production_orders` local.

### Lấy danh sách đơn vị tính từ SAP

```http
GET /sap-b1-connector/unit-of-measurements
```

Response: mảng unit of measurement SAP lấy từ endpoint `UnitOfMeasurements`.

## Production Order Document Controls

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu trạng thái chứng từ theo quan hệ 1-1 với lệnh sản xuất. Mỗi `production_order_id` chỉ có tối đa một dòng trong bảng `production_order_document_controls`.

Các API `GET /production-orders`, `GET /production-orders/finished-products`, `GET /production-orders/semi-finished-products` và `GET /production-orders/:id` có include thêm field `documentControl`.

Ví dụ `documentControl`:

```json
{
  "id": 1,
  "production_order_id": 1001,
  "batch_record_issued_by_id": 5,
  "batch_record_issued_at": "2026-07-22T08:00:00.000Z",
  "batch_record_received_by_id": 8,
  "batch_record_received_at": "2026-07-22T09:00:00.000Z",
  "test_certificate_received_by_id": 9,
  "test_certificate_received_at": "2026-07-22T10:00:00.000Z",
  "warehouse_release_received_by_id": 10,
  "warehouse_release_received_at": "2026-07-22T11:00:00.000Z",
  "created_at": "2026-07-22T08:00:00.000Z",
  "updated_at": "2026-07-22T11:00:00.000Z",
  "deleted_at": null,
  "batchRecordIssuedBy": {
    "id": 5,
    "username": "qa01",
    "name": "Nguyen Van A",
    "email": "qa01@example.com",
    "department": "QA",
    "position": "Staff"
  },
  "batchRecordReceivedBy": {
    "id": 8,
    "username": "sx01",
    "name": "Tran Van B",
    "email": "sx01@example.com",
    "department": "Production",
    "position": "Staff"
  },
  "testCertificateReceivedBy": {
    "id": 9,
    "username": "sx02",
    "name": "Le Van C",
    "email": "sx02@example.com",
    "department": "Production",
    "position": "Staff"
  },
  "warehouseReleaseReceivedBy": {
    "id": 10,
    "username": "sx03",
    "name": "Pham Van D",
    "email": "sx03@example.com",
    "department": "Production",
    "position": "Staff"
  }
}
```

Nếu chưa có dòng document control cho lệnh sản xuất, `documentControl` trả về `null`.

### Lấy trạng thái chứng từ của lệnh sản xuất

```http
GET /production-orders/:id/document-control
```

Response: object `documentControl` như ví dụ trên, hoặc `null` nếu chưa phát sinh thao tác chứng từ.

### Cấp hồ sơ lô giấy

```http
PATCH /production-orders/:id/document-control/issue-batch-record
```

Body: không cần gửi.

Backend tự ghi:

- `batch_record_issued_by_id`: user đang đăng nhập.
- `batch_record_issued_at`: thời điểm hiện tại.

Response: object `documentControl` sau khi cập nhật.

### Nhận hồ sơ lô giấy

```http
PATCH /production-orders/:id/document-control/receive-batch-record
```

Body: không cần gửi.

Backend tự ghi:

- `batch_record_received_by_id`: user đang đăng nhập.
- `batch_record_received_at`: thời điểm hiện tại.

Response: object `documentControl` sau khi cập nhật.

### Nhận phiếu kiểm nghiệm

```http
PATCH /production-orders/:id/document-control/receive-test-certificate
```

Body: không cần gửi.

Backend tự ghi:

- `test_certificate_received_by_id`: user đang đăng nhập.
- `test_certificate_received_at`: thời điểm hiện tại.

Response: object `documentControl` sau khi cập nhật.

### Nhận phiếu xuất kho

```http
PATCH /production-orders/:id/document-control/receive-warehouse-release
```

Body: không cần gửi.

Backend tự ghi:

- `warehouse_release_received_by_id`: user đang đăng nhập.
- `warehouse_release_received_at`: thời điểm hiện tại.

Response: object `documentControl` sau khi cập nhật.

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

### Export phiếu cân theo line

```http
POST /production-orders/:id/production-order-lines/weighing-ticket/export
```

Body có thể để `{}` để export tất cả line, hoặc lọc theo công đoạn giống API export phiếu xuất kho:

```json
{
  "stageIds": [1, 2, 3]
}
```

Các tên field được hỗ trợ: `stageId`, `stageIds`, `StageID`.

Response: file `.xlsx`.

### Export phiếu kiểm tra nguyên liệu sau cân theo line

```http
POST /production-orders/:id/production-order-lines/post-weighing-material-check/export
```

Body có thể để `{}` để export tất cả line, hoặc lọc theo công đoạn giống API export phiếu xuất kho:

```json
{
  "stageIds": [1, 2, 3]
}
```

Các tên field được hỗ trợ: `stageId`, `stageIds`, `StageID`.

Lưu ý: các line có cùng mã nguyên liệu `ItemNo` sẽ được gộp thành 1 dòng; backend cộng tổng `PlannedQuantity` và dùng tên nguyên liệu/đơn vị của dòng đầu tiên trong nhóm.

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

## Production Order Sampling Records

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu dữ liệu quá trình lấy mẫu của một lệnh sản xuất. Một lệnh sản xuất có thể có nhiều bản ghi lấy mẫu.

### Lấy danh sách dữ liệu lấy mẫu của lệnh sản xuất

```http
GET /production-orders/:id/sampling-records
```

Response sắp xếp theo `created_at` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "sampling_type": "Dinh ky",
    "quantity": "12.50",
    "unit": "mau",
    "created_by_id": 7,
    "created_at": "2026-07-05T08:10:00.000Z",
    "updated_at": "2026-07-05T08:10:00.000Z",
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

### Lấy một bản ghi lấy mẫu theo ID

```http
GET /production-orders/sampling-records/:recordId
```

Lỗi thường gặp:

- `404 Sampling record not found`

### Thêm dữ liệu lấy mẫu

```http
POST /production-orders/:id/sampling-records
```

Body:

```json
{
  "sampling_type": "Dinh ky",
  "quantity": 12.5,
  "unit": "mau"
}
```

Quy tắc:

- `sampling_type` bắt buộc, tối đa 100 ký tự.
- `quantity` bắt buộc, lưu dạng `DECIMAL(12, 2)` và phải lớn hơn `0`.
- Có thể gửi `quantity` dạng chuỗi, ví dụ `"12.50"` hoặc `"12,50"`.
- `unit` bắt buộc, tối đa 50 ký tự.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 sampling_type is required`
- `400 quantity must fit DECIMAL(12, 2) with up to 2 decimal places`
- `401 Authenticated user not found`

### Cập nhật dữ liệu lấy mẫu

```http
PATCH /production-orders/sampling-records/:recordId
```

Body: gửi một hoặc nhiều field cần đổi.

```json
{
  "sampling_type": "Dot xuat",
  "quantity": 10
}
```

Lỗi thường gặp:

- `404 Sampling record not found`
- `400 At least one field is required`

### Xóa dữ liệu lấy mẫu

```http
DELETE /production-orders/sampling-records/:recordId
```

Response trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Sampling record not found`

## Production Order Disinfectant Preparations

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu bảng pha chế chất sát khuẩn theo lệnh sản xuất. Một lệnh sản xuất có thể có nhiều bản ghi pha chế.

### Lấy danh sách pha chế chất sát khuẩn của lệnh sản xuất

```http
GET /production-orders/:id/disinfectant-preparations
```

Response sắp xếp theo `created_at` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "workshop_id": 2,
    "disinfectant_name": "Con 70",
    "purpose": "Sat khuan dung cu",
    "base_material_name": "Con 96",
    "base_material_content": "96.0000",
    "base_material_amount_l": "7.3000",
    "prepared_volume_l": "10.0000",
    "actual_concentration": "70.0000",
    "created_by_id": 7,
    "created_at": "2026-07-05T08:10:00.000Z",
    "updated_at": "2026-07-05T08:10:00.000Z",
    "workshop": {
      "id": 2,
      "code": "SX01",
      "name": "Xuong san xuat 1",
      "description": null,
      "address": null,
      "created_at": "2026-07-05T08:00:00.000Z",
      "updated_at": "2026-07-05T08:00:00.000Z",
      "deleted_at": null
    },
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

### Lấy một bản ghi pha chế theo ID

```http
GET /production-orders/disinfectant-preparations/:preparationId
```

Lỗi thường gặp:

- `404 Disinfectant preparation not found`

### Thêm bản ghi pha chế chất sát khuẩn

```http
POST /production-orders/:id/disinfectant-preparations
```

Body:

```json
{
  "workshop_id": 2,
  "disinfectant_name": "Con 70",
  "purpose": "Sat khuan dung cu",
  "base_material_name": "Con 96",
  "base_material_content": 96,
  "base_material_amount_l": 7.3,
  "prepared_volume_l": 10,
  "actual_concentration": 70
}
```

Quy tắc:

- `workshop_id` bắt buộc, phải tồn tại trong bảng xưởng sản xuất.
- `disinfectant_name` bắt buộc, tối đa 255 ký tự.
- `purpose` bắt buộc.
- `base_material_name` bắt buộc, tối đa 255 ký tự.
- `base_material_content` bắt buộc, lưu dạng `DECIMAL(10, 4)` và phải lớn hơn `0`.
- `base_material_amount_l` bắt buộc, lưu dạng `DECIMAL(12, 4)`, phải lớn hơn `0`, đơn vị luôn là lít.
- `prepared_volume_l` bắt buộc, lưu dạng `DECIMAL(12, 4)`, phải lớn hơn `0`, đơn vị luôn là lít.
- `actual_concentration` bắt buộc, lưu dạng `DECIMAL(10, 4)` và phải lớn hơn `0`.
- Các field số có thể gửi dạng chuỗi, ví dụ `"7.3000"` hoặc `"7,3000"`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `404 Production workshop not found`
- `400 disinfectant_name is required`
- `400 base_material_amount_l must fit DECIMAL(12, 4) with up to 4 decimal places`
- `401 Authenticated user not found`

### Cập nhật bản ghi pha chế chất sát khuẩn

```http
PATCH /production-orders/disinfectant-preparations/:preparationId
```

Body: gửi một hoặc nhiều field cần đổi.

```json
{
  "actual_concentration": 71
}
```

Lỗi thường gặp:

- `404 Disinfectant preparation not found`
- `404 Production workshop not found`
- `400 At least one field is required`

### Xóa bản ghi pha chế chất sát khuẩn

```http
DELETE /production-orders/disinfectant-preparations/:preparationId
```

Response trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Disinfectant preparation not found`

## Production Order Steam Sterilization Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu bảng theo dõi quá trình hấp theo lệnh sản xuất. Một lệnh sản xuất có thể có nhiều bản ghi theo dõi hấp.

### Lấy danh sách theo dõi quá trình hấp của lệnh sản xuất

```http
GET /production-orders/:id/steam-sterilization-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "equipment_name": "Noi hap 1",
    "setting_temperature": "121.50",
    "setting_time": 30,
    "configuration_image_path": "/production-orders/steam-sterilization-checks/images/config.jpg",
    "indicator_image_path": "/production-orders/steam-sterilization-checks/images/indicator.jpg",
    "reached_temperature_image_path": "/production-orders/steam-sterilization-checks/images/reached.jpg",
    "created_by_id": 7,
    "checked_by_id": 8,
    "checked_at": "2026-07-06T08:00:00.000Z",
    "created_at": "2026-07-06T08:10:00.000Z",
    "updated_at": "2026-07-06T08:10:00.000Z",
    "createdBy": {
      "id": 7,
      "username": "binh",
      "name": "Binh",
      "email": "binh@example.com",
      "department": "QA",
      "position": "Staff"
    },
    "checkedBy": {
      "id": 8,
      "username": "qa",
      "name": "QA",
      "email": "qa@example.com",
      "department": "QA",
      "position": "Checker"
    }
  }
]
```

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo dõi quá trình hấp theo ID

```http
GET /production-orders/steam-sterilization-checks/:checkId
```

Lỗi thường gặp:

- `404 Steam sterilization check not found`

### Xem ảnh theo dõi quá trình hấp

```http
GET /production-orders/steam-sterilization-checks/images/:filename
```

API này trả về file ảnh đã upload nếu file đang được tham chiếu bởi một trong 3 field ảnh của bảng hấp.

Lỗi thường gặp:

- `404 Steam sterilization check image not found`

### Thêm bản ghi theo dõi quá trình hấp

```http
POST /production-orders/:id/steam-sterilization-checks
```

Body có thể gửi `application/json` nếu không upload ảnh, hoặc `multipart/form-data` nếu có ảnh.

Body JSON mẫu:

```json
{
  "equipment_name": "Noi hap 1",
  "setting_temperature": 121.5,
  "setting_time": 30,
  "checked_by_id": 8,
  "checked_at": "2026-07-06T08:00:00.000Z"
}
```

File fields khi dùng `multipart/form-data`:

- `configuration_image`: hình ảnh cấu hình, tối đa 1 file.
- `indicator_image`: hình ảnh chỉ thị, tối đa 1 file.
- `reached_temperature_image`: hình ảnh đạt nhiệt, tối đa 1 file.

Quy tắc:

- `created_by_id` bắt buộc và lấy từ user đăng nhập, frontend không gửi field này.
- `equipment_name`, `setting_temperature`, `setting_time`, `checked_by_id`, `checked_at` đều không bắt buộc.
- `setting_temperature` nếu gửi thì lưu dạng `DECIMAL(8, 2)` và phải lớn hơn `0`.
- `setting_time` nếu gửi thì phải là số nguyên dương.
- `checked_by_id` nếu gửi thì phải tồn tại trong bảng `users`.
- Ảnh chỉ nhận JPG, PNG, WEBP hoặc GIF, tối đa 20 MB/file.

Lỗi thường gặp:

- `404 Production order not found`
- `404 User not found`
- `400 setting_temperature must fit DECIMAL(8, 2) with up to 2 decimal places`
- `400 setting_time must be a positive integer`
- `401 Authenticated user not found`

### Cập nhật bản ghi theo dõi quá trình hấp

```http
PATCH /production-orders/steam-sterilization-checks/:checkId
```

Body: gửi một hoặc nhiều field cần đổi. Có thể dùng `application/json` hoặc `multipart/form-data` nếu cần thay ảnh.

Body JSON mẫu:

```json
{
  "setting_temperature": 122,
  "setting_time": null,
  "checked_by_id": 8
}
```

File fields khi dùng `multipart/form-data` giống API thêm mới. Nếu upload ảnh mới, path ảnh cũ của field đó sẽ được thay thế và file cũ sẽ bị xóa.

Lỗi thường gặp:

- `404 Steam sterilization check not found`
- `404 User not found`
- `400 At least one field is required`

### Xóa bản ghi theo dõi quá trình hấp

```http
DELETE /production-orders/steam-sterilization-checks/:checkId
```

Response trả về bản ghi vừa xóa. Các file ảnh đang được tham chiếu bởi bản ghi cũng sẽ bị xóa.

Lỗi thường gặp:

- `404 Steam sterilization check not found`

## Production Order Filtration Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu kiểm tra quá trình lọc theo lệnh sản xuất. `:id` là ID lệnh sản xuất (ID sản phẩm đang thực hiện). `filter_membrane_id` tham chiếu `filter_catalogs.id`; các trường người thực hiện tham chiếu `users.id`.

### Lấy danh sách kiểm tra quá trình lọc

```http
GET /production-orders/:id/filtration-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "filter_position": "Bồn pha chế số 1",
    "filter_membrane_id": 3,
    "pre_filter_appearance_requirement": "Màng sạch, không rách",
    "pre_filter_appearance_result": "Đạt",
    "pre_sterilization_integrity_requirement": "Không rò rỉ",
    "pre_sterilization_integrity_result": "Đạt",
    "sterilized_by_id": 7,
    "rinse_water_volume_liters": "20.000",
    "filtering_started_at": "2026-08-06T08:00:00.000Z",
    "filtering_finished_at": "2026-08-06T09:00:00.000Z",
    "filtered_by_id": 8,
    "tank_residual_volume_liters": "1.500",
    "post_filter_integrity_requirement": "Không rò rỉ",
    "post_filter_integrity_result": "Đạt",
    "post_filter_membrane_appearance_requirement": "Không biến dạng",
    "post_filter_membrane_appearance_result": "Đạt",
    "inspected_after_filter_by_id": 9,
    "created_at": "2026-08-06T09:10:00.000Z",
    "updated_at": "2026-08-06T09:10:00.000Z",
    "filterMembrane": {
      "id": 3,
      "filter_code": "LOC-003",
      "filter_type": "Màng lọc"
    },
    "productionOrder": {
      "id": 2031,
      "item_code": "SP-001",
      "item": {
        "item_name": "Tên sản phẩm"
      }
    },
    "sterilizedBy": {
      "id": 7,
      "username": "operator1",
      "name": "Nguyễn Văn A"
    },
    "filteredBy": {
      "id": 8,
      "username": "operator2",
      "name": "Trần Văn B"
    },
    "inspectedAfterFilterBy": {
      "id": 9,
      "username": "qa1",
      "name": "Lê Văn C"
    }
  }
]
```

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi kiểm tra lọc theo ID

```http
GET /production-orders/filtration-checks/:checkId
```

Lỗi thường gặp:

- `404 Filtration check not found`

### Thêm bản ghi kiểm tra lọc

```http
POST /production-orders/:id/filtration-checks
Content-Type: application/json
```

Body mẫu:

```json
{
  "filter_position": "Bồn pha chế số 1",
  "filter_membrane_id": 3,
  "pre_filter_appearance_requirement": "Màng sạch, không rách",
  "pre_filter_appearance_result": "Đạt",
  "pre_sterilization_integrity_requirement": "Không rò rỉ",
  "pre_sterilization_integrity_result": "Đạt",
  "sterilized_by_id": 7,
  "rinse_water_volume_liters": 20,
  "filtering_started_at": "2026-08-06T08:00:00.000Z",
  "filtering_finished_at": "2026-08-06T09:00:00.000Z",
  "filtered_by_id": 8,
  "tank_residual_volume_liters": 1.5,
  "post_filter_integrity_requirement": "Không rò rỉ",
  "post_filter_integrity_result": "Đạt",
  "post_filter_membrane_appearance_requirement": "Không biến dạng",
  "post_filter_membrane_appearance_result": "Đạt",
  "inspected_after_filter_by_id": 9
}
```

Quy tắc:

- Tất cả field trong body không bắt buộc; không gửi, gửi `null`, hoặc chuỗi rỗng sẽ được lưu là `null`.
- `created_at` và `updated_at` được backend tự tạo/cập nhật; frontend không gửi hai field này.
- `filter_membrane_id`, `sterilized_by_id`, `filtered_by_id`, `inspected_after_filter_by_id` nếu gửi phải là số nguyên dương và tồn tại trong bảng liên quan.
- `rinse_water_volume_liters` và `tank_residual_volume_liters` là số không âm, tối đa 3 chữ số thập phân.
- `filtering_started_at` và `filtering_finished_at` dùng định dạng ISO 8601 hợp lệ.

Lỗi thường gặp:

- `404 Production order not found`
- `404 Filter membrane not found`
- `404 <user field> user not found`
- `400 <field> must be a positive integer`

### Cập nhật bản ghi kiểm tra lọc

```http
PATCH /production-orders/filtration-checks/:checkId
Content-Type: application/json
```

Body chỉ gửi các field muốn cập nhật. Ví dụ:

```json
{
  "filtering_finished_at": "2026-08-06T09:15:00.000Z",
  "tank_residual_volume_liters": 1.25,
  "post_filter_integrity_result": "Đạt"
}
```

Gửi `null` hoặc chuỗi rỗng để xóa giá trị của một field.

Lỗi thường gặp:

- `404 Filtration check not found`
- `404 Filter membrane not found`
- `404 <user field> user not found`
- `400 At least one field is required`

### Xóa bản ghi kiểm tra lọc

```http
DELETE /production-orders/filtration-checks/:checkId
```

Response trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Filtration check not found`

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

### Lấy một bản ghi nhiệt độ/độ ẩm theo ID

```http
GET /production-orders/environment-checks/:checkId
```

Response mẫu:

```json
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
```

Lỗi thường gặp:

- `404 Environment check not found`

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

### Sửa dữ liệu nhiệt độ/độ ẩm

```http
PATCH /production-orders/environment-checks/:checkId
```

Body hỗ trợ sửa từng phần:

```json
{
  "room": "Phong dong goi 1",
  "temperature_c": 26.25,
  "humidity_percent": 58.5,
  "checked_at": "2026-06-12T08:00:00.000Z"
}
```

Quy tắc:

- Cần gửi ít nhất một field trong các field `room`, `temperature_c`, `humidity_percent`, `checked_at`.
- Nếu gửi `room` thì không được rỗng.
- Nếu gửi `temperature_c` thì lưu dạng `DECIMAL(5, 2)`.
- Nếu gửi `humidity_percent` thì lưu dạng `DECIMAL(5, 2)`, giá trị từ `0` đến `100`.
- Có thể gửi số dạng chuỗi, ví dụ `"26.25"` hoặc `"26,25"`.

Lỗi thường gặp:

- `404 Environment check not found`
- `400 At least one field is required`
- `400 room is required`
- `400 humidity_percent must be less than or equal to 100`

### Xoá dữ liệu nhiệt độ/độ ẩm

```http
DELETE /production-orders/environment-checks/:checkId
```

Response trả về bản ghi vừa xoá.

Lỗi thường gặp:

- `404 Environment check not found`

## Production Order Hygiene Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu bảng kiểm tra vệ sinh phụ thuộc lệnh sản xuất. Một lệnh sản xuất có thể có nhiều bản ghi kiểm tra vệ sinh.

### Lấy danh sách kiểm tra vệ sinh của lệnh sản xuất

```http
GET /production-orders/:id/hygiene-checks
```

Response sắp xếp theo `created_at` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "room_or_equipment": "Phong pha che 1",
    "cleaning_type": "Ve sinh dinh ky",
    "result": "Dat",
    "note": null,
    "created_by_id": 7,
    "created_at": "2026-07-26T08:10:00.000Z",
    "updated_at": "2026-07-26T08:10:00.000Z",
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

### Lấy một bản ghi kiểm tra vệ sinh theo ID

```http
GET /production-orders/hygiene-checks/:checkId
```

Lỗi thường gặp:

- `404 Hygiene check not found`

### Thêm dữ liệu kiểm tra vệ sinh

```http
POST /production-orders/:id/hygiene-checks
```

Body:

```json
{
  "room_or_equipment": "Phong pha che 1",
  "cleaning_type": "Ve sinh dinh ky",
  "result": "Dat",
  "note": "Khong"
}
```

Quy tắc:

- `room_or_equipment` bắt buộc, tối đa 255 ký tự.
- `cleaning_type` bắt buộc, tối đa 100 ký tự.
- `result` bắt buộc, tối đa 100 ký tự.
- `note` tùy chọn; gửi rỗng sẽ lưu `null`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 room_or_equipment is required`
- `400 At least one field is required`
- `401 Authenticated user not found`

### Cập nhật dữ liệu kiểm tra vệ sinh

```http
PATCH /production-orders/hygiene-checks/:checkId
```

Body: gửi một hoặc nhiều field cần đổi.

```json
{
  "result": "Khong dat",
  "note": "Can ve sinh lai"
}
```

Lỗi thường gặp:

- `404 Hygiene check not found`
- `400 At least one field is required`

### Xóa dữ liệu kiểm tra vệ sinh

```http
DELETE /production-orders/hygiene-checks/:checkId
```

Response trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Hygiene check not found`

## Production Order Density Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách kiểm tra tỉ trọng của lệnh sản xuất

```http
GET /production-orders/:id/density-checks
```

Response sắp xếp theo `created_at` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "empty_pycnometer_mass_g": "25.0000",
    "solution_pycnometer_mass_g": "75.0000",
    "water_pycnometer_mass_g": "75.5000",
    "density": "0.990099",
    "apparent_density": "0.650000",
    "created_by_id": 7,
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

### Lấy một bản ghi tỉ trọng theo ID

```http
GET /production-orders/density-checks/:checkId
```

Lỗi thường gặp:

- `404 Density check not found`

### Thêm dữ liệu tỉ trọng

```http
POST /production-orders/:id/density-checks
```

Body:

```json
{
  "empty_pycnometer_mass_g": 25,
  "solution_pycnometer_mass_g": 75,
  "water_pycnometer_mass_g": 75.5,
  "apparent_density": 0.65
}
```

Quy tắc:

- Các khối lượng là bắt buộc, lưu dạng `DECIMAL(12, 4)`.
- Có thể gửi số dạng chuỗi, ví dụ `"25.0000"` hoặc `"25,0000"`.
- `solution_pycnometer_mass_g` phải lớn hơn `empty_pycnometer_mass_g`.
- `water_pycnometer_mass_g` phải lớn hơn `empty_pycnometer_mass_g`.
- Backend tự tính và lưu `density`; frontend không gửi field này.
- Công thức: `(solution_pycnometer_mass_g - empty_pycnometer_mass_g) / (water_pycnometer_mass_g - empty_pycnometer_mass_g)`.
- `apparent_density` là tỉ trọng biểu kiến, frontend có thể gửi hoặc bỏ trống. Nếu gửi thì phải lớn hơn `0`, lưu dạng `DECIMAL(12, 6)`, tối đa 6 chữ số sau dấu phẩy.
- Thời điểm kiểm tra là `created_at`, lấy theo thời điểm tạo bản ghi.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 empty_pycnometer_mass_g is required`
- `400 water_pycnometer_mass_g must be greater than empty_pycnometer_mass_g`
- `400 apparent_density must fit DECIMAL(12, 6) with up to 6 decimal places`
- `400 apparent_density must be greater than 0`
- `401 Authenticated user not found`

### Cập nhật dữ liệu tỉ trọng

```http
PATCH /production-orders/density-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "solution_pycnometer_mass_g": 76,
  "apparent_density": 0.7
}
```

Quy tắc:

- Có thể sửa `empty_pycnometer_mass_g`, `solution_pycnometer_mass_g`, `water_pycnometer_mass_g`, `apparent_density`, hoặc kết hợp các field này.
- Giá trị gửi lên validate giống API tạo.
- Backend tự tính lại và lưu `density` sau khi cập nhật; frontend không gửi field này.
- Nếu chỉ sửa một khối lượng, backend dùng các khối lượng còn lại đang có trong DB để tính lại `density`.
- Nếu chỉ sửa `apparent_density`, backend không tính lại `density`. Gửi `null` hoặc chuỗi rỗng để xoá giá trị tỉ trọng biểu kiến.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 empty_pycnometer_mass_g is required`
- `400 solution_pycnometer_mass_g must be greater than empty_pycnometer_mass_g`
- `400 water_pycnometer_mass_g must be greater than empty_pycnometer_mass_g`
- `400 apparent_density must fit DECIMAL(12, 6) with up to 6 decimal places`
- `400 apparent_density must be greater than 0`
- `404 Density check not found`

### Xóa dữ liệu tỉ trọng

```http
DELETE /production-orders/density-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Density check not found`

## Production Order Friability Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này dùng để lưu kiểm tra độ mài mòn của viên theo từng lệnh sản xuất. Frontend gửi khối lượng trước và sau kiểm tra, backend tự tính phần trăm độ mài mòn.

### Lấy danh sách kiểm tra độ mài mòn của lệnh sản xuất

```http
GET /production-orders/:id/friability-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "total_weight_before_check": "1000.000",
    "total_weight_after_check": "990.000",
    "weight_unit": "mg",
    "friability_percent": "1.0000",
    "created_by_id": 7,
    "created_at": "2026-06-28T08:10:00.000Z",
    "updated_at": "2026-06-28T08:10:00.000Z",
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

### Lấy một bản ghi kiểm tra độ mài mòn theo ID

```http
GET /production-orders/friability-checks/:checkId
```

Lỗi thường gặp:

- `404 Friability check not found`

### Thêm dữ liệu kiểm tra độ mài mòn

```http
POST /production-orders/:id/friability-checks
```

Body:

```json
{
  "total_weight_before_check": 1000,
  "total_weight_after_check": 990
}
```

Quy tắc:

- Hai khối lượng là bắt buộc, lưu dạng `DECIMAL(12, 3)`.
- Đơn vị mặc định là `mg`, backend tự lưu `weight_unit = "mg"`.
- Có thể gửi số dạng chuỗi, ví dụ `"1000.000"` hoặc `"1000,000"`.
- `total_weight_after_check` phải nhỏ hơn hoặc bằng `total_weight_before_check`.
- Backend tự tính và lưu `friability_percent`; frontend không gửi field này.
- Công thức: `((total_weight_before_check - total_weight_after_check) / total_weight_before_check) * 100`.
- Thời điểm kiểm tra là `created_at`, lấy theo thời điểm tạo bản ghi.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 total_weight_before_check is required`
- `400 total_weight_after_check must be less than or equal to total_weight_before_check`
- `401 Authenticated user not found`

### Cập nhật dữ liệu kiểm tra độ mài mòn

```http
PATCH /production-orders/friability-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "total_weight_after_check": 980
}
```

Quy tắc:

- Có thể sửa `total_weight_before_check`, `total_weight_after_check`, hoặc cả hai.
- Giá trị gửi lên validate giống API tạo.
- Backend tự tính lại và lưu `friability_percent` sau khi cập nhật; frontend không gửi field này.
- Nếu chỉ sửa một khối lượng, backend dùng khối lượng còn lại đang có trong DB để tính lại `friability_percent`.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 total_weight_before_check is required`
- `400 total_weight_after_check must be less than or equal to total_weight_before_check`
- `404 Friability check not found`

### Xóa dữ liệu kiểm tra độ mài mòn

```http
DELETE /production-orders/friability-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Friability check not found`

## Production Order Spray Dose Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này dùng để lưu kiểm tra số lượng liều xịt của sản phẩm theo từng lệnh sản xuất. Frontend gửi yêu cầu và số liều xịt của 6 lọ, backend tự lưu người kiểm tra từ user đăng nhập.

### Lấy danh sách kiểm tra số lượng liều xịt của lệnh sản xuất

```http
GET /production-orders/:id/spray-dose-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "90 - 110 liều",
    "bottle_1_spray_dose_count": 120,
    "bottle_2_spray_dose_count": 121,
    "bottle_3_spray_dose_count": 122,
    "bottle_4_spray_dose_count": 123,
    "bottle_5_spray_dose_count": 124,
    "bottle_6_spray_dose_count": 125,
    "unit": "dose",
    "created_by_id": 7,
    "created_at": "2026-06-29T08:10:00.000Z",
    "updated_at": "2026-06-29T08:10:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi kiểm tra số lượng liều xịt theo ID

```http
GET /production-orders/spray-dose-checks/:checkId
```

Lỗi thường gặp:

- `404 Spray dose check not found`

### Thêm dữ liệu kiểm tra số lượng liều xịt

```http
POST /production-orders/:id/spray-dose-checks
```

Body:

```json
{
  "requirement": "90 - 110 liều",
  "bottle_1_spray_dose_count": 120,
  "bottle_2_spray_dose_count": 121,
  "bottle_3_spray_dose_count": 122,
  "bottle_4_spray_dose_count": 123,
  "bottle_5_spray_dose_count": 124,
  "bottle_6_spray_dose_count": 125
}
```

Quy tắc:

- `requirement` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- Nếu `requirement` có chữ `dose`, backend tự chuẩn hóa thành `liều`, ví dụ `90 - 110 dose` lưu thành `90 - 110 liều`.
- `bottle_1_spray_dose_count` là bắt buộc, lưu dạng `INTEGER`.
- `bottle_2_spray_dose_count` đến `bottle_6_spray_dose_count` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- Có thể gửi số dạng chuỗi, ví dụ `"120"`.
- Các số liều xịt khi có giá trị phải là số nguyên dương.
- Đơn vị mặc định là `dose`, backend tự lưu `unit = "dose"`.
- Thời điểm kiểm tra là `created_at`, lấy theo thời điểm tạo bản ghi.
- `created_by_id` là người kiểm tra, lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 bottle_1_spray_dose_count is required`
- `400 bottle_6_spray_dose_count must be a positive integer`
- `400 requirement must be a string`
- `401 Authenticated user not found`

### Cập nhật kiểm tra số lượng liều xịt

```http
PATCH /production-orders/spray-dose-checks/:checkId
```

Body: gửi các field cần đổi.

```json
{
  "requirement": "95 - 105 liều",
  "bottle_2_spray_dose_count": null,
  "bottle_6_spray_dose_count": 126
}
```

Quy tắc:

- Có thể cập nhật `requirement` và `bottle_1_spray_dose_count` đến `bottle_6_spray_dose_count`.
- `requirement` và `bottle_2_spray_dose_count` đến `bottle_6_spray_dose_count` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `bottle_1_spray_dose_count` không được xóa vì là giá trị bắt buộc.
- Các số liều xịt khi có giá trị phải là số nguyên dương.

Lỗi thường gặp:

- `404 Spray dose check not found`
- `400 At least one field is required`
- `400 bottle_1_spray_dose_count is required`
- `400 bottle_6_spray_dose_count must be a positive integer`
- `400 requirement must be a string`

### Xóa kiểm tra số lượng liều xịt

```http
DELETE /production-orders/spray-dose-checks/:checkId
```

API này xóa cứng bản ghi kiểm tra số lượng liều xịt.

Lỗi thường gặp:

- `404 Spray dose check not found`

## Production Order Post-Homogenization Granule Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này dùng để lưu phiếu kiểm tra cốm sau đồng nhất theo từng lệnh sản xuất. Frontend gửi khối lượng riêng thô và khối lượng riêng gõ, backend tự tính chỉ số Carr.

### Lấy danh sách kiểm tra cốm sau đồng nhất của lệnh sản xuất

```http
GET /production-orders/:id/post-homogenization-granule-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "bulk_density": "0.520000",
    "tapped_density": "0.680000",
    "density_unit": "g/ml",
    "image_path": "/production-orders/post-homogenization-granule-checks/images/com-sau-dong-nhat.jpg",
    "carr_index": "23.5294",
    "created_by_id": 7,
    "created_at": "2026-06-29T08:10:00.000Z",
    "updated_at": "2026-06-29T08:10:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi kiểm tra cốm sau đồng nhất theo ID

```http
GET /production-orders/post-homogenization-granule-checks/:checkId
```

Lỗi thường gặp:

- `404 Post-homogenization granule check not found`

### Lấy ảnh kiểm tra cốm sau đồng nhất

```http
GET /production-orders/post-homogenization-granule-checks/images/:filename
```

Lỗi thường gặp:

- `404 Post-homogenization granule check image not found`

### Thêm dữ liệu kiểm tra cốm sau đồng nhất

```http
POST /production-orders/:id/post-homogenization-granule-checks
```

Body JSON nếu không gửi ảnh:

```json
{
  "bulk_density": 0.52,
  "tapped_density": 0.68
}
```

Nếu có ảnh, gửi `multipart/form-data`:

- `bulk_density`: `0.52`
- `tapped_density`: `0.68`
- `granule_image` hoặc `image`: file ảnh, tối đa 1 file

Quy tắc:

- `bulk_density` và `tapped_density` là bắt buộc, lưu dạng `DECIMAL(12, 6)`.
- Đơn vị mặc định là `g/ml`, backend tự lưu `density_unit = "g/ml"`.
- Có thể gửi số dạng chuỗi, ví dụ `"0.520000"` hoặc `"0,520000"`.
- `tapped_density` phải lớn hơn hoặc bằng `bulk_density`.
- Backend tự tính và lưu `carr_index`; frontend không gửi field này.
- Công thức: `((tapped_density - bulk_density) / tapped_density) * 100`.
- `image_path` được lưu tự động khi frontend gửi ảnh.
- Thời điểm kiểm tra là `created_at`, lấy theo thời điểm tạo bản ghi.
- `created_by_id` là người kiểm tra, lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 bulk_density is required`
- `400 tapped_density must be greater than or equal to bulk_density`
- `400 image must be a JPG, PNG, WEBP, or GIF image`
- `401 Authenticated user not found`

### Cập nhật kiểm tra cốm sau đồng nhất

```http
PATCH /production-orders/post-homogenization-granule-checks/:checkId
```

Body JSON nếu không đổi ảnh:

```json
{
  "tapped_density": 0.7
}
```

Nếu có ảnh mới, gửi `multipart/form-data`:

- `bulk_density`: `0.52`
- `tapped_density`: `0.70`
- `granule_image` hoặc `image`: file ảnh, tối đa 1 file

Quy tắc:

- Có thể cập nhật `bulk_density`, `tapped_density`, và ảnh kiểm tra.
- Gửi ít nhất một field hoặc một ảnh mới.
- Nếu chỉ cập nhật một tỷ trọng, backend dùng tỷ trọng còn lại trên bản ghi hiện có để tính lại `carr_index`.
- `bulk_density` và `tapped_density` khi gửi phải là số thập phân hợp lệ `DECIMAL(12, 6)` và lớn hơn `0`.
- `tapped_density` phải lớn hơn hoặc bằng `bulk_density`.
- Nếu gửi ảnh mới, backend cập nhật `image_path` và xóa file ảnh cũ nếu có.

Lỗi thường gặp:

- `404 Post-homogenization granule check not found`
- `400 At least one field is required`
- `400 bulk_density is required`
- `400 tapped_density must be greater than or equal to bulk_density`
- `400 image must be a JPG, PNG, WEBP, or GIF image`

### Xóa kiểm tra cốm sau đồng nhất

```http
DELETE /production-orders/post-homogenization-granule-checks/:checkId
```

API này xóa cứng bản ghi kiểm tra cốm sau đồng nhất và xóa file ảnh đã lưu nếu có.

Lỗi thường gặp:

- `404 Post-homogenization granule check not found`

## Production Order Post-Preparation Solution Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu kiểm tra dịch sau pha chế theo từng lệnh sản xuất. Tất cả thông tin nghiệp vụ đều không bắt buộc.

### Lấy danh sách kiểm tra dịch sau pha chế của lệnh sản xuất

```http
GET /production-orders/:id/post-preparation-solution-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "final_volume_image_path": "/production-orders/post-preparation-solution-checks/images/the-tich-cuoi.jpg",
    "solution_color": "Vàng nhạt",
    "solution_image_path": "/production-orders/post-preparation-solution-checks/images/dich-sau-pha-che.jpg",
    "solution_clarity": "Trong",
    "solution_ph": "6.50",
    "checked_by_id": 7,
    "created_at": "2026-07-15T08:10:00.000Z",
    "updated_at": "2026-07-15T08:10:00.000Z",
    "checkedBy": {
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi kiểm tra dịch sau pha chế theo ID

```http
GET /production-orders/post-preparation-solution-checks/:checkId
```

Lỗi thường gặp:

- `404 Post-preparation solution check not found`

### Lấy ảnh kiểm tra dịch sau pha chế

```http
GET /production-orders/post-preparation-solution-checks/images/:filename
```

Lỗi thường gặp:

- `404 Post-preparation solution check image not found`

### Thêm kiểm tra dịch sau pha chế

```http
POST /production-orders/:id/post-preparation-solution-checks
```

Body JSON nếu không gửi ảnh:

```json
{
  "solution_color": "Vàng nhạt",
  "solution_clarity": "Trong",
  "solution_ph": 6.5,
  "checked_by_id": 7
}
```

Nếu có ảnh, gửi `multipart/form-data`:

- `solution_color`: `Vàng nhạt`
- `solution_clarity`: `Trong`
- `solution_ph`: `6.5`
- `checked_by_id`: `7`
- `final_volume_image`: file ảnh thể tích cuối
- `solution_image`: file ảnh dịch

Quy tắc:

- Tất cả field nghiệp vụ đều không bắt buộc.
- `solution_color` và `solution_clarity` lưu dạng text; gửi `null` hoặc chuỗi rỗng thì lưu `null`.
- `solution_ph` không bắt buộc, lưu dạng `DECIMAL(5, 2)`, tối đa 2 chữ số sau dấu phẩy và phải nằm trong khoảng `0` đến `14`.
- `checked_by_id` không bắt buộc; nếu gửi thì phải tồn tại trong bảng `users`.
- Ảnh phải là JPG, PNG, WEBP hoặc GIF.

Lỗi thường gặp:

- `404 Production order not found`
- `404 Checked user not found`
- `400 solution_color must be a string`
- `400 solution_ph must fit DECIMAL(5, 2) with up to 2 decimal places`
- `400 solution_ph must be between 0 and 14`
- `400 image must be a JPG, PNG, WEBP, or GIF image`

### Cập nhật kiểm tra dịch sau pha chế

```http
PATCH /production-orders/post-preparation-solution-checks/:checkId
```

Body JSON nếu không đổi ảnh:

```json
{
  "solution_clarity": "Trong, không có cặn",
  "solution_ph": null
}
```

Nếu có ảnh mới, gửi `multipart/form-data` với các field tương tự API tạo.

Quy tắc:

- Có thể cập nhật `solution_color`, `solution_clarity`, `solution_ph`, `checked_by_id`, `final_volume_image`, `solution_image`.
- Gửi ít nhất một field hoặc một ảnh mới.
- `solution_color`, `solution_clarity`, `solution_ph`, `checked_by_id` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- Nếu gửi ảnh mới, backend cập nhật đường dẫn ảnh tương ứng và xóa file ảnh cũ nếu có.

Lỗi thường gặp:

- `404 Post-preparation solution check not found`
- `404 Checked user not found`
- `400 At least one field is required`
- `400 solution_ph must fit DECIMAL(5, 2) with up to 2 decimal places`
- `400 solution_ph must be between 0 and 14`
- `400 image must be a JPG, PNG, WEBP, or GIF image`

### Xóa kiểm tra dịch sau pha chế

```http
DELETE /production-orders/post-preparation-solution-checks/:checkId
```

API này xóa cứng bản ghi kiểm tra dịch sau pha chế và xóa file ảnh đã lưu nếu có.

Lỗi thường gặp:

- `404 Post-preparation solution check not found`

## Production Order Disintegration Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này dùng để tạo phiếu kiểm tra độ rã cho từng đơn vị kiểm tra thuộc một lệnh sản xuất. Kết quả từng đơn vị được lưu dạng boolean:

- `true` = Đạt
- `false` = Không đạt

### Lấy danh sách kiểm tra độ rã của lệnh sản xuất

```http
GET /production-orders/:id/disintegration-checks
```

Response sắp xếp theo `checked_at` mới nhất trước, sau đó `created_at` và `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Thời gian rã không quá 15 phút",
    "dosage_form_stage": "film_coated_tablet",
    "unit_1_passed": true,
    "unit_2_passed": true,
    "unit_3_passed": true,
    "unit_4_passed": true,
    "unit_5_passed": true,
    "unit_6_passed": false,
    "created_by_id": 7,
    "checked_at": "2026-06-17T08:00:00.000Z",
    "created_at": "2026-06-17T08:00:00.000Z",
    "updated_at": "2026-06-17T08:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một phiếu kiểm tra độ rã theo ID

```http
GET /production-orders/disintegration-checks/:checkId
```

Lỗi thường gặp:

- `404 Disintegration check not found`

### Thêm dữ liệu kiểm tra độ rã

```http
POST /production-orders/:id/disintegration-checks
```

Body:

```json
{
  "requirement": "Thời gian rã không quá 15 phút",
  "dosage_form_stage": "film_coated_tablet",
  "unit_1_passed": "Đạt"
}
```

Quy tắc:

- `dosage_form_stage` bắt buộc và không được rỗng.
- `dosage_form_stage` có thể dùng các giá trị như `tablet`, `film_coated_tablet`, `capsule`.
- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- `unit_1_passed` bắt buộc.
- `unit_2_passed` đến `unit_6_passed` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- Các field `unit_*_passed` khi có giá trị có thể gửi boolean, `1`/`0`, hoặc chuỗi như `Đạt`, `Không đạt`, `dat`, `khong dat`, `pass`, `fail`.
- Backend normalize kết quả về boolean hoặc `null` trước khi lưu DB.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.
- `checked_at` lấy theo thời điểm tạo bản ghi.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
- `400 dosage_form_stage is required`
- `400 unit_1_passed is required`
- `400 unit_6_passed must be pass or fail`
- `401 Authenticated user not found`

### Cập nhật dữ liệu kiểm tra độ rã

```http
PATCH /production-orders/disintegration-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "requirement": "Thời gian rã không quá 15 phút",
  "dosage_form_stage": "film_coated_tablet",
  "unit_6_passed": null
}
```

Quy tắc validate và normalize giống API tạo. Với `unit_2_passed` đến `unit_6_passed` và `requirement`, gửi `null` hoặc chuỗi rỗng sẽ cập nhật field đó về `null`. Riêng `unit_1_passed` vẫn bắt buộc có giá trị hợp lệ nếu được gửi trong body.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `requirement`, `dosage_form_stage` và `unit_*_passed` giống API tạo.
- `404 Disintegration check not found`

### Xóa dữ liệu kiểm tra độ rã

```http
DELETE /production-orders/disintegration-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Disintegration check not found`

## Production Order Hard Capsule Leakage Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này chỉ dùng để lưu các lần kiểm tra độ rò rỉ của **viên nang cứng** theo từng lệnh sản xuất. Không dùng nhóm API này cho viên nén, nang mềm hoặc kiểm tra độ kín bao bì.

### Lấy danh sách kiểm tra độ rò rỉ của lệnh sản xuất

```http
GET /production-orders/:id/hard-capsule-leakage-checks
```

Response sắp xếp theo thời điểm kiểm tra mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "stage": "before_coating",
    "tested_capsule_count": 100,
    "leaked_capsule_count": 2,
    "created_by_id": 7,
    "checked_at": "2026-06-21T08:00:00.000Z",
    "created_at": "2026-06-21T08:00:00.000Z",
    "updated_at": "2026-06-21T08:00:00.000Z",
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

### Lấy một phiếu kiểm tra độ rò rỉ theo ID

```http
GET /production-orders/hard-capsule-leakage-checks/:checkId
```

Lỗi thường gặp:

- `404 Hard capsule leakage check not found`

### Thêm dữ liệu kiểm tra độ rò rỉ

```http
POST /production-orders/:id/hard-capsule-leakage-checks
```

Body:

```json
{
  "stage": "before_coating",
  "tested_capsule_count": 100,
  "leaked_capsule_count": 2
}
```

Quy tắc:

- `stage` bắt buộc, nhận `before_coating` (Trước bao) hoặc `after_coating` (Sau bao). Backend cũng chấp nhận chuỗi `Trước bao`/`Sau bao` và chuẩn hóa về hai giá trị trên.
- `tested_capsule_count` là số viên nang cứng được kiểm tra, phải là số nguyên lớn hơn hoặc bằng `1`.
- `leaked_capsule_count` là số viên nang cứng bị rò rỉ, phải là số nguyên lớn hơn hoặc bằng `0` và không được vượt `tested_capsule_count`.
- `production_order_id` lấy từ `:id`.
- Người kiểm tra là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.
- `checked_at` lấy theo thời điểm tạo bản ghi.

Lỗi thường gặp:

- `404 Production order not found`
- `400 stage is required`
- `400 stage must be before_coating or after_coating`
- `400 tested_capsule_count must be greater than or equal to 1`
- `400 leaked_capsule_count cannot exceed tested_capsule_count`
- `401 Authenticated user not found`

### Cập nhật dữ liệu kiểm tra độ rò rỉ

```http
PATCH /production-orders/hard-capsule-leakage-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "stage": "after_coating",
  "leaked_capsule_count": 1
}
```

Quy tắc:

- Có thể sửa `stage`, `tested_capsule_count`, `leaked_capsule_count`, hoặc kết hợp các field này.
- Validate và normalize giống API tạo.
- Nếu chỉ sửa một trong hai số lượng, backend dùng số lượng còn lại đang có trong DB để kiểm tra `leaked_capsule_count` không vượt `tested_capsule_count`.
- Không sửa `production_order_id`, `created_by_id`, `checked_at`, `created_at`.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 stage must be before_coating or after_coating`
- `400 tested_capsule_count must be greater than or equal to 1`
- `400 leaked_capsule_count cannot exceed tested_capsule_count`
- `404 Hard capsule leakage check not found`

### Xóa dữ liệu kiểm tra độ rò rỉ

```http
DELETE /production-orders/hard-capsule-leakage-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Hard capsule leakage check not found`

## Production Order Volume Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu kiểm tra thể tích cho tối đa 6 đơn vị của một lệnh sản xuất. Dùng được cho cả `gói` và `lọ`. Đây là bảng/API mới, độc lập với nhóm API cũ `Production Order Bottle Volume Checks`.

### Lấy danh sách kiểm tra thể tích

```http
GET /production-orders/:id/volume-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "package_type": null,
    "requirement": "Thể tích đạt theo tiêu chuẩn",
    "dosage_form_stage": "oral_solution",
    "unit_1_volume": "10.01",
    "unit_2_volume": null,
    "unit_3_volume": null,
    "unit_4_volume": null,
    "unit_5_volume": null,
    "unit_6_volume": null,
    "unit": "ml",
    "created_by_id": 7,
    "created_at": "2026-07-12T08:00:00.000Z",
    "updated_at": "2026-07-12T08:00:00.000Z",
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

### Lấy một bản ghi kiểm tra thể tích theo ID

```http
GET /production-orders/volume-checks/:checkId
```

Lỗi thường gặp:

- `404 Volume check not found`

### Thêm dữ liệu kiểm tra thể tích

```http
POST /production-orders/:id/volume-checks
Content-Type: application/json
```

Body:

```json
{
  "requirement": "Thể tích đạt theo tiêu chuẩn",
  "dosage_form_stage": "oral_solution",
  "unit_1_volume": 10.01,
  "unit_2_volume": 10.02
}
```

Quy tắc:

- `package_type` không bắt buộc, ví dụ: `goi`, `lo`. Nếu không gửi, gửi `null`, hoặc chuỗi rỗng thì backend lưu `null`.
- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null`, hoặc chuỗi rỗng thì backend lưu `null`.
- `dosage_form_stage` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null`, hoặc chuỗi rỗng thì backend lưu `null`. Giá trị gợi ý: `tablet`, `capsule`, `film_coated_tablet`, `oral_solution`.
- `unit_1_volume` bắt buộc.
- `unit_2_volume` đến `unit_6_volume` không bắt buộc. Các field còn thiếu, gửi `null`, hoặc chuỗi rỗng sẽ lưu `null`.
- Mỗi giá trị thể tích phải lớn hơn `0`.
- Lưu dạng `DECIMAL(10, 2)`, tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `10.02`, `"10.02"` hoặc `"10,02"`.
- `unit` luôn là `ml`, do backend tự lưu; frontend không gửi field này.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 package_type must be a string`
- `400 package_type must be at most 50 characters`
- `400 requirement must be a string`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_volume is required`
- `400 unit_1_volume must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 unit_1_volume must be greater than 0`
- `401 Authenticated user not found`

### Cập nhật dữ liệu kiểm tra thể tích

```http
PATCH /production-orders/volume-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "package_type": null,
  "requirement": null,
  "dosage_form_stage": "oral_solution",
  "unit_2_volume": null
}
```

Quy tắc:

- Có thể cập nhật `package_type`, `requirement`, `dosage_form_stage`, `unit_1_volume` đến `unit_6_volume`.
- `package_type` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `requirement` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `unit_2_volume` đến `unit_6_volume` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `unit_1_volume` không được xóa vì là giá trị bắt buộc.
- Giá trị thể tích validate giống API tạo.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 package_type must be a string`
- `400 package_type must be at most 50 characters`
- `400 requirement must be a string`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_volume is required`
- `400 unit_1_volume must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 unit_1_volume must be greater than 0`
- `404 Volume check not found`

### Xóa dữ liệu kiểm tra thể tích

```http
DELETE /production-orders/volume-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Volume check not found`

## Production Order Vial Inspection Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu các lần soi lọ theo từng bao của một lệnh sản xuất. Một lệnh sản xuất có thể có nhiều bản ghi soi lọ.

### Lấy danh sách soi lọ của lệnh sản xuất

```http
GET /production-orders/:id/vial-inspection-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "bag_number": 1,
    "fiber_vial_count": 1,
    "particulate_count": 2,
    "damaged_count": 0,
    "other_defect_count": 3,
    "note": "Cần theo dõi",
    "created_by_id": 7,
    "created_at": "2026-06-25T00:00:00.000Z",
    "updated_at": "2026-06-25T00:00:00.000Z",
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

### Lấy một bản ghi soi lọ theo ID

```http
GET /production-orders/vial-inspection-checks/:checkId
```

Lỗi thường gặp:

- `404 Vial inspection check not found`

### Thêm dữ liệu soi lọ

```http
POST /production-orders/:id/vial-inspection-checks
```

Body:

```json
{
  "bag_number": 1,
  "fiber_vial_count": 1,
  "particulate_count": 2,
  "damaged_count": 0,
  "other_defect_count": 3,
  "note": "Cần theo dõi"
}
```

Mapping field:

- `bag_number`: Bao số.
- `fiber_vial_count`: Số lọ có sợi.
- `particulate_count`: Số lượng vẩn.
- `damaged_count`: Số lượng hỏng.
- `other_defect_count`: Số lượng lỗi khác.
- `note`: Ghi chú.

Quy tắc:

- `bag_number` bắt buộc và phải là số nguyên lớn hơn `0`.
- Các field số lượng `fiber_vial_count`, `particulate_count`, `damaged_count`, `other_defect_count` đều bắt buộc và phải là số nguyên không âm.
- `note` không bắt buộc, lưu dạng ghi chú dài.
- `production_order_id` lấy từ `:id`.
- Người tạo dữ liệu là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.
- `created_at` là thời điểm tạo dữ liệu.

Lỗi thường gặp:

- `404 Production order not found`
- `400 bag_number is required`
- `400 bag_number must be a non-negative integer`
- `400 bag_number must be greater than 0`
- `400 fiber_vial_count is required`
- `400 fiber_vial_count must be a non-negative integer`
- `400 particulate_count must be a non-negative integer`
- `400 damaged_count must be a non-negative integer`
- `400 other_defect_count must be a non-negative integer`
- `400 note must be a string`
- `401 Authenticated user not found`

### Cập nhật dữ liệu soi lọ

```http
PATCH /production-orders/vial-inspection-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "bag_number": 2,
  "particulate_count": 4,
  "note": null
}
```

Quy tắc:

- Có thể cập nhật `bag_number`, `fiber_vial_count`, `particulate_count`, `damaged_count`, `other_defect_count`, `note`.
- Các field số lượng validate giống API tạo.
- `note` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 bag_number is required`
- `400 bag_number must be a non-negative integer`
- `400 bag_number must be greater than 0`
- `400 fiber_vial_count must be a non-negative integer`
- `400 particulate_count must be a non-negative integer`
- `400 damaged_count must be a non-negative integer`
- `400 other_defect_count must be a non-negative integer`
- `400 note must be a string`
- `404 Vial inspection check not found`

### Xóa dữ liệu soi lọ

```http
DELETE /production-orders/vial-inspection-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Vial inspection check not found`

## Production Order Shell Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu các lần kiểm tra khối lượng của 10 vỏ thuộc một lệnh sản xuất. Mỗi bản ghi bắt buộc có đủ 10 khối lượng và nhận đơn vị từ frontend.

### Lấy danh sách kiểm tra khối lượng 10 vỏ

```http
GET /production-orders/:id/shell-weight-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "shell_1_weight": "50.01",
    "shell_2_weight": "50.02",
    "shell_3_weight": "49.98",
    "shell_4_weight": "50.00",
    "shell_5_weight": "50.03",
    "shell_6_weight": "49.99",
    "shell_7_weight": "50.04",
    "shell_8_weight": "49.97",
    "shell_9_weight": "50.05",
    "shell_10_weight": "49.96",
    "unit": "g",
    "created_by_id": 7,
    "created_at": "2026-06-21T12:00:00.000Z",
    "updated_at": "2026-06-21T12:00:00.000Z",
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

### Lấy một bản ghi kiểm tra khối lượng vỏ theo ID

```http
GET /production-orders/shell-weight-checks/:checkId
```

Lỗi thường gặp:

- `404 Shell weight check not found`

### Thêm dữ liệu kiểm tra khối lượng 10 vỏ

```http
POST /production-orders/:id/shell-weight-checks
```

Body:

```json
{
  "shell_1_weight": 50.01,
  "shell_2_weight": 50.02,
  "shell_3_weight": 49.98,
  "shell_4_weight": 50,
  "shell_5_weight": 50.03,
  "shell_6_weight": 49.99,
  "shell_7_weight": 50.04,
  "shell_8_weight": 49.97,
  "shell_9_weight": 50.05,
  "shell_10_weight": 49.96,
  "unit": "g"
}
```

Quy tắc:

- Cả 10 field `shell_1_weight` đến `shell_10_weight` đều bắt buộc và phải lớn hơn `0`.
- Mỗi giá trị lưu dạng `DECIMAL(10, 2)`, tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `50.02`, `"50.02"` hoặc `"50,02"`.
- `unit` nhận từ frontend, phải là chuỗi không rỗng, tối đa 10 ký tự. Nếu tạo mới mà không gửi `unit`, backend mặc định là `mg`.
- `production_order_id` lấy từ `:id`.
- Người kiểm tra là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.
- `created_at` là thời điểm kiểm tra.

Lỗi thường gặp:

- `404 Production order not found`
- `400 shell_1_weight is required`
- `400 shell_1_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 shell_1_weight must be greater than 0`
- `400 unit is required`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `401 Authenticated user not found`

### Cập nhật khối lượng từng vỏ

```http
PATCH /production-orders/shell-weight-checks/:checkId
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body chỉ cần gửi các khối lượng muốn cập nhật:

```json
{
  "shell_2_weight": 51.25,
  "shell_7_weight": 50.15,
  "unit": "mg"
}
```

Quy tắc:

- Có thể cập nhật một hoặc nhiều field từ `shell_1_weight` đến `shell_10_weight`, hoặc cập nhật `unit`.
- Mỗi giá trị khối lượng được gửi phải lớn hơn `0` và lưu dạng `DECIMAL(10, 2)`.
- Nếu gửi `unit`, giá trị phải là chuỗi không rỗng, tối đa 10 ký tự. Nếu không gửi `unit`, backend giữ nguyên đơn vị hiện có.
- API trả về bản ghi sau khi cập nhật, kèm thông tin `createdBy`.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 shell_1_weight is required`
- `400 shell_1_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 shell_1_weight must be greater than 0`
- `400 unit is required`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `404 Shell weight check not found`

### Xoá kiểm tra khối lượng 10 vỏ

```http
DELETE /production-orders/shell-weight-checks/:checkId
Authorization: Bearer <access_token>
```

Response trả về bản ghi vừa xoá.

Lỗi thường gặp:

- `404 Shell weight check not found`

## Production Order Ten-Shell Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu khối lượng chung của 10 vỏ nang thuộc một lệnh sản xuất. Đây là tính năng riêng với nhóm `Production Order Shell Weight Checks` phía trên. Mỗi lệnh sản xuất chỉ có 1 bản ghi khối lượng chung 10 vỏ nang và nhận đơn vị từ frontend.

### Lấy khối lượng chung 10 vỏ nang

```http
GET /production-orders/:id/ten-shell-weight-check
```

Response trả về object nếu đã nhập, hoặc `null` nếu lệnh sản xuất chưa có dữ liệu.

Response mẫu:

```json
{
  "id": 1,
  "production_order_id": 2031,
  "ten_shells_weight": "500.04",
  "unit": "g",
  "created_by_id": 7,
  "created_at": "2026-06-25T00:00:00.000Z",
  "updated_at": "2026-06-25T00:00:00.000Z",
  "createdBy": {
    "id": 7,
    "username": "binh",
    "name": "Binh",
    "email": "binh@example.com",
    "department": "QA",
    "position": "Staff"
  }
}
```

### Lấy một bản ghi khối lượng chung 10 vỏ nang theo ID

```http
GET /production-orders/ten-shell-weight-checks/:checkId
```

Lỗi thường gặp:

- `404 Ten-shell weight check not found`

### Tạo hoặc cập nhật khối lượng chung 10 vỏ nang

```http
POST /production-orders/:id/ten-shell-weight-check
```

Body:

```json
{
  "ten_shells_weight": 500.04,
  "unit": "g"
}
```

Quy tắc:

- Mỗi lệnh sản xuất chỉ có 1 bản ghi khối lượng chung 10 vỏ nang.
- Nếu chưa có dữ liệu thì API tạo mới; nếu đã có thì API cập nhật `ten_shells_weight`.
- `ten_shells_weight` bắt buộc và phải lớn hơn `0`.
- `ten_shells_weight` lưu dạng `DECIMAL(10, 2)`, tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `500.04`, `"500.04"` hoặc `"500,04"`.
- `unit` nhận từ frontend, phải là chuỗi không rỗng, tối đa 10 ký tự. Nếu tạo mới mà không gửi `unit`, backend mặc định là `mg`. Nếu bản ghi đã tồn tại và không gửi `unit`, backend giữ nguyên đơn vị hiện có.
- `production_order_id` lấy từ `:id`.
- Người tạo dữ liệu là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 ten_shells_weight is required`
- `400 ten_shells_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 ten_shells_weight must be greater than 0`
- `400 unit is required`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `401 Authenticated user not found`

### Cập nhật khối lượng chung 10 vỏ nang theo ID

```http
PATCH /production-orders/ten-shell-weight-checks/:checkId
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "ten_shells_weight": 510.25,
  "unit": "mg"
}
```

Quy tắc:

- Có thể cập nhật `ten_shells_weight`, `unit`, hoặc cả hai.
- Nếu gửi `ten_shells_weight`, giá trị phải lớn hơn `0`, lưu dạng `DECIMAL(10, 2)`, tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `510.25`, `"510.25"` hoặc `"510,25"`.
- Nếu gửi `unit`, giá trị phải là chuỗi không rỗng, tối đa 10 ký tự. Nếu không gửi `unit`, backend giữ nguyên đơn vị hiện có.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 ten_shells_weight is required`
- `400 ten_shells_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 ten_shells_weight must be greater than 0`
- `400 unit is required`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `404 Ten-shell weight check not found`

### Xoá khối lượng chung 10 vỏ nang

```http
DELETE /production-orders/ten-shell-weight-checks/:checkId
Authorization: Bearer <access_token>
```

Response trả về bản ghi vừa xoá.

Lỗi thường gặp:

- `404 Ten-shell weight check not found`

## Production Order Semi-Finished Gross Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu yêu cầu tại thời điểm nhập và khối lượng bán thành phẩm cả vỏ của tối đa 10 đơn vị. Một lệnh sản xuất có thể có nhiều lần kiểm tra. Đơn vị mặc định là `g`, nhưng frontend có thể gửi hoặc sửa `unit` khi cần; chỉ đơn vị 1 là bắt buộc.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/semi-finished-gross-weight-checks
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Khối lượng cả vỏ từ 0.480 g đến 0.520 g",
    "dosage_form_stage": "film_coated_tablet",
    "unit_1_gross_weight": "0.501",
    "unit_2_gross_weight": "0.498",
    "unit_3_gross_weight": "0.503",
    "unit_4_gross_weight": null,
    "unit_5_gross_weight": null,
    "unit_6_gross_weight": null,
    "unit_7_gross_weight": null,
    "unit_8_gross_weight": null,
    "unit_9_gross_weight": null,
    "unit_10_gross_weight": null,
    "unit": "g",
    "created_by_id": 7,
    "created_at": "2026-07-11T00:00:00.000Z",
    "updated_at": "2026-07-11T00:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/semi-finished-gross-weight-checks/:checkId
```

Lỗi thường gặp:

- `404 Semi-finished product gross weight check not found`

### Tạo bản ghi

```http
POST /production-orders/:id/semi-finished-gross-weight-checks
Content-Type: application/json
```

Body:

```json
{
  "dosage_form_stage": "film_coated_tablet",
  "unit_1_gross_weight": 0.501,
  "unit_10_gross_weight": 0.505,
  "unit": "g"
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `dosage_form_stage` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`. Giá trị gợi ý: `tablet`, `capsule`, `film_coated_tablet`.
- `unit_1_gross_weight` bắt buộc và phải lớn hơn `0`.
- `unit_2_gross_weight` đến `unit_10_gross_weight` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Khi có giá trị, khối lượng phải lớn hơn `0`, lưu dạng `DECIMAL(10, 3)` và tối đa 3 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `0.501`, `"0.501"` hoặc `"0,501"`.
- `unit` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu mặc định `g`; nếu gửi thì phải là chuỗi không rỗng và tối đa 10 ký tự.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_gross_weight is required`
- `400 unit_1_gross_weight must fit DECIMAL(10, 3) with up to 3 decimal places`
- `400 unit_1_gross_weight must be greater than 0`
- `400 unit_2_gross_weight must fit DECIMAL(10, 3) with up to 3 decimal places`
- `400 unit_2_gross_weight must be greater than 0`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/semi-finished-gross-weight-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "requirement": "Yêu cầu mới tại thời điểm cập nhật",
  "dosage_form_stage": "tablet",
  "unit_3_gross_weight": null,
  "unit": "mg"
}
```

`unit_2_gross_weight` đến `unit_10_gross_weight` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị. `unit_1_gross_weight` không được xóa vì là giá trị bắt buộc. `unit` có thể sửa, nhưng không được gửi `null` hoặc chuỗi rỗng trong API cập nhật.
`requirement` và `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `requirement`, `dosage_form_stage` và khối lượng giống API tạo.
- `404 Semi-finished product gross weight check not found`

### Xóa bản ghi

```http
DELETE /production-orders/semi-finished-gross-weight-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Semi-finished product gross weight check not found`

## Production Order Semi-Finished Net Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu yêu cầu tại thời điểm nhập và khối lượng bán thành phẩm không có vỏ của tối đa 10 đơn vị. Một lệnh sản xuất có thể có nhiều lần kiểm tra. Đơn vị mặc định là `g`, nhưng frontend có thể gửi hoặc sửa `unit` khi cần; chỉ đơn vị 1 là bắt buộc.
`dosage_form_stage` là thông tin dạng kiểm tra, ví dụ `tablet`, `capsule`, `film_coated_tablet`.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/semi-finished-net-weight-checks
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Khối lượng không vỏ từ 0.380 g đến 0.420 g",
    "dosage_form_stage": "film_coated_tablet",
    "unit_1_net_weight": "0.401",
    "unit_2_net_weight": "0.398",
    "unit_3_net_weight": null,
    "unit_4_net_weight": null,
    "unit_5_net_weight": null,
    "unit_6_net_weight": null,
    "unit_7_net_weight": null,
    "unit_8_net_weight": null,
    "unit_9_net_weight": null,
    "unit_10_net_weight": null,
    "unit": "g",
    "created_by_id": 7,
    "created_at": "2026-07-11T00:00:00.000Z",
    "updated_at": "2026-07-11T00:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/semi-finished-net-weight-checks/:checkId
```

Lỗi thường gặp:

- `404 Semi-finished product net weight check not found`

### Tạo bản ghi

```http
POST /production-orders/:id/semi-finished-net-weight-checks
Content-Type: application/json
```

Body:

```json
{
  "dosage_form_stage": "film_coated_tablet",
  "unit_1_net_weight": 0.401,
  "unit_2_net_weight": 0.398,
  "unit_10_net_weight": 0.405,
  "unit": "g"
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `dosage_form_stage` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`. Giá trị gợi ý: `tablet`, `capsule`, `film_coated_tablet`.
- `unit_1_net_weight` bắt buộc và phải lớn hơn `0`.
- `unit_2_net_weight` đến `unit_10_net_weight` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Khi có giá trị, khối lượng phải lớn hơn `0`, lưu dạng `DECIMAL(10, 3)` và tối đa 3 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `0.401`, `"0.401"` hoặc `"0,401"`.
- `unit` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu mặc định `g`; nếu gửi thì phải là chuỗi không rỗng và tối đa 10 ký tự.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_net_weight is required`
- `400 unit_1_net_weight must fit DECIMAL(10, 3) with up to 3 decimal places`
- `400 unit_1_net_weight must be greater than 0`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/semi-finished-net-weight-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "requirement": "Yêu cầu mới tại thời điểm cập nhật",
  "dosage_form_stage": "tablet",
  "unit_3_net_weight": null,
  "unit": "mg"
}
```

`unit_2_net_weight` đến `unit_10_net_weight` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị. `unit_1_net_weight` không được xóa vì là giá trị bắt buộc. `unit` có thể sửa, nhưng không được gửi `null` hoặc chuỗi rỗng trong API cập nhật.
`requirement` và `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `requirement`, khối lượng và `unit` giống API tạo.
- `400 unit is required`
- `404 Semi-finished product net weight check not found`

### Xóa bản ghi

```http
DELETE /production-orders/semi-finished-net-weight-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Semi-finished product net weight check not found`

## Production Order Semi-Finished Product Summaries

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu bảng tổng kết sản lượng bán thành phẩm theo từng lệnh sản xuất. Một lệnh sản xuất có thể có nhiều dòng tổng kết theo giai đoạn. Các lượng đều không bắt buộc; đơn vị tính của tổng kết dập viên luôn là `kg`.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/semi-finished-product-summaries
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "stage": "Đóng gói",
    "input_quantity": "100.500",
    "input_unit": "kg",
    "load_quantity": "10.000",
    "load_unit": "tải",
    "packed_quantity": "95.000",
    "packed_unit": "kg",
    "leftover_quantity": "3.000",
    "leftover_unit": "kg",
    "waste_quantity": "2.500",
    "waste_unit": "kg",
    "created_by_id": 7,
    "created_at": "2026-07-17T00:00:00.000Z",
    "updated_at": "2026-07-17T00:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/semi-finished-product-summaries/:summaryId
```

Lỗi thường gặp:

- `404 Semi-finished product summary not found`

### Tạo bản ghi

```http
POST /production-orders/:id/semi-finished-product-summaries
Content-Type: application/json
```

Body:

```json
{
  "stage": "Đóng gói",
  "input_quantity": "100.5",
  "input_unit": "kg",
  "load_quantity": "10",
  "load_unit": "tải",
  "packed_quantity": "95",
  "packed_unit": "thùng",
  "leftover_quantity": "3",
  "leftover_unit": "kg",
  "waste_quantity": "2.5",
  "waste_unit": "g"
}
```

Quy tắc:

- `stage` không bắt buộc, tối đa 100 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `input_quantity`, `load_quantity`, `packed_quantity`, `leftover_quantity`, `waste_quantity` đều không bắt buộc.
- Khi có giá trị, các lượng lưu dạng `DECIMAL(12, 3)` và tối đa 3 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `100.5`, `"100.5"` hoặc `"100,5"`.
- `input_unit`, `load_unit`, `packed_unit`, `leftover_unit`, `waste_unit` được lưu theo giá trị frontend gửi, sau khi trim khoảng trắng.
- Các field đơn vị tối đa 20 ký tự. Nếu không gửi khi tạo mới, backend mặc định `kg`.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 stage must be a string`
- `400 stage must be at most 100 characters`
- `400 input_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 load_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 packed_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 leftover_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 waste_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/semi-finished-product-summaries/:summaryId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "stage": "Hoàn tất đóng gói",
  "load_quantity": "11",
  "load_unit": "tải",
  "leftover_quantity": null,
  "leftover_unit": "g",
  "waste_quantity": "2.25",
  "waste_unit": "kg"
}
```

Các field lượng không bắt buộc có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị. Các field đơn vị nếu gửi sẽ được backend lưu theo giá trị frontend gửi; không thể gửi `null` hoặc chuỗi rỗng để xóa đơn vị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `stage`, lượng và đơn vị giống API tạo.
- `404 Semi-finished product summary not found`

### Xóa bản ghi

```http
DELETE /production-orders/semi-finished-product-summaries/:summaryId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Semi-finished product summary not found`

## Production Order Material Summaries

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu bảng tổng kết nguyên vật liệu theo từng lệnh sản xuất. Một lệnh sản xuất có thể có nhiều dòng tổng kết nguyên vật liệu. `material_code` phụ thuộc bảng `items`; khi tạo hoặc đổi `material_code`, backend tự lấy snapshot `material_name` và `unit` từ item tại thời điểm lưu.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/material-summaries
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "material_code": "NL00001",
    "material_name": "Nguyên liệu A",
    "lot_no": "LOT-001",
    "unit": "kg",
    "received_quantity": "100.500",
    "used_quantity": "90.000",
    "supplier_waste_quantity": "1.250",
    "production_waste_quantity": "2.000",
    "remaining_quantity": "6.000",
    "sample_quantity": "1.250",
    "summarized_by_id": 7,
    "created_by_id": 7,
    "created_at": "2026-07-19T00:00:00.000Z",
    "updated_at": "2026-07-19T00:00:00.000Z",
    "material": {
      "item_code": "NL00001",
      "item_name": "Nguyên liệu A",
      "unit": "kg"
    },
    "summarizedBy": {
      "id": 7,
      "username": "binh",
      "name": "Binh",
      "email": "binh@example.com",
      "department": "QA",
      "position": "Staff"
    },
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/material-summaries/:summaryId
```

Lỗi thường gặp:

- `404 Material summary not found`

### Tạo bản ghi

```http
POST /production-orders/:id/material-summaries
Content-Type: application/json
```

Body:

```json
{
  "material_code": "NL00001",
  "lot_no": "LOT-001",
  "received_quantity": "100.5",
  "used_quantity": "90",
  "supplier_waste_quantity": "1.25",
  "production_waste_quantity": "2",
  "remaining_quantity": "6",
  "sample_quantity": "1.25",
  "summarized_by_id": 7
}
```

Quy tắc:

- `material_code` bắt buộc và phải tồn tại trong bảng `items`.
- `material_name` và `unit` không nhận từ body; backend snapshot từ item theo `material_code`.
- `lot_no` không bắt buộc, tối đa 100 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Các field số lượng không bắt buộc: `received_quantity`, `used_quantity`, `supplier_waste_quantity`, `production_waste_quantity`, `remaining_quantity`, `sample_quantity`.
- Khi có giá trị, các lượng lưu dạng `DECIMAL(12, 3)` và tối đa 3 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `100.5`, `"100.5"` hoặc `"100,5"`.
- `summarized_by_id` không bắt buộc. Nếu không gửi, backend mặc định là user đăng nhập. Có thể gửi `null` hoặc chuỗi rỗng để lưu `null` khi cập nhật.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `404 Material item not found`
- `404 Summarized user not found`
- `400 material_code is required`
- `400 lot_no must be a string`
- `400 lot_no must be at most 100 characters`
- `400 summarized_by_id must be a positive integer`
- `400 received_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 used_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 supplier_waste_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 production_waste_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 remaining_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 sample_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/material-summaries/:summaryId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "material_code": "NL00002",
  "lot_no": "LOT-002",
  "used_quantity": "88.5",
  "summarized_by_id": null
}
```

Nếu cập nhật `material_code`, backend snapshot lại `material_name` và `unit` theo item mới. Các field số lượng, `lot_no`, `summarized_by_id` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `material_code`, `lot_no`, số lượng và `summarized_by_id` giống API tạo.
- `404 Material summary not found`

### Xóa bản ghi

```http
DELETE /production-orders/material-summaries/:summaryId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Material summary not found`

## Production Order Material Process Summaries

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu tổng kết quá trình sản xuất nguyên liệu theo từng giai đoạn của lệnh sản xuất. Một lệnh sản xuất có thể có nhiều dòng tổng kết. Mỗi dòng có tối đa một ảnh.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/material-process-summaries
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "process_stage": "Sấy",
    "yielded_quantity": "125.500",
    "yielded_unit": "kg",
    "moisture_percent": "4.25",
    "image_path": "/production-orders/material-process-summaries/images/say-a1b2c3.jpg",
    "note": "Đạt yêu cầu",
    "created_by_id": 7,
    "created_at": "2026-08-11T08:00:00.000Z",
    "updated_at": "2026-08-11T08:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/material-process-summaries/:summaryId
```

Lỗi thường gặp:

- `404 Material process summary not found`

### Tạo bản ghi

```http
POST /production-orders/:id/material-process-summaries
Content-Type: multipart/form-data
```

Field form-data:

| Field | Bắt buộc | Mô tả |
| --- | --- | --- |
| `process_stage` | Có | Giai đoạn sản xuất, tối đa 100 ký tự. |
| `yielded_quantity` | Có | Khối lượng thu được; `DECIMAL(12, 3)`. Nhận số hoặc chuỗi số, dùng dấu chấm/dấu phẩy. |
| `yielded_unit` | Không | Đơn vị khối lượng, tối đa 20 ký tự; mặc định `kg`. |
| `moisture_percent` | Không | Hàm ẩm (%), tối đa 2 chữ số thập phân, từ 0 đến 100. |
| `image` | Không | Một ảnh JPG, PNG, WEBP hoặc GIF; tối đa 20 MB. |
| `note` | Không | Ghi chú. |

Ví dụ cURL:

```bash
curl -X POST http://localhost:3000/production-orders/2031/material-process-summaries \
  -H "Authorization: Bearer <accessToken>" \
  -F "process_stage=Sấy" \
  -F "yielded_quantity=125,5" \
  -F "yielded_unit=kg" \
  -F "moisture_percent=4,25" \
  -F "note=Đạt yêu cầu" \
  -F "image=@./say.jpg"
```

`production_order_id` lấy từ `:id`; `created_by_id` lấy từ user đang đăng nhập. Khi không gửi ảnh, `image_path` là `null`.

Lỗi thường gặp:

- `404 Production order not found`
- `400 process_stage is required`
- `400 process_stage must be at most 100 characters`
- `400 yielded_quantity must fit DECIMAL(12, 3) with up to 3 decimal places`
- `400 yielded_unit is required`
- `400 yielded_unit must be at most 20 characters`
- `400 moisture_percent must have up to 2 decimal places`
- `400 moisture_percent must not exceed 100`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/material-process-summaries/:summaryId
Content-Type: multipart/form-data
```

Chỉ gửi các field muốn thay đổi. Các field văn bản và số tuân theo quy tắc như API tạo. Gửi một file qua field `image` để thay ảnh cũ; ảnh cũ sẽ được xóa sau khi cập nhật thành công.

Ví dụ:

```bash
curl -X PATCH http://localhost:3000/production-orders/material-process-summaries/1 \
  -H "Authorization: Bearer <accessToken>" \
  -F "process_stage=Hoàn tất sấy" \
  -F "moisture_percent=4.10" \
  -F "image=@./say-moi.png"
```

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra field giống API tạo.
- `404 Material process summary not found`

### Lấy ảnh

```http
GET /production-orders/material-process-summaries/images/:filename
```

`filename` là tên file trong `image_path` trả về từ API. API trả về binary của ảnh.

Lỗi thường gặp:

- `404 Material process summary image not found`

### Xóa bản ghi

```http
DELETE /production-orders/material-process-summaries/:summaryId
```

API trả về bản ghi vừa xóa và đồng thời xóa ảnh liên kết (nếu có).

Lỗi thường gặp:

- `404 Material process summary not found`

## Production Order Leak Tightness Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu dạng bào chế, yêu cầu tại thời điểm nhập và kết quả kiểm tra độ kín của tối đa 10 đơn vị. Một lệnh sản xuất có thể có nhiều lần kiểm tra; chỉ đơn vị 1 là bắt buộc.
`dosage_form_stage` là thông tin dạng bào chế/dạng kiểm tra, ví dụ `tablet`, `capsule`, `film_coated_tablet`.

Kết quả trả về là boolean:

- `true`: đạt/kín.
- `false`: không đạt/không kín.
- `null`: chưa kiểm tra; chỉ áp dụng cho đơn vị 2 đến đơn vị 10.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/leak-tightness-checks
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Tần suất 30 phút/lần, cảm quan lọ kín, để ngang lọ và đập nhẹ vào tay không thấy dịch rỉ ra ngoài.",
    "dosage_form_stage": "film_coated_tablet",
    "unit_1_result": true,
    "unit_2_result": true,
    "unit_3_result": false,
    "unit_4_result": null,
    "unit_5_result": null,
    "unit_6_result": null,
    "unit_7_result": null,
    "unit_8_result": null,
    "unit_9_result": null,
    "unit_10_result": null,
    "created_by_id": 7,
    "created_at": "2026-07-12T00:00:00.000Z",
    "updated_at": "2026-07-12T00:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/leak-tightness-checks/:checkId
```

Lỗi thường gặp:

- `404 Leak tightness check not found`

### Tạo bản ghi

```http
POST /production-orders/:id/leak-tightness-checks
Content-Type: application/json
```

Body:

```json
{
  "requirement": "Tần suất 30 phút/lần, cảm quan lọ kín, để ngang lọ và đập nhẹ vào tay không thấy dịch rỉ ra ngoài.",
  "dosage_form_stage": "film_coated_tablet",
  "unit_1_result": true,
  "unit_2_result": "đạt",
  "unit_3_result": "không kín"
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng khi tạo mới thì backend dùng mặc định: `Tần suất 30 phút/lần, cảm quan lọ kín, để ngang lọ và đập nhẹ vào tay không thấy dịch rỉ ra ngoài.`
- `dosage_form_stage` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`. Giá trị gợi ý: `tablet`, `capsule`, `film_coated_tablet`.
- `unit_1_result` bắt buộc.
- `unit_2_result` đến `unit_10_result` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Frontend nên gửi `true` cho đạt/kín và `false` cho không đạt/không kín.
- Backend cũng chấp nhận `1`, `0`, `"pass"`, `"fail"`, `"đạt"`, `"không đạt"`, `"kín"` và `"không kín"`.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_result is required`
- `400 unit_1_result must be a boolean or pass/fail value`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/leak-tightness-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "requirement": "Yêu cầu mới tại thời điểm cập nhật",
  "dosage_form_stage": "tablet",
  "unit_2_result": false,
  "unit_3_result": null
}
```

`unit_2_result` đến `unit_10_result` có thể gửi `null` hoặc chuỗi rỗng để xóa kết quả. `unit_1_result` không được xóa vì là giá trị bắt buộc. `requirement` và `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `requirement` và kết quả giống API tạo.
- `404 Leak tightness check not found`

### Xóa bản ghi

```http
DELETE /production-orders/leak-tightness-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Leak tightness check not found`

## Production Order Hardness Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu yêu cầu tại thời điểm nhập, dạng bào chế/dạng kiểm tra và kết quả đo độ cứng của tối đa 10 đơn vị sản phẩm. Một lệnh sản xuất có thể có nhiều lần kiểm tra. Đơn vị mặc định là `N`, nhưng frontend có thể gửi hoặc sửa `unit` khi cần; chỉ đơn vị 1 là bắt buộc.
`dosage_form_stage` là thông tin dạng bào chế/dạng kiểm tra, ví dụ `tablet`, `capsule`, `film_coated_tablet`.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/hardness-checks
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Độ cứng từ 70 N đến 90 N",
    "dosage_form_stage": "tablet",
    "unit_1_hardness": "80.100",
    "unit_2_hardness": "79.800",
    "unit_3_hardness": null,
    "unit_4_hardness": null,
    "unit_5_hardness": null,
    "unit_6_hardness": null,
    "unit_7_hardness": null,
    "unit_8_hardness": null,
    "unit_9_hardness": null,
    "unit_10_hardness": null,
    "unit": "N",
    "created_by_id": 7,
    "created_at": "2026-07-21T00:00:00.000Z",
    "updated_at": "2026-07-21T00:00:00.000Z",
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

Lỗi thường gặp:

- `404 Production order not found`

### Lấy một bản ghi theo ID

```http
GET /production-orders/hardness-checks/:checkId
```

Lỗi thường gặp:

- `404 Hardness check not found`

### Tạo bản ghi

```http
POST /production-orders/:id/hardness-checks
Content-Type: application/json
```

Body:

```json
{
  "requirement": "Độ cứng từ 70 N đến 90 N",
  "dosage_form_stage": "tablet",
  "unit_1_hardness": 80.1,
  "unit_2_hardness": "79,8",
  "unit_10_hardness": 82.5,
  "unit": "N"
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `dosage_form_stage` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`. Giá trị gợi ý: `tablet`, `capsule`, `film_coated_tablet`.
- `unit_1_hardness` bắt buộc và phải lớn hơn `0`.
- `unit_2_hardness` đến `unit_10_hardness` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Khi có giá trị, độ cứng phải lớn hơn `0`, lưu dạng `DECIMAL(10, 3)` và tối đa 3 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `80.1`, `"80.1"` hoặc `"80,1"`.
- `unit` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu mặc định `N`; nếu gửi thì phải là chuỗi không rỗng và tối đa 10 ký tự.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_hardness is required`
- `400 unit_1_hardness must fit DECIMAL(10, 3) with up to 3 decimal places`
- `400 unit_1_hardness must be greater than 0`
- `400 unit must be a string`
- `400 unit must be at most 10 characters`
- `401 Authenticated user not found`

### Cập nhật bản ghi

```http
PATCH /production-orders/hardness-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi các field muốn cập nhật:

```json
{
  "requirement": "Yêu cầu mới tại thời điểm cập nhật",
  "dosage_form_stage": "film_coated_tablet",
  "unit_3_hardness": null,
  "unit_10_hardness": 83.2,
  "unit": "N"
}
```

`unit_2_hardness` đến `unit_10_hardness` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị. `unit_1_hardness` không được xóa vì là giá trị bắt buộc. `unit` có thể sửa, nhưng không được gửi `null` hoặc chuỗi rỗng trong API cập nhật.
`requirement` và `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `requirement`, `dosage_form_stage`, độ cứng và `unit` giống API tạo.
- `400 unit is required`
- `404 Hardness check not found`

### Xóa bản ghi

```http
DELETE /production-orders/hardness-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Hardness check not found`

## Production Order Tablet Thickness Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu yêu cầu, dạng bào chế và kết quả đo chiều dày của tối đa 10 đơn vị theo từng lệnh sản xuất. Mỗi lệnh sản xuất có thể có nhiều lần kiểm tra. Đơn vị mặc định là `mm`; chỉ đơn vị 1 là bắt buộc.

### Lấy danh sách theo lệnh sản xuất

```http
GET /production-orders/:id/tablet-thickness-checks
```

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Chiều dày từ 4.0 mm đến 4.4 mm",
    "dosage_form_stage": "tablet",
    "unit_1_thickness": "4.200",
    "unit_2_thickness": "4.100",
    "unit_3_thickness": null,
    "unit_4_thickness": null,
    "unit_5_thickness": null,
    "unit_6_thickness": null,
    "unit_7_thickness": null,
    "unit_8_thickness": null,
    "unit_9_thickness": null,
    "unit_10_thickness": null,
    "unit": "mm",
    "created_by_id": 7,
    "created_at": "2026-08-05T00:00:00.000Z",
    "updated_at": "2026-08-05T00:00:00.000Z"
  }
]
```

### Lấy một bản ghi theo ID

```http
GET /production-orders/tablet-thickness-checks/:checkId
```

### Tạo bản ghi

```http
POST /production-orders/:id/tablet-thickness-checks
Content-Type: application/json
```

```json
{
  "requirement": "Chiều dày từ 4.0 mm đến 4.4 mm",
  "dosage_form_stage": "tablet",
  "unit_1_thickness": 4.2,
  "unit_2_thickness": "4,1",
  "unit_10_thickness": 4.3
}
```

Quy tắc:

- `requirement` và `dosage_form_stage` không bắt buộc; gửi `null` hoặc chuỗi rỗng sẽ lưu `null`. `dosage_form_stage` tối đa 50 ký tự.
- `unit_1_thickness` bắt buộc và phải lớn hơn `0`.
- `unit_2_thickness` đến `unit_10_thickness` không bắt buộc; gửi `null` hoặc chuỗi rỗng sẽ lưu `null`.
- Giá trị chiều dày lưu dạng `DECIMAL(10, 3)`, tối đa 3 chữ số sau dấu phẩy. Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `4.2`, `"4.2"`, `"4,2"`.
- `unit` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì lưu mặc định `mm`; nếu gửi phải là chuỗi không rỗng, tối đa 10 ký tự.
- `production_order_id` lấy từ `:id`; `created_by_id` lấy từ user đăng nhập.

### Cập nhật bản ghi

```http
PATCH /production-orders/tablet-thickness-checks/:checkId
Content-Type: application/json
```

```json
{
  "requirement": "Yêu cầu mới",
  "unit_2_thickness": null,
  "unit_10_thickness": 4.5,
  "unit": "mm"
}
```

`unit_2_thickness` đến `unit_10_thickness`, `requirement` và `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa. `unit_1_thickness` không được xóa; `unit` không được gửi `null` hoặc chuỗi rỗng khi cập nhật.

### Xóa bản ghi

```http
DELETE /production-orders/tablet-thickness-checks/:checkId
```

## Production Order Cylinder Calibrations

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu 1 thông số hiệu chỉnh ống đong cho mỗi lệnh sản xuất.

### Lấy thông số hiệu chỉnh ống đong

```http
GET /production-orders/:id/cylinder-calibration
```

Response trả về object nếu đã nhập, hoặc `null` nếu lệnh sản xuất chưa có thông số hiệu chỉnh.

Response mẫu:

```json
{
  "id": 1,
  "production_order_id": 2031,
  "cylinder_code": null,
  "calibration_number": "0.1234",
  "created_by_id": 7,
  "created_at": "2026-06-24T00:00:00.000Z",
  "updated_at": "2026-06-24T00:00:00.000Z",
  "createdBy": {
    "id": 7,
    "username": "binh",
    "name": "Binh",
    "email": "binh@example.com",
    "department": "QA",
    "position": "Staff"
  }
}
```

### Tạo hoặc cập nhật thông số hiệu chỉnh ống đong

```http
POST /production-orders/:id/cylinder-calibration
```

Body:

```json
{
  "calibration_number": "0.1234"
}
```

Quy tắc:

- Mỗi lệnh sản xuất chỉ có 1 bản ghi hiệu chỉnh ống đong.
- Nếu chưa có dữ liệu thì API tạo mới; nếu đã có thì API cập nhật `cylinder_code` và `calibration_number`.
- `cylinder_code` không bắt buộc, tối đa 100 ký tự nếu có nhập. Nếu bỏ trống hoặc gửi chuỗi rỗng thì lưu `null`.
- `calibration_number` bắt buộc, lưu dạng `DECIMAL(10, 4)`, tối đa 4 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `0.1234`, `"0.1234"` hoặc `"0,1234"`.
- `calibration_number` có thể là số âm, số dương hoặc `0`.
- `production_order_id` lấy từ `:id`.
- Người tạo dữ liệu là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 cylinder_code must be a string`
- `400 cylinder_code must be at most 100 characters`
- `400 calibration_number is required`
- `400 calibration_number must fit DECIMAL(10, 4) with up to 4 decimal places`
- `401 Authenticated user not found`

### Cập nhật thông số hiệu chỉnh ống đong

```http
PATCH /production-orders/:id/cylinder-calibration
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "cylinder_code": "OD-002"
}
```

Quy tắc:

- `:id` là `production_order_id`.
- Có thể cập nhật `cylinder_code`, `calibration_number`, hoặc cả hai.
- `cylinder_code` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `calibration_number` nếu gửi thì bắt buộc có giá trị hợp lệ, không được gửi `null` hoặc chuỗi rỗng.

Lỗi thường gặp:

- `404 Production order not found`
- `404 Cylinder calibration not found`
- `400 At least one field is required`
- `400 cylinder_code must be a string`
- `400 cylinder_code must be at most 100 characters`
- `400 calibration_number is required`
- `400 calibration_number must fit DECIMAL(10, 4) with up to 4 decimal places`

### Xóa thông số hiệu chỉnh ống đong

```http
DELETE /production-orders/:id/cylinder-calibration
```

`:id` là `production_order_id`. API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Production order not found`
- `404 Cylinder calibration not found`

## Production Order Ten-Unit Sensory Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu kiểm tra cảm quan theo tối đa 10 đơn vị của một lệnh sản xuất. Chỉ đơn vị 1 bắt buộc, các đơn vị 2-10 có thể để trống. Nhóm này không xử lý upload ảnh; API cảm quan có ảnh vẫn nằm ở nhóm `Production Order Sensory Checks`.

### Lấy danh sách kiểm tra cảm quan 10 đơn vị

```http
GET /production-orders/:id/ten-unit-sensory-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "requirement": "Tần suất 30 phút/lần, đạt yêu cầu cảm quan.",
    "dosage_form_stage": "film_coated_tablet",
    "unit_1_result": true,
    "unit_2_result": true,
    "unit_3_result": false,
    "unit_4_result": null,
    "unit_5_result": null,
    "unit_6_result": null,
    "unit_7_result": null,
    "unit_8_result": null,
    "unit_9_result": null,
    "unit_10_result": null,
    "created_by_id": 7,
    "created_at": "2026-07-12T08:10:00.000Z",
    "updated_at": "2026-07-12T08:10:00.000Z"
  }
]
```

### Lấy một bản ghi kiểm tra cảm quan 10 đơn vị theo ID

```http
GET /production-orders/ten-unit-sensory-checks/:checkId
```

Lỗi thường gặp:

- `404 Ten-unit sensory check not found`

### Thêm dữ liệu kiểm tra cảm quan 10 đơn vị

```http
POST /production-orders/:id/ten-unit-sensory-checks
Content-Type: application/json
```

Body:

```json
{
  "requirement": "Tần suất 30 phút/lần, đạt yêu cầu cảm quan.",
  "dosage_form_stage": "film_coated_tablet",
  "unit_1_result": "Đạt",
  "unit_2_result": "Đạt",
  "unit_3_result": "Không đạt"
}
```

Quy tắc:

- `requirement` không bắt buộc. Nếu không gửi, gửi `null`, hoặc chuỗi rỗng khi tạo mới thì backend dùng mặc định: `Tần suất 30 phút/lần, đạt yêu cầu cảm quan.`
- `dosage_form_stage` không bắt buộc, tối đa 50 ký tự. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`. Giá trị gợi ý: `tablet`, `capsule`, `film_coated_tablet`.
- `unit_1_result` bắt buộc.
- `unit_2_result` đến `unit_10_result` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- Các field `unit_*_result` khi có giá trị có thể gửi boolean, `1`/`0`, hoặc chuỗi như `Đạt`, `Không đạt`, `dat`, `khong dat`, `pass`, `fail`.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_result is required`
- `400 unit_3_result must be a boolean or pass/fail value`
- `401 Authenticated user not found`

### Cập nhật dữ liệu kiểm tra cảm quan 10 đơn vị

```http
PATCH /production-orders/ten-unit-sensory-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "dosage_form_stage": "tablet",
  "unit_2_result": null
}
```

Quy tắc:

- Có thể cập nhật `requirement`, `dosage_form_stage` và `unit_1_result` đến `unit_10_result`.
- `unit_2_result` đến `unit_10_result`, `requirement` và `dosage_form_stage` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `unit_1_result` không được xóa vì là giá trị bắt buộc.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 dosage_form_stage must be a string`
- `400 dosage_form_stage must be at most 50 characters`
- `400 unit_1_result is required`
- `400 unit_3_result must be a boolean or pass/fail value`
- `404 Ten-unit sensory check not found`

### Xóa dữ liệu kiểm tra cảm quan 10 đơn vị

```http
DELETE /production-orders/ten-unit-sensory-checks/:checkId
```

API trả về bản ghi vừa xóa.

Lỗi thường gặp:

- `404 Ten-unit sensory check not found`

## Production Order Sensory Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu các lần thử màu sắc, mùi, vị và hình ảnh của một lệnh sản xuất. Một lệnh sản xuất có thể có nhiều lần thử. Bảng này không có field `checked_at`; thời điểm tạo lấy từ `created_at`.

### Lấy danh sách thử mùi vị của lệnh sản xuất

```http
GET /production-orders/:id/sensory-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "color": "Vàng nhạt",
    "smell": "Thơm đặc trưng",
    "taste": "Ngọt nhẹ",
    "note": "Đạt yêu cầu cảm quan",
    "image_path": "/production-orders/sensory-checks/images/mau-thu-abc.jpg",
    "created_by_id": 7,
    "created_at": "2026-06-24T00:00:00.000Z",
    "updated_at": "2026-06-24T00:00:00.000Z",
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

### Lấy một bản ghi thử mùi vị theo ID

```http
GET /production-orders/sensory-checks/:checkId
```

Lỗi thường gặp:

- `404 Sensory check not found`

### Thêm dữ liệu thử mùi vị

```http
POST /production-orders/:id/sensory-checks
```

Nếu có ảnh, gửi `multipart/form-data`:

```text
color=Vàng nhạt
smell=Thơm đặc trưng
taste=Ngọt nhẹ
note=Đạt yêu cầu cảm quan
image=<file>
```

Tên field ảnh hợp lệ:

- `image`
- `sensory_image`

Nếu không có ảnh, có thể gửi JSON:

```json
{
  "color": "Vàng nhạt",
  "smell": "Thơm đặc trưng",
  "taste": "Ngọt nhẹ",
  "note": "Đạt yêu cầu cảm quan"
}
```

Quy tắc:

- Mỗi lần gọi API tạo một bản ghi thử mới.
- `color`, `smell`, `taste` không bắt buộc, tối đa 255 ký tự mỗi field.
- `note` không bắt buộc, lưu dạng ghi chú dài.
- `image` không bắt buộc, chỉ nhận JPG, PNG, WEBP hoặc GIF, tối đa 20MB.
- Phải có ít nhất một trong các dữ liệu: `color`, `smell`, `taste`, `note`, hoặc ảnh.
- `production_order_id` lấy từ `:id`.
- Người tạo dữ liệu là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.
- Không có field `checked_at`.

Lỗi thường gặp:

- `404 Production order not found`
- `400 At least one sensory check value is required`
- `400 color must be at most 255 characters`
- `400 smell must be at most 255 characters`
- `400 taste must be at most 255 characters`
- `400 note must be a string`
- `400 Only one sensory check image is allowed`
- `401 Authenticated user not found`

### Cập nhật dữ liệu thử mùi vị

```http
PATCH /production-orders/sensory-checks/:checkId
Content-Type: application/json
```

Body chỉ cần gửi field muốn cập nhật:

```json
{
  "color": "Vàng đậm",
  "note": "Kiểm lại theo mẫu chuẩn"
}
```

Nếu cần thay ảnh, gửi `multipart/form-data` với field ảnh `image` hoặc `sensory_image`:

```text
color=Vàng đậm
image=<file>
```

Quy tắc:

- Có thể cập nhật `color`, `smell`, `taste`, `note`, hoặc thay ảnh.
- `color`, `smell`, `taste`, `note` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- Sau cập nhật, bản ghi vẫn phải còn ít nhất một trong các dữ liệu: `color`, `smell`, `taste`, `note`, hoặc ảnh.
- Nếu gửi ảnh mới, backend cập nhật `image_path` và xóa file ảnh cũ nếu có.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 At least one sensory check value is required`
- `400 color must be at most 255 characters`
- `400 smell must be at most 255 characters`
- `400 taste must be at most 255 characters`
- `400 note must be a string`
- `400 Only one sensory check image is allowed`
- `404 Sensory check not found`

### Xóa dữ liệu thử mùi vị

```http
DELETE /production-orders/sensory-checks/:checkId
```

API trả về bản ghi vừa xóa. Nếu bản ghi có ảnh, backend xóa file ảnh tương ứng.

Lỗi thường gặp:

- `404 Sensory check not found`

### Xem ảnh thử mùi vị

```http
GET /production-orders/sensory-checks/images/:filename
```

Lỗi thường gặp:

- `404 Sensory check image not found`

## Production Order Date Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này dùng để tạo phiếu kiểm tra nội dung in date trên sản phẩm/bao bì thuộc một lệnh sản xuất. Nội dung yêu cầu in date nằm trong file `request_file`, DB chỉ lưu đường dẫn file.

File upload được lưu tại:

- File yêu cầu: `uploads/production-order-date-checks/request-files`
- Ảnh kiểm tra: `uploads/production-order-date-checks/images`

Tên file lưu trên server có dạng:

```text
<ten-goc-da-lam-sach>-<uuid>.<ext>
```

Ví dụ:

```text
yeu-cau-in-date-9f2f0a42-8c67-4e8c-8d4f-6f61f1c26d3e.pdf
```

Trong đó `ten-goc-da-lam-sach` giữ tên file gốc ở dạng an toàn, còn `uuid` tránh trùng tên file.

### Lấy danh sách phiếu kiểm tra date của lệnh sản xuất

```http
GET /production-orders/:id/date-checks
```

Response sắp xếp theo `checked_at` mới nhất trước, sau đó `created_at` và `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "package_type": "goi",
    "request_file_path": "/production-orders/date-checks/request-files/5fa1.pdf",
    "approval_status": "pending",
    "created_by_id": 7,
    "approved_by_id": null,
    "checked_at": "2026-06-15T08:00:00.000Z",
    "approved_at": null,
    "created_at": "2026-06-15T08:00:00.000Z",
    "updated_at": "2026-06-15T08:00:00.000Z",
    "createdBy": {
      "id": 7,
      "username": "binh",
      "name": "Binh",
      "email": "binh@example.com",
      "avatar": null,
      "department": "QA",
      "position": "Staff",
      "status": "active"
    },
    "approvedBy": null,
    "images": []
  }
]
```

Ghi chú:

- Khi mới tạo phiếu bằng `POST /production-orders/:id/date-checks`, `images` thường là mảng rỗng.
- Ảnh chỉ xuất hiện trong `images` sau khi gọi API riêng `POST /production-orders/date-checks/:checkId/images`.

Lỗi thường gặp:

- `404 Production order not found`

### Lấy chi tiết một phiếu kiểm tra date

```http
GET /production-orders/date-checks/:checkId
```

Response gồm thông tin lệnh sản xuất, người tạo, người duyệt và danh sách ảnh kèm người gửi ảnh nếu phiếu đã được upload ảnh bằng API riêng.

Lỗi thường gặp:

- `404 Date check not found`

### Tạo phiếu kiểm tra date

```http
POST /production-orders/:id/date-checks
```

Content-Type: `multipart/form-data`

Body:

```text
package_type=goi
request_file=<file>
```

Field upload:

- `package_type` bắt buộc. Ví dụ: `goi`, `lo`, `chai`, `hop`, `thung`.
- `request_file` là file nội dung yêu cầu in date, tùy chọn.
- API này chỉ dùng để tạo phiếu và upload `request_file`.
- Ảnh kiểm tra được upload bằng API riêng: `POST /production-orders/date-checks/:checkId/images`.
- Sau khi tạo phiếu, dùng `id` của phiếu trả về làm `checkId` để upload ảnh.

File hợp lệ:

- File yêu cầu: PDF, Word, Excel, TXT, CSV, JPG, PNG, WEBP, GIF.
- Dung lượng tối đa mỗi file: 20 MB.

Backend tự set:

- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.
- `approval_status = "pending"`.
- `checked_at` lấy theo thời điểm tạo.

Lỗi thường gặp:

- `404 Production order not found`
- `400 package_type is required`
- `400 request_file must be PDF, Word, Excel, TXT, CSV, JPG, PNG, WEBP, or GIF`
- `401 Authenticated user not found`

### Cập nhật phiếu kiểm tra date

```http
PATCH /production-orders/date-checks/:checkId
```

Content-Type: `multipart/form-data`

Body: gửi field cần đổi.

```text
package_type=lo
request_file=<file>
```

Quy tắc:

- Chỉ cập nhật khi `approval_status = "pending"`.
- Có thể đổi `package_type`.
- Có thể thay `request_file`; backend sẽ xóa file yêu cầu cũ khỏi thư mục upload.
- API này không thêm ảnh. Muốn thêm ảnh dùng API thêm ảnh riêng.

Lỗi thường gặp:

- `404 Date check not found`
- `400 No update data provided`
- `400 Date check is already approved or rejected`

### Duyệt hoặc từ chối phiếu kiểm tra date

```http
PATCH /production-orders/date-checks/:checkId/approval
```

Body:

```json
{
  "approval_status": "approved"
}
```

Giá trị hợp lệ:

- `approved`
- `rejected`

Backend tự set:

- `approved_by_id` lấy từ user đăng nhập.
- `approved_at` lấy theo thời điểm duyệt.

Quy tắc:

- Chỉ duyệt/từ chối khi phiếu còn `pending`.
- Sau khi `approved` hoặc `rejected`, API thường không cho sửa, thêm ảnh, xóa ảnh hoặc xóa phiếu.

Lỗi thường gặp:

- `404 Date check not found`
- `400 approval_status is required`
- `400 approval_status must be approved or rejected`
- `400 Date check is already approved or rejected`
- `401 Authenticated user not found`

### Xóa phiếu kiểm tra date

```http
DELETE /production-orders/date-checks/:checkId
```

Quy tắc:

- Xóa cứng bản ghi, không dùng `deleted_at`.
- Chỉ xóa khi `approval_status = "pending"`.
- DB tự cascade xóa các record ảnh của phiếu.
- Backend xóa cả file yêu cầu và file ảnh vật lý khỏi thư mục upload.

Lỗi thường gặp:

- `404 Date check not found`
- `400 Date check is already approved or rejected`

### Thêm ảnh vào phiếu kiểm tra date

```http
POST /production-orders/date-checks/:checkId/images
```

Content-Type: `multipart/form-data`

Body:

```text
images=<file>
images=<file>
```

Ghi chú:

- Field upload hỗ trợ `images` hoặc `image`.
- Tối đa 10 ảnh cho mỗi request.
- File hợp lệ: JPG, PNG, WEBP, GIF.
- Dung lượng tối đa mỗi file: 20 MB.
- Backend tự set `created_by_id` của ảnh theo user đăng nhập.
- Chỉ thêm ảnh khi phiếu còn `pending`.

Lỗi thường gặp:

- `404 Date check not found`
- `400 images are required`
- `400 images cannot exceed 10 files`
- `400 Date check is already approved or rejected`
- `401 Authenticated user not found`

### Xóa một ảnh kiểm tra date

```http
DELETE /production-orders/date-checks/images/:imageId
```

Quy tắc:

- Xóa cứng record ảnh.
- Xóa file ảnh vật lý khỏi thư mục upload.
- Chỉ xóa ảnh khi phiếu chứa ảnh còn `pending`.

Lỗi thường gặp:

- `404 Date check image not found`
- `400 Date check is already approved or rejected`

### Lấy file ảnh kiểm tra date

```http
GET /production-orders/date-checks/images/:filename
```

Response: file ảnh.

Lỗi thường gặp:

- `404 Date check image not found`

### Lấy file yêu cầu in date

```http
GET /production-orders/date-checks/request-files/:filename
```

Response: file yêu cầu.

Lỗi thường gặp:

- `404 Date check request file not found`

## Production Order Finished Product Summary

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách tổng kết thành phẩm của lệnh sản xuất

```http
GET /production-orders/:id/finished-product-summaries
```

Response trả về danh sách tổng kết, sắp xếp bản mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "package_count": 12,
    "boxes_per_package": 24,
    "loose_box_count": 3,
    "created_by_id": 7,
    "created_at": "2026-06-12T08:10:00.000Z",
    "updated_at": "2026-06-12T08:10:00.000Z",
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

### Lấy một tổng kết thành phẩm theo ID

```http
GET /production-orders/finished-product-summaries/:summaryId
```

Response mẫu:

```json
{
  "id": 1,
  "production_order_id": 2031,
  "package_count": 12,
  "boxes_per_package": 24,
  "loose_box_count": 3,
  "created_by_id": 7,
  "created_at": "2026-06-12T08:10:00.000Z",
  "updated_at": "2026-06-12T08:10:00.000Z",
  "createdBy": {
    "id": 7,
    "username": "binh",
    "name": "Binh",
    "email": "binh@example.com",
    "department": "QA",
    "position": "Staff"
  }
}
```

Lỗi thường gặp:

- `404 Finished product summary not found`

### Tạo tổng kết thành phẩm

```http
POST /production-orders/:id/finished-product-summaries
```

Body:

```json
{
  "package_count": 12,
  "boxes_per_package": 24,
  "loose_box_count": 3
}
```

Quy tắc:

- `package_count`: Số kiện, bắt buộc, là số nguyên không âm.
- `boxes_per_package`: Số hộp trên kiện, bắt buộc, là số nguyên không âm.
- `loose_box_count`: Số hộp lẻ, bắt buộc, là số nguyên không âm.
- Có thể gửi số dạng chuỗi, ví dụ `"12"`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.
- Một lệnh sản xuất có thể có nhiều bản tổng kết thành phẩm.

Lỗi thường gặp:

- `404 Production order not found`
- `400 package_count is required`
- `400 package_count must be a non-negative integer`
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
  "handling_result": "Ket qua xu ly",
  "cause": "Nguyen nhan",
  "cause_classification": "Phan loai nguyen nhan",
  "affected_quantity": 12.5,
  "affected_quantity_unit": "kg",
  "handled_quantity": 8,
  "handled_quantity_unit": "kg",
  "destroyed_quantity": 4.5,
  "destroyed_quantity_unit": "kg",
  "approver_id": 2,
  "reporter_id": 7,
  "deviation_images": ["/production-order-deviations/images/example.jpg"]
}
```

Cách 2: `multipart/form-data` upload ảnh:

```text
production_order_id=2031
deviation_content=Noi dung sai lech
handling_plan=Huong xu ly
handling_result=Ket qua xu ly
cause=Nguyen nhan
cause_classification=Phan loai nguyen nhan
affected_quantity=12.5
affected_quantity_unit=kg
handled_quantity=8
handled_quantity_unit=kg
destroyed_quantity=4.5
destroyed_quantity_unit=kg
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
- `handling_plan`, `handling_result`, `cause`, `cause_classification`, `affected_quantity`, `affected_quantity_unit`, `handled_quantity`, `handled_quantity_unit`, `destroyed_quantity`, `destroyed_quantity_unit` không bắt buộc.
- `affected_quantity`, `handled_quantity`, `destroyed_quantity` nhận số hoặc chuỗi số, hỗ trợ dấu phẩy thập phân, tối đa 3 chữ số sau dấu thập phân.

### Cập nhật sai lệch

```http
PUT /production-order-deviations/:id
```

Body: JSON hoặc `multipart/form-data`, gửi các field cần đổi.

```json
{
  "deviation_content": "Noi dung moi",
  "handling_plan": "Huong xu ly moi",
  "handling_result": "Ket qua xu ly moi",
  "cause": "Nguyen nhan moi",
  "cause_classification": "Phan loai moi",
  "affected_quantity": 10,
  "affected_quantity_unit": "hop",
  "handled_quantity": 7,
  "handled_quantity_unit": "hop",
  "destroyed_quantity": 3,
  "destroyed_quantity_unit": "hop",
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

Response là mảng specification. Mỗi phần tử trả đầy đủ thông tin specification, item, product line và người cập nhật:

```json
[
  {
    "item_code": "TP00001",
    "product_line_id": 1,
    "dosage_form": "Liquid",
    "lower_control_limit": "95.000000",
    "lower_control_limit_operator": ">=",
    "upper_control_limit": "105.000000",
    "upper_control_limit_operator": "<=",
    "lower_allowed_limit": "90.000000",
    "lower_allowed_limit_operator": ">=",
    "upper_allowed_limit": "110.000000",
    "upper_allowed_limit_operator": "<=",
    "unit": "%",
    "spray_dose_lower_allowed_limit": "90.000000",
    "spray_dose_upper_allowed_limit": "110.000000",
    "spray_dose_lower_control_limit": "95.000000",
    "spray_dose_upper_control_limit": "105.000000",
    "film_coated_tablet_weight_lower_control_limit": "195.000000",
    "film_coated_tablet_weight_upper_control_limit": "205.000000",
    "film_coated_tablet_weight_lower_allowed_limit": "190.000000",
    "film_coated_tablet_weight_upper_allowed_limit": "210.000000",
    "film_coated_tablet_weight_unit": "mg",
    "hardness_lower_control_limit": "75.000000",
    "hardness_upper_control_limit": "85.000000",
    "hardness_lower_allowed_limit": "70.000000",
    "hardness_upper_allowed_limit": "90.000000",
    "hardness_unit": "N",
    "tablet_thickness_control_limit": "4.200000",
    "tablet_thickness_allowed_limit": "4.400000",
    "tablet_thickness_unit": "mm",
    "disintegration_time_control_limit": "11.000000",
    "disintegration_time_allowed_limit": "12.500000",
    "disintegration_time_unit": "phút",
    "updated_by_id": 7,
    "created_at": "2026-07-28T08:00:00.000Z",
    "updated_at": "2026-07-28T09:00:00.000Z",
    "deleted_at": null,
    "item": {
      "item_code": "TP00001",
      "item_name": "Thanh pham A",
      "unit": "Hop",
      "dk_code": "DK001",
      "registration_id": 1,
      "created_at": "2026-07-28T08:00:00.000Z",
      "update_at": "2026-07-28T08:00:00.000Z",
      "deleted_at": null
    },
    "productLine": {
      "id": 1,
      "code": "LINE_A",
      "name": "Line A",
      "created_at": "2026-07-28T08:00:00.000Z",
      "updated_at": "2026-07-28T08:00:00.000Z"
    },
    "updatedBy": {
      "id": 7,
      "username": "user01",
      "name": "Nguyen Van A",
      "email": "user01@example.com",
      "department": "QA",
      "position": "Staff"
    }
  }
]
```

Các field decimal có thể trả về dạng chuỗi. Các field optional có thể là `null`, bao gồm `product_line_id`, `productLine`, `updated_by_id`, `updatedBy` và các field giới hạn chưa cấu hình.

### Lấy specification theo mã item

```http
GET /production-specifications/:item_code
```

Response là một object cùng cấu trúc với từng phần tử của API lấy danh sách:

```json
{
  "item_code": "TP00001",
  "product_line_id": 1,
  "dosage_form": "Liquid",
  "lower_control_limit": "95.000000",
  "lower_control_limit_operator": ">=",
  "upper_control_limit": "105.000000",
  "upper_control_limit_operator": "<=",
  "lower_allowed_limit": "90.000000",
  "lower_allowed_limit_operator": ">=",
  "upper_allowed_limit": "110.000000",
  "upper_allowed_limit_operator": "<=",
  "unit": "%",
  "spray_dose_lower_allowed_limit": "90.000000",
  "spray_dose_upper_allowed_limit": "110.000000",
  "spray_dose_lower_control_limit": "95.000000",
  "spray_dose_upper_control_limit": "105.000000",
  "film_coated_tablet_weight_lower_control_limit": "195.000000",
  "film_coated_tablet_weight_upper_control_limit": "205.000000",
  "film_coated_tablet_weight_lower_allowed_limit": "190.000000",
  "film_coated_tablet_weight_upper_allowed_limit": "210.000000",
  "film_coated_tablet_weight_unit": "mg",
  "hardness_lower_control_limit": "75.000000",
  "hardness_upper_control_limit": "85.000000",
  "hardness_lower_allowed_limit": "70.000000",
  "hardness_upper_allowed_limit": "90.000000",
  "hardness_unit": "N",
  "tablet_thickness_control_limit": "4.200000",
  "tablet_thickness_allowed_limit": "4.400000",
  "tablet_thickness_unit": "mm",
  "disintegration_time_control_limit": "11.000000",
  "disintegration_time_allowed_limit": "12.500000",
  "disintegration_time_unit": "phút",
  "updated_by_id": 7,
  "created_at": "2026-07-28T08:00:00.000Z",
  "updated_at": "2026-07-28T09:00:00.000Z",
  "deleted_at": null,
  "item": {
    "item_code": "TP00001",
    "item_name": "Thanh pham A",
    "unit": "Hop",
    "dk_code": "DK001",
    "registration_id": 1,
    "created_at": "2026-07-28T08:00:00.000Z",
    "update_at": "2026-07-28T08:00:00.000Z",
    "deleted_at": null
  },
  "productLine": {
    "id": 1,
    "code": "LINE_A",
    "name": "Line A",
    "created_at": "2026-07-28T08:00:00.000Z",
    "updated_at": "2026-07-28T08:00:00.000Z"
  },
  "updatedBy": {
    "id": 7,
    "username": "user01",
    "name": "Nguyen Van A",
    "email": "user01@example.com",
    "department": "QA",
    "position": "Staff"
  }
}
```

### Tạo specification

```http
POST /production-specifications
```

Body:

```json
{
  "item_code": "TP00001",
  "product_line_id": 1,
  "dosage_form": "Liquid",
  "lower_control_limit": 95,
  "lower_control_limit_operator": ">=",
  "upper_control_limit": 105,
  "upper_control_limit_operator": "<=",
  "lower_allowed_limit": 90,
  "lower_allowed_limit_operator": ">=",
  "upper_allowed_limit": 110,
  "upper_allowed_limit_operator": "<=",
  "unit": "%",
  "spray_dose_lower_allowed_limit": 90,
  "spray_dose_upper_allowed_limit": 110,
  "spray_dose_lower_control_limit": 95,
  "spray_dose_upper_control_limit": 105,
  "film_coated_tablet_weight_lower_control_limit": 195,
  "film_coated_tablet_weight_upper_control_limit": 205,
  "film_coated_tablet_weight_lower_allowed_limit": 190,
  "film_coated_tablet_weight_upper_allowed_limit": 210,
  "film_coated_tablet_weight_unit": "mg",
  "hardness_lower_control_limit": 75,
  "hardness_upper_control_limit": 85,
  "hardness_lower_allowed_limit": 70,
  "hardness_upper_allowed_limit": 90,
  "hardness_unit": "N",
  "tablet_thickness_control_limit": 4.2,
  "tablet_thickness_allowed_limit": 4.4,
  "tablet_thickness_unit": "mm",
  "disintegration_time_control_limit": 11,
  "disintegration_time_allowed_limit": 12.5,
  "disintegration_time_unit": "phút"
}
```

Quy tắc:

- `item_code` phải tồn tại trong bảng `items`.
- `product_line_id` là tùy chọn và phải tồn tại trong bảng `product_lines`.
- Backend vẫn nhận `product_line` dạng text để tương thích request cũ; nếu gửi text, hệ thống sẽ tìm hoặc tạo `product_lines` tương ứng.
- Các field giới hạn, bao gồm giới hạn số liều xịt, khối lượng viên nén bao phim, độ cứng, chiều dày viên và thời gian rã, là số thập phân, tối đa 6 chữ số sau dấu phẩy.
- Các field operator của giới hạn nhận một trong các giá trị `<`, `<=`, `>`, `>=`.
- `film_coated_tablet_weight_unit` là đơn vị khối lượng viên nén bao phim, ví dụ `mg` hoặc `g`.
- `hardness_unit` là đơn vị độ cứng. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu mặc định `N`.
- `tablet_thickness_unit` là đơn vị chiều dày viên. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu mặc định `mm`.
- `disintegration_time_unit` là đơn vị thời gian rã. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu mặc định `phút`.
- Nếu specification đã bị soft delete, API create/update có thể restore bản ghi.

Response include thêm `productLine`, `updated_by_id` và `updatedBy`.

### Cập nhật specification

```http
PUT /production-specifications/:item_code
```

Body: gửi các field cần đổi.

```json
{
  "lower_control_limit": 96,
  "lower_control_limit_operator": ">=",
  "upper_control_limit": 104,
  "upper_control_limit_operator": "<=",
  "unit": "%",
  "spray_dose_lower_allowed_limit": 90,
  "spray_dose_upper_allowed_limit": 110,
  "spray_dose_lower_control_limit": 95,
  "spray_dose_upper_control_limit": 105,
  "film_coated_tablet_weight_lower_control_limit": 195,
  "film_coated_tablet_weight_upper_control_limit": 205,
  "film_coated_tablet_weight_lower_allowed_limit": 190,
  "film_coated_tablet_weight_upper_allowed_limit": 210,
  "film_coated_tablet_weight_unit": "mg",
  "hardness_lower_control_limit": 75,
  "hardness_upper_control_limit": 85,
  "hardness_lower_allowed_limit": 70,
  "hardness_upper_allowed_limit": 90,
  "hardness_unit": "N",
  "tablet_thickness_control_limit": 4.2,
  "tablet_thickness_allowed_limit": 4.4,
  "tablet_thickness_unit": "mm",
  "disintegration_time_control_limit": 11,
  "disintegration_time_allowed_limit": 12.5,
  "disintegration_time_unit": "phút"
}
```

### Xóa mềm specification

```http
DELETE /production-specifications/:item_code
```

API này set `deleted_at`, không xóa cứng bản ghi.

## Product Lines

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách dây chuyền/dòng sản phẩm

```http
GET /product-lines
```

### Lấy product line theo id

```http
GET /product-lines/:id
```

### Lấy product line theo code

```http
GET /product-lines/code/:code
```

### Tạo product line

```http
POST /product-lines
```

Body:

```json
{
  "code": "LINE_A",
  "name": "Line A"
}
```

Nếu không gửi `code`, backend tự sinh từ `name`.

### Cập nhật product line

```http
PUT /product-lines/:id
```

Body gửi các field cần đổi:

```json
{
  "name": "Line A"
}
```

Gửi `"code": null` để backend sinh lại `code` từ `name`.

### Xóa product line

```http
DELETE /product-lines/:id
```

## Production Workshops

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách xưởng

```http
GET /production-workshops
```

### Lấy xưởng theo id

```http
GET /production-workshops/:id
```

### Tạo xưởng

```http
POST /production-workshops
```

Body:

```json
{
  "code": "X001",
  "name": "Xưởng sản xuất 1",
  "description": "Xưởng sản xuất chính",
  "address": "Khu A"
}
```

Trong đó `description` và `address` là tùy chọn.

### Cập nhật xưởng

```http
PUT /production-workshops/:id
```

Body gửi các field cần đổi:

```json
{
  "name": "Xưởng sản xuất 1",
  "description": "Xưởng sản xuất chính",
  "address": "Khu B"
}
```

### Xóa xưởng

```http
DELETE /production-workshops/:id
```

## Production Workshop Pressure Differentials

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách chênh áp theo xưởng

```http
GET /production-workshops/:id/pressure-differentials
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

### Lấy bản ghi chênh áp theo id

```http
GET /production-workshops/pressure-differentials/:pressureDifferentialId
```

### Tạo bản ghi chênh áp

```http
POST /production-workshops/:id/pressure-differentials
```

Body:

```json
{
  "gauge_name": "Đồng hồ khu pha chế",
  "differential_pressure": 15,
  "conclusion": "dat"
}
```

Trong đó:

- `differential_pressure` là số nguyên.
- `unit` được backend tự lưu là `Pa`.
- Thời điểm ghi nhận lấy từ `created_at`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

### Cập nhật bản ghi chênh áp

```http
PUT /production-workshops/pressure-differentials/:pressureDifferentialId
```

Body gửi các field cần đổi:

```json
{
  "gauge_name": "Đồng hồ khu pha chế",
  "differential_pressure": 16,
  "conclusion": "khong_dat"
}
```

### Xóa bản ghi chênh áp

```http
DELETE /production-workshops/pressure-differentials/:pressureDifferentialId
```

## Production Workshop Cleaning Checklists

Tất cả API trong nhóm này cần `Auth: Bearer`.

Checklist vệ sinh thuộc về một xưởng. `cleaned_by_id` là ID của người vệ sinh trong bảng `users`; backend kiểm tra user này tồn tại trước khi tạo hoặc cập nhật.

### Lấy danh sách checklist vệ sinh theo xưởng

```http
GET /production-workshops/:id/cleaning-checklists
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước. Mỗi bản ghi trả về kèm thông tin `workshop` và `cleanedBy`.

### Lấy checklist vệ sinh theo id

```http
GET /production-workshops/cleaning-checklists/:cleaningChecklistId
```

### Tạo checklist vệ sinh

```http
POST /production-workshops/:id/cleaning-checklists
```

Body:

```json
{
  "subject": "Bàn thao tác",
  "category": "Vệ sinh định kỳ",
  "requirement": "Sạch, không còn bụi và cặn bẩn",
  "result": "Đạt",
  "note": "Đã hoàn thành",
  "cleaned_by_id": 2
}
```

Trong đó:

- `subject`, `category`, `requirement`, `result`, `cleaned_by_id` là bắt buộc.
- `note` là tùy chọn; có thể gửi `null` để không lưu ghi chú.
- ID xưởng lấy từ `:id` trên URL, không gửi `workshop_id` trong body.
- `created_at` và `updated_at` được backend tự thiết lập.

### Cập nhật checklist vệ sinh

```http
PUT /production-workshops/cleaning-checklists/:cleaningChecklistId
```

Body gửi các field cần đổi:

```json
{
  "result": "Không đạt",
  "note": "Cần vệ sinh lại khu vực góc bàn",
  "cleaned_by_id": 3
}
```

### Xóa checklist vệ sinh

```http
DELETE /production-workshops/cleaning-checklists/:cleaningChecklistId
```

## Xét Duyệt Xuất Xưởng

Các API này nằm dưới module production order và yêu cầu Bearer token như các API `/production-orders` khác.

### Danh sách xét duyệt xuất xưởng theo lệnh sản xuất

```http
GET /production-orders/:id/factory-release-reviews
```

### Chi tiết xét duyệt xuất xưởng

```http
GET /production-orders/factory-release-reviews/:reviewId
```

### Tạo xét duyệt xuất xưởng

```http
POST /production-orders/:id/factory-release-reviews
```

Body:

```json
{
  "approved_by_id": 7,
  "registration_number": "Còn hiệu lực",
  "raw_material_test_result": "Đạt",
  "water_test_result": "Đạt",
  "compressed_air_test_result": "Đạt",
  "filter_integrity_test_result": "Đạt",
  "packaging_inspection_result": "Đạt",
  "finished_product_test_result": "Đạt",
  "sterilization_result": "Đạt",
  "online_particle_result": "Đạt",
  "yield_quantity": "Đạt yêu cầu",
  "deviation": "Không có",
  "environment_monitoring_result": "Đạt"
}
```

Quy tắc:

- `registration_number` bắt buộc.
- `approved_by_id` không bắt buộc; nếu gửi phải là id user tồn tại.
- Các field kết quả, `packaging_inspection_result`, `sterilization_result`, `online_particle_result`, `deviation`, `environment_monitoring_result` là text không bắt buộc.
- `yield_quantity` không bắt buộc, lưu dạng text.

### Cập nhật xét duyệt xuất xưởng

```http
PATCH /production-orders/factory-release-reviews/:reviewId
```

Body gửi các field cần đổi. Gửi `null` hoặc chuỗi rỗng để xóa các field không bắt buộc.

### Xóa xét duyệt xuất xưởng

```http
DELETE /production-orders/factory-release-reviews/:reviewId
```

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
  "html": "<p>Noi dung HTML</p>"
}
```

Quy tắc:

- `recipients` có thể là chuỗi, chuỗi phân tách bằng dấu phẩy, hoặc mảng chuỗi.
- `subject` bắt buộc.
- Cần có ít nhất một trong hai field: `message` hoặc `html`.
- Tên người gửi được cấu hình bằng biến môi trường `EMAIL_SENDER_NAME`.

## Filter Catalogs

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách danh mục lọc

```http
GET /filter-catalogs
```

Response mẫu:

```json
[
  {
    "id": 1,
    "filter_code": "LOC-001",
    "filter_type": "HEPA",
    "usable_steam_cycles": 25,
    "pre_filter_sensory_requirement": "Màng sạch, không rách",
    "post_filter_sensory_requirement": "Không biến dạng",
    "integrity_requirement": "Không rò rỉ",
    "description": "Lọc khí",
    "production_order_filtration_checks_count": 3,
    "created_by_id": 7,
    "created_at": "2026-08-05T00:00:00.000Z",
    "updated_at": "2026-08-05T00:00:00.000Z",
    "createdBy": {
      "id": 7,
      "username": "binh",
      "name": "Binh"
    }
  }
]
```

`production_order_filtration_checks_count` là tổng số bản ghi `ProductionOrderFiltrationChecks` đang tham chiếu đến danh mục lọc tương ứng.

### Lấy danh mục lọc theo ID

```http
GET /filter-catalogs/:id
```

Response của API chi tiết có thêm `productionOrderFiltrationChecks`: danh sách các lần màng lọc đã được sử dụng trong quá trình lọc, sắp xếp theo `id` mới nhất trước. Mỗi lần sử dụng bao gồm lệnh sản xuất, vị trí lọc, thời điểm bắt đầu/kết thúc lọc và thông tin người hấp, người lọc, người kiểm tra sau lọc.

Ví dụ phần dữ liệu lần sử dụng:

```json
{
  "productionOrderFiltrationChecks": [
    {
      "id": 15,
      "production_order_id": 2031,
      "filter_position": "Bồn pha chế số 1",
      "filtering_started_at": "2026-08-06T08:00:00.000Z",
      "filtering_finished_at": "2026-08-06T09:00:00.000Z",
      "productionOrder": {
        "id": 2031,
        "item_code": "SP-001",
        "item": {
          "item_name": "Tên sản phẩm"
        },
        "production_order_code": "LSX-2031",
        "lot_no": "LOT-001"
      },
      "sterilizedBy": { "id": 7, "name": "Nguyễn Văn A" },
      "filteredBy": { "id": 8, "name": "Trần Văn B" },
      "inspectedAfterFilterBy": { "id": 9, "name": "Lê Văn C" }
    }
  ]
}
```

Nếu màng lọc chưa từng được sử dụng, `productionOrderFiltrationChecks` là mảng rỗng `[]`.

### Tạo danh mục lọc

```http
POST /filter-catalogs
Content-Type: application/json
```

```json
{
  "filter_code": "LOC-001",
  "filter_type": "HEPA",
  "usable_steam_cycles": 25,
  "pre_filter_sensory_requirement": "Màng sạch, không rách",
  "post_filter_sensory_requirement": "Không biến dạng",
  "integrity_requirement": "Không rò rỉ",
  "description": "Lọc khí"
}
```

Quy tắc:

- `filter_code` và `filter_type` là bắt buộc; `filter_code` là duy nhất.
- `usable_steam_cycles` không bắt buộc. Có thể gửi số nguyên không âm, chuỗi số nguyên, hoặc `null`; `null`/chuỗi rỗng được lưu là `null`.
- `pre_filter_sensory_requirement` (yêu cầu cảm quan trước lọc), `post_filter_sensory_requirement` (yêu cầu cảm quan sau lọc) và `integrity_requirement` (yêu cầu toàn vẹn) không bắt buộc; `null`/chuỗi rỗng được lưu là `null`.
- `description` không bắt buộc; `null`/chuỗi rỗng được lưu là `null`.
- `created_by_id` lấy từ người dùng đăng nhập, không nhận từ body.

### Cập nhật danh mục lọc

```http
PATCH /filter-catalogs/:id
Content-Type: application/json
```

Body chỉ cần gửi các trường muốn thay đổi. Ví dụ:

```json
{
  "usable_steam_cycles": null,
  "pre_filter_sensory_requirement": "Màng sạch, không rách",
  "post_filter_sensory_requirement": "Không biến dạng",
  "integrity_requirement": "Không rò rỉ",
  "description": "Đã cập nhật"
}
```

### Xóa danh mục lọc

```http
DELETE /filter-catalogs/:id
```

Lỗi thường gặp:

- `404 Filter catalog not found`
- `409 Filter code already exists`
- `400 usable_steam_cycles must be a non-negative integer`

## App Root

Các route này hiện có trong `AppController`, chủ yếu dùng kiểm tra server.

```http
GET /
POST /
```

## Module Chưa Có Endpoint Public

Các controller sau đang tồn tại nhưng chưa khai báo route xử lý request:

- `ExternalSyncController`
