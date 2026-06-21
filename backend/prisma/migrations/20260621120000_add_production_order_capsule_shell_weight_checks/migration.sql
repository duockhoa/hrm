-- CreateTable
CREATE TABLE `production_order_capsule_shell_weight_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `shell_1_weight` DECIMAL(10, 2) NOT NULL,
    `shell_2_weight` DECIMAL(10, 2) NOT NULL,
    `shell_3_weight` DECIMAL(10, 2) NOT NULL,
    `shell_4_weight` DECIMAL(10, 2) NOT NULL,
    `shell_5_weight` DECIMAL(10, 2) NOT NULL,
    `shell_6_weight` DECIMAL(10, 2) NOT NULL,
    `shell_7_weight` DECIMAL(10, 2) NOT NULL,
    `shell_8_weight` DECIMAL(10, 2) NOT NULL,
    `shell_9_weight` DECIMAL(10, 2) NOT NULL,
    `shell_10_weight` DECIMAL(10, 2) NOT NULL,
    `unit` VARCHAR(10) NOT NULL DEFAULT 'mg',
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_capsule_shell_weight_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_capsule_shell_weight_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_capsule_shell_weight_checks` ADD CONSTRAINT `po_capsule_shell_weight_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_capsule_shell_weight_checks` ADD CONSTRAINT `po_capsule_shell_weight_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
