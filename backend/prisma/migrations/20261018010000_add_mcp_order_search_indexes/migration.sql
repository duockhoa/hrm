-- Indexed lookups for optional MCP order filters and latest PYCLM selection.
CREATE INDEX `po_search_creation_id_idx` ON `production_orders`(`creation_date`, `id`);
CREATE INDEX `po_search_start_id_idx` ON `production_orders`(`start_date`, `id`);
CREATE INDEX `po_search_code_idx` ON `production_orders`(`production_order_code`);
CREATE INDEX `po_search_lot_idx` ON `production_orders`(`lot_no`);
CREATE INDEX `po_sampling_latest_idx` ON `production_order_sampling_requests`(`production_order_id`, `sent_at`, `id`);
CREATE INDEX `po_date_checks_status_idx` ON `production_order_date_checks`(`production_order_id`, `approval_status`);
CREATE INDEX `po_deviations_active_idx` ON `production_order_deviations`(`production_order_id`, `deleted_at`);
CREATE INDEX `equipment_monitoring_active_idx` ON `equipment_monitoring_records`(`production_order_id`, `deleted_at`);
