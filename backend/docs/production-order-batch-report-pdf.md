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
- `422`: nội dung không vừa một trang mẫu; không cắt mất nội dung hay tạo thêm trang.
- `503`: tiến trình backend đang xuất một báo cáo khác, Chromium chưa sẵn sàng hoặc xuất quá thời gian cho phép.

## Phạm vi

Hiện chỉ có trang lệnh sản xuất đầu tiên, chưa thêm các phần báo cáo khác, watermark
hay giao diện. HTML/CSS được viết riêng tại
`templates/batch-report/production-order.html`; logo là asset độc lập
`templates/batch-report/logo.png`, nhúng trực tiếp vào HTML.

Luôn dùng nội dung lệnh pha chế/bán thành phẩm cho cả mã TP và BTP.
PDF không đọc, điền hay chuyển đổi DOCX. Có thể sửa bố cục PDF trực tiếp trong HTML/CSS.
Giữ các trường thông tin, mã biểu mẫu, ngày ban hành và phần ký tên của mẫu BTP đã chọn.
Tên in sẵn không phải chữ ký điện tử hoặc bằng chứng đã phê duyệt.
Khổ giấy hiện là Letter; ngày tháng và cỡ lô dùng cùng cách định dạng với API Word.

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
RUN_PDF_RENDER_TESTS=1 npm test -- --runInBand production-order-pdf-renderer.service.spec.ts
npm run build
```

Bộ kiểm thử Chromium kiểm tra cả mã TP/BTP đều xuất một trang theo mẫu HTML lệnh pha chế, lỗi tràn nội dung,
khả năng xuất lại sau lỗi và dữ liệu chứa ký tự HTML. Bộ unit test kiểm tra quyền,
header tải file, lô không tồn tại, lỗi khởi động browser và giới hạn xuất đồng thời.
