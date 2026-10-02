CREATE TABLE `warehouse_temperature_humidity_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `location` VARCHAR(255) NOT NULL,
    `requirement` TEXT NOT NULL,
    `temperature` DECIMAL(5, 2) NOT NULL,
    `humidity` DECIMAL(5, 2) NOT NULL,
    `checked_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `warehouse_temperature_humidity_checks_checked_by_id_idx` (`checked_by_id`),
    INDEX `warehouse_temperature_humidity_checks_location_created_at_idx` (`location`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `warehouse_temperature_humidity_checks`
ADD CONSTRAINT `warehouse_temperature_humidity_checks_checked_by_id_fkey`
FOREIGN KEY (`checked_by_id`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
