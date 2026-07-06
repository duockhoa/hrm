CREATE TABLE `production_order_disinfectant_preparations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `workshop_id` INTEGER NOT NULL,
    `disinfectant_name` VARCHAR(255) NOT NULL,
    `purpose` TEXT NOT NULL,
    `base_material_name` VARCHAR(255) NOT NULL,
    `base_material_content` DECIMAL(10, 4) NOT NULL,
    `base_material_amount_l` DECIMAL(12, 4) NOT NULL,
    `prepared_volume_l` DECIMAL(12, 4) NOT NULL,
    `actual_concentration` DECIMAL(10, 4) NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_disinfectant_preps_po_id_fkey`(`production_order_id`),
    INDEX `po_disinfectant_preps_workshop_id_fkey`(`workshop_id`),
    INDEX `po_disinfectant_preps_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_disinfectant_preparations` ADD CONSTRAINT `po_disinfectant_preps_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_disinfectant_preparations` ADD CONSTRAINT `po_disinfectant_preps_workshop_id_fkey` FOREIGN KEY (`workshop_id`) REFERENCES `production_workshops`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `production_order_disinfectant_preparations` ADD CONSTRAINT `po_disinfectant_preps_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
