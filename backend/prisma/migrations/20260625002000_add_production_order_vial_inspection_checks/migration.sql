-- CreateTable
CREATE TABLE `production_order_vial_inspection_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `bag_number` INTEGER NOT NULL,
    `fiber_vial_count` INTEGER NOT NULL,
    `particulate_count` INTEGER NOT NULL,
    `damaged_count` INTEGER NOT NULL,
    `other_defect_count` INTEGER NOT NULL,
    `note` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_vial_inspection_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_vial_inspection_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_vial_inspection_checks` ADD CONSTRAINT `po_vial_inspection_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_vial_inspection_checks` ADD CONSTRAINT `po_vial_inspection_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
