-- CreateTable
CREATE TABLE `production_order_disintegration_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `dosage_form_stage` VARCHAR(191) NOT NULL,
    `unit_1_passed` BOOLEAN NOT NULL,
    `unit_2_passed` BOOLEAN NOT NULL,
    `unit_3_passed` BOOLEAN NOT NULL,
    `unit_4_passed` BOOLEAN NOT NULL,
    `unit_5_passed` BOOLEAN NOT NULL,
    `unit_6_passed` BOOLEAN NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `checked_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_disintegration_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_disintegration_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_disintegration_checks` ADD CONSTRAINT `po_disintegration_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_disintegration_checks` ADD CONSTRAINT `po_disintegration_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
