CREATE TABLE `production_order_weighing_record_line_checks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `production_order_weighing_record_line_id` INTEGER NOT NULL,
  `is_correct` BOOLEAN NOT NULL,
  `checked_by_id` INTEGER NOT NULL,
  `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `po_weighing_line_checks_line_key` (`production_order_weighing_record_line_id`),
  INDEX `po_weighing_line_checks_user_idx` (`checked_by_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `po_weighing_line_checks_line_fkey` FOREIGN KEY (`production_order_weighing_record_line_id`) REFERENCES `production_order_weighing_record_lines` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `po_weighing_line_checks_user_fkey` FOREIGN KEY (`checked_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
