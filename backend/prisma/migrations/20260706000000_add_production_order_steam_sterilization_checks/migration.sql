-- CreateTable
CREATE TABLE `production_order_steam_sterilization_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `equipment_name` VARCHAR(255) NULL,
    `setting_temperature` DECIMAL(8, 2) NULL,
    `setting_time` INTEGER NULL,
    `configuration_image_path` TEXT NULL,
    `indicator_image_path` TEXT NULL,
    `reached_temperature_image_path` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `checked_by_id` INTEGER NULL,
    `checked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_steam_sterilization_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_steam_sterilization_checks_created_by_id_fkey`(`created_by_id`),
    INDEX `po_steam_sterilization_checks_checked_by_id_fkey`(`checked_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_steam_sterilization_checks` ADD CONSTRAINT `po_steam_sterilization_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_steam_sterilization_checks` ADD CONSTRAINT `po_steam_sterilization_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_steam_sterilization_checks` ADD CONSTRAINT `po_steam_sterilization_checks_checked_by_id_fkey` FOREIGN KEY (`checked_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
