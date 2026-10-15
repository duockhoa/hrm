# MCP module

Module NestJS cung cấp MCP qua Streamable HTTP tại `/mcp` trên cùng cổng backend.
Tên server trong MCP metadata và tool `get_server_info` là `DKPHARMA APP`.
Metadata có `title` và `icons` dùng logo DKPharma tại `templates/mcp/logo.png`.
Icon PNG được nhúng dạng data URI, không cần URL ảnh hoặc request xác thực riêng.
Dockerfile hiện có đóng gói thư mục `templates`, bao gồm logo này.
Client quyết định có hiển thị icon hay không; chưa xác nhận Gemini hỗ trợ trường
`icons`. Sau khi triển khai lại backend, kết nối lại custom app để lấy metadata
mới. Tên connector đã lưu phía client có thể cần đổi riêng hoặc tạo lại.
Module được đăng ký trong `AppModule`; không cần chạy thêm tiến trình hay migration.
SDK chính thức: `@modelcontextprotocol/server` và `@modelcontextprotocol/node`.

## Kết nối

- Local: `http://localhost:<PORT>/mcp` (PORT mặc định trong `main.ts` là 3000).
- Docker Compose: `http://localhost:3012/mcp` với cấu hình mặc định của repo.
- Remote: `https://<backend-domain>/mcp`; proxy chuyển tiếp endpoint về backend.
- Chọn **No authentication / No sign in** trong client. Hiện module chưa xác thực
  API key, JWT hay OAuth và chưa áp dụng phân quyền người dùng.
- Transport là **Streamable HTTP**, không phải endpoint SSE `/sse` cũ.
- Handler không lưu phiên. SDK hỗ trợ client MCP đời 2025 qua luồng initialize
  và các phiên bản mới qua cơ chế tương thích của SDK. Không cần session ID.
- Request POST phải có `Content-Type: application/json` và
  `Accept: application/json, text/event-stream`.
- Client đời 2025 nhận kết quả qua SSE trên chính request POST; proxy cần cho
  phép `text/event-stream` và tắt buffering cho `/mcp`. GET/DELETE quản lý phiên
  đời 2025 trả HTTP 405 vì handler không lưu phiên.

Chạy backend bằng `npm run start:dev` trong thư mục `backend`, rồi nhập URL trên
vào client MCP. Không cần API key của nhà cung cấp AI để chạy module này.

## Tool hiện có

| Tool                                  | Tham số                                                         | Kết quả                                                                         |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `get_server_info`                     | `{}`                                                            | Kiểm tra kết nối, thông tin server; không truy vấn DB                           |
| `search_production_orders`            | `query?`, `item_code?`, `lot_no?`, `status?`, `page?`, `limit?` | Thông tin chính của lệnh và phân trang                                          |
| `get_production_order`                | `id`                                                            | Thông tin chính của một lệnh                                                    |
| `get_production_order_mixing_records` | `production_order_id`, `page?`, `limit?`                        | Phiếu pha chế đã lưu, giai đoạn, bước, thông số/kết quả và người ghi nhận/duyệt |

`query` tìm trong mã lệnh, mã/tên sản phẩm và số lô. Các bộ lọc còn lại so khớp
chính xác. `page` mặc định 1; `limit` mặc định 20, tối đa 100. Ngày được trả
về dạng ISO 8601. Trường `planned_quatity` giữ tên hiện tại trong schema EBR.
Module chỉ đọc dữ liệu local qua Prisma, không gọi đồng bộ SAP, không tải toàn
bộ hồ sơ. Phiếu pha chế chỉ trả tên/username của người ghi nhận và duyệt.
Lỗi nghiệp vụ trả về `isError: true` trong
kết quả tool; lỗi database được ghi ở backend và trả thông báo chung cho client.

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

## Mở rộng

- Đăng ký tool trong factory `McpService.createServer()`.
- Đặt phần truy vấn trong `McpToolsService`; giới hạn trường trả về bằng `select`.
- Thêm xác thực tại `McpController`/trước handler; kiểm tra quyền từng tool khi
  bổ sung tính năng bảo mật. REST controller hiện tại giữ cơ chế xác thực riêng.
- Endpoint MCP không xuất hiện trong Swagger vì sử dụng JSON-RPC.

## Kiểm thử

```sh
npm test -- --runInBand src/modules/mcp/mcp.controller.spec.ts
npm run build
```

Kiểm thử HTTP chạy module Nest thật với Prisma giả lập, không kết nối database
và không khởi động lịch đồng bộ/email của toàn ứng dụng.
