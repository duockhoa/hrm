# API xuất PDF báo cáo lô sản xuất

`GET /production-orders/:id/batch-report/pdf`

Gửi token đăng nhập như các API lệnh sản xuất khác. Yêu cầu quyền
`production-orders.export`; không thay đổi API xuất Word `GET /production-orders/:id/export`.

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $EBR_ACCESS_TOKEN" \
  http://localhost:3012/production-orders/2031/batch-report/pdf \
  --output bao-cao-lo-2031.pdf
```

- `200`: file `application/pdf`, tên `Bao cao lo san xuat <tên sản phẩm> <số lô>.pdf`.
- `400`: ID không phải số nguyên.
- `401/403`: chưa đăng nhập hoặc thiếu quyền theo guards hiện hành.
- `404`: không tìm thấy lệnh sản xuất.
- `422`: một bản ghi kiểm tra quá dài để vừa một trang.
- `503`: tiến trình backend đang xuất một báo cáo khác, Chromium chưa sẵn sàng hoặc xuất quá thời gian cho phép.

## Phạm vi

Báo cáo gồm trang bìa, thông tin lô, lệnh sản xuất, phiếu xuất kho, sai lệch và
phần **Theo dõi nhiệt độ, độ ẩm**, sau đó là **Kiểm tra vệ sinh**. Phần mới lấy dữ liệu
`environmentChecks` của lệnh sản xuất, sắp xếp theo `checked_at` rồi `id` tăng dần.
Các cột gồm STT, thời điểm kiểm tra (giờ Việt Nam), phòng, nhiệt độ (°C), độ ẩm (%)
và người nhập. Khi chưa có bản ghi, vẫn xuất một trang thông báo chưa có dữ liệu.

Phần **Kiểm tra vệ sinh** lấy `hygieneChecks` theo `created_at` và `id` tăng dần,
gồm STT, thời điểm ghi nhận (giờ Việt Nam), phòng/thiết bị, loại vệ sinh, kết quả,
ghi chú và người nhập. Giữ nguyên kết quả đã ghi nhận, bao gồm “Không đạt”.
Khi chưa có dữ liệu vẫn xuất trang thông báo. Ghi chú được giữ xuống dòng và
escape HTML; các hàng tự chia trang, lặp tiêu đề và chân trang như phần nhiệt độ/độ ẩm.

Phần **Kiểm tra thể tích** tiếp nối kiểm tra vệ sinh, lấy `volumeChecks` theo
`created_at` và `id` tăng dần. Gồm thời điểm kiểm tra (giờ Việt Nam), dạng bao bì/
dạng bào chế, yêu cầu, khoảng kiểm soát đã lưu (`lower_limit` – `upper_limit`),
thể tích đơn vị 1–6 và người nhập. Số đo in kèm đơn vị, hai chữ số thập phân;
đơn vị chưa đo hiển thị “—”, chưa có cả hai giới hạn hiển thị “Chưa có”.
Không suy ra giới hạn từ nội dung yêu cầu. Phần này tự chia trang và có trang
thông báo nếu chưa có bản ghi.

Các hàng nhiệt độ/độ ẩm được đo chiều cao sau khi tải font và tự chia trang để
không chồng lên chân trang. Mỗi trang lặp tiêu đề, tiêu đề bảng, watermark và
thông tin in; số trang tính trên toàn báo cáo. Nếu một bản ghi riêng lẻ quá dài
để vừa trang, API trả 422.

HTML/CSS tại `templates/batch-report/production-order.html`; dữ liệu phần mới
được dựng tại `src/modules/production-orders/exports/environment-checks-report-html.ts`.
Logo và watermark được nhúng trực tiếp vào HTML.

Luôn dùng nội dung lệnh pha chế/bán thành phẩm cho cả mã TP và BTP.
PDF không đọc, điền hay chuyển đổi DOCX. Có thể sửa bố cục PDF trực tiếp trong HTML/CSS.
Giữ các trường thông tin, mã biểu mẫu, ngày ban hành và phần ký tên của mẫu BTP đã chọn.
Tên in sẵn không phải chữ ký điện tử hoặc bằng chứng đã phê duyệt.
Khổ giấy hiện là A4; ngày tháng và cỡ lô dùng cùng cách định dạng với API Word.

Playwright/Chromium in HTML với CSS `@page`. Font ưu tiên Times New Roman, sau đó
Liberation Serif và Noto Serif. Dùng cùng bộ font ở các môi trường để bản in nhất quán.
Các giá trị nhập được escape, hỗ trợ xuống dòng; không chèn HTML tùy ý từ dữ liệu lô.

## Cài đặt và triển khai

```bash
cd backend
npm install
npx playwright install --with-deps --only-shell chromium
sudo apt-get install -y fonts-liberation fonts-noto-core
npm run build
```

Cài browser dưới tài khoản chạy backend, hoặc đặt `PLAYWRIGHT_BROWSERS_PATH`
nhất quán khi cài và khi chạy. Khi cập nhật Playwright cần cài browser tương ứng.
Gói `playwright` nằm trong dependencies để xuất được ở production. Dockerfile đã cài Chromium/font và copy thư mục templates vào image;
build lại image khi triển khai. Chạy backend từ thư mục chứa `templates` như API Word.

Mỗi tiến trình backend chỉ xuất một PDF tại một thời điểm, trả 503 nếu đang bận.
Chromium đóng sau mỗi lượt, kể cả lỗi; giới hạn khởi động 15 giây và dựng PDF 30 giây.
Trang dựng PDF tắt JavaScript và chặn request mạng. HTML được tạo từ mẫu nội bộ,
không nhận tài liệu hay URL tùy ý từ client.
PDF trả trực tiếp trong bộ nhớ và có `Cache-Control: private, no-store`.

## Kiểm tra

```bash
npm test -- --runInBand production-orders.controller.spec.ts production-orders.service.spec.ts
RUN_PDF_RENDER_TESTS=1 npm test -- --runInBand environment-checks-report-html.spec.ts hygiene-checks-report-html.spec.ts volume-checks-report-html.spec.ts
npm run build
```

Bộ kiểm thử Chromium của phần nhiệt độ/độ ẩm kiểm tra 90 bản ghi, chia trang,
không chồng chân trang và tổng số trang PDF. Unit test kiểm tra dữ liệu rỗng,
định dạng số/thời gian và escape HTML. Các bộ kiểm thử API kiểm tra quyền,
header tải file, lô không tồn tại, lỗi khởi động browser và giới hạn xuất đồng thời.
