-- AlterTable
ALTER TABLE `production_order_ten_unit_sensory_checks`
    ADD COLUMN `dosage_form_stage` VARCHAR(50) NULL AFTER `requirement`;
