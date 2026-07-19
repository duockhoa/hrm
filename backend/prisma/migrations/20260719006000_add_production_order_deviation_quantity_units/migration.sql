ALTER TABLE `production_order_deviations`
    ADD COLUMN `handled_quantity_unit` VARCHAR(50) NULL AFTER `handled_quantity`,
    ADD COLUMN `destroyed_quantity_unit` VARCHAR(50) NULL AFTER `destroyed_quantity`;
