# Phiếu cân theo lệnh sản xuất

Phạm vi hiện tại: bảng phiếu cân `production_order_weighing_records`, nguyên liệu `production_order_weighing_record_lines` và từng lần cân thực tế `production_order_weighing_record_details`.

Quan hệ: một `production_orders` có nhiều phiếu cân qua `production_order_id`. Không thể xóa lệnh đang có phiếu cân (`ON DELETE RESTRICT`).

## Nút trên giao diện

Danh mục nút có action **Phiếu cân**, key `view_weighing_record`, nhóm **Biểu mẫu Pha chế**. Bật action này trong cấu hình nút của mã hàng để hiển thị nút trên chi tiết lô bán thành phẩm, lô thành phẩm và tổng hợp lô. Cấu hình độc lập với `view_mixing_record`; các lô đã chốt snapshot cấu hình tiếp tục dùng snapshot hiện có.

Bấm **Phiếu cân** để mở danh sách inline, có nút quay lại và **Thêm phiếu cân**. Form chỉ nhập mô tả; sau khi lưu cập nhật danh sách của đúng lệnh đang xem. Danh sách dùng mô tả làm tên phiếu. Bấm một phiếu để xem thông tin chung và thông tin duyệt.

## API

### Nhiều ảnh cho từng lần cân

Bảng `production_order_weighing_record_detail_images` có `id`, `production_order_weighing_record_detail_id` (FK tới lần cân, xóa cascade), `image_path`, `created_at`. Một lần cân có nhiều ảnh; API trả mảng `images` theo ID tăng dần. Migration sao chép đường dẫn ảnh cũ sang bảng mới. Giữ `image_path` trên lần cân để tương thích; giá trị này trỏ tới ảnh đầu tiên.

- POST tạo lần cân: multipart gồm `net_weight`, `note` tùy chọn và nhiều phần `images`. Tối đa 20 ảnh/request, mỗi ảnh tối đa 20 MB, định dạng JPG/PNG/WEBP/GIF. Lưu lần cân và các dòng ảnh trong cùng transaction; dọn tệp nếu request thất bại. Trường `image` cũ vẫn được hỗ trợ.
- `POST /production-orders/weighing-records/:recordId/lines/:lineId/details/:detailId/images`: tải thêm nhiều ảnh, không thay thế ảnh hiện có; quyền `production-orders.update`.
- `DELETE /production-orders/weighing-records/:recordId/lines/:lineId/details/:detailId/images/:imageId`: xóa riêng một ảnh thuộc lần cân; quyền `production-orders.update`.
- Các endpoint `/image` cũ tiếp tục thay thế/xóa toàn bộ ảnh. Tất cả thao tác ảnh vẫn khóa sau chữ ký đầu tiên; truy cập ảnh kế thừa phạm vi lệnh sản xuất.

Form nhập lần cân cho phép chọn nhiều ảnh và chụp bổ sung; có thể bỏ riêng từng ảnh trước khi lưu. Bảng chi tiết lần cân hiển thị toàn bộ ảnh với chức năng xem lớn.

Trong form thêm hàng hóa theo giai đoạn, nút **Thêm thủ công** mở bảng nguyên vật liệu của lệnh sản xuất. Có thể tìm kiếm và chọn nhiều dòng; các dòng đã thêm được đánh dấu và không thể chọn lại. Dữ liệu được sao chép từ nguồn phía server, lưu toàn bộ lựa chọn trong một transaction và khóa thêm sau khi phiếu có chữ ký.

- `GET /production-orders/weighing-records/:recordId/source-materials`: danh sách dòng `pit_Item`, gồm cả dòng không có giai đoạn và cờ `imported`; quyền `production-orders.read`.
- `POST /production-orders/weighing-records/:recordId/import-lines`: body `{ "line_numbers": [0, 1] }`, lấy đúng các dòng thuộc lệnh của phiếu; quyền `production-orders.create`. Từ chối lựa chọn trùng, dòng ngoài lệnh và dòng đã thêm.

Section **Phiếu cân** dùng key `weighing_records`, kind `section`, nhóm **Biểu mẫu Pha chế**, độc lập với action `view_weighing_record`. Migration khởi tạo bật/tắt và thứ tự từ cấu hình action hiện có của từng mã hàng. Section hiển thị số lượng và danh sách phiếu, bấm một phiếu để mở detail; tạo phiếu qua nút action. Có thể đặt section bắt buộc: đạt khi có ít nhất một phiếu đã lưu thuộc lệnh này. Các lô có snapshot tiếp tục dùng cấu hình đã chốt.

Tất cả endpoint yêu cầu `Authorization: Bearer <accessToken>`. Quyền dùng chung nhóm `production-orders`, giống phiếu pha chế. Phạm vi truy cập lệnh sản xuất và audit log kế thừa Prisma extension hiện tại.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | `/production-orders/:id/weighing-records` | `production-orders.read` |
| POST | `/production-orders/:id/weighing-records` | `production-orders.create` |
| GET | `/production-orders/weighing-records/:recordId` | `production-orders.read` |
| PATCH | `/production-orders/weighing-records/:recordId` | `production-orders.update` |
| DELETE | `/production-orders/weighing-records/:recordId` | `production-orders.delete` |
| PATCH | `/production-orders/weighing-records/:recordId/qa-staff-approval` | `production-orders.update` |
| PATCH | `/production-orders/weighing-records/:recordId/ipc-staff-approval` | `production-orders.update` |

POST body:

```json
{
  "description": "Phiếu cân nguyên liệu"
}
```

Chỉ nhận trường `description` (tùy chọn, có thể gửi `{}`). Người tạo lấy từ tài khoản đăng nhập; trạng thái ban đầu là `draft`. Phiếu dùng `id` nội bộ, không có mã phiếu.

PATCH body (gửi ít nhất một trường):

```json
{
  "description": "Đã hoàn tất cân",
  "status": "completed"
}
```

Cho phép sửa `description`, `status`. Trạng thái được nhập: `draft`, `in_progress`, `completed`, `cancelled`. Gửi `description: null` để xóa nội dung. Các trường khác bị từ chối, bao gồm ID người tạo và thông tin duyệt.

Duyệt QA/IPC không cần body. Có thể ký duyệt trực tiếp ở mọi trạng thái, không cần hoàn tất phiếu trước. Mỗi chữ ký chỉ được ghi một lần; người duyệt và thời gian do server ghi. Phiếu khóa sửa/xóa ngay khi có một chữ ký. Khi đủ cả QA và IPC, trạng thái tự chuyển thành `approved`. API duyệt dùng quyền update giống phiếu pha chế hiện tại, chưa kiểm tra chức danh QA/IPC riêng.

Cuối detail phiếu cân có hai cột phê duyệt **Nhân viên ĐBCL (QA)** và **Nhân viên IPC**, hiển thị dấu đã duyệt, tên và thời điểm ký. QA/IPC ký duyệt trực tiếp, không có bước **Hoàn tất phiếu** trước khi ký. Sau mỗi thao tác, cập nhật dữ liệu detail và danh sách; ngay sau chữ ký đầu tiên, giao diện khóa thêm nguyên liệu theo quy tắc backend. Các thao tác dùng quyền `production-orders.update` hiện có.

Danh sách trả về mảng theo ngày tạo và ID giảm dần. Các API khác trả về object phiếu với `createdBy`, `qaStaffApprovedBy`, `ipcStaffApprovedBy` (chỉ `id`, `username`, `name`).

Lỗi: `400` dữ liệu/trạng thái không hợp lệ; `401` chưa đăng nhập; `403` thiếu quyền; `404` lệnh/phiếu không tồn tại hoặc ngoài phạm vi truy cập; `409` phiếu đã ký hoặc có thay đổi đồng thời (tải lại rồi thử lại).

## Nguyên liệu cần cân

Mỗi dòng thuộc một phiếu qua `production_order_weighing_record_id`. Không có trường `line_order`; danh sách sắp theo mã hàng (`item_code`) tăng dần, các dòng cùng mã sắp theo `id` tăng dần. Không đặt unique theo mã nguyên liệu/lô, cho phép cùng nguyên liệu xuất hiện trong nhiều giai đoạn.

Base URL: `/production-orders/weighing-records/:recordId/lines`.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | Base URL | `production-orders.read` |
| GET | Base URL + `/:lineId` | `production-orders.read` |
| POST | Base URL | `production-orders.create` |
| PATCH | Base URL + `/:lineId` | `production-orders.update` |
| DELETE | Base URL + `/:lineId` | `production-orders.delete` |

Ví dụ tạo dòng:

```json
{
  "source_line_number": 0,
  "source_stage_id": 2,
  "stage_name": "Cân nguyên liệu",
  "item_code": "NL001",
  "item_name": "Nguyên liệu A",
  "lot_no": "NL20261001",
  "planned_quantity": "12.345678",
  "unit": "kg",
  "note": null
}
```

Bắt buộc: `item_code`, `item_name`, `planned_quantity`, `unit`. Số lượng phải lớn hơn 0, tối đa 12 chữ số nguyên và 6 chữ số thập phân; ưu tiên truyền chuỗi để giữ độ chính xác. Response trả số lượng dạng chuỗi decimal. Các trường nguồn và mô tả bổ sung là tùy chọn, nhận `null` để xóa. `source_line_number` và `source_stage_id` nhận số nguyên không âm.

PATCH chỉ gửi trường cần sửa; trường bắt buộc không nhận null/rỗng. Không nhận `line_order`, ID phiếu cha, ID dòng hoặc timestamp trong body. Không được chuyển dòng sang phiếu khác. Truy cập dòng qua sai phiếu trả 404. Tạo/sửa/xóa bị chặn với 409 ngay khi phiếu cha có chữ ký hoặc trạng thái approved; kiểm tra và ghi dữ liệu trong cùng transaction để tránh sửa đồng thời với duyệt. Phạm vi truy cập lệnh sản xuất được kế thừa qua quan hệ phiếu cha.

Dữ liệu nguồn được lưu trực tiếp trên dòng; chưa nhập kết quả cân thực tế.

### Thêm hàng hóa theo giai đoạn

Trong detail phiếu cân, nút **Thêm mới** ở góc phải tiêu đề mở form chọn giai đoạn. Sau khi xác nhận, các dòng hàng được lưu vào phiếu và hiển thị dưới thông tin phiếu.

- `GET /production-orders/weighing-records/:recordId/stages`: danh sách giai đoạn có hàng hóa, số dòng `material_count` và cờ `imported`; quyền `production-orders.read`.
- `POST /production-orders/weighing-records/:recordId/import-stage`: body `{ "stage_id": 2 }`; quyền `production-orders.create`. Trả về mảng các dòng vừa nhập.

Backend lấy `production_order_id` từ phiếu, đọc ProductionOrderLines của đúng lệnh qua dịch vụ SAP hiện có. Chỉ nhập dòng hàng hóa `ItemType = pit_Item` có `StageID` trùng lựa chọn; dòng nguồn lực không được đưa vào phiếu cân. Sao chép `LineNumber`, `StageID`, tên giai đoạn, `ItemNo`, `ItemName`, `U_SL`, `PlannedQuantity` và mã đơn vị (ưu tiên `UnitOfMeasurement.Code`, dự phòng `UoMCode`). Giữ nguyên từng dòng và từng lô, không gộp nguyên liệu.

Toàn bộ dòng của một giai đoạn được nhập trong cùng transaction. Sai dữ liệu ở bất kỳ dòng nào sẽ không lưu cả đợt. Chặn thêm giai đoạn đã có trong phiếu với 409; các giai đoạn đã nhập bị vô hiệu hóa trong form. Phiếu đã ký không thể nhập thêm. Giao dịch khóa phiếu cha và đọc dữ liệu ở mức ReadCommitted để ngăn nhập lặp đồng thời.

## Chi tiết lần cân thực tế

Bảng `production_order_weighing_record_details` lưu `id`, `production_order_weighing_record_line_id`, `net_weight` (Decimal 18,6), `unit`, `image_path` (nullable), `weighed_by_id`, `weighed_at`, `note` (nullable), `created_at`, `updated_at`. Không có mã thùng, thiết bị, cả bì/bì, người kiểm tra hoặc trường thứ tự. Một dòng nguyên liệu có nhiều lần cân; danh sách sắp theo ID tăng dần. Khóa ngoại tới dòng nguyên liệu xóa cascade, người cân xóa restrict.

Base URL: `/production-orders/weighing-records/:recordId/lines/:lineId/details`.

| Method | Endpoint | Quyền |
| --- | --- | --- |
| GET | Base URL | `production-orders.read` |
| POST | Base URL | `production-orders.create` |
| GET | Base URL + `/:detailId` | `production-orders.read` |
| PATCH | Base URL + `/:detailId` | `production-orders.update` |
| DELETE | Base URL + `/:detailId` | `production-orders.delete` |
| POST | Base URL + `/:detailId/image` | `production-orders.update` |
| DELETE | Base URL + `/:detailId/image` | `production-orders.update` |
| GET | `/production-orders/weighing-record-details/images/:filename` | `production-orders.read` |

Body tạo lần cân:

```json
{
  "net_weight": "12.345678",
  "note": "Cân lần thứ nhất"
}
```

Chỉ `net_weight` bắt buộc, phải khác 0 và nằm trong Decimal(18,6); cho phép số âm ở cả POST và PATCH. Tổng khối lượng cộng cả các lần cân âm, giữ chính xác tối đa 6 chữ số thập phân. Lượng yêu cầu vẫn phải lớn hơn 0. Nên gửi chuỗi để giữ độ chính xác; response trả decimal dạng chuỗi. `unit` tự lấy từ dòng nguyên liệu cha, người cân từ tài khoản đăng nhập, thời điểm cân do server ghi. Không nhận các trường này hoặc `image_path` trong body. PATCH nhận ít nhất một trong hai trường `net_weight`, `note`; gửi `note: null` để xóa ghi chú. Khi sửa khối lượng, cập nhật lại người cân và thời điểm cân theo người thực hiện chỉnh sửa; sửa ghi chú giữ nguyên thông tin cân. Response có `weighedBy` với `id`, `username`, `name`.

Upload dùng multipart/form-data, trường `image`; tối đa một ảnh trên mỗi lần cân, hỗ trợ JPG/PNG/WEBP/GIF tối đa 20 MB. Tải lại ảnh sẽ thay ảnh cũ, dọn ảnh cũ sau khi DB lưu thành công. Đọc ảnh bằng URL `image_path` với Bearer token; mặc định trả thumbnail, thêm `?original=true` để lấy ảnh gốc. Ảnh được kiểm tra quyền theo lần cân và lệnh sản xuất; chỉ biết tên file không đủ để truy cập. DELETE ảnh đặt `image_path` về null và dọn ảnh gốc/thumbnail; xóa từng lần cân cũng dọn ảnh của lần cân đó. Request upload lỗi sẽ dọn tệp đã nhận, kể cả lỗi ID trên URL.

Form nhập lần cân có thêm ghi chú và nút Chụp ảnh/Chọn ảnh (không bắt buộc). POST tạo lần cân nhận cả JSON và multipart/form-data: `net_weight`, `note` tùy chọn, `image` tùy chọn. Khi có ảnh, form gửi toàn bộ trong một request; khối lượng, ghi chú và đường dẫn ảnh được tạo cùng transaction. Nếu tạo lỗi, tệp đã tải được dọn. Ghi chú và ảnh được lưu nhưng chưa hiển thị trong bảng nguyên liệu.

Mọi request phải khớp chuỗi phiếu → dòng nguyên liệu → lần cân. Sai chuỗi hoặc ngoài phạm vi truy cập trả 404. Tạo/sửa/xóa lần cân và ảnh bị khóa ngay khi phiếu cha đã có chữ ký, giống quy tắc hiện tại cho nguyên liệu. Các thay đổi và kiểm tra khóa nằm trong cùng transaction.

Detail phiếu cân có cột **Khối lượng thực tế** trên từng dòng nguyên liệu. Nhập lượng cân rồi bấm dấu **+** hoặc Enter để lưu từng lần; hỗ trợ dấu phẩy/dấu chấm thập phân, tối đa 6 chữ số thập phân. Hiển thị từng lần cân và tổng khối lượng theo đơn vị; tổng cộng bằng số nguyên theo phần triệu để tránh sai số dấu phẩy động, không cộng lẫn các đơn vị khác nhau. `GET` danh sách nguyên liệu trả thêm `details` và `weighedBy` để tải lịch sử cân cùng danh sách, không gọi riêng cho từng dòng. Sau khi lưu, cập nhật lịch sử và tổng ngay; phiếu đã có chữ ký không hiển thị ô nhập. Giao diện ảnh, sửa/xóa từng lần cân chưa được bổ sung.

## Migration

`prisma/migrations/20261024000000_add_production_order_weighing_records/migration.sql` chỉ tạo bảng phiếu cân, index và khóa ngoại tới các bảng hiện có.

`prisma/migrations/20261024020000_remove_weighing_record_code/migration.sql` bỏ cột mã phiếu và unique index tương ứng.

`prisma/migrations/20261024040000_add_weighing_record_lines/migration.sql` tạo bảng nguyên liệu cần cân, index và khóa ngoại xóa cascade theo phiếu cha.

`prisma/migrations/20261025000000_add_weighing_record_details/migration.sql` tạo bảng từng lần cân thực tế và các khóa ngoại/index tương ứng.
