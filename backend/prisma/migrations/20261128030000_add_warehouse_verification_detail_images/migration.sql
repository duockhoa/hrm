CREATE TABLE `warehouse_verification_detail_images` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `verification_record_detail_id` INTEGER NOT NULL,
  `storage_key` VARCHAR(512) NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `uploaded_by_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `verification_detail_images_detail_idx` (`verification_record_detail_id`),
  INDEX `verification_detail_images_uploader_idx` (`uploaded_by_id`),
  CONSTRAINT `verification_detail_images_detail_fkey`
    FOREIGN KEY (`verification_record_detail_id`) REFERENCES `warehouse_verification_record_details` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `verification_detail_images_uploader_fkey`
    FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
