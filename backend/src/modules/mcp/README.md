# MCP module

Module NestJS cung cấp MCP qua Streamable HTTP tại `/mcp` trên cùng cổng backend.
Tên server trong MCP metadata và tool `get_server_info` là `DKPHARMA APP`.
Metadata có `title` và `icons` dùng logo DKPharma tại `templates/mcp/logo.png`.
Icon PNG được nhúng dạng data URI, không cần URL ảnh hoặc request xác thực riêng.
Dockerfile hiện có đóng gói thư mục `templates`, bao gồm logo này.
Client quyết định có hiển thị icon hay không; chưa xác nhận Gemini hỗ trợ trường
`icons`. Sau khi triển khai lại backend, kết nối lại custom app để lấy metadata
mới. Tên connector đã lưu phía client có thể cần đổi riêng hoặc tạo lại.
Module được đăng ký trong `AppModule`; không cần chạy thêm tiến trình.
OAuth/DCR cần áp dụng migration theo hướng dẫn OAuth bên dưới.
SDK chính thức: `@modelcontextprotocol/server` và `@modelcontextprotocol/node`.

## Kết nối

- Local: `http://localhost:<PORT>/mcp` (PORT mặc định trong `main.ts` là 3000).
- Docker Compose: `http://localhost:3012/mcp` với cấu hình mặc định của repo.
- Remote: `https://<backend-domain>/mcp`; proxy chuyển tiếp endpoint về backend.
- Chọn **OAuth** trong client rồi đăng nhập HRM để cấp quyền. Gemini hỗ trợ DCR
  tự đăng ký client: chỉ nhập URL MCP, để trống Client ID/Secret. Client đăng ký
  thủ công vẫn dùng ID/secret đã tạo. Xem [hướng dẫn OAuth](../mcp-oauth/README.md).
  Endpoint luôn yêu cầu OAuth; không chấp nhận HRM JWT hoặc API key.
- Transport là **Streamable HTTP**, không phải endpoint SSE `/sse` cũ.
- Handler không lưu phiên. SDK hỗ trợ client MCP đời 2025 qua luồng initialize
  và các phiên bản mới qua cơ chế tương thích của SDK. Không cần session ID.
- Request POST phải có `Content-Type: application/json` và
  `Accept: application/json, text/event-stream`.
- Mỗi request MCP phải có `Authorization: Bearer <MCP-access-token>`. Client
  OAuth tự quản lý việc lấy và refresh token.
- Client đời 2025 nhận kết quả qua SSE trên chính request POST; proxy cần cho
  phép `text/event-stream` và tắt buffering cho `/mcp`. GET/DELETE quản lý phiên
  đời 2025 trả HTTP 405 vì handler không lưu phiên.

Chạy backend bằng `npm run start:dev` trong thư mục `backend`, rồi nhập URL trên
vào client MCP. Không cần API key của nhà cung cấp AI để chạy module này.

## Mười tool hiện có

| Tool                                 | Tham số                                                                                                                                       | Kết quả                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `get_server_info`                    | `{}`                                                                                                                                          | Thông tin server và kiểm tra kết nối                         |
| `search_production_orders`           | Bộ lọc lệnh/ngày/giao nhận/PYCLM/nhóm phiếu/trạng thái, `include?`, `counts?`, `page?`, `limit?`                                              | Danh sách lệnh/lô và phân trang                              |
| `get_production_order`               | `id`                                                                                                                                          | Toàn bộ hồ sơ lô từ dữ liệu cục bộ mà tài khoản có quyền đọc |
| `search_items`                       | `query?`, `item_code?`, `code_prefix?`, `page?`, `limit?`                                                                                     | Tìm sản phẩm theo mã/tên/mã DK, có phân trang                |
| `get_item`                           | `item_code`                                                                                                                                   | Thông tin và cấu hình hiện tại của một sản phẩm              |
| `search_production_order_deviations` | `mode?`, `today?`, `date_from?`, `date_to?`, `item_code?`, `lot_no?`, `production_order_id?`, `approval_status?`, `query?`, `page?`, `limit?` | Đếm hoặc tìm sai lệch trên nhiều lô                          |
| `search_mixing_records`              | Bộ lọc mã hàng/lệnh/lô, ngày, loại phiếu, thông số, QA/IPC và phân trang                                                                      | Danh sách nhận diện phiếu pha chế/gia công                   |
| `get_mixing_records`                 | `ids`, `view?`                                                                                                                                | Nội dung nhiều phiếu đã chọn, tối đa 10 ID mỗi lần           |
| `analyze_production_parameters`      | `source`, `parameter`, bộ lọc lệnh/ngày/công đoạn/đơn vị, `group_by?`, `sort_by?`, `page?`, `limit?`                                          | Thống kê số học trên nhiều lô, phân biệt phép đo và lô       |
| `get_production_statistics`          | `metrics?`, bộ lọc lệnh/ngày, `group_by?`, `category?`, `page?`, `limit?`                                                                     | Tổng hợp số lô, hồ sơ, PYCLM, sản lượng và các nhóm đã chọn  |

Hai tool bổ sung cho phiếu cân:

| Tool | Tham số | Kết quả |
| --- | --- | --- |
| `search_weighing_records` | `production_order_id?`, `production_order_code?`, `item_code?`, `lot_no?`, `query?`, `material_code?`, `status?`, `has_weights?`, `created_by_id?`, `qa_status?`, `ipc_status?`, `date_from?`, `date_to?`, `page?`, `limit?` | Metadata phiếu cân, người tạo/duyệt và số dòng nguyên liệu; có phân trang |
| `get_weighing_records` | `ids` (1–10 ID khác nhau), `view?` (`full` hoặc `results`) | Nguyên liệu, lượng yêu cầu, từng lần cân kể cả âm, ghi chú, người/thời điểm cân, tất cả tham chiếu ảnh và duyệt QA/IPC |

Phiếu cân dùng quyền `production-orders.read`, scope OAuth `mcp:read` và phạm vi lệnh của vai trò giống các tool khác. Tool chỉ đọc dữ liệu cục bộ; không tải tệp ảnh, không tạo/sửa/xóa/ký phiếu. `item_code` lọc sản phẩm của lệnh, `material_code` lọc mã nguyên liệu trong phiếu. Bộ lọc `has_weights` xét có/chưa có bất kỳ lần cân nào trên phiếu; ngày lọc `created_at` theo Việt Nam, bao gồm toàn bộ ngày cuối.

`get_production_order` bổ sung `sections.weighing_records` với `total`, `ids`, `detail_tool=get_weighing_records`. Khi đọc phiếu, `material_totals` cộng yêu cầu theo mã nguyên liệu và đơn vị, thực tế cộng mọi lần cân của các dòng thuộc nhóm, tách từng đơn vị và tính cả số âm. `actual_quantities=[]` là chưa cân, khác với đã cân có tổng bằng 0. Không quy đổi đơn vị hoặc suy ra đạt yêu cầu. `view=results` chỉ giữ dòng có lần cân nhưng tổng yêu cầu vẫn tính từ toàn bộ phiếu. Kết quả giữ thứ tự `ids`; `missing_ids` gồm ID không tồn tại hoặc ngoài phạm vi.

`search_production_orders` hỗ trợ `presence.weighing_records`, `include: ["weighing_records"]`, `counts: ["weighing_records"]` và `weighing_status`, `weighing_qa_status`, `weighing_ipc_status`, `weighing_has_weights`. QA/IPC dùng `approved|pending`, kiểm tra trên cùng phiếu. `weighing_has_weights=false` nghĩa là không có phiếu phù hợp bộ lọc đã ghi lần cân; có thể kết hợp presence để yêu cầu lô đã tạo phiếu. Count đếm số phiếu, không đếm số lần cân; count/presence áp dụng `weighing_status` nếu truyền, cờ QA/IPC là metadata riêng. Có dữ liệu hay có người duyệt không phải kết luận đạt chất lượng.

Ví dụ tìm rồi đọc phiếu cân:

```json
{ "name": "search_weighing_records", "arguments": { "production_order_id": 7, "qa_status": "pending", "has_weights": true } }
```

```json
{ "name": "get_weighing_records", "arguments": { "ids": [1, 2], "view": "full" } }
```

Có mười hai tên tool được đăng ký. Phiếu cân và phiếu pha chế/gia công được tìm và đọc riêng;
`get_production_order` chỉ giữ số lượng/ID tham chiếu của nhóm này. Các nhóm sai
lệch, checklist, kiểm tra, tổng kết, đóng gói, lấy mẫu và tài liệu tiếp tục nằm
trong hồ sơ lô. Client đã kết nối trước đó cần làm mới danh sách tool.

### Thống kê nhiều lô và thông số sản xuất

Hai tool thống kê chỉ trả kết quả tổng hợp từ database, không tải hồ sơ/phiếu/ảnh
của từng lô. Dùng chúng cho câu hỏi thống kê thay vì tải hàng loạt dữ liệu chi tiết.
Các tham số chung:

- `item_code`, `production_order_id`, `production_order_code`, `lot_no`, `status`,
  `warehouse`: so khớp chính xác, kết hợp AND.
- Không truyền ngày: **30 ngày gần nhất, gồm hôm nay** theo `Asia/Ho_Chi_Minh`.
- `today=true` hoặc cặp `date_from`/`date_to` dạng `YYYY-MM-DD`, gồm cả ngày cuối;
  khoảng tùy chọn tối đa 366 ngày. `all_time=true` cho toàn bộ thời gian.
  Ba cách chọn ngày không kết hợp với nhau. `date_range` trả khoảng thực tế và múi giờ.
- `date_field=start_date` mặc định, thống nhất ngày báo cáo lô của frontend;
  có thể chọn `creation_date`. Ngày sản xuất dạng chuỗi không được dùng để lọc.
- Mặc định loại lô hủy theo các trạng thái tương ứng frontend; muốn tính cả lô hủy
  truyền `include_cancelled=true`. Lọc riêng trạng thái hủy cũng cần cờ này.
- `page=1`, `limit=20`, tối đa 100: phân trang **nhóm kết quả**, không cắt bớt
  các bản ghi đầu vào để tính trung bình/tổng. Trang vượt giới hạn vẫn giữ đúng
  `total_groups` và `total_pages`. Không tự thêm nhóm thời gian có số lượng 0.
- Cần `production-orders.list` và `production-orders.read`. Quyền riêng được
  kiểm tra trước truy vấn; thiếu quyền trả lỗi, không âm thầm bỏ dữ liệu.

`analyze_production_parameters` nhận `source` và `parameter`:

| Source                               | Parameter hỗ trợ                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `mixing_records`                     | Tên thông số chính xác đã lưu, ví dụ `pH`                                                                |
| `post_preparation_solution_checks`   | `ph` (ba lần đo `solution_ph_1/2/3`)                                                                     |
| `density_checks`                     | `density`, `apparent_density`                                                                            |
| `post_homogenization_granule_checks` | `bulk_density`, `tapped_density`, `carr_index`, `moisture_percent`                                       |
| `hardness_checks`                    | `hardness` (tối đa 10 lần đo trên mỗi phiếu)                                                             |
| `tablet_thickness_checks`            | `thickness` (tối đa 10 lần đo)                                                                           |
| `volume_checks`                      | `volume` (tối đa 6 lần đo)                                                                               |
| `environment_checks`                 | `temperature_c`, `humidity_percent`                                                                      |
| `friability_checks`                  | `friability_percent`                                                                                     |
| `steam_sterilization_checks`         | `setting_temperature`, `setting_time` (thông số cài đặt, không phải nhiệt độ/thời gian thực tế đạt được) |
| `filtration_checks`                  | `rinse_water_volume_liters`, `tank_residual_volume_liters`                                               |
| `spray_dose_checks`                  | `spray_dose_count` (tối đa 6 chai)                                                                       |
| `semi_finished_gross_weight_checks`  | `gross_weight` (tối đa 10 lần đo)                                                                        |
| `semi_finished_net_weight_checks`    | `net_weight` (tối đa 10 lần đo)                                                                          |

- `group_by=none|day|month|item_code|production_order`; mặc định `none`.
  Dù chọn `none`, kết quả vẫn tách mã hàng, đơn vị, công đoạn/phòng/vị trí,
  loại phiếu, phiên bản và bước; không gộp các phép đo khác ngữ nghĩa.
- `group_by=production_order` trả thêm ID, mã lệnh và số lô để gọi tool chi tiết.
  `sort_by=group|average_asc|average_desc|min_asc|max_desc` giúp xem xu hướng hoặc
  tìm nhóm/lô có giá trị cao/thấp. Chưa có số hợp lệ xếp sau nhóm có kết quả.
- `unit` lọc đơn vị chính xác, phân biệt hoa/thường; `unit=null` lọc chưa ghi
  đơn vị/không có đơn vị. Không tự quy đổi. `unit_basis` cho biết nguồn đơn vị;
  `dimensionless_or_not_recorded` không tự khẳng định một đơn vị vật lý.
- Nguồn kiểm tra có thể lọc `context` theo trường trả trong `context_field`.
  Phiếu pha chế dùng `record_type`, `template_version`, `stage_name`, `step_name`,
  `qa_status`, `ipc_status` (`approved`/`pending`, có/chưa có người duyệt).
- Có thể chọn thêm `date_field=recorded_at`: với pha chế là ngày nhập kết quả,
  thiếu thì ngày tạo phiếu; các nguồn còn lại dùng thời gian phiếu/kiểm tra của
  nguồn, được nêu trong `date_range.recorded_at_definition`.
- `summary` đếm trên toàn bộ tập đã lọc: số lô, phiếu, ô kết quả (`slot_count`),
  phép đo hợp lệ (`measurement_count`), số lô có số hợp lệ (`valid_order_count`),
  ô trống, sai định dạng và khác kiểu số. Lô không có phiếu/thông số phù hợp không
  được tính vào coverage này. Một lô thuộc nhiều nhóm vẫn chỉ tính một lần trong summary.
- Mỗi nhóm có min/max/trung bình/độ lệch chuẩn tổng thể. `aggregation=measurement_weighted`:
  mỗi phép đo hợp lệ có cùng trọng số, không phải mỗi lô có cùng trọng số.
  Không có phép đo hợp lệ thì các thống kê số học là null, không thay bằng 0.
- Phiếu pha chế chỉ tính `data_type=number|decimal`. Chấp nhận số âm, 0, dấu chấm
  hoặc dấu phẩy thập phân, tối đa 18 chữ số phần nguyên và 10 chữ số phần lẻ.
  Không diễn giải dấu phân cách hàng nghìn, số mũ, khoảng giá trị hay biểu thức
  như `<6`; trả các giá trị này vào số ô sai định dạng. Boolean/text không bị ép số.
- Tiệt trùng/lọc cần quyền đọc riêng theo nhóm trong registry. Không tự suy ra
  đạt, vượt giới hạn hay cho phép xuất xưởng từ các thống kê.

Ví dụ thống kê pH kiểm tra dung dịch của toàn bộ lô BTP0001:

```json
{
  "name": "analyze_production_parameters",
  "arguments": {
    "source": "post_preparation_solution_checks",
    "parameter": "ph",
    "item_code": "BTP0001",
    "all_time": true
  }
}
```

Nếu pH nằm trong phiếu pha chế, dùng `source=mixing_records`, `parameter=pH`.
Tên thông số, công đoạn, phiên bản và đơn vị pha chế được so khớp phân biệt hoa/thường.
Muốn so sánh từng lô thêm `group_by=production_order`; nhiều nhóm hơn limit phải đọc tiếp trang.

`get_production_statistics` chọn `metrics` (mặc định `["orders"]`, tối đa 4 nhóm
khác nhau mỗi lần), `group_by=none|day|month|item_code|status|warehouse` và
`category=all|finished|semi`. Mã bắt đầu `TP` là thành phẩm như frontend;
`semi` là các mã còn lại. `group_by=status` dùng các nhóm trạng thái chuẩn frontend.

| Metric                     | Nội dung                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `orders`                   | Số lô và số lượng theo planned/released/closed/cancelled/other                                                                    |
| `pyclm`                    | Số lô đã/chưa gửi, chưa có phiếu, tỷ lệ đã gửi dựa trên PYCLM **mới nhất** (`sent_at DESC, id DESC`)                              |
| `document_control`         | Số lô đã cấp/nhận hồ sơ giấy, nhận phiếu kiểm nghiệm và phiếu kho; bỏ quản lý hồ sơ đã xóa                                        |
| `deviations`               | Số sai lệch, số lô có sai lệch, đã/chưa có người duyệt; bỏ sai lệch đã xóa                                                        |
| `finished_output`          | Sản lượng tổng kết thành phẩm `package_count * boxes_per_package + loose_box_count`, tách đơn vị kế hoạch và đơn vị sản lượng hộp |
| `semi_finished_quantities` | Lượng input/load/packed/leftover/waste, tách công đoạn và đơn vị                                                                  |
| `packaging_pending`        | Lượng chờ xử lý/chờ hủy sau đóng gói cấp II, tách loại lượng và đơn vị; chưa phải lượng đã xử lý/đã hủy                           |
| `vial_defects`             | Số phiếu/lô soi lọ, số lỗi từng loại và tổng lỗi đã biết, số bản ghi có/chưa có lỗi hoặc dữ liệu không hợp lệ                     |

`matched_orders` là số lô khớp bộ lọc chung. `reports[metric].data` và `pagination`
riêng cho từng nhóm; các chiều đơn vị/công đoạn/loại lượng cũng tạo nhóm riêng.
Số lô của report chỉ có dữ liệu con có thể nhỏ hơn `matched_orders`; không cộng
số lô giữa các nhóm đơn vị/công đoạn để suy ra tổng lô duy nhất.

Ngày lọc và nhóm thời gian của mọi metric là ngày của **lệnh** theo `date_field`,
không phải ngày tạo phiếu sai lệch, ngày gửi PYCLM hay ngày tổng kết. Muốn đếm
sai lệch tạo hôm nay dùng `search_production_order_deviations mode=count today=true`.

Sản lượng có tổng kết sai số âm bị loại và báo `invalid_summary_count`; chưa có
tổng kết hợp lệ giữ `actual_quantity=null`. Tỷ lệ hoàn thành dùng tổng sản lượng/
tổng kế hoạch trên cùng các lô có sản lượng và kế hoạch dương theo đơn vị hộp;
trả thêm `comparable_*_quantity`, không lấy trung bình các tỷ lệ từng lô.
Các alias hộp/hop/box/boxes chuẩn hóa về `hộp` như frontend; đơn vị sản lượng khác
không được cộng hay so tỷ lệ với nhau. Lượng bán thành phẩm/chờ xử lý âm bị loại,
ô trống và không hợp lệ có số đếm riêng. Lỗi soi lọ là số lỗi/bản ghi, không tự
coi là tỷ lệ lỗi trên tổng sản lượng; bản ghi có số âm không được kết luận không lỗi.
Lượng bán thành phẩm/chờ xử lý chưa ghi đơn vị có `missing_unit_count` và không
được cộng vào tổng lượng. Kế hoạch chưa ghi đơn vị giữ tổng kế hoạch null.

Sai lệch cần thêm `production-order-deviations.read`; lượng chờ xử lý/hủy cần
`production-orders.post-secondary-packaging-summaries.read`. Các metric khác dùng
quyền đọc lệnh. Mỗi yêu cầu chỉ truy vấn các metric đã chọn: một count lô và một
truy vấn tổng hợp/phân trang cho mỗi metric. Phân tích thông số dùng hai truy vấn
tổng hợp, không gọi tool chi tiết hay chạy truy vấn riêng từng lô. Truy vấn có
tham số và chỉ dùng bảng/cột từ danh mục server. Index ngày/quan hệ hiện có được
dùng để khoanh vùng; all_time vẫn có chi phí đọc dữ liệu tương ứng tập cần thống kê.

Ví dụ tổng hợp số lô, PYCLM và giao nhận hồ sơ theo mã hàng trong tháng:

```json
{
  "name": "get_production_statistics",
  "arguments": {
    "metrics": ["orders", "pyclm", "document_control"],
    "date_from": "2026-10-01",
    "date_to": "2026-10-31",
    "group_by": "item_code",
    "page": 1,
    "limit": 20
  }
}
```

### Tìm và đọc phiếu pha chế/gia công

`search_mixing_records` trả metadata, mã/tên hàng, mã lệnh, số lô, loại/phiên bản
phiếu, ngày tạo và thông tin người tạo/duyệt QA/IPC; không tải cấu trúc hay kết quả.
Tool hỗ trợ:

- `item_code`, `production_order_code`, `production_order_id`, `lot_no`,
  `record_type`, `created_by_id`: lọc chính xác và kết hợp bằng AND.
- `query`: tìm trong mô tả, mã lệnh, mã hàng, tên hàng, số lô.
- `parameter_name`: tìm phiếu có thông số chứa tên này, ví dụ `pH`.
- `qa_status`, `ipc_status`: `approved`/`pending`, dựa trên có/chưa có người duyệt.
- `date_from`, `date_to`: ngày tạo phiếu dạng `YYYY-MM-DD`, bao gồm cả ngày cuối
  theo ngày Việt Nam; có thể truyền một đầu khoảng ngày.
- `page=1`, `limit=20` mặc định, tối đa 100; sắp theo ngày tạo giảm dần rồi ID.

Không truyền `record_type` sẽ lấy tất cả loại phiếu; chỉ phiếu pha chế dùng
`record_type=mixing`. Bộ lọc thông số chỉ tìm phiếu phù hợp, không thay đổi nội
dung phiếu khi đọc chi tiết.

```json
{
  "name": "search_mixing_records",
  "arguments": {
    "item_code": "BTP0001",
    "record_type": "mixing",
    "parameter_name": "pH",
    "page": 1,
    "limit": 20
  }
}
```

`get_mixing_records` nhận 1–10 ID khác nhau, trả theo đúng thứ tự yêu cầu, và
liệt kê ID không tồn tại trong `missing_ids`. Phiếu được đọc từ cấu trúc đã lưu,
không dựng lại từ mẫu hiện tại. Cả hai tool cần `production-orders.read`.

- `view=full` (mặc định): toàn bộ phiếu, giai đoạn, bước, thông số, yêu cầu,
  kết quả/ghi chú/ảnh, người/thời gian ghi nhận và duyệt QA/IPC, thông tin lệnh.
- `view=results`: metadata phiếu và mảng `parameters` chứa các thông số có kết quả,
  ảnh hoặc ghi chú, kèm tên giai đoạn/bước và thông tin ghi nhận. Giữ kết quả `0`
  và `false`; bỏ thông số trống. Dữ liệu kết quả chưa được tổng hợp thống kê.

```json
{
  "name": "get_mixing_records",
  "arguments": { "ids": [101, 102, 108], "view": "results" }
}
```

Nếu cần nhiều hơn 10 phiếu, gọi theo từng nhóm. Ảnh/tệp chỉ trả tham chiếu.

### Đếm và tra cứu sai lệch trên nhiều lô

`search_production_order_deviations` dùng trực tiếp bảng sai lệch, không tải hồ sơ
của từng lô để đếm. Không truyền ngày nghĩa là tìm trong toàn bộ thời gian;
"hiện có" là sai lệch chưa bị xóa, không phải sai lệch chưa xử lý xong.

- `mode=count`: chỉ đếm trong database, trả `total` và `date_range`, không tải
  bản ghi, ảnh hoặc quan hệ lệnh. Cần `production-order-deviations.list`.
- `mode=list` (mặc định): trả nội dung/nguyên nhân/xử lý, số lượng/đơn vị,
  người báo cáo/duyệt, tham chiếu ảnh và `production_order` gồm mã lệnh, mã/tên
  hàng, số lô. Cần cả `production-order-deviations.list` và
  `production-order-deviations.read`.
- `today=true`: ngày hiện tại theo `Asia/Ho_Chi_Minh`, dựa trên giờ máy chủ,
  độc lập múi giờ hệ điều hành. Không kết hợp với `date_from/date_to`.
- `date_from`, `date_to`: ngày `YYYY-MM-DD`, lọc theo `created_at` của phiếu
  sai lệch (không phải ngày sản xuất). Hai đầu ngày đều được bao gồm;
  truy vấn từ 00:00 ngày đầu đến trước 00:00 sau ngày cuối theo UTC+07:00.
  Có thể truyền một đầu để lọc khoảng mở. `date_range` trả ranh giới UTC thực tế.
- `item_code`, `lot_no`, `production_order_id`: so khớp chính xác, kết hợp bằng AND.
- `approval_status=approved|pending`: đã có/chưa có người phê duyệt;
  không suy ra trạng thái đã xử lý xong. `query` tìm trong nội dung, nguyên nhân,
  phương án và kết quả xử lý.
- Danh sách có `pagination`, mặc định `page=1`, `limit=20`, tối đa 100;
  sắp theo ngày tạo giảm dần rồi ID giảm dần. Count và list dùng cùng bộ lọc.

Bản ghi và ảnh đã xóa bị loại bỏ. Không có kết quả trả số lượng 0 và danh sách
rỗng ở chế độ list, không coi là lỗi. Decimal giữ dạng chuỗi, ảnh chỉ là tham chiếu.

Đếm sai lệch hôm nay:

```json
{
  "name": "search_production_order_deviations",
  "arguments": { "mode": "count", "today": true }
}
```

Đếm toàn bộ sai lệch của một mã hàng:

```json
{
  "name": "search_production_order_deviations",
  "arguments": { "mode": "count", "item_code": "TP001" }
}
```

Xem các phiếu chưa có người duyệt trong khoảng ngày:

```json
{
  "name": "search_production_order_deviations",
  "arguments": {
    "mode": "list",
    "date_from": "2026-10-01",
    "date_to": "2026-10-17",
    "approval_status": "pending",
    "page": 1,
    "limit": 20
  }
}
```

### Tra cứu sản phẩm

`search_items` tìm `query` trong mã, tên và mã DK. `item_code` so khớp chính xác;
`code_prefix` lọc tiền tố gồm chữ cái, tự chuẩn hóa chữ hoa (`TP`, `BTP`...).
`page` mặc định 1, `limit` mặc định 20 và tối đa 100. Dữ liệu sắp theo mã tăng dần;
count và danh sách dùng chung bộ lọc, bỏ qua sản phẩm đã xóa. Kết quả gồm mã, tên,
đơn vị, mã DK và số đăng ký còn hiệu lực, cùng `pagination`.

```json
{
  "name": "search_items",
  "arguments": {
    "query": "sản phẩm",
    "code_prefix": "TP",
    "page": 1,
    "limit": 20
  }
}
```

```json
{
  "name": "get_item",
  "arguments": { "item_code": "TP001" }
}
```

`get_item` trả `{ "data": { ... } }` với:

- Các trường sản phẩm, thời gian tạo/cập nhật và `registration` còn hiệu lực.
- `production_specification`: dòng sản phẩm, dạng bào chế, giới hạn kiểm soát/
  cho phép, toán tử, đơn vị, người và thời gian cập nhật; null nếu chưa có/đã xóa.
- `feature_config`: cấu hình actions/sections, enabled/required và thứ tự hiện tại.
- `equipment`: các thiết bị gắn với sản phẩm, thông số thiết bị và người gắn.
- `mixing_activity_templates`: toàn bộ phiên bản mẫu pha chế với status, cỡ mẻ,
  đơn vị và cấu trúc giai đoạn → bước → thông số/yêu cầu.
- `date_print_templates`: toàn bộ phiên bản mẫu in date với status, nội dung,
  vị trí, định dạng ngày và tham chiếu ảnh.

Thiết bị và hai nhóm mẫu có dạng `available`, `total`, `data`; chi tiết sản phẩm
không cắt bớt bản ghi. Mẫu pha chế cần `mixing-activity-templates.read`, mẫu in date
cần `date-print-templates.read`; thiếu quyền trả `available=false` và
`reason=permission_required`, không truy vấn nội dung của nhóm đó.

Kết quả ghi rõ `configuration_source=current_item`: đây là cấu hình sản phẩm
hiện tại, có thể khác phiên bản/cấu hình đã lưu theo lô. Không dùng cấu hình này
để tự thay thế snapshot hoặc kết quả của một lô cũ. Tool không truy vấn lịch sử
lô, tồn kho hay nguồn bên ngoài. Ngày dạng ISO 8601, Decimal giữ dạng chuỗi và
thông tin người dùng chỉ gồm ID, tên, username.

### Tìm lô

`query` tìm trong mã lệnh, mã/tên sản phẩm và số lô; các bộ lọc còn lại so khớp
chính xác. `page` mặc định 1; `limit` mặc định 20, tối đa 100. Danh sách sắp theo
ID giảm dần. Lấy `id` từ kết quả để gọi tool chi tiết.

```json
{
  "name": "search_production_orders",
  "arguments": { "lot_no": "LOT-001", "page": 1, "limit": 20 }
}
```

### Lọc lô theo hồ sơ, trạng thái và thời gian

`search_production_orders` giữ kết quả mặc định gọn, không tính checklist hay
đọc các bảng con nếu không được yêu cầu. Các lựa chọn bổ sung:

| Nhóm                  | Tham số                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Lệnh                  | `production_order_code`, `code_prefix`, `type`, `warehouse`, cùng các bộ lọc cũ                                                   |
| Ngày                  | `today`, `date_field`, `date_from`, `date_to`                                                                                     |
| Giao nhận             | `batch_record_issued`, `batch_record_received`, `test_certificate_received`, `warehouse_release_received`                         |
| Người giao nhận       | `batch_record_issued_by_id`, `batch_record_received_by_id`, `test_certificate_received_by_id`, `warehouse_release_received_by_id` |
| PYCLM mới nhất        | `pyclm_sent`, `pyclm_sender_id`, `pyclm_location`                                                                                 |
| Đăng ký               | `has_saved_registration`, `has_current_registration`, `registration_number` (số đã lưu theo lô)                                   |
| Hướng dẫn/in date     | `has_production_guide`, `has_date_checks`                                                                                         |
| Có/chưa có nhóm phiếu | `presence: { "date_checks": true, "steam_sterilization_checks": false, ... }`                                                     |
| In date               | `date_check_status`: `pending`, `approved`, `rejected`                                                                            |
| Hồ sơ đính kèm        | `attachment_status`, `attachment_requires_approval`, `attachment_type`                                                            |
| Pha chế/gia công      | `mixing_record_type`, `mixing_qa_status`, `mixing_ipc_status`, `mixing_has_results`                                               |
| Lấy mẫu/tổng kết      | `sampling_type`, `semi_finished_summary_stage`, `material_process_stage`                                                          |
| Xét duyệt/sai lệch    | `has_factory_release_approver`, `deviation_approval_status`                                                                       |
| Kết quả bổ sung       | `include` chọn trạng thái, `counts` chọn số bản ghi                                                                               |

Các điều kiện kết hợp bằng AND và được áp dụng trước phân trang, cùng bộ lọc
cho tổng số lô. Boolean true/false là có/chưa có; bỏ trống nghĩa là không lọc.
Trạng thái approval ở phiếu pha chế và sai lệch là `approved`/`pending`, dựa trên
có/chưa có người duyệt. Các bộ lọc QA và IPC áp dụng trên cùng một phiếu phù hợp.

`date_field` mặc định `creation_date`, hỗ trợ `start_date`, bốn trường mốc giao
nhận kết thúc bằng `_at` và `pyclm_sent_at` (thời gian của PYCLM mới nhất).
Không dùng ngày sản xuất/hạn dùng dạng chuỗi để lọc khoảng ngày. `today=true`
tính theo Việt Nam, không kết hợp `date_from/date_to`; ngày nhập dạng YYYY-MM-DD,
bao gồm cả ngày cuối. Cần lọc `pyclm_sent=true` nếu chỉ muốn các lần đã gửi.

`presence`, `include`, `counts` dùng danh mục nhóm từ `mcp-record-sections.ts`,
bổ sung `mixing_records`, `deviations`, `production_guide`; không có vật liệu/SAP.
`include` còn hỗ trợ `document_control`, `pyclm`, `registration`.
Cho phép tối đa 10 nhóm presence, 12 mục include và 6 mục counts mỗi lần.
Nhóm dùng để lọc tự được thêm vào kết quả trạng thái.

Các thuộc tính bổ sung nằm trong `search_info` của từng lô:

- `document_control`: bốn boolean giao nhận, các mốc `_at`, ID và tên người thực hiện.
- `pyclm`: trạng thái bản mới nhất, boolean `sent`, thời gian, người gửi, địa điểm,
  đường dẫn. Xét thứ tự `sent_at DESC, id DESC`, không lấy một lần gửi thành công cũ.
- `registration`: `saved_number` theo lô và `current_item_number` hiện tại của sản phẩm.
- Các nhóm phiếu: `has_data`, `latest_at`; in date/tài liệu có các cờ `has_pending`,
  `has_approved`, `has_rejected`. Một lô có thể đồng thời có nhiều trạng thái.
- Pha chế có cờ QA/IPC đã/chưa có người duyệt; `has_results` chỉ tính khi hỏi bằng
  `mixing_has_results`, không tính phiếu trống hoặc chỉ có ghi chú, vẫn tính `0`/`false`.
- Xét duyệt xuất xưởng có `has_approver`; sai lệch có `has_pending_approval`.
- `counts`: số phiếu của những nhóm được yêu cầu cho các lô trong trang. Chỉ đếm
  bản ghi nhóm, không tổng hợp kết quả chất lượng. Khi có bộ lọc loại phiếu pha chế,
  loại hồ sơ, loại mẫu hoặc công đoạn, cờ hiện diện và số đếm tương ứng theo loại đó;
  số đếm không thu hẹp theo các trạng thái duyệt.

Bản ghi quản lý hồ sơ, sai lệch và theo dõi thiết bị đã xóa không được tính.
Hồ sơ đính kèm phải có ít nhất một tệp. Hướng dẫn sản xuất kiểm tra bản ghi file,
không kiểm tra file vật lý. Cờ false cho "có người duyệt" hoặc "có kết quả" cũng
bao gồm lô chưa có phiếu, trừ khi kết hợp thêm điều kiện có phiếu.

Không đồng nhất "có phiếu", "đã nhập kết quả", "đã có người duyệt", "đạt" hoặc
"được phép xuất xưởng". Tìm lô chưa có một nhóm phiếu cũng không đồng nghĩa thiếu
hồ sơ bắt buộc; việc đó cần xem cấu hình/snapshot qua tool chi tiết lô.

Ví dụ: đã nhận hồ sơ giấy, chưa nhận phiếu kiểm nghiệm và đã có in date:

```json
{
  "name": "search_production_orders",
  "arguments": {
    "batch_record_received": true,
    "test_certificate_received": false,
    "presence": { "date_checks": true },
    "counts": ["date_checks"],
    "page": 1,
    "limit": 20
  }
}
```

Ví dụ: các lệnh tạo hôm nay và chưa gửi PYCLM mới nhất:

```json
{
  "name": "search_production_orders",
  "arguments": {
    "today": true,
    "date_field": "creation_date",
    "pyclm_sent": false
  }
}
```

Tất cả bộ lọc, include và counts của nhóm có quyền đọc riêng đều kiểm tra quyền
trước truy vấn, kể cả điều kiện false. Giao nhận/PYCLM/đăng ký/hướng dẫn/pha chế cần
thêm `production-orders.read` ngoài quyền tìm lệnh. Các nhóm còn lại theo quyền
trong registry. Không trả dữ liệu ngầm qua điều kiện lọc cho tài khoản thiếu quyền.

Truy vấn thường dùng Prisma; bộ lọc PYCLM mới nhất/kết quả pha chế dùng SQL có
tham số để lọc đúng trước COUNT/LIMIT. Phần trạng thái/đếm thêm chỉ đọc trên ID
của trang bằng một truy vấn, không tải nội dung phiếu, không gọi checklist từng lô.

Migration `20261018010000_add_mcp_order_search_indexes` bổ sung index cho ngày,
mã lệnh/số lô, PYCLM mới nhất và các quan hệ trạng thái thường dùng. Áp dụng bằng
`npx prisma migrate deploy` khi triển khai; thay đổi source không tự tạo index.

### Lấy toàn bộ hồ sơ một lô

```json
{
  "name": "get_production_order",
  "arguments": { "id": 123 }
}
```

Kết quả có dạng `{ "data": { ... } }`, gồm:

- Thông tin chung: mã lệnh/sản phẩm, tên, số lô, trạng thái/loại, số lượng kế
  hoạch, đơn vị, các ngày, nguồn gốc, kho, mô tả, quy cách đóng gói, ghi chú,
  ghi chú nội bộ và nội dung thay đổi.
- `registration_number`: số đăng ký lưu theo lô khi PYCLM mới nhất đã gửi;
  trước đó lấy số đăng ký của sản phẩm, cùng logic với frontend.
- `pyclm`: trạng thái PYCLM mới nhất, người/thời gian gửi, vị trí và link phiếu.
- `documentControl`: thời gian/người cấp và nhận hồ sơ lô, nhận phiếu xuất kho,
  nhận phiếu kiểm nghiệm. Bản quản lý hồ sơ đã xóa trả null.
- `productionGuide`: metadata file hướng dẫn và đường dẫn tải qua endpoint xác thực.
- `completeness`: các mục bắt buộc, đã có dữ liệu, còn thiếu hoặc chưa kiểm tra
  được. Nếu dịch vụ checklist gặp lỗi, phần này có `available=false` và dữ liệu
  lô vẫn được trả. Mục phụ thuộc nguồn ngoài phạm vi cục bộ là `unavailable`.
- `sections`: toàn bộ bản ghi chi tiết theo nhóm dưới đây.

| Nhóm                                                 | Nội dung                                                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mixing_records`                                     | Chỉ có `total`, `ids`, `detail_tool=get_mixing_records`; không có nội dung phiếu                                                                    |
| `deviations`                                         | Toàn bộ sai lệch, nguyên nhân, xử lý, số lượng/đơn vị, người báo cáo/phê duyệt và tham chiếu ảnh còn hiệu lực                                       |
| `*_checks`, `cylinder_calibration`                   | Kiểm tra môi trường, vệ sinh, dọn quang, cảm quan, khối lượng, thể tích, độ cứng/dày/rã/mài mòn/kín, soi lọ, in date, hiệu chuẩn, tiệt trùng và lọc |
| `*_summaries`, `finished_product_summary`            | Tổng kết các công đoạn, thành phẩm/bán thành phẩm, sản lượng, lượng dư và hao hụt                                                                   |
| `factory_release_reviews`                            | Toàn bộ bản xét duyệt xuất xưởng, các kết quả đã lưu và người duyệt                                                                                 |
| `primary_packaging_confirmations`, các nhóm đóng gói | Xác nhận, kiểm tra và tổng kết đóng gói, gồm các mục chờ xử lý/hủy                                                                                  |
| `sampling_requests`, `sampling_records`              | Toàn bộ lịch sử gửi PYCLM và lấy mẫu thực tế                                                                                                        |
| `disinfectant_preparations`                          | Các phiếu pha dung dịch sát khuẩn                                                                                                                   |
| `equipment_monitoring_records`                       | Theo dõi thiết bị, thông số/kết quả, người ghi nhận và tham chiếu ảnh còn hiệu lực                                                                  |
| `attachments`                                        | Hồ sơ đính kèm, người nhập, trạng thái/người phê duyệt và metadata/tham chiếu tệp                                                                   |

Các section trả nội dung có cấu trúc `{ "available": true, "total": N, "data": [...] }`;
riêng `mixing_records` trả `ids` và `detail_tool` thay cho `data`.
Nhóm không có dữ liệu trả `total=0`, `data=[]`. Phiếu đơn như hiệu chuẩn và
khối lượng 10 vỏ vẫn trả dạng mảng với tối đa một bản ghi.

Tool chi tiết lô **không phân trang và không cắt bớt bản ghi** của các nhóm được
trả nội dung như lấy mẫu/sai lệch. Riêng phiếu pha chế/gia công chỉ lấy ID và số
lượng trong `sections.mixing_records`, gọi `get_mixing_records` để đọc nội dung.
Các phiếu sắp theo thời gian và ID;
các bước/thông số giữ thứ tự cấu trúc đã lưu. Ngày dạng ISO 8601 và Decimal dạng
chuỗi để giữ độ chính xác. Trường `planned_quatity` giữ tên hiện tại của schema.
Không cộng gộp sản lượng giữa các công đoạn hoặc đơn vị khác nhau.

## Quyền đọc và phạm vi dữ liệu

Mọi tool cần OAuth scope `mcp:read`; tìm kiếm cần `production-orders.list`,
chi tiết cần `production-orders.read`. Các nhóm in date, tiệt trùng, lọc, tổng
kết sau đóng gói, thiết bị và sai lệch cần thêm quyền đọc tương ứng như REST API.
Nhóm thiếu quyền không được truy vấn nội dung và trả
`{ "available": false, "reason": "permission_required" }`, khác với nhóm rỗng.

Đối với sản phẩm, `search_items` cần `items.list`, `get_item` cần `items.read`.
Hai nhóm mẫu cần thêm quyền đọc tương ứng như mô tả ở trên. Sản phẩm không tồn
tại hoặc đã xóa trả lỗi tool; đăng ký/thông số đã xóa không được trả nội dung.

MCP chỉ đọc dữ liệu cục bộ; không có tool vật liệu hoặc kết nối SAP B1.
Ảnh/tệp trả metadata và tham chiếu, không tải nội dung. Thông tin người dùng chỉ
gồm tên/username và ID ở các nhóm có ID. Không trả mật khẩu hoặc hồ sơ tài khoản.
Có dữ liệu, kết quả đạt và đã duyệt xuất xưởng là các trạng thái khác nhau.

Lệnh không tồn tại hoặc lỗi truy vấn chính trả `isError=true`. Lỗi nội bộ được
ghi log ở backend và được thay bằng thông báo chung trong kết quả tool.

## Mở rộng và kiểm thử

Thêm bảng chi tiết bằng một mục trong `mcp-record-sections.ts`, gồm quan hệ,
quyền đọc, thứ tự và danh sách trường `select`. Không cần thêm tool mới.
Các nhóm có cấu trúc riêng như pha chế/sai lệch được xử lý trong `McpToolsService`.

```sh
npm test -- --runInBand mcp.controller.spec.ts mcp-deviation-search.spec.ts mcp-record-sections.spec.ts production-order-completeness.service.spec.ts
npx tsc -p tsconfig.build.json --noEmit --incremental false
```

Test HTTP chạy module Nest thật với dữ liệu giả lập, không kết nối DB hoặc
dịch vụ ngoài. Kiểm tra registry đối chiếu quan hệ/trường dữ liệu với Prisma.
