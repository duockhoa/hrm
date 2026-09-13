# Giới hạn kiểm tra khối lượng và thể tích

API `semi-finished-net-weight-checks`, `semi-finished-gross-weight-checks` và `volume-checks` hỗ trợ thêm `lower_limit` (giới hạn dưới), `upper_limit` (giới hạn trên).

- Tạo: `POST /production-orders/:id/<loại kiểm tra>`.
- Sửa: `PATCH /production-orders/<loại kiểm tra>/:checkId`.
- GET danh sách và chi tiết trả thêm hai trường này, dạng chuỗi Decimal hoặc null.

Hai trường không bắt buộc, nhận số hoặc chuỗi số (hỗ trợ dấu phẩy thập phân). Khối lượng dùng DECIMAL(10, 3), thể tích dùng DECIMAL(10, 2). Đơn vị theo bản ghi; thể tích dùng ml. Giá trị phải không âm và giới hạn dưới không vượt giới hạn trên. Giá trị đo vẫn được phép nằm ngoài giới hạn để ghi nhận kết quả thực tế.

Ví dụ dữ liệu bổ sung vào yêu cầu tạo/sửa:

```json
{
  "lower_limit": "0.380",
  "upper_limit": "0.420"
}
```

Khi sửa, bỏ qua trường để giữ nguyên; gửi null hoặc chuỗi rỗng để xóa. Dữ liệu cũ có hai trường bằng null.

Triển khai migration `20260913000000_add_weight_volume_check_limits` trước khi chạy backend mới: chạy `npx prisma migrate deploy` trong thư mục backend, rồi `npx prisma generate` và build backend.
