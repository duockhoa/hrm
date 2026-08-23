CREATE TABLE `item_preparation_slips` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `batch_size` DECIMAL(18, 3) NOT NULL,
    `unit_of_measure` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `item_preparation_slips_item_code_idx`(`item_code`),
    INDEX `item_preparation_slips_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `item_preparation_slips`
    ADD CONSTRAINT `item_preparation_slips_item_code_fkey`
    FOREIGN KEY (`item_code`) REFERENCES `items`(`item_code`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `item_preparation_slips`
    ADD CONSTRAINT `item_preparation_slips_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
