CREATE TABLE `item_equipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(191) NOT NULL,
    `equipment_id` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `item_equipment_item_equipment_key`(`item_code`, `equipment_id`),
    INDEX `item_equipment_item_code_idx`(`item_code`),
    INDEX `item_equipment_equipment_id_idx`(`equipment_id`),
    INDEX `item_equipment_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `item_equipment`
    ADD CONSTRAINT `item_equipment_item_code_fkey`
    FOREIGN KEY (`item_code`) REFERENCES `items`(`item_code`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `item_equipment`
    ADD CONSTRAINT `item_equipment_equipment_id_fkey`
    FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `item_equipment`
    ADD CONSTRAINT `item_equipment_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
