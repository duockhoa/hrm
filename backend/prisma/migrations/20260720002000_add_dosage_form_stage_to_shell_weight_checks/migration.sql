-- AlterTable
ALTER TABLE `production_order_shell_weight_checks`
    ADD COLUMN `dosage_form_stage` VARCHAR(50) NULL AFTER `production_order_id`;

ALTER TABLE `production_order_ten_shell_weight_checks`
    ADD COLUMN `dosage_form_stage` VARCHAR(50) NULL AFTER `production_order_id`;
