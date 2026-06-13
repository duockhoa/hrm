-- CreateTable
CREATE TABLE `production_order_finished_product_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `package_count` INTEGER NOT NULL,
    `boxes_per_package` INTEGER NOT NULL,
    `loose_box_count` INTEGER NOT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_finished_summary_po_id_key`(`production_order_id`),
    INDEX `po_finished_summary_created_by_id_fkey`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_finished_product_summaries` ADD CONSTRAINT `po_finished_summary_po_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_finished_product_summaries` ADD CONSTRAINT `po_finished_summary_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
