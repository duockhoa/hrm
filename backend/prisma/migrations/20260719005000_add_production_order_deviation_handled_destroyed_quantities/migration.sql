ALTER TABLE `production_order_deviations`
    ADD COLUMN `handled_quantity` DECIMAL(12, 3) NULL AFTER `affected_quantity_unit`,
    ADD COLUMN `destroyed_quantity` DECIMAL(12, 3) NULL AFTER `handled_quantity`;
