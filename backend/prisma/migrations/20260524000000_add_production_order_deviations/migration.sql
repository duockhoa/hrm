-- CreateTable
CREATE TABLE `production_order_deviations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `deviation_content` TEXT NOT NULL,
    `deviation_image` TEXT NULL,
    `handling_plan` TEXT NOT NULL,
    `approver_id` INTEGER NULL,
    `reporter_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `production_order_deviations_production_order_id_fkey`(`production_order_id`),
    INDEX `production_order_deviations_approver_id_fkey`(`approver_id`),
    INDEX `production_order_deviations_reporter_id_fkey`(`reporter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_deviations` ADD CONSTRAINT `production_order_deviations_production_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_deviations` ADD CONSTRAINT `production_order_deviations_approver_id_fkey` FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_deviations` ADD CONSTRAINT `production_order_deviations_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
