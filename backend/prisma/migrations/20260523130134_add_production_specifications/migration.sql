-- CreateTable
CREATE TABLE `production_specifications` (
    `item_code` VARCHAR(191) NOT NULL,
    `product_line` VARCHAR(191) NOT NULL,
    `dosage_form` VARCHAR(191) NOT NULL,
    `lower_control_limit` DECIMAL(18, 6) NOT NULL,
    `upper_control_limit` DECIMAL(18, 6) NOT NULL,
    `lower_allowed_limit` DECIMAL(18, 6) NOT NULL,
    `upper_allowed_limit` DECIMAL(18, 6) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`item_code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_specifications` ADD CONSTRAINT `production_specifications_item_code_fkey` FOREIGN KEY (`item_code`) REFERENCES `items`(`item_code`) ON DELETE RESTRICT ON UPDATE CASCADE;
