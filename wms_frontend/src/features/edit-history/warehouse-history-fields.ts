import type { EditHistoryFields } from "./types";

export const RECEIPT_HISTORY_FIELDS: EditHistoryFields = {
  item_code: { label: "Mã hàng" },
  quantity: { label: "Số lượng", type: "number" },
  unit: { label: "Đơn vị tính" },
  lot_number: { label: "Số lô" },
  manufacturer_lot_number: { label: "Số lô nhà sản xuất" },
  expiry_date: { label: "Hạn dùng", type: "date" },
  packaging_specification: { label: "Quy cách đóng gói" },
  supplier_code: { label: "Mã nhà cung cấp" },
  supplier_name: { label: "Nhà cung cấp" },
  manufacturer_code: { label: "Mã nhà sản xuất" },
  manufacturer_name: { label: "Nhà sản xuất" },
  note: { label: "Ghi chú" },
  received_at: { label: "Thời điểm nhập", type: "date" },
  entered_by_id: { label: "Người nhập (ID)", type: "number" },
  attachment_type: {
    label: "Loại ảnh",
    values: { dispatch_note: "Ảnh PXK", coa: "Ảnh COA", invoice: "Ảnh HĐ" },
  },
  original_name: { label: "Tên file ảnh" },
  mime_type: { label: "Định dạng ảnh" },
  file_size: { label: "Dung lượng (byte)", type: "number" },
  uploaded_by_id: { label: "Người tải ảnh (ID)", type: "number" },
  confirmed_by_id: { label: "Người xác nhận SAP (ID)", type: "number" },
  confirmed_at: { label: "Thời điểm xác nhận SAP", type: "date" },
};

export const CHECK_HISTORY_FIELDS: EditHistoryFields = {
  location: { label: "Vị trí" },
  requirement: { label: "Yêu cầu" },
  temperature: { label: "Nhiệt độ (°C)", type: "number" },
  humidity: { label: "Độ ẩm (%RH)", type: "number" },
  is_passed: { label: "Kết quả", values: { true: "Đạt", false: "Không đạt" } },
  checked_by_id: { label: "Người kiểm tra (ID)", type: "number" },
};

export const SUMMARY_HISTORY_FIELDS: EditHistoryFields = {
  production_order_id: { label: "Lệnh sản xuất (ID)", type: "number" },
  package_count: { label: "Số kiện", type: "number" },
  boxes_per_package: { label: "Số hộp trên kiện", type: "number" },
  loose_box_count: { label: "Số hộp lẻ", type: "number" },
  note: { label: "Ghi chú" },
  created_by_id: { label: "Người nhập (ID)", type: "number" },
  warehouse_confirmed_by_id: {
    label: "Nhân viên kho xác nhận (ID)",
    type: "number",
  },
  warehouse_confirmed_at: { label: "Thời điểm kho xác nhận", type: "date" },
};
