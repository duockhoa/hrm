CREATE TABLE `production_order_sensory_check_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sensory_check_id` INTEGER NOT NULL,
    `image_path` TEXT NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_sensory_check_images_check_id_fkey`(`sensory_check_id`),
    INDEX `po_sensory_check_images_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_sensory_check_images`
    ADD CONSTRAINT `po_sensory_check_images_check_id_fkey`
    FOREIGN KEY (`sensory_check_id`) REFERENCES `production_order_sensory_checks`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_sensory_check_images`
    ADD CONSTRAINT `po_sensory_check_images_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every existing attachment before the application switches to the
-- one-to-many relation. Keep the legacy image_path column for rollback.
INSERT INTO `production_order_sensory_check_images`
    (`sensory_check_id`, `image_path`, `created_by_id`, `created_at`, `updated_at`)
SELECT `id`, `image_path`, `created_by_id`, `created_at`, `updated_at`
FROM `production_order_sensory_checks`
WHERE `image_path` IS NOT NULL AND TRIM(`image_path`) <> '';
