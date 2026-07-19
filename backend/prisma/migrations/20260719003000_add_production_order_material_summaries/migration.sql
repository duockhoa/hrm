CREATE TABLE `production_order_material_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `material_code` VARCHAR(191) NOT NULL,
    `material_name` TEXT NOT NULL,
    `lot_no` VARCHAR(100) NULL,
    `unit` VARCHAR(50) NULL,
    `received_quantity` DECIMAL(12, 3) NULL,
    `used_quantity` DECIMAL(12, 3) NULL,
    `supplier_waste_quantity` DECIMAL(12, 3) NULL,
    `production_waste_quantity` DECIMAL(12, 3) NULL,
    `remaining_quantity` DECIMAL(12, 3) NULL,
    `sample_quantity` DECIMAL(12, 3) NULL,
    `summarized_by_id` INTEGER NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_material_summaries_po_id_idx`(`production_order_id`),
    INDEX `po_material_summaries_material_code_idx`(`material_code`),
    INDEX `po_material_summaries_summarized_by_id_idx`(`summarized_by_id`),
    INDEX `po_material_summaries_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `production_order_material_summaries`
    ADD CONSTRAINT `po_material_summaries_po_id_fkey`
    FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `production_order_material_summaries`
    ADD CONSTRAINT `po_material_summaries_material_code_fkey`
    FOREIGN KEY (`material_code`) REFERENCES `items`(`item_code`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `production_order_material_summaries`
    ADD CONSTRAINT `po_material_summaries_summarized_by_id_fkey`
    FOREIGN KEY (`summarized_by_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `production_order_material_summaries`
    ADD CONSTRAINT `po_material_summaries_created_by_id_fkey`
    FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
