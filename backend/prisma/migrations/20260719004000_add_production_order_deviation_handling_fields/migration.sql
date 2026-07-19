ALTER TABLE `production_order_deviations`
    ADD COLUMN `handling_result` TEXT NULL AFTER `handling_plan`,
    ADD COLUMN `cause` TEXT NULL AFTER `handling_result`,
    ADD COLUMN `cause_classification` VARCHAR(191) NULL AFTER `cause`,
    ADD COLUMN `affected_quantity` DECIMAL(12, 3) NULL AFTER `cause_classification`,
    ADD COLUMN `affected_quantity_unit` VARCHAR(50) NULL AFTER `affected_quantity`;
