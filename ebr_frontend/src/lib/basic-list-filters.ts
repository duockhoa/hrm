import type { FilterGroup } from "@/components/list-filter-button";
const code: FilterGroup = {
  label: "Mã hàng",
  keys: ["item_code"],
  type: "text",
  placeholder: "Nhập chính xác mã hàng",
};
const name: FilterGroup = {
  label: "Tên hàng",
  keys: ["item_name"],
  type: "text",
};
const lot: FilterGroup = { label: "Số lô", keys: ["lot_number"], type: "text" };
const dates: FilterGroup = {
  label: "Ngày tạo",
  keys: ["from_date", "to_date"],
  type: "date",
};
export const lotFilters: FilterGroup[] = [code, name, lot, dates];
export const catalogFilters: FilterGroup[] = [
  { ...code, placeholder: "Nhập mã hàng" },
  name,
  { label: "Đơn vị tính", keys: ["unit"], type: "text" },
];
export const summaryFilters: FilterGroup[] = [
  code,
  name,
  lot,
  dates,
  {
    label: "Gửi PYCLM",
    keys: ["sampling_status"],
    type: "select",
    options: [
      ["sent", "Đã gửi"],
      ["not_sent", "Chưa gửi"],
    ],
  },
];
export const deviationFilters: FilterGroup[] = [
  code,
  dates,
  {
    label: "Phân loại nguyên nhân",
    keys: ["cause_classification"],
    type: "text",
  },
];
export const dateCheckFilters: FilterGroup[] = [
  code,
  dates,
  {
    label: "Trạng thái duyệt",
    keys: ["approval_status"],
    type: "select",
    options: [
      ["pending", "Chờ duyệt"],
      ["approved", "Đã duyệt"],
      ["rejected", "Từ chối"],
    ],
  },
  {
    label: "Loại bao bì",
    keys: ["package_type"],
    type: "select",
    options: [
      ["goi", "Gói"],
      ["lo", "Lọ"],
      ["chai", "Chai"],
      ["hop", "Hộp"],
      ["thung", "Thùng"],
      ["ong_be", "Ống bẻ"],
      ["tui_nhom", "Túi nhôm"],
      ["tuyp", "Tuýp"],
    ],
  },
];
