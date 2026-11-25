-- Rename the existing column in place to preserve all recorded quantities.
ALTER TABLE `warehouse_receipt_items`
  CHANGE COLUMN `quantity` `document_quantity` DECIMAL(12, 3) NULL;
