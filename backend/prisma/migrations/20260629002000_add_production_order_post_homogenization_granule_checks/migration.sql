CREATE TABLE `production_order_post_homogenization_granule_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `bulk_density` DECIMAL(12, 6) NOT NULL,
    `tapped_density` DECIMAL(12, 6) NOT NULL,
    `density_unit` VARCHAR(20) NOT NULL DEFAULT 'g/ml',
    `image_path` TEXT NULL,
    `carr_index` DECIMAL(8, 4) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_post_homogenization_granule_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_post_homogenization_granule_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_post_homogenization_granule_checks` ADD CONSTRAINT `po_post_homogenization_granule_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_post_homogenization_granule_checks` ADD CONSTRAINT `po_post_homogenization_granule_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
