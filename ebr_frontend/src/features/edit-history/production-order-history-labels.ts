import type { ProductionOrderHistoryResource } from "./production-order-history-config";

type HistoryEntities = {
  entity: string;
  label: string;
  children?: readonly string[];
};

export const PRODUCTION_ORDER_HISTORY_ENTITIES: Record<
  ProductionOrderHistoryResource,
  HistoryEntities
> = {
  "production-order": {
    entity: "production_orders",
    label: "Lệnh sản xuất",
  },
  "weighing-record": {
    entity: "production_order_weighing_records",
    label: "Phiếu cân",
    children: [
      "production_order_weighing_record_lines",
      "production_order_weighing_record_line_checks",
      "production_order_weighing_record_line_check_images",
      "production_order_weighing_record_details",
      "production_order_weighing_record_detail_images",
    ],
  },
  "production-order-deviation": {
    entity: "production_order_deviations",
    label: "Sai lệch",
    children: ["production_order_deviation_images"],
  },
  "finished-product-summary": {
    entity: "production_order_finished_product_summaries",
    label: "Tổng kết thành phẩm",
  },
  "environment-check": {
    entity: "production_order_environment_checks",
    label: "Kiểm tra nhiệt độ, độ ẩm",
  },
  "hygiene-check": {
    entity: "production_order_hygiene_checks",
    label: "Kiểm tra vệ sinh",
  },
  "line-clearance-check": {
    entity: "production_order_line_clearance_checks",
    label: "Dọn quang dây chuyền",
  },
  "secondary-packaging-check": {
    entity: "production_order_secondary_packaging_checks",
    label: "Kiểm tra bao bì cấp 2",
  },
  "pre-secondary-packaging-check": {
    entity: "production_order_pre_secondary_packaging_checks",
    label: "Kiểm tra trước đóng gói bao bì cấp 2",
    children: ["production_order_pre_secondary_packaging_check_images"],
  },
  "semi-finished-product-summary": {
    entity: "production_order_semi_finished_product_summaries",
    label: "Tổng kết bán thành phẩm",
  },
  "post-secondary-packaging-summary": {
    entity: "production_order_post_secondary_packaging_summaries",
    label: "Tổng kết sau đóng gói bao bì cấp 2",
    children: [
      "production_order_post_secondary_pending_process_items",
      "production_order_post_secondary_pending_cancellation_items",
    ],
  },
  "material-summary": {
    entity: "production_order_material_summaries",
    label: "Tổng kết vật liệu",
  },
  "material-process-summary": {
    entity: "production_order_material_process_summaries",
    label: "Tổng kết công đoạn",
  },
  "factory-release-review": {
    entity: "production_order_factory_release_reviews",
    label: "Xét duyệt xuất xưởng",
  },
  "primary-packaging-confirmation": {
    entity: "production_order_primary_packaging_confirmations",
    label: "Xác nhận trước đóng gói bao bì cấp 1",
  },
  "density-check": {
    entity: "production_order_density_checks",
    label: "Kiểm tra tỉ trọng",
  },
  "sampling-record": {
    entity: "production_order_sampling_records",
    label: "Lấy mẫu",
  },
  "disinfectant-preparation": {
    entity: "production_order_disinfectant_preparations",
    label: "Pha chế chất sát khuẩn",
  },
  "friability-check": {
    entity: "production_order_friability_checks",
    label: "Kiểm tra độ mài mòn",
  },
  "spray-dose-check": {
    entity: "production_order_spray_dose_checks",
    label: "Kiểm tra liều xịt",
  },
  "post-homogenization-granule-check": {
    entity: "production_order_post_homogenization_granule_checks",
    label: "Kiểm tra cốm sau đồng nhất",
  },
  "post-preparation-solution-check": {
    entity: "production_order_post_preparation_solution_checks",
    label: "Kiểm tra dịch sau pha chế",
  },
  "disintegration-check": {
    entity: "production_order_disintegration_checks",
    label: "Kiểm tra độ rã",
  },
  "hard-capsule-leakage-check": {
    entity: "production_order_hard_capsule_leakage_checks",
    label: "Kiểm tra độ kín viên nang cứng",
  },
  "volume-check": {
    entity: "production_order_volume_checks",
    label: "Kiểm tra thể tích",
    children: ["production_order_volume_check_images"],
  },
  "shell-weight-check": {
    entity: "production_order_shell_weight_checks",
    label: "Kiểm tra khối lượng vỏ",
  },
  "ten-shell-weight-check": {
    entity: "production_order_ten_shell_weight_checks",
    label: "Kiểm tra khối lượng 10 vỏ",
  },
  "semi-finished-gross-weight-check": {
    entity: "production_order_semi_finished_product_gross_weight_checks",
    label: "Kiểm tra khối lượng cả vỏ",
  },
  "semi-finished-net-weight-check": {
    entity: "production_order_semi_finished_product_net_weight_checks",
    label: "Kiểm tra khối lượng tịnh",
  },
  "leak-tightness-check": {
    entity: "production_order_leak_tightness_checks",
    label: "Kiểm tra độ kín",
  },
  "hardness-check": {
    entity: "production_order_hardness_checks",
    label: "Kiểm tra độ cứng",
  },
  "tablet-thickness-check": {
    entity: "production_order_tablet_thickness_checks",
    label: "Kiểm tra độ dày viên",
  },
  "vial-inspection-check": {
    entity: "production_order_vial_inspection_checks",
    label: "Soi lọ",
  },
  "sensory-check": {
    entity: "production_order_sensory_checks",
    label: "Thử mùi vị",
    children: ["production_order_sensory_check_images"],
  },
  "product-sensory-check": {
    entity: "production_order_ten_unit_sensory_checks",
    label: "Kiểm tra cảm quan sản phẩm",
    children: ["production_order_ten_unit_sensory_check_images"],
  },
  "steam-sterilization-check": {
    entity: "production_order_steam_sterilization_checks",
    label: "Theo dõi quá trình tiệt trùng",
  },
  "filtration-check": {
    entity: "production_order_filtration_checks",
    label: "Theo dõi quá trình lọc",
  },
  "date-check": {
    entity: "production_order_date_checks",
    label: "Theo dõi In Date",
    children: ["production_order_date_check_images"],
  },
  "cylinder-calibration": {
    entity: "production_order_cylinder_calibrations",
    label: "Hiệu chuẩn ống đo",
  },
  "production-order-attachment": {
    entity: "production_order_attachments",
    label: "Tệp đính kèm lệnh sản xuất",
    children: ["production_order_attachment_files"],
  },
  "equipment-monitoring-record": {
    entity: "equipment_monitoring_records",
    label: "Thông số thiết bị",
    children: [
      "equipment_monitoring_record_images",
      "equipment_monitoring_values",
    ],
  },
  "mixing-record": {
    entity: "production_order_mixing_records",
    label: "Phiếu pha chế",
    children: [
      "production_order_mixing_record_stages",
      "production_order_mixing_record_steps",
      "production_order_mixing_record_parameters",
    ],
  },
};

export const PRODUCTION_ORDER_HISTORY_ENTITY_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.values(PRODUCTION_ORDER_HISTORY_ENTITIES).map(
      ({ entity, label }) => [entity, label],
    ),
  ),
  equipment_monitoring_record_images: "Ảnh thông số thiết bị",
  equipment_monitoring_values: "Thông số thiết bị",
  production_order_weighing_record_lines: "Nguyên liệu cân",
  production_order_weighing_record_details: "Lần cân",
  production_order_weighing_record_detail_images: "Ảnh lần cân",
  production_order_weighing_record_line_checks: "Kiểm tra nguyên liệu cân",
  production_order_weighing_record_line_check_images:
    "Ảnh kiểm tra nguyên liệu",
  production_order_mixing_record_stages: "Công đoạn pha chế",
  production_order_mixing_record_steps: "Bước pha chế",
  production_order_mixing_record_parameters: "Thông số pha chế",
  production_order_attachment_files: "Tệp đính kèm",
  production_order_deviation_images: "Ảnh sai lệch",
  production_order_pre_secondary_packaging_check_images: "Ảnh kiểm tra BTP",
  production_order_volume_check_images: "Ảnh kiểm tra thể tích",
  production_order_post_secondary_pending_process_items: "Hạng mục chờ xử lý",
  production_order_post_secondary_pending_cancellation_items:
    "Hạng mục chờ hủy",
  production_order_ten_unit_sensory_check_images: "Ảnh cảm quan sản phẩm",
  production_order_sensory_check_images: "Ảnh thử mùi vị",
  production_order_date_check_images: "Ảnh kiểm tra In Date",
};
