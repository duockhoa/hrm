# Đối tác kinh doanh SAP B1

Bảng `business_partners` lưu nhà cung cấp (`cSupplier`), khách hàng (`cCustomer`)
và khách hàng tiềm năng (`cLid`) từ company SAP cấu hình qua `SAP_COMPANY_DB`.
`card_code` là khóa duy nhất; `id` là ID nội bộ.

## Đồng bộ

- Cron `0 */30 * * * *`: chạy vào phút 00 và 30 mỗi giờ, khi backend hoạt động.
- Sử dụng session và cơ chế đọc hết các trang SAP của đồng bộ items.
- Upsert từng bản ghi theo `CardCode`; lỗi một bản ghi không dừng các bản ghi khác.
- Không chạy hai lượt đồng bộ đối tác cùng lúc trong một tiến trình backend.
- Không xóa bản ghi nội bộ khi đối tác không xuất hiện trong kết quả SAP.
- Không đồng bộ ngay khi khởi động; lượt đầu chạy theo lịch cron, giống items.
- Giữ riêng `Address` và `U_Diachi`, `ContactPerson` và `U_NLH`, `Phone1` và
  `U_SDT`. Các UDF khác: `U_LDT` → `partner_origin`, `U_MaDK` → `custom_partner_label`.
- Cờ SAP `tYES`/`tNO` chuyển thành boolean; giá trị thiếu lưu `null`.
- Ngày SAP lưu bằng cột DATE; giờ tạo/cập nhật giữ nguyên chuỗi SAP trong cột
  riêng, không giả định múi giờ của company SAP.

## API đọc dữ liệu nội bộ

Các endpoint yêu cầu `Authorization: Bearer <access_token>`.

| Phương thức | Endpoint | Kết quả |
| --- | --- | --- |
| GET | `/business-partners` | Mảng đối tác, sắp xếp theo `card_code` |
| GET | `/business-partners?cardType=cSupplier` | Mảng nhà cung cấp |
| GET | `/business-partners?search=Phúc` | Tìm theo mã, tên hoặc mã số thuế |
| GET | `/business-partners?cardType=cCustomer&search=KH` | Kết hợp hai bộ lọc |
| GET | `/business-partners/:card_code` | Chi tiết đối tác; 404 nếu không có |

`cardType` không hợp lệ trả 400. Mã đối tác trên URL phải được URL-encode nếu
có ký tự đặc biệt. API trả các cột trong bảng, không gọi SAP trực tiếp.

## Cài đặt database

Tại thư mục `backend`:

```sh
npx prisma migrate deploy
npx prisma generate
npm run build
```

Khởi động lại backend sau khi cập nhật schema/client. Dùng một tiến trình chạy
cron nếu triển khai nhiều replica để tránh đồng bộ trùng giữa các tiến trình.
