-- CreateTable
CREATE TABLE `manufacturers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `manufacturer_code` VARCHAR(100) NOT NULL,
    `manufacturer_name` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `manufacturers_manufacturer_code_key`(`manufacturer_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
