# Lịch sử kết nối EBR

- Menu EBR: **Lịch sử kết nối**, đường dẫn `/connection-history`.
- Quyền xem toàn bộ lịch sử: `users.list`, dùng cùng quyền với lịch sử đăng nhập hiện có. Các tài khoản có quyền vào ứng dụng `hsl` đều được ghi nhận kết nối, không cần quyền xem lịch sử.
- Bảng `user_ebr_sessions` tách biệt với `user_login_sessions`: đăng nhập một lần có thể mở nhiều phiên EBR.

## Cập nhật cơ sở dữ liệu

Chạy tại thư mục `backend` trước khi khởi động backend có tính năng này:

```sh
npx prisma migrate deploy
npx prisma generate
```

Migration bổ sung: `20261107000000_add_user_ebr_sessions`. Không cần thêm thư viện hoặc biến môi trường. Reverse proxy dùng cùng đường dẫn WebSocket `/socket.io` với các socket phiếu cân/pha chế hiện có; khi API có tiền tố đường dẫn, frontend dùng tiền tố đó cho kết nối socket.

## Vòng đời phiên

Socket.IO namespace `/ebr-presence` xác thực access token, người dùng còn tồn tại, quyền ứng dụng `hsl` và chính sách IP. Không chấp nhận refresh token. Khi access token hết hạn, frontend dùng luồng refresh token chung rồi kết nối lại.

Mỗi tab có `clientSessionId` lưu trong `sessionStorage`. BroadcastChannel phát hiện tab được nhân bản để cấp mã riêng; trình duyệt cần hỗ trợ BroadcastChannel để phân biệt trường hợp này. Tải lại trang, chuyển trang và làm mới token giữ mã phiên. Socket đặt trong `ApplicationAccessGuard` dùng chung cho các trang ứng dụng.

Server cập nhật `last_seen_at` từ gói Engine.IO `pong`, tối đa một lần mỗi 20 giây, tránh phụ thuộc timer JS ở tab chạy nền. Phiên không có heartbeat trên 60 giây hiển thị “Chờ kết nối lại”. Ngắt kết nối được dành 90 giây để nối tiếp; nếu server dừng đột ngột, phiên không còn heartbeat được chốt sau 120 giây. Tác vụ quét chạy mỗi 30 giây, mỗi lượt tối đa 500 phiên, nên khi nhiều phiên đồng thời quá hạn có thể cần nhiều lượt quét.

Phiên đã chốt giải phóng `active_key` duy nhất, cho phép tab tạo dòng lịch sử mới. Mỗi kết nối có `connection_key` riêng; heartbeat/disconnect cũ và tác vụ quét chỉ được cập nhật đúng phiên bản kết nối đang sở hữu, tránh sự kiện đến trễ làm đóng phiên vừa kết nối lại. Các điều kiện này lưu ở DB để hỗ trợ nhiều backend instance mà không phụ thuộc bộ nhớ của một process.

Khi đăng xuất, frontend chờ server ghi kết thúc phiên qua socket acknowledgement; nếu không có kết nối, dùng `POST /ebr-connection-sessions/end`. Nếu mất mạng, tác vụ quét sẽ chốt phiên theo timeout. Chỉ dùng danh tính từ token, không nhận `user_id` từ client để ghi lịch sử hoặc kết thúc phiên.

`ended_at` khi mất kết nối là mốc server phát hiện disconnect, hoặc heartbeat cuối cùng nếu không nhận được disconnect. Đây là thời điểm **ước tính**, không khẳng định thời điểm đóng trình duyệt thực tế. Thời lượng phiên có thể bao gồm gián đoạn ngắn và không phải thời gian thao tác. `connection_count` ghi số lần kết nối thành công trong phiên; bảng không lưu riêng từng lần gián đoạn ngắn.

API `GET /ebr-connection-sessions` hỗ trợ phân trang, tìm tên/tài khoản/email, trạng thái và khoảng ngày bắt đầu phiên theo múi giờ Việt Nam. Phản hồi gồm số liệu tổng hợp theo người dùng/khoảng ngày (không áp dụng bộ lọc trạng thái cho số liệu tổng hợp). Giao diện tự tải lại mỗi 15 giây khi được hiển thị.
