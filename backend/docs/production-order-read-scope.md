# Giới hạn phạm vi lô theo vai trò

`Roles.production_order_read_limit` là số lệnh sản xuất được đọc. Mặc định 300;
`null` là không giới hạn. API tạo/sửa role nhận số nguyên dương hoặc `null`.
Trong HRM, mở Vai trò → Thêm/Sửa → Số lô sản xuất gần nhất được xem; để trống
để không giới hạn.

- Một lô tương ứng một bản ghi `ProductionOrders`, không đếm DISTINCT `lot_no`.
- Chọn tập lô bằng `creation_date DESC, id DESC`, trên toàn bộ lô, bao gồm lô hủy.
  Bộ lọc sản phẩm, TP/BTP, trạng thái, thời gian và phân trang chạy sau tập này.
- Nhiều vai trò: lấy giới hạn lớn nhất; một role `null` cho phép toàn bộ. Không có
  vai trò còn hiệu lực thì tập lô rỗng. Permission hành động vẫn được kiểm tra riêng.
- Tập lô dịch chuyển khi có lô mới; không có ngoại lệ cho lô đang xử lý.

Phạm vi được tính một lần cho mỗi HTTP request từ role hiện tại trong database,
không lấy giới hạn từ JWT hoặc tham số client. Middleware xác thực tạo ngữ cảnh
request; Prisma extension áp dụng điều kiện trước truy vấn list/count/aggregate,
chi tiết và hồ sơ con, kể cả ảnh/tệp qua quan hệ cha. Các quan hệ danh sách và
relation count trong include/select cũng được lọc. Truy cập chi tiết ngoài phạm
vi trả lỗi không tìm thấy qua cơ chế hiện có của service.

MCP dùng cùng ngữ cảnh HTTP và cùng tập ID cho SQL tìm kiếm, thống kê và phân tích
tham số. `all_time` mở khoảng thời gian trong tập lô được phép. Thống kê trả thêm
`data_scope`. API `GET /production-orders/access-scope` cung cấp phạm vi hiện tại.
Lấy nguyên liệu trực tiếp từ SAP kiểm tra phạm vi trước
khi gọi SAP; socket phiếu pha chế kiểm tra phạm vi khi kết nối. Ảnh/tệp dùng
`Cache-Control: private, no-store` để lần tải sau kiểm tra lại quyền.

Tác vụ nền và API tích hợp `data-export` dùng API key không có danh tính người dùng,
nên tiếp tục sử dụng phạm vi hệ thống. Nếu thêm API dùng SQL thô để đọc lô, phải
thêm `productionOrderScopeSql`; Prisma extension không thể tự sửa SQL thô. Các
request trong cùng một snapshot thấy cùng tập lô; request kế tiếp lấy lại role
và dữ liệu mới. Dữ liệu đã tải ở giao diện cần tải lại để phản ánh thay đổi role.

## Triển khai

Tại `backend`, dùng quy trình triển khai database hiện có:

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
```

Migration `20261018020000_add_role_production_order_read_limit` gán 300 cho role
hiện có và `null` cho role có tên `admin` (không phân biệt hoa thường). Các role
quản trị có tên khác cần được cấu hình rõ ràng. Role mới, kể cả tên `admin`, mặc
định 300 cho tới khi cấu hình khác. Cần áp dụng migration trước khi chạy backend
phiên bản mới. Trên Windows, nếu generate báo EPERM vì DLL engine đang được dùng,
dừng backend rồi chạy lại generate trước khi khởi động.

Kiểm thử bao gồm ranh giới lô 300/301, nhiều role, không role, snapshot và request
song song, ảnh qua sai lệch, tham số pha chế, include/count lồng nhau, truy vấn
Prisma thật có chặn I/O, và SQL MCP trước tổng hợp/phân trang.

### Database phát triển đã kiểm tra ngày 18/10/2026

Migration mới đã được thực thi riêng bằng `prisma db execute --schema
prisma/schema.prisma --file .../migration.sql` và ghi nhận bằng `prisma migrate
resolve --applied 20261018020000_add_role_production_order_read_limit`. Kiểm tra
đọc trên MySQL cục bộ xác nhận role giới hạn thấy đúng 300 lô, số đếm MCP trùng
Prisma, và truy vấn quan hệ ảnh/tham số/lô trước đó hợp lệ.

Lịch sử migration cũ đang có sai khác: hai migration
`20261015000000_add_post_secondary_pending_item_units` và
`20261018010000_add_mcp_order_search_indexes` chưa được ghi nhận áp dụng; database
có `20261006000000_add_suppliers` nhưng repo không có thư mục tương ứng. Lần thay
đổi này giữ nguyên các trạng thái đó và chỉ ghi nhận migration giới hạn lô.
