-- CreateTable
CREATE TABLE `production_order_bottle_volume_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `bottle_1_volume` DECIMAL(10, 2) NOT NULL,
    `bottle_2_volume` DECIMAL(10, 2) NOT NULL,
    `bottle_3_volume` DECIMAL(10, 2) NOT NULL,
    `bottle_4_volume` DECIMAL(10, 2) NOT NULL,
    `bottle_5_volume` DECIMAL(10, 2) NOT NULL,
    `bottle_6_volume` DECIMAL(10, 2) NOT NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'ml',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_bottle_volume_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_bottle_volume_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_bottle_volume_checks` ADD CONSTRAINT `po_bottle_volume_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_bottle_volume_checks` ADD CONSTRAINT `po_bottle_volume_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
