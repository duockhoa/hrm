# OAuth cho DKPHARMA APP MCP

Module dùng `@node-oauth/oauth2-server` để xử lý Authorization Code + PKCE S256
và refresh token. Người dùng đăng nhập bằng tài khoản HRM trên trang backend;
Gemini nhận code/token, không nhận mật khẩu HRM. Hỗ trợ đăng ký client tự động
qua DCR (RFC 7591) và client đăng ký thủ công. Chưa hỗ trợ CIMD.

## Triển khai

1. Đặt public origin backend trong môi trường triển khai:

   ```dotenv
   MCP_OAUTH_ISSUER=https://mcp.dkpharma.io.vn
   ```

   Không thêm `/mcp` vào issuer. Resource token được ràng buộc với
   `https://mcp.dkpharma.io.vn/mcp`. Production yêu cầu HTTPS và cấu hình issuer;
   local development mặc định `http://localhost:<PORT>`, PORT mặc định 3012.
   Callback client phải là URL chính xác, không dùng wildcard.

2. Cài dependencies, cập nhật database và build:

   ```sh
   npm install
   npx prisma migrate status
   npx prisma migrate deploy
   npx prisma generate
   npm run build
   ```

   Kiểm tra các migration đang chờ trước khi deploy. Migration của module là
   `20261015010000_add_mcp_oauth` và `20261016010000_add_mcp_oauth_dcr`.
   Không dùng `db push` trên database triển khai.

3. Với Gemini hỗ trợ DCR: không cần chạy lệnh tạo client. Gemini tự khám phá
   `registration_endpoint` trong metadata rồi đăng ký callback và lấy client ID.
   Để trống Client ID/Secret khi thêm kết nối mới bằng URL MCP.

   Với client cần đăng ký thủ công: lấy callback chính xác từ client (nút
   “Sao chép URI chuyển hướng” trong Gemini), rồi chạy:

   ```sh
   npm run oauth:client -- --client-id dkpharma-gemini --name Gemini --redirect-uri "https://<exact-Gemini-callback>"
   ```

   Có thể lặp lại `--redirect-uri` nếu ứng dụng có nhiều callback. Script sinh
   secret ngẫu nhiên và chỉ hiển thị một lần; DB lưu bcrypt hash. Chạy script
   trong môi trường có quyền truy cập DB. Client ID đã tồn tại sẽ không bị ghi
   đè hoặc thay secret. Tạo client ID khác khi cần kết nối riêng.

4. Restart backend. Proxy domain MCP phải chuyển tiếp **cả** `/mcp`, `/oauth/*`
   và `/.well-known/*` về backend, cho phép body form URL-encoded và SSE trên
   request POST `/mcp`. Cookie cấp quyền dùng HttpOnly, SameSite=Lax và Secure
   khi issuer là HTTPS. Không cần thiết lập trust proxy để xác định issuer.

5. Kết nối mới trong Gemini bằng URL `/mcp`, để trống Client ID/Secret cho DCR.
   Gemini sẽ tự đăng ký rồi mở trang đăng nhập/cấp quyền DKPHARMA APP.
   Đăng nhập HRM rồi chọn cấp quyền. Client thủ công vẫn nhập ID/secret ở bước 3.

## Đăng ký client tự động (DCR)

`POST /oauth/register` nhận JSON và trả HTTP 201 theo RFC 7591. Endpoint công
khai để client chưa có tài khoản có thể bắt đầu OAuth; đăng ký không cấp token
hay quyền dữ liệu. Mọi client vẫn phải qua HRM login, consent, PKCE S256,
kiểm tra resource và quyền người dùng.

```json
{
  "client_name": "Gemini",
  "redirect_uris": ["https://client.example/callback"],
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "mcp:read offline_access"
}
```

- Auth method hỗ trợ: `none`, `client_secret_basic`, `client_secret_post`.
  Mặc định là `client_secret_basic`; secret ngẫu nhiên trả một lần, DB chỉ lưu
  bcrypt hash. Client `none` không có secret và bắt buộc dùng PKCE khi đổi code.
- Grant mặc định là `authorization_code`; yêu cầu thêm `refresh_token` để duy
  trì kết nối. Scope mặc định `mcp:read`, chỉ nhận thêm `offline_access`.
- Callback so khớp chính xác, tối đa 10 URL; HTTPS hoặc HTTP loopback.
  Không nhận fragment, wildcard, credentials hay scheme khác. Backend không
  fetch URL do client gửi. Client name là thông tin tự khai báo, không chứng
  minh danh tính nhà cung cấp; người dùng chỉ cấp quyền cho kết nối mình tạo.
- Client tạo thủ công trước đây không đổi hành vi; vẫn cần secret. Client DCR
  phải dùng đúng auth method đã đăng ký cho cả token và revoke.
- Request JSON tối đa 16 KiB; endpoint giới hạn 30 lần/giờ cho mỗi socket peer,
  500 lần/giờ toàn process, tối đa 4 đăng ký đồng thời. Request sai cũng được
  tính; vượt giới hạn trả 429 kèm `Retry-After`. Không tin `X-Forwarded-For`.
  Nếu dùng Cloudflare/proxy, nhiều người dùng có thể chung socket peer; cấu
  hình giới hạn bổ sung theo IP thật tại proxy và dùng giới hạn chung khi có
  nhiều replica. Hạn mức trong process reset khi restart.
- DCR hiện chỉ tạo client, chưa có API quản lý RFC 7592; không cấp registration
  access token. Vận hành có thể vô hiệu hóa bằng `oauth_clients.enabled=false`
  và dọn client không sử dụng theo chính sách lưu trữ.

MCP luôn yêu cầu OAuth, không có chế độ tự động bỏ qua xác thực. JWT đăng nhập
HRM và API key xuất dữ liệu không dùng được tại `/mcp`.

MCP kiểm tra `Origin` khi header này có mặt: mặc định cho phép issuer và
`https://gemini.google.com`. Client server-to-server không gửi Origin vẫn được
xác thực bằng token. Có thể cấu hình danh sách browser Origin bằng
`MCP_OAUTH_ALLOWED_ORIGINS` (phân cách dấu phẩy), chẳng hạn khi dùng Inspector.

## Endpoint

| Endpoint                                        | Chức năng                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /.well-known/oauth-protected-resource/mcp` | Resource, authorization server và scope MCP                            |
| `GET /.well-known/oauth-protected-resource`     | Metadata resource tương thích client khám phá ở root                   |
| `GET /.well-known/oauth-authorization-server`   | Issuer, authorize/token/revoke, PKCE S256 và cơ chế xác thực client    |
| `POST /oauth/register`                         | Tự đăng ký client OAuth, trả client ID và secret nếu cần              |
| `GET /oauth/authorize`                          | Kiểm tra client, callback, resource, scope và PKCE; mở trang đăng nhập |
| `POST /oauth/authorize`                         | Đăng nhập HRM và đồng ý/từ chối cấp quyền                              |
| `POST /oauth/token`                             | Đổi code hoặc refresh token; body `application/x-www-form-urlencoded`  |
| `POST /oauth/revoke`                            | Thu hồi grant bằng access hoặc refresh token, xác thực client          |
| `GET /oauth/connections`                        | Kết nối của chính user, dùng HRM access JWT                            |
| `DELETE /oauth/connections/:id`                 | Thu hồi kết nối thuộc user, dùng HRM access JWT                        |

Token endpoint hỗ trợ HTTP Basic, `client_secret_post` và client công khai
`none` (gửi `client_id`, không gửi secret). Mỗi request token
phải có `resource` đúng endpoint MCP. Chỉ cấp grant `authorization_code` và
`refresh_token`; không có password grant, client credentials hoặc implicit.
Authorization response trả `iss`; state và callback được giữ đúng request.
`state` là giá trị opaque của client, được giữ nguyên qua consent và redirect,
tối đa 8.192 ký tự để hỗ trợ context dài từ Gemini. Lỗi validation nêu tên
trường và loại lỗi, không trả lại giá trị state, mật khẩu hay token.
Trang consent dùng `Referrer-Policy: strict-origin` để không lộ query OAuth
qua Referer và vẫn giữ đúng Origin khi trình duyệt POST form. Không đổi sang
`no-referrer`: policy đó khiến browser gửi `Origin: null`, bị CSRF check từ chối.
CSP `form-action` cho phép backend và origin của callback đã đăng ký/kiểm tra
chính xác cho client hiện tại. Sau POST consent, trình duyệt nhận một trang
HTML mới rồi tự điều hướng GET đến callback; có liên kết dự phòng nếu không
tự chuyển. Cách này tách chuỗi redirect của Google/Gemini khỏi CSP form-action
của form, không phải mở allowlist cho mọi domain mà provider có thể chuyển đến.
Request không phải browser navigation vẫn nhận HTTP 302 như trước.

## Lưu trữ và quyền

- `OAuthClients`: client, hash secret, callback và scope cho phép.
- `OAuthAuthorizationRequests`: giao dịch trình duyệt, hash nonce/CSRF, thời
  hạn và số lần thử đăng nhập.
- `OAuthGrants`: user/client/resource và quyền đã đồng ý; trạng thái thu hồi.
- `OAuthAuthorizationCodes`: hash code, PKCE challenge, callback và trạng thái
  sử dụng. Code hết hạn sau 5 phút và được tiêu thụ bằng cập nhật có điều kiện.
- `OAuthTokens`: hash access/refresh token, scope và thời hạn. Access token 15
  phút; refresh token 30 ngày, xoay vòng mỗi lần dùng. Phát hiện dùng lại refresh
  token cũ sẽ thu hồi toàn bộ grant. Các giá trị token đầy đủ không lưu vào DB.

Scope: `mcp:read`, `offline_access`. Scope không thay thế permission HRM:

| Tool                                  | Permission hiện tại của user         |
| ------------------------------------- | ------------------------------------ |
| `get_server_info`                     | Tài khoản active và scope `mcp:read` |
| `search_production_orders`            | `production-orders.list`             |
| `get_production_order`                | `production-orders.read`             |
| `get_production_order_mixing_records` | `production-orders.read`             |
| `get_production_order_deviations` | `production-order-deviations.read` |

Mỗi request kiểm tra grant, client, token hết hạn, user active/không bị xóa,
scope và permission hiện tại; role đã bị xóa không còn cấp quyền. Log gọi tool
ghi tên tool, user/client và kết quả, không ghi token hoặc mật khẩu.

User có thể thu hồi từng kết nối tại **HRM → Hồ sơ cá nhân → Ứng dụng đã kết
nối**. Thu hồi chặn cả access token và refresh token của grant ngay lập tức.

Giới hạn đăng nhập: tối đa 5 lần mỗi giao dịch và 10 lần sai cho một username
trong 10 phút. Bộ đếm username chạy theo process; nếu chạy nhiều replica, bổ
sung giới hạn dùng chung tại proxy hoặc kho dữ liệu chung. Vận hành cần dọn các
giao dịch/code hết hạn; giữ refresh token đã dùng đến khi hết hạn để phát hiện
replay, không xóa token vừa dùng ngay khi xoay vòng.

## Kiểm thử

```sh
npm test -- --runInBand src/modules/mcp-oauth/oauth.integration.spec.ts src/modules/mcp-oauth/oauth-registration.service.spec.ts src/modules/mcp/mcp.controller.spec.ts
npm run build
```

Kiểm thử bằng trình duyệt thật (cần Playwright Chromium; Windows dùng Edge):

```powershell
$env:MCP_OAUTH_BROWSER_TEST='1'
npm test -- --runInBand src/modules/mcp-oauth/oauth.integration.spec.ts
```

Test này mở form thực, nhập tài khoản test trong bộ nhớ, kiểm tra cookie,
Origin/Referer và chuỗi callback qua hai server loopback có origin khác nhau,
rồi đổi code, gọi MCP và refresh token. Không gửi code ra ngoài máy.
Bộ kiểm thử mặc định bỏ qua test browser nếu chưa bật cờ.

Kiểm thử HTTP dùng OAuth library thật với adapter lưu trữ giả lập. Bao gồm PKCE,
CSRF, code dùng một lần và race, refresh/thu hồi, ràng buộc client/resource,
scope, user/permission và quyền sở hữu kết nối.
