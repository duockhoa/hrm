ALTER TABLE `production_order_volume_checks`
    ADD COLUMN `dosage_form_stage` VARCHAR(50) NULL AFTER `requirement`;
