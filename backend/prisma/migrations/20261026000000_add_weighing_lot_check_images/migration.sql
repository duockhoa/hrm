CREATE TABLE `production_order_weighing_record_line_check_images` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `production_order_weighing_record_line_check_id` INTEGER NOT NULL,
  `image_path` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `po_weighing_check_images_check_idx` (`production_order_weighing_record_line_check_id`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `po_weighing_check_images_check_fkey` FOREIGN KEY (`production_order_weighing_record_line_check_id`) REFERENCES `production_order_weighing_record_line_checks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
