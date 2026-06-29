CREATE TABLE `production_order_friability_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `total_weight_before_check` DECIMAL(12, 3) NOT NULL,
    `total_weight_after_check` DECIMAL(12, 3) NOT NULL,
    `weight_unit` VARCHAR(20) NOT NULL DEFAULT 'mg',
    `friability_percent` DECIMAL(8, 4) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_friability_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_friability_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_friability_checks` ADD CONSTRAINT `po_friability_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_friability_checks` ADD CONSTRAINT `po_friability_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
