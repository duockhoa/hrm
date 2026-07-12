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

### Lấy role của user

```http
GET /users/:id/roles
```

Response gồm danh sách `userRoles`, mỗi item include `roles` và `rolePermissions`.

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

## Items

Tất cả API trong nhóm này cần `Auth: Bearer`.

### Lấy danh sách item

```http
GET /items
```

Response include `productionSpecification`. Nếu specification có `product_line_id`, response include thêm `productionSpecification.productLine`.

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

Response include `productionSpecification`. Nếu specification có `product_line_id`, response include thêm `productionSpecification.productLine`.

## Features

Tất cả API trong nhóm này cần `Auth: Bearer`.

`features` là danh mục action/view chuẩn. `item_features` là liên kết item nào bật action/view nào.

### Lấy danh sách feature

```http
GET /features
```

### Lấy feature theo id

```http
GET /features/:id
```

### Lấy feature theo key

```http
GET /features/key/:key
```

### Tạo feature

```http
POST /features
```

Body:

```json
{
  "key": "environment_checks",
  "kind": "section",
  "label": "Nhiệt độ/độ ẩm",
  "default_order": 10
}
```

### Cập nhật feature

```http
PUT /features/:id
```

Body:

```json
{
  "label": "Nhiệt độ/độ ẩm",
  "default_order": 10
}
```

### Xóa feature

```http
DELETE /features/:id
```

### Lấy action/view theo item

```http
GET /features/items/:item_code
GET /features/items/:item_code?includeDisabled=true
```

Response là danh sách raw từ bảng `item_features`.

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
      "order": 10,
      "enabled": true
    },
    {
      "feature_id": 2,
      "key": "environment_checks",
      "kind": "section",
      "label": "Nhiệt độ/độ ẩm",
      "order": 10,
      "enabled": true
    }
  ]
}
```

### Bật hoặc cập nhật feature cho item

```http
POST /features/items/:item_code
```

Body dùng `feature_id` hoặc `feature_key`:

```json
{
  "feature_key": "environment_checks",
  "enabled": true,
  "order": 10
}
```

### Cập nhật liên kết item-feature

```http
PUT /features/items/:item_code/:feature_id
```

Body:

```json
{
  "enabled": false,
  "order": 20
}
```

### Xóa liên kết item-feature

```http
DELETE /features/items/:item_code/:feature_id
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

Response có thêm field `pyclm` dựa trên sampling request mới nhất và `featureConfig` dựa trên cấu hình action/view của `item_code`.

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
  "water_pycnometer_mass_g": 75.5
}
```

Quy tắc:

- Các khối lượng là bắt buộc, lưu dạng `DECIMAL(12, 4)`.
- Có thể gửi số dạng chuỗi, ví dụ `"25.0000"` hoặc `"25,0000"`.
- `solution_pycnometer_mass_g` phải lớn hơn `empty_pycnometer_mass_g`.
- `water_pycnometer_mass_g` phải lớn hơn `empty_pycnometer_mass_g`.
- Backend tự tính và lưu `density`; frontend không gửi field này.
- Công thức: `(solution_pycnometer_mass_g - empty_pycnometer_mass_g) / (water_pycnometer_mass_g - empty_pycnometer_mass_g)`.
- Thời điểm kiểm tra là `created_at`, lấy theo thời điểm tạo bản ghi.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 empty_pycnometer_mass_g is required`
- `400 water_pycnometer_mass_g must be greater than empty_pycnometer_mass_g`
- `401 Authenticated user not found`

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

Nhóm API này dùng để lưu kiểm tra số lượng liều xịt của sản phẩm theo từng lệnh sản xuất. Frontend gửi số liều xịt của 4 lọ, backend tự lưu người kiểm tra từ user đăng nhập.

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
    "bottle_1_spray_dose_count": 120,
    "bottle_2_spray_dose_count": 121,
    "bottle_3_spray_dose_count": 122,
    "bottle_4_spray_dose_count": 123,
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
  "bottle_1_spray_dose_count": 120,
  "bottle_2_spray_dose_count": 121,
  "bottle_3_spray_dose_count": 122,
  "bottle_4_spray_dose_count": 123
}
```

Quy tắc:

- Bốn số liều xịt là bắt buộc, lưu dạng `INTEGER`.
- Có thể gửi số dạng chuỗi, ví dụ `"120"`.
- Các số liều xịt phải là số nguyên dương.
- Đơn vị mặc định là `dose`, backend tự lưu `unit = "dose"`.
- Thời điểm kiểm tra là `created_at`, lấy theo thời điểm tạo bản ghi.
- `created_by_id` là người kiểm tra, lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 bottle_1_spray_dose_count is required`
- `400 bottle_4_spray_dose_count must be a positive integer`
- `401 Authenticated user not found`

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
  "dosage_form_stage": "film_coated_tablet",
  "unit_1_passed": "Đạt"
}
```

Quy tắc:

- `dosage_form_stage` bắt buộc và không được rỗng.
- `dosage_form_stage` có thể dùng các giá trị như `tablet`, `film_coated_tablet`, `capsule`.
- `unit_1_passed` bắt buộc.
- `unit_2_passed` đến `unit_6_passed` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- Các field `unit_*_passed` khi có giá trị có thể gửi boolean, `1`/`0`, hoặc chuỗi như `Đạt`, `Không đạt`, `dat`, `khong dat`, `pass`, `fail`.
- Backend normalize kết quả về boolean hoặc `null` trước khi lưu DB.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.
- `checked_at` lấy theo thời điểm tạo bản ghi.

Lỗi thường gặp:

- `404 Production order not found`
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
  "dosage_form_stage": "film_coated_tablet",
  "unit_6_passed": null
}
```

Quy tắc validate và normalize giống API tạo. Với `unit_2_passed` đến `unit_6_passed`, gửi `null` hoặc chuỗi rỗng sẽ cập nhật field đó về `null`. Riêng `unit_1_passed` vẫn bắt buộc có giá trị hợp lệ nếu được gửi trong body.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `dosage_form_stage` và `unit_*_passed` giống API tạo.
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

## Production Order Bottle Volume Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu các lần kiểm tra thể tích của tối đa 6 lọ thuộc một lệnh sản xuất. Mỗi bản ghi cần ít nhất 1 giá trị thể tích và có đơn vị cố định là `ml`.

### Lấy danh sách kiểm tra thể tích 6 lọ

```http
GET /production-orders/:id/bottle-volume-checks
```

Response sắp xếp theo `created_at` mới nhất trước, sau đó `id` mới nhất trước.

Response mẫu:

```json
[
  {
    "id": 1,
    "production_order_id": 2031,
    "bottle_1_volume": "10.01",
    "bottle_2_volume": null,
    "bottle_3_volume": null,
    "bottle_4_volume": null,
    "bottle_5_volume": null,
    "bottle_6_volume": null,
    "unit": "ml",
    "created_by_id": 7,
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

### Lấy một bản ghi kiểm tra thể tích theo ID

```http
GET /production-orders/bottle-volume-checks/:checkId
```

Lỗi thường gặp:

- `404 Bottle volume check not found`

### Thêm dữ liệu kiểm tra thể tích 6 lọ

```http
POST /production-orders/:id/bottle-volume-checks
```

Body:

```json
{
  "bottle_1_volume": 10.01
}
```

Quy tắc:

- Phải nhập ít nhất 1 trong 6 field `bottle_1_volume` đến `bottle_6_volume`; các field còn thiếu được lưu là `null`.
- Mỗi giá trị được nhập phải lớn hơn `0`, lưu dạng `DECIMAL(10, 2)` và có tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `10.02`, `"10.02"` hoặc `"10,02"`.
- `unit` luôn là `ml`, do backend tự lưu; frontend không gửi field này.
- `production_order_id` lấy từ `:id`.
- Người kiểm tra là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.
- `created_at` là thời điểm kiểm tra.

Lỗi thường gặp:

- `404 Production order not found`
- `400 At least one bottle volume is required`
- `400 bottle_1_volume must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 bottle_1_volume must be greater than 0`
- `401 Authenticated user not found`

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

## Production Order Shell Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu các lần kiểm tra khối lượng của 10 vỏ thuộc một lệnh sản xuất. Mỗi bản ghi bắt buộc có đủ 10 khối lượng và có đơn vị cố định là `mg`.

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
    "unit": "mg",
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
  "shell_10_weight": 49.96
}
```

Quy tắc:

- Cả 10 field `shell_1_weight` đến `shell_10_weight` đều bắt buộc và phải lớn hơn `0`.
- Mỗi giá trị lưu dạng `DECIMAL(10, 2)`, tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `50.02`, `"50.02"` hoặc `"50,02"`.
- `unit` luôn là `mg`, do backend tự lưu; frontend không gửi field này.
- `production_order_id` lấy từ `:id`.
- Người kiểm tra là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.
- `created_at` là thời điểm kiểm tra.

Lỗi thường gặp:

- `404 Production order not found`
- `400 shell_1_weight is required`
- `400 shell_1_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 shell_1_weight must be greater than 0`
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
  "shell_7_weight": 50.15
}
```

Quy tắc:

- Có thể cập nhật một hoặc nhiều field từ `shell_1_weight` đến `shell_10_weight`.
- Mỗi giá trị được gửi phải lớn hơn `0`, lưu dạng `DECIMAL(10, 2)` và có đơn vị cố định là `mg`.
- API trả về bản ghi sau khi cập nhật, kèm thông tin `createdBy`.

Lỗi thường gặp:

- `400 At least one field is required`
- `400 shell_1_weight is required`
- `400 shell_1_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 shell_1_weight must be greater than 0`
- `404 Shell weight check not found`

## Production Order Ten-Shell Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu khối lượng chung của 10 vỏ nang thuộc một lệnh sản xuất. Đây là tính năng riêng với nhóm `Production Order Shell Weight Checks` phía trên. Mỗi lệnh sản xuất chỉ có 1 bản ghi khối lượng chung 10 vỏ nang và có đơn vị cố định là `mg`.

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
  "unit": "mg",
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
  "ten_shells_weight": 500.04
}
```

Quy tắc:

- Mỗi lệnh sản xuất chỉ có 1 bản ghi khối lượng chung 10 vỏ nang.
- Nếu chưa có dữ liệu thì API tạo mới; nếu đã có thì API cập nhật `ten_shells_weight`.
- `ten_shells_weight` bắt buộc và phải lớn hơn `0`.
- `ten_shells_weight` lưu dạng `DECIMAL(10, 2)`, tối đa 2 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `500.04`, `"500.04"` hoặc `"500,04"`.
- `unit` luôn là `mg`, do backend tự lưu; frontend không gửi field này.
- `production_order_id` lấy từ `:id`.
- Người tạo dữ liệu là user đăng nhập, lưu ở `created_by_id`; frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
- `400 ten_shells_weight is required`
- `400 ten_shells_weight must fit DECIMAL(10, 2) with up to 2 decimal places`
- `400 ten_shells_weight must be greater than 0`
- `401 Authenticated user not found`

## Production Order Semi-Finished Gross Weight Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu yêu cầu tại thời điểm nhập và khối lượng bán thành phẩm cả vỏ của tối đa 10 đơn vị. Một lệnh sản xuất có thể có nhiều lần kiểm tra. Đơn vị luôn là `g`; chỉ đơn vị 1 là bắt buộc.

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
  "unit_1_gross_weight": 0.501,
  "unit_10_gross_weight": 0.505
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `unit_1_gross_weight` bắt buộc và phải lớn hơn `0`.
- `unit_2_gross_weight` đến `unit_10_gross_weight` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Khi có giá trị, khối lượng phải lớn hơn `0`, lưu dạng `DECIMAL(10, 3)` và tối đa 3 chữ số sau dấu phẩy.
- Có thể gửi số hoặc chuỗi số dùng dấu chấm/dấu phẩy, ví dụ `0.501`, `"0.501"` hoặc `"0,501"`.
- `unit` luôn là `g`, backend tự lưu; frontend không gửi field này.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
- `400 unit_1_gross_weight is required`
- `400 unit_1_gross_weight must fit DECIMAL(10, 3) with up to 3 decimal places`
- `400 unit_1_gross_weight must be greater than 0`
- `400 unit_2_gross_weight must fit DECIMAL(10, 3) with up to 3 decimal places`
- `400 unit_2_gross_weight must be greater than 0`
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
  "unit_3_gross_weight": null
}
```

`unit_2_gross_weight` đến `unit_10_gross_weight` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị. `unit_1_gross_weight` không được xóa vì là giá trị bắt buộc.
`requirement` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

Lỗi thường gặp:

- `400 At least one field is required`
- Các lỗi kiểm tra `requirement` và khối lượng giống API tạo.
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
  "unit_1_net_weight": 0.401,
  "unit_2_net_weight": 0.398,
  "unit_10_net_weight": 0.405,
  "unit": "g"
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
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
  "unit_3_net_weight": null,
  "unit": "mg"
}
```

`unit_2_net_weight` đến `unit_10_net_weight` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị. `unit_1_net_weight` không được xóa vì là giá trị bắt buộc. `unit` có thể sửa, nhưng không được gửi `null` hoặc chuỗi rỗng trong API cập nhật.
`requirement` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

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

## Production Order Leak Tightness Checks

Tất cả API trong nhóm này cần `Auth: Bearer`.

Nhóm API này lưu yêu cầu tại thời điểm nhập và kết quả kiểm tra độ kín của tối đa 10 đơn vị. Một lệnh sản xuất có thể có nhiều lần kiểm tra; chỉ đơn vị 1 là bắt buộc.

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
    "requirement": "Không được rò rỉ",
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
  "requirement": "Không được rò rỉ",
  "unit_1_result": true,
  "unit_2_result": "đạt",
  "unit_3_result": "không kín"
}
```

Quy tắc:

- `requirement` không bắt buộc và được lưu dạng `TEXT`. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- `unit_1_result` bắt buộc.
- `unit_2_result` đến `unit_10_result` không bắt buộc. Nếu không gửi, gửi `null` hoặc chuỗi rỗng thì backend lưu `null`.
- Frontend nên gửi `true` cho đạt/kín và `false` cho không đạt/không kín.
- Backend cũng chấp nhận `1`, `0`, `"pass"`, `"fail"`, `"đạt"`, `"không đạt"`, `"kín"` và `"không kín"`.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập.

Lỗi thường gặp:

- `404 Production order not found`
- `400 requirement must be a string`
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
  "unit_2_result": false,
  "unit_3_result": null
}
```

`unit_2_result` đến `unit_10_result` có thể gửi `null` hoặc chuỗi rỗng để xóa kết quả. `unit_1_result` không được xóa vì là giá trị bắt buộc. `requirement` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.

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
    "requirement": "Đạt yêu cầu cảm quan",
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
    "note": "Theo mẫu chuẩn",
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
  "requirement": "Đạt yêu cầu cảm quan",
  "unit_1_result": "Đạt",
  "unit_2_result": "Đạt",
  "unit_3_result": "Không đạt",
  "note": "Theo mẫu chuẩn"
}
```

Quy tắc:

- `requirement` không bắt buộc. Nếu không gửi, gửi `null`, hoặc chuỗi rỗng thì backend lưu `null`.
- `unit_1_result` bắt buộc.
- `unit_2_result` đến `unit_10_result` không bắt buộc. Nếu không gửi, gửi `null`, hoặc gửi chuỗi rỗng thì backend lưu `null`.
- Các field `unit_*_result` khi có giá trị có thể gửi boolean, `1`/`0`, hoặc chuỗi như `Đạt`, `Không đạt`, `dat`, `khong dat`, `pass`, `fail`.
- `note` không bắt buộc. Nếu không gửi, gửi `null`, hoặc chuỗi rỗng thì backend lưu `null`.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.

Lỗi thường gặp:

- `404 Production order not found`
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
  "unit_2_result": null,
  "note": "Kiểm lại theo mẫu chuẩn"
}
```

Quy tắc:

- Có thể cập nhật `requirement`, `unit_1_result` đến `unit_10_result`, và `note`.
- `unit_2_result` đến `unit_10_result`, `requirement`, `note` có thể gửi `null` hoặc chuỗi rỗng để xóa giá trị.
- `unit_1_result` không được xóa vì là giá trị bắt buộc.

Lỗi thường gặp:

- `400 At least one field is required`
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
  "product_line_id": 1,
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
- `product_line_id` là tùy chọn và phải tồn tại trong bảng `product_lines`.
- Backend vẫn nhận `product_line` dạng text để tương thích request cũ; nếu gửi text, hệ thống sẽ tìm hoặc tạo `product_lines` tương ứng.
- Các field giới hạn là số thập phân, tối đa 6 chữ số sau dấu phẩy.
- Nếu specification đã bị soft delete, API create/update có thể restore bản ghi.

Response include thêm `productLine`.

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

## App Root

Các route này hiện có trong `AppController`, chủ yếu dùng kiểm tra server.

```http
GET /
POST /
```

## Module Chưa Có Endpoint Public

Các controller sau đang tồn tại nhưng chưa khai báo route xử lý request:

- `ExternalSyncController`
