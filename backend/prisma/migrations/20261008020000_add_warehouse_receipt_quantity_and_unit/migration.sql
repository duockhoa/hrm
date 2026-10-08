ALTER TABLE `warehouse_receipt_items`
    ADD COLUMN `quantity` DECIMAL(12, 3) NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL;

-- Preserve the known unit for existing receipts; their quantity is unknown.
UPDATE `warehouse_receipt_items` AS receipt
INNER JOIN `items` AS item ON item.`item_code` = receipt.`item_code`
SET receipt.`unit` = NULLIF(TRIM(item.`unit`), '');
