-- CreateTable
CREATE TABLE `product_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_lines_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill existing production specification text values into product line rows.
INSERT IGNORE INTO `product_lines` (`code`, `name`)
SELECT DISTINCT TRIM(`product_line`), TRIM(`product_line`)
FROM `production_specifications`
WHERE `product_line` IS NOT NULL AND TRIM(`product_line`) <> '';

-- AlterTable
ALTER TABLE `production_specifications` ADD COLUMN `product_line_id` INTEGER NULL;

-- Backfill foreign keys from the legacy text column.
UPDATE `production_specifications` AS `ps`
INNER JOIN `product_lines` AS `pl`
    ON `pl`.`name` = TRIM(`ps`.`product_line`)
SET `ps`.`product_line_id` = `pl`.`id`
WHERE `ps`.`product_line` IS NOT NULL AND TRIM(`ps`.`product_line`) <> '';

-- AlterTable
ALTER TABLE `production_specifications` DROP COLUMN `product_line`;

-- CreateIndex
CREATE INDEX `production_specifications_product_line_id_fkey` ON `production_specifications`(`product_line_id`);

-- AddForeignKey
ALTER TABLE `production_specifications` ADD CONSTRAINT `production_specifications_product_line_id_fkey` FOREIGN KEY (`product_line_id`) REFERENCES `product_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
