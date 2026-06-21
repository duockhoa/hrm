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
  "unit_1_passed": "Đạt",
  "unit_2_passed": "Đạt",
  "unit_3_passed": true,
  "unit_4_passed": "Không đạt",
  "unit_5_passed": false,
  "unit_6_passed": "khong dat"
}
```

Quy tắc:

- `dosage_form_stage` bắt buộc và không được rỗng.
- `dosage_form_stage` có thể dùng các giá trị như `tablet`, `film_coated_tablet`, `capsule`.
- `unit_1_passed` đến `unit_6_passed` đều bắt buộc.
- Các field `unit_*_passed` có thể gửi boolean, `1`/`0`, hoặc chuỗi như `Đạt`, `Không đạt`, `dat`, `khong dat`, `pass`, `fail`.
- Backend normalize kết quả về boolean trước khi lưu DB.
- `production_order_id` lấy từ `:id`.
- `created_by_id` lấy từ user đăng nhập, frontend không gửi field này.
- `checked_at` lấy theo thời điểm tạo bản ghi.

Lỗi thường gặp:

- `404 Production order not found`
- `400 dosage_form_stage is required`
- `400 unit_1_passed is required`
- `400 unit_6_passed must be pass or fail`
- `401 Authenticated user not found`

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
