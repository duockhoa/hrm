-- Store editable sampling request data separately from the sent request.
-- Nullable content fields allow saving an incomplete draft.
CREATE TABLE `warehouse_receipt_item_sampling_request_drafts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `warehouse_receipt_item_id` INTEGER NOT NULL,
    `item_code` VARCHAR(191) NULL,
    `item_name` VARCHAR(255) NULL,
    `quantity` DECIMAL(12, 3) NULL,
    `unit` VARCHAR(191) NULL,
    `supplier_name` VARCHAR(255) NULL,
    `lot_number` VARCHAR(100) NULL,
    `expiry_date` DATE NULL,
    `location` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `receipt_sampling_request_drafts_receipt_key` (`warehouse_receipt_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `warehouse_receipt_item_sampling_request_drafts`
    ADD CONSTRAINT `receipt_sampling_request_drafts_receipt_fkey`
    FOREIGN KEY (`warehouse_receipt_item_id`) REFERENCES `warehouse_receipt_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;
