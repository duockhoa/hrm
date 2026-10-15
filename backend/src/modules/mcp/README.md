# MCP module

Module NestJS cung cấp MCP qua Streamable HTTP tại `/mcp` trên cùng cổng backend.
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

| Tool                       | Tham số                                                         | Kết quả                                               |
| -------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| `get_server_info`          | `{}`                                                            | Kiểm tra kết nối, thông tin server; không truy vấn DB |
| `search_production_orders` | `query?`, `item_code?`, `lot_no?`, `status?`, `page?`, `limit?` | Thông tin chính của lệnh và phân trang                |
| `get_production_order`     | `id`                                                            | Thông tin chính của một lệnh                          |

`query` tìm trong mã lệnh, mã/tên sản phẩm và số lô. Các bộ lọc còn lại so khớp
chính xác. `page` mặc định 1; `limit` mặc định 20, tối đa 100. Ngày được trả
về dạng ISO 8601. Trường `planned_quatity` giữ tên hiện tại trong schema EBR.
Module chỉ đọc dữ liệu local qua Prisma, không gọi đồng bộ SAP, không tải toàn
bộ hồ sơ hoặc thông tin người dùng. Lỗi nghiệp vụ trả về `isError: true` trong
kết quả tool; lỗi database được ghi ở backend và trả thông báo chung cho client.

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
