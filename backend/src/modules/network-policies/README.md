# Chính sách truy cập mạng

Toàn bộ 8 controller của `ProductionOrdersModule` dùng `NetworkPolicyGuard`
sau xác thực và kiểm tra quyền hiện có. Bao gồm danh sách, chi tiết, ghi dữ liệu,
duyệt, xuất/tải file, ảnh, cân và pha chế. Kết nối realtime cân và pha chế cũng
được kiểm tra khi xác thực kết nối.

Toàn bộ API của `ItemsModule` cũng dùng cùng guard, bao gồm danh mục sản phẩm,
thiết bị sản phẩm, mẫu in date, mẫu pha chế và các API con hoặc ảnh liên quan.
Toàn bộ API của `ProductionOrderDeviationsModule` cũng được kiểm tra, gồm danh
sách sai lệch, lọc theo lệnh sản xuất, chi tiết, ảnh, tạo, cập nhật và xóa.
User `IP_ALLOWLIST` phải khớp cùng danh sách IP dùng chung cho cả ba module.
Các module khác, login và refresh token
không bị giới hạn mạng.

- `OPEN`: bỏ qua điều kiện IP; vẫn phải có quyền thao tác.
- `IP_ALLOWLIST`: IP phải thuộc danh sách dùng chung tại HRM → IP truy cập.
- Không có IP hợp lệ, danh sách rỗng hoặc chính sách không hợp lệ: từ chối.
- IPv4, IPv6, CIDR và IPv4 được biểu diễn dưới dạng IPv6 đều được hỗ trợ.
- Chính sách user được đọc bởi JWT strategy ở mỗi request; danh sách IP cũng
  được đọc mới ở mỗi lần kiểm tra, không lưu trong token hoặc cache.

Khi bị chặn, HTTP trả `403` với `code: IP_ACCESS_DENIED`. EBR hiển thị thông báo
và giữ phiên đăng nhập. Socket bị từ chối kết nối với cùng mã lỗi.

## Reverse proxy

`TRUSTED_PROXY_CIDRS` trong `backend/.env` là các IP/CIDR **của proxy thực tế**,
phân cách bằng dấu phẩy. Để trống nếu client kết nối trực tiếp. Không điền IP
nhà máy vào biến này; IP nhà máy phải được cấu hình trong danh sách cho phép.

Ví dụ với một proxy có IP nội bộ cố định `10.20.0.5`:

```dotenv
TRUSTED_PROXY_CIDRS=10.20.0.5/32
```

Thay bằng địa chỉ proxy thực tế và khởi động lại backend. Proxy ngoài cùng
phải ghi đè header do client gửi; các proxy sau đó phải chuyển tiếp đúng chuỗi
`X-Forwarded-For`. Backend duyệt chuỗi từ proxy gần nhất và dừng tại hop đầu tiên
không đáng tin cậy. Header gửi trực tiếp từ client không được tin cậy.

Nếu proxy/tunnel kết nối vào backend bằng `localhost`, dùng:

```dotenv
TRUSTED_PROXY_CIDRS=127.0.0.1/32,::1/128
```

Nếu bỏ trống biến này, backend sẽ ghi IP kết nối local (`::1` hoặc `127.0.0.1`)
thay vì IP chuyển tiếp. Cần đặt biến trong môi trường của backend thực sự đang
chạy và khởi động lại tiến trình/container sau khi sửa. Các bản ghi lịch sử đã
lưu `::1` không tự đổi lại IP thật. Nếu vẫn nhận `::1` sau khi khai báo, kiểm tra
proxy có gửi `X-Forwarded-For` chứa IP người dùng hay không; cấu hình tin cậy
không thể khôi phục IP khi proxy không chuyển tiếp nó.

Trước khi gán `IP_ALLOWLIST`, kiểm tra cả đường IPv4, IPv6 và đường truyền dự
phòng tại nhà máy. Không cần migration bổ sung cho bước áp dụng kiểm tra mạng.
