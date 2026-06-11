-- CreateTable
CREATE TABLE `production_order_environment_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `room` VARCHAR(191) NOT NULL,
    `temperature_c` DECIMAL(5, 2) NOT NULL,
    `humidity_percent` DECIMAL(5, 2) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `checked_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `production_order_environment_checks_production_order_id_fkey`(`production_order_id`),
    INDEX `production_order_environment_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_environment_checks` ADD CONSTRAINT `production_order_environment_checks_production_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_environment_checks` ADD CONSTRAINT `production_order_environment_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
