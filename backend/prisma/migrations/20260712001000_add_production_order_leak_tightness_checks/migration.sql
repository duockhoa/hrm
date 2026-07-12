CREATE TABLE `production_order_leak_tightness_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `requirement` TEXT NULL,
    `unit_1_result` BOOLEAN NOT NULL,
    `unit_2_result` BOOLEAN NULL,
    `unit_3_result` BOOLEAN NULL,
    `unit_4_result` BOOLEAN NULL,
    `unit_5_result` BOOLEAN NULL,
    `unit_6_result` BOOLEAN NULL,
    `unit_7_result` BOOLEAN NULL,
    `unit_8_result` BOOLEAN NULL,
    `unit_9_result` BOOLEAN NULL,
    `unit_10_result` BOOLEAN NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_leak_tightness_po_idx`(`production_order_id`),
    INDEX `po_leak_tightness_user_idx`(`created_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `po_leak_tightness_po_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `po_leak_tightness_user_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
