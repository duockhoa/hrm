# HRM

## Chạy bằng Docker

1. Sao chép các biến môi trường và điền giá trị thật:

   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

   `backend/.env` chứa JWT, Cloudinary, SAP và các thông tin tích hợp khác.
   Docker Compose tự thay `DATABASE_URL` của backend để kết nối MySQL nội bộ.

2. Khởi động toàn bộ web, API và MySQL:

   ```bash
   docker compose up --build
   ```

Sau khi khởi động:

- Web: `http://localhost:3000`
- API: `http://localhost:3012`
- Swagger: `http://localhost:50000/api-docs`

Migration Prisma được chạy một lần trong service `migrate` trước khi backend
khởi động. Dữ liệu MySQL và file upload được giữ trong Docker volumes.

Để chạy nền dùng `docker compose up --build -d`; để dừng dùng
`docker compose down`. Lệnh `docker compose down -v` sẽ xóa toàn bộ dữ liệu
MySQL và uploads nên chỉ dùng khi muốn tạo môi trường mới.

`NEXT_PUBLIC_BACKEND_API_URL` được nhúng vào bundle frontend trong lúc build.
Hãy đặt URL API công khai trước khi chạy `docker compose build` cho môi trường
production.
