-- CreateTable
CREATE TABLE `production_order_semi_finished_product_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `stage` VARCHAR(100) NULL,
    `input_quantity` DECIMAL(12, 3) NULL,
    `input_unit` VARCHAR(20) NULL,
    `packed_quantity` DECIMAL(12, 3) NULL,
    `packed_unit` VARCHAR(20) NULL,
    `leftover_quantity` DECIMAL(12, 3) NULL,
    `leftover_unit` VARCHAR(20) NULL,
    `waste_quantity` DECIMAL(12, 3) NULL,
    `waste_unit` VARCHAR(20) NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_semi_finished_summary_po_idx`(`production_order_id`),
    INDEX `po_semi_finished_summary_user_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_semi_finished_product_summaries` ADD CONSTRAINT `po_semi_finished_summary_po_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_semi_finished_product_summaries` ADD CONSTRAINT `po_semi_finished_summary_user_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
