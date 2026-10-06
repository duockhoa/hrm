-- AlterTable
ALTER TABLE `warehouse_receipt_items` ADD COLUMN `supplier_code` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `warehouse_receipt_items_supplier_code_idx` ON `warehouse_receipt_items`(`supplier_code`);

-- AddForeignKey
ALTER TABLE `warehouse_receipt_items` ADD CONSTRAINT `warehouse_receipt_items_supplier_code_fkey` FOREIGN KEY (`supplier_code`) REFERENCES `business_partners`(`card_code`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link legacy names only when exactly one supplier matches. Preserve the original name.
UPDATE `warehouse_receipt_items` AS receipt
JOIN (
    SELECT TRIM(`card_name`) AS supplier_name, MIN(`card_code`) AS supplier_code
    FROM `business_partners`
    WHERE `card_type` = 'cSupplier' AND TRIM(`card_name`) <> ''
    GROUP BY TRIM(`card_name`)
    HAVING COUNT(*) = 1
) AS supplier ON TRIM(receipt.`supplier_name`) = supplier.supplier_name
SET receipt.`supplier_code` = supplier.supplier_code
WHERE receipt.`supplier_code` IS NULL;
