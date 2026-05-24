-- CreateTable
CREATE TABLE `production_order_deviation_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deviation_id` INTEGER NOT NULL,
    `image_path` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    INDEX `production_order_deviation_images_deviation_id_fkey`(`deviation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_deviation_images` ADD CONSTRAINT `production_order_deviation_images_deviation_id_fkey` FOREIGN KEY (`deviation_id`) REFERENCES `production_order_deviations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single image paths into the new image table.
INSERT INTO `production_order_deviation_images` (`deviation_id`, `image_path`, `created_at`, `updated_at`)
SELECT `id`, `deviation_image`, `created_at`, `updated_at`
FROM `production_order_deviations`
WHERE `deviation_image` IS NOT NULL AND TRIM(`deviation_image`) <> '';

-- DropColumn
ALTER TABLE `production_order_deviations` DROP COLUMN `deviation_image`;
