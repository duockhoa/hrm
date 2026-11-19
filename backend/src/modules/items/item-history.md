# Lịch sử danh mục thành phẩm và bán thành phẩm

- EBR: nút **Lịch sử chỉnh sửa** tại detail `/finished-products/:itemCode` và `/semi-finished-products/:itemCode`.
- API: `GET /items/:itemCode/history?page=1&limit=20`, yêu cầu đăng nhập, quyền `items.read` và thỏa chính sách mạng, giống detail danh mục. API chỉ nhận phân trang, không cho client chọn bảng hoặc mã sản phẩm khác qua query.
- Lịch sử gồm thay đổi trực tiếp của sản phẩm (số đăng ký) và thông số sản xuất. Các cấu hình thiết bị, tính năng và biểu mẫu có màn hình quản lý riêng, không nằm trong lịch sử này.
- Hai model `Items` và `ProductionSpecifications` có khóa chuỗi `item_code`; audit lưu vào `entity_key`, dùng `entity_id = 0` làm giá trị quy ước cho bản ghi có khóa chuỗi. Truy vấn lịch sử luôn giới hạn cả `entity_type` lẫn `entity_key`. Các model dùng ID số giữ cách ghi hiện tại.
- Snapshot lưu số đăng ký, tên dây chuyền và dạng bào chế tại thời điểm sửa khi mutation trả về các quan hệ này. Không tạo lịch sử cho cập nhật chỉ đổi thời gian hoặc người cập nhật.
- Chỉ các thay đổi sau khi triển khai được ghi nhận; trước đó bộ ghi audit bỏ qua hai model có khóa chuỗi, nên không thể khôi phục giá trị cũ.

Triển khai: chạy `npx prisma migrate deploy`, `npx prisma generate` trong backend và khởi động lại backend. Trên Windows, cần dừng backend trước khi generate nếu DLL query engine đang bị khóa. Migration `20261119000000_add_audit_entity_key` chỉ thêm cột nullable và index, không đổi dữ liệu lịch sử hiện có.
