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

## Tool hiện có

| Tool                                           | Tham số                                                                                 | Kết quả                                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `get_server_info`                              | `{}`                                                                                    | Kiểm tra kết nối, thông tin server; không truy vấn DB                                                            |
| `search_production_orders`                     | `query?`, `item_code?`, `lot_no?`, `status?`, `page?`, `limit?`                         | Thông tin chính của lệnh và phân trang                                                                           |
| `get_production_order`                         | `id`                                                                                    | Tổng quan lô, PYCLM, số đăng ký, giao nhận hồ sơ, completeness, tổng kết/xét duyệt mới nhất và sai lệch gần nhất |
| `get_production_order_mixing_records`          | `production_order_id`, `page?`, `limit?`                                                | Phiếu pha chế đã lưu, giai đoạn, bước, thông số/kết quả và người ghi nhận/duyệt                                  |
| `get_production_order_deviations`              | `production_order_id`, `deviation_id?`, `approval_status?`, `query?`, `page?`, `limit?` | Sai lệch, nguyên nhân, xử lý, số lượng, người báo cáo/phê duyệt và tham chiếu ảnh                                |
| `get_production_order_completeness`            | `production_order_id`                                                                   | Các mục bắt buộc, đã có dữ liệu, còn thiếu và chưa kiểm tra được                                                 |
| `get_production_order_summaries`               | Tham số bảng chi tiết bên dưới                                                          | Tổng kết thành phẩm, bán thành phẩm, công đoạn và hao hụt                                                        |
| `get_production_order_factory_release_reviews` | Tham số bảng chi tiết                                                                   | Các bản xét duyệt xuất xưởng và người duyệt                                                                      |
| `get_production_order_checks`                  | Tham số bảng chi tiết                                                                   | Các phiếu kiểm tra trong quá trình theo loại                                                                     |
| `get_production_order_packaging`               | Tham số bảng chi tiết                                                                   | Xác nhận, kiểm tra, tổng kết đóng gói                                                                            |
| `get_production_order_sampling`                | Tham số bảng chi tiết                                                                   | Lịch sử PYCLM hoặc lấy mẫu thực tế                                                                               |
| `get_production_order_attachments`             | Tham số bảng chi tiết                                                                   | Hồ sơ đính kèm, phê duyệt và metadata/tham chiếu tệp                                                             |

`query` tìm trong mã lệnh, mã/tên sản phẩm và số lô. Các bộ lọc còn lại so khớp
chính xác. `page` mặc định 1; `limit` mặc định 20, tối đa 100. Ngày được trả
về dạng ISO 8601. Trường `planned_quatity` giữ tên hiện tại trong schema EBR.
Module chỉ đọc dữ liệu cục bộ qua Prisma và không phụ thuộc module kết nối bên ngoài.
Các quan hệ người dùng mới chỉ trả ID, tên và username.
Lỗi nghiệp vụ trả về `isError: true` trong
kết quả tool; lỗi database được ghi ở backend và trả thông báo chung cho client.

### Chi tiết và tổng quan lô

`get_production_order` giữ các trường cơ bản, bổ sung `origin`, `warehouse`,
`description`, `packing_specification`, `remarks`, `change_content`,
`registration_number`, `pyclm`, `documentControl` và `productionGuide` (metadata).
Số đăng ký theo logic frontend: PYCLM mới nhất đã gửi thì dùng số đăng ký lưu
theo lô; trước đó dùng số đăng ký của sản phẩm. Các mốc hồ sơ chưa thực hiện là null.

`completeness` dùng chung logic kiểm tra dữ liệu cục bộ với frontend: `required_count`, `completed_count`,
`required_sections`, `missing_sections`, `unavailable_sections` và `is_complete`.
Mục bắt buộc phụ thuộc nguồn ngoài phạm vi dữ liệu cục bộ là `unavailable`,
không được kết luận thiếu dữ liệu. MCP không gọi nguồn bên ngoài để kiểm tra.
Nếu không kiểm tra được checklist, tổng quan vẫn trả thông tin lô với
`completeness.available = false`.

`summaries` chứa số bản ghi và bản mới nhất của tổng kết thành phẩm, bán thành phẩm,
công đoạn. `factory_release` chứa số bản xét duyệt và bản mới nhất. Đây không phải
tổng sản lượng của tất cả công đoạn; dùng tool chi tiết để đọc đủ các trang.
Không cộng số lượng khác đơn vị hoặc cộng nhiều công đoạn của cùng sản phẩm.

`deviations` chứa tổng số sai lệch còn hiệu lực, tối đa 3 phiếu gần nhất và
`has_more`. Nhóm này yêu cầu `production-order-deviations.read`; thiếu quyền thì
`available = false`, `reason = permission_required` và không truy vấn nội dung.
Phiếu/ảnh sai lệch đã xóa không được trả về. `record_counts` có số bản ghi lấy mẫu
thực tế và hồ sơ đính kèm.

Có dữ liệu, kết quả đạt, có người duyệt và được phép xuất xưởng là các khái niệm
riêng. MCP chỉ trả kết quả và thông tin phê duyệt đã lưu, không tự kết luận chất lượng.

### Các bảng chi tiết

Các tool nhóm nhận `production_order_id`, `section`, `page` (mặc định 1), `limit`
(mặc định 5, tối đa 20), tùy chọn `record_id`, `from`, `to`. Khoảng thời gian bao
gồm hai đầu mút, phải là ISO 8601 có múi giờ; `from <= to`. Lọc theo ngày kiểm tra
ở phiếu môi trường/độ rã/rò nang/in date, thời gian gửi ở PYCLM, thời gian nhập ở
hồ sơ đính kèm; các nhóm khác theo ngày tạo. Kết quả gồm `production_order`,
`section`, `data`, `pagination`. Bản ghi có ID được ràng buộc với đúng lệnh và bộ lọc.

| Tool                    | Giá trị `section`                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| summaries               | `finished_product_summary`, `semi_finished_product_summaries`, `material_process_summaries`                                             |
| factory_release_reviews | `factory_release_reviews`                                                                                                               |
| packaging               | `primary_packaging_confirmations`, `pre_secondary_packaging_checks`, `secondary_packaging_checks`, `post_secondary_packaging_summaries` |
| sampling                | `sampling_requests`, `sampling_records`                                                                                                 |
| attachments             | `attachments`                                                                                                                           |

Danh sách section kiểm tra được công bố trong input schema của
`get_production_order_checks` và registry `mcp-record-sections.ts`. Có cả phiếu
đơn như `cylinder_calibration`, `ten_shell_weight_check`; chúng vẫn trả dạng mảng
với tối đa một bản ghi và phân trang nhất quán.

Các tool nhóm cần `production-orders.read`, riêng `date_checks`,
`steam_sterilization_checks`, `filtration_checks`,
`post_secondary_packaging_summaries` còn cần quyền đọc tương ứng như REST API.

File/ảnh chỉ trả metadata và tham chiếu, không tải nội dung.

```json
{
  "name": "get_production_order_summaries",
  "arguments": {
    "production_order_id": 7,
    "section": "semi_finished_product_summaries",
    "page": 1,
    "limit": 5
  }
}
```

### Lấy phiếu pha chế

Tìm ID lệnh bằng `search_production_orders`, rồi gọi
`get_production_order_mixing_records`. Tham số `production_order_id` là ID lệnh
sản xuất, không phải ID phiếu. `page` mặc định 1; `limit` mặc định 5, tối đa 20.
Tool chỉ lấy `record_type = mixing`, không lấy phiếu gia công đóng gói sơ cấp
hoặc loại khác. Dữ liệu được đọc từ phiếu đã lưu, không dựng lại từ mẫu pha chế.

Kết quả gồm `production_order`, `data` (danh sách phiếu) và `pagination`.
Mỗi phiếu có mô tả, phiên bản mẫu, ngày tạo/cập nhật, người tạo, thông tin duyệt
QA/IPC và cấu trúc `stages → steps → parameters`. Các thông số gồm yêu cầu,
kết quả, đơn vị, ghi chú, người/thời gian ghi nhận và đường dẫn ảnh nếu có;
tool không tải nội dung ảnh. Giai đoạn, bước và thông số theo thứ tự của phiếu.

Nếu lệnh chưa có phiếu, tool trả `data: []` và thông báo tương ứng. Nếu lệnh
không tồn tại, tool trả `isError: true`.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_production_order_mixing_records",
    "arguments": { "production_order_id": 123, "page": 1, "limit": 5 }
  }
}
```

Ví dụ hỏi client: “Lấy phiếu pha chế của lệnh sản xuất ID 123 và trình bày
các bước, yêu cầu và kết quả đã ghi nhận.” Sau khi triển khai backend, đồng bộ
lại hoặc kết nối lại custom app để client nhận tool mới.

Ví dụ body POST để liệt kê tool sau khi client initialize:

```json
{ "jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {} }
```

Ví dụ gọi tool:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_production_orders",
    "arguments": { "query": "TP", "page": 1, "limit": 20 }
  }
}
```

## Thông tin sai lệch

`get_production_order_deviations` dùng quyền `production-order-deviations.read`.
Tìm ID lệnh bằng `search_production_orders` theo mã lệnh, sản phẩm hoặc số lô,
rồi gọi tool để lấy sai lệch. Mặc định `page=1`, `limit=10`, tối đa 20 phiếu/trang.
Thêm `deviation_id` nếu chỉ cần một phiếu; ID phải thuộc lệnh đã chọn.
`query` tìm trong nội dung/nguyên nhân/phương án/kết quả xử lý;
`approval_status=approved|pending` lọc theo việc đã có/chưa có người duyệt.
Có người duyệt không đồng nghĩa đã xử lý xong sai lệch.

```json
{
  "name": "get_production_order_deviations",
  "arguments": { "production_order_id": 7, "page": 1, "limit": 10 }
}
```

Kết quả gồm thông tin lệnh, danh sách sai lệch và phân trang. Mỗi phiếu có nội
dung, nguyên nhân/phân loại, phương án/kết quả xử lý, số lượng ảnh hưởng/đã xử
lý/tiêu hủy kèm đơn vị, người báo cáo/phê duyệt và thời gian. Số lượng Decimal
giữ dạng chuỗi để không mất độ chính xác. Bản ghi và ảnh đã xóa không được trả
về; thông tin người dùng chỉ có ID, tên và username. Tool không tải nội dung
ảnh; tham chiếu ảnh sử dụng endpoint hiện có, yêu cầu đăng nhập HRM để mở.
Lệnh tồn tại nhưng không có sai lệch trả danh sách rỗng và thông báo phù hợp.

## Mở rộng

- Đăng ký tool trong factory `McpService.createServer()`.
- Đặt phần truy vấn trong `McpToolsService`; giới hạn trường trả về bằng `select`.
- Kiểm tra quyền từng tool mới bằng `executeTool`. Guard OAuth bảo vệ endpoint; scope và
  permission HRM được kiểm tra trong callback. REST giữ cơ chế xác thực riêng.
- Endpoint MCP không xuất hiện trong Swagger vì sử dụng JSON-RPC.

## Kiểm thử

```sh
npm test -- --runInBand src/modules/mcp/mcp.controller.spec.ts
npm run build
```

Kiểm thử HTTP chạy module Nest thật với Prisma giả lập, không kết nối database
và không khởi động lịch đồng bộ/email của toàn ứng dụng.
