ALTER TABLE `production_order_finished_product_summaries`
  ADD COLUMN `warehouse_confirmed_by_id` INTEGER NULL,
  ADD COLUMN `warehouse_confirmed_at` DATETIME(3) NULL,
  ADD CONSTRAINT `po_finished_summary_warehouse_confirmer_fkey`
    FOREIGN KEY (`warehouse_confirmed_by_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
VALUES ('production-orders.finished-product-summaries.warehouse-confirm', 'Nhân viên kho xác nhận tổng kết thành phẩm', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `description` = VALUES(`description`),
  `updated_at` = VALUES(`updated_at`);
