# Kế hoạch tính năng khảo sát nội bộ nhân viên

## 1. Phạm vi và quyết định đã chốt

- Người dùng xác nhận khảo sát dành cho nhân viên nội bộ.
- Phiên bản đầu có ghi danh. Người trả lời được thông báo rõ trước khi tham gia
  rằng câu trả lời có liên kết với tài khoản nhân viên và người có quyền được xem.
- Khảo sát ẩn danh là hạng mục sau; cần thiết kế riêng cách tách danh tính, chống
  gửi trùng, nhật ký và báo cáo trước khi triển khai.
- Đề xuất đặt giao diện trong eBR đang phát triển, backend dùng chung với HRM.
  Chưa thay đổi mã ứng dụng hoặc database trong giai đoạn lập kế hoạch này.

Mục tiêu: người phụ trách tự tạo khảo sát, giao đúng nhân viên, theo dõi tiến độ
và tổng hợp kết quả mà không phải thu thập thủ công.

## 2. Nền tảng có thể tái sử dụng

- Backend NestJS, Prisma/MySQL; frontend eBR dùng Next.js, SWR, React Hook Form
  và Zod.
- Tài khoản `Users`, phòng ban `Departments`, vai trò và các permission hiện có.
  Phòng ban hiện dùng `name` làm khóa; không giả định có `department_id` kiểu số.
- Backend đã có API Notifications, lịch chạy ScheduleModule và audit log.
- Backend có ExcelJS để xuất báo cáo XLSX.

Hai phụ thuộc cần xử lý trong phạm vi triển khai:

1. eBR có ApplicationAccessGuard yêu cầu ứng dụng `hsl`. Bản đầu chỉ giao khảo sát
   cho nhân viên có tài khoản hoạt động và quyền vào eBR. Nếu cần toàn công ty,
   bổ sung điểm truy cập tại HRM hoặc một ứng dụng khảo sát riêng dùng chung API;
   không tự cấp quyền eBR chỉ để nhân viên trả lời khảo sát.
2. Header eBR hiện truyền `content={[]}` vào chuông thông báo. Cần nối API thông
   báo, số chưa đọc và đường dẫn đến khảo sát để thông báo phát hành dùng được.

## 3. Chức năng phiên bản đầu

### Người quản lý khảo sát

- Tạo tên, mô tả, hướng dẫn, thời điểm bắt đầu và hạn trả lời.
- Thêm, sửa, xóa, sắp xếp câu hỏi; đánh dấu bắt buộc.
- Hỗ trợ chọn một, chọn nhiều, đánh giá 1–5, văn bản ngắn và văn bản dài.
- Chọn toàn bộ nhân viên đủ điều kiện, theo phòng ban hoặc một danh sách cụ thể.
  Các tập được hợp nhất, loại trùng và xem trước số người nhận.
- Xem trước đúng giao diện nhân viên trước khi phát hành.
- Phát hành, đóng sớm, sao chép thành bản nháp mới và lưu trữ khảo sát đã đóng.
- Xem tiến độ, thống kê câu hỏi và xuất Excel theo quyền.

### Nhân viên

- Mục “Khảo sát của tôi”: chưa trả lời, đã trả lời và hết hạn.
- Mở khảo sát được giao, thấy hạn trả lời và thông tin có ghi danh.
- Lưu nháp trên server, mở lại trên thiết bị khác và tiếp tục trả lời.
- Gửi một lần, nhận xác nhận và xem lại câu trả lời của mình.
- Sau khi gửi, câu trả lời được khóa trong bản đầu.

### Chưa đưa vào bản đầu

Ẩn danh, khách ngoài hệ thống, nhánh câu hỏi có điều kiện, upload tệp, chấm điểm
bài thi, sửa câu trả lời sau khi gửi, lịch khảo sát lặp lại, phân tích bằng AI,
tool MCP và gửi email khảo sát. Nhắc hạn tự động có thể bổ sung sau khi luồng
phát hành/thông báo cơ bản hoạt động ổn định.

## 4. Vòng đời và quy tắc nghiệp vụ

Trạng thái lưu: `DRAFT → PUBLISHED → CLOSED → ARCHIVED`.

- `PUBLISHED` hiển thị “Chờ mở” hoặc “Đang mở” dựa vào thời gian bắt đầu/kết thúc.
  Server kiểm tra thời gian khi lưu nháp/gửi, kể cả khi tác vụ đóng tự động chạy trễ.
- Nháp được chỉnh câu hỏi và đối tượng nhận. Phát hành yêu cầu có câu hỏi hợp lệ,
  ít nhất một người nhận và khoảng thời gian hợp lệ.
- Khi phát hành, chốt danh sách người nhận, tên và phòng ban để làm cơ sở báo cáo.
  Nhân viên đổi phòng hoặc nhân viên mới không tự thay đổi tập đối tượng đã chốt.
- Sau phát hành, khóa nội dung câu hỏi, lựa chọn và danh sách người nhận. Cần sửa
  nội dung thì sao chép thành khảo sát mới để kết quả cũ giữ nguyên ý nghĩa.
- Hạn trả lời được xác định theo Asia/Ho_Chi_Minh, lưu mốc thời gian UTC. API từ
  chối gửi khi `now >= closes_at` hoặc khảo sát đã đóng/lưu trữ.
- Người tạo khảo sát cũng cần được giao nếu muốn trả lời. Quyền quản lý không tự
  biến người đó thành người tham gia.
- Mỗi nhân viên có tối đa một phản hồi cho một khảo sát. Lưu nháp chưa tính là
  hoàn thành; chỉ phản hồi đã gửi mới tham gia thống kê.
- Gửi phản hồi phải kiểm tra trên server: đúng người nhận, đúng khảo sát, đủ câu
  bắt buộc, đúng loại dữ liệu, đúng lựa chọn, đúng số lượng chọn và độ dài văn bản.
- Lưu nháp/gửi dùng transaction và kiểm tra phiên bản. Hai tab không được ghi đè
  câu trả lời mới hơn; gửi lại cùng phản hồi đã hoàn thành trả xác nhận đã gửi.
- Phát hành và đóng khảo sát cũng phải kiểm tra trạng thái trong transaction.
  Chỉ một lần phát hành được tạo người nhận và thông báo.
- Gửi phản hồi và đóng khảo sát dùng chung cơ chế kiểm tra/khóa trạng thái để
  thao tác đóng đồng thời không cho phép nhận thêm phản hồi sau đó.
- Bản nháp chưa phát hành có thể xóa; khảo sát đã phát hành được lưu trữ.

## 5. Mô hình dữ liệu dự kiến

| Bảng/model | Nội dung chính |
| --- | --- |
| `Surveys` | Tiêu đề, mô tả, trạng thái, người tạo/phát hành, thời gian mở/đóng, phiên bản cập nhật |
| `SurveyQuestions` | Survey, loại câu hỏi, nội dung, thứ tự, bắt buộc, cấu hình giới hạn |
| `SurveyQuestionOptions` | Các lựa chọn có ID ổn định và thứ tự |
| `SurveyParticipants` | Survey, user, tên/phòng ban tại thời điểm phát hành |
| `SurveyResponses` | Survey, participant, trạng thái nháp/đã gửi, thời điểm gửi, phiên bản cập nhật |
| `SurveyAnswers` | Response, question, giá trị văn bản hoặc đánh giá |
| `SurveyAnswerOptions` | Answer và option đã chọn; dùng cho cả chọn một và chọn nhiều |

Ràng buộc chính:

- Unique `(survey_id, user_id)` cho người nhận; unique `participant_id` cho phản hồi.
- Unique `(response_id, question_id)` cho câu trả lời; unique `(answer_id, option_id)`
  cho lựa chọn. Kiểm tra participant/question/option thuộc đúng khảo sát.
- Index cho trạng thái/hạn khảo sát, khảo sát của từng nhân viên và trạng thái phản hồi.
- Không xóa dây chuyền dữ liệu khảo sát đã gửi khi vô hiệu hóa tài khoản nhân viên.
- Báo cáo phòng ban dùng giá trị chốt ở người nhận, không dựa vào phòng ban hiện tại.

Thiết kế Prisma chi tiết được thực hiện ở bước 1; đây chưa phải schema/migration.

## 6. Phân quyền và quyền xem dữ liệu

| Permission đề xuất | Mục đích |
| --- | --- |
| `surveys.respond` | Xem và trả lời khảo sát được giao, xem lại phản hồi của mình |
| `surveys.manage` | Tạo và quản lý khảo sát của mình |
| `surveys.publish` | Phát hành và đóng khảo sát thuộc phạm vi quản lý |
| `surveys.results.read` | Xem kết quả tổng hợp của khảo sát thuộc phạm vi quản lý |
| `surveys.responses.read` | Xem phản hồi có ghi danh của người khác trong phạm vi quản lý |
| `surveys.export` | Xuất dữ liệu theo cùng mức quyền xem kết quả/chi tiết |
| `surveys.manage-all` | Quản lý và truy cập khảo sát toàn hệ thống cùng các quyền thao tác tương ứng |

- Quyền quản lý và phạm vi sở hữu được kiểm tra ở backend trên mọi API.
- Mặc định người quản lý chỉ xem khảo sát do mình tạo; quản trị toàn hệ thống cần
  `manage-all`. Người tham gia chỉ xem câu hỏi và phản hồi của chính mình.
- Quyền xuất không tự cấp quyền xem câu trả lời có ghi danh. Xuất chi tiết cần cả
  `responses.read` và `export`; xuất tổng hợp cần `results.read` và `export`.
- API chọn người nhận chỉ trả ID, tên, phòng ban và trạng thái cần thiết trong phạm
  vi được phép; không buộc người tạo khảo sát phải có quyền đọc đầy đủ hồ sơ HRM.
- Tận dụng audit cho thay đổi cấu hình/phát hành/đóng. Cần cấu hình riêng để audit
  câu trả lời không sao chép nội dung và danh tính vào log chung có phạm vi đọc rộng hơn.

## 7. Màn hình và API dự kiến

Màn hình:

1. `/surveys`: khảo sát của tôi, hạn và trạng thái trả lời.
2. `/surveys/manage`: danh sách quản lý có phân trang và lọc trạng thái.
3. `/surveys/new` và `/surveys/:id/edit`: soạn câu hỏi, chọn người nhận, xem trước.
4. `/surveys/:id`: thông tin khảo sát, trả lời/lưu nháp hoặc xem lại phản hồi.
5. `/surveys/:id/results`: tiến độ, biểu đồ, phản hồi và xuất Excel theo quyền.

| Nhóm | API đề xuất |
| --- | --- |
| Danh sách | `GET /surveys/mine`, `GET /surveys/manage` |
| Đối tượng | `GET /surveys/eligible-users`, `POST /surveys/preview-audience` |
| Soạn thảo | `POST /surveys`, `GET/PATCH/DELETE /surveys/:id` |
| Vòng đời | `POST /surveys/:id/publish`, `/close`, `/archive`, `/duplicate` |
| Trả lời | `GET/PUT /surveys/:id/my-response`, `POST /surveys/:id/submit` |
| Kết quả | `GET /surveys/:id/results`, `/responses`, `/export` |

Đường dẫn tĩnh đặt trước route `:id`. Danh sách người nhận và phản hồi đều phân
trang; kiểm tra quyền xem khảo sát trước khi trả nội dung, số liệu hoặc xuất tệp.

## 8. Tổng hợp kết quả và thông báo

- Tiến độ: số phản hồi đã gửi / số người nhận đã chốt. Hiển thị riêng chưa trả lời
  và đang nháp; quyền xem danh sách tên chi tiết được kiểm soát tương ứng.
- Câu chọn một: số lượt và tỷ lệ theo lựa chọn. Câu chọn nhiều: số người chọn từng
  lựa chọn; ghi rõ tổng tỷ lệ có thể vượt 100%.
- Câu đánh giá: phân bố điểm và trung bình của các phản hồi có trả lời câu đó.
  Câu bỏ trống không được tính thành 0.
- Mẫu số của tỷ lệ từng câu là số phản hồi đã gửi có trả lời câu đó; hiển thị số
  bỏ trống riêng. Bộ lọc phòng ban áp dụng nhất quán cho cả tử số và mẫu số.
- Văn bản: danh sách có phân trang; xem danh tính chỉ khi có quyền chi tiết.
- Excel: tách thông tin khảo sát, thống kê và phản hồi theo quyền. Xuất văn bản
  dưới dạng dữ liệu, không biến nội dung do nhân viên nhập thành công thức.
- Phát hành tạo thông báo trong ứng dụng, dẫn tới khảo sát được giao. Lưu người
  nhận và thông báo nhất quán để retry phát hành không tạo trùng.
- Không phụ thuộc thông báo để mở khảo sát: mục “Khảo sát của tôi” luôn đọc trực
  tiếp từ danh sách người được giao.

## 9. Các bước triển khai

| Bước | Công việc | Điều kiện hoàn thành |
| --- | --- | --- |
| 1. Nền dữ liệu và quyền | Prisma/migration, module surveys, DTO, quyền và quy tắc trạng thái | Tạo/lưu nháp được; kiểm thử quyền, sở hữu và ràng buộc dữ liệu qua |
| 2. Quản lý khảo sát | Soạn câu hỏi, sắp xếp, chọn người nhận, xem trước, phát hành | Người phụ trách tạo và phát hành được khảo sát hoàn chỉnh |
| 3. Nhân viên trả lời | Danh sách của tôi, form 5 loại câu, lưu nháp, gửi và xem lại | Không gửi trùng, không trả lời thay người khác hoặc gửi sau hạn |
| 4. Báo cáo | Tiến độ, phân bố, lọc phòng ban, chi tiết có quyền và Excel | Số liệu khớp dữ liệu mẫu; quyền báo cáo/xuất nhất quán |
| 5. Tích hợp và nghiệm thu | Chuông thông báo eBR, đóng/lưu trữ, kiểm thử đồng thời và luồng thực tế | Chạy đủ luồng bằng tài khoản quản lý và nhân viên; triển khai thử nghiệm |

Thư mục dự kiến: `backend/src/modules/surveys`,
`ebr_frontend/src/features/surveys`, các trang dưới
`ebr_frontend/src/app/(mainlayout)/surveys`, service và API_ROUTES tương ứng.
Chỉ triển khai migration sau khi kiểm tra lịch sử migration của môi trường đích.

## 10. Kịch bản nghiệm thu bắt buộc

1. Tạo khảo sát gồm cả 5 loại câu; xem trước, phát hành cho 2 phòng ban có nhân
   viên được chọn trùng và xác nhận mỗi người chỉ nhận một lần.
2. Nhân viên ngoài danh sách không đọc được nội dung hoặc gửi phản hồi bằng ID.
3. Lưu nháp thiếu câu bắt buộc được phép; gửi chính thức bị chặn cho đến khi đủ.
4. Sửa ID câu hỏi/lựa chọn sang khảo sát khác bị từ chối trên server.
5. Hai tab sửa nháp phát hiện xung đột; hai lần gửi đồng thời chỉ tạo một phản hồi.
6. Sau khi gửi, autosave/lưu nháp cũ không thay đổi kết quả đã gửi.
7. Gửi đúng/sau thời điểm đóng, đóng sớm và tác vụ lịch chạy trễ đều tuân thủ hạn
   do server kiểm tra, kể cả khi form đã mở trước đó.
8. Đổi phòng ban của nhân viên sau phát hành không làm thay đổi đối tượng và
   mẫu số báo cáo đã chốt; vô hiệu hóa tài khoản không xóa lịch sử trả lời.
9. Người có quyền xem tổng hợp không đọc/xuất được phản hồi có ghi danh của người khác.
10. Thống kê bỏ trống/chọn nhiều, bộ lọc phòng ban và số liệu Excel khớp nhau.
11. Gửi lại thao tác phát hành không nhân đôi người nhận hoặc thông báo.
12. Audit/log không tạo đường truy cập vòng tới nội dung phản hồi ngoài quyền khảo sát.

Luồng chạy thử: tạo nháp → thêm câu hỏi → chọn đối tượng → phát hành → nhận thông
báo → lưu nháp → gửi → xem tiến độ → đóng → xem/xuất kết quả → lưu trữ.
