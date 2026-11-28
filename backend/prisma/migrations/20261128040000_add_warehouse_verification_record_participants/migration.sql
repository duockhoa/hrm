CREATE TABLE `warehouse_verification_record_participants` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `verification_record_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `verification_record_participants_record_user_key` (`verification_record_id`, `user_id`),
  INDEX `verification_record_participants_user_idx` (`user_id`),
  CONSTRAINT `verification_record_participants_record_fkey`
    FOREIGN KEY (`verification_record_id`) REFERENCES `warehouse_verification_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `verification_record_participants_user_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
