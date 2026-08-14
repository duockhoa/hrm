CREATE TABLE `equipment_monitoring_record_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `record_id` INTEGER NOT NULL,
    `image_path` TEXT NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `equipment_monitoring_record_images_record_id_idx`(`record_id`),
    INDEX `equipment_monitoring_record_images_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `equipment_monitoring_record_images`
    ADD CONSTRAINT `equipment_monitoring_record_images_record_id_fkey`
    FOREIGN KEY (`record_id`) REFERENCES `equipment_monitoring_records`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `equipment_monitoring_record_images`
    ADD CONSTRAINT `equipment_monitoring_record_images_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
