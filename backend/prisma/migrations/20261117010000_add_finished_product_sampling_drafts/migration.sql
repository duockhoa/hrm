ALTER TABLE `warehouse_receipt_item_sampling_request_drafts`
    DROP FOREIGN KEY `receipt_sampling_request_drafts_receipt_fkey`;

ALTER TABLE `warehouse_receipt_item_sampling_request_drafts`
    MODIFY `warehouse_receipt_item_id` INTEGER NULL,
    MODIFY `quantity` DECIMAL(18, 3) NULL,
    ADD COLUMN `production_order_id` INTEGER NULL,
    ADD COLUMN `request_type` VARCHAR(2) NOT NULL DEFAULT 'NL',
    ADD COLUMN `expiry_date_text` VARCHAR(191) NULL,
    ADD UNIQUE INDEX `sampling_drafts_production_order_key` (`production_order_id`),
    ADD CONSTRAINT `receipt_sampling_request_drafts_receipt_fkey` FOREIGN KEY (`warehouse_receipt_item_id`) REFERENCES `warehouse_receipt_items` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `sampling_drafts_production_order_fkey` FOREIGN KEY (`production_order_id`) REFERENCES `production_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
