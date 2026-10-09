ALTER TABLE `warehouse_receipt_items` ADD COLUMN `manufacturer_code` VARCHAR(100) NULL;

CREATE INDEX `warehouse_receipt_items_manufacturer_code_idx` ON `warehouse_receipt_items`(`manufacturer_code`);

ALTER TABLE `warehouse_receipt_items` ADD CONSTRAINT `warehouse_receipt_items_manufacturer_code_fkey` FOREIGN KEY (`manufacturer_code`) REFERENCES `manufacturers`(`manufacturer_code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link legacy names only when exactly one manufacturer matches. Preserve the original name.
UPDATE `warehouse_receipt_items` AS receipt
JOIN (
    SELECT TRIM(`manufacturer_name`) AS manufacturer_name, MIN(`manufacturer_code`) AS manufacturer_code
    FROM `manufacturers`
    WHERE TRIM(`manufacturer_name`) <> ''
    GROUP BY TRIM(`manufacturer_name`)
    HAVING COUNT(*) = 1
) AS manufacturer ON TRIM(receipt.`manufacturer_name`) = manufacturer.manufacturer_name
SET receipt.`manufacturer_code` = manufacturer.manufacturer_code
WHERE receipt.`manufacturer_code` IS NULL;
