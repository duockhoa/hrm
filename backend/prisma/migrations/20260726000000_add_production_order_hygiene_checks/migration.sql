CREATE TABLE `production_order_hygiene_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `room_or_equipment` VARCHAR(255) NOT NULL,
    `cleaning_type` VARCHAR(100) NOT NULL,
    `result` VARCHAR(100) NOT NULL,
    `note` TEXT NULL,
    `cleaner_name` VARCHAR(255) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_hygiene_checks_po_id_fkey`(`production_order_id`),
    INDEX `po_hygiene_checks_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_hygiene_checks` ADD CONSTRAINT `po_hygiene_checks_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_hygiene_checks` ADD CONSTRAINT `po_hygiene_checks_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
