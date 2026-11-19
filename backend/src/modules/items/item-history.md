# Lịch sử danh mục thành phẩm và bán thành phẩm

- EBR: nút **Lịch sử chỉnh sửa** tại detail `/finished-products/:itemCode` và `/semi-finished-products/:itemCode`.
- API: `GET /items/:itemCode/history?page=1&limit=20`, yêu cầu đăng nhập, quyền `items.read` và thỏa chính sách mạng, giống detail danh mục. API chỉ nhận phân trang, không cho client chọn bảng hoặc mã sản phẩm khác qua query.
- Lịch sử gồm thay đổi trực tiếp của sản phẩm (số đăng ký), thông số sản xuất và tính năng đã chọn: thêm/bỏ, bật/tắt, bắt buộc, thứ tự. Cấu hình thiết bị và biểu mẫu không nằm trong lịch sử này.
- Audit `item_features` lưu ID cấu hình, mã sản phẩm ở `entity_key`, tên tính năng ở `entity_name`. Lịch sử cũ được nối bằng ID cấu hình hiện có và snapshot CREATE/DELETE chứa `item_code`, nên vẫn tìm được các thay đổi trước khi bỏ cấu hình. Tên trong log mới giữ nguyên tại thời điểm chỉnh sửa; log cũ còn cấu hình dùng tên tính năng hiện tại nếu chưa có tên lưu sẵn.
- Sao chép tính năng dùng `createMany/deleteMany` nên ghi một audit `item_feature_config` chứa toàn bộ cấu hình trước/sau trong cùng transaction; không ghi nếu cấu hình không đổi. Lỗi ghi audit làm transaction sao chép thất bại. Lịch sử sao chép cũ chưa từng được audit không thể khôi phục.
- Hai model `Items` và `ProductionSpecifications` có khóa chuỗi `item_code`; audit lưu vào `entity_key`, dùng `entity_id = 0` làm giá trị quy ước cho bản ghi có khóa chuỗi. Truy vấn lịch sử luôn giới hạn cả `entity_type` lẫn `entity_key`. Các model dùng ID số giữ cách ghi hiện tại.
- Snapshot lưu số đăng ký, tên dây chuyền và dạng bào chế tại thời điểm sửa khi mutation trả về các quan hệ này. Không tạo lịch sử cho cập nhật chỉ đổi thời gian hoặc người cập nhật.
- Hai model có khóa chuỗi chỉ được ghi từ khi triển khai ghi audit cho items; lịch sử tính năng cũ chỉ hiển thị khi đã có log đủ để xác định sản phẩm, không suy đoán dữ liệu chưa từng được ghi.

Triển khai: chạy `npx prisma migrate deploy`, `npx prisma generate` trong backend và khởi động lại backend. Trên Windows, cần dừng backend trước khi generate nếu DLL query engine đang bị khóa. Migration `20261119000000_add_audit_entity_key` chỉ thêm cột nullable và index, không đổi dữ liệu lịch sử hiện có.
