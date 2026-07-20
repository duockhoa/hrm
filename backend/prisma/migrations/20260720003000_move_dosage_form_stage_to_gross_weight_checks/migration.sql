-- AlterTable
ALTER TABLE `production_order_shell_weight_checks`
    DROP COLUMN `dosage_form_stage`;

ALTER TABLE `production_order_ten_shell_weight_checks`
    DROP COLUMN `dosage_form_stage`;

ALTER TABLE `production_order_semi_finished_product_gross_weight_checks`
    ADD COLUMN `dosage_form_stage` VARCHAR(50) NULL AFTER `requirement`;
