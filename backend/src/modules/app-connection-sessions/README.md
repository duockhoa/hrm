# Lịch sử kết nối EBR và WMS

- Menu trên cả EBR và WMS: **Lịch sử kết nối**, đường dẫn `/connection-history`, cùng giao diện, phân trang, bộ lọc trạng thái và số liệu tổng hợp.
- Quyền xem lịch sử: `users.list`, dùng cùng quyền với lịch sử đăng nhập hiện có. Ghi nhận kết nối chỉ cần quyền vào ứng dụng tương ứng: `hsl` cho EBR, `wms` cho WMS; không cần quyền xem lịch sử.
- Bảng chung `user_app_sessions` có `application_key` để phân biệt hai ứng dụng. Mỗi ứng dụng chỉ truy vấn lịch sử và số liệu tổng hợp của mình. Bảng này tách biệt với `user_login_sessions`: đăng nhập một lần có thể mở nhiều phiên ứng dụng.
- Khóa phiên hoạt động là `application_key:user_id:client_session_id`. Đăng xuất chỉ kết thúc phiên của chính người dùng, tab và ứng dụng đó.

## Cập nhật cơ sở dữ liệu

Dừng các backend instance cũ, chạy tại thư mục `backend`, rồi khởi động backend mới:

```sh
npx prisma migrate deploy
npx prisma generate
```

Migration mới: `20261115000000_share_app_connection_sessions`. Migration đổi tên bảng tại chỗ, giữ nguyên ID, thời gian và lịch sử EBR; gán `application_key = 'hsl'` cho dữ liệu cũ và thêm tiền tố `hsl:` vào khóa phiên đang hoạt động. Không chạy backend cũ song song trong lúc đổi tên bảng. Tái sinh Prisma Client khi backend đã dừng để tránh khóa file query engine trên Windows.

WMS bổ sung dependency `socket.io-client` (chạy `npm install` khi triển khai). Không cần biến môi trường mới. Reverse proxy dùng cùng đường dẫn WebSocket `/socket.io` với các socket phiếu cân/pha chế hiện có; khi API có tiền tố đường dẫn, frontend dùng tiền tố đó cho kết nối socket.

## Vòng đời phiên

Socket.IO namespace `/ebr-presence` yêu cầu quyền `hsl`, `/wms-presence` yêu cầu quyền `wms`. Cả hai dùng chung logic xác thực access token, người dùng còn tồn tại và chính sách IP. Ứng dụng được xác định cố định theo namespace, không lấy từ dữ liệu client gửi lên. Không chấp nhận refresh token. Khi access token hết hạn, frontend dùng luồng refresh token chung rồi kết nối lại.

Mỗi tab có `clientSessionId` lưu trong `sessionStorage`, với tên khóa và BroadcastChannel riêng cho từng ứng dụng. BroadcastChannel phát hiện tab được nhân bản để cấp mã riêng; trình duyệt cần hỗ trợ BroadcastChannel để phân biệt trường hợp này. Tải lại trang, chuyển trang và làm mới token giữ mã phiên. Socket đặt trong `ApplicationAccessGuard` dùng chung cho các trang ứng dụng.

Server cập nhật `last_seen_at` từ gói Engine.IO `pong`, tối đa một lần mỗi 20 giây, tránh phụ thuộc timer JS ở tab chạy nền. Phiên không có heartbeat trên 60 giây hiển thị “Chờ kết nối lại”. Ngắt kết nối được dành 90 giây để nối tiếp; nếu server dừng đột ngột, phiên không còn heartbeat được chốt sau 120 giây. Tác vụ quét chạy mỗi 30 giây, mỗi lượt tối đa 500 phiên, nên khi nhiều phiên đồng thời quá hạn có thể cần nhiều lượt quét.

Phiên đã chốt giải phóng `active_key` duy nhất, cho phép tab tạo dòng lịch sử mới. Mỗi kết nối có `connection_key` riêng; heartbeat/disconnect cũ và tác vụ quét chỉ được cập nhật đúng phiên bản kết nối đang sở hữu, tránh sự kiện đến trễ làm đóng phiên vừa kết nối lại. Các điều kiện này lưu ở DB để hỗ trợ nhiều backend instance mà không phụ thuộc bộ nhớ của một process.

Khi đăng xuất, frontend chờ server ghi kết thúc phiên qua socket acknowledgement; nếu không có kết nối, dùng `POST /app-connection-sessions/:applicationKey/end`. Nếu mất mạng, tác vụ quét sẽ chốt phiên theo timeout. Chỉ dùng danh tính từ token, không nhận `user_id` từ client để ghi lịch sử hoặc kết thúc phiên.

`ended_at` khi mất kết nối là mốc server phát hiện disconnect, hoặc heartbeat cuối cùng nếu không nhận được disconnect. Đây là thời điểm **ước tính**, không khẳng định thời điểm đóng trình duyệt thực tế. Thời lượng phiên có thể bao gồm gián đoạn ngắn và không phải thời gian thao tác. `connection_count` ghi số lần kết nối thành công trong phiên; bảng không lưu riêng từng lần gián đoạn ngắn.

API `GET /app-connection-sessions/:applicationKey` (`hsl` hoặc `wms`) hỗ trợ phân trang, tìm tên/tài khoản/email, trạng thái và khoảng ngày bắt đầu phiên theo múi giờ Việt Nam. Phản hồi gồm `application_key` và số liệu tổng hợp theo ứng dụng/người dùng/khoảng ngày (không áp dụng bộ lọc trạng thái cho số liệu tổng hợp). Giao diện tự tải lại mỗi 15 giây khi được hiển thị.

Giữ `GET /ebr-connection-sessions` và `POST /ebr-connection-sessions/end` làm alias cố định cho `hsl`, cùng namespace và sự kiện socket EBR cũ để tương thích các tab EBR chưa tải lại.
# Infinite connection history

`GET /app-connection-sessions/hsl?pagination=cursor&limit=300` starts an
infinite list. Pass `meta.next_cursor` as `cursor` on subsequent calls; `null`
means the list has ended. The same option is available for WMS and the legacy
EBR route. Existing page-based requests and response fields remain supported.
The maximum limit is 300. Invalid cursor values return HTTP 400.

Cursor ordering is `connected_at DESC, id DESC`, with an exclusive timestamp/ID
boundary. Newly inserted sessions do not shift older pages, and deleting the
boundary row does not invalidate the cursor. Keyword, status, application and
date filters apply to every page; reset the cursor when changing filters.
Totals and summary counts cover all matching sessions, not only the remaining
cursor range. Connection status is evaluated when each request is made.

The EBR UI loads 300 rows at a time. It refreshes every 15 seconds only while
showing the first batch at the top; deeper scrolling stays stable. “Làm mới”
restarts at the latest sessions. Search remains debounced for one second.
