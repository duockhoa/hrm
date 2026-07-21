CREATE TABLE `production_order_hardness_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `requirement` TEXT NULL,
    `dosage_form_stage` VARCHAR(50) NULL,
    `unit_1_hardness` DECIMAL(10, 3) NOT NULL,
    `unit_2_hardness` DECIMAL(10, 3) NULL,
    `unit_3_hardness` DECIMAL(10, 3) NULL,
    `unit_4_hardness` DECIMAL(10, 3) NULL,
    `unit_5_hardness` DECIMAL(10, 3) NULL,
    `unit_6_hardness` DECIMAL(10, 3) NULL,
    `unit_7_hardness` DECIMAL(10, 3) NULL,
    `unit_8_hardness` DECIMAL(10, 3) NULL,
    `unit_9_hardness` DECIMAL(10, 3) NULL,
    `unit_10_hardness` DECIMAL(10, 3) NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'N',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_hardness_checks_po_idx`(`production_order_id`),
    INDEX `po_hardness_checks_user_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_hardness_checks`
    ADD CONSTRAINT `po_hardness_checks_po_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `po_hardness_checks_user_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
