import type { FilterGroup } from "./receipt-filters";

export const checkFilterGroups: FilterGroup[] = [
  {
    label: "Nhiệt độ (°C)",
    keys: ["temperature_min", "temperature_max"],
    type: "number",
    min: "-999.99",
    max: "999.99",
    step: "0.01",
  },
  {
    label: "Độ ẩm (%)",
    keys: ["humidity_min", "humidity_max"],
    type: "number",
    min: "0",
    max: "100",
    step: "0.01",
  },
  { label: "Vị trí kho", keys: ["location"], type: "text" },
  { label: "Yêu cầu", keys: ["requirement"], type: "text" },
  { label: "Ngày kiểm tra", keys: ["from_date", "to_date"], type: "date" },
  {
    label: "Kết quả",
    keys: ["result"],
    type: "select",
    options: [
      ["pass", "Đạt"],
      ["fail", "Không đạt"],
      ["unrecorded", "Chưa ghi nhận"],
    ],
  },
  { label: "Người kiểm tra", keys: ["checked_by"], type: "text" },
];
export const itemFilterGroups: FilterGroup[] = [
  { label: "Mã hàng", keys: ["item_code"], type: "text" },
  { label: "Tên hàng", keys: ["item_name"], type: "text" },
  { label: "Mã DK", keys: ["dk_code"], type: "text" },
  { label: "Đơn vị tính", keys: ["unit"], type: "text" },
  {
    label: "Số đăng ký",
    keys: ["hasRegistration"],
    type: "select",
    options: [
      ["true", "Đã có"],
      ["false", "Chưa có"],
    ],
  },
];
export const summaryFilterGroups: FilterGroup[] = [
  { label: "Mã hàng", keys: ["item_code"], type: "text" },
  { label: "Tên hàng", keys: ["item_name"], type: "text" },
  { label: "Số lô", keys: ["lot_number"], type: "text" },
  { label: "Lệnh sản xuất", keys: ["order_code"], type: "text" },
  { label: "Ngày tạo", keys: ["from_date", "to_date"], type: "date" },
  { label: "Người tạo", keys: ["created_by"], type: "text" },
  {
    label: "Gửi PYCLM",
    keys: ["sampling_status"],
    type: "select",
    options: [
      ["sent", "Đã gửi"],
      ["not_sent", "Chưa gửi"],
    ],
  },
  {
    label: "Nhận thành phẩm",
    keys: ["warehouse_status"],
    type: "select",
    options: [
      ["confirmed", "Đã nhận"],
      ["not_confirmed", "Chưa nhận"],
    ],
  },
];
