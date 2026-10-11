-- CreateTable
CREATE TABLE `warehouse_receipt_item_sampling_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_receipt_item_id` INTEGER NOT NULL,
    `sender_id` INTEGER NULL,
    `location` VARCHAR(191) NULL,
    `google_doc_url` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `receipt_sampling_requests_receipt_idx`(`warehouse_receipt_item_id`),
    INDEX `receipt_sampling_requests_sender_idx`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `warehouse_receipt_item_sampling_requests` ADD CONSTRAINT `receipt_sampling_requests_receipt_fkey` FOREIGN KEY (`warehouse_receipt_item_id`) REFERENCES `warehouse_receipt_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `warehouse_receipt_item_sampling_requests` ADD CONSTRAINT `receipt_sampling_requests_sender_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
