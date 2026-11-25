ALTER TABLE `warehouse_receipt_items`
  ADD COLUMN `actual_quantity` DECIMAL(12, 3) NULL,
  ADD COLUMN `counting_method` VARCHAR(32) NULL;
