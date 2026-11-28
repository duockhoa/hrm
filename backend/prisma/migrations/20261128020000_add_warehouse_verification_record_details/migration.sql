CREATE TABLE `warehouse_verification_record_details` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `verification_record_id` INTEGER NOT NULL,
  `verified_quantity` DECIMAL(12, 3) NOT NULL,
  `defect_description` TEXT NOT NULL,
  `defect_quantity` DECIMAL(12, 3) NOT NULL,
  `defect_type` ENUM('QUALITY', 'QUANTITY', 'DOCUMENTATION', 'DELIVERY', 'OTHER') NOT NULL,
  `proposed_action` TEXT NULL,
  `note` TEXT NULL,
  `created_by_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `verification_record_details_record_idx` (`verification_record_id`),
  INDEX `verification_record_details_creator_idx` (`created_by_id`),
  CONSTRAINT `verification_record_details_quantities_chk`
    CHECK (`verified_quantity` > 0 AND `defect_quantity` >= 0 AND `defect_quantity` <= `verified_quantity`),
  CONSTRAINT `verification_record_details_record_fkey`
    FOREIGN KEY (`verification_record_id`) REFERENCES `warehouse_verification_records` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `verification_record_details_creator_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
