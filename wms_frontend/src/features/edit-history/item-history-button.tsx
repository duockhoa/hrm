"use client";

import EditHistoryButton from "./edit-history-button";
import type { EditHistoryFields } from "./types";

export const ITEM_HISTORY_FIELDS: EditHistoryFields = {
  item_code: { label: "Mã sản phẩm", type: "text" },
  item_name: { label: "Tên sản phẩm", type: "text" },
  unit: { label: "Đơn vị tính", type: "text" },
  dk_code: { label: "Mã DK", type: "text" },
  series: { label: "Nhóm sản phẩm", type: "number" },
  registration_id: { label: "Số đăng ký (ID)", type: "number" },
  registration_number: { label: "Số đăng ký", type: "text" },
  product_line_id: { label: "Dây chuyền (ID)", type: "number" },
  product_line_name: { label: "Dây chuyền", type: "text" },
  dosage_form_id: { label: "Dạng bào chế (ID)", type: "number" },
  dosage_form_name: { label: "Dạng bào chế", type: "text" },
  lower_control_limit: { label: "Giới hạn kiểm soát dưới", type: "number" },
  lower_control_limit_operator: {
    label: "Toán tử kiểm soát dưới",
    type: "text",
  },
  upper_control_limit: { label: "Giới hạn kiểm soát trên", type: "number" },
  upper_control_limit_operator: {
    label: "Toán tử kiểm soát trên",
    type: "text",
  },
  lower_allowed_limit: { label: "Giới hạn cho phép dưới", type: "number" },
  lower_allowed_limit_operator: {
    label: "Toán tử cho phép dưới",
    type: "text",
  },
  upper_allowed_limit: { label: "Giới hạn cho phép trên", type: "number" },
  upper_allowed_limit_operator: {
    label: "Toán tử cho phép trên",
    type: "text",
  },
  spray_dose_lower_control_limit: {
    label: "Số liều xịt: kiểm soát dưới",
    type: "number",
  },
  spray_dose_upper_control_limit: {
    label: "Số liều xịt: kiểm soát trên",
    type: "number",
  },
  spray_dose_lower_allowed_limit: {
    label: "Số liều xịt: cho phép dưới",
    type: "number",
  },
  spray_dose_upper_allowed_limit: {
    label: "Số liều xịt: cho phép trên",
    type: "number",
  },
  film_coated_tablet_weight_lower_control_limit: {
    label: "Khối lượng viên bao phim: kiểm soát dưới",
    type: "number",
  },
  film_coated_tablet_weight_upper_control_limit: {
    label: "Khối lượng viên bao phim: kiểm soát trên",
    type: "number",
  },
  film_coated_tablet_weight_lower_allowed_limit: {
    label: "Khối lượng viên bao phim: cho phép dưới",
    type: "number",
  },
  film_coated_tablet_weight_upper_allowed_limit: {
    label: "Khối lượng viên bao phim: cho phép trên",
    type: "number",
  },
  film_coated_tablet_weight_unit: {
    label: "Đơn vị khối lượng viên bao phim",
    type: "text",
  },
  hardness_lower_control_limit: {
    label: "Độ cứng: kiểm soát dưới",
    type: "number",
  },
  hardness_upper_control_limit: {
    label: "Độ cứng: kiểm soát trên",
    type: "number",
  },
  hardness_lower_allowed_limit: {
    label: "Độ cứng: cho phép dưới",
    type: "number",
  },
  hardness_upper_allowed_limit: {
    label: "Độ cứng: cho phép trên",
    type: "number",
  },
  hardness_unit: { label: "Đơn vị độ cứng", type: "text" },
  tablet_thickness_control_limit: {
    label: "Độ dày: kiểm soát",
    type: "number",
  },
  tablet_thickness_allowed_limit: { label: "Độ dày: cho phép", type: "number" },
  tablet_thickness_unit: { label: "Đơn vị độ dày", type: "text" },
  disintegration_time_control_limit: {
    label: "Thời gian rã: kiểm soát",
    type: "number",
  },
  disintegration_time_allowed_limit: {
    label: "Thời gian rã: cho phép",
    type: "number",
  },
  disintegration_time_unit: { label: "Đơn vị thời gian rã", type: "text" },
  deleted_at: { label: "Thời điểm xóa", type: "date" },
  feature_id: { label: "ID tính năng", type: "number" },
  feature_label: { label: "Tính năng", type: "text" },
  feature_key: { label: "Mã tính năng", type: "text" },
  enabled: { label: "Đã chọn tính năng", type: "boolean" },
  required: { label: "Bắt buộc", type: "boolean" },
  order: { label: "Thứ tự", type: "number" },
  feature_configuration: { label: "Cấu hình tính năng", type: "feature-list" },
};

export default function ItemHistoryButton({ itemCode }: { itemCode?: string }) {
  if (!itemCode) return null;
  return (
    <EditHistoryButton
      key={itemCode}
      historyUrl={`/items/${encodeURIComponent(itemCode)}/history`}
      title={`Danh sách nguyên liệu ${itemCode}`}
      fields={ITEM_HISTORY_FIELDS}
      entityLabels={{
        items: "Nguyên liệu",
        production_specifications: "Thông số sản xuất",
        item_features: "Tính năng sản phẩm",
        item_feature_config: "Sao chép cấu hình tính năng",
      }}
    />
  );
}
