-- CreateTable
CREATE TABLE `production_order_post_secondary_packaging_summaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `semi_finished_product_order_id` INTEGER NOT NULL,
    `received_bag_count` INTEGER NOT NULL,
    `remaining_quantity` DECIMAL(12, 3) NOT NULL,
    `remaining_reason` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `po_post_secondary_summary_semi_finished_order_id_key`(`semi_finished_product_order_id`),
    INDEX `po_post_secondary_summary_production_order_id_idx`(`production_order_id`),
    INDEX `po_post_secondary_summary_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_order_post_secondary_pending_process_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `summary_id` INTEGER NOT NULL,
    `pending_quantity` DECIMAL(12, 3) NOT NULL,
    `pending_reason` TEXT NOT NULL,
    `processing_plan` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_post_secondary_pending_process_summary_id_idx`(`summary_id`),
    INDEX `po_post_secondary_pending_process_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_order_post_secondary_pending_cancellation_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `summary_id` INTEGER NOT NULL,
    `cancellation_quantity` DECIMAL(12, 3) NOT NULL,
    `cancellation_reason` TEXT NOT NULL,
    `cancellation_plan` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `po_post_secondary_pending_cancellation_summary_id_idx`(`summary_id`),
    INDEX `po_post_secondary_pending_cancellation_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_packaging_summaries` ADD CONSTRAINT `po_post_secondary_summary_production_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_packaging_summaries` ADD CONSTRAINT `po_post_secondary_summary_semi_finished_order_id_fkey` FOREIGN KEY (`semi_finished_product_order_id`) REFERENCES `production_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_packaging_summaries` ADD CONSTRAINT `po_post_secondary_summary_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_pending_process_items` ADD CONSTRAINT `po_post_secondary_pending_process_summary_id_fkey` FOREIGN KEY (`summary_id`) REFERENCES `production_order_post_secondary_packaging_summaries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_pending_process_items` ADD CONSTRAINT `po_post_secondary_pending_process_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_pending_cancellation_items` ADD CONSTRAINT `po_post_secondary_pending_cancellation_summary_id_fkey` FOREIGN KEY (`summary_id`) REFERENCES `production_order_post_secondary_packaging_summaries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_post_secondary_pending_cancellation_items` ADD CONSTRAINT `po_post_secondary_pending_cancellation_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
