CREATE TABLE `production_order_weighing_record_details` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `production_order_weighing_record_line_id` INTEGER NOT NULL,
  `net_weight` DECIMAL(18,6) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `image_path` TEXT NULL,
  `weighed_by_id` INTEGER NOT NULL,
  `weighed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `po_weighing_details_line_idx` (`production_order_weighing_record_line_id`, `id`),
  INDEX `po_weighing_details_weigher_idx` (`weighed_by_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `po_weighing_details_line_fkey` FOREIGN KEY (`production_order_weighing_record_line_id`) REFERENCES `production_order_weighing_record_lines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `po_weighing_details_weigher_fkey` FOREIGN KEY (`weighed_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
