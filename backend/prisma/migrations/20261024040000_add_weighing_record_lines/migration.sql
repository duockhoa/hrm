CREATE TABLE `production_order_weighing_record_lines` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `production_order_weighing_record_id` INTEGER NOT NULL,
  `source_line_number` INTEGER NULL,
  `source_stage_id` INTEGER NULL,
  `stage_name` VARCHAR(255) NULL,
  `item_code` VARCHAR(255) NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `lot_no` VARCHAR(255) NULL,
  `planned_quantity` DECIMAL(18,6) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `note` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `po_weighing_lines_record_idx` (`production_order_weighing_record_id`, `id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `po_weighing_lines_record_fkey`
    FOREIGN KEY (`production_order_weighing_record_id`) REFERENCES `production_order_weighing_records` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
