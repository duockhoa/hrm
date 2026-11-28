CREATE TABLE `warehouse_verification_records` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `record_code` VARCHAR(100) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `warehouse_receipt_item_id` INTEGER NULL,
  `production_order_id` INTEGER NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_id` INTEGER NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `warehouse_verification_records_record_code_key` (`record_code`),
  INDEX `warehouse_verification_records_warehouse_receipt_item_id_idx` (`warehouse_receipt_item_id`),
  INDEX `warehouse_verification_records_production_order_id_idx` (`production_order_id`),
  INDEX `warehouse_verification_records_created_by_id_idx` (`created_by_id`),
  CONSTRAINT `warehouse_verification_records_receipt_or_order_chk`
    CHECK ((`warehouse_receipt_item_id` IS NULL) <> (`production_order_id` IS NULL)),
  CONSTRAINT `warehouse_verification_records_warehouse_receipt_item_id_fkey`
    FOREIGN KEY (`warehouse_receipt_item_id`) REFERENCES `warehouse_receipt_items` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `warehouse_verification_records_production_order_id_fkey`
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `warehouse_verification_records_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
