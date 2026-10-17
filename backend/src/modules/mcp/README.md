# MCP module

Module NestJS cung cấp MCP qua Streamable HTTP tại `/mcp` trên cùng cổng backend.
Tên server trong MCP metadata và tool `get_server_info` là `DKPHARMA APP`.
Metadata có `title` và `icons` dùng logo DKPharma tại `templates/mcp/logo.png`.
Icon PNG được nhúng dạng data URI, không cần URL ảnh hoặc request xác thực riêng.
Dockerfile hiện có đóng gói thư mục `templates`, bao gồm logo này.
Client quyết định có hiển thị icon hay không; chưa xác nhận Gemini hỗ trợ trường
`icons`. Sau khi triển khai lại backend, kết nối lại custom app để lấy metadata
mới. Tên connector đã lưu phía client có thể cần đổi riêng hoặc tạo lại.
Module được đăng ký trong `AppModule`; không cần chạy thêm tiến trình.
OAuth/DCR cần áp dụng migration theo hướng dẫn OAuth bên dưới.
SDK chính thức: `@modelcontextprotocol/server` và `@modelcontextprotocol/node`.

## Kết nối

- Local: `http://localhost:<PORT>/mcp` (PORT mặc định trong `main.ts` là 3000).
- Docker Compose: `http://localhost:3012/mcp` với cấu hình mặc định của repo.
- Remote: `https://<backend-domain>/mcp`; proxy chuyển tiếp endpoint về backend.
- Chọn **OAuth** trong client rồi đăng nhập HRM để cấp quyền. Gemini hỗ trợ DCR
  tự đăng ký client: chỉ nhập URL MCP, để trống Client ID/Secret. Client đăng ký
  thủ công vẫn dùng ID/secret đã tạo. Xem [hướng dẫn OAuth](../mcp-oauth/README.md).
  Endpoint luôn yêu cầu OAuth; không chấp nhận HRM JWT hoặc API key.
- Transport là **Streamable HTTP**, không phải endpoint SSE `/sse` cũ.
- Handler không lưu phiên. SDK hỗ trợ client MCP đời 2025 qua luồng initialize
  và các phiên bản mới qua cơ chế tương thích của SDK. Không cần session ID.
- Request POST phải có `Content-Type: application/json` và
  `Accept: application/json, text/event-stream`.
- Mỗi request MCP phải có `Authorization: Bearer <MCP-access-token>`. Client
  OAuth tự quản lý việc lấy và refresh token.
- Client đời 2025 nhận kết quả qua SSE trên chính request POST; proxy cần cho
  phép `text/event-stream` và tắt buffering cho `/mcp`. GET/DELETE quản lý phiên
  đời 2025 trả HTTP 405 vì handler không lưu phiên.

Chạy backend bằng `npm run start:dev` trong thư mục `backend`, rồi nhập URL trên
vào client MCP. Không cần API key của nhà cung cấp AI để chạy module này.

## Năm tool hiện có

| Tool                       | Tham số                                                         | Kết quả                                                      |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| `get_server_info`          | `{}`                                                            | Thông tin server và kiểm tra kết nối                         |
| `search_production_orders` | `query?`, `item_code?`, `lot_no?`, `status?`, `page?`, `limit?` | Danh sách lệnh/lô và phân trang                              |
| `get_production_order`     | `id`                                                            | Toàn bộ hồ sơ lô từ dữ liệu cục bộ mà tài khoản có quyền đọc |
| `search_items`             | `query?`, `item_code?`, `code_prefix?`, `page?`, `limit?`       | Tìm sản phẩm theo mã/tên/mã DK, có phân trang                |
| `get_item`                 | `item_code`                                                     | Thông tin và cấu hình hiện tại của một sản phẩm              |

Có năm tên tool trên được đăng ký. Các tool riêng theo lô cho pha chế, sai lệch,
checklist, kiểm tra, tổng kết, đóng gói, lấy mẫu và tài liệu đã được gom vào
`get_production_order`. Client đã kết nối trước đó cần làm mới danh sách tool.

### Tra cứu sản phẩm

`search_items` tìm `query` trong mã, tên và mã DK. `item_code` so khớp chính xác;
`code_prefix` lọc tiền tố gồm chữ cái, tự chuẩn hóa chữ hoa (`TP`, `BTP`...).
`page` mặc định 1, `limit` mặc định 20 và tối đa 100. Dữ liệu sắp theo mã tăng dần;
count và danh sách dùng chung bộ lọc, bỏ qua sản phẩm đã xóa. Kết quả gồm mã, tên,
đơn vị, mã DK và số đăng ký còn hiệu lực, cùng `pagination`.

```json
{
  "name": "search_items",
  "arguments": {
    "query": "sản phẩm",
    "code_prefix": "TP",
    "page": 1,
    "limit": 20
  }
}
```

```json
{
  "name": "get_item",
  "arguments": { "item_code": "TP001" }
}
```

`get_item` trả `{ "data": { ... } }` với:

- Các trường sản phẩm, thời gian tạo/cập nhật và `registration` còn hiệu lực.
- `production_specification`: dòng sản phẩm, dạng bào chế, giới hạn kiểm soát/
  cho phép, toán tử, đơn vị, người và thời gian cập nhật; null nếu chưa có/đã xóa.
- `feature_config`: cấu hình actions/sections, enabled/required và thứ tự hiện tại.
- `equipment`: các thiết bị gắn với sản phẩm, thông số thiết bị và người gắn.
- `mixing_activity_templates`: toàn bộ phiên bản mẫu pha chế với status, cỡ mẻ,
  đơn vị và cấu trúc giai đoạn → bước → thông số/yêu cầu.
- `date_print_templates`: toàn bộ phiên bản mẫu in date với status, nội dung,
  vị trí, định dạng ngày và tham chiếu ảnh.

Thiết bị và hai nhóm mẫu có dạng `available`, `total`, `data`; chi tiết sản phẩm
không cắt bớt bản ghi. Mẫu pha chế cần `mixing-activity-templates.read`, mẫu in date
cần `date-print-templates.read`; thiếu quyền trả `available=false` và
`reason=permission_required`, không truy vấn nội dung của nhóm đó.

Kết quả ghi rõ `configuration_source=current_item`: đây là cấu hình sản phẩm
hiện tại, có thể khác phiên bản/cấu hình đã lưu theo lô. Không dùng cấu hình này
để tự thay thế snapshot hoặc kết quả của một lô cũ. Tool không truy vấn lịch sử
lô, tồn kho hay nguồn bên ngoài. Ngày dạng ISO 8601, Decimal giữ dạng chuỗi và
thông tin người dùng chỉ gồm ID, tên, username.

### Tìm lô

`query` tìm trong mã lệnh, mã/tên sản phẩm và số lô; các bộ lọc còn lại so khớp
chính xác. `page` mặc định 1; `limit` mặc định 20, tối đa 100. Danh sách sắp theo
ID giảm dần. Lấy `id` từ kết quả để gọi tool chi tiết.

```json
{
  "name": "search_production_orders",
  "arguments": { "lot_no": "LOT-001", "page": 1, "limit": 20 }
}
```

### Lấy toàn bộ hồ sơ một lô

```json
{
  "name": "get_production_order",
  "arguments": { "id": 123 }
}
```

Kết quả có dạng `{ "data": { ... } }`, gồm:

- Thông tin chung: mã lệnh/sản phẩm, tên, số lô, trạng thái/loại, số lượng kế
  hoạch, đơn vị, các ngày, nguồn gốc, kho, mô tả, quy cách đóng gói, ghi chú,
  ghi chú nội bộ và nội dung thay đổi.
- `registration_number`: số đăng ký lưu theo lô khi PYCLM mới nhất đã gửi;
  trước đó lấy số đăng ký của sản phẩm, cùng logic với frontend.
- `pyclm`: trạng thái PYCLM mới nhất, người/thời gian gửi, vị trí và link phiếu.
- `documentControl`: thời gian/người cấp và nhận hồ sơ lô, nhận phiếu xuất kho,
  nhận phiếu kiểm nghiệm. Bản quản lý hồ sơ đã xóa trả null.
- `productionGuide`: metadata file hướng dẫn và đường dẫn tải qua endpoint xác thực.
- `completeness`: các mục bắt buộc, đã có dữ liệu, còn thiếu hoặc chưa kiểm tra
  được. Nếu dịch vụ checklist gặp lỗi, phần này có `available=false` và dữ liệu
  lô vẫn được trả. Mục phụ thuộc nguồn ngoài phạm vi cục bộ là `unavailable`.
- `sections`: toàn bộ bản ghi chi tiết theo nhóm dưới đây.

| Nhóm                                                 | Nội dung                                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mixing_records`                                     | Tất cả phiếu pha chế/gia công đã lưu, gồm các loại `record_type`; cấu trúc giai đoạn → bước → thông số, kết quả/ghi chú/ảnh, người ghi nhận và duyệt QA/IPC |
| `deviations`                                         | Toàn bộ sai lệch, nguyên nhân, xử lý, số lượng/đơn vị, người báo cáo/phê duyệt và tham chiếu ảnh còn hiệu lực                                               |
| `*_checks`, `cylinder_calibration`                   | Kiểm tra môi trường, vệ sinh, dọn quang, cảm quan, khối lượng, thể tích, độ cứng/dày/rã/mài mòn/kín, soi lọ, in date, hiệu chuẩn, tiệt trùng và lọc         |
| `*_summaries`, `finished_product_summary`            | Tổng kết các công đoạn, thành phẩm/bán thành phẩm, sản lượng, lượng dư và hao hụt                                                                           |
| `factory_release_reviews`                            | Toàn bộ bản xét duyệt xuất xưởng, các kết quả đã lưu và người duyệt                                                                                         |
| `primary_packaging_confirmations`, các nhóm đóng gói | Xác nhận, kiểm tra và tổng kết đóng gói, gồm các mục chờ xử lý/hủy                                                                                          |
| `sampling_requests`, `sampling_records`              | Toàn bộ lịch sử gửi PYCLM và lấy mẫu thực tế                                                                                                                |
| `disinfectant_preparations`                          | Các phiếu pha dung dịch sát khuẩn                                                                                                                           |
| `equipment_monitoring_records`                       | Theo dõi thiết bị, thông số/kết quả, người ghi nhận và tham chiếu ảnh còn hiệu lực                                                                          |
| `attachments`                                        | Hồ sơ đính kèm, người nhập, trạng thái/người phê duyệt và metadata/tham chiếu tệp                                                                           |

Mỗi section có cấu trúc `{ "available": true, "total": N, "data": [...] }`.
Nhóm không có dữ liệu trả `total=0`, `data=[]`. Phiếu đơn như hiệu chuẩn và
khối lượng 10 vỏ vẫn trả dạng mảng với tối đa một bản ghi.

Tool chi tiết **không phân trang và không cắt bớt bản ghi**, kể cả lịch sử lấy
mẫu, phiếu pha chế, sai lệch hay các bảng con. Các phiếu sắp theo thời gian và ID;
các bước/thông số giữ thứ tự cấu trúc đã lưu. Ngày dạng ISO 8601 và Decimal dạng
chuỗi để giữ độ chính xác. Trường `planned_quatity` giữ tên hiện tại của schema.
Không cộng gộp sản lượng giữa các công đoạn hoặc đơn vị khác nhau.

## Quyền đọc và phạm vi dữ liệu

Mọi tool cần OAuth scope `mcp:read`; tìm kiếm cần `production-orders.list`,
chi tiết cần `production-orders.read`. Các nhóm in date, tiệt trùng, lọc, tổng
kết sau đóng gói, thiết bị và sai lệch cần thêm quyền đọc tương ứng như REST API.
Nhóm thiếu quyền không được truy vấn nội dung và trả
`{ "available": false, "reason": "permission_required" }`, khác với nhóm rỗng.

Đối với sản phẩm, `search_items` cần `items.list`, `get_item` cần `items.read`.
Hai nhóm mẫu cần thêm quyền đọc tương ứng như mô tả ở trên. Sản phẩm không tồn
tại hoặc đã xóa trả lỗi tool; đăng ký/thông số đã xóa không được trả nội dung.

MCP chỉ đọc dữ liệu cục bộ; không có tool vật liệu hoặc kết nối SAP B1.
Ảnh/tệp trả metadata và tham chiếu, không tải nội dung. Thông tin người dùng chỉ
gồm tên/username và ID ở các nhóm có ID. Không trả mật khẩu hoặc hồ sơ tài khoản.
Có dữ liệu, kết quả đạt và đã duyệt xuất xưởng là các trạng thái khác nhau.

Lệnh không tồn tại hoặc lỗi truy vấn chính trả `isError=true`. Lỗi nội bộ được
ghi log ở backend và được thay bằng thông báo chung trong kết quả tool.

## Mở rộng và kiểm thử

Thêm bảng chi tiết bằng một mục trong `mcp-record-sections.ts`, gồm quan hệ,
quyền đọc, thứ tự và danh sách trường `select`. Không cần thêm tool mới.
Các nhóm có cấu trúc riêng như pha chế/sai lệch được xử lý trong `McpToolsService`.

```sh
npm test -- --runInBand mcp.controller.spec.ts mcp-record-sections.spec.ts production-order-completeness.service.spec.ts
npx tsc -p tsconfig.build.json --noEmit --incremental false
```

Test HTTP chạy module Nest thật với dữ liệu giả lập, không kết nối DB hoặc
dịch vụ ngoài. Kiểm tra registry đối chiếu quan hệ/trường dữ liệu với Prisma.
