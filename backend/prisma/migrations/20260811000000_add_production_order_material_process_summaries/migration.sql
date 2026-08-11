-- CreateTable
CREATE TABLE `production_order_material_process_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `process_stage` VARCHAR(100) NOT NULL,
    `yielded_quantity` DECIMAL(12, 3) NOT NULL,
    `yielded_unit` VARCHAR(20) NOT NULL DEFAULT 'kg',
    `moisture_percent` DECIMAL(5, 2) NULL,
    `image_path` TEXT NULL,
    `note` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_material_process_summaries_po_id_idx`(`production_order_id`),
    INDEX `po_material_process_summaries_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_material_process_summaries` ADD CONSTRAINT `po_material_process_summaries_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_material_process_summaries` ADD CONSTRAINT `po_material_process_summaries_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
