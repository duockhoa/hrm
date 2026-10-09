CREATE TABLE `warehouse_receipt_item_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_receipt_item_id` INTEGER NOT NULL,
    `attachment_type` VARCHAR(30) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_size` INTEGER NOT NULL,
    `uploaded_by_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `receipt_attachments_file_path_key` (`file_path`),
    INDEX `receipt_attachments_receipt_type_idx` (`warehouse_receipt_item_id`, `attachment_type`),
    INDEX `receipt_attachments_uploader_idx` (`uploaded_by_id`),
    CONSTRAINT `receipt_attachments_receipt_fkey` FOREIGN KEY (`warehouse_receipt_item_id`) REFERENCES `warehouse_receipt_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `receipt_attachments_uploader_fkey` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
