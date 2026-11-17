CREATE TABLE `warehouse_receipt_sampling_send_batches` (
    `id` CHAR(36) NOT NULL,
    `active_key` VARCHAR(64) NULL,
    `status` VARCHAR(32) NOT NULL,
    `sender_id` INTEGER NOT NULL,
    `payload` JSON NOT NULL,
    `draft_snapshot` JSON NOT NULL,
    `google_doc_url` TEXT NULL,
    `sent_at` DATETIME(3) NULL,
    `last_error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `receipt_sampling_send_batches_active_key` (`active_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
