CREATE TABLE `production_order_volume_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `package_type` VARCHAR(50) NOT NULL,
    `unit_1_volume` DECIMAL(10, 2) NULL,
    `unit_2_volume` DECIMAL(10, 2) NULL,
    `unit_3_volume` DECIMAL(10, 2) NULL,
    `unit_4_volume` DECIMAL(10, 2) NULL,
    `unit_5_volume` DECIMAL(10, 2) NULL,
    `unit_6_volume` DECIMAL(10, 2) NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'ml',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_volume_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_volume_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_volume_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_volume_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
