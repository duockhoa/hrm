CREATE TABLE `warehouse_receipt_item_sap_confirmations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_receipt_item_id` INTEGER NOT NULL,
    `confirmed_by_id` INTEGER NULL,
    `confirmed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `receipt_sap_confirmation_receipt_key` (`warehouse_receipt_item_id`),
    INDEX `receipt_sap_confirmation_user_idx` (`confirmed_by_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `receipt_sap_confirmation_receipt_fkey` FOREIGN KEY (`warehouse_receipt_item_id`) REFERENCES `warehouse_receipt_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `receipt_sap_confirmation_user_fkey` FOREIGN KEY (`confirmed_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
