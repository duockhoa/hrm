-- CreateTable
CREATE TABLE `production_order_sampling_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `production_order_id` INTEGER NOT NULL,
    `sender_id` INTEGER NULL,
    `location` VARCHAR(191) NULL,
    `google_doc_url` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `production_order_sampling_requests_production_order_id_fkey`(`production_order_id`),
    INDEX `production_order_sampling_requests_sender_id_fkey`(`sender_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `production_order_sampling_requests` ADD CONSTRAINT `production_order_sampling_requests_production_order_id_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_order_sampling_requests` ADD CONSTRAINT `production_order_sampling_requests_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
